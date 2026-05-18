import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  const requestId = crypto.randomUUID();

  console.log(`REQUEST START [${requestId}]`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    console.log(`[${requestId}] RAW BODY:`, rawBody);

    let body;

    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.log(`[${requestId}] JSON PARSE ERROR`, e);

      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          requestId,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      transaction_id,

      gross_amount,
      payment_type,

      bank,
      store,

      customer_details,
      item_details,

      callback_url,
    } = body;

    //
    // VALIDATION
    //

    if (!transaction_id) {
      return new Response(
        JSON.stringify({
          error: "transaction_id is required",
          requestId,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!gross_amount || !payment_type) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          requestId,
          required: ["gross_amount", "payment_type"],
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    //
    // GENERATE ORDER ID
    //

    const order_id = `GP-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

    //
    // ENV
    //

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serverKey) {
      return new Response(
        JSON.stringify({
          error: "Missing MIDTRANS_SERVER_KEY",
          requestId,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    //
    // SUPABASE CLIENT
    //

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    //
    // MIDTRANS AUTH
    //

    const authString = btoa(`${serverKey}:`);

    const phone =
      customer_details?.phone ||
      customer_details?.mobile_phone ||
      "";

    const finalCallbackUrl =
      callback_url || "myapp://payment-finish";

    //
    // BASE PAYLOAD
    //

    const payload: any = {
      payment_type,

      transaction_details: {
        order_id,
        gross_amount: Number(gross_amount),
      },

      customer_details: {
        ...customer_details,
        mobile_phone: phone,
      },

      item_details:
        item_details ||
        [
          {
            id: "default-item",
            price: Number(gross_amount),
            quantity: 1,
            name: "Payment",
          },
        ],

      custom_expiry: {
        expiry_duration: 15,
        unit: "minute",
      },
    };

    //
    // PAYMENT TYPES
    //

    if (payment_type === "bank_transfer") {
      if (!bank) {
        return new Response(
          JSON.stringify({
            error: "bank is required for bank_transfer",
            requestId,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      payload.bank_transfer = {
        bank,
      };
    }

    else if (payment_type === "gopay") {
      payload.gopay = {
        enable_callback: true,
        callback_url: finalCallbackUrl,
      };
    }

    else if (payment_type === "shopeepay") {
      payload.shopeepay = {
        callback_url: finalCallbackUrl,
      };
    }

    else if (payment_type === "ovo") {
      if (!phone) {
        return new Response(
          JSON.stringify({
            error: "Phone number required for OVO",
            requestId,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      payload.ovo = {
        mobile_number: phone,
      };
    }

    else if (payment_type === "dana") {
      payload.dana = {
        callback_url: finalCallbackUrl,
      };
    }

    else if (payment_type === "linkaja") {
      payload.linkaja = {
        callback_url: finalCallbackUrl,
      };
    }

    else if (payment_type === "cstore") {
      if (!store) {
        return new Response(
          JSON.stringify({
            error: "store is required for cstore",
            requestId,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      payload.cstore = {
        store,
        message: "Payment",
      };
    }

    else if (payment_type === "qris") {
      payload.qris = {
        acquirer: "gopay",
      };
    }

    else {
      return new Response(
        JSON.stringify({
          error: "Unsupported payment type",
          requestId,
          payment_type,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    //
    // CALL MIDTRANS
    //

    console.log(
      `[${requestId}] GENERATED ORDER ID:`,
      order_id
    );

    console.log(
      `[${requestId}] FINAL MIDTRANS PAYLOAD:`,
      JSON.stringify(payload, null, 2)
    );

    const midtransRes = await fetch(
      "https://api.sandbox.midtrans.com/v2/charge",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const midtransText = await midtransRes.text();

    let midtransData;

    try {
      midtransData = JSON.parse(midtransText);
    } catch {
      midtransData = {
        raw: midtransText,
      };
    }

    console.log(
      `[${requestId}] MIDTRANS STATUS:`,
      midtransRes.status
    );

    console.log(
      `[${requestId}] MIDTRANS RESPONSE:`,
      JSON.stringify(midtransData, null, 2)
    );

    //
    // EXTRACT IMPORTANT PAYMENT DATA
    //

    const redirect_url =
      midtransData?.redirect_url ||
      midtransData?.actions?.find(
        (a: any) => a.name === "deeplink-redirect"
      )?.url ||
      null;

    const qr_string =
      midtransData?.qr_string || null;

    const payment_code =
      midtransData?.payment_code || null;

    const va_number =
      midtransData?.va_numbers?.[0]?.va_number || null;

    const va_bank =
      midtransData?.va_numbers?.[0]?.bank || null;

    //
    // UPDATE EXISTING TRANSACTION
    //

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        order_id,

        payment_status:
          midtransData?.transaction_status || "pending",

        midtrans_transaction_id:
          midtransData?.transaction_id || null,

        fraud_status:
          midtransData?.fraud_status || null,

        transaction_time:
          midtransData?.transaction_time || null,

        expiry_time:
          midtransData?.expiry_time || null,

        redirect_url,

        qr_string,

        payment_code,

        va_number,

        va_bank,

        raw_midtrans_response: midtransData,
      })
      .eq("id", transaction_id);

    //
    // UPDATE FAILED
    //

    if (updateError) {
      console.log(
        `[${requestId}] SUPABASE UPDATE ERROR:`,
        updateError
      );

      return new Response(
        JSON.stringify({
          error: "Failed to update transaction",
          requestId,
          details: updateError,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    //
    // UPDATE SUCCESS
    //

    console.log(
      `[${requestId}] TRANSACTION UPDATED SUCCESSFULLY`,
      {
        transaction_id,
        order_id,
        payment_type,
      }
    );

    //
    // SUCCESS RESPONSE
    //

    return new Response(
      JSON.stringify({
        requestId,
        success: midtransRes.ok,
        status: midtransRes.status,

        transaction_id,

        order_id,

        payment_type,

        payment_status:
          midtransData?.transaction_status || "pending",

        sent_payload: payload,

        midtrans: midtransData,

        actions:
          midtransData?.actions || [],

        redirect_url,

        qr_string,

        payment_code,

        va_numbers:
          midtransData?.va_numbers || [],

        expiry_time:
          midtransData?.expiry_time || null,
      }),
      {
        status: midtransRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.log(
      `[${requestId}] FUNCTION ERROR:`,
      error
    );

    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error",
        requestId,
        stack: error?.stack || null,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } finally {
    console.log(`REQUEST END [${requestId}]`);
  }
});
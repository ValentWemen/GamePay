// ============================================================
// GamePay - Utility Helpers
// Currency, Virtual Account, QRIS, Group Promo
// ============================================================

/**
 * Format angka ke Rupiah: 100000 -> "Rp 100.000"
 */
export function formatRupiah(amount: number): string {
  if (amount == null || isNaN(amount)) return "Rp 0";
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

export function formatNumber(amount: number): string {
  if (amount == null || isNaN(amount)) return "0";
  return Math.round(amount).toLocaleString("id-ID");
}

// ============================================================
// VIRTUAL ACCOUNT GENERATOR
// ============================================================

// Prefix tiap bank (representatif, mirip pola real Indonesia)
const VA_PREFIX: Record<string, string> = {
  BCA: "39661",
  Mandiri: "89508",
  BRI: "26215",
  BNI: "98810",
  Permata: "85432",
  CIMB: "70012",
};

/**
 * Generate nomor Virtual Account
 * Format: [Bank Prefix 5 digit][User ID 6 digit][Random 5 digit]
 */
export function generateVA(bank: string, userIdHint?: string): string {
  const prefix = VA_PREFIX[bank] || "00000";
  const userPart = (userIdHint || Math.random().toString())
    .replace(/\D/g, "")
    .padStart(6, "0")
    .slice(-6);
  const random = Math.floor(10000 + Math.random() * 89999).toString();
  return `${prefix}${userPart}${random}`;
}

/**
 * Format VA: tiap 4 digit dipisah spasi
 * "3966112345678901" -> "3966 1123 4567 8901"
 */
export function formatVA(va: string): string {
  if (!va) return "";
  return va.replace(/(.{4})/g, "$1 ").trim();
}

// ============================================================
// QRIS PAYLOAD
// ============================================================

export function generateQRISPayload(opts: {
  merchantName?: string;
  amount: number;
  orderId: string;
}): string {
  const { merchantName = "GAMEPAY STORE", amount, orderId } = opts;
  // Simplified EMV-like QRIS payload (untuk demo)
  return [
    "00020101021226",
    `0014ID.CO.QRIS.WWW`,
    `0215ID${Math.floor(Math.random() * 1000000000)}`,
    `52044829`,
    `5303360`,
    `54${String(amount).length.toString().padStart(2, "0")}${amount}`,
    `5802ID`,
    `59${merchantName.length.toString().padStart(2, "0")}${merchantName}`,
    `6007JAKARTA`,
    `62${orderId.length.toString().padStart(2, "0")}${orderId}`,
    `6304ABCD`,
  ].join("");
}

/**
 * Order ID: "GP-YYYYMMDD-XXXXX"
 */
export function generateOrderId(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const random = Math.floor(10000 + Math.random() * 89999);
  return `GP-${date}-${random}`;
}

// ============================================================
// GROUP ORDER PROMO
// ============================================================

/**
 * Diskon berdasarkan jumlah peserta:
 *   1 orang: 0% (solo)
 *   2 orang: 5%
 *   3 orang: 8%
 *   4 orang: 12%
 *   5+ orang: 15%
 */
export function getGroupDiscountPercent(members: number): number {
  if (members <= 1) return 0;
  if (members === 2) return 5;
  if (members === 3) return 8;
  if (members === 4) return 12;
  return 15;
}

/**
 * Cashback 2% ke wallet GamePay (hanya untuk group order)
 */
export function getGroupCashback(subtotal: number, members: number): number {
  if (members <= 1) return 0;
  return Math.round(subtotal * 0.02);
}

/**
 * Bonus GamePay Points: 1% dari subtotal (1 pt = Rp 100)
 */
export function getGroupBonusPoints(subtotal: number, members: number): number {
  if (members <= 1) return 0;
  return Math.floor((subtotal * 0.01) / 100);
}

/**
 * PPN 11% sesuai aturan Indonesia
 */
export function calculateTax(amount: number, rate: number = 0.11): number {
  return Math.round(amount * rate);
}

export const SERVICE_FEE = 1000; // Rp 1.000 flat

// ============================================================
// PRICE BREAKDOWN
// ============================================================

export interface PriceBreakdown {
  subtotal: number;
  groupDiscount: number;
  groupDiscountPercent: number;
  serviceFee: number;
  tax: number;
  total: number;
  pricePerPerson: number;
  cashback: number;
  bonusPoints: number;
  members: number;
  isGroupOrder: boolean;
}

export function calculatePriceBreakdown(
  basePrice: number,
  members: number = 1,
): PriceBreakdown {
  const isGroup = members > 1;
  const discountPct = getGroupDiscountPercent(members);
  const discount = Math.round((basePrice * discountPct) / 100);
  const afterDiscount = basePrice - discount;
  const serviceFee = SERVICE_FEE;
  const tax = calculateTax(afterDiscount);
  const total = afterDiscount + serviceFee + tax;
  const perPerson = Math.ceil(total / members);
  const cashback = getGroupCashback(basePrice, members);
  const bonusPoints = getGroupBonusPoints(basePrice, members);

  return {
    subtotal: basePrice,
    groupDiscount: discount,
    groupDiscountPercent: discountPct,
    serviceFee,
    tax,
    total,
    pricePerPerson: perPerson,
    cashback,
    bonusPoints,
    members,
    isGroupOrder: isGroup,
  };
}

// ============================================================
// GROUP CODE GENERATOR
// ============================================================

export function generateGroupCode(): string {
  // Format: GP-XXXXXX (exclude similar chars O,0,1,I,L)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GP-${code}`;
}

// ============================================================
// FORMATTERS
// ============================================================

/**
 * Format menit jadi "Xh Ym" atau "Xm"
 */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Format tanggal Indonesia: "14 Mei 2026"
 */
export function formatDateID(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ============================================================
// CONSTANTS
// ============================================================

export const USD_TO_IDR = 16000;
export function usdToIdr(usd: number): number {
  return Math.round(usd * USD_TO_IDR);
}

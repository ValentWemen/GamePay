# 🎮 GamePay

Aplikasi mobile top-up game dengan fitur **Split Payment** (Group Order) yang memberi diskon hingga 15%, cashback, dan bonus points untuk pengguna yang top-up bareng-bareng.

Dibangun dengan **React Native + Expo**, backend **Supabase**, untuk submission **UAS Mobile Cross-Platform Application — Universitas Multimedia Nusantara, 2025/2026**.

---

## 👥 Anggota Kelompok

| Nama | NIM |
|---|---|
| Ignatius Steven | 00000070642 |
| Valent Joseph Setiawan | 00000075506 |
| Farrel Shane Irwanto | 00000075399 |
| Leonardo Jonathan Fernandez Namlay | 00000058084 |
| Jonathan Christian Gunawan | 00000087503 |

---

## ✨ Fitur Utama

### 💳 Top-Up Game
- 4 game populer: Mobile Legends, Free Fire, PUBG Mobile, Genshin Impact
- Paket diamond/UC/Genesis Crystals dengan harga **Rupiah realistic** Indonesia
- Server selection (Asia, Europe, Americas, SEA)
- Input UID game

### 👥 Group Order (Split Payment) - Fitur Unggulan
- **Diskon bertingkat** berdasarkan jumlah peserta:
  - 2 orang: **-5%**
  - 3 orang: **-8%**
  - 4 orang: **-12%**
  - 5 orang: **-15%** 🏆
- **Cashback 2%** ke wallet GamePay
- **Bonus GamePay Points** untuk setiap transaksi group
- **Shareable invite code** (`GP-XXXXXX`) via WhatsApp, Telegram, dll
- **Deep link URL** (`gamepay://join/GP-XXXXXX` atau `https://gamepay.app/join/GP-XXXXXX`) — teman klik link, app langsung buka di halaman group ✨
- Real-time member tracking dengan progress bar
- Timer 24 jam per group order

### 💰 Pembayaran Lengkap (Real Indonesia)
- **QRIS** — scan QR untuk bayar via semua bank & e-wallet
- **Virtual Account** — 6 bank: BCA, Mandiri, BRI, BNI, Permata, CIMB
  - Auto-generate nomor VA unik per transaksi
  - Step-by-step instruksi pembayaran tiap bank
- **E-Wallet** — GoPay, OVO, DANA, ShopeePay, LinkAja (dengan deeplink ke app)
- **Retail** — Indomaret & Alfamart
- **Rincian harga transparan**: subtotal, diskon group, biaya layanan, PPN 11%, biaya channel

### 📰 Tambahan
- 🔍 Search real-time game
- 📰 News API (gaming & fintech news)
- 🎨 Auto-slide promo banner
- 📜 History transaksi dengan filter status
- 👤 Auth: Login, Register, Forgot Password (Supabase Auth)
- 📤 Share API untuk invite group & share bukti pembayaran
- 📋 Clipboard untuk copy nomor VA, group code, dll
- 🖼️ Image picker untuk avatar profil

---

## 🚀 Setup & Run

### Prerequisites
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)
- **Expo Go** app di HP — Play Store / App Store
- VS Code (recommended)

### Langkah Install

```bash
# 1. Clone repo
git clone https://github.com/USERNAME/GamePay.git
cd GamePay

# 2. Install semua dependencies (sekaligus)
npm install

# 3. (Opsional) clear cache kalau ada issue
npx expo start --clear
```

### Setup Supabase

1. Daftar gratis di [supabase.com](https://supabase.com) dan buat project baru
2. Copy **URL** dan **anon key** dari `Settings > API`
3. Buka file `user/Supabase.ts` dan paste:

```ts
const supabaseUrl = 'https://YOUR-PROJECT.supabase.co';
const supabaseAnonKey = 'YOUR-ANON-KEY';
```

4. **Setup database** — buka Supabase Dashboard > SQL Editor, copy-paste isi file `supabase/schema.sql`, lalu klik Run.

Schema akan otomatis bikin table:
- `profiles` (auto-extend `auth.users`)
- `transactions` (riwayat top-up)
- `groups` (group order)
- `group_members` (peserta group)
- Plus RLS policies dan storage bucket untuk avatar

### Jalankan App

```bash
npx expo start
```

Akan muncul QR code di terminal. **Scan dengan Expo Go** di HP (pastikan HP & laptop di WiFi yang sama).

**Atau** untuk emulator:
```bash
npm run android   # Android emulator
npm run ios       # iOS simulator (Mac only)
```

---

## 🗂️ Struktur Project

```
GamePay/
├── App.js                          # Root navigator
├── app.json                        # Expo config + permissions
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── assets/                         # Icons, splash, QR placeholder
├── main/                           # Screen utama
│   ├── Home.tsx                    # Landing page + banner
│   ├── GameDetail.tsx              # Pilih paket + group toggle
│   ├── Payment.tsx                 # Pilih metode + VA generation
│   ├── Processing.tsx              # QR display + VA instructions + timer
│   ├── PaymentSuccess.tsx          # Receipt + share
│   ├── Group.tsx                   # List active groups + join via code
│   ├── GroupDetail.tsx             # Create/join group + member tracking
│   ├── History.tsx                 # Riwayat transaksi
│   ├── News.tsx                    # News API integration
│   ├── Account.tsx                 # Account menu
│   ├── Profile.tsx                 # Edit profile
│   └── BottomNav.tsx               # Bottom navigation
├── user/                           # Auth screens
│   ├── Supabase.ts                 # Supabase config
│   ├── Login.tsx, Register.tsx, ForgotPass.tsx, Splash.tsx
│   ├── CustomerService.tsx, HelpCenter.tsx, Terms.tsx
│   └── ChangePassword.tsx, SecuritySettings.tsx
├── utils/
│   └── helpers.ts                  # formatRupiah, generateVA, promo calc
└── supabase/
    └── schema.sql                  # Database setup script
```

---

## 💡 Highlight Implementasi

### 1. Sistem Promo Group Order

File: `utils/helpers.ts`

```ts
calculatePriceBreakdown(basePrice, members) → {
  subtotal,           // harga paket
  groupDiscount,      // diskon 5-15%
  groupDiscountPercent,
  serviceFee,         // Rp 1.000
  tax,                // PPN 11%
  total,              // total setelah semua
  pricePerPerson,     // total / members
  cashback,           // 2% dari subtotal
  bonusPoints,        // 1% dalam GamePay Points
}
```

### 2. Virtual Account Generator

Format VA: `[Bank Prefix 5 digit][User ID 6 digit][Random 5 digit]`

```ts
generateVA("BCA", userIdHint) → "39661 1234 5678 9012"
```

Prefix bank sesuai realita Indonesia:
- BCA: 39661, Mandiri: 89508, BRI: 26215, BNI: 98810, Permata: 85432, CIMB: 70012

### 3. Group Order Flow

```
GameDetail (toggle "Patungan")
  → CreateGroup (pilih 2-5 orang, lihat breakdown)
    → Supabase: insert ke `groups` + `group_members`
      → GroupDetail (host view: kode, share, member list)
        → Share invite ke teman
          → Teman join via kode di Group screen
            → Payment screen (bagian masing-masing)
              → Processing (QR/VA per orang)
                → PaymentSuccess
```

---

## 📦 Tech Stack

| Layer | Tools |
|---|---|
| **Framework** | React Native 0.79.6 + Expo SDK 53 |
| **Language** | TypeScript |
| **Backend** | Supabase (Postgres + Auth + Storage + RLS) |
| **Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) |
| **UI** | React Native Paper + custom components |
| **Icons** | Lucide React Native + Emoji |
| **HTTP** | Axios (untuk News API) |
| **Storage** | Async Storage + Expo File System |
| **Clipboard** | expo-clipboard |
| **Image** | expo-image-picker |
| **News** | NewsAPI.org |

---

## 🐛 Troubleshooting

### "Metro bundler" error / stuck
```bash
npx expo start --clear
```

### "Cannot find module" setelah install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase error "relation does not exist"
Jalankan dulu `supabase/schema.sql` di SQL Editor Supabase.

### Expo Go disconnect terus
Pastikan HP & laptop di WiFi yang sama. Coba switch ke **Tunnel mode**:
```bash
npx expo start --tunnel
```

### App crash di iOS karena permission
Pastikan `app.json` punya `NSCameraUsageDescription` & `NSPhotoLibraryUsageDescription` di `ios.infoPlist`.

### Deep link tidak buka aplikasi
- Di **Expo Go**: deep link terbatas, gunakan flow manual (Group → Pakai Kode)
- Di **build app sendiri** (`eas build`): deep link `gamepay://join/GP-XXXXXX` akan bekerja
- Untuk test deep link di Expo Go: pakai command `npx uri-scheme open exp+gamepay://join/GP-ABC123 --android`

---

## 🎯 Demo Flow untuk Presentasi

### Skenario 1: Host buat group order
1. Login → Home → tap game "Free Fire" → Pilih paket 257 Diamonds (Rp 65.000)
2. Aktifkan toggle **"Patungan dengan Teman"** → Buat Group Order
3. Pilih 3 orang → Buat Group → akan generate kode `GP-XXXXXX`
4. Tap **"Share ke Teman"** → muncul share sheet → kirim ke WhatsApp

### Skenario 2: Teman join via kode
1. Buka tab **Group** → tap **"Pakai Kode"**
2. Input kode dari host → Join Group
3. Lihat detail group → tap "Join & Bayar Rp xxx.xxx"
4. Pilih metode (QRIS/VA/E-wallet) → Bayar
5. Lihat QR / nomor VA → tap "Saya Sudah Bayar (Demo)"
6. ✓ Transaksi tersimpan di Riwayat

### Skenario 3: Single top-up
1. Home → pilih game → pilih paket → **JANGAN** aktifkan group toggle
2. Pilih metode pembayaran (e.g. BCA VA)
3. Lihat nomor VA + step-by-step → tap copy nomor VA
4. Tap "Saya Sudah Bayar" → success

### Tips Presentasi
- **Buka di 2 device sekaligus**: host di laptop (Expo web) atau HP A, teman di HP B
- **Demo Share**: tap tombol Share saat di GroupDetail, akan muncul share sheet asli OS
- **Demo Clipboard**: tap copy di nomor VA, paste di Notes app untuk buktikan
- **Demo Camera**: ke Profile, tap avatar, pilih "Ambil Foto"
- **Demo News API**: dari Account → "Berita Gaming", scroll untuk lihat live data dari NewsAPI

---

## 📄 Catatan Akademik

Project ini dibuat untuk **UAS Mobile Cross-Platform Application** di Universitas Multimedia Nusantara, semester 2025/2026.

**Fitur dari requirements:**
- ✅ News API + HTTP Request (axios)
- ✅ Text Input & Form Auth (Login/Register)
- ✅ Filesystem: History transaksi (Supabase)
- ✅ Login / Register (Supabase Auth)
- ✅ Keyword Search Real-Time (search games)
- ✅ Image Carousel / Auto-Slide Banner
- ✅ React Native Paper Styling (di News)
- ✅ Akses Kamera & Galeri (expo-image-picker)

**Inovasi tambahan:**
- 🚀 Sistem Split Payment / Group Order yang lengkap
- 💳 Real Virtual Account generation untuk 6 bank Indonesia
- 📲 QRIS payload generator
- 💰 Rincian harga dengan PPN 11% + biaya layanan
- 📤 Share API untuk invite group + receipt
- 📋 Clipboard untuk copy VA & group code

---

**Built with ❤️ by Kelompok GamePay — UMN 2025/2026**

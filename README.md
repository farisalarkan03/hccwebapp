# Happy Couple Class (happycoupleclass.com)

Website resmi dan sistem manajemen pendaftaran Happy Couple Class (HCC) — kelas persiapan dan penguatan pernikahan berbasis Islam.

---

## 🛠️ Tech Stack

- **Framework**: [Astro 5](https://astro.build) + React Islands (`@astrojs/react`), TypeScript
- **Styling**: Tailwind CSS + CSS Variables design tokens (`src/styles/tokens.css`)
- **Hosting & Edge**: Cloudflare Pages (`@astrojs/cloudflare`)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL + RLS + GoTrue Auth)
- **Security & Anti-bot**: Cloudflare Turnstile
- **Typography & Icons**: Poppins & Material Symbols Outlined

---

## 📋 Fitur Utama

1. **Halaman Publik**:
   - Landing page modern, elegan (85% putih, aksen pink soft), cepat, dan mobile-friendly.
   - Halaman detail event (`/event/[slug]`) dengan metadata SEO schema.org `Event`.
   - Formulir pendaftaran dinamis (`/daftar/[slug]`) dengan validasi Zod dan Cloudflare Turnstile.
   - Halaman sukses pendaftaran dengan instruksi transfer bank, batas waktu, dan tautan otomatis konfirmasi WhatsApp.
   - Tiket digital peserta (`/tiket/[token]`) dilengkapi QR code, unduh tiket PNG & PDF, serta ekspor file kalender `.ics`.
   - Halaman kustom & pengumuman (`/p/[slug]`) dan Kebijakan Privasi (`/privasi`).

2. **Panel Admin (`/admin`)**:
   - Login admin terproteksi Supabase Auth + Turnstile + verifikasi tabel `admins` aktif.
   - Ringkasan dashboard: total event aktif, peserta lunas, omset, dan ringkasan pendaftaran terbaru.
   - Manajemen Event: buat event baru, duplikasi event, arsipkan event, ubah kuota, rekening, dan admin konfirmator.
   - **Form Builder**: kustomisasi formulir per-event (drag & drop reorder, 10 tipe isian, preview langsung, auto-save).
   - Manajemen Peserta: pencarian, filter status, konfirmasi pembayaran manual, salin link tiket, dan direct WhatsApp.
   - Rekap Kehadiran (`/admin/events/[id]/kehadiran`): pantauan scan real-time, audit kehadiran, dan persentase kehadiran.
   - Editor Halaman (`/admin/halaman`): buat dan terbitkan postingan artikel/flyer berbasis blok visual.
   - Manajemen Kategori (`/admin/kategori`) & Pengaturan Rekening serta Admin (`/admin/pengaturan`).
   - Log Audit Sistem (`/admin/log`): pencatatan seluruh tindakan administratif.

3. **Aplikasi Petugas Scanner (`/qrclass`)**:
   - Web App / PWA layar penuh yang dioptimalkan untuk smartphone staf di pintu masuk.
   - Login dengan ID Event + Password staf event yang dibuat oleh admin.
   - Scanner kamera otomatis berkecepatan tinggi dengan lampu kilat (torch) dan input token manual.
   - Notifikasi layar penuh (ResultOverlay) dengan suara bip audio synthesizer dan getaran haptic.

---

## 🚀 Panduan Setup & Konfigurasi Lengkap

### 1. Prasyarat Lingkungan
- **Node.js**: Versi `>= 22.23.4` (Astro 5 membutuhkan Node 22.23.4+).
  ```bash
  nvm install 22.23.4
  nvm use 22.23.4
  ```

### 2. Setup Database Supabase
1. Buat project baru di [Supabase Dashboard](https://supabase.com).
2. Buka menu **SQL Editor**, lalu salin seluruh isi file `supabase/migrations/001_init.sql`.
3. Klik **Run** untuk membuat seluruh tabel, view, fungsi RPC (`register_couple`, `confirm_payment`, `checkin_ticket`, dll.), trigger, dan kebijakan keamanan RLS.
4. Buat Akun Admin Pertama:
   - Masuk ke menu **Authentication > Users** di Supabase, buat user baru dengan email & password Anda.
   - Salin UUID user yang baru dibuat.
   - Di SQL Editor, masukkan data user tersebut ke tabel `admins`:
     ```sql
     insert into public.admins (id, name, email, whatsapp, role, is_active)
     values ('UUID_USER_SUPABASE_ANDA', 'Super Admin HCC', 'email@domain.com', '6281234567890', 'super_admin', true);
     ```

### 3. Setup Cloudflare Turnstile
1. Buka dashboard Cloudflare, pilih menu **Turnstile**.
2. Klik **Add Widget**:
   - Site name: `Happy Couple Class`
   - Domain: tambahkan `localhost` dan `happycoupleclass.com`
   - Widget Mode: Managed (rekomendasi) atau Non-interactive
3. Salin **Site Key** dan **Secret Key**.

### 4. Setup Environment Variables Lokal
Salin file template `.env.example`:
```bash
cp .env.example .env
```
Isi nilainya:
```env
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA...
TURNSTILE_SECRET=0x4AAAAAA...
QR_JWT_SECRET=rahasia-string-acak-32-karakter-atau-lebih
PUBLIC_SITE_URL=http://localhost:4321
```

### 5. Menjalankan Server Lokal
```bash
# Menjalankan dev server di background sesuai aturan:
astro dev --background

# Atau menjalankan langsung di foreground terminal:
npm run dev
```
Buka browser di `http://localhost:4321`.

---

## 🚀 Deploy ke Cloudflare Workers

Proyek ini menggunakan **Astro 7** dengan adapter `@astrojs/cloudflare` v14, yang menarget **Cloudflare Workers** (bukan Pages Functions).

### Build Command

```bash
npm run build
```

Output tersimpan di `dist/`. Wrangler otomatis membaca `dist/server/wrangler.json` yang di-generate oleh adapter.

### Deploy Command

```bash
# Deploy ke production
npx wrangler deploy

# Validasi bundle tanpa upload (dry-run)
npx wrangler deploy --dry-run
```

### Secrets & Environment Variables

#### Variabel Build-time (diinject saat build oleh Vite / Astro)

Variabel `PUBLIC_*` dibaca dari `.env` lokal saat `npm run build`, lalu diinline ke bundle. Variabel ini **tidak sensitif** dan aman tampil di kode klien.

| Variable | Contoh |
|---|---|
| `PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAAA...` |
| `PUBLIC_SITE_URL` | `https://happycoupleclass.com` |

#### Secrets Runtime (dibaca oleh Worker saat request, via `cloudflare:workers`)

Variabel sensitif **tidak boleh** ada di `wrangler.jsonc`. Upload menggunakan Wrangler CLI:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put QR_JWT_SECRET
```

Di Worker, variabel dibaca via `import { env } from 'cloudflare:workers'` (dikelola oleh `src/lib/server-env.ts` secara otomatis dengan fallback untuk build lokal).

#### Dev Lokal (`.dev.vars`)

Untuk development lokal dengan `wrangler dev`, buat file `.dev.vars` di root:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
TURNSTILE_SECRET=0x4AAAAA...
QR_JWT_SECRET=rahasia-32-karakter-atau-lebih
```

> [!WARNING]
> Jangan commit `.dev.vars` ke Git. File ini sudah termasuk dalam `.gitignore`.

---

## 🌐 Custom Domain (`happycoupleclass.com`)

Setelah deploy pertama:

1. Masuk ke **Cloudflare Dashboard** > **Workers & Pages** > pilih Worker `hccwebapp`.
2. Buka tab **Triggers** > **Custom Domains** > klik **Add Custom Domain**.
3. Masukkan `happycoupleclass.com` dan/atau `www.happycoupleclass.com`.
4. Cloudflare akan menerbitkan sertifikat SSL gratis secara otomatis.

---

## 🔒 Keamanan & Perlindungan Data

- **Row Level Security (RLS)**: Tabel `registrations`, `event_staff`, `payment_accounts`, dan `audit_logs` tertutup bagi public anon. Anon hanya diizinkan membaca data event dan kategori aktif.
- **Security Headers (`public/_headers`)**: Dilengkapi CSP ketat, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `Referrer-Policy: strict-origin-when-cross-origin`.
- **Cloudflare Turnstile**: Mencegah bot spam pada formulir pendaftaran, login admin, dan login scanner.
- **Tiket Digital**: Token tiket dibuat dengan string acak kriptografis 12 byte dan hanya bisa di-checkin sekali oleh staf event yang valid.

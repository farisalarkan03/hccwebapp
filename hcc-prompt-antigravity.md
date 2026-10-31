# PROMPT: Bangun Website Happy Couple Class (happycoupleclass.com)

Kamu adalah senior full-stack engineer sekaligus UI designer. Bangun website lengkap **Happy Couple Class (HCC)**, kelas pernikahan berbasis Islam, dengan stack dan aturan di bawah. Kerjakan **bertahap sesuai urutan fase** di bagian 12. Setelah tiap fase selesai, jalankan build, perbaiki error, lalu lanjut. Jangan lompat fase dan jangan menambah fitur di luar dokumen ini tanpa alasan kuat.

Bahasa seluruh antarmuka: **Bahasa Indonesia**. Komentar kode boleh Inggris.

---

## 1. Ringkasan produk

- `happycoupleclass.com` — landing page publik, daftar event, halaman event, form pendaftaran, tiket digital.
- `happycoupleclass.com/admin` — dashboard admin: kelola event, form builder, data peserta, konfirmasi pembayaran, editor halaman.
- `happycoupleclass.com/qrclass` — aplikasi pendataan kehadiran hari-H (scan QR) untuk tim pendata.

Event bersifat **berbayar**. **1 pendaftaran = 1 couple** (suami + istri), 1 QR per couple. Pembayaran manual via transfer rekening, konfirmasi lewat WhatsApp ke admin. Rekening dan nomor admin **bisa berubah**, jadi jangan di-hardcode.

---

## 2. Tech stack (wajib)

| Bagian | Teknologi |
|---|---|
| Framework | **Astro** + **React islands** (`@astrojs/react`), TypeScript |
| Styling | **Tailwind CSS** + CSS variables untuk design token |
| Hosting | **Cloudflare Pages** (adapter `@astrojs/cloudflare`, mode hybrid/server untuk route dinamis) |
| API | **Cloudflare Pages Functions** di folder `/functions/api` |
| Database/Auth/Storage | **Supabase** (`@supabase/supabase-js`) |
| Repo | **GitHub**, deploy otomatis ke Cloudflare Pages |
| Captcha | **Cloudflare Turnstile** |
| QR generate | `qrcode` (npm) |
| QR scan | `html5-qrcode` atau `@yudiel/react-qr-scanner` |
| Tiket PNG/PDF | `html-to-image` (PNG) dan `jspdf` (PDF) |
| Editor halaman | Editor blok buatan sendiri (React), **tanpa** library WYSIWYG berat |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Validasi | `zod` (dipakai di frontend dan Functions) |
| Ikon | **Material Symbols** (lihat bagian 3.4) |

Skema database lengkap ada di file **`supabase/migrations/001_init.sql`** (dari dokumen `hcc-skema-database.md`). **Gunakan skema itu persis**, termasuk fungsi `register_couple`, `confirm_payment`, `checkin_ticket`, `set_event_staff_password`, `verify_event_staff`, dan semua kebijakan RLS. Jangan membuat skema sendiri. Jika ada yang perlu diubah, jelaskan alasannya lalu buat file migrasi baru (`002_*.sql`).

---

## 3. Design system

Gaya: **minimalis, bersih, lapang, dominan putih** dengan aksen pink lembut. Kesan: hangat, tenang, elegan, tidak ramai.

### 3.1 Aturan komposisi warna
- **±85% permukaan putih.** Pink hanya untuk: tombol utama, status aktif, aksen kecil, badge, dan latar section tipis.
- Dilarang: gradasi mencolok, latar pink pekat satu layar penuh, banyak warna lain, bayangan tebal, border tebal.
- Section selang-seling antara putih `#FFFFFF` dan pink sangat muda `#FFF5F8`.

### 3.2 Design token (CSS variables di `src/styles/tokens.css`)

```css
:root {
  /* warna */
  --white:        #FFFFFF;
  --pink-50:      #FFF5F8;
  --pink-100:     #FDE7EF;
  --pink-200:     #FAD1E0;
  --pink-400:     #EE86A8;
  --pink-500:     #E85D8A;   /* primary */
  --pink-600:     #D14477;   /* hover / pressed */
  --ink-900:      #1F1A1D;   /* teks utama */
  --ink-600:      #6B6168;   /* teks sekunder */
  --ink-400:      #A89FA5;   /* placeholder */
  --line:         #F1E4EA;   /* border halus */

  /* status */
  --ok:           #2E9E6B;
  --ok-bg:        #E9F7F0;
  --warn:         #C98A12;
  --warn-bg:      #FFF6DF;
  --danger:       #D64545;
  --danger-bg:    #FDECEC;

  /* bentuk */
  --radius-sm:    10px;
  --radius-md:    14px;
  --radius-lg:    20px;
  --shadow-sm:    0 1px 2px rgba(31, 26, 29, .04);
  --shadow-md:    0 8px 24px rgba(232, 93, 138, .08);

  /* tata letak */
  --container:    1120px;
  --space-section: 96px;     /* 64px di mobile */
}
```

Konfigurasikan Tailwind agar memakai token ini (`pink`, `ink`, `line`, dst.).

### 3.3 Tipografi
- Font: **Poppins** (Google Fonts), bobot 400, 500, 600. Muat dengan `display=swap`.
- Judul: 600, `letter-spacing: -0.01em`. Body: 400, `line-height: 1.7`.
- Skala: `h1 44/52` (mobile 32/40), `h2 32/40` (mobile 24/32), `h3 20/28`, body `16`, kecil `14`.
- Teks utama `--ink-900`, sekunder `--ink-600`. Hindari teks pink untuk paragraf panjang.

### 3.4 Ikon
- Pakai **Material Symbols Outlined** dari Google (gaya garis tipis, minimalis).
- Pengaturan: `FILL 0`, `wght 300`, `GRAD 0`, `opsz 24`. Ukuran standar 20, 24, atau 32 px.
- Buat komponen **`<Icon name="event" size={24} />`** sebagai satu-satunya cara memakai ikon. Muat font dengan subset ikon yang dipakai saja (parameter `icon_names` di URL Google Fonts) agar ringan.
- **Dilarang memakai emoji sebagai ikon UI.** Emoji hanya boleh muncul di isi pesan WhatsApp.
- Warna ikon default `--ink-600`. Ikon aktif atau aksen `--pink-500`.
- Contoh nama ikon: `event`, `calendar_month`, `location_on`, `group`, `favorite`, `confirmation_number`, `qr_code_scanner`, `qr_code_2`, `download`, `payments`, `check_circle`, `schedule`, `add`, `edit`, `delete`, `content_copy`, `search`, `filter_list`, `drag_indicator`, `visibility`, `logout`, `settings`, `dashboard`, `article`, `lock`, `person`, `chat` (untuk WA), `arrow_forward`, `close`, `warning`, `error`.

### 3.5 Komponen dasar (buat di `src/components/ui/`)
- **Button**: `primary` (latar `--pink-500`, teks putih, hover `--pink-600`), `secondary` (putih, border `--line`, teks `--ink-900`, hover latar `--pink-50`), `ghost`, `danger`. Tinggi 44px, radius `--radius-md`. Ada state loading dan disabled.
- **Input / Textarea / Select**: latar putih, border `--line`, fokus: border `--pink-400` + ring `--pink-100`. Label di atas, pesan error di bawah (`--danger`).
- **Card**: putih, border `--line`, radius `--radius-lg`, `--shadow-sm`. Hover kartu event naik tipis dengan `--shadow-md`.
- **Badge status**: `pending` (warn), `paid` (ok), `expired` / `cancelled` (abu), `waitlist` (pink-100), `hadir` (ok).
- **Modal**, **Toast**, **Tabs**, **Table** (garis tipis, header latar `--pink-50`), **EmptyState** (ikon + teks), **Skeleton** loading.
- Animasi halus saja: transisi 150-200ms, tanpa animasi berlebihan. Hormati `prefers-reduced-motion`.

### 3.6 Logo
Gunakan logo dari folder `/public/img` (file logo HCC yang sudah ada). Jangan membuat ulang logo. Letakkan di navbar dan footer, tinggi 32-40px.

### 3.7 Responsif
Mobile-first. Titik patah 640 / 768 / 1024. Admin dan `/qrclass` **wajib nyaman di HP** (tabel menjadi daftar kartu di layar kecil, scanner layar penuh).

---

## 4. Struktur folder

```
happycoupleclass/
├─ public/
│  ├─ img/                       # logo HCC & aset statis
│  └─ manifest.webmanifest       # PWA untuk /qrclass
├─ src/
│  ├─ layouts/                   # BaseLayout, PublicLayout, AdminLayout, ScannerLayout
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ event/[slug].astro
│  │  ├─ p/[slug].astro                  # halaman/postingan buatan admin
│  │  ├─ daftar/[slug].astro
│  │  ├─ daftar/[slug]/sukses.astro
│  │  ├─ tiket/[token].astro
│  │  ├─ privasi.astro
│  │  ├─ admin/
│  │  │  ├─ login.astro
│  │  │  ├─ index.astro
│  │  │  ├─ events/index.astro
│  │  │  ├─ events/baru.astro
│  │  │  ├─ events/[id]/edit.astro
│  │  │  ├─ events/[id]/form.astro
│  │  │  ├─ events/[id]/peserta.astro
│  │  │  ├─ events/[id]/kehadiran.astro
│  │  │  ├─ halaman/index.astro
│  │  │  ├─ halaman/[id].astro
│  │  │  ├─ kategori.astro
│  │  │  ├─ pengaturan.astro
│  │  │  └─ log.astro
│  │  └─ qrclass/
│  │     ├─ index.astro                  # login pendata
│  │     └─ scan.astro
│  ├─ components/
│  │  ├─ ui/                     # Button, Input, Card, Badge, Modal, Toast, Icon, dst.
│  │  ├─ landing/                # Hero, TentangHCC, EventList, Testimoni, FAQ, Footer
│  │  ├─ register/               # FormRenderer, SuccessCard
│  │  ├─ ticket/                 # TicketCard, TicketDownload
│  │  ├─ admin/                  # Sidebar, StatCards, EventTable, PesertaTable, FormBuilder, PageEditor
│  │  └─ scanner/                # ScannerView, ResultOverlay
│  ├─ lib/
│  │  ├─ supabase.ts             # client publik (anon) & helper server
│  │  ├─ wa.ts                   # buildWaLink(number, template, vars)
│  │  ├─ schemas.ts              # zod schema
│  │  ├─ format.ts               # tanggal WIB, rupiah, nomor HP
│  │  └─ auth.ts                 # guard admin & token pendata
│  └─ styles/                    # tokens.css, global.css
├─ functions/api/
│  ├─ register.ts
│  ├─ ticket/[token].ts
│  ├─ payment-proof.ts
│  ├─ admin/confirm-payment.ts
│  ├─ admin/staff-password.ts
│  ├─ admin/export.ts
│  ├─ qrclass/login.ts
│  ├─ qrclass/checkin.ts
│  └─ qrclass/stats.ts
├─ supabase/migrations/001_init.sql
├─ .env.example
└─ README.md                     # cara setup dan deploy
```

---

## 5. Landing page `/`

Urutan section (putih dan `--pink-50` selang-seling):

1. **Navbar**: logo kiri; menu *Tentang, Event, FAQ*; tombol **Daftar** (primary). Sticky, latar putih, border bawah `--line`. Hamburger di mobile.
2. **Hero**: judul besar, subjudul singkat, 2 tombol (*Lihat Event* primary, *Tentang Kami* secondary). Banyak ruang kosong. Satu gambar/ilustrasi sederhana di sisi kanan (placeholder jika belum ada).
3. **Angka singkat** (4 kolom, ikon `group`, `location_city`, `favorite`, `event`): alumni 900+, kota 70+, dll. Ambil dari `site_settings` agar bisa diubah admin, dengan nilai awal dari data HCC.
4. **Tentang HCC**: teks pendek + 3 poin keunggulan, masing-masing dengan ikon.
5. **Event**: kartu event dari tabel `pages` (`status = published`, `show_on_landing = true`) dan `events` yang `open`. Kartu: gambar flyer, judul, tanggal, lokasi, harga, tombol *Lihat Detail*. Jika kosong, tampilkan EmptyState "Belum ada event, nantikan jadwal berikutnya."
6. **Cara daftar** (4 langkah dengan ikon): Isi form → Transfer → Konfirmasi WA → Terima tiket QR.
7. **Testimoni** (opsional, data dari `site_settings`).
8. **FAQ** (accordion).
9. **Footer**: logo, Instagram `@happycoupleclass`, kontak, tautan Kebijakan Privasi.

SEO: `<title>`, meta description, Open Graph (gambar flyer untuk halaman event), `sitemap.xml`, data terstruktur `Event` di halaman event.

---

## 6. Alur pendaftaran peserta

### 6.1 `/event/[slug]`
Menampilkan flyer, judul, deskripsi, tanggal, lokasi (+ tautan peta), harga **per couple**, sisa kuota (jika ada), dan tombol **Daftar Sekarang**. Jika event `closed` atau penuh, tombol berubah menjadi nonaktif (atau *Daftar Waiting List* bila `waitlist_enabled`).

### 6.2 `/daftar/[slug]` (FormRenderer)
- Field inti yang selalu ada, dalam satu kartu: **Nama Suami, Nama Istri, Nomor WhatsApp, Email (opsional)**.
- Field tambahan dibuat dari `form_fields`, diurutkan `sort_order`. Dukung: `text`, `textarea`, `number`, `phone`, `email`, `date`, `select`, `radio`, `checkbox`, `file`.
- Validasi dengan `zod` di klien **dan** di server. Nomor WA dinormalisasi ke format `62xxxxxxxxxx`.
- Widget **Turnstile** sebelum tombol kirim.
- Tombol kirim: **Daftar** (loading state, cegah klik ganda).
- Tangani error dari server dengan pesan ramah: `EVENT_FULL`, `DUPLICATE_PHONE`, `EVENT_NOT_OPEN`.

### 6.3 `POST /api/register`
1. Validasi body (zod) dan token Turnstile.
2. Ambil `form_fields` event, validasi `answers` sesuai tipe dan wajib/tidaknya.
3. Buat `form_snapshot` (peta `field_key` ke label saat ini).
4. Panggil RPC `register_couple(...)` memakai service role.
5. Kembalikan: `reg_code`, `ticket_token`, status, batas bayar, data rekening dari `payment_accounts` event, dan nomor WA admin konfirmator yang ditugaskan.

### 6.4 `/daftar/[slug]/sukses`
Kartu sukses dengan ikon `check_circle` (pink), berisi:
- Teks: *"Selamat, pendaftaran Anda sudah kami rekam. Silakan lakukan pembayaran lalu konfirmasi lewat tombol di bawah."* (bisa dioverride `events.success_message`).
- **Ringkasan**: kode pendaftaran, nama suami & istri, nama event, **nominal yang harus dibayar**, batas waktu bayar.
- **Rekening**: bank, nomor rekening, atas nama, tombol **Salin nomor** (`content_copy`).
- Tombol **Konfirmasi via WhatsApp** (ikon `chat`) mengarah ke `https://wa.me/{nomor_admin}?text=...` dengan pesan terisi otomatis dari template (`{husband} {wife} {event} {reg_code}`).
- Untuk status `waitlist`, ganti teks menjadi informasi bahwa pendaftar masuk daftar tunggu dan **tanpa** info rekening.
- Simpan hasil di `sessionStorage` agar halaman tidak kosong saat di-refresh. Jika tidak ada data, arahkan kembali ke halaman event.

---

## 7. Tiket digital `/tiket/[token]`

- Ambil data lewat `GET /api/ticket/:token` (token acak 24 karakter, bukan ID berurutan).
- Jika `payment_status = paid`: tampilkan **TicketCard** (putih, border halus, garis putus-putus pemisah, aksen pink tipis) berisi QR code besar (isi QR = `https://happycoupleclass.com/tiket/{token}` atau token saja, pilih satu dan konsisten dengan scanner), nama suami & istri, kode pendaftaran, nama event, tanggal, lokasi, dan status.
- Tombol **Download Tiket**: PNG (utama) dan PDF. Hasil unduhan harus rapi, tanpa elemen UI lain.
- Tombol **Tambah ke Kalender** (file `.ics`), ikon `calendar_month`.
- Jika status bukan `paid`: tampilkan pesan *"Pembayaran belum dikonfirmasi"* dan tombol WA ke admin konfirmator. **Jangan tampilkan QR.**
- Jika sudah check-in: tampilkan lencana "Sudah check-in" dan waktunya.
- Halaman harus `noindex`.

---

## 8. Dashboard admin `/admin`

### 8.1 Autentikasi
- `/admin/login`: email + password via **Supabase Auth**, dengan Turnstile. Setelah login, cek tabel `admins` (`is_active = true`). Jika tidak ada, keluarkan paksa.
- Semua halaman `/admin/*` dilindungi guard di sisi server (redirect ke login). Role `super_admin` melihat menu **Pengaturan** dan **Admin**.
- Sesi memakai cookie `httpOnly` (atau pola resmi `@supabase/ssr`), bukan `localStorage`.

### 8.2 Tata letak
Sidebar kiri putih (ikon + label, aktif ditandai latar `--pink-50` dan ikon pink), topbar tipis dengan nama admin dan tombol keluar. Di mobile: sidebar menjadi drawer.

Menu: **Ringkasan** (`dashboard`), **Event** (`event`), **Halaman** (`article`), **Kategori** (`category`), **Pengaturan** (`settings`), **Log** (`history`).

### 8.3 Ringkasan
Kartu statistik: event aktif, total pendaftar, menunggu bayar, lunas, hadir. Di bawahnya: daftar 5 pendaftar terbaru yang belum bayar (tombol cepat ke halaman peserta), dan event terdekat.

### 8.4 Event (`/admin/events`)
- Daftar event **dikelompokkan per kategori** (tab atau accordion). Tiap kartu/baris: judul, tanggal, status, jumlah pendaftar / kuota, jumlah lunas, tombol *Peserta*, *Form*, *Edit*.
- Tombol **+ Tambah Kelas** membuka form dasar (judul, slug otomatis dari judul, kategori, tanggal, lokasi, harga per couple, kuota, rekening, admin konfirmator, flyer), lalu **langsung masuk ke Form Builder** event tersebut.
- Pengaturan lain di halaman edit: status (`draft/open/closed/done`), batas waktu bayar, waiting list, izinkan nomor WA ganda, teks halaman sukses, template pesan WA.
- **Pilih rekening** dari dropdown `payment_accounts` (dengan tautan cepat *Kelola rekening*).
- **Pilih admin konfirmator**: multi-select dari `admins` aktif; satu bisa ditandai utama. Tampilkan nomor WA tiap admin di pilihan.
- Tombol **Duplikat event** (menyalin event beserta field form, tanpa peserta) dan **Arsipkan** (soft delete, `deleted_at`). Konfirmasi dulu sebelum hapus.
- Bagian **Akun Pendata**: tombol *Buat/Reset Password* (tampilkan password sekali saja, ada tombol salin), tampilkan **ID Event** untuk login `/qrclass`, dan tombol *Nonaktifkan*.

### 8.5 Form Builder (`/admin/events/[id]/form`)
Mirip Google Form, tapi minimalis:
- Kiri/tengah: daftar field yang bisa **diurutkan drag & drop** (`drag_indicator`). Field inti (nama suami, nama istri, WA, email) tampil di paling atas sebagai kartu terkunci (tidak bisa dihapus, hanya label bantu yang bisa diubah).
- Tiap field: label, tipe, placeholder, teks bantuan, wajib/tidak, opsi (untuk select/radio/checkbox), aturan validasi sederhana. Tombol duplikat dan hapus.
- Tombol **+ Tambah Pertanyaan** membuka pilihan tipe (ikon per tipe).
- Panel **Pratinjau** langsung di sisi kanan (desktop) atau tab (mobile) memakai `FormRenderer` yang sama dengan publik.
- Simpan otomatis (debounce) dengan indikator "Tersimpan". Tampilkan peringatan jika form diubah padahal sudah ada pendaftar (data lama tetap aman karena ada `form_snapshot`).
- Tombol **Salin tautan form** ke `/daftar/[slug]`.

### 8.6 Data Peserta (`/admin/events/[id]/peserta`)
- Header event + ringkasan angka (total, menunggu, lunas, hadir, sisa kuota).
- **Tabel** (kartu di mobile) dengan kolom: kode, nama suami & istri, nomor WA, status pembayaran (badge), admin penanggung jawab, tanggal daftar, status hadir, aksi.
- Pencarian (nama/kode/nomor), filter status pembayaran dan status hadir, urut tanggal.
- Klik baris membuka **panel detail** yang menampilkan semua jawaban form builder (label dari `form_snapshot`), bukti bayar jika ada, riwayat waktu.
- Aksi per peserta:
  - **Pembayaran Selesai** (ikon `check_circle`) → modal konfirmasi + catatan opsional → `POST /api/admin/confirm-payment`.
  - Setelah lunas, muncul tombol **Kirim WA** (ikon `chat`) yang membuka `https://wa.me/{nomor_peserta}?text=...` berisi: *selamat pembayaran sudah dikonfirmasi dan berikut link konfirmasi kedatangan (`/tiket/{token}`)*. Catat `wa_sent_at` saat ditekan.
  - **Salin link tiket**, **Batalkan**, **Tandai kedaluwarsa/aktifkan kembali**, **Edit data**, **Hapus (soft)**.
- Tombol **Ekspor CSV** (hanya data event ini).
- Peserta berstatus `waitlist` punya aksi *Naikkan ke daftar utama* jika kuota tersedia.

### 8.7 Kehadiran (`/admin/events/[id]/kehadiran`)
Daftar real-time (polling 10 detik atau Supabase Realtime) peserta yang sudah check-in, jumlah hadir dibanding total lunas, serta log scan (`checkin_logs`) termasuk yang gagal. Tombol cetak/ekspor rekap hadir.

### 8.8 Halaman / Postingan (`/admin/halaman`)
- Daftar halaman dengan status *draft/published*, tombol **+ Buat Halaman**.
- **Editor blok** sederhana (disimpan ke `pages.blocks`):
  - `image` (upload flyer ke bucket `flyers`, kompres otomatis di klien, ukuran maks 5 MB, hanya jpg/png/webp)
  - `heading`, `text` (bold, italic, list, tautan)
  - `event_info` (pilih event, menampilkan tanggal/lokasi/harga otomatis)
  - `button` (label + aksi: *form pendaftaran event* dengan dropdown event, atau tautan bebas)
  - `faq`, `gallery`
- Bisa diurutkan, dihapus, dan diduplikat. Ada **Pratinjau** dan tombol **Publikasikan**.
- Pengaturan halaman: judul, slug, ringkasan, gambar sampul, event terkait, tampil di landing (ya/tidak), urutan.
- **Sanitasi** semua HTML dari blok teks (mis. DOMPurify) sebelum disimpan dan sebelum ditampilkan.

### 8.9 Pengaturan (khusus `super_admin`)
- **Rekening Pembayaran**: tambah, ubah, nonaktifkan (bank, nomor, atas nama).
- **Admin**: tambah akun admin (buat user Supabase Auth + baris `admins`), ubah nama dan **nomor WA**, aktif/nonaktifkan, ubah role.
- **Template pesan WA** default (`default_wa_to_admin`, `default_wa_to_user`, `default_success_message`) dengan daftar placeholder yang tersedia.
- **Konten landing**: angka statistik, FAQ, testimoni, tautan sosmed.

### 8.10 Log (`/admin/log`)
Tabel `audit_logs` (siapa, aksi, target, waktu), dengan filter. Hanya baca.

---

## 9. Aplikasi pendataan `/qrclass`

Dirancang untuk HP, layar penuh, sangat sederhana, dan dapat dipasang sebagai **PWA**.

### 9.1 Login `/qrclass`
- Dua isian: **ID Event** (kode event, tampil di dashboard admin) dan **Password**, plus isian opsional **Nama Pendata** (dipakai sebagai `checked_in_by`).
- `POST /api/qrclass/login` → `verify_event_staff()`. Jika sukses, terbitkan **JWT pendek (mis. 12 jam)** yang hanya berlaku untuk event itu dan disimpan di cookie `httpOnly`.
- Batasi percobaan (rate limit per IP) dan tampilkan pesan terkunci saat `locked_until` aktif. Pesan error umum: "ID event atau password salah."

### 9.2 Scanner `/qrclass/scan`
- Tampilan kamera belakang penuh dengan bingkai pemindai minimalis. Header kecil: nama event, jumlah hadir / total lunas.
- Setelah QR terbaca → `POST /api/qrclass/checkin` (`token`) → tampilkan **ResultOverlay** layar penuh selama ±2 detik, lalu otomatis siap scan lagi:
  - `ok` → hijau `--ok`, ikon `check_circle`, tulisan besar **TERDAFTAR**, nama suami & istri, kode.
  - `already` → kuning, **SUDAH CHECK-IN**, waktu check-in.
  - `unpaid` → merah, **BELUM LUNAS**, arahkan ke meja admin.
  - `wrong_event` → merah, **TIKET EVENT LAIN**.
  - `invalid` → merah, **QR TIDAK DIKENALI**.
- Tambahkan getar singkat (`navigator.vibrate`) dan opsi bunyi bip.
- **Input manual**: kolom untuk mengetik kode pendaftaran/token jika QR rusak. Tombol senter jika didukung.
- Daftar 10 scan terakhir di panel bawah (geser naik).
- Cegah scan beruntun terlalu cepat (jeda 1,5 detik) dan abaikan QR yang sama selama overlay tampil.
- Tombol keluar menghapus sesi.

---

## 10. Keamanan (wajib diterapkan)

1. **RLS aktif di semua tabel** sesuai skema. Pengunjung publik tidak boleh `select` dari `registrations`, `event_staff`, `payment_accounts`, `audit_logs`.
2. `SUPABASE_SERVICE_ROLE_KEY` **hanya** ada di environment Cloudflare dan dipakai di Pages Functions. Jangan pernah dibawa ke kode klien atau di-commit ke GitHub.
3. Semua tulis ke data peserta lewat Functions yang memvalidasi input dengan `zod`. Jangan percaya data dari browser (harga, status bayar, kuota dihitung di server).
4. **Turnstile** di form pendaftaran, login admin, dan login `/qrclass`. Terapkan rate limit per IP (pakai Cloudflare rate limiting rules atau penghitung sederhana).
5. Token tiket acak panjang. Tidak ada ID berurutan di URL publik.
6. Password pendata di-hash (`crypt` bcrypt di database). Tidak pernah disimpan atau ditampilkan ulang selain saat dibuat.
7. Endpoint `/api/admin/*` memverifikasi JWT Supabase **dan** `admins.is_active`. Endpoint `/api/qrclass/*` memverifikasi JWT pendata **dan** kecocokan `event_id`.
8. Sanitasi HTML dari editor halaman. Validasi tipe dan ukuran file upload (flyer maks 5 MB, bukti bayar maks 3 MB, hanya jpg/png/webp/pdf sesuai konteks).
9. Header keamanan via `_headers` Cloudflare: `Content-Security-Policy` (izinkan Google Fonts, Turnstile, dan Supabase), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
10. Halaman `/admin`, `/qrclass`, `/tiket/*`, `/daftar/*/sukses` diberi `noindex`.
11. Jangan menulis data pribadi peserta (nama, nomor WA) ke log konsol.
12. Semua aksi sensitif (konfirmasi bayar, batalkan, hapus, reset password pendata, ubah rekening/admin) dicatat ke `audit_logs`.

---

## 11. Kualitas dan aksesibilitas

- TypeScript strict, ESLint + Prettier. Tidak ada `any` tanpa alasan.
- Semua tombol ikon punya `aria-label`. Kontras teks memenuhi WCAG AA. Fokus keyboard terlihat.
- Semua form punya label, pesan error terhubung dengan `aria-describedby`.
- Format tanggal **WIB** (`Asia/Jakarta`), contoh: *27 September 2026, 08.00 WIB*. Format rupiah: `Rp 250.000`.
- Tampilkan status *loading*, *kosong*, dan *error* di setiap daftar/halaman data.
- Gambar: `loading="lazy"`, ukuran eksplisit, format webp bila memungkinkan.
- Target Lighthouse landing page: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95.

---

## 12. Fase pengerjaan

Kerjakan berurutan. Di akhir tiap fase, tulis ringkasan singkat apa yang sudah jadi dan cara mengujinya.

**Fase 1 — Fondasi**
Inisialisasi proyek, Tailwind + token desain, font Poppins, komponen `Icon` (Material Symbols), komponen UI dasar, layout, koneksi Supabase, file `.env.example`, `README` setup. Terapkan `001_init.sql`. Login admin + guard + layout dashboard kosong.
*Selesai jika:* bisa login sebagai admin dan melihat dashboard kosong yang tampil sesuai design system.

**Fase 2 — Event & Form Builder**
CRUD kategori, rekening, admin (pengaturan), event, serta Form Builder drag & drop dengan pratinjau dan simpan otomatis.
*Selesai jika:* admin bisa membuat event, memilih rekening dan konfirmator, menyusun form, dan melihat pratinjau.

**Fase 3 — Landing & Pendaftaran**
Landing page, halaman event, FormRenderer, `POST /api/register`, halaman sukses (rekening, salin, tombol WA admin).
*Selesai jika:* peserta bisa mendaftar dan data masuk ke `registrations` dengan status `pending` dan admin konfirmator ter-assign.

**Fase 4 — Peserta, Pembayaran, Tiket**
Halaman data peserta (cari, filter, detail), aksi *Pembayaran Selesai*, tombol *Kirim WA*, halaman tiket QR + unduh PNG/PDF + `.ics`, ekspor CSV, kedaluwarsa otomatis.
*Selesai jika:* alur daftar → konfirmasi → tiket QR berjalan penuh.

**Fase 5 — /qrclass**
Login pendata, buat/reset password dari admin, scanner PWA, ResultOverlay, input manual, rekap kehadiran di admin.
*Selesai jika:* scan tiket lunas menghasilkan "TERDAFTAR", scan ulang menghasilkan "SUDAH CHECK-IN", dan hadir tampil di admin.

**Fase 6 — Editor Halaman**
Editor blok, upload gambar, publikasi, tampilan di landing dan `/p/[slug]`, tombol yang mengarah ke form event.
*Selesai jika:* admin bisa membuat postingan flyer + keterangan + tombol daftar yang muncul di landing.

**Fase 7 — Pengamanan & Poles**
Turnstile + rate limit, header keamanan, audit log, halaman Log, privasi, SEO/sitemap, uji Lighthouse, perbaikan responsif, uji alur penuh dengan 1 event percobaan.
*Selesai jika:* seluruh checklist di bagian 13 tercentang.

---

## 13. Checklist penerimaan akhir

- [ ] Tampilan dominan putih, pink hanya sebagai aksen. Semua ikon dari Material Symbols Outlined, tanpa emoji di UI.
- [ ] Anon tidak bisa membaca `registrations`, `event_staff`, `payment_accounts` (uji dengan anon key).
- [ ] Daftar sebagai peserta menghasilkan baris `pending`, rekening event tampil benar, tombol WA mengarah ke nomor admin konfirmator yang ditugaskan.
- [ ] Mengubah nomor WA admin atau rekening event langsung tercermin di halaman sukses tanpa mengubah data lama.
- [ ] Kuota penuh menolak pendaftaran baru (atau masuk waiting list bila aktif). Nomor WA ganda ditolak bila tidak diizinkan.
- [ ] *Pembayaran Selesai* mengubah status, mencatat admin dan waktu, lalu memunculkan tombol *Kirim WA* berisi link tiket.
- [ ] Halaman tiket tidak menampilkan QR sebelum lunas. Unduh PNG dan PDF rapi.
- [ ] `/qrclass`: login dengan ID event + password, scan sukses/ganda/belum lunas/tiket event lain/QR asing semuanya menampilkan hasil yang benar.
- [ ] Postingan buatan admin tampil di landing dan tombol daftarnya mengarah ke form event yang benar.
- [ ] Hasil unduhan CSV hanya berisi data event yang dipilih.
- [ ] Semua halaman nyaman di HP, terutama admin dan scanner.
- [ ] `.env.example` dan `README.md` menjelaskan cara setup Supabase, Cloudflare Pages, GitHub, domain, dan Turnstile.

---

## 14. Variabel lingkungan

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # hanya di Functions
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET=
QR_JWT_SECRET=
PUBLIC_SITE_URL=https://happycoupleclass.com
```

---

## 15. Aturan kerja untuk AI

- Ikuti dokumen ini. Jika ada hal yang ambigu, pilih opsi paling sederhana dan aman, lalu catat asumsinya di `README.md`.
- Jangan mengubah skema database tanpa membuat file migrasi baru.
- Jangan memasukkan rahasia ke repo. Jangan menambah dependensi besar tanpa alasan.
- Setelah tiap fase: jalankan `npm run build` dan `npm run lint`, perbaiki semua error sebelum lanjut.
- Tulis kode yang mudah dibaca dan dipelihara. Pisahkan logika bisnis ke `lib/` dan Functions, bukan di komponen tampilan.

# Mappetite: Product Requirements Document (v0.2)

> Status: keputusan utama sudah dikonfirmasi (lihat bagian 11). Desain awal ada di `DESIGN.md` dan folder `design/`.
> Terakhir diperbarui: 12 Oktober 2026

## 1. Ringkasan

Mappetite adalah aplikasi web untuk menyimpan daftar tempat makan yang ingin (atau sudah) dikunjungi. User cukup paste link Google Maps. Aplikasi lalu mengambil nama dan koordinat restoran dari link itu dan menampilkannya sebagai penanda (marker) di peta interaktif dan di halaman list.

Targetnya aplikasi publik yang bisa dipakai siapa saja. Setiap user punya akun dan daftar restorannya sendiri. Tampilan tersedia dalam Bahasa Indonesia dan Inggris.

## 2. Masalah & Tujuan

Masalah:
- Rekomendasi tempat makan tersebar di chat, TikTok, Instagram, dan Google Maps "Saved". Susah dicari lagi waktu butuh.
- Fitur "Saved" di Google Maps tidak punya status dikunjungi atau belum, catatan pribadi, rating sendiri, atau filter yang fleksibel.

Tujuan:
- Menyimpan restoran secepat mungkin (paste link, beres).
- Melihat semua restoran yang disimpan di peta dan di list.
- Membantu memutuskan "mau makan di mana" berdasarkan lokasi, status, dan preferensi.

## 3. Target User

- Pecinta kuliner yang suka mengumpulkan rekomendasi tempat makan.
- Pasangan atau teman yang sering bingung pilih tempat makan.
- Mayoritas kemungkinan pakai HP, jadi desainnya mobile-first tapi tetap nyaman di desktop.

## 4. Lingkup Fitur

### 4.1 MVP

| # | Fitur | Deskripsi |
|---|---|---|
| F1 | Auth (Register & Login) | Daftar/masuk dengan email + password, plus Sign in with Google. Semua halaman selain login/register wajib login. User hanya bisa melihat dan mengubah datanya sendiri. |
| F2 | Input link Google Maps | User paste link (`maps.app.goo.gl/...`, `goo.gl/maps/...`, `google.com/maps/place/...`). Backend mengambil nama dan koordinat dari link itu. Hasilnya ditampilkan sebagai preview yang bisa diedit sebelum disimpan. Kalau gagal, ada input manual. |
| F3 | Peta interaktif | Marker untuk setiap restoran tersimpan. Klik marker untuk membuka popup detail (nama, alamat, status, rating, catatan, tombol "Rute di Maps"). |
| F4 | Halaman list | Daftar semua restoran tersimpan dengan search, filter, dan sort. Klik item untuk membuka detail. |
| F5 | Detail & edit restoran | Lihat, edit, dan hapus data restoran. |
| F6 | Dua bahasa (ID / EN) | Toggle bahasa. Pilihan disimpan di browser; defaultnya mengikuti bahasa browser. Format angka dan tanggal menyesuaikan bahasa. |

### 4.2 Fitur tambahan

Prioritas P1 masuk MVP dan sudah disetujui. P2 dan P3 untuk fase berikutnya.

| Prioritas | Fitur | Keterangan |
|---|---|---|
| P1 | Status "Ingin dikunjungi" / "Sudah dikunjungi" | Marker dan badge beda warna serta ikon per status. |
| P1 | Rating & catatan pribadi | Rating 1–5 (kelipatan 0,5) dan catatan bebas. |
| P1 | Tag / kategori & kisaran harga | Tag per user (kopi, ramen, halal, nugas…), harga `$`–`$$$$`. Dipakai untuk filter. |
| P1 | Filter & search di peta dan list | Status, tag, harga, rating minimal, kata kunci. |
| P1 | Jarak & urutkan terdekat | Pakai geolokasi browser (kalau diizinkan), jarak dihitung di frontend. |
| P1 | Tombol "Rute di Google Maps" | Membuka Google Maps ke lokasi restoran. |
| P1 | Deteksi duplikat | Peringatan kalau restoran yang sama sudah pernah disimpan. |
| P2 | Filter radius "Dekat saya" | Query radius di database (PostGIS). |
| P2 | Random picker "Mau makan di mana?" | Undian dari wishlist dengan filter radius, kategori, dan harga. |
| P2 | Koleksi / folder | Misal "Kuliner Bandung", "Tempat Nugas". |
| P2 | PWA + Share Target | Install di HP. Di Android bisa langsung share dari app Google Maps (iOS belum mendukung Web Share Target). |
| P2 | Upload foto | Foto makanan atau kunjungan (Supabase Storage). |
| P3 | Share koleksi via link publik | Butuh halaman publik, jadi aturan "semua halaman wajib login" perlu ditinjau ulang saat itu. |
| P3 | Koleksi kolaboratif | Satu list dikelola bersama. |
| P3 | Riwayat kunjungan | Beberapa kunjungan per restoran. |
| P3 | Import dari Google Takeout | Import massal "Saved places". |
| P3 | Dark mode | `next-themes`, seperti SmartHub. |

### 4.3 Di luar lingkup (untuk sekarang)

- Google Places API dan layanan berbayar lain. Versi awal 100% memakai layanan gratis.
- Scraping konten halaman Google Maps (foto, review, jam buka), karena melanggar ToS Google dan gampang rusak.
- Review publik atau fitur sosial (follow, like).
- Aplikasi native Android/iOS. Penggantinya PWA.

## 5. User Flow Utama

1. Simpan restoran: Login → "Tambah Restoran" → paste link → "Ambil Data" → preview (nama, pin di mini-map, alamat) → lengkapi status, harga, tag, catatan → Simpan → marker muncul di peta.
2. Jelajah peta: Beranda (Peta) → marker dan cluster → klik marker → popup detail → "Rute di Maps".
3. Lihat list: Daftar → search, filter, atau sort → klik item → detail → edit, atau tandai "Sudah dikunjungi" dan beri rating.

## 6. Tech Stack

Mengikuti SmartHub, dengan penyesuaian karena Mappetite adalah web publik, bukan aplikasi desktop Electron. Versi library di-pin saat scaffolding.

### 6.1 Frontend (`mappetite-fe`)

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js 16 (App Router), JavaScript | Sama dengan SmartHub, termasuk static export (`output: "export"`, `trailingSlash: true`). Halaman detail memakai query param (`/places/detail?id=...`), seperti pola `multimedia/detail` di SmartHub. |
| Styling | Tailwind CSS v4 (konfigurasi di CSS) | Token desain dari `DESIGN.md` didefinisikan di `@theme`. |
| Icon | lucide-react | Sama dengan SmartHub. |
| Font | Plus Jakarta Sans (`next/font/google`) | SmartHub memakai Lexend; bisa diganti kalau mau sama. |
| Peta | Leaflet + react-leaflet + leaflet.markercluster | Gratis, tanpa API key. Di-render client-only. |
| Tile peta | OpenStreetMap (dev), CARTO / MapTiler / Stadia free tier (production) | Server tile resmi OSM tidak untuk trafik besar. Atribusi OSM wajib tampil. |
| Auth gate | Pola `ClientWrapper` seperti SmartHub | Redirect ke `/login` kalau belum login. Data tetap dilindungi di backend. |
| Data fetching | `fetch` + satu API client terpusat (`lib/api.js`) | Base URL dari `NEXT_PUBLIC_API_URL` (tidak hardcode). Token otomatis dikirim di header `Authorization`. |
| Bahasa | `LanguageProvider` (React context) + kamus `lib/i18n/id.js` dan `en.js` | Tanpa library tambahan, dan cocok dengan static export. Format angka dan tanggal pakai `Intl`. |
| Google Sign-In | Google Identity Services (`@react-oauth/google`) | Kirim ID token ke backend. |
| Package manager | npm | Sama dengan SmartHub. |

### 6.2 Backend (`mappetite-be`)

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Bahasa | Python 3.12 | Sama dengan SmartHub. |
| Framework | Flask 3 + flask-cors | Sama dengan SmartHub. |
| Arsitektur | `routes` → `function` (business) → `datas` (data access) → `helpers` / `middleware` | Struktur layer dan konvensi penamaan sama dengan SmartHub (`RegisterUser`, `dataGetUserByEmail`, …). |
| Database access | Raw SQL berparameter dengan `psycopg2` + `RealDictCursor`, tanpa ORM | Sama dengan SmartHub. Fungsi data mengembalikan `(err_code, err_msg, result)`. Ditambah connection pool (`psycopg2.pool`) karena dipakai banyak user. |
| Skema database | File SQL berurutan di `db/migrations/001_init.sql`, `002_...sql` | Tanpa tool migrasi. File dijalankan manual di Supabase SQL Editor, tapi tetap tercatat di repo. |
| Validasi | Helper manual di `helpers/validation.py` | Sama dengan SmartHub. |
| Auth | bcrypt + PyJWT (HS256) + google-auth | Sama dengan SmartHub. Bedanya, semua endpoint data memakai `jwt_required`. |
| Resolve link | `requests` | Untuk mengikuti redirect short link Google Maps. |
| Rate limiting | Flask-Limiter | Untuk login, register, dan parse-link. |
| Config | Satu modul `config.py` yang membaca `.env` sekali | Menggantikan `load_dotenv()` yang tersebar di banyak file seperti di SmartHub. |
| Server production | gunicorn | |
| Dependency | `requirements.txt` dengan versi di-pin | Termasuk `google-auth`, yang belum tercantum di SmartHub. |

### 6.3 Database: PostgreSQL (Supabase)

Pilihannya PostgreSQL di Supabase, sama dengan SmartHub:
- Data user, restoran, tag, dan koleksi saling berelasi, jadi cocok dengan tabel dan foreign key.
- Konkurensi dan integritasnya aman untuk banyak user sekaligus.
- PostGIS tersedia untuk query radius di P2.
- Managed, ada backup dan free tier.
- Supabase Storage bisa dipakai untuk foto nanti.

Supabase hanya dipakai sebagai database Postgres. Auth tetap di Flask.

### 6.4 Infrastruktur & Deployment

| Komponen | Pilihan |
|---|---|
| Frontend (static export) | Vercel / Netlify / Cloudflare Pages (gratis, tanpa kartu kredit) |
| Backend | **Render Free Web Service** (gunicorn) |
| Database | Supabase Postgres (free tier) |
| Secrets | Environment variables di platform. `.env` tidak di-commit; yang di-commit hanya `.env.example`. |

Kenapa Render untuk backend (dicek Oktober 2026):
- Gratis tanpa kartu kredit, dengan kuota 750 jam instance per bulan — cukup untuk satu service.
- Flask jalan langsung tanpa konfigurasi tambahan, deploy otomatis dari GitHub.
- Trade-off: service tertidur setelah 15 menit tanpa traffic, dan butuh ±1 menit untuk bangun lagi di request pertama. Bisa diterima untuk tahap awal; nanti bisa di-ping berkala atau upgrade plan kalau sudah butuh selalu aktif.

Opsi yang dipertimbangkan tapi tidak dipakai:
- **Railway** — sekarang wajib kartu kredit, trial $5 habis dalam 30 hari lalu mulai menagih.
- **Fly.io** — tidak ada free tier lagi sejak Oktober 2024, semua pay-as-you-go.
- **PythonAnywhere** — gratis tanpa kartu kredit, tapi akun gratis hanya bisa mengakses domain yang ada di whitelist mereka. `nominatim.openstreetmap.org`, `google.com`, dan `supabase.co` ada di whitelist, tapi `goo.gl` / `maps.app.goo.gl` (dibutuhkan untuk resolve short link Google Maps, lihat bagian 7) **tidak ada**. Ini membuatnya tidak cocok untuk fitur inti Mappetite, kecuali upgrade ke paid plan.
- **Google Cloud Run** — ada kuota "Always Free" yang genuinely gratis, tapi tetap wajib pasang kartu kredit untuk aktivasi billing account, dan setup Docker/gcloud lebih rumit dibanding Render.

## 7. Strategi Parsing Link Google Maps (gratis)

Format link yang didukung:
- Short link: `https://maps.app.goo.gl/<id>`, `https://goo.gl/maps/<id>`
- Full link: `https://www.google.com/maps/place/<Nama>/@<lat>,<lng>,<zoom>z/data=...!3d<lat>!4d<lng>...`
- Link query: `https://www.google.com/maps?q=<lat>,<lng>`

Alur di backend:
1. Validasi domain dengan whitelist (`maps.app.goo.gl`, `goo.gl`, `google.com`, `maps.google.com`). Domain lain ditolak (anti-SSRF).
2. Resolve short link dengan mengikuti redirect secara manual: maksimal 5 hop, timeout, dan setiap hop dicek ulang ke whitelist.
3. Ekstrak dari URL:
   - Nama dari `/place/<Nama>/`
   - Koordinat dari `!3d..!4d..` (posisi pin), dengan fallback ke `@lat,lng`
   - Identifier tempat dari segmen `data=` kalau ada, untuk deteksi duplikat
4. Alamat diambil lewat reverse geocoding Nominatim (OSM). Ini gratis, maksimal 1 request/detik, wajib memakai User-Agent yang jelas, dan hasilnya di-cache di database.
5. Hasil dikirim sebagai preview. User bisa koreksi nama atau geser pin sebelum menyimpan.

Kalau parsing gagal, user diarahkan ke form manual (isi nama + pilih titik di peta).

## 8. Model Data (awal)

Ditulis sebagai SQL di `db/migrations/001_init.sql`.

```
users
  user_id (uuid, PK) | username (unique) | email (unique)
  password (nullable, hash bcrypt; NULL untuk user Google)
  auth_provider ('local' | 'google') | preferred_language ('id' | 'en')
  created_at | updated_at

places                      -- data lokasi, bisa dipakai bersama antar user
  place_id (uuid, PK) | name | address | latitude | longitude
  google_maps_url | google_place_ref (nullable, unique)
  created_at

saved_places                -- restoran yang disimpan user
  saved_place_id (uuid, PK) | user_id (FK) | place_id (FK)
  custom_name (nullable) | status ('wishlist' | 'visited')
  rating (numeric(2,1), 0.5–5.0, kelipatan 0.5, nullable)
  price_level (1–4, nullable) | notes (maks 500 karakter)
  visited_at (nullable) | created_at | updated_at
  UNIQUE (user_id, place_id)

tags
  tag_id | user_id (FK) | name | UNIQUE (user_id, name)

saved_place_tags
  saved_place_id (FK) | tag_id (FK) | PK (saved_place_id, tag_id)

-- Fase berikutnya: collections, collection_items, visits, photos
```

Login dengan password ditolak dengan pesan yang jelas untuk akun yang `password`-nya NULL (user Google). Ini memperbaiki bug yang ada di SmartHub.

## 9. API Endpoint (awal)

Response memakai envelope SmartHub, ditambah `error.key` supaya pesan error bisa diterjemahkan di frontend:
`{ message, error: { status, code, key, message }, data }`. Contoh `key`: `auth.email_exists`, `places.link_invalid`.

| Method | Endpoint | Auth | Fungsi |
|---|---|---|---|
| POST | `/api/auth/register` | – | Daftar akun |
| POST | `/api/auth/login` | – | Login email/password |
| POST | `/api/auth/google` | – | Login Google (ID token) |
| GET | `/api/auth/me` | ✅ | Data user yang sedang login |
| PATCH | `/api/auth/me` | ✅ | Ubah profil / bahasa |
| POST | `/api/places/parse-link` | ✅ | Parsing link Google Maps menjadi preview |
| GET | `/api/places` | ✅ | List (query: `status`, `tag`, `price`, `min_rating`, `q`, `sort`, `page`) |
| POST | `/api/places` | ✅ | Simpan restoran (dengan cek duplikat) |
| GET | `/api/places/<id>` | ✅ | Detail |
| PATCH | `/api/places/<id>` | ✅ | Edit |
| DELETE | `/api/places/<id>` | ✅ | Hapus |
| GET/POST/PATCH/DELETE | `/api/tags` | ✅ | Kelola tag |

## 10. Halaman Frontend

Mockup ada di `design/`. Panduan warna, tipografi, dan komponen ada di `DESIGN.md`.

| Route | Halaman |
|---|---|
| `/login`, `/register` | Auth (tanpa navigasi) |
| `/` | Peta (beranda). Desktop: list kiri + peta kanan. Mobile: peta penuh + bottom sheet. |
| `/list` | Daftar restoran + search, filter, sort |
| `/places/new` | Tambah restoran. Desktop tampil sebagai modal di atas Peta, mobile full-screen. |
| `/places/detail?id=` | Detail & edit |
| `/settings` | Profil, bahasa, kelola tag, logout |

## 11. Keputusan yang Sudah Dikonfirmasi

| Topik | Keputusan |
|---|---|
| Frontend | Next.js seperti SmartHub |
| Akses data | Raw SQL (psycopg2) seperti SmartHub, tanpa ORM |
| Bahasa UI | Indonesia & Inggris |
| Akses halaman | Semua halaman wajib login (kecuali login/register) |
| Data restoran | Versi gratis: parsing link + reverse geocoding OSM |
| Fitur | P1 masuk MVP |
| Desain | Draft awal dibuat berdasarkan referensi (`DESIGN.md`, `design/`) |

## 12. Keamanan & Non-Functional

- Password di-hash bcrypt. JWT dengan masa berlaku terbatas. Semua endpoint data mengecek kepemilikan (`user_id` dari token).
- Semua query memakai parameter (tanpa string concatenation).
- Secrets hanya di environment variables. Tidak di-commit, tidak di-bundle.
- CORS hanya mengizinkan domain frontend.
- Rate limit untuk login, register, dan parse-link.
- Whitelist domain, batas redirect, dan timeout pada resolver link (anti-SSRF).
- Token JWT disimpan di localStorage seperti SmartHub. Karena itu frontend tidak boleh merender HTML mentah dari input user, untuk mencegah XSS.
- Mobile-first dan responsif, dengan aksesibilitas sesuai `DESIGN.md` bagian 7.
- Performa: marker clustering, pagination list, index pada `saved_places.user_id` dan koordinat.

## 13. Rencana Pengerjaan (Milestone)

| Fase | Isi |
|---|---|
| M0: Setup | Repo `mappetite-be` & `mappetite-fe`, `config.py`, `.env.example`, koneksi Supabase + pool, `001_init.sql`, token Tailwind, kerangka i18n, ESLint |
| M1: Auth | Register, login, Google login, `jwt_required`, halaman auth, `ClientWrapper` |
| M2: Simpan restoran | Parser link + test (pytest), endpoint CRUD places, modal/halaman tambah dengan preview |
| M3: Peta | Leaflet, marker per status, cluster, popup, lokasi saya |
| M4: List & detail | Search, filter, sort, detail/edit, tag, rating, catatan, duplikat |
| M5: Polish & deploy | Empty, error, dan loading state, cek ID/EN, responsif, deploy |
| Berikutnya | P2: radius "Dekat saya", random picker, koleksi, PWA share target, foto |

## 14. Kriteria Sukses MVP

- User bisa daftar/login (email dan Google) dan hanya melihat datanya sendiri. Halaman lain tidak bisa diakses tanpa login.
- Paste link Google Maps (short link maupun full link) menghasilkan nama dan koordinat yang benar pada mayoritas link uji.
- Restoran tersimpan muncul sebagai marker di peta. Klik marker menampilkan detailnya.
- Halaman list menampilkan semua restoran dengan filter status dan tag yang berfungsi.
- Seluruh UI bisa diganti ID ↔ EN tanpa reload, dan tidak ada teks yang tertinggal di salah satu bahasa.
- Aplikasi bisa diakses publik lewat URL production dan nyaman dipakai di HP.

Saran Next
- Warna Diperbaiki
- Tambahin Detail Seperti Jam Buka dan yang lainnya di detail
- Hapus tombol edit yang ada dibawah di halaman detail, tambahain tombol edit atau pensil di sebelah kanan nama restaurant untuk edit nama, rating, dan harga
- Tombol edit yang di notes ntuk edit noted, tanggal visited dan tags
- Buat modal aja jangan form 
- Tambah filter di list untuk restorant yang masih buka sekarang, ambil api jam sekarang lalu cari restorant yang masih buka di jam sekarang

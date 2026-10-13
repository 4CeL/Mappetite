# Mappetite: Checklist Persiapan

Daftar akun dan credential yang perlu disiapkan sebelum (atau sambil) mulai development. Centang kalau sudah selesai.

## 1. Akun yang perlu dibuat

- [ ] **GitHub** — tempat nyimpen kode, sumber auto-deploy ke Render & Vercel.
- [ ] **Supabase** (supabase.com) — database PostgreSQL. *Wajib untuk menjalankan aplikasi.*
- [ ] **Google Cloud Console** (console.cloud.google.com) — credential "Sign in with Google". *Opsional di awal; tanpa ini login email/password tetap jalan.*
- [ ] **Render** (render.com) — hosting backend Flask. Baru dibutuhkan waktu deploy, belum urgent.
- [ ] **Vercel** (vercel.com) — hosting frontend Next.js. Baru dibutuhkan waktu deploy, belum urgent.

## 2. Setup Supabase (database)

- [ ] Daftar/login ke supabase.com.
- [ ] Buat project baru, pilih region **Singapore** (latensi paling rendah dari Indonesia).
- [ ] Catat password database yang diminta waktu bikin project — **hanya muncul sekali**, simpan di tempat aman (password manager).
- [ ] Buka **Project Settings → Database → Connection string**, pilih mode **Transaction pooler** (port 6543).
- [ ] Simpan nilainya sebagai `DATABASE_URL`.

## 3. Setup Google OAuth (Sign in with Google)

- [ ] Buka console.cloud.google.com, buat project baru (misal "Mappetite").
- [ ] Buka **APIs & Services → OAuth consent screen** → pilih **External** → isi nama app → mode **Testing** (tidak perlu verifikasi Google selama masih development).
- [ ] Buka **Credentials → Create Credentials → OAuth client ID** → tipe **Web application**.
- [ ] Isi **Authorized JavaScript origins**: `http://localhost:3000` (nanti tambah URL Vercel setelah deploy).
- [ ] Simpan nilainya sebagai `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- [ ] Client Secret **tidak perlu** disimpan — login Google di Mappetite memverifikasi lewat ID token di frontend, bukan server-side OAuth code flow.

## 4. JWT Secret

- [ ] Generate string random sendiri (tidak perlu daftar ke mana-mana), minimal 32 byte / 64 karakter hex.
  ```powershell
  -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
  ```
- [ ] Simpan sebagai `JWT_SECRET`. **Jangan commit ke git.**

## 5. Yang TIDAK perlu disiapkan

- Google Maps API key — tidak dipakai. Peta pakai Leaflet + OpenStreetMap (gratis, tanpa API key).
- Google Places API — di luar lingkup MVP.
- Nominatim/OSM reverse geocoding — gratis, tanpa API key, cukup header `User-Agent` yang jelas.

## 6. Isi file `.env`

Template lengkap (dengan penjelasan tiap variabel) sudah ada:

- Backend: `mappetite-be/.env.example` → salin jadi `mappetite-be/.env`
- Frontend: `mappetite-fe/.env.example` → salin jadi `mappetite-fe/.env.local`

```powershell
Copy-Item mappetite-be\.env.example mappetite-be\.env
Copy-Item mappetite-fe\.env.example mappetite-fe\.env.local
```

Yang **wajib** diisi:

| File | Variabel | Isi |
|---|---|---|
| `mappetite-be/.env` | `DATABASE_URL` | Connection string Supabase (Transaction pooler, port 6543) |
| `mappetite-be/.env` | `JWT_SECRET` | Hasil generate random (min. 32 karakter) — backend menolak jalan kalau kosong |
| `mappetite-be/.env` | `GOOGLE_CLIENT_ID` | Client ID Google (boleh kosong dulu, login Google otomatis nonaktif) |
| `mappetite-fe/.env.local` | `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:5000` untuk lokal |
| `mappetite-fe/.env.local` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID yang sama (boleh kosong dulu, tombol Google disembunyikan) |

File `.env` / `.env.local` **tidak di-commit** ke git (sudah diatur di `.gitignore`). Yang di-commit hanya `.env.example`.

## 7. Siapkan database (sekali saja)

- [ ] Buka Supabase → **SQL Editor** → New query.
- [ ] Salin seluruh isi `mappetite-be/db/migrations/001_init.sql`, tempel, klik **Run**.
- [ ] Cek di **Table Editor**: ada tabel `users`, `places`, `saved_places`, `tags`, `saved_place_tags`, `geocode_cache`.

File migrasi aman dijalankan ulang (pakai `IF NOT EXISTS`). Migrasi ini juga mengaktifkan Row Level Security tanpa policy, supaya tabel tidak bisa diakses lewat REST API publik Supabase; backend tetap bisa akses karena terhubung sebagai pemilik tabel.

## 8. Menjalankan secara lokal

Buka dua terminal.

Terminal 1 — backend (Flask, port 5000):
```powershell
cd mappetite-be
py -3.12 -m venv .venv            # sekali saja
.\.venv\Scripts\pip install -r requirements.txt   # sekali saja
.\.venv\Scripts\python runapp.py
```
Cek: buka http://127.0.0.1:5000/api/health → harus `"status": "ok"`.

Terminal 2 — frontend (Next.js, port 3000):
```powershell
cd mappetite-fe
npm install                        # sekali saja
npm run dev
```
Buka http://localhost:3000 → daftar akun → tambah restoran dari link Google Maps.

Perintah lain yang berguna:
```powershell
cd mappetite-be; .\.venv\Scripts\python -m pytest   # test backend (parser link + validasi API)
cd mappetite-fe; npm run lint                        # cek kode frontend
cd mappetite-fe; npm run build                       # build static ke folder out/
```

## 9. Checklist deploy (nanti, setelah development selesai)

Backend di **Render** (Free Web Service):
- [ ] New → Web Service → hubungkan repo GitHub, **Root Directory**: `mappetite-be`.
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `gunicorn wsgi:app --bind 0.0.0.0:$PORT`
- [ ] Health check path: `/api/health`
- [ ] Environment variables: semua dari `.env`, plus `TRUST_PROXY_HOPS=1` dan `CORS_ORIGINS=https://<url-vercel-kamu>`.

Frontend di **Vercel**:
- [ ] Import repo, **Root Directory**: `mappetite-fe` (framework Next.js terdeteksi otomatis).
- [ ] Environment variables: `NEXT_PUBLIC_API_URL=https://<url-render-kamu>` dan `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- [ ] Untuk tile peta production, ganti `NEXT_PUBLIC_MAP_TILE_URL` + `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` ke provider dengan free tier (CARTO / MapTiler / Stadia). Server tile OpenStreetMap hanya untuk development.

Setelah keduanya online:
- [ ] Google Cloud Console → **Authorized JavaScript origins**: tambahkan URL Vercel.
- [ ] Pastikan `CORS_ORIGINS` di Render berisi URL Vercel (tanpa `/` di akhir).

## Ringkasan: yang perlu kamu lakukan sekarang

1. Daftar Supabase, buat project, catat `DATABASE_URL` (bagian 2).
2. Buat OAuth Client ID di Google Cloud, catat Client ID-nya (bagian 3) — opsional untuk mulai.
3. Generate `JWT_SECRET` (bagian 4).
4. Salin `.env.example` → `.env` / `.env.local` dan isi nilainya (bagian 6).
5. Jalankan `001_init.sql` di Supabase SQL Editor (bagian 7).
6. Jalankan backend + frontend (bagian 8), lalu coba tempel link Google Maps asli.

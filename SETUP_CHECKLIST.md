# Mappetite: Checklist Persiapan

Daftar akun dan credential yang perlu disiapkan sebelum (atau sambil) mulai development. Centang kalau sudah selesai.

## 1. Akun yang perlu dibuat

- [ ] **GitHub** — tempat nyimpen kode, sumber auto-deploy ke Render & Vercel.
- [ ] **Supabase** (supabase.com) — database PostgreSQL. *Wajib sebelum mulai coding backend.*
- [ ] **Google Cloud Console** (console.cloud.google.com) — credential "Sign in with Google". *Wajib sebelum mulai coding backend.*
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

## 6. Gambaran isi `.env` nanti

Backend (`mappetite-be/.env`):
```
DATABASE_URL=postgresql://postgres.xxxxx:<password>@aws-0-xx.pooler.supabase.com:6543/postgres
JWT_SECRET=<hasil generate random, 64 karakter hex>
JWT_ALGORITHM=HS256
GOOGLE_CLIENT_ID=<client id dari Google Cloud Console>
PORT=5000
```

Frontend (`mappetite-fe/.env.local`):
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id yang sama>
```

File `.env` / `.env.local` **tidak di-commit** ke git. Yang di-commit hanya `.env.example` (tanpa isi asli).

## 7. Checklist deploy (nanti, setelah development selesai)

- [ ] Buat akun Render, deploy `mappetite-be` sebagai Free Web Service.
- [ ] Set environment variables di Render (sama isinya dengan `.env` lokal).
- [ ] Buat akun Vercel, deploy `mappetite-fe`.
- [ ] Set environment variables di Vercel (`NEXT_PUBLIC_API_URL` diarahkan ke URL Render, bukan localhost).
- [ ] Update **Authorized JavaScript origins** di Google Cloud Console, tambahkan URL Vercel production.
- [ ] Update CORS allowed origin di backend Flask, tambahkan URL Vercel production.

## Ringkasan: yang perlu kamu lakukan sekarang

1. Daftar Supabase, buat project, catat `DATABASE_URL`.
2. Daftar/pakai akun Google Cloud, buat OAuth Client ID, catat Client ID-nya.
3. Setelah dua hal di atas siap, project siap di-scaffold (struktur folder `mappetite-be` dan `mappetite-fe`, file `.env.example`, dst).

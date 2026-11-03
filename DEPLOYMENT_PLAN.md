# Rencana Deploy Mappetite: backend di laptop rumah, frontend di Vercel

Status: rencana. Belum ada yang dijalankan. Angka waktu dan biaya adalah perkiraan kasar.

## 1. Gambaran akhir

```
Browser / HP ──HTTPS──> Vercel                         (frontend statis, folder mappetite-fe/out)
     │
     ├──HTTPS──> https://<laptop>.<tailnet>.ts.net     (sekarang: Tailscale Funnel)
     │           https://api.<domain-kamu>             (nanti, setelah beli domain: Cloudflare Tunnel)
     │              └─> laptop rumah: gunicorn (127.0.0.1:5000) ─> Flask
     │                                   └──────> Supabase Postgres (database)
     │
     └──HTTPS──> Supabase Storage                       (foto, langsung dari browser; tidak lewat laptop)
```

Laptop hanya menjalankan Flask. Database dan foto tetap di Supabase, jadi kalau laptop mati atau rusak, data aman.

## 2. Keputusan yang sudah diambil

| # | Hal | Keputusan | Akibat pada rencana |
|---|---|---|---|
| 1 | Domain | Belum punya, mungkin beli nanti | Mulai dengan **Tailscale Funnel** (gratis, tanpa domain). Pindah ke **Cloudflare Tunnel** saat domain sudah ada (Fase 3b). Pindahnya hanya mengganti satu env di Vercel. |
| 2 | Laptop | Ubuntu sudah terpasang dan berjalan sebagai server | Fase 1 berubah dari "instal" menjadi "periksa ulang". |
| 3 | Pengguna | Anda dan beberapa teman | Registrasi tetap terbuka dulu, dengan catatan di bagian 11 dan 12. |
| 4 | Supabase | Dev dan produksi **digabung** dulu | Tes lokal menyentuh data yang sama dengan produksi. Aturan pakainya ada di bagian 11. |
| 5 | Jaringan | Wi-Fi, baterai aman | Ada langkah khusus Wi-Fi di Fase 1. Baterai berfungsi sebagai UPS kecil. |

## 3. Keputusan teknis dan alasannya

| Hal | Pilihan | Alasan |
|---|---|---|
| Akses dari internet | **Tunnel**, bukan port forwarding | Halaman Vercel memakai HTTPS, jadi browser menolak memanggil API `http://` (mixed content). Tunnel memberi HTTPS otomatis, tidak perlu IP publik, dan tetap jalan di belakang CGNAT atau IP dinamis. |
| Database | Tetap di Supabase | Tidak perlu mengurus backup dan listrik mati untuk data. Foto juga sudah di Supabase Storage. |
| Server | Gunicorn dijalankan systemd | Sudah ada `wsgi.py` dan `gunicorn` di `requirements.txt`. Systemd menjalankan ulang otomatis setelah crash atau reboot. |
| Frontend | Vercel Hobby, root directory `mappetite-fe` | Frontend adalah static export. Hobby gratis, tapi [hanya untuk pemakaian pribadi non-komersial](https://vercel.com/docs/plans/hobby). |
| Login | JWT di localStorage (sudah begitu) | Tidak ada cookie lintas domain, jadi tidak ada masalah SameSite antara Vercel dan API. |

### Tailscale Funnel (sekarang) dan Cloudflare Tunnel (nanti)

| | B. Tailscale Funnel (**dipakai sekarang**) | A. Cloudflare Tunnel (**setelah ada domain**) |
|---|---|---|
| Syarat | Tailscale v1.38.3+ di laptop, MagicDNS, sertifikat HTTPS tailnet, dan atribut `funnel` di policy tailnet. Perintah `tailscale funnel` menawarkan untuk mengaktifkan semuanya ([dokumentasi](https://tailscale.com/kb/1223/funnel)). | Domain yang DNS-nya di Cloudflare ([syarat dari Cloudflare](https://developers.cloudflare.com/tunnel/setup/)) |
| URL API | `https://<laptop>.<tailnet>.ts.net`. Hanya boleh memakai nama domain tailnet Anda. | `https://api.<domain-kamu>`, stabil dan bisa dipindah ke server lain |
| Port publik | Hanya 443, 8443, 10000 (cukup untuk API ini) | 443 |
| Batasan | Status beta. Ada batas bandwidth yang tidak bisa diatur. DNS publik bisa butuh sampai sekitar 10 menit untuk aktif. Tidak ada WAF. | Tidak ada batas yang relevan untuk API kecil ini |
| Biaya | Gratis | Domain (cek harga registrar; `.my.id` / `.web.id` biasanya lebih murah dari `.com`) |

Port forwarding + DDNS + Caddy tidak dipilih: butuh IP publik (banyak ISP memakai CGNAT, perlu dicek), membuka port di router, dan mengurus sertifikat sendiri.

Domain hanya dibutuhkan untuk alamat API. Frontend boleh tetap di `*.vercel.app`.

## 4. Fase 1: Periksa laptop server yang sudah ada (perkiraan 1 jam)

Ubuntu sudah jalan, jadi ini daftar periksa, bukan instalasi.

- [ ] **Wi-Fi stabil dan IP tetap:**
  - Buat DHCP reservation di router berdasarkan MAC laptop, supaya IP LAN tidak berubah (dibutuhkan untuk SSH dari jaringan rumah).
  - Matikan Wi-Fi power saving, karena mode hemat daya membuat latensi naik dan koneksi sesekali putus. Cek dengan `iw dev <wlan> get power_save`. Cara mematikannya tergantung konfigurasi (netplan atau NetworkManager).
  - Taruh laptop dekat router. Kalau Wi-Fi ternyata sering putus, adaptor USB-LAN atau powerline adalah upgrade murah.
- [ ] **Tidak tidur:** `HandleLidSwitch=ignore` di `/etc/systemd/logind.conf`, dan `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`.
- [ ] **Listrik padam:** cek opsi BIOS "power on after AC loss" / "wake on AC". Kalau tidak ada, laptop tetap mati setelah baterai habis sampai ditekan manual. Kalau laptop mendukung, batasi pengisian baterai (mis. 60–80% lewat TLP) supaya awet saat selalu tercolok.
- [ ] **Jam sinkron:** `timedatectl` harus menunjukkan `System clock synchronized: yes`. JWT memakai waktu kedaluwarsa, jadi jam yang melenceng membuat login gagal.
- [ ] **Keamanan dasar:**
  - SSH hanya dengan key, tanpa login root dan password.
  - `ufw`: tolak semua masuk. Funnel membuat koneksi keluar, jadi tidak ada port yang perlu dibuka dari internet. SSH cukup dari jaringan rumah atau lewat Tailscale.
  - `unattended-upgrades` aktif.
  - Disk tidak dienkripsi supaya laptop bisa boot sendiri. Konsekuensinya `.env` terbaca kalau laptop dicuri, jadi batasi akses fisik.
- [ ] **Port bebas:** pastikan tidak ada layanan lain di laptop yang memakai port 5000, dan tidak ada yang memakai 443 pada alamat Tailscale, karena Funnel memakai port itu.
- [ ] Taruh di tempat berventilasi dan bersihkan debu.

## 5. Fase 2: Jalankan backend sebagai service (perkiraan 1–2 jam)

- [ ] Buat user khusus tanpa sudo, mis. `mappetite`. Clone repo ke `/opt/mappetite` dan buat venv di `mappetite-be`:
  `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- [ ] Buat `/opt/mappetite/mappetite-be/.env` untuk produksi, dengan `chmod 600`, pemilik `mappetite`:

  | Variabel | Nilai produksi |
  |---|---|
  | `DATABASE_URL` | Sama seperti sekarang (Supabase pooler). Dev dan produksi memakai database yang sama (keputusan #4). |
  | `JWT_SECRET` | **Baru**, acak minimal 32 karakter. Jangan sama dengan dev. |
  | `CORS_ORIGINS` | URL Vercel produksi (dan domain frontend kalau ada), **tanpa `/` di akhir** |
  | `TRUST_PROXY_HOPS` | `0` selama memakai Funnel. Naik ke `1` saat pindah ke Cloudflare. Lihat catatan di Fase 3. |
  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PHOTO_BUCKET` | Sama seperti dev (untuk foto) |
  | `DB_POOL_MAX` | `4` |
  | `HOST` | Tidak dipakai di produksi (hanya untuk `runapp.py`) |

- [ ] Buat service systemd `/etc/systemd/system/mappetite.service`:

  ```ini
  [Unit]
  Description=Mappetite API
  After=network-online.target
  Wants=network-online.target

  [Service]
  User=mappetite
  WorkingDirectory=/opt/mappetite/mappetite-be
  ExecStart=/opt/mappetite/mappetite-be/.venv/bin/gunicorn wsgi:app --bind 127.0.0.1:5000 --workers 1 --threads 8 --timeout 30
  Restart=always
  RestartSec=3

  [Install]
  WantedBy=multi-user.target
  ```

  Satu worker dengan banyak thread sudah cukup untuk pemakaian pribadi. Pool database dan rate limiter (`memory://`) hanya ada satu, jadi batasnya akurat. Backend juga memanggil layanan luar (resolve link Maps, Nominatim, Supabase Storage), dan thread menangani itu tanpa memblokir request lain.
- [ ] `sudo systemctl enable --now mappetite`, lalu uji dari laptop: `curl http://127.0.0.1:5000/api/health`.

## 6. Fase 3: Akses publik lewat Tailscale Funnel (perkiraan 30–60 menit)

- [ ] Pastikan Tailscale terpasang dan sudah login di laptop (`tailscale status`). Opsional: ganti nama mesin di admin console Tailscale agar URL lebih rapi, karena nama itu menjadi bagian dari URL publik.
- [ ] Jalankan `sudo tailscale funnel --bg 5000`. Perintah ini membuka halaman persetujuan untuk mengaktifkan Funnel, sertifikat HTTPS, dan atribut `funnel` di policy tailnet. Setelah disetujui, URL `https://<laptop>.<tailnet>.ts.net` ditampilkan.
- [ ] Tunggu DNS aktif (bisa sampai sekitar 10 menit), lalu uji dari HP dengan **data seluler** (bukan Wi-Fi rumah): `https://<laptop>.<tailnet>.ts.net/api/health` harus mengembalikan `{"status":"ok"}`.
- [ ] Funnel tetap aktif setelah reboot. Verifikasi di Fase 9 (uji no. 3).
- [ ] **IP klien dan rate limiter (perlu diverifikasi, jangan diasumsikan):**
  - Dengan `TRUST_PROXY_HOPS=1`, Flask memercayai entri terakhir `X-Forwarded-For`. Kalau Funnel tidak menambahkan header itu, penyerang bisa memalsukannya sendiri dan melewati rate limit. Karena itu mulai dengan `0`.
  - Dengan `0`, semua klien mungkin terlihat berasal dari satu alamat (`127.0.0.1`), sehingga rate limit dibagi bersama. Untuk Anda dan beberapa teman ini bisa diterima, tapi satu orang yang terlalu sering bisa membuat yang lain terkena batas.
  - Cara cek: jalankan gunicorn sementara dengan `--access-logfile -` dan `--access-logformat '%({x-forwarded-for}i)s %(r)s %(s)s'`, lalu lihat header yang benar-benar diterima dari HP dan dari `curl -H 'X-Forwarded-For: 1.2.3.4'`. Dokumentasi Funnel juga menyebut dukungan PROXY protocol, yang bisa dipakai kalau header tidak tersedia, tapi itu butuh perubahan di sisi server dan belum dievaluasi.

## 7. Fase 3b: Pindah ke Cloudflare Tunnel (nanti, saat sudah punya domain)

Urutan ini tidak menghentikan layanan, karena Funnel tetap hidup sampai langkah terakhir.

- [ ] Beli domain, lalu tambahkan ke Cloudflare (ganti nameserver di registrar).
- [ ] Cloudflare Zero Trust → Networks → Tunnels → buat tunnel baru. Instal `cloudflared` di laptop dengan perintah dari dashboard (`cloudflared service install <token>`), supaya jalan sebagai service dan hidup lagi setelah reboot.
- [ ] Tambah public hostname `api.<domain-kamu>` → `http://127.0.0.1:5000`. Aktifkan "Always Use HTTPS". Opsional: aturan rate limiting dan managed WAF rules yang gratis.
- [ ] Uji `https://api.<domain-kamu>/api/health` dari data seluler.
- [ ] Di Vercel, ubah `NEXT_PUBLIC_API_URL` ke `https://api.<domain-kamu>` dan **redeploy** (nilainya ditanam saat build).
- [ ] Ubah `TRUST_PROXY_HOPS=1` di laptop dan restart service. Cloudflare menambahkan IP klien ke `X-Forwarded-For`, jadi nilai 1 benar di sini. Verifikasi dengan cara yang sama seperti Fase 3.
- [ ] `CORS_ORIGINS` tidak perlu berubah, karena yang dicek adalah origin frontend, bukan alamat API. Kalau frontend juga dipindah ke domain sendiri, tambahkan domain itu.
- [ ] Setelah semua teman memakai versi baru dan monitoring hijau beberapa hari, matikan Funnel (lihat perintah reset/disable di [dokumentasi Funnel](https://tailscale.com/kb/1223/funnel)).

## 8. Fase 4: Frontend di Vercel (perkiraan 30 menit)

- [ ] Sebelum push: hapus `allowedDevOrigins` (berisi IP pribadi) dari `mappetite-fe/next.config.mjs`. `.env.local` sudah di-ignore git.
- [ ] Vercel → New Project → import repo `4CeL/Mappetite` → **Root Directory: `mappetite-fe`**. Framework Next.js terdeteksi otomatis. Pastikan Node.js 20 atau lebih baru di Project Settings.
- [ ] Environment Variables (Production):
  - `NEXT_PUBLIC_API_URL=https://<laptop>.<tailnet>.ts.net` (tanpa `/` di akhir)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (kosongkan kalau login Google belum dipakai)
- [ ] Nilai `NEXT_PUBLIC_*` ditanam saat build. Kalau URL API berubah, perlu redeploy.
- [ ] Deploy. Catat URL Vercel (`https://<nama>.vercel.app`).
- [ ] Deployment preview Vercel punya URL berbeda tiap branch dan akan ditolak CORS. Pakai hanya URL produksi untuk uji nyata.

## 9. Fase 5: Sambungkan semuanya (perkiraan 30 menit)

- [ ] Isi `CORS_ORIGINS` di laptop dengan URL Vercel final, lalu `sudo systemctl restart mappetite`.
- [ ] Kalau login Google dipakai: tambahkan URL Vercel ke *Authorized JavaScript origins* di Google Cloud Console.
- [ ] Bucket foto: tidak ada yang berubah, karena browser memakai URL publik Supabase langsung.

### Uji sebelum dianggap live

1. Dari HP lewat data seluler: buka URL Vercel, daftar atau login, tambah restoran, edit, upload foto, hapus.
2. Preflight CORS dari origin Vercel lolos, dan origin asing ditolak.
3. Reboot laptop: `mappetite` dan Funnel naik sendiri tanpa login SSH.
4. Matikan Wi-Fi laptop sebentar: frontend menampilkan pesan error yang wajar, lalu pulih sendiri saat Wi-Fi kembali.
5. Matikan service: monitoring mengirim notifikasi.
6. Login masih jalan setelah beberapa hari (cek jam laptop).

## 10. Fase 6: Operasional

- **Monitoring:** UptimeRobot atau Better Stack (gratis) memeriksa `https://<laptop>.<tailnet>.ts.net/api/health` tiap 5 menit, notifikasi ke email atau Telegram. Endpoint ini tidak menyentuh database, jadi yang dipantau laptop + Wi-Fi + Funnel, bukan Supabase. Dengan Wi-Fi, monitoring ini juga yang memberi tahu kalau koneksi sering putus.
- **Supabase gratis [dijeda otomatis](https://supabase.com/docs/guides/platform/free-project-pausing) kalau aktivitas database seminggu terlalu sedikit.** Pemakaian harian biasanya cukup. Sebagai pengaman, buat timer systemd harian yang menjalankan `select 1`.
- **Backup:** `pg_dump` mingguan dari laptop, simpan di disk dan satu salinan di tempat lain. Karena dev dan produksi digabung, ambil dump juga **sebelum menjalankan migrasi baru**. Isi bucket foto tidak ikut `pg_dump`.
- **Update aplikasi:** `git pull && .venv/bin/pip install -r requirements.txt && sudo systemctl restart mappetite`. Migrasi SQL baru dijalankan manual di Supabase **sebelum** kode yang membutuhkannya di-deploy (sesuai konvensi proyek).
- **Log:** `journalctl -u mappetite`; batasi ukuran jurnal (`SystemMaxUse`).
- **Rotasi:** kalau `SUPABASE_SERVICE_ROLE_KEY` atau `JWT_SECRET` pernah bocor, ganti dan restart service. Mengganti `JWT_SECRET` membuat semua user login ulang.

## 11. Risiko, aturan pakai, dan biaya

| Risiko | Dampak | Penanganan |
|---|---|---|
| Listrik atau internet rumah mati | API tidak bisa diakses, data aman | Baterai laptop, monitoring, rollback ke Render |
| Wi-Fi sering putus | API sering tidak terjangkau | Matikan power saving, dekat router, adaptor USB-LAN bila perlu, pantau lewat monitoring |
| ISP mengganti IP atau memakai CGNAT | Tidak berpengaruh | Funnel dan Cloudflare Tunnel membuat koneksi keluar |
| Funnel masih beta dengan batas bandwidth tetap | Bisa lambat atau berubah di masa depan | Cukup untuk API JSON kecil (foto tidak lewat Funnel). Siapkan Fase 3b dan Render sebagai cadangan. |
| Nama tailnet ikut terlihat di URL API | Nama mesin dan tailnet publik | Ganti nama mesin menjadi netral |
| Laptop dicuri atau disusupi | Service role key dan `.env` terbaca | Akses fisik terbatas, rotasi key bila perlu, SSH key-only |
| Registrasi terbuka untuk siapa saja | Siapa pun yang tahu URL bisa membuat akun | URL tidak diumumkan. Setelah teman-teman mendaftar, sebaiknya registrasi ditutup (bagian 12). |
| **Dev dan produksi memakai Supabase yang sama** | Tes lokal bisa mengubah atau menghapus data teman | Aturan: tidak menjalankan skrip hapus/tes massal ke database ini; akun uji pakai email `zz*@example.invalid` dan dibersihkan sesudahnya; dump sebelum migrasi. Pisahkan proyek Supabase begitu pengguna bertambah (plan gratis boleh 2 proyek aktif). |
| Supabase gratis dijeda | API error sampai di-resume (data tetap aman sampai 1 tahun) | Timer `select 1`, notifikasi email Supabase |
| Kuota Supabase gratis (500 MB DB, 1 GB Storage, 5 GB egress) | Foto atau akses terblokir bila terlewat | Foto sudah dikompres, pantau di dashboard |

Biaya perkiraan: Vercel Hobby, Supabase, dan Tailscale Funnel gratis. Domain baru dibutuhkan saat pindah ke Cloudflare Tunnel (biaya tahunan sesuai registrar). Listrik laptop idle sekitar 10–20 W atau 7–15 kWh per bulan, jadi hitung dengan tarif listrik Anda.

## 12. Rollback dan perubahan kode

**Rollback:** backend sudah siap untuk Render (rencana awal di PRD): gunicorn `wsgi:app`, env yang sama. Kalau laptop bermasalah, deploy ke Render free, ganti `NEXT_PUBLIC_API_URL` di Vercel, redeploy. Render free tertidur saat tidak dipakai, jadi request pertama setelah lama diam bisa memakan waktu sekitar satu menit.

**Perubahan kode:** tidak ada yang wajib untuk deploy ini. Hal opsional, dikerjakan hanya jika diminta:
- **Menutup registrasi** lewat env flag, setelah teman-teman punya akun. Ini yang paling saya sarankan sebelum URL dibagikan lebih luas.
- Health check yang ikut mengetes koneksi database.
- Folder `deploy/` di repo berisi contoh unit systemd dan skrip update.

## 13. Pertanyaan yang tersisa

1. Apakah Tailscale sudah terpasang dan login di laptop server, dan versi berapa? Funnel butuh v1.38.3 atau lebih baru.
2. Apakah ada layanan lain di laptop itu yang memakai port 443 atau 5000?
3. Setuju registrasi ditutup lewat env flag setelah teman-teman mendaftar? Kalau ya, itu perubahan kode kecil yang bisa saya kerjakan terpisah.
4. Kira-kira kapan domain akan dibeli? Ini menentukan kapan Fase 3b dikerjakan.

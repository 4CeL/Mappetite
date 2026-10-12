# Mappetite: Design Guide (v0.2)

Mockup ada di folder `design/`:

| File | Isi |
|---|---|
| `design/logo-mappetite.png` | Logo resmi: pin hijau berisi sendok-garpu, bentuk peta sage, aksen oranye, di atas background krem |
| `design/01-desktop-peta.svg` | Beranda desktop: list di kiri, peta di kanan, popup detail marker |
| `design/02-desktop-tambah-restoran.svg` | Modal Tambah Restoran (paste link → preview → simpan) |
| `design/03-mobile.svg` | Mobile: Peta + bottom sheet, Daftar, Detail restoran |

Ketiga mockup SVG sudah di-restyle memakai palet dari logo (bagian 2). Satu perubahan dari draft sebelumnya: status "Sudah dikunjungi" sekarang dibedakan dengan warna **oranye** (bukan hijau), karena hijau sudah dipakai sebagai warna utama/brand. Jadi di peta: pin hijau olive = "Ingin dikunjungi", pin oranye dengan centang = "Sudah dikunjungi".

## 1. Konsep

Gaya visualnya terang, bersih, dan berpusat pada peta, mengikuti referensi yang kamu kirim. Ada beberapa penyesuaian:

| Di referensi | Di Mappetite | Alasan |
|---|---|---|
| Kategori di header (Restaurant, Coffee Shop, Gas Station…) | Header hanya berisi Peta / Daftar. Kategori dipindah jadi chip filter. | Mappetite khusus untuk tempat makan. |
| Foto restoran di kartu | Thumbnail ilustrasi sesuai kategori (kopi, ramen, sate…) | Versi gratis tidak mengambil foto dari Google. Foto upload sendiri menyusul (P2). |
| Take away / Dine-in | Status (Ingin / Sudah), tag, dan kisaran harga | Sesuai data yang memang kita simpan. |
| Lingkaran radius | Titik "lokasi saya" dengan halo tipis | Filter radius baru ada di P2. |
| Label nama di marker | Tetap dipakai. Marker yang dipilih membuka popup detail. | Sesuai fitur F3. |

## 2. Design Tokens (final, sesuai logo)

Diambil dari sampling warna langsung di `logo-mappetite.png`, lalu diturunkan jadi skala tint/shade untuk kebutuhan UI.

| Token | Hex | Pemakaian |
|---|---|---|
| `brand-orange` | `#EE8052` | Ikon pin di logo/header, badge & marker "Sudah dikunjungi", aksen |
| `primary-700` | `#5D6C4B` | Tombol utama, marker "Ingin dikunjungi", nav aktif, fokus |
| `primary-800` | `#3F4A32` | Teks/link di atas tint hijau, hover state tombol |
| `primary-50` | `#E7ECDF` | Background badge/chip "Ingin", nav aktif (tint) |
| `visited-700` | `#9A4A26` | Teks badge "Sudah dikunjungi" |
| `visited-50` | `#FBE7DB` | Background badge "Sudah dikunjungi" (tint) |
| `warning-50` / `warning-700` | `#FFF7E6` / `#9A5B00` | Peringatan duplikat |
| `danger-600` | `#D92D20` | Error, hapus |
| `star` | `#F5A524` | Ikon bintang rating (bukan teks) |
| `ink-900` | `#293220` | Judul, teks utama (sama dengan teks wordmark logo) |
| `ink-700` / `ink-600` | `#3F4A32` / `#5B6B51` | Label, teks sekunder |
| `ink-500` | `#5F6D54` | Teks bantu, placeholder |
| `line` | `#E4E0D3` | Border, divider |
| `bg` | `#FAF6EC` | Latar halaman (sama dengan background logo) |
| `surface` | `#FFFFFF` | Kartu, modal, popup |
| `chip-neutral` | `#F1EFE4` | Chip/tag netral |

Catatan desain:
- Status "Ingin dikunjungi" dan "Sudah dikunjungi" dibedakan dengan warna **dan** ikon berbeda (titik putih vs tanda centang di pin), bukan warna saja — penting untuk aksesibilitas (lihat bagian 7).
- Tile peta (jalan abu-abu, area hijau mint, air biru muda) sengaja dibiarkan netral/realistis, tidak diubah ke warna brand, supaya peta tetap mudah dibaca.
- Rasio kontras yang sudah dicek manual: putih di atas `primary-700` sekitar 5,2:1; `visited-700` di atas `visited-50` sekitar 5,1:1; `ink-500` di atas `bg` sekitar 5,6:1. Semuanya lolos WCAG AA untuk teks normal, tapi pengecekan final tetap perlu tool kontras dan uji manual.

### Tipografi

Font: Plus Jakarta Sans via `next/font/google`, weight 400, 500, 600, 700, 800. Ini menggantikan Lexend di SmartHub supaya Mappetite punya identitas sendiri. Kalau mau tetap Lexend, tinggal ganti satu baris.

| Peran | Ukuran / weight |
|---|---|
| Judul halaman | 26px / 700 (mobile 22px) |
| Judul kartu & popup | 16px / 700 (mobile 14px) |
| Body / input | 14px / 400 |
| Label form | 12px / 700 |
| Teks bantu, badge | 11–12px / 400–700 |

### Bentuk & spasi

- Grid spasi kelipatan 4px. Padding kartu 12–16px, jarak antar kartu 12px.
- Radius: chip/badge pill penuh, input dan tombol 10–12px, kartu 14–16px, modal dan panel peta 20px, bottom sheet 24px.
- Shadow: `sm` untuk kartu (0 4 14 / 8%), `lg` untuk popup dan modal (0 10 28 / 16%).
- Target sentuh minimal 44×44px di mobile.

## 3. Komponen Utama

- Marker:
  - Ingin dikunjungi: pin biru dengan titik putih.
  - Sudah dikunjungi: pin hijau dengan tanda centang.
  - Bentuk ikonnya berbeda, jadi status tidak dibedakan oleh warna saja.
  - Marker terpilih diperbesar 1,3× dan membuka popup.
  - Marker yang berdekatan digabung jadi cluster (lingkaran biru berisi angka).
- Popup marker: nama, alamat, badge status, rating, harga, potongan catatan, tombol "Lihat detail" dan "Rute di Maps ↗".
- Kartu restoran: thumbnail kategori, nama, area, jarak (kalau izin lokasi diberikan), rating (khusus yang sudah dikunjungi), tag, dan badge status. Kartu yang terpilih diberi border biru dan tersinkron dengan marker di peta.
- Search + tombol filter: filter lengkap (tag, harga, rating) dibuka di panel samping (desktop) atau bottom sheet (mobile).
- Segmented control status: Semua / Ingin / Sudah, dengan jumlah per status.
- Chip filter cepat: rating 4+, Terdekat, tag yang paling sering dipakai.
- Toggle bahasa ID | EN: di header desktop, dan di Profil/header di mobile.
- Form tambah restoran:
  - Input link dan tombol "Ambil Data", lalu pesan sukses atau gagal.
  - Mini-map dengan pin yang bisa digeser.
  - Field nama dan alamat, status, harga, tag (dengan saran), catatan.
- Bottom nav (mobile): Peta, Daftar, Tambah (tombol bulat biru), Profil.

## 4. Layout per Ukuran Layar

| Lebar | Layout |
|---|---|
| < 768px | Peta layar penuh, search dan chip mengambang di atas, bottom sheet untuk restoran terpilih, bottom nav. Daftar dan detail jadi halaman terpisah. Tambah restoran tampil full-screen. |
| 768–1023px | Seperti mobile, tapi bottom sheet lebih lebar dan list bisa dibuka sebagai panel samping. |
| ≥ 1024px | Header navigasi. Kolom list 420px di kiri, peta di kanan. Tambah restoran tampil sebagai modal. |

## 5. State yang Perlu Didesain Saat Implementasi

- Kosong: belum ada restoran. Tampilkan ilustrasi dan CTA "Tempel link Google Maps pertamamu".
- Loading: skeleton kartu dan spinner di tombol "Ambil Data".
- Link gagal diproses: "Link tidak dikenali. Pastikan link dari Google Maps, atau isi manual." dengan tombol "Isi manual".
- Duplikat: banner kuning "Restoran ini sudah ada di daftarmu" dengan tombol "Lihat" atau "Tetap simpan".
- Izin lokasi ditolak: jarak disembunyikan dan chip "Terdekat" dinonaktifkan dengan keterangan.
- Hasil filter kosong: "Tidak ada restoran yang cocok" dengan tombol reset filter.

## 6. Bahasa (ID / EN)

- Semua teks UI diambil dari kamus `id` / `en`, tidak ada teks hardcode.
- Angka, jarak, dan tanggal diformat dengan `Intl` sesuai bahasa: `2,7 km` / `12 September 2026` (ID) dan `2.7 km` / `September 12, 2026` (EN).
- Teks bahasa Inggris dan Indonesia bisa beda panjang. Tombol dan badge dibuat fleksibel (padding, bukan lebar tetap).

## 7. Aksesibilitas

- Peta selalu punya alternatif berupa halaman Daftar, karena peta sulit dipakai dengan pembaca layar.
- Marker bisa difokus pakai keyboard dan punya `aria-label` ("Ramen Hokkori, sudah dikunjungi").
- Fokus ring terlihat jelas: outline `primary-600` 2px dengan halo 3px.
- Semua input punya label yang terlihat, dan status tidak hanya ditandai warna.
- Validasi penuh tetap butuh pengujian manual dengan screen reader dan review aksesibilitas.

## 8. Nanti (di luar MVP)

Dark mode (P3), ilustrasi empty state, dan foto restoran hasil upload (P2).

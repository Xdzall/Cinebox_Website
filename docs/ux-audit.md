# Audit singkat Cinebox dan referensi IDLIX

Inspeksi dilakukan pada beranda, detail film, pemutar film, detail serial, dan episode di `https://z2.idlixku.com/`, serta alur pemutar Cinebox lokal. Tangkapan layar diperiksa di browser selama audit, tetapi alat browser yang tersedia tidak menyediakan penyimpanan screenshot lokal; dokumen ini adalah catatan inspeksi, bukan arsip gambar.

## Temuan visual dan alur

| Langkah | Kondisi | Temuan |
| --- | --- | --- |
| Beranda referensi | Cukup baik | Hero lebar, metadata ringkas, tombol putar jelas, dan deretan poster membantu penelusuran. Banner iklan menarik perhatian dari konten utama. |
| Detail film referensi | Cukup baik | Backdrop, metadata, serta aksi utama tersusun jelas. |
| Player referensi | Bermasalah | Kontrol seek, volume, CC, unggah subtitle, dan pengaturan gaya subtitle tersedia, tetapi countdown dan iklan praputar menghambat mulai menonton. |
| Detail serial dan episode referensi | Cukup baik | Pilihan musim dan kartu episode bermetadata membantu memilih episode. Player film dan episode memakai kontrol subtitle yang sama. |
| Pemutar Cinebox sebelum perbaikan | Bermasalah | URL server digandakan di frontend/API, label “Sub Indo” berlaku untuk semua server tanpa verifikasi, tautan API subtitle tidak tersedia, dan popup episode berikutnya muncul dari timer tetap. |
| Navigasi Cinebox sebelum perbaikan | Perlu perbaikan | Status aktif hanya berubah warna; tidak ada perpindahan indikator dan animasi masuk konten. |

## Perubahan yang diterapkan

- Konfigurasi server dipusatkan di `lib/stream-servers.ts`; film dan episode memakai pilihan server serta pesan subtitle yang sama.
- Ketersediaan subtitle dijelaskan per penyedia. Tombol CC tetap berada di dalam iframe penyedia; Cinebox tidak dapat mengendalikannya secara lintas origin.
- Popup rekomendasi/episode berbasis timer dihapus. Tombol episode berikutnya hanya muncul saat daftar episode benar-benar memuat episode tersebut.
- Indikator aktif desktop bergeser mengikuti item navbar, navigasi mobile mendapat tanda aktif, dan konten baru masuk dengan transisi singkat. Preferensi reduced motion dihormati.
- `browser-extension/` menyediakan ekstensi opsional untuk mengurangi popup dari frame penyedia dan memblokir domain redirect yang dimasukkan pengguna.

## Batas yang masih berlaku

Pemutar lintas origin tidak memberi akses tepercaya ke track subtitle, waktu pemutaran, akhir video, atau redirect yang terjadi di dalam iframe. Penyedia utama juga menolak iframe dengan atribut `sandbox`, sehingga Cinebox memakai iframe tanpa sandbox. Ekstensi belum diuji secara langsung setelah **Load unpacked** di Chrome/Edge dan tidak menjamin video bebas iklan. Pemeriksaan aksesibilitas lengkap memerlukan pengujian keyboard dan pembaca layar terpisah.

## Refactor responsif (15 Oktober 2026)

`app/page.tsx` dipecah menjadi komponen di `components/`, dan `app/globals.css` ditulis ulang dengan breakpoint desktop (≥1200px), tablet (769–1199px), dan mobile (≤768px). Masalah yang diperbaiki:

- Navbar tetap transparan saat halaman di-scroll sehingga konten menimpa menu; kini menjadi solid setelah scroll.
- Tombol **Cari** di navigasi bawah tidak berfungsi karena kolom pencarian disembunyikan di mobile; kini membuka bilah pencarian penuh.
- Menu drawer tidak memuat **Terbaru & Populer**; tablet tidak punya akses ke menu karena link desktop terpotong.
- Tombol hero, tombol suara, dan indikator slide saling bertumpuk di mobile.
- Poster Top 10 terdistorsi (rasio tetap tinggi), dan aksi hover kartu Top 10 tidak pernah tampil.
- Panah slider tak terlihat tetapi tetap menangkap ketukan di tepi baris pada perangkat sentuh.
- Skeleton loading bertinggi 0 sehingga tidak terlihat.
- Pintasan **M**/**F** ikut terpicu saat mengetik di kolom pencarian; hasil pencarian lama dapat menimpa hasil baru.
- Modal: tiga pemberitahuan iklan menumpuk di bawah pemutar, rekomendasi tidak menggulir ke atas modal, dan kontrol episode menimpa kontrol pemutar penyedia. Kini server dipilih lewat chip, episode lewat tombol sebelumnya/berikutnya di bawah pemutar, dan pemutar tetap terlihat (sticky) saat menggulir di mobile.
- Daftar episode memakai judul dan thumbnail asli dari Cinemeta.

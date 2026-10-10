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

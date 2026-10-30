# Cinebox Web

Antarmuka katalog film dan serial dengan pemutar dari penyedia pihak ketiga. Proyek memakai Next.js 14, React 18, dan TypeScript.

Catatan inspeksi visual referensi IDLIX dan alur Cinebox tersedia di [`docs/ux-audit.md`](docs/ux-audit.md).

## Menjalankan proyek

```bash
npm ci
cp .env.example .env.local   # lalu isi akun login
npm run dev
```

Buka `http://localhost:3000`. Untuk memeriksa build produksi, jalankan `npm run build`.

## Login

Semua halaman dan API dilindungi login (`middleware.ts`). Tanpa sesi, halaman dialihkan ke `/login` dan API mengembalikan 401. Login tidak memakai database:

- **Akun** dibaca dari environment variable `CINEBOX_USERNAME`, `CINEBOX_PASSWORD`, dan `CINEBOX_AUTH_SECRET` (minimal 32 karakter). Jika salah satu kosong, tidak ada yang bisa login.
- **Sesi** disimpan di cookie `HttpOnly` yang ditandatangani HMAC dan berlaku 7 hari. Mengganti `CINEBOX_PASSWORD` otomatis mengeluarkan semua sesi.
- **Daftar Saya, Suka, dan riwayat tonton** tetap tersimpan di `localStorage` browser masing-masing.
- Lima kali gagal login dari IP yang sama dalam 15 menit akan diblokir sementara. Di Vercel, batas ini dihitung per instance serverless, jadi hanya perlambatan dasar, bukan perlindungan penuh.

**Lokal:** salin `.env.example` ke `.env.local`, lalu isi nilainya.

**Vercel:** buka Project → Settings → Environment Variables, tambahkan ketiga variabel untuk environment Production (dan Preview bila perlu), lalu lakukan **Redeploy**. Perubahan environment variable baru berlaku setelah deploy ulang.

## Pemutar, subtitle, dan server

Server disusun di `lib/stream-servers.ts` dan diambil lewat `/api/servers`, yang juga mencari ID TMDB lewat Cinemeta. Hasil pemeriksaan 15 Oktober 2026:

| Server | Status | Catatan |
| --- | --- | --- |
| VidAPI (`vaplayer.ru`) | Dipakai (server utama) | Meminta subtitle Indonesia (`ds_lang=id`). Wrapper memasang iklan popunder pada klik pertama. |
| VidLink | Dipakai | Hanya menerima ID TMDB; ID IMDb untuk episode menghasilkan HTTP 500. |
| 2Embed | Dipakai | Membuka tab iklan saat diklik. |
| MultiEmbed | Dipakai | Dialihkan ke `streamingnow.mov`, membuka tab iklan saat diklik. |
| VidSrc (`vidsrc.xyz`) | **Dihapus** | Domain tidak lagi dapat di-resolve (NXDOMAIN). |
| AutoEmbed (`autoembed.co`) | **Dihapus** | Episode menghasilkan 404; film memuat `player.autoembed.co`, pemutar VidAPI yang sama. |

### Iklan pada pemutar

Semua server (VidAPI, VidLink, 2Embed, MultiEmbed) membuka tab iklan "clickunder" saat pemutarnya diklik. Pada uji 15 Oktober 2026 di Chrome sungguhan, VidAPI dan VidLink sama-sama membuka situs judi 1xBet. Pemutarnya sendiri tidak menampilkan iklan di dalam video. Cara memblokirnya dari sisi situs sudah diuji dan tidak ada yang berhasil:

- **`sandbox` pada iframe:** VidAPI menampilkan "Playback blocked" (wrapper menulis `document.domain`, yang selalu gagal di iframe ber-sandbox).
- **Embed pemutar asli (`nextgencloudfabric.com`) langsung:** 404, karena pemutar hanya menerima `Referer` dari daftar domain tetap (misalnya `vaplayer.ru`, `vercel.com`), bukan domain situs biasa atau `*.vercel.app`.
- **`vidapi.xyz/embed`:** template lain dengan skrip iklan yang sama jenisnya.
- **Mencegat dari halaman Cinebox:** tab dibuka dari dalam iframe lintas origin, jadi halaman induk tidak bisa mencegahnya.
- VidAPI tidak menyediakan opsi bebas iklan.

Pemblokiran perlu dilakukan di browser penonton. Cinebox mendeteksi apakah ekstensi **Cinebox Player Guard** terpasang: jika ya, tampil "Player Guard terpasang" tanpa menjamin semua iklan terblokir; jika belum, tampil tombol unduh dan panduan pemasangan. Pengguna HP diarahkan ke Brave atau Firefox Android + uBlock Origin karena Chrome di HP tidak mendukung Player Guard.

### Subtitle

Hanya VidAPI yang meminta bahasa Indonesia. Semua subtitle dikelola pemutar penyedia, sehingga ketersediaannya tidak dapat dijamin.

## Ekstensi Cinebox Player Guard

Folder [`browser-extension`](browser-extension/README.md) berisi ekstensi Chrome/Edge (Manifest V3). Versi 1.2.0 langsung aktif setelah dipasang tanpa pengaturan: navigasi yang dimulai frame pemutar (pop-up dan redirect iklan) diblokir sebelum halaman iklan dimuat, lalu tab kosongnya ditutup.

- `npm run dev` dan `npm run build` otomatis mengemas folder itu menjadi `public/downloads/cinebox-player-guard.zip` (`scripts/pack-extension.mjs`). File zip tidak di-commit dan hanya bisa diunduh setelah login.
- `manifest.json` berisi `key` agar ID ekstensi selalu `hejbphhakjbiifnfchmojlkkdheibhjb`. Situs mendeteksi ekstensi dengan membaca `chrome-extension://<ID>/guard.json` (`lib/player-guard.ts`). Jangan ubah `key` tanpa memperbarui ID di file tersebut.

## Struktur penting

- `app/page.tsx`: state halaman dan navigasi.
- `components/`: `Navbar`, `MobileNav` (drawer + navigasi bawah), `Hero`, `MediaCards` (kartu, baris, grid), `WatchModal` (detail + pemutar), `PlayerGuide`.
- `app/api/catalog`, `search`, `tv/details`, `trailer`, `servers`: API Next.js.
- `lib/stream-servers.ts`: daftar server dan informasi subtitle. `lib/cinemeta.ts`: ID TMDB serta judul/thumbnail episode.
- `idlix_catalog.json`: cache katalog lokal. API dapat membacanya, tetapi tidak menimpanya saat melayani permintaan.
- `browser-extension/`: ekstensi opsional.

Kualitas stream, hak tayang, iklan dalam player, dan pilihan subtitle bergantung pada penyedia masing-masing.

## Perbaikan audit 30 Oktober 2026

Status per tahap dan bukti verifikasi tersedia di [`docs/fixes-2026-10-30/report.md`](docs/fixes-2026-10-30/report.md). Jalankan `npm run test:audit` untuk regresi identitas, migrasi penyimpanan, kategori, pencarian, episode, dan URL navigasi.

Halaman, genre, kata pencarian, dan filter jenis tersimpan dalam query URL sehingga refresh dan Back/Forward mempertahankan pilihan. Tahun serial menunjukkan tahun rilis pertama. Kategori Korea memakai negara utama produksi atau identitas curated; animasi serial tetap di kategori Animasi. Pemutar dan pilihan server tetap terlihat pada landscape pendek; fullscreen fallback tidak memindahkan atau mengganti iframe.

# Cinebox Web

Antarmuka katalog film dan serial dengan pemutar dari penyedia pihak ketiga. Proyek memakai Next.js 14, React 18, dan TypeScript.

Catatan inspeksi visual referensi IDLIX dan alur Cinebox tersedia di [`docs/ux-audit.md`](docs/ux-audit.md).

## Menjalankan proyek

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`. Untuk memeriksa build produksi, jalankan `npm run build`.

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

### Iklan VidAPI

`vaplayer.ru` hanya wrapper: halaman itu memuat skrip popunder (domain iklan dibuat acak, dipicu `mousedown`, dibatasi sekali per jam lewat `localStorage`) dan pelacak Histats, lalu meng-iframe pemutar asli di `nextgencloudfabric.com`. Tiga cara menghilangkannya dari sisi situs sudah diuji dan tidak bisa dipakai:

- **`sandbox` pada iframe:** wrapper menulis `document.domain`, yang selalu gagal di iframe ber-sandbox (bahkan dengan `allow-same-origin`), lalu pindah ke halaman penolakan.
- **Embed pemutar asli langsung:** `nextgencloudfabric.com` memeriksa `Referer` dan mengembalikan 404 untuk domain di luar daftar izinnya, termasuk `localhost` dan domain `*.vercel.app`.
- **Mencegat pop-up dari halaman induk:** pop-up dibuka dari dalam iframe lintas origin, sehingga halaman Cinebox tidak dapat mencegahnya.

Pemblokiran yang berhasil dilakukan di browser pengguna: ekstensi **Cinebox Player Guard** (di bawah) atau uBlock Origin/Brave. Ganti server bila pemutar kosong atau terus mengalihkan ke iklan; kegagalan iframe tidak bisa dideteksi otomatis.

### Subtitle

Hanya VidAPI yang meminta bahasa Indonesia. Semua subtitle dikelola pemutar penyedia, sehingga ketersediaannya tidak dapat dijamin.

## Ekstensi opsional

Folder [`browser-extension`](browser-extension/README.md) berisi **Cinebox Player Guard** untuk Chrome/Edge (Manifest V3). Versi 1.1.0 memblokir navigasi yang dimulai frame pemutar (pop-up dan redirect iklan) sebelum halaman iklan dimuat, lalu menutup tab kosongnya. Ekstensi dipasang lewat **Load unpacked**; situs tidak bisa memasangnya otomatis.

## Struktur penting

- `app/page.tsx`: state halaman dan navigasi.
- `components/`: `Navbar`, `MobileNav` (drawer + navigasi bawah), `Hero`, `MediaCards` (kartu, baris, grid), `WatchModal` (detail + pemutar), `PlayerGuide`.
- `app/api/catalog`, `search`, `tv/details`, `trailer`, `servers`: API Next.js.
- `lib/stream-servers.ts`: daftar server dan informasi subtitle. `lib/cinemeta.ts`: ID TMDB serta judul/thumbnail episode.
- `idlix_catalog.json`: cache katalog lokal. API dapat membacanya, tetapi tidak menimpanya saat melayani permintaan.
- `browser-extension/`: ekstensi opsional.

Kualitas stream, hak tayang, iklan dalam player, dan pilihan subtitle bergantung pada penyedia masing-masing.

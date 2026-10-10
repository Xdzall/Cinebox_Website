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

- Film dan episode memakai komponen pemutar serta pilihan server yang sama. Enam URL penyedia disusun di `lib/stream-servers.ts` dan dipakai juga oleh `/api/servers`.
- Server pertama meminta bahasa Indonesia lewat parameter penyedia. Semua subtitle tetap dikelola pemutar penyedia. Cinebox belum memiliki berkas subtitle atau kontrol CC lintas server, sehingga ketersediaan dan bahasa subtitle tidak dapat dijamin.
- Pilih **Sumber video** atau **Server berikutnya** bila pemutar gagal atau dialihkan ke iklan di dalam frame. Kegagalan iframe tidak dapat dideteksi secara andal, jadi pergantian server dilakukan secara manual.
- Daftar episode diambil dari `/api/tv/details`. Jika data episode tidak tersedia, situs menampilkan keadaan kosong dan tetap dapat mencoba Season 1 Episode 1 tanpa membuat daftar episode fiktif.
- Iframe video tidak memakai sandbox karena penyedia dapat menolak frame yang dibatasi. Gunakan ekstensi opsional di bawah untuk mengurangi popup dan redirect tertentu; iklan dalam pemutar mungkin tetap muncul.

## Ekstensi opsional

Folder [`browser-extension`](browser-extension/README.md) berisi **Cinebox Player Guard** untuk Chrome/Edge (Manifest V3). Ekstensi dapat menutup popup dari frame penyedia yang dikenali dan memblokir domain redirect yang Anda masukkan sendiri pada tab Cinebox yang dikonfigurasi. Ekstensi perlu dipasang pengguna lewat **Load unpacked**; situs tidak bisa memasangnya otomatis. Baca petunjuk instalasi dan batasannya di README folder tersebut.

## Struktur penting

- `app/page.tsx`: katalog, navigasi, detail, dan pemutar.
- `app/api/catalog`, `search`, `tv/details`, `trailer`, `servers`: API Next.js.
- `lib/stream-servers.ts`: konfigurasi bersama URL server dan informasi subtitle.
- `idlix_catalog.json`: cache katalog lokal. API dapat membacanya, tetapi tidak menimpanya saat melayani permintaan.
- `browser-extension/`: ekstensi opsional.

Kualitas stream, hak tayang, iklan dalam player, dan pilihan subtitle bergantung pada penyedia masing-masing.

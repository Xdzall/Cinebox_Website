# 🎬 Cinebox Web Edition (Netflix OTT Streaming Platform)

Platform streaming film, serial TV, anime, dan drama Korea modern dengan antarmuka dan alur pengguna (*user flow*) 1:1 identik dengan Netflix.

---

## ✨ Fitur Utama (*Key Features*)

- **🔥 Top 10 Film & Serial TV Hari Ini di Indonesia (IMDb Official)**:
  - Angka peringkat raksasa (`1` s/d `10`) dengan desain tipografi *outlined* dan poster tumpang tindih (*overlapping*).
  - Peringkat tersusun secara dinamis berdasarkan rating & skor popularitas resmi IMDb.
- **🌸 Drama Korea & Serial Asia Terpopuler (Sub Indo)**:
  - Kurasi 100% akurat untuk judul drama Korea dan anime terpopuler (*Squid Game, All of Us Are Dead, Shōgun, Jujutsu Kaisen, Demon Slayer, Solo Leveling, dsb.*).
- **🍿 Billboard Hero Spotlight**:
  - Pratinjau *trailer* otomatis dengan tombol *audio toggle* `[🔊]/[🔇]` dan indikator navigasi *pill pagination*.
- **📺 Pemutar Video Tanpa Tabrakan Tombol**:
  - Modal tontonan khusus dengan tombol `[← Kembali]` dan judul di bagian atas.
  - Trailer pratinjau 100% bersih tanpa tombol aksi yang menutupi video.
  - Tombol aksi (`[▶ Putar Film]`, `[+ Daftar Saya]`, `[👍 Suka]`) diletakkan rapi di bawah area video.
- **⚡ Smart Multi-Server Streaming (6 Server Cadangan)**:
  - Server utama **VidAPI (Sub Indo)** dengan dukungan 5 server cadangan (*VidLink VIP, 2Embed HD, AutoEmbed Fast, VidSrc HD, MultiEmbed*).
- **📱 Mobile Ergonomics & Bottom Navigation**:
  - Bilah navigasi bawah 1 jempol (`Beranda`, `Serial TV`, `Film`, `Daftar Saya`, `Cari`) dan *Trending Search Chips*.
- **💾 Penyimpanan Otomatis (*Persistent Storage*)**:
  - Riwayat tontonan (*Continue Watching*) dan *Daftar Saya (My List)* tersimpan otomatis di *localStorage*.

---

## 🛠️ Teknologi yang Digunakan (*Tech Stack*)

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Frontend Library**: React 18 & TypeScript
- **Styling**: Vanilla CSS3 Modern (Custom Netflix OTT Theme)
- **Icons**: FontAwesome 6 Pro CDN
- **API Endpoints**: Next.js Serverless Route Handlers (`/api/catalog`, `/api/search`, `/api/servers`, `/api/trailer`, `/api/tv/details`)

---

## 🚀 Panduan Menjalankan Proyek (*Getting Started*)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18.x atau lebih baru.
- npm atau yarn.

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan (*Development Server*)
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

### 4. Membangun untuk Produksi (*Production Build*)
```bash
npm run build
npm start
```

---

## 📂 Struktur Direktori (*Directory Structure*)

```
cinebox-web/
├── app/
│   ├── api/
│   │   ├── catalog/route.ts      # API Katalog IMDb & Top 10
│   │   ├── search/route.ts       # API Pencarian Cepat
│   │   ├── servers/route.ts      # API Multi-Server Embed
│   │   ├── trailer/route.ts      # API Trailer YouTube
│   │   └── tv/details/route.ts   # API Musim & Episode TV Akurat
│   ├── globals.css               # Gaya Master Netflix OTT Theme
│   ├── layout.tsx                # Metadata & Root Layout
│   └── page.tsx                  # Antarmuka Utama & Player Client
├── idlix_catalog.json            # Database Katalog Film & Serial
├── next.config.js                # Konfigurasi Next.js
├── package.json                  # Dependensi Node.js
└── tsconfig.json                 # Konfigurasi TypeScript
```

---

## 📄 Lisensi
Hak Cipta © 2026 Cinebox Streaming Platform.

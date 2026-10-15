# Cinebox Player Guard (Chromium MV3)

Ekstensi ini memblokir tab iklan yang dibuka oleh pemutar video Cinebox. Versi 1.2.0 **langsung aktif setelah dipasang**; tidak ada yang perlu diatur.

## Instalasi

1. Login ke Cinebox, buka pemutar mana pun, lalu klik **Unduh ekstensi** (atau ambil folder `browser-extension` ini dari repositori).
2. Ekstrak `cinebox-player-guard.zip`. Simpan folder hasil ekstrak di tempat tetap; browser memuat ekstensi dari folder itu.
3. Buka `chrome://extensions` (atau `edge://extensions`) dan aktifkan **Developer mode**.
4. Pilih **Load unpacked**, lalu pilih folder `cinebox-player-guard`.
5. Muat ulang Cinebox. Di bawah pemutar akan muncul **Pemblokir iklan aktif**.

Halaman Options hanya untuk fitur lanjutan: memblokir domain redirect tertentu di tab Cinebox. Fitur itu membutuhkan origin Cinebox, misalnya `https://cinebox.example`.

## Cara kerja

- **Blokir navigasi iklan dari pemutar:** pop-up dan redirect iklan dari pemutar adalah navigasi `main_frame` yang *initiator*-nya origin pemutar. Ekstensi memasang aturan sesi `declarativeNetRequest` (`initiatorDomains` = host pemutar, `resourceTypes: ["main_frame"]`) sehingga halaman iklan tidak sempat dimuat, meskipun domain iklannya dibuat acak. Aturan aktif sejak ekstensi dipasang selama opsi popup menyala; tidak membutuhkan origin Cinebox.
- **Tutup tab popup:** Chrome `webNavigation.onCreatedNavigationTarget` memberi tab dan frame asal tab baru. Ekstensi menutup tab ketika frame asal merupakan penyedia video yang dikenali atau anak frame-nya, di situs mana pun. Host yang dikenali: `vaplayer.ru`, `nextgencloudfabric.com`, `vidlink.pro`, `2embed.cc`, `vidsrc.buzz`, `multiembed.mov`, dan `streamingnow.mov`. Tab baru dari halaman utama Cinebox atau trailer YouTube tidak ditutup.
- **Domain redirect:** aturan sesi lain memblokir navigasi `main_frame` dan `sub_frame` ke domain yang Anda tulis, terbatas pada tab Cinebox. Domain yang didaftarkan juga mencakup subdomainnya.
- Tidak ada skrip yang disuntikkan ke situs. Satu file, `guard.json`, dapat dibaca halaman web agar Cinebox bisa mendeteksi ekstensi; isinya hanya nama dan versi. ID ekstensi tetap karena `manifest.json` berisi `key`.
- Pengaturan tersimpan lokal melalui `chrome.storage.local`, dan aturan sesi dibangun kembali setelah browser/ekstensi dijalankan ulang.
- Izin `webNavigation` dipakai untuk membaca URL frame guna mencocokkan origin Cinebox dan penyedia video; kode ini tidak mengirim URL ke server lain.

## Hasil uji (15 Oktober 2026)

Diuji di Microsoft Edge (Chromium) dengan klik tiga kali pada pemutar di halaman uji lokal:

| Server | Tanpa ekstensi | Dengan ekstensi 1.1.0/1.2.0 |
| --- | --- | --- |
| VidAPI (`vaplayer.ru`) | Tab iklan terbuka lewat domain `*.cfd` acak lalu ke halaman iklan | Navigasi diblokir, tab ditutup |
| 2Embed | Tab iklan terbuka (afiliasi WPS) | Navigasi diblokir, tab ditutup |
| MultiEmbed | Tab iklan terbuka | Tidak ada tab iklan |
| VidLink | Tab iklan terbuka (ragasstore → trip.com) | Navigasi diblokir, tab ditutup |

Versi 1.2.0 diuji tanpa pengaturan apa pun, termasuk dari file zip yang diunduh dari situs.

## Batasan penting

- Tab popup tetap dibuat sesaat oleh browser sebelum ditutup, tetapi halaman iklannya tidak dimuat. Jika penyedia mengubah domain iframe-nya atau menyembunyikan sumber popup sehingga rantai frame tidak bisa diverifikasi, popup yang belum ada dalam daftar domain mungkin lolos.
- Iklan overlay yang digambar di dalam halaman penyedia (bukan tab baru) tidak diblokir. Aturan domain hanya cocok dengan domain navigasi yang tercantum. Iklan yang ditampilkan dalam halaman penyedia, redirect ke domain lain, permintaan jaringan lain, dan teknik anti-adblock penyedia dapat tetap muncul. Menambahkan domain penyedia video ke daftar blokir dapat memutus pemutaran.
- Ekstensi tidak menyediakan subtitle, tidak dapat mengendalikan isi iframe lintas origin, dan tidak dapat menjamin stream bebas iklan. Situs harus menangani kualitas pemutar serta klaim subtitle secara terpisah.
- Pembatasan berdasarkan ID tab adalah aturan sesi. Saat tab berpindah origin, event browser akan memperbaruinya; navigasi yang terjadi tepat bersamaan dengan perpindahan tab dapat memiliki jeda singkat. Pemutar Cinebox tidak memakai `sandbox` karena penyedia menolaknya, sehingga pemblokiran harus dilakukan di sisi browser.

## Cek cepat

1. Buka pemutar di Cinebox: harus tertulis "Pemblokir iklan aktif".
2. Klik pemutar VidAPI beberapa kali: tab iklan tidak boleh tetap terbuka.
3. Di Options, matikan "Blokir popup dan redirect dari iframe pemutar": tab iklan akan kembali muncul.

## Rujukan API

- [Chrome: `webNavigation.onCreatedNavigationTarget` dan `getAllFrames`](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [Chrome: `declarativeNetRequest` session rules, `tabIds`, `requestDomains`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome: izin dan perilaku `tabs` API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome: service worker MV3 sebagai ES module](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)

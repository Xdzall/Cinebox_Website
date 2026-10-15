# Cinebox Player Guard (Chromium MV3)

Ekstensi ini **opsional**. Pengaturan awalnya kosong, sehingga tidak memblokir apa pun sebelum Anda memasukkan origin situs Cinebox di halaman Options.

## Instalasi lokal

1. Buka `chrome://extensions` (atau `edge://extensions`) dan aktifkan **Developer mode**.
2. Pilih **Load unpacked**, lalu pilih folder `browser-extension` ini.
3. Buka **Details → Extension options** untuk Cinebox Player Guard.
4. Masukkan origin Cinebox Anda, misalnya `http://localhost:3000` atau `https://cinebox.example`. Masukkan hanya origin, tanpa path.
5. Opsional: tambahkan domain redirect yang Anda kenali, satu per baris, misalnya `ads.example.com`. Simpan pengaturan dan buka ulang tab Cinebox bila perlu.

Anda tidak perlu menambahkan `z2.idlixku.com` sebagai origin kecuali itu memang situs Cinebox yang Anda miliki. Origin berarti situs yang menampilkan pemutar, bukan situs referensi atau alamat iframe penyedia video.

## Cara kerja

- **Blokir navigasi iklan dari pemutar:** pop-up dan redirect iklan dari pemutar adalah navigasi `main_frame` yang *initiator*-nya origin pemutar. Ekstensi memasang aturan sesi `declarativeNetRequest` (`initiatorDomains` = host pemutar, `resourceTypes: ["main_frame"]`) sehingga halaman iklan tidak sempat dimuat, meskipun domain iklannya dibuat acak. Aturan hanya aktif selama ada origin Cinebox yang dikonfigurasi dan opsi popup menyala.
- **Tutup tab popup:** Chrome `webNavigation.onCreatedNavigationTarget` memberi tab dan frame asal tab baru. Ekstensi menutup tab ketika halaman teratas berada di origin Cinebox yang dikonfigurasi dan frame asal merupakan penyedia video yang dikenali atau anak frame-nya. Host yang dikenali: `vaplayer.ru`, `nextgencloudfabric.com`, `vidlink.pro`, `2embed.cc`, `vidsrc.buzz`, `multiembed.mov`, dan `streamingnow.mov`. Tab baru dari halaman utama Cinebox atau trailer YouTube tidak ditutup.
- **Domain redirect:** aturan sesi lain memblokir navigasi `main_frame` dan `sub_frame` ke domain yang Anda tulis, terbatas pada tab Cinebox. Domain yang didaftarkan juga mencakup subdomainnya.
- Tidak ada skrip yang disuntikkan ke situs. Pengaturan tersimpan lokal melalui `chrome.storage.local`, dan aturan sesi dibangun kembali setelah browser/ekstensi dijalankan ulang.
- Izin `webNavigation` dipakai untuk membaca URL frame guna mencocokkan origin Cinebox dan penyedia video; kode ini tidak mengirim URL ke server lain.

## Hasil uji (15 Oktober 2026)

Diuji di Microsoft Edge (Chromium) dengan klik tiga kali pada pemutar di halaman uji lokal:

| Server | Tanpa ekstensi | Dengan ekstensi 1.1.0 |
| --- | --- | --- |
| VidAPI (`vaplayer.ru`) | Tab iklan terbuka lewat domain `*.cfd` acak lalu ke halaman iklan | Navigasi diblokir, tab ditutup |
| 2Embed | Tab iklan terbuka (afiliasi WPS) | Navigasi diblokir, tab ditutup |
| MultiEmbed | Tab iklan terbuka | Tidak ada tab iklan |

## Batasan penting

- Tab popup tetap dibuat sesaat oleh browser sebelum ditutup, tetapi halaman iklannya tidak dimuat. Jika penyedia mengubah domain iframe-nya atau menyembunyikan sumber popup sehingga rantai frame tidak bisa diverifikasi, popup yang belum ada dalam daftar domain mungkin lolos.
- Iklan overlay yang digambar di dalam halaman penyedia (bukan tab baru) tidak diblokir. Aturan domain hanya cocok dengan domain navigasi yang tercantum. Iklan yang ditampilkan dalam halaman penyedia, redirect ke domain lain, permintaan jaringan lain, dan teknik anti-adblock penyedia dapat tetap muncul. Menambahkan domain penyedia video ke daftar blokir dapat memutus pemutaran.
- Ekstensi tidak menyediakan subtitle, tidak dapat mengendalikan isi iframe lintas origin, dan tidak dapat menjamin stream bebas iklan. Situs harus menangani kualitas pemutar serta klaim subtitle secara terpisah.
- Pembatasan berdasarkan ID tab adalah aturan sesi. Saat tab berpindah origin, event browser akan memperbaruinya; navigasi yang terjadi tepat bersamaan dengan perpindahan tab dapat memiliki jeda singkat. Pemutar Cinebox tidak memakai `sandbox` karena penyedia menolaknya, sehingga pemblokiran harus dilakukan di sisi browser.

## Cek cepat

1. Di Options, simpan origin Cinebox. Status harus menunjukkan jumlah tab Cinebox yang cocok.
2. Status harus menyebut "Navigasi iklan dari pemutar diblokir".
3. Dari tab Cinebox, klik pemutar VidAPI: tab iklan tidak boleh tetap terbuka.
4. Hapus semua origin Cinebox dan simpan; status harus menunjukkan tidak ada tab yang cocok dan aturan domain tidak aktif.

## Rujukan API

- [Chrome: `webNavigation.onCreatedNavigationTarget` dan `getAllFrames`](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [Chrome: `declarativeNetRequest` session rules, `tabIds`, `requestDomains`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome: izin dan perilaku `tabs` API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome: service worker MV3 sebagai ES module](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)

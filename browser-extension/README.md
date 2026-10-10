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

- **Popup pemutar:** Chrome `webNavigation.onCreatedNavigationTarget` memberi tab dan frame asal tab baru. Ekstensi hanya menutup tab ketika halaman teratas berada di origin Cinebox yang dikonfigurasi dan frame asal merupakan penyedia video Cinebox yang dikenali atau anak frame-nya. Saat ini penyedianya: `vaplayer.ru`, `vidlink.pro`, `2embed.cc`, `autoembed.co`, `vidsrc.xyz`, dan `multiembed.mov`. Tab baru dari halaman utama Cinebox atau trailer YouTube tidak ditutup oleh aturan penyedia ini. Jika pemblokiran domain diaktifkan, tab baru dari iframe lain pada Cinebox juga ditutup bila URL tujuannya ada dalam daftar domain.
- **Domain redirect:** aturan `declarativeNetRequest` sesi memblokir navigasi `main_frame` dan `sub_frame` ke domain yang Anda tulis. Aturan memakai ID tab Cinebox yang sedang terbuka, sehingga domain yang sama tetap dapat dibuka di tab lain. Domain yang didaftarkan juga mencakup subdomainnya. Aturan sesi diperbarui saat tab atau pengaturan berubah, dan dibangun kembali setelah browser/ekstensi dijalankan ulang.
- Tidak ada skrip yang disuntikkan ke situs dan tidak ada daftar domain iklan bawaan. Pengaturan tersimpan lokal di browser melalui `chrome.storage.local`.
- Izin `webNavigation` memungkinkan ekstensi membaca URL frame untuk mencocokkan origin Cinebox dan penyedia video; kode ini tidak mengirim URL ke server lain.

## Batasan penting

- Ekstensi menutup popup **setelah tab dibuat**. Tab bisa terlihat sesaat. Jika penyedia mengubah domain iframe-nya atau menyembunyikan sumber popup sehingga rantai frame tidak bisa diverifikasi, popup yang belum ada dalam daftar domain mungkin lolos.
- Aturan domain hanya cocok dengan domain navigasi yang tercantum. Iklan yang ditampilkan dalam halaman penyedia, redirect ke domain lain, permintaan jaringan lain, dan teknik anti-adblock penyedia dapat tetap muncul. Menambahkan domain penyedia video ke daftar blokir dapat memutus pemutaran.
- Ekstensi tidak menyediakan subtitle, tidak dapat mengendalikan isi iframe lintas origin, dan tidak dapat menjamin stream bebas iklan. Situs harus menangani kualitas pemutar serta klaim subtitle secara terpisah.
- Pembatasan berdasarkan ID tab adalah aturan sesi. Saat tab berpindah origin, event browser akan memperbaruinya; navigasi yang terjadi tepat bersamaan dengan perpindahan tab dapat memiliki jeda singkat. Pemutar Cinebox tidak memakai `sandbox` karena penyedia menolaknya, sehingga ekstensi ini hanya mengurangi popup dan redirect yang cocok dengan aturannya.

## Cek cepat

1. Di Options, simpan origin Cinebox. Status harus menunjukkan jumlah tab Cinebox yang cocok.
2. Tambahkan domain redirect yang terlihat pada popup, lalu simpan. Status harus menunjukkan aturan domain terpasang saat tab Cinebox terbuka.
3. Dari tab Cinebox, coba player yang pernah membuat popup: tab dari frame penyedia yang dikenali harus tertutup. Buka domain yang sama secara manual di tab lain untuk memastikan aturan tidak berlaku di luar Cinebox.
4. Hapus semua origin Cinebox dan simpan; status harus menunjukkan tidak ada tab yang cocok dan aturan domain tidak aktif.

## Rujukan API

- [Chrome: `webNavigation.onCreatedNavigationTarget` dan `getAllFrames`](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [Chrome: `declarativeNetRequest` session rules, `tabIds`, `requestDomains`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome: izin dan perilaku `tabs` API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome: service worker MV3 sebagai ES module](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)

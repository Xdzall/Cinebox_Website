'use client';

import React, { useEffect, useRef } from 'react';

export default function PlayerGuide({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={event => event.stopPropagation()}>
        <div className="guide-head">
          <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <div>
            <h3 id="guide-title">Mengurangi iklan dari pemutar</h3>
            <p>Iklan berasal dari situs penyedia video, bukan dari Cinebox.</p>
          </div>
          <button type="button" ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Tutup panduan">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="guide-body">
          <ol className="guide-steps">
            <li>
              <strong>Pasang Cinebox Player Guard (paling efektif).</strong> Ekstensi di folder <code>browser-extension</code> memblokir
              halaman yang dibuka oleh frame pemutar sebelum sempat dimuat, lalu menutup tab kosongnya. Pasang lewat{' '}
              <code>chrome://extensions</code> → Developer mode → Load unpacked, lalu isi origin situs Cinebox di Options.
            </li>
            <li>
              <strong>Atau pakai pemblokir iklan.</strong> uBlock Origin atau browser Brave juga dapat memblokir pop-up dan skrip iklan
              di dalam iframe — hal yang tidak bisa dilakukan situs mana pun dari luar iframe.
            </li>
            <li>
              <strong>Tab iklan sudah terbuka?</strong> Tutup tab itu dan kembali ke Cinebox. VidAPI biasanya hanya membuka iklan pada
              klik pertama, jadi klik berikutnya akan memutar video.
            </li>
            <li>
              <strong>Coba server lain</strong> jika pemutar kosong, menampilkan 404, atau terus mengalihkan ke iklan.
            </li>
          </ol>
          <a className="btn btn-small btn-outline" href="https://github.com/Xdzall/Cinebox_Website/blob/main/browser-extension/README.md" target="_blank" rel="noopener noreferrer">
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Panduan ekstensi
          </a>
        </div>
      </div>
    </div>
  );
}

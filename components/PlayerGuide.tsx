'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PLAYER_GUARD_DOWNLOAD, usePlayerGuard } from '../lib/player-guard';
import { useModalFocus } from '../lib/use-modal-focus';

function CopyCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return (
    <span className="copy-code">
      <code>{text}</code>
      <button type="button" onClick={copy} aria-label={`Salin ${text}`}>
        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true"></i>
      </button>
    </span>
  );
}

export default function PlayerGuide({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, true, closeRef);
  const status = usePlayerGuard();
  const isMobile = status === 'mobile';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const desktop = (
    <section className="guide-section" aria-labelledby="guide-desktop">
      <h4 id="guide-desktop">
        <i className="fa-solid fa-desktop" aria-hidden="true"></i> Komputer: Chrome atau Edge
        {status === 'installed' && <span className="guide-badge ok">Sudah terpasang</span>}
      </h4>
      {status === 'outdated' && (
        <p className="guide-note">Untuk memperbarui: unduh zip terbaru, ekstrak dan ganti isi folder ekstensi lama, lalu klik Reload pada kartu Player Guard di halaman ekstensi. Izinkan akses ke situs pemutar bila browser memintanya, lalu muat ulang Cinebox.</p>
      )}
      <ol className="guide-steps">
        <li>
          Unduh ekstensinya:{' '}
          <a className="btn btn-small btn-light" href={PLAYER_GUARD_DOWNLOAD} download>
            <i className="fa-solid fa-download" aria-hidden="true"></i> cinebox-player-guard.zip
          </a>
        </li>
        <li>Ekstrak file zip (klik kanan → <strong>Extract All</strong>). Akan muncul folder <code>cinebox-player-guard</code>. Simpan folder ini di tempat tetap, jangan dihapus.</li>
        <li>Buka alamat ini di tab baru: <CopyCode text="chrome://extensions" /> (di Edge: <CopyCode text="edge://extensions" />)</li>
        <li>Nyalakan <strong>Developer mode</strong> (pojok kanan atas di Chrome, menu kiri di Edge).</li>
        <li>Klik <strong>Load unpacked</strong>, lalu pilih folder <code>cinebox-player-guard</code>.</li>
        <li>Muat ulang Cinebox. Di bawah pemutar akan muncul tulisan <strong>Player Guard terpasang</strong>. Versi terbaru mencegah permintaan membuka tab sejak pemutar dimuat; iklan penyedia masih mungkin muncul.</li>
      </ol>
    </section>
  );

  const mobile = (
    <section className="guide-section" aria-labelledby="guide-mobile">
      <h4 id="guide-mobile"><i className="fa-solid fa-mobile-screen" aria-hidden="true"></i> HP: Android atau iPhone</h4>
      <p className="guide-text">
        Chrome di HP tidak bisa memasang ekstensi. Pilihan yang tersedia:
      </p>
      <ul className="guide-steps">
        <li><strong>Brave</strong> (Android dan iPhone): pemblokir iklan bawaan sudah aktif. Login ke Cinebox lewat Brave.</li>
        <li><strong>Firefox</strong> (Android): pasang add-on <strong>uBlock Origin</strong> dari menu Add-ons.</li>
        <li>Jika tetap memakai Chrome, tutup tab iklan yang terbuka lalu kembali ke Cinebox dan ketuk pemutar sekali lagi.</li>
      </ul>
      <p className="guide-note">Brave dan uBlock Origin memblokir banyak iklan pop-up, tetapi belum kami uji khusus pada pemutar ini.</p>
    </section>
  );

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={event => event.stopPropagation()}>
        <div className="guide-head">
          <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <div>
            <h3 id="guide-title">Memblokir tab iklan dari pemutar</h3>
            <p>
              Semua server video membuka tab iklan saat pemutarnya diklik. Iklan itu berjalan di dalam pemutar milik penyedia, jadi
              situs tidak bisa memblokirnya; yang bisa hanya browser Anda.
            </p>
          </div>
          <button type="button" ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Tutup panduan">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="guide-body">
          {isMobile ? (
            <>
              {mobile}
              {desktop}
            </>
          ) : (
            <>
              {desktop}
              {status === 'other' && (
                <section className="guide-section">
                  <h4><i className="fa-brands fa-firefox-browser" aria-hidden="true"></i> Firefox atau Safari</h4>
                  <p className="guide-text">
                    Player Guard hanya untuk Chrome dan Edge. Di Firefox, pasang add-on <strong>uBlock Origin</strong>. Safari tidak
                    didukung; gunakan Chrome atau Edge.
                  </p>
                </section>
              )}
              {mobile}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

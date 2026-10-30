'use client';

import React, { useState } from 'react';
import { PLAYER_GUARD_DOWNLOAD, usePlayerGuard } from '../lib/player-guard';

const DISMISS_KEY = 'cinebox_guard_notice_dismissed';

export default function PlayerGuardNotice({ onOpenGuide }: { onOpenGuide: () => void }) {
  const status = usePlayerGuard();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (status === 'checking') return <p className="guard-mini">Pemutar penyedia dapat membuka tab iklan. Tutup tab itu lalu kembali ke Cinebox.</p>;

  if (status === 'installed') {
    return (
      <p className="guard-ok" role="status">
        <i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Player Guard terpasang. Membantu mencegah tab iklan; iklan penyedia masih mungkin muncul.
      </p>
    );
  }

  if (dismissed) {
    return (
      <button type="button" className="guard-mini" onClick={onOpenGuide}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Tab iklan masih bisa muncul. Cara memblokirnya
      </button>
    );
  }

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <div className="guard-notice" role="note">
      <i className="fa-solid fa-triangle-exclamation guard-icon" aria-hidden="true"></i>
      <div className="guard-text">
        <strong>Klik pada pemutar dapat membuka tab iklan (judi online).</strong>
        <span>
          {status === 'outdated'
            ? 'Player Guard versi lama masih menutup tab setelah terbuka. Unduh versi terbaru untuk mencegah tab sejak pemutar dimuat.'
            : status === 'missing'
            ? 'Iklan berasal dari penyedia video. Player Guard membantu memblokir tab iklan. Jika tab terbuka, tutup lalu kembali ke Cinebox.'
            : status === 'mobile'
              ? 'Chrome di HP tidak mendukung Player Guard. Tutup tab iklan lalu kembali ke Cinebox. Brave atau Firefox Android dengan uBlock Origin dapat membantu.'
              : 'Browser ini tidak mendukung Player Guard. Pemblokir browser dapat membantu. Tutup tab iklan lalu kembali ke Cinebox.'}
        </span>
        <div className="guard-actions">
          {(status === 'missing' || status === 'outdated') && (
            <a className="btn btn-small btn-light" href={PLAYER_GUARD_DOWNLOAD} download>
              <i className="fa-solid fa-download" aria-hidden="true"></i> {status === 'outdated' ? 'Unduh pembaruan' : 'Unduh ekstensi'}
            </a>
          )}
          <button type="button" className="btn btn-small btn-outline" onClick={onOpenGuide}>
            {status === 'outdated' ? 'Cara memperbarui' : status === 'missing' ? 'Cara pasang' : 'Selengkapnya'}
          </button>
        </div>
      </div>
      <button type="button" className="icon-btn guard-close" onClick={dismiss} aria-label="Sembunyikan pemberitahuan">
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  );
}

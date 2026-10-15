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

  if (status === 'checking') return null;

  if (status === 'installed') {
    return (
      <p className="guard-ok" role="status">
        <i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Pemblokir iklan aktif — tab iklan dari pemutar otomatis diblokir.
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
          {status === 'missing'
            ? 'Iklan ini berasal dari penyedia video. Pasang Cinebox Player Guard sekali saja untuk memblokirnya.'
            : status === 'mobile'
              ? 'Chrome di HP tidak mendukung pemblokir. Tutup saja tab iklannya, atau tonton lewat browser Brave.'
              : 'Browser ini tidak mendukung Player Guard. Pasang uBlock Origin untuk memblokirnya.'}
        </span>
        <div className="guard-actions">
          {status === 'missing' && (
            <a className="btn btn-small btn-light" href={PLAYER_GUARD_DOWNLOAD} download>
              <i className="fa-solid fa-download" aria-hidden="true"></i> Unduh ekstensi
            </a>
          )}
          <button type="button" className="btn btn-small btn-outline" onClick={onOpenGuide}>
            {status === 'missing' ? 'Cara pasang' : 'Selengkapnya'}
          </button>
        </div>
      </div>
      <button type="button" className="icon-btn guard-close" onClick={dismiss} aria-label="Sembunyikan pemberitahuan">
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  );
}

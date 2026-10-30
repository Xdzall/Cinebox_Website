'use client';

import { useEffect, useState } from 'react';

// Fixed by the "key" in browser-extension/manifest.json, so it is the same on every computer.
export const PLAYER_GUARD_ID = 'hejbphhakjbiifnfchmojlkkdheibhjb';
export const PLAYER_GUARD_DOWNLOAD = '/downloads/cinebox-player-guard.zip';

/**
 * - installed: Cinebox Player Guard answered.
 * - missing: desktop Chrome/Edge without the extension (it can be installed).
 * - outdated: installed extension needs the prevention added in version 1.3.
 * - mobile: phone/tablet; Chrome there has no extensions, so another browser is needed.
 * - other: desktop browser that cannot run this extension (Firefox, Safari).
 */
export type PlayerGuardStatus = 'checking' | 'installed' | 'outdated' | 'missing' | 'mobile' | 'other';

let cached: Promise<PlayerGuardStatus> | null = null;

function detect(): Promise<PlayerGuardStatus> {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) {
    return Promise.resolve('mobile');
  }
  const chromium = /Chrome\/|Edg\//.test(ua) && !/Firefox\//.test(ua);
  if (!chromium) return Promise.resolve('other');
  return fetch(`chrome-extension://${PLAYER_GUARD_ID}/guard.json`, { cache: 'no-store' })
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (data?.name !== 'cinebox-player-guard') return 'missing' as const;
      const [major, minor] = String(data.version ?? '').split('.').map(Number);
      return major > 1 || (major === 1 && minor >= 3) ? 'installed' as const : 'outdated' as const;
    })
    .catch(() => 'missing' as const);
}

export function usePlayerGuard(): PlayerGuardStatus {
  const [status, setStatus] = useState<PlayerGuardStatus>('checking');
  useEffect(() => {
    let active = true;
    cached ??= detect();
    cached.then(result => {
      // Re-check next time if it was missing: the viewer may install it without reloading.
      if (result === 'missing' || result === 'outdated') cached = null;
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);
  return status;
}

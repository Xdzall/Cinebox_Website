export const SETTINGS_KEY = 'cineboxPlayerGuard';
export const RULE_ID = 10001;
export const PLAYER_NAV_RULE_ID = 10002;
export const POPUP_SCRIPT_ID = 'cinebox-player-popup-guard';
export const MAX_SITE_ORIGINS = 10;
export const MAX_BLOCKED_DOMAINS = 100;

export const DEFAULT_SETTINGS = Object.freeze({
  siteOrigins: [],
  blockedDomains: [],
  blockPlayerPopups: true,
  blockListedDomains: true,
});

// Embed hosts used by Cinebox, plus the hosts they load or redirect to
// (vaplayer.ru -> nextgencloudfabric.com, 2embed.cc -> vidsrc.buzz,
// multiembed.mov -> streamingnow.mov). A popup must originate from one of these
// frames (or its child frame) before the extension closes it.
export const PLAYER_HOSTS = Object.freeze([
  'vaplayer.ru',
  'nextgencloudfabric.com',
  'vidlink.pro',
  '2embed.cc',
  'vidsrc.buzz',
  'multiembed.mov',
  'streamingnow.mov',
]);

export function makePopupContentScript() {
  return {
    id: POPUP_SCRIPT_ID,
    matches: PLAYER_HOSTS.map(host => `*://*.${host}/*`),
    js: ['popup-guard.js'],
    allFrames: true,
    matchOriginAsFallback: true,
    runAt: 'document_start',
    world: 'MAIN',
    persistAcrossSessions: true,
  };
}

export function normalizeSiteOrigin(value) {
  const input = String(value ?? '').trim();
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Origin Cinebox tidak valid: ${input}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Masukkan origin saja, misalnya https://cinebox.example: ${input}`);
  }
  return url.origin;
}

export function normalizeBlockedDomain(value) {
  const input = String(value ?? '').trim().toLowerCase();
  if (!input || input.includes('/') || input.includes(':') || input.includes('*') ||
      input.includes('?') || input.includes('#') || input.includes('@')) {
    throw new Error(`Domain redirect tidak valid: ${input}`);
  }
  let hostname;
  try {
    hostname = new URL(`https://${input}`).hostname;
  } catch {
    throw new Error(`Domain redirect tidak valid: ${input}`);
  }
  // DNR requestDomains also matches subdomains. Require a full domain, not a
  // bare TLD or wildcard, to reduce accidental overblocking.
  const labels = hostname.split('.');
  if (labels.length < 2 || hostname !== input || hostname.length > 253 ||
      labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error(`Gunakan domain lengkap, misalnya ads.example.com: ${input}`);
  }
  return hostname;
}

function normalizeList(value, normalizer, limit) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value.slice(0, limit)) {
    try {
      const normalized = normalizer(item);
      if (!result.includes(normalized)) result.push(normalized);
    } catch {
      // Ignore malformed stored values. Invalid new input is rejected in UI.
    }
  }
  return result;
}

export function domainMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function sanitizeSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const siteOrigins = normalizeList(raw.siteOrigins, normalizeSiteOrigin, MAX_SITE_ORIGINS);
  const siteHosts = siteOrigins.map(origin => new URL(origin).hostname);
  const blockedDomains = normalizeList(raw.blockedDomains, normalizeBlockedDomain, MAX_BLOCKED_DOMAINS)
    .filter(domain => !siteHosts.some(host => domainMatches(host, domain)));
  return {
    siteOrigins,
    blockedDomains,
    blockPlayerPopups: raw.blockPlayerPopups !== false,
    blockListedDomains: raw.blockListedDomains !== false,
  };
}

export function isConfiguredSite(url, settings) {
  if (!url || !settings.siteOrigins.length) return false;
  try {
    return settings.siteOrigins.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

export function isBlockedUrl(url, settings) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
      settings.blockedDomains.some(domain => domainMatches(parsed.hostname, domain));
  } catch {
    return false;
  }
}

export function isPlayerFrameUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
      PLAYER_HOSTS.some(domain => domainMatches(parsed.hostname, domain));
  } catch {
    return false;
  }
}

export function hasPlayerFrameAncestor(frames, sourceFrameId) {
  if (!Array.isArray(frames) || sourceFrameId <= 0) return false;
  const byId = new Map(frames.map(frame => [frame.frameId, frame]));
  const visited = new Set();
  let frameId = sourceFrameId;
  while (frameId > 0 && !visited.has(frameId)) {
    visited.add(frameId);
    const frame = byId.get(frameId);
    if (!frame) return false;
    if (isPlayerFrameUrl(frame.url)) return true;
    frameId = frame.parentFrameId;
  }
  return false;
}

export function makeDomainRule(settings, tabIds) {
  if (!settings.blockListedDomains || !settings.siteOrigins.length ||
      !settings.blockedDomains.length || !tabIds.length) return null;
  return {
    id: RULE_ID,
    priority: 1,
    action: { type: 'block' },
    condition: {
      tabIds: [...new Set(tabIds)].sort((a, b) => a - b),
      requestDomains: settings.blockedDomains,
      resourceTypes: ['main_frame', 'sub_frame'],
    },
  };
}

// Popunders and top-level redirects from a player are navigations whose initiator is the
// player's origin. Blocking those main-frame requests stops the ad page from loading even
// when the ad domain is generated at random. The rule is scoped by initiator (a popup tab is
// not tied to the Cinebox tab id), so it needs no Cinebox origin and is on right after install.
export function makePlayerNavigationRule(settings) {
  if (!settings.blockPlayerPopups) return null;
  return {
    id: PLAYER_NAV_RULE_ID,
    priority: 1,
    action: { type: 'block' },
    condition: {
      initiatorDomains: [...PLAYER_HOSTS],
      resourceTypes: ['main_frame'],
    },
  };
}

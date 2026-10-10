export const SETTINGS_KEY = 'cineboxPlayerGuard';
export const RULE_ID = 10001;
export const MAX_SITE_ORIGINS = 10;
export const MAX_BLOCKED_DOMAINS = 100;

export const DEFAULT_SETTINGS = Object.freeze({
  siteOrigins: [],
  blockedDomains: [],
  blockPlayerPopups: true,
  blockListedDomains: true,
});

// These are the embed hosts currently used by Cinebox. A popup must originate
// from one of these frames (or its child frame) before the extension closes it.
export const PLAYER_HOSTS = Object.freeze([
  'vaplayer.ru',
  'vidlink.pro',
  '2embed.cc',
  'autoembed.co',
  'vidsrc.xyz',
  'multiembed.mov',
]);

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

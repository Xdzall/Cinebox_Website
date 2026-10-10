import {
  SETTINGS_KEY,
  MAX_SITE_ORIGINS,
  MAX_BLOCKED_DOMAINS,
  normalizeSiteOrigin,
  normalizeBlockedDomain,
  domainMatches,
  sanitizeSettings,
} from './settings.mjs';

const form = document.querySelector('#settings-form');
const siteOriginsInput = document.querySelector('#site-origins');
const blockedDomainsInput = document.querySelector('#blocked-domains');
const blockPopupsInput = document.querySelector('#block-popups');
const blockDomainsInput = document.querySelector('#block-domains');
const saveButton = document.querySelector('#save-button');
const status = document.querySelector('#status');

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function parseLines(text, normalizer, limit, label) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > limit) throw new Error(`Maksimal ${limit} ${label}.`);
  return [...new Set(lines.map(normalizer))];
}

async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'cinebox-guard-status' });
  if (!response?.ok) throw new Error(response?.error || 'Status aturan tidak tersedia.');
  if (response.activeTabCount === 0) {
    setStatus('Tersimpan. Belum ada tab Cinebox yang cocok.');
  } else if (response.domainRuleActive) {
    setStatus(`Aktif pada ${response.activeTabCount} tab Cinebox. Aturan domain terpasang.`);
  } else {
    setStatus(`Aktif pada ${response.activeTabCount} tab Cinebox. Tidak ada aturan domain aktif.`);
  }
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = sanitizeSettings(stored[SETTINGS_KEY]);
    siteOriginsInput.value = settings.siteOrigins.join('\n');
    blockedDomainsInput.value = settings.blockedDomains.join('\n');
    blockPopupsInput.checked = settings.blockPlayerPopups;
    blockDomainsInput.checked = settings.blockListedDomains;
    await refreshStatus();
  } catch (error) {
    setStatus(String(error), true);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  saveButton.disabled = true;
  try {
    const siteOrigins = parseLines(siteOriginsInput.value, normalizeSiteOrigin,
      MAX_SITE_ORIGINS, 'origin Cinebox');
    const blockedDomains = parseLines(blockedDomainsInput.value, normalizeBlockedDomain,
      MAX_BLOCKED_DOMAINS, 'domain redirect');
    const siteHosts = siteOrigins.map(origin => new URL(origin).hostname);
    const overlappingDomain = blockedDomains.find(domain =>
      siteHosts.some(host => domainMatches(host, domain)));
    if (overlappingDomain) {
      throw new Error(`Domain ${overlappingDomain} mencakup origin Cinebox. Hapus dari daftar blokir.`);
    }

    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        siteOrigins,
        blockedDomains,
        blockPlayerPopups: blockPopupsInput.checked,
        blockListedDomains: blockDomainsInput.checked,
      },
    });
    siteOriginsInput.value = siteOrigins.join('\n');
    blockedDomainsInput.value = blockedDomains.join('\n');
    await refreshStatus();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    saveButton.disabled = false;
  }
});

void loadSettings();

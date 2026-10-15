import {
  SETTINGS_KEY,
  RULE_ID,
  PLAYER_NAV_RULE_ID,
  sanitizeSettings,
  isConfiguredSite,
  isBlockedUrl,
  hasPlayerFrameAncestor,
  makeDomainRule,
  makePlayerNavigationRule,
} from './settings.mjs';

async function readSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return sanitizeSettings(stored[SETTINGS_KEY]);
}

async function syncDomainRule() {
  const settings = await readSettings();
  const tabs = await chrome.tabs.query({});
  const matches = await Promise.all(tabs.map(async tab => {
    if (!Number.isInteger(tab.id)) return null;
    try {
      const frame = await chrome.webNavigation.getFrame({ tabId: tab.id, frameId: 0 });
      return isConfiguredSite(frame?.url, settings) ? tab.id : null;
    } catch {
      return null;
    }
  }));
  const tabIds = matches.filter(Number.isInteger);
  const wanted = new Map([
    [RULE_ID, makeDomainRule(settings, tabIds)],
    [PLAYER_NAV_RULE_ID, makePlayerNavigationRule(settings)],
  ]);
  const current = await chrome.declarativeNetRequest.getSessionRules();
  const removeRuleIds = [];
  const addRules = [];
  for (const [id, nextRule] of wanted) {
    const existing = current.find(rule => rule.id === id);
    if (JSON.stringify(existing ?? null) === JSON.stringify(nextRule)) continue;
    if (existing) removeRuleIds.push(id);
    if (nextRule) addRules.push(nextRule);
  }
  if (removeRuleIds.length || addRules.length) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds, addRules });
  }
  return {
    activeTabCount: tabIds.length,
    domainRuleActive: Boolean(wanted.get(RULE_ID)),
    playerRuleActive: Boolean(wanted.get(PLAYER_NAV_RULE_ID)),
  };
}

// Serialize updates so a quick succession of tab and settings events cannot
// replace a newer rule with a stale one.
let syncQueue = Promise.resolve();
function queueRuleSync() {
  syncQueue = syncQueue.catch(() => {}).then(syncDomainRule);
  syncQueue.catch(error => console.error('Cinebox Player Guard: rule sync failed', error));
  return syncQueue;
}

async function closePlayerPopup(details) {
  if (!Number.isInteger(details.sourceTabId) || !Number.isInteger(details.tabId) ||
      details.sourceFrameId <= 0 || details.tabId === details.sourceTabId) return;

  const settings = await readSettings();
  if (!settings.siteOrigins.length ||
      (!settings.blockPlayerPopups && !settings.blockListedDomains)) return;

  let topFrame;
  try {
    topFrame = await chrome.webNavigation.getFrame({ tabId: details.sourceTabId, frameId: 0 });
  } catch {
    return;
  }
  if (!isConfiguredSite(topFrame?.url, settings)) return;

  let fromPlayerFrame = false;
  if (settings.blockPlayerPopups) {
    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId: details.sourceTabId });
      fromPlayerFrame = hasPlayerFrameAncestor(frames, details.sourceFrameId);
    } catch {
      // If frame ancestry cannot be verified, only an explicitly blocked
      // destination can be closed. We do not close every Cinebox popup.
    }
  }
  const listedDestination = settings.blockListedDomains && isBlockedUrl(details.url, settings);
  if (!fromPlayerFrame && !listedDestination) return;

  try {
    await chrome.tabs.remove(details.tabId);
  } catch {
    // The tab may already have been closed by the user or browser.
  }
}

chrome.webNavigation.onCreatedNavigationTarget.addListener(details => {
  closePlayerPopup(details).catch(error =>
    console.error('Cinebox Player Guard: popup check failed', error));
});

chrome.tabs.onCreated.addListener(() => { void queueRuleSync(); });
chrome.tabs.onRemoved.addListener(() => { void queueRuleSync(); });
chrome.tabs.onReplaced.addListener(() => { void queueRuleSync(); });
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    void queueRuleSync();
  }
});
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId === 0) void queueRuleSync();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && SETTINGS_KEY in changes) void queueRuleSync();
});
chrome.runtime.onInstalled.addListener(() => { void queueRuleSync(); });
chrome.runtime.onStartup.addListener(() => { void queueRuleSync(); });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'cinebox-guard-status') return false;
  queueRuleSync().then(
    status => sendResponse({ ok: true, ...status }),
    error => sendResponse({ ok: false, error: String(error) }),
  );
  return true;
});

void queueRuleSync();

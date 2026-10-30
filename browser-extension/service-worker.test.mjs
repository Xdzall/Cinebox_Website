import test from 'node:test';
import assert from 'node:assert/strict';
import { makePopupContentScript, SETTINGS_KEY } from './settings.mjs';

test('worker installs persistent early protection, updates it, and respects disabling', async () => {
  let settings = {};
  let scripts = [];
  let rules = [];
  let messageListener;
  let updates = 0;
  const event = () => ({ addListener() {} });
  globalThis.chrome = {
    scripting: {
      async getRegisteredContentScripts() { return scripts; },
      async registerContentScripts(value) { scripts = value; },
      async updateContentScripts(value) { scripts = value; updates++; },
      async unregisterContentScripts() { scripts = []; },
    },
    storage: {
      local: { async get() { return { [SETTINGS_KEY]: settings }; } },
      onChanged: event(),
    },
    tabs: {
      async query() { return []; },
      onCreated: event(), onRemoved: event(), onReplaced: event(), onUpdated: event(),
    },
    webNavigation: { onCreatedNavigationTarget: event(), onCommitted: event() },
    declarativeNetRequest: {
      async getSessionRules() { return rules; },
      async updateSessionRules({ removeRuleIds, addRules }) {
        rules = rules.filter(rule => !removeRuleIds.includes(rule.id)).concat(addRules);
      },
    },
    runtime: {
      onInstalled: event(), onStartup: event(),
      onMessage: { addListener(listener) { messageListener = listener; } },
    },
  };
  try {
    await import('./service-worker.mjs');
    const status = () => new Promise(resolve => messageListener({ type: 'cinebox-guard-status' }, {}, resolve));
    assert.equal((await status()).popupScriptActive, true);
    assert.deepEqual(scripts, [makePopupContentScript()]);
    assert.equal(updates, 0); // Tab events do not keep re-registering the script.
    scripts = [{ ...scripts[0], runAt: 'document_idle' }];
    await status();
    assert.equal(scripts[0].runAt, 'document_start');
    assert.equal(updates, 1);
    settings = { blockPlayerPopups: false };
    const disabled = await status();
    assert.equal(disabled.popupScriptActive, false);
    assert.equal(disabled.playerRuleActive, false);
    assert.deepEqual(scripts, []);
    assert.deepEqual(rules, []);
    settings = {};
    assert.equal((await status()).popupScriptActive, true);
    assert.equal(scripts.length, 1);
    assert.equal(rules.length, 1);
  } finally {
    delete globalThis.chrome;
  }
});

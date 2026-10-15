import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSiteOrigin,
  normalizeBlockedDomain,
  sanitizeSettings,
  isConfiguredSite,
  isBlockedUrl,
  hasPlayerFrameAncestor,
  makeDomainRule,
  makePlayerNavigationRule,
  PLAYER_HOSTS,
} from './settings.mjs';

test('site matching uses exact scheme, hostname, and port', () => {
  const settings = sanitizeSettings({ siteOrigins: ['http://localhost:3000'] });
  assert.equal(normalizeSiteOrigin('http://localhost:3000/'), 'http://localhost:3000');
  assert.equal(isConfiguredSite('http://localhost:3000/watch', settings), true);
  assert.equal(isConfiguredSite('http://localhost:3001/watch', settings), false);
  assert.equal(isConfiguredSite('https://localhost:3000/watch', settings), false);
  assert.equal(isConfiguredSite('http://other.localhost:3000/watch', settings), false);
  assert.throws(() => normalizeSiteOrigin('http://localhost:3000/watch'));
});

test('redirect domains are strict and cannot cover the Cinebox origin', () => {
  assert.equal(normalizeBlockedDomain('Ads.Example.com'), 'ads.example.com');
  assert.throws(() => normalizeBlockedDomain('*.example.com'));
  assert.throws(() => normalizeBlockedDomain('https://ads.example.com/path'));
  assert.throws(() => normalizeBlockedDomain('com'));
  const settings = sanitizeSettings({
    siteOrigins: ['https://cinebox.example.com'],
    blockedDomains: ['example.com', 'ads.test.net'],
  });
  assert.deepEqual(settings.blockedDomains, ['ads.test.net']);
  assert.equal(isBlockedUrl('https://sub.ads.test.net/redirect', settings), true);
  assert.equal(isBlockedUrl('https://notads.test.net', settings), false);
});

test('popup source must be a player frame or a descendant', () => {
  const frames = [
    { frameId: 0, parentFrameId: -1, url: 'https://cinebox.example' },
    { frameId: 4, parentFrameId: 0, url: 'https://vaplayer.ru/embed/movie/tt123' },
    { frameId: 9, parentFrameId: 4, url: 'https://another.example/frame' },
    { frameId: 12, parentFrameId: 0, url: 'https://youtube.com/embed/abc' },
  ];
  assert.equal(hasPlayerFrameAncestor(frames, 9), true);
  assert.equal(hasPlayerFrameAncestor(frames, 12), false);
  assert.equal(hasPlayerFrameAncestor(frames, 0), false);
  assert.equal(hasPlayerFrameAncestor(frames, 42), false);
});

test('DNR rule is scoped to configured Cinebox tab IDs', () => {
  const settings = sanitizeSettings({
    siteOrigins: ['https://cinebox.example'],
    blockedDomains: ['ads.example.com'],
  });
  const rule = makeDomainRule(settings, [12, 2, 12]);
  assert.deepEqual(rule.condition.tabIds, [2, 12]);
  assert.deepEqual(rule.condition.requestDomains, ['ads.example.com']);
  assert.deepEqual(rule.condition.resourceTypes, ['main_frame', 'sub_frame']);
  assert.equal(makeDomainRule(settings, []), null);
});

test('player navigation rule blocks top-level loads started by player frames', () => {
  const settings = sanitizeSettings({ siteOrigins: ['https://cinebox.example'] });
  const rule = makePlayerNavigationRule(settings);
  assert.deepEqual(rule.condition.initiatorDomains, [...PLAYER_HOSTS]);
  assert.deepEqual(rule.condition.resourceTypes, ['main_frame']);
  assert.equal(rule.condition.tabIds, undefined);
  // Works without any configured Cinebox origin; only the toggle turns it off.
  assert.notEqual(makePlayerNavigationRule(sanitizeSettings({})), null);
  assert.equal(makePlayerNavigationRule(sanitizeSettings({
    siteOrigins: ['https://cinebox.example'],
    blockPlayerPopups: false,
  })), null);
});

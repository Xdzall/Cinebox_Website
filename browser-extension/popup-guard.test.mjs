import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./popup-guard.js', import.meta.url), 'utf8');

// Model browser default actions separately from provider handlers: canceling
// link navigation must not swallow the tap that starts/pauses the video.
function fixture({ topLevel = false, nested = false, baseTarget = null } = {}) {
  class Element {
    constructor(tag, attributes = {}) { this.tag = tag; this.attributes = attributes; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    matches() { return ['a', 'area'].includes(this.tag) && 'href' in this.attributes; }
  }
  const submits = [];
  class HTMLFormElement extends Element {
    constructor(attributes = {}) { super('form', attributes); }
    submit() { submits.push(this); }
  }
  const listeners = new Map();
  const opens = [];
  const window = {
    frames: {},
    open(...args) { opens.push(args); return 'native-window'; },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  window.top = topLevel ? window : {};
  window.parent = nested ? {} : window.top;
  window.frames.child = { parent: window };
  window.frames.alert = () => {};
  window.frames.top = window.top;
  window.frames.self = window;
  const document = { querySelector: () => baseTarget ? new Element('base', { target: baseTarget }) : null };
  const context = vm.createContext({ window, document, Element, HTMLFormElement });
  vm.runInContext(source, context);
  function fire(type, target, extra = {}) {
    const event = {
      target, button: 0, defaultPrevented: false,
      composedPath: () => [target, window],
      preventDefault() { this.defaultPrevented = true; },
      ...extra,
    };
    listeners.get(type)?.(event);
    return event;
  }
  return { window, opens, submits, fire, Element, HTMLFormElement, context };
}

test('blocks script popups before creation, including blank and named windows', () => {
  const f = fixture();
  for (const target of [undefined, '', '_blank', '_BLANK', '_top', '_parent', 'ad', 'alert', 'self', 'top']) {
    assert.equal(f.window.open('https://ads.example', target), null);
  }
  assert.equal(f.opens.length, 0);
  // Provider scripts assigning window.open in strict mode must not crash.
  vm.runInContext('"use strict"; window.open = () => "bypass";', f.context);
  assert.equal(f.window.open('https://ads.example'), null);
});

test('allows existing playback frames and leaves top-level provider pages alone', () => {
  const f = fixture({ nested: true });
  for (const target of ['_self', '_parent', 'child']) {
    assert.equal(f.window.open('/player', target), 'native-window');
  }
  assert.equal(f.opens.length, 3);
  const top = fixture({ topLevel: true });
  assert.equal(top.window.open('/help', '_blank'), 'native-window');
});

test('prevents link tab actions while provider playback handlers can still run', () => {
  const f = fixture();
  const anchor = new f.Element('a', { href: 'https://ads.example', target: '_blank' });
  const event = f.fire('click', anchor);
  let playing = false;
  // The provider still receives the click after our capture listener.
  playing = !playing;
  f.window.open('https://ads.example');
  assert.equal(event.defaultPrevented, true);
  assert.equal(playing, true);
  assert.equal(f.opens.length, 0);
  assert.equal(f.fire('click', new f.Element('button')).defaultPrevented, false);
  assert.equal(f.fire('click', new f.Element('a', { href: '/player' })).defaultPrevented, false);
});

test('covers base targets, image maps, modified taps and middle-clicks', () => {
  const f = fixture({ baseTarget: '_blank' });
  assert.equal(f.fire('click', new f.Element('area', { href: '/ads' })).defaultPrevented, true);
  const anchor = new f.Element('a', { href: '/player', target: '_self' });
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey']) {
    assert.equal(f.fire('click', anchor, { [modifier]: true }).defaultPrevented, true);
  }
  assert.equal(f.fire('auxclick', anchor, { button: 1 }).defaultPrevented, true);
});

test('blocks new tabs from normal and programmatic forms but permits same-frame forms', () => {
  const f = fixture();
  const adForm = new f.HTMLFormElement({ target: '_blank' });
  const playerForm = new f.HTMLFormElement({ target: '_self' });
  assert.equal(f.fire('submit', adForm).defaultPrevented, true);
  assert.equal(f.fire('submit', playerForm).defaultPrevented, false);
  assert.equal(f.fire('submit', playerForm, {
    submitter: new f.Element('button', { formtarget: '_blank' }),
  }).defaultPrevented, true);
  adForm.submit();
  playerForm.submit();
  assert.deepEqual(f.submits, [playerForm]);
});

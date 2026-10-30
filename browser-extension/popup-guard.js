// Run in the player's MAIN world before its scripts can cache window.open.
// Only embedded player documents are guarded. Native playback events, media
// requests, same-frame navigation and navigation between child frames continue.
(() => {
  if (window === window.top) return;

  function leavesPlayer(target) {
    const name = String(target || '_self');
    switch (name.toLowerCase()) {
      case '_self': return false;
      case '_parent': return window.parent === window.top;
      case '_top':
      case '_blank':
      case '_unfencedtop': return true;
      default:
        // A named child is an existing browsing context inside this player.
        // An unknown name would create a tab/window.
        try {
          const frame = window.frames[name];
          return !frame || frame === window || frame.parent !== window;
        } catch { return true; }
    }
  }

  const nativeOpen = window.open;
  const guardedOpen = function (url, target, features) {
    if (leavesPlayer(target === undefined || target === '' ? '_blank' : target)) return null;
    return Reflect.apply(nativeOpen, this, [url, target, features]);
  };
  Object.defineProperty(window, 'open', {
    get: () => guardedOpen,
    // Ignore reassignment without throwing in strict provider scripts.
    set: () => {},
    configurable: false,
  });

  function defaultTarget(element) {
    return element.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '_self';
  }

  function guardLink(event) {
    const anchor = event.composedPath().find(node =>
      node instanceof Element && node.matches('a[href], area[href]'));
    if (!anchor) return;
    const newTabGesture = event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1;
    if (newTabGesture || leavesPlayer(defaultTarget(anchor))) event.preventDefault();
    // Keep click handlers running so the same tap can still play/pause video.
  }
  window.addEventListener('click', guardLink, true);
  window.addEventListener('auxclick', guardLink, true);

  window.addEventListener('submit', event => {
    if (!(event.target instanceof HTMLFormElement)) return;
    const target = event.submitter?.getAttribute('formtarget') ?? defaultTarget(event.target);
    if (leavesPlayer(target)) event.preventDefault();
  }, true);

  // form.submit() skips the submit event, so protect that path too.
  const nativeSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    if (leavesPlayer(defaultTarget(this))) return;
    return Reflect.apply(nativeSubmit, this, []);
  };
})();

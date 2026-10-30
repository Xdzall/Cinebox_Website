'use client';

import { useEffect, type RefObject } from 'react';

const modalStack: HTMLElement[] = [];

// Isolate only the current overlay, including when a guide covers the watch dialog.
export function useModalFocus(rootRef: RefObject<HTMLElement>, enabled: boolean, initialRef?: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    modalStack.push(root);
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const changed: HTMLElement[] = [];
    let branch: HTMLElement = root;
    while (branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling instanceof HTMLElement && sibling !== branch && !sibling.hasAttribute('inert') && !sibling.hasAttribute('data-modal-backdrop') && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          sibling.setAttribute('inert', '');
          changed.push(sibling);
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, iframe, [tabindex]'
    )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const focusFirst = () => (initialRef?.current || focusable()[0] || root).focus({ preventScroll: true });
    focusFirst();
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== root) return;
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); root.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (modalStack[modalStack.length - 1] !== root) return;
      if (!root.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      const index = modalStack.lastIndexOf(root);
      if (index >= 0) modalStack.splice(index, 1);
      changed.forEach(element => element.removeAttribute('inert'));
      if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true });
    };
  }, [rootRef, enabled, initialRef]);
}

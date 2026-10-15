'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GENRES, NAV_ITEMS, genreLabel, type NavTarget, type ViewName } from '../lib/types';

interface NavbarProps {
  currentView: ViewName;
  activeGenre: string;
  searchQuery: string;
  myListCount: number;
  searchOpen: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  onSearchOpenChange: (open: boolean) => void;
  onNavigate: (target: NavTarget) => void;
  onGenre: (genre: string) => void;
  onOpenDrawer: () => void;
}

export function isNavActive(target: NavTarget, currentView: ViewName, activeGenre: string, searchQuery: string) {
  if (searchQuery) return false;
  if (target === 'mylist') return currentView === 'mylist';
  return currentView === target && activeGenre === 'Semua';
}

export default function Navbar({
  currentView,
  activeGenre,
  searchQuery,
  myListCount,
  searchOpen,
  searchInputRef,
  onSearchChange,
  onSearchOpenChange,
  onNavigate,
  onGenre,
  onOpenDrawer
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const linksRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!genreOpen) return;
    const close = (event: PointerEvent) => {
      if (!genreRef.current?.contains(event.target as Node)) setGenreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setGenreOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [genreOpen]);

  // Slide the active underline to whichever desktop link is active.
  useLayoutEffect(() => {
    const nav = linksRef.current;
    if (!nav) return;
    const update = () => {
      const active = nav.querySelector<HTMLElement>('.nav-link.active');
      if (!active || nav.offsetWidth === 0) {
        setIndicator(prev => ({ ...prev, visible: false }));
        return;
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth, visible: true });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [currentView, activeGenre, searchQuery, myListCount]);

  const pickGenre = (genre: string) => {
    setGenreOpen(false);
    onGenre(genre);
  };

  return (
    <header className={`site-header ${scrolled || searchOpen ? 'is-solid' : ''}`}>
      <div className="header-inner">
        <button type="button" className="icon-btn header-menu-btn" onClick={onOpenDrawer} aria-label="Buka menu navigasi">
          <i className="fa-solid fa-bars" aria-hidden="true"></i>
        </button>

        <button type="button" className="brand" onClick={() => onNavigate('home')} aria-label="Cinebox, kembali ke Beranda">
          CINEBOX
        </button>

        <nav className="header-links" ref={linksRef} aria-label="Navigasi utama">
          <span
            className={`nav-indicator ${indicator.visible ? 'visible' : ''}`}
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            aria-hidden="true"
          />
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${isNavActive(item.id, currentView, activeGenre, searchQuery) ? 'active' : ''}`}
              aria-current={isNavActive(item.id, currentView, activeGenre, searchQuery) ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
              {item.id === 'mylist' && myListCount > 0 && <span className="nav-count">{myListCount}</span>}
            </button>
          ))}

          <div className="genre-menu" ref={genreRef}>
            <button
              type="button"
              className={`nav-link ${activeGenre !== 'Semua' && !searchQuery ? 'active' : ''}`}
              aria-expanded={genreOpen}
              aria-haspopup="true"
              aria-controls="genre-menu-panel"
              onClick={() => setGenreOpen(open => !open)}
            >
              {activeGenre !== 'Semua' ? genreLabel(activeGenre) : 'Genre'}
              <i className={`fa-solid fa-chevron-down nav-caret ${genreOpen ? 'open' : ''}`} aria-hidden="true"></i>
            </button>
            <div className={`genre-panel ${genreOpen ? 'open' : ''}`} id="genre-menu-panel">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
                  className={activeGenre === genre ? 'active' : ''}
                  onClick={() => pickGenre(genre)}
                  tabIndex={genreOpen ? 0 : -1}
                >
                  {genreLabel(genre)}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="header-actions">
          <div className={`header-search ${searchOpen ? 'open' : ''}`} role="search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Cari judul film atau serial…"
              aria-label="Cari film dan serial TV"
              enterKeyHint="search"
              autoComplete="off"
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={() => { onSearchChange(''); searchInputRef.current?.focus(); }} aria-label="Hapus pencarian">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            )}
            <button type="button" className="search-cancel" onClick={() => { onSearchChange(''); onSearchOpenChange(false); }}>
              Batal
            </button>
          </div>

          <button
            type="button"
            className="icon-btn header-search-toggle"
            onClick={() => onSearchOpenChange(!searchOpen)}
            aria-label={searchOpen ? 'Tutup pencarian' : 'Buka pencarian'}
            aria-expanded={searchOpen}
          >
            <i className={`fa-solid ${searchOpen ? 'fa-xmark' : 'fa-magnifying-glass'}`} aria-hidden="true"></i>
          </button>

          <button type="button" className="avatar-btn" onClick={() => onNavigate('mylist')} aria-label="Daftar Saya" title="Daftar Saya">
            <i className="fa-solid fa-user" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>
  );
}

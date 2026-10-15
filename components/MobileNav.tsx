'use client';

import React, { useEffect, useRef } from 'react';
import { GENRES, NAV_ITEMS, genreLabel, type NavTarget, type ViewName } from '../lib/types';
import { isNavActive } from './Navbar';

interface MobileNavProps {
  drawerOpen: boolean;
  searchOpen: boolean;
  currentView: ViewName;
  activeGenre: string;
  searchQuery: string;
  myListCount: number;
  onCloseDrawer: () => void;
  onNavigate: (target: NavTarget) => void;
  onGenre: (genre: string) => void;
  onOpenSearch: () => void;
}

export function MobileDrawer({
  drawerOpen,
  currentView,
  activeGenre,
  searchQuery,
  myListCount,
  onCloseDrawer,
  onNavigate,
  onGenre
}: Omit<MobileNavProps, 'onOpenSearch' | 'searchOpen'>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // `inert` keeps the off-screen drawer out of the tab order (React 18 has no prop for it).
    drawerRef.current?.toggleAttribute('inert', !drawerOpen);
    if (drawerOpen) closeRef.current?.focus();
  }, [drawerOpen]);

  return (
    <>
      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={onCloseDrawer} aria-hidden="true" />
      <aside
        className={`side-drawer ${drawerOpen ? 'open' : ''}`}
        aria-label="Menu navigasi"
        ref={drawerRef}
      >
        <div className="drawer-header">
          <span className="brand">CINEBOX</span>
          <button type="button" ref={closeRef} className="icon-btn" onClick={onCloseDrawer} aria-label="Tutup menu">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <nav className="drawer-links">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`drawer-link ${isNavActive(item.id, currentView, activeGenre, searchQuery) ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
              {item.id === 'mylist' && myListCount > 0 && <span className="nav-count">{myListCount}</span>}
            </button>
          ))}
        </nav>

        <p className="drawer-section-title">Genre</p>
        <div className="drawer-genres">
          {GENRES.map(genre => (
            <button
              key={genre}
              type="button"
              className={activeGenre === genre && !searchQuery ? 'active' : ''}
              onClick={() => onGenre(genre)}
            >
              {genreLabel(genre)}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

const BOTTOM_ITEMS: NavTarget[] = ['home', 'tv', 'movie', 'mylist'];

export function BottomNav({
  currentView,
  activeGenre,
  searchQuery,
  searchOpen,
  onNavigate,
  onOpenSearch
}: Pick<MobileNavProps, 'currentView' | 'activeGenre' | 'searchQuery' | 'searchOpen' | 'onNavigate' | 'onOpenSearch'>) {
  const items = NAV_ITEMS.filter(item => BOTTOM_ITEMS.includes(item.id));
  const searchActive = searchOpen || Boolean(searchQuery);

  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {items.slice(0, 3).map(item => (
        <BottomItem key={item.id} icon={item.icon} label={item.id === 'tv' ? 'Serial' : item.label}
          active={!searchActive && isNavActive(item.id, currentView, activeGenre, searchQuery)}
          onClick={() => onNavigate(item.id)} />
      ))}
      <BottomItem icon="fa-magnifying-glass" label="Cari" active={searchActive} onClick={onOpenSearch} />
      <BottomItem icon="fa-bookmark" label="Daftar" active={!searchActive && currentView === 'mylist'} onClick={() => onNavigate('mylist')} />
    </nav>
  );
}

function BottomItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`bottom-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      <span>{label}</span>
    </button>
  );
}

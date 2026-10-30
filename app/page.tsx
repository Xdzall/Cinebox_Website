'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { BottomNav, MobileDrawer } from '../components/MobileNav';
import Hero from '../components/Hero';
import WatchModal from '../components/WatchModal';
import PlayerGuide from '../components/PlayerGuide';
import { MediaGrid, MediaRow, SkeletonGrid, SkeletonRow, type CardActions } from '../components/MediaCards';
import { readPersonalLists, writeStored, STORAGE_KEYS } from '../lib/storage';
import { navigationUrl, parseNavigation, type NavigationState } from '../lib/navigation';
import { GENRES, genreLabel, type CatalogData, type MovieItem, type NavTarget, type ViewName } from '../lib/types';

type Toast = { id: number; msg: string; type: 'info' | 'success' | 'error' };

const QUICK_GENRES = ['Aksi', 'Horor', 'Korea', 'Animasi', 'Sci-Fi', 'Komedi'];

const genresOf = (item: MovieItem) =>
  Array.isArray(item.genre) ? item.genre : (item.genre || '').split(',').map(s => s.trim()).filter(Boolean);

export default function CineboxHomePage() {
  // Navigation & catalog
  const [currentView, setCurrentView] = useState<ViewName>('home');
  const [activeGenre, setActiveGenre] = useState('Semua');
  const [catalog, setCatalog] = useState<CatalogData>({ featured: [], sections: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const catalogRequestRef = useRef(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  // Personal lists (localStorage)
  const [myList, setMyList] = useState<MovieItem[]>([]);
  const [likedList, setLikedList] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<MovieItem[]>([]);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [searchFilter, setSearchFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);

  // Watch modal
  const [watchItem, setWatchItem] = useState<{ item: MovieItem; autoPlay: boolean; nonce: number } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    const stored = readPersonalLists();
    setMyList(stored.myList);
    setLikedList(stored.liked);
    setWatchHistory(stored.history);
  }, []);

  // Lock page scroll behind overlays.
  useEffect(() => {
    const locked = Boolean(watchItem) || drawerOpen || guideOpen;
    document.documentElement.classList.toggle('scroll-locked', locked);
    return () => document.documentElement.classList.remove('scroll-locked');
  }, [watchItem, drawerOpen, guideOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const myListIds = useMemo(() => new Set(myList.map(i => i.id)), [myList]);
  const likedIds = useMemo(() => new Set(likedList), [likedList]);

  const recordWatchHistory = useCallback((item: MovieItem, season = 1, episode = 1) => {
    setWatchHistory(prev => {
      const { matchScore, ...rest } = item;
      const updated = [{ ...rest, lastSeason: season, lastEpisode: episode }, ...prev.filter(i => i.id !== item.id)].slice(0, 15);
      writeStored(STORAGE_KEYS.history, updated);
      return updated;
    });
  }, []);

  const toggleMyList = useCallback((item: MovieItem) => {
    const exists = myListIds.has(item.id);
    setMyList(prev => {
      const updated = exists ? prev.filter(i => i.id !== item.id) : [item, ...prev.filter(i => i.id !== item.id)];
      writeStored(STORAGE_KEYS.myList, updated);
      return updated;
    });
    showToast(exists ? `Dihapus dari Daftar Saya: "${item.title}"` : `Disimpan ke Daftar Saya: "${item.title}"`, exists ? 'info' : 'success');
  }, [myListIds, showToast]);

  const toggleLike = useCallback((item: MovieItem) => {
    const exists = likedIds.has(item.id);
    setLikedList(prev => {
      const updated = exists ? prev.filter(i => i !== item.id) : [...prev, item.id];
      writeStored(STORAGE_KEYS.liked, updated);
      return updated;
    });
    showToast(exists ? `Batal menyukai "${item.title}"` : `Anda menyukai "${item.title}"`, exists ? 'info' : 'success');
  }, [likedIds, showToast]);

  const loadCatalog = useCallback(async (view: ViewName, genre: string) => {
    if (view === 'mylist') return;
    const requestId = ++catalogRequestRef.current;
    setIsLoading(true);
    setLoadError(false);
    try {
      let data: CatalogData;
      if (view === 'popular') {
        const [movieRes, tvRes] = await Promise.all([fetch('/api/catalog?type=movie'), fetch('/api/catalog?type=tv')]);
        if (!movieRes.ok || !tvRes.ok) throw new Error('Katalog populer tidak tersedia');
        const [movieData, tvData]: CatalogData[] = await Promise.all([movieRes.json(), tvRes.json()]);
        const moviePopular = movieData.sections?.find(s => s.id === 'movie_pop')?.items || movieData.featured || [];
        const tvPopular = tvData.sections?.find(s => s.id === 'tv_pop')?.items || tvData.featured || [];
        const unique = Array.from(new Map([...moviePopular, ...tvPopular].map(i => [i.id, i] as const)).values());
        const latest = [...unique].sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || Number(b.rating || 0) - Number(a.rating || 0));
        data = {
          view: 'popular',
          title: 'Terbaru & Populer',
          featured: [...moviePopular.slice(0, 4), ...tvPopular.slice(0, 4)],
          sections: [
            { id: 'latest', title: 'Terbaru di Pilihan Populer', items: latest.slice(0, 28) },
            { id: 'popular_movies', title: 'Film Populer', items: moviePopular },
            { id: 'popular_series', title: 'Serial TV Populer', items: tvPopular }
          ]
        };
      } else {
        const type = view === 'genre' ? 'home' : view;
        const genreParam = genre !== 'Semua' ? `&genre=${encodeURIComponent(genre)}` : '';
        const res = await fetch(`/api/catalog?type=${encodeURIComponent(type)}${genreParam}`);
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!res.ok) throw new Error('Katalog tidak tersedia');
        data = await res.json();
      }
      if (requestId === catalogRequestRef.current) setCatalog(data);
    } catch (err) {
      if (requestId === catalogRequestRef.current) {
        console.error('Error fetching catalog:', err);
        setLoadError(true);
      }
    } finally {
      if (requestId === catalogRequestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (navigationReady) loadCatalog(currentView, activeGenre);
  }, [currentView, activeGenre, loadCatalog, navigationReady]);

  const updateUrl = (changes: Partial<NavigationState>, replace = false) => {
    const state = { view: currentView, genre: activeGenre, query: searchQuery, searchOpen, filter: searchFilter, ...changes };
    const url = navigationUrl(state);
    if (url !== window.location.pathname + window.location.search) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    }
  };

  const resetSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchRequestRef.current++;
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setSearchOpen(false);
    setSearchError(false);
  };

  const handleNavigate = (target: NavTarget) => {
    updateUrl({ view: target, genre: 'Semua', query: '', searchOpen: false });
    resetSearch();
    setCurrentView(target);
    setActiveGenre('Semua');
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenre = (genre: string) => {
    updateUrl({ view: 'genre', genre, query: '', searchOpen: false });
    resetSearch();
    setCurrentView('genre');
    setActiveGenre(genre);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runSearch = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const query = value.trim();
    const requestId = ++searchRequestRef.current;
    setSearchError(false);
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.status === 401) { window.location.replace('/login'); return; }
        if (!res.ok) throw new Error('Search unavailable');
        const results: MovieItem[] = await res.json();
        if (!Array.isArray(results)) throw new Error('Invalid search response');
        if (requestId === searchRequestRef.current) setSearchResults(results);
      } catch (err) {
        if (requestId === searchRequestRef.current) {
          setSearchResults([]);
          setSearchError(true);
        }
      } finally {
        if (requestId === searchRequestRef.current) setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    const restore = () => {
      const state = parseNavigation(window.location.search);
      setCurrentView(state.view);
      setActiveGenre(state.genre);
      setSearchQuery(state.query);
      setSearchOpen(state.searchOpen);
      setSearchFilter(state.filter);
      setDrawerOpen(false);
      setGuideOpen(false);
      setWatchItem(null);
      runSearch(state.query);
      setNavigationReady(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchRequestRef.current++;
    };
  }, [runSearch]);

  const handleSearchChange = (value: string) => {
    updateUrl({ query: value, searchOpen: true }, true);
    setSearchOpen(true);
    setSearchQuery(value);
    runSearch(value);
  };

  const openSearch = (open: boolean) => {
    updateUrl({ searchOpen: open, ...(open ? {} : { query: '' }) });
    if (!open) resetSearch();
    setSearchOpen(open);
    setDrawerOpen(false);
    if (open) {
      window.scrollTo({ top: 0 });
      // Focus after the input becomes visible on small screens.
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  const quickSearch = (term: string) => {
    updateUrl({ query: term, searchOpen: true });
    setSearchQuery(term);
    runSearch(term);
  };

  const openWatch = useCallback((item: MovieItem, autoPlay = false) => {
    setWatchItem({ item, autoPlay, nonce: Date.now() });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login');
    }
  }, []);

  const closeWatch = useCallback(() => setWatchItem(null), []);
  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const cardActions: CardActions = useMemo(() => ({
    onOpen: item => openWatch(item, false),
    onPlay: item => openWatch(item, true),
    onToggleList: toggleMyList,
    onToggleLike: toggleLike,
    isAdded: id => myListIds.has(id),
    isLiked: id => likedIds.has(id)
  }), [openWatch, toggleMyList, toggleLike, myListIds, likedIds]);

  const recommendations = useMemo(() => {
    const selected = watchItem?.item;
    if (!selected) return [];
    const currentGenres = genresOf(selected);
    const unique = new Map<string, MovieItem>();
    [...(catalog.sections || []).flatMap(s => s.items), ...(catalog.featured || [])].forEach(it => {
      if (it.id === selected.id || unique.has(it.id)) return;
      unique.set(it.id, { ...it, matchScore: genresOf(it).filter(g => currentGenres.includes(g)).length });
    });
    return Array.from(unique.values()).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 12);
  }, [watchItem, catalog]);

  const filteredResults = searchResults.filter(it => searchFilter === 'all' || it.type === searchFilter);
  const showSearch = Boolean(searchQuery) || searchOpen;
  const viewKey = showSearch ? 'search' : `${currentView}:${activeGenre}`;
  const pageTitle = currentView === 'genre' ? `Genre: ${genreLabel(activeGenre)}` : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Langsung ke konten</a>

      <Navbar
        currentView={currentView}
        activeGenre={activeGenre}
        searchQuery={searchQuery}
        myListCount={myList.length}
        searchOpen={searchOpen}
        searchInputRef={searchInputRef}
        onSearchChange={handleSearchChange}
        onSearchOpenChange={openSearch}
        onNavigate={handleNavigate}
        onGenre={handleGenre}
        onOpenDrawer={() => setDrawerOpen(true)}
        onLogout={handleLogout}
      />

      <MobileDrawer
        drawerOpen={drawerOpen}
        currentView={currentView}
        activeGenre={activeGenre}
        searchQuery={searchQuery}
        myListCount={myList.length}
        onCloseDrawer={() => setDrawerOpen(false)}
        onNavigate={handleNavigate}
        onGenre={handleGenre}
        onLogout={handleLogout}
      />

      <main id="main" className="page-main view-enter" key={viewKey}>
        {showSearch ? (
          <section className="page-section search-page" aria-labelledby="search-heading">
            <div className="page-heading">
              <div>
                <h1 id="search-heading">{searchQuery.trim() ? <>Hasil untuk &ldquo;{searchQuery.trim()}&rdquo;</> : 'Cari film & serial'}</h1>
                <p aria-live="polite">{searchError ? 'Sumber pencarian sedang tidak tersedia.' : searchQuery.trim().length >= 2 && !isSearching ? `${filteredResults.length} judul ditemukan` : 'Ketik minimal 2 huruf untuk mencari.'}</p>
              </div>
              <div className="segmented" role="group" aria-label="Filter jenis">
                {([['all', 'Semua'], ['movie', 'Film'], ['tv', 'Serial TV']] as const).map(([value, label]) => (
                  <button key={value} type="button" className={searchFilter === value ? 'active' : ''} aria-pressed={searchFilter === value} onClick={() => { updateUrl({ filter: value }, true); setSearchFilter(value); }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="chip-row">
              <span className="chip-row-label">Jelajahi genre:</span>
              {QUICK_GENRES.map(genre => (
                <button key={genre} type="button" className="chip" onClick={() => handleGenre(genre)}>{genreLabel(genre)}</button>
              ))}
              <button type="button" className="chip" onClick={() => quickSearch('Marvel')}>Cari “Marvel”</button>
            </div>

            {isSearching ? (
              <SkeletonGrid />
            ) : searchQuery.trim().length < 2 ? (
              <div className="empty-state">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <p>Cari berdasarkan judul, misalnya &ldquo;Interstellar&rdquo; atau &ldquo;Squid Game&rdquo;.</p>
              </div>
            ) : searchError ? (
              <div className="empty-state" role="alert">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <p>Pencarian gagal dimuat. Periksa koneksi lalu coba lagi.</p>
                <button type="button" className="btn btn-light" onClick={() => runSearch(searchQuery)}>Coba lagi</button>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-face-frown" aria-hidden="true"></i>
                <p>Tidak ada judul yang cocok. Coba kata kunci lain atau ubah filter.</p>
              </div>
            ) : (
              <MediaGrid items={filteredResults} actions={cardActions} />
            )}
          </section>
        ) : currentView === 'mylist' ? (
          <section className="page-section" aria-labelledby="mylist-heading">
            <div className="page-heading">
              <div>
                <h1 id="mylist-heading">Daftar Saya</h1>
                <p>{myList.length} judul tersimpan di browser ini</p>
              </div>
            </div>
            {myList.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-bookmark" aria-hidden="true"></i>
                <p>Daftar Saya masih kosong. Tekan tombol <strong>+</strong> pada judul favorit untuk menyimpannya.</p>
                <button type="button" className="btn btn-light" onClick={() => handleNavigate('home')}>Jelajahi Beranda</button>
              </div>
            ) : (
              <MediaGrid items={myList} actions={cardActions} />
            )}
          </section>
        ) : (
          <>
            {isLoading && !catalog.featured?.length ? (
              <div className="hero hero-skeleton skeleton" aria-hidden="true" />
            ) : (
              <Hero
                featured={catalog.featured || []}
                paused={Boolean(watchItem) || drawerOpen}
                isAdded={cardActions.isAdded}
                onPlay={item => openWatch(item, true)}
                onInfo={item => openWatch(item, false)}
                onToggleList={toggleMyList}
              />
            )}

            <div className="rows">
              {pageTitle && (
                <div className="genre-strip">
                  <h1>{pageTitle}</h1>
                  <div className="chip-row">
                    {GENRES.map(genre => (
                      <button key={genre} type="button" className={`chip ${genre === activeGenre ? 'active' : ''}`} onClick={() => handleGenre(genre)}>
                        {genreLabel(genre)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {watchHistory.length > 0 && currentView === 'home' && (
                <MediaRow title="Lanjutkan Menonton" items={watchHistory} actions={cardActions} showProgress />
              )}

              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : loadError ? (
                <div className="empty-state">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  <p>Katalog gagal dimuat. Periksa koneksi lalu coba lagi.</p>
                  <button type="button" className="btn btn-light" onClick={() => loadCatalog(currentView, activeGenre)}>Coba lagi</button>
                </div>
              ) : (
                catalog.sections?.map(section => section.items.length === 0 && currentView === 'genre' ? (
                  <section className="media-row" key={section.id} aria-label={section.title}>
                    <h2 className="row-title">{section.title}</h2>
                    <p className="empty-note">Belum ada judul yang sesuai kategori ini dalam katalog.</p>
                  </section>
                ) : (
                  <MediaRow
                    key={section.id}
                    title={section.title}
                    items={section.items}
                    actions={cardActions}
                    top10={Boolean(section.isTop10 || section.id.includes('top_10'))}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="brand">CINEBOX</span>
          <p className="footer-tagline">Temukan film dan serial pilihan. Ketersediaan video dan subtitle mengikuti sumber pemutar.</p>
          <div className="footer-links">
            <button type="button" onClick={() => handleNavigate('home')}>Beranda</button>
            <button type="button" onClick={() => handleNavigate('movie')}>Film</button>
            <button type="button" onClick={() => handleNavigate('tv')}>Serial TV</button>
            <button type="button" onClick={() => handleNavigate('popular')}>Terbaru & Populer</button>
            <button type="button" onClick={() => handleNavigate('mylist')}>Daftar Saya</button>
            <button type="button" onClick={() => handleGenre('Aksi')}>Aksi</button>
            <button type="button" onClick={() => handleGenre('Drama')}>Drama</button>
            <button type="button" onClick={() => handleGenre('Korea')}>Drama Korea</button>
          </div>
          <p className="footer-copy">&copy; 2026 Cinebox.</p>
        </div>
      </footer>

      <BottomNav
        currentView={currentView}
        activeGenre={activeGenre}
        searchQuery={searchQuery}
        searchOpen={searchOpen}
        onNavigate={handleNavigate}
        onOpenSearch={() => openSearch(true)}
      />

      {watchItem && (
        <WatchModal
          key={`${watchItem.item.id}-${watchItem.nonce}`}
          item={watchItem.item}
          autoPlay={watchItem.autoPlay}
          recommendations={recommendations}
          guideOpen={guideOpen}
          isAdded={myListIds.has(watchItem.item.id)}
          isLiked={likedIds.has(watchItem.item.id)}
          onClose={closeWatch}
          onOpenItem={openWatch}
          onToggleList={toggleMyList}
          onToggleLike={toggleLike}
          onRecordHistory={recordWatchHistory}
          onOpenGuide={openGuide}
          onToast={showToast}
        />
      )}

      {guideOpen && <PlayerGuide onClose={closeGuide} />}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <i className={`fa-solid ${t.type === 'success' ? 'fa-circle-check' : t.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}`} aria-hidden="true"></i>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

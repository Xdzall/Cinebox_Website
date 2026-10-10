'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getStreamServers, type StreamServer } from '../lib/stream-servers';

interface TvEpisode {
  episode: number;
  title: string;
}

interface TvDetails {
  season_numbers?: number[];
  seasons?: Record<string, { season: number; episodes: TvEpisode[] }>;
}

interface MovieItem {
  id: string;
  title: string;
  year?: string;
  type?: string;
  typeLabel?: string;
  rating?: string;
  quality?: string;
  poster?: string;
  backdrop?: string;
  desc?: string;
  genre?: string[] | string;
  cast?: string;
  trailer_yt?: string;
  matchScore?: number;
  lastSeason?: number;
  lastEpisode?: number;
}

interface SectionItem {
  id: string;
  title: string;
  items: MovieItem[];
}

interface CatalogData {
  view?: string;
  title?: string;
  version?: number;
  featured?: MovieItem[];
  sections?: SectionItem[];
}

export default function CineboxNetflixHomePage() {
  // Navigation & Catalog States
  const [currentView, setCurrentView] = useState<'home' | 'movie' | 'tv' | 'popular' | 'mylist' | 'genre'>('home');
  const [activeGenre, setActiveGenre] = useState<string>('Semua');
  const desktopNavRef = useRef<HTMLElement>(null);
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, visible: false });
  const [catalog, setCatalog] = useState<CatalogData>({ featured: [], sections: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mobile Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // My List (Daftar Saya) Watchlist State
  const [myList, setMyList] = useState<MovieItem[]>([]);

  // Liked Titles
  const [likedList, setLikedList] = useState<string[]>([]);

  // Continue Watching / Watch History State
  const [watchHistory, setWatchHistory] = useState<MovieItem[]>([]);

  // Hero Spotlight States
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [heroTrailerId, setHeroTrailerId] = useState<string>('');
  const [isHeroHovered, setIsHeroHovered] = useState<boolean>(false);
  const [isHeroMuted, setIsHeroMuted] = useState<boolean>(true);
  const heroCycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [searchFilter, setSearchFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cinema Watch Modal States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [modalTrailerId, setModalTrailerId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isModalMuted, setIsModalMuted] = useState<boolean>(true);
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);

  // In-player episode navigation
  const [inplayerEpDrawerOpen, setInplayerEpDrawerOpen] = useState<boolean>(false);

  // TV Series Seasons/Episodes States
  const [tvDetails, setTvDetails] = useState<TvDetails | null>(null);
  const [tvDetailsLoading, setTvDetailsLoading] = useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const modalRequestRef = useRef(0);

  // Toast System
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);

  const showToast = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Body Scroll Lock for Modal and Mobile Drawer
  useEffect(() => {
    if (modalOpen || mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen, mobileDrawerOpen]);

  // Load Saved Data from LocalStorage on mount
  useEffect(() => {
    try {
      const savedList = localStorage.getItem('cinebox_netflix_my_list');
      if (savedList) setMyList(JSON.parse(savedList));

      const savedLikes = localStorage.getItem('cinebox_netflix_liked');
      if (savedLikes) setLikedList(JSON.parse(savedLikes));

      const savedHistory = localStorage.getItem('cinebox_netflix_watch_history');
      if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
    } catch (e) {}
  }, []);

  // Save to Watch History
  const recordWatchHistory = useCallback((item: MovieItem, s = 1, e = 1) => {
    setWatchHistory(prev => {
      const filtered = prev.filter(i => i.id !== item.id);
      const updated = [{ ...item, lastSeason: s, lastEpisode: e }, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('cinebox_netflix_watch_history', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  }, []);

  // Toggle My List Item
  const toggleMyList = useCallback((item: MovieItem) => {
    setMyList(prev => {
      const exists = prev.some(i => i.id === item.id);
      let updated: MovieItem[];
      if (exists) {
        updated = prev.filter(i => i.id !== item.id);
        showToast(`Dihapus dari Daftar Saya: "${item.title}"`, 'info');
      } else {
        updated = [item, ...prev];
        showToast(`Ditambahkan ke Daftar Saya: "${item.title}"`, 'success');
      }
      try {
        localStorage.setItem('cinebox_netflix_my_list', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [showToast]);

  // Toggle Like Item
  const toggleLike = useCallback((id: string, title: string) => {
    setLikedList(prev => {
      const exists = prev.includes(id);
      let updated: string[];
      if (exists) {
        updated = prev.filter(i => i !== id);
        showToast(`Batal menyukai "${title}"`, 'info');
      } else {
        updated = [...prev, id];
        showToast(`Anda menyukai "${title}" 👍`, 'success');
      }
      try {
        localStorage.setItem('cinebox_netflix_liked', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [showToast]);

  // Fetch Multi-Catalog from Next.js API
  const loadCatalog = useCallback(async (type = 'home', genre = 'Semua') => {
    try {
      setIsLoading(true);
      let url = `/api/catalog?type=${encodeURIComponent(type)}`;
      if (genre && genre !== 'Semua') {
        url += `&genre=${encodeURIComponent(genre)}`;
      }

      const res = await fetch(url);
      const data: CatalogData = await res.json();
      setCatalog(data);
      setHeroIndex(0);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadCatalog(currentView === 'popular' ? 'home' : currentView, activeGenre);
  }, [currentView, activeGenre, loadCatalog]);

  // Keep the desktop active indicator aligned while labels and viewport sizes change.
  useEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return;
    const updateIndicator = () => {
      const active = nav.querySelector<HTMLElement>('.nav-link.active');
      if (!active || nav.getBoundingClientRect().width === 0) {
        setNavIndicator(previous => ({ ...previous, visible: false }));
        return;
      }
      const navBounds = nav.getBoundingClientRect();
      const activeBounds = active.getBoundingClientRect();
      setNavIndicator({ left: activeBounds.left - navBounds.left, width: activeBounds.width, visible: true });
    };
    const frame = requestAnimationFrame(updateIndicator);
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(nav);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [currentView, activeGenre, searchQuery, myList.length]);

  // Dynamically resolve exact Hero Trailer whenever hero changes
  const currentHero = catalog.featured && catalog.featured[heroIndex] ? catalog.featured[heroIndex] : null;

  useEffect(() => {
    if (!currentHero) return;

    let isSubscribed = true;
    const fetchHeroTrailer = async () => {
      try {
        const res = await fetch(`/api/trailer?title=${encodeURIComponent(currentHero.title)}&id=${currentHero.id}&type=${currentHero.type || 'movie'}`);
        const data = await res.json();
        if (isSubscribed && data.trailer_id) {
          setHeroTrailerId(data.trailer_id);
        }
      } catch (e) {
        if (isSubscribed) {
          setHeroTrailerId(currentHero.trailer_yt || '73_1biulkYk');
        }
      }
    };

    fetchHeroTrailer();
    return () => {
      isSubscribed = false;
    };
  }, [currentHero]);

  // Hero Auto Slide Cycle
  useEffect(() => {
    if (heroCycleTimerRef.current) clearInterval(heroCycleTimerRef.current);
    if (!catalog.featured || catalog.featured.length <= 1 || isHeroHovered || modalOpen || searchQuery) return;

    heroCycleTimerRef.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % (catalog.featured?.length || 1));
    }, 12000);

    return () => {
      if (heroCycleTimerRef.current) clearInterval(heroCycleTimerRef.current);
    };
  }, [catalog.featured, isHeroHovered, modalOpen, searchQuery]);

  // Navigation Click Handler
  const handleNavSwitch = (target: 'home' | 'movie' | 'tv' | 'popular' | 'mylist') => {
    setCurrentView(target);
    setActiveGenre('Semua');
    setSearchQuery('');
    setSearchResults([]);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const label = target === 'movie' ? 'Film' : target === 'tv' ? 'Serial TV' : target === 'popular' ? 'Terbaru & Populer' : target === 'mylist' ? 'Daftar Saya' : 'Beranda';
    showToast(`Membuka ${label}...`, 'info');
  };

  // Focus Search from Mobile Bottom Nav
  const handleFocusSearch = () => {
    setMobileDrawerOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Genre Selection Handler
  const handleGenreSelect = (genreName: string) => {
    setCurrentView('genre');
    setActiveGenre(genreName);
    setSearchQuery('');
    setSearchResults([]);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Kategori: ${genreName}`, 'info');
  };

  // Live Search Handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
          const results = await res.json();
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Quick Trending Tag Search
  const handleTrendingTagClick = (tag: string) => {
    setSearchQuery(tag);
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(tag)}`)
      .then(res => res.json())
      .then(results => setSearchResults(results))
      .catch(err => console.error(err))
      .finally(() => setIsSearching(false));
  };

  // Open Cinema Watch Modal
  const handleOpenWatchModal = (item: MovieItem, autoPlay = false) => {
    const requestId = ++modalRequestRef.current;
    setSelectedMovie(item);
    setIsPlaying(autoPlay);
    setIsModalMuted(true);
    setActiveServerIndex(0);
    const startS = item.lastSeason || 1;
    const startE = item.lastEpisode || 1;
    setSelectedSeason(startS);
    setSelectedEpisode(startE);
    setInplayerEpDrawerOpen(false);
    setServers(getStreamServers(item.id, item.type === 'tv' ? 'tv' : 'movie', startS, startE));
    setTvDetails(null);
    setTvDetailsLoading(item.type === 'tv');
    setModalTrailerId('');
    setModalOpen(true);

    if (autoPlay) {
      recordWatchHistory(item, startS, startE);
    }

    // Ignore stale responses when another title is opened before these requests finish.
    fetch(`/api/trailer?title=${encodeURIComponent(item.title)}&id=${item.id}&type=${item.type || 'movie'}`)
      .then(res => res.json())
      .then(data => {
        if (modalRequestRef.current === requestId) {
          setModalTrailerId(data.trailer_id || item.trailer_yt || '');
        }
      })
      .catch(() => {
        if (modalRequestRef.current === requestId) setModalTrailerId(item.trailer_yt || '');
      });

    // Fetch TV Details if series
    if (item.type === 'tv') {
      fetch(`/api/tv/details?id=${item.id}`)
        .then(res => res.json())
        .then((tvData: TvDetails) => {
          if (modalRequestRef.current !== requestId) return;
          setTvDetails(tvData);
          const seasonNumbers = tvData.season_numbers || [];
          if (seasonNumbers.length > 0) {
            const season = seasonNumbers.includes(startS) ? startS : seasonNumbers[0];
            const episodeNumbers = tvData.seasons?.[String(season)]?.episodes?.map(ep => ep.episode) || [];
            const episode = episodeNumbers.includes(startE) ? startE : (episodeNumbers[0] || startE);
            setSelectedSeason(season);
            setSelectedEpisode(episode);
            setServers(getStreamServers(item.id, 'tv', season, episode));
          }
        })
        .catch(err => console.error('TV details error:', err))
        .finally(() => {
          if (modalRequestRef.current === requestId) setTvDetailsLoading(false);
        });
    }
  };

  // Close Modal
  const handleCloseModal = () => {
    modalRequestRef.current += 1;
    setModalOpen(false);
    setIsPlaying(false);
    setInplayerEpDrawerOpen(false);
    setSelectedMovie(null);
  };

  // Start Playing Stream
  const handleStartStream = () => {
    if (isPlaying) {
      document.getElementById('cinemaPlayerArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsPlaying(true);
    if (selectedMovie) {
      recordWatchHistory(selectedMovie, selectedSeason, selectedEpisode);
    }
    showToast('Pemutar dibuka. Pilih subtitle melalui tombol CC di dalam video jika tersedia.', 'info');
  };

  // Global Keyboard Shortcuts (Esc to close, F for fullscreen, M for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inplayerEpDrawerOpen) {
          setInplayerEpDrawerOpen(false);
        } else if (modalOpen) {
          handleCloseModal();
        } else if (mobileDrawerOpen) {
          setMobileDrawerOpen(false);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (modalOpen && !document.fullscreenElement) {
          const area = document.getElementById('cinemaPlayerArea');
          if (area && area.requestFullscreen) {
            area.requestFullscreen().catch(() => {});
          }
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (modalOpen && !isPlaying) {
          setIsModalMuted(prev => !prev);
        } else if (!modalOpen) {
          setIsHeroMuted(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, mobileDrawerOpen, inplayerEpDrawerOpen, isPlaying]);

  // Explicit server switching: iframe failures cannot be detected reliably.
  const handleNextServerFailover = () => {
    if (servers.length <= 1) return;
    const nextIdx = (activeServerIndex + 1) % servers.length;
    setActiveServerIndex(nextIdx);
    showToast(`Beralih ke ${servers[nextIdx]?.name || `Server ${nextIdx + 1}`}`, 'info');
  };

  // Change TV Season
  const handleSeasonChange = (sNum: number) => {
    const firstEpisode = tvDetails?.seasons?.[String(sNum)]?.episodes?.[0]?.episode || 1;
    setSelectedSeason(sNum);
    setSelectedEpisode(firstEpisode);
    setActiveServerIndex(0);
    if (selectedMovie) {
      setServers(getStreamServers(selectedMovie.id, 'tv', sNum, firstEpisode));
      if (isPlaying) recordWatchHistory(selectedMovie, sNum, firstEpisode);
    }
  };

  // Change TV episode only when it appears in the fetched episode list.
  const handleEpisodeChange = (epNum: number) => {
    const episodes = tvDetails?.seasons?.[String(selectedSeason)]?.episodes || [];
    if (!episodes.some(ep => ep.episode === epNum)) {
      showToast('Episode ini belum tersedia dalam daftar.', 'error');
      return;
    }
    setSelectedEpisode(epNum);
    setActiveServerIndex(0);
    setInplayerEpDrawerOpen(false);
    if (selectedMovie) {
      setServers(getStreamServers(selectedMovie.id, 'tv', selectedSeason, epNum));
      setIsPlaying(true);
      recordWatchHistory(selectedMovie, selectedSeason, epNum);
      showToast(`Membuka Season ${selectedSeason} • Episode ${epNum}`, 'info');
    }
  };

  // Calculate "Lainnya Seperti Ini" (More Like This) recommendations
  const moreLikeThisItems = useMemo(() => {
    if (!selectedMovie) return [];

    const allItems: MovieItem[] = [];
    catalog.sections?.forEach(sec => allItems.push(...sec.items));
    if (catalog.featured) allItems.push(...catalog.featured);

    const currentGenres = Array.isArray(selectedMovie.genre)
      ? selectedMovie.genre
      : (selectedMovie.genre || '').split(',').map(s => s.trim());

    // Deduplicate & score by matching genres
    const uniqueMap = new Map<string, MovieItem>();
    allItems.forEach(it => {
      if (it.id !== selectedMovie.id && !uniqueMap.has(it.id)) {
        const itGenres = Array.isArray(it.genre)
          ? it.genre
          : (it.genre || '').split(',').map(s => s.trim());

        const matchCount = itGenres.filter(g => currentGenres.includes(g)).length;
        const matchScore = matchCount;

        uniqueMap.set(it.id, {
          ...it,
          matchScore
        });
      }
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 12);
  }, [selectedMovie, catalog]);

  const availableEpisodes = tvDetails?.seasons?.[String(selectedSeason)]?.episodes || [];
  const nextEpisode = availableEpisodes
    .filter(ep => ep.episode > selectedEpisode)
    .sort((a, b) => a.episode - b.episode)[0];

  return (
    <div className="cinebox-theme">
      {/* 1. Header Navigation Bar (Netflix Glassmorphic Header) */}
      <header className="cinebox-navbar" id="cineboxNav">
        <div className="nav-container">
          <div className="nav-left">
            {/* Mobile Hamburger Button */}
            <button
              className="mobile-hamburger-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Buka Menu Navigasi"
            >
              <i className="fa-solid fa-bars"></i>
            </button>

            <div className="cinebox-logo" onClick={() => handleNavSwitch('home')}>
              <span className="logo-netflix-text">CINEBOX</span>
            </div>

            {/* Desktop / Tablet Menu */}
            <nav className="nav-menu" ref={desktopNavRef} aria-label="Navigasi utama">
              <span
                className={`nav-active-indicator ${navIndicator.visible ? 'visible' : ''}`}
                style={{ transform: `translateX(${navIndicator.left}px)`, width: navIndicator.width }}
                aria-hidden="true"
              />
              <button
                className={`nav-link ${currentView === 'home' && activeGenre === 'Semua' && !searchQuery ? 'active' : ''}`}
                onClick={() => handleNavSwitch('home')}
              >
                Beranda
              </button>
              <button
                className={`nav-link ${currentView === 'tv' && activeGenre === 'Semua' && !searchQuery ? 'active' : ''}`}
                onClick={() => handleNavSwitch('tv')}
              >
                Serial TV
              </button>
              <button
                className={`nav-link ${currentView === 'movie' && activeGenre === 'Semua' && !searchQuery ? 'active' : ''}`}
                onClick={() => handleNavSwitch('movie')}
              >
                Film
              </button>
              <button
                className={`nav-link ${currentView === 'popular' && activeGenre === 'Semua' && !searchQuery ? 'active' : ''}`}
                onClick={() => handleNavSwitch('popular')}
              >
                Terbaru & Populer
              </button>
              <button
                className={`nav-link ${currentView === 'mylist' ? 'active' : ''}`}
                onClick={() => handleNavSwitch('mylist')}
              >
                Daftar Saya {myList.length > 0 && `(${myList.length})`}
              </button>

              {/* Genre Dropdown */}
              <div className="nav-dropdown">
                <span className={`nav-link dropdown-toggle ${activeGenre !== 'Semua' ? 'active' : ''}`}>
                  {activeGenre !== 'Semua' ? `Genre: ${activeGenre}` : 'Kategori Genre'} <i className="fa-solid fa-chevron-down nav-arrow"></i>
                </span>
                <div className="dropdown-panel">
                  <div className="genre-grid">
                    {[
                      'Aksi', 'Petualangan', 'Sci-Fi', 'Drama',
                      'Horor', 'Komedi', 'Animasi', 'Korea',
                      'Thriller', 'Fantasi', 'Kriminal', 'Romantis',
                      'Misteri'
                    ].map(g => (
                      <button
                        key={g}
                        className={activeGenre === g ? 'active' : ''}
                        onClick={() => handleGenreSelect(g)}
                      >
                        {g === 'Korea' ? 'Drama Korea' : g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Network Dropdown */}
              <div className="nav-dropdown">
                <span className="nav-link dropdown-toggle">
                  Platform <i className="fa-solid fa-chevron-down nav-arrow"></i>
                </span>
                <div className="dropdown-panel network-panel">
                  {['Netflix', 'HBO Max', 'Disney+', 'Prime Video', 'Apple TV+'].map(net => (
                    <button key={net} onClick={() => setSearchQuery(net)}>
                      <i className="fa-solid fa-circle-play text-red"></i> {net}
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>

          <div className="nav-right">
            <div className="netflix-search-box">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Judul, orang, genre..."
                aria-label="Cari Film dan Serial TV"
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery('')} aria-label="Hapus pencarian">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            <div
              className="nav-user-avatar"
              onClick={() => handleNavSwitch('mylist')}
              title="Profil Pengguna & Daftar Saya"
              role="button"
              tabIndex={0}
            >
              <i className="fa-solid fa-user"></i>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Sheet */}
      <div
        className={`mobile-drawer-overlay ${mobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      ></div>

      <aside className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`} aria-label="Menu Navigasi Mobile">
        <div className="drawer-head">
          <div className="cinebox-logo" onClick={() => handleNavSwitch('home')}>
            <span className="logo-netflix-text">CINEBOX</span>
          </div>
          <button className="drawer-close-btn" onClick={() => setMobileDrawerOpen(false)} aria-label="Tutup Menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="drawer-links">
          <button
            className={`drawer-link ${currentView === 'home' && activeGenre === 'Semua' ? 'active' : ''}`}
            onClick={() => handleNavSwitch('home')}
          >
            <i className="fa-solid fa-house"></i> Beranda
          </button>
          <button
            className={`drawer-link ${currentView === 'tv' && activeGenre === 'Semua' ? 'active' : ''}`}
            onClick={() => handleNavSwitch('tv')}
          >
            <i className="fa-solid fa-tv"></i> Serial TV
          </button>
          <button
            className={`drawer-link ${currentView === 'movie' && activeGenre === 'Semua' ? 'active' : ''}`}
            onClick={() => handleNavSwitch('movie')}
          >
            <i className="fa-solid fa-film"></i> Film
          </button>
          <button
            className={`drawer-link ${currentView === 'mylist' ? 'active' : ''}`}
            onClick={() => handleNavSwitch('mylist')}
          >
            <i className="fa-solid fa-bookmark"></i> Daftar Saya ({myList.length})
          </button>

          <span className="drawer-section-title">Kategori Genre</span>
          <div className="drawer-genre-grid">
            {[
              'Aksi', 'Petualangan', 'Sci-Fi', 'Drama',
              'Horor', 'Komedi', 'Animasi', 'Korea',
              'Thriller', 'Fantasi', 'Kriminal', 'Romantis',
              'Misteri'
            ].map(g => (
              <button
                key={g}
                className={activeGenre === g ? 'active' : ''}
                onClick={() => handleGenreSelect(g)}
              >
                {g === 'Korea' ? 'Drama Korea' : g}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. Main Content Container */}
      <main className="cinebox-main nav-view-enter" key={searchQuery ? 'search' : `${currentView}:${activeGenre}`}>
        {searchQuery ? (
          /* Search View */
          <section className="cinebox-search-view">
            <div className="search-view-header">
              <div className="search-title-wrap">
                <h2>Hasil Penelusuran: &quot;{searchQuery}&quot;</h2>
                <p className="search-sub">Koleksi film dan serial TV yang cocok di Cinebox</p>
              </div>
              <div className="search-type-filters">
                <button className={`type-filter-btn ${searchFilter === 'all' ? 'active' : ''}`} onClick={() => setSearchFilter('all')}>Semua</button>
                <button className={`type-filter-btn ${searchFilter === 'movie' ? 'active' : ''}`} onClick={() => setSearchFilter('movie')}>Film</button>
                <button className={`type-filter-btn ${searchFilter === 'tv' ? 'active' : ''}`} onClick={() => setSearchFilter('tv')}>Serial TV</button>
              </div>
            </div>

            {/* Trending Quick Search Chips */}
            <div className="trending-chips-row">
              <span className="trending-chip-label">Populer:</span>
              {['Aksi', 'Horor', 'Drama Korea', 'Anime', 'Marvel', 'Sci-Fi', 'Komedi'].map(chip => (
                <button key={chip} className="trending-chip" onClick={() => handleTrendingTagClick(chip)}>
                  {chip}
                </button>
              ))}
            </div>

            {isSearching ? (
              <div className="cinebox-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton-card"></div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="empty-msg" style={{ padding: '40px 0', color: 'var(--text-gray)' }}>Tidak ada film atau serial TV yang cocok dengan kata kunci.</p>
            ) : (
              <div className="cinebox-grid">
                {searchResults
                  .filter(it => searchFilter === 'all' || it.type === searchFilter)
                  .map(item => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      onClick={() => handleOpenWatchModal(item)}
                      onPlay={() => handleOpenWatchModal(item, true)}
                      onAddList={toggleMyList}
                      onLike={toggleLike}
                      isLiked={likedList.includes(item.id)}
                      isAdded={myList.some(i => i.id === item.id)}
                    />
                  ))}
              </div>
            )}
          </section>
        ) : currentView === 'mylist' ? (
          /* My List (Daftar Saya) View */
          <section className="cinebox-search-view">
            <div className="search-view-header">
              <div className="search-title-wrap">
                <h2>Daftar Saya ({myList.length} Judul)</h2>
                <p className="search-sub">Koleksi tontonan favorit yang Anda simpan</p>
              </div>
            </div>

            {myList.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-gray)', fontSize: '15px' }}>Daftar Saya masih kosong. Tambahkan film atau serial TV favorit Anda dengan tombol &quot;+ Daftar Saya&quot;.</p>
              </div>
            ) : (
              <div className="cinebox-grid">
                {myList.map(item => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    onClick={() => handleOpenWatchModal(item)}
                    onPlay={() => handleOpenWatchModal(item, true)}
                    onAddList={toggleMyList}
                    onLike={toggleLike}
                    isLiked={likedList.includes(item.id)}
                    isAdded={true}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* 3. Cinebox Netflix Hero Spotlight Billboard */}
            {currentHero && (
              <section
                className="netflix-hero"
                onMouseEnter={() => setIsHeroHovered(true)}
                onMouseLeave={() => setIsHeroHovered(false)}
              >
                <div
                  className="hero-backdrop"
                  style={{ backgroundImage: `url('${currentHero.backdrop || currentHero.poster}')` }}
                ></div>

                {/* Video Trailer Background */}
                <div className={`hero-trailer-wrap ${isHeroHovered && heroTrailerId ? 'trailer-active' : ''}`}>
                  {isHeroHovered && heroTrailerId && (
                    <iframe
                      src={`https://www.youtube.com/embed/${heroTrailerId}?autoplay=1&mute=${isHeroMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${heroTrailerId}&enablejsapi=1`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  )}
                </div>

                <div className="hero-vignette"></div>

                <div className="hero-content">
                  <div className="hero-badges">
                    <span className="badge-top10-tag"><i className="fa-solid fa-trophy"></i> TOP 10</span>
                    {currentHero.rating && <span className="badge-rating"><i className="fa-solid fa-star text-gold"></i> {currentHero.rating}</span>}
                    <span className="badge-sub-indo"><i className="fa-solid fa-closed-captioning"></i> CC via pemutar</span>
                  </div>

                  <h1 className="hero-title">{currentHero.title}</h1>

                  <div className="hero-meta">
                    {currentHero.year && <><span>{currentHero.year}</span><span className="dot-separator">•</span></>}
                    <span id="heroType">{currentHero.type === 'tv' ? 'Serial TV' : 'Film'}</span>
                    <span className="dot-separator">•</span>
                    {currentHero.genre && <span>{Array.isArray(currentHero.genre) ? currentHero.genre.join(', ') : currentHero.genre}</span>}
                  </div>

                  <p className="hero-synopsis">{currentHero.desc}</p>

                  <div className="hero-buttons">
                    <button className="btn-netflix-play" onClick={() => handleOpenWatchModal(currentHero, true)}>
                      <i className="fa-solid fa-play"></i> Putar
                    </button>
                    <button className="btn-netflix-info" onClick={() => handleOpenWatchModal(currentHero, false)}>
                      <i className="fa-solid fa-circle-info"></i> Selengkapnya
                    </button>
                    <button
                      className="btn-netflix-add"
                      onClick={() => toggleMyList(currentHero)}
                    >
                      <i className={`fa-solid ${myList.some(i => i.id === currentHero.id) ? 'fa-check text-green' : 'fa-plus'}`}></i> Daftar Saya
                    </button>
                  </div>
                </div>

                {/* Hero Pagination Indicators */}
                {catalog.featured && catalog.featured.length > 1 && (
                  <div className="hero-pagination-pills">
                    {catalog.featured.map((_, idx) => (
                      <div
                        key={idx}
                        className={`hero-pill ${idx === heroIndex ? 'active' : ''}`}
                        onClick={() => setHeroIndex(idx)}
                        style={{ cursor: 'pointer' }}
                        title={`Sorotan ${idx + 1}`}
                      ></div>
                    ))}
                  </div>
                )}

                <button
                  className="hero-sound-btn"
                  onClick={() => setIsHeroMuted(prev => !prev)}
                  title="Audio Trailer"
                  aria-label="Toggle Audio"
                >
                  <i className={`fa-solid ${isHeroMuted ? 'fa-volume-xmark' : 'fa-volume-high text-red'}`}></i>
                </button>
              </section>
            )}

            {/* 4. Horizontal Content Sections */}
            <section className="cinebox-sections">
              {/* Continue Watching (Lanjutkan Menonton) Row */}
              {watchHistory.length > 0 && (
                <div className="section-box">
                  <div className="section-head">
                    <h2>▶ Lanjutkan Menonton untuk Anda</h2>
                  </div>
                  <MovieSlider
                    items={watchHistory}
                    onCardClick={(item) => handleOpenWatchModal(item, false)}
                    onPlay={(item) => handleOpenWatchModal(item, true)}
                    onAddList={toggleMyList}
                    onLike={toggleLike}
                    likedIds={likedList}
                    myListIds={myList.map(i => i.id)}
                  />
                </div>
              )}

              {isLoading ? (
                <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden', padding: '24px 0' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton-card"></div>
                  ))}
                </div>
              ) : (
                catalog.sections?.map(sec => (
                  <div key={sec.id} className="section-box">
                    <div className="section-head">
                      <h2>{sec.title}</h2>
                    </div>
                    {((sec as any).isTop10 || sec.id.includes('top_10')) ? (
                      <Top10Slider
                        items={sec.items}
                        onCardClick={(item) => handleOpenWatchModal(item, false)}
                        onPlay={(item) => handleOpenWatchModal(item, true)}
                        onAddList={toggleMyList}
                        onLike={toggleLike}
                        likedIds={likedList}
                        myListIds={myList.map(i => i.id)}
                      />
                    ) : (
                      <MovieSlider
                        items={sec.items}
                        onCardClick={(item) => handleOpenWatchModal(item, false)}
                        onPlay={(item) => handleOpenWatchModal(item, true)}
                        onAddList={toggleMyList}
                        onLike={toggleLike}
                        likedIds={likedList}
                        myListIds={myList.map(i => i.id)}
                      />
                    )}
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>

      {/* 5. Netflix Dedicated Watch Modal (Clean Top Bar - Zero Collisions) */}
      {modalOpen && selectedMovie && (
        <div className="cinebox-player-modal" id="watchModal" role="dialog" aria-modal="true">
          <div className="modal-inner">
            {/* Dedicated Top Bar (Safe from iframe player controls & settings overlays) */}
            <div className="watch-modal-topbar">
              <button className="btn-back-netflix" onClick={handleCloseModal} aria-label="Kembali ke Beranda">
                <i className="fa-solid fa-arrow-left"></i>
                <span>Kembali</span>
              </button>

              <div className="watch-topbar-center">
                <span className="watch-topbar-title">{selectedMovie.title}</span>
                {selectedMovie.type === 'tv' && (
                  <span className="watch-topbar-ep-badge">S{selectedSeason}:E{selectedEpisode}</span>
                )}
              </div>
            </div>

            {/* Video Player Area */}
            <div className="cinema-player-area" id="cinemaPlayerArea">
              {isPlaying ? (
                <div className="video-wrapper">
                  <iframe
                    key={`player-v2-${selectedMovie.id}-${selectedSeason}-${selectedEpisode}-${servers[activeServerIndex]?.id || 'none'}`}
                    src={servers[activeServerIndex]?.url || 'about:blank'}
                    title={`Pemutar ${selectedMovie.title} melalui ${servers[activeServerIndex]?.name || 'server'}`}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  ></iframe>

                  {/* In-Player TV Quick Controls */}
                  <div className="inplayer-quick-controls">
                    {selectedMovie.type === 'tv' && (
                      <>
                        <button
                          className="inplayer-btn"
                          onClick={() => setInplayerEpDrawerOpen(prev => !prev)}
                        >
                          <i className="fa-solid fa-list-ol"></i> Episode ({selectedEpisode})
                        </button>
                        {nextEpisode && <button
                          className="inplayer-btn"
                          onClick={() => handleEpisodeChange(nextEpisode.episode)}
                        >
                          <i className="fa-solid fa-forward"></i> Ep Berikutnya
                        </button>}
                      </>
                    )}
                  </div>

                  {/* In-Player Episode Drawer */}
                  {inplayerEpDrawerOpen && selectedMovie.type === 'tv' && (
                    <div className="inplayer-episode-drawer">
                      <div className="drawer-ep-head">
                        <h4>Daftar Episode Season {selectedSeason}</h4>
                        <button className="drawer-close-pill" onClick={() => setInplayerEpDrawerOpen(false)}>
                          <i className="fa-solid fa-xmark"></i> Tutup
                        </button>
                      </div>
                      <div className="drawer-ep-list">
                        {availableEpisodes.map(ep => (
                          <button
                            key={ep.episode}
                            className={`ep-btn ${ep.episode === selectedEpisode ? 'active' : ''}`}
                            onClick={() => handleEpisodeChange(ep.episode)}
                          >
                            <div className="ep-top-row" style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                              <span>Episode {ep.episode}</span>
                              <i className="fa-solid fa-play text-xs"></i>
                            </div>
                            <span className="ep-title-sub" style={{ fontSize: '11px', color: '#888' }}>{ep.title}</span>
                          </button>
                        ))}
                        {availableEpisodes.length === 0 && (
                          <p className="episode-empty-state">{tvDetailsLoading ? 'Memuat daftar episode…' : 'Daftar episode belum tersedia untuk judul ini.'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="video-preview-screen">
                  <div
                    className="preview-backdrop"
                    style={{ backgroundImage: `url('${selectedMovie.backdrop || selectedMovie.poster}')` }}
                  ></div>

                  {/* Clean Cinematic Trailer in Modal (100% Unobstructed) */}
                  <div className="detail-trailer-wrap">
                    {modalTrailerId && (
                      <iframe
                        src={`https://www.youtube.com/embed/${modalTrailerId}?autoplay=1&mute=${isModalMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${modalTrailerId}&enablejsapi=1`}
                        frameBorder="0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                      ></iframe>
                    )}
                  </div>

                  <div className="preview-vignette"></div>

                  <button
                    className="modal-sound-btn"
                    onClick={() => setIsModalMuted(prev => !prev)}
                    title="Audio Trailer"
                    aria-label="Toggle Audio Trailer"
                  >
                    <i className={`fa-solid ${isModalMuted ? 'fa-volume-xmark' : 'fa-volume-high text-red'}`}></i>
                  </button>
                </div>
              )}
            </div>

            {/* Server and subtitle controls apply to both movies and episodes. */}
            {servers.length > 0 && (
              <div className="player-stream-status-bar">
                <div className="player-server-controls">
                  <label htmlFor="stream-server-select">Sumber video</label>
                  <select
                    id="stream-server-select"
                    className="cinebox-select"
                    value={activeServerIndex}
                    onChange={event => setActiveServerIndex(Number(event.target.value))}
                    aria-describedby="stream-subtitle-note"
                  >
                    {servers.map((server, index) => (
                      <option key={server.id} value={index}>{server.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn-ganti-server"
                    onClick={handleNextServerFailover}
                    title="Beralih ke sumber video berikutnya jika pemutar bermasalah"
                  >
                    <i className="fa-solid fa-rotate"></i> Server berikutnya
                  </button>
                </div>
                <p className="player-subtitle-note" id="stream-subtitle-note" role="status">
                  <i className="fa-solid fa-closed-captioning" aria-hidden="true"></i>{' '}
                  {servers[activeServerIndex]?.subtitle.disclosure} Pilih bahasa lewat menu CC pada pemutar jika tersedia.
                </p>
                {isPlaying && <p className="player-source-help">Jika layar tetap kosong atau berpindah ke iklan, coba sumber video lainnya.</p>}
              </div>
            )}

            {/* 6. Netflix Modal Detail Layout */}
            <div className="netflix-modal-body">
              {/* Primary Action Buttons Row (Placed Ergonomically in Modal Body) */}
              <div className="modal-action-bar">
                <button className="btn-modal-main-play" onClick={handleStartStream}>
                  <i className="fa-solid fa-play"></i> {isPlaying ? 'Kembali ke Pemutar' : (selectedMovie.type === 'tv' ? `Putar Season ${selectedSeason} • Episode ${selectedEpisode}` : 'Putar Film')}
                </button>

                <div className="modal-sub-actions">
                  <button
                    className="btn-modal-sub"
                    onClick={() => toggleMyList(selectedMovie)}
                  >
                    <i className={`fa-solid ${myList.some(i => i.id === selectedMovie.id) ? 'fa-check text-green' : 'fa-plus'}`}></i>
                    <span>{myList.some(i => i.id === selectedMovie.id) ? 'Di Daftar Saya' : 'Daftar Saya'}</span>
                  </button>

                  <button
                    className="btn-modal-sub"
                    onClick={() => toggleLike(selectedMovie.id, selectedMovie.title)}
                    aria-label="Sukai"
                  >
                    <i className={`fa-solid ${likedList.includes(selectedMovie.id) ? 'fa-thumbs-up text-red' : 'fa-thumbs-up'}`}></i>
                    <span>{likedList.includes(selectedMovie.id) ? 'Disukai' : 'Suka'}</span>
                  </button>
                </div>
              </div>

              {/* Overview & Metadata */}
              <div className="detail-header-row">
                <div className="detail-left">
                  <div className="detail-tags-row">
                    {selectedMovie.year && <span className="tag-year">{selectedMovie.year}</span>}
                    {selectedMovie.rating && <span className="tag-rating"><i className="fa-solid fa-star text-gold"></i> {selectedMovie.rating}</span>}
                    <span className="tag-type">{selectedMovie.type === 'tv' ? 'Serial TV' : 'Film'}</span>
                    <span className="tag-sub">Subtitle via pemutar</span>
                  </div>
                  <p className="detail-synopsis">{selectedMovie.desc}</p>
                </div>

                <div className="detail-right">
                  <div className="meta-item">
                    <span className="meta-label">Pemeran:</span>
                    <span className="meta-val">{selectedMovie.cast || 'Belum tersedia'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Genre:</span>
                    <span className="meta-val">{Array.isArray(selectedMovie.genre) ? selectedMovie.genre.join(', ') : selectedMovie.genre}</span>
                  </div>
                </div>
              </div>

              {/* Netflix TV Episodes Section */}
              {selectedMovie.type === 'tv' && (
                <div className="tv-episodes-panel">
                  <div className="tv-ep-header">
                    <h3>Episode</h3>
                    <div className="season-select-wrap">
                      <label>Pilih Musim:</label>
                      <select
                        className="cinebox-select"
                        value={selectedSeason}
                        onChange={e => handleSeasonChange(Number(e.target.value))}
                        aria-label="Pilih Musim"
                      >
                        {(tvDetails?.season_numbers?.length ? tvDetails.season_numbers : [selectedSeason]).map((s: number) => (
                          <option key={s} value={s}>Musim {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="netflix-episodes-list">
                    {availableEpisodes.map(ep => (
                      <button
                        key={ep.episode}
                        className={`netflix-ep-card ${ep.episode === selectedEpisode ? 'active' : ''}`}
                        onClick={() => handleEpisodeChange(ep.episode)}
                        aria-current={ep.episode === selectedEpisode ? 'true' : undefined}
                      >
                        <span className="ep-index-num">{ep.episode}</span>
                        <span className="ep-thumb-wrap">
                          <img
                            className="ep-thumb"
                            src={selectedMovie.backdrop || selectedMovie.poster}
                            alt={ep.title}
                          />
                          <span className="ep-play-overlay">
                            <i className="fa-solid fa-play"></i>
                          </span>
                        </span>
                        <span className="ep-info-col">
                          <span className="ep-title-row">
                            <strong className="ep-title-bold">{ep.title}</strong>
                          </span>
                        </span>
                      </button>
                    ))}
                    {availableEpisodes.length === 0 && (
                      <p className="episode-empty-state">{tvDetailsLoading ? 'Memuat daftar episode…' : 'Daftar episode belum tersedia. Anda tetap dapat mencoba pemutar Season 1 • Episode 1.'}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Netflix "Lainnya Seperti Ini" (More Like This Grid) */}
              <div className="more-like-this-section">
                <h3>Lainnya Seperti Ini</h3>
                <div className="more-like-this-grid">
                  {moreLikeThisItems.map(item => {
                    const thumbUrl = (item.backdrop && item.backdrop.startsWith('http'))
                      ? item.backdrop
                      : (item.poster && item.poster.startsWith('http'))
                      ? item.poster
                      : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';

                    return (
                      <div
                        key={item.id}
                        className="more-like-card"
                        onClick={() => {
                          handleOpenWatchModal(item, true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="more-like-thumb-wrap">
                          <img
                            className="more-like-thumb"
                            src={thumbUrl}
                            alt={item.title}
                            onError={e => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
                            }}
                          />
                          <div className="more-like-play-icon">
                            <i className="fa-solid fa-play"></i>
                          </div>
                        </div>
                        <div className="more-like-body">
                          <div className="more-like-meta-row">
                            <span className="more-like-match">{item.matchScore ? 'Genre serupa' : 'Pilihan lainnya'}</span>
                            <span className="more-like-year">{item.year}</span>
                          </div>
                          <h4 className="more-like-title">{item.title}</h4>
                          <p className="more-like-desc">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Netflix About Title Section */}
              <div className="netflix-about-section">
                <h3>Tentang {selectedMovie.title}</h3>
                <div className="about-grid">
                  <div className="about-item">
                    <span className="about-label">Pemeran:</span>
                    <span className="about-val">{selectedMovie.cast || 'Belum tersedia'}</span>
                  </div>
                  <div className="about-item">
                    <span className="about-label">Genre:</span>
                    <span className="about-val">{Array.isArray(selectedMovie.genre) ? selectedMovie.genre.join(', ') : selectedMovie.genre}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Toast Shelf */}
      <div className="toast-shelf">
        {toasts.map(t => (
          <div key={t.id} className={`toast-pill toast-${t.type}`}>
            <i className={`fa-solid ${t.type === 'success' ? 'fa-circle-check text-green' : 'fa-circle-info text-red'}`}></i>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* 8. Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navigasi Bawah Mobile">
        <button
          className={`bottom-nav-item ${currentView === 'home' && !searchQuery ? 'active' : ''}`}
          onClick={() => handleNavSwitch('home')}
        >
          <i className="fa-solid fa-house"></i>
          <span>Beranda</span>
        </button>
        <button
          className={`bottom-nav-item ${currentView === 'tv' && !searchQuery ? 'active' : ''}`}
          onClick={() => handleNavSwitch('tv')}
        >
          <i className="fa-solid fa-tv"></i>
          <span>Serial TV</span>
        </button>
        <button
          className={`bottom-nav-item ${currentView === 'movie' && !searchQuery ? 'active' : ''}`}
          onClick={() => handleNavSwitch('movie')}
        >
          <i className="fa-solid fa-film"></i>
          <span>Film</span>
        </button>
        <button
          className={`bottom-nav-item ${currentView === 'mylist' ? 'active' : ''}`}
          onClick={() => handleNavSwitch('mylist')}
        >
          <i className="fa-solid fa-bookmark"></i>
          <span>Daftar Saya</span>
        </button>
        <button
          className="bottom-nav-item"
          onClick={handleFocusSearch}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          <span>Cari</span>
        </button>
      </nav>

      {/* 9. Footer */}
      <footer className="cinebox-footer">
        <div className="footer-container">
          <div className="cinebox-logo" onClick={() => handleNavSwitch('home')}>
            <span className="logo-netflix-text">CINEBOX</span>
          </div>
          <p className="footer-tagline">Temukan film dan serial pilihan. Ketersediaan video serta subtitle mengikuti sumber pemutar.</p>
          <div className="footer-links-row">
            <button onClick={() => handleNavSwitch('home')}>Beranda</button>
            <button onClick={() => handleNavSwitch('movie')}>Film</button>
            <button onClick={() => handleNavSwitch('tv')}>Serial TV</button>
            <button onClick={() => handleNavSwitch('popular')}>Terbaru & Populer</button>
            <button onClick={() => handleNavSwitch('mylist')}>Daftar Saya</button>
            <button onClick={() => handleGenreSelect('Aksi')}>Aksi</button>
            <button onClick={() => handleGenreSelect('Drama')}>Drama</button>
            <button onClick={() => handleGenreSelect('Korea')}>Drama Korea</button>
          </div>
          <div className="footer-copy">
            <p>&copy; 2026 <strong>Cinebox Streaming Platform</strong>. Pengalaman streaming generasi terbaru.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Sub-Component: Netflix Card with Hover Quick Actions Portal
function MovieCard({
  item,
  onClick,
  onPlay,
  onAddList,
  onLike,
  isLiked,
  isAdded
}: {
  item: MovieItem;
  onClick: () => void;
  onPlay?: () => void;
  onAddList?: (item: MovieItem) => void;
  onLike?: (id: string, title: string) => void;
  isLiked?: boolean;
  isAdded?: boolean;
}) {
  return (
    <div className="cinebox-card" onClick={onClick}>
      <div className="poster-wrap">
        <img
          className="card-img"
          src={item.poster}
          alt={item.title}
          onError={e => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
          }}
        />
        {item.rating && <span className="card-rating-badge"><i className="fa-solid fa-star"></i> {item.rating}</span>}

        {/* Netflix Card Hover Actions */}
        <div className="card-hover-actions">
          <div className="hover-btn-row">
            <button
              className="hover-btn play-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlay) onPlay();
                else onClick();
              }}
              title="Putar Sekarang"
              aria-label="Putar Sekarang"
            >
              <i className="fa-solid fa-play"></i>
            </button>
            {onAddList && (
              <button
                className="hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddList(item);
                }}
                title={isAdded ? "Hapus dari Daftar Saya" : "Tambah ke Daftar Saya"}
                aria-label="Daftar Saya"
              >
                <i className={`fa-solid ${isAdded ? 'fa-check text-green' : 'fa-plus'}`}></i>
              </button>
            )}
            {onLike && (
              <button
                className="hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(item.id, item.title);
                }}
                title="Suka"
                aria-label="Suka"
              >
                <i className={`fa-solid ${isLiked ? 'fa-thumbs-up text-red' : 'fa-thumbs-up'}`}></i>
              </button>
            )}
            <button
              className="hover-btn"
              style={{ marginLeft: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              title="Detail Selengkapnya"
              aria-label="Detail Selengkapnya"
            >
              <i className="fa-solid fa-chevron-down"></i>
            </button>
          </div>

          <div className="hover-meta-row">
            <span className="hover-match">Lihat detail</span>
            {item.year && <span style={{ color: '#aaa' }}>{item.year}</span>}
          </div>
        </div>
      </div>
      <div className="card-caption">
        <h4 className="card-title">{item.title}</h4>
        <span className="card-year-type">{item.year && `${item.year} • `}{item.type === 'tv' ? 'Serial TV' : 'Film'}</span>
      </div>
    </div>
  );
}

// Sub-Component: Netflix Official Top 10 Ranked Card
function Top10MovieCard({
  item,
  rank,
  onClick,
  onPlay,
  onAddList,
  onLike,
  isLiked,
  isAdded
}: {
  item: MovieItem;
  rank: number;
  onClick: () => void;
  onPlay?: () => void;
  onAddList?: (item: MovieItem) => void;
  onLike?: (id: string, title: string) => void;
  isLiked?: boolean;
  isAdded?: boolean;
}) {
  return (
    <div className="top10-card-wrapper" onClick={onClick}>
      <span className="top10-rank-num">{rank}</span>

      <div className="top10-poster-wrap">
        <img
          className="card-img"
          src={item.poster}
          alt={item.title}
          onError={e => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
          }}
        />
        {item.rating && <span className="card-rating-badge"><i className="fa-solid fa-star"></i> {item.rating}</span>}

        <div className="card-hover-actions">
          <div className="hover-btn-row">
            <button
              className="hover-btn play-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlay) onPlay();
                else onClick();
              }}
              title="Putar Sekarang"
            >
              <i className="fa-solid fa-play"></i>
            </button>
            {onAddList && (
              <button
                className="hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddList(item);
                }}
                title={isAdded ? "Hapus dari Daftar Saya" : "Tambah ke Daftar Saya"}
              >
                <i className={`fa-solid ${isAdded ? 'fa-check text-green' : 'fa-plus'}`}></i>
              </button>
            )}
            {onLike && (
              <button
                className="hover-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(item.id, item.title);
                }}
                title="Suka"
              >
                <i className={`fa-solid ${isLiked ? 'fa-thumbs-up text-red' : 'fa-thumbs-up'}`}></i>
              </button>
            )}
          </div>
          <div className="hover-meta-row">
            <span className="hover-match">Lihat detail</span>
            {item.year && <span style={{ color: '#aaa' }}>{item.year}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-Component: Top 10 Slider
function Top10Slider({
  items,
  onCardClick,
  onPlay,
  onAddList,
  onLike,
  likedIds,
  myListIds
}: {
  items: MovieItem[];
  onCardClick: (item: MovieItem) => void;
  onPlay?: (item: MovieItem) => void;
  onAddList?: (item: MovieItem) => void;
  onLike?: (id: string, title: string) => void;
  likedIds?: string[];
  myListIds?: string[];
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = (offset: number) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="card-row-wrapper">
      <button className="row-nav-arrow left" onClick={() => handleScroll(-600)} aria-label="Geser ke kiri">
        <i className="fa-solid fa-chevron-left"></i>
      </button>

      <div className="top10-slider" ref={sliderRef}>
        {items.map((item, idx) => (
          <Top10MovieCard
            key={item.id}
            item={item}
            rank={idx + 1}
            onClick={() => onCardClick(item)}
            onPlay={() => onPlay && onPlay(item)}
            onAddList={onAddList}
            onLike={onLike}
            isLiked={likedIds?.includes(item.id)}
            isAdded={myListIds?.includes(item.id)}
          />
        ))}
      </div>

      <button className="row-nav-arrow right" onClick={() => handleScroll(600)} aria-label="Geser ke kanan">
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
}

// Sub-Component: Movie Slider with Netflix Arrows
function MovieSlider({
  items,
  onCardClick,
  onPlay,
  onAddList,
  onLike,
  likedIds,
  myListIds
}: {
  items: MovieItem[];
  onCardClick: (item: MovieItem) => void;
  onPlay?: (item: MovieItem) => void;
  onAddList?: (item: MovieItem) => void;
  onLike?: (id: string, title: string) => void;
  likedIds?: string[];
  myListIds?: string[];
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = (offset: number) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="card-row-wrapper">
      <button className="row-nav-arrow left" onClick={() => handleScroll(-600)} aria-label="Geser ke kiri">
        <i className="fa-solid fa-chevron-left"></i>
      </button>

      <div className="card-slider" ref={sliderRef}>
        {items.map(item => (
          <MovieCard
            key={item.id}
            item={item}
            onClick={() => onCardClick(item)}
            onPlay={() => onPlay && onPlay(item)}
            onAddList={onAddList}
            onLike={onLike}
            isLiked={likedIds?.includes(item.id)}
            isAdded={myListIds?.includes(item.id)}
          />
        ))}
      </div>

      <button className="row-nav-arrow right" onClick={() => handleScroll(600)} aria-label="Geser ke kanan">
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
}

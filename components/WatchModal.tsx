'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildStreamServers, type StreamContext } from '../lib/stream-servers';
import { FALLBACK_IMAGE, genreText, type MovieItem, type TvDetails } from '../lib/types';
import { PosterImage } from './MediaCards';
import PlayerGuardNotice from './PlayerGuardNotice';

interface WatchModalProps {
  item: MovieItem;
  autoPlay: boolean;
  recommendations: MovieItem[];
  guideOpen: boolean;
  isAdded: boolean;
  isLiked: boolean;
  onClose: () => void;
  onOpenItem: (item: MovieItem, autoPlay: boolean) => void;
  onToggleList: (item: MovieItem) => void;
  onToggleLike: (item: MovieItem) => void;
  onRecordHistory: (item: MovieItem, season: number, episode: number) => void;
  onOpenGuide: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export default function WatchModal({
  item,
  autoPlay,
  recommendations,
  guideOpen,
  isAdded,
  isLiked,
  onClose,
  onOpenItem,
  onToggleList,
  onToggleLike,
  onRecordHistory,
  onOpenGuide,
  onToast
}: WatchModalProps) {
  const isTv = item.type === 'tv';
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [season, setSeason] = useState(item.lastSeason || 1);
  const [episode, setEpisode] = useState(item.lastEpisode || 1);
  const [tvDetails, setTvDetails] = useState<TvDetails | null>(null);
  const [tvLoading, setTvLoading] = useState(isTv);
  const [streamContext, setStreamContext] = useState<StreamContext | null>(null);
  const [serverIndex, setServerIndex] = useState(0);
  const [trailerId, setTrailerId] = useState('');
  const [trailerMuted, setTrailerMuted] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const servers = useMemo(
    () => (streamContext ? buildStreamServers(streamContext, season, episode) : []),
    [streamContext, season, episode]
  );
  const server = servers[serverIndex] || servers[0];

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    if (autoPlay) onRecordHistory(item, item.lastSeason || 1, item.lastEpisode || 1);
    // Runs once per opened title; the modal is re-mounted for every new title.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the TMDB id some servers need. Fall back to IMDb-only sources if the lookup fails.
  useEffect(() => {
    let active = true;
    const fallback: StreamContext = { imdbId: item.id, type: isTv ? 'tv' : 'movie' };
    fetch(`/api/servers?id=${encodeURIComponent(item.id)}&type=${isTv ? 'tv' : 'movie'}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => active && setStreamContext(data?.context || fallback))
      .catch(() => active && setStreamContext(fallback));
    return () => {
      active = false;
    };
  }, [item.id, isTv]);

  useEffect(() => {
    let active = true;
    fetch(`/api/trailer?title=${encodeURIComponent(item.title)}&id=${item.id}&type=${item.type || 'movie'}`)
      .then(res => res.json())
      .then(data => active && setTrailerId(data.trailer_id || item.trailer_yt || ''))
      .catch(() => active && setTrailerId(item.trailer_yt || ''));
    return () => {
      active = false;
    };
  }, [item]);

  useEffect(() => {
    if (!isTv) return;
    let active = true;
    const startSeason = item.lastSeason || 1;
    const startEpisode = item.lastEpisode || 1;
    fetch(`/api/tv/details?id=${item.id}`)
      .then(res => res.json())
      .then((data: TvDetails) => {
        if (!active) return;
        setTvDetails(data);
        const seasons = data.season_numbers || [];
        if (seasons.length === 0) return;
        const s = seasons.includes(startSeason) ? startSeason : seasons[0];
        const eps = data.seasons?.[String(s)]?.episodes?.map(ep => ep.episode) || [];
        setSeason(s);
        setEpisode(eps.includes(startEpisode) ? startEpisode : eps[0] || startEpisode);
      })
      .catch(() => {})
      .finally(() => active && setTvLoading(false));
    return () => {
      active = false;
    };
  }, [item, isTv]);

  const episodes = tvDetails?.seasons?.[String(season)]?.episodes || [];
  const seasonNumbers = tvDetails?.season_numbers?.length ? tvDetails.season_numbers : [season];
  const episodeIndex = episodes.findIndex(ep => ep.episode === episode);
  const prevEpisode = episodeIndex > 0 ? episodes[episodeIndex - 1] : undefined;
  const nextEpisode = episodeIndex >= 0 ? episodes[episodeIndex + 1] : undefined;
  const currentEpisode = episodeIndex >= 0 ? episodes[episodeIndex] : undefined;

  const scrollToPlayer = () => overlayRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const startPlaying = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true);
      onRecordHistory(item, season, episode);
    }
    scrollToPlayer();
  }, [isPlaying, item, season, episode, onRecordHistory]);

  const playEpisode = (s: number, e: number) => {
    setSeason(s);
    setEpisode(e);
    setServerIndex(0);
    setIsPlaying(true);
    onRecordHistory(item, s, e);
    scrollToPlayer();
  };

  const changeSeason = (s: number) => {
    const first = tvDetails?.seasons?.[String(s)]?.episodes?.[0]?.episode || 1;
    setSeason(s);
    setEpisode(first);
    setServerIndex(0);
    if (isPlaying) onRecordHistory(item, s, first);
  };

  const nextServer = () => {
    if (servers.length <= 1) return;
    const next = (serverIndex + 1) % servers.length;
    setServerIndex(next);
    onToast(`Beralih ke ${servers[next].name}`);
  };

  // Keyboard: Esc closes, F toggles fullscreen on the player. Ignored while typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (guideOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') {
        if (document.fullscreenElement) return;
        onClose();
      } else if ((event.key === 'f' || event.key === 'F') && isPlaying) {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else stageRef.current?.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guideOpen, isPlaying, onClose]);

  const playLabel = isPlaying
    ? 'Kembali ke pemutar'
    : isTv
      ? `Putar S${season} • E${episode}`
      : 'Putar film';

  return (
    <div className="watch-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="watch-title" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="watch-dialog">
        <div className={`watch-sticky ${isPlaying ? 'is-playing' : ''}`}>
          <div className="watch-topbar">
            <button type="button" ref={closeRef} className="watch-back" onClick={onClose} aria-label="Tutup dan kembali">
              <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
              <span>Kembali</span>
            </button>
            <p className="watch-topbar-title">
              <span>{item.title}</span>
              {isTv && <span className="ep-pill">S{season}:E{episode}</span>}
            </p>
            <button type="button" className="icon-btn watch-close" onClick={onClose} aria-label="Tutup">
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>

          <div className="player-stage" ref={stageRef}>
            {isPlaying ? (
              server ? (
                <iframe
                  key={`${server.id}-${server.url}`}
                  src={server.url}
                  title={`Pemutar ${item.title} – ${server.name}`}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="origin"
                />
              ) : (
                <div className="player-status">
                  <span className="spinner" aria-hidden="true"></span>
                  <span>Menyiapkan server…</span>
                </div>
              )
            ) : (
              <div className="player-preview">
                <div className="player-preview-bg" style={{ backgroundImage: `url('${item.backdrop || item.poster || FALLBACK_IMAGE}')` }} />
                {trailerId && (
                  <iframe
                    className="player-preview-trailer"
                    src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=${trailerMuted ? 1 : 0}&controls=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${trailerId}`}
                    title={`Trailer ${item.title}`}
                    tabIndex={-1}
                    allow="autoplay; encrypted-media"
                  />
                )}
                <div className="player-preview-shade" />
                <button type="button" className="player-big-play" onClick={startPlaying} aria-label={playLabel}>
                  <i className="fa-solid fa-play" aria-hidden="true"></i>
                </button>
                {trailerId && (
                  <button type="button" className="icon-btn preview-mute" onClick={() => setTrailerMuted(prev => !prev)} aria-label={trailerMuted ? 'Nyalakan suara trailer' : 'Matikan suara trailer'}>
                    <i className={`fa-solid ${trailerMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} aria-hidden="true"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="player-toolbar">
          <PlayerGuardNotice onOpenGuide={onOpenGuide} />
          <div className="server-row">
            <span className="server-label" id="server-label">Server</span>
            <div className="server-chips" role="radiogroup" aria-labelledby="server-label">
              {servers.length === 0 && <span className="server-chip is-loading">Memuat…</span>}
              {servers.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={index === serverIndex}
                  className={`server-chip ${index === serverIndex ? 'active' : ''}`}
                  onClick={() => setServerIndex(index)}
                >
                  {s.name}
                  {s.subtitle.preferredLanguage === 'id' && <span className="chip-tag">ID</span>}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-small btn-outline server-next" onClick={nextServer} disabled={servers.length <= 1} title="Coba server berikutnya">
              <i className="fa-solid fa-rotate" aria-hidden="true"></i> <span>Ganti</span>
            </button>
          </div>

          {isTv && (
            <div className="episode-stepper">
              <button type="button" className="btn btn-small btn-ghost" disabled={!prevEpisode} onClick={() => prevEpisode && playEpisode(season, prevEpisode.episode)}>
                <i className="fa-solid fa-backward-step" aria-hidden="true"></i> <span>Sebelumnya</span>
              </button>
              <span className="episode-stepper-label">
                S{season} · E{episode}
                {currentEpisode?.title && <small>{currentEpisode.title}</small>}
              </span>
              <button type="button" className="btn btn-small btn-ghost" disabled={!nextEpisode} onClick={() => nextEpisode && playEpisode(season, nextEpisode.episode)}>
                <span>Berikutnya</span> <i className="fa-solid fa-forward-step" aria-hidden="true"></i>
              </button>
            </div>
          )}

          {server && (
            <p className="server-note">
              <i className="fa-solid fa-closed-captioning" aria-hidden="true"></i> {server.subtitle.disclosure} {server.note}
            </p>
          )}
        </div>

        <div className="watch-body">
          <div className="watch-head">
            <h2 id="watch-title" className="watch-title">{item.title}</h2>
            <div className="watch-tags">
              {item.year && <span>{item.year}</span>}
              {item.rating && (
                <span className="tag-score">
                  <i className="fa-solid fa-star" aria-hidden="true"></i> {item.rating}
                </span>
              )}
              <span>{isTv ? 'Serial TV' : 'Film'}</span>
            </div>
          </div>

          <div className="watch-actions">
            <button type="button" className="btn btn-light btn-grow" onClick={startPlaying}>
              <i className="fa-solid fa-play" aria-hidden="true"></i> {playLabel}
            </button>
            <button type="button" className="btn btn-glass" onClick={() => onToggleList(item)} aria-pressed={isAdded}>
              <i className={`fa-solid ${isAdded ? 'fa-check text-green' : 'fa-plus'}`} aria-hidden="true"></i>
              <span>{isAdded ? 'Tersimpan' : 'Daftar Saya'}</span>
            </button>
            <button type="button" className="btn btn-glass" onClick={() => onToggleLike(item)} aria-pressed={isLiked}>
              <i className={`fa-solid fa-thumbs-up ${isLiked ? 'text-red' : ''}`} aria-hidden="true"></i>
              <span>{isLiked ? 'Disukai' : 'Suka'}</span>
            </button>
          </div>

          <div className="watch-info">
            {item.desc && <p className="watch-desc">{item.desc}</p>}
            <dl className="watch-meta">
              <div>
                <dt>Pemeran</dt>
                <dd>{item.cast || 'Belum tersedia'}</dd>
              </div>
              <div>
                <dt>Genre</dt>
                <dd>{genreText(item.genre) || 'Belum tersedia'}</dd>
              </div>
            </dl>
          </div>

          {isTv && (
            <section className="episodes" aria-labelledby="episodes-title">
              <div className="episodes-head">
                <h3 id="episodes-title">Episode</h3>
                <select className="select" value={season} onChange={event => changeSeason(Number(event.target.value))} aria-label="Pilih musim">
                  {seasonNumbers.map(s => (
                    <option key={s} value={s}>Musim {s}</option>
                  ))}
                </select>
              </div>
              <div className="episode-list">
                {episodes.map(ep => (
                  <button
                    key={ep.episode}
                    type="button"
                    className={`episode-card ${ep.episode === episode ? 'active' : ''}`}
                    onClick={() => playEpisode(season, ep.episode)}
                    aria-current={ep.episode === episode ? 'true' : undefined}
                  >
                    <span className="episode-num">{ep.episode}</span>
                    <span className="episode-thumb">
                      <PosterImage src={ep.thumbnail || item.backdrop || item.poster} alt="" />
                      <span className="episode-play"><i className="fa-solid fa-play" aria-hidden="true"></i></span>
                    </span>
                    <span className="episode-name">
                      <small>Episode {ep.episode}</small>
                      {ep.title}
                    </span>
                  </button>
                ))}
                {episodes.length === 0 && (
                  <p className="empty-note">
                    {tvLoading ? 'Memuat daftar episode…' : `Daftar episode belum tersedia. Anda tetap bisa mencoba memutar Musim ${season} • Episode ${episode}.`}
                  </p>
                )}
              </div>
            </section>
          )}

          {recommendations.length > 0 && (
            <section className="similar" aria-labelledby="similar-title">
              <h3 id="similar-title">Lainnya Seperti Ini</h3>
              <div className="similar-grid">
                {recommendations.map(rec => (
                  <button key={rec.id} type="button" className="similar-card" onClick={() => onOpenItem(rec, false)}>
                    <span className="similar-thumb">
                      <PosterImage src={rec.backdrop || rec.poster} alt="" />
                      <span className="episode-play"><i className="fa-solid fa-play" aria-hidden="true"></i></span>
                    </span>
                    <span className="similar-body">
                      <span className="similar-meta">
                        <span className="text-green">{rec.matchScore ? 'Genre serupa' : 'Pilihan lain'}</span>
                        <span>{rec.year}</span>
                      </span>
                      <strong className="similar-title">{rec.title}</strong>
                      {rec.desc && <span className="similar-desc">{rec.desc}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

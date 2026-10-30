'use client';

import React, { useEffect, useState } from 'react';
import { genreText, type MovieItem } from '../lib/types';

interface HeroProps {
  featured: MovieItem[];
  paused: boolean;
  isAdded: (id: string) => boolean;
  onPlay: (item: MovieItem) => void;
  onInfo: (item: MovieItem) => void;
  onToggleList: (item: MovieItem) => void;
}

const CYCLE_MS = 12000;

function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return canHover;
}

export default function Hero({ featured, paused, isAdded, onPlay, onInfo, onToggleList }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [muted, setMuted] = useState(true);
  const [trailerId, setTrailerId] = useState('');
  const canHover = useCanHover();
  const hero = featured[index] || featured[0];

  useEffect(() => setIndex(0), [featured]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Trailers only play on hover-capable devices; on touch they would cover the buttons.
  useEffect(() => {
    setTrailerId('');
    if (!hero || !canHover) return;
    let active = true;
    fetch(`/api/trailer?title=${encodeURIComponent(hero.title)}&id=${hero.id}&type=${hero.type || 'movie'}`)
      .then(res => res.json())
      .then(data => active && setTrailerId(data.trailer_id || hero.trailer_yt || ''))
      .catch(() => active && setTrailerId(hero.trailer_yt || ''));
    return () => {
      active = false;
    };
  }, [hero, canHover]);

  useEffect(() => {
    if (featured.length <= 1 || hovered || focused || paused || rotationPaused || reducedMotion) return;
    const timer = setInterval(() => setIndex(prev => (prev + 1) % featured.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [featured.length, hovered, focused, paused, rotationPaused, reducedMotion]);

  useEffect(() => {
    if (paused) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'm' || event.key === 'M') setMuted(prev => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused]);

  if (!hero) return null;
  const showTrailer = canHover && hovered && Boolean(trailerId) && !paused;
  const added = isAdded(hero.id);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Sorotan"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false); }}
    >
      <div key={hero.id} className="hero-backdrop" style={{ backgroundImage: `url('${hero.backdrop || hero.poster}')` }} />

      <div className={`hero-trailer ${showTrailer ? 'visible' : ''}`} aria-hidden="true">
        {showTrailer && (
          <iframe
            src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${trailerId}`}
            title="Trailer"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
          />
        )}
      </div>
      <div className="hero-shade" />

      <div className="hero-content" key={`content-${hero.id}`}>
        <div className="hero-badges">
          <span className="badge-top">
            <i className="fa-solid fa-trophy" aria-hidden="true"></i> TOP 10
          </span>
          {hero.rating && (
            <span className="badge-score">
              <i className="fa-solid fa-star" aria-hidden="true"></i> {hero.rating}
            </span>
          )}
        </div>
        <h1 className="hero-title">{hero.title}</h1>
        <p className="hero-meta">
          {[hero.year, hero.type === 'tv' ? 'Serial TV' : 'Film', genreText(hero.genre)].filter(Boolean).join(' • ')}
        </p>
        {hero.desc && <p className="hero-desc">{hero.desc}</p>}
        <div className="hero-actions">
          <button type="button" className="btn btn-light" onClick={() => onPlay(hero)}>
            <i className="fa-solid fa-play" aria-hidden="true"></i> Putar
          </button>
          <button type="button" className="btn btn-glass" onClick={() => onInfo(hero)}>
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i> <span>Info</span>
          </button>
          <button
            type="button"
            className="btn btn-icon btn-outline"
            onClick={() => onToggleList(hero)}
            aria-label={added ? 'Hapus dari Daftar Saya' : 'Tambah ke Daftar Saya'}
            title={added ? 'Hapus dari Daftar Saya' : 'Tambah ke Daftar Saya'}
          >
            <i className={`fa-solid ${added ? 'fa-check text-green' : 'fa-plus'}`} aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div className="hero-controls">
        {featured.length > 1 && (
          <div className="hero-dots" role="group" aria-label="Pilih sorotan">
            {featured.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={idx === index}
                aria-label={`Sorotan ${idx + 1}: ${item.title}`}
                className={`hero-dot ${idx === index ? 'active' : ''}`}
                onClick={() => setIndex(idx)}
              />
            ))}
          </div>
        )}
        {featured.length > 1 && !reducedMotion && (
          <button type="button" className="icon-btn hero-rotation" aria-label={rotationPaused ? 'Lanjutkan pergantian sorotan' : 'Jeda pergantian sorotan'} aria-pressed={rotationPaused} onClick={() => setRotationPaused(value => !value)}>
            <i className={`fa-solid ${rotationPaused ? 'fa-play' : 'fa-pause'}`} aria-hidden="true"></i>
          </button>
        )}
        {canHover && trailerId && (
          <button type="button" className="icon-btn hero-mute" onClick={() => setMuted(prev => !prev)} aria-label={muted ? 'Nyalakan suara trailer' : 'Matikan suara trailer'} title="Suara trailer (M)">
            <i className={`fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`} aria-hidden="true"></i>
          </button>
        )}
      </div>
    </section>
  );
}

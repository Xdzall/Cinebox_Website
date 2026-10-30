'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FALLBACK_IMAGE, type MovieItem } from '../lib/types';

export interface CardActions {
  onOpen: (item: MovieItem) => void;
  onPlay: (item: MovieItem) => void;
  onToggleList: (item: MovieItem) => void;
  onToggleLike: (item: MovieItem) => void;
  isAdded: (id: string) => boolean;
  isLiked: (id: string) => boolean;
}

export function PosterImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      className={className}
      src={src || FALLBACK_IMAGE}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={event => {
        const img = event.currentTarget;
        if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
      }}
    />
  );
}

const typeLabel = (item: MovieItem) => (item.type === 'tv' ? 'Serial TV' : 'Film');

function CardHoverActions({ item, actions }: { item: MovieItem; actions: CardActions }) {
  const added = actions.isAdded(item.id);
  const liked = actions.isLiked(item.id);
  const stop = (fn: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    fn();
  };
  return (
    <div className="card-actions">
      <button type="button" className="card-action primary" onClick={stop(() => actions.onPlay(item))} aria-label={`Putar ${item.title}`} title="Putar">
        <i className="fa-solid fa-play" aria-hidden="true"></i>
      </button>
      <button type="button" className="card-action" onClick={stop(() => actions.onToggleList(item))} aria-label={added ? 'Hapus dari Daftar Saya' : 'Tambah ke Daftar Saya'} title={added ? 'Hapus dari Daftar Saya' : 'Tambah ke Daftar Saya'}>
        <i className={`fa-solid ${added ? 'fa-check text-green' : 'fa-plus'}`} aria-hidden="true"></i>
      </button>
      <button type="button" className="card-action" onClick={stop(() => actions.onToggleLike(item))} aria-label={liked ? 'Batal suka' : 'Suka'} title="Suka">
        <i className={`fa-solid fa-thumbs-up ${liked ? 'text-red' : ''}`} aria-hidden="true"></i>
      </button>
      <button type="button" className="card-action push-right" onClick={stop(() => actions.onOpen(item))} aria-label={`Detail ${item.title}`} title="Detail">
        <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export function MediaCard({ item, actions, progress }: { item: MovieItem; actions: CardActions; progress?: string }) {
  return (
    <div
      className="media-card"
    >
      <button type="button" className="media-open" aria-label={`${item.title}${item.year ? `, ${item.year}` : ''}, ${typeLabel(item)}`} onClick={() => actions.onOpen(item)} />
      <div className="media-poster">
        <PosterImage src={item.poster} alt="" />
        {item.rating && <span className="badge-rating-chip"><i className="fa-solid fa-star" aria-hidden="true"></i> {item.rating}</span>}
        {progress && <span className="badge-progress-chip">{progress}</span>}
        <CardHoverActions item={item} actions={actions} />
      </div>
      <div className="media-caption">
        <h3 className="media-title">{item.title}</h3>
        <span className="media-sub">{item.year && `${item.year} • `}{typeLabel(item)}</span>
      </div>
    </div>
  );
}

export function Top10Card({ item, rank, actions }: { item: MovieItem; rank: number; actions: CardActions }) {
  return (
    <div
      className="top10-card"
    >
      <button type="button" className="media-open" aria-label={`Peringkat ${rank}: ${item.title}`} onClick={() => actions.onOpen(item)} />
      <span className="top10-rank" aria-hidden="true">{rank}</span>
      <div className="media-poster top10-poster">
        <PosterImage src={item.poster} alt="" />
        {item.rating && <span className="badge-rating-chip"><i className="fa-solid fa-star" aria-hidden="true"></i> {item.rating}</span>}
        <CardHoverActions item={item} actions={actions} />
      </div>
    </div>
  );
}

export function MediaRow({
  title,
  items,
  actions,
  top10 = false,
  showProgress = false
}: {
  title: string;
  items: MovieItem[];
  actions: CardActions;
  top10?: boolean;
  showProgress?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, updateEdges]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="media-row" aria-label={title}>
      <h2 className="row-title">{title}</h2>
      <div className="row-viewport">
        <button type="button" className="row-arrow left" onClick={() => scrollByPage(-1)} disabled={edges.start} aria-label="Geser ke kiri" tabIndex={-1}>
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
        <div className={`row-track ${top10 ? 'is-top10' : ''}`} ref={trackRef} onScroll={updateEdges}>
          {items.map((item, index) =>
            top10 ? (
              <Top10Card key={item.id} item={item} rank={index + 1} actions={actions} />
            ) : (
              <MediaCard
                key={item.id}
                item={item}
                actions={actions}
                progress={showProgress && item.type === 'tv' && item.lastSeason ? `S${item.lastSeason}:E${item.lastEpisode || 1}` : undefined}
              />
            )
          )}
        </div>
        <button type="button" className="row-arrow right" onClick={() => scrollByPage(1)} disabled={edges.end} aria-label="Geser ke kanan" tabIndex={-1}>
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </section>
  );
}

export function MediaGrid({ items, actions }: { items: MovieItem[]; actions: CardActions }) {
  return (
    <div className="media-grid">
      {items.map(item => (
        <MediaCard key={item.id} item={item} actions={actions} />
      ))}
    </div>
  );
}

export function SkeletonRow({ count = 7 }: { count?: number }) {
  return (
    <div className="media-row" aria-hidden="true">
      <div className="skeleton skeleton-title"></div>
      <div className="row-track">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="media-card skeleton-card">
            <div className="media-poster skeleton"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="media-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="media-card skeleton-card">
          <div className="media-poster skeleton"></div>
        </div>
      ))}
    </div>
  );
}

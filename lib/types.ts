export interface TvEpisode {
  episode: number;
  title: string;
  thumbnail?: string;
}

export interface TvDetails {
  season_numbers?: number[];
  seasons?: Record<string, { season: number; episodes: TvEpisode[] }>;
}

export interface MovieItem {
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

export interface SectionItem {
  id: string;
  title: string;
  isTop10?: boolean;
  items: MovieItem[];
}

export interface CatalogData {
  view?: string;
  title?: string;
  version?: number;
  featured?: MovieItem[];
  sections?: SectionItem[];
}

export type ViewName = 'home' | 'movie' | 'tv' | 'popular' | 'mylist' | 'genre';
export type NavTarget = Exclude<ViewName, 'genre'>;

export const NAV_ITEMS: { id: NavTarget; label: string; icon: string }[] = [
  { id: 'home', label: 'Beranda', icon: 'fa-house' },
  { id: 'tv', label: 'Serial TV', icon: 'fa-tv' },
  { id: 'movie', label: 'Film', icon: 'fa-film' },
  { id: 'popular', label: 'Terbaru & Populer', icon: 'fa-fire' },
  { id: 'mylist', label: 'Daftar Saya', icon: 'fa-bookmark' }
];

export const GENRES = [
  'Aksi', 'Petualangan', 'Sci-Fi', 'Drama',
  'Horor', 'Komedi', 'Animasi', 'Korea',
  'Thriller', 'Fantasi', 'Kriminal', 'Romantis',
  'Misteri'
];

export const genreLabel = (genre: string) => (genre === 'Korea' ? 'Drama Korea' : genre);

export const genreText = (genre: MovieItem['genre']) => (Array.isArray(genre) ? genre.join(', ') : genre || '');

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';

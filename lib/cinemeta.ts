// Server-only helper around the public Cinemeta (Stremio) metadata API.
// It supplies the TMDB id some players need and real episode titles/thumbnails.

export interface CinemetaVideo {
  season?: number;
  episode?: number;
  number?: number;
  name?: string;
  title?: string;
  thumbnail?: string;
}

export interface CinemetaMeta {
  imdb_id?: string;
  moviedb_id?: number;
  name?: string;
  videos?: CinemetaVideo[];
}

const metaCache = new Map<string, { value: CinemetaMeta | null; expires: number }>();
const HIT_TTL = 12 * 60 * 60 * 1000;
const MISS_TTL = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

export async function getCinemetaMeta(imdbId: string, type: 'movie' | 'tv'): Promise<CinemetaMeta | null> {
  const key = `${type}:${imdbId}`;
  const cached = metaCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value: CinemetaMeta | null = null;
  try {
    const kind = type === 'tv' ? 'series' : 'movie';
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/${kind}/${imdbId}.json`, {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) value = (await res.json())?.meta || null;
  } catch {
    value = null;
  }

  if (metaCache.size >= MAX_ENTRIES) metaCache.delete(metaCache.keys().next().value as string);
  metaCache.set(key, { value, expires: Date.now() + (value ? HIT_TTL : MISS_TTL) });
  return value;
}

export async function getTmdbId(imdbId: string, type: 'movie' | 'tv'): Promise<number | null> {
  const meta = await getCinemetaMeta(imdbId, type);
  const id = Number(meta?.moviedb_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

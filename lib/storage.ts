import { isLegacySweetHome, normalizeCatalogItem, SWEET_HOME_ID } from './catalog-metadata';
import type { MovieItem } from './types';

// localStorage can throw (private mode, blocked site data), so every access is guarded.

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const STORAGE_KEYS = {
  myList: 'cinebox_netflix_my_list',
  liked: 'cinebox_netflix_liked',
  history: 'cinebox_netflix_watch_history'
} as const;

export function readPersonalLists() {
  const readItems = (key: string) => {
    const value = readStored<unknown>(key, []);
    return Array.isArray(value) ? value.filter((item): item is MovieItem =>
      item && typeof item.id === 'string' && typeof item.title === 'string') : [];
  };
  const originalList = readItems(STORAGE_KEYS.myList);
  const originalHistory = readItems(STORAGE_KEYS.history);
  const originals = [...originalList, ...originalHistory];
  const migrate = (items: MovieItem[]) => {
    const seen = new Set<string>();
    return items.map(normalizeCatalogItem).filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const myList = migrate(originalList);
  const history = migrate(originalHistory);
  const storedLikes = readStored<unknown>(STORAGE_KEYS.liked, []);
  const likes = Array.isArray(storedLikes) ? storedLikes.filter((id): id is string => typeof id === 'string') : [];
  const legacySweetHome = originals.some(isLegacySweetHome);
  const hasDune = originals.some(item => item.id === 'tt1160419' && !isLegacySweetHome(item));
  const liked = Array.from(new Set(likes.flatMap(id => id === 'tt1160419' && legacySweetHome
    ? hasDune ? [id, SWEET_HOME_ID] : [SWEET_HOME_ID] : [id])));
  writeStored(STORAGE_KEYS.myList, myList);
  writeStored(STORAGE_KEYS.history, history);
  writeStored(STORAGE_KEYS.liked, liked);
  return { myList, history, liked };
}

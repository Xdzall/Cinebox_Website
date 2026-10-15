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

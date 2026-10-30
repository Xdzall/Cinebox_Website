import { GENRES, type ViewName } from './types';

export interface NavigationState {
  view: ViewName;
  genre: string;
  query: string;
  searchOpen: boolean;
  filter: 'all' | 'movie' | 'tv';
}

export function parseNavigation(search: string): NavigationState {
  const params = new URLSearchParams(search);
  const view = params.get('view') || 'home';
  const genre = params.get('genre') || 'Semua';
  const query = params.get('q') || '';
  const filter = params.get('filter');
  return {
    view: ['home', 'movie', 'tv', 'popular', 'mylist', 'genre'].includes(view) ? view as ViewName : 'home',
    genre: GENRES.includes(genre) ? genre : 'Semua',
    query, searchOpen: params.get('search') === '1' || Boolean(query),
    filter: filter === 'movie' || filter === 'tv' ? filter : 'all'
  };
}

export function navigationUrl(state: NavigationState) {
  const params = new URLSearchParams();
  if (state.view !== 'home') params.set('view', state.view);
  if (state.genre !== 'Semua') params.set('genre', state.genre);
  if (state.query) params.set('q', state.query);
  if (state.searchOpen) params.set('search', '1');
  if (state.filter !== 'all' && state.searchOpen) params.set('filter', state.filter);
  return params.size ? `/?${params}` : '/';
}

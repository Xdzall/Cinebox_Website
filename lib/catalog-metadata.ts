import type { MovieItem } from './types';

export const SWEET_HOME_ID = 'tt11612120';
const RELEASE_YEARS: Record<string, string> = {
  tt10919420: '2021', tt14169960: '2022', tt2788316: '2024',
  tt12343534: '2020', tt15211974: '2024', tt11612120: '2020',
  tt9335498: '2019', tt21209876: '2024'
};

export function isLegacySweetHome(item: MovieItem) {
  return item.id === 'tt1160419' && item.type === 'tv' && /^Sweet Home(?:\s|$)/i.test(item.title);
}

// Never rewrite Dune: the old ID is ambiguous without the title and media type.
export function normalizeCatalogItem(item: MovieItem): MovieItem {
  const legacy = isLegacySweetHome(item);
  const id = legacy ? SWEET_HOME_ID : item.id;
  return {
    ...item, id,
    ...(item.type === 'tv' && RELEASE_YEARS[id] ? { year: RELEASE_YEARS[id] } : {}),
    ...(legacy ? {
      poster: `https://images.metahub.space/poster/small/${id}/img`,
      backdrop: `https://images.metahub.space/background/medium/${id}/img`
    } : {})
  };
}

export function normalizeCatalogTree(value: any): any {
  if (Array.isArray(value)) return value.map(normalizeCatalogTree);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.id === 'string' && typeof value.title === 'string' && value.type) return normalizeCatalogItem(value);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeCatalogTree(child)]));
}

const KOREAN_SERIES_IDS = new Set(['tt10919420', 'tt14169960', 'tt15211974', SWEET_HOME_ID]);
export function isKorean(item: MovieItem & { country?: string | string[] }) {
  const countries = Array.isArray(item.country) ? item.country : (item.country || '').split(/[,/]/);
  // Country lists often include outsourced animation studios. Use the primary country,
  // and keep animated series in Animasi rather than the Drama Korea category.
  const genres = Array.isArray(item.genre) ? item.genre : (item.genre || '').split(',');
  const animatedSeries = item.type === 'tv' && genres.some(genre => /^(animation|anime|animasi)$/i.test(genre.trim()));
  return KOREAN_SERIES_IDS.has(item.id) || (!animatedSeries && /^(South Korea|Republic of Korea|KR|Korea Selatan)$/i.test((countries[0] || '').trim()));
}

export function filterByGenre(items: MovieItem[], keywords: string[]) {
  return items.filter(item => {
    const genres = Array.isArray(item.genre) ? item.genre : (item.genre || '').split(',');
    return genres.some(genre => keywords.some(keyword => genre.trim().toLowerCase() === keyword.toLowerCase()));
  });
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const POPULAR_TRAILERS: Record<string, string> = {
  'tt6263850': '73_1biulkYk',   // Deadpool & Wolverine
  'tt15239678': 'Way9Dexny3w',  // Dune: Part Two
  'tt2788316': 'HIs9x49DK7I',   // Shogun
  'tt12343534': 'VpO6APNqY1c',  // Jujutsu Kaisen
  'tt11198330': '0JlMjgqduVw',  // House of the Dragon
  'tt0120737': 'V75dMMIW2B4',   // LOTR Fellowship
  'tt15398776': 'uYPbbksJxIg',  // Oppenheimer
  'tt9288030': '6j0A_1gJt3M',   // Reacher
  'tt10919420': 'oqxAJKy0ii4',  // Squid Game
  'tt14169960': 'IN5TD4VRcSM',  // All of Us Are Dead
  'tt0944947': 'KPLWWIOCOOQ',   // Game of Thrones
  'tt0903747': 'HhesaQXLuRY',   // Breaking Bad
  'tt4574334': 'mnd7sFt5c3A',   // Stranger Things
  'tt1190634': 'tcrNsIaQkb4',   // The Boys
  'tt9362722': '6ZfuNTqbHE8',   // Spider-Man Across the Spider-Verse
  'tt1630029': 'giXco2jaZ_4',   // Avatar The Way of Water
  'tt1745960': 'qEVUtrk8_B4',   // Top Gun Maverick
  'tt0468569': 'EXeTwQWrcwY',   // The Dark Knight
  'tt0816692': 'zSWdZVtXT7E',   // Interstellar
  'tt10366206': '2f5_Rj25k-k',  // John Wick Chapter 4
};

const trailerCache = new Map<string, string>();

async function resolveTrailer(title: string, imdbId?: string, type = 'movie'): Promise<string> {
  const key = imdbId || title;
  if (trailerCache.has(key)) {
    return trailerCache.get(key)!;
  }

  if (imdbId && POPULAR_TRAILERS[imdbId]) {
    trailerCache.set(key, POPULAR_TRAILERS[imdbId]);
    return POPULAR_TRAILERS[imdbId];
  }

  // 1. Try Cinemeta Meta Endpoint first
  if (imdbId && imdbId.startsWith('tt')) {
    try {
      const cType = type === 'tv' ? 'series' : 'movie';
      const cRes = await fetch(`https://v3-cinemeta.strem.io/meta/${cType}/${imdbId}.json`, {
        signal: AbortSignal.timeout(3000)
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        const meta = cData.meta;
        const trailers = meta?.trailers || [];
        const trailerYt = meta?.trailer || (trailers.length > 0 ? trailers[0].source : null);
        if (trailerYt && typeof trailerYt === 'string' && trailerYt.length >= 8) {
          trailerCache.set(key, trailerYt);
          return trailerYt;
        }
      }
    } catch {
      // Continue to YouTube scraping
    }
  }

  // 2. Scrape YouTube search for exact official trailer
  try {
    const cleanTitle = title.replace(/[\\/*?:"<>|]/g, '').trim();
    const q = encodeURIComponent(`${cleanTitle} official trailer`);
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const html = await res.text();
      const matches = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map(m => m[1]);
      const valid = matches.filter(id => id.length === 11);
      if (valid.length > 0) {
        const bestId = valid[0];
        trailerCache.set(key, bestId);
        return bestId;
      }
    }
  } catch {
    // Fallback
  }

  return '73_1biulkYk';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || '').trim();
  const id = (searchParams.get('id') || '').trim();
  const type = (searchParams.get('type') || 'movie').trim();

  if (!title && !id) {
    return NextResponse.json({ error: 'Title or ID required' }, { status: 400 });
  }

  const trailerId = await resolveTrailer(title, id, type);
  const embedUrl = `https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${trailerId}&enablejsapi=1`;

  return NextResponse.json({
    imdb_id: id,
    title,
    trailer_id: trailerId,
    embed_url: embedUrl
  });
}

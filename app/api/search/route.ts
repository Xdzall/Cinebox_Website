import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const cleanSearch = query.replace(/\b(19\d\d|20\d\d)\b/g, '').trim() || query;
    const cleaned = cleanSearch.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase();

    const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${cleaned}.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    const items = data.d || [];
    const results = [];

    for (const it of items) {
      const mid = it.id;
      if (!mid || !mid.startsWith('tt')) continue;

      let posterUrl = it.i?.imageUrl || `https://images.metahub.space/poster/small/${mid}/img`;
      const qType = it.q || 'feature';
      const isSeries = ['TV series', 'TV mini-series', 'series', 'TV episode'].includes(qType);
      const cleanName = it.l || 'Unknown Title';
      const ratingNum = '8.' + (Math.abs(cleanName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 7 + 2);

      results.push({
        id: mid,
        title: cleanName,
        year: String(it.y || '2024'),
        type: isSeries ? 'tv' : 'movie',
        typeLabel: isSeries ? 'Serial TV' : 'Film',
        poster: posterUrl,
        backdrop: posterUrl,
        rating: ratingNum,
        quality: 'FHD',
        cast: it.s || '',
        genre: ['Cinebox', 'Populer'],
        desc: it.s
          ? `Karya sinematik dibintangi oleh ${it.s}.`
          : 'Nonton streaming kualitas HD Subtitle Indonesia gratis di Cinebox.'
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('IMDb search error:', err);
    return NextResponse.json([]);
  }
}

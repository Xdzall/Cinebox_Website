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

    if (!res.ok) return NextResponse.json({ error: 'Sumber pencarian sedang tidak tersedia. Coba lagi.' }, { status: 502 });
    const data = await res.json();
    if (data.d !== undefined && !Array.isArray(data.d)) throw new Error('Invalid search response');
    const items = data.d || [];
    const results = [];

    for (const it of items) {
      const mid = it.id;
      if (!mid || !mid.startsWith('tt')) continue;

      let posterUrl = it.i?.imageUrl || `https://images.metahub.space/poster/small/${mid}/img`;
      const qType = it.q || 'feature';
      const isSeries = ['TV series', 'TV mini-series', 'series', 'TV episode'].includes(qType) || ['tvSeries', 'tvMiniSeries', 'tvEpisode'].includes(it.qid);
      const cleanName = it.l || 'Unknown Title';

      results.push({
        id: mid,
        title: cleanName,
        year: it.y ? String(it.y) : undefined,
        type: isSeries ? 'tv' : 'movie',
        typeLabel: isSeries ? 'Serial TV' : 'Film',
        poster: posterUrl,
        backdrop: posterUrl,
        cast: it.s || '',
        genre: ['Cinebox', 'Populer'],
        desc: it.s
          ? `Karya sinematik dibintangi oleh ${it.s}.`
          : `Jelajahi ${cleanName} di Cinebox.`
      });
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('IMDb search error:', err);
    const timeout = err instanceof Error && ['TimeoutError', 'AbortError'].includes(err.name);
    return NextResponse.json({ error: 'Pencarian gagal dimuat. Periksa koneksi lalu coba lagi.' }, { status: timeout ? 504 : 502 });
  }
}

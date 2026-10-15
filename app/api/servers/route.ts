import { NextResponse } from 'next/server';
import { buildStreamServers, type StreamContext, type StreamMediaType } from '../../../lib/stream-servers';
import { getTmdbId } from '../../../lib/cinemeta';

export const dynamic = 'force-dynamic';

function parsePositiveNumber(value: string | null): number | null {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,2}$/.test(value)) return null;
  return Number(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imdbId = (searchParams.get('id') || '').trim();
  const rawType = (searchParams.get('type') || 'movie').trim();
  const season = parsePositiveNumber(searchParams.get('season'));
  const episode = parsePositiveNumber(searchParams.get('episode'));

  if (!/^tt\d{7,12}$/.test(imdbId)) {
    return NextResponse.json({ error: 'A valid IMDb title ID is required' }, { status: 400 });
  }
  if (rawType !== 'movie' && rawType !== 'tv') {
    return NextResponse.json({ error: 'Type must be movie or tv' }, { status: 400 });
  }
  if (season === null || episode === null) {
    return NextResponse.json({ error: 'Season and episode must be positive integers from 1 to 999' }, { status: 400 });
  }

  const type: StreamMediaType = rawType;
  const context: StreamContext = { imdbId, type, tmdbId: await getTmdbId(imdbId, type) };
  const servers = buildStreamServers(context, season, episode);

  return NextResponse.json({
    imdb_id: imdbId,
    type,
    season,
    episode,
    context,
    primary_server: servers[0],
    servers
  });
}

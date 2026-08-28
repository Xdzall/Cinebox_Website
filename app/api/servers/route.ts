import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imdbId = (searchParams.get('id') || '').trim();
  const mType = (searchParams.get('type') || 'movie').trim();
  const season = searchParams.get('season') || '1';
  const episode = searchParams.get('episode') || '1';

  if (!imdbId) {
    return NextResponse.json({ error: 'IMDb ID required' }, { status: 400 });
  }

  const isTv = mType === 'tv';
  const s = season.match(/^\d+$/) ? season : '1';
  const e = episode.match(/^\d+$/) ? episode : '1';

  // Primary Server is VidAPI with auto Subtitle Indonesia
  const servers = isTv
    ? [
        { name: 'Server 1 (VidAPI)', url: `https://vaplayer.ru/embed/tv/${imdbId}/${s}/${e}?ds_lang=id` },
        { name: 'Server 2 (VidLink)', url: `https://vidlink.pro/tv/${imdbId}/${s}/${e}` },
        { name: 'Server 3 (2Embed)', url: `https://www.2embed.cc/embedtv/${imdbId}&s=${s}&e=${e}` },
        { name: 'Server 4 (AutoEmbed)', url: `https://autoembed.co/tv/imdb/${imdbId}/${s}/${e}` },
        { name: 'Server 5 (VidSrc)', url: `https://vidsrc.xyz/embed/tv/${imdbId}/${s}/${e}` },
        { name: 'Server 6 (MultiEmbed)', url: `https://multiembed.mov/?video_id=${imdbId}&s=${s}&e=${e}` }
      ]
    : [
        { name: 'Server 1 (VidAPI)', url: `https://vaplayer.ru/embed/movie/${imdbId}?ds_lang=id` },
        { name: 'Server 2 (VidLink)', url: `https://vidlink.pro/movie/${imdbId}` },
        { name: 'Server 3 (2Embed)', url: `https://www.2embed.cc/embed/${imdbId}` },
        { name: 'Server 4 (AutoEmbed)', url: `https://autoembed.co/movie/imdb/${imdbId}` },
        { name: 'Server 5 (VidSrc)', url: `https://vidsrc.xyz/embed/movie/${imdbId}` },
        { name: 'Server 6 (MultiEmbed)', url: `https://multiembed.mov/?video_id=${imdbId}` }
      ];

  return NextResponse.json({
    imdb_id: imdbId,
    type: mType,
    season: s,
    episode: e,
    primary_server: servers[0],
    servers,
    subtitle_url: `/api/subtitles/${imdbId}?season=${s}&episode=${e}`
  });
}

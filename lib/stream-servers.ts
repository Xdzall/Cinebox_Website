export type StreamMediaType = 'movie' | 'tv';

export interface StreamSubtitleInfo {
  availability: 'unknown';
  selection: 'provider-player';
  preferredLanguage: 'id' | null;
  disclosure: string;
}

export interface StreamServer {
  id: string;
  name: string;
  url: string;
  /** Short, factual note about the source shown under the server picker. */
  note: string;
  subtitle: StreamSubtitleInfo;
}

/** Per-title data resolved by /api/servers. tmdbId is optional so the client can still build a list when the lookup fails. */
export interface StreamContext {
  imdbId: string;
  type: StreamMediaType;
  tmdbId?: number | null;
}

const providerSubtitle = (preferredLanguage: 'id' | null): StreamSubtitleInfo => ({
  availability: 'unknown',
  selection: 'provider-player',
  preferredLanguage,
  disclosure: preferredLanguage === 'id'
    ? 'Subtitle Indonesia diminta ke pemutar. Ketersediaannya bergantung pada judul.'
    : 'Subtitle dikelola pemutar penyedia; bahasa Indonesia belum tentu tersedia.'
});

// Checked 2026-10-15. Removed: vidsrc.xyz (domain no longer resolves) and autoembed.co
// (TV returns 404; movies load player.autoembed.co, the same VidAPI player as vaplayer.ru).
export function buildStreamServers(ctx: StreamContext, season = 1, episode = 1): StreamServer[] {
  const tv = ctx.type === 'tv';
  const id = ctx.imdbId;
  const s = season;
  const e = episode;
  const servers: StreamServer[] = [
    {
      id: 'vidapi',
      name: 'VidAPI',
      url: tv
        ? `https://vaplayer.ru/embed/tv/${id}/${s}/${e}?ds_lang=id`
        : `https://vaplayer.ru/embed/movie/${id}?ds_lang=id`,
      note: 'Klik pertama pada pemutar dapat membuka tab iklan.',
      subtitle: providerSubtitle('id')
    }
  ];

  // VidLink only accepts TMDB ids; IMDb ids return HTTP 500 for episodes.
  if (ctx.tmdbId) {
    servers.push({
      id: 'vidlink',
      name: 'VidLink',
      url: tv
        ? `https://vidlink.pro/tv/${ctx.tmdbId}/${s}/${e}`
        : `https://vidlink.pro/movie/${ctx.tmdbId}`,
      note: 'Memakai ID TMDB dari Cinemeta.',
      subtitle: providerSubtitle(null)
    });
  }

  servers.push(
    {
      id: '2embed',
      name: '2Embed',
      url: tv
        ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`,
      note: 'Klik pada pemutar dapat membuka tab iklan.',
      subtitle: providerSubtitle(null)
    },
    {
      id: 'multiembed',
      name: 'MultiEmbed',
      url: tv
        ? `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}`,
      note: 'Dialihkan ke streamingnow.mov dan dapat membuka pop-up iklan.',
      subtitle: providerSubtitle(null)
    }
  );

  return servers;
}

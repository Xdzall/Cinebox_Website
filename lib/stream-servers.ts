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
  subtitle: StreamSubtitleInfo;
}

const providerSubtitle = (preferredLanguage: 'id' | null): StreamSubtitleInfo => ({
  availability: 'unknown',
  selection: 'provider-player',
  preferredLanguage,
  disclosure: preferredLanguage === 'id'
    ? 'Bahasa Indonesia diminta pada pemutar penyedia. Ketersediaan subtitle bergantung pada judul dan penyedia.'
    : 'Subtitle dan pilihan bahasa dikelola oleh pemutar penyedia; ketersediaannya belum terverifikasi.'
});

export function getStreamServers(
  id: string,
  type: StreamMediaType = 'movie',
  season = 1,
  episode = 1
): StreamServer[] {
  const tv = type === 'tv';
  const s = season;
  const e = episode;

  return [
    {
      id: 'vidapi',
      name: 'Server 1 (VidAPI)',
      url: tv
        ? `https://vaplayer.ru/embed/tv/${id}/${s}/${e}?ds_lang=id`
        : `https://vaplayer.ru/embed/movie/${id}?ds_lang=id`,
      subtitle: providerSubtitle('id')
    },
    {
      id: 'vidlink',
      name: 'Server 2 (VidLink)',
      url: tv
        ? `https://vidlink.pro/tv/${id}/${s}/${e}`
        : `https://vidlink.pro/movie/${id}`,
      subtitle: providerSubtitle(null)
    },
    {
      id: '2embed',
      name: 'Server 3 (2Embed)',
      url: tv
        ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`,
      subtitle: providerSubtitle(null)
    },
    {
      id: 'autoembed',
      name: 'Server 4 (AutoEmbed)',
      url: tv
        ? `https://autoembed.co/tv/imdb/${id}/${s}/${e}`
        : `https://autoembed.co/movie/imdb/${id}`,
      subtitle: providerSubtitle(null)
    },
    {
      id: 'vidsrc',
      name: 'Server 5 (VidSrc)',
      url: tv
        ? `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.xyz/embed/movie/${id}`,
      subtitle: providerSubtitle(null)
    },
    {
      id: 'multiembed',
      name: 'Server 6 (MultiEmbed)',
      url: tv
        ? `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}`,
      subtitle: providerSubtitle(null)
    }
  ];
}

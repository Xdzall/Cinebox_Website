import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

const KDRAMA_ASIAN_TITLES = [
  {
    id: "tt10919420",
    title: "Squid Game (오징어 게임)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.8",
    poster: "https://images.metahub.space/poster/small/tt10919420/img",
    backdrop: "https://images.metahub.space/background/medium/tt10919420/img",
    desc: "Ratusan pemain yang terlilit hutang menerima undangan aneh untuk bertanding dalam permainan anak-anak dengan taruhan mematikan berhadiah 45,6 miliar won.",
    genre: ["Drama Korea", "Thriller", "Survival"],
    trailer_yt: "oqxAJKy0ii4"
  },
  {
    id: "tt14169960",
    title: "All of Us Are Dead (지금 우리 학교는)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.5",
    poster: "https://images.metahub.space/poster/small/tt14169960/img",
    backdrop: "https://images.metahub.space/background/medium/tt14169960/img",
    desc: "Sebuah SMA menjadi titik nol penyebaran virus zombi yang mengerikan. Murid-murid yang terperangkap harus berjuang mati-matian mencari jalan keluar.",
    genre: ["Drama Korea", "Horor", "Aksi"],
    trailer_yt: "IN5TD4VRcSM"
  },
  {
    id: "tt2788316",
    title: "Shōgun (将軍)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.9",
    poster: "https://images.metahub.space/poster/small/tt2788316/img",
    backdrop: "https://images.metahub.space/background/medium/tt2788316/img",
    desc: "Di Jepang tahun 1600 pada masa fajar perang saudara yang menentukan abad tersebut, Lord Yoshii Toranaga bertarung demi bertahan hidup.",
    genre: ["Drama Asia", "Sejarah", "Petualangan"],
    trailer_yt: "HIs9x49DK7I"
  },
  {
    id: "tt12343534",
    title: "Jujutsu Kaisen (呪術廻戦)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.7",
    poster: "https://images.metahub.space/poster/small/tt12343534/img",
    backdrop: "https://images.metahub.space/background/medium/tt12343534/img",
    desc: "Seorang anak laki-laki menelan jimat terkutuk—jari iblis—dan menjadi terkutuk sendiri. Dia masuk sekolah dukun untuk bisa menemukan bagian tubuh iblis lainnya.",
    genre: ["Anime", "Aksi", "Fantasi"],
    trailer_yt: "VpO6APNqY1c"
  },
  {
    id: "tt15211974",
    title: "Parasyte: The Grey (기생수: 더 그레이)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.4",
    poster: "https://images.metahub.space/poster/small/tt15211974/img",
    backdrop: "https://images.metahub.space/background/medium/tt15211974/img",
    desc: "Ketika parasit tak dikenal dengan kejam mengambil alih tubuh manusia dan meraih kekuasaan, umat manusia harus bangkit untuk melawan ancaman tersebut.",
    genre: ["Drama Korea", "Sci-Fi", "Horor"],
    trailer_yt: ""
  },
  {
    id: "tt1160419",
    title: "Sweet Home (스위트홈)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.3",
    poster: "https://images.metahub.space/poster/small/tt1160419/img",
    backdrop: "https://images.metahub.space/background/medium/tt1160419/img",
    desc: "Seorang remaja penyendiri yang pindah ke apartemen baru harus berjuang bersama penghuni lain saat manusia mulai berubah menjadi monster mengerikan.",
    genre: ["Drama Korea", "Horor", "Aksi"],
    trailer_yt: ""
  },
  {
    id: "tt9335498",
    title: "Demon Slayer: Kimetsu no Yaiba",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.8",
    poster: "https://images.metahub.space/poster/small/tt9335498/img",
    backdrop: "https://images.metahub.space/background/medium/tt9335498/img",
    desc: "Sebuah keluarga diserang oleh iblis dan hanya dua anggota yang selamat—Tanjiro dan adiknya Nezuko, yang perlahan berubah menjadi iblis.",
    genre: ["Anime", "Aksi", "Petualangan"],
    trailer_yt: ""
  },
  {
    id: "tt21209876",
    title: "Solo Leveling (나 혼자만 레벨업)",
    year: "2024",
    type: "tv",
    typeLabel: "Serial TV",
    rating: "8.6",
    poster: "https://images.metahub.space/poster/small/tt21209876/img",
    backdrop: "https://images.metahub.space/background/medium/tt21209876/img",
    desc: "Hunter terlemah dari seluruh umat manusia, Sung Jin-woo, terbangun dalam pencarian tersembunyi yang memberinya kemampuan unik untuk naik level tanpa batas.",
    genre: ["Anime", "Aksi", "Fantasi"],
    trailer_yt: ""
  }
];

let cachedState: any = {
  version: Date.now(),
  lastUpdated: 0,
  rawMovies: [],
  rawSeries: [],
  home: null,
  movie: null,
  tv: null,
  collection: null
};

// Instantly load local disk cache if available
try {
  const catalogFile = path.join(process.cwd(), 'idlix_catalog.json');
  if (fs.existsSync(catalogFile)) {
    const raw = fs.readFileSync(catalogFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.home) {
      cachedState = { ...cachedState, ...parsed };
    }
  }
} catch (e) {
  // Ignore
}

async function fetchCinemetaCatalog(url: string, mtype = 'movie') {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = [];

    for (const it of data.metas || []) {
      const mid = it.imdb_id || it.id;
      if (!mid || !String(mid).startsWith('tt')) continue;
      if (!it.poster) continue;

      const title = it.name || 'Unknown';
      const rawYear = String(it.year || '');
      const cleanYear = rawYear.slice(0, 4);
      const rawRating = it.imdbRating;
      const parsedRating = Number(rawRating);
      const rating = rawRating && Number.isFinite(parsedRating) ? parsedRating.toFixed(1) : undefined;
      const genres = it.genres && it.genres.length > 0 ? it.genres : ['Cinebox', 'Populer'];
      const desc = it.description || `Jelajahi ${title}${cleanYear ? ` (${cleanYear})` : ''} di Cinebox.`;

      items.push({
        id: mid,
        title,
        year: cleanYear,
        type: mtype,
        typeLabel: mtype === 'tv' ? 'Serial TV' : 'Film',
        rating,
        poster: it.poster,
        backdrop: it.background || it.poster,
        desc,
        genre: genres.slice(0, 3),
        trailer_yt: POPULAR_TRAILERS[mid] || ''
      });
    }
    return items;
  } catch (err) {
    return [];
  }
}

const GENRE_MAP: Record<string, string[]> = {
  'Aksi': ['action', 'aksi'],
  'Petualangan': ['adventure', 'petualangan'],
  'Sci-Fi': ['sci-fi', 'scifi', 'science fiction'],
  'Drama': ['drama'],
  'Horor': ['horror', 'horor'],
  'Komedi': ['comedy', 'komedi'],
  'Animasi': ['animation', 'animasi', 'anime'],
  'Korea': ['korea', 'korean', 'kdrama', 'squid', 'dead', 'glory', 'queen', 'shōgun', 'leveling', 'jujutsu', 'slayer'],
  'Thriller': ['thriller', 'misteri', 'suspense'],
  'Fantasi': ['fantasy', 'fantasi', 'magic'],
  'Kriminal': ['crime', 'kriminal', 'gangster', 'cop'],
  'Romantis': ['romance', 'romantis', 'love'],
  'Misteri': ['mystery', 'misteri', 'detective']
};

function filterByKeywords(items: any[], keywords: string[]) {
  const res: any[] = [];
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) continue;
    const genresLower = (it.genre || []).map((g: string) => g.toLowerCase());
    const titleLower = (it.title || '').toLowerCase();
    const descLower = (it.desc || '').toLowerCase();

    const match = keywords.some(kw => {
      const kwL = kw.toLowerCase();
      return genresLower.some((g: string) => g.includes(kwL)) || titleLower.includes(kwL) || descLower.includes(kwL);
    });

    if (match) {
      seen.add(it.id);
      res.push(it);
    }
  }
  return res;
}

let isSyncing = false;

async function syncCatalog(force = false) {
  const now = Date.now();
  if (cachedState.home && !force && (now - cachedState.lastUpdated < 600000)) {
    return cachedState;
  }

  if (isSyncing) return cachedState;
  isSyncing = true;

  try {
    const [
      popMovies,
      topMovies,
      popSeries,
      topSeries,
      actMovies,
      scifiMovies,
      horrorMovies,
      animeSeries,
      dramaSeries
    ] = await Promise.all([
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/movie/top.json', 'movie'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/movie/imdbRating.json', 'movie'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/series/top.json', 'tv'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/series/imdbRating.json', 'tv'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/movie/top/genre=Action.json', 'movie'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/movie/top/genre=Sci-Fi.json', 'movie'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/movie/top/genre=Horror.json', 'movie'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/series/top/genre=Animation.json', 'tv'),
      fetchCinemetaCatalog('https://v3-cinemeta.strem.io/catalog/series/top/genre=Drama.json', 'tv')
    ]);

    const allMoviesMap = new Map();
    for (const m of [...popMovies, ...topMovies, ...actMovies, ...scifiMovies, ...horrorMovies]) {
      allMoviesMap.set(m.id, m);
    }
    const allMovies = Array.from(allMoviesMap.values());

    const allSeriesMap = new Map();
    for (const s of [...KDRAMA_ASIAN_TITLES, ...popSeries, ...topSeries, ...animeSeries, ...dramaSeries]) {
      allSeriesMap.set(s.id, s);
    }
    const allSeries = Array.from(allSeriesMap.values());

    if (allMovies.length > 0 && allSeries.length > 0) {
      cachedState.rawMovies = allMovies;
      cachedState.rawSeries = allSeries;

      // Compute Top 10 Ranked for Movies and Series
      const top10Movies = [...allMovies]
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        .slice(0, 10)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));

      const top10Series = [...allSeries]
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        .slice(0, 10)
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

      const homeFeatured = [...top10Movies.slice(0, 4), ...top10Series.slice(0, 4)];

      cachedState.home = {
        view: 'home',
        title: 'Beranda Cinebox',
        featured: homeFeatured,
        sections: [
          { id: 'top_10_movies_today', title: '🔥 10 Film Pilihan', isTop10: true, items: top10Movies },
          { id: 'top_10_series_today', title: '👑 10 Serial TV Pilihan', isTop10: true, items: top10Series },
          { id: 'kdrama_asian_curated', title: '🌸 Drama Korea & Serial Asia Terpopuler', items: KDRAMA_ASIAN_TITLES },
          { id: 'trending_action', title: '⚡ Film & Serial Aksi Penuh Ketegangan', items: filterByKeywords([...allMovies, ...allSeries], ['action', 'adventure']).slice(0, 20) },
          { id: 'trending_horror', title: '👻 Horor & Thriller Menegangkan', items: filterByKeywords([...allMovies, ...allSeries], ['horror', 'mystery', 'thriller']).slice(0, 20) },
          { id: 'trending_scifi', title: '🚀 Petualangan Fantasi & Sci-Fi', items: filterByKeywords([...allMovies, ...allSeries], ['sci-fi', 'fantasy', 'animation']).slice(0, 20) }
        ]
      };

      cachedState.movie = {
        view: 'movie',
        title: 'Film di Cinebox',
        featured: top10Movies.slice(0, 6),
        sections: [
          { id: 'top_10_movies_today', title: '🔥 10 Film Pilihan', isTop10: true, items: top10Movies },
          { id: 'movie_pop', title: '💥 Film Paling Populer di IMDb (IMDb Most Popular Movies)', items: popMovies.slice(0, 28) },
          { id: 'movie_top', title: '⭐ Film Rating Tertinggi di IMDb (IMDb Top 250 Movies)', items: topMovies.slice(0, 28) },
          { id: 'movie_action', title: '⚡ Film Aksi & Petualangan Pilihan IMDb', items: (actMovies.length ? actMovies : filterByKeywords(allMovies, ['action', 'adventure'])).slice(0, 28) },
          { id: 'movie_scifi', title: '🚀 Film Sci-Fi & Fantasi Terbaik IMDb', items: (scifiMovies.length ? scifiMovies : filterByKeywords(allMovies, ['sci-fi', 'fantasy'])).slice(0, 28) },
          { id: 'movie_horror', title: '👻 Film Horor & Thriller Populer IMDb', items: (horrorMovies.length ? horrorMovies : filterByKeywords(allMovies, ['horror', 'thriller', 'mystery'])).slice(0, 28) }
        ]
      };

      cachedState.tv = {
        view: 'tv',
        title: 'Serial TV di Cinebox',
        featured: top10Series.slice(0, 6),
        sections: [
          { id: 'top_10_series_today', title: '👑 10 Serial TV Pilihan', isTop10: true, items: top10Series },
          { id: 'kdrama_asian_curated', title: '🌸 Drama Korea & Serial Asia Terpopuler', items: KDRAMA_ASIAN_TITLES },
          { id: 'tv_pop', title: '📺 Serial TV Paling Populer di IMDb', items: popSeries.slice(0, 28) },
          { id: 'tv_top', title: '⭐ Serial TV Rating Tertinggi di IMDb', items: topSeries.slice(0, 28) },
          { id: 'tv_anime', title: '⚡ Serial Anime & Animasi Terpopuler IMDb', items: (animeSeries.length ? animeSeries : filterByKeywords(allSeries, ['animation', 'anime'])).slice(0, 28) },
          { id: 'tv_drama', title: '🎭 Serial TV Drama, Kriminal & Misteri Terbaik IMDb', items: (dramaSeries.length ? dramaSeries : filterByKeywords(allSeries, ['drama', 'crime', 'mystery'])).slice(0, 28) }
        ]
      };

      cachedState.collection = {
        view: 'collection',
        title: 'Koleksi Sinematik & Franchise',
        featured: homeFeatured.slice(0, 4),
        sections: [
          { id: 'col_marvel_dc', title: '🛡️ Franchise Superhero & Komik Terpopuler IMDb', items: filterByKeywords([...allMovies, ...allSeries], ['deadpool', 'wolverine', 'superman', 'batman', 'marvel', 'spider', 'x-men', 'boys']).slice(0, 28) },
          { id: 'col_epic', title: '👑 Karya Epik, Fantasi & Petualangan Legendaris IMDb', items: filterByKeywords([...allMovies, ...allSeries], ['rings', 'dune', 'dragon', 'thrones', 'avatar', 'interstellar']).slice(0, 28) },
          { id: 'col_netflix', title: '🎬 Serial & Film Netflix Originals Populer', items: filterByKeywords([...allMovies, ...allSeries], ['squid', 'stranger', 'dead', 'reacher', 'silo', 'outer banks']).slice(0, 28) }
        ]
      };

      cachedState.version = now;
      cachedState.lastUpdated = now;

    }
  } finally {
    isSyncing = false;
  }

  return cachedState;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'home').toLowerCase();
  const genre = searchParams.get('genre') || '';

  const state = await syncCatalog();

  if (genre && genre !== 'Semua') {
    const allM = state.rawMovies || [];
    const allS = state.rawSeries || [];
    const kwList = GENRE_MAP[genre] || [genre.toLowerCase()];

    let genreM = filterByKeywords(allM, kwList);
    let genreS = filterByKeywords(allS, kwList);

    if (genre === 'Korea') {
      genreS = KDRAMA_ASIAN_TITLES;
      genreM = [];
    }

    const genreTop = [...genreM, ...genreS].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    const feat = [...genreM.slice(0, 3), ...genreS.slice(0, 3)];

    return NextResponse.json({
      view: `genre_${genre}`,
      title: `Genre ${genre} di Cinebox`,
      version: state.version,
      featured: feat.length > 0 ? feat : (state.home?.featured || []).slice(0, 4),
      sections: [
        { id: `genre_${genre}_movies`, title: `🔥 Film ${genre} Terpopuler di IMDb`, items: genreM.length ? genreM.slice(0, 28) : allM.slice(0, 28) },
        { id: `genre_${genre}_series`, title: `📺 Serial TV ${genre} Terpopuler di IMDb`, items: genreS.length ? genreS.slice(0, 28) : allS.slice(0, 28) },
        { id: `genre_${genre}_top`, title: `⭐ Karya ${genre} Rating Tertinggi di IMDb`, items: genreTop.length ? genreTop.slice(0, 28) : [...allM, ...allS].slice(0, 28) }
      ]
    });
  }

  const result = state[type] || state.home || {};
  return NextResponse.json({ ...result, version: state.version });
}

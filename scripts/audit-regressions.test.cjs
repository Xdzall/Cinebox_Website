const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');

// Run the app's TypeScript modules without adding a separate test framework.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText, filename);
};
const { normalizeCatalogItem, filterByGenre, isKorean } = require('../lib/catalog-metadata.ts');
const { readPersonalLists, STORAGE_KEYS } = require('../lib/storage.ts');
const { parseNavigation, navigationUrl } = require('../lib/navigation.ts');
const search = require('../app/api/search/route.ts');
const sweet = { id: 'tt1160419', title: 'Sweet Home (스위트홈)', type: 'tv', year: '2024', lastSeason: 2, lastEpisode: 3 };
const dune = { id: 'tt1160419', title: 'Dune', type: 'movie', year: '2021' };

test('Sweet Home identity and release year change without rewriting Dune', () => {
  const corrected = normalizeCatalogItem(sweet);
  assert.equal(corrected.id, 'tt11612120');
  assert.equal(corrected.year, '2020');
  assert.ok(corrected.poster.includes(corrected.id));
  assert.deepEqual([corrected.lastSeason, corrected.lastEpisode], [2, 3]);
  assert.deepEqual(normalizeCatalogItem(dune), dune);
});

test('stored lists migrate, deduplicate, preserve order and keep ambiguous Dune likes', () => {
  const store = new Map();
  global.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  store.set(STORAGE_KEYS.myList, JSON.stringify([sweet, dune, { ...sweet, id: 'tt11612120' }]));
  store.set(STORAGE_KEYS.history, JSON.stringify([sweet]));
  store.set(STORAGE_KEYS.liked, JSON.stringify(['tt1160419']));
  const result = readPersonalLists();
  assert.deepEqual(result.myList.map(item => item.id), ['tt11612120', 'tt1160419']);
  assert.deepEqual(result.liked, ['tt1160419', 'tt11612120']);
  assert.equal(result.history[0].lastEpisode, 3);
  assert.deepEqual(readPersonalLists(), result); // migration is idempotent
  store.set(STORAGE_KEYS.myList, JSON.stringify([sweet]));
  store.set(STORAGE_KEYS.liked, JSON.stringify(['tt1160419']));
  assert.deepEqual(readPersonalLists().liked, ['tt11612120']);
  store.set(STORAGE_KEYS.myList, '{}');
  assert.deepEqual(readPersonalLists().myList, []);
});

test('genre uses metadata rather than title words, Korea excludes Japanese shows', () => {
  const items = [{ id: 'a', title: 'Aksi kuching', genre: ['Comedy'] }, { id: 'b', title: 'Example', genre: ['Action'] }];
  assert.deepEqual(filterByGenre(items, ['action', 'aksi']).map(item => item.id), ['b']);
  assert.deepEqual(filterByGenre(items, ['horror']), []);
  assert.equal(isKorean({ id: 'tt2788316', title: 'Shōgun', country: 'Japan' }), false);
  assert.equal(isKorean({ id: 'tt12343534', title: 'Jujutsu Kaisen', genre: ['Anime'] }), false);
  assert.equal(isKorean({ id: 'x', title: 'A Korean film', country: 'South Korea' }), true);
  assert.equal(isKorean({ id: 'tt0417299', title: 'Avatar: The Last Airbender', type: 'tv', country: 'United States, South Korea', genre: ['Animation'] }), false);
  assert.equal(isKorean({ id: 'x', title: 'Coproduction', country: 'Ireland, United Kingdom, South Korea' }), false);
});

test('catalog endpoint keeps Korea exclusive and returns empty sections for absent genres', async () => {
  global.fetch = async () => Response.json({ metas: [
    { id: 'tt0111161', name: 'Example Action', poster: 'https://example.test/poster', genres: ['Action'], year: '1994' },
    { id: 'tt2788316', name: 'Shōgun', poster: 'https://example.test/shogun', genres: ['Drama'], country: 'Japan' }
  ] });
  const catalog = require('../app/api/catalog/route.ts');
  const data = await (await catalog.GET(new Request('http://localhost/api/catalog?genre=Korea'))).json();
  const items = data.sections.flatMap(section => section.items);
  assert.ok(items.length > 0);
  assert.ok(items.every(isKorean));
  assert.ok(items.some(item => item.id === 'tt11612120'));
  assert.ok(!items.some(item => item.id === 'tt1160419'));
  assert.deepEqual(data.sections[0].items, []);
  const absent = await (await catalog.GET(new Request('http://localhost/api/catalog?genre=Romantis'))).json();
  assert.deepEqual(absent.featured, []);
  assert.ok(absent.sections.every(section => section.items.length === 0));
});

test('search distinguishes upstream errors, timeout, genuine zero results and TV results', async () => {
  const request = () => new Request('http://localhost/api/search?q=Squid%20Game');
  global.fetch = async () => new Response('', { status: 503 });
  assert.equal((await search.GET(request())).status, 502);
  global.fetch = async () => { const error = new Error('timeout'); error.name = 'TimeoutError'; throw error; };
  const originalError = console.error;
  console.error = () => {};
  try { assert.equal((await search.GET(request())).status, 504); }
  finally { console.error = originalError; }
  global.fetch = async () => Response.json({ d: [] });
  const empty = await search.GET(request());
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), []);
  global.fetch = async () => Response.json({ d: [{ id: 'tt10919420', l: 'Squid Game', qid: 'tvSeries', y: 2021 }] });
  assert.equal((await (await search.GET(request())).json())[0].type, 'tv');
});

test('Sweet Home episode fallback uses the corrected ID', async () => {
  global.fetch = async () => Response.json({ meta: { videos: [] } });
  const tv = require('../app/api/tv/details/route.ts');
  const data = await (await tv.GET(new Request('http://localhost/api/tv/details?id=tt11612120'))).json();
  assert.equal(data.imdb_id, 'tt11612120');
  assert.deepEqual(data.season_numbers, [1, 2, 3]);
  assert.equal(data.seasons['3'].episodes.length, 8);
});

test('navigation round-trips pages, genre and search filters; rejects unknown values', () => {
  for (const view of ['home', 'movie', 'tv', 'popular', 'mylist', 'genre']) {
    const state = { view, genre: view === 'genre' ? 'Korea' : 'Semua', query: '', searchOpen: false, filter: 'all' };
    assert.deepEqual(parseNavigation(new URL(navigationUrl(state), 'http://localhost').search), state);
  }
  const searching = { view: 'movie', genre: 'Semua', query: 'Squid Game', searchOpen: true, filter: 'tv' };
  assert.deepEqual(parseNavigation(new URL(navigationUrl(searching), 'http://localhost').search), searching);
  assert.deepEqual(parseNavigation('?view=bad&genre=bad&filter=bad'), { view: 'home', genre: 'Semua', query: '', searchOpen: false, filter: 'all' });
});

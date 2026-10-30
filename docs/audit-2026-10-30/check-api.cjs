const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const value = key => {
    const line = env.split(/\r?\n/).find(line => line.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  };
  const login = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: value('CINEBOX_USERNAME'), password: value('CINEBOX_PASSWORD')})
  });
  if (!login.ok) throw new Error(`Local login status ${login.status}`);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  const paths = {
    korea: '/api/catalog?type=home&genre=Korea',
    squidSearch: '/api/search?q=Squid%20Game',
    sweetHomeSearch: '/api/search?q=Sweet%20Home',
    sweetHomeCuratedDetails: '/api/tv/details?id=tt1160419',
    squidDetails: '/api/tv/details?id=tt10919420'
  };
  const output = {};
  await Promise.all(Object.entries(paths).map(async ([key, pathname]) => {
    const res = await fetch(`http://localhost:3000${pathname}`, {headers: {cookie}});
    const data = await res.json();
    output[key] = {status: res.status, data};
  }));
  fs.writeFileSync(path.join(__dirname, 'api-evidence.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify({
    korea: output.korea.data.sections?.map(s => ({title:s.title, firstTitles:s.items.slice(0,3).map(i=>i.title)})),
    sweetHomeSearch: output.sweetHomeSearch.data.map(i=>({id:i.id,title:i.title,type:i.type})),
    squidSeasons: output.squidDetails.data.season_numbers,
    sweetHomeCuratedSeasons: output.sweetHomeCuratedDetails.data.season_numbers
  }, null, 2));
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});

const fs = require('node:fs');
async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const value = key => env.split(/\r?\n/).find(line => line.startsWith(`${key}=`))?.slice(key.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  const base = process.env.AUDIT_BASE_URL || 'http://localhost:3002';
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: value('CINEBOX_USERNAME'), password: value('CINEBOX_PASSWORD') })
  });
  if (!login.ok) throw new Error(`Login status ${login.status}`);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  const res = await fetch(`${base}/api/catalog?genre=Korea`, { headers: { cookie } });
  const data = await res.json();
  console.log(JSON.stringify(data.sections.slice(0, 2).map(section => ({
    title: section.title, items: section.items.map(item => ({ id: item.id, title: item.title, country: item.country, genre: item.genre }))
  })), null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

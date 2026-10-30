// Packs browser-extension/ into public/downloads/cinebox-player-guard.zip so logged-in viewers
// can download it from the site. Runs before `next dev` / `next build`; no dependencies
// (files are stored uncompressed, which is fine for a few small text files).
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'browser-extension');
const target = join(root, 'public', 'downloads', 'cinebox-player-guard.zip');
const folder = 'cinebox-player-guard/';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Fixed timestamp (1 Jan 2026) keeps the archive byte-identical between builds.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const files = readdirSync(source)
  .filter(name => !name.includes('.test.') && statSync(join(source, name)).isFile())
  .sort();

const locals = [];
const centrals = [];
let offset = 0;
for (const name of files) {
  const data = readFileSync(join(source, name));
  const path = Buffer.from(folder + name, 'utf8');
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(0, 8); // stored
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(path.length, 26);
  locals.push(local, path, data);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(path.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, path);

  offset += local.length + path.length + data.length;
}

const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, Buffer.concat([...locals, ...centrals, end]));
console.log(`Packed ${files.length} extension files into public/downloads/cinebox-player-guard.zip`);

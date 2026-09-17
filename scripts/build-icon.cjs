// Packs PNG renders of electron/assets/icon.svg into electron/assets/icon.ico.
//
// Usage: node scripts/build-icon.cjs <json-with-base64-pngs> [...more]
// Each JSON file maps "<size>" -> base64 PNG (the format the render step in
// the browser produces). Modern Windows accepts PNG-compressed ICO entries,
// which keeps the file small and lossless at every size.
const fs = require('fs');
const path = require('path');

const inputs = process.argv.slice(2);
if (!inputs.length){
  console.error('usage: node scripts/build-icon.cjs <renders.json> [...]');
  process.exit(1);
}

const pngs = new Map(); // size -> Buffer
for (const file of inputs){
  let raw = fs.readFileSync(file, 'utf8');
  let parsed = JSON.parse(raw);
  // Tool-result wrapper: [{type:'text', text:'{...}'}]
  if (Array.isArray(parsed) && parsed[0]?.text) parsed = JSON.parse(parsed[0].text);
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  for (const [size, b64] of Object.entries(parsed)){
    pngs.set(Number(size), Buffer.from(b64, 'base64'));
  }
}

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const entries = ICO_SIZES.filter(s => pngs.has(s)).map(s => ({ size: s, data: pngs.get(s) }));
if (!entries.length) throw new Error('no usable sizes found');

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);      // reserved
header.writeUInt16LE(1, 2);      // type: icon
header.writeUInt16LE(entries.length, 4);

const dirSize = 16 * entries.length;
let offset = 6 + dirSize;
const dir = Buffer.alloc(dirSize);
entries.forEach((e, i) => {
  const o = i * 16;
  dir[o] = e.size >= 256 ? 0 : e.size;      // width (0 = 256)
  dir[o + 1] = e.size >= 256 ? 0 : e.size;  // height
  dir[o + 2] = 0;                           // palette
  dir[o + 3] = 0;                           // reserved
  dir.writeUInt16LE(1, o + 4);              // colour planes
  dir.writeUInt16LE(32, o + 6);             // bits per pixel
  dir.writeUInt32LE(e.data.length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += e.data.length;
});

const out = Buffer.concat([header, dir, ...entries.map(e => e.data)]);
const dest = path.join(__dirname, '..', 'electron', 'assets', 'icon.ico');
fs.writeFileSync(dest, out);
console.log(`wrote ${dest}: ${entries.map(e => e.size).join(', ')} px, ${out.length} bytes`);

// Also keep a large PNG for stores / docs.
if (pngs.has(512)){
  fs.writeFileSync(path.join(__dirname, '..', 'electron', 'assets', 'icon.png'), pngs.get(512));
  console.log('wrote electron/assets/icon.png (512px)');
}

/* Обновляет YAK_BUILD и ?v= в index.html + build.json */
const fs = require('fs');
const path = require('path');

const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const build =
  d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());

const dir = __dirname;
const file = path.join(dir, 'index.html');
const src = fs.readFileSync(file, 'utf8');
const out = src
  .replace(/(window\.YAK_BUILD\s*=\s*')\d+(')/g, '$1' + build + '$2')
  .replace(/(\?v=)\d{8,}/g, '$1' + build);
if (out !== src) fs.writeFileSync(file, out);

fs.writeFileSync(path.join(dir, 'build.json'), JSON.stringify({
  id: build,
  note: 'Clients reload when this id differs from window.YAK_BUILD',
}, null, 2) + '\n');

console.log('BUILD', build);

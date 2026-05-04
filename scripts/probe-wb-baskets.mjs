import fs from 'fs';
import https from 'https';

/**
 * Обновляет constants/wb-nm-to-basket.json по всем ссылкам WB в каталоге.
 * Запуск из корня проекта: node scripts/probe-wb-baskets.mjs
 */
const text = fs.readFileSync('app/(tabs)/gifts.tsx', 'utf8');
const re = /catalog\/(\d+)\/detail/g;
const ids = [...new Set([...text.matchAll(re)].map((m) => +m[1]))].sort((a, b) => a - b);

function head(host, path) {
  return new Promise((resolve) => {
    const req = https.request(
      { hostname: host, path, method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => resolve(res.statusCode)
    );
    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

async function findBasket(nm) {
  const vol = Math.floor(nm / 1e5);
  const part = Math.floor(nm / 1e3);
  const path = `/vol${vol}/part${part}/${nm}/images/c516x688/1.webp`;
  const checks = [];
  for (let b = 1; b <= 26; b++) {
    const h = `basket-${String(b).padStart(2, '0')}.wbbasket.ru`;
    checks.push(head(h, path).then((c) => (c === 200 ? b : 0)));
  }
  const hits = await Promise.all(checks);
  return hits.find((x) => x > 0) ?? 0;
}

const out = {};
for (const nm of ids) {
  process.stdout.write(`${nm} `);
  out[nm] = await findBasket(nm);
  console.log(out[nm]);
}
const json = JSON.stringify(out, null, 2) + '\n';
fs.writeFileSync('constants/wb-nm-to-basket.json', json, 'utf8');
console.error(`Written constants/wb-nm-to-basket.json (${ids.length} nmId)`);

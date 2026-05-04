/**
 * Печатает TSV: sku, nmId, preview_url, product_page
 * Запуск: node scripts/write-catalog-wb-urls.mjs > scripts/catalog-wb-preview-urls.tsv
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const giftsPath = join(__dirname, '../app/(tabs)/gifts.tsx');
const basketPath = join(__dirname, '../constants/wb-nm-to-basket.json');

const text = fs.readFileSync(giftsPath, 'utf8');
const WB = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

const re = /sku:\s*'([^']+)',\s*\n\s*link:\s*'(https:\/\/www\.wildberries\.ru\/catalog\/(\d+)\/detail\.aspx)'/g;
const rows = [];
let m;
while ((m = re.exec(text)) !== null) {
  const sku = m[1];
  const page = m[2];
  const nmId = +m[3];
  const basket = WB[String(nmId)];
  if (!basket) {
    console.error('No basket for', nmId, sku);
    process.exit(1);
  }
  const vol = Math.floor(nmId / 1e5);
  const part = Math.floor(nmId / 1e3);
  const host = `basket-${String(basket).padStart(2, '0')}.wbbasket.ru`;
  const preview = `https://${host}/vol${vol}/part${part}/${nmId}/images/c516x688/1.webp`;
  rows.push({ sku, nmId, preview, page });
}

console.log(['sku', 'nmId', 'preview_url', 'product_page'].join('\t'));
for (const r of rows) {
  console.log([r.sku, r.nmId, r.preview, r.page].join('\t'));
}

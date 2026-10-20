// Checks that every text key used in the app exists in English and Turkish.
//   cd tests && node i18n.check.mjs
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try { res.end(readFileSync(join(ROOT, p === '/' ? 'index.html' : p))); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
await page.addInitScript({ path: join(ROOT, 'tests/fake-supabase.js') });
await page.route('https://unpkg.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForSelector('#authForm');
const dict = await page.evaluate(() => ({ en: Object.keys(I18N.en), tr: Object.keys(I18N.tr), cats: CATEGORIES }));
await browser.close(); server.close();

const src = readdirSync(join(ROOT, 'js')).map((f) => readFileSync(join(ROOT, 'js', f), 'utf8')).join('\n') + readFileSync(join(ROOT, 'index.html'), 'utf8');
const used = new Set();
for (const m of src.matchAll(/\bt\('([a-z0-9_]+)'/g)) used.add(m[1]);
for (const m of src.matchAll(/\btp\('([a-z0-9_]+)'/g)) { used.add(m[1] + '_one'); used.add(m[1] + '_other'); }
for (const m of src.matchAll(/data-t="([a-z0-9_]+)"/g)) used.add(m[1]);
// keys built at runtime
dict.cats.forEach((c) => used.add('cat_' + c));
['light', 'dark', 'system'].forEach((x) => used.add('theme_' + x));
['packed', 'in_transit', 'unpacked'].forEach((x) => used.add('move_' + x));
['owner', 'editor', 'viewer', 'customer'].forEach((x) => used.add('role_' + x));
['editor', 'viewer', 'customer'].forEach((x) => used.add('role_' + x + '_hint'));
['open', 'ready', 'done', 'cancelled'].forEach((x) => used.add('req_' + x));
['reminders', 'out', 'expiring', 'warranty'].forEach((x) => { used.add('att_title_' + x); used.add('att_intro_' + x); });
['idea', 'problem', 'other'].forEach((x) => used.add('fb_' + x));
const en = new Set(dict.en), tr = new Set(dict.tr);
const missingEn = [...used].filter((k) => !en.has(k) && !/^(cat|theme|move|role|req|att_title|att_intro|fb|act)_$/.test(k));
const missingTr = dict.en.filter((k) => !tr.has(k));
const extraTr = dict.tr.filter((k) => !en.has(k));
console.log(`keys: en ${dict.en.length}, tr ${dict.tr.length}, used ${used.size}`);
console.log('used but missing in English:', missingEn.length ? missingEn : 'none');
console.log('missing in Turkish:', missingTr.length ? missingTr : 'none');
console.log('only in Turkish:', extraTr.length ? extraTr : 'none');
process.exit(missingEn.length || missingTr.length || extraTr.length ? 1 : 0);

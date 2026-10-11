// End-to-end smoke test: runs index.html in headless Chromium against a fake
// Supabase (tests/fake-supabase.js) and a fake AI function.
//
//   cd tests && npm install && npx playwright install chromium
//   node smoke.mjs                 (CHROME_PATH=/path/to/chrome to use another browser)
//   SHOTS=./shots node smoke.mjs   (also saves screenshots)
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
if (SHOTS) await mkdir(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

await page.addInitScript({ path: join(ROOT, 'tests/fake-supabase.js') });
await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
await page.route('https://unpkg.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));

let aiMode = 'ok';
let aiCalls = [];
await page.route('**/functions/v1/box-ai', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  aiCalls.push(body);
  const json = (status, b) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) });
  if (body.action === 'usage') return json(200, { limit: 20, remaining: 20 - aiCalls.filter((c) => c.action === 'identify').length });
  if (aiMode === 'limit') return json(429, { error: 'daily_limit', limit: 20, remaining: 0 });
  return json(200, {
    limit: 20, remaining: 19,
    items: [
      { name: 'cordless drill', category: 'tools', quantity: 1 },
      { name: 'drill bit set', category: 'tools', quantity: 1 },
      { name: 'extension cord', category: 'electronics', quantity: 2 },
      { name: 'work gloves', category: 'clothing', quantity: 3 },
      { name: 'mystery object', category: 'other', quantity: 1 }
    ]
  });
});

const shot = async (name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: false }); };
const wait = (ms) => page.waitForTimeout(ms);
const text = (sel) => page.locator(sel).first().innerText();

// ---------- auth ----------
await page.goto(BASE + '/');
await page.waitForSelector('#authForm');
ok(await page.locator('.auth-hero .code-xl').innerText() === 'Box Finder', 'auth screen shows the app name');
await shot('01-auth');
await page.fill('input[name=email]', 'hamza@example.com');
await page.fill('input[name=password]', 'wrongpass');
await page.click('#authForm [type=submit]');
await page.waitForSelector('#authErr:not([hidden])');
const authErrText = await text('#authErr');
ok(authErrText.includes('wrong'), `wrong password shows an error (${authErrText})`);
await page.fill('input[name=password]', 'secret123');
await page.click('#authForm [type=submit]');
await page.waitForSelector('.page-title');
ok(await text('.page-title') === 'My storage', 'sign-in creates the personal space');
ok(await page.locator('.empty h2').innerText() === 'No boxes yet', 'empty home invites to create a box');
await shot('02-empty-home');

// ---------- create a box with a new place ----------
await page.click('.empty [data-act=new-box]');
await page.waitForSelector('#boxForm');
await page.click('#boxForm [type=submit]');
ok(!(await page.locator('#boxErr').isHidden()), 'box name is required');
await page.fill('#boxForm input[name=name]', 'Garage tools');
await page.selectOption('#boxForm select[name=location]', '__new');
await page.fill('#boxForm input[name=newPlace]', 'Garage');
await page.fill('#boxForm input[name=spot]', 'Shelf 2');
await shot('03-new-box-form');
await page.click('#boxForm [type=submit]');
await page.waitForSelector('.label-hero .code-xl');
ok(await text('.label-hero .code-xl') === 'B-0001', 'first box gets code B-0001');
ok((await text('.hero-place')).includes('Garage, Shelf 2'), 'box shows place and spot');
await shot('04-box-empty');

// ---------- scan contents with AI ----------
await page.click('[data-act=scan-contents]');
await page.waitForSelector('#scanGo');
ok(await page.locator('#scanGo').isDisabled(), 'Find items is disabled until a photo is added');
await page.setInputFiles('#scanPick', [join(ROOT, 'icons/icon-512.png'), join(ROOT, 'icons/icon-192.png')]);
await page.waitForFunction(() => document.querySelectorAll('.shot img').length === 2);
await page.fill('#scanHint', 'cables at the bottom');
await wait(150);
ok((await text('#scansLeft')).includes('20 of 20'), 'shows scans left today');
await shot('05-scan-pick');
await page.click('#scanGo');
await page.waitForSelector('.review');
const identify = aiCalls.find((c) => c.action === 'identify');
ok(identify && identify.images.length === 2 && identify.images[0].mime === 'image/jpeg' && identify.hint === 'cables at the bottom' && identify.language === 'en', 'sends 2 resized JPEG photos + hint + language to the AI');
ok(identify && identify.images.every((i) => i.data.length < 400000), 'photos are shrunk before upload');
ok(await page.locator('.review li').count() === 5, 'review lists the 5 found items');
await page.locator('.review li').nth(4).locator('.chk').uncheck();
await page.locator('.review li').nth(1).locator('.r-name').fill('drill bits');
ok(await text('#scanAdd') === 'Add 4 items', 'unticking updates the add button');
await shot('06-scan-review');
await page.click('#scanAdd');
await page.waitForSelector('.item-row');
ok(await page.locator('.item-row').count() === 4, 'four items saved');
ok(await page.locator('.thumb img').count() === 2, 'two photos saved to the box');
ok(await page.locator('.thumb .badge').count() === 1, 'first photo became the cover');
const groups = await page.locator('.group-name').allInnerTexts();
ok(groups.join('|') === 'Tools|Electronics & cables|Clothing & shoes', 'items grouped by category in a fixed order');
ok((await page.locator('.item-row').allInnerTexts()).some((t) => t.includes('drill bits')), 'edited name was saved');

// ---------- quick add ----------
await page.fill('#quickAddInput', 'hammer, 3 spare fuses, tape measure x2');
await page.press('#quickAddInput', 'Enter');
await page.waitForFunction(() => document.querySelectorAll('.item-row').length === 7);
const db1 = await page.evaluate(() => window.__fakeDb.items.map((i) => `${i.name}:${i.quantity}:${i.source}`));
ok(db1.includes('spare fuses:3:manual') && db1.includes('tape measure:2:manual') && db1.includes('hammer:1:manual'), 'quick add parses names and quantities');
await page.evaluate(() => window.scrollTo(0, 0));
await shot('07-box-filled');

// ---------- edit + move item ----------
await page.evaluate(() => {
  const db = window.__fakeDb;
  const sp = db.spaces[0];
  const add = (name, loc, spot, items) => {
    sp.box_counter++;
    const b = { id: crypto.randomUUID(), space_id: sp.id, code: 'B-' + String(sp.box_counter).padStart(4, '0'), name, location_id: loc, spot, notes: null, cover_photo_id: null, label_printed_at: null, created_at: new Date(Date.now() + sp.box_counter * 1000).toISOString(), updated_at: new Date().toISOString() };
    db.boxes.push(b);
    items.forEach(([n, c, q]) => db.items.push({ id: crypto.randomUUID(), space_id: sp.id, box_id: b.id, name: n, category: c, quantity: q, notes: null, source: 'ai', created_at: new Date().toISOString() }));
    return b;
  };
  const garage = db.locations[0].id;
  const attic = { id: crypto.randomUUID(), space_id: sp.id, name: 'Attic', notes: null, created_at: new Date().toISOString() };
  db.locations.push(attic);
  add('Winter clothes', attic.id, 'Left corner', [['winter jacket', 'clothing', 2], ['wool scarf', 'clothing', 3], ['snow boots', 'clothing', 1]]);
  add('Christmas decorations', attic.id, null, [['Christmas lights', 'seasonal', 4], ['tree ornaments', 'seasonal', 30]]);
  add('Kitchen extras', null, null, [['waffle maker', 'kitchen', 1], ['cake tins', 'kitchen', 3]]);
  add('Camping gear', garage, 'Top shelf', [['tent', 'sports', 1], ['sleeping bag', 'sports', 2], ['camping stove', 'sports', 1]]);
  window.__fakePersist();
});
await page.reload();
await page.waitForSelector('.item-row');
await page.locator('.item-row', { hasText: 'hammer' }).click();
await page.waitForSelector('#itemForm');
await page.click('[data-step="1"]');
await page.click('[data-step="1"]');
ok(await page.inputValue('#itemForm input[name=quantity]') === '3', 'stepper changes quantity');
await page.click('#itemForm [type=submit]');
await page.waitForFunction(() => window.__fakeDb.items.find((i) => i.name === 'hammer').quantity === 3);
ok(true, 'item quantity saved');

// ---------- home grid, filters, search ----------
await page.click('.bar a[href="#/"]');
await page.waitForSelector('.grid .tile');
ok(await page.locator('.tile').count() === 5, 'home shows all 5 boxes');
ok((await text('.page-sub')) === '5 boxes, 17 items', 'home shows box and item totals');
await wait(300);
await shot('08-home-grid');
await page.locator('.chip', { hasText: 'Attic' }).click();
ok(await page.locator('.tile').count() === 2, 'place filter shows only Attic boxes');
await page.locator('.chip', { hasText: 'No place' }).click();
ok(await page.locator('.tile').count() === 1, 'No place filter works');
await page.locator('.chip', { hasText: 'All' }).click();
await page.fill('#q', 'drill');
await page.waitForSelector('.results .result');
const results = await page.locator('.result').allInnerTexts();
ok(results.length === 2 && results.every((r) => r.includes('B-0001') && r.includes('Garage, Shelf 2')), 'search finds both drill items with box code and place');
await shot('09-search');
await page.fill('#q', 'xyzzy');
await page.waitForSelector('.empty');
ok((await text('.empty')).includes('Nothing matches'), 'search shows a helpful empty state');
await page.fill('#q', 'winter');
await page.waitForSelector('.result');
await page.locator('.result').first().click();
await page.waitForSelector('.label-hero');
ok(await text('.hero-name') === 'Winter clothes', 'tapping a result opens its box');

// ---------- item move ----------
await page.locator('.item-row', { hasText: 'snow boots' }).click();
await page.waitForSelector('#itemForm');
const kitchen = await page.evaluate(() => window.__fakeDb.boxes.find((b) => b.name === 'Kitchen extras').id);
await page.selectOption('#itemForm select[name=box]', kitchen);
await page.click('#itemForm [type=submit]');
await page.waitForFunction(() => document.querySelectorAll('.item-row').length === 2);
ok((await text('#toast')).includes('Moved to B-0004'), 'moving an item confirms the target box');

// ---------- item delete + undo ----------
await page.locator('.item-row', { hasText: 'wool scarf' }).click();
await page.click('#itemDel');
await page.waitForFunction(() => document.querySelectorAll('.item-row').length === 1);
await page.click('#toast button');
await page.waitForFunction(() => document.querySelectorAll('.item-row').length === 2);
ok(true, 'deleting an item can be undone');

// ---------- daily AI limit ----------
aiMode = 'limit';
await page.click('[data-act=scan-contents]');
await page.setInputFiles('#scanPick', join(ROOT, 'icons/icon-192.png'));
await page.waitForFunction(() => document.querySelectorAll('.shot img').length === 1);
await page.click('#scanGo');
await page.waitForSelector('.sheet .error:not([hidden])');
ok((await text('.sheet .error')).includes('photo scans'), 'daily limit shows a clear message');
await page.click('.sheet [data-act=sheet-close]');
aiMode = 'ok';

// ---------- labels ----------
await page.click('a.tab[data-page=labels]');
await page.waitForSelector('.pick-list');
ok(await page.locator('[data-label-box]:checked').count() === 5, 'all unprinted boxes are preselected');
ok(await page.locator('#previewFrame .plabel').count() === 5, 'preview shows the labels');
await wait(200);
await shot('10-labels');
await page.click('#printBtn');
await page.waitForFunction(() => window.__printed === 1);
const printInfo = await page.evaluate(() => ({ labels: document.querySelectorAll('#printArea .plabel').length, pages: document.querySelectorAll('#printArea .print-page').length }));
ok(printInfo.labels === 5 && printInfo.pages === 1, 'print sheet has 5 labels on 1 page');
await page.waitForFunction(() => window.__fakeDb.boxes.every((b) => b.label_printed_at));
ok(true, 'printed boxes are marked as printed');
await page.click('[data-act=label-sel][data-mode=all]');
await page.click('[data-act=label-size][data-size=small]');
ok(await page.locator('#previewFrame .print-page.small .plabel').count() === 5, 'small label layout works');

// QR codes must decode to the box link.
const qrCheck = await page.evaluate(async () => {
  await new Promise((res) => { const s = document.createElement('script'); s.src = '/vendor/jsQR.js'; s.onload = res; document.head.appendChild(s); });
  const svg = document.querySelector('#previewFrame .plabel svg');
  const xml = new XMLSerializer().serializeToString(svg).replace('<svg ', '<svg width="400" height="400" ');
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 400, 400);
  const r = window.jsQR(ctx.getImageData(0, 0, 400, 400).data, 400, 400);
  const first = window.__fakeDb.boxes.slice().sort((a, b) => a.code.localeCompare(b.code))[0];
  return { decoded: r && r.data, expected: location.origin + '/?box=' + first.id };
});
ok(qrCheck.decoded === qrCheck.expected, `QR code decodes to the box link (${qrCheck.decoded})`);

// ---------- deep link from a scanned label ----------
const deepId = await page.evaluate(() => window.__fakeDb.boxes.find((b) => b.name === 'Camping gear').id);
await page.goto(BASE + '/?box=' + deepId);
await page.waitForSelector('.label-hero');
ok(await text('.hero-name') === 'Camping gear', 'opening a label link goes straight to the box');
ok(page.url().endsWith('#/box/' + deepId), 'label link is turned into an app route');

// ---------- scanner: type a code ----------
await page.click('[data-act=open-scanner]');
await page.waitForSelector('#scanner.open');
await page.fill('#scanCodeInput', '3');
await page.click('#scanCodeBtn');
await page.waitForFunction(() => !document.querySelector('#scanner').classList.contains('open'));
await page.waitForSelector('.label-hero');
ok(await text('.label-hero .code-xl') === 'B-0003', 'typing a box code in the scanner opens that box');

// ---------- places ----------
await page.click('a.tab[data-page=places]');
await page.waitForSelector('.place-row');
const placeRows = await page.locator('.place-row').allInnerTexts();
ok(placeRows.length === 3 && placeRows[0].includes('Attic') && placeRows[1].includes('Garage'), 'places list with box counts');
await shot('11-places');
await page.locator('.place-row', { hasText: 'Attic' }).click();
await page.waitForSelector('#placeForm');
await page.click('#placeDel');
await page.click('#confirmYes');
await page.waitForFunction(() => window.__fakeDb.locations.length === 1);
ok(await page.evaluate(() => window.__fakeDb.boxes.filter((b) => !b.location_id).length) === 3, 'deleting a place keeps its boxes (now without a place)');

// ---------- Turkish + dark mode ----------
await page.click('a.tab[data-page=me]');
await page.waitForSelector('[data-act=set-lang]');
await page.click('[data-act=set-lang][data-lang=tr]');
ok(await text('.page-title') === 'Ben' && await text('a.tab[data-page=boxes] span') === 'Kutular', 'switches to Turkish');
ok(await page.evaluate(() => window.__fakeDb.profiles[0].language) === 'tr', 'language saved to the profile');
await page.click('[data-act=set-theme][data-theme=dark]');
ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'dark theme applies');
await shot('12-me-dark-tr');
await page.click('a.tab[data-page=boxes]');
await page.waitForSelector('.grid .tile');
await wait(300);
await shot('13-home-dark-tr');
const box1 = await page.evaluate(() => window.__fakeDb.boxes.find((b) => b.code === 'B-0001').id);
await page.goto(BASE + '/#/box/' + box1);
await page.waitForSelector('.item-row');
await wait(300);
await shot('14-box-dark-tr');
await page.click('[data-act=scan-contents]');
await page.setInputFiles('#scanPick', join(ROOT, 'icons/icon-512.png'));
await page.waitForFunction(() => document.querySelectorAll('.shot img').length === 1);
await page.click('#scanGo');
await page.waitForSelector('.review');
ok(aiCalls.filter((c) => c.action === 'identify').at(-1).language === 'tr', 'AI is asked for Turkish names');
await shot('15-review-dark-tr');
await page.click('.sheet-actions #scanBack');
await page.click('.sheet [data-act=sheet-close]');

// ---------- delete box ----------
await page.click('[data-act=box-menu]');
await page.click('[data-act=delete-box]');
await page.click('#confirmYes');
await page.waitForSelector('.grid');
const after = await page.evaluate(() => ({ boxes: window.__fakeDb.boxes.length, files: window.__fakeFiles.size }));
ok(after.boxes === 4 && after.files === 0, 'deleting a box removes it and its photo files');

// ---------- sign out + delete account ----------
await page.click('a.tab[data-page=me]');
await page.click('[data-act=delete-account]');
await page.click('#confirmYes');
await page.waitForSelector('#authForm');
ok(await page.evaluate(() => window.__accountDeleted === true && window.__fakeDb.boxes.length === 0), 'delete account wipes data and returns to sign-in');
ok(await page.locator('#authNote:not([hidden])').count() === 1, 'shows that the account was deleted');

// ---------- desktop layout ----------
await page.setViewportSize({ width: 1280, height: 860 });
await page.fill('input[name=email]', 'hamza@example.com');
await page.fill('input[name=password]', 'secret123');
await page.click('#authForm [type=submit]');
await page.waitForSelector('.page-title');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
ok(!overflow, 'no horizontal scrolling on desktop');

ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

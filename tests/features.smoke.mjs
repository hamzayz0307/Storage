// End-to-end test for version 2 features: taken out, expiry, value & receipt,
// appliances with label reading, reminders, share links, Excel/PDF export,
// moving mode with bulk actions, offline mode, business spaces with a customer,
// requests, activity, feedback, Google button. Fake Supabase + fake AI.
//
//   cd tests && npm install && npx playwright install chromium
//   node features.smoke.mjs            (SHOTS=./shots to save screenshots)
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|Failed to fetch|refused a queued/.test(m.text())) errors.push(m.text()); });
await page.addInitScript({ path: join(ROOT, 'tests/fake-supabase.js') });
await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
await page.route('https://unpkg.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
const aiCalls = [];
await page.route('**/functions/v1/box-ai', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  aiCalls.push(body);
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (body.action === 'usage') return json({ limit: 20, remaining: 18 });
  if (body.action === 'read_label') return json({ limit: 20, remaining: 17, label: { name: 'washing machine', brand: 'Arçelik', model: '9100 M', serial: 'SN4455', category: 'electronics' } });
  return json({ limit: 20, remaining: 19, items: [{ name: 'tent', category: 'sports', quantity: 1 }] });
});

const shot = async (name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png') }); };
const wait = (ms) => page.waitForTimeout(ms);
const text = (sel) => page.locator(sel).first().innerText();
const signIn = async (email) => {
  await page.waitForSelector('#authForm');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'secret123');
  await page.click('#authForm [type=submit]');
  try { await page.waitForSelector('.home-head', { timeout: 15000 }); }
  catch (e) { console.log('SIGN-IN STUCK:', (await page.evaluate(() => document.body.innerText)).slice(0, 500).replace(/\n+/g, ' | ')); throw e; }
};
const signOut = async () => {
  await page.goto(BASE + '/#/me');
  await page.waitForSelector('[data-act=sign-out]');
  await page.click('[data-act=sign-out]');
  await page.waitForSelector('#authForm');
  await page.evaluate(() => history.replaceState(null, '', '/'));
};
const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const openItem = async (name) => { await page.locator('.item-row', { hasText: name }).first().click(); await page.waitForSelector('#itemForm'); };
const openDetails = async (summaryText) => {
  const d = page.locator('details.more', { hasText: summaryText }).first();
  if (!(await d.evaluate((el) => el.open))) await d.locator('summary').click();
};

// ---------- set up: owner with two boxes ----------
await page.goto(BASE + '/');
await page.waitForSelector('#googleBtn');
await page.click('#googleBtn');
ok(await page.evaluate(() => window.__oauth && window.__oauth.provider === 'google'), 'Google sign-in button starts the Google flow');
ok(await page.locator('.auth-legal a[href^="/privacy.html"]').count() === 1, 'sign-in screen links the privacy policy');
await signIn('hamza@example.com');
await page.evaluate(() => {
  const db = window.__fakeDb, sp = db.spaces[0];
  const mk = (name, items) => {
    sp.box_counter++;
    const b = { id: crypto.randomUUID(), space_id: sp.id, code: 'B-' + String(sp.box_counter).padStart(4, '0'), name, location_id: null, spot: null, notes: null, cover_photo_id: null, label_printed_at: null, created_at: new Date(Date.now() + sp.box_counter * 1000).toISOString(), updated_at: new Date().toISOString() };
    db.boxes.push(b);
    items.forEach(([n, c, q]) => db.items.push({ id: crypto.randomUUID(), space_id: sp.id, box_id: b.id, name: n, category: c, quantity: q, notes: null, source: 'manual', kind: 'thing', created_at: new Date().toISOString() }));
  };
  mk('Garage tools', [['cordless drill', 'tools', 1], ['hammer', 'tools', 1], ['extension cord', 'electronics', 3]]);
  mk('Kitchen extras', [['waffle maker', 'kitchen', 1], ['vitamins', 'personal', 2]]);
  mk('Laundry room', [['washer', 'other', 1]]);
  window.__fakePersist();
});
await page.reload();
await page.waitForSelector('.grid .tile');
ok(await page.locator('.tile').count() === 3, 'owner home shows 3 boxes');
const boxId = (code) => page.evaluate((c) => window.__fakeDb.boxes.find((b) => b.code === c).id, code);
const goBox = async (code) => { await page.goto(BASE + '/#/box/' + (await boxId(code))); await page.waitForSelector('.item-row'); };

// ---------- taken out / lent ----------
await goBox('B-0001');
await openItem('cordless drill');
await openDetails('Taken out');
await page.check('input[name=isOut]');
await page.fill('input[name=outTo]', 'Ali');
await shot('v2-01-item-editor-out');
await page.click('#itemForm [type=submit]');
await page.waitForSelector('.item-row.is-out');
ok((await text('.item-row.is-out')).includes('With Ali'), 'item shows who has it');
ok((await text('.hero-badges')).includes('1 item taken out'), 'box label shows how many items are out');
const dbOut = await page.evaluate(() => window.__fakeDb.items.find((i) => i.name === 'cordless drill'));
ok(!!dbOut.checked_out_at && dbOut.checked_out_to === 'Ali', 'taken-out status saved');
await page.goto(BASE + '/#/');
await page.waitForSelector('.attention');
ok((await text('.attention')).includes('1 item is taken out'), 'home lists taken-out items');
await page.fill('#q', 'ali');
await page.waitForSelector('.result');
ok((await text('.result')).includes('cordless drill') && (await text('.result')).includes('With Ali'), 'search by who has it');
await page.fill('#q', '');

// ---------- expiry date ----------
await goBox('B-0002');
await openItem('vitamins');
await openDetails('Expiry');
await page.fill('input[name=expiresOn]', isoIn(3));
await page.click('#itemForm [type=submit]');
await page.waitForFunction(() => /Expires in 3 days/.test(document.body.innerText));
ok(true, 'item shows "Expires in 3 days"');

// ---------- value & receipt ----------
await openItem('waffle maker');
await openDetails('Value');
await page.fill('input[name=value]', 'abc');
await page.click('#itemForm [type=submit]');
await page.waitForSelector('#itemErr:not([hidden])');
ok((await text('#itemErr')).includes('number'), 'invalid value gets a clear message');
await page.fill('input[name=value]', '1.250,50');
await page.setInputFiles('#receiptInput', join(ROOT, 'icons/icon-192.png'));
await page.waitForSelector('#receiptBox img');
await page.click('#itemForm [type=submit]');
await page.waitForSelector('.value-card');
const waffle = await page.evaluate(() => window.__fakeDb.items.find((i) => i.name === 'waffle maker'));
ok(waffle.value === 1250.5, `Turkish-style number 1.250,50 saved as 1250.5 (${waffle.value})`);
ok(waffle.receipt_path && waffle.receipt_path.includes('/receipt-') && await page.evaluate((p) => window.__fakeFiles.has(p), waffle.receipt_path), 'receipt photo uploaded');
ok((await text('.value-total')).includes('1.250,50') || (await text('.value-total')).includes('1,250.50'), `box value shown (${await text('.value-total')})`);

// ---------- appliance + AI label reading ----------
await goBox('B-0003');
await openItem('washer');
await openDetails('Appliance');
await page.check('input[name=isAppliance]');
await page.setInputFiles('#labelInput', join(ROOT, 'icons/icon-512.png'));
await page.waitForFunction(() => document.querySelector('#itemForm input[name=serial]').value === 'SN4455');
ok(await page.inputValue('input[name=brand]') === 'Arçelik' && await page.inputValue('input[name=model]') === '9100 M', 'AI fills brand, model and serial from the label');
ok(aiCalls.some((c) => c.action === 'read_label' && c.images.length === 1), 'label photo sent to the AI');
ok(await page.inputValue('#itemForm select[name=category]') === 'electronics', 'category set from the label');
await page.fill('input[name=warrantyUntil]', isoIn(20));
await shot('v2-02-appliance');
await page.click('#itemForm [type=submit]');
await page.waitForFunction(() => /Warranty ends in 20 days/.test(document.body.innerText));
ok(true, 'warranty badge shows days left');

// ---------- reminder ----------
await page.click('[data-act=edit-box]');
await page.waitForSelector('#boxForm');
await openDetails('Reminder');
await page.fill('input[name=remindOn]', isoIn(0));
await page.fill('input[name=remindNote]', 'Descale the washer');
await page.check('input[name=remindYearly]');
await page.check('#boxForm input[name=fragile]');
await page.click('#boxForm [type=submit]');
await page.waitForSelector('.notice');
ok((await text('.notice')).includes('Descale the washer'), 'box page shows the reminder that is due');
ok((await text('.hero-badges')).includes('Fragile'), 'fragile badge on the box');
await page.goto(BASE + '/#/');
await page.waitForSelector('.attention');
const att = await text('.attention');
ok(att.includes('1 reminder for today') && att.includes('1 item expires soon') && att.includes('1 warranty ends soon'), `home lists reminders, expiring and warranties (${att.replace(/\n/g, ' | ')})`);
await wait(200);
await shot('v2-03-home-attention');
await page.click('.att-row[href="#/attention/reminders"]');
await page.waitForSelector('[data-act=reminder-done]');
await page.click('[data-act=reminder-done]');
await page.waitForFunction(() => /Next reminder/.test(document.querySelector('#toast').innerText));
const nextRemind = await page.evaluate(() => window.__fakeDb.boxes.find((b) => b.code === 'B-0003').remind_on);
ok(nextRemind === isoIn(0).replace(/^\d{4}/, (y) => String(+y + 1)), `yearly reminder moves to next year (${nextRemind})`);
await page.goto(BASE + '/#/attention/out');
await page.waitForSelector('[data-act=put-back]');
await shot('v2-04-taken-out-list');
await page.click('[data-act=put-back]');
await page.waitForFunction(() => !window.__fakeDb.items.find((i) => i.name === 'cordless drill').checked_out_at);
ok(true, '"Put back" returns the item');

// ---------- share a box ----------
await goBox('B-0001');
await page.click('[data-act=box-menu]');
await page.click('[data-act=share-box]');
await page.waitForSelector('#shareUrl');
const shareLink = await page.inputValue('#shareUrl');
ok(/\/s\.html\?id=[0-9a-f-]{36}$/.test(shareLink), 'share link created');
await shot('v2-05-share');
await page.click('[data-act=sheet-close]');
await page.goto(shareLink.replace(/^https?:\/\/[^/]+/, BASE));
await page.waitForSelector('.label .code');
ok(await text('.label .code') === 'B-0001' && (await page.locator('main li').count()) === 3, 'share page shows the box and its items');
await shot('v2-06-share-page');
await goBox('B-0001');
await page.click('[data-act=box-menu]');
await page.click('[data-act=share-box]');
await page.waitForSelector('#shareStop');
ok(await page.inputValue('#shareUrl') === shareLink, 'sharing again reuses the same link');
await page.click('#shareStop');
await page.goto(shareLink.replace(/^https?:\/\/[^/]+/, BASE));
await page.waitForSelector('.msg');
ok((await text('.msg')).includes('turned off'), 'turned-off link shows a clear message');

// ---------- export ----------
await page.goto(BASE + '/#/me');
await page.waitForSelector('[data-act=export-xlsx]');
const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export-xlsx]')]);
const xlsxPath = join(SHOTS || ROOT + '/tests', 'export.xlsx');
await download.saveAs(xlsxPath);
ok(download.suggestedFilename().endsWith('.xlsx'), `Excel file downloaded (${download.suggestedFilename()})`);
let xl = null;
try {
  xl = JSON.parse(execFileSync('python3', ['-c', `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1])
out = {n: [[c for c in r] for r in wb[n].iter_rows(values_only=True)] for n in wb.sheetnames}
print(json.dumps(out, default=str))`, xlsxPath]).toString());
} catch (e) { console.log(String(e.stderr || e)); }
ok(xl && xl.Items && xl.Items.length === 7 && xl.Items[0][0] === 'Box' && xl.Boxes.length === 4, `Excel opens in a real reader with Items and Boxes sheets (${xl ? Object.keys(xl).map((k) => k + ':' + xl[k].length).join(', ') : 'unreadable'})`);
ok(xl && xl.Items.some((r) => r[4] === 'waffle maker' && r[11] === 1250.5), 'Excel keeps values as numbers');
await page.click('[data-act=export-pdf]');
await page.waitForFunction(() => window.__printed >= 1);
const report = await page.evaluate(() => ({ boxes: document.querySelectorAll('#printArea .r-box').length, rows: document.querySelectorAll('#printArea tbody tr').length }));
ok(report.boxes === 3 && report.rows === 6, `PDF report lists every box and item (${JSON.stringify(report)})`);
await page.emulateMedia({ media: 'print' });
if (SHOTS) await page.pdf({ path: join(SHOTS, 'v2-report.pdf'), format: 'A4', printBackground: true });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(() => { document.querySelector('#printArea').innerHTML = ''; });

// ---------- feedback ----------
await page.click('[data-act=feedback]');
await page.fill('#fbMsg', 'Please add NFC tags');
await page.click('#fbSend');
await page.waitForFunction(() => window.__fakeDb.feedback.length === 1);
ok(await page.evaluate(() => window.__fakeDb.feedback[0].message === 'Please add NFC tags' && window.__fakeDb.feedback[0].kind === 'idea'), 'feedback sent');

// ---------- moving ----------
await page.goto(BASE + '/#/moving');
await page.waitForSelector('[data-act=moving-toggle]');
await page.click('[data-act=moving-toggle]');
await page.waitForSelector('#roomForm');
for (const r of ['Kitchen', 'Bedroom']) { await page.fill('#roomInput', r); await page.press('#roomInput', 'Enter'); await page.waitForFunction((n) => document.querySelectorAll('.room-chip').length === n, r === 'Kitchen' ? 1 : 2); }
const rooms = await page.evaluate(() => window.__fakeDb.spaces[0].rooms);
ok(rooms.length === 2 && rooms[0].color !== rooms[1].color, 'rooms saved with different colours');
await page.goto(BASE + '/#/');
await page.waitForSelector('.progress-card');
ok((await text('.progress-card')).includes('0 of 3 unpacked'), 'home shows moving progress');
await page.click('[data-act=select-mode]');
await page.waitForSelector('.select-bar');
await page.locator('.tile', { hasText: 'Garage tools' }).click();
await page.locator('.tile', { hasText: 'Kitchen extras' }).click();
ok((await text('.sb-top')).includes('2 selected'), 'select mode counts selected boxes');
await shot('v2-07-select-mode');
await page.click('[data-act=bulk-status]');
await page.locator('.menu button', { hasText: 'On the way' }).click();
await page.waitForFunction(() => window.__fakeDb.boxes.filter((b) => b.move_status === 'in_transit').length === 2);
ok(true, 'bulk status update');
await page.click('[data-act=select-mode]');
await page.locator('.tile', { hasText: 'Garage tools' }).click();
await page.locator('.tile', { hasText: 'Kitchen extras' }).click();
await page.click('[data-act=bulk-room]');
await page.locator('.menu button', { hasText: 'Kitchen' }).click();
await page.waitForFunction(() => window.__fakeDb.boxes.filter((b) => b.dest_room === 'Kitchen').length === 2);
ok((await page.locator('.tile', { hasText: 'Garage tools' }).innerText()).includes('Kitchen'), 'tiles show the destination room');
await page.goto(BASE + '/#/moving');
await page.waitForSelector('.move-row');
ok((await page.locator('section', { hasText: 'Not arrived yet' }).locator('.move-row').count()) === 2, 'moving page lists boxes not arrived yet');
await page.locator('.move-row', { hasText: 'Garage tools' }).first().click();
await page.click('[data-st=unpacked]');
await page.click('#msSave');
await page.waitForFunction(() => /1 of 3 boxes unpacked/.test(document.body.innerText));
ok(true, 'marking a box unpacked updates progress');
await shot('v2-08-moving');
await page.goto(BASE + '/#/labels');
await page.waitForSelector('#previewFrame .plabel');
await page.click('[data-act=label-sel][data-mode=all]');
const lab = await page.evaluate(() => ({ banded: document.querySelectorAll('#previewFrame .plabel.banded').length, room: [...document.querySelectorAll('#previewFrame .pl-room')].map((e) => e.textContent), fragile: document.querySelectorAll('#previewFrame .pl-fragile').length }));
ok(lab.banded === 2 && lab.room.join() === 'Kitchen,Kitchen' && lab.fragile === 1, `labels get the room colour, room name and fragile mark (${JSON.stringify(lab)})`);
await wait(200);
await shot('v2-09-labels-rooms');

// ---------- offline ----------
await goBox('B-0002');
await context.setOffline(true);
await page.waitForSelector('#offlineBar:not([hidden])');
ok((await text('#offlineBar')).includes('offline'), 'offline bar appears');
await page.fill('#quickAddInput', 'candles, 2 napkins');
await page.press('#quickAddInput', 'Enter');
await page.waitForFunction(() => document.querySelectorAll('.item-row').length === 4);
ok((await text('#toast')).includes('Saved on this phone'), 'adding offline is saved on the phone');
ok((await text('#offlineBar')).includes('1 change'), 'offline bar counts waiting changes');
await openItem('waffle maker');
await openDetails('Taken out');
await page.check('input[name=isOut]');
await page.click('#itemForm [type=submit]');
await page.waitForSelector('.item-row.is-out');
await page.click('.bar a[href="#/"]');
await page.waitForSelector('#q');
await page.fill('#q', 'napkin');
await page.waitForSelector('.result');
ok((await text('.result')).includes('napkins') && (await text('.result')).includes('B-0002'), 'search works offline on the saved copy');
await shot('v2-10-offline');
ok(await page.evaluate(() => window.__fakeDb.items.filter((i) => i.name === 'candles').length) === 0, 'nothing reached the server while offline');
await context.setOffline(false);
await page.waitForFunction(() => window.__fakeDb.items.some((i) => i.name === 'candles') && window.__fakeDb.items.find((i) => i.name === 'waffle maker').checked_out_at);
ok(true, 'queued changes are sent when back online');
await page.waitForSelector('#offlineBar', { state: 'hidden' });
ok(true, 'offline bar disappears');
// open the app without connection: saved copy
await page.evaluate(() => { sessionStorage.setItem('__fakeOffline', '1'); location.hash = '#/'; });
await page.reload();
await page.waitForSelector('.grid .tile');
ok(await page.locator('#offlineBar:not([hidden])').count() === 1 && await page.locator('.tile').count() === 3, 'app opens from the saved copy without connection');
await page.evaluate(() => { sessionStorage.removeItem('__fakeOffline'); window.dispatchEvent(new Event('online')); });
await page.waitForSelector('#offlineBar', { state: 'hidden' });
ok(true, 'reconnects when the connection returns');

// ---------- business space + customer ----------
await page.click('[data-act=switch-space]');
await page.click('[data-act=space-new]');
await page.fill('#spaceForm input[name=name]', 'HG Depo');
await page.check('#spaceForm input[value=business]');
await shot('v2-11-new-space');
await page.click('#spaceForm [type=submit]');
await page.waitForFunction(() => document.querySelector('.page-title') && document.querySelector('.page-title').textContent === 'HG Depo');
ok(true, 'business space created and opened');
await page.goto(BASE + '/#/places');
await page.waitForSelector('[data-act=new-place]');
ok((await text('.page-title')) === 'Units', 'business spaces call places "Units"');
for (const u of ['Unit 1', 'Unit 2']) {
  await page.click('[data-act=new-place]');
  await page.fill('#placeForm input[name=name]', u);
  await page.click('#placeForm [type=submit]');
  await page.waitForFunction((n) => [...document.querySelectorAll('.place-name')].some((e) => e.textContent.includes(n)), u);
}
await page.evaluate(() => {
  const db = window.__fakeDb, sp = db.spaces.find((s) => s.name === 'HG Depo');
  const [u1, u2] = ['Unit 1', 'Unit 2'].map((n) => db.locations.find((l) => l.name === n && l.space_id === sp.id).id);
  [['Ayşe winter clothes', u1, [['coat', 'clothing', 2]]], ['Deniz books', u2, [['novel', 'books', 12]]]].forEach(([name, loc, items]) => {
    sp.box_counter++;
    const b = { id: crypto.randomUUID(), space_id: sp.id, code: 'B-' + String(sp.box_counter).padStart(4, '0'), name, location_id: loc, spot: null, notes: null, cover_photo_id: null, label_printed_at: null, created_at: new Date(Date.now() + sp.box_counter * 1000).toISOString(), updated_at: new Date().toISOString() };
    db.boxes.push(b);
    items.forEach(([n, c, q]) => db.items.push({ id: crypto.randomUUID(), space_id: sp.id, box_id: b.id, name: n, category: c, quantity: q, notes: null, source: 'manual', kind: 'thing', created_at: new Date().toISOString() }));
  });
  window.__fakePersist();
});
await page.goto(BASE + '/#/space');
await page.waitForSelector('#spBrand');
await page.fill('#spBrand', 'HG Storage');
await page.press('#spBrand', 'Tab');
await page.locator('#spColor .swatch').nth(4).click();
await page.waitForFunction(() => window.__fakeDb.spaces.find((s) => s.name === 'HG Depo').brand_color === '#2E86AB');
ok(await page.evaluate(() => window.__fakeDb.spaces.find((s) => s.name === 'HG Depo').brand_name) === 'HG Storage', 'branding saved');
await page.click('[data-act=invite-new]');
await page.waitForSelector('#invMake');
await page.click('#invMake');
await page.waitForSelector('#invErr:not([hidden])');
ok((await text('#invErr')).includes('unit'), 'customer invite asks for a unit');
await page.locator('#invUnits label', { hasText: 'Unit 1' }).click();
await shot('v2-12-invite');
await page.click('#invMake');
await page.waitForSelector('#invUrl');
const inviteLink = await page.inputValue('#invUrl');
ok(/\/\?invite=[0-9a-f-]{36}$/.test(inviteLink), 'invite link created');
await page.click('[data-act=sheet-close]');
await page.waitForSelector('[data-act=invite-revoke]');
ok(await page.locator('[data-act=invite-revoke]').count() === 1, 'open invite listed');
await shot('v2-13-space-settings');

// customer joins
await signOut();
await page.goto(inviteLink.replace(/^https?:\/\/[^/]+/, BASE));
await signIn('ayse@mail.com');
await page.waitForSelector('#joinBtn');
ok((await text('.sheet .lead')).includes('invited you as Customer'), 'invite shows who invited and the role');
await shot('v2-14-join');
await page.click('#joinBtn');
await page.waitForFunction(() => document.querySelector('.page-title') && document.querySelector('.page-title').textContent === 'HG Depo');
await page.waitForSelector('.grid .tile');
ok(await page.locator('.tile').count() === 1 && (await text('.tile')).includes('Ayşe winter clothes'), 'customer sees only their unit');
ok((await text('.brand-row')).includes('HG Storage'), 'customer sees the company name');
const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabbar .tab')].filter((t) => getComputedStyle(t).display !== 'none').map((t) => t.textContent.trim()));
ok(tabs.join() === 'Boxes,Requests,Scan,Me', `customer tabs (${tabs.join(', ')})`);
ok(await page.locator('.fab').count() === 0, 'customer cannot create boxes');
await page.locator('.tile').first().click();
await page.waitForSelector('[data-act=request-box]');
ok(await page.locator('[data-act=scan-contents], #quickAdd, .hero-edit, [data-act=add-photo]').count() === 0, 'customer box page has no editing controls');
await page.locator('.item-row').first().click();
await page.waitForSelector('.facts');
ok(await page.locator('#itemForm').count() === 0, 'customer sees item details read-only');
await page.click('.sheet [data-act=sheet-close]');
await page.click('[data-act=request-box]');
await page.fill('#reqNote', 'Saturday morning');
await page.click('#reqSend');
await page.waitForSelector('.notice');
ok((await text('.notice')).includes('Waiting for the team'), 'customer sees the request is waiting');
await shot('v2-15-customer-box');
await page.click('#tabbar .tab[data-page=requests]');
await page.waitForSelector('.req-row');
ok((await text('.req-row')).includes('Saturday morning'), 'customer sees their requests');
await page.goto(BASE + '/#/places');
await page.waitForSelector('.home-head');
ok(true, 'customer cannot open Places (sent back home)');

// owner handles the request
await signOut();
await signIn('hamza@example.com');
await page.waitForSelector('.attention');
ok((await text('.attention')).includes('1 open request'), 'owner sees the open request on home');
await page.click('.att-row[href="#/requests"]');
await page.waitForSelector('[data-status=ready]');
ok((await text('.req-row')).includes('From ayse'), 'request shows who asked');
await page.click('[data-status=ready]');
await page.waitForSelector('[data-status=done]');
await page.click('[data-status=done]');
await page.waitForFunction(() => window.__fakeDb.retrieval_requests[0].status === 'done');
ok(true, 'owner marks request ready, then handed over');
await page.goto(BASE + '/#/space');
await page.waitForSelector('.member-list');
const memberTxt = await text('.member-list');
ok(memberTxt.includes('ayse@mail.com') && memberTxt.includes('Customer') && memberTxt.includes('Unit 1'), 'member list shows the customer and their unit');
await page.goto(BASE + '/#/activity');
await page.waitForSelector('.act-row');
const acts = await page.locator('.act-text').allInnerTexts();
ok(acts.some((a) => a.includes('asked for box B-0001')) && acts.some((a) => a.includes('handed over box B-0001')), `activity log shows the request story (${acts.slice(0, 3).join(' | ')})`);
await shot('v2-16-activity');

// switching spaces
await page.goto(BASE + '/#/');
await page.waitForSelector('[data-act=switch-space]');
await page.click('[data-act=switch-space]');
await page.waitForSelector('.space-menu');
ok(await page.locator('.space-menu [data-space]').count() === 2, 'switcher lists both spaces');
await shot('v2-17-switcher');
await page.locator('.space-menu [data-space]', { hasText: 'My storage' }).click();
await page.waitForFunction(() => document.querySelector('.page-title') && document.querySelector('.page-title').textContent === 'My storage');
ok(await page.locator('.tile').count() === 3, 'switching back shows the personal boxes');

// Turkish check of new screens
await page.goto(BASE + '/#/me');
await page.click('[data-act=set-lang][data-lang=tr]');
await page.goto(BASE + '/#/moving');
await page.waitForSelector('.progress-block');
ok((await text('.page-title')) === 'Taşınma' && (await text('.pb-text')).includes('kutudan'), 'moving page in Turkish');
await page.click('[data-act=set-theme]').catch(() => {});
await page.goto(BASE + '/#/me');
await page.click('[data-act=set-theme][data-theme=dark]');
await page.goto(BASE + '/#/');
await page.waitForSelector('.progress-card');
await wait(250);
await shot('v2-18-home-dark-tr');
await goBox('B-0003');
await openItem('washing machine').catch(async () => openItem('washer'));
await wait(150);
await shot('v2-19-item-dark-tr');

ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

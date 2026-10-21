// Database tests: runs supabase/schema.sql in PGlite (real Postgres in WebAssembly) with Supabase auth/storage stubbed.
//   cd tests && npm install && node schema.test.mjs
// Runs supabase/schema.sql in PGlite with stubbed Supabase auth/storage, then checks
// codes, RLS isolation, search, AI credits and account deletion.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync } from 'node:fs';

const schemaPath = process.argv[2] || new URL('../supabase/schema.sql', import.meta.url).pathname;
const db = new PGlite({ extensions: { pg_trgm } });

const stub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions; create schema storage;
grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };
const as = async (uid, fn) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
};
const expectError = async (p, msg) => { try { await p; ok(false, msg + ' (no error)'); } catch (e) { ok(true, msg + ' → ' + e.message.split('\n')[0]); } };

await db.exec(stub);
const sql = readFileSync(schemaPath, 'utf8');
await db.exec(sql);
ok(true, 'schema.sql runs');
await db.exec(sql);
ok(true, 'schema.sql runs a second time (idempotent)');

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${A}'), ('${B}')`);

// bootstrap
const bootA = await as(A, () => db.query(`select public.bootstrap_me('tr', 'Depom') as j`));
const jA = bootA.rows[0].j;
ok(jA.space.name === 'Depom' && jA.role === 'owner' && jA.profile.language === 'tr', 'bootstrap creates space + profile');
const bootA2 = await as(A, () => db.query(`select public.bootstrap_me('en', 'Other') as j`));
ok(bootA2.rows[0].j.space.id === jA.space.id, 'bootstrap is idempotent (same space)');
const sA = jA.space.id;
const jB = (await as(B, () => db.query(`select public.bootstrap_me() as j`))).rows[0].j;
const sB = jB.space.id;

// locations + boxes + codes
const loc = (await as(A, () => db.query(`insert into public.locations (space_id, name) values ($1, 'Garaj') returning id`, [sA]))).rows[0].id;
const box1 = (await as(A, () => db.query(`insert into public.boxes (space_id, location_id, name, spot) values ($1, $2, 'Aletler', 'Raf 2') returning id, code`, [sA, loc]))).rows[0];
const box2 = (await as(A, () => db.query(`insert into public.boxes (space_id, name) values ($1, 'Kış kıyafetleri') returning id, code`, [sA]))).rows[0];
ok(box1.code === 'B-0001' && box2.code === 'B-0002', `box codes auto-assigned (${box1.code}, ${box2.code})`);
const boxB = (await as(B, () => db.query(`insert into public.boxes (space_id, name) values ($1, 'B box') returning id, code`, [sB]))).rows[0];
ok(boxB.code === 'B-0001', 'codes are per space');

// items: space copied from box
await as(A, () => db.query(`insert into public.items (box_id, name, category, quantity, source) values
  ($1, 'Akülü matkap', 'tools', 1, 'ai'), ($1, 'Çekiç', 'tools', 1, 'ai'), ($1, 'Uzatma kablosu', 'electronics', 2, 'manual'),
  ($2, 'Mont', 'clothing', 3, 'ai'), ($2, 'Cordless drill bits', 'tools', 1, 'manual')`, [box1.id, box2.id]));
const cnt = (await as(A, () => db.query(`select count(*)::int c from public.items where space_id = $1`, [sA]))).rows[0].c;
ok(cnt === 5, 'items get space_id from their box');

// RLS isolation
const seenByB = (await as(B, () => db.query(`select count(*)::int c from public.items`))).rows[0].c;
ok(seenByB === 0, 'user B cannot see user A items');
const boxesSeenByB = (await as(B, () => db.query(`select count(*)::int c from public.boxes`))).rows[0].c;
ok(boxesSeenByB === 1, 'user B sees only own box');
await expectError(as(B, () => db.query(`insert into public.items (box_id, name) values ($1, 'sneaky')`, [box1.id])), 'user B cannot add an item to A\'s box');
await expectError(as(B, () => db.query(`insert into public.boxes (space_id, name) values ($1, 'sneaky')`, [sA])), 'user B cannot add a box to A\'s space');
const counterAfter = (await db.query(`select box_counter from public.spaces where id = $1`, [sA])).rows[0].box_counter;
ok(counterAfter === 2, 'failed insert by B did not bump A\'s box counter');
const upd = await as(B, () => db.query(`update public.items set name = 'hacked' where box_id = $1`, [box1.id]));
ok(upd.affectedRows === 0, 'user B cannot update A\'s items');
await expectError(as(A, () => db.query(`insert into public.boxes (space_id, location_id, name) values ($1, (select id from public.locations limit 1), 'x')`, [sB])), 'A cannot use own location in B\'s space');
await expectError(as(A, () => db.query(`insert into public.spaces (name, owner_id) values ('x', $1)`, [A])), 'spaces can only be created via bootstrap_me');

// search
const search = async (uid, space, q) => (await as(uid, () => db.query(`select * from public.search_inventory($1, $2)`, [space, q]))).rows;
let r = await search(A, sA, 'matkap');
ok(r[0]?.item_name === 'Akülü matkap' && r[0].box_code === 'B-0001' && r[0].location_name === 'Garaj' && r[0].spot === 'Raf 2', 'search finds item with box + location');
r = await search(A, sA, 'cekic');
ok(r.some(x => x.item_name === 'Çekiç'), 'search ignores Turkish letters (cekic → Çekiç)');
r = await search(A, sA, 'ÇEKİÇ');
ok(r.some(x => x.item_name === 'Çekiç'), 'search ignores case incl. İ (ÇEKİÇ)');
r = await search(A, sA, 'matkep');
ok(r.some(x => x.item_name === 'Akülü matkap'), 'search tolerates a typo (matkep)');
r = await search(A, sA, 'mont');
ok(r.length === 1 && r[0].item_name === 'Mont', `search is not noisy (mont → ${r.map(x => x.item_name || x.box_name).join(', ')})`);
r = await search(A, sA, 'drill');
ok(r.length === 1 && r[0].item_name === 'Cordless drill bits', `search is not noisy (drill → ${r.map(x => x.item_name || x.box_name).join(', ')})`);
r = await search(A, sA, 'kis');
ok(r.some(x => x.kind === 'box' && x.box_name === 'Kış kıyafetleri'), 'search finds boxes by name');
r = await search(A, sA, 'B-0002');
ok(r.some(x => x.kind === 'box' && x.box_code === 'B-0002'), 'search finds boxes by code');
r = await search(A, sA, '%');
ok(r.length === 0, 'search treats % literally');
r = await search(B, sA, 'matkap');
ok(r.length === 0, 'search respects RLS (B searching A\'s space)');
r = await search(A, sA, '');
ok(r.length === 0, 'empty query returns nothing');

// AI credits (service role only)
await expectError(as(A, () => db.query(`select public.consume_ai_credit($1, 100)`, [A])), 'users cannot call consume_ai_credit');
await expectError(as(A, () => db.query(`select public.refund_ai_credit($1)`, [A])), 'users cannot call refund_ai_credit');
await db.exec(`set role service_role`);
const left = [];
for (let i = 0; i < 4; i++) left.push((await db.query(`select public.consume_ai_credit($1, 3) l`, [A])).rows[0].l);
await db.query(`select public.refund_ai_credit($1)`, [A]);
const afterRefund = (await db.query(`select public.consume_ai_credit($1, 3) l`, [A])).rows[0].l;
await db.exec(`reset role`);
ok(JSON.stringify(left) === '[2,1,0,-1]', `daily limit counts down then blocks (${left})`);
ok(afterRefund === 0, 'refund gives the credit back');
const usageSeen = (await as(A, () => db.query(`select count from public.ai_usage`))).rows;
ok(usageSeen.length === 1 && usageSeen[0].count === 3, 'user can read own usage');
ok((await as(B, () => db.query(`select * from public.ai_usage`))).rows.length === 0, 'user B cannot read A\'s usage');

// server role can use the usage table (needed on new projects without default grants)
await db.exec(`set role service_role`);
const svc = (await db.query(`select count(*)::int c from public.ai_usage`)).rows[0].c;
await db.exec(`reset role`);
ok(svc >= 1, 'server role can read ai_usage');

// storage policies
await as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('box-photos', $1)`, [`${sA}/${box1.id}/a.jpg`]));
ok(true, 'A can upload into own space folder');
await expectError(as(B, () => db.query(`insert into storage.objects (bucket_id, name) values ('box-photos', $1)`, [`${sA}/${box1.id}/b.jpg`])), 'B cannot upload into A\'s folder');
await expectError(as(A, () => db.query(`insert into storage.objects (bucket_id, name) values ('box-photos', 'not-a-uuid/x.jpg')`)), 'bad folder names are rejected');
ok((await as(B, () => db.query(`select * from storage.objects`))).rows.length === 0, 'B cannot list A\'s photos');
ok((await as(A, () => db.query(`select * from storage.objects`))).rows.length === 1, 'A can list own photos');

// photos + cover
const ph = (await as(A, () => db.query(`insert into public.box_photos (box_id, path) values ($1, $2) returning id, space_id`, [box1.id, `${sA}/${box1.id}/a.jpg`]))).rows[0];
ok(ph.space_id === sA, 'photo rows get space_id from box');
await as(A, () => db.query(`update public.boxes set cover_photo_id = $1 where id = $2`, [ph.id, box1.id]));
await as(A, () => db.query(`delete from public.box_photos where id = $1`, [ph.id]));
const cover = (await as(A, () => db.query(`select cover_photo_id from public.boxes where id = $1`, [box1.id]))).rows[0].cover_photo_id;
ok(cover === null, 'deleting the cover photo clears cover_photo_id');

// list_boxes
await as(A, () => db.query(`insert into public.box_photos (box_id, path) values ($1, $2)`, [box1.id, `${sA}/${box1.id}/z.jpg`]));
const lb = (await as(A, () => db.query(`select * from public.list_boxes($1)`, [sA]))).rows;
const lb1 = lb.find(b => b.id === box1.id), lb2 = lb.find(b => b.id === box2.id);
ok(lb.length === 2 && lb1.item_count === 3 && lb2.item_count === 2 && lb1.photo_count === 1 && lb1.cover_path.endsWith('z.jpg') && lb2.cover_path === null, 'list_boxes returns counts and cover path');
ok((await as(B, () => db.query(`select * from public.list_boxes($1)`, [sA]))).rows.length === 0, 'list_boxes respects RLS');

// deleting a location keeps boxes
await as(A, () => db.query(`delete from public.locations where id = $1`, [loc]));
const b1 = (await as(A, () => db.query(`select location_id from public.boxes where id = $1`, [box1.id]))).rows[0];
ok(b1.location_id === null, 'deleting a location keeps its boxes (no location)');

// delete account
await as(A, () => db.query(`select public.delete_my_account()`));
const leftover = (await db.query(`select
  (select count(*) from public.spaces where owner_id = $1)::int s,
  (select count(*) from public.items where space_id = $2)::int i,
  (select count(*) from public.profiles where user_id = $1)::int p,
  (select count(*) from auth.users where id = $1)::int u,
  (select count(*) from public.boxes where space_id = $3)::int bb`, [A, sA, sB])).rows[0];
ok(leftover.s === 0 && leftover.i === 0 && leftover.p === 0 && leftover.u === 0, 'delete_my_account removes everything of A');
ok(leftover.bb === 1, 'B\'s data is untouched');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

// Database tests for version 2: upgrade from v1, roles (owner / editor / viewer /
// customer), invites, unit-limited customer access, requests, activity log,
// share links, new item fields. Runs the real SQL in PGlite (Postgres in WebAssembly).
//   cd tests && npm install && node features.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync } from 'node:fs';

const here = (p) => new URL(p, import.meta.url).pathname;
const V1 = readFileSync(here('./fixtures/schema-v1.sql'), 'utf8');
const V2 = readFileSync(here('../supabase/schema.sql'), 'utf8');

const STUB = `
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

async function freshDb() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(STUB);
  return db;
}
function helpers(db) {
  const as = async (uid, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
  };
  const q = (uid, sql, params) => as(uid, () => db.query(sql, params)).then((r) => r.rows);
  const one = async (uid, sql, params) => (await q(uid, sql, params))[0];
  const fails = async (p, msg) => {
    try { await p; ok(false, msg + ' (no error)'); } catch (e) { ok(true, msg + ' → ' + e.message.split('\n')[0]); }
  };
  return { as, q, one, fails };
}

// ---------------------------------------------------------------- upgrade
{
  const db = await freshDb();
  const { q, one } = helpers(db);
  await db.exec(V1);
  const U = '10000000-0000-4000-8000-000000000001';
  await db.exec(`insert into auth.users values ('${U}', 'hamza@example.com')`);
  const s = (await one(U, `select public.bootstrap_me('tr', 'Depom') j`)).j.space.id;
  const loc = (await one(U, `insert into public.locations (space_id, name) values ($1, 'Garaj') returning id`, [s])).id;
  const box = (await one(U, `insert into public.boxes (space_id, location_id, name) values ($1, $2, 'Aletler') returning id, code`, [s, loc]));
  await q(U, `insert into public.items (box_id, name, quantity) values ($1, 'akülü matkap', 1), ($1, 'çekiç', 2)`, [box.id]);

  await db.exec(V2);
  ok(true, 'v2 schema runs on top of a v1 database');
  await db.exec(V2);
  ok(true, 'v2 schema runs again (idempotent)');
  const items = await q(U, `select name, quantity, kind, checked_out_at from public.items order by name`);
  ok(items.length === 2 && items[0].kind === 'thing' && items[0].checked_out_at === null, 'existing items kept and got the new fields');
  const sp = await one(U, `select kind, currency, moving from public.spaces where id = $1`, [s]);
  ok(sp.kind === 'personal' && sp.currency === 'TRY' && sp.moving === false, 'existing space defaults to personal, TRY');
  const boot = (await one(U, `select public.bootstrap_me('tr', 'x') j`)).j;
  ok(boot.space.id === s && boot.spaces.length === 1 && boot.spaces[0].role === 'owner', 'bootstrap returns the same space plus the spaces list');
  await q(U, `update public.items set brand = 'Bosch', model = 'GSR 12V' where name = 'akülü matkap'`);
  const hit = await q(U, `select item_name from public.search_inventory($1, 'bosch')`, [s]);
  ok(hit.length === 1 && hit[0].item_name === 'akülü matkap', 'search now covers brand/model');
  const lb = await q(U, `select code, item_count, out_count, value_total from public.list_boxes($1)`, [s]);
  ok(lb.length === 1 && lb[0].code === 'B-0001' && lb[0].item_count === 2 && lb[0].out_count === 0, 'list_boxes works after upgrade');
  const box2 = await one(U, `insert into public.boxes (space_id, name) values ($1, 'Yeni') returning code`, [s]);
  ok(box2.code === 'B-0002', 'box numbering continues after upgrade');
}

// ---------------------------------------------------------------- roles & business
const db = await freshDb();
const { q, one, fails } = helpers(db);
await db.exec(V2);

const A = 'a0000000-0000-4000-8000-00000000000a'; // owner
const E = 'e0000000-0000-4000-8000-00000000000e'; // editor
const V = 'b0000000-0000-4000-8000-00000000000b'; // viewer
const C = 'c0000000-0000-4000-8000-00000000000c'; // customer, unit 1
const D = 'd0000000-0000-4000-8000-00000000000d'; // customer, unit 2
const X = 'f0000000-0000-4000-8000-00000000000f'; // stranger
await db.exec(`insert into auth.users values
  ('${A}', 'owner@depo.com'), ('${E}', 'editor@depo.com'), ('${V}', 'viewer@depo.com'),
  ('${C}', 'ayse@mail.com'), ('${D}', 'deniz@mail.com'), ('${X}', 'x@mail.com')`);
for (const u of [A, E, V, C, D, X]) await one(u, `select public.bootstrap_me('en', 'Mine') j`);
await q(A, `update public.profiles set display_name = 'Hamza' where user_id = $1`, [A]);

const biz = (await one(A, `select public.create_space('HG Depo', 'business') id`)).id;
const fam = (await one(A, `select public.create_space('Family', 'personal') id`)).id;
const bootA = (await one(A, `select public.bootstrap_me() j`)).j;
ok(bootA.space.id === fam && bootA.spaces.length === 3, 'create_space switches to the new space; spaces list has 3');
await q(A, `select public.switch_space($1)`, [biz]);
ok((await one(A, `select public.bootstrap_me() j`)).j.space.id === biz, 'switch_space changes the current space');
await fails(q(X, `select public.switch_space($1)`, [biz]), 'cannot switch to a space you are not in');

const u1 = (await one(A, `insert into public.locations (space_id, name) values ($1, 'Unit 1') returning id`, [biz])).id;
const u2 = (await one(A, `insert into public.locations (space_id, name) values ($1, 'Unit 2') returning id`, [biz])).id;
const b1 = (await one(A, `insert into public.boxes (space_id, location_id, name) values ($1, $2, 'Ayşe kışlık') returning id, code`, [biz, u1]));
const b2 = (await one(A, `insert into public.boxes (space_id, location_id, name) values ($1, $2, 'Deniz kitaplar') returning id, code`, [biz, u2]));
const b3 = (await one(A, `insert into public.boxes (space_id, name) values ($1, 'Unsorted') returning id, code`, [biz]));
await q(A, `insert into public.items (box_id, name, quantity, value) values ($1, 'mont', 2, 1500), ($1, 'bot', 1, null)`, [b1.id]);
await q(A, `insert into public.items (box_id, name, notes) values ($1, 'roman', 'signed copy')`, [b2.id]);
await q(A, `insert into public.box_photos (box_id, path) values ($1, $2), ($3, $4)`, [b1.id, `${biz}/${b1.id}/p.jpg`, b2.id, `${biz}/${b2.id}/p.jpg`]);
await q(A, `insert into storage.objects (bucket_id, name) values ('box-photos', $1), ('box-photos', $2), ('box-photos', $3)`,
  [`${biz}/${b1.id}/p.jpg`, `${biz}/${b2.id}/p.jpg`, `${biz}/brand/logo.jpg`]);

// invites
await fails(q(E, `select public.create_invite($1, 'editor')`, [biz]), 'only the owner can invite');
await fails(q(A, `select public.create_invite($1, 'customer', $2)`, [fam, [u1]]), 'no customers in a personal space');
await fails(q(A, `select public.create_invite($1, 'customer', '{}')`, [biz]), 'customer invite needs a unit');
await fails(q(A, `select public.create_invite($1, 'owner')`, [biz]), 'cannot invite as owner');
const invE = (await one(A, `select public.create_invite($1, 'editor') t`, [biz])).t;
const invV = (await one(A, `select public.create_invite($1, 'viewer') t`, [biz])).t;
const invC = (await one(A, `select public.create_invite($1, 'customer', $2) t`, [biz, [u1]])).t;
const invD = (await one(A, `select public.create_invite($1, 'customer', $2) t`, [biz, [u2]])).t;
const pv = (await one(C, `select public.preview_invite($1) j`, [invC])).j;
ok(pv.space_name === 'HG Depo' && pv.role === 'customer' && pv.inviter === 'Hamza' && pv.valid && !pv.already_member, 'preview shows space, role and who invited');
ok((await q(E, `select * from public.space_invites`)).length === 0, 'non-owners cannot list invites');
ok((await q(A, `select * from public.space_invites where space_id = $1`, [biz])).length === 4, 'owner lists invites');
for (const [u, tok] of [[E, invE], [V, invV], [C, invC], [D, invD]]) await one(u, `select public.accept_invite($1)`, [tok]);
ok((await one(C, `select public.bootstrap_me() j`)).j.space.id === biz, 'accepting an invite switches to that space');
await fails(q(X, `select public.accept_invite($1)`, [invE]), 'an invite link works only once');
const expired = (await one(A, `select public.create_invite($1, 'viewer') t`, [biz])).t;
await db.exec(`update public.space_invites set expires_at = now() - interval '1 minute' where id = '${expired}'`);
await fails(q(X, `select public.accept_invite($1)`, [expired]), 'expired invites are refused');
ok((await one(X, `select public.preview_invite($1) j`, [expired])).j.valid === false, 'preview marks expired invites');
ok((await one(E, `select public.accept_invite($1) s`, [invE])).s === biz, 're-opening your own used link just switches to the space');

// visibility
const seen = async (u) => ({
  locs: (await q(u, `select name from public.locations where space_id = $1 order by name`, [biz])).map((r) => r.name),
  boxes: (await q(u, `select code from public.boxes where space_id = $1 order by code`, [biz])).map((r) => r.code),
  items: (await q(u, `select name from public.items where space_id = $1 order by name`, [biz])).map((r) => r.name),
  photos: (await q(u, `select path from public.box_photos where space_id = $1`, [biz])).length,
  files: (await q(u, `select name from storage.objects order by name`)).map((r) => r.name.split('/')[1]),
  list: (await q(u, `select code from public.list_boxes($1) order by code`, [biz])).map((r) => r.code),
  search: (await q(u, `select box_code from public.search_inventory($1, 'roman')`, [biz])).length
});
const sC = await seen(C), sD = await seen(D), sV = await seen(V), sX = await seen(X);
ok(sC.locs.join() === 'Unit 1' && sC.boxes.join() === 'B-0001' && sC.items.join() === 'bot,mont' && sC.photos === 1, `customer sees only their unit (${JSON.stringify(sC)})`);
ok(sC.list.join() === 'B-0001' && sC.search === 0, 'customer list and search are limited to their unit');
ok(sC.files.length === 2 && sC.files.includes('brand') && sC.files.includes(b1.id), 'customer can open their box photos and the logo, not others');
ok(sD.boxes.join() === 'B-0002' && sD.items.join() === 'roman' && sD.search === 1, 'second customer sees only their unit');
ok(sV.boxes.length === 3 && sV.items.length === 3 && sV.files.length === 3, 'viewer sees the whole space');
ok(sX.boxes.length === 0 && sX.files.length === 0, 'stranger sees nothing');
ok((await q(C, `select * from public.space_members where space_id = $1`, [biz])).length === 1, 'customer sees only their own membership');
ok((await q(C, `select * from public.list_members($1)`, [biz])).length === 0, 'customer cannot list members');
const members = await q(V, `select role, email, location_ids from public.list_members($1)`, [biz]);
ok(members.map((m) => m.role).join() === 'owner,editor,viewer,customer,customer', 'staff see members, ordered by role');
ok(members.find((m) => m.email === 'ayse@mail.com').location_ids.join() === u1, 'member list shows customer units');

// writing
await fails(q(C, `insert into public.items (box_id, name) values ($1, 'x')`, [b1.id]), 'customer cannot add items');
ok((await q(C, `update public.items set name = 'x' where box_id = $1 returning id`, [b1.id])).length === 0, 'customer cannot edit items');
await fails(q(V, `insert into public.items (box_id, name) values ($1, 'x')`, [b1.id]), 'viewer cannot add items');
await q(E, `insert into public.items (box_id, name) values ($1, 'eldiven')`, [b1.id]);
ok(true, 'editor can add items');
await q(E, `update public.spaces set moving = true, rooms = '[{"name":"Kitchen","color":"#E07A5F"}]' where id = $1`, [biz]);
ok((await one(A, `select moving from public.spaces where id = $1`, [biz])).moving === true, 'editor can change space settings');
await fails(q(E, `update public.spaces set owner_id = $2 where id = $1`, [biz, E]), 'nobody can take over ownership');
ok((await q(C, `update public.spaces set name = 'mine' where id = $1 returning id`, [biz])).length === 0, 'customer cannot change the space');
await fails(q(E, `insert into storage.objects (bucket_id, name) values ('box-photos', $1)`, [`${fam}/x/y.jpg`]), 'editor cannot upload into a space they are not in');

// member management
await fails(q(E, `select public.set_member_role($1, $2, 'editor')`, [biz, V]), 'only the owner changes roles');
await fails(q(A, `select public.set_member_role($1, $2, 'editor')`, [biz, A]), 'owner cannot change own role');
await q(A, `select public.set_member_locations($1, $2, $3)`, [biz, C, [u1, u2]]);
ok((await seen(C)).boxes.join() === 'B-0001,B-0002', 'giving a customer a second unit shows its boxes');
await q(A, `select public.set_member_locations($1, $2, $3)`, [biz, C, [u1]]);
await q(A, `select public.set_member_role($1, $2, 'editor')`, [biz, V]);
ok((await one(V, `select public.member_role($1) r`, [biz])).r === 'editor', 'owner can promote a viewer');
await q(A, `select public.set_member_role($1, $2, 'viewer')`, [biz, V]);

// requests
const r1 = (await one(C, `insert into public.retrieval_requests (box_id, note, requested_by, status) values ($1, 'Saturday please', $2, 'done') returning id, status, requested_by, space_id`, [b1.id, X]));
ok(r1.status === 'open' && r1.requested_by === C && r1.space_id === biz, 'request is always open, from you, in the box space');
await fails(q(C, `insert into public.retrieval_requests (box_id) values ($1)`, [b2.id]), 'customer cannot request a box outside their unit');
await fails(q(C, `insert into public.retrieval_requests (box_id) values ($1)`, [b1.id]), 'only one open request per box');
await fails(q(C, `update public.retrieval_requests set status = 'done' where id = $1`, [r1.id]), 'customer cannot mark their request done');
ok((await q(D, `select * from public.retrieval_requests`)).length === 0, 'other customers cannot see the request');
ok((await q(V, `select * from public.retrieval_requests`)).length === 1, 'staff see requests');
await q(E, `update public.retrieval_requests set status = 'ready' where id = $1`, [r1.id]);
const r1b = await one(A, `select status, handled_by from public.retrieval_requests where id = $1`, [r1.id]);
ok(r1b.status === 'ready' && r1b.handled_by === E, 'editor marks it ready (handled_by recorded)');
await q(E, `update public.retrieval_requests set status = 'done' where id = $1`, [r1.id]);
const r2 = (await one(C, `insert into public.retrieval_requests (box_id) values ($1) returning id`, [b1.id])).id;
await q(C, `update public.retrieval_requests set status = 'cancelled' where id = $1`, [r2]);
ok((await one(C, `select status from public.retrieval_requests where id = $1`, [r2])).status === 'cancelled', 'customer can cancel an open request');

// items: taken out, expiry, value, appliance
const mont = (await one(A, `select id from public.items where name = 'mont'`)).id;
await q(E, `update public.items set checked_out_at = now(), checked_out_to = 'Ali' where id = $1`, [mont]);
const s1 = await q(A, `select item_name, checked_out_to from public.search_inventory($1, 'ali')`, [biz]);
ok(s1.length === 1 && s1[0].item_name === 'mont' && s1[0].checked_out_to === 'Ali', 'search finds items by who has them');
const lb1 = (await q(A, `select code, out_count, value_total from public.list_boxes($1)`, [biz])).find((b) => b.code === 'B-0001');
ok(lb1.out_count === 1 && Number(lb1.value_total) === 3000, 'box list shows taken-out count and total value (value × quantity)');
await q(E, `update public.items set checked_out_at = null, checked_out_to = null where id = $1`, [mont]);
await q(E, `update public.items set quantity = 3 where id = $1`, [mont]);
await q(E, `update public.items set box_id = $2 where id = $1`, [mont, b3.id]);
await q(E, `update public.items set kind = 'appliance', brand = 'Arçelik', model = 'K 1234', serial = 'SN998', warranty_until = current_date + 20 where name = 'bot'`);
ok((await q(A, `select item_name from public.search_inventory($1, 'SN998')`, [biz])).length === 1, 'search finds appliances by serial number');
await fails(q(E, `update public.items set kind = 'robot' where name = 'bot'`), 'item kind is checked');
await fails(q(E, `update public.items set value = -5 where name = 'bot'`), 'value cannot be negative');
await fails(q(E, `update public.boxes set move_status = 'lost' where id = $1`, [b1.id]), 'moving status is checked');
await q(E, `update public.boxes set move_status = 'packed', dest_room = 'Kitchen', fragile = true where id = $1`, [b1.id]);
await q(E, `update public.boxes set location_id = $2 where id = $1`, [b3.id, u2]);

// activity
const acts = await q(A, `select action, actor, details from public.list_activity($1, null, 100)`, [biz]);
const actions = acts.map((a) => a.action);
const has = (a) => actions.includes(a);
ok(['box_created', 'item_added', 'item_taken_out', 'item_returned', 'item_quantity', 'item_moved', 'item_edited', 'box_status', 'box_moved', 'request_created', 'request_ready', 'request_done', 'request_cancelled'].every(has),
  `activity covers boxes, items and requests (${[...new Set(actions)].join(', ')})`);
const taken = acts.find((a) => a.action === 'item_taken_out');
ok(taken.actor === 'editor' && taken.details.to === 'Ali' && taken.details.box === 'B-0001', 'activity names who did it and the details');
const moved = acts.find((a) => a.action === 'item_moved');
ok(moved.details.from === 'B-0001' && moved.details.box === 'B-0003', 'moves record from and to');
ok((await q(C, `select * from public.list_activity($1)`, [biz])).length === 0 && (await q(C, `select * from public.activity`)).length === 0, 'customers cannot see activity');
await fails(q(A, `select public.log_activity($1, 'fake', null, null, '{}')`, [biz]), 'nobody can write fake activity');
const page1 = await q(A, `select id from public.list_activity($1, null, 5)`, [biz]);
const page2 = await q(A, `select id from public.list_activity($1, $2, 5)`, [biz, page1[4].id]);
ok(page2.length === 5 && page2[0].id < page1[4].id, 'activity pages with "before"');

// shares
await fails(q(V, `insert into public.box_shares (box_id) values ($1)`, [b2.id]), 'viewer cannot create share links');
const share = (await one(E, `insert into public.box_shares (box_id) values ($1) returning id, space_id, created_by`, [b2.id]));
ok(share.space_id === biz && share.created_by === E, 'share link created for the box');
await db.exec(`set role anon`);
const pub = (await db.query(`select public.get_shared_box($1) j`, [share.id])).rows[0].j;
await db.exec(`reset role`);
ok(pub.code === 'B-0002' && pub.place === 'Unit 2' && pub.items.length === 1 && pub.items[0].name === 'roman', `anyone with the link sees the box and its items (${JSON.stringify(pub)})`);
ok(!JSON.stringify(pub).includes('signed copy') && !JSON.stringify(pub).includes('SN998'), 'shared view leaves out notes and serials');
await q(E, `delete from public.box_shares where id = $1`, [share.id]);
await db.exec(`set role anon`);
const gone = (await db.query(`select public.get_shared_box($1) j`, [share.id])).rows[0].j;
await db.exec(`reset role`);
ok(gone === null, 'deleting the share link turns it off');
await db.exec(`set role anon`);
let anonList = true;
try { await db.query(`select * from public.box_shares`); } catch (e) { anonList = false; }
await db.exec(`reset role`);
ok(!anonList, 'share links cannot be listed by the public');

// feedback
await q(C, `insert into public.feedback (message, kind) values ('Great app', 'idea')`);
await fails(q(C, `insert into public.feedback (message, user_id) values ('fake', $1)`, [D]), 'feedback cannot be sent as someone else');
ok((await q(D, `select * from public.feedback`)).length === 0 && (await q(C, `select * from public.feedback`)).length === 1, 'feedback is private to the sender');

// limits
for (let i = 0; i < 7; i++) await one(A, `select public.create_space($1) id`, ['S' + i]);
await fails(q(A, `select public.create_space('one too many')`), 'at most 10 spaces per owner');

// removal / leaving
await q(V, `select public.leave_space($1)`, [biz]);
ok((await seen(V)).boxes.length === 0, 'after leaving, the viewer sees nothing');
await fails(q(A, `select public.leave_space($1)`, [biz]), 'the owner cannot leave');
await q(A, `select public.remove_member($1, $2)`, [biz, D]);
ok((await seen(D)).boxes.length === 0 && (await q(D, `select * from public.member_locations`)).length === 0, 'removing a customer removes their access');
ok((await one(D, `select public.bootstrap_me() j`)).j.space.id !== biz, 'removed member falls back to their own space');

// deleting a box with items logs one entry, not one per item
const before = (await one(A, `select count(*)::int c from public.activity where space_id = $1`, [biz])).c;
await q(E, `delete from public.boxes where id = $1`, [b2.id]);
const after = await q(A, `select action from public.activity where space_id = $1 order by id desc limit 3`, [biz]);
const delta = (await one(A, `select count(*)::int c from public.activity where space_id = $1`, [biz])).c - before;
ok(delta === 1 && after[0].action === 'box_deleted', 'deleting a box logs one entry');

// account deletion
await q(E, `select public.delete_my_account()`);
const eLeft = await one(A, `select (select count(*) from public.space_members where user_id = $1)::int m,
  (select count(*) from public.activity where space_id = $2 and user_id is null)::int nulls,
  (select count(*) from public.items where name = 'eldiven')::int items`, [E, biz]);
ok(eLeft.m === 0 && eLeft.nulls > 0 && eLeft.items === 1, 'deleting a member account keeps the shared data, history becomes anonymous');
await q(A, `select public.delete_my_account()`);
const aLeft = await one(C, `select (select count(*) from public.spaces where id = $1)::int s,
  (select count(*) from public.activity where space_id = $1)::int a`, [biz]);
ok(aLeft.s === 0 && aLeft.a === 0, 'deleting the owner account deletes the business space and its history');
ok((await one(C, `select public.bootstrap_me() j`)).j.space.id !== biz, 'customer falls back to their own space');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

// In-memory stand-in for the Supabase client, used only by tests/smoke.mjs.
// Implements the calls the app makes, including a simple version of the
// database rules (roles, customers limited to their units). Loaded with
// page.addInitScript(). The real rules are tested in schema/features tests.
(function () {
  // Kept in sessionStorage so the fake "server" survives page reloads within a test.
  const saved = JSON.parse(sessionStorage.getItem('__fake') || 'null');
  const empty = { users: [], spaces: [], space_members: [], profiles: [], locations: [], boxes: [], box_photos: [], items: [], ai_usage: [], member_locations: [], space_invites: [], box_shares: [], retrieval_requests: [], activity: [], feedback: [] };
  const db = Object.assign(empty, (saved && saved.db) || {});
  const files = new Map((saved && saved.files) || []);
  let session = (saved && saved.session) || null;
  const persist = () => sessionStorage.setItem('__fake', JSON.stringify({ db, session, files: Array.from(files) }));
  window.__fakePersist = persist;
  const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  const listeners = [];
  let tick = (saved && saved.tick) || 0;
  const now = () => new Date(Date.now() + (tick += 1)).toISOString();
  const id = () => crypto.randomUUID();
  const fold = (s) => String(s || '').replace(/İ/g, 'i').toLowerCase().replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c]));
  const emit = (event) => listeners.forEach((cb) => setTimeout(() => cb(event, session), 0));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const ok = (data) => Promise.resolve({ data, error: null });
  const fail = (message) => Promise.resolve({ data: null, error: { message } });
  const offline = () => !navigator.onLine || sessionStorage.getItem('__fakeOffline') === '1';
  window.__fakeDb = db;
  window.__fakeFiles = files;
  window.__fakeLog = [];

  // ---- who is asking, and what may they see ----
  const uid = () => (session ? session.user.id : null);
  const roleIn = (space) => { const m = db.space_members.find((x) => x.space_id === space && x.user_id === uid()); return m ? m.role : null; };
  const staff = (space) => ['owner', 'editor', 'viewer'].includes(roleIn(space));
  const canEdit = (space) => ['owner', 'editor'].includes(roleIn(space));
  const units = () => db.member_locations.filter((m) => m.user_id === uid()).map((m) => m.location_id);
  const seesLocation = (l) => staff(l.space_id) || (roleIn(l.space_id) === 'customer' && units().includes(l.id));
  const seesBox = (b) => !!b && (staff(b.space_id) || (roleIn(b.space_id) === 'customer' && b.location_id && units().includes(b.location_id)));
  const box = (bid) => db.boxes.find((b) => b.id === bid);
  const VISIBLE = {
    spaces: (r) => !!roleIn(r.id),
    space_members: (r) => r.user_id === uid() || staff(r.space_id),
    profiles: (r) => r.user_id === uid(),
    locations: seesLocation,
    boxes: seesBox,
    items: (r) => seesBox(box(r.box_id)),
    box_photos: (r) => seesBox(box(r.box_id)),
    member_locations: (r) => r.user_id === uid() || staff(r.space_id),
    space_invites: (r) => roleIn(r.space_id) === 'owner',
    box_shares: (r) => canEdit(r.space_id),
    retrieval_requests: (r) => staff(r.space_id) || r.requested_by === uid(),
    activity: (r) => staff(r.space_id),
    feedback: (r) => r.user_id === uid(),
    ai_usage: (r) => r.user_id === uid()
  };
  const WRITABLE = { locations: 1, boxes: 1, items: 1, box_photos: 1 };
  const nameOf = (u) => { const p = db.profiles.find((x) => x.user_id === u); const us = db.users.find((x) => x.id === u); return (p && p.display_name) || (us ? us.email.split('@')[0] : null); };
  const log = (space, action, boxId, details) => db.activity.push({ id: db.activity.length + 1, space_id: space, user_id: uid(), action, box_id: boxId, item_id: null, details, created_at: now() });

  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; this.wantRows = false; this.mode = 'many'; this.orders = []; this.rangeFrom = null; this.lim = null; }
    select() { if (this.op !== 'select') this.wantRows = true; return this; }
    insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
    upsert(rows) { this.op = 'insert'; this.ignoreDup = true; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
    update(vals) { this.op = 'update'; this.payload = vals; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
    is(col, val) { this.filters.push((r) => (r[col] == null) === (val === null)); return this; }
    in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
    order(col, opts) { this.orders.push([col, !(opts && opts.ascending === false)]); return this; }
    range(a, b) { this.rangeFrom = [a, b]; return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }
    match(r) { return this.filters.every((f) => f(r)); }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      window.__fakeLog.push(`${this.op} ${this.table}`);
      if (offline()) return fail('Failed to fetch');
      if (window.__fakeFailNext) { window.__fakeFailNext = false; return fail('Failed to fetch'); }
      const rows = db[this.table];
      if (!rows) return fail('no table ' + this.table);
      const vis = VISIBLE[this.table] || (() => true);
      let out;
      if (this.op === 'select') {
        out = rows.filter((r) => vis(r) && this.match(r));
        this.orders.forEach(([c, asc]) => out.sort((a, b) => (asc ? 1 : -1) * String(a[c]).localeCompare(String(b[c]))));
        if (this.rangeFrom) out = out.slice(this.rangeFrom[0], this.rangeFrom[1] + 1);
        if (this.lim != null) out = out.slice(0, this.lim);
      } else if (this.op === 'insert') {
        out = [];
        for (const p of this.payload) {
          const r = Object.assign({ id: id(), created_at: now(), updated_at: now() }, clone(p));
          if (this.ignoreDup && rows.some((x) => x.id === r.id)) continue;
          if (['items', 'box_photos', 'box_shares', 'retrieval_requests'].includes(this.table)) {
            const b = box(r.box_id);
            if (!b) return fail('Box not found');
            r.space_id = b.space_id;
          }
          if (WRITABLE[this.table] && !canEdit(r.space_id)) return fail('new row violates row-level security policy');
          if (this.table === 'boxes') {
            const sp = db.spaces.find((s) => s.id === r.space_id);
            sp.box_counter += 1;
            r.code = r.code || 'B-' + String(sp.box_counter).padStart(4, '0');
            Object.assign(r, { cover_photo_id: r.cover_photo_id || null, label_printed_at: null, location_id: r.location_id || null, move_status: r.move_status || null, dest_room: r.dest_room || null, fragile: !!r.fragile, remind_on: r.remind_on || null, remind_note: r.remind_note || null, remind_yearly: !!r.remind_yearly });
            log(r.space_id, 'box_created', r.id, { box: r.code, name: r.name });
          }
          if (this.table === 'items') {
            r.quantity = r.quantity || 1; r.category = r.category || 'other'; r.notes = r.notes || null; r.kind = r.kind || 'thing';
            log(r.space_id, 'item_added', r.box_id, { name: r.name, quantity: r.quantity, box: box(r.box_id).code });
          }
          if (this.table === 'box_shares') { if (!canEdit(r.space_id)) return fail('new row violates row-level security policy'); r.created_by = uid(); }
          if (this.table === 'retrieval_requests') {
            if (!seesBox(box(r.box_id))) return fail('new row violates row-level security policy');
            if (rows.some((x) => x.box_id === r.box_id && (x.status === 'open' || x.status === 'ready'))) return fail('duplicate key value violates unique constraint');
            Object.assign(r, { requested_by: uid(), status: 'open', handled_by: null, note: r.note || null });
            log(r.space_id, 'request_created', r.box_id, { box: box(r.box_id).code });
          }
          if (this.table === 'feedback') r.user_id = uid();
          rows.push(r);
          out.push(r);
        }
      } else if (this.op === 'update') {
        out = rows.filter((r) => vis(r) && this.match(r));
        for (const r of out) {
          if (WRITABLE[this.table] && !canEdit(r.space_id)) { out = []; break; }
          if (this.table === 'spaces' && !canEdit(r.id)) { out = []; break; }
          if (this.table === 'retrieval_requests') {
            if (!canEdit(r.space_id) && !(r.requested_by === uid() && r.status === 'open' && this.payload.status === 'cancelled')) return fail('Not allowed');
            if (this.payload.status && this.payload.status !== r.status) { r.handled_by = uid(); log(r.space_id, 'request_' + this.payload.status, r.box_id, { box: box(r.box_id).code }); }
          }
          if (this.table === 'items') {
            if (this.payload.checked_out_at && !r.checked_out_at) log(r.space_id, 'item_taken_out', r.box_id, { name: r.name, box: box(r.box_id).code, to: this.payload.checked_out_to });
            else if (this.payload.checked_out_at === null && r.checked_out_at) log(r.space_id, 'item_returned', r.box_id, { name: r.name, box: box(r.box_id).code });
          }
          if (this.table === 'boxes' && 'move_status' in this.payload && this.payload.move_status !== r.move_status) log(r.space_id, 'box_status', r.id, { box: r.code, status: this.payload.move_status });
          Object.assign(r, clone(this.payload), { updated_at: now() });
          if (this.table === 'items' && this.payload.box_id) r.space_id = box(r.box_id).space_id;
        }
      } else if (this.op === 'delete') {
        out = rows.filter((r) => vis(r) && this.match(r));
        if (WRITABLE[this.table] && out.some((r) => !canEdit(r.space_id))) out = [];
        if (this.table === 'spaces') out = out.filter((r) => r.owner_id === uid());
        const ids = new Set(out.map((r) => r.id));
        db[this.table] = rows.filter((r) => !ids.has(r.id));
        if (this.table === 'boxes') {
          for (const t of ['items', 'box_photos', 'box_shares', 'retrieval_requests']) db[t] = db[t].filter((i) => !ids.has(i.box_id));
          out.forEach((b) => log(b.space_id, 'box_deleted', null, { box: b.code, name: b.name }));
        }
        if (this.table === 'spaces') {
          for (const t of ['locations', 'boxes', 'box_photos', 'items', 'space_members', 'member_locations', 'space_invites', 'box_shares', 'retrieval_requests', 'activity']) db[t] = db[t].filter((x) => !ids.has(x.space_id));
          db.profiles.forEach((p) => { if (ids.has(p.current_space_id)) p.current_space_id = null; });
        }
        if (this.table === 'locations') {
          db.boxes.forEach((b) => { if (ids.has(b.location_id)) b.location_id = null; });
          db.member_locations = db.member_locations.filter((m) => !ids.has(m.location_id));
        }
        if (this.table === 'box_photos') db.boxes.forEach((b) => { if (ids.has(b.cover_photo_id)) b.cover_photo_id = null; });
      }
      if (this.op !== 'select') persist();
      const data = (this.op === 'select' || this.wantRows) ? clone(out) : null;
      if (this.mode === 'single') return data && data.length === 1 ? ok(data[0]) : fail('not exactly one row');
      if (this.mode === 'maybe') return ok(data && data.length ? data[0] : null);
      return ok(data);
    }
  }

  const spaceRow = (s) => Object.assign({ kind: 'personal', brand_name: null, brand_color: null, logo_path: null, currency: 'TRY', moving: false, rooms: [] }, s);
  const newSpace = (name, kind) => {
    const sp = spaceRow({ id: id(), name, owner_id: uid(), box_counter: 0, created_at: now(), kind: kind === 'business' ? 'business' : 'personal' });
    db.spaces.push(sp);
    db.space_members.push({ space_id: sp.id, user_id: uid(), role: 'owner', created_at: now() });
    return sp;
  };
  const rpcs = {
    bootstrap_me({ p_language, p_space_name }) {
      let prof = db.profiles.find((p) => p.user_id === uid());
      if (!prof) { prof = { user_id: uid(), display_name: null, language: p_language || 'en', current_space_id: null, onboarded: false }; db.profiles.push(prof); }
      let sid = prof.current_space_id;
      if (!sid || !roleIn(sid)) { const m = db.space_members.find((x) => x.user_id === uid()); sid = m ? m.space_id : null; }
      if (!sid) sid = newSpace(p_space_name || 'My storage').id;
      prof.current_space_id = sid;
      const sp = db.spaces.find((s) => s.id === sid);
      Object.assign(sp, spaceRow(sp));
      return {
        profile: clone(prof), space: clone(sp), role: roleIn(sid),
        spaces: db.space_members.filter((m) => m.user_id === uid()).map((m) => { const s = db.spaces.find((x) => x.id === m.space_id); return { id: s.id, name: s.name, kind: s.kind || 'personal', role: m.role, brand_name: s.brand_name || null, brand_color: s.brand_color || null }; })
      };
    },
    create_space({ p_name, p_kind }) { const sp = newSpace(p_name, p_kind); db.profiles.find((p) => p.user_id === uid()).current_space_id = sp.id; return sp.id; },
    switch_space({ p_space }) { if (!roleIn(p_space)) throw new Error('Not a member'); db.profiles.find((p) => p.user_id === uid()).current_space_id = p_space; return null; },
    list_boxes({ p_space }) {
      return db.boxes.filter((b) => b.space_id === p_space && seesBox(b)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((b) => {
        const photos = db.box_photos.filter((p) => p.box_id === b.id).sort((x, y) => y.created_at.localeCompare(x.created_at));
        const cover = photos.find((p) => p.id === b.cover_photo_id) || photos[0];
        const items = db.items.filter((i) => i.box_id === b.id);
        return Object.assign({ move_status: null, dest_room: null, fragile: false, remind_on: null, remind_note: null, remind_yearly: false }, clone(b), {
          item_count: items.length, photo_count: photos.length, cover_path: cover ? cover.path : null,
          out_count: items.filter((i) => i.checked_out_at).length,
          value_total: items.reduce((n, i) => n + (Number(i.value) || 0) * Math.max(1, i.quantity), 0)
        });
      });
    },
    search_inventory({ p_space, p_query }) {
      const q = fold(p_query.trim());
      if (!q) return [];
      const loc = (b) => db.locations.find((l) => l.id === b.location_id);
      const items = db.items.filter((i) => i.space_id === p_space && seesBox(box(i.box_id)) && fold([i.name, i.notes, i.brand, i.model, i.serial, i.checked_out_to].join(' ')).includes(q)).map((i) => {
        const b = box(i.box_id);
        return { kind: 'item', item_id: i.id, item_name: i.name, quantity: i.quantity, category: i.category, box_id: b.id, box_code: b.code, box_name: b.name, location_name: loc(b) ? loc(b).name : null, spot: b.spot, score: 1, checked_out_at: i.checked_out_at || null, checked_out_to: i.checked_out_to || null, expires_on: i.expires_on || null };
      });
      const boxes = db.boxes.filter((b) => b.space_id === p_space && seesBox(b) && fold([b.code, b.name, b.spot, b.notes].join(' ')).includes(q))
        .map((b) => ({ kind: 'box', item_id: null, item_name: null, quantity: null, category: null, box_id: b.id, box_code: b.code, box_name: b.name, location_name: loc(b) ? loc(b).name : null, spot: b.spot, score: 1 }));
      return items.concat(boxes);
    },
    list_members({ p_space }) {
      if (!staff(p_space)) return [];
      return db.space_members.filter((m) => m.space_id === p_space).map((m) => {
        const u = db.users.find((x) => x.id === m.user_id) || {};
        const p = db.profiles.find((x) => x.user_id === m.user_id) || {};
        return { user_id: m.user_id, role: m.role, display_name: p.display_name || null, email: u.email || null, joined_at: m.created_at, location_ids: db.member_locations.filter((x) => x.space_id === p_space && x.user_id === m.user_id).map((x) => x.location_id) };
      });
    },
    set_member_role({ p_space, p_user, p_role }) { if (roleIn(p_space) !== 'owner') throw new Error('Only the owner'); db.space_members.find((m) => m.space_id === p_space && m.user_id === p_user).role = p_role; return null; },
    set_member_locations({ p_space, p_user, p_locations }) {
      if (roleIn(p_space) !== 'owner') throw new Error('Only the owner');
      db.member_locations = db.member_locations.filter((m) => !(m.space_id === p_space && m.user_id === p_user)).concat(p_locations.map((l) => ({ space_id: p_space, user_id: p_user, location_id: l })));
      return null;
    },
    remove_member({ p_space, p_user }) {
      if (roleIn(p_space) !== 'owner') throw new Error('Only the owner');
      db.space_members = db.space_members.filter((m) => !(m.space_id === p_space && m.user_id === p_user));
      db.member_locations = db.member_locations.filter((m) => !(m.space_id === p_space && m.user_id === p_user));
      return null;
    },
    leave_space({ p_space }) {
      if (roleIn(p_space) === 'owner') throw new Error('The owner cannot leave');
      db.space_members = db.space_members.filter((m) => !(m.space_id === p_space && m.user_id === uid()));
      db.profiles.forEach((p) => { if (p.user_id === uid() && p.current_space_id === p_space) p.current_space_id = null; });
      return null;
    },
    create_invite({ p_space, p_role, p_locations }) {
      if (roleIn(p_space) !== 'owner') throw new Error('Only the owner can invite people');
      const inv = { id: id(), space_id: p_space, role: p_role, location_ids: p_role === 'customer' ? p_locations : [], created_by: uid(), created_at: now(), expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), used_at: null, used_by: null };
      db.space_invites.push(inv);
      return inv.id;
    },
    preview_invite({ p_token }) {
      const i = db.space_invites.find((x) => x.id === p_token);
      if (!i) return null;
      const s = db.spaces.find((x) => x.id === i.space_id);
      return { space_id: s.id, space_name: s.name, kind: s.kind, brand_name: s.brand_name || null, role: i.role, inviter: nameOf(i.created_by), valid: !i.used_at && new Date(i.expires_at) > new Date(), already_member: !!roleIn(s.id) };
    },
    accept_invite({ p_token }) {
      const i = db.space_invites.find((x) => x.id === p_token);
      if (!i) throw new Error('Invite not found');
      const prof = db.profiles.find((p) => p.user_id === uid());
      if (roleIn(i.space_id)) { prof.current_space_id = i.space_id; return i.space_id; }
      if (i.used_at) throw new Error('Invite expired');
      db.space_members.push({ space_id: i.space_id, user_id: uid(), role: i.role, created_at: now() });
      i.location_ids.forEach((l) => db.member_locations.push({ space_id: i.space_id, user_id: uid(), location_id: l }));
      i.used_at = now(); i.used_by = uid();
      prof.current_space_id = i.space_id;
      return i.space_id;
    },
    list_activity({ p_space, p_before, p_limit }) {
      if (!staff(p_space)) return [];
      return db.activity.filter((a) => a.space_id === p_space && (p_before == null || a.id < p_before)).sort((a, b) => b.id - a.id).slice(0, p_limit || 50)
        .map((a) => Object.assign({}, a, { actor: nameOf(a.user_id) }));
    },
    get_shared_box({ p_share }) {
      const sh = db.box_shares.find((x) => x.id === p_share);
      if (!sh) return null;
      const b = box(sh.box_id);
      const l = db.locations.find((x) => x.id === b.location_id);
      const s = db.spaces.find((x) => x.id === b.space_id);
      return { code: b.code, name: b.name, spot: b.spot, fragile: !!b.fragile, place: l ? l.name : null, brand_name: s.kind === 'business' ? s.brand_name : null, items: db.items.filter((i) => i.box_id === b.id).map((i) => ({ name: i.name, quantity: i.quantity, category: i.category })) };
    },
    delete_my_account() {
      const spaces = db.spaces.filter((s) => s.owner_id === uid()).map((s) => s.id);
      for (const t of ['locations', 'boxes', 'box_photos', 'items', 'space_members', 'member_locations', 'retrieval_requests', 'activity', 'box_shares', 'space_invites']) db[t] = db[t].filter((r) => !spaces.includes(r.space_id));
      db.space_members = db.space_members.filter((m) => m.user_id !== uid());
      db.spaces = db.spaces.filter((s) => s.owner_id !== uid());
      db.profiles = db.profiles.filter((p) => p.user_id !== uid());
      window.__accountDeleted = true;
      return null;
    }
  };

  const userFor = (email) => {
    let u = db.users.find((x) => x.email === email);
    if (!u) { u = { id: id(), email }; db.users.push(u); }
    return u;
  };
  window.__TEST_SUPABASE__ = {
    auth: {
      onAuthStateChange(cb) { listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return ok({ session }); },
      async signInWithPassword({ email, password }) {
        if (offline()) return fail('Failed to fetch');
        if (password !== 'secret123') return fail('Invalid login credentials');
        const u = userFor(email);
        session = { access_token: 'tok-' + u.id, user: { id: u.id, email } };
        persist();
        emit('SIGNED_IN');
        return ok({ session, user: session.user });
      },
      async signUp({ email }) {
        const u = userFor(email);
        session = { access_token: 'tok-' + u.id, user: { id: u.id, email } };
        persist();
        emit('SIGNED_IN');
        return ok({ session, user: session.user });
      },
      async signInWithOAuth(opts) { window.__oauth = opts; return { data: {}, error: null }; },
      async signOut() { session = null; persist(); emit('SIGNED_OUT'); return { error: null }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async updateUser() { return ok({ user: session && session.user }); }
    },
    from(table) { return new Query(table); },
    async rpc(name, args) {
      window.__fakeLog.push('rpc ' + name);
      if (offline()) return fail('Failed to fetch');
      if (!rpcs[name]) return fail('no rpc ' + name);
      try {
        const result = rpcs[name](args || {});
        persist();
        return ok(result);
      } catch (e) { return fail(e.message); }
    },
    storage: {
      from() {
        return {
          async upload(path, blob) { if (offline()) return fail('Failed to fetch'); files.set(path, await toDataUrl(blob)); persist(); return ok({ path }); },
          async createSignedUrls(paths) { if (offline()) return fail('Failed to fetch'); return ok(paths.map((p) => ({ path: p, signedUrl: files.get(p) || null, error: files.has(p) ? null : 'missing' }))); },
          async remove(paths) { paths.forEach((p) => files.delete(p)); persist(); return ok(paths); }
        };
      }
    }
  };
})();

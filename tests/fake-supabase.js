// In-memory stand-in for the Supabase client, used only by tests/smoke.mjs.
// Implements just the calls index.html makes. Loaded with page.addInitScript().
(function () {
  // Kept in sessionStorage so the fake "server" survives page reloads within a test.
  const saved = JSON.parse(sessionStorage.getItem('__fake') || 'null');
  const db = (saved && saved.db) || { spaces: [], space_members: [], profiles: [], locations: [], boxes: [], box_photos: [], items: [], ai_usage: [] };
  const files = new Map((saved && saved.files) || []);
  let session = (saved && saved.session) || null;
  const persist = () => sessionStorage.setItem('__fake', JSON.stringify({ db, session, files: Array.from(files) }));
  window.__fakePersist = persist;
  const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  const listeners = [];
  const now = () => new Date(Date.now() + (window.__clockSkew = (window.__clockSkew || 0) + 1)).toISOString();
  const id = () => crypto.randomUUID();
  const fold = (s) => String(s || '').replace(/İ/g, 'i').toLowerCase().replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c]));
  const emit = (event) => listeners.forEach((cb) => setTimeout(() => cb(event, session), 0));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const ok = (data) => Promise.resolve({ data, error: null });
  const fail = (message) => Promise.resolve({ data: null, error: { message } });
  window.__fakeDb = db;
  window.__fakeFiles = files;
  window.__fakeLog = [];

  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; this.wantRows = false; this.mode = 'many'; this.orders = []; this.rangeFrom = null; }
    select() { if (this.op === 'select') this.op = 'select'; else this.wantRows = true; return this; }
    insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
    update(vals) { this.op = 'update'; this.payload = vals; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
    in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
    order(col) { this.orders.push(col); return this; }
    range(a, b) { this.rangeFrom = [a, b]; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }
    match(r) { return this.filters.every((f) => f(r)); }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      window.__fakeLog.push(`${this.op} ${this.table}`);
      if (window.__fakeFailNext) { window.__fakeFailNext = false; return fail('Failed to fetch'); }
      const rows = db[this.table];
      if (!rows) return fail('no table ' + this.table);
      let out;
      if (this.op === 'select') {
        out = rows.filter((r) => this.match(r));
        this.orders.forEach((c) => out.sort((a, b) => String(a[c]).localeCompare(String(b[c]))));
        if (this.rangeFrom) out = out.slice(this.rangeFrom[0], this.rangeFrom[1] + 1);
      } else if (this.op === 'insert') {
        out = [];
        for (const p of this.payload) {
          const r = Object.assign({ id: id(), created_at: now(), updated_at: now() }, clone(p));
          if (this.table === 'boxes') {
            const sp = db.spaces.find((s) => s.id === r.space_id);
            if (!sp) return fail('Space not found');
            sp.box_counter += 1;
            r.code = r.code || 'B-' + String(sp.box_counter).padStart(4, '0');
            r.cover_photo_id = r.cover_photo_id || null; r.label_printed_at = null; r.location_id = r.location_id || null;
          }
          if (this.table === 'items' || this.table === 'box_photos') {
            const b = db.boxes.find((x) => x.id === r.box_id);
            if (!b) return fail('Box not found');
            r.space_id = b.space_id;
          }
          if (this.table === 'items') { r.quantity = r.quantity || 1; r.category = r.category || 'other'; r.notes = r.notes || null; }
          rows.push(r);
          out.push(r);
        }
      } else if (this.op === 'update') {
        out = rows.filter((r) => this.match(r));
        out.forEach((r) => {
          Object.assign(r, clone(this.payload), { updated_at: now() });
          if (this.table === 'items' && this.payload.box_id) r.space_id = db.boxes.find((b) => b.id === r.box_id).space_id;
        });
      } else if (this.op === 'delete') {
        out = rows.filter((r) => this.match(r));
        const ids = new Set(out.map((r) => r.id));
        db[this.table] = rows.filter((r) => !ids.has(r.id));
        if (this.table === 'boxes') {
          db.items = db.items.filter((i) => !ids.has(i.box_id));
          db.box_photos = db.box_photos.filter((p) => !ids.has(p.box_id));
        }
        if (this.table === 'locations') db.boxes.forEach((b) => { if (ids.has(b.location_id)) b.location_id = null; });
        if (this.table === 'box_photos') db.boxes.forEach((b) => { if (ids.has(b.cover_photo_id)) b.cover_photo_id = null; });
      }
      if (this.op !== 'select') persist();
      const data = (this.op === 'select' || this.wantRows) ? clone(out) : null;
      if (this.mode === 'single') return data && data.length === 1 ? ok(data[0]) : fail('not exactly one row');
      if (this.mode === 'maybe') return ok(data && data.length ? data[0] : null);
      return ok(data);
    }
  }

  const rpcs = {
    bootstrap_me({ p_language, p_space_name }) {
      const uid = session.user.id;
      let prof = db.profiles.find((p) => p.user_id === uid);
      if (!prof) { prof = { user_id: uid, display_name: null, language: p_language, current_space_id: null, onboarded: false }; db.profiles.push(prof); }
      let sp = db.spaces.find((s) => s.owner_id === uid);
      if (!sp) { sp = { id: id(), name: p_space_name, owner_id: uid, box_counter: 0, created_at: now() }; db.spaces.push(sp); db.space_members.push({ space_id: sp.id, user_id: uid, role: 'owner' }); }
      prof.current_space_id = sp.id;
      return { profile: clone(prof), space: clone(sp), role: 'owner' };
    },
    list_boxes({ p_space }) {
      return db.boxes.filter((b) => b.space_id === p_space).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((b) => {
        const photos = db.box_photos.filter((p) => p.box_id === b.id).sort((x, y) => y.created_at.localeCompare(x.created_at));
        const cover = photos.find((p) => p.id === b.cover_photo_id) || photos[0];
        return Object.assign(clone(b), { item_count: db.items.filter((i) => i.box_id === b.id).length, photo_count: photos.length, cover_path: cover ? cover.path : null });
      });
    },
    search_inventory({ p_space, p_query }) {
      const q = fold(p_query.trim());
      if (!q) return [];
      const loc = (b) => db.locations.find((l) => l.id === b.location_id);
      const items = db.items.filter((i) => i.space_id === p_space && fold(i.name + ' ' + (i.notes || '')).includes(q)).map((i) => {
        const b = db.boxes.find((x) => x.id === i.box_id);
        return { kind: 'item', item_id: i.id, item_name: i.name, quantity: i.quantity, category: i.category, box_id: b.id, box_code: b.code, box_name: b.name, location_name: loc(b) ? loc(b).name : null, spot: b.spot, score: 1 };
      });
      const boxes = db.boxes.filter((b) => b.space_id === p_space && fold([b.code, b.name, b.spot, b.notes].join(' ')).includes(q))
        .map((b) => ({ kind: 'box', item_id: null, item_name: null, quantity: null, category: null, box_id: b.id, box_code: b.code, box_name: b.name, location_name: loc(b) ? loc(b).name : null, spot: b.spot, score: 1 }));
      return items.concat(boxes);
    },
    delete_my_account() {
      const uid = session.user.id;
      const spaces = db.spaces.filter((s) => s.owner_id === uid).map((s) => s.id);
      for (const t of ['locations', 'boxes', 'box_photos', 'items']) db[t] = db[t].filter((r) => !spaces.includes(r.space_id));
      db.spaces = db.spaces.filter((s) => s.owner_id !== uid);
      db.profiles = db.profiles.filter((p) => p.user_id !== uid);
      window.__accountDeleted = true;
      return null;
    }
  };

  window.__TEST_SUPABASE__ = {
    auth: {
      onAuthStateChange(cb) { listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return ok({ session }); },
      async signInWithPassword({ email, password }) {
        if (password !== 'secret123') return fail('Invalid login credentials');
        session = { access_token: 'tok', user: { id: '00000000-0000-4000-8000-000000000001', email } };
        persist();
        emit('SIGNED_IN');
        return ok({ session, user: session.user });
      },
      async signUp({ email }) {
        session = { access_token: 'tok', user: { id: '00000000-0000-4000-8000-000000000001', email } };
        persist();
        emit('SIGNED_IN');
        return ok({ session, user: session.user });
      },
      async signOut() { session = null; persist(); emit('SIGNED_OUT'); return { error: null }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async updateUser() { return ok({ user: session && session.user }); }
    },
    from(table) { return new Query(table); },
    async rpc(name, args) {
      window.__fakeLog.push('rpc ' + name);
      if (!rpcs[name]) return fail('no rpc ' + name);
      const result = rpcs[name](args || {});
      persist();
      return ok(result);
    },
    storage: {
      from() {
        return {
          async upload(path, blob) { files.set(path, await toDataUrl(blob)); persist(); return ok({ path }); },
          async createSignedUrls(paths) { return ok(paths.map((p) => ({ path: p, signedUrl: files.get(p) || null, error: files.has(p) ? null : 'missing' }))); },
          async remove(paths) { paths.forEach((p) => files.delete(p)); persist(); return ok(paths); }
        };
      }
    }
  };
})();

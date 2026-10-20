'use strict';

/* =====================================================================
   Config & constants
   ===================================================================== */
const CFG = window.APP_CONFIG || {};
const CONFIGURED = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR-/.test(CFG.SUPABASE_URL + CFG.SUPABASE_ANON_KEY));
const sb = window.__TEST_SUPABASE__ || (CONFIGURED && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null);
const AI_URL = (CFG.SUPABASE_URL || '') + '/functions/v1/box-ai';
const BUCKET = 'box-photos';
const MAX_SCAN_PHOTOS = 4;
const CATEGORIES = ['tools', 'electronics', 'kitchen', 'clothing', 'bedding', 'books', 'documents', 'toys', 'sports', 'seasonal', 'decor', 'cleaning', 'personal', 'hobby', 'other'];

/* =====================================================================
   State & small helpers
   ===================================================================== */
const S = {
  lang: 'en',
  session: null,
  user: null,
  profile: null,
  space: null,
  role: 'owner',
  locations: [],
  boxes: [],
  loaded: false,
  filter: 'all',
  query: '',
  current: null,
  aiLimit: null,
  aiRemaining: null,
  labelSel: null,
  labelSize: 'large',
  sheetOnClose: null,
  installEvt: null,
  recovering: false,
  pendingAuthMessage: null
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clampQty = (n) => { n = Math.round(Number(n)); return Number.isFinite(n) ? Math.max(1, Math.min(999, n)) : 1; };
const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

function t(key, vars) {
  let s = (I18N[S.lang] && I18N[S.lang][key]);
  if (s == null) s = I18N.en[key];
  if (s == null) s = key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}
function tp(base, n, vars) {
  return t(n === 1 ? base + '_one' : base + '_other', Object.assign({ n }, vars || {}));
}
function catLabel(c) { return t('cat_' + (CATEGORIES.includes(c) ? c : 'other')); }
function catOptions(selected) {
  return CATEGORIES.map((c) => `<option value="${c}"${c === selected ? ' selected' : ''}>${esc(catLabel(c))}</option>`).join('');
}
function collator() { return new Intl.Collator(S.lang === 'tr' ? 'tr' : 'en', { sensitivity: 'base', numeric: true }); }

const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4.2-4.2',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8a4 4 0 1 0 0 8',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  printer: 'M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  chevron: 'M9 6l6 6-6 6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14'
};
function icon(name, extra) {
  const sw = name === 'more' ? ' style="stroke-width:3"' : '';
  return `<svg class="i${extra ? ' ' + extra : ''}" viewBox="0 0 24 24" aria-hidden="true"${sw}><path d="${ICONS[name]}"/></svg>`;
}

function debounce(fn, ms) { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; }

function friendlyError(err) {
  if (!navigator.onLine) return t('err_offline');
  if (err && /fetch|network/i.test(String(err.message || err))) return t('err_offline');
  return t('err_generic');
}
function must(res) {
  if (res && res.error) throw res.error;
  return res ? res.data : null;
}

let toastTimer = null;
function toast(msg, opts) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>` + (opts && opts.action ? `<button type="button">${esc(opts.action)}</button>` : '');
  if (opts && opts.action) {
    el.querySelector('button').onclick = () => { el.classList.remove('show'); opts.onAction(); };
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), opts && opts.action ? 6000 : 3200);
}
function showBlocker(text) { $('#blockerText').textContent = text || ''; $('#blocker').hidden = false; }
function hideBlocker() { $('#blocker').hidden = true; }

/* =====================================================================
   Theme & language
   ===================================================================== */
function getThemePref() { try { return localStorage.getItem('bf_theme') || 'system'; } catch (e) { return 'system'; } }
function applyTheme() {
  const pref = getThemePref();
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
function setTheme(pref) {
  try { localStorage.setItem('bf_theme', pref); } catch (e) {}
  applyTheme();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (getThemePref() === 'system') applyTheme(); });

function initialLang() {
  try { const saved = localStorage.getItem('bf_lang'); if (saved === 'en' || saved === 'tr') return saved; } catch (e) {}
  return /^tr\b/i.test(navigator.language || '') ? 'tr' : 'en';
}
function setLang(lang, persist) {
  S.lang = lang === 'tr' ? 'tr' : 'en';
  document.documentElement.lang = S.lang;
  document.title = t('app_name');
  try { localStorage.setItem('bf_lang', S.lang); } catch (e) {}
  renderNavLabels();
  if (persist && S.profile && S.profile.language !== S.lang) {
    S.profile.language = S.lang;
    sb.from('profiles').update({ language: S.lang }).eq('user_id', S.user.id).then(() => {});
  }
}
function renderNavLabels() {
  $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('#tabbar').setAttribute('aria-label', t('app_name'));
}

/* =====================================================================
   Sheets (bottom panels) & confirm
   ===================================================================== */
function openSheet(html, opts) {
  closeSheet();
  $('#toast').classList.remove('show');
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  root.hidden = false;
  document.body.classList.add('sheet-open');
  S.sheetOnClose = (opts && opts.onClose) || null;
  requestAnimationFrame(() => root.classList.add('open'));
  const sheet = $('.sheet', root);
  const focusEl = $('[autofocus]', sheet);
  if (focusEl) setTimeout(() => focusEl.focus(), 60);
  return sheet;
}
function closeSheet() {
  const root = $('#sheetRoot');
  if (root.hidden) return;
  root.classList.remove('open');
  root.hidden = true;
  root.innerHTML = '';
  document.body.classList.remove('sheet-open');
  const cb = S.sheetOnClose;
  S.sheetOnClose = null;
  if (cb) cb();
}
function confirmSheet({ title, body, confirm, danger }) {
  return new Promise((resolve) => {
    openSheet(`
      <h2>${esc(title)}</h2>
      ${body ? `<p class="lead">${esc(body)}</p>` : ''}
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" id="confirmYes">${esc(confirm)}</button>
      </div>`, { onClose: () => resolve(false) });
    $('#confirmYes').onclick = () => { S.sheetOnClose = null; closeSheet(); resolve(true); };
  });
}

/* =====================================================================
   Data
   ===================================================================== */
async function loadLocations() {
  S.locations = must(await sb.from('locations').select('id,name,notes,created_at').eq('space_id', S.space.id).order('name')) || [];
  S.locations.sort((a, b) => collator().compare(a.name, b.name));
}
async function loadBoxes() {
  S.boxes = must(await sb.rpc('list_boxes', { p_space: S.space.id })) || [];
}
async function loadAll() { await Promise.all([loadLocations(), loadBoxes()]); }
async function fetchItems(boxId) {
  return must(await sb.from('items').select('id,box_id,name,category,quantity,notes,source,created_at').eq('box_id', boxId).order('name')) || [];
}
async function fetchPhotos(boxId) {
  return must(await sb.from('box_photos').select('id,box_id,path,created_at').eq('box_id', boxId).order('created_at')) || [];
}
function locationName(id) { const l = S.locations.find((x) => x.id === id); return l ? l.name : ''; }
function placeText(box) {
  const loc = locationName(box.location_id) || t('no_place');
  return box.spot ? `${loc}, ${box.spot}` : loc;
}
function boxUrl(id) {
  return location.origin + location.pathname.replace(/index\.html$/, '') + '?box=' + encodeURIComponent(id);
}

const urlCache = new Map();
async function signedUrls(paths) {
  const now = Date.now();
  const need = Array.from(new Set(paths)).filter((p) => p && !(urlCache.get(p) && urlCache.get(p).exp > now + 60000));
  if (need.length) {
    const res = await sb.storage.from(BUCKET).createSignedUrls(need, 3600);
    if (!res.error && res.data) {
      res.data.forEach((d) => { if (d.signedUrl) urlCache.set(d.path, { url: d.signedUrl, exp: now + 3600 * 1000 }); });
    }
  }
  return (p) => (urlCache.get(p) ? urlCache.get(p).url : null);
}
async function hydrateImages(root) {
  const imgs = $$('img[data-path]', root);
  if (!imgs.length) return;
  try {
    const get = await signedUrls(imgs.map((i) => i.dataset.path));
    imgs.forEach((img) => {
      const u = get(img.dataset.path);
      if (!u) return;
      img.onload = () => img.classList.add('loaded');
      img.src = u;
    });
  } catch (e) { /* photos are optional */ }
}

/* ---------- images ---------- */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
async function loadImageSource(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall back */ }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
// Shrinks a phone photo to max 1280px JPEG (~150–300 KB): cheaper storage and AI.
async function prepareImage(file, maxSide) {
  maxSide = maxSide || 1280;
  const src = await loadImageSource(file);
  const w = src.width, h = src.height;
  if (!w || !h) throw new Error('bad image');
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  canvas.getContext('2d').drawImage(src, 0, 0, cw, ch);
  if (src.close) src.close();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
  if (!blob) throw new Error('encode failed');
  return { blob, base64: await blobToBase64(blob), mime: 'image/jpeg', url: URL.createObjectURL(blob) };
}
async function uploadPhotos(box, prepared) {
  const rows = [];
  for (const p of prepared) {
    const path = `${S.space.id}/${box.id}/${uuid()}.jpg`;
    must(await sb.storage.from(BUCKET).upload(path, p.blob, { contentType: 'image/jpeg', upsert: false }));
    rows.push({ box_id: box.id, path });
  }
  const inserted = must(await sb.from('box_photos').insert(rows).select('id,box_id,path,created_at')) || [];
  if (!box.cover_photo_id && inserted.length) {
    must(await sb.from('boxes').update({ cover_photo_id: inserted[0].id }).eq('id', box.id));
    box.cover_photo_id = inserted[0].id;
  }
  return inserted;
}
async function removeFiles(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100));
  }
}

/* ---------- AI ---------- */
async function callBoxAI(body) {
  let res, json = null;
  try {
    const sess = await sb.auth.getSession();
    const token = sess && sess.data && sess.data.session ? sess.data.session.access_token : '';
    res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: CFG.SUPABASE_ANON_KEY || '' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const err = new Error('network'); err.code = 'network'; throw err;
  }
  try { json = await res.json(); } catch (e) { json = null; }
  if (json && typeof json.remaining === 'number') { S.aiRemaining = json.remaining; S.aiLimit = json.limit; }
  if (!res.ok) {
    const err = new Error((json && json.error) || ('http_' + res.status));
    err.code = (json && json.error) || 'http';
    throw err;
  }
  return json;
}
async function refreshUsage() {
  try { await callBoxAI({ action: 'usage' }); } catch (e) { /* not critical */ }
}
function usageLine() {
  return S.aiLimit != null ? t('scans_left', { n: S.aiRemaining, limit: S.aiLimit }) : '';
}

/* =====================================================================
   Start-up, auth
   ===================================================================== */
function renderSetupNeeded() {
  $('#view').innerHTML = `
    <div class="center-screen"><div>
      <section class="label-hero kraft" style="width:100%"><div class="code-xl">B-0000</div></section>
      <h1 class="section-title">${t('setup_title')}</h1>
      <p class="muted">${t('setup_body')}</p>
    </div></div>`;
}
function renderLoading() {
  $('#view').innerHTML = `<div class="center-screen"><div><div class="spinner"></div><span>${t('loading')}</span></div></div>`;
}
function renderFatal(err, retry) {
  $('#view').innerHTML = `
    <div class="center-screen"><div>
      <h1 class="section-title">${t('err_boot')}</h1>
      <p class="muted">${esc(friendlyError(err))}</p>
      <button class="btn primary" id="fatalRetry">${t('retry')}</button>
    </div></div>`;
  $('#fatalRetry').onclick = retry;
}

async function start() {
  setLang(initialLang(), false);
  if (!sb) { renderSetupNeeded(); return; }
  // Opened from a "set a new password" email: show the password form, not the app.
  if (/type=recovery/.test(location.hash + location.search)) S.recovering = true;
  sb.auth.onAuthStateChange((event, session) => { setTimeout(() => onAuth(event, session), 0); });
}

let booting = false;
async function onAuth(event, session) {
  if (event === 'PASSWORD_RECOVERY') { S.recovering = true; S.session = session; renderNewPassword(); return; }
  if (!session) {
    resetSignedOut();
    renderAuth('in', S.pendingAuthMessage);
    S.pendingAuthMessage = null;
    return;
  }
  S.session = session;
  if (S.recovering) { renderNewPassword(); return; }
  if (S.loaded && S.user && S.user.id === session.user.id) return;
  if (booting) return;
  S.user = session.user;
  await bootstrap();
}
async function bootstrap() {
  booting = true;
  renderLoading();
  try {
    const data = must(await sb.rpc('bootstrap_me', { p_language: S.lang, p_space_name: t('default_space') }));
    S.profile = data.profile;
    S.space = data.space;
    S.role = data.role;
    if (S.profile && S.profile.language && S.profile.language !== S.lang) setLang(S.profile.language, false);
    await loadAll();
    if (S.recovering) return;
    S.loaded = true;
    document.body.classList.add('signed-in');
    const params = new URLSearchParams(location.search);
    const boxParam = params.get('box');
    if (boxParam) history.replaceState(null, '', location.pathname + '#/box/' + encodeURIComponent(boxParam));
    route();
  } catch (e) {
    console.error(e);
    renderFatal(e, bootstrap);
  } finally {
    booting = false;
  }
}
function resetSignedOut() {
  Object.assign(S, { session: null, user: null, profile: null, space: null, locations: [], boxes: [], loaded: false, filter: 'all', query: '', current: null, aiLimit: null, aiRemaining: null, labelSel: null });
  urlCache.clear();
  closeSheet();
  closeScanner();
  document.body.classList.remove('signed-in');
  document.body.dataset.page = 'auth';
}

function renderAuth(mode, message) {
  document.body.dataset.page = 'auth';
  const isIn = mode === 'in';
  $('#view').innerHTML = `
    <div class="auth">
      <div class="auth-top">
        <div class="seg" role="group" aria-label="${t('language')}">
          <button type="button" data-auth-lang="en" aria-pressed="${S.lang === 'en'}">English</button>
          <button type="button" data-auth-lang="tr" aria-pressed="${S.lang === 'tr'}">Türkçe</button>
        </div>
      </div>
      <section class="label-hero kraft auth-hero">
        <div class="code-xl">${t('app_name')}</div>
        <p class="hero-tag">${t('tagline')}</p>
      </section>
      <form id="authForm" class="auth-form" novalidate>
        <h1 class="auth-title">${isIn ? t('auth_title_in') : t('auth_title_up')}</h1>
        <label class="field"><span>${t('email')}</span><input class="input" type="email" name="email" autocomplete="email" inputmode="email" required></label>
        <label class="field"><span>${t('password')}</span><input class="input" type="password" name="password" autocomplete="${isIn ? 'current-password' : 'new-password'}" minlength="6" required></label>
        <div class="error" id="authErr" hidden></div>
        <div class="note" id="authNote" ${message ? '' : 'hidden'}>${esc(message || '')}</div>
        <button class="btn primary big" type="submit">${isIn ? t('sign_in') : t('create_account')}</button>
        ${isIn ? `<button type="button" class="link-btn auth-forgot" id="forgotBtn">${t('forgot_password')}</button>` : ''}
      </form>
      <p class="auth-switch">${isIn ? t('no_account') : t('have_account')} <button type="button" class="link-btn" id="authSwitch">${isIn ? t('create_account') : t('sign_in')}</button></p>
    </div>`;

  const form = $('#authForm');
  const err = $('#authErr');
  const note = $('#authNote');
  const showErr = (m) => { err.textContent = m; err.hidden = false; note.hidden = true; };
  $$('[data-auth-lang]').forEach((b) => b.onclick = () => { setLang(b.dataset.authLang, false); renderAuth(mode); });
  $('#authSwitch').onclick = () => renderAuth(isIn ? 'up' : 'in');
  if (isIn) {
    $('#forgotBtn').onclick = async () => {
      const email = form.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { showErr(t('reset_need_email')); return; }
      const res = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (res.error) { showErr(friendlyError(res.error)); return; }
      err.hidden = true; note.textContent = t('reset_sent'); note.hidden = false;
    };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!/^\S+@\S+\.\S+$/.test(email)) { showErr(t('err_email')); return; }
    if (password.length < 6) { showErr(t('err_password_short')); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      if (isIn) {
        const res = await sb.auth.signInWithPassword({ email, password });
        if (res.error) { showErr(/invalid|credentials/i.test(res.error.message) ? t('err_auth') : friendlyError(res.error)); }
      } else {
        const res = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (res.error) { showErr(res.error.message && /password/i.test(res.error.message) ? t('err_password_short') : friendlyError(res.error)); }
        else if (!res.data.session) { renderAuth('in', t('confirm_email')); return; }
      }
    } catch (ex) {
      showErr(friendlyError(ex));
    } finally {
      if (document.body.contains(btn)) btn.disabled = false;
    }
  };
}

function renderNewPassword() {
  document.body.classList.remove('signed-in');
  $('#view').innerHTML = `
    <div class="auth">
      <section class="label-hero kraft auth-hero"><div class="code-xl">${t('app_name')}</div></section>
      <form id="pwForm" class="auth-form" novalidate>
        <h1 class="auth-title">${t('new_password_title')}</h1>
        <label class="field"><span>${t('new_password')}</span><input class="input" type="password" name="password" autocomplete="new-password" minlength="6" required autofocus></label>
        <div class="error" id="pwErr" hidden></div>
        <button class="btn primary big" type="submit">${t('save_password')}</button>
      </form>
    </div>`;
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const pw = e.target.password.value;
    const errEl = $('#pwErr');
    if (pw.length < 6) { errEl.textContent = t('err_password_short'); errEl.hidden = false; return; }
    const res = await sb.auth.updateUser({ password: pw });
    if (res.error) { errEl.textContent = friendlyError(res.error); errEl.hidden = false; return; }
    toast(t('password_saved'));
    S.recovering = false;
    history.replaceState(null, '', location.pathname);
    S.user = res.data.user || (S.session && S.session.user);
    await bootstrap();
  };
}

/* =====================================================================
   Router
   ===================================================================== */
function currentRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/');
  return { name: parts[0] || '', id: decodeURIComponent(parts[1] || '') };
}
function route() {
  if (!S.loaded) return;
  closeSheet();
  const r = currentRoute();
  const page = ['places', 'labels', 'me', 'box'].includes(r.name) ? r.name : 'boxes';
  document.body.dataset.page = page;
  $$('#tabbar .tab[data-page]').forEach((a) => {
    if (a.dataset.page === page || (page === 'box' && a.dataset.page === 'boxes')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (page === 'box') renderBox(r.id);
  else if (page === 'places') renderPlaces();
  else if (page === 'labels') renderLabels();
  else if (page === 'me') renderMe();
  else renderBoxes();
}
window.addEventListener('hashchange', route);

/* =====================================================================
   Boxes (home)
   ===================================================================== */
function boxTile(b) {
  return `
    <a class="tile" href="#/box/${encodeURIComponent(b.id)}">
      <div class="tile-label kraft"><span class="code">${esc(b.code)}</span></div>
      <div class="tile-photo">
        ${b.cover_path ? `<img data-path="${esc(b.cover_path)}" alt="">` : `<div class="ph">${icon('box')}</div>`}
      </div>
      <div class="tile-body">
        <div class="tile-name">${esc(b.name)}</div>
        <div class="tile-meta">${tp('n_items', b.item_count || 0)}</div>
        <div class="tile-place">${icon('pin')}<span>${esc(placeText(b))}</span></div>
      </div>
    </a>`;
}
function filteredBoxes() {
  if (S.filter === 'all') return S.boxes;
  if (S.filter === 'none') return S.boxes.filter((b) => !b.location_id);
  return S.boxes.filter((b) => b.location_id === S.filter);
}
function renderBoxes() {
  const items = S.boxes.reduce((n, b) => n + (b.item_count || 0), 0);
  $('#view').innerHTML = `
    <header class="page-head">
      <h1 class="page-title">${esc(S.space.name)}</h1>
      <p class="page-sub">${tp('n_boxes', S.boxes.length)}, ${tp('n_items', items)}</p>
    </header>
    <div class="search" role="search">
      ${icon('search')}
      <input id="q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${t('search_ph')}" aria-label="${t('search_label')}" value="${esc(S.query)}">
      <button type="button" class="icon-btn" data-act="clear-search" aria-label="${t('clear')}" ${S.query ? '' : 'hidden'}>${icon('close')}</button>
    </div>
    <div id="homeBody"></div>
    <button type="button" class="fab" data-act="new-box">${icon('plus')}<span>${t('new_box')}</span></button>`;
  const q = $('#q');
  q.addEventListener('input', () => {
    S.query = q.value;
    $('[data-act="clear-search"]').hidden = !q.value;
    runSearch();
  });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; S.query = ''; renderHomeBody(); } });
  renderHomeBody();
}
function renderHomeBody() {
  const body = $('#homeBody');
  if (!body) return;
  $('[data-act="clear-search"]') && ($('[data-act="clear-search"]').hidden = !S.query.trim());
  if (S.query.trim()) { runSearchNow(); return; }
  if (!S.boxes.length) {
    body.innerHTML = `
      <div class="empty">
        <h2>${t('empty_boxes_title')}</h2>
        <p>${t('empty_boxes_body')}</p>
        <button type="button" class="btn primary" data-act="new-box">${icon('plus')}${t('create_first_box')}</button>
      </div>`;
    return;
  }
  if (S.filter !== 'all' && S.filter !== 'none' && !S.locations.some((l) => l.id === S.filter)) S.filter = 'all';
  const noPlace = S.boxes.filter((b) => !b.location_id).length;
  const chip = (id, label, n) => `<button type="button" class="chip" data-act="filter" data-id="${esc(id)}" aria-pressed="${S.filter === id}">${esc(label)}<span class="n">${n}</span></button>`;
  const chips = S.locations.length
    ? `<div class="chips">${chip('all', t('filter_all'), S.boxes.length)}${S.locations.map((l) => chip(l.id, l.name, S.boxes.filter((b) => b.location_id === l.id).length)).join('')}${noPlace ? chip('none', t('no_place'), noPlace) : ''}</div>`
    : '';
  const list = filteredBoxes();
  body.innerHTML = chips + (list.length ? `<div class="grid">${list.map(boxTile).join('')}</div>` : `<div class="empty"><p>${t('empty_filter')}</p></div>`);
  hydrateImages(body);
}

let searchSeq = 0;
const runSearch = debounce(() => runSearchNow(), 220);
async function runSearchNow() {
  const body = $('#homeBody');
  const q = S.query.trim();
  if (!body) return;
  if (!q) { renderHomeBody(); return; }
  const seq = ++searchSeq;
  let rows;
  try {
    rows = must(await sb.rpc('search_inventory', { p_space: S.space.id, p_query: q })) || [];
  } catch (e) {
    if (seq === searchSeq) body.innerHTML = `<p class="results-head">${esc(friendlyError(e))}</p>`;
    return;
  }
  if (seq !== searchSeq || !$('#homeBody')) return;
  if (!rows.length) {
    body.innerHTML = `<div class="empty"><p>${esc(t('results_none', { q }))}</p></div>`;
    return;
  }
  body.innerHTML = `
    <ul class="list results">
      ${rows.map((r) => {
        const box = S.boxes.find((b) => b.id === r.box_id);
        const where = box ? placeText(box) : (r.location_name || t('no_place')) + (r.spot ? ', ' + r.spot : '');
        const title = r.kind === 'item'
          ? `${esc(r.item_name)}${r.quantity > 1 ? ` <span class="qty">×${r.quantity}</span>` : ''}`
          : `${esc(r.box_name)}`;
        const sub = r.kind === 'item'
          ? `${esc(r.box_name)}, ${esc(where)}`
          : `<span class="result-kind">${icon('box')}${t('result_box')}</span> ${esc(where)}`;
        return `<li><a class="result" href="#/box/${encodeURIComponent(r.box_id)}">
          <span class="result-main"><span class="result-name">${title}</span><span class="result-where">${sub}</span></span>
          <span class="code-chip kraft">${esc(r.box_code)}</span>
        </a></li>`;
      }).join('')}
    </ul>`;
}

/* =====================================================================
   Box page
   ===================================================================== */
function groupItems(items) {
  const coll = collator();
  const groups = CATEGORIES.map((c) => ({ c, items: items.filter((i) => (CATEGORIES.includes(i.category) ? i.category : 'other') === c) }))
    .filter((g) => g.items.length);
  groups.forEach((g) => g.items.sort((a, b) => coll.compare(a.name, b.name)));
  return groups;
}
function boxPageHtml(box, items, photos) {
  const itemsHtml = items == null
    ? `<div class="center-screen" style="min-height:120px"><div class="spinner"></div></div>`
    : (items.length
      ? groupItems(items).map((g) => `
          <div class="group">
            <h3 class="group-name">${esc(catLabel(g.c))}</h3>
            <ul class="list">
              ${g.items.map((it) => `<li><button type="button" class="item-row" data-act="edit-item" data-id="${esc(it.id)}"><span class="name">${esc(it.name)}</span>${it.quantity > 1 ? `<span class="qty">×${it.quantity}</span>` : ''}</button></li>`).join('')}
            </ul>
          </div>`).join('')
      : `<div class="empty" style="margin-top:8px"><p>${t('items_empty')}</p></div>`);
  const photosHtml = (photos || []).map((p) => `
      <button type="button" class="thumb" data-act="view-photo" data-id="${esc(p.id)}" aria-label="${t('photo')}">
        <img data-path="${esc(p.path)}" alt="">
        ${p.id === box.cover_photo_id ? `<span class="badge">${t('cover')}</span>` : ''}
      </button>`).join('');
  return `
    <div class="bar">
      <a class="icon-btn" href="#/" aria-label="${t('back')}">${icon('back')}</a>
      <button type="button" class="icon-btn" data-act="box-menu" aria-label="${t('more')}">${icon('more')}</button>
    </div>
    <section class="label-hero kraft">
      <div class="code-xl">${esc(box.code)}</div>
      <h1 class="hero-name">${esc(box.name)}</h1>
      <p class="hero-place">${icon('pin')}<span>${esc(placeText(box))}</span></p>
      <button type="button" class="hero-edit" data-act="edit-box" aria-label="${t('edit_box')}" title="${t('edit_box')}">${icon('edit')}</button>
    </section>
    ${box.notes ? `<p class="box-notes">${esc(box.notes)}</p>` : ''}
    <div class="strip">
      ${photosHtml}
      <button type="button" class="thumb add" data-act="add-photo">${icon('image')}<span>${t('add_photo')}</span></button>
    </div>
    <button type="button" class="btn primary big" data-act="scan-contents">${icon('camera')}<span>${t('scan_contents')}</span></button>
    <section class="items">
      <h2 class="section-title">${items == null ? '&nbsp;' : tp('n_items', items.length)}</h2>
      ${itemsHtml}
      <form class="quick-add" id="quickAdd" autocomplete="off">
        <label class="sr-only" for="quickAddInput">${t('quick_add_label')}</label>
        <input class="input" id="quickAddInput" placeholder="${t('quick_add_ph')}" enterkeyhint="done" maxlength="500">
        <button class="btn" type="submit">${t('add')}</button>
      </form>
      <p class="hint">${t('quick_add_hint')}</p>
    </section>
    <input type="file" id="photoOnlyInput" accept="image/*" multiple hidden>`;
}
function renderNotFound() {
  $('#view').innerHTML = `
    <div class="bar"><a class="icon-btn" href="#/" aria-label="${t('back')}">${icon('back')}</a></div>
    <div class="empty"><p>${t('box_not_found')}</p><p><a class="btn" href="#/">${t('go_home')}</a></p></div>`;
}
async function renderBox(id) {
  const view = $('#view');
  let box = S.boxes.find((b) => b.id === id);
  if (box) view.innerHTML = boxPageHtml(box, null, null);
  else renderLoading();
  let items, photos;
  try {
    if (!box) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) { renderNotFound(); return; }
      box = must(await sb.from('boxes').select('*').eq('id', id).maybeSingle());
      if (!box) { renderNotFound(); return; }
    }
    [items, photos] = await Promise.all([fetchItems(id), fetchPhotos(id)]);
  } catch (e) {
    if (currentRoute().id === id) renderFatal(e, () => renderBox(id));
    return;
  }
  if (currentRoute().name !== 'box' || currentRoute().id !== id) return;
  S.current = { box, items, photos };
  paintBox();
}
function paintBox() {
  const { box, items, photos } = S.current;
  const view = $('#view');
  view.innerHTML = boxPageHtml(box, items, photos);
  hydrateImages(view);
  $('#quickAdd').onsubmit = (e) => { e.preventDefault(); quickAdd(); };
  $('#photoOnlyInput').onchange = (e) => addPhotosOnly(Array.from(e.target.files || []));
}
async function refreshBox() {
  if (!S.current) return;
  const id = S.current.box.id;
  try {
    const [items, photos] = await Promise.all([fetchItems(id), fetchPhotos(id), loadBoxes()]);
    const fresh = S.boxes.find((b) => b.id === id);
    if (fresh) S.current.box = fresh;
    S.current.items = items;
    S.current.photos = photos;
    if (currentRoute().name === 'box' && currentRoute().id === id) paintBox();
  } catch (e) { toast(friendlyError(e)); }
}

function parseQuickAdd(text) {
  return text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((part) => {
    let m = part.match(/^(\d{1,3})\s*(?:x|×|adet|tane|pcs)?\s+(.+)$/i);
    if (m) return { name: m[2].trim(), quantity: +m[1] };
    m = part.match(/^(.+?)\s*(?:x|×)\s*(\d{1,3})$/i);
    if (m) return { name: m[1].trim(), quantity: +m[2] };
    return { name: part, quantity: 1 };
  }).filter((x) => x.name).map((x) => ({ name: x.name.slice(0, 80), quantity: clampQty(x.quantity) }));
}
async function quickAdd() {
  const input = $('#quickAddInput');
  const list = parseQuickAdd(input.value);
  if (!list.length) return;
  const box = S.current.box;
  input.disabled = true;
  try {
    must(await sb.from('items').insert(list.map((x) => ({ box_id: box.id, name: x.name, quantity: x.quantity, category: 'other', source: 'manual' }))));
    toast(tp('added_n', list.length));
    await refreshBox();
    const again = $('#quickAddInput');
    if (again) again.focus();
  } catch (e) {
    input.disabled = false;
    toast(friendlyError(e));
  }
}
async function addPhotosOnly(files) {
  if (!files.length) return;
  showBlocker(t('saving'));
  try {
    const prepared = [];
    for (const f of files.slice(0, 8)) prepared.push(await prepareImage(f));
    await uploadPhotos(S.current.box, prepared);
    prepared.forEach((p) => URL.revokeObjectURL(p.url));
    toast(tp('photo_added', prepared.length));
    await refreshBox();
  } catch (e) {
    console.error(e);
    toast(e && e.message === 'bad image' ? t('err_photo') : friendlyError(e));
  } finally {
    hideBlocker();
  }
}

/* ---------- box form (new / edit) ---------- */
function openBoxForm(box) {
  const isNew = !box;
  const defLoc = box ? box.location_id : (S.filter !== 'all' && S.filter !== 'none' ? S.filter : '');
  const opts = `<option value="">${t('no_place')}</option>` +
    S.locations.map((l) => `<option value="${esc(l.id)}"${l.id === defLoc ? ' selected' : ''}>${esc(l.name)}</option>`).join('') +
    `<option value="__new">${t('new_place_opt')}</option>`;
  const sheet = openSheet(`
    <h2>${isNew ? t('new_box') : t('edit_box')}</h2>
    <form id="boxForm" novalidate>
      <label class="field"><span>${t('box_name')}</span><input class="input" name="name" maxlength="80" required placeholder="${t('box_name_ph')}" value="${esc(box ? box.name : '')}" ${isNew ? 'autofocus' : ''}></label>
      <label class="field"><span>${t('place')}</span><select class="input" name="location">${opts}</select></label>
      <label class="field" id="newPlaceField" hidden><span>${t('new_place_name')}</span><input class="input" name="newPlace" maxlength="60" placeholder="${t('place_name_ph')}"></label>
      <label class="field"><span>${t('spot')} <span class="opt">${t('optional')}</span></span><input class="input" name="spot" maxlength="60" placeholder="${t('spot_ph')}" value="${esc(box ? box.spot || '' : '')}"></label>
      <label class="field"><span>${t('notes')} <span class="opt">${t('optional')}</span></span><textarea class="input" name="notes" rows="2" maxlength="500">${esc(box ? box.notes || '' : '')}</textarea></label>
      <div class="error" id="boxErr" hidden></div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
        <button type="submit" class="btn primary">${isNew ? t('create_box') : t('save')}</button>
      </div>
    </form>`);
  const form = $('#boxForm', sheet);
  const sel = form.location;
  const toggleNew = () => { const on = sel.value === '__new'; $('#newPlaceField').hidden = !on; if (on) form.newPlace.focus(); };
  sel.onchange = toggleNew;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const errEl = $('#boxErr');
    const name = form.name.value.trim();
    if (!name) { errEl.textContent = t('err_name_required'); errEl.hidden = false; form.name.focus(); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      let locationId = sel.value || null;
      if (locationId === '__new') {
        const pn = form.newPlace.value.trim();
        if (!pn) { errEl.textContent = t('err_name_required'); errEl.hidden = false; form.newPlace.focus(); btn.disabled = false; return; }
        const loc = must(await sb.from('locations').insert({ space_id: S.space.id, name: pn }).select('id,name,notes,created_at').single());
        S.locations.push(loc);
        S.locations.sort((a, b) => collator().compare(a.name, b.name));
        locationId = loc.id;
      }
      const vals = { name, location_id: locationId, spot: form.spot.value.trim() || null, notes: form.notes.value.trim() || null };
      if (isNew) {
        const created = must(await sb.from('boxes').insert(Object.assign({ space_id: S.space.id }, vals)).select('id,code').single());
        await loadBoxes();
        closeSheet();
        toast(t('box_created', { code: created.code }));
        location.hash = '#/box/' + created.id;
      } else {
        must(await sb.from('boxes').update(vals).eq('id', box.id));
        closeSheet();
        toast(t('saved'));
        await refreshBox();
      }
    } catch (ex) {
      console.error(ex);
      errEl.textContent = friendlyError(ex);
      errEl.hidden = false;
      btn.disabled = false;
    }
  };
}

function openBoxMenu() {
  const box = S.current.box;
  openSheet(`
    <h2>${esc(box.code)}</h2>
    <ul class="menu">
      <li><button type="button" data-act="edit-box">${icon('edit')}${t('edit_box')}</button></li>
      <li><button type="button" data-act="print-box-label">${icon('printer')}${t('print_label')}</button></li>
      <li><button type="button" class="danger" data-act="delete-box">${icon('trash')}${t('delete_box')}</button></li>
    </ul>`);
}
async function deleteBox() {
  const box = S.current.box;
  const ok = await confirmSheet({ title: t('delete_box_q', { code: box.code }), body: t('delete_box_body'), confirm: t('delete_box'), danger: true });
  if (!ok) return;
  showBlocker(t('deleting'));
  try {
    const photos = S.current.photos || [];
    if (photos.length) await removeFiles(photos.map((p) => p.path));
    must(await sb.from('boxes').delete().eq('id', box.id));
    await loadBoxes();
    S.current = null;
    toast(t('deleted'));
    location.hash = '#/';
  } catch (e) {
    toast(friendlyError(e));
  } finally {
    hideBlocker();
  }
}

/* ---------- AI scan ---------- */
function openScanSheet() {
  const box = S.current.box;
  const st = { shots: [], hint: '', phase: 'pick', found: [], savePhotos: true, photosSaved: false, error: '', preparing: false };
  const revokeAll = () => st.shots.forEach((s) => URL.revokeObjectURL(s.url));

  const pickHtml = () => `
    <h2>${t('scan_title')}</h2>
    <p class="lead">${t('scan_intro')}</p>
    <div class="shots">
      ${[0, 1, 2, 3].map((i) => st.shots[i]
        ? `<div class="shot"><img src="${st.shots[i].url}" alt=""><button type="button" class="x" data-remove="${i}" aria-label="${t('delete_photo')}">${icon('close')}</button></div>`
        : `<div class="shot empty"></div>`).join('')}
    </div>
    <div class="pick-row">
      <button type="button" class="btn" id="scanCamBtn" ${st.shots.length >= MAX_SCAN_PHOTOS || st.preparing ? 'disabled' : ''}>${icon('camera')}<span>${t('take_photo')}</span></button>
      <button type="button" class="btn" id="scanPickBtn" ${st.shots.length >= MAX_SCAN_PHOTOS || st.preparing ? 'disabled' : ''}>${icon('image')}<span>${t('choose_photos')}</span></button>
    </div>
    <input type="file" id="scanCam" accept="image/*" capture="environment" hidden>
    <input type="file" id="scanPick" accept="image/*" multiple hidden>
    <label class="field" style="margin:16px 0 0"><span>${t('hint_label')} <span class="opt">${t('optional')}</span></span>
      <input class="input" id="scanHint" maxlength="300" placeholder="${t('hint_ph')}" value="${esc(st.hint)}"></label>
    <div class="error" ${st.error ? '' : 'hidden'}>${esc(st.error)}</div>
    <p class="scans-left" id="scansLeft">${esc(usageLine())}</p>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="scanGo" ${st.shots.length && !st.preparing ? '' : 'disabled'}>${t('find_items')}</button>
    </div>`;

  const reviewHtml = () => {
    const on = st.found.filter((f) => f.on && f.name.trim()).length;
    return `
      <h2>${tp('review_found', st.found.length)}</h2>
      <p class="lead">${st.found.length ? t('review_hint') : t('review_none')}</p>
      <ul class="review">
        ${st.found.map((it, i) => `
          <li class="${it.on ? '' : 'off'}" data-i="${i}">
            <input type="checkbox" class="chk" ${it.on ? 'checked' : ''} aria-label="${esc(it.name)}">
            <input class="input r-name" value="${esc(it.name)}" maxlength="80" aria-label="${t('item_name')}">
            <input class="input r-qty" type="number" inputmode="numeric" min="1" max="999" value="${it.quantity}" aria-label="${t('quantity')}">
            <select class="input r-cat" aria-label="${t('category')}">${catOptions(it.category)}</select>
          </li>`).join('')}
      </ul>
      <label class="check-line"><input type="checkbox" id="savePhotos" ${st.savePhotos ? 'checked' : ''} ${st.photosSaved ? 'disabled' : ''}>${t('save_photos_too')}</label>
      <div class="error" ${st.error ? '' : 'hidden'}>${esc(st.error)}</div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" id="scanBack">${t('photos_back')}</button>
        <button type="button" class="btn primary" id="scanAdd" ${on || (st.savePhotos && !st.photosSaved) ? '' : 'disabled'}>${on ? tp('add_n', on) : t('save_photos_only')}</button>
      </div>`;
  };

  const busyHtml = (text) => `<div class="reading"><div class="spinner"></div><span>${esc(text)}</span></div>`;

  function draw() {
    const sheet = $('#sheetRoot .sheet');
    if (!sheet) return;
    if (st.phase === 'pick') sheet.innerHTML = pickHtml();
    else if (st.phase === 'review') sheet.innerHTML = reviewHtml();
    else sheet.innerHTML = busyHtml(st.phase === 'reading' ? t('reading') : t('saving'));
    bind(sheet);
  }

  async function addFiles(files) {
    const room = MAX_SCAN_PHOTOS - st.shots.length;
    if (!files.length || room <= 0) return;
    st.hint = ($('#scanHint') || {}).value || st.hint;
    st.preparing = true; st.error = ''; draw();
    for (const f of files.slice(0, room)) {
      try { st.shots.push(await prepareImage(f)); } catch (e) { st.error = t('err_photo'); }
    }
    st.preparing = false; draw();
  }

  function bind(sheet) {
    if (st.phase === 'pick') {
      $('#scanCamBtn', sheet).onclick = () => $('#scanCam', sheet).click();
      $('#scanPickBtn', sheet).onclick = () => $('#scanPick', sheet).click();
      $('#scanCam', sheet).onchange = (e) => addFiles(Array.from(e.target.files || []));
      $('#scanPick', sheet).onchange = (e) => addFiles(Array.from(e.target.files || []));
      $$('[data-remove]', sheet).forEach((b) => b.onclick = () => {
        const i = +b.dataset.remove;
        URL.revokeObjectURL(st.shots[i].url);
        st.shots.splice(i, 1);
        st.hint = $('#scanHint', sheet).value;
        draw();
      });
      $('#scanHint', sheet).oninput = (e) => { st.hint = e.target.value; };
      $('#scanGo', sheet).onclick = identify;
    }
    if (st.phase === 'review') {
      $$('.review li', sheet).forEach((li) => {
        const it = st.found[+li.dataset.i];
        $('.chk', li).onchange = (e) => { it.on = e.target.checked; li.classList.toggle('off', !it.on); updateAddBtn(sheet); };
        $('.r-name', li).oninput = (e) => { it.name = e.target.value; updateAddBtn(sheet); };
        $('.r-qty', li).onchange = (e) => { it.quantity = clampQty(e.target.value); e.target.value = it.quantity; };
        $('.r-cat', li).onchange = (e) => { it.category = e.target.value; };
      });
      $('#savePhotos', sheet).onchange = (e) => { st.savePhotos = e.target.checked; updateAddBtn(sheet); };
      $('#scanBack', sheet).onclick = () => { st.phase = 'pick'; st.error = ''; draw(); };
      $('#scanAdd', sheet).onclick = save;
    }
  }
  function updateAddBtn(sheet) {
    const on = st.found.filter((f) => f.on && f.name.trim()).length;
    const btn = $('#scanAdd', sheet);
    btn.textContent = on ? tp('add_n', on) : t('save_photos_only');
    btn.disabled = !(on || (st.savePhotos && !st.photosSaved));
  }

  async function identify() {
    st.phase = 'reading'; st.error = ''; draw();
    try {
      const res = await callBoxAI({ action: 'identify', language: S.lang, hint: st.hint.trim(), images: st.shots.map((s) => ({ mime: s.mime, data: s.base64 })) });
      st.found = (res.items || []).map((it) => ({ name: it.name, quantity: clampQty(it.quantity), category: CATEGORIES.includes(it.category) ? it.category : 'other', on: true }));
      st.phase = 'review';
    } catch (e) {
      st.phase = 'pick';
      st.error = e.code === 'daily_limit' ? t('err_daily_limit', { limit: S.aiLimit || 20 })
        : e.code === 'network' ? t('err_offline') : t('err_ai');
    }
    draw();
  }

  async function save() {
    const chosen = st.found.filter((f) => f.on && f.name.trim());
    st.phase = 'saving'; st.error = ''; draw();
    try {
      if (st.savePhotos && !st.photosSaved && st.shots.length) {
        await uploadPhotos(box, st.shots);
        st.photosSaved = true;
      }
      if (chosen.length) {
        must(await sb.from('items').insert(chosen.map((f) => ({ box_id: box.id, name: f.name.trim().slice(0, 80), quantity: clampQty(f.quantity), category: f.category, source: 'ai' }))));
      }
      closeSheet();
      toast(chosen.length ? tp('added_n', chosen.length) : tp('photo_added', st.shots.length));
      refreshBox();
    } catch (e) {
      console.error(e);
      st.phase = 'review';
      st.error = friendlyError(e);
      draw();
    }
  }

  openSheet('', { onClose: revokeAll });
  draw();
  refreshUsage().then(() => { const el = $('#scansLeft'); if (el) el.textContent = usageLine(); });
}

/* ---------- photo viewer ---------- */
function openPhotoViewer(photoId) {
  const { box, photos } = S.current;
  const p = photos.find((x) => x.id === photoId);
  if (!p) return;
  const isCover = box.cover_photo_id === p.id;
  const sheet = openSheet(`
    <div class="viewer"><img data-path="${esc(p.path)}" alt="${t('photo')}"></div>
    <div class="sheet-actions">
      <button type="button" class="btn" id="photoDel">${icon('trash')}<span>${t('delete_photo')}</span></button>
      <button type="button" class="btn" id="photoCover" ${isCover ? 'disabled' : ''}>${isCover ? t('cover') : t('use_as_cover')}</button>
      <button type="button" class="btn primary" data-act="sheet-close">${t('close')}</button>
    </div>`);
  hydrateImages(sheet);
  $('#photoCover', sheet).onclick = async () => {
    try {
      must(await sb.from('boxes').update({ cover_photo_id: p.id }).eq('id', box.id));
      closeSheet();
      await refreshBox();
    } catch (e) { toast(friendlyError(e)); }
  };
  $('#photoDel', sheet).onclick = async () => {
    try {
      await removeFiles([p.path]);
      must(await sb.from('box_photos').delete().eq('id', p.id));
      closeSheet();
      toast(t('deleted'));
      await refreshBox();
    } catch (e) { toast(friendlyError(e)); }
  };
}

/* ---------- item editor ---------- */
function openItemEditor(itemId) {
  const it = S.current.items.find((x) => x.id === itemId);
  if (!it) return;
  const box = S.current.box;
  const coll = collator();
  const boxOpts = S.boxes.slice().sort((a, b) => coll.compare(a.code, b.code))
    .map((b) => `<option value="${esc(b.id)}"${b.id === box.id ? ' selected' : ''}>${esc(b.code)}  ${esc(b.name)}</option>`).join('');
  const sheet = openSheet(`
    <h2>${t('edit_item')}</h2>
    <form id="itemForm" novalidate>
      <label class="field"><span>${t('item_name')}</span><input class="input" name="name" maxlength="80" value="${esc(it.name)}" required></label>
      <div class="field"><span>${t('quantity')}</span>
        <div class="stepper">
          <button type="button" data-step="-1" aria-label="${t('decrease')}">${icon('minus')}</button>
          <input name="quantity" type="number" inputmode="numeric" min="1" max="999" value="${it.quantity}" aria-label="${t('quantity')}">
          <button type="button" data-step="1" aria-label="${t('increase')}">${icon('plus')}</button>
        </div>
      </div>
      <label class="field"><span>${t('category')}</span><select class="input" name="category">${catOptions(it.category)}</select></label>
      <label class="field"><span>${t('move_to')}</span><select class="input" name="box">${boxOpts}</select></label>
      <label class="field"><span>${t('notes')} <span class="opt">${t('optional')}</span></span><textarea class="input" name="notes" rows="2" maxlength="300">${esc(it.notes || '')}</textarea></label>
      <div class="error" id="itemErr" hidden></div>
      <div class="sheet-actions">
        <button type="button" class="btn btn-icon" id="itemDel" aria-label="${t('delete_item')}" title="${t('delete_item')}">${icon('trash')}</button>
        <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
        <button type="submit" class="btn primary">${t('save')}</button>
      </div>
    </form>`);
  const form = $('#itemForm', sheet);
  $$('[data-step]', form).forEach((b) => b.onclick = () => { form.quantity.value = clampQty(Number(form.quantity.value) + Number(b.dataset.step)); });
  $('#itemDel', sheet).onclick = async () => {
    try {
      must(await sb.from('items').delete().eq('id', it.id));
      closeSheet();
      await refreshBox();
      toast(t('deleted'), {
        action: t('undo'),
        onAction: async () => {
          try {
            must(await sb.from('items').insert({ box_id: it.box_id, name: it.name, quantity: it.quantity, category: it.category, notes: it.notes, source: it.source }));
            await refreshBox();
          } catch (e) { toast(friendlyError(e)); }
        }
      });
    } catch (e) { toast(friendlyError(e)); }
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const errEl = $('#itemErr');
    if (!name) { errEl.textContent = t('err_name_required'); errEl.hidden = false; return; }
    const vals = { name, quantity: clampQty(form.quantity.value), category: form.category.value, notes: form.notes.value.trim() || null, box_id: form.box.value };
    try {
      must(await sb.from('items').update(vals).eq('id', it.id));
      closeSheet();
      if (vals.box_id !== box.id) {
        const target = S.boxes.find((b) => b.id === vals.box_id);
        toast(t('item_moved', { code: target ? target.code : '' }));
      } else toast(t('saved'));
      await refreshBox();
    } catch (ex) { errEl.textContent = friendlyError(ex); errEl.hidden = false; }
  };
}

/* =====================================================================
   Places
   ===================================================================== */
function renderPlaces() {
  const noPlace = S.boxes.filter((b) => !b.location_id).length;
  const row = (id, name, count, act) => `<li><button type="button" class="place-row" data-act="${act}" data-id="${esc(id)}">${icon('pin')}<span class="place-name">${esc(name)}</span><span class="place-count">${tp('n_boxes', count)}</span>${icon('chevron')}</button></li>`;
  $('#view').innerHTML = `
    <header class="page-head"><h1 class="page-title">${t('places_title')}</h1></header>
    <p class="page-intro">${t('places_intro')}</p>
    ${S.locations.length || noPlace ? `<ul class="list">
      ${S.locations.map((l) => row(l.id, l.name, S.boxes.filter((b) => b.location_id === l.id).length, 'open-place')).join('')}
      ${noPlace ? row('none', t('no_place'), noPlace, 'show-place') : ''}
    </ul>` : `<div class="empty"><p>${t('places_empty')}</p></div>`}
    <button type="button" class="btn primary block" style="margin-top:16px" data-act="new-place">${icon('plus')}${t('add_place')}</button>`;
}
function openPlaceSheet(loc) {
  const isNew = !loc;
  const sheet = openSheet(`
    <h2>${isNew ? t('place_title_new') : t('place_title_edit')}</h2>
    <form id="placeForm" novalidate>
      <label class="field"><span>${t('box_name')}</span><input class="input" name="name" maxlength="60" required placeholder="${t('place_name_ph')}" value="${esc(loc ? loc.name : '')}" ${isNew ? 'autofocus' : ''}></label>
      <label class="field"><span>${t('notes')} <span class="opt">${t('optional')}</span></span><textarea class="input" name="notes" rows="2" maxlength="300">${esc(loc ? loc.notes || '' : '')}</textarea></label>
      <div class="error" id="placeErr" hidden></div>
      ${isNew ? '' : `<ul class="menu">
        <li><button type="button" data-act="show-place" data-id="${esc(loc.id)}">${icon('box')}${t('show_boxes')}</button></li>
        <li><button type="button" class="danger" id="placeDel">${icon('trash')}${t('delete_place')}</button></li>
      </ul>`}
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
        <button type="submit" class="btn primary">${isNew ? t('add_place') : t('save')}</button>
      </div>
    </form>`);
  const form = $('#placeForm', sheet);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const errEl = $('#placeErr');
    if (!name) { errEl.textContent = t('err_name_required'); errEl.hidden = false; return; }
    const vals = { name, notes: form.notes.value.trim() || null };
    try {
      if (isNew) must(await sb.from('locations').insert(Object.assign({ space_id: S.space.id }, vals)));
      else must(await sb.from('locations').update(vals).eq('id', loc.id));
      await loadLocations();
      closeSheet();
      toast(t('saved'));
      renderPlaces();
    } catch (ex) { errEl.textContent = friendlyError(ex); errEl.hidden = false; }
  };
  if (!isNew) {
    $('#placeDel', sheet).onclick = async () => {
      const ok = await confirmSheet({ title: t('delete_place_q', { name: loc.name }), body: t('delete_place_body'), confirm: t('delete_place'), danger: true });
      if (!ok) return;
      try {
        must(await sb.from('locations').delete().eq('id', loc.id));
        if (S.filter === loc.id) S.filter = 'all';
        await loadAll();
        toast(t('deleted'));
        renderPlaces();
      } catch (ex) { toast(friendlyError(ex)); }
    };
  }
}

/* =====================================================================
   Labels
   ===================================================================== */
function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  }
  return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
function labelHtml(b) {
  const loc = locationName(b.location_id);
  return `<div class="plabel">${qrSvg(boxUrl(b.id))}<div class="pl-text"><div class="pl-code">${esc(b.code)}</div><div class="pl-name">${esc(b.name)}</div>${loc ? `<div class="pl-place">${esc(b.spot ? loc + ', ' + b.spot : loc)}</div>` : ''}</div></div>`;
}
function labelPages(boxes, size) {
  const per = size === 'small' ? 24 : 8;
  const pages = [];
  for (let i = 0; i < boxes.length; i += per) pages.push(boxes.slice(i, i + per));
  return pages.map((pg) => `<div class="print-page ${size}">${pg.map(labelHtml).join('')}</div>`).join('');
}
function labelBoxes() {
  const coll = collator();
  return S.boxes.slice().sort((a, b) => coll.compare(a.code, b.code));
}
function renderLabels() {
  try { S.labelSize = localStorage.getItem('bf_label_size') === 'small' ? 'small' : 'large'; } catch (e) {}
  const boxes = labelBoxes();
  const ids = new Set(boxes.map((b) => b.id));
  if (!S.labelSel) S.labelSel = new Set(boxes.filter((b) => !b.label_printed_at).map((b) => b.id));
  S.labelSel = new Set(Array.from(S.labelSel).filter((id) => ids.has(id)));
  if (!boxes.length) {
    $('#view').innerHTML = `
      <header class="page-head"><h1 class="page-title">${t('labels_title')}</h1></header>
      <p class="page-intro">${t('labels_intro')}</p>
      <div class="empty"><p>${t('labels_empty')}</p><p><button type="button" class="btn primary" data-act="new-box">${icon('plus')}${t('new_box')}</button></p></div>`;
    return;
  }
  const dateFmt = new Intl.DateTimeFormat(S.lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' });
  const unprinted = boxes.filter((b) => !b.label_printed_at).length;
  $('#view').innerHTML = `
    <header class="page-head"><h1 class="page-title">${t('labels_title')}</h1></header>
    <p class="page-intro">${t('labels_intro')}</p>
    <div class="stack">
      <section>
        <h2 class="setting-title">${t('label_size')}</h2>
        <div class="seg" role="group" aria-label="${t('label_size')}">
          <button type="button" data-act="label-size" data-size="large" aria-pressed="${S.labelSize === 'large'}">${t('size_large')}</button>
          <button type="button" data-act="label-size" data-size="small" aria-pressed="${S.labelSize === 'small'}">${t('size_small')}</button>
        </div>
      </section>
      <section>
        <h2 class="setting-title">${t('which_boxes')}</h2>
        <div class="quick-sel">
          <button type="button" class="chip" data-act="label-sel" data-mode="unprinted">${t('sel_unprinted')}<span class="n">${unprinted}</span></button>
          <button type="button" class="chip" data-act="label-sel" data-mode="all">${t('sel_all')}<span class="n">${boxes.length}</span></button>
          <button type="button" class="chip" data-act="label-sel" data-mode="none">${t('sel_none')}</button>
        </div>
        <ul class="list pick-list">
          ${boxes.map((b) => `<li><label>
            <input type="checkbox" data-label-box="${esc(b.id)}" ${S.labelSel.has(b.id) ? 'checked' : ''}>
            <span class="pl-main"><span class="pl-name">${esc(b.name)}</span><span class="pl-sub">${b.label_printed_at ? esc(t('printed_on', { date: dateFmt.format(new Date(b.label_printed_at)) })) : t('not_printed')}</span></span>
            <span class="code-chip kraft">${esc(b.code)}</span>
          </label></li>`).join('')}
        </ul>
      </section>
      <section id="previewSection">
        <h2 class="setting-title">${t('preview')}</h2>
        <div class="preview-frame" id="previewFrame"></div>
        <p class="preview-note" id="previewNote"></p>
      </section>
    </div>
    <div class="sticky-cta"><button type="button" class="btn primary big" data-act="print-labels" id="printBtn">${icon('printer')}<span></span></button></div>`;
  $$('[data-label-box]').forEach((cb) => cb.onchange = () => {
    if (cb.checked) S.labelSel.add(cb.dataset.labelBox); else S.labelSel.delete(cb.dataset.labelBox);
    updateLabelPreview();
  });
  updateLabelPreview();
}
function updateLabelPreview() {
  const chosen = labelBoxes().filter((b) => S.labelSel.has(b.id));
  const per = S.labelSize === 'small' ? 24 : 8;
  const pages = Math.max(1, Math.ceil(chosen.length / per));
  const btn = $('#printBtn');
  btn.querySelector('span').textContent = chosen.length ? tp('print_n', chosen.length) : t('labels_none_selected');
  btn.disabled = !chosen.length;
  const frame = $('#previewFrame');
  $('#previewSection').hidden = !chosen.length;
  if (!chosen.length) return;
  frame.innerHTML = labelPages(chosen.slice(0, per), S.labelSize);
  $('#previewNote').textContent = t('page_of', { n: pages });
  const page = frame.firstElementChild;
  const fit = () => {
    const pw = page.offsetWidth, ph = page.offsetHeight;
    const s = frame.clientWidth / pw;
    page.style.transform = `scale(${s})`;
    frame.style.height = Math.ceil(ph * s) + 'px';
  };
  fit();
  requestAnimationFrame(fit);
}
window.addEventListener('resize', debounce(() => { if (document.body.dataset.page === 'labels' && $('#previewFrame')) updateLabelPreview(); }, 150));
async function printLabels() {
  const chosen = labelBoxes().filter((b) => S.labelSel.has(b.id));
  if (!chosen.length) { toast(t('labels_none_selected')); return; }
  $('#printArea').innerHTML = labelPages(chosen, S.labelSize);
  if (document.fonts && document.fonts.status !== 'loaded') { try { await document.fonts.ready; } catch (e) {} }
  window.print();
  const now = new Date().toISOString();
  try {
    must(await sb.from('boxes').update({ label_printed_at: now }).in('id', chosen.map((b) => b.id)));
    chosen.forEach((b) => { const real = S.boxes.find((x) => x.id === b.id); if (real) real.label_printed_at = now; });
    S.labelSel = new Set();
    toast(tp('marked_printed', chosen.length));
    if (document.body.dataset.page === 'labels') renderLabels();
  } catch (e) { /* printing worked; the mark is only a convenience */ }
}
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

/* =====================================================================
   Me
   ===================================================================== */
function renderMe() {
  const theme = getThemePref();
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const install = standalone ? '' : (S.installEvt
    ? `<section><button type="button" class="btn block" data-act="install">${icon('download')}${t('install_app')}</button></section>`
    : (isIos ? `<section><h2 class="setting-title">${t('install_app')}</h2><p class="muted" style="margin:0">${t('install_ios')}</p></section>` : ''));
  $('#view').innerHTML = `
    <header class="page-head"><h1 class="page-title">${t('me_title')}</h1></header>
    <div class="stack">
      <section><label class="field" style="margin:0"><span>${t('your_name')}</span><input class="input" id="meName" maxlength="60" placeholder="${t('name_ph')}" value="${esc(S.profile.display_name || '')}"></label></section>
      <section>
        <h2 class="setting-title">${t('language')}</h2>
        <div class="seg" role="group" aria-label="${t('language')}">
          <button type="button" data-act="set-lang" data-lang="en" aria-pressed="${S.lang === 'en'}">English</button>
          <button type="button" data-act="set-lang" data-lang="tr" aria-pressed="${S.lang === 'tr'}">Türkçe</button>
        </div>
      </section>
      <section>
        <h2 class="setting-title">${t('appearance')}</h2>
        <div class="seg" role="group" aria-label="${t('appearance')}">
          ${['light', 'dark', 'system'].map((m) => `<button type="button" data-act="set-theme" data-theme="${m}" aria-pressed="${theme === m}">${t('theme_' + m)}</button>`).join('')}
        </div>
      </section>
      <section>
        <h2 class="setting-title">${t('ai_scans')}</h2>
        <p style="margin:0" id="meUsage">${esc(S.aiLimit != null ? t('ai_scans_left', { n: S.aiRemaining, limit: S.aiLimit }) : t('ai_scans_unknown'))}</p>
      </section>
      ${install}
      <section>
        <p class="muted" style="margin:0 0 10px">${esc(t('signed_in_as', { email: S.user.email || '' }))}</p>
        <button type="button" class="btn block" data-act="sign-out">${t('sign_out')}</button>
        <button type="button" class="danger-link" data-act="delete-account">${t('delete_account')}</button>
      </section>
    </div>`;
  $('#meName').onchange = async (e) => {
    const v = e.target.value.trim() || null;
    try {
      must(await sb.from('profiles').update({ display_name: v }).eq('user_id', S.user.id));
      S.profile.display_name = v;
      toast(t('saved'));
    } catch (ex) { toast(friendlyError(ex)); }
  };
  refreshUsage().then(() => {
    const el = $('#meUsage');
    if (el && S.aiLimit != null) el.textContent = t('ai_scans_left', { n: S.aiRemaining, limit: S.aiLimit });
  });
}
async function deleteAccount() {
  const ok = await confirmSheet({ title: t('delete_account_q'), body: t('delete_account_body'), confirm: t('delete_account'), danger: true });
  if (!ok) return;
  showBlocker(t('deleting'));
  try {
    const spaces = must(await sb.from('spaces').select('id').eq('owner_id', S.user.id)) || [];
    for (const sp of spaces) {
      for (let from = 0; ; from += 1000) {
        const rows = must(await sb.from('box_photos').select('path').eq('space_id', sp.id).range(from, from + 999)) || [];
        await removeFiles(rows.map((r) => r.path));
        if (rows.length < 1000) break;
      }
    }
    must(await sb.rpc('delete_my_account'));
    S.pendingAuthMessage = t('account_deleted');
    await sb.auth.signOut({ scope: 'local' }).catch(() => {});
    hideBlocker();
    resetSignedOut();
    history.replaceState(null, '', location.pathname);
    renderAuth('in', t('account_deleted'));
  } catch (e) {
    hideBlocker();
    toast(friendlyError(e));
  }
}

/* =====================================================================
   QR scanner
   ===================================================================== */
const scanner = { stream: null, raf: 0, detector: null, busy: false, canvas: null, lastError: 0 };
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function showScanError(msg) {
  const el = $('#scannerError');
  el.textContent = msg;
  el.hidden = false;
  scanner.lastError = Date.now();
}
async function openScanner() {
  closeSheet();
  $('#scannerTitle').textContent = t('scanner_title');
  $('#scannerHint').textContent = t('scanner_hint');
  $('#scanCodeInput').placeholder = t('scanner_code_ph');
  $('#scanCodeInput').value = '';
  $('#scanCodeBtn').textContent = t('open');
  $('#scannerClose').setAttribute('aria-label', t('close'));
  $('#scannerError').hidden = true;
  $('#scanner').classList.add('open');
  document.body.classList.add('sheet-open');
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
    scanner.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    if (!$('#scanner').classList.contains('open')) { stopStream(); return; }
    const video = $('#scanVideo');
    video.srcObject = scanner.stream;
    await video.play().catch(() => {});
    scanner.detector = null;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) scanner.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) { /* use jsQR */ }
    }
    if (!scanner.detector) await loadScript('/vendor/jsQR.js');
    scanLoop();
  } catch (e) {
    showScanError(t('camera_denied'));
  }
}
function stopStream() {
  cancelAnimationFrame(scanner.raf);
  if (scanner.stream) scanner.stream.getTracks().forEach((tr) => tr.stop());
  scanner.stream = null;
  const v = $('#scanVideo');
  if (v) v.srcObject = null;
}
function closeScanner() {
  stopStream();
  const el = $('#scanner');
  if (el && el.classList.contains('open')) {
    el.classList.remove('open');
    document.body.classList.remove('sheet-open');
  }
}
function scanLoop() {
  let last = 0;
  const tick = async (ts) => {
    if (!scanner.stream) return;
    scanner.raf = requestAnimationFrame(tick);
    if (ts - last < 180 || scanner.busy) return;
    last = ts;
    scanner.busy = true;
    try {
      const text = await detectOnce();
      if (text) handleScanText(text);
    } catch (e) { /* keep scanning */ } finally { scanner.busy = false; }
  };
  scanner.raf = requestAnimationFrame(tick);
}
async function detectOnce() {
  const video = $('#scanVideo');
  if (video.readyState < 2 || !video.videoWidth) return null;
  if (scanner.detector) {
    const codes = await scanner.detector.detect(video);
    return codes && codes[0] ? codes[0].rawValue : null;
  }
  if (!window.jsQR) return null;
  const w = 640, h = Math.round(video.videoHeight / video.videoWidth * 640);
  const c = scanner.canvas || (scanner.canvas = document.createElement('canvas'));
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const r = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
  return r ? r.data : null;
}
function handleScanText(text) {
  let id = null;
  try { id = new URL(text).searchParams.get('box'); } catch (e) { /* not a URL */ }
  if (id) { closeScanner(); location.hash = '#/box/' + encodeURIComponent(id); return; }
  if (/^\s*B?-?\s*\d{1,6}\s*$/i.test(text)) { openByCode(text); return; }
  if (Date.now() - scanner.lastError > 2500) showScanError(t('not_a_label'));
}
function openByCode(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return;
  const n = parseInt(digits, 10);
  const code = 'B-' + (n < 10000 ? String(n).padStart(4, '0') : String(n));
  const b = S.boxes.find((x) => x.code.toUpperCase() === code);
  if (b) { closeScanner(); location.hash = '#/box/' + encodeURIComponent(b.id); return; }
  showScanError(t('code_not_found', { code }));
}
$('#scanCodeForm').addEventListener('submit', (e) => { e.preventDefault(); openByCode($('#scanCodeInput').value); });

/* =====================================================================
   Global actions (data-act buttons)
   ===================================================================== */
const ACTIONS = {
  'sheet-close': () => closeSheet(),
  'clear-search': () => { S.query = ''; const q = $('#q'); if (q) { q.value = ''; q.focus(); } renderHomeBody(); },
  'filter': (el) => { S.filter = el.dataset.id; renderHomeBody(); },
  'new-box': () => openBoxForm(null),
  'box-menu': () => openBoxMenu(),
  'edit-box': () => openBoxForm(S.current.box),
  'delete-box': () => deleteBox(),
  'print-box-label': () => { S.labelSel = new Set([S.current.box.id]); closeSheet(); location.hash = '#/labels'; },
  'scan-contents': () => openScanSheet(),
  'add-photo': () => $('#photoOnlyInput').click(),
  'view-photo': (el) => openPhotoViewer(el.dataset.id),
  'edit-item': (el) => openItemEditor(el.dataset.id),
  'new-place': () => openPlaceSheet(null),
  'open-place': (el) => openPlaceSheet(S.locations.find((l) => l.id === el.dataset.id)),
  'show-place': (el) => {
    S.filter = el.dataset.id;
    S.query = '';
    closeSheet();
    if (currentRoute().name === '') renderBoxes(); else location.hash = '#/';
  },
  'open-scanner': () => openScanner(),
  'close-scanner': () => closeScanner(),
  'set-lang': (el) => { setLang(el.dataset.lang, true); renderMe(); },
  'set-theme': (el) => { setTheme(el.dataset.theme); renderMe(); },
  'sign-out': async () => { await sb.auth.signOut().catch(() => {}); },
  'delete-account': () => deleteAccount(),
  'install': async () => { if (!S.installEvt) return; S.installEvt.prompt(); try { await S.installEvt.userChoice; } catch (e) {} S.installEvt = null; renderMe(); },
  'label-size': (el) => { S.labelSize = el.dataset.size; try { localStorage.setItem('bf_label_size', S.labelSize); } catch (e) {} renderLabels(); },
  'label-sel': (el) => {
    const boxes = labelBoxes();
    const mode = el.dataset.mode;
    S.labelSel = new Set(mode === 'all' ? boxes.map((b) => b.id) : mode === 'unprinted' ? boxes.filter((b) => !b.label_printed_at).map((b) => b.id) : []);
    renderLabels();
  },
  'print-labels': () => printLabels()
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('#scanner').classList.contains('open')) closeScanner();
  else closeSheet();
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });

if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__TEST_SUPABASE__) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

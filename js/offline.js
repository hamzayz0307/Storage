'use strict';
/* =====================================================================
   Offline: a copy of the current space is kept on the phone, so search
   and box pages still open in a basement or storage unit without signal.
   Item changes made offline are queued and sent when you're back online.
   ===================================================================== */

Object.assign(I18N.en, {
  offline_bar: 'You’re offline. Showing the copy saved on this phone ({time}).',
  offline_bar_pending_one: '1 change will be sent when you’re back online.',
  offline_bar_pending_other: '{n} changes will be sent when you’re back online.',
  back_online_one: 'Back online. 1 change sent.',
  back_online_other: 'Back online. {n} changes sent.',
  back_online: 'Back online.',
  saved_offline: 'Saved on this phone. It will be sent when you’re back online.',
  needs_connection: 'This needs an internet connection.',
  change_refused: 'One change couldn’t be saved because the item was changed or removed by someone else.'
});
Object.assign(I18N.tr, {
  offline_bar: 'Çevrimdışısın. Bu telefonda kayıtlı kopya gösteriliyor ({time}).',
  offline_bar_pending_one: 'İnternete bağlanınca 1 değişiklik gönderilecek.',
  offline_bar_pending_other: 'İnternete bağlanınca {n} değişiklik gönderilecek.',
  back_online_one: 'Tekrar çevrimiçi. 1 değişiklik gönderildi.',
  back_online_other: 'Tekrar çevrimiçi. {n} değişiklik gönderildi.',
  back_online: 'Tekrar çevrimiçi.',
  saved_offline: 'Bu telefona kaydedildi. İnternete bağlanınca gönderilecek.',
  needs_connection: 'Bunun için internet bağlantısı gerekiyor.',
  change_refused: 'Bir değişiklik kaydedilemedi, çünkü eşya başka biri tarafından değiştirilmiş ya da silinmiş.'
});

const cacheKey = () => 'bf_cache_v2_' + (S.user ? S.user.id : 'anon');
const outboxKey = () => 'bf_outbox_v2_' + (S.user ? S.user.id : 'anon');

function saveCache() {
  if (!S.user || !S.space || S.offline) return;
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({
      v: 2, savedAt: new Date().toISOString(), profile: S.profile, space: S.space, role: S.role,
      spaces: S.spaces, locations: S.locations, boxes: S.boxes, items: S.items
    }));
  } catch (e) { /* storage full or blocked: the offline copy just isn't refreshed */ }
}
const saveCacheSoon = debounce(saveCache, 600);
function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
    return c && c.v === 2 ? c : null;
  } catch (e) { return null; }
}
function readOutbox() {
  try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]'); } catch (e) { return []; }
}
function writeOutbox(list) {
  try { localStorage.setItem(outboxKey(), JSON.stringify(list)); } catch (e) {}
  updateOfflineBar();
}
function queueChange(op) {
  const list = readOutbox();
  list.push(op);
  writeOutbox(list);
}

/* ---------- the offline bar ---------- */
const offlineBar = document.createElement('div');
offlineBar.id = 'offlineBar';
offlineBar.setAttribute('role', 'status');
offlineBar.hidden = true;
document.body.prepend(offlineBar);
function updateOfflineBar() {
  const pending = S.user ? readOutbox().length : 0;
  if (!S.offline || !S.loaded) { offlineBar.hidden = true; document.body.classList.remove('is-offline'); return; }
  const c = readCache();
  const time = c ? fmtDate(c.savedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  offlineBar.textContent = t('offline_bar', { time }) + (pending ? ' ' + tp('offline_bar_pending', pending) : '');
  offlineBar.hidden = false;
  document.body.classList.add('is-offline');
}
function goOffline() {
  if (S.offline) return;
  S.offline = true;
  updateOfflineBar();
}

/* ---------- writing items (online now, or queued) ---------- */
function recount(boxIds) {
  new Set(boxIds).forEach((id) => {
    const b = boxById(id);
    if (!b) return;
    const list = itemsOf(id);
    b.item_count = list.length;
    b.out_count = list.filter((i) => i.checked_out_at).length;
    b.value_total = list.reduce((n, i) => n + (Number(i.value) || 0) * Math.max(1, i.quantity || 1), 0);
  });
}
const Store = {
  async insertItems(rows) {
    const now = new Date().toISOString();
    rows = rows.map((r) => Object.assign({ id: uuid() }, r));
    const local = rows.map((r) => Object.assign({
      space_id: S.space.id, created_at: now, notes: null, checked_out_at: null, checked_out_to: null,
      expires_on: null, value: null, receipt_path: null, kind: 'thing', brand: null, model: null,
      serial: null, purchased_on: null, warranty_until: null, source: 'manual', category: 'other', quantity: 1
    }, r));
    S.items = S.items.concat(local);
    recount(rows.map((r) => r.box_id));
    saveCacheSoon();
    if (S.offline) { queueChange({ op: 'insert', rows }); return { queued: true }; }
    try {
      must(await sb.from('items').insert(rows));
      return {};
    } catch (e) {
      if (isNetError(e)) { goOffline(); queueChange({ op: 'insert', rows }); return { queued: true }; }
      const ids = new Set(rows.map((r) => r.id));
      S.items = S.items.filter((i) => !ids.has(i.id));
      recount(rows.map((r) => r.box_id));
      throw e;
    }
  },
  async updateItem(id, vals) {
    const it = S.items.find((i) => i.id === id);
    const before = it ? Object.assign({}, it) : null;
    if (it) Object.assign(it, vals);
    recount([before && before.box_id, vals.box_id].filter(Boolean));
    saveCacheSoon();
    if (S.offline) { queueChange({ op: 'update', id, vals }); return { queued: true }; }
    try {
      must(await sb.from('items').update(vals).eq('id', id));
      return {};
    } catch (e) {
      if (isNetError(e)) { goOffline(); queueChange({ op: 'update', id, vals }); return { queued: true }; }
      if (it && before) { Object.keys(it).forEach((k) => delete it[k]); Object.assign(it, before); recount([before.box_id, vals.box_id]); }
      throw e;
    }
  },
  async deleteItem(id) {
    const idx = S.items.findIndex((i) => i.id === id);
    const removed = idx >= 0 ? S.items.splice(idx, 1)[0] : null;
    if (removed) recount([removed.box_id]);
    saveCacheSoon();
    if (S.offline) { queueChange({ op: 'delete', id }); return { queued: true }; }
    try {
      must(await sb.from('items').delete().eq('id', id));
      return {};
    } catch (e) {
      if (isNetError(e)) { goOffline(); queueChange({ op: 'delete', id }); return { queued: true }; }
      if (removed) { S.items.push(removed); recount([removed.box_id]); }
      throw e;
    }
  }
};

// Sends queued changes in order. Returns how many were sent, or -1 if still offline.
async function flushOutbox() {
  let list = readOutbox();
  let sent = 0, refused = 0;
  while (list.length) {
    const op = list[0];
    try {
      if (op.op === 'insert') must(await sb.from('items').upsert(op.rows, { onConflict: 'id', ignoreDuplicates: true }));
      else if (op.op === 'update') must(await sb.from('items').update(op.vals).eq('id', op.id));
      else if (op.op === 'delete') must(await sb.from('items').delete().eq('id', op.id));
      sent++;
    } catch (e) {
      if (isNetError(e)) return -1;
      console.error('Server refused a queued change', op, e);
      refused++;
    }
    list = list.slice(1);
    writeOutbox(list);
  }
  if (refused) setTimeout(() => toast(t('change_refused')), 3400);
  return sent;
}

let reconnecting = false;
async function tryReconnect() {
  if (reconnecting || !S.loaded || !S.offline || !navigator.onLine) return;
  reconnecting = true;
  try {
    const sent = await flushOutbox();
    if (sent < 0) return;
    await reloadSpace(false);
    updateOfflineBar();
    toast(sent ? tp('back_online', sent) : t('back_online'));
  } catch (e) {
    /* still offline */
  } finally {
    reconnecting = false;
  }
}
window.addEventListener('online', tryReconnect);
window.addEventListener('offline', goOffline);
setInterval(tryReconnect, 30000);

/* ---------- hooks ---------- */
HOOKS.afterLoad.push(async () => { saveCacheSoon(); });

// Opening the app without signal: use the saved copy.
HOOKS.bootFailed.push(async (err) => {
  if (!isNetError(err) || !S.user) return false;
  const c = readCache();
  if (!c) return false;
  Object.assign(S, { profile: c.profile, space: c.space, role: c.role, spaces: c.spaces || [], locations: c.locations || [], boxes: c.boxes || [], items: c.items || [] });
  if (S.profile && S.profile.language && S.profile.language !== S.lang) setLang(S.profile.language, false);
  applySpaceLook();
  S.offline = true;
  await finishBoot();
  updateOfflineBar();
  return true;
});

// Changes left over from an earlier offline session.
HOOKS.afterBoot.push(async () => {
  updateOfflineBar();
  if (S.offline || !readOutbox().length) return;
  const sent = await flushOutbox();
  if (sent > 0) { await reloadSpace(false); toast(tp('back_online', sent)); }
});

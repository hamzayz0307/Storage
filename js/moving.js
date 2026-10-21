'use strict';
/* =====================================================================
   Moving: moving mode with rooms and a status per box (packed → in
   transit → unpacked), fragile boxes, selecting several boxes at once,
   and coloured labels by room or place.
   ===================================================================== */

Object.assign(I18N.en, {
  moving_title: 'Moving',
  moving_intro: 'Track every box from packing to unpacking. Give each box a destination room, and the labels show the room in its colour.',
  moving_start: 'Start moving mode',
  moving_stop: 'Finish moving',
  moving_stop_q: 'Finish moving?',
  moving_stop_body: 'Moving status and rooms are cleared from all boxes. Everything else stays.',
  moving_on: 'Moving mode is on',
  moving_progress: '{done} of {total} boxes unpacked',
  moving_card: 'Moving: {done} of {total} unpacked',
  rooms: 'Rooms in the new place',
  room_add: 'Add room',
  room_name_ph: 'e.g. Kitchen',
  room_none: 'No room',
  room: 'Destination room',
  fragile: 'Fragile',
  fragile_check: 'Fragile, handle with care',
  move_status: 'Moving status',
  move_none: 'Not packed yet',
  move_packed: 'Packed',
  move_in_transit: 'On the way',
  move_unpacked: 'Unpacked',
  not_arrived: 'Not arrived yet',
  not_arrived_none: 'Every packed box has arrived.',
  n_selected_one: '1 selected',
  n_selected_other: '{n} selected',
  select: 'Select',
  done: 'Done',
  select_all: 'Select all',
  bulk_move: 'Move',
  bulk_status: 'Status',
  bulk_room: 'Room',
  bulk_labels: 'Labels',
  bulk_place_title: 'Move {n} boxes to',
  bulk_status_title: 'Set status of {n} boxes',
  bulk_room_title: 'Destination room for {n} boxes',
  bulk_done_one: '1 box updated',
  bulk_done_other: '{n} boxes updated',
  moving_mode_row: 'Moving mode',
  moving_mode_sub_on: 'On, {done} of {total} unpacked',
  moving_mode_sub_off: 'Track boxes while you move house'
});
Object.assign(I18N.tr, {
  moving_title: 'Taşınma',
  moving_intro: 'Her kutuyu paketlemeden açılana kadar takip et. Her kutuya gideceği odayı ver; etiketler odayı kendi renginde gösterir.',
  moving_start: 'Taşınma modunu başlat',
  moving_stop: 'Taşınmayı bitir',
  moving_stop_q: 'Taşınma bitsin mi?',
  moving_stop_body: 'Tüm kutulardaki taşınma durumu ve oda bilgisi silinir. Geri kalan her şey kalır.',
  moving_on: 'Taşınma modu açık',
  moving_progress: '{total} kutudan {done} tanesi açıldı',
  moving_card: 'Taşınma: {total} kutudan {done} açıldı',
  rooms: 'Yeni evdeki odalar',
  room_add: 'Oda ekle',
  room_name_ph: 'ör. Mutfak',
  room_none: 'Oda yok',
  room: 'Gideceği oda',
  fragile: 'Kırılabilir',
  fragile_check: 'Kırılabilir, dikkatli taşınmalı',
  move_status: 'Taşınma durumu',
  move_none: 'Henüz paketlenmedi',
  move_packed: 'Paketlendi',
  move_in_transit: 'Yolda',
  move_unpacked: 'Açıldı',
  not_arrived: 'Henüz gelmeyenler',
  not_arrived_none: 'Paketlenen tüm kutular geldi.',
  n_selected_one: '1 seçili',
  n_selected_other: '{n} seçili',
  select: 'Seç',
  done: 'Bitti',
  select_all: 'Tümünü seç',
  bulk_move: 'Taşı',
  bulk_status: 'Durum',
  bulk_room: 'Oda',
  bulk_labels: 'Etiket',
  bulk_place_title: '{n} kutuyu şuraya taşı',
  bulk_status_title: '{n} kutunun durumunu seç',
  bulk_room_title: '{n} kutunun gideceği oda',
  bulk_done_one: '1 kutu güncellendi',
  bulk_done_other: '{n} kutu güncellendi',
  moving_mode_row: 'Taşınma modu',
  moving_mode_sub_on: 'Açık, {total} kutudan {done} açıldı',
  moving_mode_sub_off: 'Ev taşırken kutuları takip et'
});

const MOVE_STATUSES = ['packed', 'in_transit', 'unpacked'];
function rooms() { return Array.isArray(S.space && S.space.rooms) ? S.space.rooms : []; }
function roomColor(name) { const r = rooms().find((x) => x.name === name); return r ? safeColor(r.color) : null; }
function movingOn() { return !!(S.space && S.space.moving); }
function movingCounts() {
  const total = S.boxes.length;
  const by = { none: 0, packed: 0, in_transit: 0, unpacked: 0 };
  S.boxes.forEach((b) => { by[b.move_status || 'none']++; });
  return { total, done: by.unpacked, by };
}
function statusBadge(b) {
  if (!movingOn()) return '';
  const st = b.move_status;
  const tone = st === 'unpacked' ? 'ok' : st ? 'info' : 'muted';
  return badge(t(st ? 'move_' + st : 'move_none'), tone, 'truck');
}
function roomBadge(b) {
  if (!movingOn() || !b.dest_room) return '';
  const c = roomColor(b.dest_room);
  return `<span class="badge-pill">${c ? `<span class="dot" style="background:${esc(c)}"></span>` : icon('home')}${esc(b.dest_room)}</span>`;
}
function fragileBadge(b) { return b.fragile ? badge(t('fragile'), 'bad', 'alert') : ''; }

// On tiles and the box page, only show a moving status once the box has one.
HOOKS.tileBadges.push((b) => fragileBadge(b) + (b.move_status ? statusBadge(b) : '') + roomBadge(b));
HOOKS.heroBadges.push((b) => fragileBadge(b) + (b.move_status ? statusBadge(b) : '') + roomBadge(b));
HOOKS.labelColor.push((b) => (movingOn() && b.dest_room ? roomColor(b.dest_room) : null));
HOOKS.labelExtra.push((b) => {
  let html = '';
  if (movingOn() && b.dest_room) html += `<div class="pl-room">${esc(b.dest_room)}</div>`;
  if (b.fragile) html += `<div class="pl-fragile">${esc(t('fragile'))}</div>`;
  return html;
});
HOOKS.homeTop.push(() => {
  if (!movingOn() || !S.boxes.length) return '';
  const { total, done } = movingCounts();
  const pct = total ? Math.round(done / total * 100) : 0;
  return `<a class="progress-card" href="#/moving">
    <span class="pc-text">${icon('truck')}<span>${esc(t('moving_card', { done, total }))}</span>${icon('chevron')}</span>
    <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${pct}%"></span></span>
  </a>`;
});
HOOKS.meSections.push(() => {
  if (!ROLE.isStaff()) return '';
  const { total, done } = movingCounts();
  return `<section><ul class="list"><li><a class="place-row" href="#/moving">${icon('truck')}<span class="place-name">${t('moving_mode_row')}<span class="row-sub">${esc(movingOn() ? t('moving_mode_sub_on', { done, total }) : t('moving_mode_sub_off'))}</span></span>${icon('chevron')}</a></li></ul></section>`;
});

HOOKS.boxForm.push({
  html(box) {
    const b = box || {};
    const moving = movingOn() ? `
      <label class="field"><span>${t('move_status')}</span><select class="input" name="moveStatus">
        <option value="">${t('move_none')}</option>
        ${MOVE_STATUSES.map((st) => `<option value="${st}" ${b.move_status === st ? 'selected' : ''}>${t('move_' + st)}</option>`).join('')}
      </select></label>
      <label class="field"><span>${t('room')}</span><select class="input" name="destRoom">
        <option value="">${t('room_none')}</option>
        ${rooms().map((r) => `<option value="${esc(r.name)}" ${b.dest_room === r.name ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select></label>` : '';
    return `${moving}<label class="check-line" style="margin:0 0 14px"><input type="checkbox" name="fragile" ${b.fragile ? 'checked' : ''}>${t('fragile_check')}</label>`;
  },
  collect(form) {
    const vals = { fragile: !!form.fragile.checked };
    if (form.moveStatus) vals.move_status = form.moveStatus.value || null;
    if (form.destRoom) vals.dest_room = form.destRoom.value || null;
    return vals;
  }
});

/* ---------- moving page ---------- */
async function saveSpace(vals) {
  if (S.offline) throw Object.assign(new Error('offline'), { message: 'offline' });
  must(await sb.from('spaces').update(vals).eq('id', S.space.id));
  Object.assign(S.space, vals);
}
PAGES.moving = {
  tab: 'boxes',
  render() {
    const on = movingOn();
    const edit = ROLE.canEdit();
    const { total, done, by } = movingCounts();
    const pct = total ? Math.round(done / total * 100) : 0;
    const coll = collator();
    const row = (b) => `<li><button type="button" class="move-row" data-act="${edit ? 'move-box-status' : 'open-box'}" data-id="${esc(b.id)}">
        <span class="code-chip kraft">${esc(b.code)}</span>
        <span class="move-main"><span class="move-name">${esc(b.name)}</span><span class="move-badges">${statusBadge(b)}${roomBadge(b)}${fragileBadge(b)}</span></span>
        ${icon('chevron')}
      </button></li>`;
    const waiting = S.boxes.filter((b) => b.move_status === 'packed' || b.move_status === 'in_transit').sort((a, b) => coll.compare(a.code, b.code));
    const groups = ['none', 'packed', 'in_transit', 'unpacked'].map((st) => ({
      st, list: S.boxes.filter((b) => (b.move_status || 'none') === st).sort((a, b) => coll.compare(a.code, b.code))
    })).filter((g) => g.list.length);
    $('#view').innerHTML = `
      <div class="bar"><a class="icon-btn" href="#/" aria-label="${t('back')}">${icon('back')}</a></div>
      <header class="page-head"><h1 class="page-title">${t('moving_title')}</h1></header>
      <p class="page-intro">${t('moving_intro')}</p>
      ${!on ? (edit ? `<button type="button" class="btn primary big" data-act="moving-toggle">${icon('truck')}<span>${t('moving_start')}</span></button>` : `<div class="empty"><p>${t('moving_mode_sub_off')}</p></div>`) : `
      <section class="progress-block">
        <p class="pb-text">${esc(t('moving_progress', { done, total }))}</p>
        <span class="bar-track big" aria-hidden="true"><span class="bar-fill" style="width:${pct}%"></span></span>
        <div class="pb-counts">${MOVE_STATUSES.map((st) => `<span>${esc(t('move_' + st))}: <b>${by[st]}</b></span>`).join('')}<span>${esc(t('move_none'))}: <b>${by.none}</b></span></div>
      </section>
      <div class="stack" style="margin-top:22px">
        <section>
          <h2 class="setting-title">${t('rooms')}</h2>
          <div class="room-list">
            ${rooms().map((r, i) => `<span class="room-chip"><span class="dot" style="background:${esc(safeColor(r.color) || '#999999')}"></span>${esc(r.name)}${edit ? `<button type="button" class="x" data-act="room-remove" data-i="${i}" aria-label="${t('delete')}">${icon('close')}</button>` : ''}</span>`).join('')}
          </div>
          ${edit ? `<form class="quick-add" id="roomForm" autocomplete="off">
            <label class="sr-only" for="roomInput">${t('room_add')}</label>
            <input class="input" id="roomInput" maxlength="30" placeholder="${t('room_name_ph')}">
            <button class="btn" type="submit">${t('room_add')}</button>
          </form>` : ''}
        </section>
        <section>
          <h2 class="setting-title">${t('not_arrived')}</h2>
          ${waiting.length ? `<ul class="list">${waiting.map(row).join('')}</ul>` : `<p class="muted" style="margin:0">${t('not_arrived_none')}</p>`}
        </section>
        ${groups.map((g) => `<section><h2 class="setting-title">${t(g.st === 'none' ? 'move_none' : 'move_' + g.st)} (${g.list.length})</h2><ul class="list">${g.list.map(row).join('')}</ul></section>`).join('')}
        ${edit ? `<button type="button" class="btn block" data-act="moving-toggle">${t('moving_stop')}</button>` : ''}
      </div>`}`;
    const form = $('#roomForm');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const name = $('#roomInput').value.trim().slice(0, 30);
      if (!name || rooms().some((r) => fold(r.name) === fold(name))) return;
      const used = rooms().map((r) => r.color);
      const color = PALETTE.find((c) => !used.includes(c)) || PALETTE[rooms().length % PALETTE.length];
      try { await saveSpace({ rooms: rooms().concat([{ name, color }]) }); PAGES.moving.render(); setTimeout(() => $('#roomInput') && $('#roomInput').focus(), 0); }
      catch (ex) { toast(friendlyError(ex)); }
    };
  }
};

async function toggleMoving() {
  if (movingOn()) {
    const ok = await confirmSheet({ title: t('moving_stop_q'), body: t('moving_stop_body'), confirm: t('moving_stop') });
    if (!ok) return;
    try {
      must(await sb.from('boxes').update({ move_status: null, dest_room: null }).eq('space_id', S.space.id));
      await saveSpace({ moving: false });
      await loadBoxes();
    } catch (e) { toast(friendlyError(e)); return; }
  } else {
    try { await saveSpace({ moving: true }); } catch (e) { toast(friendlyError(e)); return; }
  }
  PAGES.moving.render();
}

function openMoveStatusSheet(boxId) {
  const b = boxById(boxId);
  if (!b) return;
  const sheet = openSheet(`
    <h2>${esc(b.code)} ${esc(b.name)}</h2>
    <div class="field"><span>${t('move_status')}</span>
      <div class="seg wrap" role="group" aria-label="${t('move_status')}">
        <button type="button" data-st="" aria-pressed="${!b.move_status}">${t('move_none')}</button>
        ${MOVE_STATUSES.map((st) => `<button type="button" data-st="${st}" aria-pressed="${b.move_status === st}">${t('move_' + st)}</button>`).join('')}
      </div></div>
    <label class="field"><span>${t('room')}</span><select class="input" id="msRoom">
      <option value="">${t('room_none')}</option>
      ${rooms().map((r) => `<option value="${esc(r.name)}" ${b.dest_room === r.name ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
    </select></label>
    <label class="check-line"><input type="checkbox" id="msFragile" ${b.fragile ? 'checked' : ''}>${t('fragile_check')}</label>
    <div class="sheet-actions">
      <a class="btn ghost" href="#/box/${encodeURIComponent(b.id)}">${t('open')}</a>
      <button type="button" class="btn primary" id="msSave">${t('save')}</button>
    </div>`);
  let status = b.move_status || '';
  $$('[data-st]', sheet).forEach((btn) => btn.onclick = () => {
    status = btn.dataset.st;
    $$('[data-st]', sheet).forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
  });
  $('#msSave', sheet).onclick = async () => {
    const vals = { move_status: status || null, dest_room: $('#msRoom', sheet).value || null, fragile: $('#msFragile', sheet).checked };
    try {
      must(await sb.from('boxes').update(vals).eq('id', b.id));
      Object.assign(b, vals);
      closeSheet();
      toast(t('saved'));
      if (document.body.dataset.page === 'moving') PAGES.moving.render(); else route();
    } catch (e) { toast(friendlyError(e)); }
  };
}

/* ---------- selecting several boxes ---------- */
function renderSelectBar() {
  const bar = $('#selectBar');
  if (!bar) return;
  document.body.classList.toggle('selecting', !!S.select);
  if (!S.select) { bar.innerHTML = ''; bar.className = ''; return; }
  const n = S.select.size;
  bar.className = 'select-bar';
  bar.innerHTML = `
    <div class="sb-top"><span>${esc(tp('n_selected', n))}</span><button type="button" class="link-btn" data-act="select-all">${t('select_all')}</button></div>
    <div class="sb-actions">
      <button type="button" class="btn" data-act="bulk-place" ${n ? '' : 'disabled'}>${icon('pin')}<span>${t('bulk_move')}</span></button>
      ${movingOn() ? `<button type="button" class="btn" data-act="bulk-status" ${n ? '' : 'disabled'}>${icon('truck')}<span>${t('bulk_status')}</span></button>
      <button type="button" class="btn" data-act="bulk-room" ${n ? '' : 'disabled'}>${icon('home')}<span>${t('bulk_room')}</span></button>` : ''}
      <button type="button" class="btn" data-act="bulk-labels" ${n ? '' : 'disabled'}>${icon('printer')}<span>${t('bulk_labels')}</span></button>
    </div>`;
}
async function bulkUpdate(vals) {
  const ids = Array.from(S.select);
  if (!ids.length) return;
  if (S.offline) { toast(t('needs_connection')); return; }
  try {
    must(await sb.from('boxes').update(vals).in('id', ids));
    closeSheet();
    await loadBoxes();
    toast(tp('bulk_done', ids.length));
    S.select = null;
    renderBoxes();
  } catch (e) { toast(friendlyError(e)); }
}
function choiceSheet(title, choices, onPick) {
  const sheet = openSheet(`<h2>${esc(title)}</h2><ul class="menu">${choices.map((c, i) => `<li><button type="button" data-i="${i}">${c.dot ? `<span class="dot big" style="background:${esc(c.dot)}"></span>` : icon(c.icon || 'pin')}${esc(c.label)}</button></li>`).join('')}</ul>
    <div class="sheet-actions"><button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button></div>`);
  $$('[data-i]', sheet).forEach((b) => b.onclick = () => onPick(choices[+b.dataset.i].value));
}

Object.assign(ACTIONS, {
  'select-mode': () => { S.select = S.select ? null : new Set(); S.query = ''; renderBoxes(); },
  'toggle-select': (el) => {
    if (!S.select) return;
    const id = el.dataset.id;
    if (S.select.has(id)) S.select.delete(id); else S.select.add(id);
    el.classList.toggle('picked', S.select.has(id));
    el.setAttribute('aria-pressed', String(S.select.has(id)));
    const tick = $('.tick', el);
    if (tick) tick.innerHTML = S.select.has(id) ? icon('check') : '';
    renderSelectBar();
  },
  'select-all': () => { filteredBoxes().forEach((b) => S.select.add(b.id)); renderHomeBody(); },
  'bulk-place': () => choiceSheet(t('bulk_place_title', { n: S.select.size }),
    [{ label: t('no_place'), value: null, icon: 'close' }].concat(S.locations.map((l) => ({ label: l.name, value: l.id, dot: l.color }))),
    (v) => bulkUpdate({ location_id: v })),
  'bulk-status': () => choiceSheet(t('bulk_status_title', { n: S.select.size }),
    [{ label: t('move_none'), value: null, icon: 'close' }].concat(MOVE_STATUSES.map((st) => ({ label: t('move_' + st), value: st, icon: 'truck' }))),
    (v) => bulkUpdate({ move_status: v })),
  'bulk-room': () => choiceSheet(t('bulk_room_title', { n: S.select.size }),
    [{ label: t('room_none'), value: null, icon: 'close' }].concat(rooms().map((r) => ({ label: r.name, value: r.name, dot: safeColor(r.color) }))),
    (v) => bulkUpdate({ dest_room: v })),
  'bulk-labels': () => { S.labelSel = new Set(S.select); S.select = null; location.hash = '#/labels'; },
  'moving-toggle': () => toggleMoving(),
  'move-box-status': (el) => openMoveStatusSheet(el.dataset.id),
  'open-box': (el) => { location.hash = '#/box/' + encodeURIComponent(el.dataset.id); },
  'room-remove': async (el) => {
    const list = rooms().slice();
    list.splice(+el.dataset.i, 1);
    try { await saveSpace({ rooms: list }); PAGES.moving.render(); } catch (e) { toast(friendlyError(e)); }
  }
});

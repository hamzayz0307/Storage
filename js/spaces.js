'use strict';
/* =====================================================================
   Spaces & business: several spaces per person, members with roles
   (owner / editor / viewer / customer), invite links, customers who only
   see their own units, retrieval requests, activity log, branding.
   ===================================================================== */

Object.assign(I18N.en, {
  switch_space: 'Switch space',
  spaces_title: 'Your spaces',
  space_current: 'Open now',
  space_new: 'Create a new space',
  space_new_title: 'New space',
  space_name: 'Name',
  space_name_ph: 'e.g. Family storage, HG Depo',
  space_kind: 'Type',
  kind_personal: 'Personal or family',
  kind_business: 'Business',
  kind_personal_hint: 'For your own things. Invite family as editors or viewers.',
  kind_business_hint: 'For a storage business: units, customers who see only their own unit, requests and branding.',
  create_space: 'Create space',
  space_created: 'Space created',
  space_settings: 'Space settings',
  role_owner: 'Owner',
  role_editor: 'Editor',
  role_viewer: 'Viewer',
  role_customer: 'Customer',
  role_editor_hint: 'Can add and change boxes and items.',
  role_viewer_hint: 'Can look and search, but not change anything.',
  role_customer_hint: 'Sees only the units you choose, and can request boxes.',
  your_role: 'Your role: {role}',
  space_page_intro: 'Settings for {space}.',
  branding: 'Branding',
  brand_name: 'Company name on the app and labels',
  brand_color: 'Brand colour',
  logo: 'Logo',
  logo_add: 'Add logo',
  logo_change: 'Change logo',
  logo_remove: 'Remove logo',
  currency: 'Currency for values',
  members: 'People',
  members_intro: 'Everyone who can open this space.',
  invite: 'Invite someone',
  invite_title: 'Invite to {space}',
  invite_role: 'They join as',
  invite_units: 'Which units can they see?',
  invite_units_none: 'Add units on the Units page first.',
  invite_make: 'Create invite link',
  invite_ready: 'Invite link ready',
  invite_ready_body: 'Send this link to the person. It works once and expires in 7 days.',
  invite_err_units: 'Choose at least one unit.',
  invites_open: 'Open invites',
  invite_row: '{role} invite, expires {date}',
  invite_revoke: 'Cancel invite',
  invite_revoked: 'Invite cancelled',
  invite_join_title: 'Join {space}?',
  invite_join_body: '{who} invited you as {role}.',
  invite_join_body_anon: 'You were invited as {role}.',
  invite_join: 'Join',
  invite_joined: 'You joined {space}',
  invite_invalid: 'This invite link has expired or was already used. Ask for a new one.',
  invite_already: 'You’re already in {space}.',
  member_you: 'You',
  member_units: 'Units: {list}',
  member_title: 'Change access',
  member_role: 'Role',
  member_remove: 'Remove from space',
  member_remove_q: 'Remove {who}?',
  member_remove_body: 'They lose access to this space right away.',
  member_removed: 'Removed',
  leave_space: 'Leave this space',
  leave_space_q: 'Leave {space}?',
  leave_space_body: 'You’ll lose access until someone invites you again.',
  left_space: 'You left {space}',
  delete_space: 'Delete this space',
  delete_space_q: 'Delete {space}?',
  delete_space_body: 'All boxes, items, photos and history in this space are deleted for everyone. This can’t be undone.',
  space_deleted: 'Space deleted',
  activity: 'Activity',
  activity_intro: 'Who added, moved or took out what, and when.',
  activity_empty: 'Nothing has happened yet.',
  activity_more: 'Show older',
  someone: 'Someone',
  act_item_added: '{who} added {name} to {box}',
  act_item_removed: '{who} removed {name} from {box}',
  act_item_moved: '{who} moved {name} from {from} to {box}',
  act_item_taken_out: '{who} took {name} out of {box}',
  act_item_taken_out_to: '{who} gave {name} from {box} to {to}',
  act_item_returned: '{who} put {name} back in {box}',
  act_item_quantity: '{who} changed {name} in {box} from {from} to {to}',
  act_item_renamed: '{who} renamed {from} to {name} in {box}',
  act_item_edited: '{who} edited {name} in {box}',
  act_box_created: '{who} created box {box} {name}',
  act_box_deleted: '{who} deleted box {box} {name}',
  act_box_moved: '{who} moved box {box} from {from} to {to}',
  act_box_status: '{who} marked {box} as {status}',
  act_box_renamed: '{who} renamed box {box} to {name}',
  act_box_edited: '{who} edited box {box}',
  act_request_created: '{who} asked for box {box}',
  act_request_ready: '{who} marked the request for {box} ready',
  act_request_done: '{who} handed over box {box}',
  act_request_cancelled: '{who} cancelled the request for {box}',
  nowhere: 'no place',
  requests: 'Requests',
  requests_intro_staff: 'Boxes customers asked for. Mark them ready when they’re fetched, and done when handed over.',
  requests_intro_customer: 'Boxes you asked for. You’ll see here when they’re ready.',
  requests_empty: 'No requests.',
  req_open: 'Waiting',
  req_ready: 'Ready',
  req_done: 'Done',
  req_cancelled: 'Cancelled',
  req_mark_ready: 'Mark ready',
  req_mark_done: 'Handed over',
  req_cancel: 'Cancel request',
  req_from: 'From {who}',
  request_box: 'Request this box',
  request_title: 'Request {code}',
  request_body: 'The storage team gets your request and gets the box ready.',
  request_note: 'Note for the team',
  request_note_ph: 'e.g. I’ll pick it up on Saturday morning',
  request_send: 'Send request',
  request_sent: 'Request sent',
  request_waiting: 'Requested. Waiting for the team.',
  request_ready_msg: 'Ready for you to pick up.',
  att_requests_one: '1 open request',
  att_requests_other: '{n} open requests',
  att_my_requests_one: '1 request in progress',
  att_my_requests_other: '{n} requests in progress',
  customer_no_boxes: 'No boxes in your unit yet. They’ll appear here once the storage team adds them.',
  viewer_no_boxes: 'No boxes in this space yet.',
  items_empty_view: 'Nothing listed in this box yet.',
  space_settings_row_sub: '{role}, {n} people',
  unit_or_place: 'Unit or place',
  units_title: 'Units',
  units_intro: 'The storage units or rooms where boxes are kept. Customers see only the units you give them.',
  add_unit: 'Add unit',
  unit_title_new: 'New unit',
  unit_name_ph: 'e.g. Unit 14B',
  err_too_many_spaces: 'You can own up to 10 spaces.'
});
Object.assign(I18N.tr, {
  switch_space: 'Alan değiştir',
  spaces_title: 'Alanların',
  space_current: 'Şu an açık',
  space_new: 'Yeni alan oluştur',
  space_new_title: 'Yeni alan',
  space_name: 'Ad',
  space_name_ph: 'ör. Aile deposu, HG Depo',
  space_kind: 'Tür',
  kind_personal: 'Kişisel ya da aile',
  kind_business: 'İşletme',
  kind_personal_hint: 'Kendi eşyaların için. Aileni düzenleyici ya da izleyici olarak davet et.',
  kind_business_hint: 'Depo işletmesi için: birimler, yalnızca kendi birimini gören müşteriler, talepler ve marka.',
  create_space: 'Alanı oluştur',
  space_created: 'Alan oluşturuldu',
  space_settings: 'Alan ayarları',
  role_owner: 'Sahip',
  role_editor: 'Düzenleyici',
  role_viewer: 'İzleyici',
  role_customer: 'Müşteri',
  role_editor_hint: 'Kutu ve eşya ekleyip değiştirebilir.',
  role_viewer_hint: 'Bakıp arayabilir ama bir şey değiştiremez.',
  role_customer_hint: 'Yalnızca seçtiğin birimleri görür ve kutu talep edebilir.',
  your_role: 'Rolün: {role}',
  space_page_intro: '{space} ayarları.',
  branding: 'Marka',
  brand_name: 'Uygulamada ve etiketlerde görünecek firma adı',
  brand_color: 'Marka rengi',
  logo: 'Logo',
  logo_add: 'Logo ekle',
  logo_change: 'Logoyu değiştir',
  logo_remove: 'Logoyu kaldır',
  currency: 'Değerler için para birimi',
  members: 'Kişiler',
  members_intro: 'Bu alanı açabilen herkes.',
  invite: 'Birini davet et',
  invite_title: '{space} alanına davet et',
  invite_role: 'Katılacağı rol',
  invite_units: 'Hangi birimleri görebilsin?',
  invite_units_none: 'Önce Birimler sayfasından birim ekle.',
  invite_make: 'Davet bağlantısı oluştur',
  invite_ready: 'Davet bağlantısı hazır',
  invite_ready_body: 'Bu bağlantıyı kişiye gönder. Bir kez çalışır ve 7 gün içinde geçersiz olur.',
  invite_err_units: 'En az bir birim seç.',
  invites_open: 'Açık davetler',
  invite_row: '{role} daveti, {date} tarihine kadar',
  invite_revoke: 'Daveti iptal et',
  invite_revoked: 'Davet iptal edildi',
  invite_join_title: '{space} alanına katılmak ister misin?',
  invite_join_body: '{who} seni {role} olarak davet etti.',
  invite_join_body_anon: '{role} olarak davet edildin.',
  invite_join: 'Katıl',
  invite_joined: '{space} alanına katıldın',
  invite_invalid: 'Bu davet bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı iste.',
  invite_already: 'Zaten {space} alanındasın.',
  member_you: 'Sen',
  member_units: 'Birimler: {list}',
  member_title: 'Erişimi değiştir',
  member_role: 'Rol',
  member_remove: 'Alandan çıkar',
  member_remove_q: '{who} çıkarılsın mı?',
  member_remove_body: 'Bu alana erişimi hemen sona erer.',
  member_removed: 'Çıkarıldı',
  leave_space: 'Bu alandan ayrıl',
  leave_space_q: '{space} alanından ayrılmak istiyor musun?',
  leave_space_body: 'Biri seni tekrar davet edene kadar erişimin olmaz.',
  left_space: '{space} alanından ayrıldın',
  delete_space: 'Bu alanı sil',
  delete_space_q: '{space} silinsin mi?',
  delete_space_body: 'Bu alandaki tüm kutular, eşyalar, fotoğraflar ve geçmiş herkes için silinir. Bu geri alınamaz.',
  space_deleted: 'Alan silindi',
  activity: 'Hareketler',
  activity_intro: 'Kim neyi ne zaman ekledi, taşıdı ya da dışarı çıkardı.',
  activity_empty: 'Henüz bir hareket yok.',
  activity_more: 'Daha eskileri göster',
  someone: 'Biri',
  act_item_added: '{who}, {box} kutusuna {name} ekledi',
  act_item_removed: '{who}, {box} kutusundan {name} sildi',
  act_item_moved: '{who}, {name} eşyasını {from} kutusundan {box} kutusuna taşıdı',
  act_item_taken_out: '{who}, {box} kutusundan {name} çıkardı',
  act_item_taken_out_to: '{who}, {box} kutusundaki {name} eşyasını {to} kişisine verdi',
  act_item_returned: '{who}, {name} eşyasını {box} kutusuna geri koydu',
  act_item_quantity: '{who}, {box} kutusundaki {name} adedini {from} → {to} yaptı',
  act_item_renamed: '{who}, {box} kutusunda {from} adını {name} yaptı',
  act_item_edited: '{who}, {box} kutusundaki {name} eşyasını düzenledi',
  act_box_created: '{who}, {box} {name} kutusunu oluşturdu',
  act_box_deleted: '{who}, {box} {name} kutusunu sildi',
  act_box_moved: '{who}, {box} kutusunu {from} yerinden {to} yerine taşıdı',
  act_box_status: '{who}, {box} kutusunu "{status}" olarak işaretledi',
  act_box_renamed: '{who}, {box} kutusunun adını {name} yaptı',
  act_box_edited: '{who}, {box} kutusunu düzenledi',
  act_request_created: '{who}, {box} kutusunu talep etti',
  act_request_ready: '{who}, {box} talebini hazır olarak işaretledi',
  act_request_done: '{who}, {box} kutusunu teslim etti',
  act_request_cancelled: '{who}, {box} talebini iptal etti',
  nowhere: 'yeri yok',
  requests: 'Talepler',
  requests_intro_staff: 'Müşterilerin istediği kutular. Getirildiğinde hazır, teslim edildiğinde tamamlandı olarak işaretle.',
  requests_intro_customer: 'İstediğin kutular. Hazır olduklarında burada görürsün.',
  requests_empty: 'Talep yok.',
  req_open: 'Bekliyor',
  req_ready: 'Hazır',
  req_done: 'Tamamlandı',
  req_cancelled: 'İptal edildi',
  req_mark_ready: 'Hazır işaretle',
  req_mark_done: 'Teslim edildi',
  req_cancel: 'Talebi iptal et',
  req_from: '{who} istedi',
  request_box: 'Bu kutuyu talep et',
  request_title: '{code} kutusunu talep et',
  request_body: 'Depo ekibi talebini alır ve kutuyu hazırlar.',
  request_note: 'Ekip için not',
  request_note_ph: 'ör. Cumartesi sabah gelip alacağım',
  request_send: 'Talebi gönder',
  request_sent: 'Talep gönderildi',
  request_waiting: 'Talep edildi. Ekip bekleniyor.',
  request_ready_msg: 'Teslim almaya hazır.',
  att_requests_one: '1 açık talep',
  att_requests_other: '{n} açık talep',
  att_my_requests_one: '1 talebin işlemde',
  att_my_requests_other: '{n} talebin işlemde',
  customer_no_boxes: 'Biriminde henüz kutu yok. Depo ekibi ekleyince burada görünecek.',
  viewer_no_boxes: 'Bu alanda henüz kutu yok.',
  items_empty_view: 'Bu kutuda henüz bir şey listelenmemiş.',
  space_settings_row_sub: '{role}, {n} kişi',
  unit_or_place: 'Birim ya da yer',
  units_title: 'Birimler',
  units_intro: 'Kutuların durduğu depo birimleri ya da odalar. Müşteriler yalnızca onlara verdiğin birimleri görür.',
  add_unit: 'Birim ekle',
  unit_title_new: 'Yeni birim',
  unit_name_ph: 'ör. Birim 14B',
  err_too_many_spaces: 'En fazla 10 alanın sahibi olabilirsin.'
});

const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'];
function roleLabel(r) { return t('role_' + r); }

// Capture an invite link (/?invite=<token>) before sign-in, so it survives the login.
(function () {
  const tok = new URLSearchParams(location.search).get('invite');
  if (tok) { try { sessionStorage.setItem('bf_invite', tok); } catch (e) {} }
})();

/* ---------- requests (loaded with the space) ---------- */
S.requests = [];
async function loadRequests() {
  if (!S.space || S.offline) return;
  if (!isBusiness() && S.role !== 'customer') { S.requests = []; return; }
  S.requests = must(await sb.from('retrieval_requests').select('id,box_id,requested_by,note,status,created_at,updated_at,handled_by').eq('space_id', S.space.id).order('created_at', { ascending: false }).limit(200)) || [];
}
HOOKS.afterLoad.push(loadRequests);
function activeRequestFor(boxId) { return S.requests.find((r) => r.box_id === boxId && (r.status === 'open' || r.status === 'ready')); }

HOOKS.homeTop.push(() => {
  const active = S.requests.filter((r) => r.status === 'open' || r.status === 'ready');
  if (!active.length) return '';
  const key = S.role === 'customer' ? 'att_my_requests' : 'att_requests';
  const n = S.role === 'customer' ? active.length : S.requests.filter((r) => r.status === 'open').length;
  if (!n) return '';
  return `<ul class="list attention"><li><a class="att-row" href="#/requests">${icon('inbox')}<span>${esc(tp(key, n))}</span>${icon('chevron')}</a></li></ul>`;
});
HOOKS.tileBadges.push((b) => {
  const r = activeRequestFor(b.id);
  if (!r) return '';
  return badge(r.status === 'ready' ? t('req_ready') : t('req_open'), r.status === 'ready' ? 'ok' : 'info', 'inbox');
});
HOOKS.boxActions.push((b) => {
  const r = activeRequestFor(b.id);
  if (r) {
    return `<div class="notice ${r.status === 'ready' ? 'ok' : ''}">${icon('inbox')}<span>${esc(r.status === 'ready' ? t('request_ready_msg') : t('request_waiting'))}${r.note ? ` <em>${esc(r.note)}</em>` : ''}</span>
      ${ROLE.canEdit() ? `<a class="btn small" href="#/requests">${t('requests')}</a>` : (r.requested_by === (S.user && S.user.id) && r.status === 'open' ? `<button type="button" class="btn small" data-act="req-set" data-id="${esc(r.id)}" data-status="cancelled">${t('req_cancel')}</button>` : '')}
    </div>`;
  }
  if (S.role === 'customer') return `<button type="button" class="btn primary big" data-act="request-box">${icon('inbox')}<span>${t('request_box')}</span></button>`;
  return '';
});
HOOKS.labelExtra.push(() => (isBusiness() && S.space.brand_name ? `<div class="pl-brand">${esc(S.space.brand_name)}</div>` : ''));

function openRequestSheet() {
  const box = S.current.box;
  if (S.offline) { toast(t('needs_connection')); return; }
  const sheet = openSheet(`
    <h2>${esc(t('request_title', { code: box.code }))}</h2>
    <p class="lead">${t('request_body')}</p>
    <label class="field"><span>${t('request_note')} <span class="opt">${t('optional')}</span></span>
      <textarea class="input" id="reqNote" rows="2" maxlength="500" placeholder="${t('request_note_ph')}"></textarea></label>
    <div class="error" id="reqErr" hidden></div>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="reqSend">${t('request_send')}</button>
    </div>`);
  $('#reqSend', sheet).onclick = async () => {
    try {
      must(await sb.from('retrieval_requests').insert({ box_id: box.id, note: $('#reqNote', sheet).value.trim() || null }));
      await loadRequests();
      closeSheet();
      toast(t('request_sent'));
      paintBox();
    } catch (e) {
      const el = $('#reqErr', sheet);
      el.textContent = /duplicate|unique/i.test(String(e.message)) ? t('request_waiting') : friendlyError(e);
      el.hidden = false;
    }
  };
}
async function setRequestStatus(id, status) {
  if (S.offline) { toast(t('needs_connection')); return; }
  try {
    must(await sb.from('retrieval_requests').update({ status }).eq('id', id));
    await loadRequests();
    toast(t('saved'));
    if (document.body.dataset.page === 'requests') PAGES.requests.render(); else if (S.current) paintBox(); else route();
  } catch (e) { toast(friendlyError(e)); }
}

let memberNames = {};
PAGES.requests = {
  tab: 'requests',
  async render() {
    const staff = ROLE.isStaff();
    const view = $('#view');
    if (!S.offline) { try { await loadRequests(); } catch (e) { /* show what we have */ } }
    if (staff && ROLE.isStaff() && !Object.keys(memberNames).length && !S.offline) {
      try {
        const m = must(await sb.rpc('list_members', { p_space: S.space.id })) || [];
        m.forEach((x) => { memberNames[x.user_id] = x.display_name || (x.email || '').split('@')[0]; });
      } catch (e) { /* names are optional */ }
    }
    const groups = ['open', 'ready', 'done', 'cancelled'].map((st) => ({ st, list: S.requests.filter((r) => r.status === st) })).filter((g) => g.list.length);
    const row = (r) => {
      const b = boxById(r.box_id);
      const who = memberNames[r.requested_by] || (r.requested_by === (S.user && S.user.id) ? t('member_you') : t('someone'));
      const acts = [];
      if (ROLE.canEdit() && r.status === 'open') acts.push(['ready', 'req_mark_ready']);
      if (ROLE.canEdit() && (r.status === 'open' || r.status === 'ready')) acts.push(['done', 'req_mark_done']);
      if ((ROLE.canEdit() || r.requested_by === S.user.id) && r.status === 'open') acts.push(['cancelled', 'req_cancel']);
      return `<li class="req-row">
        <a class="result" href="#/box/${encodeURIComponent(r.box_id)}">
          <span class="result-main"><span class="result-name">${esc(b ? b.name : '')}</span>
          <span class="result-where">${staff ? esc(t('req_from', { who })) + ', ' : ''}${esc(fmtDate(r.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span>
          ${r.note ? `<span class="req-note">${esc(r.note)}</span>` : ''}</span>
          ${b ? `<span class="code-chip kraft">${esc(b.code)}</span>` : ''}
        </a>
        ${acts.length ? `<div class="req-actions">${acts.map(([st, key]) => `<button type="button" class="btn small${st === 'done' ? ' primary' : ''}" data-act="req-set" data-id="${esc(r.id)}" data-status="${st}">${t(key)}</button>`).join('')}</div>` : ''}
      </li>`;
    };
    view.innerHTML = `
      ${staff ? `<div class="bar"><a class="icon-btn" href="#/" aria-label="${t('back')}">${icon('back')}</a></div>` : ''}
      <header class="page-head"><h1 class="page-title">${t('requests')}</h1></header>
      <p class="page-intro">${staff ? t('requests_intro_staff') : t('requests_intro_customer')}</p>
      ${groups.length ? groups.map((g) => `<section class="group"><h2 class="group-name">${t('req_' + g.st)} (${g.list.length})</h2><ul class="list">${g.list.map(row).join('')}</ul></section>`).join('') : `<div class="empty"><p>${t('requests_empty')}</p></div>`}`;
  }
};

/* ---------- switching & creating spaces ---------- */
function openSpaceSwitcher() {
  const sheet = openSheet(`
    <h2>${t('spaces_title')}</h2>
    <ul class="menu space-menu">
      ${S.spaces.map((sp) => `<li><button type="button" data-space="${esc(sp.id)}" ${sp.id === S.space.id ? 'aria-current="true"' : ''}>
        ${icon(sp.kind === 'business' ? 'layers' : 'home')}
        <span class="sm-main"><span class="sm-name">${esc(sp.name)}</span><span class="sm-sub">${esc(roleLabel(sp.role))}${sp.id === S.space.id ? ', ' + esc(t('space_current')) : ''}</span></span>
        ${sp.id === S.space.id ? icon('check') : ''}
      </button></li>`).join('')}
      ${ROLE.isStaff() ? `<li><button type="button" data-act="space-settings">${icon('users')}${t('space_settings')}</button></li>` : ''}
      <li><button type="button" data-act="space-new">${icon('plus')}${t('space_new')}</button></li>
    </ul>`);
  $$('[data-space]', sheet).forEach((b) => b.onclick = () => switchTo(b.dataset.space));
}
async function switchTo(spaceId) {
  closeSheet();
  if (spaceId === S.space.id) return;
  if (S.offline) { toast(t('needs_connection')); return; }
  showBlocker(t('loading'));
  try {
    must(await sb.rpc('switch_space', { p_space: spaceId }));
    memberNames = {};
    await reloadSpace(true);
  } catch (e) { toast(friendlyError(e)); } finally { hideBlocker(); }
}
function openNewSpaceSheet() {
  const sheet = openSheet(`
    <h2>${t('space_new_title')}</h2>
    <form id="spaceForm" novalidate>
      <label class="field"><span>${t('space_name')}</span><input class="input" name="name" maxlength="60" required placeholder="${t('space_name_ph')}" autofocus></label>
      <div class="field"><span>${t('space_kind')}</span>
        <label class="radio-card"><input type="radio" name="kind" value="personal" checked><span><b>${t('kind_personal')}</b><small>${t('kind_personal_hint')}</small></span></label>
        <label class="radio-card"><input type="radio" name="kind" value="business"><span><b>${t('kind_business')}</b><small>${t('kind_business_hint')}</small></span></label>
      </div>
      <div class="error" id="spaceErr" hidden></div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
        <button type="submit" class="btn primary">${t('create_space')}</button>
      </div>
    </form>`);
  const form = $('#spaceForm', sheet);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const err = $('#spaceErr', sheet);
    if (!name) { err.textContent = t('err_name_required'); err.hidden = false; return; }
    try {
      must(await sb.rpc('create_space', { p_name: name, p_kind: form.kind.value }));
      closeSheet();
      memberNames = {};
      await reloadSpace(true);
      toast(t('space_created'));
    } catch (ex) {
      err.textContent = /too many/i.test(String(ex.message)) ? t('err_too_many_spaces') : friendlyError(ex);
      err.hidden = false;
    }
  };
}

/* ---------- space settings page ---------- */
PAGES.space = {
  tab: 'me',
  async render() {
    const owner = ROLE.isOwner();
    const edit = ROLE.canEdit();
    const sp = S.space;
    const view = $('#view');
    let members = [], invites = [];
    try {
      if (!S.offline) {
        members = must(await sb.rpc('list_members', { p_space: sp.id })) || [];
        members.forEach((x) => { memberNames[x.user_id] = x.display_name || (x.email || '').split('@')[0]; });
        if (owner) invites = must(await sb.from('space_invites').select('id,role,location_ids,expires_at,used_at').eq('space_id', sp.id).is('used_at', null).order('created_at', { ascending: false })) || [];
        invites = invites.filter((i) => new Date(i.expires_at) > new Date());
      }
    } catch (e) { /* show the rest */ }
    if (document.body.dataset.page !== 'space') return;
    const locName = (id) => locationName(id) || '?';
    view.innerHTML = `
      <div class="bar"><a class="icon-btn" href="#/me" aria-label="${t('back')}">${icon('back')}</a></div>
      <header class="page-head"><h1 class="page-title">${esc(sp.name)}</h1><p class="page-sub">${esc(t(sp.kind === 'business' ? 'kind_business' : 'kind_personal'))}, ${esc(t('your_role', { role: roleLabel(S.role) }))}</p></header>
      <div class="stack">
        ${edit ? `<section>
          <label class="field" style="margin:0"><span>${t('space_name')}</span><input class="input" id="spName" maxlength="60" value="${esc(sp.name)}"></label>
        </section>
        <section>
          <label class="field" style="margin:0"><span>${t('currency')}</span><select class="input" id="spCurrency">${CURRENCIES.map((c) => `<option ${sp.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        </section>` : ''}
        ${edit && sp.kind === 'business' ? `<section>
          <h2 class="setting-title">${t('branding')}</h2>
          <label class="field"><span>${t('brand_name')}</span><input class="input" id="spBrand" maxlength="60" value="${esc(sp.brand_name || '')}"></label>
          <div id="spColor">${colorPicker('brandColor', sp.brand_color)}</div>
          <div class="field"><span>${t('logo')}</span>
            <div class="logo-box">${sp.logo_path ? `<img class="logo-preview" data-path="${esc(sp.logo_path)}" alt="">` : ''}
              <button type="button" class="btn small" id="logoPick">${sp.logo_path ? t('logo_change') : t('logo_add')}</button>
              ${sp.logo_path ? `<button type="button" class="link-btn danger-text" id="logoRemove">${t('logo_remove')}</button>` : ''}
            </div>
            <input type="file" id="logoInput" accept="image/*" hidden></div>
        </section>` : ''}
        <section>
          <h2 class="setting-title">${t('members')}</h2>
          <p class="muted" style="margin:0 0 10px">${t('members_intro')}</p>
          <ul class="list member-list">
            ${members.map((m) => `<li><button type="button" class="place-row" ${owner && m.role !== 'owner' ? `data-act="member-open" data-id="${esc(m.user_id)}"` : 'disabled'}>
              ${icon('users')}<span class="place-name">${esc(m.display_name || m.email || '')}${m.user_id === S.user.id ? ` (${t('member_you')})` : ''}
              <span class="row-sub">${esc(roleLabel(m.role))}${m.display_name && m.email ? ', ' + esc(m.email) : ''}${m.role === 'customer' && m.location_ids.length ? '. ' + esc(t('member_units', { list: m.location_ids.map(locName).join(', ') })) : ''}</span></span>
              ${owner && m.role !== 'owner' ? icon('chevron') : ''}
            </button></li>`).join('')}
          </ul>
          ${owner ? `<button type="button" class="btn primary block" style="margin-top:12px" data-act="invite-new">${icon('plus')}${t('invite')}</button>` : ''}
          ${invites.length ? `<h3 class="group-name" style="margin-top:16px">${t('invites_open')}</h3><ul class="list">
            ${invites.map((i) => `<li><div class="place-row">${icon('message')}<span class="place-name">${esc(t('invite_row', { role: roleLabel(i.role), date: fmtDate(i.expires_at, { day: 'numeric', month: 'short' }) }))}${i.location_ids.length ? `<span class="row-sub">${esc(i.location_ids.map(locName).join(', '))}</span>` : ''}</span>
              <button type="button" class="btn small" data-act="invite-link" data-id="${esc(i.id)}">${t('copy_link')}</button>
              <button type="button" class="icon-btn" data-act="invite-revoke" data-id="${esc(i.id)}" aria-label="${t('invite_revoke')}">${icon('close')}</button></div></li>`).join('')}
          </ul>` : ''}
        </section>
        <section><ul class="list">
          <li><a class="place-row" href="#/activity">${icon('history')}<span class="place-name">${t('activity')}<span class="row-sub">${t('activity_intro')}</span></span>${icon('chevron')}</a></li>
          ${sp.kind === 'business' ? `<li><a class="place-row" href="#/requests">${icon('inbox')}<span class="place-name">${t('requests')}</span>${icon('chevron')}</a></li>` : ''}
        </ul></section>
        <section>
          ${owner ? `<button type="button" class="danger-link" data-act="space-delete">${t('delete_space')}</button>` : `<button type="button" class="danger-link" data-act="space-leave">${t('leave_space')}</button>`}
        </section>
      </div>`;
    hydrateImages(view);
    const save = async (vals) => {
      try { await saveSpace(vals); applySpaceLook(); toast(t('saved')); S.spaces.forEach((x) => { if (x.id === sp.id) Object.assign(x, vals); }); }
      catch (e) { toast(friendlyError(e)); }
    };
    if ($('#spName')) $('#spName').onchange = (e) => { const v = e.target.value.trim(); if (v) save({ name: v }); };
    if ($('#spCurrency')) $('#spCurrency').onchange = (e) => save({ currency: e.target.value });
    if ($('#spBrand')) $('#spBrand').onchange = (e) => save({ brand_name: e.target.value.trim() || null });
    $$('#spColor input[name=brandColor]').forEach((r) => r.onchange = () => save({ brand_color: r.value || null }));
    if ($('#logoPick')) $('#logoPick').onclick = () => $('#logoInput').click();
    if ($('#logoInput')) $('#logoInput').onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      showBlocker(t('saving'));
      try {
        const img = await prepareImage(f, 600);
        const path = `${sp.id}/brand/${uuid()}.jpg`;
        must(await sb.storage.from(BUCKET).upload(path, img.blob, { contentType: 'image/jpeg', upsert: false }));
        const old = sp.logo_path;
        await saveSpace({ logo_path: path });
        if (old) removeFiles([old]).catch(() => {});
        PAGES.space.render();
      } catch (ex) { toast(friendlyError(ex)); } finally { hideBlocker(); }
    };
    if ($('#logoRemove')) $('#logoRemove').onclick = async () => {
      const old = sp.logo_path;
      try { await saveSpace({ logo_path: null }); removeFiles([old]).catch(() => {}); PAGES.space.render(); } catch (e) { toast(friendlyError(e)); }
    };
    PAGES.space.members = members;
  }
};

function inviteUrl(token) { return location.origin + '/?invite=' + encodeURIComponent(token); }
function openInviteSheet() {
  const biz = isBusiness();
  const roles = biz ? ['customer', 'editor', 'viewer'] : ['editor', 'viewer'];
  const sheet = openSheet(`
    <h2>${esc(t('invite_title', { space: S.space.name }))}</h2>
    <div class="field"><span>${t('invite_role')}</span>
      ${roles.map((r, i) => `<label class="radio-card"><input type="radio" name="invRole" value="${r}" ${i === 0 ? 'checked' : ''}><span><b>${roleLabel(r)}</b><small>${t('role_' + r + '_hint')}</small></span></label>`).join('')}
    </div>
    ${biz ? `<div class="field" id="invUnits"><span>${t('invite_units')}</span>
      ${S.locations.length ? `<ul class="list pick-list">${S.locations.map((l) => `<li><label><input type="checkbox" value="${esc(l.id)}"><span class="pl-main"><span class="pl-name">${esc(l.name)}</span></span></label></li>`).join('')}</ul>` : `<p class="muted" style="margin:0">${t('invite_units_none')}</p>`}
    </div>` : ''}
    <div class="error" id="invErr" hidden></div>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="invMake">${t('invite_make')}</button>
    </div>`);
  const sync = () => {
    const role = sheet.querySelector('input[name=invRole]:checked').value;
    const units = $('#invUnits', sheet);
    if (units) units.hidden = role !== 'customer';
  };
  $$('input[name=invRole]', sheet).forEach((r) => r.onchange = sync);
  sync();
  $('#invMake', sheet).onclick = async () => {
    const role = sheet.querySelector('input[name=invRole]:checked').value;
    const locs = role === 'customer' ? $$('#invUnits input:checked', sheet).map((c) => c.value) : [];
    const err = $('#invErr', sheet);
    if (role === 'customer' && !locs.length) { err.textContent = t('invite_err_units'); err.hidden = false; return; }
    try {
      const token = must(await sb.rpc('create_invite', { p_space: S.space.id, p_role: role, p_locations: locs }));
      showInviteLink(token);
    } catch (e) { err.textContent = friendlyError(e); err.hidden = false; }
  };
}
function showInviteLink(token) {
  const url = inviteUrl(token);
  const sheet = openSheet(`
    <h2>${t('invite_ready')}</h2>
    <p class="lead">${t('invite_ready_body')}</p>
    <div class="link-field"><input class="input" readonly value="${esc(url)}" id="invUrl" aria-label="${t('copy_link')}"></div>
    <div class="pick-row" style="margin-top:10px">
      ${navigator.share ? `<button type="button" class="btn primary" id="invSend">${icon('share')}<span>${t('share_send')}</span></button>` : ''}
      <button type="button" class="btn" id="invCopy">${t('copy_link')}</button>
    </div>
    <div class="sheet-actions"><button type="button" class="btn" data-act="sheet-close">${t('close')}</button></div>`, { onClose: () => { if (document.body.dataset.page === 'space') PAGES.space.render(); } });
  $('#invCopy', sheet).onclick = async () => { if (await copyText(url)) toast(t('link_copied')); else $('#invUrl', sheet).select(); };
  const send = $('#invSend', sheet);
  if (send) send.onclick = () => navigator.share({ title: S.space.name, url }).catch(() => {});
}
function openMemberSheet(userId) {
  const m = (PAGES.space.members || []).find((x) => x.user_id === userId);
  if (!m) return;
  const roles = isBusiness() ? ['editor', 'viewer', 'customer'] : ['editor', 'viewer'];
  const sheet = openSheet(`
    <h2>${esc(m.display_name || m.email || '')}</h2>
    <p class="lead">${esc(m.email || '')}</p>
    <div class="field"><span>${t('member_role')}</span>
      ${roles.map((r) => `<label class="radio-card"><input type="radio" name="mRole" value="${r}" ${m.role === r ? 'checked' : ''}><span><b>${roleLabel(r)}</b><small>${t('role_' + r + '_hint')}</small></span></label>`).join('')}
    </div>
    ${isBusiness() ? `<div class="field" id="mUnits"><span>${t('invite_units')}</span>
      <ul class="list pick-list">${S.locations.map((l) => `<li><label><input type="checkbox" value="${esc(l.id)}" ${m.location_ids.includes(l.id) ? 'checked' : ''}><span class="pl-main"><span class="pl-name">${esc(l.name)}</span></span></label></li>`).join('')}</ul>
    </div>` : ''}
    <button type="button" class="danger-link" id="mRemove">${t('member_remove')}</button>
    <div class="error" id="mErr" hidden></div>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="mSave">${t('save')}</button>
    </div>`);
  const sync = () => { const u = $('#mUnits', sheet); if (u) u.hidden = sheet.querySelector('input[name=mRole]:checked').value !== 'customer'; };
  $$('input[name=mRole]', sheet).forEach((r) => r.onchange = sync);
  sync();
  $('#mSave', sheet).onclick = async () => {
    const role = sheet.querySelector('input[name=mRole]:checked').value;
    const err = $('#mErr', sheet);
    try {
      if (role !== m.role) must(await sb.rpc('set_member_role', { p_space: S.space.id, p_user: m.user_id, p_role: role }));
      if (role === 'customer') {
        const locs = $$('#mUnits input:checked', sheet).map((c) => c.value);
        if (!locs.length) { err.textContent = t('invite_err_units'); err.hidden = false; return; }
        must(await sb.rpc('set_member_locations', { p_space: S.space.id, p_user: m.user_id, p_locations: locs }));
      }
      closeSheet();
      toast(t('saved'));
      PAGES.space.render();
    } catch (e) { err.textContent = friendlyError(e); err.hidden = false; }
  };
  $('#mRemove', sheet).onclick = async () => {
    const who = m.display_name || m.email || '';
    const ok = await confirmSheet({ title: t('member_remove_q', { who }), body: t('member_remove_body'), confirm: t('member_remove'), danger: true });
    if (!ok) return;
    try { must(await sb.rpc('remove_member', { p_space: S.space.id, p_user: m.user_id })); toast(t('member_removed')); PAGES.space.render(); }
    catch (e) { toast(friendlyError(e)); }
  };
}
async function leaveSpace() {
  const name = S.space.name;
  const ok = await confirmSheet({ title: t('leave_space_q', { space: name }), body: t('leave_space_body'), confirm: t('leave_space'), danger: true });
  if (!ok) return;
  try {
    must(await sb.rpc('leave_space', { p_space: S.space.id }));
    memberNames = {};
    await reloadSpace(true);
    toast(t('left_space', { space: name }));
  } catch (e) { toast(friendlyError(e)); }
}
async function deleteSpace() {
  const sp = S.space;
  const ok = await confirmSheet({ title: t('delete_space_q', { space: sp.name }), body: t('delete_space_body'), confirm: t('delete_space'), danger: true });
  if (!ok) return;
  showBlocker(t('deleting'));
  try {
    await removeSpaceFiles(sp);
    must(await sb.from('spaces').delete().eq('id', sp.id));
    memberNames = {};
    await reloadSpace(true);
    toast(t('space_deleted'));
  } catch (e) { toast(friendlyError(e)); } finally { hideBlocker(); }
}

/* ---------- activity ---------- */
function activityText(a) {
  const d = a.details || {};
  const who = a.actor || t('someone');
  let key = 'act_' + a.action;
  if (a.action === 'item_taken_out' && d.to) key = 'act_item_taken_out_to';
  const vars = Object.assign({}, d, { who, box: d.box || '', from: d.from == null ? t('nowhere') : d.from, to: d.to == null ? t('nowhere') : d.to });
  if (a.action === 'box_status') vars.status = d.status ? t('move_' + d.status) : t('move_none');
  if (!I18N.en[key]) return `${who}: ${a.action}`;
  return t(key, vars);
}
const ACT_ICONS = { item_added: 'plus', item_removed: 'trash', item_moved: 'box', item_taken_out: 'out', item_returned: 'check2', box_created: 'box', box_deleted: 'trash', box_moved: 'pin', box_status: 'truck', request_created: 'inbox', request_ready: 'inbox', request_done: 'check2', request_cancelled: 'close' };
PAGES.activity = {
  tab: 'me',
  rows: [],
  async render(more) {
    const view = $('#view');
    if (!more) { PAGES.activity.rows = []; view.innerHTML = `<div class="center-screen"><div class="spinner"></div></div>`; }
    if (S.offline) { view.innerHTML = `<div class="empty"><p>${t('needs_connection')}</p></div>`; return; }
    let page = [];
    try {
      const before = more && PAGES.activity.rows.length ? PAGES.activity.rows[PAGES.activity.rows.length - 1].id : null;
      page = must(await sb.rpc('list_activity', { p_space: S.space.id, p_before: before, p_limit: 50 })) || [];
    } catch (e) { toast(friendlyError(e)); }
    if (document.body.dataset.page !== 'activity') return;
    PAGES.activity.rows = PAGES.activity.rows.concat(page);
    const rows = PAGES.activity.rows;
    const days = [];
    rows.forEach((a) => {
      const day = fmtDate(a.created_at, { weekday: 'long', day: 'numeric', month: 'long' });
      if (!days.length || days[days.length - 1].day !== day) days.push({ day, rows: [] });
      days[days.length - 1].rows.push(a);
    });
    const rowHtml = (a) => {
      const inner = `${icon(ACT_ICONS[a.action] || 'history')}<span class="act-main"><span class="act-text">${esc(activityText(a))}</span><span class="act-time">${esc(fmtDate(a.created_at, { hour: '2-digit', minute: '2-digit' }))}</span></span>`;
      return `<li>${a.box_id && boxById(a.box_id) ? `<a class="act-row" href="#/box/${encodeURIComponent(a.box_id)}">${inner}</a>` : `<div class="act-row">${inner}</div>`}</li>`;
    };
    const list = days.map((d) => `<section class="group"><h2 class="group-name">${esc(d.day)}</h2><ul class="list">${d.rows.map(rowHtml).join('')}</ul></section>`).join('');
    view.innerHTML = `
      <div class="bar"><a class="icon-btn" href="#/space" aria-label="${t('back')}">${icon('back')}</a></div>
      <header class="page-head"><h1 class="page-title">${t('activity')}</h1></header>
      <p class="page-intro">${t('activity_intro')}</p>
      ${rows.length ? list : `<div class="empty"><p>${t('activity_empty')}</p></div>`}
      ${page.length === 50 ? `<button type="button" class="btn block" style="margin-top:14px" data-act="activity-more">${t('activity_more')}</button>` : ''}`;
  }
};

/* ---------- Me page row ---------- */
HOOKS.meSections.push(() => `
  <section><ul class="list">
    <li><button type="button" class="place-row" data-act="${ROLE.isStaff() ? 'space-settings' : 'switch-space'}">${icon(isBusiness() ? 'layers' : 'home')}
      <span class="place-name">${esc(S.space.name)}<span class="row-sub">${esc(t('your_role', { role: roleLabel(S.role) }))}</span></span>${icon('chevron')}</button></li>
    ${S.spaces.length > 1 || ROLE.isStaff() ? `<li><button type="button" class="place-row" data-act="switch-space">${icon('layers')}<span class="place-name">${t('switch_space')}</span>${icon('chevron')}</button></li>` : ''}
  </ul></section>`);

/* ---------- invite links ---------- */
HOOKS.afterBoot.push(async () => {
  let tok = null;
  try { tok = sessionStorage.getItem('bf_invite'); sessionStorage.removeItem('bf_invite'); } catch (e) {}
  if (!tok || S.offline) return;
  let info = null;
  try { info = must(await sb.rpc('preview_invite', { p_token: tok })); } catch (e) { /* treated as invalid */ }
  if (!info) { toast(t('invite_invalid')); return; }
  if (info.already_member) {
    try { must(await sb.rpc('accept_invite', { p_token: tok })); await reloadSpace(true); } catch (e) {}
    toast(t('invite_already', { space: info.space_name }));
    return;
  }
  if (!info.valid) { toast(t('invite_invalid')); return; }
  const sheet = openSheet(`
    <section class="label-hero kraft invite-hero"><div class="code-xl">${esc(info.brand_name || info.space_name)}</div></section>
    <h2>${esc(t('invite_join_title', { space: info.space_name }))}</h2>
    <p class="lead">${esc(info.inviter ? t('invite_join_body', { who: info.inviter, role: roleLabel(info.role) }) : t('invite_join_body_anon', { role: roleLabel(info.role) }))} ${esc(t('role_' + info.role + '_hint'))}</p>
    <div class="error" id="joinErr" hidden></div>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="joinBtn">${t('invite_join')}</button>
    </div>`);
  $('#joinBtn', sheet).onclick = async () => {
    try {
      must(await sb.rpc('accept_invite', { p_token: tok }));
      closeSheet();
      memberNames = {};
      await reloadSpace(true);
      toast(t('invite_joined', { space: info.space_name }));
    } catch (e) {
      const el = $('#joinErr', sheet);
      el.textContent = /expired|not found/i.test(String(e.message)) ? t('invite_invalid') : friendlyError(e);
      el.hidden = false;
    }
  };
});

Object.assign(ACTIONS, {
  'switch-space': () => openSpaceSwitcher(),
  'space-new': () => openNewSpaceSheet(),
  'space-settings': () => { closeSheet(); location.hash = '#/space'; },
  'invite-new': () => openInviteSheet(),
  'invite-link': (el) => showInviteLink(el.dataset.id),
  'invite-revoke': async (el) => {
    try { must(await sb.from('space_invites').delete().eq('id', el.dataset.id)); toast(t('invite_revoked')); PAGES.space.render(); }
    catch (e) { toast(friendlyError(e)); }
  },
  'member-open': (el) => openMemberSheet(el.dataset.id),
  'space-leave': () => leaveSpace(),
  'space-delete': () => deleteSpace(),
  'activity-more': () => PAGES.activity.render(true),
  'request-box': () => openRequestSheet(),
  'req-set': (el) => setRequestStatus(el.dataset.id, el.dataset.status)
});

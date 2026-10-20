'use strict';
/* =====================================================================
   Records: taken out / lent, expiry dates, reminders, value & receipts,
   appliances & warranties (AI reads the label), share a box, export.
   ===================================================================== */

Object.assign(I18N.en, {
  out_section: 'Taken out or lent',
  out_check: 'This is out of the box right now',
  out_to: 'Who has it?',
  out_to_ph: 'e.g. Ali, or “in use in the kitchen”',
  out_badge: 'Taken out',
  out_badge_to: 'With {who}',
  put_back: 'Put back',
  put_back_done: '{name} is back in {code}',
  out_since: 'Since {date}',
  dates_section: 'Expiry date',
  expires_on: 'Use by / expires on',
  expired: 'Expired',
  expires_today: 'Expires today',
  expires_in_one: 'Expires tomorrow',
  expires_in_other: 'Expires in {n} days',
  value_section: 'Value and receipt',
  value_each: 'Value per piece',
  value_ph: 'e.g. 1500',
  value_bad: 'Type the value as a number, for example 1500 or 1499.90.',
  receipt: 'Receipt',
  add_receipt: 'Add receipt photo',
  replace_receipt: 'Replace',
  remove_receipt: 'Remove',
  receipt_view: 'Open receipt',
  box_value: 'Value of this box',
  box_value_note: 'Based on {n} items with a value.',
  appliance_section: 'Appliance details',
  is_appliance: 'This is an appliance or device',
  brand: 'Brand',
  model: 'Model',
  serial: 'Serial number',
  purchased_on: 'Bought on',
  warranty_until: 'Warranty until',
  read_label: 'Read the label with AI',
  read_label_hint: 'Take a photo of the sticker or rating plate. It uses one photo scan.',
  reading_label: 'Reading the label…',
  label_read: 'Filled in from the label. Check the numbers before saving.',
  label_unreadable: 'Couldn’t read the label. Try a sharper photo, closer and without glare.',
  appliance: 'Appliance',
  warranty_ends_in_one: 'Warranty ends tomorrow',
  warranty_ends_in_other: 'Warranty ends in {n} days',
  warranty_ends_today: 'Warranty ends today',
  warranty_ended: 'Warranty ended',
  reminder_section: 'Reminder',
  remind_on: 'Remind me on',
  remind_note: 'What to remember',
  remind_note_ph: 'e.g. Bring out the winter clothes',
  remind_yearly: 'Repeat every year',
  reminder_badge: 'Reminder {date}',
  reminder_due: 'Reminder today',
  reminder_done: 'Done',
  reminder_next: 'Next reminder {date}',
  reminder_cleared: 'Reminder done',
  n_out_box_one: '1 item taken out',
  n_out_box_other: '{n} items taken out',
  att_reminders_one: '1 reminder for today',
  att_reminders_other: '{n} reminders for today',
  att_out_one: '1 item is taken out',
  att_out_other: '{n} items are taken out',
  att_expiring_one: '1 item expires soon',
  att_expiring_other: '{n} items expire soon',
  att_warranty_one: '1 warranty ends soon',
  att_warranty_other: '{n} warranties end soon',
  att_title_reminders: 'Reminders',
  att_title_out: 'Taken out',
  att_title_expiring: 'Expiring soon',
  att_title_warranty: 'Warranties ending',
  att_intro_out: 'Things that aren’t in their box right now. Tap “Put back” when they’re returned.',
  att_intro_expiring: 'Items that expire in the next 30 days, or already have.',
  att_intro_warranty: 'Appliances whose warranty ends in the next 60 days.',
  att_intro_reminders: 'Boxes with a reminder for today or earlier.',
  att_empty: 'Nothing here right now.',
  share_box: 'Share this box',
  share_title: 'Share {code}',
  share_body: 'Anyone with this link can see the box name, where it is and what’s inside. Values, serial numbers and notes stay private.',
  copy_link: 'Copy link',
  link_copied: 'Link copied',
  share_send: 'Send link',
  share_stop: 'Turn off this link',
  share_stopped: 'Link turned off',
  export_title: 'Export',
  export_intro: 'Download everything in {space}: for insurance, a moving company or your own records.',
  export_excel: 'Excel file',
  export_pdf: 'PDF report',
  export_pdf_hint: 'Opens the print window. Choose “Save as PDF” as the printer.',
  report_title: 'Inventory of {space}',
  report_made: 'Made on {date}',
  report_total: 'Total value: {v}',
  col_box: 'Box',
  col_box_name: 'Box name',
  col_place: 'Place',
  col_spot: 'Spot',
  col_item: 'Item',
  col_qty: 'Quantity',
  col_category: 'Category',
  col_notes: 'Notes',
  col_out_to: 'Taken out by',
  col_out_on: 'Taken out on',
  col_expires: 'Expires',
  col_value: 'Value per piece',
  col_total: 'Total value',
  col_kind: 'Type',
  col_items: 'Items',
  col_fragile: 'Fragile',
  col_status: 'Moving status',
  col_room: 'Room',
  sheet_items: 'Items',
  sheet_boxes: 'Boxes',
  kind_thing: 'Thing',
  kind_appliance: 'Appliance',
  yes: 'Yes'
});
Object.assign(I18N.tr, {
  out_section: 'Dışarıda ya da ödünç',
  out_check: 'Şu an kutunun dışında',
  out_to: 'Kimde?',
  out_to_ph: 'ör. Ali ya da “mutfakta kullanılıyor”',
  out_badge: 'Dışarıda',
  out_badge_to: '{who} kişisinde',
  put_back: 'Yerine koy',
  put_back_done: '{name} tekrar {code} kutusunda',
  out_since: '{date} tarihinden beri',
  dates_section: 'Son kullanma tarihi',
  expires_on: 'Son kullanma tarihi',
  expired: 'Süresi geçti',
  expires_today: 'Bugün bitiyor',
  expires_in_one: 'Yarın bitiyor',
  expires_in_other: '{n} gün içinde bitiyor',
  value_section: 'Değer ve fiş',
  value_each: 'Tanesinin değeri',
  value_ph: 'ör. 1500',
  value_bad: 'Değeri sayı olarak yaz, örneğin 1500 ya da 1499,90.',
  receipt: 'Fiş / fatura',
  add_receipt: 'Fiş fotoğrafı ekle',
  replace_receipt: 'Değiştir',
  remove_receipt: 'Kaldır',
  receipt_view: 'Fişi aç',
  box_value: 'Bu kutunun değeri',
  box_value_note: 'Değeri girilmiş {n} eşyaya göre.',
  appliance_section: 'Cihaz bilgileri',
  is_appliance: 'Bu bir ev aleti ya da cihaz',
  brand: 'Marka',
  model: 'Model',
  serial: 'Seri numarası',
  purchased_on: 'Alış tarihi',
  warranty_until: 'Garanti bitişi',
  read_label: 'Etiketi yapay zekâyla oku',
  read_label_hint: 'Etiketin ya da bilgi plakasının fotoğrafını çek. Bir fotoğraf taraması hakkı kullanır.',
  reading_label: 'Etiket okunuyor…',
  label_read: 'Etiketten dolduruldu. Kaydetmeden önce numaraları kontrol et.',
  label_unreadable: 'Etiket okunamadı. Daha net, daha yakından ve parlama olmadan bir fotoğraf dene.',
  appliance: 'Cihaz',
  warranty_ends_in_one: 'Garanti yarın bitiyor',
  warranty_ends_in_other: 'Garanti {n} gün içinde bitiyor',
  warranty_ends_today: 'Garanti bugün bitiyor',
  warranty_ended: 'Garanti bitti',
  reminder_section: 'Hatırlatma',
  remind_on: 'Hatırlatma tarihi',
  remind_note: 'Ne hatırlatılsın?',
  remind_note_ph: 'ör. Kışlıkları çıkar',
  remind_yearly: 'Her yıl tekrarla',
  reminder_badge: 'Hatırlatma {date}',
  reminder_due: 'Bugün hatırlatma var',
  reminder_done: 'Tamam',
  reminder_next: 'Sonraki hatırlatma {date}',
  reminder_cleared: 'Hatırlatma tamamlandı',
  n_out_box_one: '1 eşya dışarıda',
  n_out_box_other: '{n} eşya dışarıda',
  att_reminders_one: 'Bugün için 1 hatırlatma',
  att_reminders_other: 'Bugün için {n} hatırlatma',
  att_out_one: '1 eşya dışarıda',
  att_out_other: '{n} eşya dışarıda',
  att_expiring_one: '1 eşyanın süresi yakında doluyor',
  att_expiring_other: '{n} eşyanın süresi yakında doluyor',
  att_warranty_one: '1 garanti yakında bitiyor',
  att_warranty_other: '{n} garanti yakında bitiyor',
  att_title_reminders: 'Hatırlatmalar',
  att_title_out: 'Dışarıdakiler',
  att_title_expiring: 'Süresi dolanlar',
  att_title_warranty: 'Biten garantiler',
  att_intro_out: 'Şu an kutusunda olmayan eşyalar. Geri geldiklerinde “Yerine koy”a dokun.',
  att_intro_expiring: 'Önümüzdeki 30 gün içinde süresi dolacak ya da dolmuş eşyalar.',
  att_intro_warranty: 'Garantisi önümüzdeki 60 gün içinde bitecek cihazlar.',
  att_intro_reminders: 'Bugün ya da daha önce hatırlatması olan kutular.',
  att_empty: 'Şu an burada bir şey yok.',
  share_box: 'Bu kutuyu paylaş',
  share_title: '{code} kutusunu paylaş',
  share_body: 'Bu bağlantıya sahip herkes kutunun adını, nerede olduğunu ve içindekileri görebilir. Değerler, seri numaraları ve notlar gizli kalır.',
  copy_link: 'Bağlantıyı kopyala',
  link_copied: 'Bağlantı kopyalandı',
  share_send: 'Bağlantıyı gönder',
  share_stop: 'Bu bağlantıyı kapat',
  share_stopped: 'Bağlantı kapatıldı',
  export_title: 'Dışa aktar',
  export_intro: '{space} içindeki her şeyi indir: sigorta, nakliye firması ya da kendi kayıtların için.',
  export_excel: 'Excel dosyası',
  export_pdf: 'PDF rapor',
  export_pdf_hint: 'Yazdırma penceresi açılır. Yazıcı olarak “PDF olarak kaydet”i seç.',
  report_title: '{space} envanteri',
  report_made: '{date} tarihinde hazırlandı',
  report_total: 'Toplam değer: {v}',
  col_box: 'Kutu',
  col_box_name: 'Kutu adı',
  col_place: 'Yer',
  col_spot: 'Konum',
  col_item: 'Eşya',
  col_qty: 'Adet',
  col_category: 'Kategori',
  col_notes: 'Notlar',
  col_out_to: 'Kimde',
  col_out_on: 'Çıkarılma tarihi',
  col_expires: 'Son kullanma',
  col_value: 'Tanesinin değeri',
  col_total: 'Toplam değer',
  col_kind: 'Tür',
  col_items: 'Eşya sayısı',
  col_fragile: 'Kırılabilir',
  col_status: 'Taşınma durumu',
  col_room: 'Oda',
  sheet_items: 'Eşyalar',
  sheet_boxes: 'Kutular',
  kind_thing: 'Eşya',
  kind_appliance: 'Cihaz',
  yes: 'Evet'
});

const EXPIRY_SOON_DAYS = 30;
const WARRANTY_SOON_DAYS = 60;

function expiryBadge(it) {
  const d = daysUntil(it.expires_on);
  if (d == null || d > EXPIRY_SOON_DAYS) return '';
  if (d < 0) return badge(t('expired'), 'bad', 'clock');
  if (d === 0) return badge(t('expires_today'), 'bad', 'clock');
  return badge(tp('expires_in', d), 'warn', 'clock');
}
function warrantyBadge(it) {
  if (it.kind !== 'appliance') return '';
  const d = daysUntil(it.warranty_until);
  if (d == null || d > WARRANTY_SOON_DAYS) return badge(it.brand || t('appliance'), '', 'plug');
  if (d < 0) return badge(t('warranty_ended'), 'muted', 'plug');
  if (d === 0) return badge(t('warranty_ends_today'), 'warn', 'plug');
  return badge(tp('warranty_ends_in', d), 'warn', 'plug');
}
function outBadge(it) {
  if (!it.checked_out_at) return '';
  return badge(it.checked_out_to ? t('out_badge_to', { who: it.checked_out_to }) : t('out_badge'), 'warn', 'out');
}
function reminderDue(b) { return !!(b.remind_on && daysUntil(b.remind_on) <= 0); }

/* ---------- lists for the home screen ---------- */
function attention() {
  const items = S.items;
  return {
    reminders: S.boxes.filter(reminderDue),
    out: items.filter((i) => i.checked_out_at),
    expiring: items.filter((i) => { const d = daysUntil(i.expires_on); return d != null && d <= EXPIRY_SOON_DAYS; })
      .sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
    warranty: items.filter((i) => { const d = daysUntil(i.warranty_until); return i.kind === 'appliance' && d != null && d >= 0 && d <= WARRANTY_SOON_DAYS; })
      .sort((a, b) => a.warranty_until.localeCompare(b.warranty_until))
  };
}
HOOKS.homeTop.push(() => {
  const a = attention();
  const rows = [
    ['reminders', 'bell', a.reminders.length, 'att_reminders'],
    ['out', 'out', a.out.length, 'att_out'],
    ['expiring', 'clock', a.expiring.length, 'att_expiring'],
    ['warranty', 'plug', a.warranty.length, 'att_warranty']
  ].filter((r) => r[2] > 0);
  if (!rows.length) return '';
  return `<ul class="list attention">${rows.map(([kind, ic, n, key]) => `
    <li><a class="att-row" href="#/attention/${kind}">${icon(ic)}<span>${esc(tp(key, n))}</span>${icon('chevron')}</a></li>`).join('')}</ul>`;
});

PAGES.attention = {
  tab: 'boxes',
  render(kind) {
    if (!['reminders', 'out', 'expiring', 'warranty'].includes(kind)) kind = 'out';
    const a = attention();
    const list = a[kind];
    const itemRowHtml = (it) => {
      const b = boxById(it.box_id);
      const sub = kind === 'out'
        ? (it.checked_out_to ? t('out_badge_to', { who: it.checked_out_to }) + ', ' : '') + t('out_since', { date: fmtDate(it.checked_out_at, { day: 'numeric', month: 'short' }) })
        : kind === 'expiring' ? fmtDate(it.expires_on) : fmtDate(it.warranty_until);
      return `<li class="att-item">
        <a class="result" href="#/box/${encodeURIComponent(it.box_id)}">
          <span class="result-main"><span class="result-name">${esc(it.name)}</span><span class="result-where">${esc(sub)}</span>
          <span class="result-badges">${kind === 'expiring' ? expiryBadge(it) : kind === 'warranty' ? warrantyBadge(it) : ''}</span></span>
          ${b ? `<span class="code-chip kraft">${esc(b.code)}</span>` : ''}
        </a>
        ${kind === 'out' && ROLE.canEdit() ? `<button type="button" class="btn small" data-act="put-back" data-id="${esc(it.id)}">${t('put_back')}</button>` : ''}
      </li>`;
    };
    const boxRowHtml = (b) => `<li class="att-item">
        <a class="result" href="#/box/${encodeURIComponent(b.id)}">
          <span class="result-main"><span class="result-name">${esc(b.remind_note || b.name)}</span><span class="result-where">${esc(b.name)}, ${esc(fmtDate(b.remind_on))}</span></span>
          <span class="code-chip kraft">${esc(b.code)}</span>
        </a>
        ${ROLE.canEdit() ? `<button type="button" class="btn small" data-act="reminder-done" data-id="${esc(b.id)}">${t('reminder_done')}</button>` : ''}
      </li>`;
    $('#view').innerHTML = `
      <div class="bar"><a class="icon-btn" href="#/" aria-label="${t('back')}">${icon('back')}</a></div>
      <header class="page-head"><h1 class="page-title">${t('att_title_' + kind)}</h1></header>
      <p class="page-intro">${t('att_intro_' + kind)}</p>
      ${list.length ? `<ul class="list att-list">${list.map(kind === 'reminders' ? boxRowHtml : itemRowHtml).join('')}</ul>` : `<div class="empty"><p>${t('att_empty')}</p></div>`}`;
  }
};

async function putBack(itemId) {
  const it = S.items.find((i) => i.id === itemId);
  if (!it) return;
  try {
    const res = await Store.updateItem(it.id, { checked_out_at: null, checked_out_to: null });
    const b = boxById(it.box_id);
    toast(res.queued ? t('saved_offline') : t('put_back_done', { name: it.name, code: b ? b.code : '' }));
    if (S.current && S.current.box.id === it.box_id) await refreshBox();
    else route();
  } catch (e) { toast(friendlyError(e)); }
}
async function reminderDone(boxId) {
  const b = boxById(boxId);
  if (!b) return;
  if (S.offline) { toast(t('needs_connection')); return; }
  let next = null;
  if (b.remind_yearly && b.remind_on) {
    const d = new Date(b.remind_on + 'T12:00:00');
    const today = todayISO();
    do { d.setFullYear(d.getFullYear() + 1); } while (d.toISOString().slice(0, 10) <= today);
    next = d.toISOString().slice(0, 10);
  }
  try {
    must(await sb.from('boxes').update({ remind_on: next }).eq('id', b.id));
    b.remind_on = next;
    toast(next ? t('reminder_next', { date: fmtDate(next) }) : t('reminder_cleared'));
    if (S.current && S.current.box.id === b.id) await refreshBox();
    else route();
  } catch (e) { toast(friendlyError(e)); }
}

/* ---------- badges ---------- */
HOOKS.itemBadges.push((it) => outBadge(it) + expiryBadge(it) + warrantyBadge(it));
HOOKS.searchExtra.push((r) => (r.kind === 'item' ? outBadge(r) + expiryBadge(r) : ''));
HOOKS.tileBadges.push((b) => (b.out_count ? badge(tp('n_out_box', b.out_count), 'warn', 'out') : '') + (reminderDue(b) ? badge(t('reminder_due'), 'warn', 'bell') : ''));
HOOKS.heroBadges.push((b) => {
  let html = b.out_count ? badge(tp('n_out_box', b.out_count), 'warn', 'out') : '';
  if (b.remind_on) html += badge(reminderDue(b) ? t('reminder_due') + (b.remind_note ? ': ' + b.remind_note : '') : t('reminder_badge', { date: fmtDate(b.remind_on, { day: 'numeric', month: 'short' }) }), reminderDue(b) ? 'warn' : '', 'bell');
  return html;
});
HOOKS.boxActions.push((b) => (reminderDue(b) && ROLE.canEdit()
  ? `<div class="notice">${icon('bell')}<span>${esc(b.remind_note || t('reminder_due'))}</span><button type="button" class="btn small" data-act="reminder-done" data-id="${esc(b.id)}">${t('reminder_done')}</button></div>`
  : ''));
HOOKS.boxSections.push((b, items) => {
  const valued = items.filter((i) => Number(i.value) > 0);
  if (!valued.length) return '';
  const total = valued.reduce((n, i) => n + Number(i.value) * Math.max(1, i.quantity || 1), 0);
  return `<section class="value-card"><h2 class="setting-title">${t('box_value')}</h2><p class="value-total">${esc(money(total))}</p><p class="hint">${esc(t('box_value_note', { n: valued.length }))}</p></section>`;
});

/* ---------- item editor sections ---------- */
let receiptDraft = null;     // { prepared } new photo, or { remove: true }
HOOKS.itemEditor.push({
  html(it) {
    receiptDraft = null;
    const appl = it.kind === 'appliance';
    const anyValue = it.value != null || it.receipt_path;
    return `
      <details class="more" ${it.checked_out_at ? 'open' : ''}>
        <summary>${icon('out')}${t('out_section')}</summary>
        <label class="check-line"><input type="checkbox" name="isOut" ${it.checked_out_at ? 'checked' : ''}>${t('out_check')}</label>
        <label class="field" style="margin-top:10px"><span>${t('out_to')} <span class="opt">${t('optional')}</span></span>
          <input class="input" name="outTo" maxlength="60" placeholder="${t('out_to_ph')}" value="${esc(it.checked_out_to || '')}"></label>
      </details>
      <details class="more" ${it.expires_on ? 'open' : ''}>
        <summary>${icon('clock')}${t('dates_section')}</summary>
        <label class="field"><span>${t('expires_on')}</span><input class="input" type="date" name="expiresOn" value="${esc(it.expires_on || '')}"></label>
      </details>
      <details class="more" ${anyValue ? 'open' : ''}>
        <summary>${icon('money')}${t('value_section')}</summary>
        <label class="field"><span>${t('value_each')} (${esc((S.space && S.space.currency) || 'TRY')})</span>
          <input class="input" name="value" inputmode="decimal" maxlength="14" placeholder="${t('value_ph')}" value="${it.value != null ? esc(String(it.value)) : ''}"></label>
        <div class="field"><span>${t('receipt')}</span><div class="receipt-box" id="receiptBox"></div></div>
        <input type="file" id="receiptInput" accept="image/*" hidden>
      </details>
      <details class="more" ${appl ? 'open' : ''}>
        <summary>${icon('plug')}${t('appliance_section')}</summary>
        <label class="check-line"><input type="checkbox" name="isAppliance" ${appl ? 'checked' : ''}>${t('is_appliance')}</label>
        <div class="appl-fields" ${appl ? '' : 'hidden'}>
          <button type="button" class="btn block" id="readLabelBtn" style="margin-top:12px">${icon('camera')}<span>${t('read_label')}</span></button>
          <p class="hint">${t('read_label_hint')}</p>
          <p class="note" id="labelNote" hidden></p>
          <input type="file" id="labelInput" accept="image/*" capture="environment" hidden>
          <div class="two-col">
            <label class="field"><span>${t('brand')}</span><input class="input" name="brand" maxlength="60" value="${esc(it.brand || '')}"></label>
            <label class="field"><span>${t('model')}</span><input class="input" name="model" maxlength="60" value="${esc(it.model || '')}"></label>
          </div>
          <label class="field"><span>${t('serial')}</span><input class="input" name="serial" maxlength="60" autocapitalize="characters" value="${esc(it.serial || '')}"></label>
          <div class="two-col">
            <label class="field"><span>${t('purchased_on')}</span><input class="input" type="date" name="purchasedOn" value="${esc(it.purchased_on || '')}"></label>
            <label class="field"><span>${t('warranty_until')}</span><input class="input" type="date" name="warrantyUntil" value="${esc(it.warranty_until || '')}"></label>
          </div>
        </div>
      </details>`;
  },
  bind(sheet, it) {
    const form = $('#itemForm', sheet);
    const drawReceipt = () => {
      const boxEl = $('#receiptBox', sheet);
      const current = receiptDraft && receiptDraft.prepared ? receiptDraft.prepared.url : null;
      const existing = !receiptDraft && it.receipt_path;
      if (current || existing) {
        boxEl.innerHTML = `${current ? `<img src="${current}" alt="${t('receipt')}">` : `<a href="#" data-receipt="${esc(it.receipt_path)}"><img data-path="${esc(it.receipt_path)}" alt="${t('receipt')}"></a>`}
          <div class="receipt-actions"><button type="button" class="link-btn" id="receiptPick">${t('replace_receipt')}</button><button type="button" class="link-btn danger-text" id="receiptRemove">${t('remove_receipt')}</button></div>`;
        hydrateImages(boxEl);
      } else {
        boxEl.innerHTML = `<button type="button" class="btn" id="receiptPick">${icon('file')}<span>${t('add_receipt')}</span></button>`;
      }
      $('#receiptPick', sheet).onclick = () => {
        if (S.offline) { toast(t('needs_connection')); return; }
        $('#receiptInput', sheet).click();
      };
      const rm = $('#receiptRemove', sheet);
      if (rm) rm.onclick = () => { receiptDraft = { remove: true }; drawReceipt(); };
      const link = $('[data-receipt]', boxEl);
      if (link) link.onclick = async (e) => {
        e.preventDefault();
        const get = await signedUrls([it.receipt_path]);
        const u = get(it.receipt_path);
        if (u) window.open(u, '_blank', 'noopener');
      };
    };
    $('#receiptInput', sheet).onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try { receiptDraft = { prepared: await prepareImage(f, 1600) }; } catch (ex) { toast(t('err_photo')); }
      drawReceipt();
    };
    drawReceipt();
    form.isAppliance.onchange = () => { $('.appl-fields', sheet).hidden = !form.isAppliance.checked; };
    $('#readLabelBtn', sheet).onclick = () => {
      if (S.offline) { toast(t('needs_connection')); return; }
      $('#labelInput', sheet).click();
    };
    $('#labelInput', sheet).onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const note = $('#labelNote', sheet);
      const btn = $('#readLabelBtn', sheet);
      note.hidden = false; note.textContent = t('reading_label'); btn.disabled = true;
      try {
        const img = await prepareImage(f, 1600);
        const res = await callBoxAI({ action: 'read_label', language: S.lang, images: [{ mime: img.mime, data: img.base64 }] });
        URL.revokeObjectURL(img.url);
        const l = res.label || {};
        if (!l.brand && !l.model && !l.serial) throw new Error('unreadable');
        if (l.brand) form.brand.value = l.brand;
        if (l.model) form.model.value = l.model;
        if (l.serial) form.serial.value = l.serial;
        if (l.name && (!form.name.value.trim() || /^(appliance|device|cihaz)$/i.test(form.name.value.trim()))) form.name.value = l.name;
        if (l.category && form.category.value === 'other') form.category.value = l.category;
        note.textContent = t('label_read');
      } catch (ex) {
        note.textContent = ex.code === 'daily_limit' ? t('err_daily_limit', { limit: S.aiLimit || 20 }) : ex.code === 'network' ? t('err_offline') : t('label_unreadable');
      } finally {
        btn.disabled = false;
        e.target.value = '';
      }
    };
  },
  async collect(form, it) {
    const vals = {};
    if (form.isOut.checked) {
      vals.checked_out_at = it.checked_out_at || new Date().toISOString();
      vals.checked_out_to = form.outTo.value.trim() || null;
    } else {
      vals.checked_out_at = null;
      vals.checked_out_to = null;
    }
    vals.expires_on = form.expiresOn.value || null;
    const raw = form.value.value.trim().replace(/\s/g, '');
    if (raw) {
      // Accept 1500, 1.500, 1,500, 1499.90 and 1499,90
      let norm = raw;
      if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(raw)) {
        const dec = raw.match(/[.,](\d{1,2})$/);
        norm = raw.replace(/[.,](\d{1,2})$/, '').replace(/[.,]/g, '') + (dec ? '.' + dec[1] : '');
      } else norm = raw.replace(',', '.');
      const n = Number(norm);
      if (!Number.isFinite(n) || n < 0 || n > 9999999999) { const err = new Error('bad value'); err.userMessage = t('value_bad'); throw err; }
      vals.value = Math.round(n * 100) / 100;
    } else vals.value = null;
    vals.kind = form.isAppliance.checked ? 'appliance' : 'thing';
    vals.brand = form.brand.value.trim() || null;
    vals.model = form.model.value.trim() || null;
    vals.serial = form.serial.value.trim() || null;
    vals.purchased_on = form.purchasedOn.value || null;
    vals.warranty_until = form.warrantyUntil.value || null;
    if (receiptDraft && receiptDraft.prepared) {
      if (S.offline) { const err = new Error('offline'); err.userMessage = t('needs_connection'); throw err; }
      const path = `${S.space.id}/${it.box_id}/receipt-${uuid()}.jpg`;
      must(await sb.storage.from(BUCKET).upload(path, receiptDraft.prepared.blob, { contentType: 'image/jpeg', upsert: false }));
      URL.revokeObjectURL(receiptDraft.prepared.url);
      if (it.receipt_path) removeFiles([it.receipt_path]).catch(() => {});
      vals.receipt_path = path;
    } else if (receiptDraft && receiptDraft.remove) {
      if (it.receipt_path && !S.offline) removeFiles([it.receipt_path]).catch(() => {});
      vals.receipt_path = null;
    }
    receiptDraft = null;
    return vals;
  },
  view(it) {
    const rows = [];
    if (it.checked_out_at) rows.push([t('out_section'), (it.checked_out_to ? it.checked_out_to + ', ' : '') + t('out_since', { date: fmtDate(it.checked_out_at) })]);
    if (it.expires_on) rows.push([t('expires_on'), fmtDate(it.expires_on)]);
    if (it.value != null) rows.push([t('value_each'), money(it.value)]);
    if (it.kind === 'appliance') {
      if (it.brand) rows.push([t('brand'), it.brand]);
      if (it.model) rows.push([t('model'), it.model]);
      if (it.serial) rows.push([t('serial'), it.serial]);
      if (it.purchased_on) rows.push([t('purchased_on'), fmtDate(it.purchased_on)]);
      if (it.warranty_until) rows.push([t('warranty_until'), fmtDate(it.warranty_until)]);
    }
    return rows.length ? `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  }
});

/* ---------- box form: reminder ---------- */
HOOKS.boxForm.push({
  html(box) {
    const b = box || {};
    return `<details class="more" ${b.remind_on ? 'open' : ''}>
      <summary>${icon('bell')}${t('reminder_section')}</summary>
      <label class="field"><span>${t('remind_on')}</span><input class="input" type="date" name="remindOn" value="${esc(b.remind_on || '')}"></label>
      <label class="field"><span>${t('remind_note')} <span class="opt">${t('optional')}</span></span><input class="input" name="remindNote" maxlength="120" placeholder="${t('remind_note_ph')}" value="${esc(b.remind_note || '')}"></label>
      <label class="check-line"><input type="checkbox" name="remindYearly" ${b.remind_yearly ? 'checked' : ''}>${t('remind_yearly')}</label>
    </details>`;
  },
  collect(form) {
    return {
      remind_on: form.remindOn.value || null,
      remind_note: form.remindNote.value.trim() || null,
      remind_yearly: !!form.remindYearly.checked
    };
  }
});

/* ---------- share a box ---------- */
HOOKS.boxMenu.push((b) => (ROLE.canEdit() ? `<li><button type="button" data-act="share-box">${icon('share')}${t('share_box')}</button></li>` : ''));
function shareUrl(token) { return location.origin + '/s.html?id=' + encodeURIComponent(token); }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
async function openShareSheet() {
  const box = S.current.box;
  if (S.offline) { toast(t('needs_connection')); return; }
  showBlocker('');
  let token;
  try {
    const existing = must(await sb.from('box_shares').select('id').eq('box_id', box.id).limit(1)) || [];
    token = existing.length ? existing[0].id : must(await sb.from('box_shares').insert({ box_id: box.id }).select('id').single()).id;
  } catch (e) { hideBlocker(); toast(friendlyError(e)); return; }
  hideBlocker();
  const url = shareUrl(token);
  const sheet = openSheet(`
    <h2>${esc(t('share_title', { code: box.code }))}</h2>
    <p class="lead">${t('share_body')}</p>
    <div class="link-field"><input class="input" readonly value="${esc(url)}" aria-label="${t('copy_link')}" id="shareUrl"></div>
    <div class="pick-row" style="margin-top:10px">
      ${navigator.share ? `<button type="button" class="btn primary" id="shareSend">${icon('share')}<span>${t('share_send')}</span></button>` : ''}
      <button type="button" class="btn" id="shareCopy">${t('copy_link')}</button>
    </div>
    <button type="button" class="danger-link" id="shareStop">${t('share_stop')}</button>
    <div class="sheet-actions"><button type="button" class="btn" data-act="sheet-close">${t('close')}</button></div>`);
  $('#shareCopy', sheet).onclick = async () => {
    if (await copyText(url)) toast(t('link_copied'));
    else { $('#shareUrl', sheet).select(); }
  };
  const send = $('#shareSend', sheet);
  if (send) send.onclick = () => navigator.share({ title: box.code + ' ' + box.name, url }).catch(() => {});
  $('#shareStop', sheet).onclick = async () => {
    try {
      must(await sb.from('box_shares').delete().eq('box_id', box.id));
      closeSheet();
      toast(t('share_stopped'));
    } catch (e) { toast(friendlyError(e)); }
  };
}

/* ---------- export ---------- */
HOOKS.meSections.push(() => (ROLE.isStaff() ? `
  <section>
    <h2 class="setting-title">${t('export_title')}</h2>
    <p class="muted" style="margin:0 0 10px">${esc(t('export_intro', { space: S.space.name }))}</p>
    <div class="pick-row">
      <button type="button" class="btn" data-act="export-xlsx">${icon('download')}<span>${t('export_excel')}</span></button>
      <button type="button" class="btn" data-act="export-pdf">${icon('file')}<span>${t('export_pdf')}</span></button>
    </div>
    <p class="hint">${t('export_pdf_hint')}</p>
  </section>` : ''));

function exportRows() {
  const coll = collator();
  const boxes = S.boxes.slice().sort((a, b) => coll.compare(a.code, b.code));
  const rows = [];
  boxes.forEach((b) => {
    itemsOf(b.id).sort((x, y) => coll.compare(x.name, y.name)).forEach((i) => rows.push({ b, i }));
  });
  return { boxes, rows };
}

// A tiny .xlsx writer (zip without compression + SpreadsheetML), so no big library is needed.
const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c >>> 0;
  }
  return tbl;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = (v) => [v & 255, (v >>> 8) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  files.forEach(({ name, data }) => {
    const nameB = enc.encode(name), dataB = enc.encode(data), crc = crc32(dataB);
    const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dataB.length), ...u32(dataB.length), ...u16(nameB.length), ...u16(0)]);
    parts.push(local, nameB, dataB);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dataB.length), ...u32(dataB.length), ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += local.length + nameB.length + dataB.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function xmlEsc(v) { return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
function colName(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function sheetXml(header, rows, widths) {
  const cell = (v, r, c, style) => {
    const ref = colName(c) + r;
    if (v == null || v === '') return '';
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  };
  const body = [header, ...rows].map((row, ri) => `<row r="${ri + 1}">${row.map((v, ci) => cell(v, ri + 1, ci, ri === 0 ? 1 : 0)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData></worksheet>`;
}
function buildXlsx() {
  const { boxes, rows } = exportRows();
  const num = (v) => (v == null || v === '' ? '' : Number(v));
  const itemHeader = [t('col_box'), t('col_box_name'), t('col_place'), t('col_spot'), t('col_item'), t('col_qty'), t('col_category'), t('col_notes'), t('col_out_to'), t('col_out_on'), t('col_expires'), t('col_value'), t('col_total'), t('col_kind'), t('brand'), t('model'), t('serial'), t('purchased_on'), t('warranty_until')];
  const itemRows = rows.map(({ b, i }) => [
    b.code, b.name, locationName(b.location_id), b.spot || '', i.name, i.quantity, catLabel(i.category), i.notes || '',
    i.checked_out_at ? (i.checked_out_to || t('out_badge')) : '', i.checked_out_at ? i.checked_out_at.slice(0, 10) : '',
    i.expires_on || '', num(i.value), i.value != null ? Math.round(Number(i.value) * Math.max(1, i.quantity) * 100) / 100 : '',
    i.kind === 'appliance' ? t('kind_appliance') : t('kind_thing'), i.brand || '', i.model || '', i.serial || '', i.purchased_on || '', i.warranty_until || ''
  ]);
  const boxHeader = [t('col_box'), t('col_box_name'), t('col_place'), t('col_spot'), t('col_items'), t('col_total'), t('col_fragile'), t('col_status'), t('col_room'), t('col_notes')];
  const boxRows = boxes.map((b) => [b.code, b.name, locationName(b.location_id), b.spot || '', itemsOf(b.id).length,
    Number(b.value_total) || '', b.fragile ? t('yes') : '', b.move_status ? t('move_' + b.move_status) : '', b.dest_room || '', b.notes || '']);
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(t('sheet_items'))}" sheetId="1" r:id="rId1"/><sheet name="${xmlEsc(t('sheet_boxes'))}" sheetId="2" r:id="rId2"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml(itemHeader, itemRows, [9, 22, 16, 14, 26, 8, 18, 24, 14, 12, 12, 12, 12, 10, 12, 14, 16, 12, 12]) },
    { name: 'xl/worksheets/sheet2.xml', data: sheetXml(boxHeader, boxRows, [9, 24, 16, 14, 8, 12, 9, 14, 14, 28]) }
  ];
  return zipStore(files);
}
function fileSafe(name) { return String(name || 'inventory').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'inventory'; }
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function exportXlsx() {
  downloadBlob(buildXlsx(), `${fileSafe(S.space.name)} ${todayISO()}.xlsx`);
}
async function exportPdf() {
  const { boxes } = exportRows();
  const total = S.items.reduce((n, i) => n + (Number(i.value) || 0) * Math.max(1, i.quantity || 1), 0);
  const coll = collator();
  const html = `<div class="report">
    <h1>${esc(t('report_title', { space: S.space.name }))}</h1>
    <p class="r-meta">${esc(t('report_made', { date: fmtDate(new Date().toISOString()) }))}, ${esc(tp('n_boxes', boxes.length))}, ${esc(tp('n_items', S.items.length))}${total ? ', ' + esc(t('report_total', { v: money(total) })) : ''}</p>
    ${boxes.map((b) => {
      const items = itemsOf(b.id).sort((x, y) => coll.compare(x.name, y.name));
      return `<section class="r-box">
        <h2><span class="r-code">${esc(b.code)}</span> ${esc(b.name)}</h2>
        <p class="r-place">${esc(placeText(b))}${b.fragile ? ', ' + esc(t('col_fragile')) : ''}${Number(b.value_total) ? ', ' + esc(money(b.value_total)) : ''}</p>
        ${items.length ? `<table><thead><tr><th>${esc(t('col_item'))}</th><th class="n">${esc(t('col_qty'))}</th><th>${esc(t('col_category'))}</th><th>${esc(t('col_notes'))}</th><th class="n">${esc(t('col_value'))}</th></tr></thead><tbody>
          ${items.map((i) => `<tr><td>${esc(i.name)}${i.kind === 'appliance' && (i.brand || i.model || i.serial) ? `<div class="r-sub">${esc([i.brand, i.model, i.serial].filter(Boolean).join(', '))}</div>` : ''}${i.checked_out_at ? `<div class="r-sub">${esc(i.checked_out_to ? t('out_badge_to', { who: i.checked_out_to }) : t('out_badge'))}</div>` : ''}</td><td class="n">${i.quantity}</td><td>${esc(catLabel(i.category))}</td><td>${esc(i.notes || '')}</td><td class="n">${i.value != null ? esc(money(i.value)) : ''}</td></tr>`).join('')}
        </tbody></table>` : ''}
      </section>`;
    }).join('')}
  </div>`;
  $('#printArea').innerHTML = html;
  if (document.fonts && document.fonts.status !== 'loaded') { try { await document.fonts.ready; } catch (e) {} }
  window.print();
}

Object.assign(ACTIONS, {
  'put-back': (el) => putBack(el.dataset.id),
  'reminder-done': (el) => reminderDone(el.dataset.id),
  'share-box': () => openShareSheet(),
  'export-xlsx': () => exportXlsx(),
  'export-pdf': () => exportPdf()
});

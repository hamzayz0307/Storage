'use strict';
/* =====================================================================
   Extras: Google sign-in text, in-app feedback, privacy policy link,
   and shared interface text used by the core screens.
   ===================================================================== */

Object.assign(I18N.en, {
  or: 'or',
  continue_google: 'Continue with Google',
  privacy_policy: 'Privacy policy',
  search_summary: '{matches} in {boxes}, {pieces} in total.',
  n_matches_one: '1 match',
  n_matches_other: '{n} matches',
  n_pieces_one: '1 piece',
  n_pieces_other: '{n} pieces',
  n_out_now_one: '1 of them is taken out.',
  n_out_now_other: '{n} of them are taken out.',
  colour: 'Colour',
  no_colour: 'No colour',
  feedback: 'Send feedback',
  feedback_sub: 'An idea, a problem, anything',
  feedback_title: 'Send feedback',
  feedback_kind: 'What is it about?',
  fb_idea: 'Idea',
  fb_problem: 'Problem',
  fb_other: 'Other',
  feedback_message: 'Your message',
  feedback_ph: 'Tell us what you’d like, or what went wrong and where.',
  feedback_send: 'Send',
  feedback_thanks: 'Thanks, your message was sent.',
  feedback_empty: 'Write a message first.',
  about: 'About',
  privacy_sub: 'What the app stores and who processes it'
});
Object.assign(I18N.tr, {
  or: 'ya da',
  continue_google: 'Google ile devam et',
  privacy_policy: 'Gizlilik politikası',
  search_summary: '{boxes} içinde {matches}, toplam {pieces}.',
  n_matches_one: '1 sonuç',
  n_matches_other: '{n} sonuç',
  n_pieces_one: '1 adet',
  n_pieces_other: '{n} adet',
  n_out_now_one: 'Bunlardan 1 tanesi dışarıda.',
  n_out_now_other: 'Bunlardan {n} tanesi dışarıda.',
  colour: 'Renk',
  no_colour: 'Renk yok',
  feedback: 'Geri bildirim gönder',
  feedback_sub: 'Bir fikir, bir sorun, ne olursa',
  feedback_title: 'Geri bildirim gönder',
  feedback_kind: 'Ne hakkında?',
  fb_idea: 'Fikir',
  fb_problem: 'Sorun',
  fb_other: 'Diğer',
  feedback_message: 'Mesajın',
  feedback_ph: 'Ne istediğini ya da neyin nerede ters gittiğini yaz.',
  feedback_send: 'Gönder',
  feedback_thanks: 'Teşekkürler, mesajın gönderildi.',
  feedback_empty: 'Önce bir mesaj yaz.',
  about: 'Hakkında',
  privacy_sub: 'Uygulamanın ne sakladığı ve kimin işlediği'
});

HOOKS.meSections.push(() => `
  <section><ul class="list">
    <li><button type="button" class="place-row" data-act="feedback">${icon('message')}<span class="place-name">${t('feedback')}<span class="row-sub">${t('feedback_sub')}</span></span>${icon('chevron')}</button></li>
    <li><a class="place-row" href="/privacy.html?lang=${S.lang}">${icon('shield')}<span class="place-name">${t('privacy_policy')}<span class="row-sub">${t('privacy_sub')}</span></span>${icon('chevron')}</a></li>
  </ul></section>`);

function openFeedbackSheet() {
  const sheet = openSheet(`
    <h2>${t('feedback_title')}</h2>
    <div class="field"><span>${t('feedback_kind')}</span>
      <div class="seg" role="group" aria-label="${t('feedback_kind')}">
        ${['idea', 'problem', 'other'].map((k, i) => `<button type="button" data-kind="${k}" aria-pressed="${i === 0}">${t('fb_' + k)}</button>`).join('')}
      </div></div>
    <label class="field"><span>${t('feedback_message')}</span><textarea class="input" id="fbMsg" rows="5" maxlength="2000" placeholder="${t('feedback_ph')}" autofocus></textarea></label>
    <div class="error" id="fbErr" hidden></div>
    <div class="sheet-actions">
      <button type="button" class="btn ghost" data-act="sheet-close">${t('cancel')}</button>
      <button type="button" class="btn primary" id="fbSend">${t('feedback_send')}</button>
    </div>`);
  let kind = 'idea';
  $$('[data-kind]', sheet).forEach((b) => b.onclick = () => {
    kind = b.dataset.kind;
    $$('[data-kind]', sheet).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#fbSend', sheet).onclick = async () => {
    const msg = $('#fbMsg', sheet).value.trim();
    const err = $('#fbErr', sheet);
    if (!msg) { err.textContent = t('feedback_empty'); err.hidden = false; return; }
    if (S.offline) { err.textContent = t('needs_connection'); err.hidden = false; return; }
    try {
      must(await sb.from('feedback').insert({ kind, message: msg.slice(0, 2000), page: location.hash || '#/', language: S.lang, user_agent: navigator.userAgent.slice(0, 300) }));
      closeSheet();
      toast(t('feedback_thanks'));
    } catch (e) { err.textContent = friendlyError(e); err.hidden = false; }
  };
}

Object.assign(ACTIONS, {
  'feedback': () => openFeedbackSheet()
});

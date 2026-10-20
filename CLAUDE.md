# Box Finder / Kutu Bul

Storage-box inventory web app: photograph a box's contents, AI lists the items, print QR labels, find anything by search or by scanning a label. Owner: Hamza (sibling project of `hamzayz0307/fridge-to-table`, same stack and conventions). Version 2 adds shared spaces with roles (owner / editor / viewer / customer), a business mode for storage companies, moving mode, records (values, receipts, appliances, warranties, expiry, reminders), offline use, sharing and export.

## Architecture
- **Frontend:** no build step, hosted on **Vercel**, auto-deployed from this repo. `index.html` holds the markup and all CSS. Scripts load in this order: `js/i18n.js` (all text), `js/app.js` (core), then feature files `js/offline.js`, `js/records.js`, `js/moving.js`, `js/spaces.js`, `js/extras.js`, then `start()`. Supabase URL + publishable key live in `config.js` (public by design; RLS protects data). `s.html` is the public box-share page, `privacy.html` the bilingual privacy policy.
- **Backend:** its **own Supabase project** (separate from Fridge-to-Table): Postgres + Auth (email/password + Google) + Storage + Edge Functions.
- **AI:** Google **Gemini** via the Edge Function `box-ai` (`supabase/functions/box-ai/index.ts`). Actions: `usage`, `identify` (1–4 photos → items) and `read_label` (1 photo of an appliance rating plate → name/brand/model/serial/category). Prompts are built server-side. Secrets: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (default `gemini-3.5-flash-lite`), `AI_DAILY_LIMIT` (default 20). Server key from `SUPABASE_SECRET_KEYS` (new projects) or `SUPABASE_SERVICE_ROLE_KEY` (legacy); "Verify JWT" is off because the function calls `auth.getUser(token)` itself. Uses `responseSchema` JSON output, `thinkingLevel: low` (retries without it on models that reject it), retries on 429/5xx, refunds the credit when the AI call fails.
- **Libraries:** supabase-js from unpkg; `vendor/qrcode.js` (QR generation) and `vendor/jsQR.js` (scanner fallback when `BarcodeDetector` is missing, lazy-loaded) are self-hosted. Fonts are self-hosted in `fonts/`. The Excel export is a small built-in .xlsx writer in `records.js` (no library).

## Security rules (do not break)
- Never put secret keys (service_role/secret key, Gemini key, passwords) in this repo. Secrets go in Supabase Secrets.
- Every table has RLS. Reading: `is_staff(space_id)` (owner/editor/viewer) sees the whole space; customers only through `can_see_location()` / `can_see_box()` (their units in `member_locations`). Writing boxes/items/photos/locations: `can_edit_space(space_id)` (owner/editor). All helpers are security definer.
- Members, roles, unit access and invites change **only** through RPCs (`create_invite`, `accept_invite`, `set_member_role`, `set_member_locations`, `remove_member`, `leave_space`). Spaces are created only by `bootstrap_me` / `create_space`. `spaces_protect` blocks changing `owner_id`.
- `items`, `box_photos`, `box_shares`, `retrieval_requests` take `space_id` from their box by trigger; the app never sends it.
- `retrieval_requests`: `requests_guard` forces `requested_by = auth.uid()`, status `open` on insert; requesters may only cancel an open request; one open/ready request per box.
- `activity` is written only by triggers (`log_activity` is not executable by users). `consume_ai_credit` / `refund_ai_credit` are executable by `service_role` only.
- `get_shared_box(share_id)` (anon) returns only code, name, place, spot, fragile, brand name and item name/quantity/category — never values, serials or notes.
- New Supabase projects don't auto-grant table access: every new table needs explicit `grant`s to `authenticated` and `service_role` in `schema.sql`.
- Colours reach `style=""` attributes only through `safeColor()` (rooms are free-form jsonb); all user text goes through `esc()`.
- Work on a separate branch and let the owner review the Vercel preview; never push to `main` directly.
- Database changes: edit `supabase/schema.sql` (keep it re-runnable: `if not exists`, `add column if not exists`, `drop policy if exists`, `drop function if exists` before changing a return type) and give it to the owner to run in the Supabase SQL Editor. It must also upgrade a v1 database (tested from `tests/fixtures/schema-v1.sql`).

## Data model (`supabase/schema.sql`)
- `spaces` (name, owner_id, box_counter, kind personal/business, brand_name, brand_color, logo_path, currency, moving, rooms jsonb `[{name,color}]`) · `space_members` (role owner/editor/viewer/customer) · `member_locations` (customer → units) · `space_invites` (id = link token, role, location_ids, expires 7 days, single use) · `profiles` (language, current_space_id, display_name)
- `locations` (name, notes, color) · `boxes` (code `B-0001` per space, name, location_id, spot, notes, cover_photo_id, label_printed_at, move_status packed/in_transit/unpacked, dest_room, fragile, remind_on, remind_note, remind_yearly) · `box_photos` · `items` (name, category, quantity, notes, source, checked_out_at/_to, expires_on, value per piece, receipt_path, kind thing/appliance, brand, model, serial, purchased_on, warranty_until; generated `search_text`)
- `box_shares` (id = link token) · `retrieval_requests` (status open/ready/done/cancelled, note, handled_by) · `activity` (action, details jsonb, by triggers on items/boxes/requests) · `feedback` · `ai_usage`
- RPCs: `bootstrap_me` (profile + personal space + current space + `spaces` list), `create_space`, `switch_space`, `list_boxes` (counts, cover, out_count, value_total), `search_inventory`, `list_members`, member/invite functions above, `preview_invite`, `list_activity(space, before_id, limit)`, `get_shared_box`, `delete_my_account`.
- Storage: private bucket `box-photos`: `<space>/<box>/<uuid>.jpg` photos, `<space>/<box>/receipt-<uuid>.jpg` receipts, `<space>/brand/<uuid>.jpg` logo. Read policy follows box visibility (brand folder: any member). Supabase blocks deleting files from SQL, so the app removes files (`boxFilePaths`, `removeSpaceFiles`) **before** deleting a box, space or account.
- Categories (keys in English, labels translated): tools, electronics, kitchen, clothing, bedding, books, documents, toys, sports, seasonal, decor, cleaning, personal, hobby, other. Same list in `js/app.js` (`CATEGORIES`) and the edge function.

## App structure
- `S` holds state: `space`, `role`, `spaces`, `locations`, `boxes`, `items` (all items of the space, used for offline, lists and export), `offline`, `select`. `ROLE.canEdit()/isStaff()/isOwner()`, `isBusiness()`. `applySpaceLook()` sets body classes `role-customer`, `read-only`, `is-business` and the `--brand` colour.
- Feature files plug in through `HOOKS` (homeTop, tileBadges, heroBadges, boxActions, boxSections, boxMenu, itemBadges, itemEditor {html,bind,collect,view}, boxForm, placeForm, labelExtra, labelColor, meSections, searchExtra, afterLoad, bootFailed, afterBoot) and `PAGES` (extra routes: attention, moving, space, activity, requests). Each feature file adds its own text with `Object.assign(I18N.en/tr, …)` and its buttons to `ACTIONS`.
- Item writes go through `Store.insertItems/updateItem/deleteItem` (`offline.js`): local copy updated first, server second, queued in `localStorage` (`bf_outbox_v2_<uid>`) when offline and sent on reconnect (inserts use client ids + upsert, so replays are safe). The space copy is cached in `bf_cache_v2_<uid>`; `bootFailed` opens it when the server can't be reached. Box/space changes, photos and AI need a connection.
- Hash router: `#/` boxes, `#/box/<id>`, `#/places`, `#/labels`, `#/me`, `#/moving`, `#/space`, `#/activity`, `#/requests`, `#/attention/<reminders|out|expiring|warranty>`. QR labels encode `<origin>/?box=<uuid>`; invite links `/?invite=<token>`; both survive sign-in via sessionStorage.
- Customers get tabs Boxes · Requests · Scan · Me (Places/Labels hidden), read-only box pages and a "Request this box" button.
- Bilingual: `t(key, vars)`, plurals with `tp(base, n)` and `_one`/`_other` keys. AI is told to write names in the selected language.
- Theme: Light / Dark / System in localStorage `bf_theme`. Use the CSS tokens (`--surface`, `--ink`, `--on-ink`, `--kraft`, `--warn-*`, `--ok-soft`, `--bad-*`) instead of hard-coded colours.
- Test hook: if `window.__TEST_SUPABASE__` exists it is used instead of the real client (see `tests/fake-supabase.js`, which also imitates the role rules).

## Visual style
- Concrete-grey page (`--bg`) with white surfaces; the **kraft-paper label** (`.kraft`) is the identity of a box everywhere. Box codes use the stencil face (`--font-code`: Big Shoulders Stencil). Titles: Big Shoulders. UI text: Instrument Sans.
- Status shows as small pills (`badge()` → `.badge-pill` with tones warn/bad/ok/info/muted). Places and rooms have colour dots; printed labels get a colour band (`.plabel.banded`, `--band`).
- Near-black primary buttons (inverted in dark mode), no all-caps labels, no middle-dot separators.

## Working conventions
- Keep element `id`s and `data-act` names stable; tests depend on them.
- After changes run everything in `tests/` (see README): `schema.test.mjs`, `features.test.mjs` (PGlite, real Postgres), `smoke.mjs`, `features.smoke.mjs` (headless Chromium + fake Supabase + fake AI), `i18n.check.mjs`, `box-ai.test.ts` (Deno).
- Bump `CACHE` in `sw.js` when the shell file list changes.

## Open items for the owner
- Not done: payments / paid plan (merchant account needed; Stripe isn't available for Turkish businesses, consider iyzico or app-store billing), push notifications for reminders, custom domain, App Store / Play Store.
- Google sign-in needs the Supabase callback URL added to the Google OAuth client, and the Google app published (it's in Testing).
- The privacy policy is a plain-language starting point, not legal advice; check KVKK requirements before a commercial launch.
- Vercel Hobby is non-commercial; switch to Pro when the app earns money.

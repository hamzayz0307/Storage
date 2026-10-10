-- =====================================================================
-- Box Finder / Kutu Bul — database setup
-- Run this whole file ONCE in Supabase → SQL Editor → New query → Run.
-- It is safe to run again (everything uses "if not exists" / "or replace").
--
-- Data model in one sentence:
--   a SPACE holds LOCATIONS, a location holds BOXES, a box holds ITEMS and PHOTOS.
-- Today every user gets one personal space. Shared storage (a business with
-- staff, a family) later = adding more rows to space_members. No rebuild needed.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- helpers -------------------------------------------------

-- Lowercase + strip Turkish/accented letters so "Çekiç", "cekic" and
-- "ÇEKİÇ" all search the same way.
create or replace function public.fold_text(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
           replace(lower(replace(coalesce(t, ''), 'İ', 'i')), U&'\0307', ''),
           'çğıöşüâîûéèêàáäëïô',
           'cgiosuaiueeeaaaeio'
         )
$$;

create or replace function public.try_uuid(t text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return t::uuid;
exception when others then
  return null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------- tables --------------------------------------------------

create table if not exists public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  box_counter integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  language         text not null default 'en' check (language in ('en', 'tr')),
  current_space_id uuid references public.spaces(id) on delete set null,
  onboarded        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.locations (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boxes (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references public.spaces(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete set null,
  code             text not null,
  name             text not null check (length(trim(name)) > 0),
  spot             text,
  notes            text,
  cover_photo_id   uuid,
  label_printed_at timestamptz,
  search_text      text generated always as
                     (public.fold_text(code || ' ' || name || ' ' || coalesce(spot, '') || ' ' || coalesce(notes, ''))) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (space_id, code)
);

create table if not exists public.box_photos (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  box_id     uuid not null references public.boxes(id) on delete cascade,
  path       text not null unique,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'boxes_cover_photo_fk') then
    alter table public.boxes
      add constraint boxes_cover_photo_fk
      foreign key (cover_photo_id) references public.box_photos(id) on delete set null;
  end if;
end
$$;

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  box_id      uuid not null references public.boxes(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  category    text not null default 'other',
  quantity    integer not null default 1 check (quantity >= 0),
  notes       text,
  source      text not null default 'manual' check (source in ('manual', 'ai')),
  search_text text generated always as (public.fold_text(name || ' ' || coalesce(notes, ''))) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per user per day; only the AI edge function writes here.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

create index if not exists locations_space_idx   on public.locations (space_id);
create index if not exists boxes_space_idx       on public.boxes (space_id);
create index if not exists boxes_location_idx    on public.boxes (location_id);
create index if not exists box_photos_box_idx    on public.box_photos (box_id);
create index if not exists items_box_idx         on public.items (box_id);
create index if not exists items_space_idx       on public.items (space_id);
create index if not exists items_search_trgm_idx on public.items using gin (search_text extensions.gin_trgm_ops);
create index if not exists boxes_search_trgm_idx on public.boxes using gin (search_text extensions.gin_trgm_ops);

-- ---------- membership checks (used by every policy) ----------------

create or replace function public.is_space_member(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = p_space and m.user_id = auth.uid()
  )
$$;

create or replace function public.can_edit_space(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = p_space and m.user_id = auth.uid() and m.role in ('owner', 'editor')
  )
$$;

-- ---------- triggers ------------------------------------------------

-- New boxes get the next code in their space: B-0001, B-0002, ...
create or replace function public.boxes_assign_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.code is null or trim(new.code) = '' then
    update public.spaces set box_counter = box_counter + 1
      where id = new.space_id
      returning box_counter into n;
    if n is null then
      raise exception 'Space not found';
    end if;
    new.code := 'B-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  end if;
  return new;
end
$$;

-- A box's location must be in the same space.
create or replace function public.boxes_check_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location_id is not null and not exists (
    select 1 from public.locations l where l.id = new.location_id and l.space_id = new.space_id
  ) then
    raise exception 'Location belongs to a different space';
  end if;
  return new;
end
$$;

-- Items and photos always take their space from their box (the app never
-- has to send space_id, and nobody can put an item into a box they can't see).
create or replace function public.copy_space_from_box()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.space_id := (select b.space_id from public.boxes b where b.id = new.box_id);
  if new.space_id is null then
    raise exception 'Box not found';
  end if;
  return new;
end
$$;

drop trigger if exists boxes_assign_code on public.boxes;
create trigger boxes_assign_code before insert on public.boxes
  for each row execute function public.boxes_assign_code();

drop trigger if exists boxes_check_location on public.boxes;
create trigger boxes_check_location before insert or update of location_id, space_id on public.boxes
  for each row execute function public.boxes_check_location();

drop trigger if exists items_copy_space on public.items;
create trigger items_copy_space before insert or update of box_id on public.items
  for each row execute function public.copy_space_from_box();

drop trigger if exists box_photos_copy_space on public.box_photos;
create trigger box_photos_copy_space before insert or update of box_id on public.box_photos
  for each row execute function public.copy_space_from_box();

drop trigger if exists locations_updated_at on public.locations;
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists boxes_updated_at on public.boxes;
create trigger boxes_updated_at before update on public.boxes
  for each row execute function public.set_updated_at();

drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ---------- row level security --------------------------------------

alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.profiles      enable row level security;
alter table public.locations     enable row level security;
alter table public.boxes         enable row level security;
alter table public.box_photos    enable row level security;
alter table public.items         enable row level security;
alter table public.ai_usage      enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "members read space" on public.spaces;
create policy "members read space" on public.spaces for select to authenticated
  using (public.is_space_member(id));
drop policy if exists "owner updates space" on public.spaces;
create policy "owner updates space" on public.spaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "owner deletes space" on public.spaces;
create policy "owner deletes space" on public.spaces for delete to authenticated
  using (owner_id = (select auth.uid()));
-- (spaces are created only through bootstrap_me() below)

drop policy if exists "members see members" on public.space_members;
create policy "members see members" on public.space_members for select to authenticated
  using (public.is_space_member(space_id));
-- (adding/removing members comes with the sharing feature)

do $$
declare
  t text;
begin
  foreach t in array array['locations', 'boxes', 'box_photos', 'items'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_space_member(space_id))', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_space(space_id))', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_space(space_id)) with check (public.can_edit_space(space_id))', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_space(space_id))', t);
  end loop;
end
$$;

drop policy if exists "own usage" on public.ai_usage;
create policy "own usage" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- functions the app calls ---------------------------------

-- Called right after sign-in. Creates the profile and the personal space the
-- first time, and returns both. Safe to call every time.
create or replace function public.bootstrap_me(p_language text default 'en', p_space_name text default 'My storage')
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  prof public.profiles;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  insert into public.profiles (user_id, language)
    values (uid, case when p_language in ('en', 'tr') then p_language else 'en' end)
    on conflict (user_id) do nothing;

  select * into prof from public.profiles where user_id = uid;
  sid := prof.current_space_id;

  if sid is null or not exists (select 1 from public.space_members where space_id = sid and user_id = uid) then
    select m.space_id into sid from public.space_members m
      where m.user_id = uid order by m.created_at limit 1;
  end if;

  if sid is null then
    insert into public.spaces (name, owner_id)
      values (coalesce(nullif(trim(p_space_name), ''), 'My storage'), uid)
      returning id into sid;
    insert into public.space_members (space_id, user_id, role) values (sid, uid, 'owner');
  end if;

  update public.profiles set current_space_id = sid where user_id = uid and current_space_id is distinct from sid;
  select * into prof from public.profiles where user_id = uid;

  return json_build_object(
    'profile', row_to_json(prof),
    'space', (select row_to_json(s) from public.spaces s where s.id = sid),
    'role', (select role from public.space_members where space_id = sid and user_id = uid)
  );
end
$$;

-- All boxes of a space with item count, photo count and the cover photo path,
-- newest box first. Runs with the caller's permissions (RLS applies).
create or replace function public.list_boxes(p_space uuid)
returns table (
  id               uuid,
  code             text,
  name             text,
  location_id      uuid,
  spot             text,
  notes            text,
  cover_photo_id   uuid,
  label_printed_at timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz,
  item_count       integer,
  photo_count      integer,
  cover_path       text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, b.code, b.name, b.location_id, b.spot, b.notes, b.cover_photo_id,
         b.label_printed_at, b.created_at, b.updated_at,
         (select count(*)::integer from public.items i where i.box_id = b.id),
         (select count(*)::integer from public.box_photos p where p.box_id = b.id),
         coalesce(
           (select p.path from public.box_photos p where p.id = b.cover_photo_id),
           (select p.path from public.box_photos p where p.box_id = b.id order by p.created_at desc limit 1)
         )
  from public.boxes b
  where b.space_id = p_space
  order by b.created_at desc, b.code desc
$$;

-- Search items and boxes. Finds partial words ("drll" → "drill") and ignores
-- Turkish letters/case. Runs with the caller's permissions, so RLS applies.
create or replace function public.search_inventory(p_space uuid, p_query text)
returns table (
  kind          text,
  item_id       uuid,
  item_name     text,
  quantity      integer,
  category      text,
  box_id        uuid,
  box_code      text,
  box_name      text,
  location_name text,
  spot          text,
  score         real
)
language sql
stable
security invoker
set search_path = public, extensions
set pg_trgm.word_similarity_threshold = 0.45
as $$
  with q as (
    select public.fold_text(trim(coalesce(p_query, ''))) as q
  ),
  p as (
    select q.q,
           '%' || replace(replace(replace(q.q, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
    from q
  )
  select * from (
    select 'item'::text, i.id, i.name, i.quantity, i.category,
           b.id, b.code, b.name, l.name, b.spot,
           greatest(
             case when i.search_text like p.pat then 1.0 else 0 end,
             word_similarity(p.q, i.search_text)
           )::real
    from public.items i
    join public.boxes b on b.id = i.box_id
    left join public.locations l on l.id = b.location_id
    cross join p
    where i.space_id = p_space
      and length(p.q) > 0
      and (i.search_text like p.pat or p.q <% i.search_text)
    union all
    select 'box'::text, null::uuid, null::text, null::integer, null::text,
           b.id, b.code, b.name, l.name, b.spot,
           greatest(
             case when b.search_text like p.pat then 1.0 else 0 end,
             word_similarity(p.q, b.search_text)
           )::real
    from public.boxes b
    left join public.locations l on l.id = b.location_id
    cross join p
    where b.space_id = p_space
      and length(p.q) > 0
      and (b.search_text like p.pat or p.q <% b.search_text)
  ) r (kind, item_id, item_name, quantity, category, box_id, box_code, box_name, location_name, spot, score)
  order by score desc, kind desc, item_name nulls last, box_code
  limit 60
$$;

-- Only the AI edge function (service role) may call these two.
create or replace function public.consume_ai_credit(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c integer;
begin
  insert into public.ai_usage as u (user_id, day, count)
    values (p_user, current_date, 1)
    on conflict (user_id, day) do update
      set count = u.count + 1
      where u.count < p_limit
    returning u.count into c;
  if c is null then
    return -1;            -- limit reached
  end if;
  return p_limit - c;     -- credits left today
end
$$;

create or replace function public.refund_ai_credit(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = current_date
$$;

-- Deletes everything the caller owns and their login. The app removes the
-- photo files from Storage first (Supabase doesn't allow deleting files from SQL).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from public.spaces where owner_id = uid;          -- cascades to locations, boxes, items, photos rows
  delete from public.space_members where user_id = uid;
  delete from public.ai_usage where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end
$$;

-- ---------- permissions ---------------------------------------------

revoke all on public.spaces, public.space_members, public.profiles, public.locations,
              public.boxes, public.box_photos, public.items, public.ai_usage from anon;

grant select, insert, update, delete on public.profiles, public.locations, public.boxes,
                                       public.box_photos, public.items to authenticated;
grant select, update, delete on public.spaces to authenticated;
grant select on public.space_members, public.ai_usage to authenticated;

revoke execute on function public.consume_ai_credit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, integer) to service_role;
grant execute on function public.refund_ai_credit(uuid) to service_role;

revoke execute on function public.bootstrap_me(text, text) from public, anon;
revoke execute on function public.search_inventory(uuid, text) from public, anon;
revoke execute on function public.list_boxes(uuid) from public, anon;
grant execute on function public.list_boxes(uuid) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.bootstrap_me(text, text) to authenticated;
grant execute on function public.search_inventory(uuid, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- photo storage -------------------------------------------
-- Private bucket. Files live at  <space_id>/<box_id>/<random>.jpg
-- and only members of that space can see them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('box-photos', 'box-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "box photos: members read" on storage.objects;
create policy "box photos: members read" on storage.objects for select to authenticated
  using (bucket_id = 'box-photos' and public.is_space_member(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "box photos: editors upload" on storage.objects;
create policy "box photos: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "box photos: editors update" on storage.objects;
create policy "box photos: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "box photos: editors delete" on storage.objects;
create policy "box photos: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

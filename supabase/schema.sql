-- =====================================================================
-- Box Finder / Kutu Bul — database setup (version 2)
-- Run this whole file in Supabase → SQL Editor → New query → Run.
-- Safe to run again on an existing project: it only adds what's missing
-- and keeps all your data.
--
-- Data model in one sentence:
--   a SPACE holds LOCATIONS (places / units), a location holds BOXES,
--   a box holds ITEMS and PHOTOS. People join a space as owner, editor,
--   viewer or customer (customers only see the units they're given).
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
alter table public.spaces add column if not exists kind        text not null default 'personal';
alter table public.spaces add column if not exists brand_name  text;
alter table public.spaces add column if not exists brand_color text;
alter table public.spaces add column if not exists logo_path   text;
alter table public.spaces add column if not exists currency    text not null default 'TRY';
alter table public.spaces add column if not exists moving      boolean not null default false;
alter table public.spaces add column if not exists rooms       jsonb not null default '[]'::jsonb;

create table if not exists public.space_members (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',
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
alter table public.locations add column if not exists color text;

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
alter table public.boxes add column if not exists move_status   text;
alter table public.boxes add column if not exists dest_room     text;
alter table public.boxes add column if not exists fragile       boolean not null default false;
alter table public.boxes add column if not exists remind_on     date;
alter table public.boxes add column if not exists remind_note   text;
alter table public.boxes add column if not exists remind_yearly boolean not null default false;

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
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.items add column if not exists checked_out_at timestamptz;   -- taken out / lent
alter table public.items add column if not exists checked_out_to text;          -- who has it
alter table public.items add column if not exists expires_on     date;
alter table public.items add column if not exists value          numeric(12, 2); -- per piece
alter table public.items add column if not exists receipt_path   text;
alter table public.items add column if not exists kind           text not null default 'thing';
alter table public.items add column if not exists brand          text;
alter table public.items add column if not exists model          text;
alter table public.items add column if not exists serial         text;
alter table public.items add column if not exists purchased_on   date;
alter table public.items add column if not exists warranty_until date;

-- Search text is rebuilt on every run so it always covers the newest fields.
drop index if exists public.items_search_trgm_idx;
alter table public.items drop column if exists search_text;
alter table public.items add column search_text text generated always as (
  public.fold_text(name || ' ' || coalesce(notes, '') || ' ' || coalesce(brand, '') || ' ' ||
                   coalesce(model, '') || ' ' || coalesce(serial, '') || ' ' || coalesce(checked_out_to, ''))
) stored;

-- Customers of a business space only see the units (locations) listed here.
create table if not exists public.member_locations (
  space_id    uuid not null references public.spaces(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (user_id, location_id)
);

-- Invite links. The id is the secret token in the link.
create table if not exists public.space_invites (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces(id) on delete cascade,
  role         text not null check (role in ('editor', 'viewer', 'customer')),
  location_ids uuid[] not null default '{}',
  created_by   uuid references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  used_by      uuid references auth.users(id) on delete set null,
  used_at      timestamptz
);

-- Read-only share links for one box. The id is the secret token in the link.
create table if not exists public.box_shares (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  box_id     uuid not null references public.boxes(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- "Bring me this box" requests from customers (or anyone in the space).
create table if not exists public.retrieval_requests (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces(id) on delete cascade,
  box_id       uuid not null references public.boxes(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  note         text check (note is null or length(note) <= 500),
  status       text not null default 'open' check (status in ('open', 'ready', 'done', 'cancelled')),
  handled_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Who did what, when. Written only by triggers.
create table if not exists public.activity (
  id         bigint generated always as identity primary key,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,
  box_id     uuid,
  item_id    uuid,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null default 'idea' check (kind in ('idea', 'problem', 'other')),
  message    text not null check (length(trim(message)) between 1 and 2000),
  page       text,
  language   text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- One row per user per day; only the AI edge function writes here.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

-- Named checks (added once; role check is replaced to allow 'customer').
do $$
begin
  alter table public.space_members drop constraint if exists space_members_role_check;
  alter table public.space_members add constraint space_members_role_check
    check (role in ('owner', 'editor', 'viewer', 'customer'));
  if not exists (select 1 from pg_constraint where conname = 'spaces_kind_check') then
    alter table public.spaces add constraint spaces_kind_check check (kind in ('personal', 'business'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spaces_brand_color_check') then
    alter table public.spaces add constraint spaces_brand_color_check check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spaces_currency_check') then
    alter table public.spaces add constraint spaces_currency_check check (currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'locations_color_check') then
    alter table public.locations add constraint locations_color_check check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'boxes_move_status_check') then
    alter table public.boxes add constraint boxes_move_status_check check (move_status is null or move_status in ('packed', 'in_transit', 'unpacked'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_kind_check') then
    alter table public.items add constraint items_kind_check check (kind in ('thing', 'appliance'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_value_check') then
    alter table public.items add constraint items_value_check check (value is null or value >= 0);
  end if;
end
$$;

create index if not exists locations_space_idx      on public.locations (space_id);
create index if not exists boxes_space_idx          on public.boxes (space_id);
create index if not exists boxes_location_idx       on public.boxes (location_id);
create index if not exists box_photos_box_idx       on public.box_photos (box_id);
create index if not exists items_box_idx            on public.items (box_id);
create index if not exists items_space_idx          on public.items (space_id);
create index if not exists items_search_trgm_idx    on public.items using gin (search_text extensions.gin_trgm_ops);
create index if not exists boxes_search_trgm_idx    on public.boxes using gin (search_text extensions.gin_trgm_ops);
create index if not exists member_locations_loc_idx on public.member_locations (location_id);
create index if not exists space_invites_space_idx  on public.space_invites (space_id);
create index if not exists box_shares_box_idx       on public.box_shares (box_id);
create index if not exists requests_space_idx       on public.retrieval_requests (space_id, status);
create index if not exists activity_space_idx       on public.activity (space_id, id desc);
create unique index if not exists requests_one_open_per_box
  on public.retrieval_requests (box_id) where status in ('open', 'ready');

-- ---------- permission checks (used by every policy) ----------------

create or replace function public.member_role(p_space uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.space_members m where m.space_id = p_space and m.user_id = auth.uid()
$$;

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

-- Staff = everyone except customers (they see the whole space).
create or replace function public.is_staff(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = p_space and m.user_id = auth.uid() and m.role in ('owner', 'editor', 'viewer')
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

create or replace function public.can_see_location(p_location uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.locations l
    join public.space_members m on m.space_id = l.space_id and m.user_id = auth.uid()
    where l.id = p_location
      and (m.role <> 'customer' or exists (
        select 1 from public.member_locations ml where ml.location_id = l.id and ml.user_id = auth.uid()))
  )
$$;

create or replace function public.can_see_box(p_box uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.boxes b
    join public.space_members m on m.space_id = b.space_id and m.user_id = auth.uid()
    where b.id = p_box
      and (m.role <> 'customer' or (b.location_id is not null and exists (
        select 1 from public.member_locations ml where ml.location_id = b.location_id and ml.user_id = auth.uid())))
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

-- Rows that belong to a box always take their space from it (the app never
-- sends space_id, and nobody can attach anything to a box they can't see).
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

-- Editors may change space settings, but never the owner.
create or replace function public.spaces_protect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'The owner of a space cannot be changed';
  end if;
  if new.box_counter < old.box_counter then
    new.box_counter := old.box_counter;
  end if;
  return new;
end
$$;

-- Requests: the requester is always the signed-in user. Staff (owner/editor)
-- move them through open → ready → done; the requester may only cancel.
create or replace function public.requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.requested_by := auth.uid();
    new.status := 'open';
    new.handled_by := null;
    return new;
  end if;
  -- A deleted account only blanks out its name on old requests: allow that.
  if new.status = old.status and new.box_id = old.box_id and new.space_id = old.space_id
     and new.note is not distinct from old.note
     and (new.requested_by is null or new.requested_by = old.requested_by)
     and (new.handled_by is null or new.handled_by = old.handled_by)
     and (new.requested_by is distinct from old.requested_by or new.handled_by is distinct from old.handled_by) then
    return new;
  end if;
  new.updated_at := now();
  if new.box_id is distinct from old.box_id or new.space_id is distinct from old.space_id
     or new.requested_by is distinct from old.requested_by then
    raise exception 'Not allowed';
  end if;
  if public.can_edit_space(new.space_id) then
    if new.status is distinct from old.status then
      new.handled_by := auth.uid();
    end if;
    return new;
  end if;
  if old.requested_by = auth.uid() and old.status = 'open' and new.status = 'cancelled'
     and new.note is not distinct from old.note then
    return new;
  end if;
  raise exception 'Not allowed';
end
$$;

-- Activity log. Skips rows whose space or box is being deleted as a whole.
create or replace function public.log_activity(p_space uuid, p_action text, p_box uuid, p_item uuid, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_space is null or not exists (select 1 from public.spaces s where s.id = p_space) then
    return;
  end if;
  insert into public.activity (space_id, user_id, action, box_id, item_id, details)
  values (p_space, auth.uid(), p_action, p_box, p_item, coalesce(p_details, '{}'::jsonb));
end
$$;

create or replace function public.items_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_new text;
  c_old text;
begin
  if tg_op = 'INSERT' then
    select b.code into c_new from public.boxes b where b.id = new.box_id;
    perform public.log_activity(new.space_id, 'item_added', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'quantity', new.quantity, 'box', c_new));
    return null;
  end if;
  if tg_op = 'DELETE' then
    select b.code into c_old from public.boxes b where b.id = old.box_id;
    if c_old is null then
      return null;   -- the whole box is being deleted
    end if;
    perform public.log_activity(old.space_id, 'item_removed', old.box_id, old.id,
      jsonb_build_object('name', old.name, 'box', c_old));
    return null;
  end if;
  select b.code into c_new from public.boxes b where b.id = new.box_id;
  if new.box_id is distinct from old.box_id then
    select b.code into c_old from public.boxes b where b.id = old.box_id;
    perform public.log_activity(new.space_id, 'item_moved', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'from', c_old, 'box', c_new));
  elsif new.checked_out_at is not null and old.checked_out_at is null then
    perform public.log_activity(new.space_id, 'item_taken_out', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'box', c_new, 'to', new.checked_out_to));
  elsif new.checked_out_at is null and old.checked_out_at is not null then
    perform public.log_activity(new.space_id, 'item_returned', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'box', c_new));
  elsif new.quantity is distinct from old.quantity then
    perform public.log_activity(new.space_id, 'item_quantity', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'box', c_new, 'from', old.quantity, 'to', new.quantity));
  elsif new.name is distinct from old.name then
    perform public.log_activity(new.space_id, 'item_renamed', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'from', old.name, 'box', c_new));
  elsif (new.category, new.notes, new.expires_on, new.value, new.kind, new.brand, new.model, new.serial,
         new.purchased_on, new.warranty_until, new.receipt_path, new.checked_out_to)
        is distinct from
        (old.category, old.notes, old.expires_on, old.value, old.kind, old.brand, old.model, old.serial,
         old.purchased_on, old.warranty_until, old.receipt_path, old.checked_out_to) then
    perform public.log_activity(new.space_id, 'item_edited', new.box_id, new.id,
      jsonb_build_object('name', new.name, 'box', c_new));
  end if;
  return null;
end
$$;

create or replace function public.boxes_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_old text;
  l_new text;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.space_id, 'box_created', new.id, null,
      jsonb_build_object('box', new.code, 'name', new.name));
    return null;
  end if;
  if tg_op = 'DELETE' then
    perform public.log_activity(old.space_id, 'box_deleted', null, null,
      jsonb_build_object('box', old.code, 'name', old.name));
    return null;
  end if;
  if new.location_id is distinct from old.location_id then
    select l.name into l_old from public.locations l where l.id = old.location_id;
    select l.name into l_new from public.locations l where l.id = new.location_id;
    perform public.log_activity(new.space_id, 'box_moved', new.id, null,
      jsonb_build_object('box', new.code, 'name', new.name, 'from', l_old, 'to', l_new));
  elsif new.move_status is distinct from old.move_status then
    perform public.log_activity(new.space_id, 'box_status', new.id, null,
      jsonb_build_object('box', new.code, 'name', new.name, 'status', new.move_status));
  elsif new.name is distinct from old.name then
    perform public.log_activity(new.space_id, 'box_renamed', new.id, null,
      jsonb_build_object('box', new.code, 'name', new.name, 'from', old.name));
  elsif (new.spot, new.notes, new.fragile, new.dest_room, new.remind_on, new.remind_note, new.remind_yearly)
        is distinct from
        (old.spot, old.notes, old.fragile, old.dest_room, old.remind_on, old.remind_note, old.remind_yearly) then
    perform public.log_activity(new.space_id, 'box_edited', new.id, null,
      jsonb_build_object('box', new.code, 'name', new.name));
  end if;
  return null;
end
$$;

create or replace function public.requests_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text;
begin
  select b.code into c from public.boxes b where b.id = new.box_id;
  if tg_op = 'INSERT' then
    perform public.log_activity(new.space_id, 'request_created', new.box_id, null,
      jsonb_build_object('box', c, 'note', new.note));
  elsif new.status is distinct from old.status then
    perform public.log_activity(new.space_id, 'request_' || new.status, new.box_id, null,
      jsonb_build_object('box', c));
  end if;
  return null;
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

drop trigger if exists box_shares_copy_space on public.box_shares;
create trigger box_shares_copy_space before insert on public.box_shares
  for each row execute function public.copy_space_from_box();

drop trigger if exists requests_copy_space on public.retrieval_requests;
create trigger requests_copy_space before insert on public.retrieval_requests
  for each row execute function public.copy_space_from_box();

drop trigger if exists requests_guard on public.retrieval_requests;
create trigger requests_guard before insert or update on public.retrieval_requests
  for each row execute function public.requests_guard();

drop trigger if exists spaces_protect on public.spaces;
create trigger spaces_protect before update on public.spaces
  for each row execute function public.spaces_protect();

drop trigger if exists locations_updated_at on public.locations;
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists boxes_updated_at on public.boxes;
create trigger boxes_updated_at before update on public.boxes
  for each row execute function public.set_updated_at();

drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists items_activity on public.items;
create trigger items_activity after insert or update or delete on public.items
  for each row execute function public.items_activity();

drop trigger if exists boxes_activity on public.boxes;
create trigger boxes_activity after insert or update or delete on public.boxes
  for each row execute function public.boxes_activity();

drop trigger if exists requests_activity on public.retrieval_requests;
create trigger requests_activity after insert or update on public.retrieval_requests
  for each row execute function public.requests_activity();

-- ---------- row level security --------------------------------------

alter table public.spaces             enable row level security;
alter table public.space_members      enable row level security;
alter table public.profiles           enable row level security;
alter table public.locations          enable row level security;
alter table public.boxes              enable row level security;
alter table public.box_photos         enable row level security;
alter table public.items              enable row level security;
alter table public.ai_usage           enable row level security;
alter table public.member_locations   enable row level security;
alter table public.space_invites      enable row level security;
alter table public.box_shares         enable row level security;
alter table public.retrieval_requests enable row level security;
alter table public.activity           enable row level security;
alter table public.feedback           enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "members read space" on public.spaces;
create policy "members read space" on public.spaces for select to authenticated
  using (public.is_space_member(id));
drop policy if exists "owner updates space" on public.spaces;
drop policy if exists "editors update space" on public.spaces;
create policy "editors update space" on public.spaces for update to authenticated
  using (public.can_edit_space(id)) with check (public.can_edit_space(id));
drop policy if exists "owner deletes space" on public.spaces;
create policy "owner deletes space" on public.spaces for delete to authenticated
  using (owner_id = (select auth.uid()));
-- (spaces are created only through bootstrap_me() / create_space())

drop policy if exists "members see members" on public.space_members;
drop policy if exists "see members" on public.space_members;
create policy "see members" on public.space_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff(space_id));
-- (members are added/changed only through the invite and member functions)

drop policy if exists "see unit access" on public.member_locations;
create policy "see unit access" on public.member_locations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff(space_id));

-- Reading: staff see the whole space; customers only their units.
drop policy if exists "members read" on public.locations;
drop policy if exists "read" on public.locations;
create policy "read" on public.locations for select to authenticated
  using (public.is_staff(space_id) or public.can_see_location(id));

drop policy if exists "members read" on public.boxes;
drop policy if exists "read" on public.boxes;
create policy "read" on public.boxes for select to authenticated
  using (public.is_staff(space_id) or (location_id is not null and public.can_see_location(location_id)));

drop policy if exists "members read" on public.items;
drop policy if exists "read" on public.items;
create policy "read" on public.items for select to authenticated
  using (public.is_staff(space_id) or public.can_see_box(box_id));

drop policy if exists "members read" on public.box_photos;
drop policy if exists "read" on public.box_photos;
create policy "read" on public.box_photos for select to authenticated
  using (public.is_staff(space_id) or public.can_see_box(box_id));

-- Writing: owners and editors only.
do $$
declare
  t text;
begin
  foreach t in array array['locations', 'boxes', 'box_photos', 'items'] loop
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_space(space_id))', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_space(space_id)) with check (public.can_edit_space(space_id))', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_space(space_id))', t);
  end loop;
end
$$;

drop policy if exists "owner sees invites" on public.space_invites;
create policy "owner sees invites" on public.space_invites for select to authenticated
  using (public.member_role(space_id) = 'owner');
drop policy if exists "owner deletes invites" on public.space_invites;
create policy "owner deletes invites" on public.space_invites for delete to authenticated
  using (public.member_role(space_id) = 'owner');

drop policy if exists "editors manage shares" on public.box_shares;
drop policy if exists "editors read shares" on public.box_shares;
create policy "editors read shares" on public.box_shares for select to authenticated
  using (public.can_edit_space(space_id));
drop policy if exists "editors create shares" on public.box_shares;
create policy "editors create shares" on public.box_shares for insert to authenticated
  with check (public.can_edit_space(space_id));
drop policy if exists "editors delete shares" on public.box_shares;
create policy "editors delete shares" on public.box_shares for delete to authenticated
  using (public.can_edit_space(space_id));

drop policy if exists "read requests" on public.retrieval_requests;
create policy "read requests" on public.retrieval_requests for select to authenticated
  using (public.is_staff(space_id) or requested_by = (select auth.uid()));
drop policy if exists "create requests" on public.retrieval_requests;
create policy "create requests" on public.retrieval_requests for insert to authenticated
  with check (requested_by = (select auth.uid()) and public.can_see_box(box_id));
drop policy if exists "update requests" on public.retrieval_requests;
create policy "update requests" on public.retrieval_requests for update to authenticated
  using (public.can_edit_space(space_id) or requested_by = (select auth.uid()))
  with check (public.can_edit_space(space_id) or requested_by = (select auth.uid()));

drop policy if exists "staff read activity" on public.activity;
create policy "staff read activity" on public.activity for select to authenticated
  using (public.is_staff(space_id));

drop policy if exists "own feedback insert" on public.feedback;
create policy "own feedback insert" on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "own feedback read" on public.feedback;
create policy "own feedback read" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own usage" on public.ai_usage;
create policy "own usage" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- functions the app calls ---------------------------------

-- Called right after sign-in. Creates the profile and the personal space the
-- first time, and returns the current space plus all spaces you're in.
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
    'role', (select role from public.space_members where space_id = sid and user_id = uid),
    'spaces', (
      select coalesce(json_agg(json_build_object(
               'id', s.id, 'name', s.name, 'kind', s.kind, 'role', m.role,
               'brand_name', s.brand_name, 'brand_color', s.brand_color) order by m.created_at), '[]'::json)
      from public.space_members m join public.spaces s on s.id = m.space_id
      where m.user_id = uid)
  );
end
$$;

create or replace function public.create_space(p_name text, p_kind text default 'personal')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Name required';
  end if;
  if (select count(*) from public.spaces where owner_id = uid) >= 10 then
    raise exception 'Too many spaces';
  end if;
  insert into public.spaces (name, owner_id, kind)
    values (left(trim(p_name), 60), uid, case when p_kind = 'business' then 'business' else 'personal' end)
    returning id into sid;
  insert into public.space_members (space_id, user_id, role) values (sid, uid, 'owner');
  update public.profiles set current_space_id = sid where user_id = uid;
  return sid;
end
$$;

create or replace function public.switch_space(p_space uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_space_member(p_space) then
    raise exception 'Not a member';
  end if;
  update public.profiles set current_space_id = p_space where user_id = auth.uid();
end
$$;

-- All boxes you can see in a space, with counts and the cover photo.
-- Runs with the caller's permissions (RLS applies), so customers get only theirs.
drop function if exists public.list_boxes(uuid);
create function public.list_boxes(p_space uuid)
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
  cover_path       text,
  move_status      text,
  dest_room        text,
  fragile          boolean,
  remind_on        date,
  remind_note      text,
  remind_yearly    boolean,
  out_count        integer,
  value_total      numeric
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
         ),
         b.move_status, b.dest_room, b.fragile, b.remind_on, b.remind_note, b.remind_yearly,
         (select count(*)::integer from public.items i where i.box_id = b.id and i.checked_out_at is not null),
         (select coalesce(sum(i.value * greatest(i.quantity, 1)), 0) from public.items i where i.box_id = b.id)
  from public.boxes b
  where b.space_id = p_space
  order by b.created_at desc, b.code desc
$$;

-- Search items and boxes. Finds partial words ("drll" → "drill") and ignores
-- Turkish letters/case. Runs with the caller's permissions, so RLS applies.
drop function if exists public.search_inventory(uuid, text);
create function public.search_inventory(p_space uuid, p_query text)
returns table (
  kind           text,
  item_id        uuid,
  item_name      text,
  quantity       integer,
  category       text,
  box_id         uuid,
  box_code       text,
  box_name       text,
  location_name  text,
  spot           text,
  score          real,
  checked_out_at timestamptz,
  checked_out_to text,
  expires_on     date
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
           )::real,
           i.checked_out_at, i.checked_out_to, i.expires_on
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
           )::real,
           null::timestamptz, null::text, null::date
    from public.boxes b
    left join public.locations l on l.id = b.location_id
    cross join p
    where b.space_id = p_space
      and length(p.q) > 0
      and (b.search_text like p.pat or p.q <% b.search_text)
  ) r (kind, item_id, item_name, quantity, category, box_id, box_code, box_name, location_name, spot, score,
       checked_out_at, checked_out_to, expires_on)
  order by score desc, kind desc, item_name nulls last, box_code
  limit 60
$$;

-- ---------- members & invites ---------------------------------------

drop function if exists public.list_members(uuid);
create function public.list_members(p_space uuid)
returns table (user_id uuid, role text, display_name text, email text, joined_at timestamptz, location_ids uuid[])
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, m.role, p.display_name, u.email::text, m.created_at,
         coalesce((select array_agg(ml.location_id) from public.member_locations ml
                   where ml.space_id = m.space_id and ml.user_id = m.user_id), '{}'::uuid[])
  from public.space_members m
  left join public.profiles p on p.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.space_id = p_space and public.is_staff(p_space)
  order by case m.role when 'owner' then 0 when 'editor' then 1 when 'viewer' then 2 else 3 end, m.created_at
$$;

create or replace function public.set_member_role(p_space uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_space) is distinct from 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if p_role not in ('editor', 'viewer', 'customer') then
    raise exception 'Unknown role';
  end if;
  if p_role = 'customer' and (select s.kind from public.spaces s where s.id = p_space) <> 'business' then
    raise exception 'Customers are only for business spaces';
  end if;
  update public.space_members set role = p_role where space_id = p_space and user_id = p_user;
  if not found then
    raise exception 'Not a member';
  end if;
end
$$;

create or replace function public.set_member_locations(p_space uuid, p_user uuid, p_locations uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_space) is distinct from 'owner' then
    raise exception 'Only the owner can change access';
  end if;
  if not exists (select 1 from public.space_members m where m.space_id = p_space and m.user_id = p_user) then
    raise exception 'Not a member';
  end if;
  delete from public.member_locations where space_id = p_space and user_id = p_user;
  insert into public.member_locations (space_id, user_id, location_id)
    select p_space, p_user, l.id from public.locations l
    where l.space_id = p_space and l.id = any(coalesce(p_locations, '{}'::uuid[]));
end
$$;

create or replace function public.remove_member(p_space uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_space) is distinct from 'owner' then
    raise exception 'Only the owner can remove people';
  end if;
  if p_user = auth.uid() then
    raise exception 'The owner cannot be removed';
  end if;
  delete from public.member_locations where space_id = p_space and user_id = p_user;
  delete from public.space_members where space_id = p_space and user_id = p_user;
  update public.profiles set current_space_id = null where user_id = p_user and current_space_id = p_space;
end
$$;

create or replace function public.leave_space(p_space uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if public.member_role(p_space) = 'owner' then
    raise exception 'The owner cannot leave; delete the space instead';
  end if;
  delete from public.member_locations where space_id = p_space and user_id = uid;
  delete from public.space_members where space_id = p_space and user_id = uid;
  update public.profiles set current_space_id = null where user_id = uid and current_space_id = p_space;
end
$$;

create or replace function public.create_invite(p_space uuid, p_role text, p_locations uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok uuid;
  locs uuid[];
begin
  if public.member_role(p_space) is distinct from 'owner' then
    raise exception 'Only the owner can invite people';
  end if;
  if p_role not in ('editor', 'viewer', 'customer') then
    raise exception 'Unknown role';
  end if;
  if (select count(*) from public.space_invites i
      where i.space_id = p_space and i.used_at is null and i.expires_at > now()) >= 50 then
    raise exception 'Too many open invites';
  end if;
  select coalesce(array_agg(l.id), '{}'::uuid[]) into locs from public.locations l
    where l.space_id = p_space and l.id = any(coalesce(p_locations, '{}'::uuid[]));
  if p_role = 'customer' then
    if (select s.kind from public.spaces s where s.id = p_space) <> 'business' then
      raise exception 'Customers are only for business spaces';
    end if;
    if cardinality(locs) = 0 then
      raise exception 'Choose at least one unit';
    end if;
  else
    locs := '{}'::uuid[];
  end if;
  insert into public.space_invites (space_id, role, location_ids, created_by)
    values (p_space, p_role, locs, auth.uid())
    returning id into tok;
  return tok;
end
$$;

create or replace function public.preview_invite(p_token uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'space_id', s.id,
    'space_name', s.name,
    'kind', s.kind,
    'brand_name', s.brand_name,
    'role', i.role,
    'inviter', coalesce(nullif(trim(p.display_name), ''), split_part(u.email::text, '@', 1)),
    'valid', i.used_at is null and i.expires_at > now(),
    'already_member', exists (select 1 from public.space_members m where m.space_id = s.id and m.user_id = auth.uid())
  )
  from public.space_invites i
  join public.spaces s on s.id = i.space_id
  left join public.profiles p on p.user_id = i.created_by
  left join auth.users u on u.id = i.created_by
  where i.id = p_token
$$;

create or replace function public.accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.space_invites;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into inv from public.space_invites where id = p_token for update;
  if not found then
    raise exception 'Invite not found';
  end if;
  if exists (select 1 from public.space_members where space_id = inv.space_id and user_id = uid) then
    update public.profiles set current_space_id = inv.space_id where user_id = uid;
    return inv.space_id;
  end if;
  if inv.used_at is not null or inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;
  insert into public.space_members (space_id, user_id, role) values (inv.space_id, uid, inv.role);
  insert into public.member_locations (space_id, user_id, location_id)
    select inv.space_id, uid, l.id from public.locations l
    where l.space_id = inv.space_id and l.id = any(inv.location_ids)
    on conflict do nothing;
  update public.space_invites set used_by = uid, used_at = now() where id = inv.id;
  update public.profiles set current_space_id = inv.space_id where user_id = uid;
  return inv.space_id;
end
$$;

-- ---------- activity & sharing --------------------------------------

drop function if exists public.list_activity(uuid, bigint, integer);
create function public.list_activity(p_space uuid, p_before bigint default null, p_limit integer default 50)
returns table (id bigint, created_at timestamptz, action text, box_id uuid, item_id uuid, details jsonb, actor text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.created_at, a.action, a.box_id, a.item_id, a.details,
         coalesce(nullif(trim(p.display_name), ''), split_part(u.email::text, '@', 1))
  from public.activity a
  left join public.profiles p on p.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  where a.space_id = p_space
    and public.is_staff(p_space)
    and (p_before is null or a.id < p_before)
  order by a.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

-- The public, read-only view of a shared box (no values, serials or notes).
create or replace function public.get_shared_box(p_share uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'code', b.code,
    'name', b.name,
    'spot', b.spot,
    'fragile', b.fragile,
    'place', l.name,
    'brand_name', case when s.kind = 'business' then s.brand_name end,
    'items', coalesce((
      select json_agg(json_build_object('name', i.name, 'quantity', i.quantity, 'category', i.category)
                      order by i.category, i.name)
      from public.items i where i.box_id = b.id), '[]'::json)
  )
  from public.box_shares sh
  join public.boxes b on b.id = sh.box_id
  join public.spaces s on s.id = b.space_id
  left join public.locations l on l.id = b.location_id
  where sh.id = p_share
$$;

-- ---------- AI credits (edge function only) -------------------------

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
  delete from public.spaces where owner_id = uid;          -- cascades to everything inside them
  delete from public.member_locations where user_id = uid;
  delete from public.space_members where user_id = uid;
  delete from public.space_invites where created_by = uid;
  delete from public.ai_usage where user_id = uid;
  delete from public.feedback where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end
$$;

-- ---------- permissions ---------------------------------------------

revoke all on public.spaces, public.space_members, public.profiles, public.locations,
              public.boxes, public.box_photos, public.items, public.ai_usage,
              public.member_locations, public.space_invites, public.box_shares,
              public.retrieval_requests, public.activity, public.feedback from anon;

grant select, insert, update, delete on public.profiles, public.locations, public.boxes,
                                       public.box_photos, public.items to authenticated;
grant select, update, delete on public.spaces to authenticated;
grant select on public.space_members, public.ai_usage, public.member_locations, public.activity to authenticated;
grant select, delete on public.space_invites to authenticated;
grant select, insert, delete on public.box_shares to authenticated;
grant select, insert, update on public.retrieval_requests to authenticated;
grant select, insert on public.feedback to authenticated;

-- New Supabase projects (from mid-2026) no longer give the server role access
-- to new tables automatically. The AI function needs it for the usage counter.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.spaces, public.space_members, public.profiles,
  public.locations, public.boxes, public.box_photos, public.items, public.ai_usage,
  public.member_locations, public.space_invites, public.box_shares, public.retrieval_requests,
  public.activity, public.feedback to service_role;

revoke execute on function public.consume_ai_credit(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, integer) to service_role;
grant execute on function public.refund_ai_credit(uuid) to service_role;
revoke execute on function public.log_activity(uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.bootstrap_me(text, text)', 'public.create_space(text, text)', 'public.switch_space(uuid)',
    'public.list_boxes(uuid)', 'public.search_inventory(uuid, text)', 'public.list_members(uuid)',
    'public.set_member_role(uuid, uuid, text)', 'public.set_member_locations(uuid, uuid, uuid[])',
    'public.remove_member(uuid, uuid)', 'public.leave_space(uuid)', 'public.create_invite(uuid, text, uuid[])',
    'public.preview_invite(uuid)', 'public.accept_invite(uuid)', 'public.list_activity(uuid, bigint, integer)',
    'public.delete_my_account()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;
grant execute on function public.get_shared_box(uuid) to anon, authenticated;

-- ---------- photo storage -------------------------------------------
-- Private bucket. Files live at  <space_id>/<box_id>/<random>.jpg
-- (receipts too), and the space logo at <space_id>/brand/<random>.jpg.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('box-photos', 'box-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "box photos: members read" on storage.objects;
create policy "box photos: members read" on storage.objects for select to authenticated
  using (
    bucket_id = 'box-photos'
    and public.is_space_member(public.try_uuid((storage.foldername(name))[1]))
    and (
      (storage.foldername(name))[2] = 'brand'
      or public.is_staff(public.try_uuid((storage.foldername(name))[1]))
      or public.can_see_box(public.try_uuid((storage.foldername(name))[2]))
    )
  );

drop policy if exists "box photos: editors upload" on storage.objects;
create policy "box photos: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "box photos: editors update" on storage.objects;
create policy "box photos: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

drop policy if exists "box photos: editors delete" on storage.objects;
create policy "box photos: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'box-photos' and public.can_edit_space(public.try_uuid((storage.foldername(name))[1])));

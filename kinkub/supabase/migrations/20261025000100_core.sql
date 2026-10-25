-- KinKub core schema: profiles, trips, bookings, reviews, favorites,
-- notifications, packages, reports and audit logs.
-- Safe to rerun: every object is created idempotently.

-- ------------------------------------------------------------------
-- Types
-- ------------------------------------------------------------------
do $$ begin create type public.app_role as enum ('traveler', 'buddy', 'guide', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.provider_status as enum ('none', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin create type public.trip_type as enum ('buddy', 'guide');
exception when duplicate_object then null; end $$;
do $$ begin create type public.trip_status as enum ('draft', 'published', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.report_target as enum ('trip', 'review', 'profile');
exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://')),
  bio text not null default '' check (char_length(bio) <= 1000),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  service_area text not null default '' check (char_length(service_area) <= 120),
  role public.app_role not null default 'traveler',
  requested_role public.app_role check (requested_role is null or requested_role in ('buddy', 'guide')),
  provider_status public.provider_status not null default 'none',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  type public.trip_type not null,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  destination text not null check (char_length(destination) between 2 and 60),
  area text not null default '' check (char_length(area) <= 80),
  starts_at timestamptz not null,
  ends_at timestamptz,
  price_thb integer not null check (price_thb between 0 and 200000),
  capacity integer not null check (capacity between 1 and 30),
  seats_taken integer not null default 0 check (seats_taken >= 0),
  image_url text check (image_url is null or (char_length(image_url) <= 500 and image_url ~ '^(https://|/images/)')),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  status public.trip_status not null default 'draft',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_seats_within_capacity check (seats_taken <= capacity),
  constraint trips_ends_after_start check (ends_at is null or ends_at > starts_at),
  constraint trips_buddy_group_small check (type <> 'buddy' or capacity <= 4)
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  position smallint not null check (position between 1 and 30),
  time_label text not null default '' check (char_length(time_label) <= 20),
  title text not null check (char_length(title) between 1 and 120),
  details text not null default '' check (char_length(details) <= 1000),
  unique (trip_id, position)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  traveler_id uuid not null references public.profiles (id) on delete cascade,
  party_size smallint not null check (party_size between 1 and 10),
  unit_price_thb integer not null check (unit_price_thb >= 0),
  total_price_thb integer generated always as (unit_price_thb * party_size) stored,
  status public.booking_status not null default 'pending',
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, reviewer_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 500),
  link text check (link is null or link ~ '^/[^/]'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  tag text not null default '' check (char_length(tag) <= 30),
  title text not null check (char_length(title) between 2 and 120),
  english text not null default '' check (char_length(english) <= 60),
  meta text not null default '' check (char_length(meta) <= 200),
  price_thb integer not null check (price_thb between 0 and 500000),
  image text not null check (image ~ '^(https://|/images/)'),
  alt text not null default '' check (char_length(alt) <= 200),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  status public.report_status not null default 'open',
  resolution_note text not null default '' check (char_length(resolution_note) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  target_table text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
create index if not exists trips_search_idx on public.trips (status, destination, starts_at);
create index if not exists trips_organizer_idx on public.trips (organizer_id);
create index if not exists itinerary_trip_idx on public.itinerary_items (trip_id, position);
create index if not exists bookings_trip_idx on public.bookings (trip_id, status);
create index if not exists bookings_traveler_idx on public.bookings (traveler_id, created_at desc);
create unique index if not exists bookings_one_active_per_traveler
  on public.bookings (trip_id, traveler_id) where status in ('pending', 'confirmed');
create index if not exists booking_history_booking_idx on public.booking_status_history (booking_id, created_at);
create index if not exists reviews_trip_idx on public.reviews (trip_id, created_at desc);
create index if not exists favorites_trip_idx on public.favorites (trip_id);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create unique index if not exists reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists profiles_role_idx on public.profiles (role);

-- ------------------------------------------------------------------
-- Helper functions (security definer, fixed search_path)
-- ------------------------------------------------------------------

-- Role of the signed-in user; null when signed out or suspended, so every
-- policy that depends on it also locks out suspended accounts.
create or replace function public.my_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and not p.is_suspended
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.my_role() = 'admin', false) $$;

create or replace function public.is_trip_organizer(p_trip uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.trips t where t.id = p_trip and t.organizer_id = auth.uid())
$$;

-- Buddies and guides need an approved provider profile; admins may host too.
create or replace function public.can_organize(p_type public.trip_type)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and not p.is_suspended
      and (p.role = 'admin'
        or (p.provider_status = 'approved' and p.role::text = p_type::text))
  )
$$;

-- True when the signed-in user and p_user are on opposite sides of a booking.
create or replace function public.shares_booking(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b join public.trips t on t.id = b.trip_id
    where (b.traveler_id = p_user and t.organizer_id = auth.uid())
       or (b.traveler_id = auth.uid() and t.organizer_id = p_user)
  )
$$;

create or replace function public.can_review(p_trip uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.my_role() is not null and exists (
    select 1 from public.bookings b
    where b.trip_id = p_trip and b.traveler_id = auth.uid() and b.status = 'completed'
  )
$$;

-- Internal: in-app notification. Not callable by clients.
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, left(p_title, 120), left(coalesce(p_body, ''), 500), p_link)
$$;

-- Internal: audit log for privileged actions. Never pass credentials or tokens.
create or replace function public.log_admin_action(p_action text, p_table text, p_target text, p_details jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, target_table, target_id, details)
  values (auth.uid(), p_action, p_table, p_target, coalesce(p_details, '{}'::jsonb))
$$;

create or replace function public.require_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น' using errcode = '42501';
  end if;
end $$;

-- ------------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'trips', 'bookings', 'reviews', 'packages'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I
      for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- New auth user -> traveler profile. Role is never taken from user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  avatar text := meta ->> 'avatar_url';
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(meta ->> 'full_name', meta ->> 'name', split_part(coalesce(new.email, ''), '@', 1), ''), 80),
    case when avatar ~ '^https://' and char_length(avatar) <= 500 then avatar end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trip rules that column grants cannot express.
create or replace function public.guard_trip_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status in ('cancelled', 'completed') then
    raise exception 'ทริปที่ปิดแล้วแก้ไขไม่ได้' using errcode = 'P0001';
  end if;

  if new.starts_at is distinct from old.starts_at then
    if old.seats_taken > 0 then
      raise exception 'มีผู้จองแล้ว เปลี่ยนวันเริ่มทริปไม่ได้' using errcode = 'P0001';
    end if;
    if new.starts_at <= now() then
      raise exception 'วันเริ่มทริปต้องอยู่ในอนาคต' using errcode = '22023';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('published', 'cancelled'))
      or (old.status = 'published' and new.status in ('draft', 'cancelled', 'completed'))
    ) then
      raise exception 'เปลี่ยนสถานะทริปจาก % เป็น % ไม่ได้', old.status, new.status using errcode = 'P0001';
    end if;
    if new.status = 'draft' and old.seats_taken > 0 then
      raise exception 'มีผู้จองแล้ว ย้อนกลับเป็นฉบับร่างไม่ได้' using errcode = 'P0001';
    end if;
    if new.status = 'published' and new.starts_at <= now() then
      raise exception 'วันเริ่มทริปต้องอยู่ในอนาคต' using errcode = '22023';
    end if;
    if new.status = 'completed' and new.starts_at > now() then
      raise exception 'ปิดทริปได้หลังจากทริปเริ่มแล้ว' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_trip_update on public.trips;
create trigger guard_trip_update before update on public.trips
  for each row execute function public.guard_trip_update();

-- Closing a trip settles its open bookings.
create or replace function public.settle_trip_bookings()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  b record;
  next_status public.booking_status;
begin
  for b in
    select * from public.bookings
    where trip_id = new.id and status in ('pending', 'confirmed')
    for update
  loop
    next_status := case
      when new.status = 'completed' and b.status = 'confirmed' then 'completed'
      else 'cancelled'
    end;
    update public.bookings set status = next_status where id = b.id;
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, reason)
    values (b.id, b.status, next_status, auth.uid(),
      case when new.status = 'completed' then 'ทริปจบแล้ว' else 'ทริปถูกยกเลิก' end);
    perform public.notify(b.traveler_id,
      case when next_status = 'completed' then 'trip_completed' else 'trip_cancelled' end,
      case when next_status = 'completed' then 'ทริปจบแล้ว รีวิวได้เลย' else 'ทริปถูกยกเลิก' end,
      new.title, '/my-trips');
  end loop;
  return new;
end $$;

drop trigger if exists settle_trip_bookings on public.trips;
create trigger settle_trip_bookings after update of status on public.trips
  for each row when (new.status in ('cancelled', 'completed') and old.status is distinct from new.status)
  execute function public.settle_trip_bookings();

-- Reviews keep a name snapshot so traveler profiles stay private.
create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare organizer uuid; trip_title text;
begin
  select coalesce(nullif(display_name, ''), 'ผู้ร่วมทริป') into new.reviewer_name
  from public.profiles where id = new.reviewer_id;
  if tg_op = 'INSERT' then
    select organizer_id, title into organizer, trip_title from public.trips where id = new.trip_id;
    perform public.notify(organizer, 'review_received', 'มีรีวิวใหม่', trip_title, '/my-trips');
  end if;
  return new;
end $$;

drop trigger if exists prepare_review on public.reviews;
create trigger prepare_review before insert on public.reviews
  for each row execute function public.prepare_review();

-- Content edits by admins are audited.
create or replace function public.audit_package_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.log_admin_action('package_' || lower(tg_op), 'packages',
    coalesce(new.id, old.id),
    jsonb_build_object('title', coalesce(new.title, old.title), 'is_published', coalesce(new.is_published, old.is_published)));
  return coalesce(new, old);
end $$;

drop trigger if exists audit_package_change on public.packages;
create trigger audit_package_change after insert or update or delete on public.packages
  for each row when (auth.uid() is not null)
  execute function public.audit_package_change();

-- ------------------------------------------------------------------
-- RPCs
-- ------------------------------------------------------------------
create or replace function public.create_booking(p_trip_id uuid, p_party_size integer, p_note text default '')
returns public.bookings
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  trip public.trips;
  booking public.bookings;
begin
  if uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนจอง' using errcode = '28000';
  end if;
  if public.my_role() is null then
    raise exception 'บัญชีนี้ถูกระงับการใช้งาน' using errcode = '42501';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > 10 then
    raise exception 'จำนวนผู้เดินทางต้องอยู่ระหว่าง 1–10 คน' using errcode = '22023';
  end if;

  -- Row lock serialises concurrent bookings for the same trip.
  select * into trip from public.trips where id = p_trip_id for update;
  if not found or trip.status <> 'published' then
    raise exception 'ทริปนี้ไม่ได้เปิดรับจอง' using errcode = 'P0001';
  end if;
  if trip.starts_at <= now() then
    raise exception 'ทริปนี้เริ่มไปแล้ว' using errcode = 'P0001';
  end if;
  if trip.organizer_id = uid then
    raise exception 'จองทริปของตัวเองไม่ได้' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.bookings
             where trip_id = trip.id and traveler_id = uid and status in ('pending', 'confirmed')) then
    raise exception 'คุณมีการจองทริปนี้อยู่แล้ว' using errcode = 'P0001';
  end if;
  if trip.capacity - trip.seats_taken < p_party_size then
    raise exception 'ที่นั่งไม่พอ เหลือ % ที่', trip.capacity - trip.seats_taken using errcode = 'P0001';
  end if;

  insert into public.bookings (trip_id, traveler_id, party_size, unit_price_thb, note)
  values (trip.id, uid, p_party_size, trip.price_thb, left(coalesce(p_note, ''), 500))
  returning * into booking;

  update public.trips set seats_taken = seats_taken + p_party_size where id = trip.id;

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, reason)
  values (booking.id, null, 'pending', uid, 'ส่งคำขอจอง');
  perform public.notify(trip.organizer_id, 'booking_requested', 'มีคำขอจองใหม่',
    trip.title || ' · ' || p_party_size || ' คน', '/my-trips');
  return booking;
end $$;

create or replace function public.set_booking_status(p_booking_id uuid, p_status public.booking_status, p_reason text default '')
returns public.bookings
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  booking public.bookings;
  trip public.trips;
  as_traveler boolean;
  as_organizer boolean;
  as_admin boolean;
  previous public.booking_status;
begin
  if uid is null or public.my_role() is null then
    raise exception 'ไม่มีสิทธิ์ทำรายการนี้' using errcode = '42501';
  end if;

  select * into booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'ไม่พบการจองนี้' using errcode = 'P0002';
  end if;
  select * into trip from public.trips where id = booking.trip_id for update;

  as_traveler := booking.traveler_id = uid;
  as_organizer := trip.organizer_id = uid;
  as_admin := public.is_admin();

  if not (as_traveler or as_organizer or as_admin) then
    raise exception 'ไม่มีสิทธิ์ทำรายการนี้' using errcode = '42501';
  end if;

  if not (
    (booking.status = 'pending' and p_status in ('confirmed', 'rejected', 'cancelled'))
    or (booking.status = 'confirmed' and p_status in ('cancelled', 'completed'))
  ) then
    raise exception 'เปลี่ยนสถานะการจองจาก % เป็น % ไม่ได้', booking.status, p_status using errcode = 'P0001';
  end if;

  if not (as_admin or as_organizer or (as_traveler and p_status = 'cancelled')) then
    raise exception 'ไม่มีสิทธิ์ทำรายการนี้' using errcode = '42501';
  end if;
  if p_status = 'confirmed' and trip.starts_at <= now() then
    raise exception 'ทริปเริ่มไปแล้ว ยืนยันการจองไม่ได้' using errcode = 'P0001';
  end if;
  if p_status = 'completed' and trip.starts_at > now() then
    raise exception 'ปิดการจองได้หลังจากทริปเริ่มแล้ว' using errcode = 'P0001';
  end if;

  previous := booking.status;
  update public.bookings set status = p_status where id = booking.id returning * into booking;

  if p_status in ('rejected', 'cancelled') and trip.status in ('draft', 'published') then
    update public.trips set seats_taken = greatest(seats_taken - booking.party_size, 0) where id = trip.id;
  end if;

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, reason)
  values (booking.id, previous, p_status, uid, left(coalesce(p_reason, ''), 300));

  if as_traveler then
    perform public.notify(trip.organizer_id, 'booking_updated', 'ผู้จองยกเลิกการจอง', trip.title, '/my-trips');
  else
    perform public.notify(booking.traveler_id, 'booking_updated',
      case p_status
        when 'confirmed' then 'การจองได้รับการยืนยัน'
        when 'rejected' then 'คำขอจองไม่ได้รับการตอบรับ'
        when 'completed' then 'ทริปจบแล้ว รีวิวได้เลย'
        else 'การจองถูกยกเลิก'
      end, trip.title, '/my-trips');
  end if;

  if as_admin and not as_organizer and not as_traveler then
    perform public.log_admin_action('booking_status', 'bookings', booking.id::text,
      jsonb_build_object('from', previous, 'to', p_status, 'reason', left(coalesce(p_reason, ''), 300)));
  end if;
  return booking;
end $$;

-- Itinerary is replaced as a whole. Runs as the caller, so RLS decides.
create or replace function public.save_itinerary(p_trip_id uuid, p_items jsonb)
returns setof public.itinerary_items
language plpgsql security invoker set search_path = ''
as $$
begin
  if not (public.is_trip_organizer(p_trip_id) or public.is_admin()) then
    raise exception 'ไม่มีสิทธิ์แก้ไขแผนการเดินทางนี้' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 30 then
    raise exception 'แผนการเดินทางต้องมีไม่เกิน 30 รายการ' using errcode = '22023';
  end if;
  delete from public.itinerary_items where trip_id = p_trip_id;
  return query
  insert into public.itinerary_items (trip_id, position, time_label, title, details)
  select p_trip_id, ord::smallint, coalesce(item ->> 'time_label', ''), item ->> 'title', coalesce(item ->> 'details', '')
  from jsonb_array_elements(p_items) with ordinality as x(item, ord)
  returning *;
end $$;

create or replace function public.mark_notifications_read()
returns void
language sql security invoker set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null
$$;

create or replace function public.request_provider_role(p_role public.app_role)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  admin_id uuid;
begin
  if public.my_role() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน' using errcode = '42501';
  end if;
  if p_role not in ('buddy', 'guide') then
    raise exception 'ขอได้เฉพาะสิทธิ์ Buddy หรือไกด์' using errcode = '22023';
  end if;
  select * into me from public.profiles where id = auth.uid() for update;
  if me.role = p_role or me.role = 'admin' then
    raise exception 'บัญชีนี้มีสิทธิ์นี้อยู่แล้ว' using errcode = 'P0001';
  end if;
  update public.profiles set requested_role = p_role, provider_status = 'pending'
  where id = me.id returning * into me;
  for admin_id in select id from public.profiles where role = 'admin' and not is_suspended loop
    perform public.notify(admin_id, 'provider_request', 'มีคำขอเป็นผู้ให้บริการ',
      coalesce(nullif(me.display_name, ''), 'ผู้ใช้') || ' ขอเป็น ' || p_role::text, '/admin');
  end loop;
  return me;
end $$;

-- ------------------------------------------------------------------
-- Admin RPCs (all audited)
-- ------------------------------------------------------------------
create or replace function public.admin_list_users(p_search text default '', p_limit integer default 100)
returns table (
  id uuid, email text, display_name text, role public.app_role, requested_role public.app_role,
  provider_status public.provider_status, is_suspended boolean, service_area text, created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select p.id, u.email::text, p.display_name, p.role, p.requested_role, p.provider_status,
         p.is_suspended, p.service_area, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where coalesce(p_search, '') = ''
     or p.display_name ilike '%' || p_search || '%'
     or u.email ilike '%' || p_search || '%'
  order by (p.provider_status = 'pending') desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_reason text default '')
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare before public.profiles; after public.profiles;
begin
  perform public.require_admin();
  if p_user = auth.uid() then
    raise exception 'เปลี่ยนสิทธิ์ของบัญชีตัวเองไม่ได้' using errcode = '42501';
  end if;
  select * into before from public.profiles where id = p_user for update;
  if not found then raise exception 'ไม่พบผู้ใช้' using errcode = 'P0002'; end if;

  update public.profiles set
    role = p_role,
    requested_role = null,
    provider_status = case when p_role in ('buddy', 'guide') then 'approved'
                           when p_role = 'admin' then provider_status
                           else 'none' end
  where id = p_user returning * into after;

  perform public.log_admin_action('set_role', 'profiles', p_user::text,
    jsonb_build_object('from', before.role, 'to', p_role, 'reason', left(coalesce(p_reason, ''), 300)));
  perform public.notify(p_user, 'provider_decision', 'สิทธิ์บัญชีของคุณถูกปรับ',
    'สิทธิ์ปัจจุบัน: ' || p_role::text, '/account');
  return after;
end $$;

create or replace function public.admin_review_provider_request(p_user uuid, p_approve boolean, p_reason text default '')
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare me public.profiles;
begin
  perform public.require_admin();
  select * into me from public.profiles where id = p_user for update;
  if not found or me.provider_status <> 'pending' or me.requested_role is null then
    raise exception 'ไม่มีคำขอที่รอพิจารณา' using errcode = 'P0001';
  end if;
  if p_user = auth.uid() then
    raise exception 'พิจารณาคำขอของตัวเองไม่ได้' using errcode = '42501';
  end if;

  if p_approve then
    update public.profiles set role = me.requested_role, provider_status = 'approved', requested_role = null
    where id = p_user returning * into me;
  else
    update public.profiles set provider_status = 'rejected', requested_role = null
    where id = p_user returning * into me;
  end if;

  perform public.log_admin_action(case when p_approve then 'approve_provider' else 'reject_provider' end,
    'profiles', p_user::text, jsonb_build_object('role', me.role, 'reason', left(coalesce(p_reason, ''), 300)));
  perform public.notify(p_user, 'provider_decision',
    case when p_approve then 'คำขอผู้ให้บริการได้รับอนุมัติ' else 'คำขอผู้ให้บริการไม่ผ่านการอนุมัติ' end,
    left(coalesce(p_reason, ''), 300), '/account');
  return me;
end $$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text default '')
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
declare me public.profiles;
begin
  perform public.require_admin();
  if p_user = auth.uid() then
    raise exception 'ระงับบัญชีตัวเองไม่ได้' using errcode = '42501';
  end if;
  update public.profiles set is_suspended = p_suspended where id = p_user returning * into me;
  if not found then raise exception 'ไม่พบผู้ใช้' using errcode = 'P0002'; end if;
  perform public.log_admin_action(case when p_suspended then 'suspend_user' else 'unsuspend_user' end,
    'profiles', p_user::text, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
  return me;
end $$;

create or replace function public.admin_set_trip_status(p_trip uuid, p_status public.trip_status, p_reason text default '')
returns public.trips
language plpgsql security definer set search_path = ''
as $$
declare trip public.trips; previous public.trip_status;
begin
  perform public.require_admin();
  select status into previous from public.trips where id = p_trip for update;
  if not found then raise exception 'ไม่พบทริป' using errcode = 'P0002'; end if;
  update public.trips set status = p_status where id = p_trip returning * into trip;
  perform public.log_admin_action('trip_status', 'trips', p_trip::text,
    jsonb_build_object('from', previous, 'to', p_status, 'reason', left(coalesce(p_reason, ''), 300)));
  perform public.notify(trip.organizer_id, 'trip_updated', 'ผู้ดูแลปรับสถานะทริป',
    trip.title || ' → ' || p_status::text, '/my-trips');
  return trip;
end $$;

create or replace function public.admin_set_review_hidden(p_review uuid, p_hidden boolean, p_reason text default '')
returns public.reviews
language plpgsql security definer set search_path = ''
as $$
declare review public.reviews;
begin
  perform public.require_admin();
  update public.reviews set is_hidden = p_hidden where id = p_review returning * into review;
  if not found then raise exception 'ไม่พบรีวิว' using errcode = 'P0002'; end if;
  perform public.log_admin_action(case when p_hidden then 'hide_review' else 'show_review' end,
    'reviews', p_review::text, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
  return review;
end $$;

create or replace function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_note text default '')
returns public.reports
language plpgsql security definer set search_path = ''
as $$
declare report public.reports;
begin
  perform public.require_admin();
  if p_status = 'open' then
    raise exception 'เลือกสถานะ resolved หรือ dismissed' using errcode = '22023';
  end if;
  update public.reports set status = p_status, resolution_note = left(coalesce(p_note, ''), 1000),
    resolved_by = auth.uid(), resolved_at = now()
  where id = p_report returning * into report;
  if not found then raise exception 'ไม่พบรายงาน' using errcode = 'P0002'; end if;
  perform public.log_admin_action('resolve_report', 'reports', p_report::text,
    jsonb_build_object('status', p_status));
  perform public.notify(report.reporter_id, 'report_update', 'รายงานของคุณได้รับการพิจารณาแล้ว',
    left(coalesce(p_note, ''), 300), null);
  return report;
end $$;

-- ------------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.packages enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: providers are public; travelers are visible only to themselves,
-- admins and the other side of a shared booking.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to anon, authenticated
  using (role <> 'traveler' or id = auth.uid() or public.is_admin() or public.shares_booking(id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and public.my_role() is not null)
  with check (id = auth.uid());

-- trips
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select to anon, authenticated
  using (status <> 'draft' or organizer_id = auth.uid() or public.is_admin());
drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips for insert to authenticated
  with check (organizer_id = auth.uid() and public.can_organize(type)
              and starts_at > now() and status in ('draft', 'published'));
drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated
  using (organizer_id = auth.uid() and public.can_organize(type))
  with check (organizer_id = auth.uid());
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated
  using (organizer_id = auth.uid() and status = 'draft' and seats_taken = 0);

-- itinerary follows trip visibility; only the organizer (or admin) edits.
drop policy if exists itinerary_select on public.itinerary_items;
create policy itinerary_select on public.itinerary_items for select to anon, authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id));
drop policy if exists itinerary_write on public.itinerary_items;
create policy itinerary_write on public.itinerary_items for all to authenticated
  using ((public.is_trip_organizer(trip_id) and public.my_role() is not null) or public.is_admin())
  with check ((public.is_trip_organizer(trip_id) and public.my_role() is not null) or public.is_admin());

-- bookings: read-only to the parties; writes go through RPCs.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (traveler_id = auth.uid() or public.is_trip_organizer(trip_id) or public.is_admin());

drop policy if exists booking_history_select on public.booking_status_history;
create policy booking_history_select on public.booking_status_history for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));

-- reviews: one per attendee per trip, only after a completed booking.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to anon, authenticated
  using (not is_hidden or reviewer_id = auth.uid() or public.is_admin());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and public.can_review(trip_id));
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (reviewer_id = auth.uid() and public.can_review(trip_id))
  with check (reviewer_id = auth.uid());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated
  using (reviewer_id = auth.uid());

-- favorites: private to the owner.
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.my_role() is not null);

-- notifications: owner reads and marks read; rows are created server-side.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- packages: public content, admin-managed (audited by trigger).
drop policy if exists packages_select on public.packages;
create policy packages_select on public.packages for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists packages_admin on public.packages;
create policy packages_admin on public.packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.my_role() is not null);

-- audit logs: admins read; nobody writes directly.
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------
-- Grants: start from nothing, then allow only what the app needs.
-- Column lists keep role, status, seats and ownership fields server-owned.
-- ------------------------------------------------------------------
revoke all on public.profiles, public.trips, public.itinerary_items, public.bookings,
  public.booking_status_history, public.reviews, public.favorites, public.notifications,
  public.packages, public.reports, public.audit_logs from anon, authenticated;

grant select (id, display_name, avatar_url, bio, interests, languages, service_area, role,
  requested_role, provider_status, created_at, updated_at) on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio, interests, languages, service_area) on public.profiles to authenticated;

grant select on public.trips to anon, authenticated;
grant insert (organizer_id, type, title, description, destination, area, starts_at, ends_at,
  price_thb, capacity, image_url, lat, lon, status) on public.trips to authenticated;
grant update (title, description, destination, area, starts_at, ends_at, price_thb, capacity,
  image_url, lat, lon, status) on public.trips to authenticated;
grant delete on public.trips to authenticated;

grant select on public.itinerary_items to anon, authenticated;
grant insert, update, delete on public.itinerary_items to authenticated;

grant select on public.bookings, public.booking_status_history to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert (trip_id, reviewer_id, rating, body) on public.reviews to authenticated;
grant update (rating, body) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

grant select, delete on public.favorites to authenticated;
grant insert (user_id, trip_id) on public.favorites to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;

grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason) on public.reports to authenticated;

grant select on public.audit_logs to authenticated;

-- Functions: Postgres grants EXECUTE to PUBLIC by default; close that first.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.my_role(), public.is_admin(), public.is_trip_organizer(uuid),
  public.can_organize(public.trip_type), public.shares_booking(uuid), public.can_review(uuid)
  to anon, authenticated;
grant execute on function
  public.create_booking(uuid, integer, text),
  public.set_booking_status(uuid, public.booking_status, text),
  public.save_itinerary(uuid, jsonb),
  public.mark_notifications_read(),
  public.request_provider_role(public.app_role),
  public.admin_list_users(text, integer),
  public.admin_set_role(uuid, public.app_role, text),
  public.admin_review_provider_request(uuid, boolean, text),
  public.admin_set_suspended(uuid, boolean, text),
  public.admin_set_trip_status(uuid, public.trip_status, text),
  public.admin_set_review_hidden(uuid, boolean, text),
  public.admin_resolve_report(uuid, public.report_status, text)
  to authenticated;
-- notify, log_admin_action, require_admin and trigger functions stay internal.

-- ------------------------------------------------------------------
-- Content: the existing homepage packages (real site content, not sample).
-- ------------------------------------------------------------------
insert into public.packages (id, tag, title, english, meta, price_thb, image, alt, sort_order) values
  ('chiang-mai-plan', 'ยอดนิยม', 'เชียงใหม่ · ล้านนา 3 วัน 2 คืน', 'LAN NA RETREAT',
   'ที่พักบูทีค · อาหารเช้า · ไกด์ท้องถิ่น', 5900, '/images/chiangmai-temple.webp', 'วัดเชียงใหม่สีทอง', 1),
  ('phuket-plan', 'ใหม่', 'ภูเก็ต · อันดามัน 4 วัน 3 คืน', 'ANDAMAN SLOWDOWN',
   'โรงแรมริมทะเล · อาหารเช้า · ทริปเกาะ', 8900, '/images/phuket-beach.webp', 'หาดทรายและทะเลสีเทอร์ควอยซ์', 2),
  ('bangkok-plan', 'เมือง', 'กรุงเทพฯ · พระนคร 2 วัน 1 คืน', 'OLD TOWN EDITION',
   'โรงแรมกลางเมือง · อาหารเช้า · รถรับส่ง', 3900, '/images/bangkok-golden.webp', 'พระบรมมหาราชวังยามค่ำ', 3)
on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- Read model: visible review stats per trip (runs with caller's RLS).
-- ------------------------------------------------------------------
create or replace view public.trip_ratings with (security_invoker = true) as
  select trip_id, round(avg(rating)::numeric, 1) as rating, count(*)::integer as review_count
  from public.reviews where not is_hidden
  group by trip_id;
revoke all on public.trip_ratings from anon, authenticated;
grant select on public.trip_ratings to anon, authenticated;

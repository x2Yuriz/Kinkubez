-- Trips by province + Google Maps meeting point.
-- Organizers pick one of the 77 Thai provinces and paste a Google Maps link.
-- Coordinates are parsed from the link on the server; clients can no longer write lat/lon.
-- Safe to rerun.

create table if not exists public.provinces (
  name_th text primary key,
  name_en text not null,
  region text not null check (region in ('north', 'northeast', 'central', 'east', 'west', 'south'))
);

insert into public.provinces (name_th, name_en, region) values
  ('กรุงเทพมหานคร', 'Bangkok', 'central'), ('กำแพงเพชร', 'Kamphaeng Phet', 'central'),
  ('ชัยนาท', 'Chai Nat', 'central'), ('นครนายก', 'Nakhon Nayok', 'central'),
  ('นครปฐม', 'Nakhon Pathom', 'central'), ('นครสวรรค์', 'Nakhon Sawan', 'central'),
  ('นนทบุรี', 'Nonthaburi', 'central'), ('ปทุมธานี', 'Pathum Thani', 'central'),
  ('พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya', 'central'), ('พิจิตร', 'Phichit', 'central'),
  ('พิษณุโลก', 'Phitsanulok', 'central'), ('เพชรบูรณ์', 'Phetchabun', 'central'),
  ('ลพบุรี', 'Lop Buri', 'central'), ('สมุทรปราการ', 'Samut Prakan', 'central'),
  ('สมุทรสงคราม', 'Samut Songkhram', 'central'), ('สมุทรสาคร', 'Samut Sakhon', 'central'),
  ('สระบุรี', 'Saraburi', 'central'), ('สิงห์บุรี', 'Sing Buri', 'central'),
  ('สุโขทัย', 'Sukhothai', 'central'), ('สุพรรณบุรี', 'Suphan Buri', 'central'),
  ('อ่างทอง', 'Ang Thong', 'central'), ('อุทัยธานี', 'Uthai Thani', 'central'),
  ('เชียงราย', 'Chiang Rai', 'north'), ('เชียงใหม่', 'Chiang Mai', 'north'),
  ('น่าน', 'Nan', 'north'), ('พะเยา', 'Phayao', 'north'), ('แพร่', 'Phrae', 'north'),
  ('แม่ฮ่องสอน', 'Mae Hong Son', 'north'), ('ลำปาง', 'Lampang', 'north'),
  ('ลำพูน', 'Lamphun', 'north'), ('อุตรดิตถ์', 'Uttaradit', 'north'),
  ('กาฬสินธุ์', 'Kalasin', 'northeast'), ('ขอนแก่น', 'Khon Kaen', 'northeast'),
  ('ชัยภูมิ', 'Chaiyaphum', 'northeast'), ('นครพนม', 'Nakhon Phanom', 'northeast'),
  ('นครราชสีมา', 'Nakhon Ratchasima', 'northeast'), ('บึงกาฬ', 'Bueng Kan', 'northeast'),
  ('บุรีรัมย์', 'Buri Ram', 'northeast'), ('มหาสารคาม', 'Maha Sarakham', 'northeast'),
  ('มุกดาหาร', 'Mukdahan', 'northeast'), ('ยโสธร', 'Yasothon', 'northeast'),
  ('ร้อยเอ็ด', 'Roi Et', 'northeast'), ('เลย', 'Loei', 'northeast'),
  ('ศรีสะเกษ', 'Si Sa Ket', 'northeast'), ('สกลนคร', 'Sakon Nakhon', 'northeast'),
  ('สุรินทร์', 'Surin', 'northeast'), ('หนองคาย', 'Nong Khai', 'northeast'),
  ('หนองบัวลำภู', 'Nong Bua Lam Phu', 'northeast'), ('อำนาจเจริญ', 'Amnat Charoen', 'northeast'),
  ('อุดรธานี', 'Udon Thani', 'northeast'), ('อุบลราชธานี', 'Ubon Ratchathani', 'northeast'),
  ('จันทบุรี', 'Chanthaburi', 'east'), ('ฉะเชิงเทรา', 'Chachoengsao', 'east'),
  ('ชลบุรี', 'Chon Buri', 'east'), ('ตราด', 'Trat', 'east'),
  ('ปราจีนบุรี', 'Prachin Buri', 'east'), ('ระยอง', 'Rayong', 'east'), ('สระแก้ว', 'Sa Kaeo', 'east'),
  ('กาญจนบุรี', 'Kanchanaburi', 'west'), ('ตาก', 'Tak', 'west'),
  ('ประจวบคีรีขันธ์', 'Prachuap Khiri Khan', 'west'), ('เพชรบุรี', 'Phetchaburi', 'west'),
  ('ราชบุรี', 'Ratchaburi', 'west'),
  ('กระบี่', 'Krabi', 'south'), ('ชุมพร', 'Chumphon', 'south'), ('ตรัง', 'Trang', 'south'),
  ('นครศรีธรรมราช', 'Nakhon Si Thammarat', 'south'), ('นราธิวาส', 'Narathiwat', 'south'),
  ('ปัตตานี', 'Pattani', 'south'), ('พังงา', 'Phang Nga', 'south'), ('พัทลุง', 'Phatthalung', 'south'),
  ('ภูเก็ต', 'Phuket', 'south'), ('ยะลา', 'Yala', 'south'), ('ระนอง', 'Ranong', 'south'),
  ('สงขลา', 'Songkhla', 'south'), ('สตูล', 'Satun', 'south'), ('สุราษฎร์ธานี', 'Surat Thani', 'south')
on conflict (name_th) do nothing;

alter table public.provinces enable row level security;
drop policy if exists provinces_read on public.provinces;
create policy provinces_read on public.provinces for select using (true);
revoke all on public.provinces from anon, authenticated;
grant select on public.provinces to anon, authenticated;

-- New trip columns. province stays nullable so legacy rows that match no province survive;
-- the trigger below requires it on every new trip.
alter table public.trips add column if not exists province text references public.provinces (name_th);
alter table public.trips add column if not exists meeting_point_url text;

alter table public.trips drop constraint if exists trips_meeting_point_url_google;
alter table public.trips add constraint trips_meeting_point_url_google check (
  meeting_point_url is null or (
    char_length(meeting_point_url) <= 500
    and meeting_point_url !~ '\s'
    and meeting_point_url ~* '^https://((www\.)?google\.(com|co\.th)/maps([/?#]|$)|maps\.google\.(com|co\.th)([/?#]|$)|maps\.app\.goo\.gl/[A-Za-z0-9_-]+|goo\.gl/maps/[A-Za-z0-9_-]+)'
  )
);
alter table public.trips drop constraint if exists trips_coords_pair;
alter table public.trips add constraint trips_coords_pair check ((lat is null) = (lon is null));

-- Maps a free-text destination (including the old กรุงเทพฯ label) to a province name.
create or replace function public.province_from_text(value text)
returns text language sql stable set search_path = ''
as $$
  select p.name_th from public.provinces p
  where p.name_th = case when btrim(value) in ('กรุงเทพฯ', 'กรุงเทพ', 'กทม.', 'กทม') then 'กรุงเทพมหานคร' else btrim(value) end
     or lower(p.name_en) = lower(btrim(value))
  limit 1
$$;

update public.trips set province = public.province_from_text(destination) where province is null;

-- Pulls "lat,lon" out of a full Google Maps link. Short links (maps.app.goo.gl) carry no
-- coordinates and return null; so does anything outside Thailand. Never guesses.
create or replace function public.maps_url_coords(url text, out lat double precision, out lon double precision)
language plpgsql immutable set search_path = ''
as $$
declare
  num constant text := '(-?\d{1,3}(?:\.\d+)?)';
  m text[];
begin
  if url is null then return; end if;
  m := regexp_match(url, '!3d' || num || '!4d' || num);
  if m is null then
    m := regexp_match(url, '[?&](?:q|query|ll|destination|center|daddr|sll)=' || num || '(?:,|%2C)(?:\+|%20)?' || num, 'i');
  end if;
  if m is null then
    m := regexp_match(url, '/(?:place|search|dir)/' || num || '(?:,|%2C)(?:\+|%20)?' || num, 'i');
  end if;
  if m is null then
    m := regexp_match(url, '@' || num || ',' || num);
  end if;
  if m is null then return; end if;
  lat := m[1]::double precision;
  lon := m[2]::double precision;
  if not (lat between 5.5 and 20.5 and lon between 97.3 and 105.7) then
    lat := null;
    lon := null;
  end if;
end $$;

-- security definer so the helpers can stay non-executable for clients.
create or replace function public.prepare_trip_location()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  coords record;
begin
  if new.province is null then
    new.province := public.province_from_text(new.destination);
  end if;
  if new.province is null and (tg_op = 'INSERT' or old.province is not null) then
    raise exception 'กรุณาเลือกจังหวัด' using errcode = '22023';
  end if;
  if new.province is not null then
    if not exists (select 1 from public.provinces p where p.name_th = new.province) then
      raise exception 'ไม่พบจังหวัด "%"', new.province using errcode = '22023';
    end if;
    new.destination := new.province;
  end if;

  if (tg_op = 'INSERT' and new.meeting_point_url is not null)
     or (tg_op = 'UPDATE' and new.meeting_point_url is distinct from old.meeting_point_url) then
    coords := public.maps_url_coords(new.meeting_point_url);
    new.lat := coords.lat;
    new.lon := coords.lon;
  end if;
  return new;
end $$;

drop trigger if exists prepare_trip_location on public.trips;
create trigger prepare_trip_location before insert or update on public.trips
  for each row execute function public.prepare_trip_location();

create index if not exists trips_province_idx on public.trips (status, province, starts_at);

-- Coordinates are server-owned now: they only come from the Maps link.
revoke insert (lat, lon), update (lat, lon) on public.trips from authenticated;
grant insert (province, meeting_point_url), update (province, meeting_point_url) on public.trips to authenticated;

revoke execute on function public.province_from_text(text), public.maps_url_coords(text),
  public.prepare_trip_location() from public, anon, authenticated;

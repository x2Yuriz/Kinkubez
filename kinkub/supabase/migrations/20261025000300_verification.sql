-- KinKub phase 2: identity verification for travelers and providers.
-- Documents live in the private "verification-docs" bucket under
-- "<auth.uid()>/<file>", are visible only to the owner and to admins while
-- the request is pending, and are removed after the decision.
-- Safe to rerun.

-- ------------------------------------------------------------------
-- Types
-- ------------------------------------------------------------------
do $$ begin create type public.verification_status as enum ('unverified', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
-- identity = customer identity check; buddy/guide = provider application (includes identity).
do $$ begin create type public.verification_kind as enum ('identity', 'buddy', 'guide');
exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_doc_type as enum ('national_id', 'passport', 'driver_license', 'tour_guide_license');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists identity_status public.verification_status not null default 'unverified';
alter table public.profiles add column if not exists identity_verified_at timestamptz;

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.verification_kind not null,
  status public.verification_request_status not null default 'pending',
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  document_type public.verification_doc_type not null,
  -- Cleared once the request is decided or withdrawn; files are then deleted.
  document_paths text[] not null default '{}' check (cardinality(document_paths) <= 3),
  note text not null default '' check (char_length(note) <= 500),
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 300),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists verification_one_pending_per_kind
  on public.verification_requests (user_id, kind) where status = 'pending';
create index if not exists verification_status_idx on public.verification_requests (status, created_at);

drop trigger if exists touch_updated_at on public.verification_requests;
create trigger touch_updated_at before update on public.verification_requests
  for each row execute function public.touch_updated_at();

alter table public.verification_requests enable row level security;

drop policy if exists verification_select on public.verification_requests;
create policy verification_select on public.verification_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: all writes go through the RPCs below.

-- Legacy: provider requests made before documents were required cannot be
-- reviewed any more; reset them so the user can apply with documents.
update public.profiles p set provider_status = 'none', requested_role = null
where p.provider_status = 'pending'
  and not exists (select 1 from public.verification_requests r
                  where r.user_id = p.id and r.status = 'pending' and r.kind in ('buddy', 'guide'));

-- ------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------
-- True while a storage path is attached to a pending request (used by Storage policies).
create or replace function public.verification_doc_pending(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.verification_requests r
                 where r.status = 'pending' and p_name = any (r.document_paths))
$$;

-- Recompute profile identity/provider state after a request leaves "pending".
create or replace function public.settle_verification_state(p_user uuid, p_rejected_kind public.verification_kind)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles p set
    identity_status = case
      when p.identity_status = 'approved' then 'approved'::public.verification_status
      when exists (select 1 from public.verification_requests r where r.user_id = p_user and r.status = 'pending') then 'pending'::public.verification_status
      when p_rejected_kind is not null then 'rejected'::public.verification_status
      else 'unverified'::public.verification_status end,
    provider_status = case
      when p.provider_status = 'pending'
       and not exists (select 1 from public.verification_requests r
                       where r.user_id = p_user and r.status = 'pending' and r.kind in ('buddy', 'guide'))
      then case when p_rejected_kind in ('buddy', 'guide') then 'rejected'::public.provider_status
                when p.role in ('buddy', 'guide') then 'approved'::public.provider_status
                else 'none'::public.provider_status end
      else p.provider_status end,
    requested_role = case
      when exists (select 1 from public.verification_requests r
                   where r.user_id = p_user and r.status = 'pending' and r.kind in ('buddy', 'guide'))
      then p.requested_role else null end
  where p.id = p_user;
end $$;

-- ------------------------------------------------------------------
-- User RPCs
-- ------------------------------------------------------------------
create or replace function public.submit_verification(
  p_kind public.verification_kind,
  p_legal_name text,
  p_document_type public.verification_doc_type,
  p_document_paths text[],
  p_note text default ''
)
returns public.verification_requests
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  req public.verification_requests;
  path text;
  admin_id uuid;
  paths text[] := coalesce(p_document_paths, '{}');
begin
  if public.my_role() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid() for update;

  if me.role = 'admin' then
    raise exception 'บัญชีผู้ดูแลระบบไม่ต้องยื่นคำขอนี้' using errcode = 'P0001';
  end if;
  if p_kind = 'identity' and me.identity_status = 'approved' then
    raise exception 'บัญชีนี้ยืนยันตัวตนแล้ว' using errcode = 'P0001';
  end if;
  if p_kind in ('buddy', 'guide') and me.role::text = p_kind::text then
    raise exception 'บัญชีนี้มีสิทธิ์นี้อยู่แล้ว' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.verification_requests r where r.user_id = me.id and r.status = 'pending'
             and (r.kind = p_kind or (p_kind in ('buddy', 'guide') and r.kind in ('buddy', 'guide')))) then
    raise exception 'มีคำขอที่รอพิจารณาอยู่แล้ว' using errcode = 'P0001';
  end if;
  if p_document_type = 'tour_guide_license' and p_kind <> 'guide' then
    raise exception 'ใบอนุญาตมัคคุเทศก์ใช้ได้กับคำขอเป็นไกด์เท่านั้น' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_legal_name, ''))) not between 2 and 120 then
    raise exception 'กรุณากรอกชื่อ-นามสกุลตามเอกสาร' using errcode = '22023';
  end if;
  if cardinality(paths) not between 1 and 3 then
    raise exception 'แนบเอกสาร 1–3 ไฟล์' using errcode = '22023';
  end if;
  foreach path in array paths loop
    if path !~ ('^' || me.id::text || '/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp|pdf)$') then
      raise exception 'ไฟล์เอกสารไม่ถูกต้อง' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct o.name) from storage.objects o
      where o.bucket_id = 'verification-docs' and o.name = any (paths)) <> cardinality(paths) then
    raise exception 'ไม่พบไฟล์เอกสารที่อัปโหลด ลองอัปโหลดใหม่' using errcode = '22023';
  end if;
  if exists (select 1 from public.verification_requests r where r.status = 'pending' and r.document_paths && paths) then
    raise exception 'ไฟล์นี้ถูกใช้กับคำขออื่นแล้ว' using errcode = '22023';
  end if;

  insert into public.verification_requests (user_id, kind, legal_name, document_type, document_paths, note)
  values (me.id, p_kind, trim(p_legal_name), p_document_type, paths, left(trim(coalesce(p_note, '')), 500))
  returning * into req;

  update public.profiles set
    identity_status = case when identity_status = 'approved' then identity_status else 'pending' end,
    requested_role = case when p_kind in ('buddy', 'guide') then p_kind::text::public.app_role else requested_role end,
    provider_status = case when p_kind in ('buddy', 'guide') then 'pending' else provider_status end
  where id = me.id;

  -- Audit records the kind only, never names or document data.
  perform public.log_admin_action('submit_verification', 'verification_requests', req.id::text,
    jsonb_build_object('kind', p_kind));
  for admin_id in select id from public.profiles where role = 'admin' and not is_suspended loop
    perform public.notify(admin_id, 'verification_request', 'มีคำขอยืนยันตัวตนใหม่',
      coalesce(nullif(me.display_name, ''), 'ผู้ใช้') || ' · ' || case p_kind
        when 'identity' then 'ยืนยันตัวตน' when 'buddy' then 'สมัครเป็น Buddy' else 'สมัครเป็นไกด์' end,
      '/admin');
  end loop;
  return req;
end $$;

-- Returns the document paths so the client can delete the files.
create or replace function public.withdraw_verification(p_id uuid)
returns text[]
language plpgsql security definer set search_path = ''
as $$
declare req public.verification_requests; paths text[];
begin
  if public.my_role() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน' using errcode = '42501';
  end if;
  select * into req from public.verification_requests where id = p_id and user_id = auth.uid() for update;
  if not found or req.status <> 'pending' then
    raise exception 'ไม่มีคำขอที่รอพิจารณา' using errcode = 'P0001';
  end if;
  paths := req.document_paths;
  update public.verification_requests set status = 'withdrawn', document_paths = '{}' where id = p_id;
  perform public.settle_verification_state(req.user_id, null);
  perform public.log_admin_action('withdraw_verification', 'verification_requests', p_id::text,
    jsonb_build_object('kind', req.kind));
  return paths;
end $$;

-- ------------------------------------------------------------------
-- Admin RPCs (audited)
-- ------------------------------------------------------------------
create or replace function public.admin_list_verifications(p_status public.verification_request_status default 'pending')
returns table (
  id uuid, user_id uuid, email text, display_name text, role public.app_role, kind public.verification_kind,
  status public.verification_request_status, legal_name text, document_type public.verification_doc_type,
  document_paths text[], note text, reviewer_note text, reviewed_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select r.id, r.user_id, u.email::text, p.display_name, p.role, r.kind, r.status, r.legal_name, r.document_type,
         r.document_paths, r.note, r.reviewer_note, r.reviewed_at, r.created_at
  from public.verification_requests r
  join public.profiles p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  where p_status is null or r.status = p_status
  order by r.created_at
  limit 200;
end $$;

-- Returns the document paths so the reviewing admin's client can delete the files.
create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_reason text default '')
returns text[]
language plpgsql security definer set search_path = ''
as $$
declare req public.verification_requests; paths text[]; reason text := left(trim(coalesce(p_reason, '')), 300);
begin
  perform public.require_admin();
  select * into req from public.verification_requests where id = p_id for update;
  if not found or req.status <> 'pending' then
    raise exception 'ไม่มีคำขอที่รอพิจารณา' using errcode = 'P0001';
  end if;
  if req.user_id = auth.uid() then
    raise exception 'พิจารณาคำขอของตัวเองไม่ได้' using errcode = '42501';
  end if;
  if not p_approve and reason = '' then
    raise exception 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' using errcode = '22023';
  end if;

  paths := req.document_paths;
  update public.verification_requests set
    status = case when p_approve then 'approved'::public.verification_request_status else 'rejected' end,
    document_paths = '{}', reviewer_id = auth.uid(), reviewer_note = reason, reviewed_at = now()
  where id = p_id;

  if p_approve then
    update public.profiles set
      identity_status = 'approved',
      identity_verified_at = coalesce(identity_verified_at, now()),
      role = case when req.kind in ('buddy', 'guide') and role <> 'admin' then req.kind::text::public.app_role else role end,
      provider_status = case when req.kind in ('buddy', 'guide') then 'approved' else provider_status end,
      requested_role = case when req.kind in ('buddy', 'guide') then null else requested_role end
    where id = req.user_id;
  else
    perform public.settle_verification_state(req.user_id, req.kind);
  end if;

  perform public.log_admin_action(case when p_approve then 'approve_verification' else 'reject_verification' end,
    'verification_requests', p_id::text,
    jsonb_build_object('user', req.user_id, 'kind', req.kind, 'reason', reason));
  perform public.notify(req.user_id, 'verification_decision',
    case when p_approve then case req.kind when 'identity' then 'ยืนยันตัวตนสำเร็จ'
                                           when 'buddy' then 'ได้รับอนุมัติเป็น Buddy' else 'ได้รับอนุมัติเป็นไกด์' end
         else 'คำขอยืนยันตัวตนไม่ผ่าน' end,
    reason, '/account');
  return paths;
end $$;

-- The old document-free provider flow is closed; providers apply via submit_verification.
create or replace function public.request_provider_role(p_role public.app_role)
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'สมัครเป็น Buddy หรือไกด์พร้อมเอกสารยืนยันตัวตนที่หน้าบัญชีของฉัน' using errcode = 'P0001';
end $$;

create or replace function public.admin_review_provider_request(p_user uuid, p_approve boolean, p_reason text default '')
returns public.profiles
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'พิจารณาคำขอผ่านแท็บยืนยันตัวตน' using errcode = 'P0001';
end $$;

-- ------------------------------------------------------------------
-- Storage: private bucket, owner folder, PDFs and images only
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('verification-docs', 'verification-docs', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kinkub verification insert" on storage.objects;
create policy "kinkub verification insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    and public.my_role() is not null
  );

-- Admins can read (signed URLs) only files attached to a pending request.
drop policy if exists "kinkub verification read" on storage.objects;
create policy "kinkub verification read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or (public.is_admin() and public.verification_doc_pending(name)))
  );

-- No update policy: documents cannot be swapped after upload.
-- Files under review cannot be deleted; afterwards the owner or an admin removes them.
drop policy if exists "kinkub verification delete" on storage.objects;
create policy "kinkub verification delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    and not public.verification_doc_pending(name)
  );

-- ------------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------------
revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;

-- identity_status is readable (public badge) but never client-writable.
grant select (identity_status, identity_verified_at) on public.profiles to anon, authenticated;

revoke execute on function public.request_provider_role(public.app_role),
  public.admin_review_provider_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.settle_verification_state(uuid, public.verification_kind) from public, anon, authenticated;
revoke execute on function public.verification_doc_pending(text) from public, anon;
grant execute on function public.verification_doc_pending(text) to authenticated;
revoke execute on function
  public.submit_verification(public.verification_kind, text, public.verification_doc_type, text[], text),
  public.withdraw_verification(uuid),
  public.admin_list_verifications(public.verification_request_status),
  public.admin_review_verification(uuid, boolean, text)
  from public, anon;
grant execute on function
  public.submit_verification(public.verification_kind, text, public.verification_doc_type, text[], text),
  public.withdraw_verification(uuid),
  public.admin_list_verifications(public.verification_request_status),
  public.admin_review_verification(uuid, boolean, text)
  to authenticated;

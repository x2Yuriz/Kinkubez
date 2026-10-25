-- SAMPLE DATA ONLY. Loaded by `supabase db reset` on a LOCAL stack.
-- Do not run against production. Every row is marked is_sample / [ตัวอย่าง].
-- Sample accounts have no password and cannot sign in.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sample-pim@example.invalid', '{"full_name":"พิม [ตัวอย่าง]"}', now(), now()),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sample-kong@example.invalid', '{"full_name":"ก้อง · ไกด์ท้องถิ่น [ตัวอย่าง]"}', now(), now()),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sample-mind@example.invalid', '{"full_name":"มายด์ [ตัวอย่าง]"}', now(), now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sample-om@example.invalid', '{"full_name":"อ้อม · ไกด์ธรรมชาติ [ตัวอย่าง]"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'buddy', provider_status = 'approved', service_area = 'เชียงใหม่',
  languages = '{ไทย,English}', interests = '{คาเฟ่,เดินเมือง}'
where id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003');
update public.profiles set role = 'guide', provider_status = 'approved', service_area = 'เชียงใหม่',
  languages = '{ไทย,English}', interests = '{ธรรมชาติ,วัด}'
where id in ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000004');

insert into public.trips (id, organizer_id, type, title, description, destination, area, starts_at,
  price_thb, capacity, image_url, lat, lon, status, is_sample)
values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'buddy',
   '[ตัวอย่าง] เดินเล่นเมืองเก่า แวะคาเฟ่ชิล ๆ', 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ', 'เชียงใหม่', 'เมืองเก่า',
   date_trunc('day', now()) + interval '2 days 10 hours', 850, 3, '/images/chiangmai-temple.webp', 18.7883, 98.9853, 'published', true),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', 'guide',
   '[ตัวอย่าง] ดอยสุเทพ · วัดป่า · วิวเมือง', 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ', 'เชียงใหม่', 'ดอยสุเทพ',
   date_trunc('day', now()) + interval '3 days 8 hours 30 minutes', 1500, 8,
   'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=85', 18.8048, 98.9215, 'published', true),
  ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', 'buddy',
   '[ตัวอย่าง] ตะลุยของอร่อยย่านวัวลาย', 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ', 'เชียงใหม่', 'วัวลาย',
   date_trunc('day', now()) + interval '4 days 17 hours 30 minutes', 600, 3,
   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=85', 18.7851, 99.0014, 'published', true),
  ('10000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', 'guide',
   '[ตัวอย่าง] แม่ริมวันเดียว · น้ำตกและสวนดอกไม้', 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ', 'เชียงใหม่', 'แม่ริม',
   date_trunc('day', now()) + interval '5 days 7 hours', 1950, 10,
   'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=85', 18.9165, 98.9417, 'published', true)
on conflict (id) do nothing;

insert into public.itinerary_items (trip_id, position, time_label, title, details) values
  ('10000000-0000-4000-a000-000000000002', 1, '08:30', 'นัดเจอหน้าประตูท่าแพ', '[ตัวอย่าง]'),
  ('10000000-0000-4000-a000-000000000002', 2, '09:30', 'วัดพระธาตุดอยสุเทพ', '[ตัวอย่าง]'),
  ('10000000-0000-4000-a000-000000000002', 3, '12:00', 'มื้อกลางวันวิวเมือง', '[ตัวอย่าง]')
on conflict (trip_id, position) do nothing;

-- =============================================
-- منصة مهارات - إعداد قاعدة البيانات الكاملة
-- شغّل هذا الملف في: Supabase Dashboard → SQL Editor → New Query
-- =============================================

-- 1. جدول المستخدمين
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique,
  phone text,
  user_type text default 'employee' check (user_type in ('employee', 'seeker')),
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 2. جدول الدورات
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  terms text default 'شهادة معتمدة | مدة الدورة 5 ايام | بمعدل 40 ساعة تدريبية',
  axes jsonb default '[]',
  instructor_name text,
  duration_days integer default 5,
  target_audience text default 'both' check (target_audience in ('employee', 'seeker', 'both')),
  start_date date,
  image_url text,
  capacity integer,
  price numeric default 0,
  is_free boolean default true,
  registration_url text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. جدول التسجيل في الدورات
create table if not exists public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

-- 4. جدول الشهادات
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  certificate_number text unique,
  issued_at timestamptz default now()
);

-- 5. جدول طلبات التواصل
create table if not exists public.contact_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  message text,
  status text default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz default now()
);

-- 6. جدول الشركاء
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  website_url text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- تفعيل RLS
-- =============================================
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;
alter table public.contact_requests enable row level security;
alter table public.partners enable row level security;

-- =============================================
-- سياسات الصلاحيات (RLS Policies)
-- =============================================

-- users: كل مستخدم مُعرَّف يقرأ كل الصفوف (اللازم لعمل الداشبورد)
drop policy if exists "auth_read_users" on public.users;
create policy "auth_read_users" on public.users
  for select to authenticated using (true);

-- users: كل مستخدم يعدل سجله هو فقط
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated using (auth.uid() = id);

-- users: الأدمن يعدل أي صف
drop policy if exists "admin_update_users" on public.users;
create policy "admin_update_users" on public.users
  for update to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- courses: قراءة مفتوحة للجميع (بدون تسجيل دخول)
drop policy if exists "public_read_courses" on public.courses;
create policy "public_read_courses" on public.courses
  for select using (true);

-- courses: الأدمن يضيف/يعدل/يحذف
drop policy if exists "admin_insert_courses" on public.courses;
create policy "admin_insert_courses" on public.courses
  for insert to authenticated
  with check ((select is_admin from public.users where id = auth.uid()));

drop policy if exists "admin_update_courses" on public.courses;
create policy "admin_update_courses" on public.courses
  for update to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

drop policy if exists "admin_delete_courses" on public.courses;
create policy "admin_delete_courses" on public.courses
  for delete to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- enrollments
drop policy if exists "auth_read_enrollments" on public.enrollments;
create policy "auth_read_enrollments" on public.enrollments
  for select to authenticated using (true);

drop policy if exists "users_insert_enrollment" on public.enrollments;
create policy "users_insert_enrollment" on public.enrollments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "admin_update_enrollments" on public.enrollments;
create policy "admin_update_enrollments" on public.enrollments
  for update to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- certificates
drop policy if exists "auth_read_certs" on public.certificates;
create policy "auth_read_certs" on public.certificates
  for select to authenticated using (true);

drop policy if exists "admin_manage_certs" on public.certificates;
create policy "admin_manage_certs" on public.certificates
  for all to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- contact_requests
drop policy if exists "anon_insert_contacts" on public.contact_requests;
create policy "anon_insert_contacts" on public.contact_requests
  for insert with check (true);

drop policy if exists "admin_read_contacts" on public.contact_requests;
create policy "admin_read_contacts" on public.contact_requests
  for select to authenticated using (true);

drop policy if exists "admin_update_contacts" on public.contact_requests;
create policy "admin_update_contacts" on public.contact_requests
  for update to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- partners: قراءة عامة، كتابة للأدمن
drop policy if exists "public_read_partners" on public.partners;
create policy "public_read_partners" on public.partners
  for select using (true);

drop policy if exists "admin_manage_partners" on public.partners;
create policy "admin_manage_partners" on public.partners
  for all to authenticated
  using ((select is_admin from public.users where id = auth.uid()));

-- =============================================
-- Trigger: إنشاء صف مستخدم تلقائياً عند التسجيل
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- إدخال كل المستخدمين الموجودين الذين لم تُنشأ لهم صفوف بعد
-- =============================================
insert into public.users (id, email)
select id, email
from auth.users
where id not in (select id from public.users)
on conflict (id) do nothing;

-- =============================================
-- *** تعيين kramabid1@gmail.com كأدمن ***
-- =============================================
update public.users
set is_admin = true
where email = 'kramabid1@gmail.com';

-- تأكيد نجاح العملية
select email, is_admin, created_at
from public.users
where email = 'kramabid1@gmail.com';

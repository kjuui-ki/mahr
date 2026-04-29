-- =============================================
-- منصة مهارات - Supabase Database Schema
-- انسخ هذا الكود كاملاً في Supabase > SQL Editor ثم اضغط Run
-- =============================================

-- ===================
-- 1. جدول المستخدمين
-- ===================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text default '',
  user_type text default 'employee' check (user_type in ('employee', 'seeker')),
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- ===================
-- 2. جدول الدورات التدريبية
-- ===================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  terms text default 'شهادة معتمدة | مدة الدورة 5 ايام | بمعدل 40 ساعة تدريبية',
  axes jsonb default '[]',
  instructor_name text default '',
  duration_days integer default 5,
  start_date date,
  is_free boolean default true,
  price numeric(10,2) default 0,
  target_audience text default 'both' check (target_audience in ('employee', 'seeker', 'both')),
  image_url text default '',
  capacity integer,
  registration_url text default '',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- ===================
-- 3. جدول التسجيل في الدورات
-- ===================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  status text default 'pending' check (status in ('pending', 'approved', 'completed', 'cancelled')),
  unique(user_id, course_id)
);

-- ===================
-- 4. جدول الشهادات
-- ===================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz default now(),
  certificate_number text unique default concat('CERT-', to_char(now(), 'YYYY'), '-', floor(random() * 900000 + 100000)::text),
  unique(user_id, course_id)
);

-- ===================
-- 5. جدول الشركاء
-- ===================
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text default '',
  website_url text default '',
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ===================
-- 6. جدول طلبات التواصل
-- ===================
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text default '',
  message text not null,
  status text default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz default now()
);

-- =============================================
-- TRIGGER: إنشاء ملف شخصي تلقائياً عند التسجيل
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
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
-- Row Level Security (RLS)
-- =============================================
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;
alter table public.partners enable row level security;
alter table public.contact_requests enable row level security;

-- سياسات جدول users
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "admins_select_all_users" on public.users;
create policy "admins_select_all_users" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- سياسات جدول courses
drop policy if exists "anyone_select_active_courses" on public.courses;
create policy "anyone_select_active_courses" on public.courses
  for select using (is_active = true);

drop policy if exists "admins_all_courses" on public.courses;
create policy "admins_all_courses" on public.courses
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- سياسات جدول enrollments
drop policy if exists "users_select_own_enrollments" on public.enrollments;
create policy "users_select_own_enrollments" on public.enrollments
  for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own_enrollments" on public.enrollments;
create policy "users_insert_own_enrollments" on public.enrollments
  for insert with check (auth.uid() = user_id);

drop policy if exists "admins_all_enrollments" on public.enrollments;
create policy "admins_all_enrollments" on public.enrollments
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- سياسات جدول certificates
drop policy if exists "users_select_own_certs" on public.certificates;
create policy "users_select_own_certs" on public.certificates
  for select using (auth.uid() = user_id);

drop policy if exists "admins_all_certs" on public.certificates;
create policy "admins_all_certs" on public.certificates
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- سياسات جدول partners
drop policy if exists "anyone_select_active_partners" on public.partners;
create policy "anyone_select_active_partners" on public.partners
  for select using (is_active = true);

drop policy if exists "admins_all_partners" on public.partners;
create policy "admins_all_partners" on public.partners
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- سياسات جدول contact_requests
drop policy if exists "anyone_insert_contact" on public.contact_requests;
create policy "anyone_insert_contact" on public.contact_requests
  for insert with check (true);

drop policy if exists "admins_select_contact" on public.contact_requests;
create policy "admins_select_contact" on public.contact_requests
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

drop policy if exists "admins_update_contact" on public.contact_requests;
create policy "admins_update_contact" on public.contact_requests
  for update using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- =============================================
-- تعليمات بعد تشغيل هذا السكريبت:
-- 1. اذهب إلى Table Editor > users
-- 2. ابحث عن حسابك (باستخدام البريد الإلكتروني)
-- 3. عدّل حقل is_admin من false إلى true
-- 4. الآن تستطيع الدخول إلى لوحة التحكم dashboard.html
-- =============================================

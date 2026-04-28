# Code Citations

## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


## License: Apache-2.0
https://github.com/supabase/supabase/blob/80b1791cc4a5d98d3fb8faaee866eff4a0dbf4a4/apps/www/_blog/2022-11-08-authentication-in-ionic-angular.mdx

```
وجدت المشكلة الأساسية. عند `signUp` في Supabase، إذا كان **تأكيد الإيميل مفعّل** (وهو الافتراضي)، فالمستخدم يُنشأ في `auth.users` لكن **لا توجد session نشطة بعد**، مما يعني أن `auth.uid()` = null والـ RLS يمنع الـ `insert`.

**الحل الصحيح**: إنشاء Trigger تلقائي في Supabase يحفظ البيانات من server-side (يتجاوز RLS). أعطِ صاحبك هذا الـ SQL:

```sql
-- أولاً: احذف الجدول القديم لو موجود
drop table if exists public.users;

-- أنشئ الجدول من جديد
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamp with time zone default now()
);

-- فعّل RLS
alter table public.users enable row level security;

-- Policies للقراءة والتعديل
create policy "Allow user to read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Allow user to update own data"
  on public.users for update
  using (auth.uid() = id);

-- Trigger يحفظ تلقائياً عند إنشاء أي حساب جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---
```


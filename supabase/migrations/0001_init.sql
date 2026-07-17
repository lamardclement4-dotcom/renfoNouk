-- ============================================================
-- Config globale (une seule ligne) : mode d'inscription manuel/ouvert
-- ============================================================
create table if not exists app_config (
  id int primary key default 1,
  signup_mode text not null default 'manual' check (signup_mode in ('manual', 'open')),
  constraint single_row check (id = 1)
);
insert into app_config (id, signup_mode) values (1, 'manual')
  on conflict (id) do nothing;

-- Profils utilisateurs (1 ligne par compte auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  phys jsonb default '{}'::jsonb,
  goals jsonb default '{}'::jsonb,
  cycle jsonb default '{}'::jsonb,
  sensitive_zones text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists mobility_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_nutrition_user on nutrition_logs(user_id);
create index if not exists idx_sleep_user on sleep_logs(user_id);
create index if not exists idx_mobility_user on mobility_tests(user_id);

alter table profiles enable row level security;
alter table sessions enable row level security;
alter table nutrition_logs enable row level security;
alter table sleep_logs enable row level security;
alter table mobility_tests enable row level security;
alter table app_config enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or is_admin());
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles
  for update using (is_admin());
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "app_config_select_all" on app_config;
create policy "app_config_select_all" on app_config
  for select using (true);
drop policy if exists "app_config_update_admin" on app_config;
create policy "app_config_update_admin" on app_config
  for update using (is_admin());

drop policy if exists "sessions_own" on sessions;
create policy "sessions_own" on sessions
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

drop policy if exists "nutrition_own" on nutrition_logs;
create policy "nutrition_own" on nutrition_logs
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

drop policy if exists "sleep_own" on sleep_logs;
create policy "sleep_own" on sleep_logs
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

drop policy if exists "mobility_own" on mobility_tests;
create policy "mobility_own" on mobility_tests
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  mode text;
begin
  select signup_mode into mode from app_config where id = 1;
  insert into profiles (id, status)
  values (new.id, case when mode = 'open' then 'approved' else 'pending' end);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

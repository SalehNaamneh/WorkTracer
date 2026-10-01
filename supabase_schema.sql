-- Run this in Supabase SQL Editor

create table sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_rate numeric not null default 0,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table work_days (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table work_day_sites (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references work_days(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade
);

create table work_day_workers (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references work_days(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  site_id uuid references sites(id) on delete set null
);

create table worker_payments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  amount numeric not null,
  date date not null,
  note text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric not null,
  description text not null default '',
  note text not null default '',
  is_worker_pay boolean not null default false,
  worker_id uuid references workers(id) on delete set null,
  work_day_id uuid references work_days(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table sites enable row level security;
alter table workers enable row level security;
alter table work_days enable row level security;
alter table work_day_sites enable row level security;
alter table work_day_workers enable row level security;
alter table worker_payments enable row level security;
alter table expenses enable row level security;

-- RLS policies (each user sees only their own data)
create policy "own sites" on sites for all using (auth.uid() = user_id);
create policy "own workers" on workers for all using (auth.uid() = user_id);
create policy "own work_days" on work_days for all using (auth.uid() = user_id);

create policy "own work_day_sites" on work_day_sites for all
  using (work_day_id in (select id from work_days where user_id = auth.uid()));

create policy "own work_day_workers" on work_day_workers for all
  using (work_day_id in (select id from work_days where user_id = auth.uid()));

create policy "own worker_payments" on worker_payments for all using (auth.uid() = user_id);
create policy "own expenses" on expenses for all using (auth.uid() = user_id);

-- Run this separately if you already created the tables:
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;

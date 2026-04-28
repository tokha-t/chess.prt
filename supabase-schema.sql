create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  city text default 'Other',
  rating integer default 800,
  xp integer default 0,
  games_played integer default 0,
  wins integer default 0,
  losses integer default 0,
  draws integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opponent_type text not null,
  user_color text not null check (user_color in ('white', 'black')),
  result text not null check (result in ('win', 'loss', 'draw', 'resigned', 'unfinished')),
  final_fen text not null,
  pgn text,
  move_history jsonb default '[]'::jsonb,
  mistakes jsonb default '[]'::jsonb,
  accuracy integer check (accuracy >= 0 and accuracy <= 100),
  created_at timestamptz default now()
);

alter table public.games
  add column if not exists report jsonb,
  add column if not exists move_evaluations jsonb default '[]'::jsonb,
  add column if not exists good_moves_count integer default 0,
  add column if not exists bad_moves_count integer default 0,
  add column if not exists xp_earned integer default 0,
  add column if not exists share_id text;

create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mission_type text not null,
  title text not null,
  description text not null,
  target_value integer default 1,
  current_value integer default 0,
  xp_reward integer default 20,
  completed boolean default false,
  completed_at timestamptz,
  mission_date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists public.game_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  username text,
  result text,
  opponent_type text,
  user_color text,
  accuracy integer,
  total_moves integer,
  good_moves_count integer,
  bad_moves_count integer,
  best_move text,
  worst_move text,
  main_weakness text,
  coach_tip text,
  xp_earned integer default 0,
  share_id text unique,
  report jsonb,
  created_at timestamptz default now()
);

create index if not exists games_user_created_idx on public.games (user_id, created_at desc);
create index if not exists profiles_city_rating_idx on public.profiles (city, rating desc);
create index if not exists profiles_xp_idx on public.profiles (xp desc);
create index if not exists daily_missions_user_date_idx on public.daily_missions (user_id, mission_date);
create index if not exists daily_missions_type_idx on public.daily_missions (mission_type);
create unique index if not exists daily_missions_unique_type_idx
  on public.daily_missions (user_id, mission_date, mission_type);
create index if not exists game_reports_share_idx on public.game_reports (share_id);
create unique index if not exists games_share_id_idx on public.games (share_id) where share_id is not null;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.daily_missions enable row level security;
alter table public.game_reports enable row level security;

drop policy if exists "Public can read profile ranking fields" on public.profiles;
create policy "Public can read profile ranking fields"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their own games" on public.games;
create policy "Users can read their own games"
  on public.games for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own games" on public.games;
create policy "Users can insert their own games"
  on public.games for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own games" on public.games;
create policy "Users can update their own games"
  on public.games for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own daily missions" on public.daily_missions;
create policy "Users can read their own daily missions"
  on public.daily_missions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily missions" on public.daily_missions;
create policy "Users can insert their own daily missions"
  on public.daily_missions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily missions" on public.daily_missions;
create policy "Users can update their own daily missions"
  on public.daily_missions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own reports" on public.game_reports;
create policy "Users can read their own reports"
  on public.game_reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reports" on public.game_reports;
create policy "Users can insert their own reports"
  on public.game_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Public can read shareable reports" on public.game_reports;
create policy "Public can read shareable reports"
  on public.game_reports for select
  using (share_id is not null);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, city)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Chess learner'),
    'Other'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.leaderboard as
select
  id as user_id,
  username,
  city,
  rating,
  xp,
  games_played,
  updated_at
from public.profiles
order by rating desc, xp desc;

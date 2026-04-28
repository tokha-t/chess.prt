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

create index if not exists games_user_created_idx on public.games (user_id, created_at desc);
create index if not exists profiles_city_rating_idx on public.profiles (city, rating desc);
create index if not exists profiles_xp_idx on public.profiles (xp desc);

alter table public.profiles enable row level security;
alter table public.games enable row level security;

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

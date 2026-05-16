-- ─────────────────────────────────────────────────────────────────────────────
-- SpendingApp — Supabase SQL Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── 1. PROFILES ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text        not null,
  email               text        not null,
  avatar              text        not null default '',
  pin_hash            text,                          -- bcrypt hash of PIN, never plain text
  biometric_enabled   boolean     not null default false,
  two_factor_enabled  boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Row Level Security: users can only access their own profile
alter table public.profiles enable row level security;

create policy "profiles: own row only"
  on public.profiles
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 2))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. TRANSACTIONS ─────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id              text        primary key,               -- client-generated nanoid
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  name            text        not null,
  amt             bigint      not null check (amt > 0),  -- store as integer (đồng)
  cat             text        not null check (cat in ('food','move','shop','health','fun','other')),
  type            text        not null check (type in ('exp','inc')),
  date            text        not null,                  -- display date string
  txn_timestamp   bigint      not null,                  -- epoch ms for sorting
  created_at      timestamptz not null default now()
);

create index if not exists idx_txn_user_ts on public.transactions (user_id, txn_timestamp desc);

alter table public.transactions enable row level security;

create policy "transactions: own rows only"
  on public.transactions
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 3. GOALS ────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          text        primary key,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  target      bigint      not null check (target > 0),
  saved       bigint      not null default 0 check (saved >= 0),
  emoji       text        not null default '🎯',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals: own rows only"
  on public.goals
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 4. BUDGETS ──────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null unique references public.profiles(id) on delete cascade,
  total             bigint      not null default 5000000,
  category_limits   jsonb       not null default '{
    "food":   1500000,
    "move":    500000,
    "shop":    800000,
    "health":  500000,
    "fun":     500000,
    "other":   700000
  }'::jsonb,
  updated_at        timestamptz not null default now()
);

alter table public.budgets enable row level security;

create policy "budgets: own row only"
  on public.budgets
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create default budget on signup
create or replace function public.handle_new_budget()
returns trigger language plpgsql security definer as $$
begin
  insert into public.budgets (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_budget();

-- ─── 5. REALTIME ─────────────────────────────────────────────────────────────
-- Enable realtime for live sync across devices
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.budgets;

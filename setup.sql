-- SQL Script for Supabase Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Users Table
create table if not exists public.users (
  uid uuid references auth.users not null primary key,
  email text,
  displayName text,
  photoURL text,
  role text default 'student', -- 'admin', 'student', 'evaluator'
  institutionId text default 'default-inst',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Fairs Table
create table if not exists public.fairs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'rascunho',
  institutionId text default 'default-inst',
  organizerId uuid references auth.users,
  dates jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Projects Table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  status text default 'pendente',
  fairId uuid references fairs(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.fairs enable row level security;
alter table public.projects enable row level security;

-- 5. Create basic policies (Allow all for authenticated users for dev)
-- WARNING: Restrict these in production!
create policy "Allow all for authenticated users" on public.users for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.fairs for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.projects for all to authenticated using (true);

-- SQL Script for Supabase Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Institutions Table (RF15)
create table if not exists public.institutions (
  id text primary key,
  name text not null,
  settings jsonb default '{"dataIsolation": true, "autoAnonymization": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Users Table
create table if not exists public.users (
  uid uuid references auth.users not null primary key,
  email text,
  displayName text,
  photoURL text,
  role text default 'student', -- 'admin', 'student', 'evaluator'
  institutionId text references public.institutions(id) default 'default-inst',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Fairs Table (RF01, RF02, RF03)
create table if not exists public.fairs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'rascunho', -- 'rascunho', 'publicado', 'encerrado'
  institutionId text references public.institutions(id) default 'default-inst',
  organizerId uuid references auth.users,
  dates jsonb default '{
    "registration_start": null,
    "registration_end": null,
    "evaluation_start": null,
    "evaluation_end": null,
    "results_date": null
  }'::jsonb,
  structure jsonb default '{
    "categories": [],
    "modalities": []
  }'::jsonb,
  rules jsonb default '{
    "blind_evaluation": false,
    "min_evaluators_per_project": 3,
    "tie_breaker_hierarchy": []
  }'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Evaluation Criteria Table (RF04)
create table if not exists public.evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  fairId uuid references fairs(id) on delete cascade,
  category text, -- optional, if null applies to all
  name text not null,
  description text,
  weight numeric default 1.0,
  scale_type text default 'numeric', -- 'numeric', 'rubric'
  max_score integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Create Projects Table (RF05, RF07)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  abstract text,
  status text default 'pendente', -- 'pendente', 'submetido', 'em_avaliacao', 'avaliado'
  fairId uuid references fairs(id) on delete cascade,
  institutionId text references public.institutions(id) default 'default-inst',
  creatorId uuid references auth.users,
  members jsonb default '[]'::jsonb, -- array of {name, email, role, justification?}
  evidence jsonb default '{
    "files": [],
    "links": []
  }'::jsonb,
  current_version integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Create Project Versions Table (RF06)
create table if not exists public.project_versions (
  id uuid default gen_random_uuid() primary key,
  projectId uuid references projects(id) on delete cascade,
  version_number integer not null,
  data jsonb not null, -- snapshot of title, abstract, evidence, members
  created_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Create Evaluations Table (RF08, RF12)
create table if not exists public.evaluations (
  id uuid default gen_random_uuid() primary key,
  projectId uuid references projects(id) on delete cascade,
  evaluatorId uuid references auth.users,
  scores jsonb not null, -- map of {criteriaId: score}
  feedback text,
  status text default 'rascunho', -- 'rascunho', 'finalizado'
  is_conflict_declared boolean default false, -- RF09
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Create Audit Logs Table (RF16)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  userId uuid references auth.users,
  action text not null, -- e.g., 'UPDATE_PROJECT', 'SUBMIT_SCORE'
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  institutionId text references public.institutions(id),
  timestamp timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Create Certificates Table (RF14)
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  userId uuid references auth.users,
  fairId uuid references fairs(id),
  type text, -- 'PARTICIPATION', 'AWARD', 'EVALUATOR'
  hash text unique not null,
  data jsonb, -- metadata for PDF generation
  issued_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. Enable RLS (Row Level Security)
alter table public.institutions enable row level security;
alter table public.users enable row level security;
alter table public.fairs enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.certificates enable row level security;

-- 11. Create Silo Policies (RF15)
-- Users can only see data from their own institution

-- Institutions: Admins can see their own
create policy "Institutions isolation" on public.institutions
  for select using (
    id in (select institutionId from public.users where uid = auth.uid())
  );

-- Users: See others in same institution
create policy "Users isolation" on public.users
  for all using (
    institutionId in (select institutionId from public.users where uid = auth.uid())
  );

-- Fairs: See fairs in same institution
create policy "Fairs isolation" on public.fairs
  for all using (
    institutionId in (select institutionId from public.users where uid = auth.uid())
  );

-- Projects: See projects in same institution
create policy "Projects isolation" on public.projects
  for all using (
    institutionId in (select institutionId from public.users where uid = auth.uid())
  );

-- Evaluations: Only evaluators or admins in same institution
create policy "Evaluations isolation" on public.evaluations
  for all using (
    projectId in (select id from public.projects where institutionId in (select institutionId from public.users where uid = auth.uid()))
  );

-- Audit Logs: Only admins of same institution
create policy "Audit logs isolation" on public.audit_logs
  for select using (
    institutionId in (select institutionId from public.users where uid = auth.uid() and role = 'admin')
  );

-- 12. Insert Default Institution
insert into public.institutions (id, name) values ('default-inst', 'Instituição Padrão') on conflict do nothing;

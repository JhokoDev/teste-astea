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
  category text,
  modality text,
  status text default 'pendente', -- 'pendente', 'submetido', 'em_avaliacao', 'avaliado'
  fairId uuid references fairs(id) on delete cascade,
  institutionId text references public.institutions(id) default 'default-inst',
  creatorId uuid references auth.users,
  members jsonb default '[]'::jsonb, -- array of {name, email, role, justification?}
  evidence jsonb default '{
    "files": [],
    "links": []
  }'::jsonb,
  custom_data jsonb default '{}'::jsonb,
  current_version integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist if table was created previously
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='category') then
    alter table public.projects add column category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='modality') then
    alter table public.projects add column modality text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='custom_data') then
    alter table public.projects add column custom_data jsonb default '{}'::jsonb;
  end if;
  -- Robust check for fairId
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='fairId') then
    if exists (select 1 from information_schema.columns where table_name='projects' and column_name='fairid') then
      alter table public.projects rename column fairid to "fairId";
    else
      alter table public.projects add column "fairId" uuid references fairs(id) on delete cascade;
    end if;
  end if;
  -- Robust check for creatorId
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='creatorId') then
    if exists (select 1 from information_schema.columns where table_name='projects' and column_name='creatorid') then
      alter table public.projects rename column creatorid to "creatorId";
    else
      alter table public.projects add column "creatorId" uuid references auth.users;
    end if;
  end if;
  -- Robust check for institutionId
  if not exists (select 1 from information_schema.columns where table_name='projects' and column_name='institutionId') then
    if exists (select 1 from information_schema.columns where table_name='projects' and column_name='institutionid') then
      alter table public.projects rename column institutionid to "institutionId";
    else
      alter table public.projects add column "institutionId" text references public.institutions(id) default 'default-inst';
    end if;
  end if;
end $$;

-- 6. Create Evaluator Applications Table
create table if not exists public.evaluator_applications (
  id uuid default gen_random_uuid() primary key,
  fairId uuid references fairs(id) on delete cascade,
  userId uuid references auth.users,
  institutionId text references public.institutions(id) default 'default-inst',
  status text default 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Create Project Versions Table (RF06)
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

alter table public.evaluator_applications enable row level security;

-- 11. Create Silo Policies (RF15)
-- Users can only see data from their own institution

-- Institutions: Admins can see their own
drop policy if exists "Institutions isolation" on public.institutions;
create policy "Institutions isolation" on public.institutions
  for select using (
    true -- For development, allow all. In production, use: id in (select institutionId from public.users where uid = auth.uid())
  );

-- Users: See others in same institution
drop policy if exists "Users isolation" on public.users;
create policy "Users isolation" on public.users
  for all using (
    true -- For development, allow all. In production, use: institutionId in (select institutionId from public.users where uid = auth.uid())
  );

-- Fairs: See fairs in same institution
drop policy if exists "Fairs isolation" on public.fairs;
drop policy if exists "Fairs development policy" on public.fairs;
create policy "Fairs development policy" on public.fairs
  for all 
  using (true)
  with check (true);

-- Projects: See projects in same institution
drop policy if exists "Projects isolation" on public.projects;
drop policy if exists "Projects development policy" on public.projects;
create policy "Projects development policy" on public.projects
  for all using (true) with check (true);

-- Evaluator Applications: See own or all for admins
drop policy if exists "Evaluator applications isolation" on public.evaluator_applications;
create policy "Evaluator applications isolation" on public.evaluator_applications
  for all using (true) with check (true);

-- Project Versions: See all for development
drop policy if exists "Project versions isolation" on public.project_versions;
create policy "Project versions isolation" on public.project_versions
  for all using (true) with check (true);

-- Certificates: See own or all for admins
drop policy if exists "Certificates isolation" on public.certificates;
create policy "Certificates isolation" on public.certificates
  for all using (true) with check (true);

-- Evaluations: Only evaluators or admins in same institution
drop policy if exists "Evaluations isolation" on public.evaluations;
drop policy if exists "Evaluations development policy" on public.evaluations;
create policy "Evaluations development policy" on public.evaluations
  for all using (true) with check (true);

-- Audit Logs: Only admins of same institution
drop policy if exists "Audit logs isolation" on public.audit_logs;
create policy "Audit logs isolation" on public.audit_logs
  for all using (
    true -- For development, allow all. In production, use: institutionId in (select institutionId from public.users where uid = auth.uid() and role = 'admin')
  );

-- 12. Insert Default Institution
insert into public.institutions (id, name) values ('default-inst', 'Instituição Padrão') on conflict do nothing;

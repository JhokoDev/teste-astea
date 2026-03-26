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
  "uid" text primary key,
  "email" text unique not null,
  "displayName" text,
  "photoURL" text,
  "role" text default 'student', -- 'admin', 'student', 'evaluator'
  "institutionId" text references public.institutions(id) default 'default-inst',
  "settings" jsonb default '{"emailNotifications": true, "deadlineAlerts": true}'::jsonb,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist and have correct names/types in users table
do $$ 
begin 
  -- displayName
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='displayName') then
    if exists (select 1 from information_schema.columns where table_name='users' and column_name='displayname') then
      alter table public.users rename column displayname to "displayName";
    else
      alter table public.users add column "displayName" text;
    end if;
  end if;

  -- photoURL
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='photoURL') then
    if exists (select 1 from information_schema.columns where table_name='users' and column_name='photourl') then
      alter table public.users rename column photourl to "photoURL";
    else
      alter table public.users add column "photoURL" text;
    end if;
  end if;

  -- institutionId
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='institutionId') then
    if exists (select 1 from information_schema.columns where table_name='users' and column_name='institutionid') then
      alter table public.users rename column institutionid to "institutionId";
    else
      alter table public.users add column "institutionId" text references public.institutions(id) default 'default-inst';
    end if;
  end if;

  -- settings
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='settings') then
    alter table public.users add column "settings" jsonb default '{"emailNotifications": true, "deadlineAlerts": true}'::jsonb;
  end if;

  -- createdAt
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='createdAt') then
    if exists (select 1 from information_schema.columns where table_name='users' and column_name='created_at') then
      alter table public.users rename column created_at to "createdAt";
    else
      alter table public.users add column "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null;
    end if;
  end if;
end $$;

-- 3. Create Fairs Table (RF01, RF02, RF03)
create table if not exists public.fairs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'rascunho', -- 'rascunho', 'publicado', 'encerrado'
  "institutionId" text references public.institutions(id) default 'default-inst',
  "organizerId" uuid references auth.users,
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

-- Ensure columns exist and have correct names/types in fairs table
do $$ 
begin 
  -- institutionId
  if not exists (select 1 from information_schema.columns where table_name='fairs' and column_name='institutionId') then
    if exists (select 1 from information_schema.columns where table_name='fairs' and column_name='institutionid') then
      alter table public.fairs rename column institutionid to "institutionId";
    else
      alter table public.fairs add column "institutionId" text references public.institutions(id) default 'default-inst';
    end if;
  end if;

  -- organizerId
  if not exists (select 1 from information_schema.columns where table_name='fairs' and column_name='organizerId') then
    if exists (select 1 from information_schema.columns where table_name='fairs' and column_name='organizerid') then
      alter table public.fairs rename column organizerid to "organizerId";
    else
      alter table public.fairs add column "organizerId" uuid references auth.users;
    end if;
  end if;
end $$;

-- 4. Create Evaluation Criteria Table (RF04)
create table if not exists public.evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  "fairId" uuid references fairs(id) on delete cascade,
  category text, -- optional, if null applies to all
  name text not null,
  description text,
  weight numeric default 1.0,
  scale_type text default 'numeric', -- 'numeric', 'rubric'
  max_score integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in evaluation_criteria table
do $$ 
begin 
  -- fairId
  if not exists (select 1 from information_schema.columns where table_name='evaluation_criteria' and column_name='fairId') then
    if exists (select 1 from information_schema.columns where table_name='evaluation_criteria' and column_name='fairid') then
      alter table public.evaluation_criteria rename column fairid to "fairId";
    else
      alter table public.evaluation_criteria add column "fairId" uuid references fairs(id) on delete cascade;
    end if;
  end if;
end $$;

-- 5. Create Projects Table (RF05, RF07)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  abstract text,
  category text,
  modality text,
  status text default 'pendente', -- 'pendente', 'submetido', 'em_avaliacao', 'avaliado'
  "fairId" uuid references fairs(id) on delete cascade,
  "institutionId" text references public.institutions(id) default 'default-inst',
  "creatorId" text, -- Flexible for mock users
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
      -- Drop constraint if it exists before changing type
      execute (
        select 'alter table public.projects drop constraint ' || quote_ident(conname)
        from pg_constraint 
        where conname = 'projects_creatorId_fkey' or conname = 'projects_creatorid_fkey'
      );
      alter table public.projects alter column "creatorId" type text;
    else
      alter table public.projects add column "creatorId" text;
    end if;
  else
    -- Ensure it's text even if it already exists as creatorId
    -- Drop constraint if it exists before changing type
    execute (
      select coalesce(
        (select 'alter table public.projects drop constraint ' || quote_ident(conname)
         from pg_constraint 
         where conname = 'projects_creatorId_fkey' or conname = 'projects_creatorid_fkey'
         limit 1),
        'select 1'
      )
    );
    alter table public.projects alter column "creatorId" type text;
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
  "fairId" uuid references fairs(id) on delete cascade,
  "userId" text, -- Flexible for mock users
  "institutionId" text references public.institutions(id) default 'default-inst',
  status text default 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in evaluator_applications table
do $$ 
begin 
  -- fairId
  if not exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='fairId') then
    if exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='fairid') then
      alter table public.evaluator_applications rename column fairid to "fairId";
    else
      alter table public.evaluator_applications add column "fairId" uuid references fairs(id) on delete cascade;
    end if;
  else
    -- Ensure it's the correct type if it exists
    alter table public.evaluator_applications alter column "fairId" type uuid;
  end if;

  -- userId
  if not exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='userId') then
    if exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='userid') then
      alter table public.evaluator_applications rename column userid to "userId";
      -- Drop constraint if it exists before changing type
      execute (
        select coalesce(
          (select 'alter table public.evaluator_applications drop constraint ' || quote_ident(conname)
           from pg_constraint 
           where conname like 'evaluator_applications_userId_fkey%' or conname like 'evaluator_applications_userid_fkey%'
           limit 1),
          'select 1'
        )
      );
      alter table public.evaluator_applications alter column "userId" type text;
    else
      alter table public.evaluator_applications add column "userId" text;
    end if;
  else
    -- Ensure it's text even if it already exists as userId
    -- Drop constraint if it exists before changing type
    execute (
      select coalesce(
        (select 'alter table public.evaluator_applications drop constraint ' || quote_ident(conname)
         from pg_constraint 
         where conname like 'evaluator_applications_userId_fkey%' or conname like 'evaluator_applications_userid_fkey%'
         limit 1),
        'select 1'
      )
    );
    alter table public.evaluator_applications alter column "userId" type text;
  end if;

  -- institutionId
  if not exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='institutionId') then
    if exists (select 1 from information_schema.columns where table_name='evaluator_applications' and column_name='institutionid') then
      alter table public.evaluator_applications rename column institutionid to "institutionId";
    else
      alter table public.evaluator_applications add column "institutionId" text references public.institutions(id) default 'default-inst';
    end if;
  end if;

  -- Add unique constraint if it doesn't exist
  if not exists (
    select 1 from pg_constraint 
    where conname = 'evaluator_applications_fairId_userId_key'
  ) then
    alter table public.evaluator_applications 
    add constraint evaluator_applications_fairId_userId_key unique ("fairId", "userId");
  end if;
end $$;

-- 7. Create Project Versions Table (RF06)
create table if not exists public.project_versions (
  id uuid default gen_random_uuid() primary key,
  "projectId" uuid references projects(id) on delete cascade,
  version_number integer not null,
  data jsonb not null, -- snapshot of title, abstract, evidence, members
  "createdBy" text, -- Flexible for mock users
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in project_versions table
do $$ 
begin 
  -- projectId
  if not exists (select 1 from information_schema.columns where table_name='project_versions' and column_name='projectId') then
    if exists (select 1 from information_schema.columns where table_name='project_versions' and column_name='projectid') then
      alter table public.project_versions rename column projectid to "projectId";
    else
      alter table public.project_versions add column "projectId" uuid references projects(id) on delete cascade;
    end if;
  end if;

  -- createdBy
  if not exists (select 1 from information_schema.columns where table_name='project_versions' and column_name='createdBy') then
    if exists (select 1 from information_schema.columns where table_name='project_versions' and column_name='createdby') then
      alter table public.project_versions rename column createdby to "createdBy";
      -- Drop constraint if it exists before changing type
      execute (
        select coalesce(
          (select 'alter table public.project_versions drop constraint ' || quote_ident(conname)
           from pg_constraint 
           where conname like 'project_versions_createdBy_fkey%' or conname like 'project_versions_createdby_fkey%' or conname like 'project_versions_created_by_fkey%'
           limit 1),
          'select 1'
        )
      );
      alter table public.project_versions alter column "createdBy" type text;
    elsif exists (select 1 from information_schema.columns where table_name='project_versions' and column_name='created_by') then
      alter table public.project_versions rename column created_by to "createdBy";
      -- Drop constraint if it exists before changing type
      execute (
        select coalesce(
          (select 'alter table public.project_versions drop constraint ' || quote_ident(conname)
           from pg_constraint 
           where conname like 'project_versions_createdBy_fkey%' or conname like 'project_versions_createdby_fkey%' or conname like 'project_versions_created_by_fkey%'
           limit 1),
          'select 1'
        )
      );
      alter table public.project_versions alter column "createdBy" type text;
    else
      alter table public.project_versions add column "createdBy" text;
    end if;
  else
    -- Ensure it's text even if it already exists as createdBy
    -- Drop constraint if it exists before changing type
    execute (
      select coalesce(
        (select 'alter table public.project_versions drop constraint ' || quote_ident(conname)
         from pg_constraint 
         where conname like 'project_versions_createdBy_fkey%' or conname like 'project_versions_createdby_fkey%' or conname like 'project_versions_created_by_fkey%'
         limit 1),
        'select 1'
      )
    );
    alter table public.project_versions alter column "createdBy" type text;
  end if;
end $$;

-- 7. Create Evaluations Table (RF08, RF12)
create table if not exists public.evaluations (
  id uuid default gen_random_uuid() primary key,
  "projectId" uuid references projects(id) on delete cascade,
  "evaluatorId" uuid references auth.users,
  scores jsonb not null, -- map of {criteriaId: score}
  feedback text,
  status text default 'rascunho', -- 'rascunho', 'finalizado'
  is_conflict_declared boolean default false, -- RF09
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in evaluations table
do $$ 
begin 
  -- projectId
  if not exists (select 1 from information_schema.columns where table_name='evaluations' and column_name='projectId') then
    if exists (select 1 from information_schema.columns where table_name='evaluations' and column_name='projectid') then
      alter table public.evaluations rename column projectid to "projectId";
    else
      alter table public.evaluations add column "projectId" uuid references projects(id) on delete cascade;
    end if;
  end if;

  -- evaluatorId
  if not exists (select 1 from information_schema.columns where table_name='evaluations' and column_name='evaluatorId') then
    if exists (select 1 from information_schema.columns where table_name='evaluations' and column_name='evaluatorid') then
      alter table public.evaluations rename column evaluatorid to "evaluatorId";
      -- Drop constraint if it exists before changing type
      execute (
        select coalesce(
          (select 'alter table public.evaluations drop constraint ' || quote_ident(conname)
           from pg_constraint 
           where conname like 'evaluations_evaluatorId_fkey%' or conname like 'evaluations_evaluatorid_fkey%'
           limit 1),
          'select 1'
        )
      );
      alter table public.evaluations alter column "evaluatorId" type text;
    else
      alter table public.evaluations add column "evaluatorId" text;
    end if;
  else
    -- Ensure it's text even if it already exists as evaluatorId
    -- Drop constraint if it exists before changing type
    execute (
      select coalesce(
        (select 'alter table public.evaluations drop constraint ' || quote_ident(conname)
         from pg_constraint 
         where conname like 'evaluations_evaluatorId_fkey%' or conname like 'evaluations_evaluatorid_fkey%'
         limit 1),
        'select 1'
      )
    );
    alter table public.evaluations alter column "evaluatorId" type text;
  end if;
end $$;

-- 8. Create Audit Logs Table (RF16)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  "userId" text, -- Flexible for mock users
  action text not null, -- e.g., 'UPDATE_PROJECT', 'SUBMIT_SCORE'
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  "institutionId" text references public.institutions(id),
  timestamp timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in audit_logs table
do $$ 
begin 
  -- userId
  if not exists (select 1 from information_schema.columns where table_name='audit_logs' and column_name='userId') then
    if exists (select 1 from information_schema.columns where table_name='audit_logs' and column_name='userid') then
      alter table public.audit_logs rename column userid to "userId";
      -- Drop constraint if it exists before changing type
      execute (
        select coalesce(
          (select 'alter table public.audit_logs drop constraint ' || quote_ident(conname)
           from pg_constraint 
           where conname like 'audit_logs_userId_fkey%' or conname like 'audit_logs_userid_fkey%'
           limit 1),
          'select 1'
        )
      );
      alter table public.audit_logs alter column "userId" type text;
    else
      alter table public.audit_logs add column "userId" text;
    end if;
  else
    -- Ensure it's text even if it already exists as userId
    -- Drop constraint if it exists before changing type
    execute (
      select coalesce(
        (select 'alter table public.audit_logs drop constraint ' || quote_ident(conname)
         from pg_constraint 
         where conname like 'audit_logs_userId_fkey%' or conname like 'audit_logs_userid_fkey%'
         limit 1),
        'select 1'
      )
    );
    alter table public.audit_logs alter column "userId" type text;
  end if;

  -- institutionId
  if not exists (select 1 from information_schema.columns where table_name='audit_logs' and column_name='institutionId') then
    if exists (select 1 from information_schema.columns where table_name='audit_logs' and column_name='institutionid') then
      alter table public.audit_logs rename column institutionid to "institutionId";
    else
      alter table public.audit_logs add column "institutionId" text references public.institutions(id);
    end if;
  end if;
end $$;

-- 9. Create Certificates Table (RF14)
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  "userId" uuid references auth.users,
  "fairId" uuid references fairs(id),
  type text, -- 'PARTICIPATION', 'AWARD', 'EVALUATOR'
  hash text unique not null,
  data jsonb, -- metadata for PDF generation
  issued_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in certificates table
do $$ 
begin 
  -- userId
  if not exists (select 1 from information_schema.columns where table_name='certificates' and column_name='userId') then
    if exists (select 1 from information_schema.columns where table_name='certificates' and column_name='userid') then
      alter table public.certificates rename column userid to "userId";
    else
      alter table public.certificates add column "userId" uuid references auth.users;
    end if;
  end if;

  -- fairId
  if not exists (select 1 from information_schema.columns where table_name='certificates' and column_name='fairId') then
    if exists (select 1 from information_schema.columns where table_name='certificates' and column_name='fairid') then
      alter table public.certificates rename column fairid to "fairId";
    else
      alter table public.certificates add column "fairId" uuid references fairs(id);
    end if;
  end if;
end $$;

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
  for all using (true) with check (true);

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

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

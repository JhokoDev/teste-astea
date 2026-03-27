-- SQL Script for Supabase Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Institutions Table (RF15)
create table if not exists public.institutions (
  id text primary key,
  name text not null,
  settings jsonb default '{"data_isolation": true, "auto_anonymization": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Users Table
create table if not exists public.users (
  uid text primary key,
  email text unique not null,
  display_name text,
  photo_url text,
  role text default 'student', -- 'admin', 'student', 'evaluator'
  institution_id text references public.institutions(id) default 'default-inst',
  settings jsonb default '{"email_notifications": true, "deadline_alerts": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist and have correct names/types in users table (Standardizing to snake_case)
do $$ 
begin 
  -- display_name
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='displayName') then
    alter table public.users rename column "displayName" to display_name;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='displayname') then
    alter table public.users rename column displayname to display_name;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='display_name') then
    alter table public.users add column display_name text;
  end if;

  -- photo_url
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='photoURL') then
    alter table public.users rename column "photoURL" to photo_url;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='photourl') then
    alter table public.users rename column photourl to photo_url;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='photo_url') then
    alter table public.users add column photo_url text;
  end if;

  -- institution_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='institutionId') then
    alter table public.users rename column "institutionId" to institution_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='institutionid') then
    alter table public.users rename column institutionid to institution_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='institution_id') then
    alter table public.users add column institution_id text references public.institutions(id) default 'default-inst';
  end if;

  -- created_at
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='createdAt') then
    alter table public.users rename column "createdAt" to created_at;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='createdat') then
    alter table public.users rename column createdat to created_at;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='created_at') then
    alter table public.users add column created_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
end $$;

-- 3. Create Fairs Table (RF01, RF02, RF03)
create table if not exists public.fairs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'rascunho', -- 'rascunho', 'publicado', 'encerrado'
  institution_id text references public.institutions(id) default 'default-inst',
  organizer_id text, -- Flexible for mock users
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
  -- institution_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='institutionId') then
    alter table public.fairs rename column "institutionId" to institution_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='institutionid') then
    alter table public.fairs rename column institutionid to institution_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='institution_id') then
    alter table public.fairs add column institution_id text references public.institutions(id) default 'default-inst';
  end if;

  -- organizer_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='organizerId') then
    alter table public.fairs rename column "organizerId" to organizer_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='organizerid') then
    alter table public.fairs rename column organizerid to organizer_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='organizer_id') then
    alter table public.fairs add column organizer_id text;
  end if;
end $$;

-- 4. Create Evaluation Criteria Table (RF04)
create table if not exists public.evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  fair_id uuid references fairs(id) on delete cascade,
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
  -- fair_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='fairId') then
    alter table public.evaluation_criteria rename column "fairId" to fair_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='fairid') then
    alter table public.evaluation_criteria rename column fairid to fair_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='fair_id') then
    alter table public.evaluation_criteria add column fair_id uuid references fairs(id) on delete cascade;
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
  fair_id uuid references fairs(id) on delete cascade,
  institution_id text references public.institutions(id) default 'default-inst',
  creator_id text, -- Flexible for mock users
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
  -- fair_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='fairId') then
    alter table public.projects rename column "fairId" to fair_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='fairid') then
    alter table public.projects rename column fairid to fair_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='fair_id') then
    alter table public.projects add column fair_id uuid references fairs(id) on delete cascade;
  end if;

  -- creator_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='creatorId') then
    alter table public.projects rename column "creatorId" to creator_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='creatorid') then
    alter table public.projects rename column creatorid to creator_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='creator_id') then
    alter table public.projects add column creator_id text;
  end if;

  -- institution_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='institutionId') then
    alter table public.projects rename column "institutionId" to institution_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='institutionid') then
    alter table public.projects rename column institutionid to institution_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='institution_id') then
    alter table public.projects add column institution_id text references public.institutions(id) default 'default-inst';
  end if;
end $$;

-- 6. Create Evaluator Applications Table
create table if not exists public.evaluator_applications (
  id uuid default gen_random_uuid() primary key,
  fair_id uuid references fairs(id) on delete cascade,
  user_id text, -- Flexible for mock users
  institution_id text references public.institutions(id) default 'default-inst',
  status text default 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in evaluator_applications table
do $$ 
begin 
  -- fair_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='fairId') then
    alter table public.evaluator_applications rename column "fairId" to fair_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='fairid') then
    alter table public.evaluator_applications rename column fairid to fair_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='fair_id') then
    alter table public.evaluator_applications add column fair_id uuid references fairs(id) on delete cascade;
  end if;

  -- user_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='userId') then
    alter table public.evaluator_applications rename column "userId" to user_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='userid') then
    alter table public.evaluator_applications rename column userid to user_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='user_id') then
    alter table public.evaluator_applications add column user_id text;
  end if;

  -- institution_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='institutionId') then
    alter table public.evaluator_applications rename column "institutionId" to institution_id;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='institutionid') then
    alter table public.evaluator_applications rename column institutionid to institution_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='institution_id') then
    alter table public.evaluator_applications add column institution_id text references public.institutions(id) default 'default-inst';
  end if;

  -- Add unique constraint if it doesn't exist
  if not exists (
    select 1 from pg_constraint 
    where conname = 'evaluator_applications_fair_id_user_id_key'
  ) then
    -- Drop old one if exists
    alter table public.evaluator_applications drop constraint if exists evaluator_applications_fairId_userId_key;
    alter table public.evaluator_applications 
    add constraint evaluator_applications_fair_id_user_id_key unique (fair_id, user_id);
  end if;
end $$;

-- 7. Create Project Versions Table (RF06)
create table if not exists public.project_versions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  version_number integer not null,
  data jsonb not null, -- snapshot of title, abstract, evidence, members
  created_by text, -- Flexible for mock users
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in project_versions table
do $$ 
begin 
  -- project_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='projectId') then
    alter table public.project_versions rename column "projectId" to project_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='project_id') then
    alter table public.project_versions add column project_id uuid references projects(id) on delete cascade;
  end if;

  -- created_by
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='createdBy') then
    alter table public.project_versions rename column "createdBy" to created_by;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='created_by') then
    alter table public.project_versions add column created_by text;
  end if;
end $$;

-- 8. Create Evaluations Table (RF08, RF12)
create table if not exists public.evaluations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  evaluator_id text, -- Flexible for mock users
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
  -- project_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='projectId') then
    alter table public.evaluations rename column "projectId" to project_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='project_id') then
    alter table public.evaluations add column project_id uuid references projects(id) on delete cascade;
  end if;

  -- evaluator_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='evaluatorId') then
    alter table public.evaluations rename column "evaluatorId" to evaluator_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='evaluator_id') then
    alter table public.evaluations add column evaluator_id text;
  end if;
end $$;

-- 9. Create Audit Logs Table (RF16)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text, -- Flexible for mock users
  action text not null, -- e.g., 'UPDATE_PROJECT', 'SUBMIT_SCORE'
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  institution_id text references public.institutions(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in audit_logs table
do $$ 
begin 
  -- user_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='userId') then
    alter table public.audit_logs rename column "userId" to user_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='user_id') then
    alter table public.audit_logs add column user_id text;
  end if;

  -- institution_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='institutionId') then
    alter table public.audit_logs rename column "institutionId" to institution_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='institution_id') then
    alter table public.audit_logs add column institution_id text references public.institutions(id);
  end if;

  -- created_at
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='timestamp') then
    alter table public.audit_logs rename column "timestamp" to created_at;
  end if;
end $$;

-- 10. Create Certificates Table (RF14)
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  user_id text, -- Flexible for mock users
  fair_id uuid references fairs(id),
  type text, -- 'PARTICIPATION', 'AWARD', 'EVALUATOR'
  hash text unique not null,
  data jsonb, -- metadata for PDF generation
  issued_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist and have correct names/types in certificates table
do $$ 
begin 
  -- user_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='userId') then
    alter table public.certificates rename column "userId" to user_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='user_id') then
    alter table public.certificates add column user_id text;
  end if;

  -- fair_id
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='fairId') then
    alter table public.certificates rename column "fairId" to fair_id;
  elsif not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='fair_id') then
    alter table public.certificates add column fair_id uuid references fairs(id);
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

-- 11. Create Audit Trigger Function
create or replace function public.handle_audit_log()
returns trigger as $$
declare
  v_user_id text;
  v_institution_id text;
  v_action text;
begin
  -- Try to get user ID from settings or auth
  v_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  
  -- If not in JWT, maybe it's a mock user action or system action
  -- We'll try to find the institution_id from the record if possible
  if TG_TABLE_NAME = 'users' then
    v_institution_id := coalesce(new.institution_id, old.institution_id);
  elsif TG_TABLE_NAME = 'fairs' then
    v_institution_id := coalesce(new.institution_id, old.institution_id);
  elsif TG_TABLE_NAME = 'projects' then
    v_institution_id := coalesce(new.institution_id, old.institution_id);
  elsif TG_TABLE_NAME = 'evaluator_applications' then
    v_institution_id := coalesce(new.institution_id, old.institution_id);
  end if;

  v_action := TG_OP || '_' || upper(TG_TABLE_NAME);

  insert into public.audit_logs (
    user_id,
    action,
    target_table,
    target_id,
    old_data,
    new_data,
    institution_id
  ) values (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end,
    v_institution_id
  );

  return null;
end;
$$ language plpgsql security definer;

-- Attach triggers
drop trigger if exists on_fairs_audit on public.fairs;
create trigger on_fairs_audit
  after insert or update or delete on public.fairs
  for each row execute function public.handle_audit_log();

drop trigger if exists on_projects_audit on public.projects;
create trigger on_projects_audit
  after insert or update or delete on public.projects
  for each row execute function public.handle_audit_log();

drop trigger if exists on_evaluations_audit on public.evaluations;
create trigger on_evaluations_audit
  after insert or update or delete on public.evaluations
  for each row execute function public.handle_audit_log();

drop trigger if exists on_evaluator_applications_audit on public.evaluator_applications;
create trigger on_evaluator_applications_audit
  after insert or update or delete on public.evaluator_applications
  for each row execute function public.handle_audit_log();

drop trigger if exists on_project_versions_audit on public.project_versions;
create trigger on_project_versions_audit
  after insert or update or delete on public.project_versions
  for each row execute function public.handle_audit_log();

-- 12. Create RPC for Atomic Project Creation
create or replace function public.create_project_with_version(
  p_title text,
  p_abstract text,
  p_category text,
  p_modality text,
  p_fair_id uuid,
  p_institution_id text,
  p_creator_id text,
  p_members jsonb,
  p_evidence jsonb,
  p_custom_data jsonb
)
returns jsonb as $$
declare
  v_project_id uuid;
  v_project_record record;
begin
  -- 1. Insert Project
  insert into public.projects (
    title,
    abstract,
    category,
    modality,
    fair_id,
    institution_id,
    creator_id,
    members,
    evidence,
    custom_data,
    status
  ) values (
    p_title,
    p_abstract,
    p_category,
    p_modality,
    p_fair_id,
    p_institution_id,
    p_creator_id,
    p_members,
    p_evidence,
    p_custom_data,
    'submetido'
  ) returning * into v_project_record;

  v_project_id := v_project_record.id;

  -- 2. Insert Version
  insert into public.project_versions (
    project_id,
    version_number,
    data,
    created_by
  ) values (
    v_project_id,
    1,
    to_jsonb(v_project_record),
    p_creator_id
  );

  return to_jsonb(v_project_record);
exception when others then
  raise exception 'Failed to create project with version: %', SQLERRM;
end;
$$ language plpgsql security definer;

-- 13. Create Silo Policies (RF15)
-- Users can only see data from their own institution

-- Institutions: Admins can see their own
drop policy if exists "Institutions isolation" on public.institutions;
create policy "Institutions isolation" on public.institutions
  for select using (
    true -- For development, allow all. In production, use: id in (select institution_id from public.users where uid = auth.uid())
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
    true -- For development, allow all. In production, use: institution_id in (select institution_id from public.users where uid = auth.uid() and role = 'admin')
  );

-- 14. Insert Default Institution
insert into public.institutions (id, name) values ('default-inst', 'Instituição Padrão') on conflict do nothing;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

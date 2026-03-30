-- SQL Script for Supabase Setup
-- Standardizing all columns to lowercase without underscores to avoid casing/naming conflicts.

-- 1. Create Institutions Table
create table if not exists public.institutions (
  id text primary key,
  name text not null,
  settings jsonb default '{"data_isolation": true, "auto_anonymization": false}'::jsonb,
  createdat timestamp with time zone default now()
);

-- 2. Create Users Table
create table if not exists public.users (
  uid uuid primary key references auth.users(id),
  email text unique not null,
  displayname text,
  photourl text,
  role text default 'student',
  institutionid text references public.institutions(id) default 'default-inst',
  settings jsonb default '{"email_notifications": true, "deadline_alerts": true}'::jsonb,
  createdat timestamp with time zone default now()
);

-- Robust cleanup for users table
do $$ 
begin 
  -- Ensure target columns exist if table exists
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'displayname') then
      alter table public.users add column displayname text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'photourl') then
      alter table public.users add column photourl text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'institutionid') then
      alter table public.users add column institutionid text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'createdat') then
      alter table public.users add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- Migration and cleanup for displayname
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='display_name') then
    update public.users set displayname = coalesce(displayname, display_name);
    alter table public.users drop column if exists display_name;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='displayName') then
    update public.users set displayname = coalesce(displayname, "displayName");
    alter table public.users drop column if exists "displayName";
  end if;

  -- Migration and cleanup for photourl
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='photo_url') then
    update public.users set photourl = coalesce(photourl, photo_url);
    alter table public.users drop column if exists photo_url;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='photoURL') then
    update public.users set photourl = coalesce(photourl, "photoURL");
    alter table public.users drop column if exists "photoURL";
  end if;

  -- Migration and cleanup for institutionid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='institution_id') then
    update public.users set institutionid = coalesce(institutionid, institution_id);
    alter table public.users drop column if exists institution_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='institutionId') then
    update public.users set institutionid = coalesce(institutionid, "institutionId");
    alter table public.users drop column if exists "institutionId";
  end if;

  -- Migration and cleanup for createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='users' and column_name='created_at') then
    update public.users set createdat = coalesce(createdat, created_at);
    alter table public.users drop column if exists created_at;
  end if;
end $$;

-- 3. Create Fairs Table
create table if not exists public.fairs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'rascunho',
  institutionid text references public.institutions(id) default 'default-inst',
  organizerid uuid references public.users(uid),
  dates jsonb default '{"registration_start": null, "registration_end": null, "evaluation_start": null, "evaluation_end": null, "results_date": null}'::jsonb,
  structure jsonb default '{"categories": [], "modalities": []}'::jsonb,
  rules jsonb default '{"blind_evaluation": false, "min_evaluators_per_project": 3, "tie_breaker_hierarchy": []}'::jsonb,
  createdat timestamp with time zone default now()
);

-- Cleanup for fairs table
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'fairs') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fairs' and column_name = 'institutionid') then
      alter table public.fairs add column institutionid text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fairs' and column_name = 'organizerid') then
      alter table public.fairs add column organizerid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fairs' and column_name = 'createdat') then
      alter table public.fairs add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- institutionid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='institution_id') then
    update public.fairs set institutionid = coalesce(institutionid, institution_id);
    alter table public.fairs drop column institution_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='institutionId') then
    update public.fairs set institutionid = coalesce(institutionid, "institutionId");
    alter table public.fairs drop column "institutionId";
  end if;

  -- organizerid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='organizer_id') then
    update public.fairs set organizerid = coalesce(organizerid, organizer_id::uuid);
    alter table public.fairs drop column organizer_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='organizerId') then
    update public.fairs set organizerid = coalesce(organizerid, "organizerId"::uuid);
    alter table public.fairs drop column "organizerId";
  end if;

  -- createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='fairs' and column_name='created_at') then
    update public.fairs set createdat = coalesce(createdat, created_at);
    alter table public.fairs drop column created_at;
  end if;
end $$;

-- 4. Create Evaluation Criteria Table
create table if not exists public.evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  fairid uuid references public.fairs(id) on delete cascade,
  category text,
  name text not null,
  description text,
  weight numeric default 1.0,
  scaletype text default 'numeric',
  maxscore integer default 10,
  rubrics jsonb default '{}'::jsonb,
  createdat timestamp with time zone default now()
);

-- Cleanup for evaluation_criteria
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'evaluation_criteria') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluation_criteria' and column_name = 'fairid') then
      alter table public.evaluation_criteria add column fairid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluation_criteria' and column_name = 'scaletype') then
      alter table public.evaluation_criteria add column scaletype text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluation_criteria' and column_name = 'maxscore') then
      alter table public.evaluation_criteria add column maxscore integer;
    end if;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='fair_id') then
    update public.evaluation_criteria set fairid = coalesce(fairid, fair_id::uuid);
    alter table public.evaluation_criteria drop column fair_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='fairId') then
    update public.evaluation_criteria set fairid = coalesce(fairid, "fairId"::uuid);
    alter table public.evaluation_criteria drop column "fairId";
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='scale_type') then
    update public.evaluation_criteria set scaletype = coalesce(scaletype, scale_type);
    alter table public.evaluation_criteria drop column scale_type;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluation_criteria' and column_name='max_score') then
    update public.evaluation_criteria set maxscore = coalesce(maxscore, max_score);
    alter table public.evaluation_criteria drop column max_score;
  end if;
end $$;

-- 5. Create Projects Table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  abstract text,
  category text,
  modality text,
  status text default 'pendente',
  fairid uuid references public.fairs(id) on delete cascade,
  institutionid text references public.institutions(id) default 'default-inst',
  creatorid uuid references public.users(uid),
  members jsonb default '[]'::jsonb,
  evidence jsonb default '{"files": [], "links": []}'::jsonb,
  customdata jsonb default '{}'::jsonb,
  currentversion integer default 1,
  createdat timestamp with time zone default now()
);

-- Cleanup for projects table
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'fairid') then
      alter table public.projects add column fairid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'creatorid') then
      alter table public.projects add column creatorid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'institutionid') then
      alter table public.projects add column institutionid text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'customdata') then
      alter table public.projects add column customdata jsonb default '{}'::jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'currentversion') then
      alter table public.projects add column currentversion integer default 1;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'createdat') then
      alter table public.projects add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- Migration and cleanup for fairid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='fair_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.projects where fair_id::uuid not in (select id from public.fairs);
    update public.projects set fairid = coalesce(fairid, fair_id::uuid);
    alter table public.projects drop column if exists fair_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='fairId') then
    -- Delete orphaned records that would violate foreign key
    delete from public.projects where "fairId"::uuid not in (select id from public.fairs);
    update public.projects set fairid = coalesce(fairid, "fairId"::uuid);
    alter table public.projects drop column if exists "fairId";
  end if;

  -- Migration and cleanup for creatorid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='creator_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.projects where creator_id::uuid not in (select uid from public.users);
    update public.projects set creatorid = coalesce(creatorid, creator_id::uuid);
    alter table public.projects drop column if exists creator_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='creatorId') then
    -- Delete orphaned records that would violate foreign key
    delete from public.projects where "creatorId"::uuid not in (select uid from public.users);
    update public.projects set creatorid = coalesce(creatorid, "creatorId"::uuid);
    alter table public.projects drop column if exists "creatorId";
  end if;

  -- Migration and cleanup for institutionid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='institution_id') then
    update public.projects set institutionid = coalesce(institutionid, institution_id);
    alter table public.projects drop column if exists institution_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='institutionId') then
    update public.projects set institutionid = coalesce(institutionid, "institutionId");
    alter table public.projects drop column if exists "institutionId";
  end if;

  -- Migration and cleanup for customdata
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='custom_data') then
    update public.projects set customdata = coalesce(customdata, custom_data);
    alter table public.projects drop column if exists custom_data;
  end if;

  -- Migration and cleanup for currentversion
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='current_version') then
    update public.projects set currentversion = coalesce(currentversion, current_version);
    alter table public.projects drop column if exists current_version;
  end if;

  -- Migration and cleanup for createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='projects' and column_name='created_at') then
    update public.projects set createdat = coalesce(createdat, created_at);
    alter table public.projects drop column if exists created_at;
  end if;
end $$;

-- 6. Create Evaluator Applications Table
create table if not exists public.evaluator_applications (
  id uuid default gen_random_uuid() primary key,
  fairid uuid references public.fairs(id) on delete cascade,
  userid uuid references public.users(uid),
  institutionid text references public.institutions(id) default 'default-inst',
  status text default 'pendente',
  createdat timestamp with time zone default now()
);

-- Cleanup for evaluator_applications
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'evaluator_applications') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluator_applications' and column_name = 'fairid') then
      alter table public.evaluator_applications add column fairid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluator_applications' and column_name = 'userid') then
      alter table public.evaluator_applications add column userid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluator_applications' and column_name = 'institutionid') then
      alter table public.evaluator_applications add column institutionid text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluator_applications' and column_name = 'createdat') then
      alter table public.evaluator_applications add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- fairid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='fair_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.evaluator_applications where fair_id::uuid not in (select id from public.fairs);
    update public.evaluator_applications set fairid = coalesce(fairid, fair_id::uuid);
    alter table public.evaluator_applications drop column fair_id;
  end if;

  -- userid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='user_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.evaluator_applications where user_id::uuid not in (select uid from public.users);
    update public.evaluator_applications set userid = coalesce(userid, user_id::uuid);
    alter table public.evaluator_applications drop column user_id;
  end if;

  -- institutionid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='institution_id') then
    update public.evaluator_applications set institutionid = coalesce(institutionid, institution_id);
    alter table public.evaluator_applications drop column institution_id;
  end if;

  -- createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluator_applications' and column_name='created_at') then
    update public.evaluator_applications set createdat = coalesce(createdat, created_at);
    alter table public.evaluator_applications drop column created_at;
  end if;
end $$;

-- 7. Create Project Versions Table
create table if not exists public.project_versions (
  id uuid default gen_random_uuid() primary key,
  projectid uuid references public.projects(id) on delete cascade,
  versionnumber integer not null,
  data jsonb not null,
  createdby uuid references public.users(uid),
  createdat timestamp with time zone default now()
);

-- Cleanup for project_versions
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'project_versions') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'project_versions' and column_name = 'projectid') then
      alter table public.project_versions add column projectid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'project_versions' and column_name = 'versionnumber') then
      alter table public.project_versions add column versionnumber integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'project_versions' and column_name = 'createdby') then
      alter table public.project_versions add column createdby uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'project_versions' and column_name = 'createdat') then
      alter table public.project_versions add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- projectid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='project_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.project_versions where project_id::uuid not in (select id from public.projects);
    update public.project_versions set projectid = coalesce(projectid, project_id::uuid);
    alter table public.project_versions drop column project_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='projectId') then
    -- Delete orphaned records that would violate foreign key
    delete from public.project_versions where "projectId"::uuid not in (select id from public.projects);
    update public.project_versions set projectid = coalesce(projectid, "projectId"::uuid);
    alter table public.project_versions drop column "projectId";
  end if;

  -- versionnumber
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='version_number') then
    update public.project_versions set versionnumber = coalesce(versionnumber, version_number);
    alter table public.project_versions drop column version_number;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='versionNumber') then
    update public.project_versions set versionnumber = coalesce(versionnumber, "versionNumber");
    alter table public.project_versions drop column "versionNumber";
  end if;

  -- createdby
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='created_by') then
    -- Delete orphaned records that would violate foreign key
    delete from public.project_versions where created_by::uuid not in (select uid from public.users);
    update public.project_versions set createdby = coalesce(createdby, created_by::uuid);
    alter table public.project_versions drop column created_by;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='createdBy') then
    -- Delete orphaned records that would violate foreign key
    delete from public.project_versions where "createdBy"::uuid not in (select uid from public.users);
    update public.project_versions set createdby = coalesce(createdby, "createdBy"::uuid);
    alter table public.project_versions drop column "createdBy";
  end if;

  -- createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='project_versions' and column_name='created_at') then
    update public.project_versions set createdat = coalesce(createdat, created_at);
    alter table public.project_versions drop column created_at;
  end if;
end $$;

-- 8. Create Evaluations Table
create table if not exists public.evaluations (
  id uuid default gen_random_uuid() primary key,
  projectid uuid references public.projects(id) on delete cascade,
  evaluatorid uuid references public.users(uid),
  scores jsonb not null,
  criterionfeedback jsonb default '{}'::jsonb,
  feedback text,
  status text default 'rascunho',
  isconflictdeclared boolean default false,
  createdat timestamp with time zone default now(),
  updatedat timestamp with time zone default now()
);

-- Cleanup for evaluations
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'evaluations') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'projectid') then
      alter table public.evaluations add column projectid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'evaluatorid') then
      alter table public.evaluations add column evaluatorid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'isconflictdeclared') then
      alter table public.evaluations add column isconflictdeclared boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'criterionfeedback') then
      alter table public.evaluations add column criterionfeedback jsonb default '{}'::jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'createdat') then
      alter table public.evaluations add column createdat timestamp with time zone default now();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'evaluations' and column_name = 'updatedat') then
      alter table public.evaluations add column updatedat timestamp with time zone default now();
    end if;
  end if;

  -- projectid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='project_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.evaluations where project_id::uuid not in (select id from public.projects);
    update public.evaluations set projectid = coalesce(projectid, project_id::uuid);
    alter table public.evaluations drop column project_id;
  end if;

  -- evaluatorid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='evaluator_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.evaluations where evaluator_id::uuid not in (select uid from public.users);
    update public.evaluations set evaluatorid = coalesce(evaluatorid, evaluator_id::uuid);
    alter table public.evaluations drop column evaluator_id;
  end if;

  -- isconflictdeclared
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='is_conflict_declared') then
    update public.evaluations set isconflictdeclared = coalesce(isconflictdeclared, is_conflict_declared);
    alter table public.evaluations drop column is_conflict_declared;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='isConflictDeclared') then
    update public.evaluations set isconflictdeclared = coalesce(isconflictdeclared, "isConflictDeclared");
    alter table public.evaluations drop column "isConflictDeclared";
  end if;

  -- criterionfeedback
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='criterion_feedback') then
    update public.evaluations set criterionfeedback = coalesce(criterionfeedback, criterion_feedback);
    alter table public.evaluations drop column criterion_feedback;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='criterionFeedback') then
    update public.evaluations set criterionfeedback = coalesce(criterionfeedback, "criterionFeedback");
    alter table public.evaluations drop column "criterionFeedback";
  end if;

  -- createdat/updatedat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='created_at') then
    update public.evaluations set createdat = coalesce(createdat, created_at);
    alter table public.evaluations drop column created_at;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='evaluations' and column_name='updated_at') then
    update public.evaluations set updatedat = coalesce(updatedat, updated_at);
    alter table public.evaluations drop column updated_at;
  end if;
end $$;

-- 9. Create Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  userid uuid references auth.users(id),
  action text not null,
  targettable text,
  targetid uuid,
  olddata jsonb,
  newdata jsonb,
  institutionid text references public.institutions(id),
  createdat timestamp with time zone default now()
);

-- Cleanup for audit_logs
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audit_logs') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'userid') then
      alter table public.audit_logs add column userid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'targettable') then
      alter table public.audit_logs add column targettable text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'targetid') then
      alter table public.audit_logs add column targetid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'olddata') then
      alter table public.audit_logs add column olddata jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'newdata') then
      alter table public.audit_logs add column newdata jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'institutionid') then
      alter table public.audit_logs add column institutionid text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'createdat') then
      alter table public.audit_logs add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- userid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='user_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.audit_logs where user_id::uuid not in (select id from auth.users);
    update public.audit_logs set userid = coalesce(userid, user_id::uuid);
    alter table public.audit_logs drop column user_id;
  end if;

  -- targettable
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='target_table') then
    update public.audit_logs set targettable = coalesce(targettable, target_table);
    alter table public.audit_logs drop column target_table;
  end if;

  -- targetid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='target_id') then
    update public.audit_logs set targetid = coalesce(targetid, target_id::uuid);
    alter table public.audit_logs drop column target_id;
  end if;

  -- olddata
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='old_data') then
    update public.audit_logs set olddata = coalesce(olddata, old_data);
    alter table public.audit_logs drop column old_data;
  end if;

  -- newdata
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='new_data') then
    update public.audit_logs set newdata = coalesce(newdata, new_data);
    alter table public.audit_logs drop column new_data;
  end if;

  -- institutionid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='institution_id') then
    update public.audit_logs set institutionid = coalesce(institutionid, institution_id);
    alter table public.audit_logs drop column institution_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='institutionId') then
    update public.audit_logs set institutionid = coalesce(institutionid, "institutionId");
    alter table public.audit_logs drop column "institutionId";
  end if;

  -- createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='audit_logs' and column_name='timestamp') then
    update public.audit_logs set createdat = coalesce(createdat, "timestamp");
    alter table public.audit_logs drop column "timestamp";
  end if;
end $$;

-- 10. Create Certificates Table
create table if not exists public.certificates (
  id uuid default gen_random_uuid() primary key,
  userid uuid references public.users(uid),
  fairid uuid references public.fairs(id),
  type text,
  hash text unique not null,
  data jsonb,
  createdat timestamp with time zone default now()
);

-- Cleanup for certificates
do $$ 
begin 
  -- Ensure target columns exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'certificates') then
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'certificates' and column_name = 'userid') then
      alter table public.certificates add column userid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'certificates' and column_name = 'fairid') then
      alter table public.certificates add column fairid uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'certificates' and column_name = 'createdat') then
      alter table public.certificates add column createdat timestamp with time zone default now();
    end if;
  end if;

  -- userid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='user_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.certificates where user_id::uuid not in (select uid from public.users);
    update public.certificates set userid = coalesce(userid, user_id::uuid);
    alter table public.certificates drop column user_id;
  end if;

  -- fairid
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='fair_id') then
    -- Delete orphaned records that would violate foreign key
    delete from public.certificates where fair_id::uuid not in (select id from public.fairs);
    update public.certificates set fairid = coalesce(fairid, fair_id::uuid);
    alter table public.certificates drop column fair_id;
  end if;

  -- createdat
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name='certificates' and column_name='issued_at') then
    update public.certificates set createdat = coalesce(createdat, issued_at);
    alter table public.certificates drop column issued_at;
  end if;
end $$;

-- RLS Enable
alter table public.institutions enable row level security;
alter table public.users enable row level security;
alter table public.fairs enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.certificates enable row level security;
alter table public.evaluator_applications enable row level security;
alter table public.evaluation_criteria enable row level security;

-- Drop existing policies to avoid conflicts
do $$ 
declare 
    pol record;
begin
    for pol in (select policyname, tablename from pg_policies where schemaname = 'public') loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end $$;

-- Create permissive development policies
create policy "Users development policy" on public.users for all using (true) with check (true);
create policy "Institutions development policy" on public.institutions for all using (true) with check (true);
create policy "Fairs development policy" on public.fairs for all using (true) with check (true);
create policy "Projects development policy" on public.projects for all using (true) with check (true);

create policy "Advisors can view projects they advise"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_advisors pa 
      where pa.projectid = id and pa.advisor_userid = auth.uid() and pa.status = 'confirmed'
    )
  );
create policy "Evaluations development policy" on public.evaluations for all using (true) with check (true);
create policy "Audit logs development policy" on public.audit_logs for all using (true) with check (true);
create policy "Evaluator applications development policy" on public.evaluator_applications for all using (true) with check (true);
create policy "Project versions development policy" on public.project_versions for all using (true) with check (true);
create policy "Evaluation criteria development policy" on public.evaluation_criteria for all using (true) with check (true);
create policy "Certificates development policy" on public.certificates for all using (true) with check (true);

-- Audit Trigger Function
create or replace function public.handle_audit_log()
returns trigger as $$
declare
  v_user_id uuid;
  v_institution_id text;
  v_action text;
begin
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  if TG_TABLE_NAME = 'users' then
    v_institution_id := coalesce(new.institutionid, old.institutionid);
  elsif TG_TABLE_NAME = 'fairs' then
    v_institution_id := coalesce(new.institutionid, old.institutionid);
  elsif TG_TABLE_NAME = 'projects' then
    v_institution_id := coalesce(new.institutionid, old.institutionid);
  elsif TG_TABLE_NAME = 'evaluator_applications' then
    v_institution_id := coalesce(new.institutionid, old.institutionid);
  end if;

  v_action := TG_OP || '_' || upper(TG_TABLE_NAME);

  insert into public.audit_logs (
    userid,
    action,
    targettable,
    targetid,
    olddata,
    newdata,
    institutionid
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
create trigger on_fairs_audit after insert or update or delete on public.fairs for each row execute function public.handle_audit_log();

drop trigger if exists on_projects_audit on public.projects;
create trigger on_projects_audit after insert or update or delete on public.projects for each row execute function public.handle_audit_log();

drop trigger if exists on_evaluations_audit on public.evaluations;
create trigger on_evaluations_audit after insert or update or delete on public.evaluations for each row execute function public.handle_audit_log();

drop trigger if exists on_evaluator_applications_audit on public.evaluator_applications;
create trigger on_evaluator_applications_audit after insert or update or delete on public.evaluator_applications for each row execute function public.handle_audit_log();

-- Atomic Project Creation RPC
create or replace function public.create_project_with_version(
  p_title text,
  p_abstract text,
  p_category text,
  p_modality text,
  p_fairid uuid,
  p_institutionid text,
  p_creatorid uuid,
  p_members jsonb,
  p_evidence jsonb,
  p_customdata jsonb
)
returns jsonb as $$
declare
  v_project_record record;
begin
  insert into public.projects (
    title, abstract, category, modality, fairid, institutionid, creatorid, members, evidence, customdata, status
  ) values (
    p_title, p_abstract, p_category, p_modality, p_fairid, p_institutionid, p_creatorid, p_members, p_evidence, p_customdata, 'submetido'
  ) returning * into v_project_record;

  insert into public.project_versions (
    projectid, versionnumber, data, createdby
  ) values (
    v_project_record.id, 1, to_jsonb(v_project_record), p_creatorid
  );

  return to_jsonb(v_project_record);
exception when others then
  raise exception 'Failed to create project with version: %', SQLERRM;
end;
$$ language plpgsql security definer;

-- Default Institution
insert into public.institutions (id, name) values ('default-inst', 'Instituição Padrão') on conflict do nothing;

-- 11. Create Fair Participants Table
create table if not exists public.fair_participants (
  id uuid default gen_random_uuid() primary key,
  fairid uuid references public.fairs(id) on delete cascade,
  userid uuid references public.users(uid) on delete cascade,
  role text not null check (role in ('advisor', 'participant')),
  createdat timestamp with time zone default now(),
  unique(fairid, userid)
);

-- 12. Create Project Advisors Table
create table if not exists public.project_advisors (
  id uuid default gen_random_uuid() primary key,
  projectid uuid references public.projects(id) on delete cascade,
  advisor_email text not null,
  advisor_userid uuid references public.users(uid) on delete set null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  createdat timestamp with time zone default now(),
  unique(projectid, advisor_email)
);

-- Enable RLS for new tables
alter table public.fair_participants enable row level security;
alter table public.project_advisors enable row level security;

-- RLS Policies for fair_participants
create policy "Users can view their own fair participation"
  on public.fair_participants for select
  using (auth.uid() = userid);

create policy "Users can join fairs"
  on public.fair_participants for insert
  with check (auth.uid() = userid);

-- RLS Policies for project_advisors
create policy "Advisors can view their linked projects"
  on public.project_advisors for select
  using (
    auth.uid() = advisor_userid or 
    exists (
      select 1 from public.projects p 
      where p.id = projectid and p.creatorid = auth.uid()
    )
  );

create policy "Project creators can add advisors"
  on public.project_advisors for insert
  with check (
    exists (
      select 1 from public.projects p 
      where p.id = projectid and p.creatorid = auth.uid()
    )
  );

create policy "Advisors can update their status"
  on public.project_advisors for update
  using (auth.uid() = advisor_userid)
  with check (auth.uid() = advisor_userid);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

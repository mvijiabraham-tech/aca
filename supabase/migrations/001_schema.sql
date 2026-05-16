-- ACA Supabase Schema
-- Run this in the Supabase SQL editor or via supabase db push

-- ============================================================================
-- PROFILES (auto-created on signup)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  organisation text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================================
-- ENGAGEMENTS (root entity, JSONB for embedded config)
-- ============================================================================

create table engagements (
  id text primary key,
  status text not null default 'draft'
    check (status in ('draft', 'live', 'complete')),
  basics jsonb not null,
  setup_steps jsonb not null,
  competencies jsonb not null default '[]',
  proficiency_targets jsonb not null default '[]',
  aggregation jsonb not null,
  report_format jsonb not null,
  calibrate_state jsonb not null default '{"stage":"not_started","moderatedScores":[],"oars":[]}',
  report_state jsonb not null default '{"sections":[],"feedbackSessions":[]}',
  schedule jsonb not null default '[]',
  created_at timestamptz default now(),
  locked_at timestamptz,
  completed_at timestamptz
);


-- ============================================================================
-- ENGAGEMENT TOOLS (queried independently for scoring)
-- ============================================================================

create table engagement_tools (
  id text not null,
  engagement_id text not null references engagements(id) on delete cascade,
  name text not null,
  tool_type_key text not null,
  competency_ids jsonb not null default '[]',
  duration_minutes int not null default 60,
  format text not null,
  notes text,
  primary key (engagement_id, id)
);


-- ============================================================================
-- ASSESSORS (links to auth via profile_id)
-- ============================================================================

create table assessors (
  id text not null,
  engagement_id text not null references engagements(id) on delete cascade,
  profile_id uuid references profiles(id),
  name text not null,
  email text not null,
  role text not null check (role in ('lead', 'assessor', 'observer')),
  organisation text,
  calibrated boolean not null default false,
  assigned_tool_ids jsonb not null default '[]',
  notes text,
  primary key (engagement_id, id)
);

create index idx_assessors_profile
  on assessors(profile_id) where profile_id is not null;


-- ============================================================================
-- PARTICIPANTS
-- ============================================================================

create table participants (
  id text not null,
  engagement_id text not null references engagements(id) on delete cascade,
  name text not null,
  employee_id text,
  "current_role" text not null,
  business_unit text,
  "location" text,
  email text,
  years_in_role int,
  tool_ids jsonb not null default '[]',
  notes text,
  primary key (engagement_id, id)
);


-- ============================================================================
-- SCORES (per observer per participant per tool)
-- ============================================================================

create table scores (
  id text primary key,
  engagement_id text not null references engagements(id) on delete cascade,
  participant_id text not null,
  tool_id text not null,
  observer_id text not null,
  competencies jsonb not null default '[]',
  started_at timestamptz,
  last_saved_at timestamptz,
  completed_at timestamptz
);

create index idx_scores_engagement on scores(engagement_id);
create index idx_scores_observer on scores(engagement_id, observer_id);


-- ============================================================================
-- REPORT SECTIONS
-- ============================================================================

create table report_sections (
  engagement_id text not null references engagements(id) on delete cascade,
  participant_id text not null,
  section_key text not null,
  status text not null default 'not_started',
  content text not null default '',
  drafted_from_prompt text,
  last_edited_at timestamptz,
  signed_off_by text,
  signed_off_at timestamptz,
  primary key (engagement_id, participant_id, section_key)
);


-- ============================================================================
-- FEEDBACK SESSIONS
-- ============================================================================

create table feedback_sessions (
  engagement_id text not null references engagements(id) on delete cascade,
  participant_id text not null,
  status text not null default 'not_started',
  scheduled_at timestamptz,
  conducted_at timestamptz,
  conducted_by text,
  prep_notes text,
  session_notes text,
  idp_commitments jsonb not null default '[]',
  handoff_sent_at timestamptz,
  primary key (engagement_id, participant_id)
);


-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

create or replace function user_is_assessor_on(eng_id text)
returns boolean as $$
  select exists (
    select 1 from assessors
    where engagement_id = eng_id and profile_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function user_is_lead_on(eng_id text)
returns boolean as $$
  select exists (
    select 1 from assessors
    where engagement_id = eng_id
      and profile_id = auth.uid()
      and role = 'lead'
  );
$$ language sql security definer stable;

create or replace function user_assessor_id_on(eng_id text)
returns text as $$
  select id from assessors
  where engagement_id = eng_id and profile_id = auth.uid()
  limit 1;
$$ language sql security definer stable;


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Engagements: read if assessor, write if lead
alter table engagements enable row level security;

create policy "Assessors can read engagements"
  on engagements for select
  using (user_is_assessor_on(id));

create policy "Anyone can insert engagements"
  on engagements for insert
  with check (true);

create policy "Leads can update engagements"
  on engagements for update
  using (user_is_lead_on(id));

-- Tools: read if assessor, write if lead
alter table engagement_tools enable row level security;

create policy "Assessors can read tools"
  on engagement_tools for select
  using (user_is_assessor_on(engagement_id));

create policy "Leads can manage tools"
  on engagement_tools for insert
  with check (user_is_lead_on(engagement_id));

create policy "Leads can update tools"
  on engagement_tools for update
  using (user_is_lead_on(engagement_id));

create policy "Leads can delete tools"
  on engagement_tools for delete
  using (user_is_lead_on(engagement_id));

-- Assessors: read if assessor, write if lead
alter table assessors enable row level security;

create policy "Assessors can read assessors"
  on assessors for select
  using (user_is_assessor_on(engagement_id));

create policy "Leads can manage assessors"
  on assessors for insert
  with check (user_is_lead_on(engagement_id));

create policy "Leads can update assessors"
  on assessors for update
  using (user_is_lead_on(engagement_id));

create policy "Leads can delete assessors"
  on assessors for delete
  using (user_is_lead_on(engagement_id));

-- Participants: read if assessor, write if lead
alter table participants enable row level security;

create policy "Assessors can read participants"
  on participants for select
  using (user_is_assessor_on(engagement_id));

create policy "Leads can manage participants"
  on participants for insert
  with check (user_is_lead_on(engagement_id));

create policy "Leads can update participants"
  on participants for update
  using (user_is_lead_on(engagement_id));

create policy "Leads can delete participants"
  on participants for delete
  using (user_is_lead_on(engagement_id));

-- Scores: read if assessor, write only own scores
alter table scores enable row level security;

create policy "Assessors can read scores"
  on scores for select
  using (user_is_assessor_on(engagement_id));

create policy "Observers can insert own scores"
  on scores for insert
  with check (observer_id = user_assessor_id_on(engagement_id));

create policy "Observers can update own scores"
  on scores for update
  using (observer_id = user_assessor_id_on(engagement_id));

-- Report sections: read if assessor, write if lead
alter table report_sections enable row level security;

create policy "Assessors can read report sections"
  on report_sections for select
  using (user_is_assessor_on(engagement_id));

create policy "Leads can manage report sections"
  on report_sections for insert
  with check (user_is_lead_on(engagement_id));

create policy "Leads can update report sections"
  on report_sections for update
  using (user_is_lead_on(engagement_id));

create policy "Leads can delete report sections"
  on report_sections for delete
  using (user_is_lead_on(engagement_id));

-- Feedback sessions: read if assessor, write if lead
alter table feedback_sessions enable row level security;

create policy "Assessors can read feedback sessions"
  on feedback_sessions for select
  using (user_is_assessor_on(engagement_id));

create policy "Leads can manage feedback sessions"
  on feedback_sessions for insert
  with check (user_is_lead_on(engagement_id));

create policy "Leads can update feedback sessions"
  on feedback_sessions for update
  using (user_is_lead_on(engagement_id));

create policy "Leads can delete feedback sessions"
  on feedback_sessions for delete
  using (user_is_lead_on(engagement_id));

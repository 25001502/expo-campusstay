-- H1.5B1 LOCAL ONLY. Apply after H1.3 only with separate target/deployment approval.
-- No users, reviewer grants, service activation or managed Auth schema changes.
begin;

-- Fail transactionally if the target does not provide the verified Supabase session model.
do $$ begin
  if to_regprocedure('auth.jwt()') is null or
     (select count(*) from information_schema.columns where table_schema='auth' and table_name='sessions'
       and column_name in ('id','user_id','aal','not_after')) <> 4 then
    raise exception 'Compatible Supabase Auth session catalog required' using errcode='55000';
  end if;
end $$;

create table campusstay_private.access_management_assignments (
  user_id uuid primary key references auth.users(id), active boolean not null default true,
  assigned_by uuid references auth.users(id), assigned_at timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) between 5 and 1000)
);
alter table public.manager_authorizations add column version integer not null default 1 check(version>=1);

create table campusstay_private.manager_review_decisions (
  request_id uuid primary key, application_id uuid not null references public.manager_verification_applications(id),
  reviewer_id uuid not null references auth.users(id), session_id uuid not null,
  submitted_revision integer not null check(submitted_revision>=0), resulting_revision integer not null,
  proof_document_id uuid not null, decision text not null check(decision in ('approved','needs_information','rejected')),
  reason text not null, checklist jsonb not null, command jsonb not null, result jsonb not null,
  occurred_at timestamptz not null default now(),
  unique(application_id,submitted_revision), check(resulting_revision=submitted_revision+1),
  foreign key(proof_document_id,application_id) references public.manager_verification_documents(id,application_id)
);
create index manager_review_actor on campusstay_private.manager_review_decisions(reviewer_id,occurred_at);
create table campusstay_private.manager_access_decisions (
  request_id uuid primary key, user_id uuid not null references auth.users(id),
  actor_id uuid not null references auth.users(id), session_id uuid not null,
  previous_version integer not null, resulting_version integer not null, command jsonb not null, result jsonb not null,
  occurred_at timestamptz not null default now(), unique(user_id,previous_version), check(resulting_version=previous_version+1)
);
create index manager_access_actor on campusstay_private.manager_access_decisions(actor_id,occurred_at);
create table campusstay_private.manager_review_notes (
  application_id uuid not null references public.manager_verification_applications(id),
  note_revision integer not null check(note_revision>=1), application_revision integer not null check(application_revision>=0),
  author_id uuid not null references auth.users(id), session_id uuid not null,
  note text not null check(length(note)<=4000), created_at timestamptz not null default now(),
  primary key(application_id,note_revision)
);
create index manager_notes_author on campusstay_private.manager_review_notes(author_id);
create table campusstay_private.manager_security_events (
  id bigint generated always as identity primary key, application_id uuid references public.manager_verification_applications(id),
  actor_id uuid references auth.users(id), operator_name text not null, target_id uuid not null,
  action text not null check(action in ('review_decided','authorization_changed','note_written','reviewer_assignment_changed','access_assignment_changed')),
  request_id uuid, occurred_at timestamptz not null default now(), details jsonb not null
);
create index manager_security_case on campusstay_private.manager_security_events(application_id,occurred_at,id);
create index manager_security_actor on campusstay_private.manager_security_events(actor_id,occurred_at);
create index manager_security_target on campusstay_private.manager_security_events(target_id,occurred_at);

alter table campusstay_private.access_management_assignments enable row level security;
alter table campusstay_private.manager_review_decisions enable row level security;
alter table campusstay_private.manager_access_decisions enable row level security;
alter table campusstay_private.manager_review_notes enable row level security;
alter table campusstay_private.manager_security_events enable row level security;
revoke all on campusstay_private.access_management_assignments,campusstay_private.manager_review_decisions,
  campusstay_private.manager_access_decisions,campusstay_private.manager_review_notes,campusstay_private.manager_security_events from public,anon,authenticated,service_role;
revoke all on sequence campusstay_private.manager_security_events_id_seq from public,anon,authenticated,service_role;

-- Claims are trusted ONLY after gateway JWT verification. No request/metadata MFA flags.
-- Missing/deleted/downgraded/expired sessions fail closed; no FK blocks Auth sign-out deletion.
create function campusstay_private.privileged_session() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare c jsonb := auth.jwt(); sid uuid; actor uuid := auth.uid();
begin
  if actor is null or c->>'sub' is distinct from actor::text or c->>'role' is distinct from 'authenticated'
    or c->>'aal' is distinct from 'aal2' or jsonb_typeof(c->'exp') is distinct from 'number'
    or coalesce(c->>'exp','') !~ '^[0-9]{1,12}$'
    or coalesce(c->>'session_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  if (c->>'exp')::numeric <= extract(epoch from statement_timestamp()) then return null; end if;
  sid := (c->>'session_id')::uuid;
  if not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=actor and u.email_confirmed_at is not null and s.id=sid and s.aal::text='aal2'
      and (s.not_after is null or s.not_after>statement_timestamp())) then return null; end if;
  return sid;
end $$;
create or replace function campusstay_private.is_reviewer() returns boolean
language sql stable security definer set search_path='' as $$
  select campusstay_private.privileged_session() is not null and exists(
    select 1 from campusstay_private.reviewer_assignments r where r.user_id=auth.uid() and r.active)
$$;
-- Mutation admission locks the same assignment/session rows that revocation/deletion changes.
create function campusstay_private.require_reviewer(manage_access boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid := campusstay_private.actor(); sid uuid := campusstay_private.privileged_session();
begin
  if sid is null then raise exception 'Privileged session required' using errcode='42501'; end if;
  perform 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null for share;
  if not found then raise exception 'Verified identity required' using errcode='42501'; end if;
  perform 1 from auth.sessions s where s.id=sid and s.user_id=actor and s.aal::text='aal2'
    and (s.not_after is null or s.not_after>statement_timestamp()) for share;
  if not found then raise exception 'Privileged session required' using errcode='42501'; end if;
  perform 1 from campusstay_private.reviewer_assignments r where r.user_id=actor and r.active for share;
  if not found or not campusstay_private.is_reviewer() then raise exception 'Reviewer required' using errcode='42501'; end if;
  if manage_access then
    perform 1 from campusstay_private.access_management_assignments r where r.user_id=actor and r.active for share;
    if not found then raise exception 'Access-management scope required' using errcode='42501'; end if;
  end if;
  return actor;
end $$;
create function campusstay_private.review_reason(input text) returns text
language plpgsql immutable set search_path='' as $$
declare r text := btrim(input); words integer;
begin
  -- Versioned backend policy: 20..2000 Unicode code points, >=3 distinct meaningful words.
  if r is null or length(r) not between 20 and 2000 then raise exception 'Meaningful review reason required' using errcode='22023'; end if;
  select count(distinct word) into words from regexp_split_to_table(lower(normalize(r,NFKC)),'[^[:alnum:]]+') word
    where length(word)>1 and word !~ E'^(.)\\1+$'
      and word not in ('good','okay','ok','yes','approved','approve','rejected','reject','test','testing','placeholder');
  if words<3 then raise exception 'Meaningful review reason required' using errcode='22023'; end if;
  return r;
end $$;
create function campusstay_private.prevent_security_history_change() returns trigger
language plpgsql set search_path='' as $$ begin
  raise exception 'Append-only security history' using errcode='42501';
end $$;
create trigger manager_review_immutable before update or delete on campusstay_private.manager_review_decisions
  for each row execute function campusstay_private.prevent_security_history_change();
create trigger manager_access_immutable before update or delete on campusstay_private.manager_access_decisions
  for each row execute function campusstay_private.prevent_security_history_change();
create trigger manager_note_immutable before update or delete on campusstay_private.manager_review_notes
  for each row execute function campusstay_private.prevent_security_history_change();
create trigger manager_security_event_immutable before update or delete on campusstay_private.manager_security_events
  for each row execute function campusstay_private.prevent_security_history_change();

create function campusstay_private.audit_manager_authority() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb := case when tg_op='INSERT' then null else to_jsonb(old) end;
  following jsonb := case when tg_op='DELETE' then null else to_jsonb(new) end; target uuid;
begin
  target := coalesce((following->>'user_id')::uuid,(previous->>'user_id')::uuid);
  insert into campusstay_private.manager_security_events(application_id,actor_id,operator_name,target_id,action,details)
  values(case when tg_table_name='manager_authorizations' then coalesce((following->>'application_id')::uuid,(previous->>'application_id')::uuid) else null end,
    auth.uid(),session_user,target,case tg_table_name when 'reviewer_assignments' then 'reviewer_assignment_changed'
      when 'access_management_assignments' then 'access_assignment_changed' else 'authorization_changed' end,
    jsonb_build_object('operation',tg_op,'previous_state',previous->'state','state',following->'state',
      'previous_active',previous->'active','active',following->'active','previous_version',previous->'version','version',following->'version',
      'reason',coalesce(following->'reason',previous->'reason'),'assigned_by',coalesce(following->'assigned_by',previous->'assigned_by'),
      'granted_by',coalesce(following->'granted_by',previous->'granted_by')));
  return null;
end $$;
create trigger manager_reviewer_assignment_audit after insert or update or delete on campusstay_private.reviewer_assignments
  for each row execute function campusstay_private.audit_manager_authority();
create trigger manager_access_assignment_audit after insert or update or delete on campusstay_private.access_management_assignments
  for each row execute function campusstay_private.audit_manager_authority();
create trigger manager_authorization_audit after insert or update or delete on public.manager_authorizations
  for each row execute function campusstay_private.audit_manager_authority();
create function campusstay_private.advance_authorization_version() returns trigger
language plpgsql set search_path='' as $$ begin
  if new.version=old.version then new.version:=old.version+1;
  elsif new.version<>old.version+1 then raise exception 'Invalid authorization version' using errcode='40001'; end if;
  return new;
end $$;
create trigger manager_authorization_version before update on public.manager_authorizations
  for each row execute function campusstay_private.advance_authorization_version();

-- Remove all legacy transitions, including service-key invocation. No unchecked delegate remains.
create or replace function public.cs_manager_review(p_application uuid,p_revision integer,p_decision text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  raise exception 'Versioned review required' using errcode='42501';
end $$;
create or replace function public.cs_manager_set_authorization(p_user uuid,p_state text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
  raise exception 'Versioned access operation required' using errcode='42501';
end $$;
revoke all on function public.cs_manager_review(uuid,integer,text,text),public.cs_manager_set_authorization(uuid,text,text) from public,anon,authenticated,service_role;

create function public.cs_manager_review_v2(p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := campusstay_private.require_reviewer(); c jsonb := p_command; a public.manager_verification_applications;
  d campusstay_private.manager_review_decisions; target uuid; request uuid; expected integer; decision text; reason text; checks jsonb; result jsonb;
begin
  perform campusstay_private.require_ready();
  if c is null or jsonb_typeof(c)<>'object' or not c ?& array['contract','version','request_id','application_id','expected_revision','decision','applicant_reason','checklist']
    or c - array['contract','version','request_id','application_id','expected_revision','decision','applicant_reason','checklist'] <> '{}'::jsonb
    or c->>'contract' is distinct from 'manager-review' or c->'version' is distinct from '2'::jsonb
    or jsonb_typeof(c->'request_id') is distinct from 'string' or jsonb_typeof(c->'application_id') is distinct from 'string'
    or jsonb_typeof(c->'expected_revision') is distinct from 'number' or c->>'expected_revision' !~ '^[0-9]{1,10}$'
    or jsonb_typeof(c->'decision') is distinct from 'string' or jsonb_typeof(c->'applicant_reason') is distinct from 'string' then
    raise exception 'Invalid review command' using errcode='22023'; end if;
  target := (c->>'application_id')::uuid; request := (c->>'request_id')::uuid; expected := (c->>'expected_revision')::integer;
  decision := c->>'decision'; reason := campusstay_private.review_reason(c->>'applicant_reason'); checks := c->'checklist';
  if decision not in ('approved','needs_information','rejected') or jsonb_typeof(checks) is distinct from 'object'
    or not checks ?& array['schema_version','applicant','business','authority']
    or checks-array['schema_version','applicant','business','authority'] <> '{}'::jsonb or checks->'schema_version' is distinct from '1'::jsonb
    or jsonb_typeof(checks->'applicant') is distinct from 'boolean' or jsonb_typeof(checks->'business') is distinct from 'boolean'
    or jsonb_typeof(checks->'authority') is distinct from 'boolean' then raise exception 'Invalid review attestations' using errcode='22023'; end if;
  if decision='approved' and checks<> '{"schema_version":1,"applicant":true,"business":true,"authority":true}'::jsonb then
    raise exception 'Approval attestations required' using errcode='22023'; end if;
  -- These are attestations by the admitted reviewer, never proof of document authenticity.
  select * into a from public.manager_verification_applications where id=target for update;
  if a.id is null or a.applicant_id=actor then raise exception 'Not reviewable' using errcode='42501'; end if;
  select * into d from campusstay_private.manager_review_decisions where request_id=request;
  if found then
    if d.reviewer_id<>actor or d.application_id<>target or d.command<>c then raise exception 'Request conflict' using errcode='40001'; end if;
    return d.result; -- Recorded response only. Never repeats grants, even if access was later revoked.
  end if;
  if a.status<>'pending' then raise exception 'Not reviewable' using errcode='42501'; end if;
  if a.revision<>expected or expected=2147483647 then raise exception 'Application changed' using errcode='40001'; end if;
  if a.proof_document_id is null or not exists(select 1 from public.manager_verification_documents where id=a.proof_document_id and application_id=a.id and status='ready') then
    raise exception 'Submitted proof required' using errcode='22023'; end if;
  update public.manager_verification_applications set status=decision,reviewer_id=actor,review_reason=reason,
    reviewed_at=now(),updated_at=now(),revision=revision+1 where id=a.id returning * into a;
  if decision='approved' then
    insert into public.manager_authorizations(user_id,application_id,state,granted_by,reason) values(a.applicant_id,a.id,'active',actor,reason);
  end if;
  insert into public.manager_verification_events(application_id,actor_id,action,reason,revision) values(a.id,actor,decision,reason,a.revision);
  result := jsonb_build_object('version',2,'request_id',request,'application',campusstay_private.application_json(a));
  insert into campusstay_private.manager_review_decisions(request_id,application_id,reviewer_id,session_id,submitted_revision,resulting_revision,proof_document_id,decision,reason,checklist,command,result)
    values(request,a.id,actor,campusstay_private.privileged_session(),expected,a.revision,a.proof_document_id,decision,reason,checks,c,result);
  insert into campusstay_private.manager_security_events(application_id,actor_id,operator_name,target_id,action,request_id,details)
    values(a.id,actor,session_user,a.id,'review_decided',request,jsonb_build_object('decision',decision,'reason',reason,'submitted_revision',expected,
      'resulting_revision',a.revision,'proof_document_id',a.proof_document_id,'checklist',checks));
  return result;
end $$;

create function public.cs_manager_set_authorization_v2(p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := campusstay_private.require_reviewer(true); c jsonb := p_command; target uuid; request uuid;
  expected integer; desired text; reason_text text; a public.manager_verification_applications; permission public.manager_authorizations;
  previous campusstay_private.manager_access_decisions; result jsonb;
begin
  if c is null or jsonb_typeof(c)<>'object' or not c ?& array['version','request_id','user_id','expected_version','state','reason']
    or c-array['version','request_id','user_id','expected_version','state','reason']<>'{}'::jsonb or c->'version' is distinct from '2'::jsonb
    or jsonb_typeof(c->'request_id') is distinct from 'string' or jsonb_typeof(c->'user_id') is distinct from 'string'
    or jsonb_typeof(c->'expected_version') is distinct from 'number' or c->>'expected_version' !~ '^[0-9]{1,10}$'
    or jsonb_typeof(c->'state') is distinct from 'string' or jsonb_typeof(c->'reason') is distinct from 'string' then
    raise exception 'Invalid access command' using errcode='22023'; end if;
  target := (c->>'user_id')::uuid; request := (c->>'request_id')::uuid; expected := (c->>'expected_version')::integer;
  desired := c->>'state'; reason_text := campusstay_private.review_reason(c->>'reason');
  if expected<1 or desired not in ('active','suspended','revoked') then raise exception 'Invalid access command' using errcode='22023'; end if;
  if target=actor then raise exception 'Access change denied' using errcode='42501'; end if;
  if desired='active' then perform campusstay_private.require_ready(); end if;
  select * into a from public.manager_verification_applications where applicant_id=target and status='approved' for update;
  if a.id is null then raise exception 'No approved assignment' using errcode='42501'; end if;
  select * into permission from public.manager_authorizations where user_id=target and application_id=a.id for update;
  if permission.user_id is null then raise exception 'No approved assignment' using errcode='42501'; end if;
  select * into previous from campusstay_private.manager_access_decisions where request_id=request;
  if found then
    if previous.actor_id<>actor or previous.command<>c then raise exception 'Request conflict' using errcode='40001'; end if;
    return previous.result;
  end if;
  if permission.version<>expected or expected=2147483647 then raise exception 'Access changed' using errcode='40001'; end if;
  update public.manager_authorizations set state=desired,reason=reason_text,updated_at=now(),version=version+1 where user_id=target returning * into permission;
  insert into public.manager_verification_events(application_id,actor_id,action,reason,revision) values(a.id,actor,desired,reason_text,a.revision);
  result := jsonb_build_object('version',2,'request_id',request,'user_id',target,'state',desired,'authorization_version',permission.version);
  insert into campusstay_private.manager_access_decisions(request_id,user_id,actor_id,session_id,previous_version,resulting_version,command,result)
    values(request,target,actor,campusstay_private.privileged_session(),expected,permission.version,c,result);
  return result;
end $$;

create function public.cs_manager_note_write(p_application uuid,p_application_revision integer,p_note_revision integer,p_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := campusstay_private.require_reviewer(); a public.manager_verification_applications; latest integer;
begin
  perform campusstay_private.require_ready();
  if p_note is null or length(p_note)>4000 then raise exception 'Invalid private note' using errcode='22023'; end if;
  select * into a from public.manager_verification_applications where id=p_application and submitted_at is not null for update;
  if a.id is null or a.applicant_id=actor then raise exception 'Case unavailable' using errcode='42501'; end if;
  select coalesce(max(note_revision),0) into latest from campusstay_private.manager_review_notes where application_id=a.id;
  if p_application_revision is distinct from a.revision or p_note_revision is distinct from latest or latest=2147483647 then
    raise exception 'Private note changed' using errcode='40001'; end if;
  insert into campusstay_private.manager_review_notes(application_id,note_revision,application_revision,author_id,session_id,note)
    values(a.id,latest+1,a.revision,actor,campusstay_private.privileged_session(),p_note);
  insert into campusstay_private.manager_security_events(application_id,actor_id,operator_name,target_id,action,details)
    values(a.id,actor,session_user,a.id,'note_written',jsonb_build_object('note_revision',latest+1,'application_revision',a.revision));
  return jsonb_build_object('version',1,'application_id',a.id,'note_revision',latest+1,'application_revision',a.revision);
end $$;
create function public.cs_manager_notes(p_application uuid,p_before_revision integer default null,p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := campusstay_private.require_reviewer(); page jsonb; first_revision integer;
begin
  if p_limit is null or p_limit not between 1 and 100 or (p_before_revision is not null and p_before_revision<1) then
    raise exception 'Invalid note page' using errcode='22023'; end if;
  if not exists(select 1 from public.manager_verification_applications where id=p_application and applicant_id<>actor and submitted_at is not null) then
    raise exception 'Case unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(
    jsonb_build_object('note_revision',note_revision,'application_revision',application_revision,'author_id',author_id,'note',note,'created_at',created_at) order by note_revision)
    ,'[]'::jsonb),min(note_revision) into page,first_revision from (
      select * from campusstay_private.manager_review_notes where application_id=p_application
        and (p_before_revision is null or note_revision<p_before_revision) order by note_revision desc limit p_limit) notes;
  return jsonb_build_object('version',1,'application_id',p_application,'notes',page,'next_before_revision',
    case when exists(select 1 from campusstay_private.manager_review_notes where application_id=p_application and note_revision<first_revision) then first_revision else null end);
end $$;

-- Existing policy helpers retain their narrow grants; new helpers stay inaccessible.
revoke all on all functions in schema campusstay_private from public,anon,authenticated,service_role;
grant execute on function campusstay_private.is_reviewer(),campusstay_private.read_proof(text),campusstay_private.write_proof(text,text) to anon,authenticated;
revoke all on function public.cs_manager_review_v2(jsonb),public.cs_manager_set_authorization_v2(jsonb),
  public.cs_manager_note_write(uuid,integer,integer,text),public.cs_manager_notes(uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.cs_manager_review_v2(jsonb),public.cs_manager_set_authorization_v2(jsonb),
  public.cs_manager_note_write(uuid,integer,integer,text),public.cs_manager_notes(uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;

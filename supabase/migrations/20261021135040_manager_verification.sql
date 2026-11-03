-- H1.3: additive infrastructure. DO NOT apply to the live project without approval.
begin;
do $$ begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='storage' and c.relname in ('objects','buckets') and c.relrowsecurity) <> 2 then
    raise exception 'Supabase Storage RLS must be enabled before this migration';
  end if;
end $$;
create schema campusstay_private;
revoke all on schema campusstay_private from public;
create table campusstay_private.verification_configuration (
  singleton boolean primary key default true check (singleton),
  contract_version integer not null check (contract_version = 1),
  finalizer_ready boolean not null default false
);
insert into campusstay_private.verification_configuration values (true, 1, false);
create table campusstay_private.reviewer_assignments (
  user_id uuid primary key references auth.users(id),
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  reason text not null check (length(btrim(reason)) between 5 and 1000)
);
alter table campusstay_private.verification_configuration enable row level security;
alter table campusstay_private.reviewer_assignments enable row level security;
revoke all on all tables in schema campusstay_private from public, anon, authenticated;

create table public.manager_verification_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references auth.users(id),
  full_name text not null default '' check (length(full_name) <= 200),
  phone text not null default '' check (length(phone) <= 24),
  business_name text not null default '' check (length(business_name) <= 160),
  property_location text not null default '' check (length(property_location) <= 500),
  relationship text not null default '' check (relationship in ('', 'owner', 'authorised_manager')),
  status text not null default 'draft' check (status in ('draft','pending','needs_information','approved','rejected')),
  revision integer not null default 0 check (revision >= 0),
  proof_document_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  submitted_at timestamptz, reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id), review_reason text check (length(review_reason) <= 2000),
  unique (id, applicant_id),
  check (status = 'draft' or submitted_at is not null),
  check (status not in ('needs_information','rejected') or length(btrim(review_reason)) > 0)
);
create index manager_verification_review_queue on public.manager_verification_applications(status, submitted_at);
create table public.manager_verification_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null, applicant_id uuid not null,
  file_name text not null check (length(file_name) between 1 and 160 and file_name !~ '[[:cntrl:]/\\]'),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  object_name text not null unique,
  status text not null default 'reserved' check (status in ('reserved','ready')),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(), verified_at timestamptz,
  foreign key (application_id, applicant_id) references public.manager_verification_applications(id, applicant_id),
  unique (id, application_id),
  check (status <> 'ready' or (sha256 is not null and verified_at is not null)),
  check (object_name = applicant_id::text || '/' || application_id::text || '/' || id::text ||
    case mime_type when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' else '.png' end)
);
create index manager_verification_document_owner on public.manager_verification_documents(applicant_id, created_at);
create index manager_verification_document_application on public.manager_verification_documents(application_id, applicant_id);
alter table public.manager_verification_applications add constraint manager_proof_same_application
  foreign key (proof_document_id, id) references public.manager_verification_documents(id, application_id);
create table public.manager_authorizations (
  user_id uuid primary key references auth.users(id),
  application_id uuid not null,
  state text not null check (state in ('active','suspended','revoked')),
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  foreign key (application_id, user_id) references public.manager_verification_applications(id, applicant_id)
);
create table public.manager_verification_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.manager_verification_applications(id),
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('draft_saved','proof_reserved','proof_verified','submitted','needs_information','approved','rejected','active','suspended','revoked')),
  occurred_at timestamptz not null default now(),
  reason text check (length(reason) <= 2000), revision integer not null,
  document_id uuid references public.manager_verification_documents(id),
  application_snapshot jsonb not null default '{}'
);
create index manager_verification_history on public.manager_verification_events(application_id, occurred_at, id);
create index manager_verification_reviewer on public.manager_verification_applications(reviewer_id);
create index manager_verification_current_proof on public.manager_verification_applications(proof_document_id,id);
create index manager_authorization_application on public.manager_authorizations(application_id,user_id);
create index manager_authorization_reviewer on public.manager_authorizations(granted_by);
create index manager_event_actor on public.manager_verification_events(actor_id);
create index manager_event_document on public.manager_verification_events(document_id);
create index manager_reviewer_assigner on campusstay_private.reviewer_assignments(assigned_by);

create function campusstay_private.actor() returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists(select 1 from auth.users u where u.id = actor and u.email_confirmed_at is not null) then
    raise exception 'Verified identity required' using errcode = '42501';
  end if;
  return actor;
end $$;
create function campusstay_private.is_reviewer() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from campusstay_private.reviewer_assignments r join auth.users u on u.id=r.user_id
    where r.user_id=auth.uid() and r.active and u.email_confirmed_at is not null)
$$;
create function campusstay_private.capture_verification_event() returns trigger language plpgsql security definer set search_path = '' as $$
declare a public.manager_verification_applications;
begin
  select * into a from public.manager_verification_applications where id=new.application_id;
  new.application_snapshot := campusstay_private.application_json(a);
  return new;
end $$;
create trigger capture_verification_event before insert on public.manager_verification_events
for each row execute function campusstay_private.capture_verification_event();
create function campusstay_private.application_json(a public.manager_verification_applications) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',a.id,'applicant_id',a.applicant_id,'full_name',a.full_name,'phone',a.phone,
    'business_name',a.business_name,'property_location',a.property_location,'relationship',a.relationship,
    'status',a.status,'revision',a.revision,'submitted_at',a.submitted_at,'reviewed_at',a.reviewed_at,'review_reason',a.review_reason,
    'proof',(select jsonb_build_object('id',d.id,'file_name',d.file_name,'mime_type',d.mime_type,'byte_size',d.byte_size)
      from public.manager_verification_documents d where d.id=a.proof_document_id and d.status='ready'))
$$;
create function public.cs_manager_state() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications; permission text; ready boolean;
begin
  select * into a from public.manager_verification_applications where applicant_id=actor;
  select state into permission from public.manager_authorizations where user_id=actor and application_id=a.id;
  select c.finalizer_ready and exists(select 1 from storage.buckets b where b.id='campusstay-manager-verification'
    and not b.public and b.file_size_limit=5242880 and b.allowed_mime_types @> array['application/pdf','image/jpeg','image/png']::text[]
    and b.allowed_mime_types <@ array['application/pdf','image/jpeg','image/png']::text[])
    into ready from campusstay_private.verification_configuration c where singleton;
  return jsonb_build_object('version',1,'ready',coalesce(ready,false),
    'application',case when a.id is null then null else campusstay_private.application_json(a) end,
    'access',jsonb_build_object('state',coalesce(permission,'none'),'authorized',coalesce(ready and permission='active' and a.status='approved',false)));
end $$;
create function campusstay_private.require_ready() returns void language plpgsql security definer set search_path = '' as $$
declare ready boolean;
begin
  -- Do not depend on auth.uid(): the server-only finalizer has no user JWT.
  -- Hold the configuration row until commit so disabling readiness waits for
  -- already admitted RPC writes; new writes fail after the pause commits.
  select c.finalizer_ready and exists(select 1 from storage.buckets b where b.id='campusstay-manager-verification'
    and not b.public and b.file_size_limit=5242880 and b.allowed_mime_types @> array['application/pdf','image/jpeg','image/png']::text[]
    and b.allowed_mime_types <@ array['application/pdf','image/jpeg','image/png']::text[])
    into ready from campusstay_private.verification_configuration c where c.singleton for share of c;
  if ready is distinct from true then raise exception 'Verification setup incomplete' using errcode='55000'; end if;
end $$;
create function public.cs_manager_save_draft(p_fields jsonb, p_revision integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications; display_name text;
begin
  perform campusstay_private.require_ready();
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or p_fields - array['phone','business_name','property_location','relationship'] <> '{}'::jsonb then
    raise exception 'Invalid fields' using errcode='22023'; end if;
  if exists(select 1 from jsonb_each(p_fields) entry where jsonb_typeof(entry.value)<>'string') then raise exception 'Invalid field type' using errcode='22023'; end if;
  select left(btrim(regexp_replace(coalesce(raw_user_meta_data->>'full_name',''),'[[:space:]]+',' ','g')),200) into display_name from auth.users where id=actor;
  insert into public.manager_verification_applications(applicant_id,full_name) values(actor,display_name) on conflict (applicant_id) do nothing;
  select * into a from public.manager_verification_applications where applicant_id=actor for update;
  if a.status not in ('draft','needs_information') then raise exception 'Application locked' using errcode='42501'; end if;
  if (p_revision is null and a.revision <> 0) or (p_revision is not null and a.revision <> p_revision) then
    raise exception 'Application changed' using errcode='40001'; end if;
  update public.manager_verification_applications set full_name=display_name, phone=btrim(coalesce(p_fields->>'phone','')),
    business_name=btrim(regexp_replace(coalesce(p_fields->>'business_name',''),'[[:space:]]+',' ','g')),property_location=btrim(regexp_replace(coalesce(p_fields->>'property_location',''),'[[:space:]]+',' ','g')),
    relationship=coalesce(p_fields->>'relationship',''), revision=revision+1, updated_at=now()
    where id=a.id returning * into a;
  insert into public.manager_verification_events(application_id,actor_id,action,revision) values(a.id,actor,'draft_saved',a.revision);
  return campusstay_private.application_json(a);
end $$;
create function public.cs_manager_reserve_proof(p_application uuid,p_revision integer,p_name text,p_mime text,p_size bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications; document_id uuid := gen_random_uuid(); object_path text;
begin
  perform campusstay_private.require_ready();
  select * into a from public.manager_verification_applications where id=p_application and applicant_id=actor for update;
  if a.id is null or a.status not in ('draft','needs_information') then raise exception 'Not editable' using errcode='42501'; end if;
  if p_revision is null or a.revision <> p_revision then raise exception 'Application changed' using errcode='40001'; end if;
  if p_mime not in ('application/pdf','image/jpeg','image/png') or p_size not between 1 and 5242880 or
    p_name is null or length(p_name) not between 1 and 160 or p_name ~ '[[:cntrl:]/\\]' or
    not ((p_mime='application/pdf' and lower(p_name) ~ '\.pdf$') or (p_mime='image/jpeg' and lower(p_name) ~ '\.jpe?g$') or (p_mime='image/png' and lower(p_name) ~ '\.png$')) then
    raise exception 'Unsupported proof' using errcode='22023'; end if;
  if (select count(*) from public.manager_verification_documents where applicant_id=actor and created_at>now()-interval '24 hours') >= 10 then
    raise exception 'Proof limit reached' using errcode='54000'; end if;
  object_path := actor::text || '/' || a.id::text || '/' || document_id::text || case p_mime when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' else '.png' end;
  insert into public.manager_verification_documents(id,application_id,applicant_id,file_name,mime_type,byte_size,object_name)
    values(document_id,a.id,actor,p_name,p_mime,p_size,object_path);
  insert into public.manager_verification_events(application_id,actor_id,action,revision,document_id) values(a.id,actor,'proof_reserved',a.revision,document_id);
  return jsonb_build_object('id',document_id,'object_name',object_path);
end $$;

-- Only the authenticated, byte-checking Edge Function may call this function with a server credential.
create function public.cs_manager_finalize_proof(p_actor uuid,p_document uuid,p_revision integer,p_sha256 text) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.manager_verification_documents; a public.manager_verification_applications; o storage.objects;
begin
  if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Verified identity required' using errcode='42501'; end if;
  perform campusstay_private.require_ready();
  select * into d from public.manager_verification_documents where id=p_document and applicant_id=p_actor;
  select * into a from public.manager_verification_applications where id=d.application_id and applicant_id=p_actor for update;
  if a.id is null or a.status not in ('draft','needs_information') or d.created_at < now()-interval '24 hours' then
    raise exception 'Not editable' using errcode='42501'; end if;
  if d.status='ready' and a.proof_document_id=d.id then return; end if;
  if p_revision is null or a.revision <> p_revision then raise exception 'Application changed' using errcode='40001'; end if;
  select * into o from storage.objects where bucket_id='campusstay-manager-verification' and name=d.object_name for update;
  if o.id is null or o.owner_id is distinct from p_actor::text or (o.metadata->>'size')::bigint is distinct from d.byte_size or (o.metadata->>'mimetype') is distinct from d.mime_type or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Proof not verified' using errcode='22023'; end if;
  update public.manager_verification_documents set status='ready',sha256=p_sha256,verified_at=now() where id=d.id;
  update public.manager_verification_applications set proof_document_id=d.id,revision=revision+1,updated_at=now() where id=a.id returning * into a;
  insert into public.manager_verification_events(application_id,actor_id,action,revision,document_id) values(a.id,p_actor,'proof_verified',a.revision,d.id);
end $$;
create function public.cs_manager_submit(p_application uuid,p_revision integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications;
begin
  perform campusstay_private.require_ready();
  select * into a from public.manager_verification_applications where id=p_application and applicant_id=actor for update;
  if a.id is null then raise exception 'Not permitted' using errcode='42501'; end if;
  if a.status='pending' then return campusstay_private.application_json(a); end if;
  if a.status not in ('draft','needs_information') then raise exception 'Not editable' using errcode='42501'; end if;
  if p_revision is null or a.revision <> p_revision then raise exception 'Application changed' using errcode='40001'; end if;
  if length(btrim(a.full_name))=0 or a.phone !~ '^\+?[0-9 ()-]{7,24}$' or length(regexp_replace(a.phone,'[^0-9]','','g'))<7 or length(btrim(a.business_name))=0 or length(btrim(a.property_location))<5 or a.relationship='' or
    not exists(select 1 from public.manager_verification_documents d join storage.objects o on o.name=d.object_name and o.bucket_id='campusstay-manager-verification'
      where d.id=a.proof_document_id and d.application_id=a.id and d.applicant_id=actor and d.status='ready' and d.sha256 is not null) then
    raise exception 'Incomplete application' using errcode='22023'; end if;
  update public.manager_verification_applications set status='pending',submitted_at=now(),reviewed_at=null,reviewer_id=null,review_reason=null,revision=revision+1,updated_at=now() where id=a.id returning * into a;
  insert into public.manager_verification_events(application_id,actor_id,action,revision) values(a.id,actor,'submitted',a.revision);
  return campusstay_private.application_json(a);
end $$;
create function public.cs_manager_review(p_application uuid,p_revision integer,p_decision text,p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications;
begin
  if not campusstay_private.is_reviewer() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform campusstay_private.require_ready();
  select * into a from public.manager_verification_applications where id=p_application for update;
  if a.id is null or a.applicant_id=actor or a.status <> 'pending' then raise exception 'Not reviewable' using errcode='42501'; end if;
  if p_revision is null or a.revision <> p_revision then raise exception 'Application changed' using errcode='40001'; end if;
  if p_decision is null or p_decision not in ('approved','needs_information','rejected') or p_reason is null or length(btrim(p_reason)) not between 1 and 2000 then raise exception 'Invalid decision' using errcode='22023'; end if;
  update public.manager_verification_applications set status=p_decision,reviewer_id=actor,review_reason=btrim(p_reason),reviewed_at=now(),updated_at=now(),revision=revision+1 where id=a.id returning * into a;
  if p_decision='approved' then
    insert into public.manager_authorizations(user_id,application_id,state,granted_by,reason) values(a.applicant_id,a.id,'active',actor,btrim(p_reason));
  end if;
  insert into public.manager_verification_events(application_id,actor_id,action,reason,revision) values(a.id,actor,p_decision,btrim(p_reason),a.revision);
  return campusstay_private.application_json(a);
end $$;
create function public.cs_manager_set_authorization(p_user uuid,p_state text,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := campusstay_private.actor(); a public.manager_verification_applications;
begin
  if not campusstay_private.is_reviewer() or actor=p_user then raise exception 'Reviewer required' using errcode='42501'; end if;
  if p_state is null or p_state not in ('active','suspended','revoked') or p_reason is null or length(btrim(p_reason)) not between 1 and 2000 then raise exception 'Invalid access decision' using errcode='22023'; end if;
  -- Keep containment available during a pause; granting access must wait.
  if p_state='active' then perform campusstay_private.require_ready(); end if;
  select * into a from public.manager_verification_applications where applicant_id=p_user and status='approved' for update;
  if a.id is null or not exists(select 1 from public.manager_authorizations where user_id=p_user and application_id=a.id) then raise exception 'No approved assignment' using errcode='42501'; end if;
  update public.manager_authorizations set state=p_state,reason=btrim(p_reason),updated_at=now() where user_id=p_user;
  insert into public.manager_verification_events(application_id,actor_id,action,reason,revision) values(a.id,actor,p_state,btrim(p_reason),a.revision);
end $$;

alter table public.manager_verification_applications enable row level security;
alter table public.manager_verification_documents enable row level security;
alter table public.manager_verification_events enable row level security;
alter table public.manager_authorizations enable row level security;
revoke all on public.manager_verification_applications,public.manager_verification_documents,public.manager_verification_events,public.manager_authorizations from public,anon,authenticated;
revoke all on sequence public.manager_verification_events_id_seq from public,anon,authenticated;
grant select on public.manager_verification_applications,public.manager_verification_documents,public.manager_verification_events,public.manager_authorizations to authenticated;
create policy manager_application_read on public.manager_verification_applications for select to authenticated using (applicant_id=(select auth.uid()) or (submitted_at is not null and (select campusstay_private.is_reviewer())));
create policy manager_document_read on public.manager_verification_documents for select to authenticated using (applicant_id=(select auth.uid()) or ((select campusstay_private.is_reviewer()) and exists(select 1 from public.manager_verification_applications a where a.id=application_id and a.submitted_at is not null)));
create policy manager_history_read on public.manager_verification_events for select to authenticated using (exists(select 1 from public.manager_verification_applications a where a.id=application_id and (a.applicant_id=(select auth.uid()) or (select campusstay_private.is_reviewer()))));
create policy manager_assignment_read on public.manager_authorizations for select to authenticated using (user_id=(select auth.uid()) or (select campusstay_private.is_reviewer()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('campusstay-manager-verification','campusstay-manager-verification',false,5242880,array['application/pdf','image/jpeg','image/png']);
create function campusstay_private.read_proof(object_path text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.manager_verification_documents d where d.object_name=object_path
    and (d.applicant_id=auth.uid() or (campusstay_private.is_reviewer() and exists(select 1 from public.manager_verification_applications a where a.id=d.application_id and a.submitted_at is not null))))
$$;
create function campusstay_private.write_proof(object_path text, object_owner text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.manager_verification_documents d join public.manager_verification_applications a on a.id=d.application_id
    where d.object_name=object_path and d.applicant_id=auth.uid() and object_owner=auth.uid()::text
      and d.status='reserved' and d.created_at>now()-interval '24 hours' and a.status in ('draft','needs_information')
      and exists(select 1 from campusstay_private.verification_configuration c where c.singleton and c.finalizer_ready))
$$;
-- Restrictive guards prevent an unrelated broad permissive storage policy from exposing this bucket.
create policy manager_bucket_read_guard on storage.objects as restrictive for select to public using (bucket_id<>'campusstay-manager-verification' or campusstay_private.read_proof(name));
create policy manager_bucket_insert_guard on storage.objects as restrictive for insert to public with check (bucket_id<>'campusstay-manager-verification' or campusstay_private.write_proof(name,owner_id));
create policy manager_bucket_update_guard on storage.objects as restrictive for update to public using (bucket_id<>'campusstay-manager-verification') with check (bucket_id<>'campusstay-manager-verification');
create policy manager_bucket_delete_guard on storage.objects as restrictive for delete to public using (bucket_id<>'campusstay-manager-verification');
create policy manager_bucket_read on storage.objects for select to authenticated using (bucket_id='campusstay-manager-verification' and campusstay_private.read_proof(name));
create policy manager_bucket_insert on storage.objects for insert to authenticated with check (bucket_id='campusstay-manager-verification' and campusstay_private.write_proof(name,owner_id));
create policy manager_bucket_config_update_guard on storage.buckets as restrictive for update to public using (id<>'campusstay-manager-verification') with check (id<>'campusstay-manager-verification');
create policy manager_bucket_config_delete_guard on storage.buckets as restrictive for delete to public using (id<>'campusstay-manager-verification');
create policy manager_bucket_config_insert_guard on storage.buckets as restrictive for insert to public with check (id<>'campusstay-manager-verification');

-- Functions are not callable by PUBLIC/anon by default. No app receives table write rights.
revoke all on all functions in schema campusstay_private from public,anon,authenticated;
grant usage on schema campusstay_private to anon,authenticated;
grant execute on function campusstay_private.is_reviewer(),campusstay_private.read_proof(text),campusstay_private.write_proof(text,text) to anon,authenticated;
revoke all on function public.cs_manager_state(),public.cs_manager_save_draft(jsonb,integer),public.cs_manager_reserve_proof(uuid,integer,text,text,bigint),public.cs_manager_finalize_proof(uuid,uuid,integer,text),public.cs_manager_submit(uuid,integer),public.cs_manager_review(uuid,integer,text,text),public.cs_manager_set_authorization(uuid,text,text) from public,anon,authenticated;
grant execute on function public.cs_manager_state(),public.cs_manager_save_draft(jsonb,integer),public.cs_manager_reserve_proof(uuid,integer,text,text,bigint),public.cs_manager_submit(uuid,integer),public.cs_manager_review(uuid,integer,text,text),public.cs_manager_set_authorization(uuid,text,text) to authenticated;
grant execute on function public.cs_manager_finalize_proof(uuid,uuid,integer,text) to service_role;
-- Private schema is not part of the Data API. Bootstrap reviewers only via approved server/SQL administration.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.manager_authorizations,public.manager_verification_applications;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

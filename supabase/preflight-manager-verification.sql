-- READ ONLY. Run only against the explicitly approved target before deployment.
begin read only;
select current_setting('server_version_num') as postgres_version;
select count(*) as existing_auth_user_count from auth.users;
select to_regnamespace('campusstay_private') as conflicting_private_schema,
  to_regclass('public.manager_verification_applications') as conflicting_applications,
  to_regclass('public.manager_verification_documents') as conflicting_documents,
  to_regclass('public.manager_authorizations') as conflicting_assignments,
  to_regclass('public.manager_verification_events') as conflicting_events;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
  from pg_policies where schemaname='storage' and tablename in ('objects','buckets') order by tablename,policyname;
select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='storage' and c.relname in ('buckets','objects');
select table_name,column_name,data_type from information_schema.columns
  where table_schema='storage' and (table_name='objects' and column_name in ('owner_id','metadata','bucket_id','name')
    or table_name='buckets' and column_name in ('public','file_size_limit','allowed_mime_types'));
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='campusstay-manager-verification';
select n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'cs_manager_%';
select pubname from pg_publication where pubname='supabase_realtime';
select rolname,rolbypassrls from pg_roles where rolname in ('anon','authenticated','service_role');
rollback;

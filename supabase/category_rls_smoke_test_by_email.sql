-- FichaTec category RLS smoke test by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Expected cross-workspace category counts must be 0.
-- Do not grant auth.users to authenticated; this script resolves IDs before role simulation.
-- The final result is consolidated in one table so Supabase SQL Editor does not hide prior SELECTs.

drop table if exists pg_temp.category_rls_results;

create temp table pg_temp.category_rls_results (
  step integer,
  check_name text,
  user_email text,
  visible_rows integer,
  category_names text,
  expected text,
  status text
) on commit preserve rows;

grant insert, select on pg_temp.category_rls_results to authenticated;

select set_config(
  'fichatec.user_a_id',
  coalesce((select id::text from auth.users where email = 'r.camposarch@gmail.com'), ''),
  false
);

select set_config(
  'fichatec.user_b_id',
  coalesce((select id::text from auth.users where email = 'r.camposdesign@gmail.com'), ''),
  false
);

select set_config(
  'fichatec.org_a_id',
  coalesce((
    select p.default_organization_id::text
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.email = 'r.camposarch@gmail.com'
  ), ''),
  false
);

select set_config(
  'fichatec.org_b_id',
  coalesce((
    select p.default_organization_id::text
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.email = 'r.camposdesign@gmail.com'
  ), ''),
  false
);

insert into pg_temp.category_rls_results (
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
)
select
  1,
  'users_and_orgs_loaded',
  'r.camposarch@gmail.com + r.camposdesign@gmail.com',
  null,
  null,
  'expected OK before RLS simulation',
  case
    when nullif(current_setting('fichatec.user_a_id', true), '') is null then 'ERROR user A not found'
    when nullif(current_setting('fichatec.user_b_id', true), '') is null then 'ERROR user B not found'
    when nullif(current_setting('fichatec.org_a_id', true), '') is null then 'ERROR org A not found'
    when nullif(current_setting('fichatec.org_b_id', true), '') is null then 'ERROR org B not found'
    when current_setting('fichatec.org_a_id') = current_setting('fichatec.org_b_id') then 'ERROR users share same org'
    else 'OK users loaded and orgs are different'
  end;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  coalesce(nullif(current_setting('fichatec.user_a_id', true), ''), '00000000-0000-0000-0000-000000000000'),
  true
);

insert into pg_temp.category_rls_results (
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
)
select
  10,
  'arch_reads_own_categories',
  'r.camposarch@gmail.com',
  count(pc.id)::integer,
  coalesce(string_agg(pc.name, ', ' order by pc.name), ''),
  'expected >= 0; shows only categories from own workspace',
  'OK if visible_rows matches what this user created'
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.product_categories pc
  on pc.organization_id = context.org_id
 and pc.deleted_at is null;

insert into pg_temp.category_rls_results (
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
)
select
  11,
  'arch_reads_design_categories',
  'r.camposarch@gmail.com',
  count(pc.id)::integer,
  coalesce(string_agg(pc.name, ', ' order by pc.name), ''),
  'expected 0',
  case when count(pc.id) = 0 then 'PASS' else 'FAIL: cross-workspace category leak' end
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.product_categories pc
  on pc.organization_id = context.org_id
 and pc.deleted_at is null;
commit;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  coalesce(nullif(current_setting('fichatec.user_b_id', true), ''), '00000000-0000-0000-0000-000000000000'),
  true
);

insert into pg_temp.category_rls_results (
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
)
select
  20,
  'design_reads_own_categories',
  'r.camposdesign@gmail.com',
  count(pc.id)::integer,
  coalesce(string_agg(pc.name, ', ' order by pc.name), ''),
  'expected >= 0; shows only categories from own workspace',
  'OK if visible_rows matches what this user created'
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.product_categories pc
  on pc.organization_id = context.org_id
 and pc.deleted_at is null;

insert into pg_temp.category_rls_results (
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
)
select
  21,
  'design_reads_arch_categories',
  'r.camposdesign@gmail.com',
  count(pc.id)::integer,
  coalesce(string_agg(pc.name, ', ' order by pc.name), ''),
  'expected 0',
  case when count(pc.id) = 0 then 'PASS' else 'FAIL: cross-workspace category leak' end
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.product_categories pc
  on pc.organization_id = context.org_id
 and pc.deleted_at is null;
commit;

select
  step,
  check_name,
  user_email,
  visible_rows,
  category_names,
  expected,
  status
from pg_temp.category_rls_results
order by step;

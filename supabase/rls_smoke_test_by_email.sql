-- FichaTec RLS smoke test by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Expected cross-workspace counts must be 0.
-- The final result is consolidated in one table so Supabase SQL Editor does not hide prior SELECTs.

drop table if exists pg_temp.rls_smoke_results;

create temp table pg_temp.rls_smoke_results (
  step integer,
  check_name text,
  user_email text,
  visible_rows integer,
  item_names text,
  expected text,
  status text
) on commit preserve rows;

grant insert, select on pg_temp.rls_smoke_results to authenticated;

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

insert into pg_temp.rls_smoke_results (
  step,
  check_name,
  user_email,
  visible_rows,
  item_names,
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
    when nullif(current_setting('fichatec.user_a_id', true), '') is null then 'FAIL: user A not found'
    when nullif(current_setting('fichatec.user_b_id', true), '') is null then 'FAIL: user B not found'
    when nullif(current_setting('fichatec.org_a_id', true), '') is null then 'FAIL: org A not found'
    when nullif(current_setting('fichatec.org_b_id', true), '') is null then 'FAIL: org B not found'
    when current_setting('fichatec.org_a_id') = current_setting('fichatec.org_b_id') then 'FAIL: users share same org'
    else 'PASS'
  end;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  coalesce(nullif(current_setting('fichatec.user_a_id', true), ''), '00000000-0000-0000-0000-000000000000'),
  true
);

insert into pg_temp.rls_smoke_results
select
  10,
  'arch_reads_own_recipes',
  'r.camposarch@gmail.com',
  count(r.id)::integer,
  coalesce(string_agg(r.name, ', ' order by r.name), ''),
  'expected >= 0; shows only own recipes',
  'OK if visible_rows matches what this user created'
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.recipes r
  on r.organization_id = context.org_id
 and r.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  11,
  'arch_reads_design_recipes',
  'r.camposarch@gmail.com',
  count(r.id)::integer,
  coalesce(string_agg(r.name, ', ' order by r.name), ''),
  'expected 0',
  case when count(r.id) = 0 then 'PASS' else 'FAIL: cross-workspace recipe leak' end
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.recipes r
  on r.organization_id = context.org_id
 and r.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  12,
  'arch_reads_design_virtual_stock',
  'r.camposarch@gmail.com',
  count(s.id)::integer,
  coalesce(string_agg(s.name, ', ' order by s.name), ''),
  'expected 0',
  case when count(s.id) = 0 then 'PASS' else 'FAIL: cross-workspace virtual stock leak' end
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.stock_items s
  on s.organization_id = context.org_id
 and s.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  13,
  'arch_reads_design_physical_stock',
  'r.camposarch@gmail.com',
  count(ps.id)::integer,
  coalesce(string_agg(ps.name, ', ' order by ps.name), ''),
  'expected 0',
  case when count(ps.id) = 0 then 'PASS' else 'FAIL: cross-workspace physical stock leak' end
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.physical_stock_items ps
  on ps.organization_id = context.org_id
 and ps.deleted_at is null;
commit;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  coalesce(nullif(current_setting('fichatec.user_b_id', true), ''), '00000000-0000-0000-0000-000000000000'),
  true
);

insert into pg_temp.rls_smoke_results
select
  20,
  'design_reads_own_recipes',
  'r.camposdesign@gmail.com',
  count(r.id)::integer,
  coalesce(string_agg(r.name, ', ' order by r.name), ''),
  'expected >= 0; shows only own recipes',
  'OK if visible_rows matches what this user created'
from (select nullif(current_setting('fichatec.org_b_id', true), '')::uuid as org_id) context
left join public.recipes r
  on r.organization_id = context.org_id
 and r.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  21,
  'design_reads_arch_recipes',
  'r.camposdesign@gmail.com',
  count(r.id)::integer,
  coalesce(string_agg(r.name, ', ' order by r.name), ''),
  'expected 0',
  case when count(r.id) = 0 then 'PASS' else 'FAIL: cross-workspace recipe leak' end
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.recipes r
  on r.organization_id = context.org_id
 and r.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  22,
  'design_reads_arch_virtual_stock',
  'r.camposdesign@gmail.com',
  count(s.id)::integer,
  coalesce(string_agg(s.name, ', ' order by s.name), ''),
  'expected 0',
  case when count(s.id) = 0 then 'PASS' else 'FAIL: cross-workspace virtual stock leak' end
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.stock_items s
  on s.organization_id = context.org_id
 and s.deleted_at is null;

insert into pg_temp.rls_smoke_results
select
  23,
  'design_reads_arch_physical_stock',
  'r.camposdesign@gmail.com',
  count(ps.id)::integer,
  coalesce(string_agg(ps.name, ', ' order by ps.name), ''),
  'expected 0',
  case when count(ps.id) = 0 then 'PASS' else 'FAIL: cross-workspace physical stock leak' end
from (select nullif(current_setting('fichatec.org_a_id', true), '')::uuid as org_id) context
left join public.physical_stock_items ps
  on ps.organization_id = context.org_id
 and ps.deleted_at is null;
commit;

select
  step,
  check_name,
  user_email,
  visible_rows,
  item_names,
  expected,
  status
from pg_temp.rls_smoke_results
order by step;

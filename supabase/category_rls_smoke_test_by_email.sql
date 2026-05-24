-- FichaTec category RLS smoke test by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Expected cross-workspace category counts must be 0.
-- Do not grant auth.users to authenticated; this script resolves IDs before role simulation.

select set_config(
  'fichatec.user_a_id',
  (select id::text from auth.users where email = 'r.camposarch@gmail.com'),
  false
);

select set_config(
  'fichatec.user_b_id',
  (select id::text from auth.users where email = 'r.camposdesign@gmail.com'),
  false
);

select set_config(
  'fichatec.org_a_id',
  (
    select default_organization_id::text
    from public.profiles
    where id = current_setting('fichatec.user_a_id')::uuid
  ),
  false
);

select set_config(
  'fichatec.org_b_id',
  (
    select default_organization_id::text
    from public.profiles
    where id = current_setting('fichatec.user_b_id')::uuid
  ),
  false
);

select
  'users_and_orgs_loaded' as check_name,
  current_setting('fichatec.user_a_id')::uuid as user_a_id,
  current_setting('fichatec.org_a_id')::uuid as org_a_id,
  current_setting('fichatec.user_b_id')::uuid as user_b_id,
  current_setting('fichatec.org_b_id')::uuid as org_b_id,
  case
    when current_setting('fichatec.user_a_id', true) is null then 'ERROR user A not found'
    when current_setting('fichatec.user_b_id', true) is null then 'ERROR user B not found'
    when current_setting('fichatec.org_a_id', true) is null then 'ERROR org A not found'
    when current_setting('fichatec.org_b_id', true) is null then 'ERROR org B not found'
    when current_setting('fichatec.org_a_id') = current_setting('fichatec.org_b_id') then 'ERROR users share same org'
    else 'OK users loaded and orgs are different'
  end as result;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('fichatec.user_a_id'), true);

select
  'arch_reads_own_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected >= 1 if arch user created a category' as expected
from public.product_categories pc
where pc.organization_id = current_setting('fichatec.org_a_id')::uuid
  and pc.deleted_at is null;

select
  'arch_reads_design_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected 0' as expected
from public.product_categories pc
where pc.organization_id = current_setting('fichatec.org_b_id')::uuid
  and pc.deleted_at is null;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('fichatec.user_b_id'), true);

select
  'design_reads_own_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected >= 1 if design user created a category' as expected
from public.product_categories pc
where pc.organization_id = current_setting('fichatec.org_b_id')::uuid
  and pc.deleted_at is null;

select
  'design_reads_arch_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected 0' as expected
from public.product_categories pc
where pc.organization_id = current_setting('fichatec.org_a_id')::uuid
  and pc.deleted_at is null;
rollback;

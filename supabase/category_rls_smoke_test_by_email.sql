-- FichaTec category RLS smoke test by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Expected cross-workspace category counts must be 0.

with users_found as (
  select
    u.email,
    u.id as user_id,
    p.default_organization_id as organization_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email in (
    'r.camposarch@gmail.com',
    'r.camposdesign@gmail.com'
  )
),
pairs as (
  select
    a.user_id as user_a_id,
    a.organization_id as org_a_id,
    b.user_id as user_b_id,
    b.organization_id as org_b_id
  from users_found a
  cross join users_found b
  where a.email = 'r.camposarch@gmail.com'
    and b.email = 'r.camposdesign@gmail.com'
)
select
  'users_and_orgs_loaded' as check_name,
  user_a_id,
  org_a_id,
  user_b_id,
  org_b_id,
  case
    when user_a_id is null then 'ERROR user A not found'
    when user_b_id is null then 'ERROR user B not found'
    when org_a_id is null then 'ERROR org A not found'
    when org_b_id is null then 'ERROR org B not found'
    when org_a_id = org_b_id then 'ERROR users share same org'
    else 'OK users loaded and orgs are different'
  end as result
from pairs;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'r.camposarch@gmail.com'),
  true
);

with context as (
  select
    (select default_organization_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'r.camposarch@gmail.com') as own_org_id,
    (select default_organization_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'r.camposdesign@gmail.com') as other_org_id
)
select
  'arch_reads_own_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected >= 1 if arch user created a category' as expected
from public.product_categories pc, context c
where pc.organization_id = c.own_org_id
  and pc.deleted_at is null;

with context as (
  select
    (select default_organization_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'r.camposdesign@gmail.com') as other_org_id
)
select
  'arch_reads_design_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected 0' as expected
from public.product_categories pc, context c
where pc.organization_id = c.other_org_id
  and pc.deleted_at is null;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users where email = 'r.camposdesign@gmail.com'),
  true
);

with context as (
  select
    (select default_organization_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'r.camposdesign@gmail.com') as own_org_id
)
select
  'design_reads_own_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected >= 1 if design user created a category' as expected
from public.product_categories pc, context c
where pc.organization_id = c.own_org_id
  and pc.deleted_at is null;

with context as (
  select
    (select default_organization_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'r.camposarch@gmail.com') as other_org_id
)
select
  'design_reads_arch_categories' as check_name,
  count(*) as visible_rows,
  coalesce(string_agg(pc.name, ', ' order by pc.name), '') as category_names,
  'expected 0' as expected
from public.product_categories pc, context c
where pc.organization_id = c.other_org_id
  and pc.deleted_at is null;
rollback;


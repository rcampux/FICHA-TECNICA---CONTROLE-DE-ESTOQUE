-- FichaTec RLS smoke test.
-- Run this in Supabase SQL Editor after applying the migration.
-- Replace the placeholders with real UUIDs from auth.users and organizations.

-- 1. Confirm a new user received a profile, organization and owner membership.
select
  p.id as profile_id,
  p.default_organization_id,
  o.name as organization_name,
  om.role
from public.profiles p
join public.organizations o on o.id = p.default_organization_id
join public.organization_members om on om.organization_id = o.id and om.user_id = p.id
where p.id = 'USER_A_UUID_HERE';

-- 2. Confirm organization isolation using authenticated user context.
-- USER_A should read rows from ORG_A.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'USER_A_UUID_HERE', true);
select count(*) as user_a_stock_rows
from public.stock_items
where organization_id = 'ORG_A_UUID_HERE';
rollback;

-- 3. USER_B should not read ORG_A rows unless USER_B is a member of ORG_A.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'USER_B_UUID_HERE', true);
select count(*) as user_b_cross_org_stock_rows
from public.stock_items
where organization_id = 'ORG_A_UUID_HERE';
rollback;

-- Expected:
-- user_a_stock_rows >= 0 according to seeded/manual data.
-- user_b_cross_org_stock_rows = 0 when USER_B is outside ORG_A.

-- FichaTec Supabase hardening validation.
-- Run in Supabase SQL Editor using the postgres role.
-- Expected: public internal helpers removed/revoked, private helpers present.

with checks as (
  select
    1 as step,
    'private_schema_exists' as check_name,
    case when exists (
      select 1 from information_schema.schemata where schema_name = 'private'
    ) then 'PASS' else 'FAIL' end as status,
    'expected private schema exists' as expected

  union all

  select
    10,
    'public_current_user_role_removed',
    case when to_regprocedure('public.current_user_role(uuid)') is null then 'PASS' else 'FAIL' end,
    'expected public.current_user_role(uuid) removed'

  union all

  select
    11,
    'public_is_organization_member_removed',
    case when to_regprocedure('public.is_organization_member(uuid)') is null then 'PASS' else 'FAIL' end,
    'expected public.is_organization_member(uuid) removed'

  union all

  select
    12,
    'public_can_manage_organization_removed',
    case when to_regprocedure('public.can_manage_organization(uuid)') is null then 'PASS' else 'FAIL' end,
    'expected public.can_manage_organization(uuid) removed'

  union all

  select
    13,
    'public_can_write_organization_removed',
    case when to_regprocedure('public.can_write_organization(uuid)') is null then 'PASS' else 'FAIL' end,
    'expected public.can_write_organization(uuid) removed'

  union all

  select
    14,
    'public_handle_new_user_removed',
    case when to_regprocedure('public.handle_new_user()') is null then 'PASS' else 'FAIL' end,
    'expected public.handle_new_user() removed'

  union all

  select
    15,
    'public_bootstrap_organization_owner_removed',
    case when to_regprocedure('public.bootstrap_organization_owner()') is null then 'PASS' else 'FAIL' end,
    'expected public.bootstrap_organization_owner() removed'

  union all

  select
    20,
    'private_current_user_role_exists',
    case when to_regprocedure('private.current_user_role(uuid)') is not null then 'PASS' else 'FAIL' end,
    'expected private.current_user_role(uuid) exists'

  union all

  select
    21,
    'private_is_organization_member_exists',
    case when to_regprocedure('private.is_organization_member(uuid)') is not null then 'PASS' else 'FAIL' end,
    'expected private.is_organization_member(uuid) exists'

  union all

  select
    22,
    'private_can_manage_organization_exists',
    case when to_regprocedure('private.can_manage_organization(uuid)') is not null then 'PASS' else 'FAIL' end,
    'expected private.can_manage_organization(uuid) exists'

  union all

  select
    23,
    'private_can_write_organization_exists',
    case when to_regprocedure('private.can_write_organization(uuid)') is not null then 'PASS' else 'FAIL' end,
    'expected private.can_write_organization(uuid) exists'

  union all

  select
    24,
    'private_handle_new_user_exists',
    case when to_regprocedure('private.handle_new_user()') is not null then 'PASS' else 'FAIL' end,
    'expected private.handle_new_user() exists'

  union all

  select
    25,
    'private_bootstrap_organization_owner_exists',
    case when to_regprocedure('private.bootstrap_organization_owner()') is not null then 'PASS' else 'FAIL' end,
    'expected private.bootstrap_organization_owner() exists'

  union all

  select
    30,
    'public_set_updated_at_not_executable_by_anon',
    case when not has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'expected anon cannot execute public.set_updated_at()'

  union all

  select
    31,
    'public_set_updated_at_not_executable_by_authenticated',
    case when not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'expected authenticated cannot execute public.set_updated_at()'
)
select
  step,
  check_name,
  status,
  expected
from checks
order by step;

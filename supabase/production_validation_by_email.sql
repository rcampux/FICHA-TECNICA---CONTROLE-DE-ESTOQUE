-- FichaTec production validation by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Replace the two values in target_users with the confirmed test user e-mails.

with target_users(email) as (
  values
    ('USER_A_EMAIL_HERE'),
    ('USER_B_EMAIL_HERE')
),
user_context as (
  select
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    p.id as profile_id,
    p.default_organization_id,
    o.id as organization_id,
    o.name as organization_name,
    om.role
  from target_users t
  join auth.users u on u.email = t.email
  left join public.profiles p on p.id = u.id
  left join public.organization_members om on om.user_id = u.id
  left join public.organizations o on o.id = om.organization_id
)
select
  uc.email,
  uc.user_id,
  uc.email_confirmed_at,
  uc.profile_id,
  uc.default_organization_id,
  uc.organization_id,
  uc.organization_name,
  uc.role,
  count(r.id) filter (where r.deleted_at is null) as active_recipe_count,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'recipe_id', r.id,
        'name', r.name,
        'created_at', r.created_at,
        'deleted_at', r.deleted_at
      )
      order by r.created_at desc
    ) filter (where r.id is not null),
    '[]'::jsonb
  ) as recipes
from user_context uc
left join public.recipes r on r.organization_id = uc.organization_id
group by
  uc.email,
  uc.user_id,
  uc.email_confirmed_at,
  uc.profile_id,
  uc.default_organization_id,
  uc.organization_id,
  uc.organization_name,
  uc.role
order by uc.email;

-- Expected:
-- 1. Each e-mail returns exactly one owner workspace.
-- 2. email_confirmed_at is not null for both users.
-- 3. profile_id equals user_id for both users.
-- 4. organization_id is different between users unless they intentionally share a workspace.
-- 5. active_recipe_count matches the recipes created during production testing.
-- 6. User A recipes and User B recipes are attached to different organization_id values.

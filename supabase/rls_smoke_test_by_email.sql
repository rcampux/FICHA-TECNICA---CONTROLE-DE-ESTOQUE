-- FichaTec RLS smoke test by e-mail.
-- Run in Supabase SQL Editor using the postgres role.
-- Replace the two e-mails below with confirmed Auth users.
-- Expected cross-workspace counts must be 0.

select set_config(
  'fichatec.user_a_id',
  (select id::text from auth.users where email = 'USER_A_EMAIL_HERE'),
  false
);

select set_config(
  'fichatec.user_b_id',
  (select id::text from auth.users where email = 'USER_B_EMAIL_HERE'),
  false
);

select set_config(
  'fichatec.org_a_id',
  (select default_organization_id::text from public.profiles where id = current_setting('fichatec.user_a_id')::uuid),
  false
);

select set_config(
  'fichatec.org_b_id',
  (select default_organization_id::text from public.profiles where id = current_setting('fichatec.user_b_id')::uuid),
  false
);

select
  current_setting('fichatec.user_a_id')::uuid as user_a_id,
  current_setting('fichatec.org_a_id')::uuid as org_a_id,
  current_setting('fichatec.user_b_id')::uuid as user_b_id,
  current_setting('fichatec.org_b_id')::uuid as org_b_id;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('fichatec.user_a_id'), true);

select 'user_a_reads_own_recipes' as check_name, count(*) as visible_rows, 'expected >= 1 when user A created a recipe' as expected
from public.recipes
where organization_id = current_setting('fichatec.org_a_id')::uuid
  and deleted_at is null;

select 'user_a_reads_user_b_recipes' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.recipes
where organization_id = current_setting('fichatec.org_b_id')::uuid
  and deleted_at is null;

select 'user_a_reads_user_b_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.stock_items
where organization_id = current_setting('fichatec.org_b_id')::uuid
  and deleted_at is null;

select 'user_a_reads_user_b_physical_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.physical_stock_items
where organization_id = current_setting('fichatec.org_b_id')::uuid
  and deleted_at is null;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('fichatec.user_b_id'), true);

select 'user_b_reads_own_recipes' as check_name, count(*) as visible_rows, 'expected >= 1 when user B created a recipe' as expected
from public.recipes
where organization_id = current_setting('fichatec.org_b_id')::uuid
  and deleted_at is null;

select 'user_b_reads_user_a_recipes' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.recipes
where organization_id = current_setting('fichatec.org_a_id')::uuid
  and deleted_at is null;

select 'user_b_reads_user_a_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.stock_items
where organization_id = current_setting('fichatec.org_a_id')::uuid
  and deleted_at is null;

select 'user_b_reads_user_a_physical_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.physical_stock_items
where organization_id = current_setting('fichatec.org_a_id')::uuid
  and deleted_at is null;
rollback;

-- If any cross-workspace check returns more than 0, stop the project and fix RLS before continuing.

-- FichaTec RLS smoke test with validated production users.
-- Run in Supabase SQL Editor using the postgres role.
-- These UUIDs came from production_validation_by_email.sql on 2026-05-22.
-- Expected:
-- - own recipe checks return >= 1
-- - cross workspace checks return 0

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '810a418e-4f93-45c9-85a8-8d7cc150991d', true);

select 'user_a_reads_own_recipes' as check_name, count(*) as visible_rows, 'expected >= 1' as expected
from public.recipes
where organization_id = '981066fe-7706-4207-9896-5bbb0046c622'
  and deleted_at is null;

select 'user_a_reads_user_b_recipes' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.recipes
where organization_id = 'c200ff56-0638-4579-b26a-5a5ffcce20a3'
  and deleted_at is null;

select 'user_a_reads_user_b_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.stock_items
where organization_id = 'c200ff56-0638-4579-b26a-5a5ffcce20a3'
  and deleted_at is null;

select 'user_a_reads_user_b_physical_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.physical_stock_items
where organization_id = 'c200ff56-0638-4579-b26a-5a5ffcce20a3'
  and deleted_at is null;

rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd239b6fd-3d3d-4138-86c0-58c3b14c33ad', true);

select 'user_b_reads_own_recipes' as check_name, count(*) as visible_rows, 'expected >= 1' as expected
from public.recipes
where organization_id = 'c200ff56-0638-4579-b26a-5a5ffcce20a3'
  and deleted_at is null;

select 'user_b_reads_user_a_recipes' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.recipes
where organization_id = '981066fe-7706-4207-9896-5bbb0046c622'
  and deleted_at is null;

select 'user_b_reads_user_a_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.stock_items
where organization_id = '981066fe-7706-4207-9896-5bbb0046c622'
  and deleted_at is null;

select 'user_b_reads_user_a_physical_stock' as check_name, count(*) as visible_rows, 'expected 0' as expected
from public.physical_stock_items
where organization_id = '981066fe-7706-4207-9896-5bbb0046c622'
  and deleted_at is null;

rollback;

-- FichaTec billing foundation validation.
-- Run in Supabase SQL Editor after 20260524190000_billing_server_foundation.sql.

with expected_tables(table_name) as (
  values
    ('payment_customers'),
    ('checkout_sessions'),
    ('payment_events'),
    ('invoices')
),
table_checks as (
  select
    1 as step,
    'billing_tables_exist' as check_name,
    count(c.table_name)::text as result,
    'expected 4 billing tables' as expected,
    case when count(c.table_name) = 4 then 'PASS' else 'FAIL' end as status
  from expected_tables et
  left join information_schema.tables c
    on c.table_schema = 'public'
   and c.table_name = et.table_name
),
rls_checks as (
  select
    2 as step,
    'billing_tables_rls_enabled' as check_name,
    count(pc.relname)::text as result,
    'expected RLS enabled on 4 billing tables' as expected,
    case when count(pc.relname) = 4 then 'PASS' else 'FAIL' end as status
  from expected_tables et
  left join pg_class pc
    on pc.relname = et.table_name
   and pc.relrowsecurity = true
  left join pg_namespace pn
    on pn.oid = pc.relnamespace
   and pn.nspname = 'public'
),
policy_checks as (
  select
    3 as step,
    'billing_policies_created' as check_name,
    count(*)::text as result,
    'expected at least 7 billing RLS policies' as expected,
    case when count(*) >= 7 then 'PASS' else 'FAIL' end as status
  from pg_policies
  where schemaname = 'public'
    and tablename in (select table_name from expected_tables)
),
unique_checks as (
  select
    4 as step,
    'payment_events_idempotency_key' as check_name,
    count(*)::text as result,
    'expected unique constraint/index for provider + provider_event_id' as expected,
    case when count(*) >= 1 then 'PASS' else 'FAIL' end as status
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'payment_events'
    and indexdef ilike '%provider%'
    and indexdef ilike '%provider_event_id%'
    and indexdef ilike '%unique%'
),
subscription_checks as (
  select
    5 as step,
    'subscription_gateway_columns_exist' as check_name,
    count(*)::text as result,
    'expected gateway columns on subscriptions' as expected,
    case when count(*) = 3 then 'PASS' else 'FAIL' end as status
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'subscriptions'
    and column_name in ('gateway', 'gateway_customer_id', 'gateway_subscription_id')
)
select * from table_checks
union all select * from rls_checks
union all select * from policy_checks
union all select * from unique_checks
union all select * from subscription_checks
order by step;

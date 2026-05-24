-- FichaTec plan access validation.
-- Run in Supabase SQL Editor using the postgres role after applying
-- 20260524170000_plan_catalog_and_default_subscriptions.sql.

with expected_plans(code) as (
  values
    ('trial'),
    ('essential_monthly'),
    ('essential_quarterly'),
    ('essential_yearly'),
    ('professional_monthly'),
    ('professional_quarterly'),
    ('professional_yearly'),
    ('team_monthly'),
    ('team_quarterly'),
    ('team_yearly')
),
checks as (
  select
    1 as step,
    'plan_catalog_loaded' as check_name,
    count(p.id)::text as result,
    'expected 10 active plans' as expected,
    case when count(p.id) = 10 then 'PASS' else 'FAIL' end as status
  from expected_plans ep
  left join public.plans p
    on p.code = ep.code
   and p.is_active = true

  union all

  select
    2,
    'billing_intervals_available',
    coalesce(string_agg(distinct billing_interval::text, ', ' order by billing_interval::text), ''),
    'expected monthly, quarterly, yearly',
    case
      when count(distinct billing_interval) filter (where billing_interval in ('monthly', 'quarterly', 'yearly')) = 3
      then 'PASS'
      else 'FAIL'
    end
  from public.plans
  where code in (select code from expected_plans)

  union all

  select
    3,
    'all_organizations_have_subscription',
    (
      select count(*)::text
      from public.organizations o
      where not exists (
        select 1
        from public.subscriptions s
        where s.organization_id = o.id
      )
    ),
    'expected 0 organizations without subscription',
    case
      when not exists (
        select 1
        from public.organizations o
        where not exists (
          select 1
          from public.subscriptions s
          where s.organization_id = o.id
        )
      )
      then 'PASS'
      else 'FAIL'
    end

  union all

  select
    4,
    'professional_has_scanner',
    scan_recipe_monthly_limit::text || ' recipe / ' || scan_label_monthly_limit::text || ' label',
    'expected scanner limits greater than 0',
    case when scan_recipe_monthly_limit > 0 and scan_label_monthly_limit > 0 then 'PASS' else 'FAIL' end
  from public.plans
  where code = 'professional_monthly'

  union all

  select
    5,
    'essential_has_no_scanner',
    scan_recipe_monthly_limit::text || ' recipe / ' || scan_label_monthly_limit::text || ' label',
    'expected scanner limits equal 0',
    case when scan_recipe_monthly_limit = 0 and scan_label_monthly_limit = 0 then 'PASS' else 'FAIL' end
  from public.plans
  where code = 'essential_monthly'
)
select *
from checks
order by step;

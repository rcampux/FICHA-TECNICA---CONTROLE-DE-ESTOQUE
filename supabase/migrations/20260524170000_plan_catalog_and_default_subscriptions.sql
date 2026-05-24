-- FichaTec plan catalog and default workspace subscriptions.
-- Safe to run multiple times. It does not delete user data.

insert into public.plans (
  code,
  name,
  description,
  price_cents,
  billing_interval,
  max_recipes,
  max_members,
  scan_recipe_monthly_limit,
  scan_label_monthly_limit,
  is_active
)
values
  ('trial', 'Trial', 'Teste inicial com limites reduzidos.', 0, 'monthly', 20, 1, 3, 1, true),

  ('essential_monthly', 'Essencial Mensal', 'Fichas tecnicas, receitas e estoque para uma cozinha.', 4900, 'monthly', 300, 3, 0, 0, true),
  ('essential_quarterly', 'Essencial Trimestral', 'Essencial com cobranca trimestral.', 13230, 'quarterly', 300, 3, 0, 0, true),
  ('essential_yearly', 'Essencial Anual', 'Essencial com cobranca anual.', 47040, 'yearly', 300, 3, 0, 0, true),

  ('professional_monthly', 'Profissional Mensal', 'Inclui scanner de receitas e rotulos com IA.', 9900, 'monthly', 1000, 8, 100, 100, true),
  ('professional_quarterly', 'Profissional Trimestral', 'Profissional com cobranca trimestral.', 26730, 'quarterly', 1000, 8, 100, 100, true),
  ('professional_yearly', 'Profissional Anual', 'Profissional com cobranca anual.', 95040, 'yearly', 1000, 8, 100, 100, true),

  ('team_monthly', 'Equipe Mensal', 'Operacao B2B com equipe e limites ampliados.', 19900, 'monthly', null, 25, 300, 300, true),
  ('team_quarterly', 'Equipe Trimestral', 'Equipe com cobranca trimestral.', 53730, 'quarterly', null, 25, 300, 300, true),
  ('team_yearly', 'Equipe Anual', 'Equipe com cobranca anual.', 191040, 'yearly', null, 25, 300, 300, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  max_recipes = excluded.max_recipes,
  max_members = excluded.max_members,
  scan_recipe_monthly_limit = excluded.scan_recipe_monthly_limit,
  scan_label_monthly_limit = excluded.scan_label_monthly_limit,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.subscriptions (
  organization_id,
  plan_id,
  status,
  gateway,
  current_period_start,
  current_period_end
)
select
  o.id,
  p.id,
  'trialing',
  'manual',
  now(),
  now() + interval '14 days'
from public.organizations o
cross join public.plans p
where p.code = 'trial'
  and not exists (
    select 1
    from public.subscriptions s
    where s.organization_id = o.id
  );

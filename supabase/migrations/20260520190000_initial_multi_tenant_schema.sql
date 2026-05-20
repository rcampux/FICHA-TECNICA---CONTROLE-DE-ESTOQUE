-- FichaTec initial multi-tenant schema.
-- Security model: authenticated users access private data only through organization membership.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'chef', 'viewer');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');
create type public.billing_interval as enum ('monthly', 'quarterly', 'yearly');
create type public.scan_job_status as enum ('queued', 'processing', 'review_required', 'completed', 'failed', 'canceled');
create type public.stock_movement_type as enum ('entrada', 'saida', 'ajuste', 'perda');
create type public.asset_kind as enum ('recipe_photo', 'label_photo', 'product_photo', 'document');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  default_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  document_number text,
  phone text,
  billing_email text,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles
  add constraint profiles_default_organization_id_fkey
  foreign key (default_organization_id) references public.organizations(id) on delete set null;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'chef',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  billing_interval public.billing_interval not null default 'monthly',
  is_active boolean not null default true,
  max_recipes integer,
  max_members integer,
  scan_recipe_monthly_limit integer not null default 0,
  scan_label_monthly_limit integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid references public.plans(id),
  status public.subscription_status not null default 'trialing',
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_key text not null,
  usage_period date not null,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, feature_key, usage_period)
);

create table public.nutrition_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  source text not null default 'manual',
  product_name text not null,
  brand text,
  serving_size_g numeric(12,3),
  kcal numeric(12,3) not null default 0,
  carb_g numeric(12,3) not null default 0,
  protein_g numeric(12,3) not null default 0,
  fat_g numeric(12,3) not null default 0,
  saturated_fat_g numeric(12,3) not null default 0,
  trans_fat_g numeric(12,3) not null default 0,
  fiber_g numeric(12,3) not null default 0,
  sodium_mg numeric(12,3) not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'kg',
  package_quantity numeric(14,4) not null default 1 check (package_quantity > 0),
  package_price_cents integer not null default 0 check (package_price_cents >= 0),
  nutrition_fact_id uuid references public.nutrition_facts(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.stock_price_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  package_quantity numeric(14,4) not null check (package_quantity > 0),
  package_price_cents integer not null check (package_price_cents >= 0),
  source text not null default 'manual',
  source_url text,
  observed_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.physical_stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stock_item_id uuid references public.stock_items(id) on delete set null,
  name text not null,
  category text,
  unit text not null default 'kg',
  current_quantity numeric(14,4) not null default 0 check (current_quantity >= 0),
  desired_quantity numeric(14,4) not null default 0 check (desired_quantity >= 0),
  used_total numeric(14,4) not null default 0 check (used_total >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  physical_stock_item_id uuid not null references public.physical_stock_items(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity numeric(14,4) not null check (quantity > 0),
  reason text,
  recipe_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  yield_g numeric(14,4) not null default 0 check (yield_g >= 0),
  portions numeric(14,4) not null default 1 check (portions > 0),
  markup_percent numeric(8,3) not null default 0 check (markup_percent >= 0),
  portion_size_g numeric(14,4) not null default 100 check (portion_size_g > 0),
  total_cost_cents integer not null default 0 check (total_cost_cents >= 0),
  sale_price_cents integer not null default 0 check (sale_price_cents >= 0),
  preparation_method text,
  notes text,
  origin text not null default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.stock_movements
  add constraint stock_movements_recipe_id_fkey
  foreign key (recipe_id) references public.recipes(id) on delete set null;

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  stock_item_id uuid references public.stock_items(id) on delete set null,
  physical_stock_item_id uuid references public.physical_stock_items(id) on delete set null,
  name text not null,
  unit text not null default 'g',
  used_quantity numeric(14,4) not null default 0 check (used_quantity >= 0),
  gross_quantity numeric(14,4) not null default 0 check (gross_quantity >= 0),
  yield_percent numeric(8,3) not null default 100 check (yield_percent > 0 and yield_percent <= 100),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  saved_unit_price_cents numeric(14,6) not null default 0,
  nutrition_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind public.asset_kind not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null default 0 check (byte_size >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, storage_path)
);

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid references public.uploaded_assets(id) on delete set null,
  job_type text not null,
  status public.scan_job_status not null default 'queued',
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_default_organization_id_idx on public.profiles(default_organization_id);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index organization_members_organization_id_idx on public.organization_members(organization_id);
create index subscriptions_organization_id_idx on public.subscriptions(organization_id);
create index feature_usage_organization_period_idx on public.feature_usage(organization_id, usage_period);
create index nutrition_facts_organization_id_idx on public.nutrition_facts(organization_id);
create index stock_items_organization_id_idx on public.stock_items(organization_id);
create index stock_items_name_idx on public.stock_items using gin (to_tsvector('portuguese', coalesce(name, '')));
create index stock_price_history_stock_item_id_idx on public.stock_price_history(stock_item_id);
create index physical_stock_items_organization_id_idx on public.physical_stock_items(organization_id);
create index stock_movements_physical_stock_item_id_idx on public.stock_movements(physical_stock_item_id);
create index recipes_organization_id_idx on public.recipes(organization_id);
create index recipes_name_idx on public.recipes using gin (to_tsvector('portuguese', coalesce(name, '')));
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create index recipe_ingredients_organization_id_idx on public.recipe_ingredients(organization_id);
create index uploaded_assets_organization_id_idx on public.uploaded_assets(organization_id);
create index scan_jobs_organization_id_idx on public.scan_jobs(organization_id);
create index audit_logs_organization_id_idx on public.audit_logs(organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role(target_organization_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(target_organization_id) in ('owner', 'admin'), false);
$$;

create or replace function public.can_write_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(target_organization_id) in ('owner', 'admin', 'chef'), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.bootstrap_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (new.id, new.owner_id, 'owner', new.owner_id)
  on conflict (organization_id, user_id) do update set role = 'owner';

  update public.profiles
  set default_organization_id = coalesce(default_organization_id, new.id)
  where id = new.owner_id;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger set_plans_updated_at before update on public.plans for each row execute function public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger set_feature_usage_updated_at before update on public.feature_usage for each row execute function public.set_updated_at();
create trigger set_nutrition_facts_updated_at before update on public.nutrition_facts for each row execute function public.set_updated_at();
create trigger set_stock_items_updated_at before update on public.stock_items for each row execute function public.set_updated_at();
create trigger set_physical_stock_items_updated_at before update on public.physical_stock_items for each row execute function public.set_updated_at();
create trigger set_recipes_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create trigger set_recipe_ingredients_updated_at before update on public.recipe_ingredients for each row execute function public.set_updated_at();
create trigger set_scan_jobs_updated_at before update on public.scan_jobs for each row execute function public.set_updated_at();
create trigger bootstrap_organization_owner
after insert on public.organizations
for each row execute function public.bootstrap_organization_owner();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.feature_usage enable row level security;
alter table public.nutrition_facts enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_price_history enable row level security;
alter table public.physical_stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.uploaded_assets enable row level security;
alter table public.scan_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_select_member" on public.organizations for select to authenticated using (public.is_organization_member(id));
create policy "organizations_insert_owner" on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy "organizations_update_admin" on public.organizations for update to authenticated using (public.can_manage_organization(id)) with check (public.can_manage_organization(id));

create policy "organization_members_select_member" on public.organization_members for select to authenticated using (public.is_organization_member(organization_id));
create policy "organization_members_insert_admin" on public.organization_members for insert to authenticated with check (public.can_manage_organization(organization_id));
create policy "organization_members_update_admin" on public.organization_members for update to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "organization_members_delete_owner" on public.organization_members for delete to authenticated using (public.current_user_role(organization_id) = 'owner');

create policy "plans_select_active" on public.plans for select to authenticated using (is_active = true);

create policy "subscriptions_select_member" on public.subscriptions for select to authenticated using (public.is_organization_member(organization_id));
create policy "subscriptions_insert_admin" on public.subscriptions for insert to authenticated with check (public.can_manage_organization(organization_id));
create policy "subscriptions_update_admin" on public.subscriptions for update to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));

create policy "feature_usage_select_member" on public.feature_usage for select to authenticated using (public.is_organization_member(organization_id));
create policy "feature_usage_write_admin" on public.feature_usage for all to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));

create policy "nutrition_facts_select_member_or_public" on public.nutrition_facts for select to authenticated using (organization_id is null or public.is_organization_member(organization_id));
create policy "nutrition_facts_insert_writer" on public.nutrition_facts for insert to authenticated with check (organization_id is not null and public.can_write_organization(organization_id));
create policy "nutrition_facts_update_writer" on public.nutrition_facts for update to authenticated using (organization_id is not null and public.can_write_organization(organization_id)) with check (organization_id is not null and public.can_write_organization(organization_id));

create policy "stock_items_select_member" on public.stock_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "stock_items_insert_writer" on public.stock_items for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "stock_items_update_writer" on public.stock_items for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

create policy "stock_price_history_select_member" on public.stock_price_history for select to authenticated using (public.is_organization_member(organization_id));
create policy "stock_price_history_insert_writer" on public.stock_price_history for insert to authenticated with check (public.can_write_organization(organization_id));

create policy "physical_stock_items_select_member" on public.physical_stock_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "physical_stock_items_insert_writer" on public.physical_stock_items for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "physical_stock_items_update_writer" on public.physical_stock_items for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

create policy "stock_movements_select_member" on public.stock_movements for select to authenticated using (public.is_organization_member(organization_id));
create policy "stock_movements_insert_writer" on public.stock_movements for insert to authenticated with check (public.can_write_organization(organization_id));

create policy "recipes_select_member" on public.recipes for select to authenticated using (public.is_organization_member(organization_id));
create policy "recipes_insert_writer" on public.recipes for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "recipes_update_writer" on public.recipes for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

create policy "recipe_ingredients_select_member" on public.recipe_ingredients for select to authenticated using (public.is_organization_member(organization_id));
create policy "recipe_ingredients_insert_writer" on public.recipe_ingredients for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "recipe_ingredients_update_writer" on public.recipe_ingredients for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));
create policy "recipe_ingredients_delete_writer" on public.recipe_ingredients for delete to authenticated using (public.can_write_organization(organization_id));

create policy "uploaded_assets_select_member" on public.uploaded_assets for select to authenticated using (public.is_organization_member(organization_id));
create policy "uploaded_assets_insert_writer" on public.uploaded_assets for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "uploaded_assets_update_writer" on public.uploaded_assets for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

create policy "scan_jobs_select_member" on public.scan_jobs for select to authenticated using (public.is_organization_member(organization_id));
create policy "scan_jobs_insert_writer" on public.scan_jobs for insert to authenticated with check (public.can_write_organization(organization_id));
create policy "scan_jobs_update_writer" on public.scan_jobs for update to authenticated using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

create policy "audit_logs_select_admin" on public.audit_logs for select to authenticated using (organization_id is null or public.can_manage_organization(organization_id));

insert into public.plans (code, name, description, price_cents, billing_interval, max_recipes, max_members, scan_recipe_monthly_limit, scan_label_monthly_limit)
values
  ('trial', 'Trial', 'Teste inicial com limites reduzidos.', 0, 'monthly', 20, 1, 3, 1),
  ('essential_monthly', 'Essencial Mensal', 'Fichas tecnicas, receitas e estoque para uma cozinha.', 4900, 'monthly', 300, 3, 0, 0),
  ('professional_monthly', 'Profissional Mensal', 'Inclui scanner de receitas e rotulos com IA.', 9900, 'monthly', 1000, 8, 100, 100),
  ('team_monthly', 'Equipe Mensal', 'Operacao B2B com equipe e limites ampliados.', 19900, 'monthly', null, 25, 300, 300)
on conflict (code) do nothing;

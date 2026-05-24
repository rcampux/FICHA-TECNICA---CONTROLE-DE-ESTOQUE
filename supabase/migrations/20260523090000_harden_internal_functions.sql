-- Harden internal database functions flagged by Supabase Security Advisor.
-- Internal helpers move to a non-exposed schema so they cannot be called via REST RPC.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.current_user_role(target_organization_id uuid)
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

create or replace function private.is_organization_member(target_organization_id uuid)
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

create or replace function private.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_user_role(target_organization_id) in ('owner', 'admin'), false);
$$;

create or replace function private.can_write_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_user_role(target_organization_id) in ('owner', 'admin', 'chef'), false);
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_name text;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  organization_name := coalesce(
    nullif(new.raw_user_meta_data->>'organization_name', ''),
    nullif(new.raw_user_meta_data->>'company_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1),
    'Minha cozinha'
  );

  insert into public.organizations (name, slug, billing_email, owner_id)
  values (
    organization_name,
    'cozinha-' || replace(new.id::text, '-', ''),
    new.email,
    new.id
  )
  on conflict (slug) do nothing;

  return new;
end;
$$;

create or replace function private.bootstrap_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (new.id, new.owner_id, 'owner', new.owner_id)
  on conflict (organization_id, user_id) do update set
    role = 'owner',
    updated_at = now();

  update public.profiles
  set
    default_organization_id = coalesce(default_organization_id, new.id),
    updated_at = now()
  where id = new.owner_id;

  return new;
end;
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_user_role(uuid) to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.can_manage_organization(uuid) to authenticated;
grant execute on function private.can_write_organization(uuid) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop trigger if exists bootstrap_organization_owner on public.organizations;
create trigger bootstrap_organization_owner
after insert on public.organizations
for each row execute function private.bootstrap_organization_owner();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations for each row execute function private.set_updated_at();

drop trigger if exists set_organization_members_updated_at on public.organization_members;
create trigger set_organization_members_updated_at before update on public.organization_members for each row execute function private.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at before update on public.plans for each row execute function private.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function private.set_updated_at();

drop trigger if exists set_feature_usage_updated_at on public.feature_usage;
create trigger set_feature_usage_updated_at before update on public.feature_usage for each row execute function private.set_updated_at();

drop trigger if exists set_nutrition_facts_updated_at on public.nutrition_facts;
create trigger set_nutrition_facts_updated_at before update on public.nutrition_facts for each row execute function private.set_updated_at();

drop trigger if exists set_stock_items_updated_at on public.stock_items;
create trigger set_stock_items_updated_at before update on public.stock_items for each row execute function private.set_updated_at();

drop trigger if exists set_physical_stock_items_updated_at on public.physical_stock_items;
create trigger set_physical_stock_items_updated_at before update on public.physical_stock_items for each row execute function private.set_updated_at();

drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at before update on public.product_categories for each row execute function private.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes for each row execute function private.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at before update on public.recipe_ingredients for each row execute function private.set_updated_at();

drop trigger if exists set_scan_jobs_updated_at on public.scan_jobs;
create trigger set_scan_jobs_updated_at before update on public.scan_jobs for each row execute function private.set_updated_at();

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations for select to authenticated using (private.is_organization_member(id));

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations for update to authenticated using (private.can_manage_organization(id)) with check (private.can_manage_organization(id));

drop policy if exists "organization_members_select_member" on public.organization_members;
create policy "organization_members_select_member" on public.organization_members for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_admin" on public.organization_members for insert to authenticated with check (private.can_manage_organization(organization_id));

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin" on public.organization_members for update to authenticated using (private.can_manage_organization(organization_id)) with check (private.can_manage_organization(organization_id));

drop policy if exists "organization_members_delete_owner" on public.organization_members;
create policy "organization_members_delete_owner" on public.organization_members for delete to authenticated using (private.current_user_role(organization_id) = 'owner');

drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member" on public.subscriptions for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "subscriptions_insert_admin" on public.subscriptions;
create policy "subscriptions_insert_admin" on public.subscriptions for insert to authenticated with check (private.can_manage_organization(organization_id));

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin" on public.subscriptions for update to authenticated using (private.can_manage_organization(organization_id)) with check (private.can_manage_organization(organization_id));

drop policy if exists "feature_usage_select_member" on public.feature_usage;
create policy "feature_usage_select_member" on public.feature_usage for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "feature_usage_write_admin" on public.feature_usage;
create policy "feature_usage_write_admin" on public.feature_usage for all to authenticated using (private.can_manage_organization(organization_id)) with check (private.can_manage_organization(organization_id));

drop policy if exists "nutrition_facts_select_member_or_public" on public.nutrition_facts;
create policy "nutrition_facts_select_member_or_public" on public.nutrition_facts for select to authenticated using (organization_id is null or private.is_organization_member(organization_id));

drop policy if exists "nutrition_facts_insert_writer" on public.nutrition_facts;
create policy "nutrition_facts_insert_writer" on public.nutrition_facts for insert to authenticated with check (organization_id is not null and private.can_write_organization(organization_id));

drop policy if exists "nutrition_facts_update_writer" on public.nutrition_facts;
create policy "nutrition_facts_update_writer" on public.nutrition_facts for update to authenticated using (organization_id is not null and private.can_write_organization(organization_id)) with check (organization_id is not null and private.can_write_organization(organization_id));

drop policy if exists "stock_items_select_member" on public.stock_items;
create policy "stock_items_select_member" on public.stock_items for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "stock_items_insert_writer" on public.stock_items;
create policy "stock_items_insert_writer" on public.stock_items for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "stock_items_update_writer" on public.stock_items;
create policy "stock_items_update_writer" on public.stock_items for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "stock_price_history_select_member" on public.stock_price_history;
create policy "stock_price_history_select_member" on public.stock_price_history for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "stock_price_history_insert_writer" on public.stock_price_history;
create policy "stock_price_history_insert_writer" on public.stock_price_history for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "physical_stock_items_select_member" on public.physical_stock_items;
create policy "physical_stock_items_select_member" on public.physical_stock_items for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "physical_stock_items_insert_writer" on public.physical_stock_items;
create policy "physical_stock_items_insert_writer" on public.physical_stock_items for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "physical_stock_items_update_writer" on public.physical_stock_items;
create policy "physical_stock_items_update_writer" on public.physical_stock_items for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "stock_movements_select_member" on public.stock_movements;
create policy "stock_movements_select_member" on public.stock_movements for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "stock_movements_insert_writer" on public.stock_movements;
create policy "stock_movements_insert_writer" on public.stock_movements for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "recipes_select_member" on public.recipes;
create policy "recipes_select_member" on public.recipes for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "recipes_insert_writer" on public.recipes;
create policy "recipes_insert_writer" on public.recipes for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "recipes_update_writer" on public.recipes;
create policy "recipes_update_writer" on public.recipes for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "recipe_ingredients_select_member" on public.recipe_ingredients;
create policy "recipe_ingredients_select_member" on public.recipe_ingredients for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "recipe_ingredients_insert_writer" on public.recipe_ingredients;
create policy "recipe_ingredients_insert_writer" on public.recipe_ingredients for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "recipe_ingredients_update_writer" on public.recipe_ingredients;
create policy "recipe_ingredients_update_writer" on public.recipe_ingredients for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "recipe_ingredients_delete_writer" on public.recipe_ingredients;
create policy "recipe_ingredients_delete_writer" on public.recipe_ingredients for delete to authenticated using (private.can_write_organization(organization_id));

drop policy if exists "uploaded_assets_select_member" on public.uploaded_assets;
create policy "uploaded_assets_select_member" on public.uploaded_assets for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "uploaded_assets_insert_writer" on public.uploaded_assets;
create policy "uploaded_assets_insert_writer" on public.uploaded_assets for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "uploaded_assets_update_writer" on public.uploaded_assets;
create policy "uploaded_assets_update_writer" on public.uploaded_assets for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "scan_jobs_select_member" on public.scan_jobs;
create policy "scan_jobs_select_member" on public.scan_jobs for select to authenticated using (private.is_organization_member(organization_id));

drop policy if exists "scan_jobs_insert_writer" on public.scan_jobs;
create policy "scan_jobs_insert_writer" on public.scan_jobs for insert to authenticated with check (private.can_write_organization(organization_id));

drop policy if exists "scan_jobs_update_writer" on public.scan_jobs;
create policy "scan_jobs_update_writer" on public.scan_jobs for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs for select to authenticated using (organization_id is null or private.can_manage_organization(organization_id));

drop function if exists public.current_user_role(uuid);
drop function if exists public.is_organization_member(uuid);
drop function if exists public.can_manage_organization(uuid);
drop function if exists public.can_write_organization(uuid);
drop function if exists public.handle_new_user();
drop function if exists public.bootstrap_organization_owner();

alter function public.set_updated_at() set search_path = pg_catalog;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

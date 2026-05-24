-- FichaTec product categories.
-- Multi-tenant reusable category catalog for virtual and physical stock.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references public.product_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint product_categories_name_not_blank check (length(btrim(name)) > 0),
  constraint product_categories_unique_name unique (organization_id, name)
);

create index if not exists product_categories_organization_idx
  on public.product_categories (organization_id)
  where deleted_at is null;

create index if not exists product_categories_parent_idx
  on public.product_categories (parent_id)
  where deleted_at is null;

drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_select_member" on public.product_categories;
create policy "product_categories_select_member"
on public.product_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "product_categories_insert_writer" on public.product_categories;
create policy "product_categories_insert_writer"
on public.product_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'chef')
  )
);

drop policy if exists "product_categories_update_writer" on public.product_categories;
create policy "product_categories_update_writer"
on public.product_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'chef')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'chef')
  )
);


-- FichaTec billing server-side foundation.
-- Adds auditable payment tables used by Edge Functions before connecting a real gateway.

create table if not exists public.payment_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  gateway_customer_id text,
  billing_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (provider, gateway_customer_id)
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  requested_by uuid references auth.users(id) on delete set null,
  provider text not null,
  gateway_checkout_id text,
  status text not null default 'pending',
  checkout_url text,
  success_url text,
  cancel_url text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, gateway_checkout_id),
  check (status in ('pending', 'open', 'paid', 'expired', 'canceled', 'failed'))
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  gateway_invoice_id text,
  status text not null default 'open',
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'BRL',
  hosted_invoice_url text,
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, gateway_invoice_id),
  check (status in ('draft', 'open', 'paid', 'void', 'uncollectible', 'refunded'))
);

create index if not exists payment_customers_organization_idx on public.payment_customers(organization_id);
create index if not exists checkout_sessions_organization_idx on public.checkout_sessions(organization_id);
create index if not exists checkout_sessions_status_idx on public.checkout_sessions(status);
create index if not exists payment_events_organization_idx on public.payment_events(organization_id);
create index if not exists invoices_organization_idx on public.invoices(organization_id);

drop trigger if exists set_payment_customers_updated_at on public.payment_customers;
create trigger set_payment_customers_updated_at
before update on public.payment_customers
for each row execute function private.set_updated_at();

drop trigger if exists set_checkout_sessions_updated_at on public.checkout_sessions;
create trigger set_checkout_sessions_updated_at
before update on public.checkout_sessions
for each row execute function private.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function private.set_updated_at();

alter table public.payment_customers enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.payment_events enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "payment_customers_select_member" on public.payment_customers;
create policy "payment_customers_select_member"
on public.payment_customers for select to authenticated
using (private.is_organization_member(organization_id));

drop policy if exists "payment_customers_manage_admin" on public.payment_customers;
create policy "payment_customers_manage_admin"
on public.payment_customers for all to authenticated
using (private.can_manage_organization(organization_id))
with check (private.can_manage_organization(organization_id));

drop policy if exists "checkout_sessions_select_member" on public.checkout_sessions;
create policy "checkout_sessions_select_member"
on public.checkout_sessions for select to authenticated
using (private.is_organization_member(organization_id));

drop policy if exists "checkout_sessions_manage_admin" on public.checkout_sessions;
create policy "checkout_sessions_manage_admin"
on public.checkout_sessions for all to authenticated
using (private.can_manage_organization(organization_id))
with check (private.can_manage_organization(organization_id));

drop policy if exists "payment_events_select_admin" on public.payment_events;
create policy "payment_events_select_admin"
on public.payment_events for select to authenticated
using (organization_id is not null and private.can_manage_organization(organization_id));

drop policy if exists "invoices_select_member" on public.invoices;
create policy "invoices_select_member"
on public.invoices for select to authenticated
using (private.is_organization_member(organization_id));

drop policy if exists "invoices_manage_admin" on public.invoices;
create policy "invoices_manage_admin"
on public.invoices for all to authenticated
using (private.can_manage_organization(organization_id))
with check (private.can_manage_organization(organization_id));

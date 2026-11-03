create table public.kitchen_boards (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kitchen_board_shape check (coalesce(
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload->'name') = 'string'
    and length(payload->>'name') between 1 and 80
    and jsonb_typeof(payload->'columns') = 'array'
    and jsonb_array_length(payload->'columns') between 1 and 8
    and jsonb_typeof(payload->'tasks') = 'array'
    and jsonb_array_length(payload->'tasks') <= 500, false))
);
alter table public.kitchen_boards enable row level security;
revoke all on public.kitchen_boards from anon, authenticated;
grant select, insert, update on public.kitchen_boards to authenticated;

create policy kitchen_board_member_read on public.kitchen_boards for select to authenticated
using (exists (select 1 from public.organization_members om where om.organization_id = kitchen_boards.organization_id and om.user_id = (select auth.uid())));
create policy kitchen_board_writer_insert on public.kitchen_boards for insert to authenticated
with check (exists (select 1 from public.organization_members om where om.organization_id = kitchen_boards.organization_id and om.user_id = (select auth.uid()) and om.role in ('owner','admin','chef')));
create policy kitchen_board_writer_update on public.kitchen_boards for update to authenticated
using (exists (select 1 from public.organization_members om where om.organization_id = kitchen_boards.organization_id and om.user_id = (select auth.uid()) and om.role in ('owner','admin','chef')))
with check (exists (select 1 from public.organization_members om where om.organization_id = kitchen_boards.organization_id and om.user_id = (select auth.uid()) and om.role in ('owner','admin','chef')));

create trigger kitchen_board_updated_at before update on public.kitchen_boards
for each row execute function private.set_updated_at();

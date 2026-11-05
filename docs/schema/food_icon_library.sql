-- Biblioteca de ícones: imagens persistidas no banco, sem atribuição a categorias.
create table public.food_icon_library (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 slug text not null check (slug ~ '^[a-z0-9-]+$'),
 label text not null check (length(label)>0),
 collection text not null,
 unicode_codepoints text,
 mime_type text not null default 'image/webp' check (mime_type='image/webp'),
 image_data bytea not null check (octet_length(image_data)>0 and octet_length(image_data)<524288),
 width integer not null check(width>0),
 height integer not null check(height>0),
 sha256 text not null check(length(sha256)=64),
 style_version text not null default 'flat-warm-v1',
 created_at timestamptz not null default now(),
 primary key(organization_id,slug)
);
alter table public.food_icon_library enable row level security;
grant select,insert,update,delete on public.food_icon_library to authenticated;
revoke all on public.food_icon_library from anon;
create policy food_icon_library_select_member on public.food_icon_library for select to authenticated using (private.is_organization_member(organization_id));
create policy food_icon_library_insert_writer on public.food_icon_library for insert to authenticated with check (private.can_write_organization(organization_id));
create policy food_icon_library_update_writer on public.food_icon_library for update to authenticated using (private.can_write_organization(organization_id)) with check (private.can_write_organization(organization_id));
create policy food_icon_library_delete_manager on public.food_icon_library for delete to authenticated using (private.can_manage_organization(organization_id));
comment on table public.food_icon_library is 'Biblioteca de imagens flat disponíveis para futura atribuição. Nenhum vínculo automático com product_categories.';

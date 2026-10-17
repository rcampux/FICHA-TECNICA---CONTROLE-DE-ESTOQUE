alter table public.recipes
  add column if not exists image_path text;

comment on column public.recipes.image_path is
  'Caminho interno da capa da receita no bucket privado recipe-images.';

alter table public.recipes
  drop constraint if exists recipes_image_path_relative_chk;

alter table public.recipes
  drop constraint if exists recipes_image_path_canonical_chk;

update public.recipes
set image_path = null
where image_path is not null
  and image_path <> organization_id::text || '/' || id::text || '/cover.jpg';

alter table public.recipes
  add constraint recipes_image_path_canonical_chk
  check (
    image_path is null
    or image_path = organization_id::text || '/' || id::text || '/cover.jpg'
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'recipe-images',
  'recipe-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.recipe_image_organization_id(object_name text)
returns uuid
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  first_segment text := split_part(object_name, '/', 1);
begin
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;

revoke execute on function private.recipe_image_organization_id(text) from public, anon;
grant execute on function private.recipe_image_organization_id(text) to authenticated;

drop policy if exists "recipe_images_select_member" on storage.objects;
create policy "recipe_images_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.is_organization_member(private.recipe_image_organization_id(name))
);

drop policy if exists "recipe_images_insert_writer" on storage.objects;
create policy "recipe_images_insert_writer"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and private.can_write_organization(private.recipe_image_organization_id(name))
);

drop policy if exists "recipe_images_update_writer" on storage.objects;
create policy "recipe_images_update_writer"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.can_write_organization(private.recipe_image_organization_id(name))
)
with check (
  bucket_id = 'recipe-images'
  and private.can_write_organization(private.recipe_image_organization_id(name))
);

drop policy if exists "recipe_images_delete_writer" on storage.objects;
create policy "recipe_images_delete_writer"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.can_write_organization(private.recipe_image_organization_id(name))
);

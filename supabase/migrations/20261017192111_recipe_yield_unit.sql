alter table public.recipes
  add column if not exists yield_unit text not null default 'portion';

alter table public.recipes
  drop constraint if exists recipes_yield_unit_check;

alter table public.recipes
  add constraint recipes_yield_unit_check
  check (yield_unit in ('portion', 'unit'));

comment on column public.recipes.yield_unit is
  'Operational recipe yield type: portion or unit. Existing recipes default to portion.';

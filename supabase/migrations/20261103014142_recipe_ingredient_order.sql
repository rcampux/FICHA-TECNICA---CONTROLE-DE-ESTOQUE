alter table public.recipe_ingredients add column sort_order integer not null default 0 check (sort_order >= 0);

-- Existing recipes gain a stable initial order; subsequent saves use the user's order.
with positions as (
  select id, (row_number() over(partition by recipe_id order by created_at,id)-1)::integer as position
  from public.recipe_ingredients
)
update public.recipe_ingredients ingredient
set sort_order=positions.position
from positions where ingredient.id=positions.id;

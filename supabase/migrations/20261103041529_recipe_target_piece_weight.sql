alter table public.recipes
  add column if not exists target_piece_weight_g numeric
  check (target_piece_weight_g > 0 and target_piece_weight_g < 'Infinity'::numeric);

comment on column public.recipes.target_piece_weight_g is
  'Chosen weight per piece in grams when dividing a finished batch by weight. NULL means divide by portions.';

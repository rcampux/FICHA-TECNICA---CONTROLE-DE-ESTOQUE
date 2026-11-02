alter table public.product_categories
  add column color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.product_categories.color is 'Category color in #RRGGBB format. Null uses the application default.';

update public.product_categories
set color = case translate(lower(name), 'áàãâéêíóôõúç', 'aaaaeeiooouc')
  when 'proteinas' then '#B4232F'
  when 'carboidratos' then '#D97706'
  when 'laticinios' then '#3273C8'
  when 'carnes' then '#C34F86'
  when 'cereais' then '#CAAA20'
  when 'farinhas' then '#92674C'
  when 'acucares' then '#9A4CB5'
  when 'oleos e gorduras' then '#00857D'
  when 'temperos' then '#6357BA'
  when 'hortifruti' then '#378449'
  when 'leguminosas' then '#6B8B29'
  when 'outros' then '#687C92'
  else '#' || upper(substr(md5(lower(name)), 1, 6))
end
where color is null and deleted_at is null;

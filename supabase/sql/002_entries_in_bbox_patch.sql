create or replace function public.entries_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  cat text default null
)
returns table (
  id uuid,
  category text,
  title text,
  description text,
  photo_url text,
  created_at timestamptz,
  lng double precision,
  lat double precision
)
language sql
stable
as $$
  select
    entries.id,
    entries.category,
    entries.title,
    entries.description,
    entries.photo_url,
    entries.created_at,
    st_x(entries.geom::geometry) as lng,
    st_y(entries.geom::geometry) as lat
  from public.entries
  where entries.status = 'published'
    and st_intersects(
      entries.geom::geometry,
      st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    and (cat is null or entries.category = cat)
  order by entries.created_at desc;
$$;

alter table public.entry_rate_log enable row level security;

create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('seedling', 'meaningful_tree')),
  title text null,
  description text null,
  photo_path text null,
  photo_url text null,
  geom geography(Point, 4326) not null,
  created_at timestamptz default now(),
  status text default 'published' check (status in ('published', 'flagged', 'hidden')),
  client_hash text null
);

create index if not exists entries_geom_idx on public.entries using gist (geom);
create index if not exists entries_created_at_idx on public.entries (created_at desc);
create index if not exists entries_category_idx on public.entries (category);

alter table public.entries enable row level security;

drop policy if exists "Public entries are readable" on public.entries;
create policy "Public entries are readable" on public.entries
  for select
  using (status = 'published');

create table if not exists public.entry_rate_log (
  id bigserial primary key,
  client_hash text not null,
  created_at timestamptz default now()
);

create index if not exists entry_rate_log_client_idx on public.entry_rate_log (client_hash);
create index if not exists entry_rate_log_created_at_idx on public.entry_rate_log (created_at desc);

create or replace function public.entries_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  cat text default null
)
returns setof public.entries
language sql
stable
as $$
  select *
  from public.entries
  where status = 'published'
    and st_intersects(
      geom,
      st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    )
    and (cat is null or category = cat);
$$;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

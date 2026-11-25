create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[0-9]{6}$'),
  owner_id      uuid not null default auth.uid(),
  state         jsonb not null default '{}'::jsonb,
  phase         text not null default 'lobby'
                check (phase in ('lobby','roles','night','day','vote','terror','dayEnd','end')),
  player_count  integer not null default 0,
  round         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;

create index if not exists rooms_owner_updated_idx on public.rooms (owner_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
  before update on public.rooms
  for each row execute function public.touch_updated_at();

alter table public.rooms enable row level security;

create policy "rooms_select_own" on public.rooms
  for select to authenticated using (owner_id = auth.uid());
create policy "rooms_insert_own" on public.rooms
  for insert to authenticated with check (owner_id = auth.uid());
create policy "rooms_update_own" on public.rooms
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "rooms_delete_own" on public.rooms
  for delete to authenticated using (owner_id = auth.uid());

create or replace function public.room_exists(p_code text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rooms
     where code = p_code
       and updated_at > now() - interval '12 hours'
  );
$$;

revoke all on function public.room_exists(text) from public;
grant execute on function public.room_exists(text) to anon, authenticated;
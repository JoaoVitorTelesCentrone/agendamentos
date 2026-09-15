-- Persistent storage for the standalone Hono booking API.
-- The booking_ prefix avoids colliding with the existing Next.js schema.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create table if not exists booking_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('provider', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists booking_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references booking_users(id) on delete cascade,
  description text,
  avatar_url text,
  location text
);

create table if not exists booking_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references booking_providers(id) on delete cascade,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true
);
create index if not exists booking_services_provider_idx on booking_services(provider_id);

create table if not exists booking_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references booking_providers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index if not exists booking_availability_provider_idx on booking_availability(provider_id, day_of_week);

create table if not exists booking_appointments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references booking_providers(id) on delete restrict,
  client_id uuid not null references booking_users(id) on delete restrict,
  service_id uuid not null references booking_services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists booking_appointments_provider_date_idx on booking_appointments(provider_id, start_at);
create index if not exists booking_appointments_client_idx on booking_appointments(client_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_appointments_no_overlap'
  ) then
    alter table booking_appointments
      add constraint booking_appointments_no_overlap
      exclude using gist (
        provider_id with =,
        tstzrange(start_at, end_at) with &&
      ) where (status <> 'cancelled');
  end if;
end $$;

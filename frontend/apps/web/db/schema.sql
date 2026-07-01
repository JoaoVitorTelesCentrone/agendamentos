-- VÍVIO — schema para Postgres puro (Neon).
-- Derivado das migrations do Supabase, SEM as dependências da stack Supabase:
--   * sem auth.users  → tabela auth_users própria (email + hash de senha)
--   * sem RLS/policies → o isolamento por tenant é feito no app (lib/db/client.ts)
--   * sem auth.uid()/current_tenant_id()
-- Re-executável: derruba tudo e recria (destrutivo — use só em dev/seed).

drop table if exists notifications        cascade;
drop table if exists otp_verifications    cascade;
drop table if exists leads                cascade;
drop table if exists appointments         cascade;
drop table if exists clients              cascade;
drop table if exists service_professionals cascade;
drop table if exists services             cascade;
drop table if exists time_off             cascade;
drop table if exists working_hours        cascade;
drop table if exists professionals        cascade;
drop table if exists profiles             cascade;
drop table if exists auth_users           cascade;
drop table if exists tenants              cascade;

drop type if exists notification_status cascade;
drop type if exists notification_type   cascade;
drop type if exists appt_status         cascade;
drop type if exists user_role           cascade;
drop type if exists tenant_status       cascade;

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- EXCLUDE com igualdade + range

create type tenant_status       as enum ('trial', 'ativo', 'inadimplente', 'suspenso', 'cancelado');
create type user_role           as enum ('admin', 'atendente', 'profissional');
create type appt_status         as enum ('agendado', 'confirmado', 'concluido', 'cancelado', 'no_show');
create type notification_type   as enum ('confirmation', 'reminder');
create type notification_status as enum ('pending', 'sent', 'failed', 'cancelled');

-- Empresa (tenant)
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  niche         text,
  plan          text not null default 'free',
  status        tenant_status not null default 'trial',
  primary_color text,
  logo_url      text,
  cancel_min_minutes integer not null default 120,
  created_at    timestamptz not null default now()
);

-- Usuário do painel (substitui o Supabase Auth)
create table auth_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Liga um usuário a um tenant + papel
create table profiles (
  id         uuid primary key references auth_users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  role       user_role not null default 'admin',
  created_at timestamptz not null default now()
);
create index profiles_tenant_idx on profiles(tenant_id);

-- Profissional / Agenda
create table professionals (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index professionals_tenant_idx on professionals(tenant_id);

create table working_hours (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  check (end_time > start_time)
);
create index working_hours_prof_idx on working_hours(tenant_id, professional_id, weekday);

create table time_off (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  check (ends_at > starts_at)
);
create index time_off_prof_idx on time_off(tenant_id, professional_id, starts_at);

-- Serviço
create table services (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  description  text,
  duration_min integer not null check (duration_min > 0),
  price_cents  integer not null default 0 check (price_cents >= 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index services_tenant_idx on services(tenant_id);

create table service_professionals (
  tenant_id       uuid not null references tenants(id) on delete cascade,
  service_id      uuid not null references services(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  primary key (service_id, professional_id)
);
create index service_professionals_prof_idx on service_professionals(professional_id);

-- Cliente (único por tenant pelo WhatsApp)
create table clients (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  whatsapp   text not null,
  name       text not null,
  notes      text,
  created_at timestamptz not null default now(),
  unique (tenant_id, whatsapp)
);
create index clients_tenant_idx on clients(tenant_id);

-- Agendamento
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  service_id      uuid not null references services(id) on delete restrict,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          appt_status not null default 'agendado',
  price_cents     integer not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_starts_idx      on appointments(tenant_id, starts_at);
create index appointments_prof_starts_idx on appointments(tenant_id, professional_id, starts_at);
create index appointments_status_idx      on appointments(tenant_id, status);
create index appointments_client_idx      on appointments(tenant_id, client_id);

-- Anti double-booking (exceto cancelados)
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelado');

-- Lead (visitou a pública e não concluiu)
create table leads (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text,
  whatsapp   text,
  service_id uuid references services(id) on delete set null,
  created_at timestamptz not null default now()
);
create index leads_tenant_idx on leads(tenant_id, created_at);

-- OTP do cliente final (WhatsApp)
create table otp_verifications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  whatsapp    text not null,
  code_hash   text not null,
  attempts    integer not null default 0,
  verified_at timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index otp_lookup_idx on otp_verifications(tenant_id, whatsapp, created_at desc);

-- Outbox de notificações
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type           notification_type not null,
  channel        text not null default 'whatsapp',
  to_whatsapp    text not null,
  body           text not null,
  status         notification_status not null default 'pending',
  scheduled_for  timestamptz not null,
  sent_at        timestamptz,
  error          text,
  created_at     timestamptz not null default now()
);
create index notifications_due_idx  on notifications(status, scheduled_for);
create index notifications_appt_idx on notifications(appointment_id);

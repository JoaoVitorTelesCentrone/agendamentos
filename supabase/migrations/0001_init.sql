-- VÍVIO — MVP schema
-- Multi-tenant: toda tabela operacional carrega tenant_id e é protegida por RLS (ver 0002_rls.sql).

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- EXCLUDE constraint com igualdade + range

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type tenant_status as enum ('trial', 'ativo', 'inadimplente', 'suspenso', 'cancelado');
create type user_role     as enum ('admin', 'atendente', 'profissional');
create type appt_status   as enum ('agendado', 'confirmado', 'concluido', 'cancelado', 'no_show');

-- ---------------------------------------------------------------------------
-- Empresa (tenant)
-- ---------------------------------------------------------------------------
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  niche         text,
  plan          text not null default 'free',
  status        tenant_status not null default 'trial',
  primary_color text,
  logo_url      text,
  -- política de cancelamento: antecedência mínima em minutos p/ cliente cancelar/remarcar
  cancel_min_minutes integer not null default 120,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profile: liga um usuário do Supabase Auth a um tenant + papel
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  role       user_role not null default 'admin',
  created_at timestamptz not null default now()
);
create index profiles_tenant_idx on profiles(tenant_id);

-- Helper: tenant do usuário logado. SECURITY DEFINER p/ evitar recursão de RLS
-- (a policy de outras tabelas chama esta função, que lê profiles sem re-checar RLS).
create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Profissional / Agenda (unidade de cobrança do plano)
-- ---------------------------------------------------------------------------
create table professionals (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index professionals_tenant_idx on professionals(tenant_id);

-- Horário de trabalho por dia da semana (0 = domingo ... 6 = sábado)
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

-- Folgas / bloqueios pontuais
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

-- ---------------------------------------------------------------------------
-- Serviço
-- ---------------------------------------------------------------------------
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

-- Quais profissionais executam quais serviços (m2m)
create table service_professionals (
  tenant_id       uuid not null references tenants(id) on delete cascade,
  service_id      uuid not null references services(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  primary key (service_id, professional_id)
);
create index service_professionals_prof_idx on service_professionals(professional_id);

-- ---------------------------------------------------------------------------
-- Cliente (identificado por WhatsApp, único por tenant — popula o CRM sozinho)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Agendamento
-- ---------------------------------------------------------------------------
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

-- Anti double-booking: nenhum profissional pode ter dois horários sobrepostos
-- (exceto cancelados). Regra garantida no banco, não só na aplicação.
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelado');

-- ---------------------------------------------------------------------------
-- Lead: visitou a página pública mas não concluiu (remarketing)
-- ---------------------------------------------------------------------------
create table leads (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text,
  whatsapp   text,
  service_id uuid references services(id) on delete set null,
  created_at timestamptz not null default now()
);
create index leads_tenant_idx on leads(tenant_id, created_at);

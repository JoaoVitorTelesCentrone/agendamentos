-- Recursos do AgendaFlow incorporados ao schema multi-tenant do VÍVIO.
-- A migration é aditiva para preservar bancos já em uso.

alter table tenants
  add column if not exists description text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  add column if not exists card_fee_rate numeric(5, 2) not null default 0 check (card_fee_rate between 0 and 100),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_end timestamptz;

alter table auth_users
  add column if not exists email_verified_at timestamptz,
  add column if not exists session_version integer not null default 0;

alter table clients
  add column if not exists email text,
  add column if not exists updated_at timestamptz not null default now();

alter table appointments
  add column if not exists source text not null default 'public_booking',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists appointment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  type text not null check (type in ('created', 'status_changed', 'rescheduled', 'cancelled')),
  from_status appt_status,
  to_status appt_status,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists appointment_events_tenant_idx on appointment_events(tenant_id, appointment_id, created_at);

create table if not exists availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type text not null default 'block' check (type in ('block', 'open')),
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists availability_exceptions_lookup_idx on availability_exceptions(tenant_id, professional_id, starts_at, ends_at);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null check (char_length(description) between 1 and 140),
  amount_cents integer not null check (amount_cents > 0),
  category text not null check (char_length(category) between 1 and 60),
  cost_type text check (cost_type in ('fixed', 'variable')),
  occurred_on date not null,
  recurring boolean not null default false,
  notes text,
  source text not null default 'manual',
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, source, source_id)
);
create index if not exists transactions_tenant_date_idx on transactions(tenant_id, occurred_on desc);

create table if not exists finance_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  data_hash text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, period)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text unique,
  provider_subscription_id text unique,
  provider_price_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists processed_webhook_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table if not exists password_reset_tokens (
  token_hash text primary key,
  user_id uuid not null references auth_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_user_idx on password_reset_tokens(user_id);

create table if not exists email_verification_tokens (
  token_hash text primary key,
  user_id uuid not null references auth_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists email_verification_tokens_user_idx on email_verification_tokens(user_id);

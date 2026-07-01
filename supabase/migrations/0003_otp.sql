-- VÍVIO — verificação do cliente final por OTP (WhatsApp)
--
-- O cliente final não tem login: prova a posse do número via código OTP antes de
-- concluir o agendamento. Acessada SOMENTE server-side com service_role (sem RLS
-- policies → o painel/anon não lê nada aqui).

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

alter table otp_verifications enable row level security;
-- sem policies: nenhum acesso via anon/authenticated; apenas service_role.

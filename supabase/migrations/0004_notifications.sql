-- VÍVIO — outbox de notificações (confirmação + lembrete anti-no-show)
--
-- Toda mensagem ao cliente vira uma linha aqui. Um processador (cron) envia as
-- que estão vencidas. Envio é assíncrono e nunca bloqueia o agendamento.

create type notification_type   as enum ('confirmation', 'reminder');
create type notification_status as enum ('pending', 'sent', 'failed', 'cancelled');

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

-- índice do processador: pega pendentes vencidas
create index notifications_due_idx on notifications(status, scheduled_for);
create index notifications_appt_idx on notifications(appointment_id);

alter table notifications enable row level security;

-- Painel pode LER o log do próprio tenant. Escrita/envio só via service_role.
create policy notifications_select on notifications for select to authenticated
  using (tenant_id = current_tenant_id());

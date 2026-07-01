-- VÍVIO — Row Level Security
--
-- Modelo de acesso:
--   * Painel (dono/atendente/profissional): usa a anon key autenticada. Só enxerga
--     linhas do próprio tenant via current_tenant_id().
--   * Fluxo público (página /[slug]/public): NÃO usa RLS. Roda server-side em Route
--     Handlers com service_role, que valida status do tenant, disponibilidade e cria
--     cliente + agendamento. O service_role ignora RLS por definição.
--   * Signup/provisionamento de tenant: idem, server-side com service_role.

alter table tenants               enable row level security;
alter table profiles              enable row level security;
alter table professionals         enable row level security;
alter table working_hours         enable row level security;
alter table time_off              enable row level security;
alter table services              enable row level security;
alter table service_professionals enable row level security;
alter table clients               enable row level security;
alter table appointments          enable row level security;
alter table leads                 enable row level security;

-- --- tenants -----------------------------------------------------------------
create policy tenants_select on tenants for select to authenticated
  using (id = current_tenant_id());
create policy tenants_update on tenants for update to authenticated
  using (id = current_tenant_id()) with check (id = current_tenant_id());

-- --- profiles ----------------------------------------------------------------
-- Um usuário vê o próprio profile e os colegas do mesmo tenant.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or tenant_id = current_tenant_id());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- --- tabelas operacionais: acesso total dentro do próprio tenant --------------
-- Helper de macro não existe em SQL puro; repetimos o par de policies por tabela.

create policy professionals_all on professionals for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy working_hours_all on working_hours for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy time_off_all on time_off for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy services_all on services for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy service_professionals_all on service_professionals for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy clients_all on clients for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy appointments_all on appointments for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

create policy leads_all on leads for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());

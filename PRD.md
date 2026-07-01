# PRD — Plataforma de Agendamentos SaaS Multi-Tenant (White-Label)

> **Versão:** Final consolidada
> **Data:** 2026-06-28
> **Vertical âncora:** Salões de beleza e barbearias (estética)
> **Estratégia de MVP:** Mínimo vendável agora — escopo ultra-enxuto
> **Canal:** Venda direta pela software house (revenda/white-label completo só na V2)
> **Stack:** Next.js + TypeScript + Supabase (PostgreSQL + Auth + Storage + RLS) + Tailwind
> **Público deste PRD:** Produto e Engenharia (execução)

---

## 0. Decisões-Chave (Resumo Executivo)

| Decisão | Escolha | Implicação prática |
|---|---|---|
| Vertical âncora | Salões/estética | Mensagem comercial focada; núcleo horizontal, mas copy e templates de salão. |
| Prazo / escopo MVP | "Agora" — ultra-enxuto | Cortar widget embed, multiunidade, dashboard avançado e billing automático do MVP. |
| Canal | Venda direta | White-label completo, domínio próprio e portal de revendedor → V2. |
| Multi-tenancy | `tenant_id` + Supabase RLS | Toda tabela operacional com `tenant_id`; políticas RLS obrigatórias. |
| Billing inicial | Manual | Plano e status geridos no painel Super Admin; cobrança fora do sistema. |
| Notificações MVP | Apenas e-mail | WhatsApp/SMS ficam para V1. |

**O que o MVP entrega para vender já:** um salão cria a conta, cadastra serviços e profissionais, publica um link público, o cliente final agenda sozinho, recebe confirmação por e-mail, e o salão gerencia tudo num painel com agenda e um dashboard simples — tudo isolado por tenant, com Super Admin controlando planos e limites manualmente.

---

## 1. Visão Geral do Produto

### Problema
Salões e barbearias gerenciam agenda por WhatsApp, caderno ou planilha. Isso gera: conflitos de horário, perda de cliente por demora na resposta, trabalho manual do atendente, ausência de confirmação automática, no-show sem controle e nenhuma visão de ocupação/faturamento.

Para a software house, vender projeto sob demanda não escala. Um SaaS multi-tenant white-label gera receita recorrente reaproveitando a mesma base.

### Proposta de Valor
- **Para o salão:** plataforma de agendamento online para organizar clientes, horários, equipe e confirmações em um só lugar, reduzindo no-show e trabalho manual.
- **Para a software house:** SaaS multi-tenant, monetizável por assinatura mensal, com base preparada para white-label/revenda no futuro.

### Diferenciais
- **vs Calendly:** voltado a operação de salão (profissionais, serviços com preço/duração, clientes finais, no-show), não só reuniões.
- **vs Trinks:** base licenciável/white-label e flexível para outros verticais depois.
- **vs SimplesVet:** não tenta ser ERP/sistema clínico; foco em agenda, disponibilidade e recorrência SaaS.

---

## 2. Personas

- **Dono/Gestor do salão** — compra e decide renovar. Quer menos trabalho manual, mais ocupação, menos no-show e visão de faturamento.
- **Atendente/Recepcionista** — opera o dia a dia. Cria, remarca e cancela rápido; evita conflitos; registra no-show.
- **Profissional (cabeleireiro/barbeiro/manicure)** — tem agenda própria. Vê o dia, sabe quem atende, registra conclusão/ausência, bloqueia horários.
- **Cliente final** — agenda sem esperar resposta no WhatsApp; recebe confirmação; remarca/cancela quando permitido.
- **Super Admin (software house)** — cria tenants, define planos/limites e dá suporte.

---

## 3. Arquitetura Multi-Tenant (Supabase)

### Isolamento de dados — `tenant_id` + Row Level Security
**Decisão MVP:** row-level multi-tenancy. Toda tabela operacional carrega `tenant_id` e é protegida por **políticas RLS do Supabase**.

Regras obrigatórias:
- Toda entidade operacional tem `tenant_id NOT NULL`.
- Política RLS por tabela: usuário só acessa linhas do seu tenant. O `tenant_id` do usuário vem de um claim no JWT (custom claim) ou de uma tabela `user_tenant` consultada na policy.
- Super Admin acessa cross-tenant apenas via service role (server-side), nunca pelo cliente, e a ação fica em `audit_log`.
- Índices: `(tenant_id, starts_at)`, `(tenant_id, professional_id, starts_at)`, `(tenant_id, status)`, `(tenant_id, created_at)`.

> **Regra de ouro de segurança:** o front (Next.js client) usa a `anon key` e nunca confia em filtro de aplicação — o isolamento real é a RLS. Operações sensíveis (billing, suspensão, criação de tenant, webhooks) rodam server-side com `service_role` em Route Handlers / Server Actions / Edge Functions.

Alternativa futura (V2): schema por tenant para clientes enterprise/franquia.

### Hierarquia
`Tenant > (Unidade — V2) > Profissional > Agenda`
No MVP de salão assume-se **1 unidade por tenant** (campo `unit` existe no modelo, mas a UI de multiunidade fica para V2).

### Customização por tenant
**[MVP]** nome comercial, logo, cor primária, subdomínio (`salaox.sistema.com`), horário de funcionamento, serviços, profissionais, política básica de cancelamento, página pública de agendamento.
**[V2]** domínio próprio, tema/CSS avançado, remoção total da marca, e-mail com domínio próprio, templates por segmento, portal de revendedor.

#### Stack mapping
- **Auth:** Supabase Auth (e-mail/senha no MVP).
- **DB:** PostgreSQL gerenciado pelo Supabase, RLS ligada.
- **Storage:** Supabase Storage para logo/assets (bucket por tenant ou path `tenant_id/...`).
- **Backend sensível:** Next.js Route Handlers / Server Actions (`service_role`) e/ou Supabase Edge Functions.
- **Tema:** tokens Tailwind por tenant (cor primária via CSS variables carregadas do registro do tenant).

---

## 4. Funcionalidades por Módulo

> Marcações: **[MVP]** = mínimo vendável agora · **[V1]** = retenção/automação · **[V2]** = escala/diferenciação.

### a) Onboarding e configuração do tenant
**[MVP]**
- Criar tenant via painel Super Admin (venda assistida) **e** via self-service.
- Definir nome, logo, cor e subdomínio; criar primeiro usuário admin.
- Checklist inicial: cadastrar serviços → cadastrar profissionais → definir horários → publicar link.
- Status do tenant: `trial`, `ativo`, `inadimplente`, `suspenso`, `cancelado`.

**[V2]** templates por segmento, wizard com recomendações, importação CSV de clientes, onboarding assistido por tarefas internas.

### b) Gestão de serviços
**[MVP]** criar/editar/ativar/desativar; campos: nome, descrição, categoria, duração, preço, tipo (presencial no MVP de salão), profissionais habilitados; serviço pode exigir profissional específico ou aceitar "qualquer disponível".
**[V2]** pacotes, serviços compostos, duração variável por profissional, comissão por serviço, campos por vertical.

### c) Gestão de profissionais
**[MVP]** cadastro; vínculo com serviços; agenda individual; horários de trabalho por dia da semana; bloqueios pontuais; folgas; status ativo/inativo; profissional vê a própria agenda.
**[V2]** recursos não humanos (salas/equipamentos), férias recorrentes, capacidade por recurso, deslocamento para atendimento externo.

### d) Agendamento
**[MVP]**
- Canais: **link público** + **painel interno**. *(Widget embed adiado para V1 — corte de escopo "agora".)*
- Selecionar serviço → profissional ou "qualquer disponível" → data e horário.
- Capturar nome, telefone e e-mail do cliente.
- Criar agendamento (interno e público); **impedir conflitos** (constraint + verificação transacional).
- Status: `agendado`, `confirmado`, `concluído`, `cancelado`, `no-show`.

**[V1]** widget embed. **[V2]** lista de espera, recorrência, encaixe inteligente, campos customizados, upload de arquivos.

### e) Confirmação e notificações
**[MVP]** e-mail de confirmação, cancelamento e reagendamento; log de envio por agendamento; templates básicos por tenant.
**[V1]** lembrete automático antes do horário (anti-no-show), WhatsApp Business API, SMS, antecedência configurável.
**[V2]** sequências anti-no-show, confirmação ativa pelo cliente, templates por segmento, métricas de entrega/abertura.

> Envio de e-mail é **assíncrono** (fila/Edge Function ou cron Supabase) e **nunca bloqueia** a confirmação do agendamento.

### f) Reagendamento e cancelamento
**[MVP]** atendente remarca pelo painel; cliente solicita cancelamento via link (se permitido); política por tenant (antecedência mínima p/ cancelar e remarcar); registro de motivo; horário cancelado volta à disponibilidade.
**[V2]** multa por cancelamento tardio, bloqueio de cliente com excesso de no-show, reagendamento self-service completo, regras por serviço.

### g) Pagamentos
**[MVP]** registrar preço; marcar pagamento como `pendente`/`pago`/`isento`/`cancelado`; registro manual no painel.
**[V1]** sinal/depósito, pagamento integral, Pix, cartão, link de pagamento, status automático via gateway.
**[V2]** reembolso, multa, split, carteira do tenant, repasse a profissionais.

### h) Dashboard e relatórios
**[MVP — mínimo]** agendamentos do dia e da semana; cancelamentos; no-show; serviços mais agendados; profissionais mais agendados; faturamento **previsto** (soma dos serviços agendados).
**[V1]** ocupação por profissional, faturamento realizado, exportação CSV, comparativo mensal.
**[V2]** forecast de demanda, cohort de recorrentes, alertas de queda de ocupação.

### i) Gestão de clientes finais (CRM básico)
**[MVP]** cadastro automático no 1º agendamento; cadastro manual; histórico de agendamentos; tags; observações internas; preferências básicas.
**[V2]** segmentação, campanhas de reativação, consentimentos LGPD avançados, campos customizados, import/export avançado.

### j) Permissões e papéis
**[MVP]** Admin do tenant, Atendente, Profissional, Super Admin. *(Gestor de unidade só faz sentido com multiunidade → V2.)*
- Admin: gerencia tenant, usuários, serviços, profissionais e agenda.
- Atendente: cria/edita/cancela/remarca agendamentos.
- Profissional: vê própria agenda e atualiza status.
- Super Admin: gerencia tenants, planos e suporte.

**[V2]** RBAC granular, permissões customizadas, auditoria por recurso, impersonação controlada.

### k) Planos e billing do SaaS
**[MVP — manual]** criar planos; vincular tenant a plano; limites (usuários, profissionais, agendamentos/mês); status da assinatura; **bloquear novos agendamentos públicos quando suspenso**. Cobrança feita fora do sistema.
**[V1]** cobrança recorrente automática, upgrade/downgrade, faturas, Pix/cartão recorrente, e-mails de cobrança.
**[V2]** planos de revendedor, cobrança por excedente, cupons, add-ons, multi-moeda.

### l) White-label / customização visual
**[MVP]** logo, cor primária, nome comercial, página pública personalizada, subdomínio.
**[V2]** domínio próprio, remoção total de marca, template por segmento, painel com marca do revendedor, e-mail com identidade do tenant.

### m) API e integrações
**[MVP]** estrutura interna preparada (eventos de domínio: `appointment.created`, `appointment.cancelled`, `appointment.rescheduled`), mesmo sem expor publicamente.
**[V1]** Google Calendar, WhatsApp Business API, webhooks externos.
**[V2]** API pública, Zapier/Make, Outlook, CRM/ERP.

---

## 5. Fluxos Principais

### Fluxo 1 — Criação de tenant
**User story:** Como dono de salão, quero criar minha conta e configurar meu salão para começar a receber agendamentos online.

```gherkin
Cenário: Criação self-service de tenant
  Dado que um visitante acessa a página de cadastro
  Quando ele informa nome do salão, nome do responsável, e-mail e senha
  Então o sistema deve criar um tenant com status "trial"
  E deve criar um usuário com papel "admin" via Supabase Auth
  E deve gerar um subdomínio único
  E deve direcionar o usuário ao checklist de configuração inicial

Cenário: Criação assistida pelo Super Admin
  Dado que um Super Admin está autenticado
  Quando ele cria um tenant informando nome do salão, plano, responsável e e-mail do admin
  Então o sistema deve criar o tenant no plano selecionado
  E deve enviar convite ao admin do tenant
  E deve registrar a ação em audit_log

Cenário: Subdomínio já existente
  Dado que já existe um tenant com o subdomínio "salaoalpha"
  Quando outro cadastro tenta usar o mesmo subdomínio
  Então o sistema deve bloquear a criação
  E deve sugerir alternativas disponíveis
```

### Fluxo 2 — Agendamento do cliente final
**User story:** Como cliente final, quero acessar o link do salão e reservar um horário disponível sem falar com um atendente.

```gherkin
Cenário: Cliente final agenda com sucesso
  Dado que o tenant está ativo
  E possui serviço, profissional e horário disponível cadastrados
  Quando o cliente acessa o link público
  E escolhe serviço, profissional, data e horário
  E informa nome, telefone e e-mail
  Então o sistema deve criar o agendamento com status "agendado"
  E deve bloquear o horário para o profissional selecionado
  E deve enviar confirmação por e-mail (de forma assíncrona)
  E deve exibir o agendamento na agenda interna do tenant

Cenário: Horário deixa de estar disponível durante o agendamento (corrida)
  Dado que dois clientes visualizam o mesmo horário disponível
  Quando o primeiro cliente confirma o agendamento
  E o segundo cliente tenta confirmar o mesmo horário
  Então o sistema deve impedir a segunda confirmação (constraint de exclusão no banco)
  E deve solicitar que o segundo cliente escolha outro horário

Cenário: Tenant suspenso recebe tentativa de agendamento público
  Dado que o tenant está com status "suspenso"
  Quando um cliente acessa o link público
  Então o sistema não deve permitir novos agendamentos
  E deve exibir mensagem de agenda temporariamente indisponível
```

> **Nota de engenharia (anti double-booking):** usar uma `EXCLUDE` constraint com `tstzrange` por `(tenant_id, professional_id)` no Postgres, ou índice único equivalente, para garantir a regra no banco e não só na aplicação.

### Fluxo 3 — Cobrança e upgrade/downgrade de plano
**User story:** Como dono do tenant, quero alterar meu plano para adequar limites e funcionalidades ao crescimento.

```gherkin
Cenário: Upgrade de plano
  Dado que um tenant está no plano Starter
  E atingiu o limite de profissionais do plano
  Quando o admin solicita upgrade para o plano Pro
  Então o sistema deve atualizar o plano do tenant
  E deve aplicar os novos limites imediatamente
  E deve registrar o evento no histórico de assinatura

Cenário: Downgrade com uso acima do limite
  Dado que um tenant está no Business com 8 profissionais ativos
  E o plano Pro permite até 5 profissionais
  Quando o admin solicita downgrade para o Pro
  Então o sistema deve informar que o uso atual excede o limite
  E deve impedir o downgrade até a redução do uso

Cenário: Inadimplência e suspensão (V1, billing automático)
  Dado que uma cobrança recorrente falhou
  Quando o prazo de tolerância configurado expira
  Então o sistema deve alterar a assinatura para "inadimplente" ou "suspensa"
  E deve bloquear novos agendamentos públicos se suspensa
  E deve manter o acesso administrativo para regularização
```
> No MVP, upgrade/downgrade e mudança de status são **ações manuais** do Super Admin; a automação chega na V1.

### Fluxo 4 — No-show e remarcação
**User story:** Como atendente, quero marcar um cliente como no-show e oferecer remarcação para reduzir perda de receita.

Critérios objetivos:
- Atendente marca agendamento como `no-show`.
- Sistema registra data, hora e usuário responsável.
- Dashboard atualiza a taxa de no-show.
- Cliente pode receber link de remarcação se o tenant permitir.
- Política de multa fica para V2.

---

## 6. Modelo de Dados (Alto Nível)

> Todas as tabelas operacionais têm `tenant_id` + RLS. Tipos sugeridos para Postgres/Supabase.

### Entidades principais
- **tenant** — empresa cliente (salão). Campos white-label (nome, logo_url, cor_primaria, subdominio, horario_funcionamento), status.
- **user** — usuário admin/operacional (ligado a `auth.users` do Supabase). Papel via **role**.
- **professional** — quem executa o serviço. Liga a tenant, service, appointment, availability_rule.
- **service** — serviço agendável (nome, duração, preço, tipo, profissionais habilitados).
- **appointment** — reserva de horário (`starts_at`, `ends_at` como `tstzrange` ou par de timestamps; status). Liga a tenant, customer, service, professional, unit, payment.
- **customer** — cliente final (nome, telefone, e-mail, tags, observações).
- **plan** — plano comercial (limites e features).
- **subscription** — assinatura do tenant (status, período, limites efetivos).
- **notification** — registro de mensagem enviada (canal, status, payload).

### Entidades recomendadas
- **unit** — unidade/filial (existe no modelo; UI multiunidade só na V2).
- **role** — papel de acesso.
- **payment** — pagamento do agendamento.
- **availability_rule** — disponibilidade por profissional.
- **time_block** — bloqueios, folgas, indisponibilidades.
- **audit_log** — ações sensíveis (alteração de plano, suspensão, exclusão, impersonação, mudança de permissão).
- **resource** — sala/equipamento (V2).

---

## 7. Requisitos Não-Funcionais (metas verificáveis)

### Escalabilidade
- Toda tabela operacional com `tenant_id` + RLS.
- O MVP deve suportar no mínimo: **100 tenants ativos**, **1.000 usuários admin**, **100.000 agendamentos/mês**, **10.000 clientes finais**.
- Consultas de agenda sempre filtradas por `tenant_id` + intervalo de data + profissional.
- Jobs de notificação assíncronos (não bloqueiam criação de agendamento).

### Segurança e LGPD
- Senhas via Supabase Auth (hash gerenciado).
- RLS por tenant; **bloqueio de acesso cross-tenant** validado por testes automatizados.
- `audit_log` para: alteração de plano, suspensão de tenant, exclusão de dados, impersonação, alteração de permissões.
- Consentimento para comunicações; exportação dos dados do cliente final por tenant; anonimização/exclusão sob solicitação (respeitando obrigações legais).
- Evitar dados sensíveis no MVP.

### Disponibilidade / SLA
- **MVP:** disponibilidade alvo **99,5%/mês**; backup diário do banco; retenção ≥ 7 dias; monitoramento de erro em produção; alerta para falhas em criação de agendamento, login e envio de notificação.
- **V1:** SLA **99,9%**, retenção maior, monitoramento por tenant, página de status.

### Performance em pico (ex.: segunda de manhã)
- Página pública carrega em **≤ 2,5 s** em conexão comum.
- Consulta de horários disponíveis responde em **≤ 1 s** para janela de até 30 dias.
- Agenda semanal carrega em **≤ 2 s** para até 20 profissionais.
- Criação de agendamento confirma em **≤ 1,5 s** (sem contar envio assíncrono de notificação).
- Notificações nunca bloqueiam a confirmação.

---

## 8. Modelo de Monetização

### Planos sugeridos (foco salão)
**Starter** — pequenos salões: 1 unidade, até 3 usuários, até 3 profissionais, até 300 agendamentos/mês, link público, e-mail de confirmação, dashboard básico.
**Pro** — em crescimento: até 3 unidades, até 15 usuários, até 15 profissionais, até 2.000 agendamentos/mês, lembretes automáticos (V1), relatórios, widget embed (V1), personalização visual básica.
**Business** — operações maiores: até 10 unidades, até 50 usuários, até 50 profissionais, agendamentos altos/ilimitados com uso justo, permissões avançadas, API/webhooks (V1+), integrações, suporte prioritário, domínio próprio (V2).

### Estratégia de pricing
- Base mensal por tenant.
- Diferenciação por nº de unidades, nº de profissionais, volume de agendamentos, canais de notificação, integrações e white-label avançado.
- Pro é o plano âncora (melhor margem). Starter é entrada; Business para multiunidade/integrações.
- **Add-ons futuros:** pacote WhatsApp, pacote SMS, profissionais/unidades extras, domínio próprio, API, white-label de revendedor.

---

## 9. Roadmap

### MVP — Vender Já (escopo "agora", recortado para salão + venda direta)
Multi-tenant com `tenant_id` + RLS · Painel Super Admin · Criação de tenant (self-service + assistida) · Planos manuais · Login (Supabase Auth) · Papéis básicos (admin, atendente, profissional, super admin) · Serviços · Profissionais · Clientes finais (CRM básico) · Agenda interna · **Link público de agendamento** · Disponibilidade simples · **Confirmação por e-mail** · Cancelamento/remarcação pelo painel · Dashboard básico · Logo, cor e subdomínio por tenant.
*Cortes explícitos do MVP "agora":* widget embed → V1, multiunidade/gestor de unidade → V2, dashboard avançado → V1, billing automático → V1, WhatsApp/SMS → V1, white-label completo → V2.

### V1 — Retenção e Automação
Billing automático · Upgrade/downgrade · Lembretes automáticos · WhatsApp Business API · Pix/cartão para sinal ou pagamento integral · Relatórios melhores · Google Calendar · Exportação CSV · Cancelamento/reagendamento self-service · Widget embed · Templates por segmento.

### V2 — Escala e Diferenciação
Domínio próprio · White-label completo · Portal de revendedor · API pública · Webhooks externos · Campos customizados · Recursos agendáveis · IA para otimização de agenda · Previsão de demanda · Marketplace de profissionais · Planos de revendedor · Integrações CRM/ERP · Multilíngue/multi-moeda.

---

## 10. Riscos e Mitigações

**R1 — Produto genérico demais.** Salão, clínica e academia diferem. *Mitigação:* núcleo horizontal (serviços, profissionais, clientes, agenda, notificações) + venda focada em **salão/estética** primeiro; clínicas só depois e sem prontuário/convênio.

**R2 — Vazamento entre tenants.** Falha crítica de SaaS. *Mitigação:* `tenant_id` obrigatório + **RLS do Supabase**, testes automatizados de acesso cross-tenant, operações sensíveis só com `service_role` server-side, `audit_log` em ações sensíveis.

**R3 — Complexidade de disponibilidade.** Folgas, bloqueios, recursos, recorrência escalam rápido. *Mitigação:* MVP usa disponibilidade simples (horário do tenant + horário do profissional + duração do serviço + bloqueios + agendamentos existentes). Recursos, deslocamento e recorrência → V2.

**R4 — Dependência de WhatsApp.** Salões esperam WhatsApp. *Mitigação:* MVP com e-mail; WhatsApp na V1 vendido como evolução próxima; vender MVP para salões que aceitam link + e-mail.

**R5 — Billing complexo cedo demais.** *Mitigação:* MVP com plano/status manuais; software house cobra fora do sistema; automação na V1.

**R6 — Double-booking (corrida de horário).** *Mitigação:* garantir a regra no banco (constraint `EXCLUDE`/índice único por profissional+intervalo), não apenas na aplicação.

---

## Recomendação Final

Vender o MVP como: **"Plataforma de agendamentos online para salões e barbearias organizarem clientes, equipe e horários, com confirmação automática por e-mail e gestão multi-tenant para a software house."**

Entregar agora, no menor escopo vendável:
1. Tenant isolado (RLS).
2. Agenda funcional + anti double-booking.
3. Link público.
4. Serviços e profissionais.
5. Cliente final agendando sem suporte.
6. Confirmação automática por e-mail.
7. Painel Super Admin.
8. Planos e limites manuais.

O produto nasce flexível para múltiplos verticais, mas a **venda inicial é focada em salão/estética e direta** — isso reduz escopo, melhora a mensagem comercial e acelera a validação do SaaS.

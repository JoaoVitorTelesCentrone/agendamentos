# Integração AgendaFlow

O AgendaFlow em `frontend/apps/web` é a aplicação canônica, com identidade para profissionais de serviços em geral. A branch `archive/agendaflow-standalone` preserva no GitHub o snapshot anterior à incorporação. O trabalho integrado está na branch `integration/unificar-produtos`.

## Entregue nesta etapa

- Migração SQL aditiva para os campos e tabelas de finanças, assinatura, auditoria, recuperação de senha e exceções de disponibilidade.
- Recuperação e redefinição de senha com tokens temporários, limitação de tentativas e revogação das sessões anteriores.
- Financeiro mensal, lançamentos manuais, estimativa de taxas e lucro, e configuração de imposto/taxa de cartão.
- Marketing com lista de clientes sem retorno recente e links de reativação via WhatsApp.
- Exceções de disponibilidade, trilha de auditoria de agendamentos e limite de três serviços no plano gratuito.
- Stripe Checkout, portal de cobrança e webhook assinado com registro idempotente.
- Migrações de atualização integradas ao bootstrap Docker e script `migrate:upgrades` para uso local.
- Layout das novas áreas seguindo os componentes e tokens visuais da aplicação externa.

## Configuração externa necessária

Para e-mails em produção, defina `APP_URL`, `RESEND_API_KEY` e `RESEND_FROM` no ambiente do serviço web. Para cobrança, defina `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` e `STRIPE_WEBHOOK_SECRET`; no Stripe, cadastre `/api/stripe/webhook` e os eventos de checkout e assinatura usados pelo app. Sem essas credenciais, as telas e rotas compilam, mas os serviços externos não enviam mensagens nem cobram assinaturas.

Em um banco já existente, aplique as migrations aditivas antes de publicar a aplicação. No Docker Compose, `db_init` faz isso automaticamente no início. Em desenvolvimento nativo, rode `bun run migrate:upgrades` em `frontend/apps/web` com `DATABASE_URL` configurada.

## Pendências antes de uma migração de produção

- Exportar e importar dados reais do banco Prisma do AgendaFlow. A origem não foi conectada nem validada; portanto, nenhum dado de clientes ou agendamentos foi copiado.
- Portar a verificação de e-mail e a exclusão de conta com política explícita de retenção.
- Portar os insights financeiros de IA como recurso opcional com cache.
- Adaptar e executar a suíte E2E e ensaiar migration, backup e restauração em ambiente isolado.
- Configurar e validar Resend, Stripe e domínio no ambiente de homologação.

O build de produção, o typecheck, o lint e os testes unitários passaram nesta etapa. O lint mantém quatro avisos já existentes em componentes fora das áreas adicionadas.

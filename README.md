# AgendaFlow

Agenda online para profissionais que atendem com hora marcada. O projeto usa Next.js 16, Prisma/PostgreSQL, Auth.js, Resend e Stripe.

## Desenvolvimento local

```bash
npm ci
npm run dev:all
```

`dev:all` inicia o Prisma Postgres local, sincroniza o esquema para desenvolvimento e sobe o Next.js. A porta padrão é 3000. Para outra porta, use `PORT=3002 npm run dev:all` (PowerShell: `$env:PORT='3002'; npm run dev:all`).

Com um PostgreSQL já configurado em `DATABASE_URL`, use `npm run dev`. Configure `AUTH_SECRET`, `AUTH_URL` e `DATABASE_URL` no ambiente. Google, Resend e Stripe são integrações opcionais no desenvolvimento local e exigem as respectivas credenciais em produção.

## Banco de dados e migrações

A migração inicial versionada está em `prisma/migrations/20260922000000_baseline`. Num banco **vazio**, aplique:

```bash
npx prisma migrate deploy
```

Se o banco já foi criado com `prisma db push`, confira primeiro se o esquema corresponde ao arquivo Prisma. Só depois marque a migração inicial como aplicada, sem recriar tabelas:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
npx prisma migrate resolve --applied 20260922000000_baseline
```

Faça backup antes de migrar um banco com dados reais. Nas próximas alterações, gere uma nova migração com `npx prisma migrate dev --name descricao`, revise o SQL e aplique em produção com `npx prisma migrate deploy`. `db push` é reservado ao banco local descartável.

Para vincular agendamentos antigos aos clientes e preencher duração/fuso, execute `npm run db:backfill` depois da migração. O script só atualiza registros incompletos e pode ser repetido.

## E-mail e assinatura

- Cadastro por e-mail libera o acesso imediatamente, sem confirmação; senha mínima de 10 caracteres.
- Para e-mails reais, configure `RESEND_API_KEY` e `RESEND_FROM` com domínio verificado.
- Para a assinatura Pro, configure `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` e `STRIPE_WEBHOOK_SECRET`.
- Sem Resend, a recuperação de senha mostra um link local apenas em desenvolvimento. O agendamento continua salvo, mas não há confirmação por e-mail.

## Verificação

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e
```

A suíte E2E usa a instância Prisma local `agendaflow-e2e` na porta 51314 e apaga os dados **dessa instância** antes de cada execução. O servidor de desenvolvimento normal deve estar parado ao executá-la, pois o Next.js utiliza o mesmo diretório `.next`.

# Deploy: Vercel + Render + Neon

O projeto tem duas partes que compartilham um PostgreSQL/Neon:

- **Vercel** hospeda o frontend Next.js e as rotas internas usadas pelo painel.
- **Render** hospeda a API Hono em `backend/`.
- **Neon/PostgreSQL** persiste os dados. Use a mesma `DATABASE_URL` nos dois provedores.

## 1. Criar e inicializar o banco

Crie um projeto PostgreSQL na Neon e copie a connection string com SSL.

Com a variável `DATABASE_URL` apontando para um **banco vazio**, rode uma única vez:

```powershell
cd frontend/apps/web
bun install --frozen-lockfile
bun run migrate
```

`bun run migrate` recria o schema do frontend. Ele é destrutivo e só deve ser
executado em um banco novo ou descartável. Depois disso, não o rode novamente
em produção.

O backend cria suas tabelas persistentes `booking_*` automaticamente ao subir,
sem apagar dados e sem colidir com as tabelas do frontend.

## 2. Publicar o frontend na Vercel

Importe este repositório e configure **Root Directory** como `frontend`.
Adicione em *Settings → Environment Variables*:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string da Neon. |
| `AUTH_SECRET` | Sim | Sessão httpOnly do painel. |
| `OTP_DEV_MODE` | Sim | `false` em produção; `true` apenas para testes. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Para WhatsApp real | Entrega de OTP e notificações. |
| `TWILIO_TEMPLATE_OTP_SID`, `TWILIO_TEMPLATE_CONFIRMATION_SID`, `TWILIO_TEMPLATE_REMINDER_SID` | Recomendadas para produção | Templates aprovados pela Meta/Twilio. |
| `CRON_SECRET` | Somente se houver um agendador externo | Protege a rota de notificações. |

Não há cron configurado para a Vercel neste repositório. Se quiser processar
lembretes, use um agendador externo que chame `GET /api/cron/notifications`
com `Authorization: Bearer <CRON_SECRET>`.

## 3. Publicar a API no Render

No Render, use **New → Blueprint**, selecione a branch `master` e o arquivo
`render.yaml` da raiz. Informe:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | A mesma connection string da Neon. |
| `JWT_SECRET` | Sim | Assinatura dos tokens Bearer da API. |

O `PORT` é fornecido pelo Render. Após o deploy, confirme
`https://<seu-servico>.onrender.com/health`.

## Nota de arquitetura

O painel Next.js ainda acessa o banco diretamente por suas rotas e server
actions. A API Hono é uma API persistente independente para integrações e
clientes externos. Transformar o painel inteiro em um cliente REST da Hono é
uma migração de produto separada, não um requisito para publicar o site atual.

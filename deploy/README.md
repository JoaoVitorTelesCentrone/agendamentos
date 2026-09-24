# AgendaFlow em PostgreSQL próprio

## Plano

1. **Local:** instalar as dependências, gerar segredos e subir PostgreSQL + site com Docker Compose. Validar cadastro, login e agendamento. O OTP aparece na resposta apenas na configuração local.
2. **VM:** preparar uma VM Linux com Docker Compose, DNS apontando para ela e firewall liberando somente SSH, 80 e 443. Usar os mesmos arquivos `compose.yaml` e `compose.prod.yaml`.
3. **Dados:** se houver dados válidos na Neon, exportar com `pg_dump` e importar em um banco novo na VM antes de liberar usuários. As credenciais Neon atualmente configuradas no desenvolvimento falham na autenticação; não há migração de dados automática.
4. **Operação:** backup diário fora da VM, teste de restauração, atualização periódica das imagens e monitoramento de `/api/health`.

## Local com Docker (Windows)

Abra o Docker Desktop. Na raiz do repositório:

```powershell
Copy-Item .env.example .env
.\deploy\init-secrets.ps1
docker compose -f compose.yaml -f compose.local.yaml up -d --build
docker compose -f compose.yaml -f compose.local.yaml ps
```

Abra <http://localhost:3000>. O banco fica somente na rede interna do Compose. Para ver tabelas:

```powershell
docker compose -f compose.yaml -f compose.local.yaml exec db psql -U vivio -d vivio -c '\dt'
```

O serviço `db_init` aplica `frontend/apps/web/db/schema.sql` somente se o banco estiver vazio; se já houver tabelas, verifica o esquema e aplica apenas migrações aditivas. **Não execute `docker compose down -v` se houver dados a preservar.** O comando `bun run migrate` também recusa bancos que já tenham tabelas.

Para rodar `bun run dev` fora do container usando o mesmo banco, execute `.\deploy\use-local-db.ps1` uma vez e depois `bun run dev` em `frontend/apps/web`. A configuração local publica o PostgreSQL apenas em `127.0.0.1:55432`; a configuração da VM não publica o banco. Se já houver um site Docker em 3000, pare somente o serviço `web` ou escolha outra porta para o Next nativo.

Se a porta 3000 estiver ocupada, altere `WEB_PORT` em `.env`. O modo local permite OTP de desenvolvimento para testar a agenda sem Twilio; use essa configuração somente em uma máquina local.

## VM Linux

Pré-requisitos: Docker Engine + plugin Compose, domínio apontando para o IP da VM, portas 80/443 abertas para o Caddy, SSH restrito por chave. Não publique a porta 5432. Na raiz do checkout:

```sh
cp .env.example .env
# Edite DOMAIN em .env para o domínio real.
sh deploy/init-secrets.sh
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
docker compose -f compose.yaml -f compose.prod.yaml ps
```

`deploy/secrets/` contém senhas e chaves; não entra no Git. No Linux, o gerador cria arquivos com permissões restritas. O site usa `vivio_app`, sem permissão para criar ou apagar tabelas; `pg_password` fica apenas no banco e no serviço de inicialização. Guarde uma cópia segura dos segredos: perder `auth_secret` invalida sessões; perder as senhas do banco impede acesso. O site sobe sem Twilio, mas o OTP/WhatsApp não funciona em produção até configurar as demais variáveis Twilio em `.env`, preencher `deploy/secrets/twilio_auth_token` e configurar templates aprovados. Nunca use `compose.local.yaml` na VM.

O Caddy obtém e renova HTTPS para `DOMAIN`; exige DNS correto e portas 80/443 acessíveis. O site também escuta em `127.0.0.1:3000` na própria VM para diagnóstico, mas não fica exposto externamente. Para atualizar:

```sh
git pull --ff-only
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Faça backup **antes** de atualizar código ou imagens. Mudanças futuras no esquema devem usar migrações aditivas revisadas; o schema inicial nunca deve ser aplicado sobre um banco em uso.

## Migração dos dados da Neon

O app aceita `DATABASE_URL` com PostgreSQL padrão, mas a configuração atual da Neon usa uma senha inválida. Corrija o acesso à origem antes de exportar. Use a conexão direta (sem pooler) da Neon e mantenha a senha fora do histórico do shell, por exemplo em um arquivo de serviço/`PGPASSFILE`. Em uma janela de manutenção, pare novos cadastros e agendamentos. Em uma máquina confiável:

```sh
pg_dump --dbname="$NEON_DATABASE_URL" -Fc --no-owner --no-acl -f vivio-neon.dump
pg_restore --list vivio-neon.dump > vivio-neon-contents.txt
```

Transfira o arquivo por um canal seguro. Na VM, após criar `.env` e `deploy/secrets/`, mas **antes** de iniciar o site:

```sh
docker compose -f compose.yaml -f compose.prod.yaml up -d db
docker compose -f compose.yaml -f compose.prod.yaml exec -T db \
  pg_restore --no-owner --no-acl -U vivio -d vivio < vivio-neon.dump
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Os nomes `vivio` dos comandos acima são os padrões de `.env.example`; ajuste se alterou `POSTGRES_DB` ou `POSTGRES_USER`. O destino deve estar vazio. Confira a versão major do PostgreSQL na origem antes da importação; se for diferente da imagem `postgres:17-alpine`, planeje a compatibilidade antes de criar o volume definitivo. `db_init` verificará as tabelas restauradas sem apagá-las. Valide contagens, login, agenda e agendamento antes de apontar o DNS. Se a origem tiver um esquema Supabase antigo em vez do esquema PostgreSQL atual, a restauração exigirá uma conversão específica antes deste passo.

O backend Hono em `backend/` é uma API separada. O site Next.js usa suas próprias rotas `/api` e seu próprio esquema; este Compose publica apenas o site que está em `localhost:3000`.

## Backups

Na VM, `sh deploy/backup.sh` cria um dump em `backups/` com permissões restritas. Agende o script diariamente e copie cada dump para **fora da VM**, em armazenamento com acesso separado. Mantenha retenção e teste periodicamente a restauração em um banco isolado. Um volume Docker na mesma VM não substitui backup externo.

Para uma restauração, use uma instância nova, aplique `pg_restore --no-owner --no-acl` no banco vazio e só então aponte o app para ela. Não restaure por cima de um banco em uso.

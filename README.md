# AgendaFlow

Aplicação de agendamentos multiempresa para profissionais de serviços em geral. A aplicação web canônica fica em `frontend/apps/web` e usa Next.js, Bun/Turbo e PostgreSQL.

## Desenvolvimento

Consulte [`deploy/README.md`](deploy/README.md) para iniciar o PostgreSQL e o app localmente ou preparar uma VM. As mudanças de banco são aditivas e aplicadas pelo serviço `db_init`; para executar migrations em um ambiente nativo, use `bun run migrate:upgrades` dentro de `frontend/apps/web`.

## Integração AgendaFlow

Os recursos portados e os passos ainda necessários para uma migração de produção estão em [`INTEGRACAO-STATUS.md`](INTEGRACAO-STATUS.md). O histórico original do AgendaFlow está preservado no GitHub na branch `archive/agendaflow-standalone`; o trabalho integrado está em `integration/unificar-produtos`.

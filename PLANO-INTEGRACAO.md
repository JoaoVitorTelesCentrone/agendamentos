# Plano de integração — AgendaFlow

## Objetivo

Consolidar os dois projetos em uma única aplicação e um único repositório GitHub, usando o projeto externo como base canônica e preservando sua identidade visual. Os recursos úteis do AgendaFlow serão portados por domínio, sem carregar sua segunda aplicação, seu segundo sistema de autenticação ou seu segundo modelo de dados.

## Decisão de arquitetura

- **Base canônica:** projeto externo em `frontend/apps/web`.
- **Produto e marca:** AgendaFlow, para profissionais de serviços em geral.
- **Repositório canônico:** `JoaoVitorTelesCentrone/agendamentos`.
- **Frontend:** Next.js 16 no monorepo Bun/Turbo existente.
- **Banco:** PostgreSQL e migrations SQL do projeto externo.
- **Autenticação:** sessão/JWT e `auth_users` do projeto externo, ampliados com recuperação e verificação de e-mail.
- **Multiempresa:** `tenants`, `profiles` e escopo obrigatório por `tenant_id`.
- **Deploy:** Docker Compose, Caddy e PostgreSQL próprio já documentados no projeto externo.
- **Código a portar:** regras de negócio e fluxos do AgendaFlow externo, adaptados à aplicação canônica.
- **Código a aposentar:** Prisma, Auth.js, `package-lock.json` e a aplicação Next.js interna depois que seus recursos forem migrados e validados.

Essa escolha evita manter dois ORMs, dois gerenciadores de pacotes, dois sistemas de sessão e duas representações incompatíveis da mesma empresa e do mesmo agendamento.

## Diagnóstico atual

### O projeto externo já entrega melhor

- identidade visual externa e componentes compartilhados, com posicionamento amplo para prestadores de serviço;
- multiempresa e papéis de usuário;
- profissionais e vínculo entre profissional e serviço;
- prevenção de choque de horários no próprio PostgreSQL;
- agenda, clientes, serviços e página pública;
- OTP e notificações por WhatsApp;
- captura de leads e quiz de onboarding;
- isolamento por tenant no acesso ao banco;
- deploy com Docker, HTTPS e rotina de backup.

### O AgendaFlow tem recursos que devem ser aproveitados

- recuperação, redefinição e verificação de e-mail;
- cobrança e portal de assinatura com Stripe;
- receitas, despesas e indicadores financeiros;
- insights financeiros com IA;
- exceções de disponibilidade;
- histórico de eventos do agendamento;
- agendamento manual e filtros mais completos;
- área de marketing e mensagens prontas;
- exclusão de conta;
- suíte E2E cobrindo os fluxos principais.

### Recursos sobrepostos

Serviços, clientes, agenda, disponibilidade, configurações, dashboard e agendamento público existem nos dois projetos. A aplicação canônica mantém a estrutura visual externa, agora com a marca AgendaFlow e comunicação voltada a profissionais de serviços em geral.

## Contrato visual

As áreas devem seguir a identidade do AgendaFlow e funcionar para diferentes tipos de prestadores:

- **Cores:** continuar usando os tokens atuais em OKLCH: papel quente, verde tinta, acento quente, `money`, `success` e estados destrutivos.
- **Tipografia:** Archivo em títulos, Instrument Sans na interface e Geist Mono apenas onde números técnicos se beneficiem disso.
- **Layout:** manter navegação lateral no desktop e horizontal no mobile; conteúdo alinhado à esquerda; largura de leitura controlada; valores financeiros com numerais tabulares e o token `money`.
- **Componentes:** ampliar `frontend/packages/ui`; não copiar a pasta `components/ui` do AgendaFlow inteira.
- **Movimento:** manter transições ligadas a ações e estados; evitar animações decorativas repetidas.
- **Responsividade e acesso:** foco visível, teclado, contraste, estados vazios úteis e `prefers-reduced-motion` em toda tela nova.

Revisão do direcionamento: o sistema atual já usa gradientes, cartões arredondados e sombras. Nas telas novas, esses recursos devem marcar hierarquia real, especialmente resumo financeiro e plano contratado, para evitar que todas as áreas virem uma grade de cartões iguais.

## Mapeamento de dados

| AgendaFlow | Destino na aplicação canônica | Tratamento |
|---|---|---|
| `User` | `auth_users` + `profiles` | Adicionar campos de verificação e recuperação; manter UUID. |
| `Business` | `tenants` | Acrescentar descrição, telefone, endereço, fuso e parâmetros financeiros. |
| `Service` | `services` | Manter preço em centavos e vínculos com profissionais. |
| `Customer` | `clients` | Acrescentar e-mail e datas de atualização; preservar WhatsApp como chave do tenant. |
| `Appointment` | `appointments` | Acrescentar origem e `updated_at`; dados do cliente continuam normalizados. |
| `AppointmentEvent` | nova `appointment_events` | Auditoria de criação, status, remarcação e cancelamento. |
| `Availability` | `working_hours` | O modelo externo por profissional é mais completo. |
| `AvailabilityException` | `time_off` + exceção de abertura | Bloqueios entram em `time_off`; criar suporte explícito para abertura extraordinária. |
| `Transaction` | nova `transactions` | Sempre com `tenant_id`, valores em centavos e índices por data. |
| `FinanceInsight` | nova `finance_insights` | Cache por tenant, período e hash dos dados. |
| `Plan` e Stripe | `tenants` + nova `subscriptions` | Separar estado comercial da empresa dos identificadores e eventos da assinatura. |
| `AuthRateLimit` | `request_limits` | Reutilizar o limitador existente e criar chaves específicas por fluxo. |

Todas as mudanças serão migrations aditivas. Nenhuma migration deve apagar ou renomear dados em produção na primeira passagem.

## Fases de execução

### Fase 0 — Preservar os dois históricos

1. Criar um commit de checkpoint para as alterações atuais do projeto externo em uma branch de integração.
2. No repositório interno, conferir `.gitignore`, excluir segredos e artefatos e criar um commit com os 147 arquivos hoje não rastreados.
3. Publicar o histórico interno como branch de arquivo no mesmo GitHub, por exemplo `archive/agendaflow-standalone`, sem mesclar históricos não relacionados na `master`.
4. Criar a branch de trabalho `integration/unificar-produtos` a partir do checkpoint externo.
5. Registrar uma tabela de paridade dos fluxos antes de remover a pasta interna.

**Saída:** os dois estados atuais podem ser recuperados pelo GitHub e nenhum `.env`, relatório ou build foi publicado.

### Fase 1 — Fechar a fundação canônica

1. Confirmar `frontend/apps/web` como a única aplicação web publicada.
2. Confirmar Bun como único gerenciador de pacotes e manter um único lockfile.
3. Remover referências antigas e não utilizadas de Supabase somente depois de confirmar que nenhum ambiente ativo depende delas.
4. Documentar o banco PostgreSQL, o fluxo de migrations e as variáveis de ambiente válidas.
5. Revisar todo acesso administrativo ao banco para exigir filtro explícito de tenant; reforçar o isolamento também no PostgreSQL quando viável.

**Saída:** uma única stack local sobe com um comando e não existem caminhos concorrentes de autenticação ou persistência.

### Fase 2 — Unificar o modelo de dados

1. Criar migrations aditivas para identidade, clientes, auditoria, disponibilidade, financeiro e assinatura.
2. Criar adaptadores temporários de importação do modelo Prisma para o modelo canônico.
3. Definir conversões de status, CUID para UUID, datas/fusos e decimal para centavos.
4. Executar a importação primeiro em banco descartável e produzir relatório de contagens e rejeições.
5. Validar constraints de tenant e de conflito de horários após a importação.

**Saída:** o schema canônico representa todos os recursos escolhidos e aceita dados dos dois modelos sem perda silenciosa.

### Fase 3 — Conta e segurança

1. Portar recuperação e redefinição de senha para a autenticação existente.
2. Portar verificação de e-mail e envio via Resend.
3. Manter Google OAuth fora do primeiro corte; adicioná-lo depois por vínculo seguro à conta existente, se continuar necessário.
4. Portar exclusão de conta com confirmação, revogação de sessão e política clara de retenção.
5. Aplicar limitação de requisições em login, cadastro, recuperação, OTP e endpoints públicos.

**Saída:** cadastro, login, logout, recuperação e exclusão funcionam no mesmo sistema de sessão.

### Fase 4 — Agenda e operação

1. Comparar o fluxo público dos dois projetos e manter o wizard visual da aplicação canônica.
2. Incorporar exceções de disponibilidade, agendamento manual, filtros e histórico do agendamento.
3. Preservar profissionais, serviço por profissional, OTP, leads e notificações existentes.
4. Centralizar cálculo de slots, fuso horário e validação de choque em módulos compartilhados.
5. Garantir idempotência na criação e nos webhooks relacionados a agendamentos.

**Saída:** um único fluxo cria, remarca, cancela e acompanha agendamentos sem duplicidade.

### Fase 5 — Financeiro, marketing e insights

1. Portar receitas e despesas para `/painel/financeiro` com os componentes visuais existentes.
2. Gerar receita a partir de atendimento concluído sem duplicar transações.
3. Portar indicadores de imposto, taxa de cartão, custos fixos e variáveis.
4. Portar os insights com IA como recurso opcional e com cache por período.
5. Incorporar mensagens de reativação e compartilhamento à área de clientes/marketing.

**Saída:** o financeiro fecha por período, explica a origem dos valores e funciona sem a integração de IA.

### Fase 6 — Planos e Stripe

1. Definir os limites de Free e Pro antes de portar a interface de preços.
2. Criar checkout, portal do cliente e webhook sobre a nova tabela `subscriptions`.
3. Verificar assinatura de webhook e tornar o processamento idempotente.
4. Aplicar permissões no servidor, além de esconder ações na interface.
5. Integrar o estado da assinatura à identidade visual e às mensagens do AgendaFlow.

**Saída:** upgrade, renovação, falha de pagamento e cancelamento atualizam o tenant corretamente.

### Fase 7 — Qualidade e lançamento

1. Adaptar a suíte E2E do AgendaFlow para os caminhos e seletores da aplicação canônica.
2. Cobrir cadastro, login, configuração inicial, serviços, profissionais, disponibilidade, agenda, fluxo público, clientes, financeiro e assinatura.
3. Validar desktop e mobile nas larguras usadas pelo produto.
4. Fazer ensaio de backup, migration e restauração em ambiente isolado.
5. Fazer deploy de homologação pela branch de integração e executar a lista de paridade.
6. Mesclar por pull request na `master`, criar tag de versão e promover a mesma imagem validada para produção.

**Saída:** aplicação única publicada, observável e recuperável.

### Fase 8 — Encerrar a duplicação

1. Confirmar que a branch de arquivo do AgendaFlow está no GitHub.
2. Remover a pasta `agendamentos/agendamentos` da branch principal.
3. Remover dependências, documentação e variáveis que ficaram obsoletas.
4. Atualizar README, PRD e guia de deploy para apontarem apenas para a arquitetura final.

**Saída:** um repositório, uma aplicação, um banco, um sistema visual e uma documentação vigente.

## Estratégia de commits e pull requests

Cada fase deve produzir commits pequenos por domínio, sem misturar migration, regra de negócio e remodelagem visual no mesmo commit. A ordem sugerida de pull requests é:

1. checkpoint e documentação;
2. schema e importador;
3. conta e segurança;
4. agenda e disponibilidade;
5. financeiro e marketing;
6. Stripe;
7. E2E, deploy e limpeza final.

Cada PR deve incluir migration reversível ou plano de rollback, capturas das telas alteradas, variáveis novas e resultado da validação do isolamento entre tenants.

## Critérios de conclusão

- somente `frontend/apps/web` é implantado;
- somente Bun/Turbo e um lockfile permanecem;
- nenhum segredo está rastreado;
- todos os dados de negócio carregam `tenant_id` e não vazam entre empresas;
- não é possível reservar horários sobrepostos para o mesmo profissional;
- Stripe e notificações toleram reentrega sem duplicar efeitos;
- os fluxos principais possuem cobertura E2E;
- as telas seguem os tokens e componentes do AgendaFlow e a comunicação atende a vários segmentos de serviço;
- o histórico original do AgendaFlow continua recuperável no GitHub;
- backup e restauração foram ensaiados antes do lançamento.

## Ordem recomendada de entrega

Para reduzir risco e colocar valor em produção cedo: **fundação → conta → agenda → financeiro/marketing → Stripe → limpeza**. Em dedicação integral de uma pessoa, o trabalho representa aproximadamente quatro a seis semanas, dependendo do volume real de dados a importar e do nível de acabamento desejado para financeiro e cobrança.

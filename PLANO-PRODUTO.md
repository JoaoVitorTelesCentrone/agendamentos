# Plano de produto e lançamento — AgendaFlow

Este plano cruza a visão de `guia.md`, a análise de `concorrentes.md` e o estado atual do código. O objetivo é chegar a um produto confiável para venda e preservar a tese que pode diferenciá-lo: transformar dados da agenda em ações simples para manter a agenda cheia.

## 1. Decisão de produto

### Posicionamento

**Organize sua agenda. Entenda seus clientes. Saiba o que fazer para trazer mais gente de volta.**

O produto entra pela agenda, retém pelo histórico de clientes e se diferencia pelas oportunidades recomendadas.

### Público inicial

Começar com profissionais autônomos e pequenos negócios de beleza e bem-estar que trabalham com hora marcada, até cinco profissionais:

- barbearias;
- salões e studios;
- manicure e estética;
- massagistas e terapeutas não clínicos;
- personal trainers.

Esse recorte permite uma experiência específica sem impedir expansão futura.

### O que fica fora do lançamento

- gateway de pagamento para clientes do estabelecimento;
- estoque, PDV, folha e comissão complexa;
- marketplace;
- geração livre de imagens;
- múltiplas unidades;
- automações sem revisão do usuário.

Stripe continua sendo usado apenas para cobrar a assinatura do SaaS.

## 2. Diagnóstico atual

### Já existe e deve ser aproveitado

- cadastro por e-mail, confirmação, recuperação de senha e Google;
- cadastro de negócio, serviços e disponibilidade semanal;
- página pública e fluxo de agendamento;
- painel de agendamentos e mudança de status;
- assinatura SaaS pelo Stripe;
- controle financeiro simples e insights;
- análise de clientes atrasados, ocupação e serviços no módulo de Marketing;
- mensagens prontas para WhatsApp e link/QR da agenda;
- testes de ponta a ponta para os fluxos atuais;
- landing page e demonstração interativa.

### Bloqueios para lançar com confiança

1. **Conflito de agenda:** o servidor cria o agendamento sem revalidar o horário em uma operação atômica. Duas pessoas podem reservar o mesmo horário.
2. **Duração e sobreposição:** a disponibilidade compara apenas o horário inicial e não bloqueia intervalos sobrepostos de serviços com durações diferentes.
3. **Vínculo incorreto:** a API pública aceita `businessId` e `serviceId` separados sem garantir que o serviço pertence ao negócio e está ativo.
4. **Fuso horário:** parte da lógica está fixa em `America/Sao_Paulo` e parte usa o fuso do navegador, apesar de o negócio ter um campo próprio.
5. **Modelo insuficiente:** cliente é texto repetido no agendamento; não existem entidades de organização, membro ou profissional.
6. **Agenda operacional incompleta:** faltam criação manual, edição, remarcação, visualizações de dia/semana/mês, bloqueios e exceções de disponibilidade.
7. **Status incompletos:** falta “não compareceu” e um histórico de alterações.
8. **Comunicação frágil:** e-mails são enviados dentro da requisição, sem fila, tentativas, lembretes ou rastreamento de entrega.
9. **Onboarding curto demais:** hoje cria apenas nome e link, sem conduzir serviço, horário, profissional e publicação.
10. **Planos incoerentes:** o código vende Grátis/Pro por R$ 29; os documentos propõem Pro/Ultra por cerca de R$ 149/R$ 349 com entregas que ainda não existem.
11. **Operação de produção:** não há migrations versionadas, monitoramento de erros, analytics de produto, rotina de backup documentada nem páginas legais.

## 3. Arquitetura de domínio necessária

Evoluir o banco sem interromper os dados atuais:

```text
Organization
├── Membership (dono, administrador, profissional)
├── Professional
├── Service
├── ProfessionalService
├── AvailabilityRule
├── AvailabilityException
├── Customer
├── Appointment
│   └── AppointmentEvent
├── Campaign
├── CampaignRecipient
├── ReferralProgram
├── Referral
└── Opportunity
```

Regras centrais:

- toda consulta interna recebe `organizationId` no servidor;
- um usuário pode participar de mais de uma organização;
- um profissional pode executar vários serviços;
- cliente é identificado por organização e telefone/e-mail normalizado;
- agendamento guarda cliente, profissional, serviço, início, fim, origem e status;
- alterações importantes geram eventos auditáveis;
- oportunidades são dados persistidos com tipo, explicação, impacto, ação e estado.

## 4. Roadmap de execução

### Etapa 0 — Alinhar produto e limpar promessas

Objetivo: garantir que site, preço e produto contem a mesma história.

- escolher beleza e bem-estar como mercado inicial;
- atualizar landing page para incluir o diferencial “agenda que recomenda ações”;
- manter plano grátis durante beta;
- não anunciar Pro de R$ 149 nem Ultra de R$ 349 antes dos respectivos recursos existirem;
- retirar ou marcar como beta qualquer promessa sem entrega real;
- definir eventos principais: conta criada, agenda publicada, primeiro serviço, primeiro agendamento, primeiro atendimento concluído e primeira oportunidade executada.

Pronto quando toda promessa pública puder ser demonstrada no produto.

### Etapa 1 — Blindar o agendamento

Objetivo: tornar o núcleo confiável antes de ampliar funcionalidades.

- validar no servidor negócio, serviço ativo, profissional, disponibilidade, data futura e duração;
- calcular sobreposição por intervalo (`startAt < novoFim` e `endAt > novoInício`);
- reservar o horário em transação com proteção contra concorrência;
- armazenar `startAt`, `endAt` e fuso IANA da organização;
- suportar intervalo entre atendimentos;
- adicionar bloqueios, folgas, feriados e horários especiais;
- incluir status `NO_SHOW` e regras válidas de transição;
- criar/remarcar/cancelar agendamento pelo painel;
- criar visualizações de dia e semana; mês pode ser um resumo;
- adicionar link seguro para o cliente cancelar ou pedir remarcação;
- aplicar limite de requisições e proteção antispam no booking público;
- versionar a primeira migration e criar estratégia de migração dos dados existentes.

Pronto quando não for possível gerar choque de horário, inclusive com duas requisições simultâneas, e o prestador conseguir operar o dia inteiro pelo painel.

### Etapa 2 — Multitenancy, equipe e clientes

Objetivo: construir a base dos planos pagos e do diferencial de dados.

- migrar `Business` para `Organization` ou torná-lo a organização formal;
- adicionar memberships e papéis;
- criar profissionais, seus serviços e suas agendas;
- permitir escolher profissional ou “qualquer disponível” na página pública;
- criar `Customer` e ligar os agendamentos existentes por e-mail/telefone normalizado;
- criar tela Clientes com busca, última visita, visitas, gasto estimado, serviço preferido e histórico;
- registrar origem do agendamento: página, painel, campanha, referral;
- impedir acesso cruzado entre organizações em todas as rotas;
- adicionar auditoria para ações sensíveis.

Pronto quando uma equipe pequena trabalha na mesma organização sem enxergar ou alterar dados de outro negócio.

### Etapa 3 — Onboarding e ativação

Objetivo: levar uma conta nova até uma agenda publicável sem suporte humano.

Fluxo guiado:

1. tipo e nome do negócio;
2. profissional principal;
3. primeiro serviço;
4. horários de atendimento;
5. telefone, endereço e identidade básica;
6. revisão da página;
7. copiar link ou compartilhar no WhatsApp.

Adicionar:

- checklist persistente no painel;
- prévia instantânea da página;
- exemplos específicos por nicho;
- estados vazios com uma ação clara;
- onboarding retomável;
- medição de abandono por etapa.

Pronto quando uma pessoa sem treinamento publica a agenda e compartilha o link em menos de cinco minutos.

### Etapa 4 — Comunicação e retenção

Objetivo: reduzir faltas e começar a gerar retorno.

- criar fila de tarefas para e-mails e rotinas agendadas;
- enviar confirmação, lembrete de 24 horas e lembrete próximo do horário;
- permitir confirmar e cancelar por link seguro;
- registrar tentativa, entrega, falha e reenvio;
- preparar mensagens de WhatsApp com um clique antes de contratar a API oficial;
- calcular frequência por cliente, serviço preferido e data esperada de retorno;
- destacar clientes fora do padrão de retorno;
- criar lembrete manual de retorno após concluir um atendimento;
- respeitar consentimento, opt-out e política de privacidade.

Pronto quando o sistema consegue lembrar, confirmar e identificar clientes que deveriam voltar, com histórico rastreável.

### Etapa 5 — Motor de oportunidades

Objetivo: transformar o diferencial estratégico em produto visível.

Começar com regras explicáveis, sem depender de IA:

- horários vazios nos próximos sete dias;
- clientes atrasados em relação ao próprio ciclo;
- queda de ocupação comparada às semanas anteriores;
- serviço com baixa procura;
- aniversariantes;
- clientes recorrentes com risco de abandono;
- clientes VIP sem próximo horário.

Cada oportunidade deve mostrar:

- o que foi detectado;
- por que importa;
- quem ou quais horários estão envolvidos;
- impacto estimado;
- uma ação primária;
- resultado depois da ação.

Exemplo:

> Quinta-feira tem quatro horários livres. Há 18 clientes de corte que passaram do período habitual de retorno. Criar mensagem para esses clientes.

Substituir o dashboard genérico por “O que merece sua atenção hoje”, mantendo agenda do dia e métricas essenciais.

Pronto quando um usuário consegue detectar uma oportunidade e executar uma ação em até três cliques.

### Etapa 6 — Campanhas simples e atribuição

Objetivo: fechar o primeiro ciclo Agenda → Oportunidade → Ação → Resultado.

- transformar uma oportunidade em campanha;
- gerar lista segmentada e permitir revisão dos destinatários;
- oferecer texto pronto para WhatsApp, story e legenda;
- criar link de campanha com identificação;
- registrar clique, agendamento, comparecimento e receita estimada;
- mostrar resultado: enviados, cliques, agendamentos e atendimentos concluídos;
- usar IA textual apenas para adaptar tom e conteúdo dentro de estruturas guiadas;
- sempre permitir edição e aprovação antes do envio.

Pronto quando o sistema atribui um atendimento concluído à campanha que o originou.

### Etapa 7 — Referral

Objetivo: criar aquisição mensurável pelos próprios clientes.

- programa por organização;
- link ou código individual;
- benefício para indicador e indicado;
- regras de valor, validade, limite e serviços elegíveis;
- recompensa liberada somente após atendimento concluído;
- carteira interna de benefícios, sem movimentar dinheiro;
- proteção contra autoindicação e abuso;
- painel de indicações, conversão e receita estimada.

Pronto quando uma indicação percorre todo o ciclo e a recompensa é liberada somente após a conclusão válida.

### Etapa 8 — Planos pagos coerentes

Objetivo: cobrar pelo valor que já está entregue.

Sugestão de lançamento:

- **Grátis:** um profissional, até três serviços, página pública e limite mensal de agendamentos a definir após o beta;
- **Pro — operação:** equipe, agenda completa, clientes, lembretes, recorrência, oportunidades básicas e campanhas simples;
- **Ultra — crescimento:** reativação avançada, referral, campanhas com atribuição, Brand Kit, IA textual/visual, créditos e ROI.

Os preços de R$ 149 e R$ 349 devem ser validados com entrevistas e teste de disposição a pagar. O preço de R$ 29 atual não sustenta um produto com comunicação, IA e suporte intensivos.

Adicionar:

- matriz central de permissões e limites;
- trial ou beta assistido;
- upgrade no contexto do benefício;
- downgrade seguro;
- tratamento de pagamento falho e período de tolerância;
- métricas de conversão e churn.

Pronto quando cobrança, limites e comunicação representam exatamente o que cada plano entrega.

### Etapa 9 — Brand Kit e IA visual

Objetivo: ampliar valor depois que o ciclo de campanha estiver validado.

- logo, cores, tom, nicho e referências;
- templates determinísticos primeiro;
- formatos feed, story e WhatsApp;
- conteúdo gerado a partir de uma oportunidade concreta;
- créditos e limites de custo;
- histórico, regeneração e aprovação;
- geração livre apenas se houver demanda comprovada.

Pronto quando as peças mantêm consistência visual, têm custo previsível e geram campanhas mensuráveis.

## 5. Trilha de qualidade para produção

Executar em paralelo às etapas de produto:

### Segurança e privacidade

- política de privacidade, termos, exclusão e exportação de dados;
- inventário LGPD e base legal para mensagens;
- segredos apenas no ambiente seguro;
- validação e autorização centralizadas;
- sanitização de conteúdo inserido em e-mails;
- proteção contra enumeração, spam e abuso;
- logs sem senha, token ou dados sensíveis;
- revisão de dependências e cabeçalhos de segurança.

### Operação

- migrations versionadas e ensaiadas;
- ambientes de desenvolvimento, homologação e produção separados;
- backups automáticos e teste de restauração;
- monitoramento de erros e alertas;
- health check e logs estruturados;
- fila com retentativa e idempotência;
- cron monitorado;
- domínio, DNS, e-mail transacional e webhooks configurados;
- runbook de incidentes e rollback.

### Qualidade

- testes unitários nas regras de horário, recorrência e oportunidades;
- testes de integração para autorização e concorrência de reservas;
- testes ponta a ponta dos caminhos críticos;
- acessibilidade por teclado e contraste;
- desempenho em celular e conexão lenta;
- teste com pelo menos cinco profissionais reais antes da venda aberta.

## 6. Sequência de lançamento

### Marco A — Alpha confiável

Etapas 0 e 1 concluídas. Uso interno e dados fictícios.

### Marco B — Beta assistido

Etapas 2, 3 e comunicação essencial da etapa 4. Cinco a dez negócios reais, sem cobrança ou com condição fundadora.

Critérios para avançar:

- pelo menos 70% concluem o onboarding;
- pelo menos 50% publicam e compartilham o link;
- zero conflito de agenda;
- pelo menos cinco agendamentos por negócio ativo por semana;
- suporte manual cabe na operação.

### Marco C — Lançamento pago

Etapas 4 e 5 estáveis, cobrança coerente, trilha de produção concluída e casos reais de retorno ou ocupação.

### Marco D — Produto de crescimento

Campanhas atribuídas e referral estáveis. Só então iniciar IA visual e Ultra.

## 7. Ordem prática dos próximos ciclos

1. Corrigir integridade de booking, fuso e concorrência.
2. Criar organização, profissionais e clientes com migração segura.
3. Entregar agenda operacional de dia/semana e ações manuais.
4. Refazer onboarding até a primeira agenda publicada.
5. Implementar fila, confirmação e lembretes.
6. Transformar a lógica atual de Marketing em oportunidades persistidas.
7. Rodar beta assistido e medir ativação e uso.
8. Criar campanhas com tracking e atribuição.
9. Implementar referral.
10. Consolidar Pro; desenvolver Ultra somente após validação.

## 8. Métricas que guiam decisões

### North Star

**Agendamentos gerados ou recuperados pelo sistema por organização ativa.**

### Funil do produto

- visita → cadastro;
- cadastro → agenda publicada;
- agenda publicada → primeiro agendamento;
- primeiro agendamento → atendimento concluído;
- oportunidade exibida → ação executada;
- ação executada → agendamento atribuído;
- trial → pago;
- retenção em 4, 8 e 12 semanas.

### Saúde do negócio do cliente

- ocupação;
- no-show;
- retorno dentro do ciclo esperado;
- clientes reativados;
- novos clientes por indicação;
- receita estimada atribuída a campanhas.

## 9. Regra de priorização

Uma funcionalidade entra agora apenas se melhorar pelo menos um destes pontos:

1. confiança na agenda;
2. ativação do usuário;
3. redução de falta;
4. retorno de cliente;
5. ocupação de horário vazio;
6. aquisição mensurável;
7. decisão mais simples.

Se não melhorar nenhum deles, fica no backlog.

## 10. Estimativa de execução

Referência para uma pessoa desenvolvendo em tempo integral, ajustada depois do primeiro ciclo:

- integridade do core e agenda operacional: 3 a 4 semanas;
- multitenancy, profissionais e clientes: 3 a 5 semanas;
- onboarding, comunicação e oportunidades: 3 a 5 semanas;
- preparação de produção e beta assistido: 2 a 3 semanas, parcialmente em paralelo;
- campanhas com atribuição e referral: mais 5 a 8 semanas;
- Brand Kit e IA visual: somente depois da validação, mais 4 a 7 semanas.

Um beta assistido confiável é plausível em 8 a 12 semanas. Um lançamento pago com o diferencial de oportunidades exige aproximadamente 11 a 17 semanas. São faixas de planejamento, não datas prometidas; integração de WhatsApp, regras de equipe e feedback do beta podem alterar o prazo.

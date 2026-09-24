# Guia Estratégico — Plataforma de Agendamento para Prestadores de Serviço

## Objetivo deste guia

Este documento serve como referência central para orientar decisões de produto, design, desenvolvimento, posicionamento e monetização.

A ideia é evitar que o projeto se perca em funcionalidades isoladas e manter uma direção clara.

---

# 1. Visão do produto

O produto não deve ser apenas um sistema de agendamento.

A visão é construir uma plataforma que ajude prestadores de serviço a:

- organizar a agenda;
- gerenciar clientes;
- reduzir faltas;
- aumentar recorrência;
- recuperar clientes inativos;
- gerar indicações;
- criar campanhas;
- produzir conteúdo de marketing;
- identificar oportunidades de crescimento.

A agenda é o núcleo.

O crescimento do negócio é o diferencial.

---

# 2. Frase principal do produto

> **Um sistema de agendamento que transforma os dados da sua agenda em ações para conseguir mais clientes.**

Outra forma:

> **Organize sua agenda. Entenda seus clientes. Faça seu negócio crescer.**

---

# 3. Problema central

Muitos prestadores de serviço:

- organizam clientes pelo WhatsApp;
- esquecem retornos;
- têm horários vazios;
- dependem de clientes recorrentes;
- não sabem fazer marketing;
- não sabem criar conteúdo;
- não possuem agência;
- não acompanham métricas;
- não sabem quem deveria voltar;
- não sabem qual cliente vale reativar.

O produto deve resolver isso sem exigir conhecimento técnico ou de marketing.

---

# 4. Público inicial

Foco principal:

- profissionais autônomos;
- pequenos negócios de serviço;
- negócios com poucos profissionais;
- prestadores que dependem de agendamento.

Exemplos:

- barbearias;
- salões;
- estética;
- manicure;
- massagistas;
- personal trainers;
- professores particulares;
- terapeutas;
- fotógrafos;
- prestadores locais.

---

# 5. Princípio principal de produto

O sistema não deve apenas entregar ferramentas.

Ele deve recomendar ações.

Evitar:

> “Crie uma campanha.”

Preferir:

> “Sua quinta-feira está 40% vazia. Encontramos 27 clientes que não voltam há mais de 45 dias. Quer criar uma campanha para preencher esses horários?”

---

# 6. Regra de simplicidade

Toda funcionalidade deve responder a pelo menos uma destas perguntas:

- isso economiza tempo?
- isso reduz faltas?
- isso aumenta recorrência?
- isso ajuda a conseguir cliente?
- isso melhora a operação?
- isso ajuda a tomar uma decisão?

Se a resposta for não, a funcionalidade provavelmente não é prioridade.

---

# 7. Estrutura principal do produto

A navegação pode ser organizada em:

- Agenda
- Clientes
- Marketing
- Resultados
- Configurações

---

# 8. Core do produto

O núcleo precisa funcionar muito bem antes das funcionalidades avançadas.

Funcionalidades essenciais:

- autenticação;
- multitenancy;
- cadastro do negócio;
- profissionais;
- serviços;
- clientes;
- agenda;
- disponibilidade;
- página pública;
- status de atendimento;
- bloqueio de conflito;
- recorrência;
- lembretes;
- histórico.

---

# 9. Regra de multitenancy

Construir o produto desde o início como multiempresa.

Estrutura:

```text
Organização
├── Profissionais
├── Serviços
├── Clientes
├── Agendamentos
├── Campanhas
├── Indicações
└── Configurações
```

Mesmo que o primeiro usuário trabalhe sozinho.

---

# 10. Página pública de agendamento

Cada negócio terá um link próprio.

Exemplo:

```text
agenda.seuproduto.com/joaobarber
```

Fluxo:

1. escolher serviço;
2. escolher profissional;
3. escolher horário;
4. informar dados;
5. confirmar.

Objetivo:

> Agendar em poucos segundos.

Sem:

- aplicativo;
- cadastro complexo;
- conversa longa no WhatsApp.

---

# 11. Agenda

A agenda deve ser rápida e visual.

Visualizações:

- dia;
- semana;
- mês.

Ações:

- criar;
- editar;
- remarcar;
- cancelar;
- concluir.

Status:

- agendado;
- aguardando confirmação;
- confirmado;
- concluído;
- cancelado;
- não compareceu.

---

# 12. CRM

O CRM não deve parecer um CRM corporativo.

Ele deve ser extremamente simples.

Dados importantes:

- última visita;
- frequência;
- histórico;
- serviço preferido;
- profissional preferido;
- número de visitas;
- número de indicações;
- benefício disponível;
- status de relacionamento.

---

# 13. Reativação

Uma das funcionalidades centrais.

O sistema deve identificar clientes que:

- costumavam voltar;
- não retornaram;
- estão fora do padrão habitual.

Exemplo:

> João costuma voltar a cada 25 dias e já está há 37 dias sem agendar.

Ação:

> Sugerir campanha de retorno.

---

# 14. Oportunidades

Criar uma camada de inteligência operacional.

Exemplos:

- horários vazios;
- clientes inativos;
- aniversariantes;
- queda de recorrência;
- clientes VIP;
- serviços com baixa ocupação;
- dias fracos.

Interface:

```text
Oportunidades de hoje

• 6 horários vagos amanhã
• 42 clientes sem retornar há mais de 45 dias
• 8 aniversariantes nesta semana

[Ver ações]
```

---

# 15. Marketing

Marketing deve ser consequência dos dados da operação.

Fluxo ideal:

```text
Agenda
↓
Detecta problema
↓
Sugere ação
↓
Cria campanha
↓
Gera conteúdo
↓
Cria link
↓
Mede resultado
```

---

# 16. Tipos de campanha

Priorizar campanhas diretamente relacionadas à agenda:

- horários vagos;
- retorno;
- indicação;
- aniversário;
- agenda aberta;
- promoção;
- cliente VIP;
- último horário;
- período de baixa demanda.

---

# 17. IA de texto

Pode entrar cedo no produto.

Usos:

- legenda;
- mensagem de WhatsApp;
- CTA;
- texto de story;
- campanha de retorno;
- campanha de indicação;
- copy promocional.

Princípio:

> O usuário não deve precisar saber escrever prompt.

---

# 18. IA visual

IA visual é diferencial de plano premium.

Não deve ser ilimitada.

Funcionamento:

- Brand Kit;
- templates;
- geração por créditos;
- formatos pré-definidos.

Formatos:

- Feed 1:1
- Story 9:16
- Card para WhatsApp
- Banner

---

# 19. Brand Kit

Dados:

- logo;
- cores;
- estilo;
- nome;
- telefone;
- Instagram;
- nicho;
- referências visuais.

Objetivo:

> Toda peça gerada deve parecer pertencer ao mesmo negócio.

---

# 20. Regra para geração de imagem

Evitar prompt aberto.

Preferir fluxo guiado:

```text
O que você quer divulgar?

[Horário vago]
[Promoção]
[Agenda aberta]
[Indicação]
[Cliente sumido]
[Aniversário]
```

Depois o sistema cuida do restante.

---

# 21. Templates antes de geração total

Prioridade:

1. templates dinâmicos;
2. texto gerado por IA;
3. identidade visual;
4. geração de imagem;
5. geração completamente livre apenas depois.

Motivo:

- menor custo;
- maior consistência;
- melhor resultado;
- menos erros;
- maior previsibilidade.

---

# 22. Programa de indicação

O referral deve ser parte importante do produto.

Fluxo:

1. prestador ativa campanha;
2. cliente recebe link/código;
3. cliente compartilha;
4. indicado agenda;
5. atendimento é concluído;
6. recompensa é liberada;
7. sistema registra resultado.

---

# 23. Regras de indicação

Configurações possíveis:

- percentual de desconto;
- valor fixo;
- crédito;
- serviço grátis;
- benefício personalizado;
- limite mensal;
- validade;
- serviços participantes.

---

# 24. Regra de validação

Nunca liberar recompensa apenas por criação do agendamento.

Liberar quando:

> atendimento for concluído.

Isso reduz fraude.

---

# 25. Carteira de benefícios

O sistema pode mostrar:

```text
Saldo de benefícios: R$ 30
Indicações concluídas: 2
```

Essa carteira é apenas controle interno.

---

# 26. Pagamentos

Decisão fixa:

> **Não haverá gateway de pagamento próprio.**

Não fazer:

- Pix interno;
- cartão;
- split;
- recebimento;
- repasse;
- chargeback;
- intermediação financeira.

---

# 27. Como tratar descontos

Exemplo:

> João possui 10% de desconto disponível.

O sistema apenas informa.

O prestador aplica manualmente no meio de pagamento que já utiliza.

---

# 28. Regra financeira do produto

> **O SaaS gerencia agendamento, relacionamento, indicação e benefício. O pagamento ocorre fora da plataforma.**

---

# 29. Planos

Estrutura atual sugerida:

## Pro — ~R$ 149

Foco:

> operação.

Inclui:

- agenda;
- clientes;
- serviços;
- recorrência;
- lembretes;
- CRM básico;
- referral;
- automações simples;
- marketing básico;
- IA textual.

Mensagem:

> **Organize seu negócio.**

---

# 30. Ultra — ~R$ 349

Foco:

> crescimento.

Inclui:

- tudo do Pro;
- Brand Kit;
- IA visual;
- créditos;
- campanhas avançadas;
- reativação;
- templates premium;
- calendário de marketing;
- insights;
- oportunidades;
- ROI;
- copiloto de marketing.

Mensagem:

> **Ajude seu negócio a crescer.**

---

# 31. Regra de diferenciação dos planos

Não comunicar como:

> Pro sem IA / Ultra com IA.

Comunicar como:

> **Pro organiza. Ultra cresce.**

---

# 32. Créditos

IA visual deve funcionar por créditos.

Motivos:

- controlar custo;
- impedir abuso;
- manter margem;
- permitir upsell.

Exemplo conceitual:

```text
Ultra
20 ou 30 gerações por mês
```

O número final depende do custo real da API.

---

# 33. Upsell

Possibilidades:

- pacote de imagens;
- templates premium;
- créditos extras;
- automações avançadas;
- mais profissionais;
- mais unidades.

---

# 34. Concorrentes principais

Referências prioritárias:

## Trinks

Estudar:

- mercado brasileiro;
- WhatsApp;
- UX;
- retorno;
- fidelidade;
- onboarding.

## Fresha

Estudar:

- growth;
- disponibilidade;
- campanhas;
- reativação;
- marketplace.

## Zenoti

Estudar:

- referral;
- CRM;
- IA;
- automação;
- ROI;
- campanhas.

---

# 35. Onde não competir

Não competir por:

- maior número de funcionalidades;
- menor preço;
- “ter IA”;
- ter gateway;
- ser um Canva.

---

# 36. Onde competir

Competir por:

- simplicidade;
- velocidade;
- contexto;
- ação;
- facilidade;
- foco no pequeno e médio prestador;
- crescimento orientado pela agenda.

---

# 37. Diferencial central

> **IA com contexto operacional.**

A IA deve conhecer:

- agenda;
- clientes;
- horários vagos;
- recorrência;
- histórico;
- campanhas;
- nicho.

Assim ela consegue sugerir ações relevantes.

---

# 38. Exemplo perfeito do diferencial

Ruim:

> “Gerar post com IA.”

Bom:

> “Você possui quatro horários vagos amanhã à tarde. Encontramos 18 clientes que não voltam há mais de 30 dias. Criamos uma campanha pronta para preencher esses horários.”

---

# 39. Regra de UX

O produto deve ser:

- simples;
- rápido;
- visual;
- direto;
- pouco técnico.

Evitar:

- dezenas de configurações;
- dashboards complexos;
- excesso de métricas;
- termos de marketing;
- telas cheias.

---

# 40. Regra de onboarding

O onboarding deve coletar apenas o necessário:

1. tipo de negócio;
2. nome;
3. profissionais;
4. serviços;
5. horários;
6. logo;
7. cores;
8. link público.

Depois:

> agenda pronta.

---

# 41. Roadmap

## Fase 1 — Core

- autenticação;
- multitenancy;
- negócio;
- profissional;
- serviços;
- clientes;
- agenda;
- disponibilidade;
- booking público.

## Fase 2 — Retenção

- histórico;
- recorrência;
- lembretes;
- CRM básico;
- reativação.

## Fase 3 — Referral

- links;
- códigos;
- recompensa;
- carteira;
- regras;
- tracking.

## Fase 4 — Marketing

- campanhas;
- templates;
- IA textual;
- oportunidades.

## Fase 5 — IA visual

- Brand Kit;
- imagens;
- créditos;
- peças prontas.

## Fase 6 — Growth

- atribuição;
- ROI;
- insights;
- automações inteligentes.

---

# 42. Métricas importantes

Do produto:

- negócios ativos;
- agendamentos;
- usuários ativos;
- churn;
- conversão trial → pago.

Do cliente:

- ocupação da agenda;
- no-show;
- recorrência;
- clientes reativados;
- indicações;
- novos clientes;
- campanhas;
- receita estimada gerada.

---

# 43. North Star Metric sugerida

Uma métrica interessante:

> **Agendamentos gerados ou recuperados pelo sistema por negócio ativo.**

Isso conecta o produto diretamente a valor.

---

# 44. Regra de feature

Antes de implementar qualquer feature nova, perguntar:

> Isso ajuda o prestador a organizar melhor ou ganhar mais?

Se não:

> baixa prioridade.

---

# 45. Direção visual do produto

A interface deve transmitir:

- simplicidade;
- confiança;
- produto premium;
- velocidade;
- clareza.

Evitar:

- aparência genérica de dashboard SaaS;
- excesso de cards;
- excesso de gradientes;
- excesso de IA visual;
- interface lotada.

---

# 46. Estratégia de produto

A agenda é o mecanismo de entrada.

O CRM aumenta retenção.

O referral gera aquisição.

O marketing gera crescimento.

A IA reduz esforço.

O conjunto cria valor.

---

# 47. Moat possível

O diferencial mais defensável no futuro pode ser o histórico de comportamento.

Quanto mais o negócio usa:

- mais dados;
- melhores recomendações;
- melhores campanhas;
- melhor previsão de retorno;
- melhor segmentação.

A inteligência melhora conforme a base cresce.

---

# 48. Princípio final

Não construir:

> uma agenda com muitas features.

Construir:

> **um sistema simples que entende o negócio e ajuda o prestador a decidir o que fazer para manter a agenda cheia.**

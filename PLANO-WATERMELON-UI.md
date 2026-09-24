# Plano de adoção do Watermelon UI

## Status da implementação

Implementado nesta etapa: registro oficial configurado, dependências de movimento instaladas, 14 componentes Watermelon adicionados em `components/watermelon/`, todos os 19 componentes compartilhados de `components/ui/` atualizados para o padrão visual Watermelon e navegação Watermelon integrada ao dashboard. Cadastro e login também usam `FloatingInput`.

## Escopo

Adotar o Watermelon UI em todos os componentes **usados pelo AgendaFlow** e nas telas que os compõem. O catálogo remoto tem centenas de exemplos e variantes; instalar cada exemplo sem uso não acrescentaria funcionalidades ao produto. Cada item escolhido será copiado do registro para `components/watermelon/`, adaptado ao domínio e integrado a uma tela real.

## Base instalada

- Registro `@watermelon` configurado em `components.json`: `https://registry.watermelon.sh/r/{name}.json`.
- `motion` instalado como dependência para os componentes animados.
- `ContinuousTabs` instalado em `components/watermelon/continuous-tabs.tsx` como primeiro item isolado. Ainda não substitui a navegação existente.
- Instalação futura: `npx shadcn add @watermelon/NOME --dry-run`, revisar arquivos e dependências, depois instalar sem `--overwrite`. Alguns itens do registro tentam reescrever `lib/utils.ts`; nesses casos, copiar apenas o componente e aproveitar o `cn` já existente.

## Inventário e destino

| Grupo atual | Componentes | Ação |
| --- | --- | --- |
| Ações e feedback | `button`, `badge`, `sonner`, `skeleton` | Aplicar padrões Watermelon em botões e estados de feedback. Manter APIs locais de botão e toast até cada uso ser migrado. |
| Formulários | `input`, `label`, `textarea`, `switch`, `select` | Avaliar `floating-input`, `progressive-input-stack` e seletores Watermelon. Preservar labels, validação, estados de erro e formulário controlado. |
| Superfícies | `card`, `separator`, `avatar` | Selecionar cartões e perfis adequados ao dashboard e à agenda pública; centralizar cores, bordas e sombras nos tokens do projeto. |
| Sobreposições | `dialog`, `popover`, `sheet`, `dropdown-menu` | Usar padrões visuais Watermelon onde agregarem valor, mantendo foco, teclado, fechamento e portais acessíveis. |
| Navegação | `tabs`, `accordion` | Adaptar `ContinuousTabs` e avaliar as variantes de acordeão. Substituir por tela, sem alterar a semântica das rotas. |
| Datas e agendamentos | `calendar` e fluxo público | Avaliar `calendar-widget`, `schedule-date` e variantes de calendário. Retirar datas e eventos de demonstração; ligar à disponibilidade e ao fuso reais. |

O projeto também tem componentes próprios em `components/auth`, `components/dashboard`, `components/landing`, `components/pricing` e `components/public`. Esses fluxos entram nas etapas abaixo; o objetivo é cobrir também a composição, não apenas os 19 arquivos de `components/ui`.

## Etapas

1. **Fundação visual:** registrar telas atuais (claro/escuro e celular/desktop), definir tokens de cor, tipografia, espaçamento, raio e movimento no CSS. Criar uma vitrine interna dos itens Watermelon escolhidos antes de usá-los em fluxos reais.
2. **Primitivos mais usados:** adaptar botão, input, label, textarea, card, badge, switch, diálogo e toast. `button` aparece em 24 arquivos e `input` em 12; começar por eles reduz divergências. Preservar as props públicas dos componentes locais ou migrar explicitamente cada chamada.
3. **Cadastro, login e recuperação:** atualizar formulários e estados de carregamento/erro. Verificar teclado, autofill, contraste, foco e a entrada imediata após cadastro.
4. **Agenda pública:** atualizar seleção de serviço, calendário, horários, dados do cliente e confirmação. Conectar os componentes ao estado real do agendamento; não usar datas fixas nem textos de demonstração do registro.
5. **Dashboard:** migrar navegação lateral, cartões de resumo, tabelas, filtros, diálogos e formulários de serviços, disponibilidade, clientes, finanças e configurações. Tratar estados vazio, carregando e erro.
6. **Marketing, preços e landing:** escolher blocos visuais Watermelon para seções públicas, mantendo conteúdo, links e comportamento existentes.
7. **Fechamento:** revisar os 19 componentes de `components/ui`; remover os que não têm mais importações, conservar os que oferecem comportamento necessário e registrar a decisão. Executar `tsc`, lint, build e testes dos fluxos de cadastro, login, agendamento e dashboard. Conferir visualmente claro/escuro, celular/desktop e redução de movimento.

## Critérios para cada componente

- O item cobre um uso real do AgendaFlow e recebe dados por props ou pelo estado da tela.
- Mantém acessibilidade: nome legível, foco visível, teclado, labels, contraste e preferência por movimento reduzido.
- Não introduz datas, usuários, moeda, idioma ou resultados fictícios em produção.
- Funciona em Next.js 16 e React 19; dependências extras são revisadas antes de instalar.
- A tela passa em verificação de tipos e em uma checagem visual depois da troca.

## Fontes

- Watermelon UI: https://ui.watermelon.sh/
- Registro oficial: https://registry.watermelon.sh/registry.json
- Plataforma e instrução de instalação: https://github.com/WatermelonCorp/watermelon-platform#installable-components

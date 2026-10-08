# Orion Storage — Industrial Precision

## Brand brief e mini brandbook

Orion Storage é um produto independente de controle físico de estoque. GMAD Rio Preto é um ambiente inicial de uso, não a marca do software.

**Assinatura:** Controle físico. Visibilidade total.

**Missão:** Simplificar o controle físico de estoque por meio de ferramentas organizadas, acessíveis e precisas.

**Promessa:** Mais controle físico, menos incerteza operacional.

Operadores, conferentes, expedição, supervisores e gestores precisam identificar códigos, ações e situações com rapidez. A personalidade é técnica, objetiva, confiável, precisa, organizada, moderna e sóbria. A identidade depende de hierarquia, tipografia, bordas e consistência; evitar gradientes decorativos, glassmorphism, neon e arredondamentos excessivos. O logotipo definitivo permanece pendente: esta fundação não aprova ou substitui a marca existente.

## Fonte de verdade e aplicação

`src/styles.css` contém os tokens Tailwind 4 em `@theme static`, mantendo as variáveis disponíveis também quando uma variante ainda não é usada. Não há segunda configuração de tema ou biblioteca nova. Componentes atuais continuam usando `bg`, `surface`, `ink`, `muted`, `line`, `accent`, `accent-fg`, `on-ink`, `on-ink-muted` e `danger`.

Primitivos registram a identidade; papéis semânticos expressam a intenção da interface. Novas interfaces devem consumir papéis, sem copiar hexadecimal para JSX. Um futuro tema pode sobrescrever os papéis semânticos; nenhum tema escuro completo foi implementado.

### Paleta de referência

| Primitivo          | Valor                 |
| ------------------ | --------------------- |
| Graphite 950 / 900 | `#0F141A` / `#161D24` |
| Steel 800 / 600    | `#27313A` / `#51606D` |
| Mist 200 / 50      | `#D6DEE5` / `#F5F7F9` |
| Orion Teal / Hover | `#1E8C8A` / `#166C6A` |
| Signal Cyan / Info | `#2EA8C7`             |
| Success / Warning  | `#2E8B57` / `#C9921A` |
| Danger / Disabled  | `#C44949` / `#8A98A6` |

### Papéis operacionais

| Uso                              | Tokens / valores                                                              |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Fundo / superfície               | `bg`: Mist 50; `surface`: branco; `surface-subtle`: Mist 50                   |
| Texto / metadados                | `ink`: Graphite 950; `muted`: Steel 600                                       |
| Divisores decorativos            | `line`: Mist 200                                                              |
| Limite de controles              | `control-border`: `#7A8996`                                                   |
| Sidebar / textos                 | `sidebar`: Graphite 950; `on-ink`: Mist 50; `on-ink-muted`: Mist 200          |
| Ação / hover / texto             | `accent`: `#166C6A`; `accent-hover`: `#115654`; `accent-fg`: branco           |
| Seleção / texto                  | `selected`: `#E8F4F3`; `selected-fg`: `#166C6A`                               |
| Foco / separação em fundo escuro | `focus`: `#166C6A`; `focus-on-dark`: Mist 50                                  |
| Desabilitado                     | `disabled`: Steel 600; `disabled-bg`: `#E9EDF1`; `disabled-border`: `#8A98A6` |

O teal original com branco tem contraste 4,06:1. Por isso `accent` usa a referência Teal Hover, com 6,20:1 contra branco. O primitivo original continua disponível para elementos de marca adequados. Signal Cyan, Success e Warning originais também não devem ser usados indiscriminadamente como texto sobre branco.

| Situação | Texto     | Fundo     | Borda     |
| -------- | --------- | --------- | --------- |
| Success  | `#226943` | `#EDF7F0` | `#2E8B57` |
| Warning  | `#79560E` | `#FFF7E5` | `#8B6512` |
| Danger   | `#A53636` | `#FCEEEE` | `#C44949` |
| Info     | `#16677E` | `#EAF6FA` | `#237F98` |

Use `text-success bg-success-bg border-success-border` e equivalentes. Inclua texto e, quando útil, ícone Lucide: cor sozinha não comunica estado. `line` é divisor decorativo, não garantia de contraste para um input; a migração dos componentes usará `control-border`. Opacidade altera contraste e deve ser verificada na composição final.

### Tipografia

Manrope é a fonte geral (`font-sans`, pesos 400/500/600/700). IBM Plex Mono (`font-mono`, pesos 400/500/600) atende códigos, endereços e identificadores. Use números tabulares em indicadores e tabelas numéricas. As fontes são carregadas por Google Fonts com `display=swap`, mantendo fallback Segoe UI e monospace; indisponibilidade da rede mantém texto legível. Não foi introduzida dependência npm.

| Papel           | Utilitários recomendados           | Tamanho de referência |
| --------------- | ---------------------------------- | --------------------- |
| H1              | `text-heading-1 font-bold`         | 24px                  |
| H2              | `text-heading-2 font-bold`         | 20px                  |
| H3              | `text-heading-3 font-semibold`     | 18px                  |
| Corpo           | `text-body` ou `text-base`         | 14–16px               |
| Metadados       | `text-metadata font-medium`        | 13px                  |
| Identificadores | `font-mono text-code font-medium`  | 14px                  |
| Indicadores     | `text-stat font-bold tabular-nums` | 32px                  |

Tamanhos são definidos em rem, respeitando a preferência de fonte e zoom. Não fixe a fonte do elemento html em pixels. Os títulos existentes mantêm suas classes nesta subetapa; a escala está pronta para a migração controlada. As etiquetas mantêm IBM Plex Sans e seus estilos preto/branco, medidas e regras de impressão anteriores até a revisão específica de impressão.

### Geometria, superfícies e foco

Unidade de espaçamento: `--spacing: 0.25rem` (4px na configuração padrão). Priorizar `gap-2`, `gap-4`, `p-4`, `p-6` e outros múltiplos de 8px.

`rounded-control`: 10px; `rounded-card`: 14px; `rounded-dialog`: 16px. `rounded-md` permanece alias de controle para compatibilidade. Outros raios antigos não são migrados automaticamente. `shadow-card` e `shadow-dialog` são discretas; bordas e espaçamento devem separar as superfícies antes de adicionar sombra.

O foco global em tela usa contorno teal de 3px, afastamento de 3px e separação clara de 3px para fundos escuros. Vale para links, botões, campos e elementos com tabindex, inclusive controles antigos com `outline-none`. Estados específicos dos componentes compartilhados são descritos abaixo; a homologação das composições finais continua na 4C.4/4C.5. Não remova o foco. A preferência por movimento reduzido continua respeitada.

## Exemplos de composição

```tsx
<section className="rounded-card border border-line bg-surface p-6 shadow-card">
  <h2 className="text-heading-2 font-bold">Caixas</h2>
  <span className="font-mono text-code font-medium">BOX-20261008-000001</span>
</section>

<button className="rounded-control bg-accent px-4 py-3 font-semibold text-accent-fg hover:bg-accent-hover">
  Confirmar
</button>

<p className="rounded-control border border-warning-border bg-warning-bg p-4 text-warning">
  Atenção: revise o endereço antes de confirmar.
</p>
```

Exemplos documentam os tokens, não substituem os componentes existentes nem acrescentam fluxos. Preferir componentes compartilhados depois da padronização 4C.3. Manter validação, disabled, loading, error e seleção explícitos no componente real.

## Contraste e manutenção

### Biblioteca compartilhada — 4C.3

Local: `src/components/ui`. `cn` combina clsx e tailwind-merge já instalados para evitar classes conflitantes. Não foi adicionada biblioteca, engine de tabela, estado global ou novo fluxo operacional. Cada elemento aceita os atributos HTML/Radix pertinentes; refs dos controles, botões e modais são encaminhadas.

| Arquivo        | Componentes e propriedades principais                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.tsx`   | `Button`: variant primary/secondary/ghost/danger, loading, selected e atributos nativos; `IconButton`: mesmos atributos, com aria-label obrigatório                                                                                           |
| `field.tsx`    | `Field`: label, htmlFor, required, hint, error, children; `controlClass`: compatibilidade para controles nativos existentes                                                                                                                   |
| `controls.tsx` | `Input`, `Select`, `Textarea`: atributos nativos; `SearchInput`: atributos de input, tipo search fixo e ícone decorativo                                                                                                                      |
| `feedback.tsx` | `Badge`, `StatusIndicator`, `Alert`, `Toast`: tone neutral/success/warning/danger/info; `EmptyState`: title, description, action; `LoadingState`: label, className                                                                            |
| `surfaces.tsx` | `Card`: atributos div; `StatCard`: label, value, description; `PageHeader`: title, eyebrow, description, actions; `DataTable`: label obrigatório e children nativos; `TableToolbar`: atributos div; `BoxCode`, `LocationCode`: atributos span |
| `modal.tsx`    | `Modal`, `ModalOverlay`: primitivas Content/Overlay do Dialog; `ConfirmDialog`: Content do AlertDialog                                                                                                                                        |

#### Estados e acessibilidade

- Button: hover sem perder contraste, foco global, disabled com paleta própria (sem opacidade), selected com aria-pressed e loading com aria-busy, spinner decorativo e bloqueio de clique. O texto permanece visível. `type` padrão é button, impedindo submissão acidental; submit deve ser explícito. `IconButton` oferece alvo mínimo de 44px e nome acessível.
- Input/Select/Textarea: borda de controle, hover, foco, disabled e erro via `aria-invalid="true"`. `aria-describedby` relaciona mensagens; não depender da borda vermelha. Selected em select e readonly seguem o comportamento nativo, preservando teclado e validação do chamador. Loading de leitura deve ser comunicado pelo LoadingState ou aria-busy e disabled conforme o fluxo existente.
- Field: relaciona hint/error/required aos filhos diretos cujo id corresponde a htmlFor, sem alterar value, eventos ou validações. Mescla e deduplica aria-describedby; erro usa role alert e aria-invalid. required acrescenta indicação acessível, sem impor uma nova validação HTML. Em estruturas aninhadas, associe explicitamente o controle às mensagens.
- StatusIndicator: ícone e texto; `Badge` permite composição com texto próprio. Os adaptadores preservam rótulos/status do domínio. Alert anuncia danger como alert e demais situações como status. Toast é a mesma apresentação acessível, sem timers, portal, fila ou exibição automática: a aplicação mantém o tempo de vida de suas mensagens.
- DataTable: tabela HTML com caption e região rotulada focável para rolagem por teclado. Não cria ordenação, paginação, seleção ou colunas. Se o chamador fornecer aria-selected, a linha recebe fundo de seleção. Versões em cards para celular permanecem nos módulos. TableToolbar organiza filtros sem role toolbar, que exigiria um padrão diferente de navegação por teclado.
- Modal: compor com Dialog.Root, Portal, Title, Description e Close existentes. Radix mantém foco contido e Escape; a apresentação devolve o foco ao elemento que abriu o modal, inclusive quando o Root é controlado sem Trigger. Callbacks de autoFocus e preventDefault do chamador são respeitados. ConfirmDialog requer AlertDialog.Root/Title/Description/Action/Cancel; a decisão de confirmar e a gravação continuam explícitas no módulo. Não foi inserido novo diálogo de confirmação em nenhum fluxo.
- Card, StatCard, PageHeader e códigos: apresentação, sem formatar ou inventar dados. value aceita o valor já formatado; identificadores são exibidos literalmente. Geometria usa controle 10px, card 14px e modal 16px. Movimento reduzido continua desabilitando transições/spinners animados pelo CSS global.

#### Exemplos com componentes

```tsx
<Field label="Código" htmlFor="code" required hint="Código da caixa" error={error}>
  <Input id="code" value={code} onChange={onChange} />
</Field>
<Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
  Salvar
</Button>
<StatusIndicator tone="warning">Aberta</StatusIndicator>
<BoxCode>{box.code}</BoxCode>
<LocationCode>{location.code}</LocationCode>
```

A integração inicial substitui repetições em filtros, tabelas, badges, cabeçalhos, feedbacks e modais de Produtos/Caixas; os demais controles nativos continuam herdando `controlClass`. StatCard, ConfirmDialog e Toast ficam disponíveis para a migração posterior, sem adicionar indicadores, confirmações ou notificações a páginas existentes. Não criar novos componentes locais para as mesmas funções. A revisão completa das telas é a 4C.4.

### Navegação e identidade global — 4C.2

`AppShell` mantém o catálogo real de seções, sem modificar paths ou serviços. Sua assinatura provisória está isolada em `OrionSignature`: nome Orion Storage em Manrope, sem símbolo ou logotipo definitivo. O rodapé traz “Controle físico. Visibilidade total.”, sem associação visual a clientes.

A sidebar grafite usa ícones Lucide, texto e `aria-current="page"`. A seleção combina fundo teal e borda clara, mantendo indicação além da cor. Links têm altura mínima de 44px. Abaixo de 768px, o cabeçalho compacto abre uma navegação modal com Radix Dialog já instalado: foco contido, fechamento por Escape/botão e retorno de foco. Navegar fecha o menu; passar à largura desktop também o fecha. Textos ampliados podem quebrar nos rótulos, e o painel permite rolagem vertical.

O cabeçalho de contexto mostra a seção atual; títulos H1 das páginas usam a escala de 24px/700 em `.orion-page-content`. A ação “Pular para o conteúdo” aparece ao receber foco e direciona ao main. Não foram substituídos formulários, tabelas, feedbacks ou fluxos operacionais: sua padronização permanece na 4C.3/4C.4.

`node scripts/visual-token-check.mjs` lê a paleta diretamente do CSS e verifica 26 combinações semânticas: textos com mínimo 4,5:1 e bordas/foco com mínimo 3:1. Esses resultados são referência WCAG AA para cores, não certificação integral de WCAG 2.2 AA. A homologação inclui teclado, zoom, composição, mensagens e telas nas etapas seguintes.

Ao adicionar um papel ou mudar um token, atualize as combinações verificadas, valide a aparência em desktop/mobile e evite alterar etiquetas por herança. Rotas, dados, persistência, QR e regras de negócio ficam fora das decisões deste documento.

### Telas operacionais — 4C.4

As rotas existentes usam a mesma fundação, sem criar dashboard: Produtos (`/`), Caixas, Endereçamento, Movimentações, Mapa, Scanner, Recebimentos e Inventários no workspace integrado com a 4B. Formulários reutilizam Input/Select/Textarea e buscas SearchInput; cabeçalhos, erros, loading, estados vazios, tabelas e modais usam as primitivas compartilhadas. `EmptyState` admite `className` para espaçamento externo, sem mudar sua semântica. O wrapper de SearchInput permite encolhimento em barras flexíveis.

Os utilitários legados `rounded-md` e `rounded-lg` apontam para os raios de controles (10px) e cards (14px). H2/H3 operacionais seguem 20px/700 e 18px/600; identificadores em títulos técnicos permanecem monoespaçados. Evitar novos valores locais de cor, raio ou tamanho quando já existe token.

Mapa: células de pelo menos 104 × 96px, texto de estado de 12px, indicadores numéricos e código técnico. Livre usa superfície branca; parcial e lotada usam seleção teal, distinguindo borda inferior e contorno interno; sem capacidade usa superfície/borda info pontilhada; bloqueada usa danger e hachura; inativa usa cinza, linhas e borda tracejada. Texto, ícone e padrão mantêm o significado além da cor. A legenda compartilha esses estilos. Busca, grade, ordem espacial, seleção e detalhe continuam somente leitura. StatCard apresenta os oito indicadores já calculados, com duas colunas até o breakpoint xl para evitar aperto no tablet.

Scanner: controles de 56px e entrada monoespaçada, resumo e confirmação destacados, erro/sucesso por Alert com ícone e texto. A leitura não grava; os callbacks de confirmar, cancelar, trocar endereço e remover continuam os originais. Prévia de recebimento usa borda/fundo de seleção; conclusão usa success. Quantidades, reservas, limites e gravação permanecem do serviço existente.

Inventários é código pendente da 4B. A compatibilidade visual utiliza `data-section` no main e seletores de apresentação para códigos, totais e feedback; não reescreve nem inclui sua implementação no commit visual. Essa compatibilidade pode ser migrada às primitivas quando a 4B for regularizada.

Etiquetas: apenas o diálogo de prévia usa Modal/Overlay/IconButton. Arte, fontes de impressão, dimensões, QR e CSS de impressão ficam independentes das cores operacionais. Não aplicar tokens decorativos dentro da etiqueta. `node scripts/operational-screens-qa.mjs PORT` verifica recebimento, prévia sem gravação, confirmação do scanner, histórico e impressão em perfis descartáveis.

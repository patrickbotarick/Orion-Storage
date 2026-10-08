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

O foco global em tela usa contorno teal de 3px, afastamento de 3px e separação clara de 3px para fundos escuros. Vale para links, botões, campos e elementos com tabindex, inclusive controles antigos com `outline-none`. Estados específicos de componentes ainda exigem revisão na 4C.3; não remova o foco. A preferência por movimento reduzido continua respeitada.

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

### Navegação e identidade global — 4C.2

`AppShell` mantém o catálogo real de seções, sem modificar paths ou serviços. Sua assinatura provisória está isolada em `OrionSignature`: nome Orion Storage em Manrope, sem símbolo ou logotipo definitivo. O rodapé traz “Controle físico. Visibilidade total.”, sem associação visual a clientes.

A sidebar grafite usa ícones Lucide, texto e `aria-current="page"`. A seleção combina fundo teal e borda clara, mantendo indicação além da cor. Links têm altura mínima de 44px. Abaixo de 768px, o cabeçalho compacto abre uma navegação modal com Radix Dialog já instalado: foco contido, fechamento por Escape/botão e retorno de foco. Navegar fecha o menu; passar à largura desktop também o fecha. Textos ampliados podem quebrar nos rótulos, e o painel permite rolagem vertical.

O cabeçalho de contexto mostra a seção atual; títulos H1 das páginas usam a escala de 24px/700 em `.orion-page-content`. A ação “Pular para o conteúdo” aparece ao receber foco e direciona ao main. Não foram substituídos formulários, tabelas, feedbacks ou fluxos operacionais: sua padronização permanece na 4C.3/4C.4.

`node scripts/visual-token-check.mjs` lê a paleta diretamente do CSS e verifica 26 combinações semânticas: textos com mínimo 4,5:1 e bordas/foco com mínimo 3:1. Esses resultados são referência WCAG AA para cores, não certificação integral de WCAG 2.2 AA. A homologação inclui teclado, zoom, composição, mensagens e telas nas etapas seguintes.

Ao adicionar um papel ou mudar um token, atualize as combinações verificadas, valide a aparência em desktop/mobile e evite alterar etiquetas por herança. Rotas, dados, persistência, QR e regras de negócio ficam fora das decisões deste documento.

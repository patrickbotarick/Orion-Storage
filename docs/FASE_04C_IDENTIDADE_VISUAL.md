# Fase 4C — identidade visual Industrial Precision

## Inspeção inicial — 08/10/2026

Repositório em `main`, HEAD inicial `35d9a81` (`feat: add read-only warehouse visual map`). Índice vazio. Havia alterações não commitadas da auditoria e da Fase 4B, documentadas em `ESTADO_ATUAL_PROJETO.md` e `FASE_04B_INVENTARIO.md`, com evidências desktop/mobile em desenvolvimento e produção. A auditoria está registrada; não foi presumida pelo briefing.

Linha de base repetida nesta rodada: lint, typecheck, 129 testes em 29 arquivos e build passaram. A arquitetura real utiliza React, TanStack Start/Router, Tailwind 4, componentes em `src/components`, funcionalidades em `src/features`, Lucide e adapters localStorage. A fundação adapta `src/styles.css`; não cria outra estrutura ou biblioteca.

O trabalho anterior permanece fora do commit 4C.1. A etapa visual não regulariza nem commita retroativamente a Fase 4B. Sem push, merge, tag, reset ou limpeza de dados.

## Plano controlado

| Subetapa | Escopo                                                         | Situação                                           |
| -------- | -------------------------------------------------------------- | -------------------------------------------------- |
| 4C.1     | Tokens, fontes, base CSS, documentação e validação da fundação | Implementada; resultados abaixo                    |
| 4C.2     | AppShell, sidebar, cabeçalhos e navegação responsiva           | Implementada; resultados abaixo                    |
| 4C.3     | Componentes compartilhados e seus estados                      | Implementada; resultados abaixo                    |
| 4C.4     | Migração das rotas reais e impressão                           | Implementada; resultados abaixo                    |
| 4C.5     | Refinamento e homologação integral                             | Verificada em navegador; hardware/manual pendentes |

As rotas atuais são `/` (Produtos), `/caixas`, `/enderecamento`, `/movimentacoes`, `/mapa`, `/scanner`, `/recebimentos` e `/inventarios`. Não existe dashboard separado. Etiquetas integram caixas/endereçamento/recebimentos; não será criada página fictícia para elas. Inventários, acrescentado na 4B, recebeu compatibilidade visual na 4C.4.

## Decisões da 4C.1

- Paleta oficial como primitivos, papéis semânticos de contraste e aliases para utilitários existentes. Teal escuro em ações com branco; cores claras de sinal preservadas como referências, com variantes de texto/fundo/borda.
- Manrope na interface e IBM Plex Mono em `font-mono`. IBM Plex Sans preservada exclusivamente pelos estilos existentes das etiquetas. Fontes externas com swap e fallback, seguindo a estratégia já presente.
- Escala em rem, unidade de 4px, raios por papel e sombras leves. Apenas `rounded-md` recebe o novo raio de controle; a geometria de cards/modais será migrada na etapa dos componentes.
- Foco visível global em tela; impressão e seletores do mapa preservados. Sem redesenho de AppShell, componentes ou páginas; o uso dos aliases já atualiza suas cores/fontes por herança.
- Brand brief, mini brandbook e exemplos consolidados em `DESIGN_SYSTEM.md`, evitando documentos repetidos. Logotipo definitivo permanece sem aprovação.

## Validação da fundação

Resultados verificados em 08/10/2026:

- `npm run lint`, `npm run typecheck`, `npm test` (129 testes/29 arquivos) e `npm run build`: aprovados. Os avisos já existentes de diretivas `use client` em dependências continuam presentes.
- Testes auxiliares Node: 149 aprovados nos cinco arquivos existentes de scripts. A primeira execução no sandbox falhou com EPERM ao renomear arquivos temporários; a repetição fora do sandbox passou, sem correção de código.
- `node scripts/visual-token-check.mjs`: 26 pares aprovados. Evidência em `screenshots/fase4c1/contrastes.json`.
- `node scripts/visual-foundation-qa.mjs 8091` e `8081`: oito rotas em desktop 1280×800 e mobile 390×844, totalizando 32 verificações. Conteúdo após carregamento, Manrope/IBM Plex Mono carregadas, fundo Mist 50, ausência de overflow horizontal global e console sem erros. Foco de 3px verificado por Tab; scanner também verificado com preferência de fonte em 200%, sem overflow. Isso não substitui uma auditoria completa de zoom/teclado em todas as composições.
- Inspeção visual das capturas desktop/mobile de produtos, foco, scanner e mapa; sem sobreposição identificada nas capturas revisadas. A navegação móvel existente ocupa uma faixa vertical extensa; seu refinamento permanece na 4C.2.
- Regressão funcional de inventários em dev/produção e desktop/mobile: leitura manual/QR, duplicidade, caixa inexistente, grupos de divergência, finalização, cancelamento, histórico e indicador de mapa aprovados; bytes das caixas/movimentos preservados nos contextos descartáveis. O perfil operacional não foi acessado.
- Comparação com HEAD confirmou que todo o CSS a partir de `.orion-print-sheet` permanece igual, incluindo etiquetas, impressão e mapa. Nenhum arquivo de domínio, persistência, payload QR ou fluxo operacional foi editado nesta etapa. Não houve impressão física ou uso de câmera física; essas homologações continuam pendentes.

O script de QA mantém o caret original nas capturas para evitar que a própria ferramenta injete estilos antes da hidratação React. Aguarda rede e carregamento do catálogo antes de capturar; não mascara erros do console.

Evidências e logs locais em `screenshots/fase4c1/`; ficam fora do commit. Os dois scripts de validação são versionados para repetição. A validação da 4C.1 não aprova automaticamente as outras subetapas nem a conformidade integral de acessibilidade.

## Checklist de homologação

### Fundação 4C.1

- [x] Inspeção de branch, índice, diffs e auditoria antes de editar.
- [x] Linha de base de lint/typecheck/testes/build aprovada.
- [x] Paleta centralizada e papéis semânticos documentados.
- [x] Fontes e fallback configurados; escala e geometria em rem.
- [x] Nenhuma alteração de regras, chaves localStorage, contratos ou protocolos QR.
- [x] Contrastes semânticos verificados pelo script.
- [x] Checks finais e navegador em desenvolvimento/produção aprovados.
- [x] Fontes carregadas, foco e layout desktop/mobile verificados.
- [x] Commit exclusivo da fundação, preservando alterações anteriores (cinco arquivos: CSS, dois documentos e dois scripts; consultar hash no Git).

### Navegação e identidade global 4C.2 — 08/10/2026

Partida em `main`, commit `21a1189` da fundação; índice vazio. Os arquivos anteriores da Fase 4B continuavam não commitados, incluindo a entrada Inventários no AppShell. A linha de base de 129 testes passou antes de editar; os gates da fundação tinham passado na rodada anterior.

Implementação: assinatura tipográfica temporária isolada e substituível; sidebar grafite com ícones Lucide, rótulos, seção ativa e assinatura do produto; cabeçalho de contexto e H1 padronizado; navegação móvel via Radix Dialog existente; skip link e main focável. Nenhuma página, regra, dado, payload ou chave de persistência foi alterada. O CSS das etiquetas, impressão e mapa permanece intacto.

Validação:

- Lint, typecheck, 129 testes/29 arquivos e build aprovados. Após o ajuste final de responsividade, lint/typecheck/build e o QA do shell foram repetidos. Avisos de build existentes em dependências permanecem.
- `node scripts/application-shell-qa.mjs 8091` e `8081`: navegação pelas oito rotas nas larguras 1280, 768, 390 e 320px, em dev e produção (64 navegações). Estado ativo, retorno pelo histórico, skip link, foco contido no menu, Escape, retorno ao botão, fechamento ao navegar e ao redimensionar para desktop aprovados. Menu com preferência de fonte em 200% sem overflow dos rótulos. Console sem erros.
- `node scripts/visual-foundation-qa.mjs 8091 fase4c2` e `8081 fase4c2`: conteúdo/fontes/foco e 32 renderizações desktop/mobile aprovados; scanner com texto em 200% aprovado. O parâmetro opcional apenas direciona evidências para a rodada atual.
- Script de contraste: 26 pares aprovados, sem mudança de paleta.
- Regressão de inventários passou em desenvolvimento e produção, em desktop/mobile, mantendo bytes de caixas e movimentações nos contextos descartáveis. Nenhum perfil operacional foi acessado.
- Capturas de produtos desktop, scanner móvel, painel móvel e mapa em tablet foram inspecionadas. Tabelas e mapa mantêm sua rolagem interna existente quando necessário. Câmera e impressão físicas não foram executadas.

Evidências em `screenshots/fase4c2/` fora do commit; QA reproduzível em `scripts/application-shell-qa.mjs`. Alterações desta etapa: AppShell, CSS, dois documentos e dois scripts. A entrada/import de Inventários da 4B é preservada no arquivo de trabalho e excluída seletivamente do índice do commit visual; continua pendente junto aos demais arquivos da 4B. A validação descreve o workspace integrado atual com a 4B presente.

- [x] Identidade provisória independente de clientes.
- [x] Sidebar, contexto e títulos alinhados à fundação.
- [x] Rotas atuais e navegação preservadas.
- [x] Desktop, tablet e celular, teclado e texto ampliado verificados.
- [x] Gates e regressão aprovados.
- [x] Commit específico da 4C.2, sem incorporar a implementação da 4B (consultar hash no Git).

### Biblioteca de componentes 4C.3 — 08/10/2026

Partida em `main`, HEAD `0e4c52a`, índice vazio; alterações anteriores da auditoria/4B preservadas. Linha de base: 129 testes/29 arquivos passaram antes de editar. O inventário encontrou apenas Button e Field compartilhados; buscas, seleções, badges, tabelas, estados vazios, feedbacks e modais tinham estilos locais repetidos.

Decisões: manter `src/components/ui`, Tailwind e Lucide; reutilizar clsx/tailwind-merge e Radix já instalados; composição nativa de tabelas/controles, sem novas dependências. ConfirmDialog é uma primitiva de apresentação, e Toast não cria timers/fila. Componentes não escrevem em serviços ou persistência. Contratos, exemplos, estados e responsabilidades estão em `DESIGN_SYSTEM.md`.

Integração inicial em Produtos/Caixas: filtros reutilizam SearchInput/Select/TableToolbar; tabelas e cards reutilizam DataTable/Card/EmptyState; status usam texto/ícone sem mudar enum/rótulos; cabeçalhos, erros, loading e modais reutilizam componentes compartilhados. Os formulários recebem apenas loading no botão submit. Os controles nativos de outras telas herdam o novo controlClass; Field associa erros/hints aos controles diretos sem adicionar validação ou mudar handlers. Migração integral das demais telas continua na 4C.4.

O QA detectou falta de retorno de foco nos modais controlados sem Trigger. Modal foi ajustado para preservar e restaurar o elemento de abertura, mantendo os callbacks existentes. A variante de erro utiliza o seletor explícito aria-[invalid=true] do Tailwind; a validação aguarda o término da transição antes de comparar a borda renderizada.

Validação:

- Lint, typecheck, build e 134 testes em 30 arquivos aprovados (129 existentes + cinco contratos de acessibilidade). Vitest passou a incluir os testes de UI em TSX. Cobertura nova: loading bloqueado, submit explícito, toggle true/false, nome de IconButton, controles nativos, vínculos de erro/hint/required, anúncios de feedback e tabela/identificadores.
- `node scripts/shared-components-qa.mjs 8091` e `8081`: desktop/mobile em dev/produção aprovados. Busca/filtro e estado vazio; foco contido, Escape, Cancelar e retorno ao botão nos modais; formulários inválidos sem gravação; erro visual e associação acessível; prévia da etiqueta com QR SVG e superfície branca; leituras BOX/LOCATION chegam à confirmação do scanner sem alterar caixas/movimentos.
- `node scripts/visual-foundation-qa.mjs 8091 fase4c3` e `8081 fase4c3`: oito rotas em desktop/mobile, 32 renderizações, fontes/foco/texto ampliado no scanner aprovados; sem erro de console ou overflow horizontal global.
- Regressão de inventários passou em dev/produção e desktop/mobile, preservando bytes de caixas/movimentos.
- 26 pares de contraste aprovados, sem mudança da paleta. Capturas desktop/mobile de produtos, caixas, erro de formulário e prévia de etiqueta inspecionadas. Evidências locais em `screenshots/fase4c3/`, fora do commit.
- Nenhuma edição em domínio, aplicação, persistência, chaves, rotas, protocolos QR ou CSS de impressão. Dados do operador não foram acessados; QA utiliza perfis descartáveis. Câmera/impressão físicas e conformidade integral WCAG permanecem pendentes para homologação.

Arquivos desta etapa:

- `src/components/ui/`: Button e Field adaptados; class-names, controls, feedback, surfaces, modal e components.test adicionados.
- `src/features/products/`: product-filters, product-table, products-page e product-form.
- `src/features/boxes/`: box-filters, box-table, boxes-page, box-status-badge e box-form.
- `scripts/shared-components-qa.mjs`, `vitest.config.ts`, `docs/DESIGN_SYSTEM.md` e este relatório.

- [x] Inventário e reutilização da estrutura real.
- [x] Componentes, variantes e estados documentados.
- [x] Integração inicial e regressão em desktop/mobile e produção.
- [x] Dados, validações, confirmação do scanner e impressão preservados.
- [x] Commit exclusivo da 4C.3; sem push e sem avançar à 4C.4 (consultar hash no Git).

### Etapas seguintes — ainda não homologadas

- [x] Navegação e identidade global; assinatura temporária substituível.
- [x] Estados default/hover/focus/disabled/selected/loading/error nos componentes compartilhados; composições finais ainda exigem revisão.
- [x] Migração visual das rotas reais, incluindo compatibilidade com inventários.
- [ ] Teclado, zoom e contraste das composições finais segundo WCAG 2.2 AA.
- [ ] Scanner móvel e confirmação operacional.
- [ ] Movimentações e recebimentos funcionais, preservando dados.
- [ ] Etiquetas, payloads QR e compatibilidade de impressão.
- [ ] Revisão final de consistência, suíte e build de produção.

### Migração das telas 4C.4 — 08/10/2026

Partida em `main`, HEAD `b0fd059`; índice vazio. Auditoria e 4B registradas, com alterações anteriores ainda pendentes. Linha de base: 134 testes em 30 arquivos aprovados. Inventário real: oito rotas no workspace, com Produtos como entrada; não existe dashboard separado. A rodada migra apresentação dessas telas, sem criar páginas ou funcionalidades.

Alterações:

- Produtos/Caixas: formulários usam os controles compartilhados; buscas, tabelas, status e cabeçalhos já integrados na 4C.3 são preservados.
- Endereçamento: PageHeader, controles, DataTable com região/caption, seleção de visualização com aria-pressed, estados vazios e Modal com fechamento/foco. Estrutura física e ações permanecem existentes; códigos técnicos recebem escala de 14px.
- Movimentações: cabeçalho, filtros, loading, erro e vazio padronizados; histórico mantém origem/destino, data, fonte e produto efetivamente existentes.
- Mapa: controles e detalhe compartilhados, oito métricas existentes em StatCard, células legíveis e estados/legenda semânticos, sem edição ou alteração da ordenação espacial.
- Scanner: PageHeader, Input, Alert, loading nas ações, controles móveis e confirmação destacada. Handlers e validações preservados.
- Recebimentos: cabeçalho, controles, feedbacks, prévia e confirmação consistentes; reserva de códigos e criação continuam apenas ao confirmar.
- Etiquetas: apenas o diálogo utiliza as primitivas; conteúdo, payloads, dimensões e CSS de impressão preservados.
- Inventários: adaptação por CSS e atributo de seção, preservando o código não commitado da 4B. Não houve reescrita de inventários.

Segurança: 146 handlers de formulário/ação comparados antes/depois, preservados (normalização apenas de formatação). Nenhuma edição desta rodada em domínio, serviços, persistência, contratos, chaves, rotas ou protocolos QR. Dados de QA são gerados pelas ações reais em contextos descartáveis; não são adicionados dados simulados à produção nem aberto o perfil operacional.

Validação e homologação desta rodada:

- Lint sem erros/avisos, typecheck, 134 testes/30 arquivos e build aprovados. O primeiro build encontrou EPERM de acesso à saída no sandbox Windows; repetido com acesso aprovado ao mesmo diretório, passou. Avisos existentes de dependências no build permanecem.
- `visual-foundation-qa` em dev/produção: oito rotas × desktop/mobile, 32 renderizações; fontes, fundo, foco de 3px, ausência de overflow global e scanner com fonte em 200%. Capturas inspecionadas. A revisão detectou sobreposição nas colunas antigas de 76px do mapa móvel; a largura da grade/células foi centralizada no mesmo token de 104px e o QA passou a verificar dimensões e separação entre células. Build e QA de renderização/fluxos em dev e produção foram repetidos após a correção. Mapa/tabelas mantêm rolagem interna quando necessária.
- `shared-components-qa` em dev/produção: buscas, filtros, formulários inválidos sem gravação, foco contido, Escape/retorno ao botão, etiqueta com QR e scanner sem gravação antes da confirmação.
- `operational-screens-qa` em dev/produção e desktop/mobile: seleção de visualizações, áreas, busca/detalhe somente leitura do mapa e retorno de foco; erro de recebimento sem gravação; prévia sem reserva/gravação; confirmação cria duas caixas sem endereço e sem movimento; scanner armazena, troca endereço e remove somente após confirmação; histórico mostra os três eventos e não altera dados.
- Impressão em mídia print: duas etiquetas, superfície branca, largura de 90mm, interface excluída, paths do QR idênticos entre prévia/folha e PDF gerado. Componentes de arte e payloads não foram editados. Câmera/leitura óptica e impressão físicas não foram executadas.
- Regressão de inventários aprovada em dev/produção, desktop/mobile, mantendo bytes de caixas/movimentações oficiais. Script de contraste: 26 pares aprovados; conformidade integral WCAG 2.2 AA permanece para a 4C.5.

Evidências: `screenshots/fase4c4/`, com logs, capturas, resultados JSON e PDFs, fora do commit. QA reproduzível novo: `scripts/operational-screens-qa.mjs`.

Arquivos: AppShell (atributo de seção), controls/feedback, CSS; formulários de produtos/caixas; página de endereçamento/movimentações/scanner; página/formulário de recebimentos; diálogo de etiquetas; componentes de mapa (página, resumo, grade, célula, legenda, busca, detalhe); este relatório, Design System e script de QA operacional.

O commit inclui exclusivamente a apresentação da 4C.4. Para AppShell e arquivos do mapa com alterações da 4B, versões de índice foram reconstruídas a partir de HEAD com os mesmos ajustes visuais. Imports, props e anotações de inventários anteriores continuam apenas no workspace. A validação descrita é do workspace integrado com a 4B, cuja implementação permanece pendente no Git. Sem push, merge, tag, reset ou limpeza de dados.

- [x] Rotas reais migradas, sem dashboard fictício.
- [x] Identidade e componentes consistentes em desktop/mobile.
- [x] Confirmações, dados e fluxo de recebimento preservados.
- [x] Etiquetas/QR e saída PDF preservados.
- [x] Gates, QA em navegador e regressão aprovados.
- [ ] Homologação abrangente 4C.5: revisão final WCAG, dispositivos/câmera e impressão físicas. Não iniciada nesta rodada.

### Refinamento e homologação 4C.5 — 08/10/2026

Partida em `main`, HEAD `66c54e0`, índice vazio. Auditoria e 4B registradas; alterações anteriores continuam preservadas. Linha de base: 134 testes/30 arquivos aprovados. Escopo mantido na apresentação e verificação, sem nova funcionalidade ou edição de domínio, persistência, rotas, chaves, validações, handlers do scanner ou protocolos QR.

Correções encontradas pela revisão: filtro de data de caixas migrou para Input compartilhado; ação do código de endereço recebeu área de 44px; controles e botões respeitam largura disponível; cards móveis de caixas permitem quebra entre código e status; código interno de produto associa hint/erro e obrigatoriedade acessíveis; marca tipográfica remove aria-label indevido em elemento genérico. Foco de controles de data também acompanha a edição dos segmentos nativos.

Container queries ajustam shell, cabeçalhos, grades e modais à largura realmente disponível com tipografia ampliada. Sidebar cede espaço ao menu móvel; textos longos quebram e formulários usam uma coluna quando necessário. Mapa e tabelas preservam leitura bidimensional e rolagem interna. Arte de etiquetas e CSS de impressão não foram alterados.

Verificação final em desenvolvimento e produção:

- Lint, typecheck, 134 testes/30 arquivos, 149 testes auxiliares e build aprovados. EPERM nos testes auxiliares do sandbox resolvido repetindo o comando com acesso autorizado, sem editar ferramentas. Avisos existentes de dependências do build permanecem.
- Axe-core 4.11.4 isolado das dependências do app: 125 estados por ambiente, quatro larguras (1280/768/390/320), texto em 200%, espaçamento ampliado e estados de formulários/inventário, sem violações detectadas ou overflow global. Percursos de Tab verificam foco visível e desobstruído. Resultados inconclusivos são preservados; não se declara conformidade integral WCAG.
- 28 pares de contraste, incluindo composição das hachuras do mapa, aprovados. Capturas desktop/mobile, fonte ampliada, etiquetas e scanner inspecionadas.
- Regressões do shell, componentes, telas operacionais e inventários repetidas. Prévia e erros não gravam; recebimento e movimentações mantêm confirmação; histórico/mapa somente leitura; inventários preservam os bytes de caixas/movimentos oficiais.
- QR renderizado decodificado pelo scanner existente em 1280/390/320px. PDF/print mantém caixa 90mm, endereço 100mm e branco de alto contraste.
- Câmera negada/ausente, loading bloqueado e reduced motion verificados. Vídeo canvas passa pelo decoder real em 390/320px: BOX → LOCATION → confirmação; sem gravação antecipada, movimento SCAN após confirmar e câmera encerrada. Não representa ensaio físico de dispositivo.

Checklist, comandos, referências e limites em `CHECKLIST_HOMOLOGACAO_VISUAL.md`. Evidências em `screenshots/fase4c5/`, fora do commit. Scripts novos: auditoria visual/acessibilidade, QR/print e câmera com vídeo. Scripts anteriores aceitam pasta de evidências da rodada, preservando defaults; contraste passa a verificar fundos compostos.

A primeira captura de impressão em desenvolvimento foi interrompida pela recarga do Vite ao salvar SVG de evidência. O script passou a salvar esses arquivos após concluir as verificações; a repetição passou. Houve também uma captura excedendo o timeout sob QA concorrente; repetida com o ambiente estável, passou. Nenhuma dessas ocorrências exigiu mudar o fluxo de impressão do aplicativo.

O commit inclui apenas a 4C.5. AppShell recebe staging seletivo a partir de HEAD: import/entrada Inventários da 4B continuam somente no workspace, junto aos demais arquivos anteriores. A verificação descreve esse workspace integrado. Sem push, merge, tag, reset ou limpeza de dados.

- [x] Refinamentos, revisão em navegador e regressões concluídos.
- [x] Documentação, gates e evidências atualizados.
- [ ] Câmera/impressora reais, leitor de tela e auditoria manual integral WCAG.
- [ ] Homologação visual pelo responsável do produto e aprovação do logotipo definitivo.

A 4C.5 está implementada e verificada no escopo de navegador. A homologação integral permanece pendente dos ensaios listados, sem aprovação presumida.

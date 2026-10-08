# Fase 5A — mapa espacial 3D

## Preparação — 08/10/2026

Status: preparação e checkpoint anterior à implementação. Nenhuma funcionalidade da 5A foi implementada ou homologada nesta revisão.

Repositório local em `main`, HEAD inicial `5e68573`. Remoto `origin`: `https://github.com/patrickbotarick/Orion-Storage.git`. Após `git fetch origin`, `origin/main` aponta para `35d9a81`; a branch local está cinco commits à frente e nenhum atrás. Fetch consulta o remoto; nenhum pull, push, merge ou tag foi executado. Conforme instrução do usuário, qualquer `git pull` exige confirmação explícita antes de executar.

A implementação visual 4C.1–4C.5 está registrada no Git e em `FASE_04C_IDENTIDADE_VISUAL.md`. Homologação física de câmera/impressora, leitor de tela e auditoria manual integral WCAG continuam pendentes em `CHECKLIST_HOMOLOGACAO_VISUAL.md`; não impedem a inspeção técnica da 5A e não são presumidas aprovadas.

Referência local: diretório `Orion Storage v1.0.0`; o manifest não declara campo de versão. React 19, TypeScript, Vite, TanStack Start/Router, Tailwind 4 e Lucide, com domínio em `packages/domain`, serviços em `src/application`, adaptadores em `src/persistence` e interfaces em `src/features`. Não recriar o projeto nem adotar contratos Linux/Grok incompatíveis com este workspace Windows.

Havia alterações anteriores da auditoria/4B: inventários no domínio, serviço, persistência, testes, rota, tela e indicador do mapa; README e relatórios. Elas serão preservadas no commit inicial solicitado, junto deste registro. Evidências e ferramentas de auditoria instaladas em `screenshots/` ficam fora do commit. Nenhum dado do navegador do operador é acessado ou modificado pelo Git.

Linha de base repetida: lint, typecheck e 134 testes em 30 arquivos passaram. Build de produção e regressões desktop/mobile do mesmo código passaram na rodada 4C.5; registros disponíveis em `screenshots/fase4c5/`. Repetir os gates após alterações da 5A.

## Inspeção e riscos de compatibilidade

- `StorageArea` já existe: reutilizar área, identidade e persistência. Código da área não é editável pelo serviço atual.
- `Location` já existe com ID, código, área, corredor, prateleira, nível, posição, status e capacidade. Há estados ACTIVE/BLOCKED/INACTIVE; não duplicar bloqueios ou criar estoque no mapa.
- Caixas referenciam a localização por ID; ocupação, produtos e movimentações são a fonte oficial. Inventários têm snapshots históricos que precisam permanecer íntegros.
- QR `orion://v1/location/...` atual resolve pelo código legível, não pelo ID. Renomeação exige aliases/identidade estável e testes de compatibilidade antes de ser liberada; não reescrever etiquetas antigas nem mudar arbitrariamente o protocolo.
- O serviço atual impede mudar a estrutura de endereço ocupado. A evolução espacial deve preservar essa proteção e impedir remoção de posições vinculadas. Não migrar endereços antigos automaticamente para coordenadas presumidas.
- Persistência atual é localStorage, sem transação entre várias chaves ou garantia multiusuário. Novas gravações estruturais precisam ser validadas integralmente, tratar falhas de gravação e manter a última versão recuperável; não apresentar escrita parcial como transação atômica.
- Layout físico real não foi medido nem fornecido neste briefing. Exemplo deve ficar separado do estoque oficial e explicitamente identificado, sem criar endereços fictícios automaticamente.
- Three.js/R3F/Drei não estão nas dependências atuais. Compatibilidade, versões, carregamento sob demanda, bundle e fallback sem WebGL devem ser avaliados antes de instalar.

## Plano de implementação por checkpoints

1. **Domínio espacial:** adaptar endereçamento, zonas/estruturas/layout e compatibilidade QR, IDs estáveis, validações e testes. Estratégia de migração explícita, sem reset das chaves existentes.
2. **Gerador modular:** face U ou A/B, níveis independentes e posições variáveis; colmeia e suporte de domínio para piso. Um referencial local fixo mantém as faces mesmo ao girar. Geometria derivada da configuração.
3. **Visualizador:** módulo 3D sob demanda, perspectiva/superior e seleção; alternativa lista/2D utilizável sem WebGL. Tokens Industrial Precision e primitivas existentes. Geometria simples, controle de câmera e desempenho observáveis.
4. **Editor:** rascunho separado de consulta, snap, mover/rotacionar, dimensões, duplicação e modulação; colisões/limites/códigos validados antes de salvar; cancelamento restaura o estado persistido. Confirmar alterações destrutivas e recusar remoção com estoque.
5. **Integração:** busca com várias ocorrências, enquadramento da face/posição, detalhe com estoque oficial, QR/etiquetas/scanner existentes e confirmação antes de movimentar.
6. **Validação:** testes de domínio/serviço/persistência, reload, legado, WebGL/fallback, desktop/mobile, lint/typecheck/build e documentação. Commit pequeno após cada checkpoint validado e commit final solicitado. Sem push automático.

## Aprovação de sincronização

O commit inicial deve anteceder o eventual pull e as mudanças da 5A. A execução de `git pull --ff-only origin main` será solicitada explicitamente ao usuário. No estado remoto observado não existem commits a incorporar. Se houver divergência, não realizar merge, reset ou rebase automaticamente; analisar e apresentar a situação.

## Registro de implementação

No início da execução os seis checkpoints estavam pendentes. Os registros abaixo descrevem a implementação e sua validação progressiva; a preparação acima permanece como histórico da situação encontrada.

### Checkpoint 1 — domínio espacial

Pull `--ff-only` autorizado pelo usuário e executado em 08/10/2026: Already up to date. Implementação na branch `codex/phase-5a-spatial-map`, após commit de preservação `2e6c354`.

Modelo adicional em `spatial.ts`: layout por área, zona, estrutura, faces, níveis e slots. Cada slot referencia Location oficial; geometria não contém saldo. Metadados opcionais em Location preservam registros legados sem migração automática. Layout novo utiliza chave `orion-storage.spatial-layouts.v1`; leitura não cria posições.

O serviço valida a configuração inteira, códigos/aliases globais, capacidade, estoque vinculado e revisão antes de gravar. Remoção vazia exige confirmação e desativa o endereço, conservando registro/QR/histórico; remoção ocupada é recusada. Novas posições recebem QR estável LOC-ID dentro do protocolo v1; renomeação conserva aliases. Vinculação explícita de legado conserva seu código. Endereçamento antigo bloqueia alteração da hierarquia de posições espaciais pelo formulário anterior, mas conserva notas/capacidade/status.

Gravação local usa journal de rollback antes das duas chaves. Falha reverte e uma interrupção é recuperada ao construir o repositório de endereços. Não é transação entre abas: comparação de snapshots/revisão detecta alterações observadas, sem garantia multiusuário. Corrupção do layout é recusada sem reset.

Primeira validação: 149 testes/32 arquivos passaram, incluindo 15 novos testes de domínio/serviço, legado, QR, colisões, revisão, remoção e falha/recuperação. Gates deste checkpoint registrados antes do commit. Não há aceite de visualizador/editor neste checkpoint.

### Checkpoint 2 — gerador modular

`spatial-generator.ts` gera prateleiras SINGLE/DOUBLE, HONEYCOMB e FLOOR. Níveis têm quantidades independentes; cada slot mantém ID e vínculo quando sua linha é redimensionada. Dimensões de compartimentos podem ser individuais; validação impede exceder altura/largura/profundidade da estrutura. FLOOR tem suporte de domínio e geometria simples, sem fluxo avançado de pallets.

Referencial: metros, +Y para cima, piso X/Z. Centro da estrutura em x/z; rotação positiva segue Y do Three.js. U/A acessam +Z local, B acessa -Z local. P01 fica à esquerda do observador frontal de cada face, portanto B inverte X. N01 começa no piso e cresce para cima. Rotação nunca troca o nome das faces. Gerador e vista frontal derivam a mesma configuração.

Sete testes de geração/orientação/modulação passaram; suíte total 156 testes/33 arquivos, lint e typecheck aprovados. Valores iniciais são sugestões editáveis, nunca medições do estoque superior.

### Checkpoint 3 — visualizador espacial

Bibliotecas fixadas: Three.js 0.186.1, React Three Fiber 9.8.1, Drei 10.7.9 e tipos Three 0.186.0. Compatibilidade React 19 verificada no registry e na [documentação oficial de instalação do R3F](https://r3f.docs.pmnd.rs/getting-started/installation). Controles segundo [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Sem física, modelos externos ou texturas de produtos.

Cena sob demanda em `spatial-scene.tsx`: piso, grade, estruturas, slots e rótulos técnicos derivados da configuração; perspectiva, câmera ortográfica superior e enquadramento frontal da face. Frames/slots usam InstancedMesh; limite de 50 estruturas/2000 posições por área, DPR máximo 1,5 e frameloop demand. Rótulos são sprites locais com cores do design system; nenhum saldo paralelo. Limites de distância/zoom/ângulo e controles de aproximar/afastar, centralizar/restaurar.

Fallback 2D/lista e vista frontal permanecem utilizáveis sem WebGL e após perda de contexto. Default é 2D; 3D só carrega ao ativar. Sprite substituiu o helper Html após QA encontrar erro de desmontagem de roots React aninhados. Listener de contexto é removido ao sair normalmente do 3D, evitando feedback falso de falha. Aviso de Clock obsoleto vem do R3F; a aplicação não utiliza Clock.

Build: chunk espacial ~932kB minificado/~248kB gzip, carregado sob demanda; chunk da rota mapa ~52kB/~16kB gzip. O aviso de chunk >500kB permanece explícito; não foi ocultado. Não houve benchmark de hardware modesto real. `npm audit` aponta os mesmos três alertas anteriores (Vitest/mocker/tinypool); comparação com o lockfile inicial confirma que não são das novas bibliotecas. Atualização dessas ferramentas não foi feita indiscriminadamente nesta fase.

QA Edge/Chromium com WebGL por software, desktop 1280 e mobile 390: perspectiva, superior e frontal B renderizadas e capturas inspecionadas; sem erros de console. Alternativa sem WebGL verificada. Verificação gráfica real em navegador, sem afirmar teste de GPU/celular físicos.

### Checkpoint 4 — editor de layout

Integração em `/mapa`, preservando o mapa operacional como modo inicial. `SpatialPanel` mantém rascunho separado e default 2D; área e troca de modo ficam bloqueadas durante edição. Seleção, arraste na planta, coordenadas, snap opcional, rotação de 90°/numérica, dimensões, duplicação sem vínculos e modulação de cada face/nível/compartimento. Cancelar restaura o layout persistido. Estado inválido é mostrado por texto e borda, impedindo salvar; posições ocupadas são recusadas pelo serviço mesmo após confirmação.

Zonas têm identidade própria e nome/finalidade editável, sem pertencer ao código do endereço. View frontal usa a mesma configuração da geometria, em níveis de cima para baixo; posições da esquerda para a direita de quem observa aquela face. Lista/detalhe permanecem acessíveis e consultam caixas oficiais. Exemplo interativo não pode ser gravado nem gerar endereços; medidas precisam de levantamento físico. Configuração de novas áreas continua na funcionalidade existente Endereçamento → Nova área.

No modo espacial, filtros de corredor/prateleira da hierarquia anterior não são mostrados; busca e área permanecem, e resumo de ocupação é expansível para priorizar consulta móvel. Nenhuma operação de movimentação é adicionada ao editor.

QA desktop/mobile: exemplo sem gravação, vínculo explícito do endereço antigo ocupado, níveis 5/3/5, faces A 5/3/5 e B 4/2/5, criação de colmeia, rotação, zona, save/reload, cancelamento, limites inválidos e recusa de remoção ocupada passaram. Perfis descartáveis; estoque oficial permaneceu intacto até ações explícitas de scanner em QA posterior. Script reproduzível `scripts/spatial-map-qa.mjs`.

### Checkpoint 5 — integração operacional

Busca existente continua consultando catálogo, caixas e endereços oficiais, incluindo várias ocorrências do mesmo produto. Selecionar resultado identifica área, estrutura, face, nível e posição, destaca o compartimento e enquadra a câmera quando ativa. Endereços legados sem geometria continuam consultáveis e não recebem coordenadas presumidas.

Etiquetas de posições novas utilizam `orion://v1/location/LOC-ID`; códigos anteriores continuam resolvendo via código/aliases. QR antigo de endereço vinculado conserva compatibilidade. Navegador decodificou os pixels do QR com Html5Qrcode, identificou a caixa e esse destino no scanner existente, verificou ausência de gravação antes da confirmação e confirmou a movimentação. A busca subsequente encontrou a caixa na face B/P01 e conservou a outra ocorrência do produto.

Formulário anterior conserva capacidade/notas/status, mas hierarquia espacial é editada pelo mapa. Save de geometria não desfaz mudanças operacionais de status/capacidade. Envelopes inválidos de endereços/caixas são recusados antes da escrita; testes demonstram preservação dos valores corrompidos, sem reset. Diálogo de remoção mantém foco no editor ao fechar e impede fechamento durante gravação.

Lint/typecheck e 159 testes em 33 arquivos passaram. QA real em desenvolvimento: desktop/mobile, arraste com snap, consulta sem edição, câmeras, fallback, estoque, scanner, busca e QR passaram sem erros de console. Axe nos estados vazio/editor/confirmador/consulta não encontrou violações nas regras WCAG A/AA selecionadas; itens incompletos são registrados para revisão manual. Isso não certifica acessibilidade integral nem substitui hardware físico.

# ORION STORAGE — estado atual e continuidade no Codex

Atualizado em 08/10/2026 após implementar a Fase 5A. Os registros 4B e auditoria inicial abaixo são históricos. Contratos da 4B: [FASE_04B_INVENTARIO.md](FASE_04B_INVENTARIO.md); detalhes atuais: [FASE_05A_MAPA_ESPACIAL_3D.md](FASE_05A_MAPA_ESPACIAL_3D.md).

## Estado atual após a Fase 5A

- Branch `codex/phase-5a-spatial-map`; baseline preservada em `2e6c354`, pull autorizado `--ff-only` sem novidades. Sem push, merge ou tag.
- Industrial Precision preservado; mapa operacional continua como modo inicial. `/mapa` adiciona consulta/editor espacial com 2D/lista e WebGL sob demanda.
- Área existente, zona, estrutura, face, nível e posição. Compartimentos referenciam Location oficial; caixa/movimentação/inventário continuam fontes operacionais.
- SINGLE/DOUBLE/HONEYCOMB/FLOOR; dimensões e modulação variáveis, snap/rotação/duplicação, validações e cancelamento. Remoção ocupada recusada; vazia desativa sem apagar histórico.
- IDs estáveis, QR v1 com aliases, ligação explícita do legado sem geometria presumida. Novas chaves de layout/journal, sem reset de chaves anteriores.
- 159 testes/33 arquivos. Evidências desktop/mobile e dev/produção em `screenshots/fase5a/`; documentação da fase registra gates, limitações e commits.
- Persistência local tem recuperação de falhas, sem garantia transacional entre abas. WebGL verificado por software; medição física, hardware móvel/GPU/impressora e acessibilidade manual integral ainda exigem homologação na operação.

## Estado atual após a Fase 4B

- Fases concluídas: 1, 2A, 2B, 3A, 3B, 3C, 4A e 4B.
- Nova rota `/inventarios` e navegação Inventários: seleção por área/corredor/prateleira/nível/posição, snapshot, observação por câmera ou código manual, revisão, conclusão/cancelamento, histórico, busca e grupos de divergência.
- Novos contratos InventorySession, InventoryItem, InventoryScope e InventoryRepository no domínio; InventoryService em `src/application/inventories`; adapter LocalStorageInventoryRepository em `src/persistence`; UI em `src/features/inventories`.
- Chave adicional `orion-storage.inventories.v1`, com envelope/ledger próprios e códigos INV-AAAAMMDD-NNNNNN; sem seed, autenticação ou banco remoto.
- Snapshot guarda as posições do escopo e a localização inicial das caixas conhecidas. Movimentações posteriores não mudam o esperado. Caixa nova após início é sempre não esperada.
- MATCH, MISSING, UNEXPECTED e WRONG_LOCATION são grupos exclusivos. Caixa registrada em outra posição é WRONG_LOCATION; caixa sem posição registrada é UNEXPECTED. Duplicidades e caixas inexistentes são recusadas.
- COMPLETED/CANCELLED são terminais e imutáveis. Nenhuma escrita em caixas, BoxHistory ou Movement ocorre durante inventário.
- Mapa continua somente leitura: ícone/texto de divergência da última conclusão que cobre cada posição; ocupação continua baseada em Box.currentLocationId.
- Qualidade: lint, typecheck e build passaram; 129 testes em 29 arquivos (26 novos). QA desktop/mobile em desenvolvimento e produção, com contextos descartáveis e storage oficial inalterado. Script reproduzível `scripts/inventory-browser-qa.mjs`; evidências em `screenshots/fase4b/`.
- Limites: localStorage por origem, concorrência multiaba sem transação, câmera física não testada. Leitura no lugar errado não é editável nesta fase; realizar novo inventário para nova observação. Não há correção/ajuste automático, Movement de contagem, expedição, ERP ou usuários.
- Próximo passo exige novo escopo explícito; uma futura correção deverá ser auditável e confirmada. Sem commit automático.

## Registro da auditoria inicial (antes da Fase 4B)

## Resultado geral

O projeto existente está operacional em Windows. As fases 1, 2A, 2B, 3A, 3B, 3C e 4A têm implementação no domínio, aplicação e interface. Lint, typecheck, os 103 testes do produto e build passaram. Também passaram 149 testes auxiliares em cinco arquivos de scripts. As sete rotas reais renderizaram em desktop e celular no desenvolvimento e na produção, sem erros de console capturados e sem overflow horizontal global.

Não houve reescrita, alteração de regras, remoção de resíduos, commit ou push. As únicas adições permanentes desta auditoria são este documento e as evidências em `screenshots/codex-auditoria/`. O build recriou saídas ignoradas pelo Git. A instalação removeu três pacotes extraneous de node_modules; a normalização incidental de package-lock.json foi revertida para preservar seu conteúdo original.

## Stack e configuração

| Camada                | Situação verificada                                                               |
| --------------------- | --------------------------------------------------------------------------------- |
| Ambiente da auditoria | Windows, Node 24.11.1, npm 11.6.2                                                 |
| Interface             | React/React DOM 19.3.0, TypeScript 5.9.3 strict, Tailwind 4.3.3, Radix UI, Lucide |
| Aplicação web         | Vite 8.3.2, TanStack Start 1.168.60 e Router 1.170.41                             |
| Validação             | Zod 4.6.5 e validadores de domínio                                                |
| QR                    | qrcode.react 4.2.0 e html5-qrcode 2.3.8                                           |
| Qualidade             | Vitest 3.2.4, ESLint 9.39.5, Prettier 3.9.9                                       |
| Produção              | Nitro 3.0.260610-beta, preset Vercel; saída .vercel/output                        |
| Dados                 | localStorage por origem, sem banco remoto ou autenticação                         |

Versões acima são as efetivamente instaladas, não apenas os intervalos do package.json. O README pede Node 22 ou superior, mas não existe engines no package.json. Esta execução validou Node 24; não constitui teste em todas as versões de Node 22.

`vite.config.ts` preserva plugins PWA Grok, Tailwind, TanStack Start, React e Nitro condicionado a build/preview. Dev usa 0.0.0.0:8080 com strictPort; `--port` sobrescreve a porta. Preview usa 127.0.0.1:8081. `tsconfig.json` inclui src, server e packages, com aliases @, @orion/domain e @orion/shared. Vitest tem configuração separada, ambiente node e aliases equivalentes. ESLint exclui saídas geradas e routeTree.gen.ts.

## Arquitetura e estrutura

```text
Interface React (src/features)
  → serviços (src/application)
  → contratos e regras (packages/domain)
  → adapters (src/persistence)
  → KeyValueStore / localStorage
```

O domínio não importa React ou localStorage. Os componentes acessam serviços; a montagem dos adapters locais ocorre nos getBrowser*Service, protegidos contra execução sem window. A camada de aplicação conhece as implementações concretas para essa montagem; não há container de injeção separado. Existem TanStack Query/Table, Zustand, Recharts e outros pacotes no manifesto que não são centrais a esse fluxo; reduzir dependências exige outra análise, sem remoção nesta execução.

```text
packages/domain/src/     entidades, contratos, schemas, regras, filtros, seeds, testes
packages/shared/src/     labels e formatação
src/application/        produtos, caixas, endereçamento, movimentos, recebimentos
src/persistence/        seis adapters locais e KeyValueStore
src/features/           products, boxes, locations, identification, scanner,
                        movements, receipts, warehouse
src/components/         shell, bridge e controles de interface
src/lib/                erros e integração de preview
src/routes/             sete páginas e shell __root
src/router.tsx          getRouter e componente de erro
src/routeTree.gen.ts     árvore gerada pelo TanStack
src/styles.css          tokens, layout, impressão e fonte externa
docs/                   sete documentos de fases e este ponto de entrada
public/                 favicon Orion e recursos PWA Grok
server/                 middleware Grok incorporado ao build Nitro
scripts/                preview, PWA, smoke, brand e escrita atômica
.grok/                  instruções/referências e estado do antigo ambiente
.tanstack/              arquivos temporários gerados
.vercel/                saída gerada de produção
artifacts/              pasta vazia na inspeção inicial
screenshots/            evidências anteriores e evidências desta auditoria
node_modules/           dependências locais, regeneráveis
```

O inventário completo dos arquivos de fonte, documentação e ferramentas está no apêndice. node_modules e saídas de build não são expandidos nesse inventário.

## Entidades e relações

| Entidade    | Contrato e principais campos                                                              | Relações                                                                    |
| ----------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Product     | product.ts; internalCode, name, category, status, marca e medidas opcionais, timestamps   | Uma Product tem muitas Box; produto precisa estar ativo para criar caixa    |
| Box         | box.ts; code, productId, rollsQuantity, totalLengthM, receivedAt, status, history         | productId imutável; currentLocationId e receiptId opcionais                 |
| StorageArea | storage-area.ts; code estável, name, ACTIVE/INACTIVE                                      | Uma área tem muitas Location                                                |
| Location    | location.ts; areaId, aisle, rack, level, position, code, capacityBoxes opcional, status   | Muitas caixas podem ocupar uma posição; uma caixa tem no máximo uma posição |
| Movement    | movement.ts; boxId, type, source, origem/destino opcionais, instante e metadata           | Muitas Movement por Box; origem/destino apontam Location; append-only       |
| Receipt     | receipt.ts; code, CONFIRMED, receivedAt, supplierName livre, requestId, items             | Cria várias Box vinculadas por receiptId                                    |
| ReceiptItem | embutido em Receipt.items; receiptId, productId, boxesQuantity, conteúdo por caixa e lote | Não possui repositório próprio; não há receiptItemId na Box                 |

BoxHistoryEntry é um histórico embutido na caixa. Seus tipos são CREATED, UPDATED, STATUS_CHANGED, LOCATION_ASSIGNED, LOCATION_CHANGED e LOCATION_CLEARED. Histórico da entidade e Movement logística são registros distintos.

Schemas Zod: productInputSchema, boxCreateSchema/boxUpdateSchema, storageAreaCreateSchema/storageAreaUpdateSchema e locationFormSchema. ReceiptDraft é validado por planReceipt/normalizeDraft e pelos validadores de caixa; não existe um receipt schema Zod separado. Movement usa planMovement e assertAppendOnly. Persistência valida a versão e a estrutura geral do envelope, mas não aplica os schemas completos a cada registro lido.

Normalização central em normalize.ts: espaços, comparação sem acentos/caixa, tokens de código e código interno. Códigos internos são únicos por comparação canônica; duplicatas antigas podem permanecer se a edição não trocar o código. Medidas são números puros, com vírgula aceita no formulário. Filtros de produto, caixa, localização, movimento e recebimento ficam no domínio, assim como busca e ocupação do mapa.

## Repositories, serviços e persistência

| Contrato              | Adapter                           | Chave localStorage             | Serviço         |
| --------------------- | --------------------------------- | ------------------------------ | --------------- |
| ProductRepository     | LocalStorageProductRepository     | orion-storage.products.v1      | ProductService  |
| BoxRepository         | LocalStorageBoxRepository         | orion-storage.boxes.v1         | BoxService      |
| StorageAreaRepository | LocalStorageStorageAreaRepository | orion-storage.storage-areas.v1 | LocationService |
| LocationRepository    | LocalStorageLocationRepository    | orion-storage.locations.v1     | LocationService |
| MovementRepository    | LocalStorageMovementRepository    | orion-storage.movements.v1     | MovementService |
| ReceiptRepository     | LocalStorageReceiptRepository     | orion-storage.receipts.v1      | ReceiptService  |

BoxLocationService permanece como implementação da Fase 2B e é testado, mas a interface atual usa MovementService para atribuir/trocar/remover localização. Evitar reutilizar aquele serviço no fluxo operacional atual: ele atualiza o histórico da caixa sem criar Movement.

Caixas e recebimentos guardam ledgers de sequência nos próprios envelopes. Códigos CX-AAAAMMDD-NNNNNN e REC-AAAAMMDD-NNNNNN usam o dia operacional America/Sao_Paulo. O repositório de caixas expõe snapshots e restauração; MovementService atualiza a caixa e depois grava Movement, restaurando a caixa se a segunda escrita falhar. ReceiptService grava todas as caixas e depois Receipt; restaura o snapshot se essa escrita falhar. requestId torna uma repetição do recebimento idempotente. Isso não é uma transação de banco e não protege contra duas abas concorrentes nem contra falha da própria restauração.

Seeds só entram quando a respectiva chave não existe: dois produtos, quatro caixas, área SUP e 28 posições. Três caixas já têm localização; a quarta não. Movements e Receipts começam vazios; não são inventados registros retroativos. Endereços antigos não são ampliados automaticamente. Os seis ids originais foram preservados na grade maior. Lista persistida vazia não é resemeada.

**Preservação de dados:** mudar hostname, porta, protocolo, perfil ou navegador muda a origem do localStorage. localhost:8080, localhost:8091 e 127.0.0.1:8091 não compartilham dados. Copiar o projeto não copia o estoque do navegador. A auditoria visual usou contextos novos de teste, sem limpar ou editar o storage operacional do usuário.

## Funcionalidades e fases confirmadas por código

| Fase                    | Implementação confirmada                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Produtos            | Cadastro, edição, duplicação por formulário, ativar/desativar, busca, categoria/marca/status, código sugerido/editável, unicidade e divergência de metragem |
| 2A — Caixas             | Criação, edição do conteúdo, código único com ledger, cinco status, histórico, filtros e consulta de localização atual; produto e código imutáveis          |
| 2B — Endereçamento      | Áreas e posições, edição/status, hierarquia física, código composto único, capacidade e bloqueio de estrutura ocupada                                       |
| 3A — QR/etiquetas       | Box e Location, protocolo orion://v1, parser/resolução, SVG QR na tela, preview e impressão individual                                                      |
| 3B — Scanner/movimentos | Câmera sob ação explícita com preferência traseira/fallback frontal, entrada manual, confirmação obrigatória, STORED/MOVED/REMOVED, histórico e filtros     |
| 3C — Recebimentos       | Vários produtos/caixas, preview sem reservar sequência, limite 500 caixas, confirmação idempotente, vínculo de origem, etiquetas A4 em lote e reimpressão   |
| 4A — Mapa               | Somente leitura, área/corredor/prateleira/nível/posição, ocupação, status/capacidade, busca e filtros, detalhes e atalhos para caixa/endereço               |

O QR identifica por código operacional, sem URL de servidor. A câmera depende de contexto seguro e permissão; não foi validada com hardware físico. Impressão usa window.print e CSS, sem serviço de impressora ou biblioteca de PDF. A inspeção de código confirma impressão individual e múltipla; impressão física não foi executada.

## Rotas e execução verificada

| Rota           | Página        | Dev 8091 desktop/mobile | Produção 8081 desktop/mobile |
| -------------- | ------------- | ----------------------- | ---------------------------- |
| /              | Produtos      | 200, conteúdo visível   | 200, conteúdo visível        |
| /caixas        | Caixas        | 200, conteúdo visível   | 200, conteúdo visível        |
| /enderecamento | Endereçamento | 200, conteúdo visível   | 200, conteúdo visível        |
| /scanner       | Scanner       | 200, conteúdo visível   | 200, conteúdo visível        |
| /movimentacoes | Movimentações | 200, conteúdo visível   | 200, conteúdo visível        |
| /recebimentos  | Recebimentos  | 200, conteúdo visível   | 200, conteúdo visível        |
| /mapa          | Mapa          | 200, conteúdo visível   | 200, conteúdo visível        |

Não há /produtos na árvore gerada; o catálogo está em /. As 28 combinações de rota/viewport/ambiente foram capturadas com Edge headless via Playwright: zero erros de console/pageerror capturados e zero overflow global. Screenshots e texto/resultado JSON estão em `../screenshots/codex-auditoria/`. A validação cobre carregamento, hidratação e renderização; não equivale a teste de cada interação ou hardware. Foi usado um smoke transitório, pois o helper Grok exige /workspace e o Chromium próprio do Playwright não estava instalado. Não foi necessário mudar o código do produto.

`npm run dev` também iniciou na porta padrão 8080 e respondeu 200. `npm run dev -- --port 8091` iniciou sem mudar vite.config.ts. O servidor 8091 foi mantido para continuidade; os servidores extras de QA foram encerrados ao final.

INICIAR_ORION.bat foi inspecionado: cd /d %~dp0, verificação de npm, instalação quando node_modules não existe, porta padrão/personalizada, validação de faixa 1024–65535, detecção de porta ocupada, abertura de navegador e call npm run dev. Não contém caminho absoluto de máquina. O fluxo interativo inteiro do .bat não foi executado, para evitar abrir janelas/navegador e iniciar uma instalação extra. Sua experiência foi preservada; o comando que ele chama foi executado em Windows. Há uma ressalva para entradas numéricas com zero inicial, que merecem teste específico do cmd em futura manutenção.

## Checks e testes

| Comando                                                     | Resultado                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| npm install --offline --ignore-scripts --no-audit --no-fund | Sucesso pelo cache local; não é prova de instalação do zero com rede nem de scripts de instalação |
| npm run lint                                                | Exit 0, sem avisos emitidos                                                                       |
| npm run typecheck                                           | Exit 0                                                                                            |
| npm test                                                    | 26 arquivos, 103 testes, todos passaram                                                           |
| npm run build                                               | Exit 0, client + SSR + Nitro/Vercel                                                               |
| node --test scripts/*.test.mjs                              | 5 arquivos, 149 testes, todos passaram fora do isolamento                                         |

Os primeiros testes auxiliares tiveram EPERM ao renomear arquivos temporários no isolamento; a repetição com acesso normal passou sem editar os scripts. O npm avisou que @vitest/mocker 3.2.4 declara peerOptional Vite 5/6/7, enquanto o projeto usa Vite 8.3.2. O build emitiu avisos MODULE_LEVEL_DIRECTIVE para dependências com "use client" e aviso de tempo de callbacks do plugin TanStack. São avisos reais, sem falha de build ou renderização neste conjunto de checks. Nitro ainda é beta.

Os 26 arquivos do produto estão no inventário ao final. Cobrem normalização/códigos, schemas, conteúdo/histórico/seeds/filtros, QR/labels/scanner, recebimentos, endereçamento, mapa, repositories de produtos/caixas e serviços de caixa/localização/movimento/recebimento. Não há cobertura automática dedicada de todos os adapters, LocationService completo, câmera real, impressão física, quota/corrupção de storage ou concorrência multiaba. Os cinco testes de scripts não são executados pelo npm test, cuja inclusão está restrita a packages e application/persistence.

## Resíduos do Grok: classificação e decisão

Classificação considera o estado atual e o contrato preservado; removível significa candidato a limpeza futura, não autorização para apagar agora.

| Item                                                      | Classe                                | Build/testes e decisão                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| .grok/skills e .grok/references                           | ÚTIL / legado de orientação           | Não são runtime do estoque; referências também são verificadas por testes auxiliares. Preservados como documentação histórica                                                                                      |
| .grok/app-env.json                                        | LEGADO / REMOVÍVEL isoladamente       | Scripts npm atuais chamam Vite diretamente; não há with-app-env ativo. Auth/db já ausentes da aplicação. Arquivo não decide o comportamento atual                                                                  |
| .grok/status e .node_modules.lock                         | LEGADO / REMOVÍVEL                    | Estado do antigo ambiente; não encontrado consumo em fonte/config/scripts ativos. Não usar status como prova de servidor ativo                                                                                     |
| .tanstack/tmp                                             | LEGADO / REMOVÍVEL (gerado)           | Cache do framework; pode ser recriado com servidores parados; não é código nem dados de estoque                                                                                                                    |
| .vercel/output                                            | LEGADO / REMOVÍVEL (gerado)           | Saída do build, usada pelo preview de produção. Limpeza exige rebuild antes do próximo preview                                                                                                                     |
| artifacts/                                                | INCERTO / atualmente vazio            | Não participa do build atual; a instrução antiga o descreve como fonte de anexos. Preservado                                                                                                                       |
| screenshots/ anteriores                                   | ÚTIL                                  | Evidências de QA, fora do build e dos testes do produto. Removíveis para runtime, úteis para histórico                                                                                                             |
| AGENTS.md                                                 | ÚTIL, com instruções legadas          | Não entra no build; testes auxiliares verificam partes do texto. Suposições Linux/Grok conflitam com Windows. Nesta auditoria prevaleceu a instrução explícita do usuário                                          |
| AGENTS.project.md                                         | LEGADO                                | Aponta /workspace/artifacts, incompatível com o ambiente atual; não é dependência de runtime. Preservado                                                                                                           |
| startup.sh                                                | LEGADO no Windows                     | Contrato de revive Grok com /workspace e /tmp. Windows usa o .bat; não entra no build/testes do produto. Não removido                                                                                              |
| vercel.json e Nitro em vite.config.ts                     | ESSENCIAL para destino atual de build | Instalação/deploy Vercel e saída de produção. Mudar destino seria outra alteração de configuração                                                                                                                  |
| server/middleware/grok-pwa.ts e declaração virtual        | ESSENCIAL na configuração atual       | Incluídos pelo Nitro; importam recursos/scripts PWA. Remoção isolada quebra ou altera a produção                                                                                                                   |
| scripts/grok-pwa-plugin.mjs, shared e install-page.html   | ESSENCIAL na configuração atual       | Plugin Vite e middleware de produção; testes auxiliares. Preservar o conjunto                                                                                                                                      |
| public/__grok/                                            | ESSENCIAL para recursos PWA atuais    | Copiados ao build; shell referencia ícone/manifesto. Não remover isoladamente                                                                                                                                      |
| PreviewHostBridge e lib preview-*                         | ÚTIL / integração ativa               | Montado no shell e incluído no bundle; noop sem contexto de preview. Não removido                                                                                                                                  |
| scripts/browser-smoke*, browser-guard e preview-thumbnail | ÚTIL / QA legado                      | Não participam do npm test; arquivos de verdict têm testes Node. Caminhos /workspace impedem uso direto no Windows                                                                                                 |
| scripts/preview.mjs                                       | ÚTIL, portabilidade parcial           | Usa /proc para identificar processos; spawn adapta shell Windows, mas controle de processo não é portável. Evitar preview:restart/stop para encerrar processos locais não identificados; npm run preview funcionou |
| scripts/brand-check* e write-atomic*                      | ÚTIL / ferramentas legadas            | Usados no fluxo de marca e testes auxiliares; não são regras de estoque                                                                                                                                            |
| src/routeTree.gen.ts                                      | ESSENCIAL (gerado)                    | Importado pelo router e regenerado pelo framework. Não editar manualmente                                                                                                                                          |
| node_modules/                                             | ESSENCIAL para execução, regenerável  | Fora do Git/build de fonte; instalar novamente quando necessário                                                                                                                                                   |

Candidatos mais seguros para futura limpeza são saídas/cache com aplicação parada, marcadores antigos e screenshots dispensáveis. A integração Grok não pode ser tratada como pasta morta: há imports e referências reais no build. Não houve limpeza nesta execução.

## Git

O projeto fica diretamente na raiz do repositório. Não existe uma camada adicional de aplicação ou um segundo diretório `.git`.

- Branch: main, acompanhando origin/main; nenhum ahead/behind informado no status local.
- Último commit: 35d9a814f09a2e4304e35c9f8ef10f0fb5861c65 — feat: add read-only warehouse visual map.
- Remote origin: https://github.com/patrickbotarick/Orion-Storage.git (fetch e push).
- Working tree inicial: limpa. Working tree final: somente documentação e novas evidências da auditoria, sem alterações no código/configuração original.
- Sem fetch: a posição do remote representa o tracking local, não consulta atual ao GitHub. Sem commit e sem push.

A restrição inicial do sandbox impedia o Git de acessar a pasta pai; comandos de leitura com acesso normal confirmaram status/log/remote. Não se tratava de repositório corrompido.

## Riscos, limitações e próximos passos

1. localStorage não oferece backup/sincronização, transação real ou concorrência segura. Não trocar origem ao continuar sem preservar os dados existentes. Uma rotina de exportação/backup exige escopo funcional separado.
2. JSON inválido/envelope incompatível retorna listas vazias; um salvamento posterior pode sobrescrever dados que estavam ilegíveis. Leitura não valida profundamente cada registro. Quota e falha no rollback também podem afetar consistência.
3. BoxLocationService antigo contorna Movement: futuras telas devem continuar usando MovementService para operações físicas.
4. Peer Vitest/Vite fora da faixa declarada e Nitro beta são dívida de configuração. Não atualizar dependências sem tarefa dedicada e regressão das sete rotas.
5. Instruções herdadas descrevem Linux/Grok e deploy específico. Recomenda-se uma próxima manutenção exclusivamente documental para adaptar AGENTS ao Windows/Codex, respeitando o shell e os recursos PWA atuais.
6. Dependências externas de apresentação incluem Google Fonts e script de branding Grok. O estoque não consulta ERP ou backend de dados, mas não é uma aplicação sem qualquer recurso externo.
7. A interface móvel tem menu vertical alto; tabelas e prateleiras usam rolagem horizontal interna. Isso é comportamento existente e foi preservado.
8. Inventário, divergências físicas, expedição, usuários e banco remoto não foram iniciados. Não iniciar Fase 4B sem novo pedido e definição do escopo.

Entrada recomendada para futuras sessões: ler este documento, README e documentação da fase afetada; verificar Git, preservar as seis chaves e ledgers; editar em lugar; executar lint/typecheck/test/build e renderização nas sete rotas. O projeto pode continuar no Codex a partir desta base validada, com os limites de QA e persistência acima explícitos.

## Apêndice — inventário de arquivos

```text
.gitignore
.grok\app-env.json
.grok\references\browser-qa.md
.grok\references\data-and-auth.md
.grok\references\deploy-target.md
.grok\references\generated-art.md
.grok\references\hibernate-revive.md
.grok\references\scaffold.md
.grok\skills\auth\references\grok-identity.md
.grok\skills\auth\references\per-user-data.md
.grok\skills\auth\references\prewired-and-env.md
.grok\skills\auth\references\session-ui.md
.grok\skills\auth\references\sign-in-methods.md
.grok\skills\auth\references\wiring.md
.grok\skills\auth\SKILL.md
.grok\skills\building-games\references\3d-libs.md
.grok\skills\building-games\references\ai-pathfinding.md
.grok\skills\building-games\references\audio.md
.grok\skills\building-games\references\babylon.md
.grok\skills\building-games\references\collision-physics.md
.grok\skills\building-games\references\ecs-architecture.md
.grok\skills\building-games\references\game-feel-juice.md
.grok\skills\building-games\references\genres\board-card-chess.md
.grok\skills\building-games\references\genres\endless-runner.md
.grok\skills\building-games\references\genres\fps.md
.grok\skills\building-games\references\genres\platformer-2d.md
.grok\skills\building-games\references\genres\puzzle-match3-tetris.md
.grok\skills\building-games\references\genres\racing-kart.md
.grok\skills\building-games\references\genres\topdown-twin-stick.md
.grok\skills\building-games\references\genres\tower-defense.md
.grok\skills\building-games\references\genres\voxel-minecraft.md
.grok\skills\building-games\references\input.md
.grok\skills\building-games\references\phaser.md
.grok\skills\building-games\references\procedural-generation.md
.grok\skills\building-games\references\save-persistence.md
.grok\skills\building-games\references\threejs-foundational.md
.grok\skills\building-games\SKILL.md
.grok\skills\controls\SKILL.md
.grok\skills\design-ui\references\animations.md
.grok\skills\design-ui\references\performance.md
.grok\skills\design-ui\references\refined-ui.md
.grok\skills\design-ui\references\surfaces.md
.grok\skills\design-ui\references\typography.md
.grok\skills\design-ui\SKILL.md
.grok\skills\game-animation-frames\SKILL.md
.grok\skills\game-asset-core\SKILL.md
.grok\skills\game-character-consistency\SKILL.md
.grok\skills\game-tilesets\SKILL.md
.grok\skills\game-ui-icons\SKILL.md
.grok\skills\generate2dmap\LICENSE
.grok\skills\generate2dmap\references\deliverables.md
.grok\skills\generate2dmap\references\layered-map-contract.md
.grok\skills\generate2dmap\references\map-strategies.md
.grok\skills\generate2dmap\references\object-production-gate.md
.grok\skills\generate2dmap\references\pipeline.md
.grok\skills\generate2dmap\references\prop-pack-contract.md
.grok\skills\generate2dmap\references\side-scroll-stages.md
.grok\skills\generate2dmap\scripts\compose_layered_preview.py
.grok\skills\generate2dmap\scripts\extract_prop_pack.py
.grok\skills\generate2dmap\SKILL.md
.grok\skills\generate2dmap\SOURCE.md
.grok\skills\generate2dsprite\LICENSE
.grok\skills\generate2dsprite\references\modes.md
.grok\skills\generate2dsprite\references\prompt-rules.md
.grok\skills\generate2dsprite\scripts\generate2dsprite.py
.grok\skills\generate2dsprite\scripts\make_layout_guide.py
.grok\skills\generate2dsprite\SKILL.md
.grok\skills\generate2dsprite\SOURCE.md
.grok\skills\imagine-grok-build\SKILL.md
.grok\skills\multiplayer-p2p\references\react-binding.md
.grok\skills\multiplayer-p2p\references\signaling-relay.md
.grok\skills\multiplayer-p2p\SKILL.md
.grok\skills\neon\SKILL.md
.grok\skills\og\references\brand-pass.md
.grok\skills\og\references\custom-card.md
.grok\skills\og\references\favicon-and-icons.md
.grok\skills\og\references\og-type-contract.md
.grok\skills\og\references\placeholder-card.md
.grok\skills\og\references\x-banner.md
.grok\skills\og\SKILL.md
.grok\skills\threejs\references\llms-full.txt
.grok\skills\threejs\SKILL.md
.grok\skills\video2dsprite\LICENSE
.grok\skills\video2dsprite\references\pipeline.md
.grok\skills\video2dsprite\references\prompt-rules.md
.grok\skills\video2dsprite\scripts\video2dsprite.py
.grok\skills\video2dsprite\SKILL.md
.grok\skills\video2dsprite\SOURCE.md
.grok\skills\xai-api\SKILL.md
.grok\status
.node_modules.lock
.prettierrc
AGENTS.md
AGENTS.project.md
docs\FASE_01_PRODUTOS.md
docs\FASE_02A_CAIXAS.md
docs\FASE_02B_ENDERECAMENTO.md
docs\FASE_03A_QR_ETIQUETAS.md
docs\FASE_03B_SCANNER_MOVIMENTACOES.md
docs\FASE_03C_RECEBIMENTO_LOTE.md
docs\FASE_04A_MAPA_VISUAL.md
eslint.config.mjs
INICIAR_ORION.bat
package-lock.json
package.json
packages\domain\src\box-code.test.ts
packages\domain\src\box-code.ts
packages\domain\src\box-content.test.ts
packages\domain\src\box-content.ts
packages\domain\src\box-filter.test.ts
packages\domain\src\box-filter.ts
packages\domain\src\box-history.test.ts
packages\domain\src\box-history.ts
packages\domain\src\box-repository.ts
packages\domain\src\box-schema.test.ts
packages\domain\src\box-schema.ts
packages\domain\src\box-seeds.test.ts
packages\domain\src\box-seeds.ts
packages\domain\src\box-store.ts
packages\domain\src\box.ts
packages\domain\src\duplicate.test.ts
packages\domain\src\duplicate.ts
packages\domain\src\errors.ts
packages\domain\src\filter.test.ts
packages\domain\src\filter.ts
packages\domain\src\identification.test.ts
packages\domain\src\identification.ts
packages\domain\src\index.ts
packages\domain\src\internal-code-uniqueness.test.ts
packages\domain\src\internal-code-uniqueness.ts
packages\domain\src\internal-code.test.ts
packages\domain\src\internal-code.ts
packages\domain\src\label.test.ts
packages\domain\src\label.ts
packages\domain\src\length.test.ts
packages\domain\src\length.ts
packages\domain\src\location-filter.ts
packages\domain\src\location-schema.ts
packages\domain\src\location-seeds.ts
packages\domain\src\location.test.ts
packages\domain\src\location.ts
packages\domain\src\movement-filter.ts
packages\domain\src\movement-repository.ts
packages\domain\src\movement.ts
packages\domain\src\normalize.test.ts
packages\domain\src\normalize.ts
packages\domain\src\product.ts
packages\domain\src\receipt-code.ts
packages\domain\src\receipt-filter.ts
packages\domain\src\receipt-plan.ts
packages\domain\src\receipt-repository.ts
packages\domain\src\receipt.test.ts
packages\domain\src\receipt.ts
packages\domain\src\repository.ts
packages\domain\src\scan-session.test.ts
packages\domain\src\scan-session.ts
packages\domain\src\schema.test.ts
packages\domain\src\schema.ts
packages\domain\src\seeds.test.ts
packages\domain\src\seeds.ts
packages\domain\src\storage-area.ts
packages\domain\src\warehouse-map.test.ts
packages\domain\src\warehouse-map.ts
packages\shared\src\format.ts
packages\shared\src\index.ts
packages\shared\src\labels.ts
public\__grok\icon-180.png
public\__grok\install\assets\homescreen\glass-puzzle.svg
public\__grok\install\assets\homescreen\glass-share.svg
public\__grok\install\assets\homescreen\logo-grok.svg
public\__grok\install\assets\homescreen\ob-ipad.png
public\__grok\install\assets\homescreen\ob-phone.png
public\__grok\install\assets\homescreen\plus.svg
public\__grok\install\styles.css
public\favicon.svg
README.md
scripts\brand-check.mjs
scripts\brand-check.test.mjs
scripts\browser-guard.mjs
scripts\browser-smoke-verdict.mjs
scripts\browser-smoke-verdict.test.mjs
scripts\browser-smoke.mjs
scripts\grok-pwa-plugin.mjs
scripts\grok-pwa-plugin.test.mjs
scripts\grok-pwa-shared.d.mts
scripts\grok-pwa-shared.mjs
scripts\install-page.html
scripts\preview-thumbnail.mjs
scripts\preview.mjs
scripts\preview.test.mjs
scripts\write-atomic.mjs
scripts\write-atomic.test.mjs
server\middleware\grok-pwa.ts
server\virtual-grok-og-identity.d.ts
src\application\boxes\box-service.test.ts
src\application\boxes\box-service.ts
src\application\locations\box-location-service.test.ts
src\application\locations\box-location-service.ts
src\application\locations\location-service.ts
src\application\movements\movement-service.test.ts
src\application\movements\movement-service.ts
src\application\products\product-service.ts
src\application\receipts\receipt-service.test.ts
src\application\receipts\receipt-service.ts
src\components\app-shell.tsx
src\components\preview-host-bridge.tsx
src\components\ui\button.tsx
src\components\ui\field.tsx
src\features\boxes\box-detail.tsx
src\features\boxes\box-filters.tsx
src\features\boxes\box-form.tsx
src\features\boxes\box-status-badge.tsx
src\features\boxes\box-table.tsx
src\features\boxes\boxes-page.tsx
src\features\boxes\use-box-catalog.ts
src\features\identification\box-label.tsx
src\features\identification\location-label.tsx
src\features\identification\print-label-dialog.tsx
src\features\identification\qr-code.tsx
src\features\locations\locations-page.tsx
src\features\movements\movements-page.tsx
src\features\products\product-filters.tsx
src\features\products\product-form.tsx
src\features\products\product-table.tsx
src\features\products\products-page.tsx
src\features\products\use-product-catalog.ts
src\features\receipts\receipt-form.tsx
src\features\receipts\receipt-label-sheet.tsx
src\features\receipts\receipts-page.tsx
src\features\scanner\scanner-page.tsx
src\features\scanner\use-qr-camera.ts
src\features\warehouse\aisle-section.tsx
src\features\warehouse\area-summary.tsx
src\features\warehouse\location-cell.tsx
src\features\warehouse\location-detail.tsx
src\features\warehouse\rack-grid.tsx
src\features\warehouse\warehouse-map.tsx
src\features\warehouse\warehouse-page.tsx
src\features\warehouse\warehouse-search.tsx
src\lib\error-component.tsx
src\lib\preview-embedder-origin.ts
src\lib\preview-host-bridge.ts
src\persistence\key-value-store.ts
src\persistence\local-storage-box-repository.test.ts
src\persistence\local-storage-box-repository.ts
src\persistence\local-storage-location-repository.ts
src\persistence\local-storage-movement-repository.ts
src\persistence\local-storage-product-repository.test.ts
src\persistence\local-storage-product-repository.ts
src\persistence\local-storage-receipt-repository.ts
src\persistence\local-storage-storage-area-repository.ts
src\router.tsx
src\routes\__root.tsx
src\routes\caixas.tsx
src\routes\enderecamento.tsx
src\routes\index.tsx
src\routes\mapa.tsx
src\routes\movimentacoes.tsx
src\routes\recebimentos.tsx
src\routes\scanner.tsx
src\routeTree.gen.ts
src\styles.css
startup.sh
tsconfig.json
vercel.json
vite.config.ts
vitest.config.ts
```

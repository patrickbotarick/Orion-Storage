# Fase 4B — Inventário físico e divergências

O inventário registra observações físicas e compara com um snapshot do início. Não corrige estoque, não altera Box.currentLocationId, não cria Movement e não muda BoxHistory. A localização oficial continua sendo a da caixa. Correções, ajustes, expedição, usuários, autenticação, ERP e banco remoto permanecem fora desta fase.

## Fluxo

Selecionar escopo → iniciar → ver esperadas → identificar posição de contagem → ler caixas → classificar → revisar → finalizar. Também é possível cancelar, preservando o que já foi observado.

Rota `/inventarios`, acessível na navegação como Inventários. A tela abre pelo histórico, permite retomar uma sessão em andamento e consultar sessões encerradas. Não há edição ou exclusão de sessões encerradas.

## Escopo

| Tipo     | Seleção                               |
| -------- | ------------------------------------- |
| AREA     | Área inteira                          |
| AISLE    | Área e corredor                       |
| RACK     | Área, corredor e prateleira           |
| LEVEL    | Área, corredor, prateleira e nível    |
| LOCATION | Posição específica pertencente à área |

O escopo deve conter ao menos uma posição cadastrada. É permitido conferir posições bloqueadas/inativas e áreas inativas: a observação não atribui caixas. Não existe inventário global obrigatório.

Em escopos maiores, cada leitura precisa de uma posição de contagem selecionada ou identificada por QR dentro do escopo. Não se deduz a localização encontrada a partir da localização esperada, pois isso esconderia divergências. No escopo LOCATION, a posição já fica selecionada.

## InventorySession

Contrato em `packages/domain/src/inventory.ts`: id, code, status, scope, areaId, aisle/rack/level/locationId opcionais, scopeLabel, startedAt, completedAt/cancelledAt opcionais, notes, createdAt, updatedAt e revision.

Estados: IN_PROGRESS, COMPLETED, CANCELLED. Só IN_PROGRESS aceita leituras ou encerramento. COMPLETED e CANCELLED são terminais, sem novas leituras, reabertura, edição, finalização repetida ou exclusão.

Códigos: `INV-AAAAMMDD-NNNNNN`, dia operacional de São Paulo. O adapter reutiliza o algoritmo de alocação da caixa com prefixo e ledger próprios; nenhum número de caixa ou recebimento é consumido. O código e o snapshot inicial são gravados na mesma escrita.

## Snapshot

`locations` preserva as posições do escopo e seus códigos/estrutura naquele instante. `catalogSnapshot` preserva a identidade, código, produto e localização registrada de todas as caixas conhecidas no início, inclusive as externas ao escopo. `items` começa com as caixas localizadas dentro do escopo, esperadas e ainda não encontradas.

Movimentações posteriores não recalculam o esperado. Uma caixa movida depois do início ainda é comparada com sua localização no snapshot, incluindo caixas originalmente externas. O inventário não tenta corrigir nem impedir a movimentação operacional.

Caixa criada depois do início pode ser lida, se existir no catálogo atual: nunca será esperada naquela sessão. Sua localização registrada é capturada na primeira observação. Isso não modifica o snapshot inicial.

## InventoryItem e classificação

Campos: boxId, code, productId, expectedLocationId/expectedLocationCode opcionais, foundLocationId/foundAt opcionais, expected, found e classification.

| Classe         | Regra                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| MATCH          | Caixa esperada no escopo e encontrada na posição registrada no snapshot                                                                          |
| MISSING        | Caixa esperada que ainda não foi lida; resultado provisório durante a contagem                                                                   |
| UNEXPECTED     | Caixa existente, não esperada no escopo e sem localização registrada no snapshot/primeira observação                                             |
| WRONG_LOCATION | Caixa com localização registrada, encontrada numa posição diferente; vale também para uma caixa esperada em outra posição dentro do mesmo escopo |

WRONG_LOCATION tem precedência sobre UNEXPECTED quando há posição registrada diferente. Não existe item fictício para uma caixa desconhecida. Um QR Orion válido cuja caixa não existe é recusado pela identificação compartilhada.

As classificações são exclusivas: uma caixa esperada encontrada na posição errada aparece uma única vez em WRONG_LOCATION, sem ser contada também como MISSING. A mesma caixa não pode ser contabilizada duas vezes na sessão, mesmo em posições diferentes. A repetição mostra “Esta caixa já foi contabilizada.” e preserva os totais e a primeira observação. Uma correção da própria observação exige novo inventário; não há ajuste silencioso.

## Scanner compartilhado

A tela reutiliza `useQrCamera` da Fase 3B, `html5-qrcode`, `resolveManualEntry` e o protocolo `orion://v1`. Não há segundo parser ou implementação de câmera.

Antes de iniciar, ler LOCATION preenche o escopo daquela posição e exige o botão Iniciar inventário. Durante a contagem, ler LOCATION escolhe a posição de contagem dentro do escopo; ler BOX registra a observação. A entrada manual aceita código operacional ou payload completo. A permissão de câmera só é pedida após Usar câmera. Navegação, revisão e encerramento param a câmera.

## Revisão, resumo e histórico

Resumo: esperadas, encontradas, corretas, faltando, inesperadas e localização incorreta. Divergências é a soma MISSING + UNEXPECTED + WRONG_LOCATION, sem dupla contagem. Exemplo: uma esperada não lida, uma inesperada e uma em posição errada resultam em três divergências.

Revisar inventário interrompe a contagem e exibe o resumo/grupos antes do botão Finalizar inventário. Voltar à contagem retoma a sessão. Finalizar persiste COMPLETED e completedAt; o resultado continua disponível após refresh. Cancelar exige revisão própria, mantém observações e persiste cancelledAt.

Histórico mostra código, escopo, início, conclusão, totais esperado/encontrado, divergências e status. Busca por código de sessão, escopo, observação ou código de caixa; filtro por status. Detalhe agrupa Corretas, Faltando, Inesperadas e Localização incorreta, com posição esperada/encontrada e instante da leitura.

## Persistência e serviço

`InventoryRepository` expõe list, getById, create e save com revisão esperada. `LocalStorageInventoryRepository` usa `orion-storage.inventories.v1`: envelope version 1 com sessions e codeLedger. Ausência começa vazia, sem seeds. JSON inválido é recusado, sem sobrescrever silenciosamente o registro.

`InventoryService` expõe list/busca, getById, start, record, complete e cancel. Usa BoxRepository, LocationRepository e StorageAreaRepository somente para consulta. Não possui dependência de MovementRepository ou método de escrita nas caixas. A única escrita é no InventoryRepository.

save verifica a revisão, impede substituir snapshots/escopo e rejeita sessões já encerradas. A interface bloqueia submissões simultâneas. Essa verificação protege operações concorrentes na mesma aba; localStorage continua sem transação/bloqueio entre abas ou aparelhos. Não tratar essa proteção como garantia multiusuário.

## Indicador no mapa

O mapa deriva as posições com divergência da sessão COMPLETED mais recentemente concluída que cobre cada posição. Sessões abertas/canceladas não contam. Uma conclusão posterior sem divergência remove o indicador antigo naquela posição. “Recente” aqui significa a última conclusão, sem expiração automática por número de dias.

O indicador tem ícone, texto Inventário e descrição “Divergência encontrada” no title/aria-label. Não muda a classificação de ocupação, contagem, capacidade, busca ou comportamento somente leitura do mapa. Falha ao carregar inventários não impede renderizar a ocupação oficial.

## Validação

26 testes novos em três arquivos, somados aos 103 anteriores: 129 testes em 29 arquivos. Cobrem início, snapshots, todas as classificações, resumo, duplicidade, caixa inexistente, cinco escopos, conclusão/cancelamento e terminalidade, movimentação posterior, busca/listagem, persistência/ledger/revisão/corrupção e indicador da conclusão mais recente.

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passaram. O aviso de diretivas “use client” em dependências permanece o mesmo do build anterior.

QA reproduzível: `node scripts/inventory-browser-qa.mjs 8091` para dev ou `8081` para preview de produção. Usa contextos descartáveis, com Edge instalado no Windows e Chromium do Playwright em outros sistemas. Não acessa o perfil operacional. Testa desktop 1280×800 e mobile 390×844, QR de posição, MATCH, MISSING, UNEXPECTED, WRONG_LOCATION, duplicidade, caixa inexistente, finalização, bloqueio/reabertura do detalhe, histórico, escopos maiores, cancelamento e indicador no mapa. Também compara bytes do storage de caixas/movimentos antes e depois. Evidências em `screenshots/fase4b/`.

Câmera física e impressão não foram executadas; a câmera reutiliza a infraestrutura existente. Esta fase não introduz impressão de inventário. Os dados continuam por origem/perfil de navegador; trocar porta/hostname não migra o estoque ou as sessões.

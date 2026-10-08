# Fase 4A — Mapa visual do estoque

O mapa mostra a ocupação física. Ele não move caixa, não edita endereço e não inventaria.

A fonte da ocupação é `Box.currentLocationId`. Movement não reconstrói o estado. Não há divergência física nesta fase.

## Estrutura

```text
StorageArea
  Aisle
    Rack
      Level × Position = Location
```

A tela `/mapa` carrega áreas, endereços, caixas e produtos uma vez e deriva a matriz. A célula não consulta repositório.

| Peça                                | Função                                         |
| ----------------------------------- | ---------------------------------------------- |
| `groupLocationsByArea`              | Separa os endereços da área escolhida.         |
| `buildWarehouseMap`                 | Agrupa corredor e prateleira e monta a matriz. |
| `boxesByLocation`                   | Conta caixas pela localização atual.           |
| `classifyOccupancy` / `occupancyOf` | Estado visual da célula.                       |
| `calculateAreaOccupancy`            | Resumo e percentual.                           |
| `filterWarehouseLocations`          | Filtros combinados.                            |
| `searchWarehouse`                   | Busca e conjunto de destaque.                  |

A interface fica em `src/features/warehouse`. O domínio continua sem React e sem `localStorage`.

## Ordenação

`compareNatural` usa `localeCompare` em `pt-BR` com `numeric: true`. `2` fica antes de `10`. Números ficam antes de letras: o corredor `10` aparece antes do corredor `A`. `2` e `02` comparam iguais; a semente usa dois dígitos para a leitura ficar estável.

Níveis são exibidos do maior para o menor, como uma prateleira vista de frente: o nível 04 fica em cima e o 01 embaixo. Posições crescem da esquerda para a direita.

Se um nível não tem todas as posições, a interseção fica vazia. Não é um endereço inventado e não é clicável.

## Ocupação

| Estado         | Regra                                                                      | Além da cor                                                |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Livre          | 0 caixas e posição ativa. Sem capacidade também é livre quando está vazia. | Texto "Livre" e ícone.                                     |
| Parcial        | 1 até capacidade − 1.                                                      | Texto "Parcial" e borda inferior.                          |
| Lotada         | ocupação igual ou maior que a capacidade.                                  | Texto "Lotada" e borda interna.                            |
| Sem capacidade | há caixas e `capacityBoxes` não existe. Não é lotada.                      | Texto e borda pontilhada. A célula mostra só a quantidade. |
| Bloqueada      | `BLOCKED`, mesmo com caixas.                                               | Texto, ícone e listras.                                    |
| Inativa        | `INACTIVE`.                                                                | Texto, ícone e borda tracejada.                            |

Área `INACTIVE` continua na lista, com o selo `INATIVA`.

## Percentual

Só entra posição que declara `capacityBoxes`.

```text
percentual = caixas nessas posições / soma dessas capacidades
```

Posição sem capacidade não entra no numerador nem no denominador. Exemplo: 57 caixas numa capacidade conhecida de 96, mais caixas numa posição sem capacidade, continuam 57 / 96 = 59,4%.

Bloqueada e inativa com capacidade entram nesse percentual, porque a caixa está fisicamente lá, e também são contadas nos totais de bloqueada e inativa. Livre e ocupada olham só se há caixa: uma posição bloqueada vazia é livre e bloqueada ao mesmo tempo.

Sem nenhuma capacidade conhecida, o percentual não aparece.

## Busca e destaque

A busca quebra o texto em tokens. `mm`, `cm` e `m` são ignorados, então `35 mm` procura `35`. Um token numérico casa com `widthMm` ou `thicknessMm`, ou com o texto. Os demais tokens precisam aparecer no código da caixa, no código interno, no nome, na marca, na cor ou no código do endereço. Todos os tokens precisam casar.

`azul 35 real` encontra o produto que tem esses três dados e lista cada posição com a quantidade. Caixa sem `currentLocationId` aparece como "Fora do mapa" e não destaca célula.

Enquanto a busca não é limpa, as posições encontradas ficam com contorno. Escolher um resultado abre a área, zera os filtros da matriz e rola até a célula. Limpar a busca tira o destaque.

## Filtros

Área, corredor, prateleira, status da posição, livre/ocupada/lotada, produto e marca. O resumo do topo é da área inteira. A matriz respeita os filtros. "Lotada" exige capacidade definida e quantidade maior ou igual a ela.

## Detalhe

O clique abre o endereço: área, corredor, prateleira, nível, posição, código, status, capacidade, ocupação e as caixas (código, produto, marca, cor, largura, status). "Ver caixa" vai para `/caixas?caixa=`. "Ver endereço" vai para `/enderecamento?endereco=`. As duas telas só abrem o detalhe já existente. O mapa não grava nada.

## Responsividade e acessibilidade

No desktop a matriz cabe na prateleira. Se passar da largura, a prateleira rola na horizontal e a célula não encolhe abaixo de 4,75 rem. No celular a navegação continua a do aplicativo e o detalhe abre por toque.

Cada célula é um botão, com `aria-label` no formato "SUP-A-03-02-04, 3 de 4 caixas, parcialmente ocupada.", foco visível e texto de status. Não há cursor de arrastar.

## Semente

Quem ainda não tem `orion-storage.locations.v1` recebe 28 endereços de demonstração na área SUP, corredor A: prateleira 01 com 4 níveis e 4 posições, prateleira 02 com 3 níveis e 4 posições. Os seis ids originais permanecem. `SUP-A-01-04-04` nasce bloqueada, `SUP-A-02-03-04` inativa e `SUP-A-02-03-03` sem capacidade. Não há caixa nova.

Quem já gravou endereços não é sobrescrito. O mapa funciona com essa grade menor e com vãos.

## Limitações

Não há drag-and-drop, edição pelo mapa, scanner no mapa, inventário, divergência, expedição, usuários, autenticação, Supabase, ERP nem planta do prédio. A última movimentação da posição não é exibida.

## Próxima fase

O mapa já mostra o que o sistema acredita estar em cada posição. O passo seguinte natural é o inventário físico: contar o que está na posição e comparar com `currentLocationId`, ainda sem expedição.

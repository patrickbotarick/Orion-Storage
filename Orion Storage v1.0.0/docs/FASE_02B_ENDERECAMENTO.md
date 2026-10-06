# Fase 2B — Endereçamento físico do estoque

Uma caixa pode estar em um endereço físico ou ainda sem posição. O endereço não é um mapa, um QR Code nem uma movimentação completa.

```text
Product → Box → Location → StorageArea
```

`Location` é a posição utilizável. `StorageArea` é a região maior, para não repetir o nome da área em cada posição.

## StorageArea

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `id` | sim | Técnico. |
| `code` | sim | Token estável, por exemplo `SUP`. Não muda depois da criação. |
| `name` | sim | Nome legível, por exemplo Estoque Superior. |
| `status` | sim | `ACTIVE` ou `INACTIVE`. |
| `notes` | não | |
| `createdAt` / `updatedAt` | sim | |

O código da área é normalizado com o mesmo token do restante do sistema: maiúsculas, sem acento e sem espaço. `sup` e `SUP` são o mesmo código.

Desativar uma área não apaga posições nem tira caixas de onde estão. Uma área inativa não recebe endereço novo nem caixa nova.

"Estoque Superior" é só um exemplo de área. Não existe conceito fixo de empresa, expedição operacional ou consumo.

## Location

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `id` | sim | Técnico. |
| `code` | sim | Gerado. Não é digitado. |
| `areaId` | sim | Área existente. |
| `aisle` | sim | Corredor. Texto, não só letra. |
| `rack` | sim | Prateleira. Texto, não só número. |
| `level` | sim | Nível. |
| `position` | sim | Posição final. |
| `status` | sim | `ACTIVE`, `BLOCKED` ou `INACTIVE`. |
| `capacityBoxes` | não | Inteiro maior que zero. Ausente significa sem limite. |
| `notes` | não | |
| `createdAt` / `updatedAt` | sim | |

O código é `AREA-CORREDOR-PRATELEIRA-NIVEL-POSICAO`, cada parte já normalizada.

Exemplo: área `SUP` + corredor `A` + prateleira `03` + nível `02` + posição `04` = `SUP-A-03-02-04`.

` a ` e `A` geram o mesmo endereço. Dois registros com a mesma área e as mesmas quatro partes são recusados, mesmo que o código tenha sido montado de outro jeito.

Zeros à esquerda são preservados se o operador os digitou. `3` e `03` são posições diferentes.

## Status da posição

| Status | Significado |
| --- | --- |
| `ACTIVE` | Pode receber caixa. |
| `BLOCKED` | Existe, mas não recebe caixa nova. |
| `INACTIVE` | Fora de uso. Não recebe caixa nova. |

Caixas que já estavam na posição continuam registradas quando o status muda. Nada é removido automaticamente. Não há exclusão física.

## Capacidade

`capacityBoxes` é opcional.

Se estiver definido, uma nova atribuição é recusada quando a posição já tem essa quantidade, sem contar a própria caixa que está entrando. A mensagem é: "Esta posição atingiu sua capacidade máxima de N caixas."

Reduzir a capacidade abaixo das caixas já presentes também é recusado. Apagar a capacidade tira o limite.

## Box → Location

`Box.currentLocationId` é opcional. Caixa antiga, sem esse campo, continua válida e aparece como "Sem localização".

Uma caixa fica em no máximo uma posição. A posição pode ter várias caixas, até a capacidade.

Operações desta fase:

- sem localização → localização (`LOCATION_ASSIGNED`);
- troca de posição (`LOCATION_CHANGED`);
- volta para sem localização (`LOCATION_CLEARED`).

O histórico guarda código anterior, código novo e os ids, quando existirem. Não há entidade `Movement`.

Posição inexistente, `BLOCKED`, `INACTIVE` ou de área inativa não recebe caixa nova.

## Edição do endereço

Capacidade, observação e status podem mudar sempre.

Área, corredor, prateleira, nível e posição só mudam se a posição estiver vazia. Com caixa vinculada, esses componentes ficam travados para o código operacional não mudar embaixo de um volume já endereçado. O código da área também não muda depois de criado.

## Persistência

```text
UI → LocationService / BoxLocationService → repositórios → localStorage
```

Chaves:

- `orion-storage.storage-areas.v1`
- `orion-storage.locations.v1`
- `orion-storage.boxes.v1` (a caixa ganhou `currentLocationId` opcional no mesmo envelope)

A interface não acessa `localStorage`. Quem já tinha caixas da Fase 2A não precisa limpar o navegador: a localização ausente é um estado válido. As áreas e posições de demonstração aparecem na primeira leitura de cada chave nova.

## Demonstração

Área `SUP` / Estoque Superior.

Posições, todas com capacidade 4:

- `SUP-A-01-01-01`
- `SUP-A-01-01-02`
- `SUP-A-01-02-01`
- `SUP-A-01-02-02`
- `SUP-A-02-01-01`
- `SUP-A-02-01-02`

Três caixas de demonstração nascem endereçadas. `CX-20261006-000004` fica sem localização.

## Limitações

Não há scanner, mapa gráfico, arrastar e soltar, expedição, inventário, recebimento em lote, usuários ou banco remoto. O QR e a etiqueta básica estão na Fase 3A. A troca de posição registrada aqui não substitui a entidade de movimentação de uma fase futura.

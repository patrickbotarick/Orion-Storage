# Fase 2A — Caixas físicas e rastreabilidade básica

Uma caixa é uma unidade física com identidade própria. Vários registros podem apontar para o mesmo produto e ainda assim serem caixas diferentes.

Exemplo: o produto Real / Azul / 35 mm pode ter `CX-20261006-000001`, `CX-20261006-000002` e `CX-20261006-000003`. O código da caixa não contém a marca, a cor nem a largura.

O produto continua sendo o cadastro. A caixa é o volume que entrou no controle.

## O que esta fase não faz

Não há prateleira, corredor, posição, mapa, QR Code, scanner, câmera, expedição, transferência, inventário, recebimento em lote, impressão de etiqueta, Supabase, backend remoto nem autenticação.

## Modelo Box

| Campo                     | Obrigatório | Observação                                                  |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| `id`                      | sim         | Identificador técnico. Não aparece como código operacional. |
| `code`                    | sim         | Código legível, gerado, único e imutável.                   |
| `productId`               | sim         | Produto existente. Não muda depois da criação.              |
| `status`                  | sim         | Condição da caixa, não o lugar onde ela está.               |
| `rollsQuantity`           | sim         | Inteiro maior que zero. Conteúdo registrado desta caixa.    |
| `totalLengthM`            | sim         | Metros, número maior que zero.                              |
| `manufacturerBatch`       | não         | Texto livre até 120 caracteres.                             |
| `receivedAt`              | sim         | Data de calendário `AAAA-MM-DD`.                            |
| `notes`                   | não         |                                                             |
| `createdAt` / `updatedAt` | sim         | Instantes ISO.                                              |
| `history`                 | sim         | Eventos append-only. Não são apagados.                      |

`receivedAt` é data, sem horário, porque representa o dia em que a caixa entrou no controle. O histórico usa timestamp.

## Status

O status descreve a condição da caixa. Nenhum destes estados significa corredor, prateleira ou expedição.

| Status      | Significado                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `RECEIVED`  | Entrou no controle e ainda não foi liberada. Toda caixa nova nasce assim.    |
| `AVAILABLE` | Liberada para uso operacional. Não informa onde ela está.                    |
| `OPENED`    | A caixa foi aberta. O consumo parcial de rolos não é modelado nesta fase.    |
| `EMPTY`     | Condição de esvaziada. A quantidade registrada não é zerada automaticamente. |
| `BLOCKED`   | Retida por avaria, divergência ou qualidade.                                 |

Estados de armazenagem, expedição ou baixa física ficam para fases seguintes.

## Código operacional

Função de domínio: `allocateBoxCode`.

Formato: `CX-AAAAMMDD-NNNNNN`.

Exemplo: `CX-20261006-000001`.

Regras:

- `AAAAMMDD` é o dia operacional em `America/Sao_Paulo`, não o dia UTC e não a data de recebimento. Uma caixa recebida ontem e registrada hoje leva a data de hoje no código e a data informada em `receivedAt`.
- `NNNNNN` é a sequência daquele dia, com 6 dígitos, começando em `000001`.
- A sequência não inclui o produto.
- O próximo número é o maior entre o ledger persistido e os códigos já gravados naquele dia, mais um.
- O ledger só cresce. Um número já emitido não volta a ser usado, mesmo que a caixa deixe de estar na lista.
- Se o ledger estiver atrás dos códigos gravados, a alocação acompanha os códigos e não colide.
- O limite diário é `999999`.
- A busca aceita o código em qualquer caixa (`cx-20261006-000001`).

O ledger fica no mesmo envelope das caixas (`orion-storage.boxes.v1`), então o próximo número sobrevive a um refresh e não depende de variável em memória.

Na criação, a interface não deixa digitar o código. Na edição, `id` e `code` não mudam.

## Vínculo com Product

Toda caixa exige um `productId` de um produto que existe e está `ACTIVE`.

- Produto inexistente: a criação é rejeitada.
- Produto `INACTIVE`: a criação é rejeitada. A caixa que já existia continua válida e consultável.
- Depois de criada, a caixa não troca de produto. A tentativa retorna erro e não gera histórico.

A sugestão de conteúdo usa `rollsPerBox` e `rollLengthM`:

- `rollsQuantity = rollsPerBox`
- `totalLengthM = rollsQuantity × rollLengthM`

O total informado do produto (`totalLengthPerBoxM`) não é copiado para a caixa. Se a caixa física veio diferente do padrão, o operador edita os dois campos. Valor já informado não é sobrescrito.

Quantidade e metragem precisam ser maiores que zero. Zero não representa "vazia"; para isso existe o status `EMPTY`, sem apagar o último conteúdo registrado.

## Histórico

Cada caixa guarda `BoxHistoryEntry`:

- `id`, `boxId`, `type`, `createdAt`, `description`
- `metadata` opcional, só com texto

Tipos:

| Tipo             | Quando                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| `CREATED`        | A caixa é registrada. Metadata: `productId` e status inicial `RECEIVED`.             |
| `UPDATED`        | Rolos, metragem, lote, recebimento ou observações mudam. Metadata: campos alterados. |
| `STATUS_CHANGED` | O status muda. Metadata: `previousStatus` e `nextStatus`.                            |

Salvar sem mudança não cria evento. O histórico não é apagado nem reescrito. A lista na tela mostra o mais recente primeiro; no armazenamento a ordem é cronológica.

Não há movimentação física neste histórico.

## Código interno do produto

Antes de depender do código do produto nas caixas, criação e edição de produto passam a rejeitar `internalCode` duplicado.

- A comparação usa o token canônico e ignora acentos e caixa.
- A mensagem é `Já existe um produto com o código interno …`.
- `duplicate()` imediato, que copiaria o mesmo código, passa a falhar.
- A tela de duplicação continua abrindo o formulário. O operador precisa alterar o código antes de salvar.
- Produto antigo que já compartilha código com outro continua editável se o código permanecer o mesmo. Trocar para um código já usado é rejeitado.

## Persistência e arquitetura

```text
UI → BoxService → BoxRepository → LocalStorageBoxRepository
```

A interface não acessa `localStorage` nem o repositório.

`BoxRepository`:

- `list`
- `getById`
- `getByCode`
- `create`
- `update`
- `setStatus`
- `listByProductId`

`BoxService` valida o produto, recusa inativo, recusa troca de produto, sugere conteúdo e delega a gravação. O repositório gera o código, garante a unicidade e anexa o histórico na mesma escrita.

Chave: `orion-storage.boxes.v1`. A primeira leitura sem dados grava as caixas de demonstração. Uma lista salva, mesmo vazia, não é recriada.

Não há exclusão de caixa.

## Interface

A navegação tem **Produtos** e **Caixas**.

A lista mostra código, produto, marca, cor, largura, rolos, metragem, lote, recebimento e status.

A busca cobre código da caixa, código do produto, nome, marca, cor e lote.

Os filtros são produto, marca, status e data de recebimento.

O cadastro pede o produto ativo, mostra o resumo, sugere rolos e metragem, e aceita lote, data e observações. O código aparece no detalhe, depois de salvar.

O detalhe mostra o conteúdo, o status e o histórico. A edição não mexe em código nem em produto.

## Dados de demonstração

Ligado aos produtos da Fase 1, no dia operacional 2026-10-06:

| Código               | Produto                        | Conteúdo        | Lote         | Status     |
| -------------------- | ------------------------------ | --------------- | ------------ | ---------- |
| `CX-20261006-000001` | Proadec Classic Branco 1101 TX | 10 rolos, 200 m | `1101TX-26`  | Disponível |
| `CX-20261006-000002` | Proadec Classic Branco 1101 TX | 10 rolos, 200 m | —            | Recebida   |
| `CX-20261006-000003` | Real/Rehau Pinole              | 15 rolos, 300 m | `PIN-ESS-04` | Disponível |
| `CX-20261006-000004` | Real/Rehau Pinole              | 15 rolos, 300 m | `PIN-ESS-05` | Recebida   |

As caixas disponíveis têm um evento `STATUS_CHANGED` depois da criação. Não há endereço.

## Limitações

- Os dados ficam no navegador.
- Sem usuário no histórico.
- Sem concorrência entre abas. Duas abas podem gravar por cima uma da outra.
- JSON inválido na chave de caixas vira lista vazia até o próximo salvamento, no mesmo comportamento dos produtos.
- `EMPTY` e `OPENED` não recalculam rolos restantes.
- O código do dia pode chegar a `999999` e, a partir daí, a criação daquele dia falha.
- Duplicatas antigas de `internalCode` não são corrigidas sozinhas.

## Testes

- `packages/domain/src/box-code.test.ts`
- `packages/domain/src/box-content.test.ts`
- `packages/domain/src/box-history.test.ts`
- `packages/domain/src/box-schema.test.ts`
- `packages/domain/src/box-filter.test.ts`
- `packages/domain/src/box-seeds.test.ts`
- `packages/domain/src/internal-code-uniqueness.test.ts`
- `src/persistence/local-storage-box-repository.test.ts`
- `src/persistence/local-storage-product-repository.test.ts`
- `src/application/boxes/box-service.test.ts`

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Fase 2B

Não foi iniciada. O próximo passo recomendado é o endereço atual da caixa: cadastro simples de posição e um vínculo opcional, ainda sem mapa, QR Code, scanner ou transferência.

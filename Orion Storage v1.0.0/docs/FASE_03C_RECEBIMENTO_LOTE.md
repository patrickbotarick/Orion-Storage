# Fase 3C — Recebimento em lote e impressão múltipla

O recebimento registra a entrada de várias caixas de uma vez. A caixa continua sendo a unidade física. O recebimento é o evento que a criou.

Não há nota fiscal, XML, preço, financeiro, pedido de compra nem fornecedor fiscal. O campo fornecedor é só um nome livre da entrega.

## Receipt

Persistido apenas depois da confirmação. Não existe rascunho gravado e não há cancelamento nesta fase. Um recebimento confirmado não é editado: ele é fato histórico.

| Campo | Função |
| --- | --- |
| `code` | `REC-AAAAMMDD-NNNNNN`, dia operacional de São Paulo, sequência que não volta. |
| `status` | Somente `CONFIRMED`. |
| `receivedAt` | Data informada pelo operador, copiada para cada caixa. |
| `supplierName` | Opcional. Não é cadastro. |
| `notes` | Opcional, do recebimento inteiro. |
| `requestId` | Identificador da tentativa de confirmação. |
| `items` | Uma ou mais linhas de produto. |

A chave é `orion-storage.receipts.v1`. Se não existir, a lista começa vazia. As quatro caixas de demonstração continuam sem `receiptId`.

O código do recebimento segue a mesma ideia do código da caixa, com ledger próprio. Não reutiliza o gerador `CX-`.

## ReceiptItem

O modelo aceita vários produtos no mesmo recebimento, e a tela também. Cada linha tem produto, quantidade de caixas, rolos por caixa, metragem por caixa, lote e observação.

`rollsQuantity` e `totalLengthM` são de cada caixa, não a soma da linha. Ao escolher o produto, a tela sugere `rollsPerBox` e a metragem calculada. O operador pode alterar só na linha. O produto não muda.

O lote fica na linha, não repetido no recebimento, porque duas linhas podem ter lotes diferentes.

## Caixas

Depois de confirmar, cada caixa nasce com:

- produto da linha;
- rolos, metragem, lote e observação da linha;
- `receivedAt` do recebimento;
- `receiptId`;
- status `RECEIVED`;
- sem localização.

O histórico `CREATED` guarda `receiptId` e `receiptCode` na metadata. Não é criada Movement. Endereçar continua no scanner, como `STORED`.

Uma caixa antiga sem `receiptId` continua válida. Editar o conteúdo da caixa não apaga o vínculo.

## Prévia e códigos

`planReceipt` calcula o próximo código de recebimento e os próximos códigos de caixa com `allocateBoxCode`. Nada é gravado.

Cancelar, fechar ou só abrir a prévia não avança o ledger. A confirmação calcula de novo. Se outra caixa tiver sido criada nesse meio, os códigos da prévia podem avançar e a tela de sucesso mostra os códigos realmente gravados.

O limite de uma confirmação é 500 caixas, somando todas as linhas.

## Consistência

A confirmação grava todas as caixas numa escrita e, em seguida, o recebimento. Se o recebimento não for gravado, as caixas voltam ao snapshot anterior. Não fica recebimento sem caixas nem caixas sem recebimento por uma falha no meio desta aba.

O `requestId` torna o segundo clique da mesma tentativa idempotente: devolve o recebimento já criado e não gera caixas novas. Trocar os dados e confirmar de novo com o mesmo identificador também não cria outro lote.

`localStorage` não segura duas abas ou dois aparelhos ao mesmo tempo. A proteção real depende de um banco central, que não faz parte desta fase.

## Impressão

A folha reutiliza `BoxLabel`. Não há outro desenho de etiqueta. Cada QR continua `orion://v1/box/CX-...`, com o código daquela caixa.

No papel, as etiquetas entram em duas colunas de A4, com `break-inside: avoid`, para não cortar uma etiqueta no meio. A impressão em preto e branco é a do navegador. Reimprimir lista as caixas já gravadas e não chama a confirmação outra vez.

## Busca

A lista filtra por texto (código do recebimento, produto, marca, lote, fornecedor ou código de caixa), data de recebimento, produto e marca. O status exibido é sempre confirmado.

## Limitações

Não há NFe, XML, ERP, preço, mapa, inventário, expedição, usuários, autenticação nem Supabase. O recebimento não atribui endereço. Não há cancelamento que apague caixas. Não há semente de recebimento, para não alterar as caixas de demonstração nem consumir sequência.

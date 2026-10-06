# Fase 3A — QR Code e etiquetas básicas

O QR liga a caixa ou o endereço físico ao registro digital. Ele identifica. Não guarda o produto, o conteúdo, a observação nem o endereço do servidor.

```text
orion://v1/box/CX-20261006-000001
orion://v1/location/SUP-A-03-02-04
```

## Protocolo

| Parte | Valor | Função |
| --- | --- | --- |
| esquema | `orion` | Não é `http` nem `https`. |
| versão | `v1` | Única versão aceita nesta fase. |
| tipo | `box` ou `location` | O que o código aponta. |
| código | código operacional | `CX-AAAAMMDD-NNNNNN` ou `AREA-CORREDOR-PRATELEIRA-NIVEL-POSICAO`. |

O payload é independente de porta e domínio. `http://localhost:8080/...` é rejeitado. Uma etiqueta impressa continua válida se o sistema mudar de máquina.

A versão entra agora para uma etiqueta já impressa não precisar ser reinterpretada em silêncio. Um leitor futuro pode recusar `v2` sem tratar `v1` como lixo. Não há outra versão implementada.

## Funções

Ficam no domínio, fora da interface:

- `createBoxQrPayload`
- `createLocationQrPayload`
- `parseQrPayload`
- `validateQrPayload`
- `resolveIdentification`

`resolveIdentification` recebe o payload e o catálogo atual de caixas e endereços. Devolve o tipo e o `entityId`. Se o código for válido e o registro não existir, a busca falha com mensagem clara. A Fase 3B reutiliza esta função no scanner. A entrada digitada usa `resolveManualEntry`, no mesmo módulo, sem um segundo protocolo.

O desenho do QR é feito na tela, a partir do payload, com `qrcode.react`. Nada é salvo no `localStorage`.

## Etiquetas

A etiqueta da caixa usa o preset `BOX_LABEL_SMALL` (cerca de 90 mm). Mostra marca, nome, cor, medidas e lote só quando existem. Quantidade e metragem da caixa permanecem, porque fazem parte do volume. Um produto sem largura, espessura ou comprimento de rolo não gera linha vazia.

A sinalização do endereço usa `LOCATION_LABEL_MEDIUM` (cerca de 100 mm): código, QR, área, corredor, prateleira, nível e posição.

A impressão é a do navegador (`window.print`). O CSS `@media print` esconde o restante da aplicação e deixa só a etiqueta, em preto sobre branco, com margem quieta no QR. O PDF, se for preciso, sai do próprio diálogo de impressão. Não há biblioteca de PDF nem impressão em lote.

## Limitações

A leitura por câmera, a movimentação e a tela de movimentações estão na Fase 3B. Esta fase continua responsável só pela geração do QR e pela etiqueta. Não há mapa, recebimento em lote, impressão em lote, inventário, expedição, usuários ou banco remoto. O tamanho não está preso a uma impressora térmica específica.

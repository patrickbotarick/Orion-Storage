# Fase 3B — Scanner e movimentações

O primeiro fluxo operacional do Orion Storage: identificar uma caixa, identificar um endereço, confirmar e só então gravar a movimentação e atualizar a localização atual.

```text
ESCANEAR BOX
↓
IDENTIFICAR CAIXA
↓
ESCANEAR LOCATION
↓
IDENTIFICAR ENDEREÇO
↓
VALIDAR
↓
CONFIRMAR
↓
CRIAR MOVEMENT
↓
ATUALIZAR BOX.currentLocationId
↓
ATUALIZAR HISTÓRICO
```

A leitura de dois QR não movimenta sozinha. O botão de confirmar é obrigatório.

## Movement

Registro logístico oficial. Append-only. Não há edição nem exclusão. Uma correção futura é outra Movement.

| Campo | Função |
| --- | --- |
| `id` | Identificador estável. |
| `type` | `STORED`, `MOVED` ou `REMOVED`. |
| `boxId` | Caixa movimentada. |
| `fromLocationId` | Endereço de saída, quando existe. |
| `toLocationId` | Endereço de entrada, quando existe. |
| `createdAt` | Instante ISO. |
| `notes` | Opcional. |
| `source` | `SCAN` ou `MANUAL`. |
| `metadata` | Códigos da caixa e dos endereços no momento da gravação, para a lista continuar legível. |

Tipos:

- `STORED` — a caixa não tinha localização e passou a ter.
- `MOVED` — saiu de um endereço e entrou em outro.
- `REMOVED` — tinha localização e ficou sem.

Não há tipos de expedição, inventário, recebimento ou consumo.

Origem:

- `SCAN` — a caixa e o destino foram lidos pela câmera na tela Scanner.
- `MANUAL` — algum código foi digitado ou colado no Scanner, ou a localização foi alterada no detalhe da caixa.

Se o mesmo código for lido de novo em menos de dois segundos, a sessão ignora a repetição e não cria outra ação.

## Persistência

`MovementRepository` expõe `list`, `getById`, `listByBoxId`, `listByLocationId` e `create`. Não há `update` nem `delete`.

A chave é `orion-storage.movements.v1`. Se ela não existir, a lista começa vazia. A interface não lê `localStorage`.

## Consistência

`MovementService` é o único caminho da interface. Ele reutiliza as regras da Fase 2B (`assertLocationAssignable`, área ativa e `assertLocationHasRoom`). O plano do tipo fica em `planMovement`.

A gravação é uma unidade lógica, nesta ordem:

1. atualizar `currentLocationId` e o histórico da caixa, já com `metadata.movementId`;
2. acrescentar a Movement.

Se o segundo passo falhar, a caixa volta ao snapshot anterior a esta operação. O `localStorage` não tem transação de verdade: duas abas ao mesmo tempo ainda podem se atropelar. Uma falha no meio de uma única operação não deixa caixa movida sem Movement, nem Movement sem a caixa correspondente.

Destino recusado, sem criar Movement:

- endereço inexistente;
- `BLOCKED` ou `INACTIVE`;
- área `INACTIVE`;
- capacidade esgotada, sem contar a própria caixa que está saindo;
- a caixa já está naquele endereço — mensagem "Esta caixa já está nesta localização.";
- a caixa já está sem localização e a ação é remover — "Esta caixa já está sem localização."

## Histórico

Movement é o registro logístico oficial. `BoxHistory` continua sendo o resumo da entidade (`LOCATION_ASSIGNED`, `LOCATION_CHANGED`, `LOCATION_CLEARED`) e passa a guardar `metadata.movementId`. Os dois não competem: a lista de movimentações não é reconstruída a partir do histórico, e o histórico não inventa uma Movement.

## Dados anteriores

Caixas que já tinham `currentLocationId` na Fase 2B continuam onde estão. Nenhuma Movement retroativa é criada para semente ou para dado antigo. A tela avisa: localização atual pré-existente sem Movement histórica. Só o que acontecer daqui para a frente entra no registro.

## Scanner

Rota `/scanner`. Pensada para o celular: botões altos, poucos elementos, câmera no centro e confirmação em bloco próprio.

Estados visíveis:

- Aguardando caixa
- Caixa identificada e aguardando destino
- Destino identificado e confirmar movimentação
- Concluído

Depois do sucesso, "Caixa movimentada com sucesso." e o botão "Movimentar outra caixa", que zera a sessão.

"Remover da localização" aparece quando a caixa identificada já tem endereço. Não existe QR de destino vazio. Cancelar volta a aguardar o destino sem gravar nada.

A câmera usa `html5-qrcode`. A permissão só é pedida ao tocar em "Usar câmera". A preferência é `facingMode: environment`; se essa câmera não existir, tenta a frontal. "Parar câmera" e sair da tela encerram o stream. Permissão negada: "Permissão da câmera negada." Sem câmera: "Nenhuma câmera disponível."

No computador, `localhost` costuma liberar a câmera. No celular acessando outro aparelho da rede, o navegador em geral exige HTTPS. Não há contorno inseguro.

O campo "Digitar ou colar código" aceita `CX-20261006-000001`, `SUP-A-03-02-04` e o payload `orion://v1/...`. A resolução é `resolveManualEntry`, que chama `resolveIdentification` quando o texto é um identificador com esquema. Código que casa com uma caixa e um endereço ao mesmo tempo é recusado. Não há um segundo parser de QR.

## Movimentações

Rota `/movimentacoes`. Cada linha mostra data e hora, código da caixa, produto, tipo, origem, destino e source. A busca olha caixa, produto, origem e destino. Os filtros são tipo, source, data (no fuso de São Paulo) e caixa.

O detalhe da caixa tem a seção Movimentações. O detalhe do endereço mostra as oito movimentações mais recentes em que ele é origem ou destino.

## Limitações

Não há mapa, arrastar e soltar, inventário, contagem, expedição, consumo de rolo, usuários, autenticação, Supabase nem ERP. O recebimento em lote e a impressão de várias etiquetas estão na Fase 3C. A câmera não é testada de forma automática. O rollback cobre a falha da gravação da Movement nesta aba, não um conflito entre duas abas.

## Próxima fase

O registro e a localização atual já existem. O recebimento em lote ficou na Fase 3C. O passo seguinte pode ser um mapa de ocupação somente leitura, sem arrastar caixas. Inventário e expedição continuam fora até terem fase própria.

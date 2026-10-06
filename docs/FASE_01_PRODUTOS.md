# Fase 1 — Catálogo de produtos

Fundação do Orion Storage. Esta fase modela **produto**, não fita. Atributos de fita de borda são opcionais e servem ao primeiro cenário operacional.

O plano mestre original não foi alterado. Menções ao primeiro ambiente de uso, nesse plano, são contexto de implantação e não fazem parte do nome, do namespace nem da identidade do software.

## Modelo Product

Campos de catálogo:

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `id` | sim | Gerado na persistência. Não vem do formulário. |
| `internalCode` | sim | Sugerido ou digitado. Normalizado para ASCII maiúsculo. |
| `name` | sim | |
| `category` | sim | Texto livre. Não existe enum de fita. |
| `brand` | não | |
| `line` | não | Linha ou modelo. Não entra no código interno. |
| `manufacturer` | não | |
| `supplier` | não | |
| `status` | sim | `ACTIVE` ou `INACTIVE`. |
| `notes` | não | |
| `manufacturerCode` | não | |
| `originalBarcode` | não | |
| `colorName` | não | |
| `colorCode` | não | |
| `widthMm` | não | Número em milímetros. |
| `thicknessMm` | não | Número em milímetros. |
| `rollLengthM` | não | Número em metros. |
| `rollsPerBox` | não | Inteiro. |
| `totalLengthPerBoxM` | não | Total **informado** pelo fabricante, em metros. |
| `createdAt` / `updatedAt` | sim | Controle técnico do repositório. |

Não existe entidade `Fita`. Uma ferragem, por exemplo, pode ser salva só com nome, categoria e código.

## Unidades

O domínio guarda números puros:

- largura e espessura em milímetros (`35`, não `"35 mm"`);
- comprimento em metros;
- quantidade de rolos como inteiro.

`packages/shared` formata a unidade na tela (`35 mm`, `0,4 mm`, `20 m`).

## Normalização

`normalizeDisplay` colapsa espaços e devolve `undefined` para vazio, preservando maiúsculas e acentos de exibição.

`normalizeForComparison` gera a chave de comparação:

- remove acentos;
- ignora diferença de caixa;
- colapsa espaços;
- remove espaços ao redor de `/`.

Assim, `Real`, `REAL` e ` real ` são a mesma marca, e `Azul` equivale a ` AZUL `. O valor exibido continua sendo o que foi cadastrado.

## Código interno

Função: `suggestInternalCode` em `packages/domain/src/internal-code.ts`.

Segmentos unidos por hífen. Segmento ausente é omitido, sem placeholder:

1. marca;
2. nome da cor, ou código da cor se o nome estiver vazio;
3. largura inteira em milímetros, com pelo menos 3 dígitos (`35` → `035`);
4. espessura em centésimos de milímetro, com pelo menos 3 dígitos (`0,45` → `045`, `0,4` → `040`);
5. comprimento do rolo em metros inteiros, com pelo menos 3 dígitos (`20` → `020`).

Exemplo completo: `REAL-AZUL-035-045-020`.

Se nada disso existir, usa-se o nome (`Parafuso sextavado` → `PARAFUSO-SEXTAVADO`).

Regras de caractere, também aplicadas a código digitado:

- sem espaços;
- sem acentos;
- maiúsculas;
- apenas `A-Z`, `0-9` e hífen;
- no máximo 80 caracteres.

O código é determinístico para os mesmos atributos. Linha, categoria, fornecedor e fabricante não entram nele. Dois produtos iguais podem receber o mesmo código sugerido; a unicidade não é imposta na Fase 1. A edição manual é permitida. O botão **Sugerir** recalcula. Em cadastro e duplicação, o código acompanha os atributos até alguém editar o campo.

Na duplicação, `buildDuplicateInput` descarta o id e recalcula o código. A tela abre o formulário para a variação (por exemplo, largura 35 → 64) antes de gravar. O repositório também expõe `duplicate(id)`, que grava a cópia imediata com novo id.

## Metragem

`calculatedTotalLengthM = rollLengthM * rollsPerBox`.

Exemplo: `20 × 10 = 200`.

`totalLengthPerBoxM` é o total informado e não é substituído pelo cálculo. `detectLengthDivergence` compara os dois quando ambos existem. Diferença acima de 0,001 m é divergência. Dado incompleto não é divergência. A interface mostra o aviso e grava os dois números.

## Validação

Zod, em `productInputSchema`, mais o parser de formulário:

- nome, categoria e código interno obrigatórios;
- largura, espessura, comprimento e total: se preenchidos, número finito maior que zero, sem unidade no texto;
- rolos por caixa: inteiro maior que zero;
- negativos e zero são rejeitados;
- vírgula decimal é aceita (`0,4`).

## Persistência

Contrato `ProductRepository`:

- `list`
- `getById`
- `create`
- `update`
- `duplicate`
- `setStatus`

Implementação da fase: `LocalStorageProductRepository`, chave `orion-storage.products.v1`.

Fluxo:

```text
UI → ProductService → ProductRepository → LocalStorageProductRepository
```

Componentes React não importam o repositório nem chamam `localStorage`. A primeira abertura sem dados grava os seeds. Uma lista salva, mesmo vazia, não é recriada. Desativar não remove o registro.

## Dados de demonstração

Somente o que foi confirmado nas etiquetas de referência.

1. Proadec, linha Classic, cor Branco 1101 TX, 35 mm, rolo de 20 m, 10 rolos, total informado 200 m. Espessura, fabricante e código de cor não foram informados e ficam ausentes. O nome exibido junta linha e cor, porque não havia outro nome comercial.
2. Marca Real/Rehau, cor Pinole, referência Pinole Essencial Duratex usada como nome, 22 mm, espessura 0,4 mm, rolo de 20 m, 15 rolos, total informado 300 m.

Categoria dos dois: `Fita de borda`, o tipo confirmado desse cenário. Os totais coincidem com o cálculo, então não há divergência artificial.

## Arquitetura

- Domínio puro em `packages/domain`, sem React e sem browser.
- Formatação em `packages/shared`.
- Casos de uso em `src/application/products`.
- Adapter de persistência em `src/persistence`.
- Telas em `src/features/products`.

A pasta `apps/web` não foi criada. O Vite desta base executa a aplicação a partir de `src/` na raiz do repositório, que é o que `npm run dev` sobe. Separar um segundo app quebraria esse contrato sem ganho na Fase 1.

Estilização com Tailwind e tokens em `src/styles.css`, em vez de CSS Modules, porque o aplicativo já usa Tailwind 4. A paleta é neutra com acento cobre. Não há identidade visual do primeiro cliente.

## Decisões

- Status só `ACTIVE` e `INACTIVE`. Sem exclusão na interface.
- Código interno canônico em maiúsculas, para busca estável.
- Total informado e total calculado convivem.
- `line` existe porque o plano de produto prevê linha/modelo e a primeira etiqueta traz Classic. Não é atributo exclusivo de fita.
- Repositório injetável (`KeyValueStore`) para testar persistência sem browser.

## Limitações

- Dados ficam no navegador local. Outro computador ou outro perfil não vê o catálogo.
- Sem login, sem auditoria de usuário e sem concorrência.
- Código interno pode se repetir.
- JSON inválido na chave de storage resulta em lista vazia, sem apagar a string corrompida até o próximo salvamento.
- Sem caixas, posições, QR Code, recebimento, mapa ou integração externa.

## Testes

Vitest:

- `packages/domain/src/normalize.test.ts`
- `packages/domain/src/internal-code.test.ts`
- `packages/domain/src/length.test.ts`
- `packages/domain/src/schema.test.ts`
- `packages/domain/src/duplicate.test.ts`
- `packages/domain/src/seeds.test.ts`
- `packages/domain/src/filter.test.ts`
- `src/persistence/local-storage-product-repository.test.ts`

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

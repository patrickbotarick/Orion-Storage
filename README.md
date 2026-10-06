# ORION STORAGE

Sistema independente de controle de estoque físico e endereçamento interno.

A Fase 1 entrega o catálogo de produtos: modelagem, regras de domínio, persistência local e a tela de cadastro. O produto não é específico de fita de borda. Medidas de fita existem como atributos opcionais para o primeiro cenário de uso.

## Objetivo

Padronizar o cadastro de produtos antes de caixas, endereços, QR Code e movimentações. O catálogo precisa ser legível, testável e independente da interface e do banco que vier depois.

## Stack

- React 19, TypeScript strict, Vite
- TanStack Router / Start, já usado por este aplicativo
- Zod para validação do contrato de produto
- Tailwind CSS 4, com tokens em `src/styles.css`
- Vitest
- ESLint e Prettier
- npm

Não há backend, autenticação real nem banco remoto nesta fase.

## Requisitos

- Node.js 22 ou superior
- npm

## Instalação

Na pasta do projeto:

```bash
npm install
```

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Sobe o aplicativo |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run lint` | ESLint |
| `npm test` | Vitest do domínio e da persistência, depois os testes já existentes da base |
| `npm run build` | Build de produção |
| `npm run format` | Prettier |

O servidor de desenvolvimento usa a porta **8080**.

## Estrutura

```text
packages/domain/     entidades, normalização, código interno, metragem, validação, filtros, contrato do repositório, seeds
packages/shared/     formatação de unidades e rótulos de status
src/application/     serviços / casos de uso
src/persistence/     LocalStorageProductRepository
src/features/        interface de produtos
src/routes/          entrada da aplicação web
docs/                documentação da fase
```

A interface fica em `src/` — e não em `apps/web/` — porque o aplicativo Vite deste repositório é servido a partir da raiz. `packages/domain` e `packages/shared` são a fronteira de crescimento: o domínio não importa React nem `localStorage`.

## Execução

```bash
npm install
npm run dev
```

Abra a aplicação na porta 8080. A tela inicial é o catálogo de produtos, já com dois itens de demonstração.

## Testes

```bash
npm test
```

Cobrem normalização, código interno, metragem, divergência, largura, espessura, números negativos, duplicação e o repositório local.

## Status atual

Fase 1 concluída no código: catálogo de produtos. Fases seguintes não foram iniciadas.

## Funcionalidades da Fase 1

- Cadastro, edição e duplicação de produto
- Ativar e desativar, sem exclusão física
- Busca por código, nome, marca e cor
- Filtros de categoria, marca e status
- Código interno sugerido e editável
- Cálculo de metragem e aviso de divergência com o total informado
- Persistência no navegador, sobrevivendo a refresh
- A interface não acessa `localStorage`

## Próximos passos

Caixas físicas, recebimento, etiquetas, QR Code, endereçamento, mapa e movimentações. A troca do `LocalStorageProductRepository` por uma API ou PostgreSQL deve acontecer atrás de `ProductRepository`, sem mudar a tela.

## Exportação

Copie a pasta inteira do projeto, incluindo `package-lock.json`, `packages/`, `src/`, `docs/`, `public/`, `scripts/` e os arquivos de configuração. Não é necessário copiar `node_modules`. No outro computador:

```bash
npm install
npm run dev
```

Não há segredos nem caminhos absolutos de máquina no código do catálogo. O plano mestre original permanece fora desta pasta de aplicação e não foi alterado.

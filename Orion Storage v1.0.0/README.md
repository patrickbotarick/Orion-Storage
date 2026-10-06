# ORION STORAGE

Sistema independente de controle de estoque físico.

A Fase 1 entrega o catálogo de produtos. A Fase 2A entrega a caixa física: identidade, conteúdo, status e histórico básico. A Fase 2B entrega o endereço físico: área, posição e o vínculo opcional da caixa. O produto não é específico de fita de borda. Medidas de fita existem como atributos opcionais para o primeiro cenário de uso.

## Objetivo

Separar o cadastro do produto da unidade física que está no estoque. Cada caixa tem código próprio, mesmo quando várias carregam o mesmo produto. Endereço, etiqueta, QR Code e movimentação ficam para as fases seguintes.

## Stack

- React 19, TypeScript strict, Vite
- TanStack Router / Start, já usado por este aplicativo
- Zod para validação dos contratos
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

| Comando             | Função                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`       | Sobe o aplicativo na porta 8080. Outra porta: `npm run dev -- --port 8091` |
| `npm run typecheck` | TypeScript sem emitir arquivos                                                            |
| `npm run lint`      | ESLint                                                                                    |
| `npm test`          | Vitest do domínio, da aplicação e da persistência (Fases 1, 2A e 2B)         |
| `npm run build`     | Build de produção                                                                         |
| `npm run format`    | Prettier                                                                                  |

O servidor de desenvolvimento escuta em **0.0.0.0** e, sem argumento, usa a porta **8080** (`http://127.0.0.1:8080`). Para escolher outra porta: `npm run dev -- --port 8091`. Os scripts `dev`, `build` e `preview` chamam o Vite pelo `npm`, que resolve o binário local (`vite` no Linux e macOS, `vite.cmd` no Windows). Não há wrapper que faça `spawn("vite")`.

Não há banco, autenticação nem serviços externos. Os dados ficam no `localStorage` do navegador.

## Estrutura

```text
packages/domain/     produtos, caixas, áreas, endereços, histórico, validação, filtros, seeds
packages/shared/     formatação e rótulos
src/application/     ProductService, BoxService e serviços de endereçamento
src/persistence/     repositórios em localStorage
src/features/        telas de produtos, caixas e endereçamento
src/routes/          entrada da aplicação web
docs/                documentação das fases
```

A interface fica em `src/` — e não em `apps/web/` — porque o aplicativo Vite deste repositório é servido a partir da raiz. O domínio não importa React nem `localStorage`.

## Execução

```bash
npm install
npm run dev
```

Abra a aplicação na porta 8080, ou na porta passada com `--port`. A navegação tem **Produtos**, **Caixas** e **Endereçamento**. Os três lados já abrem com dados de demonstração.

### Início rápido no Windows

1. Dê dois cliques em `INICIAR_ORION.bat`, na raiz da pasta do projeto.
2. Informe a porta desejada.
3. Pressione Enter.
4. Acesse o endereço mostrado no console. O navegador abre sozinho quando o servidor passa a aceitar conexões nessa porta.

- Enter sem digitar nada usa **8080**.
- Outra porta (por exemplo 8085 ou 8091) evita conflito com outros projetos locais.
- Ctrl+C encerra o servidor.
- O arquivo entra na pasta em que ele mesmo está (`%~dp0`). Pode mover o projeto; não há caminho absoluto de máquina.
- Se `node_modules` não existir, o inicializador executa `npm install` antes de subir o servidor.

## Testes

```bash
npm test
```

Cobrem o catálogo da Fase 1, as caixas da Fase 2A e, na Fase 2B, área, endereço, capacidade, vínculo da caixa e histórico de localização.

## Status atual

- Fase 1 concluída: catálogo de produtos.
- Fase 2A concluída: caixas físicas e rastreabilidade básica.
- Fase 2B concluída: endereçamento físico.
- QR Code, scanner, mapa gráfico e movimentação completa não foram iniciados.

## Funcionalidades da Fase 1

- Cadastro, edição e duplicação de produto
- Ativar e desativar, sem exclusão física
- Busca por código, nome, marca e cor
- Filtros de categoria, marca e status
- Código interno sugerido e editável
- Código interno único, comparado de forma normalizada
- Cálculo de metragem e aviso de divergência com o total informado
- Persistência no navegador, sobrevivendo a refresh
- A interface não acessa `localStorage`

## Funcionalidades da Fase 2A

- Cadastro, edição, consulta e mudança de status da caixa
- Código `CX-AAAAMMDD-NNNNNN`, gerado, único e estável após refresh
- Vínculo obrigatório com produto ativo
- Quantidade e metragem editáveis, com sugestão a partir do padrão do produto
- Lote opcional e data de recebimento
- Histórico de criação, edição e mudança de status
- Busca e filtros
- Quatro caixas de demonstração para os dois produtos da Fase 1

## Próximos passos

Ainda não há QR Code, scanner, mapa gráfico, etiqueta ou entidade de movimentação. O próximo passo natural é a movimentação registrada, ou a etiqueta, ainda sem transformar o endereço em um mapa visual.

## Funcionalidades da Fase 2B

- Área física com código estável e nome
- Endereço `AREA-CORREDOR-PRATELEIRA-NIVEL-POSICAO`, gerado e único
- Capacidade opcional da posição
- Status ativa, bloqueada ou inativa
- Caixa sem localização, com localização, troca e remoção
- Histórico `LOCATION_ASSIGNED`, `LOCATION_CHANGED` e `LOCATION_CLEARED`
- Lista hierárquica simples, sem mapa gráfico
- Tela Endereçamento e coluna de localização nas caixas

## Exportação

Copie a pasta inteira do projeto, incluindo `package-lock.json`, `packages/`, `src/`, `docs/`, `public/`, `scripts/`, `INICIAR_ORION.bat` e os arquivos de configuração. Não é necessário copiar `node_modules`. No outro computador:

```bash
npm install
npm run dev
```

Não há segredos nem caminhos absolutos de máquina no código do catálogo ou das caixas. O plano mestre original permanece fora desta pasta de aplicação e não foi alterado.

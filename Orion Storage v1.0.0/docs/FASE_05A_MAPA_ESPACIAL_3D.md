# Fase 5A — mapa espacial 3D

## Preparação — 08/10/2026

Status: preparação e checkpoint anterior à implementação. Nenhuma funcionalidade da 5A foi implementada ou homologada nesta revisão.

Repositório local em `main`, HEAD inicial `5e68573`. Remoto `origin`: `https://github.com/patrickbotarick/Orion-Storage.git`. Após `git fetch origin`, `origin/main` aponta para `35d9a81`; a branch local está cinco commits à frente e nenhum atrás. Fetch consulta o remoto; nenhum pull, push, merge ou tag foi executado. Conforme instrução do usuário, qualquer `git pull` exige confirmação explícita antes de executar.

A implementação visual 4C.1–4C.5 está registrada no Git e em `FASE_04C_IDENTIDADE_VISUAL.md`. Homologação física de câmera/impressora, leitor de tela e auditoria manual integral WCAG continuam pendentes em `CHECKLIST_HOMOLOGACAO_VISUAL.md`; não impedem a inspeção técnica da 5A e não são presumidas aprovadas.

Referência local: diretório `Orion Storage v1.0.0`; o manifest não declara campo de versão. React 19, TypeScript, Vite, TanStack Start/Router, Tailwind 4 e Lucide, com domínio em `packages/domain`, serviços em `src/application`, adaptadores em `src/persistence` e interfaces em `src/features`. Não recriar o projeto nem adotar contratos Linux/Grok incompatíveis com este workspace Windows.

Havia alterações anteriores da auditoria/4B: inventários no domínio, serviço, persistência, testes, rota, tela e indicador do mapa; README e relatórios. Elas serão preservadas no commit inicial solicitado, junto deste registro. Evidências e ferramentas de auditoria instaladas em `screenshots/` ficam fora do commit. Nenhum dado do navegador do operador é acessado ou modificado pelo Git.

Linha de base repetida: lint, typecheck e 134 testes em 30 arquivos passaram. Build de produção e regressões desktop/mobile do mesmo código passaram na rodada 4C.5; registros disponíveis em `screenshots/fase4c5/`. Repetir os gates após alterações da 5A.

## Inspeção e riscos de compatibilidade

- `StorageArea` já existe: reutilizar área, identidade e persistência. Código da área não é editável pelo serviço atual.
- `Location` já existe com ID, código, área, corredor, prateleira, nível, posição, status e capacidade. Há estados ACTIVE/BLOCKED/INACTIVE; não duplicar bloqueios ou criar estoque no mapa.
- Caixas referenciam a localização por ID; ocupação, produtos e movimentações são a fonte oficial. Inventários têm snapshots históricos que precisam permanecer íntegros.
- QR `orion://v1/location/...` atual resolve pelo código legível, não pelo ID. Renomeação exige aliases/identidade estável e testes de compatibilidade antes de ser liberada; não reescrever etiquetas antigas nem mudar arbitrariamente o protocolo.
- O serviço atual impede mudar a estrutura de endereço ocupado. A evolução espacial deve preservar essa proteção e impedir remoção de posições vinculadas. Não migrar endereços antigos automaticamente para coordenadas presumidas.
- Persistência atual é localStorage, sem transação entre várias chaves ou garantia multiusuário. Novas gravações estruturais precisam ser validadas integralmente, tratar falhas de gravação e manter a última versão recuperável; não apresentar escrita parcial como transação atômica.
- Layout físico real não foi medido nem fornecido neste briefing. Exemplo deve ficar separado do estoque oficial e explicitamente identificado, sem criar endereços fictícios automaticamente.
- Three.js/R3F/Drei não estão nas dependências atuais. Compatibilidade, versões, carregamento sob demanda, bundle e fallback sem WebGL devem ser avaliados antes de instalar.

## Plano de implementação por checkpoints

1. **Domínio espacial:** adaptar endereçamento, zonas/estruturas/layout e compatibilidade QR, IDs estáveis, validações e testes. Estratégia de migração explícita, sem reset das chaves existentes.
2. **Gerador modular:** face U ou A/B, níveis independentes e posições variáveis; colmeia e suporte de domínio para piso. Um referencial local fixo mantém as faces mesmo ao girar. Geometria derivada da configuração.
3. **Visualizador:** módulo 3D sob demanda, perspectiva/superior e seleção; alternativa lista/2D utilizável sem WebGL. Tokens Industrial Precision e primitivas existentes. Geometria simples, controle de câmera e desempenho observáveis.
4. **Editor:** rascunho separado de consulta, snap, mover/rotacionar, dimensões, duplicação e modulação; colisões/limites/códigos validados antes de salvar; cancelamento restaura o estado persistido. Confirmar alterações destrutivas e recusar remoção com estoque.
5. **Integração:** busca com várias ocorrências, enquadramento da face/posição, detalhe com estoque oficial, QR/etiquetas/scanner existentes e confirmação antes de movimentar.
6. **Validação:** testes de domínio/serviço/persistência, reload, legado, WebGL/fallback, desktop/mobile, lint/typecheck/build e documentação. Commit pequeno após cada checkpoint validado e commit final solicitado. Sem push automático.

## Aprovação de sincronização

O commit inicial deve anteceder o eventual pull e as mudanças da 5A. A execução de `git pull --ff-only origin main` será solicitada explicitamente ao usuário. No estado remoto observado não existem commits a incorporar. Se houver divergência, não realizar merge, reset ou rebase automaticamente; analisar e apresentar a situação.

## Registro de implementação

Todos os seis checkpoints estão pendentes. Bibliotecas, modelos finais, regras de orientação, migrações, fluxos, limitações e resultados de QA serão registrados aqui conforme forem implementados e verificados. Este documento é um plano inicial, não uma declaração de aceite da 5A.

### Checkpoint 1 — domínio espacial

Pull `--ff-only` autorizado pelo usuário e executado em 08/10/2026: Already up to date. Implementação na branch `codex/phase-5a-spatial-map`, após commit de preservação `2e6c354`.

Modelo adicional em `spatial.ts`: layout por área, zona, estrutura, faces, níveis e slots. Cada slot referencia Location oficial; geometria não contém saldo. Metadados opcionais em Location preservam registros legados sem migração automática. Layout novo utiliza chave `orion-storage.spatial-layouts.v1`; leitura não cria posições.

O serviço valida a configuração inteira, códigos/aliases globais, capacidade, estoque vinculado e revisão antes de gravar. Remoção vazia exige confirmação e desativa o endereço, conservando registro/QR/histórico; remoção ocupada é recusada. Novas posições recebem QR estável LOC-ID dentro do protocolo v1; renomeação conserva aliases. Vinculação explícita de legado conserva seu código. Endereçamento antigo bloqueia alteração da hierarquia de posições espaciais pelo formulário anterior, mas conserva notas/capacidade/status.

Gravação local usa journal de rollback antes das duas chaves. Falha reverte e uma interrupção é recuperada ao construir o repositório de endereços. Não é transação entre abas: comparação de snapshots/revisão detecta alterações observadas, sem garantia multiusuário. Corrupção do layout é recusada sem reset.

Primeira validação: 149 testes/32 arquivos passaram, incluindo 15 novos testes de domínio/serviço, legado, QR, colisões, revisão, remoção e falha/recuperação. Gates deste checkpoint registrados antes do commit. Não há aceite de visualizador/editor neste checkpoint.

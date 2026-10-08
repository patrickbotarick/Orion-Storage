# Homologação visual — Industrial Precision

Rodada 4C.5, 08/10/2026. Workspace em `main`, partida no commit `66c54e0`. Auditoria anterior registrada; alterações da auditoria/4B preservadas e excluídas do commit visual. Os testes abaixo descrevem o workspace integrado, incluindo Inventários ainda pendente no Git.

## Resultado e limites

A implementação foi refinada e verificada em Edge/Chromium, em desenvolvimento e no build de produção. Isso não certifica conformidade integral WCAG nem substitui homologação de hardware. Os perfis de QA são descartáveis; nenhum perfil ou dado operacional do usuário é aberto.

| Verificação                          | Evidência / resultado                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Oito rotas reais, desktop e mobile   | Conteúdo, fontes Manrope/IBM Plex Mono, console e navegação verificados                                                                       |
| Reflow em 1280, 768, 390 e 320px     | Sem overflow global nas composições auditadas; mapa/tabelas conservam rolagem própria                                                         |
| Texto em 200% e espaçamento ampliado | Rotas e formulários auditados; shell e grades passam a responder ao espaço disponível                                                         |
| Teclado                              | Tab, skip link, foco visível/desobstruído, menu, Escape e retorno de foco verificados                                                         |
| Acessibilidade automatizada          | Axe-core 4.11.4: 125 estados por ambiente, sem violações detectadas; resultados `incomplete` conservados no JSON                              |
| Contraste                            | 28 pares semânticos aprovados; hachuras do mapa calculadas no ponto de menor contraste                                                        |
| Estados vazios, erro e loading       | Busca sem resultado, formulários inválidos sem gravação, câmera negada/ausente, ação bloqueada e reduced motion verificados                   |
| Recebimentos e movimentações         | Prévia não grava; confirmação cria caixas; scanner armazena, troca endereço e retira somente após confirmar                                   |
| Scanner com vídeo                    | Decoder real lê BOX → LOCATION em vídeo canvas a 390/320px; nenhuma gravação antes de confirmar; movimento com origem SCAN e stream encerrado |
| Etiquetas e QR                       | Pixels renderizados decodificados em 1280/390/320px; payloads `orion://v1/box/...` e `orion://v1/location/...` preservados                    |
| Impressão em navegador               | PDF e mídia print; caixa 90mm, endereço 100mm, superfície branca e arte funcional preservada                                                  |
| Inventários                          | Criação, contagem, revisão/finalização, cancelamento, histórico e indicador; bytes de caixas/movimentos oficiais preservados                  |
| Gates                                | Lint, typecheck, 134 testes/30 arquivos, 149 testes auxiliares e build aprovados                                                              |

O vídeo é uma simulação do dispositivo na API de mídia, mantendo o componente e decoder reais. Não comprova qualidade óptica, iluminação, distância, permissões em Android/iOS ou comportamento de câmera física. PDF não comprova escala e margens do driver ou leitura de papel impresso.

## Pendências de homologação presencial/manual

- [ ] Scanner em dispositivos Android e iOS reais: permissão, leitura de papel, iluminação, rotação, interrupção/retomada e encerramento da câmera.
- [ ] Impressora real: escala 100%, margens, dimensões, contraste e leitura do QR no suporte final.
- [ ] Leitor de tela e auditoria manual integral WCAG 2.2 AA, incluindo os itens inconclusivos do Axe, todos os percursos e estados não cobertos.
- [ ] Aprovação visual pelo responsável do produto; logotipo definitivo permanece pendente.

Os resultados `incomplete` não são aprovações. Incluem contraste sobre fundos compostos/gradientes e condições de foco/visibilidade que precisam de interpretação manual. As hachuras do mapa têm verificação numérica adicional (danger 5,06:1 e muted 5,62:1); os demais itens devem ser revisados no JSON. Preferência de fonte em 200% foi testada; não é declaração de cobertura de todos os modos de zoom do navegador/sistema.

## Reproduzir

Usar o servidor existente de desenvolvimento ou `npm run preview` após `npm run build`. Substituir `8091` pela porta do ambiente. Não executar build ao mesmo tempo que QA de desenvolvimento: a reconstrução pode interferir em recursos servidos pelo Vite. A ferramenta de auditoria fica isolada, sem alterar dependências do aplicativo:

```powershell
npm install --prefix screenshots/fase4c5/tooling --no-package-lock --ignore-scripts axe-core@4.11.4
npm run lint
npm run typecheck
npm test
npm run build
node --test scripts/brand-check.test.mjs scripts/browser-smoke-verdict.test.mjs scripts/grok-pwa-plugin.test.mjs scripts/preview.test.mjs scripts/write-atomic.test.mjs
node scripts/visual-token-check.mjs
node scripts/visual-homologation-qa.mjs 8091
node scripts/application-shell-qa.mjs 8091 fase4c5
node scripts/shared-components-qa.mjs 8091 fase4c5
node scripts/operational-screens-qa.mjs 8091 fase4c5
node scripts/visual-foundation-qa.mjs 8091 fase4c5
node scripts/qr-print-homologation-qa.mjs 8091
node scripts/scanner-camera-qa.mjs 8091
```

Repetir os scripts de navegador em produção. Executar QR/print antes de scanner-camera: este consome os SVGs renderizados daquela rodada. `visual-homologation-qa` aceita como terceiro argumento outro caminho local de `axe.min.js`. A regressão adicional usa o script anterior `inventory-browser-qa.mjs`, que permanece junto à 4B e fora deste commit.

Evidências locais não versionadas em `screenshots/fase4c5/<porta>/`: resultados JSON, capturas e PDFs. Logs dos gates na pasta da rodada. Falhas de permissão EPERM dos testes auxiliares no sandbox foram resolvidas repetindo o mesmo comando com acesso autorizado, sem alterar código. QA deve aguardar estabilidade do servidor e usar contextos separados do operador.

## Referências

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [Reflow e exceções para conteúdo bidimensional](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- [Foco não encoberto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- [Tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): AA 24px; o padrão de controles do Orion permanece 44px.
- [Espaçamento de texto](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

Brand brief, mini brandbook, tokens e exemplos permanecem consolidados em `DESIGN_SYSTEM.md`; implementação por rodada em `FASE_04C_IDENTIDADE_VISUAL.md`.

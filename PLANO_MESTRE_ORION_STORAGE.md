# Plano Mestre — Sistema de Estoque Físico GMAD Rio Preto

**Documento-base de planejamento do projeto**  
**Versão inicial:** 1.0  
**Data:** 06/10/2026  
**Status:** Planejamento aprovado para início de estruturação

---

## 1. Objetivo do projeto

Criar um sistema interno para controle do **estoque físico do almoxarifado da GMAD Rio Preto**, com foco inicial no armazenamento e movimentação de caixas fechadas de fitas de borda, utilizando:

- cadastro padronizado de produtos;
- etiquetas internas padronizadas;
- QR Codes individuais por caixa;
- QR Codes de endereçamento em prateleiras e posições;
- leitura por celular;
- interface desktop para cadastro, impressão, consulta e gestão;
- mapa visual do estoque;
- busca rápida por produto e localização;
- controle de recebimento e movimentação física entre estoque superior e expedição;
- histórico completo de movimentações;
- inventário operacional independente do ERP comercial da empresa.

O sistema será uma ferramenta de **controle físico e logístico interno**.

---

## 2. Limite de escopo — regra fundamental

Este projeto **não substituirá, não alterará e não dependerá do ERP oficial da GMAD**.

O ERP atual continuará responsável por:

- vendas;
- faturamento;
- financeiro;
- notas fiscais;
- entrada fiscal;
- saída comercial;
- estoque contábil/comercial;
- demais integrações já existentes.

O novo sistema será independente e terá como objetivo responder perguntas operacionais como:

- Onde está determinada fita?
- Quantas caixas fechadas existem fisicamente?
- Em qual prateleira e posição cada caixa está?
- Qual caixa foi movida?
- Para onde ela foi?
- Quem fez a movimentação?
- Quando a movimentação aconteceu?
- Quantas caixas ainda estão no estoque superior?
- Quantas caixas foram enviadas para a expedição?

A eventual comparação entre o estoque físico e o ERP poderá existir futuramente apenas como ferramenta de conferência, nunca como substituição do ERP.

---

# 3. Problema atual

O estoque de fitas possui muitas combinações de:

- marca;
- cor;
- largura;
- espessura;
- comprimento por rolo;
- quantidade de rolos por caixa;
- metragem total;
- lote;
- fornecedor/fabricante.

As etiquetas dos fornecedores possuem formatos diferentes e não apresentam as informações de maneira uniforme.

Além disso, as caixas fechadas ficam armazenadas no estoque superior, enquanto a expedição trabalha com caixas abertas e produtos de reposição.

O principal problema operacional está nas caixas fechadas:

- alto volume de entrada;
- dificuldade de identificação rápida;
- dificuldade de localização;
- dependência da memória dos funcionários;
- perda de tempo procurando mercadoria;
- risco de caixas semelhantes ficarem misturadas;
- dificuldade de registrar a transferência para a expedição;
- ausência de um mapa visual atualizado do estoque.

---

# 4. Visão geral da solução

O sistema será dividido em cinco pilares:

1. **Padronização de cadastro**
2. **Padronização de etiquetas**
3. **Endereçamento físico**
4. **Movimentação por QR Code**
5. **Mapa visual e busca**

Fluxo conceitual:

```text
RECEBIMENTO
    ↓
IDENTIFICAÇÃO DO PRODUTO
    ↓
GERAÇÃO DA ETIQUETA GMAD
    ↓
IMPRESSÃO
    ↓
COLAGEM NA CAIXA
    ↓
LEITURA DO QR DA CAIXA
    ↓
LEITURA DO QR DA POSIÇÃO
    ↓
CAIXA ARMAZENADA
    ↓
MAPA VISUAL ATUALIZADO
    ↓
BUSCA / LOCALIZAÇÃO
    ↓
RETIRADA
    ↓
LEITURA DO QR
    ↓
TRANSFERÊNCIA PARA EXPEDIÇÃO
    ↓
HISTÓRICO REGISTRADO
```

---

# 5. Estrutura conceitual do estoque

## 5.1 Estoque superior

Será tratado prioritariamente em nível de **caixa fechada**.

Cada caixa possuirá:

- identificação única;
- produto vinculado;
- quantidade original de rolos;
- metragem total;
- localização atual;
- status;
- histórico.

Exemplo:

```text
Produto: REAL / Azul / 35 mm / 0,45 mm / 20 m
Caixa: CX-20261006-000152
Conteúdo: 10 rolos
Total: 200 m
Local: A-03-02-04
Status: ARMAZENADA
```

## 5.2 Expedição

A expedição poderá ser tratada em um nível diferente do estoque superior.

Na primeira versão, o foco será registrar que a caixa:

```text
ESTOQUE SUPERIOR → EXPEDIÇÃO
```

Posteriormente será possível evoluir para controle por:

- caixa aberta;
- rolos restantes;
- unidades;
- reposições;
- gavetas/posições da expedição.

A primeira versão não precisa controlar cada rolo individualmente.

---

# 6. Entidades principais do sistema

## 6.1 Produto

Representa uma combinação específica de fita.

Campos recomendados:

- ID interno;
- código interno;
- tipo de produto;
- marca;
- fabricante/fornecedor;
- linha/modelo;
- cor;
- código da cor;
- largura;
- espessura;
- comprimento por rolo;
- quantidade padrão de rolos por caixa;
- metragem padrão por caixa;
- código do fabricante;
- código de barras original;
- status ativo/inativo;
- observações.

Exemplo de código interno:

```text
REAL-AZUL-035-045-020
```

ou

```text
PROADEC-BRANCO1101-035-STD-020
```

O código deverá ser legível e estável.

---

## 6.2 Caixa

Cada caixa física será uma unidade rastreável independente.

Campos:

- ID único;
- código da caixa;
- produto vinculado;
- quantidade de rolos;
- metragem total;
- lote;
- data de recebimento;
- localização atual;
- status;
- usuário responsável pelo recebimento;
- observações;
- data de criação;
- data da última movimentação.

Exemplo:

```text
CX-20261006-000152
```

---

## 6.3 Localização

Cada posição física do estoque terá um endereço único.

Estrutura sugerida:

```text
Área → Corredor → Prateleira → Nível → Posição
```

Exemplo:

```text
SUP-A-03-02-04
```

Significado:

- SUP = estoque superior;
- A = corredor;
- 03 = prateleira;
- 02 = nível;
- 04 = posição.

Cada localização poderá possuir QR Code próprio.

---

## 6.4 Movimentação

Cada alteração de localização deverá gerar um registro permanente.

Campos:

- caixa;
- origem;
- destino;
- tipo de movimentação;
- usuário;
- data/hora;
- dispositivo;
- observação;
- motivo, quando necessário.

Tipos de movimentação:

- recebimento;
- armazenamento;
- transferência;
- envio para expedição;
- retorno;
- ajuste;
- inventário;
- baixa física;
- correção de localização.

---

## 6.5 Usuário

Perfis iniciais:

### Administrador

- configura o sistema;
- cadastra usuários;
- edita produtos;
- gerencia localizações;
- acessa histórico completo;
- corrige movimentações.

### Almoxarifado

- recebe mercadoria;
- gera etiquetas;
- lê QR Codes;
- armazena;
- movimenta;
- consulta;
- realiza inventário.

### Consulta

- pesquisa produtos;
- visualiza mapa;
- verifica localizações;
- não altera estoque.

---

# 7. Etiqueta padrão GMAD

## 7.1 Objetivo

Criar uma única identidade visual para caixas de diferentes fornecedores.

A etiqueta deverá permitir identificação rápida sem depender da etiqueta original.

## 7.2 Informações principais

Campos recomendados:

- GMAD Rio Preto;
- marca;
- nome/tipo do produto;
- cor;
- largura;
- espessura;
- comprimento por rolo;
- quantidade de rolos;
- metragem total;
- código interno do produto;
- ID único da caixa;
- QR Code;
- lote, quando disponível;
- data de recebimento, quando necessário.

## 7.3 Hierarquia visual

Informações prioritárias devem possuir maior destaque:

1. Marca
2. Cor
3. Largura
4. Quantidade de rolos
5. Metragem total

Exemplo conceitual:

```text
┌────────────────────────────────────────┐
│ GMAD RIO PRETO                 REAL    │
│                                        │
│ FITA DE BORDA                          │
│ AZUL                                   │
│                                        │
│ LARGURA        35 mm                   │
│ ESPESSURA      0,45 mm                 │
│ ROLO           20 m                    │
│                                        │
│ 10 ROLOS       TOTAL 200 m             │
│                                        │
│ REAL-AZUL-035-045-020                  │
│ CX-20261006-000152             [ QR ]  │
└────────────────────────────────────────┘
```

## 7.4 QR Code

O QR Code não deve necessariamente armazenar todas as informações.

Preferência:

```text
ID da caixa → sistema consulta o banco de dados
```

Exemplo:

```text
CX-20261006-000152
```

ou uma URL interna:

```text
https://estoque.gmad.local/c/CX-20261006-000152
```

Isso permite alterar informações no sistema sem precisar substituir o QR Code.

---

# 8. QR Codes das prateleiras

Cada localização física receberá um QR Code próprio.

Exemplo:

```text
SUP-A-03-02-04
```

Fluxo de armazenamento:

```text
1. Escanear QR da caixa
2. Escanear QR da posição
3. Confirmar armazenamento
```

O sistema registra:

```text
CX-000152 → SUP-A-03-02-04
```

Vantagens:

- reduz erro de digitação;
- facilita armazenagem;
- simplifica inventário;
- aumenta confiabilidade do mapa visual;
- dispensa busca manual por endereço.

---

# 9. Fluxo de recebimento

## 9.1 Conferência

A mercadoria chega e é conferida fisicamente.

O funcionário identifica:

- marca;
- produto;
- cor;
- largura;
- espessura;
- metragem;
- quantidade por caixa;
- quantidade de caixas.

## 9.2 Seleção do produto

Se o produto já existir:

```text
Selecionar produto → informar número de caixas
```

Se não existir:

```text
Cadastrar produto → salvar → continuar recebimento
```

## 9.3 Geração das caixas

Exemplo:

Recebimento:

```text
Produto: Real Azul 35 mm
Quantidade: 8 caixas
```

Sistema cria:

```text
CX-00101
CX-00102
CX-00103
CX-00104
CX-00105
CX-00106
CX-00107
CX-00108
```

## 9.4 Impressão

O sistema gera uma etiqueta para cada caixa.

Possibilidade futura:

- impressão em lote;
- impressora térmica;
- PDF A4;
- etiquetas autoadesivas;
- reimpressão por caixa.

## 9.5 Armazenamento

Funcionário:

```text
Escaneia caixa → escaneia prateleira → confirma
```

Mapa atualizado imediatamente.

---

# 10. Fluxo de busca

O sistema deverá possuir busca global.

Exemplo:

```text
azul 35 real
```

Resultado:

```text
REAL
Fita de Borda Azul
35 mm

Estoque superior
12 caixas
120 rolos
2.400 m

Localizações:
A-03-02-04 → 4 caixas
A-03-02-05 → 5 caixas
A-04-01-02 → 3 caixas
```

Filtros recomendados:

- marca;
- cor;
- largura;
- espessura;
- status;
- localização;
- lote;
- data de recebimento.

---

# 11. Mapa visual do estoque

O mapa visual será uma das funções centrais do sistema.

## 11.1 Estrutura

```text
ESTOQUE SUPERIOR

CORREDOR A
 ├── Prateleira A01
 ├── Prateleira A02
 ├── Prateleira A03
 └── Prateleira A04

CORREDOR B
 ├── Prateleira B01
 ├── Prateleira B02
 └── Prateleira B03
```

Ao abrir uma prateleira:

```text
PRATELEIRA A03

Nível 4    [ vazio ] [ vazio ] [ vazio ]
Nível 3    [ REAL ]  [ REAL ]  [ vazio ]
Nível 2    [ PROA ]  [ PROA ]  [ PROA ]
Nível 1    [ ... ]   [ ... ]   [ ... ]
```

## 11.2 Informações possíveis no mapa

Cada posição poderá mostrar:

- produto;
- marca;
- cor;
- medida;
- número de caixas;
- capacidade;
- ocupação;
- alerta de divergência.

## 11.3 Estados visuais

Exemplo:

- livre;
- ocupada;
- parcialmente ocupada;
- lotada;
- bloqueada;
- divergente;
- aguardando conferência.

---

# 12. Fluxo de retirada para expedição

Funcionário localiza o produto pela busca ou mapa.

Exemplo:

```text
REAL / Azul / 35 mm
→ A03 / Nível 2 / Posição 4
```

Chegando ao local:

1. escaneia a caixa;
2. seleciona **Transferir**;
3. seleciona **Expedição**;
4. confirma.

O sistema registra:

```text
CX-000152
SUP-A-03-02-04
        ↓
EXPEDIÇÃO
06/10/2026 10:42
Operador: usuário X
```

A posição fica automaticamente disponível no mapa.

---

# 13. Leitura por celular

O sistema deverá funcionar no navegador do celular.

Idealmente como PWA, permitindo adicionar um ícone na tela inicial.

Principais funções mobile:

- leitor de QR Code;
- consulta de caixa;
- consulta de produto;
- armazenar;
- transferir;
- inventariar;
- buscar localização;
- confirmar movimentação;
- visualizar mapa simplificado.

## 13.1 Tela após leitura da caixa

```text
REAL
Fita Azul
35 x 0,45 mm

Caixa: CX-000152
10 rolos
200 m

Local atual:
SUP-A-03-02-04

[ CONSULTAR ]
[ TRANSFERIR ]
[ INVENTÁRIO ]
[ AJUSTAR ]
```

Importante:

**Escanear QR Code nunca deverá movimentar estoque automaticamente.**

A leitura apenas identifica a caixa. A alteração precisa de ação explícita.

---

# 14. Interface desktop

A versão desktop será a central administrativa.

Menu inicial sugerido:

```text
Dashboard
Recebimentos
Produtos
Caixas
Mapa do estoque
Movimentações
Inventário
Etiquetas
Localizações
Usuários
Configurações
```

---

# 15. Dashboard

Indicadores iniciais:

- caixas no estoque superior;
- caixas na expedição;
- produtos diferentes;
- movimentações do dia;
- recebimentos recentes;
- posições ocupadas;
- posições livres;
- divergências de inventário;
- caixas sem localização;
- movimentações recentes.

---

# 16. Cadastro de produtos

Funções:

- criar;
- editar;
- duplicar;
- desativar;
- pesquisar;
- importar futuramente;
- associar códigos de fornecedor.

Duplicação será importante para variações.

Exemplo:

```text
Duplicar REAL / Azul / 35 mm
→ alterar apenas largura para 64 mm
```

---

# 17. Cadastro de etiquetas

Tela de geração rápida:

```text
Marca: REAL
Cor: Azul
Largura: 35 mm
Espessura: 0,45 mm
Rolo: 20 m
Rolos/caixa: 10
Caixas recebidas: 8

[ GERAR 8 ETIQUETAS ]
```

Sistema gera os IDs automaticamente.

Depois:

```text
[ VISUALIZAR ]
[ IMPRIMIR ]
[ BAIXAR PDF ]
```

---

# 18. Histórico e auditoria

Nenhuma movimentação deve simplesmente desaparecer.

Registrar sempre:

- usuário;
- caixa;
- origem;
- destino;
- data;
- hora;
- ação;
- observação;
- motivo de correção.

Correções administrativas deverão gerar nova movimentação, nunca apagar o histórico original.

---

# 19. Inventário físico

O sistema deverá possuir um modo específico de inventário.

## 19.1 Inventário por localização

Funcionário abre:

```text
Prateleira A03
```

Escaneia todas as caixas encontradas.

Sistema compara:

```text
Esperadas: 24
Encontradas: 23
Divergência: -1
```

## 19.2 Inventário por produto

Exemplo:

```text
REAL Azul 35
Sistema: 12 caixas
Encontrado: 11 caixas
```

## 19.3 Inventário rotativo

Possibilidade futura:

- determinadas prateleiras por semana;
- determinadas marcas;
- produtos de maior giro.

---

# 20. Status possíveis de uma caixa

Sugestão inicial:

```text
RECEBIDA
AGUARDANDO_ENDERECAMENTO
ARMAZENADA
EM_TRANSFERENCIA
EXPEDICAO
ABERTA
VAZIA
BLOQUEADA
DIVERGENTE
BAIXADA
```

Nem todos precisam existir no MVP.

---

# 21. Regras operacionais principais

1. Cada caixa possui apenas um ID ativo.
2. Um QR Code identifica apenas uma caixa.
3. Uma caixa possui apenas uma localização atual.
4. Toda troca de localização gera movimentação.
5. Leitura não gera movimentação sozinha.
6. Correções são auditadas.
7. Produtos desativados continuam visíveis no histórico.
8. Caixas antigas nunca reutilizam códigos.
9. Endereços físicos também possuem identificadores únicos.
10. O estoque físico é independente do ERP.

---

# 22. Segurança contra erros

O sistema deverá impedir ou alertar sobre situações como:

- caixa sendo armazenada em duas posições;
- movimentação de caixa inexistente;
- produto sem cadastro;
- localização inválida;
- leitura duplicada;
- tentativa de baixa acidental;
- alteração sem usuário identificado;
- reuso de ID;
- caixas sem localização por muito tempo;
- posição acima da capacidade configurada.

---

# 23. Tecnologia sugerida

A escolha final poderá ser feita durante a fase técnica.

Arquitetura sugerida:

### Front-end

- React;
- TypeScript;
- Vite;
- interface responsiva;
- PWA.

### Back-end / banco

Opções:

- Supabase;
- PostgreSQL;
- API Node/TypeScript, se necessário.

Supabase é uma boa opção inicial por oferecer:

- banco PostgreSQL;
- autenticação;
- realtime;
- storage;
- permissões;
- baixo custo inicial.

### QR Code

- geração via biblioteca;
- leitura pela câmera do navegador;
- fallback para digitação manual.

### Impressão

Primeiro estágio:

- geração PDF;
- impressão convencional.

Posteriormente:

- impressora térmica;
- layouts específicos;
- impressão direta.

---

# 24. Arquitetura de alto nível

```text
┌─────────────────────┐
│      DESKTOP        │
│ Cadastro / Gestão   │
└─────────┬───────────┘
          │
          │
┌─────────▼───────────┐
│     APLICAÇÃO       │
│ React / PWA         │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   API / SUPABASE    │
│ Auth + Database     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│     BANCO FÍSICO    │
│ Produtos / Caixas   │
│ Locais / Histórico  │
└─────────────────────┘

          ▲
          │
┌─────────┴───────────┐
│       CELULAR       │
│ Scanner / Consulta  │
│ Movimentação        │
└─────────────────────┘
```

O ERP oficial permanece fora desta arquitetura.

---

# 25. Estrutura inicial de banco de dados

Tabelas conceituais:

```text
users
products
brands
colors
boxes
locations
movements
receipts
receipt_items
inventory_sessions
inventory_reads
label_templates
system_settings
```

Relacionamentos principais:

```text
products 1 ─── N boxes
boxes    1 ─── N movements
locations 1 ─ N movements
receipts 1 ── N boxes
users    1 ─── N movements
```

---

# 26. MVP — primeira versão utilizável

O MVP deverá resolver o núcleo operacional sem tentar implementar tudo de uma vez.

## Funções obrigatórias

### Produtos

- cadastro;
- edição;
- pesquisa.

### Caixas

- criação;
- ID único;
- QR Code;
- consulta.

### Etiquetas

- geração;
- visualização;
- impressão.

### Localizações

- cadastro da estrutura física;
- QR Code por localização.

### Recebimento

- selecionar produto;
- informar número de caixas;
- gerar caixas;
- imprimir etiquetas.

### Scanner

- caixa;
- posição;
- movimentação.

### Estoque

- localização atual;
- busca;
- mapa visual básico.

### Histórico

- movimentações.

---

# 27. Funcionalidades que NÃO precisam entrar no MVP

Podem ser deixadas para versões posteriores:

- integração com ERP;
- controle fiscal;
- emissão de nota;
- financeiro;
- integração com vendas;
- previsão de demanda;
- IA;
- controle avançado de caixas abertas;
- cálculo automático de reposição;
- dashboards complexos;
- BI;
- integração com coletores industriais;
- RFID;
- integração com impressora térmica específica.

---

# 28. Roadmap de desenvolvimento

## Fase 0 — Planejamento

**Objetivo:** fechar regras antes de programar.

Entregas:

- documento mestre;
- escopo;
- arquitetura conceitual;
- fluxo operacional;
- definição de entidades;
- definição de responsabilidades.

**Status:** em andamento.

---

## Fase 1 — Padronização de dados

Objetivo:

Criar o padrão oficial de cadastro das fitas.

Entregas:

- campos obrigatórios;
- nomenclatura;
- código interno;
- padrão de medidas;
- marcas iniciais;
- cores;
- regras de produto;
- planilha inicial de catálogo.

Critério de conclusão:

Um funcionário consegue cadastrar qualquer fita Real ou Proadec sem dúvida sobre onde colocar cada informação.

---

## Fase 2 — Etiqueta GMAD

Objetivo:

Criar o layout definitivo da etiqueta.

Entregas:

- dimensões físicas;
- hierarquia visual;
- QR Code;
- código da caixa;
- layout Real;
- layout Proadec usando o mesmo padrão;
- testes de impressão;
- testes de leitura por câmera.

Critério de conclusão:

Etiqueta impressa, legível, resistente ao uso e reconhecida por celular.

---

## Fase 3 — Modelo físico do estoque

Objetivo:

Mapear o estoque real.

Entregas:

- áreas;
- corredores;
- prateleiras;
- níveis;
- posições;
- códigos físicos;
- QR Codes dos endereços;
- capacidade das posições.

Critério de conclusão:

Toda posição de armazenamento possui um endereço único.

---

## Fase 4 — Fundação técnica

Objetivo:

Criar o projeto de software.

Entregas:

- repositório;
- front-end;
- banco;
- autenticação;
- estrutura do projeto;
- ambiente local;
- configuração inicial.

Critério de conclusão:

Aplicação abre em desktop e celular e conecta ao banco.

---

## Fase 5 — Cadastro de produtos

Entregas:

- CRUD de produtos;
- busca;
- filtros;
- validações;
- duplicação de produto;
- status ativo/inativo.

---

## Fase 6 — Cadastro de localizações

Entregas:

- áreas;
- prateleiras;
- níveis;
- posições;
- QR Codes;
- tela de administração.

---

## Fase 7 — Recebimento e etiquetas

Entregas:

- fluxo de recebimento;
- geração automática de caixas;
- geração de IDs;
- etiqueta;
- PDF;
- impressão em lote;
- reimpressão.

---

## Fase 8 — Scanner mobile

Entregas:

- leitura QR;
- consulta;
- armazenamento;
- transferência;
- confirmação;
- mensagens de erro;
- histórico.

---

## Fase 9 — Mapa visual

Entregas:

- visão por área;
- visão por prateleira;
- ocupação;
- conteúdo;
- busca;
- destaque do endereço encontrado.

---

## Fase 10 — Expedição

Entregas:

- transferência estoque → expedição;
- visualização de caixas na expedição;
- histórico;
- retorno ao estoque;
- estrutura inicial para caixas abertas.

---

## Fase 11 — Inventário

Entregas:

- sessão de inventário;
- leitura por posição;
- comparação esperado/encontrado;
- divergências;
- ajustes controlados.

---

## Fase 12 — Dashboard e relatórios

Entregas:

- caixas por área;
- ocupação;
- movimentações;
- recebimentos;
- divergências;
- histórico exportável.

---

## Fase 13 — Testes operacionais

Objetivo:

Validar com uso real.

Cenários:

- recebimento grande;
- armazenamento simultâneo;
- busca;
- retirada;
- transferência;
- caixa errada;
- leitura duplicada;
- internet instável;
- QR danificado;
- inventário.

---

## Fase 14 — Implantação

Entregas:

- ambiente de produção;
- cadastro real;
- impressão dos QRs das posições;
- treinamento;
- documentação;
- rotina de backup;
- checklist operacional.

---

# 29. Ordem recomendada de implantação física

Não é recomendável etiquetar todo o estoque de uma vez no primeiro teste.

Sugestão:

### Piloto

- escolher 1 marca;
- escolher 1 ou 2 prateleiras;
- cadastrar 20 a 50 caixas;
- testar durante alguns dias.

Depois expandir:

```text
Piloto
↓
Real completa
↓
Proadec completa
↓
Demais áreas
```

Isso reduz risco operacional.

---

# 30. Estratégia para internet instável

O estoque pode possuir pontos com sinal ruim.

Planejar desde o início:

- PWA;
- interface leve;
- cache básico;
- mensagens claras de conexão;
- nenhuma movimentação considerada confirmada antes do servidor registrar;
- possibilidade futura de fila offline controlada.

O modo offline completo deve ser considerado uma evolução, não requisito do primeiro MVP.

---

# 31. Impressão e materiais

Itens a validar fisicamente:

- tamanho da etiqueta;
- impressora disponível;
- tipo de papel;
- adesivo;
- durabilidade;
- resistência à poeira;
- leitura de QR em caixas armazenadas;
- distância de leitura do texto.

O sistema deve permitir alterar o template sem alterar os dados.

---

# 32. Padrões de UX

O sistema será utilizado em ambiente operacional.

Portanto:

- botões grandes no celular;
- poucos passos;
- contraste alto;
- textos objetivos;
- evitar menus profundos;
- confirmação apenas em ações importantes;
- mensagens claras;
- busca tolerante;
- foco em velocidade.

Exemplo ruim:

```text
Confirma a operação de transferência logística da unidade selecionada?
```

Exemplo ideal:

```text
Mover esta caixa para EXPEDIÇÃO?

[ CANCELAR ] [ CONFIRMAR ]
```

---

# 33. Logs e rastreabilidade

Para cada caixa será possível responder:

```text
Quando chegou?
Quem recebeu?
Onde foi armazenada?
Quantas vezes mudou de lugar?
Quando foi para a expedição?
Quem realizou a transferência?
Foi devolvida?
Foi ajustada?
```

Exemplo:

```text
06/10 08:31  Recebida
06/10 09:04  Armazenada em A03-02-04
08/10 14:22  Transferida para Expedição
```

---

# 34. Métricas de sucesso

O projeto poderá ser considerado bem-sucedido quando:

- produtos forem encontrados sem procura manual;
- o sistema indicar a posição correta;
- recebimentos forem etiquetados rapidamente;
- movimentações forem registradas no momento em que acontecem;
- o mapa representar o estoque real;
- o tempo de reposição cair significativamente;
- inventários forem mais rápidos;
- divergências forem identificadas com facilidade;
- o almoxarifado conseguir operar sem depender da memória de uma pessoa específica.

---

# 35. Riscos principais

## 35.1 Falta de disciplina de leitura

Se funcionários moverem caixas sem escanear, o mapa ficará incorreto.

Mitigação:

- tornar leitura simples;
- criar rotina operacional;
- QR nas próprias posições;
- treinamento.

## 35.2 Cadastro inconsistente

Exemplo:

```text
Azul
Azul 01
AZUL
azul real
```

Mitigação:

- listas fechadas;
- catálogo padronizado;
- campos estruturados.

## 35.3 Etiqueta ruim

QR pequeno ou impressão ruim pode comprometer a operação.

Mitigação:

- testes físicos antes da implantação.

## 35.4 Mapa desatualizado

Mitigação:

- toda movimentação altera o mapa automaticamente.

## 35.5 Sistema complexo demais

Mitigação:

- MVP enxuto;
- foco na operação real;
- testar com usuários do almoxarifado.

---

# 36. Decisões já definidas

As seguintes decisões devem ser tratadas como regras do projeto até nova revisão:

1. O ERP oficial da GMAD permanece independente.
2. O novo sistema controla o estoque físico.
3. O foco inicial são caixas fechadas de fitas.
4. Real e Proadec serão as primeiras marcas.
5. Cada caixa possuirá QR Code individual.
6. Cada localização física poderá possuir QR Code.
7. O celular será uma ferramenta operacional central.
8. O desktop será a central administrativa.
9. O mapa visual é uma função central, não acessória.
10. O QR não realizará baixa automática apenas por ser lido.
11. O sistema registrará histórico de movimentações.
12. O desenvolvimento será feito por etapas.

---

# 37. Próximos passos imediatos

Antes de iniciar programação:

## Passo 1

Definir todos os campos oficiais do produto.

## Passo 2

Criar uma tabela de equivalência entre etiquetas Real e Proadec.

Exemplo:

| Campo GMAD | Real | Proadec |
|---|---|---|
| Marca | Real | Proadec |
| Cor | campo do fabricante | Descrição da cor |
| Largura | Medidas/Size | Largura |
| Espessura | Medidas/Size | Espessura |
| Rolos/caixa | Quant. | Nr. Rolos |
| m/rolo | Quantidade | Comp./Rolo |
| Total | Quant. total | Comprimento total |

## Passo 3

Definir o layout físico da etiqueta.

## Passo 4

Medir e mapear uma área piloto do estoque.

## Passo 5

Definir o padrão oficial de endereçamento.

## Passo 6

Criar o catálogo inicial de produtos.

## Passo 7

Somente então iniciar a implementação do software.

---

# 38. Checklist antes do desenvolvimento

- [ ] Campos de produto definidos
- [ ] Unidades padronizadas
- [ ] Marcas iniciais cadastradas
- [ ] Cores padronizadas
- [ ] Código interno aprovado
- [ ] Código de caixa aprovado
- [ ] Etiqueta aprovada
- [ ] Tamanho da etiqueta definido
- [ ] Impressora testada
- [ ] QR testado
- [ ] Estrutura física medida
- [ ] Padrão de endereçamento aprovado
- [ ] Área piloto escolhida
- [ ] Fluxo de recebimento validado
- [ ] Fluxo de retirada validado
- [ ] Perfis de usuário definidos
- [ ] Tecnologia definida

---

# 39. Visão de longo prazo

Depois de consolidar as fitas, a mesma arquitetura poderá ser utilizada para outros produtos do estoque.

Exemplos:

- ferragens;
- acessórios;
- caixas de componentes;
- ferramentas;
- produtos de alto volume;
- materiais com múltiplas variações.

O sistema deverá, portanto, nascer preparado para expansão, mas sem aumentar a complexidade do MVP.

---

# 40. Resumo executivo

O projeto será um **Sistema de Controle de Estoque Físico e Endereçamento Interno da GMAD Rio Preto**.

Ele não substituirá o ERP.

Seu papel será conectar quatro elementos:

```text
PRODUTO
   ↓
CAIXA
   ↓
LOCALIZAÇÃO
   ↓
MOVIMENTAÇÃO
```

A etiqueta padronizada identifica.

O QR Code conecta o objeto físico ao sistema.

O endereço identifica a posição.

O mapa mostra onde está.

O histórico registra o que aconteceu.

O celular executa a operação no estoque.

O computador administra o sistema.

Essa será a base de todo o desenvolvimento.

---

# 41. Controle de versões deste documento

Este arquivo deve funcionar como **documento mestre do projeto**.

A cada decisão estrutural importante, atualizar este documento.

Sugestão de versões:

```text
1.0 — planejamento inicial
1.1 — definição de produto e etiqueta
1.2 — definição do mapa físico
1.3 — arquitetura técnica
2.0 — MVP concluído
```

Mudanças importantes devem ser registradas em uma seção de changelog futura.

---

## Documento encerrado — Versão 1.0

**Próxima etapa recomendada:** definição formal da Fase 1 — Cadastro Padronizado de Produtos + Especificação da Etiqueta GMAD.

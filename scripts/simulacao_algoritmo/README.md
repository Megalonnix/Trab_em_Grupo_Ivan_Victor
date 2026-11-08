# Simulação do Algoritmo Genético — Flappy Bird

Este é o **projeto prático** do Trabalho em Grupo de Computação Evolucionária.
Implementa, em HTML/CSS/JavaScript puro (sem frameworks, sem instalação), um
clone simples de Flappy Bird no qual **a população de pássaros aprende a jogar
sozinha** por meio de um Algoritmo Genético.

A parte teórica (todas as fórmulas, deduções e exemplos numéricos) está no
notebook `../explicacao_teorica/FASE0_MATEMATICA.ipynb`. Este README é sobre o
**código** — não sobre a matemática.

---

## 1. Para quem nunca programou em HTML/JS

O projeto usa **três linguagens**, cada uma com uma responsabilidade clara:

| Linguagem | Serve para | Onde aparece |
|-----------|-----------|--------------|
| **HTML** | Definir a **estrutura** da página: onde ficam o jogo, o painel e o gráfico | `index.html` |
| **CSS** | Definir o **visual**: cores, tamanhos, posições | `style.css` |
| **JavaScript (JS)** | Definir o **comportamento**: física do pássaro, decisões, algoritmo genético, atualização da tela | `*.js` |

Todo o JS roda **dentro do navegador**. Não há servidor, não há `npm install`,
não há build. Basta abrir o `index.html` no Chrome, Firefox ou Edge.

---

## 2. Estrutura de arquivos

```
simulacao_algoritmo/
├── index.html         ← estrutura da página (canvas do jogo + painel + gráfico)
├── style.css          ← visual da página
├── config.js          ← todos os parâmetros em um só lugar
├── brain.js           ← o "cérebro" do pássaro (genoma + decisão)
├── game.js            ← o "mundo": pássaro, canos, física, colisão
├── evolution.js       ← o Algoritmo Genético (seleção, cruzamento, mutação)
├── ui.js              ← painel HTML, gráfico de convergência, exportação .csv
└── main.js            ← orquestrador: o loop principal que liga tudo
```

**Regra de ouro:** cada arquivo tem **uma única responsabilidade**. Se você
precisar mudar uma fórmula do GA, mexe em `evolution.js`. Se precisar mudar a
gravidade, mexe em `config.js`. Se precisar mudar a cor do pássaro, mexe em
`style.css`. Nada fica espalhado.

---

## 3. Responsabilidade de cada arquivo (em detalhe)

### 3.1 `index.html` — estrutura da página

**O que é:** o "esqueleto" da página. Define **o que existe** na tela.

**O que faz:**
- Declara a estrutura: um `<canvas>` para o jogo, uma `<div>` de painel com
  informações (geração atual, melhor fitness, etc.) e um segundo `<canvas>`
  para o gráfico de convergência.
- Importa os arquivos CSS e JS na ordem correta (config → brain → game →
  evolution → ui → main).
- Não contém lógica. Só estrutura.

**O que NÃO faz:** não desenha o jogo, não calcula nada, não decide nada.

**Quem depende dele:** nada. Ele é o ponto de entrada.

---

### 3.2 `style.css` — visual

**O que é:** a folha de estilo.

**O que faz:**
- Define tamanho dos canvases, fontes do painel, cores de fundo, bordas.
- Centraliza o layout na tela.
- Nada de lógica.

**O que NÃO faz:** não controla comportamento, não desenha pássaros.

**Quem depende dele:** `index.html` (via `<link>`).

---

### 3.3 `config.js` — parâmetros

**O que é:** um arquivo que **só define constantes**. Nada de funções, nada de
lógica. É a "mesa de controle" do projeto.

**O que faz:**
- Define **parâmetros do jogo**: gravidade (`a`), velocidade do pulo
  (`vSalto`), altura e largura do canvas, tamanho do pássaro, tamanho do vão
  entre canos, velocidade dos canos.
- Define **parâmetros do GA**: tamanho da população (`N`), número de elites
  (`E`), tamanho do torneio (`k`), taxa de cruzamento (`pc`), probabilidade de
  mutação (`pm`), desvio da mutação (`sigma`), limite dos genes (`-5` a `5`),
  máximo de gerações (`G`), meta de canos (`Cmax`), gerações sem melhora para
  estagnar (`K`).

**O que NÃO faz:** não executa nada. Só expõe valores para os outros arquivos
usarem.

**Quem depende dele:** `game.js`, `brain.js`, `evolution.js`, `ui.js`,
`main.js`.

**Por que existe:** se todos os números estivessem espalhados no código, mudar
um experimento viraria caça ao tesouro. Aqui está tudo junto e comentado.

---

### 3.4 `brain.js` — o "cérebro" do pássaro

**O que é:** o módulo que define **como um genoma toma decisões**.

**O que faz:**
- `genomaAleatorio()` — cria um vetor de 6 números em `[-1, 1]`.
- `sigmoide(z)` — a função de ativação (fórmula da seção B.4 do notebook).
- `decidir(genoma, estado)` — recebe um genoma e o estado do jogo
  (`y`, `vy`, `dx`, `yVao`) e devolve `true` (pular) ou `false` (não pular).
  Internamente: normaliza as 5 entradas, calcula `z`, aplica sigmoide,
  compara com 0.5.

**O que NÃO faz:** não move o pássaro, não gera canos, não calcula fitness. Só
**decide**.

**Quem depende dele:** `game.js` (usa `decidir` a cada frame),
`evolution.js` (usa `genomaAleatorio` para inicializar a população).

---

### 3.5 `game.js` — o "mundo"

**O que é:** o módulo que simula **a física e o ambiente** do jogo.

**O que faz:**
- Define a classe `Passaro`: posição (`y`), velocidade (`vy`), genoma, fitness,
  estado vivo/morto. Métodos `aplicarGravidade()`, `pular()`, `mover()`,
  `colidiuComTetoOuChao()`, `resetar()`.
- Define a classe `Cano`: posição (`x`), vão (`yVaoSup`, `yVaoInf`).
  Métodos `mover()`, `saiuDaTela()`.
- Define a função `criarCano()`, `verificarColisaoComCano(passaro, cano)`.
- Define a função `atualizarFitness(passaro)` — soma canos ultrapassados e
  distância percorrida.

**O que NÃO faz:** não decide se o pássaro pula (isso é `brain.js`), não
seleciona pais (isso é `evolution.js`), não desenha (isso é `main.js`).

**Quem depende dele:** `main.js` (chama a física a cada frame).

---

### 3.6 `evolution.js` — o Algoritmo Genético

**O que é:** o módulo que executa **uma geração inteira** do GA.

**O que faz:**
- `avaliarPopulacao(populacao)` — pega os genomas vivos/mortos e calcula
  fitness final.
- `ordenarPorFitness(populacao)` — ordena decrescente.
- `torneio(populacaoOrdenada, k)` — escolhe um pai por torneio.
- `cruzarUniforme(paiA, paiB)` — cruzamento uniforme (seção F.2).
- `mutar(filho, pm, sigma)` — mutação gaussiana + clipping (seções G.2 e G.3).
- `construirNovaGeracao(populacaoAtual)` — copia os `E` elites, gera filhos
  até preencher `N`, devolve a nova população.

**O que NÃO faz:** não simula física, não desenha, não decide pulo individual.
Só aplica o GA **sobre os genomas**.

**Quem depende dele:** `main.js` (chama `construirNovaGeracao` ao fim de cada
geração).

---

### 3.7 `ui.js` — painel, gráfico e exportação

**O que é:** o módulo que cuida de **tudo que o usuário vê** além do jogo.

**O que faz:**
- `atualizarPainel(estado)` — escreve no HTML a geração atual, melhor fitness,
  fitness média, número de vivos, etc.
- `desenharGrafico(historico)` — desenha no segundo canvas a curva de melhor
  fitness e fitness média ao longo das gerações.
- `exportarCSV(historico)` — gera um arquivo `.csv` com uma linha por
  indivíduo por geração e dispara o download.
- `desenharCenario(ctx, passaros, canos)` — desenha o fundo, os canos e os
  pássaros no canvas principal.

**O que NÃO faz:** não calcula física, não decide pulos, não aplica GA.

**Quem depende dele:** `main.js` (chama `desenharCenario` a cada frame,
`atualizarPainel` a cada geração, `desenharGrafico` ao fim de cada geração).

---

### 3.8 `main.js` — orquestrador

**O que é:** o "maestro". Liga todos os módulos e roda o loop.

**O que faz:**
- Inicializa a população inicial (`N` genomas aleatórios via
  `brain.genomaAleatorio`).
- Roda o loop principal via `requestAnimationFrame`:
  1. Para cada pássaro vivo, chama `brain.decidir` e aplica a física via
     `game.js`.
  2. Move canos, verifica colisões, marca pássaros mortos.
  3. Chama `ui.desenharCenario`.
  4. Se **todos** os pássaros morreram → chama
     `evolution.construirNovaGeracao`, registra no histórico, chama
     `ui.desenharGrafico` e `ui.atualizarPainel`, reseta o jogo para a nova
     geração.
  5. Verifica critérios de parada (meta de canos, `G` gerações, estagnação).

**O que NÃO faz:** não implementa física, não implementa GA, não desenha. Só
**coordena**.

**Quem depende dele:** `index.html` (é o último `<script>` carregado).

---

## 4. Como executar

1. Abra a pasta `simulacao_algoritmo/`.
2. Dê **duplo clique** em `index.html`.
3. O jogo começa automaticamente no navegador.

Não precisa de servidor, `npm`, `pip`, nem nada. Funciona offline.

**Navegadores testados:** Chrome, Edge e Firefox (versões atuais).

---

## 5. Como acompanhar a evolução

Ao rodar o `index.html`, você verá três regiões na tela:

- **Canvas grande (esquerda):** os pássaros jogando em tempo real. Pássaros
  mortos ficam acinzentados; os vivos, coloridos.
- **Painel (direita superior):** geração atual, melhor fitness da geração,
  fitness média, número de vivos, canos do melhor pássaro.
- **Canvas do gráfico (direita inferior):** curva de convergência — a linha
  verde é o melhor fitness por geração, a azul é a média.

Depois de **~20 a 40 gerações**, você verá um pássaro ultrapassar 50 canos com
facilidade. Isso indica que o GA convergiu.

---

## 6. Como ajustar parâmetros

Todos os parâmetros estão em `config.js`, comentados. Exemplos:

- **Quer que o jogo fique mais fácil?** Reduza `a` (gravidade) ou aumente
  `vSalto` (velocidade do pulo).
- **Quer uma população maior?** Aumente `N` (ex.: de 50 para 100). Mais
  diversidade, mais lento.
- **Quer mais exploração?** Aumente `pm` ou `sigma`.
- **Quer menos exploração (refinar)?** Reduza `pm` ou `sigma`.
- **Quer elitismo mais forte?** Aumente `E` (mas não mais que 10% de `N`).

---

## 7. Como exportar os dados

Clique no botão **"Exportar CSV"** no painel. Será baixado um arquivo
`resultados.csv` com o seguinte formato:

```
geracao,individuo,fitness,canos,distancia,w1,w2,w3,w4,w5,b
1,0,3500,5,3000,0.42,-0.75,0.61,-0.14,0.88,0.05
1,1,2800,4,2400,0.31,-0.62,0.55,-0.10,0.72,0.02
...
```

Esse arquivo pode ser aberto no Excel, LibreOffice ou lido em Python (com
`pandas.read_csv`) para gerar gráficos adicionais para a apresentação.

---

## 8. Ordem de leitura recomendada para entender o código

Se você vai apresentar o projeto e quer entender como tudo funciona, leia
nesta ordem:

1. **`config.js`** — o que dá para ajustar.
2. **`brain.js`** — como o pássaro decide (é a ponte com a teoria).
3. **`game.js`** — como o mundo funciona.
4. **`evolution.js`** — o coração do GA.
5. **`main.js`** — como tudo é orquestrado.
6. **`ui.js`** — como a tela é atualizada.
7. **`index.html` + `style.css`** — a camada mais superficial.

Cada um desses arquivos tem comentários explicando o que faz e referenciando a
seção correspondente do `FASE0_MATEMATICA.ipynb`.

---

## 9. Relação com a teoria

O projeto segue **exatamente** o notebook `FASE0_MATEMATICA.ipynb`. Mapa:

| Seção do notebook | Onde está no código |
|-------------------|---------------------|
| B.1 Genoma | `brain.js` → `genomaAleatorio()` |
| B.2 Entradas normalizadas | `brain.js` → `decidir()` |
| B.3 Soma ponderada $z$ | `brain.js` → `decidir()` |
| B.4 Sigmoide | `brain.js` → `sigmoide()` |
| B.5 Regra de decisão | `brain.js` → `decidir()` |
| C.2 Física | `game.js` → `Passaro.aplicarGravidade`, `Passaro.pular` |
| C.3 Colisão | `game.js` → `verificarColisao` |
| D.2 Fitness | `game.js` → `atualizarFitness()` |
| E.2 Elitismo | `evolution.js` → `construirNovaGeracao()` |
| E.3 Torneio | `evolution.js` → `torneio()` |
| F.2 Cruzamento uniforme | `evolution.js` → `cruzarUniforme()` |
| G.2 Mutação gaussiana | `evolution.js` → `mutar()` |
| G.3 Clipping | `evolution.js` → `mutar()` |
| H.1 Montagem de geração | `evolution.js` → `construirNovaGeracao()` |
| H.3 Critérios de parada | `main.js` → `verificarParada()` |

Se durante a arguição o professor perguntar "onde está a fórmula X?", você vai
direto nessa tabela.
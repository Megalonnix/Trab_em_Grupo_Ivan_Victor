# Simulação do Algoritmo Genético — Flappy Bird

Este é o **projeto prático** do Trabalho em Grupo de Computação Evolucionária.
Implementa, em HTML/CSS/JavaScript puro (sem frameworks, sem instalação), um
clone simples de Flappy Bird com uma demonstração visual de algoritmo
genético. A evolução no navegador serve para ilustrar o processo; o treino
offline em C++ é o fluxo recomendado para obter e validar o campeão.

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

Todo o JS roda **dentro do navegador**. Não há Web Worker, `npm install` ou
build. A evolução no navegador é uma demonstração visual; para treinar e obter
o campeão usado na apresentação, utilize o treinador C++ descrito em
[`treino_cpp/README.md`](treino_cpp/README.md).

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
  (`y`, `vy`, distância assinada até a borda do cano e `yVao`) e devolve
  `true` (pular) ou `false` (não pular). Internamente, calcula cinco entradas
  normalizadas: altura, velocidade vertical, tempo assinado até o cano,
  altura do vão e posição vertical relativa ao centro do vão. Em seguida,
  calcula `z`, aplica sigmoide e compara com 0.5.

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
- `exportarCSV(historico)` — gera um arquivo `.csv` com uma linha por geração
  (melhor indivíduo, fitness média e genoma campeão) e dispara o download.
- `desenharCenario(ctx, passaros, canos)` — desenha o fundo, os canos e os
  pássaros no canvas principal.

**O que NÃO faz:** não calcula física, não decide pulos, não aplica GA.

**Quem depende dele:** `main.js` (chama `desenharCenario` a cada frame,
`atualizarPainel` a cada geração, `desenharGrafico` ao fim de cada geração).

---

### 3.8 `main.js` — orquestrador da demonstração

**O que é:** o "maestro". Liga todos os módulos e roda o loop.

**O que faz:**
- Inicializa a população inicial (`N` genomas aleatórios via
  `brain.genomaAleatorio`).
- Roda a demonstração com `requestAnimationFrame`, sem Web Worker.
- Avalia todos os indivíduos nos mesmos 32 cenários e usa uma única sequência
  comum de canos em cada cenário. A população é mostrada simultaneamente: cada
  pássaro tem seu próprio estado e genoma, mas observa o mesmo mundo durante
  aquele episódio. Os que colidem ficam visíveis em cinza até o próximo
  cenário. A fitness é a média dos cenários; a meta de 100 canos exige
  atingir pelo menos 100 em cada cenário de treino.
- Ao terminar a geração, chama `evolution.construirNovaGeracao`, registra o
  histórico e verifica os limites de gerações e estagnação. A meta da versão
  JS é verificada nos 32 cenários de treino; diferentemente do C++, ela não
  executa a validação independente em 20 cenários.
- A demonstração é limitada pelo navegador; ela serve para visualizar os
  conceitos, não para substituir o treinamento offline.

**O que NÃO faz:** não implementa física, não implementa GA, não desenha. Só
**coordena**.

**Quem depende dele:** `index.html` (é o último `<script>` carregado).

---

## 4. Como executar

1. Abra `index.html` no Chrome, Firefox ou Edge. Como não há mais Web Worker,
   o arquivo pode ser aberto diretamente.
2. Para evitar restrições locais do navegador, também é possível iniciar um
   servidor na pasta `simulacao_algoritmo/`:

   ```sh
   python -m http.server 8000
   ```

   Acesse `http://localhost:8000/`.
3. A evolução demonstrativa começa automaticamente. Os pássaros da população
   percorrem juntos o mesmo cenário e a mesma sequência de canos. Os botões de
   velocidade controlam a quantidade de passos tentada por quadro, limitada
   para manter a interface responsiva.

Para treinar um campeão para a demonstração, siga as instruções em
[`treino_cpp/README.md`](treino_cpp/README.md), depois carregue o JSON no botão
**"Carregar campeão"** e clique em **"Rodar campeão"**.

Não precisa de servidor, `npm`, `pip`, nem nada. Funciona offline.

**Navegadores testados:** Chrome, Edge e Firefox (versões atuais).

---

## 5. Como acompanhar a evolução

Ao rodar o `index.html`, você verá três regiões na tela:

- **Canvas grande (esquerda):** todos os pássaros da população são desenhados
  com transparência no mesmo cenário e seguem a mesma sequência de canos.
  Pássaros cinza já morreram naquele cenário; a população reinicia junta no
  próximo. Isso torna visível a comparação entre genomas sob as mesmas
  condições.
- **Painel (direita superior):** geração atual, melhor fitness global,
  cenário atual de treino, número de pássaros vivos e canos do melhor pássaro.
  Uma geração só termina depois que a população conclui os 32 cenários; por
  isso, o número da geração pode ficar igual enquanto o cenário avança.
- **Canvas do gráfico (direita inferior):** curva de convergência — a linha
  verde é o melhor fitness por geração, a azul é a média.

O tempo de convergência depende dos números aleatórios e do navegador. A
demonstração avalia 32 cenários comuns, mas não executa a validação de 20
cenários do C++; use o programa C++ para treinar e confirmar a meta de 100
canos.

## Roteiro para treinar em C++ e apresentar o campeão

1. Abra um PowerShell na raiz do repositório e entre na pasta do treinador:

   ```powershell
   Set-Location scripts\simulacao_algoritmo\treino_cpp
   ```

2. Compile o fonte com GCC/MinGW e execute o treinamento:

   ```powershell
   g++ -O2 -std=c++17 treinar.cpp -o treinar.exe
   .\treinar.exe
   ```

   O processo roda offline no terminal e cria ou substitui
   `campeao.json`. Para confirmar que o campeão atingiu a meta, confira se o
   terminal informa **META ATINGIDA**; caso contrário, ele é apenas o melhor
   resultado encontrado, sem aprovação nos 20 cenários de validação.

3. Abra `index.html` no navegador. Clique em **Carregar campeão**, selecione
   `treino_cpp\campeao.json` e clique em **Rodar campeão**. O navegador roda o
   genoma do arquivo; não é necessário treinar de novo no browser.

Na palestra, deixe a simulação visual da população como ilustração e use
**Rodar campeão** para mostrar o indivíduo treinado. A versão JS não importa o
histórico/população produzidos pelo C++; apenas executa o genoma campeão
exportado.

---

## 6. Como ajustar parâmetros

Todos os parâmetros estão em `config.js`, comentados. Exemplos:

- **Quer que o jogo fique mais fácil?** Reduza `GRAVIDADE` ou aumente
  `V_SALTO`.
- **Quer uma população maior?** Aumente `TAMANHO_POPULACAO` (ex.: de 60 para 100). Mais
  diversidade, mais lento.
- **Quer mais exploração?** Aumente `TAXA_MUTACAO` ou `SIGMA_MUTACAO`.
- **Quer menos exploração (refinar)?** Reduza `TAXA_MUTACAO` ou `SIGMA_MUTACAO`.
- **Quer elitismo mais forte?** Aumente `ELITES` (mas não mais que 10% da
  população).

Se alterar parâmetros do algoritmo ou do jogo, atualize os valores
correspondentes em `treino_cpp/treinar.cpp` também.

---

## 7. Como exportar os dados

Clique no botão **"Exportar CSV"** no painel. Será baixado um arquivo
`resultados.csv` com o seguinte formato:

```
geracao,melhor_fitness,media_fitness,melhor_canos,w1,w2,w3,w4,w5,b
1,3500,2100,5,0.4200,-0.7500,0.6100,-0.1400,0.8800,0.0500
2,4200,2600,7,0.3100,-0.6200,0.5500,-0.1000,0.7200,0.0200
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
direto nessa tabela. Os valores de treinamento em `config.js` são sincronizados
com `treino_cpp/treinar.cpp`; mantenha-os iguais ao alterar o experimento. A
versão v2 usa seis genes e novas fórmulas sensoriais; campeões v1 precisam ser
treinados novamente.
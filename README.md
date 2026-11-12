# 📋 Temática Projeto & Membros do Grupo

| Informação | Detalhes |
|---|---|
| **Membros do Grupo** | Ivan Guimarães **RM: 0051352421038** <br> Felipe Juca **RM: 0051352411031** |
| **Disciplina** | Inteligência Computacional |
| **Professor(a)** | Felipe Cannarozzo |
| **Tema do Grupo** | Grupo 3 — Computação Evolucionária e Algoritmos Evolucionários: algoritmos genéticos, seleção, cruzamento, mutação e otimização. |

# 💾 Projeto Aprezentado - Algoritmo Genético aplicado ao Flappy Bird


Projeto do Grupo 3 — Computação Evolucionária. O repositório reúne uma
explicação matemática do algoritmo, uma simulação visual no navegador e um
treinador offline em C++ para produzir genomas de pássaros sem depender do
treinamento no browser.

## Árvore do projeto

```text
.
├── README.md
├── assets/                                  (vazia; reservada para recursos)
└── scripts/
    ├── explicacao_teorica/
    │   └── FASE0_MATEMATICA.ipynb
    └── simulacao_algoritmo/
        ├── README.md
        ├── index.html
        ├── style.css
        ├── config.js
        ├── brain.js
        ├── game.js
        ├── evolution.js
        ├── ui.js
        ├── main.js
        └── treino_cpp/
            ├── README.md
            ├── treinar.cpp
            ├── treinar.exe
            └── campeao.json
```

## O que cada arquivo faz e como usá-lo

| Arquivo | Função | Como executar/usar |
|---|---|---|
| [`README.md`](README.md) | Visão geral do repositório, estrutura, diferenças entre os treinadores e instruções de uso. | Não é executável; leia no GitHub ou em um editor Markdown. |
| `assets/` | Pasta atualmente vazia, reservada para imagens ou outros recursos. | Não se aplica. |
| [`FASE0_MATEMATICA.ipynb`](scripts/explicacao_teorica/FASE0_MATEMATICA.ipynb) | Notebook didático: fundamentos de algoritmos genéticos, representação do genoma, sensores, física, fitness, seleção, cruzamento e mutação. | Abra em Jupyter ou no VS Code com suporte a notebooks. As células Python podem ser executadas com um kernel configurado; o setup importa NumPy, Matplotlib, SciPy e pandas. |
| [`simulacao_algoritmo/README.md`](scripts/simulacao_algoritmo/README.md) | Instruções detalhadas da interface, da simulação JS, dos controles e da exportação de dados. | Não é executável; consulte antes de usar a simulação. |
| [`index.html`](scripts/simulacao_algoritmo/index.html) | Ponto de entrada da interface: canvas do jogo e do gráfico, controles e carregamento dos scripts na ordem necessária. | Abra no navegador. Alternativamente, no PowerShell, entre em `scripts\simulacao_algoritmo`, execute `python -m http.server 8000` e acesse `http://localhost:8000/`. |
| [`style.css`](scripts/simulacao_algoritmo/style.css) | Estilo e layout da página; não contém a lógica do jogo ou do algoritmo. | É carregado por `index.html`; não se executa separadamente. |
| [`config.js`](scripts/simulacao_algoritmo/config.js) | Parâmetros do jogo, do algoritmo genético e do loop visual. | É carregado por `index.html`; não se executa separadamente. Ao alterar parâmetros, sincronize os equivalentes em `treinar.cpp`. |
| [`brain.js`](scripts/simulacao_algoritmo/brain.js) | Gera genomas e transforma as cinco entradas sensoriais em uma decisão de pular ou não. | É carregado por `index.html`; não se executa separadamente. |
| [`game.js`](scripts/simulacao_algoritmo/game.js) | Modela pássaros e canos, física por frame, colisões e fitness. | É carregado por `index.html`; não se executa separadamente. |
| [`evolution.js`](scripts/simulacao_algoritmo/evolution.js) | Implementa ordenação, seleção por torneio, elitismo, cruzamento uniforme e mutação gaussiana com clipping. | É carregado por `index.html`; não se executa separadamente. |
| [`ui.js`](scripts/simulacao_algoritmo/ui.js) | Desenha o jogo e o gráfico, atualiza o painel e exporta o histórico CSV. | É carregado por `index.html`; não se executa separadamente. |
| [`main.js`](scripts/simulacao_algoritmo/main.js) | Orquestra a demonstração: cria e avalia populações, controla gerações, botões e execução de campeões. | É carregado por `index.html` como último script; não se executa separadamente. |
| [`treino_cpp/README.md`](scripts/simulacao_algoritmo/treino_cpp/README.md) | Instruções específicas para compilar/treinar offline e carregar o campeão no navegador. | Não é executável; consulte para detalhes do treinamento C++. |
| [`treinar.cpp`](scripts/simulacao_algoritmo/treino_cpp/treinar.cpp) | Implementa em C++ o jogo de avaliação e o algoritmo genético usado para treinamento offline. | Na pasta `scripts\simulacao_algoritmo\treino_cpp`, compile com `g++ -O2 -std=c++17 treinar.cpp -o treinar.exe` e rode `.\treinar.exe`. A execução cria ou substitui `campeao.json`. |
| [`treinar.exe`](scripts/simulacao_algoritmo/treino_cpp/treinar.exe) | Executável Windows pré-compilado do treinador. | Na pasta `scripts\simulacao_algoritmo\treino_cpp`, rode `.\treinar.exe`. Para garantir que o executável corresponde ao fonte atual, recompile `treinar.cpp` antes. |
| [`campeao.json`](scripts/simulacao_algoritmo/treino_cpp/campeao.json) | Genoma campeão e métricas de validação exportados pelo treinador C++; não contém código executável. | Na simulação do navegador, use **Carregar campeão**, selecione o JSON e clique em **Rodar campeão**. |

> **Cuidado:** compilar pode substituir o `treinar.exe` incluído; executar o
> treinador pode substituir o `campeao.json` existente. Os comandos acima são
> instruções para uso futuro — os arquivos deste projeto não foram executados
> durante a preparação deste README.

## Como iniciar a demonstração visual

Abra [`index.html`](scripts/simulacao_algoritmo/index.html) em um navegador
moderno. A população começa a evoluir automaticamente. A interface permite
acompanhar a geração, a fitness, o gráfico de convergência, alterar a velocidade,
exportar o histórico em CSV e carregar/rodar um genoma campeão.

Para evitar restrições de abertura local do navegador, inicie um servidor a
partir da pasta `scripts\simulacao_algoritmo`:

```powershell
python -m http.server 8000
```

Depois, acesse `http://localhost:8000/`. O servidor é opcional para essa
simulação; não é necessário instalar dependências JavaScript.

## Como treinar offline em C++

O diretório [`treino_cpp/`](scripts/simulacao_algoritmo/treino_cpp/) existe
para treinar os pássaros de verdade sem manter o treinamento pesado no
navegador. O programa avalia a população sem interface gráfica e grava o
genoma validado em `campeao.json`.

No PowerShell:

```powershell
Set-Location scripts\simulacao_algoritmo\treino_cpp
g++ -O2 -std=c++17 treinar.cpp -o treinar.exe
.\treinar.exe
```

É necessário ter GCC/MinGW ou outro compilador compatível com C++17. O
treinador retorna código `0` quando a meta é atingida nos cenários de
validação, `2` quando termina sem atingir a meta e `1` quando ocorre erro.
Consulte [`treino_cpp/README.md`](scripts/simulacao_algoritmo/treino_cpp/README.md)
para o protocolo e mais detalhes.

### Roteiro recomendado para a palestra: treinar e depois executar

1. No terminal, compile e execute o treinador C++ usando os comandos acima.
   Aguarde o fim do processo; ele grava/substitui `campeao.json`.
2. Confira no terminal se apareceu **META ATINGIDA**. Se não, o JSON ainda
   registra o melhor candidato, mas não deve ser apresentado como aprovado na
   meta de validação.
3. Abra `scripts\simulacao_algoritmo\index.html` no navegador. Clique em
   **Carregar campeão**, selecione
   `scripts\simulacao_algoritmo\treino_cpp\campeao.json` e depois em
   **Rodar campeão**.
4. Para a demonstração, use **Rodar campeão** para apresentar o pássaro
   treinado. A evolução JS que aparece ao abrir a página é apenas visual; não
   substitui o treino C++ nem valida a meta.

## Equivalência entre o treinamento JavaScript e C++

A leitura lado a lado de [`config.js`](scripts/simulacao_algoritmo/config.js),
[`brain.js`](scripts/simulacao_algoritmo/brain.js),
[`game.js`](scripts/simulacao_algoritmo/game.js),
[`evolution.js`](scripts/simulacao_algoritmo/evolution.js),
[`main.js`](scripts/simulacao_algoritmo/main.js) e
[`treinar.cpp`](scripts/simulacao_algoritmo/treino_cpp/treinar.cpp) confirma que
as duas implementações compartilham o mesmo modelo do pássaro, a mesma física
e as mesmas operações centrais do algoritmo genético:

| Parte comparada | Correspondência nas implementações |
|---|---|
| Cérebro | Genoma de seis valores (`w1` a `w5` e bias), cinco sensores normalizados, soma ponderada, sigmoide e decisão pelo limiar `0,5`. |
| Jogo e avaliação | Mesmas dimensões e atributos do pássaro/canos, gravidade, pulo, velocidade dos canos, espaçamento, regras de colisão e fitness `1000 × canos + distância`. |
| Cenários | 32 cenários de treino compartilhados entre os indivíduos de cada geração, com até 500 canos por cenário e limite de 30.000 frames. A quantidade e o protocolo são os mesmos; os valores sorteados não são necessariamente iguais entre JS e C++. |
| Algoritmo genético | População 80, 2 elites, torneio de 3, cruzamento uniforme com probabilidade 0,9, mutação por gene com probabilidade 0,1, ruído gaussiano de desvio 0,3 e genes limitados a `[-5, 5]`. |
| Limites | Até 1.000 gerações, meta de 100 canos e parada por 200 gerações sem melhora. |

**Limite importante da equivalência:** a lógica do modelo e do GA é
equivalente, mas o protocolo completo não é idêntico. O navegador usa
`Math.random()` e considera a meta atingida nos 32 cenários de treino; não faz
validação independente. O C++ usa `mt19937` com sementes fixas, avalia o melhor
candidato em outros 20 cenários de validação e só declara a meta atingida se
ele fizer pelo menos 100 canos em cada cenário de validação. Os geradores e
métodos de amostragem também são diferentes (`Box-Muller` no JS e
`normal_distribution` no C++). Portanto, não se espera que produzam os mesmos
genomas, resultados ou sequência aleatória. Para treinamento e confirmação da
meta com validação, use o C++; a versão JS é a demonstração visual da mesma
lógica central. No canvas JS, todos os indivíduos percorrem juntos o cenário
atual; os que morrem ficam visíveis até a população iniciar o próximo cenário.

Para aprofundar a matemática, consulte
[`FASE0_MATEMATICA.ipynb`](scripts/explicacao_teorica/FASE0_MATEMATICA.ipynb).

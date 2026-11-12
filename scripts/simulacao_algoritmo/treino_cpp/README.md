# Treinamento offline em C++

## Por que existe um treinador C++?

A versão no navegador é uma demonstração para a apresentação: ela mostra a
população, o cenário, as gerações, a evolução do fitness e permite executar um
campeão. Mesmo sem Web Worker, treinar muitas gerações no navegador pode ser
lento e afetar a responsividade da página.

`treinar.cpp` executa o mesmo algoritmo genético offline, sem interface
gráfica, e grava o melhor genoma em `campeao.json`. Esse arquivo pode ser
carregado na página para executar o campeão no Flappy Bird.

## Em que sentido o C++ e o JavaScript são equivalentes?

As duas implementações usam o mesmo modelo do problema e os mesmos parâmetros
de treinamento:

| Parâmetro | Valor |
|---|---:|
| Área do jogo | 800 × 600 |
| Gravidade / velocidade do pulo | 0,4 / 7 |
| Horizonte de reação do sensor | 120 frames |
| População | 80 |
| Peso de cada cano na fitness | 1000 |
| Cenários comuns por indivíduo | 32 |
| Cenários independentes de validação | 20 |
| Elites | 2 |
| Seleção por torneio | 3 indivíduos |
| Probabilidade de cruzamento | 0,9 |
| Probabilidade de mutação por gene | 0,1 |
| Desvio da mutação gaussiana | 0,3 |
| Limite absoluto dos genes | 5 |
| Meta / limite de gerações | 100 canos / 1.000 gerações |
| Parada por estagnação | 200 gerações |
| Limite por cenário | 30.000 frames |

O cérebro continua sendo uma política linear de cinco entradas e seis genes
(cinco pesos e um bias). Ele percebe a altura, a velocidade vertical, o tempo
assinado até a borda próxima do cano, a altura do vão e a diferença vertical
entre o centro do pássaro e o centro do vão. O tempo de reação usa a velocidade
dos canos e um horizonte de 120 frames. A distância permanece assinada durante
a sobreposição horizontal; o sensor não perde o cano quando sua borda já
alcançou o pássaro.

Todos os genomas de uma geração enfrentam os mesmos 32 cenários, com as
mesmas posições iniciais e sequências de vãos. A fitness usada pela seleção é
a média de `1000 × canos + distância` nesses cenários. O melhor candidato é
então avaliado em 20 cenários independentes que não participam da seleção. O
treinador só informa que atingiu a meta se o campeão passar pelo menos 100
canos em cada cenário de validação. Os episódios continuam além dos 100 canos
até a morte ou o limite de frames, para que a fitness continue diferenciando
indivíduos mais robustos. A demonstração JS usa a mesma quantidade e o mesmo
protocolo de 32 cenários comuns por geração, mas sorteia seus próprios cenários
e não substitui a validação independente do C++.

Os resultados exatos podem variar: C++ usa `mt19937` com sementes fixas para
reproduzir a execução, enquanto o navegador usa `Math.random()`. As fórmulas,
os parâmetros e as operações centrais do GA são equivalentes; a demonstração
JS não faz a validação independente do treinador C++ e os cenários sorteados
não são os mesmos. O formato de campeão agora é v2; o arquivo v1 usa sensores
antigos e deve ser substituído pelo novo treinamento.

## Como compilar

É necessário um compilador C++ com suporte a C++17, como GCC/MinGW ou Clang.
Abra um terminal nesta pasta e execute:

### Windows (MinGW/GCC)

```powershell
g++ -O2 -std=c++17 treinar.cpp -o treinar.exe
```

### Linux ou macOS (GCC/Clang)

```sh
g++ -O2 -std=c++17 treinar.cpp -o treinar
```

## Como treinar

Execute o programa **a partir desta pasta** para que o arquivo de saída seja
salvo aqui:

### Windows

```powershell
.\treinar.exe
```

### Linux ou macOS

```sh
./treinar
```

O terminal mostra a evolução, o pior resultado entre os cenários de treino e o
melhor mínimo obtido na validação. O programa cria ou substitui
`campeao.json` nesta pasta. Código de saída `0` significa que o campeão
alcançou 100 canos nos 20 cenários de validação; código `2` significa que a
meta ainda não foi alcançada. Nesse caso, o JSON informa o melhor resultado
medido, sem declarar sucesso.

## Como executar o campeão no navegador

1. Abra `../index.html` no navegador (ou sirva a pasta
   `simulacao_algoritmo/` localmente com `python -m http.server 8000`).
2. Clique em **Carregar campeão**.
3. Selecione `treino_cpp/campeao.json`.
4. Clique em **Rodar campeão**. O pássaro será executado no jogo; após morrer,
   o navegador reinicia a demonstração do mesmo genoma.

## Roteiro completo para a palestra

1. Abra um PowerShell na raiz do repositório e entre nesta pasta:

   ```powershell
   Set-Location scripts\simulacao_algoritmo\treino_cpp
   ```

2. Compile e rode o treinador:

   ```powershell
   g++ -O2 -std=c++17 treinar.cpp -o treinar.exe
   .\treinar.exe
   ```

   Aguarde o treinamento terminar. Ele cria ou substitui `campeao.json`.
   Confira a mensagem **META ATINGIDA** antes de apresentar o resultado como
   validado; se a meta não for alcançada, o arquivo ainda contém o melhor
   candidato medido, mas não uma aprovação.

3. Abra `../index.html`, carregue `campeao.json` pelo botão **Carregar
   campeão** e clique em **Rodar campeão**. O browser executa o genoma obtido
   pelo C++; o treinamento pesado não acontece nessa etapa.

Para a palestra, use a evolução JavaScript apenas como visualização
ilustrativa da população. Ela não é o treinamento que gerou o campeão nem
executa a validação independente do C++.

O JSON v2 contém seis números no campo `genoma`, correspondentes a
`[w1, w2, w3, w4, w5, bias]`, além das métricas de validação. A página rejeita
campeões v1 para evitar executar pesos treinados com fórmulas sensoriais
incompatíveis.

## Arquivos

- `treinar.cpp`: implementação C++ do ambiente, avaliação e algoritmo
  genético.
- `campeao.json`: exemplo de saída do treinamento, pronto para carregar no
  navegador.
- `treinar.exe`: executável Windows incluído no repositório; para reproduzir
  com o código-fonte atual, recompile usando o comando acima.

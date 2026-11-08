// ============================================================================
// evolution.js
// ----------------------------------------------------------------------------
// O Algoritmo Genético completo.
//
// Este arquivo implementa EXATAMENTE as seções E.2 (elitismo), E.3 (torneio),
// F.2 (cruzamento uniforme), G.2 (mutação gaussiana), G.3 (clipping) e
// H.1 (montagem da nova geração) do notebook.
//
// O que este arquivo NÃO faz:
//   - Não simula física (isso é game.js)
//   - Não decide pulsos individuais (isso é brain.js)
//   - Não desenha (isso é ui.js)
//
// Ele só cuida de UMA coisa:
//   Dada a população atual (com fitness já calculadas), produzir a próxima
//   geração (elites + filhos).
// ============================================================================


// ============================================================================
// E.2 — ORDENAÇÃO POR FITNESS
// ----------------------------------------------------------------------------
// Ordena a população do MAIOR fitness para o MENOR.
// Usada antes do elitismo e do torneio.
// ============================================================================

/**
 * Devolve uma NOVA array ordenada por fitness decrescente.
 * Não modifica a original.
 *
 * @param {Passaro[]} populacao
 * @returns {Passaro[]}
 */
function ordenarPorFitness(populacao) {
  // .slice() copia a array; .sort() com comparador b - a ordena decrescente.
  return populacao.slice().sort((a, b) => b.fitness - a.fitness);
}


// ============================================================================
// E.3 — SELEÇÃO POR TORNEIO
// ----------------------------------------------------------------------------
// Sorteia k indivíduos ao acaso e devolve o de maior fitness.
//
// Referência teórica: seção E.3 do notebook.
//   - Quanto MAIOR o k, MAIOR a pressão seletiva (melhores dominam).
//   - Quanto MENOR o k, MAIS diversidade (piores ainda têm chance).
// ============================================================================

/**
 * @param {Passaro[]} populacaoOrdenada - população JÁ ordenada por fitness
 * @param {number}    k - tamanho do torneio (vem de CONFIG_GA.TORNEIO_K)
 * @returns {Passaro} o vencedor do torneio
 */
function torneio(populacaoOrdenada, k) {
  // Sorteia k índices aleatórios e fica com o de maior fitness
  // (como a array já está ordenada, "maior fitness" = "menor índice",
  // mas para clareza vamos comparar pela propriedade fitness mesmo).
  let vencedor = null;

  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * populacaoOrdenada.length);
    const candidato = populacaoOrdenada[idx];

    if (vencedor === null || candidato.fitness > vencedor.fitness) {
      vencedor = candidato;
    }
  }

  return vencedor;
}


// ============================================================================
// F.2 — CRUZAMENTO UNIFORME
// ----------------------------------------------------------------------------
// Para cada gene do filho, sorteia de qual pai ele vem (50% A, 50% B).
// Decisão INDEPENDENTE para cada posição.
//
// Referência teórica: seção F.2 do notebook.
//   r_j < 0.5  -> gene vem do pai A
//   r_j >= 0.5 -> gene vem do pai B
// ============================================================================

/**
 * @param {number[]} paiA - genoma do pai A (vetor de 6 números)
 * @param {number[]} paiB - genoma do pai B (vetor de 6 números)
 * @returns {number[]} genoma do filho (novo vetor)
 */
function cruzarUniforme(paiA, paiB) {
  const filho = [];

  for (let j = 0; j < TAMANHO_GENOMA; j++) {
    // Math.random() em [0, 1)
    if (Math.random() < 0.5) {
      filho.push(paiA[j]);
    } else {
      filho.push(paiB[j]);
    }
  }

  return filho;
}


// ============================================================================
// G.2 — MUTAÇÃO GAUSSIANA
// G.3 — CLIPPING
// ----------------------------------------------------------------------------
// Para CADA gene do filho, com probabilidade p_m, soma uma perturbação
// gaussiana de média 0 e desvio sigma. Depois aplica clipping em [-limite, +limite].
//
// Referência teórica: seções G.2 e G.3 do notebook.
//
// Como gerar N(0, sigma²) em JavaScript sem biblioteca:
//   Math.random() gera U(0,1), não normal.
//   Usamos a transformação de Box-Muller:
//     u1 = U(0,1), u2 = U(0,1)
//     z0 = sqrt(-2 * ln(u1)) * cos(2 * PI * u2)   ~ N(0,1)
//     delta = z0 * sigma                           ~ N(0, sigma²)
//   Cuidado com u1 = 0 (log de 0 é -infinito). Forçamos u1 > 0 com um epsilon.
// ============================================================================

/**
 * Gera um único número pseudo-aleatório ~ N(0, 1) via Box-Muller.
 * @returns {number}
 */
function normalPadrao() {
  // Math.random() pode teoricamente devolver 0; log(0) = -Infinity.
  // Somamos um epsilon bem pequeno para evitar o caso.
  const u1 = Math.max(Math.random(), 1e-12);
  const u2 = Math.random();

  // Box-Muller
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Aplica mutação gaussiana + clipping em um genoma.
 * Modifica o genoma in-place (não devolve novo vetor).
 *
 * @param {number[]} genoma - vetor de 6 números (será modificado)
 * @param {number}   pm     - probabilidade de mutação por gene
 * @param {number}   sigma  - desvio-padrão da perturbação
 * @returns {number[]} o mesmo genoma, já mutado e com clipping
 */
function mutar(genoma, pm, sigma) {
  const limite = CONFIG_GA.LIMITE_GENE;

  for (let j = 0; j < genoma.length; j++) {
    // Passo 1 (G.2): sorteia se este gene vai mutar
    if (Math.random() < pm) {
      // Sorteia a perturbação ~ N(0, sigma²)
      const delta = normalPadrao() * sigma;
      genoma[j] += delta;
    }

    // Passo 2 (G.3): clipping em [-limite, +limite]
    if (genoma[j] > limite)  genoma[j] = limite;
    if (genoma[j] < -limite) genoma[j] = -limite;
  }

  return genoma;
}


// ============================================================================
// H.1 — CONSTRUÇÃO DA NOVA GERAÇÃO
// ----------------------------------------------------------------------------
// Monta a próxima geração em dois passos:
//   1. Copia os E melhores intactos (elitismo).
//   2. Preenche o resto com filhos (torneio → cruzamento → mutação).
//
// Referência teórica: seção H.1 do notebook.
// ============================================================================

/**
 * Constrói a próxima geração a partir da atual.
 *
 * @param {Passaro[]} populacaoAtual - população JÁ avaliada (com fitness)
 * @returns {number[][]} array de genomas (N vetores de 6 números cada)
 */
function construirNovaGeracao(populacaoAtual) {
  const N = CONFIG_GA.TAMANHO_POPULACAO;
  const E = CONFIG_GA.ELITES;
  const k = CONFIG_GA.TORNEIO_K;
  const pc = CONFIG_GA.TAXA_CRUZAMENTO;
  const pm = CONFIG_GA.TAXA_MUTACAO;
  const sigma = CONFIG_GA.SIGMA_MUTACAO;

  // ---- Passo 1: ordenar por fitness (decrescente) ----
  const ordenada = ordenarPorFitness(populacaoAtual);

  // ---- Passo 2: copiar os E elites intactos ----
  const novaPopulacao = [];
  for (let i = 0; i < E && i < ordenada.length; i++) {
    // Copia o genoma (não a referência) para não mutar os pais.
    novaPopulacao.push(ordenada[i].genoma.slice());
  }

  // ---- Passo 3: gerar filhos até preencher N ----
  while (novaPopulacao.length < N) {

    // 3a. Seleciona dois pais por torneio
    const paiA = torneio(ordenada, k);
    const paiB = torneio(ordenada, k);

    // 3b. Decide se cruza (com probabilidade pc)
    let genomaFilho;
    if (Math.random() < pc) {
      // Cruza (seção F.4: se u < pc, cruza)
      genomaFilho = cruzarUniforme(paiA.genoma, paiB.genoma);
    } else {
      // Não cruza: filho é cópia do pai A
      genomaFilho = paiA.genoma.slice();
    }

    // 3c. Muta (sempre aplica, mas cada gene só muta com prob. pm)
    mutar(genomaFilho, pm, sigma);

    // 3d. Adiciona à nova população
    novaPopulacao.push(genomaFilho);
  }

  return novaPopulacao;
}


// ============================================================================
// EXPORTAÇÃO
// ----------------------------------------------------------------------------
// Funções que este arquivo oferece para o resto do projeto:
//
//   ordenarPorFitness(populacao)       -> main.js e ui.js
//   torneio(populacaoOrdenada, k)      -> usado dentro de construirNovaGeracao
//   cruzarUniforme(paiA, paiB)         -> usado dentro de construirNovaGeracao
//   mutar(genoma, pm, sigma)           -> usado dentro de construirNovaGeracao
//   construirNovaGeracao(populacao)    -> main.js (chamada no fim de cada geração)
//
// A divisão em funções pequenas permite testar cada etapa isoladamente
// no console, o que é útil na arguição.
// ============================================================================
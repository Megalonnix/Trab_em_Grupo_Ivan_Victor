// ============================================================================
// brain.js
// ----------------------------------------------------------------------------
// O "cérebro" do pássaro: como um genoma toma decisões.
//
// Este arquivo implementa EXATAMENTE as seções B.1 a B.5 do notebook.
// Se o professor perguntar "onde está a sigmoide?", é aqui.
// Se perguntar "onde normaliza as entradas?", é aqui.
// Se perguntar "onde soma os pesos?", é aqui.
//
// O que este arquivo NÃO faz:
//   - Não move o pássaro (isso é game.js)
//   - Não desenha nada (isso é ui.js)
//   - Não seleciona pais (isso é evolution.js)
//
// Ele só responde a UMA pergunta:
//   "Dado um genoma e o estado atual do jogo, devo pular agora?"
// ============================================================================


// ============================================================================
// B.1 — GENOMA
// ----------------------------------------------------------------------------
// O genoma é um vetor de 6 números: [w1, w2, w3, w4, w5, b]
//   w1 = peso da posição vertical
//   w2 = peso da velocidade vertical
//   w3 = peso da distância horizontal ao próximo cano
//   w4 = peso da altura do centro do vão
//   w5 = peso da diferença entre a altura do pássaro e o centro do vão
//   b  = bias (tendência base)
// ============================================================================

const TAMANHO_GENOMA = 6;

/**
 * Cria um genoma aleatório com cada gene em [-1, 1].
 * Usado para inicializar a população na geração 0.
 *
 * @returns {number[]} vetor de 6 números em [-1, 1]
 */
function genomaAleatorio() {
  const genoma = [];
  for (let i = 0; i < TAMANHO_GENOMA; i++) {
    // Math.random() devolve [0, 1).
    // A conta (Math.random() * 2 - 1) devolve [-1, 1).
    genoma.push(Math.random() * 2 - 1);
  }
  return genoma;
}


// ============================================================================
// B.4 — SIGMOIDE
// ----------------------------------------------------------------------------
// sigma(z) = 1 / (1 + e^(-z))
//
// Aperta qualquer número real para o intervalo (0, 1), de forma suave.
// É a função de ativação usada para transformar "z" em "probabilidade de pular".
//
// Propriedade importante: sigma(0) = 0.5
// Se z > 0, sigma(z) > 0.5 (tende a pular)
// Se z < 0, sigma(z) < 0.5 (tende a NÃO pular)
// ============================================================================

/**
 * Função sigmoide.
 * @param {number} z - qualquer número real
 * @returns {number} valor em (0, 1)
 */
function sigmoide(z) {
  // Math.exp(x) calcula e^x, onde e ≈ 2.71828
  return 1 / (1 + Math.exp(-z));
}


// ============================================================================
// B.2, B.3 e B.5 — DECISÃO
// ----------------------------------------------------------------------------
// Este é o coração do cérebro. Recebe o genoma e o estado do jogo,
// normaliza as 5 entradas, calcula z, aplica a sigmoide e decide.
//
// Estado esperado (objeto com 4 campos):
//   y      = posição vertical do pássaro (0 = topo, ALTURA = chão)
//   vy     = velocidade vertical (negativo = subindo, positivo = caindo)
//   dx     = distância horizontal até o próximo cano
//   yVao   = altura do CENTRO do vão do próximo cano
//
// Fórmulas (referência: seções B.2, B.3, B.5 do notebook):
//   x1 = y / ALTURA                                       (posição vertical)
//   x2 = (vy + V_MAX) / (2 * V_MAX)                       (velocidade vertical)
//   x3 = dx / LARGURA                                     (distância horizontal)
//   x4 = yVao / ALTURA                                    (altura do centro do vão)
//   x5 = (y - yVao + ALTURA) / (2 * ALTURA)               (diferença y - yVao)
//
//   z = w1*x1 + w2*x2 + w3*x3 + w4*x4 + w5*x5 + b
//
//   se sigma(z) > 0.5  ->  pula
//   caso contrário     ->  não pula
// ============================================================================

/**
 * Decide se o pássaro deve pular neste frame.
 *
 * @param {number[]} genoma - vetor de 6 números [w1, w2, w3, w4, w5, b]
 * @param {Object}   estado - { y, vy, dx, yVao }
 * @returns {boolean} true = pular, false = não pular
 */
function decidir(genoma, estado) {

  // ---- Desempacota o genoma ----
  const w1 = genoma[0];
  const w2 = genoma[1];
  const w3 = genoma[2];
  const w4 = genoma[3];
  const w5 = genoma[4];
  const b  = genoma[5];

  // ---- Desempacota o estado ----
  const y    = estado.y;
  const vy   = estado.vy;
  const dx   = estado.dx;
  const yVao = estado.yVao;

  // ---- Constantes do jogo (vindas de config.js) ----
  const H = CONFIG_JOGO.ALTURA;
  const W = CONFIG_JOGO.LARGURA;
  const V_MAX = CONFIG_JOGO.V_MAX;

  // ---- Passo 1 (B.2): normalização das 5 entradas para [0, 1] ----
  const x1 = y / H;
  const x2 = (vy + V_MAX) / (2 * V_MAX);
  const x3 = dx / W;
  const x4 = yVao / H;
  const x5 = (y - yVao + H) / (2 * H);

  // ---- Passo 2 (B.3): soma ponderada z ----
  const z = w1 * x1 + w2 * x2 + w3 * x3 + w4 * x4 + w5 * x5 + b;

  // ---- Passo 3 (B.4): aplica a sigmoide ----
  const probabilidade = sigmoide(z);

  // ---- Passo 4 (B.5): regra de decisão ----
  return probabilidade > 0.5;
}


// ============================================================================
// EXPORTAÇÃO
// ----------------------------------------------------------------------------
// Como este projeto roda direto no navegador (sem sistema de módulos),
// as funções ficam no escopo global. Mas declaramos aqui a intenção de
// "exportar" para deixar claro o que este arquivo oferece para os outros:
//
//   genomaAleatorio()        -> usado por evolution.js (inicializar população)
//   sigmoide(z)              -> usado internamente (e em testes)
//   decidir(genoma, estado)  -> usado por main.js a cada frame
// ============================================================================
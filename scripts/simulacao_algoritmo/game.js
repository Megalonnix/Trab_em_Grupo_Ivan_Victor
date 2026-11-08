// ============================================================================
// game.js
// ----------------------------------------------------------------------------
// O "mundo" do jogo: pássaro, canos, física, colisão.
//
// Este arquivo implementa EXATAMENTE as seções C.1, C.2 e C.3 do notebook,
// além da fórmula de fitness (seção D.2).
//
// O que este arquivo NÃO faz:
//   - Não decide se o pássaro pula (isso é brain.js)
//   - Não seleciona pais nem gera filhos (isso é evolution.js)
//   - Não desenha nada (isso é ui.js)
//
// Ele só cuida de DUAS coisas:
//   1. Simular o movimento do pássaro e dos canos a cada frame.
//   2. Verificar se houve colisão e, se houve, marcar o pássaro como morto.
// ============================================================================


// ============================================================================
// CONSTANTES LOCAIS
// ----------------------------------------------------------------------------
// Posição horizontal do pássaro. No Flappy Bird original o pássaro fica
// PARADO horizontalmente, e o mundo (canos) se move da direita para a esquerda.
// ============================================================================

const PASSARO_X = 120;  // pixels da esquerda


// ============================================================================
// CLASSE PASSARO
// ----------------------------------------------------------------------------
// Representa UM pássaro em jogo. Guarda estado + genoma + fitness.
// ============================================================================

class Passaro {

  /**
   * @param {number[]} genoma - vetor de 6 números (ver brain.js)
   * @param {number}   yInicial - posição vertical inicial (padrão: centro)
   */
  constructor(genoma, yInicial) {
    this.genoma = genoma;

    // ---- Estado físico ----
    this.x = PASSARO_X;
    this.y = (yInicial !== undefined) ? yInicial : CONFIG_JOGO.ALTURA / 2;
    this.vy = 0;                 // velocidade vertical inicial

    // ---- Estado de jogo ----
    this.vivo = true;
    this.canosUltrapassados = 0;
    this.distanciaPercorrida = 0;

    // ---- Fitness (recalculada em atualizarFitness) ----
    this.fitness = 0;
  }

  /**
   * Aplica a física do frame (seção C.2 do notebook).
   *
   * ORDEM IMPORTANTE (a do notebook):
   *   1. v_y = v_y + gravidade
   *   2. se pulou: v_y = -v_salto (sobrescreve)
   *   3. y = y + v_y
   *
   * @param {boolean} pulou - true se a decisão do cérebro foi pular
   */
  aplicarFisica(pulou) {
    // Passo 1: gravidade
    this.vy += CONFIG_JOGO.GRAVIDADE;

    // Passo 2: pulo (se decidido) — sobrescreve a velocidade
    if (pulou) {
      this.vy = -CONFIG_JOGO.V_SALTO;
    }

    // Passo 3: posição
    this.y += this.vy;

    // A cada frame vivo, soma 1 à distância percorrida.
    // (É o "d" da fórmula D.2.)
    this.distanciaPercorrida += CONFIG_JOGO.CANO_VELOCIDADE;
  }

  /**
   * Verifica se o pássaro colidiu com o teto ou o chão (seção C.3).
   * @returns {boolean} true = colidiu
   */
  colidiuComTetoOuChao() {
    if (this.y < 0) return true;
    if (this.y + CONFIG_JOGO.PASSARO_ALTURA > CONFIG_JOGO.ALTURA) return true;
    return false;
  }

  /**
   * Recalcula o fitness com base no estado atual (fórmula D.2).
   *   f(g) = FITNESS_PESO_CANOS * canos + distancia
   */
  atualizarFitness() {
    this.fitness =
      CONFIG_JOGO.FITNESS_PESO_CANOS * this.canosUltrapassados +
      this.distanciaPercorrida;
  }
}


// ============================================================================
// CLASSE CANO
// ----------------------------------------------------------------------------
// Um cano tem duas partes: superior e inferior, com um vão no meio.
// O vão é descrito pelo CENTRO (yVao) e pela altura CANO_VAO (constante).
// ============================================================================

class Cano {

  /**
   * @param {number} x - posição horizontal (esquerda do cano)
   * @param {number} yVaoCentro - altura do CENTRO do vão
   */
  constructor(x, yVaoCentro) {
    this.x = x;
    this.yVao = yVaoCentro;

    // Calcula os limites do vão a partir do centro + altura
    this.yVaoSup = yVaoCentro - CONFIG_JOGO.CANO_VAO / 2;
    this.yVaoInf = yVaoCentro + CONFIG_JOGO.CANO_VAO / 2;

    // Flag para não contar o mesmo cano duas vezes na fitness
    this.passou = false;
  }

  /**
   * Move o cano para a esquerda (o mundo rola, o pássaro fica parado).
   */
  mover() {
    this.x -= CONFIG_JOGO.CANO_VELOCIDADE;
  }

  /**
   * @returns {boolean} true se o cano já saiu completamente da tela (pela esquerda)
   */
  saiuDaTela() {
    return (this.x + CONFIG_JOGO.CANO_LARGURA) < 0;
  }
}


// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Cria um cano novo em uma posição horizontal, com o centro do vão sorteado
 * aleatoriamente.
 *
 * Os limites do sorteio garantem que:
 *   - O topo do vão não fique colado no teto (senão o pássaro não passa).
 *   - O fundo do vão não fique colado no chão.
 *
 * @param {number} x - posição horizontal do cano
 * @returns {Cano}
 */
function criarCanoAleatorio(x) {
  const meioVao = CONFIG_JOGO.CANO_VAO / 2;

  // Margem de segurança em cima e embaixo (para não grudar nas bordas)
  const margem = 40;

  const yMin = meioVao + margem;
  const yMax = CONFIG_JOGO.ALTURA - meioVao - margem;

  // Math.random() em [yMin, yMax)
  const yVaoCentro = yMin + Math.random() * (yMax - yMin);

  return new Cano(x, yVaoCentro);
}

/**
 * Verifica colisão do pássaro com um cano (seção C.3).
 *
 * Condições:
 *   - Sobreposição horizontal:  (passaro.x + largura > cano.x)  E  (passaro.x < cano.x + largura)
 *   - E, verticalmente, fora do vão:
 *       (passaro.y < cano.yVaoSup)  OU  (passaro.y + altura > cano.yVaoInf)
 *
 * @param {Passaro} passaro
 * @param {Cano}    cano
 * @returns {boolean} true = colidiu
 */
function colidiuComCano(passaro, cano) {
  // Sobreposição horizontal?
  const sobrepoeX =
    (passaro.x + CONFIG_JOGO.PASSARO_LARGURA > cano.x) &&
    (passaro.x < cano.x + CONFIG_JOGO.CANO_LARGURA);

  if (!sobrepoeX) return false;

  // Está fora do vão?
  const acimaDoVao = passaro.y < cano.yVaoSup;
  const abaixoDoVao = (passaro.y + CONFIG_JOGO.PASSARO_ALTURA) > cano.yVaoInf;

  return acimaDoVao || abaixoDoVao;
}

/**
 * Verifica se o pássaro ultrapassou o cano (para contar canos na fitness).
 * Marca o cano como "passou" para não contar de novo.
 *
 * @param {Passaro} passaro
 * @param {Cano}    cano
 * @returns {boolean} true se o cano foi ultrapassado neste frame
 */
function verificarPassouCano(passaro, cano) {
  if (cano.passou) return false;

  // O cano é considerado ultrapassado quando sua borda direita
  // já passou totalmente pelo pássaro.
  const bordaDireitaCano = cano.x + CONFIG_JOGO.CANO_LARGURA;

  if (bordaDireitaCano < passaro.x) {
    cano.passou = true;
    return true;
  }
  return false;
}
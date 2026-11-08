// ============================================================================
// evolution.worker.js
// ============================================================================

importScripts('config.js', 'brain.js', 'game.js', 'evolution.js');


// ============================================================================
// ESTADO INTERNO
// ============================================================================

let populacaoAtual = [];
let canos = [];
let geracao = 1;
let framesAposMorte = 0;
let emTransicao = false;

let geracoesSemMelhora = 0;
let melhorFitnessGlobal = 0;
let melhorGenomaGlobal = null;
let melhorCanosGlobal = 0;

let historicoGrafico = [];
let historicoResumo = [];

let estadoJogo = 'rodando';
let rodando = false;
let velocidade = 1;
let loteAcumulado = 0;

const TAMANHO_LOTE = 10;
const MAX_HISTORICO = 10000;


// ============================================================================
// INICIALIZAÇÃO / RESET
// ============================================================================

function criarPopulacaoInicial() {
  populacaoAtual = [];
  for (let i = 0; i < CONFIG_GA.TAMANHO_POPULACAO; i++) {
    const genoma = genomaAleatorio();
    const yInicial = 100 + Math.random() * (CONFIG_JOGO.ALTURA - 200);
    populacaoAtual.push(new Passaro(genoma, yInicial));
  }
}

function criarCanosIniciais() {
  canos = [criarCanoAleatorio(CONFIG_JOGO.LARGURA)];
}

function resetarEstado() {
  geracao = 1;
  framesAposMorte = 0;
  emTransicao = false;
  geracoesSemMelhora = 0;
  melhorFitnessGlobal = 0;
  melhorGenomaGlobal = null;
  melhorCanosGlobal = 0;
  historicoGrafico = [];
  historicoResumo = [];
  estadoJogo = 'rodando';
  loteAcumulado = 0;
  criarPopulacaoInicial();
  criarCanosIniciais();
}


// ============================================================================
// LOOP DO WORKER
// ============================================================================

function loopWorker() {
  if (!rodando || estadoJogo === 'parado') {
    setTimeout(loopWorker, 100);
    return;
  }

  const inicio = performance.now();
  let ticks = 0;

  while (ticks < velocidade && performance.now() - inicio < 12) {
    if (estadoJogo === 'parado') break;
    atualizarJogo();
    ticks++;
  }

  const decorrido = performance.now() - inicio;
  setTimeout(loopWorker, Math.max(0, 16 - decorrido));
}


// ============================================================================
// ATUALIZAÇÃO DO JOGO
// ============================================================================

function atualizarJogo() {
  if (emTransicao) {
    framesAposMorte++;
    if (framesAposMorte >= 60) passarParaProximaGeracao();
    return;
  }

  for (const passaro of populacaoAtual) {
    if (!passaro.vivo) continue;
    const estado = {
      y: passaro.y,
      vy: passaro.vy,
      dx: calcularDistancia(passaro, canos),
      yVao: calcularYVao(passaro, canos),
    };
    const pulou = decidir(passaro.genoma, estado);
    passaro.aplicarFisica(pulou);
    if (passaro.colidiuComTetoOuChao()) {
      passaro.vivo = false;
      passaro.atualizarFitness();
    }
  }

  for (const cano of canos) cano.mover();
  canos = canos.filter(c => !c.saiuDaTela());

  if (canos.length === 0) {
    canos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
  } else {
    const ultimo = canos[canos.length - 1];
    if (ultimo.x <= CONFIG_JOGO.LARGURA - CONFIG_JOGO.CANO_ESPACAMENTO) {
      canos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
    }
  }

  for (const passaro of populacaoAtual) {
    if (!passaro.vivo) continue;
    for (const cano of canos) {
      if (colidiuComCano(passaro, cano)) {
        passaro.vivo = false;
        passaro.atualizarFitness();
        break;
      }
    }
  }

  for (const passaro of populacaoAtual) {
    if (!passaro.vivo) continue;
    for (const cano of canos) {
      if (verificarPassouCano(passaro, cano)) passaro.canosUltrapassados++;
    }
  }

  if (populacaoAtual.every(p => !p.vivo)) {
    emTransicao = true;
    framesAposMorte = 0;
  }
}


// ============================================================================
// TRANSIÇÃO
// ============================================================================

function passarParaProximaGeracao() {
  for (const p of populacaoAtual) p.atualizarFitness();

  const fitness = populacaoAtual.map(p => p.fitness);
  const melhor = Math.max(...fitness);
  const media = fitness.reduce((a, b) => a + b, 0) / fitness.length;

  const melhorPassaro = populacaoAtual.reduce(
    (a, b) => (b.fitness > a.fitness ? b : a)
  );
  const melhorCanos = melhorPassaro.canosUltrapassados;

  historicoGrafico.push({ geracao, melhor, media });
  historicoResumo.push({
    geracao,
    melhorFitness: melhor,
    mediaFitness: media,
    melhorCanos,
    melhorGenoma: melhorPassaro.genoma.slice(),
  });

  if (historicoGrafico.length > MAX_HISTORICO) {
    historicoGrafico = historicoGrafico.slice(-MAX_HISTORICO);
  }
  if (historicoResumo.length > MAX_HISTORICO) {
    historicoResumo = historicoResumo.slice(-MAX_HISTORICO);
  }

  if (melhor > melhorFitnessGlobal) {
    melhorFitnessGlobal = melhor;
    melhorGenomaGlobal = melhorPassaro.genoma.slice();
    melhorCanosGlobal = melhorCanos;
    geracoesSemMelhora = 0;
  } else {
    geracoesSemMelhora++;
  }

  const parada = verificarParada(melhorCanos);
  if (parada.parar) {
    estadoJogo = 'parado';
    postMessage({
      tipo: 'parada',
      motivo: parada.motivo,
      geracao,
      melhorFitness: melhor,
      mediaFitness: media,
      melhorCanos,
    });
    return;
  }

  const novosGenomas = construirNovaGeracao(populacaoAtual);
  geracao++;
  populacaoAtual = [];
  for (const g of novosGenomas) {
    const y = 100 + Math.random() * (CONFIG_JOGO.ALTURA - 200);
    populacaoAtual.push(new Passaro(g, y));
  }
  criarCanosIniciais();
  emTransicao = false;
  framesAposMorte = 0;

  loteAcumulado++;
  if (loteAcumulado >= TAMANHO_LOTE) {
    loteAcumulado = 0;
    postMessage({
      tipo: 'lote',
      geracao,
      melhorFitness: melhorFitnessGlobal,
      melhorGenoma: melhorGenomaGlobal ? melhorGenomaGlobal.slice() : null,
      melhorCanos: melhorCanosGlobal,
      historico: historicoGrafico.slice(-200),
    });
  }
}

function verificarParada(melhorCanos) {
  if (melhorCanos >= CONFIG_GA.META_CANOS) {
    return { parar: true, motivo: 'Meta de ' + CONFIG_GA.META_CANOS + ' canos' };
  }
  if (geracao >= CONFIG_GA.MAX_GERACOES) {
    return { parar: true, motivo: 'Limite de ' + CONFIG_GA.MAX_GERACOES + ' gerações' };
  }
  if (geracoesSemMelhora >= CONFIG_GA.GERACOES_SEM_MELHORA) {
    return { parar: true, motivo: geracoesSemMelhora + ' gerações sem melhora' };
  }
  return { parar: false, motivo: '' };
}


// ============================================================================
// PERCEPÇÃO
// ============================================================================

function calcularDistancia(passaro, listaCanos) {
  let menor = CONFIG_JOGO.LARGURA, achou = false;
  for (const c of listaCanos) {
    if (c.x + CONFIG_JOGO.CANO_LARGURA > passaro.x) {
      const d = c.x - passaro.x;
      if (d >= 0 && (!achou || d < menor)) { menor = d; achou = true; }
    }
  }
  return menor;
}

function calcularYVao(passaro, listaCanos) {
  let menor = CONFIG_JOGO.LARGURA, yVao = CONFIG_JOGO.ALTURA / 2;
  for (const c of listaCanos) {
    if (c.x + CONFIG_JOGO.CANO_LARGURA > passaro.x) {
      const d = c.x - passaro.x;
      if (d >= 0 && d < menor) { menor = d; yVao = c.yVao; }
    }
  }
  return yVao;
}


// ============================================================================
// MENSAGENS
// ============================================================================

self.onmessage = (e) => {
  const msg = e.data;

  if (msg.tipo === 'iniciar') {
    if (!rodando) { rodando = true; loopWorker(); }
  }

  if (msg.tipo === 'parar') {
    rodando = false;
  }

  if (msg.tipo === 'resetar') {
    rodando = false;
    resetarEstado();
    postMessage({ tipo: 'resetado' });
    rodando = true;
    loopWorker();
  }

  if (msg.tipo === 'velocidade') {
    velocidade = msg.valor;
  }

  if (msg.tipo === 'snapshot') {
    postMessage({
      tipo: 'snapshot',
      populacao: populacaoAtual.map(p => ({
        x: p.x, y: p.y, vivo: p.vivo,
      })),
      canos: canos.map(c => ({
        x: c.x, yVaoSup: c.yVaoSup, yVaoInf: c.yVaoInf,
      })),
      geracao,
    });
  }

  if (msg.tipo === 'exportar') {
    postMessage({ tipo: 'csv', historico: historicoResumo });
  }
};

resetarEstado();
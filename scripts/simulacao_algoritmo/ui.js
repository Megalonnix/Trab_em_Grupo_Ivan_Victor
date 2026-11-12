// ============================================================================
// ui.js
// ----------------------------------------------------------------------------
// Tudo o que o usuário vê e interage fora da física:
//   - Desenho do cenário no canvas (fundo, canos, pássaros)
//   - Atualização do painel HTML
//   - Gráfico de convergência
//   - Exportação CSV
//   - Estado visual dos botões (velocidade, demo, salvar)
//
// O que este arquivo NÃO faz:
//   - Não calcula física, não decide pulos, não aplica GA
//   - Não registra listeners de eventos (isso é main.js)
//
// Só lê estado e escreve na tela.
// ============================================================================


// ============================================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ============================================================================

const canvasJogo = document.getElementById('canvas-jogo');
const ctxJogo    = canvasJogo.getContext('2d');

const canvasGrafico = document.getElementById('canvas-grafico');
const ctxGrafico    = canvasGrafico.getContext('2d');

const elModo          = document.getElementById('info-modo');
const elGeracao       = document.getElementById('info-geracao');
const elCenario       = document.getElementById('info-cenario');
const elVivos         = document.getElementById('info-vivos');
const elMelhorFitness = document.getElementById('info-melhor-fitness');
const elMediaFitness  = document.getElementById('info-media-fitness');
const elMelhorCanos   = document.getElementById('info-melhor-canos');
const elStatus        = document.getElementById('info-status');

// Botões de velocidade (querySelectorAll para pegar todos)
const botoesVelocidade = document.querySelectorAll('.botao-velocidade');

// Botões de save / load / demo / reset
const btnSalvarCampeao  = document.getElementById('btn-salvar-campeao');
const btnCarregarCampeao = document.getElementById('btn-carregar-campeao');
const btnDemo           = document.getElementById('btn-demo');
const btnPararDemo      = document.getElementById('btn-parar-demo');
const btnReset          = document.getElementById('btn-reset');
const btnExportar       = document.getElementById('btn-exportar');


// ============================================================================
// CONFIGURAÇÃO DOS CANVASES
// ============================================================================

canvasJogo.width  = CONFIG_JOGO.LARGURA;
canvasJogo.height = CONFIG_JOGO.ALTURA;


// ============================================================================
// DESENHO DO CENÁRIO (canvas do jogo)
// ============================================================================

function desenharCenario(passaros, canos, sobreporPopulacao = false) {

  // ---- 1. Fundo ----
  ctxJogo.fillStyle = '#87CEEB';
  ctxJogo.fillRect(0, 0, CONFIG_JOGO.LARGURA, CONFIG_JOGO.ALTURA);

  // ---- 2. Canos ----
  for (const cano of canos) {
    ctxJogo.fillStyle = '#2E8B57';

    const alturaSup = cano.yVaoSup;
    ctxJogo.fillRect(cano.x, 0, CONFIG_JOGO.CANO_LARGURA, alturaSup);

    const alturaInf = CONFIG_JOGO.ALTURA - cano.yVaoInf;
    ctxJogo.fillRect(cano.x, cano.yVaoInf, CONFIG_JOGO.CANO_LARGURA, alturaInf);

    ctxJogo.strokeStyle = '#1B5E20';
    ctxJogo.lineWidth = 2;
    ctxJogo.strokeRect(cano.x, 0, CONFIG_JOGO.CANO_LARGURA, alturaSup);
    ctxJogo.strokeRect(cano.x, cano.yVaoInf, CONFIG_JOGO.CANO_LARGURA, alturaInf);
  }

  // ---- 3. Pássaros (mortos primeiro, vivos depois) ----
  for (const p of passaros) {
    if (!p.vivo) desenharPassaro(p, true, sobreporPopulacao ? 0.2 : 1);
  }
  for (const p of passaros) {
    if (p.vivo) desenharPassaro(p, false, sobreporPopulacao ? 0.45 : 1);
  }

  // ---- 4. Chão ----
  ctxJogo.fillStyle = '#8B4513';
  ctxJogo.fillRect(0, CONFIG_JOGO.ALTURA - 10, CONFIG_JOGO.LARGURA, 10);
}

function desenharPassaro(passaro, morto, opacidade) {
  const largura = CONFIG_JOGO.PASSARO_LARGURA;
  const altura  = CONFIG_JOGO.PASSARO_ALTURA;

  ctxJogo.globalAlpha = opacidade;
  if (morto) {
    ctxJogo.fillStyle = 'rgba(120, 120, 120, 0.35)';
  } else {
    ctxJogo.fillStyle = '#FFD700';
  }

  ctxJogo.fillRect(passaro.x, passaro.y, largura, altura);

  if (!morto) {
    ctxJogo.strokeStyle = '#B8860B';
    ctxJogo.lineWidth = 1.5;
    ctxJogo.strokeRect(passaro.x, passaro.y, largura, altura);
  }
  ctxJogo.globalAlpha = 1;
}


// ============================================================================
// PAINEL HTML — atualização
// ----------------------------------------------------------------------------
// Recebe um objeto info com todos os campos. No modo demo, alguns campos
// vêm com "—" (string) para indicar "não se aplica".
// ============================================================================

function atualizarPainel(info) {
  // Modo
  if (info.modo !== undefined) {
    elModo.textContent = info.modo;
    if (info.modo === 'Demo') {
      elModo.classList.add('demo');
    } else {
      elModo.classList.remove('demo');
    }
  }

  elGeracao.textContent       = info.geracao;
  elCenario.textContent       = info.cenario;
  elVivos.textContent         = info.vivos;
  elMelhorFitness.textContent = info.melhorFitness;
  elMediaFitness.textContent  = info.mediaFitness;
  elMelhorCanos.textContent   = info.melhorCanos;
  elStatus.textContent        = info.status;

  // Colore o status de vermelho se estiver parado
  if (String(info.status).indexOf('PARADO') === 0) {
    elStatus.classList.add('parado');
  } else {
    elStatus.classList.remove('parado');
  }
}


// ============================================================================
// BOTÕES — estado visual
// ============================================================================

/**
 * Marca o botão de velocidade correspondente como "ativo",
 * e desmarca os outros.
 * @param {number} valor - 1, 5, 20 ou 100
 */
function destacarBotaoVelocidade(valor) {
  botoesVelocidade.forEach(btn => {
    const v = parseInt(btn.dataset.velocidade);
    if (v === valor) {
      btn.classList.add('ativo');
    } else {
      btn.classList.remove('ativo');
    }
  });
}

/**
 * Habilita ou desabilita o botão "Rodar campeão" no modo demo.
 * @param {boolean} habilitado
 */
function setBotaoDemoHabilitado(habilitado) {
  btnDemo.disabled = !habilitado;
}

/**
 * Habilita ou desabilita o botão "Parar demo".
 * @param {boolean} habilitado
 */
function setBotaoPararDemoHabilitado(habilitado) {
  btnPararDemo.disabled = !habilitado;
}


// ============================================================================
// GRÁFICO DE CONVERGÊNCIA
// ============================================================================

function desenharGrafico(historico) {

  const W = canvasGrafico.width;
  const H = canvasGrafico.height;

  ctxGrafico.fillStyle = '#FFFFFF';
  ctxGrafico.fillRect(0, 0, W, H);

  if (historico.length === 0) {
    ctxGrafico.fillStyle = '#999';
    ctxGrafico.font = '14px sans-serif';
    ctxGrafico.textAlign = 'center';
    ctxGrafico.fillText('O gráfico aparece após a 1ª geração.', W / 2, H / 2);
    return;
  }

  const margemEsq = 50;
  const margemDir = 15;
  const margemSup = 20;
  const margemInf = 30;

  const plotW = W - margemEsq - margemDir;
  const plotH = H - margemSup - margemInf;

  const nGer   = historico.length;
  const gerMin = 1;
  const gerMax = Math.max(2, nGer);

  let fitnessMax = 0;
  for (const h of historico) {
    if (h.melhor > fitnessMax) fitnessMax = h.melhor;
  }
  fitnessMax = Math.ceil(fitnessMax * 1.1);
  if (fitnessMax < 1) fitnessMax = 1;

  const px = (geracao) =>
    margemEsq + ((geracao - gerMin) / (gerMax - gerMin)) * plotW;

  const py = (fitness) =>
    margemSup + plotH - (fitness / fitnessMax) * plotH;

  // ============ DOWNSAMPLING ============
  // O canvas tem ~350px de largura útil. Mais de ~400 pontos é desperdício.
  // Agrupa em passos: pega 1 a cada N, mas SEMPRE inclui o último.
  const MAX_PONTOS = 400;
  const passo = Math.max(1, Math.ceil(historico.length / MAX_PONTOS));
  const pontos = [];
  for (let i = 0; i < historico.length; i += passo) {
    pontos.push(historico[i]);
  }
  // Garante que a geração mais recente sempre apareça
  if (pontos[pontos.length - 1] !== historico[historico.length - 1]) {
    pontos.push(historico[historico.length - 1]);
  }

  // Eixos
  ctxGrafico.strokeStyle = '#333';
  ctxGrafico.lineWidth = 1.5;
  ctxGrafico.beginPath();
  ctxGrafico.moveTo(margemEsq, margemSup);
  ctxGrafico.lineTo(margemEsq, margemSup + plotH);
  ctxGrafico.lineTo(margemEsq + plotW, margemSup + plotH);
  ctxGrafico.stroke();

  // Grade
  ctxGrafico.strokeStyle = '#DDD';
  ctxGrafico.lineWidth = 1;
  ctxGrafico.fillStyle = '#666';
  ctxGrafico.font = '10px sans-serif';
  ctxGrafico.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const valor = (fitnessMax / 4) * i;
    const y = py(valor);
    ctxGrafico.beginPath();
    ctxGrafico.moveTo(margemEsq, y);
    ctxGrafico.lineTo(margemEsq + plotW, y);
    ctxGrafico.stroke();
    ctxGrafico.fillText(Math.round(valor), margemEsq - 5, y + 3);
  }

  // Curva melhor (verde)
  ctxGrafico.strokeStyle = '#2E8B57';
  ctxGrafico.lineWidth = 2;
  ctxGrafico.beginPath();
  pontos.forEach((h, i) => {
    const x = px(h.geracao);
    const y = py(h.melhor);
    if (i === 0) ctxGrafico.moveTo(x, y);
    else         ctxGrafico.lineTo(x, y);
  });
  ctxGrafico.stroke();

  // Curva média (azul)
  ctxGrafico.strokeStyle = '#1E90FF';
  ctxGrafico.lineWidth = 2;
  ctxGrafico.beginPath();
  pontos.forEach((h, i) => {
    const x = px(h.geracao);
    const y = py(h.media);
    if (i === 0) ctxGrafico.moveTo(x, y);
    else         ctxGrafico.lineTo(x, y);
  });
  ctxGrafico.stroke();

  // Título
  ctxGrafico.fillStyle = '#000';
  ctxGrafico.font = 'bold 12px sans-serif';
  ctxGrafico.textAlign = 'left';
  ctxGrafico.fillText('Convergência do GA', margemEsq, 14);

  // Legenda
  ctxGrafico.font = '10px sans-serif';
  ctxGrafico.fillStyle = '#2E8B57';
  ctxGrafico.fillRect(margemEsq + plotW - 130, 10, 10, 3);
  ctxGrafico.fillText('melhor', margemEsq + plotW - 115, 15);

  ctxGrafico.fillStyle = '#1E90FF';
  ctxGrafico.fillRect(margemEsq + plotW - 60, 10, 10, 3);
  ctxGrafico.fillText('média', margemEsq + plotW - 45, 15);

  ctxGrafico.fillStyle = '#666';
  ctxGrafico.textAlign = 'center';
  ctxGrafico.fillText('geração', margemEsq + plotW / 2, margemSup + plotH + 20);

  // Info extra: mostra quantas gerações existem se for downsampled
  if (passo > 1) {
    ctxGrafico.textAlign = 'right';
    ctxGrafico.fillStyle = '#999';
    ctxGrafico.fillText(`(${historico.length} gerações, exibindo ~${pontos.length})`,
                        W - 5, H - 5);
  }
}


// ============================================================================
// EXPORTAÇÃO CSV
// ============================================================================

function exportarCSV(historicoResumo) {

  if (historicoResumo.length === 0) {
    alert('Nada para exportar ainda. Rode pelo menos uma geração.');
    return;
  }

  // Formato: uma linha por geração, com o melhor genoma daquela geração.
  // Isso é suficiente para análise de convergência em milhares de gerações.
  const cabecalho = 'geracao,melhor_fitness,media_fitness,melhor_canos,' +
                    'w1,w2,w3,w4,w5,b';

  const linhas = [cabecalho];

  for (const h of historicoResumo) {
    const g = h.melhorGenoma || [];
    const genes = g.map(v => v.toFixed(4)).join(',');

    linhas.push([
      h.geracao,
      Math.round(h.melhorFitness),
      Math.round(h.mediaFitness),
      h.melhorCanos,
      genes,
    ].join(','));
  }

  const texto = linhas.join('\n');

  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'resultados.csv';
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// ============================================================================
// HOOK DO BOTÃO EXPORTAR
// ----------------------------------------------------------------------------
// O ui.js registra o clique no botão, mas quem tem o histórico completo é o
// main.js. O main.js define window.aoClicarExportar = function() { ... }
// quando inicializar. Aqui só chamamos essa função se ela existir.
// ============================================================================

if (btnExportar) {
  btnExportar.addEventListener('click', () => {
    if (typeof window.aoClicarExportar === 'function') {
      window.aoClicarExportar();
    }
  });
}
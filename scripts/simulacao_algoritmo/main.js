// ============================================================================
// main.js — v4 (worker)
// ============================================================================

let worker = null;
let ultimoSnapshot = null;
let ultimoLote = null;
let modoAtual = 'evolucao';
let campeaoCarregado = null;
let demoPassaro = null;
let demoCanos = [];
let demoMorteTs = null;
let velocidadeAtual = 1;
let graficoDirty = false;
let historicoLocal = [];

const DEMO_ESPERA_MS = 1000;


// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

function inicializar() {
  try {
    worker = new Worker('evolution.worker.js');
  } catch (err) {
    alert(
      'Não foi possível iniciar o Web Worker.\n\n' +
      'Abra a página via servidor local:\n' +
      '    python -m http.server 8000\n' +
      'e acesse http://localhost:8000/'
    );
    console.error(err);
    return;
  }

  worker.onmessage = tratarMensagemWorker;
  worker.onerror = (err) => console.error('Erro no worker:', err);

  configurarBotoes();
  atualizarBotoesParaModo();

  window.aoClicarExportar = () => worker.postMessage({ tipo: 'exportar' });

  worker.postMessage({ tipo: 'iniciar' });

  // Snapshots a 60fps
  setInterval(() => {
    if (modoAtual === 'evolucao' && worker) {
      worker.postMessage({ tipo: 'snapshot' });
    }
  }, 16);

  requestAnimationFrame(loopDesenho);
}


// ============================================================================
// LOOP DE DESENHO
// ============================================================================

function loopDesenho() {
  if (modoAtual === 'evolucao') {
    if (ultimoSnapshot) {
      desenharCenario(ultimoSnapshot.populacao, ultimoSnapshot.canos);
    }
    if (graficoDirty) {
      desenharGrafico(historicoLocal);
      graficoDirty = false;
    }
  } else {
    rodarFrameDemo();
    desenharCenario(demoPassaro ? [demoPassaro] : [], demoCanos);
    atualizarPainelDemoLocal();
  }
  requestAnimationFrame(loopDesenho);
}


// ============================================================================
// MENSAGENS DO WORKER
// ============================================================================

function tratarMensagemWorker(e) {
  const msg = e.data;

  if (msg.tipo === 'snapshot') {
    ultimoSnapshot = {
      populacao: msg.populacao,
      canos: msg.canos,
      geracao: msg.geracao,
    };
    atualizarPainelEvolucaoLocal();
  }

  if (msg.tipo === 'lote') {
    ultimoLote = msg;
    historicoLocal = msg.historico;
    graficoDirty = true;
    atualizarPainelEvolucaoLocal();
  }

  if (msg.tipo === 'parada') {
    atualizarPainel({
      modo: 'Evolução', geracao: msg.geracao, vivos: 0,
      melhorFitness: Math.round(msg.melhorFitness),
      mediaFitness: Math.round(msg.mediaFitness),
      melhorCanos: msg.melhorCanos,
      status: 'PARADO: ' + msg.motivo,
    });
  }

  if (msg.tipo === 'resetado') {
    ultimoSnapshot = null;
    ultimoLote = null;
    historicoLocal = [];
    desenharGrafico([]);
    atualizarBotoesParaModo();
  }

  if (msg.tipo === 'csv') {
    exportarCSV(msg.historico);
  }
}


// ============================================================================
// PAINEL — evolução
// ============================================================================

function atualizarPainelEvolucaoLocal() {
  const vivos = ultimoSnapshot
    ? ultimoSnapshot.populacao.filter(p => p.vivo).length : '—';

  let geracaoMostrar = '...';
  if (ultimoLote) geracaoMostrar = ultimoLote.geracao;
  else if (ultimoSnapshot && ultimoSnapshot.geracao !== undefined) {
    geracaoMostrar = ultimoSnapshot.geracao;
  }

  atualizarPainel({
    modo: 'Evolução',
    geracao: geracaoMostrar,
    vivos,
    melhorFitness: ultimoLote ? Math.round(ultimoLote.melhorFitness) : 0,
    mediaFitness: '—',
    melhorCanos: ultimoLote ? ultimoLote.melhorCanos : 0,
    status: 'Rodando (worker)',
  });
}


// ============================================================================
// PAINEL — demo
// ============================================================================

function atualizarPainelDemoLocal() {
  if (!demoPassaro) return;
  demoPassaro.atualizarFitness();
  atualizarPainel({
    modo: 'Demo', geracao: '—',
    vivos: demoPassaro.vivo ? 1 : 0,
    melhorFitness: Math.round(demoPassaro.fitness),
    mediaFitness: '—',
    melhorCanos: demoPassaro.canosUltrapassados,
    status: demoPassaro.vivo ? 'Rodando (demo)' : 'Pássaro morreu — reiniciando...',
  });
}


// ============================================================================
// BOTÕES
// ============================================================================

function configurarBotoes() {
  botoesVelocidade.forEach(btn => {
    btn.addEventListener('click', () => {
      velocidadeAtual = parseInt(btn.dataset.velocidade);
      destacarBotaoVelocidade(velocidadeAtual);
      worker.postMessage({ tipo: 'velocidade', valor: velocidadeAtual });
    });
  });

  btnSalvarCampeao.addEventListener('click', salvarCampeao);

  btnCarregarCampeao.addEventListener('click', () => {
    document.getElementById('input-carregar-campeao').click();
  });
  document.getElementById('input-carregar-campeao').addEventListener('change', (e) => {
    const arq = e.target.files[0];
    if (arq) carregarCampeao(arq);
    e.target.value = '';
  });

  btnDemo.addEventListener('click', iniciarDemo);
  btnPararDemo.addEventListener('click', pararDemo);

  btnReset.addEventListener('click', () => {
    if (!confirm('Recomeçar a simulação do zero?')) return;
    modoAtual = 'evolucao';
    demoPassaro = null; demoCanos = []; demoMorteTs = null;
    campeaoCarregado = null;
    ultimoSnapshot = null; ultimoLote = null; historicoLocal = [];
    worker.postMessage({ tipo: 'resetar' });
    atualizarBotoesParaModo();
  });
}

function atualizarBotoesParaModo() {
  if (modoAtual === 'demo') {
    btnSalvarCampeao.disabled = true;
    btnDemo.disabled = true;
    btnPararDemo.disabled = false;
  } else {
    btnSalvarCampeao.disabled = !ultimoLote;
    btnDemo.disabled = (campeaoCarregado === null);
    btnPararDemo.disabled = true;
  }
}


// ============================================================================
// SALVAR / CARREGAR CAMPEÃO
// ============================================================================

function salvarCampeao() {
  if (!ultimoLote || !ultimoLote.melhorGenoma) {
    alert('Ainda não há campeão. Aguarde as primeiras gerações.');
    return;
  }
  const dados = {
    formato: 'flappy-ga-campeao-v1',
    data: new Date().toISOString(),
    genoma: ultimoLote.melhorGenoma.map(v => Number(v.toFixed(6))),
    fitness: Math.round(ultimoLote.melhorFitness),
    geracao: ultimoLote.geracao,
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'campeao.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function carregarCampeao(arquivo) {
  const leitor = new FileReader();
  leitor.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      if (!Array.isArray(dados.genoma) || dados.genoma.length !== 6) {
        throw new Error('Genoma inválido (esperado array de 6 números).');
      }
      campeaoCarregado = dados.genoma.map(Number);
      if (campeaoCarregado.some(v => !isFinite(v))) {
        throw new Error('Genoma contém valores não numéricos.');
      }
      atualizarBotoesParaModo();
      alert('Campeão carregado!' + (dados.geracao ? ' (geração ' + dados.geracao + ')' : '') +
            '\n\nClique em "▶ Rodar campeão".');
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };
  leitor.onerror = () => alert('Não foi possível ler o arquivo.');
  leitor.readAsText(arquivo);
}


// ============================================================================
// DEMO
// ============================================================================

function iniciarDemo() {
  if (!campeaoCarregado) return;
  modoAtual = 'demo';
  const y = 100 + Math.random() * (CONFIG_JOGO.ALTURA - 200);
  demoPassaro = new Passaro(campeaoCarregado.slice(), y);
  demoCanos = [criarCanoAleatorio(CONFIG_JOGO.LARGURA)];
  demoMorteTs = null;
  atualizarBotoesParaModo();
}

function pararDemo() {
  modoAtual = 'evolucao';
  demoPassaro = null; demoCanos = []; demoMorteTs = null;
  atualizarBotoesParaModo();
}

function rodarFrameDemo() {
  if (!demoPassaro) return;

  if (!demoPassaro.vivo) {
    if (demoMorteTs !== null && Date.now() - demoMorteTs > DEMO_ESPERA_MS) {
      const y = 100 + Math.random() * (CONFIG_JOGO.ALTURA - 200);
      demoPassaro = new Passaro(campeaoCarregado.slice(), y);
      demoCanos = [criarCanoAleatorio(CONFIG_JOGO.LARGURA)];
      demoMorteTs = null;
    }
    return;
  }

  const inicio = performance.now();
  for (let i = 0; i < velocidadeAtual && performance.now() - inicio < 12; i++) {
    if (!demoPassaro.vivo) break;

    const est = {
      y: demoPassaro.y, vy: demoPassaro.vy,
      dx: calcDistDemo(demoPassaro, demoCanos),
      yVao: calcYVaoDemo(demoPassaro, demoCanos),
    };
    const pulou = decidir(demoPassaro.genoma, est);
    demoPassaro.aplicarFisica(pulou);

    if (demoPassaro.colidiuComTetoOuChao()) {
      demoPassaro.vivo = false; demoPassaro.atualizarFitness();
      demoMorteTs = Date.now(); break;
    }

    for (const c of demoCanos) c.mover();
    demoCanos = demoCanos.filter(c => !c.saiuDaTela());
    if (demoCanos.length === 0) {
      demoCanos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
    } else {
      const u = demoCanos[demoCanos.length - 1];
      if (u.x <= CONFIG_JOGO.LARGURA - CONFIG_JOGO.CANO_ESPACAMENTO) {
        demoCanos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
      }
    }

    for (const c of demoCanos) {
      if (colidiuComCano(demoPassaro, c)) {
        demoPassaro.vivo = false; demoPassaro.atualizarFitness();
        demoMorteTs = Date.now(); break;
      }
    }

    if (demoPassaro.vivo) {
      for (const c of demoCanos) {
        if (verificarPassouCano(demoPassaro, c)) demoPassaro.canosUltrapassados++;
      }
    }
  }
}

function calcDistDemo(p, cs) {
  let m = CONFIG_JOGO.LARGURA, achou = false;
  for (const c of cs) if (c.x + CONFIG_JOGO.CANO_LARGURA > p.x) {
    const d = c.x - p.x;
    if (d >= 0 && (!achou || d < m)) { m = d; achou = true; }
  }
  return m;
}
function calcYVaoDemo(p, cs) {
  let m = CONFIG_JOGO.LARGURA, y = CONFIG_JOGO.ALTURA / 2;
  for (const c of cs) if (c.x + CONFIG_JOGO.CANO_LARGURA > p.x) {
    const d = c.x - p.x;
    if (d >= 0 && d < m) { m = d; y = c.yVao; }
  }
  return y;
}


// ============================================================================
// INÍCIO
// ============================================================================

window.addEventListener('load', inicializar);
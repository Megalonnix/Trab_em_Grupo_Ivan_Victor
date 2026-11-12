// Orquestra a demonstração do GA e a execução de genomas campeões.

let populacao = [];
let geracao = 1;
let canos = [];
let cenariosTreino = [];
let indiceCenarioTreino = 0;
let framesCenario = 0;
let proximoCanoId = 0;
let historicoGrafico = [];
let historicoResumo = [];
let melhorFitnessGlobal = 0;
let melhorGenomaGlobal = null;
let melhorCanosGlobal = 0;
let geracaoMelhorGlobal = 0;
let geracoesSemMelhora = 0;
let velocidadeAtual = 1;
let modoAtual = 'evolucao';
let treinamentoParado = false;
let motivoParadaTreinamento = '';
let campeaoCarregado = null;
let demoPassaro = null;
let demoCanos = [];
let demoMorteTs = null;
let frameAgendado = false;

const DEMO_ESPERA_MS = 1000;
const CANOS_POR_CENARIO = 500;


function inicializar() {
  configurarBotoes();
  iniciarTreinamento();
  agendarFrame();
}

function agendarFrame() {
  if (frameAgendado) return;
  frameAgendado = true;
  requestAnimationFrame(loop);
}

function criarCenarios(quantidade) {
  const meioVao = CONFIG_JOGO.CANO_VAO / 2;
  const margem = 40;
  const yMin = meioVao + margem;
  const yMax = CONFIG_JOGO.ALTURA - meioVao - margem;
  return Array.from({ length: quantidade }, () => ({
    yInicial: 100 + Math.random() * (CONFIG_JOGO.ALTURA - 200),
    vaos: Array.from(
      { length: CANOS_POR_CENARIO },
      () => yMin + Math.random() * (yMax - yMin)
    ),
  }));
}

function criarCanoDoCenario(cenario, id) {
  const cano = new Cano(CONFIG_JOGO.LARGURA, cenario.vaos[id]);
  cano.idCenario = id;
  return cano;
}

function iniciarEpisodio(individuo, indice) {
  const cenario = cenariosTreino[indice];
  individuo.indiceCenario = indice;
  individuo.passaro = new Passaro(individuo.genoma, cenario.yInicial);
  individuo.vivo = true;
}

function criarIndividuo(genoma) {
  const individuo = {
    genoma,
    fitness: 0,
    canosUltrapassados: 0,
    minimoCanos: 0,
    distanciaPercorrida: 0,
    vivo: true,
    indiceCenario: 0,
    resultados: [],
    fitnessAcumulado: 0,
    passaro: null,
  };
  return individuo;
}

function iniciarCenarioTreino(indice) {
  indiceCenarioTreino = indice;
  framesCenario = 0;
  canos = [criarCanoDoCenario(cenariosTreino[indice], 0)];
  proximoCanoId = 1;
  for (const individuo of populacao) iniciarEpisodio(individuo, indice);
}

function iniciarTreinamento() {
  cenariosTreino = criarCenarios(CONFIG_GA.CENARIOS_TREINO);
  populacao = Array.from(
    { length: CONFIG_GA.TAMANHO_POPULACAO },
    () => criarIndividuo(genomaAleatorio())
  );
  iniciarCenarioTreino(0);
  geracao = 1;
  historicoGrafico = [];
  historicoResumo = [];
  melhorFitnessGlobal = 0;
  melhorGenomaGlobal = null;
  melhorCanosGlobal = 0;
  geracaoMelhorGlobal = 0;
  geracoesSemMelhora = 0;
  treinamentoParado = false;
  motivoParadaTreinamento = '';
  desenharGrafico([]);
  atualizarBotoesParaModo();
  atualizarPainelEvolucao();
}

function loop() {
  frameAgendado = false;
  const inicio = performance.now();
  let ticks = 0;

  while (
    modoAtual === 'evolucao' &&
    !treinamentoParado &&
    ticks < velocidadeAtual &&
    performance.now() - inicio < CONFIG_LOOP.LIMITE_MS
  ) {
    atualizarTreinamento();
    ticks++;
  }

  if (modoAtual === 'evolucao') {
    desenharCenario(
      populacao.map(individuo => individuo.passaro),
      canos,
      true
    );
    atualizarPainelEvolucao();
  } else {
    rodarFrameDemo();
    desenharCenario(demoPassaro ? [demoPassaro] : [], demoCanos);
    atualizarPainelDemo();
  }

  if (modoAtual === 'demo' || !treinamentoParado) agendarFrame();
}

function escolherRepresentante() {
  if (populacao.length === 0) return null;
  return populacao.reduce((melhor, individuo) =>
    individuo.fitness > melhor.fitness ? individuo : melhor
  );
}

function atualizarFitnessProvisoria(individuo) {
  const passaro = individuo.passaro;
  const fitnessAtual =
    CONFIG_JOGO.FITNESS_PESO_CANOS * passaro.canosUltrapassados +
    passaro.distanciaPercorrida;
  individuo.fitness =
    (individuo.fitnessAcumulado + fitnessAtual) / CONFIG_GA.CENARIOS_TREINO;
}

function finalizarEpisodio(individuo) {
  const passaro = individuo.passaro;
  const fitness =
    CONFIG_JOGO.FITNESS_PESO_CANOS * passaro.canosUltrapassados +
    passaro.distanciaPercorrida;
  individuo.resultados.push({
    canos: passaro.canosUltrapassados,
    distancia: passaro.distanciaPercorrida,
    fitness,
  });
  individuo.fitnessAcumulado += fitness;
  individuo.fitness =
    individuo.fitnessAcumulado / CONFIG_GA.CENARIOS_TREINO;
  individuo.minimoCanos = Math.min(
    ...individuo.resultados.map(resultado => resultado.canos)
  );
  individuo.canosUltrapassados = individuo.minimoCanos;
  individuo.vivo = false;
  passaro.vivo = false;

  if (individuo.resultados.length === cenariosTreino.length) {
    individuo.fitness =
      individuo.fitnessAcumulado / cenariosTreino.length;
    individuo.distanciaPercorrida =
      individuo.resultados.reduce((soma, resultado) =>
        soma + resultado.distancia, 0
      ) / cenariosTreino.length;
  }
}

function atualizarTreinamento() {
  for (const individuo of populacao) {
    if (!individuo.vivo) continue;
    const passaro = individuo.passaro;

    const percepcao = perceber(passaro, canos);
    passaro.aplicarFisica(decidir(passaro.genoma, {
      y: passaro.y,
      vy: passaro.vy,
      dx: percepcao.dx,
      yVao: percepcao.yVao,
    }));

    if (passaro.colidiuComTetoOuChao()) {
      finalizarEpisodio(individuo);
    }
  }

  if (populacao.every(individuo => !individuo.vivo)) {
    avancarCenarioTreino();
    return;
  }

  for (const cano of canos) cano.mover();
  canos = canos.filter(cano => !cano.saiuDaTela());

  const cenario = cenariosTreino[indiceCenarioTreino];
  if (canos.length === 0) {
    canos.push(criarCanoDoCenario(cenario, proximoCanoId++));
  } else {
    const ultimo = canos[canos.length - 1];
    if (ultimo.x <= CONFIG_JOGO.LARGURA - CONFIG_JOGO.CANO_ESPACAMENTO) {
      canos.push(criarCanoDoCenario(cenario, proximoCanoId++));
    }
  }

  for (const individuo of populacao) {
    if (!individuo.vivo) continue;
    const passaro = individuo.passaro;
    let colidiu = false;
    for (const cano of canos) {
      if (colidiuComCano(passaro, cano)) {
        colidiu = true;
        break;
      }
    }
    if (colidiu) {
      finalizarEpisodio(individuo);
      continue;
    }

    for (const cano of canos) {
      if (
        cano.x + CONFIG_JOGO.CANO_LARGURA < passaro.x &&
        cano.idCenario > passaro.ultimoCanoContado
      ) {
        passaro.canosUltrapassados++;
        passaro.ultimoCanoContado = cano.idCenario;
      }
    }
    passaro.atualizarFitness();
    atualizarFitnessProvisoria(individuo);
  }

  framesCenario++;
  if (framesCenario >= CONFIG_GA.MAX_FRAMES_POR_GERACAO) {
    for (const individuo of populacao) {
      if (individuo.vivo) finalizarEpisodio(individuo);
    }
  }

  if (populacao.every(individuo => !individuo.vivo)) avancarCenarioTreino();
}

function avancarCenarioTreino() {
  const proximoIndice = indiceCenarioTreino + 1;
  if (proximoIndice < cenariosTreino.length) {
    iniciarCenarioTreino(proximoIndice);
    return;
  }
  finalizarGeracao();
}

function finalizarGeracao() {
  const melhorPassaro = populacao.reduce((melhor, individuo) =>
    individuo.fitness > melhor.fitness ? individuo : melhor
  );
  const melhor = melhorPassaro.fitness;
  const media = populacao.reduce((soma, individuo) =>
    soma + individuo.fitness, 0
  ) / populacao.length;

  historicoGrafico.push({ geracao, melhor, media });
  historicoResumo.push({
    geracao,
    melhorFitness: melhor,
    mediaFitness: media,
    melhorCanos: melhorPassaro.minimoCanos,
    melhorGenoma: melhorPassaro.genoma.slice(),
  });

  if (melhor > melhorFitnessGlobal) {
    melhorFitnessGlobal = melhor;
    melhorGenomaGlobal = melhorPassaro.genoma.slice();
    melhorCanosGlobal = melhorPassaro.minimoCanos;
    geracaoMelhorGlobal = geracao;
    geracoesSemMelhora = 0;
  } else {
    geracoesSemMelhora++;
  }

  desenharGrafico(historicoGrafico);
  atualizarBotoesParaModo();

  let motivoParada = '';
  if (melhorPassaro.minimoCanos >= CONFIG_GA.META_CANOS) {
    motivoParada = 'Meta de ' + CONFIG_GA.META_CANOS +
      ' canos nos ' + CONFIG_GA.CENARIOS_TREINO + ' cenários';
  } else if (geracao >= CONFIG_GA.MAX_GERACOES) {
    motivoParada = 'Limite de ' + CONFIG_GA.MAX_GERACOES + ' gerações';
  } else if (geracoesSemMelhora >= CONFIG_GA.GERACOES_SEM_MELHORA) {
    motivoParada = geracoesSemMelhora + ' gerações sem melhora';
  }

  if (motivoParada) {
    treinamentoParado = true;
    motivoParadaTreinamento = motivoParada;
    atualizarPainel({
      modo: 'Evolução',
      geracao,
      cenario: cenariosTreino.length + '/' + cenariosTreino.length,
      vivos: 0,
      melhorFitness: Math.round(melhor),
      mediaFitness: Math.round(media),
      melhorCanos: melhorPassaro.minimoCanos,
      status: 'PARADO: ' + motivoParada,
    });
    atualizarBotoesParaModo();
    return;
  }

  const novosGenomas = construirNovaGeracao(populacao);
  geracao++;
  populacao = novosGenomas.map(criarIndividuo);
  iniciarCenarioTreino(0);
}

function perceber(passaro, listaCanos) {
  for (const cano of listaCanos) {
    if (cano.x + CONFIG_JOGO.CANO_LARGURA > passaro.x) {
      return {
        dx: cano.x - (passaro.x + CONFIG_JOGO.PASSARO_LARGURA),
        yVao: cano.yVao,
      };
    }
  }
  return { dx: CONFIG_JOGO.LARGURA, yVao: CONFIG_JOGO.ALTURA / 2 };
}

function atualizarPainelEvolucao() {
  const vivos = populacao.filter(individuo => individuo.vivo).length;
  const melhorAtual = populacao.reduce((melhor, individuo) =>
    Math.max(melhor, individuo.fitness), 0
  );
  const mediaAtual = populacao.length === 0 ? 0 :
    populacao.reduce((soma, individuo) =>
      soma + individuo.fitness, 0
    ) / populacao.length;
  const representante = escolherRepresentante();
  atualizarPainel({
    modo: 'Evolução',
    geracao,
    cenario: (indiceCenarioTreino + 1) + '/' + cenariosTreino.length,
    vivos,
    melhorFitness: Math.round(Math.max(melhorFitnessGlobal, melhorAtual)),
    mediaFitness: Math.round(mediaAtual),
    melhorCanos: melhorCanosGlobal ||
      (representante ? representante.passaro.canosUltrapassados : 0),
    status: treinamentoParado
      ? 'PARADO: ' + motivoParadaTreinamento
      : 'Rodando (demonstração JS)',
  });
}

function atualizarPainelDemo() {
  if (!demoPassaro) return;
  demoPassaro.atualizarFitness();
  atualizarPainel({
    modo: 'Demo',
    geracao: '—',
    cenario: '—',
    vivos: demoPassaro.vivo ? 1 : 0,
    melhorFitness: Math.round(demoPassaro.fitness),
    mediaFitness: '—',
    melhorCanos: demoPassaro.canosUltrapassados,
    status: demoPassaro.vivo ? 'Rodando (campeão)' :
      'Pássaro morreu — reiniciando...',
  });
}

function configurarBotoes() {
  botoesVelocidade.forEach(botao => {
    botao.addEventListener('click', () => {
      velocidadeAtual = parseInt(botao.dataset.velocidade, 10);
      destacarBotaoVelocidade(velocidadeAtual);
    });
  });

  btnSalvarCampeao.addEventListener('click', salvarCampeao);
  btnCarregarCampeao.addEventListener('click', () => {
    document.getElementById('input-carregar-campeao').click();
  });
  document.getElementById('input-carregar-campeao').addEventListener(
    'change',
    evento => {
      const arquivo = evento.target.files[0];
      if (arquivo) carregarCampeao(arquivo);
      evento.target.value = '';
    }
  );

  btnDemo.addEventListener('click', iniciarDemo);
  btnPararDemo.addEventListener('click', pararDemo);
  btnReset.addEventListener('click', () => {
    if (!confirm('Recomeçar a demonstração do algoritmo do zero?')) return;
    modoAtual = 'evolucao';
    demoPassaro = null;
    demoCanos = [];
    demoMorteTs = null;
    campeaoCarregado = null;
    iniciarTreinamento();
    agendarFrame();
  });

  window.aoClicarExportar = () => exportarCSV(historicoResumo);
}

function atualizarBotoesParaModo() {
  if (modoAtual === 'demo') {
    btnSalvarCampeao.disabled = true;
    btnDemo.disabled = true;
    btnPararDemo.disabled = false;
    return;
  }
  btnSalvarCampeao.disabled = melhorGenomaGlobal === null;
  btnDemo.disabled = campeaoCarregado === null;
  btnPararDemo.disabled = true;
}

function salvarCampeao() {
  if (!melhorGenomaGlobal) {
    alert('Ainda não há campeão. Aguarde o fim da primeira geração.');
    return;
  }
  baixarJSON({
    formato: 'flappy-ga-campeao-v2',
    data: new Date().toISOString(),
    genoma: melhorGenomaGlobal.map(valor => Number(valor.toFixed(6))),
    fitness: Math.floor(melhorFitnessGlobal),
    geracao: geracaoMelhorGlobal,
    origem: 'demonstracao-js',
  }, 'campeao.json');
}

function baixarJSON(dados, nomeArquivo) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function carregarCampeao(arquivo) {
  const leitor = new FileReader();
  leitor.onload = evento => {
    try {
      const dados = JSON.parse(evento.target.result);
      if (
        !dados ||
        dados.formato !== 'flappy-ga-campeao-v2' ||
        !Array.isArray(dados.genoma) ||
        dados.genoma.length !== TAMANHO_GENOMA
      ) {
        throw new Error(
          'Formato inválido ou incompatível. Treine um campeão no modelo v2.'
        );
      }
      const genoma = dados.genoma.map(Number);
      if (genoma.some(valor => !Number.isFinite(valor))) {
        throw new Error('Genoma contém valores não numéricos.');
      }
      campeaoCarregado = genoma;
      atualizarBotoesParaModo();
      alert(
        'Campeão carregado!' +
        (dados.geracao ? ' (geração ' + dados.geracao + ')' : '') +
        '\nMínimo validado: ' +
        (dados.canosMinimosValidacao ?? 'não informado') +
        ' canos.\n\nClique em "▶ Rodar campeão".'
      );
    } catch (erro) {
      alert('Erro: ' + erro.message);
    }
  };
  leitor.onerror = () => alert('Não foi possível ler o arquivo.');
  leitor.readAsText(arquivo);
}

function iniciarDemo() {
  if (!campeaoCarregado) return;
  modoAtual = 'demo';
  demoPassaro = new Passaro(
    campeaoCarregado.slice(),
    100 + Math.random() * (CONFIG_JOGO.ALTURA - 200)
  );
  demoCanos = [criarCanoAleatorio(CONFIG_JOGO.LARGURA)];
  demoMorteTs = null;
  atualizarBotoesParaModo();
  agendarFrame();
}

function pararDemo() {
  modoAtual = 'evolucao';
  demoPassaro = null;
  demoCanos = [];
  demoMorteTs = null;
  atualizarBotoesParaModo();
  agendarFrame();
}

function rodarFrameDemo() {
  if (!demoPassaro) return;

  if (!demoPassaro.vivo) {
    if (demoMorteTs !== null && Date.now() - demoMorteTs > DEMO_ESPERA_MS) {
      demoPassaro = new Passaro(
        campeaoCarregado.slice(),
        100 + Math.random() * (CONFIG_JOGO.ALTURA - 200)
      );
      demoCanos = [criarCanoAleatorio(CONFIG_JOGO.LARGURA)];
      demoMorteTs = null;
    }
    return;
  }

  const inicio = performance.now();
  let ticks = 0;
  while (
    ticks < velocidadeAtual &&
    performance.now() - inicio < CONFIG_LOOP.LIMITE_MS &&
    demoPassaro.vivo
  ) {
    const percepcao = perceber(demoPassaro, demoCanos);
    demoPassaro.aplicarFisica(decidir(demoPassaro.genoma, {
      y: demoPassaro.y,
      vy: demoPassaro.vy,
      dx: percepcao.dx,
      yVao: percepcao.yVao,
    }));
    ticks++;

    if (demoPassaro.colidiuComTetoOuChao()) {
      encerrarDemoPassaro();
      break;
    }

    for (const cano of demoCanos) cano.mover();
    demoCanos = demoCanos.filter(cano => !cano.saiuDaTela());
    if (demoCanos.length === 0) {
      demoCanos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
    } else {
      const ultimo = demoCanos[demoCanos.length - 1];
      if (ultimo.x <= CONFIG_JOGO.LARGURA - CONFIG_JOGO.CANO_ESPACAMENTO) {
        demoCanos.push(criarCanoAleatorio(CONFIG_JOGO.LARGURA));
      }
    }

    for (const cano of demoCanos) {
      if (colidiuComCano(demoPassaro, cano)) {
        encerrarDemoPassaro();
        break;
      }
    }
    if (!demoPassaro.vivo) break;

    for (const cano of demoCanos) {
      if (verificarPassouCano(demoPassaro, cano)) {
        demoPassaro.canosUltrapassados++;
      }
    }
  }
}

function encerrarDemoPassaro() {
  demoPassaro.vivo = false;
  demoPassaro.atualizarFitness();
  demoMorteTs = Date.now();
}

window.addEventListener('load', inicializar);

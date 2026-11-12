// O genoma codifica os pesos de cinco sensores e um bias.
const TAMANHO_GENOMA = 6;

function genomaAleatorio() {
  const genoma = [];
  for (let i = 0; i < TAMANHO_GENOMA; i++) {
    genoma.push(Math.random() * 2 - 1);
  }
  return genoma;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function sigmoide(z) {
  return 1 / (1 + Math.exp(-z));
}

function decidir(genoma, estado) {
  const H = CONFIG_JOGO.ALTURA;
  const x1 = estado.y / H;
  const x2 = limitar(estado.vy / CONFIG_JOGO.V_MAX, -1, 1);
  const x3 = limitar(
    estado.dx /
      (CONFIG_JOGO.CANO_VELOCIDADE * CONFIG_JOGO.HORIZONTE_REACAO_FRAMES),
    -1,
    1
  );
  const x4 = estado.yVao / H;
  const x5 = limitar(
    (estado.y + CONFIG_JOGO.PASSARO_ALTURA / 2 - estado.yVao) / (H / 2),
    -1,
    1
  );

  const z =
    genoma[0] * x1 +
    genoma[1] * x2 +
    genoma[2] * x3 +
    genoma[3] * x4 +
    genoma[4] * x5 +
    genoma[5];

  return sigmoide(z) > 0.5;
}

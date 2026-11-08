// ============================================================================
// config.js
// ----------------------------------------------------------------------------
// Todos os parâmetros numéricos do projeto, em UM SÓ LUGAR.
// Aqui NÃO existe lógica: nenhuma função, nenhum cálculo. Apenas constantes.
//
// Ajustes desta versão (Fase 2):
//   - Gravidade menor → pássaro cai mais devagar → mais fácil sobreviver
//   - Vão do cano maior → mais fácil de passar
//   - Canos mais rápidos e mais próximos → chegam antes no pássaro
//   - Torneio k maior → mais pressão seletiva → converge mais rápido
//   - População um pouco maior → mais diversidade inicial
// ============================================================================


const CONFIG_JOGO = {

  // ---- Canvas ----
  LARGURA: 800,
  ALTURA:  600,

  // ---- Física do pássaro (seção C.2) ----
  GRAVIDADE: 0.4,          // era 0.5 → agora cai mais devagar
  V_SALTO:   7,            // era 8 → pulo proporcional à gravidade nova
  V_MAX:     12,

  // ---- Dimensões do pássaro ----
  PASSARO_LARGURA: 26,
  PASSARO_ALTURA:  20,

  // ---- Canos ----
  CANO_LARGURA:      60,
  CANO_VAO:         200,   // era 160 → vão mais largo, mais fácil
  CANO_VELOCIDADE:  3.5,   // era 2.5 → canos chegam mais cedo
  CANO_ESPACAMENTO: 240,   // era 300 → cano novo aparece antes

  // ---- Fitness (seção D.2) ----
  FITNESS_PESO_CANOS: 100,

};


const CONFIG_GA = {

  // ---- População e gerações ----
  TAMANHO_POPULACAO: 60,   // era 50 → mais diversidade
  MAX_GERACOES:     100,
  META_CANOS:        50,
  GERACOES_SEM_MELHORA: 20,

  // ---- Elitismo (seção E.2) ----
  ELITES: 2,

  // ---- Seleção por torneio (seção E.3) ----
  TORNEIO_K: 5,            // era 3 → pressão maior, converge mais rápido

  // ---- Cruzamento (seção F.4) ----
  TAXA_CRUZAMENTO: 0.9,

  // ---- Mutação (seções G.2 e G.3) ----
  TAXA_MUTACAO:  0.1,
  SIGMA_MUTACAO: 0.3,
  LIMITE_GENE:   5,

};


// ============================================================================
// CONFIGURAÇÕES DO LOOP DE SIMULAÇÃO
// ----------------------------------------------------------------------------
// LIMITE_MS: quanto tempo, em milissegundos, o loop pode gastar fazendo
// updates de física a cada frame visual. Serve como "freio de segurança":
// em velocidade 100×, se os 100 updates demorarem mais que isso, o loop
// para de fazer updates e só desenha, evitando travar o navegador.
// ============================================================================

const CONFIG_LOOP = {
  LIMITE_MS: 12,
};
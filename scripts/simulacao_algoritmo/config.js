// ============================================================================
// config.js
// ----------------------------------------------------------------------------
// Todos os parâmetros numéricos do projeto, em UM SÓ LUGAR.
// Aqui NÃO existe lógica: nenhuma função, nenhum cálculo. Apenas constantes.
//
// Os parâmetros de treinamento devem permanecer sincronizados com
// treino_cpp/treinar.cpp. O treinador C++ é a referência para os campeões;
// no navegador, os mesmos parâmetros são usados na demonstração visual.
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

  // ---- Percepção do agente ----
  HORIZONTE_REACAO_FRAMES: 120,

  // ---- Fitness (seção D.2) ----
  FITNESS_PESO_CANOS: 1000,

};


const CONFIG_GA = {

  // ---- População e gerações ----
  TAMANHO_POPULACAO: 80,
  MAX_GERACOES:     1000,
  META_CANOS:        100,
  GERACOES_SEM_MELHORA: 200,
  MAX_FRAMES_POR_GERACAO: 30000,
  CENARIOS_TREINO: 32,
  CENARIOS_VALIDACAO: 20,

  // ---- Elitismo (seção E.2) ----
  ELITES: 2,

  // ---- Seleção por torneio (seção E.3) ----
  TORNEIO_K: 3,

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
// LIMITE_MS: orçamento de atualização por quadro visual. Um limite curto
// mantém a interface responsiva mesmo nas velocidades de demonstração altas.
// ============================================================================

const CONFIG_LOOP = {
  LIMITE_MS: 4,
};
// Treinador offline do Flappy Bird. Os parâmetros espelham config.js.
#include <algorithm>
#include <array>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <random>
#include <stdexcept>
#include <vector>
using namespace std;

constexpr int LARGURA = 800, ALTURA = 600;
constexpr double GRAVIDADE = 0.4, V_SALTO = 7.0, V_MAX = 12.0;
constexpr int PASSARO_LARGURA = 26, PASSARO_ALTURA = 20, PASSARO_X = 120;
constexpr int CANO_LARGURA = 60, CANO_VAO = 200;
constexpr double CANO_VELOCIDADE = 3.5, CANO_ESPACAMENTO = 240;
constexpr int HORIZONTE_REACAO_FRAMES = 120;
constexpr int FITNESS_PESO_CANOS = 1000;

constexpr int TAMANHO_POPULACAO = 80;
constexpr int MAX_GERACOES = 1000;
constexpr int META_CANOS = 100;
constexpr int GERACOES_SEM_MELHORA = 200;
constexpr int CENARIOS_TREINO = 32;
constexpr int CENARIOS_VALIDACAO = 20;
constexpr int MAX_FRAMES_POR_GERACAO = 30000;
constexpr int ELITES = 2, TORNEIO_K = 3;
constexpr double TAXA_CRUZAMENTO = 0.9, TAXA_MUTACAO = 0.1;
constexpr double SIGMA_MUTACAO = 0.3, LIMITE_GENE = 5.0;
constexpr int TAMANHO_GENOMA = 6;
constexpr int CANOS_POR_CENARIO = 500;
constexpr uint32_t SEMENTE_GA = 42;
constexpr uint32_t SEMENTE_CENARIOS = 20261108;

using Genoma = array<double, TAMANHO_GENOMA>;
mt19937 rng(SEMENTE_GA);
uniform_real_distribution<double> U(0.0, 1.0);
normal_distribution<double> N01(0.0, 1.0);

struct Cano {
  double x, yVao, yVaoSup, yVaoInf;
  int id;
};

struct Passaro {
  Genoma genoma;
  double x = PASSARO_X;
  double y, vy = 0, distancia = 0;
  int canos = 0;
  int ultimoCanoContado = -1;

  Passaro(const Genoma& g, double yInicial) : genoma(g), y(yInicial) {}
};

struct Cenario {
  double yInicial;
  vector<double> vaos;
};

struct ResultadoEpisodio {
  int canos;
  double distancia;
};

struct Individuo {
  Genoma genoma;
  double fitness = 0;
  double mediaCanos = 0;
  double mediaDistancia = 0;
  int minimoCanos = 0;
};

Genoma genomaAleatorio() {
  Genoma genoma;
  for (double& gene : genoma) gene = U(rng) * 2 - 1;
  return genoma;
}

double limitar(double valor, double minimo, double maximo) {
  return max(minimo, min(maximo, valor));
}

vector<Cenario> criarCenarios(int quantidade, uint32_t semente) {
  mt19937 gerador(semente);
  uniform_real_distribution<double> uniforme(0.0, 1.0);
  vector<Cenario> cenarios;
  cenarios.reserve(quantidade);

  const double margem = 40;
  const double yMin = CANO_VAO / 2.0 + margem;
  const double yMax = ALTURA - CANO_VAO / 2.0 - margem;

  for (int i = 0; i < quantidade; i++) {
    Cenario cenario;
    cenario.yInicial = 100 + uniforme(gerador) * (ALTURA - 200);
    cenario.vaos.reserve(CANOS_POR_CENARIO);
    for (int j = 0; j < CANOS_POR_CENARIO; j++) {
      cenario.vaos.push_back(yMin + uniforme(gerador) * (yMax - yMin));
    }
    cenarios.push_back(move(cenario));
  }
  return cenarios;
}

Cano criarCano(double x, int id, const Cenario& cenario) {
  if (id < 0 || id >= static_cast<int>(cenario.vaos.size())) {
    throw out_of_range("A sequência do cenário não contém canos suficientes.");
  }
  const double yVao = cenario.vaos[id];
  const double meio = CANO_VAO / 2.0;
  return {x, yVao, yVao - meio, yVao + meio, id};
}

pair<double, double> perceber(const Passaro& passaro,
                              const vector<Cano>& canos) {
  for (const Cano& cano : canos) {
    if (cano.x + CANO_LARGURA > passaro.x) {
      const double distanciaBorda =
          cano.x - (passaro.x + PASSARO_LARGURA);
      return {distanciaBorda, cano.yVao};
    }
  }
  return {static_cast<double>(LARGURA), ALTURA / 2.0};
}

bool decidir(const Genoma& genoma, const Passaro& passaro,
             double dx, double yVao) {
  const double x1 = passaro.y / ALTURA;
  const double x2 = limitar(passaro.vy / V_MAX, -1.0, 1.0);
  const double x3 = limitar(
      dx / (CANO_VELOCIDADE * HORIZONTE_REACAO_FRAMES), -1.0, 1.0);
  const double x4 = yVao / ALTURA;
  const double x5 = limitar(
      (passaro.y + PASSARO_ALTURA / 2.0 - yVao) / (ALTURA / 2.0),
      -1.0, 1.0);
  const double z = genoma[0] * x1 + genoma[1] * x2 + genoma[2] * x3 +
                   genoma[3] * x4 + genoma[4] * x5 + genoma[5];
  return 1.0 / (1.0 + exp(-z)) > 0.5;
}

void aplicarFisica(Passaro& passaro, bool pulou) {
  passaro.vy += GRAVIDADE;
  if (pulou) passaro.vy = -V_SALTO;
  passaro.y += passaro.vy;
  passaro.distancia += CANO_VELOCIDADE;
}

bool colidiuTetoChao(const Passaro& passaro) {
  return passaro.y < 0 || passaro.y + PASSARO_ALTURA > ALTURA;
}

bool colidiuCano(const Passaro& passaro, const Cano& cano) {
  const bool sobrepoeX =
      passaro.x + PASSARO_LARGURA > cano.x &&
      passaro.x < cano.x + CANO_LARGURA;
  if (!sobrepoeX) return false;
  return passaro.y < cano.yVaoSup ||
         passaro.y + PASSARO_ALTURA > cano.yVaoInf;
}

ResultadoEpisodio avaliarEpisodio(const Genoma& genoma,
                                   const Cenario& cenario) {
  Passaro passaro(genoma, cenario.yInicial);
  vector<Cano> canos{criarCano(LARGURA, 0, cenario)};
  int proximoCanoId = 1;

  // Keep evaluating beyond the success target so fitness can reward robustness.
  for (int frame = 0; frame < MAX_FRAMES_POR_GERACAO; frame++) {
    const auto [dx, yVao] = perceber(passaro, canos);
    aplicarFisica(passaro, decidir(genoma, passaro, dx, yVao));
    if (colidiuTetoChao(passaro)) break;

    for (Cano& cano : canos) cano.x -= CANO_VELOCIDADE;
    canos.erase(remove_if(canos.begin(), canos.end(),
                          [](const Cano& cano) {
                            return cano.x + CANO_LARGURA < 0;
                          }),
                canos.end());

    if (canos.empty()) {
      canos.push_back(criarCano(LARGURA, proximoCanoId++, cenario));
    } else if (canos.back().x <= LARGURA - CANO_ESPACAMENTO) {
      canos.push_back(criarCano(LARGURA, proximoCanoId++, cenario));
    }

    bool colidiu = false;
    for (const Cano& cano : canos) {
      if (colidiuCano(passaro, cano)) {
        colidiu = true;
        break;
      }
    }
    if (colidiu) break;

    for (const Cano& cano : canos) {
      if (cano.x + CANO_LARGURA < passaro.x &&
          cano.id > passaro.ultimoCanoContado) {
        passaro.canos++;
        passaro.ultimoCanoContado = cano.id;
      }
    }
  }
  return {passaro.canos, passaro.distancia};
}

Individuo avaliarGenoma(const Genoma& genoma,
                        const vector<Cenario>& cenarios) {
  Individuo individuo;
  individuo.genoma = genoma;
  individuo.minimoCanos = META_CANOS;
  double somaFitness = 0;

  // Every genome uses the same scenario set for a fair population comparison.
  for (const Cenario& cenario : cenarios) {
    const ResultadoEpisodio resultado = avaliarEpisodio(genoma, cenario);
    individuo.mediaCanos += resultado.canos;
    individuo.mediaDistancia += resultado.distancia;
    individuo.minimoCanos = min(individuo.minimoCanos, resultado.canos);
    somaFitness += FITNESS_PESO_CANOS * resultado.canos + resultado.distancia;
  }

  const double quantidade = static_cast<double>(cenarios.size());
  individuo.mediaCanos /= quantidade;
  individuo.mediaDistancia /= quantidade;
  individuo.fitness = somaFitness / quantidade;
  return individuo;
}

int torneio(const vector<int>& ordem, const vector<Individuo>& populacao) {
  int vencedor = -1;
  for (int i = 0; i < TORNEIO_K; i++) {
    const int indice = ordem[static_cast<int>(U(rng) * ordem.size())];
    if (vencedor == -1 ||
        populacao[indice].fitness > populacao[vencedor].fitness) {
      vencedor = indice;
    }
  }
  return vencedor;
}

Genoma cruzarUniforme(const Genoma& paiA, const Genoma& paiB) {
  Genoma filho;
  for (int i = 0; i < TAMANHO_GENOMA; i++) {
    filho[i] = U(rng) < 0.5 ? paiA[i] : paiB[i];
  }
  return filho;
}

void mutar(Genoma& genoma) {
  for (double& gene : genoma) {
    if (U(rng) < TAXA_MUTACAO) gene += N01(rng) * SIGMA_MUTACAO;
    gene = limitar(gene, -LIMITE_GENE, LIMITE_GENE);
  }
}

vector<Genoma> novaGeracao(const vector<Individuo>& populacao) {
  vector<int> ordem(populacao.size());
  iota(ordem.begin(), ordem.end(), 0);
  sort(ordem.begin(), ordem.end(),
       [&](int a, int b) {
         return populacao[a].fitness > populacao[b].fitness;
       });

  vector<Genoma> nova;
  nova.reserve(TAMANHO_POPULACAO);
  for (int i = 0; i < ELITES && i < static_cast<int>(ordem.size()); i++) {
    nova.push_back(populacao[ordem[i]].genoma);
  }

  while (static_cast<int>(nova.size()) < TAMANHO_POPULACAO) {
    const int ia = torneio(ordem, populacao);
    const int ib = torneio(ordem, populacao);
    Genoma filho = U(rng) < TAXA_CRUZAMENTO
                       ? cruzarUniforme(populacao[ia].genoma,
                                        populacao[ib].genoma)
                       : populacao[ia].genoma;
    mutar(filho);
    nova.push_back(filho);
  }
  return nova;
}

void salvarCampeao(const Individuo& campeao, int geracao,
                   int cenariosValidacao) {
  ofstream arquivo("campeao.json");
  if (!arquivo) throw runtime_error("Não foi possível criar campeao.json.");
  arquivo << "{\n"
          << "  \"formato\": \"flappy-ga-campeao-v2\",\n"
          << "  \"data\": \"treinado em C++\",\n"
          << "  \"genoma\": [";
  for (int i = 0; i < TAMANHO_GENOMA; i++) {
    if (i) arquivo << ", ";
    arquivo << fixed << setprecision(6) << campeao.genoma[i];
  }
  arquivo << "],\n"
          << "  \"fitness\": " << static_cast<int>(campeao.fitness) << ",\n"
          << "  \"geracao\": " << geracao << ",\n"
          << "  \"canosMinimosValidacao\": " << campeao.minimoCanos << ",\n"
          << "  \"mediaCanosValidacao\": " << fixed << setprecision(2)
          << campeao.mediaCanos << ",\n"
          << "  \"cenariosValidacao\": " << cenariosValidacao << ",\n"
          << "  \"meta100Atingida\": "
          << (campeao.minimoCanos >= META_CANOS ? "true" : "false") << "\n"
          << "}\n";
}

int main() {
  try {
    const vector<Cenario> cenariosTreino =
        criarCenarios(CENARIOS_TREINO, SEMENTE_CENARIOS);
    const vector<Cenario> cenariosValidacao =
        criarCenarios(CENARIOS_VALIDACAO, SEMENTE_CENARIOS + 1);

    cout << "=== GA Flappy Bird — treino robusto ===\n"
         << "População: " << TAMANHO_POPULACAO
         << " | Cenários comuns por genoma: " << CENARIOS_TREINO
         << " | Validação independente: " << CENARIOS_VALIDACAO
         << " | Meta: " << META_CANOS << " canos em todos os cenários\n";

    vector<Genoma> genomas(TAMANHO_POPULACAO);
    for (Genoma& genoma : genomas) genoma = genomaAleatorio();

    double melhorFitnessTreino = -1;
    int geracoesSemMelhora = 0;
    Individuo melhorValidado;
    melhorValidado.minimoCanos = -1;
    int geracaoMelhorValidado = 0;
    bool metaAtingida = false;

    for (int geracao = 1; geracao <= MAX_GERACOES; geracao++) {
      vector<Individuo> populacao;
      populacao.reserve(genomas.size());
      for (const Genoma& genoma : genomas) {
        populacao.push_back(avaliarGenoma(genoma, cenariosTreino));
      }

      const auto melhorAtual = max_element(
          populacao.begin(), populacao.end(),
          [](const Individuo& a, const Individuo& b) {
            return a.fitness < b.fitness;
          });

      if (melhorAtual->fitness > melhorFitnessTreino) {
        melhorFitnessTreino = melhorAtual->fitness;
        geracoesSemMelhora = 0;

        Individuo validado =
            avaliarGenoma(melhorAtual->genoma, cenariosValidacao);
        const bool melhorValidacao =
            validado.minimoCanos > melhorValidado.minimoCanos ||
            (validado.minimoCanos == melhorValidado.minimoCanos &&
             validado.mediaCanos > melhorValidado.mediaCanos);
        if (melhorValidacao) {
          melhorValidado = move(validado);
          geracaoMelhorValidado = geracao;
        }
        metaAtingida = melhorValidado.minimoCanos >= META_CANOS;
      } else {
        geracoesSemMelhora++;
      }

      if (geracao == 1 || geracao % 10 == 0 || metaAtingida) {
        cout << "Ger " << setw(4) << geracao
             << " | treino melhor=" << setw(8)
             << static_cast<int>(melhorAtual->fitness)
             << " | média canos=" << fixed << setprecision(1)
             << melhorAtual->mediaCanos
             << " | pior cenário=" << melhorAtual->minimoCanos
             << " | melhor validação=" << melhorValidado.minimoCanos
             << "/" << META_CANOS << "\n";
      }

      if (metaAtingida) break;
      if (geracao >= MAX_GERACOES) break;
      if (geracoesSemMelhora >= GERACOES_SEM_MELHORA) {
        cout << "Parada por estagnação após " << geracoesSemMelhora
             << " gerações sem melhora.\n";
        break;
      }
      genomas = novaGeracao(populacao);
    }

    if (melhorValidado.minimoCanos < 0) {
      throw runtime_error("Nenhum candidato foi avaliado.");
    }

    salvarCampeao(melhorValidado, geracaoMelhorValidado,
                  CENARIOS_VALIDACAO);
    cout << "\nMelhor candidato validado: mínimo="
         << melhorValidado.minimoCanos << " canos; média="
         << fixed << setprecision(1) << melhorValidado.mediaCanos
         << " canos em " << CENARIOS_VALIDACAO << " cenários.\n";
    if (metaAtingida) {
      cout << "META ATINGIDA: o campeão sobreviveu a pelo menos "
           << META_CANOS << " canos em todos os cenários de validação.\n";
    } else {
      cout << "META NÃO ATINGIDA. O JSON registra o melhor resultado medido; "
              "não apresente este campeão como tendo atingido 100 canos.\n";
    }
    cout << "Genoma:";
    for (double gene : melhorValidado.genoma) {
      cout << " " << fixed << setprecision(4) << gene;
    }
    cout << "\nCampeão salvo em campeao.json.\n";
    return metaAtingida ? 0 : 2;
  } catch (const exception& erro) {
    cerr << "Erro no treinamento: " << erro.what() << "\n";
    return 1;
  }
}

// ============================================================================
// treinar.cpp — Treinador GA offline para o Flappy Bird
// ----------------------------------------------------------------------------
// Compila: g++ -O2 -std=c++17 treinar.cpp -o treinar
// Roda:    ./treinar   (Windows: treinar.exe)
//
// Saída:   campeao.json  (mesmo formato que main.js carrega)
//
// CORREÇÃO APLICADA (v2):
//   Cada pássaro enfrenta SUA PRÓPRIA sequência de canos, gerada
//   individualmente. Isso elimina o overfitting em que o campeão só
//   era bom na sequência fixa usada na avaliação.
// ============================================================================
#include <algorithm>
#include <array>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <random>
#include <vector>
using namespace std;

// ---- Config (espelha config.js) ----
constexpr int    LARGURA = 800, ALTURA = 600;
constexpr double GRAVIDADE = 0.4, V_SALTO = 7.0, V_MAX = 12.0;
constexpr int    PASSARO_LARGURA = 26, PASSARO_ALTURA = 20, PASSARO_X = 120;
constexpr int    CANO_LARGURA = 60, CANO_VAO = 200;
constexpr double CANO_VELOCIDADE = 3.5, CANO_ESPACAMENTO = 240;
constexpr int    FITNESS_PESO_CANOS = 1000;

constexpr int    TAMANHO_POPULACAO = 60, MAX_GERACOES = 200;
constexpr int    META_CANOS = 50, GERACOES_SEM_MELHORA = 60;
constexpr int    ELITES = 2, TORNEIO_K = 3;
constexpr double TAXA_CRUZAMENTO = 0.9, TAXA_MUTACAO = 0.1;
constexpr double SIGMA_MUTACAO = 0.3, LIMITE_GENE = 5.0;
constexpr int    TAMANHO_GENOMA = 6;

// Segurança: se um pássaro ficar invencível, para o loop
constexpr int    MAX_FRAMES_POR_GERACAO = 20000;

using Genoma = array<double, TAMANHO_GENOMA>;

mt19937 rng(42);                              // semente fixa p/ reprodutibilidade
uniform_real_distribution<double> U(0.0, 1.0);
normal_distribution<double>       N01(0.0, 1.0);

// ---- Estruturas ----
struct Cano { double x, yVao, yVaoSup, yVaoInf; int id; };

struct Passaro {
  Genoma genoma;
  double x = PASSARO_X;
  double y, vy = 0, dist = 0, fitness = 0;
  bool   vivo = true;
  int    canos = 0;
  int    ultimoCanoContado = -1;
  Passaro(Genoma g, double y0) : genoma(g), y(y0) {}
};

// ---- Genoma ----
Genoma genomaAleatorio() {
  Genoma g;
  for (auto& v : g) v = U(rng) * 2 - 1;
  return g;
}

// ---- Cérebro (seções B.2–B.5) ----
bool decidir(const Genoma& g, double y, double vy, double dx, double yVao) {
  double x1 = y / ALTURA;
  double x2 = (vy + V_MAX) / (2 * V_MAX);
  double x3 = dx / LARGURA;
  double x4 = yVao / ALTURA;
  double x5 = (y - yVao + ALTURA) / (2 * ALTURA);
  double z  = g[0]*x1 + g[1]*x2 + g[2]*x3 + g[3]*x4 + g[4]*x5 + g[5];
  return 1.0 / (1.0 + exp(-z)) > 0.5;
}

// ---- Canos ----
Cano criarCano(double x, int id) {
  double meio = CANO_VAO / 2.0;
  double margem = 40;
  double yMin = meio + margem, yMax = ALTURA - meio - margem;
  double yVao = yMin + U(rng) * (yMax - yMin);
  return { x, yVao, yVao - meio, yVao + meio, id };
}

// ---- Física (seção C.2) ----
void aplicarFisica(Passaro& p, bool pulou) {
  p.vy += GRAVIDADE;
  if (pulou) p.vy = -V_SALTO;
  p.y += p.vy;
  p.dist += CANO_VELOCIDADE;
}

bool colidiuTetoChao(const Passaro& p) {
  return p.y < 0 || p.y + PASSARO_ALTURA > ALTURA;
}

bool colidiuCano(const Passaro& p, const Cano& c) {
  bool sx = (p.x + PASSARO_LARGURA > c.x) && (p.x < c.x + CANO_LARGURA);
  if (!sx) return false;
  return p.y < c.yVaoSup || (p.y + PASSARO_ALTURA) > c.yVaoInf;
}

double distancia(const Passaro& p, const vector<Cano>& cs) {
  double best = LARGURA;
  for (auto& c : cs) if (c.x + CANO_LARGURA > p.x) {
    double d = c.x - p.x;
    if (d >= 0 && d < best) best = d;
  }
  return best;
}

double alturaVao(const Passaro& p, const vector<Cano>& cs) {
  double best = LARGURA, yv = ALTURA / 2.0;
  for (auto& c : cs) if (c.x + CANO_LARGURA > p.x) {
    double d = c.x - p.x;
    if (d >= 0 && d < best) { best = d; yv = c.yVao; }
  }
  return yv;
}

// ============================================================================
// AVALIAÇÃO — v2: cada pássaro enfrenta SUA PRÓPRIA sequência de canos
// ----------------------------------------------------------------------------
// Antes: um único array de canos era compartilhado entre os 60 pássaros,
//        o que fazia o campeão memorizar aquela sequência específica.
// Agora: cada pássaro simula do zero, com canos sorteados individualmente.
//        Isso força o campeão a ser bom em QUALQUER sequência.
// ============================================================================
void avaliarPassaro(Passaro& p) {
  vector<Cano> canos;
  int canoIdSeq = 0;
  canos.push_back(criarCano(LARGURA, canoIdSeq++));

  for (int f = 0; f < MAX_FRAMES_POR_GERACAO; f++) {
    if (p.canos >= META_CANOS) { p.vivo = false; return; }

    bool pulou = decidir(p.genoma, p.y, p.vy,
                         distancia(p, canos), alturaVao(p, canos));
    aplicarFisica(p, pulou);

    if (colidiuTetoChao(p)) { p.vivo = false; return; }

    for (auto& c : canos) c.x -= CANO_VELOCIDADE;
    canos.erase(remove_if(canos.begin(), canos.end(),
                [](const Cano& c){ return c.x + CANO_LARGURA < 0; }),
                canos.end());
    if (canos.empty()) canos.push_back(criarCano(LARGURA, canoIdSeq++));
    else if (canos.back().x <= LARGURA - CANO_ESPACAMENTO)
      canos.push_back(criarCano(LARGURA, canoIdSeq++));

    for (auto& c : canos)
      if (colidiuCano(p, c)) { p.vivo = false; return; }

    for (auto& c : canos)
      if (c.x + CANO_LARGURA < p.x && c.id > p.ultimoCanoContado) {
        p.canos++;
        p.ultimoCanoContado = c.id;
      }
  }
}

void avaliarGeracao(vector<Passaro>& pop) {
  for (auto& p : pop) avaliarPassaro(p);
}

// ---- GA (seções E, F, G) ----
int torneio(const vector<int>& ordem, const vector<Passaro>& pop) {
  int venc = -1;
  for (int i = 0; i < TORNEIO_K; i++) {
    int idx = ordem[(int)(U(rng) * ordem.size())];
    if (venc == -1 || pop[idx].fitness > pop[venc].fitness) venc = idx;
  }
  return venc;
}

Genoma cruzarUniforme(const Genoma& a, const Genoma& b) {
  Genoma f;
  for (int j = 0; j < TAMANHO_GENOMA; j++) f[j] = (U(rng) < 0.5) ? a[j] : b[j];
  return f;
}

void mutar(Genoma& g) {
  for (auto& v : g) {
    if (U(rng) < TAXA_MUTACAO) v += N01(rng) * SIGMA_MUTACAO;
    v = max(-LIMITE_GENE, min(LIMITE_GENE, v));
  }
}

vector<Passaro> novaGeracao(const vector<Passaro>& pop) {
  vector<int> ordem(pop.size());
  iota(ordem.begin(), ordem.end(), 0);
  sort(ordem.begin(), ordem.end(),
       [&](int a, int b){ return pop[a].fitness > pop[b].fitness; });

  vector<Passaro> nova;
  for (int i = 0; i < ELITES && i < (int)ordem.size(); i++)
    nova.emplace_back(pop[ordem[i]].genoma, 100 + U(rng)*(ALTURA-200));

  while ((int)nova.size() < TAMANHO_POPULACAO) {
    int ia = torneio(ordem, pop), ib = torneio(ordem, pop);
    Genoma filho = (U(rng) < TAXA_CRUZAMENTO)
                     ? cruzarUniforme(pop[ia].genoma, pop[ib].genoma)
                     : pop[ia].genoma;
    mutar(filho);
    nova.emplace_back(filho, 100 + U(rng)*(ALTURA-200));
  }
  return nova;
}

void salvarCampeao(const Genoma& g, double fit, int ger) {
  ofstream f("campeao.json");
  f << "{\n  \"formato\": \"flappy-ga-campeao-v1\",\n";
  f << "  \"data\": \"treinado em C++\",\n  \"genoma\": [";
  for (int i = 0; i < TAMANHO_GENOMA; i++) {
    if (i) f << ", ";
    f << fixed << setprecision(6) << g[i];
  }
  f << "],\n  \"fitness\": " << (int)fit << ",\n";
  f << "  \"geracao\": " << ger << "\n}\n";
}

// ---- Main ----
int main() {
  cout << "=== GA Flappy Bird — treino C++ (v2, sem overfitting) ===\n";
  vector<Passaro> pop;
  for (int i = 0; i < TAMANHO_POPULACAO; i++)
    pop.emplace_back(genomaAleatorio(), 100 + U(rng)*(ALTURA-200));

  int gerSemMelhora = 0;
  double melhorGlobal = 0;
  int melhorCanosGlobal = 0;
  Genoma genomaGlobal{};
  int geracaoGlobal = 0;

  for (int ger = 1; ger <= MAX_GERACOES; ger++) {
    // Reset dos pássaros antes de avaliar
    for (auto& p : pop) {
      p.vivo = true;
      p.vy = 0;
      p.y = 100 + U(rng)*(ALTURA-200);
      p.canos = 0;
      p.dist = 0;
      p.fitness = 0;
      p.ultimoCanoContado = -1;
    }

    avaliarGeracao(pop);

    for (auto& p : pop)
      p.fitness = FITNESS_PESO_CANOS * p.canos + p.dist;

    double melhor = 0, soma = 0;
    int melhorCanos = 0;
    Genoma bestG{};
    for (auto& p : pop) {
      soma += p.fitness;
      if (p.fitness > melhor) {
        melhor = p.fitness;
        melhorCanos = p.canos;
        bestG = p.genoma;
      }
    }

    cout << "Ger " << setw(3) << ger
         << " | melhor=" << setw(8) << (int)melhor
         << " | media="  << setw(8) << (int)(soma/pop.size())
         << " | canos="  << melhorCanos << "\n";

    if (melhor > melhorGlobal) {
      melhorGlobal = melhor;
      melhorCanosGlobal = melhorCanos;
      genomaGlobal = bestG;
      geracaoGlobal = ger;
      gerSemMelhora = 0;
    } else {
      gerSemMelhora++;
    }

    if (melhorCanos >= META_CANOS) {
      cout << ">> META de " << META_CANOS << " canos atingida!\n";
      break;
    }
    if (gerSemMelhora >= GERACOES_SEM_MELHORA) {
      cout << ">> Estagnou (" << GERACOES_SEM_MELHORA << " gerações sem melhora).\n";
      break;
    }

    pop = novaGeracao(pop);
  }

  cout << "\nMelhor fitness: " << melhorGlobal
       << " (canos=" << melhorCanosGlobal << ", geração=" << geracaoGlobal << ")\n";
  cout << "Genoma: [";
  for (int i = 0; i < TAMANHO_GENOMA; i++) {
    if (i) cout << ", ";
    cout << fixed << setprecision(4) << genomaGlobal[i];
  }
  cout << "]\nSalvando campeao.json...\n";
  salvarCampeao(genomaGlobal, melhorGlobal, geracaoGlobal);
  cout << "OK. Abra o index.html, clique em 'Carregar campeao' e escolha o arquivo.\n";
}
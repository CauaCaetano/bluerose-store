// Personagem do Assistente IA (camisa branca; poses do dono em assistente-ia.webp, sem redesenho).
// Animação de pixel art: pixels nítidos, movimento em pixels inteiros, 10 quadros por segundo.
// Em cada situação ele escolhe uma das poses dela (parado, muda de atividade a cada 8 a 14 s); respira, o cabelo balança
// como ao vento, pisca de vez em quando e faz o gesto do momento (aceno, pulo, "não").
// Folha gerada por scratchpad/iaass/montar_branca.py: célula W×H, 6 por linha, cinto e faixa do cabelo de cada pose.
const W = 161, H = 209, POR_LINHA = 6, M = 8, QPS = 10; // M: folga em cima e embaixo para o pulinho
const POSES = ['conversando', 'ola', 'joia', 'duvida', 'pensando', 'ideia', 'pesquisando', 'analisando', 'verificando', 'listando', 'apresentando', 'naosei', 'confirmado', 'negativo', 'processando', 'concluido', 'trabalhando', 'pausa', 'lendo', 'anotando', 'estudando', 'podedeixar', 'tchau', 'conversando_pisca', 'pesquisando_pisca', 'apresentando_pisca', 'naosei_pisca', 'negativo_pisca'];
const CINTURA = { conversando: 112, ola: 111, joia: 111, duvida: 111, pensando: 112, ideia: 108, pesquisando: 110, analisando: 111, verificando: 112, listando: 111, apresentando: 111, naosei: 112, confirmado: 112, negativo: 112, processando: 112, concluido: 115, trabalhando: 121, pausa: 119, lendo: 120, anotando: 121, estudando: 119, podedeixar: 119, tchau: 118 };
const CABELO = { conversando: [20, 46, 41, 86], ola: [15, 39, 48, 101], joia: [9, 39, 50, 122], duvida: [14, 43, 39, 80], pensando: [21, 42, 43, 85], ideia: [18, 48, 38, 77], pesquisando: [9, 44, 51, 98], analisando: [9, 45, 53, 130], verificando: [14, 48, 50, 99], listando: [17, 44, 39, 78], apresentando: [17, 42, 92, 125], naosei: [24, 44, 48, 82], confirmado: [17, 43, 53, 98], negativo: [20, 48, 42, 85], processando: [21, 50, 37, 83], concluido: [26, 44, 49, 91], trabalhando: [31, 64, 46, 117], pausa: [35, 59, 43, 82], lendo: [35, 65, 42, 87], anotando: [36, 68, 54, 93], estudando: [42, 76, 37, 83], podedeixar: [33, 59, 44, 84], tchau: [31, 54, 45, 86] }; // [topo, testa, x0, x1]
const PISCA = new Set(['conversando', 'pesquisando', 'apresentando', 'naosei', 'negativo']);
const VENTO = [0, 0.5, 1, 1, 0.5, 0, -0.5, -1, -1, -0.5]; // balanço do cabelo (o topo vai até 3 pixels, a raiz fica parada)
// situação -> [poses possíveis, movimento, de quanto em quanto tempo muda de atividade (ms) ou 0 = fica na mesma]
const ESTADOS = {
  parado: [['conversando', 'podedeixar', 'verificando', 'listando', 'lendo', 'anotando', 'pausa', 'estudando', 'trabalhando', 'joia'], 'calmo', [8000, 14000]],
  ouvindo: [['conversando', 'verificando', 'anotando'], 'calmo', 0],
  ola: [['ola'], 'aceno', 0], tchau: [['tchau', 'podedeixar'], 'aceno', 0],
  pensando: [['processando', 'pensando', 'duvida', 'analisando', 'pesquisando'], 'trabalha', [2600, 3600]],
  explicando: [['apresentando', 'ideia', 'listando', 'conversando', 'verificando'], 'fala', 0],
  ideia: [['ideia'], 'pulo', 0], sucesso: [['confirmado', 'concluido', 'joia'], 'pulo', 0], concluido: [['concluido'], 'pulo', 0],
  naosei: [['naosei', 'duvida'], 'nega', 0], negativo: [['negativo'], 'nega', 0], pausa: [['pausa'], 'calmo', 0],
};
const sortear = (l, menos) => { const o = l.filter((x) => x !== menos); return (o.length ? o : l)[Math.floor(Math.random() * (o.length || l.length))]; };
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=11', import.meta.url).href; }));

/** Quadro q (10 por segundo, desde o começo do estado) -> deslocamento em pixels inteiros: corpo (dx, dy) e tronco (sobe). */
function passo(mov, q) {
  const respira = Math.floor(q / 5) % 2;
  if (mov === 'aceno') return [0, q < 20 ? [0, -1, -2, -2, -1][q % 5] : 0, respira];
  if (mov === 'fala' || mov === 'trabalha') return [0, 0, Math.floor(q / 2) % 2];
  if (mov === 'pulo') return [0, q < 10 ? [0, -3, -6, -8, -8, -6, -3, 0, 1, 0][q] : 0, q < 10 ? 0 : respira];
  if (mov === 'nega') return [q < 8 ? [-2, 2, -2, 2, -1, 1, -1, 0][q] : 0, 0, respira];
  return [0, 0, respira];
}

/** Põe o personagem dentro de `el` e devolve { estado(nome, depois?, proximo?), parar() }. `depois` volta a outro estado após ms. */
export function personagemIA(el, inicial = 'ola') {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H + 2 * M; cv.className = 'ia-boneco'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Assistente virtual');
  el.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = ESTADOS[inicial] || ESTADOS.parado, pose = atual[0][0], t0 = performance.now(), troca = 0, volta = null, relogio = 0, ultimo = '', proxAtiv = Infinity;
  const agendar = () => { proxAtiv = atual[2] ? performance.now() + atual[2][0] + Math.random() * (atual[2][1] - atual[2][0]) : Infinity; };
  let proxPisca = performance.now() + 1800, piscaAte = 0;
  const celula = (nome) => { const i = POSES.indexOf(nome); return [(i % POR_LINHA) * W, Math.floor(i / POR_LINHA) * H]; };
  const desenhar = () => {
    const t = performance.now();
    if (!cv.isConnected && t - t0 > 1000) { clearInterval(relogio); return; } // a janela fechou
    if (!folha?.pronta) return;
    if (t > proxAtiv) { pose = sortear(atual[0], pose); troca = t0 = t; agendar(); }      // outra atividade, de vez em quando
    const q = Math.floor((t - t0) / (1000 / QPS)), qg = Math.floor(t / (1000 / QPS));
    let [dx, dy, sobe] = calmo ? [0, 0, 0] : passo(atual[1], q);
    if (!calmo && t - troca < 1000 / QPS) dy += 1;                    // troca de pose: assenta 1 pixel num quadro
    if (t > proxPisca) { piscaAte = t + 130; proxPisca = t + (Math.random() < 0.2 ? 300 : 2600 + Math.random() * 3400); }
    const pisca = !calmo && t < piscaAte && PISCA.has(pose);
    const chave = `${pose}${dx}${dy}${sobe}${pisca}${calmo ? 0 : qg % VENTO.length}`;
    if (chave === ultimo) return; ultimo = chave;
    const [sx, sy] = celula(pose), [tx, ty] = pisca ? celula(pose + '_pisca') : [sx, sy], c = CINTURA[pose];
    const [y0, y1, x0, x1] = CABELO[pose], meio = y1, oy = M + dy - sobe;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(folha.img, sx, sy + c - 1, W, H - c + 1, dx, M + dy + c - 1, W, H - c + 1);   // pernas
    ctx.drawImage(folha.img, tx, ty + meio, W, c - meio, dx, oy + meio, W, c - meio);             // rosto e tronco
    ctx.drawImage(folha.img, tx, ty, W, y0, dx, oy, W, y0);                                         // acima do cabelo (enfeites)
    for (let y = y0; y < meio; y++) {                                                                // pontas do cabelo ao vento
      const v = calmo ? 0 : Math.round(3 * ((meio - y) / (meio - y0)) * VENTO[(qg - Math.floor((y - y0) / 4) + 100 * VENTO.length) % VENTO.length]);
      ctx.drawImage(folha.img, tx, ty + y, x0 - 2, 1, dx, oy + y, x0 - 2, 1);
      ctx.drawImage(folha.img, tx + x1 + 3, ty + y, W - x1 - 3, 1, dx + x1 + 3, oy + y, W - x1 - 3, 1);
      ctx.drawImage(folha.img, tx + x0 - 2, ty + y, x1 - x0 + 5, 1, dx + x0 - 2 + v, oy + y, x1 - x0 + 5, 1);
      // o pedaço que andou deixa um vão do tamanho do deslocamento: preenche com os pixels originais (senão o fundo aparece como risco)
      if (v > 0) ctx.drawImage(folha.img, tx + x0 - 2, ty + y, v, 1, dx + x0 - 2, oy + y, v, 1);
      if (v < 0) ctx.drawImage(folha.img, tx + x1 + 3 + v, ty + y, -v, 1, dx + x1 + 3 + v, oy + y, -v, 1);
    }
  };
  carregar().then((img) => { folha.img = img; folha.pronta = true; desenhar(); }, () => { cv.remove(); });
  relogio = setInterval(desenhar, 1000 / QPS / 2);   // pixel art: 10 quadros por segundo (o relógio confere 2 vezes por quadro)
  return {
    atual: inicial,
    estado(nome, depois = 0, proximo = 'parado') {
      clearTimeout(volta);
      const novo = ESTADOS[nome] || ESTADOS.parado;
      if (novo !== atual) {
        const nova = novo[0].includes(pose) && novo[0].length === 1 ? pose : novo === ESTADOS.parado ? novo[0][0] : sortear(novo[0], pose);
        if (nova !== pose) troca = performance.now();
        pose = nova; t0 = performance.now(); atual = novo; agendar();
      }
      this.atual = nome; ultimo = ''; desenhar();
      if (depois) volta = setTimeout(() => this.estado(proximo), depois);
    },
    parar() { clearInterval(relogio); clearTimeout(volta); },
  };
}

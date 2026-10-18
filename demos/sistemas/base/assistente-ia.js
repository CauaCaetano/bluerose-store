// Personagem do Assistente IA (camisa branca; poses do dono em assistente-ia.webp, sem redesenho).
// Animação de pixel art clássica: pixels nítidos, movimento em pixels inteiros, 8 quadros por segundo.
// Uma pose por situação (troca só quando algo acontece); em cada uma ele respira e faz o gesto do momento.
// Folha gerada por scratchpad/iaass/montar_branca.py: célula W×H, 6 por linha e a linha do cinto de cada pose.
const W = 161, H = 209, POR_LINHA = 6, M = 8, QPS = 8; // M: folga em cima e embaixo para o pulinho
const POSES = ['conversando', 'ola', 'joia', 'duvida', 'pensando', 'ideia', 'pesquisando', 'analisando', 'verificando', 'listando', 'apresentando', 'naosei', 'confirmado', 'negativo', 'processando', 'concluido', 'trabalhando', 'pausa', 'lendo', 'anotando', 'estudando', 'podedeixar', 'tchau'];
const CINTURA = { conversando: 112, ola: 111, joia: 111, duvida: 111, pensando: 112, ideia: 108, pesquisando: 110, analisando: 111, verificando: 112, listando: 111, apresentando: 111, naosei: 112, confirmado: 112, negativo: 112, processando: 112, concluido: 115, trabalhando: 121, pausa: 119, lendo: 120, anotando: 121, estudando: 119, podedeixar: 119, tchau: 118 };
const ESTADOS = {
  parado: ['conversando', 'calmo'], ouvindo: ['conversando', 'calmo'], ola: ['ola', 'aceno'], tchau: ['tchau', 'aceno'],
  pensando: ['processando', 'trabalha'], pesquisando: ['pesquisando', 'trabalha'], explicando: ['apresentando', 'fala'],
  ideia: ['ideia', 'pulo'], sucesso: ['confirmado', 'pulo'], concluido: ['concluido', 'pulo'],
  naosei: ['naosei', 'nega'], negativo: ['negativo', 'nega'], pausa: ['pausa', 'calmo'],
};
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=9', import.meta.url).href; }));

/** Quadro q (8 por segundo, contado desde o começo do estado) -> deslocamento em pixels inteiros: corpo (dx, dy) e tronco (sobe). */
function passo(mov, q) {
  const respira = Math.floor(q / 4) % 2;
  if (mov === 'aceno') return [0, q < 16 ? [0, -1, -2, -1][q % 4] : 0, respira];
  if (mov === 'pensa') return [[0, 0, 1, 1, 0, 0, -1, -1][q % 8], 0, respira];
  if (mov === 'fala' || mov === 'trabalha') return [0, 0, q % 2];
  if (mov === 'pulo') return [0, q < 8 ? [0, -3, -6, -7, -6, -3, 0, 1][q] : 0, q < 8 ? 0 : respira];
  if (mov === 'nega') return [q < 6 ? [-2, 2, -2, 2, -1, 1][q] : 0, 0, respira];
  return [0, 0, respira];
}

/** Põe o personagem dentro de `el` e devolve { estado(nome, depois?, proximo?), parar() }. `depois` volta a outro estado após ms. */
export function personagemIA(el, inicial = 'ola') {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H + 2 * M; cv.className = 'ia-boneco'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Assistente virtual');
  el.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = ESTADOS[inicial] || ESTADOS.parado, t0 = performance.now(), troca = 0, volta = null, relogio = 0, ultimo = '';
  const desenhar = () => {
    const t = performance.now();
    if (!cv.isConnected && t - t0 > 1000) { clearInterval(relogio); return; } // a janela fechou
    if (!folha?.pronta) return;
    const q = Math.floor((t - t0) / (1000 / QPS));
    let [dx, dy, sobe] = calmo ? [0, 0, 0] : passo(atual[1], q);
    if (!calmo && t - troca < 1000 / QPS) dy += 1;               // troca de pose: abaixa 1 pixel num quadro (assentou)
    const chave = `${atual[0]}${dx}${dy}${sobe}`;
    if (chave === ultimo) return; ultimo = chave;
    const i = POSES.indexOf(atual[0]), sx = (i % POR_LINHA) * W, sy = Math.floor(i / POR_LINHA) * H, c = CINTURA[atual[0]];
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(folha.img, sx, sy + c - 1, W, H - c + 1, dx, M + dy + c - 1, W, H - c + 1);   // pernas
    ctx.drawImage(folha.img, sx, sy, W, c, dx, M + dy - sobe, W, c);                         // tronco e cabeça
  };
  carregar().then((img) => { folha.img = img; folha.pronta = true; desenhar(); }, () => { cv.remove(); });
  relogio = setInterval(desenhar, 1000 / QPS / 2);   // pixel art: 8 quadros por segundo (o relógio confere 2 vezes por quadro)
  return {
    atual: inicial,
    estado(nome, depois = 0, proximo = 'parado') {
      clearTimeout(volta);
      const novo = ESTADOS[nome] || ESTADOS.parado;
      if (novo[0] !== atual[0]) troca = performance.now();
      if (novo !== atual) t0 = performance.now();
      atual = novo; this.atual = nome; ultimo = ''; desenhar();
      if (depois) volta = setTimeout(() => this.estado(proximo), depois);
    },
    parar() { clearInterval(relogio); clearTimeout(volta); },
  };
}

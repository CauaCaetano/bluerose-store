// Personagem do Assistente IA (camisa preta; poses do dono em assistente-ia.webp, sem redesenho).
// Uma pose por situação; o movimento é contínuo e suave: respiração, aceno, cabeça pensando, aceno de cabeça ao falar,
// pulinho ao dar certo e um "não" curto no erro. Troca de pose só quando algo acontece, com transição suave.
// Folha gerada por scratchpad/iaass/montar_preto.py: W/H da célula, ordem das poses (5 por linha) e a linha do cinto de cada uma.
const W = 165, H = 347, POR_LINHA = 5, M = 10; // M: folga em cima e embaixo para o pulinho
const POSES = ['padrao', 'ola', 'joia', 'duvida', 'ideia', 'explicando', 'bracos', 'celular', 'lupa'];
const CINTURA = { padrao: 159, ola: 168, joia: 171, duvida: 170, ideia: 169, explicando: 172, bracos: 173, celular: 174, lupa: 171 };
const ESTADOS = {
  parado: ['padrao', 'calmo'], ouvindo: ['padrao', 'calmo'], ola: ['ola', 'aceno'], tchau: ['ola', 'aceno'],
  pensando: ['duvida', 'pensa'], explicando: ['explicando', 'fala'], ideia: ['ideia', 'ideia'],
  sucesso: ['joia', 'pulo'], naosei: ['duvida', 'nega'], negativo: ['bracos', 'nega'], pausa: ['bracos', 'calmo'],
};
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=5', import.meta.url).href; }));
const suave = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Movimento do instante: deslocamento do corpo (dx, dy), do tronco (sobe) e inclinação do tronco (graus). */
function movimento(mov, t, dt) {
  const r = { dx: 0, dy: 0, sobe: 1.3 * (1 - Math.cos((2 * Math.PI * t) / 3600)) / 2, ang: 0 };
  if (mov === 'aceno') r.ang = Math.sin(dt / 190) * 1.6 * (1 - suave((dt - 1400) / 600));
  else if (mov === 'pensa') r.ang = Math.sin(t / 1500) * 0.9;
  else if (mov === 'fala') r.sobe += 0.9 * Math.max(0, Math.sin(dt / 230));
  else if (mov === 'pulo') r.dy = -7 * Math.sin(Math.PI * Math.min(dt / 460, 1));
  else if (mov === 'ideia') r.dy = -4 * Math.sin(Math.PI * Math.min(dt / 360, 1));
  else if (mov === 'nega') r.dx = 2 * Math.sin(dt / 45) * Math.max(0, 1 - dt / 520);
  return r;
}

/** Põe o personagem dentro de `el` e devolve { estado(nome, depois?, proximo?), parar() }. `depois` volta a outro estado após ms. */
export function personagemIA(el, inicial = 'ola') {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H + 2 * M; cv.className = 'ia-boneco'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Assistente virtual');
  el.appendChild(cv);
  const ctx = cv.getContext('2d');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = ESTADOS[inicial] || ESTADOS.parado, t0 = performance.now(), antes = null, tTroca = 0, volta = null, raf = 0;

  const pose = (img, nome, alfa, m, entra) => {
    const i = POSES.indexOf(nome), sx = (i % POR_LINHA) * W, sy = Math.floor(i / POR_LINHA) * H, c = CINTURA[nome];
    const x = m.dx, y = M + m.dy + entra;
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, sx, sy + c - 2, W, H - c + 2, x, y + c - 2, W, H - c + 2);   // pernas (paradas)
    ctx.save(); ctx.translate(x + W / 2, y + c); ctx.rotate((m.ang * Math.PI) / 180);  // tronco e cabeça giram no cinto
    ctx.drawImage(img, sx, sy, W, c, -W / 2, -c - m.sobe, W, c);
    ctx.restore();
  };
  const desenhar = (t) => {
    if (!cv.isConnected && t - t0 > 1000) return; // a janela fechou
    raf = requestAnimationFrame(desenhar);
    if (!folha?.pronta) return;
    const dt = t - t0, m = calmo ? { dx: 0, dy: 0, sobe: 0, ang: 0 } : movimento(atual[1], t, dt);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const k = antes && !calmo ? suave((t - tTroca) / 280) : 1;
    if (k < 1) pose(folha.img, antes, 1 - k, m, 0);
    pose(folha.img, atual[0], k, m, (1 - k) * 3);   // a nova entra subindo 3 px enquanto aparece
    ctx.globalAlpha = 1;
  };
  carregar().then((img) => { folha.img = img; folha.pronta = true; }, () => { cv.remove(); });
  raf = requestAnimationFrame(desenhar);
  return {
    atual: inicial,
    estado(nome, depois = 0, proximo = 'parado') {
      clearTimeout(volta);
      const novo = ESTADOS[nome] || ESTADOS.parado;
      if (novo[0] !== atual[0]) { antes = atual[0]; tTroca = performance.now(); }
      if (novo[1] !== atual[1] || novo[0] !== atual[0]) t0 = performance.now();
      atual = novo; this.atual = nome;
      if (depois) volta = setTimeout(() => this.estado(proximo), depois);
    },
    parar() { cancelAnimationFrame(raf); clearTimeout(volta); },
  };
}

// Personagem do Assistente IA (poses do dono em assistente-ia.webp, sem redesenho).
// Uma pose por situação e movimento contínuo e liso (na taxa de quadros da tela, em alta resolução): respiração,
// leve balanço do corpo, aceno, pensar, falar, digitar no notebook, pulinho ao dar certo, "não" no erro e agradecer.
// A pose só troca quando algo acontece, com transição suave.
// Folha gerada por scratchpad/iaass/montar_novas.py: célula W×H, 4 por linha, linha do cinto de cada pose e o x dos pés.
const W = 196, H = 432, POR_LINHA = 4, M = 26, PE_X = 114; // M: folga em cima e embaixo para o pulinho
const POSES = ['celular', 'ola', 'explicando', 'joia', 'ideia', 'duvida', 'notebook', 'agradecendo'];
const CINTURA = { celular: 198, ola: 186, explicando: 159, joia: 189, ideia: 184, duvida: 182, notebook: 172, agradecendo: 186 };
const ESTADOS = {
  parado: ['celular', 'calmo'], ouvindo: ['celular', 'calmo'], ola: ['ola', 'aceno'], tchau: ['ola', 'aceno'],
  pensando: ['notebook', 'trabalha'], explicando: ['explicando', 'fala'], ideia: ['ideia', 'ideia'],
  sucesso: ['joia', 'pulo'], naosei: ['duvida', 'nega'], negativo: ['duvida', 'nega'], pausa: ['agradecendo', 'agradece'],
};
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=6', import.meta.url).href; }));
const suave = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const TAU = 2 * Math.PI;

/** Movimento do instante (pixels e graus da folha): corpo (dx, dy, giro nos pés) e tronco (sobe, ang no cinto). */
function movimento(mov, t, dt) {
  const r = { dx: 0, dy: 0, sobe: 3.2 * (1 - Math.cos((TAU * t) / 2600)) / 2, ang: 0, giro: 0.6 * Math.sin((TAU * t) / 5200) };
  if (mov === 'aceno') r.ang = Math.sin(dt / 150) * 3.2 * (1 - suave((dt - 1500) / 700));
  else if (mov === 'pensa') r.ang = Math.sin((TAU * t) / 2600) * 1.8;
  else if (mov === 'fala') { r.sobe += 2.4 * Math.max(0, Math.sin((TAU * dt) / 650)); r.ang = Math.sin((TAU * dt) / 2600) * 0.9; }
  else if (mov === 'trabalha') r.sobe += 1.4 * (0.5 + 0.5 * Math.sin((TAU * dt) / 400));
  else if (mov === 'pulo') r.dy = -20 * Math.sin(Math.PI * Math.min(dt / 520, 1));
  else if (mov === 'ideia') r.dy = -11 * Math.sin(Math.PI * Math.min(dt / 420, 1));
  else if (mov === 'nega') r.dx = 6 * Math.sin(dt / 42) * Math.max(0, 1 - dt / 560);
  else if (mov === 'agradece') r.ang = 2.2 * Math.sin(Math.PI * Math.min(dt / 1400, 1));
  return r;
}

/** Põe o personagem dentro de `el` e devolve { estado(nome, depois?, proximo?), parar() }. `depois` volta a outro estado após ms. */
export function personagemIA(el, inicial = 'ola') {
  const cv = document.createElement('canvas');
  cv.className = 'ia-boneco'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Assistente virtual');
  cv.width = W; cv.height = H + 2 * M;
  el.appendChild(cv);
  const ctx = cv.getContext('2d');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = ESTADOS[inicial] || ESTADOS.parado, t0 = performance.now(), antes = null, tTroca = 0, volta = null, raf = 0;
  // resolução real da tela (nítido e liso em celular e monitor de alta densidade)
  const medir = () => { const w = Math.round((cv.clientWidth || 100) * (window.devicePixelRatio || 1)); if (w && w !== cv.width) { cv.width = w; cv.height = Math.round(w * (H + 2 * M) / W); } };

  const pose = (img, nome, alfa, m, entra) => {
    const i = POSES.indexOf(nome), sx = (i % POR_LINHA) * W, sy = Math.floor(i / POR_LINHA) * H, c = CINTURA[nome];
    ctx.globalAlpha = alfa;
    ctx.save();
    ctx.translate(PE_X + m.dx, M + H + m.dy + entra); ctx.rotate((m.giro * Math.PI) / 180); ctx.translate(-PE_X, -(M + H)); // balanço nos pés
    ctx.drawImage(img, sx, sy + c - 3, W, H - c + 3, 0, M + c - 3, W, H - c + 3);                                         // pernas
    ctx.translate(PE_X, M + c); ctx.rotate((m.ang * Math.PI) / 180);                                                        // tronco gira no cinto
    ctx.drawImage(img, sx, sy, W, c, -PE_X, -c - m.sobe, W, c);
    ctx.restore();
  };
  const desenhar = (t) => {
    if (!cv.isConnected && t - t0 > 1000) return; // a janela fechou
    raf = requestAnimationFrame(desenhar);
    if (!folha?.pronta) return;
    medir();
    const dt = t - t0, m = calmo ? { dx: 0, dy: 0, sobe: 0, ang: 0, giro: 0 } : movimento(atual[1], t, dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const s = cv.width / W; ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const k = antes && !calmo ? suave((t - tTroca) / 320) : 1;
    if (k < 1) pose(folha.img, antes, 1 - k, m, 0);
    pose(folha.img, atual[0], k, m, (1 - k) * 6);   // a nova aparece subindo de leve
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

// Personagem do Assistente IA (camisa preta; poses do dono em assistente-ia.webp, sem redesenho): troca de pose por estado e respira (o tronco sobe 1 px).
// Gerado por scratchpad/iaass/montar_preto.py: W/H da célula, ordem das poses (5 por linha) e a linha da cintura de cada uma.
const W = 165, H = 347, POR_LINHA = 5;
const POSES = ['padrao', 'ola', 'joia', 'apontando', 'duvida', 'ideia', 'explicando', 'bracos', 'celular', 'lupa'];
const CINTURA = { padrao: 159, ola: 168, joia: 171, apontando: 170, duvida: 170, ideia: 169, explicando: 172, bracos: 173, celular: 174, lupa: 171 };
const ESTADOS = {
  parado: ['padrao'], ola: ['ola', 'joia'], ouvindo: ['padrao', 'bracos'],
  pensando: ['duvida', 'celular', 'lupa'], explicando: ['explicando', 'ideia', 'apontando'], sucesso: ['joia'],
  naosei: ['duvida'], negativo: ['bracos'], pausa: ['padrao'],
  tchau: ['ola'],
};
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=3', import.meta.url).href; }));

/** Põe o personagem dentro de `el` e devolve { estado(nome, depois?), parar() }. `depois` volta a um estado após ms. */
export function personagemIA(el, inicial = 'ola') {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H; cv.className = 'ia-boneco'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Assistente virtual');
  el.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seq = ESTADOS[inicial] || ESTADOS.parado, t0 = performance.now(), volta = null, raf = 0, ultimo = '';
  const desenhar = (agora) => {
    if (!cv.isConnected && performance.now() - t0 > 1000) return; // a janela fechou
    raf = requestAnimationFrame(desenhar);
    if (!folha?.pronta) return;
    const q = Math.floor((agora - t0) / (1000 / 12));          // 12 quadros por segundo
    const pose = seq[Math.floor(q / 12) % seq.length], respira = !calmo && Math.floor(q / 6) % 2 === 1;
    const chave = `${pose}${respira}`; if (chave === ultimo) return; ultimo = chave;
    const i = POSES.indexOf(pose), sx = (i % POR_LINHA) * W, sy = Math.floor(i / POR_LINHA) * H, c = CINTURA[pose];
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(folha.img, sx, sy + c - 1, W, H - c + 1, 0, c - 1, W, H - c + 1); // pernas paradas (com a linha da cintura, para não abrir fresta)
    ctx.drawImage(folha.img, sx, sy, W, c, 0, respira ? -1 : 0, W, c);         // tronco e cabeça
  };
  carregar().then((img) => { folha.img = img; folha.pronta = true; }, () => { cv.remove(); });
  raf = requestAnimationFrame(desenhar);
  return {
    estado(nome, depois = 0, proximo = 'parado') {
      clearTimeout(volta); this.atual = nome; seq = ESTADOS[nome] || ESTADOS.parado; t0 = performance.now(); ultimo = '';
      if (depois) volta = setTimeout(() => this.estado(proximo), depois);
    },
    parar() { cancelAnimationFrame(raf); clearTimeout(volta); },
  };
}

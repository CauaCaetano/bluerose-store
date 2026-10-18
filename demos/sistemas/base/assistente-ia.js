// Personagem do Assistente IA (poses do dono em assistente-ia.webp, sem redesenho): troca de pose por estado e respira (o tronco sobe 1 px).
// Gerado por scratchpad/iaass/montar.py: W/H da célula, ordem das poses (5 por linha) e a linha da cintura de cada uma.
const W = 139, H = 209, POR_LINHA = 5;
const POSES = ['analisando', 'concluido', 'confirmado', 'conversando', 'duvida', 'ideia', 'joia', 'listando', 'naosei', 'negativo', 'ola', 'pausa', 'pensando', 'pesquisando', 'podedeixar', 'processando', 'tchau'];
const CINTURA = { analisando: 111, concluido: 115, confirmado: 112, conversando: 112, duvida: 111, ideia: 108, joia: 111, listando: 111, naosei: 112, negativo: 112, ola: 111, pausa: 119, pensando: 112, pesquisando: 110, podedeixar: 119, processando: 112, tchau: 118 };
const ESTADOS = {
  parado: ['conversando'], ola: ['ola', 'joia'], ouvindo: ['conversando', 'listando'],
  pensando: ['pensando', 'processando', 'pesquisando', 'analisando'], explicando: ['conversando', 'ideia', 'listando', 'conversando'],
  sucesso: ['concluido', 'confirmado'], naosei: ['naosei', 'duvida'], negativo: ['negativo', 'naosei'], pausa: ['pausa'], tchau: ['tchau', 'podedeixar'],
};
let folha = null;
const carregar = () => folha || (folha = new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = new URL('./assistente-ia.webp?v=2', import.meta.url).href; }));

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

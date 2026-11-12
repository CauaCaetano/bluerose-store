// Atria · vídeos curtos do celular (12/11/2026): vitrine, antes e depois, diário da obra e Postar.
// O vídeo fica guardado só neste aparelho, no IndexedDB (nunca no localStorage, que é pequeno). No estado do app
// vai só a referência "idb:<id>" e a capa (um quadro em JPEG pequeno), então a nuvem da conta leva a capa e não o
// vídeo: em outro aparelho aparece a capa com o aviso. Os exemplos da demonstração usam arquivos em videos/.
export const LIMITE_S = 60;
export const LIMITE_MB = 50;
const BANCO = 'atria-midia', LOJA = 'videos';
const ehIdb = (ref) => String(ref || '').startsWith('idb:');
export const ehVideo = (arq) => !!arq && /^video\//.test(arq.type || '');

let banco = null;
function abrir() {
  if (banco) return banco;
  banco = new Promise((ok, falha) => {
    if (!('indexedDB' in window)) { falha(new Error('sem IndexedDB')); return; }
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
  banco.catch(() => { banco = null; });
  return banco;
}
const pedido = (modo, faz) => abrir().then((d) => new Promise((ok, falha) => {
  const tx = d.transaction(LOJA, modo), r = faz(tx.objectStore(LOJA));
  tx.oncomplete = () => ok(r && 'result' in r ? r.result : undefined); tx.onerror = () => falha(tx.error); tx.onabort = () => falha(tx.error);
}));
export const guardarVideo = (id, blob) => pedido('readwrite', (s) => s.put(blob, id));
export const lerVideo = (id) => pedido('readonly', (s) => s.get(id));
export const apagarVideo = (id) => pedido('readwrite', (s) => s.delete(id));
export async function listarVideos() {
  const chaves = await pedido('readonly', (s) => s.getAllKeys()).catch(() => []);
  const out = [];
  for (const id of chaves || []) { const b = await lerVideo(id).catch(() => null); if (b) out.push({ id, tam: b.size || 0 }); }
  return out;
}

// lê o vídeo escolhido: confere duração e tamanho e tira a capa (quadro de ~1 s) em JPEG pequeno
export function lerArquivoVideo(arq) {
  return new Promise((ok, falha) => {
    if (arq.size > LIMITE_MB * 1024 * 1024) { falha(new Error(`O vídeo tem ${Math.round(arq.size / 1048576)} MB. O limite é ${LIMITE_MB} MB: grave um trecho menor.`)); return; }
    const v = document.createElement('video'), url = URL.createObjectURL(arq);
    let feito = false;
    const fim = (e, r) => { if (feito) return; feito = true; URL.revokeObjectURL(url); v.removeAttribute('src'); if (e) falha(e); else ok(r); };
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > LIMITE_S + 0.5) { fim(new Error(`O vídeo tem ${Math.round(d)} s. O limite é ${LIMITE_S} s: corte no celular e tente de novo.`)); return; }
      v.currentTime = Math.min(1, (Number.isFinite(d) ? d : 2) / 2);
    };
    v.onseeked = () => {
      try {
        const k = Math.min(1, 720 / Math.max(v.videoWidth || 720, v.videoHeight || 720)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((v.videoWidth || 720) * k)); c.height = Math.max(1, Math.round((v.videoHeight || 1280) * k));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        fim(null, { capa: c.toDataURL('image/jpeg', 0.72), duracao: v.duration, largura: v.videoWidth, altura: v.videoHeight });
      } catch (e) { fim(e); }
    };
    v.onerror = () => fim(new Error('Este celular não conseguiu abrir esse vídeo. Tente gravar de novo ou escolher outro.'));
    setTimeout(() => fim(new Error('O vídeo demorou para abrir. Tente de novo.')), 20000);
    v.src = url;
  });
}

// guarda o vídeo no aparelho e devolve { video: 'idb:<id>', capa }
export async function guardarArquivoVideo(arq, id) {
  const info = await lerArquivoVideo(arq);
  try { await guardarVideo(id, arq); } catch (e) {
    throw new Error(/quota/i.test(String(e && (e.name || e.message))) ? 'O celular está sem espaço para guardar vídeos. Apague alguns em Vitrine > Vídeos no aparelho.' : 'Não deu para guardar o vídeo neste aparelho.');
  }
  return { video: `idb:${id}`, capa: info.capa, duracao: info.duracao };
}

const SOM = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="som-on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="som-off" d="m16 9 6 6M22 9l-6 6"/></svg>';
// HTML do vídeo: sem som e em repetição; tocar no vídeo ou no botão liga o som
export function htmlVideo(ref, capa = '', rotulo = 'Vídeo do trabalho') {
  const src = ehIdb(ref) ? `data-idb="${String(ref).slice(4).replace(/[^a-z0-9_-]/gi, '')}"` : `src="${String(ref).replace(/"/g, '')}"`;
  return `<span class="midia-v"><video ${src} ${capa ? `poster="${String(capa).replace(/"/g, '')}"` : ''} playsinline muted loop autoplay preload="metadata" aria-label="${rotulo.replace(/"/g, '')}"></video><button type="button" class="midia-som" data-som aria-label="Ligar o som" aria-pressed="false">${SOM}</button><i class="midia-falta" hidden>Vídeo guardado só no celular onde foi gravado</i></span>`;
}

// arquivo do vídeo para compartilhar (Postar)
export async function arquivoDoVideo(ref, nome = 'atria-video') {
  if (ehIdb(ref)) { const b = await lerVideo(String(ref).slice(4)); if (!b) throw new Error('falta'); return new File([b], `${nome}.${(b.type || 'video/mp4').includes('webm') ? 'webm' : (b.type || '').includes('quicktime') ? 'mov' : 'mp4'}`, { type: b.type || 'video/mp4' }); }
  const r = await fetch(ref); const b = await r.blob(); return new File([b], `${nome}.mp4`, { type: b.type || 'video/mp4' });
}

// liga os vídeos que aparecem na tela (busca no IndexedDB) e o botão de som; chamado uma vez ao abrir o app
const urls = new Map();
async function hidratar(v) {
  const id = v.dataset.idb; if (!id || v.src) return;
  try {
    let u = urls.get(id);
    if (!u) { const b = await lerVideo(id); if (!b) throw new Error('falta'); u = URL.createObjectURL(b); urls.set(id, u); }
    v.src = u; v.play().catch(() => {});
  } catch { const f = v.parentNode && v.parentNode.querySelector('.midia-falta'); if (f) f.hidden = false; }
}
export function ligarVideos() {
  const varre = (raiz) => { if (raiz.querySelectorAll) raiz.querySelectorAll('video[data-idb]').forEach(hidratar); };
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches && n.matches('video[data-idb]')) hidratar(n); else varre(n); } }))).observe(document.body, { childList: true, subtree: true });
  varre(document);
  document.addEventListener('click', (e) => {
    const alvo = e.target.closest && e.target.closest('.midia-v [data-som], .midia-v video'); if (!alvo) return;
    const caixa = alvo.closest('.midia-v'), v = caixa.querySelector('video'), b = caixa.querySelector('[data-som]');
    if (alvo.closest('.ad')) e.stopPropagation();
    v.muted = !v.muted; if (!v.muted) v.play().catch(() => {});
    b.setAttribute('aria-pressed', String(!v.muted)); b.setAttribute('aria-label', v.muted ? 'Ligar o som' : 'Desligar o som'); caixa.classList.toggle('com-som', !v.muted);
  });
}
export const mb = (n) => `${(n / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

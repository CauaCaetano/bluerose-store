// Jano · fotos de antes e depois e vídeos curtos (18/11/2026).
// Tudo fica guardado SÓ neste aparelho, no IndexedDB "jano-midia", separado da agenda: os dados que sobem para a
// nuvem (clientes, horários, valores) não mudam e não crescem com foto ou vídeo. Cada item leva a conta (espaço) para
// duas contas no mesmo celular não se misturarem. Na demonstração, os exemplos vêm de img/ (não são gravados).
export const LIMITE_S = 30;
export const LIMITE_MB = 60;
const BANCO = 'jano-midia', LOJA = 'itens';
export const CONTA = () => (window.veltriaConta && window.veltriaConta.espaco) || 'demo';

let banco = null;
function abrir() {
  if (banco) return banco;
  banco = new Promise((ok, falha) => {
    if (!('indexedDB' in window)) { falha(new Error('Este navegador não guarda fotos.')); return; }
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(LOJA, { keyPath: 'id' }); s.createIndex('conta', 'conta'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
  banco.catch(() => { banco = null; });
  return banco;
}
const tx = (modo, faz) => abrir().then((d) => new Promise((ok, falha) => {
  const t = d.transaction(LOJA, modo), r = faz(t.objectStore(LOJA));
  t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined); t.onerror = () => falha(t.error); t.onabort = () => falha(t.error);
}));
const ehCota = (e) => /quota/i.test(String(e && (e.name || e.message)));
export async function guardar(item) {
  try { await tx('readwrite', (s) => s.put({ ...item, conta: CONTA() })); } catch (e) { throw new Error(ehCota(e) ? 'O celular está sem espaço. Apague vídeos antigos na Vitrine.' : 'Não deu para guardar neste aparelho.'); }
}
export const apagar = (id) => tx('readwrite', (s) => s.delete(id));
export async function listar(filtro = {}) {
  const todos = await tx('readonly', (s) => s.index('conta').getAll(CONTA())).catch(() => []);
  return (todos || []).filter((x) => (!filtro.cli || x.cli === filtro.cli) && (!filtro.ag || x.ag === filtro.ag) && (!filtro.tipo || x.tipo === filtro.tipo))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}

// foto: reduz para no máximo 1440 px (JPEG) e faz a miniatura
const carrega = (src) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Não deu para abrir a foto.')); i.src = src; });
function reduz(img, max, q) {
  const k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), c = document.createElement('canvas');
  c.width = Math.round((img.naturalWidth || img.width) * k); c.height = Math.round((img.naturalHeight || img.height) * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const paraBlob = (c, q) => new Promise((ok) => c.toBlob((b) => ok(b), 'image/jpeg', q));
export async function lerFoto(arq) {
  if (!/^image\//.test(arq.type || '')) throw new Error('Escolha uma foto.');
  const u = URL.createObjectURL(arq);
  try { const i = await carrega(u); const g = reduz(i, 1440); return { blob: await paraBlob(g, 0.84), capa: reduz(i, 360).toDataURL('image/jpeg', 0.74), w: g.width, h: g.height }; }
  finally { URL.revokeObjectURL(u); }
}
// vídeo: confere duração (até 30 s) e tamanho e tira a capa
export function lerVideo(arq) {
  return new Promise((ok, falha) => {
    if (!/^video\//.test(arq.type || '')) { falha(new Error('Escolha um vídeo.')); return; }
    if (arq.size > LIMITE_MB * 1048576) { falha(new Error(`O vídeo tem ${Math.round(arq.size / 1048576)} MB. Grave um trecho de até ${LIMITE_S} segundos.`)); return; }
    const v = document.createElement('video'), u = URL.createObjectURL(arq); let feito = false;
    const fim = (e, r) => { if (feito) return; feito = true; URL.revokeObjectURL(u); v.removeAttribute('src'); if (e) falha(e); else ok(r); };
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => { const d = v.duration; if (Number.isFinite(d) && d > LIMITE_S + 0.5) { fim(new Error(`O vídeo tem ${Math.round(d)} segundos. O limite é ${LIMITE_S}: corte no celular e escolha de novo.`)); return; } v.currentTime = Math.min(1, (Number.isFinite(d) ? d : 2) / 2); };
    v.onseeked = () => { try { const c = reduz(v, 360); fim(null, { blob: arq, capa: c.toDataURL('image/jpeg', 0.72), dur: Math.round(v.duration || 0) }); } catch (e) { fim(e); } };
    v.onerror = () => fim(new Error('Este celular não abriu esse vídeo. Grave de novo ou escolha outro.'));
    setTimeout(() => fim(new Error('O vídeo demorou para abrir. Tente de novo.')), 20000);
    v.src = u;
  });
}
export const urlDe = (item) => (item.blob ? URL.createObjectURL(item.blob) : item.src);

// ------------------------------------------------------------------ imagem do post (antes e depois com a moldura do Jano)
export const FORMATOS = {
  feed: { nome: 'Instagram e Facebook (feed)', w: 1080, h: 1350 },
  stories: { nome: 'Stories, Status e TikTok', w: 1080, h: 1920 },
};
function cobre(g, img, x, y, w, h) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.max(w / iw, h / ih); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(img, x + (w - iw * k) / 2, y + (h - ih * k) / 2, iw * k, ih * k); g.restore(); }
function selo(g, txt, x, y, fundo) { g.font = '600 34px Cinzel, Georgia, serif'; const w = g.measureText(txt).width + 44; g.fillStyle = fundo; g.fillRect(x, y, w, 58); g.fillStyle = '#f6f0e4'; g.fillText(txt, x + 22, y + 41); }
export async function montarPost(antes, depois, formato, marca) {
  const F = FORMATOS[formato] || FORMATOS.feed, c = document.createElement('canvas'); c.width = F.w; c.height = F.h; const g = c.getContext('2d');
  try { await Promise.all([document.fonts.load('600 40px Cinzel'), document.fonts.load('500 30px Outfit')]); } catch { /* fonte do sistema */ }
  const [a, d] = await Promise.all([antes ? carrega(urlDe(antes)) : null, depois ? carrega(urlDe(depois)) : null]);
  g.fillStyle = '#efe6d6'; g.fillRect(0, 0, F.w, F.h);
  const m = 36, rod = formato === 'stories' ? 300 : 210, topo = formato === 'stories' ? 170 : m, area = F.h - rod - topo;
  if (formato === 'stories') { g.fillStyle = '#221d1a'; g.font = '600 58px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText((marca.studio || '').toUpperCase().slice(0, 26), F.w / 2, 112); g.textAlign = 'left'; }
  if (a && d) {
    if (formato === 'stories') { const h2 = (area - 14) / 2; cobre(g, a, m, topo, F.w - 2 * m, h2); cobre(g, d, m, topo + h2 + 14, F.w - 2 * m, h2); selo(g, 'ANTES', m + 22, topo + 22, 'rgba(34,29,26,.82)'); selo(g, 'DEPOIS', m + 22, topo + h2 + 36, '#a2402e'); }
    else { const w2 = (F.w - 2 * m - 14) / 2; cobre(g, a, m, topo, w2, area); cobre(g, d, m + w2 + 14, topo, w2, area); selo(g, 'ANTES', m + 18, topo + 18, 'rgba(34,29,26,.82)'); selo(g, 'DEPOIS', m + w2 + 32, topo + 18, '#a2402e'); }
  } else if (a || d) cobre(g, a || d, m, topo, F.w - 2 * m, area);
  // moldura de bronze e rodapé de pedra com o nome do negócio
  g.strokeStyle = '#9a7b4f'; g.lineWidth = 4; g.strokeRect(m - 12, topo - 12, F.w - 2 * m + 24, area + 24);
  const y0 = F.h - rod; g.fillStyle = '#e6dac6'; g.fillRect(0, y0, F.w, rod); g.fillStyle = '#9a7b4f'; g.fillRect(0, y0, F.w, 5);
  g.fillStyle = '#221d1a'; g.font = '600 46px Cinzel, Georgia, serif'; g.fillText((formato === 'stories' ? marca.servico : marca.studio || '').toUpperCase().slice(0, 30), 48, y0 + 84);
  g.fillStyle = '#554b42'; g.font = '500 32px Outfit, system-ui, sans-serif'; g.fillText(`${formato === 'stories' ? marca.studio : marca.servico}`.slice(0, 48), 48, y0 + 134);
  g.fillStyle = '#a2402e'; g.font = '600 32px Outfit, system-ui, sans-serif'; g.fillText(marca.chamada.slice(0, 52), 48, y0 + rod - (formato === 'stories' ? 96 : 40));
  return new Promise((ok) => c.toBlob((b) => ok(new File([b], `jano-${formato}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9));
}
export function arquivoVideo(item) {
  const b = item.blob; if (!b) return fetch(item.src).then((r) => r.blob()).then((x) => new File([x], 'jano-video.mp4', { type: x.type || 'video/mp4' }));
  const ext = (b.type || '').includes('webm') ? 'webm' : (b.type || '').includes('quicktime') ? 'mov' : 'mp4';
  return Promise.resolve(new File([b], `jano-video.${ext}`, { type: b.type || 'video/mp4' }));
}
// abre o compartilhar do próprio celular (Instagram, WhatsApp, TikTok...); sem ele, baixa o arquivo
export async function compartilhar(arquivo, legenda) {
  try { await navigator.clipboard.writeText(legenda); } catch { /* sem área de transferência */ }
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], text: legenda }); return 'ok'; } catch (e) { return e && e.name === 'AbortError' ? 'cancelou' : 'erro'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(arquivo); a.download = arquivo.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'baixou';
}

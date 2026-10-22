// Veltria · painel "Ferramentas desta aba" (ao lado de cada tela): blocos, listas, calculadoras e mensagens prontas.
// Cada sistema registra as suas calculadoras com registrarCalcs({ nome: (form) => html }) e põe `lado: (app) => html` na página.
import { esc, ic, num, telLink, avisar } from './nexo.js';

export const bloco = (titulo, icone, corpo) => `<section class="ld-bloco"><h3>${ic(icone)}${esc(titulo)}</h3>${corpo}</section>`;
export const atalhos = (l) => `<div class="ld-atalhos">${l.map(([rot, icone, attrs, pri]) => `<button type="button" class="btn ${pri ? 'pri' : 'sec'} peq" ${attrs}>${ic(icone)}${esc(rot)}</button>`).join('')}</div>`;
export const ldLista = (itens, vazioTxt) => (itens.length ? `<ul class="ld-lista">${itens.join('')}</ul>` : `<div class="ld-vazio">${ic('check-circle')}${esc(vazioTxt)}</div>`);
export const ldItem = (t, s, { attrs = '', dir = '' } = {}) => `<li ${attrs ? `class="clicavel" ${attrs}` : ''}><div class="cresce" style="min-width:0"><div class="t corta">${t}</div><div class="s corta">${s}</div></div>${dir}</li>`;
export const ldNums = (l) => `<div class="ld-num">${l.map(([v, r]) => `<div><b>${v}</b><span>${esc(r)}</span></div>`).join('')}</div>`;
export const campoN = (nome, rot, valor, extra = '') => `<label>${esc(rot)}<input type="number" name="${nome}" value="${valor}" min="0" step="any" inputmode="decimal" ${extra}></label>`;
export const campoD = (nome, rot, valor) => `<label>${esc(rot)}<input type="date" name="${nome}" value="${valor}"></label>`;
export const campoS = (nome, rot, opcoes) => `<label>${esc(rot)}<select name="${nome}">${opcoes.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></label>`;
export const calc = (tipo, campos) => `<form class="ld-calc" data-calc="${tipo}">${campos}<div class="ld-res" aria-live="polite"></div></form>`;
export const n0 = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
export const fmtN = (v, d = 1) => num(v, d);

// botão de mensagem pronta no WhatsApp (a ação ldZap abre a conversa com o texto)
export const zap = (tel, texto, rot = 'WhatsApp') => (tel
  ? `<button type="button" class="btn peq" data-acao="ldZap" data-tel="${esc(tel)}" data-msg="${esc(texto)}" title="Abrir o WhatsApp com a mensagem pronta">${ic('whatsapp-logo')}${esc(rot)}</button>`
  : '');
export const copiar = (texto, rot = 'Copiar') => `<button type="button" class="btn peq" data-acao="ldCopiar" data-msg="${esc(texto)}">${ic('copy')}${esc(rot)}</button>`;

// ações comuns a todos os sistemas que usam o painel
export const acoesLado = () => ({
  ldZap: (d) => { if (!d.tel) return avisar('Sem WhatsApp cadastrado', { tipo: 'erro' }); window.open(`${telLink(d.tel)}?text=${encodeURIComponent(d.msg || '')}`, '_blank', 'noopener'); },
  ldCopiar: async (d) => { try { await navigator.clipboard.writeText(d.msg || ''); avisar('Copiado'); } catch { avisar('Não consegui copiar. Selecione e copie o texto.', { tipo: 'erro' }); } },
});

// calculadoras: cada sistema registra as suas; a base liga os formulários quando a tela é montada
const CALCS = {};
export const registrarCalcs = (l) => Object.assign(CALCS, l);
export function ligarCalcs(raiz) {
  raiz.querySelectorAll('form.ld-calc[data-calc]').forEach((f) => {
    const fn = CALCS[f.dataset.calc]; if (!fn || f.dataset.ligado) return;
    f.dataset.ligado = '1';
    const r = () => { try { f.querySelector('.ld-res').innerHTML = fn(f); } catch { f.querySelector('.ld-res').textContent = 'Confira os valores.'; } };
    f.addEventListener('input', r); f.addEventListener('change', r); f.addEventListener('submit', (e) => e.preventDefault()); r();
  });
}

// telas do grupo "Ferramentas" no menu da esquerda: juntam os blocos de todas as abas,
// separando as calculadoras dos avisos (listas de quem precisa de contato)
const blocos = (a, fns) => { const vistos = new Set(), out = [];
  for (const fn of fns) for (const m of String(fn(a) || '').matchAll(/<section class="ld-bloco">[\s\S]*?<\/section>/g)) {
    const t = (m[0].match(/<h3>[\s\S]*?<\/h3>/) || [''])[0]; if (!vistos.has(t)) { vistos.add(t); out.push(m[0]); } }
  return out; };
export const paginaCalculadoras = (a, fns) => `<div class="dica">${ic('calculator')}<span>As contas do dia a dia do seu ramo. Mude os números e o resultado aparece na hora.</span></div><div class="ld-pagina">${blocos(a, fns).filter((b) => b.includes('class="ld-calc"')).join('')}</div>`;
// Avisos e mensagens prontas são do plano Pro; as calculadoras ficam no Básico.
// Na demonstração aparece tudo, com a etiqueta Pro; na nuvem, o Básico vê o bloco trancado com o convite para o Pro.
const ehCalc = (b) => b.includes('class="ld-calc"');
const temPro = (a) => !a.nuvem || !!a.sessao?.pro;
const etiquetaPro = (b) => b.replace('</h3>', '<span class="ld-tag-pro">Pro</span></h3>');
const trancado = (b) => { const t = (b.match(/<h3>([\s\S]*?)<\/h3>/) || ['', ''])[1];
  return `<section class="ld-bloco ld-trancado"><h3>${t}<span class="ld-tag-pro">Pro</span></h3><p>${ic('lock-simple')} Disponível no plano Pro: a lista de quem precisa de contato, com a mensagem pronta no WhatsApp.</p><button type="button" class="btn pri peq" data-acao="verPro">Conhecer o Pro</button></section>`; };
export const travarPro = (a, html) => String(html || '').replace(/<section class="ld-bloco">[\s\S]*?<\/section>/g, (b) => (ehCalc(b) ? b : temPro(a) ? (a.nuvem ? b : etiquetaPro(b)) : trancado(b)));
export const paginaAvisos = (a, fns) => `<div class="dica">${ic('bell-ringing')}<span>Quem precisa de contato hoje. O botão abre o WhatsApp com a mensagem pronta: é só conferir e enviar.</span></div><div class="ld-pagina">${blocos(a, fns).filter((b) => !ehCalc(b)).map((b) => travarPro(a, b)).join('')}</div>`;
export const contarAvisos = (a, fns) => (!temPro(a) ? 0 : blocos(a, fns).filter((b) => !ehCalc(b)).reduce((s, b) => s + (b.match(/data-acao="ldZap"/g) || []).length, 0));
export const paginasFerramentas = (fns) => [
  { grupo: 'Ferramentas' },
  { id: 'avisos', rot: 'Avisos e mensagens', icone: 'bell-ringing', titulo: 'Avisos e mensagens prontas', render: (a) => paginaAvisos(a, fns), cont: (a) => contarAvisos(a, fns) },
  { id: 'calculadoras', rot: 'Calculadoras', icone: 'calculator', render: (a) => paginaCalculadoras(a, fns), montar: (a, c) => ligarCalcs(c) },
];

// Cada ferramenta como um item próprio no menu da esquerda (grupo "Ferramentas"):
// lista = [[id, rótulo, ícone, aba de LADOS onde o bloco nasce, começo do título do bloco], ...]
const textoH3 = (b) => ((b.match(/<h3>([\s\S]*?)<\/h3>/) || ['', ''])[1]).replace(/<[^>]+>/g, '').trim();
const blocoDe = (a, fn, prefixo) => blocos(a, [fn]).find((b) => textoH3(b).startsWith(prefixo)) || '';
// semPro: sistemas de plano único (Veltria Obras), em que tudo está incluso e nada leva a marca Pro
export const ferramentaPaginas = (L, lista, { semPro = false } = {}) => [
  { grupo: 'Ferramentas' },
  ...lista.map(([id, rot, icone, aba, prefixo]) => ({
    id: `f-${id}`, rot, icone, titulo: rot,
    render: (a) => { const b = blocoDe(a, L[aba], prefixo);
      return `<div class="ld-pagina ld-uma">${b ? (semPro ? b : travarPro(a, b)) : `<div class="ld-vazio">${ic('check-circle')}Nada por aqui agora.</div>`}</div>`; },
    montar: (a, c) => ligarCalcs(c),
    cont: (a) => { const b = blocoDe(a, L[aba], prefixo); if (!b || ehCalc(b)) return 0;
      if (!semPro && (!a.nuvem || !temPro(a))) return { n: 'Pro', tom: 'pro' };
      return (b.match(/data-acao="ldZap"/g) || []).length; },
  })),
];

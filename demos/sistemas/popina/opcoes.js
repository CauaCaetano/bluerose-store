// Popina · as opções de um produto, iguais para o garçom e para o cliente do cardápio online:
// tamanho (P/M/G, broto/grande), pizza em frações e borda, combo, grupos de complementos (obrigatórios ou não, com mínimo
// e máximo e preço por opção), pimenta e ponto (funções da casa), observação e quantidade. O preço final sai sempre daqui.
import { precoAgora, precoFracoes, precoBorda, faltaCombo, FRACAO_NOME } from './precos.js?v=28';

// escolhas obrigatórias que as funções da casa põem no prato marcado (o nome vira "Grupo: opção" na comanda e na cozinha)
export const ESCOLHAS_CASA = {
  picancia: ['pic', 'Nível de pimenta', ['Suave', 'Médio', 'Picante', 'Extra picante']],
  pontoCarne: ['pcarne', 'Ponto da carne', ['Mal passado', 'Ao ponto', 'Bem passado']],
  pontoMassa: ['pmassa', 'Ponto da massa', ['Al dente', 'Macia']],
};
// cada prato escolhe se pede a escolha da casa: '' (não pede), 'opcional' ou 'obrigatorio'; o valor antigo true vale como obrigatório
export const modoEscolha = (v) => (v === 'opcional' ? 'opcional' : v === true || v === 'obrigatorio' ? 'obrigatorio' : '');
// grupos do produto (os "adicionais" antigos viram um grupo opcional); ext.mods: funções ligadas (pimenta e ponto)
export function gruposDe(p, ext = {}) {
  // cota grátis (função "Adicionais com cota grátis"): as primeiras N opções saem de graça; da próxima em diante, o preço extra (ou o da opção)
  const cota = (x) => (ext.mods?.has?.('cotaAdicionais') && Number(x.gratis) > 0 ? { gratis: Math.round(Number(x.gratis)), extra: x.extra != null && x.extra !== '' ? Number(x.extra) : null } : {});
  const g = (p.grupos || []).map((x, i) => ({ id: x.id || `g${i}`, nome: x.nome, min: Number(x.min) || 0, max: Number(x.max) || 1, opcoes: x.opcoes || [], ...cota(x) }));
  Object.entries(ESCOLHAS_CASA).forEach(([k, [id, nome, ops]]) => {
    const modo = modoEscolha(p[k]);
    if (modo && ext.mods?.has?.(k) && !g.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) g.unshift({ id, nome, min: modo === 'obrigatorio' ? 1 : 0, max: 1, opcoes: ops.map((o) => ({ nome: o })), casa: true });
  });
  if (p.adicionais?.length) g.push({ id: 'adic', nome: 'Adicionais', min: 0, max: 20, opcoes: p.adicionais });
  return g;
}
// preço do tamanho escolhido (sem tamanho: o preço do produto)
export const precoTam = (p, tamNome) => (tamNome && p.tamanhos?.length ? (p.tamanhos.find((t) => t.nome === tamNome)?.preco ?? p.preco) : p.preco);
// o menor preço, para mostrar "a partir de"
export const aPartir = (p) => (p.tamanhos?.length ? Math.min(...p.tamanhos.map((t) => Number(t.preco) || 0)) : p.preco);
// a opção que o cliente mandou existe neste produto? (devolve com o preço do cadastro, nunca o que veio de fora)
export function opcaoReal(p, nome, ext = {}) {
  for (const g of gruposDe(p, ext)) {
    for (const o of g.opcoes) {
      if (nome === o.nome && g.id === 'adic') return { nome: o.nome, preco: Number(o.preco) || 0 };
      if (nome === `${g.nome}: ${o.nome}`) return { nome, preco: Number(o.preco) || 0 };
    }
  }
  return null;
}

// preço de cada opção escolhida num grupo com cota: as N primeiras grátis, as outras pelo preço extra (ou o da opção)
export const precoNaCota = (g, o, pos) => (g.gratis > 0 ? (pos < g.gratis ? 0 : g.extra ?? (Number(o.preco) || 0)) : Number(o.preco) || 0);
// refaz os preços dos adicionais pela cota (o que veio do cardápio do cliente é conferido aqui)
export function aplicarCota(p, adic = [], ext = {}) {
  const gs = gruposDe(p, ext).filter((g) => g.gratis > 0); if (!gs.length) return adic;
  const pos = {};
  return adic.map((a) => {
    const g = gs.find((x) => String(a.nome).startsWith(`${x.nome}: `)); if (!g) return a;
    const o = g.opcoes.find((y) => `${g.nome}: ${y.nome}` === a.nome) || {}, k = (pos[g.id] = (pos[g.id] ?? -1) + 1);
    return { ...a, preco: precoNaCota(g, o, k) };
  });
}
const legendaCota = (g, din) => (g.gratis > 0 ? ` · até ${g.gratis} grátis${g.extra != null ? `, depois + ${din(g.extra)} cada` : ''}` : '');

// combo em etapas (hamburgueria): depois do lanche, "Quer transformar em combo?" → acompanhamento → bebida, com desconto
// L.comboEtapas = { cats: ['lanches'], acomp: ['fritas'], bebida: ['refri'], desconto: 8 }
export function ofertaCombo(p, L = {}, mods = new Set(), produtos = []) {
  const C = L.comboEtapas; if (!mods.has?.('comboEtapas') || !C || !p || p.combo?.length || !(C.cats || []).includes(p.cat)) return null;
  const ok = (id) => produtos.find((x) => x.id === id && x.ativo !== false && !x.porKg);
  const acomp = (C.acomp || []).map(ok).filter(Boolean), bebida = (C.bebida || []).map(ok).filter(Boolean);
  if (!acomp.length || !bebida.length) return null;
  const desconto = Math.max(0, Number(C.desconto) || 0), menor = (l) => Math.min(...l.map((x) => Number(x.preco) || 0));
  return { acomp, bebida, desconto, aPartir: Math.max(0, menor(acomp) + menor(bebida) - desconto) };
}
// as escolhas de uma bebida no combo: o primeiro grupo obrigatório vira os botões (Coca-Cola, Guaraná...); os outros obrigatórios vão na 1ª opção
export function escolhasCombo(b) {
  const obr = (b.grupos || []).filter((g) => (Number(g.min) || 0) >= 1 && (g.opcoes || []).length), resto = obr.slice(1).map((g) => ({ nome: `${g.nome}: ${g.opcoes[0].nome}`, preco: Number(g.opcoes[0].preco) || 0 }));
  if (!obr.length) return [{ rot: b.nome, adic: [], preco: Number(b.preco) || 0 }];
  return obr[0].opcoes.map((o) => ({ rot: `${b.nome} · ${o.nome}`, adic: [{ nome: `${obr[0].nome}: ${o.nome}`, preco: Number(o.preco) || 0 }, ...resto], preco: (Number(b.preco) || 0) + (Number(o.preco) || 0) + resto.reduce((s, x) => s + x.preco, 0) }));
}
// confere o desconto do combo na comanda: cada acompanhamento marcado só ganha o desconto com um lanche e uma bebida do combo junto
export function aplicarComboEtapas(itens = [], L = {}, prodFn = () => null) {
  const C = L.comboEtapas; if (!C) return 0;
  const des = Math.max(0, Number(C.desconto) || 0), rasc = itens.filter((i) => !i.cancelado && i.status === 'rascunho');
  const ja = rasc.filter((i) => i.comboUp === 'acomp' && i.comboDesc).length;
  let lanches = rasc.filter((i) => !i.comboUp && !i.combo && !i.rodizio && (C.cats || []).includes(prodFn(i.prod)?.cat)).reduce((s, i) => s + (i.qtd || 1), 0) - ja;
  let bebidas = rasc.filter((i) => i.comboUp === 'bebida').length - ja, n = 0;
  rasc.filter((i) => i.comboUp === 'acomp' && !i.comboDesc).forEach((i) => {
    if (lanches > 0 && bebidas > 0 && des > 0) { i.comboDesc = Math.min(des, i.preco); i.preco = Math.round(Math.max(0, i.preco - des) * 100) / 100; i.promo = 'Combo'; lanches--; bebidas--; n++; }
  });
  return n;
}

// estado da escolha e o HTML do formulário; ligar() conecta os botões e chama mudou() a cada toque
// mods (Set) e loja: funções da casa e as regras delas (frações e bordas, combos, prato do dia, happy hour)
// incluso: o prato entra no rodízio da mesa (preço zero)
export function formOpcoes(p, { produtos, din, t, obsRapidas = [], obsLivre = true, mods = new Set(), loja = {}, incluso = false }) {
  const s = { qtd: 1, tam: p.tamanhos?.length ? p.tamanhos[p.tamanhos.length - 1].nome : '', meiaB: '', esc: {}, obs: [], frac: 1, sab: [], borda: -1, combo: {} };
  const P = (id) => produtos.find((x) => x.id === id);
  const fracoes = mods.has('meiaMeia'), regra = fracoes ? loja.fracoes?.regra || 'caro' : 'caro';
  const bordas = fracoes && p.pizza ? (loja.fracoes?.bordas || []).filter((b) => b.nome) : [];
  const grupos = gruposDe(p, { mods }).filter((g) => !(bordas.length && /^borda/i.test(g.nome)));
  const pizzas = p.pizza ? produtos.filter((x) => x.pizza && x.ativo !== false && x.id !== p.id) : [];
  const combo = mods.has('combos') && p.combo?.length ? p.combo : null;
  const idxTam = () => (s.tam && p.tamanhos?.length ? p.tamanhos.findIndex((x) => x.nome === s.tam) : -1);
  const base = (x, tam) => { const b = precoTam(x, tam); return precoAgora(x, b, { loja, mods, tam }).preco; };
  const curto = (x) => t(x.nome.replace(/^Pizza /, ''));
  const htmlBordas = () => bordas.map((b, k) => `<label class="op"><input type="radio" name="borda" value="${k}" ${s.borda === k ? 'checked' : ''}><span>${t(b.nome)}</span><b data-bp="${k}">+ ${din(precoBorda(b, idxTam()))}</b></label>`).join('');
  const html = `
    ${p.tamanhos?.length ? `<fieldset class="op-grupo"><legend>Tamanho <em>obrigatório</em></legend><div class="op-lista">${p.tamanhos.map((tm) => `<label class="op"><input type="radio" name="tam" value="${t(tm.nome)}" ${tm.nome === s.tam ? 'checked' : ''}><span>${t(tm.nome)}</span><b>${din(tm.preco)}</b></label>`).join('')}</div></fieldset>` : ''}
    ${combo ? combo.map((g, k) => `<fieldset class="op-grupo op-combo" data-cg="${k}"><legend>${t(g.nome)} <em>obrigatório</em></legend><div class="op-lista">${(g.itens || []).map(P).filter(Boolean).map((x) => `<label class="op"><input type="radio" name="combo-${k}" value="${x.id}"><span>${t(x.nome)}</span></label>`).join('')}</div></fieldset>`).join('') : ''}
    ${pizzas.length && fracoes ? `<fieldset class="op-grupo op-fracoes"><legend>Sabores <em>${regra === 'proporcional' ? 'o preço é a média dos sabores' : 'cobra o sabor mais caro'}</em></legend>
      <div class="seg" role="group" aria-label="Em quantos sabores">${[1, 2, 3, 4].map((n) => `<button type="button" data-frac="${n}" aria-pressed="${n === 1}">${n === 1 ? 'Inteira' : FRACAO_NOME[n]}</button>`).join('')}</div>
      <p class="mudo op-frac-txt" data-frac-txt hidden></p><div class="op-lista" data-sabores hidden>${pizzas.map((x) => `<label class="op"><input type="checkbox" name="sabor" value="${x.id}"><span>${curto(x)}</span></label>`).join('')}</div></fieldset>`
    : pizzas.length ? `<fieldset class="op-grupo"><legend>Meia a meia <em>opcional · cobra o sabor mais caro</em></legend><div class="op-lista">${pizzas.map((x) => `<label class="op"><input type="checkbox" name="meia" value="${x.id}"><span>½ ${curto(x)}</span></label>`).join('')}</div></fieldset>` : ''}
    ${bordas.length ? `<fieldset class="op-grupo"><legend>Borda <em>opcional · preço conforme o tamanho</em></legend><div class="op-lista"><label class="op"><input type="radio" name="borda" value="-1" checked><span>Sem borda</span></label><span data-bordas style="display:contents">${htmlBordas()}</span></div></fieldset>` : ''}
    ${grupos.map((g) => `<fieldset class="op-grupo ${g.casa ? 'op-casa' : ''}" data-g="${g.id}"><legend>${t(g.nome)} <em>${g.min ? `obrigatório${g.max > 1 ? ` · escolha ${g.min === g.max ? g.min : `de ${g.min} a ${g.max}`}` : ''}` : `opcional${g.max > 1 && g.max < 20 ? ` · até ${g.max}` : ''}`}${legendaCota(g, din)}</em></legend><div class="op-lista">
      ${g.opcoes.map((o, k) => `<label class="op"><input type="${g.max === 1 ? 'radio' : 'checkbox'}" name="g-${g.id}" value="${k}"><span>${t(o.nome)}</span>${Number(o.preco) && !g.gratis ? `<b>+ ${din(o.preco)}</b>` : ''}</label>`).join('')}</div>${g.gratis ? `<p class="mudo op-cota" data-cota="${g.id}">${g.gratis === 1 ? 'Sai 1 grátis' : `Saem ${g.gratis} grátis`}</p>` : ''}</fieldset>`).join('')}
    ${obsRapidas.length || obsLivre ? `<fieldset class="op-grupo"><legend>Alguma observação?</legend>${obsRapidas.length ? `<div class="chips quebra">${obsRapidas.map((o) => `<button type="button" class="chip" data-obs="${t(o)}">${t(o)}</button>`).join('')}</div>` : ''}
      ${obsLivre ? `<input class="op-livre" data-livre maxlength="120" placeholder="Escreva aqui (opcional)" aria-label="Observação">` : ''}</fieldset>` : ''}
    <div class="qtd"><button type="button" class="bt-ico grande" data-menos aria-label="Menos">−</button><b data-q>1</b><button type="button" class="bt-ico grande" data-mais aria-label="Mais">+</button></div>`;
  // sabores escolhidos (o produto aberto é sempre o primeiro)
  const sabores = () => (fracoes ? (s.frac > 1 ? [p, ...s.sab.map(P).filter(Boolean)] : [p]) : s.meiaB && P(s.meiaB) ? [p, P(s.meiaB)] : [p]);
  const unit = () => {
    if (incluso) return escolhidas().reduce((a, o) => a + o.preco, 0);
    const sb = sabores();
    const b = combo ? base(p, '') : sb.length > 1 ? precoFracoes(sb.map((x) => precoTam(x, s.tam)), regra) : base(p, s.tam);
    return b + escolhidas().reduce((a, o) => a + o.preco, 0);
  };
  function escolhidas() {
    const l = grupos.flatMap((g) => (s.esc[g.id] || []).map((k, pos) => ({ nome: g.id === 'adic' ? g.opcoes[k].nome : `${g.nome}: ${g.opcoes[k].nome}`, preco: precoNaCota(g, g.opcoes[k], pos) })));
    const b = bordas[s.borda]; if (b) l.unshift({ nome: `Borda: ${b.nome}`, preco: precoBorda(b, idxTam()) });
    return l;
  }
  const escolhaCombo = () => Object.entries(s.combo).map(([g, prod]) => ({ g: Number(g), prod }));
  // o que falta escolher (mensagem), ou '' se está tudo certo
  function falta() {
    if (combo) { const f = faltaCombo(combo, escolhaCombo()); if (f) return f; }
    if (fracoes && s.frac > 1 && s.sab.length !== s.frac - 1) return `Escolha mais ${s.frac - 1 - s.sab.length} ${s.frac - 1 - s.sab.length === 1 ? 'sabor' : 'sabores'}`;
    for (const g of grupos) { const n = (s.esc[g.id] || []).length; if (n < g.min) return g.min === 1 ? `Escolha: ${g.nome}` : `Escolha ${g.min} em ${g.nome}`; if (n > g.max) return `No máximo ${g.max} em ${g.nome}`; }
    return '';
  }
  function ligar(f, mudou) {
    const q = (sel) => f.querySelector(sel), qa = (sel) => [...f.querySelectorAll(sel)];
    qa('input[name=tam]').forEach((i) => { i.onchange = () => { s.tam = i.value; const bb = q('[data-bordas]'); if (bb) { bb.innerHTML = htmlBordas(); qa('input[name=borda]').forEach(ligaBorda); } mudou(); }; });
    qa('input[name=meia]').forEach((i) => { i.onchange = () => { qa('input[name=meia]').forEach((x) => { if (x !== i) x.checked = false; }); s.meiaB = i.checked ? i.value : ''; mudou(); }; });
    const ligaBorda = (i) => { i.onchange = () => { s.borda = Number(i.value); mudou(); }; };
    qa('input[name=borda]').forEach(ligaBorda);
    // frações: escolhe em quantos sabores e marca os outros (até n − 1)
    const txtFrac = () => { const e = q('[data-frac-txt]'); if (!e) return; e.hidden = s.frac === 1; e.textContent = s.frac > 1 ? `${FRACAO_NOME[s.frac]} ${p.nome.replace(/^Pizza /, '')} + escolha ${s.frac - 1} ${s.frac - 1 === 1 ? 'sabor' : 'sabores'}` : ''; };
    qa('[data-frac]').forEach((b) => { b.onclick = () => {
      s.frac = Number(b.dataset.frac); qa('[data-frac]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const l = q('[data-sabores]'); if (l) l.hidden = s.frac === 1;
      if (s.sab.length > s.frac - 1) { s.sab = s.sab.slice(0, s.frac - 1); qa('input[name=sabor]').forEach((x) => { x.checked = s.sab.includes(x.value); }); }
      txtFrac(); mudou();
    }; });
    qa('input[name=sabor]').forEach((i) => { i.onchange = () => {
      if (i.checked && s.sab.length >= s.frac - 1) { i.checked = false; return; }
      s.sab = qa('input[name=sabor]').filter((x) => x.checked).map((x) => x.value); mudou();
    }; });
    if (combo) combo.forEach((g, k) => qa(`input[name="combo-${k}"]`).forEach((i) => { i.onchange = () => { s.combo[k] = i.value; mudou(); }; }));
    grupos.forEach((g) => {
      const ins = qa(`input[name="g-${g.id}"]`);
      ins.forEach((i) => { i.onchange = () => {
        let sel = ins.filter((x) => x.checked).map((x) => Number(x.value));
        if (g.max > 1 && sel.length > g.max) { i.checked = false; sel = sel.filter((x) => x !== Number(i.value)); }
        s.esc[g.id] = sel;
        // cota grátis: diz quantos ainda saem de graça e quanto custa o próximo
        const ct = q(`[data-cota="${g.id}"]`); if (ct) { const r = g.gratis - sel.length; ct.textContent = r > 0 ? `Ainda ${r === 1 ? 'sai 1 grátis' : `saem ${r} grátis`}` : `Grátis usados (${g.gratis}). Cada um a mais: ${g.extra != null ? `+ ${din(g.extra)}` : 'o preço da opção'}`; }
        mudou();
      }; });
    });
    qa('[data-obs]').forEach((b) => { b.onclick = () => { const on = b.classList.toggle('on'); s.obs = on ? [...s.obs, b.dataset.obs] : s.obs.filter((x) => x !== b.dataset.obs); }; });
    q('[data-menos]').onclick = () => { s.qtd = Math.max(1, s.qtd - 1); q('[data-q]').textContent = s.qtd; mudou(); };
    q('[data-mais]').onclick = () => { s.qtd = Math.min(30, s.qtd + 1); q('[data-q]').textContent = s.qtd; mudou(); };
    mudou();
  }
  // o item pronto para entrar na comanda (ou na sacola do cliente)
  function item(f) {
    const livre = f.querySelector('[data-livre]')?.value.trim() || '';
    const tam = s.tam ? p.tamanhos.find((x) => x.nome === s.tam) : null;
    const sb = sabores().map((x) => x.id);
    return { prodId: p.id, qtd: s.qtd, tam: tam ? tam.nome : '', adic: escolhidas(), obs: [...s.obs, livre].filter(Boolean).join(', '),
      meia: sb.length === 2 ? { a: sb[0], b: sb[1] } : null, sabores: sb.length > 1 ? sb : null, combo: combo ? escolhaCombo() : null, unit: unit() };
  }
  return { html, ligar, item, unit, falta, s };
}
// nome do item como sai na comanda e na cozinha
export function nomeItem(p, { tam, meia, sabores }, prodB, produtos = null) {
  if (sabores?.length > 2 && produtos) { const l = sabores.map((id) => produtos.find((x) => x.id === id)).filter(Boolean); if (l.length > 2) return nomeSabores(l, tam); }
  let n = p.nome;
  if (meia && prodB) n = `Pizza meia ${p.nome.replace(/^Pizza /, '')} / meia ${prodB.nome.replace(/^Pizza /, '')}`;
  return tam ? `${n} (${tam})` : n;
}
// pizza em 2, 3 ou 4 sabores: "Pizza 1/3 calabresa / 1/3 muçarela / 1/3 portuguesa (Grande)"
export function nomeSabores(lista, tam) {
  const f = lista.length === 2 ? 'meia' : FRACAO_NOME[lista.length] || `1/${lista.length}`;
  const n = `Pizza ${lista.map((x) => `${f} ${x.nome.replace(/^Pizza /, '').toLowerCase()}`).join(' / ')}`;
  return tam ? `${n} (${tam})` : n;
}

// aberto agora? horarios[dia] = [['11:00','15:00'], ['18:00','01:00']] (turno que passa da meia-noite vale até o dia seguinte)
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const min = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
export function situacao(horarios, agora = new Date()) {
  if (!Array.isArray(horarios) || !horarios.some((d) => d?.length)) return { aberto: true, texto: '' };
  const dia = agora.getDay(), m = agora.getHours() * 60 + agora.getMinutes();
  const ontem = horarios[(dia + 6) % 7] || [];
  for (const [a, f] of ontem) if (min(f) < min(a) && m < min(f)) return { aberto: true, texto: `Aberto até ${f}` };
  for (const [a, f] of horarios[dia] || []) {
    const fim = min(f) <= min(a) ? 24 * 60 + min(f) : min(f);
    if (m >= min(a) && m < fim) return { aberto: true, texto: `Aberto até ${f}` };
  }
  for (const [a] of horarios[dia] || []) if (min(a) > m) return { aberto: false, texto: `Fechado agora · abre hoje às ${a}` };
  for (let k = 1; k <= 7; k++) { const d = (dia + k) % 7; if (horarios[d]?.length) return { aberto: false, texto: `Fechado agora · abre ${k === 1 ? 'amanhã' : DIAS[d]} às ${horarios[d][0][0]}` }; }
  return { aberto: false, texto: 'Fechado' };
}
export const textoHorarios = (horarios) => DIAS.map((n, d) => [n, (horarios?.[d] || []).map(([a, f]) => `${a}–${f}`).join(' e ') || 'fechado']);

// como um complemento aparece na comanda e na cozinha: escolha ("Ponto da carne: Ao ponto") ou acréscimo ("+ Bacon")
export const rotAdic = (a) => { const n = String(a?.nome || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); return n.includes(': ') ? n : `+ ${n}`; };

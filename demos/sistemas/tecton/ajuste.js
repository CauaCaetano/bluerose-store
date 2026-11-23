// Tecton · "Ajustar o Tecton para mim": no primeiro acesso, uma conversa curta (uma pergunta por tela) e o app se ajusta:
// o menu só com as telas escolhidas (o resto em "Mais funções"), o painel com os cartões das dores escolhidas,
// os primeiros passos, a barra de baixo do celular e os exemplos no vocabulário do ramo.
//
// Onde fica guardado (sempre aditivo: nada do que já existe muda de lugar):
//  - conta: db.config.ajuste (sobe com a empresa: a equipe convidada entra com o app já ajustado);
//  - demonstração: na raiz da chave (raiz().ajuste), valendo para as três empresas de exemplo;
//  - convidado com cargo limitado: só o próprio menu e o próprio painel, em db.config.perfis[e-mail].ajuste e neste aparelho.
// Sem ajuste (dados de antes, ou quem pulou), tudo continua como era: o menu inteiro do ramo e o painel completo.
import { db, grava, CONTA, RAMOS, raiz, ramoAtual, abrirEmpresaDemo, tela, TELAS, acao, ir, desenhar, definirPortao, cab, ico, t, $, $$, toast, folha, hoje } from './nucleo.js?v=4';
import { MENUS, BAIXO, FIM, PAINEIS, COMO } from './comum.js?v=4';

// ------------------------------------------------------------------ o que perguntar
// dor: [id, o que a pessoa quer resolver, detalhe, telas que entram no menu, cartões que entram no painel]
export const DORES = {
  construtora: [
    ['lucro', 'Saber se a obra dá lucro', 'orçado x gasto de cada obra, enquanto ela anda', ['obras', 'orcamentos'], ['k-lucro', 'resultado']],
    ['equipe', 'Controlar equipe e diárias', 'quem veio, em qual obra, e o que pagar na sexta', ['equipes'], ['k-equipe', 'semana']],
    ['cliente', 'O cliente parar de ligar pedindo notícia', 'diário com fotos e um link para ele acompanhar', ['diario'], ['cliente', 'canteiro']],
    ['medicao', 'Medição e cobrança', 'medir o avanço, o cliente aprovar e receber', ['financeiro'], ['k-receber', 'medicoes']],
    ['prazo', 'Obra no prazo', 'cronograma das etapas e o que está atrasado', [], ['cronograma']],
    ['compras', 'Compras e material da obra', 'pedido ao fornecedor e o que chegou', ['compras'], ['k-pagar', 'compras']],
    ['orcar', 'Orçar mais rápido', 'orçamento por etapa com BDI, em PDF', ['orcamentos'], ['orcamentos']],
    ['contas', 'Contas a pagar e receber, e o contador', 'fluxo de caixa e a planilha para o contador', ['financeiro'], ['k-receber', 'k-pagar']],
  ],
  loja: [
    ['orcamento', 'Orçamento no WhatsApp', 'mandar o orçamento e virar venda com um toque', ['orcs'], ['orcs']],
    ['entregas', 'Entregas', 'roteiro do caminhão, canhoto e o que faltou', ['entregas'], ['k-entregas', 'entregas']],
    ['fiado', 'Fiado e conta da obra', 'quem deve, o limite e a trava de quem atrasou', ['contas'], ['k-fiado', 'cobrar']],
    ['estoque', 'Estoque', 'o que está acabando e o pedido ao fornecedor', ['estoque', 'reposicao'], ['k-baixo', 'comprar']],
    ['caixa', 'Caixa do dia batendo', 'abertura, sangria e fechamento de cada caixa', ['caixa'], ['k-caixa', 'formas']],
    ['giro', 'Saber o que gira e o que está parado', 'o que mais vende e o dinheiro parado na prateleira', ['relatorios'], ['parado']],
    ['contas', 'Contas a pagar e receber, e o contador', 'fluxo de caixa e a planilha para o contador', ['financeiro'], ['formas']],
  ],
  imobiliaria: [
    ['espelho', 'Espelho de vendas', 'unidades por bloco e andar, reservas e tabela', ['imoveis'], ['k-livres', 'vendas']],
    ['parcelas', 'Parcelas dos contratos', 'entrada, mensais, balões, chaves e a correção', ['contratos'], ['k-parcelas', 'hoje', 'entra']],
    ['aluguel', 'Aluguel e repasse', 'cobrança do mês, atrasados e repasse ao proprietário', ['alugueis'], ['k-alugueis', 'hoje', 'entra', 'sai']],
    ['comissoes', 'Comissões', 'quanto cada corretor tem a receber', ['comissoes'], ['comissoes', 'sai']],
    ['leads', 'Interessados e visitas', 'ninguém fica sem resposta e a visita é confirmada', ['funil', 'visitas'], ['hoje', 'funil']],
    ['contas', 'Contas a pagar e receber, e o contador', 'fluxo de caixa e a planilha para o contador', ['financeiro'], ['entra', 'sai']],
  ],
};
// o coração de cada ramo fica sempre no menu
const BASE = { construtora: { telas: ['obras'], painel: ['k-obras', 'obras', 'atencao'] }, loja: { telas: ['balcao'], painel: ['k-vendas'] }, imobiliaria: { telas: ['imoveis'], painel: ['hoje'] } };
// quem usa: [id, nome, detalhe, ramo (ou todos), telas, primeiro na barra do celular]
const QUEM = [
  ['dono', 'Só eu', 'eu cuido de tudo', null, [], []],
  ['escritorio', 'Escritório ou financeiro', 'quem paga e recebe', null, ['financeiro'], []],
  ['mestre', 'Mestre de obras ou encarregado', 'aponta a equipe e faz o diário na obra', 'construtora', ['diario', 'equipes'], ['diario', 'equipes']],
  ['caixa', 'Caixa ou vendedor do balcão', 'vende, recebe e faz orçamento', 'loja', ['balcao', 'caixa'], ['balcao']],
  ['motorista', 'Motorista ou entregador', 'vê as entregas do dia e dá baixa', 'loja', ['entregas'], ['entregas']],
  ['corretor', 'Corretor', 'interessados, visitas e propostas', 'imobiliaria', ['funil', 'visitas'], ['funil', 'visitas']],
];
const TAM = {
  construtora: ['Quantas obras vocês tocam ao mesmo tempo?', [['1', '1 obra'], ['2-5', '2 a 5'], ['6+', '6 ou mais']]],
  loja: ['Quantos caixas tem o balcão?', [['1', '1 caixa'], ['2-3', '2 ou 3'], ['4+', '4 ou mais']]],
  imobiliaria: ['Quantos imóveis vocês cuidam, de venda e de aluguel?', [['-30', 'até 30'], ['30-150', '30 a 150'], ['150+', 'mais de 150']]],
};
const PESSOAS = [['1', 'Só eu'], ['2-5', '2 a 5'], ['6-20', '6 a 20'], ['20+', 'mais de 20']];
const APARELHO = [['pc', 'Mais no computador', 'no escritório ou no balcão', 'painel'], ['cel', 'Mais no celular', 'na obra, na rua, nas visitas', 'diario'], ['ambos', 'Nos dois', 'um pouco de cada', 'troca']];
const ICO_RAMO = { construtora: 'capacete', loja: 'loja', imobiliaria: 'predio' };
const EXEMPLO = { construtora: 'Alicerce Construções', loja: 'Depósito São Bento', imobiliaria: 'Vale Imóveis' };
const NOME_TELA = (r, h) => (h === 'equipe' ? FIM[0] : (MENUS[r] || []).find((m) => m[0] === h)) || null;

// ------------------------------------------------------------------ montar o ajuste a partir das respostas
export function gerar(resp) {
  const menu = {}, baixo = {}, painel = {};
  resp.ramos.forEach((r) => {
    const ds = (resp.dores[r] || []).map((id) => DORES[r].find((d) => d[0] === id)).filter(Boolean), qs = QUEM.filter((q) => resp.quem.includes(q[0]) && (!q[3] || q[3] === r));
    const tel = ['painel', ...BASE[r].telas, ...ds.flatMap((d) => d[3]), ...qs.flatMap((q) => q[4])];
    const tam = resp.tam?.[r];
    if (r === 'loja' && tam && tam !== '1') tel.push('caixa');
    if ((r === 'construtora' && tam === '6+') || (r === 'imobiliaria' && tam === '150+')) tel.push('financeiro');
    if (!ds.length) tel.push(...MENUS[r].map((m) => m[0]));
    tel.push('clientes');
    if (resp.pessoas !== '1' || qs.some((q) => q[0] !== 'dono')) tel.push('equipe');
    menu[r] = [...new Set(tel)].filter((h) => NOME_TELA(r, h));
    const cel = resp.aparelho === 'cel', campo = { construtora: ['diario', 'obras', 'equipes'], loja: ['balcao', 'entregas', 'contas'], imobiliaria: ['funil', 'visitas', 'imoveis'] }[r];
    const pri = [...qs.flatMap((q) => q[5]), ...(cel ? campo.filter((h) => menu[r].includes(h)) : []), ...menu[r].filter((h) => h !== 'painel' && h !== 'clientes' && h !== 'equipe'), ...BAIXO[r]];
    baixo[r] = ['painel', ...[...new Set(pri)].filter((h) => h !== 'painel' && (MENUS[r] || []).some((m) => m[0] === h)).slice(0, 3)];
    const B = PAINEIS[r], blocos = ds.length ? [...ds.flatMap((d) => d[4]), ...BASE[r].painel] : B.padrao.slice();
    let p = [...new Set(blocos)].filter((k) => B.nomes[k]);
    if (cel) p = p.filter((k) => k !== 'cronograma');
    const kpis = p.filter((k) => k.startsWith('k-')).slice(0, 4);
    painel[r] = [...kpis, ...p.filter((k) => !k.startsWith('k-'))];
  });
  return { menu, baixo, painel };
}

// ------------------------------------------------------------------ ler o ajuste que vale agora
const papelNuvem = () => (window.veltriaNuvem?.papel?.() || window.veltriaAbrir?.papel || 'membro');
export const souGestor = () => !CONTA || ['dono', 'admin'].includes(papelNuvem());
const CH_MEU = 'tecton-v1-meu-ajuste';
let emailEu = '';
const lerMeu = () => { try { return JSON.parse(localStorage.getItem(CH_MEU) || 'null'); } catch { return null; } };
export function ajusteEmpresa() { return CONTA ? db?.config.ajuste || null : raiz()?.ajuste || null; }
function meu() { if (souGestor()) return null; const p = (emailEu && db?.config.perfis?.[emailEu]?.ajuste) || lerMeu(); return p && (p.menu || p.painel || p.baixo) ? p : null; }
export function ajusteAtual() {
  const a = ajusteEmpresa(), m = meu(); if (!m) return a;
  return { ...(a || {}), menu: { ...(a?.menu || {}), ...(m.menu || {}) }, baixo: { ...(a?.baixo || {}), ...(m.baixo || {}) }, painel: { ...(a?.painel || {}), ...(m.painel || {}) }, pessoal: true };
}
const todas = (r) => [...(MENUS[r] || []), FIM[0]];
export function menuDe(r = ramoAtual()) {
  const l = ajusteAtual()?.menu?.[r]; if (!l) return todas(r);
  const m = l.map((h) => NOME_TELA(r, h)).filter(Boolean); return m[0]?.[0] === 'painel' ? m : [MENUS[r][0], ...m.filter((x) => x[0] !== 'painel')];
}
export const foraDe = (r = ramoAtual()) => todas(r).filter((x) => !menuDe(r).some((m) => m[0] === x[0]));
export function baixoDe(r = ramoAtual()) {
  const l = (ajusteAtual()?.baixo?.[r] || BAIXO[r]).filter((h) => (MENUS[r] || []).some((m) => m[0] === h));
  const resto = menuDe(r).map((m) => m[0]).filter((h) => !l.includes(h) && h !== 'equipe');
  return [...l, ...resto].slice(0, 4);
}
export const painelDe = (r = ramoAtual()) => (ajusteAtual()?.painel?.[r] || PAINEIS[r].padrao).filter((k) => PAINEIS[r].nomes[k]);

// grava uma mudança: o dono muda o da empresa; o convidado com cargo limitado muda só o dele
function mudar(f) {
  const r = ramoAtual();
  if (souGestor()) {
    let a = ajusteEmpresa();
    if (!a) { a = { v: 1, dia: hoje(), resp: null, menu: {}, baixo: {}, painel: {}, passos: { feitos: [], fechado: false } }; if (CONTA) db.config.ajuste = a; else raiz().ajuste = a; }
    a.menu ||= {}; a.baixo ||= {}; a.painel ||= {};
    if (!a.menu[r]) a.menu[r] = menuDe(r).map((m) => m[0]); if (!a.baixo[r]) a.baixo[r] = baixoDe(r); if (!a.painel[r]) a.painel[r] = painelDe(r);
    f(a, r);
  } else {
    const m = lerMeu() || {}; m.menu ||= {}; m.baixo ||= {}; m.painel ||= {};
    if (!m.menu[r]) m.menu[r] = menuDe(r).map((x) => x[0]); if (!m.baixo[r]) m.baixo[r] = baixoDe(r); if (!m.painel[r]) m.painel[r] = painelDe(r);
    f(m, r);
    try { localStorage.setItem(CH_MEU, JSON.stringify(m)); } catch { /* sem espaço */ }
    if (emailEu) db.config.perfis = { ...(db.config.perfis || {}), [emailEu]: { ...(db.config.perfis?.[emailEu] || {}), ajuste: m } };
  }
  grava(); dispatchEvent(new Event('tecton-ramo'));
}
function voltarAoDaEmpresa() {
  try { localStorage.removeItem(CH_MEU); } catch { /* ok */ }
  if (emailEu && db.config.perfis?.[emailEu]) { delete db.config.perfis[emailEu].ajuste; }
  grava(); dispatchEvent(new Event('tecton-ramo'));
}
if (CONTA && window.BRAssinatura) window.BRAssinatura.conta().then((x) => { emailEu = String(x?.email || '').toLowerCase(); if (!souGestor()) dispatchEvent(new Event('tecton-ramo')); }).catch(() => {});

// ------------------------------------------------------------------ quando a conversa abre sozinha
const DEMO_RAMO = new URLSearchParams(location.search).get('ramo');
definirPortao(() => {
  if (forcada) return '_ajuste';
  if (CONTA) { if (db && !db.config.ramos.length) return souGestor() ? '_ajuste' : '_espera'; return null; }
  const R = raiz();
  if (R && !R.ajuste && !R.pulou && !R.ativa) return '_ajuste';
  return null;
});
let forcada = false;

// ------------------------------------------------------------------ a conversa (uma pergunta por tela)
let C = null; // { passo, resp }
const novaResp = () => ({ ramos: DEMO_RAMO && RAMOS[DEMO_RAMO] ? [DEMO_RAMO] : [], tam: {}, pessoas: '', dores: {}, quem: [], aparelho: '' });
const PASSOS = 6;
function htmlConversa() {
  if (!C) C = { passo: 0, resp: ajusteEmpresa()?.resp ? JSON.parse(JSON.stringify(ajusteEmpresa().resp)) : novaResp() };
  const r = C.resp, p = C.passo, ramosOrd = Object.keys(RAMOS).filter((k) => r.ramos.includes(k));
  const op = (attr, val, on, tit, sub = '', icone = '', num = 0) => `<button type="button" class="op" ${attr}="${t(val)}" aria-pressed="${!!on}">${icone ? ico(icone) : ''}<span><b>${t(tit)}</b>${sub ? `<small>${t(sub)}</small>` : ''}</span>${num ? `<em class="op-num" aria-label="${num}º">${num}º</em>` : `<i class="op-marca" aria-hidden="true">${ico('check')}</i>`}</button>`;
  let corpo = '', pode = false, dica = '';
  if (p === 0) {
    corpo = `<h1>O que a sua empresa faz?</h1><p class="conv-sub">Pode marcar mais de um. O Tecton mostra só o que é do seu ramo.</p><div class="ops ops-ramos">${Object.entries(RAMOS).map(([k, x]) => op('data-r', k, r.ramos.includes(k), x.nome, { construtora: 'obras, reformas e empreitadas', loja: 'balcão, entregas e conta da obra', imobiliaria: 'vendas, lançamentos e aluguéis' }[k], ICO_RAMO[k])).join('')}</div>`;
    pode = r.ramos.length > 0;
  } else if (p === 1) {
    corpo = `<h1>Qual o tamanho da empresa?</h1><p class="conv-sub">É só para arrumar as telas. Dá para mudar depois.</p>${ramosOrd.map((k) => `<div class="conv-grupo"><h2>${t(TAM[k][0])}</h2><div class="ops ops-linha">${TAM[k][1].map(([v, n]) => op(`data-tam-${k}`, v, r.tam[k] === v, n)).join('')}</div></div>`).join('')}
      <div class="conv-grupo"><h2>Quantas pessoas vão usar o Tecton?</h2><div class="ops ops-linha">${PESSOAS.map(([v, n]) => op('data-pes', v, r.pessoas === v, n)).join('')}</div></div>`;
    pode = ramosOrd.every((k) => r.tam[k]) && !!r.pessoas;
  } else if (p === 2) {
    corpo = `<h1>O que você mais quer resolver?</h1><p class="conv-sub">Toque na ordem do que mais importa (pode marcar quantas quiser). O que você marca sobe para o alto, numerado na sua ordem; o painel começa pelo 1º.</p>${ramosOrd.map((k) => `<div class="conv-grupo">${ramosOrd.length > 1 ? `<h2>${t(RAMOS[k].nome)}</h2>` : ''}<div class="ops">${[...(r.dores[k] || []).map((id) => DORES[k].find((d) => d[0] === id)).filter(Boolean), ...DORES[k].filter((d) => !(r.dores[k] || []).includes(d[0]))].map(([id, n, s]) => { const i = (r.dores[k] || []).indexOf(id); return op(`data-dor-${k}`, id, i >= 0, n, s, '', i + 1); }).join('')}</div></div>`).join('')}`;
    const ord = ramosOrd.flatMap((k) => (r.dores[k] || []).map((d) => DORES[k].find((x) => x[0] === d)?.[1])).filter(Boolean);
    corpo += ord.length ? `<p class="conv-ordem"><b>Sua ordem:</b> ${ord.map((n, i) => `${i + 1}º ${t(n)}`).join(' · ')}</p>` : '';
    pode = ramosOrd.some((k) => (r.dores[k] || []).length); dica = 'Escolha pelo menos uma.';
  } else if (p === 3) {
    corpo = `<h1>Quem vai usar?</h1><p class="conv-sub">Cada um entra com o próprio e-mail e vê só o que for dele.</p><div class="ops">${QUEM.filter((q) => !q[3] || r.ramos.includes(q[3])).map(([id, n, s]) => op('data-quem', id, r.quem.includes(id), id === 'dono' ? 'Só eu (o dono)' : n, s)).join('')}</div>`;
    pode = r.quem.length > 0;
  } else if (p === 4) {
    corpo = `<h1>Vai usar mais no computador ou no celular?</h1><p class="conv-sub">O Tecton funciona nos dois; isto só decide o que vem primeiro.</p><div class="ops ops-ramos">${APARELHO.map(([v, n, s, i]) => op('data-apar', v, r.aparelho === v, n, s, i)).join('')}</div>`;
    pode = !!r.aparelho;
  } else {
    const g = gerar(r), k0 = ramosOrd[0];
    corpo = `<h1>Pronto! Seu Tecton ficou assim</h1><p class="conv-sub">${ramosOrd.length > 1 ? `Os ${ramosOrd.length} ramos ficam ligados; troque pelo botão no alto do menu.` : `Arrumado para ${t(RAMOS[k0].nome.toLowerCase())}.`} O que ficou de fora está em <b>Mais funções</b>.</p>
      ${ramosOrd.map((k) => `<div class="conv-resumo">${ramosOrd.length > 1 ? `<h2>${ico(ICO_RAMO[k])}${t(RAMOS[k].curto)}</h2>` : ''}
        <div><h3>No menu</h3><p class="conv-exp">Painel e ${t({ construtora: 'Obras', loja: 'Balcão', imobiliaria: 'Imóveis' }[k])} sempre primeiro; depois, a sua ordem</p><ol>${g.menu[k].map((h) => `<li>${ico(NOME_TELA(k, h)[2])}${t(NOME_TELA(k, h)[1])}</li>`).join('')}</ol></div>
        <div><h3>No painel</h3><p class="conv-exp">Números no alto; depois as listas, na sua ordem</p><ol>${g.painel[k].map((b) => `<li>${t(PAINEIS[k].nomes[b])}</li>`).join('')}</ol></div>
        <div><h3>Barra do celular</h3><p class="conv-exp">As 4 telas que você mais usa e o Mais</p><p class="conv-barra">${[...g.baixo[k], 'mais'].map((h) => h === 'mais' ? `<span>${ico('mais')}Mais</span>` : `<span>${ico(NOME_TELA(k, h)[2])}${t(NOME_TELA(k, h)[1].split(' ')[0])}</span>`).join('')}</p></div></div>`).join('')}
      <p class="mudo peq">Mude quando quiser em Configurações › Ajustar o Tecton para mim.</p>`;
    pode = true;
  }
  const fim = p === PASSOS - 1;
  return `<div class="conv" data-passo="${p}"><div class="conv-topo"><img src="simbolo-128.png?v=1" alt="" width="40" height="40"><div class="conv-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${PASSOS}" aria-valuenow="${p + 1}" aria-label="Passo ${p + 1} de ${PASSOS}"><i style="width:${(p + 1) / PASSOS * 100}%"></i></div><span class="conv-n">${fim ? 'Pronto' : `${p + 1} de ${PASSOS - 1}`}</span></div>
    <div class="conv-corpo">${p === 0 && !ajusteEmpresa() ? `<p class="conv-ola">${CONTA ? 'Bem-vindo ao Tecton! Responda' : 'Olá! Antes de ver o exemplo, responda'} 5 perguntas rápidas e o Tecton se ajusta a você.</p>` : ''}${corpo}</div>
    <div class="conv-pe">${p > 0 ? `<button type="button" class="bt bt-conv" data-conv="voltar">${ico('voltar')}Voltar</button>` : (forcada ? `<button type="button" class="bt bt-conv" data-conv="cancelar">Cancelar</button>` : '<span></span>')}
      <button type="button" class="bt cheio bt-conv" data-conv="${fim ? 'fim' : 'seguir'}" ${pode ? '' : 'disabled'}>${fim ? `${ico('check')}${CONTA ? 'Começar a usar' : 'Ver com a empresa de exemplo'}` : `Continuar${ico('frente')}`}</button></div>
    ${!pode && dica ? `<p class="mudo peq conv-dica">${t(dica)}</p>` : ''}
    ${!CONTA && !forcada && !fim ? '<p class="conv-pular"><button type="button" data-conv="pular">Pular e ver o exemplo</button></p>' : ''}</div>`;
}
function pintar() { const el = document.getElementById('tela'); el.innerHTML = htmlConversa(); el.querySelector('.conv-corpo h1')?.setAttribute('tabindex', '-1'); el.querySelector('.conv-corpo h1')?.focus({ preventScroll: true }); scrollTo(0, 0); }
function tocar(e) {
  const b = e.target.closest('button'); if (!b || !C || !b.closest('.conv')) return;
  const r = C.resp, ds = b.dataset, alterna = (l, v) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
  if (ds.r) r.ramos = alterna(r.ramos, ds.r);
  else if (ds.pes) r.pessoas = ds.pes;
  else if (ds.quem) { r.quem = alterna(r.quem, ds.quem); if (ds.quem === 'dono' && r.quem.includes('dono')) r.quem = ['dono']; else if (ds.quem !== 'dono') r.quem = r.quem.filter((x) => x !== 'dono'); }
  else if (ds.apar) { r.aparelho = ds.apar; pintar(); setTimeout(() => { if (C && C.passo === 4) { C.passo = 5; pintar(); } }, 260); return; }
  else if (ds.conv === 'seguir') { if (C.passo === 3 && !r.quem.length) return; C.passo = Math.min(PASSOS - 1, C.passo + 1); if (C.passo === 3 && !r.quem.length && r.pessoas === '1') r.quem = ['dono']; }
  else if (ds.conv === 'voltar') C.passo = Math.max(0, C.passo - 1);
  else if (ds.conv === 'cancelar') { C = null; forcada = false; document.body.classList.remove('conversa'); ir('config/cfg-ajuste'); return; }
  else if (ds.conv === 'pular') { pular(); return; }
  else if (ds.conv === 'fim') { terminar(); return; }
  else { const k = Object.keys(ds).find((x) => x.startsWith('tam') || x.startsWith('dor')); if (!k) return;
    const ramo = k.slice(3).toLowerCase(); if (k.startsWith('tam')) r.tam[ramo] = ds[k]; else r.dores[ramo] = alterna(r.dores[ramo] || [], ds[k]); }
  pintar();
}
document.addEventListener('click', tocar);
function terminar() {
  const r = C.resp, g = gerar(r), antes = ajusteEmpresa(), aj = { v: 1, dia: hoje(), resp: r, ...g, passos: antes?.passos || { feitos: [], fechado: false } };
  const ramos = Object.keys(RAMOS).filter((k) => r.ramos.includes(k));
  if (CONTA) {
    db.config.ajuste = aj; db.config.ramos = [...new Set([...ramos])]; if (!ramos.includes(db.config.ramo)) db.config.ramo = ramos[0];
    if (!db.config.nome) db.config.nome = window.veltriaConta?.empresa || ''; grava();
  } else {
    raiz().ajuste = aj; const a = raiz().ativa; abrirEmpresaDemo(ramos.includes(a) ? a : ramos[0]);
  }
  C = null; forcada = false; document.body.classList.remove('conversa');
  dispatchEvent(new Event('tecton-ramo')); location.hash = 'painel'; desenhar(true);
  toast(antes ? 'Pronto: o Tecton foi ajustado de novo' : 'Pronto: o Tecton ficou do seu jeito');
}
function pular() {
  const R = raiz(); R.pulou = 1; C = null; document.body.classList.remove('conversa');
  if (DEMO_RAMO && RAMOS[DEMO_RAMO]) { abrirEmpresaDemo(DEMO_RAMO); dispatchEvent(new Event('tecton-ramo')); location.hash = 'painel'; desenhar(true); return; }
  grava(); desenhar(true);
}
tela('_ajuste', { html: () => { document.body.classList.add('conversa'); return htmlConversa(); }, montar: (el) => { el.querySelector('.conv-corpo h1')?.setAttribute('tabindex', '-1'); } });
// Configurações › "Refazer as perguntas"
tela('ajuste', { titulo: 'Ajustar o Tecton', html: () => { if (!souGestor()) return cab('Ajustar o Tecton', 'Só o dono refaz as perguntas; você ajusta o seu menu e o seu painel em Configurações.', '', 'config/cfg-ajuste'); forcada = true; C = null; document.body.classList.add('conversa'); return htmlConversa(); } });
tela('_espera', { html: () => `<div class="escolha"><h1>Quase lá</h1><p class="mudo" style="margin-top:8px">O dono da empresa ainda está ajustando o Tecton (são 5 perguntas rápidas). Assim que ele terminar, o seu aparelho abre já arrumado, sem você precisar fazer nada.</p><div class="linha-bts" style="margin-top:16px"><button type="button" class="bt cheio" onclick="location.reload()">${ico('troca')}Ver de novo</button></div></div>` });
document.addEventListener('tecton-tela', (e) => { if (!['_ajuste', 'ajuste'].includes(e.detail.nome) || (e.detail.nome === 'ajuste' && !souGestor())) document.body.classList.remove('conversa'); });

// ------------------------------------------------------------------ painel montado com os blocos escolhidos
const passosVisiveis = () => souGestor() && ajusteEmpresa() && !ajusteEmpresa().passos?.fechado;
tela('painel', {
  titulo: 'Painel',
  html() {
    const r = ramoAtual(), B = PAINEIS[r], aj = ajusteAtual(), blocos = B.blocos(aj), ordem = painelDe(r);
    const kpis = ordem.filter((k) => blocos[k]?.tipo === 'kpi'), resto = ordem.filter((k) => blocos[k] && blocos[k].tipo !== 'kpi');
    let h = '', meia = [];
    const solta = () => { if (meia.length === 2) h += `<div class="grade ${meia[0] === 'obras' ? 'g-larga' : 'g2'}">${meia.map((k) => blocos[k].html()).join('')}</div>`; else if (meia.length) h += blocos[meia[0]].html(); meia = []; };
    resto.forEach((k) => { if (blocos[k].tipo === 'meia') { meia.push(k); if (meia.length === 2) solta(); } else { solta(); h += blocos[k].html(); } }); solta();
    const vazioP = !kpis.length && !resto.length ? `<div class="cartao"><p class="mudo">O seu painel está sem cartões.</p><button type="button" class="bt cheio" data-ir="config/cfg-ajuste">${ico('ajustes')}Escolher os cartões</button></div>` : '';
    return B.cab() + (passosVisiveis() ? htmlPassos(r) : '') + (kpis.length ? `<div class="grade ${kpis.length >= 4 ? 'g4' : kpis.length === 3 ? 'g3' : 'g2'} painel-kpis">${kpis.map((k) => blocos[k].html()).join('')}</div>` : '') + `<div class="painel-blocos">${h}</div>` + vazioP;
  },
  montar(el) { PAINEIS[ramoAtual()].montar?.(el); },
});

// ------------------------------------------------------------------ primeiros passos (checklist guiado)
const tem = (l) => Array.isArray(l) && l.length > 0;
const PASSOS_RAMO = {
  construtora: [
    ['obra', 'Cadastre a sua primeira obra', 'as etapas padrão já vêm prontas', null, () => tem(db.obras), 'data-acao="obra-nova"'],
    ['orc', 'Monte o orçamento por etapa', 'material, mão de obra, equipamento e BDI', ['lucro', 'orcar'], () => db.obras.some((o) => tem(o.orc)), 'data-ir="orcamentos"'],
    ['trab', 'Cadastre a equipe e a diária de cada um', 'para apontar quem veio em qual obra', ['equipe'], () => tem(db.trab), 'data-ir="equipes/pessoas"'],
    ['diario', 'Faça o primeiro diário com foto', 'pelo celular, na obra', ['cliente'], () => db.obras.some((o) => tem(o.diario)), 'data-ir="diario"'],
    ['link', 'Mande o link da obra ao cliente', 'ele acompanha sem ligar para você', ['cliente'], () => false, 'data-ir="obras"'],
    ['medicao', 'Lance a primeira medição', 'o avanço vira cobrança quando o cliente aprova', ['medicao'], () => db.obras.some((o) => tem(o.medicoes)), 'data-ir="obras"'],
    ['pedido', 'Faça o primeiro pedido de material', 'no WhatsApp do fornecedor', ['compras'], () => tem(db.pedidos), 'data-ir="compras"'],
  ],
  loja: [
    ['prod', 'Cadastre os produtos', 'com unidade (saco, m³, metro) e o mínimo do estoque', null, () => tem(db.produtos), 'data-ir="estoque"'],
    ['venda', 'Faça a primeira venda no balcão', 'o leitor de código de barras USB funciona como teclado', null, () => tem(db.vendas), 'data-ir="balcao"'],
    ['orc', 'Mande um orçamento no WhatsApp', 'e vire venda quando o cliente aceitar', ['orcamento'], () => tem(db.orcs), 'data-ir="orcs"'],
    ['cam', 'Cadastre o caminhão e o motorista', 'para montar o roteiro do dia', ['entregas'], () => tem(db.caminhoes), 'data-ir="entregas"'],
    ['conta', 'Abra a primeira conta da obra ou fiado', 'com limite e prazo', ['fiado'], () => tem(db.contasObra) || tem(db.fiado), 'data-ir="contas"'],
    ['caixa', 'Abra o caixa com o troco da gaveta', 'e feche no fim do dia', ['caixa'], () => tem(db.caixasDia), 'data-ir="caixa"'],
  ],
  imobiliaria: [
    ['imovel', 'Cadastre o primeiro imóvel ou lançamento', 'no lançamento, as unidades se criam sozinhas', null, () => tem(db.imoveis) || tem(db.emps), 'data-ir="imoveis"'],
    ['lead', 'Cadastre um interessado', 'e responda pelo WhatsApp a um toque', ['leads'], () => tem(db.leads), 'data-acao="lead-ed"'],
    ['contrato', 'Lance um contrato de venda com as parcelas', 'entrada, mensais, balões e chaves', ['parcelas'], () => tem(db.contratos), 'data-ir="contratos"'],
    ['aluguel', 'Cadastre um contrato de aluguel', 'com a taxa de administração e o dia do repasse', ['aluguel'], () => tem(db.alugueis), 'data-ir="alugueis"'],
    ['corretor', 'Cadastre os corretores e a comissão', 'venda e captação', ['comissoes'], () => tem(db.corretores), 'data-ir="comissoes"'],
  ],
};
function listaPassos(r) {
  const a = ajusteEmpresa(), resp = a?.resp, ds = resp?.dores?.[r] || [], feitos = a?.passos?.feitos || [];
  const l = [['empresa', 'Ponha o nome e o logo da empresa', 'saem no orçamento, no recibo e no contrato', null, () => !!db.config.nome && !!db.config.marca?.logo, 'data-ir="config/cfg-empresa"'],
    ...PASSOS_RAMO[r].filter((x) => !x[3] || !ds.length || x[3].some((d) => ds.includes(d))),
    ...(['loja', 'imobiliaria'].includes(r) ? [['pix', 'Ponha a sua chave Pix', 'vai pronta nas cobranças', null, () => !!db.config.pix, 'data-ir="config/cfg-empresa"']] : []),
    ...(resp && (resp.pessoas !== '1' || resp.quem.some((q) => q !== 'dono')) ? [['convite', `Convide ${{ construtora: 'o mestre de obras', loja: 'o caixa', imobiliaria: 'os corretores' }[r]} e quem mais for usar`, 'cada um com o próprio e-mail', null, () => tem(db.equipe), 'data-ir="equipe"']] : []),
    ...(resp && resp.aparelho !== 'pc' ? [['celular', 'Instale o Tecton no celular', 'abre como um aplicativo, sem loja', null, () => false, 'data-acao="passo-celular"']] : [])];
  return l.map(([id, n, s, , ok, at]) => ({ id, n, s, at, ok: feitos.includes(id) || ok() }));
}
function htmlPassos(r) {
  const l = listaPassos(r), f = l.filter((x) => x.ok).length;
  if (f === l.length) return '';
  return `<section class="cartao passos" aria-label="Primeiros passos"><div class="cartao-cab"><h2>Primeiros passos · ${f} de ${l.length}</h2><button type="button" class="bt pq" data-acao="passos-fechar">Esconder</button></div>${'' /* barra */}<div class="barra pri" role="img" aria-label="${f} de ${l.length} feitos"><i style="width:${f / l.length * 100}%"></i></div>
    <ol class="passos-lista">${l.filter((x) => !x.ok).map((x) => `<li><span class="passo-ok" aria-hidden="true"></span><span class="tx"><b>${t(x.n)}</b><small>${t(x.s)}</small></span><span class="passo-bts"><button type="button" class="bt pq cheio" ${x.at}>Fazer</button><button type="button" class="bt-ico" data-acao="passo-feito" data-id="${x.id}" aria-label="Marcar como feito: ${t(x.n)}" title="Já fiz">${ico('check')}</button></span></li>`).join('')}</ol>
    ${f ? `<details class="passos-feitos"><summary>${ico('check')}${f === 1 ? '1 feito' : `${f} feitos`}</summary><ul>${l.filter((x) => x.ok).map((x) => `<li>${t(x.n)}</li>`).join('')}</ul></details>` : ''}</section>`;
}
acao('passos-fechar', () => { const a = ajusteEmpresa(); if (!a) return; a.passos = { ...(a.passos || { feitos: [] }), fechado: true }; grava(); toast('Primeiros passos escondidos: mostre de novo em Configurações'); });
acao('passo-feito', (b) => { const a = ajusteEmpresa(); if (!a) return; a.passos ||= { feitos: [], fechado: false }; a.passos.feitos = [...new Set([...(a.passos.feitos || []), b.dataset.id])]; grava(); });
acao('passo-celular', () => folha({ titulo: 'Instalar no celular', corpo: `<ol class="como-lista"><li>Abra o Tecton no navegador do celular, com o seu login.</li><li><b>Android (Chrome):</b> menu ⋮ › “Instalar app” ou “Adicionar à tela inicial”.</li><li><b>iPhone (Safari):</b> botão de compartilhar › “Adicionar à Tela de Início”.</li><li>O ícone do Tecton aparece junto dos outros aplicativos e abre direto na sua empresa.</li></ol>`, pe: '<button type="button" class="bt" data-fechar>Fechar</button><button type="button" class="bt cheio" data-acao="passo-feito" data-id="celular" data-fechar>Já instalei</button>' }));

// ------------------------------------------------------------------ "Mais funções": o que ficou fora do menu
const DESC = Object.fromEntries(Object.entries(COMO).map(([k, v]) => [k, v[1][0]]));
tela('funcoes', {
  titulo: 'Mais funções',
  html() {
    const r = ramoAtual(), l = foraDe(r);
    return cab('Mais funções', l.length ? 'Telas que ficaram fora do seu menu. Abra quando precisar ou ponha de volta no menu.' : 'Todas as telas já estão no seu menu.') +
      (l.length ? `<div class="menu-g">${l.map(([h, n, i]) => `<div class="func-card">${ico(i)}<span class="tx"><b>${t(n)}</b><small>${t(DESC[h] || '')}</small></span><span class="linha-bts"><a class="bt pq" href="#${h}">Abrir</a><button type="button" class="bt pq cheio" data-acao="func-liga" data-h="${h}">Pôr no menu</button></span></div>`).join('')}</div>` : '') +
      `<p class="mudo peq" style="margin-top:14px">Para tirar uma tela do menu ou mudar a ordem: <a href="#config/cfg-ajuste">Configurações › Ajustar o Tecton para mim</a>.</p>`;
  },
});
acao('func-liga', (b) => { mudar((a, r) => { if (!a.menu[r].includes(b.dataset.h)) a.menu[r].push(b.dataset.h); }); toast('Pronto: está no menu'); ir('funcoes'); });

// ------------------------------------------------------------------ "Mais" do celular: o resto do menu e as funções desligadas
tela('mais', {
  titulo: 'Mais',
  html() {
    const r = ramoAtual(), bx = baixoDe(r), resto = [...menuDe(r).filter(([h]) => !bx.includes(h)), FIM[1]].filter((x, i, l) => l.findIndex((y) => y[0] === x[0]) === i), fora = foraDe(r);
    return cab('Mais', RAMOS[r].nome) + `<div class="menu-g">${resto.map(([h, n, i]) => `<a href="#${h}">${ico(i)}<span><b>${t(n)}</b></span></a>`).join('')}</div>
      ${fora.length ? `<h2 class="sec-t" style="margin-top:20px">Mais funções</h2><p class="mudo peq" style="margin-bottom:8px">Ficaram fora do seu menu; abra quando precisar.</p><div class="menu-g">${fora.map(([h, n, i]) => `<a href="#${h}" class="desl">${ico(i)}<span><b>${t(n)}</b><small>fora do menu</small></span></a>`).join('')}</div>` : ''}
      ${db.config.ramos.length > 1 ? `<div class="cartao" style="margin-top:16px"><h2>Trocar de ramo</h2><div class="chips">${db.config.ramos.map((k) => `<button type="button" class="chip" data-acao="ramo" data-ramo="${k}" aria-pressed="${k === r}">${RAMOS[k].curto}</button>`).join('')}</div></div>` : ''}`;
  },
});

// ------------------------------------------------------------------ Configurações › Ajustar o Tecton para mim
function htmlCfg() {
  const r = ramoAtual(), g = souGestor(), a = ajusteEmpresa(), resp = a?.resp, B = PAINEIS[r], m = menuDe(r).map((x) => x[0]), bx = baixoDe(r), p = painelDe(r);
  const linha = (tipo, id, nome, on, i, n) => `<li class="${on ? '' : 'desl'}"><label class="marca-op"><input type="checkbox" data-aj-${tipo}="${id}" ${on ? 'checked' : ''} ${id === 'painel' && tipo === 'menu' ? 'disabled' : ''}><span>${t(nome)}</span></label>${on ? `<span class="aj-ordem"><button type="button" class="bt-ico" data-aj-sobe="${tipo}:${id}" aria-label="Subir ${t(nome)}" ${i === 0 || (tipo === 'menu' && i <= 1) ? 'disabled' : ''}>${ico('acima')}</button><button type="button" class="bt-ico" data-aj-desce="${tipo}:${id}" aria-label="Descer ${t(nome)}" ${i === n - 1 || id === 'painel' ? 'disabled' : ''}>${ico('abaixo')}</button></span>` : ''}</li>`;
  const ordenado = (on, todos) => [...on, ...todos.filter((x) => !on.includes(x))];
  const nomesM = Object.fromEntries(todas(r).map((x) => [x[0], x[1]]));
  return `<section class="cartao" id="cfg-ajuste" style="margin-top:16px"><h2>Ajustar o Tecton para mim</h2>
    ${g ? `<p class="mudo" style="margin-bottom:12px">${resp ? `Ajustado em ${t(a.dia.split('-').reverse().join('/'))}: ${t(Object.keys(RAMOS).filter((k) => resp.ramos.includes(k)).map((k) => RAMOS[k].curto).join(', '))} · o que mais importa: ${t((resp.dores[r] || []).map((d) => DORES[r].find((x) => x[0] === d)?.[1]).filter(Boolean).join(', ') || 'tudo')}.` : 'Responda as 5 perguntas e o menu, o painel e a barra do celular se arrumam para o que você mais usa.'} ${CONTA ? 'Quem você convidar entra com o Tecton já assim.' : ''}</p>
      <div class="linha-bts" style="margin-bottom:14px"><button type="button" class="bt cheio" data-ir="ajuste">${ico('troca')}${resp ? 'Refazer as perguntas' : 'Responder as perguntas'}</button>${a?.passos?.fechado ? '<button type="button" class="bt" data-aj-passos>Mostrar os primeiros passos</button>' : ''}</div>`
    : `<p class="mudo" style="margin-bottom:12px">O dono ajustou o Tecton para a empresa. Aqui você muda só o <b>seu</b> menu e o <b>seu</b> painel; os outros continuam como estão.${meu() ? '' : ' Agora você vê o ajuste da empresa.'}</p>${meu() ? '<div class="linha-bts" style="margin-bottom:14px"><button type="button" class="bt" data-aj-empresa>Voltar ao ajuste da empresa</button></div>' : ''}`}
    <p class="peq mudo">${db.config.ramos.length > 1 ? `Vale para ${t(RAMOS[r].curto.toLowerCase())}; troque de ramo para ajustar o outro.` : ''}</p>
    <div class="grade g3 aj-grade">
      <div><h3>Menu</h3><p class="mudo peq">Desmarcado vai para Mais funções.</p><ul class="aj-lista">${ordenado(m, todas(r).map((x) => x[0])).map((h, i) => linha('menu', h, nomesM[h], m.includes(h), m.indexOf(h), m.length)).join('')}</ul></div>
      <div><h3>Painel</h3><p class="mudo peq">Os cartões, na ordem.</p><ul class="aj-lista">${ordenado(p, Object.keys(B.nomes)).map((k) => linha('painel', k, B.nomes[k], p.includes(k), p.indexOf(k), p.length)).join('')}</ul></div>
      <div><h3>Barra do celular</h3><p class="mudo peq">4 telas e o Mais.</p><ul class="aj-lista">${bx.map((h, i) => `<li><label class="campo" style="margin:0"><span class="mudo peq">${i + 1}º</span><select class="ent" data-aj-baixo="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Barra do celular, posição ${i + 1}">${(MENUS[r] || []).map(([h2, n2]) => `<option value="${h2}" ${h2 === h ? 'selected' : ''}>${t(n2)}</option>`).join('')}</select></label></li>`).join('')}</ul></div>
    </div></section>`;
}
function montarCfg(el) {
  const mexe = (tipo, id, f) => mudar((a, r) => { a[tipo][r] = f(a[tipo][r].slice(), id) || a[tipo][r]; });
  $$('[data-aj-menu]', el).forEach((i) => i.onchange = () => mexe('menu', i.dataset.ajMenu, (l, id) => (i.checked ? [...l, id] : l.filter((x) => x !== id))));
  $$('[data-aj-painel]', el).forEach((i) => i.onchange = () => mexe('painel', i.dataset.ajPainel, (l, id) => (i.checked ? [...l, id] : l.filter((x) => x !== id))));
  const mover = (s, d) => { const [tipo, id] = s.split(':'); mexe(tipo, id, (l) => { const k = l.indexOf(id), j = k + d; if (k < 0 || j < (tipo === 'menu' ? 1 : 0) || j >= l.length) return l; [l[k], l[j]] = [l[j], l[k]]; return l; }); };
  $$('[data-aj-sobe]', el).forEach((b) => b.onclick = () => { mover(b.dataset.ajSobe, -1); setTimeout(() => $(`[data-aj-sobe="${b.dataset.ajSobe}"]`)?.focus(), 30); });
  $$('[data-aj-desce]', el).forEach((b) => b.onclick = () => { mover(b.dataset.ajDesce, 1); setTimeout(() => $(`[data-aj-desce="${b.dataset.ajDesce}"]`)?.focus(), 30); });
  $$('[data-aj-baixo]', el).forEach((s) => s.onchange = () => mudar((a, r) => { const l = a.baixo[r].slice(), i = +s.dataset.ajBaixo, j = l.indexOf(s.value); if (j >= 0) l[j] = l[i]; l[i] = s.value; a.baixo[r] = l; if (!a.menu[r].includes(s.value)) a.menu[r].push(s.value); }));
  $('[data-aj-passos]', el)?.addEventListener('click', () => { const a = ajusteEmpresa(); a.passos.fechado = false; grava(); toast('Os primeiros passos voltaram ao painel'); });
  $('[data-aj-empresa]', el)?.addEventListener('click', () => { voltarAoDaEmpresa(); toast('Voltou ao ajuste da empresa'); ir('config/cfg-ajuste'); });
}
const CFG = TELAS.config;
tela('config', {
  ...CFG,
  html(...a) {
    let h = CFG.html(...a);
    h = h.replace('<nav class="cfg-nav" aria-label="Seções">', '<nav class="cfg-nav" aria-label="Seções"><button type="button" class="chip" data-ir="config/cfg-ajuste">Ajustar para mim</button>');
    const i = h.indexOf('<div class="grade g2">'); return i < 0 ? h + htmlCfg() : h.slice(0, i) + htmlCfg().replace('style="margin-top:16px"', 'style="margin-bottom:16px"') + h.slice(i);
  },
  montar(el, ...a) { CFG.montar?.(el, ...a); montarCfg(el); },
});

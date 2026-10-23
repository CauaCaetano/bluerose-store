// Veltria Farmácia Essencial · app de celular da farmácia de bairro (o dono atende no balcão).
// Painel de botões grandes: vender com scanner (sai sempre o lote que vence primeiro, sugere o genérico mais barato,
// pede a receita do antibiótico), semáforo de validade, clientes de uso contínuo, livro de receitas, comparador de
// genéricos, caixa, pedido à distribuidora, assistente, painel do dono, configurações e assinatura (?novo recomeça).

const CHAVE = 'veltria-farmacia-essencial-v1';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const data = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
const zap = (tel, m) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);

function abrir() {
  const P = (id, nome, ean, preco, pmc, lotes, extra = {}) => ({ id, nome, ean, preco, pmc, lotes: lotes.map(([lote, val, qtd]) => ({ lote, val, qtd })), min: 4, ...extra });
  const prods = [
    P('dip', 'Dipirona 500 mg · 10 comp. (genérico)', '7896004703398', 4.9, 6.2, [['DP2307', 38, 14], ['DP2402', 290, 30]]),
    P('nov', 'Novalgina 1 g · 10 comp.', '7891058017491', 19.9, 24.5, [['NV2311', 160, 8]], { generico: 'dip' }),
    P('los', 'Losartana 50 mg · 30 comp. (genérico)', '7896422507394', 9.8, 18.4, [['LS2309', 74, 22]], { continuo: true }),
    P('cozaar', 'Cozaar 50 mg · 30 comp.', '7896261012345', 62.3, 71.8, [['CZ2401', 410, 3]], { generico: 'los', continuo: true }),
    P('amox', 'Amoxicilina 500 mg · 21 cáps. (genérico)', '7896714231129', 18.9, 29.7, [['AM2305', -3, 2], ['AM2310', 120, 9]], { antibiotico: true }),
    P('glif', 'Metformina 850 mg · 30 comp. (genérico)', '7896004712345', 8.5, 14.9, [['MF2308', 25, 18]], { continuo: true }),
    P('omep', 'Omeprazol 20 mg · 28 cáps. (genérico)', '7896181900215', 12.4, 26.3, [['OM2306', 55, 2]]),
    P('soro', 'Soro fisiológico 500 ml', '7898136030016', 7.9, 9.8, [['SF2312', 520, 12]]),
    P('insul', 'Insulina NPH 10 ml (geladeira)', '7896006202219', 52.0, 64.2, [['IN2309', 88, 5]], { geladeira: true, continuo: true }),
    P('prot', 'Protetor solar FPS 50 · 200 ml', '7891010987654', 59.9, 0, [['PS2304', 12, 6]]),
  ];
  const clientes = [['Dona Cida', '31988771001', 'los', 30, -26], ['Seu Antônio', '31988771002', 'glif', 30, -27], ['Márcia Lopes', '31988771003', 'insul', 30, -18], ['Jorge Neves', '31988771004', 'cozaar', 30, -29], ['Helena Prado', '31988771005', 'los', 30, -8]].map(([nome, tel, prod, dias, ultima]) => ({ id: uid(), nome, tel, prod, dias, ultima }));
  return { farm: 'Drogaria Santa Clara', resp: 'Dr. Renato', crf: 'CRF-MG 34.112', pix: '28.114.902/0001-55', prods, clientes, receitas: [{ id: uid(), dia: -2, cliente: 'Paulo Reis', medico: 'Dra. Ana Lima', crm: 'CRM-MG 55.210', prod: 'amox', qtd: 1 }], vendas: [{ dia: 0, total: 486.4, forma: 'PIX' }, { dia: 0, total: 212.9, forma: 'Cartão' }, { dia: 0, total: 94.5, forma: 'Dinheiro' }], cesta: [], plano: 'basico', ajudantes: [{ nome: 'Larissa (balconista)', ve: { vender: true, caixa: false, validade: true } }], assinatura: { valor: 89, status: 'ativa', renova: true, proxima: 11, pagos: [-19, -49, -79] }, conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || abrir(); } catch { return abrir(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no celular.'); } };
const prod = (id) => db.prods.find((p) => p.id === id);
const qtdTotal = (p) => p.lotes.filter((l) => l.val >= 0).reduce((s, l) => s + l.qtd, 0);
const loteFefo = (p) => [...p.lotes].filter((l) => l.val >= 0 && l.qtd > 0).sort((a, b) => a.val - b.val)[0];
const restam = (c) => c.dias + c.ultima;
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima em ${a.proxima} dias` : `cancelada · usa por mais ${a.proxima} dias`; };
const todosLotes = () => db.prods.flatMap((p) => p.lotes.filter((l) => l.qtd > 0).map((l) => ({ p, l })));
const FAIXAS = [['venc', 'vencidos', '#b0473d', (v) => v < 0], ['30', 'até 30 dias', '#c08a2a', (v) => v >= 0 && v <= 30], ['60', '31 a 60', '#a5824d', (v) => v > 30 && v <= 60], ['90', '61 a 90', '#7d8c88', (v) => v > 60 && v <= 90]];
let faixa = 'venc';

function aviso(m) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = m; $('#avisos').append(a); setTimeout(() => a.remove(), 3300); }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.querySelector('video')?.srcObject?.getTracks().forEach((x) => x.stop()); v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
}

// ------------------------------------------------------------------ telas
const ICO = { vender: '<path d="M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M21 5v14"/>', validade: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', continuo: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>', receitas: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h4"/>', generico: '<path d="M4 7h16M4 12h10M4 17h6"/><path d="M17 14l3 3-3 3"/>', caixa: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', pedido: '<path d="M3 4h2l2 12h11l2-8H7"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>', mais: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>' };
const T = {
  inicio() {
    const venc = todosLotes().filter(({ l }) => l.val <= 30).length, cont = db.clientes.filter((c) => restam(c) <= 5).length, falta = db.prods.filter((p) => qtdTotal(p) < p.min).length, hoje = db.vendas.filter((v) => v.dia === 0);
    const B = (k, nome, sub, n) => `<a class="botao" href="#${k}">${n ? `<span class="bolinha">${n}</span>` : ''}<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg><span><b>${nome}</b><small>${sub}</small></span></a>`;
    return `<div class="hoje"><div><small>Vendido hoje</small><b>${din(hoje.reduce((s, v) => s + v.total, 0))}</b></div><div><small>Atendimentos</small><b>${hoje.length}</b></div></div>
      <div class="painel"><a class="botao grande" href="#vender"><span><b>Vender</b><small>scanner, lote certo e genérico</small></span><svg viewBox="0 0 24 24" aria-hidden="true">${ICO.vender}</svg></a>
      ${B('validade', 'Validade', 'o que vence logo', venc)}${B('continuo', 'Uso contínuo', 'quem vai precisar', cont)}${B('receitas', 'Receitas', 'antibióticos retidos')}${B('generico', 'Genérico', 'comparar preços')}${B('caixa', 'Caixa', 'o dia por forma')}${B('pedido', 'Pedido', 'o que comprar', falta)}${B('mais', 'Mais', 'IA, assinatura, dono')}</div>`;
  },
  vender() {
    const tot = db.cesta.reduce((s, i) => s + prod(i.p).preco * i.q, 0);
    return `<h1>Vender</h1><div class="leitor"><input id="busca" placeholder="Nome ou código de barras" aria-label="Buscar produto" autocomplete="off"><button type="button" class="bt ambar" data-acao="scanner">Scanner</button></div><div class="sugestoes" id="sugestoes"></div>
      <div class="cartao cesta">${db.cesta.map((i, ix) => { const p = prod(i.p), l = loteFefo(p), g = p.generico ? null : db.prods.find((x) => x.generico === p.id), gen = p.generico ? prod(p.generico) : null; return `<div class="linha-c"><div class="topo-l"><span>${t(p.nome)}</span><span class="qtd"><button type="button" data-q="${ix}" data-d="-1" aria-label="Menos">−</button>${i.q}<button type="button" data-q="${ix}" data-d="1" aria-label="Mais">+</button></span><button type="button" class="x" data-tira="${ix}" aria-label="Tirar">×</button></div><div class="lote">Lote ${t(l?.lote || '—')} · vence ${l ? data(l.val) : '—'} (o que vence primeiro) · ${din(p.preco * i.q)}</div>${gen ? `<div class="dica"><span>Genérico: ${t(gen.nome.split('·')[0])} por ${din(gen.preco)} (economia de ${din(p.preco - gen.preco)})</span><button type="button" class="bt pq" data-troca="${ix}">Trocar</button></div>` : ''}${p.antibiotico ? `<div class="alerta">Antibiótico: ${i.receita ? `receita de ${t(i.receita.medico)} registrada ✓` : '<button type="button" class="bt pq" data-receita="' + ix + '">Registrar receita (fica retida)</button>'}</div>` : ''}${p.geladeira ? '<div class="alerta">Vai na bolsa térmica. Oriente o cliente a guardar na geladeira.</div>' : ''}${g ? '' : ''}</div>`; }).join('') || '<p class="mini" style="margin:0">Passe o código no scanner ou busque pelo nome.</p>'}</div>
      ${db.cesta.length ? `<div class="total"><span>Total</span><span>${din(tot)}</span></div><div class="chips">${['PIX', 'Cartão', 'Dinheiro'].map((f) => `<button type="button" data-pagar="${f}">${f}</button>`).join('')}</div>` : ''}`;
  },
  validade() {
    const l = todosLotes(), fx = FAIXAS.find((f) => f[0] === faixa), lista = l.filter(({ l: x }) => fx[3](x.val)).sort((a, b) => a.l.val - b.l.val);
    return `<h1>Validade</h1><p class="sub">O caixa sempre vende o lote que vence primeiro. Aqui você resolve o que está perto de vencer.</p>
      <div class="semaforo">${FAIXAS.map(([k, n, c, f]) => `<button type="button" data-faixa="${k}" aria-pressed="${k === faixa}" style="--c:${c}"><b>${l.filter(({ l: x }) => f(x.val)).length}</b><small>${n}</small></button>`).join('')}</div>
      <div class="cartao">${lista.map(({ p, l: x }) => `<div class="item"><span><b>${t(p.nome)}</b><small>lote ${t(x.lote)} · ${x.qtd} un. · ${x.val < 0 ? `venceu há ${-x.val} dias` : `vence em ${x.val} dias`} · ${din(p.preco * x.qtd)}</small></span><span>${x.val < 0 ? `<button type="button" class="bt pq" data-descartar="${p.id}|${x.lote}">Descartar</button>` : `<button type="button" class="bt pq" data-promo="${p.id}|${x.lote}">Promoção</button>`}</span></div>`).join('') || '<p class="mini" style="margin:0">Nada nesta faixa.</p>'}</div>`;
  },
  continuo() {
    const l = [...db.clientes].sort((a, b) => restam(a) - restam(b));
    return `<h1>Uso contínuo</h1><p class="sub">Quem toma remédio todo dia. O app calcula quando a caixa acaba e lembra o cliente antes.</p>${l.map((c) => { const r = restam(c), p = prod(c.prod); return `<div class="cartao"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${t(c.nome)}</b><small class="mini" style="display:block">${t(p.nome)}</small></div><span class="etq ${r <= 2 ? 'ru' : r <= 5 ? 'am' : 'ok'}">${r < 0 ? `acabou há ${-r} dias` : `acaba em ${r} dias`}</span></div>${r <= 5 ? `<div class="linha"><a class="bt pq ambar" target="_blank" rel="noopener" data-lembrou="${c.id}" href="${zap(c.tel, `Olá, ${c.nome}! Aqui é da ${db.farm}. Seu ${p.nome.split('·')[0].trim()} está acabando. Quer que a gente separe? Entregamos em casa.`)}">Lembrar no WhatsApp</a></div>` : ''}</div>`; }).join('')}<button type="button" class="bt largo" data-acao="novo-continuo">+ Cliente de uso contínuo</button>`;
  },
  receitas() {
    return `<h1>Receitas retidas</h1><p class="sub">Antibióticos: a 2ª via fica na farmácia. O registro fica aqui para a fiscalização. Controlados da portaria 344 (SNGPC) ficam no Completo.</p><div class="cartao">${db.receitas.map((r) => `<div class="item"><span><b>${t(prod(r.prod).nome)}</b><small>${data(r.dia)} · ${t(r.cliente)} · ${t(r.medico)} (${t(r.crm)})</small></span><span>${r.qtd} un.</span></div>`).join('') || '<p class="mini" style="margin:0">Nenhuma.</p>'}</div>`;
  },
  generico() {
    const refs = db.prods.filter((p) => db.prods.some((g) => g.generico === p.id) || p.generico);
    return `<h1>Genérico</h1><p class="sub">Referência ao lado do genérico. Bom para mostrar ao cliente no balcão.</p>${db.prods.filter((p) => p.generico).map((r) => { const g = prod(r.generico); return `<div class="cartao"><div class="item"><span><b>${t(r.nome)}</b><small>referência · PMC ${din(r.pmc)}</small></span><span>${din(r.preco)}</span></div><div class="item"><span><b>${t(g.nome)}</b><small>genérico · tem ${qtdTotal(g)}</small></span><span class="etq ok">${din(g.preco)}</span></div><p class="mini" style="margin:6px 0 0">O cliente economiza ${din(r.preco - g.preco)} (${Math.round((1 - g.preco / r.preco) * 100)}%).</p></div>`; }).join('')}${refs.length ? '' : ''}`;
  },
  caixa() {
    const h = db.vendas.filter((v) => v.dia === 0), por = {}; h.forEach((v) => { por[v.forma] = (por[v.forma] || 0) + v.total; });
    return `<h1>Caixa de hoje</h1><div class="hoje"><div><small>Total</small><b>${din(h.reduce((s, v) => s + v.total, 0))}</b></div><div><small>Ticket médio</small><b>${din(h.reduce((s, v) => s + v.total, 0) / (h.length || 1))}</b></div></div><div class="cartao">${['PIX', 'Cartão', 'Dinheiro'].map((f) => `<div class="item"><span>${f}</span><span>${din(por[f] || 0)}</span></div>`).join('')}</div><p class="mini">Cupom fiscal (NFC-e) sai em cada venda na versão contratada.</p>`;
  },
  pedido() {
    const l = db.prods.filter((p) => qtdTotal(p) < p.min), txt = `Pedido ${db.farm}:\n${l.map((p) => `- ${p.nome}: ${p.min * 3 - qtdTotal(p)} un. (EAN ${p.ean})`).join('\n')}`;
    return `<h1>Pedido à distribuidora</h1><p class="sub">Tudo que ficou abaixo do mínimo. O pedido sai pronto para o WhatsApp do vendedor da distribuidora.</p><div class="cartao">${l.map((p) => `<div class="item"><span><b>${t(p.nome)}</b><small>tem ${qtdTotal(p)} · mínimo ${p.min}</small></span><span>${p.min * 3 - qtdTotal(p)} un.</span></div>`).join('') || '<p class="mini" style="margin:0">Nada em falta.</p>'}</div>${l.length ? `<a class="bt cheio largo" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar pedido no WhatsApp</a><button type="button" class="bt largo" style="margin-top:8px" data-acao="chegou">A mercadoria chegou (dar entrada)</button>` : ''}`;
  },
  mais() {
    const l = [['ia', 'Assistente', 'pergunte sobre estoque, validade e clientes'], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Painel do dono', 'balconistas e o que cada um vê'], ['config', 'Configurações', 'nome, responsável técnico, PIX']];
    return `<h1>Mais</h1><div class="lista-mais">${l.map(([k, n, s]) => `<a href="#${k}"><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div>`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Olá, ${db.resp}! Eu vejo estoque, lotes, receitas e os clientes de uso contínuo. Na versão contratada são 20 perguntas grátis por dia. Não substituo a orientação do farmacêutico.` }];
    return `<a href="#mais">← Mais</a><h1>Assistente</h1><div class="conversa">${conv.map((m) => `<div class="fala ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['O que vence este mês?', 'Quem preciso lembrar hoje?', 'O que está faltando?', 'Quanto perdi com vencidos?'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--verm)"><b style="color:var(--verm)">Assinatura vencida</b><p class="mini" style="margin:4px 0 0">O pagamento de ${din(a.valor)} não foi aprovado. Estoque, lotes e receitas estão guardados.</p></div>`
      : a.renova ? `<div class="cartao"><b>Ativa</b><p class="mini" style="margin:4px 0 0">Plano Assinatura · ${din(a.valor)} por mês · próxima cobrança em ${a.proxima} dias.</p></div>`
        : `<div class="cartao" style="border-color:var(--ambar)"><b>Cancelada</b><p class="mini" style="margin:4px 0 0">Você usa tudo por mais ${a.proxima} dias. Depois disso nada mais é cobrado.</p></div>`;
    return `<a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.</p>${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><div class="cartao">${a.pagos.map((d) => `<div class="item"><span>Mensalidade<small>${data(d)}</small></span><span>${din(a.valor)}</span></div>`).join('')}</div>`;
  },
  dono() {
    return `<a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Cada balconista entra com o próprio celular e só faz o que você deixar.</p>
      ${db.ajudantes.map((p, i) => `<div class="cartao"><b>${t(p.nome)}</b>${[['vender', 'Vender no balcão'], ['validade', 'Mexer em validade e descarte'], ['caixa', 'Ver o caixa']].map(([k, n]) => `<label style="display:flex;justify-content:space-between;padding:8px 0">${n}<input type="checkbox" data-ve="${i}.${k}" ${p.ve[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--sal)"></label>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" data-acao="ajudante">+ Convidar balconista</button>
      <h2>Plano</h2><div class="chips"><button type="button" data-plano="basico" aria-pressed="${db.plano === 'basico'}">Assinatura · R$ 89/mês</button></div><p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos.</p>`;
  },
  config() {
    return `<a href="#mais">← Mais</a><h1>Configurações</h1>${[['farm', 'Nome da farmácia'], ['resp', 'Farmacêutico responsável'], ['crf', 'CRF'], ['pix', 'Chave PIX']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k])}"></label>`).join('')}<p class="mini">Funciona sem internet: o que vender sem sinal sobe quando a conexão voltar.</p>`;
  },
};

function responde(p) {
  const x = sa(p);
  if (/venc|validade/.test(x)) { const l = todosLotes().filter(({ l: y }) => y.val <= 30).sort((a, b) => a.l.val - b.l.val); return l.length ? `${l.map(({ p: q, l: y }) => `• ${q.nome}: lote ${y.lote}, ${y.qtd} un., ${y.val < 0 ? 'já venceu' : `vence em ${y.val} dias`}`).join('\n')}\n\nSugestão: promoção de 20% no protetor solar e no que vence em até 30 dias.` : 'Nada vence nos próximos 30 dias.'; }
  if (/lembr|continuo|acab/.test(x)) { const l = db.clientes.filter((c) => restam(c) <= 5); return l.length ? `Lembre hoje: ${l.map((c) => `${c.nome} (${restam(c) < 0 ? 'já acabou' : `${restam(c)} dias`})`).join(', ')}. As mensagens estão prontas em Uso contínuo.` : 'Ninguém para lembrar hoje.'; }
  if (/falt|compr|pedido/.test(x)) { const l = db.prods.filter((q) => qtdTotal(q) < q.min); return l.length ? `Abaixo do mínimo: ${l.map((q) => `${q.nome.split('·')[0].trim()} (${qtdTotal(q)})`).join(', ')}. O pedido está pronto na tela Pedido.` : 'Nada em falta.'; }
  if (/perd|vencid/.test(x)) { const v = todosLotes().filter(({ l: y }) => y.val < 0).reduce((s, { p: q, l: y }) => s + q.preco * y.qtd, 0); return `Vencidos parados na prateleira: ${din(v)}. Separe para descarte com o recolhimento da vigilância sanitária.`; }
  return `Hoje: ${din(db.vendas.filter((v) => v.dia === 0).reduce((s, v) => s + v.total, 0))} vendidos.`;
}

// ------------------------------------------------------------------ navegação, trava e pagamento
const NOMES = { inicio: 'Início', vender: 'Vender', validade: 'Validade', continuo: 'Uso contínuo', receitas: 'Receitas', generico: 'Genérico', caixa: 'Caixa', pedido: 'Pedido', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' };
function mostra() {
  const r = location.hash.slice(1) || 'inicio', tela = $('#tela');
  tela.innerHTML = (T[r] || T.inicio)();
  $('#volta').hidden = r === 'inicio'; $('#volta').href = ['ia', 'assinatura', 'dono', 'config'].includes(r) ? '#mais' : '#inicio';
  $('#nome-farm').textContent = db.farm; $('#sub-farm').textContent = `${db.resp} · farmacêutico responsável`;
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="padding:8px 12px;background:#f4e5c6">Assinatura cancelada: você usa por mais ${db.assinatura.proxima} dias. <a href="#assinatura">Reativar</a></p>`);
  trava(r);
  document.title = `${NOMES[r] || 'Início'} · Veltria Farmácia Essencial`;
  if (r === 'vender') { const b = $('#busca'); b.addEventListener('input', sugere); b.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const p = acha(b.value)[0]; if (p) poe(p.id); } }); }
}
addEventListener('hashchange', () => { mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Estoque, lotes, receitas e clientes estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}
const acha = (q) => { const x = sa(q).trim(); return x.length < 2 ? [] : db.prods.filter((p) => p.ean === x || sa(p.nome).includes(x)).slice(0, 5); };
function sugere() { $('#sugestoes').innerHTML = acha($('#busca').value).map((p) => `<button type="button" data-poe="${p.id}"><span>${t(p.nome)}<small>tem ${qtdTotal(p)} · EAN ${p.ean}</small></span><span>${din(p.preco)}</span></button>`).join(''); }
function poe(id) { const p = prod(id); if (!qtdTotal(p)) { aviso('Sem estoque válido desse produto.'); return; } const i = db.cesta.find((x) => x.p === id); if (i) i.q++; else db.cesta.push({ p: id, q: 1 }); grava(); mostra(); $('#busca')?.focus(); }
const ACOES = {
  scanner: () => folha('<h2>Scanner</h2><video class="camera" id="cam" playsinline muted></video><p class="mini" id="cam-txt">Aponte para o código de barras. No computador, use o leitor USB no campo de busca.</p><div style="display:grid;gap:8px">' + db.prods.slice(0, 3).map((p) => `<button type="button" class="bt pq" data-simula="${p.id}">Simular leitura: ${t(p.nome.split('·')[0])}</button>`).join('') + '<button type="button" class="bt" data-fecha>Fechar</button></div>', async (f, fecha) => {
    f.querySelectorAll('[data-simula]').forEach((b) => b.addEventListener('click', () => { fecha(); poe(b.dataset.simula); }));
    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }), v = f.querySelector('#cam'); v.srcObject = s; await v.play(); if ('BarcodeDetector' in window) { const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8'] }); const lendo = async () => { if (!document.body.contains(v)) return; const c = await det.detect(v).catch(() => []); const p = c[0] && db.prods.find((x) => x.ean === c[0].rawValue); if (p) { fecha(); poe(p.id); } else requestAnimationFrame(lendo); }; lendo(); } } catch { f.querySelector('#cam').remove(); f.querySelector('#cam-txt').textContent = 'Câmera indisponível aqui. Use os botões de simulação ou o leitor USB.'; }
  }),
  'novo-continuo': () => folha(`<h2>Cliente de uso contínuo</h2><form><label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel"></label><label class="campo">Remédio<select name="p">${db.prods.filter((p) => p.continuo).map((p) => `<option value="${p.id}">${t(p.nome)}</option>`).join('')}</select></label><label class="campo">A caixa dura (dias)<input name="d" type="number" value="30"></label><button class="bt cheio largo">Guardar</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); db.clientes.push({ id: uid(), nome: x.get('n'), tel: x.get('t'), prod: x.get('p'), dias: Number(x.get('d')), ultima: 0 }); grava(); fecha(); mostra(); })),
  chegou: () => { db.prods.filter((p) => qtdTotal(p) < p.min).forEach((p) => { p.lotes.push({ lote: `NV${Math.floor(Math.random() * 9000 + 1000)}`, val: 360, qtd: p.min * 3 - qtdTotal(p) }); }); grava(); mostra(); aviso('Entrada feita com lote e validade de cada item (na versão contratada, lendo o XML da nota).'); },
  ajudante: () => folha('<h2>Convidar balconista</h2><form><label class="campo">Nome<input name="n" required></label><button class="bt cheio largo">Mandar convite</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); db.ajudantes.push({ nome: new FormData(e.target).get('n'), ve: { vender: true, caixa: false, validade: false } }); grava(); fecha(); mostra(); aviso('Convite enviado.'); })),
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor)}</h2><p class="sub">Escolha como pagar. Libera na hora.</p><div class="chips"><button type="button" aria-pressed="true">PIX</button><button type="button" aria-pressed="false">Cartão</button></div><div class="cartao"><p class="mini">PIX copia e cola (demonstração):</p><code style="word-break:break-all;font-size:.78rem">00020126580014BR.GOV.BCB.PIX0136bluerose-demo520400005303986540${db.assinatura.valor}.005802BR</code></div><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); aviso('Pagamento aprovado. Tudo liberado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa por mais ${db.assinatura.proxima} dias e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
};

document.addEventListener('click', (e) => {
  const el = e.target;
  const ir = el.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const po = el.closest('[data-poe]'); if (po) { poe(po.dataset.poe); return; }
  const q = el.closest('[data-q]'); if (q) { const i = db.cesta[Number(q.dataset.q)]; i.q = Math.max(1, i.q + Number(q.dataset.d)); grava(); mostra(); return; }
  const ti = el.closest('[data-tira]'); if (ti) { db.cesta.splice(Number(ti.dataset.tira), 1); grava(); mostra(); return; }
  const tr = el.closest('[data-troca]'); if (tr) { const i = db.cesta[Number(tr.dataset.troca)], g = prod(prod(i.p).generico); i.p = g.id; grava(); mostra(); aviso(`Trocado pelo genérico: ${din(g.preco)}.`); return; }
  const rc = el.closest('[data-receita]'); if (rc) { const i = db.cesta[Number(rc.dataset.receita)]; folha('<h2>Receita do antibiótico</h2><form><label class="campo">Paciente<input name="c" required></label><label class="campo">Médico<input name="m" required></label><label class="campo">CRM<input name="r" required placeholder="CRM-MG 00.000"></label><p class="mini">A receita tem validade de 10 dias. A 2ª via fica retida.</p><button class="bt cheio largo">Registrar</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); const x = new FormData(ev.target); i.receita = { medico: x.get('m'), crm: x.get('r'), cliente: x.get('c') }; grava(); fecha(); mostra(); })); return; }
  const pg = el.closest('[data-pagar]'); if (pg) {
    if (db.cesta.some((i) => prod(i.p).antibiotico && !i.receita)) { aviso('Registre a receita do antibiótico antes de fechar.'); return; }
    const tot = db.cesta.reduce((s, i) => s + prod(i.p).preco * i.q, 0), linhas = db.cesta.map((i) => `${prod(i.p).nome.slice(0, 30).padEnd(30)} ${String(i.q).padStart(2)} ${din(prod(i.p).preco * i.q).padStart(11)}`).join('\n');
    db.cesta.forEach((i) => { const p = prod(i.p); let falta = i.q; [...p.lotes].filter((l) => l.val >= 0).sort((a, b) => a.val - b.val).forEach((l) => { const u = Math.min(l.qtd, falta); l.qtd -= u; falta -= u; }); if (i.receita) db.receitas.unshift({ id: uid(), dia: 0, cliente: i.receita.cliente, medico: i.receita.medico, crm: i.receita.crm, prod: p.id, qtd: i.q }); });
    db.vendas.push({ dia: 0, total: tot, forma: pg.dataset.pagar }); db.cesta = []; grava(); mostra();
    folha(`<h2>Venda fechada</h2><div class="cupom">${t(db.farm)}\nCNPJ ${t(db.pix)}\n${'-'.repeat(46)}\n${t(linhas)}\n${'-'.repeat(46)}\nTOTAL ${din(tot).padStart(40)}\n${pg.dataset.pagar}\n\nCupom NFC-e de demonstração</div><button type="button" class="bt cheio largo" data-fecha style="margin-top:10px">Próximo cliente</button>`);
    return;
  }
  const fx = el.closest('[data-faixa]'); if (fx) { faixa = fx.dataset.faixa; mostra(); return; }
  const pr = el.closest('[data-promo]'); if (pr) { const [pid, lote] = pr.dataset.promo.split('|'), p = prod(pid); p.preco = Math.round(p.preco * 0.8 * 100) / 100; grava(); mostra(); aviso(`${p.nome.split('·')[0].trim()} com 20% a menos até acabar o lote ${lote}.`); return; }
  const dc = el.closest('[data-descartar]'); if (dc) { const [pid, lote] = dc.dataset.descartar.split('|'), p = prod(pid), l = p.lotes.find((x) => x.lote === lote); const n = l.qtd; l.qtd = 0; grava(); mostra(); aviso(`${n} un. separadas para descarte. Registro guardado para a vigilância sanitária.`); return; }
  const lb = el.closest('[data-lembrou]'); if (lb) { const c = db.clientes.find((x) => x.id === lb.dataset.lembrou); c.ultima = -c.dias + 30; grava(); setTimeout(mostra, 300); return; }
  const sg = el.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); return; }
  const pl = el.closest('[data-plano]'); if (pl) { db.plano = pl.dataset.plano; db.assinatura.valor = db.plano === 'pro' ? 149 : 89; grava(); mostra(); return; }
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) ACOES[ac.dataset.acao](ac.dataset);
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-12); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; grava(); mostra(); }); scrollTo(0, document.body.scrollHeight);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.cfg) { db[el.dataset.cfg] = el.value; grava(); mostra(); aviso('Salvo.'); }
  if (el.dataset.ve) { const [i, k] = el.dataset.ve.split('.'); db.ajudantes[i].ve[k] = el.checked; grava(); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; }
  if (e.data.simular === 'normal') { db.assinatura = abrir().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = abrir(); location.hash = '#inicio'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostra();

// Veltria Farmácia Completo · protótipo do caixa de farmácia com balconistas, menu suspenso por grupos.
// Caixa com cliente pelo CPF (pontos, crediário, Farmácia Popular), lote que vence primeiro, receita do controlado;
// entregas, livro de controlados com envio ao SNGPC, antibióticos, geladeira dos termolábeis, estoque por lote,
// compras pela nota, clientes, crediário, serviços farmacêuticos, relatórios, equipe, ajustes e IA (?novo recomeça).

const CHAVE = 'veltria-farmacia-completo-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const h = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const dt = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const $ = (s) => document.querySelector(s);

function inicial() {
  const P = (id, nome, ean, preco, custo, lotes, x = {}) => ({ id, nome, ean, preco, custo, lotes: lotes.map(([lote, val, qtd]) => ({ lote, val, qtd })), min: 6, ...x });
  const prods = [
    P('los', 'Losartana 50 mg 30 comp.', '7896422507394', 9.8, 4.1, [['LS09', 60, 40]], { pop: 9.8 }), P('met', 'Metformina 850 mg 30 comp.', '7896004712345', 8.5, 3.6, [['MF08', 22, 26]], { pop: 8.5 }),
    P('rivo', 'Rivotril 2 mg 30 comp.', '7891058001155', 21.9, 11.2, [['RV05', 200, 14]], { lista: 'B1' }), P('zolp', 'Zolpidem 10 mg 20 comp.', '7896714220222', 34.5, 17.8, [['ZP02', 310, 9]], { lista: 'B1' }),
    P('ritalina', 'Ritalina 10 mg 30 comp.', '7896261012001', 46.9, 25.0, [['RT11', 150, 6]], { lista: 'A3' }), P('amox', 'Amoxicilina 500 mg 21 cáps.', '7896714231129', 18.9, 7.4, [['AM10', 120, 15]], { antibiotico: true }),
    P('insu', 'Insulina NPH 10 ml', '7896006202219', 52.0, 33.0, [['IN09', 80, 7]], { geladeira: true, pop: 52.0 }), P('dipi', 'Dipirona 1 g 10 comp.', '7896004703398', 6.9, 2.2, [['DP07', 30, 3], ['DP12', 400, 30]]),
    P('vitc', 'Vitamina C 1 g 30 comp. efervesc.', '7891058017001', 29.9, 14.0, [['VC01', 95, 4]]), P('fral', 'Fralda geriátrica G 8 un.', '7896007900010', 42.9, 28.0, [['FG03', 700, 11]]),
  ];
  const clientes = [['Dona Cida Rocha', '123.456.789-01', 340, 300, 0, true], ['Seu Antônio Prado', '987.654.321-00', 120, 500, 186.4, true], ['Márcia Lopes', '456.123.789-55', 860, 400, 0, false], ['Jorge Neves', '321.654.987-22', 45, 200, 248.9, true]].map(([nome, cpf, pontos, limite, deve, cont]) => ({ id: uid(), nome, cpf, pontos, limite, deve, venceu: deve > 200, cont }));
  const livro = [[-3, 'entrada', 'rivo', 20, 'NF 88123 · Distribuidora Santa Cruz'], [-2, 'saida', 'rivo', 1, 'Receita B nº 004512 · Dr. Paulo Mattos CRM-MG 41.200'], [-1, 'saida', 'zolp', 1, 'Receita B nº 004530 · Dra. Lia Faria CRM-MG 52.871'], [0, 'saida', 'ritalina', 1, 'Receita A nº 0019881 · Dr. Caio Lins CRM-MG 33.002']].map(([dia, tipo, p, qtd, doc]) => ({ id: uid(), dia, tipo, p, qtd, doc, enviado: dia < -1 }));
  const temps = Array.from({ length: 48 }, (_, i) => +(5 + Math.sin(i / 5) * 1.2 + (i === 31 || i === 32 ? 3.6 : 0)).toFixed(1));
  const entregas = [['Dona Cida Rocha', 'Rua das Flores, 120', 'Losartana + Metformina', 0, 'separando'], ['Paulo Reis', 'Av. Brasil, 1500 ap 302', 'Amoxicilina + Dipirona', 25.8, 'saiu'], ['Helena Prado', 'Rua Goiás, 45', 'Fralda G + Vitamina C', 72.8, 'entregue']].map(([cli, end, itens, tot, st]) => ({ id: uid(), cli, end, itens, tot, st }));
  const servicos = [['Aferição de pressão', 'Seu Antônio Prado', 0, 9], ['Glicemia capilar', 'Márcia Lopes', 0, 10.5], ['Aplicação de injetável', 'Jorge Neves', 0, 15], ['Aferição de pressão', 'Dona Cida Rocha', 1, 9]].map(([s, cli, dia, hora]) => ({ id: uid(), s, cli, dia, hora, feito: false }));
  return { farm: 'Farmácia Vida Plena', prods, clientes, livro, temps, entregas, servicos, cesta: [{ p: 'los', q: 1 }, { p: 'met', q: 1 }, { p: 'dipi', q: 2 }, { p: 'rivo', q: 1 }], cli: clientes[0].id, popular: true, vendas: [{ total: 1284.6, forma: 'Cartão' }, { total: 642.3, forma: 'PIX' }, { total: 211.0, forma: 'Dinheiro' }, { total: 186.4, forma: 'Crediário' }], plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || inicial(); } catch { return inicial(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const salva = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no navegador.'); } };
const prod = (id) => db.prods.find((p) => p.id === id);
const qtd = (p) => p.lotes.filter((l) => l.val >= 0).reduce((s, l) => s + l.qtd, 0);
const fefo = (p) => [...p.lotes].filter((l) => l.val >= 0 && l.qtd > 0).sort((a, b) => a.val - b.val)[0];
const cliente = () => db.clientes.find((c) => c.id === db.cli);
const precoItem = (i) => (db.popular && cliente() && prod(i.p).pop ? 0 : prod(i.p).preco) * i.q;

function aviso(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; $('#avisos').append(a); setTimeout(() => a.remove(), 3400); }
function dlg(html, liga) {
  const v = document.createElement('div'); v.className = 'sombra'; v.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sair]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.dlg'), fecha);
}
function pergunta(t, campos, ok, fn) { dlg(`<h2>${t}</h2><form>${campos}<div class="pe"><button type="button" class="bt" data-sair>Cancelar</button><button class="bt am">${ok}</button></div></form>`, (d, fecha) => d.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fn(new FormData(e.target)) !== false) { salva(); fecha(); tela(); } })); }

// ------------------------------------------------------------------ menu por grupos
const GRUPOS = [['Vender', [['caixa', 'Caixa', 'venda no balcão'], ['entregas', 'Entregas', 'pedidos do WhatsApp']]], ['Controle', [['controlados', 'Controlados', 'livro e envio ao SNGPC'], ['antibioticos', 'Antibióticos', 'receitas retidas'], ['geladeira', 'Geladeira', 'temperatura dos termolábeis']]], ['Estoque', [['estoque', 'Estoque', 'lotes e validade'], ['compras', 'Compras', 'nota da distribuidora']]], ['Clientes', [['clientes', 'Clientes', 'pontos e uso contínuo'], ['crediario', 'Crediário', 'quem compra para pagar depois'], ['servicos', 'Serviços', 'pressão, glicemia, injetáveis']]], ['Gestão', [['relatorios', 'Relatórios', 'vendas e margem'], ['equipe', 'Equipe', 'painel do dono'], ['ajustes', 'Ajustes', 'dados da farmácia']]]];
const nomeTela = (k) => GRUPOS.flatMap((g) => g[1]).find((x) => x[0] === k)?.[1] || 'Caixa';

const V = {
  caixa() {
    const c = cliente(), sub = db.cesta.reduce((s, i) => s + prod(i.p).preco * i.q, 0), tot = db.cesta.reduce((s, i) => s + precoItem(i), 0), gov = sub - tot, pontosDesc = c && c.pontos >= 300 ? 15 : 0, precisaReceita = db.cesta.some((i) => (prod(i.p).lista || prod(i.p).antibiotico) && !i.receita);
    return `<div class="pdv"><section class="pnl"><div class="busca-p"><input id="busca" placeholder="Código de barras ou nome do produto (Enter adiciona)" aria-label="Buscar produto" autocomplete="off"></div><div class="achados" id="achados"></div>
      <table class="cesta-t"><thead><tr><th>Produto</th><th class="dir">Qtd</th><th class="dir">Valor</th><th></th></tr></thead><tbody>${db.cesta.map((i, ix) => { const p = prod(i.p), l = fefo(p); return `<tr><td><b>${h(p.nome)}</b><small>lote ${h(l?.lote || '—')} · vence ${l ? dt(l.val) : '—'}${p.lista ? ` · <span class="selo ru">lista ${p.lista}</span>` : ''}${p.antibiotico ? ' · <span class="selo at">antibiótico</span>' : ''}${p.geladeira ? ' · geladeira' : ''}${db.popular && c && p.pop ? ' · <span class="selo ok">Farmácia Popular</span>' : ''}</small>${(p.lista || p.antibiotico) ? (i.receita ? `<small>receita ${h(i.receita.num)} · ${h(i.receita.medico)} ✓</small>` : `<button class="bt x" data-receita="${ix}">Registrar receita</button>`) : ''}</td><td class="dir">${i.q}</td><td class="dir">${R$(precoItem(i))}</td><td><button class="bt x" data-tira="${ix}" aria-label="Tirar">×</button></td></tr>`; }).join('') || '<tr><td colspan="4" class="vz">Leia o código de barras ou digite o nome.</td></tr>'}</tbody></table></section>
      <aside class="pnl"><h2>Cliente</h2>${c ? `<p style="margin:0"><b>${h(c.nome)}</b><br><span class="vz">CPF ${h(c.cpf)} · ${c.pontos} pontos${c.deve ? ` · deve ${R$(c.deve)}` : ''}</span></p><div class="grp" style="margin:8px 0"><label style="display:flex;gap:6px;align-items:center;font-size:.86rem"><input type="checkbox" data-popular ${db.popular ? 'checked' : ''}> Farmácia Popular</label><button class="bt x" data-a="sem-cli">Trocar</button></div>` : '<div class="grp" style="margin-bottom:8px"><button class="bt" data-a="cpf">Informar CPF</button></div>'}
        <div class="lin-r"><span>Subtotal</span><span class="m">${R$(sub)}</span></div>${gov ? `<div class="lin-r"><span>Governo paga (Farmácia Popular)</span><span class="m">−${R$(gov)}</span></div>` : ''}${pontosDesc && db.cesta.length ? `<div class="lin-r"><span>Desconto por pontos</span><span class="m">−${R$(pontosDesc)}</span></div>` : ''}
        <div class="tot-g"><span>Total</span><span>${R$(Math.max(0, tot - (db.cesta.length ? pontosDesc : 0)))}</span></div>
        ${precisaReceita ? '<p class="selo ru" style="display:block;padding:6px 10px;margin-bottom:10px">Registre a receita dos itens controlados para fechar.</p>' : ''}
        <div class="formas">${['PIX', 'Cartão', 'Dinheiro', 'Crediário'].map((f) => `<button class="bt g ${f === 'PIX' ? 'am' : ''}" data-pagar="${f}" ${db.cesta.length && !precisaReceita && (f !== 'Crediário' || c) ? '' : 'disabled'}>${f}</button>`).join('')}</div></aside></div>`;
  },
  entregas() {
    const prox = { separando: ['Saiu para entrega', 'saiu'], saiu: ['Entregue', 'entregue'] };
    return `<div class="cab"><div><h1>Entregas</h1><p>Pedidos que chegam pelo WhatsApp viram entrega com rota e aviso ao cliente em cada etapa.</p></div><button class="bt am" data-a="nova-entrega">+ Entrega</button></div><section class="pnl rolo"><table class="t"><thead><tr><th>Cliente</th><th>Endereço</th><th>Itens</th><th class="dir">Total</th><th>Situação</th><th></th></tr></thead><tbody>${db.entregas.map((x) => `<tr><td><b>${h(x.cli)}</b></td><td>${h(x.end)}</td><td>${h(x.itens)}</td><td class="dir">${x.tot ? R$(x.tot) : 'Farmácia Popular'}</td><td><span class="selo ${x.st === 'entregue' ? 'ok' : x.st === 'saiu' ? 'am' : 'at'}">${x.st}</span></td><td>${prox[x.st] ? `<button class="bt x" data-entrega="${x.id}" data-v="${prox[x.st][1]}">${prox[x.st][0]}</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  },
  controlados() {
    const pend = db.livro.filter((m) => !m.enviado);
    return `<div class="cab"><div><h1>Livro de controlados</h1><p>Portaria 344: toda entrada e saída de lista A e B com receita, médico e CRM. O envio ao SNGPC da Anvisa sai daqui.</p></div><button class="bt am" data-a="sngpc" ${pend.length ? '' : 'disabled'}>Enviar ${pend.length} movimento(s) ao SNGPC</button></div>
      <div class="grade"><section class="pnl c8 rolo"><table class="t"><thead><tr><th>Data</th><th>Produto</th><th>Mov.</th><th class="dir">Qtd</th><th>Documento</th><th>SNGPC</th></tr></thead><tbody>${db.livro.filter((m) => prod(m.p).lista).sort((a, b) => b.dia - a.dia).map((m) => `<tr><td>${dt(m.dia)}</td><td>${h(prod(m.p).nome)} <span class="selo ru">${prod(m.p).lista}</span></td><td>${m.tipo}</td><td class="dir">${m.tipo === 'saida' ? '−' : '+'}${m.qtd}</td><td>${h(m.doc)}</td><td>${m.enviado ? '<span class="selo ok">enviado</span>' : '<span class="selo at">pendente</span>'}</td></tr>`).join('')}</tbody></table></section>
      <section class="pnl c4"><h2>Saldo de controlados</h2><table class="t"><tbody>${db.prods.filter((p) => p.lista).map((p) => `<tr><td>${h(p.nome)}</td><td class="dir">${qtd(p)}</td></tr>`).join('')}</tbody></table><p class="vz">O inventário do sistema precisa bater com a prateleira. Confira toda semana.</p></section></div>`;
  },
  antibioticos() {
    const l = db.livro.filter((m) => prod(m.p).antibiotico);
    return `<div class="cab"><div><h1>Antibióticos</h1><p>Receita em 2 vias, validade de 10 dias. A 2ª via fica retida e o registro fica aqui.</p></div></div><section class="pnl rolo"><table class="t"><thead><tr><th>Data</th><th>Produto</th><th class="dir">Qtd</th><th>Receita</th></tr></thead><tbody>${l.map((m) => `<tr><td>${dt(m.dia)}</td><td>${h(prod(m.p).nome)}</td><td class="dir">${m.qtd}</td><td>${h(m.doc)}</td></tr>`).join('') || '<tr><td colspan="4" class="vz">Nenhuma venda de antibiótico ainda. Venda uma amoxicilina no caixa para ver o registro aqui.</td></tr>'}</tbody></table></section>`;
  },
  geladeira() {
    const t = db.temps, W = 720, H = 170, x = (i) => 30 + i / (t.length - 1) * (W - 40), y = (v) => H - 20 - (v - 0) / 12 * (H - 30), fora = t.filter((v) => v < 2 || v > 8).length;
    return `<div class="cab"><div><h1>Geladeira dos termolábeis</h1><p>Insulina e vacinas ficam entre 2 °C e 8 °C. O sensor registra a cada 30 minutos (na versão contratada, com sensor Wi-Fi).</p></div><button class="bt" data-a="registrar-temp">Registrar leitura manual</button></div>
      <div class="grade"><div class="pnl c3 kpi"><small>Agora</small><b>${t[t.length - 1].toLocaleString('pt-BR')} °C</b></div><div class="pnl c3 kpi"><small>Leituras fora da faixa (24 h)</small><b style="color:${fora ? 'var(--verm)' : 'var(--verde)'}">${fora}</b></div><section class="pnl c12 termo"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperatura nas últimas 24 horas">
        <rect x="30" y="${y(8)}" width="${W - 40}" height="${y(2) - y(8)}" fill="#e1ebd6"/><text x="26" y="${y(8) + 3}" text-anchor="end">8°</text><text x="26" y="${y(2) + 3}" text-anchor="end">2°</text>
        <polyline fill="none" stroke="#4a2c4f" stroke-width="2.5" points="${t.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>${t.map((v, i) => (v > 8 || v < 2 ? `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#ad4a43"/>` : '')).join('')}
        <text x="30" y="${H - 4}">24 h atrás</text><text x="${W - 10}" y="${H - 4}" text-anchor="end">agora</text></svg>${fora ? '<p class="vz">Às 3 da manhã passou de 8 °C por uma hora (queda de energia). Registre a ocorrência e avalie os lotes com o farmacêutico.</p>' : ''}</section></div>`;
  },
  estoque() {
    return `<div class="cab"><div><h1>Estoque</h1><p>Por lote e validade. O caixa sempre vende o lote que vence primeiro.</p></div></div><section class="pnl rolo"><table class="t"><thead><tr><th>Produto</th><th>Lotes</th><th class="dir">Tem</th><th class="dir">Mínimo</th><th class="dir">Custo</th><th class="dir">Preço</th><th class="dir">Margem</th></tr></thead><tbody>${db.prods.map((p) => `<tr><td><b>${h(p.nome)}</b>${p.lista ? ` <span class="selo ru">${p.lista}</span>` : ''}</td><td>${p.lotes.map((l) => `<span class="selo ${l.val < 30 ? 'at' : ''}">${h(l.lote)} · ${l.qtd} · ${dt(l.val)}</span>`).join(' ')}</td><td class="dir">${qtd(p) < p.min ? `<span class="selo ru">${qtd(p)}</span>` : qtd(p)}</td><td class="dir">${p.min}</td><td class="dir">${R$(p.custo)}</td><td class="dir">${R$(p.preco)}</td><td class="dir">${Math.round((p.preco - p.custo) / p.preco * 100)}%</td></tr>`).join('')}</tbody></table></section>`;
  },
  compras() {
    const falta = db.prods.filter((p) => qtd(p) < p.min);
    return `<div class="cab"><div><h1>Compras</h1><p>Sugestão pelo mínimo e pela venda média. Quando a mercadoria chega, a nota (XML) dá entrada com lote e validade de cada item.</p></div><div class="grp"><button class="bt" data-a="importar-nota">Importar nota (XML)</button></div></div>
      <section class="pnl rolo"><h2>Sugestão de compra</h2><table class="t"><tbody>${falta.map((p) => `<tr><td>${h(p.nome)}</td><td class="dir">tem ${qtd(p)}</td><td class="dir">comprar ${p.min * 3 - qtd(p)}</td><td class="dir">${R$((p.min * 3 - qtd(p)) * p.custo)}</td></tr>`).join('') || '<tr><td class="vz">Nada abaixo do mínimo.</td></tr>'}</tbody></table></section>`;
  },
  clientes() {
    return `<div class="cab"><div><h1>Clientes</h1><p>Identificados pelo CPF no caixa: juntam pontos (1 ponto por real; 300 pontos = R$ 15) e recebem lembrete do remédio de uso contínuo.</p></div><button class="bt am" data-a="novo-cli">+ Cliente</button></div><section class="pnl rolo"><table class="t"><thead><tr><th>Cliente</th><th>CPF</th><th class="dir">Pontos</th><th>Uso contínuo</th><th></th></tr></thead><tbody>${db.clientes.map((c) => `<tr><td><b>${h(c.nome)}</b></td><td class="m">${h(c.cpf)}</td><td class="dir">${c.pontos}</td><td>${c.cont ? '<span class="selo am">sim</span>' : ''}</td><td><button class="bt x" data-usar-cli="${c.id}">Abrir no caixa</button></td></tr>`).join('')}</tbody></table></section>`;
  },
  crediario() {
    const l = db.clientes.filter((c) => c.limite);
    return `<div class="cab"><div><h1>Crediário</h1><p>Cliente de confiança compra para pagar depois, dentro do limite. Vencido trava novas compras até pagar.</p></div></div><section class="pnl rolo"><table class="t"><thead><tr><th>Cliente</th><th class="dir">Limite</th><th class="dir">Deve</th><th>Situação</th><th></th></tr></thead><tbody>${l.map((c) => `<tr><td><b>${h(c.nome)}</b></td><td class="dir">${R$(c.limite)}</td><td class="dir">${R$(c.deve)}</td><td>${c.deve ? (c.venceu ? '<span class="selo ru">vencido</span>' : '<span class="selo at">em aberto</span>') : '<span class="selo ok">em dia</span>'}</td><td>${c.deve ? `<button class="bt x" data-recebe="${c.id}">Recebi</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  },
  servicos() {
    return `<div class="cab"><div><h1>Serviços farmacêuticos</h1><p>Aferição de pressão, glicemia e aplicação de injetáveis, com agenda e declaração de serviço assinada pelo farmacêutico.</p></div><button class="bt am" data-a="novo-serv">+ Agendar</button></div><section class="pnl rolo"><table class="t"><thead><tr><th>Quando</th><th>Serviço</th><th>Cliente</th><th></th></tr></thead><tbody>${db.servicos.map((s) => `<tr><td>${s.dia ? 'amanhã' : 'hoje'} ${Math.floor(s.hora)}:${s.hora % 1 ? '30' : '00'}</td><td>${h(s.s)}</td><td>${h(s.cli)}</td><td>${s.feito ? '<span class="selo ok">feito</span>' : `<button class="bt x" data-serv="${s.id}">Registrar resultado</button>`}</td></tr>`).join('')}</tbody></table></section>`;
  },
  relatorios() {
    const tot = db.vendas.reduce((s, v) => s + v.total, 0), por = {}; db.vendas.forEach((v) => { por[v.forma] = (por[v.forma] || 0) + v.total; });
    return `<div class="cab"><div><h1>Relatórios de hoje</h1></div></div><div class="grade"><div class="pnl c3 kpi"><small>Vendido</small><b>${R$(tot)}</b></div><div class="pnl c3 kpi"><small>Vendas</small><b>${db.vendas.length}</b></div><div class="pnl c3 kpi"><small>Ticket médio</small><b>${R$(tot / (db.vendas.length || 1))}</b></div><div class="pnl c3 kpi"><small>Margem média</small><b>${Math.round(db.prods.reduce((s, p) => s + (p.preco - p.custo) / p.preco, 0) / db.prods.length * 100)}%</b></div>
      <section class="pnl c6"><h2>Por forma de pagamento</h2><table class="t"><tbody>${Object.entries(por).map(([f, v]) => `<tr><td>${f}</td><td class="dir">${R$(v)}</td></tr>`).join('')}</tbody></table></section><section class="pnl c6"><h2>Farmácia Popular a receber do governo</h2><p class="kpi"><b>${R$(1842.3)}</b></p><p class="vz">Repasse do mês corrente, conferido com as autorizações de cada venda.</p></section></div>`;
  },
  equipe() {
    const pr = db.plano === 'pro' ? 209 : 149;
    return `<div class="cab"><div><h1>Equipe</h1><p>Painel do dono: o balconista não vende controlado sem o login do farmacêutico.</p></div></div><div class="grade"><section class="pnl c7 rolo"><table class="t"><tbody><tr><td><b>Dra. Teresa (farmacêutica RT)</b></td><td>tudo, inclusive controlados e SNGPC</td></tr><tr><td><b>Gustavo (balconista)</b></td><td>caixa, entregas, clientes</td></tr><tr><td><b>Priscila (balconista)</b></td><td>caixa, estoque</td></tr><tr><td><b>Beto (entregador)</b></td><td>só as entregas dele, pelo celular</td></tr></tbody></table></section>
      <section class="pnl c5"><h2>Plano</h2><p>Assinatura · <b>${R$(pr)}/mês</b></p><div class="grp"><button class="bt ${db.plano === 'basico' ? 'am' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 149/mês</button></div><p class="vz">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() { return `<div class="cab"><div><h1>Ajustes</h1></div></div><section class="pnl" style="max-width:640px"><label class="cmp">Nome da farmácia<input data-aj="farm" value="${h(db.farm)}"></label><p class="vz">Na versão contratada: NFC-e, SNGPC, Farmácia Popular (autorização no caixa), TEF do cartão, sensor da geladeira e importação de notas da SEFAZ. Algumas integrações têm custo à parte.</p></section>`; },
};

function tela() {
  const r = location.hash.slice(1) || 'caixa', n = { Controle: db.livro.filter((m) => !m.enviado).length + (db.temps.some((v) => v > 8) ? 1 : 0), Estoque: db.prods.filter((p) => qtd(p) < p.min).length, Clientes: db.clientes.filter((c) => c.venceu).length, Vender: db.entregas.filter((x) => x.st === 'separando').length };
  $('#menu').innerHTML = GRUPOS.map(([g, l]) => `<div class="grupo-m ${l.some((x) => x[0] === r) ? 'ativo' : ''}"><button type="button" aria-expanded="false" data-grupo="${g}">${g}${n[g] ? `<span class="n">${n[g]}</span>` : ''}</button><div class="suspenso" hidden>${l.map(([k, t, s]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${t}<small>${s}</small></a>`).join('')}</div></div>`).join('');
  $('#conteudo').innerHTML = (V[r] || V.caixa)();
  $('#farm').textContent = db.farm; $('#caixa-info').textContent = `Caixa 1 · ${db.vendas.length} vendas hoje`;
  document.title = `${nomeTela(r)} · Veltria Farmácia Completo`;
  if (r === 'caixa') { const b = $('#busca'); b.focus(); b.addEventListener('input', acha); b.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const p = busca(b.value)[0]; if (p) poe(p.id); } }); }
}
addEventListener('hashchange', () => { tela(); scrollTo(0, 0); });
const busca = (q) => { const x = sa(q).trim(); return x.length < 2 ? [] : db.prods.filter((p) => p.ean === x || sa(p.nome).includes(x)).slice(0, 6); };
function acha() { $('#achados').innerHTML = busca($('#busca').value).map((p) => `<button type="button" data-poe="${p.id}"><span>${h(p.nome)}<small>tem ${qtd(p)}${p.lista ? ` · lista ${p.lista}` : ''}</small></span><span class="m">${R$(p.preco)}</span></button>`).join(''); }
function poe(id) { const p = prod(id); if (!qtd(p)) return aviso('Sem estoque válido.'); const i = db.cesta.find((x) => x.p === id); if (i) i.q++; else db.cesta.push({ p: id, q: 1 }); salva(); tela(); }

function ia() {
  const fs = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Vejo caixa, estoque, controlados, geladeira e crediário. Na versão contratada, 20 perguntas grátis por dia. Não substituo a avaliação do farmacêutico.' }];
  dlg(`<h2>Assistente da farmácia</h2><div class="chat">${fs.map((m) => `<div class="f ${m.ia ? 'ia' : 'eu'}">${h(m.t)}</div>`).join('')}</div><div class="sug">${['O que falta mandar ao SNGPC?', 'Quem está devendo no crediário?', 'O que preciso comprar?', 'A geladeira teve problema?'].map((s) => `<button type="button" data-s="${h(s)}">${h(s)}</button>`).join('')}</div><form id="f-ia" class="grp"><input id="q-ia" style="flex:1;min-height:40px;border:1px solid var(--rosa);border-radius:9px;padding:0 10px" placeholder="Pergunte" aria-label="Pergunta"><button class="bt am">Enviar</button></form>`, (d, fecha) => {
    const envia = (q) => { const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${responde(q)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: q }, resp); db.conversa = db.conversa.slice(-10); salva(); fecha(); ia(); if (window.veltriaIA) window.veltriaIA(q).then((t) => { resp.t = t; salva(); fecha(); ia(); }); };
    d.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => envia(b.dataset.s)));
    d.querySelector('#f-ia').addEventListener('submit', (e) => { e.preventDefault(); const q = d.querySelector('#q-ia').value.trim(); if (q.length > 2) envia(q); });
    const c = d.querySelector('.chat'); c.scrollTop = 1e6;
  });
}
function responde(q) {
  const x = sa(q);
  if (/sngpc|controlad/.test(x)) { const l = db.livro.filter((m) => !m.enviado); return l.length ? `${l.length} movimento(s) pendente(s): ${l.map((m) => `${prod(m.p).nome} (${dt(m.dia)})`).join(', ')}. O prazo é de 7 dias: envie hoje em Controle > Controlados.` : 'Tudo enviado ao SNGPC.'; }
  if (/deve|crediario|fiado/.test(x)) { const l = db.clientes.filter((c) => c.deve); return l.length ? l.map((c) => `• ${c.nome}: ${R$(c.deve)}${c.venceu ? ' (vencido, compras travadas)' : ''}`).join('\n') : 'Ninguém devendo.'; }
  if (/compr|falt/.test(x)) { const l = db.prods.filter((p) => qtd(p) < p.min); return l.length ? `Abaixo do mínimo: ${l.map((p) => `${p.nome} (${qtd(p)})`).join(', ')}.` : 'Nada em falta.'; }
  if (/geladeira|temperatura|insulina/.test(x)) return db.temps.some((v) => v > 8) ? 'Sim: de madrugada passou de 8 °C por cerca de 1 hora (pico de 9,9 °C). Registre a ocorrência e confira com o fabricante a estabilidade da insulina do lote IN09 antes de vender.' : 'Temperatura dentro da faixa nas últimas 24 horas.';
  return `Hoje: ${db.vendas.length} vendas, ${R$(db.vendas.reduce((s, v) => s + v.total, 0))}.`;
}

const A = {
  cpf: () => pergunta('Cliente pelo CPF', `<label class="cmp">CPF<input name="c" list="cpfs" required placeholder="000.000.000-00"><datalist id="cpfs">${db.clientes.map((c) => `<option value="${c.cpf}">${h(c.nome)}</option>`).join('')}</datalist></label>`, 'Usar', (f) => { const c = db.clientes.find((x) => x.cpf === f.get('c')); if (!c) { aviso('CPF não cadastrado. Cadastre em Clientes.'); return false; } db.cli = c.id; }),
  'sem-cli': () => { db.cli = null; db.popular = false; salva(); tela(); },
  'nova-entrega': () => pergunta('Nova entrega', '<label class="cmp">Cliente<input name="c" required></label><label class="cmp">Endereço<input name="e" required></label><label class="cmp">Itens<input name="i" required></label><label class="cmp">Total (R$)<input name="t" inputmode="decimal"></label>', 'Criar', (f) => { db.entregas.unshift({ id: uid(), cli: f.get('c'), end: f.get('e'), itens: f.get('i'), tot: nv(f.get('t')), st: 'separando' }); aviso('Entrega criada. O cliente recebe o aviso no WhatsApp.'); }),
  sngpc: () => { const n = db.livro.filter((m) => !m.enviado).length; db.livro.forEach((m) => { m.enviado = true; }); salva(); tela(); aviso(`${n} movimento(s) enviados ao SNGPC (demonstração). Protocolo guardado.`); },
  'registrar-temp': () => pergunta('Leitura da geladeira', '<label class="cmp">Temperatura (°C)<input name="t" inputmode="decimal" required></label>', 'Registrar', (f) => { const v = nv(f.get('t')); db.temps.push(v); db.temps.shift(); if (v < 2 || v > 8) aviso('Fora da faixa de 2 °C a 8 °C. O farmacêutico foi avisado.'); }),
  'importar-nota': () => { db.prods.filter((p) => qtd(p) < p.min).forEach((p) => p.lotes.push({ lote: `NF${Math.floor(Math.random() * 900 + 100)}`, val: 365, qtd: p.min * 3 - qtd(p) })); salva(); tela(); aviso('Nota importada: entrada com lote e validade de cada item. Controlados entraram no livro.'); },
  'novo-cli': () => pergunta('Novo cliente', '<label class="cmp">Nome<input name="n" required></label><label class="cmp">CPF<input name="c" required></label><label style="display:flex;gap:6px;font-size:.88rem"><input type="checkbox" name="u"> usa remédio contínuo</label>', 'Cadastrar', (f) => { db.clientes.push({ id: uid(), nome: f.get('n'), cpf: f.get('c'), pontos: 0, limite: 0, deve: 0, venceu: false, cont: !!f.get('u') }); }),
  'novo-serv': () => pergunta('Agendar serviço', '<label class="cmp">Serviço<select name="s"><option>Aferição de pressão</option><option>Glicemia capilar</option><option>Aplicação de injetável</option></select></label><label class="cmp">Cliente<input name="c" required></label><label class="cmp">Hora<input name="h" type="number" step="0.5" value="16"></label>', 'Agendar', (f) => { db.servicos.push({ id: uid(), s: f.get('s'), cli: f.get('c'), dia: 0, hora: nv(f.get('h')), feito: false }); }),
  plano: (d) => { db.plano = d.v; salva(); tela(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  const g = t.closest('[data-grupo]'); if (g) { const s = g.nextElementSibling, ab = s.hidden; document.querySelectorAll('.suspenso').forEach((x) => { x.hidden = true; x.previousElementSibling.setAttribute('aria-expanded', 'false'); }); s.hidden = !ab; g.setAttribute('aria-expanded', String(ab)); return; }
  if (!t.closest('.suspenso')) document.querySelectorAll('.suspenso').forEach((x) => { x.hidden = true; });
  if (t.closest('[data-ia]')) { ia(); return; }
  const po = t.closest('[data-poe]'); if (po) { poe(po.dataset.poe); return; }
  const ti = t.closest('[data-tira]'); if (ti) { db.cesta.splice(Number(ti.dataset.tira), 1); salva(); tela(); return; }
  const rc = t.closest('[data-receita]'); if (rc) { const i = db.cesta[Number(rc.dataset.receita)], p = prod(i.p); pergunta(`Receita · ${h(p.nome)}`, `<div class="duas"><label class="cmp">Paciente<input name="pa" required></label><label class="cmp">Nº da receita${p.lista ? ` (${p.lista === 'A3' ? 'notificação amarela A' : 'notificação azul B'})` : ''}<input name="nu" required></label></div><div class="duas"><label class="cmp">Médico<input name="me" required></label><label class="cmp">CRM<input name="cr" required></label></div>`, 'Registrar', (f) => { i.receita = { pac: f.get('pa'), num: f.get('nu'), medico: f.get('me'), crm: f.get('cr') }; }); return; }
  const pg = t.closest('[data-pagar]'); if (pg) {
    const c = cliente(), forma = pg.dataset.pagar; if (forma === 'Crediário' && c?.venceu) return aviso('Crediário vencido: receba o que está em aberto antes.');
    const pontosDesc = c && c.pontos >= 300 ? 15 : 0, tot = Math.max(0, db.cesta.reduce((s, i) => s + precoItem(i), 0) - pontosDesc), linhas = db.cesta.map((i) => `${prod(i.p).nome.slice(0, 28).padEnd(28)} ${String(i.q).padStart(2)} ${R$(precoItem(i)).padStart(12)}`).join('\n');
    db.cesta.forEach((i) => { const p = prod(i.p); let f = i.q; [...p.lotes].filter((l) => l.val >= 0).sort((a, b) => a.val - b.val).forEach((l) => { const u = Math.min(l.qtd, f); l.qtd -= u; f -= u; }); if (i.receita) db.livro.push({ id: uid(), dia: 0, tipo: 'saida', p: p.id, qtd: i.q, doc: `Receita ${i.receita.num} · ${i.receita.medico} ${i.receita.crm} · paciente ${i.receita.pac}`, enviado: !p.lista }); });
    if (c) { c.pontos = c.pontos - (pontosDesc ? 300 : 0) + Math.floor(tot); if (forma === 'Crediário') c.deve += tot; }
    db.vendas.push({ total: tot, forma }); db.cesta = []; db.popular = false; db.cli = null; salva(); tela();
    dlg(`<h2>Venda fechada</h2><div class="cupom">${h(db.farm)}\n${'-'.repeat(46)}\n${h(linhas)}\n${'-'.repeat(46)}\nTOTAL ${R$(tot).padStart(40)}\n${forma}${c ? `\nCliente: ${h(c.nome)} · ${c.pontos} pontos` : ''}\n\nNFC-e de demonstração</div><div class="pe"><button class="bt am" data-sair>Próximo cliente</button></div>`);
    return;
  }
  const en = t.closest('[data-entrega]'); if (en) { const x = db.entregas.find((y) => y.id === en.dataset.entrega); x.st = en.dataset.v; salva(); tela(); aviso(x.st === 'saiu' ? `${x.cli} avisado: o pedido saiu para entrega.` : 'Entrega concluída.'); return; }
  const rb = t.closest('[data-recebe]'); if (rb) { const c = db.clientes.find((y) => y.id === rb.dataset.recebe); db.vendas.push({ total: c.deve, forma: 'Recebimento crediário' }); c.deve = 0; c.venceu = false; salva(); tela(); aviso(`${c.nome} quitou o crediário.`); return; }
  const uc = t.closest('[data-usar-cli]'); if (uc) { db.cli = uc.dataset.usarCli; salva(); location.hash = '#caixa'; return; }
  const sv = t.closest('[data-serv]'); if (sv) { const s = db.servicos.find((y) => y.id === sv.dataset.serv); pergunta(`${h(s.s)} · ${h(s.cli)}`, '<label class="cmp">Resultado<input name="r" required placeholder="12 por 8 · 98 mg/dL"></label>', 'Salvar e gerar declaração', (f) => { s.feito = true; aviso(`Declaração de serviço gerada: ${f.get('r')}.`); }); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if ('popular' in t.dataset) { db.popular = t.checked; salva(); tela(); if (t.checked) aviso('Farmácia Popular: confira a receita e o documento com foto. O governo paga os itens marcados.'); }
  if (t.dataset.aj) { db[t.dataset.aj] = t.value; salva(); tela(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.suspenso').forEach((x) => { x.hidden = true; }); });
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = inicial(); location.hash = '#caixa'; tela(); aviso('Demonstração recomeçada.'); });
tela();

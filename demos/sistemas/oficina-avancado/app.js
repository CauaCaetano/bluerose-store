// Veltria Oficina Avançado · protótipo "cabine" para rede de oficinas com várias unidades.
// Painel de instrumentos (mostradores) leva a cada módulo: produtividade, boxes, DRE, peças (curva ABC, cotação,
// garantia de fabricante), pós-venda (NPS, recall, revisão por km), frotas com contrato de preventiva, auditoria,
// equipe e ajustes. Console embaixo aceita comandos e perguntas para a IA. Dados de exemplo (?novo recomeça).

const CHAVE = 'veltria-oficina-avancado-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—'); // unidade nova, sem movimento: traço em vez de NaN
const q = (s) => document.querySelector(s);
const soma = (l, f) => l.reduce((s, x) => s + f(x), 0);
const quando = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// unidades da rede: ficam nos dados (db.unidades); estas são as do exemplo
const UN_EXEMPLO = { ct: 'Contagem', bt: 'Betim', pp: 'Pampulha' };
const UNIDADES = {};
function fabrica() {
  const mec = [['Robson', 'ct', 'Motor', 176, 171, 158], ['Diego', 'ct', 'Freios e suspensão', 176, 149, 162], ['Kauã', 'ct', 'Rápidos', 176, 120, 166], ['Fábio', 'bt', 'Elétrica e injeção', 176, 184, 160], ['Thaís', 'bt', 'Ar-condicionado', 176, 131, 150], ['Wesley', 'bt', 'Motor', 176, 97, 139], ['Renan', 'pp', 'Câmbio automático', 176, 192, 168], ['Jéssica', 'pp', 'Diagnóstico', 176, 158, 161], ['Otávio', 'pp', 'Freios e suspensão', 176, 140, 155]]
    .map(([nome, un, esp, disp, vend, trab], i) => ({ id: `m${i}`, nome, un, esp, disp, vend, trab }));
  const boxes = { ct: ['Elevador 1', 'Elevador 2', 'Elevador 3', 'Alinhamento', 'Rápido'], bt: ['Elevador 1', 'Elevador 2', 'Valeta', 'Ar-condicionado'], pp: ['Elevador 1', 'Elevador 2', 'Elevador 3', 'Câmbio', 'Diagnóstico', 'Rápido'] };
  const carros = [['ct', 0, 'RJK4A11', 'Compass 2020', 'Robson', 'ocupado', 2.5], ['ct', 1, 'PLM7C30', 'Argo 2022', 'Diego', 'ocupado', 0.8], ['ct', 3, 'OPQ1F45', 'Polo 2019', 'Kauã', 'ocupado', 0.4], ['bt', 0, 'SDX9E21', 'Yaris 2021', 'Fábio', 'ocupado', 1.2], ['bt', 2, 'QAB2D88', 'S10 2018', 'Wesley', 'parado', 26], ['bt', 3, 'MNB3G67', 'HR-V 2017', 'Thaís', 'ocupado', 1.9], ['pp', 0, 'KJH5H09', 'Duster 2016', 'Otávio', 'ocupado', 3.1], ['pp', 3, 'TYU6K45', 'Corolla 2019 CVT', 'Renan', 'ocupado', 4.6], ['pp', 4, 'LKP8J12', 'Creta 2023', 'Jéssica', 'parado', 19]].map(([un, box, placa, modelo, mec, estado, h]) => ({ un, box, placa, modelo, mec, estado, h }));
  const dre = { ct: { mo: 118400, pecas: 164300, cmv: 98600, comissoes: 31200, fixas: 68900 }, bt: { mo: 84300, pecas: 101900, cmv: 63100, comissoes: 21800, fixas: 61200 }, pp: { mo: 139700, pecas: 188200, cmv: 109400, comissoes: 37600, fixas: 74100 } };
  const pecas = [['5W30-SN', 'Óleo 5W30 sintético (L)', 1840, 31, 18.6, 'ct'], ['W712/95', 'Filtro de óleo', 610, 48, 21, 'ct'], ['PD/1043', 'Pastilhas dianteiras Argo', 212, 198, 88, 'bt'], ['CT1201K2', 'Kit correia dentada 2.0', 41, 845, 470, 'pp'], ['GP32988', 'Amortecedor S10 (par)', 18, 1260, 690, 'bt'], ['ATF-CVT', 'Fluido CVT (L)', 260, 92, 51, 'pp'], ['BD1745', 'Discos de freio (par)', 96, 420, 210, 'ct'], ['VELA-NGK-6', 'Jogo de velas', 188, 148, 64, 'pp'], ['FA-CAB', 'Filtro de cabine', 402, 68, 22, 'bt'], ['R134A', 'Gás R134a (kg)', 74, 190, 96, 'bt'], ['LAMP-H7', 'Lâmpada H7', 230, 39, 14, 'ct'], ['PALH-26', 'Palheta 26"', 140, 59, 21, 'pp']]
    .map(([cod, nome, vendas, preco, custo, un]) => ({ cod, nome, vendas, preco, custo, un, estoque: Math.round(vendas / 12 * (0.6 + (cod.length % 5) / 4)) }));
  const frotas = [{ id: 'f1', empresa: 'Transportes Lima', veiculos: 18, plano: 'a cada 10.000 km ou 6 meses', sla: 24, mensal: 9800, proximas: [['QAB2D88', 'S10 2018', 'vence em 2 dias'], ['QAB3E10', 'S10 2019', 'vencida há 5 dias'], ['RTY7H21', 'Master 2021', 'em 12 dias']], cumprido: 0.91 }, { id: 'f2', empresa: 'Distribuidora Serra Azul', veiculos: 11, plano: 'a cada 15.000 km', sla: 48, mensal: 6400, proximas: [['GHJ8K44', 'Strada 2022', 'em 6 dias'], ['GHJ8K45', 'Strada 2022', 'em 6 dias']], cumprido: 0.97 }, { id: 'f3', empresa: 'Prefeitura de Betim (licitação)', veiculos: 42, plano: 'tabela da montadora', sla: 72, mensal: 21300, proximas: [['PMB0A01', 'Onix 2020', 'vencida há 1 dia'], ['PMB0A07', 'Saveiro 2019', 'em 3 dias']], cumprido: 0.84 }];
  const nps = { ct: [62, 14, 6], bt: [41, 15, 11], pp: [77, 12, 4] };
  const detratores = [{ id: 'd1', nome: 'Carla Nogueira', un: 'bt', nota: 3, motivo: 'Carro ficou 2 dias a mais esperando peça e ninguém avisou.', ligou: false }, { id: 'd2', nome: 'Sérgio Matos', un: 'bt', nota: 5, motivo: 'Cobrança diferente do orçamento.', ligou: false }, { id: 'd3', nome: 'Helena Dias', un: 'ct', nota: 4, motivo: 'Barulho voltou depois de uma semana.', ligou: false }];
  const recalls = [{ id: 'r1', titulo: 'Airbag do motorista · Honda Fit/City 2007-2014', clientes: 23, avisados: 0 }, { id: 'r2', titulo: 'Bomba de combustível · Toyota Corolla 2019', clientes: 9, avisados: 9 }];
  const garantias = [{ id: 'g1', peca: 'Bomba d’água (Compass)', fab: 'Nakata', valor: 486, status: 'enviada', dias: 12 }, { id: 'g2', peca: 'Módulo de injeção (Yaris)', fab: 'Bosch', valor: 2140, status: 'aprovada', dias: 21 }, { id: 'g3', peca: 'Amortecedor (HR-V)', fab: 'Cofap', valor: 690, status: 'a enviar', dias: 0 }];
  return { rede: 'Rede Torque Auto Center', un: 'todas', unidades: { ...UN_EXEMPLO }, mec, boxes, carros, dre, pecas, frotas, nps, detratores, recalls, garantias, meta: { efic: 0.95, ticket: 820 }, plano: 'basico', auditoria: [[quando(), 'Marina (gerente Betim)', 'deu desconto de 12% na OS 1184'], [quando(), 'Renan', 'estourou o tempo padrão da OS 2051 em 1,6 h'], [quando(), 'Sistema', 'importou 312 notas de entrada da SEFAZ']].map(([q1, quem, o]) => ({ q: q1, quem, o })), conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || fabrica(); } catch { return fabrica(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
// empresa que começou do zero trabalha com uma unidade, que dá para renomear; cada unidade nova ganha resultado, boxes e NPS zerados
function lerUnidades() {
  const u = db.unidades && typeof db.unidades === 'object' ? db.unidades : { ...UN_EXEMPLO };
  Object.keys(UNIDADES).forEach((k) => delete UNIDADES[k]); Object.assign(UNIDADES, Object.keys(u).length ? u : { principal: 'Unidade principal' });
  db.dre = db.dre || {}; db.boxes = db.boxes || {}; db.nps = db.nps || {};
  Object.keys(UNIDADES).forEach((k) => { db.dre[k] = db.dre[k] || { mo: 0, pecas: 0, cmv: 0, comissoes: 0, fixas: 0 }; db.boxes[k] = db.boxes[k] || ['Box 1', 'Box 2', 'Box 3']; db.nps[k] = db.nps[k] || [0, 0, 0]; });
  if (db.un !== 'todas' && !UNIDADES[db.un]) db.un = 'todas';
}
lerUnidades();
const guarda = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no navegador.'); } };
const registra = (o) => { db.auditoria.unshift({ q: quando(), quem: 'Você (dono)', o }); db.auditoria = db.auditoria.slice(0, 40); };
const daUn = (x) => db.un === 'todas' || x.un === db.un;
const nomeUn = () => (db.un === 'todas' ? 'todas as unidades' : `unidade ${UNIDADES[db.un]}`);

function aviso(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; q('#avisos').append(a); setTimeout(() => a.remove(), 3400); }
function janela(html, liga) {
  const s = document.createElement('div'); s.className = 'sobre'; s.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(s);
  const fecha = () => { s.remove(); antes?.focus?.(); };
  s.addEventListener('click', (ev) => { if (ev.target === s || ev.target.closest('[data-fecha]')) fecha(); });
  s.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecha(); });
  setTimeout(() => (s.querySelector('input, select') || s.querySelector('button'))?.focus(), 30);
  liga?.(s.querySelector('.janela'), fecha);
}

// ------------------------------------------------------------------ indicadores (alimentam os mostradores)
function ind() {
  const m = db.mec.filter(daUn), un = db.un === 'todas' ? Object.keys(UNIDADES) : [db.un];
  const d = un.reduce((a, k) => { Object.entries(db.dre[k]).forEach(([c, v]) => { a[c] = (a[c] || 0) + v; }); return a; }, {});
  const receita = d.mo + d.pecas, os = Math.round(receita / 790) || 0;
  const nps = un.reduce((a, k) => a.map((v, i) => v + db.nps[k][i]), [0, 0, 0]), totN = soma(nps, (x) => x);
  const bx = un.flatMap((k) => db.boxes[k].map((b, i) => db.carros.find((c) => c.un === k && c.box === i)));
  const p = db.pecas.filter(daUn);
  return {
    efic: soma(m, (x) => x.vend) / soma(m, (x) => x.trab), prod: soma(m, (x) => x.trab) / soma(m, (x) => x.disp),
    ocup: bx.filter(Boolean).length / bx.length, ticket: os ? receita / os : 0, margem: (d.pecas - d.cmv) / d.pecas,
    nps: totN ? Math.round((nps[0] - nps[2]) / totN * 100) : 0, giro: soma(p, (x) => x.vendas * x.custo) / (soma(p, (x) => x.estoque * x.custo || 1) || 1), d, receita, os,
    resultado: receita - d.cmv - d.comissoes - d.fixas,
  };
}
const MOSTRADORES = [
  ['produtividade', 'Eficiência', (i) => [Math.min(1.3, i.efic) / 1.3, pct(i.efic)], 'horas vendidas ÷ trabalhadas'],
  ['boxes', 'Boxes ocupados', (i) => [i.ocup, pct(i.ocup)], 'agora'],
  ['dre', 'Resultado', (i) => [Math.max(0, Math.min(1, i.resultado / i.receita / 0.3)), pct(i.resultado / i.receita)], 'margem do mês'],
  ['ticket', 'Ticket médio', (i) => [Math.min(1, i.ticket / 1200), R$(i.ticket)], () => `meta ${R$(db.meta.ticket)}`],
  ['pecas', 'Margem de peças', (i) => [i.margem / 0.6, pct(i.margem)], (i) => `giro ${i.giro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x no ano`],
  ['posvenda', 'NPS', (i) => [(i.nps + 100) / 200, String(i.nps)], 'clientes que indicam'],
];
const CHAVES = [['frotas', 'Frotas', () => db.frotas.reduce((s, f) => s + f.proximas.filter((p) => p[2].includes('vencida')).length, 0)], ['auditoria', 'Auditoria', () => 0], ['equipe', 'Equipe e dono', () => 0], ['ajustes', 'Ajustes', () => 0]];
function arco(fr, txt) {
  const a = Math.max(0, Math.min(1, fr)), ang = -90 + a * 180;
  return `<svg viewBox="0 0 120 70" aria-hidden="true"><path class="fundo-arco" d="M12 58 A48 48 0 0 1 108 58" fill="none" stroke-width="9" stroke-linecap="round"/><path class="arco" d="M12 58 A48 48 0 0 1 108 58" fill="none" stroke="${a < 0.35 ? '#b5545c' : a < 0.6 ? '#c9a45a' : '#a9a2c5'}" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="${a * 100} 100"/><g class="agulha" style="transform:rotate(${ang}deg)"><line x1="60" y1="58" x2="60" y2="20" stroke="#f1eef4" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="60" cy="58" r="5" fill="#f1eef4"/></svg><b>${e(txt)}</b>`;
}

// ------------------------------------------------------------------ módulos
const M = {
  painel(i) {
    const al = [];
    db.carros.filter((c) => c.estado === 'parado' && daUn(c)).forEach((c) => al.push(['#b5545c', `${c.modelo} (${c.placa}) parado há ${c.h} h no ${db.boxes[c.un][c.box]} de ${UNIDADES[c.un]}`, 'Esperando peça: ocupa um box que poderia faturar.', 'boxes']));
    db.mec.filter(daUn).filter((m) => m.vend / m.trab < 0.8).forEach((m) => al.push(['#c9a45a', `${m.nome} (${UNIDADES[m.un]}) com eficiência de ${pct(m.vend / m.trab)}`, 'Trabalhou mais horas do que vendeu. Veja ferramenta, treino ou tempo cobrado.', 'produtividade']));
    db.frotas.forEach((f) => f.proximas.filter((p) => p[2].includes('vencida')).forEach((p) => al.push(['#b5545c', `Preventiva vencida: ${p[1]} ${p[0]} da ${f.empresa}`, `Contrato com SLA de ${f.sla} h. Agende hoje para não pagar multa.`, 'frotas'])));
    db.detratores.filter((d) => !d.ligou && daUn(d)).forEach((d) => al.push(['#c9a45a', `${d.nome} deu nota ${d.nota} em ${UNIDADES[d.un]}`, d.motivo, 'posvenda']));
    db.garantias.filter((g) => g.status === 'a enviar').forEach((g) => al.push(['#a9a2c5', `Garantia de fabricante a enviar: ${g.peca}`, `${R$(g.valor)} para recuperar com a ${g.fab}.`, 'pecas']));
    const un = Object.keys(UNIDADES).map((k) => { const d = db.dre[k], r = d.mo + d.pecas; return { k, r, res: r - d.cmv - d.comissoes - d.fixas, ef: soma(db.mec.filter((m) => m.un === k), (m) => m.vend) / soma(db.mec.filter((m) => m.un === k), (m) => m.trab), nps: Math.round((db.nps[k][0] - db.nps[k][2]) / ((db.nps[k][0] + db.nps[k][1] + db.nps[k][2]) || 1) * 100) }; });
    return `<div class="titulo"><div><h1>Cabine da rede</h1><p>${e(nomeUn())} · ${al.length} alertas para resolver hoje. Clique num mostrador para abrir o módulo.</p></div></div>
      <div class="malha"><section class="bloco c7"><h2>Alertas do turno</h2><ul class="alertas">${al.map(([c, t, s, m]) => `<li style="--c:${c}"><div><p><b>${e(t)}</b></p><small>${e(s)}</small></div><button class="bt pq" data-ir="${m}">Abrir</button></li>`).join('') || '<li style="--c:#4f8a73"><p>Nada fora do lugar.</p></li>'}</ul></section>
      <section class="bloco c5"><h2>Unidades lado a lado <small>· mês</small></h2><div class="rolagem"><table><thead><tr><th>Unidade</th><th class="d">Faturamento</th><th class="d">Resultado</th><th class="d">Efic.</th><th class="d">NPS</th></tr></thead><tbody>${un.map((u) => `<tr><td><b>${UNIDADES[u.k]}</b></td><td class="d">${R$(u.r)}</td><td class="d">${R$(u.res)}</td><td class="d">${pct(u.ef)}</td><td class="d">${u.nps}</td></tr>`).join('')}<tr><td><b>Rede</b></td><td class="d"><b>${R$(soma(un, (u) => u.r))}</b></td><td class="d"><b>${R$(soma(un, (u) => u.res))}</b></td><td></td><td></td></tr></tbody></table></div>
        <p class="rot" style="margin:10px 0 0">${i.os} ordens de serviço no mês em ${e(nomeUn())}.</p></section></div>`;
  },
  produtividade(i) {
    const l = db.mec.filter(daUn).map((m) => ({ ...m, ef: m.vend / m.trab, pr: m.trab / m.disp })).sort((a, b) => b.ef - a.ef), meta = db.meta.efic;
    return `<div class="titulo"><div><h1>Produtividade</h1><p>Horas disponíveis, trabalhadas e vendidas (tempo padrão cobrado) de cada mecânico no mês. Meta de eficiência: ${pct(meta)}.</p></div><div class="acoes"><button class="bt" data-a="meta">Mudar meta</button></div></div>
      <div class="malha"><div class="bloco c3"><span class="rot">Eficiência</span><p class="num">${pct(i.efic)}</p><span class="rot">vendidas ÷ trabalhadas</span></div><div class="bloco c3"><span class="rot">Produtividade</span><p class="num">${pct(i.prod)}</p><span class="rot">trabalhadas ÷ disponíveis</span></div><div class="bloco c3"><span class="rot">Horas vendidas</span><p class="num">${soma(l, (m) => m.vend)} h</p><span class="rot">no mês</span></div><div class="bloco c3"><span class="rot">Horas perdidas</span><p class="num">${soma(l, (m) => Math.max(0, m.trab - m.vend))} h</p><span class="rot">trabalhadas e não cobradas</span></div>
      <section class="bloco c12"><div class="rolagem"><table><thead><tr><th>Mecânico</th><th>Unidade</th><th class="d">Disp.</th><th class="d">Trab.</th><th class="d">Vend.</th><th style="width:30%">Eficiência (linha vermelha = meta)</th><th class="d">%</th></tr></thead><tbody>${l.map((m) => `<tr><td><b>${e(m.nome)}</b><br><small class="rot">${e(m.esp)}</small></td><td>${UNIDADES[m.un]}</td><td class="d">${m.disp}</td><td class="d">${m.trab}</td><td class="d">${m.vend}</td><td><div class="trilha"><i style="width:${Math.min(100, m.ef / 1.3 * 100)}%"></i><b style="left:${meta / 1.3 * 100}%"></b></div></td><td class="d"><span class="sinal ${m.ef >= meta ? 'ok' : m.ef >= 0.8 ? 'at' : 'ru'}">${pct(m.ef)}</span></td></tr>`).join('')}</tbody></table></div></section></div>`;
  },
  boxes() {
    const un = db.un === 'todas' ? Object.keys(UNIDADES) : [db.un];
    return `<div class="titulo"><div><h1>Boxes e elevadores</h1><p>O que está em cada box agora. Carro parado esperando peça ocupa espaço que poderia faturar.</p></div></div>
      ${un.map((k) => `<section class="bloco" style="margin-bottom:14px"><h2>${UNIDADES[k]} <small>· ${db.carros.filter((c) => c.un === k).length} de ${db.boxes[k].length} ocupados</small></h2><div class="boxes">${db.boxes[k].map((b, i) => { const c = db.carros.find((x) => x.un === k && x.box === i); return c ? `<div class="box ${c.estado}"><small>${e(b)}</small><b>${e(c.placa)}</b><small>${e(c.modelo)} · ${e(c.mec)}</small><small>${c.estado === 'parado' ? `<span class="sinal ru">parado ${c.h} h</span> <button class="bt pq" data-a="liberar" data-k="${k}" data-i="${i}">Tirar do box</button>` : `${String(c.h).replace('.', ',')} h no serviço`}</small></div>` : `<div class="box"><small>${e(b)}</small><b>livre</b><small><button class="bt pq" data-a="ocupar" data-k="${k}" data-i="${i}">Pôr carro</button></small></div>`; }).join('')}</div></section>`).join('')}`;
  },
  dre(i) {
    const d = i.d, lin = [['Mão de obra', d.mo, 1], ['Peças', d.pecas, 1], ['Receita bruta', i.receita, 2], ['Custo das peças', -d.cmv], ['Comissões', -d.comissoes], ['Despesas fixas (aluguel, folha, energia)', -d.fixas], ['Resultado', i.resultado, 2]];
    return `<div class="titulo"><div><h1>Resultado (DRE)</h1><p>${e(nomeUn())} · mês corrente. Escolha a unidade no topo para ver cada uma.</p></div><div class="acoes"><button class="bt" data-a="exportar">Exportar para o contador</button></div></div>
      <div class="malha"><section class="bloco c7"><table><tbody>${lin.map(([n, v, t]) => `<tr><td>${t === 2 ? `<b>${n}</b>` : n}</td><td class="d">${t === 2 ? `<b>${R$(v)}</b>` : R$(v)}</td><td class="d rot">${pct(Math.abs(v) / i.receita)}</td></tr>`).join('')}</tbody></table></section>
      <section class="bloco c5"><h2>Onde está o lucro</h2><p class="rot" style="margin:0 0 6px">Margem da mão de obra (depois das comissões)</p><div class="trilha"><i style="width:${(d.mo - d.comissoes) / d.mo * 100}%"></i></div><p class="d" style="text-align:left">${pct((d.mo - d.comissoes) / d.mo)}</p><p class="rot" style="margin:10px 0 6px">Margem das peças</p><div class="trilha"><i class="v" style="width:${i.margem * 100}%"></i></div><p class="d" style="text-align:left">${pct(i.margem)}</p><p class="rot">Ponto de equilíbrio: ${R$(d.fixas / ((i.receita - d.cmv - d.comissoes) / i.receita))} de faturamento por mês.</p></section></div>`;
  },
  ticket(i) {
    const un = Object.keys(UNIDADES).map((k) => ({ k, t: (db.dre[k].mo + db.dre[k].pecas) / (Math.round((db.dre[k].mo + db.dre[k].pecas) / 790 * (k === 'bt' ? 1.12 : k === 'pp' ? 0.9 : 1)) || 1) }));
    return `<div class="titulo"><div><h1>Ticket médio</h1><p>Valor médio por ordem de serviço. Meta: ${R$(db.meta.ticket)}.</p></div><div class="acoes"><button class="bt" data-a="meta">Mudar meta</button></div></div>
      <div class="malha"><div class="bloco c4"><span class="rot">Ticket de ${e(nomeUn())}</span><p class="num">${R$(i.ticket)}</p><span class="dif ${i.ticket >= db.meta.ticket ? 'sobe' : 'desce'}">${i.ticket >= db.meta.ticket ? 'acima' : 'abaixo'} da meta</span></div>
      <section class="bloco c8"><h2>Por unidade</h2><table><tbody>${un.map((u) => `<tr><td>${UNIDADES[u.k]}</td><td style="width:55%"><div class="trilha"><i style="width:${u.t / 1200 * 100}%"></i><b style="left:${db.meta.ticket / 1200 * 100}%"></b></div></td><td class="d">${R$(u.t)}</td></tr>`).join('')}</tbody></table>
      <p class="rot">Como subir: ofereça o que o checklist de entrada encontrou (palhetas, filtro de cabine, fluido de freio). Em Betim, 31% das OS de troca de óleo saem sem filtro de cabine.</p></section></div>`;
  },
  pecas() {
    const l = db.pecas.filter(daUn).map((p) => ({ ...p, fat: p.vendas * p.preco })).sort((a, b) => b.fat - a.fat), tot = soma(l, (p) => p.fat); let ac = 0;
    l.forEach((p) => { ac += p.fat; p.cl = ac / tot <= 0.8 ? 'A' : ac / tot <= 0.95 ? 'B' : 'C'; });
    const cot = [['Distribuidora Autopeças BH', 1.0, 1, '30 dias'], ['Freios Center', 0.94, 2, '28 dias'], ['Peças Já (online)', 0.89, 4, 'à vista']];
    return `<div class="titulo"><div><h1>Peças</h1><p>Curva ABC, giro do estoque, cotação entre fornecedores e garantia de fabricante.</p></div><div class="acoes"><button class="bt forte" data-a="cotar">Cotar reposição da classe A</button></div></div>
      <div class="malha"><section class="bloco c8"><h2>Curva ABC <small>· ${e(nomeUn())}, 12 meses</small></h2><div class="rolagem"><table><thead><tr><th></th><th>Código</th><th>Peça</th><th class="d">Vendidas</th><th class="d">Faturou</th><th class="d">Margem</th><th class="d">Estoque</th><th class="d">Cobre</th></tr></thead><tbody>${l.map((p) => `<tr><td><span class="classe ${p.cl}">${p.cl}</span></td><td class="d" style="text-align:left">${e(p.cod)}</td><td>${e(p.nome)}</td><td class="d">${p.vendas}</td><td class="d">${R$(p.fat)}</td><td class="d">${pct((p.preco - p.custo) / p.preco)}</td><td class="d">${p.estoque}</td><td class="d">${Math.round(p.estoque / (p.vendas / 365))} dias</td></tr>`).join('')}</tbody></table></div><p class="rot">A: 80% do faturamento, nunca pode faltar. C: compre só sob encomenda.</p></section>
      <section class="bloco c4"><h2>Última cotação <small>· kit de 14 itens A</small></h2><div class="cotacao" style="grid-template-columns:1fr">${cot.map(([f, k, pz], ix) => `<div class="forn ${ix === 2 ? 'melhor' : ''}"><b>${f}</b><span class="d">${R$(18420 * k)}</span><span class="rot">entrega em ${pz} dia(s) · ${['30 dias', '28 dias', 'à vista'][ix]}</span></div>`).join('')}</div><p class="rot">Mais barato à vista, mas o prazo de 4 dias deixa 2 boxes parados. A IA sugere a Freios Center.</p></section>
      <section class="bloco c12"><h2>Garantia de fabricante <small>· peça que voltou com defeito</small></h2><div class="rolagem"><table><thead><tr><th>Peça</th><th>Fabricante</th><th class="d">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${db.garantias.map((g) => `<tr><td>${e(g.peca)}</td><td>${e(g.fab)}</td><td class="d">${R$(g.valor)}</td><td><span class="sinal ${g.status === 'aprovada' ? 'ok' : g.status === 'a enviar' ? 'ru' : 'at'}">${g.status}${g.dias ? ` · ${g.dias} dias` : ''}</span></td><td>${g.status === 'a enviar' ? `<button class="bt pq" data-a="garantia" data-id="${g.id}">Gerar laudo e enviar</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  },
  posvenda(i) {
    const un = db.un === 'todas' ? Object.keys(UNIDADES) : [db.un], n = un.reduce((a, k) => a.map((v, j) => v + db.nps[k][j]), [0, 0, 0]), t = soma(n, (x) => x);
    return `<div class="titulo"><div><h1>Pós-venda</h1><p>Pesquisa de satisfação enviada 2 dias depois da entrega, recall das montadoras e revisão por quilometragem.</p></div></div>
      <div class="malha"><section class="bloco c5"><h2>NPS ${i.nps} <small>· ${t} respostas</small></h2><div class="nps-barra"><span style="width:${n[0] / t * 100}%;background:#4f8a73">${n[0]}</span><span style="width:${n[1] / t * 100}%;background:#a5b6c0">${n[1]}</span><span style="width:${n[2] / t * 100}%;background:#b5545c">${n[2]}</span></div><div class="legenda"><span style="--c:#4f8a73">indicam (9-10)</span><span style="--c:#a5b6c0">neutros (7-8)</span><span style="--c:#b5545c">críticos (0-6)</span></div></section>
      <section class="bloco c7"><h2>Clientes críticos para ligar</h2><ul class="alertas">${db.detratores.filter(daUn).map((d) => `<li style="--c:${d.ligou ? '#4f8a73' : '#b5545c'}"><div><p><b>${e(d.nome)}</b> · nota ${d.nota} · ${UNIDADES[d.un]}</p><small>${e(d.motivo)}</small></div>${d.ligou ? '<span class="sinal ok">resolvido</span>' : `<button class="bt pq" data-a="ligou" data-id="${d.id}">Liguei e resolvi</button>`}</li>`).join('') || '<li><p>Ninguém para ligar.</p></li>'}</ul></section>
      <section class="bloco c6"><h2>Recall das montadoras</h2><table><tbody>${db.recalls.map((r) => `<tr><td>${e(r.titulo)}<br><small class="rot">${r.clientes} clientes da sua base têm esse carro</small></td><td>${r.avisados >= r.clientes ? '<span class="sinal ok">todos avisados</span>' : `<button class="bt pq lav" data-a="recall" data-id="${r.id}">Avisar ${r.clientes - r.avisados}</button>`}</td></tr>`).join('')}</tbody></table><p class="rot">Recall traz o carro de volta para a oficina: aproveite para oferecer a revisão.</p></section>
      <section class="bloco c6"><h2>Revisão por quilometragem</h2><p>Pela média de km/dia de cada cliente, <b>146 carros</b> passam da próxima revisão nos próximos 30 dias.</p><button class="bt forte" data-a="revisao">Mandar convites de revisão</button></section></div>`;
  },
  frotas() {
    return `<div class="titulo"><div><h1>Frotas e contratos</h1><p>Empresas com contrato de manutenção preventiva, prazo de atendimento (SLA) e fatura única por mês.</p></div><div class="acoes"><button class="bt forte" data-a="nova-frota">+ Contrato</button></div></div>
      <div class="malha">${db.frotas.map((f) => `<section class="bloco c4"><h2>${e(f.empresa)}</h2><p class="rot" style="margin:0 0 8px">${f.veiculos} veículos · ${e(f.plano)} · SLA ${f.sla} h · ${R$(f.mensal)}/mês</p><p class="rot" style="margin:0 0 4px">Preventivas no prazo: ${pct(f.cumprido)}</p><div class="trilha"><i style="width:${f.cumprido * 100}%"></i><b style="left:95%"></b></div>
        <table style="margin-top:10px"><tbody>${f.proximas.map((p, ix) => `<tr><td><b>${e(p[0])}</b> ${e(p[1])}</td><td><span class="sinal ${p[2].includes('vencida') ? 'ru' : p[2].includes('2 dias') || p[2].includes('3 dias') ? 'at' : 'lv'}">${e(p[2])}</span></td><td>${p[2].includes('agendada') ? '' : `<button class="bt pq" data-a="agendar-frota" data-f="${f.id}" data-ix="${ix}">Agendar</button>`}</td></tr>`).join('')}</tbody></table>
        <div class="acoes" style="margin-top:10px"><button class="bt pq" data-a="fatura" data-f="${f.id}">Fechar fatura do mês</button></div></section>`).join('')}</div>`;
  },
  auditoria() {
    return `<div class="titulo"><div><h1>Auditoria</h1><p>Tudo que mexe em dinheiro, desconto, estoque ou tempo fica registrado: quem, quando e o quê.</p></div></div><section class="bloco"><div class="rolagem"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${db.auditoria.map((a) => `<tr><td class="d" style="text-align:left">${e(a.q)}</td><td>${e(a.quem)}</td><td>${e(a.o)}</td></tr>`).join('')}</tbody></table></div></section>`;
  },
  equipe() {
    const pr = db.plano === 'pro' ? 289 : 229;
    return `<div class="titulo"><div><h1>Equipe e dono</h1><p>Perfis por unidade: cada gerente vê só a dele; o dono vê a rede.</p></div></div>
      <div class="malha"><section class="bloco c7"><table><thead><tr><th>Perfil</th><th>Vê</th><th>Pode</th></tr></thead><tbody><tr><td><b>Dono</b></td><td>todas as unidades</td><td>tudo, inclusive DRE e auditoria</td></tr><tr><td><b>Gerente de unidade</b></td><td>a própria unidade</td><td>desconto até 10%, compras até R$ 5.000</td></tr><tr><td><b>Consultor técnico</b></td><td>OS, clientes, boxes</td><td>orçar e vender, sem desconto</td></tr><tr><td><b>Mecânico</b></td><td>as próprias OS</td><td>lançar tempo e fotos</td></tr><tr><td><b>Comprador</b></td><td>peças da rede</td><td>cotar e comprar</td></tr></tbody></table><p class="rot">${db.mec.length} mecânicos + 3 gerentes + 4 consultores em 3 unidades.</p></section>
      <section class="bloco c5"><h2>Plano</h2><p>Assinatura · <b>${R$(pr)}/mês</b> por unidade</p><div class="acoes"><button class="bt ${db.plano === 'basico' ? 'forte' : ''}" data-a="plano" data-v="basico">Assinatura · R$ 229/mês</button></div><p class="rot">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() {
    return `<div class="titulo"><div><h1>Ajustes</h1></div></div><section class="bloco" style="max-width:620px"><label class="campo">Nome da rede<input data-cfg="rede" value="${e(db.rede)}"></label><div class="par"><label class="campo">Meta de eficiência (%)<input data-cfg="efic" type="number" value="${Math.round(db.meta.efic * 100)}"></label><label class="campo">Meta de ticket (R$)<input data-cfg="ticket" type="number" value="${db.meta.ticket}"></label></div><h2 style="margin-top:18px">Unidades</h2><ul class="alertas">${Object.entries(UNIDADES).map(([k, n]) => `<li><div><p><b>${e(n)}</b></p></div><span style="display:flex;gap:6px"><button class="bt" data-a="edita-unidade" data-k="${k}">Renomear</button>${Object.keys(UNIDADES).length > 1 ? `<button class="bt" data-a="tira-unidade" data-k="${k}">Tirar</button>` : ''}</span></li>`).join('')}</ul><p><button class="bt forte" data-a="nova-unidade">+ Nova unidade</button></p><p class="rot">Integrações da versão contratada: NF-e e NFS-e por unidade, notas de entrada da SEFAZ, WhatsApp oficial, catálogo de peças por placa e tabela de tempos da montadora (algumas têm custo à parte).</p></section>`;
  },
};

function desenha() {
  const at = location.hash.slice(1) || 'painel', i = ind();
  q('#unidades').innerHTML = [['todas', 'Rede toda'], ...Object.entries(UNIDADES)].map(([k, n]) => `<button type="button" data-un="${k}" aria-pressed="${db.un === k}">${e(n)}</button>`).join('') + '<button type="button" data-a="nova-unidade" title="Cadastrar outra unidade">+ Unidade</button>';
  q('#instrumentos').innerHTML = MOSTRADORES.map(([k, t, f, s]) => { const [fr, txt] = f(i); return `<button type="button" class="mostrador" data-ir="${k}" ${at === k ? 'aria-current="page"' : ''}>${arco(fr, txt)}<small><b style="display:inline;font:600 .78rem Sora,sans-serif;margin:0">${t}</b><br>${e(typeof s === 'function' ? s(i) : s)}</small></button>`; }).join('')
    + `<div class="chaves"><button type="button" class="chave" data-ir="painel" ${at === 'painel' ? 'aria-current="page"' : ''}><i></i>Cabine</button>${CHAVES.map(([k, t, n]) => `<button type="button" class="chave" data-ir="${k}" ${at === k ? 'aria-current="page"' : ''}><i></i>${t}${n() ? `<span class="n-al">${n()}</span>` : ''}</button>`).join('')}</div>`;
  q('#area').innerHTML = (M[at] || M.painel)(i);
  q('#rede').textContent = db.rede;
  document.title = `${NOMES[at] || 'Cabine'} · Veltria Oficina Avançado`;
}
addEventListener('hashchange', () => { desenha(); q('#area').focus({ preventScroll: true }); });

// ------------------------------------------------------------------ console: comandos e IA
const NOMES = { frotas: 'Frotas', pecas: 'Peças', dre: 'Resultado (DRE)', boxes: 'Boxes', posvenda: 'Pós-venda', auditoria: 'Auditoria', equipe: 'Equipe e dono', ticket: 'Ticket médio', produtividade: 'Produtividade', ajustes: 'Ajustes', painel: 'Cabine' };
const ATALHOS = ['quem está abaixo da meta?', 'onde estou perdendo dinheiro?', 'qual unidade vai pior?', 'o que comprar esta semana?', 'frotas'];
const DESTINOS = [[/frota|contrato|sla/, 'frotas'], [/abc|peca|estoque|cotac|garantia/, 'pecas'], [/dre|resultado|lucro$/, 'dre'], [/box|elevador/, 'boxes'], [/nps|recall|pos.?venda|satisf/, 'posvenda'], [/auditor|log/, 'auditoria'], [/equipe|plano|acesso/, 'equipe'], [/ticket/, 'ticket'], [/produtiv|eficien/, 'produtividade'], [/ajust|config/, 'ajustes'], [/cabine|painel|inicio/, 'painel']];
function responde(p) {
  const x = sa(p), i = ind();
  if (/abaixo|meta|lento|pior mecanic/.test(x)) { const l = db.mec.filter((m) => m.vend / m.trab < db.meta.efic); return `Abaixo da meta de ${pct(db.meta.efic)}:\n${l.map((m) => `• ${m.nome} (${UNIDADES[m.un]}): ${pct(m.vend / m.trab)}, ${m.trab - m.vend} h trabalhadas sem cobrar`).join('\n')}\n\nCada hora não cobrada é cerca de R$ 180 a menos.`; }
  if (/perd|dinheiro|vazamento/.test(x)) { const parados = db.carros.filter((c) => c.estado === 'parado'); return `Três vazamentos este mês:\n• ${soma(db.mec, (m) => Math.max(0, m.trab - m.vend))} h trabalhadas e não cobradas (≈ ${R$(soma(db.mec, (m) => Math.max(0, m.trab - m.vend)) * 180)}).\n• ${parados.length} boxes parados esperando peça (${parados.map((c) => `${c.modelo} em ${UNIDADES[c.un]}`).join(', ')}).\n• ${R$(soma(db.garantias.filter((g) => g.status === 'a enviar'), (g) => g.valor))} em garantia de fabricante ainda não pedida.`; }
  if (/unidade|pior|melhor/.test(x)) { const l = Object.keys(UNIDADES).map((k) => { const d = db.dre[k], r = d.mo + d.pecas; return [k, (r - d.cmv - d.comissoes - d.fixas) / (r || 1)]; }).sort((a, b) => a[1] - b[1]); return `Pior margem: ${UNIDADES[l[0][0]]} (${pct(l[0][1])}). Melhor: ${UNIDADES[l[l.length - 1][0]]} (${pct(l[l.length - 1][1])}).\nEm Betim o NPS está baixo e um box está parado há mais de um dia: comece por aí.`; }
  if (/compr|semana|repor/.test(x)) return `Itens A com menos de 20 dias de estoque:\n${db.pecas.filter((p) => p.estoque / (p.vendas / 365) < 20).map((p) => `• ${p.nome} (${p.cod}): ${p.estoque} un.`).join('\n') || '• nenhum'}\nUse "Cotar reposição da classe A" em Peças.`;
  return `Faturamento de ${nomeUn()}: ${R$(i.receita)}, resultado ${R$(i.resultado)}, eficiência ${pct(i.efic)}, NPS ${i.nps}. Pergunte algo mais específico ou digite o nome de um módulo.`;
}
function console_(p) {
  const x = sa(p).trim(), destino = DESTINOS.find(([r]) => r.test(x) && x.split(' ').length <= 3);
  db.conversa.push({ eu: 1, t: p });
  if (destino) { location.hash = `#${destino[1]}`; db.conversa.push({ t: `Abrindo ${NOMES[destino[1]]}.` }); } else if (window.veltriaIA) { const resp = { t: 'Pensando…' }; db.conversa.push(resp); window.veltriaIA(p).then((t) => { resp.t = t; guarda(); mostraSaida(); }); } else db.conversa.push({ t: `${responde(p)}\n\n(Resposta de exemplo da demonstração.)` });
  db.conversa = db.conversa.slice(-12); guarda(); mostraSaida();
}
function mostraSaida() {
  const s = q('#saida'); s.hidden = false;
  s.innerHTML = `<button type="button" class="fecha" data-fecha-saida aria-label="Fechar">×</button><div class="atalhos">${ATALHOS.map((a) => `<button type="button" data-atalho="${e(a)}">${e(a)}</button>`).join('')}</div>${(db.conversa.length ? db.conversa : [{ t: 'Copiloto da rede. Leio produtividade, boxes, DRE, peças, frotas e pós-venda das 3 unidades. Na versão contratada, 20 perguntas grátis por dia.' }]).map((m) => `<p class="linha ${m.eu ? 'eu' : ''}">${m.eu ? '› ' : ''}${e(m.t)}</p>`).join('')}`;
  s.scrollTop = 1e6;
}

function formUnidade(k) {
  janela(`<h2>${k ? 'Renomear unidade' : 'Nova unidade'}</h2><form><label class="campo">Nome da unidade<input name="n" required value="${k ? e(UNIDADES[k]) : ''}" placeholder="Ex.: Contagem"></label><div class="fim"><button type="button" class="bt" data-fecha>Cancelar</button><button class="bt forte">${k ? 'Salvar' : 'Cadastrar'}</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault(); const nome = String(new FormData(ev.target).get('n')).trim();
    const chave = k || nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 12) + Date.now().toString(36).slice(-3);
    db.unidades = { ...UNIDADES, [chave]: nome }; lerUnidades(); registra(k ? `renomeou a unidade para ${nome}` : `cadastrou a unidade ${nome}`); guarda(); fecha(); desenha();
  }));
}
const A = {
  meta: () => janela(`<h2>Metas</h2><form><div class="par"><label class="campo">Eficiência (%)<input name="ef" type="number" value="${Math.round(db.meta.efic * 100)}"></label><label class="campo">Ticket médio (R$)<input name="tk" type="number" value="${db.meta.ticket}"></label></div><div class="fim"><button type="button" class="bt" data-fecha>Cancelar</button><button class="bt forte">Salvar</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); const f = new FormData(ev.target); db.meta.efic = Number(f.get('ef')) / 100 || 0.95; db.meta.ticket = Number(f.get('tk')) || 820; registra(`mudou as metas para ${pct(db.meta.efic)} e ${R$(db.meta.ticket)}`); guarda(); fecha(); desenha(); })),
  liberar: (d) => { const c = db.carros.find((x) => x.un === d.k && x.box === Number(d.i)); c.box = -1; db.carros = db.carros.filter((x) => x.box >= 0); registra(`tirou ${c.modelo} do box e mandou para o pátio de espera`); guarda(); desenha(); aviso('Carro foi para o pátio de espera. Box livre para outro serviço.'); },
  ocupar: (d) => { db.carros.push({ un: d.k, box: Number(d.i), placa: 'NOV' + Math.floor(1000 + Math.random() * 8999), modelo: 'Carro da fila', mec: db.mec.find((m) => m.un === d.k).nome, estado: 'ocupado', h: 0 }); guarda(); desenha(); },
  exportar: () => aviso('Arquivo do mês gerado (demonstração). Na versão contratada vai por e-mail para o contador.'),
  cotar: () => janela('<h2>Cotação enviada</h2><p>Pedido de preço dos 14 itens da classe A enviado para 3 fornecedores pelo WhatsApp. As respostas aparecem lado a lado em Peças, com prazo e forma de pagamento.</p><div class="fim"><button class="bt forte" data-fecha>Certo</button></div>'),
  garantia: (d) => { const g = db.garantias.find((x) => x.id === d.id); g.status = 'enviada'; g.dias = 1; registra(`enviou garantia de ${g.peca} para a ${g.fab}`); guarda(); desenha(); aviso(`Laudo com fotos e nota de compra enviado para a ${g.fab}.`); },
  ligou: (d) => { const x = db.detratores.find((y) => y.id === d.id); x.ligou = true; registra(`resolveu a reclamação de ${x.nome}`); guarda(); desenha(); },
  recall: (d) => { const r = db.recalls.find((y) => y.id === d.id); const n = r.clientes - r.avisados; r.avisados = r.clientes; registra(`avisou ${n} clientes do recall ${r.titulo}`); guarda(); desenha(); aviso(`${n} mensagens de recall prontas para sair pelo WhatsApp da unidade de cada cliente.`); },
  revisao: () => { registra('mandou 146 convites de revisão por km'); guarda(); aviso('146 convites de revisão programados: saem aos poucos, de manhã, pelo WhatsApp de cada unidade.'); },
  'agendar-frota': (d) => { const f = db.frotas.find((x) => x.id === d.f), p = f.proximas[Number(d.ix)]; p[2] = 'agendada amanhã 8h'; registra(`agendou preventiva do ${p[1]} ${p[0]} (${f.empresa})`); guarda(); desenha(); aviso(`Preventiva agendada e confirmação enviada ao gestor da ${f.empresa}.`); },
  fatura: (d) => { const f = db.frotas.find((x) => x.id === d.f); registra(`fechou a fatura mensal da ${f.empresa}`); guarda(); aviso(`Fatura de ${R$(f.mensal)} da ${f.empresa} gerada com boleto e notas de todas as OS do mês (demonstração).`); },
  'nova-unidade': () => formUnidade(),
  'edita-unidade': (d) => formUnidade(d.k),
  'tira-unidade': (d) => { const n = UNIDADES[d.k]; if (!n || !confirm(`Tirar a unidade ${n}? O que já foi lançado nela continua guardado.`)) return; db.unidades = { ...UNIDADES }; delete db.unidades[d.k]; lerUnidades(); registra(`tirou a unidade ${n}`); guarda(); desenha(); },
  'nova-frota': () => janela('<h2>Novo contrato de frota</h2><form><label class="campo">Empresa<input name="e" required></label><div class="par"><label class="campo">Veículos<input name="v" type="number" value="5"></label><label class="campo">SLA (horas)<input name="s" type="number" value="48"></label></div><div class="par"><label class="campo">Preventiva<input name="p" value="a cada 10.000 km"></label><label class="campo">Valor mensal (R$)<input name="m" type="number" value="3000"></label></div><div class="fim"><button type="button" class="bt" data-fecha>Cancelar</button><button class="bt forte">Criar contrato</button></div></form>', (j, fecha) => j.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); const f = new FormData(ev.target); db.frotas.push({ id: `f${Date.now()}`, empresa: f.get('e'), veiculos: Number(f.get('v')), plano: f.get('p'), sla: Number(f.get('s')), mensal: Number(f.get('m')), proximas: [], cumprido: 1 }); registra(`criou contrato com ${f.get('e')}`); guarda(); fecha(); desenha(); })),
  plano: (d) => { db.plano = d.v; registra(`mudou o plano para ${d.v === 'pro' ? 'Pro' : 'Básico'}`); guarda(); desenha(); },
};

document.addEventListener('click', (ev) => {
  const t = ev.target;
  const u = t.closest('[data-un]'); if (u) { db.un = u.dataset.un; guarda(); desenha(); return; }
  const ir = t.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const at = t.closest('[data-atalho]'); if (at) { console_(at.dataset.atalho); return; }
  if (t.closest('[data-fecha-saida]')) { q('#saida').hidden = true; return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
q('#f-console').addEventListener('submit', (ev) => { ev.preventDefault(); const v = q('#cmd').value.trim(); if (v.length < 2) return mostraSaida(); q('#cmd').value = ''; console_(v); });
q('#cmd').addEventListener('focus', () => { if (q('#saida').hidden) mostraSaida(); });
document.addEventListener('keydown', (ev) => {
  if (ev.key === '/' && !ev.target.closest?.('input, select, textarea')) { ev.preventDefault(); q('#cmd').focus(); }
  if (ev.key === 'Escape' && ev.target.id === 'cmd') { q('#saida').hidden = true; ev.target.blur(); }
});
document.addEventListener('change', (ev) => {
  const c = ev.target.dataset.cfg; if (!c) return;
  if (c === 'rede') db.rede = ev.target.value; else if (c === 'efic') db.meta.efic = Number(ev.target.value) / 100; else db.meta.ticket = Number(ev.target.value);
  registra(`mudou o ajuste "${c}"`); guarda(); desenha(); aviso('Ajuste salvo.');
});
q('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = fabrica(); location.hash = '#painel'; q('#saida').hidden = true; desenha(); aviso('Demonstração recomeçada.'); });
desenha();

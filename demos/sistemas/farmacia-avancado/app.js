// Veltria Farmácia Avançado · protótipo "mapa da rede" para rede de farmácias com centro de distribuição.
// Mapa esquemático das lojas com as transferências sugeridas (o que está parado numa e falta na outra), compra
// central com cotação entre distribuidoras, preços contra a concorrência, verba da indústria, perdas, controlados
// por loja, metas, auditoria, equipe e ajustes. Árvore de navegação à esquerda com pergunta à IA (?novo recomeça).

const CHAVE = 'veltria-farmacia-avancado-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const R2 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const pc = (v) => `${Math.round(v * 100)}%`;
const $ = (s) => document.querySelector(s);
const quando = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const LOJAS = { cd: { nome: 'Centro de distribuição', x: 380, y: 200, cd: true }, cen: { nome: 'Loja Centro', x: 150, y: 90 }, sav: { nome: 'Loja Savassi', x: 610, y: 80 }, con: { nome: 'Loja Contagem', x: 130, y: 320 }, bet: { nome: 'Loja Betim', x: 620, y: 320 } };
function criar() {
  const lojas = { cen: { fat: 48200, meta: 52000, ticket: 61, generico: 0.38, perf: 0.17, ruptura: 6, vencendo: 14, perdas: 1840 }, sav: { fat: 61900, meta: 58000, ticket: 88, generico: 0.27, perf: 0.29, ruptura: 3, vencendo: 6, perdas: 920 }, con: { fat: 39400, meta: 45000, ticket: 49, generico: 0.46, perf: 0.11, ruptura: 11, vencendo: 22, perdas: 3260 }, bet: { fat: 35100, meta: 38000, ticket: 52, generico: 0.44, perf: 0.12, ruptura: 8, vencendo: 9, perdas: 1410 } };
  const transf = [['Protetor solar FPS 50', 'sav', 'cen', 18, 'parado há 94 dias na Savassi; vende 6/semana no Centro', 1078], ['Insulina glargina', 'cd', 'con', 6, 'ruptura em Contagem há 2 dias', 1290], ['Fralda geriátrica G', 'bet', 'con', 24, 'Betim com 5 meses de estoque; Contagem zerada', 1030], ['Vitamina D 50.000 UI', 'cen', 'sav', 30, 'vence em 70 dias no Centro; Savassi vende o triplo', 1170], ['Losartana 50 mg', 'cd', 'bet', 60, 'abaixo do mínimo em Betim', 590]].map(([prod, de, para, qtd, motivo, valor]) => ({ id: uid(), prod, de, para, qtd, motivo, valor, st: 'sugerida' }));
  const compra = [['Dipirona 1 g 10 comp.', 1200, [2.18, 2.11, 2.24]], ['Losartana 50 mg 30 comp.', 900, [4.05, 4.21, 3.98]], ['Amoxicilina 500 mg', 400, [7.4, 7.15, 7.32]], ['Omeprazol 20 mg 28 cáps.', 600, [5.2, 5.35, 4.96]], ['Fralda geriátrica G', 300, [27.9, 28.4, 26.8]], ['Protetor solar FPS 50', 120, [41.0, 39.5, 40.2]]].map(([prod, qtd, precos]) => ({ prod, qtd, precos }));
  const precos = [['Dipirona 1 g 10 comp.', 6.9, [7.49, 6.99, 7.2], 2.2], ['Losartana 50 mg 30 comp.', 9.8, [11.9, 9.49, 10.5], 4.1], ['Protetor solar FPS 50', 59.9, [64.9, 57.9, 61.0], 40.2], ['Vitamina C 1 g efervesc.', 29.9, [27.9, 26.5, 31.0], 14.0], ['Fralda geriátrica G', 42.9, [45.9, 44.0, 41.5], 27.0]].map(([prod, nosso, conc, custo]) => ({ id: uid(), prod, nosso, conc, custo }));
  const campanhas = [{ id: 'k1', ind: 'Laboratório Medley', prod: 'Linha de genéricos de uso contínuo', meta: 4000, vendido: 3120, verba: 0.06, fim: 9 }, { id: 'k2', ind: 'Nivea Sun', prod: 'Protetores solares', meta: 600, vendido: 248, verba: 0.08, fim: 9 }, { id: 'k3', ind: 'Bayer', prod: 'Analgésicos isentos de prescrição', meta: 2500, vendido: 2580, verba: 0.05, fim: 9 }];
  const perdas = [['con', 'Vencidos', 2140], ['con', 'Avaria no recebimento', 760], ['con', 'Furto (diferença de inventário)', 360], ['cen', 'Vencidos', 1320], ['cen', 'Avaria', 520], ['bet', 'Vencidos', 1110], ['bet', 'Furto (diferença de inventário)', 300], ['sav', 'Vencidos', 640], ['sav', 'Avaria', 280]].map(([loja, causa, valor]) => ({ loja, causa, valor }));
  const controlados = { cen: { pend: 0, div: 0 }, sav: { pend: 2, div: 0 }, con: { pend: 5, div: 2 }, bet: { pend: 0, div: 0 } };
  return { rede: 'Rede FarmaJá', loja: 'todas', lojas, transf, compra, precos, campanhas, perdas, controlados, regraPreco: 3, audit: [[quando(), 'Gerente Contagem', 'ajustou estoque de Rivotril 2 mg (−2) sem justificativa'], [quando(), 'Sistema', 'importou 18 notas de entrada do CD']].map(([q, quem, o]) => ({ q, quem, o })), plano: 'basico', resp: null };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || criar(); } catch { return criar(); } })();
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { sinal('Sem espaço no navegador.'); } };
const anota = (o) => { db.audit.unshift({ q: quando(), quem: 'Você (diretoria)', o }); db.audit = db.audit.slice(0, 50); };
const daLoja = (k) => db.loja === 'todas' || k === db.loja;
const nomeL = (k) => LOJAS[k]?.nome || k;
const DIST = ['Santa Cruz', 'Profarma', 'Panpharma'], CONC = ['Drogasil', 'Pague Menos', 'Araujo'];

function sinal(t) { const a = document.createElement('div'); a.textContent = t; $('#sinais').append(a); setTimeout(() => a.remove(), 3400); }

// ------------------------------------------------------------------ módulos
const MODS = [['mapa', 'Mapa da rede'], ['transferencias', 'Transferências'], ['compra', 'Compra central'], ['precos', 'Preços'], ['campanhas', 'Verba da indústria'], ['perdas', 'Perdas'], ['controlados', 'Controlados'], ['metas', 'Metas'], ['auditoria', 'Auditoria'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const M = {
  mapa() {
    const ls = Object.entries(db.lojas), fat = ls.filter(([k]) => daLoja(k)).reduce((s, [, l]) => s + l.fat, 0), sug = db.transf.filter((t) => t.st === 'sugerida');
    const no = (k) => { const p = LOJAS[k], l = db.lojas[k], sel = db.loja === k; return `<g class="no" data-loja-mapa="${k}" tabindex="0" role="button" aria-label="${p.nome}"><rect x="${p.x - 95}" y="${p.y - 40}" width="190" height="80" rx="10" fill="${p.cd ? '#1e2633' : '#fbf9f5'}" stroke="${sel ? '#d9a441' : p.cd ? '#1e2633' : '#c8cdd3'}" stroke-width="${sel ? 3 : 1.5}"/><text x="${p.x}" y="${p.y - 16}" text-anchor="middle" font-weight="700" font-size="15" fill="${p.cd ? '#f2eee6' : '#1d2430'}">${p.nome}</text>${p.cd ? `<text x="${p.x}" y="${p.y + 8}" text-anchor="middle" font-size="12" fill="#c8cdd3">abastece as 4 lojas</text><text x="${p.x}" y="${p.y + 26}" text-anchor="middle" font-size="12" fill="#d9a441">${db.transf.filter((t) => t.de === 'cd' && t.st !== 'feita').length} saídas sugeridas</text>` : `<text x="${p.x}" y="${p.y + 6}" text-anchor="middle" font-size="13" fill="#535d6b" font-family="DM Mono">${R$(l.fat)} · ${pc(l.fat / l.meta)}</text><text x="${p.x}" y="${p.y + 26}" text-anchor="middle" font-size="12" fill="${l.ruptura > 7 ? '#b24a3f' : '#535d6b'}">${l.ruptura} em falta · ${l.vencendo} vencendo</text>`}</g>`; };
    const seta = (t) => { const a = LOJAS[t.de], b = LOJAS[t.para], lado = t.de < t.para ? -1 : 1, mx = (a.x + b.x) / 2 + (a.y === b.y ? 0 : lado * 40), my = (a.y + b.y) / 2 + lado * 45; const enc = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); const k = Math.min(108 / Math.abs(dx || 1e-6), 54 / Math.abs(dy || 1e-6)); return [p.x + dx * Math.min(k, 1), p.y + dy * Math.min(k, 1)]; }; const [x1, y1] = enc(a, { x: mx, y: my }), [x2, y2] = enc(b, { x: mx, y: my }); return `<path class="seta" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"><title>${x(t.prod)}: ${t.qtd} un. de ${nomeL(t.de)} para ${nomeL(t.para)}</title></path>`; };
    return `<div class="topo-m"><div><h1>Mapa da rede</h1><p>As setas são transferências sugeridas: produto parado numa loja e em falta na outra. Clique numa loja para filtrar tudo por ela.</p></div><div class="bts"><a class="bt a" href="#transferencias">Ver ${sug.length} transferências</a></div></div>
      <div class="grade" style="margin-bottom:14px"><div class="cx l3 nm"><small>Faturamento do mês</small><b>${R$(fat)}</b><span>${db.loja === 'todas' ? 'rede' : nomeL(db.loja)}</span></div><div class="cx l3 nm"><small>Itens em falta</small><b class="mau">${ls.filter(([k]) => daLoja(k)).reduce((s, [, l]) => s + l.ruptura, 0)}</b><span>ruptura de gôndola</span></div><div class="cx l3 nm"><small>Vencendo em 90 dias</small><b>${ls.filter(([k]) => daLoja(k)).reduce((s, [, l]) => s + l.vencendo, 0)}</b><span>lotes</span></div><div class="cx l3 nm"><small>Transferir libera</small><b class="bom">${R$(sug.reduce((s, t) => s + t.valor, 0))}</b><span>em estoque parado</span></div></div>
      <section class="cx mapa"><svg viewBox="0 0 760 400" role="img" aria-label="Mapa esquemático das lojas e do centro de distribuição"><defs><marker id="ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d9a441"/></marker></defs>${sug.map(seta).join('')}${Object.keys(LOJAS).map(no).join('')}</svg></section>`;
  },
  transferencias() {
    const l = db.transf.filter((t) => daLoja(t.de) || daLoja(t.para));
    return `<div class="topo-m"><div><h1>Transferências</h1><p>Antes de comprar, mova o que já está dentro de casa. Aprovada, vira romaneio para o motorista do CD.</p></div><button class="bt t" data-a="aprovar-todas" ${l.some((t) => t.st === 'sugerida') ? '' : 'disabled'}>Aprovar todas</button></div>
      <section class="cx rolo"><table><thead><tr><th>Produto</th><th>De</th><th>Para</th><th class="dir">Qtd</th><th>Por quê</th><th class="dir">Valor</th><th></th></tr></thead><tbody>${l.map((t) => `<tr><td><b>${x(t.prod)}</b></td><td>${nomeL(t.de)}</td><td>${nomeL(t.para)}</td><td class="dir">${t.qtd}</td><td>${x(t.motivo)}</td><td class="dir">${R$(t.valor)}</td><td>${t.st === 'sugerida' ? `<div class="bts"><button class="bt x a" data-transf="${t.id}" data-v="aprovada">Aprovar</button><button class="bt x" data-transf="${t.id}" data-v="ignorada">Ignorar</button></div>` : t.st === 'aprovada' ? `<button class="bt x" data-transf="${t.id}" data-v="feita">Chegou</button>` : `<span class="etq ${t.st === 'feita' ? 'ok' : ''}">${t.st}</span>`}</td></tr>`).join('')}</tbody></table></section>`;
  },
  compra() {
    const tot = db.compra.reduce((s, c) => s + c.qtd * Math.min(...c.precos), 0), porD = DIST.map((d, i) => db.compra.filter((c) => c.precos.indexOf(Math.min(...c.precos)) === i).reduce((s, c) => s + c.qtd * c.precos[i], 0));
    return `<div class="topo-m"><div><h1>Compra central</h1><p>As quatro lojas pedem ao CD; o CD compra junto, mais barato. Cada item vai para a distribuidora com o menor preço (em destaque).</p></div><button class="bt t" data-a="pedidos">Gerar pedidos</button></div>
      <div class="grade"><section class="cx l8 rolo"><table><thead><tr><th>Produto</th><th class="dir">Qtd</th>${DIST.map((d) => `<th class="dir">${d}</th>`).join('')}</tr></thead><tbody>${db.compra.map((c) => { const mn = Math.min(...c.precos); return `<tr><td>${x(c.prod)}</td><td class="dir">${c.qtd}</td>${c.precos.map((p) => `<td class="dir ${p === mn ? 'melhor' : ''}">${R2(p)}</td>`).join('')}</tr>`; }).join('')}</tbody></table></section>
      <section class="cx l4"><h2>Resumo</h2><table><tbody>${DIST.map((d, i) => `<tr><td>${d}</td><td class="dir">${R$(porD[i])}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="dir"><b>${R$(tot)}</b></td></tr></tbody></table><p style="color:var(--tx-3);font-size:.86rem">Comprando sempre na mesma distribuidora você pagaria ${R$(Math.min(...DIST.map((_, i) => db.compra.reduce((s, c) => s + c.qtd * c.precos[i], 0))) - tot)} a mais.</p></section></div>`;
  },
  precos() {
    return `<div class="topo-m"><div><h1>Preços contra a concorrência</h1><p>Pesquisa de preço da semana nas três redes do bairro. A regra não deixa vender abaixo do custo mais ${db.regraPreco}%.</p></div><label class="cp" style="margin:0">Margem mínima (%)<input type="number" data-regra value="${db.regraPreco}" style="width:90px"></label></div>
      <section class="cx rolo"><table><thead><tr><th>Produto</th><th class="dir">Nosso</th>${CONC.map((c) => `<th class="dir">${c}</th>`).join('')}<th>Posição</th><th></th></tr></thead><tbody>${db.precos.map((p) => { const mn = Math.min(...p.conc), alvo = Math.max(+(mn - 0.1).toFixed(2), +(p.custo * (1 + db.regraPreco / 100)).toFixed(2)); return `<tr><td><b>${x(p.prod)}</b><br><small style="color:var(--tx-3)">custo ${R2(p.custo)}</small></td><td class="dir"><b>${R2(p.nosso)}</b></td>${p.conc.map((c) => `<td class="dir ${c < p.nosso ? 'mau' : ''}">${R2(c)}</td>`).join('')}<td>${p.nosso <= mn ? '<span class="etq ok">mais barato</span>' : `<span class="etq at">${R2(p.nosso - mn)} acima</span>`}</td><td>${p.nosso > mn ? `<button class="bt x a" data-preco="${p.id}" data-v="${alvo}">Ir para ${R2(alvo)}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></section>`;
  },
  campanhas() {
    return `<div class="topo-m"><div><h1>Verba da indústria</h1><p>O laboratório paga uma porcentagem se a rede bater a meta de unidades até o fim do mês. Faltam ${db.campanhas[0].fim} dias.</p></div></div>
      <div class="grade">${db.campanhas.map((c) => { const r = c.vendido / c.meta, ganho = c.vendido * 12 * c.verba; return `<section class="cx l4"><h2>${x(c.ind)} <small>· ${x(c.prod)}</small></h2><p class="nm" style="margin:0"><b>${c.vendido.toLocaleString('pt-BR')} / ${c.meta.toLocaleString('pt-BR')}</b></p><div class="barra"><i style="width:${Math.min(100, r * 100)}%;--c:${r >= 1 ? '#457a5c' : r >= 0.7 ? '#d9a441' : '#b24a3f'}"></i></div><p style="color:var(--tx-2);font-size:.86rem">${r >= 1 ? `Meta batida: verba de ${pc(c.verba)} ≈ ${R$(ganho)}.` : `Faltam ${(c.meta - c.vendido).toLocaleString('pt-BR')} un. (${Math.ceil((c.meta - c.vendido) / c.fim)} por dia). Verba em jogo ≈ ${R$(c.meta * 12 * c.verba)}.`}</p>${r < 1 ? `<button class="bt x a" data-campanha="${c.id}">Mandar às lojas: exposição e meta do dia</button>` : ''}</section>`; }).join('')}</div>`;
  },
  perdas() {
    const l = db.perdas.filter((p) => daLoja(p.loja)), tot = l.reduce((s, p) => s + p.valor, 0), porLoja = Object.keys(db.lojas).map((k) => ({ k, v: db.perdas.filter((p) => p.loja === k).reduce((s, p) => s + p.valor, 0), fat: db.lojas[k].fat })), mx = Math.max(...porLoja.map((p) => p.v / p.fat));
    return `<div class="topo-m"><div><h1>Perdas</h1><p>Vencidos, avarias e diferença de inventário. Acima de 3% do faturamento é sinal de problema na loja.</p></div></div>
      <div class="grade"><div class="cx l4 nm"><small>Perdas no mês</small><b class="mau">${R$(tot)}</b><span>${db.loja === 'todas' ? 'rede' : nomeL(db.loja)}</span></div>
      <section class="cx l8"><h2>Perda sobre o faturamento</h2><table><tbody>${porLoja.map((p) => `<tr><td>${nomeL(p.k)}</td><td style="width:50%"><div class="barra"><i style="width:${p.v / p.fat / mx * 100}%;--c:${p.v / p.fat > 0.03 ? '#b24a3f' : '#5e6b7a'}"></i><b style="left:${0.03 / mx * 100}%"></b></div></td><td class="dir">${(p.v / p.fat * 100).toFixed(1).replace('.', ',')}%</td></tr>`).join('')}</tbody></table></section>
      <section class="cx l12 rolo"><table><thead><tr><th>Loja</th><th>Causa</th><th class="dir">Valor</th></tr></thead><tbody>${l.sort((a, b) => b.valor - a.valor).map((p) => `<tr><td>${nomeL(p.loja)}</td><td>${x(p.causa)}</td><td class="dir">${R$(p.valor)}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  controlados() {
    return `<div class="topo-m"><div><h1>Controlados por loja</h1><p>Movimentos ainda não enviados ao SNGPC e diferenças entre o livro e a prateleira. O farmacêutico de cada loja responde pela dele.</p></div></div>
      <section class="cx rolo"><table><thead><tr><th>Loja</th><th class="dir">Pendentes no SNGPC</th><th class="dir">Divergências</th><th>Situação</th><th></th></tr></thead><tbody>${Object.entries(db.controlados).filter(([k]) => daLoja(k)).map(([k, c]) => `<tr><td><b>${nomeL(k)}</b></td><td class="dir">${c.pend}</td><td class="dir">${c.div}</td><td>${c.div ? '<span class="etq mau">investigar</span>' : c.pend ? '<span class="etq at">enviar</span>' : '<span class="etq ok">em dia</span>'}</td><td>${c.pend || c.div ? `<button class="bt x" data-cobrar="${k}">Cobrar o farmacêutico</button>` : ''}</td></tr>`).join('')}</tbody></table></section>`;
  },
  metas() {
    return `<div class="topo-m"><div><h1>Metas por loja</h1><p>Faturamento, ticket médio e mix: genérico dá margem maior; perfumaria puxa o ticket.</p></div></div><section class="cx rolo"><table><thead><tr><th>Loja</th><th class="dir">Meta</th><th class="dir">Feito</th><th style="width:22%">Andamento</th><th class="dir">Ticket</th><th class="dir">Genérico</th><th class="dir">Perfumaria</th></tr></thead><tbody>${Object.entries(db.lojas).filter(([k]) => daLoja(k)).map(([k, l]) => `<tr><td><b>${nomeL(k)}</b></td><td class="dir"><input data-meta="${k}" value="${l.meta}" style="width:90px;text-align:right" aria-label="Meta da ${nomeL(k)}"></td><td class="dir">${R$(l.fat)}</td><td><div class="barra"><i style="width:${Math.min(100, l.fat / l.meta * 100)}%;--c:${l.fat >= l.meta ? '#457a5c' : '#d9a441'}"></i></div></td><td class="dir">${R2(l.ticket)}</td><td class="dir">${pc(l.generico)}</td><td class="dir">${pc(l.perf)}</td></tr>`).join('')}</tbody></table></section>`;
  },
  auditoria() { return `<div class="topo-m"><div><h1>Auditoria</h1><p>Ajustes de estoque, preços, transferências e controlados: quem, quando e o quê.</p></div></div><section class="cx rolo"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${db.audit.map((a) => `<tr><td class="mn">${x(a.q)}</td><td>${x(a.quem)}</td><td>${x(a.o)}</td></tr>`).join('')}</tbody></table></section>`; },
  equipe() {
    const pr = db.plano === 'pro' ? 359 : 299;
    return `<div class="topo-m"><div><h1>Equipe</h1><p>Painel do dono: cada loja tem gerente e farmacêutico responsável; o CD tem comprador e motorista.</p></div></div>
      <div class="grade"><section class="cx l7 rolo"><table><tbody><tr><td><b>Diretoria</b></td><td>a rede inteira, preços e compras</td></tr><tr><td><b>Gerente de loja</b></td><td>a própria loja: metas, perdas, transferências que chegam</td></tr><tr><td><b>Farmacêutico RT</b></td><td>controlados e SNGPC da loja</td></tr><tr><td><b>Comprador do CD</b></td><td>compra central e cotações</td></tr><tr><td><b>Motorista</b></td><td>romaneios no celular</td></tr></tbody></table></section>
      <section class="cx l5"><h2>Plano</h2><p>${db.plano === 'pro' ? 'Pro' : 'Básico'} · <b>${R$(pr)}/mês</b> por loja</p><div class="bts"><button class="bt ${db.plano === 'basico' ? 't' : ''}" data-a="plano" data-v="basico">Básico · R$ 299</button><button class="bt ${db.plano === 'pro' ? 't' : ''}" data-a="plano" data-v="pro">Pro · R$ 359</button></div><p style="color:var(--tx-3);font-size:.85rem">Básico: você + 5 pessoas por loja. Pro: sem limite. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() { return `<div class="topo-m"><div><h1>Ajustes</h1></div></div><section class="cx" style="max-width:640px"><label class="cp">Nome da rede<input data-aj="rede" value="${x(db.rede)}"></label><p style="color:var(--tx-3);font-size:.86rem">Na versão contratada: caixa e NFC-e em cada loja, SNGPC por CNPJ, Farmácia Popular, notas da SEFAZ, cotação automática com as distribuidoras e pesquisa de preço (algumas integrações têm custo à parte).</p></section>`; },
};

function monta() {
  const r = location.hash.slice(1) || 'mapa', n = { transferencias: db.transf.filter((t) => t.st === 'sugerida').length, controlados: Object.values(db.controlados).filter((c) => c.pend || c.div).length };
  $('#arvore').innerHTML = `<h3>REDE</h3><ul>${MODS.map(([k, t]) => `<li><a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a></li>`).join('')}</ul><h3>LOJAS</h3><ul>${[['todas', 'Todas'], ...Object.keys(db.lojas).map((k) => [k, nomeL(k).replace('Loja ', '')])].map(([k, t]) => `<li><button type="button" data-loja="${k}" aria-pressed="${db.loja === k}">${t}</button></li>`).join('')}</ul>`;
  $('#miolo').innerHTML = (db.resp ? `<div class="resp"><button type="button" data-fecha-r aria-label="Fechar">×</button><span class="q">${x(db.resp.q)}</span>${x(db.resp.r)}\n\n<small style="color:var(--tx-3)">Resposta de exemplo da demonstração. Na versão contratada, 20 perguntas grátis por dia.</small></div>` : '') + (M[r] || M.mapa)();
  $('#rede').textContent = db.rede;
  document.title = `${(MODS.find(([k]) => k === r) || MODS[0])[1]} · Veltria Farmácia Avançado`;
}
addEventListener('hashchange', () => { monta(); $('#miolo').focus({ preventScroll: true }); scrollTo(0, 0); });

function responde(q) {
  const t = sa(q);
  if (/transfer|mover|parad/.test(t)) { const l = db.transf.filter((y) => y.st === 'sugerida').sort((a, b) => b.valor - a.valor); return l.length ? `Comece por: ${l.slice(0, 3).map((y) => `${y.prod} (${y.qtd} un. de ${nomeL(y.de)} para ${nomeL(y.para)})`).join('; ')}. Libera ${R$(l.reduce((s, y) => s + y.valor, 0))} sem comprar nada.` : 'Nenhuma transferência pendente.'; }
  if (/perd|vencid|contagem/.test(t)) return 'Contagem perde 8,3% do faturamento, quase o triplo da Savassi. 66% são vencidos: o recebimento não confere validade e a loja não faz rodízio na gôndola. Sugestão: transferir para o Centro o que vence em 90 dias e treinar o recebimento.';
  if (/preco|concorr|caro/.test(t)) { const l = db.precos.filter((p) => p.nosso > Math.min(...p.conc)); return `${l.length} produtos acima do mais barato do bairro: ${l.map((p) => p.prod).join(', ')}. O protetor solar está R$ 2 acima da Pague Menos e é o item mais pesquisado de novembro.`; }
  if (/verba|campanh|industria/.test(t)) return 'Medley está a 880 unidades da meta (98 por dia em 9 dias): vale pôr os genéricos de uso contínuo na ponta de gôndola e oferecer no caixa. Nivea Sun dificilmente fecha.';
  if (/compr|distribuid/.test(t)) return `Dividindo a compra entre as três distribuidoras pelo menor preço, o pedido fecha em ${R$(db.compra.reduce((s, c) => s + c.qtd * Math.min(...c.precos), 0))}.`;
  return `A rede faturou ${R$(Object.values(db.lojas).reduce((s, l) => s + l.fat, 0))} no mês; a Savassi já bateu a meta.`;
}

const A = {
  'aprovar-todas': () => { const l = db.transf.filter((t) => t.st === 'sugerida' && (daLoja(t.de) || daLoja(t.para))); l.forEach((t) => { t.st = 'aprovada'; }); anota(`aprovou ${l.length} transferência(s)`); grava(); monta(); sinal(`${l.length} romaneios gerados para o motorista do CD.`); },
  pedidos: () => { anota('gerou os pedidos da compra central'); grava(); sinal('Três pedidos enviados às distribuidoras (demonstração). Entrega prevista em 24 h no CD.'); },
  plano: (d) => { db.plano = d.v; grava(); monta(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-fecha-r]')) { db.resp = null; grava(); monta(); return; }
  const lj = t.closest('[data-loja]'); if (lj) { db.loja = lj.dataset.loja; grava(); monta(); return; }
  const lm = t.closest('[data-loja-mapa]'); if (lm) { const k = lm.dataset.lojaMapa; db.loja = k === 'cd' || db.loja === k ? 'todas' : k; grava(); monta(); return; }
  const tr = t.closest('[data-transf]'); if (tr) { const y = db.transf.find((z) => z.id === tr.dataset.transf); y.st = tr.dataset.v; anota(`${y.st === 'aprovada' ? 'aprovou' : y.st === 'feita' ? 'confirmou a chegada de' : 'ignorou'} a transferência de ${y.prod} para ${nomeL(y.para)}`); grava(); monta(); if (y.st === 'aprovada') sinal('Romaneio gerado. A loja de destino é avisada.'); return; }
  const pr = t.closest('[data-preco]'); if (pr) { const p = db.precos.find((z) => z.id === pr.dataset.preco), ant = p.nosso; p.nosso = Number(pr.dataset.v); anota(`mudou o preço de ${p.prod} de ${R2(ant)} para ${R2(p.nosso)} nas 4 lojas`); grava(); monta(); sinal('Preço novo enviado aos caixas das lojas e às etiquetas.'); return; }
  const cp = t.closest('[data-campanha]'); if (cp) { const c = db.campanhas.find((z) => z.id === cp.dataset.campanha); anota(`mandou às lojas a ação da campanha ${c.ind}`); grava(); sinal(`Meta diária de ${c.ind} enviada aos gerentes, com a sugestão de exposição.`); return; }
  const cb = t.closest('[data-cobrar]'); if (cb) { anota(`cobrou o farmacêutico da ${nomeL(cb.dataset.cobrar)} sobre controlados`); grava(); sinal(`Aviso enviado ao farmacêutico da ${nomeL(cb.dataset.cobrar)}.`); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('keydown', (e) => { const lm = e.target.closest?.('[data-loja-mapa]'); if (lm && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); lm.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if ('regra' in d) { db.regraPreco = nv(t.value); grava(); monta(); }
  if (d.meta) { db.lojas[d.meta].meta = nv(t.value); anota(`mudou a meta da ${nomeL(d.meta)}`); grava(); monta(); }
  if (d.aj) { db[d.aj] = t.value; grava(); monta(); }
});
$('#f-q').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#q').value.trim(); if (q.length < 3) return; db.resp = { q, r: responde(q) }; $('#q').value = ''; grava(); monta(); scrollTo(0, 0); });
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = criar(); location.hash = '#mapa'; monta(); sinal('Demonstração recomeçada.'); });
monta();

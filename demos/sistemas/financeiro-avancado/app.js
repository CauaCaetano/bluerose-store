// Veltria Financeiro Avançado · protótipo "planilha viva" para grupo de empresas e escritório de BPO financeiro.
// Abas de planilha embaixo: caixa de 13 semanas com cenários, orçado x real, aprovações por alçada com remessa
// ao banco, conciliação por regras, fechamento do mês, indicadores, rateio entre empresas, consolidado,
// auditoria, equipe e ajustes. A barra de fórmula aceita comandos (=caixa) e perguntas. Dados de exemplo (?novo).

const CHAVE = 'veltria-financeiro-avancado-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const n0 = (v) => Math.round(Number(v || 0)).toLocaleString('pt-BR');
const hx = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const $ = (s) => document.querySelector(s);
const COL = (i) => String.fromCharCode(67 + i); // colunas de valores começam em C (A = nº, B = rótulo)
const agora = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const EMP = [{ k: 'dist', nome: 'Serra Distribuidora', f: 1 }, { k: 'log', nome: 'Serra Logística', f: 0.62 }, { k: 'loja', nome: 'Serra Lojas', f: 0.35 }];
const ENTRA = ['Clientes (a receber)', 'Contratos recorrentes', 'Outras entradas'], SAI = ['Fornecedores', 'Folha e encargos', 'Impostos', 'Financiamentos', 'Despesas gerais'];
const BASE13 = { 'Clientes (a receber)': [412, 388, 455, 401, 470, 392, 418, 446, 405, 431, 462, 398, 440], 'Contratos recorrentes': [96, 0, 0, 0, 96, 0, 0, 0, 96, 0, 0, 0, 96], 'Outras entradas': [8, 4, 12, 3, 6, 9, 2, 14, 5, 7, 3, 11, 4], Fornecedores: [298, 355, 310, 342, 301, 388, 296, 330, 315, 362, 305, 340, 318], 'Folha e encargos': [0, 0, 186, 0, 0, 0, 186, 0, 0, 0, 186, 0, 0], Impostos: [0, 64, 0, 0, 0, 68, 0, 0, 0, 66, 0, 0, 0], Financiamentos: [0, 0, 0, 42, 0, 0, 0, 42, 0, 0, 0, 42, 0], 'Despesas gerais': [38, 41, 36, 44, 39, 42, 37, 45, 40, 43, 38, 41, 39] };
const CATS = [['Receita de vendas', 4210, 4062, 'r'], ['Receita de serviços', 612, 655, 'r'], ['Custo das mercadorias', 2860, 2944, 'c'], ['Fretes', 214, 251, 'c'], ['Folha e encargos', 744, 738, 'c'], ['Aluguel e condomínio', 168, 168, 'c'], ['Marketing', 96, 131, 'c'], ['Tecnologia', 58, 64, 'c'], ['Despesas financeiras', 72, 88, 'c']];

function inicio() {
  const caixa = {}, orc = {};
  EMP.forEach((e) => { caixa[e.k] = { saldo: Math.round(520 * e.f) * 1000, linhas: Object.fromEntries(Object.entries(BASE13).map(([k, v]) => [k, v.map((x) => Math.round(x * e.f) * 1000)])) }; orc[e.k] = CATS.map(([c, o, r, t]) => ({ c, o: Math.round(o * e.f) * 1000, r: Math.round(r * e.f) * 1000, t })); });
  const pags = [['dist', 'Ambev Distribuição', 'Mercadoria · NF 88231', 148600, 2], ['dist', 'Locadora Trucks', 'Aluguel de 4 caminhões', 38200, 3], ['log', 'Ipiranga Frotas', 'Diesel · quinzena', 26400, 1], ['dist', 'Contabilidade Prisma', 'Honorários', 4800, 5], ['loja', 'Shopping Del Rey', 'Aluguel loja 112', 18900, 6], ['log', 'Pneus Rodão', '8 pneus 295/80', 21700, 4], ['loja', 'Agência Faro', 'Campanha Black Friday', 4200, 7], ['dist', 'Copasa', 'Água CD', 1890, 2]]
    .map(([emp, forn, desc, valor, venc]) => ({ id: uid(), emp, forn, desc, valor, venc, st: 'pendente', sel: false }));
  const extrato = [['PIX RECEB SUPERMERCADO BH LTDA', 18420], ['TARIFA MANUTENCAO CONTA', -89], ['PAG BOLETO AMBEV DISTRIB', -148600], ['TED RECEB REDE ECONOMICO', 52300], ['IOF OPERACAO CREDITO', -412], ['PIX RECEB MERCEARIA SAO JOSE', 3840], ['DEB AUTOMATICO CEMIG', -6210], ['PAG FOLHA LOTE 10', -186000], ['TARIFA PIX LOTE', -42], ['RENDIMENTO APLIC AUTOMATICA', 1960], ['PIX ENVIADO JOAO MARCOS', -2300], ['CARTAO VENDA REDE CREDITO', 41280]].map(([desc, valor]) => ({ desc, valor }));
  const regras = [['PIX RECEB', 'Recebimento de cliente'], ['TED RECEB', 'Recebimento de cliente'], ['TARIFA', 'Tarifas bancárias'], ['IOF', 'Despesas financeiras'], ['PAG BOLETO', 'Pagamento a fornecedor'], ['PAG FOLHA', 'Folha e encargos'], ['CEMIG', 'Energia']].map(([se, cat]) => ({ id: uid(), se, cat }));
  const fech = [['Conciliar as 3 contas bancárias', 'Paula', true], ['Conferir notas de entrada x pagamentos', 'Paula', true], ['Provisionar férias e 13º', 'Henrique', true], ['Apurar impostos (DAS / ICMS-ST)', 'Contabilidade Prisma', false], ['Ratear despesas compartilhadas', 'Henrique', false], ['Revisar orçado x real e justificar desvios', 'Marcos (diretor)', false], ['Enviar pacote ao contador', 'Paula', false]].map(([t, resp, ok]) => ({ id: uid(), t, resp, ok }));
  const rateio = [['Aluguel do CD', 62000, [70, 20, 10]], ['Tecnologia e ERP', 18400, [50, 25, 25]], ['Diretoria', 54000, [50, 30, 20]], ['Contabilidade e jurídico', 12600, [45, 35, 20]]].map(([d, v, p]) => ({ d, v, p }));
  return { emp: 'dist', cen: 'base', caixa, orc, pags, extrato, regras, fech, fechado: false, rateio, alcadas: { gerente: 20000, diretor: 80000 }, audit: [[agora(), 'Paula', 'importou extrato do Itaú (312 linhas)'], [agora(), 'Henrique', 'alterou orçado de Marketing de R$ 90.000 para R$ 96.000'], [agora(), 'Sistema', 'conciliou 287 linhas automaticamente por regra']].map(([q, quem, o]) => ({ q, quem, o })), plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || inicio(); } catch { return inicio(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const guarda = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { balao('Sem espaço no navegador.'); } };
const log = (o) => { db.audit.unshift({ q: agora(), quem: 'Você (dono)', o }); db.audit = db.audit.slice(0, 50); };
const empNome = (k) => (k === 'todas' ? 'Consolidado do grupo' : EMP.find((e) => e.k === k).nome);
const doEmp = (x) => db.emp === 'todas' || x.emp === db.emp;

function balao(t) { const a = document.createElement('div'); a.textContent = t; $('#balao').append(a); setTimeout(() => a.remove(), 3400); }
function janela(html, liga) {
  const v = document.createElement('div'); v.className = 'janela-v'; v.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fechar]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.janela'), fecha);
}

// ------------------------------------------------------------------ cálculos
const MULT = { base: 1, pess: 0.85, otim: 1.08 };
function caixa13(k) {
  const fontes = k === 'todas' ? EMP.map((e) => db.caixa[e.k]) : [db.caixa[k]], m = MULT[db.cen];
  const linhas = {}; [...ENTRA, ...SAI].forEach((r) => { linhas[r] = Array.from({ length: 13 }, (_, i) => fontes.reduce((s, f) => s + f.linhas[r][i], 0) * (ENTRA.includes(r) && r !== 'Contratos recorrentes' ? m : 1)); });
  let s = fontes.reduce((a, f) => a + f.saldo, 0); const ini = [], fim = [], ent = [], sai = [];
  for (let i = 0; i < 13; i++) { ini.push(s); ent.push(ENTRA.reduce((a, r) => a + linhas[r][i], 0)); sai.push(SAI.reduce((a, r) => a + linhas[r][i], 0)); s += ent[i] - sai[i]; fim.push(s); }
  return { linhas, ini, fim, ent, sai };
}
function orcado(k) { if (k !== 'todas') return db.orc[k]; return CATS.map(([c, , , t], i) => ({ c, t, o: EMP.reduce((s, e) => s + db.orc[e.k][i].o, 0), r: EMP.reduce((s, e) => s + db.orc[e.k][i].r, 0) })); }
const categoriza = (desc) => db.regras.find((r) => desc.includes(r.se.toUpperCase()))?.cat;
function cabecalho(nomes) { return `<thead><tr><th class="nl"></th><th class="rot" style="background:var(--linho)">B</th>${nomes.map((_, i) => `<th>${COL(i)}</th>`).join('')}</tr><tr class="nomes"><th class="nl">1</th><th class="rot" style="background:var(--linho);text-align:left"></th>${nomes.map((n) => `<th>${n}</th>`).join('')}</tr></thead>`; }
function spark(v, cor = '#75866a') { const mx = Math.max(...v), mn = Math.min(...v); return `<svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${cor}" stroke-width="2" points="${v.map((x, i) => `${i / (v.length - 1) * 100},${26 - (x - mn) / (mx - mn || 1) * 22}`).join(' ')}"/></svg>`; }

// ------------------------------------------------------------------ abas
const ABAS = [['caixa', 'Caixa 13 semanas'], ['orcado', 'Orçado x real'], ['aprovar', 'Aprovações'], ['conciliar', 'Conciliação'], ['fechar', 'Fechamento'], ['indic', 'Indicadores'], ['rateio', 'Rateio'], ['consol', 'Consolidado'], ['audit', 'Auditoria'], ['equipe', 'Equipe e alçadas'], ['ajustes', 'Ajustes']];
const F = {
  caixa() {
    const c = caixa13(db.emp), ed = db.emp !== 'todas', sem = Array.from({ length: 13 }, (_, i) => `S${i + 1}`), neg = c.fim.findIndex((x) => x < 0);
    let ln = 2; const L = (rot, arr, cls = '', editar = '') => `<tr class="${cls}"><td class="nl">${ln++}</td><td class="rot">${rot}</td>${arr.map((v, i) => editar ? `<td class="v ed"><input data-cel="${hx(editar)}|${i}" data-ref="${COL(i)}${ln - 1}" value="${n0(v)}" aria-label="${hx(rot)} semana ${i + 1}"></td>` : `<td class="v ${v < 0 ? 'neg' : ''}">${n0(v)}</td>`).join('')}</tr>`;
    return `<div class="cab"><div><h1>Caixa das próximas 13 semanas</h1><p>${hx(empNome(db.emp))} · valores em reais. ${ed ? 'As células claras são editáveis: o saldo recalcula na hora.' : 'O consolidado soma as três empresas (escolha uma para editar).'}</p></div><div class="ferr"><span class="seg" role="group" aria-label="Cenário">${[['base', 'Base'], ['pess', 'Pessimista −15%'], ['otim', 'Otimista +8%']].map(([k, t]) => `<button type="button" data-cen="${k}" aria-pressed="${db.cen === k}">${t}</button>`).join('')}</span><button class="b" data-a="exportar">Exportar .xlsx</button></div></div>
      ${neg >= 0 ? `<p class="st ru" style="margin:0 0 8px;font-size:.88rem;padding:4px 10px">Saldo negativo na semana ${neg + 1} (${R$(c.fim[neg])}). Antecipe recebíveis ou renegocie fornecedores.</p>` : ''}
      <div class="planilha"><table>${cabecalho(sem)}<tbody>${L('Saldo inicial', c.ini, 'tot')}<tr class="grupo"><td class="nl">${ln++}</td><td class="rot">ENTRADAS</td>${sem.map(() => '<td></td>').join('')}</tr>${ENTRA.map((r) => L(r, c.linhas[r], '', ed && db.cen === 'base' ? r : '')).join('')}${L('Total de entradas', c.ent, 'tot')}<tr class="grupo"><td class="nl">${ln++}</td><td class="rot">SAÍDAS</td>${sem.map(() => '<td></td>').join('')}</tr>${SAI.map((r) => L(r, c.linhas[r], '', ed && db.cen === 'base' ? r : '')).join('')}${L('Total de saídas', c.sai, 'tot')}${L('Saldo final', c.fim, 'tot')}</tbody></table></div>${ed && db.cen !== 'base' ? '<p style="color:var(--tx-3);font-size:.85rem">Para editar, volte ao cenário Base.</p>' : ''}`;
  },
  orcado() {
    const l = orcado(db.emp), ed = db.emp !== 'todas' && !db.fechado, mx = Math.max(...l.map((x) => Math.abs(x.r - x.o)), 1);
    const rec = l.filter((x) => x.t === 'r'), cus = l.filter((x) => x.t === 'c'), res = (k) => rec.reduce((s, x) => s + x[k], 0) - cus.reduce((s, x) => s + x[k], 0);
    let ln = 3;
    return `<div class="cab"><div><h1>Orçado x real · outubro</h1><p>${hx(empNome(db.emp))}. Desvio em vermelho é o que piorou o resultado.${ed ? ' A coluna Orçado é editável.' : ''}</p></div></div>
      <div class="planilha"><table>${cabecalho(['Orçado', 'Real', 'Desvio', 'Desvio %', ''])}<tbody>${l.map((x, i) => { const d = x.r - x.o, ruim = x.t === 'r' ? d < 0 : d > 0; return `<tr><td class="nl">${ln++}</td><td class="rot">${hx(x.c)}</td><td class="v ${ed ? 'ed' : ''}">${ed ? `<input data-orc="${i}" data-ref="C${ln - 1}" value="${n0(x.o)}" aria-label="Orçado de ${hx(x.c)}">` : n0(x.o)}</td><td class="v">${n0(x.r)}</td><td class="v ${ruim ? 'neg' : 'pos'}">${d > 0 ? '+' : ''}${n0(d)}</td><td class="v ${ruim ? 'neg' : 'pos'}">${(d / (x.o || 1) * 100).toFixed(1).replace('.', ',')}%</td><td class="v" style="text-align:left;min-width:120px"><span class="barra-c ${ruim ? 'neg' : ''}" style="width:${Math.abs(d) / mx * 100}px"></span></td></tr>`; }).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Resultado operacional</td><td class="v">${n0(res('o'))}</td><td class="v">${n0(res('r'))}</td><td class="v ${res('r') < res('o') ? 'neg' : 'pos'}">${n0(res('r') - res('o'))}</td><td class="v">${((res('r') - res('o')) / (res('o') || 1) * 100).toFixed(1).replace('.', ',')}%</td><td></td></tr></tbody></table></div>`;
  },
  aprovar() {
    const l = db.pags.filter(doEmp), quem = (v) => (v <= db.alcadas.gerente ? 'gerente' : v <= db.alcadas.diretor ? 'diretor' : 'dono');
    const sel = l.filter((p) => p.sel && p.st === 'pendente');
    return `<div class="cab"><div><h1>Aprovações de pagamento</h1><p>Cada pagamento sobe para quem tem alçada: até ${R$(db.alcadas.gerente)} o gerente, até ${R$(db.alcadas.diretor)} o diretor, acima disso o dono. Aprovados viram arquivo de remessa para o banco.</p></div><div class="ferr"><button class="b f" data-a="aprovar" ${sel.length ? '' : 'disabled'}>Aprovar ${sel.length || ''} selecionado(s)</button><button class="b k" data-a="remessa" ${l.some((p) => p.st === 'aprovado') ? '' : 'disabled'}>Gerar remessa ao banco</button></div></div>
      <div class="planilha"><table>${cabecalho(['', 'Empresa', 'Fornecedor', 'O quê', 'Vence', 'Valor', 'Alçada', 'Situação'])}<tbody>${l.map((p, i) => `<tr><td class="nl">${i + 3}</td><td class="rot" style="min-width:40px"></td><td class="v" style="min-width:40px;text-align:center">${p.st === 'pendente' ? `<input type="checkbox" class="sel-c" data-sel="${p.id}" ${p.sel ? 'checked' : ''} aria-label="Selecionar ${hx(p.forn)}">` : ''}</td><td class="v txt">${hx(empNome(p.emp))}</td><td class="v txt"><b>${hx(p.forn)}</b></td><td class="v txt">${hx(p.desc)}</td><td class="v">em ${p.venc} dia(s)</td><td class="v">${n0(p.valor)}</td><td class="v txt">${quem(p.valor)}</td><td class="v txt"><span class="st ${p.st === 'pendente' ? 'at' : 'ok'}">${p.st === 'remessa' ? 'na remessa' : p.st}</span></td></tr>`).join('')}</tbody></table></div>`;
  },
  conciliar() {
    const l = db.extrato.map((e) => ({ ...e, cat: categoriza(e.desc) })), auto = l.filter((x) => x.cat).length;
    return `<div class="cab"><div><h1>Conciliação por regras</h1><p>${auto} de ${l.length} linhas do extrato (${Math.round(auto / l.length * 100)}%) se encaixaram sozinhas. Crie uma regra para as que sobraram e ela vale para os próximos meses e para todas as empresas.</p></div><button class="b f" data-a="regra">+ Regra</button></div>
      <div class="cartoes">${db.regras.map((r) => `<div class="cartao-i"><small>se a descrição contém</small><b style="font-size:.95rem">${hx(r.se)}</b><span>→ ${hx(r.cat)}</span> <button class="b" style="min-height:24px;padding:0 8px;float:right" data-a="tira-regra" data-id="${r.id}" aria-label="Remover regra">×</button></div>`).join('')}</div>
      <div class="planilha"><table>${cabecalho(['Descrição no banco', 'Valor', 'Categoria'])}<tbody>${l.map((x, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v txt">${hx(x.desc)}</td><td class="v ${x.valor < 0 ? 'neg' : 'pos'}">${n0(x.valor)}</td><td class="v txt">${x.cat ? `<span class="st ok">${hx(x.cat)}</span>` : `<span class="st ru">sem regra</span> <button class="b" style="min-height:24px;padding:0 8px" data-a="regra" data-desc="${hx(x.desc)}">criar</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  },
  fechar() {
    const ok = db.fech.filter((f) => f.ok).length;
    return `<div class="cab"><div><h1>Fechamento de outubro</h1><p>${db.fechado ? 'Mês fechado: ninguém altera lançamentos de outubro sem reabrir (fica na auditoria).' : 'Lista do que precisa estar feito antes de fechar o mês. Fechado, o mês trava contra alterações.'}</p></div><button class="b f" data-a="fechar-mes" ${ok === db.fech.length && !db.fechado ? '' : 'disabled'}>${db.fechado ? 'Outubro fechado' : 'Fechar outubro'}</button></div>
      <div class="progresso"><i style="width:${ok / db.fech.length * 100}%"></i></div><p style="margin:-6px 0 10px;color:var(--tx-2)">${ok} de ${db.fech.length} etapas</p>
      <div class="planilha"><table>${cabecalho(['Feito', 'Etapa', 'Responsável'])}<tbody>${db.fech.map((f, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v" style="text-align:center"><input type="checkbox" class="sel-c" data-fech="${f.id}" ${f.ok ? 'checked' : ''} ${db.fechado ? 'disabled' : ''} aria-label="${hx(f.t)}"></td><td class="v txt">${f.ok ? `<s style="color:var(--tx-3)">${hx(f.t)}</s>` : hx(f.t)}</td><td class="v txt">${hx(f.resp)}</td></tr>`).join('')}</tbody></table></div>`;
  },
  indic() {
    const k = db.emp === 'todas' ? 1.97 : EMP.find((e) => e.k === db.emp).f, o = orcado(db.emp), rec = o.filter((x) => x.t === 'r').reduce((s, x) => s + x.r, 0), cus = o.filter((x) => x.t === 'c').reduce((s, x) => s + x.r, 0);
    const I = [['Prazo médio de recebimento', '38 dias', 'clientes pagam em', [41, 40, 42, 39, 38, 38], '#a24a3a'], ['Prazo médio de pagamento', '27 dias', 'você paga em', [25, 26, 26, 27, 27, 27]], ['Ciclo de caixa', '35 dias', 'recebimento + estoque − pagamento', [40, 39, 41, 37, 36, 35]], ['EBITDA do mês', R$(rec - cus + o.find((x) => x.c === 'Despesas financeiras').r), `${((rec - cus) / rec * 100).toFixed(1).replace('.', ',')}% da receita`, [6.1, 6.4, 5.8, 6.9, 7.2, 7.0]], ['Capital de giro necessário', R$(1840000 * k), 'para o ciclo atual', [2.1, 2.0, 2.05, 1.95, 1.9, 1.84]], ['Liquidez corrente', '1,42', 'ativo ÷ passivo de curto prazo', [1.31, 1.33, 1.36, 1.38, 1.4, 1.42]], ['Endividamento', '38%', 'dívida ÷ patrimônio', [44, 43, 41, 40, 39, 38]], ['Inadimplência', '3,1%', 'vencido há mais de 30 dias', [2.4, 2.6, 2.9, 3.0, 3.2, 3.1], '#a24a3a']];
    return `<div class="cab"><div><h1>Indicadores</h1><p>${hx(empNome(db.emp))} · últimos 6 meses. O prazo de recebimento caiu 3 dias desde maio; a inadimplência subiu.</p></div></div><div class="cartoes">${I.map(([t, v, s, sp, c]) => `<div class="cartao-i"><small>${t}</small><b>${v}</b><span>${s}</span>${spark(sp, c)}</div>`).join('')}</div>`;
  },
  rateio() {
    let ln = 3;
    return `<div class="cab"><div><h1>Rateio de despesas compartilhadas</h1><p>Despesas que uma empresa paga para o grupo inteiro. Ajuste os percentuais (cada linha soma 100%); o valor de cada empresa vai para o resultado dela.</p></div><button class="b f" data-a="lancar-rateio">Lançar rateio de outubro</button></div>
      <div class="planilha"><table>${cabecalho(['Valor', ...EMP.map((e) => `${e.nome} %`), ...EMP.map((e) => e.nome), 'Soma %'])}<tbody>${db.rateio.map((r, i) => { const s = r.p.reduce((a, b) => a + b, 0); return `<tr><td class="nl">${ln++}</td><td class="rot">${hx(r.d)}</td><td class="v">${n0(r.v)}</td>${r.p.map((p, j) => `<td class="v ed"><input data-rat="${i}|${j}" data-ref="${COL(1 + j)}${ln - 1}" value="${p}" aria-label="${hx(r.d)} ${EMP[j].nome} percentual"></td>`).join('')}${r.p.map((p) => `<td class="v">${n0(r.v * p / 100)}</td>`).join('')}<td class="v ${s === 100 ? 'pos' : 'neg'}">${s}%</td></tr>`; }).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Total</td><td class="v">${n0(db.rateio.reduce((a, r) => a + r.v, 0))}</td>${EMP.map(() => '<td></td>').join('')}${EMP.map((_, j) => `<td class="v">${n0(db.rateio.reduce((a, r) => a + r.v * r.p[j] / 100, 0))}</td>`).join('')}<td></td></tr></tbody></table></div>`;
  },
  consol() {
    const lin = CATS.map(([c, , , t], i) => ({ c, t, v: EMP.map((e) => db.orc[e.k][i].r) })), elim = [180000, 0, 0];
    const tot = (fn) => EMP.map((_, j) => fn(j)), rec = (j) => lin.filter((x) => x.t === 'r').reduce((s, x) => s + x.v[j], 0), cus = (j) => lin.filter((x) => x.t === 'c').reduce((s, x) => s + x.v[j], 0);
    let ln = 3;
    return `<div class="cab"><div><h1>Consolidado do grupo · outubro</h1><p>Resultado de cada empresa lado a lado. A eliminação tira o frete que a Logística cobrou da Distribuidora, para não contar a mesma receita duas vezes.</p></div></div>
      <div class="planilha"><table>${cabecalho([...EMP.map((e) => e.nome), 'Eliminações', 'Grupo'])}<tbody>${lin.map((x) => { const el = x.c === 'Receita de serviços' ? -180000 : x.c === 'Fretes' ? -180000 : 0; return `<tr><td class="nl">${ln++}</td><td class="rot">${hx(x.c)}</td>${x.v.map((v) => `<td class="v">${n0(v)}</td>`).join('')}<td class="v ${el ? 'neg' : ''}">${el ? n0(el) : ''}</td><td class="v">${n0(x.v.reduce((a, b) => a + b, 0) + el)}</td></tr>`; }).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Resultado operacional</td>${tot((j) => rec(j) - cus(j)).map((v) => `<td class="v ${v < 0 ? 'neg' : ''}">${n0(v)}</td>`).join('')}<td class="v">0</td><td class="v">${n0(EMP.reduce((s, _, j) => s + rec(j) - cus(j), 0))}</td></tr></tbody></table></div><p style="color:var(--tx-3);font-size:.85rem">Eliminações intercompany: ${R$(elim[0])} em fretes internos.</p>`;
  },
  audit() { return `<div class="cab"><div><h1>Auditoria</h1><p>Toda alteração de valor, aprovação, regra e fechamento: quem, quando e o quê.</p></div></div><div class="planilha"><table>${cabecalho(['Quando', 'Quem', 'O quê'])}<tbody>${db.audit.map((a, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v">${hx(a.q)}</td><td class="v txt">${hx(a.quem)}</td><td class="v txt">${hx(a.o)}</td></tr>`).join('')}</tbody></table></div>`; },
  equipe() {
    const pr = db.plano === 'pro' ? 309 : 249;
    return `<div class="cab"><div><h1>Equipe e alçadas</h1><p>Painel do dono: quem vê qual empresa e até quanto cada um aprova.</p></div></div>
      <div class="cartoes"><div class="cartao-i"><small>Gerente aprova até</small><b><input data-alc="gerente" value="${n0(db.alcadas.gerente)}" style="width:100%;border:1px solid var(--linha);font:inherit;padding:2px 6px" aria-label="Alçada do gerente"></b></div><div class="cartao-i"><small>Diretor aprova até</small><b><input data-alc="diretor" value="${n0(db.alcadas.diretor)}" style="width:100%;border:1px solid var(--linha);font:inherit;padding:2px 6px" aria-label="Alçada do diretor"></b></div><div class="cartao-i"><small>Plano</small><b>${R$(pr)}/mês</b><span><button class="b" data-a="plano" data-v="basico">Básico R$ 249</button> <button class="b" data-a="plano" data-v="pro">Pro R$ 309</button></span></div></div>
      <div class="planilha"><table>${cabecalho(['Pessoa', 'Papel', 'Empresas', 'Pode'])}<tbody>${[['Marcos', 'Dono', 'todas', 'tudo, inclusive reabrir mês'], ['Henrique', 'Diretor financeiro', 'todas', 'aprovar até a alçada, orçamento, rateio'], ['Paula', 'Analista', 'todas', 'lançar, conciliar, fechar etapas'], ['Rita', 'Gerente da Logística', 'Serra Logística', 'aprovar até a alçada'], ['Contabilidade Prisma', 'Contador', 'todas', 'só ler e baixar o pacote']].map((p, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td>${p.map((c) => `<td class="v txt">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p style="color:var(--tx-3);font-size:.85rem">Básico: você + 5 usuários. Pro: sem limite e até 10 empresas. Anual com 20% a menos. Sem fidelidade.</p>`;
  },
  ajustes() { return `<div class="cab"><div><h1>Ajustes</h1></div></div><div class="cartoes" style="grid-template-columns:1fr;max-width:640px"><div class="cartao-i"><label class="cp">Saldo inicial de ${hx(empNome(db.emp === 'todas' ? 'dist' : db.emp))} (R$)<input data-saldo value="${n0(db.caixa[db.emp === 'todas' ? 'dist' : db.emp].saldo)}"></label><p style="color:var(--tx-3);font-size:.86rem;margin:0">Integrações da versão contratada: extrato automático dos bancos (Open Finance), remessa e retorno CNAB, notas de entrada da SEFAZ, exportação para o sistema do contador. Algumas têm custo à parte.</p></div></div>`; },
};

function desenha() {
  const a = location.hash.slice(1) || 'caixa';
  $('#empresa').innerHTML = [...EMP.map((e) => [e.k, e.nome]), ['todas', 'Consolidado do grupo']].map(([k, n]) => `<option value="${k}" ${db.emp === k ? 'selected' : ''}>${n}</option>`).join('');
  $('#periodo').textContent = `outubro/2026 · ${db.fechado ? 'fechado' : 'aberto'}`;
  const n = { aprovar: db.pags.filter((p) => p.st === 'pendente' && doEmp(p)).length, conciliar: db.extrato.filter((e) => !categoriza(e.desc)).length, fechar: db.fech.filter((f) => !f.ok).length };
  $('#abas').innerHTML = ABAS.map(([k, t]) => `<a href="#${k}" ${k === a ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('');
  $('#folha').innerHTML = (F[a] || F.caixa)();
  document.title = `${(ABAS.find(([k]) => k === a) || ABAS[0])[1]} · Veltria Financeiro Avançado`;
}
addEventListener('hashchange', () => { desenha(); $('#folha').focus({ preventScroll: true }); });

// ------------------------------------------------------------------ barra de fórmula
const CMD = { caixa: 'caixa', fluxo: 'caixa', orcado: 'orcado', orcamento: 'orcado', aprovar: 'aprovar', aprovacoes: 'aprovar', conciliar: 'conciliar', conciliacao: 'conciliar', fechar: 'fechar', fechamento: 'fechar', indicadores: 'indic', rateio: 'rateio', consolidado: 'consol', auditoria: 'audit', equipe: 'equipe', ajustes: 'ajustes' };
function responde(p) {
  const x = sa(p);
  if (/fechar|fecham|falta/.test(x)) { if (db.fechado) return 'Outubro já está fechado. Para alterar algo, o dono reabre o mês (fica na auditoria).'; const f = db.fech.filter((y) => !y.ok); return f.length ? `Faltam ${f.length} etapas para fechar outubro:\n${f.map((y) => `• ${y.t} (${y.resp})`).join('\n')}` : 'Tudo pronto: pode fechar outubro.'; }
  if (/caixa|negativ|semana|aguent/.test(x)) { const c = caixa13(db.emp), mn = Math.min(...c.fim), i = c.fim.indexOf(mn); return `${empNome(db.emp)}: menor saldo em 13 semanas é ${R$(mn)}, na semana ${i + 1}. No cenário pessimista: ${R$(Math.min(...(() => { const g = db.cen; db.cen = 'pess'; const r = caixa13(db.emp).fim; db.cen = g; return r; })()))}.`; }
  if (/desvi|orcad|estour|pior/.test(x)) { const l = orcado(db.emp).map((y) => ({ ...y, d: y.t === 'r' ? y.o - y.r : y.r - y.o })).sort((a, b) => b.d - a.d).slice(0, 3); return `Maiores desvios contra o orçamento:\n${l.map((y) => `• ${y.c}: ${R$(y.d)} pior que o previsto`).join('\n')}\nFrete e marketing explicam metade da diferença.`; }
  if (/aprov|pagar|pagament/.test(x)) { const l = db.pags.filter((y) => y.st === 'pendente'); return `${l.length} pagamentos esperando aprovação, total ${R$(l.reduce((s, y) => s + y.valor, 0))}. O maior é ${l.sort((a, b) => b.valor - a.valor)[0]?.forn || '—'}. Escreva =aprovar para abrir.`; }
  if (/inadimpl|receb|prazo/.test(x)) return 'O prazo médio de recebimento é 38 dias e a inadimplência subiu para 3,1%. Os 5 maiores devedores somam 61% do vencido: vale uma régua de cobrança mais curta para eles.';
  return 'Posso responder sobre caixa, orçamento, aprovações, fechamento e indicadores. Comandos: =caixa, =orcado, =aprovar, =conciliar, =fechar, =indicadores, =rateio, =consolidado.';
}
$('#f-fx').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('#fx').value.trim(); if (!v) return;
  const c = v.startsWith('=') ? CMD[sa(v.slice(1)).replace(/\s/g, '')] : null;
  if (c) { location.hash = `#${c}`; $('#fx').value = ''; return; }
  const r = $('#resposta'), topo = `<button type="button" data-fecha-r aria-label="Fechar">×</button><span class="q">=${hx(v)}</span>`; r.hidden = false;
  if (window.veltriaIA) { r.innerHTML = `${topo}Pensando…`; window.veltriaIA(v).then((t) => { r.innerHTML = `${topo}${hx(t)}`; }); }
  else r.innerHTML = `${topo}${hx(responde(v))}\n\n<small style="color:var(--tx-3)">Resposta de exemplo da demonstração. Na versão contratada, 20 perguntas grátis por dia.</small>`;
  $('#fx').value = '';
});

const A = {
  exportar: () => balao('Planilha .xlsx gerada (demonstração), com fórmulas, para abrir no Excel.'),
  aprovar: () => { const l = db.pags.filter((p) => p.sel && p.st === 'pendente' && doEmp(p)); l.forEach((p) => { p.st = 'aprovado'; p.sel = false; }); log(`aprovou ${l.length} pagamento(s): ${R$(l.reduce((s, p) => s + p.valor, 0))}`); guarda(); desenha(); balao(`${l.length} aprovado(s). Gere a remessa para mandar ao banco.`); },
  remessa: () => { const l = db.pags.filter((p) => p.st === 'aprovado' && doEmp(p)); l.forEach((p) => { p.st = 'remessa'; }); log(`gerou remessa CNAB com ${l.length} pagamento(s)`); guarda(); desenha(); balao(`Arquivo CNAB240 com ${l.length} pagamento(s) pronto para o banco (demonstração).`); },
  regra: (d) => janela(`<h2>Nova regra de conciliação</h2><form><label class="cp">Se a descrição contém<input name="se" value="${hx((d.desc || '').split(' ').slice(0, 2).join(' '))}" required></label><label class="cp">Categoria<select name="cat">${['Recebimento de cliente', 'Pagamento a fornecedor', 'Tarifas bancárias', 'Despesas financeiras', 'Rendimentos', 'Energia', 'Folha e encargos', 'Reembolso a sócio'].map((c) => `<option>${c}</option>`).join('')}</select></label><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">Criar regra</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); db.regras.push({ id: uid(), se: String(f.get('se')).toUpperCase(), cat: f.get('cat') }); log(`criou regra "${f.get('se')}" → ${f.get('cat')}`); guarda(); fecha(); desenha(); })),
  'tira-regra': (d) => { db.regras = db.regras.filter((r) => r.id !== d.id); guarda(); desenha(); },
  'fechar-mes': () => { db.fechado = true; log('fechou outubro'); guarda(); desenha(); balao('Outubro fechado e travado. Pacote enviado ao contador.'); },
  'lancar-rateio': () => { if (db.rateio.some((r) => r.p.reduce((a, b) => a + b, 0) !== 100)) return balao('Há linha que não soma 100%. Ajuste antes de lançar.'); log('lançou o rateio de outubro nas 3 empresas'); guarda(); balao('Rateio lançado: cada empresa recebeu a parte dela no resultado.'); },
  plano: (d) => { db.plano = d.v; guarda(); desenha(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-fecha-r]')) { $('#resposta').hidden = true; return; }
  const c = t.closest('[data-cen]'); if (c) { db.cen = c.dataset.cen; guarda(); desenha(); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('focusin', (e) => { $('#ref').textContent = e.target.dataset?.ref || 'A1'; });
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if (d.cel) { const [r, i] = d.cel.split('|'), ant = db.caixa[db.emp].linhas[r][i]; db.caixa[db.emp].linhas[r][i] = nv(t.value); log(`alterou ${r} da semana ${Number(i) + 1} de ${R$(ant)} para ${R$(nv(t.value))}`); guarda(); desenha(); }
  if (d.orc) { const l = db.orc[db.emp][d.orc], ant = l.o; l.o = nv(t.value); log(`alterou orçado de ${l.c} de ${R$(ant)} para ${R$(l.o)}`); guarda(); desenha(); }
  if (d.sel) { db.pags.find((p) => p.id === d.sel).sel = t.checked; guarda(); desenha(); }
  if (d.fech) { const f = db.fech.find((x) => x.id === d.fech); f.ok = t.checked; log(`${t.checked ? 'concluiu' : 'reabriu'} a etapa "${f.t}"`); guarda(); desenha(); }
  if (d.rat) { const [i, j] = d.rat.split('|').map(Number); db.rateio[i].p[j] = nv(t.value); guarda(); desenha(); }
  if (d.alc) { db.alcadas[d.alc] = nv(t.value); log(`mudou a alçada do ${d.alc} para ${R$(nv(t.value))}`); guarda(); desenha(); }
  if ('saldo' in d) { db.caixa[db.emp === 'todas' ? 'dist' : db.emp].saldo = nv(t.value); guarda(); balao('Saldo inicial salvo.'); }
  if (t.id === 'empresa') { db.emp = t.value; guarda(); desenha(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '=' && !e.target.closest?.('input, select, textarea')) { e.preventDefault(); $('#fx').focus(); $('#fx').value = '='; }
  // setas para cima e para baixo andam entre as células editáveis da mesma coluna, como numa planilha
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') && e.target.dataset?.ref) {
    const l = [...document.querySelectorAll('[data-ref]')], col = e.target.dataset.ref.replace(/\d+/, ''), mesmas = l.filter((x) => x.dataset.ref.replace(/\d+/, '') === col), i = mesmas.indexOf(e.target), prox = mesmas[i + (e.key === 'ArrowUp' ? -1 : 1)];
    if (prox) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector(`[data-ref="${prox.dataset.ref}"]`)?.focus(); }
  }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = inicio(); location.hash = '#caixa'; $('#resposta').hidden = true; desenha(); balao('Demonstração recomeçada.'); });
desenha();

// Veltria Financeiro Avançado · "planilha viva" para grupo de empresas e escritório de BPO financeiro.
// Abas de planilha embaixo: caixa de 13 semanas com cenários, orçado x real, aprovações por alçada com remessa,
// conciliação do extrato (OFX/CSV) por regras e com os pagamentos, fechamento do mês com trava, indicadores tirados
// dos dados, rateio exato entre empresas, consolidado com eliminações, auditoria, equipe e ajustes.
// A barra de fórmula aceita comandos (=caixa) e perguntas. Regras: nucleo.js. Dados de exemplo (?novo).

import * as N from './nucleo.js';

const CHAVE = 'veltria-financeiro-avancado-v1';
const CONTA = new URLSearchParams(location.search).get('conta') || 'demo';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); // reais inteiros (planejamento)
const RC = N.reais; // centavos (pagamentos e extrato)
const n0 = (v) => Math.round(Number(v || 0)).toLocaleString('pt-BR');
const hx = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const $ = (s) => document.querySelector(s);
const COL = (i) => String.fromCharCode(67 + i); // colunas de valores começam em C (A = nº, B = rótulo)
const COMP = N.compAtual(), MES = N.nomeComp(COMP).split(' ')[0];

// empresas do grupo: ficam nos dados (db.empresasGrupo); estas são as do exemplo
const EMP_EXEMPLO = [{ k: 'dist', nome: 'Serra Distribuidora', f: 1 }, { k: 'log', nome: 'Serra Logística', f: 0.62 }, { k: 'loja', nome: 'Serra Lojas', f: 0.35 }];
const EMP = [];
const ENTRA = ['Clientes (a receber)', 'Contratos recorrentes', 'Outras entradas'], SAI = ['Fornecedores', 'Folha e encargos', 'Impostos', 'Financiamentos', 'Despesas gerais'];
const BASE13 = { 'Clientes (a receber)': [412, 388, 455, 401, 470, 392, 418, 446, 405, 431, 462, 398, 440], 'Contratos recorrentes': [96, 0, 0, 0, 96, 0, 0, 0, 96, 0, 0, 0, 96], 'Outras entradas': [8, 4, 12, 3, 6, 9, 2, 14, 5, 7, 3, 11, 4], Fornecedores: [298, 355, 310, 342, 301, 388, 296, 330, 315, 362, 305, 340, 318], 'Folha e encargos': [0, 0, 186, 0, 0, 0, 186, 0, 0, 0, 186, 0, 0], Impostos: [0, 64, 0, 0, 0, 68, 0, 0, 0, 66, 0, 0, 0], Financiamentos: [0, 0, 0, 42, 0, 0, 0, 42, 0, 0, 0, 42, 0], 'Despesas gerais': [38, 41, 36, 44, 39, 42, 37, 45, 40, 43, 38, 41, 39] };
const ORC_EX = { 'Receita de vendas': [4210, 4062], 'Receita de serviços': [612, 655], 'Custo das mercadorias': [2860, 2944], Fretes: [214, 251], 'Folha e encargos': [744, 738], 'Aluguel e condomínio': [168, 168], Marketing: [96, 131], Tecnologia: [58, 64], 'Despesas financeiras': [72, 88], 'Serviços de terceiros': [0, 0] };

function inicio() {
  const caixa = {}, orc = {};
  EMP_EXEMPLO.forEach((e) => { caixa[e.k] = { saldo: Math.round(520 * e.f) * 1000, linhas: Object.fromEntries(Object.entries(BASE13).map(([k, v]) => [k, v.map((x) => Math.round(x * e.f) * 1000)])) }; orc[e.k] = N.CATS.map(([c, t]) => ({ c, t, o: Math.round(ORC_EX[c][0] * e.f) * 1000, r: Math.round(ORC_EX[c][1] * e.f) * 1000 })); });
  const pags = [['dist', 'Ambev Distribuição', 'Mercadoria · NF 88231', 14860000, 2], ['dist', 'Locadora Trucks', 'Aluguel de 4 caminhões', 3820000, 3], ['log', 'Ipiranga Frotas', 'Diesel · quinzena', 2640000, 1], ['dist', 'Contabilidade Prisma', 'Honorários', 480000, 5], ['loja', 'Shopping Del Rey', 'Aluguel loja 112', 1890000, 6], ['log', 'Pneus Rodão', '8 pneus 295/80', 2170000, 4], ['loja', 'Agência Faro', 'Campanha Black Friday', 420000, 7], ['dist', 'Copasa', 'Água CD', 189000, 2]]
    .map(([emp, forn, desc, c, venc]) => ({ id: uid(), emp, forn, desc, c, venc, st: 'pendente', sel: false }));
  const extrato = [[-3, 'PIX RECEB SUPERMERCADO BH LTDA', 1842000], [-3, 'TARIFA MANUTENCAO CONTA', -8900], [-2, 'TED RECEB REDE ECONOMICO', 5230000], [-2, 'IOF OPERACAO CREDITO', -41200], [-2, 'PIX RECEB MERCEARIA SAO JOSE', 384000], [-1, 'DEB AUTOMATICO CEMIG', -621000], [-1, 'TARIFA PIX LOTE', -4200], [-1, 'RENDIMENTO APLIC AUTOMATICA', 196000], [-1, 'PIX ENVIADO JOAO MARCOS', -230000], [0, 'CARTAO VENDA REDE CREDITO', 4128000]].map(([dia, desc, c], i) => ({ id: `e${i}`, dia, desc, c, arquivo: 'exemplo.ofx' }));
  const regras = [['PIX RECEB', 'Recebimento de cliente'], ['TED RECEB', 'Recebimento de cliente'], ['TARIFA', 'Tarifas bancárias'], ['IOF', 'Despesas financeiras'], ['PAG BOLETO', 'Pagamento a fornecedor'], ['PAG FOLHA', 'Folha e encargos'], ['CEMIG', 'Energia']].map(([se, cat]) => ({ id: uid(), se, cat }));
  const fech = [['Conciliar as contas bancárias', 'Paula', true], ['Conferir notas de entrada x pagamentos', 'Paula', true], ['Provisionar férias e 13º', 'Henrique', true], ['Apurar impostos (DAS / ICMS-ST)', 'Contabilidade Prisma', false], ['Ratear despesas compartilhadas', 'Henrique', false], ['Revisar orçado x real e justificar desvios', 'Marcos (diretor)', false], ['Enviar pacote ao contador', 'Paula', false]].map(([t, resp, ok]) => ({ id: uid(), t, resp, ok }));
  const rateio = [['Aluguel do CD', 62000, [70, 20, 10], 'Aluguel e condomínio'], ['Tecnologia e ERP', 18400, [50, 25, 25], 'Tecnologia'], ['Diretoria', 54000, [50, 30, 20], 'Folha e encargos'], ['Contabilidade e jurídico', 12600, [45, 35, 20], 'Serviços de terceiros']].map(([d, v, p, cat]) => ({ d, v, p, cat }));
  return { formato: N.FORMATO, emp: 'dist', cen: 'base', empresasGrupo: EMP_EXEMPLO.map((e) => ({ ...e })), caixa, orc, pags, extrato, regras, fech, fechados: {}, rateio, rateiosLancados: {}, eliminacoes: [{ id: 'el1', desc: 'Frete que a Logística cobra da Distribuidora', receita: 'Receita de serviços', custo: 'Fretes', v: 180000 }], alcadas: { gerente: 20000, diretor: 80000 }, eu: { nome: 'Marcos', papel: 'dono' }, audit: [], plano: 'basico', conversa: [] };
}
let falha = '', protegido = false;
function carregar() {
  if (new URLSearchParams(location.search).has('novo')) try { localStorage.removeItem(CHAVE); } catch { /* */ }
  let txt = null; try { txt = localStorage.getItem(CHAVE); } catch { /* */ }
  if (!txt) return inicio();
  let b; try { b = JSON.parse(txt); } catch { falha = 'Os dados guardados neste navegador estão ilegíveis.'; protegido = true; return inicio(); }
  if (b.formato >= 2) return b;
  try { localStorage.setItem(`${CHAVE}-copia-formato1:${CONTA}`, txt); } catch { falha = 'Sem espaço para guardar a cópia antes de atualizar.'; protegido = true; return inicio(); }
  try { const d = N.migrar(b); localStorage.setItem(CHAVE, JSON.stringify(d)); return d; } catch (e) { falha = `Não consegui atualizar os dados (${e.message}). Nada foi apagado.`; protegido = true; return inicio(); }
}
let db = carregar();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
window.veltriaEditorFora = ['pags', 'extrato', 'rateio', 'fech', 'audit', 'eliminacoes', 'regras'];
window.veltriaSemMaisComum = true;
window.veltriaResumoIA = () => { const c = caixa13(db.emp), o = orcado(db.emp); return [`${empNome(db.emp)} · ${N.nomeComp(COMP)} ${N.fechado(db) ? '(fechado)' : '(aberto)'}.`, ...N.indicadores(db, o, c, db.emp).map(([t, v, s]) => `${t}: ${v} (${s})`), `Etapas do fechamento pendentes: ${db.fech.filter((f) => !f.ok).map((f) => f.t).join('; ') || 'nenhuma'}.`].join('\n'); };
// grupo que começou do zero trabalha com uma empresa, que dá para renomear; empresa nova ganha caixa, orçamento e rateio zerados
function lerEmpresas() {
  const g = Array.isArray(db.empresasGrupo) ? (db.empresasGrupo.length ? db.empresasGrupo : [{ k: 'principal', nome: 'Empresa principal', f: 1 }]) : EMP_EXEMPLO;
  EMP.length = 0; g.forEach((e) => EMP.push({ ...e, f: e.f || 1 }));
  db.caixa = db.caixa || {}; db.orc = db.orc || {};
  ['pags', 'extrato', 'regras', 'fech', 'rateio', 'audit', 'eliminacoes', 'conversa'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; });
  db.fechados ||= {}; db.rateiosLancados ||= {}; db.eu ||= { nome: 'Você', papel: 'dono' }; db.alcadas ||= { gerente: 20000, diretor: 80000 };
  EMP.forEach((e) => {
    if (!db.caixa[e.k]) db.caixa[e.k] = { saldo: 0, linhas: Object.fromEntries(Object.keys(BASE13).map((k) => [k, BASE13[k].map(() => 0)])) };
    db.orc[e.k] = N.CATS.map(([c, t]) => { const x = (db.orc[e.k] || []).find((y) => y.c === c); return { c, t, o: x?.o || 0, r: x?.r || 0 }; });
  });
  db.rateio.forEach((r) => { while (r.p.length < EMP.length) r.p.push(0); r.p.length = EMP.length; });
  if (db.emp !== 'todas' && !EMP.some((e) => e.k === db.emp)) db.emp = EMP[0].k;
}
lerEmpresas();
const quem = () => `${db.eu.nome} (${N.PAPEIS[db.eu.papel] || db.eu.papel})`;
function formEmpresa(k) {
  const e0 = EMP.find((e) => e.k === k);
  janela(`<h2>${k ? 'Renomear empresa' : 'Nova empresa do grupo'}</h2><form><label class="cp">Nome da empresa<input name="n" required maxlength="60" value="${k ? hx(e0.nome) : ''}" placeholder="Ex.: Serra Atacado"></label><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">${k ? 'Salvar' : 'Cadastrar'}</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault(); const nome = String(new FormData(ev.target).get('n')).trim(); if (!nome) return;
    if (k) e0.nome = nome; else EMP.push({ k: nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 10) + Date.now().toString(36).slice(-3), nome, f: 1 });
    db.empresasGrupo = EMP.map((e) => ({ ...e })); lerEmpresas(); if (!k) db.emp = EMP[EMP.length - 1].k;
    N.registra(db, quem(), k ? `renomeou a empresa para ${nome}` : `cadastrou a empresa ${nome}`); guarda(); fecha(); desenha();
  }));
}
const guarda = () => { if (protegido) return balao('Dados protegidos: nada foi gravado.'); try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { balao('Sem espaço no navegador: não consegui salvar.'); } };
const empNome = (k) => (k === 'todas' ? 'Consolidado do grupo' : EMP.find((e) => e.k === k)?.nome || k);
const doEmp = (x) => db.emp === 'todas' || x.emp === db.emp;
/** Faz uma alteração do núcleo: erro vira balão; sucesso grava e redesenha. */
function faz(fn, ok) { try { const r = fn(); guarda(); desenha(); if (ok) balao(typeof ok === 'function' ? ok(r) : ok); return r ?? true; } catch (e) { balao(e.message); desenha(); return false; } }

function balao(t) { const a = document.createElement('div'); a.textContent = t; $('#balao').append(a); setTimeout(() => a.remove(), 4200); }
function janela(html, liga) {
  const v = document.createElement('div'); v.className = 'janela-v'; v.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fechar]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.janela'), fecha);
}
function baixa(nome, conteudo, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ------------------------------------------------------------------ cálculos de planejamento (reais inteiros)
const MULT = { base: [1, 1], pess: [85, 100], otim: [108, 100] };
function caixa13(k) {
  const fontes = k === 'todas' ? EMP.map((e) => db.caixa[e.k]) : [db.caixa[k]], [num, den] = MULT[db.cen] || MULT.base;
  const linhas = {}; [...ENTRA, ...SAI].forEach((r) => { linhas[r] = Array.from({ length: 13 }, (_, i) => { const s = fontes.reduce((a, f) => a + (f.linhas[r]?.[i] || 0), 0); return ENTRA.includes(r) && r !== 'Contratos recorrentes' ? Math.round(s * num / den) : s; }); });
  let s = fontes.reduce((a, f) => a + f.saldo, 0); const ini = [], fim = [], ent = [], sai = [];
  for (let i = 0; i < 13; i++) { ini.push(s); ent.push(ENTRA.reduce((a, r) => a + linhas[r][i], 0)); sai.push(SAI.reduce((a, r) => a + linhas[r][i], 0)); s += ent[i] - sai[i]; fim.push(s); }
  return { linhas, ini, fim, ent, sai };
}
function orcado(k) { if (k !== 'todas') return db.orc[k]; return N.CATS.map(([c, t], i) => ({ c, t, o: EMP.reduce((s, e) => s + db.orc[e.k][i].o, 0), r: EMP.reduce((s, e) => s + db.orc[e.k][i].r, 0) })); }
function cabecalho(nomes) { return `<thead><tr><th class="nl"></th><th class="rot" style="background:var(--linho)">B</th>${nomes.map((_, i) => `<th>${COL(i)}</th>`).join('')}</tr><tr class="nomes"><th class="nl">1</th><th class="rot" style="background:var(--linho);text-align:left"></th>${nomes.map((n) => `<th>${n}</th>`).join('')}</tr></thead>`; }
const travado = () => N.fechado(db);
const avisoTrava = () => (travado() ? `<p class="aviso-t ok">${hx(N.nomeComp(COMP))} está fechado: nada deste mês pode ser alterado. ${db.eu.papel === 'dono' ? 'Você é o dono e pode reabrir na aba Fechamento.' : 'Só o dono reabre.'}</p>` : '');

// ------------------------------------------------------------------ abas
const ABAS = [['caixa', 'Caixa 13 semanas'], ['orcado', 'Orçado x real'], ['aprovar', 'Aprovações'], ['conciliar', 'Conciliação'], ['fechar', 'Fechamento'], ['indic', 'Indicadores'], ['rateio', 'Rateio'], ['consol', 'Consolidado'], ['audit', 'Auditoria'], ['equipe', 'Equipe e alçadas'], ['ajustes', 'Ajustes']];
const GRUPOS = [['Planejamento', ['caixa', 'orcado']], ['Operação', ['aprovar', 'conciliar', 'fechar']], ['Grupo', ['rateio', 'consol']], ['Controle', ['indic', 'audit', 'equipe', 'ajustes']]];
const SIGLA = { caixa: 'C13', orcado: 'OxR', aprovar: 'APR', conciliar: 'CON', fechar: 'FCH', indic: 'IND', rateio: 'RAT', consol: 'CNS', audit: 'AUD', equipe: 'EQP', ajustes: 'AJU' };
const nomeAba = (k) => (ABAS.find(([x]) => x === k) || [0, k])[1];
// faixa de indicadores de cada planilha: [título, valor, detalhe, classe]
const KPIS = {
  caixa() { const c = caixa13(db.emp), mn = Math.min(...c.fim), i = c.fim.indexOf(mn), negs = c.fim.filter((x) => x < 0).length; return [['Saldo inicial', R$(c.ini[0])], ['Menor saldo em 13 semanas', R$(mn), `semana ${i + 1}`, mn < 0 ? 'neg' : ''], ['Semanas no negativo', String(negs), negs ? 'antecipe recebíveis ou renegocie' : 'nenhuma', negs ? 'neg' : 'pos'], ['Saldo em 13 semanas', R$(c.fim[12]), `cenário ${{ base: 'base', pess: 'pessimista', otim: 'otimista' }[db.cen]}`]]; },
  orcado() { const l = orcado(db.emp), s = (t, k) => l.filter((x) => x.t === t).reduce((a, x) => a + x[k], 0), rO = s('r', 'o') - s('c', 'o'), rR = s('r', 'r') - s('c', 'r'), pior = l.map((x) => ({ ...x, d: x.t === 'r' ? x.o - x.r : x.r - x.o })).sort((a, b) => b.d - a.d)[0]; return [['Receita real', R$(s('r', 'r')), `orçado ${R$(s('r', 'o'))}`], ['Custos reais', R$(s('c', 'r')), `orçado ${R$(s('c', 'o'))}`], ['Resultado operacional', R$(rR), `orçado ${R$(rO)}`, rR < rO ? 'neg' : 'pos'], ['Maior desvio ruim', pior && pior.d > 0 ? pior.c : 'nenhum', pior && pior.d > 0 ? `${R$(pior.d)} pior que o orçado` : '', pior && pior.d > 0 ? 'neg' : '']]; },
  aprovar() { const l = db.pags.filter(doEmp), g = (st) => l.filter((p) => p.st === st), t = (x) => RC(x.reduce((a, p) => a + p.c, 0)); return [['Esperando aprovação', String(g('pendente').length), t(g('pendente')), g('pendente').length ? 'neg' : ''], ['Aprovados', String(g('aprovado').length), t(g('aprovado'))], ['Na remessa', String(g('remessa').length), t(g('remessa'))], ['Pagos (pelo extrato)', String(g('pago').length), t(g('pago')), 'pos'], ['Sua alçada', N.PAPEIS[db.eu.papel], db.eu.papel === 'dono' ? 'aprova qualquer valor' : `até ${R$(db.alcadas[db.eu.papel])}`]]; },
  conciliar() { const l = db.extrato, cat = l.filter((e) => N.categoria(db, e) || e.pag).length, pg = l.filter((e) => e.pag).length; return [['Linhas do extrato', String(l.length)], ['Com categoria ou pagamento', l.length ? `${Math.round(cat / l.length * 100)}%` : '—', `${cat} de ${l.length}`, 'pos'], ['Pagamentos conciliados', String(pg)], ['Sem regra', String(l.length - cat), l.length - cat ? 'crie uma regra para elas' : '', l.length - cat ? 'neg' : '']]; },
  rateio() { const ok = db.rateio.filter((r) => { try { N.ratear(r.v, r.p); return !!r.cat; } catch { return false; } }).length, l = db.rateiosLancados[COMP]; return [['Total a ratear', R$(db.rateio.reduce((a, r) => a + r.v, 0))], ['Linhas prontas', `${ok} de ${db.rateio.length}`, ok < db.rateio.length ? 'cada linha: 100% e conta de despesa' : 'todas certas', ok < db.rateio.length ? 'neg' : 'pos'], [`Rateio de ${MES}`, l ? 'lançado' : 'não lançado', l ? `por ${l.por}` : '', l ? 'pos' : '']]; },
  consol() { const c = N.consolidado(db, EMP); return [['Resultado do grupo', R$(c.grupo), `${EMP.length} empresa(s)`, c.grupo < 0 ? 'neg' : 'pos'], ...EMP.slice(0, 3).map((e, j) => [e.nome, R$(c.porEmp[j]), 'resultado operacional', c.porEmp[j] < 0 ? 'neg' : '']), ['Eliminado no grupo', R$(c.eliminado), `${db.eliminacoes.length} eliminação(ões)`]]; },
  audit() { const u = db.audit[0]; return [['Registros guardados', String(db.audit.length), 'os últimos 500'], ['Última alteração', u ? (u.em ? new Date(u.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : u.quando) : '—', u ? u.quem : '']]; },
};
const F = {
  caixa() {
    const c = caixa13(db.emp), ed = db.emp !== 'todas' && !travado(), sem = Array.from({ length: 13 }, (_, i) => `S${i + 1}`), neg = c.fim.findIndex((x) => x < 0);
    let ln = 2; const L = (rot, arr, cls = '', editar = '') => `<tr class="${cls}"><td class="nl">${ln++}</td><td class="rot">${rot}</td>${arr.map((v, i) => editar ? `<td class="v ed"><input data-cel="${hx(editar)}|${i}" data-ref="${COL(i)}${ln - 1}" value="${n0(v)}" inputmode="numeric" aria-label="${hx(rot)} semana ${i + 1}"></td>` : `<td class="v ${v < 0 ? 'neg' : ''}">${n0(v)}</td>`).join('')}</tr>`;
    return `<div class="cab"><div><h1>Caixa das próximas 13 semanas</h1><p>${hx(empNome(db.emp))} · valores em reais. ${ed ? 'As células claras são editáveis: o saldo recalcula na hora.' : db.emp === 'todas' ? 'O consolidado soma as empresas (escolha uma para editar).' : ''}</p></div><div class="ferr"><span class="seg" role="group" aria-label="Cenário">${[['base', 'Base'], ['pess', 'Pessimista −15%'], ['otim', 'Otimista +8%']].map(([k, t]) => `<button type="button" data-cen="${k}" aria-pressed="${db.cen === k}">${t}</button>`).join('')}</span><button class="b" data-a="exportar">Exportar .xlsx</button></div></div>
      ${avisoTrava()}${neg >= 0 ? `<p class="aviso-t ru">Saldo negativo na semana ${neg + 1} (${R$(c.fim[neg])}). Antecipe recebíveis ou renegocie fornecedores.</p>` : ''}
      <div class="planilha"><table>${cabecalho(sem)}<tbody>${L('Saldo inicial', c.ini, 'tot')}<tr class="grupo"><td class="nl">${ln++}</td><td class="rot">ENTRADAS</td>${sem.map(() => '<td></td>').join('')}</tr>${ENTRA.map((r) => L(r, c.linhas[r], '', ed && db.cen === 'base' ? r : '')).join('')}${L('Total de entradas', c.ent, 'tot')}<tr class="grupo"><td class="nl">${ln++}</td><td class="rot">SAÍDAS</td>${sem.map(() => '<td></td>').join('')}</tr>${SAI.map((r) => L(r, c.linhas[r], '', ed && db.cen === 'base' ? r : '')).join('')}${L('Total de saídas', c.sai, 'tot')}${L('Saldo final', c.fim, 'tot')}</tbody></table></div>${ed && db.cen !== 'base' ? '<p style="color:var(--tx-3);font-size:.85rem">Para editar, volte ao cenário Base.</p>' : ''}`;
  },
  orcado() {
    const l = orcado(db.emp), ed = db.emp !== 'todas' && !travado(), mx = Math.max(...l.map((x) => Math.abs(x.r - x.o)), 1);
    const res = (k) => l.reduce((s, x) => s + (x.t === 'r' ? 1 : -1) * x[k], 0);
    let ln = 3;
    return `<div class="cab"><div><h1>Orçado x real · ${hx(MES)}</h1><p>${hx(empNome(db.emp))}. Desvio em vermelho é o que piorou o resultado.${ed ? ' Orçado e real são editáveis.' : ''}${db.rateiosLancados[COMP] ? ' O real já inclui o rateio lançado no mês.' : ''}</p></div><button class="b" data-a="exportar">Exportar .xlsx</button></div>${avisoTrava()}
      <div class="planilha"><table>${cabecalho(['Orçado', 'Real', 'Desvio', 'Desvio %', ''])}<tbody>${l.map((x, i) => { const d = x.r - x.o, ruim = x.t === 'r' ? d < 0 : d > 0; return `<tr><td class="nl">${ln++}</td><td class="rot">${hx(x.c)}</td><td class="v ${ed ? 'ed' : ''}">${ed ? `<input data-orc="${i}|o" data-ref="C${ln - 1}" inputmode="numeric" value="${n0(x.o)}" aria-label="Orçado de ${hx(x.c)}">` : n0(x.o)}</td><td class="v ${ed ? 'ed' : ''}">${ed ? `<input data-orc="${i}|r" data-ref="D${ln - 1}" inputmode="numeric" value="${n0(x.r)}" aria-label="Real de ${hx(x.c)}">` : n0(x.r)}</td><td class="v ${d ? (ruim ? 'neg' : 'pos') : ''}">${d > 0 ? '+' : ''}${n0(d)}</td><td class="v ${d ? (ruim ? 'neg' : 'pos') : ''}">${x.o ? `${(d / x.o * 100).toFixed(1).replace('.', ',')}%` : '—'}</td><td class="v" style="text-align:left;min-width:120px"><span class="barra-c ${ruim ? 'neg' : ''}" style="width:${Math.abs(d) / mx * 100}px"></span></td></tr>`; }).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Resultado operacional</td><td class="v">${n0(res('o'))}</td><td class="v">${n0(res('r'))}</td><td class="v ${res('r') < res('o') ? 'neg' : 'pos'}">${n0(res('r') - res('o'))}</td><td class="v">${res('o') ? `${((res('r') - res('o')) / Math.abs(res('o')) * 100).toFixed(1).replace('.', ',')}%` : '—'}</td><td></td></tr></tbody></table></div>`;
  },
  aprovar() {
    const l = db.pags.filter(doEmp), sel = l.filter((p) => p.sel && p.st === 'pendente');
    return `<div class="cab"><div><h1>Aprovações de pagamento</h1><p>Até ${R$(db.alcadas.gerente)} o gerente aprova, até ${R$(db.alcadas.diretor)} o diretor, acima disso só o dono. Você está como <b>${hx(quem())}</b> (troque em Equipe e alçadas). Aprovados vão para a remessa: um arquivo para pagar no banco.</p></div><div class="ferr"><button class="b" data-a="novo-pag">+ Pagamento</button><button class="b f" data-a="aprovar" ${sel.length && !travado() ? '' : 'disabled'}>Aprovar ${sel.length || ''} selecionado(s)</button><button class="b k" data-a="remessa" ${l.some((p) => p.st === 'aprovado') ? '' : 'disabled'}>Gerar remessa (CSV)</button></div></div>${avisoTrava()}
      <div class="planilha"><table>${cabecalho(['', 'Empresa', 'Fornecedor', 'O quê', 'Vence', 'Valor (R$)', 'Alçada', 'Situação'])}<tbody>${l.map((p, i) => `<tr><td class="nl">${i + 3}</td><td class="rot" style="min-width:40px"></td><td class="v" style="min-width:40px;text-align:center">${p.st === 'pendente' ? `<input type="checkbox" class="sel-c" data-sel="${p.id}" ${p.sel ? 'checked' : ''} aria-label="Selecionar ${hx(p.forn)}">` : ''}</td><td class="v txt">${hx(empNome(p.emp))}</td><td class="v txt"><b>${hx(p.forn)}</b></td><td class="v txt">${hx(p.desc)}</td><td class="v">${p.venc < 0 ? `vencido ${-p.venc}d` : `em ${p.venc} dia(s)`}</td><td class="v">${RC(p.c).replace('R$', '').trim()}</td><td class="v txt">${N.PAPEIS[N.alcadaNecessaria(db, p.c)]}</td><td class="v txt"><span class="st ${p.st === 'pendente' ? 'at' : 'ok'}" title="${p.aprov ? `aprovado por ${hx(p.aprov.quem)} (${hx(N.PAPEIS[p.aprov.papel] || '')})` : ''}">${p.st === 'remessa' ? 'na remessa' : p.st}</span></td></tr>`).join('') || `<tr><td class="nl">3</td><td class="rot"></td><td class="v txt" colspan="8">Nenhum pagamento.</td></tr>`}</tbody></table></div>`;
  },
  conciliar() {
    const l = [...db.extrato].sort((a, b) => b.dia - a.dia).map((e) => ({ ...e, cat: N.categoria(db, e), sug: N.sugerePagamento(db, e), p: e.pag && db.pags.find((x) => x.id === e.pag) })), auto = l.filter((x) => x.cat || x.p).length;
    return `<div class="cab"><div><h1>Conciliação</h1><p>${auto} de ${l.length} linha(s) do extrato (${l.length ? Math.round(auto / l.length * 100) : 0}%) se encaixaram por regra ou num pagamento aprovado. Importe o OFX ou CSV do banco; regra vale para os próximos meses e para todas as empresas. Não há ligação automática com o banco.</p></div><div class="ferr"><label class="b">Importar extrato<input type="file" id="arq-ext" accept=".ofx,.csv,.txt" hidden></label><button class="b f" data-a="regra">+ Regra</button></div></div>
      <div class="cartoes">${db.regras.map((r) => `<div class="cartao-i"><small>se a descrição contém</small><b style="font-size:.95rem">${hx(r.se)}</b><span>→ ${hx(r.cat)}</span> <button class="b" style="min-height:24px;padding:0 8px;float:right" data-a="tira-regra" data-id="${r.id}" aria-label="Remover regra">×</button></div>`).join('')}</div>
      <div class="planilha"><table>${cabecalho(['Dia', 'Descrição no banco', 'Valor (R$)', 'Categoria ou pagamento'])}<tbody>${l.map((x, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v">${N.isoDe(x.dia).split('-').reverse().join('/').slice(0, 5)}</td><td class="v txt">${hx(x.desc)}</td><td class="v ${x.c < 0 ? 'neg' : 'pos'}">${(x.c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td class="v txt">${x.p ? `<span class="st ok">pago: ${hx(x.p.forn)}</span> <button class="b" style="min-height:24px;padding:0 8px" data-a="desliga" data-e="${x.id}">desfazer</button>` : x.sug ? `<button class="b f" style="min-height:24px;padding:0 8px" data-a="liga" data-e="${x.id}" data-p="${x.sug.id}">É o pagamento a ${hx(x.sug.forn)}</button>` : x.cat ? `<span class="st ok">${hx(x.cat)}</span>` : `<span class="st ru">sem regra</span> <button class="b" style="min-height:24px;padding:0 8px" data-a="regra" data-desc="${hx(x.desc)}">criar</button>`}</td></tr>`).join('') || `<tr><td class="nl">3</td><td class="rot"></td><td class="v txt" colspan="4">Nenhuma linha. Importe o extrato do banco.</td></tr>`}</tbody></table></div>`;
  },
  fechar() {
    const ok = db.fech.filter((f) => f.ok).length, fch = db.fechados[COMP];
    return `<div class="cab"><div><h1>Fechamento de ${hx(MES)}</h1><p>${fch ? `Fechado em ${new Date(fch.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} por ${hx(fch.por)}: caixa, orçado, aprovações e rateio deste mês estão travados.` : 'Lista do que precisa estar feito antes de fechar o mês. Fechado, o mês trava contra alterações.'}</p></div><div class="ferr">${fch ? `<button class="b" data-a="reabrir" ${db.eu.papel === 'dono' ? '' : 'disabled'}>Reabrir ${hx(MES)}</button>` : `<button class="b f" data-a="fechar-mes" ${ok === db.fech.length ? '' : 'disabled'}>Fechar ${hx(MES)}</button>`}<button class="b" data-a="pacote">Pacote do contador (.xlsx)</button></div></div>
      <div class="progresso"><i style="width:${db.fech.length ? ok / db.fech.length * 100 : 0}%"></i></div><p style="margin:-6px 0 10px;color:var(--tx-2)">${ok} de ${db.fech.length} etapas</p>
      <div class="planilha"><table>${cabecalho(['Feito', 'Etapa', 'Responsável'])}<tbody>${db.fech.map((f, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v" style="text-align:center"><input type="checkbox" class="sel-c" data-fech="${f.id}" ${f.ok ? 'checked' : ''} ${fch ? 'disabled' : ''} aria-label="${hx(f.t)}"></td><td class="v txt">${f.ok ? `<s style="color:var(--tx-3)">${hx(f.t)}</s>` : hx(f.t)}</td><td class="v txt">${hx(f.resp)}</td></tr>`).join('')}</tbody></table></div>`;
  },
  indic() {
    const I = N.indicadores(db, orcado(db.emp), caixa13(db.emp), db.emp);
    return `<div class="cab"><div><h1>Indicadores</h1><p>${hx(empNome(db.emp))} · ${hx(N.nomeComp(COMP))}. Todos calculados dos dados desta planilha; a fonte aparece em cada cartão. Prazo médio de recebimento, liquidez e endividamento precisam do balanço e das contas a receber, que esta versão não guarda: por isso não aparecem.</p></div></div><div class="cartoes">${I.map(([t, v, s, fonte]) => `<div class="cartao-i"><small>${t}</small><b>${v}</b><span>${hx(s)}</span><span class="fonte">fonte: ${hx(fonte)}</span></div>`).join('')}</div>`;
  },
  rateio() {
    let ln = 3; const lanc = db.rateiosLancados[COMP], ed = !travado() && !lanc;
    return `<div class="cab"><div><h1>Rateio de despesas compartilhadas</h1><p>Despesas que uma empresa paga para o grupo inteiro. Cada linha precisa somar 100% e ter a conta de despesa. A divisão é exata em reais; lançar soma a parte de cada empresa no real do orçado x real de ${hx(MES)}, uma vez só.${lanc ? ` <b>Lançado em ${new Date(lanc.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} por ${hx(lanc.por)}.</b>` : ''}</p></div><div class="ferr">${lanc ? `<button class="b" data-a="estornar-rateio" ${travado() ? 'disabled' : ''}>Estornar rateio de ${hx(MES)}</button>` : `<button class="b" data-a="nova-linha-rateio" ${ed ? '' : 'disabled'}>+ Linha</button><button class="b f" data-a="lancar-rateio" ${ed ? '' : 'disabled'}>Lançar rateio de ${hx(MES)}</button>`}</div></div>${avisoTrava()}
      <div class="planilha"><table>${cabecalho(['Conta', 'Valor', ...EMP.map((e) => `${e.nome} %`), ...EMP.map((e) => e.nome), 'Soma %'])}<tbody>${db.rateio.map((r, i) => { const s = r.p.reduce((a, b) => a + b, 0); let partes = null; try { partes = N.ratear(r.v, r.p); } catch { /* soma ≠ 100 */ } return `<tr><td class="nl">${ln++}</td><td class="rot">${hx(r.d)}</td><td class="v txt">${ed ? `<select data-rcat="${i}" aria-label="Conta de ${hx(r.d)}"><option value="">escolher…</option>${N.CATS.filter(([, t]) => t === 'c').map(([c]) => `<option ${c === r.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>` : hx(r.cat || '—')}</td><td class="v ${ed ? 'ed' : ''}">${ed ? `<input data-rval="${i}" inputmode="numeric" value="${n0(r.v)}" aria-label="Valor de ${hx(r.d)}">` : n0(r.v)}</td>${r.p.map((p, j) => `<td class="v ${ed ? 'ed' : ''}">${ed ? `<input data-rat="${i}|${j}" data-ref="${COL(2 + j)}${ln - 1}" inputmode="numeric" value="${p}" aria-label="${hx(r.d)} ${hx(EMP[j].nome)} percentual">` : p}</td>`).join('')}${(partes || r.p.map(() => null)).map((v) => `<td class="v">${v === null ? '—' : n0(v)}</td>`).join('')}<td class="v ${s === 100 ? 'pos' : 'neg'}">${s}%</td></tr>`; }).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Total</td><td></td><td class="v">${n0(db.rateio.reduce((a, r) => a + r.v, 0))}</td>${EMP.map(() => '<td></td>').join('')}${EMP.map((_, j) => `<td class="v">${n0(db.rateio.reduce((a, r) => { try { return a + N.ratear(r.v, r.p)[j]; } catch { return a; } }, 0))}</td>`).join('')}<td></td></tr></tbody></table></div>`;
  },
  consol() {
    const c = N.consolidado(db, EMP); let ln = 3;
    return `<div class="cab"><div><h1>Consolidado do grupo · ${hx(MES)}</h1><p>Resultado (real) de cada empresa lado a lado. As eliminações tiram o que uma empresa do grupo cobrou da outra, da receita e do custo ao mesmo tempo: o resultado do grupo é a soma dos resultados.</p></div><button class="b f" data-a="nova-elim" ${travado() ? 'disabled' : ''}>+ Eliminação</button></div>
      <div class="planilha"><table>${cabecalho([...EMP.map((e) => e.nome), 'Eliminações', 'Grupo'])}<tbody>${c.linhas.map((x) => `<tr><td class="nl">${ln++}</td><td class="rot">${hx(x.c)}</td>${x.v.map((v) => `<td class="v">${n0(v)}</td>`).join('')}<td class="v ${x.el ? 'neg' : ''}">${x.el ? `−${n0(x.el)}` : ''}</td><td class="v">${n0(x.grupo)}</td></tr>`).join('')}
      <tr class="tot"><td class="nl">${ln++}</td><td class="rot">Resultado operacional</td>${c.porEmp.map((v) => `<td class="v ${v < 0 ? 'neg' : ''}">${n0(v)}</td>`).join('')}<td class="v">0</td><td class="v ${c.grupo < 0 ? 'neg' : ''}">${n0(c.grupo)}</td></tr></tbody></table></div>
      ${db.eliminacoes.length ? `<div class="cartoes" style="margin-top:12px">${db.eliminacoes.map((e) => `<div class="cartao-i"><small>${hx(e.receita)} ↔ ${hx(e.custo)}</small><b style="font-size:1.1rem">${R$(e.v)}</b><span>${hx(e.desc)}</span> <button class="b" style="min-height:24px;padding:0 8px;float:right" data-a="tira-elim" data-id="${e.id}" ${travado() ? 'disabled' : ''} aria-label="Remover eliminação">×</button></div>`).join('')}</div>` : ''}`;
  },
  audit() { return `<div class="cab"><div><h1>Auditoria</h1><p>Toda alteração de valor, aprovação, regra, rateio, remessa e fechamento: quem, quando e o quê (últimas 500).</p></div><button class="b" data-a="exportar-audit">Exportar .xlsx</button></div><div class="planilha"><table>${cabecalho(['Quando', 'Quem', 'O quê'])}<tbody>${db.audit.map((a, i) => `<tr><td class="nl">${i + 3}</td><td class="rot"></td><td class="v">${a.em ? new Date(a.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : hx(a.quando || '')}</td><td class="v txt">${hx(a.quem)}</td><td class="v txt">${hx(a.o)}</td></tr>`).join('') || '<tr><td class="nl">3</td><td class="rot"></td><td class="v txt" colspan="3">Nada registrado ainda.</td></tr>'}</tbody></table></div>`; },
  equipe() {
    const real = !!document.querySelector('[data-vc="equipe"]');
    return `<div class="cab"><div><h1>Equipe e alçadas</h1><p>Até quanto cada papel aprova, e quem está usando a planilha agora (vai para a auditoria).</p></div>${real ? '<button class="b f" data-a="equipe-real">Convites e acessos</button>' : ''}</div>
      <div class="cartoes"><div class="cartao-i"><small>Gerente aprova até (R$)</small><b><input data-alc="gerente" inputmode="numeric" value="${n0(db.alcadas.gerente)}" style="width:100%;border:1px solid var(--linha);font:inherit;padding:2px 6px" aria-label="Alçada do gerente"></b></div><div class="cartao-i"><small>Diretor aprova até (R$)</small><b><input data-alc="diretor" inputmode="numeric" value="${n0(db.alcadas.diretor)}" style="width:100%;border:1px solid var(--linha);font:inherit;padding:2px 6px" aria-label="Alçada do diretor"></b></div>
      <div class="cartao-i"><small>Quem está usando</small><label class="cp">Nome<input data-eu="nome" value="${hx(db.eu.nome)}" maxlength="40"></label><label class="cp">Papel<select data-eu="papel">${Object.entries(N.PAPEIS).map(([k, v]) => `<option value="${k}" ${db.eu.papel === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div></div>
      <p style="color:var(--tx-3);font-size:.85rem">${real ? 'Cada pessoa da equipe entra com o próprio login; os acessos (ver ou mexer) são definidos em Convites e acessos.' : 'Na demonstração o papel é escolhido aqui.'} O papel de alçada ainda é declarado por quem usa, não vem do login: para alçada obrigatória por usuário é preciso ligar o papel ao login na nuvem (pendente). Plano Assinatura · R$ 249/mês · equipe sem limite, até 10 empresas, anual com 20% a menos.</p>`;
  },
  ajustes() { const k = db.emp === 'todas' ? EMP[0].k : db.emp; return `<div class="cab"><div><h1>Ajustes</h1></div></div><div class="cartoes" style="grid-template-columns:1fr;max-width:640px"><div class="cartao-i"><label class="cp">Saldo inicial do caixa de ${hx(empNome(k))} (R$)<input data-saldo inputmode="numeric" value="${n0(db.caixa[k].saldo)}" ${travado() ? 'disabled' : ''}></label><p style="color:var(--tx-3);font-size:.86rem;margin:0">Integrações que dependem de contrato com terceiros e ainda não estão ligadas: extrato automático dos bancos (Open Finance), remessa e retorno CNAB do seu banco, notas de entrada da SEFAZ. Hoje o extrato entra por arquivo OFX/CSV e a remessa sai em CSV.</p></div><div class="cartao-i"><small>Empresas do grupo</small>${EMP.map((e) => `<p style="display:flex;justify-content:space-between;gap:8px;margin:6px 0"><span>${hx(e.nome)}</span><button class="b" data-a="renomeia-empresa" data-k="${e.k}">Renomear</button></p>`).join('')}<button class="b f" data-a="nova-empresa">+ Nova empresa do grupo</button></div><div class="cartao-i"><small>Cópia de segurança</small><p style="margin:6px 0"><button class="b" data-a="copia">Baixar cópia (.json)</button> <label class="b">Restaurar<input type="file" id="restaurar" accept=".json" hidden></label></p></div></div>`; },
};

function desenha() {
  const a = location.hash.slice(1) || 'caixa';
  if (falha) { $('#folha').innerHTML = `<div class="cab"><div><h1>Seus dados estão protegidos</h1><p>${hx(falha)} Nada é gravado enquanto isso não for resolvido.</p></div><button class="b f" data-a="bruto">Baixar o que estava guardado</button></div>`; return; }
  $('#empresa').innerHTML = [...EMP.map((e) => [e.k, e.nome]), ['todas', 'Consolidado do grupo']].map(([k, n]) => `<option value="${k}" ${db.emp === k ? 'selected' : ''}>${hx(n)}</option>`).join('') + '<option value="__nova">+ Nova empresa do grupo…</option>';
  const per = $('#periodo'); per.textContent = `${MES}/${COMP.slice(0, 4)} · ${travado() ? 'fechado' : 'aberto'}`; per.classList.toggle('fechado', travado());
  const n = { aprovar: db.pags.filter((p) => p.st === 'pendente' && doEmp(p)).length, conciliar: db.extrato.filter((e) => !N.categoria(db, e) && !e.pag).length, fechar: db.fech.filter((f) => !f.ok).length };
  const atual = F[a] ? a : 'caixa';
  $('#abas').innerHTML = GRUPOS.map(([g, ks]) => `<p class="gr">${g}</p>${ks.map((k) => `<a href="#${k}" ${k === atual ? 'aria-current="page"' : ''} title="${nomeAba(k)}"><span class="sig" aria-hidden="true">${SIGLA[k]}</span><span class="nm">${nomeAba(k)}</span>${n[k] ? `<span class="n">${n[k]}</span>` : '<span></span>'}</a>`).join('')}`).join('');
  $('#folha').innerHTML = F[atual]();
  const cab = $('#folha .cab'); if (cab && KPIS[atual]) cab.insertAdjacentHTML('afterend', `<div class="kpis">${KPIS[atual]().map(([t, v, sub = '', cls = '']) => `<div class="${cls}"><small>${t}</small><b>${v}</b><span>${sub}</span></div>`).join('')}</div>`);
  $('#status').innerHTML = `<span><b>${hx(empNome(db.emp))}</b></span><span class="${travado() ? 'ok' : ''}">${hx(N.nomeComp(COMP))}: ${travado() ? 'fechado' : 'aberto'}</span><a href="#aprovar" class="${n.aprovar ? 'al' : 'ok'}">${n.aprovar} para aprovar</a><a href="#conciliar" class="${n.conciliar ? 'al' : 'ok'}">${n.conciliar} sem categoria no extrato</a><a href="#fechar" class="${n.fechar ? 'al' : 'ok'}">${n.fechar} etapa(s) do fechamento</a><span class="eu">${hx(quem())}</span>`;
  document.title = `${(ABAS.find(([k]) => k === a) || ABAS[0])[1]} · Veltria Financeiro Avançado`;
}
addEventListener('hashchange', () => { desenha(); $('#folha').focus({ preventScroll: true }); });

// ------------------------------------------------------------------ barra de fórmula
const CMD = { caixa: 'caixa', fluxo: 'caixa', orcado: 'orcado', orcamento: 'orcado', aprovar: 'aprovar', aprovacoes: 'aprovar', conciliar: 'conciliar', conciliacao: 'conciliar', fechar: 'fechar', fechamento: 'fechar', indicadores: 'indic', rateio: 'rateio', consolidado: 'consol', auditoria: 'audit', equipe: 'equipe', ajustes: 'ajustes' };
function responde(p) {
  const x = sa(p);
  if (/fechar|fecham|falta/.test(x)) { if (travado()) return `${N.nomeComp(COMP)} já está fechado. Para alterar algo, o dono reabre o mês (fica na auditoria).`; const f = db.fech.filter((y) => !y.ok); return f.length ? `Faltam ${f.length} etapas para fechar ${MES}:\n${f.map((y) => `• ${y.t} (${y.resp})`).join('\n')}` : `Tudo pronto: pode fechar ${MES}.`; }
  if (/caixa|negativ|semana|aguent/.test(x)) { const c = caixa13(db.emp), mn = Math.min(...c.fim), i = c.fim.indexOf(mn); const g = db.cen; db.cen = 'pess'; const pe = Math.min(...caixa13(db.emp).fim); db.cen = g; return `${empNome(db.emp)}: menor saldo em 13 semanas é ${R$(mn)}, na semana ${i + 1}. No cenário pessimista: ${R$(pe)}.`; }
  if (/desvi|orcad|estour|pior/.test(x)) { const l = orcado(db.emp).map((y) => ({ ...y, d: y.t === 'r' ? y.o - y.r : y.r - y.o })).filter((y) => y.d > 0).sort((a, b) => b.d - a.d).slice(0, 3); return l.length ? `Maiores desvios contra o orçamento:\n${l.map((y) => `• ${y.c}: ${R$(y.d)} pior que o previsto`).join('\n')}` : 'Nenhuma conta pior que o orçado.'; }
  if (/aprov|pagar|pagament/.test(x)) { const l = db.pags.filter((y) => y.st === 'pendente').sort((a, b) => b.c - a.c); return `${l.length} pagamento(s) esperando aprovação, total ${RC(l.reduce((s, y) => s + y.c, 0))}.${l[0] ? ` O maior é ${l[0].forn} (${RC(l[0].c)}), alçada do ${N.PAPEIS[N.alcadaNecessaria(db, l[0].c)].toLowerCase()}.` : ''} Escreva =aprovar para abrir.`; }
  return 'Posso responder sobre caixa, orçamento, aprovações e fechamento. Comandos: =caixa, =orcado, =aprovar, =conciliar, =fechar, =indicadores, =rateio, =consolidado.';
}
$('#f-fx').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('#fx').value.trim(); if (!v) return;
  const c = v.startsWith('=') ? CMD[sa(v.slice(1)).replace(/\s/g, '')] : null;
  if (c) { location.hash = `#${c}`; $('#fx').value = ''; return; }
  const r = $('#resposta'), topo = `<button type="button" data-fecha-r aria-label="Fechar">×</button><span class="q">=${hx(v)}</span>`; r.hidden = false;
  if (window.veltriaIA) { r.innerHTML = `${topo}Pensando…`; window.veltriaIA(v).then((t) => { r.innerHTML = `${topo}${hx(t)}`; }); } else r.innerHTML = `${topo}${hx(responde(v))}`;
  $('#fx').value = '';
});

async function exportar(nome, abas) { const { baixarXlsx } = await import('../base/xlsx.js'); baixarXlsx(nome, abas); }
function abasPlanilha() {
  const c = caixa13(db.emp), sem = Array.from({ length: 13 }, (_, i) => `S${i + 1}`), lin = (rot, arr) => [rot, ...arr];
  return [{ nome: 'Caixa 13 semanas', linhas: [['Linha', ...sem], lin('Saldo inicial', c.ini), ...ENTRA.map((r) => lin(r, c.linhas[r])), lin('Total de entradas', c.ent), ...SAI.map((r) => lin(r, c.linhas[r])), lin('Total de saídas', c.sai), lin('Saldo final', c.fim)] },
    { nome: 'Orçado x real', linhas: [['Conta', 'Orçado', 'Real', 'Desvio'], ...orcado(db.emp).map((x) => [x.c, x.o, x.r, x.r - x.o])] },
    { nome: 'Pagamentos', linhas: [['Empresa', 'Fornecedor', 'O quê', 'Vencimento', 'Valor', 'Situação', 'Aprovado por'], ...db.pags.filter(doEmp).map((p) => [empNome(p.emp), p.forn, p.desc, N.isoDe(p.venc), { v: p.c / 100, t: 'moeda' }, p.st, p.aprov ? `${p.aprov.quem} (${N.PAPEIS[p.aprov.papel] || ''})` : ''])] },
    { nome: 'Extrato', linhas: [['Data', 'Descrição', 'Valor', 'Categoria'], ...db.extrato.map((e) => [N.isoDe(e.dia), e.desc, { v: e.c / 100, t: 'moeda' }, N.categoria(db, e) || (e.pag ? 'Pagamento a fornecedor' : '')])] }];
}
const nomeCampo = (k) => ({ gerente: 'gerente', diretor: 'diretor' })[k] || k;
const A = {
  exportar: () => { exportar(`planilha-${sa(empNome(db.emp)).replace(/\W+/g, '-')}-${COMP}.xlsx`, abasPlanilha()); N.registra(db, quem(), `exportou a planilha de ${empNome(db.emp)}`); guarda(); },
  pacote: () => { exportar(`pacote-contador-${COMP}.xlsx`, [...abasPlanilha(), { nome: 'Consolidado', linhas: [['Conta', ...EMP.map((e) => e.nome), 'Eliminações', 'Grupo'], ...N.consolidado(db, EMP).linhas.map((x) => [x.c, ...x.v, -x.el, x.grupo])] }, { nome: 'Auditoria', linhas: [['Quando', 'Quem', 'O quê'], ...db.audit.map((a) => [a.em ? a.em.slice(0, 16).replace('T', ' ') : a.quando, a.quem, a.o])] }]); N.registra(db, quem(), `baixou o pacote do contador de ${N.nomeComp(COMP)}`); guarda(); balao('Pacote baixado. Envie ao contador pelo seu e-mail.'); },
  'exportar-audit': () => exportar(`auditoria-${COMP}.xlsx`, [{ nome: 'Auditoria', linhas: [['Quando', 'Quem', 'O quê'], ...db.audit.map((a) => [a.em ? a.em.slice(0, 16).replace('T', ' ') : a.quando, a.quem, a.o])] }]),
  aprovar: () => { const ids = db.pags.filter((p) => p.sel && p.st === 'pendente' && doEmp(p)).map((p) => p.id); faz(() => N.aprovar(db, ids, db.eu.nome, db.eu.papel), (r) => `${r.aprovados.length} aprovado(s).${r.recusados.length ? ` ${r.recusados.length} acima da sua alçada (${N.PAPEIS[db.eu.papel]}): ficam esperando quem pode aprovar.` : ''}`); },
  remessa: () => faz(() => { const r = N.remessa(db, db.emp, quem()); baixa(`remessa-${r.id}.csv`, r.csv, 'text/csv;charset=utf-8'); return r; }, 'Remessa baixada (CSV). Pague pelo internet banking; quando o extrato chegar, a conciliação dá os pagamentos como pagos.'),
  'novo-pag': () => janela(`<h2>Novo pagamento para aprovar</h2><form><label class="cp">Empresa<select name="emp">${EMP.map((e) => `<option value="${e.k}" ${e.k === db.emp ? 'selected' : ''}>${hx(e.nome)}</option>`).join('')}</select></label><label class="cp">Fornecedor<input name="f" required maxlength="80"></label><label class="cp">O quê<input name="d" required maxlength="120"></label><label class="cp">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="cp">Vence em<input name="venc" type="date" required></label><p class="erro-j" hidden></p><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">Criar</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target), err = j.querySelector('.erro-j'); try { N.exigeAberto(db); const c = N.centavos(f.get('v')), d = N.diaDe(f.get('venc')); if (!Number.isInteger(c) || c <= 0) throw new Error('Valor inválido.'); if (!Number.isFinite(d)) throw new Error('Escolha o vencimento.'); const forn = String(f.get('f')).trim(); db.pags.push({ id: uid(), emp: f.get('emp'), forn, desc: String(f.get('d')).trim(), c, venc: d, st: 'pendente', sel: false }); N.registra(db, quem(), `lançou pagamento para aprovar: ${forn} · ${RC(c)}`); guarda(); fecha(); desenha(); } catch (x) { err.textContent = x.message; err.hidden = false; } })),
  liga: (d) => faz(() => N.ligarPagamento(db, d.e, d.p, quem()), 'Pagamento dado como pago pelo extrato.'),
  desliga: (d) => faz(() => N.desligarPagamento(db, d.e, quem()), 'Conciliação desfeita.'),
  'nova-empresa': () => formEmpresa(),
  'renomeia-empresa': (d) => formEmpresa(d.k),
  regra: (d) => janela(`<h2>Nova regra de conciliação</h2><form><label class="cp">Se a descrição contém<input name="se" value="${hx((d.desc || '').split(' ').slice(0, 2).join(' '))}" required maxlength="40"></label><label class="cp">Categoria<select name="cat">${['Recebimento de cliente', 'Pagamento a fornecedor', 'Tarifas bancárias', 'Despesas financeiras', 'Rendimentos', 'Energia', 'Folha e encargos', 'Reembolso a sócio', 'Transferência entre contas'].map((c) => `<option>${c}</option>`).join('')}</select></label><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">Criar regra</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target), se = String(f.get('se')).trim().toUpperCase(); if (!se) return; db.regras.push({ id: uid(), se, cat: f.get('cat') }); N.registra(db, quem(), `criou regra "${se}" → ${f.get('cat')}`); guarda(); fecha(); desenha(); })),
  'tira-regra': (d) => { const r = db.regras.find((x) => x.id === d.id); db.regras = db.regras.filter((x) => x !== r); N.registra(db, quem(), `removeu a regra "${r?.se}"`); guarda(); desenha(); },
  'fechar-mes': () => faz(() => N.fecharMes(db, COMP, quem()), `${N.nomeComp(COMP)} fechado e travado. Baixe o pacote do contador.`),
  reabrir: () => janela(`<h2>Reabrir ${hx(MES)}</h2><form><label class="cp">Motivo (vai para a auditoria)<input name="m" required maxlength="140"></label><p class="erro-j" hidden></p><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">Reabrir</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); try { N.reabrirMes(db, COMP, quem(), db.eu.papel, new FormData(e.target).get('m')); guarda(); fecha(); desenha(); balao('Mês reaberto.'); } catch (x) { const er = j.querySelector('.erro-j'); er.textContent = x.message; er.hidden = false; } })),
  'lancar-rateio': () => faz(() => N.lancarRateio(db, EMP, COMP, quem()), 'Rateio lançado: a parte de cada empresa entrou no real do orçado x real.'),
  'estornar-rateio': () => faz(() => N.estornarRateio(db, COMP, quem()), 'Rateio estornado.'),
  'nova-linha-rateio': () => { db.rateio.push({ d: 'Nova despesa compartilhada', v: 0, p: EMP.map((_, j) => (j === 0 ? 100 : 0)), cat: '' }); guarda(); desenha(); },
  'nova-elim': () => janela(`<h2>Eliminação intercompany</h2><form><label class="cp">O que é<input name="d" required maxlength="80" placeholder="Frete que a Logística cobra da Distribuidora"></label><label class="cp">Receita de quem cobrou<select name="r">${N.CATS.filter(([, t]) => t === 'r').map(([c]) => `<option>${c}</option>`).join('')}</select></label><label class="cp">Custo de quem pagou<select name="c">${N.CATS.filter(([, t]) => t === 'c').map(([c]) => `<option>${c}</option>`).join('')}</select></label><label class="cp">Valor do mês (R$)<input name="v" inputmode="numeric" required></label><p class="erro-j" hidden></p><div class="pe"><button type="button" class="b" data-fechar>Cancelar</button><button class="b f">Criar</button></div></form>`, (j, fecha) => j.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); try { N.exigeAberto(db); const v = N.inteiro(f.get('v')); if (!v) throw new Error('Valor maior que zero.'); db.eliminacoes.push({ id: uid(), desc: String(f.get('d')).trim(), receita: f.get('r'), custo: f.get('c'), v }); N.registra(db, quem(), `criou eliminação ${f.get('d')} de ${R$(v)}`); guarda(); fecha(); desenha(); } catch (x) { const er = j.querySelector('.erro-j'); er.textContent = x.message; er.hidden = false; } })),
  'tira-elim': (d) => faz(() => { N.exigeAberto(db); const e = db.eliminacoes.find((x) => x.id === d.id); db.eliminacoes = db.eliminacoes.filter((x) => x !== e); N.registra(db, quem(), `removeu a eliminação ${e?.desc}`); }),
  'equipe-real': () => document.querySelector('[data-vc="equipe"]')?.click(),
  copia: () => baixa(`veltria-financeiro-avancado-${N.hojeISO()}.json`, JSON.stringify(db, null, 1), 'application/json'),
  bruto: () => { let t = ''; try { t = localStorage.getItem(CHAVE) || ''; } catch { /* */ } baixa('guardado.json', t, 'application/json'); },
  plano: (d) => { db.plano = d.v; guarda(); desenha(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-fecha-r]')) { $('#resposta').hidden = true; return; }
  const c = t.closest('[data-cen]'); if (c) { db.cen = c.dataset.cen; guarda(); desenha(); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a] && !a.disabled) A[a.dataset.a](a.dataset);
});
document.addEventListener('focusin', (e) => { $('#ref').textContent = e.target.dataset?.ref || 'A1'; });
document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  const muda = (fn) => faz(() => { N.exigeAberto(db); fn(); });
  if (d.cel) muda(() => { const [r, i] = d.cel.split('|'), ant = db.caixa[db.emp].linhas[r][i], v = N.inteiro(t.value); db.caixa[db.emp].linhas[r][i] = v; N.registra(db, quem(), `alterou ${r} da semana ${Number(i) + 1} de ${empNome(db.emp)}: ${R$(ant)} → ${R$(v)}`); });
  if (d.orc) muda(() => { const [i, k] = d.orc.split('|'), l = db.orc[db.emp][i], ant = l[k], v = N.inteiro(t.value); l[k] = v; N.registra(db, quem(), `alterou o ${k === 'o' ? 'orçado' : 'real'} de ${l.c} em ${empNome(db.emp)}: ${R$(ant)} → ${R$(v)}`); });
  if (d.sel) { db.pags.find((p) => p.id === d.sel).sel = t.checked; guarda(); desenha(); }
  if (d.fech) muda(() => { const f = db.fech.find((x) => x.id === d.fech); f.ok = t.checked; N.registra(db, quem(), `${t.checked ? 'concluiu' : 'reabriu'} a etapa "${f.t}"`); });
  if (d.rat) muda(() => { const [i, j] = d.rat.split('|').map(Number), v = N.inteiro(t.value); if (v > 100) throw new Error('Percentual até 100.'); db.rateio[i].p[j] = v; });
  if (d.rval) muda(() => { db.rateio[d.rval].v = N.inteiro(t.value); });
  if (d.rcat) muda(() => { db.rateio[d.rcat].cat = t.value; });
  if (d.alc) faz(() => { const v = N.inteiro(t.value), outro = d.alc === 'gerente' ? db.alcadas.diretor : db.alcadas.gerente; if (d.alc === 'gerente' ? v > outro : v < outro) throw new Error('A alçada do diretor precisa ser maior que a do gerente.'); const ant = db.alcadas[d.alc]; db.alcadas[d.alc] = v; N.registra(db, quem(), `mudou a alçada do ${nomeCampo(d.alc)}: ${R$(ant)} → ${R$(v)}`); });
  if (d.eu) { const ant = quem(); db.eu[d.eu] = d.eu === 'nome' ? t.value.trim().slice(0, 40) || 'Você' : t.value; N.registra(db, ant, `passou a usar como ${quem()}`); guarda(); desenha(); }
  if ('saldo' in d) muda(() => { const k = db.emp === 'todas' ? EMP[0].k : db.emp, v = N.inteiro(t.value, { negativo: true }); N.registra(db, quem(), `mudou o saldo inicial de ${empNome(k)}: ${R$(db.caixa[k].saldo)} → ${R$(v)}`); db.caixa[k].saldo = v; });
  if (t.id === 'empresa') { if (t.value === '__nova') { t.value = db.emp; formEmpresa(); return; } db.emp = t.value; guarda(); desenha(); }
  if (t.id === 'arq-ext' && t.files[0]) { const f = t.files[0]; if (f.size > 5e6) return balao('Arquivo grande demais (máximo 5 MB).'); f.text().then((txt) => { const r = N.lerExtrato(txt, f.name), novas = N.importarExtrato(db, r.linhas, f.name, quem()); guarda(); desenha(); balao(`${novas.length} linha(s) nova(s), ${r.linhas.length - novas.length} repetida(s), ${r.erros.length} com problema${r.erros[0] ? ` (linha ${r.erros[0].linha}: ${r.erros[0].motivo})` : ''}.`); }); }
  if (t.id === 'restaurar' && t.files[0]) { t.files[0].text().then((txt) => { let d2; try { d2 = JSON.parse(txt); d2 = d2.formato >= 2 ? d2 : N.migrar(d2); if (!Array.isArray(d2.pags) || !d2.caixa) throw new Error('arquivo incompleto'); } catch (x) { return balao(`Cópia inválida: ${x.message}`); } try { localStorage.setItem(`${CHAVE}-antes-de-restaurar:${CONTA}`, JSON.stringify(db)); } catch { return balao('Sem espaço para guardar os dados atuais. Nada foi alterado.'); } db = d2; lerEmpresas(); N.registra(db, quem(), 'restaurou uma cópia de segurança'); guarda(); desenha(); balao('Cópia restaurada.'); }); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '=' && !e.target.closest?.('input, select, textarea')) { e.preventDefault(); $('#fx').focus(); $('#fx').value = '='; }
  // setas para cima e para baixo andam entre as células editáveis da mesma coluna, como numa planilha
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') && e.target.dataset?.ref) {
    const l = [...document.querySelectorAll('[data-ref]')], col = e.target.dataset.ref.replace(/\d+/, ''), mesmas = l.filter((x) => x.dataset.ref.replace(/\d+/, '') === col), i = mesmas.indexOf(e.target), prox = mesmas[i + (e.key === 'ArrowUp' ? -1 : 1)];
    if (prox) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector(`[data-ref="${prox.dataset.ref}"]`)?.focus(); }
  }
});
$('#recomecar').addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch { /* */ } db = inicio(); lerEmpresas(); location.hash = '#caixa'; $('#resposta').hidden = true; desenha(); balao('Demonstração recomeçada.'); });
try { if (!localStorage.getItem(CHAVE) && !protegido) guarda(); } catch { /* */ }
desenha();

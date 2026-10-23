// Veltria Financeiro Completo · "fluxo do mês" para pequena empresa de serviços (climatização, manutenção).
// A tela principal é a régua dos próximos 30 dias com o saldo projetado; a receber com régua de cobrança e PIX,
// a pagar com leitura de boleto, conciliação do extrato do banco (OFX/CSV), contratos mês a mês, orçamentos,
// resultado por competência e por caixa com o pacote do contador. Regras do dinheiro: nucleo.js. Dados de exemplo (?novo recomeça).

import * as N from './nucleo.js';

const CHAVE = 'veltria-financeiro-completo-v1';
const CONTA = new URLSearchParams(location.search).get('conta') || 'demo';
const R$ = N.reais;
const R0 = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const h = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const $ = (s) => document.querySelector(s);
const data = (o, curto) => { const d = N.dataDe(o); return o === 0 && !curto ? 'hoje' : o === 1 && !curto ? 'amanhã' : d.toLocaleDateString('pt-BR', curto ? { day: '2-digit' } : { day: '2-digit', month: '2-digit' }); };
const semana = (o) => N.dataDe(o).toLocaleDateString('pt-BR', { weekday: 'long' });
const nomeMes = (comp) => new Date(`${comp}-15T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

// ------------------------------------------------------------------ dados: exemplo, carregar com migração e cópia, gravar
function base() {
  const db = { formato: N.FORMATO, empresa: 'Climatiza BH Refrigeração', pix: '12.345.678/0001-90', cidade: 'Belo Horizonte', saldoInicial: { c: 1843000 }, lancs: [], extrato: [], contratos: [], orcs: [], regua: [-3, 0, 3, 10], imposto: 6, plano: 'basico', conversa: [], historico: [] };
  const L = (tipo, quem, desc, c, venc, cat, tel) => N.novaConta(db, { tipo, quem, desc, c, venc, cat, tel })[0];
  [['Clínica Sorriso Pleno', 'Instalação split 12.000 BTUs (3 un.)', 384000, -6, 'Instalação', '31991230001'], ['Escritório Andrade & Lima', 'PMOC mensal', 145000, -2, 'Contratos', '31991230002'], ['Hotel Savassi', 'Manutenção corretiva VRF', 620000, 0, 'Manutenção', '31991230003'],
    ['Colégio Horizonte', 'PMOC mensal', 230000, 3, 'Contratos', '31991230004'], ['Academia Forma', 'Higienização 8 aparelhos', 128000, 5, 'Manutenção', '31991230005'], ['Restaurante Dom Tempero', 'Projeto de climatização (50%)', 950000, 12, 'Projetos', '31991230006'], ['Loja Bem Vestir', 'Instalação cassete', 410000, 18, 'Instalação', '31991230007']].forEach((x) => L('r', ...x));
  [['Farmácia Central', 'Manutenção preventiva', 89000, -12, 'Manutenção'], ['Ana Ribeiro', 'Instalação split (2 un.)', 215000, -9, 'Instalação']].forEach((x) => { const l = L('r', ...x); N.baixar(db, l.id, l.c, { dia: l.venc }); });
  [['Equipe', 'Folha de pagamento (5 técnicos)', 1420000, 6, 'Pessoal'], ['Imobiliária Lar', 'Aluguel do galpão', 430000, 9, 'Estrutura'], ['Frigelar Distribuidora', 'Compra de evaporadoras', 1980000, 4, 'Material'], ['Receita Federal', 'Simples Nacional (DAS)', 318000, 19, 'Impostos'],
    ['Posto Rota', 'Combustível e pedágio', 164000, 2, 'Veículos'], ['Dufrio', 'Gás refrigerante R410A', 238000, 14, 'Material'], ['Banco Mercantil', 'Parcela da van', 219000, 21, 'Veículos'], ['Contabilidade Exata', 'Contador', 98000, 10, 'Estrutura']].forEach((x) => L('p', ...x));
  [['Cemig / Vivo', 'Energia e internet', 76000, -4, 'Estrutura'], ['Leroy Merlin', 'Ferramentas', 132000, -8, 'Material']].forEach((x) => { const l = L('p', ...x); N.baixar(db, l.id, l.c, { dia: l.venc }); });
  N.importarExtrato(db, [[-1, 'PIX RECEBIDO SAVASSI HOTEL LTDA', 200000], [-2, 'PIX RECEB ANDRADE LIMA ADV', 145000], [-4, 'PAG CEMIG DISTRIBUICAO', -48600], [-4, 'PAG VIVO S/A', -27400], [-3, 'TARIFA PACOTE SERVICOS', -7990], [-1, 'PIX RECEB MARCELO SOUZA', 35000]].map(([dia, desc, c]) => ({ dia, desc, c: Math.abs(c), tipo: c > 0 ? 'entra' : 'sai' })), 'exemplo.ofx');
  db.contratos = [['Escritório Andrade & Lima', 'PMOC · 14 aparelhos', 145000, 5], ['Colégio Horizonte', 'PMOC · 32 aparelhos', 230000, 10], ['Hotel Savassi', 'Preventiva trimestral VRF', 390000, 15], ['Clínica Sorriso Pleno', 'PMOC · 9 aparelhos', 98000, 20]].map(([cli, plano, c, dia], i) => ({ id: `k${i}`, cli, plano, c, dia, tel: '', ativo: true, desde: N.hojeISO().slice(0, 7) }));
  const comp = N.hojeISO().slice(0, 7); db.lancs.filter((l) => /PMOC mensal/.test(l.desc)).forEach((l) => { const k = db.contratos.find((x) => x.cli === l.quem); if (k) { l.contrato = k.id; l.comp = comp; } });
  db.orcs = [['Supermercado Bom Preço', 'Câmara fria · manutenção', 560000, 'enviado', -2], ['Igreja Batista Centro', '6 splits 24.000 BTUs instalados', 2140000, 'enviado', -5], ['Dra. Paula Mendes', 'Split 9.000 BTUs', 235000, 'aprovado', -1]].map(([cli, desc, c, st, dia], i) => ({ id: `o${i}`, cli, desc, c, st, dia, tel: '' }));
  db.historico = [];
  return db;
}
let falha = '', protegido = false;
const parece2 = (d) => d && (d.formato >= 2 || (d.saldoInicial && Array.isArray(d.lancs)));
function arruma(d) { d.formato = N.FORMATO; ['lancs', 'extrato', 'contratos', 'orcs', 'historico', 'conversa'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; }); if (!d.saldoInicial || !Number.isInteger(d.saldoInicial.c)) d.saldoInicial = { c: 0 }; if (!Array.isArray(d.regua)) d.regua = [-3, 0, 3]; d.lancs.forEach((l) => { l.pagamentos ||= []; l.avisos ||= []; }); return d; }
function carregar() {
  if (new URLSearchParams(location.search).has('novo')) try { localStorage.removeItem(CHAVE); } catch { /* */ }
  let txt = null; try { txt = localStorage.getItem(CHAVE); } catch { /* */ }
  if (!txt) return base();
  let bruto; try { bruto = JSON.parse(txt); } catch { falha = 'Os dados guardados neste navegador estão ilegíveis.'; protegido = true; return base(); }
  if (parece2(bruto)) { const d = arruma(bruto), s = JSON.stringify(d); if (s !== txt) try { localStorage.setItem(CHAVE, s); } catch { /* */ } return d; }
  try { localStorage.setItem(`${CHAVE}-copia-formato1:${CONTA}`, txt); } catch { falha = 'Sem espaço para guardar a cópia antes de atualizar os dados.'; protegido = true; return base(); }
  try { const d = arruma(N.migrar(bruto)); localStorage.setItem(CHAVE, JSON.stringify(d)); return d; } catch (e) { falha = `Não consegui atualizar os dados (${e.message}). Nada foi apagado.`; protegido = true; return base(); }
}
let db = carregar();
window.veltriaDados = () => db;
window.veltriaEditorFora = ['lancs', 'extrato', 'contratos', 'orcs', 'historico'];
window.veltriaSemMaisComum = true;
window.veltriaDadosProprio = () => { location.hash = '#dados'; };
window.veltriaResumoIA = () => { const p = N.projecao(db), min = p.reduce((a, x) => (x.saldo < a.saldo ? x : a), p[0]), r = N.resultado(db, N.hojeISO().slice(0, 7), db.imposto); return [`Saldo hoje ${R$(N.saldoHoje(db))}; em 30 dias ${R$(p[29].saldo)}; menor saldo ${R$(min.saldo)} em ${data(min.d)}.`, `A receber em aberto: ${N.abertos(db, 'r').map((l) => `${l.quem} ${R$(N.situacao(l).falta)} ${N.situacao(l).st}`).slice(0, 15).join('; ')}.`, `A pagar em aberto: ${N.abertos(db, 'p').map((l) => `${l.quem} ${R$(N.situacao(l).falta)} vence ${data(l.venc)}`).slice(0, 15).join('; ')}.`, `Mês: receita ${R$(r.receita)}, despesas ${R$(r.despesas)}, imposto estimado ${R$(r.impostoEst)}, lucro ${R$(r.lucro)}. Extrato sem conciliar: ${db.extrato.filter((e) => !e.conc).length} linha(s).`].join('\n'); };
const salva = () => { if (protegido) { nota('Dados protegidos: nada foi gravado.', 1); return; } try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { nota('Sem espaço no navegador: não consegui salvar.', 1); } };
const lanc = (id) => db.lancs.find((l) => l.id === id);
let diaSel = 0, filtroR = '', filtroP = '', compRes = N.hojeISO().slice(0, 7);

function nota(t, erro) { const a = document.createElement('div'); a.className = `nota${erro ? ' ruim' : ''}`; a.textContent = t; $('#notas').append(a); setTimeout(() => a.remove(), erro ? 5200 : 3300); }
function caixa(html, liga) {
  const v = document.createElement('div'); v.className = 'veu-f'; v.innerHTML = `<div class="cx-f" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sai]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.cx-f'), fecha);
}
/** Formulário: o erro aparece dentro da caixa e ela só fecha quando deu certo. */
function formulario(titulo, campos, ok, fn) {
  caixa(`<h2>${titulo}</h2><form novalidate>${campos}<p class="erro-f" role="alert" hidden></p><div class="rod"><button type="button" class="bt" data-sai>Cancelar</button><button class="bt p">${ok}</button></div></form>`, (c, fecha) => {
    const f = c.querySelector('form'), err = c.querySelector('.erro-f');
    f.addEventListener('submit', (e) => { e.preventDefault(); try { const r = fn(new FormData(f)); if (r === false) return; salva(); fecha(); tela(); if (typeof r === 'string') nota(r); } catch (x) { err.textContent = x.message; err.hidden = false; } });
  });
}
const valorC = (v) => { const c = N.centavos(v); if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero (ex.: 1.250,00).'); return c; };
const diaC = (v) => { const d = N.diaDe(v); if (!Number.isFinite(d)) throw new Error('Escolha uma data válida.'); return d; };
const cValor = (n, rot, c) => `<label class="cmp">${rot}<input name="${n}" inputmode="decimal" autocomplete="off" required value="${c ? (c / 100).toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>`;
const cData = (n, rot, d) => `<label class="cmp">${rot}<input name="${n}" type="date" required value="${N.isoDe(d ?? 0)}"></label>`;
const tagSt = (l) => { const s = N.situacao(l); return s.st === 'quitado' ? `<span class="tag ok">${l.tipo === 'r' ? 'recebido' : 'pago'}</span>` : s.st === 'cancelado' ? '<span class="tag">cancelado</span>' : s.st === 'atrasado' ? `<span class="tag ru">${-l.venc} dia(s) atrasado</span>` : `<span class="tag ${s.st === 'hoje' || (l.tipo === 'p' && l.venc <= 2) ? 'at' : ''}">${data(l.venc)}</span>`; };

const ICONES = { fluxo: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>', receber: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>', pagar: '<path d="M12 20V8M7 13l5-5 5 5"/><path d="M4 4h16"/>', conciliar: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M10 9h4M10 15h4"/>', contratos: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M14 3v4h4"/>', orcamentos: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>', resultado: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', historico: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.6.2 4.2 2 4.8 4.9"/>', ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>' };
const SECOES = [['fluxo', 'Visão geral'], ['receber', 'A receber'], ['pagar', 'A pagar'], ['conciliar', 'Conciliar'], ['contratos', 'Contratos'], ['orcamentos', 'Orçamentos'], ['resultado', 'Resultado'], ['historico', 'Histórico'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const GRUPOS = [['Visão geral', ['fluxo']], ['Dinheiro', ['receber', 'pagar', 'conciliar']], ['Recorrência', ['contratos', 'orcamentos']], ['Análise', ['resultado', 'historico']], ['Empresa', ['equipe', 'ajustes']]];
const nomeSecao = (k) => (SECOES.find(([x]) => x === k) || [0, k])[1];
let chipR = 'abertas', chipP = 'abertas';
const FILTROS = [['abertas', 'Em aberto', (l, s) => s.falta > 0], ['atrasadas', 'Atrasadas', (l, s) => s.st === 'atrasado'], ['semana', 'Próximos 7 dias', (l, s) => s.falta > 0 && l.venc >= 0 && l.venc <= 7], ['quitadas', 'Quitadas', (l, s) => s.st === 'quitado'], ['todas', 'Todas', () => true]];

function tabelaContas(tipo, filtro, chip) {
  const q = sa(filtro), base = db.lancs.filter((x) => x.tipo === tipo), sit = new Map(base.map((x) => [x.id, N.situacao(x)]));
  const fn = (FILTROS.find(([k]) => k === chip) || FILTROS[0])[2];
  const l = base.filter((x) => fn(x, sit.get(x.id)) && (!q || sa(`${x.quem} ${x.desc} ${x.cat} ${x.cc}`).includes(q))).sort((a, b) => (sit.get(a.id).falta ? 0 : 1) - (sit.get(b.id).falta ? 0 : 1) || a.venc - b.venc);
  const soma = (f) => l.reduce((s, x) => s + f(sit.get(x.id), x), 0);
  return `<div class="filtros" role="group" aria-label="Filtrar">${FILTROS.map(([k, n, f]) => `<button type="button" class="chip" data-chip="${tipo}:${k}" aria-pressed="${chip === k}">${n}<span class="q">${base.filter((x) => f(x, sit.get(x.id))).length}</span></button>`).join('')}<input type="search" class="busca" data-busca="${tipo}" placeholder="${tipo === 'r' ? 'Procurar cliente, serviço…' : 'Procurar fornecedor, categoria…'}" value="${h(filtro)}" aria-label="Procurar"></div>
    <p class="totais"><span>${l.length} conta(s)</span><span>Valor <b>${R$(soma((s, x) => x.c))}</b></span><span>${tipo === 'r' ? 'Falta receber' : 'Falta pagar'} <b>${R$(soma((s) => s.falta))}</b></span></p>
    <section class="pl tab-wrap"><div class="rolagem"><table><thead><tr><th>Vence</th><th>${tipo === 'r' ? 'Cliente' : 'Fornecedor'}</th><th>O quê</th><th class="dir">Valor</th><th class="dir">Falta</th>${tipo === 'r' ? '<th>Régua de cobrança</th>' : '<th>Categoria</th>'}<th><span class="sr">Ações</span></th></tr></thead><tbody>${l.map((x) => { const s = sit.get(x.id); return `<tr tabindex="0" class="clicavel ${s.falta ? '' : 'feito'}" data-a="abrir" data-id="${x.id}" title="Abrir ${h(x.quem)}"><td class="col-st">${tagSt(x)}</td><td><b>${h(x.quem)}</b></td><td class="esconde-cel">${h(x.desc)}<br><small class="vazio">${h(x.cat)}${x.cc ? ` · ${h(x.cc)}` : ''}</small></td><td class="dir m esconde-cel">${R$(x.c)}</td><td class="dir m">${s.falta ? R$(s.falta) : '—'}${s.parcial ? '<br><small class="vazio">parcial</small>' : ''}</td>
    <td class="esconde-cel">${tipo === 'r' ? (s.falta ? `<div class="passos">${db.regua.map((d) => { const dd = x.venc + d; return `<span class="${x.avisos.includes(dd) ? 'ok' : dd === 0 ? 'prox' : ''}" title="${d < 0 ? `${-d}d antes` : d === 0 ? 'no dia' : `${d}d depois`}">${data(dd, true)}</span>`; }).join('')}</div>` : '') : `<span class="tag ch">${h(x.cat)}</span>`}</td>
    <td class="col-st">${s.falta ? `<div class="grupo">${tipo === 'r' ? `<button class="bt x" data-a="cobrar" data-id="${x.id}">Cobrar</button>` : ''}<button class="bt x p" data-a="baixa" data-id="${x.id}">${tipo === 'r' ? 'Recebi' : 'Paguei'}</button></div>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="7" class="vazio-c">Nada neste filtro.</td></tr>`}</tbody></table></div></section>`;
}
const V = {
  fluxo() {
    const p = N.projecao(db), min = p.reduce((a, x) => (x.saldo < a.saldo ? x : a), p[0]), maxS = Math.max(...p.map((x) => Math.abs(x.saldo)), 1), maxB = Math.max(...p.map((x) => Math.max(x.ent, x.sai)), 1);
    const W = 900, cw = W / 30, yS = (v) => 70 - v / maxS * 58, bar = (v) => v / maxB * 52;
    const linha = p.map((x, i) => `${i ? 'L' : 'M'}${(i + 0.5) * cw},${yS(x.saldo)}`).join(' ');
    const sel = p[diaSel] || p[0], doDia = N.abertos(db).filter((l) => (diaSel === 0 ? l.venc <= 0 : l.venc === diaSel));
    const aRec = N.abertos(db, 'r'), aPag = N.abertos(db, 'p'), atras = aRec.filter((l) => l.venc < 0), fim = p[p.length - 1], pend = N.pendencias(db);
    const falta = (l) => l.reduce((a, x) => a + N.situacao(x).falta, 0), sem = N.abertos(db).filter((l) => l.venc >= 0 && l.venc <= 7).sort((a, b) => a.venc - b.venc);
    return `<div class="titulo"><div><h1>Visão geral</h1><p>Saldo de hoje (abertura + recebido − pago) e o que falta receber e pagar nos próximos 30 dias.</p></div><div class="grupo"><button class="bt" data-a="novo" data-t="r">+ A receber</button><button class="bt p" data-a="novo" data-t="p">+ A pagar</button></div></div>
      ${min.saldo < 0 ? `<div class="alerta-neg" role="alert"><span aria-hidden="true">!</span><div><b>O caixa fica negativo ${data(min.d)}: ${R$(min.saldo)}.</b><small>Cobre os atrasados (${R$(falta(atras))}) ou adie um pagamento. Clique no dia no gráfico para ver o que vence.</small></div></div>` : ''}
      <div class="numeros">
        <div class="num destaque"><small>Saldo hoje</small><b class="m">${R0(N.saldoHoje(db))}</b><span>abertura + recebido − pago</span></div>
        <div class="num"><small>Daqui a 30 dias</small><b class="m ${fim.saldo < 0 ? 'v-sai' : ''}">${R0(fim.saldo)}</b><span>menor saldo ${R0(min.saldo)} ${data(min.d)}</span></div>
        <div class="num"><small>Falta receber</small><b class="m v-entra">${R0(falta(aRec))}</b><span>${aRec.length} cobrança(s) · ${atras.length} atrasada(s)</span></div>
        <div class="num"><small>Falta pagar</small><b class="m v-sai">${R0(falta(aPag))}</b><span>${aPag.length} conta(s)</span></div>
      </div>
      <div class="fluxo-corpo"><section class="pl"><h2>Saldo dia a dia <small>próximos 30 dias · previsto</small></h2><div class="regua-mes"><svg viewBox="0 0 ${W} 210" role="img" aria-label="Saldo projetado e movimentos dos próximos 30 dias">
        <line x1="0" x2="${W}" y1="${yS(0)}" y2="${yS(0)}" stroke="#a5533f" stroke-dasharray="4 4" stroke-width="1"/>
        ${p.map((x, i) => `<g class="dia-col" data-dia="${i}"><rect class="fundo" x="${i * cw + 1}" y="0" width="${cw - 2}" height="210" rx="4" fill="${i === diaSel ? '#ece5d4' : 'transparent'}"/>
          ${x.ent ? `<rect x="${i * cw + cw * 0.22}" y="${150 - bar(x.ent)}" width="${cw * 0.56}" height="${bar(x.ent)}" rx="2" fill="#3f7a5f"/>` : ''}${x.sai ? `<rect x="${i * cw + cw * 0.22}" y="150" width="${cw * 0.56}" height="${bar(x.sai)}" rx="2" fill="#c08a73"/>` : ''}
          <text x="${(i + 0.5) * cw}" y="${i % 2 ? 206 : 196}" text-anchor="middle">${data(i, true)}</text></g>`).join('')}
        <line x1="0" x2="${W}" y1="150" y2="150" stroke="#d8d0c1"/><path d="${linha}" fill="none" stroke="#203b32" stroke-width="2.5" stroke-linejoin="round"/>
        ${p.filter((x) => x.saldo < 0).map((x) => `<circle cx="${(x.d + 0.5) * cw}" cy="${yS(x.saldo)}" r="3.5" fill="#a5533f"/>`).join('')}
      </svg></div><div class="legenda"><span style="--c:#203b32">saldo projetado</span><span style="--c:#3f7a5f">entra</span><span style="--c:#c08a73">sai</span><span style="--c:#a5533f">linha do zero</span></div></section>
      <section class="pl dia-escolhido"><h2>${diaSel === 0 ? 'Hoje' : data(diaSel)} <small>${semana(diaSel)}${diaSel === 0 ? ' · com atrasados' : ''}</small></h2><p class="fim-dia">Saldo no fim do dia <b class="m ${sel.saldo < 0 ? 'v-sai' : ''}">${R$(sel.saldo)}</b></p>
        <ul class="movs">${doDia.map((l) => `<li><span class="sinal ${l.tipo === 'r' ? 'e' : 's'}" aria-hidden="true">${l.tipo === 'r' ? '↓' : '↑'}</span><div><button class="lk" data-a="abrir" data-id="${l.id}"><b>${h(l.desc)}</b></button><small>${h(l.quem)}${l.venc < 0 ? ` · atrasado ${-l.venc} dia(s)` : ''}${N.situacao(l).parcial ? ' · parcial' : ''}</small></div><div class="lado"><span class="m ${l.tipo === 'r' ? 'v-entra' : 'v-sai'}">${l.tipo === 'r' ? '+' : '−'}${R$(N.situacao(l).falta)}</span><button class="bt x" data-a="baixa" data-id="${l.id}">${l.tipo === 'r' ? 'Recebi' : 'Paguei'}</button></div></li>`).join('') || '<li class="vazio">Nada vence neste dia. Escolha outro dia no gráfico.</li>'}</ul></section></div>
      <div class="grade"><section class="pl s6"><h2>Pede atenção <small>conferido agora · nada é feito sem você</small></h2>${pend.length ? pend.map((x) => `<a class="pend-i ${x.tipo}" href="#${x.ir}"><span>${h(x.txt)}</span><span aria-hidden="true">›</span></a>`).join('') : '<p class="vazio">Nada pendente.</p>'}</section>
      <section class="pl s6"><h2>Próximos 7 dias <small>${sem.length} conta(s)</small></h2>${sem.length ? `<table class="prox-l"><tbody>${sem.slice(0, 9).map((l) => `<tr tabindex="0" class="clicavel" data-a="abrir" data-id="${l.id}"><td>${data(l.venc)}</td><td>${h(l.quem)}<br><small class="vazio">${h(l.desc)}</small></td><td class="dir m ${l.tipo === 'r' ? 'v-entra' : 'v-sai'}">${l.tipo === 'r' ? '+' : '−'}${R$(N.situacao(l).falta)}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nada vence na semana.</p>'}</section></div>`;
  },
  receber() { return `<div class="titulo"><div><h1>A receber</h1><p>Clique numa conta para ver as baixas, editar ou cancelar. Cobrar abre o WhatsApp com a mensagem e o PIX copia e cola da empresa; você confere e envia.</p></div><button class="bt p" data-a="novo" data-t="r">+ A receber</button></div>${tabelaContas('r', filtroR, chipR)}`; },
  pagar() { return `<div class="titulo"><div><h1>A pagar</h1><p>Clique numa conta para ver as baixas, editar, adiar ou cancelar. O boleto pode ser lido pela linha digitável.</p></div><div class="grupo"><button class="bt" data-a="ler-boleto">Ler código de boleto</button><button class="bt p" data-a="novo" data-t="p">+ A pagar</button></div></div>${tabelaContas('p', filtroP, chipP)}`; },
  conciliar() {
    const pend = db.extrato.filter((e) => !e.conc).sort((a, b) => b.dia - a.dia), feitos = db.extrato.filter((e) => e.conc).sort((a, b) => b.dia - a.dia), tot = db.extrato.length;
    return `<div class="titulo"><div><h1>Conciliar com o banco</h1><p>Importe o extrato (OFX ou CSV do internet banking). O sistema sugere o par pelo valor, pela data e pelo nome; você confirma ou recusa. Não há ligação automática com o banco: é você quem traz o arquivo.</p></div><div class="grupo"><label class="bt p">Importar extrato<input type="file" id="arq-ext" accept=".ofx,.csv,.txt" hidden></label><button class="bt" data-a="conferir-banco">Conferir com o saldo do banco</button></div></div>
      <div class="numeros"><div class="num"><small>Linhas do banco</small><b class="m">${tot}</b></div><div class="num"><small>Conciliadas</small><b class="m v-entra">${feitos.length}</b><span>${tot ? Math.round(feitos.length / tot * 100) : 0}%</span></div><div class="num"><small>Para conferir</small><b class="m ${pend.length ? 'v-sai' : ''}">${pend.length}</b></div><div class="num"><small>Saldo no sistema</small><b class="m">${R0(N.saldoHoje(db))}</b></div></div>
      <section class="pl"><h2>Para conferir</h2>${pend.length ? `<div class="conc-cab"><span>No banco</span><span></span><span>No sistema</span></div>` : ''}${pend.map((e) => { const s = N.sugestoes(db, e), m = s[0]; return `<div class="par"><div class="lado"><b class="m ${e.c > 0 ? 'v-entra' : 'v-sai'}">${e.c > 0 ? '+' : '−'}${R$(Math.abs(e.c))}</b><br>${h(e.desc)}<br><small class="vazio">${data(e.dia)}${e.imp?.arquivo ? ` · ${h(e.imp.arquivo)}` : ''}</small></div>
        <div class="meio">${m ? `<button class="bt x c" data-a="parear" data-e="${e.id}" data-i="0">Bate</button><button class="bt x" data-a="recusar" data-e="${e.id}" data-i="0">Não é</button>` : '<span class="vazio" style="text-align:center">sem par</span>'}</div>
        ${m ? `<div class="lado"><b class="m">${R$(m.tipo === 'baixar' && !m.parcial ? N.situacao(m.l).falta : Math.abs(e.c))}</b><br>${h(m.l.desc)}<br><small class="vazio">${h(m.l.quem)} · ${m.tipo === 'ligar' ? 'baixa já lançada' : m.parcial ? `<b>pagamento parcial</b> de ${R$(N.situacao(m.l).falta)}` : `vence ${data(m.l.venc)}`}${s.length > 1 ? ` · +${s.length - 1} opção(ões)` : ''}</small></div>` : `<div class="lado falta">Nada no sistema com esse valor.<div class="grupo" style="margin-top:8px"><button class="bt x" data-a="criar-do-extrato" data-e="${e.id}">Criar lançamento</button><button class="bt x" data-a="ignorar" data-e="${e.id}">Fora do caixa</button></div></div>`}</div>`; }).join('') || '<p class="vazio-c">Tudo conciliado.</p>'}</section>
      ${feitos.length ? `<section class="pl tab-wrap" style="margin-top:16px"><div class="rolagem"><table><thead><tr><th>Dia</th><th>No banco</th><th class="dir">Valor</th><th>Ligado a</th><th></th></tr></thead><tbody>${feitos.slice(0, 60).map((e) => { const l = e.conc.lanc && lanc(e.conc.lanc); return `<tr><td>${data(e.dia)}</td><td>${h(e.desc)}</td><td class="dir m">${R$(e.c)}</td><td>${e.conc.ignorado ? `<span class="tag">fora do caixa · ${h(e.conc.motivo)}</span>` : `<span class="tag ok">${h(l?.quem || '')}</span>`}</td><td class="dir"><button class="bt x" data-a="desfazer" data-e="${e.id}">Desfazer</button></td></tr>`; }).join('')}</tbody></table></div></section>` : ''}`;
  },
  contratos() {
    const [atual, prox] = N.comps(), ga = N.aGerar(db, atual), gp = N.aGerar(db, prox), rec = db.contratos.filter((c) => c.ativo !== false).reduce((a, c) => a + c.c, 0);
    return `<div class="titulo"><div><h1>Contratos</h1><p>Cobranças que se repetem todo mês. Cada mês é gerado uma vez só; o sistema avisa quando falta gerar.</p></div><div class="grupo"><button class="bt" data-a="novo-contrato">+ Contrato</button><button class="bt ${ga.length ? 'p' : ''}" data-a="gerar" data-comp="${atual}" ${ga.length ? '' : 'disabled'}>Gerar ${nomeMes(atual)} (${ga.length})</button><button class="bt" data-a="gerar" data-comp="${prox}" ${gp.length ? '' : 'disabled'}>Gerar ${nomeMes(prox)} (${gp.length})</button></div></div>
      <div class="numeros"><div class="num destaque"><small>Receita recorrente</small><b class="m">${R0(rec)}</b><span>por mês</span></div><div class="num"><small>Contratos ativos</small><b class="m">${db.contratos.filter((c) => c.ativo !== false).length}</b></div><div class="num"><small>Falta gerar · ${nomeMes(atual)}</small><b class="m ${ga.length ? 'v-sai' : ''}">${ga.length}</b></div><div class="num"><small>Falta gerar · ${nomeMes(prox)}</small><b class="m">${gp.length}</b></div></div>
      <section class="pl tab-wrap"><div class="rolagem"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Dia</th><th class="dir">Valor</th><th>${nomeMes(atual)}</th><th>${nomeMes(prox)}</th><th></th></tr></thead><tbody>${db.contratos.map((c) => { const st = (comp) => { const l = db.lancs.find((x) => x.contrato === c.id && x.comp === comp); return l ? tagSt(l) : '<span class="tag">a gerar</span>'; }; return `<tr class="${c.ativo === false ? 'feito' : ''}"><td><b>${h(c.cli)}</b></td><td>${h(c.plano)}</td><td>todo dia ${c.dia}</td><td class="dir m">${R$(c.c)}</td><td>${st(atual)}</td><td>${st(prox)}</td><td class="dir"><button class="bt x" data-a="editar-contrato" data-id="${c.id}">Editar</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="vazio-c">Nenhum contrato.</td></tr>'}</tbody></table></div></section>`;
  },
  orcamentos() {
    return `<div class="titulo"><div><h1>Orçamentos</h1><p>Mande o orçamento pelo WhatsApp. Quando o cliente aprovar, registre a aprovação: vira cobrança com entrada e saldo.</p></div><button class="bt p" data-a="novo-orc">+ Orçamento</button></div>
      <section class="pl tab-wrap"><div class="rolagem"><table><thead><tr><th>Cliente</th><th>Serviço</th><th class="dir">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${db.orcs.map((o) => `<tr><td><b>${h(o.cli)}</b><br><small class="vazio">criado ${data(o.dia)}</small></td><td>${h(o.desc)}</td><td class="dir m">${R$(o.c)}</td><td>${o.st === 'aprovado' ? '<span class="tag ok">aprovado</span>' : o.st === 'cobrado' ? '<span class="tag ch">virou cobrança</span>' : o.st === 'recusado' ? '<span class="tag">recusado</span>' : '<span class="tag at">esperando o cliente</span>'}</td><td class="dir"><div class="grupo" style="justify-content:flex-end">${o.st === 'enviado' ? `<button class="bt x" data-a="enviar-orc" data-id="${o.id}">WhatsApp</button><button class="bt x c" data-a="st-orc" data-st="aprovado" data-id="${o.id}">Aprovou</button><button class="bt x" data-a="st-orc" data-st="recusado" data-id="${o.id}">Recusou</button>` : o.st === 'aprovado' ? `<button class="bt x c" data-a="cobrar-orc" data-id="${o.id}">Gerar cobrança</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="5" class="vazio-c">Nenhum orçamento.</td></tr>'}</tbody></table></div></section>`;
  },
  resultado() {
    const r = N.resultado(db, compRes, db.imposto), mx = Math.max(...r.recCat.map((x) => x[1]), ...r.desCat.map((x) => x[1]), 1), meses = Array.from({ length: 6 }, (_, i) => N.hojeISO(new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1)).slice(0, 7));
    const pc = (v) => (r.receita ? `${(v / r.receita * 100).toFixed(1).replace('.', ',')}%` : '—');
    return `<div class="titulo"><div><h1>Resultado</h1><p>Competência: o que foi vendido e gasto no mês (pelo vencimento), recebido ou não. Caixa: o que de fato entrou e saiu (pelas baixas).</p></div><div class="grupo"><select class="sel-mes" data-comp aria-label="Mês">${meses.map((m) => `<option value="${m}" ${m === compRes ? 'selected' : ''}>${nomeMes(m)}</option>`).join('')}</select><button class="bt" data-a="contador">Pacote do contador (CSV)</button></div></div>
      <div class="grade"><section class="pl s7 tab-wrap"><div class="rolagem"><table class="dre"><thead><tr><th>Demonstrativo do mês (competência)</th><th class="dir">Valor</th><th class="dir">% da receita</th></tr></thead><tbody>
        <tr class="tot"><td>Receita</td><td class="dir m v-entra">${R$(r.receita)}</td><td class="dir m">100%</td></tr>${r.recCat.map(([c, v]) => `<tr class="sub"><td>${h(c)}</td><td class="dir m">${R$(v)}</td><td class="dir m">${pc(v)}</td></tr>`).join('')}
        <tr class="tot"><td>(−) Despesas</td><td class="dir m v-sai">${R$(r.despesas)}</td><td class="dir m">${pc(r.despesas)}</td></tr>${r.desCat.map(([c, v]) => `<tr class="sub"><td>${h(c)}</td><td class="dir m">${R$(v)}</td><td class="dir m">${pc(v)}</td></tr>`).join('')}
        <tr class="tot"><td>(−) Imposto estimado (${String(db.imposto).replace('.', ',')}%)</td><td class="dir m">${R$(r.impostoEst)}</td><td class="dir m">${pc(r.impostoEst)}</td></tr>
        <tr class="final"><td>= Lucro estimado</td><td class="dir m">${R$(r.lucro)}</td><td class="dir m">${pc(r.lucro)}</td></tr></tbody></table></div></section>
      <div class="s5" style="display:grid;gap:16px;align-content:start"><div class="numeros" style="grid-template-columns:1fr 1fr;margin:0"><div class="num"><small>Caixa: entrou</small><b class="m v-entra">${R0(r.caixa.entrou)}</b></div><div class="num"><small>Caixa: saiu</small><b class="m v-sai">${R0(r.caixa.saiu)}</b></div><div class="num"><small>Falta receber do mês</small><b class="m">${R0(r.aReceberDoMes)}</b></div><div class="num"><small>Falta pagar do mês</small><b class="m">${R0(r.aPagarDoMes)}</b></div></div>
      <section class="pl"><h2>Para onde vai</h2><div class="barras-h">${r.desCat.map(([c, v]) => `<div class="l"><span>${h(c)}</span><span class="t"><i style="width:${v / mx * 100}%;--c:#c08a73"></i></span><b class="dir m">${R0(v)}</b></div>`).join('') || '<p class="vazio">Nada no mês.</p>'}</div></section></div></div>
      <p class="vazio" style="margin-top:12px">O imposto é uma estimativa pela alíquota dos Ajustes; guias lançadas no mês: ${R$(r.impostosLancados)}. O valor oficial é o da guia do Simples calculada pelo contador.</p>`;
  },
  historico() { return `<div class="titulo"><div><h1>Histórico</h1><p>Tudo que foi lançado, baixado, estornado, conciliado, editado e excluído, do mais novo ao mais antigo.</p></div></div><section class="pl tab-wrap"><div class="rolagem"><table><thead><tr><th>Quando</th><th>O quê</th></tr></thead><tbody>${db.historico.slice(0, 200).map((x) => `<tr><td class="vazio" style="white-space:nowrap">${new Date(x.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${h(x.oque)}</td></tr>`).join('') || '<tr><td colspan="2" class="vazio-c">Nada registrado ainda.</td></tr>'}</tbody></table></div></section>`; },
  equipe() {
    const real = !!document.querySelector('[data-vc="equipe"]');
    return `<div class="titulo"><div><h1>Equipe</h1><p>Quem entra, com que acesso, e quem fez cada alteração.</p></div>${real ? '<button class="bt p" data-a="equipe-real">Abrir equipe e convites</button>' : ''}</div><section class="pl"><p>${real ? 'Os convites saem por e-mail ou WhatsApp; cada pessoa entra com o próprio login. Dá para liberar só ver ou ver e mexer em cada parte.' : 'Na demonstração não há convites. Com a sua conta, aqui abre a equipe de verdade: convite por e-mail ou WhatsApp, acesso só para ver ou para mexer, e o histórico de quem fez o quê.'}</p><p class="vazio">Plano Assinatura · R$ 109/mês · equipe sem limite, até 10 empresas, anual com 20% a menos, sem fidelidade.</p></section>`;
  },
  ajustes() {
    return `<div class="titulo"><div><h1>Ajustes</h1></div></div><div class="grade"><section class="pl s6"><h2>Empresa</h2><label class="cmp">Nome<input data-aj="empresa" value="${h(db.empresa)}" maxlength="80"></label><label class="cmp">Chave PIX das cobranças<input data-aj="pix" value="${h(db.pix || '')}" maxlength="80"></label><label class="cmp">Cidade (vai no PIX)<input data-aj="cidade" value="${h(db.cidade || '')}" maxlength="40"></label><label class="cmp">Alíquota do Simples para a estimativa (%)<input data-aj="imposto" inputmode="decimal" value="${String(db.imposto).replace('.', ',')}"></label></section>
      <section class="pl s6"><h2>Saldo de abertura</h2><p class="vazio">O saldo de hoje é a abertura + o que foi recebido − o que foi pago. Mude a abertura só para acertar o ponto de partida; para conferir com o banco use Conciliar › Conferir com o saldo do banco.</p><label class="cmp">Saldo de abertura (R$)<input data-aj="abertura" inputmode="decimal" value="${(db.saldoInicial.c / 100).toFixed(2).replace('.', ',')}"></label>
      <h2 style="margin-top:14px">Régua de cobrança</h2><p class="vazio">Dias em relação ao vencimento (negativo = antes). O sistema mostra quem lembrar em cada dia; o envio é pelo seu WhatsApp.</p><label class="cmp">Lembretes<input data-aj="regua" value="${db.regua.join(', ')}"></label></section>
      <section class="pl s12"><h2>Dados</h2><div class="grupo"><a class="bt" href="#dados">Importar, exportar e cópia de segurança</a></div></section></div>`;
  },
  dados() {
    return `<div class="titulo"><div><h1>Dados</h1><p>Exportar para o contador ou para outra planilha, guardar uma cópia e restaurar.</p></div></div><div class="grade">
      <section class="pl s6"><h2>Exportar</h2><p class="vazio">CSV que abre no Excel: contas, baixas e extrato do mês, com datas e valores em reais.</p><button class="bt" data-a="contador">Baixar o mês (CSV)</button></section>
      <section class="pl s6"><h2>Cópia de segurança</h2><p class="vazio">Um arquivo com tudo. Restaurar troca os dados atuais, que ficam guardados neste navegador caso precise voltar.</p><div class="grupo"><button class="bt" data-a="copia">Baixar cópia</button><label class="bt">Restaurar cópia<input type="file" id="restaurar" accept=".json" hidden></label><button class="bt" data-a="voltar">Voltar a versão anterior</button></div></section></div>`;
  },
};

function tela() {
  const r = location.hash.slice(1) || 'fluxo';
  if (falha) { $('#conteudo').innerHTML = `<div class="titulo"><div><h1>Seus dados estão protegidos</h1><p class="erro-f">${h(falha)}</p><p>Nada é gravado enquanto isso não for resolvido. Baixe o que estava guardado e fale com o suporte.</p></div><button class="bt p" data-a="bruto">Baixar o que estava guardado</button></div>`; return; }
  const n = { receber: N.abertos(db, 'r').filter((l) => l.venc < 0).length, conciliar: db.extrato.filter((e) => !e.conc).length, orcamentos: db.orcs.filter((o) => o.st === 'aprovado').length, contratos: N.aGerar(db, N.comps()[0]).length };
  const atual = r === 'dados' ? 'ajustes' : r;
  $('#trilho').innerHTML = GRUPOS.map(([g, ks]) => `<p class="grupo-t">${g}</p>${ks.map((k) => `<a href="#${k}" ${k === atual ? 'aria-current="page"' : ''} title="${nomeSecao(k)}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg><span class="r">${nomeSecao(k)}</span>${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('')}`).join('');
  const p = N.projecao(db), fim = p[29].saldo;
  $('#saldos').innerHTML = `<div><small>Saldo hoje</small><b>${R0(N.saldoHoje(db))}</b></div><div class="${fim < 0 ? 'neg' : ''}"><small>Em 30 dias</small><b>${R0(fim)}</b></div>`;
  $('#empresa').textContent = db.empresa; $('#hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  $('#conteudo').innerHTML = (V[r] || V.fluxo)();
  document.title = `${r === 'dados' ? 'Dados' : nomeSecao(V[r] ? r : 'fluxo')} · Veltria Financeiro Completo`;
}
addEventListener('hashchange', () => { tela(); $('#conteudo').focus({ preventScroll: true }); scrollTo(0, 0); });
/** Busca de cima: contas por cliente, fornecedor, descrição ou categoria. */
function buscaGlobal(q) {
  const box = $('#resultados'), s = sa(q).trim(); if (!s) { box.hidden = true; return; }
  const l = db.lancs.filter((x) => sa(`${x.quem} ${x.desc} ${x.cat} ${x.cc}`).includes(s)).sort((a, b) => (N.situacao(a).falta ? 0 : 1) - (N.situacao(b).falta ? 0 : 1) || a.venc - b.venc).slice(0, 8);
  box.innerHTML = l.length ? l.map((x) => `<button type="button" data-a="abrir" data-id="${x.id}"><b>${h(x.quem)}</b><span class="m ${x.tipo === 'r' ? 'v-entra' : 'v-sai'}">${x.tipo === 'r' ? '+' : '−'}${R$(x.c)}</span><small>${h(x.desc)} · ${x.tipo === 'r' ? 'a receber' : 'a pagar'} · ${N.situacao(x).st}</small></button>`).join('') : '<p class="vazio" style="padding:10px 12px;margin:0">Nada encontrado.</p>';
  box.hidden = false;
}

function gaveta() {
  const g = $('#gaveta'); g.hidden = false;
  const msgs = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Leio o fluxo, as contas, os contratos e o extrato. Pergunte do seu jeito.' }];
  g.innerHTML = `<header><b>Assistente financeiro</b><button type="button" data-fecha-g aria-label="Fechar">×</button></header><div class="msgs">${msgs.map((m) => `<div class="msg ${m.ia ? 'ia' : 'eu'}">${h(m.t)}</div>`).join('')}<div class="sug">${['O caixa vai aguentar o mês?', 'Quem está me devendo?', 'Qual despesa mais pesa?', 'O que vence esta semana?'].map((s) => `<button type="button" data-sug="${h(s)}">${h(s)}</button>`).join('')}</div></div><form id="f-g"><input id="q-g" placeholder="Pergunte" aria-label="Pergunta"><button class="bt p">Enviar</button></form>`;
  g.querySelector('.msgs').scrollTop = 1e6; $('#q-g').focus();
}
function responde(p) {
  const x = sa(p), pr = N.projecao(db), min = pr.reduce((a, y) => (y.saldo < a.saldo ? y : a), pr[0]);
  if (/caixa|aguent|negativ|fluxo/.test(x)) return min.saldo < 0 ? `Não sem ajuste: o saldo fica em ${R$(min.saldo)} em ${data(min.d)}. Atrasados para cobrar: ${R$(N.abertos(db, 'r').filter((l) => l.venc < 0).reduce((a, l) => a + N.situacao(l).falta, 0))}.` : `Aguenta. O menor saldo do mês é ${R$(min.saldo)}, em ${data(min.d)}.`;
  if (/deve|devend|atras|receber/.test(x)) return N.abertos(db, 'r').filter((l) => l.venc <= 0).map((l) => `• ${l.quem}: ${R$(N.situacao(l).falta)} ${l.venc < 0 ? `(${-l.venc} dia(s) atrasado)` : '(vence hoje)'}`).join('\n') || 'Ninguém atrasado.';
  if (/despesa|pesa|gasto/.test(x)) { const r = N.resultado(db, N.hojeISO().slice(0, 7), db.imposto); return r.desCat.length ? `Neste mês: ${r.desCat.slice(0, 3).map(([c, v]) => `${c} ${R$(v)}`).join(', ')}.` : 'Nenhuma despesa no mês.'; }
  if (/vence|semana|pagar/.test(x)) return N.abertos(db, 'p').filter((l) => l.venc <= 7).map((l) => `• ${l.quem} · ${l.desc}: ${R$(N.situacao(l).falta)} ${data(l.venc)}`).join('\n') || 'Nada vence nos próximos 7 dias.';
  return `Saldo hoje: ${R$(N.saldoHoje(db))}. Em 30 dias: ${R$(pr[29].saldo)}.`;
}
function baixa(nome, conteudo, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function restaura(txt, origem) {
  let d; try { d = JSON.parse(txt); d = parece2(d) ? arruma(d) : arruma(N.migrar(d)); } catch (e) { return nota(`Cópia inválida: ${e.message}`, 1); }
  if (!d.lancs.every((l) => Number.isInteger(l.c) && l.c > 0)) return nota('A cópia tem valores inválidos. Nada foi alterado.', 1);
  try { localStorage.setItem(`${CHAVE}-antes-de-restaurar:${CONTA}`, JSON.stringify(db)); } catch { return nota('Sem espaço para guardar os dados atuais antes de restaurar. Nada foi alterado.', 1); }
  db = d; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Restaurou ${origem}` }); salva(); location.hash = '#fluxo'; tela(); nota('Dados restaurados.');
}
const opCats = (tipo, sel) => N.CATS[tipo].map((c) => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');

const A = {
  novo: (d, pre = {}) => formulario(d.t === 'r' ? 'Nova conta a receber' : 'Nova conta a pagar', `<label class="cmp">${d.t === 'r' ? 'Cliente' : 'Fornecedor'}<input name="q" required maxlength="80" value="${h(pre.quem || '')}"></label><label class="cmp">O quê<input name="d" required maxlength="120" value="${h(pre.desc || '')}"></label><div class="dois">${cValor('v', 'Valor (R$)', pre.c)}${cData('venc', 'Vence em', pre.venc ?? 7)}</div><div class="dois"><label class="cmp">Categoria<select name="c">${opCats(d.t)}</select></label><label class="cmp">Centro de custo (opcional)<input name="cc" maxlength="40" placeholder="ex.: Obra Savassi"></label></div>${d.t === 'r' ? '<label class="cmp">WhatsApp do cliente (opcional)<input name="tel" inputmode="tel" maxlength="20"></label>' : ''}<label class="cmp">Repetir todo mês<select name="rep"><option value="1">só uma vez</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select></label>${pre.boleto ? `<input type="hidden" name="boleto" value="${h(pre.boleto)}">` : ''}`, 'Lançar', (f) => {
    const ls = N.novaConta(db, { tipo: d.t, quem: f.get('q'), desc: f.get('d'), c: valorC(f.get('v')), venc: diaC(f.get('venc')), cat: f.get('c'), cc: String(f.get('cc') || '').trim(), tel: String(f.get('tel') || '').replace(/\D/g, ''), rep: Number(f.get('rep')), boleto: f.get('boleto') || undefined });
    return ls.length > 1 ? `${ls.length} lançamentos criados, um por mês.` : 'Lançado.';
  }),
  abrir: (d) => {
    const l = lanc(d.id); if (!l) return; const s = N.situacao(l);
    caixa(`<h2>${h(l.quem)} · ${h(l.desc)}</h2><p>${tagSt(l)} · valor <b class="m">${R$(l.c)}</b>${s.p ? ` · ${l.tipo === 'r' ? 'recebido' : 'pago'} ${R$(s.p)}` : ''}${s.falta ? ` · falta <b class="m">${R$(s.falta)}</b>` : ''}</p><dl class="fatos"><div><dt>Vencimento</dt><dd>${N.isoDe(l.venc).split('-').reverse().join('/')}</dd></div><div><dt>Categoria</dt><dd>${h(l.cat || '—')}</dd></div><div><dt>Centro de custo</dt><dd>${h(l.cc || '—')}</dd></div><div><dt>${l.tipo === 'r' ? 'WhatsApp' : 'Origem'}</dt><dd>${l.tipo === 'r' ? h(l.tel || '—') : h({ manual: 'lançada à mão', extrato: 'criada do extrato', contrato: 'contrato', migracao: 'antes da atualização' }[l.origem] || l.origem || '—')}</dd></div></dl>
      ${s.falta ? `<div class="grupo" style="margin:4px 0 6px"><button class="bt p" data-ac="baixa">${l.tipo === 'r' ? 'Recebi' : 'Paguei'} ${R$(s.falta)}</button>${l.tipo === 'r' ? '<button class="bt" data-ac="cobrar">Cobrar (PIX + WhatsApp)</button>' : ''}</div>` : ''}${l.boleto ? `<p class="vazio">Boleto: ${h(l.boleto)}</p>` : ''}${l.motivo ? `<p class="vazio">Cancelado: ${h(l.motivo)}</p>` : ''}
      <h3>Baixas</h3>${l.pagamentos.length ? `<table><tbody>${l.pagamentos.map((p) => `<tr><td>${data(p.dia)}</td><td class="dir m">${R$(p.c)}</td><td>${p.ext ? '<span class="tag ok">banco</span>' : p.origem === 'migracao' ? '<span class="tag">antes da atualização</span>' : '<span class="tag">manual</span>'}</td><td><button class="bt x" data-estorna="${p.id}">Estornar</button></td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nenhuma baixa.</p>'}
      <div class="rod">${s.st !== 'cancelado' ? '<button class="bt" data-ac="editar">Editar</button>' : ''}${s.falta ? '<button class="bt" data-ac="adiar">Adiar 7 dias</button><button class="bt" data-ac="cancelar">Cancelar conta</button>' : ''}${!s.p ? '<button class="bt" data-ac="excluir">Excluir</button>' : ''}<button class="bt p" data-sai>Fechar</button></div>`, (c, fecha) => {
      c.addEventListener('click', (e) => {
        const est = e.target.closest('[data-estorna]'); if (est && confirm('Estornar esta baixa? O saldo volta e a conta reabre.')) { try { N.estornar(db, l.id, est.dataset.estorna); salva(); fecha(); tela(); nota('Baixa estornada.'); } catch (x) { nota(x.message, 1); } return; }
        const ac = e.target.closest('[data-ac]')?.dataset.ac; if (!ac) return; fecha();
        if (ac === 'baixa') A.baixa({ id: l.id }); if (ac === 'cobrar') A.cobrar({ id: l.id });
        if (ac === 'editar') formulario('Editar conta', `<label class="cmp">${l.tipo === 'r' ? 'Cliente' : 'Fornecedor'}<input name="q" required value="${h(l.quem)}" maxlength="80"></label><label class="cmp">O quê<input name="d" required value="${h(l.desc)}" maxlength="120"></label><div class="dois">${cValor('v', 'Valor (R$)', l.c)}${cData('venc', 'Vence em', l.venc)}</div><div class="dois"><label class="cmp">Categoria<select name="c">${opCats(l.tipo, l.cat)}</select></label><label class="cmp">Centro de custo<input name="cc" value="${h(l.cc || '')}" maxlength="40"></label></div>`, 'Salvar', (f) => { N.editarConta(db, l.id, { quem: String(f.get('q')).trim(), desc: String(f.get('d')).trim(), c: valorC(f.get('v')), venc: diaC(f.get('venc')), cat: f.get('c'), cc: String(f.get('cc') || '').trim() }); return 'Conta atualizada.'; });
        if (ac === 'adiar') { N.adiar(db, l.id, 7); salva(); tela(); nota('Vencimento adiado 7 dias (fica no histórico).'); }
        if (ac === 'cancelar') formulario('Cancelar conta', `<p>${h(l.quem)} · ${R$(l.c)}${s.p ? `. O que já foi baixado (${R$(s.p)}) continua.` : ''}</p><label class="cmp">Motivo<input name="m" maxlength="120" required></label>`, 'Cancelar conta', (f) => { const m = String(f.get('m') || '').trim(); if (!m) throw new Error('Diga o motivo.'); N.cancelarConta(db, l.id, m); return 'Conta cancelada.'; });
        if (ac === 'excluir' && confirm('Excluir esta conta? Fica registrado no histórico.')) { try { N.excluirConta(db, l.id); salva(); tela(); nota('Conta excluída.'); } catch (x) { nota(x.message, 1); } }
      });
    });
  },
  baixa: (d) => { const l = lanc(d.id), s = N.situacao(l); formulario(`${l.tipo === 'r' ? 'Recebi' : 'Paguei'}: ${h(l.quem)}`, `<p class="vazio">${h(l.desc)} · falta ${R$(s.falta)}. Parcial? Digite o valor que ${l.tipo === 'r' ? 'entrou' : 'saiu'}.</p><div class="dois">${cValor('v', 'Valor (R$)', s.falta)}${cData('dia', 'Data', 0)}</div><label class="cmp">Forma<select name="forma"><option>PIX</option><option>Boleto</option><option>Transferência</option><option>Cartão</option><option>Dinheiro</option></select></label>`, 'Dar baixa', (f) => { const dia = diaC(f.get('dia')), c = valorC(f.get('v')); const p = N.baixar(db, l.id, c, { dia, forma: f.get('forma'), chave: `${l.id}:${N.pago(l)}:${c}` }); if (!p) throw new Error('Essa baixa já foi lançada.'); return `${l.tipo === 'r' ? 'Recebido' : 'Pago'}: ${R$(c)}. Saldo atualizado.`; }); },
  cobrar: async (d) => {
    const l = lanc(d.id), s = N.situacao(l); if (!db.pix) { nota('Cadastre a chave PIX em Ajustes.', 1); location.hash = '#ajustes'; return; }
    const [{ pixCopiaECola }, { qrSVG }] = await Promise.all([import('../base/pix.js'), import('../base/qr.js')]);
    const pix = pixCopiaECola({ chave: db.pix, nome: db.empresa, cidade: db.cidade || 'BRASIL', valor: s.falta / 100, txid: l.id.replace(/[^A-Za-z0-9]/g, '').slice(-20) });
    const msg = `Olá! Aqui é da ${db.empresa}. ${l.venc < 0 ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${R$(s.falta)} (${l.desc})${l.venc < 0 ? `, vencido em ${data(l.venc)}` : `, vencimento ${data(l.venc)}`}.\n\nPIX copia e cola:\n${pix}`;
    caixa(`<h2>Cobrar ${h(l.quem)}</h2><p class="m">${R$(s.falta)}</p><div class="qr-pix">${qrSVG(pix, 180)}</div><label class="cmp">PIX copia e cola<textarea readonly rows="3">${h(pix)}</textarea></label><div class="rod"><button class="bt" data-copia>Copiar PIX</button><a class="bt p" target="_blank" rel="noopener" data-foi href="https://wa.me/${l.tel ? '55' + l.tel.replace(/^55(?=\d{10,11}$)/, '') : ''}?text=${encodeURIComponent(msg)}">Abrir no WhatsApp</a></div><p class="vazio">O WhatsApp abre com a mensagem; você confere e envia. Fica registrado que você lembrou hoje.</p>`, (c) => {
      c.querySelector('[data-copia]').addEventListener('click', () => navigator.clipboard?.writeText(pix).then(() => nota('PIX copiado.'), () => nota('Copie o texto acima.', 1)));
      c.querySelector('[data-foi]').addEventListener('click', () => { if (!l.avisos.includes(0)) l.avisos.push(0); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Lembrou ${l.quem} de ${R$(s.falta)} pelo WhatsApp` }); salva(); setTimeout(tela, 300); });
    });
  },
  'ler-boleto': () => formulario('Ler código de boleto', '<label class="cmp">Linha digitável (47 ou 48 números)<input name="c" inputmode="numeric" placeholder="23793.38128 60000.000003 ..." required></label><p class="vazio">Os números são conferidos pelos dígitos verificadores. Valor e vencimento saem do próprio código.</p>', 'Ler', (f) => {
    const b = N.lerBoleto(f.get('c')); setTimeout(() => A.novo({ t: 'p' }, { quem: b.tipo === 'consumo' ? 'Conta de consumo' : `Banco ${b.banco}`, desc: 'Boleto', c: b.c || undefined, venc: b.vence ?? 7, boleto: String(f.get('c')).replace(/\D/g, '') }), 50);
    return b.c ? `Boleto lido: ${R$(b.c)}${b.vence !== null ? `, vence ${data(b.vence)}` : ''}. Confira e lance.` : 'Código válido, mas sem valor: digite o valor.';
  }),
  parear: (d) => { const e = db.extrato.find((x) => x.id === d.e), s = N.sugestoes(db, e)[Number(d.i)]; try { N.conciliar(db, e.id, s); salva(); tela(); nota('Conciliado.'); } catch (x) { nota(x.message, 1); } },
  recusar: (d) => { const e = db.extrato.find((x) => x.id === d.e); N.rejeitar(db, e.id, N.sugestoes(db, e)[Number(d.i)]); salva(); tela(); nota('Sugestão recusada. Ela não volta para esta linha.'); },
  'criar-do-extrato': (d) => { const e = db.extrato.find((x) => x.id === d.e), t = e.c > 0 ? 'r' : 'p'; formulario('Criar lançamento a partir do banco', `<p class="vazio">${h(e.desc)} · ${R$(e.c)} · ${data(e.dia)}</p><label class="cmp">${t === 'r' ? 'Cliente' : 'Fornecedor'}<input name="q" required maxlength="80" value="${h(e.desc.split(' ').slice(-3).join(' '))}"></label><label class="cmp">Categoria<select name="c">${opCats(t, /tarifa|taxa/i.test(e.desc) ? 'Tarifas bancárias' : '')}</select></label>`, 'Criar e conciliar', (f) => { N.criarDoExtrato(db, e.id, { quem: String(f.get('q')).trim(), desc: e.desc, cat: f.get('c') }); return 'Lançamento criado e conciliado.'; }); },
  ignorar: (d) => formulario('Fora do caixa', '<p class="vazio">Use para o que não é receita nem despesa: transferência entre contas da própria empresa, aplicação, resgate.</p><label class="cmp">Motivo<input name="m" required maxlength="80" placeholder="Transferência para a poupança"></label>', 'Marcar', (f) => { N.ignorar(db, d.e, String(f.get('m') || '').trim() || 'sem motivo'); return 'Marcado como fora do caixa.'; }),
  desfazer: (d) => { if (!confirm('Desfazer esta conciliação?')) return; N.desfazer(db, d.e); salva(); tela(); nota('Conciliação desfeita.'); },
  'conferir-banco': () => formulario('Conferir com o saldo do banco', `<p class="vazio">Digite o saldo que o banco mostra hoje. Saldo no sistema: <b class="m">${R$(N.saldoHoje(db))}</b>.</p>${cValor('b', 'Saldo no banco hoje (R$)')}`, 'Conferir', (f) => { const c = N.centavos(f.get('b')); if (!Number.isInteger(c)) throw new Error('Valor inválido.'); const r = N.conferencia(db, c); setTimeout(() => caixa(`<h2>${r.dif === 0 ? 'Bate com o banco' : 'Diferença de ' + R$(r.dif)}</h2><p>Banco ${R$(r.banco)} · sistema ${R$(r.sistema)}.</p>${r.dif ? `<p class="vazio">Costuma ser: linhas do banco ainda não importadas ou conciliadas (${r.linhasPendentes} pendente[s]), baixas lançadas sem passar no banco (${r.baixasSemBanco} nos últimos 60 dias) ou um saldo de abertura errado. Nada é ajustado sozinho.</p>` : ''}<div class="rod"><button class="bt p" data-sai>Ok</button></div>`), 50); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Conferiu com o banco: diferença ${R$(r.dif)}` }); return false; }),
  gerar: (d) => { const n = N.gerarContratos(db, d.comp); salva(); tela(); nota(n.length ? `${n.length} cobrança(s) de ${nomeMes(d.comp)} gerada(s).` : 'Nada a gerar.'); },
  'novo-contrato': () => A['editar-contrato']({}),
  'editar-contrato': (d) => { const k = db.contratos.find((x) => x.id === d.id); formulario(k ? 'Editar contrato' : 'Novo contrato', `<label class="cmp">Cliente<input name="c" required maxlength="80" value="${h(k?.cli || '')}"></label><label class="cmp">Plano<input name="p" required maxlength="60" value="${h(k?.plano || 'PMOC')}"></label><div class="dois">${cValor('v', 'Valor mensal (R$)', k?.c)}<label class="cmp">Dia da cobrança<input name="d" type="number" min="1" max="31" required value="${k?.dia || 10}"></label></div><label class="cmp">WhatsApp do cliente<input name="tel" maxlength="20" value="${h(k?.tel || '')}"></label>${k ? `<label class="cmp"><span><input type="checkbox" name="pausa" ${k.ativo === false ? 'checked' : ''}> Encerrado (não gera mais cobranças)</span></label>` : ''}<p class="vazio">Mudar o valor vale para os próximos meses; as cobranças já geradas continuam como estão.</p>`, 'Salvar', (f) => { const dd = Number(f.get('d')); if (!Number.isInteger(dd) || dd < 1 || dd > 31) throw new Error('Dia entre 1 e 31.'); const novo = { cli: String(f.get('c')).trim(), plano: String(f.get('p')).trim(), c: valorC(f.get('v')), dia: dd, tel: String(f.get('tel') || '').replace(/\D/g, '') }; if (!novo.cli) throw new Error('Diga o cliente.'); if (k) Object.assign(k, novo, { ativo: !f.get('pausa') }); else db.contratos.push({ id: `k${Date.now().toString(36)}`, ...novo, ativo: true, desde: N.hojeISO().slice(0, 7) }); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `${k ? 'Editou' : 'Criou'} contrato ${novo.cli} · ${R$(novo.c)}/mês` }); return 'Contrato salvo.'; }); },
  'novo-orc': () => formulario('Novo orçamento', `<label class="cmp">Cliente<input name="c" required maxlength="80"></label><label class="cmp">Serviço<input name="d" required maxlength="120"></label>${cValor('v', 'Valor (R$)')}<label class="cmp">WhatsApp do cliente<input name="tel" maxlength="20"></label>`, 'Criar', (f) => { const cli = String(f.get('c')).trim(), desc = String(f.get('d')).trim(); if (!cli || !desc) throw new Error('Preencha cliente e serviço.'); db.orcs.unshift({ id: `o${Date.now().toString(36)}`, cli, desc, c: valorC(f.get('v')), st: 'enviado', dia: 0, tel: String(f.get('tel') || '').replace(/\D/g, '') }); return 'Orçamento criado. Toque em WhatsApp para mandar.'; }),
  'enviar-orc': (d) => { const o = db.orcs.find((x) => x.id === d.id); window.open(`https://wa.me/${o.tel ? '55' + o.tel : ''}?text=${encodeURIComponent(`Olá! Aqui é da ${db.empresa}. Segue o orçamento:\n\n${o.desc}\nValor: ${R$(o.c)}\nEntrada de 50% no PIX e o restante na entrega.\n\nPosso confirmar?`)}`, '_blank', 'noopener'); },
  'st-orc': (d) => { const o = db.orcs.find((x) => x.id === d.id); o.st = d.st; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Orçamento de ${o.cli} ${d.st}` }); salva(); tela(); },
  'cobrar-orc': (d) => { const o = db.orcs.find((x) => x.id === d.id), ent = Math.round(o.c / 2); N.novaConta(db, { tipo: 'r', quem: o.cli, desc: `${o.desc} · entrada`, c: ent, venc: 0, cat: 'Instalação', tel: o.tel, orc: o.id }); N.novaConta(db, { tipo: 'r', quem: o.cli, desc: `${o.desc} · saldo na entrega`, c: o.c - ent, venc: 15, cat: 'Instalação', tel: o.tel, orc: o.id }); o.st = 'cobrado'; salva(); tela(); nota('Duas cobranças criadas: entrada hoje e saldo em 15 dias.'); },
  contador: () => { baixa(`contador-${compRes}.csv`, N.csvContador(db, compRes), 'text/csv;charset=utf-8'); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Exportou o pacote do contador de ${compRes}` }); salva(); nota('CSV do mês baixado.'); },
  copia: () => baixa(`veltria-financeiro-completo-${N.hojeISO()}.json`, JSON.stringify(db, null, 1), 'application/json'),
  bruto: () => { let t = ''; try { t = localStorage.getItem(CHAVE) || ''; } catch { /* */ } baixa('guardado.json', t, 'application/json'); },
  voltar: () => { let t = null; try { t = localStorage.getItem(`${CHAVE}-antes-de-restaurar:${CONTA}`) || localStorage.getItem(`${CHAVE}-copia-formato1:${CONTA}`); } catch { /* */ } if (!t) return nota('Não há versão anterior guardada.', 1); if (confirm('Trocar os dados atuais pela versão anterior guardada neste navegador?')) restaura(t, 'a versão anterior'); },
  'equipe-real': () => document.querySelector('[data-vc="equipe"]')?.click(),
};

document.addEventListener('click', (e) => {
  const t = e.target, menu = $('#menu-novo'), bn = $('#bt-novo');
  if (t.closest('#bt-novo')) { menu.hidden = !menu.hidden; bn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) menu.querySelector('button').focus(); return; }
  if (!t.closest('#menu-novo')) { menu.hidden = true; bn.setAttribute('aria-expanded', 'false'); } else menu.hidden = true;
  if (!t.closest('.busca-g')) $('#resultados').hidden = true; else if (t.closest('#resultados [data-a]')) { $('#resultados').hidden = true; $('#busca-g').value = ''; }
  const ch = t.closest('[data-chip]'); if (ch) { const [tp, k] = ch.dataset.chip.split(':'); if (tp === 'r') chipR = k; else chipP = k; tela(); return; }
  if (t.closest('[data-ia]')) { gaveta(); return; }
  if (t.closest('[data-fecha-g]')) { $('#gaveta').hidden = true; return; }
  const s = t.closest('[data-sug]'); if (s) { $('#q-g').value = s.dataset.sug; $('#f-g').requestSubmit(); return; }
  const dd = t.closest('[data-dia]'); if (dd) { diaSel = Number(dd.dataset.dia); tela(); return; }
  const a = t.closest('[data-a]'); if (a && A[a.dataset.a]) A[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-g') return; e.preventDefault(); const p = $('#q-g').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); salva(); gaveta(); if (window.veltriaIA) window.veltriaIA(p).then((x) => { resp.t = x; salva(); gaveta(); }); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#menu-novo').hidden = true; $('#resultados').hidden = true; } if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('tr.clicavel')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('input', (e) => { if (e.target.id === 'busca-g') { buscaGlobal(e.target.value); return; } const b = e.target.dataset?.busca; if (!b) return; if (b === 'r') filtroR = e.target.value; else filtroP = e.target.value; const pos = e.target.selectionStart; tela(); const i = document.querySelector(`[data-busca="${b}"]`); i.focus(); i.setSelectionRange(pos, pos); });
document.addEventListener('change', (e) => {
  const el = e.target;
  if ('comp' in el.dataset) { compRes = el.value; tela(); return; }
  if (el.id === 'arq-ext' && el.files[0]) { const f = el.files[0]; if (f.size > 5e6) return nota('Arquivo grande demais (máximo 5 MB).', 1); f.text().then((txt) => { const r = N.lerExtrato(txt, f.name), novas = N.importarExtrato(db, r.linhas, f.name); salva(); tela(); nota(`${novas.length} linha(s) nova(s), ${r.linhas.length - novas.length} já estavam, ${r.erros.length} com problema.`, !r.linhas.length); if (r.erros.length) caixa(`<h2>Linhas que não entraram</h2>${r.erros.slice(0, 40).map((x) => `<p class="vazio">Linha ${x.linha}: ${h(x.motivo)}</p>`).join('')}<div class="rod"><button class="bt p" data-sai>Ok</button></div>`); }); return; }
  if (el.id === 'restaurar' && el.files[0]) { el.files[0].text().then((t) => restaura(t, `a cópia ${el.files[0].name}`)); return; }
  const k = el.dataset.aj; if (!k) return;
  if (k === 'regua') { const v = el.value.split(',').map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && Math.abs(x) <= 60); if (!v.length) return nota('Use números de dias separados por vírgula, ex.: -3, 0, 3.', 1); db.regua = [...new Set(v)].sort((a, b) => a - b); }
  else if (k === 'imposto') { const v = Number(String(el.value).replace(',', '.')); if (!(v >= 0 && v <= 40)) return nota('Alíquota entre 0 e 40%.', 1); db.imposto = v; }
  else if (k === 'abertura') { const c = N.centavos(el.value); if (!Number.isInteger(c)) return nota('Valor inválido.', 1); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Mudou o saldo de abertura de ${R$(db.saldoInicial.c)} para ${R$(c)}` }); db.saldoInicial.c = c; }
  else db[k] = el.value.trim().slice(0, 80);
  salva(); tela(); nota('Ajuste salvo.');
});
$('#recomecar').addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch { /* */ } db = base(); diaSel = 0; location.hash = '#fluxo'; tela(); nota('Demonstração recomeçada.'); });
try { if (!localStorage.getItem(CHAVE) && !protegido) salva(); } catch { /* */ }
tela();

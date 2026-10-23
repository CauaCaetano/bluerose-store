// Veltria Financeiro Essencial · app de celular do autônomo e do MEI.
// Cada real que entra é dividido em potes (imposto, contas, meu salário, reserva, livre). As regras do dinheiro ficam em
// nucleo.js (centavos, saldo calculado do extrato, migração, importação); aqui ficam as telas.
// Dados de exemplo neste aparelho (?novo recomeça). Com conta, conta-nuvem.js leva os dados para a nuvem.

import * as N from './nucleo.js';

const CHAVE = 'veltria-financeiro-essencial-v1';
const CONTA = new URLSearchParams(location.search).get('conta') || 'demo';
const din = N.reais;
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const dia = (o) => o === 0 ? 'hoje' : o === -1 ? 'ontem' : o === 1 ? 'amanhã' : N.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const zap = (tel, m) => `https://wa.me/${tel ? '55' + String(tel).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : ''}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);
const CORES = { imposto: '#9c7d3c', contas: '#1c5247', salario: '#6e9883', reserva: '#4f6e8a', livre: '#c9b995' };
const cor = (k) => CORES[k] || '#7a8b85';
const PCTS_PADRAO = { imposto: 6, contas: 34, salario: 40, reserva: 10, livre: 10 };

// ------------------------------------------------------------------ dados: carregar, migrar com cópia, gravar
function semente() {
  const potes = [['imposto', 'Imposto (DAS)', 6, 8100], ['contas', 'Contas fixas', 34, 118000], ['salario', 'Meu salário', 40, 240000], ['reserva', 'Reserva', 10, 600000], ['livre', 'Livre', 10, 0]].map(([k, nome, pct, metaC]) => ({ k, nome, pct, metaC }));
  const db = { formato: N.FORMATO, negocio: 'Ana Paula · Design de sobrancelhas', dono: 'Ana Paula', pix: 'ana.sobrancelhas@email.com', cidade: 'Belo Horizonte', cnpj: '41.226.908/0001-07', potes, movs: [], cobrancas: [], contas: [], fixas: [], recibos: [], reciboSeq: 0, historico: [], fatInicial: { ano: new Date().getFullYear(), c: 4876000 }, plano: 'basico', assinatura: { valor: 59, status: 'ativa', renova: true, proxima: 12, pagos: [-18, -48, -78] }, conversa: [] };
  const comp = N.hojeISO().slice(0, 7);
  db.fixas = [{ id: 'fx-das', desc: 'DAS do MEI', c: 8100, dia: 20, pote: 'imposto', cat: 'Impostos', das: true, ativa: true, desde: comp }, { id: 'fx-alug', desc: 'Aluguel da sala', c: 65000, dia: 5, pote: 'contas', cat: 'Aluguel e espaço', ativa: true, desde: comp }, { id: 'fx-net', desc: 'Internet e celular', c: 9200, dia: 10, pote: 'contas', cat: 'Contas fixas', ativa: true, desde: comp }];
  [[68000, 'Design + henna (4 clientes)', -9], [125000, 'Micropigmentação · Carla', -7], [42000, 'Design (3 clientes)', -5], [90000, 'Curso de design · turma', -3], [36000, 'Design + buço', -1], [54000, 'Laminação (2 clientes)', 0]].forEach(([c, desc, d]) => N.lancar(db, 'entra', { c, desc, dia: d }));
  [[18000, 'Pigmentos e lâminas', -4, 'contas'], [150000, 'Meu salário (retirada)', -2, 'salario'], [7600, 'Pizza com as meninas', -1, 'livre']].forEach(([c, desc, d, pote]) => N.lancar(db, 'sai', { c, desc, dia: d, pote }));
  const hoje = new Date().getDate();
  db.fixas.forEach((f) => { if (f.dia < hoje && !f.das) N.pagarFixa(db, f.id, f.c); });
  db.cobrancas = [{ id: 'cb-carla', cli: 'Carla Menezes', tel: '31988871122', c: 45000, desc: 'Retoque da micropigmentação', vence: -3, status: 'aberta', avisos: [-4, -3], criada: -10 }, { id: 'cb-bella', cli: 'Studio Bella (curso)', tel: '31991230987', c: 120000, desc: 'Curso in company · 2ª parcela', vence: 2, status: 'aberta', avisos: [], criada: -6 }, { id: 'cb-ju', cli: 'Juliana Prado', tel: '31996654433', c: 18000, desc: 'Design + henna', vence: 0, status: 'aberta', avisos: [], criada: -2 }];
  N.receber(db, 'cb-carla', 20000); db.movs.at(-1).dia = -2;
  db.contas = [{ id: 'ct-curso', desc: 'Curso de micropigmentação avançada', c: 90000, vence: 6, pote: 'reserva', cat: 'Equipamentos', status: 'aberta' }];
  db.historico = [];
  return db;
}
let falhaCarga = '', somenteLeitura = false;
const parece2 = (d) => d && (d.formato >= 2 || d.migracao || (Array.isArray(d.movs) && d.movs.some((m) => Number.isInteger(m.c) && !('valor' in m))) || (Array.isArray(d.potes) && d.potes.some((p) => 'metaC' in p)));
function arruma(d) {
  d.formato = N.FORMATO;
  ['movs', 'cobrancas', 'contas', 'fixas', 'recibos', 'historico', 'conversa'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
  if (!Array.isArray(d.potes) || !d.potes.length) d.potes = semente().potes;
  // "começar do zero" zera números: a divisão dos potes volta ao padrão em vez de ficar em 0%
  if (d.potes.every((p) => !p.pct)) { d.potes.forEach((p) => { p.pct = PCTS_PADRAO[p.k] ?? 0; }); if (N.validarPcts(d.potes)) { d.potes.forEach((p) => { p.pct = 0; }); d.potes[0].pct = 100; } }
  if (!d.assinatura) d.assinatura = { valor: 59, status: 'ativa', renova: true, proxima: 30, pagos: [] };
  if (!d.fatInicial || typeof d.fatInicial !== 'object') d.fatInicial = { ano: new Date().getFullYear(), c: 0 };
  d.reciboSeq = Math.max(Number(d.reciboSeq) || 0, ...d.recibos.map((r) => r.num || 0));
  return d;
}
function carregar() {
  if (new URLSearchParams(location.search).has('novo')) try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ }
  let txt = null; try { txt = localStorage.getItem(CHAVE); } catch { /* sem acesso */ }
  if (!txt) return semente();
  let bruto; try { bruto = JSON.parse(txt); } catch { falhaCarga = 'Os dados guardados neste aparelho estão ilegíveis.'; somenteLeitura = true; return semente(); }
  if (parece2(bruto)) { const d = arruma(bruto), novo = JSON.stringify(d); if (novo !== txt) try { localStorage.setItem(CHAVE, novo); } catch { /* grava na próxima mudança */ } return d; } // reparo (ex.: divisão zerada) fica gravado
  // formato 1: guarda uma cópia exata antes de converter (Mais › Cópia de segurança devolve ela)
  const kb = `${CHAVE}-copia-formato1:${CONTA}`;
  try { if (!localStorage.getItem(kb)) localStorage.setItem(kb, txt); } catch { falhaCarga = 'Sem espaço para guardar a cópia antes de atualizar os dados.'; somenteLeitura = true; return semente(); }
  try { const novo = arruma(N.migrar(bruto)); localStorage.setItem(CHAVE, JSON.stringify(novo)); return novo; } catch (e) { falhaCarga = `Não consegui atualizar os dados (${e.message}). Nada foi apagado.`; somenteLeitura = true; return semente(); }
}
let db = carregar();
window.veltriaDados = () => db;
window.veltriaEditorFora = ['movs', 'cobrancas', 'contas', 'fixas', 'recibos', 'historico', 'potes', 'migracao'];
window.veltriaSemMaisComum = true;
window.veltriaDadosProprio = () => { location.hash = '#dados'; };
window.veltriaResumoIA = () => {
  const r = N.resumo(db, ...N.periodo('mes')), sd = N.saldos(db), p = N.projecao(db, 30), f = N.faturamentoAno(db);
  return [`Potes: ${db.potes.map((x) => `${x.nome} ${din(sd[x.k])} (${x.pct}% das entradas)`).join('; ')}. Total ${din(N.total(db))}.`,
    `Este mês: receita ${din(r.receita)}, outras entradas ${din(r.outras)}, saídas ${din(r.saidas)}. Maiores gastos: ${r.cats.slice(0, 4).map(([c, v]) => `${c} ${din(v)}`).join(', ') || 'nenhum'}.`,
    `A receber: ${db.cobrancas.map((c) => [c, N.situacaoCob(db, c)]).filter(([, s]) => s.falta).map(([c, s]) => `${c.cli} ${din(s.falta)} ${s.st}`).join('; ') || 'nada'}.`,
    `Próximos 30 dias: entra ${din(p.entra)}, sai ${din(p.sai)}, saldo previsto ${din(p.fim)}. MEI: faturamento do ano ${din(f.total)} de ${din(N.LIMITE_MEI)}.`].join('\n');
};
function grava() {
  if (somenteLeitura) { aviso('Os dados estão protegidos até o problema ser resolvido. Nada foi gravado.'); return false; }
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); return true; } catch { aviso('Sem espaço no celular: não consegui salvar.'); return false; }
}
const pote = (k) => db.potes.find((p) => p.k === k);
const nomePote = (k) => pote(k)?.nome || k;
const dasFixa = () => db.fixas.find((f) => f.das);

function aviso(m, erro) { const a = document.createElement('div'); a.className = `aviso${erro ? ' ruim' : ''}`; a.textContent = m; $('#avisos').append(a); setTimeout(() => a.remove(), erro ? 5200 : 3200); }
/** Executa uma operação do núcleo: erro vira mensagem, sucesso grava e redesenha. */
function faz(fn, ok) { try { const r = fn(); if (r === null) { aviso('Isso já foi lançado.'); return null; } grava(); mostra(); if (ok) aviso(typeof ok === 'function' ? ok(r) : ok); return r ?? true; } catch (e) { aviso(e.message, true); return false; } }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
  return fecha;
}
/** Formulário em folha: valida, mostra o erro dentro da folha e só fecha se deu certo. */
function formFolha(html, enviar) {
  folha(`<form novalidate>${html}<p class="erro" role="alert" hidden></p></form>`, (f, fecha) => {
    const form = f.querySelector('form'), err = f.querySelector('.erro');
    form.addEventListener('submit', (e) => { e.preventDefault(); try { const r = enviar(new FormData(form), form); if (r === false) return; grava(); fecha(); mostra(); if (typeof r === 'string') aviso(r); } catch (x) { err.textContent = x.message; err.hidden = false; } });
  });
}
const valorC = (v) => { const c = N.centavos(v); if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero (ex.: 150,00).'); return c; };
const diaC = (v) => { const d = N.diaDe(v); if (!Number.isFinite(d)) throw new Error('Escolha uma data válida.'); return d; };
const campoValor = (nome, rot, c) => `<label class="campo">${rot}<input name="${nome}" inputmode="decimal" autocomplete="off" required value="${c ? (c / 100).toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>`;
const campoData = (nome, rot, d) => `<label class="campo">${rot}<input name="${nome}" type="date" required value="${N.isoDe(d ?? 0)}"></label>`;
const opPotes = (sel) => db.potes.map((p) => `<option value="${p.k}" ${p.k === sel ? 'selected' : ''}>${t(p.nome)}</option>`).join('');
const opCats = (sel) => N.CATEGORIAS.map((c) => `<option ${c === sel ? 'selected' : ''}>${t(c)}</option>`).join('');
const etq = (st, txt) => `<span class="etq ${{ recebida: 'ok', paga: 'ok', atrasada: 'ru', hoje: 'at', cancelada: '', pausada: '' }[st] ?? ''}">${t(txt)}</span>`;

// ------------------------------------------------------------------ telas
let rascunho = null;
const novoRascunho = (tipo = 'entra', pote = 'contas') => ({ tipo, valor: '', pote, desc: '', dia: 0, receita: true, cat: '', chave: nid() });
let filtro = { busca: '', tipo: '', per: '30' }, aba = 'receber', perResumo = 'mes', previa = null;
const T = {
  potes() {
    const sd = N.saldos(db), r = N.resumo(db, ...N.periodo('mes')), pend = N.pendencias(db);
    return `<section class="saldo"><small>Dinheiro guardado nos potes</small><span class="num">${din(N.total(db))}</span><div class="mes"><span>Entrou no mês <b>${din(r.entradas)}</b></span><span>Saiu <b>${din(r.saidas)}</b></span></div></section>
      <div class="prateleira">${db.potes.map((p) => { const s = sd[p.k], ch = p.metaC ? Math.max(0, Math.min(1, s / p.metaC)) : Math.max(0, Math.min(1, s / 80000)); return `<button type="button" class="pote ${s < 0 ? 'baixo' : ''}" data-ir="pote/${p.k}" style="--c:${cor(p.k)}"><div class="vidro"><i style="height:${Math.max(4, ch * 100)}%"></i><span title="Este pote recebe ${p.pct}% de cada entrada">${p.pct}%</span></div><b>${t(p.nome)}</b><span class="num">${din(s)}</span>${p.metaC ? `<small>meta ${din(p.metaC)}</small>` : '<small>gaste sem culpa</small>'}</button>`; }).join('')}</div>
      <div class="miolo">${pend.length ? `<h2>Para hoje <span class="etq at">${pend.length}</span></h2><div class="cartao pend">${pend.slice(0, 6).map((p) => `<a class="pend-i ${p.tipo}" href="#${p.ir}"><span>${t(p.txt)}</span><span aria-hidden="true">›</span></a>`).join('')}${pend.length > 6 ? `<a class="pend-i" href="#hoje">Ver as ${pend.length} pendências</a>` : ''}</div>` : '<p class="cartao ok-tudo">Nada pendente hoje: contas em dia e ninguém para lembrar.</p>'}
      <h2>Últimos movimentos</h2><div class="cartao">${db.movs.length ? [...db.movs].sort((a, b) => b.dia - a.dia || (b.criado > a.criado ? 1 : -1)).slice(0, 6).map(linhaMov).join('') : '<p class="mini">Nada lançado ainda. Toque no + para lançar a primeira entrada.</p>'}</div><a href="#extrato">Ver o extrato todo</a></div>`;
  },
  hoje() { const pend = N.pendencias(db); return `<div class="miolo"><a href="#potes">← Potes</a><h1>Pendências</h1><p class="sub">O app confere sozinho, toda vez que abre: contas vencendo, cobranças do dia, potes negativos e divisão errada. Nada é pago nem enviado sem você.</p><div class="cartao pend">${pend.map((p) => `<a class="pend-i ${p.tipo}" href="#${p.ir}"><span>${t(p.txt)}</span><span aria-hidden="true">›</span></a>`).join('') || '<p class="mini">Nada pendente.</p>'}</div></div>`; },
  pote(k) {
    const p = pote(k); if (!p) return T.potes();
    const ms = db.movs.filter((m) => N.efeito(m)[k]).sort((a, b) => b.dia - a.dia);
    return `<div class="miolo"><a href="#potes">← Potes</a><h1>${t(p.nome)}</h1><p class="sub">${p.pct}% de cada entrada vem para cá. Saldo: <b class="num">${din(N.saldos(db)[k])}</b>${p.metaC ? ` de ${din(p.metaC)}` : ''}.</p>
      <div class="linha"><button type="button" class="bt pq cheio" data-acao="mover" data-de="${p.k}">Passar para outro pote</button><a class="bt pq" href="#divisao">Mudar a divisão</a><button type="button" class="bt pq" data-acao="meta" data-k="${p.k}">Meta</button></div>
      <h2>Movimentos deste pote</h2><div class="cartao">${ms.map((m) => linhaMov(m, k)).join('') || '<p class="mini">Nada ainda.</p>'}</div></div>`;
  },
  divisao() {
    return `<div class="miolo"><a href="#potes">← Potes</a><h1>Divisão das entradas</h1><p class="sub">Quanto de cada real que entra vai para cada pote. Precisa somar exatamente 100%. Vale para as próximas entradas: as que já entraram ficam como foram divididas.</p>
      <form id="f-div" class="cartao">${db.potes.map((p) => `<label class="campo campo-l" style="--c:${cor(p.k)}"><span>${t(p.nome)}</span><input type="number" inputmode="numeric" min="0" max="100" step="1" name="${p.k}" value="${p.pct}"> %</label>`).join('')}
      <p class="soma" aria-live="polite"></p><button class="bt cheio largo">Salvar a divisão</button></form></div>`;
  },
  extrato() {
    const [de, ate] = filtro.per === 'tudo' ? [-1e6, 1e6] : N.periodo(filtro.per), q = sa(filtro.busca);
    const l = db.movs.filter((m) => m.dia >= de && m.dia <= ate && (!filtro.tipo || m.tipo === filtro.tipo) && (!q || sa(`${m.desc} ${m.cli || ''} ${m.cat || ''}`).includes(q))).sort((a, b) => b.dia - a.dia);
    const r = N.resumo({ ...db, movs: l }, -1e6, 1e6);
    return `<div class="miolo"><a href="#potes">← Potes</a><h1>Extrato</h1>
      <div class="filtros"><input type="search" id="busca" placeholder="Procurar (cliente, descrição, categoria)" value="${t(filtro.busca)}" aria-label="Procurar no extrato">
      <div class="chips">${[['30', '30 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([k, n]) => `<button type="button" data-per="${k}" aria-pressed="${filtro.per === k}">${n}</button>`).join('')}</div>
      <div class="chips">${[['', 'Todos'], ['entra', 'Entradas'], ['sai', 'Saídas'], ['transf', 'Entre potes']].map(([k, n]) => `<button type="button" data-ftipo="${k}" aria-pressed="${filtro.tipo === k}">${n}</button>`).join('')}</div></div>
      <p class="mini">${l.length} movimento(s) · entradas ${din(r.entradas)} · saídas ${din(r.saidas)}</p>
      <div class="cartao">${l.map((m) => linhaMov(m)).join('') || '<p class="mini">Nada encontrado com esses filtros.</p>'}</div>
      <div class="linha"><button type="button" class="bt pq" data-acao="exportar">Baixar extrato (Excel/CSV)</button><a class="bt pq" href="#importar">Importar extrato do banco</a></div></div>`;
  },
  mov(id) {
    const m = db.movs.find((x) => x.id === id); if (!m) return T.extrato();
    const nome = { entra: 'Entrada', sai: 'Saída', transf: 'Entre potes', ajuste: 'Acerto de saldo' }[m.tipo];
    const det = m.tipo === 'entra' ? `<p class="mini">${m.receita === false ? 'Não é receita do negócio (não conta no MEI).' : 'Receita do negócio (conta no faturamento do MEI).'}</p><div class="divisao">${Object.entries(m.div).map(([k, v]) => `<div style="--c:${cor(k)}"><span>${t(nomePote(k))}</span><b class="num">${din(v)}</b></div>`).join('')}</div>${m.divEstimada ? '<p class="mini">Divisão refeita na atualização do app, com as porcentagens que estavam salvas.</p>' : ''}`
      : m.tipo === 'sai' ? `<p class="mini">Saiu do pote ${t(nomePote(m.pote))} · ${t(m.cat || 'Outros')}</p>` : m.tipo === 'transf' ? `<p class="mini">De ${t(nomePote(m.de))} para ${t(nomePote(m.para))}</p>` : `<p class="mini">${m.sinal < 0 ? 'Tirou de' : 'Pôs em'} ${t(nomePote(m.pote))}</p>`;
    const lig = m.cob ? `Recebimento da cobrança de ${t(db.cobrancas.find((c) => c.id === m.cob)?.cli || '')}.` : m.fixa ? 'Pagamento de conta fixa.' : m.conta ? 'Pagamento de conta a pagar.' : m.origem === 'importacao' ? `Importado de ${t(m.imp?.arquivo || 'planilha')}.` : '';
    return `<div class="miolo"><a href="#extrato">← Extrato</a><h1>${nome}: ${din(m.c)}</h1><p class="sub">${t(m.desc)} · ${dia(m.dia)}${m.cli ? ` · ${t(m.cli)}` : ''}</p><div class="cartao">${det}${lig ? `<p class="mini">${lig}</p>` : ''}${m.editado ? `<p class="mini">Editado em ${new Date(m.editado).toLocaleString('pt-BR')}.</p>` : ''}</div>
      <div class="linha"><button type="button" class="bt pq cheio" data-acao="editar-mov" data-m="${m.id}">Editar</button>${m.tipo === 'entra' ? `<button type="button" class="bt pq" data-acao="recibo" data-m="${m.id}">Recibo</button>` : ''}<button type="button" class="bt pq perigo" data-acao="apagar-mov" data-m="${m.id}">Apagar</button></div></div>`;
  },
  lancar() {
    const r = rascunho ||= novoRascunho(), c = Number(r.valor || 0);
    const sugerida = r.cat || N.categoriaSugerida(r.desc) || '';
    let prev = ''; if (r.tipo === 'entra' && c > 0 && !N.validarPcts(db.potes)) { const d = N.dividir(c, db.potes); prev = `<p class="mini">Vai ser dividido assim:</p><div class="divisao">${db.potes.map((p) => `<div style="--c:${cor(p.k)}"><span>${t(p.nome)}</span><b class="num">${din(d[p.k] || 0)}</b></div>`).join('')}</div>`; }
    const pv = r.tipo === 'entra' ? N.validarPcts(db.potes) : '';
    return `<div class="miolo"><h1>${r.tipo === 'entra' ? 'Entrou dinheiro' : 'Saiu dinheiro'}</h1>
      <div class="alterna" role="group" aria-label="Tipo"><button type="button" data-tipo="entra" aria-pressed="${r.tipo === 'entra'}">Entrou</button><button type="button" class="sai" data-tipo="sai" aria-pressed="${r.tipo === 'sai'}">Saiu</button></div>
      <div class="visor-valor" aria-live="polite">${din(c)}</div>
      <div class="teclado">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((k) => `<button type="button" data-tecla="${k}" aria-label="${k === '⌫' ? 'Apagar' : k}">${k}</button>`).join('')}</div>
      ${pv ? `<p class="erro">${t(pv)} <a href="#divisao">Arrumar a divisão</a></p>` : prev}
      ${r.tipo === 'sai' ? `<p class="mini">Sai de qual pote?</p><div class="chips">${db.potes.map((p) => `<button type="button" data-pote-sai="${p.k}" aria-pressed="${r.pote === p.k}">${t(p.nome)}</button>`).join('')}</div>` : ''}
      <label class="campo">${r.tipo === 'entra' ? 'De quê? (cliente, serviço)' : 'Com quê?'}<input id="desc-l" value="${t(r.desc)}" placeholder="${r.tipo === 'entra' ? 'Design + henna' : 'Pigmentos'}" maxlength="120"></label>
      ${r.tipo === 'sai' ? `<label class="campo">Categoria<select id="cat-l"><option value="">${sugerida ? `Automática: ${t(sugerida)}` : 'Automática'}</option>${opCats(r.cat)}</select></label>` : `<label class="check"><input type="checkbox" id="rec-l" ${r.receita ? 'checked' : ''}> É receita do negócio (conta no MEI). Desmarque para empréstimo, aporte ou reembolso.</label>`}
      <div class="chips" role="group" aria-label="Quando">${[[0, 'Hoje'], [-1, 'Ontem']].map(([d, n]) => `<button type="button" data-dia-l="${d}" aria-pressed="${r.dia === d}">${n}</button>`).join('')}<label class="chip-data">Outra data <input type="date" id="dia-l" max="${N.isoDe(0)}" value="${r.dia < -1 ? N.isoDe(r.dia) : ''}"></label></div>
      <button type="button" class="bt cheio largo" data-acao="salvar-mov" ${c && !pv ? '' : 'disabled'}>Guardar ${din(c)}</button>${r.tipo === 'entra' ? '<p class="mini" style="text-align:center">Quer o recibo? Depois de guardar, toque no movimento.</p>' : ''}</div>`;
  },
  contas(sub) {
    if (sub === 'pagar') aba = 'pagar'; else if (sub === 'receber') aba = 'receber';
    const cab = `<div class="miolo"><h1>Contas</h1><div class="alterna" role="group" aria-label="Contas"><button type="button" data-aba-c="receber" aria-pressed="${aba === 'receber'}">A receber</button><button type="button" data-aba-c="pagar" aria-pressed="${aba === 'pagar'}">A pagar</button></div>`;
    if (aba === 'receber') {
      const l = db.cobrancas.map((c) => [c, N.situacaoCob(db, c)]).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
      const aberto = l.reduce((s, [, x]) => s + x.falta, 0), atras = l.filter(([, x]) => x.st === 'atrasada').reduce((s, [, x]) => s + x.falta, 0);
      return `${cab}<p class="sub">${din(aberto)} para receber${atras ? `, <b style="color:var(--vermelho)">${din(atras)} atrasado</b>` : ''}. O app mostra quando é dia de lembrar (1 dia antes, no dia e a partir de 3 dias de atraso); o lembrete sai pelo seu WhatsApp, com o PIX pronto.</p><button type="button" class="bt cheio largo" data-acao="nova-cob">+ Nova cobrança</button>
        ${l.map(([c, s]) => `<div class="cartao cob"><div class="topo-c"><div><b>${t(c.cli)}</b><small class="mini">${t(c.desc)}</small></div><span class="num">${din(c.c)}</span></div>
          <p class="mini">${s.st === 'recebida' ? etq('recebida', 'recebida') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? etq('atrasada', `atrasada ${-c.vence} dia(s)`) : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`)}${s.parcial ? ` · recebido ${din(s.r)}, falta <b>${din(s.falta)}</b>` : ''}${c.avisos?.length ? ` · último lembrete ${dia(Math.max(...c.avisos))}` : ''}</p>
          ${s.falta ? `<div class="linha"><button type="button" class="bt pq cheio" data-acao="cobrar" data-c="${c.id}">Cobrar (PIX + WhatsApp)</button><button type="button" class="bt pq" data-acao="receber" data-c="${c.id}">Recebi</button><button type="button" class="bt pq" data-acao="editar-cob" data-c="${c.id}">Editar</button></div>` : ''}
          ${db.movs.some((m) => m.cob === c.id) ? `<details><summary class="mini">Recebimentos</summary>${db.movs.filter((m) => m.cob === c.id).map((m) => linhaMov(m)).join('')}</details>` : ''}</div>`).join('') || '<p class="cartao mini">Nenhuma cobrança ainda.</p>'}</div>`;
    }
    const fx = db.fixas.map((f) => [f, N.situacaoFixa(db, f)]), ct = db.contas.map((c) => [c, N.situacaoConta(db, c)]).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
    return `${cab}<p class="sub">Contas fixas renovam sozinhas todo mês; contas avulsas vencem uma vez. Ao pagar, o valor sai do pote certo e vai para o extrato.</p>
      <h2>Contas fixas · ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</h2>${fx.map(([f, s]) => `<div class="cartao cob"><div class="topo-c"><div><b>${t(f.desc)}</b><small class="mini">todo dia ${f.dia} · pote ${t(nomePote(f.pote))}</small></div><span class="num">${din(f.c)}</span></div>
        <p class="mini">${s.st === 'paga' ? etq('paga', 'paga este mês') : s.st === 'pausada' ? etq('pausada', 'pausada') : s.st === 'atrasada' ? etq('atrasada', 'atrasada') : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence em ${s.venceEm} dia(s)`)}${s.parcial || (s.p && s.falta) ? ` · pago ${din(s.p)}` : ''}${s.antAberta ? ` · ${etq('atrasada', 'mês passado sem pagamento')}` : ''}</p>
        <div class="linha">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-fixa" data-f="${f.id}">Paguei</button>` : ''}${s.antAberta ? `<button type="button" class="bt pq" data-acao="pagar-fixa" data-f="${f.id}" data-comp="${s.compAnt}">Paguei o mês passado</button>` : ''}<button type="button" class="bt pq" data-acao="editar-fixa" data-f="${f.id}">Editar</button></div></div>`).join('') || '<p class="cartao mini">Nenhuma conta fixa.</p>'}
      <button type="button" class="bt largo" data-acao="editar-fixa">+ Conta fixa (todo mês)</button>
      <h2>Contas avulsas</h2>${ct.map(([c, s]) => `<div class="cartao cob"><div class="topo-c"><div><b>${t(c.desc)}</b><small class="mini">pote ${t(nomePote(c.pote))}</small></div><span class="num">${din(c.c)}</span></div>
        <p class="mini">${s.st === 'paga' ? etq('paga', 'paga') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? etq('atrasada', `atrasada ${-c.vence} dia(s)`) : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`)}${s.parcial ? ` · pago ${din(s.p)}, falta <b>${din(s.falta)}</b>` : ''}</p>
        ${s.falta ? `<div class="linha"><button type="button" class="bt pq cheio" data-acao="pagar-conta" data-c="${c.id}">Paguei</button><button type="button" class="bt pq" data-acao="editar-conta" data-c="${c.id}">Editar</button></div>` : ''}</div>`).join('') || '<p class="cartao mini">Nenhuma conta avulsa.</p>'}
      <button type="button" class="bt largo" data-acao="editar-conta">+ Conta a pagar</button></div>`;
  },
  resumo() {
    const [de, ate] = N.periodo(perResumo), r = N.resumo(db, de, ate), p = N.projecao(db, 30), maxCat = Math.max(1, ...r.cats.map(([, v]) => v));
    return `<div class="miolo"><h1>Resumo</h1><div class="chips">${[['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['90', '90 dias'], ['ano', 'Ano']].map(([k, n]) => `<button type="button" data-per-r="${k}" aria-pressed="${perResumo === k}">${n}</button>`).join('')}</div>
      <section class="cartao"><small class="mini">Realizado no período</small><div class="tres"><div><span class="mini">Entrou</span><b class="num">${din(r.entradas)}</b></div><div><span class="mini">Saiu</span><b class="num sai">${din(r.saidas)}</b></div><div><span class="mini">Sobrou</span><b class="num ${r.resultado < 0 ? 'sai' : ''}">${din(r.resultado)}</b></div></div>${r.outras ? `<p class="mini">Das entradas, ${din(r.outras)} não são receita (empréstimo, aporte, reembolso).</p>` : ''}</section>
      <h2>Para onde foi o dinheiro</h2><div class="cartao">${r.cats.map(([c, v]) => `<div class="barra-c"><span>${t(c)}</span><i style="width:${Math.round(v / maxCat * 100)}%"></i><b class="num">${din(v)}</b></div>`).join('') || '<p class="mini">Nenhuma saída no período.</p>'}</div>
      <h2>Próximos 30 dias <span class="etq">previsto</span></h2><section class="cartao"><div class="tres"><div><span class="mini">Hoje nos potes</span><b class="num">${din(p.hoje)}</b></div><div><span class="mini">Deve entrar</span><b class="num">${din(p.entra)}</b></div><div><span class="mini">Deve sair</span><b class="num sai">${din(p.sai)}</b></div></div>
        <p class="mini">Se tudo acontecer como previsto, você termina com <b>${din(p.fim)}</b>.${p.menor.s < 0 ? ` <b style="color:var(--vermelho)">Atenção: o saldo fica negativo (${din(p.menor.s)}) ${dia(p.menor.dia)}.</b>` : ''} Cobranças entram aqui pelo que falta receber; atrasadas contam como hoje.</p>
        ${p.itens.slice(0, 12).map((i) => `<div class="mov"><span class="ic ${i.sinal < 0 ? 'sai' : ''}">${i.sinal < 0 ? '↑' : '↓'}</span><span>${t(i.desc)}<small>${i.atrasada ? 'atrasada' : dia(i.dia)}</small></span><span class="num ${i.sinal < 0 ? 'sai' : ''}">${i.sinal < 0 ? '−' : '+'}${din(i.c)}</span></div>`).join('')}</section>
      <a class="bt pq" href="#extrato">Ver o extrato</a></div>`;
  },
  mei() {
    const f = N.faturamentoAno(db), uso = f.total / N.LIMITE_MEI, h = new Date(), diasAno = Math.max(1, Math.round((h - new Date(h.getFullYear(), 0, 1)) / 864e5) + 1), proj = Math.round(f.total / diasAno * 365), das = dasFixa(), sd = das ? N.situacaoFixa(db, das) : null;
    return `<div class="miolo"><h1>Meu MEI</h1><p class="sub">${t(db.cnpj || 'CNPJ não informado')} · o que o governo olha, sem complicação.</p>
      <div class="cartao"><b>Faturamento do ano</b><p class="num" style="font-size:1.8rem;margin:4px 0 0">${din(f.total)}</p><div class="medidor"><i class="${uso > 0.8 ? 'perto' : ''}" style="width:${Math.min(100, uso * 100)}%"></i></div><p class="mini" style="margin:0">${Math.round(uso * 100)}% do limite de ${din(N.LIMITE_MEI)}. No ritmo atual o ano fecha perto de ${din(proj)}${proj > N.LIMITE_MEI ? ': <b style="color:var(--vermelho)">passa do limite</b>. Fale com um contador sobre virar ME antes de dezembro.' : ', dentro do limite.'}</p><p class="mini">Soma ${din(f.antes)} informado antes de usar o app + ${din(f.app)} de entradas marcadas como receita. <a href="#config">Corrigir</a></p></div>
      <div class="cartao"><b>DAS do mês</b>${das ? `<p class="mini" style="margin:2px 0 8px">${din(das.c)} · vence dia ${das.dia}. ${sd.st === 'paga' ? etq('paga', 'pago') : sd.st === 'atrasada' ? etq('atrasada', 'atrasado') : etq('hoje', 'a pagar')} · o pote do imposto tem ${din(N.saldos(db)[das.pote])}.</p><div class="linha">${sd.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-fixa" data-f="${das.id}">Paguei o DAS</button>` : ''}<a class="bt pq" target="_blank" rel="noopener" href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao">Gerar a guia no site do governo</a></div>` : `<p class="mini">Cadastre o valor do seu DAS para o app lembrar todo mês.</p><button type="button" class="bt pq" data-acao="editar-fixa" data-das="1">Cadastrar o DAS</button>`}</div>
      <div class="cartao"><b>Declaração anual (DASN-SIMEI)</b><p class="mini" style="margin:2px 0 8px">Até 31 de maio. O app soma as entradas marcadas como receita; confira com seus comprovantes antes de declarar.</p><button type="button" class="bt pq" data-acao="dasn">Ver o resumo</button></div>
      <div class="cartao"><b>Recibo</b><p class="mini" style="margin:2px 0 8px">Para cliente que pede comprovante. Cada recibo ganha número e fica guardado. Nota fiscal (NFS-e) não é emitida por este app.</p><div class="linha"><button type="button" class="bt pq" data-acao="recibo">Fazer um recibo</button><a class="bt pq" href="#recibos">Recibos emitidos (${db.recibos.length})</a></div></div></div>`;
  },
  mais() {
    const l = [['ia', 'Assistente', 'pergunte sobre o seu dinheiro'], ['hoje', 'Pendências', `${N.pendencias(db).length} agora`], ['dados', 'Importar, exportar e cópia', 'extrato do banco, Excel, cópia de segurança'], ['historico', 'Histórico', 'tudo que foi lançado, editado e apagado'], ['recibos', 'Recibos emitidos', `${db.recibos.length} recibo(s)`], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Equipe', 'quem ajuda e o que cada um vê'], ['config', 'Configurações', 'nome, PIX, CNPJ, faturamento']];
    return `<div class="miolo"><h1>Mais</h1><div class="lista-mais">${l.map(([k, n, s]) => `<a href="#${k}"><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div></div>`;
  },
  dados() {
    const temCopia = (() => { try { return !!localStorage.getItem(`${CHAVE}-copia-formato1:${CONTA}`) || !!localStorage.getItem(`${CHAVE}-antes-de-restaurar:${CONTA}`); } catch { return false; } })();
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Importar, exportar e cópia</h1>
      <div class="cartao"><b>Importar extrato do banco</b><p class="mini">Arquivo OFX ou CSV baixado do internet banking. Você confere tudo antes de gravar; o que já está no extrato não entra de novo. Não há ligação automática com banco: é você quem traz o arquivo.</p><a class="bt pq cheio" href="#importar">Escolher arquivo</a></div>
      <div class="cartao"><b>Baixar o extrato</b><p class="mini">Planilha (CSV) que abre no Excel e no Google Planilhas: data, tipo, descrição, valor, categoria e potes.</p><button type="button" class="bt pq" data-acao="exportar">Baixar CSV</button></div>
      <div class="cartao"><b>Cópia de segurança</b><p class="mini">Um arquivo com tudo (potes, extrato, contas, cobranças, recibos). Guarde no Drive ou no e-mail. Restaurar substitui os dados atuais, que ficam guardados neste aparelho caso precise voltar.</p><div class="linha"><button type="button" class="bt pq" data-acao="copia">Baixar cópia</button><label class="bt pq">Restaurar cópia<input type="file" id="restaurar" accept=".json,application/json" hidden></label>${temCopia ? '<button type="button" class="bt pq" data-acao="voltar-copia">Voltar a versão anterior</button>' : ''}</div></div></div>`;
  },
  importar() {
    if (!previa) return `<div class="miolo"><a href="#dados">← Voltar</a><h1>Importar extrato</h1><p class="sub">Escolha o arquivo OFX ou CSV do seu banco. No CSV, a primeira linha precisa ter os nomes das colunas, com "Data" e "Valor" (ou "Entrada" e "Saída").</p><label class="bt cheio largo">Escolher arquivo<input type="file" id="arq-extrato" accept=".ofx,.csv,.txt,text/csv" hidden></label><p class="mini">Entradas são divididas pelos potes como hoje (${db.potes.map((p) => `${t(p.nome)} ${p.pct}%`).join(', ')}).</p></div>`;
    const novas = previa.linhas.filter((l) => !l.duplicada);
    return `<div class="miolo"><a href="#dados" data-acao="cancelar-imp">← Cancelar</a><h1>Conferir antes de gravar</h1><p class="sub">${t(previa.arquivo)}: ${previa.linhas.length} lançamento(s) lidos, ${previa.linhas.length - novas.length} já estavam no extrato${previa.erros.length ? `, ${previa.erros.length} linha(s) com problema` : ''}.</p>
      ${previa.erros.length ? `<details class="cartao" open><summary><b>Linhas que não entram (${previa.erros.length})</b></summary>${previa.erros.slice(0, 30).map((e) => `<p class="mini">Linha ${e.linha}: ${t(e.motivo)}</p>`).join('')}</details>` : ''}
      <form id="f-imp"><label class="campo">As saídas saem de qual pote?<select name="pote">${opPotes('contas')}</select></label><label class="check"><input type="checkbox" name="receita" checked> As entradas são receita do negócio (contam no MEI)</label>
      <div class="cartao tabela-imp">${previa.linhas.map((l, i) => `<label class="lin-imp ${l.duplicada ? 'dup' : ''}"><input type="checkbox" name="l${i}" ${l.duplicada ? 'disabled' : 'checked'}><span>${t(l.desc)}<small>${dia(l.dia)}${l.duplicada ? ' · já está no extrato' : ''}</small></span><b class="num ${l.tipo === 'sai' ? 'sai' : ''}">${l.tipo === 'sai' ? '−' : '+'}${din(l.c)}</b></label>`).join('')}</div>
      <button class="bt cheio largo" ${novas.length ? '' : 'disabled'}>Gravar ${novas.length} lançamento(s)</button></form></div>`;
  },
  historico() { return `<div class="miolo"><a href="#mais">← Mais</a><h1>Histórico</h1><p class="sub">Tudo que foi lançado, editado, pago, recebido e apagado, do mais novo ao mais antigo.</p><div class="cartao">${db.historico.slice(0, 150).map((h) => `<div class="mov"><span>${t(h.oque)}<small>${h.quando ? new Date(h.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : dia(h.dia)}</small></span></div>`).join('') || '<p class="mini">Nada registrado ainda.</p>'}</div></div>`; },
  recibos() { return `<div class="miolo"><a href="#mais">← Mais</a><h1>Recibos emitidos</h1><div class="cartao">${[...db.recibos].reverse().map((r) => `<div class="mov" data-acao="ver-recibo" data-r="${r.id}" role="button" tabindex="0"><span class="ic">№</span><span>Nº ${r.num} · ${t(r.cli)}<small>${dia(r.dia)} · ${t(r.ref)}</small></span><span class="num">${din(r.c)}</span></div>`).join('') || '<p class="mini">Nenhum recibo ainda.</p>'}</div><button type="button" class="bt largo" data-acao="recibo">Fazer um recibo</button></div>`; },
  conferir() {
    const l = (db.migracao?.divergencias || []).filter((d) => !d.resolvida);
    return `<div class="miolo"><a href="#potes">← Potes</a><h1>Conferir potes</h1><p class="sub">O app foi atualizado: agora o saldo de cada pote é a soma do extrato, ao centavo. Nestes potes, o saldo que aparecia antes não bate com o extrato (provavelmente algo foi mexido fora do extrato). Nada foi lançado por conta própria: escolha o que vale.</p>
      ${l.map((d) => `<div class="cartao"><b>${t(d.nome)}</b><p class="mini">Antes mostrava <b>${din(d.gravado)}</b> · o extrato soma <b>${din(d.calculado)}</b> · diferença ${din(d.gravado - d.calculado)}</p><div class="linha"><button type="button" class="bt pq" data-acao="div-extrato" data-p="${d.pote}">Vale o extrato</button><button type="button" class="bt pq cheio" data-acao="div-acerto" data-p="${d.pote}">Lançar acerto de ${din(Math.abs(d.gravado - d.calculado))}</button></div></div>`).join('') || '<p class="cartao mini">Tudo conferido.</p>'}</div>`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Oi, ${(db.dono || '').split(' ')[0]}! Eu vejo seus potes, contas, cobranças e o MEI. Pergunte do seu jeito.` }];
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Assistente</h1><div class="chat">${conv.map((m) => `<div class="bolha ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['Quanto posso gastar este mês?', 'Quem está me devendo?', 'Vou estourar o MEI?', 'O que vence esta semana?'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form></div>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--vermelho)"><b style="color:var(--vermelho)">Assinatura vencida</b><p class="mini" style="margin:4px 0 0">O pagamento de ${din(a.valor * 100)} não foi aprovado. Seus potes e cobranças estão guardados.</p></div>`
      : a.renova ? `<div class="cartao"><b>Ativa</b><p class="mini" style="margin:4px 0 0">Plano Assinatura · ${din(a.valor * 100)} por mês · próxima cobrança ${dia(a.proxima)}.</p></div>`
        : `<div class="cartao" style="border-color:var(--palha)"><b>Cancelada</b><p class="mini" style="margin:4px 0 0">Você usa tudo até ${dia(a.proxima)}. Depois disso nada mais é cobrado.</p></div>`;
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.${CONTA === 'demo' ? ' Nesta demonstração os pagamentos são simulados.' : ''}</p>${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><div class="cartao">${a.pagos.map((d) => `<div class="mov"><span class="ic">✓</span><span>Mensalidade<small>${dia(d)}</small></span><span class="num">${din(a.valor * 100)}</span></div>`).join('') || '<p class="mini">Nenhum ainda.</p>'}</div></div>`;
  },
  dono() {
    const real = !!document.querySelector('[data-vc="equipe"]');
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Equipe</h1><p class="sub">Quem te ajuda entra com o próprio login e só vê e mexe no que você liberar. O convite sai por e-mail ou WhatsApp.</p>
      ${real ? '<button type="button" class="bt cheio largo" data-acao="equipe">Abrir a equipe e os convites</button>' : '<p class="cartao mini">Na demonstração não há convites. Com a sua conta, este botão abre a equipe de verdade: convite por e-mail ou WhatsApp, acesso só para ver ou para mexer, e quem fez cada alteração.</p>'}</div>`;
  },
  config() {
    const f = N.faturamentoAno(db);
    return `<div class="miolo"><a href="#mais">← Mais</a><h1>Configurações</h1>${[['negocio', 'Seu nome e negócio'], ['dono', 'Como te chamo'], ['pix', 'Chave PIX das cobranças'], ['cidade', 'Cidade (vai no PIX)'], ['cnpj', 'CNPJ do MEI']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k])}" maxlength="80"></label>`).join('')}
      <label class="campo">Faturamento deste ano antes de usar o app (R$)<input data-cfg-fat inputmode="decimal" value="${(f.antes / 100).toFixed(2).replace('.', ',')}"></label><p class="mini">O faturamento do MEI é esse valor + as entradas marcadas como receita neste ano.</p>
      <p class="mini">Os dados ficam no seu celular e, com a sua conta, na nuvem. Sem internet, o que você lançar sobe quando a conexão voltar.</p></div>`;
  },
};
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima ${dia(a.proxima)}` : `cancelada · usa até ${dia(a.proxima)}`; };
function linhaMov(m, soPote) {
  const sinal = m.tipo === 'sai' || (m.tipo === 'ajuste' && m.sinal < 0) ? -1 : 1, ef = soPote ? N.efeito(m)[soPote] : null;
  const valor = soPote ? Math.abs(ef) : m.c, neg = soPote ? ef < 0 : sinal < 0, ic = m.tipo === 'transf' ? '⇄' : neg ? '↑' : '↓';
  const sub = m.tipo === 'sai' ? ` · ${t(nomePote(m.pote))}` : m.tipo === 'transf' ? ` · ${t(nomePote(m.de))} → ${t(nomePote(m.para))}` : m.tipo === 'entra' && soPote ? ' · parte do pote' : m.tipo === 'entra' && m.receita === false ? ' · não é receita' : '';
  return `<div class="mov" data-ir="mov/${m.id}" role="button" tabindex="0"><span class="ic ${neg ? 'sai' : ''}">${ic}</span><span>${t(m.desc)}<small>${dia(m.dia)}${sub}${m.origem === 'importacao' ? ' · importado' : ''}</small></span><span class="num ${neg ? 'sai' : ''}">${m.tipo === 'transf' && !soPote ? '' : neg ? '−' : '+'}${din(valor)}</span></div>`;
}

function responde(p) {
  const x = sa(p), sd = N.saldos(db);
  if (/gastar|posso|sobra/.test(x)) return `Sem mexer em imposto, contas e reserva, você pode gastar ${din(sd.livre || 0)} (pote Livre). O pote Meu salário tem ${din(sd.salario || 0)}.`;
  if (/devend|deve|receber|cobr/.test(x)) { const a = db.cobrancas.map((c) => [c, N.situacaoCob(db, c)]).filter(([, s]) => s.falta); return a.length ? a.map(([c, s]) => `• ${c.cli}: ${din(s.falta)} ${s.st === 'atrasada' ? `(atrasada ${-c.vence} dia(s))` : `(vence ${dia(c.vence)})`}`).join('\n') : 'Ninguém está te devendo.'; }
  if (/mei|limite|estour/.test(x)) { const f = N.faturamentoAno(db); return `Você faturou ${din(f.total)} no ano; o limite é ${din(N.LIMITE_MEI)}. Veja o ritmo na aba Meu MEI.`; }
  if (/vence|semana|pagar/.test(x)) { const p7 = N.projecao(db, 7).itens.filter((i) => i.sinal < 0); return p7.length ? p7.map((i) => `• ${i.desc}: ${din(i.c)} ${i.atrasada ? '(atrasada)' : dia(i.dia)}`).join('\n') : 'Nada vence nos próximos 7 dias.'; }
  return `Hoje você tem ${din(N.total(db))} nos potes. Nos próximos 30 dias devem entrar ${din(N.projecao(db, 30).entra)}.`;
}
function baixa(nome, conteudo, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ------------------------------------------------------------------ navegação e trava
function mostra() {
  const [r, a] = (location.hash.slice(1) || 'potes').split('/');
  const tela = $('#tela');
  if (falhaCarga) { tela.innerHTML = `<div class="miolo"><h1>Seus dados estão protegidos</h1><p class="erro">${t(falhaCarga)}</p><p class="sub">Para não perder nada, o app não grava enquanto isso não for resolvido. Baixe a cópia do que estava guardado e fale com o suporte.</p><button type="button" class="bt cheio largo" data-acao="copia-bruta">Baixar o que estava guardado</button></div>`; return; }
  tela.innerHTML = (T[r] || T.potes)(a);
  const aba = { pote: 'potes', extrato: 'potes', mov: 'potes', hoje: 'potes', divisao: 'potes', conferir: 'potes', lancar: '', ia: 'mais', dados: 'mais', importar: 'mais', historico: 'mais', recibos: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] ?? r;
  document.querySelectorAll('.doca a').forEach((l) => { if (l.dataset.aba === aba) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  const np = N.pendencias(db).length, bd = $('.doca [data-aba="potes"] .n'); if (bd) { bd.textContent = np; bd.hidden = !np; }
  $('.fab').hidden = r === 'lancar';
  $('#nome-neg').textContent = db.negocio;
  const h = new Date().getHours(); $('#saudacao').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="margin:12px 18px 0;padding:8px 12px;background:#f1e5c8">Assinatura cancelada: você usa até ${dia(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  if (r === 'divisao') somaDiv();
  trava(r);
  document.title = `${{ potes: 'Potes', pote: 'Pote', extrato: 'Extrato', mov: 'Movimento', lancar: 'Lançar', contas: 'Contas', resumo: 'Resumo', mei: 'Meu MEI', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Equipe', config: 'Configurações', dados: 'Dados', importar: 'Importar extrato', historico: 'Histórico', recibos: 'Recibos', divisao: 'Divisão', hoje: 'Pendências', conferir: 'Conferir potes' }[r] || 'Potes'} · Veltria Financeiro Essencial`;
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#importar')) previa = null; mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Seus potes, cobranças e o histórico estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}
function somaDiv() {
  const f = $('#f-div'); if (!f) return;
  const soma = [...f.querySelectorAll('input')].reduce((s, i) => s + (Number(i.value) || 0), 0), ok = soma === 100 && [...f.querySelectorAll('input')].every((i) => Number.isInteger(Number(i.value)) && i.value !== '');
  f.querySelector('.soma').innerHTML = ok ? 'Soma: <b>100%</b>. Pode salvar.' : `Soma: <b style="color:var(--vermelho)">${soma}%</b>. ${soma > 100 ? `Tire ${soma - 100}%` : `Faltam ${100 - soma}%`} para dar 100%.`;
  f.querySelector('button').disabled = !ok;
}

// ------------------------------------------------------------------ ações
const ACOES = {
  'salvar-mov': (d, bt) => {
    const r = rascunho, c = Number(r.valor || 0); r.desc = $('#desc-l')?.value.trim() || ''; r.cat = $('#cat-l')?.value || ''; if ($('#rec-l')) r.receita = $('#rec-l').checked;
    bt.disabled = true;
    const m = faz(() => N.lancar(db, r.tipo, { c, desc: r.desc, dia: r.dia, pote: r.pote, cat: r.cat, receita: r.receita }, r.chave), (x) => (r.tipo === 'entra' ? `${din(x.c)} dividido nos potes.` : `${din(x.c)} saiu do pote ${nomePote(x.pote)}.`));
    if (m) { if (r.tipo === 'sai' && N.saldos(db)[r.pote] < 0) aviso(`O pote ${nomePote(r.pote)} ficou negativo.`, true); rascunho = novoRascunho(r.tipo, r.pote); location.hash = '#potes'; } else bt.disabled = false;
  },
  'editar-mov': (d) => {
    const m = db.movs.find((x) => x.id === d.m); if (!m) return;
    formFolha(`<h2>Editar ${m.tipo === 'entra' ? 'entrada' : m.tipo === 'sai' ? 'saída' : 'movimento'}</h2>${campoValor('v', 'Valor (R$)', m.c)}<label class="campo">Descrição<input name="desc" value="${t(m.desc)}" maxlength="120"></label>${campoData('dia', 'Data', m.dia)}
      ${m.tipo === 'sai' ? `<label class="campo">Pote<select name="pote">${opPotes(m.pote)}</select></label><label class="campo">Categoria<select name="cat">${opCats(m.cat)}</select></label>` : ''}${m.tipo === 'transf' ? `<label class="campo">De<select name="de">${opPotes(m.de)}</select></label><label class="campo">Para<select name="para">${opPotes(m.para)}</select></label>` : ''}
      ${m.tipo === 'entra' ? `<label class="check"><input type="checkbox" name="receita" ${m.receita !== false ? 'checked' : ''}> É receita do negócio</label><p class="mini">Se mudar o valor, a divisão nos potes muda na mesma proporção desta entrada.</p>` : ''}${m.cob ? `<p class="mini">Este valor é recebimento de uma cobrança: não pode passar do que falta receber.</p>` : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const mud = { c: valorC(f.get('v')), desc: String(f.get('desc') || '').trim() || m.desc, dia: diaC(f.get('dia')) };
      if (mud.dia > 0) throw new Error('A data não pode ser no futuro.');
      if (m.tipo === 'sai') Object.assign(mud, { pote: f.get('pote'), cat: f.get('cat') });
      if (m.tipo === 'transf') Object.assign(mud, { de: f.get('de'), para: f.get('para') });
      if (m.tipo === 'entra') mud.receita = !!f.get('receita');
      if (m.cob) { const cob = db.cobrancas.find((c) => c.id === m.cob); if (cob && N.recebido(db, cob) - m.c + mud.c > cob.c) throw new Error(`Passa do valor da cobrança (${din(cob.c)}).`); }
      N.editar(db, m.id, mud); return 'Movimento atualizado. Os saldos foram refeitos.';
    });
  },
  'apagar-mov': (d) => {
    const m = db.movs.find((x) => x.id === d.m); if (!m) return;
    folha(`<h2>Apagar este movimento?</h2><p class="sub">${t(m.desc)} · ${din(m.c)} · ${dia(m.dia)}. O saldo dos potes é refeito sem ele${m.cob ? ' e a cobrança volta a ficar em aberto' : m.fixa || m.conta ? ' e a conta volta a ficar em aberto' : ''}. Fica registrado no histórico.</p><div class="linha"><button type="button" class="bt cheio perigo" data-sim>Apagar</button><button type="button" class="bt" data-fecha>Manter</button></div>`, (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { fecha(); if (faz(() => N.apagar(db, m.id), 'Movimento apagado. Saldos refeitos.')) location.hash = '#extrato'; }));
  },
  mover: (d) => formFolha(`<h2>Passar dinheiro entre potes</h2><p class="mini">${t(nomePote(d.de))} tem ${din(N.saldos(db)[d.de])}.</p><label class="campo">Para o pote<select name="p">${db.potes.filter((p) => p.k !== d.de).map((p) => `<option value="${p.k}">${t(p.nome)}</option>`).join('')}</select></label>${campoValor('v', 'Quanto (R$)')}<label class="campo">Por quê? (opcional)<input name="desc" maxlength="80"></label><button class="bt cheio largo">Passar</button>`, (f) => {
    const c = valorC(f.get('v')); if (c > N.saldos(db)[d.de]) throw new Error(`O pote ${nomePote(d.de)} só tem ${din(N.saldos(db)[d.de])}.`);
    N.lancar(db, 'transf', { c, de: d.de, para: f.get('p'), desc: f.get('desc') }); return `${din(c)} passou para ${nomePote(f.get('p'))}.`;
  }),
  meta: (d) => { const p = pote(d.k); formFolha(`<h2>Meta do pote ${t(p.nome)}</h2><p class="mini">Deixe vazio para não ter meta.</p><label class="campo">Meta (R$)<input name="v" inputmode="decimal" value="${p.metaC ? (p.metaC / 100).toFixed(2).replace('.', ',') : ''}"></label><button class="bt cheio largo">Salvar</button>`, (f) => { const v = String(f.get('v') || '').trim(); p.metaC = v ? valorC(v) : 0; return 'Meta salva.'; }); },
  'nova-cob': () => ACOES['editar-cob']({}),
  'editar-cob': (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c);
    formFolha(`<h2>${c ? 'Editar cobrança' : 'Nova cobrança'}</h2><label class="campo">Cliente<input name="cli" required maxlength="80" value="${t(c?.cli || '')}"></label><label class="campo">WhatsApp do cliente<input name="tel" inputmode="tel" maxlength="20" value="${t(c?.tel || '')}" placeholder="(31) 99999-0000"></label>${campoValor('v', 'Valor (R$)', c?.c)}<label class="campo">O que foi<input name="desc" maxlength="80" value="${t(c?.desc || '')}" placeholder="Serviço"></label>${campoData('vence', 'Vence em', c?.vence ?? 0)}${c ? '<label class="check"><input type="checkbox" name="cancelar"> Cancelar esta cobrança (não vai mais receber)</label>' : ''}<button class="bt cheio largo">${c ? 'Salvar' : 'Criar cobrança'}</button>`, (f) => {
      const cli = String(f.get('cli') || '').trim(); if (!cli) throw new Error('Diga quem vai pagar.');
      const tel = String(f.get('tel') || '').replace(/\D/g, ''); if (tel && (tel.length < 10 || tel.length > 13)) throw new Error('WhatsApp com DDD, ex.: (31) 99999-0000.');
      const novo = { cli, tel, c: valorC(f.get('v')), desc: String(f.get('desc') || '').trim() || 'Serviço', vence: diaC(f.get('vence')) };
      if (c) { if (novo.c < N.recebido(db, c)) throw new Error(`Já foram recebidos ${din(N.recebido(db, c))}; o valor não pode ser menor.`); Object.assign(c, novo); if (f.get('cancelar')) c.status = 'cancelada'; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `${f.get('cancelar') ? 'Cancelou' : 'Editou'} a cobrança de ${cli} (${din(novo.c)})` }); return 'Cobrança salva.'; }
      db.cobrancas.push({ id: nid(), ...novo, status: 'aberta', avisos: [], criada: 0 }); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Criou cobrança de ${din(novo.c)} para ${cli}` });
      return 'Cobrança criada. Toque em Cobrar para mandar o PIX pelo WhatsApp.';
    });
  },
  cobrar: async (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c); if (!s.falta) return;
    if (!db.pix) { aviso('Cadastre a sua chave PIX em Mais › Configurações.', true); location.hash = '#config'; return; }
    const [{ pixCopiaECola }, { qrSVG }] = await Promise.all([import('../base/pix.js'), import('../base/qr.js')]);
    const pix = pixCopiaECola({ chave: db.pix, nome: db.negocio || db.dono, cidade: db.cidade || 'BRASIL', valor: s.falta / 100, txid: c.id.replace(/[^A-Za-z0-9]/g, '').slice(-20) });
    const msg = `Oi, ${c.cli.split(' ')[0]}! ${s.st === 'atrasada' ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${din(s.falta)} (${c.desc})${s.st === 'atrasada' ? `, que venceu ${dia(c.vence)}` : c.vence > 0 ? `, com vencimento ${dia(c.vence)}` : ''}.\n\nPIX copia e cola:\n${pix}\n\nObrigada!`;
    folha(`<h2>Cobrar ${t(c.cli)}</h2><p class="sub">${din(s.falta)} · ${t(c.desc)}</p><div class="qr-pix">${qrSVG(pix, 200)}</div><label class="campo">PIX copia e cola<textarea readonly rows="3">${t(pix)}</textarea></label>
      <div class="linha"><a class="bt cheio" target="_blank" rel="noopener" data-enviou href="${zap(c.tel, msg)}">Mandar no WhatsApp</a><button type="button" class="bt" data-copiar>Copiar PIX</button></div><p class="mini">O WhatsApp abre com a mensagem pronta; você confere e envia. O app registra que você lembrou hoje.</p>`, (f) => {
      f.querySelector('[data-copiar]').addEventListener('click', () => navigator.clipboard?.writeText(pix).then(() => aviso('PIX copiado.'), () => aviso('Copie o texto acima.', true)));
      f.querySelector('[data-enviou]').addEventListener('click', () => { if (!(c.avisos ||= []).includes(0)) c.avisos.push(0); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Lembrou ${c.cli} de ${din(s.falta)} pelo WhatsApp` }); grava(); setTimeout(mostra, 300); });
    });
  },
  receber: (d) => { const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c); formFolha(`<h2>Recebi de ${t(c.cli)}</h2><p class="mini">Falta receber ${din(s.falta)}. Recebeu só uma parte? Digite o valor que entrou.</p>${campoValor('v', 'Valor recebido (R$)', s.falta)}<button class="bt cheio largo">Guardar recebimento</button>`, (f) => { const m = N.receber(db, c.id, valorC(f.get('v')), `rec:${c.id}:${N.recebido(db, c)}`); if (!m) throw new Error('Esse recebimento já foi lançado.'); return `${din(m.c)} recebido e dividido nos potes.`; }); },
  'pagar-fixa': (d) => { const f0 = db.fixas.find((x) => x.id === d.f), comp = d.comp || N.hojeISO().slice(0, 7), falta = Math.max(0, f0.c - N.pagoFixa(db, f0, comp)); formFolha(`<h2>Paguei: ${t(f0.desc)}</h2><p class="mini">Mês ${comp.slice(5)}/${comp.slice(0, 4)} · sai do pote ${t(nomePote(f0.pote))} (${din(N.saldos(db)[f0.pote])}). Pagou com juros ou desconto? Digite o valor que pagou de verdade.</p>${campoValor('v', 'Valor pago (R$)', falta || f0.c)}<button class="bt cheio largo">Guardar pagamento</button>`, (f) => { const m = N.pagarFixa(db, f0.id, valorC(f.get('v')), new Date(), comp); if (!m) throw new Error('Este mês já está pago.'); return `${din(m.c)} pago. Saiu do pote ${nomePote(m.pote)}.`; }); },
  'editar-fixa': (d) => {
    const f0 = db.fixas.find((x) => x.id === d.f);
    formFolha(`<h2>${f0 ? 'Editar conta fixa' : d.das ? 'Cadastrar o DAS' : 'Nova conta fixa'}</h2><label class="campo">O que é<input name="desc" required maxlength="60" value="${t(f0?.desc || (d.das ? 'DAS do MEI' : ''))}"></label>${campoValor('v', 'Valor por mês (R$)', f0?.c)}<label class="campo">Vence todo dia<input name="dia" type="number" min="1" max="31" required value="${f0?.dia || (d.das ? 20 : 10)}"></label><label class="campo">Sai do pote<select name="pote">${opPotes(f0?.pote || (d.das ? 'imposto' : 'contas'))}</select></label>${f0 ? `<label class="check"><input type="checkbox" name="pausar" ${f0.ativa === false ? 'checked' : ''}> Pausar (não vence mais até reativar)</label><label class="check"><input type="checkbox" name="excluir"> Excluir (os pagamentos já feitos continuam no extrato)</label>` : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const dd = Number(f.get('dia')); if (!Number.isInteger(dd) || dd < 1 || dd > 31) throw new Error('Dia de vencimento entre 1 e 31.');
      const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error('Diga o que é a conta.');
      const novo = { desc, c: valorC(f.get('v')), dia: dd, pote: f.get('pote') };
      if (f0) { if (f.get('excluir')) { db.fixas = db.fixas.filter((x) => x !== f0); return 'Conta fixa excluída. Os pagamentos antigos ficam no extrato.'; } Object.assign(f0, novo, { ativa: !f.get('pausar') }); return 'Conta fixa salva.'; }
      db.fixas.push({ id: nid(), ...novo, cat: d.das ? 'Impostos' : N.categoriaSugerida(desc) || 'Contas fixas', das: !!d.das, ativa: true, desde: N.hojeISO().slice(0, 7) }); return 'Conta fixa criada. Ela vence todo mês.';
    });
  },
  'editar-conta': (d) => {
    const c = db.contas.find((x) => x.id === d.c);
    formFolha(`<h2>${c ? 'Editar conta' : 'Nova conta a pagar'}</h2><label class="campo">O que é<input name="desc" required maxlength="80" value="${t(c?.desc || '')}"></label>${campoValor('v', 'Valor (R$)', c?.c)}${campoData('vence', 'Vence em', c?.vence ?? 7)}<label class="campo">Vai sair do pote<select name="pote">${opPotes(c?.pote || 'contas')}</select></label><label class="campo">Categoria<select name="cat">${opCats(c?.cat || 'Outros')}</select></label>${c ? '<label class="check"><input type="checkbox" name="cancelar"> Cancelar (não vai mais pagar)</label>' : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error('Diga o que é a conta.');
      const novo = { desc, c: valorC(f.get('v')), vence: diaC(f.get('vence')), pote: f.get('pote'), cat: f.get('cat') };
      if (c) { if (novo.c < N.pagoConta(db, c)) throw new Error(`Já foram pagos ${din(N.pagoConta(db, c))}; o valor não pode ser menor.`); Object.assign(c, novo); if (f.get('cancelar')) c.status = 'cancelada'; return 'Conta salva.'; }
      db.contas.push({ id: nid(), ...novo, status: 'aberta' }); return 'Conta a pagar criada.';
    });
  },
  'pagar-conta': (d) => { const c = db.contas.find((x) => x.id === d.c), s = N.situacaoConta(db, c); formFolha(`<h2>Paguei: ${t(c.desc)}</h2><p class="mini">Falta ${din(s.falta)}. Sai do pote ${t(nomePote(c.pote))} (${din(N.saldos(db)[c.pote])}).</p>${campoValor('v', 'Valor pago (R$)', s.falta)}<button class="bt cheio largo">Guardar pagamento</button>`, (f) => { const m = N.pagarConta(db, c.id, valorC(f.get('v')), `pag:${c.id}:${N.pagoConta(db, c)}`); if (!m) throw new Error('Esse pagamento já foi lançado.'); return `${din(m.c)} pago.`; }); },
  dasn: () => { const f = N.faturamentoAno(db); folha(`<h2>Resumo para a declaração anual</h2><div class="cartao"><p>Receita bruta do ano até hoje: <b class="num">${din(f.total)}</b></p><p class="mini">${din(f.antes)} informado antes de usar o app + ${din(f.app)} de entradas marcadas como receita.</p></div><p class="mini">Isto é uma estimativa para ajudar, não a declaração oficial. A DASN-SIMEI separa receita de comércio/indústria e de serviços e pergunta se você teve empregado: confira com seus comprovantes no site do Simples Nacional até 31 de maio.</p><button type="button" class="bt cheio largo" data-fecha>Entendi</button>`); },
  recibo: (d) => {
    const m = d?.m ? db.movs.find((x) => x.id === d.m) : null;
    formFolha(`<h2>Recibo</h2><label class="campo">Recebi de<input name="c" value="${t(m?.cli || '')}" required maxlength="80"></label>${campoValor('v', 'Valor (R$)', m?.c)}<label class="campo">Referente a<input name="r" value="${t(m?.desc || '')}" required maxlength="120"></label><button class="bt cheio largo">Gerar recibo</button>`, (f) => {
      const cli = String(f.get('c') || '').trim(), ref = String(f.get('r') || '').trim(); if (!cli || !ref) throw new Error('Preencha quem pagou e a que se refere.');
      const r = { id: nid(), num: ++db.reciboSeq, cli, c: valorC(f.get('v')), ref, dia: 0, mov: m?.id }; db.recibos.push(r); grava(); setTimeout(() => verRecibo(r), 50); return false;
    });
  },
  'ver-recibo': (d) => { const r = db.recibos.find((x) => x.id === d.r); if (r) verRecibo(r); },
  exportar: () => { baixa(`extrato-${N.hojeISO()}.csv`, N.extratoCSV(db), 'text/csv;charset=utf-8'); aviso('Extrato baixado.'); },
  copia: () => { baixa(`veltria-financeiro-copia-${N.hojeISO()}.json`, JSON.stringify(db, null, 1), 'application/json'); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: 'Baixou uma cópia de segurança' }); grava(); },
  'copia-bruta': () => { let txt = ''; try { txt = localStorage.getItem(CHAVE) || ''; } catch { /* */ } baixa(`veltria-financeiro-guardado-${N.hojeISO()}.json`, txt, 'application/json'); },
  'voltar-copia': () => {
    let k = `${CHAVE}-antes-de-restaurar:${CONTA}`, txt = null; try { txt = localStorage.getItem(k) || localStorage.getItem((k = `${CHAVE}-copia-formato1:${CONTA}`)); } catch { /* */ }
    if (!txt) return aviso('Não há versão anterior guardada.', true);
    folha(`<h2>Voltar a versão anterior?</h2><p class="sub">Os dados atuais são trocados pela versão guardada neste aparelho ${k.includes('formato1') ? '(de antes da atualização do app)' : '(de antes da última restauração)'}. Baixe uma cópia dos atuais antes, por segurança.</p><div class="linha"><button type="button" class="bt cheio perigo" data-sim>Voltar</button><button type="button" class="bt" data-fecha>Cancelar</button></div>`, (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { fecha(); restaura(txt, 'versão anterior'); }));
  },
  'cancelar-imp': () => { previa = null; },
  'div-extrato': (d) => { const x = db.migracao.divergencias.find((y) => y.pote === d.p); x.resolvida = 'extrato'; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Conferiu o pote ${x.nome}: vale o extrato` }); grava(); mostra(); },
  'div-acerto': (d) => { const x = db.migracao.divergencias.find((y) => y.pote === d.p), dif = x.gravado - x.calculado; if (faz(() => N.lancar(db, 'ajuste', { c: Math.abs(dif), pote: x.pote, sinal: dif < 0 ? -1 : 1, desc: 'Acerto de saldo (conferido após a atualização)' }), 'Acerto lançado no extrato.')) { x.resolvida = 'acerto'; grava(); mostra(); } },
  equipe: () => document.querySelector('[data-vc="equipe"]')?.click(),
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor * 100)}</h2><p class="sub">Demonstração: nenhum pagamento de verdade acontece aqui.</p><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); aviso('Pagamento simulado aprovado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa até ${dia(db.assinatura.proxima)} e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
};
function verRecibo(r) {
  const txt = `Recibo nº ${r.num}. Recebi de ${r.cli} a quantia de ${din(r.c)}, referente a ${r.ref}. ${db.negocio}${db.cnpj ? ` · CNPJ ${db.cnpj}` : ''} · ${N.dataDe(r.dia).toLocaleDateString('pt-BR')}`;
  folha(`<h2>Recibo nº ${r.num}</h2><div class="recibo"><h3>Recibo nº ${r.num} · ${din(r.c)}</h3><p>${t(txt)}</p><p style="margin-top:28px;border-top:1px solid #999;padding-top:4px;width:70%">${t(db.dono)}</p></div><div class="linha"><a class="bt cheio" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar no WhatsApp</a><button type="button" class="bt" onclick="print()">Imprimir ou PDF</button><button type="button" class="bt" data-fecha>Fechar</button></div>`);
}
function restaura(txt, origem) {
  let d; try { d = JSON.parse(txt); } catch { return aviso('Esse arquivo não é uma cópia do Veltria Financeiro.', true); }
  try { d = parece2(d) ? arruma(d) : arruma(N.migrar(d)); } catch (e) { return aviso(`Cópia inválida: ${e.message}`, true); }
  if (!Array.isArray(d.potes) || !d.potes.length || !Array.isArray(d.movs) || d.movs.some((m) => !Number.isInteger(m.c) || m.c <= 0)) return aviso('A cópia está incompleta ou com valores inválidos. Nada foi alterado.', true);
  try { localStorage.setItem(`${CHAVE}-antes-de-restaurar:${CONTA}`, JSON.stringify(db)); } catch { return aviso('Sem espaço para guardar os dados atuais antes de restaurar. Nada foi alterado.', true); }
  db = d; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Restaurou ${origem}` }); grava(); location.hash = '#potes'; mostra(); aviso('Dados restaurados. Os anteriores ficaram guardados neste aparelho.');
}

document.addEventListener('click', (e) => {
  const el = e.target;
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) { if (ac.tagName === 'A' && ac.dataset.acao !== 'cancelar-imp') e.preventDefault(); ACOES[ac.dataset.acao](ac.dataset, ac); return; }
  const ir = el.closest('[data-ir]'); if (ir) { if (ir.dataset.ir === 'lancar') rascunho = rascunho?.valor ? rascunho : novoRascunho(rascunho?.tipo, rascunho?.pote); location.hash = `#${ir.dataset.ir}`; return; }
  const guarda = () => { if (!rascunho) return; rascunho.desc = $('#desc-l')?.value ?? rascunho.desc; if ($('#cat-l')) rascunho.cat = $('#cat-l').value; if ($('#rec-l')) rascunho.receita = $('#rec-l').checked; };
  const tc = el.closest('[data-tecla]'); if (tc) { guarda(); const k = tc.dataset.tecla; rascunho.valor = k === '⌫' ? rascunho.valor.slice(0, -1) : (rascunho.valor + k).replace(/^0+/, '').slice(0, 9); mostra(); return; }
  const tp = el.closest('[data-tipo]'); if (tp) { guarda(); rascunho.tipo = tp.dataset.tipo; mostra(); return; }
  const ps = el.closest('[data-pote-sai]'); if (ps) { guarda(); rascunho.pote = ps.dataset.poteSai; mostra(); return; }
  const dl = el.closest('[data-dia-l]'); if (dl) { guarda(); rascunho.dia = Number(dl.dataset.diaL); mostra(); return; }
  const ab = el.closest('[data-aba-c]'); if (ab) { aba = ab.dataset.abaC; location.hash = `#contas/${aba}`; mostra(); return; }
  const pr = el.closest('[data-per]'); if (pr) { filtro.per = pr.dataset.per; mostra(); return; }
  const ft = el.closest('[data-ftipo]'); if (ft) { filtro.tipo = ft.dataset.ftipo; mostra(); return; }
  const prr = el.closest('[data-per-r]'); if (prr) { perResumo = prr.dataset.perR; mostra(); return; }
  const sg = el.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role="button"]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('input', (e) => {
  if (e.target.closest('#f-div')) somaDiv();
  if (e.target.id === 'busca') { filtro.busca = e.target.value; const pos = e.target.selectionStart; mostra(); const b = $('#busca'); b.focus(); b.setSelectionRange(pos, pos); }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'f-div') {
    e.preventDefault(); const f = new FormData(e.target), novos = db.potes.map((p) => ({ ...p, pct: Number(f.get(p.k)) })), erro = N.validarPcts(novos);
    if (erro) return aviso(erro, true);
    db.potes.forEach((p, i) => { p.pct = novos[i].pct; }); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Mudou a divisão: ${db.potes.map((p) => `${p.nome} ${p.pct}%`).join(', ')}` });
    grava(); location.hash = '#potes'; aviso('Divisão salva. Vale para as próximas entradas.'); return;
  }
  if (e.target.id === 'f-imp') {
    e.preventDefault(); const f = new FormData(e.target), linhas = previa.linhas.map((l, i) => ({ ...l, incluir: !!f.get(`l${i}`) }));
    if (N.validarPcts(db.potes) && linhas.some((l) => l.incluir && l.tipo === 'entra')) return aviso(N.validarPcts(db.potes), true);
    try { const feitos = N.importar(db, linhas, { pote: f.get('pote'), receita: !!f.get('receita'), arquivo: previa.arquivo }); previa = null; grava(); location.hash = '#extrato'; aviso(`${feitos.length} lançamento(s) importado(s).`); } catch (x) { aviso(x.message, true); }
    return;
  }
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-12); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((x) => { resp.t = x; grava(); mostra(); }); scrollTo(0, document.body.scrollHeight);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.cfg) { db[el.dataset.cfg] = el.value.trim().slice(0, 80); grava(); mostra(); aviso('Salvo.'); }
  if ('cfgFat' in el.dataset) { const c = N.centavos(el.value || '0'); if (!Number.isInteger(c) || c < 0) return aviso('Valor inválido.', true); db.fatInicial = { ano: new Date().getFullYear(), c }; grava(); mostra(); aviso('Faturamento salvo.'); }
  if (el.id === 'dia-l' && el.value) { const d = N.diaDe(el.value); if (!Number.isFinite(d) || d > 0) return aviso('Escolha hoje ou uma data passada.', true); rascunho.desc = $('#desc-l')?.value ?? rascunho.desc; rascunho.dia = d; mostra(); }
  if (el.id === 'arq-extrato' && el.files[0]) { const arq = el.files[0]; if (arq.size > 5e6) return aviso('Arquivo grande demais (máximo 5 MB).', true); arq.text().then((txt) => { const r = N.lerExtrato(txt, arq.name); previa = { arquivo: arq.name, linhas: N.marcarDuplicadas(db, r.linhas), erros: r.erros }; if (!r.linhas.length) aviso('Nenhum lançamento pôde ser lido. Veja o motivo abaixo.', true); mostra(); }); }
  if (el.id === 'restaurar' && el.files[0]) { el.files[0].text().then((txt) => restaura(txt, `a cópia ${el.files[0].name}`)); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; }
  if (e.data.simular === 'normal') { db.assinatura = semente().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
$('#recomecar').addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch { /* */ } db = semente(); rascunho = null; location.hash = '#potes'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
try { if (!localStorage.getItem(CHAVE) && !somenteLeitura) grava(); } catch { /* sem acesso ao armazenamento */ }
mostra();

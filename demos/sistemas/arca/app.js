// Arca · sistema financeiro para empresas (pequena, média e grande), feito para o computador e com versão de celular.
// O dinheiro que entra é dividido sozinho em reservas (impostos, fornecedores e contas, folha, emergência, livre).
// As regras do dinheiro ficam em nucleo.js (cópia do núcleo testado do antigo Veltria Financeiro Essencial: centavos,
// saldo calculado do extrato, migração, importação); aqui ficam as telas. Dados de exemplo neste aparelho (?novo recomeça).
// Com conta (?conta=financeiroessencial), conta-nuvem.js leva os dados para a nuvem: o identificador e a chave dos dados
// continuam os do Financeiro Essencial para quem já assina não perder nada.

import * as N from './nucleo.js';

const CONTA = new URLSearchParams(location.search).get('conta') || 'demo';
const CHAVE = CONTA === 'demo' ? 'arca-demo-v1' : 'veltria-financeiro-essencial-v1';
const din = N.reais;
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const dia = (o) => o === 0 ? 'hoje' : o === -1 ? 'ontem' : o === 1 ? 'amanhã' : N.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const dataC = (o) => N.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dataM = (o) => N.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const zap = (tel, m) => `https://wa.me/${tel ? '55' + String(tel).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : ''}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);
const CORES = { imposto: '#773c45', contas: '#17243a', salario: '#8a6d3b', reserva: '#4f6378', livre: '#b49a6c' };
const cor = (k) => CORES[k] || '#7d8594';
const PCTS_PADRAO = { imposto: 12, contas: 55, salario: 18, reserva: 8, livre: 7 };
const REGIMES = { mei: 'MEI', simples: 'Simples Nacional', presumido: 'Lucro Presumido', real: 'Lucro Real' };
const CC_PADRAO = ['Comercial', 'Logística', 'Administrativo', 'Fiscal', 'Filial Contagem'];

// ------------------------------------------------------------------ dados: carregar, migrar com cópia, gravar
function semente() {
  const potes = [['imposto', 'Impostos', 12, 50000000], ['contas', 'Fornecedores e contas', 55, 120000000], ['salario', 'Folha e pró-labore', 18, 45000000], ['reserva', 'Reserva de emergência', 8, 80000000], ['livre', 'Livre', 7, 0]].map(([k, nome, pct, metaC]) => ({ k, nome, pct, metaC }));
  const db = { formato: N.FORMATO, negocio: 'Grupo Vale Norte Distribuidora', dono: 'Renata Albuquerque', pix: 'financeiro@valenorte.com.br', cidade: 'Belo Horizonte', cnpj: '28.417.903/0001-62', regime: 'presumido', centros: [...CC_PADRAO],
    potes, movs: [], cobrancas: [], contas: [], fixas: [], recibos: [], reciboSeq: 1040, historico: [], fatInicial: { ano: new Date().getFullYear(), c: 1784000000 }, avisoDias: 3,
    assinatura: { valor: 59, status: 'ativa', renova: true, proxima: 17, pagos: [-13, -43, -74] }, conversa: [],
    equipe: [{ id: 'eq1', nome: 'Marcos Teixeira (contador)', contato: 'marcos@contabiltex.com.br', acesso: 'ver', st: 'ativo' }, { id: 'eq2', nome: 'Paula Rezende (tesouraria)', contato: '(31) 98810-2231', acesso: 'mexer', st: 'ativo' }] };
  const comp = N.hojeISO().slice(0, 7), hoje = new Date().getDate();
  db.fixas = [
    ['fx-aluguel', 'Aluguel do CD', 4800000, 5, 'contas', 'Aluguel e espaço', 'Logística'], ['fx-folha', 'Folha de pagamento', 21000000, 5, 'salario', 'Folha de pagamento', 'Administrativo'],
    ['fx-prolabore', 'Pró-labore dos sócios', 4500000, 10, 'salario', 'Pró-labore', 'Administrativo'], ['fx-contador', 'Escritório de contabilidade', 450000, 10, 'contas', 'Serviços de terceiros', 'Administrativo'],
    ['fx-internet', 'Internet e telefonia', 190000, 12, 'contas', 'Contas fixas', 'Administrativo'], ['fx-seguro', 'Seguro da frota', 367800, 14, 'contas', 'Seguros', 'Logística'],
    ['fx-energia', 'Energia do CD', 680000, 15, 'contas', 'Contas fixas', 'Logística'], ['fx-icms', 'ICMS (apuração do mês)', 9600000, 20, 'imposto', 'Impostos', 'Fiscal'],
    ['fx-adiant', 'Adiantamento da folha', 8400000, 20, 'salario', 'Folha de pagamento', 'Administrativo'], ['fx-pis', 'DARF PIS/COFINS', 5800000, 25, 'imposto', 'Impostos', 'Fiscal'],
  ].map(([id, desc, c, d, pote, cat, cc]) => ({ id, desc, c, dia: d, pote, cat, cc, ativa: true, desde: comp }));
  const L = (tipo, c, desc, d, extra = {}) => { const m = N.lancar(db, tipo, { c, desc, dia: d, ...extra }); if (extra.cc) m.cc = extra.cc; return m; };
  L('entra', 98000000, 'Saldo dos bancos ao começar no Arca', -40, { receita: false });
  [[18650000, 'Recebimento NF 12401 · Supermercados São Pedro', -38, 'Comercial'], [24310000, 'Recebimento NF 12417 · Atacado Regional', -35, 'Comercial'], [31200000, 'Recebimento NF 12433 · AgroNorte', -31, 'Comercial'],
    [12890000, 'Recebimento NF 12440 · Rede Bom Lar', -28, 'Filial Contagem'], [27540000, 'Recebimento NF 12452 · Terra Forte', -24, 'Comercial'], [16420000, 'Recebimento NF 12468 · Mercantil Serra Azul', -21, 'Filial Contagem'],
    [19800000, 'Recebimento NF 12479 · Supermercados São Pedro', -17, 'Comercial'], [22950000, 'Recebimento NF 12490 · Agromax', -14, 'Comercial'], [26050000, 'Recebimento NF 12503 · AgroSul', -10, 'Comercial'],
    [18000000, 'Recebimento NF 12511 · Vale Agro', -7, 'Comercial'], [14320000, 'Recebimento NF 12520 · Campo Verde Insumos', -4, 'Filial Contagem'], [32000000, 'Recebimento NF 12584 · Agromax', 0, 'Comercial']]
    .forEach(([c, desc, d, cc]) => L('entra', c, desc, d, { cc, receita: true }));
  [[14580000, 'Fornecedor AutoPeças SP · pedido 8812', -33, 'contas', 'Fornecedores e mercadorias', 'Comercial'], [21000000, 'Fornecedor Metamaq · pedido 8840', -27, 'contas', 'Fornecedores e mercadorias', 'Comercial'],
    [18630000, 'Laticínios Serrano · pedido 8861', -22, 'contas', 'Fornecedores e mercadorias', 'Comercial'], [3890000, 'Transportadora Rota Sul · fretes de outubro', -19, 'contas', 'Fretes e logística', 'Logística'],
    [16200000, 'Grão Fino Alimentos · pedido 8893', -12, 'contas', 'Fornecedores e mercadorias', 'Comercial'], [1290000, 'Manutenção das empilhadeiras', -9, 'contas', 'Manutenção', 'Logística'],
    [985000, 'Campanha de vendas para mercados', -6, 'livre', 'Marketing', 'Comercial'], [14580000, 'Fornecedor AutoPeças SP · pedido 8930', 0, 'contas', 'Fornecedores e mercadorias', 'Comercial'], [24800, 'Tarifas do banco', -2, 'contas', 'Tarifas bancárias', 'Administrativo']]
    .forEach(([c, desc, d, pote, cat, cc]) => L('sai', c, desc, d, { pote, cat, cc }));
  db.fixas.forEach((f) => { if (f.dia < hoje) { const m = N.pagarFixa(db, f.id, f.c); if (m) { m.dia = f.dia - hoje; m.cc = f.cc; } } });
  db.cobrancas = [
    ['cb-agromax', 'Agromax', '31988871122', 8500000, 'NF 12590 · parcela 2/3', 0, 'Comercial', [-1]], ['cb-campo', 'Campo Verde Insumos', '31991230987', 4860000, 'NF 12531', -5, 'Filial Contagem', [-6, -5]],
    ['cb-atacado', 'Atacado Regional', '31997654321', 12530000, 'NF 12544', -3, 'Comercial', [-4, -3]], ['cb-agronorte', 'AgroNorte', '31986543210', 38000000, 'NF 12596', 2, 'Comercial', []],
    ['cb-saopedro', 'Supermercados São Pedro', '31984561234', 26500000, 'NF 12601', 3, 'Comercial', []], ['cb-terraforte', 'Terra Forte', '31983334455', 42000000, 'NF 12605', 5, 'Comercial', []],
    ['cb-bomlar', 'Rede Bom Lar', '31982221100', 12840000, 'NF 12611', 9, 'Filial Contagem', []], ['cb-serra', 'Mercantil Serra Azul', '31981112233', 9675000, 'NF 12618', 14, 'Filial Contagem', []],
  ].map(([id, cli, tel, c, desc, vence, cc, avisos]) => ({ id, cli, tel, c, desc, vence, cc, status: 'aberta', avisos, criada: Math.min(-8, vence - 21) }));
  const pr = N.receber(db, 'cb-atacado', 4000000); pr.dia = -2; pr.cc = 'Comercial';
  db.contas = [
    ['ct-empilhadeira', 'Locação de empilhadeira', 1248000, 0, 'contas', 'Equipamentos', 'Logística'], ['ct-metamaq', 'Fornecedor Metamaq · pedido 8955', 21000000, 1, 'contas', 'Fornecedores e mercadorias', 'Comercial'],
    ['ct-graofino', 'Grão Fino Alimentos · pedido 8961', 8450000, 2, 'contas', 'Fornecedores e mercadorias', 'Comercial'], ['ct-serrano', 'Laticínios Serrano · pedido 8970', 18630000, 4, 'contas', 'Fornecedores e mercadorias', 'Comercial'],
    ['ct-rotasul', 'Transportadora Rota Sul · fretes de novembro', 3890000, 6, 'contas', 'Fretes e logística', 'Logística'], ['ct-embalagens', 'Compra de embalagens', 2215000, 11, 'contas', 'Material e produtos', 'Logística'],
  ].map(([id, desc, c, vence, pote, cat, cc]) => ({ id, desc, c, vence, pote, cat, cc, status: 'aberta' }));
  const pc = N.pagarConta(db, 'ct-graofino', 4000000); pc.dia = -1; pc.cc = 'Comercial';
  db.recibos = [{ id: 'rc1', num: 1040, cli: 'Agromax', c: 32000000, ref: 'NF 12584', dia: 0 }];
  db.historico = [];
  return db;
}
let falhaCarga = '', somenteLeitura = false;
const parece2 = (d) => d && (d.formato >= 2 || d.migracao || (Array.isArray(d.movs) && d.movs.some((m) => Number.isInteger(m.c) && !('valor' in m))) || (Array.isArray(d.potes) && d.potes.some((p) => 'metaC' in p)));
function arruma(d) {
  d.formato = N.FORMATO;
  ['movs', 'cobrancas', 'contas', 'fixas', 'recibos', 'historico', 'conversa'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
  if (!Array.isArray(d.potes) || !d.potes.length) d.potes = semente().potes;
  // "começar do zero" zera números: a divisão das reservas volta ao padrão em vez de ficar em 0%
  if (d.potes.every((p) => !p.pct)) { d.potes.forEach((p) => { p.pct = PCTS_PADRAO[p.k] ?? 0; }); if (N.validarPcts(d.potes)) { d.potes.forEach((p) => { p.pct = 0; }); d.potes[0].pct = 100; } }
  if (!d.assinatura) d.assinatura = { valor: 59, status: 'ativa', renova: true, proxima: 30, pagos: [] };
  if (!d.fatInicial || typeof d.fatInicial !== 'object') d.fatInicial = { ano: new Date().getFullYear(), c: 0 };
  // quem veio do Financeiro Essencial (MEI) continua MEI até escolher outro regime nas Configurações
  if (!REGIMES[d.regime]) d.regime = d.fixas.some((f) => f.das) || d.cnpj ? 'mei' : 'simples';
  if (!Array.isArray(d.centros)) d.centros = [];
  d.reciboSeq = Math.max(Number(d.reciboSeq) || 0, ...d.recibos.map((r) => r.num || 0));
  return d;
}
function carregar() {
  if (new URLSearchParams(location.search).has('novo')) try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ }
  let txt = null; try { txt = localStorage.getItem(CHAVE); } catch { /* sem acesso */ }
  if (!txt) return semente();
  let bruto; try { bruto = JSON.parse(txt); } catch { falhaCarga = 'Os dados guardados neste aparelho estão ilegíveis.'; somenteLeitura = true; return semente(); }
  if (parece2(bruto)) { const d = arruma(bruto), novo = JSON.stringify(d); if (novo !== txt) try { localStorage.setItem(CHAVE, novo); } catch { /* grava na próxima mudança */ } return d; }
  // formato 1: guarda uma cópia exata antes de converter (Conciliação › Cópia de segurança devolve ela)
  const kb = `${CHAVE}-copia-formato1:${CONTA}`;
  try { if (!localStorage.getItem(kb)) localStorage.setItem(kb, txt); } catch { falhaCarga = 'Sem espaço para guardar a cópia antes de atualizar os dados.'; somenteLeitura = true; return semente(); }
  try { const novo = arruma(N.migrar(bruto)); localStorage.setItem(CHAVE, JSON.stringify(novo)); return novo; } catch (e) { falhaCarga = `Não consegui atualizar os dados (${e.message}). Nada foi apagado.`; somenteLeitura = true; return semente(); }
}
let db = carregar();
window.veltriaDados = () => db;
window.veltriaEditorFora = ['equipe', 'movs', 'cobrancas', 'contas', 'fixas', 'recibos', 'historico', 'potes', 'migracao'];
window.veltriaSemMaisComum = true;
window.veltriaDadosProprio = () => { location.hash = '#conciliacao'; };
window.veltriaResumoIA = () => {
  const r = N.resumo(db, ...N.periodo('mes')), sd = N.saldos(db), p = N.projecao(db, 30), f = N.faturamentoAno(db);
  return [`Empresa: ${db.negocio} (${REGIMES[db.regime]}). Reservas: ${db.potes.map((x) => `${x.nome} ${din(sd[x.k])} (${x.pct}% das entradas)`).join('; ')}. Total em caixa ${din(N.total(db))}.`,
    `Este mês: receita ${din(r.receita)}, outras entradas ${din(r.outras)}, saídas ${din(r.saidas)}. Maiores gastos: ${r.cats.slice(0, 4).map(([c, v]) => `${c} ${din(v)}`).join(', ') || 'nenhum'}.`,
    `A receber: ${db.cobrancas.map((c) => [c, N.situacaoCob(db, c)]).filter(([, s]) => s.falta).map(([c, s]) => `${c.cli} ${din(s.falta)} ${s.st}`).join('; ') || 'nada'}.`,
    `Próximos 30 dias: entra ${din(p.entra)}, sai ${din(p.sai)}, saldo previsto ${din(p.fim)}. Faturamento do ano ${din(f.total)}.`].join('\n');
};
// centro de custo: o recebimento e o pagamento herdam o da cobrança ou da conta
function aplicaCC() {
  db.movs.forEach((m) => { if (m.cc !== undefined) return; const o = m.cob ? db.cobrancas.find((x) => x.id === m.cob) : m.conta ? db.contas.find((x) => x.id === m.conta) : m.fixa ? db.fixas.find((x) => x.id === m.fixa) : null; if (o?.cc) m.cc = o.cc; });
  [...db.movs, ...db.cobrancas, ...db.contas, ...db.fixas].forEach((x) => { if (x.cc && !db.centros.includes(x.cc)) db.centros.push(x.cc); });
}
function grava() {
  if (somenteLeitura) { aviso('Os dados estão protegidos até o problema ser resolvido. Nada foi gravado.'); return false; }
  aplicaCC();
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); return true; } catch { aviso('Sem espaço neste aparelho: não consegui salvar.'); return false; }
}
const pote = (k) => db.potes.find((p) => p.k === k);
const nomePote = (k) => pote(k)?.nome || k;
const dasFixa = () => db.fixas.find((f) => f.das);

function aviso(m, erro) { const a = document.createElement('div'); a.className = `aviso${erro ? ' ruim' : ''}`; a.textContent = m; $('#avisos').append(a); setTimeout(() => a.remove(), erro ? 5200 : 3200); }
/** Executa uma operação do núcleo: erro vira mensagem, sucesso grava e redesenha. */
function faz(fn, ok) { try { const r = fn(); if (r === null) { aviso('Isso já foi lançado.'); return null; } grava(); mostra(); if (ok) aviso(typeof ok === 'function' ? ok(r) : ok); return r ?? true; } catch (e) { aviso(e.message, true); return false; } }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true"><button type="button" class="fecha-x" data-fecha aria-label="Fechar">×</button>${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button:not(.fecha-x)'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
  return fecha;
}
// equipe da demonstração (com a conta, a equipe de verdade fica na nuvem e abre pela faixa da conta)
const equipeDemo = () => (db.equipe ||= [{ id: 'eq1', nome: 'Marcos Teixeira (contador)', contato: 'marcos@contabiltex.com.br', acesso: 'ver', st: 'ativo' }]);
/** Formulário em folha: valida, mostra o erro dentro da folha e só fecha se deu certo. */
function formFolha(html, enviar) {
  folha(`<form novalidate>${html}<p class="erro" role="alert" hidden></p></form>`, (f, fecha) => {
    const form = f.querySelector('form'), err = f.querySelector('.erro'); mostraFreq(form);
    form.addEventListener('submit', (e) => { e.preventDefault(); try { const r = enviar(new FormData(form), form); if (r === false) return; grava(); fecha(); mostra(); if (typeof r === 'string') aviso(r); } catch (x) { err.textContent = x.message; err.hidden = false; } });
  });
}
/** Mostra só os campos de vencimento da frequência escolhida (conta fixa). */
function mostraFreq(form) { const v = form?.querySelector('[data-freq]')?.value; if (v) form.querySelectorAll('[data-so]').forEach((l) => { l.hidden = !l.dataset.so.split(' ').includes(v); }); }
const valorC = (v) => { const c = N.centavos(v); if (!Number.isInteger(c) || c <= 0) throw new Error('Digite um valor maior que zero (ex.: 150,00).'); return c; };
const diaC = (v) => { const d = N.diaDe(v); if (!Number.isFinite(d)) throw new Error('Escolha uma data válida.'); return d; };
const campoValor = (nome, rot, c) => `<label class="campo">${rot}<input name="${nome}" inputmode="decimal" autocomplete="off" required value="${c ? (c / 100).toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>`;
const campoData = (nome, rot, d) => `<label class="campo">${rot}<input name="${nome}" type="date" required value="${N.isoDe(d ?? 0)}"></label>`;
const campoCC = (v) => `<label class="campo">Centro de custo<input name="cc" list="lista-cc" maxlength="40" autocomplete="off" value="${t(v || '')}" placeholder="Opcional (ex.: Comercial)"></label>`;
const ccDe = (f) => String(f.get('cc') || '').trim().slice(0, 40);
const opPotes = (sel) => db.potes.map((p) => `<option value="${p.k}" ${p.k === sel ? 'selected' : ''}>${t(p.nome)}</option>`).join('');
const opCats = (sel) => [...N.CATEGORIAS, ...(sel && !N.CATEGORIAS.includes(sel) ? [sel] : [])].map((c) => `<option ${c === sel ? 'selected' : ''}>${t(c)}</option>`).join('');
const etq = (st, txt) => `<span class="etq ${{ recebida: 'ok', paga: 'ok', atrasada: 'ru', hoje: 'at', cancelada: '', pausada: '' }[st] ?? ''}">${t(txt)}</span>`;

// ------------------------------------------------------------------ telas
let rascunho = null;
const novoRascunho = (tipo = 'entra', pote = 'contas') => ({ tipo, valor: '', pote, desc: '', dia: 0, receita: true, cat: '', cc: '', chave: nid() });
let filtro = { busca: '', tipo: '', per: '30' }, perResumo = 'mes', previa = null, horizonte = 30, ccSel = '', selCob = '';
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const IC = {
  entra: svg('<path d="M12 4v13M6 11l6 6 6-6"/>'), sai: svg('<path d="M12 20V7M6 13l6-6 6 6"/>'), transf: svg('<path d="M4 8h14l-3-3M20 16H6l3 3"/>'),
  cobrar: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>'), ok: svg('<path d="M5 12l5 5 9-10"/>'), busca: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  ia: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'), alerta: svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'), dados: svg('<path d="M12 4v10M8 10l4 4 4-4"/><path d="M4 18h16"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'), recibo: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'), cartao: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>'),
  equipe: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><path d="M16 11a2.5 2.5 0 1 0 0-5M21 20c-.4-2.4-1.6-4-3.5-4.8"/>'), ajustes: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3"/>'),
  sino: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'), cal: svg('<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
  doc: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>'), fone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  livro: svg('<path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1z"/><path d="M21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z"/>'), cofre: svg('<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 10h18"/><rect x="10" y="12" width="4" height="4"/>'),
  coluna: svg('<path d="M3 9l9-5 9 5"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>'), escudo: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>'),
  pessoas: svg('<circle cx="8" cy="9" r="2.5"/><circle cx="16" cy="9" r="2.5"/><circle cx="12" cy="7" r="2.8"/><path d="M3 18c.6-2.6 2.6-4 5-4M21 18c-.6-2.6-2.6-4-5-4M7 19c.7-3 2.6-4.6 5-4.6s4.3 1.6 5 4.6"/>'),
  moedas: svg('<ellipse cx="9" cy="7" rx="5" ry="2"/><path d="M4 7v4c0 1.1 2.2 2 5 2s5-.9 5-2V7"/><ellipse cx="15" cy="14" rx="5" ry="2"/><path d="M10 14v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4"/>'),
};
const ICPOTE = { imposto: IC.coluna, contas: IC.cal, salario: IC.pessoas, reserva: IC.escudo, livre: IC.moedas };
const vazio = (txt, acao = '') => `<div class="vazio">${IC.cofre}<p>${txt}</p>${acao}</div>`;
const titulo = (ic, txt, extra = '') => `<div class="faixa-t">${ic}<h2>${txt}</h2>${extra}</div>`;
const cabeca = (txt, sub = '', extra = '') => `<div class="cab-tela"><div><h1>${txt}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${extra}</div>`;
const voltar = (h, txt) => `<a class="voltar" href="#${h}">‹ ${txt}</a>`;
const diaLongo = (o) => (o === 0 ? 'Hoje' : o === -1 ? 'Ontem' : N.dataDe(o).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).replace(/^./, (x) => x.toUpperCase()));
const ordenaMovs = (l) => [...l].sort((a, b) => b.dia - a.dia || (b.criado > a.criado ? 1 : -1));
const comCC = (l) => (ccSel ? l.filter((x) => (x.cc || '') === ccSel) : l);
const sinalMov = (m) => (m.tipo === 'sai' || (m.tipo === 'ajuste' && m.sinal < 0) ? -1 : m.tipo === 'transf' ? 0 : 1);
const valorMov = (m) => { const s = sinalMov(m); return `<span class="num ${s < 0 ? 'sai' : s === 0 ? 'tr' : 'en'}">${s < 0 ? '−' : ''}${din(m.c)}</span>`; };
const reservaMov = (m) => m.tipo === 'sai' || m.tipo === 'ajuste' ? t(nomePote(m.pote)) : m.tipo === 'transf' ? `${t(nomePote(m.de))} → ${t(nomePote(m.para))}` : m.receita === false ? 'dividida (não é receita)' : 'dividida nas reservas';
const catMov = (m) => m.tipo === 'sai' ? t(m.cat || 'Outros') : m.tipo === 'entra' ? (m.receita === false ? 'Outras entradas' : 'Receita') : m.tipo === 'transf' ? 'Entre reservas' : 'Acerto';
function tabelaMovs(ms, { vazioTxt = 'Nada lançado ainda.', soPote } = {}) {
  if (!ms.length) return vazio(vazioTxt);
  return `<div class="tab-rol"><table class="razao movs"><thead><tr><th>Data</th><th>Descrição</th><th>Centro de custo</th><th>Categoria</th><th>Reserva</th><th class="dir">Valor</th></tr></thead><tbody>${ms.map((m) => {
    const ef = soPote ? N.efeito(m)[soPote] : null;
    return `<tr data-ir="mov/${m.id}" role="button" tabindex="0"><td class="num">${dataC(m.dia)}</td><td>${t(m.desc)}${m.cli ? ` <small>${t(m.cli)}</small>` : ''}${m.origem === 'importacao' ? ' <small class="selo-imp">importado</small>' : ''}</td><td>${t(m.cc || '—')}</td><td>${catMov(m)}</td><td>${reservaMov(m)}</td><td class="dir">${soPote ? `<span class="num ${ef < 0 ? 'sai' : 'en'}">${ef < 0 ? '−' : ''}${din(Math.abs(ef))}</span>` : valorMov(m)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
const pendIcone = (p) => (p.tipo === 'cobrar' ? IC.fone : p.tipo === 'atraso' || p.tipo === 'erro' ? IC.alerta : IC.doc);
const pendTitulo = (p) => ({ cobrar: 'Cliente para lembrar', atraso: 'Em atraso', vence: 'Vencendo', erro: 'Conferir' })[p.tipo] || 'Pendência';
function blocoHoje(pend, limite = 6) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `<section class="bloco"><div class="faixa-t bordo">${IC.sino}<h2>Para hoje (${hoje})</h2>${pend.length > limite ? '<a class="ver" href="#hoje">Ver tudo</a>' : ''}</div>
    <div class="pend-l">${pend.length ? pend.slice(0, limite).map((p) => `<a class="pend-i ${p.tipo}" href="#${p.ir === 'contas' ? 'pagar' : p.ir}">${pendIcone(p)}<span><b>${pendTitulo(p)}</b>${t(p.txt)}</span><i aria-hidden="true">›</i></a>`).join('') : `<p class="ok-tudo">${IC.ok} Nada pendente: contas em dia e ninguém para lembrar.</p>`}</div></section>`;
}
function proximos(n = 7) {
  const p = N.projecao(db, n), en = p.itens.filter((i) => i.sinal > 0), sa2 = p.itens.filter((i) => i.sinal < 0);
  const lista = (l) => l.length ? l.slice(0, 6).map((i) => `<li><span>${i.atrasada ? 'atrasada' : dataM(i.dia)} · ${t(i.desc)}</span><b class="num ${i.sinal < 0 ? 'sai' : 'en'}">${i.sinal < 0 ? '−' : ''}${din(i.c)}</b></li>`).join('') : '<li class="mini">Nada previsto.</li>';
  return `<section class="bloco"><div class="faixa-t bordo">${IC.cal}<h2>Próximos ${n} dias</h2></div>
    <div class="prev"><h3><span>${svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>')}Entradas previstas</span><b class="num">${din(p.entra)}</b></h3><ul>${lista(en)}</ul>
    <h3><span>${svg('<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>')}Saídas previstas</span><b class="num sai">−${din(p.sai)}</b></h3><ul>${lista(sa2)}</ul></div></section>`;
}
function faixaSaldo(itens) {
  return `<section class="faixa-saldo"><img class="louro" src="img/louro-moedas.webp" alt="" width="110" height="90">${itens.map(([r, v, cls], i) => `<div class="${i === 0 ? 'principal' : ''}"><small>${r}</small><b class="num ${cls || ''}"${i === 0 ? ' data-total' : ''}>${v}</b></div>`).join('')}</section>`;
}
function gaveta(p, sd) {
  const s = sd[p.k] || 0, pctMeta = p.metaC ? Math.max(0, Math.min(1, s / p.metaC)) : 0;
  return `<a class="gaveta ${s < 0 ? 'neg' : ''}" href="#reserva/${p.k}" style="--c:${cor(p.k)}"><span class="puxador" aria-hidden="true"></span>${ICPOTE[p.k] || IC.cofre}<b class="g-nome">${t(p.nome)}</b><span class="g-valor num">${din(s)}</span>
    <small>de cada entrada</small><span class="g-pct">${p.pct}%</span>
    ${p.metaC ? `<span class="g-barra" aria-hidden="true"><i style="width:${Math.round(pctMeta * 100)}%"></i></span><small><b>${Math.round(pctMeta * 100)}%</b> da meta</small><small>Meta: ${din(p.metaC)}</small>` : '<span class="g-barra vazia" aria-hidden="true"></span><small>sem meta</small><small>&nbsp;</small>'}</a>`;
}
function grafSaldo(p, n) {
  // saldo dia a dia: hoje + cada movimento previsto; linha bronze, área clara, zero tracejado e o dia mais baixo em bordô
  const W = 760, H = 250, pl = 92, pr = 16, pt = 18, pb = 30, dias = [...Array(n + 1).keys()];
  const porDia = dias.map((d) => { const ate = p.itens.filter((i) => i.dia <= d); return ate.length ? ate.at(-1).saldo : p.hoje; });
  const min = Math.min(0, ...porDia), max = Math.max(1, ...porDia), y = (v) => pt + (H - pt - pb) * (1 - (v - min) / (max - min || 1)), x = (d) => pl + (W - pl - pr) * d / n;
  const pts = porDia.map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const passos = 4, marcas = [...Array(passos + 1).keys()].map((i) => min + (max - min) * i / passos);
  const iMin = porDia.indexOf(Math.min(...porDia)), cada = Math.max(1, Math.round(n / 10));
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo previsto para os próximos ${n} dias">
    ${marcas.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${(v / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</text>`).join('')}
    ${dias.filter((d) => d % cada === 0).map((d) => `<text x="${x(d)}" y="${H - 8}" text-anchor="middle">${dataM(d)}</text>`).join('')}
    <line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" class="g-zero"/>
    <polygon points="${x(0)},${y(Math.max(min, 0))} ${pts} ${x(n)},${y(Math.max(min, 0))}" class="g-area"/>
    <polyline points="${pts}" class="g-linha"/>
    <circle cx="${x(iMin)}" cy="${y(porDia[iMin])}" r="6" class="g-min"/>
    <g class="g-rot"><rect x="${Math.min(W - pr - 128, Math.max(pl, x(iMin) - 64))}" y="${Math.max(2, y(porDia[iMin]) - 52)}" width="128" height="40" rx="3"/><text x="${Math.min(W - pr - 64, Math.max(pl + 64, x(iMin)))}" y="${Math.max(2, y(porDia[iMin]) - 52) + 16}" text-anchor="middle">${dataM(iMin)} · menor saldo</text><text x="${Math.min(W - pr - 64, Math.max(pl + 64, x(iMin)))}" y="${Math.max(2, y(porDia[iMin]) - 52) + 32}" text-anchor="middle">${din(porDia[iMin])}</text></g>
  </svg>`;
}
function ultimaImport() {
  const l = db.movs.filter((m) => m.origem === 'importacao'); if (!l.length) return null;
  const arq = l.at(-1).imp?.arquivo || 'planilha'; return { arquivo: arq, qtd: l.filter((m) => (m.imp?.arquivo || 'planilha') === arq).length, total: l.length };
}
const mesesAtras = (k) => { const h = new Date(); const ini = new Date(h.getFullYear(), h.getMonth() - k, 1, 12), fim = new Date(h.getFullYear(), h.getMonth() - k + 1, 0, 12); const rel = (x) => Math.round((x - new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12)) / 864e5); return [rel(ini), Math.min(0, rel(fim)), ini.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')]; };

const T = {
  painel() {
    const sd = N.saldos(db), tot = N.total(db), r = N.resumo({ ...db, movs: comCC(db.movs) }, ...N.periodo('mes')), pend = N.pendencias(db);
    return `<div class="painel">
      ${faixaSaldo([['Em caixa', din(tot)], ['Entrou no mês', din(r.entradas)], ['Saiu no mês', din(r.saidas)], ['Resultado', din(r.resultado), r.resultado < 0 ? 'sai' : 'bronze']])}
      <div class="painel-grade"><div class="col-a">
        <section class="bloco">${titulo(IC.cofre, 'Reservas do caixa', `<span class="dica">As entradas são distribuídas sozinhas nas reservas · <a href="#divisao">mudar a divisão</a></span>`)}
          <div class="gavetas">${db.potes.map((p) => gaveta(p, sd)).join('')}</div>
          <div class="atalhos"><button type="button" class="bt" data-lancar="entra">${IC.entra} Entrou</button><button type="button" class="bt" data-lancar="sai">${IC.sai} Saiu</button><button type="button" class="bt" data-acao="mover" data-de="${pote('livre') ? 'livre' : db.potes.at(-1)?.k}">${IC.transf} Passar entre reservas</button><a class="bt" href="#receber">${IC.cobrar} Cobrar</a></div></section>
        <section class="bloco">${titulo(IC.livro, 'Últimos lançamentos', '<a class="ver" href="#lancamentos">Ver todos os lançamentos →</a>')}${tabelaMovs(ordenaMovs(comCC(db.movs)).slice(0, 10), { vazioTxt: 'Nada lançado ainda. Comece pela primeira entrada: o Arca divide nas reservas sozinho.' })}</section>
      </div><div class="col-b">${blocoHoje(pend, 5)}${proximos(7)}</div></div></div>`;
  },
  hoje() { return `${cabeca('Pendências', 'O Arca confere sozinho, toda vez que abre: contas vencendo, cobranças do dia, reservas negativas e divisão errada. Nada é pago nem enviado sem você.')}${blocoHoje(N.pendencias(db), 99)}`; },
  reserva(k) {
    const p = pote(k); if (!p) return T.painel();
    const s = N.saldos(db)[k] || 0, ms = ordenaMovs(comCC(db.movs.filter((m) => N.efeito(m)[k])));
    return `${voltar('painel', 'Painel')}${cabeca(t(p.nome), `${p.pct}% de cada entrada vem para cá${p.metaC ? ` · meta ${din(p.metaC)}` : ''}`, `<div class="linha"><button type="button" class="bt cheio" data-acao="mover" data-de="${p.k}">${IC.transf} Passar para outra reserva</button><a class="bt" href="#divisao">Mudar a divisão</a><button type="button" class="bt" data-acao="meta" data-k="${p.k}">Meta</button></div>`)}
      ${faixaSaldo([['Saldo da reserva', din(s), s < 0 ? 'sai' : ''], ['Recebe de cada entrada', `${p.pct}%`], ['Meta', p.metaC ? din(p.metaC) : 'sem meta']])}
      <section class="bloco">${titulo(IC.livro, 'Movimentos desta reserva')}${tabelaMovs(ms, { soPote: k, vazioTxt: 'Nada passou por esta reserva ainda.' })}</section>`;
  },
  divisao() {
    const soma = db.potes.reduce((s, p) => s + p.pct, 0);
    return `${voltar('painel', 'Painel')}${cabeca('Divisão das entradas', 'Quanto de cada real que entra vai para cada reserva. Precisa somar exatamente 100%. Vale para as próximas entradas: as que já entraram ficam como foram divididas.')}
      <form id="f-div" class="bloco forma-div"><div class="soma-bar" aria-hidden="true">${db.potes.map((p) => `<i data-barra="${p.k}" style="--c:${cor(p.k)};flex:${p.pct || 0.0001}"></i>`).join('')}</div>
      ${db.potes.map((p) => `<label class="campo-l" style="--c:${cor(p.k)}"><span>${t(p.nome)}</span><span class="passo"><button type="button" data-passo="-1" data-k="${p.k}" aria-label="Menos 1% em ${t(p.nome)}">−</button><input type="number" inputmode="numeric" min="0" max="100" step="1" name="${p.k}" value="${p.pct}" aria-label="${t(p.nome)} em %"><button type="button" data-passo="1" data-k="${p.k}" aria-label="Mais 1% em ${t(p.nome)}">+</button></span><b>%</b></label>`).join('')}
      <p class="soma" aria-live="polite">Soma: <b>${soma}%</b></p><button class="bt cheio largo">Salvar a divisão</button></form>`;
  },
  lancamentos() {
    const [de, ate] = filtro.per === 'tudo' ? [-1e6, 1e6] : N.periodo(filtro.per), q = sa(filtro.busca);
    const l = ordenaMovs(comCC(db.movs).filter((m) => m.dia >= de && m.dia <= ate && (!filtro.tipo || m.tipo === filtro.tipo) && (!q || sa(`${m.desc} ${m.cli || ''} ${m.cat || ''} ${m.cc || ''}`).includes(q))));
    const r = N.resumo({ ...db, movs: l }, -1e6, 1e6);
    return `${cabeca('Lançamentos', 'O livro-razão da empresa: tudo que entrou, saiu e passou entre reservas.', `<div class="linha"><button type="button" class="bt cheio" data-lancar="entra">${IC.entra} Entrada</button><button type="button" class="bt" data-lancar="sai">${IC.sai} Saída</button></div>`)}
      <div class="filtros"><div class="busca">${IC.busca}<input type="search" id="busca" placeholder="Procurar cliente, descrição, categoria, centro de custo" value="${t(filtro.busca)}" aria-label="Procurar nos lançamentos"></div>
      <div class="chips" role="group" aria-label="Período">${[['30', '30 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['90', '90 dias'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([k, n]) => `<button type="button" data-per="${k}" aria-pressed="${filtro.per === k}">${n}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Tipo">${[['', 'Todos'], ['entra', 'Entradas'], ['sai', 'Saídas'], ['transf', 'Entre reservas']].map(([k, n]) => `<button type="button" data-ftipo="${k}" aria-pressed="${filtro.tipo === k}">${n}</button>`).join('')}</div></div>
      ${faixaSaldo([['Entradas no filtro', din(r.entradas)], ['Saídas no filtro', din(r.saidas)], ['Resultado', din(r.resultado), r.resultado < 0 ? 'sai' : 'bronze'], ['Lançamentos', String(l.length)]])}
      <section class="bloco">${tabelaMovs(l, { vazioTxt: 'Nada encontrado com esses filtros.' })}</section>
      <div class="linha"><button type="button" class="bt" data-acao="exportar">${IC.dados} Baixar lançamentos (Excel/CSV)</button><a class="bt" href="#conciliacao">Importar extrato do banco</a></div>`;
  },
  mov(id) {
    const m = db.movs.find((x) => x.id === id); if (!m) return T.lancamentos();
    const nome = { entra: 'Entrada', sai: 'Saída', transf: 'Entre reservas', ajuste: 'Acerto de saldo' }[m.tipo];
    const det = m.tipo === 'entra' ? `<p class="mini">${m.receita === false ? 'Não é receita da empresa (não conta no faturamento).' : 'Receita da empresa (conta no faturamento do ano).'}</p><div class="divisao">${Object.entries(m.div).map(([k, v]) => `<div style="--c:${cor(k)}"><span>${t(nomePote(k))}</span><b class="num">${din(v)}</b></div>`).join('')}</div>`
      : m.tipo === 'sai' ? `<p>Saiu da reserva <b>${t(nomePote(m.pote))}</b> · ${t(m.cat || 'Outros')}</p>` : m.tipo === 'transf' ? `<p>De <b>${t(nomePote(m.de))}</b> para <b>${t(nomePote(m.para))}</b></p>` : `<p>${m.sinal < 0 ? 'Tirou de' : 'Pôs em'} ${t(nomePote(m.pote))}</p>`;
    const lig = m.cob ? `Recebimento da cobrança de ${t(db.cobrancas.find((c) => c.id === m.cob)?.cli || '')}.` : m.fixa ? 'Pagamento de conta fixa.' : m.conta ? 'Pagamento de conta a pagar.' : m.origem === 'importacao' ? `Importado de ${t(m.imp?.arquivo || 'planilha')}.` : '';
    return `${voltar('lancamentos', 'Lançamentos')}<section class="bloco detalhe"><p class="mini">${nome} · ${diaLongo(m.dia)}${m.cc ? ` · centro de custo <b>${t(m.cc)}</b>` : ''}</p><p class="valor-g ${m.tipo === 'sai' ? 'sai' : ''}">${m.tipo === 'sai' ? '−' : ''}${din(m.c)}</p><p class="sub">${t(m.desc)}${m.cli ? ` · ${t(m.cli)}` : ''}</p>
      ${det}${lig ? `<p class="mini">${lig}</p>` : ''}${m.editado ? `<p class="mini">Editado em ${new Date(m.editado).toLocaleString('pt-BR')}.</p>` : ''}
      <div class="linha"><button type="button" class="bt cheio" data-acao="editar-mov" data-m="${m.id}">Editar</button>${m.tipo === 'entra' ? `<button type="button" class="bt" data-acao="recibo" data-m="${m.id}">${IC.recibo} Recibo</button>` : ''}<button type="button" class="bt perigo" data-acao="apagar-mov" data-m="${m.id}">Apagar</button></div></section>`;
  },
  lancar() {
    const r = rascunho ||= novoRascunho(), c = Number(r.valor || 0), sugerida = r.cat || N.categoriaSugerida(r.desc) || '';
    return `${cabeca(r.tipo === 'entra' ? 'Entrou dinheiro' : 'Saiu dinheiro', r.tipo === 'entra' ? 'A entrada é dividida sozinha nas reservas, pela divisão de hoje.' : 'A saída sai da reserva que você escolher.')}
      <section class="bloco forma-lancar"><div class="alterna" role="group" aria-label="Tipo"><button type="button" data-tipo="entra" aria-pressed="${r.tipo === 'entra'}">Entrou</button><button type="button" class="sai" data-tipo="sai" aria-pressed="${r.tipo === 'sai'}">Saiu</button></div>
      <div class="lancar-grade"><div>
        <label class="campo valor-campo">Valor (R$)<input id="valor-l" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${c ? (c / 100).toFixed(2).replace('.', ',') : ''}"></label>
        <label class="campo">${r.tipo === 'entra' ? 'De quê? (cliente, nota, serviço)' : 'Com quê? (fornecedor, conta)'}<input id="desc-l" value="${t(r.desc)}" placeholder="${r.tipo === 'entra' ? 'Recebimento NF 12600 · Agromax' : 'Fornecedor Metamaq · pedido 9001'}" maxlength="120"></label>
        ${r.tipo === 'sai' ? `<label class="campo">Sai da reserva<select id="pote-l">${opPotes(r.pote)}</select></label><label class="campo">Categoria<select id="cat-l"><option value="">${sugerida ? `Automática: ${t(sugerida)}` : 'Automática'}</option>${opCats(r.cat)}</select></label>` : `<label class="check"><input type="checkbox" id="rec-l" ${r.receita ? 'checked' : ''}> É receita da empresa (conta no faturamento). Desmarque para empréstimo, aporte de sócio ou devolução.</label>`}
        <label class="campo">Centro de custo<input id="cc-l" list="lista-cc" maxlength="40" autocomplete="off" value="${t(r.cc || '')}" placeholder="Opcional (ex.: Comercial)"></label>
        <div class="chips" role="group" aria-label="Quando">${[[0, 'Hoje'], [-1, 'Ontem']].map(([d, n]) => `<button type="button" data-dia-l="${d}" aria-pressed="${r.dia === d}">${n}</button>`).join('')}<label class="chip-data">Outra data <input type="date" id="dia-l" max="${N.isoDe(0)}" value="${r.dia < -1 ? N.isoDe(r.dia) : ''}"></label></div>
      </div><div class="prev-div" id="prev-div">${prevDivisao(r, c)}</div></div>
      <div class="salvar-fixo"><button type="button" class="bt cheio largo" data-acao="salvar-mov" ${c && !(r.tipo === 'entra' && N.validarPcts(db.potes)) ? '' : 'disabled'}>Guardar ${din(c)}</button></div></section>`;
  },
  receber() {
    const l = comCC(db.cobrancas).map((c) => [c, N.situacaoCob(db, c)]).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
    const aberto = l.reduce((s, [, x]) => s + x.falta, 0), atras = l.filter(([, x]) => x.st === 'atrasada').reduce((s, [, x]) => s + x.falta, 0), sem = l.filter(([, x]) => x.st !== 'recebida' && x.st !== 'cancelada' && x.falta).filter(([c]) => c.vence <= 7).reduce((s, [, x]) => s + x.falta, 0);
    if (!l.some(([c]) => c.id === selCob)) selCob = l.find(([, s]) => s.falta)?.[0].id || l[0]?.[0].id || '';
    const regua = (c) => { const marcos = [c.vence - 1, c.vence, c.vence + 3]; return `<span class="regua" title="Lembretes: 1 dia antes, no dia e 3 dias depois">${marcos.map((d, i) => `<i class="${c.avisos?.includes(d) ? 'feito' : d === 0 ? 'hoje' : ''}">${i + 1}</i>`).join('')}</span>`; };
    const sit = (c, s) => s.st === 'recebida' ? etq('recebida', 'recebida') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? etq('atrasada', `atrasada ${-c.vence} dia(s)`) : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`);
    return `${cabeca('A receber', 'Cobranças com PIX copia e cola e lembrete pelo WhatsApp (1 dia antes, no dia e a partir de 3 dias de atraso).', `<div class="linha"><a class="bt" href="#pagar">Ver a pagar</a><button type="button" class="bt cheio" data-acao="nova-cob">+ Nova cobrança</button></div>`)}
      ${faixaSaldo([['Para receber', din(aberto)], ['Atrasado', din(atras), atras ? 'sai' : ''], ['Nos próximos 7 dias', din(sem)], ['Cobranças', String(l.length)]])}
      <div class="contas-grade"><section class="bloco">${l.length ? `<div class="tab-rol"><table class="razao cobs"><thead><tr><th>Vencimento</th><th>Cliente</th><th class="dir">Falta receber</th><th>Situação</th><th>Lembretes</th><th>Ações</th></tr></thead><tbody>${l.map(([c, s]) => `<tr class="${c.id === selCob ? 'sel' : ''} ${s.st === 'atrasada' ? 'atrasada' : ''}" data-sel-cob="${c.id}" tabindex="0" role="button" aria-pressed="${c.id === selCob}"><td class="num">${dataC(c.vence)}</td><td><b>${t(c.cli)}</b><small class="sub-l">${t(c.desc)}${c.cc ? ` · ${t(c.cc)}` : ''}</small></td><td class="dir num"><b>${din(s.falta)}</b>${s.falta !== c.c ? `<small class="sub-l">de ${din(c.c)}</small>` : ''}</td><td>${sit(c, s)}${s.parcial ? ' <small>parcial</small>' : ''}</td><td>${s.falta ? regua(c) : '—'}</td>
        <td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="cobrar" data-c="${c.id}">Cobrar</button><button type="button" class="bt pq" data-acao="receber" data-c="${c.id}">Recebi</button>` : `<button type="button" class="bt pq" data-acao="editar-cob" data-c="${c.id}">Editar</button>`}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma cobrança ainda. Crie a primeira e mande o PIX pelo WhatsApp.')}</section>
      <aside class="bloco detalhe-cob" id="det-cob">${detalheCob(selCob)}</aside></div>`;
  },
  pagar() {
    const fx = comCC(db.fixas).map((f) => [f, N.situacaoFixa(db, f)]), ct = comCC(db.contas).map((c) => [c, N.situacaoConta(db, c)]).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
    const doMes = fx.reduce((s, [, x]) => s + (x.falta || 0), 0) + ct.filter(([c]) => c.vence <= 30).reduce((s, [, x]) => s + x.falta, 0), atras = fx.filter(([, x]) => x.st === 'atrasada').reduce((s, [, x]) => s + x.falta, 0) + ct.filter(([, x]) => x.st === 'atrasada').reduce((s, [, x]) => s + x.falta, 0);
    const hoje = fx.filter(([, x]) => x.st === 'hoje').reduce((s, [, x]) => s + x.falta, 0) + ct.filter(([, x]) => x.st === 'hoje').reduce((s, [, x]) => s + x.falta, 0);
    const stF = (s) => s.st === 'paga' ? etq('paga', `paga · ${s.rot}`) : s.st === 'pausada' ? etq('pausada', 'pausada') : s.st === 'atrasada' ? etq('atrasada', 'atrasada') : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence em ${s.venceEm} dia(s)`);
    const stC = (c, s) => s.st === 'paga' ? etq('paga', 'paga') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? etq('atrasada', `atrasada ${-c.vence} dia(s)`) : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`);
    return `${cabeca('A pagar', 'Contas fixas (todo mês, toda semana ou todo ano) e contas avulsas, com pagamento parcial. Cada pagamento sai da reserva escolhida.', `<div class="linha"><a class="bt" href="#receber">Ver a receber</a><button type="button" class="bt" data-acao="editar-fixa">+ Conta fixa</button><button type="button" class="bt cheio" data-acao="editar-conta">+ Conta a pagar</button></div>`)}
      ${faixaSaldo([['A pagar em 30 dias', din(doMes)], ['Vence hoje', din(hoje)], ['Atrasado', din(atras), atras ? 'sai' : ''], ['Na reserva de contas', din(N.saldos(db).contas || 0)]])}
      <section class="bloco">${titulo(IC.cal, 'Contas fixas')}${fx.length ? `<div class="tab-rol"><table class="razao fixas"><thead><tr><th>Conta</th><th>Repete</th><th>Centro de custo</th><th>Reserva</th><th class="dir">Valor</th><th class="dir">Falta</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${fx.map(([f, s]) => `<tr class="${s.st === 'atrasada' ? 'atrasada' : ''}"><td><b>${t(f.desc)}</b></td><td class="nw">${t(N.descFreq(f))}</td><td>${t(f.cc || '—')}</td><td>${t(nomePote(f.pote))}</td><td class="dir num">${din(f.c)}</td><td class="dir num">${din(s.falta || 0)}</td><td>${stF(s)}${s.p && s.falta ? ` <small>pago ${din(s.p)}</small>` : ''}</td>
        <td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-fixa" data-f="${f.id}">Paguei</button>` : ''}${s.antAberta ? `<button type="button" class="bt pq" data-acao="pagar-fixa" data-f="${f.id}" data-comp="${s.compAnt}">Paguei ${t(s.rotAnt)}</button>` : ''}<button type="button" class="bt pq" data-acao="editar-fixa" data-f="${f.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma conta fixa. Cadastre aluguel, folha, impostos e o que se repete.')}</section>
      <section class="bloco">${titulo(IC.doc, 'Contas avulsas')}${ct.length ? `<div class="tab-rol"><table class="razao avulsas"><thead><tr><th>Vencimento</th><th>Conta</th><th>Categoria</th><th>Centro de custo</th><th>Reserva</th><th class="dir">Valor</th><th class="dir">Falta</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${ct.map(([c, s]) => `<tr class="${s.st === 'atrasada' ? 'atrasada' : ''}"><td class="num">${dataC(c.vence)}</td><td><b>${t(c.desc)}</b></td><td>${t(c.cat || '—')}</td><td>${t(c.cc || '—')}</td><td>${t(nomePote(c.pote))}</td><td class="dir num">${din(c.c)}</td><td class="dir num">${din(s.falta)}</td><td>${stC(c, s)}${s.parcial ? ` <small>pago ${din(s.p)}</small>` : ''}</td>
        <td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-conta" data-c="${c.id}">Paguei</button>` : ''}<button type="button" class="bt pq" data-acao="editar-conta" data-c="${c.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma conta avulsa. Use para boletos de fornecedor e compras que vencem uma vez.')}</section>`;
  },
  fluxo() {
    const n = horizonte, p = N.projecao(db, n), imp = ultimaImport();
    const porDia = []; p.itens.forEach((i) => { const g = porDia.at(-1); if (g && g.dia === i.dia) g.l.push(i); else porDia.push({ dia: i.dia, l: [i] }); });
    return `${cabeca('Fluxo de caixa', 'O saldo de hoje mais o que deve entrar (cobranças) e sair (contas fixas e avulsas). Atrasadas contam como hoje.', `<div class="chips hz" role="group" aria-label="Horizonte de projeção"><span>Horizonte de projeção:</span>${[30, 60, 90].map((d) => `<button type="button" data-hz="${d}" aria-pressed="${n === d}">${d} dias</button>`).join('')}</div>`)}
      ${faixaSaldo([['Hoje no caixa', din(p.hoje)], ['Deve entrar', din(p.entra)], ['Deve sair', din(p.sai)], ['Termina com', din(p.fim), p.fim < 0 ? 'sai' : 'bronze']])}
      <div class="fluxo-grade"><section class="bloco">${p.menor.s < 0 ? `<div class="faixa-t bordo alerta-neg">${IC.alerta}<h2>Atenção: o saldo fica negativo em ${dataM(p.menor.dia)} (${din(p.menor.s)})</h2></div>` : `<div class="faixa-t ok-t">${IC.ok}<h2>Saldo positivo nos próximos ${n} dias · menor saldo ${din(p.menor.s)} em ${dataM(p.menor.dia)}</h2></div>`}
        <div class="graf-cx"><p class="graf-leg"><b>Saldo previsto (${n} dias)</b><span><i class="lg-l"></i>Saldo do caixa</span><span><i class="lg-z"></i>Linha do zero</span></p>${grafSaldo(p, n)}</div></section>
      <section class="bloco conc-res">${titulo(IC.transf, 'Conciliação')}${imp ? `<p class="mini">Último arquivo importado</p><p><b>${t(imp.arquivo)}</b></p><div class="contadores"><div><small>Lançamentos do arquivo</small><b>${imp.qtd}</b></div><div><small>Importados no total</small><b>${imp.total}</b></div></div>` : '<p class="mini">Nenhum extrato importado ainda. Traga o arquivo OFX ou CSV do banco: o Arca mostra o que é novo e o que já está lançado antes de gravar.</p>'}<a class="bt cheio" href="#conciliacao">Importar extrato (OFX ou CSV)</a></section></div>
      <section class="bloco">${titulo(IC.cal, 'Dia a dia previsto')}${p.itens.length ? `<div class="tab-rol"><table class="razao dia"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th class="dir">Entra</th><th class="dir">Sai</th><th class="dir">Saldo do dia</th></tr></thead><tbody><tr><td class="num">${dataC(0)}</td><td>Saldo de hoje no caixa</td><td>—</td><td class="dir">—</td><td class="dir">—</td><td class="dir num"><b>${din(p.hoje)}</b></td></tr>${p.itens.map((i) => `<tr class="${i.saldo < 0 ? 'atrasada' : ''}"><td class="num">${i.atrasada ? 'atrasada' : dataC(i.dia)}</td><td>${t(i.desc)}</td><td>${i.sinal > 0 ? 'A receber' : db.fixas.some((f) => f.desc === i.desc) ? 'Fixa' : 'A pagar'}</td><td class="dir num en">${i.sinal > 0 ? din(i.c) : '—'}</td><td class="dir num sai">${i.sinal < 0 ? `−${din(i.c)}` : '—'}</td><td class="dir num ${i.saldo < 0 ? 'sai' : ''}"><b>${din(i.saldo)}</b></td></tr>`).join('')}</tbody></table></div>` : vazio(`Nada previsto para os próximos ${n} dias.`)}</section>`;
  },
  relatorios() {
    const [de, ate] = N.periodo(perResumo), ms = comCC(db.movs), r = N.resumo({ ...db, movs: ms }, de, ate), maxCat = Math.max(1, ...r.cats.map(([, v]) => v));
    const porCC = {}; ms.filter((m) => m.dia >= de && m.dia <= ate && (m.tipo === 'entra' || m.tipo === 'sai')).forEach((m) => { const k = m.cc || 'Sem centro de custo'; porCC[k] ||= { en: 0, sa: 0 }; porCC[k][m.tipo === 'entra' ? 'en' : 'sa'] += m.c; });
    const meses = [5, 4, 3, 2, 1, 0].map((k) => { const [a, b, nome] = mesesAtras(k); const x = N.resumo({ ...db, movs: ms }, a, b); return { nome, ...x }; }), maxM = Math.max(1, ...meses.map((m) => Math.max(m.entradas, m.saidas)));
    return `${cabeca('Relatórios', 'Tudo calculado do livro-razão (realizado). O que ainda vai acontecer fica no Fluxo de caixa.', `<div class="chips" role="group" aria-label="Período">${[['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['90', '90 dias'], ['ano', 'Ano']].map(([k, n]) => `<button type="button" data-per-r="${k}" aria-pressed="${perResumo === k}">${n}</button>`).join('')}</div>`)}
      ${faixaSaldo([['Receita', din(r.receita)], ['Outras entradas', din(r.outras)], ['Saídas', din(r.saidas)], ['Resultado', din(r.resultado), r.resultado < 0 ? 'sai' : 'bronze']])}
      <div class="rel-grade"><section class="bloco">${titulo(IC.doc, 'Demonstrativo do período')}<table class="razao dre"><tbody><tr><td>Receita da empresa</td><td class="dir num en">${din(r.receita)}</td></tr><tr><td>Outras entradas (aporte, empréstimo, devolução)</td><td class="dir num">${din(r.outras)}</td></tr>${r.cats.map(([c, v]) => `<tr><td>(−) ${t(c)}</td><td class="dir num sai">−${din(v)}</td></tr>`).join('')}<tr class="total"><td>Resultado do período</td><td class="dir num ${r.resultado < 0 ? 'sai' : ''}">${din(r.resultado)}</td></tr></tbody></table></section>
      <section class="bloco">${titulo(IC.sai, 'Para onde foi o dinheiro')}<div class="barras">${r.cats.map(([c, v]) => `<div class="barra-c"><span>${t(c)}</span><i style="width:${Math.round(v / maxCat * 100)}%"></i><b class="num">${din(v)}</b></div>`).join('') || '<p class="mini">Nenhuma saída no período.</p>'}</div></section></div>
      <div class="rel-grade"><section class="bloco">${titulo(IC.pessoas, 'Por centro de custo')}${Object.keys(porCC).length ? `<table class="razao"><thead><tr><th>Centro de custo</th><th class="dir">Entradas</th><th class="dir">Saídas</th><th class="dir">Resultado</th></tr></thead><tbody>${Object.entries(porCC).sort((a, b) => (b[1].en + b[1].sa) - (a[1].en + a[1].sa)).map(([k, v]) => `<tr><td>${t(k)}</td><td class="dir num en">${din(v.en)}</td><td class="dir num sai">−${din(v.sa)}</td><td class="dir num ${v.en - v.sa < 0 ? 'sai' : ''}">${din(v.en - v.sa)}</td></tr>`).join('')}</tbody></table>` : '<p class="mini">Nada no período.</p>'}</section>
      <section class="bloco">${titulo(IC.cal, 'Mês a mês (6 meses)')}<div class="meses">${meses.map((m) => `<div class="mes"><span class="mb"><i class="en" style="height:${Math.round(m.entradas / maxM * 100)}%" title="Entrou ${din(m.entradas)}"></i><i class="sa" style="height:${Math.round(m.saidas / maxM * 100)}%" title="Saiu ${din(m.saidas)}"></i></span><small>${m.nome}</small><b class="num ${m.resultado < 0 ? 'sai' : ''}">${din(m.resultado)}</b></div>`).join('')}</div><p class="graf-leg"><span><i class="lg-en"></i>Entrou</span><span><i class="lg-sa"></i>Saiu</span><span>Embaixo: resultado do mês</span></p></section></div>
      <div class="linha"><button type="button" class="bt" data-acao="exportar">${IC.dados} Baixar lançamentos (Excel/CSV)</button></div>`;
  },
  impostos() {
    const f = N.faturamentoAno(db), sd = N.saldos(db), [ini] = N.periodo('ano'), pagos = db.movs.filter((m) => m.tipo === 'sai' && m.dia >= ini && (m.cat === 'Impostos' || m.pote === 'imposto')).reduce((s, m) => s + m.c, 0);
    const fxImp = db.fixas.filter((x) => x.pote === 'imposto' || x.cat === 'Impostos' || x.das).map((x) => [x, N.situacaoFixa(db, x)]);
    const mei = db.regime === 'mei', uso = f.total / N.LIMITE_MEI, h = new Date(), diasAno = Math.max(1, Math.round((h - new Date(h.getFullYear(), 0, 1)) / 864e5) + 1), proj = Math.round(f.total / diasAno * 365), das = dasFixa(), sdas = das ? N.situacaoFixa(db, das) : null;
    return `${cabeca('Impostos', `${t(db.cnpj || 'CNPJ não informado')} · regime ${REGIMES[db.regime]} (troque em Configurações). O Arca guarda o dinheiro do imposto antes de você gastar; o cálculo e a emissão das guias continuam com o seu contador.`)}
      ${faixaSaldo([['Reserva de impostos', din(sd.imposto || 0)], ['Impostos pagos no ano', din(pagos)], ['Faturamento do ano', din(f.total)], [mei ? 'Limite do MEI usado' : 'Ritmo do ano', mei ? `${Math.round(uso * 100)}%` : din(proj)]])}
      ${mei ? `<section class="bloco">${titulo(IC.coluna, 'Limite do MEI')}<div class="medidor"><i class="${uso > 0.8 ? 'perto' : ''}" style="width:${Math.min(100, uso * 100)}%"></i></div><p class="mini">${Math.round(uso * 100)}% do limite de ${din(N.LIMITE_MEI)}. No ritmo atual o ano fecha em ${din(proj)}${proj > N.LIMITE_MEI ? ' <b class="sai">(passa do limite: converse com o seu contador sobre o desenquadramento)</b>' : ''}.</p>
        <p><b>DAS do mês</b> ${das ? `· ${din(das.c)} · vence dia ${das.dia} · ${sdas.st === 'paga' ? etq('paga', 'pago') : sdas.st === 'atrasada' ? etq('atrasada', 'atrasado') : etq('hoje', 'a pagar')}` : ''}</p><div class="linha">${das ? (sdas.falta ? `<button type="button" class="bt cheio" data-acao="pagar-fixa" data-f="${das.id}">Paguei o DAS</button>` : '') + `<button type="button" class="bt" data-acao="editar-fixa" data-f="${das.id}">Editar o DAS</button>` : '<button type="button" class="bt cheio" data-acao="editar-fixa" data-das="1">Cadastrar o DAS</button>'}<button type="button" class="bt" data-acao="dasn">Resumo para a declaração anual (DASN-SIMEI)</button></div></section>` : ''}
      <section class="bloco">${titulo(IC.cal, 'Guias que se repetem')}${fxImp.length ? `<table class="razao fixas guias"><thead><tr><th>Guia</th><th>Repete</th><th class="dir">Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${fxImp.map(([x, s]) => `<tr><td><b>${t(x.desc)}</b></td><td>${t(N.descFreq(x))}</td><td class="dir num">${din(x.c)}</td><td>${s.st === 'paga' ? etq('paga', 'paga') : s.st === 'atrasada' ? etq('atrasada', 'atrasada') : s.st === 'hoje' ? etq('hoje', 'vence hoje') : s.st === 'pausada' ? etq('pausada', 'pausada') : etq('', `vence em ${s.venceEm} dia(s)`)}</td><td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-fixa" data-f="${x.id}">Paguei</button>` : ''}<button type="button" class="bt pq" data-acao="editar-fixa" data-f="${x.id}">Editar</button></td></tr>`).join('')}</tbody></table>` : vazio('Nenhuma guia cadastrada. Cadastre em A pagar › Conta fixa, saindo da reserva Impostos.')}</section>
      <section class="bloco">${titulo(IC.recibo, 'Recibos')}<p class="mini">Para cliente que pede comprovante. Cada recibo ganha número e fica guardado. Nota fiscal não é emitida pelo Arca.</p><div class="linha"><button type="button" class="bt" data-acao="recibo">Fazer um recibo</button><a class="bt" href="#recibos">Ver os recibos</a></div></section>`;
  },
  mais() {
    const l = [['lancamentos', 'Lançamentos', 'o livro-razão completo', IC.livro], ['pagar', 'A pagar', 'contas fixas e avulsas', IC.doc], ['conciliacao', 'Conciliação', 'importar extrato, exportar e cópia', IC.transf], ['relatorios', 'Relatórios', 'demonstrativo, categorias, centros de custo', IC.doc], ['impostos', 'Impostos', 'reserva, guias e recibos', IC.coluna], ['ia', 'Assistente', 'pergunte sobre o caixa', IC.ia], ['hoje', 'Pendências', `${N.pendencias(db).length} agora`, IC.alerta], ['historico', 'Histórico', 'tudo que foi lançado, editado e apagado', IC.relogio], ['recibos', 'Recibos', 'emitidos e numerados', IC.recibo], ['equipe', 'Equipe', 'quem vê e quem mexe', IC.equipe], ['assinatura', 'Minha assinatura', estAss(), IC.cartao], ['config', 'Configurações', 'empresa, PIX, regime, centros de custo', IC.ajustes]];
    return `${cabeca('Mais')}<div class="bloco lista-mais">${l.map(([k, n, s, ic]) => `<a href="#${k}"><span class="ic">${ic}</span><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div>`;
  },
  conciliacao() {
    if (previa) return T.importar();
    const temCopia = (() => { try { return !!localStorage.getItem(`${CHAVE}-copia-formato1:${CONTA}`) || !!localStorage.getItem(`${CHAVE}-antes-de-restaurar:${CONTA}`); } catch { return false; } })(), imp = ultimaImport();
    return `${cabeca('Conciliação', 'Traga o extrato do banco e confira com o que está lançado. Não há ligação automática com banco: você baixa o arquivo no internet banking e escolhe aqui.')}
      <div class="rel-grade"><section class="bloco">${titulo(IC.transf, 'Importar extrato do banco')}<p class="mini">Arquivo OFX ou CSV. No CSV, a primeira linha precisa ter os nomes das colunas, com "Data" e "Valor" (ou "Entrada" e "Saída"). Você confere tudo antes de gravar; o que já está lançado não entra de novo.</p>${imp ? `<p class="mini">Último arquivo: <b>${t(imp.arquivo)}</b> (${imp.qtd} lançamento(s)).</p>` : ''}<label class="bt cheio">Escolher arquivo<input type="file" id="arq-extrato" accept=".ofx,.csv,.txt" hidden></label></section>
      <section class="bloco">${titulo(IC.dados, 'Baixar os lançamentos')}<p class="mini">Planilha (CSV) que abre no Excel e no Google Planilhas: data, tipo, descrição, valor, categoria, reservas, cliente e centro de custo.</p><button type="button" class="bt" data-acao="exportar">Baixar CSV</button></section></div>
      <section class="bloco">${titulo(IC.escudo, 'Cópia de segurança')}<p class="mini">Um arquivo com tudo (reservas, lançamentos, contas, cobranças, recibos). Guarde no Drive ou no e-mail. Restaurar substitui os dados atuais, que ficam guardados neste aparelho caso precise voltar.</p><div class="linha"><button type="button" class="bt" data-acao="copia">Baixar cópia</button><label class="bt">Restaurar uma cópia<input type="file" id="restaurar" accept=".json" hidden></label>${temCopia ? '<button type="button" class="bt" data-acao="voltar-copia">Voltar a versão anterior</button>' : ''}</div></section>`;
  },
  importar() {
    if (!previa) return T.conciliacao();
    const novas = previa.linhas.filter((l) => !l.duplicada);
    return `<a class="voltar" href="#conciliacao" data-acao="cancelar-imp">‹ Cancelar</a>${cabeca('Conferir antes de gravar', `${t(previa.arquivo)}: ${previa.linhas.length} lançamento(s) lidos, ${previa.linhas.length - novas.length} já estavam lançados${previa.erros.length ? `, ${previa.erros.length} linha(s) com problema` : ''}.`)}
      <div class="faixa-saldo mini-f"><div><small>Novos</small><b class="num">${novas.length}</b></div><div><small>Já no sistema</small><b class="num">${previa.linhas.length - novas.length}</b></div><div><small>Com problema</small><b class="num ${previa.erros.length ? 'sai' : ''}">${previa.erros.length}</b></div></div>
      ${previa.erros.length ? `<details class="bloco" open><summary><b>Linhas que não entram (${previa.erros.length})</b></summary>${previa.erros.slice(0, 30).map((e) => `<p class="mini">Linha ${e.linha}: ${t(e.motivo)}</p>`).join('')}</details>` : ''}
      <form id="f-imp" class="bloco"><div class="linha"><label class="campo">As saídas saem de qual reserva?<select name="pote">${opPotes('contas')}</select></label><label class="check"><input type="checkbox" name="receita" checked> As entradas são receita da empresa</label></div>
      <div class="tab-rol"><table class="razao conc"><thead><tr><th></th><th>Data</th><th>Descrição</th><th class="dir">Valor</th><th>Situação</th></tr></thead><tbody>${previa.linhas.map((l, i) => `<tr class="${l.duplicada ? 'dup' : ''}"><td><input type="checkbox" name="l${i}" ${l.duplicada ? 'disabled' : 'checked'} aria-label="Gravar ${t(l.desc)}"></td><td class="num">${dataC(l.dia)}</td><td>${t(l.desc)}</td><td class="dir num ${l.tipo === 'sai' ? 'sai' : 'en'}">${l.tipo === 'sai' ? '−' : ''}${din(l.c)}</td><td>${l.duplicada ? 'já está lançado' : 'novo'}</td></tr>`).join('')}</tbody></table></div>
      <div class="salvar-fixo"><button class="bt cheio largo" ${novas.length ? '' : 'disabled'}>Gravar ${novas.length} lançamento(s)</button></div></form>`;
  },
  historico() { return `${cabeca('Histórico', 'Tudo que foi lançado, editado, pago, recebido e apagado, do mais novo ao mais antigo.')}<section class="bloco">${db.historico.length ? `<table class="razao"><thead><tr><th>Quando</th><th>O que aconteceu</th></tr></thead><tbody>${db.historico.slice(0, 150).map((h) => `<tr><td class="num">${h.quando ? new Date(h.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : dia(h.dia)}</td><td>${t(h.oque)}</td></tr>`).join('')}</tbody></table>` : vazio('Nada registrado ainda.')}</section>`; },
  recibos() { return `${cabeca('Recibos emitidos', 'Numerados em sequência e guardados.', '<button type="button" class="bt cheio" data-acao="recibo">+ Novo recibo</button>')}<section class="bloco">${db.recibos.length ? `<table class="razao"><thead><tr><th>Nº</th><th>Data</th><th>Recebido de</th><th>Referente a</th><th class="dir">Valor</th></tr></thead><tbody>${[...db.recibos].reverse().map((r) => `<tr data-acao="ver-recibo" data-r="${r.id}" role="button" tabindex="0"><td class="num">${r.num}</td><td class="num">${dataC(r.dia)}</td><td>${t(r.cli)}</td><td>${t(r.ref)}</td><td class="dir num">${din(r.c)}</td></tr>`).join('')}</tbody></table>` : vazio('Nenhum recibo ainda.')}</section>`; },
  conferir() {
    const l = (db.migracao?.divergencias || []).filter((d) => !d.resolvida);
    return `${voltar('painel', 'Painel')}${cabeca('Conferir reservas', 'O sistema foi atualizado: agora o saldo de cada reserva é a soma dos lançamentos, ao centavo. Nestas reservas, o saldo que aparecia antes não bate com os lançamentos. Nada foi lançado por conta própria: escolha o que vale.')}
      ${l.map((d) => `<section class="bloco"><b>${t(d.nome)}</b><p class="mini">Antes mostrava <b>${din(d.gravado)}</b> · os lançamentos somam <b>${din(d.calculado)}</b> · diferença ${din(d.gravado - d.calculado)}</p><div class="linha"><button type="button" class="bt" data-acao="div-extrato" data-p="${d.pote}">Valem os lançamentos</button><button type="button" class="bt cheio" data-acao="div-acerto" data-p="${d.pote}">Lançar acerto de ${din(Math.abs(d.gravado - d.calculado))}</button></div></section>`).join('') || vazio('Tudo conferido.')}`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Olá, ${(db.dono || '').split(' ')[0]}! Eu vejo as reservas, as contas a pagar e a receber e o fluxo de caixa. Pergunte do seu jeito.` }];
    return `${cabeca('Assistente')}<section class="bloco"><div class="chat">${conv.map((m) => `<div class="bolha ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['Quanto posso gastar este mês?', 'Quem está devendo?', 'O que vence esta semana?', 'O caixa fica negativo?'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form></section>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<section class="bloco alerta"><b class="sai">Assinatura vencida</b><p class="mini">O pagamento de ${din(a.valor * 100)} não foi aprovado. Seus dados estão guardados.</p></section>`
      : a.renova ? `<section class="bloco"><b>Ativa</b><p class="mini">Plano Assinatura · ${din(a.valor * 100)} por mês · próxima cobrança ${dia(a.proxima)}.</p></section>`
        : `<section class="bloco"><b>Cancelada</b><p class="mini">Você usa tudo até ${dia(a.proxima)}. Depois disso nada mais é cobrado.</p></section>`;
    return `${cabeca('Minha assinatura', `A mesma da sua conta no site. Sem fidelidade.${CONTA === 'demo' ? ' Nesta demonstração os pagamentos são simulados.' : ''}`)}${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <section class="bloco">${titulo(IC.cartao, 'Pagamentos')}${a.pagos.length ? `<table class="razao"><tbody>${a.pagos.map((d) => `<tr><td>Mensalidade</td><td class="num">${dataC(d)}</td><td class="dir num">${din(a.valor * 100)}</td></tr>`).join('')}</tbody></table>` : '<p class="mini">Nenhum ainda.</p>'}</section>`;
  },
  equipe() {
    const real = !!document.querySelector('[data-vc="equipe"]');
    return `${cabeca('Equipe', 'Quem ajuda (contador, tesouraria, sócio) entra com o próprio login e só vê ou mexe no que você liberar. O convite sai por e-mail ou WhatsApp.')}
      ${real ? '<button type="button" class="bt cheio largo" data-acao="equipe">Abrir a equipe e os convites</button>' : `<section class="bloco"><table class="razao"><thead><tr><th>Pessoa</th><th>Contato</th><th>Acesso</th><th>Situação</th><th></th></tr></thead><tbody>${equipeDemo().map((p) => `<tr><td><b>${t(p.nome)}</b></td><td>${t(p.contato)}</td><td>${p.acesso === 'ver' ? 'só ver' : 'ver e mexer'}</td><td>${p.st === 'ativo' ? 'entrou' : 'convite enviado'}</td><td class="acoes"><button type="button" class="bt pq" data-acao="tira-pessoa" data-id="${p.id}">Tirar</button></td></tr>`).join('')}</tbody></table><button type="button" class="bt cheio" data-acao="convidar">+ Convidar pessoa</button></section>`}`;
  },
  config() {
    const f = N.faturamentoAno(db);
    return `${cabeca('Configurações')}<div class="rel-grade"><section class="bloco">${titulo(IC.ajustes, 'Empresa')}${[['negocio', 'Nome da empresa'], ['dono', 'Seu nome'], ['cnpj', 'CNPJ'], ['pix', 'Chave PIX das cobranças'], ['cidade', 'Cidade (vai no PIX)']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k])}" maxlength="80"></label>`).join('')}
      <label class="campo">Regime tributário<select data-cfg-regime>${Object.entries(REGIMES).map(([k, n]) => `<option value="${k}" ${db.regime === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><p class="mini">Com MEI, a tela Impostos mostra o limite anual e o DAS.</p></section>
      <section class="bloco">${titulo(IC.pessoas, 'Centros de custo')}<p class="mini">Separe o dinheiro por área, filial ou projeto. Escreva um por linha. Os lançamentos, contas e cobranças podem ter um centro de custo, e o filtro do topo mostra só ele.</p><label class="campo">Centros de custo<textarea data-cfg-centros rows="6">${t(db.centros.join('\n'))}</textarea></label>
      ${titulo(IC.relogio, 'Avisos e faturamento')}<label class="campo">Faturamento deste ano antes de usar o Arca (R$)<input data-cfg-fat inputmode="decimal" value="${(f.antes / 100).toFixed(2).replace('.', ',')}"></label><p class="mini">O faturamento do ano é esse valor + as entradas marcadas como receita neste ano.</p>
      <label class="campo">Avisar contas que vencem em até (dias)<input data-cfg-aviso type="number" min="0" max="30" inputmode="numeric" value="${Number.isInteger(db.avisoDias) ? db.avisoDias : 3}"></label><p class="mini">Vale para contas fixas e avulsas. Atrasadas sempre aparecem.</p></section></div>
      <section class="bloco"><div class="linha"><a class="bt" href="#divisao">Divisão das reservas</a><a class="bt" href="#historico">Histórico</a><a class="bt" href="#conciliacao">Cópia de segurança</a><a class="bt" href="#assinatura">Minha assinatura</a></div><p class="mini">Os dados ficam neste aparelho e, com a sua conta, na nuvem. Sem internet, o que você lançar sobe quando a conexão voltar.</p></section>`;
  },
};
// rotas antigas (do Financeiro Essencial) continuam abrindo a tela certa
const ALIAS = { potes: 'painel', pote: 'reserva', extrato: 'lancamentos', contas: 'pagar', resumo: 'relatorios', mei: 'impostos', dados: 'conciliacao', dono: 'equipe' };
function prevDivisao(r, c) {
  if (r.tipo !== 'entra') { const s = N.saldos(db)[r.pote] || 0; return `<p class="mini">A reserva <b>${t(nomePote(r.pote))}</b> tem ${din(s)}${c ? `; depois desta saída fica com <b class="${s - c < 0 ? 'sai' : ''}">${din(s - c)}</b>` : ''}.</p>`; }
  const pv = N.validarPcts(db.potes); if (pv) return `<p class="erro">${t(pv)} <a href="#divisao">Arrumar a divisão</a></p>`;
  const d = c > 0 ? N.dividir(c, db.potes) : {};
  return `<p class="prev-t">${IC.coluna} Vai ser dividido assim</p><div class="divisao">${db.potes.map((p) => `<div style="--c:${cor(p.k)}"><span>${ICPOTE[p.k] || IC.cofre}${t(p.nome)} <small>(${p.pct}%)</small></span><b class="num">${din(d[p.k] || 0)}</b></div>`).join('')}<div class="tot"><span>Total</span><b class="num">${din(c)}</b></div></div>`;
}
let qrPedido = 0;
function detalheCob(id) {
  const c = db.cobrancas.find((x) => x.id === id); if (!c) return '<p class="mini">Escolha uma cobrança na tabela.</p>';
  const s = N.situacaoCob(db, c), recs = db.movs.filter((m) => m.cob === c.id);
  const n = ++qrPedido;
  if (s.falta && db.pix) Promise.all([import('../base/pix.js'), import('../base/qr.js')]).then(([{ pixCopiaECola }, { qrSVG }]) => {
    if (n !== qrPedido) return; const alvo = document.querySelector('#det-cob .qr-pix'); if (!alvo) return;
    const pix = pixCopiaECola({ chave: db.pix, nome: db.negocio || db.dono, cidade: db.cidade || 'BRASIL', valor: s.falta / 100, txid: c.id.replace(/[^A-Za-z0-9]/g, '').slice(-20) });
    alvo.innerHTML = qrSVG(pix, 168); const tx = document.querySelector('#det-cob .pix-txt'); if (tx) tx.textContent = pix;
  }).catch(() => {});
  return `${titulo(IC.cobrar, 'Detalhes da cobrança')}<p class="mini">${t(c.desc)}${c.cc ? ` · ${t(c.cc)}` : ''}</p><p class="cli-g">${t(c.cli)}</p>
    ${s.falta ? `<div class="qr-pix" aria-label="QR code do PIX"></div><p class="mini">PIX copia e cola</p><p class="pix-txt">${db.pix ? 'gerando…' : 'Cadastre a chave PIX em Configurações.'}</p>` : ''}
    <dl class="ficha"><div><dt>Vencimento</dt><dd>${dataC(c.vence)}</dd></div><div><dt>Valor</dt><dd class="num">${din(c.c)}</dd></div><div><dt>Recebido</dt><dd class="num">${din(s.r || 0)}</dd></div><div><dt>Falta</dt><dd class="num ${s.st === 'atrasada' ? 'sai' : ''}">${din(s.falta)}</dd></div><div><dt>WhatsApp</dt><dd>${t(c.tel || '—')}</dd></div><div><dt>Lembretes feitos</dt><dd>${(c.avisos || []).length}</dd></div></dl>
    ${s.falta ? `<div class="linha"><button type="button" class="bt cheio" data-acao="cobrar" data-c="${c.id}">Cobrar (PIX + WhatsApp)</button><button type="button" class="bt" data-acao="receber" data-c="${c.id}">Recebi</button></div>` : ''}<div class="linha"><button type="button" class="bt pq" data-acao="editar-cob" data-c="${c.id}">Editar ou cancelar</button></div>
    ${recs.length ? `<p class="mini"><b>Recebimentos</b></p><ul class="recs">${recs.map((m) => `<li><a href="#mov/${m.id}">${dataC(m.dia)}</a><b class="num en">${din(m.c)}</b></li>`).join('')}</ul>` : ''}`;
}
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima ${dia(a.proxima)}` : `cancelada · usa até ${dia(a.proxima)}`; };
function responde(p) {
  const x = sa(p), sd = N.saldos(db);
  if (/negativ|fica|aguenta|falta dinheiro/.test(x)) { const pr = N.projecao(db, 30); return pr.menor.s < 0 ? `Sim: se tudo acontecer como previsto, o caixa fica em ${din(pr.menor.s)} em ${dataM(pr.menor.dia)}. Veja o Fluxo de caixa para antecipar cobranças ou adiar pagamentos.` : `Não: nos próximos 30 dias o menor saldo previsto é ${din(pr.menor.s)} (${dataM(pr.menor.dia)}).`; }
  if (/gastar|posso|sobra/.test(x)) return `Sem mexer em impostos, fornecedores, folha e emergência, a empresa pode gastar ${din(sd.livre || 0)} (reserva Livre). A reserva Folha e pró-labore tem ${din(sd.salario || 0)}.`;
  if (/devend|deve|receber|cobr/.test(x)) { const a = db.cobrancas.map((c) => [c, N.situacaoCob(db, c)]).filter(([, s]) => s.falta); return a.length ? a.map(([c, s]) => `• ${c.cli}: ${din(s.falta)} ${s.st === 'atrasada' ? `(atrasada ${-c.vence} dia(s))` : `(vence ${dia(c.vence)})`}`).join('\n') : 'Ninguém está devendo.'; }
  if (/mei|limite|estour|imposto/.test(x)) { const f = N.faturamentoAno(db); return `A empresa faturou ${din(f.total)} no ano e a reserva de impostos tem ${din(sd.imposto || 0)}.${db.regime === 'mei' ? ` O limite do MEI é ${din(N.LIMITE_MEI)}.` : ''} Veja a tela Impostos.`; }
  if (/vence|semana|pagar/.test(x)) { const p7 = N.projecao(db, 7).itens.filter((i) => i.sinal < 0); return p7.length ? p7.map((i) => `• ${i.desc}: ${din(i.c)} ${i.atrasada ? '(atrasada)' : dia(i.dia)}`).join('\n') : 'Nada vence nos próximos 7 dias.'; }
  return `Hoje a empresa tem ${din(N.total(db))} em caixa. Nos próximos 30 dias devem entrar ${din(N.projecao(db, 30).entra)}.`;
}
function baixa(nome, conteudo, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ------------------------------------------------------------------ navegação e trava
const NOMES = { painel: 'Painel', reserva: 'Reserva', lancamentos: 'Lançamentos', mov: 'Lançamento', lancar: 'Lançar', receber: 'A receber', pagar: 'A pagar', fluxo: 'Fluxo de caixa', conciliacao: 'Conciliação', importar: 'Conferir extrato', relatorios: 'Relatórios', impostos: 'Impostos', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', equipe: 'Equipe', config: 'Configurações', historico: 'Histórico', recibos: 'Recibos', hoje: 'Pendências', divisao: 'Divisão', conferir: 'Conferir reservas' };
const ABA = { reserva: 'painel', divisao: 'painel', hoje: 'painel', conferir: 'painel', mov: 'lancamentos', lancar: '', importar: 'conciliacao', historico: 'config', assinatura: 'config', ia: '' };
function mostra() {
  let [r, a] = (location.hash.slice(1) || 'painel').split('/'); if (r === 'contas') r = a === 'receber' ? 'receber' : 'pagar'; r = ALIAS[r] || r; if (!T[r]) r = 'painel';
  const tela = $('#tela');
  if (falhaCarga) { tela.innerHTML = `<section class="bloco"><h1>Seus dados estão protegidos</h1><p class="erro">${t(falhaCarga)}</p><p class="sub">Para não perder nada, o Arca não grava enquanto isso não for resolvido. Baixe a cópia do que estava guardado e fale com o suporte.</p><button type="button" class="bt cheio" data-acao="copia-bruta">Baixar o que estava guardado</button></section>`; return; }
  tela.innerHTML = T[r](a);
  tela.dataset.tela = r;
  const aba = ABA[r] ?? r;
  document.querySelectorAll('.menu a, .nav-cel a').forEach((l) => { if (l.dataset.aba === aba || (l.dataset.aba === 'receber' && aba === 'pagar' && l.closest('.nav-cel'))) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  const np = N.pendencias(db).length; document.querySelectorAll('[data-aba="painel"] .n').forEach((bd) => { bd.textContent = np; bd.hidden = !np; });
  $('.fab').hidden = r === 'lancar';
  $('#nome-neg').textContent = db.negocio;
  $('#hoje-txt').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase());
  const cs = [...new Set(db.centros)].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  $('#cc-filtro').innerHTML = `<option value="">Todos os centros</option>${cs.map((c) => `<option ${c === ccSel ? 'selected' : ''}>${t(c)}</option>`).join('')}`;
  $('#lista-cc').innerHTML = cs.map((c) => `<option value="${t(c)}"></option>`).join('');
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="faixa-aviso">Assinatura cancelada: você usa até ${dia(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  if (ccSel && ['painel', 'lancamentos', 'receber', 'pagar', 'relatorios', 'reserva'].includes(r)) tela.insertAdjacentHTML('afterbegin', `<p class="faixa-aviso">Mostrando só o centro de custo <b>${t(ccSel)}</b> (os saldos das reservas e o fluxo de caixa são da empresa toda). <button type="button" class="bt pq" data-cc-limpa>Ver todos</button></p>`);
  if (r === 'divisao') somaDiv();
  trava(r);
  document.title = `${NOMES[r] || 'Arca'} · Arca`;
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#importar') && !location.hash.startsWith('#conciliacao')) previa = null; mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Reservas, contas, cobranças e o histórico estão guardados: renove para continuar.</p><div class="linha"><a class="bt cheio" href="#assinatura">Ver a assinatura</a></div></div>`;
  document.body.append(v);
}
function somaDiv() {
  const f = $('#f-div'); if (!f) return;
  const soma = [...f.querySelectorAll('input')].reduce((s, i) => s + (Number(i.value) || 0), 0), ok = soma === 100 && [...f.querySelectorAll('input')].every((i) => Number.isInteger(Number(i.value)) && i.value !== '');
  f.querySelectorAll('input[name]').forEach((i) => { const b = f.querySelector(`[data-barra="${i.name}"]`); if (b) b.style.flex = Number(i.value) || 0.0001; });
  f.querySelector('.soma').innerHTML = ok ? 'Soma: <b>100%</b>. Pode salvar.' : `Soma: <b class="sai">${soma}%</b>. ${soma > 100 ? `Tire ${soma - 100}%` : `Faltam ${100 - soma}%`} para dar 100%.`;
  f.querySelector('button:not([type])').disabled = !ok;
}

// ------------------------------------------------------------------ ações
const ACOES = {
  'salvar-mov': (d, bt) => {
    const r = rascunho; guardaRascunho(); const c = Number(r.valor || 0); if ($('#rec-l')) r.receita = $('#rec-l').checked;
    bt.disabled = true;
    const m = faz(() => N.lancar(db, r.tipo, { c, desc: r.desc, dia: r.dia, pote: r.pote, cat: r.cat, receita: r.receita }, r.chave), (x) => (r.tipo === 'entra' ? `${din(x.c)} dividido nas reservas.` : `${din(x.c)} saiu da reserva ${nomePote(x.pote)}.`));
    if (m && m !== true && r.cc) { m.cc = r.cc; grava(); }
    if (m) { if (r.tipo === 'sai' && N.saldos(db)[r.pote] < 0) aviso(`A reserva ${nomePote(r.pote)} ficou negativa.`, true); rascunho = novoRascunho(r.tipo, r.pote); location.hash = '#painel'; } else bt.disabled = false;
  },
  'editar-mov': (d) => {
    const m = db.movs.find((x) => x.id === d.m); if (!m) return;
    formFolha(`<h2>Editar ${m.tipo === 'entra' ? 'entrada' : m.tipo === 'sai' ? 'saída' : 'movimento'}</h2>${campoValor('v', 'Valor (R$)', m.c)}<label class="campo">Descrição<input name="desc" value="${t(m.desc)}" maxlength="120"></label>${campoData('dia', 'Data', m.dia)}${m.tipo === 'entra' || m.tipo === 'sai' ? campoCC(m.cc) : ''}
      ${m.tipo === 'sai' ? `<label class="campo">Reserva<select name="pote">${opPotes(m.pote)}</select></label><label class="campo">Categoria<select name="cat">${opCats(m.cat)}</select></label>` : ''}${m.tipo === 'transf' ? `<label class="campo">De<select name="de">${opPotes(m.de)}</select></label><label class="campo">Para<select name="para">${opPotes(m.para)}</select></label>` : ''}
      ${m.tipo === 'entra' ? `<label class="check"><input type="checkbox" name="receita" ${m.receita !== false ? 'checked' : ''}> É receita da empresa</label><p class="mini">Se mudar o valor, a divisão nas reservas muda na mesma proporção desta entrada.</p>` : ''}${m.cob ? `<p class="mini">Este valor é recebimento de uma cobrança: não pode passar do que falta receber.</p>` : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const mud = { c: valorC(f.get('v')), desc: String(f.get('desc') || '').trim() || m.desc, dia: diaC(f.get('dia')) }; if (m.tipo === 'entra' || m.tipo === 'sai') mud.cc = ccDe(f);
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
    folha(`<h2>Apagar este movimento?</h2><p class="sub">${t(m.desc)} · ${din(m.c)} · ${dia(m.dia)}. O saldo das reservas é refeito sem ele${m.cob ? ' e a cobrança volta a ficar em aberto' : m.fixa || m.conta ? ' e a conta volta a ficar em aberto' : ''}. Fica registrado no histórico.</p><div class="linha"><button type="button" class="bt cheio perigo" data-sim>Apagar</button><button type="button" class="bt" data-fecha>Manter</button></div>`, (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { fecha(); if (faz(() => N.apagar(db, m.id), 'Movimento apagado. Saldos refeitos.')) location.hash = '#extrato'; }));
  },
  mover: (d) => formFolha(`<h2>Passar dinheiro entre reservas</h2><p class="mini">${t(nomePote(d.de))} tem ${din(N.saldos(db)[d.de])}.</p><label class="campo">Para a reserva<select name="p">${db.potes.filter((p) => p.k !== d.de).map((p) => `<option value="${p.k}">${t(p.nome)}</option>`).join('')}</select></label>${campoValor('v', 'Quanto (R$)')}<label class="campo">Por quê? (opcional)<input name="desc" maxlength="80"></label><button class="bt cheio largo">Passar</button>`, (f) => {
    const c = valorC(f.get('v')); if (c > N.saldos(db)[d.de]) throw new Error(`A reserva ${nomePote(d.de)} só tem ${din(N.saldos(db)[d.de])}.`);
    N.lancar(db, 'transf', { c, de: d.de, para: f.get('p'), desc: f.get('desc') }); return `${din(c)} passou para ${nomePote(f.get('p'))}.`;
  }),
  meta: (d) => { const p = pote(d.k); formFolha(`<h2>Meta da reserva ${t(p.nome)}</h2><p class="mini">Deixe vazio para não ter meta.</p><label class="campo">Meta (R$)<input name="v" inputmode="decimal" value="${p.metaC ? (p.metaC / 100).toFixed(2).replace('.', ',') : ''}"></label><button class="bt cheio largo">Salvar</button>`, (f) => { const v = String(f.get('v') || '').trim(); p.metaC = v ? valorC(v) : 0; return 'Meta salva.'; }); },
  'nova-cob': () => ACOES['editar-cob']({}),
  'editar-cob': (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c);
    formFolha(`<h2>${c ? 'Editar cobrança' : 'Nova cobrança'}</h2><label class="campo">Cliente<input name="cli" required maxlength="80" value="${t(c?.cli || '')}"></label>${campoCC(c?.cc)}<label class="campo">WhatsApp do cliente<input name="tel" inputmode="tel" maxlength="20" value="${t(c?.tel || '')}" placeholder="(31) 99999-0000"></label>${campoValor('v', 'Valor (R$)', c?.c)}<label class="campo">O que foi<input name="desc" maxlength="80" value="${t(c?.desc || '')}" placeholder="Serviço"></label>${campoData('vence', 'Vence em', c?.vence ?? 0)}${c ? '<label class="check"><input type="checkbox" name="cancelar"> Cancelar esta cobrança (não vai mais receber)</label>' : ''}<button class="bt cheio largo">${c ? 'Salvar' : 'Criar cobrança'}</button>`, (f) => {
      const cli = String(f.get('cli') || '').trim(); if (!cli) throw new Error('Diga quem vai pagar.');
      const tel = String(f.get('tel') || '').replace(/\D/g, ''); if (tel && (tel.length < 10 || tel.length > 13)) throw new Error('WhatsApp com DDD, ex.: (31) 99999-0000.');
      const novo = { cli, tel, c: valorC(f.get('v')), desc: String(f.get('desc') || '').trim() || 'Serviço', vence: diaC(f.get('vence')), cc: ccDe(f) };
      if (c) { if (novo.c < N.recebido(db, c)) throw new Error(`Já foram recebidos ${din(N.recebido(db, c))}; o valor não pode ser menor.`); Object.assign(c, novo); if (f.get('cancelar')) c.status = 'cancelada'; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `${f.get('cancelar') ? 'Cancelou' : 'Editou'} a cobrança de ${cli} (${din(novo.c)})` }); return 'Cobrança salva.'; }
      db.cobrancas.push({ id: nid(), ...novo, status: 'aberta', avisos: [], criada: 0 }); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Criou cobrança de ${din(novo.c)} para ${cli}` });
      return 'Cobrança criada. Toque em Cobrar para mandar o PIX pelo WhatsApp.';
    });
  },
  cobrar: async (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c); if (!s.falta) return;
    if (!db.pix) { aviso('Cadastre a chave PIX da empresa em Configurações.', true); location.hash = '#config'; return; }
    const [{ pixCopiaECola }, { qrSVG }] = await Promise.all([import('../base/pix.js'), import('../base/qr.js')]);
    const pix = pixCopiaECola({ chave: db.pix, nome: db.negocio || db.dono, cidade: db.cidade || 'BRASIL', valor: s.falta / 100, txid: c.id.replace(/[^A-Za-z0-9]/g, '').slice(-20) });
    const msg = `Oi, ${c.cli.split(' ')[0]}! ${s.st === 'atrasada' ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${din(s.falta)} (${c.desc})${s.st === 'atrasada' ? `, que venceu ${dia(c.vence)}` : c.vence > 0 ? `, com vencimento ${dia(c.vence)}` : ''}.\n\nPIX copia e cola:\n${pix}\n\nObrigada!`;
    folha(`<h2>Cobrar ${t(c.cli)}</h2><p class="sub">${din(s.falta)} · ${t(c.desc)}</p><div class="qr-pix">${qrSVG(pix, 200)}</div><label class="campo">PIX copia e cola<textarea readonly rows="3">${t(pix)}</textarea></label>
      <div class="linha"><a class="bt cheio" target="_blank" rel="noopener" data-enviou href="${zap(c.tel, msg)}">Mandar no WhatsApp</a><button type="button" class="bt" data-copiar>Copiar PIX</button></div><p class="mini">O WhatsApp abre com a mensagem pronta; você confere e envia. O app registra que você lembrou hoje.</p>`, (f) => {
      f.querySelector('[data-copiar]').addEventListener('click', () => navigator.clipboard?.writeText(pix).then(() => aviso('PIX copiado.'), () => aviso('Copie o texto acima.', true)));
      f.querySelector('[data-enviou]').addEventListener('click', () => { if (!(c.avisos ||= []).includes(0)) c.avisos.push(0); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Lembrou ${c.cli} de ${din(s.falta)} pelo WhatsApp` }); grava(); setTimeout(mostra, 300); });
    });
  },
  receber: (d) => { const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c); formFolha(`<h2>Recebi de ${t(c.cli)}</h2><p class="mini">Falta receber ${din(s.falta)}. Recebeu só uma parte? Digite o valor que entrou.</p>${campoValor('v', 'Valor recebido (R$)', s.falta)}<button class="bt cheio largo">Guardar recebimento</button>`, (f) => { const m = N.receber(db, c.id, valorC(f.get('v')), `rec:${c.id}:${N.recebido(db, c)}`); if (!m) throw new Error('Esse recebimento já foi lançado.'); return `${din(m.c)} recebido e dividido nas reservas.`; }); },
  'pagar-fixa': (d) => { const f0 = db.fixas.find((x) => x.id === d.f), comp = d.comp || N.situacaoFixa(db, f0).comp, falta = Math.max(0, f0.c - N.pagoFixa(db, f0, comp)); formFolha(`<h2>Paguei: ${t(f0.desc)}</h2><p class="mini">${t(N.rotuloComp(f0, comp))} · sai da reserva ${t(nomePote(f0.pote))} (${din(N.saldos(db)[f0.pote])}). Pagou com juros ou desconto? Digite o valor que pagou de verdade.</p>${campoValor('v', 'Valor pago (R$)', falta || f0.c)}<button class="bt cheio largo">Guardar pagamento</button>`, (f) => { const m = N.pagarFixa(db, f0.id, valorC(f.get('v')), new Date(), comp); if (!m) throw new Error('Este período já está pago.'); return `${din(m.c)} pago. Saiu da reserva ${nomePote(m.pote)}.`; }); },
  'editar-fixa': (d) => {
    const f0 = db.fixas.find((x) => x.id === d.f);
    formFolha(`<h2>${f0 ? 'Editar conta fixa' : d.das ? 'Cadastrar o DAS' : 'Nova conta fixa'}</h2><label class="campo">O que é<input name="desc" required maxlength="60" value="${t(f0?.desc || (d.das ? 'DAS do MEI' : ''))}"></label>${campoValor('v', 'Valor de cada vez (R$)', f0?.c)}${campoCC(f0?.cc)}<label class="campo">Repete<select name="freq" data-freq>${Object.entries(N.FREQS).map(([k, n]) => `<option value="${k}" ${(f0?.freq || 'mensal') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="campo" data-so="mensal anual">Dia do vencimento<input name="dia" type="number" min="1" max="31" value="${f0?.dia || (d.das ? 20 : 10)}"></label><label class="campo" data-so="anual">Mês do vencimento<select name="mes">${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].map((m, i) => `<option value="${i + 1}" ${(f0?.mes || 1) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="campo" data-so="semanal">Dia da semana<select name="dow">${N.DIAS_SEMANA.map((n, i) => `<option value="${i}" ${(f0?.dow ?? 1) === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label><p class="mini">Dia 31 em mês mais curto vence no último dia do mês.</p><label class="campo">Sai da reserva<select name="pote">${opPotes(f0?.pote || (d.das ? 'imposto' : 'contas'))}</select></label>${f0 ? `<label class="check"><input type="checkbox" name="pausar" ${f0.ativa === false ? 'checked' : ''}> Pausar (não vence mais até reativar)</label><label class="check"><input type="checkbox" name="excluir"> Excluir (os pagamentos já feitos continuam no extrato)</label>` : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const freq = N.FREQS[f.get('freq')] ? f.get('freq') : 'mensal', dd = freq === 'semanal' ? 1 : Number(f.get('dia')); if (!Number.isInteger(dd) || dd < 1 || dd > 31) throw new Error('Dia de vencimento entre 1 e 31.');
      const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error('Diga o que é a conta.');
      const novo = { desc, c: valorC(f.get('v')), dia: dd, pote: f.get('pote'), freq, cc: ccDe(f) };
      if (freq === 'anual') novo.mes = Math.min(12, Math.max(1, Number(f.get('mes')) || 1)); if (freq === 'semanal') novo.dow = Math.min(6, Math.max(0, Number(f.get('dow')) || 0));
      if (f0) { if (f.get('excluir')) { db.fixas = db.fixas.filter((x) => x !== f0); return 'Conta fixa excluída. Os pagamentos antigos ficam no extrato.'; } Object.assign(f0, novo, { ativa: !f.get('pausar') }); return 'Conta fixa salva.'; }
      db.fixas.push({ id: nid(), ...novo, cat: d.das ? 'Impostos' : N.categoriaSugerida(desc) || 'Contas fixas', das: !!d.das, ativa: true, desde: freq === 'mensal' ? N.hojeISO().slice(0, 7) : N.hojeISO() }); return `Conta fixa criada. Ela vence ${N.descFreq(novo)}.`;
    });
  },
  'editar-conta': (d) => {
    const c = db.contas.find((x) => x.id === d.c);
    formFolha(`<h2>${c ? 'Editar conta' : 'Nova conta a pagar'}</h2><label class="campo">O que é<input name="desc" required maxlength="80" value="${t(c?.desc || '')}"></label>${campoValor('v', 'Valor (R$)', c?.c)}${campoData('vence', 'Vence em', c?.vence ?? 7)}${campoCC(c?.cc)}<label class="campo">Vai sair da reserva<select name="pote">${opPotes(c?.pote || 'contas')}</select></label><label class="campo">Categoria<select name="cat">${opCats(c?.cat || 'Outros')}</select></label>${c ? '<label class="check"><input type="checkbox" name="cancelar"> Cancelar (não vai mais pagar)</label>' : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error('Diga o que é a conta.');
      const novo = { desc, c: valorC(f.get('v')), vence: diaC(f.get('vence')), pote: f.get('pote'), cat: f.get('cat'), cc: ccDe(f) };
      if (c) { if (novo.c < N.pagoConta(db, c)) throw new Error(`Já foram pagos ${din(N.pagoConta(db, c))}; o valor não pode ser menor.`); Object.assign(c, novo); if (f.get('cancelar')) c.status = 'cancelada'; return 'Conta salva.'; }
      db.contas.push({ id: nid(), ...novo, status: 'aberta' }); return 'Conta a pagar criada.';
    });
  },
  'pagar-conta': (d) => { const c = db.contas.find((x) => x.id === d.c), s = N.situacaoConta(db, c); formFolha(`<h2>Paguei: ${t(c.desc)}</h2><p class="mini">Falta ${din(s.falta)}. Sai da reserva ${t(nomePote(c.pote))} (${din(N.saldos(db)[c.pote])}).</p>${campoValor('v', 'Valor pago (R$)', s.falta)}<button class="bt cheio largo">Guardar pagamento</button>`, (f) => { const m = N.pagarConta(db, c.id, valorC(f.get('v')), `pag:${c.id}:${N.pagoConta(db, c)}`); if (!m) throw new Error('Esse pagamento já foi lançado.'); return `${din(m.c)} pago.`; }); },
  dasn: () => { const f = N.faturamentoAno(db); folha(`<h2>Resumo para a declaração anual</h2><div class="cartao"><p>Receita bruta do ano até hoje: <b class="num">${din(f.total)}</b></p><p class="mini">${din(f.antes)} informado antes de usar o app + ${din(f.app)} de entradas marcadas como receita.</p></div><p class="mini">Isto é uma estimativa para ajudar, não a declaração oficial. A DASN-SIMEI separa receita de comércio/indústria e de serviços e pergunta se você teve empregado: confira com seus comprovantes no site do Simples Nacional até 31 de maio.</p><button type="button" class="bt cheio largo" data-fecha>Entendi</button>`); },
  recibo: (d) => {
    const m = d?.m ? db.movs.find((x) => x.id === d.m) : null;
    formFolha(`<h2>Recibo</h2><label class="campo">Recebi de<input name="c" value="${t(m?.cli || '')}" required maxlength="80"></label>${campoValor('v', 'Valor (R$)', m?.c)}<label class="campo">Referente a<input name="r" value="${t(m?.desc || '')}" required maxlength="120"></label><button class="bt cheio largo">Gerar recibo</button>`, (f) => {
      const cli = String(f.get('c') || '').trim(), ref = String(f.get('r') || '').trim(); if (!cli || !ref) throw new Error('Preencha quem pagou e a que se refere.');
      const r = { id: nid(), num: ++db.reciboSeq, cli, c: valorC(f.get('v')), ref, dia: 0, mov: m?.id }; db.recibos.push(r); grava(); setTimeout(() => verRecibo(r), 50); return false;
    });
  },
  'ver-recibo': (d) => { const r = db.recibos.find((x) => x.id === d.r); if (r) verRecibo(r); },
  exportar: () => { baixa(`arca-lancamentos-${N.hojeISO()}.csv`, N.extratoCSV(db), 'text/csv;charset=utf-8'); aviso('Extrato baixado.'); },
  copia: () => { baixa(`arca-copia-${N.hojeISO()}.json`, JSON.stringify(db, null, 1), 'application/json'); db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: 'Baixou uma cópia de segurança' }); grava(); },
  'copia-bruta': () => { let txt = ''; try { txt = localStorage.getItem(CHAVE) || ''; } catch { /* */ } baixa(`arca-guardado-${N.hojeISO()}.json`, txt, 'application/json'); },
  'voltar-copia': () => {
    let k = `${CHAVE}-antes-de-restaurar:${CONTA}`, txt = null; try { txt = localStorage.getItem(k) || localStorage.getItem((k = `${CHAVE}-copia-formato1:${CONTA}`)); } catch { /* */ }
    if (!txt) return aviso('Não há versão anterior guardada.', true);
    folha(`<h2>Voltar a versão anterior?</h2><p class="sub">Os dados atuais são trocados pela versão guardada neste aparelho ${k.includes('formato1') ? '(de antes da atualização do app)' : '(de antes da última restauração)'}. Baixe uma cópia dos atuais antes, por segurança.</p><div class="linha"><button type="button" class="bt cheio perigo" data-sim>Voltar</button><button type="button" class="bt" data-fecha>Cancelar</button></div>`, (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { fecha(); restaura(txt, 'versão anterior'); }));
  },
  'cancelar-imp': () => { previa = null; },
  'div-extrato': (d) => { const x = db.migracao.divergencias.find((y) => y.pote === d.p); x.resolvida = 'extrato'; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Conferiu a reserva ${x.nome}: valem os lançamentos` }); grava(); mostra(); },
  'div-acerto': (d) => { const x = db.migracao.divergencias.find((y) => y.pote === d.p), dif = x.gravado - x.calculado; if (faz(() => N.lancar(db, 'ajuste', { c: Math.abs(dif), pote: x.pote, sinal: dif < 0 ? -1 : 1, desc: 'Acerto de saldo (conferido após a atualização)' }), 'Acerto lançado no extrato.')) { x.resolvida = 'acerto'; grava(); mostra(); } },
  equipe: () => document.querySelector('[data-vc="equipe"]')?.click(),
  convidar: () => formFolha(`<h2>Convidar para a equipe</h2><label class="campo">Nome<input name="n" required maxlength="60"></label><label class="campo">E-mail ou WhatsApp<input name="c" required maxlength="80"></label><label class="campo">Acesso<select name="a"><option value="ver">Só ver (contador, sócio)</option><option value="mexer">Ver e mexer</option></select></label><button class="bt cheio largo">Enviar convite</button>`, (f) => {
    const nome = String(f.get('n') || '').trim(), c = String(f.get('c') || '').trim();
    if (!nome) throw new Error('Digite o nome.'); if (!/^\S+@\S+\.\S+$/.test(c) && c.replace(/\D/g, '').length < 10) throw new Error('Digite um e-mail ou um WhatsApp com DDD.');
    if (equipeDemo().some((p) => p.contato.toLowerCase() === c.toLowerCase())) throw new Error('Essa pessoa já está na equipe.');
    db.equipe.push({ id: `eq${Date.now().toString(36)}`, nome: nome.slice(0, 60), contato: c.slice(0, 80), acesso: f.get('a') === 'mexer' ? 'mexer' : 'ver', st: 'convidado' });
    return `Convite enviado para ${nome} (simulado na demonstração).`;
  }),
  'tira-pessoa': (d) => { const p = equipeDemo().find((x) => x.id === d.id); db.equipe = equipeDemo().filter((x) => x !== p); grava(); mostra(); aviso(`${p.nome} saiu da equipe.`); },
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor * 100)}</h2><p class="sub">Demonstração: nenhum pagamento de verdade acontece aqui.</p><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); aviso('Pagamento simulado aprovado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa até ${dia(db.assinatura.proxima)} e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
};
function verRecibo(r) {
  const txt = `Recibo nº ${r.num}. Recebi de ${r.cli} a quantia de ${din(r.c)}, referente a ${r.ref}. ${db.negocio}${db.cnpj ? ` · CNPJ ${db.cnpj}` : ''} · ${N.dataDe(r.dia).toLocaleDateString('pt-BR')}`;
  folha(`<h2>Recibo nº ${r.num}</h2><div class="recibo"><h3>Recibo nº ${r.num} · ${din(r.c)}</h3><p>${t(txt)}</p><p style="margin-top:28px;border-top:1px solid #999;padding-top:4px;width:70%">${t(db.dono)}</p></div><div class="linha"><a class="bt cheio" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar no WhatsApp</a><button type="button" class="bt" onclick="print()">Imprimir ou PDF</button><button type="button" class="bt" data-fecha>Fechar</button></div>`);
}
function restaura(txt, origem) {
  let d; try { d = JSON.parse(txt); } catch { return aviso('Esse arquivo não é uma cópia do Arca (nem do antigo Veltria Financeiro).', true); }
  try { d = parece2(d) ? arruma(d) : arruma(N.migrar(d)); } catch (e) { return aviso(`Cópia inválida: ${e.message}`, true); }
  if (!Array.isArray(d.potes) || !d.potes.length || !Array.isArray(d.movs) || d.movs.some((m) => !Number.isInteger(m.c) || m.c <= 0)) return aviso('A cópia está incompleta ou com valores inválidos. Nada foi alterado.', true);
  try { localStorage.setItem(`${CHAVE}-antes-de-restaurar:${CONTA}`, JSON.stringify(db)); } catch { return aviso('Sem espaço para guardar os dados atuais antes de restaurar. Nada foi alterado.', true); }
  db = d; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Restaurou ${origem}` }); grava(); location.hash = '#painel'; mostra(); aviso('Dados restaurados. Os anteriores ficaram guardados neste aparelho.');
}

document.addEventListener('click', (e) => {
  const el = e.target;
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) { if (ac.tagName === 'A' && ac.dataset.acao !== 'cancelar-imp') e.preventDefault(); ACOES[ac.dataset.acao](ac.dataset, ac); return; }
  const ir = el.closest('[data-ir]'); if (ir) { if (ir.dataset.ir === 'lancar') rascunho = rascunho?.valor ? rascunho : novoRascunho(rascunho?.tipo, rascunho?.pote); location.hash = `#${ir.dataset.ir}`; return; }
  const guarda = guardaRascunho;
  const tc = el.closest('[data-tecla]'); if (tc) { guarda(); const k = tc.dataset.tecla; rascunho.valor = k === '⌫' ? rascunho.valor.slice(0, -1) : (rascunho.valor + k).replace(/^0+/, '').slice(0, 9); mostra(); return; }
  const tp = el.closest('[data-tipo]'); if (tp) { guarda(); rascunho.tipo = tp.dataset.tipo; mostra(); return; }
  const ps = el.closest('[data-pote-sai]'); if (ps) { guarda(); rascunho.pote = ps.dataset.poteSai; mostra(); return; }
  const dl = el.closest('[data-dia-l]'); if (dl) { guarda(); rascunho.dia = Number(dl.dataset.diaL); mostra(); return; }
  const ab = el.closest('[data-aba-c]'); if (ab) { location.hash = `#${ab.dataset.abaC}`; return; }
  const pr = el.closest('[data-per]'); if (pr) { filtro.per = pr.dataset.per; mostra(); return; }
  const ft = el.closest('[data-ftipo]'); if (ft) { filtro.tipo = ft.dataset.ftipo; mostra(); return; }
  const lc = el.closest('[data-lancar]'); if (lc) { rascunho = novoRascunho(lc.dataset.lancar, rascunho?.pote); location.hash = '#lancar'; mostra(); return; }
  const ps2 = el.closest('[data-passo]'); if (ps2) { const i = $(`#f-div input[name="${ps2.dataset.k}"]`); i.value = Math.max(0, Math.min(100, (Number(i.value) || 0) + Number(ps2.dataset.passo))); somaDiv(); return; }
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
    grava(); location.hash = '#painel'; aviso('Divisão salva. Vale para as próximas entradas.'); return;
  }
  if (e.target.id === 'f-imp') {
    e.preventDefault(); const f = new FormData(e.target), linhas = previa.linhas.map((l, i) => ({ ...l, incluir: !!f.get(`l${i}`) }));
    if (N.validarPcts(db.potes) && linhas.some((l) => l.incluir && l.tipo === 'entra')) return aviso(N.validarPcts(db.potes), true);
    try { const feitos = N.importar(db, linhas, { pote: f.get('pote'), receita: !!f.get('receita'), arquivo: previa.arquivo }); previa = null; grava(); location.hash = '#lancamentos'; aviso(`${feitos.length} lançamento(s) importado(s).`); } catch (x) { aviso(x.message, true); }
    return;
  }
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-12); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((x) => { resp.t = x; grava(); mostra(); }); scrollTo(0, document.body.scrollHeight);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.cfg) { db[el.dataset.cfg] = el.value.trim().slice(0, 80); grava(); mostra(); aviso('Salvo.'); }
  if ('cfgAviso' in el.dataset) { const n = Number(el.value); if (!Number.isInteger(n) || n < 0 || n > 30) return aviso('Use de 0 a 30 dias.', true); db.avisoDias = n; grava(); mostra(); aviso('Antecedência dos avisos salva.'); }
  if ('freq' in el.dataset) mostraFreq(el.form);
  if ('cfgFat' in el.dataset) { const c = N.centavos(el.value || '0'); if (!Number.isInteger(c) || c < 0) return aviso('Valor inválido.', true); db.fatInicial = { ano: new Date().getFullYear(), c }; grava(); mostra(); aviso('Faturamento salvo.'); }
  if (el.id === 'dia-l' && el.value) { const d = N.diaDe(el.value); if (!Number.isFinite(d) || d > 0) return aviso('Escolha hoje ou uma data passada.', true); guardaRascunho(); rascunho.dia = d; mostra(); }
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
$('#recomecar').addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch { /* */ } db = semente(); rascunho = null; location.hash = '#painel'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
try { if (!localStorage.getItem(CHAVE) && !somenteLeitura) grava(); } catch { /* sem acesso ao armazenamento */ }

// ------------------------------------------------------------------ ganchos das telas do Arca
function guardaRascunho() {
  if (!rascunho) return;
  if ($('#desc-l')) rascunho.desc = $('#desc-l').value.trim();
  if ($('#cat-l')) rascunho.cat = $('#cat-l').value;
  if ($('#rec-l')) rascunho.receita = $('#rec-l').checked;
  if ($('#pote-l')) rascunho.pote = $('#pote-l').value;
  if ($('#cc-l')) rascunho.cc = $('#cc-l').value.trim().slice(0, 40);
  if ($('#valor-l')) { const c = N.centavos($('#valor-l').value || ''); rascunho.valor = Number.isInteger(c) && c > 0 ? String(c) : ''; }
}
function atualizaLancar() {
  // digitar o valor não redesenha a tela (o cursor fica no lugar): só a prévia da divisão e o botão
  guardaRascunho(); const c = Number(rascunho.valor || 0), bt = document.querySelector('[data-acao="salvar-mov"]');
  const pv = $('#prev-div'); if (pv) pv.innerHTML = prevDivisao(rascunho, c);
  if (bt) { bt.textContent = `Guardar ${din(c)}`; bt.disabled = !c || (rascunho.tipo === 'entra' && !!N.validarPcts(db.potes)); }
}
ACOES.procurar = () => { location.hash = '#lancamentos'; setTimeout(() => $('#busca')?.focus(), 30); };
document.addEventListener('click', (e) => {
  const hz = e.target.closest('[data-hz]'); if (hz) { horizonte = Number(hz.dataset.hz) || 30; mostra(); return; }
  if (e.target.closest('[data-cc-limpa]')) { ccSel = ''; mostra(); return; }
  const sc = e.target.closest('[data-sel-cob]'); if (sc && !e.target.closest('button, a')) { selCob = sc.dataset.selCob; document.querySelectorAll('[data-sel-cob]').forEach((r) => { const s = r === sc; r.classList.toggle('sel', s); r.setAttribute('aria-pressed', s); }); $('#det-cob').innerHTML = detalheCob(selCob); if (innerWidth < 1100) $('#det-cob').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
document.addEventListener('input', (e) => { if (e.target.id === 'valor-l' || e.target.id === 'pote-l') atualizaLancar(); });
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'cc-filtro') { ccSel = el.value; mostra(); }
  if (el.id === 'pote-l') atualizaLancar();
  if (el.id === 'valor-l') { guardaRascunho(); if (rascunho.valor) el.value = (Number(rascunho.valor) / 100).toFixed(2).replace('.', ','); }
  if ('cfgRegime' in el.dataset && REGIMES[el.value]) { db.regime = el.value; db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque: `Mudou o regime para ${REGIMES[el.value]}` }); grava(); mostra(); aviso('Regime salvo.'); }
  if ('cfgCentros' in el.dataset) { db.centros = [...new Set(el.value.split('\n').map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 60); grava(); mostra(); aviso('Centros de custo salvos.'); }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ACOES.procurar(); }
  if (e.key === 'Enter' && e.target.id === 'valor-l') { e.preventDefault(); $('#desc-l')?.focus(); }
});
mostra();

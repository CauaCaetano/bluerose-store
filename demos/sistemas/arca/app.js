// Arca · sistema financeiro para empresas (pequena, média e grande), feito para o computador e com versão de celular
// para consultar e aprovar. Várias empresas (CNPJs) e contas bancárias, pagar e receber com aprovação por alçada,
// cobrança com Pix e régua, plano de contas, rateio, conciliação com regras, fluxo e orçamento, DRE/DFC, indicadores,
// impostos por regime, equipe com perfis, auditoria e fechamento do mês.
// Regras do dinheiro: nucleo.js (núcleo testado do antigo Financeiro Essencial: centavos, saldo do extrato, migração,
// importação) + empresa.js (o que é de empresa grande). Aqui ficam as telas. Dados de exemplo neste aparelho (?novo recomeça).
// Com conta (?conta=financeiroessencial), conta-nuvem.js leva os dados para a nuvem: o identificador, a chave dos dados e os
// nomes dos campos continuam os do Financeiro Essencial (quem já assina não perde nada; o que é novo entra com valor padrão).

import * as N0 from './nucleo.js';
import * as E from './empresa.js';

const CONTA = new URLSearchParams(location.search).get('conta') || 'demo';
const DEMO = CONTA === 'demo';
const CHAVE = DEMO ? 'arca-demo-v2' : 'veltria-financeiro-essencial-v1';
const EXEMPLO = 3; // suba quando o exemplo da demonstração mudar
const din = N0.reais;
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const dia = (o) => o === 0 ? 'hoje' : o === -1 ? 'ontem' : o === 1 ? 'amanhã' : N0.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const dataC = (o) => N0.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dataM = (o) => N0.dataDe(o).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const zap = (tel, m) => `https://wa.me/${tel ? '55' + String(tel).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : ''}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);
const CORES = { imposto: '#773c45', contas: '#17243a', salario: '#8a6d3b', reserva: '#4f6378', livre: '#b49a6c' };
const cor = (k) => CORES[k] || '#7d8594';
const PCTS_PADRAO = { imposto: 12, contas: 55, salario: 18, reserva: 8, livre: 7 };
const REGIMES = { mei: 'MEI', simples: 'Simples Nacional', presumido: 'Lucro Presumido', real: 'Lucro Real' };
const CC_PADRAO = ['Comercial', 'Logística', 'Administrativo', 'Fiscal', 'Filial Contagem', 'Frota', 'Fazenda Unaí'];

// O núcleo com a trava do mês fechado: nada entra, muda ou sai num mês que o dono fechou.
const N = {
  ...N0,
  lancar: (db, tipo, dados, chave) => { E.exigeAberto(db, Number.isInteger(dados.dia) ? dados.dia : 0); const m = N0.lancar(db, tipo, dados, chave); if (m) carimba(m); return m; },
  editar: (db, id, mud) => { const m = db.movs.find((x) => x.id === id); E.exigeAberto(db, m?.dia, mud.dia); return N0.editar(db, id, mud); },
  apagar: (db, id) => { const m = db.movs.find((x) => x.id === id); E.exigeAberto(db, m?.dia); return N0.apagar(db, id); },
  importar: (db, linhas, op) => { E.exigeAberto(db, ...linhas.filter((l) => !l.duplicada && l.incluir !== false).map((l) => l.dia)); const r = N0.importar(db, linhas, op); r.forEach(carimba); return r; },
  receber: (...a) => carimba(N0.receber(...a)), pagarConta: (...a) => carimba(N0.pagarConta(...a)), pagarFixa: (...a) => carimba(N0.pagarFixa(...a)),
};
function carimba(m) { if (m && m !== true && typeof m === 'object' && usuarioAtual && !m.por) m.por = usuarioAtual.id; return m; }
let usuarioAtual = null;
const INICIO = new Date(Date.now() - 1000).toISOString(); // o histórico antigo (sem autor) não ganha autor errado

// ------------------------------------------------------------------ dados: carregar, migrar com cópia, gravar
/** Gerador previsível (o exemplo sai igual toda vez). */
function sorteio(semente0) { let s = semente0; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
function semente() {
  const potes = [['imposto', 'Impostos', 12, 90000000], ['contas', 'Fornecedores e contas', 55, 300000000], ['salario', 'Folha e pró-labore', 18, 90000000], ['reserva', 'Reserva de emergência', 8, 150000000], ['livre', 'Livre', 7, 0]].map(([k, nome, pct, metaC]) => ({ k, nome, pct, metaC }));
  const db = { formato: N0.FORMATO, exemplo: EXEMPLO, negocio: 'Grupo Vale Norte', dono: 'Renata Albuquerque', pix: 'financeiro@valenorte.com.br', cidade: 'Belo Horizonte', cnpj: '28.417.903/0001-62', regime: 'presumido', centros: [...CC_PADRAO],
    potes, movs: [], cobrancas: [], contas: [], fixas: [], recibos: [], reciboSeq: 1040, historico: [], fatInicial: { ano: new Date().getFullYear(), c: 1784000000 }, avisoDias: 3,
    assinatura: { valor: 59, status: 'ativa', renova: true, proxima: 17, pagos: [-13, -43, -74] }, conversa: [],
    equipe: [{ id: 'eq1', nome: 'Marcos Teixeira (contador)', contato: 'marcos@contabiltex.com.br', acesso: 'ver', st: 'ativo' }, { id: 'eq2', nome: 'Paula Rezende (tesouraria)', contato: '(31) 98810-2231', acesso: 'mexer', st: 'ativo' }],
    empresas: [{ id: 'e1', nome: 'Vale Norte Distribuidora', cnpj: '28.417.903/0001-62', regime: 'presumido' }, { id: 'e2', nome: 'Vale Norte Transportes', cnpj: '31.552.118/0001-07', regime: 'simples' }, { id: 'e3', nome: 'Vale Norte Agro', cnpj: '35.904.611/0001-90', regime: 'real' }],
    bancos: [{ id: 'b1', nome: 'Itaú · movimento', banco: 'Itaú', ag: '0412', num: '33871-2', emp: 'e1', tipo: 'corrente' }, { id: 'b2', nome: 'Banco do Brasil · cobrança', banco: 'Banco do Brasil', ag: '3307-1', num: '41220-8', emp: 'e1', tipo: 'corrente' },
      { id: 'b5', nome: 'CDB Itaú · reserva', banco: 'Itaú', ag: '0412', num: '33871-2', emp: 'e1', tipo: 'aplicacao' }, { id: 'b3', nome: 'Sicoob · Transportes', banco: 'Sicoob', ag: '3021', num: '18877-0', emp: 'e2', tipo: 'corrente' }, { id: 'b4', nome: 'Bradesco · Agro', banco: 'Bradesco', ag: '2290', num: '7781-4', emp: 'e3', tipo: 'corrente' }],
    usuarios: [{ id: 'u1', nome: 'Renata Albuquerque', perfil: 'dono', contato: 'renata@valenorte.com.br' }, { id: 'u2', nome: 'Paula Rezende', perfil: 'financeiro', contato: 'paula@valenorte.com.br' }, { id: 'u3', nome: 'Diego Martins', perfil: 'aprovador', contato: 'diego@valenorte.com.br' }, { id: 'u4', nome: 'Marcos Teixeira', perfil: 'contador', contato: 'marcos@contabiltex.com.br' }],
    alcada: { limite: 2000000 }, projetos: ['Expansão do CD Contagem', 'Safra 2026/27'],
    regras: [{ id: 'r1', contem: 'TARIFA', cat: 'Tarifas bancárias', cc: 'Administrativo', tipo: 'sai' }, { id: 'r2', contem: 'IOF', cat: 'Juros e multas', cc: 'Administrativo', tipo: 'sai' }, { id: 'r3', contem: 'RENDIMENTO', cat: 'Receitas financeiras', cc: '', tipo: 'entra' }],
    orcamento: { cat: { 'Fornecedores e mercadorias': 230000000, 'Fretes e logística': 7000000, 'Folha de pagamento': 46000000, 'Aluguel e espaço': 6200000, 'Marketing': 1200000, 'Manutenção': 9000000, 'Tarifas bancárias': 120000, 'Contas fixas': 2400000, 'Serviços de terceiros': 900000 },
      cc: { Comercial: 210000000, Logística: 27000000, Administrativo: 68000000, Frota: 21000000 } },
    filtros: [{ id: 'f1', nome: 'Fornecedores da Distribuidora (90 dias)', f: { busca: '', tipo: 'sai', per: '90', cat: 'Fornecedores e mercadorias', emp: 'e1', tag: '' } }, { id: 'f2', nome: 'Safra (projeto)', f: { busca: 'safra', tipo: '', per: 'tudo', cat: '', emp: '', tag: '' } }] };
  E.garantir(db);
  db.plano.push({ id: 'pcx1', nome: 'Combustível e frota', grupo: 'custo', pai: '' }, { id: 'pcx2', nome: 'Diesel', grupo: 'custo', pai: 'pcx1' }, { id: 'pcx3', nome: 'Pneus e peças', grupo: 'custo', pai: 'pcx1' }, { id: 'pcx4', nome: 'IRPJ e CSLL', grupo: 'ir', pai: '' });
  db.plano = db.plano.filter((p, i, l) => l.findIndex((q) => q.nome === p.nome) === i);
  const R = sorteio(20261119), entre = (a, b) => Math.round(a + R() * (b - a)), cent = (reaisMin, reaisMax) => entre(reaisMin, reaisMax) * 100;
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const L = (tipo, c, desc, d, extra = {}) => { const m = N0.lancar(db, tipo, { c, desc, dia: d, ...extra }); ['cc', 'banco', 'emp', 'cat', 'rat', 'tags', 'proj', 'cli'].forEach((k) => { if (extra[k] !== undefined) m[k] = extra[k]; }); m.por = extra.por || 'u2'; return m; };
  // saldos de abertura (há ~3 meses), um por conta
  [['b1', 61000000], ['b2', 22000000], ['b5', 90000000], ['b3', 9500000], ['b4', 31000000]].forEach(([b, c]) => L('entra', c, `Saldo de abertura · ${db.bancos.find((x) => x.id === b).nome}`, -96, { receita: false, banco: b, emp: db.bancos.find((x) => x.id === b).emp, cat: 'Outras entradas', por: 'u1' }));
  // vendas e serviços (realizado)
  const CLI1 = ['Supermercados São Pedro', 'Atacado Regional', 'AgroNorte', 'Rede Bom Lar', 'Terra Forte', 'Mercantil Serra Azul', 'Agromax', 'AgroSul', 'Vale Agro', 'Campo Verde Insumos'];
  let nf = 12200;
  for (let d = -94; d <= 0; d++) {
    const dw = N0.dataDe(d).getDay(); if (dw === 0 || dw === 6) continue;
    if (dw === 1 || dw === 3 || dw === 5) { const cli = CLI1[entre(0, CLI1.length - 1)], cc = R() < 0.25 ? 'Filial Contagem' : 'Comercial'; L('entra', cent(70000, 260000), `Recebimento NF ${nf += entre(4, 19)} · ${cli}`, d, { cc, banco: R() < 0.3 ? 'b2' : 'b1', emp: 'e1', cat: 'Receita de vendas', cli, receita: true }); }
    if (dw === 2) L('entra', cent(28000, 61000), `Fretes faturados · CT-e ${nf - 9000} · ${['Laticínios Serrano', 'Grão Fino Alimentos', 'Distribuidora Vale Norte'][entre(0, 2)]}`, d, { cc: 'Frota', banco: 'b3', emp: 'e2', cat: 'Receita de serviços', receita: true });
    if (d % 13 === 0) L('entra', cent(140000, 380000), `Venda de insumos · NF ${nf += 3} · Fazenda ${['Boa Vista', 'Santa Luzia', 'Três Barras'][entre(0, 2)]}`, d, { cc: 'Fazenda Unaí', banco: 'b4', emp: 'e3', cat: 'Receita de vendas', receita: true, proj: 'Safra 2026/27', tags: ['safra'] });
    if (dw === 4 && d < -2) L('sai', cent(52000, 165000), `${['AutoPeças SP', 'Metamaq', 'Laticínios Serrano', 'Grão Fino Alimentos', 'Cooperativa Sul'][entre(0, 4)]} · pedido ${8700 + Math.abs(d) * 3}`, d, { pote: 'contas', cat: 'Fornecedores e mercadorias', cc: 'Comercial', banco: 'b1', emp: 'e1' });
    if (dw === 2 && d < -2) L('sai', cent(4200, 12800), `Transportadora Rota Sul · fretes CT-e ${4000 + Math.abs(d)}`, d, { pote: 'contas', cat: 'Fretes e logística', cc: 'Logística', banco: 'b1', emp: 'e1' });
    if (dw === 5 && d < -2) L('sai', cent(9000, 21000), `Posto Rodovia · diesel da frota`, d, { pote: 'contas', cat: 'Diesel', cc: 'Frota', banco: 'b3', emp: 'e2' });
    if (d % 17 === 0 && d < -3) L('sai', cent(60000, 140000), `Sementes e defensivos · Agro Insumos Brasil`, d, { pote: 'contas', cat: 'Material e produtos', cc: 'Fazenda Unaí', banco: 'b4', emp: 'e3', proj: 'Safra 2026/27', tags: ['safra'] });
  }
  // fixas por empresa e o histórico de pagamentos dos 3 últimos meses
  db.fixas = [
    ['fx-aluguel', 'Aluguel do CD Contagem', 4800000, 5, 'contas', 'Aluguel e espaço', 'Logística', 'b1', 'e1', [{ cc: 'Logística', pct: 70 }, { cc: 'Comercial', pct: 30 }]], ['fx-folha', 'Folha de pagamento · Distribuidora', 21000000, 5, 'salario', 'Folha de pagamento', 'Administrativo', 'b1', 'e1'],
    ['fx-folha2', 'Folha de pagamento · Transportes', 9800000, 5, 'salario', 'Folha de pagamento', 'Frota', 'b3', 'e2'], ['fx-folha3', 'Folha de pagamento · Agro', 5200000, 5, 'salario', 'Folha de pagamento', 'Fazenda Unaí', 'b4', 'e3'],
    ['fx-prolabore', 'Pró-labore dos sócios', 4500000, 10, 'salario', 'Pró-labore', 'Administrativo', 'b1', 'e1'], ['fx-contador', 'Escritório de contabilidade', 690000, 10, 'contas', 'Serviços de terceiros', 'Administrativo', 'b1', 'e1'],
    ['fx-internet', 'Internet e telefonia', 190000, 12, 'contas', 'Contas fixas', 'Administrativo', 'b1', 'e1'], ['fx-seguro', 'Seguro da frota', 367800, 14, 'contas', 'Seguros', 'Frota', 'b3', 'e2'],
    ['fx-energia', 'Energia do CD', 680000, 15, 'contas', 'Contas fixas', 'Logística', 'b1', 'e1'], ['fx-erp', 'Sistemas e licenças', 210000, 15, 'contas', 'Sistemas e software', 'Administrativo', 'b1', 'e1'],
    ['fx-icms', 'ICMS (apuração do mês)', 9600000, 20, 'imposto', 'Impostos', 'Fiscal', 'b1', 'e1'], ['fx-das', 'DAS · Transportes', 1150000, 20, 'imposto', 'Impostos', 'Fiscal', 'b3', 'e2'],
    ['fx-adiant', 'Adiantamento da folha', 8400000, 20, 'salario', 'Folha de pagamento', 'Administrativo', 'b1', 'e1'], ['fx-pis', 'DARF PIS/COFINS', 5800000, 25, 'imposto', 'Impostos', 'Fiscal', 'b1', 'e1'],
    ['fx-tarifa', 'Tarifa do pacote de serviços', 24800, 1, 'contas', 'Tarifas bancárias', 'Administrativo', 'b1', 'e1'],
  ].map(([id, desc, c, d, pote, cat, cc, banco, emp, rat]) => ({ id, desc, c, dia: d, pote, cat, cc, banco, emp, ...(rat ? { rat } : {}), ativa: true, desde: N0.hojeISO(new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)).slice(0, 7), tags: ['recorrente'] }));
  for (let k = 3; k >= 0; k--) db.fixas.forEach((f) => {
    const ag = new Date(hoje.getFullYear(), hoje.getMonth() - k, Math.min(f.dia, 28), 12), d = Math.round((ag - hoje) / 864e5); if (d >= 0 || d < -95) return;
    const p = N0.periodoFixa(f, ag); const m = N0.pagarFixa(db, f.id, f.c + (f.id === 'fx-energia' ? entre(-40000, 60000) : 0), ag, p.comp);
    if (m) Object.assign(m, { dia: d, cc: f.cc, banco: f.banco, emp: f.emp, ...(f.rat ? { rat: f.rat } : {}), por: 'u2' });
  });
  // gastos que estouram o orçamento de fretes no mês e o IRPJ do trimestre
  [[-6, 1580000, 'Frete extra · entrega urgente Uberlândia'], [-3, 940000, 'Frete extra · coleta em Sete Lagoas']].forEach(([d, c, desc]) => L('sai', c, desc, d, { pote: 'contas', cat: 'Fretes e logística', cc: 'Logística', banco: 'b1', emp: 'e1', tags: ['urgente'] }));
  L('sai', 3850000, 'DARF IRPJ e CSLL · 3º trimestre', -20, { pote: 'imposto', cat: 'IRPJ e CSLL', cc: 'Fiscal', banco: 'b1', emp: 'e1' });
  L('sai', 1150000, 'Campanha de vendas para mercados', -8, { pote: 'livre', cat: 'Marketing', cc: 'Comercial', banco: 'b1', emp: 'e1' });
  L('sai', 18500000, 'Empilhadeira elétrica nova (entrada)', -40, { pote: 'reserva', cat: 'Equipamentos', cc: 'Logística', banco: 'b1', emp: 'e1', proj: 'Expansão do CD Contagem' });
  L('sai', 6000000, 'Distribuição de lucros aos sócios', -30, { pote: 'livre', cat: 'Distribuição de lucros', cc: 'Administrativo', banco: 'b1', emp: 'e1', por: 'u1' });
  [[-62, 'b5', 712000], [-31, 'b5', 735000], [-1, 'b5', 748000]].forEach(([d, b, c]) => L('entra', c, 'Rendimento CDB', d, { receita: true, banco: b, emp: 'e1', cat: 'Receitas financeiras', cc: 'Administrativo' }));
  [-75, -45, -16].forEach((d) => E.transferir(db, { c: 30000000, de: 'b2', para: 'b1', dia: d, desc: 'Transferência BB → Itaú (concentra o caixa)' }));
  E.transferir(db, { c: 4000000, de: 'b1', para: 'b3', dia: -18, desc: 'Aporte da Distribuidora na Transportes' });
  E.transferir(db, { c: 20000000, de: 'b1', para: 'b5', dia: -12, desc: 'Aplicação no CDB' });
  // a receber em aberto (com parcelas, atrasos para a inadimplência, e-mail, juros e multa)
  db.cobrancas = [
    ['cb-agromax', 'Agromax', '31988871122', 'contas@agromax.com.br', 8500000, 'NF 12590', 0, 'Comercial', 'e1', 'b2', [-1], '2/3', 'g-agromax'], ['cb-agromax3', 'Agromax', '31988871122', 'contas@agromax.com.br', 8500000, 'NF 12590', 30, 'Comercial', 'e1', 'b2', [], '3/3', 'g-agromax'],
    ['cb-campo', 'Campo Verde Insumos', '31991230987', 'financeiro@campoverde.agr.br', 4860000, 'NF 12531', -12, 'Filial Contagem', 'e1', 'b2', [-11, -9], '', ''], ['cb-atacado', 'Atacado Regional', '31997654321', 'cp@atacadoregional.com.br', 12530000, 'NF 12544', -5, 'Comercial', 'e1', 'b2', [-6, -5], '', ''],
    ['cb-bomlar-v', 'Rede Bom Lar', '31982221100', 'pagar@bomlar.com.br', 6480000, 'NF 12398', -38, 'Filial Contagem', 'e1', 'b2', [-39, -38, -35, -31], '', ''], ['cb-serra-v', 'Mercantil Serra Azul', '31981112233', '', 3920000, 'NF 12260', -75, 'Filial Contagem', 'e1', 'b2', [-76, -75, -72], '', ''],
    ['cb-agronorte', 'AgroNorte', '31986543210', 'tesouraria@agronorte.com.br', 38000000, 'NF 12596', 2, 'Comercial', 'e1', 'b1', [], '', ''], ['cb-saopedro', 'Supermercados São Pedro', '31984561234', 'financeiro@saopedro.com.br', 26500000, 'NF 12601', 3, 'Comercial', 'e1', 'b2', [], '', ''],
    ['cb-terraforte', 'Terra Forte', '31983334455', '', 42000000, 'NF 12605', 5, 'Comercial', 'e1', 'b1', [], '', ''], ['cb-bomlar', 'Rede Bom Lar', '31982221100', 'pagar@bomlar.com.br', 12840000, 'NF 12611', 9, 'Filial Contagem', 'e1', 'b2', [], '', ''],
    ['cb-serrano-f', 'Laticínios Serrano', '31987770011', 'logistica@serrano.com.br', 4650000, 'CT-e 3391 · fretes', 4, 'Frota', 'e2', 'b3', [], '', ''], ['cb-graofino-f', 'Grão Fino Alimentos', '31985554433', '', 3870000, 'CT-e 3402 · fretes', -3, 'Frota', 'e2', 'b3', [-4, -3], '', ''],
    ['cb-faz-sl', 'Fazenda Santa Luzia', '38999812244', 'adm@santaluzia.agr.br', 31500000, 'NF 12622 · sementes', 15, 'Fazenda Unaí', 'e3', 'b4', [], '1/2', 'g-sl'], ['cb-faz-sl2', 'Fazenda Santa Luzia', '38999812244', 'adm@santaluzia.agr.br', 31500000, 'NF 12622 · sementes', 45, 'Fazenda Unaí', 'e3', 'b4', [], '2/2', 'g-sl'],
  ].map(([id, cli, tel, email, c, desc, vence, cc, emp, banco, avisos, parc, grupo]) => ({ id, cli, tel, email, c, desc: parc ? `${desc} · parcela ${parc}` : desc, vence, cc, emp, banco, status: 'aberta', avisos, criada: Math.min(-8, vence - 28), multa: 2, juros: 1, cat: emp === 'e2' ? 'Receita de serviços' : 'Receita de vendas', ...(parc ? { parc, grupo } : {}) }));
  const pr = N0.receber(db, 'cb-atacado', 4000000); Object.assign(pr, { dia: -2, cc: 'Comercial', banco: 'b2', emp: 'e1', cat: 'Receita de vendas', por: 'u2' });
  // a pagar avulsas: algumas acima da alçada (R$ 20 mil) esperando aprovação, uma aprovada e uma recusada
  const anx = (nome, tam) => [{ id: nid(), nome, tam, tipo: 'application/pdf', exemplo: true }];
  db.contas = [
    ['ct-empilhadeira', 'Locação de empilhadeira', 1248000, 0, 'contas', 'Equipamentos', 'Logística', 'e1', 'b1', null, anx('boleto-locacao-empilhadeira.pdf', 48211)], ['ct-metamaq', 'Metamaq · pedido 8955', 21000000, 1, 'contas', 'Fornecedores e mercadorias', 'Comercial', 'e1', 'b1', { st: 'pendente' }, anx('NF-8955-metamaq.pdf', 120400).concat(anx('boleto-8955.pdf', 51022))],
    ['ct-graofino', 'Grão Fino Alimentos · pedido 8961', 8450000, 2, 'contas', 'Fornecedores e mercadorias', 'Comercial', 'e1', 'b1', { st: 'aprovada', por: 'u3', nome: 'Diego Martins', em: new Date(Date.now() - 864e5).toISOString() }, []],
    ['ct-serrano', 'Laticínios Serrano · pedido 8970', 18630000, 4, 'contas', 'Fornecedores e mercadorias', 'Comercial', 'e1', 'b1', { st: 'pendente' }, anx('boleto-serrano-8970.pdf', 49870)],
    ['ct-rotasul', 'Transportadora Rota Sul · fretes de novembro', 3890000, 6, 'contas', 'Fretes e logística', 'Logística', 'e1', 'b1', { st: 'pendente' }, []], ['ct-embalagens', 'Compra de embalagens', 2215000, 11, 'contas', 'Material e produtos', 'Logística', 'e1', 'b1', { st: 'recusada', por: 'u3', nome: 'Diego Martins', em: new Date().toISOString(), motivo: 'Pedir mais um orçamento antes.' }, []],
    ['ct-pneus', 'Pneus para a frota (4 un.)', 1960000, 3, 'contas', 'Pneus e peças', 'Frota', 'e2', 'b3', null, []], ['ct-oficina', 'Oficina Diesel Forte · revisão do caminhão', 1380000, -4, 'contas', 'Manutenção', 'Frota', 'e2', 'b3', null, anx('NF-servico-oficina.pdf', 38211)],
    ['ct-defensivos', 'Agro Insumos Brasil · defensivos', 9600000, 8, 'contas', 'Material e produtos', 'Fazenda Unaí', 'e3', 'b4', { st: 'pendente' }, []],
  ].map(([id, desc, c, vence, pote, cat, cc, emp, banco, aprov, anexos]) => ({ id, desc, c, vence, pote, cat, cc, emp, banco, status: 'aberta', criadoPor: 'u2', multa: 2, juros: 1, dcomp: Math.min(0, vence - 10), ...(aprov ? { aprov } : {}), ...(anexos.length ? { anexos } : {}) }));
  // compra parcelada (3x) da reforma do CD
  E.parcelas(5400000, 3, 16, 30).forEach((p, i) => db.contas.push({ id: `ct-reforma-${i + 1}`, desc: `Reforma do galpão · parcela ${p.parc}`, c: p.c, vence: p.vence, pote: 'reserva', cat: 'Manutenção', cc: 'Logística', emp: 'e1', banco: 'b1', status: 'aberta', criadoPor: 'u2', parc: p.parc, grupo: 'g-reforma', proj: 'Expansão do CD Contagem', dcomp: 0, multa: 2, juros: 1, aprov: { st: 'aprovada', por: 'u1', nome: 'Renata Albuquerque', em: new Date().toISOString() } }));
  const pc = N0.pagarConta(db, 'ct-graofino', 4000000); Object.assign(pc, { dia: -1, cc: 'Comercial', banco: 'b1', emp: 'e1', por: 'u2' });
  db.recibos = [{ id: 'rc1', num: 1040, cli: 'Agromax', c: 18000000, ref: 'NF 12584', dia: -3 }];
  // conciliação: o que tem mais de 6 dias já foi conferido com o extrato; o resto espera o extrato da semana
  db.movs.forEach((m) => { if (m.dia < -6 && (m.tipo === 'entra' || m.tipo === 'sai')) m.conc = { em: N0.isoDe(m.dia + 1), ref: `x${m.id.slice(-6)}` }; });
  // dois meses fechados pelo dono (não aceitam mais mudança)
  db.fechado = E.mesDe(Math.round((new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0, 12) - hoje) / 864e5));
  db.historico = [
    { quando: new Date(Date.now() - 36e5).toISOString(), dia: 0, oque: 'Lançou a conta Metamaq · pedido 8955 (R$ 210.000,00), que espera aprovação', por: 'u2' },
    { quando: new Date(Date.now() - 864e5).toISOString(), dia: -1, oque: 'Aprovou o pagamento de Grão Fino Alimentos · pedido 8961', por: 'u3' },
    { quando: new Date(Date.now() - 2 * 864e5).toISOString(), dia: -2, oque: `Fechou o mês ${E.nomeMes(db.fechado)}`, por: 'u1' },
    { quando: new Date(Date.now() - 3 * 864e5).toISOString(), dia: -3, oque: 'Conciliou 18 lançamentos do Itaú · movimento (extrato OFX)', por: 'u2' },
  ];
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
  E.garantir(d); // empresas, contas bancárias, perfis, plano de contas, regras, orçamento... com valor padrão (nada é apagado)
  return d;
}
function carregar() {
  if (new URLSearchParams(location.search).has('novo')) try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ }
  if (DEMO) try { localStorage.removeItem('arca-demo-v1'); const v = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (v && (v.exemplo || 0) < EXEMPLO) localStorage.removeItem(CHAVE); } catch { /* exemplo antigo ilegível: recomeça */ try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ } }
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
window.veltriaEditorFora = ['equipe', 'movs', 'cobrancas', 'contas', 'fixas', 'recibos', 'historico', 'potes', 'migracao', 'empresas', 'bancos', 'usuarios', 'alcada', 'plano', 'regras', 'orcamento', 'impostos', 'regua', 'cenarios', 'filtros', 'projetos', 'fechado', 'exemplo'];
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
  // o recebimento e o pagamento herdam da cobrança ou da conta: centro de custo, rateio, empresa, conta bancária, categoria, projeto e tags
  db.movs.forEach((m) => {
    const o = m.cob ? db.cobrancas.find((x) => x.id === m.cob) : m.conta ? db.contas.find((x) => x.id === m.conta) : m.fixa ? db.fixas.find((x) => x.id === m.fixa) : null; if (!o) return;
    if (m.cc === undefined && o.cc) m.cc = o.cc;
    ['rat', 'emp', 'banco', 'proj', 'tags'].forEach((k) => { if (m[k] === undefined && o[k] !== undefined && !m.herdou) m[k] = o[k]; });
    if (m.tipo === 'entra' && !m.cat && o.cat) m.cat = o.cat;
    m.herdou = 1;
  });
  // auditoria: cada registro novo do histórico leva quem fez
  if (usuarioAtual) for (const h of db.historico) { if (h.por || !h.quando || h.quando < INICIO) break; h.por = usuarioAtual.id; }
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
const novoRascunho = (tipo = 'entra', pote = 'contas') => ({ tipo, valor: '', pote, desc: '', dia: 0, receita: true, cat: '', cc: '', banco: '', proj: '', tags: [], rat: [], anexos: [], chave: nid() });
let filtro = { busca: '', tipo: '', per: '30', cat: '', banco: '', tag: '', emp: '' }, perResumo = 'mes', previa = null, horizonte = 30, ccSel = '', selCob = '';
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
  clipe: svg('<path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7"/>'),
  moedas: svg('<ellipse cx="9" cy="7" rx="5" ry="2"/><path d="M4 7v4c0 1.1 2.2 2 5 2s5-.9 5-2V7"/><ellipse cx="15" cy="14" rx="5" ry="2"/><path d="M10 14v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4"/>'),
};
const ICPOTE = { imposto: IC.coluna, contas: IC.cal, salario: IC.pessoas, reserva: IC.escudo, livre: IC.moedas };
const vazio = (txt, acao = '') => `<div class="vazio">${IC.cofre}<p>${txt}</p>${acao}</div>`;
const titulo = (ic, txt, extra = '') => `<div class="faixa-t">${ic}<h2>${txt}</h2>${extra}</div>`;
const cabeca = (txt, sub = '', extra = '') => `<div class="cab-tela"><div><h1>${txt}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${extra}</div>`;
const voltar = (h, txt) => `<a class="voltar" href="#${h}">‹ ${txt}</a>`;
const diaLongo = (o) => (o === 0 ? 'Hoje' : o === -1 ? 'Ontem' : N.dataDe(o).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).replace(/^./, (x) => x.toUpperCase()));
const ordenaMovs = (l) => [...l].sort((a, b) => b.dia - a.dia || (b.criado > a.criado ? 1 : -1));
const comCC = (l) => (ccSel ? l.filter((x) => (x.cc || '') === ccSel || x.rat?.some((r) => r.cc === ccSel)) : l);
const sinalMov = (m) => (m.tipo === 'sai' || (m.tipo === 'ajuste' && m.sinal < 0) ? -1 : m.tipo === 'transf' || m.tipo === 'transfb' ? 0 : 1);
const valorMov = (m) => { const s = sinalMov(m); return `<span class="num ${s < 0 ? 'sai' : s === 0 ? 'tr' : 'en'}">${s < 0 ? '−' : ''}${din(m.c)}</span>`; };
const reservaMov = (m) => m.tipo === 'sai' || m.tipo === 'ajuste' ? t(nomePote(m.pote)) : m.tipo === 'transf' ? `${t(nomePote(m.de))} → ${t(nomePote(m.para))}` : m.receita === false ? 'dividida (não é receita)' : 'dividida nas reservas';
const catMov = (m) => m.tipo === 'sai' || m.tipo === 'entra' ? t(E.catDe(m)) : m.tipo === 'transf' ? 'Entre reservas' : m.tipo === 'transfb' ? 'Transferência' : 'Acerto';
const contaMov = (m) => m.tipo === 'transfb' ? `${t(banco(m.bde)?.nome)} → ${t(banco(m.bpara)?.nome)}` : m.tipo === 'transf' ? `${t(nomePote(m.de))} → ${t(nomePote(m.para))}` : `${t(nomeBanco(m))}${db.empresas.length > 1 ? `<small class="sub-l">${t(nomeEmp(m))}</small>` : ''}`;
function tabelaMovs(ms, { vazioTxt = 'Nada lançado ainda.', soPote } = {}) {
  if (!ms.length) return vazio(vazioTxt);
  return `<div class="tab-rol"><table class="razao movs"><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Centro de custo</th><th>Categoria</th><th class="dir">Valor</th></tr></thead><tbody>${ms.map((m) => {
    const ef = soPote ? N.efeito(m)[soPote] : null;
    return `<tr data-ir="mov/${m.id}" role="button" tabindex="0"><td class="num">${dataC(m.dia)}</td><td>${t(m.desc)}${m.cli && !m.desc.includes(m.cli) ? ` <small>${t(m.cli)}</small>` : ''}${m.origem === 'importacao' ? ' <small class="selo-imp">importado</small>' : ''}${m.conc ? ' <small class="conc-ok" title="Conferido com o extrato">✓</small>' : ''}${selos(m)}${m.anexos?.length ? ` <small class="selo">${m.anexos.length} anexo(s)</small>` : ''}</td><td>${contaMov(m)}</td><td>${ccTxt(m)}</td><td>${catMov(m)}</td><td class="dir">${soPote ? `<span class="num ${ef < 0 ? 'sai' : 'en'}">${ef < 0 ? '−' : ''}${din(Math.abs(ef))}</span>` : valorMov(m)}</td></tr>`;
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

// ------------------------------------------------------------------ empresa, conta bancária, usuário e filtros do topo
let empSel = '';
const emp = (id) => db.empresas.find((e) => e.id === id);
const banco = (id) => db.bancos.find((b) => b.id === id);
const nomeEmp = (x) => emp(E.empDe(db, x))?.nome || '';
const nomeBanco = (x) => banco(E.bancoDe(db, x))?.nome || '';
const comEmp = (l) => (empSel ? l.filter(E.daEmpresa(db, empSel)) : l);
const filtra = (l) => comCC(comEmp(l));
const opEmp = (sel, todas) => (todas ? `<option value="">${t(todas)}</option>` : '') + db.empresas.map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${t(e.nome)}</option>`).join('');
const opBancos = (sel) => db.empresas.map((e) => `<optgroup label="${t(e.nome)}">${db.bancos.filter((b) => b.emp === e.id).map((b) => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${t(b.nome)}</option>`).join('')}</optgroup>`).join('');
const bancoInicial = () => (empSel ? db.bancos.find((b) => b.emp === empSel)?.id : '') || E.bancoPadrao(db);
const CHAVE_USU = `${CHAVE}-usuario:${CONTA}`;
function defineUsuario() {
  let id = ''; try { id = localStorage.getItem(CHAVE_USU) || ''; } catch { /* sem acesso */ }
  const u = db.usuarios.find((x) => x.id === id) || db.usuarios.find((x) => x.perfil === 'dono') || db.usuarios[0];
  // na conta, quem entrou com acesso "só ver" é sempre leitura, seja qual for o perfil escolhido aqui
  usuarioAtual = window.veltriaPermissoes?.so_leitura ? { ...u, perfil: 'contador' } : u;
}
const pode = (a) => E.pode(usuarioAtual?.perfil, a);
const nomeUsu = (id) => db.usuarios.find((u) => u.id === id)?.nome || '';
const ro = (a = 'cadastros') => (pode(a) ? '' : 'disabled');
// o que cada ação pede (o botão some para quem não pode; se aparecer por engano, avisa em vez de fazer)
const PERM = {
  lancar: ['salvar-mov', 'editar-mov', 'apagar-mov', 'mover', 'meta', 'transferir', 'recibo', 'conc-manual'],
  pagar: ['pagar-conta', 'pagar-fixa', 'editar-conta', 'editar-fixa', 'pagar-lote', 'lancar-guia', 'nova-conta'],
  receber: ['nova-cob', 'editar-cob', 'cobrar', 'receber', 'receber-lote', 'lembrar-todos'],
  conciliar: ['extrato-exemplo', 'regra-nova', 'regra-tira'],
  aprovar: ['aprovar', 'recusar'],
  cadastros: ['plano-nova', 'plano-ed', 'plano-ativa', 'banco-ed', 'empresa-ed', 'orc-copiar'],
  fechar: ['fechar-mes', 'reabrir-mes'],
  equipe: ['usuario-ed', 'usuario-tira', 'convidar', 'tira-pessoa'],
};
const PRECISA = Object.fromEntries(Object.entries(PERM).flatMap(([p, l]) => l.map((a) => [a, p])));
function aplicaPerfil() {
  let st = $('#estilo-perfil'); if (!st) { st = document.createElement('style'); st.id = 'estilo-perfil'; document.head.append(st); }
  const fora = Object.entries(PRECISA).filter(([, p]) => !pode(p)).map(([a]) => `[data-acao="${a}"]`);
  if (!pode('lancar')) fora.push('[data-lancar]', '[data-ir="lancar"]', '.bt-lancar', '.fab', 'label.bt:has(#arq-extrato)', 'label.bt:has(#restaurar)');
  if (!pode('pagar')) fora.push('.lote-cx');
  st.textContent = fora.length ? `${fora.join(',')}{display:none!important}` : '';
  document.body.dataset.perfil = usuarioAtual?.perfil || '';
  $('#usuario-nome').textContent = `${(usuarioAtual?.nome || '').split(' ')[0]} · ${E.PERFIS[usuarioAtual?.perfil]?.nome.toLowerCase() || ''}`;
}

// ------------------------------------------------------------------ peças das telas novas
const kpi = (ic, rot, val, sub = '', cls = '', href = '') => `<${href ? `a href="#${href}"` : 'div'} class="kpi ${cls}">${ic}<small>${rot}</small><b class="num">${val}</b>${sub ? `<span>${sub}</span>` : ''}</${href ? 'a' : 'div'}>`;
const kpis = (l) => `<section class="kpis k${l.length}">${l.join('')}</section>`;
const secao = (txt, extra = '') => `<div class="sec-t"><h2>${txt}</h2>${extra}</div>`;
const abas = (atual, l, attr = 'data-aba-t') => `<div class="abas" role="tablist">${l.map(([k, n]) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${atual === k}">${n}</button>`).join('')}</div>`;
const pctTxt = (v, casas = 1) => (v === null || !Number.isFinite(v) ? '—' : `${(Math.abs(v) < 0.5 / 10 ** casas ? 0 : v).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`);
const variacao = (v) => (v === null || !Number.isFinite(v) ? '<span class="mudo">—</span>' : `<span class="${v >= 0 ? 'sobe' : 'desce'}">${v >= 0 ? '▲' : '▼'} ${pctTxt(Math.abs(v))}</span>`);
const clipe = (x) => (x.anexos?.length ? `<button type="button" class="clipe" data-acao="anexos" data-tipo-a="${db.contas.includes(x) ? 'conta' : db.cobrancas.includes(x) ? 'cob' : 'mov'}" data-id="${x.id}" aria-label="${x.anexos.length} anexo(s)">${IC.clipe}${x.anexos.length}</button>` : '');
const selos = (x) => `${x.parc ? ` <small class="selo">${t(x.parc)}</small>` : ''}${(x.tags || []).map((g) => ` <small class="selo tag">#${t(g)}</small>`).join('')}${x.proj ? ` <small class="selo proj">${t(x.proj)}</small>` : ''}`;
const ccTxt = (x) => (x.rat?.length ? x.rat.map((r) => `${t(r.cc)} ${r.pct}%`).join(' · ') : t(x.cc || '—'));
const estAprovEtq = (c) => { const e = E.estadoAprov(db, c); return e === 'pendente' ? '<span class="etq at">aguarda aprovação</span>' : e === 'aprovada' ? `<span class="etq ok" title="por ${t(c.aprov?.nome || '')}">aprovada</span>` : e === 'recusada' ? `<span class="etq ru" title="${t(c.aprov?.motivo || '')}">recusada</span>` : ''; };
const pendAprov = () => comEmp(db.contas).filter((c) => E.estadoAprov(db, c) === 'pendente' && N.situacaoConta(db, c).falta > 0);
function agendaSemana(n = 7) {
  // contas a pagar (avulsas e fixas) que vencem em cada um dos próximos dias; atrasadas contam como hoje
  const dias = Array.from({ length: n }, (_, d) => ({ d, itens: [] }));
  comEmp(db.contas).forEach((c) => { const s = N.situacaoConta(db, c); if (s.falta && c.vence < n) dias[Math.max(0, c.vence)].itens.push({ desc: c.desc, c: s.falta, tipo: 'conta', id: c.id, atras: c.vence < 0, aprov: E.estadoAprov(db, c) }); });
  comEmp(db.fixas).forEach((f) => { const s = N.situacaoFixa(db, f); if (s.falta && s.venceEm < n && s.st !== 'pausada') dias[Math.max(0, s.venceEm)].itens.push({ desc: f.desc, c: s.falta, tipo: 'fixa', id: f.id, atras: s.venceEm < 0 }); });
  return dias.map((x) => ({ ...x, total: x.itens.reduce((a, i) => a + i.c, 0) }));
}
const nomeDia = (d) => (d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : N.dataDe(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').replace(/^./, (x) => x.toUpperCase()));
function alertas() {
  const l = [], mes = N.hojeISO().slice(0, 7);
  E.alertasOrcamento(db, mes).forEach((x) => l.push({ g: x.st === 'estourou' ? 'ru' : 'at', tit: x.st === 'estourou' ? `Orçamento estourado: ${x.k}` : `Orçamento perto do limite: ${x.k}`, txt: `${din(x.real)} gastos no mês, ${pctTxt(x.pct, 0)} do orçado (${din(x.orc)}) · ${x.tipo}.`, ir: 'orcamento' }));
  const p = N.projecao(db, 30); if (p.menor.s < 0) l.push({ g: 'ru', tit: 'Saldo negativo previsto', txt: `O caixa do grupo chega a ${din(p.menor.s)} em ${dataM(p.menor.dia)}. Antecipe recebimentos ou reprograme pagamentos.`, ir: 'fluxo' });
  const sb = E.saldosBancos(db); db.bancos.forEach((b) => { if (sb[b.id] < 0) l.push({ g: 'ru', tit: `Conta negativa: ${b.nome}`, txt: `Saldo de ${din(sb[b.id])}. Transfira de outra conta.`, ir: 'caixa' }); });
  const ab = E.abertos(db, { emp: empSel }), atr = ab.pag.filter((r) => r.s.st === 'atrasada').length + ab.fx.filter((r) => r.s.st === 'atrasada').length;
  if (atr) l.push({ g: 'ru', tit: `${atr} pagamento(s) em atraso`, txt: 'Com juros e multa correndo. Veja em A pagar.', ir: 'pagar' });
  const inad = E.inadimplencia(db, { emp: empSel }).filter((x) => x.maior > 30); if (inad.length) l.push({ g: 'at', tit: `${inad.length} cliente(s) com atraso acima de 30 dias`, txt: inad.slice(0, 3).map((x) => `${x.cli} ${din(x.vencido)}`).join(' · '), ir: 'receber/clientes' });
  const semConc = db.bancos.reduce((a, b) => a + E.pendentesConc(db, b.id).length, 0); if (semConc) l.push({ g: 'in', tit: `${semConc} lançamento(s) sem conciliar`, txt: 'Traga o extrato do banco e confira.', ir: 'conciliacao' });
  N.pendencias(db).filter((x) => x.tipo === 'erro').forEach((x) => l.push({ g: 'ru', tit: 'Conferir', txt: x.txt, ir: x.ir }));
  return l;
}
function grafMeses(per) {
  // saldo no fim de cada mês: realizado (linha cheia) e previsto (tracejada)
  const W = 640, H = 220, pl = 84, pr = 34, pt = 14, pb = 28, v = per.map((p) => p.saldo), min = Math.min(0, ...v), max = Math.max(1, ...v);
  const x = (i) => pl + (W - pl - pr) * i / Math.max(1, per.length - 1), y = (s) => pt + (H - pt - pb) * (1 - (s - min) / (max - min || 1));
  const iHoje = per.findIndex((p) => !p.passado), real = per.slice(0, iHoje + 1).map((p, i) => `${x(i)},${y(p.saldo)}`).join(' '), prev = per.slice(iHoje).map((p, i) => `${x(i + iHoje)},${y(p.saldo)}`).join(' ');
  const marcas = [0, 1, 2, 3, 4].map((i) => min + (max - min) * i / 4);
  return `<svg class="graf graf-m" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo no fim de cada mês, realizado e previsto">${marcas.map((m) => `<line x1="${pl}" x2="${W - pr}" y1="${y(m)}" y2="${y(m)}" class="g-grade"/><text x="${pl - 8}" y="${y(m) + 4}" text-anchor="end">${(m / 1e8).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi</text>`).join('')}
    ${min < 0 ? `<line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" class="g-zero"/>` : ''}
    <polyline points="${real}" class="g-real"/><polyline points="${prev}" class="g-prev"/>${per.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.saldo)}" r="4" class="${p.passado ? 'g-pr' : 'g-pp'}"/><text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="${i % 2 ? 'alt' : ''}">${t(p.nome)}</text>`).join('')}</svg>`;
}
/** Tabela que vira cartões no celular: cada célula leva o nome da coluna (data-r). */
const tabela = (cls, cab, linhas, vaz = 'Nada por aqui.') => (linhas.length ? `<div class="tab-rol"><table class="razao cartoes ${cls}"><thead><tr>${cab.map(([n, c]) => `<th class="${c || ''}">${n}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div>` : vazio(vaz));
const td = (rot, v, cls = '') => `<td data-r="${rot}" class="${cls}">${v}</td>`;
const valorAtual = (x, falta) => { const e = E.encargos(x, falta, 0); return e.total > falta ? `<b class="num">${din(e.total)}</b><small class="sub-l">${din(falta)} + juros e multa ${din(e.total - falta)}</small>` : `<b class="num">${din(falta)}</b>`; };
let selPagar = new Set(), selRec = new Set(), abaRec = 'cobrancas', abaRel = 'dre', baseDre = 'competencia', perDre = 'mes', modoComp = 'meses', gran = 'mensal', cenario = 'realista', mesOrc = N0.hojeISO().slice(0, 7), bancoConc = '', fPagar = 'abertas', buscaPagar = '';
const PERIODOS_DRE = [['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['tri', 'Trimestre'], ['ano', 'Ano'], ['12', '12 meses']];
function periodoDre(k) {
  if (k === 'tri') { const h = new Date(), q = Math.floor(h.getMonth() / 3) * 3; return [Math.round((new Date(h.getFullYear(), q, 1, 12) - N.dataDe(0)) / 864e5), 0]; }
  if (k === '12') return [-364, 0];
  return N.periodo(k);
}
function periodoAnterior([de, ate]) { const n = ate - de + 1; if (perDre === 'mes' || perDre === 'mespassado') { const d0 = N.dataDe(de), a = new Date(d0.getFullYear(), d0.getMonth() - 1, 1, 12), b = new Date(d0.getFullYear(), d0.getMonth(), 0, 12); const r = (x) => Math.round((x - N.dataDe(0)) / 864e5); return [r(a), r(perDre === 'mes' ? new Date(a.getFullYear(), a.getMonth(), Math.min(N.dataDe(ate).getDate(), b.getDate()), 12) : b)]; } return [de - n, de - 1]; }

const T = {
  painel() {
    const sb = E.saldosBancos(db), ab = E.abertos(db, { emp: empSel }), saldo = E.saldoEmpresa(db, empSel, sb);
    const op = { emp: empSel, base: 'caixa', cc: ccSel }, d = E.dre(db, ...N.periodo('mes'), op), [a0, a1] = N.periodo('mespassado'), dAnt = E.dre(db, a0, Math.min(a1, a0 + (new Date().getDate() - 1)), op);
    const hojeP = [...ab.pag.filter((r) => r.x.vence === 0), ...ab.fx.filter((r) => r.s.venceEm === 0)], atrP = [...ab.pag.filter((r) => r.x.vence < 0), ...ab.fx.filter((r) => r.s.st === 'atrasada')];
    const pend = pendAprov(), vencidos = ab.rec.filter((r) => r.s.st === 'atrasada'), ag = agendaSemana(7), al = alertas(), per = E.fluxoPeriodos(db, 'mensal', 'realista', { emp: empSel });
    const emps = empSel ? [emp(empSel)] : db.empresas;
    return `${cabeca('Painel executivo', `${empSel ? t(emp(empSel).nome) : `Visão consolidada do grupo (${db.empresas.length} ${db.empresas.length > 1 ? 'CNPJs' : 'CNPJ'})`} · ${t(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}`)}
      ${kpis([kpi(IC.cofre, empSel ? 'Saldo da empresa' : 'Saldo consolidado', din(saldo), `${db.bancos.filter((b) => !empSel || b.emp === empSel).length} conta(s) bancária(s)`, saldo < 0 ? 'ru' : '', 'caixa'),
        kpi(IC.cal, 'Vence hoje', din(hojeP.reduce((a, r) => a + r.s.falta, 0)), `${hojeP.length} título(s)${atrP.length ? ` · ${atrP.length} atrasado(s)` : ''}`, '', 'agenda'),
        kpi(IC.alerta, 'A receber vencido', din(ab.vencido), `${vencidos.length} título(s) · ${new Set(vencidos.map((r) => r.x.cli)).size} cliente(s)`, ab.vencido ? 'ru' : '', 'receber/clientes'),
        kpi(IC.coluna, 'Resultado do mês', din(d.liquido), `${variacao(E.ah(d.liquido, dAnt.liquido))} contra o mesmo ponto do mês passado`, d.liquido < 0 ? 'ru' : '', 'relatorios'),
        kpi(IC.escudo, 'Aprovações pendentes', String(pend.length), `${din(pend.reduce((a, c) => a + N.situacaoConta(db, c).falta, 0))} em pagamentos`, pend.length ? 'at' : '', 'aprovacoes')])}
      <div class="grade-2"><section class="bloco">${secao('Saldos por conta bancária', '<a class="ver" href="#caixa">Contas e transferências ›</a>')}
        <div class="tab-rol"><table class="razao saldos-b"><thead><tr><th>Empresa e conta</th><th class="dir">Saldo atual</th></tr></thead><tbody>${emps.map((e) => `<tr class="grupo-l"><td><b>${t(e.nome)}</b> <small>${t(e.cnpj || '')}</small></td><td class="dir num"><b>${din(E.saldoEmpresa(db, e.id, sb))}</b></td></tr>${db.bancos.filter((b) => b.emp === e.id).map((b) => `<tr><td class="rec">${t(b.nome)}${b.tipo === 'aplicacao' ? ' <small class="selo">aplicação</small>' : ''}</td><td class="dir num ${sb[b.id] < 0 ? 'sai' : ''}">${din(sb[b.id] || 0)}</td></tr>`).join('')}`).join('')}<tr class="total"><td>${empSel ? 'Total da empresa' : 'Total do grupo'}</td><td class="dir num">${din(saldo)}</td></tr></tbody></table></div></section>
        <div class="col"><section class="bloco">${secao(`Aprovações de pagamento (${pend.length})`, '<a class="ver" href="#aprovacoes">Ver todas ›</a>')}${pend.length ? `<div class="tab-rol"><table class="razao cartoes aprov-mini"><thead><tr><th>Fornecedor</th><th class="o1">Empresa</th><th class="dir">Valor</th><th>Vence</th><th></th></tr></thead><tbody>${pend.slice(0, 5).map((c) => { const s = N.situacaoConta(db, c), ok = E.podeAprovar(db, usuarioAtual, c).ok; return `<tr>${td('Fornecedor', `${t(c.desc)}${clipe(c)}`)}${td('Empresa', t(nomeEmp(c)), 'o1')}${td('Valor', din(s.falta), 'dir num')}${td('Vence', c.vence <= 0 ? `<b class="sai">${c.vence < 0 ? 'atrasada' : 'hoje'}</b>` : dataM(c.vence))}<td class="acoes">${ok ? `<button type="button" class="bt pq cheio bordo" data-acao="aprovar" data-c="${c.id}">${IC.ok} Aprovar</button><button type="button" class="bt pq" data-acao="recusar" data-c="${c.id}">Recusar</button>` : `<small class="mudo">${t(E.podeAprovar(db, usuarioAtual, c).motivo)}</small>`}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="ok-tudo">${IC.ok} Nenhum pagamento esperando aprovação.</p>`}</section>
        <section class="bloco">${secao('Agenda de pagamentos da semana', `<span class="dica">Total: <b class="num">${din(ag.reduce((a, x) => a + x.total, 0))}</b></span>`)}<div class="agenda-mini">${ag.slice(0, 5).map((x) => `<a href="#agenda" class="dia-c ${x.itens.some((i) => i.atras) ? 'atras' : ''}"><span>${nomeDia(x.d)}, ${dataM(x.d)}</span><b class="num">${din(x.total)}</b><small>${x.itens.length} pagamento(s)</small></a>`).join('')}</div></section></div></div>
      <div class="grade-2 g-fluxo"><section class="bloco">${secao('Fluxo de caixa · realizado x previsto', '<a class="ver" href="#fluxo">Abrir o fluxo ›</a>')}<p class="graf-leg"><span><i class="lg-l"></i>Realizado (saldo no fim do mês)</span><span><i class="lg-z prev"></i>Previsto</span></p>${grafMeses(per)}</section>
        <section class="bloco">${secao(`Alertas (${al.length})`, '<a class="ver" href="#hoje">Pendências ›</a>')}<div class="alertas">${al.length ? al.slice(0, 6).map((x) => `<a class="alerta-i ${x.g}" href="#${x.ir}">${IC.alerta}<span><b>${t(x.tit)}</b>${t(x.txt)}</span></a>`).join('') : `<p class="ok-tudo">${IC.ok} Nada fora do normal.</p>`}</div></section></div>
      <section class="bloco">${secao('Últimos lançamentos', '<a class="ver" href="#lancamentos">Ver o livro-razão ›</a>')}${tabelaMovs(ordenaMovs(filtra(db.movs)).slice(0, 8))}</section>`;
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
    const l = ordenaMovs(filtra(db.movs).filter((m) => m.dia >= de && m.dia <= ate && (!filtro.tipo || m.tipo === filtro.tipo || (filtro.tipo === 'transf' && m.tipo === 'transfb')) && (!filtro.cat || E.catDe(m) === filtro.cat) && (!filtro.banco || E.bancoDe(db, m) === filtro.banco || m.bde === filtro.banco || m.bpara === filtro.banco) && (!filtro.tag || (m.tags || []).includes(filtro.tag)) && (!filtro.emp || E.empDe(db, m) === filtro.emp) && (!q || sa(`${m.desc} ${m.cli || ''} ${m.cat || ''} ${m.cc || ''} ${m.proj || ''} ${(m.tags || []).join(' ')} ${(m.c / 100).toFixed(2).replace('.', ',')}`).includes(q))));
    const r = N.resumo({ ...db, movs: l }, -1e6, 1e6), tags = [...new Set(db.movs.flatMap((m) => m.tags || []))].sort();
    return `${cabeca('Lançamentos', 'O livro-razão do grupo: tudo que entrou, saiu e passou entre contas, com empresa, conta bancária, categoria e centro de custo.', `<div class="linha"><button type="button" class="bt cheio" data-lancar="entra">${IC.entra} Entrada</button><button type="button" class="bt" data-lancar="sai">${IC.sai} Saída</button><button type="button" class="bt" data-acao="transferir">${IC.transf} Transferência</button></div>`)}
      <div class="filtros"><div class="linha-f"><div class="busca">${IC.busca}<input type="search" id="busca" placeholder="Procurar descrição, cliente, valor, categoria, tag" value="${t(filtro.busca)}" aria-label="Procurar nos lançamentos"></div>
        <select id="f-cat" aria-label="Categoria"><option value="">Todas as categorias</option>${[...new Set([...db.plano.map((p) => p.nome), ...db.movs.map(E.catDe)])].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((c) => `<option ${filtro.cat === c ? 'selected' : ''}>${t(c)}</option>`).join('')}</select>
        <select id="f-banco" aria-label="Conta bancária"><option value="">Todas as contas</option>${opBancos(filtro.banco)}</select>
        <select id="f-tag" aria-label="Tag"><option value="">Todas as tags</option>${tags.map((g) => `<option ${filtro.tag === g ? 'selected' : ''}>${t(g)}</option>`).join('')}</select></div>
      <div class="chips" role="group" aria-label="Período">${[['30', '30 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['90', '90 dias'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([k, n]) => `<button type="button" data-per="${k}" aria-pressed="${filtro.per === k}">${n}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Tipo">${[['', 'Todos'], ['entra', 'Entradas'], ['sai', 'Saídas'], ['transf', 'Transferências']].map(([k, n]) => `<button type="button" data-ftipo="${k}" aria-pressed="${filtro.tipo === k}">${n}</button>`).join('')}</div>
      <div class="chips salvos" role="group" aria-label="Filtros salvos"><span>Filtros salvos:</span>${db.filtros.map((f) => `<button type="button" data-filtro-salvo="${f.id}">${t(f.nome)}</button>`).join('')}<button type="button" class="bt pq" data-acao="salvar-filtro">+ Salvar este filtro</button>${db.filtros.length ? '<button type="button" class="bt pq" data-acao="filtros-ed">Organizar</button>' : ''}</div></div>
      ${kpis([kpi(IC.entra, 'Entradas no filtro', din(r.entradas)), kpi(IC.sai, 'Saídas no filtro', din(r.saidas)), kpi(IC.coluna, 'Resultado', din(r.resultado), '', r.resultado < 0 ? 'ru' : ''), kpi(IC.livro, 'Lançamentos', String(l.length))])}
      <section class="bloco">${tabelaMovs(l.slice(0, 400), { vazioTxt: 'Nada encontrado com esses filtros.' })}${l.length > 400 ? `<p class="mini">Mostrando os 400 mais novos de ${l.length}. Refine o filtro ou baixe tudo no Excel.</p>` : ''}</section>
      <div class="linha"><button type="button" class="bt" data-acao="exportar">${IC.dados} Baixar lançamentos (CSV)</button><button type="button" class="bt" data-acao="exportar-xlsx">Excel completo</button><a class="bt" href="#conciliacao">Importar extrato do banco</a></div>`;
  },
  mov(id) {
    const m = db.movs.find((x) => x.id === id); if (!m) return T.lancamentos();
    const nome = { entra: 'Entrada', sai: 'Saída', transf: 'Entre reservas', ajuste: 'Acerto de saldo', transfb: 'Transferência entre contas' }[m.tipo];
    const det = m.tipo === 'entra' ? `<p class="mini">${m.receita === false ? 'Não é receita da empresa (não conta no faturamento).' : 'Receita da empresa (conta no faturamento do ano).'}</p><div class="divisao">${Object.entries(m.div || {}).map(([k, v]) => `<div style="--c:${cor(k)}"><span>${t(nomePote(k))}</span><b class="num">${din(v)}</b></div>`).join('')}</div>`
      : m.tipo === 'sai' ? `<p>Saiu da reserva <b>${t(nomePote(m.pote))}</b></p>` : m.tipo === 'transf' ? `<p>De <b>${t(nomePote(m.de))}</b> para <b>${t(nomePote(m.para))}</b></p>` : m.tipo === 'transfb' ? `<p>De <b>${t(banco(m.bde)?.nome)}</b> para <b>${t(banco(m.bpara)?.nome)}</b></p>` : `<p>${m.sinal < 0 ? 'Tirou de' : 'Pôs em'} ${t(nomePote(m.pote))}</p>`;
    const lig = m.cob ? `Recebimento da cobrança de ${t(db.cobrancas.find((c) => c.id === m.cob)?.cli || '')}.` : m.fixa ? 'Pagamento de conta fixa.' : m.conta ? 'Pagamento de conta a pagar.' : m.origem === 'importacao' ? `Importado de ${t(m.imp?.arquivo || 'planilha')}.` : '';
    const fech = E.fechadoEm(db, m.dia);
    return `${voltar('lancamentos', 'Lançamentos')}<section class="bloco detalhe"><p class="mini">${nome} · ${diaLongo(m.dia)}${fech ? ' · <b>mês fechado</b>' : ''}</p><p class="valor-g ${m.tipo === 'sai' ? 'sai' : ''}">${m.tipo === 'sai' ? '−' : ''}${din(m.c)}</p><p class="sub">${t(m.desc)}${m.cli ? ` · ${t(m.cli)}` : ''}</p>
      <dl class="ficha f4">${m.tipo !== 'transf' && m.tipo !== 'transfb' ? `<div><dt>Empresa</dt><dd>${t(nomeEmp(m))}</dd></div><div><dt>Conta bancária</dt><dd>${t(nomeBanco(m))}</dd></div>` : ''}${m.tipo === 'entra' || m.tipo === 'sai' ? `<div><dt>Categoria</dt><dd>${t(E.catDe(m))} <small class="cod">${E.codigoDaCat(db, E.catDe(m))}</small></dd></div><div><dt>Centro de custo</dt><dd>${ccTxt(m)}</dd></div>` : ''}${m.proj ? `<div><dt>Projeto</dt><dd>${t(m.proj)}</dd></div>` : ''}${m.tags?.length ? `<div><dt>Tags</dt><dd>${m.tags.map((g) => `#${t(g)}`).join(' ')}</dd></div>` : ''}${Number.isFinite(m.dcomp) && m.dcomp !== m.dia ? `<div><dt>Competência</dt><dd>${dataC(m.dcomp)}</dd></div>` : ''}<div><dt>Conciliação</dt><dd>${m.conc ? `conferido com o extrato em ${t(String(m.conc.em).split('-').reverse().join('/'))}` : m.tipo === 'entra' || m.tipo === 'sai' ? 'ainda não conferido' : '—'}</dd></div>${m.por ? `<div><dt>Lançado por</dt><dd>${t(nomeUsu(m.por))}</dd></div>` : ''}${m.anexos?.length ? `<div><dt>Anexos</dt><dd>${clipe(m)}</dd></div>` : ''}</dl>
      ${det}${lig ? `<p class="mini">${lig}</p>` : ''}${m.editado ? `<p class="mini">Editado em ${new Date(m.editado).toLocaleString('pt-BR')}.</p>` : ''}
      ${fech ? `<p class="faixa-aviso">Este lançamento é de um mês fechado (${E.nomeMes(E.mesDe(m.dia))}). Só muda se o dono reabrir o mês.</p>` : `<div class="linha">${m.tipo !== 'transfb' ? `<button type="button" class="bt cheio" data-acao="editar-mov" data-m="${m.id}">Editar</button>` : ''}${m.tipo === 'entra' ? `<button type="button" class="bt" data-acao="recibo" data-m="${m.id}">${IC.recibo} Recibo</button>` : ''}<button type="button" class="bt" data-acao="anexar" data-tipo-a="mov" data-id="${m.id}">${IC.clipe} Anexar</button>${(m.tipo === 'entra' || m.tipo === 'sai') && !m.conc ? `<button type="button" class="bt" data-acao="conc-manual" data-m="${m.id}">Marcar como conferido</button>` : ''}<button type="button" class="bt perigo" data-acao="apagar-mov" data-m="${m.id}">Apagar</button></div>`}</section>`;
  },
  lancar() {
    const r = rascunho ||= novoRascunho(), c = Number(r.valor || 0), cats = E.catsDoTipo(db, r.tipo), sugerida = r.tipo === 'sai' ? r.cat || N.categoriaSugerida(r.desc) || '' : '';
    return `${cabeca(r.tipo === 'entra' ? 'Entrou dinheiro' : 'Saiu dinheiro', r.tipo === 'entra' ? 'A entrada vai para a conta bancária escolhida e é dividida sozinha nas reservas.' : 'A saída sai da conta bancária e da reserva que você escolher.')}
      <section class="bloco forma-lancar"><div class="alterna" role="group" aria-label="Tipo"><button type="button" data-tipo="entra" aria-pressed="${r.tipo === 'entra'}">Entrou</button><button type="button" class="sai" data-tipo="sai" aria-pressed="${r.tipo === 'sai'}">Saiu</button></div>
      <div class="lancar-grade"><div class="campos-2">
        <label class="campo valor-campo larga">Valor (R$)<input id="valor-l" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${c ? (c / 100).toFixed(2).replace('.', ',') : ''}"></label>
        <label class="campo larga">${r.tipo === 'entra' ? 'De quê? (cliente, nota, serviço)' : 'Com quê? (fornecedor, conta)'}<input id="desc-l" value="${t(r.desc)}" placeholder="${r.tipo === 'entra' ? 'Recebimento NF 12600 · Agromax' : 'Metamaq · pedido 9001'}" maxlength="120"></label>
        <label class="campo">Conta bancária<select id="banco-l">${opBancos(r.banco || bancoInicial())}</select></label>
        ${r.tipo === 'sai' ? `<label class="campo">Sai da reserva<select id="pote-l">${opPotes(r.pote)}</select></label>` : '<span></span>'}
        <label class="campo">Categoria<select id="cat-l"><option value="">${r.tipo === 'sai' ? (sugerida ? `Automática: ${t(sugerida)}` : 'Automática') : r.receita ? E.CAT_ENTRADA : E.CAT_NAO_RECEITA}</option>${cats.map((x) => `<option ${x === r.cat ? 'selected' : ''}>${t(x)}</option>`).join('')}</select></label>
        <label class="campo">Projeto<input id="proj-l" list="lista-proj" maxlength="40" value="${t(r.proj || '')}" placeholder="Opcional"></label>
        ${r.tipo === 'entra' ? '<label class="check larga"><input type="checkbox" id="rec-l" ' + (r.receita ? 'checked' : '') + '> É receita da empresa (conta no faturamento). Desmarque para empréstimo, aporte de sócio ou devolução.</label>' : ''}
        <div class="larga rateio-cx"><div class="linha"><label class="campo cresce">Centro de custo<input id="cc-l" list="lista-cc" maxlength="40" autocomplete="off" value="${t(r.cc || '')}" placeholder="Opcional (ex.: Comercial)" ${r.rat?.length ? 'disabled' : ''}></label><button type="button" class="bt pq" data-acao="rateio-l">${r.rat?.length ? 'Tirar o rateio' : 'Ratear entre centros'}</button></div>
          ${r.rat?.length ? `<div class="rateio" id="rateio-l">${r.rat.map((x, i) => `<div class="rat-l"><input list="lista-cc" data-rat-cc="${i}" value="${t(x.cc)}" placeholder="Centro de custo" aria-label="Centro de custo ${i + 1}"><input type="number" min="1" max="100" data-rat-pct="${i}" value="${x.pct}" aria-label="Porcentagem ${i + 1}"><span>%</span></div>`).join('')}<button type="button" class="bt pq" data-acao="rateio-mais">+ Centro</button><p class="mini" id="rat-soma"></p></div>` : ''}</div>
        <label class="campo">Tags<input id="tags-l" maxlength="80" value="${t((r.tags || []).join(', '))}" placeholder="separe por vírgula"></label>
        <label class="campo">Competência (opcional)<input type="date" id="comp-l" value="${Number.isFinite(r.dcomp) ? N.isoDe(r.dcomp) : ''}"></label>
        <div class="chips larga" role="group" aria-label="Quando">${[[0, 'Hoje'], [-1, 'Ontem']].map(([d, n]) => `<button type="button" data-dia-l="${d}" aria-pressed="${r.dia === d}">${n}</button>`).join('')}<label class="chip-data">Outra data <input type="date" id="dia-l" max="${N.isoDe(0)}" value="${r.dia < -1 ? N.isoDe(r.dia) : ''}"></label></div>
        <label class="bt larga anexo-bt">${IC.clipe} ${r.anexos?.length ? `${r.anexos.length} anexo(s): ${t(r.anexos.map((a) => a.nome).join(', '))}` : 'Anexar comprovante, boleto ou NF'}<input type="file" id="anexo-l" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" hidden></label>
      </div><div class="prev-div" id="prev-div">${prevDivisao(r, c)}</div></div>
      <div class="salvar-fixo"><button type="button" class="bt cheio largo" data-acao="salvar-mov" ${c && !(r.tipo === 'entra' && N.validarPcts(db.potes)) ? '' : 'disabled'}>Guardar ${din(c)}</button></div></section>`;
  },
  receber(sub) {
    if (sub === 'clientes' || sub === 'regua') abaRec = sub === 'clientes' ? 'clientes' : 'regua';
    const l = filtra(db.cobrancas).map((c) => [c, N.situacaoCob(db, c)]).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
    const aberto = l.reduce((s, [, x]) => s + x.falta, 0), atras = l.filter(([, x]) => x.st === 'atrasada').reduce((s, [, x]) => s + x.falta, 0), sem = l.filter(([c, x]) => x.falta && c.vence >= 0 && c.vence <= 7).reduce((s, [, x]) => s + x.falta, 0), hojeL = E.lembretesHoje(db).filter(({ x }) => !empSel || E.empDe(db, x) === empSel);
    if (!l.some(([c]) => c.id === selCob)) selCob = l.find(([, s]) => s.falta)?.[0].id || l[0]?.[0].id || '';
    const regua = (c) => `<span class="regua" title="Régua: ${db.regua.dias.map((d) => (d < 0 ? `${-d} dia antes` : d === 0 ? 'no dia' : `${d} dias depois`)).join(', ')}">${db.regua.dias.map((d, i) => `<i class="${c.avisos?.includes(c.vence + d) ? 'feito' : c.vence + d === 0 ? 'hoje' : ''}">${i + 1}</i>`).join('')}</span>`;
    const sit = (c, s) => s.st === 'recebida' ? etq('recebida', 'recebida') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? etq('atrasada', `atrasada ${-c.vence} dia(s)`) : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`);
    const topo = `${cabeca('A receber e cobrança', 'Cobranças com Pix (QR e copia e cola), lembrete por WhatsApp e e-mail pela régua, juros e multa no atraso e inadimplência por cliente.', `<div class="linha">${hojeL.length ? `<button type="button" class="bt" data-acao="lembrar-todos">${IC.sino} Lembrar os de hoje (${hojeL.length})</button>` : ''}<button type="button" class="bt cheio" data-acao="nova-cob">+ Nova cobrança</button></div>`)}
      ${kpis([kpi(IC.moedas, 'Para receber', din(aberto), `${l.filter(([, s]) => s.falta).length} título(s)`), kpi(IC.alerta, 'Vencido', din(atras), '', atras ? 'ru' : '', 'receber/clientes'), kpi(IC.cal, 'Nos próximos 7 dias', din(sem)), kpi(IC.sino, 'Lembretes de hoje', String(hojeL.length), 'pela régua de cobrança', hojeL.length ? 'at' : '')])}
      ${abas(abaRec, [['cobrancas', 'Cobranças'], ['clientes', 'Inadimplência por cliente'], ['regua', 'Régua de cobrança']], 'data-aba-rec')}`;
    if (abaRec === 'clientes') {
      const inad = E.inadimplencia(db, { emp: empSel });
      return `${topo}<section class="bloco">${secao('Quem deve, por cliente', '<span class="dica">Atraso por faixa de dias (aging)</span>')}${tabela('inad', [['Cliente'], ['Em aberto', 'dir'], ['Vencido', 'dir'], ['1–30 dias', 'dir o2'], ['31–60', 'dir o2'], ['61–90', 'dir o2'], ['+90', 'dir o2'], ['Maior atraso', 'dir'], ['']], inad.map((p) => `<tr class="${p.maior > 60 ? 'atrasada' : ''}">${td('Cliente', `<b>${t(p.cli)}</b><small class="sub-l">${p.qtd} título(s)${p.recebido ? ` · já pagou ${din(p.recebido)}` : ''}</small>`)}${td('Em aberto', din(p.aberto), 'dir num')}${td('Vencido', `<b class="${p.vencido ? 'sai' : ''}">${din(p.vencido)}</b>`, 'dir num')}${td('1–30 dias', din(p.f30), 'dir num o2')}${td('31–60', din(p.f60), 'dir num o2')}${td('61–90', din(p.f90), 'dir num o2')}${td('+90', din(p.f90m), 'dir num o2')}${td('Maior atraso', p.maior ? `${p.maior} dia(s)` : '—', 'dir')}<td class="acoes">${p.vencido ? `<button type="button" class="bt pq cheio" data-acao="cobrar-cli" data-cli="${t(p.cli)}">Cobrar</button>` : ''}</td></tr>`), 'Ninguém devendo.')}
        <p class="mini">Inadimplência do período: ${din(inad.reduce((a, p) => a + p.vencido, 0))} vencidos de ${din(inad.reduce((a, p) => a + p.aberto, 0))} em aberto (${pctTxt(inad.reduce((a, p) => a + p.aberto, 0) ? inad.reduce((a, p) => a + p.vencido, 0) / inad.reduce((a, p) => a + p.aberto, 0) * 100 : 0)}).</p></section>`;
    }
    if (abaRec === 'regua') {
      return `${topo}<form class="bloco" id="f-regua">${secao('Régua de cobrança')}<p class="mini">Em que dias, contados do vencimento, o cliente recebe lembrete. Negativo = antes; 0 = no dia; positivo = depois. A tela mostra quem lembrar a cada dia; ${DEMO ? 'na demonstração o envio é simulado' : 'o WhatsApp e o e-mail abrem com a mensagem pronta para você enviar'}.</p>
        <label class="campo">Dias da régua (separados por vírgula)<input name="dias" value="${db.regua.dias.join(', ')}" ${ro('receber')}></label>
        <label class="check"><input type="checkbox" name="whatsapp" ${db.regua.whatsapp ? 'checked' : ''} ${ro('receber')}> Lembrar pelo WhatsApp</label><label class="check"><input type="checkbox" name="email" ${db.regua.email ? 'checked' : ''} ${ro('receber')}> Lembrar por e-mail</label>
        <p class="mini">Juros e multa do atraso são definidos em cada cobrança (padrão: multa de 2% e juros de 1% ao mês, pró-rata por dia).</p>${pode('receber') ? '<button class="bt cheio">Salvar a régua</button>' : ''}</form>
        <section class="bloco">${secao('Lembretes de hoje')}${hojeL.length ? tabela('lemb', [['Cliente'], ['Título'], ['Falta', 'dir'], ['Marco'], ['']], hojeL.map(({ x, s }) => `<tr>${td('Cliente', `<b>${t(x.cli)}</b>`)}${td('Título', t(x.desc))}${td('Falta', din(s.falta), 'dir num')}${td('Marco', x.vence > 0 ? `${x.vence} dia(s) antes` : x.vence === 0 ? 'no dia' : `${-x.vence} dia(s) depois`)}<td class="acoes"><button type="button" class="bt pq cheio" data-acao="cobrar" data-c="${x.id}">Lembrar</button></td></tr>`)) : '<p class="ok-tudo">Ninguém para lembrar hoje.</p>'}</section>`;
    }
    return `${topo}<div class="contas-grade"><section class="bloco">${l.length ? tabela('cobs-t', [['<input type="checkbox" class="lote-cx" data-lote-todos="rec" aria-label="Selecionar todas">'], ['Vencimento'], ['Cliente'], ['Empresa', 'o1'], ['Falta receber', 'dir'], ['Situação'], ['Régua', 'o2'], ['Ações']], l.map(([c, s]) => `<tr class="${c.id === selCob ? 'sel' : ''} ${s.st === 'atrasada' ? 'atrasada' : ''}" data-sel-cob="${c.id}" tabindex="0" role="button" aria-pressed="${c.id === selCob}"><td class="cx">${s.falta ? `<input type="checkbox" class="lote-cx" data-lote="rec" value="${c.id}" ${selRec.has(c.id) ? 'checked' : ''} aria-label="Selecionar ${t(c.cli)}">` : ''}</td>${td('Vencimento', dataC(c.vence), 'num')}${td('Cliente', `<b>${t(c.cli)}</b><small class="sub-l">${t(c.desc)}${c.cc ? ` · ${t(c.cc)}` : ''}</small>`)}${td('Empresa', t(nomeEmp(c)), 'o1')}${td('Falta', s.falta ? valorAtual(c, s.falta) : `<span class="num">${din(c.c)}</span>`, 'dir')}${td('Situação', `${sit(c, s)}${s.parcial ? ' <small>parcial</small>' : ''}`)}${td('Régua', s.falta ? regua(c) : '—', 'o2')}
        <td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="cobrar" data-c="${c.id}">Cobrar</button><button type="button" class="bt pq" data-acao="receber" data-c="${c.id}">Receber</button>` : `<button type="button" class="bt pq" data-acao="editar-cob" data-c="${c.id}">Editar</button>`}</td></tr>`)) : vazio('Nenhuma cobrança ainda. Crie a primeira e mande o Pix pelo WhatsApp ou e-mail.')}</section>
      <aside class="bloco detalhe-cob" id="det-cob">${detalheCob(selCob)}</aside></div>${barraLote('rec')}`;
  },
  pagar() {
    const q = sa(buscaPagar), bate = (x) => !q || sa(`${x.desc} ${x.cat || ''} ${x.cc || ''} ${nomeEmp(x)} ${(x.tags || []).join(' ')}`).includes(q);
    const ct = filtra(db.contas).filter(bate).map((c) => [c, N.situacaoConta(db, c)]).filter(([c, s]) => fPagar === 'todas' || (fPagar === 'abertas' && s.falta) || (fPagar === 'atrasadas' && s.st === 'atrasada') || (fPagar === 'aprovacao' && s.falta && E.estadoAprov(db, c) === 'pendente') || (fPagar === 'pagas' && s.st === 'paga')).sort(([a, x], [b, y]) => (x.falta ? 0 : 1) - (y.falta ? 0 : 1) || a.vence - b.vence);
    const fx = filtra(db.fixas).filter(bate).map((f) => [f, N.situacaoFixa(db, f)]).filter(([, s]) => fPagar === 'todas' || (fPagar === 'abertas' && s.falta) || (fPagar === 'atrasadas' && s.st === 'atrasada') || (fPagar === 'pagas' && s.st === 'paga'));
    const ab = E.abertos(db, { emp: empSel }), em30 = ab.pag.filter((r) => r.x.vence <= 30).reduce((a, r) => a + r.s.falta, 0) + ab.fx.reduce((a, r) => a + r.s.falta, 0);
    const hoje = ab.pag.filter((r) => r.x.vence === 0).reduce((a, r) => a + r.s.falta, 0) + ab.fx.filter((r) => r.s.st === 'hoje').reduce((a, r) => a + r.s.falta, 0), atr = ab.pag.filter((r) => r.s.st === 'atrasada').reduce((a, r) => a + r.s.falta, 0) + ab.fx.filter((r) => r.s.st === 'atrasada').reduce((a, r) => a + r.s.falta, 0), pa = pendAprov();
    const stC = (c, s) => s.st === 'paga' ? etq('paga', 'paga') : s.st === 'cancelada' ? etq('cancelada', 'cancelada') : s.st === 'atrasada' ? `${etq('atrasada', `atrasada ${-c.vence} dia(s)`)}` : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence ${dia(c.vence)}`);
    const stF = (s) => s.st === 'paga' ? etq('paga', `paga · ${s.rot}`) : s.st === 'pausada' ? etq('pausada', 'pausada') : s.st === 'atrasada' ? etq('atrasada', 'atrasada') : s.st === 'hoje' ? etq('hoje', 'vence hoje') : etq('', `vence em ${s.venceEm} dia(s)`);
    const ag = agendaSemana(7);
    return `${cabeca('A pagar', `Fornecedores, boletos, guias e contas fixas${db.empresas.length > 1 ? ' de todas as empresas' : ''}. ${db.alcada.limite ? `A partir de ${din(db.alcada.limite)}, o pagamento só sai depois de aprovado por outra pessoa.` : 'Aprovação por alçada desligada (ligue em Equipe e auditoria).'}`, `<div class="linha"><button type="button" class="bt" data-acao="editar-fixa">+ Conta fixa</button><button type="button" class="bt cheio" data-acao="nova-conta">+ Conta a pagar</button></div>`)}
      ${kpis([kpi(IC.cal, 'A pagar em 30 dias', din(em30)), kpi(IC.relogio, 'Vence hoje', din(hoje), '', hoje ? 'at' : ''), kpi(IC.alerta, 'Atrasado', din(atr), 'juros e multa correndo', atr ? 'ru' : ''), kpi(IC.escudo, 'Aguardando aprovação', String(pa.length), din(pa.reduce((a, c) => a + N.situacaoConta(db, c).falta, 0)), pa.length ? 'at' : '', 'aprovacoes')])}
      <div class="filtros-l"><div class="busca">${IC.busca}<input type="search" id="busca-pagar" placeholder="Fornecedor, categoria, centro de custo, tag" value="${t(buscaPagar)}" aria-label="Procurar contas a pagar"></div>
        <div class="chips" role="group" aria-label="Situação">${[['abertas', 'Em aberto'], ['atrasadas', 'Atrasadas'], ['aprovacao', 'Aguardando aprovação'], ['pagas', 'Pagas'], ['todas', 'Todas']].map(([k, n]) => `<button type="button" data-fpagar="${k}" aria-pressed="${fPagar === k}">${n}</button>`).join('')}</div></div>
      <div class="contas-grade larga"><div class="col">
      <section class="bloco">${secao('Contas avulsas e parceladas', `<span class="dica">${ct.length} conta(s)</span>`)}${tabela('pagar-t', [['<input type="checkbox" class="lote-cx" data-lote-todos="pagar" aria-label="Selecionar todas">'], ['Vencimento'], ['Fornecedor e descrição'], ['Empresa', 'o1'], ['Categoria', 'o2'], ['Centro de custo', 'o2'], ['Valor a pagar', 'dir'], ['Situação'], ['Ações']], ct.map(([c, s]) => { const lib = E.liberado(db, c); return `<tr class="${s.st === 'atrasada' ? 'atrasada' : ''} ${selPagar.has(`c:${c.id}`) ? 'sel' : ''}"><td class="cx">${s.falta && lib ? `<input type="checkbox" class="lote-cx" data-lote="pagar" value="c:${c.id}" ${selPagar.has(`c:${c.id}`) ? 'checked' : ''} aria-label="Selecionar ${t(c.desc)}">` : ''}</td>${td('Vencimento', dataC(c.vence), 'num')}${td('Fornecedor', `<b>${t(c.desc)}</b>${selos(c)} ${clipe(c)}`)}${td('Empresa', t(nomeEmp(c)), 'o1')}${td('Categoria', t(c.cat || '—'), 'o2')}${td('Centro de custo', ccTxt(c), 'o2')}${td('Valor', s.falta ? valorAtual(c, s.falta) : `<span class="num">${din(c.c)}</span>`, 'dir')}${td('Situação', `${stC(c, s)} ${s.falta ? estAprovEtq(c) : ''}${s.parcial ? ` <small>pago ${din(s.p)}</small>` : ''}`)}
          <td class="acoes">${s.falta && lib ? `<button type="button" class="bt pq cheio" data-acao="pagar-conta" data-c="${c.id}">Pagar</button>` : ''}${s.falta && E.estadoAprov(db, c) === 'pendente' && E.podeAprovar(db, usuarioAtual, c).ok ? `<button type="button" class="bt pq cheio bordo" data-acao="aprovar" data-c="${c.id}">Aprovar</button>` : ''}<button type="button" class="bt pq" data-acao="editar-conta" data-c="${c.id}">Editar</button></td></tr>`; }), 'Nenhuma conta com esse filtro.')}</section>
      <section class="bloco">${secao('Contas fixas (repetem sozinhas)')}${tabela('fixas-t', [['<input type="checkbox" class="lote-cx" data-lote-todos="fixa" aria-label="Selecionar todas as fixas">'], ['Conta'], ['Repete', 'o2'], ['Empresa', 'o1'], ['Centro de custo', 'o2'], ['Valor', 'dir'], ['Falta', 'dir'], ['Situação'], ['Ações']], fx.map(([f, s]) => `<tr class="${s.st === 'atrasada' ? 'atrasada' : ''}"><td class="cx">${s.falta ? `<input type="checkbox" class="lote-cx" data-lote="pagar" data-fixa="1" value="f:${f.id}" ${selPagar.has(`f:${f.id}`) ? 'checked' : ''} aria-label="Selecionar ${t(f.desc)}">` : ''}</td>${td('Conta', `<b>${t(f.desc)}</b>${selos(f)}`)}${td('Repete', t(N.descFreq(f)), 'o2 nw')}${td('Empresa', t(nomeEmp(f)), 'o1')}${td('Centro de custo', ccTxt(f), 'o2')}${td('Valor', din(f.c), 'dir num')}${td('Falta', din(s.falta || 0), 'dir num')}${td('Situação', `${stF(s)}${s.p && s.falta ? ` <small>pago ${din(s.p)}</small>` : ''}`)}
          <td class="acoes">${s.falta ? `<button type="button" class="bt pq cheio" data-acao="pagar-fixa" data-f="${f.id}">Pagar</button>` : ''}${s.antAberta ? `<button type="button" class="bt pq" data-acao="pagar-fixa" data-f="${f.id}" data-comp="${s.compAnt}">Pagar ${t(s.rotAnt)}</button>` : ''}<button type="button" class="bt pq" data-acao="editar-fixa" data-f="${f.id}">Editar</button></td></tr>`), 'Nenhuma conta fixa com esse filtro.')}</section></div>
      <aside class="bloco agenda-lat">${secao('Agenda da semana', '<a class="ver" href="#agenda">Abrir ›</a>')}${ag.map((x) => `<div class="ag-dia"><h3><span>${nomeDia(x.d)} · ${dataM(x.d)}</span><b class="num">${din(x.total)}</b></h3>${x.itens.length ? `<ul>${x.itens.slice(0, 5).map((i) => `<li class="${i.atras ? 'sai' : ''}"><span>${t(i.desc)}</span><b class="num">${din(i.c)}</b></li>`).join('')}${x.itens.length > 5 ? `<li class="mudo">+ ${x.itens.length - 5}</li>` : ''}</ul>` : '<p class="mini">Nada vence.</p>'}</div>`).join('')}</aside></div>
      ${barraLote('pagar')}`;
  },
  fluxo() {
    const n = horizonte, prev = E.previstos(db, n, cenario, empSel), hoje = E.saldoEmpresa(db, empSel); let s = hoje, menor = { s: hoje, dia: 0 };
    const itens = prev.map((i) => { s += i.sinal * i.c; if (s < menor.s) menor = { s, dia: i.dia }; return { ...i, saldo: s }; });
    const p = { hoje, itens, menor, fim: s, entra: prev.filter((i) => i.sinal > 0).reduce((a, i) => a + i.c, 0), sai: prev.filter((i) => i.sinal < 0).reduce((a, i) => a + i.c, 0) };
    const per = E.fluxoPeriodos(db, gran, cenario, { emp: empSel }), imp = ultimaImport(), c = db.cenarios;
    return `${cabeca('Fluxo de caixa', `Realizado (o que já entrou e saiu dos bancos) e previsto (cobranças, contas e fixas). ${empSel ? t(emp(empSel).nome) : 'Grupo todo'}. Atrasados contam como hoje.`, `<div class="chips" role="group" aria-label="Cenário">${[['otimista', 'Otimista'], ['realista', 'Realista'], ['pessimista', 'Pessimista']].map(([k, nm]) => `<button type="button" data-cen="${k}" aria-pressed="${cenario === k}">${nm}</button>`).join('')}<button type="button" class="bt pq" data-acao="cenarios">Ajustar cenários</button></div>`)}
      <p class="mini cen-txt">${cenario === 'otimista' ? `Otimista: todos pagam no prazo e as entradas previstas vêm ${c.otimista.receitaExtra}% maiores.` : cenario === 'pessimista' ? `Pessimista: ${c.pessimista.atrasa}% do que está para entrar atrasa 30 dias, ${c.pessimista.perde}% não entra e os pagamentos vêm ${c.pessimista.gastoExtra}% maiores.` : 'Realista: entra e sai exatamente o que está lançado, na data.'}</p>
      ${kpis([kpi(IC.cofre, 'Hoje nos bancos', din(p.hoje)), kpi(IC.entra, 'Deve entrar', din(p.entra), `em ${n} dias`), kpi(IC.sai, 'Deve sair', din(p.sai), `em ${n} dias`), kpi(IC.coluna, 'Termina com', din(p.fim), '', p.fim < 0 ? 'ru' : '')])}
      <section class="bloco">${secao('Por período', `<div class="chips" role="group" aria-label="Agrupar por">${[['diario', 'Diário'], ['semanal', 'Semanal'], ['mensal', 'Mensal']].map(([k, nm]) => `<button type="button" data-gran="${k}" aria-pressed="${gran === k}">${nm}</button>`).join('')}</div>`)}
        ${tabela('fluxo-p', [['Período'], ['Entrou', 'dir'], ['Saiu', 'dir'], ['Deve entrar', 'dir'], ['Deve sair', 'dir'], ['Saldo no fim', 'dir']], per.map((x) => `<tr class="${x.passado ? 'passado' : x.futuro ? 'futuro' : 'atual'} ${x.saldo < 0 ? 'atrasada' : ''}">${td('Período', `<b>${t(x.nome)}</b>${!x.passado && !x.futuro ? ' <small class="selo">agora</small>' : ''}`)}${td('Entrou', x.er ? din(x.er) : '—', 'dir num en')}${td('Saiu', x.sr ? `−${din(x.sr)}` : '—', 'dir num sai')}${td('Deve entrar', x.ep ? din(x.ep) : '—', 'dir num prev-v')}${td('Deve sair', x.sp ? `−${din(x.sp)}` : '—', 'dir num prev-v')}${td('Saldo no fim', `<b class="${x.saldo < 0 ? 'sai' : ''}">${din(x.saldo)}</b>`, 'dir num')}</tr>`))}</section>
      <div class="fluxo-grade"><section class="bloco">${p.menor.s < 0 ? `<div class="faixa-t bordo alerta-neg">${IC.alerta}<h2>Atenção: o saldo fica negativo em ${dataM(p.menor.dia)} (${din(p.menor.s)})</h2></div>` : `<div class="faixa-t ok-t">${IC.ok}<h2>Saldo positivo nos próximos ${n} dias · menor saldo ${din(p.menor.s)} em ${dataM(p.menor.dia)}</h2></div>`}
        <div class="graf-cx"><p class="graf-leg"><b>Saldo previsto dia a dia</b><span class="chips hz">${[30, 60, 90].map((d) => `<button type="button" data-hz="${d}" aria-pressed="${n === d}">${d} dias</button>`).join('')}</span></p>${grafSaldo(p, n)}</div></section>
      <section class="bloco conc-res">${titulo(IC.transf, 'Conciliação')}${imp ? `<p class="mini">Último arquivo importado</p><p><b>${t(imp.arquivo)}</b></p>` : ''}<p class="mini">${db.bancos.reduce((a, b) => a + E.pendentesConc(db, b.id).length, 0)} lançamento(s) sem conciliar.</p><a class="bt cheio" href="#conciliacao">Conciliar com o extrato</a></section></div>
      <section class="bloco">${titulo(IC.cal, 'Dia a dia previsto')}${p.itens.length ? `<div class="tab-rol"><table class="razao dia"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th class="dir">Entra</th><th class="dir">Sai</th><th class="dir">Saldo do dia</th></tr></thead><tbody><tr><td class="num">${dataC(0)}</td><td>Saldo de hoje nos bancos</td><td>—</td><td class="dir vazio">—</td><td class="dir vazio">—</td><td class="dir num"><b>${din(p.hoje)}</b></td></tr>${p.itens.map((i) => `<tr class="${i.saldo < 0 ? 'atrasada' : ''}"><td class="num">${i.atrasada ? 'atrasada' : dataC(i.dia)}</td><td>${t(i.desc)}</td><td>${i.sinal > 0 ? 'A receber' : 'A pagar'}</td><td class="dir num en${i.sinal > 0 ? '' : ' vazio'}">${i.sinal > 0 ? din(i.c) : '—'}</td><td class="dir num sai${i.sinal < 0 ? '' : ' vazio'}">${i.sinal < 0 ? `−${din(i.c)}` : '—'}</td><td class="dir num ${i.saldo < 0 ? 'sai' : ''}"><b>${din(i.saldo)}</b></td></tr>`).join('')}</tbody></table></div>` : vazio(`Nada previsto para os próximos ${n} dias.`)}</section>`;
  },
  relatorios(sub) {
    if (['dre', 'dfc', 'comparativo', 'indicadores', 'centros', 'exportar'].includes(sub)) abaRel = sub;
    const op = { emp: empSel, cc: ccSel }, per = periodoDre(perDre), ant = periodoAnterior(per);
    const topo = `${cabeca('Relatórios', `${empSel ? t(emp(empSel).nome) : 'Grupo consolidado'}${ccSel ? ` · centro de custo ${t(ccSel)}` : ''} · ${dataC(per[0])} a ${dataC(per[1])}`, `<div class="linha"><button type="button" class="bt" data-acao="imprimir">${IC.doc} Imprimir ou PDF</button><button type="button" class="bt cheio" data-acao="exportar-xlsx">${IC.dados} Excel</button></div>`)}
      ${abas(abaRel, [['dre', 'DRE'], ['dfc', 'DFC'], ['comparativo', 'Comparativo'], ['indicadores', 'Indicadores'], ['centros', 'Centros, projetos e tags'], ['exportar', 'Exportar e contador']], 'data-aba-rel')}
      ${['dre', 'dfc', 'indicadores', 'centros'].includes(abaRel) ? `<div class="filtros-l"><div class="chips" role="group" aria-label="Período">${PERIODOS_DRE.map(([k, n]) => `<button type="button" data-per-dre="${k}" aria-pressed="${perDre === k}">${n}</button>`).join('')}</div>${abaRel === 'dre' ? `<div class="chips" role="group" aria-label="Regime">${[['competencia', 'Competência'], ['caixa', 'Caixa']].map(([k, n]) => `<button type="button" data-base="${k}" aria-pressed="${baseDre === k}">${n}</button>`).join('')}</div>` : ''}</div>` : ''}`;
    if (abaRel === 'dre') {
      const d = E.dre(db, ...per, { ...op, base: baseDre }), da = E.dre(db, ...ant, { ...op, base: baseDre }), va = Object.fromEntries(da.linhas.map((l) => [l.k, l.v]));
      return `${topo}${kpis([kpi(IC.entra, 'Receita bruta', din(d.bruta), variacao(E.ah(d.bruta, da.bruta)) + ' vs. anterior'), kpi(IC.coluna, 'EBITDA', din(d.ebitda), `margem ${pctTxt(E.av(d.ebitda, d.bruta))}`), kpi(IC.moedas, 'Resultado líquido', din(d.liquido), `margem ${pctTxt(E.av(d.liquido, d.bruta))}`, d.liquido < 0 ? 'ru' : '')])}
        <section class="bloco impr">${secao(`DRE gerencial · ${baseDre === 'caixa' ? 'regime de caixa (o que entrou e saiu do banco)' : 'regime de competência (pela data do fato)'}`)}
        <div class="tab-rol"><table class="razao dre-t"><thead><tr><th>Conta</th><th class="dir">Período</th><th class="dir">AV %</th><th class="dir o1">Anterior</th><th class="dir">AH %</th></tr></thead><tbody>${d.linhas.map((l) => `<tr class="${l.total ? 'total' : 'grupo-l'} ${l.final ? 'final' : ''}"><td>${l.g && d.cats[l.g] ? `<button type="button" class="abre" data-abre="${l.k}" aria-expanded="false">${t(l.nome)}</button>` : t(l.nome)}</td><td class="dir num ${l.v < 0 ? 'sai' : ''}">${din(l.v)}</td><td class="dir num">${pctTxt(E.av(l.v, d.bruta))}</td><td class="dir num o1">${din(va[l.k] || 0)}</td><td class="dir">${variacao(E.ah(l.v, va[l.k]))}</td></tr>${l.g && d.cats[l.g] ? Object.entries(d.cats[l.g]).sort((a, b) => b[1] - a[1]).map(([c, v]) => { const sg = E.grupo(l.g).sinal, vv = sg * v, vAnt = sg * (da.cats[l.g]?.[c] || 0); return `<tr class="det" data-de="${l.k}" hidden><td><span class="cod">${E.codigoDaCat(db, c)}</span> ${t(c)}</td><td class="dir num">${din(vv)}</td><td class="dir num">${pctTxt(E.av(vv, d.bruta))}</td><td class="dir num o1">${din(vAnt)}</td><td class="dir">${variacao(E.ah(vv, vAnt))}</td></tr>`; }).join('') : ''}`).join('')}</tbody></table></div>
        <p class="mini">Fora do resultado (aparecem na DFC): ${d.fora.map((f) => `${t(f.nome)} <b class="num">${din(f.v)}</b>`).join(' · ')}.</p>
        <p class="mini">AV = quanto cada linha representa da receita bruta. AH = variação contra o período anterior de mesmo tamanho (${dataC(ant[0])} a ${dataC(ant[1])}). Toque num grupo para ver as categorias.</p></section>`;
    }
    if (abaRel === 'dfc') {
      const f = E.dfc(db, ...per, op), l = (n, v, cls = '') => `<tr class="${cls}"><td>${n}</td><td class="dir num ${v < 0 ? 'sai' : ''}">${din(v)}</td></tr>`;
      return `${topo}<section class="bloco impr">${secao('Demonstração do fluxo de caixa (método direto)')}<div class="tab-rol"><table class="razao dre-t dfc"><tbody>
        ${l('Saldo inicial dos bancos', f.inicial, 'grupo-l')}<tr class="sub-g"><td colspan="2">Atividades operacionais</td></tr>${l('Recebimentos de clientes e outras receitas', f.op.rec)}${l('(−) Pagamentos a fornecedores e custos', -f.op.forn)}${l('(−) Pessoal', -f.op.pessoal)}${l('(−) Impostos', -f.op.imp)}${l('(−) Despesas administrativas, comerciais e financeiras', -f.op.desp)}${l('= Caixa das operações', f.fop, 'total')}
        <tr class="sub-g"><td colspan="2">Atividades de investimento</td></tr>${l('(−) Compras de equipamentos e obras', -f.inv.sai)}${l('= Caixa dos investimentos', f.finv, 'total')}
        <tr class="sub-g"><td colspan="2">Atividades de financiamento</td></tr>${l('Aportes e empréstimos recebidos', f.fin.entra)}${l('(−) Retiradas e lucros distribuídos', -f.fin.sai)}${l('= Caixa dos financiamentos', f.ffin, 'total')}
        ${empSel ? l('Transferências com outras empresas do grupo', f.transf) : ''}${l('= Variação do caixa no período', f.variacao, 'total')}${l('Saldo final dos bancos', f.final, 'total final')}</tbody></table></div>
        <p class="mini">Transferências entre contas do mesmo grupo não são entrada nem saída${empSel ? ', exceto quando o dinheiro passa de uma empresa para outra' : ''}. A DFC confere com o saldo dos bancos: ${din(f.final)}.</p></section>`;
    }
    if (abaRel === 'comparativo') {
      const mesAt = N.hojeISO().slice(0, 7), ms = E.mesesAte(mesAt, 6), ds = ms.map((m) => E.dre(db, ...E.diasDoMes(m), { ...op, base: baseDre })), anoAnt = `${Number(mesAt.slice(0, 4)) - 1}${mesAt.slice(4)}`, dAA = E.dre(db, ...E.diasDoMes(anoAnt), { ...op, base: baseDre });
      const [ia] = N.periodo('ano'), acum = E.dre(db, ia, 0, { ...op, base: baseDre }), acumAnt = E.dre(db, ia - 365, -365, { ...op, base: baseDre });
      return `${topo}<div class="chips" role="group" aria-label="Comparar">${[['meses', 'Mês a mês (6 meses)'], ['anos', 'Ano contra ano']].map(([k, n]) => `<button type="button" data-modo-comp="${k}" aria-pressed="${modoComp === k}">${n}</button>`).join('')}</div>
        ${modoComp === 'meses' ? `<section class="bloco impr">${secao(`DRE mês a mês · ${baseDre === 'caixa' ? 'caixa' : 'competência'}`)}<div class="tab-rol"><table class="razao dre-t comp"><thead><tr><th>Conta</th>${ms.map((m) => `<th class="dir">${E.nomeMes(m, true)}</th>`).join('')}<th class="dir">Total</th></tr></thead><tbody>${ds[0].linhas.map((l, i) => `<tr class="${l.total ? 'total' : ''}"><td>${t(l.nome)}</td>${ds.map((d) => `<td class="dir num ${d.linhas[i].v < 0 ? 'sai' : ''}">${din(d.linhas[i].v)}</td>`).join('')}<td class="dir num"><b>${din(ds.reduce((a, d) => a + d.linhas[i].v, 0))}</b></td></tr>`).join('')}</tbody></table></div><p class="mini">Meses sem dados aparecem zerados (o Arca só soma o que foi lançado nele).</p></section>`
        : `<section class="bloco impr">${secao('Ano contra ano')}<div class="tab-rol"><table class="razao dre-t"><thead><tr><th>Conta</th><th class="dir">${E.nomeMes(mesAt, true)}</th><th class="dir">${E.nomeMes(anoAnt, true)}</th><th class="dir">AH %</th><th class="dir">Acumulado ${mesAt.slice(0, 4)}</th><th class="dir">Mesmo período ${anoAnt.slice(0, 4)}</th><th class="dir">AH %</th></tr></thead><tbody>${ds[5].linhas.map((l, i) => `<tr class="${l.total ? 'total' : ''}"><td>${t(l.nome)}</td><td class="dir num">${din(l.v)}</td><td class="dir num">${din(dAA.linhas[i].v)}</td><td class="dir">${variacao(E.ah(l.v, dAA.linhas[i].v))}</td><td class="dir num">${din(acum.linhas[i].v)}</td><td class="dir num">${din(acumAnt.linhas[i].v)}</td><td class="dir">${variacao(E.ah(acum.linhas[i].v, acumAnt.linhas[i].v))}</td></tr>`).join('')}</tbody></table></div><p class="mini">${dAA.bruta || acumAnt.bruta ? '' : 'Ainda não há dados do ano passado no Arca: a comparação começa a valer depois de 12 meses de uso (ou importando o histórico pela Conciliação).'}</p></section>`}`;
    }
    if (abaRel === 'indicadores') {
      const x = E.indicadores(db, ...per, { emp: empSel }), dias = (v) => (v === null ? '—' : `${Math.round(v)} dias`);
      const card = (nome, v, explica, cls = '') => `<div class="ind ${cls}"><small>${nome}</small><b class="num">${v}</b><p>${explica}</p></div>`;
      return `${topo}<section class="bloco impr">${secao('Indicadores do período (competência)')}<div class="inds">
        ${card('Margem bruta', pctTxt(x.margemBruta), 'Lucro bruto ÷ receita bruta. Quanto sobra das vendas depois do custo da mercadoria e dos impostos sobre a venda.')}
        ${card('EBITDA', din(x.ebitda), `Resultado das operações antes de juros, impostos sobre o lucro e investimentos. Margem EBITDA: ${pctTxt(x.margemEbitda)}.`, x.ebitda < 0 ? 'ru' : '')}
        ${card('Margem líquida', pctTxt(x.margemLiquida), 'Resultado líquido ÷ receita bruta.', x.margemLiquida < 0 ? 'ru' : '')}
        ${card('Prazo médio de recebimento', dias(x.pmr), `Contas a receber em aberto (${din(x.aReceber)}) ÷ receita média por dia.`)}
        ${card('Prazo médio de pagamento', dias(x.pmp), `Contas a pagar em aberto (${din(x.aPagar)}) ÷ custos e despesas médios por dia.`)}
        ${card('Capital de giro', din(x.capitalGiro), `Caixa (${din(x.caixa)}) + a receber − a pagar. Necessidade de capital de giro (a receber − a pagar): ${din(x.ncg)}.`, x.capitalGiro < 0 ? 'ru' : '')}
        ${card('Margem de contribuição', pctTxt(x.margemContrib), 'O que sobra de cada real vendido depois dos custos variáveis (mercadoria, frete e impostos sobre a venda).')}
        ${card('Ponto de equilíbrio', x.pontoEquilibrio === null ? '—' : `${din(x.pontoEquilibrio)}/mês`, `Faturamento mínimo para pagar as despesas fixas (${din(x.fixasMes)} por mês). Ritmo atual: ${din(x.receitaMes)} por mês.`, x.pontoEquilibrio && x.receitaMes < x.pontoEquilibrio ? 'ru' : '')}
        ${(() => { const pe = x.pontoEquilibrio, folga = pe ? (x.receitaMes - pe) / x.receitaMes * 100 : null; return card('Margem de segurança', pctTxt(folga), 'Quanto o faturamento pode cair antes de dar prejuízo.', folga !== null && folga < 10 ? 'ru' : ''); })()}
        </div><p class="mini">Fórmulas gerenciais simplificadas para decisão do dia a dia. Para o balanço oficial, use os números do seu contador.</p></section>`;
    }
    if (abaRel === 'centros') {
      const it = E.itensResultado(db, ...per, { base: 'competencia', emp: empSel }), por = (f) => { const o = {}; it.forEach((i) => { const k = f(i); if (!k) return; o[k] ||= { en: 0, sa: 0 }; o[k][i.tipo === 'entra' ? 'en' : 'sa'] += i.c; }); return Object.entries(o).sort((a, b) => b[1].en + b[1].sa - a[1].en - a[1].sa); };
      const ms = db.movs.filter((m) => m.dia >= per[0] && m.dia <= per[1] && (m.tipo === 'entra' || m.tipo === 'sai') && (!empSel || E.empDe(db, m) === empSel));
      const porX = (k) => { const o = {}; ms.forEach((m) => (k === 'tags' ? m.tags || [] : m.proj ? [m.proj] : []).forEach((g) => { o[g] ||= { en: 0, sa: 0 }; o[g][m.tipo === 'entra' ? 'en' : 'sa'] += m.c; })); return Object.entries(o); };
      const tab = (nome, l) => tabela('por-x', [[nome], ['Entradas', 'dir'], ['Saídas', 'dir'], ['Resultado', 'dir']], l.map(([k, v]) => `<tr>${td(nome, t(k || 'Sem centro de custo'))}${td('Entradas', din(v.en), 'dir num en')}${td('Saídas', `−${din(v.sa)}`, 'dir num sai')}${td('Resultado', din(v.en - v.sa), `dir num ${v.en - v.sa < 0 ? 'sai' : ''}`)}</tr>`), 'Nada no período.');
      return `${topo}<div class="grade-2"><section class="bloco impr">${secao('Por centro de custo (com rateio)')}${tab('Centro de custo', por((i) => i.cc || 'Sem centro de custo'))}<p class="mini">Lançamentos rateados entram em cada centro pela sua parte.</p></section>
        <div class="col"><section class="bloco impr">${secao('Por projeto')}${tab('Projeto', porX('proj'))}</section><section class="bloco impr">${secao('Por tag')}${tab('Tag', porX('tags'))}</section></div></div>
        <section class="bloco impr">${secao('Por empresa')}${tabela('por-x', [['Empresa'], ['Regime', 'o1'], ['Receita bruta', 'dir'], ['EBITDA', 'dir'], ['Resultado', 'dir']], db.empresas.map((e) => { const d = E.dre(db, ...per, { emp: e.id, base: 'competencia' }); return `<tr>${td('Empresa', `<b>${t(e.nome)}</b>`)}${td('Regime', REGIMES[e.regime] || '', 'o1')}${td('Receita bruta', din(d.bruta), 'dir num')}${td('EBITDA', din(d.ebitda), 'dir num')}${td('Resultado', din(d.liquido), `dir num ${d.liquido < 0 ? 'sai' : ''}`)}</tr>`; }))}</section>`;
    }
    return `${topo}<div class="grade-2"><section class="bloco">${secao('Planilhas')}<p class="mini">Excel com uma aba para cada relatório: lançamentos, DRE (competência e caixa), DFC, a pagar, a receber, inadimplência e plano de contas.</p><div class="linha"><button type="button" class="bt cheio" data-acao="exportar-xlsx">${IC.dados} Baixar Excel (.xlsx)</button><button type="button" class="bt" data-acao="exportar">Lançamentos em CSV</button></div>
        <p class="mini">PDF: abra o relatório (DRE, DFC, comparativo ou indicadores) e use <b>Imprimir ou PDF</b>; sai só o relatório, sem menu.</p></section>
      <section class="bloco">${secao('Para o contador')}<p class="mini">Pacote do mês fechado para o escritório de contabilidade: lançamentos com o código do plano de contas, conta bancária, CNPJ da empresa, centro de custo e histórico, mais o resumo por categoria (balancete gerencial) e a conferência dos saldos bancários.</p>
        <label class="campo">Mês<select id="mes-contador">${E.mesesAte(N.hojeISO().slice(0, 7), 6).reverse().map((m) => `<option value="${m}" ${m === (db.fechado || '') ? 'selected' : ''}>${E.nomeMes(m)}${db.fechado && m <= db.fechado ? ' (fechado)' : ''}</option>`).join('')}</select></label>
        <div class="linha"><button type="button" class="bt cheio" data-acao="exportar-contador">${IC.dados} Baixar o pacote do contador</button>${db.usuarios.some((u) => u.perfil === 'contador') ? `<button type="button" class="bt" data-acao="enviar-contador">Enviar ao contador por e-mail</button>` : ''}</div>
        <p class="mini">Integração direta com sistemas contábeis (Domínio, Alterdata, Questor): <b>em breve</b>.</p></section></div>`;
  },
  impostos() {
    const mes = N.hojeISO().slice(0, 7), mesAnt = E.mesesAte(mes, 2)[0], emps = empSel ? [emp(empSel)] : db.empresas, cal = E.calendarioImpostos(db, 60).filter((x) => !empSel || x.emp === empSel);
    const provs = emps.map((e) => ({ e, p: E.provisaoImpostos(db, e.id, mesAnt), pAt: E.provisaoImpostos(db, e.id, mes) }));
    const mei = emps.some((e) => e.regime === 'mei'), f = N.faturamentoAno(db), sd = N.saldos(db), uso = f.total / N.LIMITE_MEI, das = dasFixa(), sdas = das ? N.situacaoFixa(db, das) : null;
    const pagosAno = db.movs.filter((m) => m.tipo === 'sai' && m.dia >= N.periodo('ano')[0] && ['deducao', 'ir'].includes(E.grupoDaCat(db, E.catDe(m), 'sai')) && (!empSel || E.empDe(db, m) === empSel)).reduce((a, m) => a + m.c, 0);
    const lancado = (x) => db.contas.some((c) => c.guia === `${x.emp}:${x.nome}:${x.mesAp}`);
    return `${cabeca('Impostos', 'Provisão pelo regime de cada empresa (Simples, Presumido ou Real) e o calendário de vencimentos. São estimativas para guardar o dinheiro antes: o cálculo oficial e as guias continuam com o seu contador.')}
      ${kpis([kpi(IC.coluna, 'Provisão do mês passado', din(provs.reduce((a, x) => a + x.p.total, 0)), `vence neste mês · ${E.nomeMes(mesAnt, true)}`), kpi(IC.relogio, 'Provisão do mês corrente', din(provs.reduce((a, x) => a + x.pAt.total, 0)), 'até hoje'), kpi(IC.cofre, 'Reserva de impostos', din(sd.imposto || 0)), kpi(IC.sai, 'Impostos pagos no ano', din(pagosAno))])}
      <section class="bloco">${secao('Calendário de vencimentos (60 dias)')}${tabela('cal-imp', [['Vence'], ['Guia'], ['Empresa', 'o1'], ['Apuração', 'o2'], ['Valor estimado', 'dir'], ['']], cal.map((x) => `<tr class="${x.dia < 0 ? 'atrasada' : ''}">${td('Vence', `${dataC(x.dia)}${x.dia <= 3 && x.dia >= 0 ? ' <small class="etq at">perto</small>' : ''}`, 'num')}${td('Guia', `<b>${t(x.nome)}</b>`)}${td('Empresa', t(x.empNome), 'o1')}${td('Apuração', E.nomeMes(x.mesAp, true), 'o2')}${td('Valor', x.c ? din(x.c) : '<small class="mudo">vem da folha / contador</small>', 'dir num')}<td class="acoes">${x.c ? (lancado(x) ? '<small class="etq ok">em A pagar</small>' : `<button type="button" class="bt pq" data-acao="lancar-guia" data-emp="${x.emp}" data-nome="${t(x.nome)}" data-mes="${x.mesAp}" data-dia="${x.dia}" data-c="${x.c}">Lançar em A pagar</button>`) : ''}</td></tr>`), 'Nada vence nos próximos 60 dias.')}</section>
      ${provs.map(({ e, p }) => `<section class="bloco">${secao(`${t(e.nome)} · ${REGIMES[e.regime] || ''}`, `<span class="dica">${t(e.cnpj || '')} · receita de ${E.nomeMes(mesAnt, true)}: <b class="num">${din(p.receita)}</b></span>`)}${p.itens.length ? tabela('prov', [['Tributo'], ['Base', 'dir o1'], ['Alíquota', 'dir'], ['Provisão', 'dir']], p.itens.map((i) => `<tr>${td('Tributo', t(i.nome))}${td('Base', i.base !== undefined ? din(i.base) : '—', 'dir num o1')}${td('Alíquota', i.aliq !== undefined ? pctTxt(i.aliq, 2) : '—', 'dir num')}${td('Provisão', i.c ? din(i.c) : `<small class="mudo">${t(i.nota || '—')}</small>`, i.c ? 'dir num' : 'dir')}</tr>`).concat(`<tr class="total"><td>Total</td><td class="o1"></td><td></td><td class="dir num">${din(p.total)}</td></tr>`)) : vazio('Sem tributos para provisionar.')}${pode('cadastros') ? `<div class="linha"><label class="campo inline">Regime<select data-regime-emp="${e.id}">${Object.entries(REGIMES).map(([k, n]) => `<option value="${k}" ${e.regime === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button type="button" class="bt pq" data-acao="aliquotas" data-regime="${e.regime}">Alíquotas do ${t(REGIMES[e.regime] || '')}</button></div>` : ''}</section>`).join('')}
      ${mei ? `<section class="bloco">${titulo(IC.coluna, 'Limite do MEI')}<div class="medidor"><i class="${uso > 0.8 ? 'perto' : ''}" style="width:${Math.min(100, uso * 100)}%"></i></div><p class="mini">${Math.round(uso * 100)}% do limite de ${din(N.LIMITE_MEI)}.</p>
        <p><b>DAS do mês</b> ${das ? `· ${din(das.c)} · vence dia ${das.dia} · ${sdas.st === 'paga' ? etq('paga', 'pago') : sdas.st === 'atrasada' ? etq('atrasada', 'atrasado') : etq('hoje', 'a pagar')}` : ''}</p><div class="linha">${das ? (sdas.falta ? `<button type="button" class="bt cheio" data-acao="pagar-fixa" data-f="${das.id}">Paguei o DAS</button>` : '') + `<button type="button" class="bt" data-acao="editar-fixa" data-f="${das.id}">Editar o DAS</button>` : '<button type="button" class="bt cheio" data-acao="editar-fixa" data-das="1">Cadastrar o DAS</button>'}<button type="button" class="bt" data-acao="dasn">Resumo para a declaração anual (DASN-SIMEI)</button></div></section>` : ''}
      <section class="bloco">${titulo(IC.recibo, 'Recibos')}<p class="mini">Para cliente que pede comprovante. Cada recibo ganha número e fica guardado. Nota fiscal (NF-e e NFS-e) não é emitida pelo Arca: <b>em breve</b>.</p><div class="linha"><button type="button" class="bt" data-acao="recibo">Fazer um recibo</button><a class="bt" href="#recibos">Ver os recibos</a></div></section>`;
  },
  mais() {
    const l = [['caixa', 'Contas e saldos', 'bancos, transferências e reservas', IC.cofre], ['lancamentos', 'Lançamentos', 'o livro-razão completo', IC.livro], ['pagar', 'A pagar', 'fornecedores, boletos e fixas', IC.doc], ['aprovacoes', 'Aprovações', `${pendAprov().length} esperando`, IC.escudo], ['receber', 'A receber e cobrança', 'Pix, régua e inadimplência', IC.cobrar], ['conciliacao', 'Conciliação', 'extrato OFX/CSV e regras', IC.transf], ['fluxo', 'Fluxo de caixa', 'realizado, previsto e cenários', IC.cal], ['orcamento', 'Orçamento', 'orçado x realizado', IC.coluna], ['relatorios', 'Relatórios', 'DRE, DFC, indicadores e exportar', IC.doc], ['impostos', 'Impostos', 'provisão e calendário', IC.coluna], ['plano', 'Plano de contas', 'categorias, centros e projetos', IC.livro], ['equipe', 'Equipe e auditoria', 'perfis, alçada e fechamento', IC.equipe], ['ia', 'Assistente', 'pergunte sobre o caixa', IC.ia], ['hoje', 'Pendências', `${N.pendencias(db).length} agora`, IC.alerta], ['recibos', 'Recibos', 'emitidos e numerados', IC.recibo], ['config/cfg-assinatura', 'Minha assinatura', 'plano, renovar e cancelar', IC.cartao], ['config', 'Configurações', 'perfil, cores, marca, empresas e avisos', IC.ajustes]];
    return `${cabeca('Mais')}<div class="bloco lista-mais">${[...l, ['config/cfg-guia', 'Guia: como usar', 'um passo a passo de cada tela', IC.livro]].filter((x, i, v) => v.findIndex((y) => y[0] === x[0]) === i).map(([k, n, s, ic]) => `<a href="#${k}"><span class="ic">${ic}</span><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div>`;
  },
  conciliacao() {
    if (previa) return T.importar();
    const bs = db.bancos.filter((b) => !empSel || b.emp === empSel); if (!bs.some((b) => b.id === bancoConc)) bancoConc = bs[0]?.id || '';
    const b = banco(bancoConc), pend = E.pendentesConc(db, bancoConc), sb = E.saldosBancos(db), conc = db.movs.filter((m) => E.bancoDe(db, m) === bancoConc && m.conc).length, imp = ultimaImport();
    const temCopia = (() => { try { return !!localStorage.getItem(`${CHAVE}-copia-formato1:${CONTA}`) || !!localStorage.getItem(`${CHAVE}-antes-de-restaurar:${CONTA}`); } catch { return false; } })();
    return `${cabeca('Conciliação bancária', 'Traga o extrato (OFX ou CSV) de cada conta: o Arca sugere o par de cada linha com o que já está lançado, aplica as suas regras e mostra o que é novo antes de gravar.')}
      <div class="abas contas-abas" role="tablist">${bs.map((x) => `<button type="button" role="tab" data-banco-conc="${x.id}" aria-selected="${x.id === bancoConc}"><b>${t(x.nome)}</b><small>${t(emp(x.emp)?.nome)} · ${E.pendentesConc(db, x.id).length} sem conciliar</small></button>`).join('')}</div>
      ${b ? `${kpis([kpi(IC.cofre, 'Saldo no Arca', din(sb[b.id] || 0)), kpi(IC.alerta, 'Sem conciliar', String(pend.length), din(pend.reduce((a, m) => a + (m.tipo === 'sai' ? -m.c : m.c), 0)), pend.length ? 'at' : ''), kpi(IC.ok, 'Conferidos', String(conc)), kpi(IC.dados, 'Último arquivo', imp ? t(imp.arquivo) : '—')])}
      <div class="grade-2"><section class="bloco">${secao(`Importar extrato · ${t(b.nome)}`)}<p class="mini">No CSV, a primeira linha precisa ter os nomes das colunas, com "Data" e "Valor" (ou "Entrada" e "Saída"). Nada é gravado antes de você conferir.</p>
          <div class="linha"><label class="bt cheio">Escolher arquivo OFX ou CSV<input type="file" id="arq-extrato" accept=".ofx,.csv,.txt" hidden></label>${DEMO ? '<button type="button" class="bt" data-acao="extrato-exemplo">Usar um extrato de exemplo</button>' : ''}</div>
          <p class="mini">Conexão direta com o banco (Open Finance), para o extrato chegar sozinho: <b>em breve</b>.</p></section>
        <section class="bloco">${secao('Regras de conciliação', pode('conciliar') ? '<button type="button" class="bt pq" data-acao="regra-nova">+ Regra</button>' : '')}<p class="mini">Linha do extrato que contém o texto vira lançamento com a categoria da regra.</p>${tabela('regras', [['Se a descrição contém'], ['Tipo'], ['Vai para'], ['']], db.regras.map((r) => `<tr>${td('Contém', `<b>${t(r.contem)}</b>`)}${td('Tipo', r.tipo === 'entra' ? 'entrada' : r.tipo === 'sai' ? 'saída' : 'qualquer')}${td('Vai para', `${t(r.cat)}${r.cc ? ` · ${t(r.cc)}` : ''}`)}<td class="acoes"><button type="button" class="bt pq" data-acao="regra-tira" data-r="${r.id}">Tirar</button></td></tr>`), 'Nenhuma regra ainda.')}</section></div>
      <section class="bloco">${secao(`Lançados no Arca e ainda não vistos no extrato (${pend.length})`)}${tabela('pend-conc', [['Data'], ['Descrição'], ['Categoria', 'o1'], ['Valor', 'dir'], ['']], ordenaMovs(pend).slice(0, 60).map((m) => `<tr>${td('Data', dataC(m.dia), 'num')}${td('Descrição', t(m.desc))}${td('Categoria', t(E.catDe(m)), 'o1')}${td('Valor', valorMov(m), 'dir')}<td class="acoes"><button type="button" class="bt pq" data-acao="conc-manual" data-m="${m.id}">Conferido</button></td></tr>`), 'Tudo conferido nesta conta.')}</section>` : vazio('Cadastre uma conta bancária em Contas e saldos.')}
      <div class="grade-2"><section class="bloco">${titulo(IC.dados, 'Baixar os lançamentos')}<p class="mini">Planilha que abre no Excel e no Google Planilhas.</p><div class="linha"><button type="button" class="bt" data-acao="exportar">Baixar CSV</button><button type="button" class="bt" data-acao="exportar-xlsx">Excel completo</button></div></section>
      <section class="bloco">${titulo(IC.escudo, 'Cópia de segurança')}<p class="mini">Um arquivo com tudo. Restaurar troca os dados atuais, que ficam guardados neste aparelho caso precise voltar.</p><div class="linha"><button type="button" class="bt" data-acao="copia">Baixar cópia</button><label class="bt">Restaurar uma cópia<input type="file" id="restaurar" accept=".json" hidden></label>${temCopia ? '<button type="button" class="bt" data-acao="voltar-copia">Voltar a versão anterior</button>' : ''}</div></section></div>`;
  },
  importar() {
    if (!previa) return T.conciliacao();
    const b = banco(previa.banco), l = previa.linhas, n = (k) => l.filter((x) => x.acao === k).length, cats = (tipo) => E.catsDoTipo(db, tipo);
    return `<a class="voltar" href="#conciliacao" data-acao="cancelar-imp">‹ Cancelar</a>${cabeca('Conferir o extrato antes de gravar', `${t(previa.arquivo)} · ${t(b?.nome || '')}: ${l.length} linha(s)${previa.erros.length ? `, ${previa.erros.length} com problema` : ''}.`)}
      ${kpis([kpi(IC.ok, 'Par sugerido', String(n('par')), 'concilia com o que já está lançado'), kpi(IC.ajustes, 'Pela regra', String(n('regra'))), kpi(IC.entra, 'Novas', String(n('novo'))), kpi(IC.livro, 'Já conciliadas', String(n('ja')))])}
      ${previa.erros.length ? `<details class="bloco"><summary><b>Linhas que não entram (${previa.erros.length})</b></summary>${previa.erros.slice(0, 30).map((e) => `<p class="mini">Linha ${e.linha}: ${t(e.motivo)}</p>`).join('')}</details>` : ''}
      <form id="f-imp" class="bloco"><div class="linha"><label class="campo inline">As saídas novas saem da reserva<select name="pote">${opPotes('contas')}</select></label><label class="check"><input type="checkbox" name="receita" checked> As entradas novas são receita</label></div>
      ${tabela('conc-t', [['Data'], ['No extrato'], ['Valor', 'dir'], ['Sugestão do Arca'], ['O que fazer'], ['Categoria']], l.map((x, i) => { const par = x.par && db.movs.find((m) => m.id === x.par); return `<tr class="${x.acao === 'ja' ? 'dup' : ''}">${td('Data', dataC(x.dia), 'num')}${td('No extrato', t(x.desc))}${td('Valor', `<span class="num ${x.tipo === 'sai' ? 'sai' : 'en'}">${x.tipo === 'sai' ? '−' : ''}${din(x.c)}</span>`, 'dir')}${td('Sugestão', x.acao === 'par' ? `<span class="etq ok">par sugerido ${x.conf}%</span><small class="sub-l">${t(par?.desc || '')} · ${dataM(par?.dia ?? 0)}</small>` : x.acao === 'regra' ? `<span class="etq at">regra: ${t(x.cat)}</span>` : x.acao === 'ja' ? '<span class="etq">já conciliada</span>' : '<span class="etq">nova</span>')}
        ${td('O que fazer', x.acao === 'ja' ? '—' : `<select name="a${i}" aria-label="O que fazer com ${t(x.desc)}">${x.acao === 'par' ? '<option value="par">Conciliar com o par</option>' : ''}<option value="novo" ${x.acao !== 'par' ? 'selected' : ''}>Lançar como novo</option><option value="ignorar">Ignorar</option></select>`)}${td('Categoria', x.acao === 'ja' || x.acao === 'par' ? (par ? t(E.catDe(par)) : '—') : `<select name="c${i}" aria-label="Categoria de ${t(x.desc)}">${cats(x.tipo).map((c) => `<option ${c === (x.cat || (x.tipo === 'entra' ? E.CAT_ENTRADA : N.categoriaSugerida(x.desc) || 'Outros')) ? 'selected' : ''}>${t(c)}</option>`).join('')}</select>`)}</tr>`; }))}
      <div class="salvar-fixo"><button class="bt cheio largo">Gravar a conciliação</button></div></form>`;
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
    // a assinatura fica em Configurações (bloco compartilhado). Aqui: o mesmo bloco, mais o "Pagar aqui" da demonstração quando a simulação do site deixa a assinatura vencida
    const a = db.assinatura;
    return `${cabeca('Minha assinatura', `A mesma da sua conta no site. Sem fidelidade.${DEMO ? ' Nesta demonstração os pagamentos são simulados.' : ''}`)}
      ${DEMO && a.status === 'vencida' ? `<section class="bloco alerta"><b class="sai">Assinatura vencida (simulação)</b><p class="mini">O pagamento de ${din(a.valor * 100)} não foi aprovado. Seus dados estão guardados.</p><div class="linha"><button type="button" class="bt cheio" data-acao="pagar">Pagar aqui</button></div></section>` : ''}
      <div id="ass-slot"></div><p class="mini" style="margin-top:12px"><a href="#config">Voltar para Configurações</a></p>`;
  },
  equipe() {
    const real = !!document.querySelector('[data-vc="equipe"]'), aud = db.historico.slice(0, 150), meses = E.mesesAte(N.hojeISO().slice(0, 7), 6).slice(0, 5);
    const mat = Object.keys(E.PERFIS).map((p) => `<tr>${td('Perfil', `<b>${E.PERFIS[p].nome}</b><small class="sub-l">${E.PERFIS[p].desc}</small>`)}${['lancar', 'pagar', 'receber', 'conciliar', 'aprovar', 'exportar', 'cadastros', 'fechar', 'equipe'].map((a) => td(a, E.pode(p, a) ? '<span class="sim" aria-label="sim">✓</span>' : '<span class="mudo" aria-label="não">—</span>', 'cen')).join('')}</tr>`);
    return `${cabeca('Equipe e auditoria', 'Quem usa o Arca, com qual perfil, quem aprova pagamentos, o registro de tudo que foi feito e o fechamento do mês.')}
      <section class="bloco">${secao('Pessoas e perfis', pode('equipe') ? '<button type="button" class="bt cheio pq" data-acao="usuario-ed">+ Pessoa</button>' : '')}${tabela('usuarios', [['Pessoa'], ['Perfil'], ['Contato', 'o1'], ['']], db.usuarios.map((u) => `<tr class="${u.id === usuarioAtual.id ? 'sel' : ''}">${td('Pessoa', `<b>${t(u.nome)}</b>${u.id === usuarioAtual.id ? ' <small class="selo">você agora</small>' : ''}`)}${td('Perfil', E.PERFIS[u.perfil]?.nome || u.perfil)}${td('Contato', t(u.contato || '—'), 'o1')}<td class="acoes"><button type="button" class="bt pq" data-acao="usar-como" data-u="${u.id}">Usar como</button><button type="button" class="bt pq" data-acao="usuario-ed" data-u="${u.id}">Editar</button></td></tr>`))}
        <p class="mini">${DEMO ? 'Na demonstração, "Usar como" troca a pessoa para você ver o Arca de cada perfil (o aprovador vê os pagamentos para aprovar; o contador só vê e exporta).' : 'Cada computador escolhe quem está usando (botão com o nome, no topo). O login de cada pessoa e o acesso "só ver" são da equipe da sua conta.'}</p>
        ${real ? '<button type="button" class="bt" data-acao="equipe">Logins e convites da conta</button>' : ''}</section>
      <section class="bloco">${secao('O que cada perfil faz')}<div class="tab-rol"><table class="razao cartoes matriz"><thead><tr><th>Perfil</th>${['Lançar', 'Pagar', 'Receber', 'Conciliar', 'Aprovar', 'Exportar', 'Cadastros', 'Fechar mês', 'Equipe'].map((n) => `<th class="cen">${n}</th>`).join('')}</tr></thead><tbody>${mat.join('')}</tbody></table></div></section>
      <div class="grade-2"><form class="bloco" id="f-alcada">${secao('Alçada de aprovação')}<p class="mini">Pagamento igual ou acima deste valor só sai depois de aprovado por um aprovador ou pelo dono, e nunca por quem lançou. Deixe 0 para não usar aprovação.</p><label class="campo">Valor a partir do qual precisa aprovar (R$)<input name="v" inputmode="decimal" value="${((db.alcada.limite || 0) / 100).toFixed(2).replace('.', ',')}" ${ro('equipe')}></label>${pode('equipe') ? '<button class="bt cheio">Salvar a alçada</button>' : ''}</form>
        <section class="bloco">${secao('Fechamento de período')}<p class="mini">Mês fechado não aceita lançamento, edição nem exclusão (a DRE do contador não muda depois de entregue). ${db.fechado ? `Fechado até <b>${E.nomeMes(db.fechado)}</b>.` : 'Nenhum mês fechado.'}</p>
          ${pode('fechar') ? `<div class="linha"><label class="campo inline">Fechar até<select id="mes-fechar">${meses.filter((m) => m < N.hojeISO().slice(0, 7)).map((m) => `<option value="${m}" ${m === db.fechado ? 'selected' : ''}>${E.nomeMes(m)}</option>`).join('')}</select></label><button type="button" class="bt cheio" data-acao="fechar-mes">Fechar</button>${db.fechado ? '<button type="button" class="bt perigo" data-acao="reabrir-mes">Reabrir o último mês</button>' : ''}</div>` : '<p class="mini">Só o dono fecha e reabre.</p>'}</section></div>
      <section class="bloco">${secao('Auditoria · quem fez o quê', `<select id="aud-pessoa" aria-label="Filtrar por pessoa"><option value="">Todas as pessoas</option>${db.usuarios.map((u) => `<option value="${u.id}">${t(u.nome)}</option>`).join('')}</select>`)}${tabela('auditoria', [['Quando'], ['Quem'], ['O que aconteceu']], aud.map((h) => `<tr data-por="${t(h.por || '')}">${td('Quando', h.quando ? new Date(h.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : dia(h.dia), 'num nw')}${td('Quem', t(nomeUsu(h.por) || '—'))}${td('O que', t(h.oque))}</tr>`), 'Nada registrado ainda.')}<p class="mini">Guardamos os ${aud.length} registros mais novos (até 300).</p></section>`;
  },
  config() {
    const f = N.faturamentoAno(db), u = usuarioAtual || {}, cargo = E.PERFIS[u.perfil]?.nome || 'Equipe', tm = db.tema && TEMAS.some((x) => x[0] === db.tema) ? db.tema : 'tesouro';
    const secs = [['cfg-perfil', 'Perfil'], ['cfg-cores', 'Cores'], ['cfg-marca', 'Sua marca'], ['cfg-guia', 'Guia'], ['cfg-empresa', 'Empresas e avisos'], ['cfg-mais', 'Outras configurações'], ['cfg-assinatura', 'Minha assinatura']];
    return `${cabeca('Configurações', 'Seu perfil, as cores, a marca do grupo, o guia, as empresas, os avisos e a sua assinatura.')}
      <nav class="cfg-nav" aria-label="Seções das Configurações">${secs.map(([id, n]) => `<a href="#config/${id}">${n}</a>`).join('')}</nav>
      <div class="rel-grade">
      <section class="bloco cfg-sec" id="cfg-perfil">${titulo(IC.equipe, 'Perfil')}
        <div class="cfg-eu"><span class="cfg-foto">${u.foto ? `<img src="${t(u.foto)}" alt="">` : t(iniciais(u.nome))}</span><div><b>${t(u.nome || '—')}</b><small>${t(cargo)} · ${t(db.negocio)}</small></div></div>
        <label class="campo">E-mail da conta<input id="cfg-email" readonly value="${t(u.contato || '')}" aria-describedby="cfg-email-d"><small id="cfg-email-d" class="mini">Só leitura: é o e-mail do login.</small></label>
        <label class="campo">Cargo<input readonly value="${t(cargo)}"></label>
        <div class="linha"><label class="bt pq cheio" for="foto-eu">${u.foto ? 'Trocar foto' : 'Pôr foto'}</label><input type="file" id="foto-eu" accept="image/*" class="sr">${u.foto ? '<button type="button" class="bt pq" data-acao="tira-foto-eu">Tirar foto</button>' : ''}${pode('equipe') ? `<button type="button" class="bt pq" data-acao="usuario-ed" data-u="${t(u.id || '')}">Editar nome</button>` : ''}<button type="button" class="bt pq" data-acao="trocar-usuario">Trocar quem está usando</button><button type="button" class="bt pq" data-acao="trocar-senha" data-so-conta hidden>Trocar a senha do login</button><button type="button" class="bt pq" data-acao="sair-conta" data-so-conta hidden>Sair</button></div></section>
      <section class="bloco cfg-sec" id="cfg-cores">${titulo(IC.cofre, 'Esquema de cores')}<p class="mini">A cor vale no Arca inteiro: menu, botões, gráficos, recibos e o topo. Quem usa o Arca com você vê igual.</p>
        <div class="temas">${TEMAS.map(([k, n, a, b]) => `<button type="button" data-tema="${k}" aria-pressed="${tm === k}" style="--a:${a};--b:${b}" ${ro()}><i aria-hidden="true"></i>${n}</button>`).join('')}</div>
        ${pode('cadastros') ? '' : '<p class="mini">Só quem cuida dos cadastros troca as cores.</p>'}</section>
      </div>
      <section class="bloco cfg-sec" id="cfg-marca">${titulo(IC.escudo, 'Sua marca')}<p class="mini">A logo e o nome do grupo aparecem no topo, nos recibos e nas cobranças por Pix e WhatsApp.</p>
        <div class="cfg-eu"><span class="cfg-logo">${db.logo ? `<img src="${t(db.logo)}" alt="Logo de ${t(db.negocio)}">` : t(iniciais(db.negocio))}</span>${pode('cadastros') ? `<div class="linha"><label class="bt pq cheio" for="logo-in">${db.logo ? 'Trocar logo' : 'Pôr a logo'}</label><input type="file" id="logo-in" accept="image/*" class="sr">${db.logo ? '<button type="button" class="bt pq" data-acao="tira-logo">Tirar</button>' : ''}</div>` : `<div><b>${t(db.negocio)}</b></div>`}</div>
        <div class="cfg-campos">${[['negocio', 'Nome do grupo (aparece no topo)'], ['dono', 'Nome do responsável (assina os recibos)'], ['cnpj', 'CNPJ (vai nos recibos)'], ['pix', 'Chave Pix das cobranças'], ['cidade', 'Cidade (vai no Pix)']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k] || '')}" maxlength="80" ${ro()}></label>`).join('')}</div></section>
      <section class="bloco cfg-sec" id="cfg-guia">${titulo(IC.livro, 'Guia: como usar')}<p class="mini">Um passo a passo curto de cada tela. No computador, abre a qualquer hora pelo botão <b>?</b> no topo; no celular, em Mais, “Guia: como usar”.</p>
        <div class="cfg-como">${COMO_ORDEM.map((k) => `<button type="button" class="bt pq" data-como="${k}">${t(COMO[k][0])}</button>`).join('')}</div>
        <div class="linha"><button type="button" class="bt pq" data-acao="atalhos">Atalhos de teclado</button></div></section>
      <section class="bloco cfg-sec" id="cfg-empresa">${secao('Empresas do grupo', pode('cadastros') ? '<button type="button" class="bt pq cheio" data-acao="empresa-ed">+ Empresa</button>' : '')}${tabela('emps', [['Empresa'], ['CNPJ'], ['Regime'], ['Contas', 'dir'], ['']], db.empresas.map((e) => `<tr>${td('Empresa', `<b>${t(e.nome)}</b>`)}${td('CNPJ', t(e.cnpj || '—'))}${td('Regime', REGIMES[e.regime] || '')}${td('Contas', String(db.bancos.filter((b) => b.emp === e.id).length), 'dir')}<td class="acoes"><button type="button" class="bt pq" data-acao="empresa-ed" data-e="${e.id}">Editar</button></td></tr>`))}
        <div class="cfg-campos" style="margin-top:12px"><label class="campo">Faturamento deste ano antes de usar o Arca (R$)<input data-cfg-fat inputmode="decimal" value="${(f.antes / 100).toFixed(2).replace('.', ',')}" ${ro()}><small class="mini">O faturamento do ano é esse valor + as entradas marcadas como receita neste ano.</small></label>
        <label class="campo">Avisar contas que vencem em até (dias)<input data-cfg-aviso type="number" min="0" max="30" inputmode="numeric" value="${Number.isInteger(db.avisoDias) ? db.avisoDias : 3}" ${ro()}></label></div></section>
      <section class="bloco cfg-sec" id="cfg-mais">${titulo(IC.ajustes, 'Outras configurações')}<div class="linha"><a class="bt" href="#caixa">Contas bancárias</a><a class="bt" href="#plano">Plano de contas e centros de custo</a><a class="bt" href="#divisao">Divisão das reservas</a><a class="bt" href="#equipe">Equipe, alçada e fechamento</a><a class="bt" href="#historico">Histórico</a><a class="bt" href="#conciliacao">Cópia de segurança</a></div>
        <p class="mini">Os dados ficam neste aparelho e, com a sua conta, na nuvem. Sem internet, o que você lançar sobe quando a conexão voltar.</p></section>
      <div class="cfg-sec" id="cfg-assinatura"><div id="ass-slot"></div></div>`;
  },
  caixa() {
    const sb = E.saldosBancos(db), sd = N.saldos(db), emps = empSel ? [emp(empSel)] : db.empresas;
    return `${cabeca('Contas e saldos', 'Saldo de cada conta bancária (calculado dos lançamentos), transferências entre contas e entre empresas do grupo, e as reservas do caixa.', `<div class="linha"><button type="button" class="bt" data-acao="banco-ed">+ Conta bancária</button><button type="button" class="bt cheio" data-acao="transferir">${IC.transf} Transferir entre contas</button></div>`)}
      ${kpis([kpi(IC.cofre, 'Saldo consolidado', din(E.saldoEmpresa(db, empSel, sb))), ...emps.slice(0, 3).map((e) => kpi(IC.coluna, e.nome, din(E.saldoEmpresa(db, e.id, sb)), `${REGIMES[e.regime] || ''} · ${t(e.cnpj || 'sem CNPJ')}`))])}
      <section class="bloco">${secao('Contas bancárias')}${tabela('bancos', [['Conta'], ['Empresa', 'o1'], ['Banco · agência · conta', 'o2'], ['Sem conciliar', 'dir'], ['Saldo', 'dir'], ['']], db.bancos.filter((b) => !empSel || b.emp === empSel).map((b) => `<tr>${td('Conta', `<b>${t(b.nome)}</b>${b.tipo === 'aplicacao' ? ' <small class="selo">aplicação</small>' : b.tipo === 'caixa' ? ' <small class="selo">caixa</small>' : ''}`)}${td('Empresa', t(emp(b.emp)?.nome), 'o1')}${td('Banco', t([b.banco, b.ag && `ag. ${b.ag}`, b.num && `c/c ${b.num}`].filter(Boolean).join(' · ') || '—'), 'o2')}${td('Sem conciliar', String(E.pendentesConc(db, b.id).length), 'dir num')}${td('Saldo', `<b class="num ${sb[b.id] < 0 ? 'sai' : ''}">${din(sb[b.id] || 0)}</b>`, 'dir')}<td class="acoes"><a class="bt pq" href="#lancamentos" data-filtro-banco="${b.id}">Extrato</a><button type="button" class="bt pq" data-acao="conc-banco" data-b="${b.id}">Conciliar</button><button type="button" class="bt pq" data-acao="banco-ed" data-b="${b.id}">Editar</button></td></tr>`))}
        <p class="mini">Ligação automática com o banco (Open Finance) e boleto/CNAB: <b>em breve</b>. Hoje o extrato entra por arquivo OFX ou CSV na Conciliação.</p></section>
      <section class="bloco">${titulo(IC.cofre, 'Reservas do caixa', `<span class="dica">Cada entrada é distribuída sozinha nas reservas · <a href="#divisao">mudar a divisão</a></span>`)}
        <div class="gavetas">${db.potes.map((p) => gaveta(p, sd)).join('')}</div>
        <div class="atalhos"><button type="button" class="bt" data-lancar="entra">${IC.entra} Entrou</button><button type="button" class="bt" data-lancar="sai">${IC.sai} Saiu</button><button type="button" class="bt" data-acao="mover" data-de="${pote('livre') ? 'livre' : db.potes.at(-1)?.k}">${IC.transf} Passar entre reservas</button></div></section>`;
  },
  aprovacoes() {
    const pend = pendAprov(), dec = comEmp(db.contas).filter((c) => c.aprov && c.aprov.st !== 'pendente').sort((a, b) => String(b.aprov.em).localeCompare(String(a.aprov.em)));
    const lim = db.alcada.limite;
    return `${cabeca('Aprovações de pagamento', lim ? `Pagamentos a partir de ${din(lim)} precisam de aprovação. Quem lançou não aprova o próprio pagamento. Você está como ${t(usuarioAtual.nome)} (${E.PERFIS[usuarioAtual.perfil].nome.toLowerCase()}).` : 'A aprovação por alçada está desligada. O dono liga em Equipe e auditoria › Alçada.', pode('equipe') ? '<a class="bt" href="#equipe">Mudar a alçada</a>' : '')}
      ${kpis([kpi(IC.escudo, 'Esperando aprovação', String(pend.length), din(pend.reduce((a, c) => a + N.situacaoConta(db, c).falta, 0)), pend.length ? 'at' : ''), kpi(IC.ok, 'Aprovadas', String(dec.filter((c) => c.aprov.st === 'aprovada').length)), kpi(IC.alerta, 'Recusadas', String(dec.filter((c) => c.aprov.st === 'recusada').length)), kpi(IC.coluna, 'Alçada', lim ? din(lim) : 'desligada')])}
      <section class="bloco">${secao('Esperando decisão')}${pend.length ? `<div class="aprov-l">${pend.map((c) => { const s = N.situacaoConta(db, c), p = E.podeAprovar(db, usuarioAtual, c); return `<article class="aprov-c"><div class="ap-top"><b>${t(c.desc)}</b><span class="num ap-v">${din(s.falta)}</span></div>
        <dl class="ficha f4"><div><dt>Empresa</dt><dd>${t(nomeEmp(c))}</dd></div><div><dt>Vencimento</dt><dd class="${c.vence <= 0 ? 'sai' : ''}">${dataC(c.vence)}${c.vence < 0 ? ' (atrasada)' : c.vence === 0 ? ' (hoje)' : ''}</dd></div><div><dt>Categoria · centro</dt><dd>${t(c.cat || '—')} · ${ccTxt(c)}</dd></div><div><dt>Lançada por</dt><dd>${t(nomeUsu(c.criadoPor) || '—')}</dd></div><div><dt>Sai da conta</dt><dd>${t(nomeBanco(c))}</dd></div><div><dt>Anexos</dt><dd>${c.anexos?.length ? clipe(c) : 'nenhum'}</dd></div></dl>
        <div class="linha">${p.ok ? `<button type="button" class="bt cheio bordo" data-acao="aprovar" data-c="${c.id}">${IC.ok} Aprovar</button><button type="button" class="bt" data-acao="recusar" data-c="${c.id}">Recusar</button>` : `<p class="mini">${t(p.motivo)}</p>`}</div></article>`; }).join('')}</div>` : `<p class="ok-tudo">${IC.ok} Nenhum pagamento esperando aprovação.</p>`}</section>
      <section class="bloco">${secao('Decididas')}${tabela('decididas', [['Quando'], ['Conta'], ['Valor', 'dir'], ['Decisão'], ['Por'], ['Motivo', 'o1']], dec.slice(0, 40).map((c) => `<tr>${td('Quando', new Date(c.aprov.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), 'num')}${td('Conta', t(c.desc))}${td('Valor', din(c.c), 'dir num')}${td('Decisão', c.aprov.st === 'aprovada' ? etq('paga', 'aprovada') : etq('atrasada', 'recusada'))}${td('Por', t(c.aprov.nome || nomeUsu(c.aprov.por)))}${td('Motivo', t(c.aprov.motivo || '—'), 'o1')}</tr>`), 'Nenhuma decisão ainda.')}</section>`;
  },
  agenda() {
    const ag = agendaSemana(7);
    return `${voltar('pagar', 'A pagar')}${cabeca('Agenda de pagamentos', 'O que vence em cada um dos próximos 7 dias, de todas as empresas (atrasados aparecem em hoje). Pague daqui mesmo.')}
      ${kpis([kpi(IC.cal, 'Na semana', din(ag.reduce((a, x) => a + x.total, 0)), `${ag.reduce((a, x) => a + x.itens.length, 0)} pagamento(s)`), kpi(IC.relogio, 'Hoje (com atrasados)', din(ag[0].total), '', ag[0].total ? 'at' : ''), kpi(IC.cofre, 'Saldo disponível', din(E.saldoEmpresa(db, empSel)))])}
      <div class="agenda-g">${ag.map((x) => `<section class="bloco ag-col"><h3><span>${nomeDia(x.d)}</span><small>${dataC(x.d)}</small><b class="num">${din(x.total)}</b></h3>${x.itens.length ? x.itens.map((i) => `<div class="ag-i ${i.atras ? 'atras' : ''}"><span>${t(i.desc)}${i.atras ? ' <small class="sai">atrasado</small>' : ''}</span><b class="num">${din(i.c)}</b>${i.aprov === 'pendente' ? '<small class="etq at">aguarda aprovação</small>' : i.aprov === 'recusada' ? '<small class="etq ru">recusada</small>' : `<button type="button" class="bt pq" data-acao="${i.tipo === 'conta' ? 'pagar-conta' : 'pagar-fixa'}" data-${i.tipo === 'conta' ? 'c' : 'f'}="${i.id}">Pagar</button>`}</div>`).join('') : '<p class="mini">Nada vence.</p>'}</section>`).join('')}</div>`;
  },
  orcamento() {
    const o = E.orcamento(db, mesOrc, { emp: empSel }), meses = E.mesesAte(N.hojeISO().slice(0, 7), 4), uso = o.totOrc ? o.totReal / o.totOrc * 100 : null;
    const barra = (x) => `<span class="orc-barra ${x.st}" aria-hidden="true"><i style="width:${Math.min(100, x.pct || 0)}%"></i></span>`;
    const st = (x) => x.st === 'estourou' ? etq('atrasada', `estourou ${pctTxt(x.pct - 100, 0)}`) : x.st === 'atencao' ? etq('hoje', 'atenção') : x.st === 'ok' ? etq('paga', 'dentro') : x.st === 'sem' ? etq('', 'sem orçamento') : '';
    const linha = (x, tipo) => `<tr class="${x.st === 'estourou' ? 'atrasada' : ''}">${td(tipo === 'cat' ? 'Categoria' : 'Centro de custo', `<b>${t(x.k)}</b>`)}${td('Orçado', `<input class="orc-in num" inputmode="decimal" data-orc="${tipo}" data-k="${t(x.k)}" value="${x.orc ? (x.orc / 100).toFixed(2).replace('.', ',') : ''}" placeholder="0,00" aria-label="Orçado para ${t(x.k)}" ${ro()}>`, 'dir')}${td('Realizado', din(x.real), 'dir num')}${td('Uso', `${barra(x)} <span class="num">${pctTxt(x.pct, 0)}</span>`, 'uso')}${td('Diferença', `<span class="${x.dif < 0 ? 'sai' : ''}">${din(x.dif)}</span>`, 'dir num o2')}${td('Situação', st(x))}</tr>`;
    return `${cabeca('Orçamento x realizado', `Quanto cada categoria e centro de custo pode gastar por mês e quanto já gastou (por competência). Passou de 85% acende o aviso; passou de 100% é estouro e aparece no painel.`, `<div class="chips" role="group" aria-label="Mês">${meses.map((m) => `<button type="button" data-mes-orc="${m}" aria-pressed="${mesOrc === m}">${E.nomeMes(m, true)}</button>`).join('')}</div>`)}
      ${kpis([kpi(IC.coluna, 'Orçado no mês', din(o.totOrc)), kpi(IC.sai, 'Realizado', din(o.totReal), pctTxt(uso, 0) + ' do orçado'), kpi(IC.alerta, 'Estouros', String([...o.cats, ...o.ccs].filter((x) => x.st === 'estourou').length), '', [...o.cats, ...o.ccs].some((x) => x.st === 'estourou') ? 'ru' : ''), kpi(IC.relogio, 'Em atenção', String([...o.cats, ...o.ccs].filter((x) => x.st === 'atencao').length))])}
      <section class="bloco">${secao(`Por categoria · ${E.nomeMes(mesOrc)}`, pode('cadastros') ? '<button type="button" class="bt pq" data-acao="orc-copiar">Usar o realizado do mês passado como orçamento</button>' : '')}${tabela('orc-t', [['Categoria'], ['Orçado (R$)', 'dir'], ['Realizado', 'dir'], ['Uso'], ['Diferença', 'dir o2'], ['Situação']], o.cats.map((x) => linha(x, 'cat')))}
        ${pode('cadastros') ? `<form class="linha" id="f-orc-nova"><label class="campo"><span>Orçar outra categoria</span><select name="k">${E.catsDoTipo(db, 'sai').filter((c) => !o.cats.some((x) => x.k === c)).map((c) => `<option>${t(c)}</option>`).join('')}</select></label><label class="campo"><span>Valor por mês (R$)</span><input name="v" inputmode="decimal" placeholder="0,00"></label><button class="bt">Adicionar</button></form>` : ''}</section>
      <section class="bloco">${secao('Por centro de custo')}${tabela('orc-t', [['Centro de custo'], ['Orçado (R$)', 'dir'], ['Realizado', 'dir'], ['Uso'], ['Diferença', 'dir o2'], ['Situação']], o.ccs.map((x) => linha(x, 'cc')), 'Nenhum gasto com centro de custo neste mês.')}</section>`;
  },
  plano() {
    const arv = E.arvore(db), usados = new Set(db.movs.map(E.catDe).concat(db.contas.map((c) => c.cat), db.fixas.map((f) => f.cat)));
    const tags = {}; db.movs.forEach((m) => (m.tags || []).forEach((g) => { tags[g] = (tags[g] || 0) + 1; }));
    return `${cabeca('Plano de contas e organização', 'As categorias em árvore (grupo › categoria › subcategoria) definem a DRE e a DFC. Também: centros de custo, projetos e tags.')}
      <div class="plano-g"><section class="bloco">${secao('Plano de contas')}<ul class="arvore">${arv.map((g) => `<li class="g"><div class="no-g"><span class="cod">${g.cod}</span><b>${t(g.nome)}</b>${pode('cadastros') ? `<button type="button" class="bt pq" data-acao="plano-nova" data-grupo="${g.k}">+ Categoria</button>` : ''}</div>${g.cats.length ? `<ul>${g.cats.map((c) => `<li><div class="no ${c.ativa === false ? 'inativa' : ''}"><span class="cod">${c.cod}</span><span class="nm">${t(c.nome)}${usados.has(c.nome) ? '' : ' <small class="mudo">sem uso</small>'}${c.ativa === false ? ' <small class="selo">inativa</small>' : ''}</span>${pode('cadastros') ? `<span class="acoes"><button type="button" class="bt pq" data-acao="plano-nova" data-pai="${c.id}">+ Sub</button><button type="button" class="bt pq" data-acao="plano-ed" data-id="${c.id}">Editar</button></span>` : ''}</div>${c.filhos.length ? `<ul>${c.filhos.map((s) => `<li><div class="no ${s.ativa === false ? 'inativa' : ''}"><span class="cod">${s.cod}</span><span class="nm">${t(s.nome)}${s.ativa === false ? ' <small class="selo">inativa</small>' : ''}</span>${pode('cadastros') ? `<span class="acoes"><button type="button" class="bt pq" data-acao="plano-ed" data-id="${s.id}">Editar</button></span>` : ''}</div></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul></section>
      <div class="col"><section class="bloco">${secao('Centros de custo')}<p class="mini">Um por linha: área, filial, frota, fazenda. Um lançamento pode ser rateado entre vários.</p><label class="campo">Centros de custo<textarea data-cfg-centros rows="7" ${ro()}>${t(db.centros.join('\n'))}</textarea></label></section>
        <section class="bloco">${secao('Projetos')}<p class="mini">Obras, safras, contratos: acompanhe o resultado de cada um em Relatórios.</p><label class="campo">Projetos (um por linha)<textarea data-cfg-projetos rows="4" ${ro()}>${t(db.projetos.join('\n'))}</textarea></label></section>
        <section class="bloco">${secao('Tags em uso')}${Object.keys(tags).length ? `<div class="chips">${Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([g, n]) => `<a class="chip-l" href="#lancamentos" data-filtro-tag="${t(g)}">#${t(g)} <small>${n}</small></a>`).join('')}</div>` : '<p class="mini">Nenhuma tag ainda. Escreva tags ao lançar (ex.: urgente, safra).</p>'}</section>
        <section class="bloco">${secao('Regras de conciliação')}<p class="mini">${db.regras.length} regra(s). Organize na tela de Conciliação.</p><a class="bt" href="#conciliacao">Abrir a Conciliação</a></section></div></div>`;
  },
};
// rotas antigas (do Financeiro Essencial) continuam abrindo a tela certa
const ALIAS = { potes: 'caixa', saldos: 'caixa', dre: 'relatorios', pote: 'reserva', extrato: 'lancamentos', contas: 'pagar', resumo: 'relatorios', mei: 'impostos', dados: 'conciliacao', dono: 'equipe' };
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
    ${s.falta ? `<div class="linha"><button type="button" class="bt cheio" data-acao="cobrar" data-c="${c.id}">Cobrar (Pix, WhatsApp, e-mail)</button><button type="button" class="bt" data-acao="receber" data-c="${c.id}">Receber</button></div>` : ''}<div class="linha"><button type="button" class="bt pq" data-acao="editar-cob" data-c="${c.id}">Editar ou cancelar</button></div>
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

// ------------------------------------------------------------------ Configurações: cores, marca, guia e assinatura (19/11/2026)
// Esquemas de cor da identidade do Arca (cofre romano + livro-razão): troca a tinta do menu e o tom de destaque em todo o sistema.
const TEMAS = [['tesouro', 'Tesouro (padrão)', '#17243a', '#773c45'], ['purpura', 'Púrpura imperial', '#2a1a33', '#6b3a63'], ['bronze', 'Bronze antigo', '#2b2117', '#7a5230'], ['oliva', 'Oliveira', '#1f2a22', '#4f6a45'], ['egeu', 'Mar Egeu', '#10303d', '#2f5f6e'], ['marmore', 'Mármore e grafite', '#26282d', '#6a4b3c']];
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const COMO = {
  painel: ['Painel executivo', ['O resumo do grupo: saldo, o que entra e sai nos próximos dias e os alertas.', 'Toque num número para abrir a lista dele.', 'Use os filtros do topo para ver uma empresa ou um centro de custo.']],
  caixa: ['Contas e saldos', ['O saldo de cada conta bancária vem dos lançamentos.', '“Transferir entre contas” move dinheiro entre contas e entre empresas.', 'As reservas dividem cada entrada sozinhas (impostos, folha, reserva).']],
  lancamentos: ['Lançamentos', ['O livro-razão: tudo o que entrou e saiu.', 'Filtre por período e tipo; abra um lançamento para editar ou anexar o comprovante.']],
  pagar: ['A pagar', ['Fornecedores, boletos, guias e contas fixas.', '“Pagar” baixa a conta; acima da alçada, ela vai para Aprovações.', 'Marque várias para pagar em lote.']],
  aprovacoes: ['Aprovações', ['Pagamentos acima da alçada esperando o aprovador ou o dono.', 'Quem lançou não aprova o próprio pagamento.']],
  receber: ['A receber e cobrança', ['Quem deve, quanto e quando vence.', '“Cobrar” manda Pix, WhatsApp ou e-mail com a mensagem pronta.', '“Receber” dá baixa e pode gerar recibo.']],
  conciliacao: ['Conciliação', ['Traga o extrato OFX ou CSV de cada conta.', 'O Arca sugere o par de cada linha; confira antes de gravar.']],
  fluxo: ['Fluxo de caixa', ['O saldo previsto dia a dia, com o que vai entrar e sair.', 'Veja com antecedência se o caixa fica negativo.']],
  orcamento: ['Orçamento', ['Defina quanto pode gastar por categoria no mês.', 'Compare o previsto com o realizado.']],
  impostos: ['Impostos', ['Estimativa pelo regime de cada empresa e o calendário das guias.', 'Lance a guia em A pagar para não esquecer.']],
  relatorios: ['DRE, DFC e indicadores', ['Escolha o período e a empresa.', 'Baixe em planilha ou o pacote do contador.']],
  plano: ['Plano de contas', ['Categorias, centros de custo e projetos.', 'Um lançamento pode ser rateado entre vários centros.']],
  equipe: ['Equipe e auditoria', ['Quem usa o Arca e com qual perfil.', 'Alçada de aprovação, fechamento do mês e o registro de tudo.']],
  config: ['Configurações', ['Perfil, cores, sua marca, guia, empresas, avisos e a sua assinatura.', 'Os atalhos no alto levam direto a cada seção.']],
};
const COMO_ORDEM = Object.keys(COMO);
function comoUsar(k) {
  const c = COMO[k] || COMO.painel;
  folha(`<h2>Como usar: ${t(c[0])}</h2><ol class="como-lista">${c[1].map((x) => `<li>${t(x)}</li>`).join('')}</ol><div class="linha"><a class="bt" href="#config/cfg-guia" data-fecha>Todas as telas</a><button type="button" class="bt cheio" data-fecha>Entendi</button></div>`);
}
function aplicaMarca() {
  document.documentElement.dataset.tema = db.tema && TEMAS.some((x) => x[0] === db.tema) && db.tema !== 'tesouro' ? db.tema : '';
  const l = $('#logo-neg'); if (l) { if (db.logo) { l.src = db.logo; l.hidden = false; } else { l.removeAttribute('src'); l.hidden = true; } }
}
// a imagem escolhida vira um quadrado pequeno (cabe nos dados sem pesar)
function imagemPequena(arq, lado = 256) {
  return new Promise((ok, falha) => {
    if (!arq || !/^image\//.test(arq.type)) return falha(new Error('Escolha uma imagem.'));
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const k = Math.min(1, lado / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/png')); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não deu para abrir essa imagem.')); };
    img.src = url;
  });
}
// o bloco "Minha assinatura" (base/assinatura.js) fica montado entre um redesenho e outro
let blocoAss = null;
function posConfig(tela) {
  const slot = tela.querySelector('#ass-slot');
  if (slot && window.BRAssinatura) { if (blocoAss) slot.replaceWith(blocoAss); else blocoAss = BRAssinatura.montar(slot, { app: 'financeiroessencial', nome: 'Arca', mensal: (window.VELTRIA_VERSOES?.financeiroessencial?.mensal) || 59, pagina: 'arca.html' }); }
  const em = tela.querySelector('#cfg-email');
  if (em && window.BRAssinatura) BRAssinatura.conta().then((c) => { if (c.modo === 'conta') { if (c.email) em.value = c.email; tela.querySelectorAll('[data-so-conta]').forEach((b) => { b.hidden = false; }); } });
}

// ------------------------------------------------------------------ navegação e trava
const NOMES = { painel: 'Painel executivo', caixa: 'Contas e saldos', reserva: 'Reserva', lancamentos: 'Lançamentos', mov: 'Lançamento', lancar: 'Lançar', receber: 'A receber', pagar: 'A pagar', aprovacoes: 'Aprovações', agenda: 'Agenda de pagamentos', fluxo: 'Fluxo de caixa', orcamento: 'Orçamento', conciliacao: 'Conciliação', importar: 'Conferir extrato', relatorios: 'Relatórios', impostos: 'Impostos', plano: 'Plano de contas', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', equipe: 'Equipe e auditoria', config: 'Configurações', historico: 'Histórico', recibos: 'Recibos', hoje: 'Pendências', divisao: 'Divisão', conferir: 'Conferir reservas' };
const ABA = { reserva: 'caixa', divisao: 'caixa', hoje: 'painel', conferir: 'painel', mov: 'lancamentos', lancar: '', importar: 'conciliacao', historico: 'equipe', assinatura: 'config', ia: '', agenda: 'pagar', recibos: 'impostos' };
function mostra() {
  let [r, a] = (location.hash.slice(1) || 'painel').split('/'); if (r === 'contas') r = a === 'receber' ? 'receber' : 'pagar'; r = ALIAS[r] || r; if (!T[r]) r = 'painel';
  const tela = $('#tela');
  if (falhaCarga) { tela.innerHTML = `<section class="bloco"><h1>Seus dados estão protegidos</h1><p class="erro">${t(falhaCarga)}</p><p class="sub">Para não perder nada, o Arca não grava enquanto isso não for resolvido. Baixe a cópia do que estava guardado e fale com o suporte.</p><button type="button" class="bt cheio" data-acao="copia-bruta">Baixar o que estava guardado</button></section>`; return; }
  if (!db.empresas.some((e) => e.id === empSel)) empSel = '';
  tela.innerHTML = T[r](a);
  tela.dataset.tela = r;
  aplicaMarca(); if (r === 'config' || r === 'assinatura') posConfig(tela);
  if (r === 'config' && a && document.getElementById(a)) setTimeout(() => document.getElementById(a).scrollIntoView({ block: 'start' }), 60);
  const aba = ABA[r] ?? r;
  document.querySelectorAll('.menu a, .nav-cel a').forEach((l) => { if (l.dataset.aba === aba || (l.closest('.nav-cel') && ['pagar', 'receber', 'lancamentos'].includes(aba) && l.dataset.aba === 'mais')) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  const np = alertas().length, na = pendAprov().length;
  document.querySelectorAll('[data-aba="painel"] .n').forEach((bd) => { bd.textContent = np; bd.hidden = !np; });
  document.querySelectorAll('[data-aba="aprovacoes"] .n').forEach((bd) => { bd.textContent = na; bd.hidden = !na; });
  $('.fab').hidden = r === 'lancar';
  $('#nome-neg').textContent = db.negocio;
  $('#hoje-txt').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).replace(/^./, (x) => x.toUpperCase());
  const cs = [...new Set(db.centros)].sort((x, y) => x.localeCompare(y, 'pt-BR'));
  $('#cc-filtro').innerHTML = `<option value="">Todos os centros</option>${cs.map((c) => `<option ${c === ccSel ? 'selected' : ''}>${t(c)}</option>`).join('')}`;
  $('#emp-filtro').innerHTML = opEmp(empSel, db.empresas.length > 1 ? 'Todas as empresas' : '');
  $('#emp-filtro').closest('label').hidden = db.empresas.length < 2;
  $('#lista-cc').innerHTML = cs.map((c) => `<option value="${t(c)}"></option>`).join('');
  $('#lista-proj').innerHTML = db.projetos.map((c) => `<option value="${t(c)}"></option>`).join('');
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="faixa-aviso">Assinatura cancelada: você usa até ${dia(db.assinatura.proxima)}. <a href="#assinatura">Reativar</a></p>`);
  if (ccSel && ['painel', 'lancamentos', 'receber', 'pagar', 'relatorios', 'reserva'].includes(r)) tela.insertAdjacentHTML('afterbegin', `<p class="faixa-aviso">Mostrando só o centro de custo <b>${t(ccSel)}</b> (os saldos dos bancos e das reservas são da empresa toda). <button type="button" class="bt pq" data-cc-limpa>Ver todos</button></p>`);
  if (!pode('lancar') && !['assinatura'].includes(r)) tela.insertAdjacentHTML('afterbegin', `<p class="faixa-aviso leitura">Você está como <b>${t(usuarioAtual.nome)}</b> (${E.PERFIS[usuarioAtual.perfil].nome.toLowerCase()}): ${usuarioAtual.perfil === 'aprovador' ? 'vê tudo e aprova pagamentos' : 'só vê e exporta'}. ${DEMO || db.usuarios.length > 1 ? '<button type="button" class="bt pq" data-acao="trocar-usuario">Trocar</button>' : ''}</p>`);
  if (r === 'divisao') somaDiv();
  if (r === 'lancar') somaRat();
  aplicaPerfil();
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
  como: () => comoUsar($('#tela').dataset.tela || 'painel'),
  atalhos: () => ajudaAtalhos(),
  'tira-logo': () => { if (!pode('cadastros')) return; db.logo = ''; grava(); mostra(); },
  'tira-foto-eu': () => { const u = db.usuarios.find((x) => x.id === usuarioAtual?.id); if (u) { delete u.foto; grava(); defineUsuario(); mostra(); } },
  'trocar-senha': () => { if (!window.veltriaNuvem) return; window.veltriaNuvem.trocarSenha().then((e) => aviso(`Mandamos o link para criar a senha nova em ${e}.`)).catch((x) => aviso(x.message || 'Não deu para mandar agora.', true)); },
  'sair-conta': () => folha('<h2>Sair da conta?</h2><p class="sub">O que você fez já está salvo na nuvem. Para voltar, entre com o seu e-mail e a senha.</p><div class="linha"><button type="button" class="bt cheio" data-sim>Sair</button><button type="button" class="bt" data-fecha>Ficar</button></div>', (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { fecha(); window.veltriaNuvem?.sair(); })),
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

// ------------------------------------------------------------------ anexos (o arquivo fica neste computador, no IndexedDB; nos dados vai só o nome)
const IDB = () => new Promise((ok, err) => { const r = indexedDB.open('arca-anexos', 1); r.onupgradeneeded = () => r.result.createObjectStore('arq'); r.onsuccess = () => ok(r.result); r.onerror = () => err(r.error); });
async function guardaAnexos(files) {
  const l = []; let base; try { base = await IDB(); } catch { aviso('Este navegador não deixa guardar arquivos.', true); return l; }
  for (const f of files) {
    if (f.size > 10e6) { aviso(`${f.name}: maior que 10 MB.`, true); continue; }
    const id = nid(); await new Promise((ok, err) => { const tx = base.transaction('arq', 'readwrite'); tx.objectStore('arq').put(f, id); tx.oncomplete = ok; tx.onerror = () => err(tx.error); });
    l.push({ id, nome: f.name.slice(0, 80), tam: f.size, tipo: f.type || '' });
  }
  return l;
}
async function abreAnexo(a, dono) {
  if (a.exemplo) return folha(`<h2>${t(a.nome)}</h2><div class="recibo doc-ex"><h3>${/boleto/i.test(a.nome) ? 'Boleto bancário' : 'Documento'} · exemplo</h3><p>${t(dono?.desc || '')}</p><p>Valor: <b>${din(dono?.c || 0)}</b> · vencimento ${dono && Number.isFinite(dono.vence) ? dataC(dono.vence) : '—'}</p><p class="mini">Arquivo de exemplo da demonstração. Na sua conta, o PDF, a foto ou o XML que você anexar abre aqui.</p></div><button type="button" class="bt largo" data-fecha>Fechar</button>`);
  try {
    const base = await IDB(), b = await new Promise((ok, err) => { const q = base.transaction('arq').objectStore('arq').get(a.id); q.onsuccess = () => ok(q.result); q.onerror = () => err(q.error); });
    if (!b) return aviso('Este arquivo foi anexado em outro computador: ele fica guardado só onde foi anexado.', true);
    const u = URL.createObjectURL(b), x = document.createElement('a'); x.href = u; x.target = '_blank'; x.rel = 'noopener'; if (!/pdf|image/.test(b.type)) x.download = a.nome; document.body.append(x); x.click(); setTimeout(() => { URL.revokeObjectURL(u); x.remove(); }, 60000);
  } catch { aviso('Não consegui abrir o anexo.', true); }
}
const donoAnexo = (tipo, id) => (tipo === 'conta' ? db.contas : tipo === 'cob' ? db.cobrancas : db.movs).find((x) => x.id === id);
const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
function barraLote(qual) {
  const sel = qual === 'pagar' ? selPagar : selRec; if (!sel.size) return '';
  const tot = [...sel].reduce((a, k) => { if (qual === 'rec') { const c = db.cobrancas.find((x) => x.id === k); return a + (c ? N.situacaoCob(db, c).falta : 0); } const [tp, id] = k.split(':'); if (tp === 'c') { const c = db.contas.find((x) => x.id === id); return a + (c ? E.encargos(c, N.situacaoConta(db, c).falta).total : 0); } const f = db.fixas.find((x) => x.id === id); return a + (f ? N.situacaoFixa(db, f).falta : 0); }, 0);
  return `<div class="barra-lote" role="region" aria-label="Seleção"><span><b>${sel.size}</b> selecionada(s) · <b class="num">${din(tot)}</b></span><button type="button" class="bt" data-limpa-lote="${qual}">Limpar</button><button type="button" class="bt cheio claro" data-acao="${qual === 'pagar' ? 'pagar-lote' : 'receber-lote'}">${qual === 'pagar' ? 'Pagar em lote' : 'Receber em lote'}</button></div>`;
}
const campoBanco = (sel, rot = 'Conta bancária') => `<label class="campo">${rot}<select name="banco">${opBancos(sel || bancoInicial())}</select></label>`;
const campoCat = (tipo, sel) => `<label class="campo">Categoria<select name="cat">${[...new Set([...E.catsDoTipo(db, tipo), ...(sel ? [sel] : [])])].map((c) => `<option ${c === sel ? 'selected' : ''}>${t(c)}</option>`).join('')}</select></label>`;
const campoDiaPag = () => `<label class="campo">Data do pagamento<input name="dpag" type="date" value="${N.isoDe(0)}" max="${N.isoDe(0)}"></label>`;
const lerTags = (v) => [...new Set(String(v || '').split(',').map((x) => x.trim().replace(/^#/, '').toLowerCase().slice(0, 24)).filter(Boolean))].slice(0, 8);
const hist = (oque) => db.historico.unshift({ quando: new Date().toISOString(), dia: 0, oque, por: usuarioAtual?.id });
/** Paga (ou recebe) com a data, a conta e os juros escolhidos: o principal baixa o título; juros e multa viram lançamento à parte. */
function baixaTitulo(tipo, x, valor, dpag, bancoId, extra = {}) {
  E.exigeAberto(db, dpag);
  const falta = tipo === 'conta' ? N.situacaoConta(db, x).falta : tipo === 'cob' ? N.situacaoCob(db, x).falta : Math.max(0, x.c - N.pagoFixa(db, x, extra.comp)), princ = Math.min(valor, falta || valor), juros = valor - princ, b = banco(bancoId) || banco(E.bancoDe(db, x));
  let m;
  if (tipo === 'conta') m = N.pagarConta(db, x.id, princ, `pag:${x.id}:${N.pagoConta(db, x)}`);
  else if (tipo === 'cob') m = N.receber(db, x.id, princ, `rec:${x.id}:${N.recebido(db, x)}`);
  else m = N.pagarFixa(db, x.id, valor, new Date(), extra.comp);
  if (!m) throw new Error('Esse pagamento já foi lançado.');
  Object.assign(m, { dia: dpag, banco: b.id, emp: b.emp, herdou: 1 }); ['cc', 'rat', 'proj', 'tags'].forEach((k) => { if (x[k] !== undefined && m[k] === undefined) m[k] = x[k]; });
  if (tipo === 'cob' && x.cat) m.cat = x.cat;
  if (juros > 0 && tipo !== 'fixa') {
    const j = N0.lancar(db, tipo === 'cob' ? 'entra' : 'sai', { c: juros, desc: `Juros e multa · ${x.desc}${x.cli ? ` · ${x.cli}` : ''}`, dia: dpag, pote: x.pote || 'contas', cat: 'Juros e multas', receita: true }, `jur:${x.id}:${m.id}`);
    if (j) Object.assign(j, { banco: b.id, emp: b.emp, cat: tipo === 'cob' ? 'Receitas financeiras' : 'Juros e multas', cc: x.cc, jurosDe: x.id, por: usuarioAtual?.id });
  }
  return m;
}
const diaPag = (f) => { const d = N.diaDe(f.get('dpag')); if (!Number.isFinite(d) || d > 0) throw new Error('A data do pagamento é hoje ou antes.'); return d; };
function formTitulo(tipo, x) {
  // conta a pagar (tipo 'conta') ou cobrança (tipo 'cob'): parcelas, empresa e conta, categoria, centro de custo, projeto, tags, competência, juros, anexos
  const novo = !x, cob = tipo === 'cob';
  formFolha(`<h2>${novo ? (cob ? 'Nova cobrança' : 'Nova conta a pagar') : (cob ? 'Editar cobrança' : 'Editar conta a pagar')}</h2><div class="campos-2">
    ${cob ? `<label class="campo larga">Cliente<input name="cli" required maxlength="80" value="${t(x?.cli || '')}"></label><label class="campo">WhatsApp<input name="tel" inputmode="tel" maxlength="20" value="${t(x?.tel || '')}" placeholder="(31) 99999-0000"></label><label class="campo">E-mail<input name="email" type="email" maxlength="80" value="${t(x?.email || '')}" placeholder="financeiro@cliente.com.br"></label>` : ''}
    <label class="campo larga">${cob ? 'O que foi (nota, serviço)' : 'Fornecedor e descrição'}<input name="desc" required maxlength="80" value="${t(x?.desc || '')}" placeholder="${cob ? 'NF 12630' : 'Metamaq · pedido 9001'}"></label>
    ${campoValor('v', novo ? 'Valor total (R$)' : 'Valor (R$)', x?.c)}${campoData('vence', novo ? 'Vencimento (1ª parcela)' : 'Vencimento', x?.vence ?? 7)}
    ${novo ? `<label class="campo">Parcelas<input name="np" type="number" min="1" max="120" value="1"></label><label class="campo">Intervalo<select name="iv"><option value="30">mensal</option><option value="15">a cada 15 dias</option><option value="7">semanal</option></select></label>` : ''}
    ${campoBanco(x?.banco)}${cob ? '' : `<label class="campo">Sai da reserva<select name="pote">${opPotes(x?.pote || 'contas')}</select></label>`}
    ${campoCat(cob ? 'entra' : 'sai', x?.cat || (cob ? E.CAT_ENTRADA : 'Fornecedores e mercadorias'))}${campoCC(x?.cc)}
    <label class="campo">Projeto<input name="proj" list="lista-proj" maxlength="40" value="${t(x?.proj || '')}"></label><label class="campo">Tags<input name="tags" maxlength="80" value="${t((x?.tags || []).join(', '))}" placeholder="separe por vírgula"></label>
    <label class="campo">Competência<input name="dcomp" type="date" value="${Number.isFinite(x?.dcomp) ? N.isoDe(x.dcomp) : ''}"></label><span></span>
    <label class="campo">Multa no atraso (%)<input name="multa" inputmode="decimal" value="${String(x?.multa ?? 2).replace('.', ',')}"></label><label class="campo">Juros ao mês (%)<input name="juros" inputmode="decimal" value="${String(x?.juros ?? 1).replace('.', ',')}"></label>
    <label class="bt larga anexo-bt">${IC.clipe} Anexar ${cob ? 'NF ou contrato' : 'boleto, NF ou comprovante'}<input type="file" name="anexo" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" hidden></label>
    ${x ? `<label class="check larga"><input type="checkbox" name="cancelar"> Cancelar (não vai mais ${cob ? 'receber' : 'pagar'})</label>` : ''}</div>
    ${!cob && db.alcada.limite ? `<p class="mini">A partir de ${din(db.alcada.limite)} o pagamento precisa de aprovação de outra pessoa.</p>` : ''}<button class="bt cheio largo">${novo ? 'Criar' : 'Salvar'}</button>`, (f, form) => {
    const desc = String(f.get('desc') || '').trim(); if (!desc) throw new Error(cob ? 'Diga o que está sendo cobrado.' : 'Diga o que é a conta.');
    const b = banco(f.get('banco')), pct = (k) => { const v = Number(String(f.get(k) || '0').replace(',', '.')); if (!Number.isFinite(v) || v < 0 || v > 20) throw new Error('Multa e juros entre 0% e 20%.'); return v; };
    const dc = f.get('dcomp') ? N.diaDe(f.get('dcomp')) : undefined;
    const base = { desc, emp: b.emp, banco: b.id, cat: f.get('cat'), cc: ccDe(f), proj: String(f.get('proj') || '').trim().slice(0, 40), tags: lerTags(f.get('tags')), multa: pct('multa'), juros: pct('juros'), ...(Number.isFinite(dc) ? { dcomp: dc } : {}) };
    if (!cob) base.pote = f.get('pote');
    if (cob) { const tel = String(f.get('tel') || '').replace(/\D/g, ''); if (tel && (tel.length < 10 || tel.length > 13)) throw new Error('WhatsApp com DDD, ex.: (31) 99999-0000.'); const em = String(f.get('email') || '').trim(); if (em && !/^\S+@\S+\.\S+$/.test(em)) throw new Error('E-mail inválido.'); Object.assign(base, { cli: String(f.get('cli') || '').trim().slice(0, 80), tel, email: em }); if (!base.cli) throw new Error('Diga quem vai pagar.'); }
    if (base.proj && !db.projetos.includes(base.proj)) db.projetos.push(base.proj);
    const arqs = [...(form.querySelector('[name="anexo"]')?.files || [])];
    const anexa = (alvos) => { if (arqs.length) guardaAnexos(arqs).then((l) => { if (!l.length) return; alvos.forEach((a) => { a.anexos = [...(a.anexos || []), ...l]; }); grava(); mostra(); aviso(`${l.length} anexo(s) guardado(s) neste computador.`); }); };
    const c = valorC(f.get('v')), lista = cob ? db.cobrancas : db.contas;
    if (x) {
      const pago = cob ? N.recebido(db, x) : N.pagoConta(db, x); if (c < pago) throw new Error(`Já foram ${cob ? 'recebidos' : 'pagos'} ${din(pago)}; o valor não pode ser menor.`);
      const mudouValor = c !== x.c; Object.assign(x, base, { c, vence: diaC(f.get('vence')) });
      if (!cob && mudouValor && x.aprov?.st === 'aprovada' && E.precisaAprovar(db, x)) { x.aprov = { st: 'pendente' }; aviso('O valor mudou: o pagamento volta para aprovação.'); }
      if (!cob && !x.aprov && E.precisaAprovar(db, x)) x.aprov = { st: 'pendente' };
      if (f.get('cancelar')) x.status = 'cancelada';
      hist(`${f.get('cancelar') ? 'Cancelou' : 'Editou'} ${cob ? `a cobrança de ${x.cli}` : `a conta ${x.desc}`} (${din(c)})`); anexa([x]); return cob ? 'Cobrança salva.' : 'Conta salva.';
    }
    const np = Number(f.get('np')) || 1, ps = E.parcelas(c, np, diaC(f.get('vence')), Number(f.get('iv')) || 30), grupo = np > 1 ? nid() : '', novos = [];
    ps.forEach((p) => { const it = { id: nid(), ...base, c: p.c, vence: p.vence, desc: np > 1 ? `${desc} · parcela ${p.parc}` : desc, status: 'aberta', ...(np > 1 ? { parc: p.parc, grupo } : {}), ...(cob ? { avisos: [], criada: 0 } : { criadoPor: usuarioAtual.id }) }; if (!cob && E.precisaAprovar(db, it)) it.aprov = { st: 'pendente' }; lista.push(it); novos.push(it); });
    hist(`Criou ${cob ? `cobrança para ${base.cli}` : `conta a pagar ${desc}`} de ${din(c)}${np > 1 ? ` em ${np} parcelas` : ''}`); anexa(novos);
    const apr = novos.filter((n) => n.aprov?.st === 'pendente').length;
    return `${cob ? 'Cobrança criada' : 'Conta criada'}${np > 1 ? ` em ${np} parcelas` : ''}.${apr ? ` ${apr} esperando aprovação.` : ''}`;
  });
}
function exemploOFX(b) {
  // extrato de exemplo da conta: o que está lançado e ainda não foi conferido (com o texto do banco), mais tarifa, IOF, rendimento e um Pix novo
  const pend = E.pendentesConc(db, b.id).slice(0, 30), up = (s) => sa(s).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32);
  const l = pend.map((m, i) => ({ c: m.c, tipo: m.tipo, dia: Math.min(0, m.dia + (i % 3 === 1 ? 1 : 0)), desc: `${m.tipo === 'entra' ? 'PIX RECEBIDO' : 'PAGTO'} ${up(m.desc)}`, ref: `EX${m.id.slice(-8)}` }));
  l.push({ c: 24800, tipo: 'sai', dia: -1, desc: 'TARIFA PACOTE SERVICOS PJ', ref: `EXTAR${N.hojeISO()}` }, { c: 1873, tipo: 'sai', dia: -2, desc: 'IOF SALDO DEVEDOR', ref: `EXIOF${N.hojeISO()}` }, { c: 1290000, tipo: 'entra', dia: -1, desc: 'PIX RECEBIDO MERCADINHO BOA SORTE LTDA', ref: `EXPIX${N.hojeISO()}` });
  return l;
}
function abreExtrato(arquivo, linhas, erros = []) { previa = { arquivo, banco: bancoConc, linhas: E.sugerir(db, bancoConc, linhas), erros }; location.hash = '#importar'; mostra(); }
function exportaAbas() {
  const dmy = (d) => N.isoDe(d), r2 = (c) => ({ v: c / 100, t: 'moeda' }), mesAt = N.hojeISO().slice(0, 7), [di, df] = N.periodo('ano');
  const movs = [...db.movs].sort((a, b) => a.dia - b.dia).map((m) => [dmy(m.dia), { entra: 'Entrada', sai: 'Saída', transf: 'Entre reservas', ajuste: 'Acerto', transfb: 'Transferência entre contas' }[m.tipo], m.desc, r2(sinalMov(m) * m.c || m.c), m.tipo === 'entra' || m.tipo === 'sai' ? E.catDe(m) : '', E.codigoDaCat(db, E.catDe(m)), nomeEmp(m), m.tipo === 'transfb' ? `${banco(m.bde)?.nome} → ${banco(m.bpara)?.nome}` : nomeBanco(m), m.rat?.length ? m.rat.map((x) => `${x.cc} ${x.pct}%`).join(' | ') : m.cc || '', m.proj || '', (m.tags || []).join(', '), m.cli || '', m.conc ? 'sim' : 'não', nomeUsu(m.por)]);
  const dreAba = (base) => { const d = E.dre(db, di, df, { emp: empSel, base }); return [['Linha', 'Valor (R$)', 'AV %'], ...d.linhas.map((l) => [l.nome, r2(l.v), d.bruta ? Math.round(l.v / d.bruta * 1000) / 10 : '']), [], ...d.fora.map((l) => [l.nome, r2(l.v), ''])]; };
  const f = E.dfc(db, di, df, { emp: empSel });
  return [
    { nome: 'Lançamentos', linhas: [['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Código', 'Empresa', 'Conta', 'Centro de custo', 'Projeto', 'Tags', 'Cliente', 'Conciliado', 'Lançado por'], ...movs] },
    { nome: 'DRE competência (ano)', linhas: dreAba('competencia') }, { nome: 'DRE caixa (ano)', linhas: dreAba('caixa') },
    { nome: 'DFC (ano)', linhas: [['Linha', 'Valor (R$)'], ['Saldo inicial', r2(f.inicial)], ['Caixa das operações', r2(f.fop)], ['Caixa dos investimentos', r2(f.finv)], ['Caixa dos financiamentos', r2(f.ffin)], ['Variação', r2(f.variacao)], ['Saldo final', r2(f.final)]] },
    { nome: 'A pagar', linhas: [['Vencimento', 'Descrição', 'Empresa', 'Categoria', 'Centro de custo', 'Valor', 'Falta', 'Situação', 'Aprovação'], ...db.contas.map((c) => { const s = N.situacaoConta(db, c); return [dmy(c.vence), c.desc, nomeEmp(c), c.cat || '', c.cc || '', r2(c.c), r2(s.falta), s.st, E.estadoAprov(db, c)]; })] },
    { nome: 'A receber', linhas: [['Vencimento', 'Cliente', 'Descrição', 'Empresa', 'Valor', 'Falta', 'Situação'], ...db.cobrancas.map((c) => { const s = N.situacaoCob(db, c); return [dmy(c.vence), c.cli, c.desc, nomeEmp(c), r2(c.c), r2(s.falta), s.st]; })] },
    { nome: 'Inadimplência', linhas: [['Cliente', 'Em aberto', 'Vencido', '1-30', '31-60', '61-90', '+90', 'Maior atraso (dias)'], ...E.inadimplencia(db).map((p) => [p.cli, r2(p.aberto), r2(p.vencido), r2(p.f30), r2(p.f60), r2(p.f90), r2(p.f90m), p.maior])] },
    { nome: 'Orçamento do mês', linhas: [['Categoria', 'Orçado', 'Realizado', 'Uso %'], ...E.orcamento(db, mesAt).cats.map((x) => [x.k, r2(x.orc), r2(x.real), x.pct === null ? '' : Math.round(x.pct)])] },
    { nome: 'Plano de contas', linhas: [['Código', 'Grupo', 'Categoria', 'Ativa'], ...E.arvore(db).flatMap((g) => g.cats.flatMap((c) => [[c.cod, g.nome, c.nome, c.ativa === false ? 'não' : 'sim'], ...c.filhos.map((s) => [s.cod, g.nome, `  ${s.nome}`, s.ativa === false ? 'não' : 'sim'])]))] },
  ];
}
function pacoteContador(mes) {
  const [de, ate] = E.diasDoMes(mes), r2 = (c) => ({ v: c / 100, t: 'moeda' }), ms = db.movs.filter((m) => m.dia >= de && m.dia <= ate).sort((a, b) => a.dia - b.dia);
  const lanc = ms.filter((m) => m.tipo === 'entra' || m.tipo === 'sai').map((m) => { const cat = E.catDe(m), cod = E.codigoDaCat(db, cat), conta = `${nomeBanco(m)}`; const e = emp(E.empDe(db, m)); return [N.isoDe(m.dia), e?.cnpj || '', e?.nome || '', m.tipo === 'entra' ? conta : `${cod} ${cat}`, m.tipo === 'entra' ? `${cod} ${cat}` : conta, r2(m.c), m.desc, m.rat?.length ? m.rat.map((x) => `${x.cc} ${x.pct}%`).join(' | ') : m.cc || '', m.conc ? 'sim' : 'não']; });
  const bal = {}; ms.filter((m) => m.tipo === 'entra' || m.tipo === 'sai').forEach((m) => { const k = E.catDe(m); bal[k] ||= { en: 0, sa: 0 }; bal[k][m.tipo === 'entra' ? 'en' : 'sa'] += m.c; });
  const sbI = E.saldosBancos(db, de - 1), sbF = E.saldosBancos(db, ate);
  return [
    { nome: 'Lançamentos', linhas: [['Data', 'CNPJ', 'Empresa', 'Débito', 'Crédito', 'Valor', 'Histórico', 'Centro de custo', 'Conciliado'], ...lanc] },
    { nome: 'Balancete gerencial', linhas: [['Código', 'Categoria', 'Grupo', 'Entradas', 'Saídas'], ...Object.entries(bal).map(([k, v]) => [E.codigoDaCat(db, k), k, E.grupo(E.grupoDaCat(db, k, v.en ? 'entra' : 'sai'))?.nome || '', r2(v.en), r2(v.sa)])] },
    { nome: 'Saldos bancários', linhas: [['Conta', 'Empresa', 'CNPJ', 'Saldo inicial', 'Saldo final'], ...db.bancos.map((b) => [b.nome, emp(b.emp)?.nome || '', emp(b.emp)?.cnpj || '', r2(sbI[b.id] || 0), r2(sbF[b.id] || 0)])] },
    { nome: 'DRE do mês', linhas: [['Linha', 'Competência', 'Caixa'], ...E.dre(db, de, ate, { base: 'competencia' }).linhas.map((l, i) => [l.nome, r2(l.v), r2(E.dre(db, de, ate, { base: 'caixa' }).linhas[i].v)])] },
  ];
}
// busca global (Ctrl K): telas, lançamentos, contas, cobranças, clientes
function buscaGlobal() {
  if ($('.paleta')) return;
  const telas = Object.entries(NOMES).filter(([k]) => !['mov', 'reserva', 'importar', 'conferir', 'lancar'].includes(k)).map(([k, n]) => ({ ic: IC.livro, tit: n, sub: 'tela', ir: k }));
  const v = document.createElement('div'); v.className = 'veu paleta-veu';
  v.innerHTML = `<div class="paleta" role="dialog" aria-modal="true" aria-label="Busca global"><div class="busca">${IC.busca}<input id="q-global" placeholder="Procure tela, lançamento, fornecedor, cliente, valor…" autocomplete="off" aria-label="Busca global"><kbd>Esc</kbd></div><ul id="r-global" role="listbox"></ul><p class="mini">Enter abre · ↑ ↓ escolhe · <b>N</b> novo lançamento · <b>?</b> atalhos</p></div>`;
  document.body.append(v); const q = v.querySelector('input'), ul = v.querySelector('ul'); let res = [], i = 0;
  const fecha = () => v.remove();
  const desenha = () => {
    const x = sa(q.value.trim()); res = [];
    if (!x) res = telas.slice(0, 8);
    else {
      res.push(...telas.filter((tl) => sa(tl.tit).includes(x)));
      db.contas.filter((c) => sa(`${c.desc} ${(c.c / 100).toFixed(2).replace('.', ',')}`).includes(x)).slice(0, 6).forEach((c) => res.push({ ic: IC.doc, tit: c.desc, sub: `a pagar · ${din(c.c)} · ${dataM(c.vence)}`, ir: 'pagar', busca: c.desc }));
      db.cobrancas.filter((c) => sa(`${c.cli} ${c.desc} ${(c.c / 100).toFixed(2).replace('.', ',')}`).includes(x)).slice(0, 6).forEach((c) => res.push({ ic: IC.cobrar, tit: `${c.cli} · ${c.desc}`, sub: `a receber · ${din(c.c)} · ${dataM(c.vence)}`, ir: 'receber', cob: c.id }));
      ordenaMovs(db.movs).filter((m) => sa(`${m.desc} ${m.cli || ''} ${(m.c / 100).toFixed(2).replace('.', ',')}`).includes(x)).slice(0, 8).forEach((m) => res.push({ ic: m.tipo === 'entra' ? IC.entra : IC.sai, tit: m.desc, sub: `lançamento · ${din(m.c)} · ${dataC(m.dia)}`, ir: `mov/${m.id}` }));
    }
    i = Math.min(i, Math.max(0, res.length - 1));
    ul.innerHTML = res.length ? res.slice(0, 20).map((r, k) => `<li role="option" aria-selected="${k === i}" data-k="${k}">${r.ic}<span><b>${t(r.tit)}</b><small>${t(r.sub)}</small></span></li>`).join('') : '<li class="mudo">Nada encontrado.</li>';
  };
  const abre = (r) => { if (!r) return; fecha(); if (r.cob) selCob = r.cob; if (r.busca) buscaPagar = r.busca; location.hash = `#${r.ir}`; mostra(); };
  q.addEventListener('input', () => { i = 0; desenha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); else if (e.key === 'ArrowDown') { i = Math.min(res.length - 1, i + 1); desenha(); e.preventDefault(); } else if (e.key === 'ArrowUp') { i = Math.max(0, i - 1); desenha(); e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); abre(res[i]); } });
  v.addEventListener('click', (e) => { if (e.target === v) fecha(); const li = e.target.closest('li[data-k]'); if (li) abre(res[Number(li.dataset.k)]); });
  desenha(); setTimeout(() => q.focus(), 20);
}
function ajudaAtalhos() { folha(`<h2>Atalhos de teclado</h2><table class="razao"><tbody>${[['Ctrl K ou /', 'Busca global'], ['N', 'Novo lançamento'], ['G e depois P', 'Painel executivo'], ['G e depois L', 'Lançamentos'], ['G e depois A', 'A pagar'], ['G e depois R', 'A receber'], ['G e depois F', 'Fluxo de caixa'], ['G e depois C', 'Conciliação'], ['G e depois D', 'DRE e relatórios'], ['G e depois O', 'Orçamento'], ['?', 'Esta ajuda'], ['Esc', 'Fecha janelas']].map(([k, n]) => `<tr><td><kbd>${k}</kbd></td><td>${n}</td></tr>`).join('')}</tbody></table><button type="button" class="bt largo" data-fecha>Fechar</button>`); }

Object.assign(ACOES, {
  'salvar-mov': (d, bt) => {
    const r = rascunho; guardaRascunho(); const c = Number(r.valor || 0); if ($('#rec-l')) r.receita = $('#rec-l').checked;
    const rv = E.validarRateio(r.rat || []); if (rv) return aviso(rv, true);
    const b = banco(r.banco || bancoInicial()); bt.disabled = true;
    const m = faz(() => N.lancar(db, r.tipo, { c, desc: r.desc, dia: r.dia, pote: r.pote, cat: r.tipo === 'sai' ? r.cat : undefined, receita: r.receita }, r.chave), (x) => (r.tipo === 'entra' ? `${din(x.c)} entrou em ${b.nome} e foi dividido nas reservas.` : `${din(x.c)} saiu de ${b.nome} (reserva ${nomePote(x.pote)}).`));
    if (m && m !== true) {
      Object.assign(m, { banco: b.id, emp: b.emp }); if (r.tipo === 'entra') m.cat = r.cat || (r.receita ? E.CAT_ENTRADA : E.CAT_NAO_RECEITA);
      if (r.rat?.length) m.rat = r.rat.map((x) => ({ cc: x.cc, pct: x.pct })); else if (r.cc) m.cc = r.cc;
      if (r.proj) { m.proj = r.proj; if (!db.projetos.includes(r.proj)) db.projetos.push(r.proj); } if (r.tags?.length) m.tags = r.tags; if (Number.isFinite(r.dcomp)) m.dcomp = r.dcomp; if (r.anexos?.length) m.anexos = r.anexos;
      grava();
    }
    if (m) { if (r.tipo === 'sai' && N.saldos(db)[r.pote] < 0) aviso(`A reserva ${nomePote(r.pote)} ficou negativa.`, true); rascunho = novoRascunho(r.tipo, r.pote); location.hash = '#lancamentos'; } else bt.disabled = false;
  },
  'nova-conta': () => formTitulo('conta'),
  'editar-conta': (d) => formTitulo('conta', db.contas.find((x) => x.id === d.c)),
  'nova-cob': () => formTitulo('cob'),
  'editar-cob': (d) => formTitulo('cob', db.cobrancas.find((x) => x.id === d.c)),
  'pagar-conta': (d) => {
    const c = db.contas.find((x) => x.id === d.c), s = N.situacaoConta(db, c), e = E.encargos(c, s.falta);
    if (!E.liberado(db, c)) return aviso(E.estadoAprov(db, c) === 'recusada' ? `Pagamento recusado: ${c.aprov.motivo || ''}` : 'Este pagamento ainda espera aprovação.', true);
    formFolha(`<h2>Pagar: ${t(c.desc)}</h2><p class="mini">Falta ${din(s.falta)}${e.atraso ? ` · ${e.atraso} dia(s) de atraso: multa ${din(e.multa)} e juros ${din(e.juros)}` : ''}. Pagou só uma parte? Digite o valor que saiu.</p>${campoValor('v', 'Valor pago (R$)', e.total)}${campoDiaPag()}${campoBanco(c.banco, 'Saiu da conta')}<p class="mini">O que passar do valor da conta vira lançamento de juros e multa.</p><button class="bt cheio largo">Guardar pagamento</button>`, (f) => {
      const m = baixaTitulo('conta', c, valorC(f.get('v')), diaPag(f), f.get('banco')); hist(`Pagou ${c.desc} (${din(valorC(f.get('v')))})`); return `${din(m.c)} pago${valorC(f.get('v')) > m.c ? ' + juros e multa' : ''}.`;
    });
  },
  'pagar-fixa': (d) => {
    const f0 = db.fixas.find((x) => x.id === d.f), comp = d.comp || N.situacaoFixa(db, f0).comp, falta = Math.max(0, f0.c - N.pagoFixa(db, f0, comp));
    formFolha(`<h2>Pagar: ${t(f0.desc)}</h2><p class="mini">${t(N.rotuloComp(f0, comp))} · sai da reserva ${t(nomePote(f0.pote))} (${din(N.saldos(db)[f0.pote])}). Pagou com juros ou desconto? Digite o valor que pagou de verdade.</p>${campoValor('v', 'Valor pago (R$)', falta || f0.c)}${campoDiaPag()}${campoBanco(f0.banco, 'Saiu da conta')}<button class="bt cheio largo">Guardar pagamento</button>`, (f) => {
      const m = baixaTitulo('fixa', f0, valorC(f.get('v')), diaPag(f), f.get('banco'), { comp }); hist(`Pagou ${f0.desc} (${din(m.c)})`); return `${din(m.c)} pago. Saiu da reserva ${nomePote(m.pote)}.`;
    });
  },
  receber: (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c), e = E.encargos(c, s.falta);
    formFolha(`<h2>Recebi de ${t(c.cli)}</h2><p class="mini">Falta receber ${din(s.falta)}${e.atraso ? ` · com ${e.atraso} dia(s) de atraso, multa e juros somam ${din(e.multa + e.juros)}` : ''}. Recebeu só uma parte? Digite o valor que entrou.</p>${campoValor('v', 'Valor recebido (R$)', e.total)}<label class="campo">Data do recebimento<input name="dpag" type="date" value="${N.isoDe(0)}" max="${N.isoDe(0)}"></label>${campoBanco(c.banco, 'Entrou na conta')}<button class="bt cheio largo">Guardar recebimento</button>`, (f) => {
      const v = valorC(f.get('v')), m = baixaTitulo('cob', c, v, diaPag(f), f.get('banco')); hist(`Recebeu ${din(v)} de ${c.cli}`); return `${din(m.c)} recebido e dividido nas reservas${v > m.c ? ' (+ juros e multa)' : ''}.`;
    });
  },
  'pagar-lote': () => {
    const it = [...selPagar].map((k) => { const [tp, id] = k.split(':'); const x = tp === 'c' ? db.contas.find((y) => y.id === id) : db.fixas.find((y) => y.id === id); if (!x) return null; const falta = tp === 'c' ? N.situacaoConta(db, x).falta : N.situacaoFixa(db, x).falta; return { tp, x, falta, total: tp === 'c' ? E.encargos(x, falta).total : falta, ok: tp !== 'c' || E.liberado(db, x) }; }).filter((y) => y && y.falta);
    if (!it.length) { selPagar.clear(); return mostra(); }
    formFolha(`<h2>Pagar em lote</h2><table class="razao"><tbody>${it.map((y) => `<tr><td>${t(y.x.desc)}${y.ok ? '' : ' <small class="sai">espera aprovação: fica de fora</small>'}</td><td class="dir num">${din(y.total)}</td></tr>`).join('')}<tr class="total"><td>Total</td><td class="dir num">${din(it.filter((y) => y.ok).reduce((a, y) => a + y.total, 0))}</td></tr></tbody></table>
      ${campoDiaPag()}<label class="campo">Sai da conta<select name="banco"><option value="">A conta de cada título</option>${opBancos('')}</select></label><p class="mini">Remessa para o banco (CNAB) e pagamento direto pelo Arca: <b>em breve</b>. Aqui você registra o que pagou no internet banking.</p><button class="bt cheio largo">Registrar ${it.filter((y) => y.ok).length} pagamento(s)</button>`, (f) => {
      const dp = diaPag(f); let n = 0, tot = 0;
      it.filter((y) => y.ok).forEach((y) => { const m = baixaTitulo(y.tp === 'c' ? 'conta' : 'fixa', y.x, y.total, dp, f.get('banco') || E.bancoDe(db, y.x), { comp: y.tp === 'f' ? N.situacaoFixa(db, y.x).comp : undefined }); if (m) { n++; tot += y.total; } });
      selPagar.clear(); hist(`Pagou em lote ${n} título(s) (${din(tot)})`); return `${n} pagamento(s) registrado(s): ${din(tot)}.`;
    });
  },
  'receber-lote': () => {
    const it = [...selRec].map((id) => db.cobrancas.find((x) => x.id === id)).filter((x) => x && N.situacaoCob(db, x).falta);
    if (!it.length) { selRec.clear(); return mostra(); }
    formFolha(`<h2>Receber em lote</h2><table class="razao"><tbody>${it.map((x) => `<tr><td>${t(x.cli)} · ${t(x.desc)}</td><td class="dir num">${din(N.situacaoCob(db, x).falta)}</td></tr>`).join('')}</tbody></table><label class="campo">Data do recebimento<input name="dpag" type="date" value="${N.isoDe(0)}" max="${N.isoDe(0)}"></label><label class="campo">Entrou na conta<select name="banco"><option value="">A conta de cada cobrança</option>${opBancos('')}</select></label><button class="bt cheio largo">Registrar ${it.length} recebimento(s)</button>`, (f) => {
      const dp = diaPag(f); let tot = 0; it.forEach((x) => { const s = N.situacaoCob(db, x); baixaTitulo('cob', x, s.falta, dp, f.get('banco') || E.bancoDe(db, x)); tot += s.falta; });
      selRec.clear(); hist(`Recebeu em lote ${it.length} cobrança(s) (${din(tot)})`); return `${it.length} recebimento(s): ${din(tot)}.`;
    });
  },
  cobrar: async (d) => {
    const c = db.cobrancas.find((x) => x.id === d.c), s = N.situacaoCob(db, c); if (!s.falta) return;
    if (!db.pix) { aviso('Cadastre a chave Pix do grupo em Configurações.', true); location.hash = '#config'; return; }
    const e = E.encargos(c, s.falta), [{ pixCopiaECola }, { qrSVG }] = await Promise.all([import('../base/pix.js'), import('../base/qr.js')]);
    const pix = pixCopiaECola({ chave: db.pix, nome: nomeEmp(c) || db.negocio, cidade: db.cidade || 'BRASIL', valor: e.total / 100, txid: c.id.replace(/[^A-Za-z0-9]/g, '').slice(-20) });
    const msg = `Olá, ${c.cli.split(' ')[0]}! ${s.st === 'atrasada' ? 'Passando para lembrar do' : 'Segue o'} pagamento de ${din(e.total)} (${c.desc})${s.st === 'atrasada' ? `, que venceu ${dia(c.vence)}${e.total > s.falta ? ' (com multa e juros)' : ''}` : c.vence > 0 ? `, com vencimento ${dia(c.vence)}` : ''}.\n\nPix copia e cola:\n${pix}\n\n${nomeEmp(c)}`;
    const mail = `mailto:${encodeURIComponent(c.email || '')}?subject=${encodeURIComponent(`${nomeEmp(c)} · ${c.desc}`)}&body=${encodeURIComponent(msg)}`;
    const marca = (canal) => { if (!(c.avisos ||= []).includes(0)) c.avisos.push(0); hist(`Lembrou ${c.cli} de ${din(e.total)} por ${canal}${DEMO ? ' (simulado)' : ''}`); grava(); };
    folha(`<h2>Cobrar ${t(c.cli)}</h2><p class="sub">${din(e.total)} · ${t(c.desc)}${e.total > s.falta ? ` · inclui multa e juros de ${din(e.total - s.falta)}` : ''}</p><div class="qr-pix">${qrSVG(pix, 200)}</div><label class="campo">Pix copia e cola<textarea readonly rows="3">${t(pix)}</textarea></label>
      <div class="linha">${DEMO ? `<button type="button" class="bt cheio" data-sim-envio="WhatsApp">Mandar no WhatsApp</button><button type="button" class="bt" data-sim-envio="e-mail" ${c.email ? '' : 'disabled title="Cadastre o e-mail do cliente"'}>Mandar por e-mail</button>` : `<a class="bt cheio" target="_blank" rel="noopener" data-enviou="WhatsApp" href="${zap(c.tel, msg)}">Mandar no WhatsApp</a>${c.email ? `<a class="bt" data-enviou="e-mail" href="${mail}">Mandar por e-mail</a>` : ''}`}<button type="button" class="bt" data-copiar>Copiar Pix</button></div>
      <p class="mini">${DEMO ? 'Na demonstração o envio é simulado: nada sai do seu computador.' : 'O WhatsApp e o e-mail abrem com a mensagem pronta; você confere e envia.'} O Arca registra o lembrete na régua.${c.email ? '' : ' Para mandar por e-mail, cadastre o e-mail do cliente na cobrança.'}</p>`, (f, fecha) => {
      f.querySelector('[data-copiar]').addEventListener('click', () => navigator.clipboard?.writeText(pix).then(() => aviso('Pix copiado.'), () => aviso('Copie o texto acima.', true)));
      f.querySelectorAll('[data-enviou]').forEach((a) => a.addEventListener('click', () => { marca(a.dataset.enviou); setTimeout(mostra, 300); }));
      f.querySelectorAll('[data-sim-envio]').forEach((b) => b.addEventListener('click', () => { marca(b.dataset.simEnvio); fecha(); mostra(); aviso(`Lembrete por ${b.dataset.simEnvio} enviado para ${c.cli} (simulado na demonstração).`); }));
    });
  },
  'cobrar-cli': (d) => { const c = db.cobrancas.filter((x) => x.cli === d.cli && N.situacaoCob(db, x).st === 'atrasada').sort((a, b) => a.vence - b.vence)[0]; if (c) ACOES.cobrar({ c: c.id }); },
  'lembrar-todos': () => {
    const l = E.lembretesHoje(db).filter(({ x }) => !empSel || E.empDe(db, x) === empSel); if (!l.length) return;
    if (DEMO) { l.forEach(({ x }) => { if (!(x.avisos ||= []).includes(0)) x.avisos.push(0); }); hist(`Lembrou ${l.length} cliente(s) pela régua (simulado)`); grava(); mostra(); return aviso(`${l.length} lembrete(s) enviados por WhatsApp e e-mail (simulado na demonstração).`); }
    folha(`<h2>Lembretes de hoje</h2><p class="mini">Toque em cada um: abre pronto para você enviar.</p><table class="razao"><tbody>${l.map(({ x, s }) => `<tr><td>${t(x.cli)}</td><td class="num">${din(s.falta)}</td><td class="acoes"><button type="button" class="bt pq cheio" data-acao="cobrar" data-c="${x.id}" data-fecha>Lembrar</button></td></tr>`).join('')}</tbody></table>`);
  },
  aprovar: (d) => { const c = db.contas.find((x) => x.id === d.c); try { E.aprovar(db, usuarioAtual, c, true); hist(`Aprovou o pagamento de ${c.desc} (${din(c.c)})`); grava(); mostra(); aviso(`Aprovado: ${c.desc}. Já pode pagar.`); } catch (e) { aviso(e.message, true); } },
  recusar: (d) => { const c = db.contas.find((x) => x.id === d.c); formFolha(`<h2>Recusar o pagamento</h2><p class="sub">${t(c.desc)} · ${din(c.c)}</p><label class="campo">Motivo (quem lançou vai ver)<textarea name="m" rows="3" maxlength="160" required></textarea></label><button class="bt cheio perigo largo">Recusar</button>`, (f) => { E.aprovar(db, usuarioAtual, c, false, f.get('m')); hist(`Recusou o pagamento de ${c.desc}: ${String(f.get('m')).trim()}`); return 'Pagamento recusado.'; }); },
  transferir: () => formFolha(`<h2>Transferir entre contas</h2><div class="campos-2">${campoBanco(E.bancoPadrao(db), 'De').replace('name="banco"', 'name="de"')}${campoBanco(db.bancos[1]?.id, 'Para').replace('name="banco"', 'name="para"')}${campoValor('v', 'Valor (R$)')}<label class="campo">Data<input name="dpag" type="date" value="${N.isoDe(0)}" max="${N.isoDe(0)}"></label><label class="campo larga">Descrição (opcional)<input name="desc" maxlength="100" placeholder="Ex.: aplicação no CDB, aporte na Transportes"></label></div><p class="mini">Transferência não é receita nem despesa. Entre empresas do grupo, aparece na DFC de cada uma.</p><button class="bt cheio largo">Transferir</button>`, (f) => {
    const dp = diaPag(f); E.exigeAberto(db, dp); const m = E.transferir(db, { c: valorC(f.get('v')), de: f.get('de'), para: f.get('para'), dia: dp, desc: String(f.get('desc') || '').trim() }); carimba(m);
    hist(`Transferiu ${din(m.c)} de ${banco(m.bde).nome} para ${banco(m.bpara).nome}`); return `${din(m.c)} transferido.`;
  }),
  'banco-ed': (d) => {
    const b = d.b ? banco(d.b) : null, usado = b && db.movs.some((m) => E.bancoDe(db, m) === b.id || m.bde === b.id || m.bpara === b.id);
    formFolha(`<h2>${b ? 'Editar conta bancária' : 'Nova conta bancária'}</h2><div class="campos-2"><label class="campo larga">Nome (como aparece no Arca)<input name="nome" required maxlength="40" value="${t(b?.nome || '')}" placeholder="Itaú · movimento"></label><label class="campo">Empresa<select name="emp">${opEmp(b?.emp || empSel || db.empresas[0].id)}</select></label><label class="campo">Tipo<select name="tipo">${[['corrente', 'Conta corrente'], ['aplicacao', 'Aplicação'], ['caixa', 'Caixa (dinheiro)']].map(([k, n]) => `<option value="${k}" ${b?.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="campo">Banco<input name="banco" maxlength="40" value="${t(b?.banco || '')}"></label><label class="campo">Agência<input name="ag" maxlength="12" value="${t(b?.ag || '')}"></label><label class="campo">Conta<input name="num" maxlength="16" value="${t(b?.num || '')}"></label>${b && !usado && db.bancos.length > 1 ? '<label class="check larga"><input type="checkbox" name="tirar"> Excluir esta conta (não tem lançamentos)</label>' : ''}</div>${!b ? '<p class="mini">O saldo de abertura entra como lançamento: depois de criar, lance uma entrada "Saldo de abertura" (não é receita) nesta conta.</p>' : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const nome = String(f.get('nome') || '').trim(); if (!nome) throw new Error('Dê um nome para a conta.');
      if (b && f.get('tirar')) { db.bancos = db.bancos.filter((x) => x !== b); hist(`Excluiu a conta ${b.nome}`); return 'Conta excluída.'; }
      const novo = { nome, emp: f.get('emp'), tipo: f.get('tipo'), banco: String(f.get('banco') || '').trim(), ag: String(f.get('ag') || '').trim(), num: String(f.get('num') || '').trim() };
      if (b) Object.assign(b, novo); else db.bancos.push({ id: `b${Date.now().toString(36)}`, ...novo }); hist(`${b ? 'Editou' : 'Criou'} a conta bancária ${nome}`); return 'Conta salva.';
    });
  },
  'empresa-ed': (d) => {
    const e = d.e ? emp(d.e) : null, usada = e && db.bancos.some((b) => b.emp === e.id);
    formFolha(`<h2>${e ? 'Editar empresa' : 'Nova empresa do grupo'}</h2><label class="campo">Razão social ou nome<input name="nome" required maxlength="60" value="${t(e?.nome || '')}"></label><label class="campo">CNPJ<input name="cnpj" maxlength="18" value="${t(e?.cnpj || '')}" placeholder="00.000.000/0001-00"></label><label class="campo">Regime tributário<select name="regime">${Object.entries(REGIMES).map(([k, n]) => `<option value="${k}" ${(e?.regime || 'simples') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${e && !usada && db.empresas.length > 1 ? '<label class="check"><input type="checkbox" name="tirar"> Excluir (não tem contas bancárias)</label>' : ''}${!e ? '<p class="mini">Uma conta bancária é criada junto; renomeie em Contas e saldos.</p>' : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const nome = String(f.get('nome') || '').trim(), cnpj = String(f.get('cnpj') || '').trim(); if (!nome) throw new Error('Digite o nome.'); if (cnpj && cnpj.replace(/\D/g, '').length !== 14) throw new Error('O CNPJ tem 14 números.');
      if (e && f.get('tirar')) { db.empresas = db.empresas.filter((x) => x !== e); hist(`Excluiu a empresa ${e.nome}`); return 'Empresa excluída.'; }
      if (e) { Object.assign(e, { nome, cnpj, regime: f.get('regime') }); if (db.empresas[0] === e) { db.cnpj = cnpj; db.regime = e.regime; } } else { const id = `e${Date.now().toString(36)}`; db.empresas.push({ id, nome, cnpj, regime: f.get('regime') }); db.bancos.push({ id: `b${Date.now().toString(36)}`, nome: `Conta · ${nome}`.slice(0, 40), banco: '', ag: '', num: '', emp: id, tipo: 'corrente' }); }
      hist(`${e ? 'Editou' : 'Criou'} a empresa ${nome}`); return 'Empresa salva.';
    });
  },
  'conc-banco': (d) => { bancoConc = d.b; location.hash = '#conciliacao'; },
  'conc-manual': (d) => { const m = db.movs.find((x) => x.id === d.m); if (!m) return; m.conc = { em: N.hojeISO(), ref: 'manual', por: usuarioAtual.id }; hist(`Marcou como conferido: ${m.desc}`); grava(); mostra(); aviso('Conferido com o extrato.'); },
  'extrato-exemplo': () => { const b = banco(bancoConc); abreExtrato(`extrato-${sa(b.nome).replace(/[^a-z0-9]+/g, '-')}.ofx`, exemploOFX(b)); },
  'regra-nova': () => formFolha(`<h2>Nova regra de conciliação</h2><label class="campo">Se a descrição do extrato contém<input name="contem" required maxlength="30" placeholder="TARIFA"></label><label class="campo">Tipo<select name="tipo"><option value="sai">Saída</option><option value="entra">Entrada</option><option value="">Qualquer</option></select></label>${campoCat('sai', 'Tarifas bancárias').replace('<select name="cat">', `<select name="cat">${E.catsDoTipo(db, 'entra').map((c) => `<option>${t(c)}</option>`).join('')}`)}${campoCC('')}<button class="bt cheio largo">Criar regra</button>`, (f) => {
    const contem = String(f.get('contem') || '').trim().toUpperCase(); if (contem.length < 2) throw new Error('Digite pelo menos 2 letras.');
    db.regras.push({ id: nid(), contem, tipo: f.get('tipo'), cat: f.get('cat'), cc: ccDe(f) }); hist(`Criou a regra "${contem}" → ${f.get('cat')}`); return 'Regra criada. Vale para os próximos extratos.';
  }),
  'regra-tira': (d) => { const r = db.regras.find((x) => x.id === d.r); db.regras = db.regras.filter((x) => x !== r); hist(`Tirou a regra "${r.contem}"`); grava(); mostra(); },
  'plano-nova': (d) => formFolha(`<h2>${d.pai ? 'Nova subcategoria' : 'Nova categoria'}</h2><p class="mini">${d.pai ? `Dentro de ${t(db.plano.find((p) => p.id === d.pai)?.nome)}` : `No grupo ${t(E.grupo(d.grupo).nome)}`}</p><label class="campo">Nome<input name="n" required maxlength="40"></label><button class="bt cheio largo">Criar</button>`, (f) => {
    const n = String(f.get('n') || '').trim(); if (!n) throw new Error('Digite o nome.'); if (db.plano.some((p) => sa(p.nome) === sa(n))) throw new Error('Já existe uma categoria com esse nome.');
    const pai = d.pai ? db.plano.find((p) => p.id === d.pai) : null; db.plano.push({ id: nid(), nome: n, grupo: pai ? pai.grupo : d.grupo, pai: pai ? pai.id : '' }); hist(`Criou a categoria ${n}`); return 'Categoria criada.';
  }),
  'plano-ed': (d) => {
    const p = db.plano.find((x) => x.id === d.id), usada = db.movs.some((m) => E.catDe(m) === p.nome) || db.contas.some((c) => c.cat === p.nome) || db.fixas.some((c) => c.cat === p.nome);
    formFolha(`<h2>Editar categoria</h2><label class="campo">Nome<input name="n" required maxlength="40" value="${t(p.nome)}"></label>${p.pai ? '' : `<label class="campo">Grupo (linha da DRE)<select name="g">${E.GRUPOS.map((g) => `<option value="${g.k}" ${g.k === p.grupo ? 'selected' : ''}>${g.cod} · ${t(g.nome)}</option>`).join('')}</select></label>`}<label class="check"><input type="checkbox" name="inativa" ${p.ativa === false ? 'checked' : ''}> Inativa (some das listas; o que já foi lançado continua nos relatórios)</label>${!usada && !db.plano.some((x) => x.pai === p.id) ? '<label class="check"><input type="checkbox" name="tirar"> Excluir (não tem lançamentos)</label>' : ''}<p class="mini">Mudar o nome muda em todos os lançamentos, contas e orçamentos que usam esta categoria.</p><button class="bt cheio largo">Salvar</button>`, (f) => {
      if (f.get('tirar')) { db.plano = db.plano.filter((x) => x !== p); hist(`Excluiu a categoria ${p.nome}`); return 'Categoria excluída.'; }
      const n = String(f.get('n') || '').trim(); if (!n) throw new Error('Digite o nome.'); if (n !== p.nome && db.plano.some((x) => sa(x.nome) === sa(n))) throw new Error('Já existe uma categoria com esse nome.');
      if (n !== p.nome) { const de = p.nome; [...db.movs, ...db.contas, ...db.fixas, ...db.cobrancas].forEach((x) => { if (x.cat === de) x.cat = n; }); db.regras.forEach((r) => { if (r.cat === de) r.cat = n; }); if (de in db.orcamento.cat) { db.orcamento.cat[n] = db.orcamento.cat[de]; delete db.orcamento.cat[de]; } hist(`Renomeou a categoria ${de} para ${n}`); }
      p.nome = n; if (f.get('g')) p.grupo = f.get('g'); p.ativa = !f.get('inativa'); return 'Categoria salva.';
    });
  },
  'orc-copiar': () => { const ant = E.mesesAte(mesOrc, 2)[0], o = E.orcamento(db, ant); o.cats.forEach((x) => { if (x.real) db.orcamento.cat[x.k] = Math.round(x.real / 1000) * 1000; }); hist(`Orçamento de ${E.nomeMes(mesOrc)} feito a partir do realizado de ${E.nomeMes(ant)}`); grava(); mostra(); aviso('Orçamento preenchido com o realizado do mês passado.'); },
  cenarios: () => { const c = db.cenarios; formFolha(`<h2>Ajustar os cenários</h2><label class="campo">Otimista: entradas maiores em (%)<input name="ox" type="number" min="0" max="50" value="${c.otimista.receitaExtra}"></label><label class="campo">Pessimista: parte que atrasa 30 dias (%)<input name="pa" type="number" min="0" max="100" value="${c.pessimista.atrasa}"></label><label class="campo">Pessimista: parte que não entra (%)<input name="pp" type="number" min="0" max="100" value="${c.pessimista.perde}"></label><label class="campo">Pessimista: pagamentos maiores em (%)<input name="pg" type="number" min="0" max="50" value="${c.pessimista.gastoExtra}"></label><button class="bt cheio largo">Salvar</button>`, (f) => { const n = (k, max) => { const v = Number(f.get(k)); if (!Number.isInteger(v) || v < 0 || v > max) throw new Error(`Use números inteiros de 0 a ${max}.`); return v; }; db.cenarios = { otimista: { receitaExtra: n('ox', 50) }, pessimista: { atrasa: n('pa', 100), perde: n('pp', 100), gastoExtra: n('pg', 50) } }; return 'Cenários salvos.'; }); },
  aliquotas: (d) => { const al = db.impostos[d.regime]; if (!al) return aviso('O MEI paga valor fixo: cadastre o DAS como conta fixa.', true); const nomes = { das: 'Alíquota efetiva do DAS', presIrpj: 'Presunção do IRPJ', presCsll: 'Presunção da CSLL', irpj: 'IRPJ', csll: 'CSLL', pis: 'PIS', cofins: 'COFINS', icms: 'ICMS (sobre a receita)', iss: 'ISS' };
    formFolha(`<h2>Alíquotas · ${t(REGIMES[d.regime])}</h2><div class="campos-2">${Object.keys(al).map((k) => `<label class="campo">${nomes[k] || k} (%)<input name="${k}" inputmode="decimal" value="${String(al[k]).replace('.', ',')}"></label>`).join('')}</div>${d.regime !== 'simples' ? `<label class="campo">Dia do vencimento do ICMS<input name="diaIcms" type="number" min="1" max="31" value="${db.impostos.diaIcms || 20}"></label>` : ''}<p class="mini">Confira com o seu contador: a alíquota depende do anexo, da atividade e do estado.</p><button class="bt cheio largo">Salvar</button>`, (f) => { Object.keys(al).forEach((k) => { const v = Number(String(f.get(k)).replace(',', '.')); if (!Number.isFinite(v) || v < 0 || v > 100) throw new Error('Alíquotas entre 0 e 100.'); al[k] = v; }); if (f.get('diaIcms')) db.impostos.diaIcms = Math.min(31, Math.max(1, Number(f.get('diaIcms')) || 20)); hist(`Mudou as alíquotas do ${REGIMES[d.regime]}`); return 'Alíquotas salvas.'; }); },
  'lancar-guia': (d) => { const e = emp(d.emp), b = db.bancos.find((x) => x.emp === e.id) || db.bancos[0], ir = /IRPJ/.test(d.nome), c = { id: nid(), desc: `${d.nome} · ${e.nome} · apuração ${E.nomeMes(d.mes, true)}`, c: Number(d.c), vence: Number(d.dia), pote: 'imposto', cat: ir ? 'IRPJ e CSLL' : 'Impostos', cc: 'Fiscal', emp: e.id, banco: b.id, status: 'aberta', criadoPor: usuarioAtual.id, guia: `${d.emp}:${d.nome}:${d.mes}`, multa: 0.33, juros: 1 }; if (E.precisaAprovar(db, c)) c.aprov = { st: 'pendente' }; db.contas.push(c); hist(`Lançou a guia ${c.desc} (${din(c.c)}) em A pagar`); grava(); mostra(); aviso('Guia lançada em A pagar. Confira o valor com o seu contador.'); },
  'usuario-ed': (d) => {
    const u = d.u ? db.usuarios.find((x) => x.id === d.u) : null, unicoDono = u?.perfil === 'dono' && db.usuarios.filter((x) => x.perfil === 'dono').length === 1;
    if (!pode('equipe')) return aviso('Só o dono muda a equipe.', true);
    formFolha(`<h2>${u ? 'Editar pessoa' : 'Nova pessoa'}</h2><label class="campo">Nome<input name="n" required maxlength="60" value="${t(u?.nome || '')}"></label><label class="campo">Perfil<select name="p" ${unicoDono ? 'disabled' : ''}>${Object.entries(E.PERFIS).map(([k, p]) => `<option value="${k}" ${(u?.perfil || 'financeiro') === k ? 'selected' : ''}>${p.nome} · ${p.desc}</option>`).join('')}</select></label><label class="campo">E-mail ou WhatsApp<input name="c" maxlength="80" value="${t(u?.contato || '')}"></label>${u && !unicoDono ? '<label class="check"><input type="checkbox" name="tirar"> Tirar da equipe</label>' : ''}${unicoDono ? '<p class="mini">É o único dono: o perfil não muda.</p>' : ''}<button class="bt cheio largo">Salvar</button>`, (f) => {
      const n = String(f.get('n') || '').trim(); if (!n) throw new Error('Digite o nome.');
      if (u && f.get('tirar')) { db.usuarios = db.usuarios.filter((x) => x !== u); hist(`Tirou ${u.nome} da equipe`); if (u.id === usuarioAtual.id) defineUsuario(); return 'Pessoa tirada.'; }
      const novo = { nome: n.slice(0, 60), contato: String(f.get('c') || '').trim().slice(0, 80), ...(unicoDono ? {} : { perfil: E.PERFIS[f.get('p')] ? f.get('p') : 'financeiro' }) };
      if (u) Object.assign(u, novo); else db.usuarios.push({ id: `u${Date.now().toString(36)}`, perfil: 'financeiro', ...novo });
      hist(`${u ? 'Editou' : 'Incluiu'} ${n} (${E.PERFIS[novo.perfil || u?.perfil].nome})`); defineUsuario(); return 'Equipe salva.';
    });
  },
  'usar-como': (d) => { try { localStorage.setItem(CHAVE_USU, d.u); } catch { /* sem acesso */ } defineUsuario(); mostra(); aviso(`Agora você está como ${usuarioAtual.nome} (${E.PERFIS[usuarioAtual.perfil].nome.toLowerCase()}).`); },
  'trocar-usuario': () => folha(`<h2>Quem está usando este computador?</h2>${window.veltriaPermissoes?.so_leitura ? '<p class="mini">O seu login tem acesso "só ver": qualquer perfil escolhido aqui fica só leitura.</p>' : ''}<div class="lista-mais">${db.usuarios.map((u) => `<a href="#" data-acao="usar-como" data-u="${u.id}" data-fecha><span class="ic">${IC.pessoas}</span><span><b>${t(u.nome)}</b><small>${E.PERFIS[u.perfil]?.nome} · ${E.PERFIS[u.perfil]?.desc}</small></span><span aria-hidden="true">${u.id === usuarioAtual.id ? '✓' : '›'}</span></a>`).join('')}</div>`),
  'fechar-mes': () => { const m = $('#mes-fechar')?.value; if (!m) return; if (m < db.fechado) return aviso('Esse mês já está fechado.', true); folha(`<h2>Fechar até ${E.nomeMes(m)}?</h2><p class="sub">Nenhum lançamento até o fim de ${E.nomeMes(m)} poderá ser criado, editado ou apagado. Só o dono reabre, e a reabertura fica na auditoria.</p><div class="linha"><button type="button" class="bt cheio" data-sim>Fechar</button><button type="button" class="bt" data-fecha>Cancelar</button></div>`, (f, fecha) => f.querySelector('[data-sim]').addEventListener('click', () => { db.fechado = m; hist(`Fechou o período até ${E.nomeMes(m)}`); grava(); fecha(); mostra(); aviso(`Fechado até ${E.nomeMes(m)}.`); })); },
  'reabrir-mes': () => { const m = db.fechado; formFolha(`<h2>Reabrir ${E.nomeMes(m)}?</h2><p class="sub">O mês volta a aceitar mudanças. Diga o motivo (vai para a auditoria).</p><label class="campo">Motivo<input name="m" required maxlength="120"></label><button class="bt cheio perigo largo">Reabrir</button>`, (f) => { const mo = String(f.get('m') || '').trim(); if (!mo) throw new Error('Diga o motivo.'); db.fechado = E.mesesAte(m, 2)[0]; hist(`Reabriu ${E.nomeMes(m)}: ${mo}`); return `${E.nomeMes(m)} reaberto.`; }); },
  'salvar-filtro': () => formFolha(`<h2>Salvar este filtro</h2><p class="mini">Busca "${t(filtro.busca || '—')}", ${filtro.tipo || 'todos os tipos'}, período ${t(filtro.per)}${filtro.cat ? `, ${t(filtro.cat)}` : ''}${filtro.banco ? `, ${t(banco(filtro.banco)?.nome)}` : ''}${filtro.tag ? `, #${t(filtro.tag)}` : ''}${empSel ? `, ${t(emp(empSel).nome)}` : ''}.</p><label class="campo">Nome do filtro<input name="n" required maxlength="50"></label><button class="bt cheio largo">Salvar</button>`, (f) => { const n = String(f.get('n') || '').trim(); if (!n) throw new Error('Dê um nome.'); db.filtros.push({ id: nid(), nome: n, f: { ...filtro, emp: empSel } }); return 'Filtro salvo.'; }),
  'filtros-ed': () => folha(`<h2>Filtros salvos</h2><table class="razao"><tbody>${db.filtros.map((f) => `<tr><td>${t(f.nome)}</td><td class="acoes"><button type="button" class="bt pq" data-tira-filtro="${f.id}">Tirar</button></td></tr>`).join('')}</tbody></table><button type="button" class="bt largo" data-fecha>Fechar</button>`, (f, fecha) => f.querySelectorAll('[data-tira-filtro]').forEach((b) => b.addEventListener('click', () => { db.filtros = db.filtros.filter((x) => x.id !== b.dataset.tiraFiltro); grava(); fecha(); mostra(); }))),
  anexos: (d) => { const x = donoAnexo(d.tipoA, d.id); if (!x) return; folha(`<h2>Anexos</h2><p class="sub">${t(x.desc || x.cli || '')}</p><ul class="anexos-l">${(x.anexos || []).map((a, i) => `<li><button type="button" class="bt pq" data-abre-anexo="${i}">${IC.clipe} ${t(a.nome)}</button><small>${kb(a.tam || 0)}${a.exemplo ? ' · exemplo' : ''}</small></li>`).join('') || '<li class="mudo">Nenhum anexo.</li>'}</ul>${pode('lancar') || pode('pagar') ? `<label class="bt">${IC.clipe} Anexar mais<input type="file" data-anexar-em="${d.tipoA}:${d.id}" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xml" hidden></label>` : ''}<p class="mini">Os arquivos ficam guardados neste computador.</p>`, (f) => f.querySelectorAll('[data-abre-anexo]').forEach((b) => b.addEventListener('click', () => abreAnexo(x.anexos[Number(b.dataset.abreAnexo)], x)))); },
  anexar: (d) => ACOES.anexos(d),
  'exportar-xlsx': () => import('../base/xlsx.js').then(({ baixarXlsx }) => { baixarXlsx(`arca-${sa(db.negocio).replace(/[^a-z0-9]+/g, '-')}-${N.hojeISO()}.xlsx`, exportaAbas()); hist('Exportou os relatórios para o Excel'); grava(); aviso('Planilha do Excel baixada.'); }),
  'exportar-contador': () => { const m = $('#mes-contador')?.value || N.hojeISO().slice(0, 7); import('../base/xlsx.js').then(({ baixarXlsx }) => { baixarXlsx(`arca-contador-${m}.xlsx`, pacoteContador(m)); hist(`Gerou o pacote do contador de ${E.nomeMes(m)}`); grava(); aviso('Pacote do contador baixado.'); }); },
  'enviar-contador': () => { const ct = db.usuarios.find((u) => u.perfil === 'contador'), m = $('#mes-contador')?.value || ''; if (DEMO) { hist(`Enviou o pacote de ${E.nomeMes(m)} para ${ct.nome} (simulado)`); grava(); return aviso(`Pacote de ${E.nomeMes(m)} enviado para ${ct.nome} (simulado na demonstração).`); } ACOES['exportar-contador'](); location.href = `mailto:${encodeURIComponent(/@/.test(ct.contato) ? ct.contato : '')}?subject=${encodeURIComponent(`${db.negocio} · fechamento de ${E.nomeMes(m)}`)}&body=${encodeURIComponent(`Olá, ${ct.nome.split(' ')[0]}!\n\nSegue o pacote do mês (planilha baixada do Arca: arca-contador-${m}.xlsx). Anexe o arquivo antes de enviar.\n\n${db.dono}`)}`; },
  imprimir: () => print(),
  procurar: () => buscaGlobal(),
  'rateio-l': () => { guardaRascunho(); rascunho.rat = rascunho.rat?.length ? [] : [{ cc: rascunho.cc || '', pct: 50 }, { cc: '', pct: 50 }]; mostra(); },
  'rateio-mais': () => { guardaRascunho(); rascunho.rat.push({ cc: '', pct: 0 }); mostra(); },
});
// ações que pedem permissão: quem não pode não faz (o botão já some; isto é a segunda trava)
const acaoComPerm = (nome) => { const p = PRECISA[nome]; if (p && !pode(p)) { aviso(`Seu perfil (${E.PERFIS[usuarioAtual.perfil].nome.toLowerCase()}) não pode fazer isso.`, true); return false; } return true; };
function somaRat() { const el = $('#rat-soma'); if (!el || !rascunho?.rat?.length) return; const s = rascunho.rat.reduce((a, x) => a + (Number(x.pct) || 0), 0); el.innerHTML = s === 100 ? 'Soma: <b>100%</b>' : `Soma: <b class="sai">${s}%</b> (precisa dar 100%)`; }
function verRecibo(r) {
  const txt = `Recibo nº ${r.num}. Recebi de ${r.cli} a quantia de ${din(r.c)}, referente a ${r.ref}. ${db.negocio}${db.cnpj ? ` · CNPJ ${db.cnpj}` : ''} · ${N.dataDe(r.dia).toLocaleDateString('pt-BR')}`;
  folha(`<h2>Recibo nº ${r.num}</h2><div class="recibo">${db.logo ? `<img class="recibo-logo" src="${t(db.logo)}" alt="Logo de ${t(db.negocio)}">` : ''}<h3>Recibo nº ${r.num} · ${din(r.c)}</h3><p>${t(txt)}</p><p style="margin-top:28px;border-top:1px solid #999;padding-top:4px;width:70%">${t(db.dono)}</p></div><div class="linha"><a class="bt cheio" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar no WhatsApp</a><button type="button" class="bt" onclick="print()">Imprimir ou PDF</button><button type="button" class="bt" data-fecha>Fechar</button></div>`);
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
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) { if (ac.tagName === 'A' && ac.dataset.acao !== 'cancelar-imp') e.preventDefault(); if (acaoComPerm(ac.dataset.acao)) ACOES[ac.dataset.acao](ac.dataset, ac); return; }
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
  const cm = el.closest('[data-como]'); if (cm) { comoUsar(cm.dataset.como); return; }
  const tm = el.closest('.temas [data-tema]'); if (tm && !tm.disabled) { if (!pode('cadastros')) return aviso('Só quem cuida dos cadastros troca as cores.', true); db.tema = tm.dataset.tema; grava(); mostra(); aviso(`Cores: ${TEMAS.find((x) => x[0] === db.tema)[1]}.`); return; }
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
    e.preventDefault(); if (!acaoComPerm('extrato-exemplo')) return;
    const f = new FormData(e.target), b = banco(previa.banco), imp = { arquivo: String(previa.arquivo).slice(0, 80), em: new Date().toISOString() }; let par = 0, novos = 0, fora = 0;
    if (N.validarPcts(db.potes) && previa.linhas.some((l, i) => l.tipo === 'entra' && f.get(`a${i}`) === 'novo')) return aviso(N.validarPcts(db.potes), true);
    previa.linhas.forEach((l, i) => {
      const a = f.get(`a${i}`); if (!a || a === 'ignorar') return;
      if (E.fechadoEm(db, l.dia)) { fora++; return; }
      if (a === 'par') { const m = db.movs.find((x) => x.id === l.par); if (m) { m.conc = { em: N.hojeISO(), ref: l.ref || `${previa.arquivo}:${i}`, por: usuarioAtual.id }; par++; } return; }
      const cat = f.get(`c${i}`) || undefined, m = N0.lancar(db, l.tipo, { c: l.c, desc: l.desc, dia: l.dia, pote: f.get('pote'), cat: l.tipo === 'sai' ? cat : undefined, receita: !!f.get('receita'), origem: 'importacao', imp }, l.ref ? `ref:${l.ref}` : undefined);
      if (m) { Object.assign(m, { banco: b.id, emp: b.emp, por: usuarioAtual.id, conc: { em: N.hojeISO(), ref: l.ref || `${previa.arquivo}:${i}`, por: usuarioAtual.id } }); if (l.ref) m.ref = l.ref; if (l.tipo === 'entra') m.cat = cat || E.CAT_ENTRADA; if (l.cc) m.cc = l.cc; novos++; }
    });
    hist(`Conciliou ${b.nome} com ${previa.arquivo}: ${par} par(es), ${novos} lançamento(s) novo(s)`); previa = null; grava(); location.hash = '#conciliacao';
    aviso(`${par} conciliado(s) com o que já estava lançado e ${novos} lançamento(s) novo(s).${fora ? ` ${fora} linha(s) de mês fechado ficaram de fora.` : ''}`);
    return;
  }
  if (e.target.id === 'f-regua') { e.preventDefault(); if (!acaoComPerm('nova-cob')) return; const f = new FormData(e.target), dias = [...new Set(String(f.get('dias')).split(/[,;\s]+/).filter(Boolean).map(Number))]; if (!dias.length || dias.some((d) => !Number.isInteger(d) || d < -30 || d > 120)) return aviso('Use números inteiros entre -30 e 120, separados por vírgula.', true); db.regua = { dias: dias.sort((a, b) => a - b), whatsapp: !!f.get('whatsapp'), email: !!f.get('email') }; hist(`Mudou a régua de cobrança: ${db.regua.dias.join(', ')}`); grava(); mostra(); aviso('Régua salva.'); return; }
  if (e.target.id === 'f-alcada') { e.preventDefault(); if (!acaoComPerm('usuario-ed')) return; const c = N.centavos(new FormData(e.target).get('v') || '0'); if (!Number.isInteger(c) || c < 0) return aviso('Valor inválido.', true); db.alcada.limite = c; db.contas.forEach((x) => { if (!x.aprov && E.precisaAprovar(db, x) && N.situacaoConta(db, x).falta) x.aprov = { st: 'pendente' }; }); hist(`Mudou a alçada de aprovação para ${c ? din(c) : 'desligada'}`); grava(); mostra(); aviso(c ? `Pagamentos a partir de ${din(c)} precisam de aprovação.` : 'Aprovação desligada.'); return; }
  if (e.target.id === 'f-orc-nova') { e.preventDefault(); if (!acaoComPerm('orc-copiar')) return; const f = new FormData(e.target); try { db.orcamento.cat[f.get('k')] = valorC(f.get('v')); grava(); mostra(); aviso('Categoria orçada.'); } catch (x) { aviso(x.message, true); } return; }
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
  if (el.id === 'arq-extrato' && el.files[0]) { const arq = el.files[0]; if (arq.size > 5e6) return aviso('Arquivo grande demais (máximo 5 MB).', true); arq.text().then((txt) => { const r = N.lerExtrato(txt, arq.name); if (!r.linhas.length) aviso('Nenhum lançamento pôde ser lido. Veja o motivo abaixo.', true); abreExtrato(arq.name, r.linhas, r.erros); }); }
  if (el.id === 'logo-in' && el.files[0]) { if (!pode('cadastros')) return aviso('Só quem cuida dos cadastros troca a logo.', true); imagemPequena(el.files[0]).then((d) => { db.logo = d; hist('Trocou a logo do grupo'); grava(); mostra(); aviso('Logo salva.'); }).catch((x) => aviso(x.message, true)); }
  if (el.id === 'foto-eu' && el.files[0]) { imagemPequena(el.files[0], 160).then((d) => { const u = db.usuarios.find((x) => x.id === usuarioAtual?.id); if (!u) return; u.foto = d; grava(); defineUsuario(); mostra(); aviso('Foto salva.'); }).catch((x) => aviso(x.message, true)); }
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
  if ($('#banco-l')) rascunho.banco = $('#banco-l').value;
  if ($('#proj-l')) rascunho.proj = $('#proj-l').value.trim().slice(0, 40);
  if ($('#tags-l')) rascunho.tags = lerTags($('#tags-l').value);
  if ($('#comp-l')) { const d = $('#comp-l').value ? N.diaDe($('#comp-l').value) : NaN; rascunho.dcomp = Number.isFinite(d) ? d : undefined; }
  document.querySelectorAll('[data-rat-cc]').forEach((i) => { const k = Number(i.dataset.ratCc); if (rascunho.rat?.[k]) rascunho.rat[k].cc = i.value.trim().slice(0, 40); });
  document.querySelectorAll('[data-rat-pct]').forEach((i) => { const k = Number(i.dataset.ratPct); if (rascunho.rat?.[k]) rascunho.rat[k].pct = Math.round(Number(i.value) || 0); });
  if ($('#valor-l')) { const c = N.centavos($('#valor-l').value || ''); rascunho.valor = Number.isInteger(c) && c > 0 ? String(c) : ''; }
}
function atualizaLancar() {
  // digitar o valor não redesenha a tela (o cursor fica no lugar): só a prévia da divisão e o botão
  guardaRascunho(); const c = Number(rascunho.valor || 0), bt = document.querySelector('[data-acao="salvar-mov"]');
  const pv = $('#prev-div'); if (pv) pv.innerHTML = prevDivisao(rascunho, c);
  if (bt) { bt.textContent = `Guardar ${din(c)}`; bt.disabled = !c || (rascunho.tipo === 'entra' && !!N.validarPcts(db.potes)); }
}
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
// telas novas: abas, filtros, seleção em lote, orçamento, atalhos
const LIMPO = { busca: '', tipo: '', per: '30', cat: '', banco: '', tag: '', emp: '' };
document.addEventListener('click', (e) => {
  const x = (sel) => e.target.closest(sel);
  let el;
  if ((el = x('[data-aba-rec]'))) { abaRec = el.dataset.abaRec; location.hash = abaRec === 'cobrancas' ? '#receber' : `#receber/${abaRec}`; mostra(); return; }
  if ((el = x('[data-aba-rel]'))) { abaRel = el.dataset.abaRel; location.hash = `#relatorios/${abaRel}`; mostra(); return; }
  if ((el = x('[data-per-dre]'))) { perDre = el.dataset.perDre; mostra(); return; }
  if ((el = x('[data-base]'))) { baseDre = el.dataset.base; mostra(); return; }
  if ((el = x('[data-modo-comp]'))) { modoComp = el.dataset.modoComp; mostra(); return; }
  if ((el = x('[data-cen]'))) { cenario = el.dataset.cen; mostra(); return; }
  if ((el = x('[data-gran]'))) { gran = el.dataset.gran; mostra(); return; }
  if ((el = x('[data-mes-orc]'))) { mesOrc = el.dataset.mesOrc; mostra(); return; }
  if ((el = x('[data-fpagar]'))) { fPagar = el.dataset.fpagar; mostra(); return; }
  if ((el = x('[data-banco-conc]'))) { bancoConc = el.dataset.bancoConc; mostra(); return; }
  if ((el = x('[data-filtro-salvo]'))) { const f = db.filtros.find((y) => y.id === el.dataset.filtroSalvo); if (f) { filtro = { ...LIMPO, ...f.f }; empSel = f.f.emp || ''; mostra(); aviso(`Filtro "${f.nome}" aplicado.`); } return; }
  if ((el = x('[data-filtro-banco]'))) { e.preventDefault(); filtro = { ...LIMPO, banco: el.dataset.filtroBanco, per: '90' }; location.hash = '#lancamentos'; return; }
  if ((el = x('[data-filtro-tag]'))) { e.preventDefault(); filtro = { ...LIMPO, tag: el.dataset.filtroTag, per: 'tudo' }; location.hash = '#lancamentos'; return; }
  if ((el = x('[data-limpa-lote]'))) { (el.dataset.limpaLote === 'pagar' ? selPagar : selRec).clear(); mostra(); return; }
  if ((el = x('[data-abre]'))) { const ab = el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', ab); document.querySelectorAll(`tr.det[data-de="${el.dataset.abre}"]`).forEach((r) => { r.hidden = !ab; }); return; }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('[data-lote]')) { const s2 = el.dataset.lote === 'pagar' ? selPagar : selRec; if (el.checked) s2.add(el.value); else s2.delete(el.value); mostra(); return; }
  if (el.matches('[data-lote-todos]')) { const q = el.dataset.loteTodos, s2 = q === 'rec' ? selRec : selPagar; document.querySelectorAll(q === 'rec' ? '[data-lote="rec"]' : q === 'fixa' ? '[data-lote="pagar"][data-fixa]' : '[data-lote="pagar"]:not([data-fixa])').forEach((c) => { if (el.checked) s2.add(c.value); else s2.delete(c.value); }); mostra(); return; }
  if (el.id === 'emp-filtro') { empSel = el.value; mostra(); return; }
  if (el.id === 'f-cat') { filtro.cat = el.value; mostra(); return; }
  if (el.id === 'f-banco') { filtro.banco = el.value; mostra(); return; }
  if (el.id === 'f-tag') { filtro.tag = el.value; mostra(); return; }
  if (el.id === 'banco-l') guardaRascunho();
  if (el.id === 'cat-l' || el.id === 'proj-l' || el.id === 'tags-l' || el.id === 'comp-l') guardaRascunho();
  if (el.matches('[data-orc]')) { if (!acaoComPerm('orc-copiar')) return; const v = el.value.trim(), c = v ? N.centavos(v) : 0; if (!Number.isInteger(c) || c < 0) return aviso('Valor inválido.', true); if (c) db.orcamento[el.dataset.orc][el.dataset.k] = c; else delete db.orcamento[el.dataset.orc][el.dataset.k]; grava(); mostra(); aviso('Orçamento salvo.'); return; }
  if ('cfgProjetos' in el.dataset) { db.projetos = [...new Set(el.value.split('\n').map((y) => y.trim().slice(0, 40)).filter(Boolean))].slice(0, 60); grava(); mostra(); aviso('Projetos salvos.'); return; }
  if (el.matches('[data-regime-emp]')) { const em = emp(el.dataset.regimeEmp); if (!em || !REGIMES[el.value]) return; em.regime = el.value; if (db.empresas[0] === em) db.regime = el.value; hist(`Mudou o regime de ${em.nome} para ${REGIMES[el.value]}`); grava(); mostra(); aviso('Regime salvo.'); return; }
  if (el.id === 'aud-pessoa') { document.querySelectorAll('.auditoria tbody tr').forEach((r) => { r.hidden = !!el.value && r.dataset.por !== el.value; }); return; }
  if (el.id === 'anexo-l' && el.files.length) { guardaRascunho(); guardaAnexos([...el.files]).then((l) => { rascunho.anexos = [...(rascunho.anexos || []), ...l]; mostra(); }); return; }
  if (el.matches('[data-anexar-em]') && el.files.length) { const [tp, id] = el.dataset.anexarEm.split(':'), alvo = donoAnexo(tp, id); guardaAnexos([...el.files]).then((l) => { if (!l.length || !alvo) return; alvo.anexos = [...(alvo.anexos || []), ...l]; hist(`Anexou ${l.length} arquivo(s) em ${alvo.desc || alvo.cli}`); grava(); document.querySelector('.veu:not(.trava)')?.remove(); mostra(); aviso('Anexo guardado neste computador.'); }); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'busca-pagar') { buscaPagar = e.target.value; const pos = e.target.selectionStart; mostra(); const b = $('#busca-pagar'); b.focus(); b.setSelectionRange(pos, pos); }
  if (e.target.matches('[data-rat-cc], [data-rat-pct]')) { guardaRascunho(); somaRat(); }
});
let gPendente = 0;
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName, digitando = /INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable;
  if (digitando || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.veu')) return;
  const k = e.key.toLowerCase();
  if (k === '/') { e.preventDefault(); buscaGlobal(); return; }
  if (k === '?') { e.preventDefault(); ajudaAtalhos(); return; }
  if (gPendente && Date.now() - gPendente < 1500) { gPendente = 0; const ir = { p: 'painel', l: 'lancamentos', a: 'pagar', r: 'receber', f: 'fluxo', c: 'conciliacao', d: 'relatorios/dre', o: 'orcamento', s: 'caixa', i: 'impostos', e: 'equipe' }[k]; if (ir) { location.hash = `#${ir}`; e.preventDefault(); } return; }
  if (k === 'g') { gPendente = Date.now(); return; }
  if (k === 'n' && pode('lancar')) { e.preventDefault(); rascunho = novoRascunho('entra'); location.hash = '#lancar'; mostra(); }
});
defineUsuario();
mostra();

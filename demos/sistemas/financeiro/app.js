// Veltria Financeiro · financeiro e ordens de serviço (referências: Omie, Conta Azul, GestãoClick)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre, paraData,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, linhas, rosca, barrasH, kanban, calGrade, DIAS, normal, baixar,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, fecharGaveta,
} from '../base/nexo.js';
import { LADOS as FERR, ITENS as FERR_ITENS } from './ferramentas.js';
import { acoesLado, ferramentaPaginas, travarPro } from '../base/lado.js';
import { equipeViva, paginaEquipe } from '../base/equipe-viva.js';
import { baixarXlsx } from '../base/xlsx.js';

const TEC = [['diego', 'Diego Araújo', 30], ['renan', 'Renan Souza', 30], ['paulo', 'Paulo Henrique', 25]];
const EQUIPE = { colecao: 'tecnicos', rot: 'Técnicos', icone: 'toolbox', singular: 'técnico', plural: 'técnicos', vazio: 'os técnicos', lista: TEC,
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true }, { nome: 'comissao', rotulo: 'Comissão (%)', tipo: 'porcentagem', padrao: 30 }, { nome: 'telefone', rotulo: 'WhatsApp', tipo: 'tel' }, { nome: 'email', rotulo: 'E-mail de acesso (opcional)', tipo: 'email', ajuda: 'Quando o técnico entra no sistema com este e-mail, abre direto a tela dele' }],
  linha: (r) => [r.id, r.nome, Number(r.comissao || 0), r.email || '', r.telefone || ''], registro: ([id, nome, comissao, email, telefone]) => ({ id, nome, comissao, email, telefone }) };
const padraoEquipe = (eu) => (TEC.find((x) => x[0] === eu) || TEC[0] || [''])[0];
const nomeT = (id) => (TEC.find((x) => x[0] === id) || [, '—'])[1];
const STATUS_OS = [['orcamento', 'Orçamento', '#94a3b8'], ['aprovada', 'Aprovada', '#3b82f6'], ['execucao', 'Em execução', '#f59e0b'], ['aguardando', 'Aguardando peça', '#a855f7'], ['pronta', 'Pronta p/ retirada', '#16a34a'], ['entregue', 'Entregue', '#64748b']];
const stOS = (id) => STATUS_OS.find((x) => x[0] === id) || STATUS_OS[0];
const FORMAS = ['PIX', 'Boleto', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência'];
const CATS = {
  receita: [['servicos', 'Serviços prestados', 'receita'], ['pecas', 'Venda de peças', 'receita'], ['contratos', 'Contratos de manutenção', 'receita'], ['outras_r', 'Outras receitas', 'receita']],
  despesa: [['fornecedores', 'Peças e materiais', 'custo'], ['salarios', 'Salários e encargos', 'pessoal'], ['prolabore', 'Pró-labore', 'pessoal'], ['aluguel', 'Aluguel', 'operacional'], ['energia', 'Energia e água', 'operacional'], ['internet', 'Internet e telefone', 'operacional'], ['combustivel', 'Combustível e veículos', 'operacional', 2000], ['marketing', 'Marketing', 'operacional', 700], ['contador', 'Contabilidade', 'operacional'], ['tarifas', 'Tarifas bancárias', 'financeiro'], ['impostos', 'Impostos (Simples)', 'impostos']],
};
const CATS_PADRAO = { receita: CATS.receita.map((c) => [...c]), despesa: CATS.despesa.map((c) => [...c]) };
const CAT = {};
// tipos de gasto (decidem em que linha do resultado do mês a despesa entra)
const GRUPOS = [['custo', 'Custo do que você vende (peças, materiais, mercadoria)'], ['pessoal', 'Pessoal (salários, pró-labore, encargos)'], ['operacional', 'Despesas do dia a dia (aluguel, contas, marketing…)'], ['financeiro', 'Financeiro (tarifas, juros)'], ['impostos', 'Impostos']];
const nomeGrupo = (g) => (GRUPOS.find((x) => x[0] === g) || [, 'Despesas do dia a dia'])[1].split(' (')[0];
const CAT_PADRAO_IDS = new Set([...CATS.receita, ...CATS.despesa].map(([id]) => id));
function carregarCats(a) {
  const c = a?.db?.cfg?.categorias;
  for (const t of ['receita', 'despesa']) CATS[t].splice(0, CATS[t].length, ...((c && c[t]) || CATS_PADRAO[t]).map((x) => [...x]));
  for (const k of Object.keys(CAT)) delete CAT[k];
  for (const [id, n, g] of [...CATS.receita, ...CATS.despesa]) CAT[id] = { nome: n, grupo: g };
}
function gravarCats(a) { a.db.cfg.categorias = { receita: CATS.receita.map((x) => [...x]), despesa: CATS.despesa.map((x) => [...x]) }; a.db.gravar(); carregarCats(a); }
carregarCats(null);
const COR_CAT = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b', '#22a06b', '#f97316', '#0891b2', '#a3a3a3'];

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const contas = [['Banco Inter', 'bank', 21500], ['Mercado Pago', 'wallet', 4200], ['Caixa da loja', 'money', 800], ['Cartão Inter Empresas', 'credit-card', 0]].map(([nome, icone, saldo_inicial], i) => ({ id: `ct${i}`, nome, icone, saldo_inicial, ...(icone === 'credit-card' ? { dia_vence: 15 } : {}) }));
  const clientesN = ['Restaurante Sabor da Serra', 'Hotel Bela Vista', 'Mercado Bom Preço', 'Padaria Trigo Bom', 'Clínica Vida Plena', 'Escola Pequeno Saber', 'Academia Corpo em Forma', 'Carlos Henrique Dutra', 'Marta Lúcia Andrade', 'Paulo Sérgio Ramos', 'Ana Beatriz Costa', 'Fernando Lima', 'Sorveteria Gelato', 'Açougue Bom Corte', 'Farmácia Popular Centro'];
  const fornecedoresN = ['Eletropeças Centro', 'Distribuidora Frio Sul', 'Gás Refrigerante BR', 'Imobiliária Ponto Certo', 'Cemig', 'Vivo Empresas', 'Posto Avenida', 'Contábil Exata', 'Meta Ads'];
  const RUAS = [['Rua Felipe Schmidt', 'Centro'], ['Av. Beira-Mar Norte', 'Agronômica'], ['Rua Lauro Linhares', 'Trindade'], ['Rua Deputado Antônio Edu Vieira', 'Pantanal'], ['Av. Madre Benvenuta', 'Santa Mônica'], ['Rua Bocaiúva', 'Centro'], ['Rodovia SC-401', 'Saco Grande'], ['Rua Delminda Silveira', 'Agronômica']];
  const pessoas = [...clientesN.map((nome, i) => ({ id: `cli${i}`, nome, tipo: 'cliente', endereco: `${RUAS[i % RUAS.length][0]}, ${120 + i * 37}`, bairro: RUAS[i % RUAS.length][1], cidade: 'Florianópolis', uf: 'SC', doc: i < 7 || i > 11 ? `${11 + i}.${200 + i}.${300 + i}/0001-${10 + i}` : `${100 + i}.${200 + i}.${300 + i}-${10 + i}`, telefone: `(48) 9${8300 + i * 21}-${1400 + i * 33}`, email: `${normal(nome.split(' ')[0])}@email.com` })),
    ...fornecedoresN.map((nome, i) => ({ id: `for${i}`, nome, tipo: 'fornecedor', doc: `${30 + i}.${400 + i}.${500 + i}/0001-${20 + i}`, telefone: `(48) 3${300 + i * 9}-${2000 + i * 13}`, email: '' }))];
  const produtos = [['Capacitor 35+5 µF', 'CAP-355', 18, 45, 22, 8], ['Gás R-410A (kg)', 'GAS-410', 62, 140, 9, 6], ['Gás R-22 (kg)', 'GAS-22', 85, 180, 3, 4], ['Compressor rotativo 12.000 BTU', 'CMP-12K', 780, 1450, 2, 1], ['Placa eletrônica universal', 'PLC-UNI', 120, 290, 4, 2], ['Motor ventilador condensadora', 'MOT-VC', 160, 340, 3, 2], ['Termostato digital', 'TRM-DG', 45, 110, 11, 4], ['Filtro secador', 'FLT-SC', 12, 35, 30, 10], ['Sensor de temperatura', 'SNS-TP', 9, 38, 1, 5], ['Kit instalação (tubulação 3 m)', 'KIT-3M', 95, 220, 7, 3]]
    .map(([nome, codigo, custo, preco, estoque, minimo], i) => ({ id: `pc${i}`, nome, codigo, custo, preco, estoque, minimo }));
  const servicos = [['Visita técnica e diagnóstico', 150], ['Limpeza e higienização de split', 260], ['Carga de gás', 240], ['Troca de compressor (mão de obra)', 950], ['Instalação de ar-condicionado', 720], ['Manutenção de câmara fria', 980], ['Reparo de placa eletrônica', 420], ['Manutenção preventiva (contrato)', 0]].map(([nome, preco], i) => ({ id: `sv${i}`, nome, preco }));
  const lanc = [];
  const CTR_CLI = ['cli0', 'cli1', 'cli2', 'cli4', 'cli5', 'cli6', 'cli12', 'cli13', 'cli14', 'cli3'], CTR_VAL = [2400, 3850, 1950, 1700, 1640, 1520, 980, 890, 1450, 760];
  const add = (o) => lanc.push({ id: `l${lanc.length}`, conciliado: o.status === 'pago' && r() < 0.85, ...o });
  // despesas recorrentes: 6 meses para trás e 2 para frente
  for (let m = -6; m <= 2; m++) {
    const ym = mesMais(m), venc = (d) => `${ym}-${String(d).padStart(2, '0')}`;
    const fixas = [['Aluguel do galpão', 'aluguel', 'for3', 3200, 5], ['Salários (3 técnicos)', 'salarios', null, 8400, 5], ['Pró-labore', 'prolabore', null, 5000, 5], ['Energia elétrica', 'energia', 'for4', ent(780, 1100), 12], ['Internet e celulares', 'internet', 'for5', 389, 15], ['Contabilidade', 'contador', 'for7', 650, 10], ['Combustível', 'combustivel', 'for6', ent(1400, 2100), 25], ['Anúncios Instagram e Google', 'marketing', 'for8', ent(400, 800), 28]];
    for (const [desc, cat, pessoa, valor, dia] of fixas) { const v = venc(dia); add({ tipo: 'despesa', descricao: desc, categoria: cat, pessoa, conta: 'ct0', valor, vencimento: v, status: v < hoje() ? 'pago' : 'aberto', pago_em: v < hoje() ? v : null, forma: esc1(['Boleto', 'PIX', 'Transferência']), recorrente: true }); }
    for (let k = 0; k < ent(3, 4); k++) { const v = venc(ent(3, 27)); add({ tipo: 'despesa', descricao: `Compra de peças · NF ${ent(10000, 99999)}`, categoria: 'fornecedores', pessoa: esc1(['for0', 'for1', 'for2']), conta: 'ct0', valor: ent(900, 2400), vencimento: v, status: v < hoje() ? 'pago' : 'aberto', pago_em: v < hoje() ? v : null, forma: 'Boleto' }); }
    add({ tipo: 'despesa', descricao: 'Tarifas bancárias', categoria: 'tarifas', conta: 'ct0', valor: ent(38, 74), vencimento: venc(28), status: venc(28) < hoje() ? 'pago' : 'aberto', pago_em: venc(28) < hoje() ? venc(28) : null, forma: 'Débito automático' });
    // contratos de manutenção (receita recorrente)
    CTR_CLI.forEach((p, i) => { const v = venc(10); const pago = v < hoje() && !(m === -1 && i === 3) && !(m === 0 && i === 5); add({ tipo: 'receita', descricao: 'Contrato de manutenção preventiva', categoria: 'contratos', pessoa: p, conta: 'ct0', valor: CTR_VAL[i], vencimento: v, status: pago ? 'pago' : 'aberto', pago_em: pago ? diaMais(ent(0, 3), v) : null, forma: 'Boleto', recorrente: true, contrato: `ctr${i}` }); });
  }
  // ordens de serviço (últimos 150 dias), as entregues viram receitas
  const equipamentos = [['Ar-condicionado split 12.000 BTU', 'Samsung', 'Não gela, só ventila'], ['Ar-condicionado split 18.000 BTU', 'LG', 'Pingando água na evaporadora'], ['Câmara fria', 'Gallant', 'Temperatura não baixa de 8 °C'], ['Freezer horizontal 2 portas', 'Metalfrio', 'Compressor não arma'], ['Expositor de bebidas', 'Imbera', 'Faz barulho e congela demais'], ['Geladeira frost free', 'Electrolux', 'Não gela embaixo'], ['Ar-condicionado cassete 36.000 BTU', 'Midea', 'Erro E6 no display'], ['Balcão refrigerado', 'Refrimate', 'Formando gelo no evaporador']];
  const ordens = [];
  for (let i = 0; i < 168; i++) {
    const ini = i < 154 ? -ent(8, 180) : -ent(0, 9);
    const [eq, marca, defeito] = esc1(equipamentos); const c = pessoas[ent(0, 14)];
    let status = i < 154 ? 'entregue' : esc1(['orcamento', 'orcamento', 'aprovada', 'execucao', 'execucao', 'aguardando', 'pronta']);
    const itens = [{ tipo: 'servico', ref: 'sv0', descricao: 'Visita técnica e diagnóstico', qtd: 1, preco: 120 }];
    const sv = esc1(servicos.slice(1, 7)); itens.push({ tipo: 'servico', ref: sv.id, descricao: sv.nome, qtd: 1, preco: sv.preco });
    if (r() < 0.75) { const pc = esc1(produtos); itens.push({ tipo: 'peca', ref: pc.id, descricao: pc.nome, qtd: pc.codigo.startsWith('GAS') ? ent(1, 3) : 1, preco: pc.preco, custo: pc.custo }); }
    const total = soma(itens, (x) => x.qtd * x.preco), entrada = diaMais(ini);
    const externo = /split|cassete|câmara|balcão|expositor/i.test(eq), agenda = i >= 154 && status !== 'pronta' && r() < 0.8;
    const o = { id: `os${i}`, numero: 0, cliente: c.id, equipamento: eq, marca, serie: `SN${ent(100000, 999999)}`, defeito, tecnico: TEC[i % 3][0], status, itens, ...(agenda ? { hora: esc1(['08:00', '09:30', '10:00', '13:30', '14:00', '15:30']), duracao: esc1([1.5, 2, 2, 3]) } : {}), ...(externo ? { local: `${c.endereco} · ${c.bairro} · Florianópolis/SC` } : {}), desconto: r() < 0.15 ? Math.round(total * 0.05) : 0, entrada, previsao: agenda ? diaMais(ent(0, 5)) : diaMais(ent(1, 6), entrada), garantia: 90,
      checklist: ['Liga', 'Carcaça sem danos', 'Controle remoto entregue', 'Cliente informou senha/acesso'].filter(() => r() < 0.7), laudo: status === 'orcamento' ? '' : 'Feito diagnóstico, executado o serviço e testado por 30 minutos. Equipamento funcionando dentro do padrão.' };
    if (status === 'entregue') { o.entregue_em = diaMais(ent(1, 7), entrada); o.aprovada_em = diaMais(1, entrada); if (r() < 0.4 && o.entregue_em <= hoje()) { const nota = esc1([10, 10, 10, 9, 9, 9, 8, 8, 7, 6, 10, 9]); o.nps = { nota, comentario: nota >= 9 ? esc1(['Técnico pontual e caprichoso.', 'Resolveu rápido, recomendo.', '', 'Explicou tudo direitinho.', '']) : nota >= 7 ? esc1(['Bom serviço, mas demorou um pouco.', '']) : 'Precisei ligar duas vezes para saber do conserto.', quando: `${o.entregue_em}T18:00:00.000Z` }; o.avaliacao = o.entregue_em; } }
    ordens.push(o);
    if (status === 'entregue') {
      const v = o.entregue_em, parc = total > 1200 && r() < 0.5 ? 2 : 1, t = total - o.desconto;
      for (let k = 0; k < parc; k++) { const vv = diaMais(k * 30, v); const pago = vv < hoje() && !(i % 11 === 3 && k === parc - 1); add({ tipo: 'receita', descricao: `OS #${o.numero} · ${eq}${parc > 1 ? ` · ${k + 1}/${parc}` : ''}`, categoria: 'servicos', pessoa: c.id, conta: esc1(['ct0', 'ct0', 'ct0', 'ct1']), valor: Math.round((t / parc) * 100) / 100, vencimento: vv, status: pago ? 'pago' : 'aberto', pago_em: pago ? vv : null, forma: esc1(['PIX', 'PIX', 'Cartão de crédito', 'Dinheiro', 'Boleto']), os: o.id }); }
      o.faturada = true;
    }
  }
  ordens.sort((x, y) => x.entrada.localeCompare(y.entrada)).forEach((o, k) => { o.numero = 2040 + k; lanc.filter((l) => l.os === o.id).forEach((l) => { l.descricao = l.descricao.replace(/OS #\d+/, `OS #${o.numero}`); }); });
  // venda de peças avulsa
  for (let i = 0; i < 40; i++) { const v = diaMais(-ent(1, 180)); add({ tipo: 'receita', descricao: `Venda de peças balcão`, categoria: 'pecas', pessoa: null, conta: i % 3 ? 'ct1' : 'ct2', valor: ent(90, 640), vencimento: v, status: 'pago', pago_em: v, forma: 'Dinheiro' }); }
  // impostos (Simples, ~6% da receita do mês anterior)
  for (let m = -5; m <= 1; m++) { const base = soma(lanc.filter((l) => l.tipo === 'receita' && l.vencimento.startsWith(mesMais(m - 1))), (l) => l.valor); const v = `${mesMais(m)}-20`; add({ tipo: 'despesa', descricao: `DAS Simples Nacional (${nomeMes(mesMais(m - 1))})`, categoria: 'impostos', conta: 'ct0', valor: Math.round(base * 0.06), vencimento: v, status: v < hoje() ? 'pago' : 'aberto', pago_em: v < hoje() ? v : null, forma: 'Boleto' }); }
  // extrato bancário para conciliar (Banco Inter, últimos 12 dias)
  const extrato = lanc.filter((l) => l.conta === 'ct0' && l.status === 'pago' && diasAte(l.pago_em) >= -12).map((l) => { l.conciliado = false; return { conta: 'ct0', data: l.pago_em, descricao: l.tipo === 'receita' ? `PIX RECEBIDO ${(pessoas.find((p) => p.id === l.pessoa)?.nome || 'CLIENTE').toUpperCase().slice(0, 22)}` : `PAGTO ${l.forma === 'Boleto' ? 'BOLETO' : 'PIX'} ${(pessoas.find((p) => p.id === l.pessoa)?.nome || l.descricao).toUpperCase().slice(0, 22)}`, valor: l.tipo === 'receita' ? l.valor : -l.valor, conciliado: null }; });
  extrato.push({ conta: 'ct0', data: diaMais(-2), descricao: 'TARIFA MANUTENÇÃO CONTA', valor: -29.9, conciliado: null }, { conta: 'ct0', data: diaMais(-1), descricao: 'PIX RECEBIDO MARTA L ANDRADE', valor: 380, conciliado: null }, { conta: 'ct0', data: diaMais(-3), descricao: 'DEPOSITO EM DINHEIRO', valor: 600, conciliado: null });
  // cartão da empresa: compras do mês (a fatura é paga com uma transferência do banco para o cartão)
  [['Ferramentas · Loja do Refrigerista', 'fornecedores', 640, -9], ['Software de diagnóstico (assinatura)', 'internet', 89, -6], ['Pedágio e estacionamento', 'combustivel', 74, -2]].forEach(([descricao, categoria, valor, d]) => add({ tipo: 'despesa', descricao, categoria, conta: 'ct3', valor, vencimento: diaMais(d), status: 'pago', pago_em: diaMais(d), forma: 'Cartão de crédito', conciliado: true }));
  const transferencias = [{ id: 'tr0', de: 'ct2', para: 'ct0', valor: 600, data: diaMais(-3), obs: 'Depósito do caixa da loja' }];
  const EQ_CTR = [['Câmara fria · cozinha', 'Split 24.000 BTU · salão'], ['Split 18.000 BTU · 12 quartos', 'Cassete 36.000 BTU · recepção'], ['Expositor de bebidas (3)', 'Câmara fria · açougue'], ['Split 12.000 BTU · consultórios (4)'], ['Split 18.000 BTU · salas de aula (6)'], ['Split 24.000 BTU · salão de musculação'], ['Freezer horizontal (2)'], ['Câmara fria · carnes'], ['Split 12.000 BTU · loja', 'Balcão refrigerado'], ['Balcão refrigerado', 'Freezer vertical']];
  const contratos = CTR_CLI.map((cliente, i) => ({ id: `ctr${i}`, cliente, descricao: 'Contrato de manutenção preventiva', valor: CTR_VAL[i], dia: 10, inicio: diaMais(-200 - i * 20), fim: i === 2 ? diaMais(21) : diaMais(165 + i * 20), visitas: ['1', '1', '2', '3', '3', '2', '6', '1', '2', '3'][i], proxima: diaMais([2, 5, -1, 12, 20, 6, 40, 3, 15, 28][i]), tecnico: TEC[i % 3][0], reajuste: 5, equipamentos: EQ_CTR[i].join('\n'), pmoc: i < 6, responsavel: i < 6 ? 'Diego Araújo · CFT 0123456789' : '', status: 'ativo' }));
  return { _cfg: { empresa: 'Refrigeração Polo Frio', endereco: 'Rua Bocaiúva, 455 · Centro · Florianópolis/SC', cnpj: '34.567.890/0001-21', telefone: '(48) 3224-5566', atraso: { multa: 2, juros: 1 }, avaliacao: 'https://example.com/avalie-a-polo-frio', nfse: { padrao: 'nacional', cidade: 'Florianópolis', uf: 'SC', ibge: '4205407', im: '123456', item: '14.01', cnat: '140101', aliq: 3, simples: 3, prox: 1, desc: 'Serviço de manutenção e reparo de refrigeração' } }, contas, pessoas, produtos, servicos, lancamentos: lanc, ordens, extrato, transferencias, contratos };
}

// ---------------------------------------------------------------- regras
const lancs = (a) => a.db.lista('lancamentos');
const pessoa = (a, id) => a.db.obter('pessoas', id);
// como chamar o cliente na mensagem: pessoa pelo primeiro nome, empresa pelo nome inteiro ("Olá, Hotel" não)
const chamar = (p) => { const n = String(p?.nome || '').trim(); if (!n) return ''; const empresa = String(p?.doc || '').replace(/\D/g, '').length === 14 || /\b(ltda|me|eireli|s\.?a|hotel|restaurante|mercado|padaria|cl[ií]nica|escola|academia|sorveteria|a[cç]ougue|farm[aá]cia|loja|condom[ií]nio|supermercado|bar|caf[eé]|oficina|igreja|associa[cç][aã]o)\b/i.test(n); return empresa ? n : n.split(' ')[0]; };
const conta = (a, id) => a.db.obter('contas', id);
// empresa nova começa sem contas: cria o "Caixa" para o lançamento nunca ficar sem onde entrar ou sair o dinheiro
const garantirConta = (a) => a.db.lista('contas')[0]?.id || a.db.salvar('contas', { nome: 'Caixa', icone: 'money', saldo_inicial: 0 }).id;
const sinal = (l) => (l.tipo === 'receita' ? 1 : -1);
const transfs = (a) => a.db.lista('transferencias');
const saldoConta = (a, id, ate = hoje()) => (conta(a, id)?.saldo_inicial || 0) + soma(lancs(a).filter((l) => l.conta === id && l.status === 'pago' && l.pago_em <= ate), (l) => sinal(l) * l.valor)
  + soma(transfs(a).filter((t) => t.data <= ate && (t.para === id || t.de === id)), (t) => (t.para === id ? t.valor : -t.valor));
const ehCartao = (c) => c?.icone === 'credit-card';
const saldoTotal = (a, ate = hoje()) => soma(a.db.lista('contas'), (c) => saldoConta(a, c.id, ate));
const vencido = (l) => l.status === 'aberto' && l.vencimento < hoje();
const etL = (l) => (l.status !== 'pago' && l.informado ? et('Pagamento informado', 'info') : l.status === 'pago' ? et(l.tipo === 'receita' ? 'Recebido' : 'Pago', 'ok') : vencido(l) ? et(`Vencido há ${-diasAte(l.vencimento)}d`, 'er') : diasAte(l.vencimento) === 0 ? et('Vence hoje', 'al') : et('Em aberto', 'info'));
const itensValendo = (o) => o.itens.filter((x) => x.aprovado !== false);
const totalOS = (o) => soma(itensValendo(o), (x) => x.qtd * x.preco) - (o.desconto || 0);
// multa e juros de atraso (Configurações): multa uma vez + juros proporcionais aos dias; só em receita vencida
const regraAtraso = (a) => ({ multa: 0, juros: 0, ...(a.db.cfg.atraso || {}) });
const encargos = (a, l, dia = hoje()) => { if (l.tipo !== 'receita' || l.status !== 'aberto' || l.vencimento >= dia) return 0; const { multa, juros } = regraAtraso(a); return Math.round(l.valor * (Number(multa) / 100 + (Number(juros) / 100) * (diasEntre(l.vencimento, dia) / 30)) * 100) / 100; };
const valorHoje = (a, l) => Math.round((l.valor + encargos(a, l)) * 100) / 100;
// mesmo aparelho: pelo número de série; sem série, mesmo cliente + mesmo equipamento + mesma marca
const mesmoEquip = (x, o) => x.id !== o.id && (o.serie ? normal(x.serie || '') === normal(o.serie) : x.cliente === o.cliente && normal(x.equipamento) === normal(o.equipamento) && normal(x.marca || '') === normal(o.marca || ''));
const garantiaAte = (o) => (o.entregue_em ? diaMais(o.garantia || 90, o.entregue_em) : null);
// valor por extenso (recibo): "mil, duzentos e trinta reais e cinquenta centavos"
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ate999 = (n) => { if (n === 100) return 'cem'; const c = Math.floor(n / 100), r = n % 100, p = []; if (c) p.push(CT[c]); if (r) p.push(r < 20 ? UN[r] : `${DZ[Math.floor(r / 10)]}${r % 10 ? ` e ${UN[r % 10]}` : ''}`); return p.join(' e '); };
function porExtenso(v) {
  const cent = Math.round(Math.abs(Number(v) || 0) * 100), reais = Math.floor(cent / 100), cc = cent % 100;
  const ESC = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']], grupos = [];
  for (let n = reais; n > 0; n = Math.floor(n / 1000)) grupos.push(n % 1000);
  const partes = grupos.map((g, i) => ({ g, i, t: !g ? '' : i === 1 && g === 1 ? 'mil' : `${ate999(g)}${i ? ` ${ESC[i][g === 1 ? 0 : 1]}` : ''}` })).filter((x) => x.t).reverse();
  let txt = ''; partes.forEach((p, k) => { if (k) txt += k === partes.length - 1 && (p.g < 100 || p.g % 100 === 0) ? ' e ' : ', '; txt += p.t; });
  const r = reais ? `${txt}${reais >= 1e6 && grupos[0] === 0 && grupos[1] === 0 ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}` : '';
  const c = cc ? `${ate999(cc)} ${cc === 1 ? 'centavo' : 'centavos'}` : '';
  return [r, c].filter(Boolean).join(' e ') || 'zero real';
}
// custo e lucro da OS: peças pelo custo de compra, comissão do técnico sobre os serviços
const custoPecas = (a, o) => soma(itensValendo(o).filter((i) => i.tipo === 'peca'), (i) => i.qtd * (i.custo ?? a.db.obter('produtos', i.ref)?.custo ?? 0));
const comissaoOS = (o) => { const t = TEC.find((x) => x[0] === o.tecnico); return t ? (soma(itensValendo(o).filter((i) => i.tipo === 'servico'), (i) => i.qtd * i.preco) * t[2]) / 100 : 0; };
const lucroOS = (a, o) => totalOS(o) - custoPecas(a, o) - comissaoOS(o);
// Simples Nacional: faixas da LC 123/2006 (receita dos últimos 12 meses → alíquota e parcela a deduzir)
const ANEXOS = {
  III: [[180000, 6, 0], [360000, 11.2, 9360], [720000, 13.5, 17640], [1800000, 16, 35640], [3600000, 21, 125640], [4800000, 33, 648000]],
  IV: [[180000, 4.5, 0], [360000, 9, 8100], [720000, 10.2, 12420], [1800000, 14, 39780], [3600000, 22, 183780], [4800000, 33, 828000]],
  V: [[180000, 15.5, 0], [360000, 18, 4500], [720000, 19.5, 9900], [1800000, 20.5, 17100], [3600000, 23, 62100], [4800000, 30.5, 540000]],
};
const regraSimples = (a) => ({ anexo: 'III', ...(a.db.cfg.simples || {}) });
function estimarDAS(a, ym) {
  const { anexo } = regraSimples(a), receitaMes = (m) => soma(lancs(a).filter((l) => l.tipo === 'receita' && l.vencimento.startsWith(m) && !/^Multa e juros/.test(l.descricao)), (l) => l.valor);
  const rbt12 = soma(Array.from({ length: 12 }, (_, i) => mesMais(-12 + i, `${ym}-01`)), receitaMes), mes = receitaMes(ym);
  const f = (ANEXOS[anexo] || ANEXOS.III).find(([teto]) => rbt12 <= teto) || ANEXOS.III.at(-1);
  const efetiva = rbt12 ? Math.max(0, (rbt12 * (f[1] / 100) - f[2]) / rbt12) : f[1] / 100;
  return { anexo, rbt12, mes, nominal: f[1], efetiva: efetiva * 100, das: Math.round(mes * efetiva * 100) / 100, acimaDoTeto: rbt12 > 4800000 };
}
// pedido de avaliação (até 10 dias depois da entrega) e retorno da manutenção (6 meses depois, sem OS nova nem contrato)
const paraAvaliar = (a) => (a.db.cfg.avaliacao || temPro(a) ? a.db.lista('ordens').filter((o) => o.status === 'entregue' && !o.avaliacao && o.entregue_em && diasAte(o.entregue_em) >= -10 && pessoa(a, o.cliente)?.telefone) : []);
const paraRetorno = (a) => { const ords = a.db.lista('ordens'), ctr = new Set(a.db.lista('contratos').filter((c) => ctrAtivo(c)).map((c) => c.cliente)); const vistos = new Set(); return ords.filter((o) => o.status === 'entregue' && !o.retorno && o.entregue_em && diasAte(o.entregue_em) <= -170 && diasAte(o.entregue_em) >= -210 && !ctr.has(o.cliente) && pessoa(a, o.cliente)?.telefone && !ords.some((x) => x.cliente === o.cliente && x.entrada > o.entregue_em)).filter((o) => (vistos.has(o.cliente) ? false : vistos.add(o.cliente))); };
const orcParados = (a) => a.db.lista('ordens').filter((o) => o.status === 'orcamento' && totalOS(o) > 0 && diasEntre(o.orc_enviado || o.entrada, hoje()) >= 3 && (!o.orc_lembrete || diasEntre(o.orc_lembrete, hoje()) >= 3));
const VALIDADE_ORC = (a) => Number(a.db.cfg.validade_orc) || 15;
const endCliente = (p) => [p?.endereco, p?.bairro, [p?.cidade, p?.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ');
const mapa = (txt) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(txt)}`;
// ---------------- plano Pro: na demonstração aparece tudo com a etiqueta; na nuvem, o Básico vê o convite
const temPro = (a) => !a.nuvem || !!a.sessao?.pro;
const tagPro = '<span class="ld-tag-pro" style="margin-left:8px;vertical-align:2px">Pro</span>';
const selo = (a) => (a.nuvem ? '' : tagPro);
const trancado = (titulo, texto) => `<div class="cartao ld-trancado"><div class="cartao-cab"><div><h3>${titulo}${tagPro}</h3><div class="sub">${texto}</div></div><button type="button" class="btn pri peq" data-acao="verPro">${ic('lock-simple')}Conhecer o Pro</button></div></div>`;
const BENEFICIOS_FIN = [
  ['user-circle', 'Área do cliente', 'Um link para cada cliente ver os equipamentos em serviço, as garantias e os contratos, pagar as contas em aberto pelo PIX e pedir uma visita.'],
  ['calendar-blank', 'Pedido de visita pelo site', 'Um link e um QR code para o Instagram, o Google e o WhatsApp: o cliente pede a visita e a OS já nasce no sistema.'],
  ['star', 'Pesquisa de satisfação', 'Nota de 0 a 10 depois de cada entrega, com a média por técnico. Quem dá nota alta é levado a avaliar no Google.'],
  ['handshake', 'Contrato aceito pelo celular', 'O cliente lê o contrato de manutenção e aceita com nome e CPF/CNPJ, com data e hora registradas.'],
  ['trophy', 'Desempenho e metas da equipe', 'Ranking dos técnicos com faturamento, lucro, nota dos clientes, retorno em garantia e meta do mês.'],
  ['gauge', 'Score de pagamento do cliente', 'Mostra quem paga em dia e quem costuma atrasar, antes de você fazer o serviço ou parcelar.'],
  ['file-text', 'Fechamento do mês em PDF', 'O relatório do mês para o dono ou o sócio: resultado, comparação com o mês anterior, inadimplência, melhores clientes e serviços.'],
];
// score de pagamento: como o cliente pagou as receitas dele (dias de atraso na baixa e contas vencidas hoje)
function scorePag(a, pid) {
  const ls = lancs(a).filter((l) => l.pessoa === pid && l.tipo === 'receita'), pagas = ls.filter((l) => l.status === 'pago' && l.pago_em), venc = ls.filter(vencido);
  if (pagas.length + venc.length < 2) return { nivel: 'novo', rot: 'Cliente novo', tom: 'info', txt: 'Ainda sem histórico de pagamento' };
  const atrasos = pagas.map((l) => Math.max(0, diasEntre(l.vencimento, l.pago_em))), emDia = atrasos.filter((d) => d <= 2).length, media = atrasos.length ? soma(atrasos, (d) => d) / atrasos.length : 0;
  const pctDia = ((emDia) / ((pagas.length + venc.length) || 1)) * 100, aberto = soma(venc, (l) => l.valor);
  const nivel = venc.some((l) => diasAte(l.vencimento) < -30) || pctDia < 60 || media > 10 ? 'ruim' : pctDia < 90 || venc.length ? 'medio' : 'bom';
  return { nivel, rot: { bom: 'Paga em dia', medio: 'Atrasa às vezes', ruim: 'Costuma atrasar' }[nivel], tom: { bom: 'ok', medio: 'al', ruim: 'er' }[nivel], txt: `${pct(pctDia)} das contas pagas em dia · atraso médio de ${Math.round(media)} ${Math.round(media) === 1 ? 'dia' : 'dias'}${aberto ? ` · ${moeda(aberto)} vencido agora` : ''}`, pctDia, media, aberto };
}
// pesquisa de satisfação (NPS): promotores 9-10, neutros 7-8, detratores 0-6
const notasNPS = (a, dias = 90) => a.db.lista('ordens').filter((o) => o.nps && diasAte(String(o.nps.quando).slice(0, 10)) > -dias);
const calcNPS = (l) => (l.length ? Math.round(((l.filter((o) => o.nps.nota >= 9).length - l.filter((o) => o.nps.nota <= 6).length) / l.length) * 100) : null);
// retorno em garantia: OS nova do mesmo aparelho enquanto a anterior ainda estava na garantia
const voltouNaGarantia = (a, o) => a.db.lista('ordens').some((x) => mesmoEquip(x, o) && x.entrada > (o.entregue_em || '9') && x.entrada <= (garantiaAte(o) || ''));
const VISITAS = [['1', 'Todo mês'], ['2', 'A cada 2 meses'], ['3', 'A cada 3 meses'], ['6', 'A cada 6 meses'], ['12', 'Uma vez por ano']];
const ctrAtivo = (c, dia = hoje()) => c.status !== 'encerrado' && c.status !== 'suspenso' && (!c.inicio || c.inicio <= dia) && (!c.fim || c.fim >= dia);
const os = (a, id) => a.db.obter('ordens', id);
const valorFmt = (l) => `<span class="${l.tipo === 'receita' ? 'ok-tx' : ''}">${l.tipo === 'receita' ? '' : '− '}${moeda(l.valor)}</span>`;

// régua de cobrança: lembrete 3 dias antes, no dia e depois de 3 e 7 dias de atraso
const REGUA = [[-3, 'antes', 'Lembrete: vence em 3 dias'], [0, 'dia', 'Vence hoje'], [3, 'a3', '3 dias de atraso'], [7, 'a7', '7 dias de atraso']];
const reguaHoje = (a) => lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'aberto' && !l.informado && l.pessoa).map((l) => { const atraso = -diasAte(l.vencimento); const passo = REGUA.find(([d]) => d === atraso); return passo && !(l.regua || {})[passo[1]] ? { l, passo } : null; }).filter(Boolean);
const textoRegua = (a, l, passo, url) => { const p = pessoa(a, l.pessoa), nome = chamar(p), enc = encargos(a, l); const base = passo[1] === 'antes' ? `Olá, ${nome}! Passando para lembrar que ${l.descricao} (${moeda(l.valor)}) vence em ${dataBR(l.vencimento)}.` : passo[1] === 'dia' ? `Olá, ${nome}! ${l.descricao} (${moeda(l.valor)}) vence hoje.` : `Olá, ${nome}, tudo bem? Consta em aberto ${l.descricao} (${moeda(l.valor)}), vencido em ${dataBR(l.vencimento)}.${enc ? ` Com multa e juros, o valor hoje é ${moeda(l.valor + enc)}.` : ''}`; return `${base} Para pagar pelo PIX: ${url}\n${a.empresa}`; };

// ---------------------------------------------------------------- coleções
const colecoes = {
  lancamentos: { singular: 'lançamento', plural: 'lançamentos', largura: 640, campos: (a) => [
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['receita', 'Receita (a receber)'], ['despesa', 'Despesa (a pagar)']], obrigatorio: true, padrao: 'despesa' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: [...CATS.receita, ...CATS.despesa].map(([id, n]) => [id, n]), obrigatorio: true, ajuda: 'Crie, renomeie ou apague categorias em Financeiro › Categorias' },
    { nome: 'pessoa', rotulo: 'Cliente / fornecedor', tipo: 'relacao', colecao: 'pessoas' },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true }, { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true, padrao: hoje },
    { nome: 'conta', rotulo: 'Conta', tipo: 'relacao', colecao: 'contas', obrigatorio: true, padrao: (a) => garantirConta(a) }, { nome: 'forma', rotulo: 'Forma de pagamento', tipo: 'selecao', opcoes: FORMAS },
    { nome: 'parcelas', rotulo: 'Repetir / parcelar', tipo: 'selecao', opcoes: [['1', 'Não repetir'], ['2', '2 parcelas'], ['3', '3 parcelas'], ['6', '6 parcelas'], ['12', '12 parcelas'], ['rec', 'Todo mês (12 meses)']], padrao: '1', oculto: false },
  ], validar: (d) => (CAT[d.categoria] && ((d.tipo === 'receita') !== (CAT[d.categoria].grupo !== 'receita')) ? null : 'A categoria não combina com o tipo (receita/despesa)'),
  // lançamento sempre nasce com situação (o formulário não tem esse campo): em aberto, ou pago se for no cartão da empresa
  antesDeSalvar: (d, a, antes) => (antes ? d : { ...d, ...(d.status ? {} : d.tipo === 'despesa' && ehCartao(conta(a, d.conta)) ? { status: 'pago', pago_em: d.vencimento || hoje() } : { status: 'aberto' }) }) },
  contas: { singular: 'conta', genero: 'f', plural: 'contas', campos: [
    { nome: 'nome', rotulo: 'Nome da conta', tipo: 'texto', obrigatorio: true, largo: true, dica: 'Ex.: Banco do Brasil, Nubank, Mercado Pago, Caixa da loja' },
    { nome: 'icone', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['bank', 'Conta no banco'], ['wallet', 'Carteira digital (Mercado Pago, PicPay…)'], ['money', 'Caixa (dinheiro)'], ['credit-card', 'Cartão de crédito da empresa']], obrigatorio: true, padrao: 'bank' },
    { nome: 'saldo_inicial', rotulo: 'Saldo de hoje', tipo: 'moeda', padrao: 0, min: -9999999, ajuda: 'Cartão de crédito: a fatura em aberto, com sinal de menos (ex.: -850)' },
    { nome: 'dia_vence', rotulo: 'Dia de vencimento da fatura', tipo: 'numero', min: 1, ajuda: 'Só para cartão de crédito' },
  ] },
  transferencias: { singular: 'transferência', genero: 'f', plural: 'transferências', largura: 520, campos: (a) => [
    { nome: 'de', rotulo: 'Sai de', tipo: 'relacao', colecao: 'contas', obrigatorio: true, padrao: () => garantirConta(a) }, { nome: 'para', rotulo: 'Entra em', tipo: 'relacao', colecao: 'contas', obrigatorio: true },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true }, { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true, padrao: hoje },
    { nome: 'obs', rotulo: 'Descrição', tipo: 'texto', largo: true, dica: 'Ex.: depósito do caixa, pagamento da fatura do cartão' },
  ], validar: (d) => (d.de && d.de === d.para ? 'Escolha contas diferentes' : null) },
  contratos: { singular: 'contrato', plural: 'contratos', largura: 680, campos: (a) => [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'pessoas', filtrar: (p) => p.tipo === 'cliente', obrigatorio: true },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, padrao: 'Contrato de manutenção preventiva' },
    { nome: 'valor', rotulo: 'Mensalidade', tipo: 'moeda', obrigatorio: true }, { nome: 'dia', rotulo: 'Dia do vencimento', tipo: 'numero', min: 1, padrao: 10 },
    { nome: 'inicio', rotulo: 'Início', tipo: 'data', padrao: hoje }, { nome: 'fim', rotulo: 'Fim da vigência', tipo: 'data', padrao: () => diaMais(365), ajuda: 'O sistema avisa 30 dias antes para renovar' },
    { nome: 'visitas', rotulo: 'Visitas preventivas', tipo: 'selecao', opcoes: VISITAS, padrao: '1', fixo: true }, { nome: 'proxima', rotulo: 'Próxima visita', tipo: 'data', padrao: () => diaMais(7) },
    { nome: 'tecnico', rotulo: 'Técnico responsável', tipo: 'selecao', opcoes: () => TEC.map((t) => [t[0], t[1]]), padrao: () => padraoEquipe('diego') },
    { nome: 'reajuste', rotulo: 'Reajuste anual (%)', tipo: 'porcentagem', padrao: 5, ajuda: 'Ex.: IPCA ou IGP-M do período' },
    { nome: 'equipamentos', rotulo: 'Equipamentos do contrato (um por linha)', tipo: 'texto-longo', dica: 'Ex.: Split 12.000 BTU · recepção · série SN123' },
    { nome: 'pmoc', rotulo: 'Tem PMOC (Lei 13.589/2018)', tipo: 'booleano' }, { nome: 'responsavel', rotulo: 'Responsável técnico do PMOC', tipo: 'texto', dica: 'Nome e registro (CREA ou CFT)' },
    { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: [['ativo', 'Ativo'], ['suspenso', 'Suspenso'], ['encerrado', 'Encerrado']], padrao: 'ativo', fixo: true },
  ] },
  pessoas: { singular: 'cadastro', plural: 'cadastros', campos: [
    { nome: 'nome', rotulo: 'Nome / razão social', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['cliente', 'Cliente'], ['fornecedor', 'Fornecedor']], padrao: 'cliente' },
    { nome: 'doc', rotulo: 'CPF / CNPJ', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel' }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'cep', rotulo: 'CEP', tipo: 'texto', dica: 'preenche o endereço sozinho' }, { nome: 'endereco', rotulo: 'Endereço (rua e número)', tipo: 'texto', largo: true }, { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto' }, { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto' }, { nome: 'uf', rotulo: 'UF', tipo: 'texto', max: 2 }] },
  produtos: { singular: 'peça', genero: 'f', plural: 'peças', campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'codigo', rotulo: 'Código', tipo: 'texto' }, { nome: 'custo', rotulo: 'Custo', tipo: 'moeda' }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true },
    { nome: 'estoque', rotulo: 'Estoque', tipo: 'numero', padrao: 0 }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 2 }] },
  servicos: { singular: 'serviço', plural: 'serviços', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true }] },
  ordens: { singular: 'ordem de serviço', genero: 'f', plural: 'ordens', largura: 680, campos: [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'pessoas', filtrar: (p) => p.tipo === 'cliente', obrigatorio: true }, { nome: 'tecnico', rotulo: 'Técnico', tipo: 'selecao', opcoes: () => TEC.map((t) => [t[0], t[1]]), padrao: () => padraoEquipe('diego') },
    { nome: 'equipamento', rotulo: 'Equipamento', tipo: 'texto', obrigatorio: true, dica: 'Ex.: Ar-condicionado split 12.000 BTU' }, { nome: 'marca', rotulo: 'Marca / modelo', tipo: 'texto' },
    { nome: 'serie', rotulo: 'Nº de série', tipo: 'texto' }, { nome: 'previsao', rotulo: 'Data (entrega ou visita)', tipo: 'data', padrao: () => diaMais(3) },
    { nome: 'hora', rotulo: 'Hora (para a agenda)', tipo: 'hora', ajuda: 'Deixe vazio se for serviço na bancada' }, { nome: 'duracao', rotulo: 'Duração (horas)', tipo: 'numero', min: 0.5, passo: 0.5, padrao: 2 },
    { nome: 'local', rotulo: 'Local do atendimento', tipo: 'texto', largo: true, dica: 'Vazio = na oficina. Para visita, o endereço do cliente' },
    { nome: 'defeito', rotulo: 'Defeito relatado pelo cliente', tipo: 'texto-longo', obrigatorio: true }],
    antesDeSalvar: (d, a, antes) => ({ ...d, numero: antes?.numero || Math.max(1000, ...a.db.lista('ordens').map((o) => o.numero)) + 1, status: antes?.status || 'orcamento', itens: antes?.itens || [{ tipo: 'servico', ref: 'sv0', descricao: 'Visita técnica e diagnóstico', qtd: 1, preco: 120 }], desconto: antes?.desconto || 0, entrada: antes?.entrada || hoje(), garantia: antes?.garantia || 90, checklist: antes?.checklist || [] }) },
};

// ---------------------------------------------------------------- páginas
function cartaoRegua(a) {
  const l = reguaHoje(a);
  if (!l.length) return '';
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Régua de cobrança de hoje</h3><div class="sub">Lembretes automáticos: antes de vencer, no dia e nos atrasos. Cada mensagem já vai com o link de pagamento PIX.</div></div><span class="et info">${l.length}</span></div><ul class="lista">${l.slice(0, 10).map(({ l: x, passo }) => `<li>${av(pessoa(a, x.pessoa)?.nome || '?')}<div class="cresce"><div class="t corta">${esc(pessoa(a, x.pessoa)?.nome || '')}</div><div class="s corta">${esc(passo[2])} · ${esc(x.descricao)}</div></div><b class="num">${moeda(x.valor)}</b><button type="button" class="btn peq pri" data-acao="cobrarLink" data-id="${x.id}" data-passo="${passo[1]}">${ic('whatsapp-logo')}Mandar</button></li>`).join('')}</ul></div>`;
}
// contratos: cobranças do mês que ainda não existem, visitas da semana sem OS, vigência acabando; metas de gasto
const diaDoMes = (ym, d) => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(Math.min(Math.max(1, Number(d) || 10), new Date(y, m, 0).getDate())).padStart(2, '0')}`; };
const cobrancasFaltando = (a, ym = hoje().slice(0, 7)) => a.db.lista('contratos').filter((c) => ctrAtivo(c) && !lancs(a).some((l) => l.contrato === c.id && l.vencimento.startsWith(ym)));
const visitasProximas = (a) => a.db.lista('contratos').filter((c) => ctrAtivo(c) && c.proxima && diasAte(c.proxima) <= 7 && !a.db.lista('ordens').some((o) => o.contrato === c.id && o.visita === c.proxima));
const aRenovar = (a) => a.db.lista('contratos').filter((c) => c.status !== 'encerrado' && c.fim && diasAte(c.fim) <= 30);
const metasMes = (a, ym = hoje().slice(0, 7)) => CATS.despesa.filter((x) => Number(x[3]) > 0).map(([id, n, , meta]) => ({ id, n, meta: Number(meta), gasto: soma(lancs(a).filter((l) => l.tipo === 'despesa' && l.categoria === id && l.vencimento.startsWith(ym)), (l) => l.valor) }));
function cartaoRotina(a) {
  const cob = cobrancasFaltando(a), vis = visitasProximas(a), ren = aRenovar(a), metas = metasMes(a).filter((m) => m.gasto >= m.meta * 0.8), orc = orcParados(a), avl = paraAvaliar(a), ret = paraRetorno(a);
  if (!cob.length && !vis.length && !ren.length && !metas.length && !orc.length && !avl.length && !ret.length) return '';
  const li = (icone, tom, t, s, botao) => `<li><span class="av p" style="background:var(--${tom})">${ic(icone, 'p')}</span><div class="cresce"><div class="t">${t}</div><div class="s">${s}</div></div>${botao}</li>`;
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Para fazer hoje</h3><div class="sub">Contratos de manutenção e limites de gasto</div></div></div><ul class="lista">
    ${cob.length ? li('arrows-clockwise', 'acc', `${cob.length} ${cob.length === 1 ? 'contrato sem cobrança' : 'contratos sem cobrança'} em ${nomeMes(hoje().slice(0, 7))}`, moeda(soma(cob, (c) => c.valor)), `<button type="button" class="btn peq pri" data-acao="gerarCobrancas">Gerar cobranças</button>`) : ''}
    ${vis.length ? li('calendar-check', 'acc', `${vis.length} ${vis.length === 1 ? 'visita preventiva' : 'visitas preventivas'} nos próximos 7 dias`, esc(vis.map((c) => pessoa(a, c.cliente)?.nome || '').join(', ')), `<button type="button" class="btn peq pri" data-acao="abrirVisitas">Abrir as OS</button>`) : ''}
    ${ren.map((c) => li('clock-countdown', 'al', `Contrato de ${esc(pessoa(a, c.cliente)?.nome || '')} ${diasAte(c.fim) < 0 ? 'venceu' : 'vence'} em ${dataCurta(c.fim)}`, `${moeda(c.valor)} por mês · combine a renovação e o reajuste`, `<button type="button" class="btn peq" data-abrir="contrato:${c.id}">Abrir</button>`)).join('')}
    ${metas.map((m) => li('gauge', m.gasto > m.meta ? 'er' : 'al', `${esc(m.n)}: ${moeda(m.gasto)} de ${moeda(m.meta)} no mês`, m.gasto > m.meta ? `<span class="er-tx">Passou ${moeda(m.gasto - m.meta)} do limite</span>` : `Já usou ${pct((m.gasto / m.meta) * 100)} do limite`, `<a class="btn peq fant" href="#/categorias">Limites</a>`)).join('')}
    ${orc.length ? li('hourglass', 'al', `${orc.length} ${orc.length === 1 ? 'orçamento parado' : 'orçamentos parados'} há 3 dias ou mais`, `${moeda(soma(orc, totalOS))} esperando resposta · ${esc(orc.slice(0, 3).map((o) => pessoa(a, o.cliente)?.nome || '').join(', '))}`, `<button type="button" class="btn peq pri" data-acao="verLista" data-l="orc">Lembrar</button>`) : ''}
    ${avl.length ? li('star', 'ok', `${avl.length} ${avl.length === 1 ? 'cliente atendido' : 'clientes atendidos'} nos últimos dias`, 'Peça uma avaliação no Google enquanto a experiência está fresca', `<button type="button" class="btn peq" data-acao="verLista" data-l="avl">Pedir avaliação</button>`) : ''}
    ${ret.length ? li('arrows-clockwise', 'acc', `${ret.length} ${ret.length === 1 ? 'cliente para chamar de volta' : 'clientes para chamar de volta'}`, 'A última manutenção foi há uns 6 meses e eles não têm contrato', `<button type="button" class="btn peq" data-acao="verLista" data-l="ret">Chamar</button>`) : ''}
  </ul></div>`;
}
function painel(a) {
  const ab = lancs(a).filter((l) => l.status === 'aberto'), ym = hoje().slice(0, 7);
  const rec30 = ab.filter((l) => l.tipo === 'receita' && diasAte(l.vencimento) <= 30), pag30 = ab.filter((l) => l.tipo === 'despesa' && diasAte(l.vencimento) <= 30);
  const pagosMes = lancs(a).filter((l) => l.status === 'pago' && l.pago_em.startsWith(ym));
  const res = soma(pagosMes, (l) => sinal(l) * l.valor);
  const dias = Array.from({ length: 31 }, (_, i) => diaMais(i));
  let saldo = saldoTotal(a); const proj = dias.map((d, i) => { if (i) saldo += soma(ab.filter((l) => (l.vencimento < hoje() ? hoje() : l.vencimento) === d), (l) => sinal(l) * l.valor); else saldo += soma(ab.filter((l) => l.vencimento <= d), (l) => sinal(l) * l.valor); return saldo; });
  const minimo = Math.min(...proj);
  const vencR = ab.filter((l) => l.tipo === 'receita' && vencido(l)), hojeL = ab.filter((l) => diasAte(l.vencimento) >= 0 && diasAte(l.vencimento) <= 3).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
  const ords = a.db.lista('ordens').filter((o) => o.status !== 'entregue');
  return `${cartaoRegua(a)}${cartaoRotina(a)}${a.cartaoAlertas ? a.cartaoAlertas() : ''}${kpis([
    { rot: 'Saldo em contas', icone: 'bank', val: moeda(saldoTotal(a)), nota: `${a.db.lista('contas').length} contas`, spark: Array.from({ length: 30 }, (_, i) => saldoTotal(a, diaMais(i - 29))) },
    { rot: 'A receber (30 dias)', icone: 'arrow-down-left', val: moeda(soma(rec30, (l) => l.valor)), nota: vencR.length ? `<span class="er-tx">${moeda(soma(vencR, (l) => l.valor))} vencido</span>` : 'nada vencido' },
    { rot: 'A pagar (30 dias)', icone: 'arrow-up-right', val: moeda(soma(pag30, (l) => l.valor)), nota: `${pag30.length} contas` },
    { rot: `Resultado de ${nomeMes(ym, true).split(' ')[0]}`, icone: 'equals', val: `<span class="${res < 0 ? 'er-tx' : 'ok-tx'}">${moeda(res)}</span>`, nota: 'recebido − pago no mês' },
  ])}
  <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Saldo projetado · próximos 30 dias</h3><div class="sub">Saldo atual + tudo que vence a receber e a pagar</div></div><a class="btn peq" href="#/fluxo">Fluxo de caixa</a></div><div class="cartao-corpo">
      ${minimo < 0 ? `<div class="alerta-linha" style="margin-bottom:12px">${ic('warning')}O caixa fica negativo em ${dataCurta(dias[proj.findIndex((v) => v < 0)])}. Antecipe recebimentos ou renegocie contas.</div>` : `<div class="dica" style="margin-bottom:12px">${ic('check-circle')}<span>O caixa fica positivo nos próximos 30 dias. Menor saldo: <b>${moeda(minimo)}</b> em ${dataCurta(dias[proj.indexOf(minimo)])}.</span></div>`}
      ${linhas({ rotulos: dias.map((d) => dataCurta(d)), series: [{ nome: 'Saldo', cor: 'var(--acc)', v: proj }], fmt: moedaC, altura: 210 })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Contas</h3><div class="sub">Saldo de hoje · clique para editar</div></div><div class="flex" style="gap:6px"><button type="button" class="btn peq" data-acao="novoCad" data-c="contas">${ic('plus')}Nova conta</button><button type="button" class="btn peq" data-acao="transferir">${ic('arrows-left-right')}Transferir</button><button type="button" class="btn peq fant" data-acao="verTransf">Transferências</button><a class="btn peq" href="#/conciliacao">Conciliar</a></div></div><ul class="lista">${a.db.lista('contas').map((c) => { const pend = a.db.lista('extrato').filter((e) => e.conta === c.id && !e.conciliado).length, s = saldoConta(a, c.id); return `<li class="clicavel" data-acao="editarConta" data-id="${c.id}"><span class="av" style="background:var(--acc)">${ic(c.icone, 'p')}</span><div class="cresce"><div class="t">${esc(c.nome)}</div><div class="s">${ehCartao(c) ? (s < 0 ? `<span class="al-tx">Fatura em aberto: ${moeda(-s)}${c.dia_vence ? ` · vence dia ${c.dia_vence}` : ''}</span>` : 'fatura paga') : pend ? `<span class="al-tx">${pend} lançamentos do extrato para conciliar</span>` : 'conciliada'}</div></div>${ehCartao(c) && s < 0 ? `<button type="button" class="btn peq" data-acao="pagarFatura" data-id="${c.id}">Pagar fatura</button>` : ''}<b class="num">${moeda(s)}</b></li>`; }).join('')}<li><div class="cresce t">Total</div><b class="num">${moeda(saldoTotal(a))}</b></li></ul></div></div>
  <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Vencendo nos próximos 3 dias</h3></div><a class="btn peq" href="#/lancamentos">Ver todos</a></div>${hojeL.length ? `<ul class="lista">${hojeL.slice(0, 7).map((l) => `<li class="clicavel" data-abrir="lanc:${l.id}"><span class="av p" style="background:${l.tipo === 'receita' ? 'var(--ok)' : 'var(--er)'}">${ic(l.tipo === 'receita' ? 'arrow-down-left' : 'arrow-up-right', 'p')}</span><div class="cresce"><div class="t corta">${esc(l.descricao)}</div><div class="s">${esc(pessoa(a, l.pessoa)?.nome || CAT[l.categoria]?.nome || '')} · ${relativo(l.vencimento)}</div></div><b class="num">${valorFmt(l)}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada vencendo')}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Ordens de serviço em andamento</h3><div class="sub">${ords.length} abertas · ${moedaC(soma(ords, totalOS))}</div></div><a class="btn peq" href="#/os">Abrir quadro</a></div><div class="cartao-corpo">${barrasH(STATUS_OS.slice(0, 5).map(([id, n, c]) => ({ html: `<span class="flex"><i style="width:9px;height:9px;border-radius:3px;background:${c}"></i>${n}</span>`, v: ords.filter((o) => o.status === id).length, extra: moedaC(soma(ords.filter((o) => o.status === id), totalOS)) })))}</div></div></div>
  ${vencR.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Clientes em atraso</h3><div class="sub">Cobre com um clique pelo WhatsApp</div></div></div><ul class="lista">${vencR.sort((x, y) => x.vencimento.localeCompare(y.vencimento)).map((l) => { const p = pessoa(a, l.pessoa); return `<li>${av(p?.nome || '?')}<div class="cresce"><div class="t corta">${esc(p?.nome || '—')}</div><div class="s corta">${esc(l.descricao)} · venceu ${dataCurta(l.vencimento)}${encargos(a, l) ? ` · com multa e juros: ${moeda(valorHoje(a, l))}` : ''}</div></div><b class="num er-tx">${moeda(l.valor)}</b>${p?.telefone ? `<button type="button" class="btn peq" data-acao="cobrarLink" data-id="${l.id}">${ic('whatsapp-logo')}Cobrar com PIX</button>` : ''}<button type="button" class="btn peq" data-acao="baixar" data-id="${l.id}">${ic('check')}Recebido</button></li>`; }).join('')}</ul></div>` : ''}`;
}

function lancamentosPag(a, [modo]) {
  const vis = modo === 'receber' ? [{ id: 'ab', rot: 'Em aberto', filtro: (l) => l.tipo === 'receita' && l.status === 'aberto' }, { id: 'venc', rot: 'Vencidos', filtro: (l) => l.tipo === 'receita' && vencido(l) }, { id: 'pg', rot: 'Recebidos', filtro: (l) => l.tipo === 'receita' && l.status === 'pago' }]
    : modo === 'pagar' ? [{ id: 'ab', rot: 'Em aberto', filtro: (l) => l.tipo === 'despesa' && l.status === 'aberto' }, { id: 'venc', rot: 'Vencidos', filtro: (l) => l.tipo === 'despesa' && vencido(l) }, { id: 'pg', rot: 'Pagos', filtro: (l) => l.tipo === 'despesa' && l.status === 'pago' }]
      : [{ id: 'mes', rot: 'Este mês', filtro: (l) => l.vencimento.startsWith(hoje().slice(0, 7)) }, { id: 'ab', rot: 'Em aberto', filtro: (l) => l.status === 'aberto' }, { id: 'venc', rot: 'Vencidos', filtro: vencido }, { id: 'todos', rot: 'Todos' }];
  const id = `lanc-${modo || 'todos'}`;
  return a.tab({
    id, colecao: 'lancamentos', singular: 'lançamento', plural: 'lançamentos', ordem: 'vencimento', visoes: vis, buscaDica: 'Buscar por descrição, cliente ou fornecedor…',
    filtros: [{ k: 'categoria', rot: 'Categoria', opcoes: (modo === 'receber' ? CATS.receita : modo === 'pagar' ? CATS.despesa : [...CATS.receita, ...CATS.despesa]).map(([k, n]) => [k, n]) }, { k: 'conta', rot: 'Conta', opcoes: (aa) => aa.db.lista('contas').map((c) => [c.id, c.nome]) }],
    textoBusca: (l) => `${l.descricao} ${pessoa(a, l.pessoa)?.nome || ''} ${CAT[l.categoria]?.nome}`,
    total: (l) => { const r = soma(l.filter((x) => x.tipo === 'receita'), (x) => x.valor), d = soma(l.filter((x) => x.tipo === 'despesa'), (x) => x.valor); return modo === 'receber' ? moeda(r) : modo === 'pagar' ? moeda(d) : `<span class="ok-tx">+${moedaC(r)}</span> <span class="er-tx">−${moedaC(d)}</span>`; },
    novo: { rot: modo === 'receber' ? 'Nova receita' : modo === 'pagar' ? 'Nova despesa' : 'Novo lançamento', attrs: `data-acao="novoLanc" data-t="${modo === 'receber' ? 'receita' : 'despesa'}"` },
    aoClicar: (lid) => a.abrir('lanc', lid),
    massa: [{ rot: modo === 'pagar' ? 'Pagar selecionados' : 'Dar baixa', icone: 'check', acao: (ids) => { ids.forEach((x) => { const l = a.db.obter('lancamentos', x); if (l.status === 'aberto') a.db.salvar('lancamentos', { id: x, status: 'pago', pago_em: hoje() }); }); avisar(`${ids.length} lançamentos baixados hoje`); } },
      { rot: 'Adiar 7 dias', icone: 'clock', acao: (ids) => { ids.forEach((x) => { const l = a.db.obter('lancamentos', x); if (l.status === 'aberto') a.db.salvar('lancamentos', { id: x, vencimento: diaMais(7, l.vencimento) }); }); avisar('Vencimentos adiados'); } },
      { rot: 'Mudar categoria', icone: 'tag', acao: (ids) => a.acoes.mudarCatEmMassa({ ids }) }],
    colunas: [
      { k: 'vencimento', rot: 'Vencimento', render: (l) => `<span class="${vencido(l) ? 'er-tx' : ''}">${dataCurta(l.vencimento)}</span>` },
      { k: 'descricao', rot: 'Descrição', render: (l) => `<span class="prim">${esc(l.descricao)}</span><span class="sub">${esc(pessoa(a, l.pessoa)?.nome || '')}${l.recorrente ? ` ${ic('arrows-clockwise', 'p')}` : ''}</span>` },
      { k: 'categoria', rot: 'Categoria', oc: true, valor: (l) => CAT[l.categoria]?.nome, render: (l) => et(CAT[l.categoria]?.nome || '—', '', 'sem-ponto') },
      { k: 'conta', rot: 'Conta', oc: true, valor: (l) => conta(a, l.conta)?.nome, render: (l) => `<span class="mute-2">${esc(conta(a, l.conta)?.nome || '—')}</span>` },
      { k: 'valor', rot: 'Valor', n: true, valor: (l) => sinal(l) * l.valor, render: valorFmt },
      { k: 'status', rot: 'Situação', valor: (l) => (l.status === 'pago' ? 2 : vencido(l) ? 0 : 1), render: etL, csv: (l) => (l.status === 'pago' ? 'pago' : vencido(l) ? 'vencido' : 'aberto') },
      { k: 'acao', rot: '', ord: false, csv: false, render: (l) => (l.status === 'aberto' ? `<button type="button" class="btn peq" data-acao="baixar" data-id="${l.id}">${ic('check')}${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>` : `<span class="mute" style="font-size:12px">${dataCurta(l.pago_em)}</span>`) },
    ],
  });
}

function categoriasPag(a) {
  const usos = (id) => lancs(a).filter((l) => l.categoria === id).length;
  const bloco = (t) => {
    const lista = CATS[t];
    return `<div class="cartao"><div class="cartao-cab"><div><h3>${t === 'receita' ? 'Receitas' : 'Despesas'}</h3><div class="sub">${t === 'receita' ? 'De onde vem o dinheiro' : 'Para onde vai o dinheiro'} · ${lista.length} categorias</div></div><button type="button" class="btn peq pri" data-acao="novaCat" data-t="${t}">${ic('plus')}Nova categoria</button></div>
      <ul class="lista">${lista.map(([id, n, g], i) => `<li><span class="av p" style="background:${COR_CAT[i % COR_CAT.length]}">${ic(t === 'receita' ? 'arrow-down-left' : 'arrow-up-right', 'p')}</span><div class="cresce"><div class="t">${esc(n)}</div><div class="s">${t === 'despesa' ? `${esc(nomeGrupo(g))} · ` : ''}${usos(id) ? `${usos(id)} lançamentos` : 'nenhum lançamento'}${t === 'despesa' && Number(lista[i][3]) > 0 ? ` · limite ${moeda(lista[i][3])}/mês` : ''}</div></div>
        <button type="button" class="btn fant peq" data-acao="editarCat" data-t="${t}" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="apagarCat" data-t="${t}" data-id="${id}" aria-label="Apagar ${esc(n)}">${ic('trash')}</button></li>`).join('')}</ul></div>`;
  };
  return `<div class="dica">${ic('info')}<span>Monte a lista do seu jeito: crie, renomeie ou apague categorias. Ao renomear, os lançamentos acompanham; ao apagar uma categoria em uso, você escolhe para onde os lançamentos vão. Em cada despesa você pode pôr um limite por mês: o painel avisa quando o gasto chega a 80%.</span></div>
    <div class="flex" style="justify-content:flex-end"><button type="button" class="btn peq fant" data-acao="padraoCats">${ic('arrow-counter-clockwise')}Voltar à lista padrão</button></div>
    <div class="grade g2">${bloco('despesa')}${bloco('receita')}</div>`;
}

function fluxo(a) {
  const st = a.estado.fx ||= { modo: 'mensal' };
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoFx" data-m="mensal" aria-pressed="${st.modo === 'mensal'}">Mensal</button><button type="button" data-acao="modoFx" data-m="diario" aria-pressed="${st.modo === 'diario'}">Diário (30 dias)</button></div><button type="button" class="btn" data-acao="csvFluxo">${ic('table')}Baixar em Excel</button></div>`;
  let linhasT;
  if (st.modo === 'mensal') {
    const meses = Array.from({ length: 9 }, (_, i) => mesMais(i - 6));
    let saldo = saldoTotal(a, diaMais(-1, `${meses[0]}-01`));
    linhasT = meses.map((m) => { const l = lancs(a).filter((x) => (x.status === 'pago' ? x.pago_em : x.vencimento).startsWith(m)); const e = soma(l.filter((x) => x.tipo === 'receita'), (x) => x.valor), s = soma(l.filter((x) => x.tipo === 'despesa'), (x) => x.valor); saldo += e - s; return { rot: nomeMes(m, true), curto: nomeMes(m), e, s, r: e - s, saldo, futuro: m > hoje().slice(0, 7), atual: m === hoje().slice(0, 7) }; });
  } else {
    const dias = Array.from({ length: 30 }, (_, i) => diaMais(i)); let saldo = saldoTotal(a);
    linhasT = dias.map((d, i) => { const l = lancs(a).filter((x) => x.status === 'aberto' && (i === 0 ? x.vencimento <= d : x.vencimento === d)); const e = soma(l.filter((x) => x.tipo === 'receita'), (x) => x.valor), s = soma(l.filter((x) => x.tipo === 'despesa'), (x) => x.valor); saldo += e - s; return { rot: `${DIAS[paraData(d).getDay()]}, ${dataCurta(d)}${i === 0 ? ' (inclui vencidos)' : ''}`, curto: dataCurta(d), e, s, r: e - s, saldo, futuro: true }; });
  }
  a.estado.fxLinhas = linhasT;
  const sim = a.estado.simFx ||= { despesa: 0, receita: 0, atraso: 0 };
  const meses6 = Array.from({ length: 6 }, (_, i) => mesMais(i + 1)), base3 = Array.from({ length: 3 }, (_, i) => mesMais(i - 3));
  const res = (m) => soma(lancs(a).filter((l) => l.vencimento.startsWith(m)), (l) => sinal(l) * l.valor), rec = (m) => soma(lancs(a).filter((l) => l.tipo === 'receita' && l.vencimento.startsWith(m)), (l) => l.valor);
  const medRes = soma(base3, res) / 3, medRec = soma(base3, rec) / 3;
  let s1 = saldoTotal(a), s2 = saldoTotal(a); const serieA = [], serieB = [];
  meses6.forEach(() => { s1 += medRes; s2 += medRes - sim.despesa + sim.receita - (medRec * sim.atraso) / 100; serieA.push(Math.round(s1)); serieB.push(Math.round(s2)); });
  const simulacao = `<div class="cartao"><div class="cartao-cab"><div><h3>E se…?</h3><div class="sub">Simule uma decisão e veja o efeito no caixa dos próximos 6 meses (média dos últimos 3 meses como base)</div></div></div><div class="cartao-corpo">
    <div class="form-grade tres"><label class="campo">Nova despesa por mês<div class="prefixo"><span>R$</span><input type="number" min="0" step="100" value="${sim.despesa}" data-mudar="simFx" data-k="despesa"></div><span class="ajuda">Ex.: contratar alguém, alugar mais um espaço</span></label>
      <label class="campo">Receita extra por mês<div class="prefixo"><span>R$</span><input type="number" min="0" step="100" value="${sim.receita}" data-mudar="simFx" data-k="receita"></div><span class="ajuda">Ex.: novo contrato, aumento de preço</span></label>
      <label class="campo">Clientes que atrasam (%)<input type="number" min="0" max="100" value="${sim.atraso}" data-mudar="simFx" data-k="atraso"><span class="ajuda">Parte da receita que não entra no mês</span></label></div>
    ${linhas({ rotulos: meses6.map((m) => nomeMes(m)), series: [{ nome: 'Como está', cor: '#94a3b8', v: serieA }, { nome: 'Com a mudança', cor: 'var(--acc)', v: serieB }], fmt: moedaC, altura: 200, largura: 1100, zero: false })}
    <div class="${serieB.some((v) => v < 0) ? 'alerta-linha' : 'dica'}" style="margin-top:10px">${ic(serieB.some((v) => v < 0) ? 'warning' : 'info')}<span>${serieB.some((v) => v < 0) ? `Com a mudança, o caixa fica negativo em ${nomeMes(meses6[serieB.findIndex((v) => v < 0)], true)}.` : `Em 6 meses, o saldo fica em ${moeda(serieB.at(-1))}: ${moeda(Math.abs(serieB.at(-1) - serieA.at(-1)))} ${serieB.at(-1) >= serieA.at(-1) ? 'a mais' : 'a menos'} do que sem a mudança.`}</span></div></div></div>`;
  return `${topo}${simulacao}<div class="cartao"><div class="cartao-corpo">${barras({ dados: linhasT.map((x) => ({ rot: x.curto, v: [x.e, x.s] })), series: [{ nome: 'Entradas', cor: '#16a34a' }, { nome: 'Saídas', cor: '#e11d48' }], fmt: moedaC, altura: 260, largura: 1150 })}</div></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>${st.modo === 'mensal' ? 'Mês' : 'Dia'}</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Resultado</th><th class="n">Saldo final</th></tr></thead><tbody>
      ${linhasT.filter((x) => st.modo === 'mensal' || x.e || x.s).map((x) => `<tr style="${x.atual ? 'background:var(--acc-suave)' : ''}"><td>${esc(x.rot)} ${x.futuro && st.modo === 'mensal' ? et('previsto', '', 'sem-ponto') : ''}</td><td class="n ok-tx">${moeda(x.e)}</td><td class="n er-tx">${moeda(x.s)}</td><td class="n"><b class="${x.r < 0 ? 'er-tx' : ''}">${moeda(x.r)}</b></td><td class="n"><b class="${x.saldo < 0 ? 'er-tx' : ''}">${moeda(x.saldo)}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}

function dre(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(i - 5));
  const v = (m, f) => soma(lancs(a).filter((l) => l.vencimento.startsWith(m) && f(l)), (l) => l.valor);
  const porGrupo = (m, g) => v(m, (l) => l.tipo === 'despesa' && CAT[l.categoria]?.grupo === g);
  const rec = (m) => v(m, (l) => l.tipo === 'receita'), imp = (m) => porGrupo(m, 'impostos'), cus = (m) => porGrupo(m, 'custo');
  const desp = (m) => porGrupo(m, 'pessoal') + porGrupo(m, 'operacional') + porGrupo(m, 'financeiro');
  const res = (m) => rec(m) - imp(m) - cus(m) - desp(m);
  const linha = (rot, f, { forte = false, sub = false, neg = false } = {}) => `<tr style="${forte ? 'background:var(--painel-2);font-weight:600' : ''}"><td style="${sub ? 'padding-left:28px;color:var(--tx-2)' : ''}">${rot}</td>${meses.map((m) => { const x = f(m); return `<td class="n ${x < 0 ? 'er-tx' : ''}">${neg && x ? '(' : ''}${moeda(Math.abs(x))}${neg && x ? ')' : ''}</td>`; }).join('')}<td class="n ${soma(meses, f) < 0 ? 'er-tx' : ''}" style="font-weight:600">${neg ? '(' : ''}${moeda(Math.abs(soma(meses, f)))}${neg ? ')' : ''}</td></tr>`;
  const despCats = CATS.despesa.filter(([, , g]) => ['pessoal', 'operacional', 'financeiro'].includes(g));
  return `<div class="dica">${ic('info')}<span>Demonstrativo de resultado gerencial, pelo regime de competência (data de vencimento). Na versão contratada, o plano de contas é o da sua empresa.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Conta</th>${meses.map((m) => `<th class="n" style="text-transform:capitalize">${nomeMes(m)}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>
      ${linha('Receita bruta', rec, { forte: true })}${CATS.receita.map(([id, n]) => linha(n, (m) => v(m, (l) => l.categoria === id), { sub: true })).join('')}
      ${linha('(−) Impostos sobre vendas', imp, { neg: true })}${linha('= Receita líquida', (m) => rec(m) - imp(m), { forte: true })}
      ${linha('(−) Custo das peças e materiais', cus, { neg: true })}${linha('= Lucro bruto', (m) => rec(m) - imp(m) - cus(m), { forte: true })}
      ${linha('(−) Despesas operacionais', desp, { neg: true })}${despCats.map(([id, n]) => linha(n, (m) => v(m, (l) => l.categoria === id), { sub: true, neg: true })).join('')}
      ${linha('= Resultado do período', res, { forte: true })}
      <tr><td class="mute">Margem</td>${meses.map((m) => `<td class="n mute">${pct((res(m) / (rec(m) || 1)) * 100, 1)}</td>`).join('')}<td class="n mute">${pct((soma(meses, res) / (soma(meses, rec) || 1)) * 100, 1)}</td></tr>
    </tbody></table></div></div>
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Para onde vai o dinheiro</h3><div class="sub">Despesas dos últimos 3 meses</div></div></div><div class="cartao-corpo">${rosca({ itens: CATS.despesa.map(([id, n], i) => ({ rot: n, v: soma(lancs(a).filter((l) => l.categoria === id && diasAte(l.vencimento) > -90 && l.vencimento <= hoje()), (l) => l.valor), cor: COR_CAT[i % COR_CAT.length] })).filter((x) => x.v).sort((x, y) => y.v - x.v), centro: moedaC(soma(lancs(a).filter((l) => l.tipo === 'despesa' && diasAte(l.vencimento) > -90 && l.vencimento <= hoje()), (l) => l.valor)), fmt: moedaC })}</div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Resultado por mês</h3></div></div><div class="cartao-corpo">${barras({ dados: meses.map((m) => ({ rot: nomeMes(m), v: [Math.max(0, res(m))] })), series: [{ nome: 'Resultado', cor: 'var(--acc)' }], fmt: moedaC, altura: 200 })}</div></div></div>`;
}

// sugestão de conciliação: um lançamento ou uma transferência da conta com o mesmo valor e até 5 dias de diferença
function sugerir(a, e) {
  const l = lancs(a).find((x) => x.conta === e.conta && !x.conciliado && Math.abs(sinal(x) * x.valor - e.valor) < 0.01 && Math.abs(diasEntre(x.status === 'pago' ? x.pago_em : x.vencimento, e.data)) <= 5);
  if (l) return l;
  const t = transfs(a).find((x) => !(x.conc || {})[e.conta] && ((e.valor > 0 && x.para === e.conta) || (e.valor < 0 && x.de === e.conta)) && Math.abs(x.valor - Math.abs(e.valor)) < 0.01 && Math.abs(diasEntre(x.data, e.data)) <= 5);
  return t ? { t } : null;
}
function conciliacao(a) {
  const st = a.estado.conc ||= { conta: 'ct0' };
  const ext = a.db.lista('extrato').filter((e) => e.conta === st.conta).sort((x, y) => y.data.localeCompare(x.data));
  const pend = ext.filter((e) => !e.conciliado), feitos = ext.filter((e) => e.conciliado);
  const sugestao = (e) => sugerir(a, e);
  return `<div class="entre"><div class="flex"><select data-mudar="contaConc" style="width:auto">${a.db.lista('contas').map((c) => `<option value="${c.id}" ${c.id === st.conta ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select><span class="mute" style="font-size:12.5px">${pend.length} para conciliar · ${feitos.length} conciliados</span></div>
      <div class="flex"><label class="btn">${ic('upload-simple')}Importar extrato (OFX ou CSV)<input type="file" accept=".ofx,.csv,.txt" data-mudar="importarExtrato" hidden></label>${pend.filter((e) => sugestao(e)).length > 1 ? `<button type="button" class="btn pri" data-acao="concTodos">${ic('check-circle')}Aceitar todas as sugestões (${pend.filter((e) => sugestao(e)).length})</button>` : ''}</div></div>
    <div class="dica">${ic('info')}<span>Cada linha do extrato do banco é comparada com os lançamentos do sistema. Quando valor e data batem, o sistema sugere. Diferenças viram lançamento com um clique. Aceita o arquivo OFX que todo banco exporta (Money/Quicken) ou CSV <span class="mono">data;descrição;valor</span>. Linhas repetidas não entram duas vezes.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Data</th><th>No extrato do banco</th><th class="n">Valor</th><th>No sistema</th><th></th></tr></thead><tbody>
      ${pend.map((e) => { const s = sugestao(e); return `<tr><td>${dataCurta(e.data)}</td><td class="mono" style="font-size:12px">${esc(e.descricao)}</td><td class="n"><b class="${e.valor > 0 ? 'ok-tx' : ''}">${e.valor > 0 ? '' : '− '}${moeda(Math.abs(e.valor))}</b></td>
        <td>${s?.t ? `<span class="flex" style="gap:6px">${ic('arrows-left-right', 'p')}<span><span class="prim">Transferência</span><span class="sub">${esc(conta(a, s.t.de)?.nome || '')} → ${esc(conta(a, s.t.para)?.nome || '')} · ${dataCurta(s.t.data)}</span></span></span>` : s ? `<span class="flex" style="gap:6px">${ic('link', 'p')}<span><span class="prim">${esc(s.descricao)}</span><span class="sub">${esc(pessoa(a, s.pessoa)?.nome || CAT[s.categoria]?.nome || '')} · ${dataCurta(s.vencimento)}</span></span></span>` : '<span class="al-tx">Nenhum lançamento corresponde</span>'}</td>
        <td class="acoes">${s ? `<button type="button" class="btn ok pri peq" data-acao="conciliar" data-e="${e.id}" ${s.t ? `data-t="${s.t.id}"` : `data-l="${s.id}"`}>${ic('check')}Conciliar</button>` : `<button type="button" class="btn peq" data-acao="criarDoExtrato" data-e="${e.id}">${ic('plus')}Criar lançamento</button><button type="button" class="btn peq fant" data-acao="transfDoExtrato" data-e="${e.id}">${ic('arrows-left-right')}É transferência</button>`}</td></tr>`; }).join('') || `<tr><td colspan="5">${vazio('check-circle', 'Tudo conciliado nesta conta')}</td></tr>`}
    </tbody></table></div></div>
    ${feitos.length ? `<div class="cartao"><div class="cartao-cab"><h3>Conciliados</h3></div><div class="tabela-caixa"><table class="tabela"><tbody>${feitos.slice(0, 12).map((e) => `<tr><td style="width:90px">${dataCurta(e.data)}</td><td class="mono mute-2" style="font-size:12px">${esc(e.descricao)}</td><td class="n">${moeda(e.valor)}</td><td>${et('Conciliado', 'ok')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

function ordensPag(a) {
  const st = a.estado.os ||= { modo: 'quadro' };
  a.kanbans.os = (id, s) => { const o = os(a, id); if (s === 'entregue' && !o.faturada && totalOS(o) > 0) { avisar('Fature a OS antes de entregar (abra a OS e clique em Faturar)', { tipo: 'erro' }); return; } a.db.salvar('ordens', { id, status: s, ...(s === 'aprovada' ? { aprovada_em: hoje() } : {}), ...(s === 'entregue' ? { entregue_em: hoje() } : {}) }); a.db.registrar(`ordens:${id}`, `Situação: ${stOS(s)[1]}`, { icone: 'arrow-right', tom: 'acc' }); avisar(`OS #${o.numero} → ${stOS(s)[1]}`); };
  a.kanbans['os:abrir'] = (id) => a.abrir('os', id);
  const lista = a.db.lista('ordens');
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoOS" data-m="quadro" aria-pressed="${st.modo === 'quadro'}">${ic('kanban', 'p')}Quadro</button><button type="button" data-acao="modoOS" data-m="lista" aria-pressed="${st.modo === 'lista'}">${ic('list', 'p')}Lista</button></div><button type="button" class="btn pri" data-acao="novaOS">${ic('plus')}Nova OS</button></div>`;
  if (st.modo === 'lista') return topo + a.tab({ id: 'os', colecao: 'ordens', singular: 'OS', plural: 'OS', ordem: 'numero', desc: true,
    visoes: [{ id: 'abertas', rot: 'Abertas', filtro: (o) => o.status !== 'entregue' }, { id: 'atrasadas', rot: 'Atrasadas', filtro: (o) => o.status !== 'entregue' && o.previsao < hoje() }, { id: 'entregues', rot: 'Entregues', filtro: (o) => o.status === 'entregue' }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'status', rot: 'Situação', opcoes: STATUS_OS.map(([k, n]) => [k, n]) }, { k: 'tecnico', rot: 'Técnico', opcoes: () => TEC.map((t) => [t[0], t[1]]) }],
    textoBusca: (o) => `${o.numero} ${o.equipamento} ${o.marca} ${pessoa(a, o.cliente)?.nome} ${o.defeito}`, total: (l) => moeda(soma(l, totalOS)), aoClicar: (id) => a.abrir('os', id),
    colunas: [{ k: 'numero', rot: 'OS', render: (o) => `<span class="mono prim">#${o.numero}</span>` }, { k: 'equipamento', rot: 'Equipamento', render: (o) => `<span class="prim">${esc(o.equipamento)}</span><span class="sub">${esc(pessoa(a, o.cliente)?.nome || '')}</span>` },
      { k: 'status', rot: 'Situação', valor: (o) => STATUS_OS.findIndex((x) => x[0] === o.status), render: (o) => `<span class="et sem-ponto" style="background:color-mix(in srgb,${stOS(o.status)[2]} 14%,var(--painel));color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span>`, csv: (o) => stOS(o.status)[1] },
      { k: 'tecnico', rot: 'Técnico', oc: true, valor: (o) => nomeT(o.tecnico), render: (o) => `<span class="flex">${av(nomeT(o.tecnico), 'p')}${esc(nomeT(o.tecnico).split(' ')[0])}</span>` },
      { k: 'previsao', rot: 'Previsão', oc: true, render: (o) => `<span class="${o.status !== 'entregue' && o.previsao < hoje() ? 'er-tx' : ''}">${dataCurta(o.entregue_em || o.previsao)}</span>` }, { k: 'total', rot: 'Total', n: true, valor: totalOS, render: (o) => moeda(totalOS(o)) }] });
  return topo + kanban({ id: 'os', itens: lista.filter((o) => o.status !== 'entregue' || diasAte(o.entregue_em) > -7), campo: 'status',
    colunas: STATUS_OS.map(([id, nome, cor]) => ({ id, nome, cor, sub: (l) => moeda(soma(l, totalOS)), classe: (o) => (o.status !== 'entregue' && o.previsao < hoje() ? 'parado' : '') })),
    ficha: (o) => `<div class="entre"><span class="mono" style="font-size:12px;color:var(--tx-3)">#${o.numero}</span>${o.status !== 'entregue' && o.previsao < hoje() ? `<span class="er-tx" style="font-size:11.5px">atrasada</span>` : `<span class="mute" style="font-size:11.5px">${dataCurta(o.previsao)}</span>`}</div><div class="t">${esc(o.equipamento)}</div><div class="s corta">${esc(pessoa(a, o.cliente)?.nome || '')}</div><div class="linha"><span class="flex" style="gap:5px">${av(nomeT(o.tecnico), 'p')}${esc(nomeT(o.tecnico).split(' ')[0])}</span><b class="num" style="color:var(--tx)">${moeda(totalOS(o))}</b></div>` });
}

function estoque(a) {
  const st = a.estado.est ||= { aba: 'pecas' };
  const abas = `<div class="abas-pag"><button type="button" data-acao="abaEst" data-a="pecas" aria-selected="${st.aba === 'pecas'}">${ic('package')}Peças</button><button type="button" data-acao="abaEst" data-a="servicos" aria-selected="${st.aba === 'servicos'}">${ic('wrench')}Serviços</button></div>`;
  if (st.aba === 'servicos') return abas + a.tab({ id: 'servicos', colecao: 'servicos', singular: 'serviço', plural: 'serviços', ordem: 'nome', novo: { rot: 'Novo serviço', attrs: 'data-acao="novoCad" data-c="servicos"' }, aoClicar: async (id) => { if (await editar(a, 'servicos', a.db.obter('servicos', id))) a.render(); },
    colunas: [{ k: 'nome', rot: 'Serviço', render: (s) => `<span class="prim">${esc(s.nome)}</span>` }, { k: 'preco', rot: 'Preço', n: true, render: (s) => moeda(s.preco) }, { k: 'usos', rot: 'Feitos (90 dias)', n: true, valor: (s) => a.db.lista('ordens').filter((o) => diasAte(o.entrada) > -90 && o.itens.some((i) => i.ref === s.id)).length, render: (s) => num(a.db.lista('ordens').filter((o) => diasAte(o.entrada) > -90 && o.itens.some((i) => i.ref === s.id)).length) }] });
  const ps = a.db.lista('produtos');
  return abas + kpis([{ rot: 'Valor em estoque (custo)', icone: 'package', val: moeda(soma(ps, (p) => p.custo * p.estoque)) }, { rot: 'Itens abaixo do mínimo', icone: 'warning', val: num(ps.filter((p) => p.estoque <= p.minimo).length), alerta: ps.some((p) => p.estoque <= p.minimo) }, { rot: 'Margem média', icone: 'percent', val: pct((soma(ps, (p) => (p.preco - p.custo) / p.preco) / (ps.length || 1)) * 100) }])
    + a.tab({ id: 'pecas', colecao: 'produtos', singular: 'peça', plural: 'peças', ordem: 'nome', novo: { rot: 'Nova peça', attrs: 'data-acao="novoCad" data-c="produtos"' },
      visoes: [{ id: 'todas', rot: 'Todas' }, { id: 'baixo', rot: 'Comprar', filtro: (p) => p.estoque <= p.minimo }],
      aoClicar: async (id) => { if (await editar(a, 'produtos', a.db.obter('produtos', id))) a.render(); },
      colunas: [{ k: 'nome', rot: 'Peça', render: (p) => `<span class="prim">${esc(p.nome)}</span><span class="sub mono">${esc(p.codigo || '')}</span>` }, { k: 'custo', rot: 'Custo', n: true, oc: true, render: (p) => moeda(p.custo) }, { k: 'preco', rot: 'Venda', n: true, render: (p) => moeda(p.preco) },
        { k: 'margem', rot: 'Margem', n: true, oc: true, valor: (p) => (p.preco - p.custo) / p.preco, render: (p) => pct(((p.preco - p.custo) / (p.preco || 1)) * 100) },
        { k: 'estoque', rot: 'Estoque', n: true, render: (p) => (p.estoque <= p.minimo ? et(`${p.estoque} · mín. ${p.minimo}`, 'er') : `${p.estoque} un.`) },
        { k: 'acao', rot: '', ord: false, csv: false, render: (p) => `<button type="button" class="btn peq" data-acao="entradaEst" data-id="${p.id}">${ic('plus')}Entrada</button>` }] });
}

function pessoasPag(a) {
  return a.tab({ id: 'pessoas', colecao: 'pessoas', singular: 'cadastro', plural: 'cadastros', ordem: 'nome',
    visoes: [{ id: 'cli', rot: 'Clientes', filtro: (p) => p.tipo === 'cliente' }, { id: 'for', rot: 'Fornecedores', filtro: (p) => p.tipo === 'fornecedor' }],
    novo: { rot: 'Novo cadastro', attrs: 'data-acao="novoCad" data-c="pessoas"' }, aoClicar: (id) => a.abrir('pessoa', id), textoBusca: (p) => `${p.nome} ${p.doc} ${p.email}`,
    colunas: [{ k: 'nome', rot: 'Nome', render: (p) => `<span class="flex" style="gap:9px">${av(p.nome)}<span><span class="prim">${esc(p.nome)}</span><span class="sub mono">${esc(p.doc || '')}</span></span></span>` }, { k: 'telefone', rot: 'Telefone', oc: true },
      { k: 'aberto', rot: 'Em aberto', n: true, valor: (p) => soma(lancs(a).filter((l) => l.pessoa === p.id && l.status === 'aberto'), (l) => l.valor), render: (p) => { const l = lancs(a).filter((x) => x.pessoa === p.id && x.status === 'aberto'); return l.length ? `<span class="${l.some(vencido) ? 'er-tx' : ''}">${moeda(soma(l, (x) => x.valor))}</span>` : '<span class="mute">—</span>'; } },
      { k: 'total', rot: 'Movimentado (12 meses)', n: true, oc: true, valor: (p) => soma(lancs(a).filter((l) => l.pessoa === p.id && l.status === 'pago'), (l) => l.valor), render: (p) => moeda(soma(lancs(a).filter((l) => l.pessoa === p.id && l.status === 'pago'), (l) => l.valor)) }] });
}

function cartaoFechamento(a) {
  if (!temPro(a)) return trancado('Fechamento do mês em PDF', 'O relatório do mês para o dono ou o sócio: resultado, comparação com o mês anterior, inadimplência, melhores clientes e serviços.');
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(-i)), sel = a.estado.mesFech || mesMais(-1);
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Fechamento do mês${selo(a)}</h3><div class="sub">Um relatório de uma página para o dono, o sócio ou o banco: resultado, comparação com o mês anterior, serviços, clientes, despesas e o que vence</div></div>
    <div class="flex"><select data-mudar="mesFech" style="width:auto" aria-label="Mês">${meses.map((m, i) => `<option value="${m}" ${m === sel ? 'selected' : ''}>${nomeMes(m, true)}${i === 0 ? ' (até hoje)' : ''}</option>`).join('')}</select><button type="button" class="btn pri" data-acao="imprimirFechamento">${ic('printer')}Gerar PDF</button></div></div></div>`;
}
function cartaoLucro(a) {
  const ent = a.db.lista('ordens').filter((o) => o.status === 'entregue' && totalOS(o) > 0 && diasAte(o.entregue_em) > -90);
  const rec = soma(ent, totalOS), cus = soma(ent, (o) => custoPecas(a, o)), com = soma(ent, comissaoOS), luc = rec - cus - com;
  const porServ = Object.values(ent.flatMap((o) => itensValendo(o).filter((i) => i.tipo === 'servico').map((i) => ({ n: i.descricao, v: i.qtd * i.preco, q: i.qtd }))).reduce((m, x) => { (m[x.n] ||= { n: x.n, v: 0, q: 0 }); m[x.n].v += x.v; m[x.n].q += x.q; return m; }, {})).sort((x, y) => y.v - x.v).slice(0, 8);
  const piores = [...ent].sort((x, y) => lucroOS(a, x) / (totalOS(x) || 1) - lucroOS(a, y) / (totalOS(y) || 1)).slice(0, 5);
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Lucro das OS</h3><div class="sub">Últimos 90 dias · faturado menos o custo das peças e a comissão dos técnicos (aluguel e salários ficam no DRE)</div></div></div>
    <div class="cartao-corpo">${kpis([{ rot: 'Faturado em OS', icone: 'wrench', val: moeda(rec), nota: `${ent.length} OS` }, { rot: 'Custo das peças', icone: 'package', val: moeda(cus) }, { rot: 'Comissões', icone: 'user-circle', val: moeda(com) }, { rot: 'Lucro das OS', icone: 'trend-up', val: `<span class="${luc < 0 ? 'er-tx' : 'ok-tx'}">${moeda(luc)}</span>`, nota: `margem ${pct((luc / (rec || 1)) * 100, 1)}` }])}</div>
    <div class="grade g2"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Serviço</th><th class="n">Vezes</th><th class="n">Faturado</th><th class="n">Média</th></tr></thead><tbody>${porServ.map((x) => `<tr><td>${esc(x.n)}</td><td class="n">${num(x.q)}</td><td class="n">${moeda(x.v)}</td><td class="n">${moeda(x.v / (x.q || 1))}</td></tr>`).join('') || `<tr><td colspan="4">${vazio('wrench', 'Sem OS entregues no período')}</td></tr>`}</tbody></table></div>
      <div class="tabela-caixa"><table class="tabela"><thead><tr><th>OS com menor margem</th><th class="n">Total</th><th class="n">Lucro</th></tr></thead><tbody>${piores.map((o) => `<tr class="clicavel" data-abrir="os:${o.id}"><td><span class="prim">#${o.numero} · ${esc(o.equipamento)}</span><span class="sub">${esc(pessoa(a, o.cliente)?.nome || '')}</span></td><td class="n">${moeda(totalOS(o))}</td><td class="n"><b class="${lucroOS(a, o) < 0 ? 'er-tx' : ''}">${moeda(lucroOS(a, o))}</b> <span class="mute">${pct((lucroOS(a, o) / (totalOS(o) || 1)) * 100)}</span></td></tr>`).join('')}</tbody></table></div></div></div>`;
}
function cartaoDAS(a) {
  const ym = mesMais(-1), e = estimarDAS(a, ym), atual = estimarDAS(a, hoje().slice(0, 7));
  const ja = lancs(a).find((l) => l.das === ym || (/^DAS/i.test(l.descricao) && l.vencimento.startsWith(mesMais(0))));
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Imposto estimado · Simples Nacional</h3><div class="sub">Pela receita dos últimos 12 meses (faixas da Lei Complementar 123). O valor oficial sai no PGDAS-D: confira com o contador.</div></div>
      <select data-mudar="cfgAnexo" style="width:auto" aria-label="Anexo do Simples">${[['III', 'Anexo III · serviços e manutenção'], ['IV', 'Anexo IV'], ['V', 'Anexo V']].map(([k, n]) => `<option value="${k}" ${e.anexo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="cartao-corpo">${kpis([{ rot: 'Receita dos últimos 12 meses', icone: 'chart-line-up', val: moeda(e.rbt12), nota: `faixa de ${pct(e.nominal, 1)}` }, { rot: 'Alíquota efetiva', icone: 'percent', val: pct(e.efetiva, 2) }, { rot: `DAS de ${nomeMes(ym)}`, icone: 'receipt', val: moeda(e.das), nota: `sobre ${moeda(e.mes)} de receita · vence dia 20` }, { rot: `${nomeMes(hoje().slice(0, 7))} até agora`, icone: 'hourglass', val: moeda(atual.das), nota: 'parcial' }])}
      ${e.acimaDoTeto ? `<div class="alerta-linha" style="margin-top:10px">${ic('warning')}A receita passou de R$ 4,8 milhões: fale com o contador sobre a saída do Simples.</div>` : ''}
      <div class="flex" style="margin-top:10px;justify-content:flex-end">${ja ? `<button type="button" class="btn fant peq" data-abrir="lanc:${ja.id}">DAS já lançado em contas a pagar</button>` : e.das > 0 ? `<button type="button" class="btn pri peq" data-acao="lancarDAS">${ic('plus')}Lançar o DAS de ${nomeMes(ym)} em contas a pagar</button>` : ''}</div></div></div>`;
}
// comissão do mês passado: % do técnico sobre os serviços (sem peças) das OS entregues no mês
const comissoesMes = (a, ym) => TEC.map(([id, n, c]) => { const l = a.db.lista('ordens').filter((o) => o.status === 'entregue' && o.tecnico === id && (o.entregue_em || '').startsWith(ym)); const base = soma(l.flatMap((o) => itensValendo(o).filter((i) => i.tipo === 'servico')), (i) => i.qtd * i.preco); return { id, n, c, os: l.length, base, valor: Math.round(base * c) / 100, lanc: lancs(a).find((x) => x.comissao === `${id}:${ym}`) }; });
function cartaoComissoes(a) {
  const ym = mesMais(-1), l = comissoesMes(a, ym);
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Comissões de ${nomeMes(ym, true)}</h3><div class="sub">Percentual de cada técnico sobre os serviços das OS entregues no mês (peças não entram)</div></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Técnico</th><th class="n">OS</th><th class="n">Serviços</th><th class="n">Comissão</th><th></th></tr></thead><tbody>
    ${l.map((x) => `<tr><td><span class="flex">${av(x.n, 'p')}${esc(x.n)}</span></td><td class="n">${x.os}</td><td class="n">${moeda(x.base)}</td><td class="n"><b>${moeda(x.valor)}</b> <span class="mute">(${x.c}%)</span></td><td class="acoes">${x.lanc ? `<button type="button" class="btn fant peq" data-abrir="lanc:${x.lanc.id}">${x.lanc.status === 'pago' ? 'Paga' : 'Em contas a pagar'}</button>` : x.valor ? `<button type="button" class="btn peq pri" data-acao="pagarComissao" data-id="${x.id}">${ic('plus')}Lançar em contas a pagar</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function cartaoContador(a) {
  const meses = Array.from({ length: 6 }, (_, i) => mesMais(-i));
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Pacote do mês para o contador</h3><div class="sub">Uma planilha com tudo o que entrou e saiu no mês: data, categoria, linha do DRE, cliente ou fornecedor com CPF/CNPJ, conta, forma, situação e as transferências entre contas</div></div></div><div class="cartao-corpo flex" style="flex-wrap:wrap">
    <select data-mudar="mesContador" style="width:auto">${meses.map((m, i) => `<option value="${m}" ${m === (a.estado.mesCont || mesMais(-1)) ? 'selected' : ''}>${nomeMes(m, true)}${i === 0 ? ' (até hoje)' : ''}</option>`).join('')}</select>
    <button type="button" class="btn pri" data-acao="pacoteContador">${ic('table')}Baixar em Excel</button><span class="mute" style="font-size:12.5px">Mande junto com o extrato do banco e as notas fiscais do mês.</span></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Tudo em uma planilha do Excel</h3><div class="sub">Para mandar a um sócio, ao banco ou a quem for ajudar: resumo, contas a receber e a pagar, lançamentos, fluxo por mês, DRE, transferências, OS, contratos, clientes e estoque, cada um numa aba</div></div><button type="button" class="btn pri" data-acao="excelCompleto">${ic('table')}Baixar em Excel</button></div></div>`;
}
function relatorios(a) {
  const ent = a.db.lista('ordens').filter((o) => o.status === 'entregue' && diasAte(o.entregue_em) > -90);
  const rec = lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'pago' && diasAte(l.pago_em) > -90);
  const porCli = Object.entries(agrupar(rec.filter((l) => l.pessoa), (l) => l.pessoa)).map(([p, l]) => ({ rot: pessoa(a, p)?.nome || '—', v: soma(l, (x) => x.valor) })).sort((x, y) => y.v - x.v).slice(0, 7);
  const vencR = lancs(a).filter((l) => l.tipo === 'receita' && vencido(l)), aReceber = lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'aberto');
  return `${kpis([{ rot: 'OS entregues (90 dias)', icone: 'wrench', val: num(ent.length), nota: `ticket médio ${moeda(ent.length ? soma(ent, totalOS) / ent.length : 0)}` }, { rot: 'Tempo médio de reparo', icone: 'hourglass', val: `${Math.round(soma(ent, (o) => diasEntre(o.entrada, o.entregue_em)) / (ent.length || 1))} dias`, nota: 'da entrada à entrega' }, { rot: 'Inadimplência', icone: 'warning', val: pct((soma(vencR, (l) => l.valor) / (soma(aReceber, (l) => l.valor) || 1)) * 100, 1), nota: `${moeda(soma(vencR, (l) => l.valor))} vencido` }, { rot: 'Receita recorrente (contratos)', icone: 'arrows-clockwise', val: moeda(soma(a.db.lista('contratos').filter((c) => ctrAtivo(c)), (c) => c.valor)), nota: `${a.db.lista('contratos').filter((c) => ctrAtivo(c)).length} contratos ativos por mês` }])}
    ${cartaoFechamento(a)}${cartaoLucro(a)}${cartaoDAS(a)}${cartaoComissoes(a)}${cartaoContador(a)}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>OS por técnico</h3><div class="sub">Últimos 90 dias</div></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Técnico</th><th class="n">OS</th><th class="n">Faturado</th><th class="n">Comissão</th></tr></thead><tbody>${TEC.map(([id, n, c]) => { const l = ent.filter((o) => o.tecnico === id); const sv = soma(l.flatMap((o) => itensValendo(o).filter((i) => i.tipo === 'servico')), (i) => i.qtd * i.preco); return `<tr><td><span class="flex">${av(n, 'p')}${esc(n)}</span></td><td class="n">${l.length}</td><td class="n">${moeda(soma(l, totalOS))}</td><td class="n">${moeda((sv * c) / 100)} <span class="mute">(${c}%)</span></td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Maiores clientes</h3><div class="sub">Recebido nos últimos 90 dias</div></div></div><div class="cartao-corpo">${barrasH(porCli, { fmt: moedaC })}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Receitas por categoria</h3><div class="sub">Recebido por mês</div></div></div><div class="cartao-corpo">${barras({ dados: Array.from({ length: 6 }, (_, i) => mesMais(i - 5)).map((m) => ({ rot: nomeMes(m), v: CATS.receita.map(([id]) => soma(lancs(a).filter((l) => l.categoria === id && l.status === 'pago' && l.pago_em.startsWith(m)), (l) => l.valor)) })), series: CATS.receita.map(([, n], i) => ({ nome: n, cor: COR_CAT[i] })), empilhado: true, fmt: moedaC })}</div></div>`;
}

function contratosPag(a) {
  const ativos = a.db.lista('contratos').filter((c) => ctrAtivo(c)), cob = cobrancasFaltando(a), vis = visitasProximas(a);
  return `${kpis([{ rot: 'Receita recorrente', icone: 'arrows-clockwise', val: moeda(soma(ativos, (c) => c.valor)), nota: 'por mês, contratos ativos' }, { rot: 'Contratos ativos', icone: 'file-text', val: num(ativos.length), nota: `${ativos.filter((c) => c.pmoc).length} com PMOC` }, { rot: 'Visitas em 7 dias', icone: 'calendar-check', val: num(vis.length), nota: vis.length ? 'sem OS aberta ainda' : 'tudo agendado', alerta: vis.length > 0 }, { rot: 'Renovar em 30 dias', icone: 'clock-countdown', val: num(aRenovar(a).length), alerta: aRenovar(a).length > 0 }])}
    <div class="entre"><div class="dica" style="flex:1">${ic('info')}<span>Cada contrato gera a cobrança do mês e a OS da visita preventiva na data certa. O PMOC (plano de manutenção do ar-condicionado, Lei 13.589/2018) sai impresso com os equipamentos e as visitas feitas.</span></div>
      <div class="flex" style="flex-wrap:wrap">${cob.length ? `<button type="button" class="btn pri" data-acao="gerarCobrancas">${ic('receipt')}Gerar cobranças de ${nomeMes(hoje().slice(0, 7))} (${cob.length})</button>` : ''}${vis.length ? `<button type="button" class="btn" data-acao="abrirVisitas">${ic('wrench')}Abrir OS das visitas (${vis.length})</button>` : ''}</div></div>
    ${a.tab({ id: 'contratos', colecao: 'contratos', singular: 'contrato', plural: 'contratos', ordem: 'proxima', novo: { rot: 'Novo contrato', attrs: 'data-acao="novoCad" data-c="contratos"' }, aoClicar: (id) => a.abrir('contrato', id),
      visoes: [{ id: 'ativos', rot: 'Ativos', filtro: (c) => ctrAtivo(c) }, { id: 'renovar', rot: 'A renovar', filtro: (c) => c.status !== 'encerrado' && c.fim && diasAte(c.fim) <= 30 }, { id: 'todos', rot: 'Todos' }],
      textoBusca: (c) => `${pessoa(a, c.cliente)?.nome || ''} ${c.descricao} ${c.equipamentos || ''}`, total: (l) => `${moeda(soma(l, (c) => c.valor))}/mês`,
      colunas: [{ k: 'cliente', rot: 'Cliente', valor: (c) => pessoa(a, c.cliente)?.nome, render: (c) => `<span class="prim">${esc(pessoa(a, c.cliente)?.nome || '—')}</span><span class="sub">${esc(c.descricao)}${c.pmoc ? ' · PMOC' : ''}</span>` },
        { k: 'valor', rot: 'Mensalidade', n: true, render: (c) => moeda(c.valor) }, { k: 'visitas', rot: 'Visitas', oc: true, valor: (c) => Number(c.visitas), render: (c) => esc((VISITAS.find((v) => v[0] === String(c.visitas)) || VISITAS[0])[1]) },
        { k: 'proxima', rot: 'Próxima visita', render: (c) => (c.proxima ? `<span class="${diasAte(c.proxima) < 0 ? 'er-tx' : diasAte(c.proxima) <= 7 ? 'al-tx' : ''}">${dataCurta(c.proxima)}</span>` : '—') },
        { k: 'fim', rot: 'Vigência até', oc: true, render: (c) => (c.fim ? `<span class="${diasAte(c.fim) <= 30 ? 'al-tx' : ''}">${dataCurta(c.fim)}</span>` : '—') },
        { k: 'status', rot: 'Situação', valor: (c) => (ctrAtivo(c) ? 0 : 1), render: (c) => (ctrAtivo(c) ? et('Ativo', 'ok') : c.status === 'suspenso' ? et('Suspenso', 'al') : et(c.fim && c.fim < hoje() ? 'Vencido' : 'Encerrado', 'er')), csv: (c) => (ctrAtivo(c) ? 'ativo' : c.status) }] })}`;
}
const fimHora = (o) => { const [h, m] = String(o.hora || '08:00').split(':').map(Number), t = h * 60 + m + Math.round((Number(o.duracao) || 2) * 60); return `${String(Math.min(23, Math.floor(t / 60))).padStart(2, '0')}:${String(Math.min(59, t % 60)).padStart(2, '0')}`; };
function agendaPag(a) {
  const st = a.estado.ag ||= { modo: 'semana', data: hoje(), tec: '' };
  const tecs = TEC.length ? TEC : [['', 'Sem técnico', 0]], tecSel = st.tec && tecs.some((t) => t[0] === st.tec) ? st.tec : tecs[0][0];
  const seg = diaMais(-((paraData(st.data).getDay() + 6) % 7), st.data), dias = st.modo === 'semana' ? Array.from({ length: 6 }, (_, i) => diaMais(i, seg)) : [st.data];
  const ords = a.db.lista('ordens').filter((o) => dias.includes(o.previsao) && (st.modo === 'dia' || o.tecnico === tecSel) && (o.status !== 'entregue' || o.hora));
  const visitas = a.db.lista('contratos').filter((c) => ctrAtivo(c) && c.proxima && dias.includes(c.proxima) && (st.modo === 'dia' || c.tecnico === tecSel) && !a.db.lista('ordens').some((o) => o.contrato === c.id && o.visita === c.proxima));
  const semHora = ords.filter((o) => !o.hora && o.status !== 'entregue');
  a.cals.agOS = {
    aoClicar: (id) => (id.startsWith('ctr:') ? a.abrir('contrato', id.slice(4)) : a.abrir('os', id)),
    aoMover: (id, col, hora) => { if (id.startsWith('ctr:')) return; const o = os(a, id); a.db.salvar('ordens', { id, hora, ...(st.modo === 'dia' ? { tecnico: col } : { previsao: col }) }); a.db.registrar(`ordens:${id}`, `Agenda: ${dataCurta(st.modo === 'dia' ? o.previsao : col)} às ${hora}${st.modo === 'dia' && col !== o.tecnico ? ` com ${nomeT(col)}` : ''}`, { icone: 'calendar-blank' }); a.render(); },
    aoClicarVazio: (col, hora) => a.acoes.novaOS(st.modo === 'dia' ? { tecnico: col, previsao: st.data, hora } : { tecnico: tecSel, previsao: col, hora }),
  };
  const ev = (o) => ({ id: o.id, col: st.modo === 'dia' ? o.tecnico : o.previsao, ini: o.hora, fim: fimHora(o), titulo: `#${o.numero} · ${pessoa(a, o.cliente)?.nome || ''}`, sub: o.local || o.equipamento, cor: stOS(o.status)[2], cls: o.status === 'entregue' ? 'cancelado' : '' });
  const evV = (c) => ({ id: `ctr:${c.id}`, col: st.modo === 'dia' ? c.tecnico : c.proxima, ini: '08:00', fim: '10:00', titulo: `Visita do contrato · ${pessoa(a, c.cliente)?.nome || ''}`, sub: 'ainda sem OS', cor: '#94a3b8', cls: 'cancelado' });
  const grade = calGrade({ id: 'agOS', inicio: 7, fim: 19, hh: 52, larguraCol: st.modo === 'dia' ? 170 : 128, agora: st.modo === 'semana' ? { col: hoje(), hora: new Date().toTimeString().slice(0, 5) } : null,
    colunas: st.modo === 'dia' ? tecs.map(([id, n]) => ({ id, rot: n, sub: `${ords.filter((o) => o.tecnico === id).length} OS`, avatar: av(n, 'p') })) : dias.map((d) => ({ id: d, rot: `${DIAS[paraData(d).getDay()]} ${Number(d.slice(8))}`, hoje: d === hoje(), sub: `${ords.filter((o) => o.previsao === d).length} OS` })),
    eventos: [...ords.filter((o) => o.hora).map(ev), ...visitas.map(evV)] });
  const d = paraData(st.data);
  return `<div class="cal"><div class="cal-barra"><div class="grupo-btn"><button type="button" data-acao="agNav" data-d="-1" aria-label="Anterior">${ic('caret-left', 'p')}</button><button type="button" data-acao="agNav" data-d="0">Hoje</button><button type="button" data-acao="agNav" data-d="1" aria-label="Próximo">${ic('caret-right', 'p')}</button></div>
      <h3>${st.modo === 'dia' ? `${DIAS[d.getDay()]}, ${dataCurta(st.data)}` : `Semana de ${dataCurta(seg)}`}</h3><input type="date" value="${st.data}" data-mudar="agData" style="width:150px;height:28px" aria-label="Escolher data">
      <div class="flex" style="margin-left:auto;gap:8px;flex-wrap:wrap">${st.modo === 'semana' ? `<select data-mudar="agTec" style="width:auto" aria-label="Técnico">${tecs.map(([id, n]) => `<option value="${id}" ${id === tecSel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}<div class="grupo-btn"><button type="button" data-acao="agModo" data-m="dia" aria-pressed="${st.modo === 'dia'}">Dia · todos</button><button type="button" data-acao="agModo" data-m="semana" aria-pressed="${st.modo === 'semana'}">Semana</button></div></div></div>
    <div class="dica" style="margin:0 0 10px">${ic('info')}<span>Arraste uma OS para mudar o horário${st.modo === 'dia' ? ' ou o técnico' : ' ou o dia'}. Dê dois cliques num horário vazio para abrir uma OS nele. As visitas dos contratos que ainda não têm OS aparecem em cinza.</span></div>
    ${semHora.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Sem horário marcado (${semHora.length})</h3><div class="sub">Serviços de bancada ou visitas a combinar</div></div></div><div class="cartao-corpo flex" style="flex-wrap:wrap;gap:6px">${semHora.map((o) => `<button type="button" class="btn peq" data-abrir="os:${o.id}">#${o.numero} · ${esc(pessoa(a, o.cliente)?.nome || '')}${st.modo === 'dia' ? ` · ${esc(nomeT(o.tecnico).split(' ')[0])}` : ` · ${dataCurta(o.previsao)}`}</button>`).join('')}</div></div>` : ''}
    ${grade}</div>`;
}
const CHECK_SAIDA = ['Equipamento testado e funcionando', 'Limpeza feita', 'Pressão do gás e corrente medidas', 'Local limpo e organizado', 'Cliente orientado'];
const tecDaSessao = (a) => { const em = normal(a.sessao?.email || ''); return (em && a.db.lista('tecnicos').find((t) => normal(t.email || '') === em)?.id) || ''; };
function tecDoCampo(a) {
  let t = a.estado.campoTec || tecDaSessao(a);
  if (!t) { try { t = localStorage.getItem(`nexo-fin-tecnico-${a.empresa}`) || ''; } catch { t = ''; } }
  return TEC.some((x) => x[0] === t) ? t : TEC[0]?.[0] || '';
}
function campoPag(a) {
  const tec = tecDoCampo(a), minhas = a.db.lista('ordens').filter((o) => o.tecnico === tec && o.status !== 'entregue' && o.previsao <= diaMais(7)).sort((x, y) => `${x.previsao}${x.hora || '99'}`.localeCompare(`${y.previsao}${y.hora || '99'}`));
  const card = (o) => { const c = pessoa(a, o.cliente), loc = o.local || endCliente(c), tel = String(c?.telefone || '').replace(/[^\d+]/g, '');
    return `<div class="cartao"><div class="cartao-corpo col" style="gap:10px">
      <div class="entre"><span class="mono mute-2">#${o.numero} · ${dataCurta(o.previsao)}${o.hora ? ` · ${o.hora}` : ''}</span><span class="et sem-ponto" style="color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span></div>
      <div><div style="font-size:17px;font-weight:600">${esc(c?.nome || '')}</div><div class="mute-2">${esc(o.equipamento)}${o.marca ? ` · ${esc(o.marca)}` : ''}</div><div style="margin-top:4px">${esc(o.defeito)}</div></div>
      ${loc ? `<a class="flex" style="gap:6px" href="${mapa(loc)}" target="_blank" rel="noopener">${ic('map-pin', 'p')}${esc(loc)}</a>` : '<span class="mute" style="font-size:12.5px">Serviço na oficina</span>'}
      <div class="flex" style="flex-wrap:wrap;gap:6px">${tel ? `<a class="btn" href="tel:${esc(tel)}">${ic('phone')}Ligar</a><a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(`Olá, ${chamar(c)}! Aqui é ${nomeT(o.tecnico).split(' ')[0]}, da ${a.empresa}. Estou a caminho para o atendimento da OS #${o.numero}.`)}">${ic('whatsapp-logo')}Estou a caminho</a>` : ''}${loc ? `<a class="btn" target="_blank" rel="noopener" href="${mapa(loc)}">${ic('map-pin')}Rota</a>` : ''}</div>
      ${['execucao', 'aguardando', 'pronta'].includes(o.status) ? `<div class="col" style="gap:6px;padding:10px;border-radius:10px;background:var(--painel-2)"><b style="font-size:12.5px">Antes de sair</b>${CHECK_SAIDA.map((x, k) => `<label class="flex" style="gap:8px;font-weight:400;color:var(--tx)"><input type="checkbox" data-mudar="campoCheck" data-id="${o.id}" data-k="${k}" ${(o.saida || []).includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div>` : ''}
      <div class="flex" style="flex-wrap:wrap;gap:6px">${['orcamento', 'aprovada'].includes(o.status) ? `<button type="button" class="btn pri" data-acao="campoIniciar" data-id="${o.id}">${ic('play')}Cheguei · iniciar</button>` : ''}${['execucao', 'aguardando'].includes(o.status) ? `<button type="button" class="btn" data-acao="campoLaudo" data-id="${o.id}">${ic('note-pencil')}Laudo</button><button type="button" class="btn pri ok" data-acao="campoConcluir" data-id="${o.id}">${ic('seal-check')}Concluir</button>` : ''}${o.status === 'pronta' ? `<button type="button" class="btn pri" data-acao="assinarOS" data-id="${o.id}">${ic('pencil-simple')}${o.assinatura ? 'Assinado ✓' : 'Assinatura do cliente'}</button>` : ''}<button type="button" class="btn fant" data-abrir="os:${o.id}">${ic('camera')}Fotos e detalhes</button></div>
    </div></div>`; };
  const grupo = (t, l) => (l.length ? `<h3 style="margin:16px 0 8px">${t} <span class="mute">${l.length}</span></h3><div class="col" style="gap:10px">${l.map(card).join('')}</div>` : '');
  return `<div style="max-width:620px;margin:0 auto"><div class="entre" style="gap:10px;flex-wrap:wrap"><label class="flex" style="gap:8px">${av(nomeT(tec), 'p')}<select data-mudar="campoTec" style="width:auto" aria-label="Técnico">${TEC.map(([id, n]) => `<option value="${id}" ${id === tec ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><span class="mute" style="font-size:12.5px">Tela para usar no celular, em campo</span></div>
    ${minhas.length ? `${grupo('Atrasadas', minhas.filter((o) => o.previsao < hoje()))}${grupo('Hoje', minhas.filter((o) => o.previsao === hoje()))}${grupo('Próximos dias', minhas.filter((o) => o.previsao > hoje()))}` : vazio('check-circle', 'Nada para os próximos 7 dias', 'Quando uma OS for para este técnico, ela aparece aqui.')}</div>`;
}
function desempenhoPag(a) {
  if (!temPro(a)) return trancado('Desempenho e metas da equipe', 'Ranking dos técnicos com faturamento, lucro, nota dos clientes, retorno em garantia e meta do mês.');
  const st = a.estado.desemp ||= { ym: hoje().slice(0, 7) }, metas = a.db.cfg.metas_tec || {};
  const linhaT = ([id, n, c]) => {
    const ent = a.db.lista('ordens').filter((o) => o.tecnico === id && o.status === 'entregue' && (o.entregue_em || '').startsWith(st.ym));
    const fat = soma(ent, totalOS), luc = soma(ent, (o) => lucroOS(a, o)), notas = ent.filter((o) => o.nps), voltas = ent.filter((o) => voltouNaGarantia(a, o)).length;
    return { id, n, c, ent, fat, luc, com: soma(ent, comissaoOS), ticket: ent.length ? fat / ent.length : 0, nota: notas.length ? soma(notas, (o) => o.nps.nota) / notas.length : null, voltas, meta: Number(metas[id]) || 0, dias: ent.length ? soma(ent, (o) => diasEntre(o.entrada, o.entregue_em)) / ent.length : 0 };
  };
  const l = TEC.map(linhaT).sort((x, y) => y.fat - x.fat), meses = Array.from({ length: 6 }, (_, i) => mesMais(-i));
  return `<div class="entre" style="flex-wrap:wrap;gap:8px"><select data-mudar="desempMes" style="width:auto" aria-label="Mês">${meses.map((m) => `<option value="${m}" ${m === st.ym ? 'selected' : ''}>${nomeMes(m, true)}</option>`).join('')}</select><span class="mute" style="font-size:12.5px">Clique em "Meta" para definir o faturamento esperado de cada técnico no mês${selo(a)}</span></div>
    <div class="grade g3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">${l.map((x, i) => `<div class="cartao"><div class="cartao-corpo col" style="gap:10px">
      <div class="entre"><span class="flex" style="gap:8px">${av(x.n)}<b style="font-size:15px">${esc(x.n)}</b></span><span class="et ${i === 0 && x.fat ? 'ok' : ''} sem-ponto">${i + 1}º</span></div>
      <div class="entre"><span class="mute-2">Faturado</span><b class="num" style="font-size:18px">${moeda(x.fat)}</b></div>
      ${x.meta ? `<div>${prog((x.fat / x.meta) * 100, x.fat >= x.meta ? 'ok' : '')}<div class="entre mute" style="font-size:12px;margin-top:4px"><span>${pct((x.fat / x.meta) * 100)} da meta</span><span>meta ${moeda(x.meta)}</span></div></div>` : ''}
      <div class="mute-2" style="font-size:12.5px;line-height:1.7">${num(x.ent.length)} OS · ticket ${moeda(x.ticket)} · lucro ${moeda(x.luc)}<br>Comissão ${moeda(x.com)} · ${Math.round(x.dias)} dias em média<br>Nota dos clientes: ${x.nota == null ? 'sem respostas' : `<b>${num(x.nota, 1)}</b> de 10`} · ${x.voltas ? `<span class="er-tx">${x.voltas} ${x.voltas === 1 ? 'voltou' : 'voltaram'} na garantia</span>` : 'nenhum retorno em garantia'}</div>
      <div class="flex" style="justify-content:flex-end"><button type="button" class="btn peq fant" data-acao="metaTec" data-id="${x.id}">${ic('flag')}Meta</button></div></div></div>`).join('')}</div>`;
}
function atendimentoPag(a) {
  if (!temPro(a)) return `${trancado('Pedido de visita pelo site', 'Um link e um QR code para o Instagram, o Google e o WhatsApp: o cliente pede a visita e a OS já nasce no sistema.')}${trancado('Pesquisa de satisfação', 'Nota de 0 a 10 depois de cada entrega, com a média por técnico. Quem dá nota alta é levado a avaliar no Google.')}${trancado('Área do cliente', 'Um link para cada cliente ver equipamentos, garantias e contratos, pagar pelo PIX e pedir visita.')}`;
  const ped = a.db.lista('ordens').filter((o) => o.origem === 'online').sort((x, y) => y.entrada.localeCompare(x.entrada)), l = notasNPS(a), nps = calcNPS(l);
  const prom = l.filter((o) => o.nps.nota >= 9).length, det = l.filter((o) => o.nps.nota <= 6).length;
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Pedido de visita pelo site${selo(a)}</h3><div class="sub">Coloque o link na bio do Instagram, no Perfil da Empresa no Google e na mensagem de ausência do WhatsApp. Cada pedido vira uma OS em orçamento, com o cliente cadastrado.</div></div><button type="button" class="btn pri" data-acao="linkVisita">${ic('qr-code')}Link e QR code</button></div>
      ${ped.length ? `<ul class="lista">${ped.slice(0, 8).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t corta">${esc(pessoa(a, o.cliente)?.nome || '')} · ${esc(o.equipamento)}</div><div class="s corta">${dataCurta(o.entrada)} · ${esc(o.defeito)}</div></div><span class="et sem-ponto" style="color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span></li>`).join('')}</ul>` : `<div class="cartao-corpo">${vazio('calendar-blank', 'Nenhum pedido ainda', 'Quando um cliente pedir visita pelo link, ele aparece aqui.')}</div>`}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Pesquisa de satisfação${selo(a)}</h3><div class="sub">Últimos 90 dias · a pesquisa vai junto com o pedido de avaliação depois da entrega (Para fazer hoje, no painel)</div></div></div>
      <div class="cartao-corpo">${kpis([{ rot: 'NPS', icone: 'star', val: nps == null ? '—' : String(nps), nota: nps == null ? 'sem respostas' : nps >= 50 ? 'excelente' : nps >= 0 ? 'bom, dá para melhorar' : 'atenção' }, { rot: 'Respostas', icone: 'chat-circle', val: num(l.length) }, { rot: 'Promotores (9 e 10)', icone: 'hand-heart', val: num(prom) }, { rot: 'Detratores (0 a 6)', icone: 'warning', val: num(det), alerta: det > 0 }])}</div>
      ${l.length ? `<ul class="lista">${[...l].sort((x, y) => String(y.nps.quando).localeCompare(String(x.nps.quando))).slice(0, 12).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="av p" style="background:${o.nps.nota >= 9 ? 'var(--ok)' : o.nps.nota >= 7 ? 'var(--al)' : 'var(--er)'}">${o.nps.nota}</span><div class="cresce"><div class="t corta">${esc(pessoa(a, o.cliente)?.nome || '')} · ${esc(nomeT(o.tecnico))}</div><div class="s corta">${o.nps.comentario ? `"${esc(o.nps.comentario)}"` : 'sem comentário'}</div></div><span class="mute" style="font-size:12px">${dataCurta(String(o.nps.quando).slice(0, 10))}</span></li>`).join('')}</ul>` : ''}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Área do cliente${selo(a)}</h3><div class="sub">Cada cliente tem um link próprio: equipamentos em serviço, garantias, contratos, contas em aberto com PIX e pedido de visita. Mande pelo botão "Área do cliente", na ficha de cada cliente.</div></div><a class="btn" href="#/pessoas">${ic('users')}Abrir clientes</a></div></div>`;
}
function cartaoNFSe(a) {
  const n = { padrao: 'nacional', item: '14.01', cnat: '140101', aliq: 3, simples: 3, pecas: false, ...(a.db.cfg.nfse || {}) }, s = a.estado.nfe || {};
  if (a.nuvem && !a.estado.nfeCarregando && !a.estado.nfe) { a.estado.nfeCarregando = true; a.sessao.funcao('nexo-nfe', { acao: 'status' }).then((r) => { a.estado.nfe = r; a.render(); }).catch(() => { a.estado.nfe = { configurado: false }; a.render(); }); }
  const dono = !a.nuvem || a.sessao?.dono || a.sessao?.gestor;
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Nota fiscal de serviço (NFS-e)</h3><div class="sub">${a.nuvem ? (s.configurado ? `Emissão ligada pela Focus NFe · ${s.ambiente === 'producao' ? 'produção (vale de verdade)' : 'homologação (testes, sem valor fiscal)'}` : 'Não configurada') : 'Na demonstração as notas são simuladas'}</div></div>${a.nuvem ? (s.configurado ? et('Ativa', 'ok') : et('Pendente', 'al')) : et('Simulada', 'info')}</div>
    <div class="cartao-corpo col" style="gap:12px">${!dono ? '<p class="mute-2">Só o dono ou um administrador configura a emissão de notas.</p>' : `<div class="dica">${ic('info')}<span>A nota sai pela <a href="https://focusnfe.com.br" target="_blank" rel="noopener">Focus NFe</a>, emissor homologado: crie a conta da empresa lá (o plano é pago à Focus), envie o certificado digital A1 e cole o token aqui. O token fica num cofre: nem a equipe vê. Desde 2026 a maioria das cidades usa o padrão nacional.</span></div>
      <form class="form-grade" data-nfse>${a.nuvem ? `<label class="campo largo">Token da Focus NFe<input name="token" type="password" autocomplete="off" placeholder="${s.configurado ? '•••••••• (deixe em branco para manter)' : 'cole o token'}"></label><label class="campo">Ambiente<select name="ambiente"><option value="homologacao" ${s.ambiente !== 'producao' ? 'selected' : ''}>Homologação (testes)</option><option value="producao" ${s.ambiente === 'producao' ? 'selected' : ''}>Produção</option></select></label>` : ''}
        <label class="campo">Padrão da sua cidade<select name="padrao"><option value="nacional" ${n.padrao !== 'municipal' ? 'selected' : ''}>Nacional (gov.br/nfse)</option><option value="municipal" ${n.padrao === 'municipal' ? 'selected' : ''}>Da prefeitura (municipal)</option></select></label>
        <label class="campo">Cidade da empresa<input name="cidade" value="${esc(n.cidade || '')}" placeholder="Ex.: Florianópolis"></label><label class="campo">UF<input name="uf" maxlength="2" value="${esc(n.uf || '')}" placeholder="SC"></label>
        <label class="campo">Código IBGE do município<input name="ibge" inputmode="numeric" value="${esc(n.ibge || '')}" placeholder="busca pela cidade"><span class="ajuda">Preenche sozinho ao salvar com a cidade e a UF</span></label>
        <label class="campo">Inscrição municipal<input name="im" value="${esc(n.im || '')}"></label>
        <label class="campo">Item da lista de serviços (LC 116)<input name="item" value="${esc(n.item)}"><span class="ajuda">14.01: manutenção e conserto de máquinas e aparelhos</span></label>
        <label class="campo">Código de tributação nacional<input name="cnat" value="${esc(n.cnat)}"><span class="ajuda">Para o padrão nacional (ex.: 140101)</span></label>
        <label class="campo">Alíquota do ISS (%)<input name="aliq" type="number" step="0.01" min="0" max="5" value="${n.aliq}"></label>
        <label class="campo">Regime<select name="simples"><option value="3" ${Number(n.simples) === 3 ? 'selected' : ''}>Simples Nacional (ME/EPP)</option><option value="2" ${Number(n.simples) === 2 ? 'selected' : ''}>MEI</option><option value="1" ${Number(n.simples) === 1 ? 'selected' : ''}>Não optante do Simples</option></select></label>
        <label class="campo">Próximo número da DPS<input name="prox" type="number" min="1" value="${Number(n.prox) || 1}"><span class="ajuda">Só no padrão nacional</span></label>
        <label class="campo largo">Descrição padrão do serviço<input name="desc" value="${esc(n.desc || 'Serviço de manutenção e reparo')}"></label>
        <label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="pecas" ${n.pecas ? 'checked' : ''}> Incluir as peças na nota de serviço (algumas prefeituras pedem; o comum é as peças irem na NF-e)</label>
        <div class="campo largo" style="flex-direction:row;justify-content:flex-end;gap:8px">${a.nuvem && s.configurado ? '<button type="button" class="btn fant perigo" data-acao="desligarNFSe">Desligar</button>' : ''}<button type="button" class="btn pri" data-acao="salvarNFSe">Salvar</button></div></form>`}</div></div>`;
}
// pedido que chega pelo link (área do cliente ou pedido de visita): vira OS em orçamento com a visita de diagnóstico
function novaOSOnline(a, p, { equipamento, texto, data, local }) {
  const sv = a.db.lista('servicos')[0];
  const o = a.db.salvar('ordens', { numero: Math.max(1000, ...a.db.lista('ordens').map((x) => x.numero || 0)) + 1, cliente: p.id, tecnico: padraoEquipe('diego'), equipamento, marca: '', serie: '', previsao: data, defeito: texto, status: 'orcamento',
    itens: sv ? [{ tipo: 'servico', ref: sv.id, descricao: sv.nome, qtd: 1, preco: sv.preco }] : [], desconto: 0, entrada: hoje(), garantia: 90, checklist: [], origem: 'online', ...(local ? { local } : {}) });
  a.db.registrar(`ordens:${o.id}`, 'Pedido feito pelo cliente no link', { icone: 'globe', tom: 'acc' });
  return o;
}
function histEquip(a, o) {
  const l = a.db.lista('ordens').filter((x) => mesmoEquip(x, o)).sort((x, y) => y.entrada.localeCompare(x.entrada));
  if (!l.length) return '';
  const gar = l.find((x) => garantiaAte(x) && garantiaAte(x) >= (o.entrada || hoje()) && x.entregue_em <= (o.entrada || hoje()));
  return `<div class="gav-sec"><h4>Histórico deste equipamento (${l.length})</h4>${gar ? `<div class="alerta-linha" style="margin-bottom:8px">${ic('shield-check')}Na garantia da OS #${gar.numero} até ${dataCurta(garantiaAte(gar))}: confira se o defeito é o mesmo antes de cobrar.</div>` : ''}
    <ul class="lista" style="margin:0 -20px">${l.slice(0, 10).map((x) => `<li class="clicavel" data-abrir="os:${x.id}"><span class="mono mute-2">#${x.numero}</span><div class="cresce"><div class="t corta">${esc(x.defeito)}</div><div class="s">${dataCurta(x.entrada)} · ${esc(nomeT(x.tecnico))}${garantiaAte(x) ? ` · garantia até ${dataCurta(garantiaAte(x))}` : ''}</div></div><b class="num">${moeda(totalOS(x))}</b></li>`).join('')}</ul></div>`;
}
function docPMOC(a, c) {
  const p = pessoa(a, c.cliente), cfg = a.db.cfg, eqs = String(c.equipamentos || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const feitas = a.db.lista('ordens').filter((o) => o.contrato === c.id && o.status === 'entregue').sort((x, y) => x.entregue_em.localeCompare(y.entregue_em));
  const per = (VISITAS.find((v) => v[0] === String(c.visitas)) || VISITAS[0])[1].toLowerCase();
  const tarefas = [['Limpar ou trocar os filtros de ar', per], ['Limpar a bandeja e conferir o dreno', per], ['Limpar serpentinas (evaporadora e condensadora)', 'a cada 6 meses'], ['Medir pressão do gás, corrente e tensão', per], ['Conferir isolamento, fixação e ruídos', per], ['Medir a temperatura de insuflamento e de retorno', per], ['Higienizar com produto bactericida', 'a cada 6 meses']];
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>Plano de Manutenção, Operação e Controle (PMOC)</h1><div style="color:#555">Lei 13.589/2018 e Portaria 3.523/1998 do Ministério da Saúde</div></div><div style="text-align:right"><b>${esc(a.empresa)}</b><div style="color:#555">CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.telefone || '')}</div></div></div>
    <h2>Local atendido</h2><table><tr><td><b>${esc(p?.nome || '')}</b></td><td>CPF/CNPJ: ${esc(p?.doc || '—')}</td></tr><tr><td colspan="2">Contrato: ${esc(c.descricao)} · vigência ${dataBR(c.inicio)} a ${dataBR(c.fim)}</td></tr><tr><td colspan="2">Responsável técnico: ${esc(c.responsavel || '—')}</td></tr></table>
    <h2>Equipamentos</h2><table><thead><tr><th>#</th><th>Equipamento e local</th></tr></thead><tbody>${(eqs.length ? eqs : ['—']).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e)}</td></tr>`).join('')}</tbody></table>
    <h2>Rotina de manutenção</h2><table><thead><tr><th>Atividade</th><th>Frequência</th></tr></thead><tbody>${tarefas.map(([t, f]) => `<tr><td>${t}</td><td>${f}</td></tr>`).join('')}</tbody></table>
    <h2>Visitas realizadas</h2><table><thead><tr><th>Data</th><th>OS</th><th>Técnico</th><th>Serviço executado</th></tr></thead><tbody>${feitas.length ? feitas.map((o) => `<tr><td>${dataBR(o.entregue_em)}</td><td>#${o.numero}</td><td>${esc(nomeT(o.tecnico))}</td><td>${esc(o.laudo || '—')}</td></tr>`).join('') : '<tr><td colspan="4">Nenhuma visita registrada ainda.</td></tr>'}</tbody></table>
    <div style="margin-top:10px;color:#444;font-size:11px">Este documento organiza o plano e o registro das visitas. O PMOC oficial precisa da assinatura e da ART (ou TRT) do responsável técnico.</div>
    <div class="ass"><div>${esc(c.responsavel || 'Responsável técnico')}</div><div>${esc(p?.nome || 'Cliente')}</div></div></div>`;
}

function clausulasContrato(a, c) {
  const vis = (VISITAS.find((v) => v[0] === String(c.visitas)) || VISITAS[0])[1].toLowerCase();
  return [
    `Objeto: manutenção preventiva e corretiva dos equipamentos listados, com visitas ${vis}, feitas por técnico da ${a.empresa}.`,
    `Valor: ${moeda(c.valor)} por mês, com vencimento todo dia ${c.dia || 10}. Pagamento por PIX ou boleto. Atraso tem multa de ${regraAtraso(a).multa}% e juros de ${regraAtraso(a).juros}% ao mês.`,
    `Vigência: de ${dataBR(c.inicio)} a ${dataBR(c.fim)}, renovável por igual período. Reajuste anual de ${Number(c.reajuste || 0)}% na renovação.`,
    'Incluso: mão de obra das visitas preventivas, limpeza, medições e relatório da visita. Peças, gás refrigerante e serviços fora da rotina são orçados à parte e só são feitos com a sua aprovação.',
    c.pmoc ? `PMOC: a ${a.empresa} mantém o Plano de Manutenção, Operação e Controle (Lei 13.589/2018) com responsável técnico${c.responsavel ? ` (${c.responsavel})` : ''}.` : null,
    'Cancelamento: qualquer uma das partes pode cancelar avisando com 30 dias de antecedência, sem multa, pagando as mensalidades até a data.',
  ].filter(Boolean);
}
function docContrato(a, c) {
  const p = pessoa(a, c.cliente), cfg = a.db.cfg, eqs = String(c.equipamentos || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>Contrato de manutenção</h1><div style="color:#555">${esc(a.empresa)} · CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')}</div></div><div style="text-align:right"><b>${moeda(c.valor)}/mês</b><div style="color:#555">${dataBR(c.inicio)} a ${dataBR(c.fim)}</div></div></div>
    <h2>Contratante</h2><div>${esc(p?.nome || '')}${p?.doc ? ` · CPF/CNPJ ${esc(p.doc)}` : ''}${endCliente(p) ? ` · ${esc(endCliente(p))}` : ''}</div>
    <h2>Equipamentos</h2><table><tbody>${(eqs.length ? eqs : ['Conforme vistoria inicial']).map((e, i) => `<tr><td style="width:30px">${i + 1}</td><td>${esc(e)}</td></tr>`).join('')}</tbody></table>
    <h2>Condições</h2><ol style="line-height:1.6;padding-left:18px">${clausulasContrato(a, c).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    ${c.aceite ? `<div style="border:1px solid #16a34a;border-radius:6px;padding:10px;margin-top:14px">Aceito digitalmente por <b>${esc(c.aceite.nome)}</b> (CPF/CNPJ ${esc(c.aceite.doc)}) em ${new Date(c.aceite.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}, pelo link enviado pela ${esc(a.empresa)}.</div>` : '<div class="ass"><div>' + esc(a.empresa) + '</div><div>' + esc(p?.nome || 'Contratante') + '</div></div>'}</div>`;
}
function docFechamento(a, ym) {
  const ant = mesMais(-1, `${ym}-01`), cfg = a.db.cfg;
  const caixa = (m, t) => soma(lancs(a).filter((l) => l.tipo === t && l.status === 'pago' && (l.pago_em || '').startsWith(m)), (l) => l.valor);
  const comp = (m, f) => soma(lancs(a).filter((l) => l.vencimento.startsWith(m) && f(l)), (l) => l.valor);
  const recM = (m) => comp(m, (l) => l.tipo === 'receita'), despM = (m) => comp(m, (l) => l.tipo === 'despesa'), res = (m) => recM(m) - despM(m);
  const varia = (x, y) => (y ? `${x >= y ? '▲' : '▼'} ${pct(Math.abs(((x - y) / Math.abs(y)) * 100), 1)} sobre ${nomeMes(ant)}` : '');
  const ent = a.db.lista('ordens').filter((o) => o.status === 'entregue' && (o.entregue_em || '').startsWith(ym));
  const porCli = Object.entries(agrupar(lancs(a).filter((l) => l.tipo === 'receita' && l.pessoa && l.vencimento.startsWith(ym)), (l) => l.pessoa)).map(([p, l]) => [pessoa(a, p)?.nome || '—', soma(l, (x) => x.valor)]).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const porCat = CATS.despesa.map(([id, n]) => [n, comp(ym, (l) => l.categoria === id)]).filter((x) => x[1]).sort((x, y) => y[1] - x[1]).slice(0, 6);
  const venc = lancs(a).filter((l) => l.tipo === 'receita' && vencido(l)), nps = calcNPS(notasNPS(a, 31).filter((o) => String(o.nps.quando).startsWith(ym)));
  const fim = ym === hoje().slice(0, 7) ? hoje() : diaMais(-1, `${mesMais(1, `${ym}-01`)}-01`);
  const linha = (r, v, s = '') => `<tr><td>${r}</td><td class="n"><b>${v}</b></td><td style="color:#666;font-size:11px">${s}</td></tr>`;
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>Fechamento de ${nomeMes(ym, true)}</h1><div style="color:#555">${esc(a.empresa)}${cfg.cnpj ? ` · CNPJ ${esc(cfg.cnpj)}` : ''} · gerado em ${dataBR(hoje())}</div></div></div>
    <h2>Resultado do mês</h2><table><tbody>${linha('Receitas (vendidas no mês)', moeda(recM(ym)), varia(recM(ym), recM(ant)))}${linha('Despesas do mês', moeda(despM(ym)), varia(despM(ym), despM(ant)))}${linha('Resultado', moeda(res(ym)), `margem ${pct((res(ym) / (recM(ym) || 1)) * 100, 1)} · ${varia(res(ym), res(ant))}`)}${linha('Dinheiro que entrou', moeda(caixa(ym, 'receita')))}${linha('Dinheiro que saiu', moeda(caixa(ym, 'despesa')))}${linha(`Saldo das contas em ${dataCurta(fim)}`, moeda(saldoTotal(a, fim)))}</tbody></table>
    <h2>Serviços</h2><table><tbody>${linha('OS entregues', num(ent.length), `ticket médio ${moeda(ent.length ? soma(ent, totalOS) / ent.length : 0)}`)}${linha('Lucro das OS (peças e comissão descontadas)', moeda(soma(ent, (o) => lucroOS(a, o))))}${linha('Contratos ativos', num(a.db.lista('contratos').filter((c) => ctrAtivo(c)).length), `${moeda(soma(a.db.lista('contratos').filter((c) => ctrAtivo(c)), (c) => c.valor))} por mês`)}${nps != null ? linha('Satisfação (NPS)', String(nps), `${notasNPS(a, 31).filter((o) => String(o.nps.quando).startsWith(ym)).length} respostas`) : ''}</tbody></table>
    <div class="grade g2" style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div><h2>Maiores clientes</h2><table><tbody>${porCli.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="n">${moeda(v)}</td></tr>`).join('') || '<tr><td>—</td></tr>'}</tbody></table></div><div><h2>Para onde foi o dinheiro</h2><table><tbody>${porCat.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="n">${moeda(v)}</td></tr>`).join('') || '<tr><td>—</td></tr>'}</tbody></table></div></div>
    <h2>Atenção</h2><table><tbody>${linha('A receber vencido hoje', moeda(soma(venc, (l) => l.valor)), `${venc.length} contas`)}${linha('A pagar nos próximos 30 dias', moeda(soma(lancs(a).filter((l) => l.tipo === 'despesa' && l.status === 'aberto' && diasAte(l.vencimento) <= 30), (l) => l.valor)))}${linha('A receber nos próximos 30 dias', moeda(soma(lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'aberto' && diasAte(l.vencimento) >= 0 && diasAte(l.vencimento) <= 30), (l) => l.valor)))}</tbody></table>
    <div style="margin-top:12px;color:#666;font-size:11px">Receitas e despesas pela data de vencimento (competência). Entradas e saídas pela data do pagamento (caixa).</div></div>`;
}

// ---------------------------------------------------------------- recibo e termo de entrega
function docRecibo(a, l) {
  const p = pessoa(a, l.pessoa), cfg = a.db.cfg, num = l.recibo || String(l.id).replace(/\D/g, '').slice(-6) || '1';
  const via = (t) => `<div style="border:1px solid #333;border-radius:6px;padding:18px 20px;page-break-inside:avoid;margin-bottom:18px"><div class="entre" style="align-items:flex-start"><div><h1 style="margin:0">RECIBO</h1><div style="color:#555">Nº ${esc(num)} · ${esc(t)}</div></div><div style="text-align:right"><b style="font-size:20px">${moeda(l.valor)}</b><div style="color:#555">${dataBR(l.pago_em || hoje())}</div></div></div>
    <p style="font-size:13.5px;line-height:1.7;margin:14px 0">Recebemos de <b>${esc(p?.nome || 'cliente')}</b>${p?.doc ? `, CPF/CNPJ ${esc(p.doc)}` : ''}, a importância de <b>${moeda(l.valor)}</b> (${esc(porExtenso(l.valor))}), referente a <b>${esc(l.descricao)}</b>${l.forma ? `, pago em ${esc(l.forma.toLowerCase())}` : ''}. Para clareza, firmamos o presente recibo, dando plena quitação do valor acima.</p>
    <div style="color:#555">${esc(a.empresa)} · CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.endereco || '')} · ${esc(cfg.telefone || '')}</div>
    <div class="ass" style="margin-top:30px"><div>${esc(a.empresa)}</div><div>${esc(cfg.cidade || '')}${cfg.cidade ? ', ' : ''}${dataBR(l.pago_em || hoje())}</div></div></div>`;
  return `<div class="doc">${via('via do cliente')}${via('via da empresa')}</div>`;
}
function docTermo(a, o) {
  const c = pessoa(a, o.cliente), cfg = a.db.cfg, ate = garantiaAte(o) || diaMais(o.garantia || 90);
  return `<div class="doc"><div class="entre" style="align-items:flex-start"><div><h1>Termo de entrega e garantia</h1><div style="color:#555">${esc(a.empresa)} · CNPJ ${esc(cfg.cnpj || '')} · ${esc(cfg.telefone || '')}</div></div><div style="text-align:right"><b style="font-size:16px">OS #${o.numero}</b><div style="color:#555">${dataBR(o.entregue_em || hoje())}</div></div></div>
    <h2>Cliente e equipamento</h2><table><tr><td><b>${esc(c?.nome || '')}</b>${c?.doc ? ` · ${esc(c.doc)}` : ''}</td><td>${esc(o.equipamento)}${o.marca ? ` · ${esc(o.marca)}` : ''}${o.serie ? ` · série ${esc(o.serie)}` : ''}</td></tr></table>
    <h2>O que foi feito</h2><table><tbody>${itensValendo(o).map((i) => `<tr><td>${esc(i.descricao)}</td><td class="n">${i.qtd}</td><td class="n">${moeda(i.qtd * i.preco)}</td></tr>`).join('')}<tr><td colspan="2"><b>Total</b></td><td class="n"><b>${moeda(totalOS(o))}</b></td></tr></tbody></table>
    ${o.laudo ? `<p style="margin-top:8px">${esc(o.laudo)}</p>` : ''}
    <h2>Garantia</h2><p style="line-height:1.6">Garantia de <b>${o.garantia || 90} dias, até ${dataBR(ate)}</b>, para o serviço executado e as peças trocadas nesta OS. A garantia não cobre mau uso, quedas, oscilação ou falta de energia, instalação elétrica inadequada, intervenção de terceiros nem defeitos em partes que não foram reparadas. Para usar a garantia, apresente este termo ou o número da OS.</p>
    <p style="line-height:1.6">Declaro que recebi o equipamento acima funcionando, conferi o serviço e concordo com as condições de garantia.</p>
    ${o.assinatura ? `<div class="ass"><div>${esc(a.empresa)}</div><div><img src="${esc(o.assinatura.img)}" alt="Assinatura do cliente" style="height:64px;display:block;margin:0 auto -6px">${esc(o.assinatura.nome)} · ${new Date(o.assinatura.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${o.assinatura.remoto ? ' · assinado pelo link' : ''}</div></div>` : `<div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')}</div></div>`}</div>`;
}
// quadro para o cliente assinar com o dedo (celular/tablet) ou o mouse; a imagem sai pequena (cabe no registro)
function ligarQuadro(cv, limpar) {
  const ctx = cv.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  let des = false; const pt = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
  cv.addEventListener('pointerdown', (e) => { des = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pt(e)); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { if (!des) return; ctx.lineTo(...pt(e)); ctx.stroke(); cv._tracos = (cv._tracos || 0) + 1; e.preventDefault(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, () => { des = false; }));
  limpar.addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); cv._tracos = 0; });
}
const imagemAssinatura = (cv) => { const c = document.createElement('canvas'); c.width = 360; c.height = 132; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/png'); };
async function colherAssinatura(titulo, texto, nome = '') {
  return modal({ titulo, largura: 560, corpo: `<p class="mute-2" style="margin-bottom:10px;font-size:13.5px">${texto}</p><label class="campo">Nome de quem assina<input data-ass-nome value="${esc(nome)}" autocomplete="off"></label>
    <canvas data-ass width="720" height="264" style="width:100%;height:200px;margin-top:10px;border:1.5px dashed #9aa4b5;border-radius:10px;background:#fff;touch-action:none;cursor:crosshair" aria-label="Quadro para assinar"></canvas>
    <div class="entre" style="margin-top:6px"><span class="mute" style="font-size:12px">Assine com o dedo ou o mouse</span><button type="button" class="btn fant peq" data-ass-limpar>${ic('arrow-counter-clockwise')}Limpar</button></div>`,
    aoAbrir: (f) => ligarQuadro(f.querySelector('[data-ass]'), f.querySelector('[data-ass-limpar]')),
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar assinatura', classe: 'pri', acao: (f) => { const cv = f.querySelector('[data-ass]'), n = f.querySelector('[data-ass-nome]').value.trim(); if (n.length < 3) { avisar('Escreva o nome de quem assina', { tipo: 'erro' }); return false; } if ((cv._tracos || 0) < 8) { avisar('Assine no quadro branco', { tipo: 'erro' }); return false; } return { img: imagemAssinatura(cv), nome: n.slice(0, 80), quando: new Date().toISOString() }; } }] });
}

// ---------------------------------------------------------------- documento da OS
function docOS(a, o) {
  const c = pessoa(a, o.cliente), cfg = a.db.cfg;
  const via = (titulo) => `<div style="page-break-inside:avoid;margin-bottom:26px"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco)} · ${esc(cfg.telefone)} · CNPJ ${esc(cfg.cnpj)}</div></div><div style="text-align:right"><b style="font-size:16px">${o.status === 'orcamento' ? 'Orçamento' : 'OS'} #${o.numero}</b><div style="color:#555">${esc(titulo)}</div>${o.status === 'orcamento' ? `<div style="color:#555">Válido até ${dataBR(diaMais(VALIDADE_ORC(a), o.orc_enviado || o.entrada))}</div>` : ''}</div></div>
    <h2>Cliente</h2><div>${esc(c?.nome || '')} · ${esc(c?.doc || '')} · ${esc(c?.telefone || '')}</div>
    <h2>Equipamento</h2><table><tr><td><b>${esc(o.equipamento)}</b></td><td>Marca/modelo: ${esc(o.marca || '—')}</td><td>Série: ${esc(o.serie || '—')}</td></tr><tr><td colspan="3">Defeito relatado: ${esc(o.defeito)}</td></tr><tr><td colspan="3">Checklist de entrada: ${o.checklist?.length ? o.checklist.map(esc).join(' · ') : '—'}</td></tr></table>
    <h2>Serviços e peças</h2><table><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${itensValendo(o).map((i) => `<tr><td>${esc(i.descricao)}</td><td class="n">${i.qtd}</td><td class="n">${moeda(i.preco)}</td><td class="n">${moeda(i.qtd * i.preco)}</td></tr>`).join('')}${o.desconto ? `<tr><td colspan="3">Desconto</td><td class="n">− ${moeda(o.desconto)}</td></tr>` : ''}<tr><td colspan="3"><b>Total</b></td><td class="n"><b>${moeda(totalOS(o))}</b></td></tr></tbody></table>
    ${o.itens.some((x) => x.aprovado === false) ? `<div style="color:#555;margin-top:6px">Recusado pelo cliente (não feito): ${o.itens.filter((x) => x.aprovado === false).map((x) => esc(x.descricao)).join(' · ')}</div>` : ''}${o.contrato ? `<div style="color:#555;margin-top:6px">Visita preventiva coberta pelo contrato de manutenção.</div>` : ''}
    ${o.laudo ? `<h2>Serviço executado</h2><div>${esc(o.laudo)}</div>` : ''}
    <div style="margin-top:10px;color:#444;font-size:11px">Entrada: ${dataBR(o.entrada)} · Previsão: ${dataBR(o.previsao)} · Técnico: ${esc(nomeT(o.tecnico))} · Garantia de ${o.garantia || 90} dias para o serviço executado, a contar da entrega. Equipamentos não retirados em 90 dias após o aviso de conclusão poderão ser descartados.</div>
    ${o.assinatura ? `<div class="ass"><div>${esc(a.empresa)}</div><div><img src="${esc(o.assinatura.img)}" alt="Assinatura" style="height:56px;display:block;margin:0 auto -6px">${esc(o.assinatura.nome)} · ${dataBR(String(o.assinatura.quando).slice(0, 10))}</div></div>` : `<div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')}</div></div>`}</div>`;
  return `<div class="doc">${via('Via da empresa')}<hr style="border:0;border-top:1px dashed #999;margin:18px 0">${via('Via do cliente')}</div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  lanc(a, id) {
    const l = a.db.obter('lancamentos', id); if (!l) return null; const p = pessoa(a, l.pessoa), o = l.os ? os(a, l.os) : null;
    return { estreita: true, html: ficha({ tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa', icone: l.tipo === 'receita' ? 'arrow-down-left' : 'arrow-up-right', titulo: esc(l.descricao), sub: `${etL(l)}<b class="num" style="font-size:15px;color:var(--tx)">${valorFmt(l)}</b>`,
      extra: l.status === 'aberto' ? `<div class="flex" style="margin-top:12px"><button type="button" class="btn ok pri" data-acao="baixar" data-id="${id}">${ic('check')}${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>${l.tipo === 'receita' ? `<button type="button" class="btn" data-acao="cobrarLink" data-id="${id}">${ic('whatsapp-logo')}Cobrar no WhatsApp com PIX</button>` : ''}</div>` : l.tipo === 'receita' ? `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="reciboLanc" data-id="${id}">${ic('printer')}Recibo</button>${p?.telefone ? `<button type="button" class="btn" data-acao="reciboZap" data-id="${id}">${ic('whatsapp-logo')}Mandar recibo</button>` : ''}</div>` : '',
      corpo: `<div class="gav-sec">${props([['calendar-blank', 'Vencimento', `${dataBR(l.vencimento)} · ${relativo(l.vencimento)}`], encargos(a, l) ? ['percent', 'Hoje, com multa e juros', `<b>${moeda(valorHoje(a, l))}</b> <span class="mute">(${moeda(encargos(a, l))} de encargos)</span>`] : null, l.contrato && a.db.obter('contratos', l.contrato) ? ['file-text', 'Contrato', `<a href="javascript:void 0" data-abrir="contrato:${l.contrato}">${esc(a.db.obter('contratos', l.contrato).descricao)}</a>`] : null, l.pago_em ? ['check-circle', l.tipo === 'receita' ? 'Recebido em' : 'Pago em', dataBR(l.pago_em)] : null, ['tag', 'Categoria', esc(CAT[l.categoria]?.nome || '—')], ['user', l.tipo === 'receita' ? 'Cliente' : 'Fornecedor', p ? `<a href="javascript:void 0" data-abrir="pessoa:${p.id}">${esc(p.nome)}</a>` : null], ['bank', 'Conta', esc(conta(a, l.conta)?.nome || '—')], ['credit-card', 'Forma', esc(l.forma || '—')], ['arrows-clockwise', 'Recorrente', l.recorrente ? 'Sim, todo mês' : null], o ? ['wrench', 'Ordem de serviço', `<a href="javascript:void 0" data-abrir="os:${o.id}">#${o.numero}</a>`] : null, ['link', 'Conciliação', l.status === 'pago' ? (l.conciliado ? et('Conciliado com o extrato', 'ok') : et('Não conciliado', 'al')) : null]])}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarLanc" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="menuLanc" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }) };
  },
  pessoa(a, id) {
    const p = pessoa(a, id); if (!p) return null; const ls = lancs(a).filter((l) => l.pessoa === id).sort((x, y) => y.vencimento.localeCompare(x.vencimento)), ords = a.db.lista('ordens').filter((o) => o.cliente === id), ctrs = a.db.lista('contratos').filter((c) => c.cliente === id);
    return { estreita: true, html: ficha({ tipo: p.tipo === 'cliente' ? 'Cliente' : 'Fornecedor', icone: p.tipo === 'cliente' ? 'user' : 'truck', titulo: esc(p.nome), avatar: av(p.nome, 'gg'), sub: `<span class="mono">${esc(p.doc || '')}</span>`,
      extra: p.tipo === 'cliente' ? `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="areaCliente" data-id="${id}">${ic('user-circle')}Área do cliente${tagPro}</button></div>` : '',
      corpo: `<div class="gav-sec">${props([['phone', 'Telefone', p.telefone ? `${esc(p.telefone)} · <a href="${telLink(p.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['envelope-simple', 'E-mail', p.email ? esc(p.email) : null], ['hand-coins', 'Em aberto', moeda(soma(ls.filter((l) => l.status === 'aberto'), (l) => l.valor))], p.tipo === 'cliente' ? ['gauge', 'Pagamento', temPro(a) ? (() => { const s = scorePag(a, id); return `${et(s.rot, s.tom)}${selo(a)}<div class="mute" style="font-size:12px;margin-top:3px">${esc(s.txt)}</div>`; })() : `<a href="javascript:void 0" data-acao="verPro">Score de pagamento</a>${tagPro}`] : null])}</div>
        ${ords.length ? `<div class="gav-sec"><h4>Ordens de serviço (${ords.length})</h4><ul class="lista" style="margin:0 -20px">${ords.slice(0, 8).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t corta">${esc(o.equipamento)}</div><div class="s">${dataCurta(o.entrada)}</div></div><span class="et sem-ponto" style="color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span></li>`).join('')}</ul></div>` : ''}
        ${ctrs.length ? `<div class="gav-sec"><h4>Contratos (${ctrs.length})</h4><ul class="lista" style="margin:0 -20px">${ctrs.map((c) => `<li class="clicavel" data-abrir="contrato:${c.id}"><div class="cresce"><div class="t corta">${esc(c.descricao)}</div><div class="s">${c.fim ? `até ${dataCurta(c.fim)}` : ''}${c.proxima ? ` · próxima visita ${dataCurta(c.proxima)}` : ''}</div></div><b class="num">${moeda(c.valor)}/mês</b></li>`).join('')}</ul></div>` : ''}
        <div class="gav-sec"><h4>Lançamentos</h4>${ls.length ? `<ul class="lista" style="margin:0 -20px">${ls.slice(0, 12).map((l) => `<li class="clicavel" data-abrir="lanc:${l.id}"><div class="cresce"><div class="t corta">${esc(l.descricao)}</div><div class="s">${dataCurta(l.vencimento)}</div></div>${etL(l)}<b class="num" style="min-width:90px;text-align:right">${valorFmt(l)}</b></li>`).join('')}</ul>` : vazio('receipt', 'Sem lançamentos')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="pessoas" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  contrato(a, id) {
    const c = a.db.obter('contratos', id); if (!c) return null; const p = pessoa(a, c.cliente), ym = hoje().slice(0, 7);
    const ords = a.db.lista('ordens').filter((o) => o.contrato === id).sort((x, y) => y.entrada.localeCompare(x.entrada)), ls = lancs(a).filter((l) => l.contrato === id).sort((x, y) => y.vencimento.localeCompare(x.vencimento));
    const eqs = String(c.equipamentos || '').split('\n').map((s) => s.trim()).filter(Boolean), temCob = ls.some((l) => l.vencimento.startsWith(ym));
    const sit = ctrAtivo(c) ? et('Ativo', 'ok') : c.status === 'suspenso' ? et('Suspenso', 'al') : et(c.fim && c.fim < hoje() ? 'Vencido' : 'Encerrado', 'er');
    return { estreita: true, html: ficha({ tipo: 'Contrato de manutenção', icone: 'file-text', titulo: esc(p?.nome || c.descricao), avatar: av(p?.nome || '?', 'gg'), sub: `${sit}<b class="num" style="font-size:15px;color:var(--tx)">${moeda(c.valor)}/mês</b>`,
      extra: `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-acao="visitaContrato" data-id="${id}">${ic('wrench')}Abrir OS da visita</button>${temCob ? '' : `<button type="button" class="btn" data-acao="cobrancaContrato" data-id="${id}">${ic('receipt')}Cobrança de ${nomeMes(ym)}</button>`}<button type="button" class="btn" data-acao="reajustarContrato" data-id="${id}">${ic('trend-up')}Reajustar ${Number(c.reajuste || 0)}%</button><button type="button" class="btn" data-acao="renovarContrato" data-id="${id}">${ic('arrows-clockwise')}Renovar 12 meses</button><button type="button" class="btn" data-acao="imprimirContrato" data-id="${id}">${ic('printer')}Contrato</button><button type="button" class="btn" data-acao="aceiteContrato" data-id="${id}">${ic('handshake')}${c.aceite ? 'Aceito ✓' : 'Mandar para aceite'}${c.aceite ? '' : tagPro}</button>${c.pmoc ? `<button type="button" class="btn" data-acao="imprimirPMOC" data-id="${id}">${ic('printer')}PMOC</button>` : ''}</div>`,
      corpo: `<div class="gav-sec">${props([['user', 'Cliente', p ? `<a href="javascript:void 0" data-abrir="pessoa:${p.id}">${esc(p.nome)}</a>` : null], ['calendar-blank', 'Vencimento', `todo dia ${c.dia || 10}`], ['calendar-check', 'Visitas', `${esc((VISITAS.find((v) => v[0] === String(c.visitas)) || VISITAS[0])[1])}${c.proxima ? ` · próxima em ${dataCurta(c.proxima)}` : ''}`], ['user-circle', 'Técnico', esc(nomeT(c.tecnico))], ['clock', 'Vigência', `${dataCurta(c.inicio)} a ${dataCurta(c.fim)}`], ['trend-up', 'Reajuste anual', `${Number(c.reajuste || 0)}%`], ['handshake', 'Aceite', c.aceite ? `${esc(c.aceite.nome)} · ${new Date(c.aceite.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : null], ['shield-check', 'PMOC', c.pmoc ? `Sim${c.responsavel ? ` · ${esc(c.responsavel)}` : ''}` : null]])}</div>
        ${eqs.length ? `<div class="gav-sec"><h4>Equipamentos (${eqs.length})</h4><ul class="lista" style="margin:0 -20px">${eqs.map((e) => `<li><span class="av p" style="background:var(--acc)">${ic('thermometer', 'p')}</span><div class="cresce t">${esc(e)}</div></li>`).join('')}</ul></div>` : ''}
        <div class="gav-sec"><h4>Visitas (${ords.length})</h4>${ords.length ? `<ul class="lista" style="margin:0 -20px">${ords.slice(0, 8).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t corta">${esc(o.equipamento)}</div><div class="s">${dataCurta(o.entregue_em || o.previsao)}</div></div><span class="et sem-ponto" style="color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span></li>`).join('')}</ul>` : vazio('wrench', 'Nenhuma visita aberta ainda')}</div>
        <div class="gav-sec"><h4>Cobranças</h4>${ls.length ? `<ul class="lista" style="margin:0 -20px">${ls.slice(0, 8).map((l) => `<li class="clicavel" data-abrir="lanc:${l.id}"><div class="cresce"><div class="t corta">${esc(l.descricao)}</div><div class="s">${dataCurta(l.vencimento)}</div></div>${etL(l)}<b class="num" style="min-width:90px;text-align:right">${valorFmt(l)}</b></li>`).join('')}</ul>` : vazio('receipt', 'Sem cobranças ainda')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="contratos" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirContrato" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }) };
  },
  os(a, id, aba = 'itens') {
    const o = os(a, id); if (!o) return null; const c = pessoa(a, o.cliente), i = STATUS_OS.findIndex((x) => x[0] === o.status);
    let corpo = '';
    if (aba === 'itens') corpo = `<div class="gav-sec"><table class="tabela"><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unit.</th><th class="n">Total</th><th></th></tr></thead><tbody>${o.itens.map((x, k) => `<tr><td style="${x.aprovado === false ? 'text-decoration:line-through;color:var(--tx-3)' : ''}">${ic(x.tipo === 'peca' ? 'package' : 'wrench', 'p')} ${esc(x.descricao)}${x.aprovado === false ? ' <span class="et sem-ponto">recusado</span>' : x.aprovado ? ' <span class="et ok sem-ponto">aprovado</span>' : ''}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n"><b>${moeda(x.qtd * x.preco)}</b></td><td class="acoes">${o.faturada ? '' : `<button type="button" class="btn fant peq ic-so" data-acao="tirarItemOS" data-id="${id}" data-i="${k}" aria-label="Remover">${ic('trash')}</button>`}</td></tr>`).join('')}</tbody>
      <tfoot>${o.desconto ? `<tr><td colspan="3">Desconto</td><td class="n">− ${moeda(o.desconto)}</td><td></td></tr>` : ''}<tr><td colspan="3">Total</td><td class="n">${moeda(totalOS(o))}</td><td></td></tr></tfoot></table>
      ${totalOS(o) > 0 ? `<div class="mute" style="font-size:12.5px;margin-top:8px">Peças (custo) ${moeda(custoPecas(a, o))} · comissão ${moeda(comissaoOS(o))} · <b class="${lucroOS(a, o) < 0 ? 'er-tx' : ''}">lucro estimado ${moeda(lucroOS(a, o))} (${pct((lucroOS(a, o) / (totalOS(o) || 1)) * 100)})</b></div>` : ''}
      ${o.faturada ? `<div class="dica" style="margin-top:12px">${ic('check-circle')}<span>OS faturada. Os valores foram lançados em Contas a receber.</span></div>` : `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="addItemOS" data-id="${id}" data-t="servico">${ic('wrench')}Serviço</button><button type="button" class="btn" data-acao="addItemOS" data-id="${id}" data-t="peca">${ic('package')}Peça do estoque</button><button type="button" class="btn" data-acao="descOS" data-id="${id}">${ic('percent')}Desconto</button></div>`}</div>`;
    if (aba === 'det') corpo = `<div class="gav-sec">${props([['user', 'Cliente', `<a href="javascript:void 0" data-abrir="pessoa:${c?.id}">${esc(c?.nome || '—')}</a>`], ['phone', 'Telefone', esc(c?.telefone || '—')], ['wrench', 'Equipamento', esc(o.equipamento)], ['tag', 'Marca / modelo', esc(o.marca || '—')], ['barcode', 'Nº de série', `<span class="mono">${esc(o.serie || '—')}</span>`], ['warning', 'Defeito relatado', esc(o.defeito)], ['list-checks', 'Checklist de entrada', o.checklist?.length ? o.checklist.map((x) => et(x, 'ok', 'sem-ponto')).join(' ') : null], ['user-circle', 'Técnico', esc(nomeT(o.tecnico))], o.contrato && a.db.obter('contratos', o.contrato) ? ['file-text', 'Contrato', `<a href="javascript:void 0" data-abrir="contrato:${o.contrato}">Visita preventiva do contrato</a>`] : null, ['calendar-blank', 'Entrada', dataCurta(o.entrada)], ['flag', 'Previsão', `<span class="${o.status !== 'entregue' && o.previsao < hoje() ? 'er-tx' : ''}">${dataCurta(o.previsao)}</span>`], o.hora ? ['clock', 'Horário', `${o.hora} · ${num(Number(o.duracao) || 2, 1)} h`] : null, o.local ? ['map-pin', 'Local', `<a href="${mapa(o.local)}" target="_blank" rel="noopener">${esc(o.local)}</a>`] : null, o.assinatura ? ['pencil-simple', 'Assinatura', `${esc(o.assinatura.nome)} · ${dataCurta(String(o.assinatura.quando).slice(0, 10))}${o.assinatura.remoto ? ' (pelo link)' : ''}`] : null, o.nfse?.status ? ['receipt', 'Nota de serviço', o.nfse.status === 'autorizado' ? `Nº ${esc(o.nfse.numero)}${o.nfse.simulada ? ' (simulada)' : ''}` : esc(o.nfse.status === 'cancelado' ? 'cancelada' : `não autorizada: ${o.nfse.erro || o.nfse.status}`)] : null, o.entregue_em ? ['check-circle', 'Entregue em', `${dataCurta(o.entregue_em)} · garantia até ${dataCurta(diaMais(o.garantia || 90, o.entregue_em))}`] : null])}</div>
      <div class="gav-sec"><h4>Laudo / serviço executado</h4><textarea data-laudo placeholder="O que foi feito, peças trocadas, testes…">${esc(o.laudo || '')}</textarea><div class="flex" style="justify-content:flex-end;margin-top:8px"><button type="button" class="btn peq" data-acao="salvarLaudo" data-id="${id}">Salvar laudo</button></div></div>${a.anexos ? a.anexos.html('ordens', id, { titulo: 'Fotos do equipamento', dica: 'Antes e depois do serviço (o cliente vê no link)' }) : ''}${histEquip(a, o)}`;
    if (aba === 'hist') corpo = `<div class="gav-sec">${linhaDoTempo([...a.db.historico(`ordens:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })), { quando: o.entrada, icone: 'door-open', html: 'Equipamento recebido' }, ...(o.aprovada_em ? [{ quando: o.aprovada_em, icone: 'check', tom: 'ok', html: 'Orçamento aprovado' }] : []), ...(o.entregue_em ? [{ quando: o.entregue_em, icone: 'seal-check', tom: 'ok', html: 'Entregue ao cliente' }] : [])].sort((x, y) => String(y.quando).localeCompare(String(x.quando))))}</div>`;
    const prox = { orcamento: ['aprovada', 'Cliente aprovou', 'check'], aprovada: ['execucao', 'Iniciar serviço', 'play'], execucao: ['pronta', 'Marcar como pronta', 'seal-check'], aguardando: ['execucao', 'Peça chegou', 'package'] }[o.status];
    return { html: ficha({ tipo: 'Ordem de serviço', icone: 'wrench', titulo: `OS #${o.numero} · ${esc(o.equipamento)}`, avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(c?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalOS(o))}</b><span class="flex" style="gap:5px">· ${av(nomeT(o.tecnico), 'p')}${esc(nomeT(o.tecnico))}</span>`,
      extra: `<div class="etapas" style="margin-top:12px">${STATUS_OS.map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="statusOS" data-id="${id}" data-s="${s}">${n}</button>`).join('')}</div>
        <div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox ? `<button type="button" class="btn pri" data-acao="statusOS" data-id="${id}" data-s="${prox[0]}">${ic(prox[2])}${prox[1]}</button>` : ''}${['orcamento', 'aprovada', 'execucao', 'aguardando', 'pronta'].includes(o.status) ? `<button type="button" class="btn" data-acao="orcamentoLink" data-id="${id}">${ic('whatsapp-logo')}${o.status === 'orcamento' ? 'Mandar orçamento para aprovar' : o.status === 'pronta' && !o.assinatura ? 'Link para assinar a retirada' : 'Link para o cliente acompanhar'}</button>` : ''}${o.status === 'execucao' ? `<button type="button" class="btn" data-acao="statusOS" data-id="${id}" data-s="aguardando">${ic('hourglass')}Aguardando peça</button>` : ''}${o.status === 'pronta' && !o.faturada && totalOS(o) > 0 ? `<button type="button" class="btn pri ok" data-acao="faturarOS" data-id="${id}">${ic('currency-circle-dollar')}Faturar</button>` : ''}${o.status === 'pronta' && (o.faturada || totalOS(o) <= 0) ? `<button type="button" class="btn pri ok" data-acao="statusOS" data-id="${id}" data-s="entregue">${ic('seal-check')}Entregar</button>` : ''}<button type="button" class="btn" data-acao="imprimirOS" data-id="${id}">${ic('printer')}${o.status === 'orcamento' ? 'Imprimir orçamento' : 'Imprimir'}</button>${['pronta', 'entregue'].includes(o.status) ? `<button type="button" class="btn" data-acao="assinarOS" data-id="${id}">${ic('pencil-simple')}${o.assinatura ? 'Assinado ✓' : 'Assinatura do cliente'}</button><button type="button" class="btn" data-acao="imprimirTermo" data-id="${id}">${ic('shield-check')}Termo de entrega</button>` : ''}${o.status === 'entregue' && c?.telefone && (a.db.cfg.avaliacao || temPro(a)) ? `<button type="button" class="btn" data-acao="pedirAvaliacao" data-id="${id}">${ic('star')}${o.avaliacao ? 'Avaliação pedida ✓' : 'Pedir avaliação'}</button>` : ''}${(o.faturada || o.status === 'entregue') && totalOS(o) > 0 ? (o.nfse?.status === 'autorizado' ? `<button type="button" class="btn" data-acao="verNFSe" data-id="${id}">${ic('receipt')}Nota de serviço nº ${esc(o.nfse.numero)}</button>` : `<button type="button" class="btn" data-acao="emitirNFSe" data-id="${id}">${ic('receipt')}Emitir nota de serviço</button>`) : ''}</div>`,
      aba, abas: [['itens', 'Serviços e peças', o.itens.length], ['det', 'Equipamento e laudo'], ['hist', 'Histórico']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarOS" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirOS" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'financeiro', nome: 'Veltria Financeiro', sub: 'Financeiro e OS', cor: '#0b6fb8', icone: 'currency-circle-dollar', empresa: 'Refrigeração Polo Frio', conta: 'Assistência técnica · Florianópolis',
  produto: { mensal: 109 }, versaoDemo: 2, beneficiosPro: BENEFICIOS_FIN, semente, colecoes, fichas, buscaDica: 'OS, clientes, lançamentos',
  portal: {
    cobranca: {
      explica: 'A página de pagamento da cobrança: valor, vencimento e o PIX copia e cola com QR code. Quando o cliente avisa que pagou, aparece aqui para você conferir.',
      montar: (a, id) => {
        const l = a.db.obter('lancamentos', id); if (!l) return null;
        const pix = a.pixDados();
        const enc = encargos(a, l);
        return { descricao: enc ? `${l.descricao} (com multa e juros)` : l.descricao, valor: valorHoje(a, l), vencimento: l.vencimento, status: l.status, cliente: pessoa(a, l.pessoa)?.nome || '', pix, txid: `L${String(l.id).replace(/[^A-Za-z0-9]/g, '').slice(-12)}` };
      },
      responder: (a, r) => {
        const l = a.db.obter('lancamentos', r.ref); if (!l || r.acao !== 'paguei' || l.status === 'pago') return '';
        a.db.salvar('lancamentos', { id: l.id, informado: hoje() });
        return `${chamar(pessoa(a, l.pessoa)) || 'O cliente'} avisou que pagou ${moeda(valorHoje(a, l))} pelo PIX (${l.descricao}): confira no extrato e dê baixa`;
      },
    },
    cliente: {
      explica: 'A área do cliente: equipamentos em serviço, garantias, contratos, contas em aberto com PIX e pedido de visita. Um link só, que o cliente pode guardar.',
      montar: (a, id) => {
        const p = pessoa(a, id); if (!p) return null; const ords = a.db.lista('ordens').filter((o) => o.cliente === id);
        return { nome: p.nome, saudacao: chamar(p), pix: a.pixDados(),
          andamento: ords.filter((o) => o.status !== 'entregue').map((o) => ({ numero: o.numero, equipamento: o.equipamento, etapa: stOS(o.status)[1], previsao: o.previsao, total: totalOS(o) })),
          garantias: ords.filter((o) => o.status === 'entregue' && garantiaAte(o) >= hoje()).map((o) => ({ numero: o.numero, equipamento: o.equipamento, ate: garantiaAte(o) })),
          contas: lancs(a).filter((l) => l.pessoa === id && l.tipo === 'receita' && l.status === 'aberto').sort((x, y) => x.vencimento.localeCompare(y.vencimento)).slice(0, 12).map((l) => ({ id: l.id, descricao: l.descricao, vencimento: l.vencimento, valor: valorHoje(a, l), informado: !!l.informado, txid: `L${String(l.id).replace(/[^A-Za-z0-9]/g, '').slice(-12)}` })),
          contratos: a.db.lista('contratos').filter((c) => c.cliente === id && ctrAtivo(c)).map((c) => ({ descricao: c.descricao, valor: c.valor, proxima: c.proxima, fim: c.fim })) };
      },
      responder: (a, r) => {
        const p = pessoa(a, r.ref); if (!p) return '';
        if (r.acao === 'paguei') { const l = a.db.obter('lancamentos', String(r.dados.l || '')); if (!l || l.pessoa !== p.id || l.status === 'pago') return ''; a.db.salvar('lancamentos', { id: l.id, informado: hoje() }); return `${chamar(p)} avisou pela área do cliente que pagou ${moeda(valorHoje(a, l))} (${l.descricao}): confira e dê baixa`; }
        if (r.acao === 'visita') { const texto = String(r.dados.texto || '').trim().slice(0, 600); if (texto.length < 5) return ''; const data = /^\d{4}-\d{2}-\d{2}$/.test(r.dados.data || '') && r.dados.data >= hoje() ? r.dados.data : diaMais(1);
          const o = novaOSOnline(a, p, { equipamento: String(r.dados.equipamento || 'Equipamento').slice(0, 80), texto: `${texto}${r.dados.periodo ? ` (prefere ${String(r.dados.periodo).slice(0, 10)})` : ''}`, data, local: endCliente(p) });
          return `${chamar(p)} pediu uma visita pela área do cliente: OS #${o.numero} em orçamento`; }
        return '';
      },
    },
    visita: {
      explica: 'O cliente pede a visita técnica por este link, do celular, sem baixar nada. Cada pedido vira uma OS em orçamento, com o cliente cadastrado. Coloque na bio do Instagram, no Google e no WhatsApp.',
      montar: () => ({ periodos: ['manhã', 'tarde'] }),
      responder: (a, r) => {
        if (r.acao !== 'pedir') return '';
        const d = r.dados || {}, nome = String(d.nome || '').trim().slice(0, 80), tel = String(d.telefone || '').replace(/\D/g, '').slice(0, 13), texto = String(d.texto || '').trim().slice(0, 600);
        if (nome.length < 3 || tel.length < 10 || texto.length < 5) return '';
        let p = a.db.lista('pessoas').find((x) => String(x.telefone || '').replace(/\D/g, '').endsWith(tel.slice(-9)));
        if (!p) p = a.db.salvar('pessoas', { nome, tipo: 'cliente', telefone: d.telefone ? String(d.telefone).slice(0, 20) : tel, endereco: String(d.endereco || '').slice(0, 120), bairro: String(d.bairro || '').slice(0, 60), cidade: a.db.cfg.nfse?.cidade || '', uf: a.db.cfg.nfse?.uf || '', origem: 'online' });
        const data = /^\d{4}-\d{2}-\d{2}$/.test(d.data || '') && d.data >= hoje() ? d.data : diaMais(1);
        const o = novaOSOnline(a, p, { equipamento: String(d.equipamento || 'Equipamento').slice(0, 80), texto: `${texto}${d.periodo ? ` (prefere de ${String(d.periodo).slice(0, 10)})` : ''}`, data, local: [String(d.endereco || '').slice(0, 120), String(d.bairro || '').slice(0, 60)].filter(Boolean).join(' · ') || endCliente(p) });
        return `Pedido de visita pelo site: ${nome} · ${o.equipamento} · OS #${o.numero} em orçamento`;
      },
    },
    nps: {
      explica: 'Pesquisa de satisfação: o cliente dá uma nota de 0 a 10 e, se gostou muito, é levado a avaliar a empresa no Google.',
      montar: (a, id) => { const o = os(a, id); if (!o) return null; return { numero: o.numero, equipamento: o.equipamento, tecnico: nomeT(o.tecnico).split(' ')[0], google: /^https:\/\//.test(a.db.cfg.avaliacao || '') ? a.db.cfg.avaliacao : '', respondida: !!o.nps }; },
      responder: (a, r) => {
        const o = os(a, r.ref); if (!o || r.acao !== 'nota' || o.nps) return '';
        const nota = Math.round(Number(r.dados.nota)); if (!(nota >= 0 && nota <= 10)) return '';
        a.db.salvar('ordens', { id: o.id, nps: { nota, comentario: String(r.dados.comentario || '').trim().slice(0, 500), quando: r.criado } });
        a.db.registrar(`ordens:${o.id}`, `Nota do cliente: ${nota} de 10`, { icone: 'star', tom: nota >= 9 ? 'ok' : nota <= 6 ? 'er' : 'al' });
        return `${chamar(pessoa(a, o.cliente)) || 'Cliente'} deu nota ${nota} para a OS #${o.numero}${nota <= 6 ? ': ligue para entender o que houve' : ''}`;
      },
    },
    contrato: {
      explica: 'O cliente lê o contrato de manutenção no celular e aceita com nome e CPF/CNPJ. A data e a hora do aceite ficam registradas.',
      montar: (a, id) => { const c = a.db.obter('contratos', id); if (!c) return null; const p = pessoa(a, c.cliente);
        return { cliente: p?.nome || '', descricao: c.descricao, valor: c.valor, inicio: c.inicio, fim: c.fim, equipamentos: String(c.equipamentos || '').split('\n').map((s) => s.trim()).filter(Boolean), clausulas: clausulasContrato(a, c), aceito: c.aceite ? { nome: c.aceite.nome, quando: c.aceite.quando } : null }; },
      responder: (a, r) => {
        const c = a.db.obter('contratos', r.ref); if (!c || r.acao !== 'aceitar' || c.aceite) return '';
        const nome = String(r.dados.nome || '').trim().slice(0, 80), doc = String(r.dados.documento || '').replace(/[^\d./-]/g, '').slice(0, 20);
        if (nome.length < 5 || doc.replace(/\D/g, '').length < 11) return '';
        a.db.salvar('contratos', { id: c.id, aceite: { nome, doc, quando: r.criado } }); a.db.registrar(`contratos:${c.id}`, `Contrato aceito pelo link por ${nome}`, { icone: 'handshake', tom: 'ok' });
        return `${nome} aceitou o contrato de manutenção pelo celular`;
      },
    },
    orcamento: {
      explica: 'O cliente vê o orçamento no celular, aprova ou recusa cada item e acompanha em que etapa está o equipamento. A resposta chega aqui na OS.',
      montar: async (a, id, { fotos }) => {
        const o = a.db.obter('ordens', id); if (!o) return null;
        return { numero: o.numero, equipamento: o.equipamento, marca: o.marca || '', etapa: o.status, etapas: STATUS_OS.map(([k, n]) => [k, n]), previsao: o.status === 'entregue' ? null : o.previsao, defeito: o.defeito || '', laudo: o.laudo || '', desconto: o.desconto || 0, garantia: garantiaAte(o), garantiaDias: o.garantia || 90, assinado: !!o.assinatura, validade: o.status === 'orcamento' ? diaMais(VALIDADE_ORC(a), o.orc_enviado || o.entrada) : null,
          itens: o.itens.map((x, k) => ({ k, descricao: x.descricao, qtd: x.qtd, preco: x.preco, aprovado: x.aprovado ?? null })), fotos: await fotos(o) };
      },
      responder: (a, r) => {
        const o = a.db.obter('ordens', r.ref); if (!o) return '';
        if (r.acao === 'assinar') {
          const img = String(r.dados.img || ''), nome = String(r.dados.nome || '').trim().slice(0, 80);
          if (o.assinatura || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 19000 || nome.length < 3) return '';
          a.db.salvar('ordens', { id: o.id, assinatura: { img, nome, quando: r.criado, remoto: true } }); a.db.registrar(`ordens:${o.id}`, `${nome} assinou o termo de entrega pelo link`, { icone: 'pencil-simple', tom: 'ok' });
          return `OS #${o.numero}: ${nome} assinou o termo de entrega pelo celular`;
        }
        if (r.acao !== 'aprovar') return '';
        const resp = r.dados.itens || {}; let sim = 0, nao = 0;
        const itens = o.itens.map((x, k) => { if (x.aprovado != null || !(k in resp)) return x; resp[k] ? sim++ : nao++; return { ...x, aprovado: !!resp[k] }; });
        a.db.salvar('ordens', { id: o.id, itens, ...(o.status === 'orcamento' && sim ? { status: 'aprovada', aprovada_em: hoje() } : {}) });
        a.db.registrar(`ordens:${o.id}`, `Cliente respondeu pelo link: ${sim} aprovado${sim === 1 ? '' : 's'}${nao ? `, ${nao} recusado${nao === 1 ? '' : 's'}` : ''}`, { icone: 'check', tom: 'ok' });
        return sim ? `OS #${o.numero}: o cliente aprovou ${sim} ${sim === 1 ? 'item' : 'itens'} pelo link${nao ? ` e recusou ${nao}` : ''}` : `OS #${o.numero}: o cliente recusou o orçamento pelo link`;
      },
    },
  },
  configExtra: (a) => { const r = regraAtraso(a); return `<div class="cartao"><div class="cartao-cab"><div><h3>Multa e juros de atraso</h3><div class="sub">Somados sozinhos nas cobranças vencidas: no link de pagamento, na mensagem do WhatsApp e na hora de dar baixa</div></div></div><div class="cartao-corpo"><div class="form-grade">
    <label class="campo">Multa (%)<input type="number" min="0" max="20" step="0.1" value="${r.multa}" data-mudar="cfgAtraso" data-k="multa"><span class="ajuda">Para consumidor, o Código de Defesa do Consumidor limita a 2%</span></label>
    <label class="campo">Juros ao mês (%)<input type="number" min="0" max="10" step="0.1" value="${r.juros}" data-mudar="cfgAtraso" data-k="juros"><span class="ajuda">Contados por dia de atraso. O comum é 1% ao mês</span></label></div>
    <p class="mute" style="font-size:12.5px;margin-top:8px">Deixe 0 nos dois para não cobrar encargos.</p></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Orçamento e avaliação</h3><div class="sub">Validade que aparece no orçamento e o link para o cliente avaliar a empresa</div></div></div><div class="cartao-corpo"><div class="form-grade">
      <label class="campo">Validade do orçamento (dias)<input type="number" min="1" max="120" value="${VALIDADE_ORC(a)}" data-mudar="cfgSimples" data-k="validade_orc"></label>
      <label class="campo largo">Link de avaliação no Google<input type="url" placeholder="https://g.page/r/..." value="${esc(a.db.cfg.avaliacao || '')}" data-mudar="cfgSimples" data-k="avaliacao"><span class="ajuda">No Perfil da Empresa no Google: "Pedir avaliações" → copiar o link. Com ele, o sistema lembra de pedir avaliação depois de cada entrega.</span></label></div></div></div>
    ${cartaoNFSe(a)}`; },
  modelos: [
    { id: 'assistencia', nome: 'Assistência técnica', desc: 'Ordens de serviço, peças e contratos de manutenção', dados: {} },
    { id: 'prestador', nome: 'Prestador de serviços', desc: 'Serviços avulsos e mensalidades de clientes', dados: { servicos: [['Visita técnica', 150], ['Hora de serviço', 120], ['Mensalidade de manutenção', 450]].map(([nome, preco]) => ({ nome, preco })) } },
    { id: 'eletronicos', nome: 'Conserto de celulares e eletrônicos', desc: 'Troca de tela, bateria e reparos', dados: { servicos: [['Troca de tela de celular (mão de obra)', 120], ['Troca de bateria', 90], ['Limpeza de placa (oxidação)', 150]].map(([nome, preco]) => ({ nome, preco })), produtos: [['Tela iPhone 11 (compatível)', 'TEL-IP11', 180, 390, 3, 2], ['Bateria Samsung A32', 'BAT-A32', 60, 150, 4, 2]].map(([nome, codigo, custo, preco, estoque, minimo]) => ({ nome, codigo, custo, preco, estoque, minimo })) } },
  ],
  passos: (a) => [{ id: 'pix', rot: 'Cadastre a chave PIX da empresa', feito: a.temPix(), href: '#/config' }, { id: 'cobranca', rot: 'Mande um link de pagamento para um cliente', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('cobranca:')) }],
  equipe: [['Rodrigo Martins', 'Dono'], ['Cláudia Neves', 'Financeiro'], ...TEC.map(([, n]) => [n, 'Técnico'])],
  busca: [{ colecao: 'contratos', grupo: 'Contratos', icone: 'file-text', ficha: 'contrato', rot: (c, a) => pessoa(a, c.cliente)?.nome || c.descricao, sub: (c) => `${moeda(c.valor)}/mês` }, { colecao: 'ordens', grupo: 'Ordens de serviço', icone: 'wrench', ficha: 'os', rot: (o) => `#${o.numero} · ${o.equipamento}`, sub: (o, a) => pessoa(a, o.cliente)?.nome || '' }, { colecao: 'pessoas', grupo: 'Clientes e fornecedores', icone: 'user', ficha: 'pessoa', rot: (p) => p.nome, sub: (p) => p.tipo }, { colecao: 'lancamentos', grupo: 'Lançamentos', icone: 'receipt', ficha: 'lanc', rot: (l) => l.descricao, sub: (l) => moeda(l.valor) }],
  comandos: [{ rot: 'Nova ordem de serviço', icone: 'wrench', acao: (a) => a.acoes.novaOS() }, { rot: 'Nova receita', icone: 'arrow-down-left', acao: (a) => a.acoes.novoLanc({ t: 'receita' }) }, { rot: 'Nova despesa', icone: 'arrow-up-right', acao: (a) => a.acoes.novoLanc({ t: 'despesa' }) }, { rot: 'Transferir entre contas', icone: 'arrows-left-right', acao: (a) => a.acoes.transferir({}) }, { rot: 'Novo contrato de manutenção', icone: 'file-text', acao: (a) => a.acoes.novoCad({ c: 'contratos' }) }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Painel financeiro', render: painel, atalho: 'i' },
    { grupo: 'Financeiro' },
    { id: 'receber', rot: 'Contas a receber', icone: 'arrow-down-left', render: (a) => lancamentosPag(a, ['receber']), atalho: 'r', novo: (a) => a.acoes.novoLanc({ t: 'receita' }), cont: (a) => { const n = lancs(a).filter((l) => l.tipo === 'receita' && vencido(l)).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'pagar', rot: 'Contas a pagar', icone: 'arrow-up-right', render: (a) => lancamentosPag(a, ['pagar']), atalho: 'p', novo: (a) => a.acoes.novoLanc({ t: 'despesa' }), cont: (a) => lancs(a).filter((l) => l.tipo === 'despesa' && l.status === 'aberto' && diasAte(l.vencimento) <= 3).length },
    { id: 'lancamentos', rot: 'Todos os lançamentos', icone: 'list', render: (a) => lancamentosPag(a, []), novo: (a) => a.acoes.novoLanc({ t: 'despesa' }) },
    { id: 'fluxo', rot: 'Fluxo de caixa', icone: 'chart-line-up', render: fluxo, atalho: 'f' },
    { id: 'dre', rot: 'Resultado (DRE)', icone: 'equals', titulo: 'Resultado do mês (DRE gerencial)', render: dre },
    { id: 'categorias', rot: 'Categorias', icone: 'tag', titulo: 'Categorias de receitas e despesas', render: categoriasPag },
    { id: 'conciliacao', rot: 'Conciliação bancária', icone: 'arrows-left-right', render: conciliacao, cont: (a) => a.db.lista('extrato').filter((e) => !e.conciliado).length },
    { grupo: 'Serviços' },
    { id: 'os', rot: 'Ordens de serviço', icone: 'wrench', render: ordensPag, cheio: true, atalho: 'o', novo: (a) => a.acoes.novaOS(), cont: (a) => { const n = a.db.lista('ordens').filter((o) => o.status !== 'entregue' && o.previsao < hoje()).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'agenda', rot: 'Agenda dos técnicos', icone: 'calendar-blank', render: agendaPag, cheio: true, atalho: 'a', cont: (a) => a.db.lista('ordens').filter((o) => o.status !== 'entregue' && o.previsao === hoje()).length },
    { id: 'campo', rot: 'Minhas OS (técnico)', icone: 'identification-card', titulo: 'Minhas OS', render: campoPag },
    { id: 'contratos', rot: 'Contratos e PMOC', icone: 'file-text', titulo: 'Contratos de manutenção', render: contratosPag, novo: (a) => a.acoes.novoCad({ c: 'contratos' }), cont: (a) => { const n = visitasProximas(a).length + cobrancasFaltando(a).length; return n ? { n, tom: 'al' } : 0; } },
    { id: 'estoque', rot: 'Peças e serviços', icone: 'package', render: estoque, cont: (a) => { const n = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'pessoas', rot: 'Clientes e fornecedores', icone: 'users', render: pessoasPag, atalho: 'c' },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
    { id: 'desempenho', rot: 'Desempenho da equipe', icone: 'trophy', titulo: 'Desempenho e metas da equipe', render: desempenhoPag, cont: (a) => (!a.nuvem || !temPro(a) ? { n: 'Pro', tom: 'pro' } : 0) },
    { id: 'atendimento', rot: 'Atendimento online', icone: 'globe', titulo: 'Atendimento online', render: atendimentoPag, cont: (a) => (!a.nuvem || !temPro(a) ? { n: 'Pro', tom: 'pro' } : a.db.lista('ordens').filter((o) => o.origem === 'online' && o.status === 'orcamento').length) },
    paginaEquipe(EQUIPE),
    ...ferramentaPaginas(FERR, FERR_ITENS),
  ],
});

const reab = () => { app.render(); app.reabrir(); };
// extrato do banco: OFX (o padrão que todo banco exporta) ou CSV data;descrição;valor
function lerExtrato(txt) {
  if (/<STMTTRN>/i.test(txt)) return txt.split(/<STMTTRN>/i).slice(1).map((b) => { const tag = (t) => (b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i')) || [])[1]?.trim() || ''; const dt = tag('DTPOSTED'), v = Number(tag('TRNAMT').replace(',', '.')); return { data: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`, descricao: (tag('MEMO') || tag('NAME') || 'SEM DESCRIÇÃO').toUpperCase().slice(0, 120), valor: Math.round(v * 100) / 100, fitid: tag('FITID') || undefined }; }).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.data) && isFinite(x.valor) && x.valor !== 0);
  return txt.split(/\r?\n/).map((x) => x.split(/[;\t]/).length >= 3 ? x.split(/[;\t]/) : x.split(',')).filter((x) => x.length >= 3 && /\d/.test(x[2])).map(([dt, desc, v]) => { const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(dt.trim()) ? dt.trim().split('/').reverse().join('-') : dt.trim(); const s = String(v).trim().replace(/[R$\s]/g, ''); const val = Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')); return { data: iso, descricao: desc.trim().toUpperCase(), valor: Math.round(val * 100) / 100 }; }).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.data) && isFinite(x.valor));
}
// textos prontos do WhatsApp para orçamento parado, avaliação e retorno da manutenção
function textoLista(tipo, o, link = '') {
  const c = pessoa(app, o.cliente), nome = chamar(c);
  if (tipo === 'orc') return `Olá, ${nome}! Aqui é da ${app.empresa}. Conseguiu ver o orçamento da OS #${o.numero} (${o.equipamento}), de ${moeda(totalOS(o))}? Ele vale até ${dataBR(diaMais(VALIDADE_ORC(app), o.orc_enviado || o.entrada))}.${link ? ` Dá para aprovar por aqui: ${link}` : ''} Qualquer dúvida, é só me chamar.`;
  if (tipo === 'avl' && link) return `Olá, ${nome}! Obrigado por confiar na ${app.empresa}. De 0 a 10, quanto você recomendaria o nosso serviço? Responde em 10 segundos: ${link}`;
  if (tipo === 'avl') return `Olá, ${nome}! Obrigado por confiar na ${app.empresa}. Se o serviço ficou bom, deixe sua avaliação, leva 1 minuto: ${app.db.cfg.avaliacao}\nAjuda muito a gente.`;
  return `Olá, ${nome}! Aqui é da ${app.empresa}. Já faz uns 6 meses da última manutenção do seu ${o.equipamento}. A limpeza preventiva deixa o aparelho gelando melhor e gastando menos energia. Quer que eu agende uma visita?`;
}
const proxNumOS = () => Math.max(1000, ...app.db.lista('ordens').map((o) => o.numero || 0)) + 1;
function cobrarContrato(c, ym) {
  if (lancs(app).some((l) => l.contrato === c.id && l.vencimento.startsWith(ym))) return null;
  return app.db.salvar('lancamentos', { tipo: 'receita', descricao: c.descricao || 'Contrato de manutenção', categoria: CAT.contratos ? 'contratos' : CATS.receita[0][0], pessoa: c.cliente, conta: garantirConta(app), valor: c.valor, vencimento: diaDoMes(ym, c.dia), status: 'aberto', forma: 'PIX', recorrente: true, contrato: c.id, conciliado: false });
}
function abrirVisita(c) {
  const eqs = String(c.equipamentos || '').split('\n').map((s) => s.trim()).filter(Boolean), quando = c.proxima || hoje();
  const o = app.db.salvar('ordens', { numero: proxNumOS(), cliente: c.cliente, tecnico: c.tecnico || padraoEquipe('diego'), equipamento: eqs.length > 1 ? `Manutenção preventiva · ${eqs.length} equipamentos` : eqs[0] || 'Manutenção preventiva', marca: '', serie: '', previsao: quando,
    defeito: `Visita preventiva do contrato.${eqs.length ? ` Equipamentos: ${eqs.join('; ')}.` : ''}`, status: 'aprovada', aprovada_em: hoje(), itens: [{ tipo: 'servico', ref: '', descricao: 'Manutenção preventiva (coberta pelo contrato)', qtd: 1, preco: 0 }], desconto: 0, entrada: hoje(), garantia: 90, checklist: [], contrato: c.id, visita: quando });
  const prox = diaMais(0, `${mesMais(Number(c.visitas) || 1, quando)}-${quando.slice(8)}`);
  app.db.salvar('contratos', { id: c.id, proxima: prox }); app.db.registrar(`ordens:${o.id}`, 'OS aberta pela visita do contrato', { icone: 'file-text' });
  return o;
}
async function escolherConta(titulo, padrao = 'ct0') {
  return modal({ titulo, largura: 420, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo">Conta<select name="c">${app.db.lista('contas').map((c) => `<option value="${c.id}" ${c.id === padrao ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="d" value="${hoje()}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
}
// técnico que entra com o e-mail cadastrado cai direto na tela dele (uma vez por sessão)
app.antesDeRender = () => { carregarCats(app); if (!app.estado.foiCampo && app.nuvem && app.db && tecDaSessao(app) && (!location.hash || location.hash === '#/painel')) { app.estado.foiCampo = true; setTimeout(() => { location.hash = '#/campo'; }, 0); } };
async function formCat(t, atual) {
  const desp = t === 'despesa';
  return modal({ titulo: atual ? `Editar categoria · ${atual[1]}` : `Nova categoria de ${desp ? 'despesa' : 'receita'}`, largura: 480,
    corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Nome<input name="n" required maxlength="60" value="${esc(atual?.[1] || '')}" placeholder="${desp ? 'Ex.: Manutenção da van, Material de escritório' : 'Ex.: Instalações, Consultoria'}"></label>
      ${desp ? `<label class="campo largo">Tipo de gasto<select name="g">${GRUPOS.map(([g, r]) => `<option value="${g}" ${(atual?.[2] || 'operacional') === g ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><small class="mute">Define em que linha do Resultado (DRE) ela aparece.</small></label>
      <label class="campo largo">Limite de gasto por mês (opcional)<div class="prefixo"><span>R$</span><input type="number" name="m" min="0" step="10" value="${Number(atual?.[3]) || ''}" placeholder="sem limite"></div><small class="mute">O painel avisa quando o gasto do mês chega a 80% e quando passa.</small></label>` : ''}</form>`,
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); const n = fm.n.value.trim(); if (!n) { fm.n.focus(); return false; } return { n, g: desp ? fm.g.value : 'receita', m: desp ? Math.max(0, Number(fm.m.value) || 0) : 0 }; } }] });
}
async function escolherCat(t, titulo, fora = null) {
  const ops = CATS[t].filter(([id]) => id !== fora);
  return modal({ titulo, largura: 420, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">Categoria<select name="c">${ops.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></label></form>`,
    botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => f.querySelector('form').c.value }] });
}
Object.assign(app.acoes, {
  novaCat: async (d) => {
    const r = await formCat(d.t); if (!r) return;
    if (CATS[d.t].some(([, n]) => normal(n) === normal(r.n))) { avisar('Já existe uma categoria com esse nome', { tipo: 'erro' }); return; }
    CATS[d.t].push([`c${Date.now().toString(36)}`, r.n, r.g, r.m]); gravarCats(app); avisar(`Categoria "${r.n}" criada`); app.render();
  },
  editarCat: async (d) => {
    const i = CATS[d.t].findIndex(([id]) => id === d.id); if (i < 0) return;
    const r = await formCat(d.t, CATS[d.t][i]); if (!r) return;
    CATS[d.t][i] = [d.id, r.n, r.g, r.m]; gravarCats(app); avisar('Categoria atualizada'); app.render();
  },
  apagarCat: async (d) => {
    const cat = CATS[d.t].find(([id]) => id === d.id); if (!cat) return;
    if (CATS[d.t].length <= 1) { avisar('Deixe pelo menos uma categoria', { tipo: 'erro' }); return; }
    const em = lancs(app).filter((l) => l.categoria === d.id);
    if (em.length) {
      const para = await escolherCat(d.t, `"${cat[1]}" tem ${em.length} lançamentos. Para qual categoria eles vão?`, d.id); if (!para) return;
      em.forEach((l) => app.db.salvar('lancamentos', { id: l.id, categoria: para }));
    } else if (!(await confirmar(`Apagar a categoria "${cat[1]}"?`, { rotulo: 'Apagar' }))) return;
    CATS[d.t].splice(CATS[d.t].indexOf(cat), 1); gravarCats(app); avisar(`Categoria "${cat[1]}" apagada`); app.render();
  },
  padraoCats: async () => {
    const usadas = new Set(lancs(app).map((l) => l.categoria));
    const perdidas = [...CATS.receita, ...CATS.despesa].filter(([id]) => usadas.has(id) && !CAT_PADRAO_IDS.has(id));
    if (perdidas.length) { avisar(`Antes, mude os lançamentos de: ${perdidas.map((x) => x[1]).join(', ')}`, { tipo: 'erro', tempo: 7000 }); return; }
    if (!(await confirmar('Voltar à lista padrão de categorias? Os nomes que você mudou voltam ao original.', { rotulo: 'Voltar ao padrão' }))) return;
    delete app.db.cfg.categorias; app.db.gravar(); carregarCats(app); app.render();
  },
  mudarCatEmMassa: async ({ ids }) => {
    const ls = ids.map((x) => app.db.obter('lancamentos', x)).filter(Boolean); if (!ls.length) return;
    const tipos = new Set(ls.map((l) => l.tipo));
    if (tipos.size > 1) { avisar('Selecione só receitas ou só despesas para mudar a categoria', { tipo: 'erro' }); return; }
    const t = [...tipos][0];
    const c = await escolherCat(t, `Mudar a categoria de ${ls.length} ${ls.length === 1 ? 'lançamento' : 'lançamentos'}`); if (!c) return;
    ls.forEach((l) => app.db.salvar('lancamentos', { id: l.id, categoria: c })); avisar(`Categoria trocada para "${CAT[c]?.nome}"`); app.render();
  },
  novoLanc: async (d = {}) => {
    const r = await editar(app, 'lancamentos', null, { tipo: d.t || 'despesa', categoria: d.t === 'receita' ? 'servicos' : 'fornecedores', ...(d.valores || {}) }); if (!r) return;
    const n = r.parcelas === 'rec' ? 12 : Number(r.parcelas) || 1, noCartao = r.tipo === 'despesa' && ehCartao(conta(app, r.conta));
    const st = (v) => (noCartao ? { status: 'pago', pago_em: v } : { status: 'aberto' });
    if (n > 1) { const base = r.valor, parc = r.parcelas === 'rec' ? base : Math.round((base / n) * 100) / 100; app.db.salvar('lancamentos', { id: r.id, valor: parc, descricao: r.parcelas === 'rec' ? r.descricao : `${r.descricao} · 1/${n}`, recorrente: r.parcelas === 'rec', ...st(r.vencimento) }); for (let k = 1; k < n; k++) { const v = diaMais(0, `${mesMais(k, r.vencimento)}-${r.vencimento.slice(8)}`); app.db.salvar('lancamentos', { ...r, id: undefined, valor: parc, descricao: r.parcelas === 'rec' ? r.descricao : `${r.descricao} · ${k + 1}/${n}`, vencimento: v, recorrente: r.parcelas === 'rec', ...st(v) }); } avisar(`${n} lançamentos criados${noCartao ? ' no cartão (cada parcela entra na fatura do mês)' : ''}`); }
    else { app.db.salvar('lancamentos', { id: r.id, ...st(r.vencimento) }); if (noCartao) avisar('Compra lançada no cartão: entra na fatura em aberto'); }
    app.render();
  },
  editarLanc: async (d) => { if (await editar(app, 'lancamentos', app.db.obter('lancamentos', d.id))) reab(); },
  baixar: async (d) => {
    const l = app.db.obter('lancamentos', d.id); if (!l || l.status === 'pago') return; const rec = l.tipo === 'receita', enc = encargos(app, l), cartao = /cart/i.test(l.forma || '');
    const r = await modal({ titulo: `${rec ? 'Receber' : 'Pagar'} · ${l.descricao}`, largura: 480, corpo: `<form class="form-grade" onsubmit="return false">
      <label class="campo">Conta<select name="c">${app.db.lista('contas').map((c) => `<option value="${c.id}" ${c.id === l.conta ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="d" value="${hoje()}"></label>
      <label class="campo">Valor ${rec ? 'recebido' : 'pago'}<div class="prefixo"><span>R$</span><input type="number" step="0.01" min="0.01" name="v" value="${(l.valor + enc).toFixed(2)}"></div><span class="ajuda">${enc ? `Já inclui ${moeda(enc)} de multa e juros. ` : ''}Se for menos que ${moeda(l.valor)}, o resto continua em aberto.</span></label>
      ${rec ? `<label class="campo">Taxa descontada<div class="prefixo"><span>R$</span><input type="number" step="0.01" min="0" name="t" value="0"></div><span class="ajuda">${cartao ? 'Taxa da maquininha' : 'Ex.: taxa da maquininha ou do boleto'}. Vira despesa em tarifas.</span></label>` : ''}</form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); const v = Math.round(Number(fm.v.value) * 100) / 100; if (!(v > 0)) { fm.v.focus(); return false; } return { c: fm.c.value, d: fm.d.value || hoje(), v, t: Math.round(Math.max(0, Number(fm.t?.value) || 0) * 100) / 100 }; } }] });
    if (!r) return;
    const antes = { status: l.status, pago_em: l.pago_em || null, conta: l.conta, valor: l.valor }, criados = [], parcial = r.v < l.valor - 0.009;
    const cat = (t, g) => (CATS[t].find(([, , x]) => x === g) || CATS[t][0])[0];
    if (parcial) {
      criados.push(app.db.salvar('lancamentos', { ...l, id: undefined, valor: Math.round((l.valor - r.v) * 100) / 100, descricao: /\(restante\)$/.test(l.descricao) ? l.descricao : `${l.descricao} (restante)`, status: 'aberto', pago_em: null, conciliado: false, regua: {}, informado: null }).id);
      app.db.salvar('lancamentos', { id: l.id, valor: r.v, status: 'pago', pago_em: r.d, conta: r.c });
    } else {
      app.db.salvar('lancamentos', { id: l.id, status: 'pago', pago_em: r.d, conta: r.c });
      const extra = Math.round((r.v - l.valor) * 100) / 100;
      if (extra > 0.009) criados.push(app.db.salvar('lancamentos', { tipo: l.tipo, descricao: `Multa e juros · ${l.descricao}`, categoria: rec ? (CAT.outras_r ? 'outras_r' : cat('receita', 'receita')) : (CAT.tarifas ? 'tarifas' : cat('despesa', 'financeiro')), pessoa: l.pessoa, conta: r.c, valor: extra, vencimento: r.d, status: 'pago', pago_em: r.d, forma: l.forma, conciliado: false }).id);
    }
    if (r.t > 0) criados.push(app.db.salvar('lancamentos', { tipo: 'despesa', descricao: `Taxa ${cartao ? 'do cartão' : 'de recebimento'} · ${l.descricao}`, categoria: CAT.tarifas ? 'tarifas' : cat('despesa', 'financeiro'), conta: r.c, valor: r.t, vencimento: r.d, status: 'pago', pago_em: r.d, forma: l.forma, conciliado: false }).id);
    if (parcial) app.db.registrar(`lancamentos:${l.id}`, `Pagamento de ${moeda(r.v)}; ${moeda(l.valor - r.v)} ficaram em aberto`, { icone: 'check' });
    avisar(`${rec ? 'Recebimento' : 'Pagamento'} de ${moeda(r.v)} registrado em ${conta(app, r.c).nome}${parcial ? `. ${moeda(l.valor - r.v)} continuam em aberto` : ''}`, { desfazer: () => { app.db.salvar('lancamentos', { id: l.id, ...antes }); criados.forEach((x) => app.db.apagar('lancamentos', x)); reab(); } });
    reab();
  },
  menuLanc: (d, el) => pop(el, [
    { rotulo: 'Duplicar para o próximo mês', icone: 'copy', acao: () => { const l = app.db.obter('lancamentos', d.id); app.db.salvar('lancamentos', { ...l, id: undefined, vencimento: diaMais(0, `${mesMais(1, l.vencimento)}-${l.vencimento.slice(8)}`), status: 'aberto', pago_em: null, conciliado: false }); avisar('Lançamento duplicado'); app.render(); } },
    app.db.obter('lancamentos', d.id).status === 'pago' ? { rotulo: 'Estornar baixa', icone: 'arrow-counter-clockwise', acao: () => { app.db.salvar('lancamentos', { id: d.id, status: 'aberto', pago_em: null, conciliado: false }); app.db.lista('extrato').filter((e) => e.conciliado === d.id).forEach((e) => app.db.salvar('extrato', { id: e.id, conciliado: null })); app.db.registrar(`lancamentos:${d.id}`, 'Baixa estornada', { icone: 'arrow-counter-clockwise' }); reab(); } } : { rotulo: 'Adiar 7 dias', icone: 'clock', acao: () => { const l = app.db.obter('lancamentos', d.id); app.db.salvar('lancamentos', { id: d.id, vencimento: diaMais(7, l.vencimento) }); reab(); } },
    { sep: true }, { rotulo: 'Excluir', icone: 'trash', perigo: true, acao: () => excluir(app, 'lancamentos', d.id) },
  ]),
  modoFx: (d) => { app.estado.fx.modo = d.m; app.render(); },
  simFx: (d, el) => { app.estado.simFx[d.k] = Math.max(0, Number(el.value) || 0); app.render(); },
  cobrarLink: async (d) => {
    const l = app.db.obter('lancamentos', d.id), p = pessoa(app, l.pessoa);
    await app.pedirPix('Para a cobrança já ir com o PIX copia e cola e o QR code, cadastre a chave da empresa.');
    const url = await app.portal.link('cobranca', d.id), passo = REGUA.find((x) => x[1] === d.passo) || (vencido(l) ? REGUA[2] : REGUA[1]);
    window.open(`${telLink(p?.telefone)}?text=${encodeURIComponent(textoRegua(app, l, passo, url))}`, '_blank', 'noopener');
    app.db.salvar('lancamentos', { id: d.id, regua: { ...(l.regua || {}), [passo[1]]: hoje() } }); app.db.registrar(`lancamentos:${d.id}`, `Cobrança enviada (${passo[2]})`, { icone: 'whatsapp-logo' }); app.render();
  },
  csvFluxo: () => { const l = app.estado.fxLinhas || [], m = (v) => ({ v: Math.round(v * 100) / 100, t: 'moeda' }); baixarXlsx(`fluxo-de-caixa-${hoje()}`, [{ nome: 'Fluxo de caixa', linhas: [['Período', 'Entradas', 'Saídas', 'Resultado', 'Saldo final', 'Previsto'], ...l.map((x) => [x.rot, m(x.e), m(x.s), m(x.r), m(x.saldo), x.futuro ? 'previsto' : ''])] }]); avisar('Planilha do Excel baixada'); },
  excelCompleto: () => {
    const m = (v) => ({ v: Math.round((Number(v) || 0) * 100) / 100, t: 'moeda' }), ym = hoje().slice(0, 7), sit = (l) => (l.status === 'pago' ? (l.tipo === 'receita' ? 'Recebido' : 'Pago') : vencido(l) ? 'Vencido' : 'Em aberto');
    const linhaL = (l) => { const p = pessoa(app, l.pessoa); return [l.vencimento, l.pago_em || '', l.tipo === 'receita' ? 'Receita' : 'Despesa', l.descricao, CAT[l.categoria]?.nome || '', p?.nome || '', p?.doc || '', conta(app, l.conta)?.nome || '', l.forma || '', m(sinal(l) * l.valor), sit(l)]; };
    const cabL = ['Vencimento', 'Pago em', 'Tipo', 'Descrição', 'Categoria', 'Cliente / fornecedor', 'CPF / CNPJ', 'Conta', 'Forma', 'Valor', 'Situação'];
    const todos = [...lancs(app)].sort((x, y) => x.vencimento.localeCompare(y.vencimento)), ab = todos.filter((l) => l.status === 'aberto');
    const meses = Array.from({ length: 12 }, (_, i) => mesMais(i - 11));
    const resM = (mm, f) => soma(lancs(app).filter((l) => (l.status === 'pago' ? l.pago_em : l.vencimento).startsWith(mm) && f(l)), (l) => l.valor);
    const dreM = (mm, g) => soma(lancs(app).filter((l) => l.vencimento.startsWith(mm) && l.tipo === 'despesa' && CAT[l.categoria]?.grupo === g), (l) => l.valor);
    const recM = (mm) => soma(lancs(app).filter((l) => l.vencimento.startsWith(mm) && l.tipo === 'receita'), (l) => l.valor);
    const abas = [
      { nome: 'Resumo', linhas: [['Item', 'Valor'], ['Empresa', app.empresa], ['Gerado em', hoje()], ['Saldo em todas as contas', m(saldoTotal(app))], ...app.db.lista('contas').map((c) => [`  ${c.nome}`, m(saldoConta(app, c.id))]), ['A receber em aberto', m(soma(ab.filter((l) => l.tipo === 'receita'), (l) => l.valor))], ['  dos quais vencidos', m(soma(ab.filter((l) => l.tipo === 'receita' && vencido(l)), (l) => l.valor))], ['A pagar em aberto', m(soma(ab.filter((l) => l.tipo === 'despesa'), (l) => l.valor))], [`Recebido em ${nomeMes(ym, true)}`, m(resM(ym, (l) => l.tipo === 'receita' && l.status === 'pago'))], [`Pago em ${nomeMes(ym, true)}`, m(resM(ym, (l) => l.tipo === 'despesa' && l.status === 'pago'))], ['Contratos ativos (por mês)', m(soma(app.db.lista('contratos').filter((c) => ctrAtivo(c)), (c) => c.valor))], ['OS abertas', app.db.lista('ordens').filter((o) => o.status !== 'entregue').length]] },
      { nome: 'A receber', linhas: [cabL, ...ab.filter((l) => l.tipo === 'receita').map(linhaL)] },
      { nome: 'A pagar', linhas: [cabL, ...ab.filter((l) => l.tipo === 'despesa').map(linhaL)] },
      { nome: 'Todos os lançamentos', linhas: [cabL, ...todos.map(linhaL)] },
      { nome: 'Fluxo por mês', linhas: [['Mês', 'Entradas', 'Saídas', 'Resultado'], ...meses.map((mm) => { const e = resM(mm, (l) => l.tipo === 'receita'), s = resM(mm, (l) => l.tipo === 'despesa'); return [nomeMes(mm, true), m(e), m(s), m(e - s)]; })] },
      { nome: 'DRE', linhas: [['Linha', ...meses.slice(-6).map((mm) => nomeMes(mm, true))], ['Receita bruta', ...meses.slice(-6).map((mm) => m(recM(mm)))], ...GRUPOS.map(([g, r]) => [`(−) ${r.split(' (')[0]}`, ...meses.slice(-6).map((mm) => m(dreM(mm, g)))]), ['= Resultado', ...meses.slice(-6).map((mm) => m(recM(mm) - soma(GRUPOS, ([g]) => dreM(mm, g))))]] },
      { nome: 'Transferências', linhas: [['Data', 'Sai de', 'Entra em', 'Valor', 'Descrição'], ...transfs(app).map((t) => [t.data, conta(app, t.de)?.nome || '', conta(app, t.para)?.nome || '', m(t.valor), t.obs || ''])] },
      { nome: 'Ordens de serviço', linhas: [['OS', 'Entrada', 'Cliente', 'Equipamento', 'Marca', 'Série', 'Técnico', 'Situação', 'Previsão', 'Entregue em', 'Total'], ...app.db.lista('ordens').sort((x, y) => y.numero - x.numero).map((o) => [o.numero, o.entrada, pessoa(app, o.cliente)?.nome || '', o.equipamento, o.marca || '', { v: o.serie || '', t: 'texto' }, nomeT(o.tecnico), stOS(o.status)[1], o.previsao || '', o.entregue_em || '', m(totalOS(o))])] },
      { nome: 'Contratos', linhas: [['Cliente', 'Descrição', 'Mensalidade', 'Dia', 'Início', 'Fim', 'Visitas', 'Próxima visita', 'PMOC', 'Situação'], ...app.db.lista('contratos').map((c) => [pessoa(app, c.cliente)?.nome || '', c.descricao, m(c.valor), Number(c.dia) || '', c.inicio || '', c.fim || '', (VISITAS.find((v) => v[0] === String(c.visitas)) || VISITAS[0])[1], c.proxima || '', !!c.pmoc, ctrAtivo(c) ? 'Ativo' : c.status])] },
      { nome: 'Clientes e fornecedores', linhas: [['Nome', 'Tipo', 'CPF / CNPJ', 'Telefone', 'E-mail', 'Em aberto'], ...app.db.lista('pessoas').map((p) => [p.nome, p.tipo === 'fornecedor' ? 'Fornecedor' : 'Cliente', { v: p.doc || '', t: 'texto' }, { v: p.telefone || '', t: 'texto' }, p.email || '', m(soma(ab.filter((l) => l.pessoa === p.id), (l) => l.valor))])] },
      { nome: 'Estoque', linhas: [['Peça', 'Código', 'Custo', 'Venda', 'Estoque', 'Mínimo'], ...app.db.lista('produtos').map((p) => [p.nome, { v: p.codigo || '', t: 'texto' }, m(p.custo), m(p.preco), Number(p.estoque) || 0, Number(p.minimo) || 0])] },
    ];
    baixarXlsx(`${normal(app.empresa).replace(/[^a-z0-9]+/g, '-')}-financeiro-${hoje()}`, abas); avisar('Planilha do Excel baixada, com 11 abas');
  },
  contaConc: (d, el) => { app.estado.conc.conta = el.value; app.render(); },
  conciliar: (d) => { if (d.t) { const t = app.db.obter('transferencias', d.t), e = app.db.obter('extrato', d.e); app.db.salvar('transferencias', { id: t.id, conc: { ...(t.conc || {}), [e.conta]: e.id } }); app.db.salvar('extrato', { id: e.id, conciliado: `t:${t.id}` }); avisar('Conciliado com a transferência'); app.render(); return; } app.db.salvar('extrato', { id: d.e, conciliado: d.l }); const l = app.db.obter('lancamentos', d.l); const e = app.db.obter('extrato', d.e); app.db.salvar('lancamentos', { id: d.l, conciliado: true, status: 'pago', pago_em: l.pago_em || e.data }); avisar('Conciliado'); app.render(); },
  concTodos: () => { let n = 0; app.db.lista('extrato').filter((e) => e.conta === app.estado.conc.conta && !e.conciliado).forEach((e) => { const s = sugerir(app, e); if (s?.t) { app.db.salvar('transferencias', { id: s.t.id, conc: { ...(s.t.conc || {}), [e.conta]: e.id } }); app.db.salvar('extrato', { id: e.id, conciliado: `t:${s.t.id}` }); n++; } else if (s) { app.db.salvar('extrato', { id: e.id, conciliado: s.id }); app.db.salvar('lancamentos', { id: s.id, conciliado: true, status: 'pago', pago_em: s.pago_em || e.data }); n++; } }); avisar(`${n} lançamentos conciliados`); app.render(); },
  criarDoExtrato: async (d) => { const e = app.db.obter('extrato', d.e); const r = await editar(app, 'lancamentos', null, { tipo: e.valor > 0 ? 'receita' : 'despesa', descricao: e.descricao.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), valor: Math.abs(e.valor), vencimento: e.data, conta: e.conta, categoria: e.valor > 0 ? 'outras_r' : /tarifa/i.test(e.descricao) ? 'tarifas' : 'fornecedores' }); if (!r) return; app.db.salvar('lancamentos', { id: r.id, status: 'pago', pago_em: e.data, conciliado: true }); app.db.salvar('extrato', { id: e.id, conciliado: r.id }); app.render(); },
  importarExtrato: (d, el) => { const f = el.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const linhas = lerExtrato(String(rd.result)), ct = app.estado.conc.conta, ja = app.db.lista('extrato').filter((e) => e.conta === ct); let n = 0, rep = 0; for (const x of linhas) { if (ja.some((e) => (x.fitid && e.fitid === x.fitid) || (e.data === x.data && Math.abs(e.valor - x.valor) < 0.01 && e.descricao === x.descricao))) { rep++; continue; } ja.push(app.db.salvar('extrato', { conta: ct, ...x, conciliado: null })); n++; } el.value = ''; avisar(n ? `${n} linhas importadas do extrato${rep ? ` (${rep} já estavam aqui)` : ''}` : rep ? 'Essas linhas já estavam importadas' : 'Nenhuma linha reconhecida. Use o arquivo OFX do banco ou um CSV data;descrição;valor', { tipo: n || rep ? 'ok' : 'erro' }); app.render(); }; rd.readAsText(f, /\.ofx$/i.test(f.name) ? 'windows-1252' : 'utf-8'); },
  modoOS: (d) => { app.estado.os.modo = d.m; app.render(); },
  novaOS: async (d = {}) => { const o = await editar(app, 'ordens', null, { ...(d.tecnico || d.previsao || d.hora ? { tecnico: d.tecnico, previsao: d.previsao, hora: d.hora } : {}), ...(d.valores || {}) }); if (o) { app.db.registrar(`ordens:${o.id}`, 'OS aberta', { icone: 'plus' }); app.render(); app.abrir('os', o.id); const g = app.db.lista('ordens').find((x) => mesmoEquip(x, o) && garantiaAte(x) >= hoje()); if (g) avisar(`Este equipamento está na garantia da OS #${g.numero} até ${dataCurta(garantiaAte(g))}`, { tempo: 9000 }); } },
  editarOS: async (d) => { if (await editar(app, 'ordens', os(app, d.id))) reab(); },
  excluirOS: (d) => excluir(app, 'ordens', d.id),
  statusOS: (d) => { const o = os(app, d.id); if (d.s === 'entregue' && !o.faturada && totalOS(o) > 0) return app.acoes.faturarOS({ ...d, entregar: true }); app.kanbans.os ? app.kanbans.os(d.id, d.s) : app.db.salvar('ordens', { id: d.id, status: d.s }); if (!app.kanbans.os) avisar(`OS #${o.numero} → ${stOS(d.s)[1]}`); reab(); },
  addItemOS: async (d) => {
    const lista = d.t === 'peca' ? app.db.lista('produtos') : app.db.lista('servicos');
    const r = await modal({ titulo: d.t === 'peca' ? 'Adicionar peça' : 'Adicionar serviço', largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">${d.t === 'peca' ? 'Peça' : 'Serviço'}<select name="i">${lista.map((x, k) => `<option value="${k}">${esc(x.nome)} · ${moeda(x.preco)}${d.t === 'peca' ? ` · ${x.estoque} em estoque` : ''}</option>`).join('')}</select></label><label class="campo">Quantidade<input name="q" type="number" min="1" value="1"></label><label class="campo">Preço (opcional)<input name="p" type="number" min="0" step="0.01" placeholder="do cadastro"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const x = lista[Number(r.i)], o = os(app, d.id);
    if (d.t === 'peca' && x.estoque < Number(r.q)) avisar(`Atenção: só há ${x.estoque} em estoque`, { tipo: 'erro' });
    app.db.salvar('ordens', { id: d.id, itens: [...o.itens, { tipo: d.t === 'peca' ? 'peca' : 'servico', ref: x.id, descricao: x.nome, qtd: Number(r.q) || 1, preco: r.p ? Number(r.p) : x.preco, custo: x.custo }] }); reab();
  },
  tirarItemOS: (d) => { const o = os(app, d.id); app.db.salvar('ordens', { id: d.id, itens: o.itens.filter((_, k) => k !== Number(d.i)) }); reab(); },
  descOS: async (d) => { const o = os(app, d.id), bruto = soma(itensValendo(o), (x) => x.qtd * x.preco); const r = await modal({ titulo: `Desconto · total ${moeda(bruto)}`, largura: 380, corpo: `<div class="form-grade"><label class="campo">Desconto<input type="number" min="0" step="0.01" value="${o.desconto || 0}" data-v></label><label class="campo">Em<select data-u><option value="r">reais (R$)</option><option value="p">porcentagem (%)</option></select></label></div>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Aplicar', classe: 'pri', acao: (f) => { const v = Math.max(0, Number(f.querySelector('[data-v]').value) || 0); return Math.min(bruto, Math.round((f.querySelector('[data-u]').value === 'p' ? (bruto * Math.min(v, 100)) / 100 : v) * 100) / 100); } }] }); if (r == null) return; app.db.salvar('ordens', { id: d.id, desconto: r }); if (r) app.db.registrar(`ordens:${d.id}`, `Desconto de ${moeda(r)} (${pct((r / (bruto || 1)) * 100, 1)})`, { icone: 'percent' }); reab(); },
  salvarLaudo: (d) => { app.db.salvar('ordens', { id: d.id, laudo: document.querySelector('[data-laudo]').value }); avisar('Laudo salvo'); reab(); },
  faturarOS: async (d) => {
    const o = os(app, d.id), c = pessoa(app, o.cliente), t = totalOS(o);
    const r = await modal({ titulo: `Faturar OS #${o.numero} · ${moeda(t)}`, largura: 480, corpo: `${(() => { if (!temPro(app)) return ''; const s = scorePag(app, c.id); return s.nivel === 'ruim' || s.nivel === 'medio' ? `<div class="alerta-linha" style="margin-bottom:10px">${ic('gauge')}${esc(c.nome)}: ${esc(s.rot.toLowerCase())} (${esc(s.txt)}). ${s.nivel === 'ruim' ? 'Prefira receber na retirada, sem parcelar.' : 'Combine bem a data.'}</div>` : ''; })()}<form class="form-grade" onsubmit="return false"><label class="campo">Forma de pagamento<select name="f">${FORMAS.map((f) => `<option>${f}</option>`).join('')}</select></label><label class="campo">Parcelas<select name="n">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}x de ${moeda(t / n)}</option>`).join('')}</select></label><label class="campo">Conta<select name="c">${app.db.lista('contas').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label class="campo">1º vencimento<input type="date" name="v" value="${hoje()}"></label><label class="campo largo flex" style="flex-direction:row;align-items:center;gap:8px;color:var(--tx);font-weight:400"><input type="checkbox" name="pago" checked> Já recebido (a 1ª parcela)</label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Faturar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return { ...Object.fromEntries(new FormData(fm)), pago: fm.querySelector('[name=pago]').checked }; } }] });
    if (!r || os(app, d.id).faturada) return; const n = Number(r.n);
    for (let k = 0; k < n; k++) { const v = k ? diaMais(0, `${mesMais(k, r.v)}-${r.v.slice(8)}`) : r.v; const pago = r.pago && k === 0; app.db.salvar('lancamentos', { tipo: 'receita', descricao: `OS #${o.numero} · ${o.equipamento}${n > 1 ? ` · ${k + 1}/${n}` : ''}`, categoria: 'servicos', pessoa: c.id, conta: r.c, valor: Math.round((t / n) * 100) / 100, vencimento: v, status: pago ? 'pago' : 'aberto', pago_em: pago ? v : null, forma: r.f, os: o.id, conciliado: false }); }
    o.itens.filter((i) => i.tipo === 'peca').forEach((i) => { const p = app.db.obter('produtos', i.ref); if (p) app.db.salvar('produtos', { id: p.id, estoque: Math.max(0, p.estoque - i.qtd) }); });
    app.db.salvar('ordens', { id: d.id, faturada: true, ...(d.entregar ? { status: 'entregue', entregue_em: hoje() } : {}) }); app.db.registrar(`ordens:${d.id}`, `Faturada em ${n}x (${r.f})${d.entregar ? ' e entregue' : ''}`, { icone: 'currency-circle-dollar', tom: 'ok' });
    avisar(`OS #${o.numero} faturada: ${n} lançamento${n > 1 ? 's' : ''} em Contas a receber${d.entregar ? '' : '. Quando o cliente buscar, clique em Entregar'}`); reab();
  },
  imprimirOS: (d) => imprimir(docOS(app, os(app, d.id))),
  imprimirTermo: (d) => imprimir(docTermo(app, os(app, d.id))),
  imprimirContrato: (d) => imprimir(docContrato(app, app.db.obter('contratos', d.id))),
  aceiteContrato: async (d) => {
    if (!temPro(app)) return app.acoes.verPro();
    const c = app.db.obter('contratos', d.id), p = pessoa(app, c.cliente);
    if (c.aceite) { imprimir(docContrato(app, c)); return; }
    await app.portal.compartilhar('contrato', c.id, { titulo: 'Contrato para o cliente aceitar', telefone: p?.telefone || '', texto: `Olá, ${chamar(p)}! Segue o contrato de manutenção da ${app.empresa} (${moeda(c.valor)} por mês). Leia e aceite por este link:` });
    app.db.registrar(`contratos:${c.id}`, 'Contrato enviado para aceite', { icone: 'handshake' });
  },
  areaCliente: async (d) => {
    if (!temPro(app)) return app.acoes.verPro();
    const p = pessoa(app, d.id);
    await app.portal.compartilhar('cliente', p.id, { titulo: `Área do cliente · ${p.nome}`, telefone: p.telefone || '', texto: `Olá, ${chamar(p)}! Esta é a sua área na ${app.empresa}: acompanhe seus equipamentos, garantias e contratos, pague pelo PIX e peça visitas quando precisar. Guarde o link:`, qr: true });
  },
  linkVisita: async () => {
    if (!temPro(app)) return app.acoes.verPro();
    await app.portal.compartilhar('visita', 'empresa', { titulo: 'Link para pedir visita', texto: `Precisa de assistência técnica? Peça a sua visita pela ${app.empresa} por aqui:`, qr: true });
  },
  imprimirFechamento: () => { if (!temPro(app)) return app.acoes.verPro(); imprimir(docFechamento(app, app.estado.mesFech || mesMais(-1))); },
  mesFech: (d, el) => { app.estado.mesFech = el.value; },
  desempMes: (d, el) => { app.estado.desemp.ym = el.value; app.render(); },
  metaTec: async (d) => { const t = TEC.find((x) => x[0] === d.id), atual = Number((app.db.cfg.metas_tec || {})[d.id]) || 0; const r = await modal({ titulo: `Meta do mês · ${t?.[1] || ''}`, largura: 380, corpo: `<label class="campo">Faturamento esperado por mês<div class="prefixo"><span>R$</span><input type="number" min="0" step="500" value="${atual || ''}" data-v></div><span class="ajuda">Deixe vazio para tirar a meta</span></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar', classe: 'pri', acao: (f) => Math.max(0, Number(f.querySelector('[data-v]').value) || 0) }] }); if (r == null) return; app.db.cfg.metas_tec = { ...(app.db.cfg.metas_tec || {}), [d.id]: r }; app.db.gravar(); app.render(); },
  assinarOS: async (d) => {
    const o = os(app, d.id), c = pessoa(app, o.cliente);
    if (o.assinatura && !(await confirmar(`Já assinado por ${o.assinatura.nome}. Colher de novo?`, { rotulo: 'Colher de novo' }))) return;
    const r = await colherAssinatura(`Termo de entrega · OS #${o.numero}`, `${esc(c?.nome || 'O cliente')} confirma que recebeu ${esc(o.equipamento)} funcionando e concorda com a garantia de ${o.garantia || 90} dias.`, c?.nome || '');
    if (!r) return;
    app.db.salvar('ordens', { id: o.id, assinatura: r }); app.db.registrar(`ordens:${o.id}`, `${r.nome} assinou o termo de entrega`, { icone: 'pencil-simple', tom: 'ok' });
    if (o.status === 'pronta' && (o.faturada || totalOS(o) <= 0) && (await confirmar('Assinado. Marcar a OS como entregue agora?', { rotulo: 'Entregar' }))) app.acoes.statusOS({ id: o.id, s: 'entregue' });
    else { avisar('Assinatura guardada no termo de entrega'); reab(); }
  },
  pedirAvaliacao: async (d) => { const o = os(app, d.id), c = pessoa(app, o.cliente), link = temPro(app) ? await app.portal.link('nps', o.id) : ''; window.open(`${telLink(c?.telefone)}?text=${encodeURIComponent(textoLista('avl', o, link))}`, '_blank', 'noopener'); app.db.salvar('ordens', { id: o.id, avaliacao: hoje() }); reab(); },
  verLista: async (d) => {
    const l = d.l === 'orc' ? orcParados(app) : d.l === 'avl' ? paraAvaliar(app) : paraRetorno(app);
    const links = {}; if (d.l === 'orc' || (d.l === 'avl' && temPro(app))) for (const o of l) links[o.id] = await app.portal.link(d.l === 'orc' ? 'orcamento' : 'nps', o.id);
    const marca = { orc: 'orc_lembrete', avl: 'avaliacao', ret: 'retorno' }[d.l];
    modal({ titulo: { orc: 'Orçamentos esperando resposta', avl: 'Pedir avaliação no Google', ret: 'Chamar de volta para a manutenção' }[d.l], largura: 620,
      corpo: `<ul class="lista" style="margin:0 -20px">${l.map((o) => { const c = pessoa(app, o.cliente); return `<li><div class="cresce"><div class="t corta">${esc(c?.nome || '')}</div><div class="s corta">#${o.numero} · ${esc(o.equipamento)} · ${d.l === 'orc' ? `${moeda(totalOS(o))} · enviado ${dataCurta(o.orc_enviado || o.entrada)}` : `entregue ${dataCurta(o.entregue_em)}`}</div></div><button type="button" class="btn peq pri" data-zap="${o.id}">${ic('whatsapp-logo')}Mandar</button><button type="button" class="btn peq fant" data-pular="${o.id}">Pular</button></li>`; }).join('')}</ul>`,
      aoAbrir: (f) => { f.querySelectorAll('[data-zap],[data-pular]').forEach((b) => { b.onclick = () => { const id = b.dataset.zap || b.dataset.pular, o = os(app, id); if (b.dataset.zap) window.open(`${telLink(pessoa(app, o.cliente)?.telefone)}?text=${encodeURIComponent(textoLista(d.l, o, links[id]))}`, '_blank', 'noopener'); app.db.salvar('ordens', { id, [marca]: hoje() }); if (b.dataset.zap) app.db.registrar(`ordens:${id}`, { orc: 'Lembrete do orçamento enviado', avl: 'Pedido de avaliação enviado', ret: 'Chamado para a manutenção preventiva' }[d.l], { icone: 'whatsapp-logo' }); b.closest('li').style.opacity = '.45'; b.closest('li').querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.textContent = b.dataset.zap ? 'Enviado ✓' : 'Pulado'; app.render(); }; }); },
      botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }] });
  },
  reciboLanc: (d) => imprimir(docRecibo(app, app.db.obter('lancamentos', d.id))),
  reciboZap: (d) => { const l = app.db.obter('lancamentos', d.id), p = pessoa(app, l.pessoa); window.open(`${telLink(p?.telefone)}?text=${encodeURIComponent(`Olá, ${chamar(p)}! Confirmamos o recebimento de ${moeda(l.valor)} (${porExtenso(l.valor)}) em ${dataBR(l.pago_em || hoje())}, referente a ${l.descricao}. Obrigado!\n${app.empresa}${app.db.cfg.cnpj ? ` · CNPJ ${app.db.cfg.cnpj}` : ''}`)}`, '_blank', 'noopener'); app.db.registrar(`lancamentos:${l.id}`, 'Recibo enviado pelo WhatsApp', { icone: 'whatsapp-logo' }); },
  lancarDAS: () => { const ym = mesMais(-1), e = estimarDAS(app, ym); if (!(e.das > 0) || lancs(app).some((l) => l.das === ym)) return; const l = app.db.salvar('lancamentos', { tipo: 'despesa', descricao: `DAS Simples Nacional (${nomeMes(ym)}) · estimado`, categoria: CAT.impostos ? 'impostos' : (CATS.despesa.find((c) => c[2] === 'impostos') || CATS.despesa[0])[0], conta: garantirConta(app), valor: e.das, vencimento: diaDoMes(hoje().slice(0, 7), 20), status: 'aberto', forma: 'Boleto', das: ym, conciliado: false }); avisar(`DAS estimado de ${moeda(e.das)} lançado em contas a pagar (vence dia 20). Ajuste o valor quando o contador mandar a guia.`, { tempo: 8000 }); app.render(); app.abrir('lanc', l.id); },
  cfgAnexo: (d, el) => { app.db.cfg.simples = { ...regraSimples(app), anexo: el.value }; app.db.gravar(); app.render(); },
  cfgSimples: (d, el) => { const v = d.k === 'validade_orc' ? Math.min(120, Math.max(1, Number(el.value) || 15)) : String(el.value || '').trim(); if (d.k === 'avaliacao' && v && !/^https:\/\//i.test(v)) { avisar('O link precisa começar com https://', { tipo: 'erro' }); return; } app.db.cfg[d.k] = v; app.db.gravar(); avisar('Salvo'); },
  salvarNFSe: async () => {
    const f = document.querySelector('[data-nfse]'), v = Object.fromEntries(new FormData(f)); v.pecas = !!f.pecas.checked;
    const n = { ...(app.db.cfg.nfse || {}), padrao: v.padrao, cidade: v.cidade.trim(), uf: v.uf.trim().toUpperCase(), ibge: String(v.ibge || '').replace(/\D/g, ''), im: v.im.trim(), item: v.item.trim(), cnat: String(v.cnat || '').replace(/\D/g, ''), aliq: Number(v.aliq) || 0, simples: Number(v.simples) || 3, prox: Math.max(1, Number(v.prox) || 1), desc: v.desc.trim(), pecas: v.pecas };
    if (!/^\d{7}$/.test(n.ibge) && n.cidade && /^[A-Z]{2}$/.test(n.uf)) { try { const l = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${n.uf}`).then((r) => r.json()); const m = l.find((x) => normal(x.nome) === normal(n.cidade)); if (m) n.ibge = String(m.codigo_ibge); } catch { /* sem conexão: o dono digita o código */ } }
    try { if (app.nuvem && v.token?.trim()) await app.sessao.salvarSegredo('focus_token', v.token.trim()); if (app.nuvem && v.ambiente) await app.sessao.salvarSegredo('focus_ambiente', v.ambiente); } catch (e) { avisar(e.message, { tipo: 'erro' }); return; }
    app.db.cfg.nfse = n; app.db.gravar(); app.estado.nfe = null; app.estado.nfeCarregando = false;
    avisar(/^\d{7}$/.test(n.ibge) ? 'Nota de serviço configurada' : 'Salvo. Falta o código IBGE do município (confira a cidade e a UF)', { tipo: /^\d{7}$/.test(n.ibge) ? 'ok' : 'erro' }); app.render();
  },
  desligarNFSe: async () => { if (!(await confirmar('Desligar a emissão de notas? O token da Focus é apagado do cofre (vale também para a NF-e).', { rotulo: 'Desligar', perigo: true }))) return; await app.sessao.salvarSegredo('focus_token', ''); app.estado.nfe = null; app.estado.nfeCarregando = false; app.render(); },
  emitirNFSe: async (d) => {
    const o = os(app, d.id), c = pessoa(app, o.cliente), cfg = app.db.cfg, n = { padrao: 'nacional', item: '14.01', cnat: '140101', aliq: 3, simples: 3, pecas: false, ...(cfg.nfse || {}) };
    if (app.estado.emitindo) return;
    const todos = itensValendo(o), serv = todos.filter((i) => n.pecas || i.tipo === 'servico'), bruto = soma(todos, (i) => i.qtd * i.preco), base = soma(serv, (i) => i.qtd * i.preco);
    const valor = Math.round((base - (o.desconto || 0) * (bruto ? base / bruto : 0)) * 100) / 100;
    if (valor <= 0) { avisar('Esta OS não tem serviço cobrado: não precisa de nota de serviço', { tipo: 'erro' }); return; }
    const so = (s) => String(s || '').replace(/\D/g, ''), cnpj = so(cfg.cnpj), doc = so(c?.doc), faltas = [];
    if (cnpj.length !== 14) faltas.push('o CNPJ da empresa (Configurações › Empresa)');
    if (!/^\d{7}$/.test(String(n.ibge || ''))) faltas.push('o código IBGE do município (Configurações › Nota de serviço)');
    if (n.padrao === 'municipal' && !n.im) faltas.push('a inscrição municipal');
    if (doc && ![11, 14].includes(doc.length)) faltas.push(`o CPF ou CNPJ de ${c?.nome || 'cliente'}`);
    if (faltas.length) { avisar(`Para emitir a nota falta ${faltas.join(', ')}`, { tipo: 'erro', tempo: 9000 }); return; }
    const descricao = `${n.desc || 'Serviço de manutenção e reparo'} · OS ${o.numero} · ${o.equipamento}${o.serie ? ` (série ${o.serie})` : ''}: ${serv.map((i) => `${i.descricao}${i.qtd > 1 ? ` x${i.qtd}` : ''}`).join('; ')}`.slice(0, 1900);
    if (!(await confirmar(`Emitir a nota de serviço de ${moeda(valor)} para ${c?.nome || 'o cliente'}${app.nuvem && app.estado.nfe?.ambiente === 'producao' ? ' (produção: vale de verdade)' : ''}?`, { rotulo: 'Emitir' }))) return;
    if (!app.nuvem) { const numero = String(Math.max(0, ...app.db.lista('ordens').map((x) => Number(x.nfse?.numero) || 0), 230) + 1); app.db.salvar('ordens', { id: o.id, nfse: { status: 'autorizado', numero, simulada: true, emissao: hoje(), valor, descricao } }); app.db.registrar(`ordens:${o.id}`, `Nota de serviço nº ${numero} (simulada)`, { icone: 'receipt', tom: 'ok' }); avisar(`Nota de serviço nº ${numero} simulada. Na versão contratada ela vai para a prefeitura pela Focus NFe.`, { tempo: 7000 }); reab(); return; }
    const nacional = n.padrao !== 'municipal', tent = (o.nfse?.tentativa || 0), ref = `${app.sessao.espaco.id.slice(0, 8)}-os${o.numero}${tent ? `-${tent}` : ''}`, numDps = Math.max(1, Number(n.prox) || 1);
    const corpo = nacional
      ? { data_emissao: new Date().toISOString(), data_competencia: hoje(), serie_dps: 1, numero_dps: numDps, emitente_dps: 1, codigo_municipio_emissora: Number(n.ibge), cnpj_prestador: cnpj, codigo_opcao_simples_nacional: Number(n.simples) || 3, regime_especial_tributacao: 0,
        ...(doc.length === 14 ? { cnpj_tomador: doc } : doc.length === 11 ? { cpf_tomador: doc } : {}), ...(c?.nome ? { razao_social_tomador: c.nome } : {}), ...(c?.email ? { email_tomador: c.email } : {}),
        codigo_municipio_prestacao: Number(n.ibge), codigo_tributacao_nacional_iss: n.cnat || '140101', descricao_servico: descricao, valor_servico: valor, tributacao_iss: 1 }
      : { data_emissao: new Date().toISOString(), natureza_operacao: '1', optante_simples_nacional: Number(n.simples) !== 1, prestador: { cnpj, inscricao_municipal: n.im, codigo_municipio: n.ibge },
        tomador: { ...(doc.length === 14 ? { cnpj: doc } : doc.length === 11 ? { cpf: doc } : {}), razao_social: c?.nome || 'Consumidor', ...(c?.email ? { email: c.email } : {}), ...(c?.endereco ? { endereco: { logradouro: c.endereco, bairro: c.bairro || '', uf: c.uf || '', cep: so(c.cep) } } : {}) },
        servico: { valor_servicos: valor, iss_retido: false, item_lista_servico: String(n.item || '14.01').replace(/\D/g, ''), discriminacao: descricao, codigo_municipio: n.ibge, aliquota: Number(n.aliq) || 0 } };
    app.estado.emitindo = true; avisar('Enviando a nota de serviço…', { tempo: 4000 });
    let r;
    try {
      r = await app.sessao.funcao('nexo-nfe', { acao: 'emitir', modelo: nacional ? 'nfsen' : 'nfse', ref, nfe: corpo });
      for (let i = 0; i < 20 && /processando/.test(r.status || ''); i++) { await new Promise((ok) => setTimeout(ok, 3000)); r = await app.sessao.funcao('nexo-nfe', { acao: 'consultar', modelo: nacional ? 'nfsen' : 'nfse', ref }); }
    } catch (e) { r = { status: 'erro', mensagem: e.message }; } finally { app.estado.emitindo = false; }
    if (r.status !== 'autorizado') {
      const msg = (r.erros || []).map((e) => e.mensagem).join('; ') || r.mensagem || r.status || 'erro';
      app.db.salvar('ordens', { id: o.id, nfse: { status: /processando/.test(r.status || '') ? 'processando' : 'erro', erro: msg.slice(0, 300), ref, modelo: nacional ? 'nfsen' : 'nfse', tentativa: /processando/.test(r.status || '') ? tent : tent + 1 } });
      app.db.registrar(`ordens:${o.id}`, `Nota de serviço não autorizada: ${msg.slice(0, 200)}`, { icone: 'warning', tom: 'er' });
      avisar(/processando/.test(r.status || '') ? 'A prefeitura ainda está processando. Clique de novo em alguns minutos para consultar.' : `Nota não autorizada: ${msg}`, { tipo: 'erro', tempo: 12000 }); reab(); return;
    }
    if (nacional) { app.db.cfg.nfse = { ...n, prox: numDps + 1 }; app.db.gravar(); }
    app.db.salvar('ordens', { id: o.id, nfse: { status: 'autorizado', numero: String(r.numero || ''), url: r.url || '', pdf: r.url_danfse || '', xml: r.caminho_xml_nota_fiscal || '', codigo: r.codigo_verificacao || '', ref, modelo: nacional ? 'nfsen' : 'nfse', ambiente: r.ambiente, emissao: hoje(), valor } });
    app.db.registrar(`ordens:${o.id}`, `Nota de serviço nº ${r.numero} autorizada${r.ambiente === 'homologacao' ? ' (homologação)' : ''}`, { icone: 'seal-check', tom: 'ok' });
    avisar(`Nota de serviço nº ${r.numero} autorizada`); reab();
  },
  verNFSe: (d, el) => { const o = os(app, d.id), nf = o.nfse || {}; pop(el, [
    nf.simulada ? { rotulo: 'Ver a nota (simulada)', icone: 'receipt', acao: () => imprimir(`<div class="doc"><div style="border:2px solid #111;padding:10px;text-align:center;font-weight:700;margin-bottom:10px">NOTA DE SERVIÇO SIMULADA · DEMONSTRAÇÃO · SEM VALOR FISCAL</div><h1>NFS-e nº ${esc(nf.numero)}</h1><p>Prestador: ${esc(app.empresa)} · CNPJ ${esc(app.db.cfg.cnpj || '')}</p><p>Tomador: ${esc(pessoa(app, o.cliente)?.nome || '')} · ${esc(pessoa(app, o.cliente)?.doc || '')}</p><h2>Serviço</h2><p>${esc(nf.descricao || '')}</p><p><b>Valor: ${moeda(nf.valor)}</b> · emitida em ${dataBR(nf.emissao)}</p></div>`) } : { rotulo: 'Abrir a nota (PDF)', icone: 'receipt', acao: () => window.open(nf.pdf || nf.url, '_blank', 'noopener') },
    nf.url && !nf.simulada ? { rotulo: 'Consultar no portal', icone: 'arrow-square-out', acao: () => window.open(nf.url, '_blank', 'noopener') } : null,
    { sep: true }, { rotulo: 'Cancelar a nota', icone: 'x-circle', perigo: true, acao: async () => { if (!(await confirmar(`Cancelar a nota de serviço nº ${nf.numero}?`, { rotulo: 'Cancelar a nota', perigo: true }))) return; if (!nf.simulada) { try { const r = await app.sessao.funcao('nexo-nfe', { acao: 'cancelar', modelo: nf.modelo || 'nfsen', ref: nf.ref, justificativa: 'Cancelamento solicitado pelo prestador' }); if (r.status && r.status !== 'cancelado') { avisar(`A prefeitura não cancelou: ${(r.erros || []).map((e) => e.mensagem).join('; ') || r.mensagem || r.status}`, { tipo: 'erro', tempo: 10000 }); return; } } catch (e) { avisar(e.message, { tipo: 'erro' }); return; } } app.db.salvar('ordens', { id: o.id, nfse: { ...nf, status: 'cancelado', tentativa: (nf.tentativa || 0) + 1 } }); app.db.registrar(`ordens:${o.id}`, `Nota de serviço nº ${nf.numero} cancelada`, { icone: 'x-circle', tom: 'er' }); reab(); } },
  ].filter(Boolean)); },
  agNav: (d) => { const st = app.estado.ag; st.data = Number(d.d) === 0 ? hoje() : diaMais(Number(d.d) * (st.modo === 'semana' ? 7 : 1), st.data); app.render(); },
  agModo: (d) => { app.estado.ag.modo = d.m; app.render(); },
  agData: (d, el) => { if (el.value) { app.estado.ag.data = el.value; app.render(); } },
  agTec: (d, el) => { app.estado.ag.tec = el.value; app.render(); },
  campoTec: (d, el) => { app.estado.campoTec = el.value; try { localStorage.setItem(`nexo-fin-tecnico-${app.empresa}`, el.value); } catch { /* sem armazenamento */ } app.render(); },
  campoCheck: (d, el) => { const o = os(app, d.id), x = CHECK_SAIDA[Number(d.k)]; const s = new Set(o.saida || []); el.checked ? s.add(x) : s.delete(x); app.db.salvar('ordens', { id: o.id, saida: [...s] }); },
  campoIniciar: (d) => { const o = os(app, d.id); app.db.salvar('ordens', { id: o.id, status: 'execucao', ...(o.aprovada_em ? {} : { aprovada_em: hoje() }) }); app.db.registrar(`ordens:${o.id}`, `${nomeT(o.tecnico)} chegou e iniciou o serviço às ${new Date().toTimeString().slice(0, 5)}`, { icone: 'play', tom: 'acc' }); avisar(`OS #${o.numero} em execução`); app.render(); },
  campoLaudo: async (d) => { const o = os(app, d.id); const r = await modal({ titulo: `Laudo · OS #${o.numero}`, largura: 520, corpo: `<label class="campo">O que foi feito, peças trocadas, medições<textarea data-v rows="7" style="min-height:160px">${esc(o.laudo || '')}</textarea></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Salvar laudo', classe: 'pri', acao: (f) => f.querySelector('[data-v]').value }] }); if (r == null) return; app.db.salvar('ordens', { id: o.id, laudo: r }); avisar('Laudo salvo'); app.render(); },
  campoConcluir: async (d) => { const o = os(app, d.id); if (!o.laudo && !(await confirmar('Concluir sem escrever o laudo?', { rotulo: 'Concluir mesmo assim' }))) return; const falta = CHECK_SAIDA.filter((x) => !(o.saida || []).includes(x)); if (falta.length && !(await confirmar(`Falta marcar: ${falta.join(', ')}. Concluir assim?`, { rotulo: 'Concluir' }))) return; app.db.salvar('ordens', { id: o.id, status: 'pronta' }); app.db.registrar(`ordens:${o.id}`, `${nomeT(o.tecnico)} concluiu o serviço`, { icone: 'seal-check', tom: 'ok' }); avisar(`OS #${o.numero} pronta. Agora colha a assinatura do cliente.`); app.render(); },
  orcamentoLink: async (d) => {
    const o = os(app, d.id), c = pessoa(app, o.cliente);
    const texto = o.status === 'orcamento' ? `Olá, ${chamar(c)}! Aqui é da ${app.empresa}. O orçamento da OS #${o.numero} (${o.equipamento}) deu ${moeda(totalOS(o))}. Você pode ver e aprovar cada item por este link:` : o.status === 'pronta' ? `Olá, ${chamar(c)}! O seu ${o.equipamento} está pronto (OS #${o.numero}). Por este link você vê o que foi feito e a garantia, e assina a retirada:` : `Olá, ${chamar(c)}! Acompanhe por este link o andamento do seu ${o.equipamento} (OS #${o.numero}):`;
    await app.portal.compartilhar('orcamento', o.id, { titulo: o.status === 'orcamento' ? 'Orçamento para o cliente aprovar' : 'Link para o cliente acompanhar', telefone: c?.telefone || '', texto });
    if (o.status === 'orcamento') app.db.salvar('ordens', { id: o.id, orc_enviado: hoje() });
    app.db.registrar(`ordens:${o.id}`, o.status === 'orcamento' ? 'Orçamento enviado pelo link' : 'Link de acompanhamento enviado', { icone: 'whatsapp-logo' });
  },
  transferir: async (d = {}) => { const t = await editar(app, 'transferencias', null, { de: d.de, para: d.para, valor: d.valor, data: d.data, obs: d.obs }); if (!t) return null; avisar(`Transferência de ${moeda(t.valor)}: ${conta(app, t.de)?.nome} → ${conta(app, t.para)?.nome}`); app.render(); return t; },
  pagarFatura: (d) => { const c = conta(app, d.id); const banco = app.db.lista('contas').find((x) => !ehCartao(x)); return app.acoes.transferir({ de: banco?.id, para: c.id, valor: Math.round(-saldoConta(app, c.id) * 100) / 100, obs: `Pagamento da fatura · ${c.nome}` }); },
  verTransf: () => { const l = [...transfs(app)].sort((x, y) => y.data.localeCompare(x.data)).slice(0, 40); modal({ titulo: 'Transferências entre contas', largura: 600, corpo: l.length ? `<ul class="lista" style="margin:0 -20px">${l.map((t) => `<li><span class="av p" style="background:var(--acc)">${ic('arrows-left-right', 'p')}</span><div class="cresce"><div class="t corta">${esc(conta(app, t.de)?.nome || '—')} → ${esc(conta(app, t.para)?.nome || '—')}</div><div class="s">${dataCurta(t.data)}${t.obs ? ` · ${esc(t.obs)}` : ''}</div></div><b class="num">${moeda(t.valor)}</b><button type="button" class="btn fant peq ic-so" data-apagar-t="${t.id}" aria-label="Excluir">${ic('trash')}</button></li>`).join('')}</ul>` : vazio('arrows-left-right', 'Nenhuma transferência ainda'),
    aoAbrir: (f) => f.querySelectorAll('[data-apagar-t]').forEach((b) => { b.onclick = () => { const id = b.dataset.apagarT, ext = app.db.lista('extrato').filter((e) => e.conciliado === `t:${id}`); ext.forEach((e) => app.db.salvar('extrato', { id: e.id, conciliado: null })); const r = app.db.apagar('transferencias', id); b.closest('li').remove(); app.render(); avisar('Transferência excluída', { desfazer: () => { app.db.restaurar('transferencias', r); ext.forEach((e) => app.db.salvar('extrato', { id: e.id, conciliado: `t:${id}` })); app.render(); } }); }; }),
    botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, { rotulo: 'Nova transferência', classe: 'pri', acao: () => { setTimeout(() => app.acoes.transferir({}), 50); return true; } }] }); },
  transfDoExtrato: async (d) => { const e = app.db.obter('extrato', d.e); const t = await app.acoes.transferir(e.valor > 0 ? { para: e.conta, valor: Math.abs(e.valor), data: e.data, obs: e.descricao.toLowerCase() } : { de: e.conta, valor: Math.abs(e.valor), data: e.data, obs: e.descricao.toLowerCase() }); if (!t) return; app.db.salvar('transferencias', { id: t.id, conc: { [e.conta]: e.id } }); app.db.salvar('extrato', { id: e.id, conciliado: `t:${t.id}` }); app.render(); },
  gerarCobrancas: () => { const ym = hoje().slice(0, 7), l = cobrancasFaltando(app, ym); l.forEach((c) => cobrarContrato(c, ym)); avisar(`${l.length} ${l.length === 1 ? 'cobrança criada' : 'cobranças criadas'} em Contas a receber`); app.render(); },
  cobrancaContrato: (d) => { const c = app.db.obter('contratos', d.id); cobrarContrato(c, hoje().slice(0, 7)); avisar('Cobrança do mês criada'); reab(); },
  abrirVisitas: () => { const l = visitasProximas(app); l.forEach((c) => abrirVisita(c)); avisar(`${l.length} ${l.length === 1 ? 'OS aberta' : 'OS abertas'} para as visitas preventivas`); app.render(); },
  visitaContrato: (d) => { const o = abrirVisita(app.db.obter('contratos', d.id)); app.render(); app.abrir('os', o.id); },
  reajustarContrato: async (d) => { const c = app.db.obter('contratos', d.id), p = Number(c.reajuste || 0); if (!p) { avisar('Informe o percentual de reajuste no contrato (Editar)', { tipo: 'erro' }); return; } const novo = Math.round(c.valor * (1 + p / 100) * 100) / 100; if (!(await confirmar(`Reajustar de ${moeda(c.valor)} para ${moeda(novo)} (${p}%)? As cobranças em aberto a partir de hoje também mudam.`, { rotulo: 'Reajustar' }))) return; app.db.salvar('contratos', { id: c.id, valor: novo }); lancs(app).filter((l) => l.contrato === c.id && l.status === 'aberto' && l.vencimento >= hoje()).forEach((l) => app.db.salvar('lancamentos', { id: l.id, valor: novo })); app.db.registrar(`contratos:${c.id}`, `Reajuste de ${p}%: ${moeda(c.valor)} → ${moeda(novo)}`, { icone: 'trend-up' }); avisar(`Contrato reajustado para ${moeda(novo)}`); reab(); },
  renovarContrato: (d) => { const c = app.db.obter('contratos', d.id), base = c.fim && c.fim > hoje() ? c.fim : hoje(); const fim = diaMais(0, `${mesMais(12, base)}-${base.slice(8)}`); app.db.salvar('contratos', { id: c.id, fim, status: 'ativo' }); app.db.registrar(`contratos:${c.id}`, `Renovado até ${dataBR(fim)}`, { icone: 'arrows-clockwise' }); avisar(`Contrato renovado até ${dataBR(fim)}`); reab(); },
  imprimirPMOC: (d) => imprimir(docPMOC(app, app.db.obter('contratos', d.id))),
  excluirContrato: (d) => excluir(app, 'contratos', d.id),
  pagarComissao: (d) => { const ym = mesMais(-1), x = comissoesMes(app, ym).find((y) => y.id === d.id); if (!x?.valor || x.lanc) return; app.db.salvar('lancamentos', { tipo: 'despesa', descricao: `Comissão de ${x.n} · ${nomeMes(ym)}`, categoria: CAT.salarios ? 'salarios' : (CATS.despesa.find((c) => c[2] === 'pessoal') || CATS.despesa[0])[0], conta: garantirConta(app), valor: x.valor, vencimento: diaDoMes(hoje().slice(0, 7), 5) < hoje() ? hoje() : diaDoMes(hoje().slice(0, 7), 5), status: 'aberto', forma: 'PIX', comissao: `${x.id}:${ym}`, conciliado: false }); avisar(`Comissão de ${x.n} lançada em Contas a pagar`); app.render(); },
  mesContador: (d, el) => { app.estado.mesCont = el.value; },
  pacoteContador: () => {
    const ym = app.estado.mesCont || mesMais(-1), cel = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }, n2 = (v) => Number(v || 0).toFixed(2).replace('.', ',');
    const ls = lancs(app).filter((l) => l.vencimento.startsWith(ym) || (l.pago_em || '').startsWith(ym)).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const linhasL = ls.map((l) => { const p = pessoa(app, l.pessoa), g = CAT[l.categoria]?.grupo; return [dataBR(l.vencimento), l.pago_em ? dataBR(l.pago_em) : '', l.tipo === 'receita' ? 'Receita' : 'Despesa', l.descricao, CAT[l.categoria]?.nome || '', g === 'receita' ? 'Receita bruta' : nomeGrupo(g), p?.nome || '', p?.doc || '', conta(app, l.conta)?.nome || '', l.forma || '', n2(sinal(l) * l.valor), l.status === 'pago' ? (l.tipo === 'receita' ? 'Recebido' : 'Pago') : vencido(l) ? 'Vencido' : 'Em aberto', l.os ? `OS #${os(app, l.os)?.numero || ''}` : '']; });
    const linhasT = transfs(app).filter((t) => t.data.startsWith(ym)).map((t) => [dataBR(t.data), dataBR(t.data), 'Transferência', t.obs || 'Transferência entre contas', '', '', '', '', `${conta(app, t.de)?.nome || ''} → ${conta(app, t.para)?.nome || ''}`, '', n2(t.valor), 'Feita', '']);
    const cab = ['Vencimento (competência)', 'Pago em', 'Tipo', 'Descrição', 'Categoria', 'Linha do DRE', 'Cliente / fornecedor', 'CPF / CNPJ', 'Conta', 'Forma', 'Valor', 'Situação', 'Referência'];
    const xl = (r) => r.map((v, i) => (i === 10 ? { v: Number(String(v).replace(',', '.')), t: 'moeda' } : (i === 0 || i === 1) && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v.split('/').reverse().join('-') : i === 7 ? { v, t: 'texto' } : v));
    baixarXlsx(`contador-${ym}-${normal(app.empresa).replace(/[^a-z0-9]+/g, '-')}`, [{ nome: `Lançamentos ${ym}`, linhas: [cab, ...linhasL.map(xl)] }, { nome: 'Transferências', linhas: [cab, ...linhasT.map(xl)] }]); void cel;
    avisar(`Planilha de ${nomeMes(ym, true)} baixada: ${ls.length} lançamentos e ${linhasT.length} transferências`);
  },
  cfgAtraso: (d, el) => { const lim = d.k === 'multa' ? 20 : 10; app.db.cfg.atraso = { ...regraAtraso(app), [d.k]: Math.min(lim, Math.max(0, Number(el.value) || 0)) }; app.db.gravar(); avisar('Multa e juros salvos'); },
  abaEst: (d) => { app.estado.est.aba = d.a; app.render(); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarConta: async (d) => { if (await editar(app, 'contas', app.db.obter('contas', d.id))) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
  entradaEst: async (d) => { const p = app.db.obter('produtos', d.id); const r = await modal({ titulo: `Entrada de estoque · ${p.nome}`, largura: 420, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo">Quantidade<input type="number" min="1" name="q" value="5"></label><label class="campo">Custo unitário<input type="number" step="0.01" name="c" value="${p.custo}"></label><label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="l" checked> Lançar em Contas a pagar</label>
      <label class="campo">Fornecedor<select name="p"><option value="">—</option>${app.db.lista('pessoas').filter((x) => x.tipo === 'fornecedor').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label class="campo">Vencimento<input type="date" name="v" value="${diaMais(28)}"></label>
      <label class="campo">Conta<select name="ct">${app.db.lista('contas').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label class="campo">Forma<select name="fm">${FORMAS.map((x) => `<option ${x === 'Boleto' ? 'selected' : ''}>${x}</option>`).join('')}</select></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); const q = Number(fm.q.value); if (!(q > 0)) { fm.q.focus(); return false; } return { q, c: Number(fm.c.value) || 0, l: fm.l.checked, p: fm.p.value || null, v: fm.v.value || diaMais(28), ct: fm.ct.value, fm: fm.fm.value }; } }] }); if (!r) return; app.db.salvar('produtos', { id: d.id, estoque: p.estoque + r.q, custo: r.c }); if (r.l) { const cartao = ehCartao(conta(app, r.ct)); app.db.salvar('lancamentos', { tipo: 'despesa', descricao: `Compra: ${r.q}× ${p.nome}`, categoria: CAT.fornecedores ? 'fornecedores' : (CATS.despesa.find((x) => x[2] === 'custo') || CATS.despesa[0])[0], pessoa: r.p, conta: r.ct, valor: Math.round(r.q * r.c * 100) / 100, vencimento: cartao ? hoje() : r.v, status: cartao ? 'pago' : 'aberto', pago_em: cartao ? hoje() : null, forma: r.fm, conciliado: false }); } avisar(`+${r.q} ${p.nome}`); app.render(); },
});

// preenchimento automático (texto colado, foto): lançamento e OS passam pelo fluxo próprio (parcelas, garantia)
app.criarCom = { lancamentos: (v) => app.acoes.novoLanc({ t: v.tipo || 'despesa', valores: v }), ordens: (v) => app.acoes.novaOS({ valores: v }) };
// na demonstração não há assinatura: o convite do Pro mostra o que ele inclui e leva aos planos do site
if (!app.acoes.verPro) app.acoes.verPro = () => modal({ titulo: 'Veltria Financeiro Pro', largura: 560, corpo: `<div class="col" style="gap:10px">${BENEFICIOS_FIN.map(([i, t, d]) => `<div class="dica">${ic(i)}<span><b>${esc(t)}.</b> ${esc(d)}</span></div>`).join('')}<p class="mute-2" style="font-size:13px">Também no Pro: equipe sem limite, avisos e mensagens prontas no WhatsApp, histórico da equipe, impressos só com a sua marca e até 10 empresas. R$ 169 por mês, ou R$ 1.622 por ano.</p></div>`, botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, { rotulo: 'Ver os planos', classe: 'pri', acao: () => { window.open('../../../veltria-financeiro.html#precos', '_blank', 'noopener'); return true; } }] });
// ferramentas no menu da esquerda (WhatsApp e copiar); avisos e mensagens prontas: plano Pro
equipeViva(app, EQUIPE);
Object.assign(app.acoes, acoesLado());
app.travarLado = travarPro;

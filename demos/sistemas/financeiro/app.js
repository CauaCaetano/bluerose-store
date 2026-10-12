// Nexo Financeiro · financeiro e ordens de serviço (referências: Omie, Conta Azul, GestãoClick)
import {
  criarApp, esc, moeda, moedaC, num, pct, hoje, agoraISO, diaMais, mesMais, nomeMes, dataCurta, dataBR, relativo, diasAte, diasEntre, paraData,
  sorteio, soma, agrupar, av, ic, et, prog, telLink, kpis, barras, linhas, rosca, barrasH, kanban, DIAS, normal, baixar,
  modal, confirmar, avisar, editar, excluir, ficha, props, linhaDoTempo, vazio, pop, imprimir, fecharGaveta,
} from '../base/nexo.js';

const TEC = [['diego', 'Diego Araújo', 30], ['renan', 'Renan Souza', 30], ['paulo', 'Paulo Henrique', 25]];
const nomeT = (id) => (TEC.find((x) => x[0] === id) || [, '—'])[1];
const STATUS_OS = [['orcamento', 'Orçamento', '#94a3b8'], ['aprovada', 'Aprovada', '#3b82f6'], ['execucao', 'Em execução', '#f59e0b'], ['aguardando', 'Aguardando peça', '#a855f7'], ['pronta', 'Pronta p/ retirada', '#16a34a'], ['entregue', 'Entregue', '#64748b']];
const stOS = (id) => STATUS_OS.find((x) => x[0] === id) || STATUS_OS[0];
const FORMAS = ['PIX', 'Boleto', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência'];
const CATS = {
  receita: [['servicos', 'Serviços prestados', 'receita'], ['pecas', 'Venda de peças', 'receita'], ['contratos', 'Contratos de manutenção', 'receita'], ['outras_r', 'Outras receitas', 'receita']],
  despesa: [['fornecedores', 'Peças e materiais', 'custo'], ['salarios', 'Salários e encargos', 'pessoal'], ['prolabore', 'Pró-labore', 'pessoal'], ['aluguel', 'Aluguel', 'operacional'], ['energia', 'Energia e água', 'operacional'], ['internet', 'Internet e telefone', 'operacional'], ['combustivel', 'Combustível e veículos', 'operacional'], ['marketing', 'Marketing', 'operacional'], ['contador', 'Contabilidade', 'operacional'], ['tarifas', 'Tarifas bancárias', 'financeiro'], ['impostos', 'Impostos (Simples)', 'impostos']],
};
const CAT = Object.fromEntries([...CATS.receita, ...CATS.despesa].map(([id, n, g]) => [id, { nome: n, grupo: g }]));
const COR_CAT = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b', '#22a06b', '#f97316', '#0891b2', '#a3a3a3'];

// ---------------------------------------------------------------- dados de exemplo (fictícios)
function semente() {
  const r = sorteio(20261011), esc1 = (l) => l[Math.floor(r() * l.length)], ent = (a, b) => a + Math.floor(r() * (b - a + 1));
  const contas = [['Banco Inter', 'bank', 21500], ['Mercado Pago', 'wallet', 4200], ['Caixa da loja', 'money', 800]].map(([nome, icone, saldo_inicial], i) => ({ id: `ct${i}`, nome, icone, saldo_inicial }));
  const clientesN = ['Restaurante Sabor da Serra', 'Hotel Bela Vista', 'Mercado Bom Preço', 'Padaria Trigo Bom', 'Clínica Vida Plena', 'Escola Pequeno Saber', 'Academia Corpo em Forma', 'Carlos Henrique Dutra', 'Marta Lúcia Andrade', 'Paulo Sérgio Ramos', 'Ana Beatriz Costa', 'Fernando Lima', 'Sorveteria Gelato', 'Açougue Bom Corte', 'Farmácia Popular Centro'];
  const fornecedoresN = ['Eletropeças Centro', 'Distribuidora Frio Sul', 'Gás Refrigerante BR', 'Imobiliária Ponto Certo', 'Cemig', 'Vivo Empresas', 'Posto Avenida', 'Contábil Exata', 'Meta Ads'];
  const pessoas = [...clientesN.map((nome, i) => ({ id: `cli${i}`, nome, tipo: 'cliente', doc: i < 7 || i > 11 ? `${11 + i}.${200 + i}.${300 + i}/0001-${10 + i}` : `${100 + i}.${200 + i}.${300 + i}-${10 + i}`, telefone: `(48) 9${8300 + i * 21}-${1400 + i * 33}`, email: `${normal(nome.split(' ')[0])}@email.com` })),
    ...fornecedoresN.map((nome, i) => ({ id: `for${i}`, nome, tipo: 'fornecedor', doc: `${30 + i}.${400 + i}.${500 + i}/0001-${20 + i}`, telefone: `(48) 3${300 + i * 9}-${2000 + i * 13}`, email: '' }))];
  const produtos = [['Capacitor 35+5 µF', 'CAP-355', 18, 45, 22, 8], ['Gás R-410A (kg)', 'GAS-410', 62, 140, 9, 6], ['Gás R-22 (kg)', 'GAS-22', 85, 180, 3, 4], ['Compressor rotativo 12.000 BTU', 'CMP-12K', 780, 1450, 2, 1], ['Placa eletrônica universal', 'PLC-UNI', 120, 290, 4, 2], ['Motor ventilador condensadora', 'MOT-VC', 160, 340, 3, 2], ['Termostato digital', 'TRM-DG', 45, 110, 11, 4], ['Filtro secador', 'FLT-SC', 12, 35, 30, 10], ['Sensor de temperatura', 'SNS-TP', 9, 38, 1, 5], ['Kit instalação (tubulação 3 m)', 'KIT-3M', 95, 220, 7, 3]]
    .map(([nome, codigo, custo, preco, estoque, minimo], i) => ({ id: `pc${i}`, nome, codigo, custo, preco, estoque, minimo }));
  const servicos = [['Visita técnica e diagnóstico', 150], ['Limpeza e higienização de split', 260], ['Carga de gás', 240], ['Troca de compressor (mão de obra)', 950], ['Instalação de ar-condicionado', 720], ['Manutenção de câmara fria', 980], ['Reparo de placa eletrônica', 420], ['Manutenção preventiva (contrato)', 0]].map(([nome, preco], i) => ({ id: `sv${i}`, nome, preco }));
  const lanc = [];
  const add = (o) => lanc.push({ id: `l${lanc.length}`, conciliado: o.status === 'pago' && r() < 0.85, ...o });
  // despesas recorrentes: 6 meses para trás e 2 para frente
  for (let m = -6; m <= 2; m++) {
    const ym = mesMais(m), venc = (d) => `${ym}-${String(d).padStart(2, '0')}`;
    const fixas = [['Aluguel do galpão', 'aluguel', 'for3', 3200, 5], ['Salários (3 técnicos)', 'salarios', null, 8400, 5], ['Pró-labore', 'prolabore', null, 5000, 5], ['Energia elétrica', 'energia', 'for4', ent(780, 1100), 12], ['Internet e celulares', 'internet', 'for5', 389, 15], ['Contabilidade', 'contador', 'for7', 650, 10], ['Combustível', 'combustivel', 'for6', ent(1400, 2100), 25], ['Anúncios Instagram e Google', 'marketing', 'for8', ent(400, 800), 28]];
    for (const [desc, cat, pessoa, valor, dia] of fixas) { const v = venc(dia); add({ tipo: 'despesa', descricao: desc, categoria: cat, pessoa, conta: 'ct0', valor, vencimento: v, status: v < hoje() ? 'pago' : 'aberto', pago_em: v < hoje() ? v : null, forma: esc1(['Boleto', 'PIX', 'Transferência']), recorrente: true }); }
    for (let k = 0; k < ent(3, 4); k++) { const v = venc(ent(3, 27)); add({ tipo: 'despesa', descricao: `Compra de peças · NF ${ent(10000, 99999)}`, categoria: 'fornecedores', pessoa: esc1(['for0', 'for1', 'for2']), conta: 'ct0', valor: ent(900, 2400), vencimento: v, status: v < hoje() ? 'pago' : 'aberto', pago_em: v < hoje() ? v : null, forma: 'Boleto' }); }
    add({ tipo: 'despesa', descricao: 'Tarifas bancárias', categoria: 'tarifas', conta: 'ct0', valor: ent(38, 74), vencimento: venc(28), status: venc(28) < hoje() ? 'pago' : 'aberto', pago_em: venc(28) < hoje() ? venc(28) : null, forma: 'Débito automático' });
    // contratos de manutenção (receita recorrente)
    ['cli0', 'cli1', 'cli2', 'cli4', 'cli5', 'cli6', 'cli12', 'cli13', 'cli14', 'cli3'].forEach((p, i) => { const v = venc(10); const pago = v < hoje() && !(m === -1 && i === 3) && !(m === 0 && i === 5); add({ tipo: 'receita', descricao: 'Contrato de manutenção preventiva', categoria: 'contratos', pessoa: p, conta: 'ct0', valor: [2400, 3850, 1950, 1700, 1640, 1520, 980, 890, 1450, 760][i], vencimento: v, status: pago ? 'pago' : 'aberto', pago_em: pago ? diaMais(ent(0, 3), v) : null, forma: 'Boleto', recorrente: true }); });
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
    const o = { id: `os${i}`, numero: 0, cliente: c.id, equipamento: eq, marca, serie: `SN${ent(100000, 999999)}`, defeito, tecnico: TEC[i % 3][0], status, itens, desconto: r() < 0.15 ? Math.round(total * 0.05) : 0, entrada, previsao: diaMais(ent(1, 6), entrada), garantia: 90,
      checklist: ['Liga', 'Carcaça sem danos', 'Controle remoto entregue', 'Cliente informou senha/acesso'].filter(() => r() < 0.7), laudo: status === 'orcamento' ? '' : 'Feito diagnóstico, executado o serviço e testado por 30 minutos. Equipamento funcionando dentro do padrão.' };
    if (status === 'entregue') { o.entregue_em = diaMais(ent(1, 7), entrada); o.aprovada_em = diaMais(1, entrada); }
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
  extrato.push({ conta: 'ct0', data: diaMais(-2), descricao: 'TARIFA MANUTENÇÃO CONTA', valor: -29.9, conciliado: null }, { conta: 'ct0', data: diaMais(-1), descricao: 'PIX RECEBIDO MARTA L ANDRADE', valor: 380, conciliado: null });
  return { _cfg: { empresa: 'Refrigeração Polo Frio', endereco: 'Rua Bocaiúva, 455 · Centro · Florianópolis/SC', cnpj: '34.567.890/0001-21', telefone: '(48) 3224-5566' }, contas, pessoas, produtos, servicos, lancamentos: lanc, ordens, extrato };
}

// ---------------------------------------------------------------- regras
const lancs = (a) => a.db.lista('lancamentos');
const pessoa = (a, id) => a.db.obter('pessoas', id);
const conta = (a, id) => a.db.obter('contas', id);
const sinal = (l) => (l.tipo === 'receita' ? 1 : -1);
const saldoConta = (a, id, ate = hoje()) => (conta(a, id)?.saldo_inicial || 0) + soma(lancs(a).filter((l) => l.conta === id && l.status === 'pago' && l.pago_em <= ate), (l) => sinal(l) * l.valor);
const saldoTotal = (a, ate = hoje()) => soma(a.db.lista('contas'), (c) => saldoConta(a, c.id, ate));
const vencido = (l) => l.status === 'aberto' && l.vencimento < hoje();
const etL = (l) => (l.status !== 'pago' && l.informado ? et('Pagamento informado', 'info') : l.status === 'pago' ? et(l.tipo === 'receita' ? 'Recebido' : 'Pago', 'ok') : vencido(l) ? et(`Vencido há ${-diasAte(l.vencimento)}d`, 'er') : diasAte(l.vencimento) === 0 ? et('Vence hoje', 'al') : et('Em aberto', 'info'));
const totalOS = (o) => soma(o.itens, (x) => x.qtd * x.preco) - (o.desconto || 0);
const os = (a, id) => a.db.obter('ordens', id);
const valorFmt = (l) => `<span class="${l.tipo === 'receita' ? 'ok-tx' : ''}">${l.tipo === 'receita' ? '' : '− '}${moeda(l.valor)}</span>`;

// régua de cobrança: lembrete 3 dias antes, no dia e depois de 3 e 7 dias de atraso
const REGUA = [[-3, 'antes', 'Lembrete: vence em 3 dias'], [0, 'dia', 'Vence hoje'], [3, 'a3', '3 dias de atraso'], [7, 'a7', '7 dias de atraso']];
const reguaHoje = (a) => lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'aberto' && !l.informado && l.pessoa).map((l) => { const atraso = -diasAte(l.vencimento); const passo = REGUA.find(([d]) => d === atraso); return passo && !(l.regua || {})[passo[1]] ? { l, passo } : null; }).filter(Boolean);
const textoRegua = (a, l, passo, url) => { const p = pessoa(a, l.pessoa), nome = p?.nome.split(' ')[0] || ''; const base = passo[1] === 'antes' ? `Olá, ${nome}! Passando para lembrar que ${l.descricao} (${moeda(l.valor)}) vence em ${dataBR(l.vencimento)}.` : passo[1] === 'dia' ? `Olá, ${nome}! ${l.descricao} (${moeda(l.valor)}) vence hoje.` : `Olá, ${nome}, tudo bem? Consta em aberto ${l.descricao} (${moeda(l.valor)}), vencido em ${dataBR(l.vencimento)}.`; return `${base} Para pagar pelo PIX: ${url}\n${a.empresa}`; };

// ---------------------------------------------------------------- coleções
const colecoes = {
  lancamentos: { singular: 'lançamento', plural: 'lançamentos', largura: 640, campos: (a) => [
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['receita', 'Receita (a receber)'], ['despesa', 'Despesa (a pagar)']], obrigatorio: true, padrao: 'despesa' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: [...CATS.receita, ...CATS.despesa].map(([id, n]) => [id, n]), obrigatorio: true },
    { nome: 'pessoa', rotulo: 'Cliente / fornecedor', tipo: 'relacao', colecao: 'pessoas' },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true }, { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true, padrao: hoje },
    { nome: 'conta', rotulo: 'Conta', tipo: 'relacao', colecao: 'contas', obrigatorio: true, padrao: 'ct0' }, { nome: 'forma', rotulo: 'Forma de pagamento', tipo: 'selecao', opcoes: FORMAS },
    { nome: 'parcelas', rotulo: 'Repetir / parcelar', tipo: 'selecao', opcoes: [['1', 'Não repetir'], ['2', '2 parcelas'], ['3', '3 parcelas'], ['6', '6 parcelas'], ['12', '12 parcelas'], ['rec', 'Todo mês (12 meses)']], padrao: '1', oculto: false },
  ], validar: (d) => (CAT[d.categoria] && ((d.tipo === 'receita') !== (CAT[d.categoria].grupo !== 'receita')) ? null : 'A categoria não combina com o tipo (receita/despesa)') },
  pessoas: { singular: 'cadastro', plural: 'cadastros', campos: [
    { nome: 'nome', rotulo: 'Nome / razão social', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: [['cliente', 'Cliente'], ['fornecedor', 'Fornecedor']], padrao: 'cliente' },
    { nome: 'doc', rotulo: 'CPF / CNPJ', tipo: 'texto' }, { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel' }, { nome: 'email', rotulo: 'E-mail', tipo: 'email' }] },
  produtos: { singular: 'peça', genero: 'f', plural: 'peças', campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'codigo', rotulo: 'Código', tipo: 'texto' }, { nome: 'custo', rotulo: 'Custo', tipo: 'moeda' }, { nome: 'preco', rotulo: 'Preço de venda', tipo: 'moeda', obrigatorio: true },
    { nome: 'estoque', rotulo: 'Estoque', tipo: 'numero', padrao: 0 }, { nome: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero', padrao: 2 }] },
  servicos: { singular: 'serviço', plural: 'serviços', campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largo: true }, { nome: 'preco', rotulo: 'Preço', tipo: 'moeda', obrigatorio: true }] },
  ordens: { singular: 'ordem de serviço', genero: 'f', plural: 'ordens', largura: 680, campos: [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'pessoas', filtrar: (p) => p.tipo === 'cliente', obrigatorio: true }, { nome: 'tecnico', rotulo: 'Técnico', tipo: 'selecao', opcoes: TEC.map((t) => [t[0], t[1]]), padrao: 'diego' },
    { nome: 'equipamento', rotulo: 'Equipamento', tipo: 'texto', obrigatorio: true, dica: 'Ex.: Ar-condicionado split 12.000 BTU' }, { nome: 'marca', rotulo: 'Marca / modelo', tipo: 'texto' },
    { nome: 'serie', rotulo: 'Nº de série', tipo: 'texto' }, { nome: 'previsao', rotulo: 'Previsão de entrega', tipo: 'data', padrao: () => diaMais(3) },
    { nome: 'defeito', rotulo: 'Defeito relatado pelo cliente', tipo: 'texto-longo', obrigatorio: true }],
    antesDeSalvar: (d, a, antes) => ({ ...d, numero: antes?.numero || Math.max(1000, ...a.db.lista('ordens').map((o) => o.numero)) + 1, status: antes?.status || 'orcamento', itens: antes?.itens || [{ tipo: 'servico', ref: 'sv0', descricao: 'Visita técnica e diagnóstico', qtd: 1, preco: 120 }], desconto: antes?.desconto || 0, entrada: antes?.entrada || hoje(), garantia: antes?.garantia || 90, checklist: antes?.checklist || [] }) },
};

// ---------------------------------------------------------------- páginas
function cartaoRegua(a) {
  const l = reguaHoje(a);
  if (!l.length) return '';
  return `<div class="cartao"><div class="cartao-cab"><div><h3>Régua de cobrança de hoje</h3><div class="sub">Lembretes automáticos: antes de vencer, no dia e nos atrasos. Cada mensagem já vai com o link de pagamento PIX.</div></div><span class="et info">${l.length}</span></div><ul class="lista">${l.slice(0, 10).map(({ l: x, passo }) => `<li>${av(pessoa(a, x.pessoa)?.nome || '?')}<div class="cresce"><div class="t corta">${esc(pessoa(a, x.pessoa)?.nome || '')}</div><div class="s corta">${esc(passo[2])} · ${esc(x.descricao)}</div></div><b class="num">${moeda(x.valor)}</b><button type="button" class="btn peq pri" data-acao="cobrarLink" data-id="${x.id}" data-passo="${passo[1]}">${ic('whatsapp-logo')}Mandar</button></li>`).join('')}</ul></div>`;
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
  return `${cartaoRegua(a)}${a.cartaoAlertas ? a.cartaoAlertas() : ''}${kpis([
    { rot: 'Saldo em contas', icone: 'bank', val: moeda(saldoTotal(a)), nota: `${a.db.lista('contas').length} contas`, spark: Array.from({ length: 30 }, (_, i) => saldoTotal(a, diaMais(i - 29))) },
    { rot: 'A receber (30 dias)', icone: 'arrow-down-left', val: moeda(soma(rec30, (l) => l.valor)), nota: vencR.length ? `<span class="er-tx">${moeda(soma(vencR, (l) => l.valor))} vencido</span>` : 'nada vencido' },
    { rot: 'A pagar (30 dias)', icone: 'arrow-up-right', val: moeda(soma(pag30, (l) => l.valor)), nota: `${pag30.length} contas` },
    { rot: `Resultado de ${nomeMes(ym, true).split(' ')[0]}`, icone: 'equals', val: `<span class="${res < 0 ? 'er-tx' : 'ok-tx'}">${moeda(res)}</span>`, nota: 'recebido − pago no mês' },
  ])}
  <div class="grade g21"><div class="cartao"><div class="cartao-cab"><div><h3>Saldo projetado · próximos 30 dias</h3><div class="sub">Saldo atual + tudo que vence a receber e a pagar</div></div><a class="btn peq" href="#/fluxo">Fluxo de caixa</a></div><div class="cartao-corpo">
      ${minimo < 0 ? `<div class="alerta-linha" style="margin-bottom:12px">${ic('warning')}O caixa fica negativo em ${dataCurta(dias[proj.findIndex((v) => v < 0)])}. Antecipe recebimentos ou renegocie contas.</div>` : `<div class="dica" style="margin-bottom:12px">${ic('check-circle')}<span>O caixa fica positivo nos próximos 30 dias. Menor saldo: <b>${moeda(minimo)}</b> em ${dataCurta(dias[proj.indexOf(minimo)])}.</span></div>`}
      ${linhas({ rotulos: dias.map((d) => dataCurta(d)), series: [{ nome: 'Saldo', cor: 'var(--acc)', v: proj }], fmt: moedaC, altura: 210 })}</div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Contas</h3><div class="sub">Saldo de hoje</div></div><a class="btn peq" href="#/conciliacao">Conciliar</a></div><ul class="lista">${a.db.lista('contas').map((c) => { const pend = a.db.lista('extrato').filter((e) => e.conta === c.id && !e.conciliado).length; return `<li><span class="av" style="background:var(--acc)">${ic(c.icone, 'p')}</span><div class="cresce"><div class="t">${esc(c.nome)}</div><div class="s">${pend ? `<span class="al-tx">${pend} lançamentos do extrato para conciliar</span>` : 'conciliada'}</div></div><b class="num">${moeda(saldoConta(a, c.id))}</b></li>`; }).join('')}<li><div class="cresce t">Total</div><b class="num">${moeda(saldoTotal(a))}</b></li></ul></div></div>
  <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>Vencendo nos próximos 3 dias</h3></div><a class="btn peq" href="#/lancamentos">Ver todos</a></div>${hojeL.length ? `<ul class="lista">${hojeL.slice(0, 7).map((l) => `<li class="clicavel" data-abrir="lanc:${l.id}"><span class="av p" style="background:${l.tipo === 'receita' ? 'var(--ok)' : 'var(--er)'}">${ic(l.tipo === 'receita' ? 'arrow-down-left' : 'arrow-up-right', 'p')}</span><div class="cresce"><div class="t corta">${esc(l.descricao)}</div><div class="s">${esc(pessoa(a, l.pessoa)?.nome || CAT[l.categoria]?.nome || '')} · ${relativo(l.vencimento)}</div></div><b class="num">${valorFmt(l)}</b></li>`).join('')}</ul>` : vazio('check-circle', 'Nada vencendo')}</div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Ordens de serviço em andamento</h3><div class="sub">${ords.length} abertas · ${moedaC(soma(ords, totalOS))}</div></div><a class="btn peq" href="#/os">Abrir quadro</a></div><div class="cartao-corpo">${barrasH(STATUS_OS.slice(0, 5).map(([id, n, c]) => ({ html: `<span class="flex"><i style="width:9px;height:9px;border-radius:3px;background:${c}"></i>${n}</span>`, v: ords.filter((o) => o.status === id).length, extra: moedaC(soma(ords.filter((o) => o.status === id), totalOS)) })))}</div></div></div>
  ${vencR.length ? `<div class="cartao"><div class="cartao-cab"><div><h3>Clientes em atraso</h3><div class="sub">Cobre com um clique pelo WhatsApp</div></div></div><ul class="lista">${vencR.sort((x, y) => x.vencimento.localeCompare(y.vencimento)).map((l) => { const p = pessoa(a, l.pessoa); return `<li>${av(p?.nome || '?')}<div class="cresce"><div class="t corta">${esc(p?.nome || '—')}</div><div class="s corta">${esc(l.descricao)} · venceu ${dataCurta(l.vencimento)}</div></div><b class="num er-tx">${moeda(l.valor)}</b>${p?.telefone ? `<button type="button" class="btn peq" data-acao="cobrarLink" data-id="${l.id}">${ic('whatsapp-logo')}Cobrar com PIX</button>` : ''}<button type="button" class="btn peq" data-acao="baixar" data-id="${l.id}">${ic('check')}Recebido</button></li>`; }).join('')}</ul></div>` : ''}`;
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
      { rot: 'Adiar 7 dias', icone: 'clock', acao: (ids) => { ids.forEach((x) => { const l = a.db.obter('lancamentos', x); if (l.status === 'aberto') a.db.salvar('lancamentos', { id: x, vencimento: diaMais(7, l.vencimento) }); }); avisar('Vencimentos adiados'); } }],
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

function fluxo(a) {
  const st = a.estado.fx ||= { modo: 'mensal' };
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoFx" data-m="mensal" aria-pressed="${st.modo === 'mensal'}">Mensal</button><button type="button" data-acao="modoFx" data-m="diario" aria-pressed="${st.modo === 'diario'}">Diário (30 dias)</button></div><button type="button" class="btn" data-acao="csvFluxo">${ic('download-simple')}Planilha</button></div>`;
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

function conciliacao(a) {
  const st = a.estado.conc ||= { conta: 'ct0' };
  const ext = a.db.lista('extrato').filter((e) => e.conta === st.conta).sort((x, y) => y.data.localeCompare(x.data));
  const pend = ext.filter((e) => !e.conciliado), feitos = ext.filter((e) => e.conciliado);
  const sugestao = (e) => lancs(a).filter((l) => l.conta === st.conta && !l.conciliado && Math.abs(sinal(l) * l.valor - e.valor) < 0.01 && Math.abs(diasEntre(l.status === 'pago' ? l.pago_em : l.vencimento, e.data)) <= 5)[0];
  return `<div class="entre"><div class="flex"><select data-mudar="contaConc" style="width:auto">${a.db.lista('contas').map((c) => `<option value="${c.id}" ${c.id === st.conta ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select><span class="mute" style="font-size:12.5px">${pend.length} para conciliar · ${feitos.length} conciliados</span></div>
      <div class="flex"><label class="btn">${ic('upload-simple')}Importar extrato (CSV)<input type="file" accept=".csv,.txt,.ofx" data-mudar="importarExtrato" hidden></label>${pend.filter((e) => sugestao(e)).length > 1 ? `<button type="button" class="btn pri" data-acao="concTodos">${ic('check-circle')}Aceitar todas as sugestões (${pend.filter((e) => sugestao(e)).length})</button>` : ''}</div></div>
    <div class="dica">${ic('info')}<span>Cada linha do extrato do banco é comparada com os lançamentos do sistema. Quando valor e data batem, o sistema sugere. Diferenças viram lançamento com um clique. CSV aceito: <span class="mono">data;descrição;valor</span>.</span></div>
    <div class="cartao"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Data</th><th>No extrato do banco</th><th class="n">Valor</th><th>No sistema</th><th></th></tr></thead><tbody>
      ${pend.map((e) => { const s = sugestao(e); return `<tr><td>${dataCurta(e.data)}</td><td class="mono" style="font-size:12px">${esc(e.descricao)}</td><td class="n"><b class="${e.valor > 0 ? 'ok-tx' : ''}">${e.valor > 0 ? '' : '− '}${moeda(Math.abs(e.valor))}</b></td>
        <td>${s ? `<span class="flex" style="gap:6px">${ic('link', 'p')}<span><span class="prim">${esc(s.descricao)}</span><span class="sub">${esc(pessoa(a, s.pessoa)?.nome || CAT[s.categoria]?.nome || '')} · ${dataCurta(s.vencimento)}</span></span></span>` : '<span class="al-tx">Nenhum lançamento corresponde</span>'}</td>
        <td class="acoes">${s ? `<button type="button" class="btn ok pri peq" data-acao="conciliar" data-e="${e.id}" data-l="${s.id}">${ic('check')}Conciliar</button>` : `<button type="button" class="btn peq" data-acao="criarDoExtrato" data-e="${e.id}">${ic('plus')}Criar lançamento</button>`}</td></tr>`; }).join('') || `<tr><td colspan="5">${vazio('check-circle', 'Tudo conciliado nesta conta')}</td></tr>`}
    </tbody></table></div></div>
    ${feitos.length ? `<div class="cartao"><div class="cartao-cab"><h3>Conciliados</h3></div><div class="tabela-caixa"><table class="tabela"><tbody>${feitos.slice(0, 12).map((e) => `<tr><td style="width:90px">${dataCurta(e.data)}</td><td class="mono mute-2" style="font-size:12px">${esc(e.descricao)}</td><td class="n">${moeda(e.valor)}</td><td>${et('Conciliado', 'ok')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

function ordensPag(a) {
  const st = a.estado.os ||= { modo: 'quadro' };
  a.kanbans.os = (id, s) => { const o = os(a, id); if (s === 'entregue' && !o.faturada) { avisar('Fature a OS antes de entregar (abra a OS e clique em Faturar)', { tipo: 'erro' }); return; } a.db.salvar('ordens', { id, status: s, ...(s === 'aprovada' ? { aprovada_em: hoje() } : {}), ...(s === 'entregue' ? { entregue_em: hoje() } : {}) }); a.db.registrar(`ordens:${id}`, `Situação: ${stOS(s)[1]}`, { icone: 'arrow-right', tom: 'acc' }); avisar(`OS #${o.numero} → ${stOS(s)[1]}`); };
  a.kanbans['os:abrir'] = (id) => a.abrir('os', id);
  const lista = a.db.lista('ordens');
  const topo = `<div class="entre"><div class="grupo-btn"><button type="button" data-acao="modoOS" data-m="quadro" aria-pressed="${st.modo === 'quadro'}">${ic('kanban', 'p')}Quadro</button><button type="button" data-acao="modoOS" data-m="lista" aria-pressed="${st.modo === 'lista'}">${ic('list', 'p')}Lista</button></div><button type="button" class="btn pri" data-acao="novaOS">${ic('plus')}Nova OS</button></div>`;
  if (st.modo === 'lista') return topo + a.tab({ id: 'os', colecao: 'ordens', singular: 'OS', plural: 'OS', ordem: 'numero', desc: true,
    visoes: [{ id: 'abertas', rot: 'Abertas', filtro: (o) => o.status !== 'entregue' }, { id: 'atrasadas', rot: 'Atrasadas', filtro: (o) => o.status !== 'entregue' && o.previsao < hoje() }, { id: 'entregues', rot: 'Entregues', filtro: (o) => o.status === 'entregue' }, { id: 'todas', rot: 'Todas' }],
    filtros: [{ k: 'status', rot: 'Situação', opcoes: STATUS_OS.map(([k, n]) => [k, n]) }, { k: 'tecnico', rot: 'Técnico', opcoes: TEC.map((t) => [t[0], t[1]]) }],
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

function relatorios(a) {
  const ent = a.db.lista('ordens').filter((o) => o.status === 'entregue' && diasAte(o.entregue_em) > -90);
  const rec = lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'pago' && diasAte(l.pago_em) > -90);
  const porCli = Object.entries(agrupar(rec.filter((l) => l.pessoa), (l) => l.pessoa)).map(([p, l]) => ({ rot: pessoa(a, p)?.nome || '—', v: soma(l, (x) => x.valor) })).sort((x, y) => y.v - x.v).slice(0, 7);
  const vencR = lancs(a).filter((l) => l.tipo === 'receita' && vencido(l)), aReceber = lancs(a).filter((l) => l.tipo === 'receita' && l.status === 'aberto');
  return `${kpis([{ rot: 'OS entregues (90 dias)', icone: 'wrench', val: num(ent.length), nota: `ticket médio ${moeda(ent.length ? soma(ent, totalOS) / ent.length : 0)}` }, { rot: 'Tempo médio de reparo', icone: 'hourglass', val: `${Math.round(soma(ent, (o) => diasEntre(o.entrada, o.entregue_em)) / (ent.length || 1))} dias`, nota: 'da entrada à entrega' }, { rot: 'Inadimplência', icone: 'warning', val: pct((soma(vencR, (l) => l.valor) / (soma(aReceber, (l) => l.valor) || 1)) * 100, 1), nota: `${moeda(soma(vencR, (l) => l.valor))} vencido` }, { rot: 'Receita recorrente (contratos)', icone: 'arrows-clockwise', val: moeda(soma(lancs(a).filter((l) => l.categoria === 'contratos' && l.vencimento.startsWith(hoje().slice(0, 7))), (l) => l.valor)), nota: 'por mês' }])}
    <div class="grade g2"><div class="cartao"><div class="cartao-cab"><div><h3>OS por técnico</h3><div class="sub">Últimos 90 dias</div></div></div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Técnico</th><th class="n">OS</th><th class="n">Faturado</th><th class="n">Comissão</th></tr></thead><tbody>${TEC.map(([id, n, c]) => { const l = ent.filter((o) => o.tecnico === id); const sv = soma(l.flatMap((o) => o.itens.filter((i) => i.tipo === 'servico')), (i) => i.qtd * i.preco); return `<tr><td><span class="flex">${av(n, 'p')}${esc(n)}</span></td><td class="n">${l.length}</td><td class="n">${moeda(soma(l, totalOS))}</td><td class="n">${moeda((sv * c) / 100)} <span class="mute">(${c}%)</span></td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="cartao"><div class="cartao-cab"><div><h3>Maiores clientes</h3><div class="sub">Recebido nos últimos 90 dias</div></div></div><div class="cartao-corpo">${barrasH(porCli, { fmt: moedaC })}</div></div></div>
    <div class="cartao"><div class="cartao-cab"><div><h3>Receitas por categoria</h3><div class="sub">Recebido por mês</div></div></div><div class="cartao-corpo">${barras({ dados: Array.from({ length: 6 }, (_, i) => mesMais(i - 5)).map((m) => ({ rot: nomeMes(m), v: CATS.receita.map(([id]) => soma(lancs(a).filter((l) => l.categoria === id && l.status === 'pago' && l.pago_em.startsWith(m)), (l) => l.valor)) })), series: CATS.receita.map(([, n], i) => ({ nome: n, cor: COR_CAT[i] })), empilhado: true, fmt: moedaC })}</div></div>`;
}

// ---------------------------------------------------------------- documento da OS
function docOS(a, o) {
  const c = pessoa(a, o.cliente), cfg = a.db.cfg;
  const via = (titulo) => `<div style="page-break-inside:avoid;margin-bottom:26px"><div class="entre" style="align-items:flex-start"><div><h1>${esc(a.empresa)}</h1><div style="color:#555">${esc(cfg.endereco)} · ${esc(cfg.telefone)} · CNPJ ${esc(cfg.cnpj)}</div></div><div style="text-align:right"><b style="font-size:16px">OS #${o.numero}</b><div style="color:#555">${esc(titulo)}</div></div></div>
    <h2>Cliente</h2><div>${esc(c?.nome || '')} · ${esc(c?.doc || '')} · ${esc(c?.telefone || '')}</div>
    <h2>Equipamento</h2><table><tr><td><b>${esc(o.equipamento)}</b></td><td>Marca/modelo: ${esc(o.marca || '—')}</td><td>Série: ${esc(o.serie || '—')}</td></tr><tr><td colspan="3">Defeito relatado: ${esc(o.defeito)}</td></tr><tr><td colspan="3">Checklist de entrada: ${o.checklist?.length ? o.checklist.map(esc).join(' · ') : '—'}</td></tr></table>
    <h2>Serviços e peças</h2><table><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th></tr></thead><tbody>${o.itens.map((i) => `<tr><td>${esc(i.descricao)}</td><td class="n">${i.qtd}</td><td class="n">${moeda(i.preco)}</td><td class="n">${moeda(i.qtd * i.preco)}</td></tr>`).join('')}${o.desconto ? `<tr><td colspan="3">Desconto</td><td class="n">− ${moeda(o.desconto)}</td></tr>` : ''}<tr><td colspan="3"><b>Total</b></td><td class="n"><b>${moeda(totalOS(o))}</b></td></tr></tbody></table>
    ${o.laudo ? `<h2>Serviço executado</h2><div>${esc(o.laudo)}</div>` : ''}
    <div style="margin-top:10px;color:#444;font-size:11px">Entrada: ${dataBR(o.entrada)} · Previsão: ${dataBR(o.previsao)} · Técnico: ${esc(nomeT(o.tecnico))} · Garantia de ${o.garantia || 90} dias para o serviço executado, a contar da entrega. Equipamentos não retirados em 90 dias após o aviso de conclusão poderão ser descartados.</div>
    <div class="ass"><div>${esc(a.empresa)}</div><div>${esc(c?.nome || 'Cliente')}</div></div></div>`;
  return `<div class="doc">${via('Via da empresa')}<hr style="border:0;border-top:1px dashed #999;margin:18px 0">${via('Via do cliente')}</div>`;
}

// ---------------------------------------------------------------- fichas
const fichas = {
  lanc(a, id) {
    const l = a.db.obter('lancamentos', id); if (!l) return null; const p = pessoa(a, l.pessoa), o = l.os ? os(a, l.os) : null;
    return { estreita: true, html: ficha({ tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa', icone: l.tipo === 'receita' ? 'arrow-down-left' : 'arrow-up-right', titulo: esc(l.descricao), sub: `${etL(l)}<b class="num" style="font-size:15px;color:var(--tx)">${valorFmt(l)}</b>`,
      extra: l.status === 'aberto' ? `<div class="flex" style="margin-top:12px"><button type="button" class="btn ok pri" data-acao="baixar" data-id="${id}">${ic('check')}${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>${l.tipo === 'receita' ? `<button type="button" class="btn" data-acao="cobrarLink" data-id="${id}">${ic('qr-code')}Link de pagamento PIX</button>` : ''}${l.tipo === 'receita' && p?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(p.telefone)}?text=${encodeURIComponent(`Olá! Aqui é da ${a.empresa}. Segue o lembrete do pagamento de ${moeda(l.valor)} (${l.descricao}) com vencimento em ${dataBR(l.vencimento)}. Chave PIX: ${a.db.cfg.cnpj}.`)}">${ic('whatsapp-logo')}Enviar cobrança</a>` : ''}</div>` : '',
      corpo: `<div class="gav-sec">${props([['calendar-blank', 'Vencimento', `${dataBR(l.vencimento)} · ${relativo(l.vencimento)}`], l.pago_em ? ['check-circle', l.tipo === 'receita' ? 'Recebido em' : 'Pago em', dataBR(l.pago_em)] : null, ['tag', 'Categoria', esc(CAT[l.categoria]?.nome || '—')], ['user', l.tipo === 'receita' ? 'Cliente' : 'Fornecedor', p ? `<a href="javascript:void 0" data-abrir="pessoa:${p.id}">${esc(p.nome)}</a>` : null], ['bank', 'Conta', esc(conta(a, l.conta)?.nome || '—')], ['credit-card', 'Forma', esc(l.forma || '—')], ['arrows-clockwise', 'Recorrente', l.recorrente ? 'Sim, todo mês' : null], o ? ['wrench', 'Ordem de serviço', `<a href="javascript:void 0" data-abrir="os:${o.id}">#${o.numero}</a>`] : null, ['link', 'Conciliação', l.status === 'pago' ? (l.conciliado ? et('Conciliado com o extrato', 'ok') : et('Não conciliado', 'al')) : null]])}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarLanc" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="menuLanc" data-id="${id}" aria-label="Mais">${ic('dots-three')}</button>` }) };
  },
  pessoa(a, id) {
    const p = pessoa(a, id); if (!p) return null; const ls = lancs(a).filter((l) => l.pessoa === id).sort((x, y) => y.vencimento.localeCompare(x.vencimento)), ords = a.db.lista('ordens').filter((o) => o.cliente === id);
    return { estreita: true, html: ficha({ tipo: p.tipo === 'cliente' ? 'Cliente' : 'Fornecedor', icone: p.tipo === 'cliente' ? 'user' : 'truck', titulo: esc(p.nome), avatar: av(p.nome, 'gg'), sub: `<span class="mono">${esc(p.doc || '')}</span>`,
      corpo: `<div class="gav-sec">${props([['phone', 'Telefone', p.telefone ? `${esc(p.telefone)} · <a href="${telLink(p.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : null], ['envelope-simple', 'E-mail', p.email ? esc(p.email) : null], ['hand-coins', 'Em aberto', moeda(soma(ls.filter((l) => l.status === 'aberto'), (l) => l.valor))]])}</div>
        ${ords.length ? `<div class="gav-sec"><h4>Ordens de serviço (${ords.length})</h4><ul class="lista" style="margin:0 -20px">${ords.slice(0, 8).map((o) => `<li class="clicavel" data-abrir="os:${o.id}"><span class="mono mute-2">#${o.numero}</span><div class="cresce"><div class="t corta">${esc(o.equipamento)}</div><div class="s">${dataCurta(o.entrada)}</div></div><span class="et sem-ponto" style="color:${stOS(o.status)[2]}">${stOS(o.status)[1]}</span></li>`).join('')}</ul></div>` : ''}
        <div class="gav-sec"><h4>Lançamentos</h4>${ls.length ? `<ul class="lista" style="margin:0 -20px">${ls.slice(0, 12).map((l) => `<li class="clicavel" data-abrir="lanc:${l.id}"><div class="cresce"><div class="t corta">${esc(l.descricao)}</div><div class="s">${dataCurta(l.vencimento)}</div></div>${etL(l)}<b class="num" style="min-width:90px;text-align:right">${valorFmt(l)}</b></li>`).join('')}</ul>` : vazio('receipt', 'Sem lançamentos')}</div>`,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarCad" data-c="pessoas" data-id="${id}">${ic('pencil-simple')}Editar</button>` }) };
  },
  os(a, id, aba = 'itens') {
    const o = os(a, id); if (!o) return null; const c = pessoa(a, o.cliente), i = STATUS_OS.findIndex((x) => x[0] === o.status);
    let corpo = '';
    if (aba === 'itens') corpo = `<div class="gav-sec"><table class="tabela"><thead><tr><th>Descrição</th><th class="n">Qtd.</th><th class="n">Unit.</th><th class="n">Total</th><th></th></tr></thead><tbody>${o.itens.map((x, k) => `<tr><td>${ic(x.tipo === 'peca' ? 'package' : 'wrench', 'p')} ${esc(x.descricao)}</td><td class="n">${x.qtd}</td><td class="n">${moeda(x.preco)}</td><td class="n"><b>${moeda(x.qtd * x.preco)}</b></td><td class="acoes">${o.faturada ? '' : `<button type="button" class="btn fant peq ic-so" data-acao="tirarItemOS" data-id="${id}" data-i="${k}" aria-label="Remover">${ic('trash')}</button>`}</td></tr>`).join('')}</tbody>
      <tfoot>${o.desconto ? `<tr><td colspan="3">Desconto</td><td class="n">− ${moeda(o.desconto)}</td><td></td></tr>` : ''}<tr><td colspan="3">Total</td><td class="n">${moeda(totalOS(o))}</td><td></td></tr></tfoot></table>
      ${o.faturada ? `<div class="dica" style="margin-top:12px">${ic('check-circle')}<span>OS faturada. Os valores foram lançados em Contas a receber.</span></div>` : `<div class="flex" style="margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-acao="addItemOS" data-id="${id}" data-t="servico">${ic('wrench')}Serviço</button><button type="button" class="btn" data-acao="addItemOS" data-id="${id}" data-t="peca">${ic('package')}Peça do estoque</button><button type="button" class="btn" data-acao="descOS" data-id="${id}">${ic('percent')}Desconto</button></div>`}</div>`;
    if (aba === 'det') corpo = `<div class="gav-sec">${props([['user', 'Cliente', `<a href="javascript:void 0" data-abrir="pessoa:${c?.id}">${esc(c?.nome || '—')}</a>`], ['phone', 'Telefone', esc(c?.telefone || '—')], ['wrench', 'Equipamento', esc(o.equipamento)], ['tag', 'Marca / modelo', esc(o.marca || '—')], ['barcode', 'Nº de série', `<span class="mono">${esc(o.serie || '—')}</span>`], ['warning', 'Defeito relatado', esc(o.defeito)], ['list-checks', 'Checklist de entrada', o.checklist?.length ? o.checklist.map((x) => et(x, 'ok', 'sem-ponto')).join(' ') : null], ['user-circle', 'Técnico', esc(nomeT(o.tecnico))], ['calendar-blank', 'Entrada', dataCurta(o.entrada)], ['flag', 'Previsão', `<span class="${o.status !== 'entregue' && o.previsao < hoje() ? 'er-tx' : ''}">${dataCurta(o.previsao)}</span>`], o.entregue_em ? ['check-circle', 'Entregue em', `${dataCurta(o.entregue_em)} · garantia até ${dataCurta(diaMais(o.garantia || 90, o.entregue_em))}`] : null])}</div>
      <div class="gav-sec"><h4>Laudo / serviço executado</h4><textarea data-laudo placeholder="O que foi feito, peças trocadas, testes…">${esc(o.laudo || '')}</textarea><div class="flex" style="justify-content:flex-end;margin-top:8px"><button type="button" class="btn peq" data-acao="salvarLaudo" data-id="${id}">Salvar laudo</button></div></div>`;
    if (aba === 'hist') corpo = `<div class="gav-sec">${linhaDoTempo([...a.db.historico(`ordens:${id}`).map((h) => ({ quando: h.quando, icone: h.icone, tom: h.tom, html: esc(h.texto) })), { quando: o.entrada, icone: 'door-open', html: 'Equipamento recebido' }, ...(o.aprovada_em ? [{ quando: o.aprovada_em, icone: 'check', tom: 'ok', html: 'Orçamento aprovado' }] : []), ...(o.entregue_em ? [{ quando: o.entregue_em, icone: 'seal-check', tom: 'ok', html: 'Entregue ao cliente' }] : [])].sort((x, y) => String(y.quando).localeCompare(String(x.quando))))}</div>`;
    const prox = { orcamento: ['aprovada', 'Cliente aprovou', 'check'], aprovada: ['execucao', 'Iniciar serviço', 'play'], execucao: ['pronta', 'Marcar como pronta', 'seal-check'], aguardando: ['execucao', 'Peça chegou', 'package'] }[o.status];
    return { html: ficha({ tipo: 'Ordem de serviço', icone: 'wrench', titulo: `OS #${o.numero} · ${esc(o.equipamento)}`, avatar: av(c?.nome || '?', 'g'), sub: `<span>${esc(c?.nome || '')}</span><b class="num" style="color:var(--tx)">· ${moeda(totalOS(o))}</b><span class="flex" style="gap:5px">· ${av(nomeT(o.tecnico), 'p')}${esc(nomeT(o.tecnico))}</span>`,
      extra: `<div class="etapas" style="margin-top:12px">${STATUS_OS.map(([s, n], j) => `<button type="button" class="${j < i ? 'feita' : j === i ? 'atual' : ''}" data-acao="statusOS" data-id="${id}" data-s="${s}">${n}</button>`).join('')}</div>
        <div class="flex" style="margin-top:12px;flex-wrap:wrap">${prox ? `<button type="button" class="btn pri" data-acao="statusOS" data-id="${id}" data-s="${prox[0]}">${ic(prox[2])}${prox[1]}</button>` : ''}${o.status === 'orcamento' && c?.telefone ? `<a class="btn" target="_blank" rel="noopener" href="${telLink(c.telefone)}?text=${encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Segue o orçamento da OS #${o.numero} (${o.equipamento}):\n${o.itens.map((x) => `• ${x.descricao}: ${moeda(x.qtd * x.preco)}`).join('\n')}\nTotal: ${moeda(totalOS(o))}. Podemos seguir com o serviço?`)}">${ic('whatsapp-logo')}Enviar orçamento</a>` : ''}${o.status === 'execucao' ? `<button type="button" class="btn" data-acao="statusOS" data-id="${id}" data-s="aguardando">${ic('hourglass')}Aguardando peça</button>` : ''}${o.status === 'pronta' && !o.faturada ? `<button type="button" class="btn pri ok" data-acao="faturarOS" data-id="${id}">${ic('currency-circle-dollar')}Faturar</button>` : ''}${o.status === 'pronta' && o.faturada ? `<button type="button" class="btn pri ok" data-acao="statusOS" data-id="${id}" data-s="entregue">${ic('seal-check')}Entregar</button>` : ''}<button type="button" class="btn" data-acao="imprimirOS" data-id="${id}">${ic('printer')}Imprimir</button></div>`,
      aba, abas: [['itens', 'Serviços e peças', o.itens.length], ['det', 'Equipamento e laudo'], ['hist', 'Histórico']], corpo,
      acoes: `<button type="button" class="btn fant peq" data-acao="editarOS" data-id="${id}">${ic('pencil-simple')}Editar</button><button type="button" class="btn fant peq ic-so" data-acao="excluirOS" data-id="${id}" aria-label="Excluir">${ic('trash')}</button>` }), montar: (g) => (g.dataset.aba = aba) };
  },
};

// ---------------------------------------------------------------- aplicativo
const app = criarApp({
  id: 'financeiro', nome: 'Nexo Financeiro', sub: 'Financeiro e OS', cor: '#0b6fb8', icone: 'currency-circle-dollar', empresa: 'Refrigeração Polo Frio', conta: 'Assistência técnica · Florianópolis',
  produto: { compra: 2490, mensal: 109 }, semente, colecoes, fichas, buscaDica: 'OS, clientes, lançamentos',
  portal: {
    cobranca: {
      explica: 'A página de pagamento da cobrança: valor, vencimento e o PIX copia e cola com QR code. Quando o cliente avisa que pagou, aparece aqui para você conferir.',
      montar: (a, id) => {
        const l = a.db.obter('lancamentos', id); if (!l) return null;
        const pix = a.pixDados();
        return { descricao: l.descricao, valor: l.valor, vencimento: l.vencimento, status: l.status, cliente: pessoa(a, l.pessoa)?.nome || '', pix, txid: `L${String(l.id).replace(/[^A-Za-z0-9]/g, '').slice(-12)}` };
      },
      responder: (a, r) => {
        const l = a.db.obter('lancamentos', r.ref); if (!l || r.acao !== 'paguei' || l.status === 'pago') return '';
        a.db.salvar('lancamentos', { id: l.id, informado: hoje() });
        return `${pessoa(a, l.pessoa)?.nome.split(' ')[0] || 'O cliente'} avisou que pagou ${moeda(l.valor)} pelo PIX (${l.descricao}): confira no extrato e dê baixa`;
      },
    },
  },
  modelos: [
    { id: 'assistencia', nome: 'Assistência técnica', desc: 'Ordens de serviço, peças e contratos de manutenção', dados: {} },
    { id: 'prestador', nome: 'Prestador de serviços', desc: 'Serviços avulsos e mensalidades de clientes', dados: { servicos: [['Visita técnica', 150], ['Hora de serviço', 120], ['Mensalidade de manutenção', 450]].map(([nome, preco]) => ({ nome, preco })) } },
    { id: 'eletronicos', nome: 'Conserto de celulares e eletrônicos', desc: 'Troca de tela, bateria e reparos', dados: { servicos: [['Troca de tela de celular (mão de obra)', 120], ['Troca de bateria', 90], ['Limpeza de placa (oxidação)', 150]].map(([nome, preco]) => ({ nome, preco })), produtos: [['Tela iPhone 11 (compatível)', 'TEL-IP11', 180, 390, 3, 2], ['Bateria Samsung A32', 'BAT-A32', 60, 150, 4, 2]].map(([nome, codigo, custo, preco, estoque, minimo]) => ({ nome, codigo, custo, preco, estoque, minimo })) } },
  ],
  passos: (a) => [{ id: 'pix', rot: 'Cadastre a chave PIX da empresa', feito: a.temPix(), href: '#/config' }, { id: 'cobranca', rot: 'Mande um link de pagamento para um cliente', feito: Object.keys(a.db.cfg.links || {}).some((k) => k.startsWith('cobranca:')) }],
  equipe: [['Rodrigo Martins', 'Dono'], ['Cláudia Neves', 'Financeiro'], ...TEC.map(([, n]) => [n, 'Técnico'])],
  busca: [{ colecao: 'ordens', grupo: 'Ordens de serviço', icone: 'wrench', ficha: 'os', rot: (o) => `#${o.numero} · ${o.equipamento}`, sub: (o, a) => pessoa(a, o.cliente)?.nome || '' }, { colecao: 'pessoas', grupo: 'Clientes e fornecedores', icone: 'user', ficha: 'pessoa', rot: (p) => p.nome, sub: (p) => p.tipo }, { colecao: 'lancamentos', grupo: 'Lançamentos', icone: 'receipt', ficha: 'lanc', rot: (l) => l.descricao, sub: (l) => moeda(l.valor) }],
  comandos: [{ rot: 'Nova ordem de serviço', icone: 'wrench', acao: (a) => a.acoes.novaOS() }, { rot: 'Nova receita', icone: 'arrow-down-left', acao: (a) => a.acoes.novoLanc({ t: 'receita' }) }, { rot: 'Nova despesa', icone: 'arrow-up-right', acao: (a) => a.acoes.novoLanc({ t: 'despesa' }) }],
  paginas: [
    { id: 'painel', rot: 'Painel', icone: 'house', titulo: 'Painel financeiro', render: painel, atalho: 'i' },
    { grupo: 'Financeiro' },
    { id: 'receber', rot: 'Contas a receber', icone: 'arrow-down-left', render: (a) => lancamentosPag(a, ['receber']), atalho: 'r', novo: (a) => a.acoes.novoLanc({ t: 'receita' }), cont: (a) => { const n = lancs(a).filter((l) => l.tipo === 'receita' && vencido(l)).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'pagar', rot: 'Contas a pagar', icone: 'arrow-up-right', render: (a) => lancamentosPag(a, ['pagar']), atalho: 'p', novo: (a) => a.acoes.novoLanc({ t: 'despesa' }), cont: (a) => lancs(a).filter((l) => l.tipo === 'despesa' && l.status === 'aberto' && diasAte(l.vencimento) <= 3).length },
    { id: 'lancamentos', rot: 'Todos os lançamentos', icone: 'list', render: (a) => lancamentosPag(a, []), novo: (a) => a.acoes.novoLanc({ t: 'despesa' }) },
    { id: 'fluxo', rot: 'Fluxo de caixa', icone: 'chart-line-up', render: fluxo, atalho: 'f' },
    { id: 'dre', rot: 'Resultado (DRE)', icone: 'equals', titulo: 'Resultado do mês (DRE gerencial)', render: dre },
    { id: 'conciliacao', rot: 'Conciliação bancária', icone: 'arrows-left-right', render: conciliacao, cont: (a) => a.db.lista('extrato').filter((e) => !e.conciliado).length },
    { grupo: 'Serviços' },
    { id: 'os', rot: 'Ordens de serviço', icone: 'wrench', render: ordensPag, cheio: true, atalho: 'o', novo: (a) => a.acoes.novaOS(), cont: (a) => { const n = a.db.lista('ordens').filter((o) => o.status !== 'entregue' && o.previsao < hoje()).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'estoque', rot: 'Peças e serviços', icone: 'package', render: estoque, cont: (a) => { const n = a.db.lista('produtos').filter((p) => p.estoque <= p.minimo).length; return n ? { n, tom: 'er' } : 0; } },
    { id: 'pessoas', rot: 'Clientes e fornecedores', icone: 'users', render: pessoasPag, atalho: 'c' },
    { id: 'relatorios', rot: 'Relatórios', icone: 'chart-bar', render: relatorios },
  ],
});

const reab = () => { app.render(); app.reabrir(); };
async function escolherConta(titulo, padrao = 'ct0') {
  return modal({ titulo, largura: 420, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo">Conta<select name="c">${app.db.lista('contas').map((c) => `<option value="${c.id}" ${c.id === padrao ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label><label class="campo">Data<input type="date" name="d" value="${hoje()}"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Confirmar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
}
Object.assign(app.acoes, {
  novoLanc: async (d = {}) => {
    const r = await editar(app, 'lancamentos', null, { tipo: d.t || 'despesa', categoria: d.t === 'receita' ? 'servicos' : 'fornecedores' }); if (!r) return;
    const n = r.parcelas === 'rec' ? 12 : Number(r.parcelas) || 1;
    if (n > 1) { const base = r.valor, parc = r.parcelas === 'rec' ? base : Math.round((base / n) * 100) / 100; app.db.salvar('lancamentos', { id: r.id, valor: parc, descricao: r.parcelas === 'rec' ? r.descricao : `${r.descricao} · 1/${n}`, recorrente: r.parcelas === 'rec', status: 'aberto' }); for (let k = 1; k < n; k++) app.db.salvar('lancamentos', { ...r, id: undefined, valor: parc, descricao: r.parcelas === 'rec' ? r.descricao : `${r.descricao} · ${k + 1}/${n}`, vencimento: diaMais(0, `${mesMais(k, r.vencimento)}-${r.vencimento.slice(8)}`), recorrente: r.parcelas === 'rec', status: 'aberto' }); avisar(`${n} lançamentos criados`); }
    else app.db.salvar('lancamentos', { id: r.id, status: 'aberto' });
    app.render();
  },
  editarLanc: async (d) => { if (await editar(app, 'lancamentos', app.db.obter('lancamentos', d.id))) reab(); },
  baixar: async (d) => { const l = app.db.obter('lancamentos', d.id); const r = await escolherConta(l.tipo === 'receita' ? `Receber ${moeda(l.valor)}` : `Pagar ${moeda(l.valor)}`, l.conta); if (!r) return; app.db.salvar('lancamentos', { id: d.id, status: 'pago', pago_em: r.d, conta: r.c }); avisar(`${l.tipo === 'receita' ? 'Recebimento' : 'Pagamento'} registrado em ${conta(app, r.c).nome}`, { desfazer: () => { app.db.salvar('lancamentos', { id: d.id, status: 'aberto', pago_em: null }); reab(); } }); reab(); },
  menuLanc: (d, el) => pop(el, [
    { rotulo: 'Duplicar para o próximo mês', icone: 'copy', acao: () => { const l = app.db.obter('lancamentos', d.id); app.db.salvar('lancamentos', { ...l, id: undefined, vencimento: diaMais(0, `${mesMais(1, l.vencimento)}-${l.vencimento.slice(8)}`), status: 'aberto', pago_em: null, conciliado: false }); avisar('Lançamento duplicado'); app.render(); } },
    app.db.obter('lancamentos', d.id).status === 'pago' ? { rotulo: 'Estornar baixa', icone: 'arrow-counter-clockwise', acao: () => { app.db.salvar('lancamentos', { id: d.id, status: 'aberto', pago_em: null }); reab(); } } : { rotulo: 'Adiar 7 dias', icone: 'clock', acao: () => { const l = app.db.obter('lancamentos', d.id); app.db.salvar('lancamentos', { id: d.id, vencimento: diaMais(7, l.vencimento) }); reab(); } },
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
  csvFluxo: () => { const l = app.estado.fxLinhas || []; baixar('fluxo-de-caixa.csv', `﻿Período;Entradas;Saídas;Resultado;Saldo\n${l.map((x) => [x.rot, x.e, x.s, x.r, x.saldo].map((v) => String(typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v)).join(';')).join('\n')}`); avisar('Planilha baixada'); },
  contaConc: (d, el) => { app.estado.conc.conta = el.value; app.render(); },
  conciliar: (d) => { app.db.salvar('extrato', { id: d.e, conciliado: d.l }); const l = app.db.obter('lancamentos', d.l); const e = app.db.obter('extrato', d.e); app.db.salvar('lancamentos', { id: d.l, conciliado: true, status: 'pago', pago_em: l.pago_em || e.data }); avisar('Conciliado'); app.render(); },
  concTodos: () => { let n = 0; app.db.lista('extrato').filter((e) => e.conta === app.estado.conc.conta && !e.conciliado).forEach((e) => { const s = lancs(app).filter((l) => l.conta === e.conta && !l.conciliado && Math.abs(sinal(l) * l.valor - e.valor) < 0.01 && Math.abs(diasEntre(l.status === 'pago' ? l.pago_em : l.vencimento, e.data)) <= 5)[0]; if (s) { app.db.salvar('extrato', { id: e.id, conciliado: s.id }); app.db.salvar('lancamentos', { id: s.id, conciliado: true, status: 'pago', pago_em: s.pago_em || e.data }); n++; } }); avisar(`${n} lançamentos conciliados`); app.render(); },
  criarDoExtrato: async (d) => { const e = app.db.obter('extrato', d.e); const r = await editar(app, 'lancamentos', null, { tipo: e.valor > 0 ? 'receita' : 'despesa', descricao: e.descricao.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), valor: Math.abs(e.valor), vencimento: e.data, conta: e.conta, categoria: e.valor > 0 ? 'outras_r' : /tarifa/i.test(e.descricao) ? 'tarifas' : 'fornecedores' }); if (!r) return; app.db.salvar('lancamentos', { id: r.id, status: 'pago', pago_em: e.data, conciliado: true }); app.db.salvar('extrato', { id: e.id, conciliado: r.id }); app.render(); },
  importarExtrato: (d, el) => { const f = el.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const linhasCsv = String(rd.result).split(/\r?\n/).map((x) => x.split(/[;,\t]/)).filter((x) => x.length >= 3 && /\d/.test(x[2])); let n = 0; for (const [dt, desc, v] of linhasCsv) { const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(dt.trim()) ? dt.trim().split('/').reverse().join('-') : dt.trim(); const val = Number(String(v).replace(/\./g, '').replace(',', '.')); if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !isFinite(val)) continue; app.db.salvar('extrato', { conta: app.estado.conc.conta, data: iso, descricao: desc.trim().toUpperCase(), valor: val, conciliado: null }); n++; } avisar(n ? `${n} linhas importadas do extrato` : 'Nenhuma linha reconhecida. Use: data;descrição;valor', { tipo: n ? 'ok' : 'erro' }); app.render(); }; rd.readAsText(f); },
  modoOS: (d) => { app.estado.os.modo = d.m; app.render(); },
  novaOS: async () => { const o = await editar(app, 'ordens'); if (o) { app.db.registrar(`ordens:${o.id}`, 'OS aberta', { icone: 'plus' }); app.render(); app.abrir('os', o.id); } },
  editarOS: async (d) => { if (await editar(app, 'ordens', os(app, d.id))) reab(); },
  excluirOS: (d) => excluir(app, 'ordens', d.id),
  statusOS: (d) => { const o = os(app, d.id); if (d.s === 'entregue' && !o.faturada) return app.acoes.faturarOS(d); app.kanbans.os ? app.kanbans.os(d.id, d.s) : app.db.salvar('ordens', { id: d.id, status: d.s }); if (!app.kanbans.os) avisar(`OS #${o.numero} → ${stOS(d.s)[1]}`); reab(); },
  addItemOS: async (d) => {
    const lista = d.t === 'peca' ? app.db.lista('produtos') : app.db.lista('servicos');
    const r = await modal({ titulo: d.t === 'peca' ? 'Adicionar peça' : 'Adicionar serviço', largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo largo">${d.t === 'peca' ? 'Peça' : 'Serviço'}<select name="i">${lista.map((x, k) => `<option value="${k}">${esc(x.nome)} · ${moeda(x.preco)}${d.t === 'peca' ? ` · ${x.estoque} em estoque` : ''}</option>`).join('')}</select></label><label class="campo">Quantidade<input name="q" type="number" min="1" value="1"></label><label class="campo">Preço (opcional)<input name="p" type="number" min="0" step="0.01" placeholder="do cadastro"></label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Adicionar', classe: 'pri', acao: (f) => Object.fromEntries(new FormData(f.querySelector('form'))) }] });
    if (!r) return; const x = lista[Number(r.i)], o = os(app, d.id);
    if (d.t === 'peca' && x.estoque < Number(r.q)) avisar(`Atenção: só há ${x.estoque} em estoque`, { tipo: 'erro' });
    app.db.salvar('ordens', { id: d.id, itens: [...o.itens, { tipo: d.t === 'peca' ? 'peca' : 'servico', ref: x.id, descricao: x.nome, qtd: Number(r.q) || 1, preco: r.p ? Number(r.p) : x.preco, custo: x.custo }] }); reab();
  },
  tirarItemOS: (d) => { const o = os(app, d.id); app.db.salvar('ordens', { id: d.id, itens: o.itens.filter((_, k) => k !== Number(d.i)) }); reab(); },
  descOS: async (d) => { const o = os(app, d.id); const r = await modal({ titulo: 'Desconto', largura: 360, corpo: `<label class="campo">Valor do desconto<div class="prefixo"><span>R$</span><input type="number" min="0" step="1" value="${o.desconto || 0}" data-v></div></label>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Aplicar', classe: 'pri', acao: (f) => Number(f.querySelector('[data-v]').value) || 0 }] }); if (r == null) return; app.db.salvar('ordens', { id: d.id, desconto: r }); reab(); },
  salvarLaudo: (d) => { app.db.salvar('ordens', { id: d.id, laudo: document.querySelector('[data-laudo]').value }); avisar('Laudo salvo'); reab(); },
  faturarOS: async (d) => {
    const o = os(app, d.id), c = pessoa(app, o.cliente), t = totalOS(o);
    const r = await modal({ titulo: `Faturar OS #${o.numero} · ${moeda(t)}`, largura: 480, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo">Forma de pagamento<select name="f">${FORMAS.map((f) => `<option>${f}</option>`).join('')}</select></label><label class="campo">Parcelas<select name="n">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}x de ${moeda(t / n)}</option>`).join('')}</select></label><label class="campo">Conta<select name="c">${app.db.lista('contas').map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label class="campo">1º vencimento<input type="date" name="v" value="${hoje()}"></label><label class="campo largo flex" style="flex-direction:row;align-items:center;gap:8px;color:var(--tx);font-weight:400"><input type="checkbox" name="pago" checked> Já recebido (pagou na retirada)</label></form>`,
      botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Faturar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return { ...Object.fromEntries(new FormData(fm)), pago: fm.querySelector('[name=pago]').checked }; } }] });
    if (!r) return; const n = Number(r.n);
    for (let k = 0; k < n; k++) { const v = k ? diaMais(0, `${mesMais(k, r.v)}-${r.v.slice(8)}`) : r.v; const pago = r.pago && k === 0; app.db.salvar('lancamentos', { tipo: 'receita', descricao: `OS #${o.numero} · ${o.equipamento}${n > 1 ? ` · ${k + 1}/${n}` : ''}`, categoria: 'servicos', pessoa: c.id, conta: r.c, valor: Math.round((t / n) * 100) / 100, vencimento: v, status: pago ? 'pago' : 'aberto', pago_em: pago ? v : null, forma: r.f, os: o.id, conciliado: false }); }
    o.itens.filter((i) => i.tipo === 'peca').forEach((i) => { const p = app.db.obter('produtos', i.ref); if (p) app.db.salvar('produtos', { id: p.id, estoque: Math.max(0, p.estoque - i.qtd) }); });
    app.db.salvar('ordens', { id: d.id, faturada: true, status: 'entregue', entregue_em: hoje() }); app.db.registrar(`ordens:${d.id}`, `Faturada em ${n}x (${r.f}) e entregue`, { icone: 'currency-circle-dollar', tom: 'ok' });
    avisar(`OS #${o.numero} faturada: ${n} lançamento${n > 1 ? 's' : ''} em Contas a receber`); reab();
  },
  imprimirOS: (d) => imprimir(docOS(app, os(app, d.id))),
  abaEst: (d) => { app.estado.est.aba = d.a; app.render(); },
  novoCad: async (d) => { if (await editar(app, d.c)) app.render(); },
  editarCad: async (d) => { if (await editar(app, d.c, app.db.obter(d.c, d.id))) reab(); },
  entradaEst: async (d) => { const p = app.db.obter('produtos', d.id); const r = await modal({ titulo: `Entrada de estoque · ${p.nome}`, largura: 420, corpo: `<form class="form-grade" onsubmit="return false"><label class="campo">Quantidade<input type="number" min="1" name="q" value="5"></label><label class="campo">Custo unitário<input type="number" step="0.01" name="c" value="${p.custo}"></label><label class="campo largo flex" style="flex-direction:row;gap:8px;align-items:center;font-weight:400;color:var(--tx)"><input type="checkbox" name="l" checked> Lançar em Contas a pagar</label></form>`, botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Dar entrada', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); return { q: Number(fm.q.value), c: Number(fm.c.value), l: fm.l.checked }; } }] }); if (!r) return; app.db.salvar('produtos', { id: d.id, estoque: p.estoque + r.q, custo: r.c }); if (r.l) app.db.salvar('lancamentos', { tipo: 'despesa', descricao: `Compra: ${r.q}× ${p.nome}`, categoria: 'fornecedores', conta: 'ct0', valor: Math.round(r.q * r.c * 100) / 100, vencimento: diaMais(28), status: 'aberto', forma: 'Boleto', conciliado: false }); avisar(`+${r.q} ${p.nome}`); app.render(); },
});

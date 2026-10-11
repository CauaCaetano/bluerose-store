// Nexo Financeiro · contas a pagar e receber, fluxo de caixa, resultado do mês e ordens de serviço
import { criarApp, esc, moeda, dataBR, diaMais, diasAte, hoje, sorteio, kpi, cartao, progresso, graficoBarras, graficoLinha, editar, modal, avisar } from '../base/nucleo.js';

const CAT_RECEITA = ['Serviços', 'Venda de peças', 'Contratos de manutenção', 'Outras receitas'];
const CAT_DESPESA = ['Fornecedores (peças)', 'Salários', 'Aluguel', 'Impostos', 'Energia e água', 'Internet e telefone', 'Marketing', 'Ferramentas', 'Outras despesas'];
const CONTAS = ['Caixa', 'Banco Inter', 'Mercado Pago'];
const STATUS_OS = ['Orçamento', 'Aprovada', 'Em andamento', 'Aguardando peça', 'Pronta', 'Entregue', 'Recusada'];
const COR_OS = { 'Orçamento': 'info', Aprovada: 'acc', 'Em andamento': 'acc', 'Aguardando peça': 'al', Pronta: 'ok', Entregue: '', Recusada: 'er' };
const TECNICOS = ['Diego', 'Renan', 'Sabrina'];
const SALDO_INICIAL = { Caixa: 2400, 'Banco Inter': 31800, 'Mercado Pago': 6650 };

const situacao = (l) => (l.status === 'Quitado' ? `<span class="selo ok">${l.tipo === 'Receita' ? 'recebido' : 'pago'}</span>` : diasAte(l.vencimento) < 0 ? `<span class="selo er">atrasado ${-diasAte(l.vencimento)}d</span>` : diasAte(l.vencimento) <= 3 ? '<span class="selo al">vence logo</span>' : '<span class="selo">em aberto</span>');

function exemplo() {
  const r = sorteio(23), escolha = (l) => l[Math.floor(r() * l.length)];
  const nomes = ['Condomínio Solar das Palmeiras', 'Ana Paula Brito', 'Restaurante Sabor Mineiro', 'Carlos Henrique Dutra', 'Escola Crescer', 'Hotel Bela Vista', 'Marcelo Antunes', 'Academia Corpo em Forma', 'Luciana Teles', 'Supermercado Real', 'Paulo Sérgio Ramos', 'Clínica Bem Estar'];
  const clientes = nomes.map((nome, i) => ({ id: `c${i}`, nome, telefone: `(62) 9${8300 + i * 19}-${4100 + i * 23}`, email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com.br`, documento: i % 3 ? `${100 + i * 31}.${210 + i}.${320 + i * 3}-${11 + i}` : `${11 + i}.${222 + i * 7}.${333 + i}/0001-${40 + i}` }));
  const equipamentos = [['Ar-condicionado split 12.000 BTUs', 'Não gela, pinga água'], ['Geladeira frost free', 'Não desliga o motor'], ['Notebook Dell Inspiron', 'Tela piscando, aquece muito'], ['Máquina de lavar 11 kg', 'Não centrifuga'], ['Câmara fria', 'Temperatura oscilando'], ['Impressora multifuncional', 'Papel enroscando'], ['Ar-condicionado cassete', 'Barulho na evaporadora'], ['Freezer horizontal', 'Formando gelo excessivo']];
  const ordens = Array.from({ length: 16 }, (_, i) => {
    const [equip, def] = equipamentos[i % equipamentos.length], st = i < 2 ? 'Orçamento' : i < 4 ? 'Aprovada' : i < 7 ? 'Em andamento' : i < 8 ? 'Aguardando peça' : i < 10 ? 'Pronta' : i < 15 ? 'Entregue' : 'Recusada';
    const pecas = Math.round((r() * 600) / 10) * 10, mo = Math.round((150 + r() * 450) / 10) * 10;
    return { id: `o${i}`, numero: 1040 + i, cliente: `c${i % clientes.length}`, equipamento: equip, defeito: def, servico: ['Entregue', 'Pronta'].includes(st) ? escolha(['Troca do capacitor e limpeza completa', 'Recarga de gás e troca do filtro secador', 'Substituição da placa e testes', 'Troca do rolamento e da correia', 'Reaperto, limpeza e lubrificação']) : '',
      pecas_texto: pecas ? escolha(['Capacitor 35µF', 'Filtro secador', 'Placa eletrônica', 'Kit rolamentos', 'Correia', 'Termostato']) : '', valor_pecas: pecas, valor_mao_obra: mo, status: st, tecnico: escolha(TECNICOS),
      entrada: diaMais(-Math.floor(r() * 25) - (st === 'Entregue' ? 10 : 0)), previsao: diaMais(Math.floor(r() * 8) - 2) };
  });
  const lanc = [];
  for (let m = -4; m <= 1; m++) {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + m);
    const dia = (d) => { const x = new Date(base); x.setDate(d); return x.toISOString().slice(0, 10); };
    const fixa = [['Aluguel do galpão', 'Aluguel', 3200, 5], ['Salários e encargos', 'Salários', 9800, 5], ['Energia e água', 'Energia e água', 640 + Math.round(r() * 200), 12], ['Internet e telefone', 'Internet e telefone', 289, 15], ['Simples Nacional', 'Impostos', 1450 + Math.round(r() * 600), 20], ['Anúncios no Google', 'Marketing', 600, 10]];
    for (const [desc, cat, v, d] of fixa) lanc.push({ descricao: desc, tipo: 'Despesa', categoria: cat, valor: v, vencimento: dia(d), conta: 'Banco Inter', parte: '' });
    for (let k = 0; k < 3; k++) lanc.push({ descricao: `Compra de peças · ${escolha(['Distribuidora Frio Sul', 'Eletropeças Centro', 'Refrigeração Total'])}`, tipo: 'Despesa', categoria: 'Fornecedores (peças)', valor: Math.round(400 + r() * 1800), vencimento: dia(3 + k * 9), conta: escolha(CONTAS.slice(1)), parte: '' });
    for (let k = 0; k < 17; k++) lanc.push({ descricao: escolha(['Manutenção preventiva', 'Conserto de ar-condicionado', 'Instalação de split', 'Reparo de geladeira', 'Visita técnica', 'Venda de peça']), tipo: 'Receita', categoria: k % 5 === 0 ? 'Contratos de manutenção' : k % 7 === 3 ? 'Venda de peças' : 'Serviços', valor: Math.round(420 + r() * 2300), vencimento: dia(1 + Math.round(k * 1.65)), conta: escolha(CONTAS), parte: escolha(nomes) });
  }
  for (const l of lanc) l.status = diasAte(l.vencimento) < -3 || (diasAte(l.vencimento) <= 0 && r() < 0.6) ? (r() < 0.95 || l.tipo === 'Despesa' ? 'Quitado' : 'Em aberto') : 'Em aberto';
  return { clientes, ordens, lancamentos: lanc };
}
let cache = null;
const seed = (n) => () => { if (!cache) cache = exemplo(); return cache[n]; };

const camposLanc = (tipo) => [
  { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
  { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: tipo === 'Receita' ? CAT_RECEITA : CAT_DESPESA, obrigatorio: true, lista: true, filtro: true },
  { nome: 'parte', rotulo: tipo === 'Receita' ? 'Cliente' : 'Fornecedor', tipo: 'texto', lista: true, ocultaCel: true },
  { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, lista: true },
  { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true, lista: true, padrao: () => diaMais(7) },
  { nome: 'conta', rotulo: 'Conta', tipo: 'selecao', opcoes: CONTAS, obrigatorio: true, filtro: true, padrao: 'Banco Inter', lista: true, ocultaCel: true },
  { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: [['Em aberto', 'Em aberto'], ['Quitado', tipo === 'Receita' ? 'Recebido' : 'Pago']], obrigatorio: true, filtro: true, padrao: 'Em aberto', lista: true, exibir: situacao },
];
const colecoes = {
  lancamentos: { singular: 'lançamento', plural: 'lançamentos', seed: seed('lancamentos'), campos: camposLanc('Despesa') },
  ordens: {
    singular: 'ordem de serviço', plural: 'ordens de serviço', seed: seed('ordens'), botaoNovo: 'Nova OS',
    subtitulo: (x, app) => `${app.db.obter('clientes', x.cliente)?.nome || ''} · ${x.defeito || ''}`,
    campos: [
      { nome: 'numero', rotulo: 'OS nº', tipo: 'numero', lista: true, exibir: (x) => `<b>#${x.numero}</b>` },
      { nome: 'cliente', rotulo: 'Cliente', tipo: 'relacao', colecao: 'clientes', obrigatorio: true },
      { nome: 'equipamento', rotulo: 'Equipamento', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'defeito', rotulo: 'Defeito relatado', tipo: 'texto-longo', obrigatorio: true },
      { nome: 'servico', rotulo: 'Serviço executado', tipo: 'texto-longo' },
      { nome: 'pecas_texto', rotulo: 'Peças usadas', tipo: 'texto' },
      { nome: 'valor_pecas', rotulo: 'Valor das peças', tipo: 'moeda', padrao: 0 },
      { nome: 'valor_mao_obra', rotulo: 'Mão de obra', tipo: 'moeda', obrigatorio: true },
      { nome: 'total', rotulo: 'Total', tipo: 'moeda', somenteLista: true, lista: true, exibir: (x) => moeda((x.valor_pecas || 0) + (x.valor_mao_obra || 0)) },
      { nome: 'status', rotulo: 'Situação', tipo: 'selecao', opcoes: STATUS_OS, obrigatorio: true, lista: true, filtro: true, padrao: 'Orçamento', cores: COR_OS },
      { nome: 'tecnico', rotulo: 'Técnico', tipo: 'selecao', opcoes: TECNICOS, filtro: true, lista: true, ocultaCel: true },
      { nome: 'entrada', rotulo: 'Entrada', tipo: 'data', padrao: hoje },
      { nome: 'previsao', rotulo: 'Previsão de entrega', tipo: 'data', lista: true, padrao: () => diaMais(3), ocultaCel: true },
    ],
    aoSalvar: (x, app, novo) => { if (novo && !x.numero) app.db.salvar('ordens', { id: x.id, numero: Math.max(1000, ...app.db.lista('ordens').map((o) => o.numero || 0)) + 1 }); },
  },
  clientes: {
    singular: 'cliente', plural: 'clientes', seed: seed('clientes'),
    campos: [
      { nome: 'nome', rotulo: 'Nome / razão social', tipo: 'texto', obrigatorio: true, lista: true, largo: true },
      { nome: 'documento', rotulo: 'CPF / CNPJ', tipo: 'texto', lista: true, ocultaCel: true },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', lista: true },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', lista: true, ocultaCel: true },
    ],
  },
};

const lancs = (app) => app.db.lista('lancamentos');
// contas a receber e a pagar usam a mesma coleção: os campos (categorias, rótulos) seguem a página aberta
function usarTipo(tipo) {
  Object.assign(colecoes.lancamentos, { campos: camposLanc(tipo), singular: tipo === 'Receita' ? 'recebimento' : 'pagamento', plural: tipo === 'Receita' ? 'recebimentos' : 'contas', botaoNovo: tipo === 'Receita' ? 'Novo recebimento' : 'Nova conta a pagar' });
  return '';
}
const saldoAtual = (app) => CONTAS.reduce((s, c) => s + SALDO_INICIAL[c], 0) + lancs(app).filter((l) => l.status === 'Quitado').reduce((s, l) => s + (l.tipo === 'Receita' ? l.valor : -l.valor), 0);
const doMes = (d, m = hoje().slice(0, 7)) => String(d).slice(0, 7) === m;

function painel(app) {
  const L = lancs(app), saldo = saldoAtual(app);
  const aReceber = L.filter((l) => l.tipo === 'Receita' && l.status !== 'Quitado' && diasAte(l.vencimento) <= 30);
  const aPagar = L.filter((l) => l.tipo === 'Despesa' && l.status !== 'Quitado' && diasAte(l.vencimento) <= 30);
  const rec = L.filter((l) => l.tipo === 'Receita' && doMes(l.vencimento)).reduce((s, l) => s + l.valor, 0), desp = L.filter((l) => l.tipo === 'Despesa' && doMes(l.vencimento)).reduce((s, l) => s + l.valor, 0);
  const atrasados = L.filter((l) => l.status !== 'Quitado' && diasAte(l.vencimento) < 0);
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const os = app.db.lista('ordens').filter((o) => !['Entregue', 'Recusada'].includes(o.status));
  const vencendo = L.filter((l) => l.status !== 'Quitado' && diasAte(l.vencimento) <= 7).sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 7);
  return `<div class="kpis">
      ${kpi({ icone: '◈', rotulo: 'Saldo em contas', valor: moeda(saldo), tom: saldo < 0 ? 'er' : '', nota: CONTAS.join(' · ') })}
      ${kpi({ icone: '↓', rotulo: 'A receber em 30 dias', valor: moeda(aReceber.reduce((s, l) => s + l.valor, 0)), tom: 'ok', nota: `${aReceber.length} lançamentos` })}
      ${kpi({ icone: '↑', rotulo: 'A pagar em 30 dias', valor: moeda(aPagar.reduce((s, l) => s + l.valor, 0)), tom: 'al', nota: `${aPagar.length} contas` })}
      ${kpi({ icone: '=', rotulo: 'Resultado do mês', valor: moeda(rec - desp), tom: rec - desp >= 0 ? 'ok' : 'er', nota: `${moeda(rec)} entram · ${moeda(desp)} saem` })}
    </div>
    ${atrasados.length ? `<div class="cartao" style="border-color:var(--er);background:var(--er-s);padding:12px 16px"><b style="color:#b42318">${atrasados.length} lançamento(s) em atraso:</b> ${moeda(atrasados.filter((l) => l.tipo === 'Receita').reduce((s, l) => s + l.valor, 0))} para receber e ${moeda(atrasados.filter((l) => l.tipo === 'Despesa').reduce((s, l) => s + l.valor, 0))} para pagar. <a href="#/receber">Cobrar</a></div>` : ''}
    <div class="grade g-21">
      ${cartao('Entradas e saídas', graficoBarras({ dados: meses.map((m) => ({ rotulo: new Date(`${m}-15`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valores: [L.filter((l) => l.tipo === 'Receita' && doMes(l.vencimento, m)).reduce((s, l) => s + l.valor, 0), L.filter((l) => l.tipo === 'Despesa' && doMes(l.vencimento, m)).reduce((s, l) => s + l.valor, 0)] })),
        series: [{ nome: 'Entradas', cor: '#12b76a' }, { nome: 'Saídas', cor: '#f04438' }], formato: (v) => `R$ ${(v / 1000).toFixed(0)}k` }), { sub: 'por mês de vencimento' })}
      ${cartao('Vence nos próximos 7 dias', vencendo.length ? `<ul class="lista-simples">${vencendo.map((l) => `<li><span class="avatar" style="${l.tipo === 'Receita' ? 'background:var(--ok-s);color:var(--ok)' : 'background:var(--er-s);color:var(--er)'}">${l.tipo === 'Receita' ? '↓' : '↑'}</span><div><b style="font-size:13px">${esc(l.descricao)}</b><div class="muted" style="font-size:12px">${dataBR(l.vencimento)}</div></div><div class="dir"><b style="color:${l.tipo === 'Receita' ? 'var(--ok)' : 'var(--er)'}">${moeda(l.valor)}</b><div>${situacao(l)}</div></div></li>`).join('')}</ul>` : '<div class="vazio">Nada vencendo.</div>')}
    </div>
    ${cartao('Ordens de serviço em andamento', `<div class="kpis">${['Orçamento', 'Aprovada', 'Em andamento', 'Aguardando peça', 'Pronta'].map((s) => `<div class="kpi"><div><span>${s}</span><b>${os.filter((o) => o.status === s).length}</b></div></div>`).join('')}</div>`, { acoes: '<a class="btn peq" href="#/ordens">Ver ordens</a>' })}`;
}

function fluxo(app) {
  const L = lancs(app);
  let saldo = saldoAtual(app);
  const pontos = [{ rotulo: 'hoje', valor: saldo }];
  const linhas = [];
  for (let i = 0; i <= 30; i++) {
    const d = diaMais(i);
    const doDia = L.filter((l) => l.status !== 'Quitado' && (i === 0 ? l.vencimento <= d : l.vencimento === d));
    const ent = doDia.filter((l) => l.tipo === 'Receita').reduce((s, l) => s + l.valor, 0), sai = doDia.filter((l) => l.tipo === 'Despesa').reduce((s, l) => s + l.valor, 0);
    saldo += ent - sai;
    if (i) pontos.push({ rotulo: dataBR(d).slice(0, 5), valor: saldo });
    if (ent || sai) linhas.push({ d, ent, sai, saldo });
  }
  const menor = Math.min(...pontos.map((p) => p.valor));
  return `${menor < 0 ? `<div class="cartao" style="border-color:var(--er);background:var(--er-s);padding:12px 16px"><b style="color:#b42318">Atenção: o saldo fica negativo nos próximos 30 dias (mínimo de ${moeda(menor)}).</b> Antecipe recebimentos ou renegocie pagamentos.</div>` : `<div class="cartao" style="border-color:var(--ok);background:var(--ok-s);padding:12px 16px"><b style="color:#067647">O caixa fica positivo nos próximos 30 dias</b> (menor saldo: ${moeda(menor)}).</div>`}
    ${cartao('Saldo projetado · próximos 30 dias', graficoLinha({ pontos, formato: (v) => `R$ ${(v / 1000).toFixed(0)}k` }), { sub: 'considera tudo o que está em aberto, inclusive atrasados (no dia de hoje)' })}
    ${cartao('Dia a dia', `<table class="tabela"><thead><tr><th>Dia</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo no fim do dia</th></tr></thead><tbody>${linhas.map((x) => `<tr><td>${dataBR(x.d)}${x.d === hoje() ? ' <span class="selo">hoje + atrasados</span>' : ''}</td><td class="num" style="color:var(--ok)">${x.ent ? moeda(x.ent) : '—'}</td><td class="num" style="color:var(--er)">${x.sai ? moeda(x.sai) : '—'}</td><td class="num"><b style="${x.saldo < 0 ? 'color:var(--er)' : ''}">${moeda(x.saldo)}</b></td></tr>`).join('')}</tbody></table>`, { semPad: true })}`;
}

function resultado(app) {
  const m = app.estado.mesDre ||= hoje().slice(0, 7);
  const L = lancs(app).filter((l) => doMes(l.vencimento, m));
  const grupo = (tipo, cats) => cats.map((c) => ({ c, v: L.filter((l) => l.tipo === tipo && l.categoria === c).reduce((s, l) => s + l.valor, 0) })).filter((x) => x.v);
  const rec = grupo('Receita', CAT_RECEITA), desp = grupo('Despesa', CAT_DESPESA);
  const tr = rec.reduce((s, x) => s + x.v, 0), td = desp.reduce((s, x) => s + x.v, 0);
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 4 + i); return d.toISOString().slice(0, 7); });
  const linha = (rotulo, v, total, cor) => `<tr><td style="padding-left:28px">${esc(rotulo)}</td><td class="num">${moeda(v)}</td><td class="num muted">${total ? Math.round((v / total) * 100) : 0}%</td><td style="width:30%">${progresso(total ? (v / total) * 100 : 0, cor)}</td></tr>`;
  return `<div class="barra-ferr"><select class="filtro" data-acao-mes aria-label="Mês">${meses.map((x) => `<option value="${x}" ${x === m ? 'selected' : ''}>${new Date(`${x}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>`).join('')}</select><button type="button" class="btn" data-acao="imprimir">Imprimir</button></div>
    ${cartao('Resultado do mês (DRE simplificado)', `<table class="tabela"><tbody>
      <tr><td><b>Receitas</b></td><td class="num"><b style="color:var(--ok)">${moeda(tr)}</b></td><td></td><td></td></tr>${rec.map((x) => linha(x.c, x.v, tr, 'var(--ok)')).join('')}
      <tr><td><b>Despesas</b></td><td class="num"><b style="color:var(--er)">${moeda(td)}</b></td><td></td><td></td></tr>${desp.sort((a, b) => b.v - a.v).map((x) => linha(x.c, x.v, td, 'var(--er)')).join('')}
      <tr><td><b>Resultado</b></td><td class="num"><b style="font-size:16px;color:${tr - td >= 0 ? 'var(--ok)' : 'var(--er)'}">${moeda(tr - td)}</b></td><td class="num muted">${tr ? Math.round(((tr - td) / tr) * 100) : 0}% de margem</td><td></td></tr>
    </tbody></table>`, { semPad: true, sub: 'por competência (data de vencimento)' })}`;
}

async function imprimirOS(app, id) {
  const o = app.db.obter('ordens', id), c = app.db.obter('clientes', o.cliente);
  const total = (o.valor_pecas || 0) + (o.valor_mao_obra || 0);
  await modal({ titulo: `Ordem de serviço #${o.numero}`, largura: 760, corpo: `<div id="impressao-os">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--tx);padding-bottom:10px"><div><b style="font-size:18px">Refrigeração Polo Frio</b><div class="muted">CNPJ 00.000.000/0001-00 · (62) 3200-0000 · Goiânia/GO</div></div><div style="text-align:right"><b style="font-size:18px">OS #${o.numero}</b><div class="muted">Entrada ${dataBR(o.entrada)} · previsão ${dataBR(o.previsao)}</div></div></div>
    <div class="form-grade" style="margin-top:14px"><div><b>Cliente</b><div>${esc(c?.nome || '')}</div><div class="muted">${esc(c?.documento || '')} · ${esc(c?.telefone || '')}</div></div><div><b>Equipamento</b><div>${esc(o.equipamento)}</div><div class="muted">Técnico: ${esc(o.tecnico || '—')}</div></div>
    <div class="largo"><b>Defeito relatado</b><div>${esc(o.defeito)}</div></div><div class="largo"><b>Serviço executado</b><div>${esc(o.servico || 'A definir após diagnóstico.')}</div></div></div>
    <table class="tabela" style="margin-top:14px"><tbody><tr><td>Peças: ${esc(o.pecas_texto || '—')}</td><td class="num">${moeda(o.valor_pecas)}</td></tr><tr><td>Mão de obra</td><td class="num">${moeda(o.valor_mao_obra)}</td></tr><tr><td><b>Total</b></td><td class="num"><b>${moeda(total)}</b></td></tr></tbody></table>
    <p class="muted" style="font-size:12px">Garantia de 90 dias para o serviço executado. Equipamentos não retirados em 90 dias após o aviso de pronto poderão ser descartados.</p>
    <div class="form-grade" style="margin-top:36px"><div style="border-top:1px solid var(--tx);padding-top:4px;text-align:center">Assinatura do cliente</div><div style="border-top:1px solid var(--tx);padding-top:4px;text-align:center">Refrigeração Polo Frio</div></div></div>`,
    botoes: [{ rotulo: 'Fechar' }, { rotulo: 'Imprimir', classe: 'pri', acao: () => { document.body.classList.add('imprimindo-os'); window.print(); document.body.classList.remove('imprimindo-os'); return false; } }] });
}

const app = criarApp({
  id: 'financeiro', nome: 'Nexo Financeiro', sub: 'Financeiro & OS', cor: '#0369a1', inicial: 'F', empresa: 'Refrigeração Polo Frio', empresaSub: 'Assistência técnica · Goiânia/GO',
  produto: { compra: 2990, mensal: 149 },
  colecoes,
  menu: [
    { grupo: 'Financeiro' },
    { id: 'painel', rotulo: 'Painel', icone: '◧', titulo: 'Painel financeiro', sub: () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }), pagina: painel },
    { id: 'fluxo', rotulo: 'Fluxo de caixa', icone: '∿', titulo: 'Fluxo de caixa', pagina: fluxo },
    { id: 'receber', rotulo: 'Contas a receber', icone: '↓', crud: 'lancamentos', antes: () => usarTipo('Receita'), opcoes: { ordem: 'vencimento', filtro: (l) => l.tipo === 'Receita', total: (l) => moeda(l.reduce((s, x) => s + x.valor, 0)), acoesExtra: (l) => (l.status === 'Quitado' ? '' : `<button type="button" class="btn peq" data-acao="quitar" data-id="${l.id}">Recebido</button>`) },
      contador: (a) => lancs(a).filter((l) => l.tipo === 'Receita' && l.status !== 'Quitado' && diasAte(l.vencimento) < 0).length },
    { id: 'pagar', rotulo: 'Contas a pagar', icone: '↑', crud: 'lancamentos', antes: () => usarTipo('Despesa'), opcoes: { ordem: 'vencimento', filtro: (l) => l.tipo === 'Despesa', total: (l) => moeda(l.reduce((s, x) => s + x.valor, 0)), acoesExtra: (l) => (l.status === 'Quitado' ? '' : `<button type="button" class="btn peq" data-acao="quitar" data-id="${l.id}">Pago</button>`) },
      contador: (a) => lancs(a).filter((l) => l.tipo === 'Despesa' && l.status !== 'Quitado' && diasAte(l.vencimento) <= 0).length },
    { id: 'resultado', rotulo: 'Resultado do mês', icone: '=', titulo: 'Resultado do mês', pagina: resultado },
    { grupo: 'Serviços' },
    { id: 'ordens', rotulo: 'Ordens de serviço', icone: '⚙', crud: 'ordens', opcoes: { ordem: 'numero', desc: true, acoesExtra: (o) => `<button type="button" class="btn peq" data-acao="os" data-id="${o.id}">Imprimir</button>${o.status === 'Pronta' ? `<button type="button" class="btn peq" data-acao="entregar" data-id="${o.id}">Entregar</button>` : ''}` } },
    { id: 'clientes', rotulo: 'Clientes', icone: '☺', crud: 'clientes', opcoes: { ordem: 'nome' } },
  ],
});
// novo lançamento já com o tipo da página (receita ou despesa)
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-novo="lancamentos"]');
  if (!b) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const tipo = location.hash.includes('receber') ? 'Receita' : 'Despesa';
  usarTipo(tipo);
  if (await editar(app, 'lancamentos', null, { tipo })) app.render();
}, true);
document.addEventListener('change', (e) => { if (e.target.matches('[data-acao-mes]')) { app.estado.mesDre = e.target.value; app.render(); } });
app.acoes = {
  quitar: (id) => { const l = app.db.obter('lancamentos', id); app.db.salvar('lancamentos', { id, status: 'Quitado' }); avisar(l.tipo === 'Receita' ? 'Recebimento registrado' : 'Pagamento registrado'); },
  imprimir: () => { window.print(); return false; },
  os: async (id) => { await imprimirOS(app, id); return false; },
  entregar: (id) => {
    const o = app.db.obter('ordens', id);
    app.db.salvar('ordens', { id, status: 'Entregue' });
    app.db.salvar('lancamentos', { descricao: `OS #${o.numero} · ${o.equipamento}`, tipo: 'Receita', categoria: 'Serviços', valor: (o.valor_pecas || 0) + (o.valor_mao_obra || 0), vencimento: hoje(), conta: 'Mercado Pago', parte: app.db.obter('clientes', o.cliente)?.nome || '', status: 'Em aberto' });
    avisar(`OS #${o.numero} entregue · cobrança criada em Contas a receber`);
  },
};

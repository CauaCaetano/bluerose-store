// Veltria Farmácia · ferramentas: markup e margem, desconto até o PMC, dose em gotas e duração do tratamento (Básico)
// e uso contínuo, aniversariantes, crediário em atraso, validade curta e pedido à distribuidora (Pro).
import { esc, moeda, hoje, diasAte, dataCurta, diaMais } from '../base/nexo.js';
import { bloco, ldLista, ldItem, campoN, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const est = (p) => (p.lotes || []).filter((l) => l.validade >= hoje()).reduce((s, l) => s + Number(l.qtd || 0), 0);
const total = (v) => (v.itens || []).reduce((s, x) => s + x.qtd * x.preco, 0) - (v.desconto || 0) + (v.entrega?.taxa || 0);

registrarCalcs({
  markup: (f) => { const custo = n0(f.custo.value), preco = n0(f.preco.value); if (!custo || !preco) return 'Informe custo e preço.';
    return `Margem: <b>${fmtN((preco - custo) / preco * 100)}%</b> do preço · Markup: <b>${fmtN((preco - custo) / custo * 100)}%</b> sobre o custo.<br>Lucro bruto por caixa: <b>${moeda(preco - custo)}</b>`; },
  pmc: (f) => { const pmc = n0(f.pmc.value), custo = n0(f.custo.value), mm = n0(f.margem.value); if (!pmc) return 'Informe o PMC.';
    const minimo = custo / (1 - mm / 100);
    return `Preço máximo permitido: <b>${moeda(pmc)}</b>.<br>Preço mínimo para ${fmtN(mm)}% de margem: <b>${moeda(minimo)}</b> · desconto máximo sobre o PMC: <b>${fmtN(Math.max(0, (1 - minimo / pmc) * 100))}%</b>.`; },
  gotas: (f) => { const mgml = n0(f.conc.value), dose = n0(f.dose.value), gml = n0(f.gotas.value) || 20; if (!mgml || !dose) return 'Informe a concentração e a dose.';
    const ml = dose / mgml; return `Dose de ${fmtN(dose)} mg = <b>${fmtN(ml, 2)} ml</b> = <b>${fmtN(ml * gml, 0)} gotas</b> (${fmtN(gml, 0)} gotas por ml).<br><span class="mute">Confira sempre com a prescrição e a bula.</span>`; },
  duracao: (f) => { const un = n0(f.un.value), dia = n0(f.dia.value); if (!un || !dia) return 'Informe as unidades e quantas por dia.';
    const d = Math.floor(un / dia); return `A caixa dura <b>${d} dias</b>: acaba em ${dataCurta(diaMais(d))}.<br>Para 30 dias são <b>${Math.ceil(30 * dia / un)} caixa(s)</b>.`; },
});

export const LADOS = {
  calculos: () => bloco('Markup e margem', 'percent', calc('markup', campoN('custo', 'Custo (R$)', 6.9) + campoN('preco', 'Preço de venda (R$)', 14.9)))
    + bloco('Desconto até o PMC', 'tag', calc('pmc', campoN('pmc', 'PMC (R$)', 21.4) + campoN('custo', 'Custo (R$)', 6.9) + campoN('margem', 'Margem mínima (%)', 25)))
    + bloco('Dose em gotas', 'drop', calc('gotas', campoN('conc', 'Concentração (mg/ml)', 2.5) + campoN('dose', 'Dose prescrita (mg)', 0.5) + campoN('gotas', 'Gotas por ml', 20)))
    + bloco('Quanto dura a caixa', 'calendar-blank', calc('duracao', campoN('un', 'Comprimidos na caixa', 30) + campoN('dia', 'Por dia', 2))),
  avisos: (a) => {
    const cli = (id) => a.db.obter('clientes', id), prod = (id) => a.db.obter('produtos', id);
    const vendas = a.db.lista('vendas').filter((v) => v.status !== 'cancelada');
    // uso contínuo: a caixa acaba em até 5 dias
    const ult = {}; vendas.filter((v) => v.cliente).forEach((v) => v.itens.forEach((x) => { const p = prod(x.produto); if (!p?.dias_caixa) return; const k = `${v.cliente}|${x.produto}`; if (!ult[k] || ult[k].data < v.data) ult[k] = { data: v.data, qtd: x.qtd }; }));
    const lembrar = Object.entries(ult).map(([k, u]) => { const [c, pid] = k.split('|'), p = prod(pid); return { c: cli(c), p, quando: diaMais(p.dias_caixa * u.qtd, u.data) }; }).filter((x) => x.c && diasAte(x.quando) <= 5 && diasAte(x.quando) >= -20).sort((x, y) => x.quando.localeCompare(y.quando));
    const md = hoje().slice(5), aniv = a.db.lista('clientes').filter((c) => String(c.nascimento || '').slice(5) === md);
    const cred = {}; vendas.filter((v) => v.pagamento === 'crediario' && !v.pago && diasAte(v.data) < -30).forEach((v) => { (cred[v.cliente] ||= []).push(v); });
    const curtos = a.db.lista('produtos').flatMap((p) => (p.lotes || []).filter((l) => l.qtd > 0 && diasAte(l.validade) >= 0 && diasAte(l.validade) <= 60).map((l) => ({ p, l })));
    const baixo = a.db.lista('produtos').filter((p) => est(p) <= Number(p.minimo || 0)), porF = {}; baixo.forEach((p) => { (porF[p.fornecedor] ||= []).push(p); });
    return bloco('Uso contínuo: a caixa está acabando', 'heart', `<p>Lembre antes que acabe: o cliente volta para você, não para a farmácia da esquina.</p>${ldLista(lembrar.slice(0, 12).map((x) => ldItem(esc(x.c.nome), `${esc(x.p.nome)} · acaba ${dataCurta(x.quando)}`, {
        dir: zap(x.c.telefone, `Olá, ${primeiro(x.c.nome)}! Aqui é da ${a.empresa}. O seu ${x.p.nome} deve estar acabando por volta de ${dataCurta(x.quando)}. Quer que a gente separe ou entregue para você?`, 'Lembrar') })), 'Ninguém com remédio acabando nos próximos dias.')}`)
      + bloco('Aniversariantes de hoje', 'gift', ldLista(aniv.map((c) => ldItem(esc(c.nome), esc(c.telefone || ''), { dir: zap(c.telefone, `Feliz aniversário, ${primeiro(c.nome)}! A equipe da ${a.empresa} deseja muita saúde. Hoje você tem um presente esperando aqui na loja.`, 'Parabenizar') })), 'Nenhum aniversariante hoje.'))
      + bloco('Crediário há mais de 30 dias', 'notebook', ldLista(Object.entries(cred).map(([cid, l]) => { const c = cli(cid) || {}; const t = l.reduce((s, v) => s + total(v), 0);
        return ldItem(esc(c.nome || ''), `${moeda(t)} desde ${dataCurta(l.map((v) => v.data).sort()[0])}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Aqui é da ${a.empresa}. Consta em aberto no seu crediário ${moeda(t)}. Quando puder passar para acertar, ou se preferir, mandamos o PIX.`, 'Cobrar') }); }), 'Nenhum crediário atrasado.'))
      + bloco('Validade curta (até 60 dias)', 'hourglass', `<p>Peça troca à distribuidora ou faça promoção antes de virar perda.</p>${ldLista(curtos.slice(0, 10).map(({ p, l }) => { const f = a.db.obter('fornecedores', p.fornecedor) || {};
        return ldItem(esc(p.nome), `lote ${esc(l.lote)} · ${l.qtd} un · vence ${dataCurta(l.validade)}`, { dir: zap(f.telefone, `Olá, ${primeiro(f.contato || f.nome)}! Aqui é da ${a.empresa}. Tenho ${l.qtd} un de ${p.nome}, lote ${l.lote}, vencendo em ${dataCurta(l.validade)}. Conseguimos fazer a troca?`, 'Pedir troca') }); }), 'Nenhum lote vencendo em 60 dias.')}`)
      + bloco('Pedido à distribuidora', 'shopping-cart', ldLista(Object.entries(porF).map(([fid, l]) => { const f = a.db.obter('fornecedores', fid) || {};
        const texto = `Olá, ${primeiro(f.contato || f.nome)}! Pedido da ${a.empresa}:\n${l.map((p) => `• ${p.nome}: ${Math.max(Number(p.minimo) * 2 - est(p), Number(p.minimo))} un`).join('\n')}\nObrigado!`;
        return ldItem(esc(f.nome || 'Sem distribuidora'), `${l.length} ${l.length === 1 ? 'produto' : 'produtos'} para repor`, { dir: zap(f.telefone, texto, 'Pedir') }); }), 'Nada abaixo do mínimo.'));
  },
};

export const ITENS = [
  ['markup', 'Markup e margem', 'percent', 'calculos', 'Markup e margem'],
  ['pmc', 'Desconto até o PMC', 'tag', 'calculos', 'Desconto até o PMC'],
  ['gotas', 'Dose em gotas', 'drop', 'calculos', 'Dose em gotas'],
  ['duracao', 'Quanto dura a caixa', 'calendar-blank', 'calculos', 'Quanto dura a caixa'],
  ['continuo', 'Remédio acabando', 'heart', 'avisos', 'Uso contínuo: a caixa está acabando'],
  ['aniversario', 'Aniversariantes', 'gift', 'avisos', 'Aniversariantes de hoje'],
  ['crediario', 'Crediário atrasado', 'notebook', 'avisos', 'Crediário há mais de 30 dias'],
  ['validade', 'Validade curta', 'hourglass', 'avisos', 'Validade curta (até 60 dias)'],
  ['fornecedor', 'Pedido à distribuidora', 'shopping-cart', 'avisos', 'Pedido à distribuidora'],
];

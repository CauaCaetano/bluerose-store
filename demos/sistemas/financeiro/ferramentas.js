// Veltria Financeiro · ferramentas: juros e multa de atraso, preço com impostos, recebimento no cartão e ponto de
// equilíbrio (Básico) e contas vencidas a receber, contas a pagar da semana, equipamentos prontos e peças para repor (Pro).
import { esc, moeda, hoje, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, calc, n0, fmtN, zap, copiar, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const pessoa = (a, id) => a.db.obter('pessoas', id);

registrarCalcs({
  atraso: (f) => { const v = n0(f.valor.value), dias = n0(f.dias.value), multa = n0(f.multa.value), juros = n0(f.juros.value);
    if (!v) return 'Informe o valor da conta.';
    const m = v * multa / 100, j = v * (juros / 100) * (dias / 30);
    return `Multa (${fmtN(multa)}%): <b>${moeda(m)}</b><br>Juros (${fmtN(juros)}% ao mês × ${fmtN(dias, 0)} dias): <b>${moeda(j)}</b><br>Total a cobrar: <b>${moeda(v + m + j)}</b><br><span class="mute">Pelo Código de Defesa do Consumidor, a multa máxima é 2%.</span>`; },
  impostos: (f) => { const custo = n0(f.custo.value), imp = n0(f.imp.value), taxa = n0(f.taxa.value), m = n0(f.margem.value);
    const div = 1 - (imp + taxa + m) / 100; if (!custo) return 'Informe o custo.'; if (div <= 0) return 'Impostos, taxas e margem somam 100% ou mais.';
    const preco = custo / div;
    return `Preço de venda: <b>${moeda(preco)}</b><br>Impostos: ${moeda(preco * imp / 100)} · Taxas: ${moeda(preco * taxa / 100)} · Lucro: <b>${moeda(preco * m / 100)}</b><br><span class="mute">Cálculo por dentro (markup divisor).</span>`; },
  cartao: (f) => { const v = n0(f.valor.value), taxa = n0(f.taxa.value), parc = Math.max(1, n0(f.parcelas.value)), antec = n0(f.antec.value);
    if (!v) return 'Informe o valor da venda.';
    const liq = v * (1 - taxa / 100), comAntec = liq * (1 - (antec / 100) * (parc > 1 ? (parc + 1) / 2 : 1));
    return `Você recebe: <b>${moeda(liq)}</b> (${parc}× de ${moeda(liq / parc)})${antec ? `<br>Antecipando tudo: <b>${moeda(comAntec)}</b>` : ''}<br>Custo do cartão: <b>${moeda(v - liq)}</b>`; },
  equilibrio: (f) => { const fixos = n0(f.fixos.value), mc = n0(f.mc.value);
    if (!fixos || !mc) return 'Informe os custos fixos e a margem de contribuição.';
    return `Ponto de equilíbrio: <b>${moeda(fixos / (mc / 100))}</b> de faturamento por mês.<br>Por dia útil (22 dias): <b>${moeda(fixos / (mc / 100) / 22)}</b>`; },
});

export const LADOS = {
  calculos: () => bloco('Juros e multa de atraso', 'percent', calc('atraso', campoN('valor', 'Valor da conta (R$)', 1200) + campoN('dias', 'Dias de atraso', 15) + campoN('multa', 'Multa (%)', 2) + campoN('juros', 'Juros (% ao mês)', 1)))
    + bloco('Preço com impostos', 'calculator', calc('impostos', campoN('custo', 'Custo (R$)', 200) + campoN('imp', 'Impostos (%)', 6) + campoN('taxa', 'Taxas e comissão (%)', 4) + campoN('margem', 'Lucro desejado (%)', 25)))
    + bloco('Recebimento no cartão', 'credit-card', calc('cartao', campoN('valor', 'Valor da venda (R$)', 1500) + campoN('taxa', 'Taxa da maquininha (%)', 3.5) + campoN('parcelas', 'Parcelas', 3) + campoN('antec', 'Antecipação (% ao mês)', 0)))
    + bloco('Ponto de equilíbrio', 'scales', calc('equilibrio', campoN('fixos', 'Custos fixos do mês (R$)', 18000) + campoN('mc', 'Margem de contribuição (%)', 40))),
  avisos: (a) => {
    const lanc = a.db.lista('lancamentos').filter((l) => l.status === 'aberto');
    const receber = lanc.filter((l) => l.tipo === 'receita' && l.vencimento < hoje()).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const pagar = lanc.filter((l) => l.tipo === 'despesa' && diasAte(l.vencimento) >= 0 && diasAte(l.vencimento) <= 7).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const prontas = a.db.lista('ordens').filter((o) => o.status === 'pronta');
    const baixo = a.db.lista('produtos').filter((p) => Number(p.estoque) <= Number(p.minimo));
    const lista = baixo.map((p) => `• ${p.nome}${p.codigo ? ` (${p.codigo})` : ''}: ${Math.max(Number(p.minimo) * 2 - Number(p.estoque), Number(p.minimo))} un`).join('\n');
    return bloco('Contas a receber vencidas', 'warning', ldNums([[moeda(receber.reduce((s, l) => s + Number(l.valor || 0), 0)), 'em atraso'], [String(receber.length), 'contas']]) + ldLista(receber.slice(0, 10).map((l) => { const p = pessoa(a, l.pessoa) || {};
        return ldItem(esc(p.nome || l.descricao), `${esc(l.descricao)} · ${moeda(l.valor)} · venceu ${dataCurta(l.vencimento)}`, { dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! Consta em aberto ${l.descricao.toLowerCase()} de ${moeda(l.valor)}, com vencimento em ${dataCurta(l.vencimento)}. Posso te mandar o PIX? Se já pagou, me envie o comprovante.`, 'Cobrar') }); }), 'Nada vencido a receber.'))
      + bloco('Contas a pagar nos próximos 7 dias', 'calendar-dots', ldNums([[moeda(pagar.reduce((s, l) => s + Number(l.valor || 0), 0)), 'a pagar']]) + ldLista(pagar.map((l) => ldItem(esc(l.descricao), `${dataCurta(l.vencimento)} · ${esc(pessoa(a, l.pessoa)?.nome || '')}`, { dir: `<b class="num">${moeda(l.valor)}</b>` })), 'Nada a pagar nos próximos 7 dias.'))
      + bloco('Equipamentos prontos para retirar', 'check-circle', ldLista(prontas.map((o) => { const p = pessoa(a, o.cliente) || {};
        return ldItem(esc(o.equipamento || ''), `${esc(p.nome || '')} · OS ${o.numero}`, { dir: zap(p.telefone, `Olá, ${primeiro(p.nome)}! O seu ${o.equipamento || 'equipamento'} está pronto aqui na ${a.empresa}. Pode vir buscar quando quiser.`, 'Avisar') }); }), 'Nenhum equipamento esperando retirada.'))
      + bloco('Peças para repor', 'shopping-cart', baixo.length ? `<pre class="ld-pre">${esc(lista)}</pre><div class="ld-atalhos">${copiar(`Olá! Pedido da ${a.empresa}:\n${lista}\nObrigado!`, 'Copiar o pedido')}</div>` : ldLista([], 'Nenhuma peça abaixo do mínimo.'));
  },
};

export const ITENS = [
  ['atraso', 'Juros e multa de atraso', 'percent', 'calculos', 'Juros e multa'],
  ['impostos', 'Preço com impostos', 'calculator', 'calculos', 'Preço com impostos'],
  ['cartao', 'Recebimento no cartão', 'credit-card', 'calculos', 'Recebimento no cartão'],
  ['equilibrio', 'Ponto de equilíbrio', 'scales', 'calculos', 'Ponto de equilíbrio'],
  ['receber', 'Cobrar vencidos', 'warning', 'avisos', 'Contas a receber vencidas'],
  ['pagar', 'Contas da semana', 'calendar-dots', 'avisos', 'Contas a pagar'],
  ['prontos', 'Prontos para retirar', 'check-circle', 'avisos', 'Equipamentos prontos'],
  ['pecas', 'Peças para repor', 'shopping-cart', 'avisos', 'Peças para repor'],
];

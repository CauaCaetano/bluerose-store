// Veltria Imobiliária · ferramentas ao lado das telas: financiamento (SAC e Price), custos da compra, comissão,
// imóveis parados, reajuste do aluguel, contratos vencendo, aluguéis em atraso e visitas de amanhã.
import { esc, moeda, hoje, diaMais, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const pessoa = (a, id) => a.db.obter('pessoas', id);
const imovel = (a, id) => a.db.obter('imoveis', id);
const titulo = (im) => (im ? `${im.codigo} · ${im.tipo} · ${im.bairro}` : '');

registrarCalcs({
  financiamento: (f) => { const valor = n0(f.valor.value), entrada = n0(f.entrada.value), taxa = n0(f.taxa.value), meses = Math.max(1, n0(f.meses.value));
    const pv = valor - entrada; if (pv <= 0) return 'O valor financiado precisa ser maior que a entrada.';
    const i = Math.pow(1 + taxa / 100, 1 / 12) - 1, price = i ? pv * i / (1 - Math.pow(1 + i, -meses)) : pv / meses, amort = pv / meses;
    return `Financiado: <b>${moeda(pv)}</b> (entrada de ${fmtN(valor ? entrada / valor * 100 : 0)}%)<br><b>SAC</b>: 1ª parcela <b>${moeda(amort + pv * i)}</b>, última <b>${moeda(amort * (1 + i))}</b><br><b>Price</b>: parcelas fixas de <b>${moeda(price)}</b><br><span class="mute">Sem seguros e taxas do banco. Renda mínima usual (parcela até 30%): ${moeda((amort + pv * i) / 0.3)} no SAC.</span>`; },
  custos: (f) => { const v = n0(f.valor.value), itbi = n0(f.itbi.value), cart = n0(f.cartorio.value); if (!v) return 'Informe o valor do imóvel.';
    return `ITBI (${fmtN(itbi)}%): <b>${moeda(v * itbi / 100)}</b><br>Escritura e registro (~${fmtN(cart)}%): <b>${moeda(v * cart / 100)}</b><br>Total além do preço: <b>${moeda(v * (itbi + cart) / 100)}</b><br><span class="mute">A alíquota do ITBI muda por cidade; confira na prefeitura.</span>`; },
  comissao: (f) => { const v = n0(f.valor.value), pct = n0(f.pct.value), cap = n0(f.captador.value), ven = n0(f.vendedor.value); if (!v) return 'Informe o valor do negócio.';
    const c = v * pct / 100;
    return `Comissão (${fmtN(pct)}%): <b>${moeda(c)}</b><br>Captador (${fmtN(cap)}%): <b>${moeda(c * cap / 100)}</b> · Vendedor (${fmtN(ven)}%): <b>${moeda(c * ven / 100)}</b><br>Imobiliária: <b>${moeda(c * (100 - cap - ven) / 100)}</b>`; },
  reajuste: (f) => { const v = n0(f.aluguel.value), idx = n0(f.indice.value); if (!v) return 'Informe o aluguel atual.';
    return `Novo aluguel: <b>${moeda(v * (1 + idx / 100))}</b> (${idx >= 0 ? '+' : ''}${fmtN(idx, 2)}%, ${moeda(v * idx / 100)} a mais por mês).<br><span class="mute">Use o índice acumulado em 12 meses do contrato (IGP-M, IPCA…). Índice negativo: combine com o proprietário.</span>`; },
});

export const LADOS = {
  imoveis: (a) => {
    const parados = a.db.lista('imoveis').filter((im) => im.status === 'disponivel' && im.captado && diasAte(im.captado) < -90).sort((x, y) => x.captado.localeCompare(y.captado));
    return bloco('Simular financiamento', 'bank', calc('financiamento', campoN('valor', 'Valor do imóvel (R$)', 600000) + campoN('entrada', 'Entrada (R$)', 120000) + campoN('taxa', 'Juros (% ao ano)', 11) + campoN('meses', 'Prazo (meses)', 360)))
      + bloco('Custos da compra', 'receipt', calc('custos', campoN('valor', 'Valor do imóvel (R$)', 600000) + campoN('itbi', 'ITBI (%)', 2.7) + campoN('cartorio', 'Escritura e registro (%)', 1.5)))
      + bloco('Comissão', 'hand-coins', calc('comissao', campoN('valor', 'Valor do negócio (R$)', 600000) + campoN('pct', 'Comissão (%)', 6) + campoN('captador', 'Parte do captador (%)', 30) + campoN('vendedor', 'Parte do vendedor (%)', 40)))
      + bloco('Disponíveis há mais de 90 dias', 'hourglass', `<p>Vale revisar o preço, as fotos ou o anúncio.</p>${ldLista(parados.slice(0, 8).map((im) => ldItem(esc(titulo(im)), `${moeda(im.valor)}${im.finalidade === 'aluguel' ? '/mês' : ''} · captado em ${dataCurta(im.captado)} · ${Number(im.visualizacoes) || 0} visualizações`, { attrs: `data-abrir="imovel:${im.id}"` })), 'Nenhum imóvel parado há mais de 90 dias.')}`);
  },
  locacao: (a) => {
    const vencendo = a.db.lista('contratos').filter((c) => c.status === 'ativo' && c.fim && diasAte(c.fim) >= 0 && diasAte(c.fim) <= 90).sort((x, y) => x.fim.localeCompare(y.fim));
    const atraso = a.db.lista('cobrancas').filter((c) => c.status === 'aberto' && c.vencimento < hoje()).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
    const total = atraso.reduce((s, c) => s + Number(c.valor || 0), 0);
    return bloco('Reajuste do aluguel', 'trend-up', calc('reajuste', campoN('aluguel', 'Aluguel atual (R$)', 3500) + campoN('indice', 'Índice acumulado (%)', 4.5)))
      + bloco('Contratos que vencem em 90 dias', 'calendar-dots', `<p>Fale com o inquilino antes: renovar é mais barato que buscar outro.</p>${ldLista(vencendo.map((c) => { const inq = pessoa(a, c.inquilino) || {}, im = imovel(a, c.imovel);
        return ldItem(esc(titulo(im)), `${esc(inq.nome || '')} · vence ${dataCurta(c.fim)}`, { dir: zap(inq.telefone, `Olá, ${primeiro(inq.nome)}! Aqui é da ${a.empresa}. O contrato de locação do imóvel ${im?.endereco || ''} vence em ${dataCurta(c.fim)}. Você tem interesse em renovar? Posso já preparar a renovação.`, 'Renovar') }); }), 'Nenhum contrato vencendo nos próximos 90 dias.')}`)
      + bloco('Aluguéis em atraso', 'warning', `${ldNums([[moeda(total), 'em atraso'], [String(atraso.length), atraso.length === 1 ? 'cobrança' : 'cobranças']])}${ldLista(atraso.slice(0, 10).map((cb) => { const ct = a.db.obter('contratos', cb.contrato) || {}, inq = pessoa(a, ct.inquilino) || {};
        return ldItem(esc(inq.nome || ''), `${moeda(cb.valor)} · venceu ${dataCurta(cb.vencimento)}`, { dir: zap(inq.telefone, `Olá, ${primeiro(inq.nome)}! O aluguel de ${moeda(cb.valor)} com vencimento em ${dataCurta(cb.vencimento)} consta em aberto. Posso te mandar o boleto ou o PIX? Se já pagou, me envie o comprovante.`, 'Cobrar') }); }), 'Nenhum aluguel em atraso.')}`);
  },
  visitas: (a) => {
    const amanha = diaMais(1), vs = a.db.lista('visitas').filter((v) => v.data === amanha && v.status === 'agendada').sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
    return bloco('Confirmar as visitas de amanhã', 'calendar-check', ldLista(vs.map((v) => { const c = pessoa(a, v.cliente) || {}, im = imovel(a, v.imovel);
      return ldItem(esc(c.nome || ''), `${v.hora || ''} · ${esc(titulo(im))}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Confirmando a visita amanhã, ${dataCurta(amanha)}, às ${v.hora}, no imóvel ${im?.endereco || ''} (${im?.bairro || ''}). Posso confirmar?`, 'Confirmar') }); }), 'Nenhuma visita marcada para amanhã.'));
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['financiamento', 'Simular financiamento', 'bank', 'imoveis', 'Simular'],
  ['custos', 'Custos da compra', 'receipt', 'imoveis', 'Custos'],
  ['comissao', 'Comissão', 'hand-coins', 'imoveis', 'Comissão'],
  ['reajuste', 'Reajuste do aluguel', 'trend-up', 'locacao', 'Reajuste'],
  ['parados', 'Imóveis parados', 'hourglass', 'imoveis', 'Disponíveis'],
  ['vencendo', 'Contratos vencendo', 'calendar-dots', 'locacao', 'Contratos'],
  ['atraso', 'Aluguéis em atraso', 'warning', 'locacao', 'Aluguéis em atraso'],
  ['visitas', 'Confirmar visitas', 'calendar-check', 'visitas', 'Confirmar as visitas'],
];

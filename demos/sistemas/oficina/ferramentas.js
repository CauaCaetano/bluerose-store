// Veltria Oficina · ferramentas ao lado das telas: orçamento rápido, carros parados no pátio, prontos para retirar,
// confirmação dos agendamentos de amanhã, pedido de peças, consumo do carro, conversor de unidades e clientes sumidos.
import { esc, moeda, diaMais, diasAte, dataCurta } from '../base/nexo.js';
import { bloco, ldLista, ldItem, campoN, campoS, calc, n0, fmtN, zap, copiar, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const cliente = (a, id) => a.db.obter('clientes', id);
const veiculo = (a, id) => a.db.obter('veiculos', id);
const carro = (v) => (v ? `${v.modelo} · ${v.placa}` : '');
const ETAPA = { entrada: 'na entrada', orcamento: 'em orçamento', aprovado: 'aprovado', peca: 'esperando peça', servico: 'em serviço', pronto: 'pronto', entregue: 'entregue' };

registrarCalcs({
  orcamento: (f) => { const h = n0(f.horas.value), vh = n0(f.valorh.value), pecas = n0(f.pecas.value), margem = n0(f.margem.value), desc = n0(f.desconto.value);
    const mo = h * vh, pv = pecas * (1 + margem / 100), sub = mo + pv, total = sub * (1 - desc / 100);
    return sub ? `Mão de obra: <b>${moeda(mo)}</b> (${fmtN(h)} h × ${moeda(vh)})<br>Peças com ${fmtN(margem)}% de margem: <b>${moeda(pv)}</b><br>${desc ? `Desconto ${fmtN(desc)}%: −${moeda(sub - total)}<br>` : ''}Total para o cliente: <b>${moeda(total)}</b><br>Lucro nas peças: <b>${moeda(pv - pecas)}</b>` : 'Informe as horas e as peças.'; },
  consumo: (f) => { const km = n0(f.km.value), litros = n0(f.litros.value), preco = n0(f.preco.value); if (!km || !litros) return 'Informe os km rodados e os litros abastecidos.';
    const kml = km / litros;
    return `Consumo: <b>${fmtN(kml)} km/l</b><br>Custo por km: <b>${moeda(preco / kml)}</b>${preco ? `<br>Para rodar 1.000 km: <b>${moeda((1000 / kml) * preco)}</b>` : ''}`; },
  unidades: (f) => { const v = n0(f.valor.value), t = f.tipo.value;
    const r = { psi: `${fmtN(v)} psi = <b>${fmtN(v * 0.0689476, 2)} bar</b>`, bar: `${fmtN(v, 2)} bar = <b>${fmtN(v / 0.0689476)} psi</b>`, nm: `${fmtN(v)} N·m = <b>${fmtN(v / 9.80665, 2)} kgf·m</b>`, kgfm: `${fmtN(v, 2)} kgf·m = <b>${fmtN(v * 9.80665)} N·m</b>` }[t];
    return v ? r : 'Informe o valor.'; },
});

export const LADOS = {
  ordens: () => bloco('Orçamento rápido', 'calculator', `<p>Para responder o cliente na hora, antes de abrir a ordem.</p>${calc('orcamento', campoN('horas', 'Horas de serviço', 2) + campoN('valorh', 'Valor da hora (R$)', 150) + campoN('pecas', 'Custo das peças (R$)', 300) + campoN('margem', 'Margem nas peças (%)', 40) + campoN('desconto', 'Desconto (%)', 0))}`),
  patio: (a) => {
    const os = a.db.lista('ordens'), parados = os.filter((o) => !['entregue', 'pronto'].includes(o.etapa) && o.entrada && diasAte(o.entrada) <= -3).sort((x, y) => x.entrada.localeCompare(y.entrada));
    const prontos = os.filter((o) => o.etapa === 'pronto');
    return bloco('Prontos esperando o cliente', 'check-circle', ldLista(prontos.map((o) => { const c = cliente(a, o.cliente) || {}, v = veiculo(a, o.veiculo);
        return ldItem(esc(carro(v)), `${esc(c.nome || '')} · OS ${o.numero}`, { attrs: `data-abrir="os:${o.id}"`, dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! O seu ${v?.modelo || 'carro'} (${v?.placa || ''}) está pronto aqui na ${a.empresa}. Pode vir buscar quando quiser. Qualquer dúvida, me chama.`, 'Avisar') }); }), 'Nenhum carro esperando retirada.'))
      + bloco('No pátio há 3 dias ou mais', 'hourglass', ldLista(parados.slice(0, 10).map((o) => { const v = veiculo(a, o.veiculo);
        return ldItem(esc(carro(v)), `entrou ${dataCurta(o.entrada)} · ${ETAPA[o.etapa] || o.etapa}`, { attrs: `data-abrir="os:${o.id}"` }); }), 'Nenhum carro parado há mais de 3 dias.'));
  },
  agenda: (a) => {
    const amanha = diaMais(1), ags = a.db.lista('agendamentos').filter((g) => g.data === amanha).sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
    return bloco('Confirmar os agendamentos de amanhã', 'calendar-check', ldLista(ags.map((g) => { const c = cliente(a, g.cliente) || {}, v = veiculo(a, g.veiculo);
      return ldItem(esc(c.nome || ''), `${g.hora || ''} · ${esc(g.servico || '')} · ${esc(carro(v))}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Confirmando o ${g.servico || 'serviço'} do seu ${v?.modelo || 'carro'} amanhã, ${dataCurta(amanha)}, às ${g.hora}, na ${a.empresa}. Posso confirmar?`, 'Confirmar') }); }), 'Nenhum agendamento para amanhã.'));
  },
  estoque: (a) => {
    const baixo = a.db.lista('pecas').filter((p) => Number(p.estoque) <= Number(p.minimo)).sort((x, y) => x.nome.localeCompare(y.nome));
    const lista = baixo.map((p) => `• ${p.nome}${p.codigo ? ` (${p.codigo})` : ''}: ${Math.max(Number(p.minimo) * 2 - Number(p.estoque), Number(p.minimo))} un`).join('\n');
    const texto = `Olá! Pedido da ${a.empresa}:\n${lista}\nObrigado!`;
    return bloco('Pedido de peças ao fornecedor', 'shopping-cart', baixo.length
      ? `<p>${baixo.length} ${baixo.length === 1 ? 'peça está' : 'peças estão'} no mínimo ou abaixo. A quantidade sugerida repõe até o dobro do mínimo.</p><pre class="ld-pre">${esc(lista)}</pre><div class="ld-atalhos">${copiar(texto, 'Copiar o pedido')}<a class="btn peq" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Mandar no WhatsApp</a></div>`
      : ldLista([], 'Nenhuma peça abaixo do mínimo.'));
  },
  veiculos: (a) => {
    const ult = {}; a.db.lista('ordens').filter((o) => o.etapa === 'entregue').forEach((o) => { const d = o.entregue_em || o.entrada; if (!ult[o.cliente] || d > ult[o.cliente]) ult[o.cliente] = d; });
    const sumidos = a.db.lista('clientes').filter((c) => ult[c.id] && diasAte(ult[c.id]) < -180).sort((x, y) => ult[x.id].localeCompare(ult[y.id]));
    return bloco('Clientes sem voltar há 6 meses', 'megaphone', `<p>Lembrar da revisão traz o cliente de volta.</p>${ldLista(sumidos.slice(0, 10).map((c) => ldItem(esc(c.nome), `último serviço em ${dataCurta(ult[c.id])}`, {
        dir: zap(c.telefone, `Olá, ${primeiro(c.nome)}! Aqui é da ${a.empresa}. Já faz uns meses desde o último serviço no seu carro. Que tal agendar uma revisão? Fazemos check-up de óleo, freios e suspensão. Me diga o melhor dia.`, 'Chamar') })), 'Nenhum cliente sumido.')}`)
      + bloco('Consumo e custo por km', 'gas-pump', calc('consumo', campoN('km', 'Km rodados', 450) + campoN('litros', 'Litros abastecidos', 40) + campoN('preco', 'Preço do litro (R$)', 6)))
      + bloco('Converter unidades', 'gauge', calc('unidades', campoN('valor', 'Valor', 32) + campoS('tipo', 'De', [['psi', 'psi → bar (pneu)'], ['bar', 'bar → psi (pneu)'], ['nm', 'N·m → kgf·m (torque)'], ['kgfm', 'kgf·m → N·m (torque)']])));
  },
};

// cada ferramenta como item próprio no menu da esquerda: [id, rótulo, ícone, aba de origem, começo do título do bloco]
export const ITENS = [
  ['orcamento', 'Orçamento rápido', 'calculator', 'ordens', 'Orçamento rápido'],
  ['consumo', 'Consumo e custo por km', 'gas-pump', 'veiculos', 'Consumo'],
  ['unidades', 'Converter unidades', 'gauge', 'veiculos', 'Converter'],
  ['prontos', 'Prontos para retirar', 'check-circle', 'patio', 'Prontos'],
  ['parados', 'Parados no pátio', 'hourglass', 'patio', 'No pátio'],
  ['agendamentos', 'Confirmar agendamentos', 'calendar-check', 'agenda', 'Confirmar os agendamentos'],
  ['pecas', 'Pedido de peças', 'shopping-cart', 'estoque', 'Pedido de peças'],
  ['sumidos', 'Clientes sumidos', 'megaphone', 'veiculos', 'Clientes sem voltar'],
];

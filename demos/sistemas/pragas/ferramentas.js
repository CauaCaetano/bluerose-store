// Blue Rose Guard · ferramentas: diluição, volume de calda, preço do serviço e fim da garantia (Básico)
// e serviços de amanhã, garantias acabando, produtos e licenças vencendo e serviços a receber (Pro).
import { esc, moeda, hoje, diaMais, diasAte, dataCurta, dataBR } from '../base/nexo.js';
import { bloco, ldLista, ldItem, ldNums, campoN, campoD, calc, n0, fmtN, zap, registrarCalcs } from '../base/lado.js';

const primeiro = (n) => String(n || '').split(' ')[0];
const cliente = (a, id) => a.db.obter('clientes', id);

registrarCalcs({
  diluicao: (f) => { const conc = n0(f.conc.value), desejada = n0(f.desejada.value), volume = n0(f.volume.value);
    if (!conc || !desejada || !volume) return 'Informe as concentrações e o volume de calda.';
    if (desejada >= conc) return 'A concentração desejada precisa ser menor que a do produto.';
    const prod = volume * desejada / conc;
    return `Produto: <b>${fmtN(prod * 1000, 0)} ml</b> para ${fmtN(volume)} L de calda (${fmtN(volume - prod, 2)} L de água).<br><span class="mute">Siga sempre a dose do rótulo e da ficha técnica.</span>`; },
  calda: (f) => { const area = n0(f.area.value), lm2 = n0(f.lm2.value), dose = n0(f.dose.value);
    if (!area) return 'Informe a área.';
    const litros = area * lm2;
    return `Calda: <b>${fmtN(litros)} L</b> para ${fmtN(area, 0)} m².${dose ? `<br>Produto (${fmtN(dose)} ml/L): <b>${fmtN(litros * dose, 0)} ml</b>` : ''}`; },
  preco: (f) => { const area = n0(f.area.value), m2 = n0(f.m2.value), minimo = n0(f.minimo.value), desloc = n0(f.desloc.value);
    if (!area) return 'Informe a área.';
    const v = Math.max(area * m2, minimo) + desloc;
    return `Preço do serviço: <b>${moeda(v)}</b>${area * m2 < minimo ? ' (valor mínimo)' : ''}${desloc ? `, com ${moeda(desloc)} de deslocamento` : ''}.`; },
  garantia: (f) => { const d = f.data.value, dias = n0(f.dias.value); if (!d) return 'Informe a data do serviço.';
    const fim = diaMais(dias, d), resta = diasAte(fim);
    return `Garantia até <b>${dataBR(fim)}</b>${resta >= 0 ? ` (faltam ${resta} dias)` : ' (já venceu)'}.<br>Agende a próxima aplicação para antes dessa data.`; },
});

export const LADOS = {
  calculos: () => bloco('Diluição do produto', 'drop', calc('diluicao', campoN('conc', 'Concentração do produto (%)', 2.5) + campoN('desejada', 'Concentração na calda (%)', 0.05) + campoN('volume', 'Volume de calda (L)', 10)))
    + bloco('Volume de calda', 'ruler', calc('calda', campoN('area', 'Área (m²)', 200) + campoN('lm2', 'Litros por m²', 0.05) + campoN('dose', 'Produto por litro (ml)', 20)))
    + bloco('Preço do serviço', 'calculator', calc('preco', campoN('area', 'Área (m²)', 300) + campoN('m2', 'Valor por m² (R$)', 1.2) + campoN('minimo', 'Valor mínimo (R$)', 250) + campoN('desloc', 'Deslocamento (R$)', 30)))
    + bloco('Fim da garantia', 'shield-check', calc('garantia', campoD('data', 'Data do serviço', hoje()) + campoN('dias', 'Garantia (dias)', 90))),
  avisos: (a) => {
    const os = a.db.lista('ordens'), amanha = diaMais(1);
    const deAmanha = os.filter((o) => o.status === 'agendada' && o.data === amanha).sort((x, y) => String(x.hora).localeCompare(String(y.hora)));
    const garantias = os.filter((o) => o.status === 'executada' && o.garantia).map((o) => ({ o, fim: diaMais(Number(o.garantia), o.data) })).filter((x) => diasAte(x.fim) >= 0 && diasAte(x.fim) <= 15 && !os.some((y) => y.cliente === x.o.cliente && y.status === 'agendada'));
    const prod = a.db.lista('produtos').filter((p) => Number(p.estoque) <= Number(p.minimo) || (p.validade && diasAte(p.validade) <= 60));
    const cfg = a.db.cfg || {}, lic = [['Licença sanitária', cfg.licenca_sanitaria_validade], ['Licença ambiental', cfg.licenca_ambiental_validade]].filter(([, d]) => d && diasAte(d) <= 60);
    const receber = os.filter((o) => o.status === 'executada' && !o.pago && Number(o.valor) > 0).sort((x, y) => x.data.localeCompare(y.data));
    return bloco('Serviços de amanhã', 'calendar-check', ldLista(deAmanha.map((o) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `${o.hora || ''} · ${esc(o.servico || '')}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Confirmando o serviço de ${String(o.servico || 'controle de pragas').toLowerCase()} amanhã, ${dataCurta(amanha)}, às ${o.hora}. Deixe o local liberado e, se possível, sem pessoas e animais durante a aplicação. Posso confirmar?`, 'Confirmar') }); }), 'Nenhum serviço amanhã.'))
      + bloco('Garantias acabando (15 dias)', 'shield-check', `<p>Ofereça a próxima aplicação antes de a garantia acabar.</p>${ldLista(garantias.map(({ o, fim }) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `${esc(o.servico || '')} · garantia até ${dataCurta(fim)}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! A garantia do último serviço (${o.servico}) vai até ${dataCurta(fim)}. Para continuar protegido, que tal agendar a próxima aplicação?`, 'Oferecer') }); }), 'Nenhuma garantia acabando.')}`)
      + bloco('Produtos e licenças vencendo', 'seal-warning', ldLista([...lic.map(([n, d]) => ldItem(esc(n), diasAte(d) < 0 ? `venceu em ${dataCurta(d)}` : `vence em ${dataCurta(d)}`)), ...prod.map((p) => ldItem(esc(p.nome), [Number(p.estoque) <= Number(p.minimo) ? `estoque ${fmtN(Number(p.estoque))} (mínimo ${fmtN(Number(p.minimo))})` : '', p.validade && diasAte(p.validade) <= 60 ? `validade ${dataCurta(p.validade)}` : ''].filter(Boolean).join(' · ')))], 'Produtos e licenças em dia.'))
      + bloco('Serviços a receber', 'hand-coins', ldNums([[moeda(receber.reduce((s, o) => s + Number(o.valor || 0), 0)), 'a receber']]) + ldLista(receber.slice(0, 10).map((o) => { const c = cliente(a, o.cliente) || {};
        return ldItem(esc(c.nome || ''), `${dataCurta(o.data)} · ${moeda(o.valor)}`, { dir: zap(c.telefone, `Olá, ${primeiro(c.contato || c.nome)}! Consta em aberto o serviço de ${dataCurta(o.data)} (${moeda(o.valor)}). Posso te mandar o PIX?`, 'Cobrar') }); }), 'Nada a receber.'));
  },
};

export const ITENS = [
  ['diluicao', 'Diluição do produto', 'drop', 'calculos', 'Diluição'],
  ['calda', 'Volume de calda', 'ruler', 'calculos', 'Volume de calda'],
  ['preco', 'Preço do serviço', 'calculator', 'calculos', 'Preço do serviço'],
  ['garantia', 'Fim da garantia', 'shield-check', 'calculos', 'Fim da garantia'],
  ['amanha', 'Serviços de amanhã', 'calendar-check', 'avisos', 'Serviços de amanhã'],
  ['garantias', 'Garantias acabando', 'shield-check', 'avisos', 'Garantias acabando'],
  ['vencendo', 'Produtos e licenças', 'seal-warning', 'avisos', 'Produtos e licenças'],
  ['receber', 'Serviços a receber', 'hand-coins', 'avisos', 'Serviços a receber'],
];

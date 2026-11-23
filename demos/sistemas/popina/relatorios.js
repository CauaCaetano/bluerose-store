// Popina · relatórios simples: quanto vendeu, o que mais sai, em que horário e cada garçom.
import { db, t, din, r2, inicioDoDia, pagamentosVenda, FORMA_FIADO } from './loja.js?v=59';
import { ir } from './nucleo.js?v=59';
import { $$ } from './ui.js?v=59';
import { G, volta } from './gestao.js?v=59';
import { blocoRelatorio } from './ifood.js?v=59';

let periodo = 'hoje';
const PER = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['30', '30 dias']];
function intervalo() {
  const h = inicioDoDia();
  if (periodo === 'ontem') return [h - 864e5, h - 1];
  if (periodo === '7') return [h - 6 * 864e5, Infinity];
  if (periodo === '30') return [h - 29 * 864e5, Infinity];
  return [h, Infinity];
}
const barras = (l, fmt = din) => { const m = Math.max(1, ...l.map((x) => x[1])); return `<div class="barras">${l.map(([n, v]) => `<div class="barra"><span title="${t(n)}">${t(n)}</span><span class="tr"><i style="width:${Math.max(2, (v / m) * 100)}%"></i></span><b class="num">${fmt(v)}</b></div>`).join('')}</div>`; };
G.relatorios = {
  titulo: 'Relatórios',
  html() {
    const [de, ate] = intervalo(), vs = db.vendas.filter((v) => v.ts >= de && v.ts <= ate && !v.cancelado);
    const total = r2(vs.reduce((s, v) => s + v.total, 0)), ticket = vs.length ? total / vs.length : 0;
    const formas = {}; vs.forEach((v) => pagamentosVenda(v).forEach((p) => { const k = p.forma === FORMA_FIADO ? 'Fiado' : p.forma; formas[k] = r2((formas[k] || 0) + (Number(p.valor) || 0)); }));
    const tipos = {}; vs.forEach((v) => { const k = v.tipo === 'mesa' ? 'Salão' : v.tipo === 'delivery' ? 'Entrega' : 'Balcão e retirada'; tipos[k] = r2((tipos[k] || 0) + v.total); });
    // de onde veio o pedido: cardápio online, WhatsApp/telefone, balcão ou garçom na mesa
    const ORG = { 'Telefone ou WhatsApp': 'WhatsApp ou telefone', WhatsApp: 'WhatsApp ou telefone', Telefone: 'WhatsApp ou telefone' };
    const origens = {}; vs.forEach((v) => { const k = v.tipo === 'mesa' ? 'Mesa (garçom ou QR)' : ORG[v.origem] || v.origem || 'Balcão'; const x = (origens[k] ||= [0, 0]); x[0]++; x[1] = r2(x[1] + v.total); });
    const recusados = (db.recusados || []).filter((r) => r.ts >= de && r.ts <= ate);
    const itens = {}; vs.forEach((v) => (v.itens || []).forEach((i) => { const k = String(i.nome).replace(/ \([^)]*\)$/, '').replace(/ · .*$/, '').replace(/^Pizza meia .*/, 'Pizza meio a meio'); const x = (itens[k] ||= [0, 0]); x[0] += i.kg ? 1 : i.qtd; x[1] = r2(x[1] + (i.preco || 0) * (i.qtd || 1)); }));
    const top = Object.entries(itens).sort((a, b) => b[1][0] - a[1][0]).slice(0, 10);
    const horas = Array(24).fill(0); vs.forEach((v) => { horas[new Date(v.ts).getHours()] += v.total; });
    const hMin = Math.min(...horas.map((v, h) => (v ? h : 99)), 11), hMax = Math.max(...horas.map((v, h) => (v ? h : 0)), 22), hs = horas.slice(hMin, hMax + 1), mH = Math.max(1, ...hs);
    const garc = {}; vs.filter((v) => v.tipo === 'mesa').forEach((v) => { const k = v.garcom || 'Sem garçom'; const x = (garc[k] ||= { mesas: 0, total: 0, servico: 0 }); x.mesas++; x.total = r2(x.total + v.total); x.servico = r2(x.servico + (v.servico || 0)); });
    const dias = {}; if (periodo === '7' || periodo === '30') vs.forEach((v) => { const k = new Date(v.ts).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); dias[k] = r2((dias[k] || 0) + v.total); });
    return volta('Relatórios', 'Vendas fechadas (as canceladas ficam de fora)') + `
    <div class="chips" role="group" aria-label="Período">${PER.map(([k, n]) => `<button type="button" class="chip" data-per="${k}" aria-pressed="${periodo === k}">${n}</button>`).join('')}</div>
    <div class="kpis"><div><small>Vendido</small><b>${din(total)}</b></div><div><small>Vendas</small><b>${vs.length}</b></div><div><small>Ticket médio</small><b>${din(ticket)}</b></div><div><small>Taxa de serviço</small><b>${din(vs.reduce((s, v) => s + (v.servico || 0), 0))}</b></div>${recusados.length ? `<div><small>Pedidos recusados</small><b>${recusados.length}</b><span>${din(recusados.reduce((s, r) => s + (r.total || 0), 0))} que não entrou</span></div>` : ''}</div>
    ${vs.length ? `<div class="duas" style="margin-top:16px">
      <div class="cartao"><h2>Mais vendidos</h2>${barras(top.map(([n, [q]]) => [n, q]), (q) => `${q}×`)}</div>
      <div class="cartao"><h2>Por horário</h2><div class="horas" role="img" aria-label="Vendas por hora">${hs.map((v, k) => `<div title="${hMin + k}h: ${din(v)}"><i style="height:${Math.max(v ? 4 : 0, (v / mH) * 120)}px"></i><small>${hMin + k}h</small></div>`).join('')}</div>
        <p class="mudo" style="margin-top:8px">Horário de mais movimento: ${hs.indexOf(Math.max(...hs)) + hMin}h.</p></div>
      <div class="cartao"><h2>Por forma de pagamento</h2>${barras(Object.entries(formas).sort((a, b) => b[1] - a[1]))}</div>
      <div class="cartao"><h2>Por tipo</h2>${barras(Object.entries(tipos).sort((a, b) => b[1] - a[1]))}</div>
      <div class="cartao"><h2>Por origem do pedido</h2>${barras(Object.entries(origens).sort((a, b) => b[1][1] - a[1][1]).map(([k, [, v]]) => [k, v]))}
        <p class="mudo" style="margin-top:8px">${Object.entries(origens).sort((a, b) => b[1][0] - a[1][0]).map(([k, [q, v]]) => `${t(k)}: ${q} ${q === 1 ? 'pedido' : 'pedidos'}, média ${din(v / q)}`).join(' · ')}</p></div>
      ${blocoRelatorio(vs)}
      ${recusados.length ? `<div class="cartao"><h2>Por que recusou</h2>${barras(Object.entries(recusados.reduce((o, r) => { const k = r.motivo || 'Sem motivo'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]), (q) => `${q}×`)}</div>` : ''}
      ${Object.keys(dias).length ? `<div class="cartao"><h2>Por dia</h2>${barras(Object.entries(dias))}</div>` : ''}
      <div class="cartao"><h2>Garçons</h2>${Object.keys(garc).length ? `<div class="rolo" style="box-shadow:none"><table class="tabela"><thead><tr><th>Garçom</th><th class="n">Mesas</th><th class="n">Vendido</th><th class="n">10%</th></tr></thead><tbody>${Object.entries(garc).sort((a, b) => b[1].total - a[1].total).map(([g, x]) => `<tr><td><b>${t(g)}</b></td><td class="n">${x.mesas}</td><td class="n">${din(x.total)}</td><td class="n"><b>${din(x.servico)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="mudo">Nenhuma mesa fechada no período.</p>'}</div>
    </div>` : '<p class="vazio" style="margin-top:16px">Nenhuma venda neste período.</p>'}`;
  },
  montar(el) { $$('[data-per]', el).forEach((b) => { b.onclick = () => { periodo = b.dataset.per; ir('mais/relatorios'); }; }); },
};

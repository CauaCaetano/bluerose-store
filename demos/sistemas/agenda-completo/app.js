// Veltria Agenda Completo · protótipo "balcão da recepção" para salão com equipe.
// À esquerda a fila (quem chegou, quem está na cadeira, quem vai pagar), no meio a grade de cada profissional,
// à direita a comanda aberta com serviços, produtos e pacote. Mais: clientes, pacotes, produtos, comissões,
// caixa do dia, lembretes automáticos, relatórios, equipe, ajustes e assistente. Dados de exemplo (?novo recomeça).

const CHAVE = 'veltria-agenda-completo-v1';
const R$ = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const es = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const hm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const $ = (s) => document.querySelector(s);
const PX = 52, ABRE = 8, FECHA = 20;
const agoraH = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };

function semente() {
  const pros = [['p1', 'Rose', 'Cabelo e coloração', '#425c70', 45], ['p2', 'Kátia', 'Cabelo e escova', '#94624f', 40], ['p3', 'Amanda', 'Unhas', '#6f8a82', 50], ['p4', 'Júlio', 'Barba e corte masculino', '#7b6f8f', 45]].map(([id, nome, area, cor, com]) => ({ id, nome, area, cor, com, comProd: 10 }));
  const servs = [['corte-f', 'Corte feminino', 60, 90], ['escova', 'Escova', 45, 55], ['color', 'Coloração', 120, 220], ['mechas', 'Mechas', 180, 380], ['hidrat', 'Hidratação', 45, 80], ['mao', 'Manicure', 45, 38], ['pe', 'Pedicure', 50, 42], ['gel', 'Unha em gel', 120, 150], ['corte-m', 'Corte masculino', 40, 55], ['barba', 'Barba', 30, 40]].map(([id, nome, min, preco]) => ({ id, nome, min, preco }));
  const prods = [['Shampoo Kérastase 250 ml', 189, 112, 6, 3], ['Máscara Wella 150 ml', 129, 74, 2, 3], ['Óleo reparador', 98, 51, 9, 4], ['Esmalte em gel (un.)', 32, 14, 24, 10], ['Pomada modeladora', 65, 31, 1, 4]].map(([nome, preco, custo, qtd, min]) => ({ id: uid(), nome, preco, custo, qtd, min }));
  const clientes = [['Helena Duarte', '31997650001', '14/11', 'Coloração 6.1, sem amônia'], ['Marcela Viana', '31997650002', '03/12', 'Cabelo fino, não gosta de secador quente'], ['Joana Pires', '31997650003', '22/10', 'Alérgica a acetona'], ['Rafael Gomes', '31997650004', '09/01', 'Degradê baixo, máquina 1'], ['Larissa Campos', '31997650005', '27/10', 'Mechas finas, tonalizante pérola'], ['Beatriz Alves', '31997650006', '15/02', ''], ['Cláudia Neves', '31997650007', '30/10', 'Prefere a Kátia'], ['Pedro Souza', '31997650008', '05/05', ''], ['Sônia Ramos', '31997650009', '18/03', 'Pacote de escova'], ['Tatiane Mello', '31997650010', '11/08', '']].map(([nome, tel, niver, obs]) => ({ id: uid(), nome, tel, niver, obs, visitas: 3 + nome.length % 9, gasto: 400 + nome.length * 83 }));
  const cl = (n) => clientes.find((c) => c.nome.startsWith(n)).id;
  const A = (pro, ini, cli, serv, st) => ({ id: uid(), pro, ini, cli: cl(cli), st, itens: [{ tipo: 's', ref: serv, pro }], pago: null });
  const ags = [A('p1', 8.5, 'Helena', 'color', 'pago'), A('p1', 11, 'Larissa', 'mechas', 'atendendo'), A('p1', 15, 'Marcela', 'corte-f', 'agendado'), A('p1', 16.5, 'Beatriz', 'hidrat', 'agendado'),
    A('p2', 9, 'Sônia', 'escova', 'pago'), A('p2', 10.5, 'Cláudia', 'corte-f', 'pagar'), A('p2', 13, 'Tatiane', 'escova', 'chegou'), A('p2', 14, 'Beatriz', 'corte-f', 'agendado'), A('p2', 17, 'Sônia', 'escova', 'agendado'),
    A('p3', 9, 'Joana', 'mao', 'pago'), A('p3', 10, 'Joana', 'pe', 'pago'), A('p3', 13, 'Marcela', 'gel', 'chegou'), A('p3', 16, 'Tatiane', 'mao', 'agendado'),
    A('p4', 9.5, 'Rafael', 'corte-m', 'faltou'), A('p4', 12.5, 'Pedro', 'corte-m', 'atendendo'), A('p4', 13.5, 'Pedro', 'barba', 'agendado'), A('p4', 15, 'Rafael', 'corte-m', 'agendado')];
  ags.find((a) => a.st === 'pago' && a.pro === 'p1').pago = { forma: 'Cartão', total: 220 }; ags.filter((a) => a.st === 'pago' && !a.pago).forEach((a) => { a.pago = { forma: 'PIX', total: servs.find((s) => s.id === a.itens[0].ref).preco }; });
  const pacotes = [{ id: uid(), cli: cl('Sônia'), nome: '10 escovas', total: 10, usadas: 7, valor: 450 }, { id: uid(), cli: cl('Joana'), nome: '4 manicures + pés', total: 4, usadas: 1, valor: 280 }];
  return { salao: 'Salão Ateliê Bela Vista', pros, servs, prods, clientes, ags, pacotes, caixaIni: 200, sangrias: [], lembretes: { confirmar: true, aniversario: true, retorno: true }, plano: 'basico', conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || semente(); } catch { return semente(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const guarda = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no navegador.'); } };
const pro = (id) => db.pros.find((p) => p.id === id);
const sv = (id) => db.servs.find((s) => s.id === id);
const prod = (id) => db.prods.find((p) => p.id === id);
const cli = (id) => db.clientes.find((c) => c.id === id) || { nome: '—', tel: '' };
const ag = (id) => db.ags.find((a) => a.id === id);
const minutos = (a) => a.itens.filter((i) => i.tipo === 's').reduce((s, i) => s + sv(i.ref).min, 0) || 30;
const valorItem = (i) => (i.tipo === 's' ? (i.pacote ? 0 : sv(i.ref).preco) : prod(i.ref).preco * (i.qtd || 1));
const totalAg = (a) => a.itens.reduce((s, i) => s + valorItem(i), 0);
const ST = { agendado: ['agendada', ''], chegou: ['chegou', 'at'], atendendo: ['na cadeira', 'az'], pagar: ['vai pagar', 'ru'], pago: ['pago', 'ok'], faltou: ['faltou', 'ru'] };
let sel = null;

function aviso(t) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = t; $('#avisos').append(a); setTimeout(() => a.remove(), 3300); }
function dialogo(html, liga) {
  const v = document.createElement('div'); v.className = 'sombra'; v.innerHTML = `<div class="dialogo" role="dialog" aria-modal="true">${html}</div>`;
  const ant = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); ant?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-sair]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 30);
  liga?.(v.querySelector('.dialogo'), fecha);
}
function pergunta(t, campos, ok, fn) { dialogo(`<h2>${t}</h2><form>${campos}<div class="pe"><button type="button" class="bt" data-sair>Cancelar</button><button class="bt az">${ok}</button></div></form>`, (d, fecha) => d.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (fn(new FormData(e.target)) !== false) { guarda(); fecha(); tela(); } })); }

// ------------------------------------------------------------------ seções
const SECOES = [['balcao', 'Balcão'], ['clientes', 'Clientes'], ['pacotes', 'Pacotes'], ['produtos', 'Produtos'], ['comissoes', 'Comissões'], ['caixa', 'Caixa do dia'], ['lembretes', 'Lembretes'], ['relatorios', 'Relatórios'], ['equipe', 'Equipe'], ['ajustes', 'Ajustes']];
const S = {
  balcao() {
    const hoje = db.ags, grupo = (st) => hoje.filter((a) => st.includes(a.st)), hA = agoraH(), prox = hoje.filter((a) => a.st === 'agendado' && a.ini >= hA - 0.25 && a.ini <= hA + 1);
    const cart = (a) => `<button type="button" class="cartela" data-sel="${a.id}" aria-pressed="${a.id === sel}" style="--c:${pro(a.pro).cor}"><b>${es(cli(a.cli).nome)}</b><small>${hm(a.ini)} · ${es(a.itens.filter((i) => i.tipo === 's').map((i) => sv(i.ref).nome).join(' + '))} · ${es(pro(a.pro).nome)}</small></button>`;
    const fila = `<section class="caixa-b fila"><h2>Fila do balcão</h2>${[['Chegaram, esperando', ['chegou']], ['Na cadeira', ['atendendo']], ['Para pagar', ['pagar']], ['Próximos 60 minutos', null]].map(([n, st]) => { const l = st ? grupo(st) : prox; return `<div class="etapa"><small>${n} (${l.length})</small>${l.map(cart).join('') || '<p class="vazio" style="margin:0">ninguém</p>'}</div>`; }).join('')}</section>`;
    const grade = `<section class="caixa-b grade-p" style="--n:${db.pros.length}"><h2>Hoje por profissional <button type="button" class="bt p az" data-a="novo-ag">+ Agendar</button></h2><div class="cab-p"><div></div>${db.pros.map((p) => `<div style="--c:${p.cor}">${es(p.nome)}<small>${es(p.area)}</small></div>`).join('')}</div>
      <div class="corpo-p"><div class="horas">${Array.from({ length: FECHA - ABRE }, (_, i) => `<div>${ABRE + i}h</div>`).join('')}</div>${db.pros.map((p) => `<div class="col" data-col="${p.id}" style="height:${(FECHA - ABRE) * PX}px" title="Clique num horário vazio para agendar">${hoje.filter((a) => a.pro === p.id).map((a) => `<button type="button" class="bloco ${a.st}" data-sel="${a.id}" aria-pressed="${a.id === sel}" style="--c:${p.cor};top:${(a.ini - ABRE) * PX}px;height:${Math.max(24, minutos(a) / 60 * PX - 3)}px"><b>${hm(a.ini)} ${es(cli(a.cli).nome.split(' ')[0])}</b>${es(a.itens.filter((i) => i.tipo === 's').map((i) => sv(i.ref).nome).join(' + '))}<br>${ST[a.st][0]}</button>`).join('')}</div>`).join('')}
      ${hA > ABRE && hA < FECHA ? `<div class="agora" style="top:${(hA - ABRE) * PX}px;left:46px"></div>` : ''}</div></section>`;
    return `<div class="topo-s"><div><h1>Balcão</h1><p>${grupo(['chegou']).length} esperando · ${grupo(['atendendo']).length} na cadeira · ${grupo(['pagar']).length} para pagar · ${R$(hoje.filter((a) => a.pago).reduce((s, a) => s + a.pago.total, 0))} recebidos hoje</p></div></div>
      <div class="balcao">${fila}${grade}${comanda()}</div>`;
  },
  clientes() {
    const mesAtual = new Date().getMonth() + 1, niver = db.clientes.filter((c) => Number(c.niver.split('/')[1]) === mesAtual);
    return `<div class="topo-s"><div><h1>Clientes</h1><p>${db.clientes.length} clientes · ${niver.length} fazem aniversário este mês.</p></div><button class="bt az" data-a="nova-cli">+ Cliente</button></div>
      <div class="caixa-b tab"><table><thead><tr><th>Cliente</th><th>Anotações da ficha</th><th>Aniversário</th><th class="d">Visitas</th><th class="d">Gastou</th><th></th></tr></thead><tbody>${db.clientes.map((c) => `<tr><td><b>${es(c.nome)}</b></td><td>${es(c.obs) || '<span class="vazio">—</span>'}</td><td>${es(c.niver)} ${Number(c.niver.split('/')[1]) === mesAtual ? '<span class="etq at">este mês</span>' : ''}</td><td class="d">${c.visitas}</td><td class="d">${R$(c.gasto)}</td><td><a class="bt p" target="_blank" rel="noopener" href="https://wa.me/55${c.tel}?text=${encodeURIComponent(`Oi, ${c.nome.split(' ')[0]}! Aqui é do ${db.salao}.`)}">WhatsApp</a></td></tr>`).join('')}</tbody></table></div>`;
  },
  pacotes() {
    return `<div class="topo-s"><div><h1>Pacotes</h1><p>Sessões vendidas adiantadas. Na comanda, use "Usar pacote" e a sessão sai sem cobrar.</p></div><button class="bt az" data-a="novo-pacote">+ Vender pacote</button></div>
      <div class="caixa-b tab"><table><thead><tr><th>Cliente</th><th>Pacote</th><th>Sessões</th><th class="d">Pago</th><th></th></tr></thead><tbody>${db.pacotes.map((p) => `<tr><td><b>${es(cli(p.cli).nome)}</b></td><td>${es(p.nome)}</td><td><div class="sessoes" aria-label="${p.usadas} de ${p.total} usadas">${Array.from({ length: p.total }, (_, i) => `<i class="${i < p.usadas ? 'u' : ''}"></i>`).join('')}</div><small class="vazio">${p.total - p.usadas} restante(s)</small></td><td class="d">${R$(p.valor)}</td><td>${p.total - p.usadas <= 2 ? '<span class="etq at">ofereça renovar</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  },
  produtos() {
    const baixo = db.prods.filter((p) => p.qtd < p.min);
    return `<div class="topo-s"><div><h1>Produtos de revenda</h1><p>${baixo.length} abaixo do mínimo. Vendidos na comanda, com comissão para quem indicou.</p></div><button class="bt az" data-a="novo-prod">+ Produto</button></div>
      <div class="caixa-b tab"><table><thead><tr><th>Produto</th><th class="d">Estoque</th><th class="d">Mínimo</th><th class="d">Custo</th><th class="d">Venda</th><th class="d">Margem</th></tr></thead><tbody>${db.prods.map((p) => `<tr><td>${es(p.nome)}</td><td class="d">${p.qtd < p.min ? `<span class="etq ru">${p.qtd}</span>` : p.qtd}</td><td class="d">${p.min}</td><td class="d">${R$(p.custo)}</td><td class="d">${R$(p.preco)}</td><td class="d">${Math.round((p.preco - p.custo) / p.preco * 100)}%</td></tr>`).join('')}</tbody></table></div>`;
  },
  comissoes() {
    const l = db.pros.map((p) => { const its = db.ags.filter((a) => a.pago).flatMap((a) => a.itens.filter((i) => i.pro === p.id)); const s = its.filter((i) => i.tipo === 's').reduce((t, i) => t + valorItem(i), 0), pr = its.filter((i) => i.tipo === 'p').reduce((t, i) => t + valorItem(i), 0); return { p, s, pr, c: s * p.com / 100 + pr * p.comProd / 100 }; });
    return `<div class="topo-s"><div><h1>Comissões de hoje</h1><p>Sobre o que já foi pago. Serviço e produto têm porcentagens separadas.</p></div><button class="bt" data-a="vale">Lançar vale</button></div>
      <div class="caixa-b tab"><table><thead><tr><th>Profissional</th><th class="d">Serviços</th><th class="d">% serv.</th><th class="d">Produtos</th><th class="d">% prod.</th><th class="d">Comissão</th></tr></thead><tbody>${l.map((x) => `<tr><td><b>${es(x.p.nome)}</b></td><td class="d">${R$(x.s)}</td><td class="d"><input data-com="${x.p.id}" value="${x.p.com}" style="width:46px;text-align:right" aria-label="Comissão de serviço de ${es(x.p.nome)}">%</td><td class="d">${R$(x.pr)}</td><td class="d">${x.p.comProd}%</td><td class="d"><b>${R$(x.c)}</b></td></tr>`).join('')}</tbody></table></div>`;
  },
  caixa() {
    const pagos = db.ags.filter((a) => a.pago), porForma = {}; pagos.forEach((a) => { porForma[a.pago.forma] = (porForma[a.pago.forma] || 0) + a.pago.total; });
    const din = (porForma.Dinheiro || 0) + db.caixaIni - db.sangrias.reduce((s, x) => s + x.v, 0);
    return `<div class="topo-s"><div><h1>Caixa do dia</h1><p>Abriu com ${R$(db.caixaIni)} em dinheiro.</p></div><div class="acoes"><button class="bt" data-a="sangria">Sangria</button><button class="bt az" data-a="fechar-caixa">Fechar o caixa</button></div></div>
      <div class="cols">${['PIX', 'Cartão', 'Dinheiro'].map((f) => `<div class="caixa-b c4"><span class="rot">${f}</span><p class="num">${R$(porForma[f] || 0)}</p></div>`).join('')}
      <section class="caixa-b c6"><h2>Na gaveta agora</h2><p class="num">${R$(din)}</p><p class="rot">abertura + dinheiro recebido − sangrias</p></section>
      <section class="caixa-b c6"><h2>Recebimentos</h2><table><tbody>${pagos.map((a) => `<tr><td>${hm(a.ini)} ${es(cli(a.cli).nome)}</td><td>${a.pago.forma}</td><td class="d">${R$(a.pago.total)}</td></tr>`).join('')}${db.sangrias.map((s) => `<tr><td>Sangria · ${es(s.m)}</td><td></td><td class="d">−${R$(s.v)}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  lembretes() {
    const am = db.ags.filter((a) => a.st === 'agendado').length, l = db.lembretes;
    return `<div class="topo-s"><div><h1>Lembretes automáticos</h1><p>Saem pelo WhatsApp do salão, no horário certo, sem ninguém lembrar de mandar.</p></div></div>
      <div class="cols">${[['confirmar', 'Confirmação na véspera', `${am} cliente(s) recebem amanhã às 10h: "Confirma seu horário? Responda SIM."`], ['aniversario', 'Aniversário', 'Parabéns com 10% de desconto no mês do aniversário.'], ['retorno', 'Hora de voltar', 'Quem passou do tempo de retorno do serviço recebe um convite com o link.']].map(([k, n, d]) => `<section class="caixa-b c4"><h2>${n}<input type="checkbox" data-lem="${k}" ${l[k] ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--azul)" aria-label="${n}"></h2><p class="vazio" style="margin:0">${d}</p></section>`).join('')}</div>`;
  },
  relatorios() {
    const pagos = db.ags.filter((a) => a.pago), fat = pagos.reduce((s, a) => s + a.pago.total, 0), porS = {}; db.ags.forEach((a) => a.itens.filter((i) => i.tipo === 's').forEach((i) => { porS[sv(i.ref).nome] = (porS[sv(i.ref).nome] || 0) + sv(i.ref).preco; }));
    const top = Object.entries(porS).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = top[0]?.[1] || 1, ocup = db.pros.map((p) => ({ p, o: db.ags.filter((a) => a.pro === p.id && a.st !== 'faltou').reduce((s, a) => s + minutos(a), 0) / ((FECHA - ABRE) * 60) }));
    return `<div class="topo-s"><div><h1>Relatórios</h1><p>Hoje até agora.</p></div></div>
      <div class="cols"><div class="caixa-b c3"><span class="rot">Faturado</span><p class="num">${R$(fat)}</p></div><div class="caixa-b c3"><span class="rot">Ticket médio</span><p class="num">${R$(fat / (pagos.length || 1))}</p></div><div class="caixa-b c3"><span class="rot">Faltas</span><p class="num">${db.ags.filter((a) => a.st === 'faltou').length}</p></div><div class="caixa-b c3"><span class="rot">Agendados</span><p class="num">${db.ags.length}</p></div>
      <section class="caixa-b c6"><h2>Serviços que mais faturam</h2><div class="barras">${top.map(([n, v]) => `<div class="l"><span>${es(n)}</span><span class="t"><i style="width:${v / mx * 100}%"></i></span><b class="d">${R$(v)}</b></div>`).join('')}</div></section>
      <section class="caixa-b c6"><h2>Ocupação da agenda</h2><div class="barras">${ocup.map(({ p, o }) => `<div class="l"><span>${es(p.nome)}</span><span class="t"><i style="width:${Math.min(100, o * 100)}%;--c:${p.cor}"></i></span><b class="d">${Math.round(o * 100)}%</b></div>`).join('')}</div></section></div>`;
  },
  equipe() {
    const pr = db.plano === 'pro' ? 139 : 79;
    return `<div class="topo-s"><div><h1>Equipe</h1><p>Painel do dono: cada profissional vê a própria agenda e a própria comissão.</p></div><button class="bt az" data-a="nova-pro">+ Profissional</button></div>
      <div class="cols"><section class="caixa-b c7 tab"><table><thead><tr><th>Profissional</th><th>Faz</th><th>Vê</th></tr></thead><tbody>${db.pros.map((p) => `<tr><td><b style="color:${p.cor}">●</b> ${es(p.nome)}</td><td>${es(p.area)}</td><td>agenda e comissão dela</td></tr>`).join('')}<tr><td>Recepção</td><td>balcão e caixa</td><td>tudo menos relatórios</td></tr></tbody></table></section>
      <section class="caixa-b c5"><h2>Plano</h2><p>${db.plano === 'pro' ? 'Pro' : 'Básico'} · <b>${R$(pr)}/mês</b></p><div class="acoes"><button class="bt ${db.plano === 'basico' ? 'az' : ''}" data-a="plano" data-v="basico">Básico · R$ 79</button><button class="bt ${db.plano === 'pro' ? 'az' : ''}" data-a="plano" data-v="pro">Pro · R$ 139</button></div><p class="vazio">Básico: você + 5 pessoas. Pro: sem limite e histórico de quem fez o quê. Anual com 20% a menos. Sem fidelidade.</p></section></div>`;
  },
  ajustes() {
    return `<div class="topo-s"><div><h1>Ajustes</h1></div></div><div class="cols"><section class="caixa-b c6"><label class="cmp">Nome do salão<input data-aj="salao" value="${es(db.salao)}"></label><label class="cmp">Abertura do caixa (R$)<input data-aj="caixaIni" inputmode="decimal" value="${db.caixaIni}"></label></section>
      <section class="caixa-b c6"><h2>Serviços</h2><table><tbody>${db.servs.map((s) => `<tr><td>${es(s.nome)}</td><td class="d">${s.min} min</td><td class="d">${R$(s.preco)}</td></tr>`).join('')}</tbody></table><p class="vazio">Na versão contratada: agendamento online com sinal no PIX, confirmação automática pelo WhatsApp e NFS-e.</p></section></div>`;
  },
};

function comanda() {
  const a = sel && ag(sel);
  if (!a) return '<section class="caixa-b comanda"><h2>Comanda</h2><p class="vazio">Escolha um cliente na fila ou na grade para abrir a comanda.</p></section>';
  const c = cli(a.cli), pac = db.pacotes.find((p) => p.cli === a.cli && p.usadas < p.total), prox = { agendado: ['Chegou', 'chegou'], chegou: ['Sentar na cadeira', 'atendendo'], atendendo: ['Terminou: ir pagar', 'pagar'] }[a.st];
  return `<section class="caixa-b comanda"><h2>${es(c.nome)} <span class="etq ${ST[a.st][1]}">${ST[a.st][0]}</span></h2>${c.obs ? `<p class="vazio" style="margin:-4px 0 8px">Ficha: ${es(c.obs)}</p>` : ''}
    ${a.itens.map((i, ix) => `<div class="linha-c"><span>${es(i.tipo === 's' ? sv(i.ref).nome : prod(i.ref).nome)}<small>${es(pro(i.pro)?.nome || '')}${i.pacote ? ' · do pacote' : ''}${i.tipo === 'p' ? ' · produto' : ''}</small></span><span class="m">${R$(valorItem(i))}</span>${a.st === 'pago' ? '<span></span>' : `<button type="button" class="x" data-tira="${ix}" aria-label="Tirar item">×</button>`}</div>`).join('')}
    <div class="tot"><span>Total</span><span>${R$(a.pago ? a.pago.total : totalAg(a))}</span></div>
    ${a.st === 'pago' ? `<p class="vazio">Pago no ${es(a.pago.forma)}.</p>` : a.st === 'faltou' ? '<p class="vazio">Não veio.</p>' : `<div class="acoes"><button class="bt p" data-a="add-serv">+ Serviço</button><button class="bt p" data-a="add-prod">+ Produto</button>${pac && a.itens.some((i) => i.tipo === 's' && !i.pacote) ? `<button class="bt p" data-a="usar-pacote">Usar pacote (${pac.total - pac.usadas})</button>` : ''}</div>
    <div class="acoes" style="margin-top:10px">${prox ? `<button class="bt az" data-a="avanca" data-v="${prox[1]}">${prox[0]}</button>` : ''}${['pagar', 'atendendo', 'chegou'].includes(a.st) ? '<button class="bt ar" data-a="receber">Receber</button>' : ''}${a.st === 'agendado' ? '<button class="bt" data-a="avanca" data-v="faltou">Faltou</button>' : ''}</div>`}</section>`;
}

function tela() {
  const r = location.hash.slice(1) || 'balcao', n = { balcao: db.ags.filter((a) => ['chegou', 'pagar'].includes(a.st)).length, produtos: db.prods.filter((p) => p.qtd < p.min).length };
  $('#fichas').innerHTML = SECOES.map(([k, t]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</a>`).join('');
  $('#miolo').innerHTML = (S[r] || S.balcao)();
  $('#salao').textContent = db.salao; $('#data-hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  document.title = `${(SECOES.find(([k]) => k === r) || SECOES[0])[1]} · Veltria Agenda Completo`;
}
addEventListener('hashchange', () => { tela(); $('#miolo').focus({ preventScroll: true }); scrollTo(0, 0); });

function lateral() {
  const g = $('#lateral-ia'); g.hidden = false;
  const fs = db.conversa.length ? db.conversa : [{ ia: 1, t: 'Vejo a agenda, as comandas, os pacotes e o caixa. Na versão contratada, 20 perguntas grátis por dia; aqui as respostas são de exemplo.' }];
  g.innerHTML = `<header><b>Assistente do salão</b><button type="button" data-fecha-l aria-label="Fechar">×</button></header><div class="falas">${fs.map((m) => `<div class="f ${m.ia ? 'ia' : 'eu'}">${es(m.t)}</div>`).join('')}<div class="sug">${['Onde tem buraco hoje?', 'Quem faz aniversário este mês?', 'Que produto está acabando?', 'Escreva a oferta de pacote de escova'].map((s) => `<button type="button" data-sug="${es(s)}">${es(s)}</button>`).join('')}</div></div><form id="f-l"><input id="q-l" placeholder="Pergunte" aria-label="Pergunta"><button class="bt az">Enviar</button></form>`;
  g.querySelector('.falas').scrollTop = 1e6; $('#q-l').focus();
}
function responde(p) {
  const x = sa(p);
  if (/buraco|vago|livre|encaix/.test(x)) return db.pros.map((pr) => { const l = db.ags.filter((a) => a.pro === pr.id && a.st !== 'faltou').sort((a, b) => a.ini - b.ini); const v = []; let h = ABRE; l.forEach((a) => { if (a.ini - h >= 1) v.push(`${hm(h)}–${hm(a.ini)}`); h = Math.max(h, a.ini + minutos(a) / 60); }); if (FECHA - h >= 1) v.push(`${hm(h)}–${FECHA}:00`); return `• ${pr.nome}: ${v.join(', ') || 'cheia'}`; }).join('\n') + '\n\nPosso mandar os horários para quem está há mais tempo sem vir.';
  if (/aniver/.test(x)) { const m = new Date().getMonth() + 1; const l = db.clientes.filter((c) => Number(c.niver.split('/')[1]) === m); return l.length ? `Este mês: ${l.map((c) => `${c.nome} (${c.niver})`).join(', ')}. O lembrete de aniversário manda os parabéns com 10% de desconto.` : 'Ninguém este mês.'; }
  if (/produto|acaband|estoque/.test(x)) return db.prods.filter((q) => q.qtd < q.min).map((q) => `• ${q.nome}: ${q.qtd} (mínimo ${q.min})`).join('\n') || 'Nada acabando.';
  if (/pacote|oferta|escova/.test(x)) return 'Mensagem pronta:\n\n"Oi! Que tal garantir suas escovas do mês? Pacote com 10 escovas por R$ 450,00 (sai R$ 45 cada, em vez de R$ 55). Vale por 4 meses. Quer que eu separe o seu?"';
  return `Hoje: ${db.ags.length} atendimentos, ${R$(db.ags.filter((a) => a.pago).reduce((s, a) => s + a.pago.total, 0))} recebidos.`;
}

const F = {
  'novo-ag': (d) => pergunta('Agendar', `<label class="cmp">Cliente<select name="c">${db.clientes.map((c) => `<option value="${c.id}">${es(c.nome)}</option>`).join('')}</select></label><label class="cmp">Serviço<select name="s">${db.servs.map((s) => `<option value="${s.id}">${es(s.nome)} · ${s.min} min · ${R$(s.preco)}</option>`).join('')}</select></label><div class="duas"><label class="cmp">Profissional<select name="p">${db.pros.map((p) => `<option value="${p.id}" ${d?.p === p.id ? 'selected' : ''}>${es(p.nome)}</option>`).join('')}</select></label><label class="cmp">Horário<input name="h" type="time" step="900" value="${d?.h || '15:00'}"></label></div>`, 'Agendar', (f) => { const [hh, mm] = String(f.get('h')).split(':').map(Number), ini = hh + mm / 60, s = sv(f.get('s')), p = f.get('p'); if (db.ags.some((a) => a.pro === p && a.st !== 'faltou' && ini < a.ini + minutos(a) / 60 && ini + s.min / 60 > a.ini)) { aviso(`${pro(p).nome} já tem alguém nesse horário.`); return false; } const n = { id: uid(), pro: p, ini, cli: f.get('c'), st: 'agendado', itens: [{ tipo: 's', ref: s.id, pro: p }], pago: null }; db.ags.push(n); sel = n.id; const cl = cli(n.cli); if (cl && cl.tel) { aviso('Agendado. Abrindo o WhatsApp para mandar a confirmação.'); window.open(`https://wa.me/55${String(cl.tel).replace(/\D/g, '')}?text=${encodeURIComponent(`Oi, ${cl.nome.split(' ')[0]}! Seu horário de ${s.nome} com ${pro(p).nome} está confirmado para hoje às ${hm(ini)}. ${db.salao}`)}`, '_blank', 'noopener'); } else aviso('Agendado.'); }),
  avanca: (d) => { const a = ag(sel); a.st = d.v; if (d.v === 'faltou') aviso(`${cli(a.cli).nome.split(' ')[0]} faltou. O horário ficou livre para encaixe.`); guarda(); tela(); },
  'add-serv': () => pergunta('Adicionar serviço', `<label class="cmp">Serviço<select name="s">${db.servs.map((s) => `<option value="${s.id}">${es(s.nome)} · ${R$(s.preco)}</option>`).join('')}</select></label><label class="cmp">Quem faz<select name="p">${db.pros.map((p) => `<option value="${p.id}">${es(p.nome)}</option>`).join('')}</select></label>`, 'Adicionar', (f) => { ag(sel).itens.push({ tipo: 's', ref: f.get('s'), pro: f.get('p') }); }),
  'add-prod': () => pergunta('Vender produto', `<label class="cmp">Produto<select name="p">${db.prods.map((p) => `<option value="${p.id}" ${p.qtd ? '' : 'disabled'}>${es(p.nome)} · ${R$(p.preco)} (tem ${p.qtd})</option>`).join('')}</select></label><div class="duas"><label class="cmp">Quantidade<input name="q" type="number" value="1" min="1"></label><label class="cmp">Quem indicou<select name="i">${db.pros.map((p) => `<option value="${p.id}">${es(p.nome)}</option>`).join('')}</select></label></div>`, 'Adicionar', (f) => { ag(sel).itens.push({ tipo: 'p', ref: f.get('p'), qtd: Number(f.get('q')) || 1, pro: f.get('i') }); }),
  'usar-pacote': () => { const a = ag(sel), p = db.pacotes.find((x) => x.cli === a.cli && x.usadas < x.total), i = a.itens.find((x) => x.tipo === 's' && !x.pacote); i.pacote = p.id; p.usadas++; guarda(); tela(); aviso(`Sessão do pacote usada. Restam ${p.total - p.usadas}.`); },
  receber: () => { const a = ag(sel), tot = totalAg(a); dialogo(`<h2>Receber ${R$(tot)}</h2><p class="vazio">${es(cli(a.cli).nome)}</p><div class="acoes">${['PIX', 'Cartão', 'Dinheiro'].map((f) => `<button type="button" class="bt az" data-forma="${f}">${f}</button>`).join('')}</div><div class="pe"><button class="bt" data-sair>Cancelar</button></div>`, (d, fecha) => d.querySelectorAll('[data-forma]').forEach((b) => b.addEventListener('click', () => { a.st = 'pago'; a.pago = { forma: b.dataset.forma, total: tot }; a.itens.filter((i) => i.tipo === 'p').forEach((i) => { prod(i.ref).qtd -= i.qtd || 1; }); const c = cli(a.cli); c.visitas++; c.gasto += tot; guarda(); fecha(); tela(); aviso(`${R$(tot)} no ${b.dataset.forma}. Comissões calculadas.`); }))); },
  'nova-cli': () => pergunta('Nova cliente', '<label class="cmp">Nome<input name="n" required></label><div class="duas"><label class="cmp">WhatsApp<input name="t" inputmode="tel"></label><label class="cmp">Aniversário (dd/mm)<input name="a" placeholder="15/03"></label></div><label class="cmp">Anotações da ficha<input name="o" placeholder="alergias, preferências, fórmula da cor"></label>', 'Cadastrar', (f) => { db.clientes.push({ id: uid(), nome: f.get('n'), tel: f.get('t'), niver: f.get('a') || '—', obs: f.get('o'), visitas: 0, gasto: 0 }); }),
  'novo-pacote': () => pergunta('Vender pacote', `<label class="cmp">Cliente<select name="c">${db.clientes.map((c) => `<option value="${c.id}">${es(c.nome)}</option>`).join('')}</select></label><label class="cmp">Pacote<input name="n" value="10 escovas" required></label><div class="duas"><label class="cmp">Sessões<input name="s" type="number" value="10"></label><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" value="450"></label></div>`, 'Vender', (f) => { db.pacotes.push({ id: uid(), cli: f.get('c'), nome: f.get('n'), total: Number(f.get('s')), usadas: 0, valor: nv(f.get('v')) }); aviso('Pacote vendido.'); }),
  'novo-prod': () => pergunta('Novo produto', '<label class="cmp">Nome<input name="n" required></label><div class="duas"><label class="cmp">Custo<input name="c" inputmode="decimal" required></label><label class="cmp">Venda<input name="v" inputmode="decimal" required></label><label class="cmp">Estoque<input name="q" type="number" value="1"></label><label class="cmp">Mínimo<input name="m" type="number" value="2"></label></div>', 'Cadastrar', (f) => { db.prods.push({ id: uid(), nome: f.get('n'), custo: nv(f.get('c')), preco: nv(f.get('v')), qtd: Number(f.get('q')), min: Number(f.get('m')) }); }),
  vale: () => pergunta('Vale para profissional', `<label class="cmp">Profissional<select name="p">${db.pros.map((p) => `<option>${es(p.nome)}</option>`).join('')}</select></label><label class="cmp">Valor (R$)<input name="v" inputmode="decimal" required></label>`, 'Lançar', (f) => { db.sangrias.push({ v: nv(f.get('v')), m: `vale ${f.get('p')}` }); aviso('Vale lançado: sai do caixa e desconta na comissão.'); }),
  sangria: () => pergunta('Sangria', '<label class="cmp">Valor (R$)<input name="v" inputmode="decimal" required></label><label class="cmp">Motivo<input name="m" value="depósito no banco"></label>', 'Tirar do caixa', (f) => { db.sangrias.push({ v: nv(f.get('v')), m: f.get('m') }); }),
  'fechar-caixa': () => dialogo(`<h2>Fechar o caixa</h2><p>Conte o dinheiro da gaveta e confira com o sistema. Diferença fica registrada para o dono.</p><label class="cmp">Contei na gaveta (R$)<input id="contado" inputmode="decimal"></label><div class="pe"><button class="bt" data-sair>Cancelar</button><button class="bt az" data-ok>Fechar</button></div>`, (d, fecha) => d.querySelector('[data-ok]').addEventListener('click', () => { fecha(); aviso('Caixa fechado. Resumo enviado ao dono pelo WhatsApp.'); })),
  'nova-pro': () => pergunta('Nova profissional', '<label class="cmp">Nome<input name="n" required></label><div class="duas"><label class="cmp">Faz<input name="a" required></label><label class="cmp">Comissão (%)<input name="c" type="number" value="40"></label></div>', 'Cadastrar', (f) => { if (db.plano !== 'pro' && db.pros.length >= 5) { aviso('No Básico são até 6 pessoas. O Pro libera sem limite.'); return false; } db.pros.push({ id: uid(), nome: f.get('n'), area: f.get('a'), cor: '#5e7d74', com: Number(f.get('c')), comProd: 10 }); }),
  plano: (d) => { db.plano = d.v; guarda(); tela(); },
};

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ia]')) { lateral(); return; }
  if (t.closest('[data-fecha-l]')) { $('#lateral-ia').hidden = true; return; }
  const sg = t.closest('[data-sug]'); if (sg) { $('#q-l').value = sg.dataset.sug; $('#f-l').requestSubmit(); return; }
  const s = t.closest('[data-sel]'); if (s) { sel = s.dataset.sel; tela(); return; }
  const tr = t.closest('[data-tira]'); if (tr) { const a = ag(sel), i = a.itens[Number(tr.dataset.tira)]; if (i.pacote) db.pacotes.find((p) => p.id === i.pacote).usadas--; a.itens.splice(Number(tr.dataset.tira), 1); guarda(); tela(); return; }
  const col = t.closest('[data-col]'); if (col && t === col) { const r = col.getBoundingClientRect(), h = ABRE + Math.floor((e.clientY - r.top) / PX * 4) / 4; F['novo-ag']({ p: col.dataset.col, h: hm(h) }); return; }
  const a = t.closest('[data-a]'); if (a && F[a.dataset.a]) F[a.dataset.a](a.dataset);
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-l') return; e.preventDefault(); const p = $('#q-l').value.trim(); if (p.length < 3) return; const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : `${responde(p)}\n\n(Exemplo da demonstração.)` }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-10); guarda(); lateral(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; guarda(); lateral(); }); });
document.addEventListener('change', (e) => {
  const d = e.target.dataset;
  if (d.com) { pro(d.com).com = nv(e.target.value); guarda(); tela(); aviso('Comissão salva.'); }
  if (d.lem) { db.lembretes[d.lem] = e.target.checked; guarda(); aviso(e.target.checked ? 'Lembrete ligado.' : 'Lembrete desligado.'); }
  if (d.aj) { db[d.aj] = d.aj === 'salao' ? e.target.value : nv(e.target.value); guarda(); tela(); }
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = semente(); sel = null; location.hash = '#balcao'; tela(); aviso('Demonstração recomeçada.'); });
tela();

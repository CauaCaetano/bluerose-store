// Popina · Mais: cardápio (preços, esgotado, ficha técnica), estoque, relatórios, QR das mesas, ajustes e o papel deste aparelho.
import { db, t, din, dinCurto, prod, insumo, grava, custoPrato, estoqueBaixo, entradaCompra, fmtQtd, r2, uid, linkCardapio, CONTA, saldo, lojaCfg, setLoja, nomeMesa,
  regras, temPin, auditar, quemAgora, registrarPerda, ajustarEstoque, MOTIVOS_PERDA, consumoVenda, custoVenda } from './loja.js?v=31';
import { registrar, acao, ir, PAPEIS, papel, setPapel } from './nucleo.js?v=31';
import { ico, folha, toast, confirma, autorizar, $, $$ } from './ui.js?v=31';
import { qrSVG } from '../base/qr.js';
import { temModulo, modulosAtivos } from './perfis.js?v=31';
import { ALERGENOS, ETAPAS, TURNOS } from './precos.js?v=31';
import { modoEscolha } from './opcoes.js?v=31';

// cada seção: [id, nome, ícone, detalhe, função da casa que precisa estar ligada (opcional), endereço próprio (opcional)]
export const GRUPOS = [
  ['Restaurante', [['aparencia', 'Aparência e templates', 'ajustes', 'Template, cores, funções e estilo do cardápio'], ['loja', 'Restaurante e cardápio online', 'salao', 'Contato, horários, entrega e o link'], ['mesas', 'Mesas e QR', 'qr', 'Áreas do salão, número de mesas, QR de cada mesa'], ['ajustes', 'Caixa e regras', 'caixa', 'Pix, serviço, garçons e comissão, balança']]],
  ['Cardápio e estoque', [['cardapio', 'Cardápio', 'cardapio', 'Pratos, tamanhos, complementos, fotos e preços'], ['estoque', 'Estoque', 'estoque', 'Ingredientes e bebidas: o que tem, o que acaba, compras']]],
  ['Vendas e clientes', [['relatorios', 'Relatórios', 'grafico', 'Vendas, garçons, horários, mais vendidos'], ['clientes', 'Clientes', 'pessoas', 'Quem pede no delivery e quanto gasta'], ['entregadores', 'Entregadores', 'moto', 'Quem levou cada pedido e o acerto do dia', 'delivery'], ['cupons', 'Cupons', 'conta', 'Descontos do cardápio online']]],
  ['Funções do negócio', [['funcoes', 'Regras das funções', 'ajustes', 'Rodízio, pizza, happy hour, cardápio por turno, fidelidade e mais'], ['reservas', 'Reservas e fila', 'calendario', 'Reservas por dia e fila de espera na porta', 'reservas'],
    ['eventos', 'Eventos', 'coroa', 'Pacote por pessoa, convidados e check-in', 'eventos'], ['encomendas', 'Encomendas', 'calendario', 'Pedidos para outro dia e hora', 'encomendas'], ['vitrine', 'Vitrine do dia', 'loja', 'Quanto foi feito hoje e quanto resta', 'vitrine'],
    ['bar', 'Bar: chopp e doses', 'taca', 'Barris de chopp, garrafas em doses e cartões', 'bar'],
    ['portaria', 'Portaria', 'pessoas', 'Entrada, lotes, lista VIP, promoters e lotação', 'portaria', '#portaria'], ['senhas', 'Painel de retirada', 'telacheia', 'As senhas na TV do balcão', 'senha', '#senhas']]],
  ['Equipe e conta', [['equipe', 'Equipe e convites', 'pessoas', 'Quem usa, cargo e o que cada um vê'], ['conta', 'Minha conta', 'ajustes', 'Perfil, assinatura e sair'], ['aparelho', 'Este aparelho', 'ao_vivo', 'Garçom, cozinha, caixa ou dono']]],
];
const ALIAS = { qr: 'mesas' };
// funções que têm regras para o dono ajustar (Gestão › Regras das funções)
export const COM_REGRAS = ['rodizio', 'rodadas', 'meiaMeia', 'happyHour', 'pratoDoDia', 'fidelidade', 'encomendas', 'portaria', 'couvert'];
const secaoLigada = (mod) => { if (!mod) return true; const m = modulosAtivos(lojaCfg()); return mod === 'regras' ? COM_REGRAS.some((k) => m.has(k)) : mod === 'bar' ? m.has('comandaIndividual') : m.has(mod); };
function menuGestao(atual) {
  const baixo = estoqueBaixo().length;
  return GRUPOS.map(([g, l]) => [g, l.filter((x) => secaoLigada(x[4]))]).filter(([, l]) => l.length).map(([g, l], k) => `<div class="mg-grupo"><h3 class="g-fita g${k % 4}">${g}</h3>${l.map(([id, nome, ic, det, , href]) => `<a href="${href || `#mais/${id}`}" class="${id === atual ? 'on' : ''}"><span class="mm-ico">${ico(ic)}</span><span><b>${nome}${id === 'estoque' && baixo ? ` <em class="badge">${baixo}</em>` : ''}</b><small>${det}</small></span>${ico('dir')}</a>`).join('')}</div>`).join('');
}
registrar('mais', {
  titulo: 'Gestão', aba: 'mais',
  html(sec, x) {
    sec = ALIAS[sec] || sec;
    const mod = GRUPOS.flatMap((g) => g[1]).find((y) => y[0] === sec)?.[4];
    const corpo = sec && TELAS_MAIS[sec] && !secaoLigada(mod) ? volta('mais', 'Função desligada') + '<div class="vazio">Esta função está desligada. Ligue em <a href="#mais/aparencia">Aparência e templates</a>.</div>' : sec && TELAS_MAIS[sec] ? TELAS_MAIS[sec](x) : `<header class="cab-gestao"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">Gestão<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1><img class="g-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>${topoGestao()}${resumoDia()}${painelDia()}<nav class="menu-mais so-cel-bloco">${menuGestao('')}</nav>`;
    return `<div class="gestao ${sec ? 'com-sec' : ''}"><aside class="gestao-nav" aria-label="Seções da gestão">${menuGestao(sec || '')}</aside><div class="gestao-corpo">${corpo}</div></div>`;
  },
  montar(el, sec) { MONTAR[ALIAS[sec] || sec]?.(el); },
});
// o dia em uma linha, para quem abre a gestão
function resumoDia() {
  const ini = new Date(); ini.setHours(0, 0, 0, 0);
  const v = db.vendas.filter((x) => x.ts >= ini.getTime() && !x.cancelado), tot = r2(v.reduce((s2, x) => s2 + x.total, 0));
  const abertas = db.comandas.length, baixo = estoqueBaixo().length;
  // os quatro números do dia em papel rasgado, cada um com a sua faixa de cor (conceito 6-gestao-pc.png)
  return `<section class="resumo-dia"><div class="kv">${ico('moedas')}<small>Vendido hoje</small><b>${din(tot)}</b><span>${v.length} ${v.length === 1 ? 'conta' : 'contas'}</span></div><div class="ko">${ico('pessoas')}<small>Contas abertas</small><b>${abertas}</b></div><div class="kl">${ico('etiqueta')}<small>Ticket médio</small><b>${din(v.length ? tot / v.length : 0)}</b></div><a href="#mais/estoque" class="ka ${baixo ? 'alerta' : ''}">${ico('estoque')}<small>Estoque</small><b>${baixo}</b><span>${baixo === 1 ? 'item para repor' : 'itens para repor'}</span></a></section>`;
}
// topo da gestão: pendências do dono e metas do mês (operacao.js registra)
export const TOPO_GESTAO = [];
const topoGestao = () => TOPO_GESTAO.map((f) => { try { return f(); } catch { return ''; } }).join('');
// cartões do dia que importam para o tipo de negócio (funcoes.js registra: rodízio, portaria, cafeteria, pizzaria, bar, reservas)
export const PAINEL_TIPO = [];
const painelTipo = () => { const l = PAINEL_TIPO.map((f) => { try { return f(); } catch { return ''; } }).join(''); return l ? `<section class="resumo-dia painel-tipo" aria-label="O dia no seu tipo de negócio">${l}</section>` : ''; };
// o dia em gráfico: vendas por hora, mais vendidos e garçons (só o que fechou hoje)
function painelDia() {
  const ini = new Date(); ini.setHours(0, 0, 0, 0);
  const v = db.vendas.filter((x) => x.ts >= ini.getTime() && !x.cancelado);
  const ph = {}; v.forEach((x) => { const h = new Date(x.ts).getHours(); ph[h] = (ph[h] || 0) + x.total; });
  const horas = Array.from({ length: 13 }, (_, k) => [k + 11, ph[k + 11] || 0]);
  const max = Math.max(...horas.map((x) => x[1]), 1), passo = Math.max(50, Math.ceil(max / 8 / 50) * 50), teto = passo * 8;
  const qtd = {}; v.forEach((x) => x.itens.forEach((i) => { qtd[i.nome] = (qtd[i.nome] || 0) + i.qtd; }));
  const rank = Object.entries(qtd).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const ga = {}; v.filter((x) => x.garcom).forEach((x) => { ga[x.garcom] = (ga[x.garcom] || 0) + x.total; });
  const gl = Object.entries(ga).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const bebida = (n) => /refri|suco|cerveja|água|agua|coca|chopp|vinho|caipi/i.test(n);
  return `${painelTipo()}<div class="g-painel"><section class="g-card g-grafico"><h2 class="g-fita g0">Vendas por hora</h2>
      <div class="g-barras"><div class="g-eixo">${Array.from({ length: 9 }, (_, k) => `<span>R$ ${(teto - k * passo).toLocaleString('pt-BR')}</span>`).join('')}</div>
      <div class="g-cols">${horas.map(([h, val]) => `<div title="${h}h: ${din(val)}"><i style="height:${(val / teto) * 100}%"></i><small>${h}h</small></div>`).join('')}</div></div></section>
    <div class="g-lado"><section class="g-card"><h2 class="g-fita g1">Mais vendidos hoje</h2><ul class="g-lista">${rank.map(([n, q]) => `<li>${ico(bebida(n) ? 'pedidos' : 'cloche')}<span>${t(n)}</span><b>${q}</b></li>`).join('') || '<li><span>Nada vendido ainda hoje</span></li>'}</ul></section>
      <section class="g-card"><h2 class="g-fita g2">Garçons</h2><ul class="g-lista">${gl.map(([g, val]) => `<li>${ico('pessoas')}<span>${t(g)}</span><b>${din(val)}</b></li>`).join('') || '<li><span>Sem vendas de salão hoje</span></li>'}</ul></section></div></div>`;
}
// cabeçalho das telas da gestão: título com louros e o aqueduto (conceito 7-gestao-cardapio-pc.png)
export const volta = (h, tit, sub = '') => `<header class="cab-tela cab-g"><a class="bt-ico so-cel" href="#${h}" aria-label="Voltar">${ico('voltar')}</a><div><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">${tit}<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1>${sub ? `<p>${sub}</p>` : ''}</div><img class="g-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>`;

// período dos relatórios: hoje, ontem, 7, 30, mes ou "AAAA-MM-DD~AAAA-MM-DD" (fim exclusivo)
const DIA = 864e5;
const ymd = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const meiaNoite = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const somaDias = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
function periodo(p = '30') {
  const hoje = meiaNoite(Date.now()), fim = somaDias(hoje, 1);
  const m = /^(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/.exec(String(p || ''));
  let r;
  if (p === 'hoje') r = { de: hoje, ate: fim, rot: 'Hoje' };
  else if (p === 'ontem') r = { de: somaDias(hoje, -1), ate: hoje, rot: 'Ontem' };
  else if (p === '7') r = { de: somaDias(hoje, -6), ate: fim, rot: 'Últimos 7 dias' };
  else if (p === 'mes') { const d = new Date(hoje); d.setDate(1); r = { de: d.getTime(), ate: fim, rot: 'Este mês' }; }
  else if (m) {
    let a = new Date(`${m[1]}T00:00`).getTime(), b = new Date(`${m[2]}T00:00`).getTime(); if (b < a) [a, b] = [b, a];
    r = { de: a, ate: somaDias(b, 1), rot: `${new Date(a).toLocaleDateString('pt-BR')} a ${new Date(b).toLocaleDateString('pt-BR')}`, id: 'per' };
  } else r = { de: somaDias(hoje, -29), ate: fim, rot: 'Últimos 30 dias', id: '30' };
  return { id: p, ...r, dias: Math.max(1, Math.round((r.ate - r.de) / DIA)) };
}
// agrupa uma lista por chave somando valores; e desenha as barras proporcionais (motivo, pessoa)
const agrupa = (l, chave, val) => { const m = {}; l.forEach((x) => { const k = chave(x) || 'Sem motivo'; (m[k] ||= { n: 0, v: 0 }); m[k].n++; m[k].v += val(x) || 0; }); return Object.entries(m).sort((a, b) => b[1].v - a[1].v); };
const props = (gr, tot) => gr.map(([k, x]) => `<div class="prop valor"><span>${t(k)} <small>(${x.n})</small></span><i style="width:${tot ? (x.v / tot) * 100 : 0}%"></i><b>${dinCurto(x.v)}</b></div>`).join('');

export const TELAS_MAIS = {
  // ---------------- cardápio
  cardapio(filtro) {
    const bts = `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="editar-prod">${ico('mais2')}Novo prato</button><button type="button" class="bt" data-acao="categorias">Categorias</button><button type="button" class="bt" data-acao="reajuste">Reajustar preços</button><a class="bt" href="${linkCardapio('delivery=1')}" target="_blank" rel="noopener">Ver como o cliente vê</a></div>`;
    if (!db.produtos.length) return volta('mais', 'Cardápio') + `<div class="vazio grande"><p><b>Comece pelo seu cardápio.</b></p><p>Cadastre cada prato com preço e foto, ou carregue o cardápio de exemplo e vá trocando nomes e preços.</p>
      <div class="linha-bts" style="justify-content:center;margin-top:14px"><button type="button" class="bt cheio" data-acao="editar-prod">${ico('mais2')}Novo prato</button><button type="button" class="bt" data-acao="cardapio-exemplo">Usar o cardápio de exemplo</button></div></div>`;
    const [catF = '', buscaF = ''] = String(filtro || '').split('~').map(decodeURIComponent);
    const lista = db.produtos.filter((p) => (!catF || p.cat === catF) && (!buscaF || p.nome.toLowerCase().includes(buscaF.toLowerCase())));
    const cats = db.categorias.filter((k) => lista.some((p) => p.cat === k.id));
    return volta('mais', 'Cardápio', `${db.produtos.length} pratos · ${db.produtos.filter((p) => !p.ativo).length} esgotados agora`) + bts + `
      <div class="filtros"><label class="busca">${ico('busca')}<input type="search" data-busca-prod value="${t(buscaF)}" placeholder="Buscar prato" aria-label="Buscar prato"></label>
        <div class="chips"><a class="chip ${!catF ? 'on' : ''}" href="#mais/cardapio/~${encodeURIComponent(buscaF)}">Todas</a>${db.categorias.map((k) => `<a class="chip ${catF === k.id ? 'on' : ''}" href="#mais/cardapio/${k.id}~${encodeURIComponent(buscaF)}">${t(k.nome)}</a>`).join('')}</div></div>
      ${cats.map((k) => `<section class="bloco"><div class="sec-tit"><h2>${t(k.nome)}</h2><span>${lista.filter((p) => p.cat === k.id).length}</span></div>
      <div class="tabela-rolo"><table class="tabela tab-prod"><thead><tr><th>Prato</th><th class="num">Preço</th><th class="num so-pc">Custo e margem</th><th>No cardápio</th><th></th></tr></thead><tbody>
      ${lista.filter((p) => p.cat === k.id).map((p) => { const custo = custoPrato(p), marg = p.preco ? Math.round((1 - custo / p.preco) * 100) : 0;
        return `<tr class="${p.ativo ? '' : 'off'}"><td class="tp-nome">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : `<span class="sem-foto">${ico('prato')}</span>`}<div><b>${t(p.nome)}</b><small>${[p.tamanhos?.length ? `${p.tamanhos.length} tamanhos` : '', (p.grupos || []).length ? `${p.grupos.length} grupo${p.grupos.length > 1 ? 's' : ''} de opções` : '', p.destaque ? 'destaque' : '', p.combo?.length ? 'combo' : '', p.vitrine ? 'vitrine' : '', p.etapa ? (ETAPAS.find((e) => e[0] === p.etapa)?.[1] || '').toLowerCase() : '', ...(p.tags || []).map(t)].filter(Boolean).join(' · ') || t(p.desc || '').slice(0, 60)}</small></div></td>
          <td class="num"><input class="preco-rapido" data-preco="${p.id}" inputmode="decimal" value="${dec2(p.preco)}" aria-label="Preço de ${t(p.nome)}">${p.porKg ? '<small>/kg</small>' : ''}</td>
          <td class="num so-pc">${custo ? `${din(custo)} · <b class="${marg < 55 ? 'erro' : ''}">${marg}%</b>` : '<small class="mudo">sem ficha</small>'}</td>
          <td><label class="interruptor"><input type="checkbox" data-acao="ativo" data-p="${p.id}" ${p.ativo ? 'checked' : ''}><span></span><em>${p.ativo ? 'Disponível' : 'Esgotado'}</em></label></td>
          <td class="acoes"><button type="button" class="bt-ico pq" data-acao="ordem" data-p="${p.id}" data-d="-1" title="Subir na ordem do cardápio" aria-label="Subir ${t(p.nome)}">↑</button><button type="button" class="bt-ico pq" data-acao="ordem" data-p="${p.id}" data-d="1" title="Descer na ordem do cardápio" aria-label="Descer ${t(p.nome)}">↓</button><button type="button" class="bt-ico pq" data-acao="duplicar" data-p="${p.id}" title="Duplicar o prato" aria-label="Duplicar ${t(p.nome)}">⧉</button><button type="button" class="bt-ico" data-acao="editar-prod" data-p="${p.id}" title="Editar o prato" aria-label="Editar ${t(p.nome)}">${ico('ajustes')}</button></td></tr>`; }).join('')}
      </tbody></table></div></section>`).join('') || '<div class="vazio">Nenhum prato com esse filtro.</div>'}`;
  },
  // ---------------- estoque
  estoque() {
    const l = db.insumos.slice().sort((a, b) => saldo(a) / (a.minimo || 1) - saldo(b) / (b.minimo || 1));
    return volta('mais', 'Estoque', 'Baixa sozinho a cada pedido enviado, pela ficha técnica de cada prato') + `<p class="legenda-est"><span><i class="ok"></i>Tranquilo</span><span><i class="medio"></i>Perto do mínimo</span><span><i class="baixo"></i>Repor agora</span><span>Barra cheia = o dobro do mínimo</span></p>
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="compra">${ico('mais2')}Entrada de compra</button><button type="button" class="bt" data-acao="perda">${ico('lixo')}Registrar perda</button><button type="button" class="bt" data-acao="inventario">${ico('check')}Inventário</button><button type="button" class="bt" data-acao="editar-insumo">Novo insumo</button><button type="button" class="bt" data-acao="lista-compras">Lista de compras</button></div>
      <ul class="lista-estoque">${l.map((i) => { const p = Math.max(0, Math.min(100, (saldo(i) / ((i.minimo || 1) * 2)) * 100)); const nivel = saldo(i) <= i.minimo ? 'baixo' : saldo(i) <= i.minimo * 1.5 ? 'medio' : '';
        return `<li class="${nivel}"><div><b>${t(i.nome)}</b><small>${fmtQtd(saldo(i), i.unid, i.fator)} · mínimo ${fmtQtd(i.minimo, i.unid, i.fator)} · ${din(i.custo)}/${t(i.compra)}</small><span class="barra"><i style="width:${p}%"></i></span></div>${nivel === 'baixo' ? `<em class="badge">Comprar ${Math.max(1, Math.ceil((i.minimo * 2 - saldo(i)) / i.fator))} ${t(i.compra)}</em>` : ''}<button type="button" class="bt-ico" data-acao="hist-insumo" data-i="${i.id}" aria-label="Movimentações de ${t(i.nome)}" title="Movimentações">${ico('relogio')}</button><button type="button" class="bt-ico" data-acao="editar-insumo" data-i="${i.id}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></li>`; }).join('') || '<li class="vazio">Nenhum insumo ainda. Cadastre o que você compra (carne, queijo, bebidas…) para o estoque baixar sozinho a cada pedido.</li>'}</ul>`;
  },
  // ---------------- relatórios
  relatorios(per) {
    const P = periodo(per), dentro = (ts) => ts >= P.de && ts < P.ate;
    const vP = db.vendas.filter((v) => dentro(v.ts) && !v.cancelado);
    const tot = (l) => r2(l.reduce((s, v) => s + v.total, 0)), totP = tot(vP), umDia = P.dias === 1;
    // vendas por dia (até 62 barras) e média por dia da semana
    const porDia = {}; vP.forEach((v) => { const k = ymd(v.ts); porDia[k] = (porDia[k] || 0) + v.total; });
    const dias = []; for (let d = new Date(P.de); d.getTime() < P.ate; d.setDate(d.getDate() + 1)) dias.push([new Date(d), porDia[ymd(d)] || 0]);
    const diasV = dias.slice(-62), max = Math.max(...diasV.map((d) => d[1]), 1);
    const sem = [0, 0, 0, 0, 0, 0, 0], semN = [0, 0, 0, 0, 0, 0, 0]; dias.forEach(([d, val]) => { sem[d.getDay()] += val; if (val) semN[d.getDay()]++; });
    const medSem = sem.map((s, k) => (semN[k] ? s / semN[k] : 0)); const maxSem = Math.max(...medSem, 1);
    const qtd = {}; vP.forEach((v) => v.itens.forEach((i) => { qtd[i.nome] = (qtd[i.nome] || 0) + i.qtd; }));
    const rank = Object.entries(qtd).sort((a, b) => b[1] - a[1]);
    const formas = {}; vP.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; }); const totF = totP || 1;
    const tipos = { mesa: 0, delivery: 0, balcao: 0 }; vP.forEach((v) => { tipos[v.tipo] = (tipos[v.tipo] || 0) + v.total; });
    const ticket = vP.length ? totP / vP.length : 0;
    const porHora = {}; vP.forEach((v) => { const h = new Date(v.ts).getHours(); porHora[h] = (porHora[h] || 0) + v.total; });
    const horas = Array.from({ length: 15 }, (_, k) => [k + 10, (porHora[(k + 10) % 24] || 0) / P.dias]); const maxH = Math.max(...horas.map((x) => x[1]), 1);
    const com = lojaCfg().comissao ?? 10, garc = {};
    vP.filter((v) => v.tipo === 'mesa').forEach((v) => { const g = v.garcom || 'Sem garçom'; (garc[g] ||= { n: 0, total: 0, serv: 0 }); garc[g].n++; garc[g].total += v.total; garc[g].serv += v.servico || 0; });
    // descontos, cancelamentos, perdas, CMV e curva ABC
    const desc = vP.filter((v) => v.desconto > 0), totDesc = r2(desc.reduce((s, v) => s + v.desconto, 0));
    const pessoa = (q) => String(q || '').split(' · ')[0];
    const aud = (db.auditoria || []).filter((a) => dentro(a.t)), itCanc = aud.filter((a) => a.tipo === 'cancelar-item'), totItCanc = r2(itCanc.reduce((s, a) => s + (a.valor || 0), 0));
    const quandoCanc = (v) => v.cancelado?.ts || v.ts;
    const vCanc = db.vendas.filter((v) => v.cancelado && !v.cancelado.reaberta && dentro(quandoCanc(v))), totVCanc = tot(vCanc);
    const reab = db.vendas.filter((v) => v.cancelado?.reaberta && dentro(v.cancelado.ts)).length;
    const perdas = (db.movEstoque || []).filter((m) => m.tipo === 'perda' && dentro(m.t)), totPerda = r2(perdas.reduce((s, m) => s + Math.abs(m.custo || 0), 0));
    const ajustes = r2((db.movEstoque || []).filter((m) => m.tipo === 'ajuste' && dentro(m.t)).reduce((s, m) => s + (m.custo || 0), 0));
    const receita = r2(vP.reduce((s, v) => s + v.total - (v.servico || 0) - (v.couvert || 0) - (v.entrega || 0), 0)), custo = r2(vP.reduce((s, v) => s + custoVenda(v), 0));
    const cmv = receita ? (custo / receita) * 100 : 0;
    const semFicha = [...new Set(vP.flatMap((v) => v.itens.filter((i) => !(prod(i.prod)?.ficha || []).length).map((i) => i.nome)))];
    const porProd = {}; vP.forEach((v) => v.itens.forEach((i) => { porProd[i.nome] = (porProd[i.nome] || 0) + i.qtd * i.preco; }));
    const totProd = Object.values(porProd).reduce((s, x) => s + x, 0) || 1; let acum = 0;
    const abc = Object.entries(porProd).sort((a, b) => b[1] - a[1]).map(([n, val]) => { const antes = acum; acum += val; return [n, val, (val / totProd) * 100, antes / totProd < 0.8 ? 'A' : antes / totProd < 0.95 ? 'B' : 'C']; });
    const ultimas = db.vendas.filter((v) => dentro(v.ts)).sort((a, b) => b.ts - a.ts).slice(0, 40);
    const vazioBloco = (txt) => `<div class="vazio">${txt}</div>`;
    return volta('mais', 'Relatórios', `${P.rot}${CONTA ? '' : ' · dados de exemplo'}`) + `
      <div class="filtros per-filtro"><div class="chips">${[['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês']].map(([k, n]) => `<a class="chip ${P.id === k ? 'on' : ''}" href="#mais/relatorios/${k}">${n}</a>`).join('')}</div>
        <form class="per-datas" data-per><label class="campo"><span>De</span><input type="date" name="de" value="${ymd(P.de)}"></label><label class="campo"><span>Até</span><input type="date" name="ate" value="${ymd(P.ate - 1)}"></label><button class="bt ${P.id === 'per' ? 'cheio' : ''}">Ver período</button></form></div>
      <section class="kpis"><div><small>Vendido</small><b>${dinCurto(totP)}</b><span>${vP.length} vendas</span></div><div><small>Ticket médio</small><b>${dinCurto(ticket)}</b><span>por conta</span></div>
        <div><small>Serviço (${db.config.servico}%)</small><b>${dinCurto(r2(vP.reduce((s, v) => s + (v.servico || 0), 0)))}</b><span>para a equipe</span></div><div><small>CMV teórico</small><b>${Math.round(cmv * 10) / 10}%</b><span>margem bruta ${dinCurto(receita - custo)}</span></div></section>
      ${umDia ? '' : `<section class="bloco"><div class="sec-tit"><h2>Vendas por dia</h2><span>${diasV.length} dias</span></div><div class="barras">${diasV.map(([d, val]) => `<div title="${d.toLocaleDateString('pt-BR')}: ${dinCurto(val)}"><i style="height:${(val / max) * 100}%"></i><small>${d.getDate()}</small></div>`).join('')}</div></section>
      <section class="bloco"><div class="sec-tit"><h2>Média por dia da semana</h2></div><div class="barras sem">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((n, k) => `<div title="${n}: ${dinCurto(medSem[k])}"><i style="height:${(medSem[k] / maxSem) * 100}%"></i><small>${n}</small></div>`).join('')}</div></section>`}
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Mais vendidos</h2></div><ol class="rank">${rank.slice(0, 5).map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('') || '<li><span>Nada vendido no período</span></li>'}</ol></section>
        <section class="bloco"><div class="sec-tit"><h2>Menos vendidos</h2></div><ol class="rank">${rank.slice(-5).reverse().map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('') || '<li><span>Nada vendido no período</span></li>'}</ol></section></div>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Formas de pagamento</h2></div>${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, val]) => `<div class="prop"><span>${t(f)}</span><i style="width:${(val / totF) * 100}%"></i><b>${Math.round((val / totF) * 100)}%</b></div>`).join('') || vazioBloco('Sem vendas no período.')}</section>
        <section class="bloco"><div class="sec-tit"><h2>Onde vende</h2></div>${[['mesa', 'Salão'], ['delivery', 'Delivery'], ['balcao', 'Balcão']].map(([k, n]) => `<div class="prop"><span>${n}</span><i style="width:${(tipos[k] / totF) * 100}%"></i><b>${Math.round((tipos[k] / totF) * 100)}%</b></div>`).join('')}</section></div>
      <section class="bloco"><div class="sec-tit"><h2>Movimento por hora</h2><span>${umDia ? 'no dia' : `média por dia (${P.dias} dias)`}</span></div><div class="barras horas">${horas.map(([h, val]) => `<div title="${h}h: ${dinCurto(val)}"><i style="height:${(val / maxH) * 100}%"></i><small>${h}</small></div>`).join('')}</div></section>
      <section class="bloco"><div class="sec-tit"><h2>Garçons</h2><span>salão · comissão de ${com}% do serviço</span></div>
        <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Garçom</th><th class="num">Contas</th><th class="num">Vendido</th><th class="num">Serviço</th><th class="num">Comissão</th></tr></thead><tbody>
        ${Object.entries(garc).sort((a, b) => b[1].total - a[1].total).map(([g, x]) => `<tr><td><b>${t(g)}</b></td><td class="num">${x.n}</td><td class="num">${dinCurto(x.total)}</td><td class="num">${dinCurto(x.serv)}</td><td class="num"><b>${dinCurto(x.serv * com / 100)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">As vendas do salão com garçom aparecem aqui.</td></tr>'}</tbody></table></div></section>
      <section class="bloco"><div class="sec-tit"><h2>CMV teórico</h2><span>pela ficha técnica e o preço de compra atual</span></div>
        <div class="resumo cartao-resumo"><div><span>Receita dos pratos (sem serviço, couvert e entrega)</span><b>${din(receita)}</b></div><div><span>Custo dos insumos</span><b>${din(custo)}</b></div>
          <div><span>CMV</span><b class="${cmv > 35 ? 'erro' : 'ok-txt'}">${Math.round(cmv * 10) / 10}%</b></div><div class="total"><span>Margem bruta</span><b>${din(receita - custo)} · ${Math.round((100 - cmv) * 10) / 10}%</b></div></div>
        ${semFicha.length ? `<p class="mudo">Sem ficha técnica (contam custo zero): ${semFicha.slice(0, 6).map(t).join(', ')}${semFicha.length > 6 ? ` e mais ${semFicha.length - 6}` : ''}.</p>` : ''}</section>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Descontos</h2><span>${desc.length} ${desc.length === 1 ? 'conta' : 'contas'} · ${dinCurto(totDesc)}</span></div>
          ${desc.length ? `<p class="mudo">Por motivo</p>${props(agrupa(desc, (v) => v.descontoMotivo || (v.cupom ? `Cupom ${v.cupom}` : ''), (v) => v.desconto), totDesc)}
          <p class="mudo" style="margin-top:10px">Por pessoa</p>${props(agrupa(desc, (v) => pessoa(v.descontoQuem) || v.garcom || 'Sem registro', (v) => v.desconto), totDesc)}` : vazioBloco('Nenhum desconto no período.')}</section>
        <section class="bloco"><div class="sec-tit"><h2>Cancelamentos e estornos</h2><span>${itCanc.length + vCanc.length} no período</span></div>
          <div class="resumo"><div><span>Itens cancelados depois de enviados (${itCanc.length})</span><b>${din(totItCanc)}</b></div><div><span>Vendas canceladas (${vCanc.length})</span><b>${din(totVCanc)}</b></div>${reab ? `<div><span>Contas reabertas</span><b>${reab}</b></div>` : ''}</div>
          ${itCanc.length || vCanc.length ? `<p class="mudo" style="margin-top:10px">Por motivo</p>${props(agrupa([...itCanc.map((a) => ({ m: a.motivo, q: a.quem, v: a.valor || 0 })), ...vCanc.map((v) => ({ m: v.cancelado.motivo, q: v.cancelado.quem, v: v.total }))], (x) => x.m, (x) => x.v), totItCanc + totVCanc)}
          <p class="mudo" style="margin-top:10px">Por pessoa</p>${props(agrupa([...itCanc.map((a) => ({ q: a.quem, v: a.valor || 0 })), ...vCanc.map((v) => ({ q: v.cancelado.quem, v: v.total }))], (x) => pessoa(x.q) || 'Sem registro', (x) => x.v), totItCanc + totVCanc)}` : ''}</section></div>
      <section class="bloco"><div class="sec-tit"><h2>Perdas de estoque</h2><span>${dinCurto(totPerda)}${ajustes ? ` · ajustes de inventário ${ajustes > 0 ? '+' : '−'} ${dinCurto(Math.abs(ajustes))}` : ''}</span></div>
        ${perdas.length ? props(agrupa(perdas, (m) => String(m.motivo || '').split(':')[0], (m) => Math.abs(m.custo || 0)), totPerda) : vazioBloco('Nenhuma perda registrada no período. Registre em Estoque › Registrar perda.')}</section>
      <section class="bloco"><div class="sec-tit"><h2>Curva ABC dos produtos</h2><span>A = 80% do faturamento · B = os 15% seguintes · C = o resto</span></div>
        <div class="tabela-rolo"><table class="tabela tab-abc"><thead><tr><th>Produto</th><th class="num">Vendido</th><th class="num">%</th><th>Classe</th></tr></thead><tbody>
        ${abc.map(([n, val, pc, cl]) => `<tr><td>${t(n)}</td><td class="num">${dinCurto(val)}</td><td class="num">${pc.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td><td><em class="abc abc-${cl}">${cl}</em></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></div></section>
      <section class="bloco"><div class="sec-tit"><h2>Vendas do período</h2><span>toque para ver, reabrir ou cancelar${ultimas.length === 40 ? ' · as 40 últimas' : ''}</span></div>
        <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Onde</th><th>Pagamento</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${ultimas.map((v) => `<tr class="${v.cancelado ? 'off' : ''}"><td>${new Date(v.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${v.tipo === 'mesa' ? `Mesa ${v.mesa ?? ''}` : v.tipo === 'delivery' ? 'Delivery' : 'Balcão'}${v.cancelado ? `<small class="erro">${v.cancelado.reaberta ? 'Reaberta' : 'Cancelada'}</small>` : ''}</td><td>${t(v.forma || '')}</td><td class="num">${dinCurto(v.total)}</td>
          <td class="acoes"><button type="button" class="bt-ico" data-acao="ver-venda" data-v="${t(v.id)}" aria-label="Ver a venda">${ico('dir')}</button></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Sem vendas no período.</td></tr>'}</tbody></table></div></section>
      <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt" data-acao="historico-caixas">${ico('caixa')}Histórico de caixas</button><button type="button" class="bt" data-acao="baixar-vendas">${ico('estoque')}Baixar as vendas (planilha CSV)</button></div>`;
  },
  // ---------------- ajustes
  ajustes() {
    const c = db.config, L = lojaCfg(), R = regras();
    return volta('mais', 'Caixa e regras') + `<form class="form" data-ajustes>
      <label class="campo"><span>Chave Pix do restaurante (o QR da conta usa esta chave)</span><input name="pix" value="${c.pix?.exemplo ? '' : t(c.pix?.chave || '')}" placeholder="CNPJ, celular, e-mail ou chave aleatória"></label>
      <div class="duas-c"><label class="campo"><span>Taxa de serviço (%)</span><input name="servico" inputmode="numeric" value="${c.servico}"></label><label class="campo"><span>Comissão dos garçons (% do serviço que vai para eles)</span><input name="comissao" inputmode="numeric" value="${L.comissao ?? 10}"></label></div>
      <label class="campo"><span>Garçons (separados por vírgula)</span><input name="garcons" value="${t((c.garcons || []).join(', '))}"></label>
      <label class="campo"><span>Peso do prato vazio, para comida por quilo (gramas)</span><input name="tara" inputmode="numeric" value="${c.tara || ''}" placeholder="0"></label>
      <div class="duas-c"><label class="campo"><span>Avisar mesa sem atenção depois de (minutos, 0 desliga)</span><input name="al_mesa" inputmode="numeric" value="${L.alertas?.mesa ?? 25}"></label><label class="campo"><span>Comanda atrasada na cozinha depois de (minutos)</span><input name="al_kds" inputmode="numeric" value="${L.alertas?.kds ?? 10}"></label></div>
      <div class="sec-tit"><h2>Gerente e conferência</h2></div>
      <p class="mudo">Com o PIN, só o gerente libera: desconto acima do limite, cancelar item já enviado, cancelar venda fechada, reabrir conta e sangria. Sem PIN, nada trava, mas tudo fica registrado.</p>
      <div class="duas-c"><label class="campo"><span>PIN do gerente (4 números)</span><input name="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="${temPin() ? '•••• (já tem PIN; digite para trocar)' : 'Sem PIN'}"></label>
        <label class="campo"><span>Desconto sem PIN até (%)</span><input name="limite" inputmode="decimal" value="${vir(R.limiteDesconto)}"></label></div>
      ${temPin() ? '<label class="interruptor bloco-int"><input type="checkbox" name="tirarPin"><span></span>Tirar o PIN do gerente</label>' : ''}
      <label class="interruptor bloco-int"><input type="checkbox" name="cega" ${R.conferenciaCega ? 'checked' : ''}><span></span>Conferência cega: no fechamento, conta cada forma de pagamento antes de ver o esperado</label>
      <button class="bt cheio grande">Salvar</button></form>
      <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt" data-acao="auditoria">${ico('conta')}Registro de auditoria</button></div>
      ${CONTA ? '' : '<button type="button" class="bt perigo" data-acao="recomecar" style="margin-top:22px">Recomeçar a demonstração</button>'}`;
  },
  aparelho() {
    const p = papel();
    return volta('mais', 'Este aparelho', 'O que este celular, tablet ou computador faz no restaurante') + `<div class="papeis">${Object.entries(PAPEIS).map(([k, [nome]]) => `<button type="button" class="papel ${p === k ? 'on' : ''}" data-acao="papel" data-p="${k}"><b>${nome}</b><small>${{ garcom: 'Abre na fila do salão e nas mesas', cozinha: 'Abre na tela de pedidos da cozinha e do bar', caixa: 'Abre no caixa, para fechar contas', dono: 'Vê tudo, com relatórios e ajustes' }[k]}</small></button>`).join('')}</div>`;
  },
};
export const MONTAR = {
  cardapio(el) {
    const i = $('[data-busca-prod]', el); let tm;
    if (i) i.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { const cat = decodeURIComponent(location.hash.split('/')[2] || '').split('~')[0]; ir(`mais/cardapio/${cat}~${encodeURIComponent(i.value)}`); setTimeout(() => { const n = $('[data-busca-prod]'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); }, 30); }, 350); };
    $$('[data-preco]', el).forEach((inp) => { inp.onchange = () => { const p = prod(inp.dataset.preco), v = num(inp.value); if (p && v > 0) { p.preco = r2(v); inp.value = dec2(v); grava(); toast(`${p.nome}: ${din(v)}`); } else if (p) inp.value = dec2(p.preco); }; });
  },
  ajustes(el) {
    const f = $('[data-ajustes]', el); if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault(); const c = db.config;
      // trocar ou tirar o PIN pede o PIN atual
      const novoPin = f.pin.value.trim(), tirar = !!f.tirarPin?.checked;
      if (novoPin && !/^\d{4}$/.test(novoPin)) { toast('O PIN tem 4 números'); return f.pin.focus(); }
      if ((novoPin || tirar) && temPin() && !(await autorizar({ titulo: 'PIN atual do gerente', texto: 'Para trocar ou tirar o PIN, digite o PIN atual.', pedirPin: true, sim: 'Confirmar' }))) return;
      c.servico = Math.max(0, Math.min(20, Number(f.servico.value) || 0));
      if (f.pix.value.trim()) c.pix = { tipo: 'chave', chave: f.pix.value.trim(), exemplo: false };
      c.tara = Math.max(0, Math.min(2000, Number(f.tara.value) || 0)); c.garcons = f.garcons.value.split(',').map((x) => x.trim()).filter(Boolean);
      const R = regras(), lim = Math.max(0, Math.min(100, num(f.limite.value)));
      const muda = { limiteDesconto: lim, conferenciaCega: f.cega.checked, ...(tirar ? { pin: '' } : novoPin ? { pin: novoPin } : {}) };
      if (tirar || novoPin) auditar('pin', { motivo: tirar ? 'PIN do gerente tirado' : R.pin ? 'PIN do gerente trocado' : 'PIN do gerente criado' });
      if (lim !== R.limiteDesconto || muda.conferenciaCega !== R.conferenciaCega) auditar('regras', { motivo: `Desconto sem PIN até ${lim}% · conferência cega ${muda.conferenciaCega ? 'ligada' : 'desligada'}` });
      db.config.regras = { ...R, ...muda };
      setLoja({ comissao: Math.max(0, Math.min(100, Number(f.comissao.value) || 0)), alertas: { mesa: Math.max(0, Math.min(240, Math.round(num(f.al_mesa.value)))), kds: Math.max(1, Math.min(120, Math.round(num(f.al_kds.value)) || 10)) } });
      toast('Salvo');
    };
  },
  relatorios(el) {
    const f = $('[data-per]', el); if (!f) return;
    f.onsubmit = (e) => { e.preventDefault(); if (!f.de.value || !f.ate.value) return toast('Escolha as duas datas'); ir(`mais/relatorios/${f.de.value}~${f.ate.value}`); };
  },

};
acao('ativo', (b) => { const p = prod(b.dataset.p); p.ativo = b.checked; grava(); toast(p.ativo ? `${p.nome} voltou ao cardápio` : `${p.nome} marcado como esgotado`); });
// foto do prato: reduzida no aparelho (480 px, webp) para caber nos dados e abrir rápido no celular do cliente
function reduzirFoto(arq) {
  return new Promise((ok, falha) => {
    const img = new Image(); const u = URL.createObjectURL(arq);
    img.onload = () => {
      const W = 480, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const esc = Math.max(W / img.width, H / img.height), w = img.width * esc, h = img.height * esc; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/webp', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('foto')); }; img.src = u;
  });
}
// "1.234,50" e "12,5" viram número
const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const dec2 = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
acao('editar-prod', (b) => {
  const novo = !b.dataset.p;
  const p = novo ? { id: uid('p'), cat: db.categorias[0]?.id || '', nome: '', desc: '', preco: 0, setor: 'cozinha', foto: '', ativo: true, adicionais: [], ficha: [] } : prod(b.dataset.p);
  if (!p) return;
  let foto = p.foto || '', ficha = (p.ficha || []).map((f) => ({ ...f })), adic = (p.adicionais || []).map((a) => ({ ...a }));
  let tams = (p.tamanhos || []).map((x) => ({ ...x })), grupos = (p.grupos || []).map((g) => ({ ...g, opcoes: (g.opcoes || []).map((o) => ({ ...o })) }));
  const MD = modulosAtivos(lojaCfg()); let combo = (p.combo || []).map((g) => ({ nome: g.nome, itens: [...(g.itens || [])] }));
  const outros = db.produtos.filter((x) => x.id !== p.id && !x.combo?.length);
  const blocosCombo = () => combo.map((g, k) => `<div class="grupo-ed" data-cb="${k}"><div class="grupo-cab"><input data-cbn value="${t(g.nome)}" placeholder="Ex.: Lanche, Acompanhamento, Bebida" aria-label="Nome do grupo do combo"><button type="button" class="bt-ico" data-cbtira="${k}" aria-label="Tirar grupo">${ico('lixo')}</button></div>
      <div class="chips quebra">${outros.map((x) => `<label class="chip ${g.itens.includes(x.id) ? 'on' : ''}"><input type="checkbox" value="${x.id}" ${g.itens.includes(x.id) ? 'checked' : ''} hidden>${t(x.nome)}</label>`).join('')}</div></div>`).join('');
  // funções da casa no prato (só as ligadas): combo, pimenta, ponto, etapa, harmonização, vitrine, alergênicos, porções para dividir
  const blocoCasa = () => {
    const l = [];
    if (MD.has('combos')) l.push(`<div class="campo"><span>Combo: grupos com o que o cliente escolhe (de 2 a 4). O preço do combo é o preço acima.</span><div data-combo>${blocosCombo()}</div><button type="button" class="link" data-maiscombo>+ Grupo do combo</button></div>`);
    const esc = [['picancia', 'Nível de pimenta'], ['pontoCarne', 'Ponto da carne'], ['pontoMassa', 'Ponto da massa']].filter(([k]) => MD.has(k));
    if (esc.length) l.push(`<div class="${esc.length > 1 ? 'tres-c' : ''}">${esc.map(([k, n]) => `<label class="campo"><span>${n}</span><select data-escolha="${k}">${[['', 'Não pede'], ['opcional', 'Opcional'], ['obrigatorio', 'Obrigatório']].map(([v, r]) => `<option value="${v}" ${modoEscolha(p[k]) === v ? 'selected' : ''}>${r}</option>`).join('')}</select></label>`).join('')}</div>`);
    if (MD.has('vitrine')) l.push(`<label class="interruptor bloco-int"><input type="checkbox" data-flag="vitrine" ${p.vitrine ? 'checked' : ''}><span></span>Vitrine: sai pronto, sem passar pela cozinha</label>`);
    if (MD.has('etapas') || MD.has('harmonizacao')) l.push(`<div class="duas-c">${MD.has('etapas') ? `<label class="campo"><span>Etapa do prato</span><select data-etapa><option value="">Sem etapa (sai na hora)</option>${ETAPAS.map(([k, n]) => `<option value="${k}" ${p.etapa === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      ${MD.has('harmonizacao') ? `<label class="campo"><span>Combina com (bebida sugerida)</span><select data-harm><option value="">Nenhuma</option>${db.produtos.filter((x) => x.id !== p.id).sort((a, b) => (a.setor === 'bar' ? 0 : 1) - (b.setor === 'bar' ? 0 : 1)).map((x) => `<option value="${x.id}" ${p.harmoniza === x.id ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select></label>` : ''}</div>`);
    if (MD.has('alergenicos')) l.push(`<div class="campo"><span>Alergênicos e dietas</span><div class="chips quebra">${ALERGENOS.map(([k, n, tipo]) => `<label class="chip ${(p.alergenos || []).includes(k) ? 'on' : ''}"><input type="checkbox" data-alg value="${k}" ${(p.alergenos || []).includes(k) ? 'checked' : ''} hidden>${tipo === 'contem' ? 'Contém ' + n.toLowerCase() : n}</label>`).join('')}</div></div>`);
    if (MD.has('porcoesFamilia')) l.push(`<div class="campo"><span>Porções para compartilhar: vire os tamanhos “Para 2” e “Para 4 pessoas”, cada um com o seu preço.</span><button type="button" class="link" data-familia>+ Para 2 e para 4 pessoas</button></div>`);
    const TU = lojaCfg().turnos || {};
    if (TU.ligado) l.push(`<label class="campo"><span>Disponível em</span><select data-turno><option value="">Sempre (ou o turno da categoria)</option>${TURNOS.map(([k, n]) => `<option value="${k}" ${p.turno === k ? 'selected' : ''}>Só no ${n.toLowerCase()} (${t((TU[k] || []).join(' às '))})</option>`).join('')}</select></label>`);
    if (p.setor === 'bar' || p.ml) l.push(`<label class="campo"><span>Chopp de barril: ml por copo (o barril baixa a cada venda; vazio = não é chopp)</span><input data-ml inputmode="numeric" value="${p.ml || ''}" placeholder="Ex.: 300"></label>`);
    return l.length ? `<section class="bloco-form casa-prato"><h2>Funções do negócio</h2>${l.join('')}</section>` : '';
  };
  // quilo: preço por horário (ex.: R$ 69,90 até 14h30 e R$ 49,90 depois)
  const fx = (p.faixasKg || []).concat([{}, {}]).slice(0, 2);
  const blocoKg = () => `<div class="campo" data-kgbox ${p.porKg ? '' : 'hidden'}><span>Preço do quilo por horário (opcional): a partir de que hora vale outro preço</span>${fx.map((x, k) => `<div class="duas-c kg-faixa"><input data-kgde="${k}" type="time" value="${t(x.de || '')}" aria-label="A partir das"><input data-kgpr="${k}" inputmode="decimal" value="${x.preco ? dec2(x.preco) : ''}" placeholder="Preço do quilo" aria-label="Preço do quilo a partir desse horário"></div>`).join('')}</div>`;
  const linhasTam = () => tams.map((x, k) => `<li><input data-tn="${k}" value="${t(x.nome)}" placeholder="Ex.: Grande" aria-label="Tamanho"><input data-tp="${k}" inputmode="decimal" value="${dec2(x.preco)}" aria-label="Preço do tamanho" placeholder="Preço"><input data-tf="${k}" inputmode="decimal" value="${vir(x.fator ?? 1)}" aria-label="Quanto gasta da ficha (1 = inteira)" title="Quanto gasta da ficha técnica: 1 = inteira, 0,5 = metade"><button type="button" class="bt-ico" data-ttira="${k}" aria-label="Tirar tamanho">${ico('lixo')}</button></li>`).join('');
  const blocosGrupo = () => grupos.map((g, k) => `<div class="grupo-ed" data-g="${k}"><div class="grupo-cab"><input data-gn value="${t(g.nome)}" placeholder="Ex.: Ponto da carne, Borda, Molhos" aria-label="Nome do grupo">
      <label class="interruptor"><input type="checkbox" data-gobr ${g.min ? 'checked' : ''}><span></span><em>Obrigatório</em></label>
      <label class="mini">Até <input data-gmax inputmode="numeric" value="${g.max || 1}" aria-label="Escolhe até"></label><button type="button" class="bt-ico" data-gtira="${k}" aria-label="Tirar grupo">${ico('lixo')}</button></div>
      <textarea data-gop rows="3" placeholder="Uma opção por linha. Com preço: Catupiry | 9">${t((g.opcoes || []).map((o) => (Number(o.preco) ? `${o.nome} | ${vir(o.preco)}` : o.nome)).join('\n'))}</textarea></div>`).join('');
  const linhasFicha = () => ficha.map((f, k) => {
    const i = insumo(f.insumo);
    return `<li><select data-fi="${k}" aria-label="Insumo">${db.insumos.map((x) => `<option value="${x.id}" ${x.id === f.insumo ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select>
    <input data-fq="${k}" inputmode="decimal" value="${vir(f.qtd)}" aria-label="Quantidade"><small>${t(i?.unid || '')}</small><button type="button" class="bt-ico" data-ftira="${k}" aria-label="Tirar da ficha">${ico('lixo')}</button></li>`;
  }).join('');
  const linhasAdic = () => adic.map((a, k) => `<li><input data-an="${k}" value="${t(a.nome)}" placeholder="Ex.: Bacon" aria-label="Adicional"><input data-ap="${k}" inputmode="decimal" value="${vir(a.preco)}" aria-label="Preço do adicional"><button type="button" class="bt-ico" data-atira="${k}" aria-label="Tirar adicional">${ico('lixo')}</button></li>`).join('');
  const caixaFoto = () => (foto ? `<img src="${t(foto)}" alt="">` : `<span class="sem-foto grande">${ico('prato')}</span>`);
  folha({
    titulo: novo ? 'Novo prato' : p.nome, larga: true, corpo: `
    <div class="foto-prato"><div data-foto>${caixaFoto()}</div>
      <div class="linha-bts"><label class="bt">${ico('mais2')}<span data-tfoto>${foto ? 'Trocar a foto' : 'Pôr foto'}</span><input type="file" accept="image/*" data-arq hidden></label><button type="button" class="link" data-semfoto ${foto ? '' : 'hidden'}>Tirar a foto</button></div></div>
    <div class="duas-c"><label class="campo"><span>Nome</span><input data-n value="${t(p.nome)}" maxlength="80"></label><label class="campo"><span>Preço (R$)</span><input data-pr inputmode="decimal" value="${p.preco ? dec2(p.preco) : ''}" placeholder="0,00"></label></div>
    <div class="duas-c"><label class="campo"><span>Categoria</span><select data-cat>${db.categorias.map((c) => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${t(c.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Sai na tela da</span><select data-setor><option value="cozinha" ${p.setor !== 'bar' ? 'selected' : ''}>Cozinha</option><option value="bar" ${p.setor === 'bar' ? 'selected' : ''}>Bar</option></select></label></div>
    <label class="campo"><span>Descrição (aparece para o cliente)</span><textarea data-d rows="2" maxlength="240">${t(p.desc)}</textarea></label>
    <label class="interruptor bloco-int"><input type="checkbox" data-pizza ${p.pizza ? 'checked' : ''}><span></span>É pizza: aceita meia a meia e cobra o sabor mais caro</label>
    <label class="interruptor bloco-int"><input type="checkbox" data-kg ${p.porKg ? 'checked' : ''}><span></span>Vendido por quilo: o preço é do quilo e pede o peso na hora</label>
    ${blocoKg()}
    <div class="duas-c"><label class="campo"><span>Preço antigo, para promoção (opcional)</span><input data-promo inputmode="decimal" value="${p.promoDe ? vir(p.promoDe) : ''}" placeholder="aparece riscado"></label><label class="campo"><span>Serve (opcional)</span><input data-serve value="${t(p.serve || '')}" placeholder="Ex.: Serve 2 pessoas"></label></div>
    <div class="duas-c"><label class="campo"><span>Etiquetas (separadas por vírgula)</span><input data-tags value="${t((p.tags || []).join(', '))}" placeholder="Vegetariano, Picante, Novo"></label>
      <label class="interruptor bloco-int" style="align-self:end"><input type="checkbox" data-dest ${p.destaque ? 'checked' : ''}><span></span>Destaque no topo do cardápio</label></div>
    <div class="campo"><span>Tamanhos (opcional: P, M, G, broto…). O preço de cada tamanho vale no lugar do preço acima.</span><ul class="ficha-ed tam-ed" data-tams>${linhasTam()}</ul><button type="button" class="link" data-maistam>+ Tamanho</button></div>
    <div class="campo"><span>Complementos e escolhas (ponto da carne, borda, molhos, sabor…)</span><div data-grupos>${blocosGrupo()}</div><button type="button" class="link" data-maisgrupo>+ Grupo de opções</button> <button type="button" class="link" data-bebida>+ Montagem de bebida (tamanho, leite, temperatura, extra e xarope)</button></div>
    <div class="campo"><span>Adicionais soltos (cada um soma no preço)</span><ul class="ficha-ed" data-adic>${linhasAdic()}</ul><button type="button" class="link" data-maisadic>+ Adicional</button></div>
    ${blocoCasa()}
    <div class="campo"><span>Ficha técnica: o que sai do estoque a cada 1 vendido</span>${db.insumos.length ? `<ul class="ficha-ed" data-ficha>${linhasFicha()}</ul><button type="button" class="link" data-maisficha>+ Insumo na ficha</button>` : '<p class="mudo">Cadastre os insumos em Gestão › Estoque para o sistema baixar o estoque e calcular o custo do prato.</p>'}</div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar este prato</button>'}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const lerListas = () => {
        ficha = ficha.map((x, k) => ({ insumo: $(`[data-fi="${k}"]`, f)?.value || x.insumo, qtd: num($(`[data-fq="${k}"]`, f)?.value) }));
        adic = adic.map((x, k) => ({ nome: $(`[data-an="${k}"]`, f)?.value.trim() || '', preco: num($(`[data-ap="${k}"]`, f)?.value) }));
        tams = tams.map((x, k) => ({ nome: $(`[data-tn="${k}"]`, f)?.value.trim() || '', preco: num($(`[data-tp="${k}"]`, f)?.value), fator: num($(`[data-tf="${k}"]`, f)?.value) || 1 }));
        grupos = $$('[data-g]', f).map((el, k) => ({ id: grupos[k]?.id || uid('g'), nome: $('[data-gn]', el).value.trim(), min: $('[data-gobr]', el).checked ? 1 : 0, max: Math.max(1, Math.round(num($('[data-gmax]', el).value)) || 1),
          opcoes: $('[data-gop]', el).value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, pr] = l.split('|').map((x) => x.trim()); return { nome: n.slice(0, 60), preco: r2(Math.max(0, num(pr))) }; }) }));
      };
      const lerCombo = () => { combo = $$('[data-cb]', f).map((el) => ({ nome: $('[data-cbn]', el).value.trim(), itens: $$('input[type=checkbox]:checked', el).map((i) => i.value) })); };
      const redesenha = () => { const fi = $('[data-ficha]', f); if (fi) fi.innerHTML = linhasFicha(); $('[data-adic]', f).innerHTML = linhasAdic(); $('[data-tams]', f).innerHTML = linhasTam(); $('[data-grupos]', f).innerHTML = blocosGrupo(); const cb = $('[data-combo]', f); if (cb) cb.innerHTML = blocosCombo(); };
      f.addEventListener('change', (e) => { const i = e.target; if (i.matches('.chip input[type=checkbox]')) i.closest('.chip').classList.toggle('on', i.checked); });
      $('[data-maiscombo]', f)?.addEventListener('click', () => { lerListas(); lerCombo(); if (combo.length >= 4) return toast('No máximo 4 grupos no combo'); combo.push({ nome: '', itens: [] }); redesenha(); });
      f.addEventListener('click', (e) => { const x = e.target.closest('[data-cbtira]'); if (!x) return; lerListas(); lerCombo(); combo.splice(Number(x.dataset.cbtira), 1); redesenha(); });
      $('[data-familia]', f)?.addEventListener('click', () => { lerListas(); const pr = num($('[data-pr]', f).value) || p.preco || 0;
        if (!tams.some((x) => /para 2/i.test(x.nome))) tams.push({ nome: 'Para 2 pessoas', preco: r2(pr), fator: 1 });
        if (!tams.some((x) => /para 4/i.test(x.nome))) tams.push({ nome: 'Para 4 pessoas', preco: r2(pr * 1.8), fator: 2 });
        redesenha(); toast('Tamanhos para 2 e para 4 criados: confira os preços'); });
      f.addEventListener('click', (e) => {
        const x = e.target.closest('[data-ftira],[data-atira],[data-ttira],[data-gtira]'); if (!x) return; lerListas();
        if (x.dataset.ftira !== undefined) ficha.splice(Number(x.dataset.ftira), 1); else if (x.dataset.atira !== undefined) adic.splice(Number(x.dataset.atira), 1);
        else if (x.dataset.ttira !== undefined) tams.splice(Number(x.dataset.ttira), 1); else grupos.splice(Number(x.dataset.gtira), 1);
        redesenha();
      });
      $('[data-maisficha]', f)?.addEventListener('click', () => { lerListas(); ficha.push({ insumo: db.insumos[0].id, qtd: 0 }); redesenha(); $(`[data-fq="${ficha.length - 1}"]`, f)?.focus(); });
      $('[data-maistam]', f).onclick = () => { lerListas(); tams.push({ nome: '', preco: 0, fator: 1 }); redesenha(); $(`[data-tn="${tams.length - 1}"]`, f)?.focus(); };
      $('[data-maisgrupo]', f).onclick = () => { lerListas(); grupos.push({ id: uid('g'), nome: '', min: 0, max: 1, opcoes: [] }); redesenha(); $$('[data-gn]', f).at(-1)?.focus(); };
      $('[data-maisadic]', f).onclick = () => { lerListas(); adic.push({ nome: '', preco: 0 }); redesenha(); $(`[data-an="${adic.length - 1}"]`, f)?.focus(); };
      $('[data-kg]', f).addEventListener('change', (e) => { $('[data-kgbox]', f).hidden = !e.target.checked; });
      // cafeteria: os grupos de uma bebida montada, prontos para ajustar os preços
      $('[data-bebida]', f).onclick = () => {
        lerListas(); const tem = (n) => grupos.some((g) => g.nome.toLowerCase() === n.toLowerCase()); let n = 0;
        MONTAGEM_BEBIDA.forEach((g) => { if (!tem(g.nome)) { grupos.push({ id: uid('g'), ...g, opcoes: g.opcoes.map((o) => ({ ...o })) }); n++; } });
        redesenha(); toast(n ? `${n} grupos criados: confira os preços` : 'A montagem de bebida já está neste produto');
      };
      const mostraFoto = () => { $('[data-foto]', f).innerHTML = caixaFoto(); $('[data-tfoto]', f).textContent = foto ? 'Trocar a foto' : 'Pôr foto'; $('[data-semfoto]', f).hidden = !foto; };
      $('[data-arq]', f).onchange = async (e) => {
        const a = e.target.files?.[0]; if (!a) return;
        try { foto = await reduzirFoto(a); mostraFoto(); } catch { toast('Não consegui abrir essa foto. Tente outra.'); }
      };
      $('[data-semfoto]', f).onclick = () => { foto = ''; mostraFoto(); };
      $('[data-apagar]', f)?.addEventListener('click', async () => {
        if (!(await confirma(`Apagar ${p.nome} do cardápio?`, 'Apagar', true))) return;
        db.produtos = db.produtos.filter((x) => x !== p); grava(); fechar(); toast('Prato apagado');
      });
      $('[data-ok]', f).onclick = () => {
        lerListas();
        const nome = $('[data-n]', f).value.trim(), preco = num($('[data-pr]', f).value);
        if (!nome) { toast('Escreva o nome do prato'); return $('[data-n]', f).focus(); }
        const tamOk = tams.filter((x) => x.nome && x.preco > 0);
        if (!(preco > 0) && !tamOk.length) { toast('Escreva o preço'); return $('[data-pr]', f).focus(); }
        const grOk = grupos.filter((g) => g.nome && g.opcoes.length);
        if ($('[data-combo]', f)) lerCombo();
        const cbOk = combo.filter((g) => g.nome && g.itens.length);
        if (cbOk.length === 1) { toast('O combo precisa de pelo menos 2 grupos com opções'); return; }
        const casa = {};
        $$('[data-flag]', f).forEach((i) => { casa[i.dataset.flag] = i.checked; });
        $$('[data-escolha]', f).forEach((i) => { casa[i.dataset.escolha] = i.value; });
        if ($('[data-turno]', f)) casa.turno = $('[data-turno]', f).value;
        if ($('[data-ml]', f)) casa.ml = Math.max(0, Math.round(num($('[data-ml]', f).value))) || 0;
        casa.faixasKg = [0, 1].map((k) => ({ de: $(`[data-kgde="${k}"]`, f)?.value || '', preco: r2(num($(`[data-kgpr="${k}"]`, f)?.value)) })).filter((x) => x.de && x.preco > 0);
        if ($('[data-etapa]', f)) casa.etapa = $('[data-etapa]', f).value;
        if ($('[data-harm]', f)) casa.harmoniza = $('[data-harm]', f).value;
        if ($('[data-alg]', f)) casa.alergenos = $$('[data-alg]:checked', f).map((i) => i.value);
        if ($('[data-combo]', f)) casa.combo = cbOk.slice(0, 4);
        if (grOk.some((g) => g.min && g.max < g.min)) { toast('Confira o “até” dos grupos obrigatórios'); return; }
        Object.assign(p, {
          nome, preco: r2(preco > 0 ? preco : Math.max(...tamOk.map((x) => x.preco))), tamanhos: tamOk, grupos: grOk, tags: $('[data-tags]', f).value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4),
          destaque: $('[data-dest]', f).checked, promoDe: r2(num($('[data-promo]', f).value)) || 0, serve: $('[data-serve]', f).value.trim(), desc: $('[data-d]', f).value.trim(), cat: $('[data-cat]', f).value, setor: $('[data-setor]', f).value, pizza: $('[data-pizza]', f).checked, porKg: $('[data-kg]', f).checked,
          foto, adicionais: adic.filter((a) => a.nome).map((a) => ({ nome: a.nome, preco: r2(Math.max(0, a.preco)) })), ficha: ficha.filter((x) => x.insumo && x.qtd > 0), ...casa,
        });
        if (novo) db.produtos.push(p);
        grava(); fechar(); toast(novo ? 'Prato cadastrado' : 'Prato salvo');
      };
    },
  });
});
export const MONTAGEM_BEBIDA = [
  { nome: 'Tamanho', min: 1, max: 1, opcoes: [{ nome: 'P', preco: 0 }, { nome: 'M', preco: 2 }, { nome: 'G', preco: 4 }] },
  { nome: 'Leite', min: 1, max: 1, opcoes: [{ nome: 'Integral', preco: 0 }, { nome: 'Desnatado', preco: 0 }, { nome: 'Sem lactose', preco: 1.5 }, { nome: 'Vegetal (aveia)', preco: 3 }] },
  { nome: 'Temperatura', min: 1, max: 1, opcoes: [{ nome: 'Quente', preco: 0 }, { nome: 'Gelado', preco: 0 }] },
  { nome: 'Extra dose de café', min: 0, max: 2, opcoes: [{ nome: 'Dose extra', preco: 4 }, { nome: 'Dose dupla extra', preco: 7 }] },
  { nome: 'Xarope', min: 0, max: 2, opcoes: [{ nome: 'Baunilha', preco: 3 }, { nome: 'Caramelo', preco: 3 }, { nome: 'Avelã', preco: 3 }] },
];
acao('cardapio-exemplo', async () => {
  if (!(await confirma('Carregar os 22 pratos de exemplo, com fotos e fichas técnicas? Depois é só trocar nomes e preços e apagar o que não serve.', 'Carregar'))) return;
  const { cardapioExemplo } = await import('./dados.js?v=31'); const ex = cardapioExemplo();
  db.produtos.push(...ex.produtos.filter((p) => !prod(p.id))); ex.insumos.forEach((i) => { if (!insumo(i.id)) db.insumos.push(i); });
  grava(); toast('Cardápio de exemplo carregado');
});
acao('categorias', () => {
  const TU = lojaCfg().turnos || {};
  const linhas = () => db.categorias.map((c, k) => `<li><input data-cn="${k}" value="${t(c.nome)}" aria-label="Nome da categoria">${TU.ligado ? `<select data-ct="${k}" aria-label="Turno de ${t(c.nome)}"><option value="">Sempre</option>${TURNOS.map(([v, n]) => `<option value="${v}" ${c.turno === v ? 'selected' : ''}>Só ${n.toLowerCase()}</option>`).join('')}</select>` : ''}<small>${db.produtos.filter((p) => p.cat === c.id).length} pratos</small></li>`).join('');
  folha({
    titulo: 'Categorias', corpo: `<p class="mudo">Categoria sem prato não aparece para o cliente.${TU.ligado ? ' O turno esconde a categoria fora do horário.' : ''}</p><ul class="ficha-ed" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Categoria</button>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const ler = () => db.categorias.forEach((c, k) => { const v = $(`[data-cn="${k}"]`, f)?.value.trim(); if (v) c.nome = v; const tu = $(`[data-ct="${k}"]`, f); if (tu) { if (tu.value) c.turno = tu.value; else delete c.turno; } });
      $('[data-mais]', f).onclick = () => { ler(); db.categorias.push({ id: uid('c'), nome: 'Nova categoria' }); $('[data-l]', f).innerHTML = linhas(); $(`[data-cn="${db.categorias.length - 1}"]`, f).select(); };
      $('[data-ok]', f).onclick = () => { ler(); grava(); fechar(); toast('Categorias salvas'); };
    },
  });
});
acao('editar-insumo', (b) => {
  const novo = !b.dataset.i;
  const i = novo ? { id: uid('i'), nome: '', unid: 'g', compra: 'kg', fator: 1000, estoque: 0, minimo: 0, custo: 0 } : insumo(b.dataset.i);
  if (!i) return;
  folha({
    titulo: novo ? 'Novo insumo' : i.nome, corpo: `
    <label class="campo"><span>Nome</span><input data-n value="${t(i.nome)}" placeholder="Ex.: Queijo muçarela" maxlength="60"></label>
    <div class="duas-c"><label class="campo"><span>Usa na receita em</span><select data-u>${[['g', 'gramas (g)'], ['ml', 'mililitros (ml)'], ['un', 'unidades'], ['dose', 'doses (garrafa)']].map(([v, n]) => `<option value="${v}" ${i.unid === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo"><span>Compra em</span><input data-c value="${t(i.compra)}" placeholder="kg, L, cx 12…"></label></div>
    <div class="duas-c"><label class="campo"><span>Quanto vem em 1 <i data-cl>${t(i.compra)}</i></span><input data-f inputmode="decimal" value="${vir(i.fator)}"></label>
      <label class="campo"><span>Preço de 1 <i data-cl>${t(i.compra)}</i> (R$)</span><input data-p inputmode="decimal" value="${vir(i.custo)}"></label></div>
    <div class="duas-c"><label class="campo"><span>Tem agora (na unidade da receita)</span><input data-e inputmode="decimal" value="${vir(saldo(i))}"></label>
      <label class="campo"><span>Avisar abaixo de</span><input data-m inputmode="decimal" value="${vir(i.minimo)}"></label></div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar este insumo</button>'}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      $('[data-c]', f).oninput = (e) => $$('[data-cl]', f).forEach((x) => { x.textContent = e.target.value; });
      $('[data-apagar]', f)?.addEventListener('click', async () => {
        const usa = db.produtos.filter((p) => (p.ficha || []).some((x) => x.insumo === i.id));
        if (!(await confirma(usa.length ? `${i.nome} está na ficha de ${usa.length} prato(s). Apagar mesmo assim? Sai da ficha deles.` : `Apagar ${i.nome}?`, 'Apagar', true))) return;
        usa.forEach((p) => { p.ficha = p.ficha.filter((x) => x.insumo !== i.id); }); db.insumos = db.insumos.filter((x) => x !== i); grava(); fechar(); toast('Insumo apagado');
      });
      $('[data-ok]', f).onclick = () => {
        const nome = $('[data-n]', f).value.trim(); if (!nome) { toast('Escreva o nome do insumo'); return $('[data-n]', f).focus(); }
        const tem = num($('[data-e]', f).value);
        Object.assign(i, {
          nome, unid: $('[data-u]', f).value, compra: $('[data-c]', f).value.trim() || $('[data-u]', f).value, fator: num($('[data-f]', f).value) || 1,
          custo: r2(num($('[data-p]', f).value)), minimo: num($('[data-m]', f).value),
        });
        // mudar o "tem agora" de um insumo que já existe vira ajuste registrado (não sobrescreve calado)
        if (novo) { Object.assign(i, { estoque: tem, geracao: Date.now() }); db.insumos.push(i); } else ajustarEstoque(i.id, tem, 'Correção no cadastro', quemAgora(), false);
        grava(); fechar(); toast(novo ? 'Insumo cadastrado' : 'Insumo salvo');
      };
    },
  });
});
acao('compra', () => {
  if (!db.insumos.length) { toast('Cadastre primeiro o insumo (Novo insumo)'); return; }
  folha({ titulo: 'Entrada de compra', corpo: `<label class="campo"><span>Insumo</span><select data-i>${db.insumos.map((i) => `<option value="${i.id}">${t(i.nome)} (${t(i.compra)})</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>Quantidade comprada</span><input data-q inputmode="decimal" placeholder="Ex.: 5"></label><label class="campo"><span>Preço pago por unidade (R$)</span><input data-c inputmode="decimal" placeholder="opcional"></label></div><p class="mudo" data-conv></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Dar entrada</button>',
  aoAbrir: (f, fechar) => {
    const conv = () => { const i = insumo($('[data-i]', f).value); const q = Number(String($('[data-q]', f).value).replace(',', '.')) || 0; $('[data-conv]', f).textContent = q ? `Entra ${fmtQtd(q * i.fator, i.unid)} no estoque.` : ''; };
    $('[data-q]', f).oninput = conv; $('[data-i]', f).onchange = conv;
    $('[data-ok]', f).onclick = () => { const q = Number(String($('[data-q]', f).value).replace(',', '.')); if (!(q > 0)) return toast('Informe a quantidade'); entradaCompra($('[data-i]', f).value, q, Number(String($('[data-c]', f).value).replace(',', '.')) || 0); fechar(); toast('Estoque atualizado'); };
  } });
});
// perda de insumo: quantidade na unidade da receita + motivo; baixa o saldo e fica no histórico
acao('perda', (b) => {
  if (!db.insumos.length) { toast('Cadastre primeiro o insumo (Novo insumo)'); return; }
  const sel = b.dataset.i || db.insumos[0].id;
  folha({ titulo: 'Registrar perda', corpo: `<label class="campo"><span>Insumo</span><select data-i>${db.insumos.map((i) => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${t(i.nome)}</option>`).join('')}</select></label>
    <label class="campo"><span>Quantidade perdida (<i data-un></i>)</span><input data-q inputmode="decimal" placeholder="Ex.: 500"></label>
    <div class="campo"><span>Motivo</span><div class="chips quebra">${MOTIVOS_PERDA.map((m) => `<button type="button" class="chip" data-mot="${t(m)}">${t(m)}</button>`).join('')}</div></div>
    <label class="campo"><span>Observação (opcional)</span><input data-obs maxlength="120" placeholder="Ex.: caixa caiu na entrega"></label><p class="mudo" data-val></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Registrar perda</button>',
  aoAbrir: (f, fechar) => {
    let motivo = '';
    const atual = () => { const i = insumo($('[data-i]', f).value), q = num($('[data-q]', f).value); $('[data-un]', f).textContent = i.unid; $('[data-val]', f).textContent = q ? `${fmtQtd(q, i.unid)} · cerca de ${din((q / i.fator) * i.custo)} · fica ${fmtQtd(saldo(i) - q, i.unid)}` : `Tem agora ${fmtQtd(saldo(i), i.unid)}`; };
    $('[data-i]', f).onchange = atual; $('[data-q]', f).oninput = atual; atual();
    $$('[data-mot]', f).forEach((x) => { x.onclick = () => { motivo = x.dataset.mot; $$('[data-mot]', f).forEach((y) => y.classList.toggle('on', y === x)); }; });
    $('[data-ok]', f).onclick = () => {
      const q = num($('[data-q]', f).value), obs = $('[data-obs]', f).value.trim();
      if (!(q > 0)) { toast('Informe a quantidade'); return $('[data-q]', f).focus(); }
      if (!motivo) return toast('Escolha o motivo');
      registrarPerda($('[data-i]', f).value, q, obs ? `${motivo}: ${obs}` : motivo); fechar(); toast('Perda registrada');
    };
  } });
});
// inventário: conta o que tem de verdade; a diferença de cada item vira ajuste registrado
acao('inventario', () => {
  if (!db.insumos.length) { toast('Cadastre primeiro o insumo (Novo insumo)'); return; }
  const l = db.insumos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  folha({ titulo: 'Inventário', larga: true, corpo: `<p class="mudo">Conte o que tem no estoque e escreva na unidade da receita. Deixe em branco o que não contou.</p>
    <div class="tabela-rolo"><table class="tabela tab-inv"><thead><tr><th>Insumo</th><th class="num">No sistema</th><th>Contado</th><th class="num">Diferença</th></tr></thead><tbody>
    ${l.map((i) => `<tr><td><b>${t(i.nome)}</b></td><td class="num">${fmtQtd(saldo(i), i.unid)}</td><td><input class="inv-q" data-inv="${i.id}" inputmode="decimal" aria-label="Contado de ${t(i.nome)} em ${t(i.unid)}" placeholder="${t(i.unid)}"></td><td class="num" data-dif="${i.id}"></td></tr>`).join('')}</tbody></table></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar a contagem</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-inv]', f).forEach((x) => { x.oninput = () => { const i = insumo(x.dataset.inv), d = x.value.trim() === '' ? null : r2(num(x.value) - saldo(i)); $(`[data-dif="${i.id}"]`, f).innerHTML = d === null ? '' : `<b class="${!d ? 'ok-txt' : d > 0 ? 'sobra' : 'erro'}">${!d ? 'ok' : (d > 0 ? '+' : '−') + fmtQtd(Math.abs(d), i.unid)}</b>`; }; });
    $('[data-ok]', f).onclick = () => {
      const quem = quemAgora(); let n = 0;
      $$('[data-inv]', f).forEach((x) => { if (x.value.trim() !== '' && ajustarEstoque(x.dataset.inv, Math.max(0, num(x.value)), 'Inventário', quem, false)) n++; });
      grava(); fechar(); toast(n ? `${n} ${n === 1 ? 'item ajustado' : 'itens ajustados'} pela contagem` : 'Contagem salva, tudo bateu');
    };
  } });
});
// movimentações de um insumo nos últimos 30 dias: compras, baixas por venda (somadas por dia), perdas e ajustes
acao('hist-insumo', (b) => {
  const i = insumo(b.dataset.i); if (!i) return;
  const de = Date.now() - 30 * DIA, l = [];
  (db.compras || []).filter((c) => c.insumo === i.id && c.ts >= de).forEach((c) => l.push({ t: c.ts, tipo: 'Entrada de compra', q: c.qtd * i.fator, det: `${vir(c.qtd)} ${i.compra}${c.custo ? ` · ${din(c.custo)}/${i.compra}` : ''}` }));
  (db.movEstoque || []).filter((m) => m.insumo === i.id && m.t >= de).forEach((m) => l.push({ t: m.t, tipo: { perda: 'Perda', ajuste: 'Ajuste', producao: 'Produção', devolucao: 'Devolução ao fornecedor', consumo: 'Consumo interno' }[m.tipo] || 'Ajuste', q: m.qtd, det: [m.motivo, m.quem].filter(Boolean).join(' · ') }));
  const dia = {}; db.vendas.filter((v) => v.ts >= de && (!v.cancelado || (v.cancelado.estoque === false && !v.cancelado.reaberta))).forEach((v) => { const q = consumoVenda(v)[i.id]; if (q) { const k = ymd(v.ts); dia[k] = (dia[k] || 0) + q; } });
  Object.entries(dia).forEach(([k, q]) => l.push({ t: new Date(`${k}T23:59`).getTime(), tipo: 'Baixas por venda', q: -q, det: 'soma do dia', soDia: true }));
  l.sort((a, b2) => b2.t - a.t);
  folha({ titulo: i.nome, larga: true, corpo: `<p class="mudo">Tem agora ${fmtQtd(saldo(i), i.unid)} · últimos 30 dias</p>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>Movimento</th><th class="num">Quantidade</th><th>Detalhe</th></tr></thead><tbody>
    ${l.map((x) => `<tr><td>${new Date(x.t).toLocaleString('pt-BR', x.soDia ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${x.tipo}</td><td class="num"><b class="${x.q < 0 ? 'erro' : 'ok-txt'}">${x.q < 0 ? '−' : '+'}${fmtQtd(Math.abs(x.q), i.unid)}</b></td><td><small>${t(x.det)}</small></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhuma movimentação nos últimos 30 dias.</td></tr>'}</tbody></table></div>`,
  pe: `<a class="bt" href="#mais/rastreio/${i.id}" data-fechar>${ico('etiqueta')}Lotes e rastreio</a><button type="button" class="bt" data-fechar data-acao="perda" data-i="${i.id}">${ico('lixo')}Registrar perda</button>` });
});
// registro de auditoria (somente leitura): as últimas 200 ações sensíveis
const NOME_AUD = { desconto: 'Desconto', 'desconto-tirado': 'Desconto tirado', 'cancelar-item': 'Item cancelado', estorno: 'Venda cancelada', reabrir: 'Conta reaberta', sangria: 'Sangria', suprimento: 'Suprimento', perda: 'Perda de estoque', 'caixa-diferenca': 'Caixa não bateu', pin: 'PIN do gerente', regras: 'Regras do caixa' };
acao('auditoria', () => {
  const l = (db.auditoria || []).slice(-200).reverse();
  folha({ titulo: 'Registro de auditoria', larga: true, corpo: `<p class="mudo">Só acrescenta, ninguém edita. Guarda as últimas 2000 ações; aqui aparecem as 200 mais novas.</p>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Quando</th><th>O quê</th><th>Onde</th><th class="num">Valor</th><th>Motivo e quem</th></tr></thead><tbody>
    ${l.map((a) => `<tr><td>${new Date(a.t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${t(NOME_AUD[a.tipo] || a.tipo)}${a.item ? `<small>${a.qtd ? `${t(a.qtd)}× ` : ''}${t(a.item)}</small>` : ''}</td><td>${a.mesa ? `Mesa ${t(a.mesa)}` : a.num ? `#${t(a.num)}` : ''}</td><td class="num">${a.valor ? dinCurto(a.valor) : ''}</td><td>${t(a.motivo || '')}<small>${t(a.quem || '')}</small></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nada registrado ainda.</td></tr>'}</tbody></table></div>` });
});
acao('lista-compras', () => {
  const l = db.insumos.filter((i) => saldo(i) <= i.minimo * 1.5).map((i) => { const falta = Math.max(0, i.minimo * 2 - saldo(i)); return `• ${i.nome}: ${Math.ceil(falta / i.fator)} ${i.compra}`; });
  const txt = `Lista de compras · ${db.config.nome}\n${l.join('\n') || 'Nada para comprar agora.'}`;
  folha({ titulo: 'Lista de compras', corpo: `<pre class="pre">${t(txt)}</pre><p class="mudo">Calculada para deixar cada item com o dobro do mínimo.</p>`, pe: `<a class="bt zap grande" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ico('zap')}Mandar no WhatsApp</a>` });
});
acao('imprimir-qr', () => {
  const w = window.open('', '_blank'); if (!w) return toast('Libere as janelas para imprimir');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>QR das mesas</title><style>body{font-family:Georgia,serif;margin:0}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;padding:10mm}figure{margin:0;border:1px dashed #b4532f;border-radius:6mm;padding:6mm;text-align:center;break-inside:avoid}figcaption{font-size:20px;margin-top:3mm;color:#3b2a22}p{font:12px sans-serif;margin:2mm 0 0;color:#555}</style>
    <div class="g">${Array.from({ length: db.config.mesas }, (_, k) => `<figure>${qrSVG(linkCardapio(`mesa=${k + 1}`), 180, '#3B2A22')}<figcaption>${t(db.config.nome)} · Mesa ${k + 1}</figcaption><p>Aponte a câmera para ver o cardápio, pedir e chamar o garçom</p></figure>`).join('')}</div><script>print()<\/script>`);
  w.document.close();
});
acao('papel', (b) => { setPapel(b.dataset.p); toast(`Este aparelho agora é: ${PAPEIS[b.dataset.p][0]}`); ir(PAPEIS[b.dataset.p][1]); });
acao('recomecar', async () => { if (await confirma('Apagar tudo e voltar aos dados de exemplo?', 'Recomeçar', true)) { const { recomecar } = await import('./loja.js?v=31'); recomecar(); ir('salao'); } });

acao('ordem', (b) => {
  const p = prod(b.dataset.p), l = db.produtos.filter((x) => x.cat === p.cat), k = l.indexOf(p), alvo = l[k + Number(b.dataset.d)]; if (!alvo) return;
  const i = db.produtos.indexOf(p), j = db.produtos.indexOf(alvo); [db.produtos[i], db.produtos[j]] = [db.produtos[j], db.produtos[i]]; grava();
});
acao('duplicar', (b) => {
  const p = prod(b.dataset.p); const n = JSON.parse(JSON.stringify(p)); n.id = uid('p'); n.nome = `${p.nome} (cópia)`; n.destaque = false;
  db.produtos.splice(db.produtos.indexOf(p) + 1, 0, n); grava(); toast('Prato duplicado: edite o nome e o preço');
});
// reajuste de preço em massa (por categoria), arredondando para terminar em ,90
acao('reajuste', () => {
  folha({ titulo: 'Reajustar preços', corpo: `<label class="campo"><span>Categoria</span><select data-c><option value="">Todo o cardápio</option>${db.categorias.map((k) => `<option value="${k.id}">${t(k.nome)}</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>Quanto (%)</span><input data-p inputmode="decimal" placeholder="Ex.: 8 ou -5"></label><label class="campo"><span>Arredondar</span><select data-r><option value="90">para ,90</option><option value="0">sem arredondar</option></select></label></div>
    <p class="mudo" data-prev></p>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Aplicar</button>',
  aoAbrir: (f, fechar) => {
    const calc = (v) => { const pc = num($('[data-p]', f).value); let n = v * (1 + pc / 100); if ($('[data-r]', f).value === '90') n = Math.max(0.9, Math.round(n) - 0.1); return r2(n); };
    const alvo = () => db.produtos.filter((p) => !$('[data-c]', f).value || p.cat === $('[data-c]', f).value);
    const prev = () => { const a = alvo(); $('[data-prev]', f).textContent = num($('[data-p]', f).value) && a.length ? `${a.length} pratos. Ex.: ${a[0].nome}: ${din(a[0].preco)} → ${din(calc(a[0].preco))}` : ''; };
    f.addEventListener('input', prev); f.addEventListener('change', prev);
    $('[data-ok]', f).onclick = () => { if (!num($('[data-p]', f).value)) return toast('Escreva a porcentagem'); const a = alvo(); a.forEach((p) => { p.preco = calc(p.preco); (p.tamanhos || []).forEach((x) => { x.preco = calc(x.preco); }); }); grava(); fechar(); toast(`${a.length} preços reajustados`); };
  } });
});

// todas as vendas numa planilha (abre no Excel e no Google Planilhas)
acao('baixar-vendas', () => {
  const linhas = [['Data', 'Hora', 'Tipo', 'Mesa ou pedido', 'Garçom', 'Itens', 'Serviço', 'Entrega', 'Desconto', 'Total', 'Forma de pagamento', 'Cancelada']];
  db.vendas.slice().sort((a, b) => a.ts - b.ts).forEach((v) => { const d = new Date(v.ts);
    linhas.push([d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), { mesa: 'Salão', delivery: 'Delivery', balcao: 'Balcão' }[v.tipo] || v.tipo, v.mesa || (v.num ? '#' + v.num : ''), v.garcom || '',
      (v.itens || []).map((i) => `${i.qtd}x ${i.nome}`).join(' + '), vir(r2(v.servico || 0)), vir(r2(v.entrega || 0)), vir(r2(v.desconto || 0)), vir(r2(v.total)), v.forma || '', v.cancelado ? 'sim' : '']); });
  const csv = '\ufeff' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`${db.vendas.length} vendas na planilha`);
});

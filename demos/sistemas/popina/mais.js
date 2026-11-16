// Popina · Mais: cardápio (preços, esgotado, ficha técnica), estoque, relatórios, QR das mesas, ajustes e o papel deste aparelho.
import { db, t, din, dinCurto, prod, insumo, grava, custoPrato, estoqueBaixo, entradaCompra, fmtQtd, r2, uid, linkCardapio, CONTA, saldo, lojaCfg, setLoja, nomeMesa } from './loja.js?v=19';
import { registrar, acao, ir, PAPEIS, papel, setPapel } from './nucleo.js?v=19';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=19';
import { qrSVG } from '../base/qr.js';

export const GRUPOS = [
  ['Restaurante', [['aparencia', 'Aparência e templates', 'ajustes', 'Template, logo, capa, cores e estilo do cardápio'], ['loja', 'Restaurante e cardápio online', 'salao', 'Contato, horários, entrega e o link'], ['mesas', 'Mesas e QR', 'qr', 'Áreas do salão, número de mesas, QR de cada mesa'], ['ajustes', 'Caixa e regras', 'caixa', 'Pix, serviço, garçons e comissão, balança']]],
  ['Cardápio e estoque', [['cardapio', 'Cardápio', 'cardapio', 'Pratos, tamanhos, complementos, fotos e preços'], ['estoque', 'Estoque', 'estoque', 'O que tem, o que acaba, compras']]],
  ['Vendas e clientes', [['relatorios', 'Relatórios', 'grafico', 'Vendas, garçons, horários, mais vendidos'], ['clientes', 'Clientes', 'pessoas', 'Quem pede no delivery e quanto gasta'], ['entregadores', 'Entregadores', 'moto', 'Quem levou cada pedido e o acerto do dia'], ['cupons', 'Cupons', 'conta', 'Descontos do cardápio online']]],
  ['Equipe e conta', [['equipe', 'Equipe e convites', 'pessoas', 'Quem usa, cargo e o que cada um vê'], ['conta', 'Minha conta', 'ajustes', 'Perfil, assinatura e sair'], ['aparelho', 'Este aparelho', 'ao_vivo', 'Garçom, cozinha, caixa ou dono']]],
];
const ALIAS = { qr: 'mesas' };
function menuGestao(atual) {
  const baixo = estoqueBaixo().length;
  return GRUPOS.map(([g, l], k) => `<div class="mg-grupo"><h3 class="g-fita g${k}">${g}</h3>${l.map(([id, nome, ic, det]) => `<a href="#mais/${id}" class="${id === atual ? 'on' : ''}"><span class="mm-ico">${ico(ic)}</span><span><b>${nome}${id === 'estoque' && baixo ? ` <em class="badge">${baixo}</em>` : ''}</b><small>${det}</small></span>${ico('dir')}</a>`).join('')}</div>`).join('');
}
registrar('mais', {
  titulo: 'Gestão', aba: 'mais',
  html(sec, x) {
    sec = ALIAS[sec] || sec;
    const corpo = sec && TELAS_MAIS[sec] ? TELAS_MAIS[sec](x) : `<header class="cab-gestao"><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">Gestão<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1><img class="g-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>${resumoDia()}${painelDia()}<nav class="menu-mais so-cel-bloco">${menuGestao('')}</nav>`;
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
  return `<div class="g-painel"><section class="g-card g-grafico"><h2 class="g-fita g0">Vendas por hora</h2>
      <div class="g-barras"><div class="g-eixo">${Array.from({ length: 9 }, (_, k) => `<span>R$ ${(teto - k * passo).toLocaleString('pt-BR')}</span>`).join('')}</div>
      <div class="g-cols">${horas.map(([h, val]) => `<div title="${h}h: ${din(val)}"><i style="height:${(val / teto) * 100}%"></i><small>${h}h</small></div>`).join('')}</div></div></section>
    <div class="g-lado"><section class="g-card"><h2 class="g-fita g1">Mais vendidos hoje</h2><ul class="g-lista">${rank.map(([n, q]) => `<li>${ico(bebida(n) ? 'pedidos' : 'cloche')}<span>${t(n)}</span><b>${q}</b></li>`).join('') || '<li><span>Nada vendido ainda hoje</span></li>'}</ul></section>
      <section class="g-card"><h2 class="g-fita g2">Garçons</h2><ul class="g-lista">${gl.map(([g, val]) => `<li>${ico('pessoas')}<span>${t(g)}</span><b>${din(val)}</b></li>`).join('') || '<li><span>Sem vendas de salão hoje</span></li>'}</ul></section></div></div>`;
}
// cabeçalho das telas da gestão: título com louros e o aqueduto (conceito 7-gestao-cardapio-pc.png)
export const volta = (h, tit, sub = '') => `<header class="cab-tela cab-g"><a class="bt-ico so-cel" href="#${h}" aria-label="Voltar">${ico('voltar')}</a><div><h1><img src="img/k-louro-esq.webp?v=1" alt="" width="56" height="74">${tit}<img src="img/k-louro-dir.webp?v=1" alt="" width="56" height="74"></h1>${sub ? `<p>${sub}</p>` : ''}</div><img class="g-aqueduto" src="img/aqueduto.webp?v=2" alt="" width="340" height="88"></header>`;

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
        return `<tr class="${p.ativo ? '' : 'off'}"><td class="tp-nome">${p.foto ? `<img src="${t(p.foto)}" alt="" loading="lazy">` : `<span class="sem-foto">${ico('prato')}</span>`}<div><b>${t(p.nome)}</b><small>${[p.tamanhos?.length ? `${p.tamanhos.length} tamanhos` : '', (p.grupos || []).length ? `${p.grupos.length} grupo${p.grupos.length > 1 ? 's' : ''} de opções` : '', p.destaque ? 'destaque' : '', ...(p.tags || []).map(t)].filter(Boolean).join(' · ') || t(p.desc || '').slice(0, 60)}</small></div></td>
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
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="compra">${ico('mais2')}Entrada de compra</button><button type="button" class="bt" data-acao="editar-insumo">Novo insumo</button><button type="button" class="bt" data-acao="lista-compras">Lista de compras</button></div>
      <ul class="lista-estoque">${l.map((i) => { const p = Math.max(0, Math.min(100, (saldo(i) / ((i.minimo || 1) * 2)) * 100)); const nivel = saldo(i) <= i.minimo ? 'baixo' : saldo(i) <= i.minimo * 1.5 ? 'medio' : '';
        return `<li class="${nivel}"><div><b>${t(i.nome)}</b><small>${fmtQtd(saldo(i), i.unid)} · mínimo ${fmtQtd(i.minimo, i.unid)} · ${din(i.custo)}/${t(i.compra)}</small><span class="barra"><i style="width:${p}%"></i></span></div>${nivel === 'baixo' ? `<em class="badge">Comprar ${Math.max(1, Math.ceil((i.minimo * 2 - saldo(i)) / i.fator))} ${t(i.compra)}</em>` : ''}<button type="button" class="bt-ico" data-acao="editar-insumo" data-i="${i.id}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></li>`; }).join('') || '<li class="vazio">Nenhum insumo ainda. Cadastre o que você compra (carne, queijo, bebidas…) para o estoque baixar sozinho a cada pedido.</li>'}</ul>`;
  },
  // ---------------- relatórios
  relatorios() {
    const agora = Date.now(); const v30 = db.vendas.filter((v) => v.ts > agora - 30 * 864e5 && !v.cancelado);
    const dia = (ts) => new Date(ts).toDateString(); const hoje = dia(agora);
    const vHoje = v30.filter((v) => dia(v.ts) === hoje); const tot = (l) => r2(l.reduce((s, v) => s + v.total, 0));
    const porDia = {}; v30.forEach((v) => { const d = new Date(v.ts); const k = d.toISOString().slice(0, 10); porDia[k] = (porDia[k] || 0) + v.total; });
    const dias = Array.from({ length: 14 }, (_, k) => { const d = new Date(agora - (13 - k) * 864e5); const ch = d.toISOString().slice(0, 10); return [d, porDia[ch] || 0]; });
    const max = Math.max(...dias.map((d) => d[1]), 1);
    const sem = [0, 0, 0, 0, 0, 0, 0], semN = [0, 0, 0, 0, 0, 0, 0]; Object.entries(porDia).forEach(([k, val]) => { const d = new Date(k + 'T12:00'); sem[d.getDay()] += val; semN[d.getDay()]++; });
    const medSem = sem.map((s, k) => (semN[k] ? s / semN[k] : 0)); const maxSem = Math.max(...medSem, 1);
    const qtd = {}; v30.forEach((v) => v.itens.forEach((i) => { qtd[i.nome] = (qtd[i.nome] || 0) + i.qtd; }));
    const rank = Object.entries(qtd).sort((a, b) => b[1] - a[1]);
    const formas = {}; v30.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; }); const totF = tot(v30) || 1;
    const tipos = { mesa: 0, delivery: 0, balcao: 0 }; v30.forEach((v) => { tipos[v.tipo] = (tipos[v.tipo] || 0) + v.total; });
    const ticket = v30.length ? tot(v30) / v30.length : 0;
    const porHora = {}; v30.forEach((v) => { const h = new Date(v.ts).getHours(); porHora[h] = (porHora[h] || 0) + v.total; });
    const horas = Array.from({ length: 15 }, (_, k) => [k + 10, (porHora[(k + 10) % 24] || 0) / 30]); const maxH = Math.max(...horas.map((x) => x[1]), 1);
    const com = lojaCfg().comissao ?? 100, garc = {};
    v30.filter((v) => v.tipo === 'mesa').forEach((v) => { const g = v.garcom || 'Sem garçom'; (garc[g] ||= { n: 0, total: 0, serv: 0 }); garc[g].n++; garc[g].total += v.total; garc[g].serv += v.servico || 0; });
    return volta('mais', 'Relatórios', `Últimos 30 dias${CONTA ? '' : ' · dados de exemplo'}`) + `
      <section class="kpis"><div><small>Hoje</small><b>${dinCurto(tot(vHoje))}</b><span>${vHoje.length} vendas</span></div><div><small>30 dias</small><b>${dinCurto(tot(v30))}</b><span>${v30.length} vendas</span></div>
        <div><small>Ticket médio</small><b>${dinCurto(ticket)}</b><span>por conta</span></div><div><small>Serviço (10%)</small><b>${dinCurto(r2(v30.reduce((s, v) => s + (v.servico || 0), 0)))}</b><span>para a equipe</span></div></section>
      <section class="bloco"><div class="sec-tit"><h2>Vendas por dia</h2><span>14 dias</span></div><div class="barras">${dias.map(([d, val]) => `<div title="${d.toLocaleDateString('pt-BR')}: ${dinCurto(val)}"><i style="height:${(val / max) * 100}%"></i><small>${d.getDate()}</small></div>`).join('')}</div></section>
      <section class="bloco"><div class="sec-tit"><h2>Média por dia da semana</h2></div><div class="barras sem">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((n, k) => `<div title="${n}: ${dinCurto(medSem[k])}"><i style="height:${(medSem[k] / maxSem) * 100}%"></i><small>${n}</small></div>`).join('')}</div></section>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Mais vendidos</h2></div><ol class="rank">${rank.slice(0, 5).map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('')}</ol></section>
        <section class="bloco"><div class="sec-tit"><h2>Menos vendidos</h2></div><ol class="rank">${rank.slice(-5).reverse().map(([n, q]) => `<li><span>${t(n)}</span><b>${q}</b></li>`).join('')}</ol></section></div>
      <div class="duas"><section class="bloco"><div class="sec-tit"><h2>Formas de pagamento</h2></div>${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, val]) => `<div class="prop"><span>${t(f)}</span><i style="width:${(val / totF) * 100}%"></i><b>${Math.round((val / totF) * 100)}%</b></div>`).join('')}</section>
        <section class="bloco"><div class="sec-tit"><h2>Onde vende</h2></div>${[['mesa', 'Salão'], ['delivery', 'Delivery'], ['balcao', 'Balcão']].map(([k, n]) => `<div class="prop"><span>${n}</span><i style="width:${(tipos[k] / totF) * 100}%"></i><b>${Math.round((tipos[k] / totF) * 100)}%</b></div>`).join('')}</section></div>
      <section class="bloco"><div class="sec-tit"><h2>Movimento por hora</h2><span>média dos 30 dias</span></div><div class="barras horas">${horas.map(([h, val]) => `<div title="${h}h: ${dinCurto(val)}"><i style="height:${(val / maxH) * 100}%"></i><small>${h}</small></div>`).join('')}</div></section>
      <section class="bloco"><div class="sec-tit"><h2>Garçons</h2><span>salão, 30 dias · comissão de ${com}% do serviço</span></div>
        <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Garçom</th><th class="num">Contas</th><th class="num">Vendido</th><th class="num">Serviço</th><th class="num">Comissão</th></tr></thead><tbody>
        ${Object.entries(garc).sort((a, b) => b[1].total - a[1].total).map(([g, x]) => `<tr><td><b>${t(g)}</b></td><td class="num">${x.n}</td><td class="num">${dinCurto(x.total)}</td><td class="num">${dinCurto(x.serv)}</td><td class="num"><b>${dinCurto(x.serv * com / 100)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">As vendas do salão com garçom aparecem aqui.</td></tr>'}</tbody></table></div></section>
      <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt" data-acao="baixar-vendas">${ico('estoque')}Baixar as vendas (planilha CSV)</button></div>`;
  },
  // ---------------- ajustes
  ajustes() {
    const c = db.config, L = lojaCfg();
    return volta('mais', 'Caixa e regras') + `<form class="form" data-ajustes>
      <label class="campo"><span>Chave Pix do restaurante (o QR da conta usa esta chave)</span><input name="pix" value="${c.pix?.exemplo ? '' : t(c.pix?.chave || '')}" placeholder="CNPJ, celular, e-mail ou chave aleatória"></label>
      <div class="duas-c"><label class="campo"><span>Taxa de serviço (%)</span><input name="servico" inputmode="numeric" value="${c.servico}"></label><label class="campo"><span>Comissão dos garçons (% do serviço que vai para eles)</span><input name="comissao" inputmode="numeric" value="${L.comissao ?? 100}"></label></div>
      <label class="campo"><span>Garçons (separados por vírgula)</span><input name="garcons" value="${t((c.garcons || []).join(', '))}"></label>
      <label class="campo"><span>Peso do prato vazio, para comida por quilo (gramas)</span><input name="tara" inputmode="numeric" value="${c.tara || ''}" placeholder="0"></label>
      <button class="bt cheio grande">Salvar</button></form>
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
    f.onsubmit = (e) => {
      e.preventDefault(); const c = db.config;
      c.servico = Math.max(0, Math.min(20, Number(f.servico.value) || 0));
      if (f.pix.value.trim()) c.pix = { tipo: 'chave', chave: f.pix.value.trim(), exemplo: false };
      c.tara = Math.max(0, Math.min(2000, Number(f.tara.value) || 0)); c.garcons = f.garcons.value.split(',').map((x) => x.trim()).filter(Boolean);
      setLoja({ comissao: Math.max(0, Math.min(100, Number(f.comissao.value) || 0)) });
      toast('Salvo');
    };
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
    <div class="duas-c"><label class="campo"><span>Preço antigo, para promoção (opcional)</span><input data-promo inputmode="decimal" value="${p.promoDe ? vir(p.promoDe) : ''}" placeholder="aparece riscado"></label><label class="campo"><span>Serve (opcional)</span><input data-serve value="${t(p.serve || '')}" placeholder="Ex.: Serve 2 pessoas"></label></div>
    <div class="duas-c"><label class="campo"><span>Etiquetas (separadas por vírgula)</span><input data-tags value="${t((p.tags || []).join(', '))}" placeholder="Vegetariano, Picante, Novo"></label>
      <label class="interruptor bloco-int" style="align-self:end"><input type="checkbox" data-dest ${p.destaque ? 'checked' : ''}><span></span>Destaque no topo do cardápio</label></div>
    <div class="campo"><span>Tamanhos (opcional: P, M, G, broto…). O preço de cada tamanho vale no lugar do preço acima.</span><ul class="ficha-ed tam-ed" data-tams>${linhasTam()}</ul><button type="button" class="link" data-maistam>+ Tamanho</button></div>
    <div class="campo"><span>Complementos e escolhas (ponto da carne, borda, molhos, sabor…)</span><div data-grupos>${blocosGrupo()}</div><button type="button" class="link" data-maisgrupo>+ Grupo de opções</button></div>
    <div class="campo"><span>Adicionais soltos (cada um soma no preço)</span><ul class="ficha-ed" data-adic>${linhasAdic()}</ul><button type="button" class="link" data-maisadic>+ Adicional</button></div>
    <div class="campo"><span>Ficha técnica: o que sai do estoque a cada 1 vendido</span>${db.insumos.length ? `<ul class="ficha-ed" data-ficha>${linhasFicha()}</ul><button type="button" class="link" data-maisficha>+ Insumo na ficha</button>` : '<p class="mudo">Cadastre os insumos em Mais › Estoque para o sistema baixar o estoque e calcular o custo do prato.</p>'}</div>
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
      const redesenha = () => { const fi = $('[data-ficha]', f); if (fi) fi.innerHTML = linhasFicha(); $('[data-adic]', f).innerHTML = linhasAdic(); $('[data-tams]', f).innerHTML = linhasTam(); $('[data-grupos]', f).innerHTML = blocosGrupo(); };
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
        if (grOk.some((g) => g.min && g.max < g.min)) { toast('Confira o “até” dos grupos obrigatórios'); return; }
        Object.assign(p, {
          nome, preco: r2(preco > 0 ? preco : Math.max(...tamOk.map((x) => x.preco))), tamanhos: tamOk, grupos: grOk, tags: $('[data-tags]', f).value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4),
          destaque: $('[data-dest]', f).checked, promoDe: r2(num($('[data-promo]', f).value)) || 0, serve: $('[data-serve]', f).value.trim(), desc: $('[data-d]', f).value.trim(), cat: $('[data-cat]', f).value, setor: $('[data-setor]', f).value, pizza: $('[data-pizza]', f).checked, porKg: $('[data-kg]', f).checked,
          foto, adicionais: adic.filter((a) => a.nome).map((a) => ({ nome: a.nome, preco: r2(Math.max(0, a.preco)) })), ficha: ficha.filter((x) => x.insumo && x.qtd > 0),
        });
        if (novo) db.produtos.push(p);
        grava(); fechar(); toast(novo ? 'Prato cadastrado' : 'Prato salvo');
      };
    },
  });
});
acao('cardapio-exemplo', async () => {
  if (!(await confirma('Carregar os 22 pratos de exemplo, com fotos e fichas técnicas? Depois é só trocar nomes e preços e apagar o que não serve.', 'Carregar'))) return;
  const { cardapioExemplo } = await import('./dados.js?v=19'); const ex = cardapioExemplo();
  db.produtos.push(...ex.produtos.filter((p) => !prod(p.id))); ex.insumos.forEach((i) => { if (!insumo(i.id)) db.insumos.push(i); });
  grava(); toast('Cardápio de exemplo carregado');
});
acao('categorias', () => {
  const linhas = () => db.categorias.map((c, k) => `<li><input data-cn="${k}" value="${t(c.nome)}" aria-label="Nome da categoria"><small>${db.produtos.filter((p) => p.cat === c.id).length} pratos</small></li>`).join('');
  folha({
    titulo: 'Categorias', corpo: `<p class="mudo">Categoria sem prato não aparece para o cliente.</p><ul class="ficha-ed" data-l>${linhas()}</ul><button type="button" class="link" data-mais>+ Categoria</button>`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      const ler = () => db.categorias.forEach((c, k) => { const v = $(`[data-cn="${k}"]`, f)?.value.trim(); if (v) c.nome = v; });
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
    <div class="duas-c"><label class="campo"><span>Usa na receita em</span><select data-u>${[['g', 'gramas (g)'], ['ml', 'mililitros (ml)'], ['un', 'unidades']].map(([v, n]) => `<option value="${v}" ${i.unid === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
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
        Object.assign(i, {
          nome, unid: $('[data-u]', f).value, compra: $('[data-c]', f).value.trim() || $('[data-u]', f).value, fator: num($('[data-f]', f).value) || 1,
          custo: r2(num($('[data-p]', f).value)), estoque: num($('[data-e]', f).value), geracao: Date.now(), minimo: num($('[data-m]', f).value),
        });
        if (novo) db.insumos.push(i);
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
acao('recomecar', async () => { if (await confirma('Apagar tudo e voltar aos dados de exemplo?', 'Recomeçar', true)) { const { recomecar } = await import('./loja.js?v=19'); recomecar(); ir('salao'); } });

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

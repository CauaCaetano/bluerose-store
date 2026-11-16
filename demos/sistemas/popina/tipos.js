// Popina · funções por tipo de negócio (rodada 4): vinho da casa a granel, camarotes e promoters (balada),
// os cartões do painel de cada tipo e os exemplos da demonstração que só aparecem no template certo.
import { db, t, din, dinCurto, grava, r2, uid, tempo, lojaCfg, tem, conta, prod, insumo, saldo, quemAgora, auditar, abrirCartao, cartaoAberto, proximoCartao, ouvir, comandaDaMesa, CONTA } from './loja.js?v=24';
import { acao } from './nucleo.js?v=24';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=24';
import { TELAS_MAIS, volta, PAINEL_TIPO, GRUPOS } from './mais.js?v=24';
import { estadoBarril, fecharBarril, noite, faltaConsumacao, comissaoPromoter, filaForno, estacaoDe, ESTACOES_PADRAO, precoKg, faixasDoKg, ymd, lotacao } from './precos.js?v=24';
import { exemploTipo } from './dados.js?v=24';

const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const hora = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// as telas novas entram no menu da Gestão (Funções do negócio), cada uma só com a função ligada
const fn = GRUPOS.find((g) => g[0] === 'Funções do negócio');
if (fn && !fn[1].some((x) => x[0] === 'granel')) fn[1].push(['granel', 'Vinho a granel', 'taca', 'Garrafão do vinho da casa: taça, meia jarra e jarra', 'granel'], ['camarotes', 'Camarotes e promoters', 'coroa', 'Reservas de camarote, consumo e comissão', 'camarotes']);

// ------------------------------------------------------------------ exemplos por tipo (só na demonstração)
// cada coisa de exemplo leva exTpl: entra quando a demonstração está naquele template e sai quando ele muda
function semear() {
  if (CONTA || !db.exemplo) return; // só na demonstração, qualquer versão do exemplo
  const tpl = lojaCfg().template || 'basico'; if (db.exTpl === tpl) return;
  const X = exemploTipo(), daqui = (x) => !x.exTpl || x.exTpl.includes(tpl);
  db.comandas = db.comandas.filter(daqui);
  db.produtos = db.produtos.filter((p) => daqui(p) || db.comandas.some((c) => c.itens.some((i) => i.prod === p.id)));
  db.barris = (db.barris || []).filter(daqui);
  X.produtos.filter((p) => p.exTpl.includes(tpl) && !prod(p.id)).forEach((p) => db.produtos.push(p));
  X.comandas.filter((c) => c.exTpl.includes(tpl)).forEach((c) => {
    if (db.comandas.some((x) => x.id === c.id) || (c.tipo === 'mesa' && comandaDaMesa(c.mesa)) || (c.tipo === 'cartao' && cartaoAberto(c.cartao))) return;
    db.comandas.push(c);
  });
  X.barris.filter((b) => b.exTpl.includes(tpl) && !db.barris.some((x) => x.id === b.id)).forEach((b) => db.barris.push(b));
  db.exTpl = tpl; grava();
}
semear();
ouvir(() => { if (!CONTA && db.exemplo && db.exTpl !== (lojaCfg().template || 'basico')) setTimeout(semear, 0); });

// ------------------------------------------------------------------ vinho da casa a granel: garrafão com taça, meia jarra e jarra
const garrafoes = () => (db.barris || []).filter((b) => b.tipo === 'granel');
const mlTaca = (b) => Number(prod((b.prods || [])[0])?.ml) || 150;
TELAS_MAIS.granel = () => {
  const ativos = garrafoes().filter((b) => !b.fim), velhos = garrafoes().filter((b) => b.fim).sort((a, b) => b.fim - a.fim).slice(0, 8);
  return volta('mais', 'Vinho a granel', 'Taça, meia jarra e jarra saem do mesmo garrafão. Cada venda baixa os ml do tamanho.') + `
    <div class="linha-bts"><button type="button" class="bt cheio" data-acao="granel-novo">${ico('mais2')}Ligar um garrafão</button></div>
    <ul class="lista-res barris granel">${ativos.map((b) => { const p = prod(b.prods?.[0]), e = estadoBarril(b, mlTaca(b)), tams = p?.tamanhos?.length ? p.tamanhos : [{ nome: 'Taça', fator: 1 }];
      return `<li class="${e.pct <= 15 ? 'baixo' : ''}"><div><b>${t(b.nome)} · ${vir(e.litros)} L de ${b.litros} L</b><small>${t(p?.nome || 'sem vinho ligado')} · aberto há ${tempo(b.inicio)} · servidos ${vir(r2(e.usado / 1000))} L</small>
        <span class="barra" aria-label="${e.pct}% do garrafão"><i style="width:${e.pct}%"></i></span>
        <div class="granel-tams">${tams.map((x) => { const ml = Math.round(mlTaca(b) * (Number(x.fator) || 1)); return `<span><b>${Math.floor(e.resta / ml)}</b><small>${t(x.nome)}${x.preco ? ` · ${dinCurto(x.preco)}` : ''}</small></span>`; }).join('')}</div><small>ainda saem (se tudo for desse tamanho)</small></div>
        <div class="res-bts"><button type="button" class="bt" data-acao="granel-trocar" data-id="${b.id}">${ico('troca')}Trocar garrafão</button></div></li>`; }).join('') || '<li class="vazio">Nenhum garrafão ligado. Ligue o garrafão ao vinho da casa (com o ml da taça).</li>'}</ul>
    ${velhos.length ? `<div class="sec-tit"><h2>Garrafões trocados</h2><span>rendimento = servido ÷ capacidade</span></div>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Trocado</th><th>Garrafão</th><th class="num">Rendimento</th><th class="num">Perda</th></tr></thead><tbody>
      ${velhos.map((b) => `<tr><td>${new Date(b.fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td><td>${t(b.nome)} · ${b.litros} L</td><td class="num"><b class="${b.rendimento < 95 ? 'erro' : 'ok-txt'}">${vir(b.rendimento)}%</b></td><td class="num">${vir(r2((b.perdaMl || 0) / 1000))} L${b.custo ? ` · ${dinCurto(((b.perdaMl || 0) / (b.litros * 1000)) * b.custo)}` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
};
function formGarrafao(titulo, base, depois) {
  const vinhos = db.produtos.filter((p) => p.setor === 'bar').sort((a, b) => (b.granel ? 1 : 0) - (a.granel ? 1 : 0)), sel = base?.prods?.[0] || vinhos[0]?.id || '';
  folha({ titulo, corpo: `${base ? `<label class="campo"><span>Quanto sobrou no garrafão velho (litros; vazio = o que o sistema calcula: ${vir(estadoBarril(base).litros)} L)</span><input data-sobrou inputmode="decimal" placeholder="${vir(estadoBarril(base).litros)}"></label>` : ''}
    <label class="campo"><span>Vinho servido deste garrafão</span><select data-p>${vinhos.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${t(p.nome)}${p.ml ? ` (taça ${p.ml} ml)` : ''}</option>`).join('')}</select></label>
    <div class="duas-c"><label class="campo"><span>ml da taça</span><input data-ml inputmode="numeric" value="${prod(sel)?.ml || 150}"></label><label class="campo"><span>Litros do garrafão</span><input data-l inputmode="decimal" value="${base?.litros || 20}"></label></div>
    <label class="campo"><span>Preço do garrafão (R$, para o custo da perda)</span><input data-c inputmode="decimal" value="${base?.custo ? vir(base.custo) : ''}" placeholder="0,00"></label>`,
  pe: `<button type="button" class="bt cheio grande" data-ok>${base ? 'Trocar' : 'Ligar o garrafão'}</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-p]', f).onchange = (e) => { const p = prod(e.target.value); if (p?.ml) $('[data-ml]', f).value = p.ml; };
    $('[data-ok]', f).onclick = () => {
      const p = prod($('[data-p]', f).value), ml = Math.round(num($('[data-ml]', f).value)), litros = r2(num($('[data-l]', f).value));
      if (!p) return toast('Cadastre o vinho no cardápio (setor Bar)'); if (!(ml > 0)) return toast('Escreva o ml da taça'); if (!(litros > 0)) return toast('Escreva os litros do garrafão');
      p.ml = ml; p.granel = true;
      const s = $('[data-sobrou]', f)?.value.trim();
      depois({ id: uid('gr'), tipo: 'granel', nome: `Garrafão ${p.nome.replace(/^vinho\s*/i, '').toLowerCase() || 'do vinho'}`, prods: [p.id], litros, custo: r2(num($('[data-c]', f).value)), inicio: Date.now(), usado: {} }, s === '' || s == null ? null : Math.max(0, num(s)));
      grava(); fechar();
    };
  } });
}
acao('granel-novo', () => formGarrafao('Ligar um garrafão', null, (b) => { (db.barris ||= []).push(b); toast(`${b.nome}: ${vir(b.litros)} L ligados`); }));
acao('granel-trocar', (b) => {
  const g = garrafoes().find((x) => x.id === b.dataset.id); if (!g) return;
  formGarrafao(`Trocar · ${g.nome}`, g, (novo, sobrou) => {
    const fx = fecharBarril(g), perdaMl = sobrou == null ? fx.perdaMl : Math.round(sobrou * 1000), quem = quemAgora(), custo = g.litros ? r2((perdaMl / (g.litros * 1000)) * (g.custo || 0)) : 0;
    Object.assign(g, { fim: Date.now(), perdaMl, rendimento: g.litros ? Math.round(((g.litros * 1000 - perdaMl) / (g.litros * 1000)) * 1000) / 10 : 0 });
    if (perdaMl > 0) { (db.movEstoque ||= []).push({ id: uid('e'), t: Date.now(), insumo: '', barril: g.id, nome: g.nome, tipo: 'perda', qtd: -perdaMl, motivo: 'Fim do garrafão (fundo e borra)', quem, custo }); auditar('perda', { quem, item: g.nome, qtd: `${vir(r2(perdaMl / 1000))} L`, valor: -custo, motivo: 'Fim do garrafão' }); }
    db.barris.push(novo); toast(`Garrafão trocado${perdaMl ? ` · perda de ${vir(r2(perdaMl / 1000))} L` : ''}`);
  });
});

// ------------------------------------------------------------------ balada: camarotes da noite e promoters
const camarotes = () => lojaCfg().camarotes || [];
const resNoite = () => (db.camaroteRes || []).filter((r) => r.noite === noite());
const nomeProm = (cod) => (lojaCfg().portaria?.promoters || []).find((p) => p.codigo === cod)?.nome || cod;
// consumo do camarote: o cartão aberto ou, já fechado, as vendas daquele cartão desde a chegada
function consumoRes(r) {
  if (!r.cartao) return 0;
  const c = cartaoAberto(r.cartao); if (c && (c.camarote || !r.chegou || c.aberta >= r.chegou - 60e3)) return conta(c).sub;
  return r2(db.vendas.filter((v) => !v.cancelado && v.onde === `Cartão ${r.cartao}` && v.ts >= (r.chegou || 0)).reduce((s, v) => s + v.itens.reduce((a, i) => a + i.qtd * i.preco, 0), 0));
}
export function resumoCamarotes() {
  const rs = resNoite(), porPromoter = {};
  const lista = camarotes().map((cam) => { const r = rs.find((x) => x.camarote === cam.id && !x.cancelada), consumo = r ? consumoRes(r) : 0;
    if (r?.promoter) { const p = (porPromoter[r.promoter] ||= { camarotes: 0, consumo: 0 }); p.camarotes++; p.consumo = r2(p.consumo + consumo); }
    return { cam, r, consumo, falta: r?.chegou ? faltaConsumacao(consumo, cam.consumacao) : 0, estado: !r ? 'livre' : r.chegou ? 'ocupado' : 'reservado' }; });
  return { lista, porPromoter };
}
TELAS_MAIS.camarotes = () => {
  const R = resumoCamarotes(), P = lojaCfg().portaria || {}, proms = P.promoters || [], ent = (db.portaria?.dia === noite() ? db.portaria.entradas : []) || [];
  const ocup = R.lista.filter((x) => x.estado === 'ocupado').length, resv = R.lista.filter((x) => x.estado === 'reservado').length;
  return volta('mais', 'Camarotes e promoters', `Esta noite: ${ocup} ${ocup === 1 ? 'ocupado' : 'ocupados'} · ${resv} ${resv === 1 ? 'reservado' : 'reservados'} · ${R.lista.length - ocup - resv} ${R.lista.length - ocup - resv === 1 ? 'livre' : 'livres'}`) + `
    <div class="camarotes">${R.lista.map(({ cam, r, consumo, falta, estado }) => { const pct = cam.consumacao ? Math.min(100, Math.round((consumo / cam.consumacao) * 100)) : 0;
      return `<article class="camarote ${estado}"><header><b>${t(cam.nome)}</b><em class="badge">${estado === 'livre' ? 'Livre' : estado === 'reservado' ? 'Reservado' : 'Ocupado'}</em></header>
        <p class="mudo">${cam.capacidade} pessoas · consumação ${dinCurto(cam.consumacao)}${cam.pacote ? ` · ${t(cam.pacote)}` : ''}</p>
        ${r ? `<p><b>${t(r.nome)}</b> · ${r.pessoas} pessoas${r.promoter ? ` · promoter ${t(nomeProm(r.promoter))}` : ''}${r.sinal ? ` · sinal ${dinCurto(r.sinal)}` : ''}${r.chegou ? ` · chegou ${hora(r.chegou)}` : ''}</p>` : ''}
        ${estado === 'ocupado' ? `<span class="barra" aria-label="Consumido ${pct}% da consumação"><i style="width:${pct}%"></i></span><p class="cam-cons">Consumido <b>${dinCurto(consumo)}</b> de ${dinCurto(cam.consumacao)}${falta ? ` · faltam ${dinCurto(falta)} para a consumação` : ' · consumação atingida'}</p>` : ''}
        <div class="linha-bts">${estado === 'livre' ? `<button type="button" class="bt cheio" data-acao="cam-reservar" data-id="${cam.id}">Reservar</button>`
          : estado === 'reservado' ? `<button type="button" class="bt cheio" data-acao="cam-chegou" data-id="${r.id}">Chegou</button><button type="button" class="bt" data-acao="cam-cancelar" data-id="${r.id}">Cancelar</button>`
            : `${cartaoAberto(r.cartao) ? `<a class="bt" href="#cartao/${r.cartao}">Ver cartão ${r.cartao}</a><a class="bt" href="#caixa/${cartaoAberto(r.cartao).id}">Cobrar</a>` : '<span class="mudo">conta fechada</span>'}`}</div></article>`; }).join('') || '<div class="vazio">Cadastre os camarotes em Gestão › Regras das funções.</div>'}</div>
    <div class="sec-tit"><h2>Promoters e comissão</h2><span>entradas pagas desta noite e consumo dos camarotes que cada um trouxe</span></div>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Promoter</th><th class="num">Entradas</th><th class="num">Pagantes</th><th class="num">Camarotes</th><th class="num">Consumo</th><th class="num">Comissão</th></tr></thead><tbody>
    ${proms.map((p) => { const es = ent.filter((x) => x.promoter === p.codigo), pag = es.filter((x) => x.preco > 0).length, cp = R.porPromoter[p.codigo] || { camarotes: 0, consumo: 0 }, cm = comissaoPromoter(p, { pagantes: pag, consumo: cp.consumo });
      return `<tr><td><b>${t(p.nome)}</b><small>${t(p.codigo)}${p.porEntrada || p.pctConsumo ? ` · ${dinCurto(p.porEntrada || 0)} por entrada + ${vir(p.pctConsumo || 0)}% do consumo` : ' · sem comissão definida'}</small></td><td class="num">${es.length}</td><td class="num">${pag}</td><td class="num">${cp.camarotes}</td><td class="num">${dinCurto(cp.consumo)}</td><td class="num"><b>${dinCurto(cm.total)}</b></td></tr>`; }).join('') || '<tr><td colspan="6">Cadastre os promoters em Gestão › Regras das funções › Portaria.</td></tr>'}</tbody></table></div>`;
};
acao('cam-reservar', (b) => {
  const cam = camarotes().find((x) => x.id === b.dataset.id); if (!cam) return; const proms = lojaCfg().portaria?.promoters || [];
  folha({ titulo: `Reservar · ${cam.nome}`, corpo: `<label class="campo"><span>Nome da reserva</span><input data-n maxlength="60" placeholder="Ex.: Aniversário do Rafa"></label>
    <div class="duas-c"><label class="campo"><span>WhatsApp</span><input data-tel inputmode="tel"></label><label class="campo"><span>Pessoas (até ${cam.capacidade})</span><input data-p inputmode="numeric" value="${cam.capacidade}"></label></div>
    <div class="duas-c"><label class="campo"><span>Sinal pago (R$, desconta da consumação)</span><input data-s inputmode="decimal" placeholder="0,00"></label>${proms.length ? `<label class="campo"><span>Promoter</span><select data-prom><option value="">Nenhum</option>${proms.map((p) => `<option value="${t(p.codigo)}">${t(p.codigo)} · ${t(p.nome)}</option>`).join('')}</select></label>` : ''}</div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Reservar</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    const nome = $('[data-n]', f).value.trim(), pessoas = Math.round(num($('[data-p]', f).value)); if (!nome) return toast('Escreva o nome da reserva');
    if (!(pessoas > 0)) return toast('Quantas pessoas?'); if (pessoas > cam.capacidade) toast(`Atenção: o ${cam.nome} é para ${cam.capacidade} pessoas`);
    (db.camaroteRes ||= []).push({ id: uid('cr'), camarote: cam.id, noite: noite(), nome: nome.slice(0, 60), tel: $('[data-tel]', f).value.replace(/\D/g, ''), pessoas, sinal: r2(num($('[data-s]', f).value)), promoter: $('[data-prom]', f)?.value || '', criado: Date.now() });
    if (db.camaroteRes.length > 600) db.camaroteRes.splice(0, db.camaroteRes.length - 600);
    grava(); fechar(); toast(`${cam.nome} reservado`);
  }; } });
});
// chegou: abre o cartão do camarote com a consumação como crédito (o sinal já entra como pago)
acao('cam-chegou', (b) => {
  const r = (db.camaroteRes || []).find((x) => x.id === b.dataset.id), cam = camarotes().find((x) => x.id === r?.camarote); if (!r || !cam) return;
  const n = proximoCartao(), c = abrirCartao(n, { nome: `${cam.nome} · ${r.nome}`, consumacao: r2(cam.consumacao), camarote: cam.id, pessoas: r.pessoas, ...(r.promoter ? { promoter: r.promoter } : {}) });
  if (r.sinal > 0) c.pagamentos.push({ id: uid('pg'), forma: 'Sinal do camarote', valor: r2(r.sinal), ts: Date.now() });
  Object.assign(r, { chegou: Date.now(), cartao: n }); grava(); toast(`${cam.nome}: cartão ${n} aberto com ${din(cam.consumacao)} de consumação`);
});
acao('cam-cancelar', async (b) => { const r = (db.camaroteRes || []).find((x) => x.id === b.dataset.id); if (!r || !(await confirma(`Cancelar a reserva de ${r.nome}?`, 'Cancelar reserva', true))) return; r.cancelada = Date.now(); grava(); toast('Reserva cancelada'); });

// ------------------------------------------------------------------ painel da gestão: os cartões das funções novas
const card = (rot, val, det = '', href = '', ic = 'ao_vivo') => href
  ? `<a class="ko" href="${href}">${ico(ic)}<small>${rot}</small><b>${val}</b>${det ? `<span>${det}</span>` : ''}</a>`
  : `<div class="ko">${ico(ic)}<small>${rot}</small><b>${val}</b>${det ? `<span>${det}</span>` : ''}</div>`;
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const itensForno = () => db.comandas.flatMap((c) => c.itens.filter((i) => !i.cancelado && ['novo', 'preparo'].includes(i.status) && i.setor !== 'bar' && (prod(i.prod)?.pizza || estacaoDe(prod(i.prod), lojaCfg().estacaoCat) === 'forno')).map((i) => ({ ...i, c })));
PAINEL_TIPO.push(() => {
  const l = [], L = lojaCfg();
  if (tem('forno')) { const f = filaForno(itensForno(), L.forno), dentro = f.filter((x) => x.noForno), tirar = dentro.filter((x) => x.passou), prox = dentro.filter((x) => !x.passou).sort((a, b) => a.sai - b.sai)[0];
    l.push(card('No forno', `${dentro.length}${f.length > dentro.length ? ` <span>+${f.length - dentro.length} na fila</span>` : ''}`, tirar.length ? `tirar agora: ${tirar.length}` : prox ? `a próxima sai em ${mmss(prox.resta)}` : 'forno livre', '#cozinha', 'relogio')); }
  if (tem('embalagem')) { const E = L.embalagem || {}, ids = [...(E.pizza || []).map((x) => x.insumo), E.delivery].filter(Boolean), ins = ids.map(insumo).filter(Boolean);
    if (ins.length) l.push(card('Embalagens', ins.reduce((s, i) => s + Math.max(0, Math.floor(saldo(i))), 0), t(ins.map((i) => `${i.nome.replace(/^(caixa de pizza|embalagem do delivery)\s*/i, (m) => (/caixa/i.test(m) ? 'caixa ' : 'delivery '))}: ${Math.floor(saldo(i))}`).join(' · ')), '#mais/estoque', 'sacola')); }
  if (tem('estacoes')) { const ES = L.estacoes?.length ? L.estacoes : ESTACOES_PADRAO, cont = {};
    db.comandas.forEach((c) => c.itens.filter((i) => !i.cancelado && ['novo', 'preparo'].includes(i.status) && i.setor !== 'bar').forEach((i) => { const e = estacaoDe(prod(i.prod), L.estacaoCat) || 'geral'; cont[e] = (cont[e] || 0) + i.qtd; }));
    l.push(card('Estações agora', Object.values(cont).reduce((s, n) => s + n, 0), t(Object.entries(cont).map(([k, n]) => `${ES.find((x) => x.id === k)?.nome || 'Geral'}: ${n}`).join(' · ') || 'nada na cozinha'), '#cozinha', 'chef')); }
  if (tem('comboEtapas')) { const n = db.comandas.reduce((s, c) => s + c.itens.filter((i) => i.comboDesc && !i.cancelado).length, 0); l.push(card('Combos montados', n, `desconto de ${dinCurto(L.comboEtapas?.desconto || 0)} por combo`, '', 'cloche')); }
  if (tem('quilo')) { const p = db.produtos.find((x) => x.porKg); if (p) { const k = precoKg(p), fx = faixasDoKg(p); l.push(card('Quilo agora', `${dinCurto(k.preco)}`, k.ate ? `a partir das ${k.ate}: ${dinCurto(fx.find((x) => x.de === k.ate)?.preco || 0)}` : `${(L.taras || []).length} pratos com tara em 1 toque`, '', 'etiqueta')); } }
  if (tem('vitrine') && (db.vitrineHist || []).length) { const h = db.vitrineHist.at(-1); l.push(card('Perda da vitrine', dinCurto(h.perda || 0), `no fechamento de ${new Date(`${h.dia}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, '#mais/vitrine', 'loja')); }
  if (tem('granel')) { const g = garrafoes().filter((b) => !b.fim); if (g.length) { const e = estadoBarril(g[0], mlTaca(g[0])); l.push(card('Vinho a granel', `${vir(e.litros)} L`, `ainda ${e.copos} taças no garrafão`, '#mais/granel', 'taca')); } }
  if (tem('faturado')) { const f = (db.faturados || []).filter((x) => x.venc >= ymd()); l.push(card('Faturado a receber', dinCurto(f.reduce((s, x) => s + x.valor, 0)), `${f.length} ${f.length === 1 ? 'conta' : 'contas'} de empresa`, '#mais/contas', 'conta')); }
  if (tem('camarotes')) { const R = resumoCamarotes(), oc = R.lista.filter((x) => x.estado === 'ocupado'); l.push(card('Camarotes', `${oc.length}/${R.lista.length}`, `${R.lista.filter((x) => x.estado === 'reservado').length} reservados · consumo ${dinCurto(oc.reduce((s, x) => s + x.consumo, 0))}`, '#mais/camarotes', 'coroa')); }
  if (tem('portaria') && tem('camarotes')) { const P = lojaCfg().portaria || {}, ent = db.portaria?.dia === noite() ? db.portaria.entradas : [], R = resumoCamarotes();
    const tot = (P.promoters || []).reduce((s, p) => s + comissaoPromoter(p, { pagantes: ent.filter((x) => x.promoter === p.codigo && x.preco > 0).length, consumo: R.porPromoter[p.codigo]?.consumo || 0 }).total, 0);
    l.push(card('Comissão de promoters', dinCurto(tot), `${(P.promoters || []).length} promoters · ${lotacao(ent).entradas} entradas`, '#mais/camarotes', 'pessoas')); }
  return l.join('');
});

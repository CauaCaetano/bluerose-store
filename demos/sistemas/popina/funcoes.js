// Popina · telas das funções da casa: regras (rodízio, pizza, happy hour, prato do dia, fidelidade, encomendas, portaria),
// reservas e fila de espera, eventos, encomendas, vitrine do dia, portaria e o painel de retirada das senhas.
// Cada tela só aparece com a função ligada (Gestão › Aparência e templates).
import { db, t, din, dinCurto, grava, r2, uid, tempo, lojaCfg, setLoja, tem, comandaDaMesa, abrirMesa, conta, itensValidos, ouvir,
  abrirCartao, cartaoAberto, proximoCartao, vitrineHoje, prod, couvertLigado, marcar } from './loja.js?v=20';
import { registrar, acao, ir } from './nucleo.js?v=20';
import { ico, folha, toast, confirma, bip, $, $$ } from './ui.js?v=20';
import { TELAS_MAIS, MONTAR, volta } from './mais.js?v=20';
import { abrirSeletor } from './salao.js?v=20';
import { TIPOS_RODIZIO, ymd } from './precos.js?v=20';

const num = (v) => { const s = String(v ?? '').trim(); return Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
const vir = (n) => String(n ?? '').replace('.', ',');
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const zap = (tel, msg) => `https://wa.me/55${String(tel || '').replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(msg)}`;
const dataBR = (d) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
const somaDia = (d, n) => { const x = new Date(`${d}T12:00`); x.setDate(x.getDate() + n); return ymd(x.getTime()); };
const chipsDe = (lista, sel, nome) => `<div class="chips quebra">${lista.map(([v, n]) => `<label class="chip ${sel.includes(v) ? 'on' : ''}"><input type="checkbox" name="${nome}" value="${t(v)}" ${sel.includes(v) ? 'checked' : ''} hidden>${t(n)}</label>`).join('')}</div>`;
const ligaChips = (el) => el.addEventListener('change', (e) => { const i = e.target; if (i.matches('.chip input[type=checkbox]')) i.closest('.chip').classList.toggle('on', i.checked); });

// ------------------------------------------------------------------ regras das funções (o dono ajusta; só as ligadas aparecem)
TELAS_MAIS.funcoes = () => {
  const L = lojaCfg(), R = L.rodizio || {}, F = L.fracoes || {}, FI = L.fidelidade || {}, PO = L.portaria || {}, prods = db.produtos.map((p) => [p.id, p.nome]);
  const s = [];
  if (tem('rodizio')) s.push(`<section class="bloco-form"><h2>Rodízio</h2><p class="mudo">Preço por pessoa. Os itens marcados entram na conta com preço zero; os outros são cobrados à parte.</p>
    <div class="tres-c">${TIPOS_RODIZIO.map(([k, n]) => `<label class="campo"><span>${n}${k === 'meia' ? ' (opcional)' : ''}</span><input name="rod_${k}" inputmode="decimal" value="${R[k] ? vir(R[k]) : ''}" placeholder="0,00"></label>`).join('')}</div>
    ${tem('rodadas') ? `<label class="campo"><span>Pedido por rodada: peças inclusas por pessoa a cada rodada (0 = sem limite)</span><input name="rod_rodada" inputmode="numeric" value="${R.porRodada || ''}" placeholder="Ex.: 6"></label>` : ''}
    <div class="campo"><span>Inclusos no rodízio</span>${chipsDe(prods, R.inclusos || [], 'rod_inc')}</div></section>`);
  if (tem('meiaMeia')) s.push(`<section class="bloco-form"><h2>Pizza em frações e bordas</h2>
    <label class="campo"><span>Preço da pizza com mais de um sabor</span><select name="fr_regra"><option value="caro" ${F.regra !== 'proporcional' ? 'selected' : ''}>Cobra o sabor mais caro</option><option value="proporcional" ${F.regra === 'proporcional' ? 'selected' : ''}>Proporcional (média dos sabores)</option></select></label>
    <label class="campo"><span>Bordas: uma por linha, com o preço de cada tamanho do menor para o maior. Ex.: Catupiry | 6 | 9</span><textarea name="fr_bordas" rows="4" placeholder="Catupiry | 6 | 9">${t((F.bordas || []).map((b) => [b.nome, ...(b.precos || []).map(vir)].join(' | ')).join('\n'))}</textarea></label></section>`);
  if (tem('happyHour')) s.push(`<section class="bloco-form"><h2>Happy hour</h2><p class="mudo">O preço especial entra sozinho no horário, no sistema e no cardápio do cliente.</p>
    <ul class="regras-hh">${(L.happyHour || []).map((h) => `<li><div><b>${t(h.nome || 'Happy hour')}</b><small>${(h.dias || []).map((d) => DIAS_C[d]).join(', ')} · ${t(h.de)} às ${t(h.ate)} · ${h.tipo === '%' ? `${vir(h.valor)}% off` : `por ${din(h.valor)}`} · ${h.alvo === 'cat' ? 'categorias' : 'produtos'}: ${t((h.ids || []).map((id) => (h.alvo === 'cat' ? db.categorias.find((c) => c.id === id)?.nome : prod(id)?.nome) || id).join(', '))}</small></div>
      <label class="interruptor"><input type="checkbox" data-acao="hh-ativo" data-id="${h.id}" ${h.ativo !== false ? 'checked' : ''}><span></span></label><button type="button" class="bt-ico" data-acao="hh-ed" data-id="${h.id}" aria-label="Editar">${ico('ajustes')}</button></li>`).join('') || '<li class="vazio">Nenhuma regra ainda.</li>'}</ul>
    <button type="button" class="link" data-acao="hh-ed">+ Regra de happy hour</button></section>`);
  if (tem('pratoDoDia')) s.push(`<section class="bloco-form"><h2>Prato do dia</h2><p class="mudo">Um prato por dia da semana com preço especial. Fica no topo do cardápio e o preço vale só no dia.</p>
    <ul class="pratos-dia">${DIAS.map((d, k) => { const x = (L.pratoDoDia || [])[k] || {}; return `<li><b>${d}</b><select name="pd_prod_${k}" aria-label="Prato de ${d}"><option value="">Sem prato do dia</option>${db.produtos.filter((p) => !p.porKg).map((p) => `<option value="${p.id}" ${x.prod === p.id ? 'selected' : ''}>${t(p.nome)} (${din(p.preco)})</option>`).join('')}</select><input name="pd_preco_${k}" inputmode="decimal" value="${x.preco ? vir(x.preco) : ''}" placeholder="Preço do dia" aria-label="Preço de ${d}"></li>`; }).join('')}</ul></section>`);
  if (tem('fidelidade')) s.push(`<section class="bloco-form"><h2>Cartão fidelidade</h2><p class="mudo">Um carimbo a cada compra paga com o telefone do cliente. Ao completar, o caixa vê o botão “Dar prêmio”.</p>
    <div class="tres-c"><label class="campo"><span>Compras para o prêmio</span><input name="fi_compras" inputmode="numeric" value="${FI.compras || 10}"></label><label class="campo"><span>Valor mínimo por compra (R$)</span><input name="fi_min" inputmode="decimal" value="${FI.minimo ? vir(FI.minimo) : ''}" placeholder="0,00"></label><label class="campo"><span>Prêmio</span><input name="fi_premio" value="${t(FI.premio || '')}" placeholder="Ex.: Uma pizza broto"></label></div></section>`);
  if (tem('encomendas')) s.push(`<section class="bloco-form"><h2>Encomendas</h2><label class="campo"><span>Antecedência mínima (horas)</span><input name="enc_ant" inputmode="numeric" value="${L.encomendas?.antecedencia ?? 24}"></label></section>`);
  if (tem('portaria')) s.push(`<section class="bloco-form"><h2>Portaria</h2><label class="campo"><span>Capacidade da casa (pessoas)</span><input name="po_cap" inputmode="numeric" value="${PO.capacidade || ''}" placeholder="Ex.: 300"></label>
    <label class="campo"><span>Tipos de ingresso: um por linha, com preço e consumação mínima. Ex.: Pista | 40 | 30</span><textarea name="po_ing" rows="4" placeholder="Pista | 40 | 30">${t((PO.ingressos || []).map((x) => `${x.nome} | ${vir(x.preco)} | ${vir(x.consumacao || 0)}`).join('\n'))}</textarea></label></section>`);
  if (couvertLigado()) s.push(`<section class="bloco-form"><h2>Couvert</h2><label class="campo"><span>Couvert por pessoa (R$), cobrado na conta da mesa</span><input name="couvert" inputmode="decimal" value="${L.couvert ? vir(L.couvert) : ''}" placeholder="0,00"></label></section>`);
  return volta('mais', 'Regras das funções', 'Preços e regras das funções ligadas para o seu tipo de casa') + `<form class="form larga" data-funcoes>${s.join('') || '<div class="vazio">Nenhuma função com regras ligada.</div>'}
    ${s.length ? '<div class="salvar-fixo"><button class="bt cheio grande">Salvar</button></div>' : ''}</form>`;
};
MONTAR.funcoes = (el) => {
  const f = $('[data-funcoes]', el); if (!f) return; ligaChips(f);
  f.onsubmit = (e) => {
    e.preventDefault(); const L = lojaCfg(), p = {};
    if (f.rod_adulto) p.rodizio = { ...(L.rodizio || {}), adulto: r2(num(f.rod_adulto.value)), crianca: r2(num(f.rod_crianca.value)), meia: r2(num(f.rod_meia.value)), inclusos: $$('[name=rod_inc]:checked', f).map((i) => i.value), ...(f.rod_rodada ? { porRodada: Math.max(0, Math.round(num(f.rod_rodada.value))) } : {}) };
    if (f.fr_regra) p.fracoes = { regra: f.fr_regra.value, bordas: f.fr_bordas.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map(([nome, ...pr]) => ({ nome: nome.slice(0, 40), precos: pr.map(num).filter((x) => x >= 0).slice(0, 6) })) };
    if (f.pd_prod_0) p.pratoDoDia = DIAS.map((_, k) => { const id = f[`pd_prod_${k}`].value, pr = r2(num(f[`pd_preco_${k}`].value)); return id ? { prod: id, preco: pr || prod(id)?.preco || 0 } : null; });
    if (f.fi_compras) p.fidelidade = { compras: Math.max(1, Math.round(num(f.fi_compras.value)) || 10), minimo: r2(num(f.fi_min.value)), premio: f.fi_premio.value.trim() || 'Um prato à sua escolha' };
    if (f.enc_ant) p.encomendas = { antecedencia: Math.max(0, Math.round(num(f.enc_ant.value))) };
    if (f.po_cap) p.portaria = { capacidade: Math.max(0, Math.round(num(f.po_cap.value))), ingressos: f.po_ing.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map(([nome, pr, cons]) => ({ nome: nome.slice(0, 40), preco: r2(num(pr)), consumacao: r2(num(cons)) })) };
    if (f.couvert) p.couvert = r2(num(f.couvert.value));
    setLoja(p); toast('Regras salvas');
  };
};
// happy hour: editar uma regra (dias, horário, o que entra e o desconto)
acao('hh-ativo', (b) => { const L = lojaCfg(); setLoja({ happyHour: (L.happyHour || []).map((h) => (h.id === b.dataset.id ? { ...h, ativo: b.checked } : h)) }); });
acao('hh-ed', (b) => {
  const L = lojaCfg(), h = (L.happyHour || []).find((x) => x.id === b.dataset.id) || { id: uid('hh'), nome: 'Happy hour', dias: [1, 2, 3, 4, 5], de: '17:00', ate: '19:00', alvo: 'cat', ids: [], tipo: '%', valor: 20, ativo: true };
  const novo = !(L.happyHour || []).some((x) => x.id === h.id);
  let alvo = h.alvo;
  const alvos = () => (alvo === 'cat' ? db.categorias.map((c) => [c.id, c.nome]) : db.produtos.map((p) => [p.id, p.nome]));
  folha({ titulo: novo ? 'Nova regra de happy hour' : h.nome, corpo: `<label class="campo"><span>Nome</span><input data-n value="${t(h.nome)}" maxlength="40"></label>
    <div class="campo"><span>Dias</span>${chipsDe(DIAS_C.map((d, k) => [String(k), d]), (h.dias || []).map(String), 'hh_dia')}</div>
    <div class="duas-c"><label class="campo"><span>Das</span><input data-de type="time" value="${t(h.de)}"></label><label class="campo"><span>Até</span><input data-ate type="time" value="${t(h.ate)}"></label></div>
    <div class="duas-c"><label class="campo"><span>Desconto</span><select data-tipo><option value="%" ${h.tipo === '%' ? 'selected' : ''}>Porcentagem (%)</option><option value="R$" ${h.tipo !== '%' ? 'selected' : ''}>Preço fixo (R$)</option></select></label><label class="campo"><span>Valor</span><input data-v inputmode="decimal" value="${vir(h.valor)}"></label></div>
    <div class="campo"><span>Vale para</span><div class="seg"><button type="button" data-alvo="cat" aria-pressed="${alvo === 'cat'}">Categorias</button><button type="button" data-alvo="prod" aria-pressed="${alvo !== 'cat'}">Produtos</button></div><div data-ids>${chipsDe(alvos(), h.ids || [], 'hh_id')}</div></div>
    ${novo ? '' : '<button type="button" class="bt perigo" data-apagar>Apagar a regra</button>'}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    ligaChips(f);
    $$('[data-alvo]', f).forEach((x) => { x.onclick = () => { alvo = x.dataset.alvo; $$('[data-alvo]', f).forEach((y) => y.setAttribute('aria-pressed', String(y === x))); $('[data-ids]', f).innerHTML = chipsDe(alvos(), [], 'hh_id'); }; });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma('Apagar esta regra de happy hour?', 'Apagar', true)) { setLoja({ happyHour: (lojaCfg().happyHour || []).filter((x) => x.id !== h.id) }); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const d = { ...h, nome: $('[data-n]', f).value.trim() || 'Happy hour', dias: $$('[name=hh_dia]:checked', f).map((i) => Number(i.value)), de: $('[data-de]', f).value, ate: $('[data-ate]', f).value, tipo: $('[data-tipo]', f).value, valor: r2(num($('[data-v]', f).value)), alvo, ids: $$('[name=hh_id]:checked', f).map((i) => i.value) };
      if (!d.dias.length) return toast('Escolha pelo menos um dia');
      if (!d.de || !d.ate || d.de === d.ate) return toast('Confira o horário');
      if (!d.ids.length) return toast(alvo === 'cat' ? 'Escolha as categorias' : 'Escolha os produtos');
      if (!(d.valor > 0) || (d.tipo === '%' && d.valor >= 100)) return toast(d.tipo === '%' ? 'Desconto entre 1% e 99%' : 'Escreva o preço especial');
      const l = lojaCfg().happyHour || []; setLoja({ happyHour: novo ? [...l, d] : l.map((x) => (x.id === h.id ? d : x)) }); fechar(); toast('Regra salva');
    };
  } });
});

// ------------------------------------------------------------------ reservas e fila de espera
const ST_RES = { pendente: 'Pendente', confirmada: 'Confirmada', chegou: 'Chegou', naoveio: 'Não veio', cancelada: 'Cancelada' };
TELAS_MAIS.reservas = (x) => {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : ymd(), hoje = dia === ymd();
  const l = (db.reservas || []).filter((r) => r.data === dia).sort((a, b) => a.hora.localeCompare(b.hora));
  const pessoas = l.filter((r) => ['pendente', 'confirmada', 'chegou'].includes(r.status)).reduce((s, r) => s + r.pessoas, 0);
  const fila = (db.fila || []).slice().sort((a, b) => a.ts - b.ts);
  return volta('salao', 'Reservas e fila', `${dataBR(dia)} · ${l.length} ${l.length === 1 ? 'reserva' : 'reservas'} · ${pessoas} pessoas`) + `
    <div class="filtros"><div class="linha-bts"><a class="bt" href="#mais/reservas/${somaDia(dia, -1)}" aria-label="Dia anterior">${ico('voltar')}</a>${hoje ? '' : `<a class="bt" href="#mais/reservas/${ymd()}">Hoje</a>`}<a class="bt" href="#mais/reservas/${somaDia(dia, 1)}" aria-label="Próximo dia">${ico('dir')}</a>
      <input type="date" class="data-res" data-dia value="${dia}" aria-label="Escolher o dia"><button type="button" class="bt cheio" data-acao="reserva-ed" data-dia="${dia}">${ico('mais2')}Nova reserva</button></div></div>
    <ul class="lista-res">${l.map((r) => `<li class="res-${r.status}"><time>${t(r.hora)}</time><div><b>${t(r.nome)} · ${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}</b><small>${[r.mesa ? `Mesa ${r.mesa}` : 'Sem mesa', r.tel ? r.tel : '', r.obs, r.origem === 'Cardápio online' ? 'pelo cardápio' : ''].filter(Boolean).map(t).join(' · ')}</small></div>
      <em class="st-res">${ST_RES[r.status] || r.status}</em>
      <div class="res-bts">${r.status === 'pendente' ? `<button type="button" class="bt" data-acao="res-st" data-id="${r.id}" data-st="confirmada">Confirmar</button>` : ''}${['pendente', 'confirmada'].includes(r.status) && hoje ? `<button type="button" class="bt cheio" data-acao="res-chegou" data-id="${r.id}">Chegou</button><button type="button" class="bt" data-acao="res-st" data-id="${r.id}" data-st="naoveio">Não veio</button>` : ''}
        ${r.tel && ['pendente', 'confirmada'].includes(r.status) ? `<a class="bt-ico" href="${zap(r.tel, `Olá, ${r.nome.split(' ')[0]}! Sua reserva na ${db.config.nome} para ${r.pessoas} pessoas está confirmada: ${dataBR(r.data)} às ${r.hora}. Até lá.`)}" target="_blank" rel="noopener" aria-label="Confirmar pelo WhatsApp">${ico('zap')}</a>` : ''}
        <button type="button" class="bt-ico" data-acao="reserva-ed" data-id="${r.id}" aria-label="Editar">${ico('ajustes')}</button></div></li>`).join('') || '<li class="vazio">Nenhuma reserva neste dia.</li>'}</ul>
    ${hoje ? `<div class="sec-tit"><h2>Fila de espera</h2><span>${fila.length} ${fila.length === 1 ? 'grupo' : 'grupos'} esperando</span></div>
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="fila-ed">${ico('mais2')}Pôr na fila</button></div>
      <ol class="lista-res fila-espera">${fila.map((q, k) => `<li><time>${k + 1}º</time><div><b>${t(q.nome)} · ${q.pessoas} ${q.pessoas === 1 ? 'pessoa' : 'pessoas'}</b><small>Chegou há ${tempo(q.ts)}${q.chamado ? ` · chamado há ${tempo(q.chamado)}` : ''}${q.tel ? ` · ${t(q.tel)}` : ''}</small></div>
        <div class="res-bts">${q.tel ? `<a class="bt" href="${zap(q.tel, `${q.nome.split(' ')[0]}, sua mesa na ${db.config.nome} está pronta. Pode vir para a entrada que já vamos te acomodar.`)}" target="_blank" rel="noopener" data-acao="fila-chamar" data-id="${q.id}">${ico('zap')}Chamar</a>` : `<button type="button" class="bt" data-acao="fila-chamar" data-id="${q.id}">Chamar</button>`}
          <button type="button" class="bt cheio" data-acao="fila-sentar" data-id="${q.id}">Sentar</button><button type="button" class="bt-ico" data-acao="fila-tirar" data-id="${q.id}" aria-label="Tirar da fila">${ico('lixo')}</button></div></li>`).join('') || '<li class="vazio">Ninguém esperando.</li>'}</ol>` : ''}`;
};
MONTAR.reservas = (el) => { const i = $('[data-dia]', el); if (i) i.onchange = () => i.value && ir(`mais/reservas/${i.value}`); };
acao('res-st', (b) => { const r = (db.reservas || []).find((x) => x.id === b.dataset.id); if (!r) return; r.status = b.dataset.st; grava(); toast(`Reserva de ${r.nome}: ${ST_RES[r.status].toLowerCase()}`); });
// escolher uma mesa livre e abrir com as pessoas (reserva que chegou ou fila)
function sentar(pessoas, sugerida, depois) {
  const livres = Array.from({ length: db.config.mesas }, (_, k) => k + 1).filter((m) => !comandaDaMesa(m));
  if (!livres.length) return toast('Todas as mesas estão ocupadas');
  folha({ titulo: `Sentar ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`, corpo: `<p class="mudo">Toque na mesa livre.</p><div class="grade-mesas">${livres.map((m) => `<button type="button" class="mesa livre ${m === sugerida ? 'pronto' : ''}" data-m="${m}"><b>${m}</b></button>`).join('')}</div>`,
    aoAbrir: (f, fechar) => $$('[data-m]', f).forEach((x) => { x.onclick = () => { const m = Number(x.dataset.m); fechar(); abrirMesa(m, pessoas, ''); depois?.(m); ir(`mesa/${m}`); }; }) });
}
acao('res-chegou', (b) => { const r = (db.reservas || []).find((x) => x.id === b.dataset.id); if (!r) return;
  sentar(r.pessoas, Number(r.mesa) || 0, (m) => { r.status = 'chegou'; r.mesa = m; const c = comandaDaMesa(m); if (c) marcar(c, 'reserva', `Reserva de ${r.nome}`); grava(); }); });
acao('reserva-ed', (b) => {
  const r = b.dataset.id ? (db.reservas || []).find((x) => x.id === b.dataset.id) : null, dia = r?.data || b.dataset.dia || ymd();
  folha({ titulo: r ? `Reserva de ${r.nome}` : 'Nova reserva', corpo: `<div class="duas-c"><label class="campo"><span>Nome</span><input data-n value="${t(r?.nome || '')}" maxlength="80"></label><label class="campo"><span>Telefone</span><input data-tel inputmode="tel" value="${t(r?.tel || '')}"></label></div>
    <div class="tres-c"><label class="campo"><span>Dia</span><input data-d type="date" value="${dia}"></label><label class="campo"><span>Hora</span><input data-h type="time" value="${t(r?.hora || '20:00')}"></label><label class="campo"><span>Pessoas</span><input data-p inputmode="numeric" value="${r?.pessoas || 2}"></label></div>
    <div class="duas-c"><label class="campo"><span>Mesa (opcional)</span><input data-m inputmode="numeric" value="${r?.mesa || ''}"></label><label class="campo"><span>Situação</span><select data-st>${Object.entries(ST_RES).map(([k, n]) => `<option value="${k}" ${(r?.status || 'confirmada') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <label class="campo"><span>Observação</span><input data-o value="${t(r?.obs || '')}" maxlength="160" placeholder="Aniversário, cadeirão…"></label>`,
  pe: `${r ? '<button type="button" class="bt perigo" data-apagar>Apagar</button>' : ''}<button type="button" class="bt cheio grande" data-ok>Salvar</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Apagar a reserva de ${r.nome}?`, 'Apagar', true)) { db.reservas = db.reservas.filter((x) => x !== r); grava(); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const d = { nome: $('[data-n]', f).value.trim(), tel: $('[data-tel]', f).value.replace(/\D/g, ''), data: $('[data-d]', f).value, hora: $('[data-h]', f).value, pessoas: Math.max(1, Math.round(num($('[data-p]', f).value)) || 1), mesa: Math.round(num($('[data-m]', f).value)) || 0, status: $('[data-st]', f).value, obs: $('[data-o]', f).value.trim() };
      if (!d.nome) return toast('Escreva o nome'); if (!d.data || !d.hora) return toast('Escolha o dia e a hora');
      if (r) Object.assign(r, d); else (db.reservas ||= []).push({ id: uid('r'), origem: 'Balcão', criado: Date.now(), ...d });
      grava(); fechar(); toast('Reserva salva'); if (d.data !== dia) ir(`mais/reservas/${d.data}`);
    };
  } });
});
acao('fila-ed', () => folha({ titulo: 'Pôr na fila de espera', corpo: `<div class="duas-c"><label class="campo"><span>Nome</span><input data-n maxlength="60"></label><label class="campo"><span>Pessoas</span><input data-p inputmode="numeric" value="2"></label></div>
  <label class="campo"><span>WhatsApp (para chamar quando a mesa ficar livre)</span><input data-tel inputmode="tel" placeholder="(16) 99999-0000"></label>`,
pe: '<button type="button" class="bt cheio grande" data-ok>Pôr na fila</button>',
aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome');
  (db.fila ||= []).push({ id: uid('f'), nome, pessoas: Math.max(1, Math.round(num($('[data-p]', f).value)) || 1), tel: $('[data-tel]', f).value.replace(/\D/g, ''), ts: Date.now() }); grava(); fechar(); toast(`${nome} está na fila`); }; } }));
acao('fila-chamar', (b, e) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (!q) return; q.chamado = Date.now(); grava(); if (b.href) window.open(b.href, '_blank', 'noopener'); else toast(`Chame ${q.nome} na entrada`); e?.preventDefault?.(); });
acao('fila-sentar', (b) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (!q) return; sentar(q.pessoas, 0, () => { db.fila = db.fila.filter((x) => x !== q); grava(); }); });
acao('fila-tirar', async (b) => { const q = (db.fila || []).find((x) => x.id === b.dataset.id); if (q && (await confirma(`Tirar ${q.nome} da fila?`, 'Tirar', true))) { db.fila = db.fila.filter((x) => x !== q); grava(); } });

// ------------------------------------------------------------------ eventos: pacote por pessoa, convidados com check-in, couvert artístico
const contaEvento = (ev) => db.comandas.find((c) => c.tipo === 'evento' && c.evento === ev.id);
TELAS_MAIS.eventos = (id) => {
  const evs = (db.eventos || []).slice().sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
  const ev = id && evs.find((x) => x.id === id);
  if (!ev) {
    const hoje = ymd(), prox = evs.filter((x) => x.data >= hoje), antes = evs.filter((x) => x.data < hoje).reverse();
    const linha = (x) => `<li><a href="#mais/eventos/${x.id}"><time>${new Date(`${x.data}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time><div><b>${t(x.nome)}</b><small>${t(x.hora || '')} · ${(x.convidados || []).length} convidados · ${din(x.pacote)} por pessoa${x.couvert ? ` · couvert ${din(x.couvert)}` : ''}</small></div>${ico('dir')}</a></li>`;
    return volta('mais', 'Eventos', 'Pacote por pessoa, lista de convidados e check-in na porta') + `<div class="linha-bts"><button type="button" class="bt cheio" data-acao="evento-ed">${ico('mais2')}Novo evento</button></div>
      <div class="sec-tit"><h2>Próximos</h2></div><ul class="lista-res eventos">${prox.map(linha).join('') || '<li class="vazio">Nenhum evento marcado.</li>'}</ul>
      ${antes.length ? `<div class="sec-tit"><h2>Já aconteceram</h2></div><ul class="lista-res eventos">${antes.slice(0, 10).map(linha).join('')}</ul>` : ''}`;
  }
  const c = contaEvento(ev), v = c ? conta(c) : null, pres = (ev.convidados || []).filter((x) => x.chegou).length, n = (ev.convidados || []).length;
  const extras = c ? v.sub : 0, pac = pres * (Number(ev.pacote) || 0), cv = pres * (Number(ev.couvert) || 0);
  return volta('mais/eventos', ev.nome, `${dataBR(ev.data)} às ${t(ev.hora || '')}`) + `
    <section class="kpis"><div><small>Convidados</small><b>${pres} / ${n}</b><span>chegaram</span></div><div><small>Pacote</small><b>${dinCurto(pac)}</b><span>${din(ev.pacote)} por pessoa</span></div><div><small>Couvert artístico</small><b>${dinCurto(cv)}</b><span>${din(ev.couvert || 0)} por pessoa</span></div><div><small>Consumo extra</small><b>${dinCurto(extras)}</b><span>${c ? `total ${dinCurto(v.total)}` : 'conta não aberta'}</span></div></section>
    <div class="linha-bts"><button type="button" class="bt" data-acao="evento-ed" data-id="${ev.id}">${ico('ajustes')}Editar o evento</button>${c ? `<button type="button" class="bt" data-acao="evento-extra" data-id="${ev.id}">${ico('mais2')}Lançar consumo extra</button><a class="bt cheio" href="#caixa/${c.id}">${ico('conta')}Fechar no caixa · ${dinCurto(v.total)}</a>` : `<button type="button" class="bt cheio" data-acao="evento-conta" data-id="${ev.id}">${ico('conta')}Abrir a conta do evento</button>`}</div>
    ${ev.obs ? `<p class="mudo">${t(ev.obs)}</p>` : ''}
    <div class="sec-tit"><h2>Convidados</h2><span>toque para fazer o check-in</span></div>
    <form class="linha-bts" data-conv><input class="campo-linha" data-nome placeholder="Nome do convidado" aria-label="Nome do convidado" maxlength="80"><button class="bt">${ico('mais2')}Pôr na lista</button></form>
    <label class="busca">${ico('busca')}<input type="search" data-busca-conv placeholder="Buscar convidado" aria-label="Buscar convidado"></label>
    <ul class="convidados">${(ev.convidados || []).map((x) => `<li data-nome-conv="${t(x.nome.toLowerCase())}"><button type="button" class="conv ${x.chegou ? 'on' : ''}" data-acao="evento-checkin" data-ev="${ev.id}" data-id="${x.id}" aria-pressed="${!!x.chegou}">${ico(x.chegou ? 'check' : 'pessoas')}<b>${t(x.nome)}</b><small>${x.chegou ? `chegou ${new Date(x.chegou).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'esperando'}</small></button></li>`).join('') || '<li class="vazio">Ponha os nomes da lista acima.</li>'}</ul>`;
};
MONTAR.eventos = (el, id) => {
  const f = $('[data-conv]', el), ev = (db.eventos || []).find((x) => x.id === location.hash.split('/')[2]); if (!f || !ev) return;
  f.onsubmit = (e) => { e.preventDefault(); const n = $('[data-nome]', f).value.trim(); if (!n) return; (ev.convidados ||= []).push({ id: uid('g'), nome: n }); grava(); setTimeout(() => $('[data-nome]')?.focus(), 30); };
  const b = $('[data-busca-conv]', el); if (b) b.oninput = () => $$('[data-nome-conv]', el).forEach((li) => { li.hidden = !li.dataset.nomeConv.includes(b.value.trim().toLowerCase()); });
};
acao('evento-checkin', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.ev), g = ev?.convidados.find((x) => x.id === b.dataset.id); if (!g) return; g.chegou = g.chegou ? null : Date.now(); grava(); toast(g.chegou ? `${g.nome} chegou` : `Check-in de ${g.nome} desfeito`); });
acao('evento-conta', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id); if (!ev || contaEvento(ev)) return;
  const c = { id: uid('v'), tipo: 'evento', evento: ev.id, nomeEvento: ev.nome, pessoas: 0, aberta: Date.now(), garcom: '', itens: [], pagamentos: [], servico: true };
  marcar(c, 'abriu', `Conta do evento ${ev.nome}`); db.comandas.push(c); grava(); toast('Conta do evento aberta'); });
acao('evento-extra', (b) => { const ev = (db.eventos || []).find((x) => x.id === b.dataset.id), c = ev && contaEvento(ev); if (c) abrirSeletor(c); });
acao('evento-ed', (b) => {
  const ev = b.dataset.id ? (db.eventos || []).find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: ev ? ev.nome : 'Novo evento', corpo: `<label class="campo"><span>Nome do evento</span><input data-n value="${t(ev?.nome || '')}" maxlength="80" placeholder="Ex.: Casamento Ana e Pedro"></label>
    <div class="duas-c"><label class="campo"><span>Dia</span><input data-d type="date" value="${t(ev?.data || ymd())}"></label><label class="campo"><span>Hora</span><input data-h type="time" value="${t(ev?.hora || '20:00')}"></label></div>
    <div class="duas-c"><label class="campo"><span>Pacote por pessoa (R$)</span><input data-pac inputmode="decimal" value="${ev ? vir(ev.pacote) : ''}"></label><label class="campo"><span>Couvert artístico por pessoa (R$)</span><input data-cv inputmode="decimal" value="${ev?.couvert ? vir(ev.couvert) : ''}" placeholder="0,00"></label></div>
    <label class="campo"><span>O que o pacote inclui (observação)</span><input data-o value="${t(ev?.obs || '')}" maxlength="200"></label>
    ${ev ? '' : '<label class="campo"><span>Convidados (um por linha, opcional)</span><textarea data-lista rows="5"></textarea></label>'}
    ${ev && !contaEvento(ev) ? '<button type="button" class="bt perigo" data-apagar>Apagar o evento</button>' : ''}`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Apagar o evento ${ev.nome}?`, 'Apagar', true)) { db.eventos = db.eventos.filter((x) => x !== ev); grava(); fechar(); ir('mais/eventos'); } });
    $('[data-ok]', f).onclick = () => {
      const d = { nome: $('[data-n]', f).value.trim(), data: $('[data-d]', f).value, hora: $('[data-h]', f).value, pacote: r2(num($('[data-pac]', f).value)), couvert: r2(num($('[data-cv]', f).value)), obs: $('[data-o]', f).value.trim() };
      if (!d.nome) return toast('Escreva o nome do evento'); if (!d.data) return toast('Escolha o dia');
      if (ev) { Object.assign(ev, d); const c = contaEvento(ev); if (c) c.nomeEvento = d.nome; grava(); fechar(); toast('Evento salvo'); return; }
      const novo = { id: uid('ev'), ...d, convidados: ($('[data-lista]', f).value || '').split('\n').map((x) => x.trim()).filter(Boolean).map((nome) => ({ id: uid('g'), nome })) };
      (db.eventos ||= []).push(novo); grava(); fechar(); ir(`mais/eventos/${novo.id}`);
    };
  } });
});

// ------------------------------------------------------------------ encomendas: pedidos para outro dia, por data
TELAS_MAIS.encomendas = () => {
  const l = db.comandas.filter((c) => c.encomenda?.para).sort((a, b) => a.encomenda.para - b.encomenda.para);
  const dias = {}; l.forEach((c) => { (dias[ymd(c.encomenda.para)] ||= []).push(c); });
  return volta('pedidos', 'Encomendas', `${l.length} ${l.length === 1 ? 'encomenda aberta' : 'encomendas abertas'} · entram no quadro de pedidos no dia`) + `
    <div class="linha-bts"><a class="bt cheio" href="#pedidos/novo/balcao">${ico('mais2')}Nova encomenda</a></div>
    ${Object.entries(dias).map(([d, cs]) => `<div class="sec-tit"><h2>${d === ymd() ? 'Hoje' : t(dataBR(d))}</h2><span>${cs.length}</span></div>
      <ul class="lista-res">${cs.map((c) => `<li><time>${new Date(c.encomenda.para).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div><b>#${c.num} · ${t(c.cliente?.nome || 'Cliente')}</b><small>${itensValidos(c).map((i) => `${i.qtd}× ${t(i.nome)}`).join(', ') || 'sem itens ainda'}${c.tipo === 'delivery' ? ' · entrega' : ' · retirada'}</small></div>
        <em class="st-res">${dinCurto(conta(c).total)}${conta(c).falta <= 0 ? ' · pago' : ''}</em><div class="res-bts"><a class="bt" href="#pedidos/ver/${c.id}">Abrir</a></div></li>`).join('')}</ul>`).join('') || '<div class="vazio">Nenhuma encomenda. Em Pedidos › Balcão, preencha “Encomenda para” com o dia e a hora.</div>'}`;
};

// ------------------------------------------------------------------ vitrine do dia: quanto foi feito e quanto resta
TELAS_MAIS.vitrine = () => {
  const v = db.vitrine?.dia === ymd() ? db.vitrine : { qtd: {}, feito: {} }, l = db.produtos.filter((p) => p.vitrine);
  return volta('mais', 'Vitrine do dia', 'Itens que saem prontos, sem passar pela cozinha. Quando acaba, vira “Esgotou na vitrine”.') + (l.length ? `<form class="form" data-vitrine>
    <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Item</th><th class="num">Feito hoje</th><th class="num">Vendido</th><th class="num">Resta</th></tr></thead><tbody>
    ${l.map((p) => { const f = v.feito?.[p.id], r = v.qtd?.[p.id]; return `<tr class="${r === 0 ? 'off' : ''}"><td><b>${t(p.nome)}</b>${r === 0 ? '<small class="erro">Esgotou na vitrine</small>' : ''}</td><td class="num"><input class="inv-q" name="vt_${p.id}" inputmode="numeric" value="${f ?? ''}" placeholder="sem limite" aria-label="Feito hoje de ${t(p.nome)}"></td><td class="num">${f != null ? f - (r ?? f) : '—'}</td><td class="num"><b>${r ?? '—'}</b></td></tr>`; }).join('')}</tbody></table></div>
    <button class="bt cheio grande">Salvar a vitrine</button></form>` : '<div class="vazio">Marque os itens de vitrine no cadastro do prato (Gestão › Cardápio › editar › Vitrine).</div>');
};
MONTAR.vitrine = (el) => {
  const f = $('[data-vitrine]', el); if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault(); const v = vitrineHoje(); v.feito ||= {};
    db.produtos.filter((p) => p.vitrine).forEach((p) => {
      const val = f[`vt_${p.id}`].value.trim();
      if (val === '') { delete v.feito[p.id]; delete v.qtd[p.id]; return; }
      const feito = Math.max(0, Math.round(num(val))), vendido = v.feito[p.id] != null ? v.feito[p.id] - (v.qtd[p.id] ?? v.feito[p.id]) : 0;
      v.feito[p.id] = feito; v.qtd[p.id] = Math.max(0, feito - vendido);
      if (v.qtd[p.id] > 0 && p.esgotouVitrine) { p.ativo = true; delete p.esgotouVitrine; }
      if (v.qtd[p.id] === 0) { p.ativo = false; p.esgotouVitrine = v.dia; }
    });
    grava(); toast('Vitrine salva');
  };
};
// virou o dia: o que esgotou na vitrine ontem volta ao cardápio (a quantidade de hoje ainda não foi lançada)
function vitrineNovoDia() {
  const hoje = ymd(); let mudou = false;
  db.produtos.forEach((p) => { if (p.esgotouVitrine && p.esgotouVitrine !== hoje) { p.ativo = true; delete p.esgotouVitrine; mudou = true; } });
  if (mudou) grava();
}

// ------------------------------------------------------------------ portaria: entrada com ingresso, consumação mínima e lotação
function portariaHoje() { const d = ymd(); if (db.portaria?.dia !== d) db.portaria = { dia: d, entradas: [] }; return db.portaria; }
registrar('portaria', {
  titulo: 'Portaria', aba: 'salao',
  html() {
    if (!tem('portaria')) return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Portaria</h1></div></header><div class="vazio">A portaria está desligada. Ligue em Gestão › Aparência e templates.</div>`;
    const P = lojaCfg().portaria || {}, po = db.portaria?.dia === ymd() ? db.portaria : { entradas: [] };
    const dentro = po.entradas.filter((x) => !x.saiu), cap = Number(P.capacidade) || 0, pct = cap ? Math.min(100, Math.round((dentro.length / cap) * 100)) : 0;
    const porTipo = {}; po.entradas.forEach((x) => { porTipo[x.ingresso || 'Sem ingresso'] = (porTipo[x.ingresso || 'Sem ingresso'] || 0) + 1; });
    return `<header class="cab-tela"><a class="bt-ico" href="#salao" aria-label="Voltar">${ico('voltar')}</a><div><h1>Portaria</h1><p>${po.entradas.length} entradas hoje · ${po.entradas.length - dentro.length} saídas</p></div></header>
      <section class="lotacao ${pct >= 90 ? 'cheia' : ''}"><div><small>Lotação agora</small><b>${dentro.length}${cap ? ` <span>de ${cap}</span>` : ''}</b></div>${cap ? `<span class="barra"><i style="width:${pct}%"></i></span><em>${pct}%${pct >= 100 ? ' · casa cheia' : ''}</em>` : '<em>Defina a capacidade em Gestão › Regras das funções</em>'}</section>
      <div class="linha-bts"><button type="button" class="bt cheio grande" data-acao="portaria-entrada">${ico('mais2')}Registrar entrada</button><button type="button" class="bt grande" data-acao="portaria-saida-rapida">${ico('voltar')}Saída sem cartão</button></div>
      <p class="mudo">${Object.entries(porTipo).map(([k, n]) => `${t(k)}: ${n}`).join(' · ')}</p>
      <div class="sec-tit"><h2>Quem está na casa</h2><span>${dentro.length}</span></div>
      <ul class="lista-res">${dentro.slice().reverse().map((x) => { const c = x.cartao ? cartaoAberto(x.cartao) : null; return `<li><time>${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time><div><b>${x.cartao ? `Cartão ${x.cartao}` : 'Sem cartão'}${x.nome ? ` · ${t(x.nome)}` : ''}</b><small>${t(x.ingresso || '')}${c ? ` · conta ${dinCurto(conta(c).total)}` : x.cartao ? ' · conta paga' : ''}</small></div>
        <div class="res-bts">${c ? `<a class="bt" href="#cartao/${x.cartao}">Ver</a><a class="bt" href="#caixa/${c.id}">Cobrar</a>` : ''}<button type="button" class="bt ${c ? '' : 'cheio'}" data-acao="portaria-saida" data-id="${x.id}">Saiu</button></div></li>`; }).join('') || '<li class="vazio">Ninguém na casa ainda.</li>'}</ul>`;
  },
});
acao('portaria-entrada', () => {
  const ings = lojaCfg().portaria?.ingressos?.length ? lojaCfg().portaria.ingressos : [{ nome: 'Entrada', preco: 0, consumacao: 0 }];
  let sel = 0;
  folha({ titulo: 'Registrar entrada', corpo: `<div class="campo"><span>Ingresso</span><div class="papeis">${ings.map((x, k) => `<button type="button" class="papel ${k === 0 ? 'on' : ''}" data-ing="${k}"><b>${t(x.nome)}</b><small>${x.preco ? din(x.preco) : 'Sem cobrança'}${x.consumacao ? ` · consumação mínima ${din(x.consumacao)}` : ''}</small></button>`).join('')}</div></div>
    <div class="duas-c"><label class="campo"><span>Número do cartão</span><input data-n inputmode="numeric" value="${proximoCartao()}"></label><label class="campo"><span>Nome (opcional)</span><input data-nome maxlength="60"></label></div>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Entrou</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-ing]', f).forEach((b) => { b.onclick = () => { sel = Number(b.dataset.ing); $$('[data-ing]', f).forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('[data-ok]', f).onclick = () => {
      const n = Math.round(num($('[data-n]', f).value)), nome = $('[data-nome]', f).value.trim(), ing = ings[sel];
      if (!(n > 0)) return toast('Escreva o número do cartão');
      if (cartaoAberto(n)) return toast(`O cartão ${n} já está em uso`);
      const P = lojaCfg().portaria || {}, po = portariaHoje(), dentro = po.entradas.filter((x) => !x.saiu).length;
      if (P.capacidade && dentro >= P.capacidade) toast('Atenção: a casa está na lotação máxima');
      abrirCartao(n, { nome, portaria: true, ...(ing.preco ? { ingresso: { nome: ing.nome, preco: r2(ing.preco) } } : {}), ...(ing.consumacao ? { consumacao: r2(ing.consumacao) } : {}) });
      po.entradas.push({ id: uid('pt'), t: Date.now(), nome, ingresso: ing.nome, cartao: n }); grava(); fechar(); toast(`Cartão ${n}: entrada registrada`);
    };
  } });
});
acao('portaria-saida', async (b) => {
  const po = portariaHoje(), x = po.entradas.find((y) => y.id === b.dataset.id); if (!x) return;
  const c = x.cartao ? cartaoAberto(x.cartao) : null;
  if (c && conta(c).falta > 0.009 && !(await confirma(`O cartão ${x.cartao} ainda deve ${din(conta(c).falta)}. Registrar a saída mesmo assim?`, 'Registrar saída', true))) return;
  x.saiu = Date.now(); grava(); toast('Saída registrada');
});
acao('portaria-saida-rapida', () => { const po = portariaHoje(), x = po.entradas.find((y) => !y.saiu && !y.cartao) || po.entradas.find((y) => !y.saiu && !cartaoAberto(y.cartao)); if (!x) return toast('Ninguém sem conta aberta para sair'); x.saiu = Date.now(); grava(); toast('Saída registrada'); });

// ------------------------------------------------------------------ painel de retirada (TV do balcão): senhas preparando e prontas
const prontaSenha = (c) => { const it = itensValidos(c).filter((i) => i.status !== 'rascunho'); return it.length && it.every((i) => ['pronto', 'entregue'].includes(i.status)); };
let prontasVistas = new Set();
registrar('senhas', {
  titulo: 'Painel de retirada', aba: 'pedidos',
  html() {
    const l = db.comandas.filter((c) => c.tipo === 'balcao' && c.senha).sort((a, b) => a.senha - b.senha);
    const prontas = l.filter(prontaSenha), prep = l.filter((c) => !prontaSenha(c));
    const novas = prontas.filter((c) => !prontasVistas.has(c.id)); prontasVistas = new Set(prontas.map((c) => c.id));
    if (novas.length && document.body.dataset.tocou) bip(1180);
    return `<div class="painel-senhas"><header><h1>${t(db.config.nome)}</h1><div class="linha-bts"><a class="bt" href="#pedidos">${ico('voltar')}Pedidos</a><button type="button" class="bt" data-acao="tela-cheia">${ico('telacheia')}Tela cheia</button></div></header>
      ${tem('senha') ? '' : '<p class="aviso ouro">A senha de balcão está desligada: os pedidos novos não ganham número.</p>'}
      <div class="senhas-cols"><section class="senhas-prep"><h2>Preparando</h2><div class="senhas">${prep.map((c) => `<b>${c.senha}</b>`).join('') || '<p>—</p>'}</div></section>
        <section class="senhas-ok"><h2>Pronto, pode retirar</h2><div class="senhas">${prontas.map((c) => `<b class="${novas.includes(c) ? 'nova' : ''}">${c.senha}</b>`).join('') || '<p>—</p>'}</div></section></div></div>`;
  },
});

// ------------------------------------------------------------------ contador da aba Pedidos: só balcão e delivery de hoje (cartões, eventos e encomendas futuras ficam fora)
function contadorPedidos() {
  const e = document.querySelector('[data-cont="pedidos"]'); if (!e) return;
  const n = db.comandas.filter((c) => (c.tipo === 'delivery' || c.tipo === 'balcao') && !(c.encomenda?.para && ymd(c.encomenda.para) > ymd())).length;
  e.textContent = n ? n : '';
}
ouvir(() => setTimeout(() => { contadorPedidos(); vitrineNovoDia(); }, 0));
setTimeout(() => { contadorPedidos(); vitrineNovoDia(); }, 0);
export { portariaHoje };

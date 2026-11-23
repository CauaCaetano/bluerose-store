// Popina · Equipe (22/11/2026, conceito do ChatGPT escolhido entre ChatGPT e Gemini): funcionários com foto, função,
// telefone e PIN pessoal de 4 números para trocar de usuário no mesmo aparelho; permissões por função com ajuste fino em
// frases simples; ponto (entrada, intervalo, saída) e escala da semana; fechamento do dia por pessoa (10% do garçom,
// acerto do entregador) e quem fez o quê (cancelamentos, descontos, sangrias).
// COMPATIBILIDADE (só acrescenta): db.funcionarios, db.ponto, db.escala, db.acertosEquipe e db.config.turnos são novos. db.config.garcons, db.entregadores,
// db.equipe (convites da demonstração) e db.config.regras (senha do gerente) continuam valendo como estavam. Na conta real,
// os convites, cargos e telas de nexo_membros seguem pelo fluxo de conta-nuvem.js (window.veltriaAbrir), sem mudar nada.
import { db, t, din, r2, uid, grava, CONTA, ESPACO, regras, setRegras, temPin, fone, soDig, zap, euSou, setEuSou, num,
  inicioDoDia, hora, acertoEntregadores } from './loja.js?v=60';
import { acao, ir } from './nucleo.js?v=60';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=60';

// estilo próprio da Equipe (não mexe no popina.css)
if (!document.querySelector('link[data-equipe-css]')) {
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'equipe.css?v=60'; l.dataset.equipeCss = '1'; document.head.appendChild(l);
}

// ------------------------------------------------------------------ funções e modelos de permissão
export const FUNCOES = {
  garcom: { nome: 'Garçom', desc: 'Salão e pedidos', telas: ['#salao', '#pedidos'], perm: { desconto: 0, cancelar: 'gerente', caixa: false, sangria: false } },
  cozinha: { nome: 'Cozinha', desc: 'Só a tela da cozinha', telas: ['#cozinha'], perm: { desconto: 0, cancelar: 'gerente', caixa: false, sangria: false } },
  caixa: { nome: 'Caixa', desc: 'Caixa, pedidos e salão', telas: ['#salao', '#pedidos', '#caixa'], perm: { desconto: 10, cancelar: 'gerente', caixa: true, sangria: true } },
  entregador: { nome: 'Entregador', desc: 'Só os pedidos', telas: ['#pedidos'], perm: { desconto: 0, cancelar: 'nao', caixa: false, sangria: false } },
  gerente: { nome: 'Gerente', desc: 'Tudo, menos a assinatura', telas: null, perm: { desconto: 100, cancelar: 'sim', caixa: true, sangria: true } },
};
const TELAS = [['#salao', 'Salão'], ['#pedidos', 'Pedidos'], ['#cozinha', 'Cozinha'], ['#caixa', 'Caixa'], ['#mais', 'Gestão']];
const nomeFuncao = (f) => FUNCOES[f]?.nome || 'Equipe';

// PIN guardado só como resumo (nunca o número), com o espaço da empresa junto
export function resumoPin(p) {
  let h = 2166136261; const s = `popina|${ESPACO || 'demo'}|${p}`;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

// ------------------------------------------------------------------ dados (só acrescenta)
function preparar() {
  if (Array.isArray(db.funcionarios)) { db.ponto ||= []; db.escala ||= {}; return; }
  const l = [];
  if (!CONTA) {
    // demonstração: PINs 1111, 2222... (avisados na tela)
    const ex = [['Rafael', 'garcom', '16991112233', '1111'], ['Bruna', 'caixa', '16992223344', '2222'], ['Diego', 'garcom', '16993334455', '3333'], ['Dona Cida', 'cozinha', '16994445566', '4444'], ['Marcos', 'gerente', '16996667788', '5555']];
    ex.forEach(([nome, funcao, tel, pin]) => l.push({ id: uid('f'), nome, funcao, tel, pinH: resumoPin(pin), perm: { ...FUNCOES[funcao].perm }, telas: FUNCOES[funcao].telas, ativo: true, criado: Date.now() }));
  } else {
    // conta real: os garçons e os entregadores que já existem viram fichas (nada é apagado)
    (db.config.garcons || []).forEach((nome) => l.push({ id: uid('f'), nome, funcao: 'garcom', tel: '', pinH: '', perm: { ...FUNCOES.garcom.perm }, telas: FUNCOES.garcom.telas, ativo: true, criado: Date.now() }));
  }
  (db.entregadores || []).forEach((e) => { if (!l.some((p) => p.nome === e.nome)) l.push({ id: uid('f'), nome: e.nome, funcao: 'entregador', tel: e.tel || '', entregador: e.id, pinH: CONTA ? '' : resumoPin('6666'), perm: { ...FUNCOES.entregador.perm }, telas: FUNCOES.entregador.telas, ativo: true, criado: Date.now() }); });
  db.funcionarios = l; db.ponto ||= []; db.escala ||= {};
  if (!CONTA) {
    const h = inicioDoDia(), H = 3600e3, bate = (nome, tipo, ts) => { const p = l.find((x) => x.nome === nome); if (p && ts < Date.now()) db.ponto.push({ id: uid('pt'), pessoa: p.id, tipo, ts }); };
    for (let d = 1; d <= 4; d++) ['Rafael', 'Bruna', 'Dona Cida'].forEach((n, k) => { bate(n, 'entrada', h - d * 24 * H + (10.75 + k * 0.25) * H); bate(n, 'intervalo', h - d * 24 * H + 15 * H); bate(n, 'volta', h - d * 24 * H + 18 * H); bate(n, 'saida', h - d * 24 * H + 22.5 * H); });
    const ag = Date.now(), cedo = (x) => Math.max(h + 60e3, ag - x * H); bate('Dona Cida', 'entrada', cedo(4)); bate('Rafael', 'entrada', cedo(3.5)); bate('Bruna', 'entrada', cedo(3.25)); bate('Júnior', 'entrada', cedo(2)); bate('Wellington', 'entrada', cedo(1.5));
    l.forEach((p, k) => { db.escala[p.id] = [0, 1, 2, 3, 4, 5, 6].map((d) => (d === (k + 1) % 7 ? '' : p.funcao === 'entregador' ? 'noite' : p.funcao === 'cozinha' ? 'dia' : d % 2 ? 'dia' : 'almoco')); });
  }
  grava();
}
export const pessoas = () => { preparar(); return db.funcionarios.filter((p) => p.ativo !== false); };
export const pessoa = (id) => (db.funcionarios || []).find((p) => p.id === id);
// quem está usando este aparelho agora (null = o dono, ou ninguém escolhido)
export function atual() {
  let id = ''; try { id = localStorage.getItem('popina-eu-id') || ''; } catch { /* nada */ }
  const p = id && pessoa(id);
  if (p && p.ativo !== false) return p;
  const n = euSou(); return n ? (db.funcionarios || []).find((x) => x.nome === n && x.ativo !== false) || null : null;
}
function entrar(p) {
  try { localStorage.setItem('popina-eu-id', p ? p.id : ''); } catch { /* nada */ }
  setEuSou(p ? p.nome : '');
  aplicarTelas();
}

// ------------------------------------------------------------------ permissões usadas pelo caixa e pelo salão
// precisaGerente('cancelar') e limiteDesconto(): quem está no aparelho manda; sem ninguém escolhido vale a regra geral
export function precisaGerente(qual) {
  if (!temPin()) return false;
  const p = atual(); if (!p) return true;
  if (qual === 'cancelar') return p.perm?.cancelar !== 'sim';
  if (qual === 'sangria') return !p.perm?.sangria;
  return true;
}
export const podeCancelar = () => atual()?.perm?.cancelar !== 'nao';
export function limiteDesconto() {
  const p = atual(), geral = regras().limiteDesconto;
  return p ? Math.min(100, Math.max(0, Number(p.perm?.desconto ?? geral))) : geral;
}
// a senha do gerente também aceita o PIN pessoal de um gerente
export const pinDeGerente = (pin) => /^\d{4}$/.test(String(pin || '')) && (db.funcionarios || []).some((p) => p.ativo !== false && p.funcao === 'gerente' && p.pinH && p.pinH === resumoPin(pin));

// telas deste aparelho: o funcionário escolhido só vê as abas da função dele (o dono e o gerente veem tudo)
function aplicarTelas() {
  preparar();
  const p = atual(), ok = p?.telas;
  $$('#nav [data-aba]').forEach((a) => { a.hidden = !!ok && !ok.includes(`#${a.dataset.aba}`); });
  botaoTopo();
  const on = $('#nav [data-aba].on')?.dataset.aba;
  if (ok && ok.length && on && !ok.includes(`#${on}`)) ir(ok[0].slice(1));
}
function botaoTopo() {
  const box = $('#topo-bts'); if (!box || !(db.funcionarios || []).length) return;
  let b = $('[data-trocar-usuario]', box);
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'topo-bt eq-quem'; b.dataset.trocarUsuario = '1'; b.onclick = () => trocarUsuario(); box.prepend(b); }
  const p = atual(), rot = p ? p.nome.split(' ')[0] : 'Dono';
  if (b.dataset.rot !== rot) { b.dataset.rot = rot; b.innerHTML = `${avatar(p, 'mini')}<span>${t(rot)}</span>`; b.setAttribute('aria-label', `Trocar de usuário (agora: ${rot})`); b.title = 'Trocar de usuário'; }
}
document.addEventListener('popina-tela', () => aplicarTelas());

// ------------------------------------------------------------------ ponto
const PONTO = { entrada: 'Entrada', intervalo: 'Saiu para o intervalo', volta: 'Voltou do intervalo', saida: 'Saída' };
const batidas = (id, desde, ate = Infinity) => (db.ponto || []).filter((x) => x.pessoa === id && x.ts >= desde && x.ts < ate).sort((a, b) => a.ts - b.ts);
function trabalhouHoje(id) {
  const p = pessoa(id); if (!p) return false; const d0 = inicioDoDia();
  return db.vendas.some((v) => v.ts >= d0 && ((v.garcom && v.garcom === p.nome) || (p.entregador && v.entregador === p.entregador)));
}
export function situacao(id) {
  const u = batidas(id, inicioDoDia()).at(-1);
  if (!u && trabalhouHoje(id)) return { st: 'pausa', rot: 'Trabalhou sem bater o ponto', prox: ['entrada'] };
  if (!u || u.tipo === 'saida') return { st: u ? 'saiu' : 'fora', rot: u ? `Saiu ${hora(u.ts)}` : 'Não chegou', prox: ['entrada'] };
  if (u.tipo === 'intervalo') return { st: 'pausa', rot: `Intervalo desde ${hora(u.ts)}`, prox: ['volta'] };
  return { st: 'trabalhando', rot: `Trabalhando desde ${hora(batidas(id, inicioDoDia()).find((x) => x.tipo === 'entrada')?.ts || u.ts)}`, prox: ['intervalo', 'saida'] };
}
// horas trabalhadas: de entrada/volta até intervalo/saída (o turno aberto conta até agora)
export function horas(id, desde, ate = Date.now()) {
  let ms = 0, ini = null;
  batidas(id, desde, ate).forEach((b) => { if (b.tipo === 'entrada' || b.tipo === 'volta') ini = b.ts; else if (ini != null) { ms += b.ts - ini; ini = null; } });
  if (ini != null) ms += Math.max(0, Math.min(ate, Date.now()) - ini);
  return ms / 3600e3;
}
const hh = (h) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const inicioSemana = () => { const d = new Date(inicioDoDia()); const dw = (d.getDay() + 6) % 7; return d.getTime() - dw * 864e5; };
function bater(p, tipo) { (db.ponto ||= []).push({ id: uid('pt'), pessoa: p.id, tipo, ts: Date.now() }); if (db.ponto.length > 6000) db.ponto.splice(0, db.ponto.length - 6000); grava(); toast(`${p.nome.split(' ')[0]}: ${PONTO[tipo].toLowerCase()} às ${hora(Date.now())}`); }

// ------------------------------------------------------------------ o dia de cada pessoa
function doDia(p, desde = inicioDoDia()) {
  const vs = db.vendas.filter((v) => v.ts >= desde && !v.cancelado);
  const mesas = vs.filter((v) => v.garcom && v.garcom === p.nome);
  const vendido = r2(mesas.reduce((s, v) => s + v.total, 0)), dez = r2(mesas.reduce((s, v) => s + (v.servico || 0), 0));
  const ent = p.funcao === 'entregador' ? (db.entregadores || []).find((e) => e.id === p.entregador || e.nome === p.nome) : null;
  const ac = ent ? acertoEntregadores(desde)[ent.id] || { entregas: 0, taxas: 0, dinheiro: 0 } : null;
  const fez = (db.auditoria || []).filter((a) => a.t >= desde && String(a.quem || '').split(' · ')[0] === p.nome && ['cancelar-item', 'estorno', 'desconto', 'sangria'].includes(a.tipo));
  const cont = (tp) => fez.filter((a) => (Array.isArray(tp) ? tp.includes(a.tipo) : a.tipo === tp));
  return { mesas: mesas.length, vendido, dez, ticket: mesas.length ? r2(vendido / mesas.length) : 0, ac, fez, cancel: cont(['cancelar-item', 'estorno']), desc: cont('desconto'), sang: cont('sangria'), h: horas(p.id, desde) };
}
// o número principal da linha (o que importa para cada função)
function totalLinha(p, d) {
  if (p.funcao === 'entregador' && d.ac) return [din(d.ac.taxas), `${d.ac.entregas} ${d.ac.entregas === 1 ? 'entrega' : 'entregas'}`];
  if (d.mesas) return [din(d.dez), `10% de ${d.mesas} ${d.mesas === 1 ? 'mesa' : 'mesas'}`];
  return [hh(d.h), 'trabalhadas hoje'];
}

// ------------------------------------------------------------------ pedaços de tela
const cores = ['#3F4A2B', '#5C2029', '#1F4E5B', '#4A3B6B', '#2F5D3A', '#5A4632'];
function avatar(p, tam = '') {
  if (!p) return `<span class="eq-av ${tam}" style="background:#2E1B12" aria-hidden="true">${ico('coroa')}</span>`;
  if (p.foto) return `<img class="eq-av ${tam}" src="${t(p.foto)}" alt="" width="48" height="48">`;
  const ini = p.nome.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const c = cores[[...p.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % cores.length];
  return `<span class="eq-av ${tam}" style="background:${c}" aria-hidden="true">${t(ini)}</span>`;
}
const pilula = (s) => `<span class="eq-st ${s.st}">${t(s.rot)}</span>`;
let aba = 'equipe';
const ABAS_EQ = [['equipe', 'Equipe'], ['ponto', 'Ponto e escala'], ['dia', 'Fechamento do dia'], ['senha', 'Senha do gerente']];

function htmlEquipe() {
  const l = pessoas(), agora = l.filter((p) => situacao(p.id).st === 'trabalhando').length;
  const dez = r2(l.reduce((s, p) => s + doDia(p).dez, 0));
  return `<div class="eq-kpis"><div><small>Na equipe</small><b>${l.length}</b><span>${agora} trabalhando agora</span></div>
      <div><small>10% dos garçons hoje</small><b>${din(dez)}</b><span>até agora</span></div></div>
    <div class="cartao eq-lista-c"><div class="eq-lista-cab"><h2>Funcionários</h2><button type="button" class="bt cheio" data-acao="eq-ficha">${ico('mais2')}Adicionar</button></div>
    ${l.length ? `<ul class="eq-lista">${l.map((p) => { const d = doDia(p), [v, s] = totalLinha(p, d);
      return `<li><button type="button" class="eq-linha" data-acao="eq-ficha" data-id="${t(p.id)}">${avatar(p)}<span class="eq-nome"><b>${t(p.nome)}</b><small>${nomeFuncao(p.funcao)}${p.pinH ? '' : ' · sem PIN'}</small></span>
        ${pilula(situacao(p.id))}<span class="eq-tot"><b>${v}</b><small>${s}</small></span>${ico('dir')}</button></li>`; }).join('')}</ul>`
      : '<p class="mudo">Ninguém ainda. Adicione quem trabalha com você: cada um ganha um PIN para entrar rápido neste aparelho.</p>'}</div>
    <div class="cartao"><h2>Acesso pelo celular de cada um</h2><p class="mudo">No aparelho do restaurante, cada um entra tocando no próprio nome no topo e digitando o PIN. Para usar no próprio celular: abra a ficha da pessoa e toque em “Mandar pelo WhatsApp”, ou convide pelo e-mail.</p>
      ${CONTA && window.veltriaAbrir ? `<div class="linha-bts"><button type="button" class="bt" data-conta="convidar">${ico('mais2')}Convidar por e-mail</button><button type="button" class="bt" data-conta="equipe">${ico('ajustes')}Ver e editar os acessos</button></div>`
        : `<div class="linha-bts"><button type="button" class="bt" data-acao="pessoa-ed">${ico('mais2')}Convidar por e-mail</button></div>${(db.equipe || []).length ? `<ul class="lista-l">${db.equipe.map((p) => `<li><div class="tx"><b>${t(p.nome || p.email)}</b><small>${t(p.cargo || '')} · ${p.aceito ? 'ativo' : 'convite enviado'}</small></div><button type="button" class="bt-ico" data-acao="pessoa-ed" data-id="${t(p.id)}" aria-label="Editar o acesso de ${t(p.nome || p.email)}">${ico('ajustes')}</button></li>`).join('')}</ul>` : ''}`}</div>`;
}
const TURNOS = [['', 'Folga'], ['almoco', 'Almoço'], ['noite', 'Noite'], ['dia', 'Dia todo']];
const CURTO = { '': '—', almoco: 'Alm', noite: 'Noi', dia: 'Dia' };
const HOR_PADRAO = { almoco: ['11:00', '15:00'], noite: ['18:00', '23:00'], dia: ['11:00', '23:00'] };
const horTurnos = () => ({ ...HOR_PADRAO, ...(db.config.turnos || {}) });
const DIAS_C = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
function htmlPonto() {
  const l = pessoas(), sem = inicioSemana();
  return `<div class="cartao"><h2>Ponto de hoje</h2><p class="mudo">Cada um bate o ponto ao entrar com o PIN no botão do topo, ou aqui mesmo.</p>
    <ul class="eq-lista">${l.map((p) => { const s = situacao(p.id);
      return `<li><div class="eq-linha so">${avatar(p)}<span class="eq-nome"><b>${t(p.nome)}</b><small>${hh(horas(p.id, sem))} na semana${horas(p.id, sem) > 44 ? ' · <strong class="eq-extra">passou de 44h</strong>' : ''}</small></span>${pilula(s)}
        <span class="eq-bts">${s.prox.map((k) => `<button type="button" class="bt pq" data-acao="eq-bater" data-id="${t(p.id)}" data-t="${k}">${{ entrada: 'Entrada', intervalo: 'Intervalo', volta: 'Voltou', saida: 'Saída' }[k]}</button>`).join('')}<button type="button" class="bt pq" data-acao="eq-ajustar" data-id="${t(p.id)}" aria-label="Ajustar o ponto de ${t(p.nome)}">Ajustar</button></span></div></li>`; }).join('')}</ul></div>
  <div class="cartao"><h2>Escala da semana</h2><p class="mudo">Toque no dia para trocar: folga, almoço, noite ou dia todo.</p><p class="eq-legenda">${['almoco', 'noite', 'dia'].map((k) => `<span><b>${TURNOS.find((x) => x[0] === k)[1]}</b> ${horTurnos()[k].join('–')}</span>`).join('')}<button type="button" class="bt pq" data-acao="eq-horarios">Mudar horários</button></p>
    <div class="eq-escala-rolo"><table class="eq-escala"><thead><tr><th scope="col">Quem</th>${DIAS_C.map((d) => `<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>
    ${l.map((p) => `<tr><th scope="row">${t(p.nome.split(' ')[0])}</th>${[1, 2, 3, 4, 5, 6, 0].map((dw) => { const v = (db.escala[p.id] || [])[dw] || '';
      return `<td><button type="button" class="eq-turno ${v || 'folga'}" data-acao="eq-turno" data-id="${t(p.id)}" data-d="${dw}" aria-label="${t(p.nome)}, ${DIAS_C[(dw + 6) % 7]}: ${TURNOS.find((x) => x[0] === v)[1]}"><span class="l">${TURNOS.find((x) => x[0] === v)[1]}</span><span class="c" aria-hidden="true">${CURTO[v]}</span></button></td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div></div>`;
}
const chaveDia = () => new Date(inicioDoDia()).toISOString().slice(0, 10);
const acertado = (p) => !!(db.acertosEquipe || {})[chaveDia()]?.[p.id];
function resumoTexto(p, d) {
  const L = [`*${db.config.nome || 'Restaurante'} · ${new Date().toLocaleDateString('pt-BR')}*`, `${p.nome} (${nomeFuncao(p.funcao)})`, `Horas hoje: ${hh(d.h)}`];
  if (d.mesas) L.push(`Mesas: ${d.mesas} · vendido ${din(d.vendido)}`, `10%: ${din(d.dez)}`);
  if (d.ac) L.push(`Entregas: ${d.ac.entregas} · taxas ${din(d.ac.taxas)}`, `Dinheiro recebido dos clientes: ${din(d.ac.dinheiro)}`);
  return L.join('\n');
}
function htmlDia() {
  const l = pessoas(), ds = l.map((p) => [p, doDia(p)]);
  const fez = ds.flatMap(([p, d]) => d.fez.map((a) => [p, a])).sort((a, b) => b[1].t - a[1].t);
  const NOME = { 'cancelar-item': 'Cancelou item', estorno: 'Cancelou venda', desconto: 'Deu desconto', sangria: 'Sangria' };
  return `<div class="cartao"><h2>Fechamento de hoje por pessoa</h2><p class="mudo">O 10% de cada garçom, o acerto de cada entregador e as horas de todos. Toque em “A acertar” quando pagar.</p>
    <ul class="eq-lista">${ds.map(([p, d]) => `<li><div class="eq-linha so">${avatar(p)}<span class="eq-nome"><b>${t(p.nome)}</b><small>${nomeFuncao(p.funcao)} · ${hh(d.h)} hoje</small></span>
      ${d.mesas || d.ac ? (acertado(p) ? `<button type="button" class="eq-pago ok" data-acao="eq-acerto" data-id="${t(p.id)}">Acertado</button>` : `<button type="button" class="eq-pago" data-acao="eq-acerto" data-id="${t(p.id)}">A acertar</button>`) : ''}<span class="eq-fech">${d.mesas ? `<span><small>10%</small><b>${din(d.dez)}</b></span>` : ''}${d.ac ? `<span><small>Acerto</small><b>${din(d.ac.taxas)}</b></span>` : ''}${d.cancel.length + d.desc.length ? `<span><small>Cancel. e desc.</small><b>${d.cancel.length + d.desc.length}</b></span>` : ''}</span>
      ${p.tel ? `<a class="bt-ico" target="_blank" rel="noopener" href="${zap(p.tel, resumoTexto(p, d))}" aria-label="Mandar o fechamento para ${t(p.nome)} no WhatsApp">${ico('zap')}</a>` : ''}</div></li>`).join('')}</ul></div>
    <div class="cartao"><h2>Quem fez o quê hoje</h2>${fez.length ? `<ul class="lista-l">${fez.slice(0, 40).map(([p, a]) => `<li><div class="tx"><b>${NOME[a.tipo]} · ${din(Math.abs(a.valor || 0))}</b><small>${t(p.nome)} · ${hora(a.t)}${a.item ? ` · ${t(a.item)}` : ''}${a.motivo ? ` · ${t(a.motivo)}` : ''}${/senha do gerente/.test(a.quem || '') ? ' · com a senha do gerente' : ''}</small></div></li>`).join('')}</ul>` : '<p class="mudo">Nenhum cancelamento, desconto ou sangria hoje.</p>'}</div>`;
}
function htmlSenha() {
  const R = regras();
  return `<div class="cartao"><h2>Senha do gerente</h2><p class="mudo" style="margin-bottom:12px">Pedida para cancelar, dar desconto acima do limite de cada pessoa e trocar para o dono neste aparelho. O PIN pessoal de quem é Gerente também vale.</p>
    <div class="grade2"><label class="campo"><span>Senha (4 números)</span><input data-pin type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="${temPin() ? '••••' : 'sem senha'}"></label>
    <label class="campo"><span>Desconto sem senha até (%) para quem não escolheu nome</span><input data-lim inputmode="numeric" value="${R.limiteDesconto}"></label></div>
    <div class="linha-bts"><button type="button" class="bt cheio" data-salvar-pin>${ico('check')}Salvar</button>${temPin() ? '<button type="button" class="bt" data-tira-pin>Tirar a senha</button>' : ''}</div>
    ${temPin() ? '' : '<p class="aviso" style="margin-top:12px">Sem a senha, qualquer pessoa cancela, dá desconto e volta para o dono. Ponha uma senha.</p>'}</div>`;
}
export const telaEquipe = {
  titulo: 'Equipe',
  html(sec) {
    if (sec && ABAS_EQ.some(([k]) => k === sec)) aba = sec;
    preparar();
    const demo = !CONTA ? '<p class="eq-demo">Demonstração: os PINs são 1111 (Rafael), 2222 (Bruna), 3333 (Diego), 4444 (Dona Cida), 5555 (Marcos, gerente) e 6666 (entregadores). Senha do gerente: 1234.</p>' : '';
    return `<button type="button" class="voltar" data-ir="mais">${ico('voltar')}Gestão</button><div class="cab"><div><h1>Equipe</h1><p>Quem trabalha, o que cada um pode fazer, ponto e o fechamento do dia</p></div>
      <div class="acoes"><button type="button" class="bt" data-acao="eq-trocar">${ico('troca')}Trocar de usuário</button></div></div>${demo}
      <div class="eq-abas" role="tablist" aria-label="Partes da equipe">${ABAS_EQ.map(([k, n]) => `<button type="button" role="tab" aria-selected="${k === aba}" data-eq-aba="${k}">${n}</button>`).join('')}</div>
      <div class="eq-corpo">${{ equipe: htmlEquipe, ponto: htmlPonto, dia: htmlDia, senha: htmlSenha }[aba]()}</div>`;
  },
  montar(el) {
    $$('[data-eq-aba]', el).forEach((b) => { b.onclick = () => { aba = b.dataset.eqAba; ir(`mais/equipe/${aba}`); }; });
    $('[data-salvar-pin]', el)?.addEventListener('click', () => { const p = $('[data-pin]', el).value.trim(); if (p && !/^\d{4}$/.test(p)) return toast('A senha tem 4 números'); setRegras({ ...(p ? { pin: p } : {}), limiteDesconto: Math.max(0, Math.min(100, Math.round(num($('[data-lim]', el).value)))) }); toast('Salvo'); });
    $('[data-tira-pin]', el)?.addEventListener('click', async () => { if (await confirma('Tirar a senha do gerente? Qualquer pessoa poderá cancelar e dar desconto.', 'Tirar', true)) { setRegras({ pin: '' }); toast('Senha tirada'); } });
  },
};
acao('eq-trocar', () => trocarUsuario());
acao('eq-bater', (b) => { const p = pessoa(b.dataset.id); if (p) bater(p, b.dataset.t); });
acao('eq-acerto', (b) => {
  const p = pessoa(b.dataset.id); if (!p) return; const A = (db.acertosEquipe ||= {}), k = chaveDia(); A[k] ||= {};
  if (A[k][p.id]) delete A[k][p.id]; else A[k][p.id] = { t: Date.now(), quem: euSou() || 'Dono' };
  grava(); toast(A[k][p.id] ? `${p.nome}: acertado` : `${p.nome}: volta para a acertar`);
});
acao('eq-ajustar', (b) => {
  const p = pessoa(b.dataset.id); if (!p) return;
  const hoje = batidas(p.id, inicioDoDia());
  folha({ titulo: `Ajustar o ponto de ${p.nome}`, corpo: `<p class="mudo" style="margin-bottom:10px">Para quando esqueceu de bater. Fica marcado como ajuste.</p>
    ${hoje.length ? `<ul class="lista-l">${hoje.map((x) => `<li><div class="tx"><b>${PONTO[x.tipo]} · ${hora(x.ts)}</b>${x.ajuste ? `<small>ajuste de ${t(x.ajuste)}</small>` : ''}</div></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma batida hoje.</p>'}
    <div class="grade2" style="margin-top:12px"><label class="campo"><span>O quê</span><select data-tp>${Object.entries(PONTO).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <label class="campo"><span>Horário de hoje</span><input type="time" data-hr value="${new Date().toTimeString().slice(0, 5)}"></label></div>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Pôr no ponto</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => {
    const [H, M] = ($('[data-hr]', f).value || '').split(':').map(Number); if (!(H >= 0)) return toast('Escolha o horário');
    const ts = inicioDoDia() + (H * 60 + (M || 0)) * 60e3; if (ts > Date.now()) return toast('Esse horário ainda não chegou');
    db.ponto.push({ id: uid('pt'), pessoa: p.id, tipo: $('[data-tp]', f).value, ts, ajuste: euSou() || 'Dono' }); grava(); fechar(); toast('Ponto ajustado');
  }; } });
});
acao('eq-horarios', () => {
  const T = horTurnos();
  folha({ titulo: 'Horários dos turnos', corpo: ['almoco', 'noite', 'dia'].map((k) => `<p class="campo"><span>${TURNOS.find((x) => x[0] === k)[1]}</span></p><div class="grade2"><label class="campo"><span>Entra</span><input type="time" data-a="${k}" value="${T[k][0]}"></label><label class="campo"><span>Sai</span><input type="time" data-s="${k}" value="${T[k][1]}"></label></div>`).join(''),
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { db.config.turnos = Object.fromEntries(['almoco', 'noite', 'dia'].map((k) => [k, [$(`[data-a=${k}]`, f).value, $(`[data-s=${k}]`, f).value]])); grava(); fechar(); toast('Horários salvos'); }; } });
});
acao('eq-turno', (b) => {
  const e = (db.escala[b.dataset.id] ||= ['', '', '', '', '', '', '']), d = Number(b.dataset.d), k = TURNOS.findIndex((x) => x[0] === (e[d] || ''));
  e[d] = TURNOS[(k + 1) % TURNOS.length][0]; grava();
});

// ------------------------------------------------------------------ ficha do funcionário
function reduzirFoto(arq) {
  return new Promise((ok, falha) => {
    const img = new Image(), u = URL.createObjectURL(arq);
    img.onload = () => { const c = document.createElement('canvas'), L = 160; c.width = L; c.height = L; const e = Math.max(L / img.width, L / img.height), w = img.width * e, h = img.height * e;
      c.getContext('2d').drawImage(img, (L - w) / 2, (L - h) / 2, w, h); URL.revokeObjectURL(u); ok(c.toDataURL('image/webp', 0.8)); };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); }; img.src = u;
  });
}
const linkSistema = () => location.href.split('#')[0].split('?')[0];
acao('eq-ficha', (b) => {
  const p = b.dataset.id ? pessoa(b.dataset.id) : null;
  let funcao = p?.funcao || 'garcom', foto = p?.foto || '', perm = { ...FUNCOES[funcao].perm, ...(p?.perm || {}) }, telas = p ? p.telas : FUNCOES[funcao].telas;
  const d = p ? doDia(p) : null, sem = p ? horas(p.id, inicioSemana()) : 0;
  const permHtml = () => `<label class="eq-perm-l">Pode dar desconto até<span class="eq-pct"><input data-perm="desconto" inputmode="numeric" maxlength="3" value="${perm.desconto}" aria-label="Desconto máximo em %">%</span></label>
    <div class="campo"><span>Cancelar item ou venda</span><div class="chips quebra" role="group" aria-label="Cancelar">${[['nao', 'Não pode'], ['gerente', 'Só com o gerente'], ['sim', 'Pode sozinho']].map(([k, n]) => `<button type="button" class="chip" data-canc="${k}" aria-pressed="${perm.cancelar === k}">${n}</button>`).join('')}</div></div>
    <label class="liga">Vê o caixa e fecha contas<input type="checkbox" data-perm="caixa" ${perm.caixa ? 'checked' : ''}></label>
    <label class="liga">Faz sangria (tirar dinheiro da gaveta)<input type="checkbox" data-perm="sangria" ${perm.sangria ? 'checked' : ''}></label>
    <div class="campo"><span>Telas que aparecem neste aparelho quando ele entra</span><div class="chips quebra">${TELAS.map(([h, n]) => `<label class="chip"><input type="checkbox" data-tela value="${h}" ${!telas || telas.includes(h) ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>`;
  folha({ titulo: p ? p.nome : 'Novo funcionário', larga: true, corpo: `<div class="eq-ficha">
    <div class="eq-ficha-top"><label class="eq-foto">${avatar(p ? { ...p, foto } : { id: 'novo', nome: '?' }, 'grande')}<input type="file" accept="image/*" data-foto class="sr"><span>${foto ? 'Trocar foto' : 'Pôr foto'}</span></label>
      <div class="eq-ficha-campos"><label class="campo"><span>Nome</span><input data-nome maxlength="40" value="${t(p?.nome || '')}" placeholder="Ex.: Rafael"></label>
      <div class="grade2"><label class="campo"><span>Telefone (WhatsApp)</span><input data-tel inputmode="tel" value="${t(fone(p?.tel || ''))}" placeholder="16 99999-9999"></label>
      <label class="campo"><span>PIN pessoal (4 números)</span><input data-pinp type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="${p?.pinH ? '•••• (já tem)' : 'Ex.: 4827'}"></label></div></div></div>
    <div class="campo"><span>Função</span><div class="chips quebra" role="group" aria-label="Função">${Object.entries(FUNCOES).map(([k, f]) => `<button type="button" class="chip" data-func="${k}" aria-pressed="${k === funcao}">${f.nome}</button>`).join('')}</div><small class="mudo" data-func-desc>${FUNCOES[funcao].desc}. Escolher a função aplica o modelo de permissões; ajuste abaixo se quiser.</small></div>
    <h3 class="eq-sub">O que pode fazer</h3><div data-perms>${permHtml()}</div>
    ${p ? `<h3 class="eq-sub">Hoje e na semana</h3><div class="eq-mini-kpis"><div><small>Horas na semana</small><b>${hh(sem)}</b></div>${d.mesas ? `<div><small>Mesas hoje</small><b>${d.mesas}</b></div><div><small>Vendido</small><b>${din(d.vendido)}</b></div><div><small>10%</small><b>${din(d.dez)}</b></div>` : ''}${d.ac ? `<div><small>Entregas</small><b>${d.ac.entregas}</b></div><div><small>Acerto</small><b>${din(d.ac.taxas)}</b></div>` : ''}<div><small>Cancelamentos</small><b>${d.cancel.length}</b></div><div><small>Descontos</small><b>${d.desc.length}</b></div></div>
    <h3 class="eq-sub">Convidar</h3><div class="linha-bts">${p.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(p.tel, `Oi, ${p.nome.split(' ')[0]}! Você está na equipe do ${db.config.nome || 'restaurante'} no Popina. Para usar no seu celular, abra ${linkSistema()} e entre com o e-mail que você me passar. No aparelho do restaurante, toque no seu nome no topo e digite o seu PIN.`)}">${ico('zap')}Mandar pelo WhatsApp</a>` : ''}
      <button type="button" class="bt" data-link>${ico('link')}Copiar o link</button>${CONTA && window.veltriaAbrir ? `<button type="button" class="bt" data-conta="convidar">${ico('mais2')}Acesso por e-mail</button>` : ''}</div>
    <button type="button" class="bt perigo" data-tirar style="margin-top:18px">Tirar da equipe</button>` : ''}</div>`,
  pe: `<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>${ico('check')}Salvar</button>`,
  aoAbrir: (f, fechar) => {
    const lerPerm = () => { perm.desconto = Math.max(0, Math.min(100, Math.round(num($('[data-perm=desconto]', f).value)))); perm.caixa = $('[data-perm=caixa]', f).checked; perm.sangria = $('[data-perm=sangria]', f).checked;
      const sel = $$('[data-tela]:checked', f).map((i) => i.value); telas = sel.length === TELAS.length ? null : sel; };
    const ligar = () => { $$('[data-canc]', f).forEach((x) => { x.onclick = () => { perm.cancelar = x.dataset.canc; $$('[data-canc]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); }; }); };
    ligar();
    $$('[data-func]', f).forEach((x) => { x.onclick = () => { funcao = x.dataset.func; $$('[data-func]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); perm = { ...FUNCOES[funcao].perm }; telas = FUNCOES[funcao].telas;
      $('[data-perms]', f).innerHTML = permHtml(); ligar(); $('[data-func-desc]', f).textContent = `${FUNCOES[funcao].desc}. Modelo aplicado; ajuste abaixo se quiser.`; }; });
    $('[data-foto]', f).onchange = async (e) => { const a = e.target.files?.[0]; if (!a) return; try { foto = await reduzirFoto(a); const av = $('.eq-foto .eq-av', f); av.outerHTML = `<img class="eq-av grande" src="${foto}" alt="" width="96" height="96">`; } catch { toast('Não deu para abrir a foto'); } };
    $('[data-link]', f)?.addEventListener('click', () => navigator.clipboard?.writeText(linkSistema()).then(() => toast('Link copiado'), () => toast('Não deu para copiar')));
    $('[data-tirar]', f)?.addEventListener('click', async () => { if (!(await confirma(`Tirar ${p.nome} da equipe? O ponto e as vendas antigas continuam nos relatórios.`, 'Tirar', true))) return; p.ativo = false; if (atual() === p) entrar(null); grava(); fechar(); toast('Tirado da equipe'); });
    $('[data-ok]', f).onclick = () => {
      const nome = $('[data-nome]', f).value.trim(); if (!nome) return toast('Escreva o nome');
      if ((db.funcionarios || []).some((x) => x !== p && x.ativo !== false && x.nome.toLowerCase() === nome.toLowerCase())) return toast('Já tem alguém com esse nome');
      const pin = $('[data-pinp]', f).value.trim(); if (pin && !/^\d{4}$/.test(pin)) return toast('O PIN tem 4 números');
      if (pin && (db.funcionarios || []).some((x) => x !== p && x.ativo !== false && x.pinH === resumoPin(pin))) return toast('Esse PIN já é de outra pessoa. Escolha outro.');
      lerPerm();
      const antes = p?.nome, dados = { nome, funcao, tel: soDig($('[data-tel]', f).value), foto, perm: { ...perm }, telas, ...(pin ? { pinH: resumoPin(pin) } : {}) };
      let q = p; if (q) Object.assign(q, dados); else { q = { id: uid('f'), pinH: '', ativo: true, criado: Date.now(), ...dados }; db.funcionarios.push(q); }
      // mantém as listas antigas em dia (garçons do salão e entregadores do delivery)
      const g = (db.config.garcons ||= []);
      if (antes && antes !== nome) { const k = g.indexOf(antes); if (k >= 0) g[k] = nome; }
      if (['garcom', 'gerente', 'caixa'].includes(funcao) && !g.includes(nome)) g.push(nome);
      if (funcao === 'entregador') { let e = (db.entregadores || []).find((x) => x.id === q.entregador || x.nome === (antes || nome)); if (!e) { e = { id: uid('e'), nome, tel: q.tel }; db.entregadores.push(e); } else Object.assign(e, { nome, tel: q.tel || e.tel }); q.entregador = e.id; }
      grava(); fechar(); toast(p ? 'Salvo' : `${nome} entrou na equipe`);
    };
  } });
});

// ------------------------------------------------------------------ trocar de usuário com o PIN
export function trocarUsuario(depois) {
  const l = pessoas(), cur = atual();
  if (!l.length) return ir('mais/equipe');
  let escolhido;
  folha({ titulo: 'Quem está usando?', corpo: `<div data-passo1><div class="eq-grade">${l.map((p) => `<button type="button" class="eq-quem-bt" data-p="${t(p.id)}" aria-pressed="${p === cur}">${avatar(p, 'grande')}<b>${t(p.nome.length <= 12 ? p.nome : p.nome.split(' ')[0])}</b><small>${nomeFuncao(p.funcao)}</small></button>`).join('')}
      <button type="button" class="eq-quem-bt" data-p="" aria-pressed="${!cur}">${avatar(null, 'grande')}<b>Dono</b><small>${temPin() ? 'Pede a senha' : 'Vê tudo'}</small></button></div></div>
    <div data-passo2 hidden><p class="eq-ola" data-ola></p><label class="campo"><span data-rot-pin>PIN</span><input data-pin type="password" inputmode="numeric" maxlength="4" autocomplete="off" class="eq-pin-in" aria-label="PIN de 4 números"></label>
      <div class="eq-teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => (k === '' ? '<span></span>' : `<button type="button" data-k="${k}" aria-label="${k === '⌫' ? 'Apagar' : k}">${k}</button>`)).join('')}</div></div>
    <div data-passo3 hidden></div>`,
  aoAbrir: (f, fechar) => {
    const pin = $('[data-pin]', f);
    const pronto = (p) => {
      entrar(p);
      if (!p) { fechar(); toast('Você está como dono'); depois?.(''); return; }
      const s = situacao(p.id);
      $('[data-passo2]', f).hidden = true; $('[data-passo1]', f).hidden = true; const p3 = $('[data-passo3]', f); p3.hidden = false;
      p3.innerHTML = `<div class="eq-ola-cx">${avatar(p, 'grande')}<div><b>Olá, ${t(p.nome.split(' ')[0])}!</b><small>${t(s.rot)} · ${hh(horas(p.id, inicioSemana()))} na semana</small></div></div>
        <div class="linha-bts eq-ponto-bts">${s.prox.map((k) => `<button type="button" class="bt ${k === 'entrada' ? 'cheio' : ''} grande" data-bate="${k}">${ico('relogio')}${{ entrada: 'Bater entrada', intervalo: 'Sair para o intervalo', volta: 'Voltar do intervalo', saida: 'Bater saída' }[k]}</button>`).join('')}
        <button type="button" class="bt grande" data-seguir>Continuar sem bater</button></div>`;
      $$('[data-bate]', p3).forEach((b) => { b.onclick = () => { bater(p, b.dataset.bate); fechar(); depois?.(p.nome); }; });
      $('[data-seguir]', p3).onclick = () => { fechar(); depois?.(p.nome); };
    };
    const conferir = () => {
      const v = pin.value; if (v.length < 4) return;
      const ok = escolhido ? escolhido.pinH === resumoPin(v) : v === regras().pin || pinDeGerente(v);
      if (ok) pronto(escolhido); else { toast(escolhido ? 'PIN errado' : 'Senha errada'); pin.value = ''; pin.focus(); }
    };
    $$('[data-p]', f).forEach((b) => { b.onclick = () => {
      escolhido = b.dataset.p ? pessoa(b.dataset.p) : null;
      const precisa = escolhido ? !!escolhido.pinH : temPin();
      if (!precisa) return pronto(escolhido);
      $('[data-passo1]', f).hidden = true; $('[data-passo2]', f).hidden = false;
      $('[data-ola]', f).innerHTML = escolhido ? `${avatar(escolhido)} <b>${t(escolhido.nome)}</b>` : `${avatar(null)} <b>Dono</b>`;
      $('[data-rot-pin]', f).textContent = escolhido ? 'Digite o seu PIN' : 'Senha do gerente ou PIN de gerente'; pin.value = ''; pin.focus();
    }; });
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); conferir(); });
    $$('[data-k]', f).forEach((b) => { b.onclick = () => { pin.value = b.dataset.k === '⌫' ? pin.value.slice(0, -1) : (pin.value + b.dataset.k).slice(0, 4); conferir(); }; });
  } });
}

// convite por e-mail da demonstração (na conta real abre o fluxo de conta-nuvem.js)
const CARGOS = Object.values(FUNCOES).map((f) => f.nome);
acao('pessoa-ed', (b) => {
  const p = b.dataset.id ? (db.equipe || []).find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: p ? p.email : 'Convidar por e-mail', corpo: `<label class="campo"><span>E-mail da pessoa</span><input data-email type="email" value="${t(p?.email || '')}" ${p ? 'readonly' : ''}></label>
    <label class="campo"><span>Nome</span><input data-nome value="${t(p?.nome || '')}"></label>
    <p class="campo"><span>Cargo</span></p><div class="chips quebra">${CARGOS.map((c) => `<button type="button" class="chip" data-cargo="${c}" aria-pressed="${p?.cargo === c}">${c}</button>`).join('')}</div>
    <p class="campo" style="margin-top:12px"><span>Telas que vê</span></p><div class="chips quebra">${TELAS.map(([h, n]) => `<label class="chip"><input type="checkbox" value="${h}" ${!p?.telas || p.telas.includes(h) ? 'checked' : ''}> ${n}</label>`).join('')}</div>
    <label class="liga" style="margin-top:12px">Só ver, sem alterar nada<input type="checkbox" data-sover ${p?.soVer ? 'checked' : ''}></label>
    ${p ? '<button type="button" class="bt perigo" data-apagar style="margin-top:12px">Tirar o acesso</button>' : '<p class="mudo" style="margin-top:12px">Na demonstração, o convite não sai por e-mail.</p>'}`,
  pe: `<button type="button" class="bt cheio grande" data-ok>${p ? 'Salvar' : 'Mandar convite'}</button>`,
  aoAbrir: (f, fechar) => {
    $$('[data-cargo]', f).forEach((x) => { x.onclick = () => $$('[data-cargo]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Tirar o acesso de ${p.email}?`, 'Tirar', true)) { db.equipe = db.equipe.filter((x) => x !== p); grava(); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const email = $('[data-email]', f).value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Confira o e-mail');
      const sel = $$('.chip input:checked', f).map((i) => i.value);
      const d = { nome: $('[data-nome]', f).value.trim(), cargo: $('[data-cargo][aria-pressed=true]', f)?.dataset.cargo || 'Equipe', telas: sel.length === TELAS.length ? null : sel, soVer: $('[data-sover]', f).checked };
      if (p) Object.assign(p, d); else (db.equipe ||= []).push({ id: uid('p'), email, aceito: false, ...d });
      grava(); fechar(); toast(p ? 'Salvo' : 'Convite criado');
    };
  } });
});

// Veltria Agenda Essencial · app de celular de quem atende com hora marcada (beleza, barbearia, consultório, aulas,
// pet, serviços em casa...). O tipo de negócio troca a lista de serviços; o resto é igual para todos.
// O dia de trabalho num relógio (8h às 20h, uma volta), horários com sinal por PIX, confirmação no WhatsApp,
// link para a cliente marcar sozinha, lista de espera para encaixe, fichas com retorno sugerido, caixa,
// assistente, painel do dono, configurações e assinatura. Dados de exemplo neste aparelho (?novo recomeça).

const CHAVE = 'veltria-agenda-essencial-v3';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const hh = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const data = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d; };
const pad = (n) => String(n).padStart(2, '0');
const iso = (o) => { const d = data(o); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const deIso = (v) => { const [y, m, d] = String(v).split('-').map(Number); if (!y || !m || !d) return null; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - h) / 864e5); };
// aceita 9, 9:10, 9h10, 910, 14:45, 1445
const lerHora = (v) => { const m = String(v || '').trim().toLowerCase().replace(/\s/g, '').replace(/h/, ':').match(/^(\d{1,2})(?::?(\d{2}))?:?$/); if (!m) return null; const h = +m[1], mi = +(m[2] || 0); return h < 24 && mi < 60 ? h + mi / 60 : null; };
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeDia = (o) => (o === 0 ? 'hoje' : o === 1 ? 'amanhã' : o === -1 ? 'ontem' : data(o).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }));
// link de agendamento da bio: o da empresa no modo conta (conta-nuvem.js expõe veltriaConta), o de exemplo na demonstração
const LINK = `https://bluerose-store.com/agendar/?e=${window.veltriaConta ? window.veltriaConta.espaco : 'demo'}`;
const zap = (tel, m) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);

// tipos de negócio: cada um preenche os 6 serviços (nome, minutos, preço, cor, dias para voltar)
const COR = ['#c69c9a', '#8c99b0', '#9a6d6b', '#323d5c', '#4f7d68', '#c9a46a'];
const mod = (nome, l) => ({ nome, servicos: l.map(([n, min, preco, ret], i) => ({ id: 's' + (i + 1), nome: n, min, preco, cor: COR[i], retorno: ret })) });
const MODELOS = {
  geral: mod('Atendimento geral', [['Atendimento 30 min', 30, 80, 30], ['Atendimento 1 hora', 60, 140, 30], ['Avaliação', 45, 120, 60], ['Sessão longa', 120, 260, 30], ['Retorno', 40, 90, 21], ['Visita em domicílio', 60, 160, 30]]),
  beleza: mod('Salão e unhas', [['Manicure', 45, 35, 10], ['Pedicure', 50, 40, 15], ['Mão e pé', 90, 70, 12], ['Alongamento em gel', 120, 160, 21], ['Manutenção do gel', 90, 110, 21], ['Spa dos pés', 60, 75, 30]]),
  barbearia: mod('Barbearia', [['Corte', 30, 45, 20], ['Barba', 30, 35, 15], ['Corte e barba', 50, 70, 20], ['Pigmentação', 40, 50, 30], ['Sobrancelha', 15, 20, 20], ['Platinado', 120, 180, 40]]),
  saude: mod('Consultório e terapias', [['Consulta', 50, 200, 30], ['Retorno', 30, 120, 30], ['Avaliação inicial', 60, 250, 90], ['Sessão de terapia', 50, 180, 7], ['Atendimento online', 50, 160, 7], ['Pacote 4 sessões', 50, 600, 30]]),
  aulas: mod('Aulas e personal', [['Aula individual', 60, 90, 7], ['Aula dupla', 60, 140, 7], ['Aula experimental', 30, 0, 7], ['Treino personal', 60, 110, 3], ['Avaliação física', 45, 120, 90], ['Aula online', 50, 70, 7]]),
  pet: mod('Pet', [['Banho pequeno porte', 60, 55, 15], ['Banho e tosa', 90, 95, 30], ['Tosa higiênica', 40, 45, 30], ['Banho grande porte', 90, 90, 15], ['Hidratação', 30, 40, 30], ['Consulta veterinária', 30, 150, 180]]),
  casa: mod('Serviços em casa', [['Visita técnica', 60, 90, 180], ['Instalação', 120, 220, 365], ['Manutenção', 90, 160, 180], ['Limpeza', 240, 280, 30], ['Orçamento no local', 40, 0, 365], ['Diária', 480, 350, 30]])
};
function inicial() {
  const servicos = MODELOS.geral.servicos.map((x) => ({ ...x }));
  const clientes = [['Carla Menezes', '31988870011', -12, 's3', 0], ['Bruno Rocha', '31988870012', -21, 's5', 0, 180], ['Fernanda Lima', '31988870013', -9, 's1', 1], ['Juliano Prado', '31988870014', -30, 's4', 0], ['Patrícia Souza', '31988870015', -15, 's2', 2], ['Renata Alves', '31988870016', -26, 's5', 0], ['Sueli Martins', '31988870017', -40, 's6', 0, 90], ['Tainá Ribeiro', '31988870018', -6, 's1', 0], ['Vanessa Costa', '31988870019', -18, 's3', 0], ['Diego Freitas', '31988870023', -24, 's1', 0], ['Kelly Antunes', '31988870024', -19, 's3', 1], ['Rose Matos', '31988870025', -35, 's5', 0], ['Aline Prates', '31988870026', -4, 's1', 0]]
    .map(([nome, tel, ultima, serv, faltas, valor]) => ({ id: uid(), nome, tel, ultima, serv, faltas, valor: valor || null }));
  const c = (n) => clientes.find((x) => x.nome.startsWith(n));
  // horários "picados" de propósito (8:40, 10:20, 15:50...): a agenda aceita qualquer minuto
  const ags = [[0, 8 + 40 / 60, 'Carla', 's3', 'feito', 120], [0, 10 + 20 / 60, 'Bruno', 's5', 'confirmado'], [0, 12, 'Tainá', 's1', 'confirmado'], [0, 14, 'Juliano', 's4', 'marcado', 0, 50], [0, 15 + 50 / 60, 'Patrícia', 's2', 'marcado'], [0, 17.5, 'Vanessa', 's3', 'confirmado'], [1, 9, 'Renata', 's5', 'confirmado'], [1, 11 + 10 / 60, 'Fernanda', 's1', 'marcado'], [1, 15, 'Sueli', 's6', 'marcado', 0, 25], [2, 10, 'Carla', 's1', 'marcado'], [2, 13.5, 'Juliano', 's5', 'marcado'], [3, 9.5, 'Bruno', 's3', 'marcado'], [4, 14, 'Tainá', 's4', 'marcado', 0, 50], [-1, 9, 'Fernanda', 's3', 'faltou'], [-1, 13, 'Renata', 's1', 'feito', 80], [-1, 15, 'Sueli', 's2', 'feito', 90]]
    .map(([dia, ini, cli, serv, st, pago = 0, sinal = 0]) => { const k = c(cli); return { id: uid(), dia, ini, cli: k.id, serv, st, pago, valor: k.valor, sinal: sinal ? { valor: sinal, pago: sinal === 25 } : null }; });
  // histórico de exemplo (13 meses, de segunda a sábado) para o Resumo do mês e do ano; cada cliente só aparece antes da última visita dele
  let sem = 7; const rnd = () => { sem = (sem * 9301 + 49297) % 233280; return sem / 233280; };
  for (let o = -2; o >= -400; o--) {
    const dw = data(o).getDay(); if (dw === 0) continue;
    const pode = clientes.filter((k) => k.ultima >= o), n = dw === 6 ? 5 : 2 + Math.floor(rnd() * 3); let h = 8 + Math.floor(rnd() * 3) / 2;
    for (let i = 0; i < n && pode.length && h < 19; i++) {
      const k = pode[Math.floor(rnd() * pode.length)], sv = servicos[Math.floor(rnd() * 5)], falta = rnd() < 0.06, v = k.valor ?? sv.preco;
      ags.push({ id: `h${-o}_${i}`, dia: o, ini: h, cli: k.id, serv: sv.id, st: falta ? 'faltou' : 'feito', pago: falta ? 0 : v, valor: k.valor, sinal: null, forma: falta ? null : ['PIX', 'PIX', 'Dinheiro', 'Cartão'][Math.floor(rnd() * 4)] });
      h += Math.ceil(sv.min / 30) / 2 + (rnd() < 0.35 ? 0.5 : 0);
    }
  }
  return { studio: 'Espaço Lia Santos', pro: 'Lia Santos', ramo: 'atendimento com hora marcada', tipo: 'geral', passo: 15, pix: '31988870000', abre: 8, fecha: 20, sinalPct: 30, sinalAcima: 100, servicos, clientes, ags, espera: [{ id: uid(), nome: 'Marina Duarte', tel: '31988870020', quer: 'Atendimento 1 hora', quando: 'qualquer tarde' }, { id: uid(), nome: 'Lúcio Faria', tel: '31988870021', quer: 'Avaliação', quando: 'sábado de manhã' }], pedidos: [{ id: uid(), nome: 'Gabriela Nunes', tel: '31988870022', serv: 's4', dia: 2, ini: 15.5 }], plano: 'basico', ajudantes: [{ nome: 'Camila (ajudante)', ve: { agenda: true, valores: false, clientes: true } }], assinatura: { valor: 49, status: 'ativa', renova: true, proxima: 9, pagos: [-21, -51, -81] }, conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || inicial(); } catch { return inicial(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { toast('Sem espaço no celular.'); } };
const serv = (id) => db.servicos.find((s) => s.id === id) || db.servicos[0];
const cli = (id) => db.clientes.find((c) => c.id === id) || { nome: '—', tel: '' };
const doDia = (d) => db.ags.filter((a) => a.dia === d && a.st !== 'cancelado').sort((a, b) => a.ini - b.ini);
const fim = (a) => a.ini + serv(a.serv).min / 60;
const preco = (a) => (a.valor != null && a.valor !== '' ? Number(a.valor) : serv(a.serv).preco); // valor combinado vale mais que o da tabela
const ST = { marcado: ['marcado', ''], confirmado: ['confirmou', 'ok'], feito: ['atendido', 'ok'], faltou: ['faltou', 'ru'] };
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima em ${a.proxima} dias` : `cancelada · usa por mais ${a.proxima} dias`; };
const RASC = () => ({ serv: db.servicos[0]?.id || 's1', cli: '', tel: '', dia: 0, ini: null, sinal: false, valor: '', remarca: null });
let dia = 0, rasc = RASC(), res = { modo: 'dia', d: 0, m: 0, a: 0 };
// guarda o que já foi digitado no Novo horário antes de redesenhar a tela
const guarda = () => { const g = (id) => document.getElementById(id); if (g('cli-n')) rasc.cli = g('cli-n').value; if (g('tel-n')) rasc.tel = g('tel-n').value; if (g('valor-n')) rasc.valor = g('valor-n').value; if (g('sinal')) rasc.sinal = g('sinal').checked; };

function toast(m) { const a = document.createElement('div'); a.className = 'toast'; a.textContent = m; $('#toasts').append(a); setTimeout(() => a.remove(), 3200); }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('input, select') || v.querySelector('button'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
}
// horários livres do dia para um serviço, no intervalo escolhido em Configurações; dá para digitar qualquer minuto
const ocupado = (d, h, min, menos) => doDia(d).find((a) => a.id !== menos && a.st !== 'faltou' && h < fim(a) - 1e-6 && h + min / 60 > a.ini + 1e-6);
function livres(d, min, menos) { const l = [], p = (db.passo || 30) / 60; for (let h = db.abre; h + min / 60 <= db.fecha + 1e-6; h = Math.round((h + p) * 60) / 60) { if (!ocupado(d, h, min, menos)) l.push(h); } return l; }

// ------------------------------------------------------------------ o relógio
const ang = (h) => ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
const pt = (r, a) => [160 + r * Math.cos(a), 160 + r * Math.sin(a)].map((n) => n.toFixed(2));
function fatia(h1, h2, r1, r2) { const a1 = ang(h1), a2 = ang(h2 - 0.001), g = h2 - h1 > 6 ? 1 : 0; const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1); return `M${x1} ${y1}A${r2} ${r2} 0 ${g} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${g} 0 ${x4} ${y4}Z`; }
function relogio(d) {
  const l = doDia(d), agora = new Date(), hA = agora.getHours() + agora.getMinutes() / 60, prox = l.find((a) => d > 0 || (d === 0 && a.ini >= hA - 0.25 && a.st !== 'feito')) || null, prev = l.reduce((s, a) => s + preco(a), 0);
  const marcas = Array.from({ length: 12 }, (_, i) => { const h = db.abre + i, [x, y] = pt(146, ang(h)), [a1, b1] = pt(100, ang(h)), [a2, b2] = pt(106, ang(h)); return `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="#d6c5b8" stroke-width="2"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Outfit" font-size="12" fill="#8a8d99">${h}h</text>`; }).join('');
  const arcos = l.map((a) => `<path class="arco" data-ag="${a.id}" d="${fatia(a.ini, fim(a), 108, 136)}" fill="${serv(a.serv).cor}" opacity="${a.st === 'faltou' ? 0.3 : a.st === 'feito' ? 0.55 : 1}" stroke="#f5eee7" stroke-width="2"><title>${hh(a.ini)} ${t(cli(a.cli).nome)} · ${t(serv(a.serv).nome)}</title></path>`).join('');
  const ponteiro = d === 0 && hA >= db.abre && hA <= db.fecha ? (() => { const [x, y] = pt(140, ang(hA)), [x0, y0] = pt(98, ang(hA)); return `<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="#242d46" stroke-width="3" stroke-linecap="round"/><circle cx="${x0}" cy="${y0}" r="4" fill="#242d46"/>`; })() : '';
  return `<div class="relogio"><svg viewBox="0 0 320 320" role="img" aria-label="Relógio do dia com ${l.length} atendimentos"><circle cx="160" cy="160" r="152" fill="#fbf7f3" stroke="#e6dbd1"/><circle cx="160" cy="160" r="122" fill="none" stroke="#ece2d8" stroke-width="28"/>${marcas}${arcos}${ponteiro}</svg>
    <div class="centro">${prox ? `<small>próxima</small><b>${hh(prox.ini)}</b><span>${t(cli(prox.cli).nome.split(' ')[0])} · ${t(serv(prox.serv).nome)}</span>` : l.length ? '<small>dia encerrado</small><b>✓</b>' : '<small>dia livre</small><b>—</b>'}<span style="margin-top:4px">${l.length} horário(s) · ${din(prev)}</span></div></div>`;
}

// ------------------------------------------------------------------ telas
const T = {
  dia() {
    const l = doDia(dia), usados = [...new Set(l.map((a) => a.serv))];
    return `<div class="dias" role="group" aria-label="Escolher o dia">${Array.from({ length: 8 }, (_, i) => i - 1).map((o) => `<button type="button" data-dia="${o}" aria-pressed="${o === dia}"><small>${data(o).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${data(o).getDate()}</b>${doDia(o).length ? '<i></i>' : ''}</button>`).join('')}</div>
      <div class="ir-data"><label>Ir para outra data<input type="date" id="ir-dia" value="${iso(dia)}"></label>${dia !== 0 ? '<button type="button" class="bt pq" data-dia="0">Hoje</button>' : ''}</div>
      ${relogio(dia)}<div class="legenda-c">${usados.map((s) => `<span style="--c:${serv(s).cor}">${t(serv(s).nome)}</span>`).join('')}</div>
      <div class="tit-linha"><h2>${nomeDia(dia)[0].toUpperCase() + nomeDia(dia).slice(1)}${Math.abs(dia) > 1 ? ` · ${data(dia).toLocaleDateString('pt-BR')}` : ''}</h2><a class="bt pq" href="#resumo" data-res-dia="${dia}">Resumo do dia</a></div><div class="cartao">${l.map((a) => { const c = cli(a.cli), s = serv(a.serv); return `<div class="hora" data-ag="${a.id}" role="button" tabindex="0" style="position:relative"><span class="h">${hh(a.ini)}</span><span><b>${t(c.nome)}</b><small>${t(s.nome)} · ${s.min} min · ${din(preco(a))}${a.sinal ? ` · sinal ${din(a.sinal.valor)} ${a.sinal.pago ? 'pago' : 'pendente'}` : ''}</small></span><span class="selo ${ST[a.st][1]}">${ST[a.st][0]}</span></div>`; }).join('') || `<p class="livre">Nenhum horário neste dia. ${dia >= 0 ? `<button type="button" class="bt pq" data-novo-dia="${dia}">Marcar neste dia</button>` : ''}</p>`}</div>
      ${dia >= 0 && db.espera.length ? `<div class="cartao"><b>${db.espera.length} cliente(s) na lista de espera</b><p class="mini" style="margin:2px 0 8px">Se alguém desmarcar, ofereça o horário a quem está esperando.</p><a class="bt pq" href="#espera">Ver a lista</a></div>` : ''}`;
  },
  novo() {
    const s = serv(rasc.serv), h = livres(rasc.dia, s.min, rasc.remarca), k = db.clientes.find((x) => sa(x.nome) === sa(rasc.cli)), val = rasc.valor !== '' ? Number(rasc.valor) : k?.valor ?? s.preco, pede = val >= db.sinalAcima;
    const digitado = rasc.ini !== null && !h.some((x) => Math.abs(x - rasc.ini) < 1e-6), velho = rasc.remarca && db.ags.find((a) => a.id === rasc.remarca);
    const chips = [...new Set([0, 1, 2, 3, 4, 5, rasc.dia])].sort((a, b) => a - b);
    return `<h1>${velho ? 'Remarcar horário' : 'Novo horário'}</h1>${velho ? `<p class="cartao" style="padding:8px 12px">Remarcando ${t(cli(velho.cli).nome)}: era ${nomeDia(velho.dia).split(',')[0]} às ${hh(velho.ini)}. <button type="button" class="bt pq" data-acao="sem-remarcar">Desistir</button></p>` : ''}
      <ol class="passos"><li>Serviço</li><li>Cliente</li><li>Dia</li><li>Horário</li></ol>
      <div class="servicos">${db.servicos.map((x) => `<button type="button" data-serv="${x.id}" aria-pressed="${x.id === rasc.serv}" style="--c:${x.cor}"><span><b>${t(x.nome)}</b><small>${x.min} min</small></span><span>${din(x.preco)}</span></button>`).join('')}</div>
      <label class="campo">Cliente<input id="cli-n" list="lista-cli" value="${t(rasc.cli)}" placeholder="Escreva ou escolha da lista" autocomplete="off"><datalist id="lista-cli">${db.clientes.map((c) => `<option value="${t(c.nome)}">`).join('')}</datalist></label>
      <label class="campo">WhatsApp do cliente (opcional, para confirmar)<input id="tel-n" inputmode="tel" value="${t(rasc.tel || k?.tel || '')}" placeholder="(31) 98888-7777"></label>
      <div class="chips">${chips.map((o) => `<button type="button" data-ndia="${o}" aria-pressed="${o === rasc.dia}">${o > 5 || o < 0 ? data(o).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : nomeDia(o).split(',')[0]}</button>`).join('')}</div>
      <label class="campo">Ou escolha qualquer dia no calendário<input type="date" id="nd-data" value="${iso(rasc.dia)}"></label>
      ${rasc.dia < 0 ? '<p class="mini" style="margin:-6px 0 10px">Esse dia já passou: serve para anotar um atendimento que você esqueceu de marcar.</p>' : ''}
      <div class="horarios">${h.map((x) => `<button type="button" data-hr="${x}" aria-pressed="${Math.abs(x - (rasc.ini ?? -1)) < 1e-6}">${hh(x)}</button>`).join('') || '<p class="livre">Sem horário livre neste dia para esse serviço.</p>'}</div>
      <label class="campo">Ou digite o horário (qualquer minuto)<input id="hr-livre" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="Ex.: 9:10 ou 14:45" value="${digitado ? hh(rasc.ini) : ''}"></label>
      <p class="mini" id="aviso-hr" style="margin:-6px 0 10px">${aviso()}</p>
      <label class="campo">Valor deste atendimento (opcional)<input id="valor-n" type="number" inputmode="decimal" min="0" step="0.01" value="${t(rasc.valor)}" placeholder="${k?.valor != null ? `${din(k.valor)} (combinado com ${t(k.nome.split(' ')[0])})` : `${din(s.preco)} (preço do serviço)`}"></label>
      <label class="troca"><span>Pedir sinal de ${din(val * db.sinalPct / 100)} no PIX<br><small class="mini">${pede ? 'Recomendado: serviço acima de ' + din(db.sinalAcima) : 'Opcional'}</small></span><input type="checkbox" id="sinal" ${rasc.sinal || pede ? 'checked' : ''}></label>
      <button type="button" class="bt cheio largo" id="marcar-bt" data-acao="marcar" ${rasc.ini === null ? 'disabled' : ''}>${rotuloMarcar()}</button>`;
  },
  clientes() {
    const l = db.clientes.map((c) => ({ ...c, s: serv(c.serv), atraso: -c.ultima - serv(c.serv).retorno, marcada: db.ags.some((a) => a.cli === c.id && a.dia >= 0 && a.st !== 'cancelado') })).sort((a, b) => (b.atraso > 0 && !b.marcada) - (a.atraso > 0 && !a.marcada) || b.atraso - a.atraso);
    const chamar = l.filter((c) => c.ultima && c.atraso >= 0 && !c.marcada);
    return `<h1>Clientes</h1><p class="sub">${db.clientes.length} clientes. ${chamar.length ? `${chamar.length} já passaram do tempo de voltar e não têm horário marcado (aparecem primeiro).` : 'Todos em dia.'}</p><input type="search" id="busca-cli" class="busca" placeholder="Procurar cliente pelo nome" aria-label="Procurar cliente"><button type="button" class="bt cheio largo" data-acao="add-cliente" style="margin-bottom:12px">+ Adicionar cliente</button>
      ${l.map((c) => `<div class="cartao" data-nome-cli="${t(sa(c.nome))}"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${t(c.nome)}</b><small class="mini" style="display:block">${c.ultima ? `${t(c.s.nome)} há ${-c.ultima} dias · volta a cada ${c.s.retorno} dias` : 'cliente novo'}${c.valor != null ? ` · paga ${din(c.valor)}` : ''}${c.faltas ? ` · ${c.faltas} falta(s)` : ''}</small></div>${c.marcada ? '<span class="selo ok">tem horário</span>' : !c.ultima ? '<span class="selo">novo</span>' : c.atraso >= 0 ? '<span class="selo rs">hora de chamar</span>' : `<span class="selo">em ${-c.atraso} dias</span>`}</div>
        <div class="linha">${c.ultima && !c.marcada && c.atraso >= 0 && c.tel ? `<a class="bt pq rose" target="_blank" rel="noopener" href="${zap(c.tel, `Oi, ${c.nome.split(' ')[0]}! Aqui é ${db.pro.split(' ')[0]}. Já faz ${-c.ultima} dias do seu último atendimento (${c.s.nome.toLowerCase()}). Vamos marcar o próximo? Escolha o horário aqui: ${LINK}`)}">Chamar no WhatsApp</a>` : ''}<button type="button" class="bt pq" data-marca-cli="${c.id}">Marcar horário</button><button type="button" class="bt pq" data-edita-cli="${c.id}">Editar</button></div></div>`).join('')}`;
  },
  link() {
    return `<h1>Seu link de agendamento</h1><p class="sub">Coloque na bio do Instagram ou no Google. O cliente escolhe serviço e horário; você só aprova.</p>
      <div class="linha" style="margin-bottom:14px"><button type="button" class="bt cheio" data-acao="copiar">Copiar link</button><a class="bt" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Marque seu horário comigo por aqui: ${LINK}`)}">Mandar no WhatsApp</a></div>
      ${db.pedidos.length ? `<h2>Pedidos que chegaram</h2>${db.pedidos.map((p) => `<div class="cartao"><b>${t(p.nome)}</b><small class="mini" style="display:block">${t(serv(p.serv).nome)} · ${nomeDia(p.dia)} às ${hh(p.ini)}</small><div class="linha"><button type="button" class="bt pq cheio" data-acao="aceitar" data-p="${p.id}">Aceitar</button><button type="button" class="bt pq" data-acao="recusar" data-p="${p.id}">Sugerir outro horário</button></div></div>`).join('')}` : ''}
      <h2>O que o cliente vê</h2><div class="vitrine"><header><b>${t(db.studio)}</b><small>${t(db.pro)} · ${t(db.ramo)}</small></header><div class="corpo">${db.servicos.slice(0, 4).map((s) => `<div class="hora" style="cursor:default"><span class="h" style="font-size:.9rem">${s.min}′</span><span><b>${t(s.nome)}</b><small>${livres(1, s.min).slice(0, 3).map(hh).join(' · ')} amanhã</small></span><span>${din(s.preco)}</span></div>`).join('')}<p class="mini">Serviço acima de ${din(db.sinalAcima)} pede sinal de ${db.sinalPct}% no PIX para garantir o horário.</p></div></div>`;
  },
  espera() {
    return `<a href="#dia">← Dia</a><h1>Lista de espera</h1><p class="sub">Quem quer um encaixe. Quando alguém desmarca, ofereça o horário por aqui.</p>${db.espera.map((e) => `<div class="cartao"><b>${t(e.nome)}</b><small class="mini" style="display:block">${t(e.quer)} · ${t(e.quando)}</small><div class="linha"><a class="bt pq rose" target="_blank" rel="noopener" href="${zap(e.tel, `Oi, ${e.nome.split(' ')[0]}! Abriu um horário para ${e.quer.toLowerCase()}. Quer? Responde aqui que eu reservo.`)}">Oferecer horário</a><button type="button" class="bt pq" data-acao="tira-espera" data-e="${e.id}">Já marcou</button></div></div>`).join('') || '<p class="livre">Ninguém esperando.</p>'}<button type="button" class="bt largo" data-acao="add-espera">+ Pôr na lista</button>`;
  },
  caixa() {
    const sem = db.ags.filter((a) => a.dia <= 0 && a.dia > -7), rec = sem.reduce((s, a) => s + a.pago + (a.sinal?.pago ? a.sinal.valor : 0), 0), faltas = sem.filter((a) => a.st === 'faltou'), perdido = faltas.reduce((s, a) => s + preco(a), 0), prev = db.ags.filter((a) => a.dia >= 0 && a.st !== 'feito' && a.st !== 'faltou').reduce((s, a) => s + preco(a), 0);
    return `<a href="#mais">← Mais</a><h1>Caixa</h1><p class="sub">Últimos 7 dias e o que já está marcado.</p>
      <div class="cartao"><small class="mini">Recebido (7 dias)</small><p style="font:400 2rem var(--serif);margin:2px 0">${din(rec)}</p><small class="mini">Marcado pela frente: ${din(prev)}</small></div>
      <div class="cartao"><b>Faltas</b><p class="mini" style="margin:2px 0 0">${faltas.length} falta(s) custaram ${din(perdido)}. O sinal no PIX evita isso: ligue em Configurações.</p></div>
      <h2>Atendimentos</h2><div class="cartao">${sem.filter((a) => a.st === 'feito').map((a) => `<div class="hora" style="cursor:default"><span class="h">${data(a.dia).getDate()}/${data(a.dia).getMonth() + 1}</span><span>${t(cli(a.cli).nome)}<small>${t(serv(a.serv).nome)}</small></span><span>${din(a.pago)}</span></div>`).join('') || '<p class="livre">Nada ainda.</p>'}</div>`;
  },
  resumo() {
    const tabs = `<div class="chips" role="tablist">${[['dia', 'Dia'], ['mes', 'Mês'], ['ano', 'Ano']].map(([k, n]) => `<button type="button" role="tab" data-rmodo="${k}" aria-pressed="${res.modo === k}">${n}</button>`).join('')}</div>`;
    const hoje = data(0), mi = hoje.getFullYear() * 12 + hoje.getMonth();
    let nav, l, ant, extra = '';
    if (res.modo === 'dia') {
      nav = `<button type="button" class="bt pq" data-rpasso="-1" aria-label="Dia anterior">‹</button><label class="r-data"><input type="date" id="r-dia" value="${iso(res.d)}" aria-label="Escolher o dia"></label><button type="button" class="bt pq" data-rpasso="1" aria-label="Próximo dia">›</button>`;
      l = noPeriodo((a) => a.dia === res.d); ant = noPeriodo((a) => a.dia === res.d - 7);
      extra = `<h2>Horários do dia</h2><div class="cartao">${l.lista.map((a) => `<div class="hora" data-ag="${a.id}" role="button" tabindex="0"><span class="h">${hh(a.ini)}</span><span><b>${t(cli(a.cli).nome)}</b><small>${t(serv(a.serv).nome)}${a.forma ? ` · ${a.forma}` : ''}</small></span><span class="selo ${ST[a.st]?.[1] || ''}">${a.st === 'feito' ? din(a.pago + (a.sinal?.pago ? a.sinal.valor : 0)) : ST[a.st]?.[0] || a.st}</span></div>`).join('') || '<p class="livre">Nenhum horário neste dia.</p>'}</div>`;
    } else if (res.modo === 'mes') {
      const alvo = mi + res.m, y = Math.floor(alvo / 12), m = alvo % 12, dias = new Date(y, m + 1, 0).getDate();
      nav = `<button type="button" class="bt pq" data-rpasso="-1" aria-label="Mês anterior">‹</button><b class="r-tit">${MES[m][0].toUpperCase() + MES[m].slice(1)} de ${y}</b><button type="button" class="bt pq" data-rpasso="1" aria-label="Próximo mês">›</button>`;
      l = noPeriodo((a) => mesDe(a.dia) === alvo); ant = noPeriodo((a) => mesDe(a.dia) === alvo - 1);
      const porDia = Array(dias).fill(0); l.feitos.forEach((a) => { porDia[data(a.dia).getDate() - 1] += a.pago + (a.sinal?.pago ? a.sinal.valor : 0); });
      extra = `<h2>Recebido por dia</h2>${barras(porDia.map((v, i) => [i + 1, v]), (i) => (i + 1) % 5 === 0 || i === 0)}${listaClientes(l)}`;
    } else {
      const y = hoje.getFullYear() + res.a;
      nav = `<button type="button" class="bt pq" data-rpasso="-1" aria-label="Ano anterior">‹</button><b class="r-tit">${y}</b><button type="button" class="bt pq" data-rpasso="1" aria-label="Próximo ano">›</button>`;
      l = noPeriodo((a) => Math.floor(mesDe(a.dia) / 12) === y); ant = noPeriodo((a) => Math.floor(mesDe(a.dia) / 12) === y - 1);
      const porMes = Array(12).fill(0); l.feitos.forEach((a) => { porMes[mesDe(a.dia) % 12] += a.pago + (a.sinal?.pago ? a.sinal.valor : 0); });
      const melhor = porMes.indexOf(Math.max(...porMes));
      extra = `<h2>Recebido por mês</h2>${barras(porMes.map((v, i) => [MES[i].slice(0, 3), v]), () => true)}${l.rec ? `<p class="mini">Melhor mês: <b>${MES[melhor]}</b>, com ${din(porMes[melhor])}.</p>` : ''}${listaClientes(l)}`;
    }
    const varia = ant.rec && (res.modo !== 'ano' || ant.lista.some((a) => data(a.dia).getMonth() === 0)) ? Math.round(((l.rec - ant.rec) / ant.rec) * 100) : null, // ano anterior incompleto: sem comparação
      comp = { dia: 'mesmo dia da semana passada', mes: 'mês anterior', ano: 'ano anterior' }[res.modo];
    return `<a href="#mais">← Mais</a><h1>Resumo</h1><p class="sub">Quanto entrou, quantos vieram e quem faltou.</p>${tabs}<div class="r-nav">${nav}</div>
      <div class="r-grade"><div class="cartao"><small class="mini">Recebido</small><b class="r-num">${din(l.rec)}</b>${varia !== null ? `<small class="mini" style="color:${varia >= 0 ? 'var(--verde, #4f7d68)' : 'var(--verm)'}">${varia >= 0 ? '+' : ''}${varia}% que o ${comp}</small>` : ''}</div>
      <div class="cartao"><small class="mini">Ainda a receber</small><b class="r-num">${din(l.prev)}</b><small class="mini">${l.abertos.length} horário(s) marcado(s)</small></div>
      <div class="cartao"><small class="mini">Atendidos</small><b class="r-num">${l.feitos.length}</b><small class="mini">valor médio ${din(l.ticket)}</small></div>
      <div class="cartao"><small class="mini">Faltas</small><b class="r-num">${l.faltas.length}</b><small class="mini">${l.faltas.length ? `deixaram de entrar ${din(l.perdido)}` : 'nenhuma'}</small></div></div>
      ${l.feitos.length ? `<h2>Por serviço</h2><div class="cartao">${l.porServ.map(([s, n, v]) => `<div class="hora" style="cursor:default"><span class="h" style="color:${serv(s).cor}">●</span><span>${t(serv(s).nome)}<small>${n} atendimento(s)</small></span><span>${din(v)}</span></div>`).join('')}</div>
      <h2>Como pagaram</h2><div class="chips">${l.formas.map(([f, v]) => `<span class="selo">${f}: ${din(v)}</span>`).join('')}</div>` : ''}${extra}`;
  },
  mais() {
    const l = [['resumo', 'Resumo', 'do dia, do mês e do ano'], ['ia', 'Assistente', 'pergunte da sua agenda e dos clientes'], ['caixa', 'Caixa', 'quanto entrou e o que as faltas custaram'], ['espera', 'Lista de espera', `${db.espera.length} esperando encaixe`], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Painel do dono', 'ajudante e o que ela vê'], ['config', 'Configurações', 'tipo de negócio, horário, serviços, sinal, PIX']];
    return `<h1>Mais</h1><div class="lista-mais">${l.map(([k, n, s]) => `<a href="#${k}"><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div>`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Oi, ${db.pro.split(' ')[0]}! Eu vejo sua agenda e seus clientes. Pergunte do seu jeito. Na versão contratada são 20 perguntas grátis por dia.` }];
    return `<a href="#mais">← Mais</a><div class="ia-cab"><div class="ia-boneco" id="ia-boneco" aria-hidden="true"></div><div><h1 style="margin:0">Assistente</h1><p class="sub" style="margin:2px 0 0">Vê sua agenda, os clientes e o caixa.</p></div></div><div class="conversa">${conv.map((m) => `<div class="fala ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['Tenho buraco na agenda amanhã?', 'Quem eu devo chamar?', 'Quanto vou fazer esta semana?', 'Escreva o lembrete de amanhã'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--verm)"><b style="color:var(--verm)">Assinatura vencida</b><p class="mini" style="margin:4px 0 0">O pagamento de ${din(a.valor)} não foi aprovado. Sua agenda e os clientes estão guardados.</p></div>`
      : a.renova ? `<div class="cartao"><b>Ativa</b><p class="mini" style="margin:4px 0 0">Plano Assinatura · ${din(a.valor)} por mês · próxima cobrança em ${a.proxima} dias.</p></div>`
        : `<div class="cartao" style="border-color:var(--rose)"><b>Cancelada</b><p class="mini" style="margin:4px 0 0">Você usa tudo por mais ${a.proxima} dias. Depois disso nada mais é cobrado.</p></div>`;
    return `<a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.</p>${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><div class="cartao">${a.pagos.map((d) => `<div class="hora" style="cursor:default"><span class="h">✓</span><span>Mensalidade<small>${data(d).toLocaleDateString('pt-BR')}</small></span><span>${din(a.valor)}</span></div>`).join('')}</div>`;
  },
  dono() {
    return `<a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Quem te ajuda entra com o próprio celular e só vê o que você deixar.</p>
      ${db.ajudantes.map((p, i) => `<div class="cartao"><b>${t(p.nome)}</b>${[['agenda', 'Ver e marcar horários'], ['clientes', 'Ver os clientes'], ['valores', 'Ver valores e caixa']].map(([k, n]) => `<label class="troca">${n}<input type="checkbox" data-ve="${i}.${k}" ${p.ve[k] ? 'checked' : ''}></label>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" data-acao="ajudante">+ Convidar ajudante</button>
      <h2>Plano</h2><div class="chips"><button type="button" data-plano="basico" aria-pressed="${db.plano === 'basico'}">Assinatura · R$ 49/mês</button></div><p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos.</p>`;
  },
  config() {
    return `<a href="#mais">← Mais</a><h1>Configurações</h1><h2>Tipo de negócio</h2><p class="mini" style="margin-top:-6px">Troca os serviços de exemplo. Você ajusta nomes, tempos e preços logo abaixo.</p><div class="chips">${Object.entries(MODELOS).map(([k, m]) => `<button type="button" data-tipo="${k}" aria-pressed="${(db.tipo || 'geral') === k}">${m.nome}</button>`).join('')}</div>${[['studio', 'Nome do espaço'], ['pro', 'Seu nome'], ['ramo', 'O que você faz'], ['pix', 'Chave PIX do sinal']].map(([k, n]) => `<label class="campo">${n}<input data-cfg="${k}" value="${t(db[k])}"></label>`).join('')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="campo">Começo às<input data-cfg="abre" type="number" value="${db.abre}"></label><label class="campo">Termino às<input data-cfg="fecha" type="number" value="${db.fecha}"></label><label class="campo">Sinal (%)<input data-cfg="sinalPct" type="number" value="${db.sinalPct}"></label><label class="campo">Pedir sinal acima de (R$)<input data-cfg="sinalAcima" type="number" value="${db.sinalAcima}"></label><label class="campo" style="grid-column:1/-1">Horários sugeridos de quanto em quanto<select data-cfg="passo">${[10, 15, 20, 30, 60].map((m) => `<option value="${m}" ${(db.passo || 30) === m ? 'selected' : ''}>${m} minutos</option>`).join('')}</select></label></div>
      <h2>Serviços</h2><div class="cartao">${db.servicos.map((s, i) => `<div class="serv-ed"><span class="h" style="color:${s.cor}">●</span><input data-sv="${i}.nome" value="${t(s.nome)}" aria-label="Nome do serviço"><label>min<input data-sv="${i}.min" type="number" min="5" step="5" value="${s.min}"></label><label>R$<input data-sv="${i}.preco" type="number" min="0" step="0.01" value="${s.preco}"></label></div>`).join('')}</div><button type="button" class="bt largo" data-acao="add-serv">+ Adicionar serviço</button><p class="mini">Funciona sem internet: o que você marcar sobe quando a conexão voltar.</p>`;
  },
};

// soma de um período: recebido (com o sinal pago), a receber, faltas, por serviço, por forma de pagamento e por cliente
const mesDe = (o) => { const d = data(o); return d.getFullYear() * 12 + d.getMonth(); };
function noPeriodo(filtro) {
  const lista = db.ags.filter((a) => a.st !== 'cancelado' && filtro(a)).sort((a, b) => a.dia - b.dia || a.ini - b.ini);
  const feitos = lista.filter((a) => a.st === 'feito'), faltas = lista.filter((a) => a.st === 'faltou'), abertos = lista.filter((a) => a.st === 'marcado' || a.st === 'confirmado');
  const pg = (a) => a.pago + (a.sinal?.pago ? a.sinal.valor : 0), rec = feitos.reduce((s, a) => s + pg(a), 0);
  const agrupa = (chave) => { const m = new Map(); feitos.forEach((a) => { const k = chave(a), x = m.get(k) || [k, 0, 0]; x[1]++; x[2] += pg(a); m.set(k, x); }); return [...m.values()].sort((a, b) => b[2] - a[2]); };
  return { lista, feitos, faltas, abertos, rec, prev: abertos.reduce((s, a) => s + preco(a) - (a.sinal?.pago ? a.sinal.valor : 0), 0), perdido: faltas.reduce((s, a) => s + preco(a), 0), ticket: feitos.length ? rec / feitos.length : 0, porServ: agrupa((a) => a.serv), porCli: agrupa((a) => a.cli), formas: agrupa((a) => a.forma || 'Não anotado').map(([f, , v]) => [f, v]) };
}
function barras(l, rotulo) { const max = Math.max(1, ...l.map((x) => x[1])); return `<div class="barras" role="img" aria-label="Gráfico de barras">${l.map(([n, v], i) => `<span title="${n}: ${din(v)}"><i style="height:${Math.max(2, (v / max) * 100)}%"></i><small>${rotulo(i) ? n : ''}</small></span>`).join('')}</div>`; }
const listaClientes = (l) => (l.porCli.length ? `<h2>Clientes que mais vieram</h2><div class="cartao">${l.porCli.slice(0, 5).map(([c, n, v]) => `<div class="hora" style="cursor:default"><span class="h">${n}×</span><span>${t(cli(c).nome)}</span><span>${din(v)}</span></div>`).join('')}</div>` : '');
// aviso do horário digitado/escolhido e texto do botão de marcar (atualizados sem redesenhar a tela)
function aviso() {
  if (rasc.ini === null) return '';
  const s = serv(rasc.serv), ch = ocupado(rasc.dia, rasc.ini, s.min, rasc.remarca);
  if (rasc.ini < db.abre || rasc.ini + s.min / 60 > db.fecha) return `<span style="color:var(--verm)">Fora do seu horário de trabalho (${db.abre}h às ${db.fecha}h). Dá para marcar assim mesmo.</span>`;
  return ch ? `<span style="color:var(--verm)">Encosta no horário de ${t(cli(ch.cli).nome.split(' ')[0])} (${hh(ch.ini)} às ${hh(fim(ch))}). Dá para marcar assim mesmo, se for um encaixe.</span>` : `Termina às ${hh(rasc.ini + s.min / 60)}.`;
}
const rotuloMarcar = () => (rasc.ini === null ? 'Escolha um horário para marcar' : `${rasc.remarca ? 'Remarcar para' : 'Marcar'} ${nomeDia(rasc.dia).split(',')[0]} às ${hh(rasc.ini)}`);

function responde(p) {
  const x = sa(p), primeiro = (n) => n.split(' ')[0], eu = primeiro(db.pro);
  const qd = /depois de amanha/.test(x) ? 2 : /amanha/.test(x) ? 1 : /ontem/.test(x) ? -1 : 0, quando = nomeDia(qd).split(',')[0];
  const pg = (a) => a.pago + (a.sinal?.pago ? a.sinal.valor : 0), agora = new Date().getHours() + new Date().getMinutes() / 60;
  const k = db.clientes.find((c) => { const n = sa(primeiro(c.nome)); return n.length > 2 && new RegExp(`\\b${n}\\b`).test(x); });
  if (k && !/lembrete/.test(x)) {
    const prox = db.ags.filter((a) => a.cli === k.id && a.dia >= 0 && (a.st === 'marcado' || a.st === 'confirmado')).sort((a, b) => a.dia - b.dia || a.ini - b.ini)[0], feitos = db.ags.filter((a) => a.cli === k.id && a.st === 'feito');
    return `${k.nome}: ${prox ? `próximo horário ${nomeDia(prox.dia).split(',')[0]} às ${hh(prox.ini)} (${serv(prox.serv).nome}, ${din(preco(prox))}).` : 'sem horário marcado.'} ${k.ultima ? `Última vez há ${-k.ultima} dias.` : 'Cliente novo.'}${k.valor != null ? ` Paga ${din(k.valor)} combinado.` : ''}${k.faltas ? ` Já faltou ${k.faltas} vez(es).` : ''}${feitos.length ? ` No total, ${feitos.length} atendimento(s) e ${din(feitos.reduce((s, a) => s + pg(a), 0))}.` : ''}`;
  }
  if (/lembrete|escrev|mensag|texto/.test(x)) {
    const d = qd === 0 && !/hoje/.test(x) ? 1 : qd, l = doDia(d).filter((a) => a.st === 'marcado' || a.st === 'confirmado');
    return l.length ? `Lembretes de ${nomeDia(d).split(',')[0]} (${l.length}):\n\n${l.map((a) => `${hh(a.ini)} · ${primeiro(cli(a.cli).nome)}: "Oi, ${primeiro(cli(a.cli).nome)}! Lembrando do seu horário ${nomeDia(d).split(',')[0]} às ${hh(a.ini)} (${serv(a.serv).nome.toLowerCase()}). Responde SIM para confirmar ou me avisa se precisar trocar. ${eu}"`).join('\n\n')}\n\nPara mandar, toque no horário na tela Dia e depois em "Confirmar no WhatsApp".` : `${nomeDia(d)[0].toUpperCase() + nomeDia(d).slice(1).split(',')[0]} não tem ninguém marcado.`;
  }
  if (/falt|furo|furou/.test(x)) { const l = noPeriodo((a) => mesDe(a.dia) === mesDe(0)); return l.faltas.length ? `Neste mês foram ${l.faltas.length} falta(s): ${l.faltas.map((a) => `${primeiro(cli(a.cli).nome)} (${data(a.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`).join(', ')}. Deixaram de entrar ${din(l.perdido)}. Para quem falta, peça sinal no PIX ao marcar.` : 'Neste mês ninguém faltou.'; }
  if (/sinal|pix/.test(x)) { const l = db.ags.filter((a) => a.dia >= 0 && a.sinal && !a.sinal.pago && a.st !== 'cancelado'); return l.length ? `Sinais esperando o PIX: ${l.map((a) => `${primeiro(cli(a.cli).nome)} ${din(a.sinal.valor)} (${nomeDia(a.dia).split(',')[0]} às ${hh(a.ini)})`).join(', ')}. Quando cair, toque no horário e em "Caiu".` : 'Nenhum sinal pendente: todos os sinais marcados já foram pagos.'; }
  if (/espera/.test(x)) return db.espera.length ? `Na lista de espera: ${db.espera.map((e) => `${e.nome} (${e.quer}, ${e.quando})`).join('; ')}.` : 'Ninguém na lista de espera.';
  if (/buraco|livre|vago|vaga|encaixe|disponiv|folga/.test(x)) {
    const l = livres(qd, 60).filter((h) => qd !== 0 || h > agora);
    return l.length ? `${quando[0].toUpperCase() + quando.slice(1)} você tem horário livre a partir de ${l.filter((_, i) => i % Math.max(1, Math.round(60 / (db.passo || 30))) === 0).slice(0, 6).map(hh).join(', ')} (para atendimentos de 1 hora).${db.espera.length ? ` Dá para oferecer para quem está na lista de espera: ${db.espera.map((e) => primeiro(e.nome)).join(', ')}.` : ''}` : `${quando[0].toUpperCase() + quando.slice(1)} está cheio, sem horário livre de 1 hora.`;
  }
  if (/chamar|sumid|volt|retorno|faz tempo/.test(x)) { const l = db.clientes.filter((c) => c.ultima && -c.ultima >= serv(c.serv).retorno && !db.ags.some((a) => a.cli === c.id && a.dia >= 0 && (a.st === 'marcado' || a.st === 'confirmado'))); return l.length ? `Vale chamar: ${l.map((c) => `${primeiro(c.nome)} (${-c.ultima} dias)`).join(', ')}. Estão em Clientes, com o botão "Chamar no WhatsApp".` : 'Todos os clientes estão em dia.'; }
  if (/servic|preco|tabela|cobro|valor do/.test(x)) return `Seus serviços: ${db.servicos.map((s) => `${s.nome} ${din(s.preco)} (${s.min} min)`).join('; ')}. Para mudar, vá em Mais > Configurações.`;
  const quer = /quanto|fatur|ganh|receb|fiz|entrou|resumo|total|vend|lucr/.test(x);
  if (quer && /\bano\b/.test(x)) { const l = noPeriodo((a) => Math.floor(mesDe(a.dia) / 12) === new Date().getFullYear()); return `Em ${new Date().getFullYear()} entraram ${din(l.rec)} em ${l.feitos.length} atendimento(s) (média de ${din(l.ticket)}). Faltas: ${l.faltas.length}. O detalhe por mês está em Mais > Resumo > Ano.`; }
  if (quer && /\bmes\b/.test(x)) { const l = noPeriodo((a) => mesDe(a.dia) === mesDe(0)), ant = noPeriodo((a) => mesDe(a.dia) === mesDe(0) - 1); return `Em ${MES[new Date().getMonth()]} já entraram ${din(l.rec)} em ${l.feitos.length} atendimento(s), e ainda tem ${din(l.prev)} marcado para receber. No mês passado inteiro foram ${din(ant.rec)}.`; }
  if (/semana/.test(x)) {
    const vai = noPeriodo((a) => a.dia >= 0 && a.dia < 7), foi = noPeriodo((a) => a.dia > -7 && a.dia <= 0), media = db.servicos.reduce((s, v) => s + v.preco, 0) / db.servicos.length, buracos = livres(1, 60).length;
    return `Próximos 7 dias: ${din(vai.prev)} marcados em ${vai.abertos.length} horário(s). Nos últimos 7 dias entraram ${din(foi.rec)}.${buracos ? ` Amanhã ainda cabem uns ${Math.min(buracos, 6)} atendimentos de 1 hora (perto de ${din(Math.min(buracos, 6) * media)} a mais).` : ''}`;
  }
  if (quer || /hoje|ontem|amanha|quem|agenda|marcad|atend|vem|horario/.test(x)) {
    const l = noPeriodo((a) => a.dia === qd);
    if (!l.lista.length) return `${quando[0].toUpperCase() + quando.slice(1)} não tem ninguém marcado.`;
    return `${quando[0].toUpperCase() + quando.slice(1)}: ${l.lista.map((a) => `${hh(a.ini)} ${primeiro(cli(a.cli).nome)} (${serv(a.serv).nome.toLowerCase()}${a.st === 'feito' ? ', atendido' : a.st === 'faltou' ? ', faltou' : a.st === 'confirmado' ? ', confirmou' : ''})`).join('; ')}. ${l.rec ? `Já entraram ${din(l.rec)}` : 'Nada recebido ainda'}${l.prev ? ` e faltam ${din(l.prev)} para receber` : ''}.`;
  }
  const h = noPeriodo((a) => a.dia === 0);
  return `Ainda não sei responder isso. Posso falar da agenda (hoje, amanhã), horários livres, quem chamar, faltas, sinais pendentes, lista de espera, um cliente pelo nome, quanto entrou no dia, na semana, no mês e no ano, e escrever os lembretes. Hoje: ${h.lista.length} horário(s), ${din(h.rec)} recebido e ${din(h.prev)} a receber.`;
}

// ------------------------------------------------------------------ navegação, trava e pagamento
function mostra() {
  const r = location.hash.slice(1) || 'dia', tela = $('#tela');
  tela.innerHTML = (T[r] || T.dia)();
  const aba = { espera: 'dia', resumo: 'mais', ia: 'mais', caixa: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] ?? r;
  document.querySelectorAll('.pilula a').forEach((l) => { if (l.dataset.aba === aba) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  $('#nome-studio').textContent = db.studio; $('#nome-pro').textContent = `${db.pro} · ${db.ramo}`; $('#iniciais').textContent = db.pro.split(' ').map((p) => p[0]).slice(0, 2).join('');
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="margin-top:12px;padding:8px 12px;background:#f1dfdd">Assinatura cancelada: você usa por mais ${db.assinatura.proxima} dias. <a href="#assinatura">Reativar</a></p>`);
  trava(r);
  if (r === 'ia') { const el = $('#ia-boneco'); if (el) import('../base/assistente-ia.js?v=2').then((m) => { const b = m.personagemIA(el, db.conversa.length ? 'parado' : 'ola'); if (!db.conversa.length) b.estado('ola', 2600); else if (/Pensando/.test(db.conversa[db.conversa.length - 1].t)) b.estado('pensando'); else b.estado('explicando', 4000); }).catch(() => el.remove()); }
  document.title = `${{ dia: 'Dia', resumo: 'Resumo', novo: rasc.remarca ? 'Remarcar' : 'Novo horário', clientes: 'Clientes', link: 'Link', espera: 'Lista de espera', caixa: 'Caixa', mais: 'Mais', ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' }[r] || 'Dia'} · Veltria Agenda Essencial`;
}
addEventListener('hashchange', () => { mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Sua agenda, os clientes e os sinais estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}
function abreHorario(id) {
  const a = db.ags.find((x) => x.id === id), c = cli(a.cli), s = serv(a.serv);
  const v = preco(a);
  folha(`<h2>${hh(a.ini)} · ${t(c.nome)}</h2><p class="sub">${t(s.nome)} · ${s.min} min · ${din(v)}${a.valor != null ? ' (combinado)' : ''} · ${nomeDia(a.dia)}</p>${a.sinal ? `<p class="cartao" style="padding:8px 12px">Sinal de ${din(a.sinal.valor)}: <b>${a.sinal.pago ? 'pago' : 'esperando o PIX'}</b>${a.sinal.pago ? '' : ' <button type="button" class="bt pq" data-sinal-ok>Caiu</button>'}</p>` : ''}
    <div style="display:grid;gap:8px">${a.st === 'feito' || a.st === 'faltou' ? '' : `${c.tel ? '' : '<p class="mini" style="margin:0">Sem WhatsApp anotado: edite o cliente em Clientes para confirmar por aqui.</p>'}<a class="bt rose largo" ${c.tel ? '' : 'hidden'} target="_blank" rel="noopener" href="${zap(c.tel, `Oi, ${c.nome.split(' ')[0]}! Confirmando ${s.nome.toLowerCase()} ${nomeDia(a.dia)} às ${hh(a.ini)}. Responde SIM para confirmar.${a.sinal && !a.sinal.pago ? ` Sinal de ${din(a.sinal.valor)} no PIX ${db.pix}.` : ''}`)}" data-confirmou>Confirmar no WhatsApp</a>
    <button type="button" class="bt cheio largo" data-receber>Atendido: receber ${din(v - (a.sinal?.pago ? a.sinal.valor : 0))}</button><div class="linha" style="margin:0"><button type="button" class="bt pq" data-remarcar>Remarcar</button><button type="button" class="bt pq" data-faltou>Faltou</button><button type="button" class="bt pq" data-desmarcar>Desmarcar</button></div>`}<button type="button" class="bt largo" data-fecha style="border-style:dashed">Fechar</button></div>`, (f, fecha) => {
    const ok = (fn, msg) => () => { fn(); grava(); fecha(); mostra(); if (msg) toast(msg); };
    f.querySelector('[data-sinal-ok]')?.addEventListener('click', ok(() => { a.sinal.pago = true; }, 'Sinal recebido. Horário garantido.'));
    f.querySelector('[data-confirmou]')?.addEventListener('click', () => { if (a.st === 'marcado') a.st = 'confirmado'; grava(); setTimeout(() => { fecha(); mostra(); }, 200); });
    f.querySelector('[data-receber]')?.addEventListener('click', () => { f.innerHTML = `<h2>Como ${t(c.nome.split(' ')[0])} pagou?</h2><div style="display:grid;gap:8px">${['PIX', 'Dinheiro', 'Cartão'].map((m) => `<button type="button" class="bt largo" data-forma="${m}">${m}</button>`).join('')}</div>`; f.querySelectorAll('[data-forma]').forEach((b) => b.addEventListener('click', ok(() => { a.st = 'feito'; a.forma = b.dataset.forma; a.pago = v - (a.sinal?.pago ? a.sinal.valor : 0); c.ultima = a.dia; c.serv = a.serv; }, `${din(v)} recebido. Próximo retorno em ${s.retorno} dias.`))); });
    f.querySelector('[data-remarcar]')?.addEventListener('click', () => { rasc = { ...RASC(), serv: a.serv, cli: c.nome, tel: c.tel || '', dia: Math.max(0, a.dia), valor: a.valor ?? '', sinal: !!a.sinal, remarca: a.id }; fecha(); location.hash = '#novo'; });
    f.querySelector('[data-faltou]')?.addEventListener('click', ok(() => { a.st = 'faltou'; c.faltas = (c.faltas || 0) + 1; }, c.faltas >= 1 ? `${c.nome.split(' ')[0]} já faltou antes: peça sinal na próxima.` : 'Falta registrada.'));
    f.querySelector('[data-desmarcar]')?.addEventListener('click', ok(() => { a.st = 'cancelado'; }, db.espera.length ? `Horário livre. ${db.espera.length} cliente(s) na lista de espera: ofereça em Mais > Lista de espera.` : 'Horário desmarcado.'));
  });
}
const ACOES = {
  marcar: () => {
    const nome = $('#cli-n').value.trim(); if (!nome) { toast('Escreva o nome do cliente.'); $('#cli-n').focus(); return; }
    const hd = $('#hr-livre').value.trim(); if (hd) { const h = lerHora(hd); if (h === null) { toast('Horário inválido. Escreva assim: 9:10 ou 14:45.'); $('#hr-livre').focus(); return; } rasc.ini = h; }
    if (rasc.ini === null) { toast('Escolha ou digite o horário.'); return; }
    const tel = $('#tel-n').value.trim();
    let c = db.clientes.find((x) => sa(x.nome) === sa(nome)); if (!c) { c = { id: uid(), nome, tel, ultima: 0, serv: rasc.serv, faltas: 0, valor: null }; db.clientes.push(c); } else if (tel) c.tel = tel;
    const vd = $('#valor-n').value, valor = vd !== '' ? Number(vd) : c.valor ?? null, velho = rasc.remarca && db.ags.find((a) => a.id === rasc.remarca);
    const s = serv(rasc.serv), sinal = velho?.sinal || ($('#sinal').checked ? { valor: Math.round((valor ?? s.preco) * db.sinalPct / 100), pago: false } : null);
    if (velho) db.ags = db.ags.filter((a) => a !== velho);
    db.ags.push({ id: uid(), dia: rasc.dia, ini: rasc.ini, cli: c.id, serv: rasc.serv, st: 'marcado', pago: 0, valor, sinal });
    const msg = `${velho ? 'Remarcado' : 'Marcado'}: ${s.nome.toLowerCase()} ${nomeDia(rasc.dia).split(',')[0]} às ${hh(rasc.ini)}${sinal && !velho ? `. Sinal de ${din(sinal.valor)} pedido no PIX` : ''}.`;
    dia = rasc.dia; rasc = { ...RASC(), serv: rasc.serv, dia: rasc.dia }; grava(); location.hash = '#dia'; toast(msg);
  },
  'sem-remarcar': () => { rasc = RASC(); location.hash = '#dia'; },
  'add-cliente': () => folha(`<h2>Adicionar cliente</h2><form><label class="campo">Nome<input name="n" required autocomplete="off"></label><label class="campo">WhatsApp<input name="t" inputmode="tel"></label><label class="campo">Quanto vai pagar (opcional)<input name="v" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Deixe vazio para usar o preço do serviço"></label><label class="campo">Serviço de costume<select name="s">${db.servicos.map((x) => `<option value="${x.id}">${t(x.nome)} · ${din(x.preco)}</option>`).join('')}</select></label><label class="campo">Anotação (opcional)<input name="o" placeholder="Ex.: prefere de manhã"></label><button class="bt cheio largo">Salvar cliente</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault(); const x = new FormData(e.target), nome = String(x.get('n')).trim(); if (!nome) return;
    if (db.clientes.some((c) => sa(c.nome) === sa(nome))) { toast('Já existe um cliente com esse nome.'); return; }
    const v = String(x.get('v') || '').trim();
    db.clientes.push({ id: uid(), nome, tel: String(x.get('t') || ''), ultima: 0, serv: x.get('s'), faltas: 0, valor: v === '' ? null : Number(v), obs: String(x.get('o') || '') });
    grava(); fecha(); mostra(); toast(v === '' ? `${nome.split(' ')[0]} adicionado.` : `${nome.split(' ')[0]} adicionado, pagando ${din(Number(v))}.`);
  })),
  'edita-cli': (id) => { const c = db.clientes.find((x) => x.id === id); if (!c) return; const futuro = db.ags.filter((a) => a.cli === c.id && a.dia >= 0 && (a.st === 'marcado' || a.st === 'confirmado'));
    folha(`<h2>Editar cliente</h2><form><label class="campo">Nome<input name="n" required value="${t(c.nome)}"></label><label class="campo">WhatsApp<input name="t" inputmode="tel" value="${t(c.tel)}"></label><label class="campo">Quanto paga (opcional)<input name="v" type="number" inputmode="decimal" min="0" step="0.01" value="${c.valor ?? ''}" placeholder="Vazio = preço do serviço"></label><label class="campo">Serviço de costume<select name="s">${db.servicos.map((x) => `<option value="${x.id}" ${x.id === c.serv ? 'selected' : ''}>${t(x.nome)} · ${din(x.preco)}</option>`).join('')}</select></label><label class="campo">Anotação<input name="o" value="${t(c.obs || '')}"></label><button class="bt cheio largo">Salvar</button></form><button type="button" class="bt largo" data-apaga style="margin-top:8px;color:var(--verm)">${futuro.length ? `Apagar (tem ${futuro.length} horário(s) marcado(s))` : 'Apagar cliente'}</button>`, (f, fecha) => {
      f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target), nome = String(x.get('n')).trim(); if (!nome) return; if (db.clientes.some((o) => o !== c && sa(o.nome) === sa(nome))) { toast('Já existe outro cliente com esse nome.'); return; } const v = String(x.get('v') || '').trim(); Object.assign(c, { nome, tel: String(x.get('t') || ''), valor: v === '' ? null : Number(v), serv: x.get('s'), obs: String(x.get('o') || '') }); grava(); fecha(); mostra(); toast('Cliente salvo.'); });
      f.querySelector('[data-apaga]').addEventListener('click', () => { if (!confirm(futuro.length ? `Apagar ${c.nome} e desmarcar ${futuro.length} horário(s)?` : `Apagar ${c.nome}?`)) return; futuro.forEach((a) => { a.st = 'cancelado'; }); db.clientes = db.clientes.filter((o) => o !== c); grava(); fecha(); mostra(); toast('Cliente apagado.'); });
    }); },
  'add-serv': () => { const i = db.servicos.length; db.servicos.push({ id: 's' + Date.now().toString(36), nome: 'Novo serviço', min: 60, preco: 0, cor: COR[i % COR.length], retorno: 30 }); grava(); mostra(); setTimeout(() => document.querySelector(`[data-sv="${i}.nome"]`)?.select(), 30); },
  copiar: () => { navigator.clipboard?.writeText(LINK).catch(() => {}); toast('Link copiado. Cole na bio do Instagram.'); },
  aceitar: (d) => { const p = db.pedidos.find((x) => x.id === d.p); let c = db.clientes.find((x) => x.nome === p.nome); if (!c) { c = { id: uid(), nome: p.nome, tel: p.tel, ultima: 0, serv: p.serv, faltas: 0 }; db.clientes.push(c); } db.ags.push({ id: uid(), dia: p.dia, ini: p.ini, cli: c.id, serv: p.serv, st: 'confirmado', pago: 0, valor: c.valor ?? null, sinal: serv(p.serv).preco >= db.sinalAcima ? { valor: Math.round(serv(p.serv).preco * db.sinalPct / 100), pago: true } : null }); db.pedidos = db.pedidos.filter((x) => x !== p); grava(); mostra(); toast(`Horário de ${p.nome.split(' ')[0]} confirmado. Abrindo o WhatsApp para avisar.`); window.open(zap(p.tel, `Oi, ${p.nome.split(' ')[0]}! Seu horário de ${serv(p.serv).nome} está confirmado para ${nomeDia(p.dia)} às ${hh(p.ini)}. Qualquer coisa, é só chamar por aqui. ${db.studio}`), '_blank', 'noopener'); },
  recusar: (d) => { const p = db.pedidos.find((x) => x.id === d.p); window.open(zap(p.tel, `Oi, ${p.nome.split(' ')[0]}! Esse horário não vai dar. Tenho ${livres(p.dia, serv(p.serv).min).slice(0, 3).map(hh).join(', ')}. Algum serve?`), '_blank', 'noopener'); },
  'tira-espera': (d) => { db.espera = db.espera.filter((e) => e.id !== d.e); grava(); mostra(); },
  'add-espera': () => folha('<h2>Lista de espera</h2><form><label class="campo">Nome<input name="n" required></label><label class="campo">WhatsApp<input name="t" inputmode="tel"></label><label class="campo">Quer<input name="q" placeholder="Mão e pé"></label><label class="campo">Quando pode<input name="w" placeholder="qualquer tarde"></label><button class="bt cheio largo">Pôr na lista</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); db.espera.push({ id: uid(), nome: x.get('n'), tel: x.get('t'), quer: x.get('q') || 'qualquer serviço', quando: x.get('w') || 'qualquer horário' }); grava(); fecha(); mostra(); })),
  ajudante: () => folha('<h2>Convidar ajudante</h2><form><label class="campo">Nome<input name="n" required></label><button class="bt cheio largo">Mandar convite</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); db.ajudantes.push({ nome: new FormData(e.target).get('n'), ve: { agenda: true, valores: false, clientes: true } }); grava(); fecha(); mostra(); toast('Convite enviado.'); })),
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor)}</h2><p class="sub">Escolha como pagar. Libera na hora.</p><div class="chips"><button type="button" aria-pressed="true">PIX</button><button type="button" aria-pressed="false">Cartão</button></div><div class="cartao"><p class="mini">PIX copia e cola (demonstração):</p><code style="word-break:break-all;font-size:.78rem">00020126580014BR.GOV.BCB.PIX0136bluerose-demo520400005303986540${db.assinatura.valor}.005802BR</code></div><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); toast('Pagamento aprovado. Tudo liberado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa por mais ${db.assinatura.proxima} dias e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); toast('Assinatura reativada.'); },
};

document.addEventListener('click', (e) => {
  const el = e.target;
  const ir = el.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const ag = el.closest('[data-ag]'); if (ag && !el.closest('.folha')) { abreHorario(ag.dataset.ag); return; }
  const rd = el.closest('[data-res-dia]'); if (rd) { res = { ...res, modo: 'dia', d: Number(rd.dataset.resDia) }; return; }
  const d = el.closest('[data-dia]'); if (d) { dia = Number(d.dataset.dia); mostra(); return; }
  const nv = el.closest('[data-novo-dia]'); if (nv) { rasc = { ...RASC(), dia: Number(nv.dataset.novoDia) }; location.hash = '#novo'; return; }
  const mc = el.closest('[data-marca-cli]'); if (mc) { const c = db.clientes.find((x) => x.id === mc.dataset.marcaCli); rasc = { ...RASC(), cli: c.nome, tel: c.tel || '', serv: db.servicos.some((s) => s.id === c.serv) ? c.serv : RASC().serv }; location.hash = '#novo'; return; }
  const ec = el.closest('[data-edita-cli]'); if (ec) { ACOES['edita-cli'](ec.dataset.editaCli); return; }
  const rm = el.closest('[data-rmodo]'); if (rm) { res.modo = rm.dataset.rmodo; mostra(); return; }
  const rp = el.closest('[data-rpasso]'); if (rp) { const k = { dia: 'd', mes: 'm', ano: 'a' }[res.modo]; res[k] += Number(rp.dataset.rpasso); mostra(); return; }
  const sv = el.closest('[data-serv]'); if (sv) { guarda(); rasc.serv = sv.dataset.serv; rasc.ini = null; mostra(); return; }
  const nd = el.closest('[data-ndia]'); if (nd) { guarda(); rasc.dia = Number(nd.dataset.ndia); rasc.ini = null; mostra(); return; }
  const hr = el.closest('[data-hr]'); if (hr) { guarda(); rasc.ini = Number(hr.dataset.hr); mostra(); return; }
  const sg = el.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); return; }
  const tp = el.closest('[data-tipo]'); if (tp) { const m = MODELOS[tp.dataset.tipo]; db.tipo = tp.dataset.tipo; db.servicos = m.servicos.map((x) => ({ ...x })); if (db.ramo === 'atendimento com hora marcada' || Object.values(MODELOS).some((x) => x.nome.toLowerCase() === db.ramo)) db.ramo = m.nome.toLowerCase(); grava(); mostra(); toast(`Serviços de ${m.nome.toLowerCase()} carregados. Ajuste os preços abaixo.`); return; }
  const pl = el.closest('[data-plano]'); if (pl) { db.plano = pl.dataset.plano; db.assinatura.valor = db.plano === 'pro' ? 109 : 49; grava(); mostra(); return; }
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) ACOES[ac.dataset.acao](ac.dataset);
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.ag && e.target.classList.contains('hora')) { e.preventDefault(); abreHorario(e.target.dataset.ag); } });
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-12); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; grava(); mostra(); }); scrollTo(0, document.body.scrollHeight);
});
// horário digitado: vale na hora, sem redesenhar (o toque no botão Marcar não se perde)
document.addEventListener('input', (e) => {
  if (e.target.id === 'busca-cli') { const q = sa(e.target.value.trim()); document.querySelectorAll('[data-nome-cli]').forEach((c) => { c.hidden = q && !c.dataset.nomeCli.includes(q); }); return; }
  if (e.target.id !== 'hr-livre') return;
  const h = lerHora(e.target.value); if (e.target.value.trim() && h === null) return;
  rasc.ini = h; document.querySelectorAll('[data-hr]').forEach((b) => b.setAttribute('aria-pressed', String(h !== null && Math.abs(Number(b.dataset.hr) - h) < 1e-6)));
  const bt = $('#marcar-bt'); bt.disabled = h === null; bt.textContent = rotuloMarcar(); $('#aviso-hr').innerHTML = aviso();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'hr-livre') { e.preventDefault(); if (rasc.ini !== null) ACOES.marcar(); } });
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.cfg) { db[el.dataset.cfg] = ['abre', 'fecha', 'sinalPct', 'sinalAcima', 'passo'].includes(el.dataset.cfg) ? Number(el.value) : el.value; grava(); mostra(); toast('Salvo.'); }
  if (el.dataset.sv) { const [i, k] = el.dataset.sv.split('.'), v = k === 'nome' ? el.value.trim() || db.servicos[i].nome : Math.max(0, Number(el.value) || 0); db.servicos[i][k] = k === 'min' ? Math.max(5, v) : v; grava(); toast('Serviço salvo.'); }
  if (el.id === 'ir-dia') { const o = deIso(el.value); if (o !== null) { dia = o; mostra(); } }
  if (el.id === 'nd-data') { const o = deIso(el.value); if (o !== null) { guarda(); rasc.dia = o; rasc.ini = null; mostra(); } }
  if (el.id === 'r-dia') { const o = deIso(el.value); if (o !== null) { res.d = o; mostra(); } }
  if (el.id === 'hr-livre' && el.value.trim() && lerHora(el.value) === null) toast('Horário inválido. Escreva assim: 9:10 ou 14:45.');
  if (el.id === 'valor-n' || el.id === 'cli-n') { guarda(); const s = serv(rasc.serv), k = db.clientes.find((x) => sa(x.nome) === sa(rasc.cli)); if (el.id === 'cli-n' && k && !$('#tel-n').value) $('#tel-n').value = k.tel || ''; const v = rasc.valor !== '' ? Number(rasc.valor) : k?.valor ?? s.preco, sp = $('#sinal')?.previousElementSibling; if (sp) sp.firstChild.textContent = `Pedir sinal de ${din(v * db.sinalPct / 100)} no PIX`; }
  if (el.dataset.ve) { const [i, k] = el.dataset.ve.split('.'); db.ajudantes[i].ve[k] = el.checked; grava(); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; }
  if (e.data.simular === 'normal') { db.assinatura = inicial().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = inicial(); dia = 0; rasc = RASC(); res = { modo: 'dia', d: 0, m: 0, a: 0 }; location.hash = '#dia'; mostra(); toast('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostra();

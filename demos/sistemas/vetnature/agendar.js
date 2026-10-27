// VetNature · página em que o tutor pede horário. O pedido vai para a Agenda da clínica, que confirma pelo WhatsApp.
// Na demonstração os dois lados conversam pelo armazenamento do navegador (mesmo site).
const CHAVE = 'vetnature-demo-v2', FILA = 'vetnature-pedidos-demo';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ler = (k, pad) => { try { return JSON.parse(localStorage.getItem(k)) ?? pad; } catch { return pad; } };
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const maisDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dataBR = (iso) => iso.split('-').reverse().join('/');
const semana = (iso, f) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: f });
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const minutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const hora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// com ?e=<clínica> é o link de verdade da clínica: horários e pedido passam pelo banco (vetnature_agenda_publica / _pedir)
const ESP = new URLSearchParams(location.search).get('e');
const PADRAO = { ligado: true, inicio: '08:00', fim: '18:00', intervalo: 30, sabado: true, tipos: ['Consulta', 'Vacina', 'Banho e tosa'] };
let db = ESP ? null : ler(CHAVE, null), ocupadosNuvem = null, hojeNuvem = null;
let cfg = db?.config?.agendaOnline || PADRAO;
let clinica = db?.clinica || 'Clínica Veterinária Bem-Estar Animal', telClinica = db?.config?.telefone || '00900000000';
let vets = (db?.vets || ['Dra. Paula Andrade', 'Dr. Rafael Mota', 'Equipe de estética']);
function script(src) { return new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.append(s); }); }
async function rpc(nome, args) {
  const c = window.NEXO_NUVEM, r = await fetch(`${c.url}/rest/v1/rpc/${nome}`, { method: 'POST', headers: { apikey: c.chave, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('Sem conexão agora. Tente de novo em instantes.');
  return r.json();
}
const st = { nome: '', tel: '', pet: '', especie: 'cao', tipo: '', data: '', hora: '', obs: '' };

function cabecalho(end) { document.title = `Agendar horário · ${clinica}`; $('#nome-clinica').textContent = clinica; $('#info-clinica').textContent = end || 'Escolha o dia e o horário livre'; }
cabecalho([db?.config?.endereco, db?.config?.cidade].filter(Boolean).join(' · '));

function dias() {
  const l = []; let d = hojeNuvem || hoje();
  while (l.length < 12) { const w = new Date(`${d}T12:00:00`).getDay(); if (w !== 0 && (w !== 6 || cfg.sabado)) l.push(d); d = maisDias(d, 1); }
  return l;
}
// horário ocupado: todos os profissionais daquele tipo já têm alguém, ou outro tutor já pediu
function livres(data) {
  const sab = new Date(`${data}T12:00:00`).getDay() === 6, fim = sab ? Math.min(minutos(cfg.fim), 12 * 60) : minutos(cfg.fim);
  const estetica = /banho|tosa/i.test(st.tipo), equipe = vets.filter((v) => (estetica ? !v.startsWith('Dr') : v.startsWith('Dr'))).length || 1;
  const pedidos = ESP ? [] : [...(db?.pedidos || []).filter((p) => p.status === 'novo'), ...ler(FILA, [])];
  const agora = new Date(), minAgora = data === hoje() ? agora.getHours() * 60 + agora.getMinutes() + 60 : -1;
  const l = [];
  for (let m = minutos(cfg.inicio); m <= fim; m += cfg.intervalo) {
    const h = hora(m), marcados = ESP ? (ocupadosNuvem || []).filter((o) => o.data === data && o.hora === h && o.estetica === estetica).length : (db?.agenda || []).filter((a) => a.data === data && a.hora === h && /banho|tosa/i.test(a.tipo) === estetica).length + pedidos.filter((p) => p.data === data && p.hora === h).length;
    l.push({ h, livre: m > minAgora && marcados < equipe });
  }
  return l;
}

function desenhar() {
  if (!st.tipo) st.tipo = cfg.tipos[0];
  if (!cfg.ligado) { $('#pag').innerHTML = `<div class="cartao-ag"><p class="vazio">O agendamento online desta clínica está desligado no momento.</p><a class="bt bt-zap enviar" href="https://wa.me/55${soDigitos(telClinica)}">Falar com a clínica no WhatsApp</a></div>`; return; }
  if (!st.data) st.data = dias()[0];
  const hs = livres(st.data); if (st.hora && !hs.some((x) => x.h === st.hora && x.livre)) st.hora = '';
  $('#pag').innerHTML = `<form class="cartao-ag" novalidate>
    <section class="passo"><h2>O que você precisa?</h2><div class="chips">${cfg.tipos.map((t) => `<button type="button" data-tipo="${esc(t)}" aria-pressed="${st.tipo === t}">${esc(t)}</button>`).join('')}</div></section>
    <section class="passo"><h2>Qual dia?</h2><div class="chips dias">${dias().map((d) => `<button type="button" data-dia="${d}" aria-pressed="${st.data === d}"><small>${d === hoje() ? 'hoje' : semana(d, 'short').replace('.', '')}</small>${d.slice(8)}/${d.slice(5, 7)}</button>`).join('')}</div></section>
    <section class="passo"><h2>Qual horário?</h2><div class="chips">${hs.some((x) => x.livre) ? hs.map((x) => `<button type="button" data-hora="${x.h}" aria-pressed="${st.hora === x.h}" ${x.livre ? '' : 'disabled aria-label="' + x.h + ' ocupado"'}>${x.h}</button>`).join('') : '<p class="vazio">Sem horário livre neste dia. Escolha outro.</p>'}</div></section>
    <section class="passo grade-campos"><h2 class="largo" style="margin:0">Seus dados e do pet</h2>
      <label class="campo largo">Seu nome<input name="nome" autocomplete="name" value="${esc(st.nome)}"></label>
      <label class="campo largo">WhatsApp<input name="tel" inputmode="tel" autocomplete="tel" placeholder="(00) 90000-0000" value="${esc(st.tel)}"></label>
      <label class="campo">Nome do pet<input name="pet" value="${esc(st.pet)}"></label>
      <label class="campo">É um<select name="especie">${[['cao', 'Cão'], ['gato', 'Gato'], ['outro', 'Outro']].map(([v, n]) => `<option value="${v}" ${st.especie === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo largo">Quer contar algo? (opcional)<textarea name="obs" placeholder="Ex.: está vomitando desde ontem">${esc(st.obs)}</textarea></label></section>
    ${st.hora ? `<p class="resumo-ag"><b>${esc(st.tipo)}</b> em ${dataBR(st.data)} (${semana(st.data, 'long')}) às <b>${st.hora}</b></p>` : ''}
    <button class="bt bt-pri enviar">Pedir este horário</button>
    <p class="rodape-ag">A clínica confirma pelo WhatsApp. O horário só fica garantido depois da confirmação.</p></form>`;
}

function guardarCampos() { const f = $('form'); if (!f?.nome) return; ['nome', 'tel', 'pet', 'especie', 'obs'].forEach((k) => { st[k] = f[k].value; }); }
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tipo], button[data-dia], button[data-hora]'); if (!b) return;
  guardarCampos();
  if (b.dataset.tipo) st.tipo = b.dataset.tipo;
  if (b.dataset.dia) st.data = b.dataset.dia;
  if (b.dataset.hora) st.hora = b.dataset.hora;
  desenhar();
});
function mostrarErro(t) { let el = $('.erro-ag'); if (!el) { el = document.createElement('p'); el.className = 'nota erro-ag'; el.setAttribute('role', 'alert'); el.style.cssText = 'background:var(--alerta-claro);color:var(--alerta);margin:0'; $('.enviar').before(el); } el.textContent = t; }
document.addEventListener('submit', async (e) => {
  e.preventDefault(); guardarCampos();
  const falta = !st.hora ? 'Escolha um horário.' : st.nome.trim().length < 3 ? 'Escreva seu nome.' : soDigitos(st.tel).length < 10 ? 'Confira o WhatsApp com DDD.' : !st.pet.trim() ? 'Escreva o nome do pet.' : '';
  if (falta) { mostrarErro(falta); return; }
  const pedido = { id: Math.random().toString(36).slice(2, 10), nome: st.nome.trim(), tel: soDigitos(st.tel), pet: st.pet.trim(), especie: st.especie, tipo: st.tipo, data: st.data, hora: st.hora, obs: st.obs.trim(), status: 'novo', criado: new Date().toISOString() };
  if (ESP) {
    const bt = $('.enviar'); bt.disabled = true; bt.textContent = 'Enviando…';
    try {
      const r = await rpc('vetnature_agenda_pedir', { p_espaco: ESP, p_nome: pedido.nome, p_tel: pedido.tel, p_pet: pedido.pet, p_especie: pedido.especie, p_tipo: pedido.tipo, p_data: pedido.data, p_hora: pedido.hora, p_obs: pedido.obs });
      if (r.erro) throw new Error(r.erro);
    } catch (x) { bt.disabled = false; bt.textContent = 'Pedir este horário'; mostrarErro(x.message); if (/ocupado/.test(x.message)) carregarNuvem(); return; }
  } else try { localStorage.setItem(FILA, JSON.stringify([...ler(FILA, []), pedido])); } catch { /* sem armazenamento: ainda mostra a confirmação */ }
  $('#pag').innerHTML = `<div class="cartao-ag ok"><div class="selo-grande" aria-hidden="true">✓</div><h2>Pedido enviado</h2><p>${esc(pedido.tipo)} do(a) <b>${esc(pedido.pet)}</b> em ${dataBR(pedido.data)} às ${pedido.hora}.<br>A ${esc(clinica)} vai confirmar pelo WhatsApp ${esc(st.tel)}.</p>
    <a class="bt bt-zap enviar" href="https://wa.me/55${soDigitos(telClinica)}?text=${encodeURIComponent(`Olá! Acabei de pedir ${pedido.tipo} para o(a) ${pedido.pet} em ${dataBR(pedido.data)} às ${pedido.hora} pelo site.`)}" target="_blank" rel="noopener">Falar com a clínica agora</a>
    ${ESP ? '' : '<p class="rodape-ag">Demonstração: abra o sistema da clínica (Agenda) para ver o pedido chegar.</p>'}</div>`;
});
async function carregarNuvem() {
  try {
    await script('../../../app/config.js');
    const r = await rpc('vetnature_agenda_publica', { p_espaco: ESP });
    if (r.erro) { clinica = r.nome || 'Clínica veterinária'; cabecalho(); $('#pag').innerHTML = `<div class="cartao-ag"><p class="vazio">${esc(r.erro)}</p>${r.telefone ? `<a class="bt bt-zap enviar" href="https://wa.me/55${soDigitos(r.telefone)}" target="_blank" rel="noopener">Falar com a clínica no WhatsApp</a>` : ''}</div>`; return; }
    clinica = r.nome; telClinica = r.telefone || ''; vets = r.vets?.length ? r.vets : vets; cfg = { ...PADRAO, ...(r.config || {}) }; ocupadosNuvem = r.ocupados || []; hojeNuvem = r.hoje;
    cabecalho([r.endereco, r.cidade].filter(Boolean).join(' · ')); desenhar();
  } catch (x) { $('#pag').innerHTML = `<div class="cartao-ag"><p class="vazio">${esc(x.message)}</p><button type="button" class="bt bt-pri enviar" onclick="location.reload()">Tentar de novo</button></div>`; }
}
// demonstração: o link do WhatsApp mostra a mensagem em vez de abrir o app
document.addEventListener('click', (e) => {
  const l = e.target.closest('a[href*="wa.me/"]'); if (!l || ESP) return; e.preventDefault();
  const msg = new URL(l.href).searchParams.get('text') || '';
  const el = document.createElement('div'); el.className = 'zap-fundo';
  el.innerHTML = `<div class="zap" role="dialog" aria-modal="true" aria-label="Simulação do WhatsApp"><div class="zap-cab"><span class="zap-foto">${esc(clinica[0])}</span><span><b>${esc(clinica)}</b><small>número de exemplo</small></span><button type="button" class="fechar" aria-label="Fechar">×</button></div><div class="zap-conversa"><div class="zap-msg">${esc(msg || 'Olá!')}<span class="zap-hora">agora <span>✓✓</span></span></div></div><p class="zap-nota"><b>Simulação.</b> Nada foi enviado. De verdade, a conversa abre no WhatsApp da clínica.</p><div class="zap-pe"><button type="button" class="bt bt-pri">Fechar</button></div></div>`;
  el.addEventListener('click', (ev) => { if (ev.target === el || ev.target.closest('.fechar, .bt-pri')) el.remove(); });
  document.body.append(el); el.querySelector('.bt-pri').focus();
});
if (ESP) { document.querySelector('.faixa-demo')?.remove(); $('#pag').innerHTML = '<div class="cartao-ag"><p class="vazio">Carregando os horários…</p></div>'; carregarNuvem(); } else desenhar();

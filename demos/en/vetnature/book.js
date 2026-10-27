// VetNature (English demo) · page where the client requests an appointment. The request goes to the clinic's Schedule,
// which confirms by text. In the demo both sides talk through this browser's storage (same site).
const CHAVE = 'vetnature-en-demo-v1', FILA = 'vetnature-en-requests-demo';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ler = (k, pad) => { try { return JSON.parse(localStorage.getItem(k)) ?? pad; } catch { return pad; } };
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const maisDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dataUS = (iso) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };
const semana = (iso, f) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: f });
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const minutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const hora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const hora12 = (h) => { const [a, b] = h.split(':').map(Number); return `${((a + 11) % 12) + 1}:${String(b).padStart(2, '0')} ${a < 12 ? 'AM' : 'PM'}`; };

const db = ler(CHAVE, null);
const cfg = db?.config?.agendaOnline || { ligado: true, inicio: '08:00', fim: '18:00', intervalo: 30, sabado: true, tipos: ['Consultation', 'Vaccine', 'Bath & grooming'] };
const clinica = db?.clinica || 'Riverside Animal Clinic';
const vets = db?.vets || ['Dr. Paula Andrews', 'Dr. Ryan Moore', 'Grooming team'];
const st = { nome: '', tel: '', pet: '', especie: 'cao', tipo: cfg.tipos[0], data: '', hora: '', obs: '' };
document.title = `Book an appointment · ${clinica}`;
$('#nome-clinica').textContent = clinica;
$('#info-clinica').textContent = [db?.config?.endereco, db?.config?.cidade].filter(Boolean).join(' · ') || 'Pick a day and a free time slot';

function dias() {
  const l = []; let d = hoje();
  while (l.length < 12) { const w = new Date(`${d}T12:00:00`).getDay(); if (w !== 0 && (w !== 6 || cfg.sabado)) l.push(d); d = maisDias(d, 1); }
  return l;
}
// a slot is taken when every team member of that kind is booked, or another client already requested it
function livres(data) {
  const sab = new Date(`${data}T12:00:00`).getDay() === 6, fim = sab ? Math.min(minutos(cfg.fim), 12 * 60) : minutos(cfg.fim);
  const estetica = /bath|groom|trim/i.test(st.tipo), equipe = vets.filter((v) => (estetica ? !v.startsWith('Dr') : v.startsWith('Dr'))).length || 1;
  const pedidos = [...(db?.pedidos || []).filter((p) => p.status === 'novo'), ...ler(FILA, [])];
  const agora = new Date(), minAgora = data === hoje() ? agora.getHours() * 60 + agora.getMinutes() + 60 : -1;
  const l = [];
  for (let m = minutos(cfg.inicio); m <= fim; m += cfg.intervalo) {
    const h = hora(m), marcados = (db?.agenda || []).filter((a) => a.data === data && a.hora === h && /bath|groom|trim/i.test(a.tipo) === estetica).length + pedidos.filter((p) => p.data === data && p.hora === h).length;
    l.push({ h, livre: m > minAgora && marcados < equipe });
  }
  return l;
}
function desenhar() {
  if (!cfg.ligado) { $('#pag').innerHTML = '<div class="cartao-ag"><p class="vazio">Online booking for this clinic is turned off right now. Please call or text the clinic.</p></div>'; return; }
  if (!st.data) st.data = dias()[0];
  const hs = livres(st.data); if (st.hora && !hs.some((x) => x.h === st.hora && x.livre)) st.hora = '';
  $('#pag').innerHTML = `<form class="cartao-ag" novalidate>
    <section class="passo"><h2>What do you need?</h2><div class="chips">${cfg.tipos.map((t) => `<button type="button" data-tipo="${esc(t)}" aria-pressed="${st.tipo === t}">${esc(t)}</button>`).join('')}</div></section>
    <section class="passo"><h2>Which day?</h2><div class="chips dias">${dias().map((d) => `<button type="button" data-dia="${d}" aria-pressed="${st.data === d}"><small>${d === hoje() ? 'today' : semana(d, 'short')}</small>${d.slice(5, 7)}/${d.slice(8)}</button>`).join('')}</div></section>
    <section class="passo"><h2>What time?</h2><div class="chips">${hs.some((x) => x.livre) ? hs.map((x) => `<button type="button" data-hora="${x.h}" aria-pressed="${st.hora === x.h}" ${x.livre ? '' : `disabled aria-label="${hora12(x.h)} taken"`}>${hora12(x.h)}</button>`).join('') : '<p class="vazio">No free times this day. Pick another one.</p>'}</div></section>
    <section class="passo grade-campos"><h2 class="largo" style="margin:0">Your details and your pet's</h2>
      <label class="campo largo">Your name<input name="nome" autocomplete="name" value="${esc(st.nome)}"></label>
      <label class="campo largo">Mobile number<input name="tel" inputmode="tel" autocomplete="tel" placeholder="(555) 010-0000" value="${esc(st.tel)}"></label>
      <label class="campo">Pet's name<input name="pet" value="${esc(st.pet)}"></label>
      <label class="campo">It's a<select name="especie">${[['cao', 'Dog'], ['gato', 'Cat'], ['outro', 'Other']].map(([v, n]) => `<option value="${v}" ${st.especie === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo largo">Anything we should know? (optional)<textarea name="obs" placeholder="e.g. vomiting since yesterday">${esc(st.obs)}</textarea></label></section>
    ${st.hora ? `<p class="resumo-ag"><b>${esc(st.tipo)}</b> on ${semana(st.data, 'long')}, ${dataUS(st.data)} at <b>${hora12(st.hora)}</b></p>` : ''}
    <button class="bt bt-pri enviar">Request this time</button>
    <p class="rodape-ag">The clinic confirms by text. Your time is only guaranteed after confirmation.</p></form>`;
}
function guardarCampos() { const f = $('form'); if (!f?.nome) return; ['nome', 'tel', 'pet', 'especie', 'obs'].forEach((k) => { st[k] = f[k].value; }); }
function mostrarErro(t) { let el = $('.erro-ag'); if (!el) { el = document.createElement('p'); el.className = 'nota erro-ag'; el.setAttribute('role', 'alert'); el.style.cssText = 'background:var(--alerta-claro);color:var(--alerta);margin:0'; $('.enviar').before(el); } el.textContent = t; }
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tipo], button[data-dia], button[data-hora]'); if (!b) return;
  guardarCampos();
  if (b.dataset.tipo) st.tipo = b.dataset.tipo;
  if (b.dataset.dia) st.data = b.dataset.dia;
  if (b.dataset.hora) st.hora = b.dataset.hora;
  desenhar();
});
document.addEventListener('submit', (e) => {
  e.preventDefault(); guardarCampos();
  const falta = !st.hora ? 'Pick a time.' : st.nome.trim().length < 3 ? 'Type your name.' : soDigitos(st.tel).length < 10 ? 'Check your mobile number, with area code.' : !st.pet.trim() ? "Type your pet's name." : '';
  if (falta) { mostrarErro(falta); return; }
  const pedido = { id: Math.random().toString(36).slice(2, 10), nome: st.nome.trim(), tel: soDigitos(st.tel), pet: st.pet.trim(), especie: st.especie, tipo: st.tipo, data: st.data, hora: st.hora, obs: st.obs.trim(), status: 'novo', criado: new Date().toISOString() };
  try { localStorage.setItem(FILA, JSON.stringify([...ler(FILA, []), pedido])); } catch { /* no storage: still show the confirmation */ }
  $('#pag').innerHTML = `<div class="cartao-ag ok"><div class="selo-grande" aria-hidden="true">✓</div><h2>Request sent</h2><p>${esc(pedido.tipo)} for <b>${esc(pedido.pet)}</b> on ${dataUS(pedido.data)} at ${hora12(pedido.hora)}.<br>${esc(clinica)} will confirm by text at ${esc(st.tel)}.</p>
    <p class="rodape-ag">Demo: open the clinic software (Schedule) to see the request arrive.</p></div>`;
});
desenhar();

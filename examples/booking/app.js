// Booking page · everything you need to change is in config.js
(function () {
  'use strict';
  var C = window.BOOKING || {}, T = C.text || {};
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var min = function (h) { var p = h.split(':'); return +p[0] * 60 + +p[1]; };
  var hhmm = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  var mostraHora = function (h) { if (C.timeFormat === '24h') return h; var p = h.split(':').map(Number); return ((p[0] + 11) % 12 + 1) + ':' + pad(p[1]) + ' ' + (p[0] < 12 ? 'AM' : 'PM'); };
  var DIAS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var dataDe = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var longa = function (s) { return dataDe(s).toLocaleDateString(LOC, { weekday: 'long', month: 'long', day: 'numeric' }); };
  var LOC = C.locale || 'en-US';
  var servicos = C.services || [];
  var st = { serv: 0, dia: '', hora: '', nome: '', tel: '', email: '', extra: '', notas: '' };

  // look and texts
  var r = document.documentElement.style, cores = C.colors || {};
  if (cores.primary) r.setProperty('--primary', cores.primary);
  if (cores.soft) r.setProperty('--soft', cores.soft);
  if (cores.background) r.setProperty('--bg', cores.background);
  if (cores.text) r.setProperty('--text', cores.text);
  if (C.font && C.font !== 'system') {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(C.font) + ':wght@400;500;600;700&display=swap'; document.head.appendChild(l);
    r.setProperty('--font', "'" + C.font + "', system-ui, sans-serif");
  }
  document.title = (T.title || 'Book an appointment') + ' · ' + (C.business || '');
  $('#negocio').textContent = C.business || 'Book an appointment';
  $('#sub').textContent = [C.tagline, C.address].filter(Boolean).join(' · ');
  $('#logo').innerHTML = C.logo ? '<img src="' + esc(C.logo) + '" alt="">' : esc((C.business || '?').trim().charAt(0).toUpperCase());
  $('#rodape').textContent = T.footer || '';

  // the days with at least one possible time
  function dias() {
    var out = [], d = new Date(); d.setHours(12, 0, 0, 0);
    for (var i = 0; i <= (C.daysAhead || 14); i++) {
      var s = iso(d);
      if ((C.hours || {})[DIAS[d.getDay()]] && (C.closedDates || []).indexOf(s) < 0 && horarios(s).length) out.push(s);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  // start times that fit the chosen service before closing, respecting the minimum notice
  function horarios(s) {
    var h = (C.hours || {})[DIAS[dataDe(s).getDay()]]; if (!h) return [];
    var dur = (servicos[st.serv] || {}).minutes || C.slotMinutes || 30, passo = C.slotMinutes || 30;
    var limite = Date.now() + (C.minNoticeHours || 0) * 3600e3, out = [];
    for (var m = min(h[0]); m + dur <= min(h[1]); m += passo) {
      var quando = dataDe(s); quando.setHours(Math.floor(m / 60), m % 60, 0, 0);
      if (quando.getTime() >= limite) out.push(hhmm(m));
    }
    return out;
  }
  function desenhar() {
    var ds = dias();
    if (!ds.length) { $('#app').innerHTML = '<p class="vazio">' + esc(T.noTimes || 'No times available.') + '</p>'; return; }
    if (ds.indexOf(st.dia) < 0) st.dia = ds[0];
    var hs = horarios(st.dia); if (hs.indexOf(st.hora) < 0) st.hora = '';
    var a = C.askFor || {}, sv = servicos[st.serv] || {};
    $('#app').innerHTML = '<form novalidate class="campos-form">' +
      '<section class="passo"><h2>' + esc(T.step1) + '</h2><div class="chips">' + servicos.map(function (x, i) { return '<button type="button" data-serv="' + i + '" aria-pressed="' + (i === st.serv) + '">' + esc(x.name) + '<small>' + [x.minutes ? x.minutes + ' min' : '', x.price || ''].filter(Boolean).map(esc).join(' · ') + '</small></button>'; }).join('') + '</div></section>' +
      '<section class="passo"><h2>' + esc(T.step2) + '</h2><div class="chips dias">' + ds.map(function (d) { var x = dataDe(d); return '<button type="button" data-dia="' + d + '" aria-pressed="' + (d === st.dia) + '"><small>' + esc(x.toLocaleDateString(LOC, { weekday: 'short' })) + '</small>' + esc(x.toLocaleDateString(LOC, { month: 'short', day: 'numeric' })) + '</button>'; }).join('') + '</div></section>' +
      '<section class="passo"><h2>' + esc(T.step3) + '</h2><div class="chips horas">' + (hs.length ? hs.map(function (h) { return '<button type="button" data-hora="' + h + '" aria-pressed="' + (h === st.hora) + '">' + esc(mostraHora(h)) + '</button>'; }).join('') : '<p class="vazio">' + esc(T.noTimes) + '</p>') + '</div></section>' +
      '<section class="passo"><h2>' + esc(T.step4) + '</h2><div class="campos">' +
        '<label>' + esc(T.name) + '<input name="nome" autocomplete="name" value="' + esc(st.nome) + '"></label>' +
        '<label>' + esc(T.phoneLabel) + '<input name="tel" inputmode="tel" autocomplete="tel" value="' + esc(st.tel) + '"></label>' +
        (a.email ? '<label>' + esc(T.emailLabel) + '<input name="email" type="email" autocomplete="email" value="' + esc(st.email) + '"></label>' : '') +
        (a.extraLabel ? '<label>' + esc(a.extraLabel) + '<input name="extra" value="' + esc(st.extra) + '"></label>' : '') +
        (a.notes ? '<label>' + esc(T.notes) + '<textarea name="notas">' + esc(st.notas) + '</textarea></label>' : '') +
      '</div></section>' +
      (st.hora ? '<p class="resumo"><b>' + esc(sv.name) + '</b> · ' + esc(longa(st.dia)) + ' · <b>' + esc(mostraHora(st.hora)) + '</b></p>' : '') +
      '<button class="enviar">' + esc(T.button) + '</button></form>';
  }
  function guardar() { var f = $('form'); if (!f) return; ['nome', 'tel', 'email', 'extra', 'notas'].forEach(function (k) { if (f[k]) st[k] = f[k].value; }); }
  function erro(t) { var e = $('.erro'); if (!e) { e = document.createElement('p'); e.className = 'erro'; e.setAttribute('role', 'alert'); $('.enviar').before(e); } e.textContent = t; }
  function mensagem() {
    var sv = servicos[st.serv] || {}, a = C.askFor || {};
    return ['New booking request — ' + (C.business || ''), 'Service: ' + sv.name + (sv.price ? ' (' + sv.price + ')' : ''), 'When: ' + longa(st.dia) + ' at ' + mostraHora(st.hora), 'Name: ' + st.nome.trim(), 'Phone: ' + st.tel.trim()]
      .concat(st.email.trim() ? ['Email: ' + st.email.trim()] : []).concat(a.extraLabel && st.extra.trim() ? [a.extraLabel + ': ' + st.extra.trim()] : []).concat(st.notas.trim() ? ['Notes: ' + st.notas.trim()] : []).join('\n');
  }
  function pronto() {
    $('#app').innerHTML = '<div class="ok"><div class="marca" aria-hidden="true">✓</div><h2>' + esc(T.sent) + '</h2><p><b>' + esc((servicos[st.serv] || {}).name) + '</b> · ' + esc(longa(st.dia)) + ' · ' + esc(mostraHora(st.hora)) + '</p><p>' + esc(T.sentNote) + '</p></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-serv], button[data-dia], button[data-hora]'); if (!b) return;
    guardar();
    if (b.dataset.serv) { st.serv = +b.dataset.serv; }
    if (b.dataset.dia) st.dia = b.dataset.dia;
    if (b.dataset.hora) st.hora = b.dataset.hora;
    desenhar();
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault(); guardar();
    var a = C.askFor || {}, tel = st.tel.replace(/\D/g, '');
    var falta = !st.hora ? (T.pickTime || 'Please pick a time.') : st.nome.trim().length < 2 ? (T.needName || 'Please type your name.') : tel.length < 7 ? (T.needPhone || 'Please check your phone number.')
      : (a.email && st.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(st.email.trim())) ? (T.needEmail || 'Please check your email.') : (a.extraLabel && a.extraRequired && !st.extra.trim()) ? (T.needExtra || ('Please fill in: ' + a.extraLabel)) : '';
    if (falta) return erro(falta);
    var msg = mensagem(), destino = String(C.phone || '').replace(/[^\d+]/g, '');
    if (C.sendTo === 'form' && C.formEndpoint) {
      var bt = $('.enviar'); bt.disabled = true;
      fetch(C.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ service: (servicos[st.serv] || {}).name, date: st.dia, time: st.hora, name: st.nome.trim(), phone: st.tel.trim(), email: st.email.trim(), extra: st.extra.trim(), notes: st.notas.trim(), message: msg }) })
        .then(function (r) { if (!r.ok) throw new Error(); pronto(); })
        .catch(function () { bt.disabled = false; erro(T.sendError || 'Could not send right now. Please try again or call us.'); });
      return;
    }
    var url = C.sendTo === 'sms' ? 'sms:' + destino + '?&body=' + encodeURIComponent(msg)
      : C.sendTo === 'whatsapp' ? 'https://wa.me/' + destino.replace('+', '') + '?text=' + encodeURIComponent(msg)
      : 'mailto:' + encodeURIComponent(C.email || '') + '?subject=' + encodeURIComponent('Booking request: ' + (servicos[st.serv] || {}).name + ' on ' + st.dia) + '&body=' + encodeURIComponent(msg);
    window.location.href = url;
    setTimeout(pronto, 600);
  });
  desenhar();
})();

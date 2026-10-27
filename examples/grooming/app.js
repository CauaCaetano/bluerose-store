// Local business page · everything you need to change is in config.js
(function () {
  'use strict';
  var S = window.SITE || {}, T = S.text || {};
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tel = String(S.phone || '').replace(/[^\d+]/g, ''), telVer = S.phoneDisplay || (/^\+1\d{10}$/.test(tel) ? '(' + tel.slice(2, 5) + ') ' + tel.slice(5, 8) + '-' + tel.slice(8) : S.phone), wa = String(S.whatsapp || '').replace(/\D/g, '');
  var IC = {
    ligar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  };
  var btLigar = function (cls) { return tel ? '<a class="bt ' + cls + '" href="tel:' + esc(tel) + '">' + IC.ligar + esc(T.call || 'Call') + '</a>' : ''; };
  var btTexto = function (cls) { return tel && S.showText ? '<a class="bt ' + cls + '" href="sms:' + esc(tel) + '">' + IC.msg + esc(T.textUs || 'Text us') + '</a>' : ''; };
  var btWa = function (cls) { return wa ? '<a class="bt ' + cls + '" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' + IC.msg + esc(T.whatsapp || 'WhatsApp') + '</a>' : ''; };
  var btAgenda = function (cls) { return S.bookingLink ? '<a class="bt ' + cls + '" href="' + esc(S.bookingLink) + '">' + IC.agenda + esc(T.book || 'Book online') + '</a>' : ''; };

  // look, title, description and Google data
  var r = document.documentElement.style, c = S.colors || {};
  [['primary', '--primary'], ['accent', '--accent'], ['background', '--bg'], ['soft', '--soft'], ['text', '--text']].forEach(function (x) { if (c[x[0]]) r.setProperty(x[1], c[x[0]]); });
  if (S.font && S.font !== 'system') { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(S.font) + ':wght@400;500;600;700;800&display=swap'; document.head.appendChild(l); r.setProperty('--font', "'" + S.font + "', system-ui, sans-serif"); }
  document.documentElement.lang = S.locale || 'en';
  document.title = S.business + (S.kind ? ' · ' + S.kind : '') + (S.address ? ' in ' + S.address.split(',').slice(-2, -1).join('').trim() : '');
  document.querySelector('meta[name=description]').content = S.intro || S.headline || '';
  var ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: S.business, description: S.intro, telephone: S.phone, email: S.email, address: S.address, url: location.href.split('#')[0],
    aggregateRating: (S.reviews || []).length ? { '@type': 'AggregateRating', ratingValue: ((S.reviews || []).reduce(function (a, x) { return a + (x.stars || 5); }, 0) / S.reviews.length).toFixed(1), reviewCount: S.reviews.length } : undefined });
  document.head.appendChild(ld);

  // top bar
  $('#nome').textContent = S.business || '';
  $('#logo').innerHTML = S.logo ? '<img src="' + esc(S.logo) + '" alt="">' : esc((S.business || '?').trim().charAt(0));
  var secoes = [['services', T.services], [(S.reviews || []).length ? 'reviews' : '', T.reviews], ['about', S.aboutTitle], [(S.faq || []).length ? 'faq' : '', T.faq], ['contact', T.contact]].filter(function (x) { return x[0] && x[1]; });
  $('#links').innerHTML = secoes.map(function (x) { return '<a href="#' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('');
  var lt = $('#ligar-topo'); if (tel) { lt.href = 'tel:' + tel; lt.innerHTML = IC.ligar + esc(T.call || 'Call'); } else lt.remove();

  // without a hero photo: a quick-info card (rating, hours, phone) instead of an empty image
  function cartaoInfo() {
    var rv = S.reviews || [], media = rv.length ? rv.reduce(function (s, x) { return s + (x.stars || 5); }, 0) / rv.length : 0;
    return '<aside class="info-card">' + (rv.length ? '<div class="nota"><b>' + media.toFixed(1) + '</b>' + estrelas(Math.round(media)) + '<small>' + rv.length + ' ' + esc(T.reviewsCount || 'reviews') + '</small></div>' : '') +
      ((S.hours || []).length ? '<div class="linha-info"><small>' + esc(T.hours) + '</small>' + S.hours.map(function (h) { return '<div><span>' + esc(h[0]) + '</span><b>' + esc(h[1]) + '</b></div>'; }).join('') + '</div>' : '') +
      (S.phone ? '<a class="bt bt-pri" href="tel:' + esc(tel) + '">' + IC.ligar + esc(telVer) + '</a>' : '') + '</aside>';
  }
  // page
  var estrelas = function (n) { n = Math.max(0, Math.min(5, n || 5)); return '<span class="estrelas" aria-label="' + n + ' out of 5 stars">' + '★★★★★'.slice(0, n) + '<span style="opacity:.3">' + '★★★★★'.slice(0, 5 - n) + '</span></span>'; };
  $('#topo').innerHTML =
    '<section class="heroi"><div class="wrap heroi-in"><div><h1>' + esc(S.headline) + '</h1><p>' + esc(S.intro) + '</p><div class="bts">' + btLigar('bt-pri') + btAgenda('bt-sec') + btTexto('bt-sec') + btWa('bt-sec') + '</div>' +
      ((S.highlights || []).length ? '<ul class="selos">' + S.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
      (S.heroImage ? '<div class="foto-heroi"><img src="' + esc(S.heroImage) + '" alt="' + esc(S.business) + '"></div>' : cartaoInfo()) + '</div></section>' +
    '<section id="services"><div class="wrap"><h2>' + esc(T.services) + '</h2><p class="sub">' + esc(S.kind || '') + (S.address ? ' · ' + esc(S.address) : '') + '</p><div class="servicos">' +
      (S.services || []).map(function (s) { return '<article class="serv"><h3>' + esc(s.name) + (s.price ? '<span>' + esc(s.price) + '</span>' : '') + '</h3>' + (s.text ? '<p>' + esc(s.text) + '</p>' : '') + '</article>'; }).join('') + '</div></div></section>' +
    ((S.reviews || []).length ? '<section id="reviews"><div class="wrap"><h2>' + esc(T.reviews) + '</h2><p class="sub"></p><div class="reviews">' + S.reviews.map(function (x) { return '<figure class="rev">' + estrelas(x.stars) + '<blockquote>' + esc(x.text) + '</blockquote><figcaption>' + esc(x.name) + '</figcaption></figure>'; }).join('') + '</div></div></section>' : '') +
    ((S.gallery || []).length ? '<section id="gallery"><div class="wrap"><h2>' + esc(T.gallery) + '</h2><p class="sub"></p><div class="galeria">' + S.gallery.map(function (g) { return '<img src="' + esc(g) + '" alt="" loading="lazy">'; }).join('') + '</div></div></section>' : '') +
    '<section id="about"><div class="wrap duas"><div><h2>' + esc(S.aboutTitle) + '</h2><p>' + esc(S.about) + '</p></div><div class="horas"><h3>' + esc(T.hours) + '</h3>' + (S.hours || []).map(function (h) { return '<div><span>' + esc(h[0]) + '</span><b>' + esc(h[1]) + '</b></div>'; }).join('') + '</div></div></section>' +
    ((S.faq || []).length ? '<section id="faq"><div class="wrap faq"><h2>' + esc(T.faq) + '</h2><p class="sub"></p>' + S.faq.map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div></section>' : '') +
    '<section class="contato" id="contact"><div class="wrap"><h2>' + esc(T.contact) + '</h2><p>' + esc(S.address) + '</p><div class="bts">' + btLigar('bt-pri') + (S.mapsLink ? '<a class="bt bt-sec" href="' + esc(S.mapsLink) + '" target="_blank" rel="noopener">' + IC.mapa + esc(T.directions) + '</a>' : '') + (S.email ? '<a class="bt bt-sec" href="mailto:' + esc(S.email) + '">' + IC.msg + esc(T.emailUs) + '</a>' : '') + btAgenda('bt-sec') + '</div></div></section>';
  $('#rodape').textContent = '© ' + new Date().getFullYear() + ' ' + (S.business || '') + (S.address ? ' · ' + S.address : '');
  $('#fixo').innerHTML = btLigar('bt-pri') + (S.bookingLink ? btAgenda('bt-sec') : btTexto('bt-sec') || btWa('bt-sec'));
  if (!$('#fixo').innerHTML) $('#fixo').remove();
})();

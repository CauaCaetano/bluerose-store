// Bastos Lacerda · comportamento comum das páginas (PT e EN):
// topo transparente que fica sólido ao rolar, menu do celular, entrada suave das seções, diretório da equipe com filtros,
// perfil individual (advogado.html?id=), central de Insights com busca e categorias, página do artigo (artigo.html?id=),
// formulários de contato e de candidatura (validam e montam a mensagem; nada é gravado nem enviado pelo site).
// Dados: equipe.js (25 perfis de exemplo), artigos.js e dados.js (nomes das áreas e setores).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var sem = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body, BASE = body.dataset.base || '', EN = body.dataset.lingua === 'en';
  var EQ = window.BL_EQUIPE || [], ART = window.BL_ARTIGOS || [], AR = window.BL_AREAS || {}, SE = window.BL_SETORES || {};
  var porId = {}; EQ.forEach(function (p) { porId[p.id] = p; });
  var q = new URLSearchParams(location.search);
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var dataPT = function (s) { var d = s.split('-'); return +d[2] + ' de ' + MESES[+d[1] - 1] + ' de ' + d[0]; };
  var nomeArea = function (k) { return AR[k] ? (EN ? AR[k].en : AR[k].nome) : k; };
  var nomeSetor = function (k) { return SE[k] ? (EN ? SE[k].en : SE[k].nome) : k; };
  var SETA = '<span class="seta" aria-hidden="true">→</span>';
  document.documentElement.classList.add('js');

  // ---------- páginas em inglês (en/): a moldura da Blue Rose aponta para ../../; aqui a raiz fica um nível acima ----------
  if (BASE) {
    var ajusta = function (a) { var h = a.getAttribute('href'); if (h && h.indexOf('../../') === 0 && !a.__aj) { a.__aj = true; a.setAttribute('href', '../' + h); } };
    $$('.br-pill a').forEach(ajusta);
    new MutationObserver(function () { $$('.br-sim-cta, .br-pill a').forEach(ajusta); }).observe(body, { childList: true });
  }

  // ---------- topo: transparente na abertura, sólido ao rolar ----------
  var topo = $('#topo');
  function rolou() { topo.classList.toggle('solido', scrollY > 40); }
  rolou(); addEventListener('scroll', rolou, { passive: true });

  // ---------- menu do celular ----------
  var bm = $('#abrir-menu'), gav = $('#gaveta');
  function gaveta(abrir) {
    gav.hidden = !abrir; bm.setAttribute('aria-expanded', String(abrir));
    bm.setAttribute('aria-label', abrir ? (EN ? 'Close menu' : 'Fechar o menu') : (EN ? 'Open menu' : 'Abrir o menu'));
    body.classList.toggle('gav-aberta', abrir);
  }
  bm.addEventListener('click', function () { gaveta(gav.hidden); });
  gav.addEventListener('click', function (e) { if (e.target.closest('a')) gaveta(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gav.hidden) { gaveta(false); bm.focus(); } });
  addEventListener('resize', function () { if (innerWidth > 1180 && !gav.hidden) gaveta(false); });
  // seletor de idioma: "PT" ou "EN" da página atual não recarrega
  document.addEventListener('click', function (e) { var a = e.target.closest('.idi a[aria-current="true"]'); if (a) e.preventDefault(); });
  // na página de perfil, EN leva ao diretório em inglês já com o perfil aberto
  if (q.get('id')) $$('.idi a[data-idi="en"]').forEach(function (a) { if (/team\.html$/.test(a.getAttribute('href'))) a.setAttribute('href', a.getAttribute('href') + '?id=' + encodeURIComponent(q.get('id'))); });

  // ---------- entrada suave ----------
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function observar(raiz) { $$('.surge:not(.visto), .borrar:not(.visto)', raiz).forEach(function (el, i) { if (!obs || calmo) { el.classList.add('visto'); return; } if (el.classList.contains('surge')) el.style.transitionDelay = (i % 4) * 0.08 + 's'; obs.observe(el); }); }
  observar(document);

  // ---------- cartões gerados no navegador ----------
  function cardEq(p, botao) {
    var areas = p.areas.map(nomeArea).join(' · ');
    var miolo = '<figure><img src="' + BASE + 'img/' + p.foto + '.webp" alt="' + esc(p.nome) + '" width="720" height="900" loading="lazy"></figure><h3>' + esc(p.nome) + '</h3><span class="cargo">' + esc(EN ? p.cargo_en : p.cargo) + '</span><span class="eq-areas">' + esc(areas) + '</span>';
    var at = ' data-areas="' + p.areas.join(' ') + '" data-setores="' + p.setores.join(' ') + '" data-cat="' + p.cat + '" data-nome="' + esc(p.nome) + '"';
    return botao ? '<button type="button" class="eq-c surge" data-perfil="' + p.id + '"' + at + '>' + miolo + '</button>' : '<a class="eq-c surge" href="advogado.html?id=' + p.id + '"' + at + '>' + miolo + '</a>';
  }
  function cardArt(a) {
    return '<a class="art-c surge" href="artigo.html?id=' + a.id + '"><figure><img src="img/' + a.img + '.webp" alt="" width="1600" height="1000" loading="lazy"></figure><p class="meta"><span class="cat">' + esc(nomeArea(a.area)) + '</span><span>' + dataPT(a.data) + '</span><span>' + a.min + ' min de leitura</span></p><h3>' + esc(a.titulo) + '</h3><p>' + esc(a.resumo) + '</p></a>';
  }
  var ORD = { socio: 0, coordenador: 1, advogado: 2 };
  var ordenar = function (l) { return l.slice().sort(function (a, b) { return ORD[a.cat] - ORD[b.cat] || EQ.indexOf(a) - EQ.indexOf(b); }); };

  // versão em inglês: grades montadas a partir do equipe.js, cartão abre o perfil numa janela
  $$('[data-en-equipe]').forEach(function (g) {
    var l = ordenar(EQ); if (g.dataset.enEquipe === 'socio') l = l.filter(function (p) { return p.cat === 'socio'; }).slice(0, 8);
    g.innerHTML = l.map(function (p) { return cardEq(p, g.id === 'diretorio'); }).join('');
    if (g.id !== 'diretorio') $$('a.eq-c', g).forEach(function (a) { a.setAttribute('href', 'team.html?id=' + a.getAttribute('href').split('id=')[1]); });
    observar(g);
  });
  var jan = $('#janela-perfil');
  function abrirPerfilEN(id) {
    var p = porId[id]; if (!p || !jan) return;
    $('#janela-in').innerHTML = '<img src="' + BASE + 'img/' + p.foto + '.webp" alt="' + esc(p.nome) + '" width="720" height="900"><div><p class="rotulo">' + esc(p.cargo_en) + '</p><h2 id="jp-nome">' + esc(p.nome) + '</h2>' +
      '<dl class="ficha"><div><dt>Bar registration</dt><dd>' + esc(p.oab.replace('(exemplo)', '(example)')) + '</dd></div><div><dt>Languages</dt><dd>' + esc(p.idiomas.map(function (x) { return { 'Português': 'Portuguese', 'Inglês': 'English', 'Espanhol': 'Spanish', 'Francês': 'French', 'Italiano': 'Italian', 'Alemão': 'German', 'Japonês': 'Japanese', 'Árabe': 'Arabic' }[x] || x; }).join(', ')) + '</dd></div>' +
      '<div><dt>Practice areas</dt><dd>' + p.areas.map(function (a) { return '<a href="practice-areas.html#' + a + '">' + esc(nomeArea(a)) + '</a>'; }).join(', ') + '</dd></div><div><dt>Sectors</dt><dd>' + p.setores.map(function (s) { return '<a href="sectors.html#' + s + '">' + esc(nomeSetor(s)) + '</a>'; }).join(', ') + '</dd></div></dl>' +
      '<p class="bio">' + esc(p.bio_en) + '</p><p class="aviso" style="margin-top:16px">Example profile: name, registration, education and photo are illustrative.</p><div class="acoes"><a class="btn" href="#" data-wa="Hello, Bastos Lacerda Advogados. I would like to schedule a conversation with ' + esc(p.nome) + '.">Contact ' + esc(p.nome.split(' ')[0]) + ' ' + SETA + '</a><a class="btn btn-linha" href="../advogado.html?id=' + p.id + '" hreflang="pt-BR">Full profile (Portuguese)</a></div></div>';
    if (jan.showModal) jan.showModal(); else jan.setAttribute('open', '');
  }
  if (jan) {
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-perfil]'); if (b) abrirPerfilEN(b.dataset.perfil); });
    jan.addEventListener('click', function (e) { if (e.target === jan || e.target.closest('.fechar')) jan.close(); });
    if (q.get('id')) setTimeout(function () { abrirPerfilEN(q.get('id')); }, 50);
  }

  // ---------- diretório da equipe (filtros por nome, área, setor e categoria) ----------
  var dir = $('#diretorio');
  if (dir) {
    var fNome = $('#f-nome'), fArea = $('#f-area'), fSetor = $('#f-setor'), cat = '';
    if (q.get('area') && AR[q.get('area')]) fArea.value = q.get('area');
    if (q.get('setor') && SE[q.get('setor')]) fSetor.value = q.get('setor');
    if (/^(socio|coordenador|advogado)$/.test(q.get('cat') || '')) cat = q.get('cat');
    var filtrar = function () {
      var t = sem(fNome.value.trim()), a = fArea.value, s = fSetor.value, n = 0;
      $$('.eq-c', dir).forEach(function (c) {
        var ok = (!t || sem(c.dataset.nome).indexOf(t) > -1) && (!a || c.dataset.areas.split(' ').indexOf(a) > -1) && (!s || c.dataset.setores.split(' ').indexOf(s) > -1) && (!cat || c.dataset.cat === cat);
        c.hidden = !ok; if (ok) { n++; c.classList.add('visto'); }
      });
      $$('.segmentos [data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === cat)); });
      $('#eq-conta').textContent = EN ? n + (n === 1 ? ' person' : ' people') : n + (n === 1 ? ' integrante' : ' integrantes');
      var algum = t || a || s || cat;
      $('#eq-limpar').hidden = !algum; $('#eq-vazio').hidden = n > 0; dir.hidden = n === 0;
    };
    var limpar = function () { fNome.value = ''; fArea.value = ''; fSetor.value = ''; cat = ''; filtrar(); };
    fNome.addEventListener('input', filtrar); fArea.addEventListener('change', filtrar); fSetor.addEventListener('change', filtrar);
    $$('.segmentos [data-cat]').forEach(function (b) { b.addEventListener('click', function () { cat = b.dataset.cat; filtrar(); }); });
    $('#eq-limpar').addEventListener('click', limpar); $('#eq-vazio [data-limpar]').addEventListener('click', limpar);
    filtrar();
  }

  // ---------- perfil individual ----------
  var perfil = $('#perfil');
  if (perfil) {
    var p = porId[q.get('id')] || null;
    if (!p) {
      perfil.innerHTML = '<section class="perfil-cab"><div><p class="rotulo">Equipe</p><h1>Perfil não encontrado</h1><p class="cargo">Escolha um integrante no diretório da equipe.</p><div class="acoes"><a class="btn" href="equipe.html">Abrir o diretório ' + SETA + '</a></div></div></section>';
    } else {
      document.title = p.nome + ' · ' + p.cargo + ' · Bastos Lacerda Advogados';
      var md = $('meta[name="description"]'); if (md) md.setAttribute('content', p.nome + ', ' + p.cargo.toLowerCase() + ' do Bastos Lacerda Advogados (perfil de exemplo). ' + p.bio);
      perfil.innerHTML = '<section class="perfil-cab"><figure><img src="img/' + p.foto + '.webp" alt="' + esc(p.nome) + '" width="720" height="900" fetchpriority="high"></figure><div>' +
        '<nav class="trilha" aria-label="Você está em"><a href="index.html">Início</a> <span aria-hidden="true">/</span> <a href="equipe.html">Equipe</a> <span aria-hidden="true">/</span> <span aria-current="page">' + esc(p.nome) + '</span></nav>' +
        '<h1>' + esc(p.nome) + '</h1><p class="cargo">' + esc(p.cargo) + '</p><p class="bio">' + esc(p.bio) + '</p>' +
        '<dl class="ficha"><div><dt>Registro</dt><dd>' + esc(p.oab) + '</dd></div><div><dt>Idiomas</dt><dd>' + esc(p.idiomas.join(', ')) + '</dd></div>' +
        '<div><dt>Áreas</dt><dd>' + p.areas.map(function (a) { return '<a href="area-' + a + '.html">' + esc(nomeArea(a)) + '</a>'; }).join(', ') + '</dd></div>' +
        '<div><dt>Setores</dt><dd>' + p.setores.map(function (s) { return '<a href="setor-' + s + '.html">' + esc(nomeSetor(s)) + '</a>'; }).join(', ') + '</dd></div>' +
        '<div style="grid-column:1/-1"><dt>Formação</dt><dd><ul>' + p.formacao.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul></dd></div></dl>' +
        '<p class="aviso" style="margin-top:22px">Perfil de exemplo: nome, registro na OAB, formação e foto são ilustrativos.</p>' +
        '<div class="acoes"><a class="btn" href="#" data-wa="Olá, Bastos Lacerda Advogados. Gostaria de agendar uma conversa com ' + esc(p.nome) + '.">Falar com ' + esc(p.nome.split(' ')[0]) + ' ' + SETA + '</a><a class="btn btn-linha" href="equipe.html?area=' + p.areas[0] + '">Equipe de ' + esc(nomeArea(p.areas[0])) + '</a></div></div></section>';
      var arts = ART.filter(function (a) { return a.autor === p.id; });
      arts = arts.concat(ART.filter(function (a) { return a.autor !== p.id && p.areas.indexOf(a.area) > -1; })).concat(ART.filter(function (a) { return a.autor !== p.id && p.areas.indexOf(a.area) < 0 && a.setores.some(function (s) { return p.setores.indexOf(s) > -1; }); }));
      if (arts.length) $('#perfil-arts').innerHTML = arts.slice(0, 3).map(cardArt).join('');
      var outros = ordenar(EQ.filter(function (x) { return x.id !== p.id && x.areas.some(function (a) { return p.areas.indexOf(a) > -1; }); })).slice(0, 4);
      if (outros.length) $('#perfil-outros').innerHTML = outros.map(function (x) { return cardEq(x); }).join('');
      $('#pp-t').textContent = ART.some(function (a) { return a.autor === p.id; }) ? 'Publicações de ' + p.nome.split(' ')[0] + ' e da área' : 'Publicações da área';
      observar(document);
    }
  }

  // ---------- central de Insights ----------
  var lista = $('#lista-insights');
  if (lista) {
    var iBusca = $('#i-busca'), area = '';
    if (q.get('area') && $('.segmentos [data-area="' + q.get('area') + '"]')) area = q.get('area');
    var filtraI = function () {
      var t = sem(iBusca.value.trim()), n = 0;
      $$('.art-c', lista).forEach(function (c) { var ok = (!area || c.dataset.area === area) && (!t || sem(c.dataset.busca).indexOf(t) > -1); c.hidden = !ok; if (ok) { n++; c.classList.add('visto'); } });
      $$('.segmentos [data-area]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.area === area)); });
      $('#i-conta').textContent = n + (n === 1 ? ' artigo' : ' artigos');
      $('#i-limpar').hidden = !(t || area); $('#i-vazio').hidden = n > 0; lista.hidden = n === 0;
    };
    var limpaI = function () { iBusca.value = ''; area = ''; filtraI(); };
    iBusca.addEventListener('input', filtraI);
    $$('.segmentos [data-area]').forEach(function (b) { b.addEventListener('click', function () { area = b.dataset.area; filtraI(); }); });
    $('#i-limpar').addEventListener('click', limpaI); $('#i-vazio [data-limpar]').addEventListener('click', limpaI);
    filtraI();
  }

  // ---------- página do artigo ----------
  var art = $('#artigo');
  if (art) {
    var a = ART.filter(function (x) { return x.id === q.get('id'); })[0];
    if (!a) {
      art.innerHTML = '<header class="artigo-cab"><nav class="trilha" aria-label="Você está em"><a href="index.html">Início</a> <span aria-hidden="true">/</span> <a href="insights.html">Insights</a></nav><h1>Artigo não encontrado</h1><p class="resumo">Veja a lista completa de artigos do Insights.</p><div class="acoes"><a class="btn" href="insights.html">Ver os artigos ' + SETA + '</a></div></header>';
    } else {
      var au = porId[a.autor];
      document.title = a.titulo + ' · Insights · Bastos Lacerda Advogados';
      var md2 = $('meta[name="description"]'); if (md2) md2.setAttribute('content', a.resumo);
      var corpo = '', lista2 = null;
      a.corpo.forEach(function (b) {
        if (b.indexOf('- ') === 0) { if (!lista2) { lista2 = []; } lista2.push('<li>' + esc(b.slice(2)) + '</li>'); return; }
        if (lista2) { corpo += '<ul>' + lista2.join('') + '</ul>'; lista2 = null; }
        corpo += b.indexOf('## ') === 0 ? '<h2>' + esc(b.slice(3)) + '</h2>' : '<p>' + esc(b) + '</p>';
      });
      if (lista2) corpo += '<ul>' + lista2.join('') + '</ul>';
      art.innerHTML = '<header class="artigo-cab"><nav class="trilha" aria-label="Você está em"><a href="index.html">Início</a> <span aria-hidden="true">/</span> <a href="insights.html">Insights</a> <span aria-hidden="true">/</span> <a href="insights.html?area=' + a.area + '">' + esc(nomeArea(a.area)) + '</a></nav>' +
        '<p class="meta"><span class="cat">' + esc(nomeArea(a.area)) + '</span><span>' + dataPT(a.data) + '</span><span>' + a.min + ' min de leitura</span></p><h1>' + esc(a.titulo) + '</h1><p class="resumo">' + esc(a.resumo) + '</p>' +
        '<a class="autor" href="advogado.html?id=' + au.id + '"><img src="img/' + au.foto + '.webp" alt="" width="56" height="56"><span><b>' + esc(au.nome) + '</b><span>' + esc(au.cargo) + ' · ' + esc(nomeArea(au.areas[0])) + '</span></span></a></header>' +
        '<figure class="artigo-foto"><img src="img/' + a.img + '.webp" alt="" width="1600" height="686" fetchpriority="high"></figure>' +
        '<div class="artigo-corpo"><div class="texto">' + corpo + '<p class="aviso">Conteúdo informativo, elaborado com base na legislação indicada na data de publicação. Não constitui parecer nem substitui a análise jurídica de cada situação.</p></div>' +
        '<aside class="artigo-lado"><div class="caixa"><h2>Referências legais</h2><ul>' + a.refs.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="caixa"><h2>Setores relacionados</h2><ul class="chips">' + a.setores.map(function (s) { return '<li><a href="setor-' + s + '.html">' + esc(nomeSetor(s)) + '</a></li>'; }).join('') + '</ul></div>' +
        '<div class="caixa"><h2>Quer conversar sobre o tema?</h2><p>A equipe de ' + esc(nomeArea(a.area)) + ' pode explicar como o assunto se aplica à sua empresa.</p><a class="btn" href="contato.html?area=' + a.area + '">Fale com o escritório ' + SETA + '</a></div></aside></div>';
      var rel = ART.filter(function (x) { return x.id !== a.id && (x.area === a.area || x.setores.some(function (s) { return a.setores.indexOf(s) > -1; })); });
      rel = rel.concat(ART.filter(function (x) { return x.id !== a.id && rel.indexOf(x) < 0; })).slice(0, 3);
      $('#art-relacionados').innerHTML = rel.map(cardArt).join('');
      observar(document);
    }
  }

  // ---------- formulários ----------
  function erro(campo, msg) {
    var e = campo.parentNode.querySelector('.erro');
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    return !msg;
  }
  function validar(form) {
    var ok = true, primeiro = null;
    $$('[required]', form).forEach(function (c) {
      if (c.type === 'checkbox') return;
      var v = c.value.trim(), m = '';
      if (!v) m = EN ? 'Please fill in this field.' : 'Preencha este campo.';
      else if (c.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = EN ? 'Please enter a valid e-mail address.' : 'Informe um e-mail válido.';
      if (!erro(c, m)) { ok = false; primeiro = primeiro || c; }
    });
    var chk = $('input[type="checkbox"][required]', form), ce = chk && document.getElementById(chk.id + '-erro');
    if (chk) { if (ce) ce.hidden = chk.checked; if (!chk.checked) { ok = false; primeiro = primeiro || chk; } }
    if (primeiro) primeiro.focus();
    return ok;
  }
  $$('form.form [required]').forEach(function (c) { c.addEventListener(c.tagName === 'SELECT' || c.type === 'checkbox' ? 'change' : 'input', function () { if (c.type === 'checkbox') { var ce = document.getElementById(c.id + '-erro'); if (ce && c.checked) ce.hidden = true; } else if (c.getAttribute('aria-invalid') === 'true') erro(c, ''); }); });
  function pronto(caixa, msg, assunto, email) {
    var mail = 'mailto:' + email + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(msg);
    caixa.innerHTML = '<p><b>' + (EN ? 'Your message is ready.' : 'Sua mensagem está pronta.') + '</b> ' + (EN ? 'Nothing has been sent yet: choose how you want to send it.' : 'Nada foi enviado ainda: escolha por onde quer enviar.') + '</p>' +
      '<div class="acoes" style="margin-top:14px"><a class="btn" href="#" data-wa="' + esc(msg) + '">' + (EN ? 'Send via WhatsApp' : 'Enviar pelo WhatsApp') + '</a><a class="btn btn-linha" href="' + esc(mail) + '">' + (EN ? 'Send by e-mail' : 'Enviar por e-mail') + '</a></div>';
    caixa.hidden = false; caixa.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'nearest' });
  }

  var fc = $('#form-contato');
  if (fc) {
    var sel = $('#f-assunto');
    if (q.get('area') && $('option[value="area:' + q.get('area') + '"]', sel)) sel.value = 'area:' + q.get('area');
    if (q.get('setor') && $('option[value="setor:' + q.get('setor') + '"]', sel)) sel.value = 'setor:' + q.get('setor');
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validar(fc)) return;
      var v = function (id) { return $('#' + id).value.trim(); };
      var assunto = sel.options[sel.selectedIndex].text;
      var msg = EN
        ? 'Hello, Bastos Lacerda Advogados. My name is ' + v('f-nome-c') + ', from ' + v('f-emp') + '. I would like to schedule a conversation about: ' + assunto + '.' + (v('f-msg') ? '\nContext: ' + v('f-msg') : '') + '\nE-mail: ' + v('f-email') + (v('f-tel') ? '\nPhone: ' + v('f-tel') : '')
        : 'Olá, Bastos Lacerda Advogados. Meu nome é ' + v('f-nome-c') + ', da empresa ' + v('f-emp') + '. Gostaria de agendar uma conversa sobre: ' + assunto + '.' + (v('f-msg') ? '\nContexto: ' + v('f-msg') : '') + '\nE-mail: ' + v('f-email') + (v('f-tel') ? '\nTelefone: ' + v('f-tel') : '');
      pronto($('#f-pronto'), msg, (EN ? 'Contact request: ' : 'Pedido de contato: ') + assunto, 'contato@bastoslacerda.exemplo');
    });
  }

  var fk = $('#form-carreira');
  if (fk) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vaga]'); if (!b) return;
      $('#c-vaga').value = b.dataset.vaga; erro($('#c-vaga'), '');
      $('#candidatura').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
      setTimeout(function () { $('#c-nome').focus({ preventScroll: true }); }, calmo ? 0 : 600);
    });
    fk.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validar(fk)) return;
      var v = function (id) { return $('#' + id).value.trim(); };
      var msg = 'Olá, Bastos Lacerda Advogados. Meu nome é ' + v('c-nome') + ' e gostaria de me candidatar à vaga: ' + v('c-vaga') + '.' + (v('c-area') ? '\nÁrea de interesse: ' + v('c-area') : '') + (v('c-link') ? '\nCurrículo: ' + v('c-link') : '') + (v('c-msg') ? '\nSobre mim: ' + v('c-msg') : '') + '\nE-mail: ' + v('c-email') + (v('c-tel') ? '\nTelefone: ' + v('c-tel') : '') + '\n(Currículo em anexo.)';
      pronto($('#c-pronto'), msg, 'Candidatura: ' + v('c-vaga'), 'carreiras@bastoslacerda.exemplo');
    });
  }
})();

/* Basalto Advocacia Criminal · comportamento do site (sem bibliotecas) */
(function () {
  'use strict';
  var doc = document, B = window.BASALTO || { areas: {}, equipe: [], artigos: [] };
  doc.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var MARCA = doc.body.dataset.marca || 'Basalto Advocacia Criminal';
  var TEL = '+552100000000';
  var ICO_TEL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var ICO_WA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.3 18.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.2c.3 2.4 2.4 4.5 4.8 4.8l1-1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function wa(msg) { if (window.BR_WA) window.BR_WA(msg); else location.href = 'https://wa.me/552100000000?text=' + encodeURIComponent(msg); }
  function data(iso) { var p = iso.split('-'); var m = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']; return +p[2] + ' de ' + m[+p[1] - 1] + ' de ' + p[0]; }
  function pessoa(id) { return B.equipe.filter(function (e) { return e.id === id; })[0]; }

  // ---------- topo sólido ao rolar e barra do plantão no celular ----------
  var topo = $('.topo'), pend = false;
  function rolar() {
    pend = false;
    if (topo) topo.classList.toggle('solido', scrollY > 30);
  }
  // o botão flutuante do plantão desce quando a faixa da Blue Rose se esconde e sobe quando ela volta
  function olharPilula() {
    var pill = $('.br-pill');
    if (!pill) return setTimeout(olharPilula, 300);
    var ver = function () {
      var oculta = pill.classList.contains('br-pill-esconde');
      doc.body.classList.toggle('pill-oculta', oculta);
      // fica 12 px acima da faixa (a faixa fica a 14 px do rodapé da tela e muda de altura conforme a largura)
      doc.documentElement.style.setProperty('--flutua-b', (oculta ? 18 : pill.offsetHeight + 14 + 12) + 'px');
    };
    new MutationObserver(ver).observe(pill, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', ver); ver();
  }
  olharPilula();
  addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(rolar); } }, { passive: true });
  rolar();

  // ---------- menu do celular ----------
  var menu = $('#menu'), focoMenu = null;
  function abrirMenu() { if (!menu) return; focoMenu = doc.activeElement; menu.hidden = false; doc.body.style.overflow = 'hidden'; $$('.menu-bt').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); }); $('.menu-fecha', menu).focus(); }
  function fecharMenu() { if (!menu || menu.hidden) return; menu.hidden = true; doc.body.style.overflow = ''; $$('.menu-bt').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); if (focoMenu) focoMenu.focus(); }
  $$('.menu-bt').forEach(function (b) { b.addEventListener('click', abrirMenu); });
  if (menu) {
    $('.menu-fecha', menu).addEventListener('click', fecharMenu);
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (a.hash && a.pathname === location.pathname) fecharMenu(); }); });
  }

  // ---------- plantão criminal (diálogo) ----------
  var pl = doc.createElement('div');
  pl.className = 'plantao'; pl.hidden = true;
  pl.setAttribute('role', 'dialog'); pl.setAttribute('aria-modal', 'true'); pl.setAttribute('aria-labelledby', 'pl-t');
  pl.innerHTML = '<div class="plantao-caixa">' +
    '<button type="button" class="plantao-x" aria-label="Fechar">×</button>' +
    '<p class="rotulo">Plantão criminal 24h</p>' +
    '<h2 id="pl-t">Ligar ou chamar no WhatsApp</h2>' +
    '<p>Para prisões em flagrante, intimações urgentes e cumprimento de mandados. Diga apenas seu nome, a cidade e onde a pessoa está. Os detalhes do caso são conversados por telefone, de forma reservada.</p>' +
    '<div class="plantao-acoes">' +
    '<a class="bt bt-cheio" href="tel:' + TEL + '">' + ICO_TEL + 'Ligar <small>(21) 0000-0000 · exemplo</small></a>' +
    '<a class="bt bt-linha" href="#" data-plantao-wa>' + ICO_WA + 'WhatsApp <small>(21) 90000-0000 · exemplo</small></a>' +
    '</div>' +
    '<p class="plantao-nota">Atendimento de plantão é orientação jurídica inicial; não envolve promessa de horário de chegada nem de resultado. <span class="nota-demo">Nota da demonstração: publique o plantão só se houver disponibilidade real.</span></p>' +
    '</div>';
  doc.body.appendChild(pl);
  var focoPl = null;
  function abrirPl() { fecharMenu(); focoPl = doc.activeElement; pl.hidden = false; $('.plantao-x', pl).focus(); }
  function fecharPl() { if (pl.hidden) return; pl.hidden = true; if (focoPl && focoPl.focus) focoPl.focus(); }
  pl.addEventListener('click', function (e) { if (e.target === pl || e.target.closest('.plantao-x')) fecharPl(); });
  $('[data-plantao-wa]', pl).addEventListener('click', function (e) {
    e.preventDefault(); fecharPl();
    wa('Olá, ' + MARCA + '. Preciso de orientação do plantão criminal. Posso explicar por telefone?');
  });
  doc.addEventListener('click', function (e) { var b = e.target.closest('[data-plantao]'); if (b) { e.preventDefault(); abrirPl(); } });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!pl.hidden) fecharPl(); else fecharMenu();
  });
  pl.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = $$('a,button', pl), pri = f[0], ult = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === pri) { e.preventDefault(); ult.focus(); }
    else if (!e.shiftKey && doc.activeElement === ult) { e.preventDefault(); pri.focus(); }
  });

  // ---------- revelar ao rolar (luz lateral) ----------
  // títulos (h1/h2) ficam parados: bloco com título não sobe inteiro, só as partes sem título
  $$('.revela, .sobe').forEach(function (el) {
    if (!el.querySelector('h1, h2')) return;
    var cls = el.classList.contains('revela') ? 'revela' : 'sobe';
    el.classList.remove('revela', 'sobe');
    [].forEach.call(el.children, function (f) { if (!f.matches('h1, h2') && !f.querySelector('h1, h2')) f.classList.add(cls); });
  });
  var alvos = $$('.revela, .sobe');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('vista'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    alvos.forEach(function (a) { io.observe(a); });
  } else alvos.forEach(function (a) { a.classList.add('vista'); });

  // ---------- índice da página marca a seção atual ----------
  var links = $$('.indice a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) links.forEach(function (l) { l.classList.toggle('ativo', l.getAttribute('href') === '#' + x.target.id); }); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(function (l) { var s = doc.getElementById(l.getAttribute('href').slice(1)); if (s) io2.observe(s); });
  }

  // ---------- botões de WhatsApp com mensagem neutra ----------
  $$('[data-msg]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); wa(b.getAttribute('data-msg').split('{marca}').join(MARCA)); });
  });

  // ---------- imprimir e compartilhar (como agir) ----------
  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { print(); }); });
  $$('[data-compartilhar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var dados = { title: doc.title, url: location.href.split('#')[0] };
      var ok = function (t) { b.textContent = t; setTimeout(function () { b.textContent = 'Enviar este guia para a família'; }, 2600); };
      if (navigator.share) navigator.share(dados).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(dados.url).then(function () { ok('Link copiado'); }, function () { ok('Copie o endereço da página'); });
      else ok('Copie o endereço da página');
    });
  });

  // ---------- cartão de publicação ----------
  function cartao(a) {
    var p = pessoa(a.autor);
    return '<a class="pub" href="artigo.html?id=' + esc(a.id) + '">' +
      '<div class="pub-img"><img src="' + esc(a.img) + '" alt="" width="600" height="375" loading="lazy"></div>' +
      '<div class="pub-tx"><span class="pub-cat">' + esc(a.cat) + '</span><h3>' + esc(a.titulo) + '</h3><p class="pub-meta">' + (p ? esc(p.nome) + ' · ' : '') + data(a.data) + ' · ' + a.min + ' min de leitura</p></div></a>';
  }
  var ultimas = $('[data-ultimas]');
  if (ultimas) {
    var filtroArea = ultimas.getAttribute('data-ultimas');
    var lista = B.artigos.filter(function (a) { return !filtroArea || a.area === filtroArea; });
    B.artigos.forEach(function (a) { if (lista.indexOf(a) < 0) lista.push(a); });
    ultimas.innerHTML = lista.slice(0, 3).map(cartao).join('');
  }

  // ---------- central de publicações (busca e filtro) ----------
  var central = $('#central');
  if (central) {
    var q = $('#busca'), chips = $('#cats'), grade = $('#lista-pubs'), cont = $('#contagem');
    var cats = []; B.artigos.forEach(function (a) { if (cats.indexOf(a.cat) < 0) cats.push(a.cat); });
    var params = new URLSearchParams(location.search), atual = params.get('cat') || '';
    if (cats.indexOf(atual) < 0) atual = '';
    chips.innerHTML = ['Todas'].concat(cats).map(function (c) { var v = c === 'Todas' ? '' : c; return '<button type="button" class="chip" data-cat="' + esc(v) + '" aria-pressed="' + (v === atual) + '">' + esc(c) + '</button>'; }).join('');
    if (params.get('q')) q.value = params.get('q');
    var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var desenhar = function () {
      var termo = norm(q.value.trim());
      var r = B.artigos.filter(function (a) {
        if (atual && a.cat !== atual) return false;
        if (!termo) return true;
        var p = pessoa(a.autor);
        return norm([a.titulo, a.resumo, a.cat, p ? p.nome : '', a.refs.map(function (x) { return x.join(' '); }).join(' '), a.corpo.map(function (x) { return x[1]; }).join(' ')].join(' ')).indexOf(termo) >= 0;
      });
      cont.textContent = r.length === 1 ? '1 publicação encontrada' : r.length + ' publicações encontradas';
      grade.innerHTML = r.length ? r.map(cartao).join('') : '<div class="vazio" style="grid-column:1/-1"><p>Nenhuma publicação com esse termo nesta categoria.</p><button type="button" class="bt bt-linha" id="limpar">Limpar busca e filtro</button></div>';
      var lp = $('#limpar'); if (lp) lp.addEventListener('click', function () { q.value = ''; atual = ''; marcar(); desenhar(); q.focus(); });
    };
    var marcar = function () { $$('.chip', chips).forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === atual)); }); };
    chips.addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; atual = c.getAttribute('data-cat'); marcar(); desenhar(); });
    q.addEventListener('input', desenhar);
    $('#form-busca').addEventListener('submit', function (e) { e.preventDefault(); desenhar(); });
    desenhar();
  }

  // ---------- página do artigo ----------
  var art = $('#artigo');
  if (art) {
    var id = new URLSearchParams(location.search).get('id');
    var a = B.artigos.filter(function (x) { return x.id === id; })[0] || B.artigos[0];
    var p = pessoa(a.autor);
    doc.title = a.titulo + ' · Basalto Advocacia Criminal';
    var md = $('meta[name="description"]'); if (md) md.setAttribute('content', a.resumo);
    $('#a-cat').textContent = a.cat;
    $('#a-cat-link').href = 'publicacoes.html?cat=' + encodeURIComponent(a.cat);
    $('#a-titulo').textContent = a.titulo;
    $('#a-resumo').textContent = a.resumo;
    $('#a-meta').innerHTML = '<span>Por <a href="advogado.html?id=' + esc(a.autor) + '">' + esc(p ? p.nome : '') + '</a> (exemplo)</span><span>' + data(a.data) + '</span><span>' + a.min + ' min de leitura</span>';
    $('#a-capa').innerHTML = '<img src="' + esc(a.img) + '" alt="" width="1400" height="600">';
    $('#a-corpo').innerHTML = a.corpo.map(function (b) { return b[0] === 'h2' ? '<h2>' + esc(b[1]) + '</h2>' : '<p>' + esc(b[1]) + '</p>'; }).join('') +
      '<h2>Referências legais</h2><ul class="refs">' + a.refs.map(function (r) { return '<li><b>' + esc(r[0]) + '</b>, ' + esc(r[1]) + '</li>'; }).join('') + '</ul>' +
      '<div class="aviso"><span>Conteúdo informativo, atualizado na data de publicação. Não substitui a análise de um caso concreto nem representa promessa de resultado. A legislação e a jurisprudência podem mudar.</span></div>';
    var areaLink = $('#a-area'); if (areaLink && B.areas[a.area]) { areaLink.href = a.area + '.html'; areaLink.textContent = 'Ver a área: ' + B.areas[a.area]; }
    var rel = B.artigos.filter(function (x) { return x.id !== a.id && (x.area === a.area || x.cat === a.cat); });
    B.artigos.forEach(function (x) { if (x.id !== a.id && rel.indexOf(x) < 0) rel.push(x); });
    $('#a-rel').innerHTML = rel.slice(0, 3).map(cartao).join('');
    $('#a-copiar').addEventListener('click', function (e) {
      var bt = e.currentTarget, url = location.href;
      var ok = function (t) { bt.textContent = t; setTimeout(function () { bt.textContent = 'Copiar link'; }, 2400); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { ok('Link copiado'); }, function () { ok('Copie o endereço da página'); }); else ok('Copie o endereço da página');
    });
  }

  // ---------- equipe (filtro por área) ----------
  var eq = $('#lista-equipe');
  if (eq) {
    var fe = $('#filtro-area'), ce = $('#contagem-eq');
    fe.innerHTML = '<option value="">Todas as áreas</option>' + Object.keys(B.areas).map(function (k) { return '<option value="' + k + '">' + esc(B.areas[k]) + '</option>'; }).join('');
    var fa = new URLSearchParams(location.search).get('area'); if (fa && B.areas[fa]) fe.value = fa;
    var desEq = function () {
      var v = fe.value, r = B.equipe.filter(function (e) { return !v || e.areas.indexOf(v) >= 0; });
      ce.textContent = r.length + (r.length === 1 ? ' profissional' : ' profissionais');
      eq.innerHTML = r.map(function (e) {
        return '<a class="adv" href="advogado.html?id=' + e.id + '"><div class="placa"><img src="' + e.foto + '" alt="" width="500" height="400" loading="lazy"><small>Exemplo</small><b>' + e.ini + '</b></div>' +
          '<div class="tx"><span class="cargo">' + esc(e.cargo) + '</span><h2>' + esc(e.nome) + '</h2><span class="oab">' + esc(e.oab) + '</span><span class="areas-adv">' + e.areas.map(function (k) { return esc(B.areas[k]); }).join(' · ') + '</span><span class="mais seta">Ver perfil </span></div></a>';
      }).join('') + (r.length % 3 ? '<a class="adv adv-cta" href="contato.html' + (v ? '?assunto=' + v : '') + '"><div class="tx"><span class="cargo">Primeira conversa</span><h2>Não sabe com quem falar?</h2><p>Conte só o assunto geral. Indicamos o advogado responsável pela área e marcamos um horário reservado.</p><span class="mais seta">Agendar conversa </span></div></a>' : '');
    };
    fe.addEventListener('change', desEq); desEq();
  }

  // ---------- perfil do advogado ----------
  var pf = $('#perfil');
  if (pf) {
    var e = pessoa(new URLSearchParams(location.search).get('id')) || B.equipe[0];
    doc.title = e.nome + ' (exemplo) · Basalto Advocacia Criminal';
    $('#p-nome').textContent = e.nome;
    $('#p-trilha').textContent = e.nome;
    $('#p-cargo').textContent = e.cargo;
    $('#p-placa').innerHTML = '<img src="' + e.foto + '" alt="" width="500" height="600"><small>Exemplo</small><b>' + e.ini + '</b>';
    $('#p-ficha').innerHTML = '<li><span>Cargo</span>' + esc(e.cargo) + '</li><li><span>Registro</span>' + esc(e.oab) + '</li>' +
      '<li><span>Áreas</span><div>' + e.areas.map(function (k) { return '<a href="' + k + '.html">' + esc(B.areas[k]) + '</a>'; }).join('<br>') + '</div></li>' +
      '<li><span>Formação</span><div>' + e.formacao.map(esc).join('<br>') + '</div></li><li><span>Idiomas</span>' + esc(e.idiomas) + '</li>';
    $('#p-bio').innerHTML = e.bio.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    var pubsDele = B.artigos.filter(function (x) { return x.autor === e.id; });
    $('#p-pubs').innerHTML = pubsDele.length ? pubsDele.map(cartao).join('') : '<p>Sem publicações de exemplo para este perfil.</p>';
    $('#p-falar').setAttribute('data-msg', 'Olá, ' + MARCA + '. Gostaria de agendar uma conversa reservada com ' + e.nome + '.');
    $('#p-falar').addEventListener('click', function (ev) { ev.preventDefault(); wa(this.getAttribute('data-msg')); });
  }

  // ---------- formulário de contato ----------
  var f = $('#form-contato');
  if (f) {
    var area0 = new URLSearchParams(location.search).get('assunto');
    if (area0 && f.assunto.querySelector('option[value="' + area0 + '"]')) f.assunto.value = area0;
    var erro = function (campo, msg) {
      var el = f[campo], box = $('#e-' + campo);
      if (el && el.setAttribute) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (box) box.textContent = msg || '';
      return !msg;
    };
    var validar = function () {
      var ok = true, nome = f.nome.value.trim(), tel = f.telefone.value.replace(/\D/g, ''), mail = f.email.value.trim();
      ok = erro('nome', nome.length < 3 ? 'Informe seu nome.' : '') && ok;
      ok = erro('telefone', tel.length < 10 || tel.length > 13 ? 'Informe um telefone com DDD.' : '') && ok;
      ok = erro('email', mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? 'Confira o e-mail.' : (f.retorno.value === 'E-mail' && !mail ? 'Informe o e-mail para receber o retorno.' : '')) && ok;
      ok = erro('assunto', !f.assunto.value ? 'Escolha o assunto geral.' : '') && ok;
      ok = erro('aceite', !f.aceite.checked ? 'É preciso concordar para continuar.' : '') && ok;
      return ok;
    };
    f.telefone.addEventListener('input', function () {
      var d = f.telefone.value.replace(/\D/g, '').slice(0, 11);
      f.telefone.value = d.length > 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
    });
    var mensagem = function () {
      var assunto = f.assunto.options[f.assunto.selectedIndex].text;
      return 'Olá, ' + MARCA + '. Gostaria de agendar uma conversa reservada.\n• Nome: ' + f.nome.value.trim() + '\n• Telefone: ' + f.telefone.value.trim() +
        (f.email.value.trim() ? '\n• E-mail: ' + f.email.value.trim() : '') + '\n• Assunto geral: ' + assunto + '\n• Prefiro retorno por: ' + f.retorno.value + '\n• Melhor período: ' + f.periodo.value;
    };
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validar()) { var inv = $('[aria-invalid="true"]', f); if (inv) inv.focus(); return; }
      var r = $('#retorno');
      if (ev.submitter && ev.submitter.value === 'email') {
        var link = 'mailto:contato@basalto-exemplo.com.br?subject=' + encodeURIComponent('Pedido de conversa reservada') + '&body=' + encodeURIComponent(mensagem().replace(/• /g, ''));
        r.hidden = false;
        r.innerHTML = 'Abrimos o seu programa de e-mail com a mensagem pronta (endereço de exemplo). Se ele não abrir, <a href="' + esc(link) + '">clique aqui</a>. Nada é gravado neste site.';
        location.href = link;
      } else {
        r.hidden = false;
        r.textContent = 'A mensagem foi montada para o WhatsApp do escritório. Nada é gravado neste site.';
        wa(mensagem());
      }
    });
    $$('input,select', f).forEach(function (el) { el.addEventListener('change', function () { if (el.getAttribute('aria-invalid') === 'true') validar(); }); });
  }
})();

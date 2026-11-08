/* Maison Élora · comportamento do site (demonstração da Blue Rose).
   Os dados (serviços, preços, profissionais) vêm de dados.js. O WhatsApp é simulado pelo moldura.js (window.BR_WA). */
(function () {
  'use strict';
  var D = window.ELORA || { departamentos: [], servicos: [], profissionais: [], funcionamento: {} };
  var doc = document;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var SETA = '<svg viewBox="0 0 26 12" aria-hidden="true"><path d="M1 6h23m-5-4 5 4-5 4"/></svg>';
  var MARCA = 'Maison Élora';

  function reais(n) { return 'R$ ' + Number(n).toLocaleString('pt-BR'); }
  function duracao(m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? String(r).padStart(2, '0') : '') : r + ' min'; }
  function serv(id) { for (var i = 0; i < D.servicos.length; i++) if (D.servicos[i][0] === id) return obj(D.servicos[i]); return null; }
  function obj(s) { return { id: s[0], dep: s[1], cat: s[2], nome: s[3], desc: s[4], dur: s[5], preco: s[6], aPartir: !!s[7] }; }
  function dep(id) { for (var i = 0; i < D.departamentos.length; i++) if (D.departamentos[i].id === id) return D.departamentos[i]; return null; }
  function pro(id) { for (var i = 0; i < D.profissionais.length; i++) if (D.profissionais[i].id === id) return D.profissionais[i]; return null; }
  function precoTxt(s) { return (s.aPartir ? 'a partir de ' : '') + reais(s.preco); }
  function enviar(msg) { if (window.BR_WA) window.BR_WA(msg); else location.href = 'https://wa.me/?text=' + encodeURIComponent(msg); }
  function mascara(inp) {
    inp.addEventListener('input', function () {
      var d = inp.value.replace(/\D/g, '').slice(0, 11), v = d;
      if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      inp.value = v;
    });
  }
  function validar(campo, ok) { campo.closest('.campo').classList.toggle('invalido', !ok); return ok; }
  function foneOk(v) { var n = v.replace(/\D/g, ''); return n.length >= 10 && n.length <= 11; }

  /* ---------- topo, menus ---------- */
  var topo = $('.topo');
  function medir() { if (topo) doc.documentElement.style.setProperty('--topo-h', topo.offsetHeight + 'px'); }
  medir(); addEventListener('resize', medir);
  addEventListener('scroll', function () { if (topo) topo.classList.toggle('rolou', scrollY > 10); }, { passive: true });

  $$('.dd').forEach(function (dd) {
    var bt = $('.dd-bt', dd), painel = $('.dd-painel', dd), t, hoverEm = 0;
    function abre(v) { bt.setAttribute('aria-expanded', v ? 'true' : 'false'); painel.classList.toggle('aberto', v); }
    // se o painel acabou de abrir pelo mouse, o clique não fecha (evita abrir e fechar no mesmo gesto)
    bt.addEventListener('click', function () { var aberto = bt.getAttribute('aria-expanded') === 'true'; abre(!aberto || Date.now() - hoverEm < 600); });
    dd.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) { clearTimeout(t); if (bt.getAttribute('aria-expanded') !== 'true') hoverEm = Date.now(); abre(true); } });
    dd.addEventListener('mouseleave', function () { if (matchMedia('(hover: hover)').matches) t = setTimeout(function () { abre(false); }, 180); });
    doc.addEventListener('click', function (e) { if (!dd.contains(e.target)) abre(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') abre(false); });
  });

  var hamb = $('.hamb'), mcel = $('#menu-cel');
  if (hamb && mcel) {
    hamb.addEventListener('click', function () {
      var abrir = hamb.getAttribute('aria-expanded') !== 'true';
      medir();
      hamb.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      hamb.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
      mcel.hidden = !abrir;
      doc.body.style.overflow = abrir ? 'hidden' : '';
    });
    $$('a', mcel).forEach(function (a) { a.addEventListener('click', function () { hamb.click(); }); });
  }

  /* ---------- revelar ao rolar ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv, .rv-img').forEach(function (el) { io.observe(el); });
  } else $$('.rv, .rv-img').forEach(function (el) { el.classList.add('vis'); });

  /* ---------- botão flutuante: some perto do rodapé ---------- */
  var flu = $('.flutua'), rod = $('.rodape');
  if (flu && rod && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { flu.classList.toggle('some', es[0].isIntersecting); }).observe(rod);
  }

  /* ---------- preços e durações soltos no texto ---------- */
  $$('[data-preco]').forEach(function (el) { var s = serv(el.dataset.preco); if (s) el.textContent = precoTxt(s); });
  $$('[data-dur]').forEach(function (el) { var s = serv(el.dataset.dur); if (s) el.textContent = duracao(s.dur); });

  /* ---------- listas de serviços dos departamentos ---------- */
  $$('[data-lista]').forEach(function (box) {
    var p = box.dataset.lista.split(':');
    box.innerHTML = D.servicos.map(obj).filter(function (s) { return s.dep === p[0] && s.cat === p[1]; }).map(function (s) {
      return '<div class="serv"><div><h3>' + esc(s.nome) + '</h3><p>' + esc(s.desc) + '</p></div>' +
        '<div class="meta"><b>' + esc(precoTxt(s)) + '</b><small>' + duracao(s.dur) + ' · valor de exemplo</small></div>' +
        '<a class="bt bt-p bt-linha" href="agendar.html?dep=' + s.dep + '&amp;serv=' + s.id + '">Agendar</a></div>';
    }).join('');
  });

  /* ---------- cards de profissionais ---------- */
  function cardPro(p, rotulo) {
    var dnome = p.deps.map(function (d) { return d === 'noivas' ? 'Noivas' : (dep(d) || {}).nome; }).join(' · ');
    return '<article class="pro" data-deps="' + p.deps.join(' ') + '"><figure><img src="' + p.foto + '" alt="' + esc(p.nome) + ', ' + esc(p.cargo.split(' · ')[0].toLowerCase()) + ' (foto ilustrativa)" width="600" height="900" loading="lazy" style="object-position:' + p.pos + '"><span>' + esc(rotulo || dnome) + '</span></figure>' +
      '<div class="pro-txt"><h3>' + esc(p.nome) + '</h3><p class="cargo">' + esc(p.cargo) + '</p><ul class="esp">' + p.esp.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' +
      '<p class="bio">' + esc(p.bio) + '</p><a class="bt bt-p" href="agendar.html?pro=' + p.id + '">Agendar com ' + esc(p.nome.split(' ')[0]) + '</a></div></article>';
  }
  $$('[data-pros]').forEach(function (box) {
    var f = box.dataset.pros;
    box.innerHTML = D.profissionais.filter(function (p) { return f === 'todos' || p.deps.indexOf(f) >= 0; }).map(function (p) { return cardPro(p); }).join('');
  });
  var vit = $('.vitrine');
  if (vit) {
    $$('.vit-ctrl button').forEach(function (b) {
      b.addEventListener('click', function () { vit.scrollBy({ left: (b.classList.contains('ant') ? -1 : 1) * (vit.clientWidth * .8), behavior: 'smooth' }); });
    });
  }
  // filtro da página de profissionais
  var filtros = $('#filtro-pros');
  if (filtros) {
    var grade = $('#pros-todos');
    function filtrar(f) {
      $$('.chip', filtros).forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.f === f ? 'true' : 'false'); });
      var n = 0;
      $$('.pro', grade).forEach(function (c) { var ok = f === 'todos' || c.dataset.deps.split(' ').indexOf(f) >= 0; c.hidden = !ok; if (ok) n++; });
      $('#pros-conta').textContent = n + (n === 1 ? ' profissional' : ' profissionais');
    }
    filtros.addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (c) { filtrar(c.dataset.f); history.replaceState(null, '', c.dataset.f === 'todos' ? location.pathname : '?dep=' + c.dataset.f); } });
    var q0 = new URLSearchParams(location.search).get('dep');
    filtrar(q0 && $('.chip[data-f="' + q0 + '"]', filtros) ? q0 : 'todos');
  }

  /* ---------- âncoras de categoria (marca a atual ao rolar) ---------- */
  var cats = $('.cats');
  if (cats && 'IntersectionObserver' in window) {
    var links = $$('a', cats);
    var ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { var ok = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('ativo', ok); if (ok) a.scrollIntoView({ block: 'nearest', inline: 'center' }); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) { var alvo = $(a.getAttribute('href')); if (alvo) ob.observe(alvo); });
  }

  /* ---------- tabela de preços ---------- */
  var tPreco = $('#tabela-precos');
  if (tPreco) {
    var abas = $('#abas-precos'), busca = $('#busca-preco'), atual = 'todos';
    abas.innerHTML = '<button type="button" class="chip" role="tab" data-d="todos">Todos</button>' + D.departamentos.map(function (d) { return '<button type="button" class="chip" role="tab" data-d="' + d.id + '">' + esc(d.nome) + '</button>'; }).join('');
    function desenhar() {
      var termo = (busca.value || '').trim().toLowerCase(), html = '', n = 0;
      D.departamentos.forEach(function (d) {
        if (atual !== 'todos' && atual !== d.id) return;
        var linhas = '';
        d.cats.forEach(function (c) {
          var lista = D.servicos.map(obj).filter(function (s) { return s.dep === d.id && s.cat === c[0] && (!termo || (s.nome + ' ' + s.desc).toLowerCase().indexOf(termo) >= 0); });
          if (!lista.length) return;
          linhas += '<tr class="cat-linha"><td colspan="5">' + esc(d.nome) + ' · ' + esc(c[1]) + '</td></tr>';
          lista.forEach(function (s) {
            n++;
            linhas += '<tr><td>' + esc(s.nome) + '</td><td class="desc">' + esc(s.desc) + '</td><td class="num">' + duracao(s.dur) + '</td><td class="preco">' + esc(precoTxt(s)) + '</td><td class="acao"><a class="bt bt-p bt-linha" href="agendar.html?dep=' + s.dep + '&amp;serv=' + s.id + '">Agendar</a></td></tr>';
          });
        });
        if (linhas) html += '<tbody>' + linhas + '</tbody>';
      });
      tPreco.innerHTML = '<caption>' + (atual === 'todos' ? 'Todos os departamentos' : esc(dep(atual).nome)) + '</caption><thead><tr><th>Serviço</th><th>Descrição</th><th>Duração</th><th>Preço de exemplo</th><th><span class="sr">Agendar</span></th></tr></thead>' + (html || '<tbody><tr><td colspan="5">Nenhum serviço encontrado com “' + esc(termo) + '”.</td></tr></tbody>');
      $('#conta-precos').textContent = n + (n === 1 ? ' serviço' : ' serviços');
      $$('.chip', abas).forEach(function (c) { c.setAttribute('aria-selected', c.dataset.d === atual ? 'true' : 'false'); });
    }
    abas.addEventListener('click', function (e) { var c = e.target.closest('.chip'); if (!c) return; atual = c.dataset.d; history.replaceState(null, '', atual === 'todos' ? location.pathname : '#' + atual); desenhar(); });
    busca.addEventListener('input', desenhar);
    var h = location.hash.slice(1); if (dep(h)) atual = h;
    addEventListener('hashchange', function () { var x = location.hash.slice(1); if (dep(x)) { atual = x; desenhar(); } });
    desenhar();
  }

  /* ---------- agendamento ---------- */
  var ag = $('#agendamento');
  if (ag) {
    var NOMES = ['Departamento', 'Serviço', 'Profissional', 'Data', 'Horário', 'Seus dados', 'Resumo'];
    var st = { dep: null, serv: null, pro: null, data: null, hora: null }, passo = 0, mesVer = null;
    var qs = new URLSearchParams(location.search);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var limite = new Date(hoje); limite.setDate(limite.getDate() + 60);
    var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    if (pro(qs.get('pro'))) st.pro = qs.get('pro');
    var s0 = serv(qs.get('serv'));
    if (s0) { st.dep = s0.dep; st.serv = s0.id; }
    else if (dep(qs.get('dep'))) st.dep = qs.get('dep');
    if (st.pro && !st.dep) { var pd = pro(st.pro).deps.filter(function (d) { return dep(d); }); if (pd.length === 1) st.dep = pd[0]; }
    if (st.pro && st.dep && pro(st.pro).deps.indexOf(st.dep) < 0) st.pro = null;
    passo = st.serv ? (st.pro ? 3 : 2) : st.dep ? 1 : 0;

    $('#passos').innerHTML = NOMES.map(function (n) { return '<li>' + n + '</li>'; }).join('');

    function dataTxt(d) { return SEM[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
    function prosDoServ() { return D.profissionais.filter(function (p) { return p.deps.indexOf(st.dep) >= 0; }); }
    function aberto(d) { return !!D.funcionamento[d.getDay()]; }
    function semente(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
    function horarios() {
      var f = D.funcionamento[st.data.getDay()], s = serv(st.serv), lista = [];
      if (!f) return lista;
      var agora = new Date(), base = semente(st.data.toDateString() + (st.pro || 'q'));
      for (var m = f[0] * 60; m + s.dur <= f[1] * 60; m += 30) {
        var dt = new Date(st.data); dt.setHours(0, m, 0, 0);
        var passado = dt <= agora;
        var ocupado = ((base >> (m / 30 % 24)) & 3) === 0;
        lista.push({ t: String(Math.floor(m / 60)).padStart(2, '0') + 'h' + String(m % 60).padStart(2, '0'), off: passado || ocupado });
      }
      return lista;
    }

    function render() {
      $$('#passos li').forEach(function (li, i) { li.className = i < passo ? 'feito' : i === passo ? 'agora' : ''; if (i === passo) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      $$('.etapa', ag).forEach(function (e, i) { e.hidden = i !== passo; });
      var e = $$('.etapa', ag)[passo];
      if (passo === 0) {
        var permit = st.pro ? pro(st.pro).deps : null;
        $('#op-dep').innerHTML = D.departamentos.filter(function (d) { return !permit || permit.indexOf(d.id) >= 0; }).map(function (d) {
          return '<button type="button" class="opc" data-v="' + d.id + '" aria-pressed="' + (st.dep === d.id) + '"><img src="' + d.foto + '" alt="" width="400" height="300" loading="lazy"><span class="t"><strong>' + esc(d.nome) + '</strong><small>' + d.cats.map(function (c) { return c[1]; }).join(', ') + '</small></span></button>';
        }).join('');
      }
      if (passo === 1) {
        var dd = dep(st.dep);
        $('#t-serv').textContent = 'Qual serviço de ' + dd.nome.toLowerCase() + '?';
        $('#op-serv').innerHTML = dd.cats.map(function (c) {
          var l = D.servicos.map(obj).filter(function (s) { return s.dep === st.dep && s.cat === c[0]; });
          return '<p class="rotulo" style="margin:14px 0 2px">' + esc(c[1]) + '</p>' + l.map(function (s) {
            return '<button type="button" class="opc" data-v="' + s.id + '" aria-pressed="' + (st.serv === s.id) + '"><span class="t"><strong>' + esc(s.nome) + '</strong><em>' + esc(precoTxt(s)) + '</em><small>' + duracao(s.dur) + ' · ' + esc(s.desc) + '</small></span></button>';
          }).join('');
        }).join('');
      }
      if (passo === 2) {
        var lista = prosDoServ();
        $('#op-pro').innerHTML = '<button type="button" class="opc" data-v="qualquer" aria-pressed="' + (st.pro === 'qualquer') + '"><span class="t"><strong>Qualquer profissional</strong><small>O primeiro horário livre da equipe de ' + esc(dep(st.dep).nome.toLowerCase()) + '.</small></span></button>' +
          lista.map(function (p) { return '<button type="button" class="opc" data-v="' + p.id + '" aria-pressed="' + (st.pro === p.id) + '"><img src="' + p.foto + '" alt="" width="76" height="92" loading="lazy" style="object-position:' + p.pos + '"><span class="t"><strong>' + esc(p.nome) + '</strong><small>' + esc(p.cargo) + '</small></span></button>'; }).join('');
      }
      if (passo === 3) cal();
      if (passo === 4) {
        var hs = horarios();
        $('#t-hora').textContent = 'Horários em ' + dataTxt(st.data);
        $('#op-hora').innerHTML = hs.length ? hs.map(function (h) { return '<button type="button" data-v="' + h.t + '" aria-pressed="' + (st.hora === h.t) + '"' + (h.off ? ' disabled aria-label="' + h.t + ' ocupado"' : '') + '>' + h.t + '</button>'; }).join('') : '<p>Nenhum horário neste dia.</p>';
        if (!hs.some(function (h) { return !h.off; })) $('#op-hora').insertAdjacentHTML('beforeend', '<p style="grid-column:1/-1">Este dia está sem horários livres. Volte e escolha outra data.</p>');
      }
      if (passo === 6) $('#previa').textContent = mensagem();
      resumo();
      var t = $('h2', e); if (t && render.foco) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      render.foco = true;
    }

    function cal() {
      if (!mesVer) mesVer = new Date((st.data || hoje).getFullYear(), (st.data || hoje).getMonth(), 1);
      $('#cal-mes').textContent = MESES[mesVer.getMonth()] + ' ' + mesVer.getFullYear();
      $('#cal-ant').disabled = mesVer <= new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      $('#cal-prox').disabled = new Date(mesVer.getFullYear(), mesVer.getMonth() + 1, 1) > limite;
      var html = SEM.map(function (s) { return '<span class="sem" aria-hidden="true">' + s + '</span>'; }).join('');
      var ini = mesVer.getDay(), dias = new Date(mesVer.getFullYear(), mesVer.getMonth() + 1, 0).getDate();
      for (var i = 0; i < ini; i++) html += '<span></span>';
      for (var d = 1; d <= dias; d++) {
        var dt = new Date(mesVer.getFullYear(), mesVer.getMonth(), d), off = dt < hoje || dt > limite || !aberto(dt);
        var sel = st.data && dt.getTime() === st.data.getTime();
        html += '<button type="button" data-d="' + dt.getTime() + '" aria-pressed="' + !!sel + '"' + (off ? ' disabled' : '') + ' aria-label="' + dt.getDate() + ' de ' + MESES[dt.getMonth()] + (off ? ', fechado' : '') + '">' + d + '</button>';
      }
      $('#cal-grade').innerHTML = html;
    }

    function resumo() {
      var s = st.serv && serv(st.serv), p = st.pro && st.pro !== 'qualquer' && pro(st.pro);
      $('#r-dep').textContent = st.dep ? dep(st.dep).nome : 'A escolher';
      $('#r-serv').textContent = s ? s.nome + ' · ' + duracao(s.dur) : 'A escolher';
      $('#r-pro').textContent = p ? p.nome : st.pro === 'qualquer' ? 'Qualquer profissional' : 'A escolher';
      $('#r-dia').textContent = st.data ? dataTxt(st.data) + (st.hora ? ' às ' + st.hora : '') : 'A escolher';
      $('#r-total').textContent = s ? precoTxt(s) : '—';
    }

    function mensagem() {
      var s = serv(st.serv), p = st.pro && st.pro !== 'qualquer' ? pro(st.pro).nome : 'qualquer profissional';
      return 'Olá, ' + MARCA + '! Quero pedir um horário pelo site.\n' +
        '• Nome: ' + $('#ag-nome').value.trim() + '\n' +
        '• Serviço: ' + s.nome + ' (' + dep(st.dep).nome + ')\n' +
        '• Profissional: ' + p + '\n' +
        '• Dia: ' + dataTxt(st.data) + ' às ' + st.hora + '\n' +
        '• Duração: ' + duracao(s.dur) + '\n' +
        '• Valor da tabela: ' + precoTxt(s) + '\n' +
        '• WhatsApp: ' + $('#ag-tel').value.trim() +
        ($('#ag-obs').value.trim() ? '\n• Observação: ' + $('#ag-obs').value.trim() : '') +
        '\nPodem confirmar se o horário está livre?';
    }

    ag.addEventListener('click', function (e) {
      var o = e.target.closest('[data-v]'), d = e.target.closest('[data-d]');
      if (o && !o.disabled) {
        var box = o.parentNode.id;
        if (box === 'op-dep') { if (st.dep !== o.dataset.v) { st.serv = null; if (st.pro === 'qualquer' || (st.pro && pro(st.pro).deps.indexOf(o.dataset.v) < 0)) st.pro = null; } st.dep = o.dataset.v; passo = 1; }
        else if (box === 'op-serv') { st.serv = o.dataset.v; st.hora = null; passo = 2; }
        else if (box === 'op-pro') { st.pro = o.dataset.v; st.hora = null; passo = 3; }
        else if (box === 'op-hora') { st.hora = o.dataset.v; passo = 5; }
        render(); ag.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (d && !d.disabled) { st.data = new Date(+d.dataset.d); st.hora = null; passo = 4; render(); ag.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (e.target.closest('.voltar')) { passo = Math.max(0, passo - 1); render(); }
    });
    $('#cal-ant').addEventListener('click', function () { mesVer = new Date(mesVer.getFullYear(), mesVer.getMonth() - 1, 1); cal(); });
    $('#cal-prox').addEventListener('click', function () { mesVer = new Date(mesVer.getFullYear(), mesVer.getMonth() + 1, 1); cal(); });
    mascara($('#ag-tel'));
    $('#form-dados').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = validar($('#ag-nome'), $('#ag-nome').value.trim().length >= 2), b = validar($('#ag-tel'), foneOk($('#ag-tel').value));
      if (!a) { $('#ag-nome').focus(); return; } if (!b) { $('#ag-tel').focus(); return; }
      passo = 6; render();
    });
    $('#ag-enviar').addEventListener('click', function () { enviar(mensagem()); $('#ag-ok').hidden = false; });
    $('#ag-recomecar').addEventListener('click', function () { st = { dep: null, serv: null, pro: null, data: null, hora: null }; mesVer = null; passo = 0; $('#ag-ok').hidden = true; history.replaceState(null, '', location.pathname); render(); });
    render.foco = false; render();
  }

  /* ---------- noivas: galeria com lightbox ---------- */
  var gal = $('.galeria'), lb = $('#lb');
  if (gal && lb) {
    var itens = $$('button', gal), i0 = 0, antes = null;
    function mostra(i) { i0 = (i + itens.length) % itens.length; var im = $('img', itens[i0]); $('img', lb).src = im.src; $('img', lb).alt = im.alt; $('figcaption', lb).textContent = (i0 + 1) + ' / ' + itens.length + ' · ' + im.alt; }
    itens.forEach(function (b, i) { b.addEventListener('click', function () { antes = b; mostra(i); lb.hidden = false; doc.body.style.overflow = 'hidden'; $('.lb-x', lb).focus(); }); });
    function fecha() { lb.hidden = true; doc.body.style.overflow = ''; if (antes) antes.focus(); }
    $('.lb-x', lb).addEventListener('click', fecha);
    $('.lb-ant', lb).addEventListener('click', function () { mostra(i0 - 1); });
    $('.lb-prox', lb).addEventListener('click', function () { mostra(i0 + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) fecha(); });
    doc.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') fecha(); if (e.key === 'ArrowLeft') mostra(i0 - 1); if (e.key === 'ArrowRight') mostra(i0 + 1); });
  }

  /* ---------- noivas: montador de orçamento ---------- */
  var orc = $('#orcamento');
  if (orc) {
    var PAC = { bride: ['Élora Bride', 2400, 'noiva'], celebration: ['Celebration', 3300, 'noiva e mãe'], signature: ['Signature', 5900, 'noiva, duas mães e até 4 madrinhas'] };
    var EXTRA_PESSOA = 420, n = 0;
    var dataInp = $('#o-data'); var min = new Date(); min.setDate(min.getDate() + 14); dataInp.min = min.toISOString().slice(0, 10);
    mascara($('#o-tel'));
    function calc() {
      var p = (orc.querySelector('input[name="pacote"]:checked') || {}).value, base = p ? PAC[p][1] : 0;
      var extras = $$('input[name="extra"]:checked', orc).map(function (c) { return { n: c.dataset.nome, v: +c.value }; });
      var local = $('#o-local'), lv = +local.selectedOptions[0].dataset.v || 0, consulta = local.value === 'fora';
      var total = base + n * EXTRA_PESSOA + extras.reduce(function (a, x) { return a + x.v; }, 0) + lv;
      $('#or-pac').textContent = p ? PAC[p][0] + ' · ' + reais(base) : 'Escolha um pacote';
      $('#or-acomp').textContent = n ? n + ' × ' + reais(EXTRA_PESSOA) + ' = ' + reais(n * EXTRA_PESSOA) : 'Nenhuma';
      $('#or-extras').textContent = extras.length ? extras.map(function (x) { return x.n; }).join(', ') : 'Nenhum';
      $('#or-local').textContent = local.selectedOptions[0].textContent;
      $('#or-data').textContent = dataInp.value ? dataInp.value.split('-').reverse().join('/') : 'A definir';
      $('#or-total').textContent = p ? reais(total) + (consulta ? ' + deslocamento' : '') : '—';
      return { p: p, total: total, extras: extras, consulta: consulta };
    }
    $('#o-menos').addEventListener('click', function () { n = Math.max(0, n - 1); $('#o-n').value = n; calc(); });
    $('#o-mais').addEventListener('click', function () { n = Math.min(12, n + 1); $('#o-n').value = n; calc(); });
    orc.addEventListener('change', calc); orc.addEventListener('input', calc);
    $$('[data-pacote]').forEach(function (b) {
      b.addEventListener('click', function () { var r = orc.querySelector('input[value="' + b.dataset.pacote + '"]'); r.checked = true; calc(); $('#monte').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { r.focus({ preventScroll: true }); }, 500); });
    });
    var ultima = '';
    orc.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = calc();
      var okP = !!c.p; $('#o-pac-erro').hidden = okP;
      var okD = validar(dataInp, !!dataInp.value && dataInp.value >= dataInp.min);
      var okN = validar($('#o-nome'), $('#o-nome').value.trim().length >= 2);
      var okT = validar($('#o-tel'), foneOk($('#o-tel').value));
      if (!okP) { orc.querySelector('input[name="pacote"]').focus(); return; }
      if (!okD) { dataInp.focus(); return; } if (!okN) { $('#o-nome').focus(); return; } if (!okT) { $('#o-tel').focus(); return; }
      ultima = 'Olá, ' + MARCA + '! Quero um orçamento de Dia de Noiva.\n' +
        '• Nome: ' + $('#o-nome').value.trim() + '\n' +
        '• Pacote: ' + PAC[c.p][0] + ' (' + PAC[c.p][2] + ')\n' +
        '• Acompanhantes extras: ' + n + '\n' +
        '• Serviços extras: ' + (c.extras.length ? c.extras.map(function (x) { return x.n; }).join(', ') : 'nenhum') + '\n' +
        '• Data do casamento: ' + dataInp.value.split('-').reverse().join('/') + '\n' +
        '• Local de preparo: ' + $('#o-local').selectedOptions[0].textContent + '\n' +
        '• Estimativa: ' + reais(c.total) + (c.consulta ? ' + deslocamento a combinar' : '') + '\n' +
        '• WhatsApp: ' + $('#o-tel').value.trim() + '\n' +
        'Podem confirmar a disponibilidade da data?';
      $('#o-previa').textContent = ultima;
      $('#o-resumo').hidden = false;
      $('#o-resumo').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#o-enviar').focus({ preventScroll: true });
    });
    $('#o-enviar').addEventListener('click', function () { if (ultima) enviar(ultima); });
    calc();
  }

  /* ---------- contato ---------- */
  var fc = $('#form-contato');
  if (fc) {
    mascara($('#c-tel'));
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = validar($('#c-nome'), $('#c-nome').value.trim().length >= 2), b = validar($('#c-tel'), foneOk($('#c-tel').value)), c = validar($('#c-msg'), $('#c-msg').value.trim().length >= 5);
      if (!a) return $('#c-nome').focus(); if (!b) return $('#c-tel').focus(); if (!c) return $('#c-msg').focus();
      enviar('Olá, ' + MARCA + '!\n• Nome: ' + $('#c-nome').value.trim() + '\n• Assunto: ' + $('#c-ass').value + '\n• WhatsApp: ' + $('#c-tel').value.trim() + '\n' + $('#c-msg').value.trim());
      $('#c-ok').hidden = false; fc.reset();
    });
  }

  /* ---------- horário de hoje em destaque ---------- */
  var hj = $('.horario tr[data-dia="' + new Date().getDay() + '"]'); if (hj) hj.classList.add('hoje');
  /* ---------- vídeos: tocam só quando visíveis, pausam fora da tela, respeitam movimento reduzido ---------- */
  var semMov = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('video[data-auto]').forEach(function (v) {
    var bt = v.parentNode.querySelector('.vid-bt'), pausadoPeloUsuario = false;
    function marca() { if (!bt) return; var t = !v.paused; bt.classList.toggle('tocando', t); bt.setAttribute('aria-label', t ? 'Pausar vídeo' : 'Reproduzir vídeo'); }
    function toca() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    v.addEventListener('play', marca); v.addEventListener('pause', marca);
    if (bt) bt.addEventListener('click', function () { if (v.paused) { pausadoPeloUsuario = false; toca(); } else { pausadoPeloUsuario = true; v.pause(); } });
    if (semMov) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { if (!pausadoPeloUsuario) toca(); } else if (!v.paused) v.pause(); });
      }, { threshold: 0.2 }).observe(v);
    } else toca();
  });
})();

// Lumi Odontologia · clínica familiar em Porto Alegre (08/11/2026).
// Horário vivo (aberto/fechado agora), cabeçalho que fica sólido, menu do celular, grade de convênios com busca
// e pedido de agendamento que monta a mensagem do WhatsApp. Cada bloco só roda se a página tiver o elemento dele.
// Convênios com nomes fictícios: no site real, a lista é mantida pela recepção.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wa = function (msg) { if (window.BR_WA) window.BR_WA(msg); };

  // cabeçalho: degradê sobre a foto, sólido depois dela
  var topo = $('.topo'), abre = $('.abre');
  function cabecalho() { topo.classList.toggle('cheio', !abre || scrollY > 30); }
  addEventListener('scroll', cabecalho, { passive: true }); cabecalho();

  // menu do celular
  var mb = $('.menu-bt');
  if (mb) {
    var fecha = function () { topo.classList.remove('aberto'); mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Abrir menu'); };
    mb.addEventListener('click', function () { var ab = topo.classList.toggle('aberto'); mb.setAttribute('aria-expanded', String(ab)); mb.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu'); });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', fecha); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && topo.classList.contains('aberto')) { fecha(); mb.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 1000) fecha(); });
  }

  // a foto de abertura acompanha o mouse devagar
  var cena = $('.cena');
  if (cena && abre && !calmo && matchMedia('(pointer: fine)').matches) {
    abre.addEventListener('mousemove', function (e) {
      var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      cena.style.transform = 'translate(' + (-x * 18) + 'px,' + (-y * 12) + 'px)';
    });
  }

  // horário: marca o dia de hoje e diz se está aberto agora
  $$('.h-dias').forEach(function (lista) {
    var cartao = lista.closest('.h-cartao');
    var DIAS = [['Segunda', '08:00–12:00', '14:00–20:00', 8, 20], ['Terça', '08:00–18:00', '', 8, 18], ['Quarta', '08:00–18:00', '', 8, 18], ['Quinta', '08:00–18:00', '', 8, 18], ['Sexta', '08:00–17:00', '', 8, 17], ['Sábado', '08:00–12:00', 'com hora marcada', 8, 12]];
    var agora = new Date(), dia = agora.getDay(), hora = agora.getHours() + agora.getMinutes() / 60;
    lista.innerHTML = DIAS.map(function (d, i) { return '<li' + (i + 1 === dia ? ' class="hoje"' : '') + '><b>' + d[0] + '</b>' + d[1] + (d[2] ? '<br>' + d[2] : '') + '</li>'; }).join('');
    var hoje = DIAS[dia - 1], aberto = hoje && hora >= hoje[3] && hora < hoje[4];
    var prox = (function () { for (var k = 1; k <= 7; k++) { var dd = (dia + k) % 7; if (DIAS[dd - 1]) return DIAS[dd - 1]; } })();
    var est = $('.h-agora', cartao); est.classList.toggle('aberto', !!aberto);
    $('span', est).textContent = aberto ? 'Aberto agora' : 'Fechado agora';
    $('.h-prox', cartao).textContent = aberto ? 'Até as ' + hoje[4] + 'h de hoje' : (hoje && hora < hoje[3] ? 'Abre hoje às ' + hoje[3] + 'h' : 'Abre ' + prox[0].toLowerCase() + ' às ' + prox[3] + 'h');
  });

  // ---------- convênios (nomes fictícios) ----------
  var COB = { prev: 'Consultas e limpeza', rest: 'Restaurações', canal: 'Canal', extr: 'Extrações', infa: 'Odontopediatria', urg: 'Urgência', prot: 'Prótese', orto: 'Aparelho fixo' };
  var AUT = { canal: 1, prot: 1, orto: 1 };
  var CONV = [
    { n: 'Arvoredo Odonto', p: 'Essencial, Família e Empresarial', c: 'prev rest canal extr infa urg', a: 'arvoredo' },
    { n: 'Guaíba Dental', p: 'Individual e Familiar', c: 'prev rest canal extr infa urg orto', a: 'guaiba' },
    { n: 'Sorrir Sul Saúde Bucal', p: 'Bronze, Prata e Ouro (prótese só no Ouro)', c: 'prev rest canal extr infa urg prot', a: 'sorrir sul' },
    { n: 'Ipê Odonto Empresas', p: 'Planos coletivos empresariais', c: 'prev rest canal extr infa urg prot', a: 'ipe' },
    { n: 'Bússola Saúde Bucal', p: 'Clássico e Mais', c: 'prev rest canal extr infa urg', a: 'bussola' },
    { n: 'Farol Odonto', p: 'Farol 100 e Farol 200', c: 'prev rest canal extr infa urg orto', a: 'farol' },
    { n: 'Raiz Dental', p: 'Raiz Individual', c: 'prev rest extr infa urg', a: 'raiz' },
    { n: 'Ciranda Odonto Kids', p: 'Plano infantil, até 12 anos', c: 'prev rest infa urg', a: 'ciranda kids infantil crianca' },
    { n: 'Trilha Saúde Oral', p: 'Trilha Básico e Trilha Total', c: 'prev rest canal extr infa urg prot orto', a: 'trilha' },
    { n: 'Primavera Dental', p: 'Adesão e Empresarial', c: 'prev rest canal extr infa urg', a: 'primavera' },
    { n: 'Ponte Odonto Servidores', p: 'Servidores públicos e dependentes', c: 'prev rest canal extr infa urg prot', a: 'ponte servidor' },
    { n: 'Lírio Dental Cooperativa', p: 'Cooperados e famílias', c: 'prev rest canal extr infa urg', a: 'lirio coop' }
  ];
  CONV.forEach(function (v) { v.k = norm(v.n + ' ' + v.p + ' ' + v.a); v.cs = v.c.split(' '); v.id = 'cv-' + norm(v.n).replace(/[^a-z0-9]+/g, '-'); });

  $$('[data-cv-grade]').forEach(function (grade) {
    var det = grade.hasAttribute('data-detalhe');
    grade.innerHTML = CONV.map(function (v) {
      return '<article class="cv-card" id="' + v.id + '" data-k="' + esc(v.k) + '"><span class="cv-sigla" aria-hidden="true">' + esc(v.n.charAt(0)) + '</span><div><b>' + esc(v.n) + '</b><small>' + esc(v.p) + '</small>' +
        (det ? '<ul class="cv-chips">' + v.cs.map(function (c) { return '<li class="ch' + (AUT[c] ? ' ch-aut' : '') + '">' + COB[c] + (AUT[c] ? '*' : '') + '</li>'; }).join('') + '</ul>' : '') + '</div></article>';
    }).join('');
  });

  $$('[data-cv-busca]').forEach(function (box) {
    var inp = $('input', box), res = $('.cv-res', box);
    var sec = box.closest('section'), cards = $$('.cv-card', sec);
    function busca() {
      var q = norm(inp.value);
      if (!q) { cards.forEach(function (c) { c.hidden = false; c.classList.remove('achou'); }); res.innerHTML = ''; res.className = 'cv-res'; return; }
      var achados = CONV.filter(function (v) { return v.k.indexOf(q) >= 0 || q.split(' ').every(function (p) { return v.k.indexOf(p) >= 0; }); });
      cards.forEach(function (c) { var ok = c.getAttribute('data-k').indexOf(q) >= 0 || q.split(' ').every(function (p) { return c.getAttribute('data-k').indexOf(p) >= 0; }); c.hidden = !ok; c.classList.toggle('achou', ok); });
      if (achados.length) {
        var v = achados[0];
        res.className = 'cv-res sim';
        res.innerHTML = '<p><b>' + (achados.length === 1 ? 'Atendemos pelo ' + esc(v.n) + '.' : achados.length + ' convênios encontrados.') + '</b> ' +
          (achados.length === 1 ? 'Costuma cobrir: ' + v.cs.map(function (c) { return COB[c].toLowerCase(); }).join(', ') + '. A recepção confirma pelo seu plano.' : 'Veja abaixo e escolha o seu.') + '</p>' +
          '<a class="bt-verde" href="#" data-wa="' + esc('Olá, Lumi! Tenho o convênio ' + (achados.length === 1 ? v.n : inp.value.trim()) + ' e quero agendar um atendimento.') + '">Agendar com este convênio</a>';
      } else {
        res.className = 'cv-res nao';
        res.innerHTML = '<p><b>Não encontramos “' + esc(inp.value.trim()) + '” na nossa lista.</b> Às vezes o plano tem outro nome comercial, ou dá para atender como particular com reembolso. Consulte a recepção.</p>' +
          '<a class="bt-verde" href="#" data-wa="' + esc('Olá, Lumi! Vocês atendem pelo convênio ' + inp.value.trim() + '?') + '">Consultar pelo WhatsApp</a>';
      }
    }
    inp.addEventListener('input', busca);
    inp.addEventListener('search', busca);
  });

  // ---------- pedido de agendamento ----------
  $$('[data-cv-select]').forEach(function (s) {
    s.insertAdjacentHTML('beforeend', CONV.map(function (v) { return '<option>' + esc(v.n) + '</option>'; }).join('') + '<option>Particular (sem convênio)</option><option>Outro convênio / não sei</option>');
  });

  $$('.form-agenda').forEach(function (f) {
    var tel = f.elements.tel, mesmo = f.elements.mesmo, erro = $('.fa-erro', f), ok = $('.fa-ok', f);
    tel.addEventListener('input', function () {
      var d = tel.value.replace(/\D/g, '').slice(0, 11);
      tel.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
    });
    function copia() { if (mesmo.checked) f.elements.pac.value = f.elements.resp.value; }
    mesmo.addEventListener('change', function () { f.elements.pac.readOnly = mesmo.checked; copia(); });
    f.elements.resp.addEventListener('input', copia);
    $$('input, select', f).forEach(function (el) { el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); }); el.addEventListener('change', function () { el.removeAttribute('aria-invalid'); }); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var E = f.elements, falta = [];
      var checa = function (el, ok, nome) { if (!ok) { falta.push(nome); (el instanceof RadioNodeList ? el[0] : el).setAttribute('aria-invalid', 'true'); } };
      checa(E.resp, E.resp.value.trim().length >= 2, 'nome do responsável');
      checa(E.pac, E.pac.value.trim().length >= 2, 'nome do paciente');
      var idade = parseInt(E.idade.value, 10);
      checa(E.idade, E.idade.value !== '' && idade >= 0 && idade <= 110, 'idade');
      checa(E.conv, !!E.conv.value, 'convênio');
      checa(E.trat, !!E.trat.value, 'tratamento');
      checa(E.per, !!$('input[name=per]:checked', f), 'período');
      checa(E.tel, E.tel.value.replace(/\D/g, '').length >= 10, 'telefone com DDD');
      if (falta.length) {
        erro.hidden = false; ok.hidden = true;
        erro.textContent = 'Falta preencher: ' + falta.join(', ') + '.';
        var prim = $('[aria-invalid="true"]', f); if (prim) prim.focus();
        return;
      }
      erro.hidden = true;
      var anos = idade === 0 ? 'menos de 1 ano' : idade === 1 ? '1 ano' : idade + ' anos';
      var msg = 'Olá, Lumi! Gostaria de agendar um atendimento.\n' +
        'Responsável: ' + E.resp.value.trim() + '\n' +
        'Paciente: ' + E.pac.value.trim() + ' (' + anos + ')\n' +
        'Convênio: ' + E.conv.value + '\n' +
        'Tratamento: ' + E.trat.value + '\n' +
        'Melhor período: ' + $('input[name=per]:checked', f).value + '\n' +
        'Telefone: ' + E.tel.value;
      ok.hidden = false;
      ok.textContent = 'Pedido montado para ' + E.pac.value.trim() + '. A recepção confirma o dia e o horário pelo WhatsApp.';
      wa(msg);
    });
  });
})();

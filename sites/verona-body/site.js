// Vérona Body Clinic · menu, régua de progresso, entradas em varredura, seletor de objetivos, filtros (tratamentos e resultados),
// comparador de silhuetas, "Monte sua jornada" (5 passos) e agendamento (6 passos) com o pedido pronto para o WhatsApp.
// O WhatsApp é simulado pela moldura da Blue Rose (window.BR_WA): nesta demonstração nada é enviado.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var D = window.VERONA || { objetivos: [], tratamentos: [], tecnologias: [], equipe: [], abordagens: {} };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params = new URLSearchParams(location.search);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var porId = function (lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; };

  function enviarWA(msg, okEl, okTxt) {
    if (typeof window.BR_WA === 'function') window.BR_WA(msg);
    if (okEl) { okEl.textContent = okTxt; okEl.classList.add('mostra'); }
  }

  // ---------- menu do celular ----------
  var hamb = $('.hamb'), mc = $('#menu-cel');
  function menu(abrir) {
    if (!hamb || !mc) return;
    hamb.setAttribute('aria-expanded', String(abrir)); hamb.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    mc.hidden = !abrir; document.body.style.overflow = abrir ? 'hidden' : '';
  }
  if (hamb) hamb.addEventListener('click', function () { menu(mc.hidden); });
  if (mc) mc.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && mc && !mc.hidden) { menu(false); hamb.focus(); } });
  addEventListener('resize', function () { if (innerWidth > 1180 && mc && !mc.hidden) menu(false); });

  // ---------- régua de progresso no topo ----------
  var prog = $('.progresso'), pend = false;
  function rolar() {
    pend = false;
    var h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  }
  addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(rolar); } }, { passive: true });
  rolar();

  // ---------- entradas (varredura nas fotos, subida nos textos) ----------
  var alvos = $$('[data-rev],[data-sobe]');
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    alvos.forEach(function (el) { io.observe(el); });
  } else alvos.forEach(function (el) { el.classList.add('visto'); });

  // ---------- seletor de objetivos (home) ----------
  var abas = $$('.obj-aba');
  function abrirAba(aba, foco) {
    abas.forEach(function (a) {
      var sel = a === aba;
      a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1;
      var pn = document.getElementById(a.getAttribute('aria-controls'));
      if (pn) {
        pn.hidden = !sel;
        if (sel) $$('[data-rev],[data-sobe]', pn).forEach(function (el) { el.classList.add('visto'); });
      }
    });
    if (foco) aba.focus();
  }
  abas.forEach(function (a, i) {
    a.addEventListener('click', function () { abrirAba(a); });
    a.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); abrirAba(abas[(i + k + abas.length) % abas.length], true); }
    });
  });

  // ---------- filtros dos tratamentos ----------
  var fTrat = $$('[data-f]');
  if (fTrat.length) {
    var cards = $$('.trat'), nT = $('#n-trat');
    var aplicar = function (f, url) {
      var n = 0;
      fTrat.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
      cards.forEach(function (c) { var ok = f === 'todos' || c.dataset.grupos.split(' ').indexOf(f) >= 0; c.hidden = !ok; if (ok) n++; });
      if (nT) nT.textContent = n;
      if (url) history.replaceState(null, '', f === 'todos' ? location.pathname : '?f=' + f);
    };
    fTrat.forEach(function (b) { b.addEventListener('click', function () { aplicar(b.dataset.f, true); }); });
    var f0 = params.get('f');
    if (f0 && fTrat.some(function (b) { return b.dataset.f === f0; })) aplicar(f0, false);
  }

  // ---------- filtros dos resultados ----------
  var fo = $$('[data-fo]'), ft = $$('[data-ft]');
  if (fo.length) {
    var casos = $$('.caso[data-o]'), nC = $('#n-casos'), so = 'todos', st = 'todos';
    var filtrar = function () {
      var n = 0;
      fo.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.fo === so)); });
      ft.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ft === st)); });
      casos.forEach(function (c) { var ok = (so === 'todos' || c.dataset.o === so) && (st === 'todos' || c.dataset.t === st); c.hidden = !ok; if (ok) n++; });
      if (nC) nC.textContent = n;
    };
    fo.forEach(function (b) { b.addEventListener('click', function () { so = b.dataset.fo; filtrar(); }); });
    ft.forEach(function (b) { b.addEventListener('click', function () { st = b.dataset.ft; filtrar(); }); });
    if (params.get('o') && fo.some(function (b) { return b.dataset.fo === params.get('o'); })) { so = params.get('o'); filtrar(); }
  }

  // ---------- comparador de silhuetas ----------
  $$('.comp input[type="range"]').forEach(function (r) {
    var comp = r.closest('.comp');
    var mover = function () { comp.style.setProperty('--corte', r.value + '%'); };
    r.addEventListener('input', mover); mover();
  });

  // ---------- motor dos assistentes em passos ----------
  function assistente(raiz, validar, aoMostrar) {
    var passos = $$('.passo', raiz), marcas = $$('.etapas li', raiz), atual = 0;
    function ir(i, foco) {
      atual = i;
      passos.forEach(function (p, k) { p.hidden = k !== i; });
      marcas.forEach(function (m, k) { m.className = k < i ? 'feita' : k === i ? 'atual' : ''; if (k === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current'); });
      if (aoMostrar) aoMostrar(i);
      if (foco) {
        var h = $('h2', passos[i]); h.tabIndex = -1; h.focus({ preventScroll: true });
        var y = raiz.getBoundingClientRect().top + scrollY - 90;
        if (Math.abs(scrollY - y) > 60) scrollTo({ top: y, behavior: calmo ? 'auto' : 'smooth' });
      }
    }
    passos.forEach(function (p, k) {
      p.addEventListener('submit', function (e) {
        e.preventDefault();
        var erro = $('.erro', p), msg = validar(k);
        if (erro) erro.textContent = msg || '';
        if (msg) return;
        if (k < passos.length - 1) ir(k + 1, true);
      });
      var v = $('[data-volta]', p);
      if (v) v.addEventListener('click', function () { ir(k - 1, true); });
    });
    ir(0, false);
    return { ir: ir, atual: function () { return atual; } };
  }
  function marcado(nome, raiz) { var el = $('input[name="' + nome + '"]:checked', raiz); return el ? el.value : ''; }
  function marcados(sel, raiz) { return $$(sel + ':checked', raiz).map(function (i) { return i.value; }); }
  function opcao(tipo, nome, valor, titulo, desc, rec, checado) {
    return '<label class="op"><input type="' + tipo + '" name="' + nome + '" value="' + esc(valor) + '"' + (checado ? ' checked' : '') + '><span class="op-c"><b>' + esc(titulo) + '</b>' + (desc ? '<span class="d">' + esc(desc) + '</span>' : '') + (rec ? '<span class="rec">' + esc(rec) + '</span>' : '') + '</span></label>';
  }
  function linhaResumo(rot, val, passo) { return '<div><dt>' + esc(rot) + '</dt><dd>' + esc(val) + '</dd>' + (passo != null ? '<button type="button" data-ir="' + passo + '">Alterar</button>' : '<span></span>') + '</div>'; }
  function telOk(v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 11; }
  function mascara(inp) {
    inp.addEventListener('input', function () {
      var d = inp.value.replace(/\D/g, '').slice(0, 11), s = d;
      if (d.length > 2) s = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) s = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      inp.value = s;
    });
  }
  function invalido(el, ruim) { if (el) el.setAttribute('aria-invalid', ruim ? 'true' : 'false'); return ruim; }

  // ---------- Monte sua jornada ----------
  var aj = $('#assist-jornada');
  if (aj) {
    var REC_EXTRA = { inchaco: ['manual'], posop: ['manual'], contorno: ['manual'] };
    var J = { obj: '' };
    var montarAbord = function () {
      var lista = D.abordagens[J.obj] || [];
      $('#j-abord').innerHTML = lista.map(function (a) { return opcao('checkbox', 'j-ab', a, a, '', '', false); }).join('');
      $('#j-cir').hidden = J.obj !== 'posop';
    };
    var montarTecs = function () {
      var o = porId(D.objetivos, J.obj) || { tecs: [] }, rec = o.tecs.concat(REC_EXTRA[J.obj] || []);
      var ord = D.tecnologias.slice().sort(function (a, b) { return (rec.indexOf(b.id) >= 0) - (rec.indexOf(a.id) >= 0); });
      $('#j-tecs').innerHTML = ord.map(function (t) { var r = rec.indexOf(t.id) >= 0; return opcao('checkbox', 'j-tec', t.id, t.nome, t.fin, r ? 'comum neste protocolo' : '', r); }).join('');
    };
    var resumoJ = function () {
      var o = porId(D.objetivos, J.obj);
      var tecs = marcados('input[name="j-tec"]', aj).map(function (id) { return porId(D.tecnologias, id).nome; });
      J.tecTxt = $('#j-indica').checked ? 'Prefiro que a equipe indique' + (tecs.length ? ' (interesse: ' + tecs.join(', ') + ')' : '') : tecs.join(', ');
      J.abTxt = marcados('input[name="j-ab"]', aj).join(', ');
      J.quando = $('#j-quando').value;
      var h = linhaResumo('Objetivo', o.nome + ' · ' + o.proto, 0) + linhaResumo('Abordagens', J.abTxt, 1);
      if (J.obj === 'posop') h += linhaResumo('Cirurgia', J.quando, 1);
      h += linhaResumo('Tecnologias', J.tecTxt, 2) + linhaResumo('Frequência', $('#j-freq').value, 3) + linhaResumo('Período', $('#j-turno').value, 3) + linhaResumo('Início', $('#j-inicio').value, 3);
      $('#j-resumo').innerHTML = h;
    };
    var jor = assistente(aj, function (k) {
      if (k === 0) { J.obj = marcado('j-obj', aj); if (!J.obj) return 'Escolha um objetivo para continuar.'; montarAbord(); montarTecs(); }
      if (k === 1) {
        if (!marcados('input[name="j-ab"]', aj).length) return 'Marque pelo menos uma opção.';
        if (J.obj === 'posop' && invalido($('#j-quando'), !$('#j-quando').value)) return 'Conte há quanto tempo foi (ou quando será) a cirurgia.';
      }
      if (k === 2 && !marcados('input[name="j-tec"]', aj).length && !$('#j-indica').checked) return 'Marque uma tecnologia ou "Prefiro que a equipe indique".';
      if (k === 3) {
        var faltam = ['#j-freq', '#j-turno', '#j-inicio'].filter(function (s) { return invalido($(s), !$(s).value); });
        if (faltam.length) return 'Responda as três perguntas para ver o resumo.';
        resumoJ();
      }
      if (k === 4) {
        var nome = $('#j-nome').value.trim();
        if (invalido($('#j-nome'), nome.length < 2)) return 'Escreva seu nome para a clínica saber com quem falar.';
        var o = porId(D.objetivos, J.obj), obs = $('#j-obs').value.trim();
        var msg = 'Olá, Vérona Body Clinic! Montei minha jornada no site e quero enviar para avaliação.\n' +
          '• Objetivo: ' + o.nome + ' (' + o.proto + ')\n• Abordagens: ' + J.abTxt + '\n' + (J.obj === 'posop' ? '• Cirurgia: ' + J.quando + '\n' : '') +
          '• Tecnologias de interesse: ' + J.tecTxt + '\n• Frequência possível: ' + $('#j-freq').value + '\n• Melhor período: ' + $('#j-turno').value + '\n• Quero começar: ' + $('#j-inicio').value + '\n' +
          '• Nome: ' + nome + (obs ? '\n• Observação: ' + obs : '') + '\nSei que esta seleção não substitui a avaliação.';
        enviarWA(msg, $('.ok-msg', aj), 'Seleção montada. A clínica responde pelo WhatsApp para marcar sua avaliação, que é quando o plano é definido.');
      }
      return '';
    });
    aj.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) jor.ir(+b.dataset.ir, true); });
    var preObj = function (id) {
      var r = $('input[name="j-obj"][value="' + id + '"]', aj);
      if (!r) return false;
      r.checked = true; J.obj = id; montarAbord(); montarTecs(); jor.ir(1, false); return true;
    };
    if (params.get('objetivo')) preObj(params.get('objetivo'));
    $$('[data-escolhe]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); preObj(a.dataset.escolhe);
        history.replaceState(null, '', '?objetivo=' + a.dataset.escolhe + '#jornada');
        var y = aj.getBoundingClientRect().top + scrollY - 90; scrollTo({ top: y, behavior: calmo ? 'auto' : 'smooth' });
      });
    });
  }

  // ---------- Agendamento ----------
  var aa = $('#assist-agenda');
  if (aa) {
    var A = { obj: '', trat: '', dia: null, hora: '' };
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var limite = new Date(hoje); limite.setDate(limite.getDate() + 45);
    var mesVis = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    var DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    var fmtDia = function (d) { return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }); };
    var nomeTrat = function (id) { return id === 'avaliacao' ? 'Avaliação corporal completa (50 min)' : (porId(D.tratamentos, id) || {}).nome || ''; };
    var montarTrats = function () {
      var lista = D.tratamentos.filter(function (t) { return A.obj === 'naosei' || t.obj.indexOf(A.obj) >= 0; });
      var h = opcao('radio', 'a-trat', 'avaliacao', 'Avaliação corporal completa', '50 min · medidas, bioimpedância, fotos e plano por escrito', 'recomendada para começar', A.trat === 'avaliacao' || !A.trat);
      h += lista.map(function (t) { return opcao('radio', 'a-trat', t.id, t.nome, 'Sessão · ' + t.dur + ' · para quem já passou pela avaliação', '', A.trat === t.id); }).join('');
      $('#a-trats').innerHTML = h;
    };
    var fechado = function (d) { return d.getDay() === 0 || d <= hoje || d > limite; };
    var montarCal = function () {
      var c = $('#a-cal'), ano = mesVis.getFullYear(), mes = mesVis.getMonth();
      var ini = new Date(ano, mes, 1).getDay(), n = new Date(ano, mes + 1, 0).getDate();
      var h = '<div class="cal-topo"><button type="button" data-mes="-1" aria-label="Mês anterior"' + (ano === hoje.getFullYear() && mes === hoje.getMonth() ? ' disabled' : '') + '>‹</button><b>' +
        mesVis.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</b><button type="button" data-mes="1" aria-label="Próximo mês"' + (new Date(ano, mes + 1, 1) > limite ? ' disabled' : '') + '>›</button></div><div class="cal-g">';
      DIAS.forEach(function (d) { h += '<span class="dsem" aria-hidden="true">' + d + '</span>'; });
      for (var i = 0; i < ini; i++) h += '<span></span>';
      for (var dd = 1; dd <= n; dd++) {
        var d = new Date(ano, mes, dd), sel = A.dia && d.getTime() === A.dia.getTime();
        h += '<button type="button" data-dia="' + d.getTime() + '"' + (fechado(d) ? ' disabled' : '') + ' aria-pressed="' + sel + '" aria-label="' + fmtDia(d) + (d.getDay() === 0 ? ', fechado' : '') + '">' + dd + '</button>';
      }
      c.innerHTML = h + '</div>';
    };
    $('#a-cal').addEventListener('click', function (e) {
      var m = e.target.closest('[data-mes]'), d = e.target.closest('[data-dia]');
      if (m && !m.disabled) { mesVis.setMonth(mesVis.getMonth() + +m.dataset.mes); montarCal(); }
      if (d && !d.disabled) { A.dia = new Date(+d.dataset.dia); A.hora = ''; montarCal(); var b = $('[data-dia="' + d.dataset.dia + '"]'); if (b) b.focus(); $('.erro', $('.passo[data-p="2"]', aa)).textContent = ''; }
    });
    var ocupado = function (d, h) { var x = (d.getDate() * 31 + d.getMonth() * 7 + h * 13) % 5; return x === 0 || x === 3; };
    var montarHoras = function () {
      var d = A.dia, sab = d.getDay() === 6, fim = sab ? 12 : 19, grupos = [['Manhã', 8, 11], ['Tarde', 12, 17], ['Noite', 18, 19]], h = '';
      $('#a-dia-txt').textContent = 'Horários para ' + fmtDia(d) + '. Riscado = ocupado (simulação).';
      grupos.forEach(function (g) {
        var bts = '';
        for (var x = g[1]; x <= Math.min(g[2], fim); x++) {
          var t = (x < 10 ? '0' : '') + x + ':00', oc = ocupado(d, x);
          bts += '<button type="button" data-hora="' + t + '"' + (oc ? ' disabled aria-label="' + t + ', ocupado"' : '') + ' aria-pressed="' + (A.hora === t) + '">' + t + '</button>';
        }
        if (bts) h += '<p class="horas-tit">' + g[0] + '</p><div class="horas">' + bts + '</div>';
      });
      $('#a-horas').innerHTML = h;
    };
    $('#a-horas').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hora]'); if (!b || b.disabled) return;
      A.hora = b.dataset.hora;
      $$('[data-hora]', aa).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $('.erro', $('.passo[data-p="3"]', aa)).textContent = '';
    });
    mascara($('#a-tel'));
    var montarResumo = function () {
      var o = porId(D.objetivos, A.obj), p = porId(D.equipe, $('#a-prof').value);
      A.resumo = [['Objetivo', o ? o.nome : 'Ainda não sei', 0], ['O que agendar', nomeTrat(A.trat), 1], ['Data preferida', fmtDia(A.dia), 2], ['Horário preferido', A.hora, 3],
        ['Profissional', p ? p.nome : 'Sem preferência', 4], ['Nome', $('#a-nome').value.trim(), 4], ['WhatsApp', $('#a-tel').value.trim(), 4]];
      if ($('#a-obs').value.trim()) A.resumo.push(['Observação', $('#a-obs').value.trim(), 4]);
      $('#a-resumo').innerHTML = A.resumo.map(function (r) { return linhaResumo(r[0], r[1], r[2]); }).join('');
    };
    var ag = assistente(aa, function (k) {
      if (k === 0) { A.obj = marcado('a-obj', aa); if (!A.obj) return 'Escolha um objetivo (ou "Ainda não sei").'; montarTrats(); }
      if (k === 1) { A.trat = marcado('a-trat', aa); if (!A.trat) return 'Escolha o que você quer agendar.'; montarCal(); }
      if (k === 2) { if (!A.dia) return 'Toque num dia disponível do calendário.'; montarHoras(); }
      if (k === 3 && !A.hora) return 'Escolha um horário livre.';
      if (k === 4) {
        var e1 = invalido($('#a-nome'), $('#a-nome').value.trim().length < 3), e2 = invalido($('#a-tel'), !telOk($('#a-tel').value));
        if (e1 || e2) return e1 ? 'Escreva seu nome completo.' : 'Confira o WhatsApp com DDD (10 ou 11 números).';
        if (!$('#a-lgpd').checked) return 'Marque a concordância com o uso dos dados para o agendamento.';
        montarResumo();
      }
      if (k === 5) {
        var msg = 'Olá, Vérona Body Clinic! Quero agendar pelo site.\n' + A.resumo.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') + '\nAguardo a confirmação do horário.';
        enviarWA(msg, $('.ok-msg', aa), 'Pedido montado. O horário só fica confirmado quando a clínica responder no WhatsApp; até lá, nada está reservado.');
      }
      return '';
    }, function (i) { if (i === 2) montarCal(); });
    aa.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ir]'); if (!b) return;
      var i = +b.dataset.ir;
      if (i === 1) montarTrats(); if (i === 3) montarHoras();
      ag.ir(i, true);
    });
    // vindo de um tratamento, de um objetivo ou de uma profissional
    var pt = params.get('tratamento'), po = params.get('objetivo'), pp = params.get('prof');
    if (pp && porId(D.equipe, pp)) $('#a-prof').value = pp;
    var tr = pt && porId(D.tratamentos, pt);
    if (tr) { po = tr.obj[0]; A.trat = tr.id; }
    if (po) {
      var r = $('input[name="a-obj"][value="' + po + '"]', aa);
      if (r) { r.checked = true; A.obj = po; montarTrats(); ag.ir(tr ? 2 : 1, false); }
    }
  }

  // ---------- contato ----------
  var fc = $('#form-contato');
  if (fc) {
    mascara($('#c-tel'));
    fc.addEventListener('submit', function (e) {
      e.preventDefault();
      var erro = $('.erro', fc), n = $('#c-nome'), t = $('#c-tel'), a = $('#c-assunto'), m = $('#c-msg');
      var r = [invalido(n, n.value.trim().length < 2), invalido(t, !telOk(t.value)), invalido(a, !a.value), invalido(m, m.value.trim().length < 5)];
      if (r.some(Boolean)) { erro.textContent = 'Preencha os campos marcados (WhatsApp com DDD).'; return; }
      erro.textContent = '';
      enviarWA('Olá, Vérona Body Clinic! Mensagem pelo site.\n• Nome: ' + n.value.trim() + '\n• WhatsApp: ' + t.value.trim() + '\n• Assunto: ' + a.value + '\n• Mensagem: ' + m.value.trim(),
        $('.ok-msg', fc), 'Mensagem montada. A clínica responde pelo WhatsApp no horário de atendimento.');
    });
  }
})();

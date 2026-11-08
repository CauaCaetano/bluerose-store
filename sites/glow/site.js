// Glow · menu, agendamento em 6 etapas (modal), busca de unidade por CEP, bairro ou localização, mapa ilustrativo,
// filtros de tratamentos, Clube Glow (planos, economia e adesão em etapas), blog e formulários que viram mensagem no WhatsApp.
// Tudo é demonstração: as mensagens passam pela simulação de WhatsApp da moldura (window.BR_WA) e nada é reservado de verdade.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var sem = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.GLOW || { unidades: [], tratamentos: [], linhas: {}, planos: [] };
  var UN = G.unidades, TR = G.tratamentos, PL = G.planos;
  var raiz = document.documentElement;
  raiz.classList.add('js');
  if (!calmo) raiz.classList.add('mov');
  var wa = function (msg) { if (window.BR_WA) window.BR_WA(msg); };
  var guardar = function (k, v) { try { localStorage.setItem('glow-' + k, v); } catch (e) {} };
  var ler = function (k) { try { return localStorage.getItem('glow-' + k); } catch (e) { return null; } };
  // posições do mapa ilustrativo (fora de escala)
  var POS = { alphaville: [40, 95], perdizes: [150, 105], santana: [235, 48], tatuape: [330, 110], pinheiros: [105, 150], jardins: [205, 150], 'vila-mariana': [262, 192], itaim: [140, 200], moema: [210, 238], morumbi: [62, 245], 'santo-andre': [340, 262] };
  var porId = function (id) { return UN.filter(function (u) { return u.id === id; })[0] || null; };

  /* ---------- menu do celular ---------- */
  var menu = $('#menu'), abre = $('.abre-menu');
  if (menu && abre) {
    var menuAbrir = function (sim) {
      abre.setAttribute('aria-expanded', String(sim));
      if (sim) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('aberto'); }); document.body.style.overflow = 'hidden'; setTimeout(function () { var a = $('nav a', menu); if (a) a.focus(); }, 60); }
      else { menu.classList.remove('aberto'); document.body.style.overflow = ''; setTimeout(function () { menu.hidden = true; }, calmo ? 0 : 300); abre.focus(); }
    };
    abre.addEventListener('click', function () { menuAbrir(true); });
    $('.fecha-menu', menu).addEventListener('click', function () { menuAbrir(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a, [data-agendar]')) menuAbrir(false); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') menuAbrir(false);
      if (e.key === 'Tab') { var f = $$('a, button', menu), ult = f[f.length - 1]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); ult.focus(); } else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); f[0].focus(); } }
    });
  }

  /* ---------- topo e entrada suave ---------- */
  var topo = $('.topo');
  var rolou = function () { if (topo) topo.classList.toggle('rolou', scrollY > 10); };
  addEventListener('scroll', rolou, { passive: true }); rolou();
  // títulos (h1/h2) ficam parados: bloco com título não sobe inteiro, só as partes sem título
  $$('.rv').forEach(function (el) {
    if (el.matches('h1, h2')) { el.classList.remove('rv'); return; }
    if (!el.querySelector('h1, h2')) return;
    el.classList.remove('rv');
    [].forEach.call(el.children, function (f) { if (!f.matches('h1, h2') && !f.querySelector('h1, h2')) f.classList.add('rv'); });
  });
  if (!calmo && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else $$('.rv').forEach(function (el) { el.classList.add('vis'); });

  /* ---------- da avaliação ao resultado: a rolagem conta o processo e troca a foto em arco ---------- */
  var proc = $('.processo');
  if (proc) {
    var pFotos = $$('.pr-fotos img', proc), pPassos = $$('.pr-passo', proc);
    var ativaP = function (i) {
      pFotos.forEach(function (f, k) { f.classList.toggle('on', k === i); });
      pPassos.forEach(function (x, k) { x.classList.toggle('on', k === i); });
    };
    if ('IntersectionObserver' in window) {
      var ioP = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) ativaP(+e.target.dataset.i); }); }, { rootMargin: '-45% 0px -45% 0px' });
      pPassos.forEach(function (x) { ioP.observe(x); });
    }
  }

  /* ---------- WhatsApp flutuante (um só, acima da faixa da Blue Rose no celular) ---------- */
  if (!$('.wa-flutua')) {
    var wf = document.createElement('a');
    wf.className = 'wa-flutua'; wf.href = '#';
    wf.setAttribute('data-wa', 'Olá, Glow! Vim pelo site e quero tirar uma dúvida.');
    wf.setAttribute('aria-label', 'Falar com a central da Glow pelo WhatsApp');
    wf.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
    document.body.appendChild(wf);
  }

  /* ---------- etapas genéricas (agendamento e adesão ao clube) ---------- */
  // passos: [{ rot, tit, montar(corpo, st, ir), validar(st) -> texto do erro ou '' }], fim(st, corpo)
  function Etapas(caixa, passos, st, opc) {
    opc = opc || {};
    var i = 0;
    caixa.innerHTML = (opc.fechar ? '<button type="button" class="modal-x" aria-label="Fechar">×</button>' : '') +
      '<div class="et-prog" aria-hidden="true">' + passos.map(function () { return '<i></i>'; }).join('') + '</div>' +
      '<p class="et-rot" aria-live="polite"></p><h2 class="et-tit" tabindex="-1"></h2><div class="et-corpo"></div><p class="et-erro" role="alert"></p>' +
      '<div class="et-pe"><button type="button" class="botao vazado peq et-volta">Voltar</button><p class="et-atalho"></p><button type="button" class="botao peq et-segue">Continuar</button></div>';
    var corpo = $('.et-corpo', caixa), erro = $('.et-erro', caixa), volta = $('.et-volta', caixa), segue = $('.et-segue', caixa);
    function atalho() {
      var u = porId(st.un);
      $('.et-atalho', caixa).innerHTML = u ? 'Prefere conversar? <a href="#" data-wa="Olá, ' + esc(u.nome) + '! Quero falar com a unidade sobre um agendamento.">Falar direto com a unidade</a>'
        : 'Prefere conversar? <a href="#" data-wa="Olá, Glow! Quero ajuda para escolher a unidade e agendar.">Falar com a central</a>';
    }
    function mostrar(foco) {
      var p = passos[i];
      $$('.et-prog i', caixa).forEach(function (b, k) { b.classList.toggle('feito', k <= i); });
      $('.et-rot', caixa).textContent = 'Etapa ' + (i + 1) + ' de ' + passos.length + ' · ' + p.rot;
      $('.et-tit', caixa).textContent = p.tit;
      erro.textContent = '';
      corpo.innerHTML = '';
      p.montar(corpo, st, function () { if (i < passos.length - 1) avancar(); });
      volta.style.visibility = i ? 'visible' : 'hidden';
      segue.textContent = p.botao || (i === passos.length - 1 ? 'Confirmar' : 'Continuar');
      segue.classList.toggle('wa', !!p.wa);
      atalho();
      if (foco !== false) $('.et-tit', caixa).focus({ preventScroll: !opc.fechar });
    }
    function avancar() {
      var e = passos[i].validar ? passos[i].validar(st, corpo) : '';
      if (e) { erro.textContent = e; return; }
      if (i === passos.length - 1) { opc.fim(st, corpo, erro); return; }
      i++; mostrar();
    }
    segue.addEventListener('click', avancar);
    volta.addEventListener('click', function () { if (i) { i--; mostrar(); } });
    caixa.onkeydown = function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); avancar(); } };
    mostrar(opc.focoInicial);
    return { ir: function (k) { i = k; mostrar(); }, atual: function () { return i; } };
  }

  // lista de opções como botões (um escolhido)
  function opcoes(corpo, itens, atual, escolher, auto) {
    var box = document.createElement('div'); box.className = 'opcoes-et'; box.setAttribute('role', 'radiogroup');
    box.innerHTML = itens.map(function (o) {
      if (o.grupo) return '<p class="op-grupo">' + esc(o.grupo) + '</p>';
      return '<button type="button" class="op-et" role="radio" aria-checked="' + (o.v === atual) + '" data-v="' + esc(o.v) + '"' + (o.off ? ' disabled style="opacity:.5;cursor:not-allowed"' : '') + '><span><b>' + esc(o.t) + '</b>' + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</span>' + (o.e ? '<em>' + esc(o.e) + '</em>' : '') + '</button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.op-et'); if (!b || b.disabled) return;
      $$('.op-et', box).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      escolher(b.dataset.v);
      if (auto) setTimeout(auto, 180);
    });
    corpo.appendChild(box);
    var sel = $('[aria-checked="true"]', box); if (sel) setTimeout(function () { sel.scrollIntoView({ block: 'nearest' }); }, 0);
  }

  function campoNomeTel(corpo, st, so) {
    var h = '';
    if (!so || so === 'nome') h += '<div class="campo"><label for="et-nome">Seu nome</label><input id="et-nome" type="text" autocomplete="name" maxlength="60" value="' + esc(st.nome || '') + '"></div>';
    if (!so || so === 'tel') h += '<div class="campo"><label for="et-tel">Seu WhatsApp</label><input id="et-tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="(11) 9 0000-0000" value="' + esc(st.tel || '') + '"><p class="dica">Usado só para a unidade responder sobre este pedido.</p></div>';
    corpo.insertAdjacentHTML('beforeend', h);
    var t = $('#et-tel', corpo);
    if (t) t.addEventListener('input', function () {
      var d = t.value.replace(/\D/g, '').slice(0, 11), f = d;
      if (d.length > 2) f = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) f = '(' + d.slice(0, 2) + ') ' + (d.length === 11 ? d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7) : d.slice(2, 6) + '-' + d.slice(6));
      t.value = f;
    });
    var n = $('#et-nome', corpo) || t; if (n) setTimeout(function () { n.focus(); }, 30);
  }
  function validarNome(st, corpo) { var v = ($('#et-nome', corpo) || {}).value || ''; v = v.trim(); if (v.length < 2 || !/[a-zA-ZÀ-ÿ]/.test(v)) return 'Escreva seu nome para a unidade saber com quem falar.'; st.nome = v; return ''; }
  function validarTel(st, corpo) { var v = ($('#et-tel', corpo) || {}).value || ''; var d = v.replace(/\D/g, ''); if (d.length < 10 || d.length > 11) return 'Confira o WhatsApp: DDD e número, com 10 ou 11 dígitos.'; st.tel = v.trim(); return ''; }

  /* ---------- agendamento: Unidade → Serviço → Data → Horário → Nome/WhatsApp → Resumo ---------- */
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var dd = function (n) { return (n < 10 ? '0' : '') + n; };
  var dataTxt = function (d) { return DIAS[d.getDay()] + ', ' + dd(d.getDate()) + '/' + dd(d.getMonth() + 1); };
  var hoje0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  var precisa = { 'laser-lavieen': 'Laser', co2: 'Laser', criolipolise: 'Corpo', modeladora: 'Corpo', radiofrequencia: 'Corpo' };
  var AVAL = ['avaliacao', 'Avaliação inicial (40 min)', 'Com médica ou biomédica. Sai com um plano por escrito.', 'R$ 120, volta como crédito'];
  function nomeServ(id) { if (!id || id === 'avaliacao') return AVAL[1]; var t = TR.filter(function (x) { return x[0] === id; })[0]; return t ? t[1] : id; }
  function servPorTexto(txt) { if (!txt) return ''; var s = sem(txt); var t = TR.filter(function (x) { return sem(x[1]) === s || x[0] === txt; })[0]; return t ? t[0] : (s.indexOf('avalia') > -1 ? 'avaliacao' : ''); }
  function hash(s) { var h = 0; for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0; return Math.abs(h); }

  var modal = null, caixaModal = null, focoAntes = null;
  function abrirAgenda(pre) {
    pre = pre || {};
    focoAntes = document.activeElement;
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'modal'; modal.hidden = true;
      modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Agendar avaliação');
      modal.innerHTML = '<div class="etapas"></div>';
      document.body.appendChild(modal);
      caixaModal = $('.etapas', modal);
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.modal-x') || e.target.closest('[data-fecha]')) fecharAgenda(); });
      document.addEventListener('keydown', function (e) {
        if (modal.hidden || $('.br-sim:not([hidden])')) return;
        if (e.key === 'Escape') fecharAgenda();
        if (e.key === 'Tab') { var f = $$('button:not([disabled]), a, input, select', caixaModal).filter(function (x) { return x.offsetParent; }), ult = f[f.length - 1]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); ult.focus(); } else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); f[0].focus(); } }
      });
    }
    var st = { un: pre.un || ler('unidade') || '', serv: servPorTexto(pre.serv) || 'avaliacao', data: null, hora: '', nome: '', tel: '', mes: null };
    var passos = [
      { rot: 'Unidade', tit: 'Em qual unidade?', montar: function (c) {
          c.insertAdjacentHTML('beforeend', '<p style="margin-bottom:12px;color:var(--cinza);font-size:16px">11 clínicas em São Paulo e região. <a href="unidades.html">Não sabe qual é a mais perto? Busque por CEP</a>.</p>');
          opcoes(c, UN.map(function (u) { return { v: u.id, t: u.nome, s: u.endereco + ' · ' + u.regiao }; }), st.un, function (v) { st.un = v; guardar('unidade', v); }, function () { $('.et-segue', caixaModal).click(); });
        }, validar: function () { return st.un ? '' : 'Escolha uma unidade para continuar.'; } },
      { rot: 'Serviço', tit: 'O que você quer cuidar?', montar: function (c) {
          var u = porId(st.un), it = [{ grupo: 'Para começar' }, { v: AVAL[0], t: AVAL[1], s: AVAL[2], e: AVAL[3] }], ult = '';
          TR.forEach(function (t) {
            if (t[2] !== ult) { ult = t[2]; it.push({ grupo: G.linhas[t[2]] }); }
            var falta = precisa[t[0]] && u && u.servicos.indexOf(precisa[t[0]]) < 0;
            it.push({ v: t[0], t: t[1], s: falta ? 'Não disponível na ' + u.nome : t[6] + ' · ' + (t[4] === 'medica' ? 'feito por médica' : 'feito por biomédica'), e: 'R$ ' + t[5].toLocaleString('pt-BR'), off: falta });
          });
          if (st.serv && precisa[st.serv] && u && u.servicos.indexOf(precisa[st.serv]) < 0) st.serv = '';
          opcoes(c, it, st.serv, function (v) { st.serv = v; }, function () { $('.et-segue', caixaModal).click(); });
        }, validar: function () { return st.serv ? '' : 'Escolha um serviço ou a avaliação inicial.'; } },
      { rot: 'Data', tit: 'Qual dia fica bom?', montar: function (c) {
          var h = hoje0(), lim = new Date(h); lim.setDate(lim.getDate() + 45);
          if (!st.mes) st.mes = new Date((st.data || h).getFullYear(), (st.data || h).getMonth(), 1);
          var desenha = function () {
            var m = st.mes, ini = new Date(m.getFullYear(), m.getMonth(), 1), fim = new Date(m.getFullYear(), m.getMonth() + 1, 0);
            var html = '<div class="cal-cab"><button type="button" class="cal-ant" aria-label="Mês anterior"' + (m <= new Date(h.getFullYear(), h.getMonth(), 1) ? ' disabled' : '') + '>‹</button><b aria-live="polite">' + MESES[m.getMonth()] + ' de ' + m.getFullYear() + '</b><button type="button" class="cal-prox" aria-label="Próximo mês"' + (new Date(m.getFullYear(), m.getMonth() + 1, 1) > lim ? ' disabled' : '') + '>›</button></div><div class="cal">';
            html += ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(function (x, k) { return '<span aria-hidden="true" title="' + DIAS[k] + '">' + x + '</span>'; }).join('');
            for (var k = 0; k < ini.getDay(); k++) html += '<span></span>';
            for (var d = 1; d <= fim.getDate(); d++) {
              var dt = new Date(m.getFullYear(), m.getMonth(), d), off = dt < h || dt > lim || dt.getDay() === 0;
              var sel = st.data && dt.getTime() === st.data.getTime();
              html += '<button type="button" data-d="' + dt.getTime() + '" aria-pressed="' + !!sel + '" aria-label="' + dataTxt(dt) + (dt.getDay() === 0 ? ', fechado' : '') + '"' + (off ? ' disabled' : '') + '>' + d + '</button>';
            }
            c.innerHTML = html + '</div><p style="margin-top:12px;font-size:15px;color:var(--cinza)">Segunda a sábado. Domingo e feriados, fechado.</p>';
            $('.cal-ant', c).onclick = function () { st.mes = new Date(m.getFullYear(), m.getMonth() - 1, 1); desenha(); };
            $('.cal-prox', c).onclick = function () { st.mes = new Date(m.getFullYear(), m.getMonth() + 1, 1); desenha(); };
            $('.cal', c).onclick = function (e) { var b = e.target.closest('button[data-d]'); if (!b || b.disabled) return; st.data = new Date(+b.dataset.d); st.hora = ''; desenha(); setTimeout(function () { $('.et-segue', caixaModal).click(); }, 180); };
          };
          desenha();
        }, validar: function () { return st.data ? '' : 'Escolha um dia no calendário.'; } },
      { rot: 'Horário', tit: 'Qual horário?', montar: function (c) {
          var sab = st.data.getDay() === 6, fimH = sab ? 17 : 20, agora = new Date(), html = '<p style="margin-bottom:12px;font-size:16px;color:var(--cinza)">' + dataTxt(st.data) + ' na ' + esc(porId(st.un).nome) + '. Horários simulados: a unidade confirma pelo WhatsApp.</p><div class="horas">';
          var livres = 0;
          for (var hh = 8; hh <= fimH; hh++) [0, 30].forEach(function (mm) {
            if (hh === fimH && mm) return;
            var rot = hh + 'h' + (mm ? '30' : ''), quando = new Date(st.data); quando.setHours(hh, mm);
            var off = hash(st.un + st.data.toDateString() + rot) % 3 === 0 || quando < new Date(agora.getTime() + 2 * 3600e3);
            if (!off) livres++;
            html += '<button type="button" data-h="' + rot + '" aria-pressed="' + (st.hora === rot) + '"' + (off ? ' disabled aria-label="' + rot + ', ocupado"' : '') + '>' + rot + '</button>';
          });
          c.innerHTML = html + '</div>' + (livres ? '' : '<p class="et-erro" style="margin-top:12px">Nenhum horário livre neste dia. Volte e escolha outra data.</p>');
          $('.horas', c).onclick = function (e) { var b = e.target.closest('button[data-h]'); if (!b || b.disabled) return; st.hora = b.dataset.h; $$('.horas button', c).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); setTimeout(function () { $('.et-segue', caixaModal).click(); }, 180); };
        }, validar: function () { return st.hora ? '' : 'Escolha um horário.'; } },
      { rot: 'Seus dados', tit: 'Para quem é o horário?', montar: function (c) { campoNomeTel(c, st); },
        validar: function (s, c) { return validarNome(s, c) || validarTel(s, c); } },
      { rot: 'Resumo', tit: 'Confira e envie para a unidade', botao: 'Confirmar pelo WhatsApp', wa: true, montar: function (c) {
          var u = porId(st.un);
          c.innerHTML = '<dl class="resumo"><dt>Unidade</dt><dd>' + esc(u.nome) + '<br><small>' + esc(u.endereco) + '</small></dd><dt>Serviço</dt><dd>' + esc(nomeServ(st.serv)) + '</dd><dt>Data</dt><dd>' + dataTxt(st.data) + '</dd><dt>Horário</dt><dd>' + st.hora + '</dd><dt>Nome</dt><dd>' + esc(st.nome) + '</dd><dt>WhatsApp</dt><dd>' + esc(st.tel) + '</dd></dl>' +
            '<p class="aviso" style="margin-top:14px"><span><b>É um pedido, não uma reserva.</b> A mensagem vai para o WhatsApp da ' + esc(u.nome) + ' (' + esc(u.wa) + ') e o horário só fica marcado quando a unidade responder. Demonstração: no site real, liga na agenda da clínica (Trinks, Avec, Belle Software…).</span></p>';
        } }
    ];
    if (pre.un && porId(pre.un)) st.un = pre.un;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    var et = Etapas(caixaModal, passos, st, { fechar: true, fim: function () {
      var u = porId(st.un);
      wa('Olá, ' + u.nome + '! Quero agendar pelo site.\n• Nome: ' + st.nome + '\n• WhatsApp: ' + st.tel + '\n• Serviço: ' + nomeServ(st.serv) + '\n• Unidade: ' + u.nome + ' (' + u.endereco + ')\n• Data preferida: ' + dataTxt(st.data) + '\n• Horário preferido: ' + st.hora + '\nPodem confirmar se esse horário está livre?');
      $('.et-rot', caixaModal).textContent = 'Pedido montado';
      $('.et-tit', caixaModal).textContent = 'Pronto! Agora é com a unidade';
      $('.et-corpo', caixaModal).innerHTML = '<p>Sua mensagem foi montada para o WhatsApp da <b>' + esc(u.nome) + '</b>. A equipe responde confirmando o horário ou sugerindo outro parecido.</p><p style="margin-top:12px;color:var(--cinza)">Chegue 10 minutos antes e venha sem maquiagem, se puder.</p>';
      $('.et-pe', caixaModal).innerHTML = '<button type="button" class="botao vazado peq" data-novo>Fazer outro pedido</button><button type="button" class="botao peq" data-fecha>Fechar</button>';
      $('[data-novo]', caixaModal).onclick = function () { abrirAgenda({ un: st.un }); };
    } });
    // pula a etapa da unidade quando ela já veio escolhida pelo botão
    if (pre.un && porId(pre.un)) et.ir(1);
  }
  function fecharAgenda() { if (!modal || modal.hidden) return; modal.hidden = true; document.body.style.overflow = ''; if (focoAntes && focoAntes.focus) focoAntes.focus(); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-agendar]'); if (!a) return;
    e.preventDefault();
    abrirAgenda({ un: a.dataset.unidade || '', serv: a.dataset.servico || '' });
  });
  if (/^#agendar/.test(location.hash)) setTimeout(function () { abrirAgenda({}); }, 300);
  // links de ?t= antigos (tratamento escolhido) também abrem o agendamento
  try { var qp = new URLSearchParams(location.search); if (qp.get('agendar')) setTimeout(function () { abrirAgenda({ serv: qp.get('agendar'), un: qp.get('unidade') || '' }); }, 300); } catch (e) {}

  /* ---------- busca de unidade: CEP, bairro ou localização ---------- */
  var APELIDOS = { 'vila olimpia': 'itaim', 'brooklin': 'moema', 'campo belo': 'moema', 'santo amaro': 'moema', 'ibirapuera': 'moema', 'paraiso': 'vila-mariana', 'saude': 'vila-mariana', 'aclimacao': 'vila-mariana', 'vila madalena': 'pinheiros', 'butanta': 'pinheiros', 'alto de pinheiros': 'pinheiros', 'consolacao': 'jardins', 'bela vista': 'jardins', 'cerqueira cesar': 'jardins', 'paulista': 'jardins', 'higienopolis': 'perdizes', 'pompeia': 'perdizes', 'lapa': 'perdizes', 'sumare': 'perdizes', 'mooca': 'tatuape', 'analia franco': 'tatuape', 'penha': 'tatuape', 'tucuruvi': 'santana', 'casa verde': 'santana', 'vila guilherme': 'santana', 'panamby': 'morumbi', 'vila andrade': 'morumbi', 'barueri': 'alphaville', 'santana de parnaiba': 'alphaville', 'tambore': 'alphaville', 'sao bernardo': 'santo-andre', 'sao caetano': 'santo-andre' };
  function dist(a, b) { var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function porCep(txt) {
    var d = txt.replace(/\D/g, ''); if (d.length < 5) return null;
    var p = parseInt(d.slice(0, 5), 10), dentro = UN.filter(function (u) { return p >= u.cep[0] && p <= u.cep[1]; })[0];
    if (dentro) return { u: dentro, exato: true };
    var melhor = null, md = Infinity;
    UN.forEach(function (u) { var x = p < u.cep[0] ? u.cep[0] - p : p - u.cep[1]; if (x < md) { md = x; melhor = u; } });
    return { u: melhor, exato: false };
  }
  function porTexto(txt) {
    var q = sem(txt.trim()); if (q.length < 3) return null;
    var u = UN.filter(function (x) { return sem(x.bairro).indexOf(q) > -1 || sem(x.nome).indexOf(q) > -1 || q.indexOf(sem(x.bairro.split(' (')[0])) > -1; })[0];
    if (u) return u;
    for (var k in APELIDOS) if (k.indexOf(q) === 0 || q.indexOf(k) > -1) return porId(APELIDOS[k]);
    return null;
  }
  function cartaoUn(u, km, perto) {
    return '<li class="un' + (perto ? ' perto' : '') + '" id="un-' + u.id + '">' + (perto ? '<span class="un-tag">Mais perto de você</span>' : '') +
      '<h3>' + esc(u.nome) + (km != null ? '<span class="un-dist">' + (km < 1 ? 'menos de 1 km' : '≈ ' + km.toFixed(km < 10 ? 1 : 0).replace('.', ',') + ' km') + '</span>' : '') + '</h3>' +
      '<p class="un-serv">' + u.servicos.map(esc).join(' · ') + '</p>' +
      '<ul class="un-info">' +
        '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg><span><span class="so-leitor">Endereço: </span>' + esc(u.endereco) + '</span></li>' +
        '<li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span><span class="so-leitor">Horário: </span>' + esc(u.horario) + '</span></li>' +
        '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h2.6l1.5 4-2 1.3a10.5 10.5 0 0 0 6.5 6.5l1.3-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg><span><span class="so-leitor">Telefone: </span>' + esc(u.tel) + '<span class="un-sep">WhatsApp ' + esc(u.wa) + '</span></span></li>' +
        '<li class="un-chegar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 11h12M9 20l-1.5 1.5M15 20l1.5 1.5M9.5 14h.01M14.5 14h.01"/></svg><span><span class="so-leitor">Como chegar: </span>' + esc(u.chegar) + ' · ' + esc(u.carro) + '</span></li>' +
      '</ul>' +
      '<div class="un-acoes"><a class="botao peq" href="#agendar" data-agendar data-unidade="' + u.id + '">Agendar nesta unidade</a><a class="botao wa peq" href="#" data-wa="Olá, ' + esc(u.nome) + '! Vim pelo site e quero falar com a unidade." aria-label="WhatsApp da ' + esc(u.nome) + '"><span class="un-wa-tx">WhatsApp da unidade</span></a></div></li>';
  }
  $$('[data-busca-un]').forEach(function (bx) {
    var form = $('form', bx), campo = $('input', form), msg = $('.busca-msg', bx), lista = $(bx.dataset.buscaUn), limite = +(bx.dataset.limite || 99), geo = $('.geo', bx), mapa = $('.mapa svg');
    var contagem = $('.contagem');
    var filtroReg = '';
    function mostrar(ref, aviso, erro) {
      var l = UN.filter(function (u) { return !filtroReg || u.regiao === filtroReg; }).map(function (u) { return { u: u, km: ref ? dist(ref, u) : null }; });
      if (ref) l.sort(function (a, b) { return a.km - b.km; });
      var vis = l.slice(0, limite);
      lista.innerHTML = vis.map(function (x, k) { return cartaoUn(x.u, x.km, ref && k === 0); }).join('') +
        (limite > 3 && vis.length % 2 ? '<li class="un un-cta"><h3>Não achou uma unidade perto?</h3><p>A central indica a unidade mais fácil para a sua rotina, perto de casa ou do trabalho, e já ajuda a marcar.</p><div class="un-acoes"><a class="botao peq" href="#agendar" data-agendar>Agendar avaliação</a><a class="botao wa peq" href="#" data-wa="Olá, Glow! Quero ajuda para escolher a unidade mais perto.">Falar com a central</a></div></li>' : '');
      msg.textContent = aviso || ''; msg.classList.toggle('erro', !!erro);
      if (contagem) contagem.textContent = l.length + (l.length === 1 ? ' unidade' : ' unidades') + (ref ? ', da mais perto para a mais longe' : '') + (filtroReg ? ' na ' + filtroReg : '');
      if (mapa) desenharMapa(mapa, ref, vis[0] && ref ? vis[0].u.id : '');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = campo.value.trim();
      if (!v) { mostrar(null, 'Digite um CEP (8 números) ou o nome do bairro.', true); campo.focus(); return; }
      if (/\d{5}/.test(v.replace(/\D/g, '')) || /^\d/.test(v)) {
        var r = porCep(v);
        if (!r) { mostrar(null, 'O CEP precisa ter pelo menos 5 números.', true); return; }
        mostrar(r.u, r.exato ? 'O CEP ' + v + ' fica na área da ' + r.u.nome + '.' : 'Não temos unidade nessa faixa de CEP. Mostrando a partir da faixa mais próxima (' + r.u.nome + ').');
      } else {
        var u = porTexto(v);
        if (u) mostrar(u, 'Bairro encontrado: mostrando a partir da ' + u.nome + '.');
        else mostrar(null, 'Não achamos "' + v + '". Tente outro bairro ou o CEP. Abaixo, todas as unidades.', true);
      }
      lista.scrollIntoView && innerWidth < 900 && lista.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    });
    if (geo) geo.addEventListener('click', function () {
      if (!navigator.geolocation) { mostrar(null, 'Seu navegador não informa a localização. Use o CEP ou o bairro.', true); return; }
      msg.classList.remove('erro'); msg.textContent = 'Pedindo permissão para ver sua localização…';
      navigator.geolocation.getCurrentPosition(function (p) {
        mostrar({ lat: p.coords.latitude, lng: p.coords.longitude, eu: true }, 'Pronto: unidades ordenadas pela distância de onde você está. A localização não é guardada.');
      }, function () { mostrar(null, 'Não foi possível usar sua localização (permissão negada ou indisponível). Use o CEP ou o bairro.', true); }, { timeout: 10000, maximumAge: 600000 });
    });
    $$('.atalhos-bairro button', bx).forEach(function (b) { b.addEventListener('click', function () { campo.value = b.textContent; form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }); });
    $$('[data-regiao]').forEach(function (b) { b.addEventListener('click', function () { filtroReg = b.dataset.regiao; $$('[data-regiao]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); mostrar(null); }); });
    if (mapa) mapa.addEventListener('click', function (e) { var p = e.target.closest('[data-pino]'); if (!p) return; var u = porId(p.dataset.pino); mostrar(u, 'Mostrando a partir da ' + u.nome + '.'); });
    if (mapa) mapa.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-pino]')) { e.preventDefault(); e.target.closest('[data-pino]').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
    var pre = ''; try { pre = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
    if (pre) { campo.value = pre.slice(0, 40); form.dispatchEvent(new Event('submit', { cancelable: true })); } else mostrar(null);
  });
  // mapa ilustrativo (fora de escala): projeta lat/lng numa caixa
  function desenharMapa(svg, ref, perto) {
    var W = 400, H = 300;
    var px = function (p) { return p.id && POS[p.id] ? POS[p.id].slice() : [W / 2, H / 2]; };
    var h = '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="14" fill="#FAF8F3"/>' +
      '<path d="M40 170 C110 120 180 150 240 120 S350 90 380 60" fill="none" stroke="#C9D6DA" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M60 250 C120 210 160 170 230 165 S330 210 370 240" fill="none" stroke="#E9DAD3" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M200 20 L210 280" stroke="#E9DAD3" stroke-width="4"/>' +
      '<text x="' + (W - 16) + '" y="' + (H - 12) + '" text-anchor="end" style="font:600 10px Manrope,sans-serif;fill:#5A5357">Mapa ilustrativo, fora de escala</text>';
    UN.forEach(function (u) {
      var p = px(u), sel = u.id === perto;
      var dir = p[0] > 300; h += '<g class="pino' + (sel ? ' sel' : '') + '" data-pino="' + u.id + '" tabindex="0" role="button" aria-label="' + esc(u.nome) + '"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (sel ? 10 : 7) + '"/><text x="' + (dir ? p[0] - 12 : p[0] + 12) + '" y="' + (p[1] + 4) + '"' + (dir ? ' text-anchor="end"' : '') + '>' + esc(u.bairro.split(' (')[0]) + '</text></g>';
    });
    if (ref && ref.eu && perto) { var q = px(porId(perto)); q[0] += 16; q[1] -= 18; q[0] = Math.max(14, Math.min(W - 14, q[0])); q[1] = Math.max(14, Math.min(H - 14, q[1])); h += '<g class="eu"><circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="9"/><text x="' + (q[0] + 12).toFixed(1) + '" y="' + (q[1] - 8).toFixed(1) + '" style="font:700 11px Manrope,sans-serif;fill:#633D50">Você</text></g>'; }
    svg.innerHTML = h;
  }

  /* ---------- tratamentos: filtros ---------- */
  var trRes = $('#tr-res');
  if (trRes) {
    var fl = { linha: 'todas', area: 'todas', quem: 'todos', preco: '0', ordem: 'linha' };
    var desenhaTr = function () {
      var l = TR.filter(function (t) {
        return (fl.linha === 'todas' || t[2] === fl.linha) && (fl.area === 'todas' || t[3] === fl.area) && (fl.quem === 'todos' || t[4] === fl.quem) && (fl.preco === '0' || t[5] <= +fl.preco);
      });
      if (fl.ordem === 'menor') l.sort(function (a, b) { return a[5] - b[5]; });
      if (fl.ordem === 'maior') l.sort(function (a, b) { return b[5] - a[5]; });
      $('#tr-cont').textContent = l.length + (l.length === 1 ? ' tratamento' : ' tratamentos');
      trRes.innerHTML = l.length ? l.map(function (t) {
        return '<article class="tr-card"><p class="tr-linha">' + G.linhas[t[2]] + '</p><h3>' + esc(t[1]) + '</h3><p>' + esc(t[7]) + '</p><p class="tr-meta"><span>' + t[6] + '</span><span>' + (t[4] === 'medica' ? 'Feito por médica' : 'Feito por biomédica') + '</span><span>Avulso <b>' + real(t[5]) + '</b></span><span>No clube <b>' + real(t[5] * .8) + '</b></span></p><div class="tr-acoes"><a class="botao peq" href="#agendar" data-agendar data-servico="' + esc(t[1]) + '">Agendar avaliação</a><a class="botao vazado peq" href="' + t[8] + '">Ver detalhes</a></div></article>';
      }).join('') : '<p class="tr-vazio">Nenhum tratamento com esses filtros. <button type="button" class="botao peq vazado" data-limpa>Limpar filtros</button></p>';
    };
    $$('[data-f-grupo]').forEach(function (g) {
      g.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (!b) return; fl[g.dataset.fGrupo] = b.dataset.v; $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); desenhaTr(); });
    });
    $$('select[data-f]').forEach(function (s) { s.addEventListener('change', function () { fl[s.dataset.f] = s.value; desenhaTr(); }); });
    document.addEventListener('click', function (e) { if (!e.target.closest('[data-limpa]')) return; fl = { linha: 'todas', area: 'todas', quem: 'todos', preco: '0', ordem: 'linha' }; $$('[data-f-grupo]').forEach(function (g) { $$('button', g).forEach(function (x, k) { x.setAttribute('aria-pressed', String(k === 0)); }); }); $$('select[data-f]').forEach(function (s) { s.selectedIndex = 0; }); desenhaTr(); });
    try { var lq = new URLSearchParams(location.search).get('linha'); if (lq && G.linhas[lq]) { var bt = $('[data-f-grupo="linha"] button[data-v="' + lq + '"]'); if (bt) bt.click(); } } catch (e) {}
    desenhaTr();
  }

  /* ---------- Clube Glow: planos, economia e adesão ---------- */
  $$('[data-planos]').forEach(function (box) {
    box.innerHTML = PL.map(function (p, i) {
      return '<article class="plano' + (i === 1 ? ' dest' : '') + '">' + (i === 1 ? '<p class="tag">O mais escolhido (exemplo)</p>' : '') + '<h3><small>Plano 0' + (i + 1) + '</small>' + p.nome + '</h3><p class="preco">' + real(p.preco) + '<small> /mês</small></p><p class="cred">' + real(p.creditos) + ' em créditos todo mês</p><ul>' +
        p.itens.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><a class="botao' + (i === 1 ? '' : ' vazado') + '" href="clube.html#aderir" data-plano="' + p.id + '">Quero o ' + p.nome + '</a></article>';
    }).join('');
  });
  var g = $('#gasto');
  if (g) {
    var out = $('output[for="gasto"]');
    var econ = function () {
      var v = +g.value; out.textContent = real(v);
      var melhor = PL.filter(function (p) { return p.creditos <= v * 1.05; }).pop() || PL[0];
      var resto = Math.max(0, v - melhor.creditos), novo = melhor.preco + resto * (1 - melhor.desconto / 100), eco = v - novo;
      $('.econ-res').innerHTML = eco > 0 ? 'Com o <b>' + melhor.nome + '</b> você pagaria cerca de ' + real(novo) + ' pelo mesmo tanto: <b>' + real(eco * 12) + ' a menos por ano</b> (conta ilustrativa).' : 'Gastando ' + real(v) + ' por mês, o clube ainda não compensa. Ele começa a valer a partir de uns ' + real(PL[0].preco * 1.05) + ' por mês.';
    };
    g.addEventListener('input', econ); econ();
  }
  var ader = $('#adesao');
  if (ader) {
    var sa = { plano: '', nome: '', tel: '', un: ler('unidade') || '' };
    var et2 = Etapas(ader, [
      { rot: 'Plano', tit: 'Qual plano combina com você?', montar: function (c) { opcoes(c, PL.map(function (p) { return { v: p.id, t: p.nome, s: real(p.creditos) + ' em créditos por mês · ' + p.desconto + '% no que passar', e: real(p.preco) + '/mês' }; }), sa.plano, function (v) { sa.plano = v; }, function () { $('.et-segue', ader).click(); }); }, validar: function () { return sa.plano ? '' : 'Escolha um plano.'; } },
      { rot: 'Nome', tit: 'Como podemos te chamar?', montar: function (c) { campoNomeTel(c, sa, 'nome'); }, validar: validarNome },
      { rot: 'WhatsApp', tit: 'Qual é o seu WhatsApp?', montar: function (c) { campoNomeTel(c, sa, 'tel'); }, validar: validarTel },
      { rot: 'Unidade', tit: 'Qual será a sua unidade?', montar: function (c) { c.insertAdjacentHTML('beforeend', '<p style="margin-bottom:12px;color:var(--cinza);font-size:16px">Os créditos valem em todas. A unidade escolhida é a que cuida da sua adesão.</p>'); opcoes(c, UN.map(function (u) { return { v: u.id, t: u.nome, s: u.endereco }; }), sa.un, function (v) { sa.un = v; guardar('unidade', v); }, function () { $('.et-segue', ader).click(); }); }, validar: function () { return sa.un ? '' : 'Escolha uma unidade.'; } },
      { rot: 'Resumo', tit: 'Confira sua adesão', botao: 'Enviar para a unidade pelo WhatsApp', wa: true, montar: function (c) {
          var p = PL.filter(function (x) { return x.id === sa.plano; })[0], u = porId(sa.un);
          c.innerHTML = '<dl class="resumo"><dt>Plano</dt><dd>' + p.nome + ' · ' + real(p.preco) + '/mês</dd><dt>Créditos</dt><dd>' + real(p.creditos) + ' por mês</dd><dt>Nome</dt><dd>' + esc(sa.nome) + '</dd><dt>WhatsApp</dt><dd>' + esc(sa.tel) + '</dd><dt>Unidade</dt><dd>' + esc(u.nome) + '</dd></dl><p class="aviso" style="margin-top:14px"><span><b>Nada é cobrado por este site.</b> A unidade responde no WhatsApp com o contrato e o link de pagamento recorrente. Valores ilustrativos de demonstração.</span></p>';
        } }
    ], sa, { focoInicial: false, fim: function () {
      var p = PL.filter(function (x) { return x.id === sa.plano; })[0], u = porId(sa.un);
      wa('Olá, ' + u.nome + '! Quero entrar no Clube Glow.\n• Plano: ' + p.nome + ' (' + real(p.preco) + '/mês, ' + real(p.creditos) + ' em créditos)\n• Nome: ' + sa.nome + '\n• WhatsApp: ' + sa.tel + '\n• Unidade: ' + u.nome + '\nPodem me mandar o contrato e o link de pagamento?');
      $('.et-rot', ader).textContent = 'Adesão montada';
      $('.et-tit', ader).textContent = 'Pronto! A ' + u.nome + ' continua com você';
      $('.et-corpo', ader).innerHTML = '<p>A unidade responde pelo WhatsApp com o contrato e o link de pagamento. Seus créditos começam a valer no dia da primeira cobrança.</p>';
      $('.et-pe', ader).innerHTML = '<a class="botao vazado peq" href="#agendar" data-agendar data-unidade="' + u.id + '">Já agendar minha avaliação</a>';
    } });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-plano]'); if (!b) return;
      e.preventDefault(); sa.plano = b.dataset.plano; et2.ir(0);
      $$('.op-et', ader).forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.v === sa.plano)); });
      ader.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { $('.et-segue', ader).click(); }, calmo ? 0 : 450);
    });
    try { var pq = new URLSearchParams(location.search).get('plano'); if (pq && PL.some(function (x) { return x.id === pq; })) setTimeout(function () { var fake = document.createElement('a'); fake.dataset.plano = pq; fake.hidden = true; document.body.appendChild(fake); fake.click(); fake.remove(); }, 200); } catch (e) {}
  }

  /* ---------- indique e ganhe ---------- */
  var ind = $('#ind');
  if (ind) ind.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = ind.nome.value.trim().split(' ')[0]; if (n.length < 2) { $('.ind-res').textContent = 'Escreva seu primeiro nome.'; return; }
    var cod = sem(n).replace(/[^a-z]/g, '').toUpperCase().slice(0, 8) + (Date.now() % 900 + 100);
    $('.ind-res').innerHTML = 'Seu código de exemplo: <code>' + cod + '</code> · <a href="#" data-wa="Oi! Use meu código ' + cod + ' na Glow e ganhe R$ 100 no primeiro tratamento.">mandar para uma amiga</a>';
  });

  /* ---------- blog: filtro por tema ---------- */
  var filtro = $('.bl-filtro');
  if (filtro) filtro.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    $$('button', filtro).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $$('.bl-card').forEach(function (c) { c.hidden = b.dataset.f !== 'todos' && c.dataset.tema !== b.dataset.f; });
  });

  /* ---------- formulários que viram mensagem no WhatsApp ---------- */
  $$('form[data-assunto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var linhas = $$('[name]', f).filter(function (c) { return c.value.trim(); }).map(function (c) {
        var rot = c.dataset.rot || (c.closest('label') ? c.closest('label').firstChild.textContent.replace('*', '').trim() : c.name);
        return '• ' + rot + ': ' + c.value.trim();
      });
      wa('Olá, Glow! ' + f.dataset.assunto + '\n' + linhas.join('\n'));
      var ok = $('.form-ok', f); if (ok) ok.hidden = false;
    });
  });
})();

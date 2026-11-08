// Sorriso Prime · rolagem que transforma: a foto da abertura cresce, o texto do objetivo ganha cor, os serviços trocam na tela presa,
// a lista de tecnologia acende item a item, frase digitada da equipe, menu do celular e agendamento por unidade (WhatsApp).
// Cada bloco só roda se a página tiver o elemento dele (o mesmo arquivo serve a home e as páginas internas).
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return s.replace(/[<>&"]/g, ''); };
  // quanto de uma seção alta já passou (0 a 1)
  var progresso = function (el) { var r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };
  var topo = $('.topo');

  // menu do celular
  var mb = $('.menu-bt');
  if (mb) {
    var fecha = function () { topo.classList.remove('aberto'); mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Abrir menu'); };
    mb.addEventListener('click', function () { var ab = topo.classList.toggle('aberto'); mb.setAttribute('aria-expanded', String(ab)); mb.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu'); });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', fecha); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && topo.classList.contains('aberto')) { fecha(); mb.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 900) fecha(); });
  }

  // abertura: --p vai de 0 a 1; a foto cresce na primeira metade (--p2) e a frase corre depois
  var heroi = $('.heroi');
  // serviços
  var SV = [
    ['Prevenção', 'Cuidado', 'atende.webp', 'Consulta, limpeza e revisão para evitar dor e tratamento caro depois. Coberto pelos 36 convênios aceitos.', 'dentista.webp', [['Avaliação', 'plano por escrito'], ['Limpeza', 'na avaliação'], ['Restauração', 'na avaliação']], 'tratamento-prevencao.html'],
    ['Estética', 'Sorriso', 'lupa-2.webp', 'Do clareamento às lentes de contato, com o sorriso planejado na tela antes de começar.', 'sorriso.webp', [['Clareamento', 'na avaliação'], ['Lentes de contato', 'na avaliação'], ['Gengivoplastia', 'na avaliação']], 'tratamento-estetica.html'],
    ['Aparelho', 'Ortodontia', 'dr-rafael.webp', 'Aparelho fixo, estético ou alinhador transparente, com manutenção inclusa na mensalidade.', 'aparelho.webp', [['Aparelho fixo', 'mensalidade na avaliação'], ['Aparelho estético', 'mensalidade na avaliação'], ['Alinhador', 'mensalidade na avaliação']], 'tratamento-aparelho.html'],
    ['Implante', 'Reabilitação', 'lupa-1.webp', 'Implante unitário ou arcada inteira, planejado com tomografia na própria unidade e com dente provisório quando o osso permite.', 'tec-implante.webp', [['Implante unitário', 'na avaliação'], ['Protocolo fixo', 'na avaliação'], ['Enxerto ósseo', 'na avaliação']], 'tratamento-implante.html']
  ];
  var sv = $('.servicos'), svAtual = -1;
  if (sv) {
    $('.sv-indice').insertAdjacentHTML('beforeend', SV.map(function (s, i) { return '<button type="button" data-sv="' + i + '">' + s[0] + '</button>'; }).join(''));
    var mostraSv = function (i) {
      if (i === svAtual) return; svAtual = i; var s = SV[i];
      var f = $('.sv-foto img'); f.style.opacity = 0;
      setTimeout(function () { f.src = 'img/' + s[2]; f.style.opacity = 1; }, 180);
      $('.sv-tit').innerHTML = '<span><em>' + s[0] + '</em></span><span>' + s[1] + '</span>';
      $('.sv-desc').textContent = s[3];
      $('.sv-lista img').src = 'img/' + s[4];
      $('.sv-lista ul').innerHTML = s[5].map(function (x) { return '<li><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('');
      var ver = $('.sv-ver'); if (ver) { ver.href = s[6]; ver.textContent = 'Conhecer ' + s[0].toLowerCase() + ' →'; }
      $$('.sv-indice button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
    };
    $('.sv-indice').addEventListener('click', function (e) { var b = e.target.closest('[data-sv]'); if (!b) return; var r = sv.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + (+b.dataset.sv + .5) / SV.length * (sv.offsetHeight - innerHeight), behavior: 'smooth' }); });
    mostraSv(0);
  }

  // objetivo: cada palavra ganha cor conforme a rolagem
  var mt = $('.mt-texto'), palavras = [];
  if (mt) {
    mt.innerHTML = mt.textContent.trim().split(/\s+/).map(function (w) { return '<span>' + w + '</span>'; }).join(' ');
    palavras = $$('span', mt);
  }

  function rola() {
    if (heroi) {
      var p = progresso(heroi), p2 = Math.min(1, p * 2);
      heroi.style.setProperty('--p', p.toFixed(3)); heroi.style.setProperty('--p2', (calmo ? 0 : p2).toFixed(3));
    }
    if (mt) {
      var r = mt.getBoundingClientRect(), q = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      var n = Math.round(q * palavras.length); palavras.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    }
    if (sv) mostraSv(Math.min(SV.length - 1, Math.floor(progresso(sv) * SV.length)));
    // cabeçalho claro sobre as partes escuras
    var y = 36, escuro = false;
    $$('.servicos, .faixa-tec, .equipe, .porque, .depo, .final, .pg-heroi, .solucoes, .coord, .escura').forEach(function (s) { var b = s.getBoundingClientRect(); if (b.top <= y && b.bottom > y) escuro = true; });
    if (heroi) { var pp = progresso(heroi); if (pp > .45 && pp < 1) escuro = true; }
    topo.classList.toggle('escuro', escuro); topo.classList.toggle('rolou', scrollY > 40);
  }
  addEventListener('scroll', function () { requestAnimationFrame(rola); }, { passive: true }); addEventListener('resize', rola); rola();

  // tecnologia: 01 a 06, cada item acende e troca a imagem
  var TC = [['Scanner intraoral', 'tec-scanner.webp', 'Molde digital em 3D em poucos minutos, sem a massinha que dá enjoo.'], ['Lupas de aumento', 'tec-lupa.webp', 'Os dentistas trabalham com aumento de até 4 vezes para mais precisão em cada restauração.'],
            ['Microscópio operatório', 'tec-microscopio.webp', 'Canal feito com microscópio, para enxergar melhor os canais e tentar salvar o dente.'], ['Raio-x panorâmico digital', 'tec-raiox.webp', 'A boca inteira numa imagem só, com até 90% menos radiação que o filme.'],
            ['Implantes de titânio', 'tec-parafuso.webp', 'Marcas com rastreio do lote e garantia do fabricante por escrito.'], ['Planejamento do sorriso', 'tec-implante.webp', 'Você vê o planejamento no modelo antes de começar o tratamento.']];
  var tcl = $('.tc-lista ul');
  if (tcl) {
    tcl.innerHTML = TC.map(function (t, i) { return '<li data-tc="' + i + '"><button type="button">' + t[0] + '</button><small>Saiba mais</small><p>' + t[2] + '</p></li>'; }).join('');
    var tcAtual = -1;
    var mostraTc = function (i) {
      if (i === tcAtual) return; tcAtual = i; var img = $('.tc-foto img'); img.style.opacity = 0;
      setTimeout(function () { img.src = 'img/' + TC[i][1]; img.alt = TC[i][0]; img.style.opacity = 1; }, 160);
      $('.tc-n').textContent = String(i + 1).padStart(2, '0');
      $$('.tc-lista li').forEach(function (li, k) { li.classList.toggle('on', k === i); });
    };
    $('.tc-lista').addEventListener('click', function (e) { var li = e.target.closest('[data-tc]'); if (li) mostraTc(+li.dataset.tc); });
    $('.tc-lista').addEventListener('mouseover', function (e) { var li = e.target.closest('[data-tc]'); if (li && matchMedia('(pointer: fine)').matches) mostraTc(+li.dataset.tc); });
    mostraTc(0);
  }

  // equipe: frase digitada quando aparece
  var dig = $('.eq-digita');
  if (dig) {
    var frase = 'Nosso time existe para cuidar de você com calma, técnica e preço justo.', feito = false;
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || feito) return; feito = true;
      if (calmo) { dig.textContent = frase; return; }
      var i = 0; (function vai() { dig.textContent = frase.slice(0, ++i); if (i < frase.length) setTimeout(vai, 32); })();
    }, { threshold: .4 }).observe(dig);
  }

  // unidades: escolha no formulário e lista no rodapé
  // 6 unidades de exemplo na Grande BH, cada uma com o próprio WhatsApp (números fictícios)
  var UN = [
    ['Bairro Exemplo 1', 'Rua de Exemplo, 100 · Cidade Exemplo', '(31) 3334-5500', 'Seg a sáb 7h às 22h · Dom 8h às 14h', '(31) 99001-0101'],
    ['Bairro Exemplo 2', 'Rua de Exemplo, 200 · Cidade Exemplo', '(31) 3378-2100', 'Seg a sáb 8h às 21h · Dom 8h às 14h', '(31) 99001-0202'],
    ['Bairro Exemplo 3', 'Rua de Exemplo, 300 · Cidade Exemplo', '(31) 3352-0900', 'Seg a sáb 8h às 22h · Dom 8h às 14h', '(31) 99001-0303'],
    ['Bairro Exemplo 4', 'Rua de Exemplo, 400 · Cidade Exemplo', '(31) 3441-7300', 'Seg a sáb 8h às 22h · Dom 8h às 14h', '(31) 99001-0404'],
    ['Centro · Cidade Exemplo 2', 'Rua de Exemplo, 500 · Cidade Exemplo 2', '(31) 3213-6400', 'Seg a sex 7h às 21h · Sáb 8h às 14h', '(31) 99001-0505'],
    ['Centro · Cidade Exemplo 3', 'Rua de Exemplo, 600 · Cidade Exemplo 3', '(31) 3384-1200', 'Seg a sáb 8h às 21h', '(31) 99001-0606']
  ];
  var unPorNome = function (n) { for (var i = 0; i < UN.length; i++) if (UN[i][0] === n) return UN[i]; return UN[0]; };
  var un = $('.fn-un');
  if (un) un.insertAdjacentHTML('beforeend', UN.map(function (u, i) { return '<label><input type="radio" name="un" value="' + u[0] + '"' + (i ? '' : ' checked') + '>' + u[0] + '</label>'; }).join(''));
  var fu = $('.fn-unid');
  if (fu) fu.innerHTML = '<p class="fn-c" style="grid-column:1/-1;margin:0">Unidades · <a href="contato.html" style="display:inline;text-decoration:underline">ver as 6</a></p>' + UN.slice(0, 3).map(function (u) { return '<div><b>' + u[0] + '</b><p>' + u[1] + '<br>' + u[2] + '<br>' + u[3] + '</p></div>'; }).join('');
  var f = $('#fn-form');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = f.nome.value.trim(), t = f.tel.value.replace(/\D/g, ''), er = $('.erro', f);
    er.textContent = n.length < 2 ? 'Escreva o seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : '';
    if (er.textContent) return;
    var u = unPorNome(f.querySelector('[name=un]:checked').value), msg = f.msg.value.trim();
    window.BR_WA && window.BR_WA('Olá, Sorriso Prime ' + u[0] + '! Sou ' + n + ' e quero agendar uma avaliação nesta unidade.' + (msg ? ' ' + msg : ''));
    f.innerHTML = '<p style="grid-column:1/-1;font:400 28px/1 var(--serif);color:#fff">Pedido montado, ' + esc(n.split(' ')[0]) + '. Ele vai para o WhatsApp da unidade ' + esc(u[0]) + ', ' + u[4] + ', que confirma o horário com você.</p>';
  });

  // "Agendar avaliação": antes de montar a mensagem, a pessoa escolhe a unidade (cada uma com o próprio WhatsApp)
  var eu = null, euFoco = null, euUn = null, euAssunto = '';
  var assuntoDaPagina = function () { var t = $$('.trilha span'); return /tratamento-/.test(location.pathname) && t.length ? t[t.length - 1].textContent.trim() : ''; };
  function euMontar() {
    eu = document.createElement('div'); eu.className = 'esc-un'; eu.hidden = true;
    eu.setAttribute('role', 'dialog'); eu.setAttribute('aria-modal', 'true'); eu.setAttribute('aria-labelledby', 'eu-t');
    eu.innerHTML = '<div class="eu-caixa"><button type="button" class="eu-x" aria-label="Fechar">×</button>' +
      '<p class="eu-passo">Passo <b>1</b> de 2</p><h2 id="eu-t">Em qual <em>unidade?</em></h2>' +
      '<div class="eu-p1"><p class="eu-sub">Cada unidade tem o próprio WhatsApp. Escolha a mais perto de você e a mensagem vai direto para ela.</p><ul class="eu-lista">' +
      UN.map(function (u, i) { return '<li><button type="button" data-eu="' + i + '"><b>' + u[0] + '</b><span>' + u[1] + '</span><small>' + u[3] + '</small><i>WhatsApp ' + u[4] + '</i></button></li>'; }).join('') + '</ul></div>' +
      '<form class="eu-form" novalidate hidden><p class="eu-esc"><span>Unidade escolhida</span><b></b><small></small><button type="button" class="eu-troca">Trocar unidade</button></p>' +
      '<label class="eu-campo">Seu nome<input name="nome" autocomplete="name"></label>' +
      '<fieldset class="eu-per"><legend>Melhor período (opcional)</legend><label><input type="radio" name="per" value="de manhã">Manhã</label><label><input type="radio" name="per" value="à tarde">Tarde</label><label><input type="radio" name="per" value="à noite">Noite</label><label><input type="radio" name="per" value="no fim de semana">Fim de semana</label></fieldset>' +
      '<label class="eu-campo">Assunto (opcional)<input name="assunto" placeholder="Ex.: limpeza, aparelho, implante"></label>' +
      '<p class="erro" aria-live="polite"></p><button type="submit" class="pilula pilula-escura">Montar mensagem no WhatsApp <i aria-hidden="true">+</i></button>' +
      '<p class="eu-nota">Demonstração: no site real, a mensagem abre no WhatsApp da unidade escolhida e a equipe dela confirma o horário.</p></form></div>';
    document.body.appendChild(eu);
    eu.addEventListener('click', function (e) {
      if (e.target === eu || e.target.closest('.eu-x')) return euFechar();
      var b = e.target.closest('[data-eu]'); if (b) return euPasso2(+b.dataset.eu);
      if (e.target.closest('.eu-troca')) euPasso1();
    });
    eu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); euFechar(); }
      if (e.key === 'Tab') { var fo = $$('button:not([hidden]), input', eu).filter(function (x) { return x.offsetParent; }); if (!fo.length) return; var a = fo[0], z = fo[fo.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    $('.eu-form', eu).addEventListener('input', function () { $('.eu-form .erro', eu).textContent = ''; });
    $('.eu-form', eu).addEventListener('submit', function (e) {
      e.preventDefault();
      var fm = e.target, n = fm.nome.value.trim(), er = $('.erro', fm);
      er.textContent = n.length < 2 ? 'Escreva o seu nome.' : ''; if (er.textContent) { fm.nome.focus(); return; }
      var per = fm.querySelector('[name=per]:checked'), as = fm.assunto.value.trim();
      var msg = 'Olá, Sorriso Prime ' + euUn[0] + '! Sou ' + n + ' e quero agendar uma avaliação' + (as ? ' (' + as + ')' : '') + (per ? ', de preferência ' + per.value : '') + '.';
      euFechar(); window.BR_WA && window.BR_WA(msg);
    });
  }
  function euPasso1() { $('.eu-passo b', eu).textContent = '1'; $('.eu-p1', eu).hidden = false; $('.eu-form', eu).hidden = true; $('#eu-t', eu).innerHTML = 'Em qual <em>unidade?</em>'; var b = $('[data-eu]', eu); b && b.focus(); }
  function euPasso2(i) {
    euUn = UN[i]; var fm = $('.eu-form', eu);
    $('.eu-passo b', eu).textContent = '2'; $('#eu-t', eu).innerHTML = 'Quase <em>pronto</em>';
    $('.eu-esc b', fm).textContent = euUn[0]; $('.eu-esc small', fm).textContent = 'WhatsApp da unidade: ' + euUn[4] + ' · ' + euUn[3];
    if (euAssunto && !fm.assunto.value) fm.assunto.value = euAssunto;
    $('.eu-p1', eu).hidden = true; fm.hidden = false; fm.nome.focus();
  }
  function euAbrir(assunto) {
    if (!eu) euMontar();
    euFoco = document.activeElement; euAssunto = assunto || assuntoDaPagina();
    var fm = $('.eu-form', eu); fm.reset(); $('.erro', fm).textContent = '';
    eu.hidden = false; document.documentElement.classList.add('eu-aberto'); euPasso1();
  }
  function euFechar() { if (!eu || eu.hidden) return; eu.hidden = true; document.documentElement.classList.remove('eu-aberto'); if (euFoco && euFoco.focus) euFoco.focus(); }
  // todo botão "Agendar" sem unidade definida passa pela escolha da unidade
  $$('a').forEach(function (a) {
    var w = a.getAttribute('data-wa') || '';
    if ((a.getAttribute('href') === '#agendar' || /agendar/i.test(a.textContent)) && !/unidade/i.test(w)) a.setAttribute('data-agendar', a.getAttribute('data-agendar') || '');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-agendar]'); if (!a) return;
    e.preventDefault(); e.stopPropagation(); euAbrir(a.getAttribute('data-agendar'));
  }, true);

  var cr = $('.fn-cred');
  if (cr && !cr.textContent.trim()) cr.textContent = 'Fotos: Unsplash (retratos e atendimento); Wikimedia Commons: lupa por Hs1195 (CC BY-SA 4.0), scanner intraoral por ADOEDO (domínio público), modelo de implante por Tiia Monto (CC BY 4.0), raio-x panorâmico (CC BY 2.0), implante por Tafur Dental Clinic Gibraltar (CC BY 4.0), microscópio por Kiran891 (CC BY-SA 4.0).';
})();

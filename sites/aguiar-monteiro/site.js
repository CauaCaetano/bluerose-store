// Aguiar & Monteiro · tema por seção, menu de pontos, revelações, prazo de 2 anos, pedido de análise da rescisão (lista, sem valores) e envio do caso.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // tema e ponto ativo conforme a seção no meio da tela
  var secs = $$('.sec'), links = $$('.pontos a'), meta = $('meta[name="theme-color"]'), atual = null;
  function olha() {
    var meio = innerHeight * 0.5, achou = secs[0];
    for (var i = 0; i < secs.length; i++) { var r = secs[i].getBoundingClientRect(); if (r.top <= meio && r.bottom > meio) { achou = secs[i]; break; } }
    if (achou === atual) return;
    atual = achou;
    document.body.dataset.tema = achou.dataset.tema;
    if (meta) meta.content = achou.dataset.tema === 'azul' ? '#1F3A5F' : achou.dataset.tema === 'escuro' ? '#E8E1D6' : '#F7F5F0';
    links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + achou.id); });
  }
  addEventListener('scroll', olha, { passive: true }); addEventListener('resize', olha); olha();

  // menu no celular
  var bt = $('.menu-bt'), nav = $('#pontos');
  bt.addEventListener('click', function () { var ab = nav.classList.toggle('aberto'); bt.setAttribute('aria-expanded', ab); bt.textContent = ab ? 'Fechar' : 'Menu'; });
  links.forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('aberto'); bt.setAttribute('aria-expanded', 'false'); bt.textContent = 'Menu'; }); });

  // áreas: a do centro acende; resto aparece subindo
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('ativo', e.isIntersecting); }); }, { rootMargin: '-30% 0px -30% 0px' });
    $$('.ar').forEach(function (el) { io.observe(el); });
    if (!calmo) {
      var rv = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); rv.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
      // títulos (h1/h2) ficam parados: bloco com título não sobe inteiro, só as partes sem título
      var alvos = [];
      $$('.tb-grade > *, .eq-grade > *, .pg-grade > *, .sb-grade > *, .vi-bloco, .ca-bloco, .eq-lista > article, .pub-lista li, .artigo, .faq details').forEach(function (el) {
        if (!el.querySelector('h1, h2')) { alvos.push(el); return; }
        Array.prototype.forEach.call(el.children, function (f) { if (!f.matches('h1, h2') && !f.querySelector('h1, h2')) alvos.push(f); });
      });
      alvos.forEach(function (el, i) { el.classList.add('revela'); el.style.transitionDelay = (i % 4) * 0.08 + 's'; rv.observe(el); });
    }
  } else { $$('.ar').forEach(function (el) { el.classList.add('ativo'); }); }

  // prazo da lei: 2 anos depois da saída (só informa a data; não calcula valor)
  var sd = $('#saida'), hoje = new Date(), r = $('#resc');
  function aindaTrabalha() { return r && r.mot.value.indexOf('ainda') === 0; }
  function prazo() {
    var out = $('.prazo-res'); if (!sd || !out) return;
    if (aindaTrabalha()) { out.textContent = 'Como você ainda trabalha lá, esse prazo só começa a contar quando sair.'; sd.disabled = true; return; }
    sd.disabled = false;
    if (!sd.value) { out.textContent = ''; return; }
    var p = sd.value.split('-'), lim = new Date(+p[0] + 2, +p[1] - 1, 1), meses = (lim.getFullYear() - hoje.getFullYear()) * 12 + lim.getMonth() - hoje.getMonth();
    out.innerHTML = meses > 0 ? 'Saindo nesse mês, o prazo vai até <b>' + lim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</b>.' : '<b>Os 2 anos já passaram.</b> Fale com a gente mesmo assim: alguns direitos têm regras próprias.';
  }
  if (sd) { sd.max = hoje.toISOString().slice(0, 7); var ini = new Date(hoje); ini.setMonth(ini.getMonth() - 3); sd.value = ini.toISOString().slice(0, 7); }

  // solicitar análise da rescisão: o problema em palavras do dia a dia, perguntas simples e papéis; monta a mensagem do WhatsApp
  if (r) (function () {
    // papéis que mais ajudam em cada problema (mesma ordem dos botões)
    var DOCS = ['o papel da rescisão (TRCT)', 'meus holerites (contracheques)', 'minha carteira de trabalho', 'o extrato do fundo de garantia (FGTS)', 'o comprovante do dinheiro da rescisão', 'atestados, laudos ou exames', 'o papel de comunicação do acidente (CAT)', 'prints, áudios ou nomes de quem viu'];
    var AJUDA = [[0, 1, 3, 4], [1, 7], [0, 5], [6, 5], [7, 2], [7], [5, 0], [1]];
    function marcados(nome) { return $$('input[name="' + nome + '"]:checked', r).map(function (x) { return x.value; }); }
    function junta(l) { return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }
    function mensagem() {
      var probs = marcados('prob'), docs = marcados('doc'), idx = $$('input[name="prob"]', r).map(function (x, i) { return x.checked ? i : -1; }).filter(function (i) { return i >= 0; });
      var m = 'Olá, Aguiar & Monteiro! Quero pedir a análise do meu caso.';
      m += probs.length ? ' O que aconteceu: ' + junta(probs) + '.' : '';
      var saiu = '';
      if (!aindaTrabalha() && sd && sd.value) { var p = sd.value.split('-'); saiu = ', em ' + new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); }
      m += ' Situação: ' + r.mot.value + saiu + '. Tempo de trabalho lá: ' + r.tempo.value + '.';
      if (!aindaTrabalha()) m += ' Recebi o dinheiro da saída? ' + r.pago.value + '.';
      m += docs.length ? ' Papéis que tenho: ' + junta(docs) + '.' : ' Ainda não separei os papéis.';
      m += ' Posso mandar as fotos por aqui?';
      var quer = []; (idx.length ? idx : [0]).forEach(function (i) { AJUDA[i].forEach(function (d) { if (quer.indexOf(d) < 0) quer.push(d); }); });
      var falta = quer.map(function (d) { return DOCS[d]; }).filter(function (d) { return docs.indexOf(d) < 0; });
      return { texto: m, falta: falta };
    }
    function mostra() {
      var x = mensagem();
      $('.an-msg', r).textContent = '“' + x.texto + '”';
      $('.an-falta', r).textContent = x.falta.length ? 'Se tiver, separe também: ' + junta(x.falta) + '. Não precisa ter tudo para pedir a análise.' : 'Com esses papéis o advogado já consegue começar a olhar o seu caso.';
      prazo();
    }
    r.addEventListener('change', mostra); r.addEventListener('input', mostra); mostra();
    r.addEventListener('submit', function (e) { e.preventDefault(); window.BR_WA && window.BR_WA(mensagem().texto); });
    // os botões do topo já marcam o problema escolhido
    $$('a.prob[data-prob]').forEach(function (a) {
      a.addEventListener('click', function () {
        var ck = $$('input[name="prob"]', r)[+a.dataset.prob];
        if (ck && !ck.checked) { ck.checked = true; mostra(); }
      });
    });
  })(); else prazo();

  // envio do caso pelo WhatsApp
  var c = $('#caso-f');
  if (c) c.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = c.nome.value.trim(), t = c.tel.value.replace(/\D/g, ''), er = $('.erro', c);
    er.textContent = n.length < 2 ? 'Escreva seu nome.' : t.length < 10 ? 'Confira o WhatsApp com DDD.' : !c.priv.checked ? 'Marque que concorda com a política de privacidade.' : '';
    if (er.textContent) return;
    window.BR_WA && window.BR_WA('Olá, Aguiar & Monteiro! Sou ' + n + ', saí da empresa ' + (c.emp.value.trim() || '(não informada)') + ' e quero falar com um advogado sobre o meu caso.' + (c.sigilo.checked ? ' Peço sigilo total.' : ''));
    c.innerHTML = '<p class="enviado">Pronto, ' + n.split(' ')[0].replace(/[<>&"]/g, '') + '. A mensagem abriu no WhatsApp: é só enviar por lá. O escritório retorna o contato pelo canal que você escolher.</p>';
  });
})();

// ---------- agendar conversa: painel lateral em 3 passos (assunto, dia e período, contato) e confirmação com resumo ----------
// Demonstração: nada é enviado. Num site real, o pedido chega no WhatsApp e no e-mail do escritório.
(function () {
  'use strict';
  var doc = document, calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ASSUNTOS = ['Fui demitido e não recebi tudo', 'Horas extras', 'Demitido doente ou machucado', 'Acidente no trabalho', 'Trabalho sem carteira', 'Humilhação ou assédio', 'Grávida e demitida', 'Outro problema'];
  var PAGINA = { rescisao: 0, 'horas-extras': 1, acidente: 3, carteira: 4, 'assedio-moral': 5, gestantes: 6 };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function diasUteis(n) {
    var r = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (r.length < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w > 0 && w < 6) r.push(new Date(d)); }
    return r;
  }
  var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var painel, veu, passo = 1, dados = {}, voltaFoco = null;

  function monta() {
    veu = doc.createElement('div'); veu.className = 'ag-veu'; veu.hidden = true;
    painel = doc.createElement('aside');
    painel.className = 'ag'; painel.hidden = true;
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); painel.setAttribute('aria-labelledby', 'ag-t');
    var dias = diasUteis(6).map(function (d, i) {
      var v = SEM[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()];
      return '<label class="ag-op ag-dia"><input type="radio" name="dia" value="' + v + '"' + (i === 0 ? ' checked' : '') + '><span><small>' + SEM[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MES[d.getMonth()] + '</small></span></label>';
    }).join('');
    painel.innerHTML =
      '<div class="ag-cab"><p class="ag-passo" aria-live="polite">Passo <b>1</b> de 3</p><button type="button" class="ag-x" aria-label="Fechar">×</button></div>' +
      '<h2 id="ag-t" class="ag-tit">Agendar conversa</h2>' +
      '<ol class="ag-trilho" aria-hidden="true"><li class="on"></li><li></li><li></li></ol>' +
      '<form class="ag-f" novalidate>' +
      '<fieldset class="ag-et" data-p="1"><legend>O que aconteceu?</legend><div class="ag-grade">' +
      ASSUNTOS.map(function (a, i) { return '<label class="ag-op"><input type="radio" name="assunto" value="' + a + '"' + (i === 0 ? ' checked' : '') + '><span>' + a + '</span></label>'; }).join('') +
      '</div></fieldset>' +
      '<fieldset class="ag-et" data-p="2" hidden><legend>Qual dia e período?</legend><div class="ag-dias">' + dias + '</div>' +
      '<div class="ag-grade ag-per"><label class="ag-op"><input type="radio" name="periodo" value="manhã (9h às 12h)" checked><span>Manhã</span></label><label class="ag-op"><input type="radio" name="periodo" value="tarde (13h às 18h)"><span>Tarde</span></label></div>' +
      '<div class="ag-grade ag-per"><label class="ag-op"><input type="radio" name="forma" value="no escritório" checked><span>No escritório</span></label><label class="ag-op"><input type="radio" name="forma" value="por vídeo no WhatsApp"><span>Por vídeo</span></label></div></fieldset>' +
      '<fieldset class="ag-et" data-p="3" hidden><legend>Como falamos com você?</legend>' +
      '<label class="ag-campo">Seu nome<input name="nome" autocomplete="name"></label>' +
      '<label class="ag-campo">WhatsApp com DDD<input name="tel" inputmode="tel" autocomplete="tel" placeholder="(19) 99999-9999"></label>' +
      '<label class="ag-ck"><input type="checkbox" name="sigilo" checked><span>Quero sigilo: a empresa não fica sabendo do contato.</span></label>' +
      '<label class="ag-ck"><input type="checkbox" name="priv"><span>Li a <a href="privacidade.html">política de privacidade</a> e concordo com o uso destes dados para o retorno.</span></label></fieldset>' +
      '<p class="ag-erro" aria-live="polite"></p>' +
      '<div class="ag-pe"><button type="button" class="ag-volta" hidden>Voltar</button><button type="submit" class="ag-segue">Continuar</button></div>' +
      '</form>' +
      '<div class="ag-ok" hidden tabindex="-1"></div>';
    doc.body.appendChild(veu); doc.body.appendChild(painel);
    var f = painel.querySelector('.ag-f');
    painel.querySelector('.ag-x').addEventListener('click', fecha);
    veu.addEventListener('click', fecha);
    painel.querySelector('.ag-volta').addEventListener('click', function () { mostra(passo - 1); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var er = painel.querySelector('.ag-erro'); er.textContent = '';
      if (passo < 3) { mostra(passo + 1); return; }
      var n = f.nome.value.trim(), t = f.tel.value.replace(/\D/g, '');
      if (n.length < 2) { er.textContent = 'Escreva o seu nome.'; f.nome.focus(); return; }
      if (t.length < 10) { er.textContent = 'Confira o WhatsApp com DDD.'; f.tel.focus(); return; }
      if (!f.priv.checked) { er.textContent = 'Marque a concordância com a política de privacidade.'; return; }
      confirma(f);
    });
    doc.addEventListener('keydown', function (e) {
      if (painel.hidden) return;
      if (e.key === 'Escape') fecha();
      if (e.key === 'Tab') {
        var fo = [].filter.call(painel.querySelectorAll('button, input, a[href], [tabindex="-1"]'), function (x) { return x.offsetParent !== null; });
        if (!fo.length) return;
        if (e.shiftKey && doc.activeElement === fo[0]) { e.preventDefault(); fo[fo.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === fo[fo.length - 1]) { e.preventDefault(); fo[0].focus(); }
      }
    });
  }
  function mostra(p) {
    passo = p;
    [].forEach.call(painel.querySelectorAll('.ag-et'), function (et) { et.hidden = +et.dataset.p !== p; });
    [].forEach.call(painel.querySelectorAll('.ag-trilho li'), function (li, i) { li.className = i < p ? 'on' : ''; });
    painel.querySelector('.ag-passo b').textContent = p;
    painel.querySelector('.ag-volta').hidden = p === 1;
    painel.querySelector('.ag-segue').textContent = p === 3 ? 'Confirmar pedido' : 'Continuar';
    var alvo = painel.querySelector('.ag-et[data-p="' + p + '"] input'); if (alvo) alvo.focus({ preventScroll: true });
  }
  function confirma(f) {
    var nome = f.nome.value.trim().split(' ')[0];
    var ok = painel.querySelector('.ag-ok');
    ok.innerHTML = '<p class="ag-selo" aria-hidden="true">✓</p><h3>Pedido registrado, ' + esc(nome) + '.</h3>' +
      '<dl class="ag-res"><div><dt>Assunto</dt><dd>' + esc(f.assunto.value) + '</dd></div><div><dt>Quando</dt><dd>' + esc(f.dia.value) + ', ' + esc(f.periodo.value) + '</dd></div><div><dt>Onde</dt><dd>' + esc(f.forma.value) + '</dd></div><div><dt>Retorno</dt><dd>WhatsApp ' + esc(f.tel.value) + (f.sigilo.checked ? ', com sigilo' : '') + '</dd></div></dl>' +
      '<p class="ag-nota">O escritório confirma o horário pelo WhatsApp. Leve carteira de trabalho, holerites e o termo de rescisão, se tiver.</p>' +
      '<p class="ag-demo">Demonstração: nada foi enviado. Num site real, o pedido chega no WhatsApp e no e-mail do escritório.</p>' +
      '<button type="button" class="ag-fim">Fechar</button>';
    f.hidden = true; painel.querySelector('.ag-trilho').hidden = true; painel.querySelector('.ag-passo').textContent = 'Pronto';
    ok.hidden = false; painel.scrollTop = 0; ok.focus();
    ok.querySelector('.ag-fim').addEventListener('click', fecha);
  }
  function abre(assunto) {
    if (!painel) monta();
    var f = painel.querySelector('.ag-f'), ok = painel.querySelector('.ag-ok');
    if (!ok.hidden) { ok.hidden = true; f.hidden = false; f.reset(); painel.querySelector('.ag-trilho').hidden = false; painel.querySelector('.ag-passo').innerHTML = 'Passo <b>1</b> de 3'; }
    if (assunto != null && ASSUNTOS[assunto]) f.assunto.value = ASSUNTOS[assunto];
    painel.querySelector('.ag-erro').textContent = '';
    voltaFoco = doc.activeElement;
    veu.hidden = false; painel.hidden = false;
    doc.documentElement.classList.add('ag-aberto');
    requestAnimationFrame(function () { veu.classList.add('on'); painel.classList.add('on'); });
    mostra(1);
  }
  function fecha() {
    painel.classList.remove('on'); veu.classList.remove('on');
    doc.documentElement.classList.remove('ag-aberto');
    setTimeout(function () { painel.hidden = true; veu.hidden = true; }, calmo ? 0 : 380);
    if (voltaFoco && voltaFoco.focus) voltaFoco.focus({ preventScroll: true });
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-agendar]'); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    var pg = (location.pathname.match(/area-([\w-]+)\.html/) || [])[1];
    var as = a.dataset.agendar !== '' ? +a.dataset.agendar : (pg in PAGINA ? PAGINA[pg] : null);
    abre(as);
  }, true);
})();

// ---------- como funciona: a foto acompanha o passo que está no meio da tela ----------
(function () {
  var passos = [].slice.call(document.querySelectorAll('.pr-passo')), fotos = [].slice.call(document.querySelectorAll('.pr-fotos img'));
  if (!passos.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = +e.target.dataset.i;
      passos.forEach(function (p, k) { p.classList.toggle('on', k === i); });
      fotos.forEach(function (f, k) { f.classList.toggle('on', k === i); });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  passos.forEach(function (p) { io.observe(p); });
})();

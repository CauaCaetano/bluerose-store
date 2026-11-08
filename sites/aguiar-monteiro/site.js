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
      $$('.tb-grade > *, .eq-grade > *, .pg-grade > *, .sb-grade > *, .vi-bloco, .ca-bloco, .eq-lista > article, .pub-lista li, .artigo, .faq details').forEach(function (el, i) { el.classList.add('revela'); el.style.transitionDelay = (i % 4) * 0.08 + 's'; rv.observe(el); });
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

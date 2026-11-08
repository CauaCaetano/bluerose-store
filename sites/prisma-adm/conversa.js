/*
 * Prisma · "Falar com a administradora": painel lateral em 4 passos (perfil → assunto → quando → dados)
 * com confirmação e resumo. Demonstração: nada é enviado; o pedido só aparece na tela.
 * Abre por qualquer elemento [data-painel] (opcional: data-painel="alugar|dono|inquilino|anunciar", data-imovel="PR-1021").
 * Também cuida do menu "Entrar" do cabeçalho.
 */
(function () {
  'use strict';
  var doc = document, U = window.PR || {}, P = window.PRISMA;
  var esc = U.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var brl0 = U.brl0 || function (n) { return 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR'); };

  // ---------- menu "Entrar" (details/summary) ----------
  var entrar = doc.querySelector('.entrar-menu');
  if (entrar) {
    doc.addEventListener('click', function (e) { if (entrar.open && !entrar.contains(e.target)) entrar.open = false; });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && entrar.open) { entrar.open = false; entrar.querySelector('summary').focus(); } });
  }

  var PERFIS = {
    dono: { rot: 'Tenho imóvel com a Prisma', sub: 'Extrato, repasse, reajuste ou reparo', assuntos: ['Extrato ou repasse', 'Reajuste do aluguel', 'Reparo no imóvel', 'Rescisão do contrato', 'Outro assunto'] },
    anunciar: { rot: 'Quero que a Prisma administre', sub: 'Avaliação gratuita do aluguel', assuntos: ['Avaliação gratuita do aluguel', 'Trocar de administradora', 'Taxas e serviços', 'Outro assunto'] },
    inquilino: { rot: 'Moro num imóvel da Prisma', sub: 'Boleto, manutenção ou contrato', assuntos: ['2ª via do boleto', 'Manutenção', 'Renovação ou saída', 'Outro assunto'] },
    alugar: { rot: 'Quero alugar um imóvel', sub: 'Visita a um imóvel vago', assuntos: ['Agendar visita', 'Dúvida sobre garantia', 'Fazer uma proposta'] }
  };
  var PERIODOS = ['Manhã · 8h às 12h', 'Tarde · 13h às 18h'];
  var CANAIS = ['WhatsApp', 'Ligação', 'E-mail'];
  var SEM = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

  function diasUteis(n) {
    var r = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (r.length < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w > 0 && w < 6) r.push(SEM[w] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')); }
    return r;
  }
  var imoveis = P && P.carregarImoveis ? P.carregarImoveis() : [];
  function linhaImovel(im) { return '<span class="conv-im-tit">' + esc(im.titulo) + '</span><span class="selo selo-ok">Disponível</span> <span class="nw"><b>' + brl0(im.aluguel) + '</b> de aluguel</span> · <span class="nw">total ' + brl0(im.total) + ' por mês</span>'; }

  var st, passo = 0, aberto = false, origem = null, raiz, painel, form, tit, rotPasso, barra, btVolta, btAvanca, pe;
  function zera(pre) { st = { perfil: '', assunto: '', imovel: '', obs: '', dia: '', periodo: '', canal: 'WhatsApp', nome: '', fone: '', email: '', aceite: false }; if (pre) for (var k in pre) st[k] = pre[k]; }

  function monta() {
    raiz = doc.createElement('div'); raiz.className = 'conv'; raiz.hidden = true;
    raiz.innerHTML = '<div class="conv-fundo" data-conv-fecha></div>' +
      '<section class="conv-painel" role="dialog" aria-modal="true" aria-labelledby="conv-t">' +
        '<header class="conv-cab"><div><p class="conv-passo" id="conv-passo">Passo 1 de 4</p><h2 id="conv-t" tabindex="-1">Falar com a Prisma</h2></div><button type="button" class="conv-x" data-conv-fecha aria-label="Fechar">×</button></header>' +
        '<div class="conv-prog" aria-hidden="true"><i></i></div>' +
        '<form class="conv-corpo" novalidate></form>' +
        '<footer class="conv-pe"><button type="button" class="bt bt-cla" data-volta>Voltar</button><button type="button" class="bt bt-pri" data-avanca>Continuar</button></footer>' +
      '</section>';
    doc.body.appendChild(raiz);
    painel = raiz.querySelector('.conv-painel'); form = raiz.querySelector('form'); tit = raiz.querySelector('#conv-t');
    rotPasso = raiz.querySelector('#conv-passo'); barra = raiz.querySelector('.conv-prog i'); pe = raiz.querySelector('.conv-pe');
    btVolta = raiz.querySelector('[data-volta]'); btAvanca = raiz.querySelector('[data-avanca]');
    raiz.addEventListener('click', function (e) {
      if (e.target.closest('[data-conv-fecha]')) { fecha(); return; }
      if (e.target.closest('[data-novo]')) { zera(); passo = 0; desenha(); return; }
    });
    btVolta.addEventListener('click', function () { if (passo > 0) { guarda(); passo--; desenha(); } });
    btAvanca.addEventListener('click', avanca);
    form.addEventListener('submit', function (e) { e.preventDefault(); avanca(); });
    form.addEventListener('change', function (e) {
      guarda();
      // no passo 1, escolher já avança (um toque a menos)
      if (passo === 0 && e.target.name === 'perfil') { st.assunto = st.perfil === 'alugar' ? 'Agendar visita' : ''; avanca(); }
    });
    raiz.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fecha(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(painel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === a || doc.activeElement === tit)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }

  function radios(nome, lista, atual, sub) {
    return '<div class="conv-opcoes">' + lista.map(function (o, i) {
      var v = typeof o === 'string' ? o : o.v, r = typeof o === 'string' ? o : o.r, s = typeof o === 'string' ? '' : o.s;
      return '<label class="conv-op"><input type="radio" name="' + nome + '" value="' + esc(v) + '"' + (atual === v ? ' checked' : '') + (i === 0 ? ' required' : '') + '><span><b>' + esc(r) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</span></label>';
    }).join('') + '</div>';
  }
  function chips(nome, lista, atual) {
    return '<div class="conv-chips">' + lista.map(function (o, i) { return '<label class="conv-chip"><input type="radio" name="' + nome + '" value="' + esc(o) + '"' + (atual === o ? ' checked' : '') + (i === 0 ? ' required' : '') + '><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
  }

  var TITULOS = ['Quem é você?', 'Sobre o quê?', 'Quando falamos?', 'Seus dados'];
  function desenha() {
    var h = '';
    pe.hidden = false; btVolta.hidden = passo === 0; btAvanca.textContent = passo === 3 ? 'Enviar pedido' : 'Continuar';
    if (passo < 4) {
      rotPasso.textContent = 'Passo ' + (passo + 1) + ' de 4'; tit.textContent = TITULOS[passo];
      barra.style.transform = 'scaleX(' + ((passo + 1) / 4) + ')';
      painel.classList.remove('feito');
    }
    if (passo === 0) {
      h = '<fieldset class="campo"><legend class="sr">Quem é você</legend>' + radios('perfil', Object.keys(PERFIS).map(function (k) { return { v: k, r: PERFIS[k].rot, s: PERFIS[k].sub }; }), st.perfil) + '</fieldset>';
    } else if (passo === 1) {
      var pf = PERFIS[st.perfil] || PERFIS.dono;
      h = '<fieldset class="campo"><legend class="conv-leg">Assunto</legend>' + radios('assunto', pf.assuntos, st.assunto) + '</fieldset>';
      if (st.perfil === 'alugar' && imoveis.length) {
        h += '<div class="campo"><label class="conv-leg" for="conv-imovel">Imóvel</label><select id="conv-imovel" name="imovel" required><option value="">Escolha o imóvel</option>' +
          imoveis.map(function (im) { return '<option value="' + im.cod + '"' + (st.imovel === im.cod ? ' selected' : '') + '>' + im.cod + ' · ' + esc(im.bairro) + ' · ' + brl0(im.aluguel) + '</option>'; }).join('') + '</select>';
        var sel = st.imovel && P.obterImovel(st.imovel);
        if (sel) h += '<p class="conv-imovel">' + linhaImovel(sel) + '</p>';
        h += '</div>';
      } else {
        h += '<div class="campo"><label class="conv-leg" for="conv-obs">Conte em uma frase <span class="opc">(opcional)</span></label><textarea id="conv-obs" name="obs" rows="3" maxlength="400" placeholder="' + (st.perfil === 'anunciar' ? 'Ex.: apartamento de 2 quartos no Jardim Irajá, vago desde setembro' : 'Ex.: código do contrato e o que aconteceu') + '">' + esc(st.obs) + '</textarea></div>';
      }
    } else if (passo === 2) {
      var vis = st.perfil === 'alugar' && st.assunto === 'Agendar visita';
      h = '<fieldset class="campo"><legend class="conv-leg">' + (vis ? 'Dia da visita' : 'Melhor dia para o retorno') + '</legend>' + chips('dia', diasUteis(6), st.dia) + '</fieldset>' +
        '<fieldset class="campo"><legend class="conv-leg">Período</legend>' + chips('periodo', PERIODOS, st.periodo) + '</fieldset>' +
        '<fieldset class="campo"><legend class="conv-leg">' + (vis ? 'Como confirmamos' : 'Como prefere o retorno') + '</legend>' + chips('canal', CANAIS, st.canal) + '</fieldset>';
    } else if (passo === 3) {
      h = '<div class="campo"><label class="conv-leg" for="conv-nome">Nome</label><input id="conv-nome" name="nome" autocomplete="name" required minlength="3" value="' + esc(st.nome) + '"></div>' +
        '<div class="campo"><label class="conv-leg" for="conv-fone">Celular com DDD</label><input id="conv-fone" name="fone" type="tel" inputmode="tel" autocomplete="tel" data-tipo="fone" required value="' + esc(st.fone) + '" placeholder="(16) 99999-0000"></div>' +
        '<div class="campo"><label class="conv-leg" for="conv-email">E-mail' + (st.canal === 'E-mail' ? '' : ' <span class="opc">(opcional)</span>') + '</label><input id="conv-email" name="email" type="email" autocomplete="email"' + (st.canal === 'E-mail' ? ' required' : '') + ' value="' + esc(st.email) + '"></div>' +
        '<div class="campo"><label class="aceite"><input type="checkbox" name="aceite" required' + (st.aceite ? ' checked' : '') + '> Concordo com o uso destes dados só para responder a este pedido (<a href="privacidade.html">privacidade</a>).</label></div>';
    } else {
      confirma(); return;
    }
    form.innerHTML = h;
    if (passo === 0) tit.focus(); else { var c = form.querySelector('input:checked, input, select, textarea'); if (c) c.focus({ preventScroll: true }); }
    form.scrollTop = 0;
  }

  function guarda() {
    var fd = new FormData(form);
    ['perfil', 'assunto', 'imovel', 'obs', 'dia', 'periodo', 'canal', 'nome', 'fone', 'email'].forEach(function (k) { if (fd.has(k)) st[k] = String(fd.get(k) || '').trim(); });
    if (form.querySelector('[name=aceite]')) st.aceite = !!form.querySelector('[name=aceite]').checked;
    if (passo === 1 && form.querySelector('#conv-imovel')) {
      var p = form.querySelector('.conv-imovel'), sel = st.imovel && P.obterImovel(st.imovel);
      if (sel) { if (!p) { p = doc.createElement('p'); p.className = 'conv-imovel'; form.querySelector('#conv-imovel').parentNode.appendChild(p); } p.innerHTML = linhaImovel(sel); }
      else if (p) p.remove();
    }
  }

  function avanca() {
    guarda();
    if (U.validar && !U.validar(form)) return;
    if (passo === 0 && !st.perfil) return;
    passo++; desenha();
  }

  function confirma() {
    var pf = PERFIS[st.perfil] || PERFIS.dono, im = st.imovel && P && P.obterImovel(st.imovel);
    var prot = 'AT-' + String(Date.now()).slice(-5);
    var linhas = [['Perfil', pf.rot], ['Assunto', st.assunto]];
    if (im) linhas.push(['Imóvel', im.cod + ' · ' + im.titulo + ' · ' + brl0(im.aluguel) + ' de aluguel']);
    if (st.obs) linhas.push(['Mensagem', st.obs]);
    linhas.push([st.perfil === 'alugar' && st.assunto === 'Agendar visita' ? 'Visita' : 'Retorno', st.dia + ' · ' + st.periodo.split(' · ')[0].toLowerCase() + ' · por ' + st.canal]);
    linhas.push(['Contato', st.nome + ' · ' + st.fone + (st.email ? ' · ' + st.email : '')]);
    rotPasso.textContent = 'Protocolo ' + prot + ' (exemplo)'; tit.textContent = 'Pedido registrado';
    barra.style.transform = 'scaleX(1)'; painel.classList.add('feito');
    form.innerHTML = '<div class="conv-ok" role="status"><span class="conv-ok-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span><p>Um gestor da Prisma responde em até 1 dia útil, no dia e período escolhidos.</p></div>' +
      '<dl class="conv-resumo">' + linhas.map(function (l) { return '<div><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]).replace(/(\(\d{2}\) [\d-]+)/, '<span class="nw">$1</span>') + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="conv-demo"><b>Demonstração.</b> Nada foi enviado: este é um site de exemplo. No site real, o pedido chega no WhatsApp e no sistema da administradora.</p>';
    pe.hidden = false; btVolta.hidden = true;
    btAvanca.textContent = 'Fechar';
    btAvanca.onclick = null;
    tit.focus();
  }

  function abre(pre, el) {
    if (!raiz) monta();
    // fecha o menu do celular, se estiver aberto
    var g = doc.getElementById('gaveta'), bm = doc.querySelector('.bt-menu');
    if (g && !g.hidden) { g.hidden = true; doc.body.classList.remove('menu-aberto'); if (bm) bm.setAttribute('aria-expanded', 'false'); }
    if (entrar) entrar.open = false;
    origem = el || doc.activeElement; zera(pre);
    passo = st.perfil ? 1 : 0;
    if (st.perfil === 'alugar' && !st.assunto) st.assunto = 'Agendar visita';
    raiz.hidden = false; aberto = true; doc.body.classList.add('com-janela');
    desenha();
    void raiz.offsetWidth; raiz.classList.add('aberto');
  }
  // Esc fecha mesmo se o foco estiver fora do painel
  doc.addEventListener('keydown', function (e) { if (aberto && e.key === 'Escape' && !(raiz && raiz.contains(e.target))) fecha(); });
  function fecha() {
    if (!aberto) return; aberto = false; raiz.classList.remove('aberto'); doc.body.classList.remove('com-janela');
    var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () { if (!aberto) raiz.hidden = true; }, reduz ? 0 : 380);
    if (origem && origem.focus) origem.focus();
  }

  // no passo da confirmação o botão principal fecha
  doc.addEventListener('click', function (e) {
    if (raiz && painel.classList.contains('feito') && e.target === btAvanca) { e.stopImmediatePropagation(); fecha(); }
  }, true);

  // qualquer [data-painel] abre o painel (antes de outros cliques, como o WhatsApp simulado)
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-painel]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var pre = {}, p = b.getAttribute('data-painel'); if (p && PERFIS[p]) pre.perfil = p;
    var c = b.getAttribute('data-imovel'); if (c) { pre.imovel = c; pre.perfil = 'alugar'; }
    abre(pre, b);
  }, true);

  window.PR_CONVERSA = { abrir: abre, fechar: fecha };
})();

// Ana Ribeiro · rodada 7. (1) "Agendar visita" vira um painel lateral em passos (imóvel, como, dia, horário, você)
// que termina numa confirmação com resumo. Envio simulado: nada sai da página. (2) O convite do rodapé vira um bloco
// final em tela cheia, com foto real, logo antes do rodapé. Sem JavaScript, os links continuam levando a agendar.html.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var SEM_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var HORAS = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  var imoveis = (window.ANA && window.ANA.imoveis) || [];
  var preco = function (v) { return v >= 1e6 ? 'R$ ' + (v / 1e6).toFixed(v % 1e6 ? 1 : 0).replace('.', ',') + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil'; };

  // ---------------------------------------------------------------- 1. bloco final em tela cheia
  var rod = $('.rodape'), topo = rod && $('.rd-topo', rod), meio = rod && $('.rd-meio', rod);
  if (rod && topo && meio && !$('.cta-final') && !/agendar.html$/.test(location.pathname)) {
    var cta = document.createElement('section');
    cta.className = 'cta-final';
    cta.setAttribute('data-tom', 'escuro');
    cta.setAttribute('aria-labelledby', 'cf-t');
    var h2 = $('h2', topo); if (h2) { h2.id = 'cf-t'; h2.innerHTML = 'Marque a <em>visita.</em>'; }
    cta.innerHTML = '<img class="cf-foto" src="img/santo-varanda.webp" alt="" width="1600" height="1067" loading="lazy" decoding="async"><div class="cf-dentro"><p class="olho">VISITA COM A ANA</p></div><p class="selo-foto">Imagem ilustrativa</p>';
    var dentro = $('.cf-dentro', cta);
    dentro.appendChild(topo); dentro.appendChild(meio);
    var p = $('p', meio); if (p) p.innerHTML = 'Presencial ou por vídeo, de segunda a sábado.<br>Eu confirmo em até duas horas.';
    var bts = $('.rd-bts', meio);
    if (bts) bts.innerHTML = '<a class="bt bt-bege" href="agendar.html">Agendar visita <i aria-hidden="true">↗</i></a><a class="bt bt-linha" href="contato.html" data-wa="Olá, Ana! Vim pelo site e queria conversar sobre imóveis.">Falar no WhatsApp <i aria-hidden="true">↗</i></a>';
    rod.parentNode.insertBefore(cta, rod);
    // o cabeçalho pega o tom do bloco embaixo dele (site.js); o bloco novo entra depois, então o tom é ajustado aqui
    var cab = $('.cab'), pedido = false;
    var tom = function () { pedido = false; var r = cta.getBoundingClientRect(); if (cab && r.top <= 40 && r.bottom > 40) cab.dataset.tom = 'escuro'; };
    window.addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(tom); } }, { passive: true });
  }

  // galeria do imóvel no celular é clara (r7.css): o cabeçalho acompanha
  if (window.matchMedia('(max-width: 900px)').matches) $$('.cine[data-tom="escuro"]').forEach(function (c) { c.setAttribute('data-tom', 'claro2'); });

  // ---------------------------------------------------------------- 2. painel lateral de visita
  var codPagina = (function () { var c = $('.im-chips li:not(.im-chip-sit)'); return c ? c.textContent.trim() : ''; })();
  var e = { cod: codPagina, modo: '', dia: null, hora: '', nome: '', tel: '' };
  var passo = 1, ultimoFoco = null;

  var opcoesImovel = imoveis.map(function (im) {
    return '<label class="pv-op pv-im"><input type="radio" name="pv-im" value="' + esc(im.cod) + '"><img src="img/' + esc(im.foto) + '.webp" alt="" width="96" height="72" loading="lazy" decoding="async"><span><b>' + esc(im.titulo) + '</b><small>' + esc(im.bairro) + ' · ' + esc(im.cod) + '</small></span><em>' + preco(im.preco) + '</em></label>';
  }).join('') + '<label class="pv-op pv-im pv-im-outro"><input type="radio" name="pv-im" value="ajuda"><span><b>Ainda não escolhi</b><small>A Ana separa três opções para você</small></span></label>';

  var pv = document.createElement('div');
  pv.className = 'pv';
  pv.hidden = true;
  pv.innerHTML =
    '<div class="pv-fundo" data-fecha></div>' +
    '<div class="pv-caixa" role="dialog" aria-modal="true" aria-labelledby="pv-t">' +
      '<div class="pv-cab"><p class="pv-t" id="pv-t">Agendar visita</p><button type="button" class="pv-x" data-fecha aria-label="Fechar">✕</button></div>' +
      '<div class="pv-prog" aria-hidden="true"><i></i></div>' +
      '<p class="pv-cont" aria-live="polite"></p>' +
      '<p class="pv-sel" hidden><span></span><button type="button" class="pv-trocar">Trocar</button></p>' +
      '<div class="pv-corpo">' +
        '<fieldset class="pv-et" data-p="1"><legend>Qual <em>imóvel?</em></legend><div class="pv-ops">' + opcoesImovel + '</div></fieldset>' +
        '<fieldset class="pv-et" data-p="2" hidden><legend>Como <em>visitar?</em></legend><div class="pv-ops">' +
          '<label class="pv-op"><input type="radio" name="pv-modo" value="Presencial"><span><b>Presencial</b><small>Eu abro o imóvel e caminho com você. Cerca de 50 minutos.</small></span></label>' +
          '<label class="pv-op"><input type="radio" name="pv-modo" value="Por chamada de vídeo"><span><b>Por chamada de vídeo</b><small>Ao vivo, de dentro do imóvel. Cerca de 30 minutos.</small></span></label>' +
        '</div></fieldset>' +
        '<fieldset class="pv-et" data-p="3" hidden><legend>Qual <em>dia?</em></legend><div class="pv-dias"></div><p class="pv-dica">Segunda a sábado. Domingo só com hora combinada.</p></fieldset>' +
        '<fieldset class="pv-et" data-p="4" hidden><legend>Que <em>horas?</em></legend><p class="pv-dica pv-dia-esc"></p><div class="pv-horas"></div></fieldset>' +
        '<fieldset class="pv-et" data-p="5" hidden><legend>Para <em>quem?</em></legend>' +
          '<label class="pv-campo"><span>Seu nome</span><input name="pv-nome" autocomplete="name"></label>' +
          '<label class="pv-campo"><span>WhatsApp com DDD</span><input name="pv-tel" inputmode="tel" autocomplete="tel" placeholder="(48) 99999-0000"></label>' +
          '<label class="pv-aceite"><input type="checkbox" name="pv-aceite"> <span>Li a <a href="privacidade.html">política de privacidade</a>. Meus dados servem só para a Ana confirmar a visita.</span></label>' +
        '</fieldset>' +
        '<div class="pv-et pv-ok" data-p="6" hidden tabindex="-1"><p class="pv-ok-selo"><i aria-hidden="true">✓</i> Visita pré-reservada</p><p class="pv-ok-t"></p><dl class="pv-res"></dl>' +
          '<p class="pv-ok-nota"><b>Envio simulado.</b> Nesta demonstração nada foi enviado. No site real, o pedido chega ao WhatsApp da Ana e ela confirma em até duas horas.</p></div>' +
      '</div>' +
      '<p class="pv-erro" role="alert"></p>' +
      '<div class="pv-pe"><button type="button" class="pv-voltar">Voltar</button><button type="button" class="pv-seguir">Continuar</button></div>' +
    '</div>';
  document.body.appendChild(pv);

  var caixa = $('.pv-caixa', pv), corpo = $('.pv-corpo', pv), erro = $('.pv-erro', pv), cont = $('.pv-cont', pv);
  var voltar = $('.pv-voltar', pv), seguir = $('.pv-seguir', pv), barra = $('.pv-prog i', pv);
  var NOMES = ['Imóvel', 'Como', 'Dia', 'Horário', 'Seus dados'];

  // dias: próximos 12 dias úteis (segunda a sábado)
  (function () {
    var d = new Date(); d.setHours(0, 0, 0, 0); var html = '', n = 0;
    while (n < 12) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue;
      html += '<label class="pv-dia"><input type="radio" name="pv-dia" value="' + d.toISOString().slice(0, 10) + '"><small>' + SEM_C[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MES[d.getMonth()] + '</small></label>';
      n++;
    }
    $('.pv-dias', pv).innerHTML = html;
  })();

  function montaHoras() {
    var d = e.dia, semente = d.getDate() + d.getMonth() * 3;
    var lista = d.getDay() === 6 ? HORAS.slice(0, 4) : HORAS;
    $('.pv-dia-esc', pv).textContent = SEMANA[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()] + '. Horários livres na agenda (exemplo).';
    $('.pv-horas', pv).innerHTML = lista.map(function (h, k) {
      var ocupado = (semente + k * 5) % 7 === 0;
      return '<label class="pv-hora' + (ocupado ? ' ocupado' : '') + '"><input type="radio" name="pv-hora" value="' + h + '"' + (ocupado ? ' disabled' : '') + (e.hora === h && !ocupado ? ' checked' : '') + '><span>' + h + (ocupado ? '<small>ocupado</small>' : '') + '</span></label>';
    }).join('');
  }

  function imovelNome() {
    if (e.cod === 'ajuda') return 'A Ana ajuda a escolher';
    var im = imoveis.filter(function (x) { return x.cod === e.cod; })[0];
    return im ? im.titulo + ', ' + im.bairro + ' (' + im.cod + ')' : e.cod;
  }

  function mostra(n, foco) {
    passo = n; erro.textContent = '';
    $$('.pv-et', pv).forEach(function (x) { x.hidden = +x.dataset.p !== n; });
    var fim = n === 6;
    cont.textContent = fim ? 'Confirmação' : 'Passo ' + n + ' de 5 · ' + NOMES[n - 1];
    var sel = $('.pv-sel', pv); sel.hidden = n === 1 || fim || !e.cod; if (!sel.hidden) $('span', sel).textContent = imovelNome();
    barra.style.transform = 'scaleX(' + (fim ? 1 : n / 5) + ')';
    voltar.hidden = n === 1 && !fim;
    voltar.textContent = fim ? 'Outro horário' : 'Voltar';
    seguir.textContent = fim ? 'Fechar' : n === 5 ? 'Confirmar visita' : 'Continuar';
    if (n === 4) montaHoras();
    corpo.scrollTop = 0;
    if (foco !== false) {
      var alvo = fim ? $('.pv-ok', pv) : ($('input:checked', $('[data-p="' + n + '"]', pv)) || $('input:not([disabled])', $('[data-p="' + n + '"]', pv)));
      if (alvo) setTimeout(function () { try { alvo.focus({ preventScroll: true }); } catch (x) {} }, 30);
    }
  }

  function valida(n) {
    var marcado = function (nm) { var r = $('input[name="' + nm + '"]:checked', pv); return r ? r.value : ''; };
    if (n === 1) { e.cod = marcado('pv-im'); if (!e.cod) return 'Escolha um imóvel ou "Ainda não escolhi".'; }
    if (n === 2) { e.modo = marcado('pv-modo'); if (!e.modo) return 'Escolha como prefere visitar.'; }
    if (n === 3) { var v = marcado('pv-dia'); if (!v) return 'Escolha um dia.'; var p = v.split('-'); var nd = new Date(+p[0], +p[1] - 1, +p[2]); if (!e.dia || +e.dia !== +nd) e.hora = ''; e.dia = nd; }
    if (n === 4) { e.hora = marcado('pv-hora'); if (!e.hora) return 'Escolha um horário livre.'; }
    if (n === 5) {
      var nome = $('[name="pv-nome"]', pv), tel = $('[name="pv-tel"]', pv), ac = $('[name="pv-aceite"]', pv);
      [nome, tel].forEach(function (x) { x.removeAttribute('aria-invalid'); });
      if (nome.value.trim().length < 2) { nome.setAttribute('aria-invalid', 'true'); nome.focus(); return 'Escreva o seu nome.'; }
      if (tel.value.replace(/\D/g, '').length < 10) { tel.setAttribute('aria-invalid', 'true'); tel.focus(); return 'Escreva o WhatsApp com DDD.'; }
      if (!ac.checked) { ac.focus(); return 'Marque que leu a política de privacidade.'; }
      e.nome = nome.value.trim(); e.tel = tel.value.trim();
    }
    return '';
  }

  function resumo() {
    var d = e.dia;
    $('.pv-ok-t', pv).textContent = 'Tudo certo, ' + e.nome.split(' ')[0] + '.';
    $('.pv-res', pv).innerHTML = [['Imóvel', imovelNome()], ['Visita', e.modo], ['Quando', SEMANA[d.getDay()] + ', ' + dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ', às ' + e.hora], ['WhatsApp', e.tel]]
      .map(function (l) { return '<div><dt>' + l[0] + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('');
  }

  seguir.addEventListener('click', function () {
    if (passo === 6) { fecha(); return; }
    var msg = valida(passo);
    if (msg) { erro.textContent = msg; return; }
    if (passo === 5) { resumo(); mostra(6); return; }
    mostra(passo + 1);
  });
  voltar.addEventListener('click', function () {
    if (passo === 6) { e.hora = ''; $$('input[name="pv-hora"], input[name="pv-dia"]', pv).forEach(function (r) { r.checked = false; }); e.dia = null; mostra(3); return; }
    if (passo > 1) mostra(passo - 1);
  });
  // escolher já avança (exceto nos dados), como num atalho; sempre dá para voltar
  var porToque = false;
  pv.addEventListener('pointerdown', function () { porToque = true; });
  pv.addEventListener('keydown', function () { porToque = false; }, true);
  pv.addEventListener('change', function (ev) {
    var t = ev.target; if (t.type !== 'radio' || !porToque) return;
    erro.textContent = '';
    setTimeout(function () { if (!pv.hidden && +t.closest('.pv-et').dataset.p === passo && passo < 5) seguir.click(); }, calmo.matches ? 0 : 220);
  });
  // Enter no último passo confirma
  pv.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { fecha(); return; }
    if (ev.key === 'Enter' && passo === 5 && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox') { ev.preventDefault(); seguir.click(); }
    if (ev.key !== 'Tab') return;
    var f = $$('button, a[href], input:not([disabled]), [tabindex="-1"]', caixa).filter(function (x) { return x.offsetParent !== null && (x.type !== 'radio' || x.checked || !$('input[name="' + x.name + '"]:checked', caixa)); });
    f = f.filter(function (x) { return x.getAttribute('tabindex') !== '-1'; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
    else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
  });
  $('.pv-trocar', pv).addEventListener('click', function () { mostra(1); });
  $$('[data-fecha]', pv).forEach(function (b) { b.addEventListener('click', fecha); });

  function abre(cod) {
    ultimoFoco = document.activeElement;
    if (cod) e.cod = cod;
    var r = e.cod && $('input[name="pv-im"][value="' + e.cod + '"]', pv);
    if (r) r.checked = true;
    pv.hidden = false;
    document.documentElement.classList.add('pv-aberto');
    requestAnimationFrame(function () { pv.classList.add('on'); });
    mostra(passo === 6 ? 1 : (r && passo === 1 ? 2 : passo));
  }
  function fecha() {
    if (pv.hidden) return;
    pv.classList.remove('on');
    document.documentElement.classList.remove('pv-aberto');
    var fim = function () { pv.hidden = true; if (passo === 6) passo = 1; };
    if (calmo.matches) fim(); else setTimeout(fim, 320);
    if (ultimoFoco && ultimoFoco.focus) try { ultimoFoco.focus({ preventScroll: true }); } catch (x) {}
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="agendar.html"], [data-agendar]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();                               // captura: roda antes da transição de página (r3.js)
    var q = (a.getAttribute('href') || '').match(/imovel=([A-Z]{2}-\d+)/);
    abre(a.getAttribute('data-cod') || (q && q[1]) || codPagina);
  }, true);
  window.ANA_AGENDAR = abre;
})();

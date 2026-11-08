// Ana Ribeiro · rodada 5. (1) Agendamento imersivo na própria página do imóvel: a seção se abre ali mesmo, em quatro passos
// (como, dia num calendário horizontal, horário, nome) e fecha num resumo que vira mensagem de WhatsApp.
// (2) Parallax em camadas nas fotos grandes das casas: foto e etiquetas andam em velocidades diferentes, no máximo 40 px.
// (3) Área off-market por convite (off-market.html): código de demonstração EXEMPLO2026, fotos desfocadas até liberar.
// Tudo respeita prefers-reduced-motion.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var wa = function (msg) { if (window.BR_WA) window.BR_WA(msg); };
  var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // =====================================================================================
  // 1. AGENDAMENTO IMERSIVO (só nas páginas de imóvel, que têm a galeria data-cine)
  // =====================================================================================
  var formAntigo = $('[data-cine]') && $('.ag-sec form[data-agenda]');
  if (formAntigo) (function () {
    var sec = formAntigo.closest('.ag-sec'), sel = formAntigo.imovel;
    var cod = sel.value, opc = sel.options[sel.selectedIndex].text;            // "AR-1104 · Cobertura duplex com piscina, Jurerê Internacional · R$ 5,2 milhões"
    var partes = opc.split(' · '), nomeImovel = (partes[1] || '').split(',')[0], bairro = ((partes[1] || '').split(',')[1] || '').trim(), preco = partes[2] || '';
    var foto = $('.cn-slide img'), fotoSrc = foto ? foto.getAttribute('src') : '', fotoAlt = foto ? foto.alt : '';
    var escolha = { modo: '', dia: null, hora: '', nome: '', tel: '' };

    var vx = document.createElement('div');
    vx.className = 'vx';
    vx.innerHTML =
      '<div class="vx-capa">' +
        '<img src="' + esc(fotoSrc) + '" alt="" width="160" height="120" loading="lazy" decoding="async">' +
        '<div class="vx-capa-tx"><p class="olho-h">VISITA A ESTE IMÓVEL<span class="vx-cod">' + esc(cod) + '</span></p><p class="vx-capa-t">' + esc(nomeImovel) + '</p><p class="vx-capa-s">' + esc(bairro) + ' · presencial ou por vídeo · confirmação em até 2 horas</p></div>' +
        '<button type="button" class="bt bt-bege vx-abrir" aria-expanded="false" aria-controls="vx-corpo">Escolher dia e horário <i aria-hidden="true">↗</i></button>' +
      '</div>' +
      '<div class="vx-corpo" id="vx-corpo"><div class="vx-dentro">' +
        '<ol class="vx-passos" aria-label="Passos do agendamento">' +
          '<li><button type="button" data-ir="1"><b>01</b><span>Como</span><em></em></button></li>' +
          '<li><button type="button" data-ir="2"><b>02</b><span>Dia</span><em></em></button></li>' +
          '<li><button type="button" data-ir="3"><b>03</b><span>Horário</span><em></em></button></li>' +
          '<li><button type="button" data-ir="4"><b>04</b><span>Você</span><em></em></button></li>' +
        '</ol>' +
        '<div class="vx-palco">' +
          '<section class="vx-etapa" data-e="1" aria-labelledby="vx-t1"><h3 id="vx-t1">Como você prefere <em>visitar?</em></h3>' +
            '<div class="vx-modos" role="radiogroup" aria-labelledby="vx-t1">' +
              '<button type="button" role="radio" aria-checked="false" data-modo="presencial"><b>Presencial</b><span>Eu abro o imóvel e caminho com você, cômodo por cômodo. Cerca de 50 minutos.</span><i aria-hidden="true">↗</i></button>' +
              '<button type="button" role="radio" aria-checked="false" data-modo="video"><b>Por chamada de vídeo</b><span>Ao vivo, de dentro do imóvel, no seu celular. Bom para quem mora fora. Cerca de 30 minutos.</span><i aria-hidden="true">↗</i></button>' +
            '</div></section>' +
          '<section class="vx-etapa" data-e="2" aria-labelledby="vx-t2" hidden><h3 id="vx-t2">Qual <em>dia?</em></h3>' +
            '<div class="vx-cal"><button type="button" class="vx-cal-seta" data-cal="-1" aria-label="Dias anteriores">←</button><div class="vx-dias" role="radiogroup" aria-labelledby="vx-t2"></div><button type="button" class="vx-cal-seta" data-cal="1" aria-label="Próximos dias">→</button></div>' +
            '<p class="vx-dica">Segunda a sábado. Domingo só com hora combinada por mensagem.</p></section>' +
          '<section class="vx-etapa" data-e="3" aria-labelledby="vx-t3" hidden><h3 id="vx-t3">Que <em>horas?</em></h3><p class="vx-dia-esc"></p><div class="vx-horas" role="radiogroup" aria-labelledby="vx-t3"></div></section>' +
          '<section class="vx-etapa" data-e="4" aria-labelledby="vx-t4" hidden><h3 id="vx-t4">Para quem é <em>a visita?</em></h3>' +
            '<form class="vx-form" novalidate><div class="vx-campos">' +
              '<label class="ag-c"><span>Seu nome</span><input name="nome" autocomplete="name" required></label>' +
              '<label class="ag-c"><span>WhatsApp com DDD</span><input name="tel" inputmode="tel" autocomplete="tel" placeholder="(48) 99999-0000" required></label></div>' +
              '<label class="ag-aceite"><input type="checkbox" name="aceite"> <i>Li a <a href="privacidade.html">política de privacidade</a>. Meus dados servem só para a Ana confirmar a visita.</i></label>' +
              '<p class="ag-aviso" aria-live="polite"></p>' +
              '<button class="bt bt-bege" type="submit">Ver o resumo da visita <i aria-hidden="true">↗</i></button></form></section>' +
          '<section class="vx-etapa vx-resumo" data-e="5" aria-labelledby="vx-t5" hidden tabindex="-1">' +
            '<figure class="vx-res-foto"><img src="' + esc(fotoSrc) + '" alt="' + esc(fotoAlt) + '" width="640" height="420" loading="lazy" decoding="async"><figcaption>' + esc(cod) + ' · ' + esc(preco) + '</figcaption></figure>' +
            '<div class="vx-res-tx"><p class="olho-h">RESUMO DA VISITA</p><h3 id="vx-t5"></h3><dl class="vx-res-dl"></dl>' +
              '<div class="vx-res-bts"><button type="button" class="bt bt-bege vx-enviar">Enviar pelo WhatsApp <i aria-hidden="true">↗</i></button><button type="button" class="vx-alterar">Alterar</button></div>' +
              '<p class="vx-res-nota" aria-live="polite">A mensagem sai pronta para o WhatsApp da Ana. Demonstração: nada é enviado.</p></div></section>' +
        '</div>' +
      '</div></div>';
    formAntigo.hidden = true;                          // o formulário clássico continua no HTML para quem está sem JavaScript
    formAntigo.parentNode.insertBefore(vx, formAntigo);

    var corpo = $('.vx-corpo', vx), abrir = $('.vx-abrir', vx), etapas = $$('.vx-etapa', vx), passos = $$('.vx-passos button', vx), atual = 1;
    corpo.inert = true;
    function abre(foco) {
      if (vx.classList.contains('aberto')) return;
      vx.classList.add('aberto'); corpo.inert = false; abrir.setAttribute('aria-expanded', 'true');
      vai(1, foco !== false);
    }
    abrir.addEventListener('click', function () { abre(); });
    $$('a[href="#agendar"]').forEach(function (a) { a.addEventListener('click', function () { setTimeout(function () { abre(false); }, calmo.matches ? 0 : 450); }); });
    if (location.hash === '#agendar') abre(false);

    function vai(n, foco) {
      var antes = atual; atual = n;
      etapas.forEach(function (e) {
        var on = +e.dataset.e === n;
        if (on) { e.hidden = false; e.classList.remove('sai'); e.classList.toggle('volta', n < antes); void e.offsetWidth; e.classList.add('entra'); }
        else { e.hidden = true; e.classList.remove('entra', 'volta'); }
      });
      passos.forEach(function (b) {
        var k = +b.dataset.ir, feito = (k === 1 && escolha.modo) || (k === 2 && escolha.dia) || (k === 3 && escolha.hora) || (k === 4 && escolha.nome);
        b.parentNode.classList.toggle('atual', k === n); b.parentNode.classList.toggle('feito', !!feito && k !== n);
        b.disabled = k > n && !podeIr(k);
        if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      $('[data-ir="1"] em', vx).textContent = escolha.modo === 'video' ? 'Por vídeo' : escolha.modo ? 'Presencial' : '';
      $('[data-ir="2"] em', vx).textContent = escolha.dia ? SEM[escolha.dia.getDay()] + ' ' + dois(escolha.dia.getDate()) + '/' + dois(escolha.dia.getMonth() + 1) : '';
      $('[data-ir="3"] em', vx).textContent = escolha.hora;
      $('[data-ir="4"] em', vx).textContent = escolha.nome ? escolha.nome.split(' ')[0] : '';
      if (n === 3) montaHoras();
      if (n === 5) montaResumo();
      if (foco) { var alvo = n === 5 ? etapas[4] : $('[aria-checked="true"], input, .vx-dia:not(:disabled)', etapas[n - 1]) || etapas[n - 1]; setTimeout(function () { try { alvo.focus({ preventScroll: true }); } catch (e) {} }, 60); }
    }
    function podeIr(k) { return k === 1 || (k === 2 && escolha.modo) || (k === 3 && escolha.modo && escolha.dia) || (k === 4 && escolha.modo && escolha.dia && escolha.hora); }
    passos.forEach(function (b) { b.addEventListener('click', function () { if (podeIr(+b.dataset.ir)) vai(+b.dataset.ir, true); }); });
    var segue = function (n) { setTimeout(function () { vai(n, true); }, calmo.matches ? 0 : 260); };

    // passo 1: modo
    $$('.vx-modos button', vx).forEach(function (b) {
      b.addEventListener('click', function () {
        escolha.modo = b.dataset.modo;
        $$('.vx-modos button', vx).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        segue(2);
      });
    });
    // passo 2: calendário horizontal com os próximos 21 dias
    var dias = $('.vx-dias', vx), html = '', hoje = new Date();
    for (var k = 1; k <= 21; k++) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + k, 12), dom = d.getDay() === 0;
      html += '<button type="button" role="radio" aria-checked="false" class="vx-dia' + (dom ? ' fechado' : '') + '" data-iso="' + d.toISOString().slice(0, 10) + '"' + (dom ? ' disabled' : '') +
        ' aria-label="' + SEMANA[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()] + (dom ? ', sem visitas' : '') + '"><small>' + SEM[d.getDay()] + '</small><b>' + dois(d.getDate()) + '</b><small>' + MES[d.getMonth()] + '</small></button>';
    }
    dias.innerHTML = html;
    $$('.vx-dia', dias).forEach(function (b) {
      b.addEventListener('click', function () {
        escolha.dia = new Date(b.dataset.iso + 'T12:00:00'); escolha.hora = '';
        $$('.vx-dia', dias).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        segue(3);
      });
    });
    $$('.vx-cal-seta', vx).forEach(function (s) { s.addEventListener('click', function () { dias.scrollBy({ left: +s.dataset.cal * dias.clientWidth * .8, behavior: calmo.matches ? 'auto' : 'smooth' }); }); });
    dias.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = $$('.vx-dia:not(:disabled)', dias), i = bs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); var p = bs[Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))]; p.focus(); p.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    // passo 3: horários (mesma regra de horários ocupados do formulário clássico)
    function montaHoras() {
      var d = escolha.dia, h = '';
      $('.vx-dia-esc', vx).textContent = SEMANA[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()] + (escolha.modo === 'video' ? ' · chamada de vídeo' : ' · presencial');
      var lista = d.getDay() === 6 ? ['9h', '10h', '11h', '12h'] : ['9h', '10h', '11h', '14h', '15h', '16h', '17h', '18h'], semente = d.getDate() * 7 + d.getMonth() * 3;
      lista.forEach(function (x, k) {
        var ocupado = (semente + k * 5) % 7 === 0;
        h += '<button type="button" role="radio" aria-checked="' + (escolha.hora === x) + '" class="vx-hora" data-h="' + x + '"' + (ocupado ? ' disabled aria-label="' + x + ', ocupado"' : '') + '>' + x + (ocupado ? '<small>ocupado</small>' : '') + '</button>';
      });
      var caixa = $('.vx-horas', vx); caixa.innerHTML = h;
      $$('.vx-hora', caixa).forEach(function (b) { b.addEventListener('click', function () { escolha.hora = b.dataset.h; $$('.vx-hora', caixa).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); segue(4); }); });
    }
    // passo 4: nome e WhatsApp
    var f = $('.vx-form', vx), aviso = $('.ag-aviso', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = f.nome.value.trim(), tel = f.tel.value.replace(/\D/g, '');
      var erro = nome.length < 2 ? ['nome', 'Escreva seu nome.'] : tel.length < 10 ? ['tel', 'Confira o WhatsApp com DDD.'] : !f.aceite.checked ? ['aceite', 'Marque que leu a política de privacidade.'] : null;
      $$('.erro', f).forEach(function (x) { x.classList.remove('erro'); x.removeAttribute('aria-invalid'); });
      if (erro) { aviso.textContent = erro[1]; f[erro[0]].classList.add('erro'); f[erro[0]].setAttribute('aria-invalid', 'true'); f[erro[0]].focus(); return; }
      aviso.textContent = ''; escolha.nome = nome; escolha.tel = f.tel.value.trim();
      vai(5, true);
    });
    // passo 5: resumo e envio
    function quando() { var d = escolha.dia; return SEMANA[d.getDay()] + ', ' + dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ', às ' + escolha.hora; }
    function montaResumo() {
      $('#vx-t5', vx).innerHTML = esc(escolha.nome.split(' ')[0]) + ', sua visita <em>está quase marcada.</em>';
      $('.vx-res-dl', vx).innerHTML = [['Imóvel', cod + ' · ' + nomeImovel + (bairro ? ', ' + bairro : '')], ['Visita', escolha.modo === 'video' ? 'Por chamada de vídeo' : 'Presencial, com a Ana'], ['Dia', quando()], ['Contato', escolha.nome + ' · ' + escolha.tel]]
        .map(function (l) { return '<div><dt>' + l[0] + '</dt><dd>' + esc(l[1]) + '</dd></div>'; }).join('');
      $('.vx-res-nota', vx).textContent = 'A mensagem sai pronta para o WhatsApp da Ana. Demonstração: nada é enviado.';
    }
    $('.vx-enviar', vx).addEventListener('click', function () {
      wa('Olá, Ana! Quero agendar uma visita pelo site.\n• Nome: ' + escolha.nome + '\n• WhatsApp: ' + escolha.tel + '\n• Imóvel: ' + opc + '\n• Visita: ' + (escolha.modo === 'video' ? 'por chamada de vídeo' : 'presencial') + '\n• Dia: ' + quando());
      $('.vx-res-nota', vx).textContent = 'Pedido montado. A Ana confirma pelo WhatsApp em até duas horas. Demonstração: nada foi enviado.';
    });
    $('.vx-alterar', vx).addEventListener('click', function () { vai(1, true); });
  })();

  // =====================================================================================
  // 2. PARALLAX EM CAMADAS (foto mais lenta, etiquetas mais rápidas; no máximo 40 px de curso)
  // =====================================================================================
  function presoOuFixo(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) { var ps = getComputedStyle(p).position; if (ps === 'sticky' || ps === 'fixed') return true; }
    return false;
  }
  var grupos = [];
  function grupo(caixa, camadas) { if (caixa && !presoOuFixo(caixa)) grupos.push({ caixa: caixa, camadas: camadas.filter(function (c) { return c.el; }) }); }
  function montaGrupos() {
    grupos = [];
    $$('.card-img').forEach(function (c) { grupo(c, [{ el: $('img', c), v: 20, cobre: true }].concat($$('.card-tag, .card-360', c).map(function (t) { return { el: t, v: -6 }; }))); });
    $$('.cine .cn-slide').forEach(function (s) { grupo(s, [{ el: $('img', s), v: 16, cobre: true }]); });
    $$('.om-foto').forEach(function (c) { grupo(c, [{ el: $('img', c), v: 20, cobre: true }, { el: $('.om-selo', c), v: -8 }, { el: $('.om-moldura', c), v: 8 }]); });
    // fotos grandes soltas nas páginas (a corretora, bairros, artigos...): foto + selo de crédito
    $$('main img').forEach(function (im) {
      var pai = im.parentElement, r = im.getBoundingClientRect(), ov = getComputedStyle(pai).overflow;
      if (r.width < window.innerWidth * .4 || r.height < 260 || (ov !== 'hidden' && ov !== 'clip')) return;
      if (im.closest('.cine, .card, .card-img, .om-foto, [data-galeria], [role=dialog], .t360, .plantas, .md-painel, a, button, .mp-svg, .vx')) return;
      if (getComputedStyle(im).transform !== 'none' || getComputedStyle(im).animationName !== 'none') return;
      grupo(pai, [{ el: im, v: 20, cobre: true }].concat($$('.selo-foto', pai).map(function (t) { return { el: t, v: -8 }; })));
    });
  }
  function parallax() {
    var vh = window.innerHeight, parado = document.body.classList.contains('parado');
    grupos.forEach(function (g) {
      var r = g.caixa.getBoundingClientRect();
      if (r.bottom < -60 || r.top > vh + 60) return;
      var k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
      g.camadas.forEach(function (c) {
        c.el.style.translate = parado ? '' : '0 ' + (-k * c.v).toFixed(1) + 'px';
        if (c.cobre) c.el.style.scale = parado ? '' : (1 + (2 * c.v + 6) / Math.max(200, r.height)).toFixed(3);
      });
    });
  }
  if (!calmo.matches) window.addEventListener('load', function () {
    montaGrupos(); if (!grupos.length) return;
    var pedido = false, agenda = function () { if (!pedido) { pedido = true; requestAnimationFrame(function () { pedido = false; parallax(); }); } };
    window.addEventListener('scroll', agenda, { passive: true }); window.addEventListener('resize', agenda);
    $$('.cn-trilho').forEach(function (t) { t.addEventListener('scroll', agenda, { passive: true }); });
    new MutationObserver(agenda).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    parallax();
  });

  // =====================================================================================
  // 3. OFF-MARKET POR CONVITE (demonstração)
  // =====================================================================================
  var om = $('[data-offmarket]');
  if (om) (function () {
    var form = $('.om-form', om), aviso = $('.om-aviso', om), CODIGO = 'EXEMPLO2026';
    function libera(animado) {
      om.classList.add('liberado'); if (!animado) om.classList.add('sem-anim');
      $$('.om-item', om).forEach(function (it, k) { it.style.setProperty('--atraso', (animado ? k * .16 : 0) + 's'); $('.om-abre', it).hidden = false; $('.om-fecha', it).hidden = true; });
      $('.om-porta-fechada', om).hidden = true; $('.om-porta-aberta', om).hidden = false;
      try { sessionStorage.setItem('ana-off', '1'); } catch (e) {}
    }
    function tranca() {
      om.classList.remove('liberado', 'sem-anim');
      $$('.om-item', om).forEach(function (it) { $('.om-abre', it).hidden = true; $('.om-fecha', it).hidden = false; });
      $('.om-porta-fechada', om).hidden = false; $('.om-porta-aberta', om).hidden = true;
      try { sessionStorage.removeItem('ana-off'); } catch (e) {}
      form.cod.value = ''; form.cod.focus();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = form.cod.value.replace(/\s+/g, '').toUpperCase();
      form.cod.classList.remove('erro'); form.cod.removeAttribute('aria-invalid');
      if (!v) { aviso.textContent = 'Digite o código que veio no seu convite.'; form.cod.classList.add('erro'); form.cod.setAttribute('aria-invalid', 'true'); form.cod.focus(); return; }
      if (v !== CODIGO) { aviso.textContent = 'Código não encontrado. Confira as letras ou peça um convite à Ana. (Na demonstração, o código é EXEMPLO2026.)'; form.cod.classList.add('erro'); form.cod.setAttribute('aria-invalid', 'true'); form.cod.focus(); return; }
      aviso.textContent = 'Acesso liberado. Três imóveis confidenciais abaixo.';
      libera(!calmo.matches);
      var alvo = $('.om-porta-aberta', om); alvo.tabIndex = -1; alvo.focus();
    });
    $('.om-sair', om).addEventListener('click', tranca);
    try { if (sessionStorage.getItem('ana-off') === '1') libera(false); } catch (e) {}
  })();
})();

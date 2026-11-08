/*
 * Prisma Administração Imobiliária · funções comuns do site de exemplo.
 * Menu, avisos, janelas, validação de formulários, máscaras e formatação de valores.
 */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var brl = function (n) { n = Math.round((n || 0) * 100) / 100; var s = fmt.format(Math.abs(n)).replace(/\s/g, ' '); return n < 0 ? '− ' + s : s; };
  var brl0 = function (n) { return 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR'); };
  var num = function (v) { var s = String(v == null ? '' : v).replace(/[^\d,.-]/g, ''); if (s.indexOf(',') >= 0 || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? 0 : n; };
  var digitos = function (v) { return String(v || '').replace(/\D/g, ''); };

  // ---------- menu do celular ----------
  var btMenu = $('.bt-menu'), gaveta = $('#gaveta');
  if (btMenu && gaveta) {
    var abrirMenu = function (abre) {
      btMenu.setAttribute('aria-expanded', String(abre));
      gaveta.hidden = !abre;
      doc.body.classList.toggle('menu-aberto', abre);
      if (abre) { var p = $('a, button', gaveta); if (p) p.focus(); }
    };
    btMenu.addEventListener('click', function () { abrirMenu(btMenu.getAttribute('aria-expanded') !== 'true'); });
    gaveta.addEventListener('click', function (e) { if (e.target === gaveta || e.target.closest('[data-fecha-menu]')) abrirMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gaveta.hidden) { abrirMenu(false); btMenu.focus(); } });
  }

  // ---------- aviso rápido ----------
  var avisoEl = null, avisoT = 0;
  function aviso(msg, tipo) {
    if (!avisoEl) { avisoEl = doc.createElement('div'); avisoEl.className = 'aviso'; avisoEl.setAttribute('role', 'status'); avisoEl.setAttribute('aria-live', 'polite'); doc.body.appendChild(avisoEl); }
    avisoEl.textContent = msg; avisoEl.className = 'aviso visivel' + (tipo ? ' ' + tipo : '');
    clearTimeout(avisoT); avisoT = setTimeout(function () { avisoEl.className = 'aviso'; }, 4200);
  }

  // ---------- janela (modal) ----------
  var janela = null, focoAntes = null;
  function abrirJanela(titulo, html, opc) {
    opc = opc || {};
    if (!janela) {
      janela = doc.createElement('div'); janela.className = 'janela'; janela.hidden = true;
      janela.setAttribute('role', 'dialog'); janela.setAttribute('aria-modal', 'true'); janela.setAttribute('aria-labelledby', 'janela-t');
      janela.innerHTML = '<div class="janela-caixa"><div class="janela-cab"><h2 id="janela-t"></h2><button type="button" class="janela-x" aria-label="Fechar">×</button></div><div class="janela-corpo"></div></div>';
      doc.body.appendChild(janela);
      janela.addEventListener('click', function (e) { if (e.target === janela || e.target.closest('.janela-x,[data-fecha-janela]')) fecharJanela(); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && janela && !janela.hidden) fecharJanela(); });
    }
    focoAntes = doc.activeElement;
    $('#janela-t', janela).textContent = titulo;
    $('.janela-corpo', janela).innerHTML = html;
    $('.janela-caixa', janela).className = 'janela-caixa' + (opc.largo ? ' larga' : '');
    janela.hidden = false; doc.body.classList.add('com-janela');
    $('.janela-x', janela).focus();
    return $('.janela-corpo', janela);
  }
  function fecharJanela() { if (!janela || janela.hidden) return; janela.hidden = true; doc.body.classList.remove('com-janela'); if (focoAntes && focoAntes.focus) focoAntes.focus(); }

  // ---------- WhatsApp (a moldura mostra a simulação; nada é enviado) ----------
  function wa(msg) { if (window.BR_WA) window.BR_WA(msg); else aviso('Demonstração: a mensagem seria aberta no WhatsApp da administradora.'); }

  // ---------- validação ----------
  function cpfValido(v) {
    var c = digitos(v); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); var d = (s * 10) % 11 % 10; if (+c[t] !== d) return false; }
    return true;
  }
  function erroCampo(campo, msg) {
    var caixa = campo.closest('.campo') || campo.parentNode, e = $('.erro', caixa);
    if (!e) { e = doc.createElement('p'); e.className = 'erro'; e.id = (campo.id || campo.name) + '-erro'; caixa.appendChild(e); }
    e.textContent = msg || ''; e.hidden = !msg;
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) campo.setAttribute('aria-describedby', e.id); else campo.removeAttribute('aria-describedby');
  }
  function validar(form) {
    var primeiro = null;
    $$('input, select, textarea', form).forEach(function (c) {
      if (c.disabled || c.type === 'hidden' || c.closest('[hidden]')) return;
      var v = (c.value || '').trim(), msg = '';
      if (c.type === 'checkbox') { if (c.required && !c.checked) msg = 'Marque para continuar.'; }
      else if (c.type === 'radio') { if (c.required && !$$('input[name="' + c.name + '"]', form).some(function (r) { return r.checked; })) msg = 'Escolha uma opção.'; }
      else if (c.required && !v) msg = 'Preencha este campo.';
      else if (v && c.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Confira o e-mail (ex.: nome@dominio.com.br).';
      else if (v && c.dataset.tipo === 'fone' && digitos(v).length < 10) msg = 'Informe o DDD e o número (ex.: (16) 99999-0000).';
      else if (v && c.dataset.tipo === 'cpf' && !cpfValido(v)) msg = 'CPF inválido. Confira os números.';
      else if (v && c.minLength > 0 && v.length < c.minLength) msg = 'Escreva pelo menos ' + c.minLength + ' caracteres.';
      else if (v && c.dataset.tipo === 'dinheiro' && num(v) <= 0) msg = 'Informe um valor maior que zero.';
      else if (v && c.type === 'number' && ((c.min !== '' && +v < +c.min) || (c.max !== '' && +v > +c.max))) msg = 'Use um valor entre ' + c.min + ' e ' + c.max + '.';
      if (c.type === 'radio') { var grupo = c.closest('.campo'); if (grupo && c === $('input[name="' + c.name + '"]', form)) erroCampo(c, msg); else return; }
      else erroCampo(c, msg);
      if (msg && !primeiro) primeiro = c;
    });
    if (primeiro) { primeiro.focus(); aviso('Confira os campos destacados.', 'ruim'); return false; }
    return true;
  }
  doc.addEventListener('input', function (e) {
    var c = e.target;
    if (c.getAttribute && c.getAttribute('aria-invalid') === 'true') erroCampo(c, '');
    if (c.dataset && c.dataset.tipo === 'fone') {
      var d = digitos(c.value).slice(0, 11);
      c.value = d.length > 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
    } else if (c.dataset && c.dataset.tipo === 'cpf') {
      var x = digitos(c.value).slice(0, 11);
      c.value = x.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    } else if (c.dataset && c.dataset.tipo === 'dinheiro') {
      var n = digitos(c.value).slice(0, 9); c.value = n ? Number(n).toLocaleString('pt-BR') : '';
    }
  });
  doc.addEventListener('change', function (e) { var c = e.target; if (c.getAttribute && c.getAttribute('aria-invalid') === 'true') erroCampo(c, ''); });

  // ---------- botões [data-wa] montados pelo site e cópia ----------
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copiar]');
    if (b) {
      var txt = b.getAttribute('data-copiar');
      var ok = function () { aviso('Copiado. Demonstração: este código não tem valor de pagamento.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
    }
    var p = e.target.closest('[data-imprimir]');
    if (p) { doc.body.setAttribute('data-impressao', p.getAttribute('data-imprimir') || 'tudo'); setTimeout(function () { window.print(); }, 30); }
  });
  addEventListener('afterprint', function () { doc.body.removeAttribute('data-impressao'); });

  // ---------- números que contam ao aparecer ----------
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function contar(el) {
    var alvo = parseFloat(el.dataset.conta), casas = +(el.dataset.casas || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    var f = function (v) { return pre + v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + suf; };
    if (reduz) { el.textContent = f(alvo); return; }
    var t0 = performance.now(), dur = 1100;
    (function passo(t) { var k = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - k, 3); el.textContent = f(alvo * e2); if (k < 1) requestAnimationFrame(passo); })(t0);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (!en.isIntersecting) return; io.unobserve(en.target); if (en.target.dataset.conta) contar(en.target); en.target.classList.add('visto'); });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-conta], .revela').forEach(function (el) { io.observe(el); });
  } else { $$('[data-conta]').forEach(contar); $$('.revela').forEach(function (el) { el.classList.add('visto'); }); }

  // ---------- formulários simples que viram mensagem de WhatsApp ([data-form-wa]) ----------
  $$('form[data-form-wa]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!validar(f)) return;
      var linhas = ['Olá, Prisma! ' + (f.dataset.formWa || 'Quero falar com a equipe.')];
      $$('[data-rot]', f).forEach(function (c) {
        if (c.type === 'checkbox' && !c.checked) return;
        if ((c.type === 'radio') && !c.checked) return;
        var v = c.type === 'checkbox' ? 'sim' : (c.tagName === 'SELECT' ? c.options[c.selectedIndex].text : c.value.trim());
        if (v) linhas.push('• ' + c.dataset.rot + ': ' + v);
      });
      var ok = $('.confirma', f.parentNode) || $('.confirma', f);
      if (ok) { if (f.dataset.ok) ok.innerHTML = '<b>' + esc(f.dataset.ok.split('. ')[0]) + '.</b> ' + esc(f.dataset.ok.split('. ').slice(1).join('. ')); ok.hidden = false; if (ok.focus) ok.focus(); }
      wa(linhas.join('\n'));
    });
  });

  // ano no rodapé
  $$('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  window.PR = { $: $, $$: $$, esc: esc, brl: brl, brl0: brl0, num: num, digitos: digitos, aviso: aviso, janela: abrirJanela, fecharJanela: fecharJanela, wa: wa, validar: validar, erroCampo: erroCampo, cpfValido: cpfValido };
})();

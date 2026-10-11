/*
 * Preços: abas "Pagamento único" x "Assinatura mensal" e o botão "Contratar".
 * O botão abre um resumo, pede o aceite dos Termos e leva ao Mercado Pago
 * (links fixos em js/planos.js). Sem link para o plano, cai no formulário.
 */
(function () {
  // abas
  var abas = [].slice.call(document.querySelectorAll('.modo-preco [role=tab]'));
  function abrir(aba, foco) {
    abas.forEach(function (a) {
      var sel = a === aba;
      a.setAttribute('aria-selected', sel ? 'true' : 'false');
      a.tabIndex = sel ? 0 : -1;
      var painel = document.getElementById(a.getAttribute('aria-controls'));
      if (painel) {
        painel.hidden = !sel;
        // o conteúdo escondido não passa pela animação de entrada: mostra direto
        if (sel) painel.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visto'); });
      }
    });
    if (foco) aba.focus();
  }
  abas.forEach(function (a, i) {
    a.addEventListener('click', function () { abrir(a); });
    a.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      abrir(abas[(i + (e.key === 'ArrowRight' ? 1 : abas.length - 1)) % abas.length], true);
    });
  });
  if (/assinatura/.test(location.hash) && abas[1]) abrir(abas[1]);

  // contratar
  var dlg = document.getElementById('contratar');
  if (!dlg) return;
  var links = window.BR_PAGAMENTO || {};
  var $ = function (id) { return document.getElementById(id); };
  var aceite = $('ct-aceite'), pagar = $('ct-pagar');
  var VALORES = {
    presenca: ['Entrada de R$ 495 agora', 'Total R$ 990 · o saldo de R$ 495 só na entrega'],
    completo: ['Entrada de R$ 995 agora', 'Total R$ 1.990 · o saldo de R$ 995 só na entrega'],
    automacao: ['Entrada de R$ 645 agora', 'Total R$ 1.290 · o saldo de R$ 645 só na entrega'],
    combo: ['Entrada de R$ 1.495 agora', 'Total R$ 2.990 · o saldo de R$ 1.495 só na entrega'],
    'a-presenca': ['R$ 89 por mês', 'Sem entrada · fidelidade de 12 meses'],
    'a-completo': ['R$ 149 por mês', 'Sem entrada · fidelidade de 12 meses'],
    'a-automacao': ['R$ 199 por mês', 'Sem entrada · fidelidade de 12 meses'],
  };

  function estado() {
    var ok = aceite.checked && pagar.dataset.link;
    pagar.setAttribute('aria-disabled', ok ? 'false' : 'true');
    pagar.href = ok ? pagar.dataset.link : '#';
  }
  aceite.addEventListener('change', estado);
  pagar.addEventListener('click', function (e) {
    if (pagar.getAttribute('aria-disabled') === 'true') { e.preventDefault(); aceite.focus(); }
  });
  $('ct-falar').addEventListener('click', function () { dlg.close(); });

  document.querySelectorAll('[data-contratar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var plano = b.getAttribute('data-contratar');
      var link = links[plano];
      if (!link || typeof dlg.showModal !== 'function') { location.hash = 'contato'; return; }
      var assinatura = plano.indexOf('a-') === 0;
      var v = VALORES[plano] || ['', ''];
      $('ct-titulo').textContent = b.getAttribute('data-nome');
      $('ct-valor').innerHTML = '<b>' + v[0] + '</b><small>' + v[1] + '</small>';
      $('ct-meios').textContent = assinatura ? '(cartão de crédito, cobrado todo mês)' : '(PIX, cartão em até 6x ou boleto)';
      $('ct-fidelidade').textContent = assinatura ? ', incluindo a fidelidade mínima de 12 meses' : '';
      aceite.checked = false;
      pagar.dataset.link = link;
      estado();
      dlg.showModal();
    });
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();

/* celular: pontos que mostram qual cartão de preço está na tela */
(function () {
  document.querySelectorAll('.precos2').forEach(function (trilho) {
    var cards = trilho.querySelectorAll('.preco2');
    if (cards.length < 2) return;
    var pontos = document.createElement('div');
    pontos.className = 'precos2-pontos'; pontos.setAttribute('aria-hidden', 'true');
    cards.forEach(function () { pontos.appendChild(document.createElement('i')); });
    var dica = document.createElement('p');
    dica.className = 'precos2-dica'; dica.textContent = (document.documentElement.lang || '').indexOf('en') === 0 ? 'Swipe to see all plans →' : 'Deslize para ver todos os planos →';
    trilho.insertAdjacentElement('afterend', dica);
    trilho.insertAdjacentElement('afterend', pontos);
    function marcar() {
      var meio = trilho.scrollLeft + trilho.clientWidth / 2, atual = 0;
      cards.forEach(function (c, i) { if (c.offsetLeft <= meio) atual = i; });
      pontos.querySelectorAll('i').forEach(function (p, i) { p.classList.toggle('on', i === atual); });
    }
    trilho.addEventListener('scroll', function () { window.requestAnimationFrame(marcar); }, { passive: true });
    marcar();
  });
})();

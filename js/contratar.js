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
    presenca: ['Entrada de R$ 345 agora', 'Total R$ 690 · o saldo de R$ 345 só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'],
    completo: ['Entrada de R$ 745 agora', 'Total R$ 1.490 · o saldo de R$ 745 só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'],
    automacao: ['Entrada de R$ 445 agora', 'Total R$ 890 · o saldo de R$ 445 só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'],
    combo: ['Entrada de R$ 1.145 agora', 'Total R$ 2.290 · o saldo de R$ 1.145 só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'],
    'a-presenca': ['R$ 89 por mês', 'Sem entrada · sem fidelidade, cancele quando quiser'],
    'a-completo': ['R$ 149 por mês', 'Sem entrada · sem fidelidade, cancele quando quiser'],
    'a-automacao': ['R$ 199 por mês', 'Sem entrada · sem fidelidade, cancele quando quiser'],
  };

  // Veltria: cada sistema traz o próprio preço no botão (data-total / data-mensal).
  function reais(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function valoresSistema(b) {
    var mensal = Number(b.getAttribute('data-mensal')), total = Number(b.getAttribute('data-total'));
    if (mensal && /-anual$/.test(b.getAttribute('data-contratar') || '')) return [reais(mensal) + ' por ano', 'Plano anual com 20% de desconto · renova a cada 12 meses · avisamos antes de cada cobrança'];
    if (mensal) return [reais(mensal) + ' por mês', 'Sem entrada · hospedagem e suporte inclusos · sem fidelidade, cancele quando quiser'];
    if (total) return ['Entrada de ' + reais(total / 2) + ' agora', 'Total ' + reais(total) + ' · o saldo de ' + reais(total / 2) + ' só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'];
    return ['', ''];
  }

  // e-mail da conta do Mercado Pago (assinaturas) e mensagem de erro, criados uma vez
  var mpCampo = document.createElement('label'); mpCampo.className = 'contratar-mp';
  mpCampo.innerHTML = 'E-mail da sua conta do Mercado Pago<input type="email" id="ct-mp" autocomplete="email"><small>A assinatura fica na conta do Mercado Pago com este e-mail.</small>';
  var erroCt = document.createElement('p'); erroCt.className = 'conta-erro'; erroCt.setAttribute('role', 'alert');
  aceite.closest('label').insertAdjacentElement('beforebegin', mpCampo);
  pagar.insertAdjacentElement('beforebegin', erroCt);
  function estado() {
    var ok = aceite.checked;
    pagar.setAttribute('aria-disabled', ok ? 'false' : 'true');
    pagar.href = '#';
  }
  aceite.addEventListener('change', estado);
  pagar.addEventListener('click', function (e) {
    e.preventDefault();
    if (pagar.getAttribute('aria-disabled') === 'true') { aceite.focus(); return; }
    if (!window.BR_CONTA) { location.href = pagar.dataset.link; return; }
    var txt = pagar.textContent; pagar.textContent = 'Abrindo o Mercado Pago…'; pagar.setAttribute('aria-disabled', 'true'); erroCt.textContent = '';
    var emailMp = (document.getElementById('ct-mp') || {}).value || '';
    var plano = pagar.dataset.plano;
    // aluguel da Veltria começa com os 7 dias grátis prometidos na página; quem já usou o teste vai direto para a assinatura
    var nexo = /^a-sis-/.test(plano);
    // quem já usou o teste não é levado à cobrança sem saber: avisa e só segue no segundo clique
    var semTesteConfirmado = pagar.dataset.semTeste === plano;
    window.BR_CONTA.pagar(plano, { emailMp: emailMp, teste: nexo && !semTesteConfirmado }).catch(function (x) {
      if (nexo && x.dados && x.dados.sem_teste) {
        pagar.dataset.semTeste = plano;
        var aviso = new Error('Esta conta já usou os 7 dias grátis. Se continuar, a assinatura começa hoje e a primeira mensalidade é cobrada agora. Clique de novo para continuar.');
        throw aviso;
      }
      throw x;
    }).catch(function (x) {
      erroCt.textContent = x.message || 'Não foi possível abrir o pagamento. Tente de novo.'; pagar.textContent = txt; estado();
    });
  });
  $('ct-falar').addEventListener('click', function () { dlg.close(); });

  document.querySelectorAll('[data-contratar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var plano = b.getAttribute('data-contratar');
      var link = links[plano];
      if ((!link && !/^a-sis-/.test(plano)) || typeof dlg.showModal !== 'function') { location.hash = 'contato'; return; }
      // assinar exige conta: entra primeiro, depois mostra o resumo
      if (window.BR_CONTA && !window.BR_CONTA.sessao()) { window.BR_CONTA.exigirLogin('Para contratar, entre ou crie a sua conta. É grátis e leva menos de um minuto.').then(function () { b.click(); }); return; }
      var assinatura = plano.indexOf('a-') === 0;
      var v = VALORES[plano] || valoresSistema(b);
      $('ct-titulo').textContent = b.getAttribute('data-nome');
      $('ct-valor').innerHTML = '<b>' + v[0] + '</b><small>' + v[1] + '</small>';
      $('ct-meios').textContent = assinatura ? '(cartão de crédito, cobrado todo mês)' : '(PIX, cartão em até 6x ou boleto)';
      $('ct-fidelidade').textContent = assinatura ? (/^a-sis-/.test(plano) ? ' (sistemas da Veltria: sem fidelidade)' : ' (sem fidelidade)') : '';
      // sistemas prontos: ficam prontos na hora, com vídeos tutoriais (sites e automações seguem com implantação feita por nós)
      var passos = dlg.querySelector('.contratar-passos');
      if (passos) {
        if (!passos.dataset.original) passos.dataset.original = passos.innerHTML;
        passos.innerHTML = /^a-sis-/.test(plano)
          ? '<li>Você paga com segurança no <b>Mercado Pago</b> <span id="ct-meios"></span>.</li><li>O sistema fica pronto na hora: você cria a empresa em branco e sobe as suas planilhas.</li><li>Os vídeos tutoriais mostram cada passo. Precisa de ajuda? Escreva para o nosso e-mail e respondemos em até 1 dia útil.</li>'
          : passos.dataset.original;
        $('ct-meios').textContent = assinatura ? '(cartão de crédito, cobrado todo mês)' : '(PIX, cartão em até 6x ou boleto)';
      }
      aceite.checked = false;
      pagar.dataset.link = link;
      pagar.dataset.plano = plano;
      erroCt.textContent = '';
      mpCampo.hidden = !assinatura;
      var s = window.BR_CONTA && window.BR_CONTA.sessao(); var mp = document.getElementById('ct-mp'); if (mp && !mp.value && s) mp.value = s.user.email;
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

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

  // PayPal: quem está em outro idioma (euro ou dólar) paga pelo PayPal; em português do Brasil, Mercado Pago
  var NUMEROS = { presenca: { total: 690 }, completo: { total: 1490 }, automacao: { total: 890 }, combo: { total: 2290 },
    'a-presenca': { mensal: 89 }, 'a-completo': { mensal: 149 }, 'a-automacao': { mensal: 199 } };
  function fora() { var i = window.__brIdioma; return i && i.moeda && i.moeda !== 'BRL' ? i : null; }
  function dinheiro(i, n) {
    var lc = i.atual === 'en' || i.atual === 'es' ? 'en-US' : i.atual;
    return n.toLocaleString(lc, { style: 'currency', currency: i.moeda, minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function precoPaypal(b, plano) {
    var n = NUMEROS[plano] || { mensal: Number(b.getAttribute('data-mensal')) || 0, total: Number(b.getAttribute('data-total')) || 0 };
    var i = fora();
    if (n.mensal) return { valor: i.converter(n.mensal), assinatura: true, anual: /-anual$/.test(plano) };
    if (n.total) return { valor: i.converter(n.total / 2), total: i.converter(n.total), assinatura: false };
    return null;
  }
  function irParaPaypal(plano, nome, p, email) {
    var i = fora(), conta = (window.BR_PAYPAL || {}).comerciante;
    if (!conta || !p) throw new Error('O pagamento em ' + i.moeda + ' pelo PayPal abre em breve. Fale com a equipe e combinamos por e-mail.');
    var LC = { 'pt-PT': 'pt_PT', es: 'es_ES', en: 'en_US', it: 'it_IT', fr: 'fr_FR' };
    var q = { business: conta, item_name: nome, currency_code: i.moeda, no_shipping: '1', charset: 'utf-8', lc: LC[i.atual] || 'en_US',
      custom: plano + '|' + (email || ''), 'return': location.origin + location.pathname + '?paypal=ok', cancel_return: location.href };
    if (p.assinatura) {
      q.cmd = '_xclick-subscriptions'; q.a3 = p.valor.toFixed(2); q.p3 = '1'; q.t3 = p.anual ? 'Y' : 'M'; q.src = '1'; q.sra = '1';
      // desde 10/11/2026 sem período grátis: a primeira cobrança é feita na hora
    } else { q.cmd = '_xclick'; q.amount = p.valor.toFixed(2); }
    location.href = 'https://www.paypal.com/cgi-bin/webscr?' + new URLSearchParams(q).toString();
  }

  // Veltria: cada sistema traz o próprio preço no botão (data-total / data-mensal).
  function reais(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function valoresSistema(b) {
    var mensal = Number(b.getAttribute('data-mensal')), total = Number(b.getAttribute('data-total'));
    if (mensal && /-anual$/.test(b.getAttribute('data-contratar') || '')) return [reais(mensal) + ' por ano', 'Plano anual com 20% de desconto · renova a cada 12 meses · avisamos antes de cada cobrança'];
    if (mensal) return [reais(mensal) + ' por mês', 'Sem entrada · hospedagem e suporte inclusos · sem fidelidade, cancele quando quiser'];
    if (total) return ['Entrada de ' + reais(total / 2) + ' agora', 'Total ' + reais(total) + ' · o saldo de ' + reais(total / 2) + ' só na entrega · à vista no Pix ou no cartão; parcelado no cartão leva os juros do Mercado Pago'];
    return ['', ''];
  }

  function meios(plano, assinatura) {
    if (!assinatura) return '(PIX, cartão em até 6x ou boleto)';
    return /-anual$/.test(plano) ? '(cartão de crédito, cobrado uma vez por ano)' : '(cartão de crédito, cobrado todo mês)';
  }

  // e-mail da conta do Mercado Pago (assinaturas) e mensagem de erro, criados uma vez
  var mpCampo = document.createElement('label'); mpCampo.className = 'contratar-mp';
  mpCampo.innerHTML = 'E-mail da sua conta do Mercado Pago<input type="email" id="ct-mp" autocomplete="email"><small>A assinatura fica na conta do Mercado Pago com este e-mail.</small>';
  var erroCt = document.createElement('p'); erroCt.className = 'conta-erro'; erroCt.setAttribute('role', 'alert');
  aceite.closest('label').insertAdjacentElement('beforebegin', mpCampo);
  pagar.insertAdjacentElement('beforebegin', erroCt);

  // ---------------- Anshur: Termo de Assinatura com aceite eletrônico (dados da revenda + caixa própria + registro no banco)
  function ehAnshur(p) { return /^a-sis-anshur/.test(p || ''); }
  function contratoJs() {
    if (window.BR_CONTRATO) return Promise.resolve(window.BR_CONTRATO);
    var src = (document.querySelector('script[src*="js/contratar.js"]').getAttribute('src').split('js/contratar.js')[0] || '') + 'js/contrato-anshur.js?v=1';
    return new Promise(function (ok, falha) { var s = document.createElement('script'); s.src = src; s.onload = function () { ok(window.BR_CONTRATO); }; s.onerror = falha; document.head.appendChild(s); });
  }
  var ctr = document.createElement('div'); ctr.className = 'ctr-bloco'; ctr.hidden = true;
  ctr.innerHTML = '<fieldset class="ctr-campos"><legend>Dados da revenda (contratante)</legend>' +
    '<label>Razão social<input id="ct-razao" autocomplete="organization" maxlength="200" required></label>' +
    '<label>CNPJ<input id="ct-cnpj" inputmode="text" autocomplete="off" maxlength="18" placeholder="00.000.000/0000-00" required aria-describedby="ct-cnpj-msg"><small id="ct-cnpj-msg" aria-live="polite"></small></label>' +
    '<div class="ctr-duas"><label>Seu nome completo<input id="ct-nome" autocomplete="name" maxlength="120" required></label>' +
    '<label>Seu cargo<input id="ct-cargo" autocomplete="organization-title" maxlength="80" placeholder="Ex.: sócio, diretor" required></label></div>' +
    '<small>Quem aceita declara ter poderes para contratar em nome da revenda.</small></fieldset>' +
    '<details class="ctr-ler"><summary>Ler o Termo aqui, sem sair do pagamento</summary><div class="ctr-painel" id="ct-termo-texto" tabindex="0" aria-label="Texto do Termo de Assinatura do Anshur">Carregando o Termo…</div></details>' +
    '<label class="contratar-aceite"><input type="checkbox" id="ct-aceite-anshur"> <span>Li e aceito o <a href="contrato-anshur.html" target="_blank" rel="noopener">Termo de Assinatura do Anshur (versão 1)</a>, em nome da revenda informada acima.</span></label>';
  aceite.closest('label').insertAdjacentElement('afterend', ctr);
  var $c = function (id) { return ctr.querySelector('#' + id); };
  var termo = null, aceiteFeito = null;
  function cnpjOk() { return window.BR_CONTRATO && window.BR_CONTRATO.cnpjValido($c('ct-cnpj').value); }
  function camposOk() {
    return $c('ct-razao').value.trim().length >= 2 && cnpjOk() && $c('ct-nome').value.trim().length >= 2 && $c('ct-cargo').value.trim().length >= 2;
  }
  function anshurOk() { return !ehAnshur(pagar.dataset.plano) || (camposOk() && $c('ct-aceite-anshur').checked && !!termo); }
  function prepararAnshur() {
    aceiteFeito = null; $c('ct-aceite-anshur').checked = false;
    contratoJs().then(function (C) { return C.carregar(); }).then(function (t) {
      termo = t; $c('ct-termo-texto').innerHTML = window.BR_CONTRATO.html(t.texto); estado();
    }).catch(function (x) { termo = null; $c('ct-termo-texto').textContent = (x && x.message) || 'Não foi possível abrir o Termo agora.'; estado(); });
  }
  ctr.addEventListener('input', function (e) {
    if (e.target.id === 'ct-cnpj') {
      var v = e.target.value, limpo = window.BR_CONTRATO ? window.BR_CONTRATO.cnpjLimpo(v) : v, msg = $c('ct-cnpj-msg');
      var ok = cnpjOk();
      e.target.setAttribute('aria-invalid', limpo.length >= 14 && !ok ? 'true' : 'false');
      msg.textContent = limpo.length >= 14 ? (ok ? 'CNPJ conferido.' : 'CNPJ inválido: confira os números.') : '';
      msg.className = limpo.length >= 14 && !ok ? 'ctr-erro-campo' : '';
    }
    aceiteFeito = null; estado();
  });
  ctr.addEventListener('change', estado);
  ctr.addEventListener('blur', function (e) {
    if (e.target.id === 'ct-cnpj' && cnpjOk()) e.target.value = window.BR_CONTRATO.cnpjFormatado(e.target.value);
  }, true);
  function faltaAnshur() {
    if ($c('ct-razao').value.trim().length < 2) return $c('ct-razao');
    if (!cnpjOk()) return $c('ct-cnpj');
    if ($c('ct-nome').value.trim().length < 2) return $c('ct-nome');
    if ($c('ct-cargo').value.trim().length < 2) return $c('ct-cargo');
    if (!$c('ct-aceite-anshur').checked) return $c('ct-aceite-anshur');
    return null;
  }
  // grava o aceite (com o hash do texto lido aqui) antes de abrir o pagamento
  function registrarAceite() {
    if (!ehAnshur(pagar.dataset.plano)) return Promise.resolve(null);
    if (aceiteFeito) return Promise.resolve(aceiteFeito);
    if (!termo) return Promise.reject(new Error('O Termo ainda não carregou. Tente de novo em instantes.'));
    if (!window.BR_CONTA) return Promise.reject(new Error('Entre na sua conta para aceitar o Termo.'));
    return window.BR_CONTA.sb().then(function (c) {
      return c.rpc('anshur_contrato_aceitar', { p_versao: termo.versao, p_hash: termo.hash, p_razao_social: $c('ct-razao').value.trim(),
        p_cnpj: window.BR_CONTRATO.cnpjLimpo($c('ct-cnpj').value), p_nome: $c('ct-nome').value.trim(), p_cargo: $c('ct-cargo').value.trim(), p_produto: pagar.dataset.plano });
    }).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Não foi possível registrar o aceite.');
      aceiteFeito = r.data;
      var n = ctr.querySelector('.ctr-ok') || ctr.appendChild(Object.assign(document.createElement('p'), { className: 'ctr-ok' }));
      n.setAttribute('role', 'status');
      n.textContent = 'Aceite registrado em ' + window.BR_CONTRATO.dataHora(r.data.aceito_em) + '. O comprovante fica em Minha conta.';
      return r.data;
    });
  }

  function estado() {
    var ok = aceite.checked && anshurOk();
    pagar.setAttribute('aria-disabled', ok ? 'false' : 'true');
    pagar.href = '#';
  }
  aceite.addEventListener('change', estado);
  pagar.addEventListener('click', function (e) {
    e.preventDefault();
    if (pagar.getAttribute('aria-disabled') === 'true') {
      if (!aceite.checked) { aceite.focus(); return; }
      var f = ehAnshur(pagar.dataset.plano) && faltaAnshur();
      if (f) { erroCt.textContent = f.id === 'ct-cnpj' ? 'Informe um CNPJ válido.' : f.id === 'ct-aceite-anshur' ? 'Marque o aceite do Termo de Assinatura do Anshur.' : 'Preencha os dados da revenda.'; f.focus(); }
      else if (ehAnshur(pagar.dataset.plano) && !termo) erroCt.textContent = 'O Termo ainda não carregou. Tente de novo em instantes.';
      return;
    }
    if (ehAnshur(pagar.dataset.plano) && !aceiteFeito) {
      var txt0 = pagar.textContent; pagar.textContent = 'Registrando o aceite…'; pagar.setAttribute('aria-disabled', 'true'); erroCt.textContent = '';
      registrarAceite().then(function () { pagar.textContent = txt0; estado(); pagar.click(); })
        .catch(function (x) { pagar.textContent = txt0; estado(); erroCt.textContent = x.message || 'Não foi possível registrar o aceite. Tente de novo.'; });
      return;
    }
    if (!/(^|\.)bluerose-store\.com$/.test(location.hostname)) { erroCt.textContent = 'Ambiente de teste: o pagamento fica desligado e nada é cobrado. No site oficial este botão abre o Mercado Pago.'; return; }
    if (fora()) {
      try {
        var s0 = window.BR_CONTA && window.BR_CONTA.sessao();
        irParaPaypal(pagar.dataset.plano, $('ct-titulo').textContent, JSON.parse(pagar.dataset.paypal || 'null'), s0 && s0.user.email);
      } catch (x) { erroCt.textContent = x.message; }
      return;
    }
    if (!window.BR_CONTA) { location.href = pagar.dataset.link; return; }
    var txt = pagar.textContent; pagar.textContent = 'Abrindo o Mercado Pago…'; pagar.setAttribute('aria-disabled', 'true'); erroCt.textContent = '';
    var emailMp = (document.getElementById('ct-mp') || {}).value || '';
    var plano = pagar.dataset.plano;
    // desde 10/11/2026 nenhum sistema tem teste grátis: a assinatura começa no pagamento
    window.BR_CONTA.pagar(plano, { emailMp: emailMp, teste: false }).catch(function (x) {
      erroCt.textContent = x.message || 'Não foi possível abrir o pagamento. Tente de novo.'; pagar.textContent = txt; estado();
    });
  });
  $('ct-falar').addEventListener('click', function () { dlg.close(); });

  document.querySelectorAll('[data-contratar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var plano = b.getAttribute('data-contratar');
      var link = links[plano];
      if ((!link && !/^a-sis-/.test(plano) && !(fora() && NUMEROS[plano])) || typeof dlg.showModal !== 'function') { location.hash = 'contato'; return; }
      // assinar exige conta: entra primeiro, depois mostra o resumo
      if (window.BR_CONTA && !window.BR_CONTA.sessao()) { window.BR_CONTA.exigirLogin('Para contratar, entre ou crie a sua conta. É grátis e leva menos de um minuto.').then(function () { b.click(); }); return; }
      var assinatura = plano.indexOf('a-') === 0;
      var v = VALORES[plano] || valoresSistema(b);
      $('ct-titulo').textContent = b.getAttribute('data-nome');
      $('ct-valor').innerHTML = '<b>' + v[0] + '</b><small>' + v[1] + '</small>';
      $('ct-meios').textContent = meios(plano, assinatura);
      $('ct-fidelidade').textContent = assinatura ? (/^a-sis-/.test(plano) ? ' (sistemas da Veltria: sem fidelidade)' : ' (sem fidelidade)') : '';
      // sistemas prontos: ficam prontos na hora, com vídeos tutoriais (sites e automações seguem com implantação feita por nós)
      var passos = dlg.querySelector('.contratar-passos');
      if (passos) {
        if (!passos.dataset.original) passos.dataset.original = passos.innerHTML;
        passos.innerHTML = /^a-sis-/.test(plano) && !ehAnshur(plano)
          ? '<li>Você paga com segurança no <b>Mercado Pago</b> <span id="ct-meios"></span>.</li><li>O sistema fica pronto na hora: você cria a empresa em branco e sobe as suas planilhas.</li><li>Os vídeos tutoriais mostram cada passo. Precisa de ajuda? Escreva para o nosso e-mail e respondemos em até 1 dia útil.</li>'
          : passos.dataset.original;
        $('ct-meios').textContent = meios(plano, assinatura);
      }
      var pp = fora() && precoPaypal(b, plano);
      if (pp) {
        var i = fora();
        $('ct-valor').innerHTML = pp.assinatura
          ? '<b>' + dinheiro(i, pp.valor) + (pp.anual ? ' por ano' : ' por mês') + '</b><small>Sem entrada · sem fidelidade, cancele quando quiser</small>'
          : '<b>Entrada de ' + dinheiro(i, pp.valor) + ' agora</b><small>Total ' + dinheiro(i, pp.total) + ' · o saldo só na entrega</small>';
        if (passos) passos.innerHTML = '<li>Você paga com segurança no <b>PayPal</b>, com cartão ou saldo PayPal, em ' + i.moeda + '.</li>' +
          (/^a-sis-/.test(plano) ? '<li>A primeira cobrança é feita agora; as próximas, no mesmo dia de cada ' + (pp.anual ? 'ano' : 'mês') + '.</li><li>Em até 1 dia útil liberamos o sistema no e-mail da sua conta.</li>'
            : '<li>Em até 1 dia útil chega um e-mail para levantarmos o que você precisa.</li><li>Você vê a prévia antes da entrega e pede os ajustes incluídos.</li>');
      }
      pagar.dataset.paypal = pp ? JSON.stringify(pp) : '';
      aceite.checked = false;
      pagar.dataset.link = link;
      pagar.dataset.plano = plano;
      erroCt.textContent = '';
      mpCampo.hidden = !assinatura || !!pp;
      ctr.hidden = !ehAnshur(plano);
      if (ehAnshur(plano)) prepararAnshur();
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

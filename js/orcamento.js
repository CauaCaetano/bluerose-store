/*
 * "Monte o seu": o cliente escolhe a base, marca os adicionais e vê o total,
 * o prazo e a forma de pagamento. O botão leva tudo escrito para o formulário.
 * Os valores são os mesmos da tabela de preços e dos agentes do escritório.
 */
(function () {
  var raiz = document.querySelector('[data-orcamento]');
  if (!raiz) return;
  var EN = (document.documentElement.lang || '').indexOf('en') === 0;

  var BASES = [
    { id: 'presenca', n: ['Presença', 'Presence'], p: [690, 590], dias: 3, d: ['Site de 1 página', '1-page website'], site: true },
    { id: 'completo', n: ['Completo', 'Complete'], p: [1490, 1190], dias: 7, d: ['Site de até 6 páginas com agenda e orçamento', 'Up to 6 pages with booking and quotes'], site: true, gmn: true },
    { id: 'automacao', n: ['Completo + Automação', 'Complete + Automation'], p: [2290, 1790], dias: 10, d: ['O Completo + WhatsApp automático', 'Complete + automated WhatsApp'], site: true, gmn: true, auto: true },
    { id: 'so-automacao', n: ['Só automação de WhatsApp', 'WhatsApp automation only'], p: [890, 790], dias: 5, d: ['Para quem já tem site', 'For businesses that already have a website'], auto: true },
  ];
  // q: aceita quantidade; so: só aparece com site / com automação; nao: some quando a base já inclui
  var EXTRAS = [
    { id: 'pagina', n: ['Página extra', 'Extra page'], p: [190, 120], dias: 1, q: 10, so: 'site', d: ['Cada página além do plano', 'Each page beyond the plan'] },
    { id: 'idioma', n: ['Versão em outro idioma', 'Second language version'], p: [490, 290], dias: 3, so: 'site', d: ['Inglês ou espanhol, com seletor de idioma', 'Spanish or Portuguese, with a language switch'] },
    { id: 'loja', n: ['Catálogo com pedido pelo WhatsApp', 'Catalog with WhatsApp ordering'], p: [590, 350], dias: 4, so: 'site', d: ['Carrinho que monta o pedido e envia pronto', 'A cart that builds the order and sends it ready'] },
    { id: 'agenda-google', n: ['Agenda ligada ao Google Agenda', 'Booking synced with Google Calendar'], p: [290, 190], dias: 2, so: 'site', d: ['Horários ocupados somem do site sozinhos', 'Busy slots disappear from the site on their own'] },
    { id: 'identidade', n: ['Logo e identidade visual', 'Logo and visual identity'], p: [490, 320], dias: 5, d: ['Logo, cores e fontes para usar em tudo', 'Logo, colors and fonts to use everywhere'] },
    { id: 'textos', n: ['Textos profissionais e SEO local', 'Professional copy and local SEO'], p: [290, 190], dias: 2, so: 'site', d: ['Textos escritos para vender e aparecer no Google da sua cidade', 'Copy written to sell and rank in your city'] },
    { id: 'google', n: ['Perfil da Empresa no Google', 'Google Business Profile'], p: [190, 150], dias: 1, nao: 'gmn', d: ['Criação ou revisão completa do perfil', 'Setup or full review of your profile'] },
    { id: 'ia', n: ['Atendente com IA do seu negócio', 'AI assistant trained on your business'], p: [790, 490], dias: 4, so: 'auto', d: ['Responde dúvidas com os seus preços e regras, e passa para você quando precisa', 'Answers questions with your prices and rules, and hands off to you when needed'] },
    { id: 'crm', n: ['Painel de contatos (CRM simples)', 'Leads board (simple CRM)'], p: [390, 240], dias: 3, so: 'auto', d: ['Cada contato do WhatsApp vira uma linha com status', 'Every WhatsApp contact becomes a row with a status'] },
    { id: 'migracao', n: ['Migração do site antigo e do domínio', 'Old site and domain migration'], p: [190, 160], dias: 2, so: 'site', d: ['Leva o conteúdo e o endereço sem sair do ar', 'Moves content and address without downtime'] },
  ];
  var CUIDADO = [79, 39];
  var I = EN ? 1 : 0;
  var T = EN ? {
    base: '1. Choose the base', extras: '2. Add what you need', cuidado: 'Care plan', cuidadoD: 'Hosting, backups, up to 1 hour of changes a month and a visits report.',
    expressa: 'Express delivery', expressaD: 'Half the time, +30% on the total', resumo: 'Your quote', total: 'Total', prazo: 'Ready in', dias: 'business days', dia: 'business day',
    entrada: '50% to start', resto: '50% on delivery', parcelas: 'or up to 6 card payments of', juros: ' plus Mercado Pago interest', mes: '/month', pedir: 'Request this quote', copiado: 'Quote added to the form below.',
    nota: 'Reference prices. The final quote is confirmed in writing before any payment.', so: 'only', cada: 'each', incluso: 'included', msg: 'Hi! I built a quote on the website:', mensal: 'Monthly',
  } : {
    base: '1. Escolha a base', extras: '2. Adicione o que precisar', cuidado: 'Plano de cuidado', cuidadoD: 'Hospedagem, cópias de segurança, até 1 hora de ajustes por mês e relatório de visitas.',
    expressa: 'Entrega expressa', expressaD: 'Metade do prazo, +30% no total', resumo: 'Seu orçamento', total: 'Total', prazo: 'Pronto em', dias: 'dias úteis', dia: 'dia útil',
    entrada: '50% para começar', resto: '50% na entrega', parcelas: 'ou em até 6x no cartão de', juros: ' mais os juros do Mercado Pago', mes: '/mês', pedir: 'Pedir este orçamento', copiado: 'Orçamento colocado no formulário abaixo.',
    nota: 'Valores de referência. O orçamento final é confirmado por escrito antes de qualquer pagamento.', so: 'só', cada: 'cada', incluso: 'incluso', msg: 'Olá! Montei um orçamento no site:', mensal: 'Mensal',
  };
  var dinheiro = function (v) { return v.toLocaleString(EN ? 'en-US' : 'pt-BR', { style: 'currency', currency: EN ? 'USD' : 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

  var estado = { base: 'completo', extras: {}, cuidado: false, expressa: false };
  try { var pedida = new URLSearchParams(location.search).get('plano'); if (BASES.some(function (b) { return b.id === pedida; })) estado.base = pedida; } catch (e) {}

  raiz.innerHTML =
    '<div class="orc-col">' +
      '<fieldset class="orc-grupo"><legend>' + T.base + '</legend><div class="orc-bases">' +
        BASES.map(function (b) { return '<label class="orc-base"><input type="radio" name="orc-base" value="' + b.id + '"><span class="orc-base-n">' + esc(b.n[I]) + '</span><span class="orc-base-d">' + esc(b.d[I]) + '</span><span class="orc-base-p">' + dinheiro(b.p[I]) + '<small> · ' + b.dias + ' ' + T.dias + '</small></span></label>'; }).join('') +
      '</div></fieldset>' +
      '<fieldset class="orc-grupo"><legend>' + T.extras + '</legend><div class="orc-extras">' +
        EXTRAS.map(function (x) {
          return '<label class="orc-extra" data-extra="' + x.id + '"><input type="checkbox" value="' + x.id + '"><span class="orc-extra-txt"><b>' + esc(x.n[I]) + '</b><small>' + esc(x.d[I]) + '</small></span>' +
            (x.q ? '<span class="orc-qtd"><button type="button" data-menos aria-label="-">−</button><output>1</output><button type="button" data-mais aria-label="+">+</button></span>' : '') +
            '<span class="orc-extra-p">+ ' + dinheiro(x.p[I]) + (x.q ? '<small> ' + T.cada + '</small>' : '') + '</span></label>';
        }).join('') +
        '<label class="orc-extra orc-especial"><input type="checkbox" data-expressa><span class="orc-extra-txt"><b>' + T.expressa + '</b><small>' + T.expressaD + '</small></span><span class="orc-extra-p">+30%</span></label>' +
        '<label class="orc-extra orc-especial"><input type="checkbox" data-cuidado><span class="orc-extra-txt"><b>' + T.cuidado + '</b><small>' + T.cuidadoD + '</small></span><span class="orc-extra-p">' + dinheiro(CUIDADO[I]) + T.mes + '</span></label>' +
      '</div></fieldset>' +
    '</div>' +
    '<aside class="orc-resumo" aria-live="polite"><h3>' + T.resumo + '</h3><div class="orc-linhas" data-linhas></div>' +
      '<div class="orc-total"><span>' + T.total + '</span><strong data-total></strong></div>' +
      '<p class="orc-prazo" data-prazo></p><p class="orc-pag" data-pag></p>' +
      '<a class="btn btn-primary orc-pedir" href="' + (EN ? '#contact' : '#contato') + '" data-pedir>' + T.pedir + '</a><p class="orc-nota">' + T.nota + '</p><p class="orc-ok" data-ok hidden>' + T.copiado + '</p></aside>';

  var $ = function (s) { return raiz.querySelector(s); };
  var base = function () { return BASES.filter(function (b) { return b.id === estado.base; })[0]; };
  var vale = function (x, b) { return !(x.so === 'site' && !b.site) && !(x.so === 'auto' && !b.auto) && !(x.nao === 'gmn' && b.gmn); };

  function calcular() {
    var b = base(), linhas = [[b.n[I], b.p[I]]], total = b.p[I], dias = b.dias;
    EXTRAS.forEach(function (x) {
      var q = estado.extras[x.id];
      if (!q || !vale(x, b)) return;
      linhas.push([x.n[I] + (x.q && q > 1 ? ' × ' + q : ''), x.p[I] * q]);
      total += x.p[I] * q; dias += x.dias * (x.q ? Math.min(q, 3) : 1);
    });
    if (estado.expressa) { var a = Math.round(total * 0.3); linhas.push([T.expressa, a]); total += a; dias = Math.ceil(dias / 2); }
    return { linhas: linhas, total: total, dias: dias };
  }

  function desenhar() {
    var b = base(), r = calcular();
    raiz.querySelectorAll('input[name="orc-base"]').forEach(function (i) { i.checked = i.value === estado.base; i.closest('.orc-base').classList.toggle('on', i.checked); });
    EXTRAS.forEach(function (x) {
      var el = raiz.querySelector('[data-extra="' + x.id + '"]'), ok = vale(x, b), q = estado.extras[x.id] || 0;
      el.hidden = !ok;
      el.querySelector('input').checked = !!q;
      el.classList.toggle('on', !!q);
      var out = el.querySelector('output'); if (out) out.textContent = Math.max(1, q);
    });
    $('[data-expressa]').checked = estado.expressa;
    $('[data-cuidado]').checked = estado.cuidado;
    $('[data-linhas]').innerHTML = r.linhas.map(function (l) { return '<div><span>' + esc(l[0]) + '</span><b>' + dinheiro(l[1]) + '</b></div>'; }).join('') +
      (estado.cuidado ? '<div class="orc-mensal"><span>' + T.cuidado + ' (' + T.mensal.toLowerCase() + ')</span><b>' + dinheiro(CUIDADO[I]) + T.mes + '</b></div>' : '');
    $('[data-total]').textContent = dinheiro(r.total);
    $('[data-prazo]').textContent = T.prazo + ' ' + r.dias + ' ' + (r.dias === 1 ? T.dia : T.dias);
    $('[data-pag]').textContent = T.entrada + ' (' + dinheiro(Math.round(r.total / 2)) + ') · ' + T.resto + (EN ? '' : ' · ' + T.parcelas + ' ' + dinheiro(Math.ceil(r.total / 6)) + T.juros);
  }

  raiz.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'orc-base') estado.base = t.value;
    else if (t.hasAttribute('data-expressa')) estado.expressa = t.checked;
    else if (t.hasAttribute('data-cuidado')) estado.cuidado = t.checked;
    else if (t.type === 'checkbox') { if (t.checked) estado.extras[t.value] = estado.extras[t.value] || 1; else delete estado.extras[t.value]; }
    desenhar();
  });
  raiz.addEventListener('click', function (e) {
    var bt = e.target.closest('[data-mais],[data-menos]');
    if (!bt) return;
    e.preventDefault();
    var id = bt.closest('[data-extra]').getAttribute('data-extra');
    var x = EXTRAS.filter(function (y) { return y.id === id; })[0];
    var q = (estado.extras[id] || 0) + (bt.hasAttribute('data-mais') ? 1 : -1);
    if (q <= 0) delete estado.extras[id]; else estado.extras[id] = Math.min(q, x.q);
    desenhar();
  });

  // "Personalizar este plano" nos cartões de preço
  document.querySelectorAll('[data-personalizar]').forEach(function (a) {
    a.addEventListener('click', function () { estado.base = a.getAttribute('data-personalizar'); desenhar(); });
  });

  $('[data-pedir]').addEventListener('click', function (e) {
    var r = calcular(), msg = document.getElementById('f-msg');
    var texto = T.msg + '\n' + r.linhas.map(function (l) { return '• ' + l[0] + ': ' + dinheiro(l[1]); }).join('\n') +
      (estado.cuidado ? '\n• ' + T.cuidado + ': ' + dinheiro(CUIDADO[I]) + T.mes : '') +
      '\n' + T.total + ': ' + dinheiro(r.total) + ' · ' + T.prazo.toLowerCase() + ' ' + r.dias + ' ' + T.dias;
    if (msg) {
      e.preventDefault();
      msg.value = texto.slice(0, 2000);
      msg.dispatchEvent(new Event('input', { bubbles: true }));
      var alvo = document.getElementById('contato') || document.getElementById('contact');
      if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { msg.focus({ preventScroll: true }); }, 600);
      var ok = $('[data-ok]'); ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 5000);
    }
  });

  desenhar();
})();

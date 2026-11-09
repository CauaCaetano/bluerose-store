/* Blocos de confiança + estados de carregando/erro da Blue Rose (P5, 08/11/2026; estados na rodada 3).
   1) Blocos de confiança
      <div data-confianca="teste"></div>  ou vários juntos: <div data-confianca="teste pagamento cancelamento"></div>
      Chaves: teste | pagamento | cancelamento | exportacao | quem-somos
   2) Estados das demonstrações (window.brEstado), detalhes em relatorios/site-teste-avaliacao/r3-p5-estados.md
      <iframe data-estado src="..."></iframe>            carregando por cima até abrir; se não abrir, "Tentar de novo"
      brEstado.carregando(el, { texto })                  caixa "Carregando…" dentro de el (ou por cima, com { sobre: true })
      brEstado.erro(el, { texto, tentar: fn, link })      "Não deu certo" + botão Tentar de novo
      brEstado.vazio(el, { titulo, texto })               estado vazio (ex.: "Escolha um cenário e clique em Rodar")
      brEstado.limpar(el)                                 tira o estado
      brEstado.rodar(el, fn, { texto, erro })             carregando enquanto a promessa de fn() corre; erro com nova tentativa
      brEstado.iframe(frame, { tempo })                   o mesmo que data-estado, para iframes criados por script
   3) Índice com a seção atual destacada: <nav data-indice> (seguranca.html).
   + <script src="js/confianca.js?v=3" defer></script> (ajuste o caminho em subpastas).
   O CSS (css/pg-seguranca.css, classes .cft-* e .br-estado*) é carregado sozinho se a página não tiver.
   Os textos dos blocos foram conferidos no código (nexo-pagamentos, camada.js, conta-pagina.js) e no Supabase em 08/11/2026.
   Não acrescente afirmação sem conferir: veja relatorios/site-teste-avaliacao/p5-blocos.md. */
(function () {
  var eu = document.currentScript && document.currentScript.src;
  var raiz = eu ? new URL('../', eu).href : '/';
  var pg = raiz + 'seguranca.html';
  var VERSAO_CSS = 3;
  var SUPORTE = raiz + '#contato'; // formulário de contato da home (atendimento de segunda a sexta, das 8h às 18h)

  var B = {
    teste: {
      t: 'Teste grátis de 7 dias',
      l: ['Cartão cadastrado no Mercado Pago; nada é cobrado nos 7 dias.', 'Se não cancelar, a assinatura começa no 8º dia.', 'Vale uma vez por conta, e-mail, conta do Mercado Pago e cartão.'],
      a: '#teste', m: 'Como funciona o teste'
    },
    pagamento: {
      t: 'Pagamento pelo Mercado Pago',
      l: ['Cartão de crédito (cobrança automática) ou Pix (sem cobrança automática).', 'O número do cartão é digitado no Mercado Pago e não passa pela Blue Rose.', 'O sistema só libera com o pagamento aprovado.'],
      a: '#pagamentos', m: 'Detalhes do pagamento'
    },
    cancelamento: {
      t: 'Cancele quando quiser',
      l: ['Cancele em Minha conta, sem multa.', 'O acesso continua até o fim do período já pago.', 'Os dados ficam guardados por 90 dias e depois são apagados.'],
      a: '#cancelamento', m: 'Como cancelar'
    },
    exportacao: {
      t: 'Os dados são seus',
      l: ['Os dados saem em planilha, de dentro do sistema.', 'Abre no Excel, no Google Planilhas ou no LibreOffice.', 'Dá para começar importando uma planilha ou o extrato do banco.'],
      a: '#exportacao', m: 'Como exportar'
    },
    'quem-somos': {
      t: 'Quem está por trás',
      l: ['Blue Rose Express. Responsável e encarregado de dados: Cauã Caetano.', 'Banco de dados no Supabase, na região de São Paulo.', 'Atendimento de segunda a sexta, das 8h às 18h.'],
      a: '#empresa', m: 'Segurança e dados'
    }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function garantirCss() {
    var tem = [].some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return /pg-seguranca\.css/.test(l.getAttribute('href') || ''); });
    if (tem) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = raiz + 'css/pg-seguranca.css?v=' + VERSAO_CSS;
    document.head.appendChild(l);
  }

  function montar(el) {
    if (el.getAttribute('data-confianca-pronto')) return;
    var chaves = (el.getAttribute('data-confianca') || '').split(/[\s,]+/).filter(function (k) { return B[k]; });
    if (!chaves.length) return;
    var naPropria = /seguranca\.html$/.test(location.pathname);
    var nivel = Number(el.getAttribute('data-confianca-nivel')) || 3; // nível do título dos cartões (h3 por padrão)
    nivel = Math.min(6, Math.max(2, nivel));
    el.classList.add('cft');
    el.innerHTML = chaves.map(function (k) {
      var b = B[k], href = (naPropria ? '' : pg) + b.a;
      return '<div class="cft-cartao"><h' + nivel + '>' + esc(b.t) + '</h' + nivel + '><ul>' +
        b.l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<a class="cft-mais" href="' + esc(href) + '">' + esc(b.m) + '</a></div>';
    }).join('');
    el.setAttribute('data-confianca-pronto', '1');
  }

  /* ---------------------------------------------------------------- estados: carregando, erro, vazio */
  var CAIXA = new WeakMap(); // alvo -> caixa de estado

  function caixa(alvo, o) {
    garantirCss();
    var c = CAIXA.get(alvo);
    var sobre = !!(o && o.sobre);
    if (!c || !c.isConnected) {
      c = document.createElement('div');
      CAIXA.set(alvo, c);
    }
    c.className = 'br-estado' + (sobre ? ' br-estado-sobre' : '');
    if (sobre) {
      var pai = alvo.tagName === 'IFRAME' ? alvo.parentElement : alvo;
      pai.classList.add('br-estado-pai');
      if (c.parentElement !== pai) pai.appendChild(c);
    } else if (c.parentElement !== alvo) alvo.appendChild(c);
    c.hidden = false;
    return c;
  }

  function carregando(alvo, o) {
    o = o || {};
    var c = caixa(alvo, o);
    c.classList.add('br-estado-carregando');
    c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
    c.innerHTML = '<span class="br-estado-roda" aria-hidden="true"></span><p>' + esc(o.texto || 'Carregando a demonstração…') + '</p>';
    alvo.setAttribute('aria-busy', 'true');
    return c;
  }

  function erro(alvo, o) {
    o = o || {};
    var c = caixa(alvo, o);
    c.classList.add('br-estado-erro');
    c.setAttribute('role', 'alert'); c.removeAttribute('aria-live');
    c.innerHTML = '<span class="br-estado-marca" aria-hidden="true">!</span>' +
      '<p class="br-estado-t">' + esc(o.titulo || 'Não deu certo agora.') + '</p>' +
      '<p>' + esc(o.texto || 'Pode ser a conexão. Tente de novo em instantes.') + '</p>' +
      (o.tentar ? '<button type="button" class="br-estado-bt">' + esc(o.botao || 'Tentar de novo') + '</button>' : '') +
      ((o.link && o.link.href) || o.suporte !== false ? '<p class="br-estado-links">' +
        (o.link && o.link.href ? '<a class="br-estado-link" href="' + esc(o.link.href) + '"' + (o.link.novaAba ? ' target="_blank" rel="noopener"' : '') + '>' + esc(o.link.texto || 'Abrir em outra aba') + '</a>' : '') +
        (o.suporte !== false ? '<a class="br-estado-link" href="' + esc(o.suporte || SUPORTE) + '" target="_top">Falar com o suporte</a>' : '') + '</p>' : '');
    alvo.removeAttribute('aria-busy');
    var bt = c.querySelector('.br-estado-bt');
    if (bt) bt.addEventListener('click', function () { o.tentar(); });
    return c;
  }

  function vazio(alvo, o) {
    o = o || {};
    var c = caixa(alvo, o);
    c.classList.add('br-estado-vazio');
    c.removeAttribute('role'); c.removeAttribute('aria-live');
    c.innerHTML = (o.titulo ? '<p class="br-estado-t">' + esc(o.titulo) + '</p>' : '') + '<p>' + esc(o.texto || 'Nada por aqui ainda.') + '</p>';
    alvo.removeAttribute('aria-busy');
    return c;
  }

  function limpar(alvo) {
    var c = CAIXA.get(alvo);
    if (c) c.remove();
    CAIXA.delete(alvo);
    alvo.removeAttribute('aria-busy');
  }

  // carregando enquanto fn() corre; se a promessa falhar (ou passar do tempo), mostra o erro com "Tentar de novo"
  function rodar(alvo, fn, o) {
    o = o || {};
    carregando(alvo, { texto: o.texto, sobre: o.sobre });
    var tempo = o.tempo || 15000, venceu = false, t = setTimeout(function () { venceu = true; falhou(); }, tempo);
    function falhou() {
      erro(alvo, { sobre: o.sobre, titulo: o.titulo, texto: o.erro, link: o.link, tentar: function () { rodar(alvo, fn, o); } });
    }
    return Promise.resolve().then(fn).then(function (r) {
      clearTimeout(t); if (venceu) return r;
      limpar(alvo); return r;
    }, function (e) {
      clearTimeout(t); if (!venceu) falhou();
      throw e;
    });
  }

  // iframe de demonstração: carregando por cima até o load; se não abrir no tempo (contado só quando está visível)
  // ou abrir a página "não encontrada" do site, mostra o erro com "Tentar de novo" e "Abrir em outra aba".
  var FRAMES = new WeakSet();
  function iframe(frame, o) {
    if (!frame || FRAMES.has(frame)) return;
    FRAMES.add(frame);
    o = o || {};
    var tempo = Number(frame.getAttribute('data-estado-tempo')) || o.tempo || 15000;
    var timer = null, visivel = !('IntersectionObserver' in window), esperando = false;

    function pronto() {
      try { var d = frame.contentDocument; return !!(d && d.readyState === 'complete' && d.URL !== 'about:blank'); } catch (e) { return false; }
    }
    function naoEncontrada() {
      try { var d = frame.contentDocument; return !!(d && /não encontrada/i.test(d.title || '')); } catch (e) { return false; }
    }
    function armar() { clearTimeout(timer); if (esperando && visivel) timer = setTimeout(falhou, tempo); }
    function falhou() {
      esperando = false;
      var src = frame.getAttribute('src') || '';
      erro(frame, {
        sobre: true,
        texto: o.erro || 'A demonstração não abriu. Pode ser a conexão.',
        tentar: function () { comecar(); var s = frame.getAttribute('src'); frame.setAttribute('src', 'about:blank'); setTimeout(function () { frame.setAttribute('src', s); }, 30); },
        link: src && src !== 'about:blank' ? { href: src, texto: 'Abrir em outra aba', novaAba: true } : null
      });
    }
    function comecar() {
      esperando = true;
      carregando(frame, { sobre: true, texto: o.texto || frame.getAttribute('data-estado-texto') || 'Carregando a demonstração…' });
      armar();
    }
    frame.addEventListener('load', function () {
      if (frame.getAttribute('src') === 'about:blank') return;
      clearTimeout(timer); esperando = false;
      if (naoEncontrada()) falhou(); else limpar(frame);
    });
    // trocou o endereço (vitrine, catálogo): volta a mostrar o carregando
    new MutationObserver(function () { if (frame.getAttribute('src') && frame.getAttribute('src') !== 'about:blank') comecar(); })
      .observe(frame, { attributes: true, attributeFilter: ['src'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel) armar(); else clearTimeout(timer); }).observe(frame);
    }
    if (frame.getAttribute('src') && !pronto()) comecar();
  }

  /* ---------------------------------------------------------------- índice da página com a seção atual destacada
     <nav data-indice> com links para #ids: o link da seção que está na tela ganha aria-current="location".
     No celular o índice rola de lado: o link atual é trazido para dentro da faixa (só a faixa rola, nunca a página). */
  function indice(nav) {
    var links = [].slice.call(nav.querySelectorAll('a[href^="#"]'));
    var secoes = links.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    if (!links.length || secoes.some(function (s) { return !s; })) return;
    var faixa = nav.querySelector('.wrap') || nav, atual = -2;
    function marcar(i) {
      if (i === atual) return;
      atual = i;
      links.forEach(function (a, k) { if (k === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      if (i < 0 || faixa.scrollWidth <= faixa.clientWidth + 1) return;
      var a = links[i], esq = a.offsetLeft - faixa.offsetLeft, alvo = Math.max(0, esq - 16);
      if (esq < faixa.scrollLeft || esq + a.offsetWidth > faixa.scrollLeft + faixa.clientWidth - 32) {
        var suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
        try { faixa.scrollTo({ left: alvo, behavior: suave ? 'smooth' : 'auto' }); } catch (e) { faixa.scrollLeft = alvo; }
      }
    }
    var pendente = false;
    function medir() {
      pendente = false;
      var linha = nav.getBoundingClientRect().bottom + 24, i = -1;
      secoes.forEach(function (s, k) { if (s.getBoundingClientRect().top <= linha) i = k; });
      // no fim da página a última seção (curta) também fica marcada
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
        for (var k = secoes.length - 1; k >= 0; k--) { if (secoes[k].getBoundingClientRect().top < innerHeight) { i = k; break; } }
      }
      marcar(i);
    }
    function pedir() { if (!pendente) { pendente = true; requestAnimationFrame(medir); } }
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    medir();
  }

  function iniciar() {
    [].forEach.call(document.querySelectorAll('nav[data-indice]'), indice);
    var els = document.querySelectorAll('[data-confianca]');
    if (els.length) { garantirCss(); [].forEach.call(els, montar); }
    [].forEach.call(document.querySelectorAll('iframe[data-estado]'), function (f) { iframe(f); });
  }
  window.brConfianca = { montar: iniciar };
  window.brEstado = { carregando: carregando, erro: erro, vazio: vazio, limpar: limpar, rodar: rodar, iframe: iframe };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/*
 * Categorias de sites demonstrativos.
 * Lê o catálogo gerado em sites/catalogo.js e monta:
 *  - [data-perso]: "veja com o seu nome" (nome do negócio + cor) que segue para os sites
 *  - [data-categorias]: cartões de categoria; ao clicar, abre a escolha dos sites
 *  - [data-vitrine-sites]: vitrine com categoria → site → computador/celular
 * Em páginas em inglês, usa as versões americanas (sites/en/).
 */
(function () {
  var dados = window.BR_SITES;
  if (!dados) return;
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = en
    ? { sites: function (n) { return n + (n > 1 ? ' websites' : ' website'); }, abrir: 'Open website', paginas: 'pages', escolha: 'Choose a website to explore', ver: 'See the websites', plano: 'This model in the Complete plan', prazo: 'ready in 10 business days', preco: '$1,190', quero: 'I want this one', comNome: 'Opens as' }
    : { sites: function (n) { return n + (n > 1 ? ' sites' : ' site'); }, abrir: 'Abrir site', paginas: 'páginas', escolha: 'Escolha um site para navegar', ver: 'Ver os sites', plano: 'Este modelo no plano Completo', prazo: 'pronto em 10 dias úteis', preco: 'R$ 1.990', quero: 'Quero este', comNome: 'Abre como' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var lang = en ? 'en' : 'pt';
  var todos = dados.sites.filter(function (s) { return (s.lang || 'pt') === lang; });
  if (!todos.length) todos = dados.sites.filter(function (s) { return (s.lang || 'pt') === 'pt'; });
  var doCat = function (id) { return todos.filter(function (s) { return s.cat === id; }); };
  var nomeCat = function (c) { return en ? (c.en || c.n) : c.n; };
  var pasta = en ? 'sites/en/' : 'sites/';
  var thumb = function (s, cel) { return 'img/sites/' + (en ? 'en/' : '') + s.slug + (cel ? '-mobile' : '') + '.webp'; };
  var thumbPt = function (s, cel) { return 'img/sites/' + s.slug + (cel ? '-mobile' : '') + '.webp'; };
  var imgTag = function (s, cel, extra) {
    return '<img src="' + thumb(s, cel) + '"' + (en ? ' data-reserva="' + thumbPt(s, cel) + '"' : '') + ' width="' + (cel ? 390 : 960) + '" height="' + (cel ? 844 : 600) + '" loading="lazy" ' + (extra || 'alt=""') + '>';
  };
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && img.dataset.reserva) { img.src = img.dataset.reserva; delete img.dataset.reserva; }
  }, true);
  var params = new URLSearchParams(location.search);

  // ---------- personalização (nome, logo, cor principal e secundária) ----------
  // nome e cores seguem pela URL; a logo fica só neste navegador (localStorage), nunca vai para servidor
  var perso = { nome: '', cor: '', cor2: '', logo: false, soLogo: false };
  var HEX = /^#?[0-9a-f]{6}$/i;
  var IMG = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+\/=]+$/i;
  var limpaNome = function (v) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 40); };
  var limpaCor = function (v) { v = String(v || '').trim(); return HEX.test(v) ? v.replace('#', '') : ''; };
  try {
    var g = JSON.parse(sessionStorage.getItem('br-perso') || 'null');
    if (g) perso = { nome: limpaNome(g.nome), cor: limpaCor(g.cor), cor2: limpaCor(g.cor2), logo: g.logo === true, soLogo: g.soLogo === true };
  } catch (e) {}
  var logoImg = '';
  try { logoImg = perso.logo ? (localStorage.getItem('br-perso-logo') || '') : ''; } catch (e) {}
  if (!IMG.test(logoImg)) { logoImg = ''; perso.logo = false; }
  if (params.get('nome')) perso.nome = limpaNome(params.get('nome'));
  ['cor', 'cor2'].forEach(function (k) { if (HEX.test(params.get(k) || '')) perso[k] = params.get(k).replace('#', ''); });
  var guardar = function () { try { sessionStorage.setItem('br-perso', JSON.stringify(perso)); } catch (e) {} };
  var sufixo = function () {
    var q = [];
    if (perso.nome) q.push('nome=' + encodeURIComponent(perso.nome));
    if (perso.cor) q.push('cor=' + perso.cor);
    if (perso.cor2) q.push('cor2=' + perso.cor2);
    return q.length ? '?' + q.join('&') : (perso.logo ? '' : '?limpar=1');
  };
  var url = function (s) { return pasta + s.slug + '/index.html' + sufixo(); };
  var querHref = function (s) { return (en ? 'clinicas-en.html' : 'index.html') + '?modelo=' + encodeURIComponent(s.nome) + (perso.nome ? '&nome=' + encodeURIComponent(perso.nome) : '') + '#contato'; };
  var temPerso = function () { return !!(perso.nome || perso.cor || perso.cor2 || perso.logo); };

  // reduz a imagem para no máximo 480×200 e devolve PNG (mantém transparência), ou WEBP se ficar grande
  function prepararLogo(arquivo, pronto, falhou) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(arquivo.type)) return falhou(en ? 'Use a PNG, JPG, WEBP or SVG image.' : 'Use uma imagem PNG, JPG, WEBP ou SVG.');
    if (arquivo.size > 5 * 1024 * 1024) return falhou(en ? 'The image is larger than 5 MB.' : 'A imagem passa de 5 MB.');
    var leitor = new FileReader();
    leitor.onerror = function () { falhou(en ? 'Could not read this file.' : 'Não consegui ler este arquivo.'); };
    leitor.onload = function () {
      var img = new Image();
      img.onerror = function () { falhou(en ? 'Could not open this image.' : 'Não consegui abrir esta imagem.'); };
      img.onload = function () {
        var w = img.naturalWidth || 480, h = img.naturalHeight || 200;
        var esc = Math.min(1, 480 / w, 200 / h);
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * esc)); c.height = Math.max(1, Math.round(h * esc));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var dado = c.toDataURL('image/png');
        if (dado.length > 350000) dado = c.toDataURL('image/webp', 0.9);
        pronto(dado);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  }

  var painel = document.querySelector('[data-perso]');
  var avisos = [];
  function atualizarLinks() {
    document.querySelectorAll('[data-site-link]').forEach(function (a) {
      var s = todos.filter(function (x) { return x.slug === a.getAttribute('data-site-link'); })[0];
      if (s) a.href = url(s);
    });
    document.querySelectorAll('[data-quero-site]').forEach(function (a) {
      var s = todos.filter(function (x) { return x.slug === a.getAttribute('data-quero-site'); })[0];
      if (s) a.href = querHref(s);
    });
    avisos.forEach(function (f) { f(); });
  }
  if (painel) {
    var campo = painel.querySelector('[data-perso-nome]');
    var arquivo = painel.querySelector('[data-perso-arquivo]');
    var envio = painel.querySelector('[data-perso-envio]');
    var previa = painel.querySelector('[data-perso-logo-img]');
    var opLogo = painel.querySelector('[data-perso-logo-op]');
    var soLogo = painel.querySelector('[data-perso-so-logo]');
    var erro = painel.querySelector('[data-perso-erro]');
    var marcar = function () {
      ['cor', 'cor2'].forEach(function (k) {
        painel.querySelectorAll('[data-perso-' + k + ']').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-perso-' + k) === perso[k]); });
        var livre = painel.querySelector('[data-perso-' + k + '-livre]');
        if (livre && perso[k]) livre.value = '#' + perso[k];
      });
      previa.hidden = !perso.logo; if (perso.logo) previa.src = logoImg;
      envio.classList.toggle('cheio', !!perso.logo);
      opLogo.hidden = !perso.logo; soLogo.checked = !!perso.soLogo;
      painel.classList.toggle('ativo', temPerso());
    };
    var mudou = function () { guardar(); atualizarLinks(); marcar(); };
    campo.value = perso.nome || '';
    campo.addEventListener('input', function () { perso.nome = campo.value.trim().slice(0, 40); mudou(); });
    ['cor', 'cor2'].forEach(function (k) {
      painel.querySelectorAll('[data-perso-' + k + ']').forEach(function (b) {
        b.style.setProperty('--c', '#' + b.getAttribute('data-perso-' + k));
        b.addEventListener('click', function () { var c = b.getAttribute('data-perso-' + k); perso[k] = perso[k] === c ? '' : c; mudou(); });
      });
      var livre = painel.querySelector('[data-perso-' + k + '-livre]');
      if (livre) livre.addEventListener('input', function () { perso[k] = livre.value.replace('#', ''); mudou(); });
    });
    var receber = function (f) {
      if (!f) return;
      erro.textContent = '';
      prepararLogo(f, function (dado) {
        try { localStorage.setItem('br-perso-logo', dado); } catch (e) { erro.textContent = en ? 'Your browser blocked saving the logo. Try a smaller image.' : 'O navegador não deixou guardar a logo. Tente uma imagem menor.'; return; }
        logoImg = dado; perso.logo = true; mudou();
      }, function (msg) { erro.textContent = msg; });
    };
    arquivo.addEventListener('change', function () { receber(arquivo.files[0]); arquivo.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { envio.addEventListener(ev, function (e) { e.preventDefault(); envio.classList.add('arrastando'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { envio.addEventListener(ev, function (e) { e.preventDefault(); envio.classList.remove('arrastando'); }); });
    envio.addEventListener('drop', function (e) { receber(e.dataTransfer.files[0]); });
    soLogo.addEventListener('change', function () { perso.soLogo = soLogo.checked; mudou(); });
    var tirarLogo = function () { perso.logo = false; perso.soLogo = false; logoImg = ''; try { localStorage.removeItem('br-perso-logo'); } catch (e) {} };
    painel.querySelector('[data-perso-tirar]').addEventListener('click', function () { tirarLogo(); mudou(); });
    painel.querySelector('[data-perso-limpar]').addEventListener('click', function () { tirarLogo(); perso.nome = perso.cor = perso.cor2 = ''; campo.value = ''; erro.textContent = ''; mudou(); campo.focus(); });
    marcar();
  }

  var ico = function (n) { return '<svg class="ico" aria-hidden="true"><use href="img/icones.svg#i-' + n + '"/></svg>'; };
  var trocaParam = function (id) {
    try {
      var q = new URLSearchParams(location.search);
      if (id) q.set('c', id); else q.delete('c');
      var t = q.toString();
      history.replaceState(null, '', location.pathname + (t ? '?' + t : ''));
    } catch (e) {}
  };

  // ---------- cartões de categoria + diálogo ----------
  var grade = document.querySelector('[data-categorias]');
  var dlg = document.getElementById('dlg-sites');
  function abrirCategoria(id, origem) {
    var c = dados.categorias.filter(function (x) { return x.id === id; })[0];
    if (!c || !dlg) return;
    var lista = doCat(id);
    dlg.querySelector('[data-dlg-titulo]').textContent = nomeCat(c);
    dlg.querySelector('[data-dlg-sub]').textContent = T.sites(lista.length) + ' · ' + T.escolha;
    dlg.querySelector('[data-dlg-lista]').innerHTML = lista.map(function (s) {
      return '<article class="site-op">' +
        '<a class="site-op-img" data-site-link="' + s.slug + '" href="' + url(s) + '">' + imgTag(s, false, 'alt="' + esc(s.nome) + '"') + imgTag(s, true, 'class="site-op-cel" alt=""') + '</a>' +
        '<div class="site-op-txt"><p class="tipo">' + esc(s.estilo) + '</p><h3>' + esc(s.nome) + ' <span>' + esc(s.sub || '') + '</span></h3><p>' + esc(s.resumo) + '</p>' +
        '<ul class="site-op-rec">' + (s.recursos || []).map(function (r) { return '<li>' + ico('check') + esc(r) + '</li>'; }).join('') + '<li>' + ico('files') + s.paginas + ' ' + T.paginas + '</li></ul>' +
        '<p class="site-op-preco"><span>' + T.plano + '</span><b>' + T.preco + '</b><small>' + T.prazo + '</small></p>' +
        '<p class="site-op-perso" data-perso-aviso hidden></p>' +
        '<div class="site-op-acoes"><a class="btn btn-primary" data-site-link="' + s.slug + '" href="' + url(s) + '">' + T.abrir + ico('arrow-up-right') + '</a><a class="btn btn-ghost" data-quero-site="' + s.slug + '" href="' + querHref(s) + '">' + T.quero + '</a></div></div></article>';
    }).join('');
    avisos = [function () {
      dlg.querySelectorAll('[data-perso-aviso]').forEach(function (p) {
        p.hidden = !temPerso();
        p.innerHTML = T.comNome + (perso.logo && IMG.test(logoImg) ? ' <img src="' + esc(logoImg) + '" alt="">' : '') + ' <b>' + esc(perso.nome || (en ? 'your brand' : 'sua marca')) + '</b>' + (HEX.test(perso.cor) ? ' <i style="background:#' + perso.cor + '"></i>' : '') + (HEX.test(perso.cor2) ? ' <i style="background:#' + perso.cor2 + '"></i>' : '');
      });
    }];
    avisos[0]();
    dlg._origem = origem || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('[data-dlg-lista]').scrollTop = 0;
    trocaParam(id);
  }
  if (dlg) {
    dlg.addEventListener('close', function () {
      trocaParam(null);
      avisos = [];
      if (dlg._origem) dlg._origem.focus();
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-dlg-fechar]')) dlg.close(); });
  }
  if (grade) {
    grade.innerHTML = dados.categorias.map(function (c, i) {
      var lista = doCat(c.id);
      return '<button type="button" class="cat-card" style="--i:' + i + '" data-cat="' + c.id + '">' +
        '<span class="cat-pilha">' + lista.slice(0, 3).map(function (s, k) { return imgTag(s, false, 'alt="" style="--k:' + k + '"'); }).join('') + '</span>' +
        '<span class="cat-txt"><span class="tipo">' + T.sites(lista.length) + '</span><strong>' + esc(nomeCat(c)) + '</strong><span class="cat-nomes">' + lista.map(function (s) { return esc(s.nome); }).join(' · ') + '</span><span class="link">' + T.ver + ico('arrow-right') + '</span></span></button>';
    }).join('');
    grade.querySelectorAll('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { abrirCategoria(b.getAttribute('data-cat'), b); }); });
    var pedida = params.get('c');
    if (pedida) abrirCategoria(pedida);
  }

  // ---------- vitrine (projetos) ----------
  var vit = document.querySelector('[data-vitrine-sites]');
  if (vit) {
    var barraCat = vit.querySelector('[data-v-cats]'), barraSites = vit.querySelector('[data-v-sites]'), palco = vit.querySelector('.vitrine-palco'), frame = palco.querySelector('iframe'), abrirTela = vit.querySelector('[data-v-abrir]');
    var mostrar = function (s) {
      frame.src = url(s); frame.title = s.nome; abrirTela.href = url(s);
      barraSites.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-slug') === s.slug); });
    };
    var categoria = function (id) {
      barraCat.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === id); });
      var lista = doCat(id);
      barraSites.innerHTML = lista.map(function (s) { return '<button type="button" aria-pressed="false" data-slug="' + s.slug + '">' + esc(s.nome) + '</button>'; }).join('');
      barraSites.querySelectorAll('button').forEach(function (b, i) { b.addEventListener('click', function () { mostrar(lista[i]); }); });
      mostrar(lista[0]);
    };
    barraCat.innerHTML = dados.categorias.map(function (c) { return '<button type="button" aria-pressed="false" data-cat="' + c.id + '">' + esc(nomeCat(c)) + ' <small>' + doCat(c.id).length + '</small></button>'; }).join('');
    barraCat.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { categoria(b.getAttribute('data-cat')); }); });
    vit.querySelectorAll('[data-v-disp]').forEach(function (b) {
      b.addEventListener('click', function () {
        vit.querySelectorAll('[data-v-disp]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        palco.setAttribute('data-dispositivo', b.getAttribute('data-v-disp'));
      });
    });
    categoria(dados.categorias[0].id);
  }
})();

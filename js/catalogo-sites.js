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
    : { sites: function (n) { return n + (n > 1 ? ' sites' : ' site'); }, abrir: 'Abrir site', paginas: 'páginas', escolha: 'Escolha um site para navegar', ver: 'Ver os sites', plano: 'Este modelo no plano Completo', prazo: 'pronto em 7 dias úteis', preco: 'R$ 1.490', quero: 'Quero este', comNome: 'Abre como' };
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

  // tira o fundo liso da logo (branco ou de uma cor só) e corta as sobras; foto ou fundo variado fica como está
  function tirarFundo(c) {
    var W = c.width, H = c.height, ctx = c.getContext('2d');
    var d = ctx.getImageData(0, 0, W, H), p = d.data, i, x, y;
    var borda = [];
    for (x = 0; x < W; x++) { borda.push(x, (H - 1) * W + x); }
    for (y = 1; y < H - 1; y++) { borda.push(y * W, y * W + W - 1); }
    var transp = 0, rs = [], gs = [], bs = [];
    borda.forEach(function (k) {
      if (p[k * 4 + 3] < 24) transp++;
      else { rs.push(p[k * 4]); gs.push(p[k * 4 + 1]); bs.push(p[k * 4 + 2]); }
    });
    var mediana = function (a) { a.sort(function (m, n) { return m - n; }); return a[a.length >> 1]; };
    if (transp < borda.length * 0.6) {
      if (rs.length < 8) return c;
      var R = mediana(rs), G = mediana(gs), B = mediana(bs);
      var dist = function (k) { var dr = p[k] - R, dg = p[k + 1] - G, db = p[k + 2] - B; return Math.sqrt(dr * dr + dg * dg + db * db); };
      var iguais = 0;
      borda.forEach(function (k) { if (p[k * 4 + 3] >= 24 && dist(k * 4) < 48) iguais++; });
      if (iguais < (borda.length - transp) * 0.8) return c; // fundo não é liso: mantém
      // inunda a partir das bordas: o que é parecido com o fundo some, a beirada fica suave
      var visto = new Uint8Array(W * H), fila = [];
      borda.forEach(function (k) { if (!visto[k]) { visto[k] = 1; fila.push(k); } });
      while (fila.length) {
        var k = fila.pop(), q = k * 4, dd = dist(q);
        if (p[q + 3] >= 24 && dd > 64) continue;
        p[q + 3] = dd <= 34 ? 0 : Math.round(p[q + 3] * Math.min(1, (dd - 34) / 30));
        x = k % W; y = (k / W) | 0;
        if (x > 0 && !visto[k - 1]) { visto[k - 1] = 1; fila.push(k - 1); }
        if (x < W - 1 && !visto[k + 1]) { visto[k + 1] = 1; fila.push(k + 1); }
        if (y > 0 && !visto[k - W]) { visto[k - W] = 1; fila.push(k - W); }
        if (y < H - 1 && !visto[k + W]) { visto[k + W] = 1; fila.push(k + W); }
      }
      // miolos de letras (o, a, e…) com a mesma cor do fundo também somem
      for (i = 0; i < p.length; i += 4) if (p[i + 3] >= 24 && dist(i) <= 20) p[i + 3] = 0;
      ctx.putImageData(d, 0, 0);
    }
    // corta a área vazia em volta
    var x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    if (x0 === 0 && y0 === 0 && x1 === W - 1 && y1 === H - 1) return c;
    var n = document.createElement('canvas');
    n.width = x1 - x0 + 1; n.height = y1 - y0 + 1;
    n.getContext('2d').drawImage(c, x0, y0, n.width, n.height, 0, 0, n.width, n.height);
    return n;
  }

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
        try { c = tirarFundo(c); } catch (e) {}
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

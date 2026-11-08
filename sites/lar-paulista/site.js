// Lar Paulista · comportamento das páginas. Os dados vêm de dados.js (window.LarPaulista).
(function () {
  'use strict';
  var LP = window.LarPaulista;
  var doc = document, body = doc.body, PAG = body.dataset.pagina || '';
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var brl = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var brl2 = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var abrev = function (v) { return v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil'; };
  var ler = function (k, p) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
  var gravar = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var semAcento = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var dataBR = function (d) { return d.toLocaleDateString('pt-BR'); };
  var horaBR = function (d) { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var wa = function (txt) { if (window.BR_WA) window.BR_WA(txt); };

  // ---------- aviso flutuante ----------
  var tt;
  function toast(msg) {
    var t = $('.toast'); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(tt);
    tt = setTimeout(function () { t.hidden = true; }, 3800);
  }

  // ---------- menu do celular ----------
  var gav = $('#gaveta'), btMenu = $('.cab-menu');
  function fechaGaveta() { if (!gav || gav.hidden) return; gav.hidden = true; btMenu.setAttribute('aria-expanded', 'false'); body.classList.remove('trava'); btMenu.focus(); }
  if (btMenu && gav) {
    btMenu.addEventListener('click', function () { gav.hidden = false; btMenu.setAttribute('aria-expanded', 'true'); body.classList.add('trava'); $('.x', gav).focus(); });
    gav.addEventListener('click', function (e) { if (e.target === gav || e.target.closest('[data-fecha-gaveta]') || e.target.closest('[data-wa]')) fechaGaveta(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaGaveta(); });
  }

  // ---------- favoritos ----------
  var CH_FAV = 'lp-favoritos';
  var favs = function () { return ler(CH_FAV, []); };
  function pintaFavs() {
    var f = favs();
    $$('[data-fav]').forEach(function (b) {
      var on = f.indexOf(b.dataset.fav) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var s = $('span', b); if (s) s.textContent = on ? 'Favorito' : 'Favoritar';
    });
    $$('.n-fav').forEach(function (n) { n.textContent = f.length; n.classList.toggle('zero', !f.length); });
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var f = favs(), c = b.dataset.fav, i = f.indexOf(c);
    if (i >= 0) { f.splice(i, 1); toast('Removido dos favoritos.'); } else { f.push(c); toast('Salvo nos favoritos. Veja todos em Favoritos, no topo.'); }
    gravar(CH_FAV, f); pintaFavs();
    if (PAG === 'busca' && window.__lpBuscaFav) window.__lpBuscaFav();
  });

  // ---------- botões de WhatsApp genéricos também entram na fila de leads ----------
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]'); if (!a || a.hasAttribute('data-wa-imovel') || a.hasAttribute('data-sem-lead')) return;
    var msg = a.getAttribute('data-wa') || '';
    var cod = (msg.match(/LP-\d{4}/) || [])[0];
    LP.registrarLead({ origem: 'WhatsApp do site', imovel: cod, mensagem: msg, interesse: /alugar|locação/i.test(msg) ? 'aluguel' : /anunciar/i.test(msg) ? 'captacao' : null });
  });

  // ---------- card (mesma marcação das páginas geradas) ----------
  var IC = {
    area: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5"/></svg>',
    cama: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 15.5V5.5M2.5 12h15v3.5M17.5 12v-2a2 2 0 0 0-2-2H9v4"/><circle cx="5.6" cy="9.4" r="1.4"/></svg>',
    banho: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 10h15v2a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4zM4.5 10V5.2a2 2 0 0 1 3.7-1.1M6 16l-1 1.6M14 16l1 1.6"/></svg>',
    vaga: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 12.5l1.6-4.6A2 2 0 0 1 7.5 6.5h5a2 2 0 0 1 1.9 1.4l1.6 4.6M3.5 12.5h13v3h-13zM5 15.5v1.5M15 15.5v1.5"/></svg>',
    coracao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>'
  };
  function card(im) {
    var f = im.fotos[0], c = LP.obterCorretor(im.corretor), fv = favs().indexOf(im.cod) >= 0;
    var selos = (im.novo ? '<span class="selo">Novo</span>' : '') + (im.exclusivo ? '<span class="selo selo-latao">Exclusivo</span>' : '');
    var q = im.tipo !== 'Sala comercial'
      ? '<li><b>' + IC.cama + im.quartos + '</b>quarto' + (im.quartos > 1 ? 's' : '') + '</li>'
      : '<li><b>' + IC.cama + (im.andar ? im.andar + 'º' : 'térreo') + '</b>andar</li>';
    return '<li class="card" data-cod="' + im.cod + '"><div class="card-foto"><img src="' + f.mini + '" width="' + f.w + '" height="' + f.h + '" alt="' + esc(im.titulo + ' em ' + im.bairro + ': ' + f.rot.toLowerCase()) + '" loading="lazy" decoding="async">' +
      '<span class="placa' + (im.fin === 'venda' ? '' : ' placa-aluga') + '">' + (im.fin === 'venda' ? 'Vende' : 'Aluga') + '</span><span class="card-selos">' + selos + '</span>' +
      '<span class="card-cod">Cód. ' + im.cod + '</span><span class="card-nfotos">' + im.fotos.length + ' fotos</span>' +
      '<button type="button" class="fav" data-fav="' + im.cod + '" aria-pressed="' + fv + '" aria-label="Favoritar ' + im.cod + '">' + IC.coracao + '</button></div>' +
      '<div class="card-corpo"><span class="card-tipo">' + esc(im.subtipo) + ' · ' + esc(im.bairro) + '</span><h3 class="card-tit"><a href="' + im.url + '">' + esc(im.titulo) + '</a></h3>' +
      '<p class="card-end">' + esc(im.rua) + ' · ' + esc(im.cidade) + '</p><div class="card-preco">' + brl(im.preco) + (im.fin === 'aluguel' ? '<small>/mês</small>' : '') + '</div>' +
      '<div class="card-custos">Condomínio ' + (im.cond ? brl(im.cond) : 'não tem') + ' · IPTU ' + brl(im.iptu) + '</div>' +
      '<ul class="card-dados"><li><b>' + IC.area + im.area + '</b>m²</li>' + q + '<li><b>' + IC.banho + im.banheiros + '</b>banh.</li><li><b>' + IC.vaga + im.vagas + '</b>vaga' + (im.vagas !== 1 ? 's' : '') + '</li></ul>' +
      '<div class="card-pe"><span class="cor-mini"><span class="mono" aria-hidden="true">' + c.iniciais + '</span>' + esc(c.nome.split(' ')[0]) + '</span><span>' + (im.dias === 0 ? 'Publicado hoje' : 'Há ' + im.dias + ' dia' + (im.dias > 1 ? 's' : '')) + '</span></div></div></li>';
  }

  // ---------- validação dos formulários ----------
  function marcaErro(el, msg) {
    var campo = el.closest('.campo, .chk'); if (!campo) return;
    campo.classList.add('erro');
    if (campo.classList.contains('campo')) {
      var m = $('.msg-erro', campo); if (!m) { m = doc.createElement('span'); m.className = 'msg-erro'; campo.appendChild(m); }
      m.textContent = msg;
    }
    el.setAttribute('aria-invalid', 'true');
  }
  function validar(form) {
    var ok = true, primeiro = null;
    $$('.erro', form).forEach(function (c) { c.classList.remove('erro'); var m = $('.msg-erro', c); if (m) m.remove(); });
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $$('input, select, textarea', form).forEach(function (el) {
      if (el.disabled || el.type === 'hidden') return;
      var v = (el.value || '').trim(), msg = '';
      if (el.type === 'checkbox') { if (el.required && !el.checked) msg = 'Marque para continuar.'; }
      else if (el.required && !v) msg = el.tagName === 'SELECT' ? 'Escolha uma opção.' : 'Preencha este campo.';
      else if (v && el.type === 'tel' && v.replace(/\D/g, '').length < 10) msg = 'Informe o número com DDD, ex.: (19) 90000-0000.';
      else if (v && el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'Confira o e-mail.';
      else if (v && el.minLength > 0 && v.length < el.minLength) msg = 'Escreva um pouco mais.';
      else if (v && el.name === 'area' && !(parseFloat(v) > 8)) msg = 'Informe a área em m², ex.: 90.';
      else if (v && el.type === 'date' && el.min && v < el.min) msg = 'Escolha a partir de amanhã.';
      if (msg) { ok = false; marcaErro(el, msg); if (!primeiro) primeiro = el; }
    });
    if (primeiro) primeiro.focus();
    return ok;
  }
  doc.addEventListener('input', function (e) {
    var c = e.target.closest && e.target.closest('.erro'); if (!c) return;
    c.classList.remove('erro'); var m = $('.msg-erro', c); if (m) m.remove(); e.target.removeAttribute('aria-invalid');
  });
  function confirma(form, html) {
    var ok = $('[data-ok]', form); if (!ok) return;
    ok.innerHTML = html; ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus();
  }
  var linhaFila = '<br><a href="leads.html">Demonstração: veja como este contato entrou na fila dos corretores</a>';

  // ---------- menu ativo na busca ----------
  if (PAG === 'busca') {
    var finQ = new URLSearchParams(location.search).get('finalidade');
    $$('[data-menu="comprar"],[data-menu="alugar"]').forEach(function (a) { if ((finQ === 'venda' && a.dataset.menu === 'comprar') || (finQ === 'aluguel' && a.dataset.menu === 'alugar')) a.setAttribute('aria-current', 'page'); });
  }

  // =====================================================================
  // INÍCIO
  // =====================================================================
  if (PAG === 'inicio') (function () {
    var form = $('#busca-rapida'), fcod = $('#busca-codigo'), sel = $('[data-precos]', form);
    var PRECOS = { venda: [300000, 500000, 700000, 900000, 1200000, 1500000, 2000000, 3000000], aluguel: [1500, 2500, 3500, 4500, 6000, 8000, 12000] };
    function precos(fin) { sel.innerHTML = '<option value="">Qualquer valor</option>' + PRECOS[fin].map(function (v) { return '<option value="' + v + '">' + (fin === 'venda' ? abrev(v) : brl(v) + '/mês') + '</option>'; }).join(''); }
    precos('venda');
    $$('[data-aba-busca]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-aba-busca]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        var a = b.dataset.abaBusca;
        if (a === 'codigo') { form.hidden = true; fcod.hidden = false; $('input', fcod).focus(); }
        else { fcod.hidden = true; form.hidden = false; form.finalidade.value = a; precos(a); form.setAttribute('aria-labelledby', b.id); }
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      ['finalidade', 'tipo', 'bairro', 'precoMax', 'quartos'].forEach(function (k) { if (form[k].value) p.set(k, form[k].value); });
      location.href = 'imoveis.html?' + p.toString();
    });
    fcod.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = fcod.codigo.value.trim(), err = $('[data-erro-cod]', fcod), im = LP.obterImovelPorCodigo(v);
      if (!v) { err.textContent = 'Digite o código, ex.: LP-1012.'; err.hidden = false; fcod.codigo.focus(); return; }
      if (!im) { err.textContent = 'Não achamos o código ' + v.toUpperCase() + '. Confira na placa ou no anúncio do portal.'; err.hidden = false; fcod.codigo.focus(); return; }
      location.href = im.url;
    });
    // busca por código no topo (só aparece no celular)
    var ftopo = $('[data-cod-topo]');
    if (ftopo) ftopo.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = ftopo.codigo.value.trim(), err = $('[data-erro-cod-topo]', ftopo), im = v ? LP.obterImovelPorCodigo(v) : null;
      if (!v) { err.textContent = 'Digite o código, ex.: LP-1012.'; err.hidden = false; ftopo.codigo.focus(); return; }
      if (!im) { err.textContent = 'Não achamos o código ' + v.toUpperCase() + '. Confira na placa ou no anúncio do portal.'; err.hidden = false; ftopo.codigo.focus(); return; }
      location.href = im.url;
    });
    var lista = $('[data-destaques]'), ver = $('[data-ver-todos]');
    $$('[data-dest]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-dest]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        var fin = b.dataset.dest, r = LP.buscarImoveis({ finalidade: fin, ordem: 'relevancia', porPagina: 8 });
        lista.innerHTML = r.itens.map(card).join('');
        ver.href = 'imoveis.html?finalidade=' + fin; ver.textContent = 'Ver todos os imóveis ' + (fin === 'venda' ? 'à venda' : 'para alugar');
        pintaFavs();
      });
    });
    ver.href = 'imoveis.html?finalidade=venda';
  })();

  // =====================================================================
  // BUSCA AVANÇADA
  // =====================================================================
  if (PAG === 'busca') (function () {
    var form = $('#form-filtros'), painel = $('#filtros'), lista = $('[data-lista]'), area = $('[data-area-lista]');
    var LISTAS = ['tipo', 'bairro'], BOOL = ['pet', 'mobiliado', 'varanda', 'piscina', 'elevador', 'novo', 'condominioFechado'];
    var NUMS = ['precoMin', 'precoMax', 'condMin', 'condMax', 'iptuMin', 'iptuMax', 'areaMin', 'areaMax'];
    var RADIOS = ['finalidade', 'quartos', 'suites', 'banheiros', 'vagas'];
    var q = new URLSearchParams(location.search);
    var st = { ordem: q.get('ordem') || 'relevancia', pagina: parseInt(q.get('pagina'), 10) || 1, favoritos: q.get('favoritos') === '1', q: q.get('q') || '' };
    // URL -> formulário
    LISTAS.forEach(function (k) { var v = (q.get(k) || '').split(',').filter(Boolean); $$('input[name="' + k + '"]', form).forEach(function (i) { i.checked = v.some(function (x) { return semAcento(x) === semAcento(i.value); }); }); });
    BOOL.forEach(function (k) { form[k].checked = q.get(k) === '1'; });
    NUMS.concat(['codigo', 'cidade', 'corretor']).forEach(function (k) { if (q.get(k)) form[k].value = q.get(k); });
    RADIOS.forEach(function (k) { var v = q.get(k) || ''; $$('input[name="' + k + '"]', form).forEach(function (i) { i.checked = i.value === v; }); });
    $('#ordem').value = st.ordem;
    var vista = ler('lp-vista', 'grade');

    function lerForm() {
      var f = {};
      LISTAS.forEach(function (k) { f[k] = $$('input[name="' + k + '"]:checked', form).map(function (i) { return i.value; }); });
      BOOL.forEach(function (k) { f[k] = form[k].checked; });
      NUMS.forEach(function (k) { var v = form[k].value.replace(/[^\d]/g, ''); f[k] = v ? parseInt(v, 10) : ''; });
      ['codigo', 'cidade', 'corretor'].forEach(function (k) { f[k] = form[k].value.trim(); });
      RADIOS.forEach(function (k) { var r = $('input[name="' + k + '"]:checked', form); f[k] = r ? r.value : ''; });
      return f;
    }
    var ROT = { precoMin: 'Preço a partir de ', precoMax: 'Preço até ', condMin: 'Condomínio a partir de ', condMax: 'Condomínio até ', iptuMin: 'IPTU a partir de ', iptuMax: 'IPTU até ', areaMin: 'Área a partir de ', areaMax: 'Área até ' };
    var ROTB = { pet: 'Aceita pet', mobiliado: 'Mobiliado', varanda: 'Varanda', piscina: 'Piscina', elevador: 'Elevador', novo: 'Novo', condominioFechado: 'Condomínio fechado' };
    function chips(f) {
      var c = [];
      if (f.codigo) c.push(['Código ' + f.codigo.toUpperCase(), function () { form.codigo.value = ''; }]);
      if (st.q) c.push(['Texto: ' + st.q, function () { st.q = ''; }]);
      if (st.favoritos) c.push(['Só meus favoritos', function () { st.favoritos = false; }]);
      if (f.finalidade) c.push([f.finalidade === 'venda' ? 'Comprar' : 'Alugar', function () { $('input[name="finalidade"][value=""]', form).checked = true; }]);
      LISTAS.forEach(function (k) { f[k].forEach(function (v) { c.push([v, function () { $$('input[name="' + k + '"]', form).forEach(function (i) { if (i.value === v) i.checked = false; }); }]); }); });
      if (f.cidade) c.push([f.cidade, function () { form.cidade.value = ''; }]);
      NUMS.forEach(function (k) { if (f[k] !== '') c.push([ROT[k] + (k.indexOf('area') === 0 ? f[k] + ' m²' : brl(f[k])), function () { form[k].value = ''; }]); });
      [['quartos', ' quarto(s) ou mais'], ['suites', ' suíte(s) ou mais'], ['banheiros', ' banheiro(s) ou mais'], ['vagas', ' vaga(s) ou mais']].forEach(function (p) {
        if (f[p[0]]) c.push([f[p[0]] + p[1], function () { $('input[name="' + p[0] + '"][value=""]', form).checked = true; }]);
      });
      BOOL.forEach(function (k) { if (f[k]) c.push([ROTB[k], function () { form[k].checked = false; }]); });
      if (f.corretor) { var co = LP.obterCorretor(f.corretor); c.push(['Corretor: ' + (co ? co.nome : f.corretor), function () { form.corretor.value = ''; }]); }
      return c;
    }
    function resumo(f) {
      var p = [];
      p.push(f.tipo.length ? f.tipo.join(' ou ').toLowerCase() : 'imóvel');
      p.push(f.finalidade === 'aluguel' ? 'para alugar' : f.finalidade === 'venda' ? 'para comprar' : '');
      if (f.bairro.length) p.push('no ' + f.bairro.join(' ou '));
      if (f.quartos) p.push('com ' + f.quartos + '+ quartos');
      if (f.precoMax) p.push('até ' + brl(f.precoMax));
      if (f.pet) p.push('que aceite pet');
      return p.filter(Boolean).join(' ');
    }
    var ultimo = '';
    function render(rolar, forcar) {
      var f = lerForm();
      var chave = JSON.stringify([f, st, vista, st.favoritos ? favs() : 0]);
      if (chave === ultimo && !forcar && !rolar) return; // evita redesenhar à toa (ex.: o change do campo ao clicar num card)
      ultimo = chave;
      var r = LP.buscarImoveis(Object.assign({}, f, { ordem: st.ordem, pagina: st.pagina, porPagina: 12, q: st.q, favoritos: st.favoritos ? favs() : null }));
      st.pagina = r.pagina;
      // contagem e títulos
      $('[data-contagem]').textContent = r.total ? r.total + ' imóve' + (r.total > 1 ? 'is encontrados' : 'l encontrado') : 'Nenhum imóvel encontrado';
      var tit = st.favoritos ? 'Meus imóveis favoritos' : (f.tipo.length === 1 ? f.tipo[0].replace(/^(.)/, function (m) { return m; }) + (f.tipo[0].slice(-1) === 'l' ? '' : 's') : 'Imóveis') + (f.finalidade === 'venda' ? ' à venda' : f.finalidade === 'aluguel' ? ' para alugar' : '') + (f.bairro.length === 1 ? ' no ' + f.bairro[0] : '') + (f.cidade ? ' em ' + f.cidade : (f.bairro.length ? '' : ' em Campinas e região'));
      tit = tit.replace('Sala comercials', 'Salas comerciais').replace('Casa em condomínios', 'Casas em condomínio');
      $('[data-titulo-busca]').textContent = tit;
      $('[data-migalha-busca]').textContent = tit;
      doc.title = tit + ' · Lar Paulista Imóveis';
      // chips
      var cs = chips(f), ch = $('[data-chips]');
      ch.innerHTML = cs.map(function (c, i) { return '<button type="button" class="chip" data-chip="' + i + '" aria-label="Remover filtro: ' + esc(c[0]) + '">' + esc(c[0]) + '<i aria-hidden="true">×</i></button>'; }).join('') + (cs.length > 1 ? '<button type="button" class="chip-limpar" data-limpar>Limpar tudo</button>' : '');
      ch.__acoes = cs.map(function (c) { return c[1]; });
      var nf = cs.length, bn = $('[data-n-filtros]'); bn.textContent = nf ? '(' + nf + ')' : '';
      $$('[data-ver-res]').forEach(function (b) { b.textContent = r.total ? 'Ver ' + r.total + ' imóve' + (r.total > 1 ? 'is' : 'l') : 'Nenhum imóvel'; });
      // lista
      area.classList.toggle('vista-lista', vista === 'lista');
      $$('[data-vista]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.vista === vista ? 'true' : 'false'); });
      if (!r.total) {
        lista.innerHTML = '<li class="vazio-res"><b style="font:700 20px var(--lp-serif);color:var(--lp-verde-esc)">' + (st.favoritos && !favs().length ? 'Você ainda não salvou nenhum imóvel.' : 'Nenhum imóvel com esses filtros agora.') + '</b><p style="margin:6px 0 0">' + (st.favoritos && !favs().length ? 'Toque no coração dos anúncios para guardar aqui.' : 'Tire um filtro ou peça para um corretor avisar quando entrar um assim.') + '</p><div class="linha-bts"><button type="button" class="bt bt-borda" data-limpar>Limpar filtros</button><a class="bt bt-wa" href="#" data-wa="' + esc('Olá, Lar Paulista! Procuro ' + resumo(f) + ' e quero ser avisado quando entrar.') + '">Avisar quando entrar</a></div></li>';
      } else lista.innerHTML = r.itens.map(card).join('');
      // paginação
      var pg = $('[data-paginacao]'), h = '';
      if (r.paginas > 1) {
        h += '<button type="button" data-pg="' + (r.pagina - 1) + '"' + (r.pagina === 1 ? ' disabled' : '') + ' aria-label="Página anterior">‹</button>';
        for (var i = 1; i <= r.paginas; i++) h += '<button type="button" data-pg="' + i + '"' + (i === r.pagina ? ' aria-current="page"' : '') + ' aria-label="Página ' + i + '">' + i + '</button>';
        h += '<button type="button" data-pg="' + (r.pagina + 1) + '"' + (r.pagina === r.paginas ? ' disabled' : '') + ' aria-label="Próxima página">›</button>';
      }
      pg.innerHTML = h;
      $('[data-salvar-busca]').setAttribute('data-wa', 'Olá, Lar Paulista! Quero ser avisado de novos imóveis: ' + resumo(f) + '.');
      // URL
      var p = new URLSearchParams();
      LISTAS.forEach(function (k) { if (f[k].length) p.set(k, f[k].join(',')); });
      BOOL.forEach(function (k) { if (f[k]) p.set(k, '1'); });
      NUMS.concat(['codigo', 'cidade', 'corretor']).concat(RADIOS).forEach(function (k) { if (f[k] !== '' && f[k] != null) p.set(k, f[k]); });
      if (st.ordem !== 'relevancia') p.set('ordem', st.ordem);
      if (st.pagina > 1) p.set('pagina', st.pagina);
      if (st.favoritos) p.set('favoritos', '1');
      if (st.q) p.set('q', st.q);
      history.replaceState(null, '', 'imoveis.html' + (p.toString() ? '?' + p.toString() : ''));
      $$('[data-menu="comprar"],[data-menu="alugar"]').forEach(function (a) { a.toggleAttribute('aria-current', (f.finalidade === 'venda' && a.dataset.menu === 'comprar') || (f.finalidade === 'aluguel' && a.dataset.menu === 'alugar')); if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page'); });
      pintaFavs();
      if (rolar) $('[data-resultados]').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    window.__lpBuscaFav = function () { if (st.favoritos) render(false, true); };
    var tm;
    form.addEventListener('input', function (e) { if (e.target.matches('[data-filtra-bairros]')) return; clearTimeout(tm); st.pagina = 1; tm = setTimeout(render, e.target.classList.contains('inp') && e.target.tagName === 'INPUT' ? 350 : 0); });
    form.addEventListener('change', function (e) { if (e.target.matches('[data-filtra-bairros]')) return; st.pagina = 1; clearTimeout(tm); render(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); render(); fechaPainel(); });
    $('[data-filtra-bairros]').addEventListener('input', function (e) { var v = semAcento(e.target.value); $$('[data-nome-bairro]', form).forEach(function (l) { l.hidden = v && semAcento(l.dataset.nomeBairro).indexOf(v) < 0; }); });
    $('#ordem').addEventListener('change', function (e) { st.ordem = e.target.value; st.pagina = 1; render(); });
    $$('[data-vista]').forEach(function (b) { b.addEventListener('click', function () { vista = b.dataset.vista; gravar('lp-vista', vista); render(); }); });
    function limpar() {
      form.reset(); st.favoritos = false; st.q = ''; st.pagina = 1;
      $$('input[name="finalidade"][value=""], input[name="quartos"][value=""], input[name="suites"][value=""], input[name="banheiros"][value=""], input[name="vagas"][value=""]', form).forEach(function (i) { i.checked = true; });
      $$('[data-nome-bairro]', form).forEach(function (l) { l.hidden = false; });
      render(); toast('Filtros limpos.');
    }
    doc.addEventListener('click', function (e) {
      var c = e.target.closest('[data-chip]');
      if (c) { var fn = $('[data-chips]').__acoes[+c.dataset.chip]; if (fn) fn(); st.pagina = 1; render(); var prox = $('[data-chip]') || $('#t-res'); if (prox && prox.focus) prox.focus(); return; }
      if (e.target.closest('[data-limpar]')) { limpar(); return; }
      var p = e.target.closest('[data-pg]');
      if (p && !p.disabled) { st.pagina = +p.dataset.pg; render(true); }
    });
    // painel do celular
    var btAbre = $('[data-abre-filtros]');
    function abrePainel() { painel.classList.add('aberto'); body.classList.add('trava'); btAbre.setAttribute('aria-expanded', 'true'); painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); $('.x', painel).focus(); }
    function fechaPainel() { if (!painel.classList.contains('aberto')) return; painel.classList.remove('aberto'); body.classList.remove('trava'); btAbre.setAttribute('aria-expanded', 'false'); painel.removeAttribute('role'); painel.removeAttribute('aria-modal'); btAbre.focus(); }
    btAbre.addEventListener('click', abrePainel);
    $$('[data-fecha-filtros]').forEach(function (b) { b.addEventListener('click', function () { fechaPainel(); if (b.hasAttribute('data-ver-res')) $('[data-resultados]').scrollIntoView(); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaPainel(); });
    render();
  })();

  // =====================================================================
  // PÁGINA DO IMÓVEL
  // =====================================================================
  if (PAG === 'imovel') (function () {
    var cod = $('main').dataset.imovel, im = LP.obterImovelPorCodigo(cod);
    var gal = $('.galeria'), fotos = JSON.parse(gal.dataset.fotos), atual = 0;
    var img = $('.gal-princ img', gal);
    function mostra(i) {
      atual = (i + fotos.length) % fotos.length;
      var f = fotos[atual];
      img.src = f.src; img.width = f.w; img.height = f.h; img.alt = im.titulo + ': ' + f.rot.toLowerCase();
      $('[data-gal-rot]').textContent = f.rot; $('[data-gal-n]').textContent = (atual + 1) + ' de ' + fotos.length;
      $$('.gal-mini button', gal).forEach(function (b, k) { b.setAttribute('aria-current', k === atual ? 'true' : 'false'); });
      if (tela && !tela.hidden) pintaTela();
    }
    $('.gal-ant', gal).addEventListener('click', function () { mostra(atual - 1); });
    $('.gal-prox', gal).addEventListener('click', function () { mostra(atual + 1); });
    $$('.gal-mini button', gal).forEach(function (b) { b.addEventListener('click', function () { mostra(+b.dataset.foto); }); });
    function gesto(el) {
      var x0 = null;
      el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) mostra(atual + (dx < 0 ? 1 : -1)); x0 = null; });
    }
    gesto($('.gal-princ', gal));
    // tela cheia
    var tela = null;
    function pintaTela() { var f = fotos[atual], t = $('img', tela); t.src = f.src; t.alt = im.titulo + ': ' + f.rot.toLowerCase(); $('p', tela).textContent = f.rot + ' · ' + (atual + 1) + ' de ' + fotos.length; }
    function abreTela() {
      if (!tela) {
        tela = doc.createElement('div'); tela.className = 'tela-cheia'; tela.setAttribute('role', 'dialog'); tela.setAttribute('aria-modal', 'true'); tela.setAttribute('aria-label', 'Fotos em tela cheia');
        tela.innerHTML = '<button type="button" class="x" aria-label="Fechar fotos">×</button><button type="button" class="gal-seta gal-ant" aria-label="Foto anterior">‹</button><img alt=""><button type="button" class="gal-seta gal-prox" aria-label="Próxima foto">›</button><p></p>';
        body.appendChild(tela);
        tela.addEventListener('click', function (e) {
          if (e.target.closest('.gal-ant')) mostra(atual - 1); else if (e.target.closest('.gal-prox')) mostra(atual + 1);
          else if (e.target === tela || e.target.closest('.x')) fechaTela();
        });
        gesto(tela);
      }
      tela.hidden = false; body.classList.add('trava'); pintaTela(); $('.x', tela).focus();
    }
    function fechaTela() { if (!tela || tela.hidden) return; tela.hidden = true; body.classList.remove('trava'); img.focus && $('.gal-princ img').focus(); }
    img.setAttribute('tabindex', '0'); img.setAttribute('role', 'button'); img.setAttribute('aria-label', 'Abrir fotos em tela cheia');
    img.addEventListener('click', abreTela);
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abreTela(); } });
    doc.addEventListener('keydown', function (e) {
      if (tela && !tela.hidden) { if (e.key === 'Escape') fechaTela(); if (e.key === 'ArrowRight') mostra(atual + 1); if (e.key === 'ArrowLeft') mostra(atual - 1); }
    });
    // corretor escolhido
    var sel = $('[data-escolher-corretor]'), btWa = $('[data-wa-imovel]'), base = btWa.getAttribute('data-wa');
    function corretorAtual() { return sel.value === 'plantao' ? null : LP.obterCorretor(sel.value); }
    function pintaCor() {
      var c = corretorAtual();
      $('[data-cor-mono]').textContent = c ? c.iniciais : 'LP';
      $('[data-cor-nome]').textContent = c ? c.nome : 'Corretor de plantão';
      $('[data-cor-creci]').textContent = c ? c.creci + ' · ' + c.cargo : 'O próximo corretor da fila atende em até 15 minutos';
      btWa.setAttribute('data-wa', base + (c ? ' Prefiro ser atendido(a) por ' + c.nome + '.' : ' Pode ser quem estiver de plantão.'));
    }
    sel.addEventListener('change', pintaCor); pintaCor();
    btWa.addEventListener('click', function () {
      var l = LP.registrarLead({ imovel: cod, origem: 'Site · WhatsApp do imóvel', corretorEscolhido: sel.value, mensagem: btWa.getAttribute('data-wa') });
      toast('Contato enviado para ' + LP.obterCorretor(l.corretor).nome + ' (' + l.via + ').');
    });
    // visita
    var fv = $('[data-form="visita"]');
    fv.addEventListener('submit', function (e) {
      e.preventDefault(); if (!validar(fv)) return;
      var d = fv.dia.value.split('-'), dia = d[2] + '/' + d[1] + '/' + d[0];
      var l = LP.registrarLead({ nome: fv.nome.value.trim(), tel: fv.tel.value.trim(), imovel: cod, origem: 'Site · agendar visita', corretorEscolhido: sel.value, mensagem: 'Visita ' + dia + ' ' + fv.periodo.value });
      var c = LP.obterCorretor(l.corretor);
      confirma(fv, '<b>Pedido de visita recebido.</b>' + esc(c.nome) + ' vai confirmar o horário pelo WhatsApp. Código ' + cod + ', ' + dia + ', ' + esc(fv.periodo.value.toLowerCase()) + '.' + linhaFila);
      wa('Olá! Quero agendar uma visita ao imóvel ' + cod + ', em ' + im.bairro + '.\n• Nome: ' + fv.nome.value.trim() + '\n• Dia: ' + dia + ' (' + fv.periodo.value + ')\n• Serviço: Visita\n• Corretor: ' + c.nome);
    });
    // financiamento
    var sf = $('[data-sim-fin]');
    if (sf) {
      var calc = function () {
        var v = +sf.dataset.valor, ent = +sf.entrada.value, anos = +sf.prazo.value, n = anos * 12, j = Math.pow(1.1149, 1 / 12) - 1;
        var fin = v * (1 - ent / 100), amort = fin / n, p1 = amort + fin * j, pn = amort + amort * j;
        $('[data-ent-txt]', sf).textContent = ent + '% (' + brl(v * ent / 100) + ')';
        $('[data-prazo-txt]', sf).textContent = anos + ' anos';
        $('output', sf).innerHTML = 'Valor financiado: ' + brl(fin) + '<br>1ª parcela: <b>' + brl(p1) + '</b>, caindo até ' + brl(pn) + ' na última.<br>Renda familiar sugerida: a partir de ' + brl(p1 / 0.3) + ' por mês.';
      };
      sf.addEventListener('input', calc); sf.addEventListener('submit', function (e) { e.preventDefault(); }); calc();
    }
    var cp = $('[data-copiar-link]');
    cp.addEventListener('click', function () {
      var ok = function () { toast('Link do imóvel ' + cod + ' copiado.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(ok, function () { toast('Copie o endereço da barra do navegador.'); }); else toast('Copie o endereço da barra do navegador.');
    });
    $('[data-imprimir]').addEventListener('click', function () { window.print(); });
    try { var vis = ler('lp-vistos', []).filter(function (c) { return c !== cod; }); vis.unshift(cod); gravar('lp-vistos', vis.slice(0, 12)); } catch (e) {}
  })();

  // =====================================================================
  // PÁGINA DE BAIRRO
  // =====================================================================
  if (PAG === 'bairro') (function () {
    $$('[data-filtra-bairro]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-filtra-bairro]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        var fin = b.dataset.filtraBairro;
        $$('[data-lista-bairro] .card').forEach(function (c) { var im = LP.obterImovelPorCodigo(c.dataset.cod); c.hidden = !!fin && im.fin !== fin; });
      });
    });
  })();

  // =====================================================================
  // CORRETORES
  // =====================================================================
  if (PAG === 'corretores') (function () {
    var foco = '', bairro = '';
    function aplica() {
      var n = 0;
      $$('[data-lista-cor] .cor-card').forEach(function (c) {
        var f = c.dataset.foco, ok = (!foco || (foco === 'comercial' ? f.indexOf('comercial') >= 0 : f.indexOf(foco) === 0 || f.indexOf('ambos') === 0)) && (!bairro || c.dataset.bairros.split('|').indexOf(bairro) >= 0);
        c.hidden = !ok; if (ok) n++;
      });
      $('[data-n-cor]').textContent = n + ' corretor' + (n !== 1 ? 'es' : '');
      $('[data-vazio-cor]').hidden = n > 0;
    }
    $$('[data-foco-f]').forEach(function (b) { b.addEventListener('click', function () { foco = b.dataset.focoF; $$('[data-foco-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); aplica(); }); });
    $('[data-bairro-f]').addEventListener('change', function (e) { bairro = e.target.value; aplica(); });
    $('[data-limpa-cor]').addEventListener('click', function () { foco = ''; bairro = ''; $('[data-bairro-f]').value = ''; $$('[data-foco-f]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.focoF === '' ? 'true' : 'false'); }); aplica(); });
    aplica();
  })();

  // =====================================================================
  // DISTRIBUIÇÃO DE LEADS
  // =====================================================================
  if (PAG === 'leads') (function () {
    var STC = { 'Novo': 'st-novo', 'Em atendimento': 'st-atend', 'Visita agendada': 'st-visita', 'Proposta': 'st-proposta', 'Negócio fechado': 'st-ok', 'Perdido': 'st-perdido' };
    var cors = LP.obterCorretores(), fSt = '', fCor = '', novoId = null;
    $('[data-filtro-cor]').innerHTML += cors.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('');
    function quando(iso) {
      var d = new Date(iso), min = Math.round((Date.now() - d) / 60000);
      if (min < 1) return 'agora'; if (min < 60) return 'há ' + min + ' min'; if (min < 24 * 60) return 'hoje, ' + horaBR(d);
      return dataBR(d).slice(0, 5) + ', ' + horaBR(d);
    }
    var mascara = function (t) { var d = String(t).replace(/\D/g, ''); return d.length >= 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + '••••-' + d.slice(-4) : t || '—'; };
    function proximo(fila) {
      var n = fila.ordem.length;
      for (var k = 0; k < n; k++) { var id = fila.ordem[(fila.ponteiro + k) % n]; if (fila.fora.indexOf(id) < 0) return id; }
      return null;
    }
    function render() {
      var leads = LP.obterLeads(), fila = LP.obterFila();
      var dia = leads.filter(function (l) { return Date.now() - new Date(l.quando) < 864e5; }).length;
      var novos = leads.filter(function (l) { return l.status === 'Novo'; }).length;
      var vis = leads.filter(function (l) { return l.status === 'Visita agendada' || l.status === 'Proposta' || l.status === 'Negócio fechado'; }).length;
      $('[data-kpis]').innerHTML = '<div class="kpi"><b>' + dia + '</b><span>contatos nas últimas 24 horas</span></div><div class="kpi alerta"><b>' + novos + '</b><span>novos aguardando o corretor</span></div><div class="kpi latao"><b>' + vis + '</b><span>viraram visita ou proposta</span></div><div class="kpi"><b>' + (leads.length ? Math.round(vis / leads.length * 100) : 0) + '%</b><span>taxa de visita</span></div>';
      var px = proximo(fila);
      $('[data-fila]').innerHTML = fila.ordem.map(function (id) {
        var c = LP.obterCorretor(id), fora = fila.fora.indexOf(id) >= 0;
        return '<li class="' + (fora ? 'fora' : id === px ? 'prox' : '') + '"><button type="button" data-tira="' + id + '" style="all:unset;display:flex;align-items:center;gap:8px;cursor:pointer;min-height:44px" aria-pressed="' + !fora + '" aria-label="' + esc(c.nome) + (fora ? ', fora da fila' : ', na fila') + '"><span class="mono">' + c.iniciais + '</span>' + esc(c.nome.split(' ')[0]) + (id === px ? ' <em>próximo</em>' : fora ? ' <em>fora</em>' : '') + '</button></li>';
      }).join('');
      $('[data-prox-txt]').textContent = px ? 'Próximo: ' + LP.obterCorretor(px).nome : 'Fila vazia';
      $('[data-regra]').value = fila.regra; $('[data-sla]').checked = fila.sla !== false;
      var vis2 = leads.filter(function (l) { return (!fSt || l.status === fSt) && (!fCor || l.corretor === fCor); });
      $('[data-tabela-leads]').innerHTML = vis2.length ? vis2.map(function (l) {
        var im = l.imovel ? LP.obterImovelPorCodigo(l.imovel) : null;
        return '<tr data-id="' + l.id + '"' + (l.id === novoId ? ' class="novo"' : '') + '><td style="white-space:nowrap">' + quando(l.quando) + '</td><td><b>' + esc(l.nome) + '</b><br><small style="color:var(--lp-tx3)">' + mascara(l.tel) + '</small></td>' +
          '<td>' + (im ? '<a href="' + im.url + '">' + im.cod + '</a><br><small style="color:var(--lp-tx3)">' + esc(im.subtipo + ' · ' + im.bairro) + '</small>' : '<small>' + (l.interesse === 'captacao' ? 'Captação (quer anunciar)' : 'Contato geral') + '</small>') + '</td>' +
          '<td>' + esc(l.origem) + '</td><td><select data-reatribuir aria-label="Corretor responsável">' + cors.map(function (c) { return '<option value="' + c.id + '"' + (c.id === l.corretor ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select><br><small style="color:var(--lp-tx3)">' + esc(l.via || '') + '</small></td>' +
          '<td><select data-status aria-label="Status do contato">' + LP.STATUS.map(function (s) { return '<option' + (s === l.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><br><span class="st ' + (STC[l.status] || '') + '">' + l.status + '</span></td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px">Nenhum contato com esse filtro.</td></tr>';
      $('[data-tabela-cor]').innerHTML = cors.map(function (c) {
        var m = leads.filter(function (l) { return l.corretor === c.id; }), cnt = function (s) { return m.filter(function (l) { return s.indexOf(l.status) >= 0; }).length; };
        return '<tr><td><span class="cor-mini" style="display:inline-flex;gap:8px;align-items:center"><span class="mono">' + c.iniciais + '</span>' + esc(c.nome) + '</span></td><td class="num">' + m.length + '</td><td class="num">' + cnt(['Novo', 'Em atendimento']) + '</td><td class="num">' + cnt(['Visita agendada']) + '</td><td class="num">' + cnt(['Proposta']) + '</td><td class="num">' + cnt(['Negócio fechado']) + '</td></tr>';
      }).join('');
    }
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tira]');
      if (t) { var f = LP.obterFila(), id = t.dataset.tira, i = f.fora.indexOf(id); if (i >= 0) f.fora.splice(i, 1); else f.fora.push(id); LP.salvarFila(f); render(); toast(LP.obterCorretor(id).nome + (i >= 0 ? ' voltou para a fila.' : ' saiu da fila (folga ou visita externa).')); }
    });
    doc.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr && (e.target.matches('[data-reatribuir]') || e.target.matches('[data-status]'))) {
        var ls = LP.obterLeads(), l = ls.filter(function (x) { return x.id === tr.dataset.id; })[0];
        if (e.target.matches('[data-reatribuir]')) { l.corretor = e.target.value; l.via = 'reatribuído pela gerência'; toast('Contato de ' + l.nome + ' passou para ' + LP.obterCorretor(l.corretor).nome + '.'); }
        else { l.status = e.target.value; toast('Status atualizado: ' + l.status + '.'); }
        LP.salvarLeads(ls); novoId = null; render();
      }
    });
    $('[data-regra]').addEventListener('change', function (e) { var f = LP.obterFila(); f.regra = e.target.value; LP.salvarFila(f); toast('Regra de distribuição alterada.'); render(); });
    $('[data-sla]').addEventListener('change', function (e) { var f = LP.obterFila(); f.sla = e.target.checked; LP.salvarFila(f); });
    $('[data-filtro-st]').addEventListener('change', function (e) { fSt = e.target.value; render(); });
    $('[data-filtro-cor]').addEventListener('change', function (e) { fCor = e.target.value; render(); });
    $('[data-simular-lead]').addEventListener('click', function () {
      var ims = LP.carregarImoveis(), im = ims[Math.floor(Math.random() * ims.length)];
      var orig = LP.ORIGENS[Math.floor(Math.random() * LP.ORIGENS.length)], nome = LP.NOMES[Math.floor(Math.random() * LP.NOMES.length)];
      var l = LP.registrarLead({ nome: nome, tel: '(19) 9' + (7000 + Math.floor(Math.random() * 2999)) + '-' + (1000 + Math.floor(Math.random() * 8999)), imovel: im.cod, origem: orig });
      novoId = l.id; fSt = ''; fCor = ''; $('[data-filtro-st]').value = ''; $('[data-filtro-cor]').value = '';
      render(); toast('Novo contato de ' + nome + ' (' + orig + ', ' + im.cod + ') foi para ' + LP.obterCorretor(l.corretor).nome + '.');
    });
    $('[data-zerar-leads]').addEventListener('click', function () { LP.zerarLeads(); novoId = null; render(); toast('Demonstração reiniciada com os contatos de exemplo.'); });
    render();
  })();

  // =====================================================================
  // PORTAIS DO PROPRIETÁRIO E DO INQUILINO
  // =====================================================================
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var hoje = new Date(2026, 10, 8);
  function competencias(n) { var r = []; for (var i = 1; i <= n; i++) { var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1); r.push({ m: d.getMonth(), a: d.getFullYear(), id: d.getFullYear() + '-' + (d.getMonth() + 1) }); } return r; }
  function abas(painel, nomes, ativa) {
    var bar = '<div class="abas" role="tablist">' + nomes.map(function (n) { return '<button type="button" role="tab" id="aba-' + n[0] + '" aria-controls="pn-' + n[0] + '" aria-selected="' + (n[0] === ativa) + '" data-aba="' + n[0] + '">' + n[1] + '</button>'; }).join('') + '</div>';
    return bar + nomes.map(function (n) { return '<div role="tabpanel" id="pn-' + n[0] + '" aria-labelledby="aba-' + n[0] + '"' + (n[0] === ativa ? '' : ' hidden') + '></div>'; }).join('');
  }
  // no celular, as tabelas dos portais viram cartões: cada célula ganha o nome da coluna
  function rotularTabelas(raiz) {
    $$('table.tabela', raiz).forEach(function (t) {
      var nomes = $$('thead th', t).map(function (th) { return th.textContent.trim(); });
      $$('tbody tr', t).forEach(function (tr) {
        $$('td', tr).forEach(function (td, i) { if (nomes[i] && !td.hasAttribute('data-rot')) td.setAttribute('data-rot', nomes[i]); });
      });
    });
  }
  function vigiarTabelas(painel) {
    rotularTabelas(painel);
    if (window.MutationObserver) new MutationObserver(function () { rotularTabelas(painel); }).observe(painel, { childList: true, subtree: true });
  }
  function ligaAbas(painel, aoTrocar) {
    painel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-aba]'); if (!b) return;
      $$('[data-aba]', painel).forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $$('[role="tabpanel"]', painel).forEach(function (p) { p.hidden = p.id !== 'pn-' + b.dataset.aba; });
      history.replaceState(null, '', '#' + b.dataset.aba);
      if (aoTrocar) aoTrocar(b.dataset.aba);
    });
  }
  function modal(titulo, html) {
    var m = doc.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', titulo);
    m.innerHTML = '<div class="modal-caixa"><button type="button" class="x" aria-label="Fechar">×</button><h2>' + esc(titulo) + '</h2>' + html + '</div>';
    var antes = doc.activeElement;
    var fecha = function () { m.remove(); body.classList.remove('trava'); doc.removeEventListener('keydown', k); if (antes) antes.focus(); };
    var k = function (e) { if (e.key === 'Escape') fecha(); };
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.x') || e.target.closest('[data-fecha-modal]')) fecha(); });
    doc.addEventListener('keydown', k);
    body.appendChild(m); body.classList.add('trava'); $('.x', m).focus();
    return m;
  }
  function documento(nome) {
    return '<p class="demo" style="margin-bottom:12px"><span><b>Documento de exemplo.</b> No site real, abre o PDF guardado no sistema da imobiliária.</span></p><div class="boleto" style="font-family:var(--lp-serif);line-height:1.7"><p style="text-align:center;font-weight:700;margin:0 0 8px">' + esc(nome.toUpperCase()) + '</p><p>Lar Paulista Imóveis Ltda. (exemplo), ' + 'CRECI J-00000 (exemplo), com sede na Rua de Exemplo, 100, Cambuí, Campinas (SP).</p><p>Imóvel: Rua de Exemplo, 210, apto. 52, Cambuí, Campinas (SP). Partes e valores fictícios, apenas para demonstração do portal.</p><p style="margin:0">Campinas, ' + dataBR(hoje) + '.</p></div><p style="margin-top:14px"><button type="button" class="bt bt-borda bt-peq" data-imprimir-doc>Imprimir</button></p>';
  }
  doc.addEventListener('click', function (e) { if (e.target.closest('[data-imprimir-doc]')) window.print(); });

  if (PAG === 'proprietario') (function () {
    var login = $('[data-login]'), painel = $('[data-painel]');
    var IMS = [
      { id: 'a', nome: 'Apartamento · Rua de Exemplo, 210, apto. 52 · Cambuí', aluguel: 4100, inq: 'Mariana C. (inquilina de exemplo)', ini: 'mar/2025', reaj: 'março (IGP-M)', st: 'Alugado' },
      { id: 'b', nome: 'Casa · Rua de Exemplo, 75 · Taquaral', aluguel: 5300, inq: 'Família Ramos (exemplo)', ini: 'ago/2023', reaj: 'agosto (IPCA)', st: 'Alugado' },
      { id: 'c', nome: 'Sala comercial · Rua de Exemplo, 1200, sala 81 · Centro', aluguel: 1900, inq: '—', ini: '—', reaj: '—', st: 'Vago, anunciado' }
    ];
    var COMP = competencias(12);
    var DESP = { '2026-9': [['b', 'Conserto do aquecedor (Hidro Exemplo)', 380]], '2026-6': [['a', 'Troca do sifão da cozinha', 145]], '2026-3': [['b', 'Pintura do muro após chuva', 920]], '2026-1': [['c', 'Condomínio do período vago', 640], ['c', 'IPTU do período vago', 120]] };
    function linhas(c) {
      var l = [];
      IMS.forEach(function (im) {
        if (im.id === 'c' && c.a >= 2026) return; // sala vaga desde janeiro de 2026
        l.push({ im: im.id, d: 'Aluguel recebido', v: im.aluguel });
        l.push({ im: im.id, d: 'Taxa de administração (8%)', v: -Math.round(im.aluguel * 0.08) });
      });
      (DESP[c.id] || []).forEach(function (x) { l.push({ im: x[0], d: x[1], v: -x[2] }); });
      return l;
    }
    var liquido = function (c) { return linhas(c).reduce(function (s, x) { return s + x.v; }, 0); };
    function entrar() {
      login.hidden = true; painel.hidden = false;
      var ult = COMP[0], liq = liquido(ult);
      painel.innerHTML = '<div class="sec-cab" style="margin:0 0 18px"><div><p class="kicker">Portal do proprietário · demonstração</p><h1 style="font-size:32px;margin:0">Olá, Antônio Ribeiro</h1><p>Proprietário de exemplo · 3 imóveis com a Lar Paulista desde 2014</p></div><button type="button" class="bt bt-borda bt-peq" data-sair>Sair</button></div>' +
        '<div class="kpis"><div class="kpi"><b>' + brl(liq) + '</b><span>repasse de ' + MESES[ult.m] + '/' + ult.a + '</span></div><div class="kpi latao"><b>10/' + String(hoje.getMonth() + 1).padStart(2, '0') + '</b><span>próximo repasse, previsto ' + brl(liq) + '</span></div><div class="kpi"><b>2 de 3</b><span>imóveis alugados</span></div><div class="kpi alerta"><b>1</b><span>pendência: assinar aditivo de reajuste</span></div></div>' +
        abas(painel, [['resumo', 'Resumo'], ['extrato', 'Extrato'], ['repasses', 'Repasses'], ['informe', 'Informe de rendimentos'], ['documentos', 'Documentos'], ['solicitacoes', 'Solicitações']], 'resumo');
      // resumo
      $('#pn-resumo').innerHTML = '<div class="grade-cor" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' + IMS.map(function (im) {
        return '<div class="cor-card"><h3 style="font-size:19px">' + esc(im.nome) + '</h3><span class="st ' + (im.st === 'Alugado' ? 'st-ok' : 'st-novo') + '" style="align-self:flex-start">' + im.st + '</span><ul class="lista-info" style="margin:0"><li><b>Aluguel</b><span>' + brl(im.aluguel) + '</span></li><li><b>Inquilino</b><span>' + esc(im.inq) + '</span></li><li><b>Início</b><span>' + im.ini + '</span></li><li><b>Reajuste</b><span>' + im.reaj + '</span></li></ul>' +
          (im.id === 'c' ? '<a class="bt bt-borda bt-peq" href="imoveis.html?tipo=Sala%20comercial&finalidade=aluguel">Ver anúncio no site</a>' : '') + '</div>';
      }).join('') + '</div><div class="bloco" style="margin-top:18px"><h3>Pendências</h3><ul class="pontos"><li>Assinar o aditivo de reajuste da casa do Taquaral (assinatura eletrônica). <button type="button" class="lnk" data-assinar>Assinar agora</button></li></ul></div>';
      // extrato
      $('#pn-extrato').innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:14px"><label class="campo"><span>Competência</span><select class="inp" data-comp>' + COMP.map(function (c) { return '<option value="' + c.id + '">' + MESES[c.m] + '/' + c.a + '</option>'; }).join('') + '</select></label><label class="campo"><span>Imóvel</span><select class="inp" data-im-ext><option value="">Todos os imóveis</option>' + IMS.map(function (i) { return '<option value="' + i.id + '">' + esc(i.nome.split(' · ').slice(0, 2).join(' · ')) + '</option>'; }).join('') + '</select></label><button type="button" class="bt bt-borda" data-imprimir-ext>Imprimir extrato</button></div><div class="painel"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Imóvel</th><th>Lançamento</th><th class="num">Valor</th></tr></thead><tbody data-ext></tbody></table></div></div>';
      function pintaExt() {
        var c = COMP.filter(function (x) { return x.id === $('[data-comp]').value; })[0], f = $('[data-im-ext]').value;
        var l = linhas(c).filter(function (x) { return !f || x.im === f; }), tot = l.reduce(function (s, x) { return s + x.v; }, 0);
        $('[data-ext]').innerHTML = l.map(function (x) { var im = IMS.filter(function (i) { return i.id === x.im; })[0]; return '<tr><td>' + esc(im.nome.split(' · ')[0] + ' · ' + im.nome.split(' · ').pop()) + '</td><td>' + esc(x.d) + '</td><td class="num" style="color:' + (x.v < 0 ? 'var(--lp-tijolo)' : 'var(--lp-ok)') + '">' + (x.v < 0 ? '−' : '') + brl(Math.abs(x.v)) + '</td></tr>'; }).join('') +
          '<tr><td colspan="2"><b>Valor líquido repassado em 10/' + String(c.m + 2 > 12 ? 1 : c.m + 2).padStart(2, '0') + '</b></td><td class="num"><b>' + brl(tot) + '</b></td></tr>';
      }
      $('[data-comp]').addEventListener('change', pintaExt); $('[data-im-ext]').addEventListener('change', pintaExt); pintaExt();
      $('[data-imprimir-ext]').addEventListener('click', function () { window.print(); });
      // repasses + gráfico
      var max = Math.max.apply(null, COMP.map(liquido));
      $('#pn-repasses').innerHTML = '<div class="painel" style="margin-bottom:18px"><div class="painel-cab"><h3>Repasses dos últimos 12 meses</h3></div><div class="painel-corpo"><div role="img" aria-label="Gráfico de barras dos repasses mensais" style="display:flex;align-items:flex-end;gap:6px;height:180px;border-bottom:1px solid var(--lp-linha)">' +
        COMP.slice().reverse().map(function (c) { var v = liquido(c); return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><span style="font-size:11px;color:var(--lp-tx3)">' + Math.round(v / 100) / 10 + 'k</span><i style="display:block;width:100%;max-width:38px;height:' + Math.round(v / max * 140) + 'px;background:var(--lp-verde);border-radius:2px 2px 0 0"></i></div>'; }).join('') +
        '</div><div style="display:flex;gap:6px">' + COMP.slice().reverse().map(function (c) { return '<span style="flex:1;text-align:center;font-size:12px;color:var(--lp-tx3)">' + MESES[c.m] + '</span>'; }).join('') + '</div></div></div>' +
        '<div class="painel"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Competência</th><th>Pago em</th><th>Conta</th><th class="num">Valor</th><th>Situação</th></tr></thead><tbody>' +
        '<tr><td>' + MESES[hoje.getMonth() - 0 > 0 ? hoje.getMonth() - 1 : 11] + '/' + hoje.getFullYear() + '</td><td>10/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear() + ' (agendado)</td><td>Banco Exemplo · ag. 0001 · c/c ••••7</td><td class="num">' + brl(liquido(COMP[0])) + '</td><td><span class="st st-novo">Agendado</span></td></tr>' +
        COMP.slice(1).map(function (c) { var d = new Date(c.a, c.m + 1, 10); return '<tr><td>' + MESES[c.m] + '/' + c.a + '</td><td>' + dataBR(d) + '</td><td>Banco Exemplo · ag. 0001 · c/c ••••7</td><td class="num">' + brl(liquido(c)) + '</td><td><span class="st st-ok">Pago</span></td></tr>'; }).join('') + '</tbody></table></div></div>';
      // informe
      $('#pn-informe').innerHTML = '<p>Informe anual para a declaração do Imposto de Renda. Valores de exemplo.</p><div style="display:flex;gap:10px;align-items:end;margin-bottom:14px;flex-wrap:wrap"><label class="campo"><span>Ano-calendário</span><select class="inp" data-ano><option>2025</option><option>2024</option></select></label><button type="button" class="bt" data-imprimir-inf>Baixar em PDF (imprimir)</button></div><div class="painel"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Imóvel</th><th class="num">Aluguéis recebidos</th><th class="num">Taxa de administração</th><th class="num">Líquido</th></tr></thead><tbody data-inf></tbody></table></div></div><p style="font-size:14.5px;color:var(--lp-tx3);margin-top:10px">Aluguel pago por pessoa física entra no carnê-leão; a taxa de administração pode ser deduzida. Confirme com o seu contador.</p>';
      function pintaInf() {
        var ano = +$('[data-ano]').value, t = [0, 0];
        $('[data-inf]').innerHTML = IMS.map(function (im) {
          var meses = im.id === 'c' ? 12 : 12, base = im.aluguel * (ano === 2024 ? 0.93 : 0.97), bruto = Math.round(base * meses), tx = Math.round(bruto * 0.08);
          t[0] += bruto; t[1] += tx;
          return '<tr><td>' + esc(im.nome) + '</td><td class="num">' + brl(bruto) + '</td><td class="num">' + brl(tx) + '</td><td class="num">' + brl(bruto - tx) + '</td></tr>';
        }).join('') + '<tr><td><b>Total ' + ano + '</b></td><td class="num"><b>' + brl(t[0]) + '</b></td><td class="num"><b>' + brl(t[1]) + '</b></td><td class="num"><b>' + brl(t[0] - t[1]) + '</b></td></tr>';
      }
      $('[data-ano]').addEventListener('change', pintaInf); pintaInf();
      $('[data-imprimir-inf]').addEventListener('click', function () { window.print(); });
      // documentos
      var DOCS = ['Contrato de administração', 'Contrato de locação · Cambuí', 'Laudo de vistoria de entrada · Cambuí', 'Contrato de locação · Taquaral', 'Apólice de seguro incêndio 2026', 'Carnê do IPTU 2026 · Centro'];
      $('#pn-documentos').innerHTML = '<ul class="log">' + DOCS.map(function (d, i) { return '<li style="align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>' + esc(d) + '</b><br><small style="color:var(--lp-tx3)">PDF · atualizado em ' + dataBR(new Date(2026, 9 - i, 3 + i)) + '</small></span><button type="button" class="bt bt-borda bt-peq" data-doc="' + esc(d) + '">Abrir</button></li>'; }).join('') + '</ul>';
      // solicitações
      var sols = ler('lp-sol-prop', [{ p: '2026-0412', a: 'Autorizar orçamento de pintura', s: 'Concluída', d: '14/03/2026' }, { p: '2026-0877', a: 'Dúvida sobre o reajuste', s: 'Respondida', d: '02/08/2026' }]);
      function pintaSol() { $('[data-sols]').innerHTML = sols.map(function (s) { return '<tr><td>' + s.p + '</td><td>' + esc(s.a) + '</td><td>' + s.d + '</td><td><span class="st ' + (s.s === 'Aberta' ? 'st-novo' : 'st-ok') + '">' + s.s + '</span></td></tr>'; }).join(''); }
      $('#pn-solicitacoes').innerHTML = '<div class="duas-col"><form class="bloco" data-form="sol" novalidate><h3>Nova solicitação</h3><div class="form-grade"><label class="campo"><span>Assunto</span><select name="assunto" required><option value="">Escolha</option><option>Autorizar orçamento de reparo</option><option>Dúvida sobre extrato ou repasse</option><option>Alterar conta bancária</option><option>Quero vender um dos imóveis</option><option>Outro assunto</option></select></label><label class="campo"><span>Mensagem</span><textarea name="msg" required minlength="5"></textarea></label><button class="bt" type="submit">Enviar solicitação</button></div><div class="ok-caixa" data-ok hidden></div></form>' +
        '<div class="painel"><div class="painel-cab"><h3>Minhas solicitações</h3></div><div class="tabela-rolo"><table class="tabela" style="min-width:460px"><thead><tr><th>Protocolo</th><th>Assunto</th><th>Data</th><th>Situação</th></tr></thead><tbody data-sols></tbody></table></div></div></div>';
      pintaSol();
      var fs = $('[data-form="sol"]');
      fs.addEventListener('submit', function (e) {
        e.preventDefault(); if (!validar(fs)) return;
        var p = '2026-' + (1000 + Math.floor(Math.random() * 8999)); sols.unshift({ p: p, a: fs.assunto.value, s: 'Aberta', d: dataBR(new Date()) }); gravar('lp-sol-prop', sols); pintaSol();
        confirma(fs, '<b>Solicitação ' + p + ' aberta.</b>A administração responde em até 1 dia útil. (Demonstração: nada foi enviado.)'); fs.reset();
      });
      ligaAbas(painel); vigiarTabelas(painel);
      var h = location.hash.slice(1); if (h && $('[data-aba="' + h + '"]', painel)) $('[data-aba="' + h + '"]', painel).click();
    }
    painel.addEventListener('click', function (e) {
      if (e.target.closest('[data-sair]')) { painel.hidden = true; login.hidden = false; history.replaceState(null, '', location.pathname); $('[data-entrar]').focus(); }
      var d = e.target.closest('[data-doc]'); if (d) modal(d.dataset.doc, documento(d.dataset.doc));
      if (e.target.closest('[data-assinar]')) { var m = modal('Assinatura eletrônica', '<p>No site real, abre a assinatura eletrônica (ex.: Clicksign, D4Sign, Autentique) com o aditivo já preenchido.</p>' + documento('Aditivo de reajuste') + '<p><button type="button" class="bt" data-fecha-modal>Entendi</button></p>'); }
    });
    $('[data-entrar]').addEventListener('click', function () { entrar(); sessionStorage.setItem('lp-prop', '1'); });
    try { if (sessionStorage.getItem('lp-prop') === '1' || location.hash) entrar(); } catch (e) {}
  })();

  if (PAG === 'inquilino') (function () {
    var login = $('[data-login]'), painel = $('[data-painel]');
    var AL = 4100, CO = 1180, IP = 290, TOT = AL + CO + IP;
    function linhaDig(v, venc) {
      var c = String(Math.round(v * 100)).padStart(10, '0'), f = String(Math.round((venc - new Date(1997, 9, 7)) / 864e5) % 10000).padStart(4, '0');
      return '00000.00000 01234.567898 00000.000000 0 ' + f + c;
    }
    function boleto(venc, pagarEm) {
      var atraso = pagarEm ? Math.max(0, Math.round((pagarEm - venc) / 864e5)) : 0;
      var multa = atraso ? TOT * 0.02 : 0, juros = atraso ? TOT * 0.01 / 30 * atraso : 0, total = TOT + multa + juros;
      return '<p class="demo" style="margin-bottom:12px"><span><b>Boleto de exemplo, não pague.</b> No site real, a 2ª via vem do banco ou do sistema da imobiliária, com código válido.</span></p>' +
        '<div class="boleto"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><b>Banco Exemplo | 000-0</b><span>Vencimento: <b>' + dataBR(pagarEm && atraso ? pagarEm : venc) + '</b></span></div>' +
        '<p style="margin:8px 0">Beneficiário: Lar Paulista Imóveis Ltda. (exemplo) · Pagador: Mariana Carvalho (exemplo)</p>' +
        '<table class="custos"><tr><td>Aluguel</td><td>' + brl2(AL) + '</td></tr><tr><td>Condomínio</td><td>' + brl2(CO) + '</td></tr><tr><td>IPTU (parcela)</td><td>' + brl2(IP) + '</td></tr>' + (atraso ? '<tr><td>Multa (2%)</td><td>' + brl2(multa) + '</td></tr><tr><td>Juros (' + atraso + ' dias)</td><td>' + brl2(juros) + '</td></tr>' : '') + '<tr class="total"><td>Total</td><td>' + brl2(total) + '</td></tr></table>' +
        '<div class="linha-dig" data-linha>' + linhaDig(total, venc) + '</div><div class="barras" aria-hidden="true"></div>' +
        '<p style="margin:10px 0 6px;font-weight:700">Pix copia e cola</p><div class="linha-dig" data-pix>00020126580014BR.GOV.BCB.PIX0136exemplo-larpaulista-nao-pague5204000053039865406' + total.toFixed(2) + '5802BR6008CAMPINAS62070503***6304ABCD</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" class="bt" data-copiar="[data-linha]">Copiar código de barras</button><button type="button" class="bt bt-borda" data-copiar="[data-pix]">Copiar Pix</button><button type="button" class="bt bt-borda" data-imprimir-doc>Imprimir</button></div>';
    }
    function entrar() {
      login.hidden = true; painel.hidden = false;
      var venc = new Date(2026, 11, 5);
      painel.innerHTML = '<div class="sec-cab" style="margin:0 0 18px"><div><p class="kicker">Portal do inquilino · demonstração</p><h1 style="font-size:32px;margin:0">Olá, Mariana</h1><p>Inquilina de exemplo · Apartamento na Rua de Exemplo, 210, apto. 52, Cambuí</p></div><button type="button" class="bt bt-borda bt-peq" data-sair>Sair</button></div>' +
        '<div class="kpis"><div class="kpi latao"><b>' + brl(TOT) + '</b><span>próximo boleto, vence ' + dataBR(venc) + '</span></div><div class="kpi"><b>Em dia</b><span>novembro pago em 04/11</span></div><div class="kpi"><b>16 de 30</b><span>meses de contrato</span></div><div class="kpi"><b>mar/2027</b><span>próximo reajuste (IGP-M)</span></div></div>' +
        abas(painel, [['boletos', 'Boletos e 2ª via'], ['historico', 'Pagamentos'], ['contrato', 'Contrato'], ['documentos', 'Documentos'], ['manutencao', 'Manutenção']], 'boletos');
      $('#pn-boletos').innerHTML = '<div class="duas-col"><div class="painel"><div class="painel-cab"><h3>Boletos</h3></div><div class="tabela-rolo"><table class="tabela" style="min-width:460px"><thead><tr><th>Mês</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>' +
        '<tr><td>dez/2026</td><td>05/12/2026</td><td class="num">' + brl(TOT) + '</td><td><span class="st st-novo">Em aberto</span></td><td><button type="button" class="bt bt-peq" data-2via>2ª via</button></td></tr>' +
        '<tr><td>nov/2026</td><td>05/11/2026</td><td class="num">' + brl(TOT) + '</td><td><span class="st st-ok">Pago em 04/11</span></td><td><button type="button" class="bt bt-borda bt-peq" data-recibo="nov/2026">Recibo</button></td></tr>' +
        '<tr><td>out/2026</td><td>05/10/2026</td><td class="num">' + brl(TOT) + '</td><td><span class="st st-ok">Pago em 05/10</span></td><td><button type="button" class="bt bt-borda bt-peq" data-recibo="out/2026">Recibo</button></td></tr></tbody></table></div></div>' +
        '<div class="bloco" style="margin:0"><h3>Vai pagar depois do vencimento?</h3><p>Escolha a data e a 2ª via já sai com multa de 2% e juros de 1% ao mês, como no contrato de exemplo.</p><label class="campo"><span>Data em que vou pagar</span><input type="date" class="inp" data-pagar-em min="2026-12-05" value="2026-12-09"></label><button type="button" class="bt bt-borda" style="margin-top:12px" data-2via-data>Gerar 2ª via para esta data</button></div></div>';
      $('#pn-historico').innerHTML = '<div class="painel"><div class="tabela-rolo"><table class="tabela"><thead><tr><th>Mês</th><th>Vencimento</th><th>Pago em</th><th class="num">Valor</th><th>Forma</th></tr></thead><tbody>' +
        competencias(12).map(function (c, i) { var v = new Date(c.a, c.m, 5), p = new Date(c.a, c.m, i === 6 ? 7 : 4 + (i % 2)); return '<tr><td>' + MESES[c.m] + '/' + c.a + '</td><td>' + dataBR(v) + '</td><td>' + dataBR(p) + (i === 6 ? ' <span class="st st-novo">2 dias de atraso</span>' : '') + '</td><td class="num">' + brl(TOT + (i === 6 ? Math.round(TOT * 0.0207) : 0) - (c.a === 2025 && c.m < 2 ? 140 : 0)) + '</td><td>' + (i % 3 ? 'Pix' : 'Boleto') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      $('#pn-contrato').innerHTML = '<div class="duas-col"><div class="bloco" style="margin:0"><ul class="lista-info" style="margin:0"><li><b>Imóvel</b><span>Rua de Exemplo, 210, apto. 52, Cambuí, Campinas</span></li><li><b>Início</b><span>01/03/2025</span></li><li><b>Prazo</b><span>30 meses, até 31/08/2027</span></li><li><b>Aluguel</b><span>' + brl(AL) + ' + condomínio + IPTU</span></li><li><b>Reajuste</b><span>Anual, pelo IGP-M, em março</span></li><li><b>Garantia</b><span>Seguro fiança (exemplo de seguradora)</span></li><li><b>Vencimento</b><span>Todo dia 5</span></li></ul></div><div class="bloco" style="margin:0"><h3>Quero sair do imóvel</h3><p>O aviso deve ser dado com 30 dias de antecedência. Depois de 12 meses, não há multa proporcional no contrato de exemplo.</p><a class="bt bt-borda" href="#" data-wa="Olá, Lar Paulista! Sou inquilina do apto. 52 da Rua de Exemplo, 210 (Cambuí) e quero informações sobre a entrega do imóvel.">Falar sobre a entrega das chaves</a></div></div>';
      var DOCS = ['Contrato de locação assinado', 'Laudo de vistoria de entrada (com 86 fotos)', 'Apólice do seguro fiança', 'Regulamento interno do condomínio', 'Recibo de entrega das chaves'];
      $('#pn-documentos').innerHTML = '<ul class="log">' + DOCS.map(function (d) { return '<li style="align-items:center;justify-content:space-between;flex-wrap:wrap"><b>' + esc(d) + '</b><button type="button" class="bt bt-borda bt-peq" data-doc="' + esc(d) + '">Abrir</button></li>'; }).join('') + '</ul>';
      var chs = ler('lp-chamados', [{ p: 'M-2026-0311', c: 'Hidráulica', d: 'Torneira do banheiro pingando', u: 'Média', s: 'Concluído', data: '18/09/2026' }]);
      $('#pn-manutencao').innerHTML = '<div class="duas-col"><form class="bloco" data-form="manut" novalidate style="margin:0"><h3>Pedir manutenção</h3><div class="form-grade">' +
        '<label class="campo"><span>Tipo de problema</span><select name="cat" required><option value="">Escolha</option><option>Hidráulica (vazamento, entupimento)</option><option>Elétrica</option><option>Portão, fechadura ou interfone</option><option>Infiltração ou umidade</option><option>Aquecedor ou ar-condicionado do imóvel</option><option>Outro</option></select></label>' +
        '<label class="campo"><span>Descreva o que aconteceu</span><textarea name="desc" required minlength="10" placeholder="Ex.: mancha de umidade no teto do quarto, aumentou depois da chuva."></textarea></label>' +
        '<fieldset class="fgrupo" style="border:0;padding:0"><legend class="rot-campo">Urgência</legend><div class="fbotoes"><label><input type="radio" name="urg" value="Baixa"><span>Baixa</span></label><label><input type="radio" name="urg" value="Média" checked><span>Média</span></label><label><input type="radio" name="urg" value="Urgente"><span>Urgente</span></label></div><small style="color:var(--lp-tx3)">Urgente: vazamento ativo, falta de energia ou porta que não fecha.</small></fieldset>' +
        '<label class="campo"><span>Melhor período para o técnico</span><select name="periodo"><option>Manhã</option><option>Tarde</option><option>Qualquer horário</option></select></label>' +
        '<label class="campo"><span>Fotos (opcional)</span><input type="file" name="fotos" accept="image/*" multiple></label><small style="color:var(--lp-tx3);margin-top:-8px">Na demonstração, as fotos não saem do seu aparelho.</small>' +
        '<button class="bt" type="submit">Abrir chamado</button></div><div class="ok-caixa" data-ok hidden></div></form>' +
        '<div class="painel"><div class="painel-cab"><h3>Meus chamados</h3></div><div class="painel-corpo" data-chamados></div></div></div>';
      function pintaCh() {
        $('[data-chamados]').innerHTML = chs.map(function (c) {
          var etapas = ['Aberto', 'Em análise', 'Técnico agendado', 'Concluído'], at = etapas.indexOf(c.s);
          return '<div style="border-bottom:1px solid var(--lp-linha);padding:10px 0"><b>' + c.p + ' · ' + esc(c.c) + '</b> <span class="st ' + (c.s === 'Concluído' ? 'st-ok' : c.u === 'Urgente' ? 'st-erro' : 'st-novo') + '">' + c.s + '</span><p style="margin:4px 0;color:var(--lp-tx2)">' + esc(c.d) + '</p><div class="progresso" aria-label="Andamento: ' + c.s + '"><i style="width:' + ((at + 1) / 4 * 100) + '%"></i></div><small style="color:var(--lp-tx3)">' + etapas.join(' → ') + ' · aberto em ' + c.data + ' · urgência ' + c.u.toLowerCase() + '</small></div>';
        }).join('');
      }
      pintaCh();
      var fm = $('[data-form="manut"]');
      fm.addEventListener('submit', function (e) {
        e.preventDefault(); if (!validar(fm)) return;
        var urg = $('input[name="urg"]:checked', fm).value, p = 'M-2026-' + (1000 + Math.floor(Math.random() * 8999));
        chs.unshift({ p: p, c: fm.cat.value.split(' (')[0], d: fm.desc.value.trim(), u: urg, s: 'Aberto', data: dataBR(new Date()) }); gravar('lp-chamados', chs); pintaCh();
        confirma(fm, '<b>Chamado ' + p + ' aberto.</b>' + (urg === 'Urgente' ? 'Por ser urgente, a administração liga em até 2 horas.' : 'A administração agenda o técnico em até 2 dias úteis.') + ' (Demonstração: nada foi enviado.)'); fm.reset();
      });
      ligaAbas(painel); vigiarTabelas(painel);
      var h = location.hash.slice(1); if (h && $('[data-aba="' + h + '"]', painel)) $('[data-aba="' + h + '"]', painel).click();
    }
    painel.addEventListener('click', function (e) {
      if (e.target.closest('[data-sair]')) { painel.hidden = true; login.hidden = false; history.replaceState(null, '', location.pathname); $('[data-entrar]').focus(); return; }
      if (e.target.closest('[data-2via]')) modal('2ª via do boleto · dez/2026', boleto(new Date(2026, 11, 5)));
      if (e.target.closest('[data-2via-data]')) { var v = $('[data-pagar-em]').value.split('-'); modal('2ª via com nova data', boleto(new Date(2026, 11, 5), new Date(+v[0], +v[1] - 1, +v[2]))); }
      var r = e.target.closest('[data-recibo]'); if (r) modal('Recibo de ' + r.dataset.recibo, documento('Recibo de aluguel ' + r.dataset.recibo));
      var d = e.target.closest('[data-doc]'); if (d) modal(d.dataset.doc, documento(d.dataset.doc));
    });
    doc.addEventListener('click', function (e) {
      var c = e.target.closest('[data-copiar]'); if (!c) return;
      var t = $(c.dataset.copiar).textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Código copiado (exemplo, não pague).'); }, function () { toast('Selecione e copie o código.'); }); else toast('Selecione e copie o código.');
    });
    $('[data-entrar]').addEventListener('click', function () { entrar(); sessionStorage.setItem('lp-inq', '1'); });
    try { if (sessionStorage.getItem('lp-inq') === '1' || location.hash) entrar(); } catch (e) {}
  })();

  // =====================================================================
  // INTEGRAÇÃO
  // =====================================================================
  if (PAG === 'integracao') (function () {
    var st = ler('lp-integ', null);
    if (!st) st = { total: 612, publicados: 598, atualizados: 37, novos: 6, removidos: 4, ultima: Date.now() - 23 * 60000, log: [] };
    var ERROS = [['LP-1088', 'Sem foto de capa', 'Incluir ao menos 1 foto no Jetimob e marcar como capa'], ['LP-1102', 'Bairro "Cambui" não reconhecido', 'Corrigir para "Cambuí" no cadastro'], ['LP-1121', 'Preço de locação zerado', 'Informar o valor ou marcar "sob consulta"']];
    if (st.erros == null) st.erros = ERROS.length;
    if (!st.log.length) {
      for (var i = 0; i < 8; i++) st.log.push({ t: st.ultima - i * 3600e3, txt: (i === 0 ? 'Leitura concluída: ' : 'Leitura concluída: ') + (612 - (i % 3)) + ' imóveis no XML, ' + (2 + (i * 3) % 7) + ' atualizados' + (i === 2 ? ', 1 novo (LP-1063)' : '') + (i === 5 ? ', 2 removidos (vendido/alugado)' : '') + '.', ok: i !== 6 });
      st.log[6].txt = 'Feed indisponível por 2 minutos; nova tentativa automática concluída às ' + horaBR(new Date(st.ultima - 6 * 3600e3 + 120000)) + '.';
    }
    function salvar() { gravar('lp-integ', st); }
    function render() {
      $('[data-ultima]').textContent = dataBR(new Date(st.ultima)) + ', ' + horaBR(new Date(st.ultima)) + ' (há ' + Math.max(1, Math.round((Date.now() - st.ultima) / 60000)) + ' min)';
      $('[data-proxima]').textContent = horaBR(new Date(st.ultima + 3600e3));
      $('[data-kpis-int]').innerHTML = [['total', 'imóveis no XML do sistema'], ['publicados', 'publicados no site'], ['atualizados', 'atualizados hoje'], ['novos', 'novos hoje'], ['removidos', 'saíram (vendidos ou alugados)'], ['erros', 'com erro no cadastro']].map(function (k) {
        return '<div class="kpi' + (k[0] === 'erros' && st.erros ? ' alerta' : k[0] === 'novos' ? ' latao' : '') + '"><b>' + st[k[0]] + '</b><span>' + k[1] + '</span></div>';
      }).join('');
      var er = ERROS.slice(0, st.erros);
      $('[data-erros]').innerHTML = er.length ? er.map(function (e) { return '<tr><td><b>' + e[0] + '</b></td><td>' + esc(e[1]) + '</td><td>' + esc(e[2]) + '</td></tr>'; }).join('') : '<tr><td colspan="3">Nenhum erro na última leitura.</td></tr>';
      $('[data-n-erros]').textContent = er.length + ' erro' + (er.length !== 1 ? 's' : '');
      $('[data-n-erros]').className = 'st ' + (er.length ? 'st-erro' : 'st-ok');
      var P = [['ZAP Imóveis', 584, 'ok'], ['Viva Real', 584, 'ok'], ['OLX', 512, 'ok'], ['Imovelweb', 430, '3 recusados: fotos abaixo de 800 px'], ['Chaves na Mão', 598, 'ok'], ['Site Lar Paulista', st.publicados, 'ok']];
      $('[data-portais]').innerHTML = P.map(function (p) { return '<tr><td>' + p[0] + '</td><td class="num">' + p[1] + '</td><td>' + (p[2] === 'ok' ? '<span class="st st-ok">Recebendo</span>' : '<span class="st st-novo">' + esc(p[2]) + '</span>') + '</td></tr>'; }).join('');
      $('[data-log]').innerHTML = st.log.slice(0, 10).map(function (l) { return '<li><time>' + dataBR(new Date(l.t)).slice(0, 5) + ' ' + horaBR(new Date(l.t)) + '</time><span>' + (l.ok ? '' : '<span class="st st-novo">aviso</span> ') + esc(l.txt) + '</span></li>'; }).join('');
    }
    var im = LP.carregarImoveis()[0];
    $('[data-xml]').textContent = '<Imovel>\n  <CodigoImovel>' + im.cod + '</CodigoImovel>\n  <TipoImovel>' + im.tipo + '</TipoImovel>\n  <Finalidade>' + (im.fin === 'venda' ? 'Venda' : 'Locação') + '</Finalidade>\n  <Cidade>' + im.cidade + '</Cidade>\n  <Bairro>' + im.bairro + '</Bairro>\n  <Endereco>' + im.rua + '</Endereco>\n  <PrecoVenda>' + im.preco + '</PrecoVenda>\n  <ValorCondominio>' + im.cond + '</ValorCondominio>\n  <ValorIPTU>' + im.iptu + '</ValorIPTU>\n  <AreaUtil>' + im.area + '</AreaUtil>\n  <Dormitorios>' + im.quartos + '</Dormitorios>\n  <Suites>' + im.suites + '</Suites>\n  <Vagas>' + im.vagas + '</Vagas>\n  <Corretor>' + LP.obterCorretor(im.corretor).nome + '</Corretor>\n  <Fotos>\n' + im.fotos.map(function (f, k) { return '    <Foto ordem="' + (k + 1) + '">https://cdn.exemplo/' + f.src.split('/').pop() + '</Foto>'; }).join('\n') + '\n  </Fotos>\n</Imovel>';
    var rodando = false;
    $('[data-sincronizar]').addEventListener('click', function () {
      if (rodando) return; rodando = true;
      var b = this, prog = $('[data-prog]'), txt = $('[data-prog-txt]'), barra = $('i', prog);
      b.disabled = true; prog.hidden = false; txt.hidden = false; $('[data-status-con]').textContent = 'Sincronizando…'; $('[data-status-con]').className = 'st st-novo';
      var passos = ['Baixando o XML do Jetimob…', 'Lendo ' + st.total + ' imóveis…', 'Comparando com o que está no site…', 'Atualizando fotos, preços e páginas de bairro…', 'Concluído.'], k = 0;
      (function passo() {
        txt.textContent = passos[k]; barra.style.width = ((k + 1) / passos.length * 100) + '%';
        if (++k < passos.length) return setTimeout(passo, 650);
        var at = 1 + Math.floor(Math.random() * 4), nv = Math.random() < 0.5 ? 1 : 0;
        st.atualizados += at; st.novos += nv; st.total += nv; st.publicados += nv; st.ultima = Date.now();
        var corrigiu = st.erros > 0 && Math.random() < 0.6; if (corrigiu) { st.erros--; st.publicados++; }
        st.log.unshift({ t: st.ultima, txt: 'Leitura manual concluída: ' + st.total + ' imóveis no XML, ' + at + ' atualizados' + (nv ? ', 1 novo' : '') + (corrigiu ? ', 1 erro corrigido no sistema e publicado' : '') + '.', ok: true });
        salvar(); render(); b.disabled = false; rodando = false;
        $('[data-status-con]').textContent = 'Conectado'; $('[data-status-con]').className = 'st st-ok';
        toast('Sincronização concluída: ' + at + ' imóveis atualizados' + (nv ? ' e 1 novo' : '') + '.');
        setTimeout(function () { prog.hidden = true; txt.hidden = true; barra.style.width = '0'; }, 1600);
      })();
    });
    render();
  })();

  // =====================================================================
  // ANUNCIAR E CONTATO
  // =====================================================================
  var fa = $('[data-form="anunciar"]');
  if (fa) {
    var est = function () {
      var t = fa.tipo.value, b = fa.bairro.value, a = parseFloat(fa.area.value), fin = $('input[name="fin"]:checked', fa).value, el = $('[data-estimativa]', fa);
      if (!t || !b || !(a > 8)) { el.textContent = 'Preencha tipo, bairro e área para ver uma faixa de valor com base nos nossos anúncios.'; return; }
      var ims = LP.carregarImoveis(), base = function (m) { var r = ims.filter(function (i) { return i.fin === m && i.bairro === b && i.tipo !== 'Sala comercial'; }); if (!r.length) r = ims.filter(function (i) { return i.fin === m && i.tipo !== 'Sala comercial'; }); return r.reduce(function (s, i) { return s + i.preco / i.area; }, 0) / r.length; };
      var txt = [];
      if (fin !== 'aluguel') { var v = base('venda') * a; txt.push('venda entre <b>' + abrev(v * 0.9) + ' e ' + abrev(v * 1.1) + '</b>'); }
      if (fin !== 'venda') { var l = base('aluguel') * a; txt.push('aluguel entre <b>' + brl(Math.round(l * 0.9 / 50) * 50) + ' e ' + brl(Math.round(l * 1.1 / 50) * 50) + '/mês</b>'); }
      el.innerHTML = 'Pelos nossos anúncios de exemplo, um imóvel assim no ' + esc(b) + ' sairia por ' + txt.join(' ou ') + '. A avaliação na visita confirma o valor.';
    };
    fa.addEventListener('input', est); fa.addEventListener('change', est);
    fa.addEventListener('submit', function (e) {
      e.preventDefault(); if (!validar(fa)) return;
      var fin = $('input[name="fin"]:checked', fa).value, finTxt = { venda: 'vender', aluguel: 'alugar', ambos: 'vender ou alugar' }[fin];
      var l = LP.registrarLead({ nome: fa.nome.value.trim(), tel: fa.tel.value.trim(), email: fa.email.value.trim(), interesse: 'captacao', origem: 'Site · anunciar imóvel', mensagem: fa.tipo.value + ' no ' + fa.bairro.value + ', ' + fa.area.value + ' m²' });
      confirma(fa, '<b>Pedido de avaliação recebido.</b>' + esc(LP.obterCorretor(l.corretor).nome) + ' vai ligar para combinar a visita (' + esc(fa.horario.value.toLowerCase()) + ').' + linhaFila);
      wa('Olá, Lar Paulista! Quero ' + finTxt + ' meu imóvel.\n• Nome: ' + fa.nome.value.trim() + '\n• Imóvel: ' + fa.tipo.value + ', ' + fa.area.value + ' m², ' + fa.quartos.value + ' quarto(s)\n• Bairro: ' + fa.bairro.value + '\n• Melhor horário: ' + fa.horario.value);
    });
  }
  var fc = $('[data-form="contato"]');
  if (fc) fc.addEventListener('submit', function (e) {
    e.preventDefault(); if (!validar(fc)) return;
    var cod = fc.codigo.value.trim(), im = cod ? LP.obterImovelPorCodigo(cod) : null;
    if (cod && !im) { marcaErro(fc.codigo, 'Código não encontrado. Confira ou deixe em branco.'); fc.codigo.focus(); return; }
    var a = fc.assunto.value, l = LP.registrarLead({ nome: fc.nome.value.trim(), tel: fc.tel.value.trim(), imovel: im && im.cod, origem: 'Site · contato', mensagem: fc.msg.value.trim(), interesse: /alugar|inquilino/i.test(a) ? 'aluguel' : /anunciar/i.test(a) ? 'captacao' : 'venda' });
    confirma(fc, '<b>Mensagem recebida.</b>' + esc(LP.obterCorretor(l.corretor).nome) + ' responde pelo WhatsApp em horário comercial.' + linhaFila);
    wa('Olá, Lar Paulista! ' + a + '.' + (im ? ' Imóvel ' + im.cod + ', em ' + im.bairro + '.' : '') + '\n• Nome: ' + fc.nome.value.trim() + '\n• Mensagem: ' + fc.msg.value.trim());
  });

  pintaFavs();
})();

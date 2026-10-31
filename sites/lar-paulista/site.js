// Lar Paulista · busca de imóveis no layout de portal: grade, mapa + lista e só mapa; filtros completos; comparação de até 4;
// ficha do imóvel com fotos, custo total do mês (aluguel + condomínio + IPTU + seguro), simulação SAC, comparáveis e visita.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var real = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  var mil = function (v) { return 'R$ ' + (Math.round(v / 1000) * 1000).toLocaleString('pt-BR'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var semAcento = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEGURO = 45, JURO = Math.pow(1.1149, 1 / 12) - 1, POR = 6;

  // ---------- anúncios (os 12 de antes, com os mesmos valores, e mais 6) ----------
  // cod, fotos, título, tipo, bairro, rua, modo, valor (venda) ou aluguel, condomínio, IPTU/mês, m², quartos, banheiros, vagas, pet, dias no ar, ano, piscina, mobiliado, varanda, corretor
  var COR = ['Ana Lúcia Prado', 'Marcos Teixeira', 'Juliana Okada'];
  var BR = [
    ['LP-1031', 'i0 sala-lareira cozinha-janela quarto-casal sala-jardim', 'Casa com piscina', 'Casa', 'Nova Campinas', 'Rua Sampaio Ferraz, 418', 'venda', 2450000, 0, 690, 310, 4, 5, 3, 1, 4, 2019, 1, 0, 1, 0],
    ['LP-1042', 'sala-clara i1 cozinha-branca quarto-casal sala-varanda', 'Apartamento 3 quartos', 'Apartamento', 'Cambuí', 'Rua Maria Monteiro, 812', 'aluguel', 4200, 1180, 260, 118, 3, 2, 2, 1, 2, 2014, 0, 0, 1, 0],
    ['LP-1047', 'sala-poltrona-amarela i2 cozinha-americana home-office quarto-casal', 'Studio mobiliado', 'Studio', 'Centro', 'Rua Barão de Jaguara, 1.090', 'aluguel', 1950, 520, 85, 38, 1, 1, 0, 0, 1, 2021, 0, 1, 0, 1],
    ['LP-1018', 'i3 sala-plantas cozinha-branca quarto-casal sala-jantar', 'Apartamento 2 quartos', 'Apartamento', 'Taquaral', 'Av. Dr. Heitor Penteado, 1.540', 'aluguel', 2600, 690, 140, 72, 2, 2, 1, 1, 6, 2009, 0, 0, 1, 2],
    ['LP-1009', 'sala-jantar i4 cozinha-americana quarto-casal sala-sofa-azul', 'Apartamento 2 quartos', 'Apartamento', 'Barão Geraldo', 'Av. Albino J. B. de Oliveira, 2.210', 'venda', 520000, 480, 150, 68, 2, 1, 1, 1, 9, 2016, 0, 0, 0, 2],
    ['LP-1003', 'i5 sala-pe-direito cozinha-janela quarto-casal sala-varanda', 'Cobertura duplex', 'Cobertura', 'Cambuí', 'Rua Coronel Quirino, 1.480', 'venda', 1680000, 1650, 520, 196, 3, 4, 3, 1, 12, 2015, 1, 0, 1, 1],
    ['LP-1036', 'i6 sala-madeira cozinha-branca varanda-entrada quarto-casal', 'Casa térrea', 'Casa', 'Barão Geraldo', 'Rua Eduardo Modesto, 377', 'aluguel', 5800, 0, 420, 210, 3, 3, 4, 1, 3, 2006, 0, 0, 0, 2],
    ['LP-1027', 'i7 sala-lareira cozinha-janela quarto-casal sala-jardim', 'Casa em condomínio', 'Casa em condomínio', 'Mansões Santo Antônio', 'Rua Hermantino Coelho, 901', 'venda', 1890000, 980, 610, 280, 4, 4, 4, 1, 5, 2017, 1, 0, 1, 0],
    ['LP-1015', 'i8 sala-pe-direito cozinha-americana quarto-casal home-office', 'Sobrado moderno', 'Sobrado', 'Nova Campinas', 'Rua Jasmim, 230', 'aluguel', 8900, 0, 780, 260, 4, 4, 3, 1, 8, 2020, 0, 0, 1, 1],
    ['LP-1001', 'i9 sala-lareira sala-pe-direito cozinha-janela sala-jardim', 'Casa de alto padrão', 'Casa em condomínio', 'Mansões Santo Antônio', 'Rua Hermantino Coelho, 1.450', 'venda', 3900000, 1300, 1100, 520, 5, 7, 6, 1, 15, 2018, 1, 0, 1, 1],
    ['LP-1012', 'i10 sala-sofa-azul cozinha-americana quarto-casal', 'Apartamento 1 quarto', 'Apartamento', 'Centro', 'Av. Francisco Glicério, 1.310', 'aluguel', 1600, 430, 70, 45, 1, 1, 1, 0, 11, 1998, 0, 0, 0, 2],
    ['LP-1021', 'i11 sala-plantas cozinha-branca quarto-casal sala-clara', 'Apartamento 3 quartos', 'Apartamento', 'Taquaral', 'Rua Uruguai, 640', 'venda', 780000, 820, 230, 104, 3, 2, 2, 0, 7, 2012, 0, 0, 1, 0],
    ['LP-1049', 'sala-varanda sala-clara cozinha-janela quarto-casal', 'Apartamento com varanda', 'Apartamento', 'Guanabara', 'Av. Brasil, 1.870', 'aluguel', 2900, 610, 120, 64, 2, 2, 1, 1, 2, 2019, 0, 0, 1, 1],
    ['LP-1033', 'casa-sobrado-azul sala-madeira cozinha-branca varanda-entrada', 'Sobrado 3 quartos', 'Sobrado', 'Taquaral', 'Rua Uruguai, 95', 'aluguel', 4900, 0, 310, 170, 3, 3, 2, 1, 5, 2004, 0, 0, 1, 0],
    ['LP-1050', 'home-office sala-poltrona-amarela cozinha-americana quarto-casal', 'Studio com escritório', 'Studio', 'Cambuí', 'Rua Guilherme da Silva, 255', 'aluguel', 2350, 640, 95, 42, 1, 1, 1, 0, 1, 2022, 0, 1, 0, 2],
    ['LP-1029', 'casa-tijolo sala-madeira cozinha-janela varanda-entrada', 'Casa térrea com quintal', 'Casa', 'Barão Geraldo', 'Rua Eduardo Modesto, 1.020', 'venda', 1150000, 0, 380, 230, 3, 3, 3, 1, 6, 2008, 0, 0, 0, 2],
    ['LP-1044', 'sala-pe-direito sala-jardim cozinha-branca quarto-casal', 'Apartamento garden', 'Apartamento', 'Guanabara', 'Rua Padre Vieira, 410', 'venda', 690000, 720, 190, 96, 3, 2, 2, 1, 3, 2017, 0, 0, 1, 1],
    ['LP-1024', 'casa-telhado sala-clara cozinha-janela quarto-casal', 'Casa em condomínio', 'Casa em condomínio', 'Taquaral', 'Rua Uruguai, 1.880', 'venda', 1320000, 650, 420, 205, 3, 3, 2, 1, 10, 2013, 1, 0, 0, 0]
  ];
  var IM = BR.map(function (r) {
    return { id: r[0], f: r[1].split(' '), t: r[2], tipo: r[3], b: r[4], rua: r[5], m: r[6], v: r[7], c: r[8], ip: r[9], a: r[10], q: r[11], bh: r[12], vg: r[13], pet: r[14], d: r[15], ano: r[16], pisc: r[17], mob: r[18], vr: r[19], cor: COR[r[20]] };
  });
  var porId = {}; IM.forEach(function (x) { porId[x.id] = x; });
  var custo = function (x) { return x.m === 'aluguel' ? x.v + x.c + x.ip + SEGURO : x.v; };
  var parcela = function (x, ent) { var fin = x.v * (1 - (ent || 0.2)); return fin / 360 + fin * JURO; };
  var porM2 = function (x) { return x.v / x.a; };
  var foto = function (n) { return 'img/' + n + '.webp'; };
  var hoje = new Date();
  var dataDe = function (d) { var t = new Date(hoje); t.setDate(t.getDate() - d); return t.toLocaleDateString('pt-BR'); };
  var plural = function (n, s, p) { return n + ' ' + (n === 1 ? s : (p || s + 's')); };
  var BAIRROS = ['Cambuí', 'Taquaral', 'Guanabara', 'Centro', 'Barão Geraldo', 'Nova Campinas', 'Mansões Santo Antônio'];

  var SOBRE = {
    'Cambuí': 'O Cambuí tem a vida a pé de Campinas: Centro de Convivência, padarias, bares e a Av. Júlio de Mesquita a poucas quadras.',
    'Taquaral': 'No Taquaral, a Lagoa e o Parque Portugal ficam perto, com pista de caminhada de 3 km e feira de artesanato aos domingos.',
    'Centro': 'No Centro, o Mercado Municipal, a Rua 13 de Maio e os corredores de ônibus estão a uma caminhada.',
    'Barão Geraldo': 'Barão Geraldo é o bairro da Unicamp: mais verde e mais calmo, com comércio próprio e ciclovia.',
    'Nova Campinas': 'A Nova Campinas é residencial e arborizada, colada no Cambuí e a poucos minutos do Shopping Iguatemi.',
    'Mansões Santo Antônio': 'Mansões Santo Antônio tem ruas largas, condomínios de casas e acesso rápido à Rod. D. Pedro I.',
    'Guanabara': 'O Guanabara fica entre o Centro e o Taquaral, com a Av. Brasil, mercados e escolas tradicionais por perto.'
  };
  var PERTO = {
    'Cambuí': [['Centro de Convivência', '#2f8a46'], ['Escola Estadual Carlos Gomes', '#e0912f'], ['Supermercado', '#7a54d1'], ['Ponto de ônibus', '#1b67ee'], ['Hospital Vera Cruz', '#d0393f']],
    'Taquaral': [['Lagoa do Taquaral', '#2f8a46'], ['Escola municipal', '#e0912f'], ['Supermercado', '#7a54d1'], ['Ponto de ônibus', '#1b67ee'], ['Pronto-socorro', '#d0393f']],
    'Centro': [['Bosque dos Jequitibás', '#2f8a46'], ['Escola técnica', '#e0912f'], ['Mercado Municipal', '#7a54d1'], ['Terminal Central', '#1b67ee'], ['Santa Casa', '#d0393f']],
    'Barão Geraldo': [['Unicamp', '#2f8a46'], ['Escola estadual', '#e0912f'], ['Supermercado', '#7a54d1'], ['Ponto de ônibus', '#1b67ee'], ['Hospital de Clínicas', '#d0393f']],
    'Nova Campinas': [['Praça arborizada', '#2f8a46'], ['Colégio particular', '#e0912f'], ['Shopping Iguatemi', '#7a54d1'], ['Ponto de ônibus', '#1b67ee'], ['Hospital', '#d0393f']],
    'Mansões Santo Antônio': [['Parque Ecológico', '#2f8a46'], ['Colégio bilíngue', '#e0912f'], ['Supermercado', '#7a54d1'], ['Acesso à D. Pedro I', '#1b67ee'], ['Hospital', '#d0393f']],
    'Guanabara': [['Praça do bairro', '#2f8a46'], ['Escola estadual', '#e0912f'], ['Supermercado', '#7a54d1'], ['Corredor da Av. Brasil', '#1b67ee'], ['Hospital', '#d0393f']]
  };
  // ---------- estado ----------
  var VAZIO = { modo: 'aluguel', bairro: '', tipos: [], pmin: '', pmax: '', qmin: '', qmax: '', bmin: '', bmax: '', amin: '', amax: '', vmin: '', vmax: '', ymin: '', ymax: '', cmin: '', cmax: '', feats: [], ordem: 'novo', texto: '' };
  var S = JSON.parse(JSON.stringify(VAZIO)), pagina = 1;
  var favs = [], cmp = [];
  try { favs = JSON.parse(localStorage.getItem('lp-fav') || '[]').filter(function (k) { return porId[k]; }); } catch (e) {}
  var guardaFav = function () { try { localStorage.setItem('lp-fav', JSON.stringify(favs)); } catch (e) {} };
  var num = function (v) { var n = parseInt(String(v).replace(/\D/g, ''), 10); return isNaN(n) ? null : n; };

  function filtrar(st) {
    var ok = function (val, a, b) { var lo = num(a), hi = num(b); return (lo === null || val >= lo) && (hi === null || val <= hi); };
    var tx = semAcento(st.texto || '');
    return IM.filter(function (x) {
      if (st.modo && x.m !== st.modo) return false;
      if (st.bairro && x.b !== st.bairro) return false;
      if (st.tipos.length && st.tipos.indexOf(x.tipo) < 0) return false;
      if (!ok(custo(x), st.pmin, st.pmax) || !ok(x.q, st.qmin, st.qmax) || !ok(x.bh, st.bmin, st.bmax) || !ok(x.a, st.amin, st.amax) || !ok(x.vg, st.vmin, st.vmax) || !ok(x.ano, st.ymin, st.ymax) || !ok(x.c, st.cmin, st.cmax)) return false;
      for (var i = 0; i < st.feats.length; i++) {
        var f = st.feats[i];
        if (f === 'pet' && !x.pet) return false; if (f === 'vaga' && !x.vg) return false; if (f === 'pisc' && !x.pisc) return false;
        if (f === 'mob' && !x.mob) return false; if (f === 'var' && !x.vr) return false; if (f === 'novo' && x.d > 3) return false;
        if (f === 'fav' && favs.indexOf(x.id) < 0) return false;
      }
      if (tx && semAcento(x.t + ' ' + x.rua + ' ' + x.b + ' ' + x.id + ' ' + x.tipo).indexOf(tx) < 0) return false;
      return true;
    }).sort(function (a, b) {
      var o = st.ordem;
      return o === 'barato' ? custo(a) - custo(b) : o === 'caro' ? custo(b) - custo(a) : o === 'area' ? b.a - a.a : o === 'm2' ? porM2(a) - porM2(b) : a.d - b.d;
    });
  }
  function nFiltros(st) {
    var n = (st.bairro ? 1 : 0) + st.tipos.length + st.feats.length + (st.texto ? 1 : 0);
    ['pmin', 'pmax', 'qmin', 'qmax', 'bmin', 'bmax', 'amin', 'amax', 'vmin', 'vmax', 'ymin', 'ymax', 'cmin', 'cmax'].forEach(function (k) { if (num(st[k]) !== null) n++; });
    return n;
  }

  // ---------- anunciar ----------
  var FA = $('#form-anunciar');
  if (FA) (function () {
  function estimar() {
    var vende = FA.neg.value === 'vender', m = vende ? 'venda' : 'aluguel', b = FA.bairro.value, area = Math.max(15, num(FA.area.value) || 80);
    var base = IM.filter(function (x) { return x.m === m && x.b === b; }), ond = 'no ' + b;
    if (!base.length) { base = IM.filter(function (x) { return x.m === m; }); ond = 'em Campinas'; }
    var med = base.reduce(function (s, x) { return s + x.v / x.a; }, 0) / base.length, v = med * area;
    FA.querySelector('.estima').innerHTML = 'Imóveis parecidos ' + ond + ' saem por <b>' + (vende ? mil(v * 0.9) + ' a ' + mil(v * 1.1) : real(Math.round(v * 0.9 / 50) * 50) + ' a ' + real(Math.round(v * 1.1 / 50) * 50) + '/mês') + '</b>, pela média de ' + real(med) + '/m² nos nossos anúncios.';
  }
  FA.addEventListener('input', estimar); FA.addEventListener('change', estimar); estimar();
  FA.addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = 'Olá, Lar Paulista! Sou ' + FA.nome.value.trim() + ' e quero anunciar para ' + (FA.neg.value === 'vender' ? 'vender' : 'alugar') + ': ' + FA.tipo.value + ' no ' + FA.bairro.value + ', ' + (num(FA.area.value) || 80) + ' m².';
    if (window.BR_WA) window.BR_WA(txt);
  });
  })();

  // ---------- ícones ----------
  var IC = {
    cama: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 15.5V5.5M2.5 12h15v3.5M17.5 12v-2a2 2 0 0 0-2-2H9v4"/><circle cx="5.6" cy="9.4" r="1.4"/></svg>',
    banho: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 10h15v2a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4zM4.5 10V5.2a2 2 0 0 1 3.7-1.1M6 16l-1 1.6M14 16l1 1.6"/></svg>',
    area: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5"/></svg>',
    carro: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 13.5V10l1.8-4.2A1.5 1.5 0 0 1 6.7 5h6.6a1.5 1.5 0 0 1 1.4.8l1.8 4.2v3.5zM3.5 13.5v2h2.5v-2M14 13.5v2h2.5v-2M3.5 10h13"/></svg>',
    cor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
    cmp: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="6" height="12" rx="1"/><rect x="11" y="4" width="6" height="12" rx="1"/></svg>',
    share: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M6 7l4-4 4 4M4 11v5h12v-5"/></svg>'
  };

  // ---------- páginas do site (31/10): cada imóvel tem a sua página, e há lista, sobre, anunciar, contato e privacidade ----------
  var paginaDe = function (x) { return 'imovel-' + semAcento(x.t + ' ' + x.b).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.html'; };
  var SEM_CMP = !$('.palco');
  // menu do celular (gaveta), igual em todas as páginas
  var gav = $('#gaveta'), btMenu = $('.bt-menu');
  if (gav && btMenu) {
    var gaveta = function (abre) { gav.hidden = !abre; btMenu.setAttribute('aria-expanded', String(abre)); btMenu.setAttribute('aria-label', abre ? 'Fechar o menu' : 'Abrir o menu'); if (abre) { var l = $('a', gav); if (l) l.focus({ preventScroll: true }); } };
    btMenu.addEventListener('click', function () { gaveta(gav.hidden); });
    gav.addEventListener('click', function (e) { if (e.target === gav || e.target.closest('a')) gaveta(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gav.hidden) { gaveta(false); btMenu.focus(); } });
  }
  if (SEM_CMP) { internas(); return; }

  function internas() {
    try { tema(localStorage.getItem('lp-tema') || 'sistema'); } catch (e) { tema('sistema'); }
    var menuU = $('.menu-u'), btU = $('.bt-u');
    var menuUsuario = function (abre) { if (!menuU) return; menuU.hidden = !abre; btU.setAttribute('aria-expanded', String(abre)); };
    var salvos = function () { var n = favs.length; $$('.n-sv').forEach(function (b) { b.hidden = !n; b.textContent = n; }); $$('.n-sv2').forEach(function (b) { b.textContent = n; }); };
    salvos();
    // busca do topo: código abre a página do imóvel, o resto vai para a lista
    var fb = $('#busca'), q = $('#q');
    if (fb) {
      q.addEventListener('input', function () { fb.classList.toggle('cheia', !!q.value); });
      fb.addEventListener('submit', function (e) {
        e.preventDefault(); var t = q.value.trim(); if (!t) { q.focus(); return; }
        var cod = semAcento(t).match(/lp-?\s?(\d{4})/);
        location.href = cod && porId['LP-' + cod[1]] ? paginaDe(porId['LP-' + cod[1]]) : 'imoveis.html?q=' + encodeURIComponent(t);
      });
    }
    var lista = listaPagina(), ficha = imovelPagina();
    document.addEventListener('click', function (e) {
      var t = e.target, a;
      if (menuU && !t.closest('.usuario') && !menuU.hidden) menuUsuario(false);
      if ((a = t.closest('.bt-u'))) { menuUsuario(menuU.hidden); return; }
      if ((a = t.closest('[data-tema]'))) { tema(a.dataset.tema, true); return; }
      if ((a = t.closest('[data-so-salvos]'))) { location.href = 'imoveis.html?salvos=1'; return; }
      if ((a = t.closest('[data-fav]'))) {
        var id = a.dataset.fav, k = favs.indexOf(id); if (k > -1) favs.splice(k, 1); else favs.push(id); guardaFav();
        $$('[data-fav="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(k < 0)); });
        salvos(); if (k < 0) aviso('Salvo. Veja os seus imóveis em <b>Minha conta → Imóveis salvos</b>.');
        if (lista) lista.render(); return;
      }
      if ((a = t.closest('[data-foto]'))) {
        var tr = $('.trilho', a.closest('.foto')), n = tr.children.length, i = (+tr.dataset.i + +a.dataset.foto + n) % n;
        tr.dataset.i = i; tr.style.transform = 'translateX(' + (-i * 100) + '%)';
        $$('.pontos i', a.closest('.foto')).forEach(function (p, j) { p.classList.toggle('on', j === i); }); return;
      }
      if ((a = t.closest('[data-ver]'))) { abrirFicha(a.dataset.ver); return; }
      if ((a = t.closest('[data-slot]'))) { $$('[data-slot]', a.closest('.slots')).forEach(function (b) { b.setAttribute('aria-pressed', String(b === a)); }); return; }
      if (ficha) ficha.clique(e, t);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var gl = $('#galeria'); if (gl && !gl.hidden) { gl.hidden = true; return; }
      if (menuU && !menuU.hidden) { menuUsuario(false); btU.focus(); }
    });
    // deslizar as fotos do cartão no celular
    var cards = $('.cards'), toque = null;
    if (cards) {
      cards.addEventListener('touchstart', function (e) { var f = e.target.closest('.foto'); if (f) toque = { f: f, x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
      cards.addEventListener('touchend', function (e) {
        if (!toque) return; var dx = e.changedTouches[0].clientX - toque.x, dy = e.changedTouches[0].clientY - toque.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { var b = $('[data-foto="' + (dx < 0 ? 1 : -1) + '"]', toque.f); if (b) b.click(); }
        toque = null;
      }, { passive: true });
    }
    // formulário da página de contato: monta a mensagem para o WhatsApp
    var FC2 = $('#form-contato');
    if (FC2) FC2.addEventListener('submit', function (e) {
      e.preventDefault();
      var txt = 'Olá, Lar Paulista! Sou ' + (FC2.nome.value.trim() || 'cliente') + (FC2.fone.value.trim() ? ' (' + FC2.fone.value.trim() + ')' : '') + '. Assunto: ' + FC2.assunto.value + (FC2.bairro.value ? ', no ' + FC2.bairro.value : '') + '. ' + FC2.msg.value.trim();
      if (window.BR_WA) window.BR_WA(txt);
    });
  }

  // ---------- imoveis.html: lista com filtro de negócio, tipo, bairro e preço, paginada e com o endereço na URL ----------
  function listaPagina() {
    var LF = $('#filtro-lista'); if (!LF) return null;
    var P = new URLSearchParams(location.search), POR_P = 6, pag = Math.max(1, parseInt(P.get('pag'), 10) || 1);
    var TIPOS = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura', 'Studio', 'Sobrado'];
    var PRECOS = { aluguel: [[2000, 'Até R$ 2.000/mês'], [3000, 'Até R$ 3.000/mês'], [5000, 'Até R$ 5.000/mês'], [10000, 'Até R$ 10.000/mês']], venda: [[600000, 'Até R$ 600 mil'], [1000000, 'Até R$ 1 milhão'], [2000000, 'Até R$ 2 milhões'], [4000000, 'Até R$ 4 milhões']] };
    TIPOS.forEach(function (t) { LF.tipo.add(new Option(t, t)); });
    BAIRROS.forEach(function (b) { LF.bairro.add(new Option(b, b)); });
    var texto = P.get('q') || '', soSalvos = P.get('salvos') === '1';
    function precos() {
      var m = LF.modo.value, atual = LF.pmax.value;
      LF.pmax.innerHTML = ''; LF.pmax.add(new Option(m ? 'Qualquer preço' : 'Escolha o negócio', ''));
      (PRECOS[m] || []).forEach(function (p) { LF.pmax.add(new Option(p[1], p[0])); });
      LF.pmax.disabled = !m; LF.pmax.value = (PRECOS[m] || []).some(function (p) { return String(p[0]) === atual; }) ? atual : '';
    }
    LF.modo.value = P.get('modo') === 'aluguel' || P.get('modo') === 'venda' ? P.get('modo') : '';
    precos();
    LF.tipo.value = TIPOS.indexOf(P.get('tipo')) > -1 ? P.get('tipo') : '';
    LF.bairro.value = BAIRROS.indexOf(P.get('bairro')) > -1 ? P.get('bairro') : '';
    LF.pmax.value = P.get('pmax') || ''; if (!LF.pmax.value) LF.pmax.value = '';
    LF.ordem.value = ['novo', 'barato', 'caro', 'area'].indexOf(P.get('ordem')) > -1 ? P.get('ordem') : 'novo';
    function estado() {
      var st = JSON.parse(JSON.stringify(VAZIO));
      st.modo = LF.modo.value; st.bairro = LF.bairro.value; st.tipos = LF.tipo.value ? [LF.tipo.value] : []; st.pmax = LF.pmax.value; st.ordem = LF.ordem.value; st.texto = texto;
      if (soSalvos) st.feats = ['fav'];
      return st;
    }
    function url() {
      var u = new URLSearchParams();
      if (LF.modo.value) u.set('modo', LF.modo.value); if (LF.tipo.value) u.set('tipo', LF.tipo.value); if (LF.bairro.value) u.set('bairro', LF.bairro.value);
      if (LF.pmax.value) u.set('pmax', LF.pmax.value); if (LF.ordem.value !== 'novo') u.set('ordem', LF.ordem.value); if (texto) u.set('q', texto); if (soSalvos) u.set('salvos', '1'); if (pag > 1) u.set('pag', pag);
      try { history.replaceState(null, '', location.pathname + (String(u) ? '?' + u : '')); } catch (e) {}
    }
    function render() {
      var l = filtrar(estado()), pags = Math.max(1, Math.ceil(l.length / POR_P)); pag = Math.min(pag, pags);
      var neg = LF.modo.value === 'aluguel' ? ' para alugar' : LF.modo.value === 'venda' ? ' à venda' : '';
      $('#conta-lista').innerHTML = '<b>' + l.length + '</b> ' + (l.length === 1 ? 'imóvel' : 'imóveis') + neg + (LF.bairro.value ? ' no ' + LF.bairro.value : '') + ' em Campinas';
      $('.cards').innerHTML = l.length ? l.slice((pag - 1) * POR_P, pag * POR_P).map(cardHTML).join('') :
        '<li class="vazio"><b>Nenhum imóvel com esses filtros agora.</b>Tire um filtro ou peça para avisarmos quando entrar um assim.<div class="linha-bts"><button type="button" class="bt-borda" data-limpar-lista>Limpar filtros</button><a class="bt-azul" href="#" data-wa="Olá, Lar Paulista! Quero ser avisado quando entrar um imóvel assim em Campinas.">Avisar quando entrar</a></div></li>';
      var h = '';
      if (pags > 1) { h += '<button type="button" data-pg="' + (pag - 1) + '"' + (pag <= 1 ? ' disabled' : '') + '>Anterior</button>'; for (var i = 1; i <= pags; i++) h += '<button type="button" data-pg="' + i + '"' + (i === pag ? ' aria-current="page"' : '') + '>' + i + '</button>'; h += '<button type="button" data-pg="' + (pag + 1) + '"' + (pag >= pags ? ' disabled' : '') + '>Próxima</button>'; }
      $('.paginas').innerHTML = h; $('.pag-de').textContent = 'Página ' + pag + ' de ' + pags;
      var ch = []; if (texto) ch.push('<button type="button" data-tira="q">Busca: “' + esc(texto) + '” ×</button>'); if (soSalvos) ch.push('<button type="button" data-tira="salvos">Só os salvos ×</button>');
      $('.chips-ativos').innerHTML = ch.join(''); $('.chips-ativos').hidden = !ch.length;
      $$('.menu a[data-modo]').forEach(function (m) { if (m.dataset.modo === LF.modo.value) m.setAttribute('aria-current', 'page'); else m.removeAttribute('aria-current'); });
      url();
    }
    LF.addEventListener('change', function (e) { if (e.target === LF.modo) precos(); pag = 1; render(); });
    LF.addEventListener('submit', function (e) { e.preventDefault(); });
    LF.addEventListener('reset', function () { setTimeout(function () { texto = ''; soSalvos = false; precos(); pag = 1; render(); }); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pg]'); if (a && !a.disabled) { pag = +a.dataset.pg; render(); scrollTo({ top: $('.lista-pg').offsetTop - 70, behavior: reduz ? 'auto' : 'smooth' }); return; }
      if ((a = e.target.closest('[data-tira]'))) { if (a.dataset.tira === 'q') texto = ''; else soSalvos = false; pag = 1; render(); return; }
      if (e.target.closest('[data-limpar-lista]')) { LF.reset(); }
    });
    render();
    return { render: render };
  }

  // ---------- imovel-<nome>.html: a ficha completa como página ----------
  function imovelPagina() {
    var m = $('[data-imovel]'); if (!m) return null;
    var x = porId[m.getAttribute('data-imovel')], box = $('.fc-in', m);
    box.innerHTML = fichaHTML(x, true);
    if (x.m !== 'aluguel') simula(x);
    var abas = $$('.fc-abas a', box);
    var ob = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) abas.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); }); }, { rootMargin: '-20% 0px -70% 0px' });
    $$('.fc-sec', box).forEach(function (s) { ob.observe(s); });
    box.addEventListener('change', function (e) {
      if (e.target.name !== 'ass') return;
      var vis = e.target.value === 'visita', fm = e.target.form;
      $('.f-vis', fm).hidden = !vis; $('.f-msg', fm).hidden = vis; $('button[type=submit]', fm).textContent = vis ? 'Pedir visita' : 'Enviar pergunta';
    });
    box.addEventListener('submit', function (e) {
      e.preventDefault(); var fm = e.target, vis = fm.ass.value === 'visita', sl = $('[data-slot][aria-pressed="true"]', fm);
      if (vis && !sl) { aviso('Escolha um <b>horário</b> para a visita.'); return; }
      var txt = 'Olá, Lar Paulista! Sou ' + (fm.nome.value.trim() || 'cliente') + (fm.fone.value.trim() ? ' (' + fm.fone.value.trim() + ')' : '') + '. ' +
        (vis ? 'Quero visitar ' : 'Tenho uma pergunta sobre ') + x.t + ' na ' + x.rua + ', ' + x.b + ' (cód. ' + x.id + ', ' + (x.m === 'aluguel' ? real(custo(x)) + '/mês tudo incluso' : mil(x.v)) + ')' +
        (vis ? '. Horário: ' + sl.dataset.slot + '.' : (fm.msg.value.trim() ? ': ' + fm.msg.value.trim() : '.'));
      if (window.BR_WA) window.BR_WA(txt);
    });
    var GL = $('#galeria'), gi = 0;
    function galeria(k) { gi = (k + x.f.length) % x.f.length; $('img', GL).src = foto(x.f[gi]); $('img', GL).alt = 'Foto ' + (gi + 1) + ' de ' + x.t; $('.gl-n', GL).textContent = (gi + 1) + ' de ' + x.f.length; if (GL.hidden) { GL.hidden = false; $('.gl-x', GL).focus(); } }
    $('.gl-ant', GL).addEventListener('click', function () { galeria(gi - 1); });
    $('.gl-prox', GL).addEventListener('click', function () { galeria(gi + 1); });
    $('.gl-x', GL).addEventListener('click', function () { GL.hidden = true; });
    GL.addEventListener('click', function (e) { if (e.target === GL) GL.hidden = true; });
    return {
      clique: function (e, t) {
        var a;
        if ((a = t.closest('[data-galeria]'))) { galeria(+a.dataset.galeria % x.f.length); return; }
        if ((a = t.closest('[data-ir-contato]'))) {
          var c = $('#fc-contato'); c.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
          var r = $('input[name=ass][value="' + a.dataset.irContato + '"]', c); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); return;
        }
        if ((a = t.closest('[data-copiar]'))) { try { navigator.clipboard.writeText(location.href).then(function () { aviso('Link do imóvel <b>copiado</b>.'); }, function () { aviso('Copie o link na barra do navegador.'); }); } catch (er) { aviso('Copie o link na barra do navegador.'); } }
      }
    };
  }

  // ---------- cartões ----------
  function precoHTML(x) {
    return x.m === 'aluguel' ? real(custo(x)) + '<small>/mês, tudo incluso</small>' : mil(x.v);
  }
  function somaHTML(x) {
    return x.m === 'aluguel'
      ? 'aluguel <b>' + real(x.v) + '</b> + cond. <b>' + real(x.c) + '</b> + IPTU <b>' + real(x.ip) + '</b> + seguro <b>R$ ' + SEGURO + '</b>'
      : '1ª parcela <b>~' + real(parcela(x)) + '</b>/mês com 20% de entrada · cond. <b>' + real(x.c) + '</b> · IPTU <b>' + real(x.ip) + '</b>/mês';
  }
  function cardHTML(x) {
    var fav = favs.indexOf(x.id) > -1, nc = cmp.indexOf(x.id) > -1, nf = x.f.length;
    return '<li class="card" data-id="' + x.id + '"><div class="foto"><div class="trilho" data-i="0">' +
      x.f.map(function (n, k) { return '<img src="' + foto(n) + '" alt="' + (k ? 'Foto ' + (k + 1) + ' de ' : '') + esc(x.t) + ' no ' + esc(x.b) + '"' + (k ? ' loading="lazy"' : '') + ' width="460" height="320">'; }).join('') +
      '</div><a class="abrir" href="' + paginaDe(x) + '" aria-label="Ver ' + esc(x.t) + ' no ' + esc(x.b) + '"></a>' +
      (SEM_CMP ? '' : '<button type="button" class="ck" data-cmp="' + x.id + '" aria-pressed="' + nc + '" aria-label="Comparar este imóvel"><i></i></button>') +
      '<button type="button" class="cor" data-fav="' + x.id + '" aria-pressed="' + fav + '" aria-label="Salvar imóvel">' + IC.cor + '</button>' +
      (nf > 1 ? '<button type="button" class="seta seta-a" data-foto="-1" aria-label="Foto anterior">‹</button><button type="button" class="seta seta-p" data-foto="1" aria-label="Próxima foto">›</button><div class="pontos" aria-hidden="true">' + x.f.map(function (n, k) { return '<i' + (k ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '') +
      '</div><div class="c-corpo"><p class="c-tipo">' + x.tipo + ' · ' + x.ano + '</p><p class="c-preco">' + precoHTML(x) + '</p>' +
      '<p class="c-rua"><a href="' + paginaDe(x) + '">' + esc(x.rua) + '</a></p><p class="c-bairro">' + x.b + ', Campinas/SP</p><p class="c-soma">' + somaHTML(x) + '</p></div>' +
      '<div class="c-icones"><span>' + IC.cama + plural(x.q, 'quarto') + '</span><span>' + IC.banho + plural(x.bh, 'banh.', 'banh.') + '</span><span>' + IC.area + x.a + ' m²</span><span>' + IC.carro + plural(x.vg, 'vaga') + '</span></div>' +
      '<div class="c-pe"><p>Cód. ' + x.id + '<br>' + (x.cor.indexOf('Marcos') === 0 ? 'Corretor ' : 'Corretora ') + x.cor + '</p><p>' + (x.d <= 3 ? '<span class="verde">Novo no site</span>' : 'Há ' + x.d + ' dias no site') + '<br>Anunciado em ' + dataDe(x.d) + '</p></div></li>';
  }

  // ---------- render ----------
  var lista = [];
  function render(manterPagina) {
    lista = filtrar(S);
    var pags = Math.max(1, Math.ceil(lista.length / POR));
    if (!manterPagina) pagina = 1;
    pagina = Math.min(pagina, pags);
    var vista = document.body.dataset.vista, fatia = vista === 'hibrido' ? lista : lista.slice((pagina - 1) * POR, pagina * POR);
    var modoTx = S.modo === 'aluguel' ? 'para alugar' : 'à venda';
    $('.cards').innerHTML = fatia.length ? fatia.map(cardHTML).join('') :
      '<li class="vazio"><b>Nenhum imóvel com esses filtros agora.</b>Tire um filtro ou peça para avisarmos quando entrar um assim.<div class="linha-bts"><button type="button" class="bt-borda" data-limpar>Limpar filtros</button><a class="bt-azul" href="#" data-wa="' + esc(msgSalvar()) + '">Avisar quando entrar</a></div></li>';
    var pg = $('.paginas');
    if (vista === 'hibrido' || pags < 2) pg.innerHTML = '';
    else {
      var h = '';
      for (var i = 1; i <= pags; i++) h += '<button type="button" data-pag="' + i + '"' + (i === pagina ? ' aria-current="page"' : '') + '>' + i + '</button>';
      pg.innerHTML = h + '<button type="button" data-pag="' + (pagina + 1) + '"' + (pagina >= pags ? ' disabled' : '') + '>Próxima</button>';
    }
    $('#conta').innerHTML = '<b>' + lista.length + '</b> ' + (lista.length === 1 ? 'imóvel ' : 'imóveis ') + modoTx + ' em Campinas';
    $('.pag-de').textContent = vista === 'hibrido' ? 'Todos na lista ao lado do mapa' : 'Página ' + pagina + ' de ' + pags;
    $$('.menu a[data-modo]').forEach(function (a) { if (a.dataset.modo === S.modo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var nf = nFiltros(S), bf = $('.n-f'); bf.hidden = !nf; bf.textContent = nf;
    $('.bt-salvar').setAttribute('data-wa', msgSalvar());
    contarSalvos(); barraCmp(); pinos(); rodaDica(true);
  }
  function msgSalvar() {
    var p = [S.modo === 'aluguel' ? 'para alugar' : 'para comprar'];
    if (S.bairro) p.push('no ' + S.bairro);
    if (S.tipos.length) p.push(S.tipos.join(' ou ').toLowerCase());
    if (num(S.qmin) !== null) p.push(num(S.qmin) + '+ quartos');
    if (num(S.pmax) !== null) p.push('até ' + real(num(S.pmax)) + (S.modo === 'aluguel' ? '/mês' : ''));
    if (S.feats.indexOf('pet') > -1) p.push('que aceite pet');
    return 'Olá, Lar Paulista! Quero ser avisado quando entrar imóvel assim: ' + p.join(', ') + ', em Campinas.';
  }
  function contarSalvos() {
    var n = favs.length, b = $('.n-sv'); b.hidden = !n; b.textContent = n; $('.n-sv2').textContent = n;
  }
  function aviso(html, ms) {
    var a = $('.aviso'); a.innerHTML = html; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.hidden = true; }, ms || 3600);
  }
  function irTopoLista() { var l = $('.lista'); if (l.getBoundingClientRect().top < 0) scrollTo({ top: l.offsetTop - 56, behavior: reduz ? 'auto' : 'smooth' }); }

  // ---------- busca com dica que roda ----------
  var DICAS = {
    aluguel: ['endereço ou código', 'aluguel no Cambuí', '2 quartos até 4 mil', 'casa que aceita pet', 'studio mobiliado', 'imóveis mais baratos'],
    venda: ['endereço ou código', 'casa com piscina', 'apartamento no Taquaral', 'até 800 mil', '3 quartos em Barão Geraldo', 'imóveis maiores']
  };
  var dk = 0, dicaT = null;
  function rodaDica(reinicia) {
    var rolo = $('.dica-rolo');
    if (reinicia) { dk = 0; rolo.innerHTML = '<span>' + DICAS[S.modo][0] + '</span>'; }
    clearInterval(dicaT);
    dicaT = setInterval(function () {
      var l = DICAS[S.modo]; dk = (dk + 1) % l.length;
      var velho = rolo.firstElementChild, novo = document.createElement('span');
      novo.textContent = l[dk];
      if (reduz) { rolo.innerHTML = ''; rolo.appendChild(novo); return; }
      novo.className = 'entra'; rolo.appendChild(novo);
      requestAnimationFrame(function () { requestAnimationFrame(function () { novo.className = ''; if (velho) velho.className = 'sai'; }); });
      setTimeout(function () { if (velho && velho.parentNode) velho.remove(); }, 500);
    }, 2600);
  }
  var q = $('#q'), fb = $('#busca');
  q.addEventListener('input', function () { fb.classList.toggle('cheia', !!q.value); });
  fb.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = q.value.trim();
    if (!t) { q.focus(); return; }
    entender(t);
  });
  function entender(t) {
    var s = semAcento(t), cod = s.match(/lp-?\s?(\d{4})/);
    if (cod && porId['LP-' + cod[1]]) { abrirFicha('LP-' + cod[1]); return; }
    var n = JSON.parse(JSON.stringify(VAZIO)), lido = [];
    n.modo = /compr|venda|vender|a venda/.test(s) ? 'venda' : /alug|locac/.test(s) ? 'aluguel' : S.modo;
    if (n.modo !== S.modo) lido.push(n.modo === 'aluguel' ? 'alugar' : 'comprar');
    BAIRROS.forEach(function (b) { var k = semAcento(b); if (s.indexOf(k) > -1 || (k === 'mansoes santo antonio' && /mansoes|santo antonio/.test(s)) || (k === 'barao geraldo' && /barao/.test(s))) { n.bairro = b; lido.push(b); } });
    var mq = s.match(/(\d)\s*(\+|ou mais)?\s*(quartos?|dorm)/); if (mq) { n.qmin = mq[1]; lido.push(mq[1] + '+ quartos'); }
    var mx = s.match(/(ate|max(imo)?|menos de)\s*r?\$?\s*([\d.,]+)\s*(mil|k|mi|milh)?/);
    if (mx) {
      var v = parseFloat(mx[3].replace(/\./g, '').replace(',', '.')), u = mx[4] || '';
      v = /mi/.test(u) && u !== 'mil' ? v * 1e6 : (u === 'mil' || u === 'k') ? v * 1000 : v;
      if (n.modo === 'venda' && v < 10000) v *= 1000;
      n.pmax = String(Math.round(v)); lido.push('até ' + real(v));
    }
    [['pet', /pet|cachorro|gato/], ['vaga', /vaga|garagem/], ['pisc', /piscina/], ['mob', /mobiliad/], ['var', /varanda|sacada/], ['novo', /novo|recente/]].forEach(function (p) { if (p[1].test(s)) { n.feats.push(p[0]); lido.push($('.feats input[value="' + p[0] + '"]').nextElementSibling.textContent.toLowerCase()); } });
    [['Cobertura', /cobertura/], ['Studio', /studio|estudio|kitnet|quitinete/], ['Sobrado', /sobrado/], ['Casa em condomínio', /condominio fechado|casa em condominio/], ['Casa', /\bcasas?\b(?! em condominio)/], ['Apartamento', /apartamento|apto|\bap\b/]].forEach(function (p) { if (p[1].test(s) && n.tipos.indexOf(p[0]) < 0) { n.tipos.push(p[0]); lido.push(p[0].toLowerCase()); } });
    if (/barat|menor (preco|custo)/.test(s)) { n.ordem = 'barato'; lido.push('menor custo primeiro'); }
    else if (/caro/.test(s)) { n.ordem = 'caro'; lido.push('maior custo primeiro'); }
    else if (/maior|grande|espaco/.test(s)) { n.ordem = 'area'; lido.push('maior área primeiro'); }
    if (!lido.length) { n.texto = t; lido.push('“' + esc(t) + '”'); }
    S = n; render();
    aviso('Entendi: <b>' + lido.join(' · ') + '</b> → ' + plural(lista.length, 'imóvel', 'imóveis'), 4600);
    irTopoLista();
  }

  // ---------- modo e vistas ----------
  function setModo(m) { if (S.modo !== m) { S.modo = m; S.pmin = S.pmax = ''; } render(); irTopoLista(); }
  function setVista(v) {
    document.body.dataset.vista = v;
    $$('.vistas button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.vista === v)); });
    $$('.abas-cel [data-cel]').forEach(function (b) { b.setAttribute('aria-current', String((b.dataset.cel === 'mapa') === (v === 'mapa'))); });
    fecharPop();
    render(true);
    if (v !== 'grade') { mapaEnquadra(); }
    if (v !== 'grade') scrollTo(0, 0);
  }

  // ---------- mapa ilustrativo de Campinas ----------
  var NS = 'http://www.w3.org/2000/svg';
  var CENTRO = { 'Cambuí': [505, 415], 'Centro': [415, 445], 'Guanabara': [440, 345], 'Taquaral': [595, 318], 'Nova Campinas': [578, 478], 'Mansões Santo Antônio': [705, 232], 'Barão Geraldo': [560, 112] };
  var OFF = [[0, 0], [52, -34], [-50, 30], [44, 40], [-46, -36]];
  var svg = $('.mapa-svg'), G = $('.mapa-g'), CX = $('#mapa');
  var cam = { k: 1.5, tx: 0, ty: 0 }, camada = 'ruas', pinSel = null;
  function el(tag, at, pai) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (pai) pai.appendChild(e); return e; }
  function rnd(s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function montarMapa() {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    var fundo = el('g', {}, G);
    el('rect', { x: -3000, y: -3000, width: 7000, height: 7000, fill: 'var(--mapa-terra)' }, fundo);
    // áreas verdes e água
    [['M 500 40 C 560 10 660 30 650 95 C 640 150 560 160 520 130 C 480 105 460 70 500 40 Z'], ['M 545 280 C 580 250 650 262 652 305 C 655 350 590 362 560 345 C 530 330 520 300 545 280 Z'], ['M 380 505 C 400 490 440 492 446 515 C 452 540 418 552 396 545 C 376 538 366 518 380 505 Z'], ['M 820 120 C 860 100 930 130 925 180 C 918 230 850 236 826 205 C 805 178 800 135 820 120 Z'], ['M 230 560 C 280 540 330 570 318 610 C 304 650 240 650 222 618 C 210 595 205 572 230 560 Z']].forEach(function (p) { el('path', { d: p[0], class: 'm-verde' }, fundo); });
    el('ellipse', { cx: 600, cy: 300, rx: 34, ry: 19, class: 'm-agua', transform: 'rotate(-18 600 300)' }, fundo);
    el('path', { d: 'M 1040 20 C 960 60 900 40 840 70 C 790 95 760 60 700 40 C 650 22 610 -10 560 -40', fill: 'none', stroke: 'var(--mapa-agua)', 'stroke-width': 6, 'stroke-linecap': 'round' }, fundo);
    el('path', { d: 'M -40 640 C 60 610 120 650 200 630 C 260 615 300 660 380 700 L 380 760', fill: 'none', stroke: 'var(--mapa-agua)', 'stroke-width': 5, 'stroke-linecap': 'round' }, fundo);
    // bairros (para o mapa de custo): desenhados depois das ruas, por cima
    var gb = el('g', { class: 'bairros' });
    Object.keys(CENTRO).forEach(function (b, bi) {
      var c = CENTRO[b], r = rnd(bi * 97 + 13), pts = [], R = b === 'Barão Geraldo' || b === 'Mansões Santo Antônio' ? 92 : b === 'Centro' || b === 'Cambuí' ? 58 : 70;
      for (var i = 0; i < 14; i++) { var th = i / 14 * Math.PI * 2, rr = R * (0.82 + r() * 0.3); pts.push((c[0] + Math.cos(th) * rr).toFixed(1) + ',' + (c[1] + Math.sin(th) * rr * 0.85).toFixed(1)); }
      el('polygon', { points: pts.join(' '), class: 'm-bairro', 'data-b': b }, gb);
    });
    // ruas de bairro
    var gr = el('g', {}, fundo), linhas = [];
    Object.keys(CENTRO).forEach(function (b, bi) {
      var c = CENTRO[b], ang = (bi * 23 + 8) * Math.PI / 180, R = b === 'Barão Geraldo' || b === 'Mansões Santo Antônio' ? 95 : 72;
      [ang, ang + Math.PI / 2].forEach(function (a) {
        var dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
        for (var o = -R + 8; o < R; o += 15) { var h = Math.sqrt(R * R - o * o); linhas.push('M' + (c[0] + px * o - dx * h).toFixed(1) + ' ' + (c[1] + py * o - dy * h).toFixed(1) + 'L' + (c[0] + px * o + dx * h).toFixed(1) + ' ' + (c[1] + py * o + dy * h).toFixed(1)); }
      });
    });
    el('path', { d: linhas.join(''), class: 'm-rua-b', 'stroke-width': 3.4 }, gr);
    el('path', { d: linhas.join(''), class: 'm-rua', 'stroke-width': 1.8 }, gr);
    // avenidas e rodovias
    var AV = ['M 300 330 C 380 345 450 370 540 392 S 700 430 780 470', 'M 470 700 C 478 600 480 500 490 430 S 520 300 560 180', 'M 360 470 C 440 450 520 430 600 350 S 690 270 720 240', 'M 380 560 C 395 500 410 450 432 360', 'M 560 -20 L 560 190 C 562 240 575 280 590 318', 'M 405 448 C 380 530 350 600 300 720', 'M 560 480 C 620 520 700 540 820 560', 'M 505 415 C 560 390 600 380 640 345'];
    AV.forEach(function (d) { el('path', { d: d, class: 'm-rua-b', 'stroke-width': 6 }, gr); el('path', { d: d, class: 'm-rua', 'stroke-width': 4 }, gr); });
    var VIA = ['M -80 760 C 120 600 240 480 300 360 S 330 120 280 -60', 'M 120 20 C 300 120 460 175 640 172 S 900 150 1080 230'];
    VIA.forEach(function (d) { el('path', { d: d, class: 'm-via-b' }, gr); el('path', { d: d, class: 'm-via' }, gr); });
    fundo.appendChild(gb);
    el('g', { class: 'm-sobre' }, svg);
    camadaBairros();
  }
  var ROTULOS = [['Lagoa do Taquaral', 598, 334, 'p'], ['Unicamp', 560, 66, 'p'], ['Bosque dos Jequitibás', 410, 568, 'p'], ['Shopping Iguatemi', 690, 520, 'p'], ['Parque Ecológico', 875, 168, 'p']];
  var PLACAS = [['SP-330', 296, 250], ['SP-065', 760, 160], ['SP-330', 190, 545]];
  function tela(x, y) { return [cam.tx + cam.k * x, cam.ty + cam.k * y]; }
  function aplicaCam() { G.setAttribute('transform', 'translate(' + cam.tx.toFixed(1) + ' ' + cam.ty.toFixed(1) + ') scale(' + cam.k.toFixed(3) + ')'); pinos(); }
  function visivel() {
    var r = svg.getBoundingClientRect(); if (!r.width) return null;
    var s = Math.max(r.width / 1000, r.height / 700); return { s: s, w: r.width / s, h: r.height / s, x0: 500 - r.width / s / 2, y0: 350 - r.height / s / 2 };
  }
  function mapaEnquadra(px, py, k) {
    var v = visivel(); if (!v) return;
    var kk = k || Math.max(0.7, Math.min(v.w / 380, v.h / 470, 2.4));
    var cx = px == null ? 565 : px, cy = py == null ? 345 : py;
    cam.k = kk; cam.tx = 500 - kk * cx; cam.ty = 350 - kk * cy; aplicaCam();
  }
  function zoom(f, ox, oy) {
    var nk = Math.max(0.6, Math.min(5, cam.k * f)); if (nk === cam.k) return;
    if (ox == null) { ox = 500; oy = 350; }
    var wx = (ox - cam.tx) / cam.k, wy = (oy - cam.ty) / cam.k;
    cam.k = nk; cam.tx = ox - nk * wx; cam.ty = oy - nk * wy; aplicaCam();
  }
  function rotuloPin(x) { return x.m === 'aluguel' ? real(custo(x)) : x.v >= 1e6 ? 'R$ ' + (x.v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(x.v / 1000) + ' mil'; }
  function pinos() {
    var sob = $('.m-sobre', svg); if (!sob || document.body.dataset.vista === 'grade') return;
    sob.innerHTML = '';
    ROTULOS.forEach(function (r) { var p = tela(r[1], r[2]); el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', class: 'm-rot m-rot-p' }, sob).textContent = r[0]; });
    PLACAS.forEach(function (r) { var p = tela(r[1], r[2]), g = el('g', { transform: 'translate(' + p[0] + ' ' + p[1] + ')' }, sob); el('rect', { x: -20, y: -8, width: 40, height: 16, rx: 3, class: 'm-placa' }, g); el('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'm-esc' }, g).textContent = r[0]; });
    Object.keys(CENTRO).forEach(function (b) { var p = tela(CENTRO[b][0], CENTRO[b][1] + 46); el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', class: 'm-rot' }, sob).textContent = b; });
    var grupos = {};
    lista.forEach(function (x) { (grupos[x.b] = grupos[x.b] || []).push(x); });
    Object.keys(grupos).forEach(function (b) {
      var gl = grupos[b], c = CENTRO[b];
      if (cam.k < 1.6 && gl.length > 1) {
        var p = tela(c[0], c[1]), g = el('g', { class: 'grupo-pin', transform: 'translate(' + p[0] + ' ' + p[1] + ')', 'data-zoom': b, tabindex: 0, role: 'button', 'aria-label': plural(gl.length, 'imóvel', 'imóveis') + ' no ' + b + ', aproximar' }, sob);
        el('circle', { r: 17 }, g); el('text', { y: 4.5, 'text-anchor': 'middle' }, g).textContent = gl.length;
        return;
      }
      gl.forEach(function (x, i) {
        var o = OFF[i % OFF.length], p = tela(c[0] + o[0] / Math.max(1, cam.k / 1.6), c[1] + o[1] / Math.max(1, cam.k / 1.6)), tx = rotuloPin(x), w = tx.length * 7.4 + 16;
        var g = el('g', { class: 'pin' + (pinSel === x.id ? ' on' : ''), transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')', 'data-pin': x.id, tabindex: 0, role: 'button', 'aria-label': x.t + ' no ' + x.b + ', ' + tx }, sob);
        el('rect', { x: -w / 2, y: -34, width: w, height: 25, rx: 2 }, g); el('path', { d: 'M-6 -9.5L0 -2L6 -9.5Z' }, g);
        el('text', { x: 0, y: -17, 'text-anchor': 'middle' }, g).textContent = tx;
      });
    });
    camadaBairros();
  }
  function camadaBairros() {
    var on = camada === 'bairros'; CX.classList.toggle('camada-bairros', on);
    var leg = $('.legenda'); leg.hidden = !on;
    var med = {}; IM.filter(function (x) { return x.m === S.modo; }).forEach(function (x) { var m = med[x.b] = med[x.b] || [0, 0]; m[0] += S.modo === 'aluguel' ? custo(x) / x.a : x.v / x.a; m[1]++; });
    var vals = Object.keys(med).map(function (b) { return med[b][0] / med[b][1]; }), lo = Math.min.apply(0, vals), hi = Math.max.apply(0, vals);
    var cor = function (t) { return 'hsl(' + (214 - t * 4) + ', ' + (70 + t * 15) + '%, ' + (86 - t * 40) + '%)'; };
    $$('.m-bairro', svg).forEach(function (p) { var m = med[p.dataset.b]; p.style.fill = on ? (m ? cor((m[0] / m[1] - lo) / ((hi - lo) || 1)) : 'var(--linha)') : ''; p.style.fillOpacity = on ? .62 : ''; });
    if (on) {
      var f = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR') + '/m²'; };
      leg.innerHTML = '<b>' + (S.modo === 'aluguel' ? 'Custo do mês por m²' : 'Preço de venda por m²') + '</b>Média dos nossos anúncios em cada bairro<div class="esc">' + [0, .25, .5, .75, 1].map(function (t) { return '<i style="background:' + cor(t) + '"></i>'; }).join('') + '</div><div class="esc-tx"><span>' + f(lo) + '</span><span>' + f(hi) + '</span></div>';
    }
  }
  function abrirPop(id) {
    var x = porId[id], pop = $('.mapa-pop');
    pinSel = id; pinos();
    pop.innerHTML = '<img src="' + foto(x.f[0]) + '" alt="' + esc(x.t) + '"><div><p class="c-tipo">' + x.tipo + ' · ' + x.b + '</p><p class="c-preco">' + precoHTML(x) + '</p><p class="c-soma">' + x.a + ' m² · ' + plural(x.q, 'quarto') + ' · ' + plural(x.vg, 'vaga') + '</p><button type="button" class="mini-bt" data-ver="' + x.id + '">Ver detalhes e agendar visita →</button></div><button type="button" class="x" data-fecha-pop aria-label="Fechar">×</button>';
    pop.hidden = false;
  }
  function fecharPop() { $('.mapa-pop').hidden = true; if (pinSel) { pinSel = null; pinos(); } $$('.card.marcado').forEach(function (c) { c.classList.remove('marcado'); }); }
  function clicaPin(id) {
    if (document.body.dataset.vista === 'hibrido' && innerWidth > 760) {
      pinSel = id; pinos(); $$('.card').forEach(function (c) { c.classList.toggle('marcado', c.dataset.id === id); });
      var c = $('.card[data-id="' + id + '"]'); if (c) c.scrollIntoView({ block: 'center', behavior: reduz ? 'auto' : 'smooth' });
    } else abrirPop(id);
  }
  // arrastar e roda do mouse
  var arr = null;
  CX.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, .pin, .grupo-pin, .mapa-pop, .legenda')) return;
    var v = visivel(); arr = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, s: v.s, mov: 0 }; CX.setPointerCapture(e.pointerId); CX.classList.add('arrasta');
  });
  CX.addEventListener('pointermove', function (e) {
    if (!arr) return; var dx = e.clientX - arr.x, dy = e.clientY - arr.y; arr.mov = Math.abs(dx) + Math.abs(dy);
    cam.tx = arr.tx + dx / arr.s; cam.ty = arr.ty + dy / arr.s; G.setAttribute('transform', 'translate(' + cam.tx + ' ' + cam.ty + ') scale(' + cam.k + ')');
    clearTimeout(arr.t); arr.t = setTimeout(pinos, 30);
  });
  var soltar = function () { if (arr) { CX.classList.remove('arrasta'); pinos(); arr = null; } };
  CX.addEventListener('pointerup', soltar); CX.addEventListener('pointercancel', soltar);
  CX.addEventListener('wheel', function (e) {
    e.preventDefault(); var v = visivel(), r = svg.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, v.x0 + (e.clientX - r.left) / v.s, v.y0 + (e.clientY - r.top) / v.s);
  }, { passive: false });
  CX.addEventListener('keydown', function (e) {
    var p = e.target.closest('[data-pin],[data-zoom]'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); p.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });

  // ---------- filtros ----------
  var FT = $('#filtros'), ff = $('form', FT), ultimoFoco = null;
  var selB = ff.bairro; BAIRROS.forEach(function (b) { var o = document.createElement('option'); o.textContent = b; selB.appendChild(o); });
  function abrirCamada(c) { ultimoFoco = document.activeElement; c.hidden = false; document.body.style.overflow = 'hidden'; var f = $('input, select, button:not(.x), .x', $('.painel', c)); if (f) f.focus({ preventScroll: true }); }
  function fecharCamada(c) { c.hidden = true; if ($('#ficha').hidden) document.body.style.overflow = ''; if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true }); }
  function preencheFiltros(st) {
    ff.modo.value = st.modo; ff.bairro.value = st.bairro; ff.ordem.value = st.ordem;
    ['pmin', 'pmax', 'qmin', 'qmax', 'bmin', 'bmax', 'amin', 'amax', 'vmin', 'vmax', 'ymin', 'ymax', 'cmin', 'cmax'].forEach(function (k) { ff[k].value = st[k] || ''; });
    $$('input[name=tipo]', ff).forEach(function (i) { i.checked = st.tipos.indexOf(i.value) > -1; });
    $$('input[name=feat]', ff).forEach(function (i) { i.checked = st.feats.indexOf(i.value) > -1; });
    contaRascunho();
  }
  function rascunho() {
    var n = JSON.parse(JSON.stringify(VAZIO));
    n.modo = ff.modo.value; n.bairro = ff.bairro.value; n.ordem = ff.ordem.value; n.texto = S.texto;
    ['pmin', 'pmax', 'qmin', 'qmax', 'bmin', 'bmax', 'amin', 'amax', 'vmin', 'vmax', 'ymin', 'ymax', 'cmin', 'cmax'].forEach(function (k) { n[k] = ff[k].value; });
    n.tipos = $$('input[name=tipo]:checked', ff).map(function (i) { return i.value; });
    n.feats = $$('input[name=feat]:checked', ff).map(function (i) { return i.value; });
    return n;
  }
  function contaRascunho() {
    var n = filtrar(rascunho()).length;
    $('.ft-n', FT).textContent = plural(n, 'imóvel', 'imóveis') + (ff.modo.value === 'aluguel' ? ' para alugar' : ' à venda');
    $('.ft-ok', FT).textContent = n ? 'Mostrar ' + plural(n, 'resultado') : 'Nenhum resultado';
    $('.rot-preco', FT).textContent = ff.modo.value === 'aluguel' ? 'Custo total por mês (R$)' : 'Preço de venda (R$)';
  }
  ff.addEventListener('input', contaRascunho); ff.addEventListener('change', contaRascunho);
  ff.addEventListener('submit', function (e) { e.preventDefault(); S = rascunho(); fecharCamada(FT); render(); irTopoLista(); });
  $('.ft-limpa', FT).addEventListener('click', function () { var m = ff.modo.value; preencheFiltros(Object.assign(JSON.parse(JSON.stringify(VAZIO)), { modo: m })); S.texto = ''; contaRascunho(); });

  // ---------- comparação ----------
  function barraCmp() {
    var b = $('.barra-cmp'); b.hidden = !cmp.length;
    $('.cmp-n', b).textContent = cmp.length + ' de 4 selecionados';
    $('.cmp-fotos', b).innerHTML = cmp.map(function (id) { var x = porId[id]; return '<li><img src="' + foto(x.f[0]) + '" alt="' + esc(x.t) + ' no ' + esc(x.b) + '"><button type="button" data-cmp="' + id + '" aria-label="Tirar da comparação">×</button></li>'; }).join('');
    $('.cmp-ir', b).disabled = cmp.length < 2;
    $('.cmp-ir', b).title = cmp.length < 2 ? 'Escolha pelo menos 2 imóveis' : '';
  }
  function alternaCmp(id) {
    var k = cmp.indexOf(id);
    if (k > -1) cmp.splice(k, 1);
    else if (cmp.length >= 4) { aviso('Dá para comparar até <b>4 imóveis</b> de cada vez.'); return; }
    else cmp.push(id);
    $$('[data-cmp="' + id + '"][aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', String(k < 0)); });
    barraCmp();
  }
  function abrirComparar() {
    var xs = cmp.map(function (id) { return porId[id]; });
    var linhas = [
      ['Custo por mês', function (x) { return x.m === 'aluguel' ? custo(x) : parcela(x) + x.c + x.ip; }, real, 'min', function (x) { return x.m === 'venda' ? ' <small>(parcela + taxas)</small>' : ''; }],
      ['Preço', function (x) { return x.v; }, function (v, x) { return x.m === 'aluguel' ? real(v) + '/mês' : mil(v); }, 'min'],
      ['Condomínio', function (x) { return x.c; }, real, 'min'],
      ['IPTU por mês', function (x) { return x.ip; }, real, 'min'],
      ['Área útil', function (x) { return x.a; }, function (v) { return v + ' m²'; }, 'max'],
      ['R$ por m²', function (x) { return x.m === 'aluguel' ? custo(x) / x.a : x.v / x.a; }, real, 'min'],
      ['Quartos', function (x) { return x.q; }, String, 'max'],
      ['Banheiros', function (x) { return x.bh; }, String, 'max'],
      ['Vagas', function (x) { return x.vg; }, String, 'max'],
      ['Ano', function (x) { return x.ano; }, String, 'max'],
      ['Aceita pet', function (x) { return x.pet; }, function (v) { return v ? 'Sim' : 'Não'; }, 'max'],
      ['Dias no site', function (x) { return x.d; }, String, '']
    ];
    var h = '<div class="tab-rola"><table class="tabela"><thead><tr><th></th>' + xs.map(function (x) { return '<th class="cp-topo"><img src="' + foto(x.f[0]) + '" alt=""><b>' + esc(x.t) + '</b><small>' + x.b + ' · ' + x.id + '</small></th>'; }).join('') + '</tr></thead><tbody>';
    linhas.forEach(function (l) {
      var vs = xs.map(l[1]), alvo = l[3] === 'min' ? Math.min.apply(0, vs) : l[3] === 'max' ? Math.max.apply(0, vs) : null, iguais = vs.every(function (v) { return v === vs[0]; });
      h += '<tr><th scope="row">' + l[0] + '</th>' + xs.map(function (x, i) { return '<td' + (alvo !== null && !iguais && vs[i] === alvo ? ' class="melhor"' : '') + '>' + l[2](vs[i], x) + (l[4] ? l[4](x) : '') + '</td>'; }).join('') + '</tr>';
    });
    h += '<tr><th></th>' + xs.map(function (x) { return '<td><button type="button" class="link" data-ver="' + x.id + '">Ver ficha →</button></td>'; }).join('') + '</tr></tbody></table></div>';
    $('.cp-corpo').innerHTML = h;
    abrirCamada($('#comparar'));
  }

  // ---------- ficha do imóvel ----------
  var FC = $('#ficha'), fichaAtual = null, empurrou = false;
  function descricao(x) {
    var t = x.t + ' de ' + x.a + ' m² no ' + x.b + ', com ' + plural(x.q, 'quarto') + ', ' + plural(x.bh, 'banheiro') + ' e ' + (x.vg ? plural(x.vg, 'vaga') : 'sem vaga') + '. ';
    var extra = [];
    if (x.pisc) extra.push('piscina'); if (x.vr) extra.push('varanda'); if (x.mob) extra.push('móveis planejados e eletrodomésticos');
    if (extra.length) t += 'Tem ' + extra.join(', ').replace(/, ([^,]*)$/, ' e $1') + '. ';
    t += x.pet ? 'Aceita animais de estimação. ' : 'O condomínio não aceita animais. ';
    t += SOBRE[x.b] + ' ';
    t += x.m === 'aluguel' ? 'O custo do mês inteiro é ' + real(custo(x)) + ', com aluguel, condomínio, IPTU e seguro incêndio já somados. Dá para alugar sem fiador, com seguro-fiança ou caução de 3 aluguéis.'
      : 'Com 20% de entrada (' + mil(x.v * 0.2) + ') e financiamento em 30 anos, a primeira parcela fica perto de ' + real(parcela(x)) + ' na tabela SAC, e cai todo mês.';
    return t;
  }
  function slots() {
    var dias = [];
    for (var k = 1; dias.length < 3; k++) { var dt = new Date(hoje); dt.setDate(dt.getDate() + k); if (dt.getDay()) dias.push(dt); }
    return dias.map(function (dt) { return ['10:00', '15:00', '18:30'].map(function (h) { var t = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '') + ' ' + h; return '<button type="button" data-slot="' + t + '" aria-pressed="false">' + t + '</button>'; }).join(''); }).join('');
  }
  function mapaPerto(x) {
    var r = rnd(x.a * 7 + x.v % 97), h = '<svg viewBox="0 0 400 260" role="img" aria-label="Arredores do imóvel no ' + x.b + '"><g fill="none" stroke="var(--mapa-borda)" stroke-width="3">';
    for (var i = 0; i < 9; i++) h += '<path d="M' + (i * 52 - 20) + ' -10L' + (i * 52 + 40) + ' 280"/><path d="M-10 ' + (i * 34) + 'L410 ' + (i * 34 - 30) + '"/>';
    h += '</g><g fill="none" stroke="var(--mapa-rua)" stroke-width="1.6">';
    for (i = 0; i < 9; i++) h += '<path d="M' + (i * 52 - 20) + ' -10L' + (i * 52 + 40) + ' 280"/><path d="M-10 ' + (i * 34) + 'L410 ' + (i * 34 - 30) + '"/>';
    h += '</g><path d="M40 210 C 90 180 150 200 170 240 L 40 260Z" fill="var(--mapa-verde)"/>';
    PERTO[x.b].forEach(function (p) { h += '<circle cx="' + (40 + r() * 320).toFixed(0) + '" cy="' + (30 + r() * 200).toFixed(0) + '" r="6" fill="' + p[1] + '" stroke="#fff" stroke-width="2"/>'; });
    return h + '<circle cx="200" cy="130" r="22" fill="var(--azul)" opacity=".18"/><circle cx="200" cy="130" r="9" fill="var(--azul)" stroke="#fff" stroke-width="3"/></svg>';
  }
  function fichaHTML(x, naPagina) {
    var id = x.id;
    var aluga = x.m === 'aluguel', tot = custo(x), fav = favs.indexOf(id) > -1, r = rnd(x.a * 13 + 7);
    var fotos5 = x.f.slice(); while (fotos5.length < 5) fotos5.push(x.f[fotos5.length % x.f.length]);
    var partes = aluga ? [['Aluguel', x.v, '#1b67ee'], ['Condomínio', x.c, '#7aa6f5'], ['IPTU', x.ip, '#e0912f'], ['Seguro incêndio', SEGURO, '#9a9aa4']] : null;
    var comps = IM.filter(function (y) { return y.m === x.m && y.id !== x.id; }).sort(function (a, b) { return Math.abs(custo(a) - tot) - Math.abs(custo(b) - tot); }).slice(0, 6);
    var difTag = function (v, base, fmt) { var d = v - base; if (!d) return ''; return '<span class="dif ' + (d < 0 ? 'baixo' : 'alto') + '">' + (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + '</span>'; };
    var h = '<nav class="migalha" aria-label="Caminho"><a href="index.html">Início</a><i>›</i><a href="imoveis.html?modo=' + x.m + '">' + (aluga ? 'Alugar' : 'Comprar') + '</a><i>›</i><a href="imoveis.html?modo=' + x.m + '&amp;bairro=' + encodeURIComponent(x.b) + '">' + x.b + '</a><i>›</i><span aria-current="page">' + esc(x.rua) + '</span></nav>' +
      '<div class="mosaico">' + fotos5.slice(0, 5).map(function (n, k) { return '<button type="button" data-galeria="' + k + '" aria-label="Abrir foto ' + (k + 1) + '"><img src="' + foto(n) + '" alt="' + (k ? 'Foto ' + (k + 1) + ' de ' : '') + esc(x.t) + '"' + (k ? ' loading="lazy"' : '') + '>' + (k === 4 ? '<span class="ver-todas">Ver as ' + x.f.length + ' fotos</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<nav class="fc-abas" aria-label="Seções do imóvel"><a href="#fc-geral" class="on">Visão geral</a><a href="#fc-custo">Custo</a><a href="#fc-detalhes">Detalhes</a><a href="#fc-bairro">Bairro</a><a href="#fc-comp">Comparáveis</a><a href="#fc-contato">Contato</a></nav>' +
      '<div class="fc-grade"><div>' +
      '<section class="fc-sec" id="fc-geral"><h1 id="fc-t">' + esc(x.rua) + '</h1><p class="fc-end">' + x.b + ', Campinas/SP · ' + esc(x.t) + '</p>' +
      '<div class="stats"><div><b>' + x.q + '</b><span>' + (x.q === 1 ? 'quarto' : 'quartos') + '</span></div><div><b>' + x.bh + '</b><span>' + (x.bh === 1 ? 'banheiro' : 'banheiros') + '</span></div><div><b>' + x.a + '</b><span>m² úteis</span></div><div><b>' + x.ano + '</b><span>construído</span></div></div>' +
      '<div class="chips"><span>' + x.tipo + '</span><span>' + plural(x.vg, 'vaga') + '</span>' + (x.pet ? '<span>Aceita pet</span>' : '') + (x.pisc ? '<span>Piscina</span>' : '') + (x.vr ? '<span>Varanda</span>' : '') + (x.mob ? '<span>Mobiliado</span>' : '') + '<span>Cód. ' + x.id + '</span></div>' +
      '<p class="fc-desc">' + descricao(x) + '</p></section>' +
      '<section class="fc-sec" id="fc-custo"><h2>' + (aluga ? 'Custo total do mês' : 'Quanto custa por mês') + '</h2>' +
      (aluga ? '<div class="soma-tab">' + partes.map(function (p) { return '<div><span>' + p[0] + '</span><span>' + real(p[1]) + '</span></div>'; }).join('') + '<div class="tot"><span>Total por mês</span><span>' + real(tot) + '</span></div><div><span>Para entrar</span><span><small>seguro-fiança ou caução de 3 aluguéis (' + real(x.v * 3) + ')</small></span></div></div>' +
        '<div class="barra-custo" aria-hidden="true">' + partes.map(function (p) { return '<i style="width:' + (p[1] / tot * 100).toFixed(1) + '%;background:' + p[2] + '"></i>'; }).join('') + '</div><div class="leg-custo">' + partes.map(function (p) { return '<span style="--c:' + p[2] + '">' + p[0] + ' ' + Math.round(p[1] / tot * 100) + '%</span>'; }).join('') + '</div>'
        : '<div class="simula"><label for="fc-ent"><span>Entrada</span><b class="ent-v"></b></label><input id="fc-ent" type="range" min="20" max="70" step="5" value="20"><div class="res"><div><b class="r-fin"></b><span>financiado em 30 anos</span></div><div><b class="r-par"></b><span>1ª parcela (SAC)</span></div><div><b class="r-renda"></b><span>renda mínima sugerida</span></div></div></div>' +
          '<div class="soma-tab" style="margin-top:14px"><div><span>Condomínio</span><span>' + real(x.c) + '</span></div><div><span>IPTU por mês</span><span>' + real(x.ip) + '</span></div><div class="tot"><span>1ª parcela + taxas</span><span class="r-tot"></span></div><div><span>ITBI e cartório (estimativa de 4%)</span><span>' + mil(x.v * 0.04) + '</span></div></div>') + '</section>' +
      '<section class="fc-sec" id="fc-detalhes"><h2>Detalhes de ' + esc(x.rua) + '</h2><dl class="dados"><h3>Anúncio</h3>' +
      [['Negócio', aluga ? 'Aluguel' : 'Venda'], ['Código', x.id], ['Preço', aluga ? real(x.v) + '/mês' : mil(x.v)], ['Anunciado em', dataDe(x.d)], ['Atualizado em', hoje.toLocaleDateString('pt-BR')], [x.cor.indexOf('Marcos') === 0 ? 'Corretor' : 'Corretora', x.cor]].map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('') +
      '<h3>Imóvel</h3>' + [['Tipo', x.tipo], ['Ano de construção', x.ano], ['Área útil', x.a + ' m²'], ['Quartos', x.q], ['Banheiros', x.bh], ['Vagas', x.vg], ['Condomínio', x.c ? real(x.c) + '/mês' : 'Não tem'], ['IPTU', real(x.ip) + '/mês (' + real(x.ip * 12) + '/ano)']].map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('') +
      '<h3>Características</h3>' + [['Aceita pet', x.pet ? 'Sim' : 'Não'], ['Mobiliado', x.mob ? 'Sim' : 'Não'], ['Piscina', x.pisc ? 'Sim' : 'Não'], ['Varanda', x.vr ? 'Sim' : 'Não']].map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('') + '</dl></section>' +
      '<section class="fc-sec" id="fc-bairro"><h2>' + x.b + ' <small>' + SOBRE[x.b] + '</small></h2><div class="perto"><ul>' + PERTO[x.b].map(function (p) { var m = Math.round(150 + r() * 1300); return '<li><span style="--c:' + p[1] + '">' + p[0] + '</span><span>' + (m < 1000 ? m + ' m' : (m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km') + ' · ' + Math.max(2, Math.round(m / 80)) + ' min a pé</span></li>'; }).join('') + '</ul>' + mapaPerto(x) + '</div></section>' +
      '<section class="fc-sec" id="fc-comp"><h2>Comparáveis ' + (aluga ? 'para alugar' : 'à venda') + ' <small>' + comps.length + ' anúncios com custo parecido</small></h2><div class="tab-rola"><table class="tabela"><thead><tr><th>Imóvel</th><th>' + (aluga ? 'Custo/mês' : 'Preço') + '</th><th>Área</th><th>R$/m²</th><th>Quartos</th><th>No site</th></tr></thead><tbody>' +
      comps.map(function (y) { var pm = (aluga ? custo(y) : y.v) / y.a, pmx = (aluga ? tot : x.v) / x.a; return '<tr><td><a class="link mini" href="' + paginaDe(y) + '"><img src="' + foto(y.f[0]) + '" alt=""><span>' + esc(y.t) + '<small>' + y.b + '</small></span></a></td><td>' + (aluga ? real(custo(y)) : mil(y.v)) + difTag(custo(y), tot, aluga ? real : mil) + '</td><td>' + y.a + ' m²' + difTag(y.a, x.a, function (v) { return v; }) + '</td><td>' + real(pm) + difTag(Math.round(pm), Math.round(pmx), real) + '</td><td>' + y.q + '</td><td>' + plural(y.d, 'dia') + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
      '</div><aside class="caixa-preco" aria-label="Preço e ações"><div class="cx-l1"><b>' + (aluga ? real(tot) + '<small>/mês</small>' : mil(x.v) + '<small>(' + real(x.v / x.a) + '/m²)</small>') + '</b>' + (x.d <= 3 ? '<span class="verde">Novo no site</span>' : '<span>Há ' + x.d + ' dias</span>') + '</div>' +
      '<div class="cx-l2"><span>' + (aluga ? 'Tudo incluso · aluguel ' + real(x.v) : 'Parcela estimada') + '</span><a href="#fc-custo">' + (aluga ? 'ver a conta' : real(parcela(x)) + '/mês') + '</a></div>' +
      '<button type="button" class="bt-azul" data-ir-contato="visita">Agendar visita</button><button type="button" class="cx-perg" data-ir-contato="pergunta">Fazer uma pergunta</button>' +
      '<div class="cx-ic"><button type="button" data-fav="' + id + '" aria-pressed="' + fav + '" aria-label="Salvar imóvel">' + IC.cor + '</button>' + (naPagina ? '' : '<button type="button" data-cmp="' + id + '" aria-pressed="' + (cmp.indexOf(id) > -1) + '" aria-label="Comparar">' + IC.cmp + '</button>') + '<button type="button" data-copiar aria-label="Copiar link">' + IC.share + '</button></div>' +
      '<div class="cx-cor"><i aria-hidden="true">' + x.cor.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('') + '</i><p><b>' + x.cor + '</b>' + (x.cor.indexOf('Marcos') === 0 ? 'Corretor' : 'Corretora') + ' do ' + x.b + ' · responde em até 15 min</p></div></aside></div>' +
      '<section class="fc-contato fc-sec" id="fc-contato"><img src="' + foto(x.f[0]) + '" alt="" loading="lazy"><div><p class="sobre">' + esc(x.rua) + '</p><h2>Pergunte sobre este imóvel</h2><p class="lead">Fale com ' + x.cor + ', da Lar Paulista no ' + x.b + '.</p><ol><li>Pergunte o que quiser sobre o imóvel.</li><li>Respondemos no WhatsApp em até 15 minutos, das 8h às 20h.</li><li>Perguntar ou visitar não obriga a nada.</li></ol>' +
      '<ul class="an-num"><li><b>1.240</b><span>contratos desde 2011</span></li><li><b>18 dias</b><span>média para alugar</span></li><li><b>15 min</b><span>para responder</span></li></ul></div>' +
      '<form class="fc-form"><p class="sobre">Fale com a gente</p><h3>' + esc(x.t) + ' · ' + (aluga ? real(tot) + '/mês' : mil(x.v)) + '</h3><div class="seg seg-larga" role="radiogroup" aria-label="Assunto"><label><input type="radio" name="ass" value="pergunta" checked><span>Pergunta</span></label><label><input type="radio" name="ass" value="visita"><span>Visita</span></label></div>' +
      '<div class="duas"><label>Nome<input name="nome" required autocomplete="name"></label><label>Telefone<input name="fone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(19) 9 ____-____"></label></div>' +
      '<label class="f-msg">Mensagem<textarea name="msg" placeholder="Ex.: o condomínio tem academia? Posso levar meu cachorro?"></textarea></label><div class="f-vis" hidden><p class="rot" style="margin:0">Escolha um horário</p><div class="slots">' + slots() + '</div></div>' +
      '<button type="submit" class="bt-azul">Enviar pergunta</button></form></section>';
    return h;
  }
  // a ficha completa agora é a página própria do imóvel (imovel-<nome>.html)
  function abrirFicha(id) { var x = porId[id]; if (x) location.href = paginaDe(x); }
  function simula(x) {
    var rg = $('#fc-ent'), f = function () {
      var e = rg.value / 100, fin = x.v * (1 - e), p = fin / 360 + fin * JURO;
      $('.ent-v').textContent = rg.value + '% · ' + mil(x.v * e); $('.r-fin').textContent = mil(fin); $('.r-par').textContent = real(p); $('.r-renda').textContent = real(p / 0.3); $('.r-tot').textContent = real(p + x.c + x.ip);
    };
    rg.addEventListener('input', f); f();
  }
  var obs = null;
  function abasObs() {
    if (obs) obs.disconnect();
    var abas = $$('.fc-abas a', FC);
    obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) abas.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { root: FC, rootMargin: '-15% 0px -70% 0px' });
    $$('.fc-sec', FC).forEach(function (s) { obs.observe(s); });
  }
  function fecharFicha(doHist) {
    if (FC.hidden) return;
    FC.hidden = true; document.body.style.overflow = ''; fichaAtual = null; if (obs) obs.disconnect();
    if (doHist && empurrou) { empurrou = false; history.back(); }
    else if (/^#imovel-/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    render(true);
  }
  addEventListener('popstate', function () {
    var m = location.hash.match(/^#imovel-(LP-\d{4})$/);
    if (m) abrirFicha(m[1], true); else { empurrou = false; fecharFicha(false); }
  });
  FC.addEventListener('change', function (e) {
    if (e.target.name === 'ass') {
      var vis = e.target.value === 'visita', fm = e.target.form;
      $('.f-vis', fm).hidden = !vis; $('.f-msg', fm).hidden = vis; $('button[type=submit]', fm).textContent = vis ? 'Pedir visita' : 'Enviar pergunta';
    }
  });
  FC.addEventListener('submit', function (e) {
    e.preventDefault(); var fm = e.target, x = porId[fichaAtual], vis = fm.ass.value === 'visita';
    var sl = $('[data-slot][aria-pressed="true"]', fm);
    if (vis && !sl) { aviso('Escolha um <b>horário</b> para a visita.'); return; }
    var txt = 'Olá, Lar Paulista! Sou ' + (fm.nome.value.trim() || 'cliente') + (fm.fone.value.trim() ? ' (' + fm.fone.value.trim() + ')' : '') + '. ' +
      (vis ? 'Quero visitar ' : 'Tenho uma pergunta sobre ') + x.t + ' na ' + x.rua + ', ' + x.b + ' (cód. ' + x.id + ', ' + (x.m === 'aluguel' ? real(custo(x)) + '/mês tudo incluso' : mil(x.v)) + ')' +
      (vis ? '. Horário: ' + sl.dataset.slot + '.' : (fm.msg.value.trim() ? ': ' + fm.msg.value.trim() : '.'));
    if (window.BR_WA) window.BR_WA(txt);
  });
  function irContato(tipo) {
    var c = $('#fc-contato', FC); c.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
    var r = $('input[name=ass][value="' + tipo + '"]', c); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // galeria
  var GL = $('#galeria'), gi = 0;
  function galeria(k) { var x = porId[fichaAtual]; gi = (k + x.f.length) % x.f.length; $('img', GL).src = foto(x.f[gi]); $('img', GL).alt = 'Foto ' + (gi + 1) + ' de ' + x.t; $('.gl-n', GL).textContent = (gi + 1) + ' de ' + x.f.length; if (GL.hidden) { GL.hidden = false; $('.gl-x', GL).focus(); } }
  $('.gl-ant', GL).addEventListener('click', function () { galeria(gi - 1); });
  $('.gl-prox', GL).addEventListener('click', function () { galeria(gi + 1); });
  $('.gl-x', GL).addEventListener('click', function () { GL.hidden = true; });
  GL.addEventListener('click', function (e) { if (e.target === GL) GL.hidden = true; });

  // ---------- tema ----------
  function tema(t, guardar) {
    var h = document.documentElement;
    if (t === 'sistema') h.removeAttribute('data-tema'); else h.setAttribute('data-tema', t);
    $$('.tema button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tema === t)); });
    var esc = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name=theme-color]').setAttribute('content', esc ? '#15161b' : '#ffffff');
    if (guardar) try { localStorage.setItem('lp-tema', t); } catch (e) {}
  }
  try { tema(localStorage.getItem('lp-tema') || 'sistema'); } catch (e) { tema('sistema'); }

  // ---------- cliques ----------
  var menuU = $('.menu-u'), btU = $('.bt-u');
  function menuUsuario(abre) { menuU.hidden = !abre; btU.setAttribute('aria-expanded', String(abre)); }
  document.addEventListener('click', function (e) {
    var t = e.target, a;
    if (!t.closest('.usuario') && !menuU.hidden) menuUsuario(false);
    if ((a = t.closest('.bt-u'))) { menuUsuario(menuU.hidden); return; }
    if ((a = t.closest('[data-tema]'))) { tema(a.dataset.tema, true); return; }
    if ((a = t.closest('[data-so-salvos]'))) {
      menuUsuario(false); fecharFicha(true);
      if (!favs.length) { aviso('Toque no <b>coração</b> de um imóvel para salvar e ver aqui depois.'); return; }
      var modo = porId[favs[0]].m; S = JSON.parse(JSON.stringify(VAZIO)); S.modo = favs.some(function (k) { return porId[k].m === S.modo; }) ? S.modo : modo; S.feats = ['fav'];
      if (document.body.dataset.vista === 'mapa') setVista('grade'); else render();
      irTopoLista(); aviso('Mostrando os seus <b>' + plural(favs.length, 'imóvel salvo', 'imóveis salvos') + '</b>.'); return;
    }
    if ((a = t.closest('[data-modo]'))) { e.preventDefault(); fecharFicha(true); setModo(a.dataset.modo); return; }
    if ((a = t.closest('[data-ir-topo]'))) { e.preventDefault(); fecharFicha(true); scrollTo({ top: 0, behavior: reduz ? 'auto' : 'smooth' }); return; }
    if ((a = t.closest('a[href="#anunciar"]'))) { e.preventDefault(); fecharFicha(true); menuUsuario(false); if (document.body.dataset.vista === 'mapa') setVista('grade'); $('#anunciar').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' }); return; }
    if ((a = t.closest('.vistas [data-vista]'))) { setVista(a.dataset.vista); return; }
    if ((a = t.closest('[data-cel]'))) { fecharFicha(true); setVista(a.dataset.cel === 'mapa' ? 'mapa' : 'grade'); if (a.dataset.cel === 'lista') { q.focus(); } return; }
    if ((a = t.closest('[data-abre="filtros"]'))) { preencheFiltros(S); abrirCamada(FT); return; }
    if ((a = t.closest('[data-fecha]'))) { fecharCamada(a.closest('.camada')); return; }
    if (t.classList && t.classList.contains('camada')) { fecharCamada(t); return; }
    if ((a = t.closest('[data-limpar]'))) { S = Object.assign(JSON.parse(JSON.stringify(VAZIO)), { modo: S.modo }); q.value = ''; fb.classList.remove('cheia'); render(); return; }
    if ((a = t.closest('[data-pag]'))) { pagina = +a.dataset.pag; render(true); irTopoLista(); return; }
    if ((a = t.closest('[data-foto]'))) {
      var tr = $('.trilho', a.closest('.foto')), n = tr.children.length, i = (+tr.dataset.i + +a.dataset.foto + n) % n;
      tr.dataset.i = i; tr.style.transform = 'translateX(' + (-i * 100) + '%)';
      $$('.pontos i', a.closest('.foto')).forEach(function (p, k) { p.classList.toggle('on', k === i); }); return;
    }
    if ((a = t.closest('[data-fav]'))) {
      var id = a.dataset.fav, k = favs.indexOf(id); if (k > -1) favs.splice(k, 1); else favs.push(id); guardaFav();
      $$('[data-fav="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(k < 0)); });
      contarSalvos(); if (k < 0) aviso('Salvo. Veja os seus imóveis em <b>Minha conta → Imóveis salvos</b>.');
      if (S.feats.indexOf('fav') > -1) render(true); return;
    }
    if ((a = t.closest('[data-cmp]'))) { alternaCmp(a.dataset.cmp); return; }
    if ((a = t.closest('.cmp-limpa'))) { cmp = []; $$('[data-cmp][aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); barraCmp(); return; }
    if ((a = t.closest('.cmp-ir'))) { if (cmp.length > 1) abrirComparar(); return; }
    if ((a = t.closest('[data-ver]'))) { var cam2 = a.closest('.camada'); if (cam2) fecharCamada(cam2); abrirFicha(a.dataset.ver, !FC.hidden && empurrou ? false : false); return; }
    if ((a = t.closest('[data-fecha-ficha]'))) { fecharFicha(true); return; }
    if ((a = t.closest('[data-galeria]'))) { galeria(+a.dataset.galeria % porId[fichaAtual].f.length); return; }
    if ((a = t.closest('[data-ir-contato]'))) { irContato(a.dataset.irContato); return; }
    if ((a = t.closest('.fc-abas a'))) { e.preventDefault(); $(a.getAttribute('href'), FC).scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' }); return; }
    if ((a = t.closest('.cx-l2 a'))) { e.preventDefault(); $('#fc-custo', FC).scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' }); return; }
    if ((a = t.closest('[data-slot]'))) { $$('[data-slot]', a.closest('.slots')).forEach(function (b) { b.setAttribute('aria-pressed', String(b === a)); }); return; }
    if ((a = t.closest('[data-copiar]'))) {
      var url = location.href; try { navigator.clipboard.writeText(url).then(function () { aviso('Link do imóvel <b>copiado</b>.'); }, function () { aviso('Copie o link na barra do navegador.'); }); } catch (er) { aviso('Copie o link na barra do navegador.'); } return;
    }
    if ((a = t.closest('[data-pin]'))) { if (!arr || !arr.mov) clicaPin(a.dataset.pin); return; }
    if ((a = t.closest('[data-zoom]'))) { var c = CENTRO[a.dataset.zoom]; mapaEnquadra(c[0], c[1], Math.max(2.2, cam.k * 1.6)); return; }
    if ((a = t.closest('[data-fecha-pop]'))) { fecharPop(); return; }
    if ((a = t.closest('[data-mapa]'))) { var m = a.dataset.mapa; if (m === 'mais') zoom(1.35); else if (m === 'menos') zoom(1 / 1.35); else mapaEnquadra(); return; }
    if ((a = t.closest('[data-camada]'))) { camada = a.dataset.camada; $$('[data-camada]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === a)); }); camadaBairros(); return; }
  });
  // destaque do pino ao passar sobre o cartão no modo híbrido
  $('.cards').addEventListener('mouseover', function (e) {
    var c = e.target.closest('.card'); if (!c || document.body.dataset.vista !== 'hibrido') return;
    if (pinSel !== c.dataset.id) { pinSel = c.dataset.id; $$('.pin', svg).forEach(function (p) { p.classList.toggle('on', p.dataset.pin === pinSel); }); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!GL.hidden) { GL.hidden = true; return; }
    var c = $$('.camada').filter(function (x) { return !x.hidden; })[0]; if (c) { fecharCamada(c); return; }
    if (!menuU.hidden) { menuUsuario(false); btU.focus(); return; }
    if (!$('.mapa-pop').hidden) { fecharPop(); return; }
    if (!FC.hidden) fecharFicha(true);
  });
  // deslizar as fotos do cartão no celular
  var toque = null;
  $('.cards').addEventListener('touchstart', function (e) { var f = e.target.closest('.foto'); if (f) toque = { f: f, x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  $('.cards').addEventListener('touchend', function (e) {
    if (!toque) return; var dx = e.changedTouches[0].clientX - toque.x, dy = e.changedTouches[0].clientY - toque.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { var b = $('[data-foto="' + (dx < 0 ? 1 : -1) + '"]', toque.f); if (b) b.click(); }
    toque = null;
  }, { passive: true });
  addEventListener('resize', function () { if (document.body.dataset.vista !== 'grade') { clearTimeout(window.__lpR); window.__lpR = setTimeout(function () { mapaEnquadra(); }, 120); } });

  montarMapa();
  render();
  var h0 = location.hash.match(/^#imovel-(LP-\d{4})$/); if (h0) abrirFicha(h0[1]);
})();

/* Terra Nobre Negócios Rurais · comportamento do site de exemplo.
   Busca técnica, comparação, conversor de áreas, galeria, sobrevoo, formulários (mensagem pronta no WhatsApp),
   prévia do anúncio do proprietário e ficha técnica em PDF pela impressão do navegador. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };
  var MARCA = d.body.dataset.marca || 'Terra Nobre Negócios Rurais';
  var ALQ = 2.42;
  var TN = window.TN || { props: [], apt: {}, tipo: {}, neg: {}, grupo: {} };

  function nf(x, dec) { return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function nfa(ha) { return ha >= 100 ? nf(ha) : ha >= 10 ? nf(ha, ha % 1 ? 1 : 0) : nf(ha, 2); }
  function alq(ha) { var a = ha / ALQ; return a >= 100 ? nf(a) : nf(a, 1); }
  function dinheiro(v) {
    if (v >= 1e6) return 'R$ ' + nf(v / 1e6, 1).replace(/,0$/, '') + ' milhões';
    if (v >= 1e3) return 'R$ ' + nf(v / 1e3) + ' mil';
    return 'R$ ' + nf(v);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function wa(msg) { if (window.BR_WA) window.BR_WA(msg); }
  function num(v) { if (v === '' || v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  var IC = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };

  // ---------------- menu
  var btMenu = $('.bt-menu'), menu = $('#menu');
  if (btMenu && menu) {
    btMenu.addEventListener('click', function () {
      var ab = menu.classList.toggle('aberto');
      btMenu.setAttribute('aria-expanded', ab ? 'true' : 'false');
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { menu.classList.remove('aberto'); btMenu.setAttribute('aria-expanded', 'false'); btMenu.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { menu.classList.remove('aberto'); btMenu.setAttribute('aria-expanded', 'false'); } });
  }

  // ---------------- conversor de áreas e preços
  var M2 = { ha: 10000, alq: 24200, alqmg: 48400, m2: 1, acre: 4046.86 };
  $$('[data-conv]').forEach(function (box) {
    var v = $('[data-conv-v]', box), u = $('[data-conv-u]', box), p = $('[data-conv-p]', box), pu = $('[data-conv-pu]', box);
    function calc() {
      var m2 = (num(v.value) || 0) * M2[u.value];
      $('[data-o="ha"]', box).textContent = nf(m2 / 1e4, m2 / 1e4 < 100 ? 2 : 0);
      $('[data-o="alq"]', box).textContent = nf(m2 / 24200, m2 / 24200 < 100 ? 2 : 0);
      $('[data-o="alqmg"]', box).textContent = nf(m2 / 48400, m2 / 48400 < 100 ? 2 : 0);
      $('[data-o="m2"]', box).textContent = nf(m2);
      var pv = num(p.value) || 0, o = $('[data-o="preco"]', box);
      if (pu.value === 'alq') o.innerHTML = esc(dinheiro(pv)) + ' por alqueire paulista = <b>' + esc(dinheiro(pv / ALQ)) + ' por hectare</b>';
      else o.innerHTML = esc(dinheiro(pv)) + ' por hectare = <b>' + esc(dinheiro(pv * ALQ)) + ' por alqueire paulista</b>';
    }
    [v, u, p, pu].forEach(function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
    calc();
  });

  // ---------------- card (mesmo desenho das páginas geradas)
  function cardHTML(p, comparar, marcado) {
    var apt = p.apt.map(function (a) { return TN.apt[a]; }).join(', ');
    return '<article class="card-p">' +
      '<div class="card-foto"><img src="img/' + p.foto + '-m.webp" width="' + p.fw + '" height="' + p.fh + '" alt="' + esc(p.legenda) + '" loading="lazy"><div class="selo"><span class="neg neg-' + p.neg + '">' + TN.neg[p.neg] + '</span><span>' + p.cod + '</span></div></div>' +
      '<div class="card-corpo"><h3><a href="' + p.url + '">' + esc(p.titulo) + '</a></h3>' +
      '<p class="regiao">' + IC.pin + esc(p.regiao) + ' · local sigiloso</p>' +
      '<dl class="dados"><div class="dado"><dt>Área total</dt><dd>' + nfa(p.area) + ' ha · ' + alq(p.area) + ' alq.</dd></div>' +
      '<div class="dado"><dt>Área produtiva</dt><dd>' + nfa(p.produtiva) + ' ha</dd></div>' +
      '<div class="dado"><dt>Exploração</dt><dd>' + esc(apt) + '</dd></div>' +
      '<div class="dado"><dt>Água</dt><dd>' + esc(p.aguaRes) + '</dd></div></dl>' +
      '<div class="preco"><b>' + esc(p.precoTxt) + '</b><small>' + esc(p.precoSub) + '</small></div>' +
      (comparar ? '<div class="card-acoes"><label><input type="checkbox" data-comparar="' + p.cod + '"' + (marcado ? ' checked' : '') + '> Comparar</label></div>' : '') +
      '</div></article>';
  }

  // ---------------- busca técnica
  var app = $('#busca-app');
  if (app) (function () {
    var F = $('#filtros'), lista = $('[data-lista]'), chips = $('[data-chips]'), ordem = $('#ordem');
    var comp = [];
    var NOMES = { rio: 'Rio ou córrego', nascente: 'Nascente', represa: 'Represa ou lago', poco: 'Poço', irrigacao: 'Irrigação',
      sede: 'Sede', casas: 'Casas de colaboradores', armazem: 'Armazém ou tulha', silo: 'Silos', terreiro: 'Terreiro', curral: 'Curral', galpao: 'Galpão', baias: 'Baias',
      plana: 'Plana', suave: 'Suave ondulada', ondulada: 'Ondulada', latossolo: 'Latossolo', argissolo: 'Argissolo' };
    function vals(nome) { return $$('[name="' + nome + '"]:checked', F).map(function (i) { return i.value; }); }
    function radio(nome) { var r = $('[name="' + nome + '"]:checked', F); return r ? r.value : ''; }
    function estado() {
      var un = radio('un') || 'ha', k = un === 'alq' ? ALQ : 1;
      return {
        cod: F.cod.value.trim().toUpperCase(), neg: radio('neg'), tipo: vals('tipo'), apt: vals('apt'), regiao: vals('regiao'), un: un,
        amin: num(F.amin.value) != null ? num(F.amin.value) * k : null, amax: num(F.amax.value) != null ? num(F.amax.value) * k : null,
        lav: num(F.lav.value), pas: num(F.pas.value), rl: F.rl.checked, appok: F.appok.checked,
        pmax: num(F.pmax.value), phmax: num(F.phmax.value), semconsulta: F.semconsulta.checked,
        solo: radio('solo'), topo: vals('topo'), agua: vals('agua'), tri: F.tri.checked, benf: vals('benf'),
        asf: +F.asf.value >= 13 ? null : +F.asf.value, rod: F.rod.value, geo: F.geo.checked, car: F.car.checked
      };
    }
    function passa(p, s) {
      if (s.cod && p.cod.replace('-', '').indexOf(s.cod.replace('-', '')) < 0) return false;
      if (s.neg && p.neg !== s.neg) return false;
      if (s.tipo.length && s.tipo.indexOf(p.tipo) < 0) return false;
      if (s.apt.length && !s.apt.some(function (a) { return p.apt.indexOf(a) >= 0; })) return false;
      if (s.regiao.length && s.regiao.indexOf(p.grupo) < 0) return false;
      if (s.amin != null && p.area < s.amin - 0.01) return false;
      if (s.amax != null && p.area > s.amax + 0.01) return false;
      if (s.lav != null && p.uso.lavoura < s.lav) return false;
      if (s.pas != null && p.uso.pastagem < s.pas) return false;
      if (s.rl && !p.rl) return false;
      if (s.appok && !p.app) return false;
      if (s.semconsulta && !p.preco && p.neg === 'venda') return false;
      if (s.pmax != null && (p.neg !== 'venda' || !p.preco || p.preco > s.pmax)) return false;
      if (s.phmax != null && (p.neg !== 'venda' || !p.preco || p.preco / p.area > s.phmax)) return false;
      if (s.solo && p.solo !== s.solo) return false;
      if (s.topo.length && s.topo.indexOf(p.topo) < 0) return false;
      if (s.agua.length && !s.agua.every(function (a) { return p.agua.indexOf(a) >= 0; })) return false;
      if (s.tri && !p.trifasica) return false;
      if (s.benf.length && !s.benf.every(function (b) { return p.benf.indexOf(b) >= 0; })) return false;
      if (s.asf != null && p.asfalto > s.asf) return false;
      if (s.rod && p.rodovia !== s.rod) return false;
      if (s.geo && !p.geo) return false;
      if (s.car && !p.car) return false;
      return true;
    }
    var ORD = {
      rel: function (a, b) { return (b.destaque - a.destaque) || (a.cod < b.cod ? -1 : 1); },
      recentes: function (a, b) { return a.data < b.data ? 1 : -1; },
      pmenor: function (a, b) { return (a.preco || 9e12) - (b.preco || 9e12); },
      pmaior: function (a, b) { return (b.preco || -1) - (a.preco || -1); },
      amaior: function (a, b) { return b.area - a.area; },
      amenor: function (a, b) { return a.area - b.area; },
      phmenor: function (a, b) { return (a.preco ? a.preco / a.area : 9e12) - (b.preco ? b.preco / b.area : 9e12); },
      asf: function (a, b) { return a.asfalto - b.asfalto; }
    };
    function chipsDe(s) {
      var c = [];
      var add = function (rot, limpa) { c.push({ rot: rot, limpa: limpa }); };
      var desm = function (nome, v) { return function () { var i = $('[name="' + nome + '"][value="' + v + '"]', F); if (i) i.checked = false; }; };
      if (s.cod) add('Código: ' + s.cod, function () { F.cod.value = ''; });
      if (s.neg) add(TN.neg[s.neg], function () { $('[name="neg"][value=""]', F).checked = true; });
      s.tipo.forEach(function (v) { add(TN.tipo[v], desm('tipo', v)); });
      s.apt.forEach(function (v) { add(TN.apt[v], desm('apt', v)); });
      s.regiao.forEach(function (v) { add('Região de ' + TN.grupo[v], desm('regiao', v)); });
      var u = s.un === 'alq' ? ' alq.' : ' ha';
      if (s.amin != null) add('Área a partir de ' + F.amin.value + u, function () { F.amin.value = ''; });
      if (s.amax != null) add('Área até ' + F.amax.value + u, function () { F.amax.value = ''; });
      if (s.lav != null) add('Agricultável ≥ ' + nf(s.lav) + ' ha', function () { F.lav.value = ''; });
      if (s.pas != null) add('Pastagem ≥ ' + nf(s.pas) + ' ha', function () { F.pas.value = ''; });
      if (s.rl) add('Reserva legal no CAR', function () { F.rl.checked = false; });
      if (s.appok) add('APP preservada', function () { F.appok.checked = false; });
      if (s.pmax != null) add('Até ' + dinheiro(s.pmax), function () { F.pmax.value = ''; });
      if (s.phmax != null) add('Até ' + dinheiro(s.phmax) + '/ha', function () { F.phmax.value = ''; });
      if (s.semconsulta) add('Sem "sob consulta"', function () { F.semconsulta.checked = false; });
      if (s.solo) add(NOMES[s.solo], function () { $('[name="solo"][value=""]', F).checked = true; });
      s.topo.forEach(function (v) { add(NOMES[v], desm('topo', v)); });
      s.agua.forEach(function (v) { add(NOMES[v], desm('agua', v)); });
      if (s.tri) add('Trifásica', function () { F.tri.checked = false; });
      s.benf.forEach(function (v) { add(NOMES[v], desm('benf', v)); });
      if (s.asf != null) add('Até ' + s.asf + ' km de terra', function () { F.asf.value = 13; });
      if (s.rod) add(s.rod, function () { F.rod.value = ''; });
      if (s.geo) add('Georreferenciada', function () { F.geo.checked = false; });
      if (s.car) add('CAR ativo', function () { F.car.checked = false; });
      return c;
    }
    function urlDe(s) {
      var q = new URLSearchParams();
      if (s.cod) q.set('cod', s.cod);
      if (s.neg) q.set('neg', s.neg);
      if (s.tipo.length) q.set('tipo', s.tipo.join(','));
      if (s.apt.length) q.set('apt', s.apt.join(','));
      if (s.regiao.length) q.set('regiao', s.regiao.join(','));
      if (s.amin != null) q.set('amin', +s.amin.toFixed(2));
      if (s.amax != null) q.set('amax', +s.amax.toFixed(2));
      if (ordem.value !== 'rel') q.set('ordem', ordem.value);
      var t = q.toString();
      try { history.replaceState(null, '', location.pathname + (t ? '?' + t : '')); } catch (e) {}
    }
    function render() {
      var s = estado();
      var r = TN.props.filter(function (p) { return passa(p, s); }).sort(ORD[ordem.value] || ORD.rel);
      $$('[data-n]').forEach(function (el) { el.textContent = r.length; });
      $('#h-res').innerHTML = '<span data-n>' + r.length + '</span> ' + (r.length === 1 ? 'propriedade' : 'propriedades');
      var cs = chipsDe(s);
      $$('[data-nf]').forEach(function (el) { el.textContent = cs.length ? '(' + cs.length + ')' : ''; });
      chips.innerHTML = '';
      cs.forEach(function (c) {
        var b = d.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c.rot; b.setAttribute('aria-label', 'Remover filtro: ' + c.rot);
        b.addEventListener('click', function () { c.limpa(); render(); });
        chips.appendChild(b);
      });
      if (cs.length > 1) { var l = d.createElement('button'); l.type = 'button'; l.className = 'bt-limpar'; l.textContent = 'Limpar tudo'; l.addEventListener('click', limpar); chips.appendChild(l); }
      lista.innerHTML = r.length ? r.map(function (p) { return cardHTML(p, true, comp.indexOf(p.cod) >= 0); }).join('') :
        '<div class="nada"><h3>Nenhuma propriedade com todos esses filtros</h3><p>Remova um filtro acima, ou deixe seu perfil com a gente: muitas fazendas são negociadas sem anúncio.</p><div class="bts" style="justify-content:center"><button type="button" class="bt bt-s" data-limpar-nada>Limpar filtros</button><a class="bt bt-b" href="compradores.html">Cadastrar meu perfil de busca</a></div></div>';
      var ln = $('[data-limpar-nada]', lista); if (ln) ln.addEventListener('click', limpar);
      var eq = $('[data-area-eq]', F);
      if (s.amin != null || s.amax != null) {
        eq.textContent = 'Equivale a ' + (s.un === 'alq' ? 'hectares: ' : 'alqueires: ') + [s.amin, s.amax].map(function (v) { return v == null ? '—' : (s.un === 'alq' ? nfa(v) + ' ha' : alq(v) + ' alq.'); }).join(' a ');
      } else eq.textContent = s.un === 'alq' ? 'Digite em alqueires paulistas (1 alq. = 2,42 ha).' : 'Digite em hectares; mostramos a conversão aqui.';
      $('[data-asf-txt]', F).textContent = s.asf == null ? 'qualquer distância' : s.asf + ' km';
      urlDe(s);
    }
    function limpar() {
      F.reset();
      F.asf.value = 13;
      render();
    }
    // estado inicial a partir da URL
    var q = new URLSearchParams(location.search);
    function marca(nome, lista) { (lista || '').split(',').forEach(function (v) { var i = v && $('[name="' + nome + '"][value="' + v + '"]', F); if (i) i.checked = true; }); }
    if (q.get('cod')) F.cod.value = q.get('cod');
    if (q.get('neg')) { var rn = $('[name="neg"][value="' + q.get('neg') + '"]', F); if (rn) rn.checked = true; }
    marca('tipo', q.get('tipo')); marca('apt', q.get('apt')); marca('regiao', q.get('regiao'));
    if (q.get('amin')) F.amin.value = q.get('amin');
    if (q.get('amax')) F.amax.value = q.get('amax');
    if (q.get('ordem') && ORD[q.get('ordem')]) ordem.value = q.get('ordem');

    F.addEventListener('input', render);
    F.addEventListener('change', render);
    F.addEventListener('submit', function (e) { e.preventDefault(); });
    ordem.addEventListener('change', render);
    $$('[data-limpar]').forEach(function (b) { b.addEventListener('click', limpar); });
    $$('[name="un"]', F).forEach(function (r) {
      r.addEventListener('change', function () {
        // converte os valores digitados para a nova unidade
        var k = r.value === 'alq' ? 1 / ALQ : ALQ;
        ['amin', 'amax'].forEach(function (n) { var v = num(F[n].value); if (v != null) F[n].value = +(v * k).toFixed(2); });
        render();
      });
    });
    // painel de filtros no celular
    var abrir = $('[data-abrir-filtros]');
    function fecharF() { F.classList.remove('aberto'); d.body.style.overflow = ''; if (abrir) abrir.focus(); }
    if (abrir) abrir.addEventListener('click', function () { F.classList.add('aberto'); d.body.style.overflow = 'hidden'; var c = $('input,select,button', F); if (c) c.focus(); });
    $$('[data-fechar-filtros]').forEach(function (b) { b.addEventListener('click', fecharF); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && F.classList.contains('aberto')) fecharF(); });

    // comparação
    var barra = $('[data-comp-barra]'), dlg = $('#dlg-comp');
    function atualizaComp() {
      barra.hidden = comp.length === 0;
      $('[data-comp-n]', barra).textContent = comp.length;
      $('[data-comp-abrir]', barra).disabled = comp.length < 2;
      $('[data-comp-abrir]', barra).textContent = comp.length < 2 ? 'Escolha mais uma' : 'Comparar lado a lado';
    }
    lista.addEventListener('change', function (e) {
      var c = e.target.closest('[data-comparar]'); if (!c) return;
      var cod = c.getAttribute('data-comparar');
      if (c.checked) { if (comp.length >= 3) { c.checked = false; alertaCurto('Compare até 3 propriedades por vez.'); return; } comp.push(cod); }
      else comp = comp.filter(function (x) { return x !== cod; });
      atualizaComp();
    });
    $('[data-comp-limpar]', barra).addEventListener('click', function () { comp = []; atualizaComp(); render(); });
    $('[data-comp-abrir]', barra).addEventListener('click', function () {
      var ps = comp.map(function (c) { return TN.props.filter(function (p) { return p.cod === c; })[0]; });
      var lin = function (rot, f) { return '<tr><th>' + rot + '</th>' + ps.map(function (p) { return '<td>' + f(p) + '</td>'; }).join('') + '</tr>'; };
      var ha = function (v) { return nfa(v) + ' ha'; };
      var t = '<div class="tabela-wrap"><table class="tec"><thead><tr><th>Item</th>' + ps.map(function (p) { return '<th><a href="' + p.url + '" style="color:#fff">' + p.cod + '</a></th>'; }).join('') + '</tr></thead><tbody>' +
        lin('Propriedade', function (p) { return esc(p.titulo); }) +
        lin('Negócio', function (p) { return TN.neg[p.neg]; }) +
        lin('Região aproximada', function (p) { return esc(p.regiao); }) +
        lin('Área total', function (p) { return nfa(p.area) + ' ha (' + alq(p.area) + ' alq.)'; }) +
        lin('Área produtiva', function (p) { return ha(p.produtiva); }) +
        lin('Lavoura', function (p) { return ha(p.uso.lavoura); }) +
        lin('Pastagem', function (p) { return ha(p.uso.pastagem); }) +
        lin('Reserva legal', function (p) { return ha(p.uso.reserva); }) +
        lin('APP', function (p) { return ha(p.uso.app); }) +
        lin('Solo', function (p) { return esc(p.soloTxt); }) +
        lin('Relevo e altitude', function (p) { return esc(p.topoTxt) + ', ' + nf(p.alt[0]) + ' a ' + nf(p.alt[1]) + ' m'; }) +
        lin('Água', function (p) { return esc(p.aguaRes); }) +
        lin('Energia', function (p) { return esc(p.energia); }) +
        lin('Benfeitorias', function (p) { return p.benf.map(function (b) { return NOMES[b]; }).join(', '); }) +
        lin('Estrada de terra até o asfalto', function (p) { return p.asfalto ? nf(p.asfalto, p.asfalto % 1 ? 1 : 0) + ' km' : 'asfalto até a porteira'; }) +
        lin('Valor', function (p) { return esc(p.precoTxt); }) +
        lin('Valor por hectare', function (p) { return p.preco ? dinheiro(p.preco / p.area) : '—'; }) +
        lin('Documentação', function (p) { return (p.geo ? 'Georreferenciada' : 'Sem georreferenciamento') + (p.car ? ', CAR ativo' : ''); }) +
        '</tbody></table></div><div class="bts" style="margin-top:18px"><button type="button" class="bt bt-b" data-comp-wa>Pedir as fichas destas propriedades</button></div>';
      $('[data-comp-tabela]', dlg).innerHTML = t;
      $('[data-comp-wa]', dlg).addEventListener('click', function () { wa('Olá, ' + MARCA + '! Estou comparando as propriedades ' + comp.join(', ') + ' e quero receber as fichas técnicas.'); });
      dlg.hidden = false; $('[data-comp-fechar]', dlg).focus();
    });
    function fecharDlg() { dlg.hidden = true; }
    $('[data-comp-fechar]', dlg).addEventListener('click', fecharDlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) fecharDlg(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dlg.hidden) fecharDlg(); });
    render();
  })();

  function alertaCurto(t) {
    var a = $('.alerta-curto');
    if (!a) { a = d.createElement('div'); a.className = 'alerta-curto'; a.setAttribute('role', 'status'); d.body.appendChild(a); }
    a.textContent = t; a.classList.add('on');
    clearTimeout(a._t); a._t = setTimeout(function () { a.classList.remove('on'); }, 2600);
  }

  // ---------------- galeria em tela cheia
  var luz = $('.luz');
  if (luz) (function () {
    var fotos = []; try { fotos = JSON.parse(luz.getAttribute('data-luz-dados')); } catch (e) {}
    var i = 0, antes = null, im = $('[data-luz-img]', luz);
    function mostra(n) {
      i = (n + fotos.length) % fotos.length;
      im.src = fotos[i].src; im.alt = fotos[i].leg;
      $('[data-luz-leg]', luz).textContent = fotos[i].leg;
      $('[data-luz-n]', luz).textContent = (i + 1) + ' de ' + fotos.length;
    }
    function abre(n) { antes = d.activeElement; mostra(n); luz.hidden = false; d.body.style.overflow = 'hidden'; $('[data-luz-x]', luz).focus(); }
    function fecha() { luz.hidden = true; d.body.style.overflow = ''; if (antes) antes.focus(); }
    $$('[data-luz]').forEach(function (b) { b.addEventListener('click', function () { abre(+b.getAttribute('data-luz')); }); });
    $('[data-luz-x]', luz).addEventListener('click', fecha);
    $('[data-luz-ant]', luz).addEventListener('click', function () { mostra(i - 1); });
    $('[data-luz-prox]', luz).addEventListener('click', function () { mostra(i + 1); });
    d.addEventListener('keydown', function (e) {
      if (luz.hidden) return;
      if (e.key === 'Escape') fecha(); else if (e.key === 'ArrowLeft') mostra(i - 1); else if (e.key === 'ArrowRight') mostra(i + 1);
    });
    var x0 = null;
    luz.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    luz.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) mostra(i + (dx < 0 ? 1 : -1)); x0 = null; });
  })();

  // ---------------- sobrevoo (sequência de fotos aéreas; no site real, vídeo do drone)
  var voo = $('[data-voo]');
  if (voo) (function () {
    var imgs = $$('img', voo), bt = $('[data-voo-bt]', voo), leg = $('[data-voo-leg]', voo), i = 0, t = null;
    var legs = []; try { legs = JSON.parse(luz.getAttribute('data-luz-dados')).map(function (f) { return f.leg; }); } catch (e) {}
    var parado = matchMedia('(prefers-reduced-motion: reduce)').matches, visivel = false;
    function passo() {
      imgs[i].classList.remove('on'); i = (i + 1) % imgs.length;
      void imgs[i].offsetWidth; imgs[i].classList.add('on');
      if (legs[i]) leg.textContent = legs[i];
    }
    function liga() { clearInterval(t); if (!parado && visivel) t = setInterval(passo, 6000); }
    function marca() { bt.textContent = parado ? 'Continuar' : 'Pausar'; bt.setAttribute('aria-pressed', parado ? 'false' : 'true'); }
    bt.addEventListener('click', function () { parado = !parado; marca(); liga(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; liga(); }).observe(voo);
    marca();
  })();

  // ---------------- subnavegação da propriedade
  var sub = $$('.subnav a[href^="#"]');
  if (sub.length && 'IntersectionObserver' in window) {
    var mapa = {};
    sub.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) mapa[s.id] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && mapa[e.target.id]) {
          sub.forEach(function (a) { a.classList.remove('ativo'); a.removeAttribute('aria-current'); });
          mapa[e.target.id].classList.add('ativo'); mapa[e.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(mapa).forEach(function (id) { io.observe(d.getElementById(id)); });
  }

  // pedidos que levam ao formulário de interesse
  $$('[data-pede]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = $('form[data-form="interesse"]'); if (!f) return;
      var c = $('[data-q="' + b.getAttribute('data-pede') + '"]', f); if (c) c.checked = true;
      $('#interesse').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      setTimeout(function () { f.nome.focus({ preventScroll: true }); }, 450);
    });
  });

  // ---------------- formulários
  function digitos(v) { return String(v || '').replace(/\D/g, ''); }
  function valida(f) {
    var ok = true, primeiro = null;
    $$('.campo', f).forEach(function (c) { c.classList.remove('erro'); });
    $$('input[required], select[required], textarea[required]', f).forEach(function (el) {
      if (el.type === 'checkbox') return;
      var v = el.value.trim(), bom = !!v;
      if (bom && el.type === 'tel') bom = digitos(v).length >= 10 && digitos(v).length <= 13;
      if (bom && el.type === 'email') bom = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (bom && el.minLength > 0) bom = v.length >= el.minLength;
      if (bom && el.type === 'number') bom = num(v) > 0;
      if (!bom) { ok = false; el.closest('.campo').classList.add('erro'); primeiro = primeiro || el; }
    });
    $$('input[type="email"]:not([required])', f).forEach(function (el) {
      var v = el.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { ok = false; el.closest('.campo').classList.add('erro'); primeiro = primeiro || el; }
    });
    var termo = $('input[type="checkbox"][required]', f), et = $('[data-erro-termo]', f);
    if (termo) {
      if (!termo.checked) { ok = false; if (et) et.style.display = 'block'; primeiro = primeiro || termo; }
      else if (et) et.style.display = '';
    }
    if (primeiro) primeiro.focus();
    return ok;
  }
  function v(f, n) { var el = f.elements[n]; if (!el) return ''; if (el.length && !el.tagName) { var c = $$('[name="' + n + '"]:checked', f).map(function (i) { return i.closest('label').textContent.trim(); }); return c.join(', '); } return (el.value || '').trim(); }
  function marcados(f, n) { return $$('[name="' + n + '"]:checked', f).map(function (i) { return i.closest('label').textContent.trim(); }).join(', '); }
  function confirma(f, html) {
    var ok = $('.form-ok', f); ok.innerHTML = html; ok.classList.add('on'); ok.focus();
  }
  var MSG = {
    interesse: function (f) {
      var quero = marcados(f, 'quero') || 'Mais informações';
      return 'Olá, ' + MARCA + '! Tenho interesse na propriedade ' + f.dataset.cod + ' (' + f.dataset.titulo + ', ' + f.dataset.regiao + ').' +
        '\n• Nome: ' + v(f, 'nome') + '\n• WhatsApp: ' + v(f, 'tel') + '\n• E-mail: ' + v(f, 'email') + '\n• Perfil: ' + v(f, 'perfil') +
        '\n• Quero: ' + quero + '\n• Pagamento: ' + v(f, 'pag') + (v(f, 'msg') ? '\n• Mensagem: ' + v(f, 'msg') : '') + '\nAceito o termo de confidencialidade.';
    },
    comprador: function (f) {
      var un = v(f, 'un') === 'Hectares' ? 'ha' : 'alq.';
      var area = (f.amin.value || f.amax.value) ? (f.amin.value ? 'de ' + f.amin.value + ' ' : '') + (f.amax.value ? 'até ' + f.amax.value + ' ' : '') + un : 'a definir';
      return 'Olá, ' + MARCA + '! Quero cadastrar meu perfil de busca.' +
        '\n• Nome: ' + v(f, 'nome') + '\n• WhatsApp: ' + v(f, 'tel') + (v(f, 'email') ? '\n• E-mail: ' + v(f, 'email') : '') +
        '\n• Negócio: ' + marcados(f, 'neg') + '\n• Tipo: ' + (marcados(f, 'tipo') || 'qualquer') + '\n• Aptidão: ' + (marcados(f, 'apt') || 'qualquer') +
        '\n• Regiões: ' + (marcados(f, 'regiao') || 'qualquer') + '\n• Área: ' + area + '\n• Investimento: ' + f.inv.options[f.inv.selectedIndex].text +
        '\n• Finalidade: ' + v(f, 'fin') + ((marcados(f, 'agua') || marcados(f, 'extra')) ? '\n• Indispensável: ' + [marcados(f, 'agua'), marcados(f, 'extra')].filter(Boolean).join(', ') : '');
    },
    proprietario: function (f) {
      var a = num(f.area.value) || 0, ha = f.un.value === 'alq' ? a * ALQ : a;
      return 'Olá, ' + MARCA + '! Quero conversar com sigilo sobre minha propriedade.' +
        '\n• Nome: ' + v(f, 'nome') + '\n• WhatsApp: ' + v(f, 'tel') + '\n• Quero: ' + marcados(f, 'neg') +
        '\n• Tipo: ' + f.tipo.options[f.tipo.selectedIndex].text + ', uso atual: ' + f.apt.options[f.apt.selectedIndex].text +
        '\n• Área: ' + nfa(ha) + ' ha (' + alq(ha) + ' alq.)' + '\n• Município (sigiloso): ' + v(f, 'mun') +
        (num(f.valor.value) ? '\n• Valor pretendido: ' + dinheiro(num(f.valor.value)) : '') +
        '\n• Divulgar preço: ' + marcados(f, 'preco') + '\n• Localização sigilosa: ' + marcados(f, 'sigilo') + '\n• Fotos aéreas: ' + marcados(f, 'fotos') +
        '\n• Documentos em mãos: ' + (marcados(f, 'doc') || 'nenhum ainda') + '\n• Melhor horário: ' + v(f, 'hora');
    },
    contato: function (f) {
      return 'Olá, ' + MARCA + '! ' + v(f, 'assunto') + '.\n• Nome: ' + v(f, 'nome') + '\n• WhatsApp: ' + v(f, 'tel') + '\n• Mensagem: ' + v(f, 'msg');
    }
  };
  var OK = {
    interesse: function (f) { return '<b>Pedido registrado (demonstração).</b> O consultor responde em até 1 dia útil pelo WhatsApp. O termo de confidencialidade vai para ' + esc(v(f, 'email')) + '; a localização exata só é enviada depois do aceite e da autorização do proprietário.'; },
    comprador: function (f) { var n = $$('[data-match] li').length; return '<b>Perfil cadastrado (demonstração).</b> ' + (n ? 'Já separamos ' + n + (n === 1 ? ' propriedade compatível' : ' propriedades compatíveis') + ' da carteira para você. ' : '') + 'Avisaremos pelo WhatsApp quando surgir algo novo, inclusive negócios fora do site.'; },
    proprietario: function () { return '<b>Recebemos seus dados com sigilo (demonstração).</b> Um consultor liga no horário escolhido para marcar a visita técnica. Nada é publicado sem a sua aprovação.'; },
    contato: function () { return '<b>Mensagem enviada (demonstração).</b> Respondemos em até 1 dia útil.'; }
  };
  $$('form[data-form]').forEach(function (f) {
    var tipo = f.getAttribute('data-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valida(f)) return;
      wa(MSG[tipo](f));
      confirma(f, OK[tipo](f));
    });
    f.addEventListener('input', function (e) {
      var c = e.target.closest('.campo'); if (c && c.classList.contains('erro')) c.classList.remove('erro');
      if (e.target.type === 'checkbox' && e.target.required && e.target.checked) { var et = $('[data-erro-termo]', f); if (et) et.style.display = ''; }
    });
  });

  // ---------------- comprador: propriedades compatíveis
  var fc = $('form[data-form="comprador"]');
  if (fc) (function () {
    var alvo = $('[data-match]');
    function sel(n) { return $$('[name="' + n + '"]:checked', fc).map(function (i) { return i.value; }); }
    function calc() {
      var un = (sel('un')[0] || 'alq'), k = un === 'alq' ? ALQ : 1;
      var amin = num(fc.amin.value), amax = num(fc.amax.value);
      var eq = $('[data-un-eq]', fc);
      eq.textContent = (amin || amax) ? 'Equivale a ' + (un === 'alq' ? [amin, amax].map(function (v) { return v == null ? '—' : nfa(v * ALQ) + ' ha'; }).join(' a ') : [amin, amax].map(function (v) { return v == null ? '—' : alq(v) + ' alq.'; }).join(' a ')) : '1 alqueire paulista = 2,42 hectares.';
      var neg = sel('neg')[0], tipos = sel('tipo'), apts = sel('apt'), regs = sel('regiao'), aguas = sel('agua'), extras = sel('extra'), inv = num(fc.inv.value);
      var r = TN.props.filter(function (p) {
        if (neg && p.neg !== neg) return false;
        if (tipos.length && tipos.indexOf(p.tipo) < 0) return false;
        if (apts.length && !apts.some(function (a) { return p.apt.indexOf(a) >= 0; })) return false;
        if (regs.length && regs.indexOf('outra') < 0 && regs.indexOf(p.grupo) < 0) return false;
        if (amin != null && p.area < amin * k - 0.01) return false;
        if (amax != null && p.area > amax * k + 0.01) return false;
        if (inv && p.preco && p.preco > inv) return false;
        if (aguas.length && !aguas.every(function (a) { return p.agua.indexOf(a) >= 0; })) return false;
        if (extras.indexOf('geo') >= 0 && !p.geo) return false;
        if (extras.indexOf('sede') >= 0 && p.benf.indexOf('sede') < 0) return false;
        return true;
      });
      alvo.innerHTML = r.length ? '<ul class="legenda" style="margin-bottom:12px">' + r.map(function (p) {
        return '<li style="grid-template-columns:1fr auto"><a href="' + p.url + '"><b style="text-align:left;display:block">' + esc(p.titulo) + '</b></a><small style="min-width:0">' + p.cod + '</small><span style="grid-column:1/-1;color:var(--suave);font-size:14.5px">' + nfa(p.area) + ' ha (' + alq(p.area) + ' alq.) · ' + esc(p.precoTxt) + '</span></li>';
      }).join('') + '</ul><p style="font-size:14.5px;margin:0"><b>' + r.length + '</b> de ' + TN.props.length + ' propriedades da carteira.</p>' :
        '<p style="margin:0">Nenhuma na carteira de hoje com esse perfil. Cadastre assim mesmo: avisamos quando surgir, inclusive negócios fora do site.</p>';
    }
    fc.addEventListener('input', calc); fc.addEventListener('change', calc); calc();
  })();

  // ---------------- proprietário: prévia do anúncio
  var fd = $('form[data-form="proprietario"]');
  if (fd) (function () {
    var alvo = $('[data-previa]');
    function sel(n) { var r = $('[name="' + n + '"]:checked', fd); return r ? r.value : ''; }
    function calc() {
      var a = num(fd.area.value), ha = a == null ? null : (fd.un.value === 'alq' ? a * ALQ : a);
      var eq = $('[data-un-eq]', fd);
      eq.textContent = ha ? (fd.un.value === 'alq' ? '= ' + nfa(ha) + ' hectares' : '= ' + alq(ha) + ' alqueires paulistas') : '';
      var tipo = fd.tipo.options[fd.tipo.selectedIndex].text, apt = fd.apt.options[fd.apt.selectedIndex].text.toLowerCase();
      var neg = sel('neg'), negN = { venda: 'Venda', arrendamento: 'Arrendamento', parceria: 'Parceria', avaliar: 'Avaliação' }[neg];
      var valor = num(fd.valor.value);
      var preco = 'Sob consulta', sub = 'valor informado após o primeiro contato';
      if (sel('preco') === 'sim' && valor) { preco = dinheiro(valor); sub = ha ? dinheiro(valor / ha) + ' por ha · ' + dinheiro(valor / ha * ALQ) + ' por alq.' : ''; }
      var reg = sel('sigilo') === 'nao' && fd.mun.value.trim() ? esc(fd.mun.value.trim()) + ', SP' : 'Região aproximada · município sob sigilo';
      alvo.innerHTML = '<article class="card-p"><div class="card-foto curvas-fundo" style="display:grid;place-items:center;background:var(--floresta);color:var(--areia)"><span style="position:relative;font-weight:650;text-align:center;padding:0 20px">' +
        (sel('fotos') === 'fazer' ? 'Fotos aéreas feitas pela Terra Nobre' : 'Suas fotos aéreas aqui') + '</span><div class="selo"><span class="neg">' + negN + '</span><span>TN-1XX</span></div></div>' +
        '<div class="card-corpo"><h3>' + esc(tipo) + ' de ' + esc(apt) + '</h3><p class="regiao">' + IC.pin + reg + '</p>' +
        '<dl class="dados"><div class="dado"><dt>Área total</dt><dd>' + (ha ? nfa(ha) + ' ha · ' + alq(ha) + ' alq.' : '—') + '</dd></div><div class="dado"><dt>Documentos</dt><dd>' + ($$('[name="doc"]:checked', fd).length || 'nenhum') + ' de 6 em mãos</dd></div></dl>' +
        '<div class="preco"><b>' + preco + '</b><small>' + sub + '</small></div></div></article>';
    }
    fd.addEventListener('input', calc); fd.addEventListener('change', calc); calc();
  })();

  // ---------------- ficha técnica: PDF pela impressão do navegador
  $$('[data-imprimir]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  $$('[data-hoje]').forEach(function (el) { el.textContent = new Date().toLocaleDateString('pt-BR'); });
  if ($('.folha') && /[?&]imprimir=1/.test(location.search)) {
    addEventListener('load', function () { setTimeout(function () { try { window.print(); } catch (e) {} }, 700); });
  }
})();

/* imagens fora da tela: carregam aos poucos depois que a página abriu (a primeira tela continua rápida) */
(function () {
  function solta() {
    var lz = Array.prototype.slice.call(document.querySelectorAll('img[loading="lazy"]'));
    var i = 0;
    (function lote() { lz.slice(i, i + 6).forEach(function (im) { im.loading = 'eager'; }); i += 6; if (i < lz.length) setTimeout(lote, 250); })();
  }
  if (document.readyState === 'complete') setTimeout(solta, 1500); else addEventListener('load', function () { setTimeout(solta, 1500); });
})();

/* mapa no celular: abre centralizado na região da propriedade */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.mapa-rolo'), function (m) {
    var f = parseFloat(m.getAttribute('data-foco') || '0.5');
    if (m.scrollWidth > m.clientWidth) m.scrollLeft = Math.max(0, f * m.scrollWidth - m.clientWidth / 2);
  });
})();

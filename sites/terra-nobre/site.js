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
    var parado = true, visivel = false; /* só avança quando a pessoa pede */
    function passo() {
      imgs[i].classList.remove('on'); i = (i + 1) % imgs.length;
      void imgs[i].offsetWidth; imgs[i].classList.add('on');
      if (legs[i]) leg.textContent = legs[i];
    }
    function liga() { clearInterval(t); if (!parado && visivel) t = setInterval(passo, 6000); }
    function marca() { bt.textContent = parado ? 'Passar as fotos' : 'Pausar'; bt.setAttribute('aria-pressed', parado ? 'false' : 'true'); }
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

/* ---------------- indicador de progresso da página (linha bronze de 2 px no topo) */
(function () {
  var b = document.createElement('div'); b.className = 'progresso'; b.setAttribute('aria-hidden', 'true');
  var i = document.createElement('i'); b.appendChild(i); document.body.appendChild(b);
  var pend = false;
  function atualiza() {
    pend = false;
    var h = document.documentElement.scrollHeight - innerHeight;
    i.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0) + ')';
  }
  addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(atualiza); } }, { passive: true });
  addEventListener('resize', atualiza);
  atualiza();
})();

/* ---------------- hero: sobrevoo real de drone controlado pela rolagem (computador) ou por toque (celular) */
(function () {
  var hero = document.querySelector('[data-voo-hero]'); if (!hero) return;
  var v = hero.querySelector('video'), bt = hero.querySelector('[data-voo-tocar]');
  var hud = hero.querySelector('[data-voo-hud]'), capLeg = hero.querySelector('[data-voo-cap]'), tempo = hero.querySelector('[data-voo-tempo]'), linha = hero.querySelector('[data-voo-linha]');
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rolagem = !reduz && matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine) and (min-height: 600px)').matches;
  var CAPS = [[0, 'Eucaliptos e reserva na entrada'], [0.34, 'Terra roxa preparada para o plantio'], [0.68, 'Sede, colônia e talhões']];
  function cap(p) { var t = CAPS[0][1]; CAPS.forEach(function (c) { if (p >= c[0]) t = c[1]; }); return t; }
  function mmss(s) { s = Math.max(0, Math.round(s)); return '0:' + (s < 10 ? '0' : '') + s; }
  function pronto() { v.classList.add('pronto'); }
  v.addEventListener('loadeddata', pronto);

  if (rolagem) {
    hero.classList.add('voo-rolagem');
    var alvo = 0, atual = 0, raf = 0, visivel = true, carregado = false, dur = 18;
    var carrega = function () { if (carregado) return; carregado = true; v.preload = 'auto'; v.src = v.getAttribute('data-src-pc'); v.load(); };
    v.addEventListener('loadedmetadata', function () { if (v.duration) dur = v.duration; pede(); });
    var mede = function () {
      var palco = hero.querySelector('.voo-palco'), topo = parseFloat(getComputedStyle(palco).top) || 0;
      var r = hero.getBoundingClientRect(), curso = hero.offsetHeight - palco.offsetHeight;
      alvo = curso > 0 ? Math.min(1, Math.max(0, (topo - r.top) / curso)) : 0;
    };
    var quadro = function () {
      raf = 0;
      atual += (alvo - atual) * 0.16;
      if (Math.abs(alvo - atual) < 0.0008) atual = alvo;
      if (v.readyState >= 1 && !v.seeking) {
        var t = Math.min(dur - 0.05, atual * dur);
        if (Math.abs(v.currentTime - t) > 0.03) { try { v.currentTime = t; } catch (e) {} }
      }
      if (linha) linha.style.transform = 'scaleX(' + atual.toFixed(4) + ')';
      if (tempo) tempo.textContent = mmss(atual * dur) + ' de ' + mmss(dur);
      if (capLeg) { var c = cap(atual); if (capLeg.textContent !== c) capLeg.textContent = c; }
      hero.classList.toggle('voo-andou', atual > 0.04);
      var falta = v.readyState >= 1 && Math.abs(v.currentTime - Math.min(dur - 0.05, atual * dur)) > 0.03;
      if (visivel && (atual !== alvo || falta)) raf = requestAnimationFrame(quadro);
    };
    var pede = function () { mede(); if (!raf && visivel) raf = requestAnimationFrame(quadro); };
    addEventListener('scroll', pede, { passive: true });
    addEventListener('resize', pede);
    v.addEventListener('seeked', function () { if (!raf && visivel) raf = requestAnimationFrame(quadro); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        if (visivel) { if (document.readyState === 'complete') carrega(); else addEventListener('load', carrega); pede(); }
      }).observe(hero);
    } else { addEventListener('load', carrega); }
    pede();
  } else {
    hero.classList.add('voo-toque');
    if (hud) hud.hidden = true;
    if (!bt) return;
    bt.hidden = false;
    var rot = bt.querySelector('span');
    bt.addEventListener('click', function () {
      if (!v.getAttribute('src')) {
        v.src = innerWidth > 900 ? v.getAttribute('data-src-pc') : v.getAttribute('data-src-cel');
        v.preload = 'auto';
      }
      if (v.paused) {
        if (v.ended) v.currentTime = 0;
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        rot.textContent = 'Pausar o sobrevoo'; bt.setAttribute('aria-pressed', 'true');
      } else { v.pause(); rot.textContent = 'Continuar o sobrevoo'; bt.setAttribute('aria-pressed', 'false'); }
    });
    v.addEventListener('ended', function () { rot.textContent = 'Ver o sobrevoo de novo'; bt.setAttribute('aria-pressed', 'false'); });
    v.addEventListener('playing', pronto);
  }
})();

/* ---------------- mapa técnico em camadas: solo, altitude e água (croqui de demonstração com dados de exemplo) */
(function () {
  var TN = window.TN, d = document;
  var caixas = d.querySelectorAll('[data-camadas]');
  if (!TN || !caixas.length) return;
  var W = 600, H = 340;
  var CONT = {
    'TN-101': '34,67 146,26 290,47 425,19 569,60 569,179 572,292 411,321 239,312 107,314 44,255 18,149',
    'TN-102': '33,70 143,38 298,37 437,21 566,49 561,172 554,289 405,317 258,310 106,322 52,272 15,157',
    'TN-103': '33,52 144,28 300,48 434,15 567,60 566,179 558,298 399,325 239,302 114,326 42,260 12,143',
    'TN-104': '22,53 145,26 297,41 439,25 549,48 575,174 551,308 397,316 247,306 114,311 44,267 27,148',
    'TN-105': '30,61 157,24 299,41 431,25 557,46 569,164 558,308 388,316 245,299 99,329 49,271 30,142',
    'TN-106': '32,56 161,22 290,51 421,27 549,60 572,167 570,300 411,319 249,302 108,325 31,267 16,154',
    'TN-107': '38,63 140,27 311,41 420,31 568,44 565,165 569,297 392,308 256,304 102,318 29,257 30,149',
    'TN-108': '37,71 160,21 307,53 423,15 572,54 582,178 571,293 389,309 247,302 122,313 44,253 12,145',
    'TN-109': '36,70 151,22 294,55 433,31 559,46 573,172 565,290 410,318 241,307 118,318 47,255 18,141',
    'TN-110': '28,71 150,31 299,52 433,22 571,44 573,167 570,307 405,328 257,308 122,318 52,271 19,153'
  };
  var CORES = { 'vermelho': '#8f3f27', 'vermelho-amarelo': '#b8743f', 'argissolo': '#c99a5c', 'neossolo': '#d8c38c', 'gleissolo': '#5f7a6c', 'cambissolo': '#a88f6a' };
  var BENF = { sede: 'sede', terreiro: 'terreiro', armazem: 'armazém', galpao: 'galpão', casas: 'casas de colaboradores', silo: 'silos', curral: 'curral', baias: 'baias' };
  function nf(x, dec) { return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pts(s) { return s.split(' ').map(function (p) { var a = p.split(','); return [+a[0], +a[1]]; }); }
  function dentro(x, y, pol) { var c = false; for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) { var xi = pol[i][0], yi = pol[i][1], xj = pol[j][0], yj = pol[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
  function conta(re, txt, padrao) { var m = txt.match(re); return m ? +m[1] : padrao; }
  function passoDe(amp) { return [5, 10, 20, 25, 50, 100].filter(function (st) { return amp / st <= 7; })[0] || 100; }

  function modelo(p) {
    var r = rng(parseInt(p.cod.replace(/\D/g, ''), 10) * 7919);
    var pol = pts(CONT[p.cod] || CONT['TN-101']);
    var lo = p.alt ? p.alt[0] : 600, hi = p.alt ? p.alt[1] : 640;
    var sx = 190 + r() * 220, sy = 120 + r() * 90;
    var f1 = r() * 6.28, f2 = r() * 6.28;
    var plano = p.topo === 'plana';
    var g = { p: p, pol: pol, lo: lo, hi: hi, sx: sx, sy: sy, rx: 360, ry: 235 };
    g.w = function (t) { return 1 + 0.09 * Math.sin(3 * t + f1) + 0.05 * Math.sin(5 * t + f2); };
    g.rn = function (x, y) { var dx = (x - sx) / g.rx, dy = (y - sy) / g.ry; var t = Math.atan2(dy, dx); return Math.sqrt(dx * dx + dy * dy) / g.w(t); };
    g.alt = function (x, y) { return lo + (hi - lo) * (1 - Math.min(1, g.rn(x, y))); };
    g.anel = function (c) { var s = ''; for (var k = 0; k <= 96; k++) { var t = k / 96 * Math.PI * 2, w = g.w(t) * c; s += (k ? 'L' : 'M') + (sx + g.rx * w * Math.cos(t)).toFixed(1) + ' ' + (sy + g.ry * w * Math.sin(t)).toFixed(1); } return s + 'Z'; };
    g.ponto = function (c, t) { var w = g.w(t) * c; return [sx + g.rx * w * Math.cos(t), sy + g.ry * w * Math.sin(t)]; };
    // solos: o principal no alto, transição na meia encosta, baixada perto da água
    var principal = (p.soloTxt || 'Latossolo vermelho').split(',')[0];
    var ehArg = /argissolo/i.test(principal), ehVA = /vermelho-amarelo/i.test(principal);
    var corP = ehArg ? CORES.argissolo : ehVA ? CORES['vermelho-amarelo'] : CORES.vermelho;
    var sec = ehArg ? ['Neossolo nas encostas', CORES.neossolo] : plano ? (ehVA ? ['Latossolo vermelho', CORES.vermelho] : ['Latossolo vermelho-amarelo', CORES['vermelho-amarelo']]) : ['Argissolo vermelho-amarelo', CORES.argissolo];
    var temAgua = p.agua.indexOf('rio') > -1 || p.agua.indexOf('represa') > -1;
    var baixo = temAgua ? ['Gleissolo de várzea (úmido)', CORES.gleissolo] : ['Cambissolo na baixada', CORES.cambissolo];
    g.solos = [{ nome: principal, cor: corP, ate: plano ? 0.72 : 0.6 }, { nome: sec[0], cor: sec[1], ate: 0.88 }, { nome: baixo[0], cor: baixo[1], ate: 99 }];
    g.soloEm = function (x, y) { var c = g.rn(x, y); for (var i = 0; i < g.solos.length; i++) if (c <= g.solos[i].ate) return g.solos[i]; return g.solos[2]; };
    var n = [0, 0, 0], tot = 0, x, y;
    for (y = 4; y < H; y += 6) for (x = 4; x < W; x += 6) { if (!dentro(x, y, pol)) continue; tot++; n[g.solos.indexOf(g.soloEm(x, y))]++; }
    g.solos.forEach(function (s, i) { s.pct = tot ? n[i] / tot : 0; s.ha = p.area * s.pct; });
    // escala: metros por unidade do desenho, a partir da área real
    var a = 0; for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) a += (pol[j][0] + pol[i][0]) * (pol[j][1] - pol[i][1]);
    g.mpx = Math.sqrt(p.area * 10000 / Math.abs(a / 2));
    // água: o rio corre na divisa oposta ao ponto mais alto
    var lado = sy < 170 ? 1 : -1;
    g.lado = lado; g.rioY = lado > 0 ? 286 : 58; g.rioF = r() * 6.28;
    g.temRio = p.agua.indexOf('rio') > -1;
    g.rioNome = /córrego/i.test(p.aguaRes) ? 'Córrego' : /ribeirão/i.test(p.aguaRes) ? 'Ribeirão' : 'Rio';
    var tr = lado > 0 ? Math.PI / 2 : -Math.PI / 2, k;
    var nn = conta(/(\d+)\s+nascentes?/i, p.aguaRes, p.agua.indexOf('nascente') > -1 ? 1 : 0);
    g.dentro = function (q) { var c = q[0] > 30 && q[0] < 570 && q[1] > 26 && q[1] < 314 && dentro(q[0], q[1], pol) && dentro(q[0] + 14, q[1], pol) && dentro(q[0] - 14, q[1], pol) && dentro(q[0], q[1] + 14, pol) && dentro(q[0], q[1] - 14, pol); return c; };
    g.pontoDentro = function (c, t) { var q = g.ponto(c, t); while (!g.dentro(q) && c > 0.1) { c -= 0.04; q = g.ponto(c, t); } return q; };
    g.nascentes = []; for (k = 0; k < nn; k++) g.nascentes.push(g.pontoDentro(0.8 + r() * 0.06, tr + (nn > 1 ? (k / (nn - 1) - 0.5) * 2.6 : 0.6)));
    var nr = conta(/(\d+)\s+represas?/i, p.aguaRes, /represa/i.test(p.aguaRes) ? 1 : 0), lago = /lago/i.test(p.aguaRes);
    var tot2 = nr + (lago ? 1 : 0); g.represas = [];
    for (k = 0; k < tot2; k++) { var pt = g.pontoDentro(0.55 + r() * 0.08, tr + (tot2 > 1 ? (k / (tot2 - 1) - 0.5) * 1.9 : -0.5)); g.represas.push({ x: pt[0], y: pt[1], rx: 17 + r() * 9, ry: 9 + r() * 5, rot: r() * 50 - 25, lago: lago && k === tot2 - 1 }); }
    g.temPoco = p.agua.indexOf('poco') > -1 || /poço/i.test(p.aguaRes);
    var np = conta(/(\d+)\s+piv/i, p.aguaRes, 0);
    g.pivos = []; for (k = 0; k < np; k++) g.pivos.push([sx + (k - (np - 1) / 2) * 92, sy + 62 * lado + (k % 2 ? 14 * lado : 0)]);
    g.sede = g.pontoDentro(0.4, tr + 0.75);
    g.rioEm = function (x) { return g.rioY + 11 * Math.sin(x / 62 + g.rioF) + 6 * Math.sin(x / 23 + g.rioF * 2); };
    // represas longe do rio e da divisa; sede fora dos pivôs
    var folga = function (q, raio) { return dentro(q[0] + raio, q[1], pol) && dentro(q[0] - raio, q[1], pol) && dentro(q[0], q[1] + 18, pol) && dentro(q[0], q[1] - 18, pol) && (!g.temRio || Math.abs(q[1] - g.rioEm(q[0])) > 40); };
    g.represas.forEach(function (e) { var n = 0; while (!folga([e.x, e.y], e.rx + 12) && n < 20) { e.x += (sx - e.x) * 0.12; e.y += (sy - e.y) * 0.12; n++; } });
    g.pivos.forEach(function (q) { var dx = g.sede[0] - q[0], dy = g.sede[1] - q[1]; if (dx * dx + dy * dy < 56 * 56) { var t = Math.atan2(g.sede[1] - sy, g.sede[0] - sx) + Math.PI; g.sede = g.pontoDentro(0.42, t); } });
    return g;
  }

  function rioPath(g) { var s = ''; for (var x = -10; x <= 610; x += 10) s += (x === -10 ? 'M' : 'L') + x + ' ' + g.rioEm(x).toFixed(1); return s; }

  function svg(g, uid) {
    var p = g.p, s = '', x, y;
    var polStr = g.pol.map(function (q) { return q.join(','); }).join(' ');
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Croqui técnico em camadas da propriedade ' + esc(p.cod) + ': solo, curvas de nível e água (demonstração)">';
    s += '<defs><clipPath id="cm-cl-' + uid + '"><polygon points="' + polStr + '"/></clipPath>' +
      '<pattern id="cm-app-' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#3f6e7e" stroke-width="2" stroke-opacity=".5"/></pattern>' +
      '<pattern id="cm-gl-' + uid + '" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.3" fill="#fff" fill-opacity=".45"/></pattern></defs>';
    s += '<rect width="600" height="340" fill="#f3ecdd"/>';
    s += '<g stroke="#ddd1b8" stroke-width=".6">';
    for (x = 50; x < W; x += 50) s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="340"/>';
    for (y = 50; y < H; y += 50) s += '<line x1="0" y1="' + y + '" x2="600" y2="' + y + '"/>';
    s += '</g>';
    s += '<g clip-path="url(#cm-cl-' + uid + ')">';
    s += '<rect width="600" height="340" fill="#ebe2cc"/>';
    s += '<g class="cm-l" data-camada="solo">';
    s += '<rect width="600" height="340" fill="' + g.solos[2].cor + '" fill-opacity=".72"/>';
    if (/gleissolo/i.test(g.solos[2].nome)) s += '<rect width="600" height="340" fill="url(#cm-gl-' + uid + ')"/>';
    s += '<path d="' + g.anel(g.solos[1].ate) + '" fill="' + g.solos[1].cor + '" fill-opacity=".78"/>';
    s += '<path d="' + g.anel(g.solos[0].ate) + '" fill="' + g.solos[0].cor + '" fill-opacity=".8"/>';
    s += '</g>';
    var amp = g.hi - g.lo, passo = passoDe(amp);
    var niveis = []; for (var v = Math.ceil((g.lo + 1) / passo) * passo; v < g.hi; v += passo) niveis.push(v);
    s += '<g class="cm-l" data-camada="altitude">';
    niveis.forEach(function (v, i) { var c = 1 - (v - g.lo) / amp; s += '<path d="' + g.anel(c) + '" fill="#fff" fill-opacity=".06" stroke="#1f2a22" stroke-opacity="' + (i % 2 ? '.42' : '.66') + '" stroke-width="' + (i % 2 ? '1' : '1.6') + '"/>'; });
    var obst = [g.sede, [g.sx, g.sy]].concat(g.nascentes, g.pivos, g.represas.map(function (e) { return [e.x, e.y]; }));
    var longe = function (q) { for (var o = 0; o < obst.length; o++) { var dx = q[0] - obst[o][0], dy = q[1] - obst[o][1]; if (dx * dx + dy * dy < 44 * 44) return false; } if (g.temRio && Math.abs(q[1] - g.rioEm(q[0])) < 26) return false; return true; };
    var cada = Math.max(1, Math.ceil(niveis.length / 3)); niveis.forEach(function (v, i) { if (i % cada) return; var c = 1 - (v - g.lo) / amp, q = null; for (var a = 0; a < 12 && !q; a++) { var qq = g.ponto(c, -0.8 + i * 0.12 + a * 0.52); if (g.dentro(qq) && longe(qq)) q = qq; } if (!q) return; s += '<text x="' + q[0].toFixed(0) + '" y="' + q[1].toFixed(0) + '" class="cm-cota">' + nf(v) + '</text>'; });
    s += '</g>';
    s += '<g class="cm-l" data-camada="agua">';
    if (g.temRio) { var rp = rioPath(g); s += '<path d="' + rp + '" fill="none" stroke="url(#cm-app-' + uid + ')" stroke-width="34"/><path d="' + rp + '" fill="none" stroke="#fff" stroke-width="7" stroke-opacity=".8"/><path d="' + rp + '" fill="none" stroke="#3f7f99" stroke-width="4.2" stroke-linecap="round"/>'; }
    g.pivos.forEach(function (q) { s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="40" fill="#cfe0c3" fill-opacity=".6" stroke="#3f7f99" stroke-width="1.6" stroke-dasharray="4 3"/><line x1="' + q[0].toFixed(1) + '" y1="' + q[1].toFixed(1) + '" x2="' + (q[0] + 36).toFixed(1) + '" y2="' + (q[1] - 17).toFixed(1) + '" stroke="#3f7f99" stroke-width="1.6"/>'; });
    g.represas.forEach(function (e) { s += '<ellipse cx="' + e.x.toFixed(1) + '" cy="' + e.y.toFixed(1) + '" rx="' + e.rx.toFixed(1) + '" ry="' + e.ry.toFixed(1) + '" transform="rotate(' + e.rot.toFixed(0) + ' ' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ')" fill="#5b93aa" stroke="#fff" stroke-width="1.8"/>'; });
    var rApp = Math.min(18, Math.max(5, 50 / g.mpx));
    g.nascentes.forEach(function (q) { s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + rApp.toFixed(1) + '" fill="none" stroke="#2f6f88" stroke-width="1.1" stroke-dasharray="2 2"/><circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.6" fill="#2f6f88" stroke="#fff" stroke-width="1.4"/>'; });
    if (g.temPoco) s += '<circle cx="' + (g.sede[0] + 22).toFixed(1) + '" cy="' + (g.sede[1] + 4).toFixed(1) + '" r="4.5" fill="#fff" stroke="#2f6f88" stroke-width="2"/>';
    s += '</g></g>';
    s += '<polygon points="' + polStr + '" fill="none" stroke="#1d3a2b" stroke-width="2.4" stroke-dasharray="9 4 2 4"/>';
    var alvoM = [20, 50, 100, 200, 250, 500, 1000, 2000].filter(function (m) { return m / g.mpx >= 60; })[0] || 2000, lpx = alvoM / g.mpx;
    s += '<g class="cm-moldura"><g transform="translate(578 26)"><path d="M0 -14 L7 8 L0 3 L-7 8 Z" fill="#1d3a2b"/><text y="24" text-anchor="middle">N</text></g>' +
      '<g transform="translate(16 330)"><rect width="' + lpx.toFixed(1) + '" height="5" fill="#262826"/><rect width="' + (lpx / 2).toFixed(1) + '" height="5" fill="#f3ecdd" stroke="#262826" stroke-width="1"/><text y="-6">0</text><text x="' + lpx.toFixed(1) + '" y="-6" text-anchor="end">' + (alvoM >= 1000 ? nf(alvoM / 1000) + ' km' : alvoM + ' m') + '</text></g></g>';
    s += '</svg>';
    return s;
  }

  var IC = {
    sede: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5"/></svg>',
    topo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19l7-11 4 6 2-3 5 8z"/></svg>',
    agua: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.7 6 11a6 6 0 0 1-12 0c0-4.3 6-11 6-11z"/></svg>',
    poco: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14"/></svg>',
    pivo: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 12l6-4"/></svg>'
  };

  function marcadores(g) {
    var p = g.p, m = [];
    var benf = p.benf.map(function (b) { return BENF[b] || b; }).join(', ');
    // cada ícone fica em cima do próprio elemento desenhado; entre vários (nascentes, represas, pivôs),
    // usa o primeiro que não encosta em outro ícone. Se nenhum couber, o item fica só na legenda.
    var cands = [
      { c: 'base', ic: 'sede', pos: [g.sede], t: 'Sede e benfeitorias', d: benf.charAt(0).toUpperCase() + benf.slice(1) + '.' + (p.energia ? ' Energia: ' + p.energia + '.' : '') },
      { c: 'altitude', ic: 'topo', pos: [[g.sx, g.sy]], t: 'Ponto mais alto: ' + nf(g.hi) + ' m', d: 'Relevo ' + String(p.topoTxt || p.topo).toLowerCase() + ', de ' + nf(g.lo) + ' a ' + nf(g.hi) + ' m de altitude.' }
    ];
    if (g.pivos.length) cands.push({ c: 'agua', ic: 'pivo', pos: g.pivos, t: g.pivos.length + ' pivôs centrais', d: 'Irrigação por pivô com outorga em vigor (exemplo). Cada círculo é a área irrigada de um pivô.' });
    if (g.represas.length) cands.push({ c: 'agua', ic: 'agua', pos: g.represas.map(function (e) { return [e.x, e.y]; }), t: g.represas[0].lago && g.represas.length === 1 ? 'Lago' : (g.represas.length > 1 ? g.represas.length + ' represas e lagos' : 'Represa'), d: 'Espelho d’água para irrigação, gado ou lazer. Áreas e outorgas conferidas na visita técnica.' });
    if (g.nascentes.length) cands.push({ c: 'agua', ic: 'agua', pos: g.nascentes, t: g.nascentes.length > 1 ? g.nascentes.length + ' nascentes' : 'Nascente', d: p.aguaRes + '. O círculo tracejado marca a APP de 50 m em volta de cada nascente.' });
    cands.forEach(function (cd) {
      for (var k = 0; k < cd.pos.length; k++) {
        var q = cd.pos[k], livre = true;
        for (var j = 0; j < m.length; j++) { var dx = q[0] - m[j].x, dy = q[1] - m[j].y; if (dx * dx + dy * dy < 84 * 84) { livre = false; break; } }
        if (livre) { m.push({ c: cd.c, ic: cd.ic, x: q[0], y: q[1], t: cd.t, d: cd.d }); return; }
      }
    });
    return m;
  }

  function legenda(g, l) {
    var s = '';
    if (l.solo) s += '<div class="cm-leg-g"><h4>Solo</h4><ul>' + g.solos.map(function (so) { return '<li><i style="background:' + so.cor + '"></i><span>' + esc(so.nome) + '<small>' + nf(so.pct * 100) + '% da área · ' + nf(so.ha, so.ha < 10 ? 1 : 0) + ' ha</small></span></li>'; }).join('') + '</ul></div>';
    if (l.altitude) s += '<div class="cm-leg-g"><h4>Altitude</h4><ul><li><i class="cm-i-curva"></i><span>Curvas de nível a cada ' + passoDe(g.hi - g.lo) + ' m</span></li><li><i class="cm-i-topo"></i><span>De ' + nf(g.lo) + ' a ' + nf(g.hi) + ' m · relevo ' + esc(String(g.p.topoTxt || g.p.topo).toLowerCase()) + '</span></li></ul></div>';
    if (l.agua) {
      var it = [];
      if (g.temRio) it.push('<li><i class="cm-i-rio"></i><span>' + g.rioNome + ' e APP</span></li>');
      if (g.nascentes.length) it.push('<li><i class="cm-i-nasc"></i><span>Nascentes</span><b>' + g.nascentes.length + '</b></li>');
      if (g.represas.length) it.push('<li><i class="cm-i-rep"></i><span>Represas e lagos</span><b>' + g.represas.length + '</b></li>');
      if (g.pivos.length) it.push('<li><i class="cm-i-pivo"></i><span>Pivôs centrais</span><b>' + g.pivos.length + '</b></li>');
      if (g.temPoco) it.push('<li><i class="cm-i-poco"></i><span>Poço tubular (ao lado da sede)</span><b>1</b></li>');
      s += '<div class="cm-leg-g"><h4>Água</h4><ul>' + it.join('') + '</ul></div>';
    }
    if (!s) s = '<p class="cm-vazio">Todas as camadas estão desligadas. Ligue uma delas para ver a legenda.</p>';
    s += '<p class="cm-leg-rod">Divisa da propriedade em traço e ponto. Escala gráfica aproximada.</p>';
    return s;
  }

  var uidN = 0;
  Array.prototype.forEach.call(caixas, function (cx) {
    var uid = 'm' + (++uidN);
    var fixo = cx.getAttribute('data-camadas');
    var lista = TN.props;
    var atual = lista.filter(function (p) { return p.cod === fixo; })[0] || lista[0];
    var L = { solo: true, altitude: true, agua: true };
    var sel = fixo ? '' : '<label class="cm-sel"><span>Propriedade</span><select data-cm-sel>' + lista.map(function (p) { return '<option value="' + p.cod + '"' + (p.cod === atual.cod ? ' selected' : '') + '>' + p.cod + ' · ' + esc(p.titulo) + '</option>'; }).join('') + '</select></label>';
    cx.insertAdjacentHTML('beforeend',
      '<div class="cm">' +
      '<div class="cm-barra">' + sel +
      '<div class="cm-camadas" role="group" aria-label="Camadas do mapa">' +
      '<button type="button" data-l="solo" aria-pressed="true"><i class="cm-sw cm-sw-solo"></i>Solo</button>' +
      '<button type="button" data-l="altitude" aria-pressed="true"><i class="cm-sw cm-sw-alt"></i>Altitude</button>' +
      '<button type="button" data-l="agua" aria-pressed="true"><i class="cm-sw cm-sw-agua"></i>Água</button></div></div>' +
      '<div class="cm-quadro"><div class="cm-mapa" data-cm-mapa></div><aside class="cm-legenda" data-cm-leg aria-label="Legenda técnica"></aside></div>' +
      '<p class="cm-leitura" data-cm-leitura>Passe o cursor ou toque no mapa para ler a altitude e o solo de cada ponto. Os ícones abrem detalhes.</p>' +
      '<p class="demo-nota"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg><span><b>Demonstração com dados de exemplo.</b> Croqui esquemático, sem coordenadas, porque a localização é sigilosa. No site real, as camadas vêm do CAR/SIGEF, do mapa de solos e do levantamento planialtimétrico da propriedade.</span></p>' +
      '</div>');
    var mapa = cx.querySelector('[data-cm-mapa]'), leg = cx.querySelector('[data-cm-leg]'), leit = cx.querySelector('[data-cm-leitura]');
    var link = d.querySelector('[data-cm-link]'), tit = d.querySelector('[data-cm-titulo]');
    var g, dica, mks = [];
    function aplica() {
      Object.keys(L).forEach(function (k) { mapa.classList.toggle('sem-' + k, !L[k]); });
      leg.innerHTML = legenda(g, L);
      if (dica && !dica.hidden && dica._c && dica._c !== 'base' && !L[dica._c]) dica.hidden = true;
    }
    function desenha() {
      g = modelo(atual); mks = marcadores(g);
      var h = svg(g, uid);
      mks.forEach(function (mk, i) {
        h += '<button type="button" class="cm-mk cm-mk-' + mk.ic + '" data-c="' + mk.c + '" data-i="' + i + '" style="left:' + (mk.x / W * 100).toFixed(2) + '%;top:' + (mk.y / H * 100).toFixed(2) + '%" aria-label="' + esc(mk.t) + '"><span>' + IC[mk.ic] + '</span></button>';
      });
      h += '<div class="cm-dica" role="status" hidden><button type="button" class="cm-dica-x" aria-label="Fechar">×</button><b></b><p></p></div>';
      mapa.innerHTML = h;
      dica = mapa.querySelector('.cm-dica');
      Array.prototype.forEach.call(mapa.querySelectorAll('.cm-mk'), function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var mk = mks[+b.getAttribute('data-i')];
          dica.querySelector('b').textContent = mk.t; dica.querySelector('p').textContent = mk.d;
          dica._c = mk.c; dica.hidden = false;
          var px = mk.x / W, py = mk.y / H;
          dica.style.left = (px * 100).toFixed(2) + '%'; dica.style.top = (py * 100).toFixed(2) + '%';
          dica.classList.toggle('cm-dica-esq', px > 0.55); dica.classList.toggle('cm-dica-cima', py > 0.5);
        });
      });
      dica.querySelector('.cm-dica-x').addEventListener('click', function (e) { e.stopPropagation(); dica.hidden = true; });
      if (link) { link.href = atual.url; var sp = link.querySelector('span'); if (sp) sp.textContent = 'Abrir a página da ' + atual.cod; }
      if (tit) tit.textContent = atual.cod + ' · ' + atual.titulo + ' · ' + nf(atual.area, atual.area < 10 ? 2 : 0) + ' ha';
      aplica();
    }
    function le(e) {
      var svgEl = mapa.querySelector('svg'); if (!svgEl) return;
      var r = svgEl.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (x < 0 || y < 0 || x > W || y > H) return;
      if (!dentro(x, y, g.pol)) { leit.textContent = 'Fora da divisa da propriedade.'; return; }
      leit.textContent = 'Altitude aprox. ' + nf(Math.round(g.alt(x, y))) + ' m · Solo: ' + g.soloEm(x, y).nome + ' (exemplo)';
    }
    mapa.addEventListener('pointermove', le);
    mapa.addEventListener('pointerdown', le);
    d.addEventListener('click', function (e) { if (dica && !dica.hidden && !e.target.closest('.cm-dica')) dica.hidden = true; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dica && !dica.hidden) dica.hidden = true; });
    Array.prototype.forEach.call(cx.querySelectorAll('[data-l]'), function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-l'); L[k] = !L[k]; b.setAttribute('aria-pressed', L[k] ? 'true' : 'false'); aplica(); });
    });
    var s = cx.querySelector('[data-cm-sel]');
    if (s) s.addEventListener('change', function () { atual = lista.filter(function (p) { return p.cod === s.value; })[0]; desenha(); });
    desenha();
  });
})();

/* ---------------- rodada 7: busca do hero recolhida no celular, CTA final e painel "Agendar visita" em passos */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  var CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';
  var SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // busca rápida do hero: no celular fica recolhida num botão
  var btB = $('.bt-busca'), formB = $('#busca-rapida');
  if (btB && formB) btB.addEventListener('click', function () {
    var abre = !formB.classList.contains('aberta');
    formB.classList.toggle('aberta', abre);
    btB.setAttribute('aria-expanded', abre ? 'true' : 'false');
    if (abre) { var c = $('select', formB); if (c) c.focus(); }
  });

  // bloco de CTA final em tela cheia (páginas que ainda não têm; a ficha em PDF fica de fora)
  var rod = $('footer.rodape');
  if (rod && !$('.cta-final') && !$('.folha')) {
    var sec = d.createElement('section');
    sec.className = 'cta-final'; sec.setAttribute('aria-labelledby', 'h-cta');
    sec.innerHTML = '<img src="img/capa-m.webp" srcset="img/capa-m.webp 800w, img/capa.webp 1600w" sizes="100vw" width="1600" height="900" alt="Lavoura e mata nativa vistas de drone no interior paulista" loading="lazy">' +
      '<div class="w"><p class="kicker">Visita acompanhada</p><h2 id="h-cta">Pise na terra <em>antes.</em></h2>' +
      '<p class="lead">Escolha a propriedade, o dia e a forma: presencial, sobrevoo com drone ou vídeo com o consultor.</p>' +
      '<div class="bts"><button type="button" class="bt bt-b" data-visita>' + CAL + 'Agendar visita</button><a class="bt bt-l" href="propriedades.html">Ver as propriedades ' + SETA + '</a></div></div>';
    var main = $('main');
    if (main && main.parentNode === rod.parentNode) main.appendChild(sec); else rod.parentNode.insertBefore(sec, rod);
  }

  // ---------------- painel lateral: agendar visita (envio simulado)
  var TN = window.TN || { props: [] };
  var props = (TN.props || []).slice().sort(function (a, b) { return a.cod < b.cod ? -1 : 1; });
  var FORMAS = [
    { v: 'presencial', t: 'Visita presencial', s: 'Consultor acompanha na propriedade, depois do termo de confidencialidade.' },
    { v: 'sobrevoo', t: 'Visita com sobrevoo de drone', s: 'Percurso a pé e voo de drone sobre os talhões, se o tempo permitir.' },
    { v: 'video', t: 'Videochamada com o consultor', s: 'Ficha técnica, mapas e fotos aéreas comentados, sem sair de casa.' }
  ];
  var HORAS = ['8h', '10h', '14h', '16h'];
  var NOMES_PASSO = ['Propriedade', 'Data', 'Forma', 'Seus dados'];
  var DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function datas() {
    var r = [], x = new Date(); x.setHours(12, 0, 0, 0);
    while (r.length < 8) {
      x.setDate(x.getDate() + 1);
      if (x.getDay() === 0) continue;
      r.push({ v: x.toISOString().slice(0, 10), dia: DIAS[x.getDay()], n: x.getDate(), mes: MESES[x.getMonth()], longo: DIAS[x.getDay()] + ', ' + x.getDate() + ' de ' + MESES[x.getMonth()] });
    }
    return r;
  }

  var fundo, painel, corpo, rodp, btVolta, btSegue, passosEl, titulo, erroEl, antes = null, passo = 0;
  var est = { cod: '', data: '', forma: '', hora: '', nome: '', tel: '', email: '' };

  function monta() {
    fundo = d.createElement('div'); fundo.className = 'vis-fundo'; fundo.hidden = true;
    painel = d.createElement('div'); painel.className = 'vis'; painel.hidden = true;
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); painel.setAttribute('aria-labelledby', 'vis-t');
    painel.innerHTML =
      '<div class="vis-cab"><p class="kicker">Visita acompanhada</p><h2 id="vis-t">Agendar visita</h2>' +
      '<button type="button" class="vis-x" aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<ol class="vis-passos" aria-label="Etapas">' + NOMES_PASSO.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ol></div>' +
      '<div class="vis-corpo" tabindex="-1"></div>' +
      '<div class="vis-rod"><button type="button" class="bt bt-s" data-vis-volta>Voltar</button><button type="button" class="bt bt-b" data-vis-segue>Continuar</button></div>';
    d.body.appendChild(fundo); d.body.appendChild(painel);
    corpo = $('.vis-corpo', painel); rodp = $('.vis-rod', painel); titulo = $('#vis-t', painel);
    btVolta = $('[data-vis-volta]', painel); btSegue = $('[data-vis-segue]', painel); passosEl = $$('.vis-passos li', painel);
    $('.vis-x', painel).addEventListener('click', fecha);
    fundo.addEventListener('click', fecha);
    btVolta.addEventListener('click', function () { if (passo === 4) { reinicia(); return; } if (passo > 0) mostra(passo - 1); });
    btSegue.addEventListener('click', function () { if (passo === 4) { fecha(); return; } if (valida()) { if (passo === 3) mostra(4); else mostra(passo + 1); } });
    painel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fecha(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', painel).filter(function (el) { return !el.disabled && !el.hidden && el.offsetParent !== null; });
      if (!f.length) return;
      var pri = f[0], ult = f[f.length - 1];
      if (e.shiftKey && (d.activeElement === pri || d.activeElement === corpo)) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && d.activeElement === ult) { e.preventDefault(); pri.focus(); }
    });
    corpo.addEventListener('change', function (e) {
      var t = e.target; if (!t.name) return;
      if (t.type === 'radio') est[t.name] = t.value;
      if (erroEl) erroEl.classList.remove('on');
    });
    corpo.addEventListener('input', function (e) {
      var t = e.target; if (t.name && t.type !== 'radio') { est[t.name] = t.value.trim(); t.removeAttribute('aria-invalid'); }
      if (erroEl) erroEl.classList.remove('on');
    });
  }

  function radio(nome, v, conteudo, cls) {
    return '<label class="' + cls + '"><input type="radio" name="' + nome + '" value="' + esc(v) + '"' + (est[nome] === v ? ' checked' : '') + '>' + conteudo + '</label>';
  }
  function prop(cod) { return props.filter(function (p) { return p.cod === cod; })[0]; }

  function mostra(n) {
    passo = n;
    var h = '';
    if (n === 0) {
      h = '<div><h3>Qual propriedade?</h3><p class="vis-sub">A localização exata só é passada depois do termo de confidencialidade.</p><div class="vis-lista" role="radiogroup" aria-label="Propriedade">' +
        props.map(function (p) { return radio('cod', p.cod, '<span><b>' + esc(p.cod) + ' · ' + esc(p.titulo) + '</b><small>' + esc(p.regiao) + ' · ' + esc(p.precoTxt) + '</small></span>', 'vis-op'); }).join('') +
        radio('cod', 'indefinida', '<span><b>Ainda não escolhi</b><small>O consultor indica as que combinam com o seu perfil.</small></span>', 'vis-op') +
        '</div>';
    } else if (n === 1) {
      h = '<div><h3>Que dia?</h3><p class="vis-sub">Próximos dias úteis e sábados. O consultor confirma com o proprietário.</p><div class="vis-chips" role="radiogroup" aria-label="Data">' +
        datas().map(function (x) { return radio('data', x.v, '<span>' + x.dia + '<b>' + x.n + '</b>' + x.mes + '</span>', 'vis-chip'); }).join('') + '</div>';
    } else if (n === 2) {
      h = '<div><span class="vis-rot" id="vis-rot-f">Forma da visita</span><div class="vis-lista" role="radiogroup" aria-labelledby="vis-rot-f">' +
        FORMAS.map(function (f) { return radio('forma', f.v, '<span><b>' + f.t + '</b><small>' + f.s + '</small></span>', 'vis-op'); }).join('') + '</div>' +
        '<span class="vis-rot" id="vis-rot-h">Horário</span><div class="vis-chips vis-horas" role="radiogroup" aria-labelledby="vis-rot-h">' +
        HORAS.map(function (x) { return radio('hora', x, '<span><b>' + x + '</b></span>', 'vis-chip'); }).join('') + '</div>';
    } else if (n === 3) {
      h = '<div><h3>Seus dados</h3><p class="vis-sub">Para o consultor confirmar a visita e enviar o termo de confidencialidade.</p>' +
        '<div class="vis-campo"><label for="vis-nome">Nome completo</label><input id="vis-nome" name="nome" type="text" autocomplete="name" value="' + esc(est.nome) + '"></div>' +
        '<div class="vis-campo"><label for="vis-tel">WhatsApp com DDD</label><input id="vis-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(16) 90000-0000" value="' + esc(est.tel) + '"></div>' +
        '<div class="vis-campo"><label for="vis-email">E-mail (opcional)</label><input id="vis-email" name="email" type="email" autocomplete="email" value="' + esc(est.email) + '"></div>' +
        '<p class="vis-nota"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg><span>Site de demonstração: ao confirmar, nada é enviado de verdade.</span></p>';
    } else {
      var p = prop(est.cod), dt = datas().filter(function (x) { return x.v === est.data; })[0], fm = FORMAS.filter(function (f) { return f.v === est.forma; })[0];
      h = '<div><div class="vis-ok-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
        '<h3>Visita pré-agendada</h3><p class="vis-sub">O consultor confirma pelo WhatsApp em até 1 dia útil, depois do aceite do proprietário.</p>' +
        '<dl class="vis-resumo">' +
        '<div><dt>Propriedade</dt><dd>' + (p ? esc(p.cod + ' · ' + p.titulo) : 'A indicar pelo consultor') + '</dd></div>' +
        '<div><dt>Data</dt><dd>' + (dt ? esc(dt.longo) : '') + ', ' + esc(est.hora) + '</dd></div>' +
        '<div><dt>Forma</dt><dd>' + (fm ? esc(fm.t) : '') + '</dd></div>' +
        '<div><dt>Contato</dt><dd>' + esc(est.nome) + '<br>' + esc(est.tel) + (est.email ? '<br>' + esc(est.email) : '') + '</dd></div>' +
        '</dl>' +
        '<p class="vis-nota"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg><span><b>Envio simulado.</b> Este é um site de exemplo: nenhuma mensagem foi enviada e nenhum dado saiu do seu navegador.</span></p>';
    }
    h += '<p class="vis-erro" role="alert"></p></div>';
    corpo.innerHTML = h;
    erroEl = $('.vis-erro', corpo);
    passosEl.forEach(function (li, i) {
      li.className = i < n || n === 4 ? 'feito' : (i === n ? 'agora' : '');
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    titulo.textContent = n === 4 ? 'Tudo certo' : 'Agendar visita';
    btVolta.textContent = n === 4 ? 'Agendar outra' : 'Voltar';
    btVolta.hidden = n === 0;
    rodp.classList.toggle('so-um', n === 0);
    btSegue.textContent = n === 4 ? 'Fechar' : (n === 3 ? 'Confirmar visita' : 'Continuar');
    corpo.scrollTop = 0;
    var alvo = n === 4 ? corpo : ($('input:checked', corpo) || $('input', corpo));
    if (alvo) alvo.focus({ preventScroll: n === 0 });
    if (n === 0) { var ck = $('input:checked', corpo); if (ck) ck.closest('label').scrollIntoView({ block: 'nearest' }); }
  }

  function erro(t, el) { erroEl.textContent = t; erroEl.classList.add('on'); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } }
  function valida() {
    if (passo === 0 && !est.cod) { erro('Escolha uma propriedade (ou "Ainda não escolhi").'); return false; }
    if (passo === 1 && !est.data) { erro('Escolha um dia para a visita.'); return false; }
    if (passo === 2 && !est.forma) { erro('Escolha a forma da visita.'); return false; }
    if (passo === 2 && !est.hora) { erro('Escolha um horário.'); return false; }
    if (passo === 3) {
      var dig = (est.tel || '').replace(/\D/g, '');
      if ((est.nome || '').length < 3) { erro('Digite seu nome.', $('#vis-nome', corpo)); return false; }
      if (dig.length < 10 || dig.length > 13) { erro('Digite um WhatsApp com DDD.', $('#vis-tel', corpo)); return false; }
      if (est.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(est.email)) { erro('Confira o e-mail ou deixe em branco.', $('#vis-email', corpo)); return false; }
    }
    return true;
  }
  function reinicia() { est.cod = ''; est.data = ''; est.forma = ''; est.hora = ''; mostra(0); }

  var reduz = matchMedia('(prefers-reduced-motion: reduce)');
  function abre(cod) {
    if (!painel) monta();
    antes = d.activeElement;
    if (cod) est.cod = cod;
    fundo.hidden = false; painel.hidden = false;
    d.documentElement.classList.add('vis-aberto');
    mostra(0);
    void painel.offsetWidth;
    fundo.classList.add('on'); painel.classList.add('on');
  }
  function fecha() {
    if (!painel || painel.hidden) return;
    fundo.classList.remove('on'); painel.classList.remove('on');
    d.documentElement.classList.remove('vis-aberto');
    var fim = function () { painel.hidden = true; fundo.hidden = true; };
    if (reduz.matches) fim(); else setTimeout(fim, 380);
    if (passo === 4) reinicia_silencioso();
    if (antes && antes.focus) antes.focus();
  }
  function reinicia_silencioso() { est.cod = ''; est.data = ''; est.forma = ''; est.hora = ''; }

  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-visita]'); if (!b) return;
    e.preventDefault();
    abre(b.getAttribute('data-cod') || '');
  });
})();

/* ---------------- rodada 8: filtros do hero num painel de baixo no celular, números depois das fazendas no celular,
   e um só "Agendar visita" na primeira tela da propriedade (o do topo some enquanto o da página está à vista) */
(function () {
  'use strict';
  var d = document, cel = window.matchMedia('(max-width: 600px)');
  var bt = d.querySelector('.bt-busca'), form = d.getElementById('busca-rapida'), bts = d.querySelector('.hero-voo .hero-in > .bts');
  if (bt && bts) bts.appendChild(bt);
  if (bt && form) {
    var lugar = d.createComment('busca'); form.parentNode.insertBefore(lugar, form);   // o painel sobe para o body no celular (fica acima de tudo)
    var volta = function () { if (form.parentNode !== lugar.parentNode) lugar.parentNode.insertBefore(form, lugar.nextSibling); };
    var fundo = d.createElement('div'); fundo.className = 'busca-fundo'; fundo.hidden = true; d.body.appendChild(fundo);
    var cab = d.createElement('div'); cab.className = 'busca-cab';
    cab.innerHTML = '<p>Filtrar propriedades</p><button type="button" class="busca-x" aria-label="Fechar filtros">×</button>';
    form.insertBefore(cab, form.firstChild);
    var fecha = function () {
      if (!form.classList.contains('aberta')) return;
      form.classList.remove('aberta'); bt.setAttribute('aria-expanded', 'false'); fundo.hidden = true;
      d.documentElement.classList.remove('busca-aberta'); volta(); bt.focus();
    };
    bt.addEventListener('click', function () {
      var aberta = form.classList.contains('aberta');
      fundo.hidden = !aberta || !cel.matches;
      d.documentElement.classList.toggle('busca-aberta', aberta && cel.matches);
      if (aberta && cel.matches) { d.body.appendChild(form); var c = form.querySelector('select'); if (c) c.focus(); } else volta();
    });
    cab.querySelector('.busca-x').addEventListener('click', fecha);
    fundo.addEventListener('click', fecha);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
  }
  // números da carteira: no celular entram depois das fazendas em destaque
  var num = d.querySelector('main > .numeros'), dest = d.getElementById('h-dest');
  var sec = dest && dest.closest('section');
  if (num && sec && cel.matches) sec.parentNode.insertBefore(num, sec.nextSibling);
  // propriedade: o botão da página já está na primeira tela, então o do topo espera
  var alvo = d.querySelector('main [data-visita][data-cod]'), topoBt = d.querySelector('.topo .bt-visita');
  if (alvo && topoBt && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (x) { d.documentElement.classList.toggle('visita-a-vista', x.isIntersecting || x.boundingClientRect.top > 0); });
    }).observe(alvo);
  }
})();

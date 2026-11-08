/* Prisma · catálogo de imóveis para alugar com filtros, ordem e endereço na URL. */
(function () {
  'use strict';
  var P = window.PRISMA, C = window.PRC, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc;
  var todos = P.carregarImoveis(), f = $('#filtros');
  var uniq = function (k) { return todos.map(function (i) { return i[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }); };
  $('#f-tipo').innerHTML += uniq('tipo').map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
  $('#f-bairro').innerHTML += uniq('bairro').map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');

  // celular: filtros em painel que abre e fecha
  var ab = $('#abre-filtros');
  ab.addEventListener('click', function () { var abre = f.classList.contains('fechado'); f.classList.toggle('fechado', !abre); ab.setAttribute('aria-expanded', String(abre)); ab.textContent = abre ? 'Fechar filtros' : 'Filtrar imóveis'; });

  function lerURL() {
    var q = new URLSearchParams(location.search);
    ['cod', 'tipo', 'bairro', 'max'].forEach(function (k) { if (q.get(k)) f[k].value = q.get(k); });
    ['quartos', 'vagas'].forEach(function (k) { var v = q.get(k) || ''; $$('input[name="' + k + '"]', f).forEach(function (r) { r.checked = r.value === v; }); });
    ['pet', 'mob', 'usp'].forEach(function (k) { f[k].checked = q.get(k) === '1'; });
    if (q.get('ordem')) $('#ordem').value = q.get('ordem');
  }
  function estado() {
    var r = function (n) { var x = f.querySelector('input[name="' + n + '"]:checked'); return x ? x.value : ''; };
    return { cod: f.cod.value.trim().toUpperCase(), tipo: f.tipo.value, bairro: f.bairro.value, max: f.max.value, quartos: r('quartos'), vagas: r('vagas'), pet: f.pet.checked, mob: f.mob.checked, usp: f.usp.checked, ordem: $('#ordem').value };
  }
  function desenhar() {
    var e = estado();
    var lista = todos.filter(function (i) {
      if (e.cod && i.cod.replace('-', '').indexOf(e.cod.replace('-', '')) < 0) return false;
      if (e.tipo && i.tipo !== e.tipo) return false;
      if (e.bairro && i.bairro !== e.bairro) return false;
      if (e.max && i.total > +e.max) return false;
      if (e.quartos && i.quartos < +e.quartos) return false;
      if (e.vagas && i.vagas < +e.vagas) return false;
      if (e.pet && !i.pet) return false; if (e.mob && !i.mobiliado) return false; if (e.usp && !i.usp) return false;
      return true;
    });
    var ord = { menor: function (a, b) { return a.total - b.total; }, maior: function (a, b) { return b.total - a.total; }, area: function (a, b) { return b.area - a.area; }, m2: function (a, b) { return a.aluguel / a.area - b.aluguel / b.area; }, rel: function (a, b) { return (b.novo - a.novo) || (b.cod > a.cod ? 1 : -1); } };
    lista.sort(ord[e.ordem] || ord.rel);
    $('#lista').innerHTML = lista.map(function (i, k) { return C.cartao(i, k > 1); }).join('');
    $('#vazio').hidden = lista.length > 0;
    $('#contador').textContent = lista.length + (lista.length === 1 ? ' imóvel encontrado' : ' imóveis encontrados');
    // chips para tirar filtro um a um
    var chips = [];
    if (e.cod) chips.push(['cod', 'Código ' + e.cod]); if (e.tipo) chips.push(['tipo', e.tipo]); if (e.bairro) chips.push(['bairro', e.bairro]);
    if (e.max) chips.push(['max', 'Até R$ ' + (+e.max).toLocaleString('pt-BR')]); if (e.quartos) chips.push(['quartos', e.quartos + '+ quartos']); if (e.vagas) chips.push(['vagas', e.vagas + '+ vagas']);
    if (e.pet) chips.push(['pet', 'Aceita pet']); if (e.mob) chips.push(['mob', 'Mobiliado']); if (e.usp) chips.push(['usp', 'Perto da USP']);
    $('#chips').innerHTML = chips.map(function (c) { return '<button type="button" data-tira="' + c[0] + '" aria-label="Tirar filtro ' + esc(c[1]) + '">' + esc(c[1]) + '</button>'; }).join('');
    var msg = 'Olá, Prisma! Quero ser avisado quando entrar um imóvel para alugar' + (e.tipo ? ' (' + e.tipo + ')' : '') + (e.bairro ? ' no ' + e.bairro : '') + (e.max ? ', até R$ ' + (+e.max).toLocaleString('pt-BR') + ' por mês' : '') + '.';
    $('#aviso-wa').setAttribute('data-wa', msg);
    // endereço compartilhável
    var q = new URLSearchParams();
    ['cod', 'tipo', 'bairro', 'max', 'quartos', 'vagas'].forEach(function (k) { if (e[k]) q.set(k, e[k]); });
    ['pet', 'mob', 'usp'].forEach(function (k) { if (e[k]) q.set(k, '1'); }); if (e.ordem !== 'rel') q.set('ordem', e.ordem);
    if (history.replaceState) history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
  }
  function limpar() { f.reset(); $('#ordem').value = 'rel'; desenhar(); }
  f.addEventListener('input', desenhar); f.addEventListener('change', desenhar); f.addEventListener('submit', function (e) { e.preventDefault(); });
  $('#ordem').addEventListener('change', desenhar);
  $('#limpar').addEventListener('click', limpar); $('#limpar2').addEventListener('click', limpar);
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tira]'); if (!b) return; var k = b.dataset.tira;
    if (k === 'quartos' || k === 'vagas') $$('input[name="' + k + '"]', f).forEach(function (r) { r.checked = r.value === ''; });
    else if (f[k].type === 'checkbox') f[k].checked = false; else f[k].value = '';
    desenhar();
  });
  lerURL(); desenhar();
})();

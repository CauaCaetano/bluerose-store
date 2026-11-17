// Trutina: ferramenta interna de conferência. Os papéis do cliente ficam só neste navegador; ao servidor vai apenas
// o hash do CPF/CNPJ para o controle das 20 cargas grátis (só a conta do dono, com o código do celular).
(function () {
  'use strict';
  var S = window.SAFRA, $ = function (s) { return document.querySelector(s); };
  var form = $('#tc-form'), res = $('#tc-resultado'), bloq = $('#tc-bloqueio'), cliente = null, dono = false, ultimo = null;
  var COL_GRAOS = { data: 'data', ticket: 'ticket', placa: 'placa', bruto: 'bruto', tara: 'tara', liquido: 'liquido', umidade: 'umidade', impureza: 'impureza', avariados: 'avariados', desconto: 'descontoKg', descontokg: 'descontoKg', final: 'final', pesofinal: 'final', pesopago: 'final', preco: 'preco', valor: 'valor', funrural: 'funrural', retencao: 'funrural' };
  var COL_CANA = { data: 'data', ticket: 'ticket', toneladas: 'toneladas', peso: 'toneladas', atr: 'atr', precoatr: 'precoAtr', valor: 'valor' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var real = function (v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, ''); };
  var ehCana = function () { return form.produto.value === 'cana'; };

  function mostrarColunas() {
    $('#tc-colunas').textContent = ehCana() ? 'data, ticket, toneladas, atr, preco_atr, valor' : 'data, ticket, placa, bruto, tara, liquido, umidade, impureza, avariados, desconto (kg) ou final (kg pagos), preco, valor, funrural';
    document.querySelectorAll('.tc-graos').forEach(function (e) { e.hidden = ehCana(); });
    document.querySelector('.tc-cana').hidden = !ehCana();
  }
  // data em dd/mm/aaaa ou aaaa-mm-dd → aaaa-mm-dd
  function data(v) { var s = String(v || '').trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
  function lerCargas(txt) {
    var linhas = String(txt || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (linhas.length < 2) return { erro: 'Cole a planilha com a linha de títulos e pelo menos uma carga.' };
    var sep = linhas[0].indexOf('\t') >= 0 ? '\t' : ';', mapa = ehCana() ? COL_CANA : COL_GRAOS;
    var cab = linhas[0].split(sep).map(function (c) { return mapa[norm(c)] || null; });
    if (!cab.some(Boolean)) return { erro: 'Não reconheci os títulos das colunas. Use os nomes da planilha modelo.' };
    return { cargas: linhas.slice(1).map(function (l) {
      var c = {}, v = l.split(sep);
      cab.forEach(function (k, i) { if (k) c[k] = k === 'data' ? data(v[i]) : k === 'ticket' || k === 'placa' ? String(v[i] || '').trim() : v[i]; });
      return c;
    }) };
  }
  function tabela(txt) {
    return String(txt || '').split(/\r?\n/).map(function (l) { var p = l.split(/[;\t]/); return p.length >= 2 ? [S.num(p[0]), S.num(p[1])] : null; }).filter(function (f) { return f && f[0] !== null && f[1] !== null; });
  }
  function hashDoc(doc) {
    var d = String(doc || '').replace(/\D/g, '');
    if (d.length !== 11 && d.length !== 14) return Promise.resolve(null);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('trutina-v1:' + d)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function rpc(nome, args) { return cliente.rpc(nome, args || {}).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); }
  function atualizarCota() {
    var el = $('#tc-cota');
    hashDoc(form.doc.value).then(function (h) {
      if (!h) { el.textContent = ''; return; }
      rpc('trutina_cota', { p_doc_hash: h }).then(function (c) {
        el.innerHTML = c ? (c.restam > 0 ? 'Cargas grátis deste produtor: <b>' + c.restam + ' de 20 disponíveis</b>.' : '<b>Este produtor já usou as 20 cargas grátis.</b> A conferência é paga.') : '';
      }).catch(function () { el.textContent = 'Não consegui consultar as cargas grátis agora.'; });
    });
  }

  function desenhar(r, f) {
    var cana = r.produto === 'cana';
    var linhas = r.linhas.map(function (l) {
      var g = l.carga;
      return '<tr' + (l.achados.length ? ' class="tem"' : '') + '><td>' + l.n + '</td><td>' + esc(g.ticket || '') + '</td><td>' + esc(g.data ? g.data.split('-').reverse().join('/') : '') + '</td><td>' +
        (l.achados.length ? l.achados.map(function (a) { return '<span class="tr-achado">' + esc(a.texto) + (a.reais ? ' <b>' + real(a.reais) + '</b>' : '') + '</span>'; }).join('') : '<span class="ok">Confere</span>') + '</td></tr>';
    }).join('');
    var msg = S.mensagemContestacao(r, f.comprador);
    res.hidden = false;
    res.innerHTML = '<h2>Conferência: ' + esc(f.produtor || 'produtor') + ' · ' + esc(cana ? 'cana' : r.produto) + '</h2>' +
      '<div class="tr-res-topo"><div><span>Cargas conferidas</span><b>' + r.totais.cargas + '</b></div><div><span>Cargas com diferença</span><b>' + r.comAchado + '</b></div><div class="tr-favor"><span>Diferença a favor do produtor</span><b>' + real(r.totais.aFavor) + '</b></div></div>' +
      (r.totais.contra ? '<p class="tr-nota">Também apareceram ' + real(r.totais.contra) + ' em diferenças contra o produtor (ele recebeu a mais). Avise o cliente com transparência.</p>' : '') +
      '<div class="tr-tabela-wrap"><table class="tr-tabela"><thead><tr><th>#</th><th>Ticket</th><th>Data</th><th>O que encontramos</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      (r.gerais.length ? '<p class="tr-nota">' + r.gerais.map(function (a) { return esc(a.texto); }).join(' ') + '</p>' : '') +
      (msg ? '<p class="tr-msg-rot">Mensagem pronta para o cliente mandar ao ' + esc(f.comprador || 'armazém') + '</p><pre class="tr-msg" id="tc-msg">' + esc(msg) + '</pre>' : '<p class="tr-nota">Nenhuma diferença a favor do produtor nestas cargas.</p>') +
      '<div class="tc-acoes tc-sem-impressao">' + (msg ? '<button type="button" class="tr-btn" id="tc-copiar">Copiar a mensagem</button>' : '') +
      '<button type="button" class="tr-btn tr-btn-claro" id="tc-imprimir">Imprimir ou salvar em PDF</button>' +
      '<button type="button" class="tr-btn tr-btn-claro" id="tc-gratis">Registrar ' + r.totais.cargas + ' cargas como grátis</button><span id="tc-st2" role="status"></span></div>' +
      '<p class="tr-nota">Conferência documental: confere a aplicação da regra do contrato e as contas. Não classifica grão, não é laudo nem parecer jurídico ou contábil.</p>';
    var cp = $('#tc-copiar'); if (cp) cp.onclick = function () { navigator.clipboard.writeText(msg).then(function () { $('#tc-st2').textContent = 'Mensagem copiada.'; }); };
    $('#tc-imprimir').onclick = function () { window.print(); };
    $('#tc-gratis').onclick = function () {
      var st = $('#tc-st2');
      hashDoc(form.doc.value).then(function (h) {
        if (!h) { st.textContent = 'Informe o CPF ou CNPJ do produtor (11 ou 14 números).'; return; }
        if (!confirm('Registrar ' + r.totais.cargas + ' cargas grátis para este produtor?')) return;
        rpc('trutina_usar_gratis', { p_doc_hash: h, p_cargas: r.totais.cargas, p_produtor: f.produtor }).then(function (c) { st.textContent = 'Registrado. Restam ' + c.restam + ' cargas grátis para este produtor.'; atualizarCota(); })
          .catch(function (e) { st.textContent = 'Não registrou: ' + e.message; });
      });
    };
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.produto.addEventListener('change', mostrarColunas);
  form.doc.addEventListener('change', atualizarCota);
  $('#tc-modelo').onclick = function () {
    var csv = ehCana() ? 'data;ticket;toneladas;atr;preco_atr;valor\n02/08/2026;A1;30,5;131,2;1,1012;4405,20\n' : 'data;ticket;placa;bruto;tara;liquido;umidade;impureza;avariados;desconto;final;preco;valor;funrural\n02/03/2026;0411;ABC1D23;44860;15020;29840;13,8;0,9;;0;29840;120;59680;\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'trutina-modelo-' + (ehCana() ? 'cana' : 'graos') + '.csv'; a.click();
  };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('#tc-status'), l = lerCargas(form.cargas.value);
    if (l.erro) { st.textContent = l.erro; return; }
    st.textContent = '';
    var f = { produtor: form.produtor.value.trim(), comprador: form.comprador.value.trim() }, r;
    if (ehCana()) r = S.conferirCana(l.cargas, { precoAtr: form.precoAtr.value });
    else r = S.conferirGraos(l.cargas, { produto: form.produto.value, preco: form.preco.value, umidade: form.umidade.value, impureza: form.impureza.value, avariados: form.avariados.value, regime: form.regime.value, tabelaUmidade: tabela(form.tabela.value) },
      form.liqKg.value || form.liqValor.value ? { kg: form.liqKg.value, valor: form.liqValor.value } : null);
    ultimo = r; desenhar(r, f);
  });

  // só a conta do dono (com o código do celular) usa a ferramenta
  var carregar = function (src) { return new Promise(function (ok, falha) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = falha; document.head.appendChild(s); }); };
  mostrarColunas();
  carregar('app/config.js').then(function () { return carregar('demos/sistemas/base/supabase.js'); }).then(function () {
    var c = window.NEXO_NUVEM;
    cliente = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nexo-sessao' } });
    return rpc('trutina_sou_dono');
  }).then(function (sim) { dono = !!sim; form.hidden = !dono; bloq.hidden = dono; })
    .catch(function () { bloq.hidden = false; });
})();

/* Prisma · área do inquilino (demonstração no navegador, dados de exemplo; nada é enviado). */
(function () {
  'use strict';
  var P = window.PRISMA, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc, brl = U.brl;
  var inq = P.inquilino();
  var CHAVE = 'prisma-inq', CHAVE_C = 'prisma-chamados';
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  var VENC = new Date(2026, 10, 10), FIM = new Date(2027, 8, 14), INICIO = new Date(2025, 2, 15);
  var dataBR = function (d) { return d.toLocaleDateString('pt-BR'); };
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var lerData = function (v) { var p = String(v || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };

  // ---------- acesso e abas ----------
  var acesso = $('#acesso'), portal = $('#portal');
  var MAPA = { boleto: 'boleto', manutencao: 'manutencao', historico: 'historico', documentos: 'documentos' };
  function entrar(foco) {
    acesso.hidden = true; portal.hidden = false; ss.set(CHAVE, '1'); montar();
    var h = location.hash.replace('#', ''); abrirAba(MAPA[h] || 'resumo', false);
    if (foco) { var t = $('#portal h1'); t.setAttribute('tabindex', '-1'); t.focus(); }
  }
  $('#form-acesso').addEventListener('submit', function (e) { e.preventDefault(); if (U.validar(this)) { entrar(true); U.aviso('Você entrou como a inquilina de exemplo.'); } });
  $('#sair').addEventListener('click', function () { ss.del(CHAVE); portal.hidden = true; acesso.hidden = false; scrollTo(0, 0); $('#ac-email').focus(); U.aviso('Você saiu da demonstração.'); });
  var abas = $$('[role="tab"]');
  function abrirAba(nome, foco) {
    abas.forEach(function (t) { var on = t.id === 't-' + nome; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; if (on && foco) t.focus(); });
    if (history.replaceState) history.replaceState(null, '', nome === 'resumo' ? location.pathname : '#' + nome);
  }
  abas.forEach(function (t, i) {
    t.addEventListener('click', function () { abrirAba(t.id.slice(2)); });
    t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); abrirAba(abas[(i + d + abas.length) % abas.length].id.slice(2), true); });
  });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir-aba]'); if (b) { abrirAba(b.dataset.irAba, true); scrollTo({ top: portal.offsetTop, behavior: 'smooth' }); } });
  addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (MAPA[h] && !portal.hidden) abrirAba(MAPA[h], true); });

  var montado = false;
  function montar() { if (montado) return; montado = true; resumo(); boleto(); historico(); documentos(); manutencao(); }

  // ---------- resumo ----------
  function resumo() {
    var pagos = inq.historico.filter(function (h) { return h.pago; }).length;
    $('#kpis-inq').innerHTML =
      '<div><span>Próximo vencimento</span><strong>' + dataBR(VENC) + '</strong><small>boleto em aberto</small></div>' +
      '<div><span>Valor do mês</span><strong class="num">' + brl(inq.total) + '</strong><small>aluguel e encargos</small></div>' +
      '<div><span>Pagamentos em dia</span><strong>' + (pagos - 1) + ' de ' + pagos + '</strong><small>1 pago com atraso (jul/2026)</small></div>' +
      '<div><span>Fim do contrato</span><strong>' + inq.fim + '</strong><small>' + inq.meses + ' meses · reajuste em março</small></div>';
    $('#venc-txt').textContent = 'Vence em ' + dataBR(VENC) + ' · pague por boleto ou Pix';
    $('#composicao').innerHTML = '<table class="demonstrativo"><thead><tr><th scope="col">Item</th><th scope="col">Valor</th></tr></thead><tbody>' +
      inq.valores.map(function (v) { return '<tr><th scope="row">' + v[0] + '</th><td class="num">' + brl(v[1]) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><th scope="row">Total</th><td class="num"><span class="liq">' + brl(inq.total) + '</span></td></tr></tfoot></table>' +
      '<p class="nota">Pagando até o vencimento, sem multa. Depois: multa de 2% e juros de 1% ao mês, proporcionais aos dias.</p>';
    $('#contrato').innerHTML = [
      ['Imóvel', inq.imovel], ['Início e fim', inq.inicio + ' a ' + inq.fim + ' (' + inq.meses + ' meses)'], ['Reajuste', inq.reajuste],
      ['Garantia', inq.garantia], ['Vencimento', 'todo dia ' + inq.vencimento], ['Gestor', 'Equipe de contratos Prisma (exemplo)']
    ].map(function (x) { return '<li><div><b>' + x[0] + '</b><small>' + esc(x[1]) + '</small></div></li>'; }).join('');

    var sd = $('#sd-data'), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var padrao = new Date(Math.max(hoje.getTime(), new Date(2026, 10, 8).getTime())); padrao.setDate(padrao.getDate() + 30);
    sd.value = iso(padrao); sd.min = iso(new Date(2026, 10, 8)); sd.max = iso(FIM);
    $('#form-saida').addEventListener('submit', function (e) {
      e.preventDefault(); if (!U.validar(this)) return;
      var d = lerData(sd.value);
      if (!d || d >= FIM || d < INICIO) { U.erroCampo(sd, 'Escolha uma data entre hoje e ' + inq.fim + '.'); sd.focus(); return; }
      var diasTot = Math.round((FIM - INICIO) / 864e5), diasRest = Math.round((FIM - d) / 864e5);
      var multa = 3 * inq.valores[0][1] * diasRest / diasTot;
      $('#saida-res').innerHTML = '<div class="confirma" style="margin-top:16px"><p style="margin:0 0 6px"><b>Multa estimada: ' + brl(multa) + '</b></p><p style="margin:0 0 6px">Faltariam ' + diasRest + ' de ' + diasTot + ' dias de contrato. Conta: 3 × ' + brl(inq.valores[0][1]) + ' × ' + diasRest + ' ÷ ' + diasTot + '.</p><p style="margin:0 0 10px">É preciso avisar com 30 dias de antecedência. Transferência de emprego para outra cidade pode isentar a multa (art. 4º, parágrafo único).</p><a class="bt bt-cla bt-peq" href="#" data-wa="Olá, Prisma! Sou a inquilina Marina Alves (exemplo), contrato PR-0874. Pretendo entregar as chaves em ' + dataBR(d) + ' e quero combinar a vistoria de saída.">Avisar a Prisma e combinar a vistoria</a></div>';
    });
  }

  // ---------- boleto ----------
  var LINHA = '23790.50400 41990.874012 26001.110209 8 12790000' + String(Math.round(inq.total * 100)).padStart(10, '0').slice(-10);
  var PIX = '00020126580014BR.GOV.BCB.PIX0136DEMONSTRACAO-SEM-VALOR-PRISMA-PR0874520400005303986540' + inq.total.toFixed(2).length + inq.total.toFixed(2) + '5802BR5925PRISMA ADM EXEMPLO6014RIBEIRAO PRETO62070503***6304ABCD';
  function barras(txt) {
    var d = txt.replace(/\D/g, ''), x = 0, s = '';
    for (var i = 0; i < d.length && x < 600; i++) { var n = +d[i]; var w1 = n % 3 + 1, w2 = (n + 1) % 2 + 1; s += '<rect x="' + x + '" y="0" width="' + w1 + '" height="56"/>'; x += w1 + w2 + 1; }
    return '<svg class="barras" viewBox="0 0 ' + x + ' 56" preserveAspectRatio="none" aria-label="Código de barras de demonstração">' + s + '</svg>';
  }
  function qr(txt) {
    var n = 25, c = 6, s = '', h = 0;
    for (var i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
    var canto = function (x, y) { return '<rect x="' + x * c + '" y="' + y * c + '" width="' + 7 * c + '" height="' + 7 * c + '" fill="#1d2326"/><rect x="' + (x + 1) * c + '" y="' + (y + 1) * c + '" width="' + 5 * c + '" height="' + 5 * c + '" fill="#fff"/><rect x="' + (x + 2) * c + '" y="' + (y + 2) * c + '" width="' + 3 * c + '" height="' + 3 * c + '" fill="#1d2326"/>'; };
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
      h = (h * 1103515245 + 12345) >>> 0; if ((h >> 16) & 1) s += '<rect x="' + x * c + '" y="' + y * c + '" width="' + c + '" height="' + c + '"/>';
    }
    return '<svg viewBox="-12 -12 ' + (n * c + 24) + ' ' + (n * c + 24) + '" width="190" height="190" role="img" aria-label="QR Code de demonstração, não pagável" style="background:#fff;border:1px solid var(--linha)">' + s.replace(/<rect /g, '<rect fill="#1d2326" ') + canto(0, 0) + canto(n - 7, 0) + canto(0, n - 7) + '</svg>';
  }
  function boleto() {
    $('#bol-venc').textContent = dataBR(VENC);
    $('#boleto').innerHTML = '<div class="boleto-cab"><b>Banco Exemplo · 237-2</b><span class="linha-dig">' + LINHA + '</span></div>' +
      '<div class="boleto-grade"><div><span>Beneficiário</span><b>Prisma Adm. (exemplo)</b></div><div><span>Vencimento</span><b>' + dataBR(VENC) + '</b></div><div><span>Nosso número</span><b>0874/112026</b></div><div><span>Valor</span><b class="num">' + brl(inq.total) + '</b></div></div>' +
      '<div class="boleto-grade"><div><span>Pagador</span><b>Marina Alves (exemplo)</b></div><div><span>Contrato</span><b>PR-0874</b></div><div><span>Referência</span><b>nov/2026</b></div><div><span>Após o vencimento</span><b>2% + 1% a.m.</b></div></div>' +
      barras(LINHA) + '<p class="nota" style="margin-top:8px">Boleto de demonstração, sem valor. Não pague.</p>';
    $('#copiar-linha').setAttribute('data-copiar', LINHA.replace(/\D/g, ''));
    $('#pix').innerHTML = '<div style="display:flex;justify-content:center">' + qr(PIX) + '</div><p class="nota" style="text-align:center">QR de demonstração, não pagável</p><div class="campo"><label for="pix-cc">Pix copia e cola</label><textarea id="pix-cc" readonly style="min-height:90px;font-size:13px">' + PIX + '</textarea></div><button type="button" class="bt bt-pri" style="width:100%;margin-top:10px" data-copiar="' + PIX + '">Copiar código Pix</button>';
    var at = $('#at-data'); var d2 = new Date(VENC); d2.setDate(d2.getDate() + 5); at.value = iso(d2); at.min = iso(VENC);
    $('#form-atualiza').addEventListener('submit', function (e) {
      e.preventDefault(); if (!U.validar(this)) return;
      var d = lerData(at.value); if (!d) return;
      var dias = Math.max(0, Math.round((d - VENC) / 864e5));
      if (!dias) { $('#atualiza-res').innerHTML = '<div class="confirma" style="margin-top:14px">Pagando até ' + dataBR(VENC) + ', o valor continua ' + brl(inq.total) + '.</div>'; return; }
      var multa = inq.total * 0.02, juros = inq.total * 0.01 * dias / 30;
      $('#atualiza-res').innerHTML = '<div class="confirma" style="margin-top:14px"><p style="margin:0 0 4px"><b>Novo valor para ' + dataBR(d) + ': ' + brl(inq.total + multa + juros) + '</b></p><p style="margin:0">Multa ' + brl(multa) + ' + juros de ' + dias + ' dia(s) ' + brl(juros) + '. Um novo boleto seria gerado pelo sistema (demonstração).</p></div>';
    });
  }

  // ---------- histórico ----------
  function historico() {
    var t = $('#historico');
    t.innerHTML = '<thead><tr><th scope="col">Referência</th><th scope="col">Vencimento</th><th scope="col" class="dir">Valor</th><th scope="col">Pago em</th><th scope="col">Situação</th><th scope="col"><span class="sr">Recibo</span></th></tr></thead><tbody>' +
      inq.historico.map(function (h, i) {
        var cls = h.status === 'Pago' ? 'selo-ok' : h.status === 'Em aberto' ? 'selo-pend' : 'selo-neutro';
        return '<tr><td data-rot="Referência"><b>' + h.ref + '</b></td><td data-rot="Vencimento">' + h.venc + '</td><td class="dir num" data-rot="Valor">' + brl(h.valor + h.multa) + (h.multa ? ' <small>(com ' + brl(h.multa) + ' de multa e juros)</small>' : '') + '</td><td data-rot="Pago em">' + (h.pago || '—') + '</td><td><span class="selo ' + cls + '">' + h.status + '</span></td><td>' + (h.pago ? '<button type="button" class="bt bt-link nao-imprime" data-recibo="' + i + '">Recibo</button>' : '<button type="button" class="bt bt-link nao-imprime" data-ir-aba="boleto">2ª via</button>') + '</td></tr>';
      }).join('') + '</tbody>';
    t.addEventListener('click', function (e) {
      var b = e.target.closest('[data-recibo]'); if (!b) return; var h = inq.historico[+b.dataset.recibo];
      U.janela('Recibo de ' + h.ref, '<div class="doc-folha"><h3>Recibo de aluguel · exemplo</h3><p>Recebemos de <b>Marina Alves (exemplo)</b> o valor de <b>' + brl(h.valor + h.multa) + '</b>, referente ao aluguel e encargos de ' + h.ref + ' do imóvel ' + esc(inq.imovel) + ', pago em ' + h.pago + '.</p><p>Prisma Administração Imobiliária · CNPJ 00.000.000/0001-00 (exemplo)</p><p class="nota">Documento de demonstração.</p></div><div class="cta-linha"><button type="button" class="bt bt-pri" data-fecha-janela>Fechar</button></div>');
    });
  }

  // ---------- documentos ----------
  var DOCS = [['Contrato de locação', 'Assinado eletronicamente em 10/03/2025 · 30 meses'], ['Laudo de vistoria de entrada', '14/03/2025 · 48 fotos datadas'], ['Apólice do seguro fiança', 'Vigência 03/2026 a 03/2027 · resumo das coberturas'], ['Apólice do seguro incêndio', 'Cobrança mensal no boleto'], ['Regulamento interno do condomínio', 'Versão de 2024'], ['Guia do inquilino Prisma', 'O que é de quem: reparos, vistoria de saída, renovação']];
  function documentos() {
    $('#docs-inq').innerHTML = DOCS.map(function (d, i) { return '<li><span class="tipo" aria-hidden="true">PDF</span><div><b>' + d[0] + '</b><small>' + d[1] + '</small></div><button type="button" class="bt bt-cla bt-peq" data-doc="' + i + '">Abrir</button></li>'; }).join('');
    $('#docs-inq').addEventListener('click', function (e) {
      var b = e.target.closest('[data-doc]'); if (!b) return; var d = DOCS[+b.dataset.doc];
      U.janela(d[0], '<div class="doc-folha"><h3>' + d[0] + '</h3><p><b>Contrato:</b> PR-0874 · ' + esc(inq.imovel) + '<br><b>Detalhes:</b> ' + d[1] + '</p><p>Prévia de demonstração. No site real, o PDF original abre aqui, direto do sistema da administradora.</p></div><div class="cta-linha"><button type="button" class="bt bt-pri" data-fecha-janela>Fechar</button></div>', { largo: true });
    });
  }

  // ---------- manutenção (portal de chamados) ----------
  function manutencao() {
    var meus = []; try { meus = JSON.parse(ss.get(CHAVE_C) || '[]'); } catch (e) {}
    var ETAPAS = ['Recebido', 'Em análise', 'Técnico agendado', 'Concluído'];
    var TXT = ['Pedido registrado no portal.', 'Gestor avaliou: o reparo é do proprietário, sem custo para você.', 'Técnico de exemplo agendado para o turno escolhido.', 'Serviço concluído e fotografado pelo técnico.'];
    var exemplo = inq.chamados.map(function (c) {
      var h = [{ e: 0, d: c.data, t: TXT[0] }];
      if (c.etapa >= 2) h.push({ e: 1, d: c.data, t: TXT[1] });
      if (c.etapa >= 3) h.push({ e: 2, d: c.data, t: 'Técnico agendado: ' + c.prev + '.' });
      if (c.etapa >= 4) h.push({ e: 3, d: c.prev.replace('Resolvido em ', ''), t: TXT[3] });
      return Object.assign({ ex: true, hist: h, nota: c.etapa >= 4 ? 5 : 0 }, c);
    });
    var filtro = 'todos';
    function salvar() { try { ss.set(CHAVE_C, JSON.stringify(meus)); } catch (e) { var semFoto = meus.map(function (c) { return Object.assign({}, c, { foto: null }); }); ss.set(CHAVE_C, JSON.stringify(semFoto)); } }
    function todos() { return meus.concat(exemplo); }
    function hoje() { return new Date().toLocaleDateString('pt-BR'); }
    function desenhar() {
      var lista = todos(), ab = lista.filter(function (c) { return c.etapa < 4 && !c.cancelado; }).length;
      var vis = lista.filter(function (c) { return filtro === 'todos' || (filtro === 'abertos' ? c.etapa < 4 && !c.cancelado : c.etapa >= 4 || c.cancelado); });
      $('#chamados').innerHTML = '<div class="ch-filtro" role="group" aria-label="Filtrar chamados">' +
        [['todos', 'Todos (' + lista.length + ')'], ['abertos', 'Em andamento (' + ab + ')'], ['fechados', 'Concluídos (' + (lista.length - ab) + ')']].map(function (b) { return '<button type="button" data-ch-filtro="' + b[0] + '" aria-pressed="' + (filtro === b[0]) + '">' + b[1] + '</button>'; }).join('') + '</div>' +
        (vis.length ? vis.map(cartao).join('') : '<p style="color:var(--suave)">Nenhum chamado neste filtro.</p>');
    }
    function cartao(c) {
      var st = c.cancelado ? 'Cancelado' : ETAPAS[Math.min(3, c.etapa - 1)];
      var cls = c.cancelado ? 'selo-neutro' : c.etapa >= 4 ? 'selo-ok' : c.etapa === 1 ? 'selo-pend' : 'selo-pet';
      var datas = {}; (c.hist || []).forEach(function (h) { datas[h.e] = h.d; });
      var acoes = '';
      if (!c.cancelado && c.etapa < 4) {
        acoes = '<div class="ch-acoes"><button type="button" class="bt bt-cla bt-peq" data-ch-avanca="' + c.prot + '">Ver próximo passo (simulação)</button>' +
          (c.etapa === 1 ? '<button type="button" class="bt bt-link" data-ch-cancela="' + c.prot + '">Cancelar pedido</button>' : '') +
          '<a href="#" class="bt bt-link" data-wa="' + esc('Olá, Prisma! Sobre o chamado ' + c.prot + ' (' + c.cat + ', ' + c.comodo + '): ') + '">Falar com a Prisma</a></div>';
      }
      var nota = '';
      if (c.etapa >= 4 && !c.cancelado) {
        nota = '<div class="ch-nota" role="group" aria-label="Avaliar o atendimento do chamado ' + c.prot + '"><span>' + (c.nota ? 'Sua avaliação:' : 'Como foi o atendimento?') + '</span>' +
          [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-ch-nota="' + c.prot + '" data-n="' + n + '" class="' + (n <= c.nota ? 'on' : '') + '" aria-label="' + n + ' de 5" aria-pressed="' + (n === c.nota) + '">★</button>'; }).join('') + '</div>';
      }
      return '<div class="chamado"><div class="chamado-cab"><b>' + esc(c.prot) + ' · ' + esc(c.cat) + '</b><span class="selo ' + cls + '">' + st + '</span></div>' +
        '<div class="chamado-corpo"><div><p><small>Aberto em ' + esc(c.data) + ' · ' + esc(c.comodo) + ' · urgência ' + esc(c.urg).toLowerCase() + (c.ex ? ' · exemplo' : '') + '</small></p><p>' + esc(c.desc) + '</p><p><small>' + esc(c.prev) + '</small></p></div>' +
        (c.foto ? '<img class="ch-foto" src="' + c.foto + '" alt="Foto enviada no chamado ' + esc(c.prot) + '" width="88" height="88">' : '') + '</div>' +
        '<ol class="linha-tempo">' + ETAPAS.map(function (e, i) { return '<li class="' + (i < c.etapa && !c.cancelado ? 'feito' : '') + '">' + e + (datas[i] && !c.cancelado ? '<small>' + datas[i] + '</small>' : '') + '</li>'; }).join('') + '</ol>' +
        ((c.hist || []).length ? '<ul class="ch-msgs">' + c.hist.slice().reverse().map(function (h) { return '<li><b>' + h.d + '</b> · ' + esc(h.t) + '</li>'; }).join('') + '</ul>' : '') +
        acoes + nota + '</div>';
    }
    desenhar();
    function achar(p) { return todos().filter(function (c) { return c.prot === p; })[0]; }
    $('#chamados').addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-ch-filtro]'))) { filtro = t.dataset.chFiltro; desenhar(); $('[data-ch-filtro="' + filtro + '"]').focus(); return; }
      if ((t = e.target.closest('[data-ch-avanca]'))) {
        var c = achar(t.dataset.chAvanca); if (!c) return;
        c.etapa = Math.min(4, c.etapa + 1); c.status = ETAPAS[c.etapa - 1];
        var txt = c.etapa === 3 ? 'Técnico de exemplo agendado: ' + (c.turno || 'horário comercial') + ', em até ' + (c.urg === 'Emergência' ? '24 horas' : c.urg === 'Média' ? '5 dias úteis' : '10 dias úteis') + '.' : TXT[c.etapa - 1];
        c.hist = (c.hist || []).concat([{ e: c.etapa - 1, d: hoje(), t: txt }]);
        if (c.etapa >= 4) c.prev = 'Resolvido em ' + hoje();
        salvar(); desenhar(); U.aviso(c.prot + ': ' + c.status.toLowerCase() + '. Você recebe o aviso por e-mail e WhatsApp (demonstração).');
        var nb = $('[data-ch-avanca="' + c.prot + '"]') || $('[data-ch-nota="' + c.prot + '"]'); if (nb) nb.focus();
        return;
      }
      if ((t = e.target.closest('[data-ch-cancela]'))) {
        var k = achar(t.dataset.chCancela); if (!k) return;
        k.cancelado = true; k.hist = (k.hist || []).concat([{ e: 9, d: hoje(), t: 'Pedido cancelado por você.' }]); salvar(); desenhar(); U.aviso(k.prot + ' cancelado.');
        return;
      }
      if ((t = e.target.closest('[data-ch-nota]'))) {
        var n = achar(t.dataset.chNota); if (!n) return;
        n.nota = +t.dataset.n; salvar(); desenhar(); U.aviso('Obrigado! Nota ' + n.nota + ' de 5 enviada ao gestor (demonstração).');
        var nf = $('[data-ch-nota="' + n.prot + '"][data-n="' + n.nota + '"]'); if (nf) nf.focus();
      }
    });
    var foto = $('#mn-foto'), prev = $('#mn-prev'), fotoDados = null;
    foto.addEventListener('change', function () {
      var f = foto.files && foto.files[0]; fotoDados = null;
      if (!f) { prev.hidden = true; $('#mn-foto-st').textContent = 'Nenhuma foto'; return; }
      if (!/^image\//.test(f.type)) { U.aviso('Escolha um arquivo de imagem.', 'ruim'); foto.value = ''; return; }
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 480 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try { fotoDados = cv.toDataURL('image/jpeg', 0.72); } catch (e) { fotoDados = null; }
        prev.src = fotoDados || url; prev.hidden = false; $('#mn-foto-st').textContent = 'Foto pronta (fica só no aparelho)';
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { U.aviso('Não foi possível ler esta imagem.', 'ruim'); URL.revokeObjectURL(url); };
      img.src = url;
    });
    $('#form-manut').addEventListener('submit', function (e) {
      e.preventDefault(); if (!U.validar(this)) return;
      var urg = this.querySelector('input[name="urg"]:checked').value;
      var prazo = urg === 'Alta' ? 'Retorno em até 2 horas e atendimento em até 24 horas.' : urg === 'Média' ? 'Análise em até 1 dia útil e visita em até 5 dias úteis.' : 'Análise em até 2 dias úteis e visita em até 10 dias úteis.';
      var prot = 'CH-' + (2420 + meus.length + 1);
      var c = { prot: prot, data: hoje(), cat: this.cat.value.split(' (')[0], comodo: this.comodo.value, desc: this.desc.value.trim(), urg: urg === 'Alta' ? 'Emergência' : urg, status: 'Recebido', etapa: 1, turno: this.turno.value.toLowerCase(), prev: prazo + ' Turno preferido: ' + this.turno.value.toLowerCase() + '.', foto: fotoDados, hist: [{ e: 0, d: hoje(), t: TXT[0] + (fotoDados ? ' Foto anexada.' : '') }], nota: 0 };
      meus.unshift(c); salvar(); filtro = 'todos'; desenhar();
      var ok = $('#manut-ok');
      ok.innerHTML = '<p style="margin:0 0 6px"><b>Pedido ' + prot + ' recebido.</b></p><p style="margin:0 0 6px">' + prazo + '</p><p style="margin:0">Acompanhe cada etapa abaixo e use "Ver próximo passo" para simular o andamento. Demonstração: nada foi enviado; no site real, o chamado cai no sistema da administradora e o proprietário é avisado quando o reparo é dele.</p>';
      ok.hidden = false; ok.focus();
      this.reset(); prev.hidden = true; fotoDados = null; $('#mn-foto-st').textContent = 'Nenhuma foto';
    });
  }

  if (ss.get(CHAVE) === '1') entrar(false);
})();

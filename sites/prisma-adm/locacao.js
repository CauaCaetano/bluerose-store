/* Prisma · esteira de locação (demonstração). Tudo fica na memória desta aba: nada é gravado nem enviado. */
(function () {
  'use strict';
  var P = window.PRISMA, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc, brl = U.brl, brl0 = U.brl0;
  var dados = {}, etapa = 1, feitas = {};
  var imoveis = P.carregarImoveis();
  $('#prot').textContent = String(Math.floor(4000 + Math.random() * 5000));
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var br = function (v) { var p = String(v).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  function ir(n, foco) {
    etapa = n;
    $$('[data-e]').forEach(function (el) { el.hidden = +el.dataset.e !== n; });
    $$('#passos li').forEach(function (li) { var p = +li.dataset.p; li.className = p === n ? 'atual' : (feitas[p] ? 'feito' : ''); if (p === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    var nFeitas = Object.keys(feitas).length;
    $('#prog').style.width = Math.round(nFeitas / 7 * 100) + '%';
    $('#status-txt').textContent = nFeitas === 7 ? 'locação concluída' : 'etapa ' + n + ' de 7: ' + $('#passos li[data-p="' + n + '"] b').textContent + ' · ' + nFeitas + ' concluída' + (nFeitas === 1 ? '' : 's');
    if (foco !== false) { var h = $('[data-e="' + n + '"] h2'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); var caixa = $('[data-e="' + n + '"]'); if (caixa.getBoundingClientRect().top < 60 || innerWidth < 1060) caixa.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-volta]')) ir(etapa - 1); });

  // 1 · cadastro
  $('#e1').addEventListener('submit', function (e) {
    e.preventDefault(); if (!U.validar(this)) return;
    dados.nome = this.nome.value.trim(); dados.renda = U.num(this.renda.value); dados.ocup = this.ocup.value; dados.ocupTxt = this.ocup.options[this.ocup.selectedIndex].text;
    feitas[1] = true; montarDocs(); ir(2);
  });

  // 2 · imóvel e proposta
  var sel = $('#l-imovel');
  sel.innerHTML = '<option value="">Escolha um imóvel</option>' + imoveis.map(function (i) { return '<option value="' + i.cod + '">' + i.cod + ' · ' + esc(i.titulo) + ' · ' + esc(i.bairro) + ' · ' + brl0(i.aluguel) + '</option>'; }).join('');
  try { var c0 = new URLSearchParams(location.search).get('c'); if (c0 && P.obterImovel(c0)) sel.value = c0.toUpperCase(); } catch (e) {}
  function resumoImovel() {
    var im = P.obterImovel(sel.value), box = $('#l-resumo-imovel');
    if (!im) { box.innerHTML = '<p class="ajuda" style="margin:0">Ainda não escolheu? <a href="imoveis.html">Veja os imóveis disponíveis</a>.</p>'; return; }
    box.innerHTML = '<div class="cartao" style="display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center;padding:14px"><img src="img/' + im.fotos[0][0] + '.webp" width="' + im.fotos[0][1] + '" height="' + im.fotos[0][2] + '" alt="" style="aspect-ratio:4/3;object-fit:cover;width:120px"><div><b>' + esc(im.titulo) + '</b><br><span style="color:var(--suave);font-size:15px">' + esc(im.bairro) + ' · ' + im.area + ' m² · total por mês ' + brl0(im.total) + ' (aluguel ' + brl0(im.aluguel) + ' + condomínio, IPTU e seguro)</span></div></div>';
    $('#l-valor').value = im.aluguel.toLocaleString('pt-BR');
  }
  sel.addEventListener('change', resumoImovel); resumoImovel();
  var mud = $('#l-mudanca'), d15 = new Date(hoje); d15.setDate(d15.getDate() + 15); mud.value = iso(d15); mud.min = iso(hoje);
  $('#e2').addEventListener('submit', function (e) {
    e.preventDefault(); if (!U.validar(this)) return;
    if (this.mudanca.value < iso(hoje)) { U.erroCampo(this.mudanca, 'Escolha uma data a partir de hoje.'); this.mudanca.focus(); return; }
    var im = P.obterImovel(sel.value);
    dados.imovel = im; dados.valor = U.num(this.valor.value); dados.prazo = +this.prazo.value; dados.mudanca = this.mudanca.value;
    dados.total = dados.valor + im.cond + im.iptu + im.seguro;
    feitas[2] = true; ir(3);
  });

  // 3 · documentos
  var DOCS_BASE = [['id', 'RG ou CNH (frente e verso)'], ['res', 'Comprovante de endereço recente']];
  var DOCS_RENDA = { clt: 'Últimos 3 holerites', aut: 'Extratos bancários dos últimos 3 meses', emp: 'Pró-labore ou declaração do Imposto de Renda', apo: 'Extrato do benefício do INSS', est: 'Documentos e renda do responsável pagador' };
  function montarDocs() {
    var lista = DOCS_BASE.slice(0, 1).concat([['renda', DOCS_RENDA[dados.ocup] || 'Comprovante de renda']]).concat(DOCS_BASE.slice(1));
    $('#lista-docs').innerHTML = lista.map(function (d) {
      return '<div class="campo"><label for="doc-' + d[0] + '">' + d[1] + '</label><div class="arquivo"><input id="doc-' + d[0] + '" type="file" accept="image/*,application/pdf" data-doc="' + d[0] + '"><span class="st" data-st="' + d[0] + '">Falta enviar</span></div></div>';
    }).join('');
  }
  $('#lista-docs').addEventListener('change', function (e) {
    var inp = e.target.closest('[data-doc]'); if (!inp) return;
    var f = inp.files && inp.files[0], st = $('[data-st="' + inp.dataset.doc + '"]');
    if (!f) { st.textContent = 'Falta enviar'; delete dados['doc_' + inp.dataset.doc]; return; }
    if (!/^image\/|pdf$/.test(f.type)) { st.textContent = 'Use foto ou PDF'; inp.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { st.textContent = 'Arquivo acima de 10 MB'; inp.value = ''; return; }
    dados['doc_' + inp.dataset.doc] = f.name; st.textContent = 'Pronto · ' + f.name.slice(0, 22) + ' (só no aparelho)'; st.style.color = 'var(--bom)';
    $('#docs-erro').hidden = true;
  });
  $('#docs-exemplo').addEventListener('click', function () {
    $$('[data-st]').forEach(function (st) { dados['doc_' + st.dataset.st] = 'exemplo.pdf'; st.textContent = 'Pronto · arquivo de exemplo'; st.style.color = 'var(--bom)'; });
    $('#docs-erro').hidden = true; U.aviso('Arquivos de exemplo marcados. Nada foi enviado.');
  });
  $('#e3').addEventListener('submit', function (e) {
    e.preventDefault();
    var faltam = $$('[data-st]').filter(function (st) { return !dados['doc_' + st.dataset.st]; });
    if (faltam.length) { var er = $('#docs-erro'); er.textContent = 'Falta' + (faltam.length > 1 ? 'm ' : ' ') + faltam.length + ' documento' + (faltam.length > 1 ? 's' : '') + '. Envie ou use os arquivos de exemplo.'; er.hidden = false; U.aviso('Faltam documentos.', 'ruim'); return; }
    feitas[3] = true; ir(4); analisar();
  });

  // 4 · análise simulada
  function analisar() {
    var r = dados.renda / dados.total, ul = $('#checagem'), res = $('#analise-res');
    $('#ir-garantia').disabled = true; res.innerHTML = '';
    var itens = [
      ['CPF válido e cadastro sem restrições (simulado)', 'ok'],
      ['Documentos legíveis e com o mesmo nome', 'ok'],
      ['Renda de ' + brl0(dados.renda) + ' para um custo mensal de ' + brl0(dados.total) + ' (' + r.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' vezes)', r >= 3 ? 'ok' : 'alerta'],
      ['Pré-análise das garantias disponíveis', 'ok']
    ];
    ul.innerHTML = itens.map(function (it) { return '<li><span class="ic" aria-hidden="true"></span><span>' + esc(it[0]) + '</span></li>'; }).join('');
    var lis = $$('li', ul), k = 0;
    (function prox() {
      if (k > 0) { var a = lis[k - 1]; a.className = itens[k - 1][1]; $('.ic', a).textContent = itens[k - 1][1] === 'ok' ? '✓' : '!'; }
      if (k === lis.length) { fim(); return; }
      lis[k].className = 'rodando'; k++; setTimeout(prox, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 650);
    })();
    function fim() {
      dados.aprov = r >= 3 ? 'aprovado' : r >= 2.5 ? 'condicional' : 'complemento';
      var txt = dados.aprov === 'aprovado' ? '<b>Cadastro aprovado.</b> A renda cobre mais de 3 vezes o custo mensal. Todas as garantias estão liberadas.'
        : dados.aprov === 'condicional' ? '<b>Aprovado com condição.</b> A renda cobre entre 2,5 e 3 vezes o custo. Seguro fiança e CredPago podem pedir análise extra; título de capitalização e caução estão liberados.'
        : '<b>Falta renda para este imóvel.</b> A renda cobre menos de 2,5 vezes o custo. Some a renda de outro morador, escolha um imóvel mais barato ou use título de capitalização ou caução.';
      res.innerHTML = '<div class="' + (dados.aprov === 'complemento' ? 'demo' : 'confirma') + '" style="margin-top:8px"><p style="margin:0">' + txt + '</p></div>';
      $('#ir-garantia').disabled = false; feitas[4] = true; ir(4, false);
    }
  }
  $('#ir-garantia').addEventListener('click', function () { montarGarantias(); ir(5); });

  // 5 · garantias
  function montarGarantias() {
    var t = dados.total, a = dados.valor, restrita = dados.aprov !== 'aprovado';
    var G = [
      ['seguro', 'Seguro fiança', 'A seguradora parceira cobre aluguel e encargos se houver atraso.', Math.round(t * 12 * 0.09), 'por ano, em até 12 × de ' + brl(t * 12 * 0.09 / 12), restrita],
      ['titulo', 'Título de capitalização', 'Você aplica 6 aluguéis no início e resgata corrigido no fim.', a * 6, 'aplicado e devolvido no fim do contrato', false],
      ['credpago', 'CredPago (parceiro de exemplo)', 'Garantia no cartão de crédito, sem consulta a fiador.', Math.round(t * 12 * 0.085), 'por ano, parcelado no cartão', restrita],
      ['caucao', 'Caução', 'Depósito em dinheiro, devolvido no fim se não houver débitos.', a * 3, 'depósito único de 3 aluguéis', false]
    ];
    $('#garantias').innerHTML = G.map(function (g, i) {
      return '<label><input type="radio" name="garantia" value="' + g[0] + '"' + (i === 0 && !g[5] || (g[0] === 'titulo' && restrita) ? ' checked' : '') + (i === 0 ? ' required' : '') + '><b>' + g[1] + '</b><span>' + g[2] + '</span><span class="custo">' + brl0(g[3]) + ' <small style="font-weight:400">' + g[4] + '</small></span>' + (g[5] ? '<span class="selo selo-pend" style="margin-top:8px">Pode pedir análise extra</span>' : '') + '</label>';
    }).join('');
    dados.G = G;
  }
  $('#e5').addEventListener('submit', function (e) {
    e.preventDefault(); if (!U.validar(this)) return;
    var v = this.querySelector('input[name="garantia"]:checked').value;
    dados.garantia = dados.G.filter(function (g) { return g[0] === v; })[0];
    montarContrato(); feitas[5] = true; ir(6);
  });

  // 6 · assinatura
  function montarContrato() {
    var im = dados.imovel;
    $('#contrato-prev').innerHTML = '<h4>Contrato de locação residencial · minuta de exemplo</h4>' +
      '<p><b>Locador:</b> proprietário representado pela Prisma Administração Imobiliária (exemplo).<br><b>Locatário:</b> ' + esc(dados.nome) + '.<br><b>Imóvel:</b> ' + im.cod + ', ' + esc(im.titulo) + ', ' + esc(im.bairro) + ', Ribeirão Preto/SP.</p>' +
      '<p><b>1. Prazo.</b> ' + dados.prazo + ' meses, a partir de ' + br(dados.mudanca) + '.</p>' +
      '<p><b>2. Aluguel.</b> ' + brl(dados.valor) + ' por mês, com vencimento todo dia 10, mais condomínio (' + brl(im.cond) + '), IPTU (' + brl(im.iptu) + ') e seguro incêndio (' + brl(im.seguro) + ').</p>' +
      '<p><b>3. Reajuste.</b> Anual, pelo IGP-M ou pelo IPCA, o que for menor no período.</p>' +
      '<p><b>4. Garantia.</b> ' + dados.garantia[1] + ', conforme condições do parceiro.</p>' +
      '<p><b>5. Multa por saída antecipada.</b> Três aluguéis, proporcional ao período restante, conforme o art. 4º da Lei 8.245/91.</p>' +
      '<p><b>6. Vistoria.</b> Laudo de entrada com fotos datadas, assinado pelas partes, e vistoria de saída comparativa.</p>' +
      '<p><b>7. Manutenção.</b> Pequenos reparos de uso são do locatário; estrutura e defeitos anteriores, do locador.</p>' +
      '<p style="color:var(--suave)">Minuta de demonstração, sem validade jurídica.</p>';
    $('#l-assina').value = '';
  }
  $('#e6').addEventListener('submit', function (e) {
    e.preventDefault(); if (!U.validar(this)) return;
    var a = this.assina.value.trim().toLowerCase().replace(/\s+/g, ' '), n = dados.nome.toLowerCase().replace(/\s+/g, ' ');
    if (a !== n) { U.erroCampo(this.assina, 'Digite o nome exatamente como no cadastro: ' + dados.nome); this.assina.focus(); return; }
    var agora = new Date(), cod = (Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10)).toUpperCase();
    $('#assinatura-ok').innerHTML = '<div class="confirma" style="margin-bottom:18px"><p style="margin:0 0 4px"><b>Contrato assinado eletronicamente.</b></p><p style="margin:0">' + esc(dados.nome) + ' · ' + agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · código de verificação ' + cod + '. No site real, a assinatura passa por uma plataforma como D4Sign, Clicksign ou Autentique, com validade jurídica.</p></div>';
    var v = $('#l-vist'), dv = new Date(dados.mudanca.replace(/-/g, '/')); dv.setDate(dv.getDate() - 1); if (dv < hoje) dv = new Date(hoje);
    v.value = iso(dv); v.min = iso(hoje);
    feitas[6] = true; ir(7);
  });

  // 7 · chaves
  $('#e7').addEventListener('submit', function (e) {
    e.preventDefault(); if (!U.validar(this)) return;
    if (this.vist.value < iso(hoje)) { U.erroCampo(this.vist, 'Escolha uma data a partir de hoje.'); this.vist.focus(); return; }
    feitas[7] = true; ir(7, false);
    var im = dados.imovel, msg = 'Olá, Prisma! Concluí a locação online.\n• Nome: ' + dados.nome + '\n• Imóvel: ' + im.cod + ' (' + im.bairro + ')\n• Garantia: ' + dados.garantia[1] + '\n• Dia: ' + br(this.vist.value) + ' às ' + this.turno.value + '\n• Protocolo: LC-' + $('#prot').textContent;
    $('#final').innerHTML = '<div class="confirma" style="margin-top:20px" tabindex="-1" id="final-ok"><p style="margin:0 0 6px"><b>Tudo pronto. Vistoria e chaves em ' + br(this.vist.value) + ' às ' + this.turno.value + '.</b></p><p style="margin:0 0 6px">Endereço: Rua de Exemplo, 1.000, sala 12, Jardim Irajá (exemplo). Leve um documento com foto. O primeiro boleto, proporcional aos dias, chega no seu e-mail e na área do inquilino.</p><p style="margin:0 0 12px">Protocolo LC-' + $('#prot').textContent + '. Demonstração: nada foi gravado nem enviado.</p><div style="display:flex;flex-wrap:wrap;gap:8px"><a class="bt bt-pri bt-peq" href="#" data-wa="' + esc(msg) + '">Confirmar pelo WhatsApp</a><a class="bt bt-cla bt-peq" href="inquilino.html">Ver como fica a área do inquilino</a></div></div>';
    $('#final-ok').focus();
  });

  ir(1, false);
})();

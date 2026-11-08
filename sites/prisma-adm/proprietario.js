/* Prisma · área do proprietário (demonstração no navegador, dados de exemplo). */
(function () {
  'use strict';
  var P = window.PRISMA, C = window.PRC, U = window.PR, $ = U.$, $$ = U.$$, esc = U.esc, brl = U.brl;
  var prop = P.proprietario(), cs = P.competencias();
  var CHAVE = 'prisma-prop', CHAVE_S = 'prisma-solic-prop';
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} } };

  // ---------- acesso ----------
  var acesso = $('#acesso'), portal = $('#portal');
  function entrar(foco) {
    acesso.hidden = true; portal.hidden = false; ss.set(CHAVE, '1');
    montar();
    var h = location.hash.replace('#', '');
    abrirAba(['extrato', 'informe', 'docs', 'solic'].indexOf(h) >= 0 ? h : 'geral', false);
    if (foco) $('#portal h1').setAttribute('tabindex', '-1'), $('#portal h1').focus();
  }
  $('#form-acesso').addEventListener('submit', function (e) { e.preventDefault(); if (U.validar(this)) { entrar(true); U.aviso('Você entrou como o proprietário de exemplo.'); } });
  $('#sair').addEventListener('click', function () { ss.del(CHAVE); portal.hidden = true; acesso.hidden = false; scrollTo(0, 0); $('#ac-email').focus(); U.aviso('Você saiu da demonstração.'); });

  // ---------- abas ----------
  var abas = $$('[role="tab"]');
  function abrirAba(nome, foco) {
    abas.forEach(function (t) {
      var on = t.id === 't-' + nome; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
      if (on && foco) t.focus();
    });
    if (history.replaceState) history.replaceState(null, '', nome === 'geral' ? location.pathname : '#' + nome);
    if (nome === 'extrato' && montado) $('#ext-comp').dispatchEvent(new Event('change'));
  }
  abas.forEach(function (t, i) {
    t.addEventListener('click', function () { abrirAba(t.id.slice(2), false); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); abrirAba(abas[(i + d + abas.length) % abas.length].id.slice(2), true);
    });
  });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir-aba]'); if (b) { abrirAba(b.dataset.irAba, true); scrollTo({ top: portal.offsetTop, behavior: 'smooth' }); } });

  var montado = false;
  function montar() {
    if (montado) return; montado = true;
    $$('.hoje').forEach(function (el) { el.textContent = new Date().toLocaleDateString('pt-BR'); });
    geral(); extrato(); informe(); documentos(); solicitacoes();
  }

  // ---------- visão geral ----------
  function geral() {
    var ano = cs.filter(function (c) { return c.ano === 2026; });
    var soma = function (k) { return ano.reduce(function (a, c) { return a + c[k]; }, 0); };
    var atual = cs[cs.length - 1], sala = atual.linhas.filter(function (l) { return l.cod === 'PR-0655'; })[0];
    $('#kpis-prop').innerHTML =
      '<div><span>Imóveis</span><strong>3</strong><small>2 alugados · 1 anunciado</small></div>' +
      '<div><span>Recebido em 2026</span><strong class="num">' + brl(soma('bruto')) + '</strong><small>aluguel bruto, jan. a nov.</small></div>' +
      '<div><span>Próximo repasse</span><strong class="num">' + brl(sala.liquido) + '</strong><small>PR-0655 · até 12/11, após o pagamento</small></div>' +
      '<div><span>Despesas em 2026</span><strong class="num">' + brl(soma('despesa')) + '</strong><small>todas com nota no portal</small></div>';

    var pend = [
      { id: 'orc', ic: '!', t: 'Orçamento de reparo aguardando sua aprovação', d: 'PR-0412 · aquecedor a gás com vazamento (chamado CH-2401) · R$ 380,00 · técnico de exemplo', bts: '<button type="button" class="bt bt-pri bt-peq" data-pend="aprovar">Aprovar</button><button type="button" class="bt bt-cla bt-peq" data-pend="ver-orc">Ver orçamento</button><button type="button" class="bt bt-link" data-pend="recusar">Recusar</button>' },
      { id: 'prop', ic: 'R$', t: 'Proposta para alugar a casa do Jardim Califórnia', d: 'PR-1073 · interessado de exemplo oferece R$ 4.000 (anunciado a R$ 4.200), 30 meses, garantia CredPago, cadastro aprovado', bts: '<button type="button" class="bt bt-pri bt-peq" data-pend="aceitar">Aceitar</button><button type="button" class="bt bt-cla bt-peq" data-pend="contra">Fazer contraproposta</button>' },
      { id: 'reaj', ic: '%', t: 'Reajuste anual em janeiro', d: 'PR-0655 · IPCA acumulado estimado em 4,4%: de R$ 5.200,00 para cerca de R$ 5.428,80', bts: '<button type="button" class="bt bt-cla bt-peq" data-pend="ciente">Estou ciente</button>' }
    ];
    $('#pendencias').innerHTML = pend.map(function (p) { return '<li data-id="' + p.id + '"><span class="ic" aria-hidden="true">' + p.ic + '</span><p><b>' + p.t + '</b>' + p.d + '</p><div class="acoes-p">' + p.bts + '</div></li>'; }).join('');
    $('#pendencias').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pend]'); if (!b) return;
      var li = b.closest('li'), a = b.dataset.pend;
      var resolve = function (txt, cls) { li.querySelector('.acoes-p').innerHTML = '<span class="selo ' + (cls || 'selo-ok') + '">' + txt + '</span>'; li.querySelector('.ic').style.background = 'var(--bom-cl)'; li.querySelector('.ic').style.color = 'var(--bom)'; };
      if (a === 'aprovar') { resolve('Aprovado · técnico agendado'); U.aviso('Orçamento aprovado. O inquilino recebe o aviso do horário (demonstração).'); }
      else if (a === 'recusar') { resolve('Recusado · gestor vai ligar', 'selo-neutro'); U.aviso('Recusa registrada. O gestor entra em contato para outra solução.'); }
      else if (a === 'ver-orc') U.janela('Orçamento do chamado CH-2401', '<div class="doc-folha"><h3>Orçamento de reparo · exemplo</h3><p><b>Imóvel:</b> PR-0412 · Apartamento 2 quartos · Nova Aliança</p><table class="demonstrativo"><tbody><tr><th scope="row">Troca da serpentina do aquecedor</th><td class="num">R$ 290,00</td></tr><tr><th scope="row">Mão de obra e teste de vazamento</th><td class="num">R$ 90,00</td></tr></tbody><tfoot><tr><th scope="row">Total</th><td class="num"><span class="liq">R$ 380,00</span></td></tr></tfoot></table><p style="margin-top:12px">Responsabilidade do proprietário (desgaste natural, art. 22 da Lei do Inquilinato). Fotos do problema anexadas pelo técnico.</p><p class="nota">Documento de demonstração.</p></div><div class="cta-linha"><button type="button" class="bt bt-pri" data-fecha-janela>Fechar</button></div>');
      else if (a === 'aceitar') { resolve('Proposta aceita · contrato em preparo'); U.aviso('Proposta aceita. O interessado segue para a assinatura eletrônica (demonstração).'); }
      else if (a === 'contra') {
        var corpo = U.janela('Contraproposta para PR-1073', '<form class="form" id="form-contra" novalidate><div class="campo"><label for="cp-valor">Valor do aluguel (R$)</label><input id="cp-valor" type="text" inputmode="numeric" data-tipo="dinheiro" required value="4.100"></div><div class="campo"><label for="cp-obs">Recado ao interessado (opcional)</label><textarea id="cp-obs" placeholder="Ex.: incluo a limpeza da caixa d\'água antes da entrega."></textarea></div><button type="submit" class="bt bt-pri">Enviar contraproposta</button></form>');
        corpo.querySelector('form').addEventListener('submit', function (ev) { ev.preventDefault(); if (!U.validar(this)) return; var v = U.num(this.querySelector('#cp-valor').value); U.fecharJanela(); resolve('Contraproposta de ' + U.brl0(v) + ' enviada', 'selo-pend'); U.aviso('Contraproposta enviada ao interessado (demonstração).'); });
      }
      else if (a === 'ciente') { resolve('Ciente', 'selo-neutro'); }
    });

    var ult = cs.slice(-13, -1), g = $('#graf-geral'); g.innerHTML = C.grafico(ult, g.clientWidth); C.ligarGrafico(g, ult);

    $('#meus-imoveis').innerHTML = prop.imoveis.map(function (im) {
      var vago = im.situacao !== 'Alugado';
      return '<li><div><b>' + im.cod + ' · ' + esc(im.nome) + '</b><small>' + esc(im.bairro) + ' · ' + esc(im.inquilino) + '</small>' +
        (vago ? '<small>Anúncio: 312 visualizações · 4 visitas · 1 proposta · <a href="imovel.html?c=PR-1073">ver anúncio</a></small>' : '<small>Contrato ' + im.inicio + ' a ' + im.fim + ' · reajuste ' + esc(im.reajuste) + ' · ' + esc(im.garantia) + '</small>') +
        '</div><span class="selo ' + (vago ? 'selo-pend' : 'selo-ok') + '">' + im.situacao + '</span></li>';
    }).join('');
    var atualL = atual.linhas;
    $('#proximos').innerHTML = atualL.filter(function (l) { return l.bruto; }).map(function (l) {
      return '<li><div><b>' + l.cod + ' · ' + brl(l.liquido) + '</b><small>' + (l.situacao === 'repassado' ? 'Repassado em ' + l.data + ' por Pix' : 'Previsto até 12/11/2026, 2 dias úteis após o pagamento (vence 10/11)') + '</small></div>' + C.SIT[l.situacao](l) + '</li>';
    }).join('') + '<li><div><b>PR-1073 · − R$ 180,00</b><small>IPTU do mês do imóvel vago, descontado do repasse do PR-0412</small></div><span class="selo selo-neutro">Desconto</span></li>';
  }

  // ---------- extrato ----------
  function extrato() {
    var sel = $('#ext-comp'), selIm = $('#ext-imovel');
    sel.innerHTML = cs.slice().reverse().map(function (c, i) { return '<option value="' + (cs.length - 1 - i) + '">' + c.rotulo.charAt(0).toUpperCase() + c.rotulo.slice(1) + (i === 0 ? ' (em aberto)' : '') + '</option>'; }).join('');
    sel.value = String(cs.length - 2); // outubro/2026, último mês fechado
    selIm.innerHTML += prop.imoveis.map(function (im) { return '<option value="' + im.cod + '">' + im.cod + ' · ' + esc(im.nome) + '</option>'; }).join('');
    $('#doc-filtro').innerHTML += prop.imoveis.map(function (im) { return '<option value="' + im.cod + '">' + im.cod + ' · ' + esc(im.nome) + '</option>'; }).join('');
    $('#so-imovel').innerHTML = '<option value="">Escolha</option>' + prop.imoveis.map(function (im) { return '<option>' + im.cod + ' · ' + esc(im.nome) + '</option>'; }).join('') + '<option>Todos os imóveis</option>';
    function filtrada(c) {
      var cod = selIm.value; if (!cod) return c;
      var l = c.linhas.filter(function (x) { return x.cod === cod; });
      var soma = function (k) { return l.reduce(function (a, x) { return a + x[k]; }, 0); };
      return { rotulo: c.rotulo, curto: c.curto, linhas: l, bruto: soma('bruto'), taxa: soma('taxa'), despesa: soma('despesa'), imposto: soma('imposto'), liquido: soma('liquido') };
    }
    function desenhar() {
      var i = +sel.value, c = filtrada(cs[i]);
      $('#ext-titulo').textContent = 'Extrato de ' + c.rotulo;
      var lin = c.linhas.filter(function (l) { return l.bruto || l.despesa; });
      $('#ext-tabela').innerHTML = lin.length ? C.tabelaExtrato(c, true) : '<div class="vazio"><p><b>Sem movimento neste imóvel na competência.</b></p><p style="margin:0">Imóvel vago e sem despesas lançadas. Escolha outra competência ou veja todos os imóveis.</p></div>';
      var ini = Math.max(0, i - 11), serie = cs.slice(ini, i + 1).map(filtrada), g = $('#graf-extrato');
      g.innerHTML = C.grafico(serie, g.clientWidth); C.ligarGrafico(g, serie);
    }
    sel.addEventListener('change', desenhar); selIm.addEventListener('change', desenhar); desenhar();

    $('#ext-csv').addEventListener('click', function () {
      var c = filtrada(cs[+sel.value]), n = function (v) { return String(v.toFixed(2)).replace('.', ','); };
      var linhas = [['Competência', 'Imóvel', 'Descrição', 'Aluguel bruto', 'Taxa de administração', 'Despesas', 'Descrição da despesa', 'IRRF', 'Líquido', 'Situação do repasse']];
      c.linhas.forEach(function (l) { linhas.push([c.rotulo, l.cod, l.nome, n(l.bruto), n(l.taxa), n(l.despesa), l.despesaDesc, n(l.imposto), n(l.liquido), l.situacao === 'repassado' ? 'Repassado em ' + l.data : l.situacao]); });
      linhas.push([c.rotulo, 'TOTAL', '', n(c.bruto), n(c.taxa), n(c.despesa), '', n(c.imposto), n(c.liquido), '']);
      var csv = '﻿' + linhas.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      var a = document.createElement('a'); a.href = url; a.download = 'extrato-prisma-' + c.curto.replace('/', '-') + '-exemplo.csv'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
      U.aviso('Planilha de exemplo baixada (abre no Excel ou Google Planilhas).');
    });
    $('#ext-comprov').addEventListener('click', function () {
      var c = cs[+sel.value], rep = c.linhas.filter(function (l) { return l.situacao === 'repassado'; });
      if (!rep.length) { U.aviso('Ainda não há repasse feito nesta competência.'); return; }
      U.janela('Comprovante de repasse · ' + c.rotulo, '<div class="doc-folha"><h3>Comprovante de transferência · exemplo</h3>' + rep.map(function (l) { return '<p><b>' + l.cod + '</b> · ' + brl(l.liquido) + ' · Pix em ' + l.data + ' às 10:14<br><small>Origem: Prisma Adm. · conta de repasses (exemplo) · Destino: Banco Exemplo ag. 0000 c/c ****-7 · ID E00000000' + l.cod.slice(3) + 'EXEMPLO</small></p>'; }).join('') + '<p class="nota">Documento de demonstração, sem valor bancário. No site real, o comprovante vem do banco ou do sistema.</p></div><div class="cta-linha"><button type="button" class="bt bt-pri" data-fecha-janela>Fechar</button></div>');
    });
  }

  // ---------- informe ----------
  function informe() {
    var sel = $('#inf-ano');
    function desenhar() {
      var ano = +sel.value, linhas = P.informe(ano);
      $('#inf-titulo').textContent = 'Informe de rendimentos · ano-calendário ' + ano + (ano === 2026 ? ' (parcial)' : '');
      var t = { bruto: 0, taxa: 0, imposto: 0, despesa: 0 };
      var h = '<table class="demonstrativo resp"><thead><tr><th scope="col">Imóvel e locatário</th><th scope="col">Aluguéis recebidos</th><th scope="col">Taxa de administração paga</th><th scope="col">IRRF retido</th><th scope="col">Despesas do proprietário</th></tr></thead><tbody>';
      linhas.forEach(function (l) {
        ['bruto', 'taxa', 'imposto', 'despesa'].forEach(function (k) { t[k] += l[k]; });
        h += '<tr><th scope="row">' + l.cod + '<small>' + esc(l.nome) + '</small><small>' + esc(l.inquilino) + (l.pj ? ' · CNPJ 00.000.000/0001-00' : ' · CPF ***.***.***-**') + '</small></th><td class="num" data-rot="Aluguéis recebidos">' + brl(l.bruto) + '</td><td class="num" data-rot="Taxa de administração">' + brl(l.taxa) + '</td><td class="num" data-rot="IRRF retido">' + brl(l.imposto) + '</td><td class="num" data-rot="Despesas">' + brl(l.despesa) + '</td></tr>';
      });
      h += '</tbody><tfoot><tr><th scope="row">Total do ano</th><td class="num" data-rot="Aluguéis recebidos"><span class="liq">' + brl(t.bruto) + '</span></td><td class="num" data-rot="Taxa de administração">' + brl(t.taxa) + '</td><td class="num" data-rot="IRRF retido">' + brl(t.imposto) + '</td><td class="num" data-rot="Despesas">' + brl(t.despesa) + '</td></tr></tfoot></table>';
      $('#inf-tabela').innerHTML = h;
    }
    sel.addEventListener('change', desenhar); desenhar();
  }

  // ---------- documentos ----------
  var DOCS = [
    ['PR-0412', 'Contrato de locação residencial', 'Assinado eletronicamente em 28/02/2024 · 14 páginas'],
    ['PR-0412', 'Laudo de vistoria de entrada', '02/03/2024 · 54 fotos datadas'],
    ['PR-0412', 'Apólice do seguro fiança 2026/2027', 'Vigência até 02/2027 · seguradora parceira (exemplo)'],
    ['PR-0412', 'Nota fiscal · reparo no registro do chuveiro', 'Junho de 2026 · R$ 260,00'],
    ['PR-0655', 'Contrato de locação comercial', 'Assinado em 05/01/2023 · 18 páginas'],
    ['PR-0655', 'Aditivo de reajuste pelo IPCA', 'Janeiro de 2026 · novo valor R$ 5.200,00'],
    ['PR-0655', 'Título de capitalização (garantia)', 'Valor de 6 aluguéis · resgate no fim do contrato'],
    ['PR-1073', 'Laudo de vistoria de saída', '04/08/2026 · 61 fotos · comparativo com a entrada'],
    ['PR-1073', 'Nota fiscal · pintura interna', 'Setembro de 2026 · R$ 2.400,00'],
    ['', 'Contrato de administração com a Prisma', 'Taxa de 8% · reparos acima de R$ 300 só com aprovação'],
    ['', 'Informe de rendimentos 2025', 'Gerado em 27/02/2026']
  ];
  function documentos() {
    var sel = $('#doc-filtro');
    function desenhar() {
      var f = sel.value;
      $('#docs').innerHTML = DOCS.map(function (d, i) { return [d, i]; }).filter(function (x) { return !f || x[0][0] === f || !x[0][0]; }).map(function (x) {
        var d = x[0]; return '<li><span class="tipo" aria-hidden="true">PDF</span><div><b>' + esc(d[1]) + '</b><small>' + (d[0] || 'Geral') + ' · ' + esc(d[2]) + '</small></div><button type="button" class="bt bt-cla bt-peq" data-doc="' + x[1] + '">Abrir</button></li>';
      }).join('');
    }
    sel.addEventListener('change', desenhar); desenhar();
    $('#docs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-doc]'); if (!b) return; var d = DOCS[+b.dataset.doc];
      U.janela(d[1], '<div class="doc-folha"><h3>' + esc(d[1]) + '</h3><p><b>Imóvel:</b> ' + (d[0] || 'todos os imóveis do proprietário') + '<br><b>Proprietário:</b> Carlos Menezes (exemplo)<br><b>Detalhes:</b> ' + esc(d[2]) + '</p><p>Prévia de demonstração. No site real, o PDF original fica guardado no sistema da administradora e abre aqui com o mesmo login, sem precisar pedir por e-mail.</p></div><div class="cta-linha"><button type="button" class="bt bt-pri" data-fecha-janela>Fechar</button></div>', { largo: true });
    });
  }

  // ---------- solicitações ----------
  function solicitacoes() {
    var base = [
      { prot: 'SP-1187', data: '21/10/2026', tipo: 'Pedir reavaliação do aluguel', imovel: 'PR-0412 · Apartamento 2 quartos', status: 'Respondida', det: 'Gestor enviou comparativo de 6 imóveis do bairro: aluguel atual está na média.' },
      { prot: 'SP-1152', data: '02/09/2026', tipo: 'Autorizar um reparo', imovel: 'PR-1073 · Casa térrea 3 quartos', status: 'Concluída', det: 'Pintura interna feita entre 08 e 15/09. Nota fiscal em Documentos.' }
    ];
    var minhas = []; try { minhas = JSON.parse(ss.get(CHAVE_S) || '[]'); } catch (e) {}
    function desenhar() {
      $('#lista-solic').innerHTML = minhas.concat(base).map(function (s) {
        var cls = s.status === 'Recebida' ? 'selo-pend' : s.status === 'Concluída' ? 'selo-ok' : 'selo-neutro';
        return '<div class="chamado"><div class="chamado-cab"><b>' + esc(s.prot) + ' · ' + esc(s.tipo) + '</b><span class="selo ' + cls + '">' + esc(s.status) + '</span></div><p><small>' + esc(s.data) + ' · ' + esc(s.imovel) + '</small></p><p>' + esc(s.det) + '</p></div>';
      }).join('');
    }
    desenhar();
    $('#form-solic').addEventListener('submit', function (e) {
      e.preventDefault(); if (!U.validar(this)) return;
      var prot = 'SP-' + (1200 + minhas.length + 1);
      var s = { prot: prot, data: new Date().toLocaleDateString('pt-BR'), tipo: this.tipo.value, imovel: this.imovel.value, status: 'Recebida', det: this.desc.value.trim() + ' · retorno por ' + this.querySelector('input[name="retorno"]:checked').value + ' em até 1 dia útil.' };
      minhas.unshift(s); ss.set(CHAVE_S, JSON.stringify(minhas)); desenhar(); this.reset();
      U.aviso('Solicitação ' + prot + ' registrada. Prazo de resposta: 1 dia útil (demonstração).');
    });
  }

  if (ss.get(CHAVE) === '1') entrar(false);
  else if (location.hash) { /* mantém o destino para depois do login */ }
})();

// Minha conta: Prospecção do Anshur (só o dono vê; o banco devolve nulo para as demais contas e sem a verificação em duas etapas).
// O painel NUNCA envia nada: ele monta a mensagem e abre o WhatsApp; quem aperta enviar é o dono.
(function () {
  'use strict';
  var C = window.BR_CONTA, bloco = document.getElementById('prospeccao');
  if (!C || !bloco) return;
  var esc = C.esc, cliente = null, D = null, aba = 'hoje', sel = null, filtro = { q: '', faixa: '', uf: '', etapa: '' };
  var SITE = 'https://bluerose-store.com/';
  var ETAPAS = [['novo', 'Novo'], ['contatado', 'Contatado'], ['retomada1', 'Retomada 1'], ['retomada2', 'Retomada 2'], ['abriu_link', 'Abriu o link'],
    ['respondeu', 'Respondeu'], ['teste', 'Teste às cegas'], ['negociando', 'Negociando'], ['assinou', 'Assinou'], ['perdido', 'Perdido'], ['nao_contatar', 'Não contatar']];
  var NOME_ETAPA = {}; ETAPAS.forEach(function (e) { NOME_ETAPA[e[0]] = e[1]; });
  var ACAO = { primeiro: 'Primeiro contato', retomada1: 'Retomada 1', retomada2: 'Retomada 2 (última)' };

  function dia(d) { return d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4) : '—'; }
  function rpc(nome, args) { return cliente.rpc(nome, args || {}).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); }
  function fone(z) { var d = String(z || '').replace(/^55/, ''); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d; }
  function porId(id) { for (var i = 0; i < D.prospects.length; i++) if (D.prospects[i].id === id) return D.prospects[i]; return null; }
  function link(p) { return SITE + 'anshur.html?p=' + p.codigo; }
  function recente(p) {
    if (!p.anuncios_data || !p.anuncios_usados) return false;
    return (new Date(D.hoje + 'T12:00:00') - new Date(p.anuncios_data + 'T12:00:00')) / 864e5 < 30;
  }

  // textos propostos (prospeccao-mensagens-para-aprovar.md), com as variáveis preenchidas
  function mensagem(p, acao) {
    var lugar = p.cidade + '/' + p.uf, l = link(p);
    if (acao === 'retomada1') return [
      'Olá! Passando apenas para retomar minha mensagem anterior sobre o Anshur.',
      'É um sistema desenvolvido para organizar a operação de revendas agrícolas, especialmente avaliações de troca, máquinas usadas, pátio, vendas e gestão.',
      'Se quiser conhecer sem compromisso, a demonstração está disponível aqui: ' + l,
      'Também existe um teste gratuito com cinco trocas antigas da própria revenda.',
      'Se não for um assunto de interesse agora, sem problema. Basta me avisar e encerro os contatos. Obrigado!'].join('\n\n');
    if (acao === 'retomada2') return [
      'Olá! Esta é minha última mensagem sobre o Anshur para não insistir.',
      'Caso faça sentido conhecer um sistema de gestão desenvolvido para revendas de máquinas agrícolas, você pode explorar a demonstração e conhecer as condições de contratação diretamente pelo site.',
      'Demonstração: ' + l + '\nPreço: R$ 2.000/mês por revenda, com todas as lojas incluídas, sem implantação e sem fidelidade.',
      'Se não houver interesse, não faremos novos contatos. Obrigado pela atenção!\nBlue Rose Express'].join('\n\n');
    var terceiro = recente(p)
      ? 'Vi que a ' + p.empresa + ' possui aproximadamente ' + p.anuncios_usados + ' anúncios de máquinas usadas em ' + lugar + '.'
      : 'Encontrei a ' + p.empresa + ' em uma pesquisa de revendas da região de ' + lugar + ' e vi que vocês trabalham com máquinas usadas.';
    return ['Olá! Tudo bem?',
      'Sou da Blue Rose Express e gostaria de apresentar o Anshur, um sistema de gestão desenvolvido para revendas de máquinas agrícolas.',
      terceiro,
      'O Anshur reúne avaliação de trocas, estoque, pátio, vendas, oficina, peças e financeiro em um único sistema.',
      'Temos uma demonstração gratuita, sem cadastro, e também um teste às cegas em que a própria revenda pode analisar cinco trocas antigas.',
      'Se tiver interesse, deixo os links:\nDemonstração: ' + l + '\nTeste às cegas: https://bluerose-store.com/anshur/teste-as-cegas.html',
      'O valor é R$ 2.000/mês por revenda, incluindo todas as lojas, sem taxa de implantação e sem fidelidade. A contratação pode ser feita diretamente pelo site, sem reunião ou ligação.',
      'Se não for do interesse da empresa, basta avisar que não faremos novos contatos. Obrigado!'].join('\n\n');
  }

  function acaoNaFila(id) {
    var f = D.fila, l = (f.retomadas || []).concat(f.novos || []);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i].acao;
    return null;
  }

  function cartao(p, acao) {
    var ap = D.config.textos_aprovados, msg = acao ? mensagem(p, acao) : null, ev = D.eventos[p.id] || {};
    var final = p.etapa === 'nao_contatar';
    var botao = '';
    if (acao) {
      if (!p.whatsapp) botao = '<button type="button" class="btn btn-primary" disabled>Sem WhatsApp publicado</button>';
      else if (!ap) botao = '<button type="button" class="btn btn-primary pp-zap" disabled title="Marque “Textos aprovados” no topo do painel">Abrir WhatsApp com a mensagem</button>';
      else botao = '<a class="btn btn-primary pp-zap" data-enviar="' + p.id + '" data-acao="' + acao + '" target="_blank" rel="noopener noreferrer" href="https://wa.me/' +
        esc(p.whatsapp) + '?text=' + encodeURIComponent(msg) + '">Abrir WhatsApp com a mensagem</a>';
    }
    return '<article class="pp-cartao" data-id="' + p.id + '">' +
      '<header><h4>' + esc(p.empresa) + '</h4><span class="pp-faixa f' + esc(p.faixa) + '">Faixa ' + esc(p.faixa) + ' · ' + p.pontuacao + ' pts</span>' +
      (acao ? '<span class="pp-acao">' + esc(ACAO[acao]) + '</span>' : '') + '<span class="pp-etapa">' + esc(NOME_ETAPA[p.etapa] || p.etapa) + '</span></header>' +
      '<dl class="pp-dados">' +
      '<div><dt>Cidade</dt><dd>' + esc(p.cidade || '—') + '/' + esc(p.uf) + (p.lojas && p.lojas.length > 1 ? ' (' + p.lojas.length + ' lojas)' : '') + '</dd></div>' +
      '<div><dt>WhatsApp da empresa</dt><dd>' + (p.whatsapp ? esc(fone(p.whatsapp)) : '—') + '</dd></div>' +
      '<div><dt>Telefone</dt><dd>' + esc(p.telefone || '—') + '</dd></div>' +
      '<div><dt>Anúncios de usados</dt><dd>' + (p.anuncios_usados || 0) + (p.anuncios_data ? ' <small>(contados em ' + dia(p.anuncios_data) + ')</small>' : '') + '</dd></div>' +
      '<div class="pp-larga"><dt>Categorias</dt><dd>' + esc((p.categorias || []).join(', ') || '—') + '</dd></div>' +
      '<div class="pp-larga"><dt>Marcas anunciadas</dt><dd>' + esc((p.marcas || []).join(', ') || '—') + '</dd></div>' +
      '<div><dt>Próximo contato</dt><dd>' + dia(p.proximo_contato) + '</dd></div>' +
      '<div><dt>Link próprio</dt><dd><code>?p=' + esc(p.codigo) + '</code>' + (ev.abriu_link ? ' · abriu ' + ev.abriu_link + 'x' : '') + (ev.demonstracao ? ' · demo ' + ev.demonstracao + 'x' : '') +
      (ev.teste_cegas ? ' · teste ' + ev.teste_cegas + 'x' : '') + (ev.assinar ? ' · assinar ' + ev.assinar + 'x' : '') + '</dd></div>' +
      '</dl>' +
      '<p class="pp-just"><b>Por que esta prioridade:</b> ' + esc(p.justificativa) + '</p>' +
      '<details class="pp-fontes"><summary>Fontes (' + (p.fontes || []).length + ')</summary><ul>' + (p.fontes || []).map(function (f) {
        var u = /^https:\/\//.test(f.url || '') ? f.url : null;
        return '<li>' + esc(f.fonte) + ', ' + dia(f.data) + (u ? ': <a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u.replace(/^https:\/\/(www\.)?/, '').slice(0, 70)) + '</a>' : '') + '</li>';
      }).join('') + '</ul></details>' +
      (msg ? '<p class="pp-rot">Mensagem pronta (' + esc(ACAO[acao]) + ')</p><div class="pp-msg" tabindex="0">' + esc(msg) + '</div>' : '') +
      (final ? '<p class="af-aviso">Esta revenda pediu para não ser contatada. Fica fora da fila para sempre.</p>' :
        '<div class="af-acoes pp-botoes">' + botao +
        '<button type="button" class="btn btn-ghost" data-etapa="respondeu">Respondeu</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="teste">Teste às cegas</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="negociando">Negociando</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="assinou">Assinou</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="perdido">Perdido</button>' +
        '<button type="button" class="btn btn-ghost pp-perigo" data-etapa="nao_contatar">Não contatar mais</button></div>') +
      (acao && !ap && p.whatsapp ? '<p class="pp-nota-bloq">O botão abre só depois que você aprovar os textos no topo do painel.</p>' : '') +
      '<form class="pp-nota" data-nota="' + p.id + '"><label>Nota sua<textarea name="n" rows="2" maxlength="4000">' + esc(p.notas || '') + '</textarea></label>' +
      '<button class="btn btn-ghost">Salvar nota</button><span role="status"></span></form>' +
      '<p class="pp-status" role="status"></p></article>';
  }

  function telaHoje() {
    var f = D.fila, l = (f.retomadas || []).concat(f.novos || []);
    var h = '<p class="pp-cont">Hoje: <b>' + f.feitos_novos + ' de ' + f.limite_novos + '</b> contatos novos e <b>' + f.feitos_retomadas + ' de ' + f.limite_retomadas + '</b> retomadas.</p>';
    if (!l.length) return h + '<p class="ind-regras">Nada na fila agora. Volte amanhã: as retomadas aparecem sozinhas no dia certo.</p>';
    return h + l.map(function (x) { var p = porId(x.id); return p ? cartao(p, x.acao) : ''; }).join('');
  }
  function telaQuadro() {
    return '<div class="pp-quadro">' + ETAPAS.map(function (e) {
      var l = D.prospects.filter(function (p) { return p.etapa === e[0]; });
      return '<section class="pp-coluna"><h4>' + esc(e[1]) + ' <b>' + l.length + '</b></h4><ul>' + l.slice(0, 40).map(function (p) {
        return '<li><button type="button" class="pp-item" data-ver="' + p.id + '"><span>' + esc(p.empresa) + '</span><small>' + esc(p.faixa) + ' · ' + esc(p.uf) + '</small></button></li>';
      }).join('') + (l.length > 40 ? '<li class="pp-mais">e mais ' + (l.length - 40) + ' (veja em Todas)</li>' : '') + '</ul></section>';
    }).join('') + '</div>' + (sel ? detalhe() : '');
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
  function telaNumeros() {
    var m = D.metricas || [], t = { faixa: 'Todas', total: 0, contatados: 0, abriram: 0, responderam: 0, teste: 0, assinaram: 0, nao_contatar: 0 };
    m.forEach(function (x) { for (var k in t) if (k !== 'faixa') t[k] += x[k] || 0; });
    return '<div class="af-tabela"><table><thead><tr><th>Faixa</th><th>Revendas</th><th>Contatadas</th><th>Abriram o link</th><th>Responderam</th><th>Teste às cegas</th><th>Assinaram</th><th>Não contatar</th></tr></thead><tbody>' +
      m.concat([t]).map(function (x) {
        return '<tr><td>' + esc(x.faixa) + '</td><td>' + x.total + '</td><td>' + x.contatados + '</td><td>' + x.abriram + ' <small>(' + pct(x.abriram, x.contatados) + ')</small></td><td>' + x.responderam +
          ' <small>(' + pct(x.responderam, x.contatados) + ')</small></td><td>' + x.teste + ' <small>(' + pct(x.teste, x.contatados) + ')</small></td><td>' + x.assinaram + ' <small>(' + pct(x.assinaram, x.contatados) + ')</small></td><td>' + x.nao_contatar + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ind-regras">Porcentagens sobre as revendas contatadas. "Abriu o link" conta quem entrou pelo link próprio da mensagem.</p>';
  }
  function passa(p) {
    if (filtro.faixa && p.faixa !== filtro.faixa) return false;
    if (filtro.uf && p.uf !== filtro.uf) return false;
    if (filtro.etapa && p.etapa !== filtro.etapa) return false;
    if (filtro.q) { var q = filtro.q.toLowerCase(); if ((p.empresa + ' ' + p.cidade).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }
  function telaTodas() {
    var ufs = {}; D.prospects.forEach(function (p) { ufs[p.uf] = 1; });
    var opt = function (l, v) { return l.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    var l = D.prospects.filter(passa);
    return '<form class="pp-filtro" id="pp-filtro"><label>Buscar<input name="q" value="' + esc(filtro.q) + '" placeholder="Empresa ou cidade"></label>' +
      '<label>Faixa<select name="faixa">' + opt([['', 'Todas'], ['A', 'A'], ['B', 'B'], ['C', 'C']], filtro.faixa) + '</select></label>' +
      '<label>UF<select name="uf">' + opt([['', 'Todas']].concat(Object.keys(ufs).sort().map(function (u) { return [u, u]; })), filtro.uf) + '</select></label>' +
      '<label>Etapa<select name="etapa">' + opt([['', 'Todas']].concat(ETAPAS), filtro.etapa) + '</select></label></form>' +
      '<p class="pp-cont">' + l.length + ' de ' + D.prospects.length + ' revendas</p>' +
      '<ul class="pp-lista">' + l.slice(0, 200).map(function (p) {
        return '<li><button type="button" class="pp-item" data-ver="' + p.id + '"><span><b>' + esc(p.empresa) + '</b> · ' + esc(p.cidade || '—') + '/' + esc(p.uf) + '</span>' +
          '<small>Faixa ' + esc(p.faixa) + ' · ' + p.pontuacao + ' pts · ' + (p.anuncios_usados || 0) + ' usados · ' + esc(NOME_ETAPA[p.etapa]) + (p.proximo_contato ? ' · próximo ' + dia(p.proximo_contato) : '') + (p.whatsapp ? '' : ' · sem WhatsApp') + '</small></button></li>';
      }).join('') + '</ul>' + (l.length > 200 ? '<p class="ind-regras">Mostrando 200. Use os filtros para achar as outras.</p>' : '') + (sel ? detalhe() : '');
  }
  function detalhe() { var p = porId(sel); return p ? '<div class="pp-detalhe" id="pp-detalhe">' + cartao(p, acaoNaFila(p.id)) + '</div>' : ''; }

  function desenhar() {
    var c = D.config, abas = [['hoje', 'Fila de hoje'], ['quadro', 'Quadro'], ['numeros', 'Números'], ['todas', 'Todas']];
    bloco.hidden = false;
    bloco.innerHTML = '<h2>Prospecção do Anshur <small>(só você vê)</small></h2>' +
      '<p class="ind-regras">' + D.prospects.length + ' revendas de dados públicos de empresas. O painel monta a mensagem e abre o WhatsApp; quem envia é você. Nada sai sozinho.</p>' +
      '<div class="pp-aprov' + (c.textos_aprovados ? ' ok' : '') + '">' + (c.textos_aprovados
        ? '<p><b>Textos aprovados</b> em ' + dia(c.aprovado_em) + '. O botão de abrir o WhatsApp está ligado.</p><button type="button" class="btn btn-ghost" data-aprovar="0">Desfazer a aprovação</button>'
        : '<p><b>Textos ainda não aprovados.</b> Leia as mensagens nos cartões; enquanto não aprovar, o botão de abrir o WhatsApp fica desligado.</p><button type="button" class="btn btn-primary" data-aprovar="1">Textos aprovados</button>') +
      '<form class="pp-limites" id="pp-limites"><label>Novos por dia<input name="n" type="number" min="0" max="50" value="' + c.limite_novos + '"></label>' +
      '<label>Retomadas por dia<input name="r" type="number" min="0" max="50" value="' + c.limite_retomadas + '"></label><button class="btn btn-ghost">Salvar limites</button><span role="status"></span></form></div>' +
      '<div class="pd-filtros" role="tablist" aria-label="Partes da prospecção">' + abas.map(function (a) {
        return '<button type="button" role="tab" class="pd-filtro' + (aba === a[0] ? ' on' : '') + '" data-aba="' + a[0] + '" aria-selected="' + (aba === a[0]) + '">' + esc(a[1]) + '</button>';
      }).join('') + '</div><div id="pp-corpo">' + ({ hoje: telaHoje, quadro: telaQuadro, numeros: telaNumeros, todas: telaTodas }[aba])() + '</div>';
  }

  function recarregar() { return rpc('anshur_prosp_painel').then(function (d) { if (d) { D = d; desenhar(); } }); }
  function status(el, t) { var s = el && el.closest('.pp-cartao'); s = s && s.querySelector('.pp-status'); if (s) s.textContent = t; }

  bloco.addEventListener('click', function (e) {
    var t = e.target.closest('[data-aba],[data-ver],[data-etapa],[data-enviar],[data-aprovar]');
    if (!t) return;
    if (t.dataset.aba) { aba = t.dataset.aba; sel = null; desenhar(); return; }
    if (t.dataset.ver) { sel = Number(t.dataset.ver); desenhar(); var d = document.getElementById('pp-detalhe'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'start' }); return; }
    if (t.dataset.aprovar) {
      var sim = t.dataset.aprovar === '1';
      if (sim && !confirm('Confirma que leu e aprova os 3 textos (primeiro contato e as 2 retomadas)? Depois disso o botão abre o WhatsApp com a mensagem pronta, e você aperta enviar.')) return;
      rpc('anshur_prosp_config', { p_aprovados: sim }).then(recarregar).catch(function (er) { alert('Não deu: ' + er.message); });
      return;
    }
    var id = Number(t.closest('.pp-cartao').dataset.id);
    if (t.dataset.enviar) {
      // o link abre o WhatsApp (o navegador segue o href); aqui só fica registrado o contato e a próxima retomada
      status(t, 'Registrando o contato…');
      rpc('anshur_prosp_enviado', { p_id: id, p_acao: t.dataset.acao }).then(function () { return recarregar(); }).then(function () {
        var n = bloco.querySelector('.pp-cont'); if (n) n.insertAdjacentHTML('afterend', '<p class="af-aviso pp-ok">Contato registrado. Confira no WhatsApp e aperte enviar.</p>');
      }).catch(function (er) { status(t, 'Não registrou: ' + er.message); });
      return;
    }
    if (t.dataset.etapa) {
      var et = t.dataset.etapa;
      if (et === 'nao_contatar' && !confirm('Marcar como “Não contatar mais”? A revenda sai da fila para sempre e isso não se desfaz.')) return;
      t.disabled = true;
      rpc('anshur_prosp_etapa', { p_id: id, p_etapa: et }).then(recarregar).catch(function (er) { t.disabled = false; status(t, 'Não deu: ' + er.message); });
    }
  });
  bloco.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    var st = f.querySelector('[role=status]');
    if (f.id === 'pp-limites') {
      rpc('anshur_prosp_config', { p_aprovados: null, p_limite_novos: Number(f.n.value), p_limite_retomadas: Number(f.r.value) })
        .then(recarregar).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    } else if (f.dataset.nota) {
      if (st) st.textContent = 'Salvando…';
      rpc('anshur_prosp_nota', { p_id: Number(f.dataset.nota), p_nota: f.n.value }).then(function () {
        var p = porId(Number(f.dataset.nota)); if (p) p.notas = f.n.value; if (st) st.textContent = 'Nota salva.';
      }).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    }
  });
  bloco.addEventListener('input', function (e) {
    var f = e.target.form; if (!f || f.id !== 'pp-filtro') return;
    filtro = { q: f.q.value, faixa: f.faixa.value, uf: f.uf.value, etapa: f.etapa.value };
    var pos = e.target.name, ini = e.target.selectionStart;
    desenhar();
    var el = document.querySelector('#pp-filtro [name=' + pos + ']'); if (el) { el.focus(); if (pos === 'q' && el.setSelectionRange) el.setSelectionRange(ini, ini); }
  });

  C.sb().then(function (c) {
    cliente = c;
    var feito = false;
    c.auth.onAuthStateChange(function (ev, s) {
      if (!s || feito) return;
      feito = true;
      setTimeout(function () { recarregar().catch(function () {}); }, 0);
    });
  }).catch(function () {});
})();

/*
 * Blue Rose · "Minha assinatura" dentro das Configurações de cada sistema (Jano, Arca, Peplo, Annona, Atria, Popina).
 * Bloco compartilhado: só a assinatura. O resto das Configurações é de cada sistema, com o visual dele.
 *
 *   BRAssinatura.montar(elemento, { app: 'peplo', nome: 'Peplo', mensal: 59, anual: 566, pagina: 'peplo.html', titulo: 'h2' })
 *
 * - Demonstração (sem ?conta): plano de exemplo; Renovar e Cancelar só simulam ("Na demonstração nada é cobrado").
 * - Conta (?conta=<app>, base/conta-nuvem.js expõe window.veltriaNuvem): pergunta ao servidor (nexo-pagamentos, ação status)
 *   as assinaturas DESTE login. Se uma delas é deste sistema, quem está logado é o dono da assinatura: Renovar e Cancelar
 *   funcionam. Senão (convidado da equipe), vê o plano e a situação da empresa, com os botões desligados e o aviso
 *   "Só quem assinou (e-mail mascarado) pode renovar ou cancelar".
 *   Renovar: abre Minha conta (conta.html) no topo, onde já estão o Pix e o cartão. Cancelar: confirma e usa a ação cancelar.
 *   O servidor também só cancela assinatura do próprio login (filtra por usuario), então o botão desligado não é a única trava.
 * As cores vêm das variáveis --ass-* de cada sistema (ver assinatura.css).
 */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var reais = function (v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var data = function (s) { if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
  var hojeISO = function () { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); };
  var maisDias = function (n) { return new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10); };
  // e-mail mascarado: "carla.souza@gmail.com" vira "ca•••@gmail.com"
  function mascara(email) {
    var e = String(email || ''), i = e.indexOf('@'); if (i < 1) return '';
    return e.slice(0, Math.min(2, i)) + '•••' + e.slice(i);
  }
  function emConta() { return !!new URLSearchParams(location.search).get('conta') && !!window.veltriaNuvem; }
  var RAIZ = (function () { try { return new URL('../../../', document.currentScript.src).href; } catch (e) { return '../../../'; } })();
  function raiz() { return (window.veltriaNuvem && window.veltriaNuvem.raiz) || RAIZ; }

  var ROTULO = { teste: ['Em teste', 'ok'], ativa: ['Ativa', 'ok'], paga: ['Paga', 'ok'], pendente: ['Esperando o pagamento', 'atn'], cancelada: ['Cancelada', 'off'], recusada: ['Não liberada', 'erro'], expirada: ['Não concluída', 'off'] };
  var anual = function (a) { return /-anual$/.test(String(a.produto || '')); };

  // a assinatura deste sistema que vale mais agora (ativa > teste > pendente > cancelada mais nova)
  function escolher(lista, app) {
    var l = (lista || []).filter(function (a) { return a.app === app && a.tipo !== 'compra'; });
    var ordem = ['ativa', 'paga', 'teste', 'pendente', 'cancelada', 'recusada', 'expirada'];
    l.sort(function (x, y) { return ordem.indexOf(x.status) - ordem.indexOf(y.status) || String(y.criado || '').localeCompare(String(x.criado || '')); });
    return l[0] || null;
  }

  function linha(dt, dd) { return '<div><dt>' + esc(dt) + '</dt><dd>' + dd + '</dd></div>'; }

  // ------------------------------------------------------------ desenho
  function desenhar(el, o, v) {
    // v: { modo, dono, rotulo:[texto,classe], plano, valor, situacao, pagamento, nota, renovar:{href|null}, cancelar:{pode, porque}, aviso }
    var H = o.titulo || 'h2', tid = 'br-ass-t-' + (o.app || 'x');
    var dis = function (pode) { return pode ? '' : ' disabled aria-disabled="true"'; };
    var bRen = v.dono && v.renovar && v.renovar.href
      ? '<a class="br-ass-bt cheio" data-br-ass="renovar" href="' + esc(v.renovar.href) + '" target="_top">Renovar</a>'
      : '<button type="button" class="br-ass-bt cheio" data-br-ass="renovar"' + dis(v.dono) + '>Renovar</button>';
    var bCan = '<button type="button" class="br-ass-bt perigo" data-br-ass="cancelar"' + dis(v.dono && v.cancelar.pode) + '>Cancelar</button>';
    el.innerHTML = '<section class="br-ass" data-modo="' + v.modo + '" data-dono="' + (v.dono ? '1' : '0') + '" aria-labelledby="' + tid + '">' +
      '<div class="br-ass-cab"><' + H + ' id="' + tid + '" class="br-ass-t">Minha assinatura</' + H + '>' + (v.rotulo ? '<span class="br-ass-et ' + v.rotulo[1] + '">' + esc(v.rotulo[0]) + '</span>' : '') + '</div>' +
      '<dl class="br-ass-dados">' + linha('Plano', esc(v.plano)) + linha('Valor', esc(v.valor)) + linha('Situação', esc(v.situacao)) + linha('Pagamento', esc(v.pagamento)) + '</dl>' +
      (v.nota ? '<p class="br-ass-nota">' + v.nota + '</p>' : '') +
      '<div class="br-ass-bts">' + bRen + bCan + '</div>' +
      (v.aviso ? '<p class="br-ass-aviso" data-br-ass-aviso>' + v.aviso + '</p>' : '') +
      (v.dono && !v.cancelar.pode && v.cancelar.porque ? '<p class="br-ass-mudo">' + esc(v.cancelar.porque) + '</p>' : '') +
      '<div class="br-ass-msg" role="status" aria-live="polite" data-br-ass-msg></div>' +
      '</section>';
  }

  function msg(el, html, tipo) { var m = el.querySelector('[data-br-ass-msg]'); if (m) { m.className = 'br-ass-msg' + (tipo ? ' ' + tipo : ''); m.innerHTML = html; } }

  // confirmação dentro do bloco (sem janela do navegador, que some dentro de app instalado)
  function confirmar(el, texto, sim, aoSim) {
    msg(el, '<div class="br-ass-conf" role="alertdialog" aria-labelledby="br-ass-conf-t"><p id="br-ass-conf-t"><b>' + esc(texto[0]) + '</b></p><p>' + esc(texto[1]) + '</p>' +
      '<div class="br-ass-bts"><button type="button" class="br-ass-bt perigo" data-br-conf="sim">' + esc(sim) + '</button><button type="button" class="br-ass-bt" data-br-conf="nao">Voltar</button></div></div>');
    var c = el.querySelector('.br-ass-conf');
    c.querySelector('[data-br-conf="nao"]').focus();
    c.addEventListener('click', function (e) {
      var b = e.target.closest('[data-br-conf]'); if (!b) return;
      if (b.dataset.brConf === 'nao') { msg(el, ''); var bc = el.querySelector('[data-br-ass="cancelar"]'); if (bc) bc.focus(); return; }
      aoSim(b);
    });
  }

  // ------------------------------------------------------------ demonstração
  function demo(el, o) {
    var estado = { cancelada: false }, ate = maisDias(18);
    var pinta = function () {
      desenhar(el, o, {
        modo: 'demo', dono: true,
        rotulo: estado.cancelada ? ['Cancelada (simulação)', 'off'] : ['Ativa · exemplo', 'ok'],
        plano: o.nome + ' · plano mensal', valor: reais(o.mensal) + ' por mês' + (o.anual ? ' (ou ' + reais(o.anual) + ' por ano)' : ''),
        situacao: estado.cancelada ? 'Sem novas cobranças · acesso até ' + data(ate) : 'Ativa · pago até ' + data(ate) + ' · renova em ' + data(ate),
        pagamento: 'Cartão de crédito (exemplo)',
        nota: 'Na demonstração nada é cobrado. Na sua conta, aqui aparecem o seu plano, o vencimento e a forma de pagamento de verdade.',
        renovar: null, cancelar: { pode: !estado.cancelada, porque: estado.cancelada ? 'Simulação: a assinatura de exemplo já está cancelada.' : '' },
        aviso: o.pagina ? '<a class="br-ass-link" href="' + esc(RAIZ + o.pagina + '#precos') + '" target="_top">Quero assinar o ' + esc(o.nome) + '</a>' : ''
      });
    };
    pinta();
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-br-ass]'); if (!b || b.disabled || el.dataset.brAssModo !== 'demo') return;
      e.preventDefault();
      if (b.dataset.brAss === 'renovar') { msg(el, 'Simulação: na sua conta, <b>Renovar</b> abre o pagamento por Pix ou cartão. Na demonstração nada é cobrado.', 'ok'); return; }
      confirmar(el, ['Cancelar a assinatura?', 'Não haverá novas cobranças. O acesso continua até ' + data(ate) + '. (Simulação: na demonstração nada é cobrado nem cancelado.)'], 'Sim, cancelar', function () {
        estado.cancelada = true; pinta(); msg(el, 'Simulação: assinatura cancelada. Na demonstração nada é cobrado.', 'ok');
      });
    });
  }

  // ------------------------------------------------------------ conta (?conta=)
  function conta(el, o) {
    var N = window.veltriaNuvem, sel = null, donoEmail = '';
    el.innerHTML = '<section class="br-ass" data-modo="conta" aria-busy="true"><div class="br-ass-cab"><' + (o.titulo || 'h2') + ' class="br-ass-t">Minha assinatura</' + (o.titulo || 'h2') + '></div><p class="br-ass-mudo">Carregando a assinatura…</p></section>';
    var daEmpresa = function (aviso) {
      // convidado (ou login sem assinatura deste sistema): o que a empresa tem, sem botões
      var pl = N.plano(), ate = N.ate(), ativo = pl === 'ativo', vence = ate && String(ate) >= hojeISO();
      desenhar(el, o, {
        modo: 'conta', dono: false,
        rotulo: ativo ? ['Ativa', 'ok'] : pl === 'teste' && vence ? ['Em dia', 'ok'] : ['Vencida', 'erro'],
        plano: o.nome + ' · assinatura da empresa',
        valor: reais(o.mensal) + ' por mês' + (o.anual ? ' (ou ' + reais(o.anual) + ' por ano)' : ''),
        situacao: ativo ? 'Ativa' + (ate ? ' · em dia até ' + data(ate) : '') : vence ? 'Liberada até ' + data(ate) : 'Vencida' + (ate ? ' em ' + data(ate) : ''),
        pagamento: 'Só quem assinou vê',
        renovar: null, cancelar: { pode: false }, aviso: aviso
      });
    };
    Promise.all([
      N.pagamentos({ acao: 'status' }).catch(function (e) { return { erro: e }; }),
      N.dono().catch(function () { return null; })
    ]).then(function (r) {
      var st = r[0] || {}, d = r[1]; donoEmail = d && d.email ? d.email : '';
      if (st.erro) { daEmpresa('Não foi possível carregar a assinatura agora. <button type="button" class="br-ass-link" data-br-ass="recarregar">Tentar de novo</button>'); return; }
      sel = escolher(st.assinaturas, o.app);
      if (!sel) {
        var quem = donoEmail ? ' (' + esc(mascara(donoEmail)) + ')' : '';
        daEmpresa('Só quem assinou' + quem + ' pode renovar ou cancelar.' + (N.donoDaEmpresa ? ' Entre com o login que fez a assinatura ou veja em <a class="br-ass-link" href="' + esc(N.raiz + 'conta.html') + '" target="_top">Minha conta</a>.' : ''));
        return;
      }
      pintaDono();
    });
    function pintaDono(extra) {
      var a = sel, rot = ROTULO[a.status] || [a.status, ''], fim = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop();
      var pix = a.forma === 'pix', brinde = !!a.brinde, gratis = !brinde && !Number(a.valor);
      if (pix && a.status === 'ativa' && a.pago_ate && a.pago_ate < hojeISO()) rot = ['Pix vencido', 'atn'];
      var sit = a.status === 'teste' ? 'Teste até ' + data(a.teste_ate) + (a.proxima_cobranca ? ' · primeira cobrança em ' + data(a.proxima_cobranca) : '')
        : a.status === 'ativa' ? (pix ? (a.pago_ate >= hojeISO() ? 'Ativa · paga até ' + data(a.pago_ate) : 'Venceu em ' + data(a.pago_ate)) : 'Ativa' + (a.pago_ate ? ' · paga até ' + data(a.pago_ate) : '') + (a.proxima_cobranca ? ' · próxima cobrança em ' + data(a.proxima_cobranca) : ''))
        : a.status === 'cancelada' ? 'Cancelada · ' + (fim && fim >= hojeISO() ? 'acesso até ' + data(fim) : 'acesso encerrado')
        : a.status === 'pendente' ? 'Esperando o pagamento'
        : rot[0];
      var podeCancelar = !brinde && ['teste', 'ativa', 'pendente'].indexOf(a.status) >= 0;
      desenhar(el, o, {
        modo: 'conta', dono: true, rotulo: rot,
        plano: String(a.nome || o.nome).replace(/ \((aluguel|assinatura|anual)\)/g, '') + (anual(a) ? ' · plano anual' : ' · plano mensal'),
        valor: brinde ? 'Brinde (sem cobrança)' : gratis ? 'Cortesia (sem cobrança)' : reais(a.valor) + (anual(a) ? ' por ano' : ' por mês'),
        situacao: sit,
        pagamento: brinde || gratis ? 'Sem cobrança' : pix ? 'Pix (sem cobrança automática)' : 'Cartão pelo Mercado Pago',
        nota: (pix ? 'No Pix você renova com um novo Pix antes de vencer.' : a.status === 'ativa' && !gratis && !brinde ? 'No cartão a assinatura renova sozinha. Renovar abre Minha conta para pagar por Pix ou trocar o cartão.' : 'Renovar abre Minha conta, com Pix e cartão.') + (a.motivo ? '<br>' + esc(a.motivo) : ''),
        renovar: { href: N.raiz + 'conta.html' },
        cancelar: { pode: podeCancelar, porque: brinde ? 'Este plano é brinde de outra assinatura: não tem cobrança e acaba junto com ela.' : a.status === 'cancelada' ? 'Esta assinatura já está cancelada.' : '' }
      });
      if (extra) msg(el, extra[0], extra[1]);
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-br-ass]'); if (!b || el.dataset.brAssModo !== 'conta') return;
      if (b.dataset.brAss === 'recarregar') { e.preventDefault(); conta(el, o); return; }
      if (b.disabled || !sel) { e.preventDefault(); return; }
      if (b.dataset.brAss !== 'cancelar') return; // Renovar é um link comum para Minha conta
      e.preventDefault();
      var fim = sel.status === 'teste' ? sel.teste_ate : sel.pago_ate;
      confirmar(el, [sel.status === 'teste' ? 'Cancelar o teste?' : 'Cancelar a assinatura?', 'Não haverá novas cobranças.' + (fim ? ' O acesso continua até ' + data(fim) + '.' : ' O acesso continua até o fim do período que já está valendo.') + ' Para voltar depois, é só assinar de novo.'], 'Sim, cancelar', function (bs) {
        bs.disabled = true; bs.textContent = 'Cancelando…';
        N.pagamentos({ acao: 'cancelar', id: sel.id }).then(function (r) {
          sel = Object.assign({}, sel, { status: sel.status === 'pendente' ? 'expirada' : 'cancelada' });
          pintaDono(['Assinatura cancelada. Não haverá novas cobranças' + (r && r.ate ? '; o acesso continua até ' + esc(data(r.ate)) : '') + '.', 'ok']);
        }).catch(function (x) { msg(el, esc(x && x.message ? x.message : 'Não foi possível cancelar agora. Tente de novo.'), 'erro'); });
      });
    });
  }

  function montar(el, o) {
    if (!el) return;
    o = o || {};
    var V = (window.VELTRIA_VERSOES || {})[o.app] || {};
    o.nome = o.nome || V.nome || 'Sistema'; o.mensal = o.mensal != null ? o.mensal : V.mensal || 0; o.anual = o.anual != null ? o.anual : V.anual || 0; o.pagina = o.pagina || V.pagina || '';
    if (el.dataset.brAssModo) { var novo = el.cloneNode(false); el.parentNode.replaceChild(novo, el); el = novo; } // montar de novo (tela redesenhada) sem juntar ouvintes
    el.dataset.brAssModo = emConta() ? 'conta' : 'demo';
    if (el.dataset.brAssModo === 'conta') conta(el, o); else demo(el, o);
    return el;
  }

  // perfil da conta para as telas de Configurações: e-mail do login (só leitura), papel, trocar senha e sair
  function contaAtual() {
    if (!emConta()) return Promise.resolve({ modo: 'demo', email: 'voce@exemplo.com.br', papel: 'dono' });
    var N = window.veltriaNuvem;
    return N.eu().then(function (u) { return { modo: 'conta', email: (u && u.email) || '', papel: N.papel(), trocarSenha: N.trocarSenha, sair: N.sair }; })
      .catch(function () { return { modo: 'conta', email: '', papel: N.papel(), trocarSenha: N.trocarSenha, sair: N.sair }; });
  }

  window.BRAssinatura = { montar: montar, conta: contaAtual, emConta: emConta, mascara: mascara, raiz: raiz };
})();

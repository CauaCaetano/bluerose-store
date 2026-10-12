/* Página "Minha conta": testes, assinaturas e compras do cliente, com cancelamento. */
(function () {
  var C = window.BR_CONTA, raiz = document.getElementById('conta-raiz');
  if (!C || !raiz) return;
  var esc = C.esc, reais = C.reais;
  var params = new URLSearchParams(location.search), volta = params.get('volta');
  var NOMES = { teste: 'Teste grátis', assinatura: 'Assinatura', compra: 'Compra' };
  function data(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function etiqueta(a) {
    var m = { pendente: ['Aguardando o Mercado Pago', 'al'], teste: ['Teste até ' + data(a.teste_ate), 'ok'], ativa: ['Ativa', 'ok'], paga: ['Paga', 'ok'], cancelada: ['Cancelada', ''], recusada: ['Não liberada', 'er'], expirada: ['Não concluída', ''] }[a.status] || [a.status, ''];
    return '<span class="conta-et ' + m[1] + '">' + esc(m[0]) + '</span>';
  }
  function cartao(a) {
    var linhas = [];
    if (a.tipo === 'teste' && a.status === 'teste') linhas.push('Primeira cobrança de ' + reais(a.valor) + ' em ' + data(a.proxima_cobranca || a.teste_ate) + ', se você não cancelar antes.');
    if (a.tipo !== 'compra' && a.status === 'ativa') linhas.push(reais(a.valor) + ' por mês · próxima cobrança em ' + data(a.proxima_cobranca));
    if (a.status === 'cancelada') { var ate = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop(); linhas.push(ate ? 'Sem novas cobranças. O acesso continua até ' + data(ate) + '.' : 'Sem novas cobranças.'); }
    if (a.tipo === 'compra') linhas.push(a.status === 'paga' ? 'Entrada de ' + reais(a.valor) + ' paga. Em até 1 dia útil entramos em contato para a implantação.' : 'Entrada de ' + reais(a.valor) + '.');
    if (a.motivo) linhas.push(a.motivo);
    var abrir = a.app && ['teste', 'ativa', 'paga', 'cancelada'].indexOf(a.status) >= 0 ? '<a class="btn btn-primary" href="app/' + esc(a.app) + '/">Abrir o sistema</a>' : '';
    var cancelar = a.tipo !== 'compra' && ['teste', 'ativa'].indexOf(a.status) >= 0 ? '<button type="button" class="btn btn-ghost" data-cancelar="' + esc(a.id) + '">' + (a.status === 'teste' ? 'Cancelar o teste' : 'Cancelar a assinatura') + '</button>' : '';
    var fim = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop(), hojeISO = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    var assinar = a.app && a.tipo !== 'compra' && (a.status === 'recusada' || (a.status === 'cancelada' && (!fim || fim < hojeISO) )) ? '<button type="button" class="btn btn-primary" data-assinar="a-sis-' + esc(a.app) + '">Assinar por ' + reais(a.valor) + '/mês</button>' : '';
    return '<article class="conta-item"><div class="conta-item-cab"><div><small>' + esc(NOMES[a.tipo] || a.tipo) + ' · desde ' + data(a.criado) + '</small><h3>' + esc(String(a.nome).replace(/ \((aluguel|assinatura|compra)\)$/, '')) + '</h3></div>' + etiqueta(a) + '</div>' +
      (linhas.length ? '<p>' + linhas.map(esc).join('<br>') + '</p>' : '') + '<div class="conta-item-bt">' + abrir + assinar + cancelar + '</div></article>';
  }
  function carregar() {
    raiz.innerHTML = '<p class="conta-sub">Carregando…</p>';
    C.exigirLogin('Entre para ver os seus testes, assinaturas e compras.').then(function (s) {
      document.getElementById('conta-email').textContent = s.user.email;
      return C.chamar({ acao: 'status', id: volta || undefined });
    }).then(function (j) {
      var l = j.assinaturas || [], v = volta && l.filter(function (x) { return x.id === volta; })[0], aviso = '';
      if (v) {
        aviso = v.status === 'teste' ? '<div class="conta-aviso ok">Cartão cadastrado. O seu teste grátis está valendo até ' + data(v.teste_ate) + '. <a href="app/' + esc(v.app) + '/">Abrir o sistema agora →</a></div>'
          : v.status === 'ativa' || v.status === 'paga' ? '<div class="conta-aviso ok">Pagamento confirmado. Obrigado!' + (v.app ? ' <a href="app/' + esc(v.app) + '/">Abrir o sistema →</a>' : '') + '</div>'
          : v.status === 'recusada' ? '<div class="conta-aviso er">' + esc(v.motivo || 'Não foi possível liberar o teste.') + '</div>'
          : '<div class="conta-aviso">Ainda não recebemos a confirmação do Mercado Pago. Se você terminou o pagamento, ela chega em alguns minutos: atualize esta página.</div>';
        history.replaceState(null, '', 'conta.html');
      }
      raiz.innerHTML = aviso + (l.length ? l.map(cartao).join('') : '<div class="conta-vazio"><h3>Você ainda não tem testes nem assinaturas</h3><p>Escolha um sistema e teste 7 dias grátis com os dados da sua empresa.</p><a class="btn btn-primary" href="sistemas.html">Ver os sistemas</a></div>');
    }).catch(function (x) { raiz.innerHTML = '<div class="conta-aviso er">' + esc(x.message || 'Não foi possível carregar.') + '</div>'; });
  }
  raiz.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cancelar]'), a = e.target.closest('[data-assinar]');
    if (c) {
      if (!confirm('Cancelar? Não haverá novas cobranças. O acesso continua até o fim do período que já está valendo.')) return;
      c.disabled = true; c.textContent = 'Cancelando…';
      C.chamar({ acao: 'cancelar', id: c.getAttribute('data-cancelar') }).then(carregar).catch(function (x) { alert(x.message); c.disabled = false; });
    }
    if (a) { a.disabled = true; C.pagar(a.getAttribute('data-assinar')).catch(function (x) { alert(x.message); a.disabled = false; }); }
  });
  document.getElementById('conta-sair').addEventListener('click', function () {
    C.sb().then(function (c) { return c.auth.signOut(); }).then(function () { location.href = './'; });
  });
  carregar();
})();

/* Página "Minha conta": testes, assinaturas e compras do cliente, com cancelamento. */
(function () {
  var C = window.BR_CONTA, raiz = document.getElementById('conta-raiz');
  if (!C || !raiz) return;
  var esc = C.esc, reais = C.reais, resumo = document.getElementById('conta-resumo');
  var params = new URLSearchParams(location.search), volta = params.get('volta');
  if (volta && !/^[A-Za-z0-9_-]{1,64}$/.test(volta)) volta = null; /* id de assinatura: só caracteres seguros (UUID ou número) */
  var NOMES = { teste: 'Teste grátis', assinatura: 'Assinatura', compra: 'Compra' };
  var APPS = ['crm', 'agenda', 'financeiro', 'gestao', 'juridico', 'clinica', 'academia', 'restaurante', 'imobiliaria', 'oficina', 'obras', 'cerimonial', 'pragas'];
  var PAGINA = { obras: 'roseconstruct.html', cerimonial: 'eternize.html', pragas: 'guard.html' };
  var hojeISO = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  function data(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function dias(ate) { return Math.round((new Date(String(ate).slice(0, 10) + 'T12:00:00') - new Date(hojeISO + 'T12:00:00')) / 864e5); }
  function etiqueta(a) {
    var m = { pendente: ['Aguardando o Mercado Pago', 'al'], teste: ['Em teste', 'ok'], ativa: ['Ativa', 'ok'], paga: ['Paga', 'ok'], cancelada: ['Cancelada', ''], recusada: ['Não liberada', 'er'], expirada: ['Não concluída', ''] }[a.status] || [a.status, ''];
    return '<span class="conta-et ' + m[1] + '">' + esc(m[0]) + '</span>';
  }
  function barraTeste(a) {
    if (a.status !== 'teste' || !a.teste_ate) return '';
    var resta = Math.max(0, dias(a.teste_ate)), usado = Math.min(100, Math.max(4, Math.round(((7 - resta) / 7) * 100)));
    return '<div class="conta-prazo"><div class="conta-prazo-txt"><b>' + (resta === 0 ? 'Último dia de teste' : resta === 1 ? 'Falta 1 dia de teste' : 'Faltam ' + resta + ' dias de teste') + '</b><span>até ' + data(a.teste_ate) + '</span></div>' +
      '<div class="conta-prazo-barra" role="progressbar" aria-label="Dias de teste usados" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + usado + '"><i style="width:' + usado + '%"></i></div></div>';
  }
  var TOKENS = {}, tokenMostrado = {};
  function anual(a) { return /-anual$/.test(String(a.produto || '')); }
  function cartao(a) {
    var linhas = [];
    if (a.tipo === 'teste' && a.status === 'teste') linhas.push('Primeira cobrança de ' + reais(a.valor) + ' em ' + data(a.proxima_cobranca || a.teste_ate) + ', se você não cancelar antes.');
    if (a.tipo !== 'compra' && a.status === 'ativa') linhas.push(reais(a.valor) + (anual(a) ? ' por ano (plano anual, 20% de desconto)' : ' por mês') + ' · próxima cobrança em ' + data(a.proxima_cobranca));
    if (a.status === 'cancelada') { var ate = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop(); linhas.push(ate ? 'Sem novas cobranças. O acesso continua até ' + data(ate) + '.' : 'Sem novas cobranças.'); }
    if (a.tipo === 'compra') linhas.push(a.status === 'paga' ? 'Entrada de ' + reais(a.valor) + ' paga. Em até 1 dia útil entramos em contato para a implantação.' : 'Entrada de ' + reais(a.valor) + '.');
    if (a.motivo) linhas.push(a.motivo);
    var fim = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop();
    var pode = a.app && (['teste', 'ativa', 'paga'].indexOf(a.status) >= 0 || (a.status === 'cancelada' && fim && fim >= hojeISO)); /* cancelada: só enquanto o período pago vale */
    var abrir = pode ? '<a class="btn btn-primary" href="app/' + esc(a.app) + '/">Abrir o sistema <svg class="ico ico-move" aria-hidden="true"><use href="img/icones.svg#i-arrow-right"/></svg></a>' : '';
    var cancelar = a.tipo !== 'compra' && ['teste', 'ativa'].indexOf(a.status) >= 0 ? '<button type="button" class="conta-link" data-cancelar="' + esc(a.id) + '">' + (a.status === 'teste' ? 'Cancelar o teste' : 'Cancelar a assinatura') + '</button>' : '';
    var assinar = a.app && a.tipo !== 'compra' && (a.status === 'recusada' || (a.status === 'cancelada' && (!fim || fim < hojeISO))) ? '<button type="button" class="btn btn-primary" data-assinar="a-sis-' + esc(a.app) + '">Assinar por ' + reais(a.valor) + '/mês</button>' : '';
    var foto = APPS.indexOf(a.app) >= 0 ? '<a class="conta-thumb" href="' + (pode ? 'app/' + esc(a.app) + '/' : PAGINA[a.app] || 'nexo-' + esc(a.app) + '.html') + '" tabindex="-1" aria-hidden="true"><img src="img/sistemas/' + esc(a.app) + '.webp" alt="" width="1200" height="750" loading="lazy"></a>' : '';
    var apagado = ['cancelada', 'expirada', 'recusada'].indexOf(a.status) >= 0 ? ' conta-item-off' : '';
    /* token de dono: pedido uma vez, quando a empresa é criada no sistema */
    var tk = pode && TOKENS[a.app] && !tokenMostrado[a.app] ? TOKENS[a.app] : null; if (tk) tokenMostrado[a.app] = true;
    var token = tk ? '<div class="conta-token"><small>Token de dono</small><code>' + esc(tk.token) + '</code><span>' + (tk.ativado ? 'Já ativado em ' + data(tk.ativado) + '. Não precisa usar de novo.' : 'Use uma vez, ao criar a sua empresa no sistema. Não compartilhe: a equipe entra pelos convites.') + '</span></div>' : '';
    return '<article class="conta-item' + (foto ? ' com-foto' : '') + apagado + '">' + foto + '<div class="conta-item-corpo"><div class="conta-item-cab"><div><small>' + esc(NOMES[a.tipo] || a.tipo) + ' · desde ' + data(a.criado) + '</small><h3>' + esc(String(a.nome).replace(/ \((aluguel|assinatura|compra)\)$/, '')) + '</h3></div>' + etiqueta(a) + '</div>' +
      barraTeste(a) + (linhas.length ? '<p>' + linhas.map(esc).join('<br>') + '</p>' : '') + token + '<div class="conta-item-bt">' + abrir + assinar + cancelar + '</div></div></article>';
  }
  function mostrarResumo(l) {
    if (!resumo) return;
    var ativos = l.filter(function (a) { return ['teste', 'ativa', 'paga'].indexOf(a.status) >= 0; });
    var cobrancas = l.filter(function (a) { return a.tipo !== 'compra' && (a.status === 'ativa' || a.status === 'teste'); })
      .map(function (a) { return { quando: a.proxima_cobranca || a.teste_ate, valor: a.valor }; }).filter(function (x) { return x.quando; })
      .sort(function (x, y) { return String(x.quando).localeCompare(String(y.quando)); });
    var mensal = l.filter(function (a) { return a.tipo !== 'compra' && a.status === 'ativa'; }).reduce(function (s, a) { return s + Number(a.valor || 0) / (anual(a) ? 12 : 1); }, 0);
    if (!l.length) { resumo.hidden = true; return; }
    resumo.innerHTML =
      '<div><small>Sistemas liberados</small><b>' + ativos.length + '</b><span>' + (l.filter(function (a) { return a.status === 'teste'; }).length ? l.filter(function (a) { return a.status === 'teste'; }).length + ' em teste grátis' : 'prontos para usar') + '</span></div>' +
      '<div><small>Próxima cobrança</small><b>' + (cobrancas[0] ? data(cobrancas[0].quando) : '—') + '</b><span>' + (cobrancas[0] ? reais(cobrancas[0].valor) : 'nenhuma agendada') + '</span></div>' +
      '<div><small>Total por mês</small><b>' + reais(mensal) + '</b><span>assinaturas ativas</span></div>';
    resumo.hidden = false;
  }
  function perfil(u) {
    var m = u.user_metadata || {}, nome = String(m.nome || m.full_name || m.name || '').trim(), primeiro = nome.split(' ')[0];
    document.getElementById('conta-email').textContent = u.email;
    if (primeiro) document.getElementById('conta-ola').textContent = 'Olá, ' + primeiro;
    var av = document.getElementById('conta-avatar');
    if (av) av.textContent = (primeiro || u.email || '?').charAt(0).toUpperCase();
  }
  // "Indique e ganhe": link único da conta, progresso e prêmio
  function indicacao() {
    var bloco = document.getElementById('indique'); if (!bloco) return;
    C.sb().then(function (c) { return c.rpc('nexo_minha_indicacao'); }).then(function (r) {
      var d = r && r.data; if (!d || !d.codigo) return;
      var link = 'https://bluerose-store.com/?indica=' + d.codigo, naRoda = d.confirmados % 3;
      document.getElementById('ind-link').value = link;
      document.getElementById('ind-zap').href = 'https://wa.me/?text=' + encodeURIComponent('Conheci os sistemas da Blue Rose e recomendo. Dá para testar 7 dias grátis por este link: ' + link);
      document.getElementById('ind-barra').style.width = Math.round((naRoda / 3) * 100) + '%';
      document.getElementById('ind-texto').textContent = d.confirmados + (d.confirmados === 1 ? ' assinou' : ' assinaram') + ' · ' + naRoda + ' de 3 para o próximo mês de Pro · ' + d.cadastrados + ' entraram pelo link';
      var fim = (d.pro_ate || []).map(function (x) { return x.ate; }).sort().pop(), pr = document.getElementById('ind-premio');
      if (fim) { pr.hidden = false; pr.textContent = 'Pro de cortesia até ' + data(fim) + ', pelas suas indicações. Você continua pagando o Básico.'; }
      else if (d.meses_guardados) { pr.hidden = false; pr.textContent = d.meses_guardados + (d.meses_guardados === 1 ? ' mês' : ' meses') + ' de Pro guardado: entra assim que você tiver uma empresa no plano Básico.'; }
      bloco.hidden = false;
    }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    if (e.target.id !== 'ind-copiar') return;
    var el = document.getElementById('ind-link');
    (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).catch(function () { el.select(); document.execCommand('copy'); });
    e.target.textContent = 'Copiado'; setTimeout(function () { e.target.textContent = 'Copiar'; }, 1800);
  });
  function carregar() {
    raiz.innerHTML = '<div class="conta-carregando" aria-label="Carregando"><i></i><i></i></div>';
    C.exigirLogin('Entre para ver os seus testes, assinaturas e compras.').then(function (s) {
      perfil(s.user);
      document.body.classList.add('conta-logado');
      return C.chamar({ acao: 'status', id: volta || undefined });
    }).then(function (j) {
      var l = j.assinaturas || [], v = volta && l.filter(function (x) { return x.id === volta; })[0], aviso = '';
      TOKENS = j.tokens || {}; tokenMostrado = {};
      if (v) {
        aviso = v.status === 'teste' ? '<div class="conta-aviso ok">Cartão cadastrado. O seu teste grátis está valendo até ' + data(v.teste_ate) + '. <a href="app/' + esc(v.app) + '/">Abrir o sistema agora →</a></div>'
          : v.status === 'ativa' || v.status === 'paga' ? '<div class="conta-aviso ok">Pagamento confirmado. Obrigado!' + (v.app ? ' <a href="app/' + esc(v.app) + '/">Abrir o sistema →</a>' : '') + '</div>'
          : v.status === 'recusada' ? '<div class="conta-aviso er">' + esc(v.motivo || 'Não foi possível liberar o teste.') + '</div>'
          : '<div class="conta-aviso">Ainda não recebemos a confirmação do Mercado Pago. Se você terminou o pagamento, ela chega em alguns minutos: atualize esta página.</div>';
        history.replaceState(null, '', 'conta.html');
      }
      mostrarResumo(l);
      indicacao();
      raiz.innerHTML = aviso + (l.length ? '<h2 class="conta-titulo">Seus sistemas</h2>' + l.map(cartao).join('') :
        '<div class="conta-vazio"><div class="conta-vazio-fotos" aria-hidden="true"><img src="img/sistemas/crm.webp" alt="" loading="lazy"><img src="img/sistemas/agenda.webp" alt="" loading="lazy"><img src="img/sistemas/financeiro.webp" alt="" loading="lazy"></div><h3>Você ainda não tem testes nem assinaturas</h3><p>Escolha um dos sistemas e teste 7 dias grátis com os dados da sua empresa.</p><a class="btn btn-primary" href="sistemas.html">Ver os sistemas</a></div>');
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
  var fx = document.querySelector('[data-excluir]');
  if (fx) fx.addEventListener('submit', function (e) {
    e.preventDefault();
    var ex = fx.querySelector('[data-erro-ex]'), b = fx.querySelector('button');
    if (fx.ok.value.trim().toUpperCase() !== 'EXCLUIR') { ex.textContent = 'Digite EXCLUIR para confirmar.'; return; }
    if (!confirm('Excluir a sua conta e todos os dados agora? Não dá para desfazer.')) return;
    b.disabled = true; b.textContent = 'Excluindo…'; ex.textContent = '';
    C.chamar({ acao: 'excluir_conta', confirmar: 'EXCLUIR' }).then(function () {
      return C.sb().then(function (c) { return c.auth.signOut(); }).catch(function () {});
    }).then(function () {
      document.getElementById('conteudo').innerHTML = '<section class="wrap conta-topo"><div><span class="eyebrow">Minha conta</span><h1>Conta excluída</h1><p class="conta-sub">O seu login e os seus dados foram apagados. Obrigado por ter usado a Blue Rose.</p></div></section>';
    }).catch(function (x) { ex.textContent = x.message || 'Não foi possível excluir agora.'; b.disabled = false; b.textContent = 'Excluir minha conta'; });
  });
  document.getElementById('conta-sair').addEventListener('click', function () {
    C.sb().then(function (c) { return c.auth.signOut(); }).then(function () { location.href = './'; });
  });
  carregar();
})();

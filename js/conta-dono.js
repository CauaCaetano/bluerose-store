// Minha conta: Painel do dono (só as contas do dono veem: o banco devolve nulo para as demais).
// Resumo do negócio, todos os assinantes com a situação de pagamento, contatos do site; os afiliados ficam no bloco logo abaixo.
(function () {
  'use strict';
  var C = window.BR_CONTA, bloco = document.getElementById('painel-dono');
  if (!C || !bloco) return;
  var esc = C.esc, reais = C.reais, cliente = null, assinantes = [], filtro = 'todos';
  function dia(d) { return d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4) : '—'; }
  function rpc(nome) { return cliente.rpc(nome).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); }
  function numeros(l) { return '<dl class="af-numeros">' + l.map(function (n) { return '<div><dt>' + esc(n[0]) + '</dt><dd>' + esc(n[1]) + '</dd></div>'; }).join('') + '</dl>'; }
  var SIS = { anshur: 'Anshur', popina: 'Popina', peplo: 'Peplo', annona: 'Annona', atria: 'Atria', ofixl: 'Ofixl', vetnature: 'VetNature' };
  function sistema(app) {
    if (!app) return '—';
    if (SIS[app]) return SIS[app];
    var m = String(app).match(/^([a-z]+?)(essencial|completo|avancado)?$/);
    var nome = m ? m[1] : app, v = m && m[2] ? ' ' + { essencial: 'Essencial', completo: 'Completo', avancado: 'Avançado' }[m[2]] : '';
    return 'Veltria ' + nome.charAt(0).toUpperCase() + nome.slice(1) + v;
  }
  var SIT = { em_dia: ['Em dia', 'ok'], atrasado: ['Atrasado', 'erro'], recusado: ['Pagamento recusado', 'erro'], teste: ['Em teste', 'neutro'], encerrado: ['Cancelado', 'neutro'] };
  var FILTROS = [['todos', 'Todos'], ['em_dia', 'Em dia'], ['problema', 'Atrasados e recusados'], ['teste', 'Em teste'], ['encerrado', 'Cancelados']];
  function passa(a) {
    if (filtro === 'todos') return a.situacao !== 'encerrado';
    if (filtro === 'problema') return a.situacao === 'atrasado' || a.situacao === 'recusado';
    return a.situacao === filtro;
  }
  function tabela() {
    var l = assinantes.filter(passa);
    var cont = function (f) { return assinantes.filter(function (a) { return f === 'todos' ? a.situacao !== 'encerrado' : f === 'problema' ? (a.situacao === 'atrasado' || a.situacao === 'recusado') : a.situacao === f; }).length; };
    return '<div class="pd-filtros" role="group" aria-label="Filtrar assinantes">' + FILTROS.map(function (f) {
      return '<button type="button" class="pd-filtro' + (filtro === f[0] ? ' on' : '') + '" data-filtro="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + esc(f[1]) + ' <b>' + cont(f[0]) + '</b></button>';
    }).join('') + '</div>' +
      (l.length ? '<div class="af-tabela"><table><thead><tr><th>Cliente</th><th>Sistema</th><th>Valor</th><th>Situação</th><th>Pago até</th><th>Próxima cobrança</th><th>Afiliado</th></tr></thead><tbody>' + l.map(function (a) {
        var s = SIT[a.situacao] || [a.situacao, 'neutro'];
        return '<tr><td>' + esc(a.email || '—') + '</td><td>' + esc(a.produto || sistema(a.app)) + '</td><td>' + (Number(a.valor) ? reais(a.valor) + (a.forma === 'pix' ? ' (Pix)' : '') : '—') + '</td>' +
          '<td><span class="pd-sit ' + s[1] + '"' + (a.motivo ? ' title="' + esc(a.motivo) + '"' : '') + '>' + esc(s[0]) + '</span></td><td>' + dia(a.pago_ate || a.teste_ate) + '</td><td>' + dia(a.proxima_cobranca) + '</td><td>' + (a.indicado ? 'Sim' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="ind-regras">Ninguém nesta situação.</p>');
  }
  function desenhar(d) {
    bloco.hidden = false;
    bloco.innerHTML = '<h2>Painel do dono <small>(só você vê)</small></h2>' +
      numeros([['Assinantes pagando', d.ativas], ['Receita por mês', reais(d.receita_mes)], ['Assinaturas novas (30 dias)', d.novas_30d], ['Cancelamentos (30 dias)', d.canceladas_30d],
        ['Pagamentos com problema', d.problemas], ['Contas no site', d.contas_total + ' (+' + d.contas_7d + ' na semana)'], ['Contatos (30 dias)', d.contatos_30d],
        ['Afiliados', d.afiliados], ['A pagar aos afiliados', reais(d.afiliados_pagar)], ['Revendas no Anshur', d.anshur_revendas]]) +
      (d.por_sistema.length ? '<h3>Receita por sistema</h3><div class="af-tabela"><table><thead><tr><th>Sistema</th><th>Assinantes</th><th>Por mês</th></tr></thead><tbody>' + d.por_sistema.map(function (s) {
        return '<tr><td>' + esc(sistema(s.app)) + '</td><td>' + s.ativas + '</td><td>' + reais(s.receita) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      '<h3>Assinantes</h3><div id="pd-assinantes"><p class="ind-regras">Carregando…</p></div>' +
      '<h3>Últimos contatos pelo site</h3>' + (d.contatos.length ? '<div class="af-tabela"><table><thead><tr><th>Data</th><th>Nome</th><th>Negócio</th><th>WhatsApp</th><th>Mensagem</th></tr></thead><tbody>' + d.contatos.map(function (c) {
        return '<tr><td>' + dia(c.criado_em) + '</td><td>' + esc(c.nome || '—') + '</td><td>' + esc(c.negocio || '—') + '</td><td>' + esc(c.whatsapp || '—') + '</td><td>' + esc((c.mensagem || '').slice(0, 140)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="ind-regras">Nenhum contato ainda.</p>') +
      '<p class="ind-regras"><a class="btn btn-ghost" href="#af-dono">Ver os afiliados</a></p>';
    rpc('nexo_painel_dono_assinantes').then(function (l) { assinantes = l || []; document.getElementById('pd-assinantes').innerHTML = tabela(); }).catch(function () {
      document.getElementById('pd-assinantes').innerHTML = '<p class="ind-regras">Não deu para carregar os assinantes agora.</p>'; });
  }
  bloco.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filtro]'); if (!b) return;
    filtro = b.dataset.filtro; document.getElementById('pd-assinantes').innerHTML = tabela();
  });
  // o painel só abre com a verificação em duas etapas (código do app autenticador): só a senha não basta
  function entrarPainel() {
    rpc('nexo_dono_precisa_codigo').then(function (s) {
      if (s === 'ok') return rpc('nexo_painel_dono').then(function (d) { if (d) desenhar(d); });
      if (s === 'codigo') return pedirCodigo();
      if (s === 'cadastrar') return cadastrarCodigo();
    }).catch(function () {});
  }
  function formCodigo(txt) {
    return '<form class="af-form" id="pd-cod"><label>Código de 6 números do app<input name="c" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>' +
      '<button class="btn btn-primary">' + txt + '</button><span role="status"></span></form>';
  }
  function ligarCodigo(factorId) {
    var f = document.getElementById('pd-cod');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = f.querySelector('[role=status]'), bt = f.querySelector('button');
      bt.disabled = true; st.textContent = 'Conferindo…';
      cliente.auth.mfa.challengeAndVerify({ factorId: factorId, code: f.c.value.trim() }).then(function (r) {
        if (r.error) { st.textContent = 'Código errado ou vencido. Confira o app e tente de novo.'; bt.disabled = false; return; }
        st.textContent = 'Pronto.'; setTimeout(function () { location.reload(); }, 400);
      });
    });
  }
  function pedirCodigo() {
    return cliente.auth.mfa.listFactors().then(function (r) {
      var fat = r.data && r.data.totp && r.data.totp[0]; if (!fat) return;
      bloco.hidden = false;
      bloco.innerHTML = '<h2>Painel do dono</h2><p>Para abrir, digite o código que aparece agora no app autenticador do seu celular.</p>' + formCodigo('Abrir o painel');
      ligarCodigo(fat.id);
    });
  }
  function cadastrarCodigo() {
    // apaga tentativas de cadastro que ficaram pela metade antes de começar outra
    return cliente.auth.mfa.listFactors().then(function (r) {
      var pend = ((r.data && r.data.all) || []).filter(function (x) { return x.status !== 'verified'; });
      return Promise.all(pend.map(function (x) { return cliente.auth.mfa.unenroll({ factorId: x.id }); }));
    }).then(function () {
      return cliente.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Celular do dono' });
    }).then(function (r) {
      if (r.error || !r.data) { bloco.hidden = false; bloco.innerHTML = '<h2>Painel do dono</h2><p>Não deu para preparar a proteção agora. Recarregue a página.</p>'; return; }
      bloco.hidden = false;
      bloco.innerHTML = '<h2>Painel do dono: ative a proteção</h2>' +
        '<p>O painel do dono só abre com a senha <b>e</b> um código do seu celular. Faça uma vez só:</p>' +
        '<ol class="pd-passos"><li>Instale no celular um app autenticador (Google Authenticator ou Microsoft Authenticator, grátis).</li><li>No app, toque em adicionar e aponte a câmera para o código abaixo.</li><li>Digite aqui o código de 6 números que aparecer no app.</li></ol>' +
        '<div class="pd-qr"><img src="' + esc(r.data.totp.qr_code) + '" alt="Código para o app autenticador" width="200" height="200"></div>' +
        '<p class="ind-regras">Não consegue ler o código? No app, escolha digitar a chave: <code>' + esc(r.data.totp.secret) + '</code>. Não mostre esta tela a ninguém.</p>' + formCodigo('Ativar e abrir o painel');
      ligarCodigo(r.data.id);
    });
  }
  C.sb().then(function (c) {
    cliente = c;
    var feito = false;
    c.auth.onAuthStateChange(function (ev, s) {
      if (!s || feito) return;
      feito = true;
      setTimeout(entrarPainel, 0);
    });
  }).catch(function () {});
})();

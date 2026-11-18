// Minha conta: painel do afiliado e, só para a conta do dono, a tela de afiliados.
// Quem decide o que cada conta vê é o banco (nexo_meu_afiliado e nexo_afiliados_admin devolvem nulo para as demais).
(function () {
  'use strict';
  // roda em Minha conta e na própria página de Afiliados (lá não existe o painel do dono: usa um bloco solto)
  var C = window.BR_CONTA, blocoAf = document.getElementById('afiliado'), blocoDono = document.getElementById('af-dono') || document.createElement('div');
  if (!C || !blocoAf) return;
  var naPagina = blocoAf.hasAttribute('data-pagina');
  function pedirLogin() {
    blocoAf.hidden = false;
    if (naPagina) return pagEntrar();
    blocoAf.innerHTML = '<h2>Seu painel de afiliado</h2><p>Para pegar o seu link e ver os seus ganhos, entre na sua conta. Não tem? Crie agora, é grátis e leva menos de um minuto.</p>' +
      '<button type="button" class="btn btn-primary" id="af-login">Entrar ou criar conta</button>';
    document.getElementById('af-login').addEventListener('click', function () {
      C.exigirLogin('Para ser afiliado, entre ou crie a sua conta.').then(carregarTudo);
    });
  }
  var esc = C.esc, reais = C.reais, cliente = null;
  function dia(d) { return d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4) : ''; }
  function rpc(nome, args) {
    return (cliente ? Promise.resolve(cliente) : C.sb().then(function (c) { cliente = c; return c; })).then(function (c) { return c.rpc(nome, args || {}); }).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
  }
  function numeros(lista) {
    return '<dl class="af-numeros">' + lista.map(function (n) { return '<div><dt>' + esc(n[0]) + '</dt><dd>' + esc(n[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function situacao(x) {
    if (x.situacao === 'paga') return 'Paga';
    if (x.situacao === 'cancelada') return 'Cancelada';
    if (!x.liberar_em) return 'Espera o saldo do cliente';
    return x.liberar_em > new Date().toISOString().slice(0, 10) ? 'Libera em ' + dia(x.liberar_em) : 'A receber';
  }

  // ------------------------------------------------ afiliado
  function painelAfiliado() {
    return rpc('nexo_meu_afiliado').then(function (d) {
      if (!d) return naPagina ? pagConvite() : convite();
      document.body.classList.add('sou-afiliado');
      if (naPagina) return pagPainel(d);
      var link = 'https://bluerose-store.com/?indica=' + d.codigo, pct = Number(d.pct);
      blocoAf.hidden = false;
      blocoAf.innerHTML = '<h2>Programa de afiliados</h2>' +
        (d.ativo ? '' : '<p class="af-aviso">Seu link está pausado: vendas novas não geram comissão.</p>') +
        '<p>Você recebe <b>' + pct + '%</b> de cada pagamento de quem chega pelo seu link: mensalidades por até ' + d.meses + ' meses, e sistemas sob medida sobre o valor total.</p>' +
        '<div class="ind-link"><input readonly id="af-link" aria-label="Seu link de afiliado" value="' + esc(link) + '"><button type="button" class="btn btn-ghost" id="af-copiar">Copiar</button></div>' +
        '<a class="btn btn-primary ind-zap" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Conheça os sistemas da Blue Rose: ' + link) + '">Compartilhar no WhatsApp</a>' +
        numeros([['Visitas', d.cliques], ['Contas criadas', d.cadastros], ['Clientes pagantes', d.vendas], ['Aguardando', reais(d.aguardando)], ['A receber', reais(d.disponivel)], ['Já pago', reais(d.pago)], ['Meses de Anshur ganhos', d.anshur_meses || 0]]) +
        (d.anshur_meses ? '<p class="ind-regras">Seu acesso ao Anshur vai até <b>' + dia(d.anshur_ate) + '</b>.</p>' : '') +
        '<form class="af-form" id="af-pix"><label>Chave Pix para receber<input name="pix" maxlength="140" required value="' + esc(d.pix || '') + '"></label><button class="btn btn-ghost">Salvar chave</button><span role="status"></span></form>' +
        (d.lista.length ? '<div class="af-tabela"><table><thead><tr><th>Data</th><th>Venda</th><th>Comissão</th><th>Situação</th></tr></thead><tbody>' + d.lista.map(function (x) {
          return '<tr><td>' + dia(x.quando) + '</td><td>' + esc(x.descricao) + '</td><td>' + reais(x.valor) + '</td><td>' + esc(situacao(x)) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="ind-regras">Sua primeira comissão aparece aqui depois do primeiro pagamento aprovado.</p>') +
        '<p class="ind-regras"><b>Anshur:</b> além dos ' + pct + '%, cada revenda que assinar o Anshur pelo seu link te dá 1 mês de acesso ao Anshur (2 assinaturas, 2 meses, e assim por diante).</p>' +
        '<p class="ind-regras">A venda conta quando a pessoa cria uma conta nova pelo seu link. O teste grátis não conta, e pagamento estornado cancela a comissão. Pagamos por Pix todo dia 10 os valores com mais de 30 dias, a partir de ' + reais(Number(d.minimo) || 50) + ': abaixo disso o saldo fica guardado e entra no próximo pagamento. No site, a comissão anda depois que o cliente paga o saldo.</p>';
    });
  }

  // quem ainda não é afiliado: convite para entrar (a própria pessoa ativa; regras em afiliados.html)
  function convite() {
    blocoAf.hidden = false;
    blocoAf.innerHTML = '<h2>Programa de afiliados</h2>' +
      '<p>Indique a Blue Rose e ganhe <b>10%</b> de cada pagamento de quem assinar pelo seu link. No <b>Anshur</b>, cada revenda que assinar pelo seu link também te dá <b>1 mês de acesso ao Anshur</b>.</p>' +
      '<form class="af-form" id="af-entrar"><label class="af-aceite"><input type="checkbox" name="aceite" required> Li e aceito as <a href="afiliados.html#regras">regras do programa de afiliados</a></label>' +
      '<button class="btn btn-primary">Quero ser afiliado</button><span role="status"></span></form>';
    var f = document.getElementById('af-entrar');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = f.querySelector('[role=status]'), bt = f.querySelector('button');
      if (!f.aceite.checked) { st.textContent = 'Marque que leu as regras.'; return; }
      bt.disabled = true; st.textContent = 'Ativando…';
      rpc('nexo_virar_afiliado', { p_aceite: true }).then(function (r) {
        if (r === 'email') { st.textContent = 'Confirme primeiro o seu e-mail (abra o link que enviamos quando você criou a conta) e tente de novo.'; bt.disabled = false; return; }
        if (r === 'pausado') { st.textContent = 'Seu link de afiliado está pausado. Fale com a gente pelo WhatsApp.'; bt.disabled = false; return; }
        if (r !== 'ok') { st.textContent = 'Não deu para ativar agora. Tente de novo.'; bt.disabled = false; return; }
        return painelAfiliado();
      }).catch(function () { st.textContent = 'Não deu para ativar agora. Tente de novo.'; bt.disabled = false; });
    });
  }


  // ------------------------------------------------ página afiliados.html: fluxo completo (entrar, gerar o link, painel)
  var SITE = 'https://bluerose-store.com/';
  function mensagem(link) { return 'Conheço uns sistemas bons para pequenos negócios (agenda, financeiro, loja de roupas, restaurante). Dá para ver funcionando sem cadastro: ' + link; }
  function paraPainel() { try { if (location.hash !== '#painel') history.replaceState(null, '', '#painel'); } catch (e) { /* ok */ } }
  function irAoPainel() { var s = document.getElementById('painel'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'start' }); }
  function pagErro() {
    blocoAf.hidden = false;
    blocoAf.innerHTML = '<div class="afp afp-erro"><h2>Seu painel de afiliado</h2><p>Não deu para carregar o painel agora. Confira a internet e recarregue a página.</p></div>';
  }

  // estado 1: sem login
  function pagEntrar() {
    blocoAf.innerHTML = '<div class="afp afp-entrar">' +
      '<p class="eyebrow">Seu painel de afiliado</p><h2>Entre para gerar o seu link.</h2>' +
      '<p>O link de afiliado e as comissões ficam na sua conta do site. Se ainda não tem, crie agora: é grátis e leva menos de um minuto.</p>' +
      '<div class="afp-acoes"><button type="button" class="btn btn-primary" data-af-login="entrar">Entrar</button><button type="button" class="btn btn-ghost" data-af-login="criar">Criar conta</button></div>' +
      '<p class="afp-nota">Depois de entrar, você volta para este painel.</p></div>';
  }
  function abrirLogin(modo) {
    paraPainel(); // o login pelo Google e o e-mail de confirmação voltam para o endereço guardado (afiliados.html#painel)
    C.exigirLogin(modo === 'entrar' ? 'Entre para gerar o seu link de afiliado.' : 'Crie a sua conta para gerar o seu link de afiliado.')
      .then(function () { carregarTudo(); irAoPainel(); }).catch(function () {});
    if (modo !== 'entrar') return;
    // a janela de login abre em "Criar conta": troca para "Entrar" assim que ela aparecer
    var tentativas = 0, t = setInterval(function () {
      var a = document.querySelector('dialog.conta-dlg[open] [data-m="entrar"]');
      if (a) { clearInterval(t); a.click(); } else if (++tentativas > 40) clearInterval(t);
    }, 75);
  }

  // estado 2: logado, ainda não é afiliado
  function pagConvite() {
    blocoAf.hidden = false;
    blocoAf.innerHTML = '<div class="afp afp-convite">' +
      '<p class="eyebrow">Seu painel de afiliado</p><h2>Gere o seu link de afiliado.</h2>' +
      '<ul class="afp-resumo">' +
        '<li><b>10%</b> de cada mensalidade paga por quem assinar pelo seu link, por até 12 meses.</li>' +
        '<li><b>10%</b> do valor total de sistemas sob medida, depois que o cliente paga o saldo.</li>' +
        '<li>Pagamento por <b>Pix todo dia 10</b>, dos valores com mais de 30 dias, a partir de R$ 50 (abaixo disso, o saldo fica guardado para o próximo dia 10).</li>' +
        '<li>Use só os preços e condições do site. Não prometa resultado.</li>' +
      '</ul>' +
      '<form class="af-form afp-ativar" id="af-entrar" novalidate>' +
        '<label class="af-aceite"><input type="checkbox" name="aceite" required> <span>Li e aceito as <a href="#regras">regras do programa de afiliados</a>.</span></label>' +
        '<button class="btn btn-primary">Gerar meu link</button><span role="status" aria-live="polite"></span></form></div>';
    var f = document.getElementById('af-entrar');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = f.querySelector('[role=status]'), bt = f.querySelector('button');
      if (!f.aceite.checked) { st.textContent = 'Marque que leu e aceita as regras.'; f.aceite.focus(); return; }
      bt.disabled = true; st.textContent = 'Gerando o seu link…';
      rpc('nexo_virar_afiliado', { p_aceite: true }).then(function (r) {
        if (r === 'email') { st.textContent = 'Confirme primeiro o seu e-mail (abra o link que enviamos quando você criou a conta) e tente de novo.'; bt.disabled = false; return; }
        if (r === 'pausado') { st.textContent = 'Seu link de afiliado está pausado. Fale com a gente pelo WhatsApp.'; bt.disabled = false; return; }
        if (r !== 'ok') { st.textContent = 'Não deu para gerar agora. Tente de novo.'; bt.disabled = false; return; }
        return painelAfiliado().then(function () { var l = document.getElementById('af-link'); if (l) l.focus(); });
      }).catch(function () { st.textContent = 'Não deu para gerar agora. Tente de novo.'; bt.disabled = false; });
    });
  }

  // próximo dia 10 (fim de semana passa para segunda; feriado é avisado no texto)
  function proximoPagamento() {
    var h = new Date(), d = new Date(h.getFullYear(), h.getMonth(), 10);
    var util = function (x) { while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return x; };
    if (util(new Date(d)) < new Date(h.getFullYear(), h.getMonth(), h.getDate())) d = new Date(h.getFullYear(), h.getMonth() + 1, 10);
    return util(d);
  }
  function dataBr(x) { return ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); }

  // estado 3: afiliado
  // ícones em linha fina (SVG no próprio código: a CSP do site não aceita fonte de ícones de fora)
  var ICO = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    barras: '<path d="M4 20h17"/><path d="M6 20v-6M10 20V9M14 20v-8M18 20V5"/>',
    cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.2"/>',
    sair: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    olho: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pessoaMais: '<circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3.1-6.5 7-6.5 1.4 0 2.7.3 3.8.9"/><path d="M18 14v6M15 17h6"/>',
    camadas: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 16.5 9 5 9-5"/>',
    moedas: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/><path d="M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/>',
    certo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7L16.2 9.5"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    cabide: '<path d="M10 7a2 2 0 1 1 3 1.7c-.6.4-1 .9-1 1.6v.7"/><path d="M12 11 3 17.2c-.8.6-.4 1.8.6 1.8h16.8c1 0 1.4-1.2.6-1.8L12 11z"/>',
    cesta: '<path d="M3 10h18l-2 9.5a1 1 0 0 1-1 .8H6a1 1 0 0 1-1-.8L3 10z"/><path d="m8 10 3-6M16 10l-3-6M9 13.5v3.5M12 13.5v3.5M15 13.5v3.5"/>',
    capacete: '<path d="M3 17h18"/><path d="M4.5 17a7.5 7.5 0 0 1 15 0"/><path d="M10 9.7V7h4v2.7"/><path d="M3 17v1.5h18V17"/>',
    cloche: '<path d="M3 18h18"/><path d="M4.5 18a7.5 7.5 0 0 1 15 0"/><circle cx="12" cy="8.6" r="1.1"/><path d="M5 20.5h14"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    email: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    pix: '<path d="M12 2.5 16.5 7 12 11.5 7.5 7z"/><path d="M12 12.5 16.5 17 12 21.5 7.5 17z"/><path d="M2.5 12 7 7.5 11.5 12 7 16.5z"/><path d="M12.5 12 17 7.5 21.5 12 17 16.5z"/>',
    rosa: '<path d="M12 21c-4.5-1.5-7-5-7-9.5C8 12 10 13.5 12 16c2-2.5 4-4 7-4.5 0 4.5-2.5 8-7 9.5z"/><path d="M12 16c-2-2-3-4.3-3-7 1.2.3 2.2 1 3 2 .8-1 1.8-1.7 3-2 0 2.7-1 5-3 7z"/><path d="M12 11c-.6-2 0-4.3 1.8-6.5"/>'
  };
  function ico(n, cls) { return '<svg class="afp-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICO[n] + '</svg>'; }
  var MARCAS = {
    whatsapp: '<svg class="afp-marca" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#25D366" d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.3 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 17.9a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1 1 12 20.1z"/><path fill="#25D366" d="M16.5 14c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3z"/></svg>',
    instagram: '<svg class="afp-marca" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="afp-ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".35" stop-color="#FA7E1E"/><stop offset=".6" stop-color="#D62976"/><stop offset=".85" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#afp-ig)" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#afp-ig)" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="#D62976"/></svg>',
    facebook: '<svg class="afp-marca" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path fill="#fff" d="M13.4 21.9v-7h2.3l.4-2.8h-2.7v-1.8c0-.8.3-1.4 1.4-1.4h1.4V6.4c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.2H8.3v2.8h2.3v7z"/></svg>',
    email: '<svg class="afp-marca afp-marca-email" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="#16213f" stroke-width="1.6"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5" fill="none" stroke="#16213f" stroke-width="1.6"/></svg>'
  };
  // links por sistema (mesmo código de afiliado em cada página; cookies.js grava o código e conta.js conta a visita em qualquer página)
  var PAGINAS = [
    ['jano.html', 'Jano', 'Agenda e atendimento', 'calendario'],
    ['arca.html', 'Arca', 'Financeiro da empresa', 'moedas'],
    ['peplo.html', 'Peplo', 'Para loja de roupas', 'cabide'],
    ['annona.html', 'Annona', 'Para mercadinho', 'cesta'],
    ['atria.html', 'Atria', 'Para construção e reforma', 'capacete'],
    ['popina.html', 'Popina', 'Para restaurante', 'cloche'],
    ['anshur.html', 'Anshur', 'Para revenda de máquinas', 'camadas'],
    ['sistemas.html#sob-medida', 'Sistema sob medida', 'Feito do zero para a empresa', 'engrenagem']
  ];
  var MENU = [['afp-inicio', 'Painel', 'casa', 'Painel'], ['afp-links', 'Meus links', 'link', 'Meus links'], ['afp-vendas', 'Vendas e comissões', 'barras', 'Vendas'], ['afp-pagamentos', 'Pagamentos', 'cartao', 'Pagamentos'], ['afp-materiais', 'Materiais de divulgação', 'info', 'Materiais'], ['afp-config', 'Configurações', 'engrenagem', 'Configurações']];
  function linkDe(codigo, pagina) { var p = (pagina || '').split('#'); return SITE + p[0] + '?indica=' + encodeURIComponent(codigo) + (p[1] ? '#' + p[1] : ''); }

  function pagPainel(d) {
    var link = linkDe(d.codigo), pct = Number(d.pct), msg = mensagem(link), prox = proximoPagamento();
    var lista = d.lista || [], temBase = lista.some(function (x) { return x.base != null; });
    var secao = document.getElementById('painel'); if (secao) { secao.classList.add('afp-modo-painel'); if (document.body.classList.contains('pg-afiliados') || /afiliados\.html/.test(location.pathname)) { document.body.classList.add('afp-so-painel'); if (!document.body.dataset.afpTopo) { document.body.dataset.afpTopo = 1; window.scrollTo(0, 0); } } }
    var botaoCopiar = function (attr, rotulo, cls) { return '<button type="button" class="afp-bt-copiar' + (cls ? ' ' + cls : '') + '" ' + attr + (rotulo ? ' aria-label="' + esc(rotulo) + '"' : '') + '>' + ico('copiar') + '<span>Copiar</span></button>'; };
    var numero = function (classe, icone, rotulo, valor, extra, depois) { return '<div class="afp-num ' + classe + '"><dt>' + ico(icone) + '<span>' + esc(rotulo) + '</span>' + (extra || '') + '</dt><dd>' + valor + (depois || '') + '</dd></div>'; };
    // mínimo para receber (vem do servidor; R$ 50 de reserva)
    var minimo = Number(d.minimo) > 0 ? Number(d.minimo) : 50, disp = Number(d.disponivel || 0), atingiu = disp >= minimo, falta = Math.max(0, minimo - disp);
    var barra = atingiu ? '<span class="afp-min afp-min-ok">' + ico('certo') + 'Mínimo de ' + reais2(minimo) + ' atingido</span>'
      : '<span class="afp-min"><span class="afp-min-barra" role="progressbar" aria-label="Saldo até o mínimo para receber" aria-valuemin="0" aria-valuemax="' + minimo + '" aria-valuenow="' + disp + '"><i style="width:' + Math.min(100, Math.round(disp / minimo * 100)) + '%"></i></span>Faltam ' + reais2(falta) + ' para o mínimo de ' + reais2(minimo) + '</span>';
    blocoAf.hidden = false;
    blocoAf.innerHTML = '<div class="afp afp-painel" data-codigo="' + esc(d.codigo) + '">' +
      // menu da área (no celular vira abas roláveis)
      '<nav class="afp-menu" aria-label="Área do afiliado"><div class="afp-menu-tit"><img class="afp-menu-rosa" src="img/blue-rose-logo-96.webp" alt="" width="34" height="34"><span>Área do Afiliado</span></div><ul>' +
        MENU.map(function (m, i) { return '<li><a href="#' + m[0] + '"' + (i ? '' : ' aria-current="true"') + '>' + ico(m[2]) + '<span class="afp-longo">' + esc(m[1]) + '</span><span class="afp-curto" aria-hidden="true">' + esc(m[3]) + '</span></a></li>'; }).join('') +
        '</ul><hr><a class="afp-menu-sair" href="./">' + ico('sair') + '<span>Voltar ao site</span></a></nav>' +

      '<div class="afp-corpo">' +
      '<header class="afp-ola" id="afp-inicio"><h2>Olá<span id="af-nome"></span>!</h2><p>Acompanhe seus resultados, compartilhe seu link e veja suas comissões.</p></header>' +
      (d.ativo ? '' : '<p class="af-aviso afp-pausa" role="note">Seu link está pausado: vendas novas não geram comissão. Fale com a gente pelo WhatsApp.</p>') +

      '<div class="afp-linha1">' +
        '<section class="afp-card-link" aria-labelledby="afp-t-link">' + ico('rosa', 'afp-rosa') +
          '<h3 id="afp-t-link">Seu link pessoal de afiliado</h3>' +
          '<div class="afp-campo"><label class="afp-campo-in">' + ico('link') + '<span class="afp-sr">Seu link de afiliado</span><input readonly id="af-link" value="' + esc(link) + '" spellcheck="false"></label>' +
            '<button type="button" class="afp-bt-copiar afp-bt-grande" data-copiar-de="af-link">' + ico('copiar') + '<span>Copiar</span></button></div>' +
          '<p>Divulgue este link. Você ganha ' + pct + '% de cada mensalidade, por até ' + esc(d.meses) + ' meses, e ' + pct + '% dos sistemas sob medida.</p>' +
        '</section>' +
        '<section class="afp-card afp-compartilhar" aria-labelledby="afp-t-comp"><div class="afp-comp-esq"><h3 id="afp-t-comp">Compartilhe seu link</h3>' +
          '<div class="afp-redes">' +
            '<a class="afp-rede" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">' + MARCAS.whatsapp + '<span>WhatsApp</span></a>' +
            '<button type="button" class="afp-rede" data-copiar="' + esc(msg) + '" data-aviso="Texto copiado. Cole no direct ou na bio do Instagram." aria-describedby="afp-insta-dica">' + MARCAS.instagram + '<span>Instagram</span></button>' +
            '<a class="afp-rede" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link) + '">' + MARCAS.facebook + '<span>Facebook</span></a>' +
            '<a class="afp-rede" href="mailto:?subject=' + encodeURIComponent('Sistemas para pequenos negócios') + '&body=' + encodeURIComponent(msg) + '">' + MARCAS.email + '<span>E-mail</span></a>' +
          '</div><p class="afp-sr" id="afp-insta-dica">O Instagram não aceita link pronto: o botão copia o texto com o link para você colar no direct ou na bio.</p></div>' +
          '<figure class="afp-qr"><div class="afp-qr-img" id="af-qr" role="img" aria-label="QR code do seu link de afiliado"></div><figcaption>Seu link em QR Code</figcaption></figure>' +
        '</section>' +
      '</div>' +

      '<dl class="afp-numeros" aria-label="Seus números">' +
        numero('', 'olho', 'Visitas', esc(Number(d.cliques || 0).toLocaleString('pt-BR'))) +
        numero('', 'pessoaMais', 'Contas criadas', esc(Number(d.cadastros || 0).toLocaleString('pt-BR'))) +
        numero('', 'camadas', 'Vendas', esc(Number(d.vendas || 0).toLocaleString('pt-BR'))) +
        numero('afp-num-receber', 'moedas', 'A receber', esc(reais2(d.disponivel)),
          '<button type="button" class="afp-info" aria-describedby="afp-dica-receber" title="Valores com mais de 30 dias, pagos no próximo dia 10 a partir de ' + esc(reais2(minimo)) + '.">' + ico('info') + '<span class="afp-sr">Sobre este valor</span></button>', barra) +
        numero('', 'certo', 'Já recebido', esc(reais2(d.pago))) +
        numero('afp-num-prox', 'calendario', 'Próximo pagamento', 'Dia ' + prox.getDate() + ' <small>(via Pix)</small>', '', '<span class="afp-min">' + (atingiu ? 'Você recebe ' + reais2(disp) + ' neste dia' : 'Saldo abaixo do mínimo: fica para o próximo') + '</span>') +
      '</dl>' +
      (atingiu ? '' : '<p class="afp-min-aviso">O pagamento mínimo é de ' + reais2(minimo) + '. Abaixo disso, o saldo fica guardado e entra no próximo pagamento.</p>') +
      '<p class="afp-sr" id="afp-dica-receber">A receber: valores com mais de 30 dias, pagos por Pix no dia ' + dataBr(prox) + ' quando somam pelo menos ' + reais2(minimo) + '.' + (Number(d.aguardando) > 0 ? ' Além disso, ' + reais2(d.aguardando) + ' aguardam liberação.' : '') + '</p>' +

      '<div class="afp-linha3">' +
        '<section class="afp-card afp-sistemas" id="afp-links" aria-labelledby="afp-t-sis"><h3 id="afp-t-sis">Seus links por sistema</h3><p class="afp-sub">Divulgue o sistema ideal para cada tipo de negócio.</p><ul>' +
          PAGINAS.map(function (p, i) {
            var l = linkDe(d.codigo, p[0]), id = 'af-link-' + i;
            return '<li>' + ico(p[3], 'afp-ouro') + '<div class="afp-sis-nome"><b>' + esc(p[1]) + '</b><span>' + esc(p[2]) + '</span></div>' +
              '<input readonly id="' + id + '" value="' + esc(l) + '" aria-label="Link de ' + esc(p[1]) + '" spellcheck="false">' +
              botaoCopiar('data-copiar-de="' + id + '"', 'Copiar o link de ' + p[1]) + '</li>';
          }).join('') + '</ul></section>' +
        '<div class="afp-col">' +
          '<section class="afp-card afp-vendas" id="afp-vendas" aria-labelledby="afp-t-vendas"><div class="afp-vendas-topo"><h3 id="afp-t-vendas">Últimas vendas</h3>' +
            (lista.length > 5 ? '<button type="button" class="afp-ver" id="af-ver-todas" aria-expanded="false">Ver todas ' + ico('seta') + '</button>' : '') + '</div>' +
            (lista.length ? '<div class="afp-tabela"><table><thead><tr><th scope="col">Data</th><th scope="col">Sistema</th>' + (temBase ? '<th scope="col">Valor (mensal)</th>' : '') + '<th scope="col">Comissão (' + pct + '%)</th><th scope="col">Situação</th></tr></thead><tbody>' +
              lista.map(function (x, i) {
                var sit = selo(x);
                return '<tr' + (i >= 5 ? ' class="afp-extra" hidden' : '') + '><td>' + dia(x.quando) + '</td><td>' + esc(x.descricao) + '</td>' + (temBase ? '<td>' + (x.base != null ? reais2(x.base) : '—') + '</td>' : '') +
                  '<td>' + reais2(x.valor) + '</td><td><span class="afp-selo afp-selo-' + sit[1] + '">' + esc(sit[0]) + '</span></td></tr>';
              }).join('') + '</tbody></table></div>' +
              // no celular: as mesmas vendas em cartões
              '<ul class="afp-vendas-cartoes">' + lista.map(function (x, i) {
                var sit = selo(x);
                return '<li' + (i >= 5 ? ' class="afp-extra" hidden' : '') + '>' + ico(iconeDe(x.descricao), 'afp-ouro') +
                  '<div class="afp-vc-nome"><b>' + esc(x.descricao) + '</b><span>' + dia(x.quando) + '</span></div>' +
                  '<div class="afp-vc-valor">' + (x.base != null ? '<b>' + reais2(x.base) + '</b>' : '') + '<span>Comissão: ' + reais2(x.valor) + '</span></div>' +
                  '<span class="afp-selo afp-selo-' + sit[1] + '">' + esc(sit[0]) + '</span></li>';
              }).join('') + '</ul>'
              : '<p class="afp-vazio">Sua primeira comissão aparece aqui depois do primeiro pagamento aprovado de quem chegou pelo seu link.</p>') +
          '</section>' +
          '<section class="afp-pix" id="afp-pagamentos" aria-labelledby="afp-t-pix">' + ico('pix', 'afp-pix-ico') +
            '<div class="afp-pix-txt"><h3 id="afp-t-pix">Sua chave Pix para recebimento</h3><p>É aqui que enviamos suas comissões todo dia 10 (a partir de ' + reais2(minimo) + ').</p></div>' +
            '<form class="afp-pix-form" id="af-pix"><label><span class="afp-sr">Chave Pix</span><input name="pix" maxlength="140" required autocomplete="off" placeholder="Sua chave Pix" value="' + esc(d.pix || '') + '"></label>' +
              '<button class="afp-pix-salvar">Salvar</button><span role="status" aria-live="polite"></span></form>' +
            '<p class="afp-pix-aviso">' + (d.pix ? '' : '<b>Você ainda não informou a chave:</b> sem ela, o pagamento fica parado. ') + 'Ao trocar a chave, confirmamos a troca com você por outro canal antes do próximo pagamento.</p>' +
          '</section>' +
        '</div>' +
      '</div>' +

      '<section class="afp-card afp-materiais" id="afp-materiais" aria-labelledby="afp-t-mat"><h3 id="afp-t-mat">Materiais de divulgação</h3>' +
        '<p class="afp-sub">Texto pronto para mandar com o seu link. Não prometa resultado: mostre os sistemas e deixe a pessoa testar.</p>' +
        '<textarea readonly id="af-msg" rows="3" aria-label="Mensagem pronta com o seu link">' + esc(msg) + '</textarea>' +
        '<div class="afp-mat-acoes">' + botaoCopiar('data-copiar-de="af-msg"', 'Copiar a mensagem pronta') +
          '<label class="afp-qr-escolha">QR code de<select id="af-qr-pagina"><option value="-1">Página inicial</option>' + PAGINAS.map(function (p, i) { return '<option value="' + i + '">' + esc(p[1]) + '</option>'; }).join('') + '</select></label>' +
          '<button type="button" class="afp-bt-claro" id="af-qr-baixar">Baixar QR code</button></div>' +
      '</section>' +

      '<section class="afp-card afp-config" id="afp-config" aria-labelledby="afp-t-conf"><h3 id="afp-t-conf">Configurações</h3><dl>' +
        '<div><dt>Conta</dt><dd id="af-email">—</dd></div>' +
        '<div><dt>Seu código</dt><dd><code>' + esc(d.codigo) + '</code></dd></div>' +
        '<div><dt>Situação do link</dt><dd>' + (d.ativo ? 'Ativo' : 'Pausado') + '</dd></div>' +
        '<div><dt>Comissão</dt><dd>' + pct + '% por até ' + esc(d.meses) + ' meses</dd></div>' +
        '<div><dt>Pagamento</dt><dd>Pix todo dia 10, a partir de ' + reais2(minimo) + '</dd></div>' +
        (d.anshur_meses ? '<div><dt>Meses de Anshur ganhos</dt><dd>' + esc(d.anshur_meses) + ' (acesso até ' + dia(d.anshur_ate) + ')</dd></div>' : '') +
      '</dl><p class="afp-sub">A venda conta quando a pessoa cria uma conta nova pelo seu link. Pagamento estornado cancela a comissão. <a href="conta.html">Minha conta</a></p><div class="afp-regras" id="af-regras-conf"></div></section>' +
      '<p class="afp-sr" id="af-copiado" role="status" aria-live="polite"></p>' +
      '</div></div>';
    pagQR(d.codigo, -1);
    // regras e ganhos da página vão para dentro de Configurações (a página em volta fica escondida)
    var rc = document.getElementById('af-regras-conf');
    if (rc) ['t-ganhos', 't-regras'].forEach(function (id) {
      var h = document.getElementById(id), w = h && h.parentNode; if (!w) return;
      var c = w.cloneNode(true); c.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); }); c.querySelectorAll('.ctas').forEach(function (x) { x.remove(); });
      c.className = 'afp-regras-bloco'; rc.appendChild(c);
    });
    cliente.auth.getSession().then(function (r) {
      var u = r.data.session && r.data.session.user; if (!u) return;
      var nome = String((u.user_metadata && (u.user_metadata.nome || u.user_metadata.full_name || u.user_metadata.name)) || '').trim().split(/\s+/)[0];
      var n = document.getElementById('af-nome'); if (n && nome) n.textContent = ', ' + nome;
      var e = document.getElementById('af-email'); if (e) e.textContent = u.email || '—';
    }).catch(function () {});
    menuAtivo();
  }
  // selo da venda no painel: Recebida, Cancelada, A receber (já liberada) ou Libera dd/mm (ainda nos 30 dias)
  function selo(x) {
    if (x.situacao === 'paga') return ['Recebida', 'ok'];
    if (x.situacao === 'cancelada') return ['Cancelada', 'cancelada'];
    if (!x.liberar_em) return ['Espera o saldo', 'espera'];
    return x.liberar_em > new Date().toISOString().slice(0, 10) ? ['Libera ' + dia(x.liberar_em).slice(0, 5), 'espera'] : ['A receber', 'espera'];
  }
  function iconeDe(t) {
    t = String(t || '').toLowerCase();
    return /agenda/.test(t) ? 'calendario' : /financ/.test(t) ? 'moedas' : /peplo|roupa/.test(t) ? 'cabide' : /annona|mercad/.test(t) ? 'cesta' : /atria|constru/.test(t) ? 'capacete' : /popina|restaur/.test(t) ? 'cloche' : 'camadas';
  }
  function reais2(n) { return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // menu: marca a seção visível
  var observador = null;
  // menu lateral = abas: cada item mostra só a sua parte do painel
  var ABAS = [['.afp-ola', 'afp-inicio'], ['.afp-linha1', 'afp-inicio afp-links'], ['.afp-numeros', 'afp-inicio afp-vendas afp-pagamentos'], ['.afp-min-aviso', 'afp-inicio afp-pagamentos'],
    ['.afp-linha3', 'afp-inicio afp-links afp-vendas afp-pagamentos'], ['#afp-links', 'afp-inicio afp-links'], ['.afp-col', 'afp-inicio afp-vendas afp-pagamentos'],
    ['#afp-vendas', 'afp-inicio afp-vendas'], ['#afp-pagamentos', 'afp-inicio afp-pagamentos'], ['#afp-materiais', 'afp-materiais'], ['#afp-config', 'afp-config']];
  function mostrarAba(aba) {
    var corpo = blocoAf.querySelector('.afp-corpo'); if (!corpo) return;
    corpo.setAttribute('data-aba', aba);
    ABAS.forEach(function (a) { blocoAf.querySelectorAll(a[0]).forEach(function (el) { el.classList.toggle('afp-fora', a[1].split(' ').indexOf(aba) < 0); }); });
    blocoAf.querySelectorAll('.afp-menu ul a').forEach(function (a) { if (a.getAttribute('href') === '#' + aba) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  function menuAtivo() {
    if (observador) observador.disconnect();
    blocoAf.querySelectorAll('.afp-menu ul a').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault(); mostrarAba(a.getAttribute('href').slice(1));
        var p = document.getElementById('painel'); if (p && p.getBoundingClientRect().top < 0) p.scrollIntoView({ block: 'start' });
      });
    });
    mostrarAba('afp-inicio');
  }

  // QR: reaproveita o gerador do site (módulo local, sem CDN)
  var qrMod = null, qrAtual = { svg: '', nome: '' };
  function pagQR(codigo, i) {
    var p = PAGINAS[i] || ['', 'Página inicial'], l = linkDe(codigo, p[0]), caixa = document.getElementById('af-qr');
    if (!caixa) return;
    (qrMod || (qrMod = import(new URL('demos/sistemas/base/qr.js', document.baseURI).href))).then(function (m) {
      qrAtual.svg = m.qrSVG(l, 240, '#101b36'); qrAtual.nome = 'qr-afiliado-' + (p[0].replace('.html', '') || 'inicio') + '.svg';
      caixa.innerHTML = qrAtual.svg;
      caixa.setAttribute('aria-label', 'QR code do seu link de afiliado: ' + p[1]);
    }).catch(function () { qrMod = null; caixa.innerHTML = '<p class="afp-nota">Não deu para gerar o QR agora.</p>'; });
  }
  function copiar(texto, botao, aviso) {
    var feitoCopia = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(texto) : Promise.reject();
    feitoCopia.catch(function () {
      var t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* ok */ } t.remove();
    }).then(function () {
      var vivo = document.getElementById('af-copiado');
      if (vivo) { vivo.textContent = ''; setTimeout(function () { vivo.textContent = aviso || 'Copiado.'; }, 30); }
      var rot = botao.classList.contains('afp-rede') ? null : (botao.querySelector('span') || botao);
      if (rot) { if (!botao.dataset.rotulo) botao.dataset.rotulo = rot.textContent; rot.textContent = 'Copiado'; }
      botao.classList.add('afp-copiado');
      clearTimeout(botao._t); botao._t = setTimeout(function () { if (rot) rot.textContent = botao.dataset.rotulo; botao.classList.remove('afp-copiado'); }, 1800);
    });
  }
  if (naPagina) document.addEventListener('change', function (e) {
    var p = e.target.closest && e.target.closest('.afp-painel');
    if (e.target.id === 'af-qr-pagina' && p) pagQR(p.dataset.codigo, Number(e.target.value));
  });
  if (naPagina) document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button, a');
    if (!b || !blocoAf.contains(b)) return;
    if (b.dataset.afLogin) { abrirLogin(b.dataset.afLogin); return; }
    if (b.dataset.copiarDe) { var el = document.getElementById(b.dataset.copiarDe); if (el) copiar(el.value, b); return; }
    if (b.hasAttribute('data-copiar')) { copiar(b.getAttribute('data-copiar'), b, b.dataset.aviso); return; }
    if (b.id === 'af-ver-todas') { var ab = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(ab)); blocoAf.querySelectorAll('.afp-extra').forEach(function (r) { r.hidden = !ab; }); return; }
    if (b.id === 'af-qr-baixar' && qrAtual.svg) {
      var url = URL.createObjectURL(new Blob([qrAtual.svg], { type: 'image/svg+xml' })), a = document.createElement('a');
      a.href = url; a.download = qrAtual.nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  });

  // ------------------------------------------------ dono
  function painelDono() {
    return rpc('nexo_afiliados_admin').then(function (d) {
      if (!d) return;
      blocoDono.hidden = false;
      var soma = function (k) { return d.afiliados.reduce(function (s, a) { return s + Number(a[k] || 0); }, 0); };
      blocoDono.innerHTML = '<h2>Afiliados (só você vê)</h2>' + numeros([['Afiliados', d.afiliados.length], ['Vendido por eles (total)', reais(soma('vendido'))], ['Vendido este mês', reais(soma('vendido_mes'))], ['A pagar agora', reais(soma('disponivel'))], ['Já pago', reais(soma('pago'))]]) +
        '<p class="ind-regras">Ordem: quem mais vendeu primeiro. "Vendido" é o valor que os clientes indicados pagaram (sem estornos); a comissão é ' + (d.afiliados[0] ? Number(d.afiliados[0].pct) : 10) + '% disso. Pagamento todo dia 10, a partir de ' + reais(Number(d.minimo) || 50) + ' por afiliado (abaixo disso o saldo acumula).</p>' +
        '<form class="af-form" id="af-novo"><label>E-mail da conta do afiliado<input type="email" name="email" required autocomplete="off"></label><button class="btn btn-primary">Adicionar</button><span role="status"></span></form>' +
        d.afiliados.map(function (a) {
          return '<article class="af-item"><h3>' + esc(a.email) + (a.ativo ? '' : ' (pausado)') + '</h3>' +
            '<p>Link: <code>bluerose-store.com/?indica=' + esc(a.codigo || '') + '</code><br>Pix: ' + (a.pix ? esc(a.pix) : 'ainda não informou') + '</p>' +
            (a.pix_recente ? '<p class="af-aviso">Atenção: a chave Pix foi trocada em ' + dia(a.pix_alterado_em) + '. Antes de pagar, confirme com a pessoa por outro canal que foi ela mesma.</p>' : '') +
            numeros([['Vendeu (total)', reais(a.vendido)], ['Vendeu no mês', reais(a.vendido_mes)], ['Visitas', a.cliques], ['Contas', a.cadastros], ['Pagantes', a.vendas], ['Meses de Anshur', a.anshur_meses || 0], ['Aguardando', reais(a.aguardando)], ['A pagar', reais(a.disponivel)], ['Pago', reais(a.pago)]]) +
            '<div class="af-acoes"><button type="button" class="btn btn-primary" data-pagar="' + esc(a.usuario) + '" data-recente="' + (a.pix_recente ? '1' : '') + '" data-valor="' + esc(a.disponivel) + '"' + (Number(a.disponivel) >= (Number(a.minimo || d.minimo) || 50) && a.pix ? '' : ' disabled') + '>Já fiz o Pix de ' + reais(a.disponivel) + '</button>' +
            '<button type="button" class="btn btn-ghost" data-pausar="' + esc(a.email) + '" data-ativo="' + (a.ativo ? '0' : '1') + '">' + (a.ativo ? 'Pausar' : 'Reativar') + '</button></div>' +
            '<form class="af-form" data-lancar="' + esc(a.usuario) + '"><label>Sistema sob medida vendido<input name="desc" required minlength="3" maxlength="120"></label><label>Valor total recebido (R$)<input name="total" type="number" min="1" step="0.01" required></label><button class="btn btn-ghost">Lançar comissão de ' + Number(a.pct) + '%</button><span role="status"></span></form></article>';
        }).join('') +
        (d.saldos.length ? '<h3>Projetos esperando o saldo do cliente</h3>' + d.saldos.map(function (s) {
          return '<div class="af-saldo"><span>' + esc(s.descricao) + ', total ' + reais(s.base) + ': comissão ' + reais(s.valor) + ' de ' + esc(s.email || '') + '</span>' +
            '<button type="button" class="btn btn-primary" data-saldo="' + s.id + '" data-ok="1">Saldo recebido</button><button type="button" class="btn btn-ghost" data-saldo="' + s.id + '" data-ok="0">Cliente não pagou</button></div>';
        }).join('') : '');
    });
  }
  var ERROS = { sem_conta: 'Esse e-mail ainda não tem conta. Peça para a pessoa criar a conta no site primeiro.', invalido: 'Confira o que foi preenchido.', negado: 'Sem permissão.' };
  function nota(f, t) { var s = f.querySelector('[role=status]'); if (s) s.textContent = t; }

  document.addEventListener('submit', function (e) {
    var f = e.target, feito;
    if (f.id === 'af-pix') feito = rpc('nexo_afiliado_pix', { p_pix: f.pix.value }).then(function (r) { nota(f, r === 'ok' ? 'Chave salva.' : ERROS.invalido); });
    else if (f.id === 'af-novo') feito = rpc('nexo_afiliado_admin_salvar', { p_email: f.email.value }).then(function (r) { if (r === 'ok') return painelDono(); nota(f, ERROS[r] || r); });
    else if (f.dataset.lancar) feito = rpc('nexo_afiliado_admin_lancar', { p_afiliado: f.dataset.lancar, p_descricao: f.desc.value, p_total: Number(f.total.value) }).then(function (r) { if (r === 'ok') return painelDono(); nota(f, ERROS[r] || r); });
    else return;
    e.preventDefault();
    feito.catch(function (x) { nota(f, x.message || 'Não foi possível salvar.'); });
  });
  document.addEventListener('click', function (e) {
    var b = e.target;
    if (b.id === 'af-copiar') {
      var el = document.getElementById('af-link');
      (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).catch(function () { el.select(); document.execCommand('copy'); });
      b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1800);
      return;
    }
    var feito;
    if (b.dataset && b.dataset.pagar) {
      if (b.dataset.recente && !window.confirm('A chave Pix deste afiliado foi trocada há poucos dias. Você confirmou com a pessoa por outro canal que a chave nova é dela?')) return;
      if (!window.confirm('Confirma que o Pix de ' + reais(b.dataset.valor) + ' já foi feito?')) return;
      feito = rpc('nexo_afiliado_admin_pagar', { p_afiliado: b.dataset.pagar });
    } else if (b.dataset && b.dataset.pausar) feito = rpc('nexo_afiliado_admin_salvar', { p_email: b.dataset.pausar, p_ativo: b.dataset.ativo === '1' });
    else if (b.dataset && b.dataset.saldo) feito = rpc('nexo_afiliado_admin_saldo', { p_comissao: Number(b.dataset.saldo), p_recebido: b.dataset.ok === '1' });
    else return;
    b.disabled = true;
    var MIN_MSG = 'Saldo abaixo do mínimo de R$ 50; fica para o próximo pagamento.';
    feito.then(function (r) { if (r === 'abaixo_minimo') throw new Error(MIN_MSG); return painelDono(); })
      .catch(function (x) { b.disabled = false; window.alert(/abaixo_minimo/.test(x.message || '') ? MIN_MSG : (x.message || 'Não foi possível salvar.')); });
  });

  var feito = false;
  function carregarTudo() {
    if (feito) return;
    feito = true;
    painelAfiliado().catch(function () { if (naPagina) pagErro(); });
    painelDono().catch(function () {});
  }
  // visitante sem conta na página de Afiliados: mostra "Entrar / Criar conta" sem baixar a biblioteca do banco (só baixa quando clicar)
  if (naPagina && !C.sessao()) { pedirLogin(); return; }
  C.sb().then(function (c) {
    cliente = c;
    c.auth.onAuthStateChange(function (ev, s) {
      if (!s && naPagina && !feito) { pedirLogin(); return; }
      if (!s || feito) return;
      setTimeout(carregarTudo, 0); // fora do aviso de login: chamar o banco aqui dentro pode travar a sessão
    });
  }).catch(function () { if (naPagina) pagErro(); });
})();

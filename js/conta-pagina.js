/* Página "Minha conta": testes, assinaturas e compras do cliente, com cancelamento. */
(function () {
  var C = window.BR_CONTA, raiz = document.getElementById('conta-raiz');
  if (!C || !raiz) return;
  var esc = C.esc, reais = C.reais, resumo = document.getElementById('conta-resumo');
  var params = new URLSearchParams(location.search), volta = params.get('volta');
  if (volta && !/^[A-Za-z0-9_-]{1,64}$/.test(volta)) volta = null; /* id de assinatura: só caracteres seguros (UUID ou número) */
  var NOMES = { teste: 'Teste grátis', assinatura: 'Assinatura', compra: 'Compra' };
  var APPS = ['crm', 'agenda', 'financeiro', 'gestao', 'juridico', 'clinica', 'academia', 'restaurante', 'imobiliaria', 'oficina', 'farmacia', 'obras', 'cerimonial', 'pragas', 'ofixl'];
  // catálogo para a busca: o cliente digita o nome (ou o ramo) e o sistema aparece, mesmo os que ele ainda não tem
  var CAT = {
    gestao: ['Veltria Gestão', 'estoque loja mercado distribuidora atacado varejo vendas pedidos compras fornecedores nota fiscal nfe xml código de barras etiquetas caixa pdv inventário'],
    crm: ['Veltria CRM', 'vendas funil clientes propostas orçamentos metas leads negociações agenda atividades whatsapp'],
    agenda: ['Veltria Agenda', 'agenda agendamento horários salão barbearia estética manicure comanda comissão caixa clientes whatsapp lembrete'],
    juridico: ['Veltria Jurídico', 'advocacia advogado processos prazos agenda audiências intimações honorários clientes'],
    financeiro: ['Veltria Financeiro', 'financeiro contas pagar receber caixa fluxo dre conciliação extrato banco cobrança boleto pix ordem de serviço assistência técnica'],
    clinica: ['Veltria Clínica', 'clínica consultório médico dentista agenda consultas pacientes prontuário receitas convênios'],
    academia: ['Veltria Academia', 'academia estúdio alunos mensalidades check-in aulas agenda treinos personal'],
    restaurante: ['Veltria Restaurante', 'restaurante lanchonete pizzaria delivery mesas comandas cozinha cardápio estoque caixa'],
    imobiliaria: ['Veltria Imobiliária', 'imobiliária imóveis corretor aluguel venda contratos visitas agenda'],
    oficina: ['Veltria Oficina', 'oficina mecânica carro veículos ordem de serviço orçamento peças estoque agenda revisões'],
    farmacia: ['Veltria Farmácia', 'farmácia drogaria remédio medicamentos controlados receitas validade lotes estoque caixa pdv nota fiscal nfc-e convênios'],
    obras: ['Veltria Obras', 'obra obras reforma construção empreiteiro diário cronograma gastos orçamento equipe'],
    cerimonial: ['Blue Rose Eternize', 'casamento eventos cerimonial festas convidados fornecedores agenda orçamento'],
    pragas: ['Blue Rose Guard', 'dedetização controle de pragas visitas agenda ordem de serviço certificados contratos'],
    ofixl: ['Blue Rose Ofixl', 'serviços técnicos ar-condicionado manutenção ordem de serviço agenda técnicos orçamento']
  };
  function normal(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  // saíram da vitrine em 22/10/2026: quem já usa continua vendo, mas não aparecem como sugestão
  var FORA_DE_VENDA = ['academia', 'restaurante', 'imobiliaria', 'cerimonial', 'pragas', 'clinica'];
  var PAGINA = { obras: 'veltria-obras.html', cerimonial: 'eternize.html', pragas: 'guard.html', ofixl: 'ofixl.html' };
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
  // tutorial em vídeo de cada sistema: por versão (Essencial, Completo, Avançado) quando existe; senão o geral do sistema
  var POR_VERSAO = ['agenda', 'crm', 'farmacia', 'financeiro', 'gestao', 'juridico', 'obras', 'oficina'], SO_VERSOES = ['ofixl', 'vetnature'];
  function tutorial(a) {
    if (!a.app || (APPS.indexOf(a.app) < 0 && SO_VERSOES.indexOf(a.app) < 0)) return '';
    var v = (String(a.nome || '') + ' ' + String(a.produto || '')).match(/essencial|completo|avan[cç]ado/i);
    if (v && POR_VERSAO.indexOf(a.app) >= 0) return 'video/versoes/' + a.app + '-' + normal(v[0]) + '-tutorial';
    if (SO_VERSOES.indexOf(a.app) >= 0) return 'video/versoes/' + a.app + '-tutorial';
    return 'video/tutoriais/' + a.app;
  }
  // janela do vídeo: abre ao tocar na foto do sistema ou no link "Assista ao vídeo tutorial"
  var janela = null;
  function abrirTutorial(src, titulo) {
    if (!janela) {
      janela = document.createElement('dialog'); janela.className = 'conta-video'; janela.setAttribute('aria-label', 'Tutorial em vídeo');
      janela.innerHTML = '<div class="conta-video-cab"><b></b><button type="button" class="conta-video-x" aria-label="Fechar">×</button></div><video controls playsinline preload="metadata"></video>';
      document.body.appendChild(janela);
      janela.querySelector('.conta-video-x').addEventListener('click', function () { janela.close(); });
      janela.addEventListener('click', function (e) { if (e.target === janela) janela.close(); });
      janela.addEventListener('close', function () { janela.querySelector('video').pause(); });
    }
    var vd = janela.querySelector('video');
    janela.querySelector('b').textContent = 'Tutorial · ' + titulo;
    vd.poster = src + '.webp'; vd.src = src + '.mp4';
    janela.showModal(); vd.play().catch(function () {});
  }
  raiz.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tutorial]'); if (!t) return;
    e.preventDefault(); abrirTutorial(t.getAttribute('data-tutorial'), t.getAttribute('data-titulo') || '');
  });
  function cartao(a) {
    var linhas = [];
    if (a.tipo === 'teste' && a.status === 'teste') linhas.push('Primeira cobrança de ' + reais(a.valor) + ' em ' + data(a.proxima_cobranca || a.teste_ate) + ', se você não cancelar antes.');
    if (a.brinde) { /* brinde do Completo ou do Avançado: o motivo já explica */ }
    else if (a.tipo !== 'compra' && a.status === 'ativa' && !Number(a.valor)) linhas.push('Cortesia da Blue Rose: sem cobrança.');
    else if (a.tipo !== 'compra' && a.status === 'ativa') linhas.push(reais(a.valor) + (anual(a) ? ' por ano (plano anual, 20% de desconto)' : ' por mês') + ' · próxima cobrança em ' + data(a.proxima_cobranca));
    if (a.status === 'cancelada' && !a.brinde) { var ate = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop(); linhas.push(ate ? 'Sem novas cobranças. O acesso continua até ' + data(ate) + '.' : 'Sem novas cobranças.'); }
    if (a.tipo === 'compra') linhas.push(a.status === 'paga' ? 'Entrada de ' + reais(a.valor) + ' paga. Em até 1 dia útil entramos em contato para a implantação.' : 'Entrada de ' + reais(a.valor) + '.');
    if (a.motivo) linhas.push(a.motivo);
    var fim = [a.teste_ate, a.pago_ate].filter(Boolean).sort().pop();
    var pode = a.app && (['teste', 'ativa', 'paga'].indexOf(a.status) >= 0 || (a.status === 'cancelada' && fim && fim >= hojeISO)); /* cancelada: só enquanto o período pago vale */
    var abrir = pode ? '<a class="btn btn-primary" href="app/' + esc(a.app) + '/">Abrir o sistema <svg class="ico ico-move" aria-hidden="true"><use href="img/icones.svg#i-arrow-right"/></svg></a>' : '';
    var cancelar = !a.brinde && a.tipo !== 'compra' && ['teste', 'ativa'].indexOf(a.status) >= 0 ? '<button type="button" class="conta-link" data-cancelar="' + esc(a.id) + '">' + (a.status === 'teste' ? 'Cancelar o teste' : 'Cancelar a assinatura') + '</button>' : '';
    var assinar = a.app && a.tipo !== 'compra' && !(a.brinde && a.status === 'cancelada' && fim && fim >= hojeISO) && (a.status === 'recusada' || (a.status === 'cancelada' && (!fim || fim < hojeISO))) ? '<button type="button" class="btn btn-primary" data-assinar="a-sis-' + esc(a.app) + '">Assinar por ' + reais(a.valor) + '/mês</button>' : '';
    var foto = '', nomeSis = String(a.nome).replace(/ \((aluguel|assinatura|compra)\)$/, ''), vid = tutorial(a);
    var mini = vid ? '<button type="button" class="conta-mini" data-tutorial="' + vid + '" data-titulo="' + esc(nomeSis) + '" aria-label="Ver o tutorial do ' + esc(nomeSis) + '"><img src="' + vid + '.webp" alt="" width="640" height="400" loading="lazy"><span class="conta-mini-play" aria-hidden="true"></span></button>' : '';
    var apagado = ['cancelada', 'expirada', 'recusada'].indexOf(a.status) >= 0 ? ' conta-item-off' : '';
    /* token de dono: pedido uma vez, quando a empresa é criada no sistema */
    var tk = pode && TOKENS[a.app] && !tokenMostrado[a.app] ? TOKENS[a.app] : null; if (tk) tokenMostrado[a.app] = true;
    var token = tk ? '<div class="conta-token"><small>Token de dono</small><code>' + esc(tk.token) + '</code><span>' + (tk.ativado ? 'Já ativado em ' + data(tk.ativado) + '. Não precisa usar de novo.' : 'Use uma vez, ao criar a sua empresa no sistema. Não compartilhe: a equipe entra pelos convites.') + '</span></div>' : '';
    return '<article data-busca="' + esc(normal((a.nome || '') + ' ' + (CAT[a.app] ? CAT[a.app][0] : ''))) + '" class="conta-item' + (foto ? ' com-foto' : '') + apagado + '">' + foto + '<div class="conta-item-corpo"><div class="conta-item-cab"><div class="conta-item-titulo">' + mini + '<div><small>' + esc(a.brinde ? 'Brinde' : NOMES[a.tipo] || a.tipo) + ' · desde ' + data(a.criado) + '</small><h3>' + esc(nomeSis) + '</h3></div></div>' + etiqueta(a) + '</div>' +
      barraTeste(a) + (linhas.length ? '<p>' + linhas.map(esc).join('<br>') + '</p>' : '') + token + (pode ? '<p class="conta-ajuda"><a href="' + (PAGINA[a.app] || 'veltria-' + esc(a.app) + '.html') + '#tutorial"' + (vid ? ' data-tutorial="' + vid + '" data-titulo="' + esc(nomeSis) + '"' : '') + '>Assista ao vídeo tutorial</a>: mostra cada passo, da criação da empresa à importação das suas planilhas. ' + 'Prefere como programa? <a href="app/' + esc(a.app) + '/?instalar=1">Instale no computador ou no celular</a>: ganha ícone e abre em janela própria. ' + 'Ficou alguma dúvida? Escreva para <a href="mailto:blueroseexpressoficial@gmail.com">blueroseexpressoficial@gmail.com</a>: respondemos em até 1 dia útil e marcamos uma ajuda.</p>' : '') + '<div class="conta-item-bt">' + abrir + assinar + cancelar + '</div></div></article>';
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
      document.getElementById('ind-texto').textContent = d.confirmados + (d.confirmados === 1 ? ' assinou' : ' assinaram') + ' · ' + naRoda + ' de 3 para o próximo mês grátis · ' + d.cadastrados + ' entraram pelo link';
      var dev = (d.devolvidos || [])[0], pr = document.getElementById('ind-premio'), txt = [];
      if (d.meses_guardados) txt.push(d.meses_guardados + (d.meses_guardados === 1 ? ' mês grátis guardado' : ' meses grátis guardados') + ': a sua próxima mensalidade paga volta para o cartão.');
      if (dev) txt.push('Último mês grátis: ' + reais(dev.valor) + ' devolvidos em ' + data(dev.quando) + '.');
      if (txt.length) { pr.hidden = false; pr.textContent = txt.join(' '); }
      bloco.hidden = false;
    }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    if (e.target.id !== 'ind-copiar') return;
    var el = document.getElementById('ind-link');
    (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).catch(function () { el.select(); document.execCommand('copy'); });
    e.target.textContent = 'Copiado'; setTimeout(function () { e.target.textContent = 'Copiar'; }, 1800);
  });
  // a última lista fica guardada neste aparelho: aparece na hora e é atualizada assim que o servidor responde
  var guardada = C.sessao && C.sessao(), CHAVE_CACHE = guardada ? 'br-conta-' + guardada.user.id : null;
  function lerCache() { try { return CHAVE_CACHE ? JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null') : null; } catch (e) { return null; } }
  // o token de dono nunca fica guardado no aparelho (só a lista de assinaturas)
  function gravarCache(j) { try { if (CHAVE_CACHE) localStorage.setItem(CHAVE_CACHE, JSON.stringify({ assinaturas: j.assinaturas || [] })); } catch (e) { /* sem armazenamento */ } }
  function carregar() {
    var cache = !volta && lerCache();
    if (cache && guardada) { perfil(guardada.user); document.body.classList.add('conta-logado'); mostrar(cache, true); }
    else raiz.innerHTML = '<div class="conta-carregando" aria-label="Carregando"><i></i><i></i></div>';
    C.exigirLogin('Entre para ver os seus testes, assinaturas e compras.').then(function (s) {
      perfil(s.user);
      document.body.classList.add('conta-logado');
      return C.chamar({ acao: 'status', id: volta || undefined });
    }).then(function (j) { gravarCache(j); mostrar(j, false); })
      .catch(function (x) {
        if (!cache) { raiz.innerHTML = '<div class="conta-aviso er">' + esc(x.message || 'Não foi possível carregar.') + '</div>'; return; }
        var av = raiz.querySelector('[data-aviso-cache]');
        if (av) { av.className = 'conta-aviso er'; av.innerHTML = 'Esta é a última lista salva neste aparelho: não deu para atualizar agora (' + esc(x.message || 'erro') + '). <button type="button" class="conta-link" data-recarregar>Tentar de novo</button> ou saia e entre de novo.'; }
      });
  }
  function mostrar(j, doCache) {
    {
      var l = j.assinaturas || [], v = !doCache && volta && l.filter(function (x) { return x.id === volta; })[0], aviso = '';
      TOKENS = j.tokens || {}; tokenMostrado = {};
      if (v) {
        aviso = v.status === 'teste' ? '<div class="conta-aviso ok">Cartão cadastrado. O seu teste grátis está valendo até ' + data(v.teste_ate) + '. <a href="app/' + esc(v.app) + '/">Abrir o sistema agora →</a></div>'
          : v.status === 'ativa' || v.status === 'paga' ? '<div class="conta-aviso ok">Pagamento confirmado. Obrigado!' + (v.app ? ' <a href="app/' + esc(v.app) + '/">Abrir o sistema →</a>' : '') + '</div>'
          : v.status === 'recusada' ? '<div class="conta-aviso er">' + esc(v.motivo || 'Não foi possível liberar o teste.') + '</div>'
          : '<div class="conta-aviso">Ainda não recebemos a confirmação do Mercado Pago. Se você terminou o pagamento, ela chega em alguns minutos: atualize esta página.</div>';
        history.replaceState(null, '', 'conta.html');
      }
      mostrarResumo(l);
      meusApps = {}; l.forEach(function (x) { if (x.app && ['teste', 'ativa', 'paga', 'pendente'].indexOf(x.status) >= 0) meusApps[x.app] = 1; });
      if (!doCache) indicacao();
      raiz.innerHTML = aviso + (doCache ? '<div class="conta-aviso" data-aviso-cache>Atualizando a lista…</div>' : '') + busca() + (l.length ? '<h2 class="conta-titulo">Seus sistemas</h2>' + l.map(cartao).join('') :
        '<div class="conta-vazio"><div class="conta-vazio-fotos" aria-hidden="true"><img src="img/sistemas/crm.webp?v=11" alt="" loading="lazy"><img src="img/sistemas/agenda.webp?v=11" alt="" loading="lazy"><img src="img/sistemas/financeiro.webp?v=11" alt="" loading="lazy"></div><h3>Você ainda não tem testes nem assinaturas</h3><p>Escolha um dos sistemas e teste 7 dias grátis com os dados da sua empresa.</p><a class="btn btn-primary" href="sistemas.html">Ver os sistemas</a></div>');
      if (termo) filtrar();
    }
  }
  function busca() {
    return '<div class="conta-busca"><label class="vh" for="conta-q">Procurar sistema</label><input id="conta-q" type="search" value="' + esc(termo) + '" placeholder="Procurar sistema pelo nome (ex.: agenda, farmácia, CRM)" autocomplete="off"><div class="conta-busca-res" data-busca-res></div></div>';
  }
  // busca: compara com o começo das palavras (nome do sistema, ramo); sugestões de outros sistemas só com 2 letras ou mais
  var termo = '', meusApps = {};
  function bate(texto, q) { var n = normal(texto); return q.split(/\s+/).filter(Boolean).every(function (t) { return n.indexOf(t) >= 0; }); }
  function filtrar() {
    var q = normal(termo.trim()), vistos = 0;
    raiz.querySelectorAll('.conta-item').forEach(function (it) { var ok = !q || bate(it.getAttribute('data-busca') || '', q); it.style.display = ok ? '' : 'none'; if (ok) vistos++; /* o cartão tem display próprio: o atributo hidden não esconde */ });
    var tit = raiz.querySelector('.conta-titulo'); if (tit) tit.style.display = q && !vistos ? 'none' : '';
    var res = raiz.querySelector('[data-busca-res]'); if (!res) return;
    if (!q) { res.innerHTML = ''; return; }
    var outros = q.length < 2 ? [] : Object.keys(CAT).filter(function (k) { return !meusApps[k] && FORA_DE_VENDA.indexOf(k) < 0 && bate(CAT[k][0], q); });
    res.innerHTML = (vistos ? '' : '<p class="conta-busca-nada">Nenhum dos seus sistemas tem esse nome.</p>') + outros.map(function (k) { var pg = PAGINA[k] || 'veltria-' + k + '.html'; return '<div class="conta-busca-item"><b>' + esc(CAT[k][0]) + '</b><span>' + 'Você ainda não tem este sistema.</span><a class="btn btn-primary" href="' + pg + '">Ver e testar 7 dias grátis</a></div>'; }).join('');
  }
  raiz.addEventListener('input', function (e) { if (e.target.id !== 'conta-q') return; termo = e.target.value; filtrar(); });
  raiz.addEventListener('click', function (e) {
    if (e.target.closest('[data-recarregar]')) { carregar(); return; }
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

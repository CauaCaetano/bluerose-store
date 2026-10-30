// Bastos Lacerda · topo que encolhe, filtro por área no site todo, desfoque ao entrar, painel preso Áreas/Setores,
// frase que acende com a rolagem, radar jurídico, sócios com "mostrar mais", triagem do problema e andamento de processo.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FILTROS = [['todas', 'Todas'], ['trib', 'Tributário'], ['trab', 'Trabalhista'], ['contr', 'Contratos'], ['soc', 'Societário']];

  // sócios: nome, foto, área, formação, filtro, cargo
  var SO = [
    ['Ricardo Bastos', 'ricardo-bastos', 'Tributário', 'Mestre pela FGV, ex-conselheiro do CARF', 'trib', 'Sócio fundador'],
    ['Helena Lacerda', 'helena-lacerda', 'Trabalhista empresarial', 'Especialista pela PUC-SP, 22 anos de contencioso', 'trab', 'Sócia fundadora'],
    ['Marcelo Viana', 'marcelo-viana', 'Contratos e cobrança', 'LL.M. pela Columbia, contratos internacionais', 'contr', 'Sócio'],
    ['Camila Duarte', 'camila-duarte', 'Societário, M&A e LGPD', 'DPO certificada, 140 operações de M&A acompanhadas', 'soc', 'Sócia'],
    ['André Fontes', 'andre-fontes', 'Contencioso cível, arbitragem e compliance', 'Doutor pela USP, árbitro em câmaras de São Paulo', 'contr', 'Sócio'],
    ['Juliana Prado', 'juliana-prado', 'Propriedade intelectual e marcas', 'Mestre pela PUC-SP, 15 anos com registro de marcas', 'soc', 'Sócia'],
    ['Beatriz Nogueira', 'beatriz-nogueira', 'Imobiliário empresarial', 'Especialista pelo Insper, locação comercial e built to suit', 'contr', 'Sócia'],
    ['Lucas Amaral', 'plantao', 'Plantão de triagem', 'Lê cada caso e encaminha ao sócio certo em até 4 horas úteis', 'todas', 'Coordenador do plantão']
  ];
  // área: nome, palavras, sócio, prazo, documentos, primeiro passo, filtro
  var AR = [
    ['Tributário', ['receita', 'autuac', 'imposto', 'pis', 'cofins', 'icms', 'tribut', 'fisco', 'multa fiscal', 'iss', 'cbs', 'ibs'], 0, '30 dias para a defesa administrativa', 'auto de infração, notificações e guias do período', 'Não pague nem parcele antes da análise: há prazo de 30 dias para impugnar.', 'trib'],
    ['Trabalhista empresarial', ['funcionario', 'empregado', 'trabalhista', 'reclamac', 'demiti', 'sindicato', 'ex-func', 'acao trabalh', 'clt', 'nr-1', 'assedio'], 1, 'audiência em 60 a 120 dias', 'cartões de ponto, holerites e contrato de trabalho', 'Separe cartões de ponto, holerites e contrato: a defesa sai em até 15 dias.', 'trab'],
    ['Contratos e cobrança', ['contrato', 'nao paga', 'cobranc', 'inadimpl', 'divida', 'fornecedor', 'cliente', 'boleto', 'venceu'], 2, 'notificação em 48 h, ação em 2 semanas', 'contrato, notas fiscais e conversas da cobrança', 'Antes de ir à justiça, uma notificação extrajudicial formaliza a cobrança e conta prazo.', 'contr'],
    ['Societário e M&A', ['socio', 'sociedade', 'quotas', 'acordo de socios', 'tirar um socio', 'venda da empresa', 'investidor', 'comprar empresa'], 3, '30 a 90 dias', 'contrato social, alterações e acordo de sócios', 'Antes de qualquer conversa com o sócio, revisamos o contrato social e o acordo de sócios.', 'soc'],
    ['LGPD e incidentes de dados', ['dados', 'vazar', 'vazaram', 'lgpd', 'hacker', 'privacidade', 'anpd', 'incidente'], 3, 'comunicação à ANPD em até 3 dias úteis', 'registros do sistema e a lista do que vazou', 'Preserve os registros e não apague nada: o prazo legal de comunicação já está correndo.', 'soc'],
    ['Contencioso cível e arbitragem', ['processo', 'processad', 'arbitrag', 'indeniza', 'citac', 'liminar', 'execuc'], 4, 'contestação em 15 dias úteis', 'citação, contrato e e-mails sobre o caso', 'Anote a data em que a empresa foi citada: o prazo de 15 dias úteis conta a partir dela.', 'contr'],
    ['Propriedade intelectual', ['marca', 'inpi', 'patente', 'copia', 'plagio', 'software', 'direito autoral'], 5, 'pedido no INPI em até 5 dias', 'logotipo, nome e data do primeiro uso', 'Faça a busca de anterioridade antes de investir na marca: ela mostra se o nome está livre.', 'soc'],
    ['Imobiliário empresarial', ['aluguel', 'locac', 'imovel', 'despejo', 'galpao', 'loja', 'renovatoria'], 6, 'renovatória até 6 meses antes do fim', 'contrato de locação e aditivos', 'Na locação comercial, a ação renovatória tem janela: entre 1 ano e 6 meses antes do fim do contrato.', 'contr'],
    ['Compliance e anticorrupção', ['compliance', 'corrupc', 'propina', 'licitac', 'denuncia', 'canal de etica', 'fraude'], 4, 'plano de resposta em 72 h', 'relato recebido e políticas internas', 'Não confronte os envolvidos antes de preservar provas e definir quem conduz a apuração.', 'contr']
  ];
  var SETORES = [['Indústria', 'contratos de fornecimento e passivo trabalhista'], ['Varejo e e-commerce', 'consumidor, marcas e LGPD'], ['Tecnologia e startups', 'investimento, stock options e software'], ['Agronegócio', 'CPR, tributário e sucessão'], ['Saúde', 'contratos com operadoras e dados sensíveis'], ['Construção e incorporação', 'distratos, obras e locação'], ['Logística', 'transporte, seguro e frota'], ['Serviços financeiros', 'regulação e contratos bancários'], ['Educação', 'mensalidades, contratos e dados de alunos'], ['Energia', 'geração distribuída e contratos de longo prazo'], ['Alimentação e franquias', 'COF, marcas e cadeia de fornecedores'], ['Holdings familiares', 'planejamento sucessório e acordo de família']];
  // radar: tipo, filtro, título, data, resumo
  var RD = [
    ['Artigo', 'trib', 'Reforma tributária: o que revisar na empresa antes de 2027', '2026-10-29', 'Em 2027 a CBS passa a valer no lugar de PIS e Cofins. Revise contratos de longo prazo (eles precisam de cláusula de reequilíbrio de preço) e o cadastro de fornecedores, porque o crédito depende do imposto pago na etapa anterior.'],
    ['Prazo', 'trab', 'NR-1: riscos psicossociais entram no gerenciamento de riscos', '2026-10-23', 'Desde maio de 2026, estresse, assédio e sobrecarga precisam aparecer no inventário de riscos da empresa. Atualize o PGR, registre as ações de prevenção e treine as lideranças.'],
    ['Prazo', 'soc', 'Vazamento de dados: 3 dias úteis para comunicar a ANPD', '2026-10-16', 'Pelo regulamento da ANPD, incidente que possa causar risco relevante aos titulares deve ser comunicado em até 3 dias úteis. Preserve os registros, avalie o impacto e prepare o aviso aos clientes atingidos.'],
    ['Artigo', 'contr', 'Cliente não paga: por que notificar antes de processar', '2026-10-15', 'A notificação extrajudicial formaliza a dívida, marca a data da mora e muitas vezes resolve sem processo. Se não resolver, ela vira prova na ação de cobrança.'],
    ['Artigo', 'soc', 'Acordo de sócios: 5 cláusulas que evitam briga na saída', '2026-10-12', 'Direito de preferência, tag along, drag along, forma de cálculo das quotas e prazo de não concorrência. Escritas antes do conflito, elas encurtam a saída de um sócio de meses para semanas.'],
    ['Prazo', 'trib', 'Autuação da Receita: 30 dias para apresentar a defesa', '2026-09-24', 'O prazo para impugnar um auto de infração federal é de 30 dias a partir da ciência. Enquanto a defesa é julgada, a cobrança fica suspensa e a empresa pode seguir emitindo certidão.']
  ];

  // âncoras com rolagem suave (feita aqui para não atrapalhar quem rola por código)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.hasAttribute('data-wa') || a.id === 'vamos') return;
    var alvo = document.getElementById(a.getAttribute('href').slice(1)); if (!alvo) return;
    e.preventDefault(); alvo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href'));
  });

  /* ---------- topo, menu e gaveta ---------- */
  var topo = $('#topo');
  function rolou() { topo.classList.toggle('rolou', scrollY > 60); }
  addEventListener('scroll', rolou, { passive: true }); rolou();
  var gav = $('#gaveta'), bm = $('#abrir-menu');
  function gaveta(abrir) { gav.hidden = !abrir; bm.setAttribute('aria-expanded', String(abrir)); bm.setAttribute('aria-label', abrir ? 'Fechar o menu' : 'Abrir o menu'); document.body.classList.toggle('gav-aberta', abrir); document.body.style.overflow = abrir ? 'hidden' : ''; }
  bm.addEventListener('click', function () { gaveta(gav.hidden); });
  gav.addEventListener('click', function (e) { if (e.target.closest('a')) gaveta(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gav.hidden) { gaveta(false); bm.focus(); } });
  $('#abrir-busca').addEventListener('click', function () { $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); setTimeout(function () { $('#prob').focus({ preventScroll: true }); }, calmo ? 0 : 700); });

  // menu ativo conforme a seção na tela
  var links = $$('.menu a');
  var obsMenu = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id); }); }); }, { rootMargin: '-45% 0px -50% 0px' });
  ['oque', 'areas', 'socios', 'processo', 'radar', 'assessoria', 'contato'].forEach(function (id) { var el = document.getElementById(id); if (el) obsMenu.observe(el); });

  /* ---------- desfoque e surgimento ao entrar ---------- */
  var obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
  $$('.borrar, .surge, .linha-foto').forEach(function (el, i) { if (el.classList.contains('surge')) el.style.transitionDelay = (i % 2) * 0.15 + 's'; obs.observe(el); });

  /* ---------- filtro por área (topo, radar e sócios) ---------- */
  var filtro = 'todas';
  $$('.filtros-sec').forEach(function (g) { g.innerHTML = FILTROS.map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="false">' + f[1] + '</button>'; }).join(''); });
  function aplicar(f) {
    filtro = f;
    $$('.filtros [data-f]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
    radar(); socios();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('.filtros [data-f]'); if (b) aplicar(b.dataset.f); });

  function radar() {
    var l = RD.filter(function (r) { return filtro === 'todas' || r[1] === filtro; });
    var nomeF = function (k) { return FILTROS.filter(function (f) { return f[0] === k; })[0][1]; };
    $('.radar-grade').innerHTML = l.length ? l.map(function (r, i) {
      var d = new Date(r[3] + 'T12:00:00');
      return '<article class="nota" style="animation-delay:' + i * 0.06 + 's"><p class="tags"><span class="tag">' + r[0] + '</span><span class="tag tag-f">' + nomeF(r[1]) + '</span></p><h3>' + r[2] + '</h3><time datetime="' + r[3] + '">' + d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</time><details><summary>Ler resumo</summary><p>' + r[4] + '</p></details></article>';
    }).join('') : '<p class="vazio">Nada novo nesta área neste mês.</p>';
  }

  var todos = false;
  function socios() {
    var l = SO.map(function (s, i) { return [s, i]; }).filter(function (x) { return filtro === 'todas' || x[0][4] === filtro || x[0][4] === 'todas'; });
    var vis = todos || filtro !== 'todas' ? l : l.slice(0, 6);
    $('.socios-grade').innerHTML = vis.map(function (x, k) {
      var s = x[0];
      return '<article class="cartao" style="animation-delay:' + k * 0.05 + 's"><div class="cartao-foto"><img src="img/' + s[1] + '.webp" alt="' + (s[1] === 'plantao' ? 'Advogado do plantão analisando documentos' : 'Retrato de ' + s[0]) + '" width="900" height="600"></div><div class="cartao-txt"><h3>' + s[0] + '</h3><p>' + s[3] + '</p><p class="tags"><span class="tag">' + s[5] + '</span><span class="tag tag-f">' + s[2] + '</span></p><button type="button" data-socio="' + x[1] + '">Falar com ' + s[0].split(' ')[0] + '</button></div></article>';
    }).join('');
    $('#mais').hidden = vis.length >= l.length;
  }
  $('#mais').addEventListener('click', function () { todos = true; socios(); var c = $$('.cartao')[6]; if (c) c.querySelector('button').focus({ preventScroll: true }); });
  $('.socios-grade').addEventListener('click', function (e) {
    var b = e.target.closest('[data-socio]'); if (!b) return;
    var a = AR.filter(function (x) { return x[2] === +b.dataset.socio; })[0];
    preencher(a ? 'Assunto de ' + a[0].toLowerCase() + ': ' + a[1][0] : 'Quero que o plantão analise o caso da minha empresa');
  });

  /* ---------- áreas e setores: o painel preso troca conforme a rolagem ---------- */
  $('#lista-areas').innerHTML = AR.map(function (a, i) { return '<li><button type="button" data-area="' + i + '"><b>' + a[0] + '</b><small>' + SO[a[2]][0] + ' · ' + a[3] + '</small></button></li>'; }).join('');
  $('#lista-setores').innerHTML = SETORES.map(function (s) { return '<li><span class="it"><b>' + s[0] + '</b><small>' + s[1] + '</small></span></li>'; }).join('');
  var secA = $('#areas'), abaAtual = 'areas';
  function aba(q) {
    if (q === abaAtual) return; abaAtual = q; secA.dataset.aba = q;
    $('#tab-areas').setAttribute('aria-selected', String(q === 'areas')); $('#tab-setores').setAttribute('aria-selected', String(q === 'setores'));
    $('#lista-areas').hidden = q !== 'areas'; $('#lista-setores').hidden = q !== 'setores';
  }
  var largo = matchMedia('(min-width: 901px)');
  $('#tab-areas').addEventListener('click', function () { if (largo.matches) scrollTo({ top: secA.offsetTop, behavior: calmo ? 'auto' : 'smooth' }); aba('areas'); });
  $('#tab-setores').addEventListener('click', function () { if (largo.matches) scrollTo({ top: secA.offsetTop + secA.offsetHeight - innerHeight - 2, behavior: calmo ? 'auto' : 'smooth' }); aba('setores'); });
  $('#lista-areas').addEventListener('click', function (e) { var b = e.target.closest('[data-area]'); if (!b) return; var a = AR[+b.dataset.area]; preencher('Assunto de ' + a[0].toLowerCase() + ': ' + a[1][0]); });

  /* ---------- frase da faixa acende linha por linha ---------- */
  var fx = $('.faixa'), linhas = $$('.faixa-txt span');
  function quadro() {
    if (largo.matches) {
      var r = secA.getBoundingClientRect(), p = -r.top / Math.max(1, r.height - innerHeight);
      if (r.top < innerHeight && r.bottom > 0) aba(p > 0.5 ? 'setores' : 'areas');
    }
    var f = fx.getBoundingClientRect(), t = 1 - (f.top + f.height * 0.5) / innerHeight; // 0 quando entra, ~0.5 no meio da tela
    linhas.forEach(function (s, i) { var v = Math.min(1, Math.max(0.3, (t - 0.12 - i * 0.14) * 4)); s.style.setProperty('--o', v.toFixed(3)); });
  }
  var pend = false;
  addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; quadro(); }); } }, { passive: true });
  addEventListener('resize', quadro); quadro();

  /* ---------- triagem ---------- */
  function achar(t) {
    var q = sem(t), melhor = null, pts = 0;
    AR.forEach(function (a) { var n = a[1].filter(function (p) { return q.indexOf(p) > -1; }).length; if (n > pts) { pts = n; melhor = a; } });
    return melhor;
  }
  var res = $('#resultado');
  function mostrar() {
    var t = $('#prob').value.trim(); if (t.length < 6) { res.hidden = true; return; }
    var a = achar(t), tt = esc(t.replace(/"/g, ''));
    if (!a) { res.hidden = false; res.innerHTML = '<div class="rs-a"><p class="tags"><span class="tag">Triagem</span></p><h3>Precisamos de um pouco mais de detalhe</h3><p style="font-size:13.5px;color:var(--cinza)">Conte o que aconteceu, com quem e desde quando. Um advogado do plantão lê e encaminha ao sócio certo em até 4 horas úteis.</p></div><div class="rs-b"><img src="img/plantao.webp" alt="Advogado do plantão"><div><small>plantão de triagem</small><h3>Lucas Amaral</h3><p>Coordenador do plantão</p></div><a class="pilula" href="#" data-wa="Olá, Bastos Lacerda Advogados! Meu caso: ' + tt + '">Enviar para o plantão</a></div>'; return; }
    var s = SO[a[2]], dias = [], agora = new Date();
    for (var k = 0; dias.length < 3; k++) { var d = new Date(); d.setDate(d.getDate() + k); if (d.getDay() % 6) dias.push(d); }
    var h = dias.map(function (d, i) {
      var hoje = d.toDateString() === agora.toDateString();
      return ['09:30', '14:00', '17:30'].filter(function (x, j) { return (!hoje || +x.slice(0, 2) > agora.getHours() + 3) && (d.getDate() + j + a[2]) % 3; }).map(function (x) {
        var r = (i === 0 && hoje ? 'hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })) + ' ' + x;
        return '<button type="button" data-slot="' + r + '" aria-pressed="false">' + r + '</button>';
      }).join('');
    }).join('');
    res.hidden = false;
    res.innerHTML = '<div class="rs-a"><p class="tags"><span class="tag">' + a[0] + '</span><span class="tag tag-f">primeira resposta em até 4 h</span></p><h3>' + a[5] + '</h3><dl><div><dt>prazo típico</dt><dd>' + a[3] + '</dd></div><div><dt>o que separar</dt><dd>' + a[4] + '</dd></div><div><dt>quem responde</dt><dd>' + s[0] + '</dd></div></dl></div>' +
      '<div class="rs-b"><img src="img/' + s[1] + '.webp" alt="' + s[0] + '"><div><small>sócio responsável</small><h3>' + s[0] + '</h3><p>' + s[3] + '</p></div><div class="slots" role="group" aria-label="Horários livres">' + h + '</div><a class="pilula" href="#" data-wa-socio data-wa="Olá, Bastos Lacerda Advogados! Quero falar com ' + s[0] + ' sobre: ' + tt + '">Pedir conversa por vídeo</a></div>';
  }
  function preencher(t) { $('#prob').value = t; mostrar(); $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); }
  $('#prob').addEventListener('input', mostrar);
  $('.exemplos').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $('#prob').value = b.textContent; mostrar(); res.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'nearest' }); });
  $('#triagem').addEventListener('submit', function (e) { e.preventDefault(); var t = $('#prob').value.trim(); if (t.length >= 6 && window.BR_WA) window.BR_WA('Olá, Bastos Lacerda Advogados! Meu caso: ' + t); });
  $('#mini').addEventListener('submit', function (e) { e.preventDefault(); var t = $('#mini-t').value.trim(); if (t) preencher(t); else { $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); } });
  $('#vamos').addEventListener('click', function (e) { e.preventDefault(); $('#prob').focus(); });
  res.addEventListener('click', function (e) {
    var b = e.target.closest('[data-slot]'); if (!b) return;
    $$('[data-slot]', res).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var a = $('[data-wa-socio]', res); a.setAttribute('data-wa', a.getAttribute('data-wa').split(' | ')[0] + ' | Horário: ' + b.dataset.slot); a.textContent = 'Confirmar conversa · ' + b.dataset.slot;
  });

  /* ---------- andamento do processo ---------- */
  var MOV = [['Hoje, 10:12', 'Juntada a manifestação do escritório sobre o laudo pericial', 'prazo cumprido 3 dias antes'], ['21/10', 'Laudo pericial contábil entregue', 'prazo de 15 dias para manifestação'], ['02/09', 'Audiência de conciliação', 'sem acordo; perícia determinada'], ['14/07', 'Contestação protocolada', ''], ['03/06', 'Citação da empresa', 'distribuído à 12ª Vara Cível']];
  function proc(e) {
    if (e) e.preventDefault();
    var n = $('#num').value.replace(/\D/g, '');
    $('.mov').innerHTML = n.length !== 20 ? '<li><b>Número incompleto</b><span>O número do processo tem 20 dígitos, no formato 0000000-00.0000.0.00.0000.</span></li>' : MOV.map(function (m) { return '<li><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></li>'; }).join('') + '<li><b>Próximo passo</b><span>Sentença prevista para dezembro · você é avisado no WhatsApp</span></li>';
  }
  $('#proc').addEventListener('submit', proc); proc();

  radar(); socios();
})();

// Bastos Lacerda · topo que encolhe, filtro por área no site todo, desfoque ao entrar, painel preso Áreas/Setores,
// frase que acende com a rolagem, radar jurídico, sócios com "mostrar mais", triagem do problema e andamento de processo.
// As páginas internas (escritório, áreas, equipe, publicações, carreiras, contato) usam o mesmo arquivo:
// cada bloco só roda quando o elemento dele existe na página.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FILTROS = [['todas', 'Todas'], ['trib', 'Tributário'], ['trab', 'Trabalhista'], ['contr', 'Contratos'], ['soc', 'Societário']];

  // sócios: nome, foto, área, formação, filtro, cargo, apresentação
  var SO = [
    ['Ricardo Bastos', 'ricardo-bastos', 'Tributário', 'Mestre pela FGV, ex-conselheiro do CARF', 'trib', 'Sócio fundador', 'Fundou o escritório em 1994. Passou seis anos no CARF julgando recursos de contribuintes e hoje coordena a defesa em autuações federais e estaduais e o planejamento da transição para a CBS e o IBS.'],
    ['Helena Lacerda', 'helena-lacerda', 'Trabalhista empresarial', 'Especialista pela PUC-SP, 22 anos de contencioso', 'trab', 'Sócia fundadora', 'Cuida do trabalhista do lado da empresa: defesa em reclamações, negociação com sindicatos, programas de prevenção e a adequação à nova NR-1 sobre riscos psicossociais.'],
    ['Marcelo Viana', 'marcelo-viana', 'Contratos e cobrança', 'LL.M. pela Columbia, contratos internacionais', 'contr', 'Sócio', 'Redige e revisa contratos de fornecimento, distribuição e prestação de serviços, inclusive em inglês, e conduz a cobrança de clientes inadimplentes, da notificação à execução.'],
    ['Camila Duarte', 'camila-duarte', 'Societário, M&A e LGPD', 'DPO certificada, 140 operações de M&A acompanhadas', 'soc', 'Sócia', 'Atua em contrato social, acordo de sócios, entrada de investidores e compra e venda de empresas. Também lidera o time de proteção de dados e a resposta a incidentes.'],
    ['André Fontes', 'andre-fontes', 'Contencioso cível, arbitragem e compliance', 'Doutor pela USP, árbitro em câmaras de São Paulo', 'contr', 'Sócio', 'Conduz processos cíveis e arbitragens empresariais e estrutura programas de integridade, canais de denúncia e investigações internas.'],
    ['Juliana Prado', 'juliana-prado', 'Propriedade intelectual e marcas', 'Mestre pela PUC-SP, 15 anos com registro de marcas', 'soc', 'Sócia', 'Registra e defende marcas, softwares e desenhos industriais no INPI e cuida de contratos de licença, franquia e cessão de direitos.'],
    ['Beatriz Nogueira', 'beatriz-nogueira', 'Imobiliário empresarial', 'Especialista pelo Insper, locação comercial e built to suit', 'contr', 'Sócia', 'Assessora empresas em locação de lojas, galpões e escritórios, contratos built to suit, ações renovatórias e compra de imóveis para a operação.'],
    ['Lucas Amaral', 'plantao', 'Plantão de triagem', 'Lê cada caso e encaminha ao sócio certo em até 4 horas úteis', 'todas', 'Coordenador do plantão', 'Coordena o plantão que lê cada mensagem que chega, separa os prazos urgentes e encaminha ao sócio da área com o resumo do caso.']
  ];
  // área: nome, palavras, sócio, prazo, documentos, primeiro passo, filtro, página
  var AR = [
    ['Tributário', ['receita', 'autuac', 'imposto', 'pis', 'cofins', 'icms', 'tribut', 'fisco', 'multa fiscal', 'iss', 'cbs', 'ibs'], 0, '30 dias para a defesa administrativa', 'auto de infração, notificações e guias do período', 'Não pague nem parcele antes da análise: há prazo de 30 dias para impugnar.', 'trib', 'tributario'],
    ['Trabalhista empresarial', ['funcionario', 'empregado', 'trabalhista', 'reclamac', 'demiti', 'sindicato', 'ex-func', 'acao trabalh', 'clt', 'nr-1', 'assedio'], 1, 'audiência em 60 a 120 dias', 'cartões de ponto, holerites e contrato de trabalho', 'Separe cartões de ponto, holerites e contrato: a defesa sai em até 15 dias.', 'trab', 'trabalhista'],
    ['Contratos e cobrança', ['contrato', 'nao paga', 'cobranc', 'inadimpl', 'divida', 'fornecedor', 'cliente', 'boleto', 'venceu'], 2, 'notificação em 48 h, ação em 2 semanas', 'contrato, notas fiscais e conversas da cobrança', 'Antes de ir à justiça, uma notificação extrajudicial formaliza a cobrança e conta prazo.', 'contr', 'contratos'],
    ['Societário e M&A', ['socio', 'sociedade', 'quotas', 'acordo de socios', 'tirar um socio', 'venda da empresa', 'investidor', 'comprar empresa'], 3, '30 a 90 dias', 'contrato social, alterações e acordo de sócios', 'Antes de qualquer conversa com o sócio, revisamos o contrato social e o acordo de sócios.', 'soc', 'societario'],
    ['LGPD e incidentes de dados', ['dados', 'vazar', 'vazaram', 'lgpd', 'hacker', 'privacidade', 'anpd', 'incidente'], 3, 'comunicação à ANPD em até 3 dias úteis', 'registros do sistema e a lista do que vazou', 'Preserve os registros e não apague nada: o prazo legal de comunicação já está correndo.', 'soc', 'lgpd'],
    ['Contencioso cível e arbitragem', ['processo', 'processad', 'arbitrag', 'indeniza', 'citac', 'liminar', 'execuc'], 4, 'contestação em 15 dias úteis', 'citação, contrato e e-mails sobre o caso', 'Anote a data em que a empresa foi citada: o prazo de 15 dias úteis conta a partir dela.', 'contr', 'contencioso'],
    ['Propriedade intelectual', ['marca', 'inpi', 'patente', 'copia', 'plagio', 'software', 'direito autoral'], 5, 'pedido no INPI em até 5 dias', 'logotipo, nome e data do primeiro uso', 'Faça a busca de anterioridade antes de investir na marca: ela mostra se o nome está livre.', 'soc', 'propriedade-intelectual'],
    ['Imobiliário empresarial', ['aluguel', 'locac', 'imovel', 'despejo', 'galpao', 'loja', 'renovatoria'], 6, 'renovatória até 6 meses antes do fim', 'contrato de locação e aditivos', 'Na locação comercial, a ação renovatória tem janela: entre 1 ano e 6 meses antes do fim do contrato.', 'contr', 'imobiliario'],
    ['Compliance e anticorrupção', ['compliance', 'corrupc', 'propina', 'licitac', 'denuncia', 'canal de etica', 'fraude'], 4, 'plano de resposta em 72 h', 'relato recebido e políticas internas', 'Não confronte os envolvidos antes de preservar provas e definir quem conduz a apuração.', 'contr', 'compliance']
  ];
  var SETORES = [['Indústria', 'contratos de fornecimento e passivo trabalhista'], ['Varejo e e-commerce', 'consumidor, marcas e LGPD'], ['Tecnologia e startups', 'investimento, stock options e software'], ['Agronegócio', 'CPR, tributário e sucessão'], ['Saúde', 'contratos com operadoras e dados sensíveis'], ['Construção e incorporação', 'distratos, obras e locação'], ['Logística', 'transporte, seguro e frota'], ['Serviços financeiros', 'regulação e contratos bancários'], ['Educação', 'mensalidades, contratos e dados de alunos'], ['Energia', 'geração distribuída e contratos de longo prazo'], ['Alimentação e franquias', 'COF, marcas e cadeia de fornecedores'], ['Holdings familiares', 'planejamento sucessório e acordo de família']];
  // publicações: tipo, filtro, título, data, resumo, endereço, áreas, autor (sócio), texto completo
  var RD = [
    ['Artigo', 'trib', 'Reforma tributária: o que revisar na empresa antes de 2027', '2026-10-29', 'Em 2027 a CBS passa a valer no lugar de PIS e Cofins. Revise contratos de longo prazo (eles precisam de cláusula de reequilíbrio de preço) e o cadastro de fornecedores, porque o crédito depende do imposto pago na etapa anterior.', 'reforma-tributaria-2027', ['tributario', 'contratos'], 0,
      ['A Lei Complementar 214/2025 manda a CBS substituir o PIS e a Cofins a partir de janeiro de 2027, enquanto o IBS entra aos poucos no lugar do ICMS e do ISS até 2033. Para a maior parte das empresas, a mudança mais imediata não é a alíquota, e sim a forma de tomar crédito.', 'No modelo novo, o crédito depende do imposto efetivamente pago pelo fornecedor. Fornecedor que atrasa ou sonega pode deixar a sua empresa sem crédito. Vale revisar o cadastro de fornecedores agora e incluir nos contratos a obrigação de emitir a nota corretamente e de manter a situação fiscal em dia.', 'Contratos de longo prazo, como fornecimento, locação e prestação de serviços continuados, precisam de uma cláusula de reequilíbrio: quando o custo tributário muda, as partes renegociam o preço por uma regra combinada antes, e não no meio de uma discussão.']],
    ['Prazo', 'trab', 'NR-1: riscos psicossociais entram no gerenciamento de riscos', '2026-10-23', 'Desde maio de 2026, estresse, assédio e sobrecarga precisam aparecer no inventário de riscos da empresa. Atualize o PGR, registre as ações de prevenção e treine as lideranças.', 'nr1-riscos-psicossociais', ['trabalhista', 'compliance'], 1,
      ['A nova redação da NR-1 obriga as empresas a identificar e tratar os fatores de risco psicossociais no Programa de Gerenciamento de Riscos (PGR). Metas inalcançáveis, jornadas longas, assédio e falta de clareza sobre funções passam a ser riscos ocupacionais como ruído ou altura.', 'Na prática, o PGR precisa listar esses riscos por setor, dizer quais medidas de prevenção foram adotadas e quem responde por elas. Um canal para relatos e o treinamento das lideranças costumam ser as primeiras medidas.', 'A fiscalização do trabalho pode cobrar o documento atualizado, e um PGR que ignora o tema pesa contra a empresa em ações sobre adoecimento.']],
    ['Prazo', 'soc', 'Vazamento de dados: 3 dias úteis para comunicar a ANPD', '2026-10-16', 'Pelo regulamento da ANPD, incidente que possa causar risco relevante aos titulares deve ser comunicado em até 3 dias úteis. Preserve os registros, avalie o impacto e prepare o aviso aos clientes atingidos.', 'vazamento-de-dados-anpd', ['lgpd'], 3,
      ['O Regulamento de Comunicação de Incidente de Segurança da ANPD (Resolução CD/ANPD 15/2024) fixa o prazo de 3 dias úteis, contados do conhecimento do incidente, para comunicar a autoridade e os titulares quando houver risco ou dano relevante.', 'O primeiro passo é técnico: conter o acesso, preservar os registros do sistema e não apagar nada. O segundo é jurídico: avaliar quais dados foram expostos, de quantas pessoas e qual o risco para elas.', 'A comunicação precisa dizer o que aconteceu, quais dados foram afetados, as medidas tomadas e o contato do encarregado. Guarde o registro do incidente por pelo menos cinco anos, mesmo que ele não precise ser comunicado.']],
    ['Artigo', 'contr', 'Cliente não paga: por que notificar antes de processar', '2026-10-15', 'A notificação extrajudicial formaliza a dívida, marca a data da mora e muitas vezes resolve sem processo. Se não resolver, ela vira prova na ação de cobrança.', 'notificar-antes-de-processar', ['contratos', 'contencioso'], 2,
      ['Quando o contrato não traz data certa de pagamento, é a notificação que coloca o devedor em mora. A partir dela correm juros e multa, e fica registrado que a empresa cobrou formalmente.', 'A notificação bem feita lista o valor, a origem da dívida, o prazo para pagar e o que acontece depois. Muitas cobranças terminam aqui, com um acordo de parcelamento assinado.', 'Se não houver resposta, a notificação vira prova na ação. Contratos com título executivo, como duplicatas aceitas ou confissões de dívida, permitem ir direto à execução, que é mais rápida.']],
    ['Artigo', 'soc', 'Acordo de sócios: 5 cláusulas que evitam briga na saída', '2026-10-12', 'Direito de preferência, tag along, drag along, forma de cálculo das quotas e prazo de não concorrência. Escritas antes do conflito, elas encurtam a saída de um sócio de meses para semanas.', 'acordo-de-socios-5-clausulas', ['societario'], 3,
      ['O contrato social diz quem são os sócios. O acordo de sócios diz o que acontece quando um deles quer sair, morre, se divorcia ou deixa de trabalhar na empresa.', 'Cinco cláusulas resolvem a maior parte das disputas: direito de preferência (os sócios compram primeiro), tag along (o minoritário pode vender junto), drag along (a maioria pode levar todos numa venda), a fórmula de cálculo do valor das quotas e o prazo de não concorrência.', 'Escrever essas regras com a empresa em paz custa pouco. Discutir sem elas, no meio de um conflito, costuma levar meses e travar a operação.']],
    ['Prazo', 'trib', 'Autuação da Receita: 30 dias para apresentar a defesa', '2026-09-24', 'O prazo para impugnar um auto de infração federal é de 30 dias a partir da ciência. Enquanto a defesa é julgada, a cobrança fica suspensa e a empresa pode seguir emitindo certidão.', 'autuacao-30-dias', ['tributario'], 0,
      ['O Decreto 70.235/1972 dá 30 dias, contados da ciência do auto de infração, para a impugnação. A ciência pode ser pessoal, por correio ou pelo domicílio tributário eletrônico, que muitas empresas esquecem de acompanhar.', 'Enquanto a impugnação é julgada, a exigência fica suspensa e a empresa continua podendo emitir certidão positiva com efeitos de negativa, o que mantém contratos e financiamentos em dia.', 'Pagar ou parcelar antes de analisar o auto pode significar abrir mão da defesa. Separe o auto, as notificações e as guias do período e peça a análise logo nos primeiros dias.']],
    ['Artigo', 'soc', 'Marca nova: faça a busca de anterioridade antes de lançar', '2026-09-18', 'Antes de imprimir embalagem ou contratar agência, confira no INPI se o nome já tem dono na sua classe. A busca leva poucos dias e evita trocar de marca depois do lançamento.', 'busca-de-anterioridade', ['propriedade-intelectual'], 5,
      ['No Brasil, a marca pertence a quem registra primeiro no INPI, e não a quem usa primeiro. Lançar um produto com um nome já depositado por outra empresa pode obrigar a recolher embalagens e trocar a identidade visual.', 'A busca de anterioridade confere nomes iguais e parecidos nas classes de produtos e serviços em que a empresa atua. Ela indica o risco de conflito e se o nome tem chance de registro.', 'Com a busca limpa, o pedido de registro pode ser feito em poucos dias. A partir do depósito, a empresa já tem como se opor a pedidos posteriores parecidos.']],
    ['Prazo', 'contr', 'Locação comercial: a janela da ação renovatória', '2026-09-10', 'Quem aluga ponto comercial por 5 anos ou mais pode pedir a renovação na justiça, mas só entre 1 ano e 6 meses antes do fim do contrato. Perdida a janela, o direito acaba.', 'janela-da-renovatoria', ['imobiliario'], 6,
      ['A Lei do Inquilinato (Lei 8.245/1991, art. 51) protege o ponto comercial: com contrato escrito, prazo de pelo menos 5 anos e 3 anos no mesmo ramo, o inquilino pode exigir a renovação.', 'O prazo é rígido: a ação precisa ser proposta entre um ano e seis meses antes do fim do contrato. Antes ou depois disso, o juiz não pode renovar, e o proprietário fica livre para retomar o imóvel.', 'Vale anotar a janela no calendário assim que o contrato é assinado e começar a negociar o novo aluguel antes dela, com a ação como plano B.']],
    ['Artigo', 'contr', 'Canal de denúncias: o que a Lei Anticorrupção espera dele', '2026-09-03', 'Um canal que ninguém usa, ou que cai na caixa do diretor denunciado, não conta como programa de integridade. Independência, sigilo e registro das apurações fazem a diferença.', 'canal-de-denuncias', ['compliance'], 4,
      ['O Decreto 11.129/2022, que regulamenta a Lei Anticorrupção, lista o canal de denúncias entre os parâmetros de um programa de integridade efetivo, que pode reduzir multas em caso de punição.', 'Para funcionar, o canal precisa aceitar relatos anônimos, chegar a quem não está envolvido no fato e ter um fluxo de apuração com prazos e registro das decisões.', 'Quando chega um relato grave, o primeiro cuidado é preservar provas e definir quem conduz a apuração antes de qualquer conversa com os envolvidos.']],
    ['Prazo', 'contr', 'Citação recebida: 15 dias úteis para contestar', '2026-08-27', 'O prazo da contestação no processo civil é de 15 dias úteis e começa a contar da juntada da citação. Guarde o envelope ou o comprovante eletrônico com a data.', 'citacao-15-dias', ['contencioso'], 4,
      ['Pelo Código de Processo Civil, o réu tem 15 dias úteis para contestar. Fins de semana e feriados não contam, mas o prazo corre mesmo durante negociações com a outra parte.', 'Hoje muitas citações chegam por meio eletrônico, no endereço cadastrado pela empresa nos sistemas dos tribunais. Quem não acompanha esse cadastro corre o risco de perder o prazo sem perceber.', 'Na contestação vai toda a defesa e todos os documentos. O que não for alegado nesse momento, em regra, não pode ser alegado depois.']],
    ['Artigo', 'trab', 'Banco de horas: quando o acordo individual basta', '2026-08-20', 'O banco de horas por acordo individual escrito vale se a compensação acontecer em até 6 meses. Para prazos maiores, só com acordo ou convenção coletiva.', 'banco-de-horas', ['trabalhista'], 1,
      ['A CLT permite três formas de compensar horas extras: no mesmo mês, por acordo individual (tácito ou escrito); em até 6 meses, por acordo individual escrito; e em até 1 ano, só por negociação coletiva.', 'O erro mais comum é usar o banco de horas anual sem a norma coletiva que o autorize. Nesses casos, as horas acumuladas podem ser cobradas como extras, com adicional.', 'Controle de ponto confiável, saldo informado ao empregado e pagamento das horas não compensadas na rescisão completam a prevenção.']],
    ['Artigo', 'soc', 'Entrada de investidor: a auditoria começa em casa', '2026-08-12', 'Antes de receber o investidor, organize contrato social, marcas, contratos com clientes e pendências trabalhistas. Uma auditoria interna prévia encurta a negociação.', 'investidor-auditoria', ['societario', 'propriedade-intelectual'], 3,
      ['Todo investidor faz uma auditoria jurídica (due diligence) antes de assinar. Ela olha a estrutura societária, os contratos relevantes, as marcas e softwares, o passivo trabalhista e tributário e a conformidade com a LGPD.', 'Pendências encontradas nessa fase viram desconto no valor, garantias extras ou atraso no fechamento. Fazer uma revisão interna antes permite corrigir o que dá e explicar o que não dá.', 'Itens frequentes: marca registrada em nome de um sócio e não da empresa, software feito por terceiros sem cessão de direitos e acordo de sócios desatualizado.']]
  ];
  var nomeF = function (k) { return FILTROS.filter(function (f) { return f[0] === k; })[0][1]; };
  var pagArea = function (a) { return 'area-' + a[7] + '.html'; };
  var dataBR = function (s) { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };

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
  // a lupa leva à triagem: na própria página quando ela existe, senão à página de contato
  $('#abrir-busca').addEventListener('click', function () {
    if (!$('#prob')) { location.href = 'contato.html#contato'; return; }
    $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); setTimeout(function () { $('#prob').focus({ preventScroll: true }); }, calmo ? 0 : 700);
  });

  /* ---------- desfoque e surgimento ao entrar ---------- */
  var obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
  function observar(raiz) { $$('.borrar:not(.visto), .surge:not(.visto), .linha-foto:not(.visto)', raiz).forEach(function (el, i) { if (el.classList.contains('surge')) el.style.transitionDelay = (i % 2) * 0.15 + 's'; obs.observe(el); }); }
  observar();

  /* ---------- filtro por área (topo, publicações e sócios) ---------- */
  var filtro = 'todas';
  $$('.filtros-sec').forEach(function (g) { g.innerHTML = FILTROS.map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="false">' + f[1] + '</button>'; }).join(''); });
  function aplicar(f) {
    filtro = f;
    $$('.filtros [data-f]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
    radar(); socios();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('.filtros [data-f]'); if (b) aplicar(b.dataset.f); });

  // a grade de publicações aparece na home (6 mais recentes), em publicacoes.html (todas, com o texto completo)
  // e na página de cada área (data-area: só as daquela área)
  var grade = $('.radar-grade');
  function radar() {
    if (!grade) return;
    var completo = grade.hasAttribute('data-completo'), area = grade.getAttribute('data-area');
    var l = RD.filter(function (r) { return area ? r[6].indexOf(area) > -1 : filtro === 'todas' || r[1] === filtro; });
    if (!completo && !area) l = l.slice(0, 6);
    grade.innerHTML = l.length ? l.map(function (r, i) {
      var corpo = completo ? '<details id="' + r[5] + '"><summary>Ler o artigo</summary>' + r[8].map(function (p) { return '<p>' + p + '</p>'; }).join('') + '<p class="nota-autor">Por ' + SO[r[7]][0] + ', ' + SO[r[7]][5].toLowerCase() + ' · Conteúdo informativo, não substitui a análise do caso concreto.</p></details>'
        : '<details><summary>Ler resumo</summary><p>' + r[4] + '</p><p><a class="nota-link" href="publicacoes.html#' + r[5] + '">Ler o artigo completo</a></p></details>';
      return '<article class="nota" style="animation-delay:' + i * 0.06 + 's"><p class="tags"><span class="tag">' + r[0] + '</span><span class="tag tag-f">' + nomeF(r[1]) + '</span></p><h3>' + r[2] + '</h3><time datetime="' + r[3] + '">' + dataBR(r[3]) + '</time>' + (completo ? '<p class="nota-res">' + r[4] + '</p>' : '') + corpo + '</article>';
    }).join('') : '<p class="vazio">Nada publicado nesta área por enquanto. <a href="publicacoes.html">Ver todas as publicações</a></p>';
    // publicacoes.html#endereco abre e mostra o artigo pedido
    if (completo && location.hash) { var d = document.getElementById(location.hash.slice(1)); if (d && d.tagName === 'DETAILS') { d.open = true; setTimeout(function () { d.closest('.nota').scrollIntoView({ behavior: 'auto', block: 'start' }); }, 60); } }
  }

  var sgrade = $('.socios-grade'), todos = !!(sgrade && sgrade.hasAttribute('data-completo'));
  function socios() {
    if (!sgrade) return;
    var completo = sgrade.hasAttribute('data-completo');
    var l = SO.map(function (s, i) { return [s, i]; }).filter(function (x) { return filtro === 'todas' || x[0][4] === filtro || x[0][4] === 'todas'; });
    var vis = todos || filtro !== 'todas' ? l : l.slice(0, 6);
    sgrade.innerHTML = vis.map(function (x, k) {
      var s = x[0], areas = AR.filter(function (a) { return a[2] === x[1]; });
      return '<article class="cartao" style="animation-delay:' + k * 0.05 + 's"><div class="cartao-foto"><img src="img/' + s[1] + '.webp" alt="' + (s[1] === 'plantao' ? 'Advogado do plantão analisando documentos' : 'Retrato de ' + s[0]) + '" width="900" height="600"></div><div class="cartao-txt"><h3>' + s[0] + '</h3><p>' + s[3] + '</p>' +
        (completo ? '<p>' + s[6] + '</p>' + (areas.length ? '<p class="cartao-areas">' + areas.map(function (a) { return '<a href="' + pagArea(a) + '">' + a[0] + '</a>'; }).join('') + '</p>' : '') : '') +
        '<p class="tags"><span class="tag">' + s[5] + '</span><span class="tag tag-f">' + s[2] + '</span></p><button type="button" data-socio="' + x[1] + '">Falar com ' + s[0].split(' ')[0] + '</button></div></article>';
    }).join('');
  }
  if (sgrade) sgrade.addEventListener('click', function (e) {
    var b = e.target.closest('[data-socio]'); if (!b) return;
    var a = AR.filter(function (x) { return x[2] === +b.dataset.socio; })[0];
    preencher(a ? 'Assunto de ' + a[0].toLowerCase() + ': ' + a[1][0] : 'Quero que o plantão analise o caso da minha empresa');
  });

  /* ---------- áreas e setores: o painel preso troca conforme a rolagem (home) ---------- */
  var secA = $('#areas.areas'), abaAtual = 'areas', largo = matchMedia('(min-width: 901px)');
  if (secA) {
    $('#lista-areas').innerHTML = AR.map(function (a) { return '<li><a href="' + pagArea(a) + '"><b>' + a[0] + '</b><small>' + SO[a[2]][0] + ' · ' + a[3] + '</small></a></li>'; }).join('');
    $('#lista-setores').innerHTML = SETORES.map(function (s) { return '<li><span class="it"><b>' + s[0] + '</b><small>' + s[1] + '</small></span></li>'; }).join('');
    $('#tab-areas').addEventListener('click', function () { if (largo.matches) scrollTo({ top: secA.offsetTop, behavior: calmo ? 'auto' : 'smooth' }); aba('areas'); });
    $('#tab-setores').addEventListener('click', function () { if (largo.matches) scrollTo({ top: secA.offsetTop + secA.offsetHeight - innerHeight - 2, behavior: calmo ? 'auto' : 'smooth' }); aba('setores'); });
  }
  function aba(q) {
    if (q === abaAtual) return; abaAtual = q; secA.dataset.aba = q;
    $('#tab-areas').setAttribute('aria-selected', String(q === 'areas')); $('#tab-setores').setAttribute('aria-selected', String(q === 'setores'));
    $('#lista-areas').hidden = q !== 'areas'; $('#lista-setores').hidden = q !== 'setores';
  }

  /* ---------- frase da faixa acende linha por linha ---------- */
  var fx = $('.faixa'), linhas = $$('.faixa-txt span');
  function quadro() {
    if (secA && largo.matches) {
      var r = secA.getBoundingClientRect(), p = -r.top / Math.max(1, r.height - innerHeight);
      if (r.top < innerHeight && r.bottom > 0) aba(p > 0.5 ? 'setores' : 'areas');
    }
    if (!fx) return;
    var f = fx.getBoundingClientRect(), t = 1 - (f.top + f.height * 0.5) / innerHeight; // 0 quando entra, ~0.5 no meio da tela
    linhas.forEach(function (s, i) { var v = Math.min(1, Math.max(0.3, (t - 0.12 - i * 0.14) * 4)); s.style.setProperty('--o', v.toFixed(3)); });
  }
  if (secA || fx) {
    var pend = false;
    addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; quadro(); }); } }, { passive: true });
    addEventListener('resize', quadro); quadro();
  }

  /* ---------- triagem (home e contato) ---------- */
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
    res.innerHTML = '<div class="rs-a"><p class="tags"><span class="tag">' + a[0] + '</span><span class="tag tag-f">primeira resposta em até 4 h</span></p><h3>' + a[5] + '</h3><dl><div><dt>prazo típico</dt><dd>' + a[3] + '</dd></div><div><dt>o que separar</dt><dd>' + a[4] + '</dd></div><div><dt>quem responde</dt><dd>' + s[0] + '</dd></div></dl><p class="rs-area"><a href="' + pagArea(a) + '">Conhecer a área de ' + a[0].toLowerCase() + '</a></p></div>' +
      '<div class="rs-b"><img src="img/' + s[1] + '.webp" alt="' + s[0] + '"><div><small>sócio responsável</small><h3>' + s[0] + '</h3><p>' + s[3] + '</p></div><div class="slots" role="group" aria-label="Horários livres">' + h + '</div><a class="pilula" href="#" data-wa-socio data-wa="Olá, Bastos Lacerda Advogados! Quero falar com ' + s[0] + ' sobre: ' + tt + '">Pedir conversa por vídeo</a></div>';
  }
  // sem triagem na página, o pedido vai para a página de contato já preenchido
  function preencher(t) {
    if (!$('#prob')) { location.href = 'contato.html?caso=' + encodeURIComponent(t) + '#contato'; return; }
    $('#prob').value = t; mostrar(); $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
  }
  if ($('#triagem')) {
    $('#prob').addEventListener('input', mostrar);
    $('.exemplos').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $('#prob').value = b.textContent; mostrar(); res.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'nearest' }); });
    $('#triagem').addEventListener('submit', function (e) { e.preventDefault(); var t = $('#prob').value.trim(); if (t.length >= 6 && window.BR_WA) window.BR_WA('Olá, Bastos Lacerda Advogados! Meu caso: ' + t); });
    $('#vamos').addEventListener('click', function (e) { e.preventDefault(); $('#prob').focus(); });
    res.addEventListener('click', function (e) {
      var b = e.target.closest('[data-slot]'); if (!b) return;
      $$('[data-slot]', res).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var a = $('[data-wa-socio]', res); a.setAttribute('data-wa', a.getAttribute('data-wa').split(' | ')[0] + ' | Horário: ' + b.dataset.slot); a.textContent = 'Confirmar conversa · ' + b.dataset.slot;
    });
    var caso = new URLSearchParams(location.search).get('caso');
    if (caso) { $('#prob').value = caso.slice(0, 400); mostrar(); }
  }
  if ($('#mini')) $('#mini').addEventListener('submit', function (e) { e.preventDefault(); var t = $('#mini-t').value.trim(); if (t) preencher(t); else { $('#contato').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' }); } });
  // botões "Descrever o caso" das páginas de área: levam o assunto para a triagem
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-caso]'); if (b) { e.preventDefault(); preencher(b.getAttribute('data-caso')); } });

  /* ---------- andamento do processo (home) ---------- */
  var MOV = [['Hoje, 10:12', 'Juntada a manifestação do escritório sobre o laudo pericial', 'prazo cumprido 3 dias antes'], ['21/10', 'Laudo pericial contábil entregue', 'prazo de 15 dias para manifestação'], ['02/09', 'Audiência de conciliação', 'sem acordo; perícia determinada'], ['14/07', 'Contestação protocolada', ''], ['03/06', 'Citação da empresa', 'distribuído à 12ª Vara Cível']];
  function proc(e) {
    if (e) e.preventDefault();
    var n = $('#num').value.replace(/\D/g, '');
    $('.mov').innerHTML = n.length !== 20 ? '<li><b>Número incompleto</b><span>O número do processo tem 20 dígitos, no formato 0000000-00.0000.0.00.0000.</span></li>' : MOV.map(function (m) { return '<li><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></li>'; }).join('') + '<li><b>Próximo passo</b><span>Sentença prevista para dezembro · você é avisado no WhatsApp</span></li>';
  }
  if ($('#proc')) { $('#proc').addEventListener('submit', proc); proc(); }

  radar(); socios(); observar();
})();

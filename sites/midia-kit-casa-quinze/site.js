// Casa Quinze · mídia kit de agência (demonstração, 08/11/2026).
// Painel agregado calculado a partir de talentos.js, casting com filtro/busca/ordem, ficha por #talento-<id>,
// seleção de até 5 talentos (guardada neste navegador) e pedido de proposta pela simulação de WhatsApp da moldura.
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var T = window.CQ_TALENTOS || [], NICHOS = window.CQ_NICHOS || [], MAX = 5;
  var porId = {}; T.forEach(function (t) { porId[t.id] = t; });
  var nomeNicho = {}; NICHOS.forEach(function (n) { nomeNicho[n.id] = n.nome; });
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };
  var semAcento = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };

  // 150000 → "150 mil"; 1100000 → "1,1 mi"; 2050000 → "2,05 mi"; 3500 → "3,5 mil"
  function num(v) {
    if (v >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    if (v >= 1e3) { var k = v / 1e3; return k.toLocaleString('pt-BR', { maximumFractionDigits: k < 10 ? 1 : 0 }) + ' mil'; }
    return String(v);
  }
  var pct = function (v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
  var faixa = function (f) { return num(f[0]) + ' a ' + num(f[1]); };
  var faixaPct = function (f) { return pct(f[0]) + ' a ' + pct(f[1]); };
  var soma = function (lista) { return lista.reduce(function (s, t) { return s + t.seguidores; }, 0); };

  // ---------- seleção (até 5), guardada no navegador ----------
  var sel = [];
  try { sel = (JSON.parse(localStorage.getItem('cq-selecao') || '[]') || []).filter(function (id) { return porId[id]; }).slice(0, MAX); } catch (e) { sel = []; }
  function guardar() { try { localStorage.setItem('cq-selecao', JSON.stringify(sel)); } catch (e) {} }
  function avisar(msg) { $$('[data-aviso],[data-aviso-sel]').forEach(function (el) { el.textContent = msg; }); clearTimeout(avisar.t); avisar.t = setTimeout(function () { $$('[data-aviso],[data-aviso-sel]').forEach(function (el) { el.textContent = ''; }); }, 5000); }
  function alternar(id) {
    var i = sel.indexOf(id), t = porId[id];
    if (i >= 0) { sel.splice(i, 1); avisar(t.nome + ' saiu da sua seleção.'); }
    else if (sel.length >= MAX) { avisar('A seleção vai até 5 talentos. Remova um para incluir ' + t.nome + '.'); return; }
    else { sel.push(id); avisar(t.nome + ' entrou na sua seleção (' + sel.length + ' de 5).'); }
    guardar(); atualizarSel();
  }

  // ---------- capa: folha de contatos com os 15 ----------
  $('[data-folha]').innerHTML = T.map(function (t) {
    return '<li><a href="#talento-' + t.id + '"><img src="' + t.foto.replace('img/t-', 'img/th-') + '" alt="" width="240" height="300" decoding="async"><span class="fo-n">' + dois(t.n) + '</span><span class="fo-nome">' + esc(t.nome) + '</span></a></li>';
  }).join('');

  // ---------- painel agregado ----------
  (function painel() {
    var total = soma(T), engMin = Math.min.apply(null, T.map(function (t) { return t.eng[0]; })), engMax = Math.max.apply(null, T.map(function (t) { return t.eng[1]; }));
    var menor = T.reduce(function (a, b) { return a.seguidores < b.seguidores ? a : b; }), maior = T.reduce(function (a, b) { return a.seguidores > b.seguidores ? a : b; });
    var itens = [
      ['Talentos na casa', String(T.length), NICHOS.length + ' nichos'],
      ['Exposição potencial', num(total), 'seguidores somados · não é audiência única'],
      ['Porte dos perfis', num(menor.seguidores) + ' a ' + num(maior.seguidores), 'do menor ao maior perfil'],
      ['Engajamento por alcance', faixaPct([engMin, engMax]), 'faixa do elenco'],
      ['Alcance agregado', 'Não informado', 'depende de cada campanha; sai do relatório'],
      ['Conversões', 'Não informado', 'só com dado real da marca (cupom, link, vendas)']
    ];
    $('[data-painel]').innerHTML = itens.map(function (i) { return '<div' + (i[1] === 'Não informado' ? ' class="ni"' : '') + '><dt>' + i[0] + '</dt><dd>' + i[1] + '</dd><p>' + i[2] + '</p></div>'; }).join('');
    var grupos = NICHOS.map(function (n) { var l = T.filter(function (t) { return t.nicho === n.id; }); return { n: n, l: l, s: soma(l) }; });
    var topo = Math.max.apply(null, grupos.map(function (g) { return g.s; }));
    $('[data-barras]').innerHTML = grupos.map(function (g) {
      return '<li><span class="ba-nome">' + g.n.nome + ' <small>' + g.l.length + (g.l.length > 1 ? ' talentos' : ' talento') + '</small></span><span class="ba-trilho"><span class="ba-barra" style="--w:' + Math.round(g.s / topo * 100) + '%"></span></span><span class="ba-valor">' + num(g.s) + '</span></li>';
    }).join('');
  })();

  // ---------- casting ----------
  var filtro = 'todos', busca = '', ordem = 'casa';
  $('[data-chips]').innerHTML = [{ id: 'todos', nome: 'Todos' }].concat(NICHOS).map(function (n) {
    var q = n.id === 'todos' ? T.length : T.filter(function (t) { return t.nicho === n.id; }).length;
    return '<button type="button" class="chip" data-nicho="' + n.id + '" aria-pressed="' + (n.id === 'todos') + '">' + n.nome + ' <span>' + q + '</span></button>';
  }).join('');

  function lista() {
    var b = semAcento(busca.trim());
    var l = T.filter(function (t) { return (filtro === 'todos' || t.nicho === filtro) && (!b || semAcento(t.nome + ' ' + t.tema).indexOf(b) >= 0); });
    var cmp = {
      casa: function (a, c) { return a.n - c.n; },
      maior: function (a, c) { return c.seguidores - a.seguidores; },
      menor: function (a, c) { return a.seguidores - c.seguidores; },
      eng: function (a, c) { return (c.eng[0] + c.eng[1]) - (a.eng[0] + a.eng[1]) || a.n - c.n; },
      nome: function (a, c) { return a.nome.localeCompare(c.nome, 'pt-BR'); }
    }[ordem];
    return l.slice().sort(cmp);
  }
  function card(t) {
    var s = sel.indexOf(t.id) >= 0;
    return '<li class="talento' + (s ? ' sel' : '') + '" id="card-' + t.id + '">' +
      '<a class="ta-foto" href="#talento-' + t.id + '" aria-label="Abrir a ficha de ' + esc(t.nome) + '"><img src="' + t.foto + '" alt="' + esc(t.alt) + '" width="800" height="1000" loading="lazy" decoding="async"><span class="ta-n">Nº ' + dois(t.n) + '</span></a>' +
      '<div class="ta-txt"><p class="ta-nicho">' + nomeNicho[t.nicho] + ' · ' + esc(t.tema) + '</p><h3>' + esc(t.nome) + '</h3>' +
      '<p class="ta-seg"><b>' + num(t.seguidores) + '</b> seguidores · ' + faixaPct(t.eng) + ' de engajamento</p>' +
      '<p class="ta-frase">“' + esc(t.frase) + '”</p>' +
      '<div class="ta-acoes"><a class="botao botao-linha" href="#talento-' + t.id + '">Ver ficha</a><button type="button" class="botao botao-sel" data-sel="' + t.id + '" aria-pressed="' + s + '">' + (s ? 'Selecionado' : 'Selecionar') + '</button></div></div></li>';
  }
  function render() {
    var l = lista();
    $('[data-elenco]').innerHTML = l.map(card).join('') + (l.length ? '<li class="talento convite"><p class="rotulo">Casting sob medida</p><h3>Não sabe por onde começar?</h3><p>Conte o produto e o público. A casa sugere de 3 a 5 talentos em até 1 dia útil, com o motivo de cada escolha.</p><a class="botao" href="#" data-wa="Olá, Casa Quinze! Quero uma sugestão de casting para a minha marca.">Pedir sugestão de casting</a></li>' : '');
    $('[data-vazio]').hidden = l.length > 0;
    $('[data-contagem]').textContent = l.length === T.length ? 'Mostrando os 15 talentos' : 'Mostrando ' + l.length + ' de 15 talentos' + (filtro !== 'todos' ? ' em ' + nomeNicho[filtro] : '') + (busca.trim() ? ' com "' + busca.trim() + '"' : '');
    $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.nicho === filtro)); });
  }
  $('[data-chips]').addEventListener('click', function (e) { var c = e.target.closest('[data-nicho]'); if (c) { filtro = c.dataset.nicho; render(); } });
  $('[data-busca]').addEventListener('input', function (e) { busca = e.target.value; render(); });
  $('[data-ordem]').addEventListener('change', function (e) { ordem = e.target.value; render(); });
  $('[data-limpar]').addEventListener('click', function () { filtro = 'todos'; busca = ''; $('[data-busca]').value = ''; render(); $('[data-busca]').focus(); });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-sel]'); if (b) alternar(b.dataset.sel); });

  // ---------- painel "Minha seleção" ----------
  function resumoSel() {
    var l = sel.map(function (id) { return porId[id]; });
    var nichos = []; l.forEach(function (t) { if (nichos.indexOf(nomeNicho[t.nicho]) < 0) nichos.push(nomeNicho[t.nicho]); });
    return { l: l, nichos: nichos, soma: soma(l), reel: [l.reduce(function (s, t) { return s + t.reel[0]; }, 0), l.reduce(function (s, t) { return s + t.reel[1]; }, 0)] };
  }
  function msgSel(r) {
    return 'Olá, Casa Quinze! Quero uma proposta com esta seleção:\n' + r.l.map(function (t) { return '• ' + t.nome + ' (' + nomeNicho[t.nicho] + ', ' + num(t.seguidores) + ')'; }).join('\n') +
      '\n• Nichos: ' + r.nichos.join(', ') + '\n• Seguidores somados: ' + num(r.soma) + ' (exposição potencial)';
  }
  function atualizarSel() {
    var r = resumoSel();
    $('[data-sel-conta]').textContent = sel.length + '/5';
    $('.topo-sel').classList.toggle('tem', sel.length > 0);
    var vagas = '';
    for (var i = 0; i < MAX; i++) {
      var t = r.l[i];
      vagas += t ? '<li class="vaga cheia"><img src="' + t.foto.replace('img/t-', 'img/th-') + '" alt="" width="120" height="150" loading="lazy"><span><b>' + esc(t.nome) + '</b><small>' + nomeNicho[t.nicho] + ' · ' + num(t.seguidores) + '</small></span><button type="button" class="vaga-x" data-sel="' + t.id + '" aria-label="Remover ' + esc(t.nome) + ' da seleção">×</button></li>'
        : '<li class="vaga"><span class="vaga-n">' + (i + 1) + '</span><span><b>Vaga livre</b><small>' + (i === 0 && !sel.length ? 'Toque em Selecionar no casting' : 'Escolha mais um talento') + '</small></span></li>';
    }
    $('[data-vagas]').innerHTML = vagas;
    $('[data-resumo]').innerHTML = sel.length
      ? '<dl><div><dt>Talentos</dt><dd>' + sel.length + ' de 5</dd></div><div><dt>Nichos</dt><dd>' + r.nichos.join(', ') + '</dd></div><div><dt>Seguidores somados</dt><dd>' + num(r.soma) + '</dd></div><div><dt>Visualizações por Reel, somadas</dt><dd>' + faixa(r.reel) + '</dd></div></dl><p class="nota">Soma de seguidores = exposição potencial, não audiência única. Faixas ilustrativas.</p>'
      : '<p class="se-vazio">Nenhum talento escolhido ainda. <a href="#casting">Ir para o casting</a> ou use uma das <a href="#campanhas">campanhas de exemplo</a> como ponto de partida.</p>';
    // contato
    $('[data-ct-sel]').innerHTML = sel.length ? r.l.map(function (t) { return '<li>' + esc(t.nome) + ' <button type="button" data-sel="' + t.id + '" aria-label="Remover ' + esc(t.nome) + '">×</button></li>'; }).join('') : '<li class="ct-nenhum">Nenhum ainda. <a href="#casting">Escolher no casting</a> (opcional)</li>';
    // botões nos cards e na ficha
    $$('[data-sel]').forEach(function (b) {
      if (!b.classList.contains('botao-sel')) return;
      var s = sel.indexOf(b.dataset.sel) >= 0;
      b.setAttribute('aria-pressed', String(s)); b.textContent = s ? 'Selecionado' : (b.dataset.longo ? 'Incluir na seleção' : 'Selecionar');
      var li = b.closest('.talento'); if (li) li.classList.toggle('sel', s);
    });
  }
  $('[data-pedir-sel]').addEventListener('click', function () {
    if (!sel.length) { avisar('Escolha pelo menos 1 talento no casting para pedir a proposta.'); $('#casting').scrollIntoView({ behavior: 'smooth' }); return; }
    if (window.BR_WA) window.BR_WA(msgSel(resumoSel()));
  });
  $('[data-zerar]').addEventListener('click', function () { if (!sel.length) return; sel = []; guardar(); atualizarSel(); avisar('Seleção limpa.'); });

  // ---------- ficha do talento (#talento-id) ----------
  var perfil = $('[data-perfil]'), focoAntes = null;
  function ficha(t) {
    var i = T.indexOf(t), ant = T[(i + T.length - 1) % T.length], prox = T[(i + 1) % T.length], s = sel.indexOf(t.id) >= 0;
    return '<div class="pf-caixa"><div class="pf-barra"><a class="pf-volta" href="#casting" data-fechar>← Voltar ao casting</a><span class="pf-nav"><a href="#talento-' + ant.id + '" aria-label="Talento anterior: ' + esc(ant.nome) + '">‹ Nº ' + dois(ant.n) + '</a><a href="#talento-' + prox.id + '" aria-label="Próximo talento: ' + esc(prox.nome) + '">Nº ' + dois(prox.n) + ' ›</a></span></div>' +
      '<div class="pf-grade"><figure class="pf-foto"><img src="' + t.foto + '" alt="' + esc(t.alt) + '" width="800" height="1000"><figcaption>Foto ilustrativa do nicho · banco livre</figcaption></figure>' +
      '<div class="pf-txt"><p class="rotulo">Nº ' + dois(t.n) + ' · ' + nomeNicho[t.nicho] + ' · <span class="selo">Talento fictício</span></p><h2 id="pf-nome">' + esc(t.nome) + '</h2><p class="pf-tema">' + esc(t.tema) + ' · ' + esc(t.cidade) + '</p>' +
      '<p class="pf-frase">“' + esc(t.frase) + '”</p><p>' + esc(t.apresentacao) + '</p>' +
      '<dl class="pf-num"><div><dt>Seguidores no Instagram</dt><dd>' + num(t.seguidores) + '</dd></div><div><dt>Alcance mensal</dt><dd>' + faixa(t.alcance) + '</dd></div><div><dt>Visualizações por Reel</dt><dd>' + faixa(t.reel) + '</dd></div><div><dt>Visualizações por Story</dt><dd>' + faixa(t.stories) + '</dd></div><div><dt>Engajamento por alcance</dt><dd>' + faixaPct(t.eng) + '</dd></div></dl>' +
      '<p class="nota">Faixas ilustrativas. Substituir pelos dados do Instagram Insights do talento.</p>' +
      '<h3>Audiência</h3><ul class="pf-aud"><li><span>Gênero</span>' + esc(t.publico.genero) + '</li><li><span>Idade</span>' + esc(t.publico.idade) + '</li><li><span>Região</span>' + esc(t.publico.regiao) + '</li></ul>' +
      '<h3>Formatos</h3><ul class="pf-form">' + t.formatos.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<div class="pf-acoes"><button type="button" class="botao botao-sel" data-sel="' + t.id + '" data-longo="1" aria-pressed="' + s + '">' + (s ? 'Selecionado' : 'Incluir na seleção') + '</button><a class="botao botao-linha" href="#" data-wa="' + esc('Olá, Casa Quinze! Quero saber a disponibilidade de ' + t.nome + ' (' + nomeNicho[t.nicho] + ', ' + num(t.seguidores) + ') para uma campanha.') + '">Consultar disponibilidade</a></div></div></div>' +
      '<div class="pf-galeria"><h3>Galeria conceitual <span class="selo">Portfólio conceitual</span></h3><ul><li class="g-foto"><img src="' + t.foto2 + '" alt="' + esc(t.alt2) + '" width="800" height="1000" loading="lazy"></li>' +
      t.pautas.map(function (p, k) { return '<li class="g-capa g-c' + k + '"><span>Pauta ' + (k + 1) + '</span><b>' + esc(p) + '</b><small>' + esc(t.formatos[k % t.formatos.length]) + '</small></li>'; }).join('') + '</ul></div></div>';
  }
  function abrirFicha() {
    var m = location.hash.match(/^#talento-([a-z0-9-]+)$/), t = m && porId[m[1]];
    if (!t) { if (!perfil.hidden) fecharFicha(true); return; }
    if (perfil.hidden) focoAntes = document.activeElement;
    perfil.innerHTML = ficha(t); perfil.hidden = false; perfil.scrollTop = 0;
    document.documentElement.classList.add('ficha-aberta');
    perfil.dataset.id = t.id;
    var v = $('.pf-volta', perfil); if (v) v.focus({ preventScroll: true });
  }
  function fecharFicha(semHash) {
    var id = perfil.dataset.id;
    perfil.hidden = true; perfil.innerHTML = '';
    document.documentElement.classList.remove('ficha-aberta');
    if (!semHash) history.replaceState(null, '', location.pathname + location.search + '#casting');
    var c = id && document.getElementById('card-' + id);
    if (c) { c.scrollIntoView({ block: 'center' }); var a = $('.ta-foto', c); if (a) a.focus({ preventScroll: true }); }
    else if (focoAntes && focoAntes.focus) focoAntes.focus();
  }
  perfil.addEventListener('click', function (e) {
    if (e.target.closest('[data-fechar]')) { e.preventDefault(); fecharFicha(); return; }
    if (e.target === perfil) fecharFicha();
  });
  document.addEventListener('keydown', function (e) {
    if (perfil.hidden) return;
    if (e.key === 'Escape' && !document.querySelector('.br-sim:not([hidden])')) fecharFicha();
    if (e.key === 'Tab') { // foco preso na ficha
      var f = $$('a[href],button,[tabindex="0"]', perfil); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener('hashchange', abrirFicha);

  // ---------- campanhas conceituais ----------
  var CAMP = [
    { marca: 'Lume Café', titulo: 'Manhãs que rendem', foto: 'img/c-manha.webp', alt: 'Xícara de café com leite ao lado de um livro aberto', w: 1200, h: 800,
      ideia: 'Café em cápsula de marca fictícia entrando na rotina da manhã de quatro comunidades diferentes: quem estuda, quem cuida da casa, quem cozinha e quem trabalha por conta própria.',
      time: ['marina-luz', 'ana-clara-educa', 'bia-na-cozinha', 'bruno-digital'], formatos: '4 Reels de rotina, 12 Stories com link, 1 carrossel de receitas com café', prazo: '3 semanas' },
    { marca: 'Vento Sports', titulo: 'Verão em movimento', foto: 'img/c-verao.webp', alt: 'Halteres, tênis, faixas elásticas e acessórios de treino arrumados no chão', w: 1200, h: 800,
      ideia: 'Linha de roupas de treino de marca fictícia mostrada em três ritmos: corrida, treino em casa e mobilidade. Cada talento testa por 14 dias e conta o que achou.',
      time: ['gabriel-costa', 'rafa-treina', 'lara-moves'], formatos: '3 Reels de treino, desafio de 14 dias em Stories, conteúdo UGC para anúncio', prazo: '4 semanas' },
    { marca: 'Floré Cosméticos', titulo: 'Pele de verdade', foto: 'img/c-pele.webp', alt: 'Frascos e potes brancos de cosméticos sem rótulo sob luz suave', w: 1200, h: 800,
      ideia: 'Base e hidratante de marca fictícia testados em tipos de pele diferentes, com resenha de 7 dias e um look completo montado com a moda da casa.',
      time: ['maera-beauty', 'clara-vieira', 'sofia-mendes', 'luisa-moraes'], formatos: '4 resenhas de 7 dias, swatches em Stories, 1 Reel de look completo', prazo: '3 semanas' }
  ];
  $('[data-campanhas]').innerHTML = CAMP.map(function (c, i) {
    var l = c.time.map(function (id) { return porId[id]; }), ns = [];
    l.forEach(function (t) { if (ns.indexOf(nomeNicho[t.nicho]) < 0) ns.push(nomeNicho[t.nicho]); });
    return '<article class="cp"><figure><img src="' + c.foto + '" alt="' + esc(c.alt) + '" width="' + c.w + '" height="' + c.h + '" loading="lazy"><figcaption>Nº ' + (i + 1) + ' · ' + esc(c.marca) + ' (marca fictícia)</figcaption></figure>' +
      '<div class="cp-txt"><p class="rotulo">Campanha conceitual</p><h3>' + esc(c.titulo) + '</h3><p>' + esc(c.ideia) + '</p>' +
      '<dl><div><dt>Time</dt><dd>' + l.map(function (t) { return '<a href="#talento-' + t.id + '">' + esc(t.nome) + '</a>'; }).join(', ') + '</dd></div><div><dt>Nichos</dt><dd>' + ns.join(', ') + '</dd></div><div><dt>Seguidores somados</dt><dd>' + num(soma(l)) + ' (exposição potencial)</dd></div><div><dt>Entregas</dt><dd>' + esc(c.formatos) + '</dd></div><div><dt>Duração</dt><dd>' + esc(c.prazo) + '</dd></div><div><dt>Resultado</dt><dd>Entra o relatório real da campanha (alcance, cliques e vendas informados pela marca).</dd></div></dl>' +
      '<button type="button" class="botao botao-linha" data-usar="' + i + '">Usar este time na minha seleção</button></div></article>';
  }).join('');
  $('[data-campanhas]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-usar]'); if (!b) return;
    sel = CAMP[b.dataset.usar].time.slice(0, MAX); guardar(); atualizarSel(); render();
    avisar('Seleção trocada pelo time de "' + CAMP[b.dataset.usar].titulo + '". Ajuste como quiser.');
    $('#selecao').scrollIntoView({ behavior: 'smooth' });
  });

  // ---------- formulário de contato ----------
  var form = $('[data-form]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, erros = [], dig = f.whats.value.replace(/\D/g, '');
    $$('.campo', form).forEach(function (c) { c.classList.remove('com-erro'); });
    var marcar = function (el, msg) { el.closest('.campo').classList.add('com-erro'); el.setAttribute('aria-invalid', 'true'); erros.push(msg); };
    $$('input,select,textarea', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (f.nome.value.trim().length < 2) marcar(f.nome, 'seu nome');
    if (f.marca.value.trim().length < 2) marcar(f.marca, 'a marca ou empresa');
    if (dig.length < 10 || dig.length > 11) marcar(f.whats, 'um WhatsApp com DDD (10 ou 11 números)');
    if (f.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) marcar(f.email, 'um e-mail válido (ou deixe em branco)');
    if (!f.objetivo.value) marcar(f.objetivo, 'o objetivo da campanha');
    $('[data-ok]').textContent = '';
    if (erros.length) { $('[data-erro]').textContent = 'Falta preencher: ' + erros.join(', ') + '.'; $('[aria-invalid]', form).focus(); return; }
    $('[data-erro]').textContent = '';
    var r = resumoSel();
    var msg = 'Olá, Casa Quinze! Quero uma proposta.\n• Nome: ' + f.nome.value.trim() + '\n• Marca: ' + f.marca.value.trim() + '\n• WhatsApp: ' + f.whats.value.trim() + (f.email.value.trim() ? '\n• E-mail: ' + f.email.value.trim() : '') +
      '\n• Objetivo: ' + f.objetivo.value + '\n• Quando: ' + f.periodo.value + '\n• Verba: ' + f.verba.value +
      '\n• Talentos: ' + (r.l.length ? r.l.map(function (t) { return t.nome; }).join(', ') + ' (' + num(r.soma) + ' seguidores somados)' : 'quero sugestão da agência') +
      (f.msg.value.trim() ? '\n• Produto: ' + f.msg.value.trim() : '');
    $('[data-ok]').textContent = 'Pedido montado. Veja ao lado como ele chega no WhatsApp da agência (demonstração, nada foi enviado).';
    if (window.BR_WA) window.BR_WA(msg);
  });

  // ---------- menu: seção atual marcada ----------
  var links = $$('.topo nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { var on = a.getAttribute('href') === '#' + en.target.id; a.classList.toggle('atual', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
    // barras do gráfico crescem quando aparecem
    var g = $('.pa-grafico');
    var io2 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { g.classList.add('visto'); io2.disconnect(); } }, { threshold: 0.3 });
    io2.observe(g);
  } else { $('.pa-grafico').classList.add('visto'); }

  // celular: o topo some ao rolar para baixo e volta ao subir (não fica por cima do conteúdo)
  (function () {
    var topo = $('.topo'), ultimo = scrollY, pend = false;
    addEventListener('scroll', function () {
      if (pend) return; pend = true;
      requestAnimationFrame(function () {
        pend = false; var y = scrollY;
        topo.classList.toggle('some', innerWidth <= 900 && y > ultimo + 4 && y > 200);
        if (Math.abs(y - ultimo) > 4) ultimo = y;
      });
    }, { passive: true });
  })();

  render(); atualizarSel(); abrirFicha();
})();

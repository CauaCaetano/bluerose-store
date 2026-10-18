/*
 * Assistente virtual da Blue Rose Express (personagem em pixel art no canto da tela).
 *
 * Partes:
 *   CharacterAnimator                   desenha o personagem num <canvas> a partir de img/assistente-pessoa.webp
 *                                       (10 poses do dono, sem redesenho): uma pose por situação, movimento
 *                                       contínuo e suave (respiração, aceno, pensar, falar, pulinho) e troca suave.
 *   AssistantKnowledge                  dúvidas e respostas prontas de cada parte do site, em
 *                                       js/assistente-dados.json (gerado do próprio site; nada é inventado).
 *   VirtualAssistant / AssistantChat    balão que muda de fala conforme a página e a seção na tela,
 *                                       painel "Como posso ajudar?" com as dúvidas daquela parte e as respostas.
 *
 * Nada é enviado em nome do visitante: os botões só abrem páginas do site ou os canais de contato.
 */
(function () {
  'use strict';
  if (window.__assistenteBR) return;
  window.__assistenteBR = true;

  var CFG = {
    sprite: 'img/assistente-pessoa.webp?v=5',
    dados: 'js/assistente-dados.json?v=8',
    W: 195, H: 432, MARGEM: 52,          // tamanho de cada pose na folha; folga (metade em cima, metade embaixo) para o pulinho
  };
  var reduzMov = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var semMovimento = function () { return !!(reduzMov && reduzMov.matches); };
  var guardar = {
    ler: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    gravar: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* aba anônima ou bloqueio */ } },
  };

  /* ===================================================================== */
  /* PixelCharacter + CharacterAnimator                                    */
  /* ===================================================================== */
  // folha img/assistente-pessoa.webp (scratchpad/iaass/montar_novas.py): poses do dono, sem redesenho, 4 por linha
  var POSES = ['celular', 'ola', 'explicando', 'joia', 'ideia', 'duvida', 'notebook', 'agradecendo'];
  var CINTURA = { celular: 198, ola: 186, explicando: 159, joia: 189, ideia: 184, duvida: 182, notebook: 172, agradecendo: 186 };
  var POR_LINHA = 4, PE_X = 113, TAU = 2 * Math.PI;
  // estado da conversa -> [pose, movimento]: uma pose por situação; o movimento é contínuo e liso
  var ESTADOS = {
    idle:      ['celular', 'calmo'],
    minimized: ['celular', 'calmo'],
    greeting:  ['ola', 'aceno'],
    listening: ['celular', 'calmo'],
    thinking:  ['duvida', 'pensa'],
    explaining:['explicando', 'fala'],
    idea:      ['ideia', 'ideia'],
    confident: ['agradecendo', 'agradece'],
    success:   ['joia', 'pulo'],
    error:     ['duvida', 'nega'],
  };
  var suave = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };
  // respiração, balanço leve, aceno, pensar, falar, pulinho, "não" curto e agradecer (pixels e graus da folha)
  function movimento(mov, t, dt) {
    var r = { dx: 0, dy: 0, sobe: 3.2 * (1 - Math.cos(TAU * t / 2600)) / 2, ang: 0, giro: 0.6 * Math.sin(TAU * t / 5200) };
    if (mov === 'aceno') r.ang = Math.sin(dt / 150) * 3.2 * (1 - suave((dt - 1500) / 700));
    else if (mov === 'pensa') r.ang = Math.sin(TAU * t / 2600) * 1.8;
    else if (mov === 'fala') { r.sobe += 2.4 * Math.max(0, Math.sin(TAU * dt / 650)); r.ang = Math.sin(TAU * dt / 2600) * 0.9; }
    else if (mov === 'pulo') r.dy = -20 * Math.sin(Math.PI * Math.min(dt / 520, 1));
    else if (mov === 'ideia') r.dy = -11 * Math.sin(Math.PI * Math.min(dt / 420, 1));
    else if (mov === 'nega') r.dx = 6 * Math.sin(dt / 42) * Math.max(0, 1 - dt / 560);
    else if (mov === 'agradece') r.ang = 2.2 * Math.sin(Math.PI * Math.min(dt / 1400, 1));
    return r;
  }

  function CharacterAnimator(canvas, folha) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.folha = folha;
    this.estado = 'idle';
    this.atual = ESTADOS.idle;
    this.antes = null;
    this.tTroca = 0;
    this.inicioEstado = 0;
    this.rodando = false;
    var self = this;
    this.passo = function (t) { self.quadro(t); };
    document.addEventListener('visibilitychange', function () { document.hidden ? self.parar() : self.iniciar(); });
    if (reduzMov && reduzMov.addEventListener) reduzMov.addEventListener('change', function () { self.desenharAgora(); });
  }

  CharacterAnimator.prototype.definir = function (estado) {
    if (!ESTADOS[estado]) estado = 'idle';
    var novo = ESTADOS[estado], agora = performance.now();
    if (novo[0] !== this.atual[0]) { this.antes = this.atual[0]; this.tTroca = agora; }
    if (novo[0] !== this.atual[0] || novo[1] !== this.atual[1]) this.inicioEstado = agora;
    this.atual = novo;
    this.estado = estado;
    this.cv.setAttribute('data-estado', estado);
    this.desenharAgora();
  };

  CharacterAnimator.prototype.iniciar = function () {
    if (this.rodando || document.hidden) return;
    this.rodando = true;
    this.raf = requestAnimationFrame(this.passo);
  };
  CharacterAnimator.prototype.parar = function () {
    this.rodando = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  };
  CharacterAnimator.prototype.desenharAgora = function () { this.quadro(performance.now(), true); };

  // uma pose: o corpo balança nos pés; pernas paradas; tronco e cabeça sobem (respiração) e giram no cinto
  CharacterAnimator.prototype.pose = function (nome, alfa, m, entra) {
    var W = CFG.W, H = CFG.H, Mg = CFG.MARGEM / 2, i = POSES.indexOf(nome), sx = (i % POR_LINHA) * W, sy = Math.floor(i / POR_LINHA) * H, c = CINTURA[nome];
    var ctx = this.ctx;
    ctx.globalAlpha = alfa;
    ctx.save();
    ctx.translate(PE_X + m.dx, Mg + H + m.dy + entra); ctx.rotate(m.giro * Math.PI / 180); ctx.translate(-PE_X, -(Mg + H));
    ctx.drawImage(this.folha, sx, sy + c - 3, W, H - c + 3, 0, Mg + c - 3, W, H - c + 3);
    ctx.translate(PE_X, Mg + c); ctx.rotate(m.ang * Math.PI / 180);
    ctx.drawImage(this.folha, sx, sy, W, c, -PE_X, -c - m.sobe, W, c);
    ctx.restore();
  };

  CharacterAnimator.prototype.quadro = function (t, forcar) {
    if (this.rodando && !forcar) this.raf = requestAnimationFrame(this.passo);
    var cv = this.cv, ctx = this.ctx;
    // desenha na resolução real da tela: o movimento fica liso e nítido
    var w = Math.round((cv.clientWidth || CFG.W / 2) * (window.devicePixelRatio || 1));
    if (w && w !== cv.width) { cv.width = w; cv.height = Math.round(w * (CFG.H + CFG.MARGEM) / CFG.W); }
    var parado = semMovimento();
    var m = parado ? { dx: 0, dy: 0, sobe: 0, ang: 0, giro: 0 } : movimento(this.atual[1], t, t - this.inicioEstado);
    var k = this.antes && !parado ? suave((t - this.tTroca) / 320) : 1;   // troca de pose suave
    if (k >= 1) this.antes = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    var s = cv.width / CFG.W; ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (k < 1) this.pose(this.antes, 1 - k, m, 0);
    this.pose(this.atual[0], k, m, (1 - k) * 6);
    ctx.globalAlpha = 1;
  };

  /* ===================================================================== */
  /* AssistantKnowledge: dúvidas e respostas prontas de cada parte do site */
  /* ===================================================================== */
  // seções da página inicial, na ordem em que aparecem
  var SECOES = ['produtos', 'solucoes', 'demo', 'processo', 'tecnologias', 'precos', 'perguntas', 'contato'];
  var paginaAtual = function () { return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); };

  function AssistantKnowledge(dados) { this.d = dados; }

  // contexto da página (as seções da página inicial são tratadas à parte)
  AssistantKnowledge.prototype.contextoDaPagina = function () {
    var p = paginaAtual(), d = this.d;
    var porPagina = { 'sistemas.html': 'sistemas', 'exemplos.html': 'sites', 'projetos.html': 'cases', 'laboratorio.html': 'laboratorio', 'conta.html': 'conta', 'termos.html': 'legal', 'privacidade.html': 'legal' };
    if (porPagina[p]) return porPagina[p];
    for (var i = 0; i < d.sistemas.length; i++) {
      var s = d.sistemas[i];
      if (p === s.pagina || p.indexOf(s.pagina.replace('.html', '') + '-vs-') === 0) return 'sis-' + s.id;
    }
    return 'inicio';
  };

  AssistantKnowledge.prototype.ctx = function (id) { return this.d.contextos[id] || this.d.contextos.inicio; };

  AssistantKnowledge.prototype.contatos = function () {
    var l = [];
    if (window.BR_WA) l.push({ rotulo: 'Chamar no WhatsApp', href: 'https://wa.me/' + window.BR_WA, externo: true });
    if (window.BR_EMAIL) l.push({ rotulo: 'Mandar um e-mail', href: 'mailto:' + window.BR_EMAIL });
    l.push({ rotulo: 'Formulário de contato', href: 'index.html#contato' });
    return l;
  };

  // resposta pronta -> mensagem do assistente
  AssistantKnowledge.prototype.resposta = function (q) {
    var links = (q.k || []).map(function (k) { return { rotulo: k[0], href: k[1] }; });
    if (q.contato) links = links.concat(this.contatos());
    return { estado: q.e || 'explaining', texto: q.r, lista: q.l, links: links, ramos: !!q.ramos };
  };

  AssistantKnowledge.prototype.fichaSistema = function (id) {
    var s = this.d.sistemas.filter(function (x) { return x.id === id; })[0];
    if (!s) return null;
    return {
      estado: 'explaining',
      texto: [s.nome + ' (' + s.ramo.toLowerCase() + '): ' + s.para, s.mensal + ' por mês, ' + s.extra + '. Dá para abrir a demonstração agora, sem cadastro, ou testar 7 dias grátis com os seus dados.'],
      links: [{ rotulo: 'Ver a página do ' + s.nome, href: s.pagina }, { rotulo: 'Abrir a demonstração', href: s.demo }, { rotulo: 'Testar 7 dias grátis', href: s.teste }],
    };
  };

  /* ===================================================================== */
  /* VirtualAssistant (balão, painel e conversa)                           */
  /* ===================================================================== */
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'classe') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) e.appendChild(f); });
    return e;
  }

  function VirtualAssistant() {
    this.historico = guardar.ler('br-assist-conversa') || [];
    this.falados = guardar.ler('br-assist-falados') || {};      // partes do site em que ele já puxou assunto
    this.calado = guardar.ler('br-assist-calado') === true;     // visitante fechou o balão: não puxa mais assunto
    this.contexto = 'inicio';
    this.montar();
  }

  VirtualAssistant.prototype.montar = function () {
    var self = this;
    var raiz = this.raiz = el('div', { classe: 'va', 'data-aberto': 'false' });
    // personagem
    this.cv = el('canvas', { classe: 'va-cv', width: CFG.W, height: CFG.H + CFG.MARGEM, 'aria-hidden': 'true' });
    this.botao = el('button', { classe: 'va-alvo', type: 'button', 'aria-label': 'Abrir o assistente virtual da Blue Rose Express', 'aria-expanded': 'false', 'aria-controls': 'va-painel' });
    this.status = el('span', { classe: 'va-sr', role: 'status', 'aria-live': 'polite' });
    var ponto = el('span', { classe: 'va-ponto', 'aria-hidden': 'true' });
    this.balaoTxt = el('button', { classe: 'va-balao-txt', type: 'button', texto: 'Olá! Precisa de ajuda?' });
    this.balao = el('div', { classe: 'va-balao', hidden: '' }, [this.balaoTxt, el('button', { classe: 'va-balao-x', type: 'button', 'aria-label': 'Fechar o aviso do assistente', texto: '×' })]);
    var boneco = el('div', { classe: 'va-boneco' }, [this.cv, ponto, this.botao]);
    // painel
    this.lista = el('div', { classe: 'va-msgs', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    this.onde = el('p', { classe: 'va-onde' });
    this.rapidas = el('div', { classe: 'va-rapidas', role: 'group', 'aria-label': 'Dúvidas frequentes' });
    this.mais = el('div', { classe: 'va-mais' }, [
      el('button', { type: 'button', 'data-va': 'outras', texto: 'Outras dúvidas' }),
      el('button', { type: 'button', 'data-va': 'equipe', texto: 'Falar com a equipe' }),
    ]);
    var cab = el('div', { classe: 'va-cab' }, [
      el('div', null, [el('h2', { id: 'va-titulo', texto: 'Como posso ajudar?' }), this.onde]),
      el('div', { classe: 'va-acoes' }, [
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'limpar', title: 'Começar de novo', 'aria-label': 'Apagar a conversa e começar de novo', texto: '↺' }),
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'minimizar', title: 'Minimizar', 'aria-label': 'Minimizar o painel', texto: '–' }),
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'fechar', title: 'Fechar', 'aria-label': 'Fechar o painel', texto: '×' }),
      ]),
    ]);
    var rodape = el('div', { classe: 'va-rodape' }, [this.rapidas, this.mais]);
    this.painel = el('div', { classe: 'va-painel', id: 'va-painel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'va-titulo', hidden: '' }, [cab, this.lista, rodape]);
    raiz.appendChild(this.painel); raiz.appendChild(this.balao); raiz.appendChild(boneco); raiz.appendChild(this.status);
    document.body.appendChild(raiz);

    // eventos
    this.botao.addEventListener('click', function () { self.alternar(); });
    this.botao.addEventListener('pointerenter', function () { self.reagir(); });
    this.botao.addEventListener('focus', function () { self.reagir(); });
    this.balaoTxt.addEventListener('click', function () { self.abrir(); });
    this.balao.querySelector('.va-balao-x').addEventListener('click', function () {
      self.esconderBalao(); self.calado = true; guardar.gravar('br-assist-calado', true);
    });
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-va]'); if (!b) return;
      var a = b.getAttribute('data-va');
      if (a === 'fechar' || a === 'minimizar') self.fechar();
      else if (a === 'limpar') self.limpar();
      else if (a === 'outras') self.outras();
      else if (a === 'equipe') self.perguntar({ p: 'Quero falar com a equipe', r: ['A equipe responde em até 1 dia útil, sem compromisso. Escolha o canal:'], e: 'confident', contato: true });
    });
    this.painel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); self.fechar(); } });
    this.lista.addEventListener('click', function (e) { self.cliqueLink(e); });
    this.rapidas.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      if (b.hasAttribute('data-sis')) { self.mostrarSistema(b.getAttribute('data-sis'), b.textContent); return; }
      var c = self.k.ctx(b.getAttribute('data-c'));
      self.perguntar(c.perguntas[+b.getAttribute('data-i')]);
    });

    this.ajustarAoAvisoDeCookies();
    this.carregarSprite();
    this.carregarDados().then(function () { if (self.k) self.acompanharPagina(); });
  };

  VirtualAssistant.prototype.carregarSprite = function () {
    var self = this, img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      self.anim = new CharacterAnimator(self.cv, img);
      self.anim.definir('idle');
      self.anim.iniciar();
      self.raiz.classList.add('va-pronto');
      // para depurar e gravar prévias: cv.dispatchEvent(new CustomEvent('va-estado', { detail: 'idea' }))
      self.cv.addEventListener('va-estado', function (e) { self.estado(String(e.detail)); });
    };
    img.onerror = function () { self.raiz.classList.add('va-sem-sprite'); };
    img.src = CFG.sprite;
  };

  VirtualAssistant.prototype.carregarDados = function () {
    var self = this;
    if (this.k) return Promise.resolve();
    if (!this.dadosP) {
      this.dadosP = fetch(CFG.dados).then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (d) { self.k = new AssistantKnowledge(d); })
        .catch(function () { self.dadosP = null; self.k = null; });
    }
    return this.dadosP;
  };

  // a fala muda conforme a página e, na página inicial, conforme a seção que está na tela
  VirtualAssistant.prototype.acompanharPagina = function () {
    var self = this, base = this.k.contextoDaPagina();
    this.mudarContexto(base, true);
    if (base !== 'inicio' || !window.IntersectionObserver) return;
    var visiveis = {};
    var obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) { visiveis[it.target.id] = it.isIntersecting ? it.intersectionRect.height : 0; });
      // a seção que ocupa mais espaço na tela (perto do topo da página, "início")
      var melhor = 'inicio', alto = window.innerHeight * 0.35;
      SECOES.forEach(function (id) { if ((visiveis[id] || 0) > alto) { alto = visiveis[id]; melhor = id; } });
      clearTimeout(self.ctxT);
      self.ctxT = setTimeout(function () { self.mudarContexto(melhor); }, 900);   // só depois de parar ali um pouco
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 1] });
    SECOES.forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
  };

  VirtualAssistant.prototype.mudarContexto = function (id, inicial) {
    if (!this.k || id === this.contexto && !inicial) return;
    this.contexto = id;
    var c = this.k.ctx(id);
    this.onde.textContent = 'Você está em: ' + c.nome;
    this.balaoTxt.textContent = c.fala;
    if (!this.painel.hidden) { this.mostrarRapidas(); return; }
    // puxa assunto uma vez por parte do site, se o visitante não pediu silêncio
    if (this.calado || this.falados[id]) return;
    // no celular o balão cobre o conteúdo: puxa assunto uma vez só
    if (innerWidth < 700 && Object.keys(this.falados).length) return;
    var self = this, atraso = inicial ? 2500 : 300;
    clearTimeout(this.falaT);
    this.falaT = setTimeout(function () {
      if (!self.painel.hidden || self.contexto !== id) return;
      self.falados[id] = true; guardar.gravar('br-assist-falados', self.falados);
      self.mostrarBalao(id === 'inicio' || inicial ? 'greeting' : 'explaining');
    }, atraso);
  };

  // a pose só muda enquanto ele está falando (balão ou resposta); depois volta a ficar parado
  var tempoDeFala = function (txt) {
    var palavras = String(txt || '').split(/\s+/).length;
    return Math.min(9000, 1600 + palavras * 260);
  };
  VirtualAssistant.prototype.estado = function (e, texto, fala) {
    if (texto) this.status.textContent = texto;
    var self = this, parado = function () { return self.painel.hidden ? 'idle' : 'listening'; };
    (this.falaTs || []).forEach(clearTimeout);
    this.falaTs = [];
    if (!fala) { if (this.anim) this.anim.definir(e === 'minimized' ? 'idle' : e); return; }
    // durante a fala ele alterna os gestos: mão aberta apresentando e dedo para cima no ponto principal
    var total = tempoDeFala(fala), seq = SEQUENCIAS[e] || [e];
    if (total < 2600) seq = seq.slice(0, 1);
    var parte = total / seq.length;
    seq.forEach(function (est, i) {
      self.falaTs.push(setTimeout(function () { if (self.anim) self.anim.definir(est); }, Math.round(i * parte)));
    });
    this.falaTs.push(setTimeout(function () { if (self.anim) self.anim.definir(parado()); }, total));
  };
  var SEQUENCIAS = {};   // uma pose por fala (sem ficar trocando)

  VirtualAssistant.prototype.reagir = function () { /* passar o mouse só levanta o personagem (CSS); não troca a pose */ };

  VirtualAssistant.prototype.mostrarBalao = function (estado) {
    clearTimeout(this.balaoT);
    this.balao.hidden = false;
    this.balao.classList.remove('va-novo'); void this.balao.offsetWidth; this.balao.classList.add('va-novo');
    var self = this;
    this.balaoT = setTimeout(function () { self.esconderBalao(); }, innerWidth < 700 ? 5000 : 9000);
    this.estado(estado || 'greeting', this.balaoTxt.textContent, this.balaoTxt.textContent);
  };
  VirtualAssistant.prototype.esconderBalao = function () { clearTimeout(this.balaoT); this.balao.hidden = true; };

  VirtualAssistant.prototype.alternar = function () { this.painel.hidden ? this.abrir() : this.fechar(); };

  VirtualAssistant.prototype.abrir = function () {
    var self = this;
    this.esconderBalao();
    this.painel.hidden = false;
    this.raiz.setAttribute('data-aberto', 'true');
    this.botao.setAttribute('aria-expanded', 'true');
    this.botao.setAttribute('aria-label', 'Fechar o assistente virtual');
    this.carregarDados().then(function () {
      if (!self.lista.childElementCount) self.boasVindas();
      self.mostrarRapidas();
      var p = self.rapidas.querySelector('button');
      setTimeout(function () { (p || self.painel.querySelector('.va-btn-cab')).focus({ preventScroll: true }); }, 30);
    });
    this.estado(this.lista.childElementCount ? 'listening' : 'greeting', 'Assistente aberto.', this.lista.childElementCount ? '' : 'Olá! Sou o assistente virtual da Blue Rose Express.');
  };

  VirtualAssistant.prototype.fechar = function () {
    this.painel.hidden = true;
    this.raiz.setAttribute('data-aberto', 'false');
    this.botao.setAttribute('aria-expanded', 'false');
    this.botao.setAttribute('aria-label', 'Abrir o assistente virtual da Blue Rose Express');
    this.estado('idle', 'Assistente minimizado.');
    this.botao.focus({ preventScroll: true });
  };

  VirtualAssistant.prototype.limpar = function () {
    this.historico = [];
    guardar.gravar('br-assist-conversa', []);
    this.lista.textContent = '';
    this.boasVindas();
    this.mostrarRapidas();
  };

  VirtualAssistant.prototype.boasVindas = function () {
    var self = this;
    if (this.historico.length) {               // conversa desta visita (outra página do site)
      this.historico.forEach(function (m) { self.desenharMsg(m, true); });
      return;
    }
    if (!this.k) {
      this.desenharMsg({ de: 'bot', texto: ['Não consegui carregar as dúvidas agora. Você pode falar direto com a equipe pelo formulário de contato.'], links: [{ rotulo: 'Formulário de contato', href: 'index.html#contato' }] }, true);
      return;
    }
    this.desenharMsg({ de: 'bot', texto: ['Olá! Sou o assistente virtual da Blue Rose Express. Posso ajudar você a navegar pelo site, encontrar nossos serviços e esclarecer suas dúvidas. Escolha uma dúvida abaixo:'] }, true);
  };

  // dúvidas da parte do site em que o visitante está
  VirtualAssistant.prototype.mostrarRapidas = function (lista) {
    var r = this.rapidas; r.textContent = '';
    if (!this.k) { r.hidden = true; return; }
    var cid = this.contexto, c = this.k.ctx(cid), feitas = this.historico.map(function (m) { return m.de === 'eu' ? m.texto[0] : ''; });
    if (lista) {                                   // botões de ramo (qual sistema serve)
      lista.forEach(function (s, i) { r.appendChild(el('button', { type: 'button', 'data-i': i, 'data-sis': s.id, texto: s.rotulo })); });
    } else {
      c.perguntas.forEach(function (q, i) {
        var b = el('button', { type: 'button', 'data-c': cid, 'data-i': i, texto: q.p });
        if (feitas.indexOf(q.p) !== -1) b.className = 'va-feita';
        r.appendChild(b);
      });
    }
    r.hidden = !r.childElementCount;
  };

  // todas as partes do site, para quem quer ver as dúvidas de outro assunto
  VirtualAssistant.prototype.outras = function () {
    var self = this, r = this.rapidas; r.textContent = '';
    var ids = ['inicio', 'produtos', 'precos', 'perguntas', 'sites', 'solucoes', 'processo', 'conta', 'contato'];
    ids.forEach(function (id) {
      var b = el('button', { type: 'button', classe: 'va-tema', texto: self.k.ctx(id).nome });
      b.addEventListener('click', function () { self.contexto = id; self.onde.textContent = 'Assunto: ' + self.k.ctx(id).nome; self.mostrarRapidas(); var p = r.querySelector('button'); if (p) p.focus(); });
      r.appendChild(b);
    });
    r.hidden = false;
    r.querySelector('button').focus();
  };

  VirtualAssistant.prototype.perguntar = function (q) {
    if (!q || this.ocupado) return;
    var self = this, resp = this.k.resposta(q);
    this.desenharMsg({ de: 'eu', texto: [q.p] });
    this.responder(resp, resp.ramos ? this.ramos() : null);
  };

  VirtualAssistant.prototype.ramos = function () {
    return this.k.d.sistemas.map(function (s) { return { id: s.id, rotulo: s.negocio || s.ramo }; })
      .sort(function (a, b) { return a.rotulo.localeCompare(b.rotulo, 'pt'); });
  };

  VirtualAssistant.prototype.mostrarSistema = function (id, rotulo) {
    var f = this.k.fichaSistema(id); if (!f) return;
    this.desenharMsg({ de: 'eu', texto: [rotulo] });
    this.responder(f);
  };

  // mostra a resposta com um instante de "pensando" e a pose certa
  VirtualAssistant.prototype.responder = function (r, botoes) {
    var self = this;
    this.ocupado = true;
    this.digitando(true);
    setTimeout(function () {
      self.digitando(false);
      self.desenharMsg({ de: 'bot', texto: r.texto, lista: r.lista, links: r.links });
      self.mostrarRapidas(botoes || null);
      self.estado(r.estado || 'explaining', 'Resposta pronta.', (r.texto || []).join(' ') + ' ' + (r.lista || []).join(' '));
      self.ocupado = false;
    }, semMovimento() ? 0 : 650);
  };

  VirtualAssistant.prototype.desenharMsg = function (m, semGuardar) {
    var b = el('div', { classe: 'va-msg va-' + m.de });
    (m.texto || []).forEach(function (p) { if (p) b.appendChild(el('p', { texto: p })); });
    if (m.lista && m.lista.length) {
      var ul = el('ul'); m.lista.forEach(function (i) { ul.appendChild(el('li', { texto: i })); }); b.appendChild(ul);
    }
    if (m.links && m.links.length) {
      var acoes = el('div', { classe: 'va-links' });
      m.links.forEach(function (l) {
        var a = el('a', { href: l.href, texto: l.rotulo });
        if (l.externo) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
        acoes.appendChild(a);
      });
      b.appendChild(acoes);
    }
    this.lista.appendChild(b);
    this.lista.scrollTop = this.lista.scrollHeight;
    if (!semGuardar) {
      this.historico.push({ de: m.de, texto: m.texto, lista: m.lista, links: m.links });
      this.historico = this.historico.slice(-20);
      guardar.gravar('br-assist-conversa', this.historico);
    }
  };

  VirtualAssistant.prototype.digitando = function (sim) {
    if (sim) {
      this.dig = el('div', { classe: 'va-msg va-bot va-dig', 'aria-label': 'O assistente está respondendo' }, [el('span'), el('span'), el('span')]);
      this.lista.appendChild(this.dig);
      this.lista.scrollTop = this.lista.scrollHeight;
    } else if (this.dig) { this.dig.remove(); this.dig = null; }
  };

  // links: página do site, âncora na mesma página ou canal de contato
  VirtualAssistant.prototype.cliqueLink = function (e) {
    var a = e.target.closest('.va-links a'); if (!a) return;
    var href = a.getAttribute('href');
    if (a.target === '_blank') return;
    var partes = href.split('#'), aqui = paginaAtual();
    if (partes[1] && (partes[0] === '' || partes[0] === aqui)) {
      var alvo = document.getElementById(partes[1]);
      if (alvo) {
        e.preventDefault();
        alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' });
        if (window.matchMedia('(max-width: 640px)').matches) this.fechar();
      }
    }
  };

  // sobe o personagem enquanto o aviso de cookies (ou de idioma) estiver na tela
  VirtualAssistant.prototype.ajustarAoAvisoDeCookies = function () {
    var raiz = this.raiz;
    var medir = function () {
      var h = 0, cobre = false, larg = raiz.getBoundingClientRect().width || 120;
      document.querySelectorAll('.aviso-cookies, .aviso-idioma').forEach(function (a) {
        if (a.hidden || !a.getClientRects().length || getComputedStyle(a).visibility === 'hidden') return;
        var r = a.getBoundingClientRect();
        if (!r.height || r.bottom < window.innerHeight - 160) return;
        if (r.right < window.innerWidth - larg - 20) return;          // não encosta no personagem
        if (window.innerWidth <= 640) cobre = true;                     // celular: espera o aviso sair
        else h = Math.max(h, window.innerHeight - r.top + 8);
      });
      raiz.style.setProperty('--va-sobe', h + 'px');
      raiz.classList.toggle('va-espera', cobre);
    };
    medir();
    setInterval(medir, 1200);                 // o aviso entra com animação, depois que a página carrega
    if (window.MutationObserver) new MutationObserver(medir).observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', medir);
    setTimeout(medir, 1500);
    document.addEventListener('click', function () { setTimeout(medir, 350); });
  };

  function iniciar() {
    if (document.querySelector('.va')) return;
    // carrega depois do conteúdo principal, sem disputar com a página
    var ir = function () { new VirtualAssistant(); };
    if ('requestIdleCallback' in window) requestIdleCallback(ir, { timeout: 2500 }); else setTimeout(ir, 800);
  }
  if (document.readyState === 'complete') iniciar(); else window.addEventListener('load', iniciar);
})();

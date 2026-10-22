/*
 * Assistente virtual da Blue Rose Express (personagem em pixel art no canto da tela).
 *
 * Partes:
 *   PixelCharacter / CharacterAnimator  desenha o personagem num <canvas> a partir de img/assistente.png
 *                                       (4 poses na 1ª linha, as mesmas piscando na 2ª) e anima cabeça,
 *                                       cabelo, tronco (respiração), braço, mão e olhos por partes.
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
    sprite: 'img/assistente.png?v=1',
    dados: 'js/assistente-dados.json?v=10',
    ia: 'https://yihnfzwtkqdfnwziutqa.supabase.co/functions/v1/site-assistente',   // perguntas livres (Gemini, com limite)
    W: 111, H: 168, MARGEM: 3,           // tamanho de cada pose na folha; margem para o pulinho
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
  var CABECA = 47, CINTURA = 100, CABELO = 13;      // linhas de corte (pixels da arte)
  // partes que se movem sozinhas em cada pose: [x, y, largura, altura]
  var PARTES = { 2: [0, 49, 38, 37], 3: [23, 22, 19, 42] };
  var FAISCA = [23, 22, 15, 18];                     // traços amarelos da pose 3 ("ideia")
  // estado da conversa -> pose e movimentos
  var ESTADOS = {
    idle:      { pose: 1 },
    minimized: { pose: 1 },
    greeting:  { pose: 2, braco: 'aceno' },
    listening: { pose: 1, cabeca: 'atento' },
    thinking:  { pose: 3, faisca: false, cabeca: 'pensa' },
    explaining:{ pose: 2, braco: 'fala', cabeca: 'fala' },
    idea:      { pose: 3, faisca: true, mao: 'ponto' },
    confident: { pose: 4, cabeca: 'inclina' },
    success:   { pose: 2, pulo: true, braco: 'fala' },
    error:     { pose: 4, cabeca: 'nega' },
  };

  function CharacterAnimator(canvas, folha) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.folha = folha;
    this.prepararFaisca();
    this.estado = 'idle';
    this.pose = 1;
    this.trans = null;                 // { de, inicio }
    this.inicioEstado = 0;
    this.proxPiscada = 0;
    this.piscaAte = 0;
    this.proxCabelo = 0;
    this.cabeloAte = 0;
    this.ultimaChave = '';
    this.rodando = false;
    var self = this;
    this.passo = function (t) { self.quadro(t); };
    document.addEventListener('visibilitychange', function () { document.hidden ? self.parar() : self.iniciar(); });
    if (reduzMov && reduzMov.addEventListener) reduzMov.addEventListener('change', function () { self.ultimaChave = ''; self.desenharAgora(); });
  }

  // separa os traços da pose 3 ("ideia") numa camada própria, para piscarem sem mexer na mão
  CharacterAnimator.prototype.prepararFaisca = function () {
    var W = CFG.W, H = CFG.H;
    var base = document.createElement('canvas'); base.width = this.folha.width; base.height = this.folha.height;
    var b = base.getContext('2d'); b.drawImage(this.folha, 0, 0);
    var faisca = document.createElement('canvas'); faisca.width = FAISCA[2]; faisca.height = FAISCA[3];
    var f = faisca.getContext('2d');
    for (var linha = 0; linha < 2; linha++) {
      var x0 = 2 * W + FAISCA[0], y0 = linha * H + FAISCA[1];
      var dados = b.getImageData(x0, y0, FAISCA[2], FAISCA[3]);
      var so = f.createImageData(FAISCA[2], FAISCA[3]);
      for (var i = 0; i < dados.data.length; i += 4) {
        var px = (i / 4) % FAISCA[2], py = Math.floor(i / 4 / FAISCA[2]);
        var naFaisca = FAISCA[1] + py < 36 || FAISCA[0] + px < 35;        // traços com contorno; o dedo fica de fora
        if (dados.data[i + 3] && naFaisca) {
          so.data.set(dados.data.subarray(i, i + 4), i);
          dados.data[i + 3] = 0;
        }
      }
      b.putImageData(dados, x0, y0);
      if (linha === 0) f.putImageData(so, 0, 0);
    }
    this.fonte = base;           // folha sem os traços
    this.faisca = faisca;        // só os traços
  };

  CharacterAnimator.prototype.definir = function (estado) {
    if (!ESTADOS[estado]) estado = 'idle';
    var nova = ESTADOS[estado].pose;
    if (nova !== this.pose) {
      this.trans = semMovimento() ? null : { de: this.pose, deEstado: this.estado, inicio: performance.now() };
      this.pose = nova;
    }
    this.estado = estado;
    this.inicioEstado = performance.now();
    this.ultimaChave = '';
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

  // calcula os movimentos do instante t (em pixels da arte, sempre inteiros)
  CharacterAnimator.prototype.movimentos = function (t, estado) {
    var e = ESTADOS[estado], m = { respira: 0, cabeca: [0, 0], cabelo: 0, parte: [0, 0], faisca: e.faisca !== false, pisca: false, corpo: 0 };
    if (semMovimento()) return m;
    var dt = t - this.inicioEstado;
    // respiração: tronco e cabeça sobem 1 pixel em parte do ciclo
    m.respira = (t % 2600) < 1100 ? 1 : 0;
    // piscadas em intervalos variados (às vezes duas seguidas)
    if (t > this.proxPiscada) {
      this.piscaAte = t + 120;
      this.proxPiscada = t + (Math.random() < 0.2 ? 260 : 2400 + Math.random() * 3800);
    }
    m.pisca = t < this.piscaAte && e.pose !== 3;
    // cabelo: um balanço curto de vez em quando
    if (t > this.proxCabelo) { this.cabeloAte = t + 380; this.proxCabelo = t + 2800 + Math.random() * 3500; }
    m.cabelo = t < this.cabeloAte ? 1 : 0;
    // cabeça
    var c = e.cabeca;
    if (c === 'fala') m.cabeca = [0, Math.floor(dt / 260) % 3 === 1 ? 1 : 0];
    else if (c === 'atento') m.cabeca = [Math.floor(t / 1800) % 2, 0];
    else if (c === 'inclina') m.cabeca = [Math.floor(t / 2200) % 3 === 0 ? 1 : 0, 0];
    else if (c === 'pensa') m.cabeca = [0, Math.floor(t / 700) % 2];
    else if (c === 'nega') m.cabeca = dt < 720 ? [[-1, 1, -1, 1, 0, 0][Math.floor(dt / 120)] || 0, 0] : [0, 0];
    else if (estado === 'idle' || estado === 'minimized') m.cabeca = [0, (t % 7000) < 900 ? 1 : 0];   // olhar rápido para baixo
    // braço da pose 2 e mão da pose 3
    if (e.braco === 'aceno') m.parte = [Math.floor(dt / 160) % 2 ? -1 : 0, Math.floor(dt / 160) % 2 ? -1 : 0];
    else if (e.braco === 'fala') m.parte = [0, Math.floor(dt / 420) % 2 ? -1 : 0];
    if (e.mao === 'ponto') m.parte = [0, Math.floor(dt / 340) % 3 === 0 ? -1 : 0];
    if (e.faisca) m.faisca = Math.floor(t / 300) % 4 !== 3;
    if (e.pulo) m.corpo = dt < 640 ? [-2, -1, 0, 0, -1, 0, 0, 0][Math.floor(dt / 80)] || 0 : 0;
    return m;
  };

  CharacterAnimator.prototype.quadro = function (t, forcar) {
    if (this.rodando && !forcar) this.raf = requestAnimationFrame(this.passo);
    var passoMs = 1000 / 12;                                   // ritmo de pixel art
    if (!forcar && this.ultimoT && t - this.ultimoT < passoMs) return;
    this.ultimoT = t;
    var m = this.movimentos(t, this.estado);
    // troca de pose sem transparência (pixel art não mistura imagens):
    // antecipação na pose antiga (desce 1 px), troca já abaixada e acomodação (sobe 1 px)
    var tr = this.trans, poseVez = this.pose, mudanca = 0, mov = m;
    if (tr) {
      var d = t - tr.inicio;
      if (d < 100) { poseVez = tr.de; mudanca = 1; mov = this.movimentos(t, tr.deEstado || 'idle'); }
      else if (d < 200) mudanca = 1;
      else if (d < 280) mudanca = -1;
      else this.trans = tr = null;
    }
    var chave = JSON.stringify([poseVez, this.estado, mov, mudanca]);
    if (chave === this.ultimaChave) return;
    this.ultimaChave = chave;
    this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    this.desenharPose(poseVez, mov, mudanca);
  };

  // desenha uma pose por partes: pernas, tronco, cabeça (com cabelo) e a parte móvel da pose
  CharacterAnimator.prototype.desenharPose = function (pose, m, extraY) {
    var ctx = this.ctx, W = CFG.W, H = CFG.H, f = this.fonte;
    var sx = (pose - 1) * W, oy = CFG.MARGEM + (m.corpo || 0) + (extraY || 0);
    var linhaCab = m.pisca ? H : 0;
    var parte = PARTES[pose];
    var tronco = oy - m.respira;
    var blit = function (x, y, w, h, dx, dy, linha) { if (w > 0 && h > 0) ctx.drawImage(f, sx + x, (linha || 0) + y, w, h, dx + x, dy + y, w, h); };

    ctx.save();
    if (parte) {                         // a parte móvel não entra nas camadas de base
      ctx.beginPath();
      ctx.rect(0, 0, this.cv.width, this.cv.height);
      ctx.rect(parte[0], parte[1] + tronco, parte[2], parte[3]);
      ctx.clip('evenodd');
    }
    blit(0, CINTURA, W, H - CINTURA, 0, oy);                                   // pernas (paradas)
    blit(0, CABECA, W, CINTURA - CABECA, 0, tronco);                           // tronco
    if (m.respira) blit(0, CINTURA - 1, W, 1, 0, oy);                          // tapa a fresta da respiração
    var cx = m.cabeca[0], cy = tronco + m.cabeca[1];
    blit(0, CABELO, W, CABECA - CABELO, cx, cy, linhaCab);                     // rosto
    blit(0, 0, W, CABELO, cx + m.cabelo, cy, linhaCab);                        // pontas do cabelo
    ctx.restore();

    if (parte) {
      var px = parte[0] + m.parte[0], py = parte[1] + tronco + m.parte[1];
      if (m.parte[0] || m.parte[1]) ctx.drawImage(f, sx + parte[0], parte[1], parte[2], parte[3], parte[0], parte[1] + tronco, parte[2], parte[3]);
      ctx.drawImage(f, sx + parte[0], parte[1], parte[2], parte[3], px, py, parte[2], parte[3]);
      if (pose === 3 && m.faisca) ctx.drawImage(this.faisca, FAISCA[0], FAISCA[1] + tronco);
    }
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
    this.campo = el('input', { type: 'text', classe: 'va-campo', maxlength: '500', autocomplete: 'off', placeholder: 'Ou escreva a sua dúvida…', 'aria-label': 'Escreva a sua dúvida para o assistente' });
    this.form = el('form', { classe: 'va-form' }, [this.campo, el('button', { type: 'submit', 'aria-label': 'Enviar pergunta', texto: '➤' })]);
    var rodape = el('div', { classe: 'va-rodape' }, [this.rapidas, this.mais, this.form]);
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
    this.form.addEventListener('submit', function (e) { e.preventDefault(); var t = self.campo.value.trim(); if (t.length < 2 || self.ocupado) return; self.campo.value = ''; self.perguntarIA(t); });
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
  var SEQUENCIAS = { explaining: ['explaining', 'idea'], idea: ['idea', 'explaining', 'idea'], confident: ['confident', 'idea'] };

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

  // pergunta escrita: a IA responde só com as informações do site; se falhar, oferece a equipe
  VirtualAssistant.prototype.perguntarIA = function (texto) {
    var self = this;
    var hist = this.historico.slice(-6).map(function (m) { return { de: m.de, texto: (m.texto || []).join(' ') }; });
    this.desenharMsg({ de: 'eu', texto: [texto] });
    this.ocupado = true;
    this.digitando(true);
    this.estado('thinking');
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    var contato = [{ rotulo: 'Falar com a equipe', href: 'index.html#contato' }];
    fetch(CFG.ia, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: texto, historico: hist }), signal: ctl && ctl.signal })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (x) {
        if (x.status === 200 && x.j.texto) return { texto: x.j.texto.split(/\n+/).filter(Boolean), links: x.j.links || [], estado: 'explaining' };
        if (x.status === 429) return { texto: ['Você fez muitas perguntas seguidas. Espere alguns minutos ou fale direto com a equipe, que responde em até 1 dia útil.'], links: contato, estado: 'confident' };
        throw new Error();
      })
      .catch(function () { return { texto: ['Não consegui responder agora. Escolha uma dúvida acima ou fale com a equipe, que responde em até 1 dia útil.'], links: contato, estado: 'error' }; })
      .then(function (r) {
        clearTimeout(t);
        self.digitando(false);
        self.desenharMsg({ de: 'bot', texto: r.texto, links: r.links });
        self.estado(r.estado, 'Resposta pronta.', r.texto.join(' '));
        self.ocupado = false;
        self.campo.focus({ preventScroll: true });
      });
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

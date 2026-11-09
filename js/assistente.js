/*
 * Assistente virtual da Blue Rose Express (personagem em pixel art no canto da tela).
 *
 * Partes:
 *   Chamada (pílula)                    botão minimizado no canto: avatar em pixel art (img/assistente-avatar.webp)
 *                                       com anel azul, "Assistente Blue Rose · IA" e "Fale com o nosso Assistente"
 *                                       em texto de verdade (pedido do dono, 08/11; substitui o personagem antigo).
 *   Animador (máquina de estados)       poses e animações do avatar (img/assistente/*.webp, folhas horizontais de
 *                                       quadros 128x128 recortados das poses do dono): neutro, abrindo, pensando,
 *                                       falando, ideia, joinha, surpreso. As folhas só carregam quando o painel abre.
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
    avatar: 'img/assistente-avatar.webp?v=2',
    folhas: ['expressoes', 'fala', 'pensando', 'ideia', 'joinha', 'gesto'],   // img/assistente/<nome>.webp
    versaoFolhas: 2,
    dados: 'js/assistente-dados.json?v=18',
  };
  var reduzMov = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var semMovimento = function () { return !!(reduzMov && reduzMov.matches); };
  var guardar = {
    ler: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    gravar: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* aba anônima ou bloqueio */ } },
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
    // chamada minimizada: pílula com avatar, nome e etiqueta IA (texto de verdade, não imagem)
    var avatar = function (classe) {
      return el('span', { classe: classe, 'aria-hidden': 'true' }, [el('img', { src: CFG.avatar, alt: '', width: '256', height: '256', decoding: 'async' }), el('span', { classe: 'va-sp' })]);
    };
    this.botao = el('button', { classe: 'va-chamada', type: 'button', 'aria-label': 'Abrir o Assistente Blue Rose (IA)', 'aria-expanded': 'false', 'aria-controls': 'va-painel' }, [
      avatar('va-av'),
      el('span', { classe: 'va-chamada-txt', 'aria-hidden': 'true' }, [
        el('b', null, [document.createTextNode('Assistente Blue Rose '), el('span', { classe: 'va-ia', texto: 'IA' })]),
        el('small', { texto: 'Fale com o nosso Assistente' }),
      ]),
    ]);
    this.status = el('span', { classe: 'va-sr', role: 'status', 'aria-live': 'polite' });
    this.balaoTxt = el('button', { classe: 'va-balao-txt', type: 'button', texto: 'Olá! Precisa de ajuda?' });
    this.balao = el('div', { classe: 'va-balao', hidden: '' }, [this.balaoTxt, el('button', { classe: 'va-balao-x', type: 'button', 'aria-label': 'Fechar o aviso do assistente', texto: '×' })]);
    // painel
    this.lista = el('div', { classe: 'va-msgs', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    this.onde = el('p', { classe: 'va-onde' });
    this.rapidas = el('div', { classe: 'va-rapidas', role: 'group', 'aria-label': 'Dúvidas frequentes' });
    this.mais = el('div', { classe: 'va-mais' }, [
      el('button', { type: 'button', 'data-va': 'outras', texto: 'Outras dúvidas' }),
      el('button', { type: 'button', 'data-va': 'equipe', texto: 'Falar com a equipe' }),
    ]);
    var cab = el('div', { classe: 'va-cab' }, [
      avatar('va-av va-av-cab'),
      el('div', { classe: 'va-cab-txt' }, [el('h2', { id: 'va-titulo', texto: 'Como posso ajudar?' }), this.onde]),
      el('div', { classe: 'va-acoes' }, [
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'limpar', title: 'Começar de novo', 'aria-label': 'Apagar a conversa e começar de novo', texto: '↺' }),
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'minimizar', title: 'Minimizar', 'aria-label': 'Minimizar o painel', texto: '–' }),
        el('button', { classe: 'va-btn-cab', type: 'button', 'data-va': 'fechar', title: 'Fechar', 'aria-label': 'Fechar o painel', texto: '×' }),
      ]),
    ]);
    var rodape = el('div', { classe: 'va-rodape' }, [this.rapidas, this.mais]);
    this.painel = el('div', { classe: 'va-painel', id: 'va-painel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'va-titulo', hidden: '' }, [cab, this.lista, rodape]);
    raiz.appendChild(this.painel); raiz.appendChild(this.balao); raiz.appendChild(this.botao); raiz.appendChild(this.status);
    document.body.appendChild(raiz);
    // reserva o espaço da pílula no fim da página (tinta.css: html.va-ativo): rolando até o fundo, ela não cobre nada
    document.documentElement.classList.add('va-ativo');

    // eventos
    this.botao.addEventListener('click', function () { self.alternar(); });
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

    this.anim = new Animador(raiz);
    // usuário digitando num campo do painel (pergunta escrita): pose confiante, parada
    this.painel.addEventListener('input', function () { if (self.anim.atual === 'neutro') self.anim.ir('confiante'); });
    // para conferir os estados (prints e testes): raiz.dispatchEvent(new CustomEvent('va-estado', { detail: 'joinha' }))
    raiz.addEventListener('va-estado', function (e) { self.anim.carregar().then(function () { self.anim.ir(String(e.detail)); }); });
    this.gestoRaro();
    this.ajustarAoAvisoDeCookies();
    this.naoCobrir();
    this.carregarDados().then(function () { if (self.k) self.acompanharPagina(); });
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
    // minimizado por padrão (P1, 08/11): no celular e no tablet o balão não abre sozinho (cobriria o conteúdo);
    // no computador fala uma vez por visita e só se não estiver sobre um controle
    if (innerWidth < 1024 || Object.keys(this.falados).length) return;
    var self = this, atraso = inicial ? 2500 : 300;
    clearTimeout(this.falaT);
    this.falaT = setTimeout(function () {
      if (!self.painel.hidden || self.contexto !== id) return;
      self.falados[id] = true; guardar.gravar('br-assist-falados', self.falados);
      if (self.raiz.classList.contains('va-recua')) return;
      self.mostrarBalao(id === 'inicio' || inicial ? 'greeting' : 'explaining');
      self.desviar();
    }, atraso);
  };

  /* ---------- Animador: máquina de estados do avatar ----------
     Estados (data-anim na raiz .va; o CSS escolhe a folha e o ritmo):
       neutro      parado (pose 1 das expressões)          abrindo   animado → neutro (~400 ms)
       pensando    loop de 4 quadros a 5 q/s               falando   loop de 6 quadros a 10 q/s
       ideia       4 quadros uma vez → neutro              joinha    4 quadros uma vez → neutro
       gesto       dedo levantado, 3 quadros uma vez (fechado, no máximo a cada 40–60 s)
       confiante / surpreso   poses paradas
     Regras: só troca no fim do ciclo em curso (nada de pular no meio); com "reduzir movimento" só poses paradas. */
  var CICLO = { pensando: 800, falando: 600, ideia: 720, joinha: 800, gesto: 600, abrindo: 400 };
  var UMA_VEZ = { ideia: 1, joinha: 1, gesto: 1, abrindo: 1 };
  function Animador(raiz) { this.raiz = raiz; this.atual = 'neutro'; this.inicio = 0; this.fila = []; this.t = 0; this.pronto = false; }
  // carrega as folhas uma vez (só quando o painel abre); até lá a foto do avatar fica no lugar
  Animador.prototype.carregar = function () {
    if (this.carregando) return this.carregando;
    var raiz = this.raiz, self = this;
    this.carregando = Promise.all(CFG.folhas.map(function (n) {
      return new Promise(function (ok) { var i = new Image(); i.onload = i.onerror = function () { ok(i.naturalWidth > 0); }; i.src = 'img/assistente/' + n + '.webp?v=' + CFG.versaoFolhas; });
    })).then(function (r) {
      if (r.indexOf(false) !== -1) return;          // faltou alguma folha: fica a foto parada
      self.pronto = true; raiz.classList.add('va-anima'); self.mostrar(self.atual, true);
    });
    return this.carregando;
  };
  Animador.prototype.mostrar = function (e, forcar) {
    clearTimeout(this.t);
    if (!forcar && e === this.atual && !UMA_VEZ[e]) return;
    this.atual = e; this.inicio = performance.now();
    // reinicia a animação CSS do zero (mesmo estado repetido)
    this.raiz.removeAttribute('data-anim'); void this.raiz.offsetWidth;
    this.raiz.setAttribute('data-anim', e);
    var self = this;
    if (UMA_VEZ[e]) this.t = setTimeout(function () { self.mostrar(self.fila.shift() || 'neutro'); }, semMovimento() ? 700 : CICLO[e]);
  };
  // pede um estado: espera o ciclo atual terminar (loop) antes de trocar
  Animador.prototype.ir = function (e, depois) {
    this.fila = depois ? [].concat(depois) : [];
    var c = CICLO[this.atual], self = this;
    if (UMA_VEZ[this.atual]) { this.fila.unshift(e); return; }       // a animação de uma vez chama a próxima ao acabar
    if (!c || semMovimento() || this.atual === e) return this.mostrar(e);
    var falta = c - ((performance.now() - this.inicio) % c);
    clearTimeout(this.t);
    this.t = setTimeout(function () { self.mostrar(e); }, falta > c - 40 ? 0 : falta);
  };
  // fala por um tempo e termina no fim de um ciclo; depois segue para o próximo estado
  Animador.prototype.falar = function (ms, depois) {
    var self = this;
    this.ir('falando');
    clearTimeout(this.tFala);
    var ciclos = Math.max(2, Math.round(ms / CICLO.falando));
    this.tFala = setTimeout(function () { self.ir(depois || 'neutro'); }, ciclos * CICLO.falando + 60);
  };

  // estado da conversa: anunciado para leitor de tela e refletido no avatar
  VirtualAssistant.prototype.estado = function (e, texto) {
    if (texto) this.status.textContent = texto;
    this.raiz.setAttribute('data-estado', e || 'idle');
  };


  VirtualAssistant.prototype.mostrarBalao = function (estado) {
    clearTimeout(this.balaoT);
    this.balao.hidden = false;
    this.balao.classList.remove('va-novo'); void this.balao.offsetWidth; this.balao.classList.add('va-novo');
    var self = this;
    this.balaoT = setTimeout(function () { self.esconderBalao(); }, 6000);
    this.estado(estado || 'greeting', this.balaoTxt.textContent, this.balaoTxt.textContent);
  };
  VirtualAssistant.prototype.esconderBalao = function () { clearTimeout(this.balaoT); this.balao.hidden = true; };

  VirtualAssistant.prototype.gestoRaro = function () {
    var self = this;
    var proximo = function () {
      setTimeout(function () {
        if (self.anim.pronto && self.painel.hidden && !document.hidden && !semMovimento() && !self.raiz.classList.contains('va-recua')) self.anim.ir('gesto');
        proximo();
      }, 40000 + Math.random() * 20000);
    };
    proximo();
  };

  VirtualAssistant.prototype.alternar = function () { this.painel.hidden ? this.abrir() : this.fechar(); };

  VirtualAssistant.prototype.abrir = function () {
    var self = this;
    this.esconderBalao();
    this.painel.hidden = false;
    this.raiz.setAttribute('data-aberto', 'true');
    this.botao.setAttribute('aria-expanded', 'true');
    this.botao.setAttribute('aria-label', 'Fechar o Assistente Blue Rose');
    this.anim.carregar().then(function () { self.anim.ir('abrindo'); });
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
    this.botao.setAttribute('aria-label', 'Abrir o Assistente Blue Rose (IA)');
    this.estado('idle', 'Assistente minimizado.');
    clearTimeout(this.anim.tFala); this.anim.ir('neutro');
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
      var anim = this.anim; anim.carregar().then(function () { anim.ir('surpreso'); });
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
    if (/obrigad|valeu|agrade[cç]|thank/i.test(q.p)) resp.estado = 'agradecido';
    this.desenharMsg({ de: 'eu', texto: [q.p] });
    this.responder(resp, resp.ramos ? this.ramos() : null);
  };

  // em outro idioma do pacote de idiomas, pede à IA a resposta no idioma de quem pergunta
  function comIdioma(texto) { return window.__brIdioma && window.__brIdioma.comIdioma ? window.__brIdioma.comIdioma(texto) : texto; }
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
    this.anim.ir('pensando');
    setTimeout(function () {
      self.digitando(false);
      self.desenharMsg({ de: 'bot', texto: r.texto, lista: r.lista, links: r.links });
      self.mostrarRapidas(botoes || null);
      self.estado(r.estado || 'explaining', 'Resposta pronta.');
      var txt = (r.texto || []).join(' ') + ' ' + (r.lista || []).join(' ');
      var depois = r.estado === 'agradecido' || r.estado === 'success' ? 'joinha' : r.estado === 'error' ? 'surpreso' : (r.links && r.links.length ? 'ideia' : 'neutro');
      self.anim.falar(Math.min(3600, 700 + txt.split(/\s+/).length * 70), depois);
      self.ocupado = false;
    }, semMovimento() ? 0 : CICLO.pensando);
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

  // não cobrir nada (P1, 08/11): se o personagem (ou o balão) estiver em cima de um botão, link, campo, controle de
  // vídeo ou formulário, ele se afasta para a borda (.va-recua). Confere ao rolar, ao mudar o tamanho e quando a página muda.
  var INTERATIVO = 'a[href], button, input, select, textarea, label, summary, video, iframe, [role="button"], [role="tab"], [role="slider"], [tabindex]:not([tabindex="-1"]), .btn, form';
  VirtualAssistant.prototype.naoCobrir = function () {
    var self = this, pedido = 0;
    var agendar = function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; self.desviar(); }); };
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    if (window.MutationObserver) new MutationObserver(agendar).observe(document.body, { childList: true });
    // ao passar o mouse, tocar ou focar a parte visível ele volta até a próxima rolagem
    this.raiz.addEventListener('pointerenter', function () { self.trazido = true; });
    this.raiz.addEventListener('focusin', function () { self.trazido = true; });
    setTimeout(agendar, 400);
    setInterval(agendar, 2000);     // conteúdo que aparece com animação ou carrega depois
  };
  var temTexto = function (e) { for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; };
  // rodada 4: o balão (e a chamada) também não podem ficar sobre mídia: foto, vídeo, ilustração ou maquete
  var MIDIA = 'img, picture, video, canvas, iframe, svg:not(.ico), figure, [role="img"]';
  var ehMidia = function (e) { return !!(e.closest && e.closest(MIDIA)); };
  // qualquerTexto: para o balão, que é maior, também não pode ficar por cima de texto
  VirtualAssistant.prototype.cobre = function (r, qualquerTexto) {
    if (!r || !r.width || !r.height) return false;
    // grade de pontos que vai até perto das bordas: pega também o botão que só encosta num canto (integração 08/11)
    var xs = [r.left + 2, r.left + r.width * .25, r.left + r.width * .5, r.left + r.width * .75, r.right - 2],
        ys = [r.top + 2, r.top + r.height * .25, r.top + r.height * .5, r.top + r.height * .75, r.bottom - 2];
    var raiz = this.raiz;
    // o personagem fica invisível ao toque por um instante para ver o que há embaixo dele
    raiz.style.pointerEvents = 'none';
    var alvo = null;
    for (var i = 0; i < xs.length && !alvo; i++) for (var j = 0; j < ys.length && !alvo; j++) {
      var x = Math.min(Math.max(xs[i], 0), innerWidth - 1), y = Math.min(Math.max(ys[j], 0), innerHeight - 1);
      var pilha = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
      for (var k = 0; k < pilha.length; k++) {
        var e = pilha[k];
        if (raiz.contains(e)) continue;
        if (e === document.body || e === document.documentElement) break;
        if ((e.closest && e.closest(INTERATIVO)) || (qualquerTexto && (temTexto(e) || ehMidia(e)))) { alvo = e; break; }
        var cs = getComputedStyle(e);
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none') break;   // fundo opaco: o que vem embaixo não aparece
      }
    }
    raiz.style.pointerEvents = '';
    return !!alvo;
  };
  VirtualAssistant.prototype.desviar = function () {
    if (!this.painel.hidden) { this.raiz.classList.remove('va-recua'); return; }
    if (this.trazido && this.raiz.matches(':hover, :focus-within')) return;
    this.trazido = false;
    // mede onde a chamada fica no lugar normal (desconta o deslocamento de quando está recuada: fica só uma borda de 14 px na margem)
    var r = this.botao.getBoundingClientRect(), tela = innerWidth + 'x' + innerHeight;
    if (this.raiz.classList.contains('va-recua')) {
      // rodada 4: usa a última medida no lugar normal (no celular a aba recuada muda de tamanho); sem ela, desconta o deslocamento
      if (this.rNormal && this.rNormalTela === tela) r = this.rNormal;
      else { var dx = r.width + 2; r = { left: r.left - dx, right: r.right - dx, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }
    } else if (r.width && getComputedStyle(this.raiz).transform === 'none') {
      this.rNormal = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; this.rNormalTela = tela;
    }
    // em qualquer largura (integração da rodada 4) não pode ficar sobre texto: no celular cobria o fim das linhas dos passos e no tablet/computador o fim de listas
    var celular = true;
    var cobre = this.cobre(r, celular);
    this.raiz.classList.toggle('va-recua', cobre);
    if (!this.balao.hidden && this.cobre(this.balao.getBoundingClientRect(), true)) this.esconderBalao();
    if (cobre && !this.balao.hidden) this.esconderBalao();   // recuada, a fala também some
  };

  function iniciar() {
    if (document.querySelector('.va')) return;
    // carrega depois do conteúdo principal, sem disputar com a página
    var ir = function () { new VirtualAssistant(); };
    if ('requestIdleCallback' in window) requestIdleCallback(ir, { timeout: 2500 }); else setTimeout(ir, 800);
  }
  if (document.readyState === 'complete') iniciar(); else window.addEventListener('load', iniciar);
})();

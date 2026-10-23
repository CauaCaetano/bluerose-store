/* Se alguém embutir esta página num site de outro domínio, ela sai do quadro (proteção contra clickjacking) */
(function () {
  if (window.top === window.self) return;
  try { if (window.top.location.hostname === location.hostname) return; } catch (e) { /* domínio diferente */ }
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) {}
})();
/*
 * BLUE ROSE · comportamento do site
 *  - menu do celular
 *  - revelação das seções ao rolar (IntersectionObserver, sem listener de scroll)
 *  - simulador de automações: mesma lógica dos scripts em Python de /portfolio
 *  - formulário de contato: monta a mensagem e abre o WhatsApp (o envio é do visitante)
 */
(function () {
  'use strict';

  var EN = document.documentElement.lang.indexOf('en') === 0;
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, calmo ? Math.min(ms, 60) : ms); }); };

  /* ---------------- menu ---------------- */
  var nav = document.querySelector('.nav');
  var botaoMenu = document.querySelector('.nav-toggle');
  if (nav && botaoMenu) {
    var alternar = function (abrir) {
      nav.classList.toggle('aberto', abrir);
      botaoMenu.setAttribute('aria-expanded', String(abrir));
    };
    botaoMenu.addEventListener('click', function () { alternar(!nav.classList.contains('aberto')); });
    nav.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { alternar(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') alternar(false); });
  }

  /* ---------------- revelação ao rolar ---------------- */
  var revelar = document.querySelectorAll('.reveal, .trilho');
  if ('IntersectionObserver' in window && !calmo) {
    var obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add('visto'); obs.unobserve(it.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revelar.forEach(function (el) { obs.observe(el); });
  } else {
    revelar.forEach(function (el) { el.classList.add('visto'); });
  }

  /* ---------------- simulador de automações ---------------- */
  var T = EN ? {
    rodar: 'Run automation', denovo: 'Run again', rodando: 'Running…',
    vazio: 'Press “Run automation” to watch each step happen.',
  } : {
    rodar: 'Rodar automação', denovo: 'Rodar de novo', rodando: 'Rodando…',
    vazio: 'Aperte “Rodar automação” para ver cada etapa acontecer.',
  };

  var DIAS = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var dd = function (n) { return String(n).padStart(2, '0'); };
  var rotuloData = function (d) { return DIAS[d.getDay()] + ' ' + dd(d.getDate()) + '/' + dd(d.getMonth() + 1); };
  var proximosDiasUteis = function (n) {
    var d = new Date(); var lista = [];
    while (lista.length < n) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) lista.push(d);
    }
    return lista;
  };

  /* Regra do qualificador_leads_whatsapp.py: 3 sinais = quente, 2 = morno, menos = frio */
  var classificar = function (lead) {
    var sinais = 0;
    var prazo = lead.prazo.trim().toLowerCase();
    if (prazo && prazo.indexOf(EN ? 'just looking' : 'pesquisando') === -1) sinais++;
    if (lead.orcamento.trim()) sinais++;
    if (lead.regiao.trim()) sinais++;
    return sinais >= 3 ? (EN ? 'HOT' : 'QUENTE') : sinais === 2 ? (EN ? 'WARM' : 'MORNO') : (EN ? 'COLD' : 'FRIO');
  };

  var CENARIOS = {
    lead: {
      nos: EN
        ? [['whatsapp-logo', 'Lead messages on WhatsApp'], ['robot', 'Automation asks 4 questions'], ['lightning', 'Rules score the lead'], ['database', 'Summary is saved'], ['user-focus', 'Agent gets the summary']]
        : [['whatsapp-logo', 'Lead chama no WhatsApp'], ['robot', 'Automação faz 4 perguntas'], ['lightning', 'Regras classificam o lead'], ['database', 'Resumo fica salvo'], ['user-focus', 'Corretor recebe o resumo']],
      desc: EN
        ? 'Real-estate lead qualification: the bot asks the questions, scores the answers and hands the agent a ready summary instead of a long chat.'
        : 'Qualificação de leads de imobiliária: o robô faz as perguntas, pontua as respostas e entrega ao corretor um resumo pronto, em vez da conversa inteira.',
      opcao: EN ? 'Lead is just looking' : 'Lead só está pesquisando',
      rodar: async function (passo, chat, marcado) {
        var perguntas = EN
          ? ['Hi! Thanks for your interest. Are you looking for an apartment, a house or a lot?', 'Great. Which area or neighborhood do you prefer?', 'Perfect. What budget range do you have in mind?', 'Last one: when do you plan to close? This month, in 3 months, or just looking for now?']
          : ['Oi! Vi seu interesse no anúncio. Você procura apartamento, casa ou terreno?', 'Show! E qual região ou bairro você prefere?', 'Perfeito. Qual faixa de orçamento você tem em mente?', 'Última: pretende fechar em quanto tempo? Esse mês, em 3 meses ou só pesquisando por enquanto?'];
        var respostas = marcado
          ? (EN ? ['house', '', '', 'just looking for now'] : ['casa', '', '', 'só pesquisando por enquanto'])
          : (EN ? ['apartment', 'South Zone', 'up to $70k', 'in 3 months'] : ['apartamento', 'Zona Sul', 'até R$ 350 mil', 'nos próximos 3 meses']);
        await passo(0, EN ? 'new lead: +55 11 9xxxx-xxxx' : 'novo lead: +55 11 9xxxx-xxxx');
        chat('cliente', EN ? 'Hi, I saw the listing. Is it still available?' : 'Oi, vi o anúncio. Ainda está disponível?');
        await passo(1, EN ? 'question 1 of 4' : 'pergunta 1 de 4');
        var campos = ['tipo', 'regiao', 'orcamento', 'prazo'];
        var lead = {};
        for (var i = 0; i < 4; i++) {
          await passo(1, (EN ? 'question ' : 'pergunta ') + (i + 1) + (EN ? ' of 4' : ' de 4'), true);
          chat('bot', perguntas[i]); await esperar(650);
          chat('cliente', respostas[i] || (EN ? "I'd rather not say" : 'prefiro não dizer')); await esperar(520);
          lead[campos[i]] = respostas[i];
        }
        var nota = classificar(lead);
        await passo(2, EN ? 'score: ' + nota : 'classificação: ' + nota);
        await passo(3, 'leads.csv  +1');
        await passo(4, EN ? 'sent to the agent' : 'enviado ao corretor');
        chat('resultado', (EN ? '<strong>New qualified lead</strong>\nScore: ' : '<strong>Novo lead qualificado</strong>\nClassificação: ') + nota +
          (EN ? '\nType: ' : '\nTipo: ') + lead.tipo + (EN ? '\nArea: ' : '\nRegião: ') + (lead.regiao || '-') +
          (EN ? '\nBudget: ' : '\nOrçamento: ') + (lead.orcamento || '-') + (EN ? '\nTimeline: ' : '\nPrazo: ') + lead.prazo);
      },
    },

    pix: {
      nos: EN
        ? [['receipt', 'Customer generates a PIX'], ['arrow-clockwise', 'Waits 10 minutes'], ['database', 'Checks the payment'], ['robot', 'Decides: remind or not'], ['whatsapp-logo', 'Reminder on WhatsApp']]
        : [['receipt', 'Cliente gera o PIX'], ['arrow-clockwise', 'Espera 10 minutos'], ['database', 'Consulta o pagamento'], ['robot', 'Decide: lembrar ou não'], ['whatsapp-logo', 'Lembrete no WhatsApp']],
      desc: EN
        ? 'Abandoned-payment recovery: if the PIX is still pending after the waiting time, the customer gets the payment link. If it was paid, nothing is sent.'
        : 'Recuperação de venda: se o PIX continua pendente depois do prazo, o cliente recebe o link de pagamento. Se já pagou, nada é enviado.',
      opcao: EN ? 'Customer paid before the deadline' : 'Cliente pagou antes do prazo',
      rodar: async function (passo, chat, pago) {
        var valor = EN ? '$37.90' : 'R$ 189,90';
        await passo(0, (EN ? 'order #10234 · ' : 'pedido #10234 · ') + valor);
        chat('sistema', EN ? 'Checkout: PIX generated for order #10234' : 'Checkout: PIX gerado para o pedido #10234');
        await passo(1, EN ? '10 min (sped up here)' : '10 min (acelerado aqui)');
        await esperar(500);
        var status = pago ? (EN ? 'paid' : 'pago') : (EN ? 'pending' : 'pendente');
        await passo(2, 'status: ' + status);
        if (pago) {
          await passo(3, EN ? 'paid: do not disturb' : 'pago: não incomodar');
          chat('sistema', EN ? 'Payment confirmed. No message sent.' : 'Pagamento confirmado. Nenhuma mensagem enviada.');
          await passo(4, EN ? 'skipped' : 'não enviado');
          chat('resultado', EN ? '<strong>Result</strong>\nOrder #10234: paid\nReminder: not sent (the customer already paid)' : '<strong>Resultado</strong>\nPedido #10234: pago\nLembrete: não enviado (o cliente já pagou)');
          return;
        }
        await passo(3, EN ? 'pending: send reminder' : 'pendente: mandar lembrete');
        await passo(4, EN ? 'reminder sent' : 'lembrete enviado');
        chat('bot', EN
          ? 'Hi Ana! Your order #10234 (' + valor + ') is still waiting for the PIX. Here is the link to finish before it expires: [payment link]. Any questions, just reply here.'
          : 'Oi, Ana! Seu pedido #10234 (' + valor + ') ainda está com o PIX pendente. Segue o link para finalizar antes que expire: [link de pagamento]. Qualquer dúvida, me chama aqui.');
        await esperar(700);
        chat('cliente', EN ? 'Oh, I forgot! Paying now.' : 'Ah, esqueci! Vou pagar agora.');
        chat('resultado', EN ? '<strong>Result</strong>\nOrder #10234: pending after 10 min\nReminder: sent with the payment link' : '<strong>Resultado</strong>\nPedido #10234: pendente após 10 min\nLembrete: enviado com o link de pagamento');
      },
    },

    agenda: {
      nos: EN
        ? [['whatsapp-logo', 'Customer asks for a slot'], ['database', 'Reads the calendar'], ['robot', 'Offers free times'], ['user-focus', 'Customer picks one'], ['check', 'Booked and confirmed']]
        : [['whatsapp-logo', 'Cliente pede um horário'], ['database', 'Lê a agenda'], ['robot', 'Oferece horários livres'], ['user-focus', 'Cliente escolhe'], ['check', 'Agendado e confirmado']],
      desc: EN
        ? 'Clinic booking: real upcoming business days, only free slots offered, and the booking lands in the calendar with a reminder the day before.'
        : 'Agendamento de clínica: próximos dias úteis de verdade, só horários livres e o agendamento entra na agenda com lembrete na véspera.',
      opcao: EN ? 'Message arrives at 10 pm' : 'Mensagem chega às 22h',
      rodar: async function (passo, chat, noite) {
        var dias = proximosDiasUteis(3);
        var horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        // Ocupados variam por dia, mas de forma estável (mesmo resultado no mesmo dia)
        var livres = function (d) { return horarios.filter(function (h, i) { return (d.getDate() * 7 + i * 3) % 5 !== 0; }); };
        await passo(0, noite ? (EN ? 'received at 10:04 pm' : 'recebida às 22:04') : (EN ? 'received at 2:17 pm' : 'recebida às 14:17'));
        chat('cliente', EN ? 'Hi! Do you have time for a facial cleansing this week?' : 'Oi! Tem horário pra limpeza de pele essa semana?');
        await passo(1, rotuloData(dias[0]) + (EN ? ' to ' : ' a ') + rotuloData(dias[2]));
        var opcoes = [];
        dias.forEach(function (d) { var l = livres(d); opcoes.push([d, l[0]], [d, l[l.length - 2]]); });
        opcoes = opcoes.slice(0, 4);
        await passo(2, opcoes.length + (EN ? ' free slots' : ' horários livres'));
        chat('bot', (noite ? (EN ? "We're closed now, but I can book you right away. " : 'Estamos fechados agora, mas já consigo agendar pra você. ') : '') +
          (EN ? 'Free times:\n' : 'Horários livres:\n') +
          opcoes.map(function (o, i) { return (i + 1) + ') ' + rotuloData(o[0]) + (EN ? ' at ' : ' às ') + o[1]; }).join('\n') +
          (EN ? '\nReply with the number.' : '\nResponda com o número.'));
        await esperar(800);
        var escolha = opcoes[1];
        await passo(3, (EN ? 'option 2: ' : 'opção 2: ') + rotuloData(escolha[0]) + ' ' + escolha[1]);
        chat('cliente', '2');
        await passo(4, EN ? 'saved + reminder scheduled' : 'salvo + lembrete programado');
        chat('bot', (EN ? 'Done! Facial cleansing booked for ' : 'Pronto! Limpeza de pele agendada para ') + rotuloData(escolha[0]) + (EN ? ' at ' : ' às ') + escolha[1] +
          (EN ? '. I will remind you the day before.' : '. Te lembro na véspera.'));
        chat('resultado', (EN ? '<strong>Calendar</strong>\n' : '<strong>Agenda</strong>\n') + rotuloData(escolha[0]) + ' ' + escolha[1] +
          (EN ? '  Facial cleansing\nReminder: the day before at 6 pm' : '  Limpeza de pele\nLembrete: véspera às 18h') +
          (noite ? (EN ? '\nBooked outside business hours, without staff' : '\nAgendado fora do expediente, sem ninguém da equipe') : ''));
      },
    },
  };

  var demo = document.querySelector('[data-demo]');
  if (demo) {
    var abas = demo.querySelectorAll('[role="tab"]');
    var nosEl = demo.querySelector('.nodes');
    var descEl = demo.querySelector('.demo-flow .desc');
    var chatEl = demo.querySelector('.chat-log');
    var botao = demo.querySelector('[data-rodar]');
    var opcaoEl = demo.querySelector('[data-opcao]');
    var opcaoTxt = demo.querySelector('[data-opcao-txt]');
    var atual = 'lead';
    var execucao = 0;

    var icone = function (nome) { return '<svg class="ico" aria-hidden="true"><use href="img/icones.svg#i-' + nome + '"/></svg>'; };
    var montar = function () {
      var c = CENARIOS[atual];
      descEl.textContent = c.desc;
      opcaoTxt.textContent = c.opcao;
      nosEl.innerHTML = c.nos.map(function (n) {
        return '<li class="node"><span class="dot">' + icone(n[0]) + '</span><div><b>' + n[1] + '</b><small></small></div></li>';
      }).join('');
      chatEl.innerHTML = '<p class="chat-vazio">' + T.vazio + '</p>';
      botao.disabled = false;
      botao.querySelector('span').textContent = T.rodar;
    };

    var chat = function (tipo, html) {
      var vazio = chatEl.querySelector('.chat-vazio');
      if (vazio) vazio.remove();
      var p = document.createElement('div');
      p.className = 'msg ' + tipo;
      if (tipo === 'resultado') p.innerHTML = html; else p.textContent = html;
      chatEl.appendChild(p);
      chatEl.scrollTop = chatEl.scrollHeight;
    };

    abas.forEach(function (aba) {
      aba.addEventListener('click', function () {
        execucao++;
        abas.forEach(function (a) { a.setAttribute('aria-selected', String(a === aba)); a.tabIndex = a === aba ? 0 : -1; });
        atual = aba.dataset.cenario;
        opcaoEl.checked = false;
        montar();
      });
      aba.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var lista = Array.prototype.slice.call(abas);
        var i = (lista.indexOf(aba) + (e.key === 'ArrowRight' ? 1 : lista.length - 1)) % lista.length;
        lista[i].focus(); lista[i].click();
      });
    });

    botao.addEventListener('click', async function () {
      var minha = ++execucao;
      var nos = nosEl.querySelectorAll('.node');
      nos.forEach(function (n) { n.className = 'node'; n.querySelector('small').textContent = ''; });
      chatEl.innerHTML = '';
      botao.disabled = true;
      botao.querySelector('span').textContent = T.rodando;
      var passo = async function (i, texto, semEspera) {
        if (minha !== execucao) throw new Error('cancelado');
        nos.forEach(function (n, j) {
          if (j < i) n.className = 'node feito';
          else if (j === i) n.className = 'node ativo';
        });
        nos[i].querySelector('small').textContent = texto;
        if (!semEspera) await esperar(750);
      };
      var falar = function (tipo, txt) { if (minha === execucao) chat(tipo, txt); };
      try {
        await CENARIOS[atual].rodar(passo, falar, opcaoEl.checked);
        nos.forEach(function (n) { n.className = 'node feito'; });
      } catch (e) { return; }
      botao.disabled = false;
      botao.querySelector('span').textContent = T.denovo;
    });

    montar();
  }

  /* ---------------- sites de exemplo: filtro por ramo ---------------- */
  (function () {
    var filtro = document.querySelector('.sites-filtro');
    if (!filtro) return;
    var cards = [].slice.call(document.querySelectorAll('.sites-grade .site-c'));
    filtro.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]');
      if (!b) return;
      var cat = b.getAttribute('data-cat');
      [].forEach.call(filtro.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cards.forEach(function (c) { c.hidden = cat === 'todos' ? !c.hasAttribute('data-destaque') : c.getAttribute('data-cat') !== cat; });
    });
  })();

  /* ---------------- carrosséis no celular: pontos com a posição ---------------- */
  (function () {
    [].forEach.call(document.querySelectorAll('.prod, .sites-grade'), function (trilho) {
      var pontos = document.createElement('div');
      pontos.className = 'carrossel-pontos';
      pontos.setAttribute('aria-hidden', 'true');
      trilho.parentNode.insertBefore(pontos, trilho.nextSibling);
      function itens() { return [].filter.call(trilho.children, function (c) { return !c.hidden; }); }
      function desenhar() {
        var l = itens(), passo = l.length > 1 ? l[1].offsetLeft - l[0].offsetLeft : 1;
        var atual = Math.min(l.length - 1, Math.max(0, Math.round(trilho.scrollLeft / (passo || 1))));
        pontos.innerHTML = l.map(function (_, i) { return '<i' + (i === atual ? ' class="on"' : '') + '></i>'; }).join('') + '<span>' + (atual + 1) + ' de ' + l.length + '</span>';
      }
      var agendado = false;
      trilho.addEventListener('scroll', function () { if (agendado) return; agendado = true; requestAnimationFrame(function () { agendado = false; desenhar(); }); }, { passive: true });
      // o filtro dos sites muda quantos aparecem: volta ao começo e redesenha
      var filtro = document.querySelector('.sites-filtro');
      if (filtro && trilho.classList.contains('sites-grade')) filtro.addEventListener('click', function () { setTimeout(function () { trilho.scrollLeft = 0; desenhar(); }, 0); });
      desenhar();
    });
  })();

  /* ---------------- vitrine de sites (nicho e dispositivo) ---------------- */
  document.querySelectorAll('[data-vitrine]').forEach(function (v) {
    var frame = v.querySelector('iframe');
    var palco = v.querySelector('.vitrine-palco');
    var abrir = v.querySelector('[data-abrir]');
    var marcar = function (grupo, botao) {
      v.querySelectorAll('button[data-' + grupo + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
    };
    v.querySelectorAll('button[data-site]').forEach(function (b) {
      b.addEventListener('click', function () {
        frame.src = b.dataset.site;
        frame.title = b.dataset.titulo || b.textContent.trim();
        if (abrir) abrir.href = b.dataset.site;
        marcar('site', b);
      });
    });
    v.querySelectorAll('button[data-dispositivo]').forEach(function (b) {
      b.addEventListener('click', function () { palco.dataset.dispositivo = b.dataset.dispositivo; marcar('dispositivo', b); });
    });
  });

  /* ---------------- origem do link ----------------
   * Os agentes do Escritório mandam links com ?origem=redator-n12.
   * Guardamos só esse código (nada pessoal) enquanto a pessoa navega
   * pelo site, para o pedido chegar dizendo de onde veio. */
  var origem = '';
  try {
    var daUrl = new URLSearchParams(location.search).get('origem') || '';
    if (/^[a-z0-9-]{1,60}$/i.test(daUrl)) { origem = daUrl.toLowerCase(); sessionStorage.setItem('br-origem', origem); }
    else origem = sessionStorage.getItem('br-origem') || '';
  } catch (e) { origem = ''; }
  // com consentimento de marketing, o pedido também diz de qual divulgação a pessoa veio (cookie br_origem)
  try {
    var ck = document.cookie.match(/(?:^|; )br_origem=([^;]*)/);
    if (!origem && ck && window.brConsentimento && window.brConsentimento('marketing')) {
      var o = JSON.parse(decodeURIComponent(ck[1]));
      origem = ['campanha', o.s, o.m, o.c].filter(Boolean).join(':').replace(/[^\w:. -]/g, '').slice(0, 60);
    }
  } catch (e) { /* sem cookie de origem */ }
  var ind = document.cookie.match(/(?:^|; )br_indica=([A-Z0-9]{6,16})/);
  if (ind) origem = (origem ? origem + ' · ' : '') + 'indicacao:' + ind[1];

  /* ---------------- formulário de contato ---------------- */
  var form = document.querySelector('[data-form-contato]');
  if (form) {
    var M = EN ? {
      nome: 'Tell me your name.', msg: 'Describe in a few words what you want to automate (at least 10 characters).',
      wa: 'Check the WhatsApp number (with area code).',
      aberto: 'WhatsApp opened with your message ready. Just press send.', semWa: 'WhatsApp did not open? Use the email option below.',
      enviando: 'Sending…', recebido: 'Got it! Your request is already with our team. I will reply within 1 business day.',
      falhou: 'Could not send right now. Opening WhatsApp with your message instead.',
      aceite: 'Please confirm you agree to the Privacy Policy and the Terms.', tambemWa: 'Also send it on WhatsApp',
      ola: 'Hi! I came from the BLUE ROSE website.', nomeL: 'Name', negocioL: 'Business', interesseL: 'Interested in', msgL: 'Message', refL: 'Link code', assunto: 'Project from the BLUE ROSE website',
    } : {
      nome: 'Diga seu nome.', msg: 'Conte em poucas palavras o que você quer automatizar (pelo menos 10 caracteres).',
      wa: 'Confira o número de WhatsApp (com DDD).',
      aberto: 'Abrimos o WhatsApp com sua mensagem pronta. É só apertar enviar.', semWa: 'O WhatsApp não abriu? Use a opção de e-mail logo abaixo.',
      enviando: 'Enviando…', recebido: 'Recebido! Seu pedido já está com o nosso time. Respondo em até 1 dia útil.',
      falhou: 'Não consegui enviar agora. Vou abrir o WhatsApp com a sua mensagem.',
      aceite: 'Confirme que concorda com a Política de Privacidade e os Termos.', tambemWa: 'Mandar pelo WhatsApp também',
      ola: 'Oi! Vim pelo site da BLUE ROSE.', nomeL: 'Nome', negocioL: 'Negócio', interesseL: 'Interesse', msgL: 'Mensagem', refL: 'Código do link', assunto: 'Projeto pelo site da BLUE ROSE',
    };
    var VERSAO_TERMOS = '2026-10-14'; // data da versão em vigor dos Termos e da Política de Privacidade
    var status = form.querySelector('[data-status]');
    var botaoEnviar = form.querySelector('button[type="submit"]');
    var LEADS = window.BR_LEADS && window.BR_LEADS.url && window.BR_LEADS.chave ? window.BR_LEADS : null;
    var valor = function (nome) { var d = new FormData(form); return String(d.get(nome) || '').trim(); };
    var campoErro = function (nome, texto) {
      var campo = form.querySelector('[data-campo="' + nome + '"]');
      var erro = campo.querySelector('.erro');
      if (texto) { campo.setAttribute('data-invalido', ''); erro.textContent = texto; }
      else { campo.removeAttribute('data-invalido'); erro.textContent = ''; }
      return !texto;
    };
    var montarTexto = function () {
      var interesses = new FormData(form).getAll('interesse');
      return [
        M.ola,
        M.nomeL + ': ' + valor('nome'),
        valor('negocio') ? M.negocioL + ': ' + valor('negocio') : '',
        interesses.length ? M.interesseL + ': ' + interesses.join(', ') : '',
        M.msgL + ': ' + valor('mensagem'),
        origem ? '(' + M.refL + ': ' + origem + ')' : '',
      ].filter(Boolean).join('\n');
    };
    var validar = function () {
      var digitos = valor('whatsapp').replace(/\D/g, '');
      var ok1 = campoErro('nome', valor('nome').length < 2 ? M.nome : '');
      var ok2 = campoErro('whatsapp', digitos && (digitos.length < 10 || digitos.length > 13) ? M.wa : '');
      var ok3 = campoErro('mensagem', valor('mensagem').length < 10 ? M.msg : '');
      var aceite = form.querySelector('[name="aceite"]');
      var ok4 = !aceite || campoErro('aceite', aceite.checked ? '' : M.aceite);
      var primeiro = !ok1 ? 'nome' : !ok2 ? 'whatsapp' : !ok3 ? 'mensagem' : !ok4 ? 'aceite' : null;
      if (primeiro) form.querySelector('[name="' + primeiro + '"]').focus();
      return ok1 && ok2 && ok3 && ok4;
    };
    var abrirWhatsApp = function () {
      if (!window.BR_WA) { status.textContent = M.semWa; return; }
      window.open('https://wa.me/' + window.BR_WA + '?text=' + encodeURIComponent(montarTexto()), '_blank', 'noopener');
      status.textContent = M.aberto;
    };
    /* Grava o pedido na fila do Escritório (Supabase). A chave pública só pode inserir. */
    var enviarParaOTime = function () {
      return fetch(LEADS.url.replace(/\/$/, '') + '/rest/v1/leads_site', {
        method: 'POST',
        headers: { apikey: LEADS.chave, Authorization: 'Bearer ' + LEADS.chave, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          nome: valor('nome').slice(0, 120),
          negocio: valor('negocio').slice(0, 160) || null,
          whatsapp: valor('whatsapp').slice(0, 30) || null,
          interesses: new FormData(form).getAll('interesse').slice(0, 8),
          mensagem: valor('mensagem').slice(0, 2000),
          origem: origem || null,
          pagina: location.pathname.slice(0, 200),
          idioma: EN ? 'en' : 'pt-BR',
          aceite_termos: true,
          versao_termos: VERSAO_TERMOS,
        }),
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
    };
    form.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
        var campo = el.closest('[data-campo]');
        if (campo && campo.hasAttribute('data-invalido')) campoErro(campo.dataset.campo, '');
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (valor('site_empresa')) return; // armadilha para robôs: campo invisível preenchido
      if (!validar()) return;
      if (!LEADS) { abrirWhatsApp(); return; }
      botaoEnviar.disabled = true;
      status.textContent = M.enviando;
      enviarParaOTime().then(function () {
        status.textContent = M.recebido;
        // além de ficar salvo, dá para mandar o mesmo texto pelo WhatsApp e ser atendido na hora
        if (window.BR_WA) {
          var wa = document.createElement('a');
          wa.className = 'btn btn-ghost status-wa';
          wa.href = 'https://wa.me/' + window.BR_WA + '?text=' + encodeURIComponent(montarTexto());
          wa.target = '_blank'; wa.rel = 'noopener';
          wa.textContent = M.tambemWa;
          status.appendChild(document.createElement('br'));
          status.appendChild(wa);
        }
        form.reset();
      }).catch(function () {
        status.textContent = M.falhou;
        abrirWhatsApp();
      }).then(function () { botaoEnviar.disabled = false; });
    });
    var porEmail = document.querySelector('[data-email-form]');
    if (porEmail) {
      porEmail.addEventListener('click', function (e) {
        if (!window.BR_EMAIL) return;
        e.preventDefault();
        if (!validar()) return;
        if (window.BR_abrirEmail) window.BR_abrirEmail(M.assunto, montarTexto());
        else window.location.href = 'mailto:' + window.BR_EMAIL + '?subject=' + encodeURIComponent(M.assunto) + '&body=' + encodeURIComponent(montarTexto());
      });
    }
  }
})();

/* Plano escolhido ou modelo vindo de um site de exemplo: já deixa a mensagem do formulário escrita */
(function () {
  var msg = document.getElementById('f-msg');
  if (!msg) return;
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  function preencher(texto) {
    if (!texto) return;
    msg.value = texto;
    msg.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.querySelectorAll('[data-plano]').forEach(function (b) {
    b.addEventListener('click', function () { preencher(b.getAttribute('data-plano')); setTimeout(function () { msg.focus({ preventScroll: true }); }, 500); });
  });
  var q = new URLSearchParams(location.search);
  /* valores vindos do link: sem quebra de linha e no máximo 60 caracteres */
  var limpaLink = function (v) { return String(v || '').replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 60); };
  var modelo = limpaLink(q.get('modelo')), nome = limpaLink(q.get('nome'));
  if (modelo) {
    preencher(en
      ? 'Hi! I liked the "' + modelo + '" website model' + (nome ? ' for ' + nome : '') + ' and want one like it.'
      : 'Olá! Gostei do modelo de site "' + modelo + '"' + (nome ? ' para o ' + nome : '') + ' e quero um assim.');
    var neg = document.getElementById('f-negocio');
    if (neg && nome && !neg.value) neg.value = nome;
  }
})();

/* Seletor de idioma (globo): abre/fecha, lembra a escolha e sugere a versão em inglês sem redirecionar */
(function () {
  document.querySelectorAll('[data-idioma-br]').forEach(function (box) {
    var btn = box.querySelector('button');
    var fechar = function () { box.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = !box.classList.contains('aberto');
      box.classList.toggle('aberto', abrir); btn.setAttribute('aria-expanded', String(abrir));
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fechar(); } });
    box.querySelectorAll('a[data-lang]').forEach(function (a) {
      a.addEventListener('click', function () { try { localStorage.setItem('br-lang', a.getAttribute('data-lang')); } catch (e) {} });
    });
  });
  // Só na primeira visita à página inicial em português: se o navegador não está em português, oferece o inglês
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var alvo = document.querySelector('[data-idioma-br] a[data-lang="en"]');
  if (en || !alvo || !/(^\/$|index\.html$)/.test(location.pathname)) return;
  var salvo = null;
  try { salvo = localStorage.getItem('br-lang'); } catch (e) {}
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'pt';
  if (salvo || /^pt/i.test(nav)) return;
  var aviso = document.createElement('div');
  aviso.className = 'aviso-idioma'; aviso.setAttribute('role', 'region'); aviso.setAttribute('aria-label', 'Language');
  aviso.innerHTML = '<span lang="en">This page is also in English.</span><a lang="en" href="' + alvo.getAttribute('href') + '">View in English</a><button type="button" aria-label="Fechar / Close">×</button>';
  aviso.querySelector('a').addEventListener('click', function () { try { localStorage.setItem('br-lang', 'en'); } catch (e) {} });
  aviso.querySelector('button').addEventListener('click', function () { try { localStorage.setItem('br-lang', 'pt'); } catch (e) {} aviso.remove(); });
  document.body.appendChild(aviso);
})();

/* App Veltria na Play Store: enquanto o endereço estiver vazio, o selo mostra "Em breve".
   Quando o app for publicado, cole o link da Play Store aqui e publique o site. */
(function () {
  var BR_PLAY = '';
  if (!BR_PLAY) {
    document.querySelectorAll('[data-play][aria-disabled="true"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });
    return;
  }
  document.querySelectorAll('[data-play]').forEach(function (a) {
    a.href = BR_PLAY; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); a.title = 'Baixar o app na Play Store';
    var r = a.querySelector('[data-play-rot]'); if (r) r.textContent = 'Disponível no';
  });
})();

/* Aviso de cookies e preferências: ver js/cookies.js (carregado em todas as páginas). */

/* Sistemas na página inicial: destaques e categorias */
(function () {
  var filtro = document.querySelector('.prod-filtro');
  if (!filtro) return;
  var cards = [].slice.call(document.querySelectorAll('.prod-cat .prod-c')), infos = [].slice.call(document.querySelectorAll('.prod-cat-info'));
  filtro.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-pcat]'); if (!b) return;
    var cat = b.getAttribute('data-pcat');
    [].forEach.call(filtro.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    cards.forEach(function (c) { c.hidden = cat === 'destaque' ? !c.hasAttribute('data-destaque') : (c.getAttribute('data-cat') || '').split(' ').indexOf(cat) < 0; /* um cartão pode estar em mais de uma aba */ if (!c.hidden) c.classList.add('visto'); });
    infos.forEach(function (p) { p.hidden = p.getAttribute('data-info') !== cat; });
    var trilho = document.querySelector('.prod-cat'); if (trilho) { trilho.classList.toggle('so-destaque', cat === 'destaque'); trilho.scrollLeft = 0; trilho.dispatchEvent(new Event('scroll')); }
  });
  var mais = document.querySelector('[data-ir-cat]');
  if (mais) mais.addEventListener('click', function (e) { e.preventDefault(); var b = filtro.querySelector('[data-pcat="' + mais.getAttribute('data-ir-cat') + '"]'); if (b) { b.click(); filtro.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
})();

// Página publicada de novo chega sozinha: o navegador guarda cada página por até 10 minutos e uma aba aberta não recarrega.
// Ao abrir e ao voltar para a aba, compara a data da página com a do servidor; se houver uma mais nova, busca e recarrega.
// Uma tentativa por versão (se o servidor ainda não trocou, não fica recarregando).
(function () {
  var minha = Date.parse(document.lastModified);
  if (!minha || location.protocol !== 'https:') return;
  var confere = function () {
    if (document.hidden) return;
    fetch(location.pathname + location.search, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      var srv = Date.parse(r.headers.get('last-modified') || ''); if (!srv || srv - minha < 2000) return;
      var k = 'site-tentou:' + location.pathname; try { if (sessionStorage.getItem(k) === String(srv)) return; sessionStorage.setItem(k, String(srv)); } catch (e) { /* sem sessão */ }
      fetch(location.href, { cache: 'reload' }).catch(function () {}).then(function () { location.reload(); });
    }).catch(function () { /* sem internet */ });
  };
  setTimeout(confere, 1500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) confere(); });
})();

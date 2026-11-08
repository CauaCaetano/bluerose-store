// Alvorada Advocacia Previdenciária · barra de acessibilidade, menus, revelação suave, botão fixo do celular,
// busca nas dúvidas, filtro de artigos, lista de documentos por benefício e formulário que monta a mensagem.
// Nada aqui calcula benefício nem promete resultado: é orientação e organização de documentos.
(function () {
  'use strict';
  var doc = document, raiz = doc.documentElement, body = doc.body;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || doc).querySelectorAll(s)); };
  var MARCA = 'Alvorada Advocacia Previdenciária';

  function wa(msg) {
    if (window.BR_WA) { window.BR_WA(msg); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  // ---------- acessibilidade: letra, contraste, movimento (salvo neste aparelho) ----------
  var pref = {};
  try { pref = JSON.parse(localStorage.getItem('alv-acess') || '{}') || {}; } catch (e) {}
  var CLASSE = { letra: 'letra-grande', contraste: 'contraste', calmo: 'calmo' };
  function aplicar() {
    Object.keys(CLASSE).forEach(function (k) {
      raiz.classList.toggle(CLASSE[k], !!pref[k]);
      $$('[data-acess="' + k + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!pref[k])); });
    });
    $$('[data-acess="letra"] .rot').forEach(function (s) { s.textContent = pref.letra ? 'Letra normal' : 'Letra maior'; });
  }
  $$('[data-acess]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.acess; pref[k] = !pref[k];
      try { localStorage.setItem('alv-acess', JSON.stringify(pref)); } catch (e) {}
      aplicar();
      var av = $('#acess-aviso');
      if (av) av.textContent = { letra: pref.letra ? 'Letra ampliada ligada.' : 'Letra normal.', contraste: pref.contraste ? 'Contraste reforçado ligado.' : 'Contraste normal.', calmo: pref.calmo ? 'Movimentos da página desligados.' : 'Movimentos da página ligados.' }[k];
    });
  });
  aplicar();
  var calmo = function () { return raiz.classList.contains('calmo') || matchMedia('(prefers-reduced-motion: reduce)').matches; };

  // ---------- menu "Benefícios" no computador ----------
  $$('.nav-grupo').forEach(function (g) {
    var bt = $('button', g), painel = $('.nav-painel', g);
    function abre(sim) { bt.setAttribute('aria-expanded', String(sim)); painel.hidden = !sim; }
    bt.addEventListener('click', function (e) { e.stopPropagation(); abre(painel.hidden); });
    doc.addEventListener('click', function (e) { if (!g.contains(e.target)) abre(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !painel.hidden) { abre(false); bt.focus(); } });
    g.addEventListener('focusout', function (e) { if (e.relatedTarget && !g.contains(e.relatedTarget)) abre(false); });
  });

  // ---------- menu do celular ----------
  var menu = $('#menu-cel'), mbt = $('.menu-bt');
  function menuAbre(sim) {
    if (!menu) return;
    menu.hidden = !sim; mbt.setAttribute('aria-expanded', String(sim));
    body.classList.toggle('menu-aberto', sim); body.style.overflow = sim ? 'hidden' : '';
    if (sim) $('.menu-fecha', menu).focus(); else mbt.focus({ preventScroll: true });
  }
  if (mbt) mbt.addEventListener('click', function () { menuAbre(true); });
  if (menu) {
    $('.menu-fecha', menu).addEventListener('click', function () { menuAbre(false); });
    menu.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && !a.hasAttribute('data-wa')) { menu.hidden = true; body.classList.remove('menu-aberto'); body.style.overflow = ''; } });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) menuAbre(false); });
  }

  // ---------- revelação suave ----------
  var revs = $$('.rev');
  if ('IntersectionObserver' in window && !calmo()) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revs.forEach(function (r) { io.observe(r); });
  } else revs.forEach(function (r) { r.classList.add('visto'); });
  // garantia: nada fica invisível se o observador falhar
  setTimeout(function () { revs.forEach(function (r) { var b = r.getBoundingClientRect(); if (b.top < innerHeight) r.classList.add('visto'); }); }, 1200);

  // ---------- botão fixo do celular: desce quando a faixa da Blue Rose se esconde ----------
  var fixo = $('.fixo');
  function olhaPilula() {
    var pill = $('.br-pill');
    if (!pill || !fixo) return false;
    var atual = function () { fixo.classList.toggle('desce', pill.classList.contains('br-pill-esconde')); };
    new MutationObserver(atual).observe(pill, { attributes: true, attributeFilter: ['class'] });
    atual(); return true;
  }
  if (fixo && !olhaPilula()) {
    var tent = 0, t = setInterval(function () { if (olhaPilula() || ++tent > 20) clearInterval(t); }, 250);
  }
  // some enquanto um formulário está sendo preenchido, para não tapar o teclado
  if (fixo) {
    doc.addEventListener('focusin', function (e) { if (e.target.matches('input, select, textarea')) fixo.classList.add('some'); });
    doc.addEventListener('focusout', function (e) { if (e.target.matches('input, select, textarea')) fixo.classList.remove('some'); });
  }

  // ---------- índice da página: marca a seção que está na tela ----------
  var linksInd = $$('.indice a[href^="#"]');
  if (linksInd.length && 'IntersectionObserver' in window) {
    var mapa = {};
    linksInd.forEach(function (a) { var s = doc.getElementById(a.getAttribute('href').slice(1)); if (s) mapa[s.id] = a; });
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { linksInd.forEach(function (a) { a.classList.remove('aqui'); a.removeAttribute('aria-current'); }); var a = mapa[e.target.id]; if (a) { a.classList.add('aqui'); a.setAttribute('aria-current', 'location'); } }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(mapa).forEach(function (id) { io2.observe(doc.getElementById(id)); });
  }

  // ---------- dúvidas: busca por palavra e filtro por tema ----------
  var busca = $('#busca-duvidas');
  if (busca) {
    var pergs = $$('.perguntas .pergunta'), temaAtual = 'todos', info = $('#busca-info');
    var tira = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    function filtra() {
      var q = tira(busca.value.trim()), n = 0;
      pergs.forEach(function (p) {
        var ok = (temaAtual === 'todos' || p.dataset.tema === temaAtual) && (!q || tira(p.textContent).indexOf(q) >= 0);
        p.hidden = !ok; if (ok) n++;
      });
      $$('.grupo-duvidas').forEach(function (g) { g.hidden = !$$('.pergunta', g).some(function (p) { return !p.hidden; }); });
      info.textContent = n ? (n === 1 ? '1 pergunta encontrada.' : n + ' perguntas encontradas.') : 'Nenhuma pergunta com essas palavras. Tente outra palavra ou pergunte direto ao escritório pelo WhatsApp.';
      $('#sem-resultado').hidden = n > 0;
    }
    busca.addEventListener('input', filtra);
    $$('[data-tema-filtro]').forEach(function (b) {
      b.addEventListener('click', function () {
        temaAtual = b.dataset.temaFiltro;
        $$('[data-tema-filtro]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        filtra();
      });
    });
    $('#limpa-busca').addEventListener('click', function () { busca.value = ''; temaAtual = 'todos'; $$('[data-tema-filtro]').forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.temaFiltro === 'todos')); }); filtra(); busca.focus(); });
    filtra();
  }

  // ---------- artigos: filtro por tema ----------
  var filtArt = $$('[data-art-filtro]');
  if (filtArt.length) {
    filtArt.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.artFiltro, n = 0;
        filtArt.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        $$('.artigos .artigo-c:not(.artigo-cta)').forEach(function (c) { var ok = t === 'todos' || c.dataset.tema === t; c.hidden = !ok; if (ok) n++; });
        $('#art-info').textContent = n === 1 ? '1 artigo neste tema.' : n + ' artigos neste tema.';
      });
    });
  }

  // ---------- lista de documentos por benefício ----------
  var DOCS = {
    geral: { nome: 'Primeira conversa (qualquer assunto)', itens: [
      ['RG ou CNH', 'Documento com foto da pessoa que vai pedir o benefício.'],
      ['CPF', 'Pode estar no próprio RG ou na CNH.'],
      ['Comprovante de endereço', 'Conta de luz, água ou telefone recente.'],
      ['Carteiras de trabalho', 'Todas que tiver, inclusive as antigas e rasgadas.'],
      ['Extrato do CNIS', 'Retirado no Meu INSS ou numa agência. Se não souber tirar, a gente ajuda.'],
      ['Carta ou comunicado do INSS', 'Se já fez algum pedido, traga a carta de resposta ou o número do protocolo.']] },
    idade: { nome: 'Aposentadoria por idade ou por tempo', itens: [
      ['RG ou CNH e CPF', 'Documento com foto.'],
      ['Comprovante de endereço', 'Recente.'],
      ['Todas as carteiras de trabalho', 'Inclusive as antigas.'],
      ['Extrato do CNIS', 'Mostra os vínculos e contribuições que o INSS tem registrados.'],
      ['Carnês e guias de contribuição', 'Se pagou como autônomo ou facultativo (GPS, carnê).'],
      ['Certidões de tempo de serviço', 'Se trabalhou para prefeitura, estado ou no serviço militar.'],
      ['PPP e laudos da empresa', 'Se trabalhou com ruído, produtos químicos, calor ou outro agente nocivo.']] },
    rural: { nome: 'Aposentadoria rural', itens: [
      ['RG ou CNH e CPF', 'Documento com foto.'],
      ['Comprovante de endereço', 'Recente.'],
      ['Documentos da terra', 'Escritura, ITR, CCIR, contrato de arrendamento, parceria ou comodato.'],
      ['Notas de venda da produção', 'Notas fiscais de produtor, recibos de cooperativa ou de compra de insumos.'],
      ['Ficha do sindicato rural', 'Carteirinha, ficha de filiação ou declaração.'],
      ['Certidões com a profissão', 'Casamento, nascimento dos filhos, alistamento, onde apareça "lavrador" ou "agricultor".'],
      ['Extrato do CNIS', 'Para conferir se há vínculos urbanos registrados.']] },
    incapacidade: { nome: 'Incapacidade (auxílio ou aposentadoria por incapacidade)', itens: [
      ['RG ou CNH e CPF', 'Documento com foto.'],
      ['Carteiras de trabalho e CNIS', 'Para conferir as contribuições.'],
      ['Laudos e relatórios médicos', 'Com o nome da doença, o CID, a data de início e a assinatura do médico.'],
      ['Exames', 'Os mais recentes e os que mostram como começou.'],
      ['Receitas e atestados', 'Remédios em uso e afastamentos anteriores.'],
      ['Resultado da perícia do INSS', 'Se já passou por perícia, traga a carta ou a tela do Meu INSS.'],
      ['CAT', 'Se foi acidente de trabalho, a Comunicação de Acidente de Trabalho.']] },
    pensao: { nome: 'Pensão por morte', itens: [
      ['Certidão de óbito', 'Da pessoa que faleceu.'],
      ['Documentos da pessoa que faleceu', 'RG, CPF, carteiras de trabalho e, se tiver, número do benefício que ela recebia.'],
      ['Seus documentos', 'RG ou CNH, CPF e comprovante de endereço.'],
      ['Certidão de casamento ou prova de união estável', 'Contas no mesmo endereço, conta conjunta, fotos, declaração de imposto, filhos em comum.'],
      ['Certidão de nascimento dos filhos', 'Se houver filhos menores de 21 anos ou com deficiência.'],
      ['Carta do INSS', 'Se o pedido já foi feito e negado.']] },
    bpc: { nome: 'BPC/LOAS (benefício assistencial)', itens: [
      ['RG ou CNH e CPF de todos da casa', 'De cada pessoa que mora no mesmo endereço.'],
      ['Folha do CadÚnico atualizado', 'Comprovante do Cadastro Único feito no CRAS da cidade.'],
      ['Comprovante de endereço', 'Recente.'],
      ['Comprovantes de renda da casa', 'Holerites, extratos de benefícios ou declaração de quem não tem renda.'],
      ['Laudos e relatórios médicos', 'Quando o pedido for por deficiência: CID, histórico e limitações do dia a dia.'],
      ['Gastos com saúde', 'Receitas, notas de remédios, fraldas e tratamentos que a família paga.']] },
    revisao: { nome: 'Revisão de benefício', itens: [
      ['Carta de concessão do benefício', 'A carta que o INSS mandou quando o benefício foi aprovado.'],
      ['Extrato do CNIS', 'Para comparar com o que foi usado no cálculo.'],
      ['Carteiras de trabalho', 'Todas, inclusive as antigas.'],
      ['Holerites e recibos antigos', 'Se tiver, ajudam a conferir salários que não aparecem no CNIS.'],
      ['PPP e laudos', 'Se trabalhou exposto a agentes nocivos e isso não foi considerado.'],
      ['Extratos de pagamento do benefício', 'Os mais recentes, tirados no Meu INSS ou no banco.']] }
  };
  var lista = $('#checklist');
  if (lista) {
    var chave = 'alv-docs', marcados = {};
    try { marcados = JSON.parse(localStorage.getItem(chave) || '{}') || {}; } catch (e) {}
    var atual = 'geral';
    try { var qp = new URLSearchParams(location.search).get('para'); if (qp && DOCS[qp]) atual = qp; } catch (e) {}
    function desenha() {
      var d = DOCS[atual], m = marcados[atual] || {};
      $('#check-titulo').textContent = d.nome;
      lista.innerHTML = '';
      d.itens.forEach(function (it, i) {
        var li = doc.createElement('li'), lb = doc.createElement('label'), cb = doc.createElement('input'), tx = doc.createElement('div'), b = doc.createElement('b'), s = doc.createElement('span');
        cb.type = 'checkbox'; cb.checked = !!m[i];
        cb.addEventListener('change', function () { marcados[atual] = marcados[atual] || {}; marcados[atual][i] = cb.checked; try { localStorage.setItem(chave, JSON.stringify(marcados)); } catch (e) {} conta(); });
        b.textContent = it[0]; s.textContent = it[1];
        tx.appendChild(b); tx.appendChild(s); lb.appendChild(cb); lb.appendChild(tx); li.appendChild(lb); lista.appendChild(li);
      });
      $$('[data-docs]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.docs === atual)); });
      conta();
    }
    function conta() {
      var d = DOCS[atual], m = marcados[atual] || {}, n = d.itens.filter(function (x, i) { return m[i]; }).length;
      $('#check-conta').textContent = n === d.itens.length ? 'Você marcou todos os ' + n + ' itens. Pode levar a pasta para a conversa.' : 'Você já separou ' + n + ' de ' + d.itens.length + ' itens. O que faltar, a gente ajuda a conseguir.';
    }
    $$('[data-docs]').forEach(function (b) { b.addEventListener('click', function () { atual = b.dataset.docs; desenha(); }); });
    $('#check-wa').addEventListener('click', function () {
      var d = DOCS[atual], m = marcados[atual] || {}, tem = [], falta = [];
      d.itens.forEach(function (it, i) { (m[i] ? tem : falta).push(it[0]); });
      wa('Olá! Estou organizando os documentos para: ' + d.nome + '.\n' + (tem.length ? 'Já separei: ' + tem.join(', ') + '.\n' : '') + (falta.length ? 'Ainda não tenho: ' + falta.join(', ') + '.\n' : '') + 'Podem me orientar sobre o que levar na conversa?');
    });
    $('#check-imprime').addEventListener('click', function () { window.print(); });
    $('#check-limpa').addEventListener('click', function () { marcados[atual] = {}; try { localStorage.setItem(chave, JSON.stringify(marcados)); } catch (e) {} desenha(); });
    desenha();
  }

  // ---------- formulário de contato: monta a mensagem e abre o WhatsApp ou o e-mail (nada é enviado sozinho) ----------
  var form = $('#form-contato');
  if (form) {
    try { var qa = new URLSearchParams(location.search).get('assunto'); if (qa) [].forEach.call(form.assunto.options, function (o) { if (o.value === qa) form.assunto.value = qa; }); } catch (e) {}
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var er = $('.erro', form), okm = $('.ok', form);
      var nome = form.nome.value.trim(), tel = form.tel.value.replace(/\D/g, ''), assunto = form.assunto.value;
      var quem = (form.querySelector('input[name="quem"]:checked') || {}).value, per = form.periodo.value, canal = (form.querySelector('input[name="canal"]:checked') || {}).value;
      var falta = nome.length < 2 ? [form.nome, 'Escreva seu nome.'] : tel.length < 10 ? [form.tel, 'Confira o telefone: escreva o DDD e o número.'] : !assunto ? [form.assunto, 'Escolha o assunto.'] : !quem ? [form.querySelector('input[name="quem"]'), 'Diga se a conversa é sobre você ou sobre um familiar.'] : null;
      if (falta) { er.textContent = falta[1]; okm.hidden = true; falta[0].focus(); return; }
      er.textContent = '';
      var msg = 'Olá! Meu nome é ' + nome + '. Gostaria de uma orientação sobre ' + assunto.toLowerCase() + (quem === 'familiar' ? ', para um familiar' : '') + '. Melhor período para conversar: ' + per.toLowerCase() + '. Telefone: ' + form.tel.value.trim() + '.';
      if (canal === 'email') {
        location.href = 'mailto:contato@alvorada-exemplo.com.br?subject=' + encodeURIComponent('Pedido de orientação: ' + assunto) + '&body=' + encodeURIComponent(msg);
        okm.textContent = 'Abrimos o seu programa de e-mail com a mensagem pronta. Ela só chega ao escritório quando você clicar em enviar. (Endereço de exemplo.)';
      } else {
        wa(msg);
        okm.textContent = 'A conversa no WhatsApp foi aberta com a sua mensagem pronta. Ela só chega ao escritório quando você tocar em enviar.';
      }
      okm.hidden = false;
    });
  }
})();

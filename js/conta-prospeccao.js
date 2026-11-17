// Minha conta: Prospecção do Anshur (só o dono vê; o banco devolve nulo para as demais contas e sem a verificação em duas etapas).
// O painel NUNCA envia nada: ele monta a mensagem e abre o WhatsApp; quem aperta enviar é o dono.
(function () {
  'use strict';
  var C = window.BR_CONTA, bloco = document.getElementById('prospeccao');
  if (!C || !bloco) return;
  var esc = C.esc, cliente = null, D = null, aba = 'hoje', sel = null, filtro = { q: '', faixa: '', uf: '', etapa: '' };
  var SITE = 'https://bluerose-store.com/';
  var CELULAR = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  // uma aba por produto: cada um com a sua fila, os seus limites e a sua aprovação de textos
  // Trutina saiu da prospecção em 17/11 (dados ficam no banco); 17/11: uma aba para cada sistema à venda no site
  var PRODUTOS = {
    anshur: { nome: 'Anshur', alvo: 'revendas de máquinas' },
    agenda: { nome: 'Agenda', alvo: 'salões, barbearias, estética e quem atende com hora marcada' },
    financeiro: { nome: 'Financeiro', alvo: 'autônomos, MEIs e prestadores de serviço' },
    peplo: { nome: 'Peplo', alvo: 'lojas de roupas' },
    annona: { nome: 'Annona', alvo: 'mercadinhos, mercearias e empórios' },
    atria: { nome: 'Atria', alvo: 'profissionais da construção e da reforma' },
    popina: { nome: 'Popina', alvo: 'restaurantes, lanchonetes, pizzarias e bares' }
  };
  var produto = (function () { try { return PRODUTOS[localStorage.getItem('br-prosp-produto')] ? localStorage.getItem('br-prosp-produto') : 'anshur'; } catch (e) { return 'anshur'; } })();
  var ETAPAS = [['novo', 'Novo'], ['contatado', 'Contatado'], ['retomada1', 'Retomada 1'], ['retomada2', 'Retomada 2'], ['abriu_link', 'Abriu o link'],
    ['respondeu', 'Respondeu'], ['teste', 'Teste às cegas'], ['negociando', 'Negociando'], ['assinou', 'Assinou'], ['perdido', 'Perdido'], ['nao_contatar', 'Não contatar']];
  var NOME_ETAPA = {}; ETAPAS.forEach(function (e) { NOME_ETAPA[e[0]] = e[1]; });
  var ACAO = { primeiro: 'Primeiro contato', retomada1: 'Retomada 1', retomada2: 'Retomada 2 (última)' };

  function dia(d) { return d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) + '/' + String(d).slice(0, 4) : '—'; }
  function rpc(nome, args) { return cliente.rpc(nome, args || {}).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); }
  function fone(z) { var d = String(z || '').replace(/^55/, ''); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d; }
  function porId(id) { for (var i = 0; i < D.prospects.length; i++) if (D.prospects[i].id === id) return D.prospects[i]; return null; }
  function link(p) { return SITE + (SIS[p.produto] ? SIS[p.produto].pag : p.produto === 'safra' ? 'trutina.html' : 'anshur.html') + '?p=' + p.codigo; }

  // textos dos sistemas (aguardam a aprovação do dono em cada aba): benefício da página de cada sistema, preço e o link
  var SIS = {
    agenda: { pag: 'veltria-agenda.html', nome: 'Veltria Agenda', preco: 'R$ 49/mês (ou R$ 470/ano)', ramo: 'atende com hora marcada',
      dor: 'Quem marca horário pelo WhatsApp passa o dia respondendo "tem horário?" e ainda perde dinheiro com cliente que falta.',
      ganho: 'No Veltria Agenda a cliente marca sozinha pelo seu link, o sinal no Pix segura o horário e a confirmação sai pronta. Menos falta, menos horário vazio e menos tempo no WhatsApp.',
      conta: 'Uma falta por semana num serviço de R$ 60 são uns R$ 240 por mês. Evitar só uma já paga o mês do sistema.' },
    financeiro: { pag: 'veltria-financeiro.html', nome: 'Veltria Financeiro', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'trabalha por conta própria',
      dor: 'Para quem trabalha por conta própria, o difícil é saber quanto pode tirar para si, cobrar quem atrasa e não estourar o limite do MEI.',
      ganho: 'O Veltria Financeiro, no celular, divide cada entrada em potes, manda a cobrança com Pix e lembrete no WhatsApp, guarda as contas fixas e lê o extrato do banco.',
      conta: 'Receber em dia um único cliente que costuma atrasar já paga alguns meses do sistema.' },
    peplo: { pag: 'peplo.html', nome: 'Peplo', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'vende roupa',
      dor: 'Em loja de roupas, o dinheiro some no fiado que não volta e na peça que fica parada no estoque.',
      ganho: 'O Peplo põe limite e bloqueio para quem deve, manda a cobrança no WhatsApp, controla o estoque por tamanho e cor e mostra o caixa do dia e as peças paradas.',
      conta: 'Uma única cliente do fiado que volta a pagar já cobre meses do sistema.' },
    annona: { pag: 'annona.html', nome: 'Annona', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'tem mercadinho',
      dor: 'Em mercadinho, o lucro vai embora na mercadoria que vence na prateleira e no fiado sem controle, e no fim do mês fica difícil saber quanto sobrou.',
      ganho: 'O Annona controla o estoque com código de barras e validade por lote, dá entrada pela nota (XML), mostra o que está parado, o fiado com limite e o lucro de cada produto.',
      conta: 'Deixar de perder algumas caixas de produto vencido por mês já paga o sistema.' },
    atria: { pag: 'atria.html', nome: 'Atria', preco: 'R$ 39/mês no Básico (o Pro, com busca de trabalho, é R$ 50)', ramo: 'trabalha com obra e reforma',
      dor: 'Quem trabalha com obra perde serviço por demorar no orçamento e perde dinheiro cobrando no improviso.',
      ganho: 'O Atria é um app de celular que faz o orçamento por m², diária ou empreitada, cobra no Pix direto na sua conta, monta seu portfólio de antes e depois e funciona até sem internet. No Pro, ainda mostra trabalho na sua cidade.',
      conta: 'Fechar um serviço a mais por mês por mandar o orçamento na hora já paga o app várias vezes.' },
    popina: { pag: 'popina.html', nome: 'Popina', preco: 'R$ 79/mês (ou R$ 758/ano)', ramo: 'tem restaurante',
      dor: 'Em restaurante, pedido anotado no papel atrasa a cozinha, sai errado e some na hora de fechar a conta.',
      ganho: 'No Popina o pedido sai do celular do garçom e aparece na cozinha na hora, a mesa tem cardápio digital com QR, o delivery tem taxa por bairro e o caixa fecha com Pix e divisão de conta.',
      conta: 'Um pedido errado a menos por dia já paga o sistema no mês.' }
  };
  function mensagemSistema(p, acao) {
    var s = SIS[p.produto], l = link(p), e = String(p.empresa || '').split(' - ')[0].split(' (')[0];
    if (acao === 'retomada1') return [
      'Olá! Retomando rápido a mensagem sobre o ' + s.nome + '.',
      s.conta,
      'Dá para ver funcionando, sem cadastro: ' + l,
      'Se não for o momento, me avisa e eu paro por aqui.'].join('\n\n');
    if (acao === 'retomada2') return [
      'Olá! Última mensagem para não incomodar.',
      'Fica o resumo: ' + s.ganho,
      'Custa ' + s.preco + ', direto pelo site, sem fidelidade. Detalhes: ' + l,
      'Obrigado pela atenção!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Sou da Blue Rose Express, de Orlândia. Vi o perfil de ' + e + ' em ' + p.cidade + ', por isso a mensagem.',
      s.dor,
      s.ganho,
      'Dá para ver funcionando, sem cadastro: ' + l,
      'Custa ' + s.preco + ', sem fidelidade. Se não fizer sentido, é só me avisar que não mando mais mensagem.'].join('\n\n');
  }
  function recente(p) {
    if (!p.anuncios_data || !p.anuncios_usados) return false;
    return (new Date(D.hoje + 'T12:00:00') - new Date(p.anuncios_data + 'T12:00:00')) / 864e5 < 30;
  }

  // textos v2 aprovados pelo dono em 17/11/2026 (prospeccao-mensagens-v2-para-aprovar.md): benefícios, um pedido só
  function linkTeste(p) { return SITE + 'anshur/teste-as-cegas.html?p=' + p.codigo; }
  // Trutina (conferência de safra): textos aguardando a aprovação do dono no painel (botão "Textos aprovados" da aba Trutina)
  // associação, sindicato ou cooperativa: proposta de parceria para os associados, não venda direta
  function mensagemParceiro(p, acao, l, e) {
    if (acao === 'retomada1') return [
      'Olá! Retomando a mensagem sobre a conferência das cargas para os associados.',
      'Uma conta simples: numa entrega de 20 mil sacas, R$ 0,50 a menos por saca no desconto ou no preço são R$ 10 mil. Na cana, um ponto de ATR mal apurado em todas as cargas pesa da mesma forma.',
      'Para a ' + e + ' não tem custo nenhum: cada associado confere as 20 primeiras cargas de graça, e a entidade oferece isso como um benefício a mais.',
      'Como funciona: ' + l,
      'Se não for o momento, me avisa e eu paro por aqui.'].join('\n\n');
    if (acao === 'retomada2') return [
      'Olá! Última mensagem para não incomodar.',
      'Se fizer sentido oferecer aos associados: eles mandam o contrato, os romaneios ou tickets e a liquidação (foto ou PDF) e recebem em poucas horas as diferenças de peso, descontos, ATR, preço e valor, carga por carga.',
      'As 20 primeiras cargas de cada associado são grátis e não há custo para a entidade. Detalhes: ' + l,
      'Obrigado pela atenção!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Sou da Blue Rose Express, de Orlândia. Escrevo para a ' + e + ' porque temos um serviço que pode ser um benefício para os associados.',
      'Quando a safra é entregue, quase nenhum produtor confere carga por carga se o peso, os descontos de umidade e impureza, o ATR, o preço e o valor pago batem com o contrato. Uma diferença pequena por carga vira muito dinheiro no fim da safra.',
      'A gente faz essa conferência: o produtor manda o contrato, os romaneios e a liquidação (foto ou PDF) e recebe em poucas horas as diferenças em reais, com a mensagem pronta para cobrar o armazém ou a usina.',
      'Para o associado, as *20 primeiras cargas são grátis*. Para a entidade, não há custo nenhum. Basta divulgar, se achar que vale.',
      'Como funciona: ' + l,
      'Se não fizer sentido, é só me avisar que não mando mais mensagem.'].join('\n\n');
  }
  function mensagemSafra(p, acao) {
    var l = link(p), e = String(p.empresa || '').split(' - ')[0].split(' (')[0];
    if (/^Tipo: parceiro/.test(p.notas || '')) return mensagemParceiro(p, acao, l, e);
    if (acao === 'retomada1') return [
      'Olá! Retomando a mensagem sobre a conferência da safra.',
      'Uma conta simples: numa entrega de 20 mil sacas, R$ 0,50 a menos por saca no desconto ou no preço são R$ 10 mil que ficaram no armazém. É esse tipo de diferença que a gente acha, carga por carga.',
      'As 20 primeiras cargas a gente confere de graça. Depois, só cobra se achar diferença maior que o valor do serviço.',
      'Como funciona: ' + l,
      'Se não for o momento, me avisa e eu paro por aqui.'].join('\n\n');
    if (acao === 'retomada2') return [
      'Olá! Última mensagem para não incomodar.',
      'Se quiser conferir a safra: manda por aqui o contrato, os romaneios e a liquidação (foto ou PDF), e devolvemos em poucas horas as diferenças de peso, desconto de umidade/impureza, preço e valor, já com a mensagem pronta para cobrar o armazém ou a usina.',
      'As 20 primeiras cargas são grátis. Detalhes: ' + l,
      'Obrigado pela atenção!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Vi que ' + e + ' trabalha com ' + (/(cana|usina)/i.test((p.categorias || []).join(' ') + ' ' + (p.justificativa || '')) ? 'cana' : 'grãos') + ' em ' + p.cidade + '/' + p.uf + ', por isso a mensagem.',
      'Quando a safra é entregue, quase ninguém confere carga por carga se o peso, o desconto de umidade e impureza, o preço e o valor pago batem com o contrato. Uma diferença pequena por carga vira muito dinheiro no fim da safra.',
      'A gente faz essa conferência por você: manda por aqui o contrato, os romaneios e a liquidação (pode ser foto ou PDF) e em poucas horas recebe as diferenças em reais, com a mensagem pronta para cobrar o armazém ou a usina.',
      'As *20 primeiras cargas são grátis*. Depois, só cobra se achar diferença maior que o valor do serviço.',
      'Como funciona: ' + l,
      'Se não fizer sentido, é só me avisar que não mando mais mensagem.'].join('\n\n');
  }
  function mensagem(p, acao) {
    if (p.produto === 'safra') return mensagemSafra(p, acao);
    if (SIS[p.produto]) return mensagemSistema(p, acao);
    var lugar = p.cidade + '/' + p.uf, l = link(p), lt = linkTeste(p), e = p.empresa;
    // oferta de fundador só aparece enquanto houver vaga (some sozinha quando as 3 forem usadas)
    var vagas = Math.max(0, 3 - FUND.length);
    var fund = function (t) { return vagas ? [t] : []; };
    if (acao === 'retomada1') return [
      'Olá! Retomando rápido a mensagem sobre o usado da troca.',
      'Uma conta simples: se em uma troca de trator a revenda paga R$ 20 mil acima do que devia, esse valor sai direto do lucro da venda. Basta evitar isso *uma vez* para pagar 10 meses do Anshur (R$ 2.000/mês, todas as lojas, sem implantação e sem fidelidade).',
      'Quer ver se isso acontece aí? O teste com as trocas de vocês mostra na hora:\n' + lt].concat(fund(
      'E ainda há vaga na oferta de fundador: as 3 primeiras revendas usam o *1º mês sem custo*.'), [
      'Se preferir só olhar o sistema funcionando: ' + l,
      'Se não for o momento, me avisa e eu paro por aqui.']).join('\n\n');
    if (acao === 'retomada2') return [
      'Olá! Última mensagem para não incomodar.',
      'Fica o resumo: o Anshur ajuda a ' + e + ' a não pagar caro no usado da troca, a enxergar o dinheiro parado no pátio e a só fechar acima do valor máximo com aprovação do gerente ou do dono.',
      'Contratação direto pelo site, sem reunião: R$ 2.000/mês, todas as lojas, sem implantação e sem fidelidade. Cancela quando quiser.'].concat(fund(
      'Se entrar agora, ainda pega uma das últimas vagas de fundador: *1º mês sem custo*.'), [
      'Teste com as trocas de vocês: ' + lt + '\nDemonstração: ' + l,
      'Obrigado pela atenção!\nBlue Rose Express']).join('\n\n');
    return ['Olá, tudo bem?',
      'Vi que a ' + e + ' trabalha com máquinas usadas em ' + lugar + ', por isso a mensagem.',
      'Em revenda, boa parte do lucro da venda da máquina nova vai embora no usado que entra na troca: paga-se um pouco a mais para fechar o negócio, a máquina fica parada no pátio e, quando vende, a margem já sumiu.',
      'O Anshur mostra *antes de fechar* o valor máximo que a ' + e + ' pode pagar naquele usado sem perder dinheiro, com base nas trocas que vocês mesmos já venderam.',
      'Dá para conferir isso com números de vocês, de graça e sem cadastro: coloque 5 trocas antigas e veja, troca por troca, quanto teria ficado no caixa:\n' + lt,
      'Leva uns 5 minutos e nada sai do seu computador.'].concat(fund(
      'E as 3 primeiras revendas que entrarem usam o *1º mês sem custo* (oferta de fundador).'), [
      'Se não fizer sentido para vocês, é só me avisar que não mando mais mensagem.']).join('\n\n');
  }

  function acaoNaFila(id) {
    var f = D.fila, l = (f.retomadas || []).concat(f.novos || []);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i].acao;
    return null;
  }

  function cartao(p, acao) {
    var ap = D.config.textos_aprovados, msg = acao ? mensagem(p, acao) : null, ev = D.eventos[p.id] || {};
    var final = p.etapa === 'nao_contatar';
    var botao = '';
    if (acao) {
      if (!p.whatsapp) botao = '<button type="button" class="btn btn-primary" disabled>Sem WhatsApp publicado</button>';
      else if (p.contato_confirmar) botao = '<button type="button" class="btn btn-primary" disabled>Contato a confirmar</button>';
      else if (!ap) botao = '<button type="button" class="btn btn-primary pp-zap" disabled title="Marque “Textos aprovados” no topo do painel">Abrir WhatsApp com a mensagem</button>';
      // no computador abre sempre na MESMA aba do WhatsApp Web (janela "br-whatsapp"), sem abrir o app nem uma aba nova a cada cliente;
      // no celular segue pelo wa.me (abre o app). O envio continua sendo do dono: a mensagem chega pronta e ele aperta Enter.
      else botao = '<a class="btn btn-primary pp-zap" data-enviar="' + p.id + '" data-acao="' + acao + '" target="' + (CELULAR ? '_blank' : 'br-whatsapp') + '" rel="noreferrer" href="' +
        (CELULAR ? 'https://wa.me/' + esc(p.whatsapp) + '?text=' : 'https://web.whatsapp.com/send?phone=' + esc(p.whatsapp) + '&text=') + encodeURIComponent(msg) + '">' +
        (CELULAR ? 'Abrir WhatsApp com a mensagem' : 'Mandar pelo WhatsApp Web') + '</a>';
    }
    return '<article class="pp-cartao" data-id="' + p.id + '">' +
      '<header><h4>' + esc(p.empresa) + '</h4><span class="pp-faixa f' + esc(p.faixa) + '">Faixa ' + esc(p.faixa) + ' · ' + p.pontuacao + ' pts</span>' +
      (acao ? '<span class="pp-acao">' + esc(ACAO[acao]) + '</span>' : '') + '<span class="pp-etapa">' + esc(NOME_ETAPA[p.etapa] || p.etapa) + '</span></header>' +
      '<dl class="pp-dados">' +
      '<div><dt>Cidade</dt><dd>' + esc(p.cidade || '—') + '/' + esc(p.uf) + (p.lojas && p.lojas.length > 1 ? ' (' + p.lojas.length + ' lojas)' : '') + '</dd></div>' +
      '<div><dt>WhatsApp da empresa</dt><dd>' + (p.whatsapp ? esc(fone(p.whatsapp)) : '—') + '</dd></div>' +
      '<div><dt>Telefone</dt><dd>' + esc(p.telefone || '—') + '</dd></div>' +
      (p.produto !== 'anshur' ? '<div class="pp-larga"><dt>Ramo</dt><dd>' + esc((p.categorias || []).join(', ') || '—') + '</dd></div>' : '<div><dt>Anúncios de usados</dt><dd>' + (p.anuncios_usados || 0) + (p.anuncios_data ? ' <small>(contados em ' + dia(p.anuncios_data) + ')</small>' : '') + '</dd></div>' +
      '<div class="pp-larga"><dt>Categorias</dt><dd>' + esc((p.categorias || []).join(', ') || '—') + '</dd></div>' +
      '<div class="pp-larga"><dt>Marcas anunciadas</dt><dd>' + esc((p.marcas || []).join(', ') || '—') + '</dd></div>') +
      '<div><dt>Próximo contato</dt><dd>' + dia(p.proximo_contato) + '</dd></div>' +
      '<div><dt>Link próprio</dt><dd><code>?p=' + esc(p.codigo) + '</code>' + (ev.abriu_link ? ' · abriu ' + ev.abriu_link + 'x' : '') + (ev.demonstracao ? ' · demo ' + ev.demonstracao + 'x' : '') +
      (ev.teste_cegas ? ' · teste ' + ev.teste_cegas + 'x' : '') + (ev.assinar ? ' · assinar ' + ev.assinar + 'x' : '') + '</dd></div>' +
      '</dl>' +
      '<p class="pp-just"><b>Por que esta prioridade:</b> ' + esc(p.justificativa) + '</p>' +
      (p.contato_confirmar && !final ? '<form class="pp-confirmar" data-confirmar="' + p.id + '"><p class="af-aviso"><b>Contato a confirmar:</b> ' + esc(p.contato_obs || 'contato não achado na página da própria empresa') +
        '. Fica fora da fila até você confirmar o WhatsApp na página da empresa.</p><label>WhatsApp da empresa (DDD + celular)<input name="z" inputmode="tel" maxlength="20" value="' +
        esc(p.whatsapp ? fone(p.whatsapp) : '') + '"></label><button class="btn btn-ghost">Confirmar contato</button><span role="status"></span></form>' : '') +
      '<details class="pp-fontes"><summary>Fontes (' + (p.fontes || []).length + ')</summary><ul>' + (p.fontes || []).map(function (f) {
        var u = /^https:\/\//.test(f.url || '') ? f.url : null;
        return '<li>' + esc(f.fonte) + ', ' + dia(f.data) + (u ? ': <a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u.replace(/^https:\/\/(www\.)?/, '').slice(0, 70)) + '</a>' : '') + '</li>';
      }).join('') + '</ul></details>' +
      (msg ? '<p class="pp-rot">Mensagem pronta (' + esc(ACAO[acao]) + ')</p><div class="pp-msg" tabindex="0">' + esc(msg) + '</div>' : '') +
      (final ? '<p class="af-aviso">Esta empresa pediu para não ser contatada. Fica fora da fila para sempre.</p>' :
        '<div class="af-acoes pp-botoes">' + botao +
        '<button type="button" class="btn btn-ghost" data-etapa="respondeu">Respondeu</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="teste">' + (p.produto === 'safra' ? 'Mandou os papéis' : p.produto === 'anshur' ? 'Teste às cegas' : 'Viu a demonstração') + '</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="negociando">Negociando</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="assinou">Assinou</button>' +
        '<button type="button" class="btn btn-ghost" data-etapa="perdido">Perdido</button>' +
        '<button type="button" class="btn btn-ghost pp-perigo" data-etapa="nao_contatar">Não contatar mais</button></div>') +
      (acao && !ap && p.whatsapp ? '<p class="pp-nota-bloq">O botão abre só depois que você aprovar os textos no topo do painel.</p>' : '') +
      '<form class="pp-nota" data-nota="' + p.id + '"><label>Nota sua<textarea name="n" rows="2" maxlength="4000">' + esc(p.notas || '') + '</textarea></label>' +
      '<button class="btn btn-ghost">Salvar nota</button><span role="status"></span></form>' +
      '<p class="pp-status" role="status"></p></article>';
  }

  function telaHoje() {
    var f = D.fila, l = (f.retomadas || []).concat(f.novos || []);
    var h = '<p class="pp-cont">Hoje: <b>' + f.feitos_novos + ' de ' + f.limite_novos + '</b> contatos novos e <b>' + f.feitos_retomadas + ' de ' + f.limite_retomadas + '</b> retomadas.</p>';
    if (!l.length) return h + '<p class="ind-regras">Nada na fila agora. Volte amanhã: as retomadas aparecem sozinhas no dia certo.</p>';
    return h + l.map(function (x) { var p = porId(x.id); return p ? cartao(p, x.acao) : ''; }).join('');
  }
  function telaQuadro() {
    return '<div class="pp-quadro">' + ETAPAS.map(function (e) {
      var l = D.prospects.filter(function (p) { return p.etapa === e[0]; });
      return '<section class="pp-coluna"><h4>' + esc(e[1]) + ' <b>' + l.length + '</b></h4><ul>' + l.slice(0, 40).map(function (p) {
        return '<li><button type="button" class="pp-item" data-ver="' + p.id + '"><span>' + esc(p.empresa) + '</span><small>' + esc(p.faixa) + ' · ' + esc(p.uf) + '</small></button></li>';
      }).join('') + (l.length > 40 ? '<li class="pp-mais">e mais ' + (l.length - 40) + ' (veja em Todas)</li>' : '') + '</ul></section>';
    }).join('') + '</div>' + (sel ? detalhe() : '');
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
  function telaNumeros() {
    var m = D.metricas || [], t = { faixa: 'Todas', total: 0, contatados: 0, abriram: 0, responderam: 0, teste: 0, assinaram: 0, nao_contatar: 0 };
    m.forEach(function (x) { for (var k in t) if (k !== 'faixa') t[k] += x[k] || 0; });
    return '<div class="af-tabela"><table><thead><tr><th>Faixa</th><th>' + (produto === 'anshur' ? 'Revendas' : 'Empresas') + '</th><th>Contatadas</th><th>Abriram o link</th><th>Responderam</th><th>' + (produto === 'anshur' ? 'Teste às cegas' : 'Viu a demonstração') + '</th><th>Assinaram</th><th>Não contatar</th></tr></thead><tbody>' +
      m.concat([t]).map(function (x) {
        return '<tr><td>' + esc(x.faixa) + '</td><td>' + x.total + '</td><td>' + x.contatados + '</td><td>' + x.abriram + ' <small>(' + pct(x.abriram, x.contatados) + ')</small></td><td>' + x.responderam +
          ' <small>(' + pct(x.responderam, x.contatados) + ')</small></td><td>' + x.teste + ' <small>(' + pct(x.teste, x.contatados) + ')</small></td><td>' + x.assinaram + ' <small>(' + pct(x.assinaram, x.contatados) + ')</small></td><td>' + x.nao_contatar + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ind-regras">Porcentagens sobre as revendas contatadas. "Abriu o link" conta quem entrou pelo link próprio da mensagem.</p>';
  }
  function passa(p) {
    if (filtro.faixa && p.faixa !== filtro.faixa) return false;
    if (filtro.uf && p.uf !== filtro.uf) return false;
    if (filtro.etapa && p.etapa !== filtro.etapa) return false;
    if (filtro.q) { var q = filtro.q.toLowerCase(); if ((p.empresa + ' ' + p.cidade).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }
  function telaTodas() {
    var ufs = {}; D.prospects.forEach(function (p) { ufs[p.uf] = 1; });
    var opt = function (l, v) { return l.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    var l = D.prospects.filter(passa);
    return '<form class="pp-filtro" id="pp-filtro"><label>Buscar<input name="q" value="' + esc(filtro.q) + '" placeholder="Empresa ou cidade"></label>' +
      '<label>Faixa<select name="faixa">' + opt([['', 'Todas'], ['A', 'A'], ['B', 'B'], ['C', 'C']], filtro.faixa) + '</select></label>' +
      '<label>UF<select name="uf">' + opt([['', 'Todas']].concat(Object.keys(ufs).sort().map(function (u) { return [u, u]; })), filtro.uf) + '</select></label>' +
      '<label>Etapa<select name="etapa">' + opt([['', 'Todas']].concat(ETAPAS), filtro.etapa) + '</select></label></form>' +
      '<p class="pp-cont">' + l.length + ' de ' + D.prospects.length + (produto === 'anshur' ? ' revendas' : ' empresas') + '</p>' +
      '<ul class="pp-lista">' + l.slice(0, 200).map(function (p) {
        return '<li><button type="button" class="pp-item" data-ver="' + p.id + '"><span><b>' + esc(p.empresa) + '</b> · ' + esc(p.cidade || '—') + '/' + esc(p.uf) + '</span>' +
          '<small>Faixa ' + esc(p.faixa) + ' · ' + p.pontuacao + ' pts · ' + (p.produto === 'anshur' ? (p.anuncios_usados || 0) + ' usados · ' : '') + esc(NOME_ETAPA[p.etapa]) + (p.proximo_contato ? ' · próximo ' + dia(p.proximo_contato) : '') + (p.whatsapp ? '' : ' · sem WhatsApp') + (p.contato_confirmar ? ' · contato a confirmar' : '') + '</small></button></li>';
      }).join('') + '</ul>' + (l.length > 200 ? '<p class="ind-regras">Mostrando 200. Use os filtros para achar as outras.</p>' : '') + (sel ? detalhe() : '');
  }
  function detalhe() { var p = porId(sel); return p ? '<div class="pp-detalhe" id="pp-detalhe">' + cartao(p, acaoNaFila(p.id)) + '</div>' : ''; }

  // oferta de fundador: as 3 primeiras revendas usam o 1º mês sem custo (o dono libera pelo e-mail da conta da revenda)
  var FUND = [];
  var MSG_FUND = { ok: 'Vaga liberada: a revenda já pode usar o Anshur por 30 dias, sem custo.', esgotado: 'As 3 vagas já foram usadas.', ja_e_fundador: 'Esse e-mail já é fundador.',
    sem_conta: 'Não achei conta confirmada com esse e-mail. Peça para a revenda criar a conta grátis em bluerose-store.com (Entrar › Criar conta) e confirmar o e-mail; depois libere aqui.',
    email_invalido: 'Confira o e-mail.', negado: 'Só a conta do dono, com o código do celular, libera vagas.' };
  function telaFundadores() {
    var rest = Math.max(0, 3 - FUND.length);
    return '<p class="ind-regras"><b>Oferta de fundador:</b> as 3 primeiras revendas usam o 1º mês sem custo. Em troca, no fim do mês, contam por escrito como foi (só publique com a autorização dela por escrito). Depois seguem no preço normal: a revenda assina pelo site e a liberação grátis é encerrada sozinha. <b>' + rest + ' de 3 vagas</b> livres.</p>' +
      (rest ? '<form class="af-form" id="pp-fund"><label>E-mail da conta da revenda<input name="e" type="email" required autocomplete="off" placeholder="voce@revenda.com.br"></label>' +
        '<label>Nome da revenda<input name="r" maxlength="120" placeholder="Ex.: WS Máquinas Agrícolas"></label><button class="btn btn-primary">Liberar 1º mês sem custo</button><span role="status"></span></form>' : '') +
      (FUND.length ? '<div class="af-tabela"><table><thead><tr><th>Revenda</th><th>Conta</th><th>Liberado em</th><th>Grátis até</th><th>Já assinou?</th></tr></thead><tbody>' + FUND.map(function (f) {
        return '<tr><td>' + esc(f.revenda || '—') + '</td><td>' + esc(f.email) + '</td><td>' + dia(String(f.liberado_em).slice(0, 10)) + '</td><td>' + dia(f.ate) + '</td><td>' + (f.pagando ? 'Sim' : 'Ainda não') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="ind-regras">Nenhuma vaga usada ainda.</p>');
  }

  function desenhar() {
    var c = D.config, abas = [['hoje', 'Fila de hoje'], ['quadro', 'Quadro'], ['numeros', 'Números'], ['todas', 'Todas']].concat(produto === 'anshur' ? [['fundadores', 'Fundadores']] : []);
    if (aba === 'fundadores' && produto !== 'anshur') aba = 'hoje';
    var tot = {}; (D.produtos || []).forEach(function (x) { tot[x.produto] = x.total; });
    bloco.hidden = false;
    bloco.innerHTML = '<h2>Prospecção <small>(só você vê)</small></h2>' +
      '<div class="pp-produtos" role="tablist" aria-label="Produto">' + Object.keys(PRODUTOS).map(function (k) {
        return '<button type="button" role="tab" class="pp-produto' + (produto === k ? ' on' : '') + '" data-produto="' + k + '" aria-selected="' + (produto === k) + '">' + esc(PRODUTOS[k].nome) + ' <b>' + (tot[k] || 0) + '</b></button>';
      }).join('') + '</div>' +
      '<p class="ind-regras"><b>' + esc(PRODUTOS[produto].nome) + ':</b> ' + D.prospects.length + ' ' + esc(PRODUTOS[produto].alvo) + ', só com contato comercial publicado. O painel monta a mensagem e abre o WhatsApp; quem envia é você. Nada sai sozinho.</p>' +
      '<div class="pp-aprov' + (c.textos_aprovados ? ' ok' : '') + '">' + (c.textos_aprovados
        ? '<p><b>Textos aprovados</b> em ' + dia(c.aprovado_em) + '. O botão de abrir o WhatsApp está ligado.</p><button type="button" class="btn btn-ghost" data-aprovar="0">Desfazer a aprovação</button>'
        : '<p><b>Textos ainda não aprovados.</b> Leia as mensagens nos cartões; enquanto não aprovar, o botão de abrir o WhatsApp fica desligado.</p><button type="button" class="btn btn-primary" data-aprovar="1">Textos aprovados</button>') +
      '<form class="pp-limites" id="pp-limites"><label>Novos por dia<input name="n" type="number" min="0" max="50" value="' + c.limite_novos + '"></label>' +
      '<label>Retomadas por dia<input name="r" type="number" min="0" max="50" value="' + c.limite_retomadas + '"></label><button class="btn btn-ghost">Salvar limites</button><span role="status"></span></form></div>' +
      '<div class="pd-filtros" role="tablist" aria-label="Partes da prospecção">' + abas.map(function (a) {
        return '<button type="button" role="tab" class="pd-filtro' + (aba === a[0] ? ' on' : '') + '" data-aba="' + a[0] + '" aria-selected="' + (aba === a[0]) + '">' + esc(a[1]) + '</button>';
      }).join('') + '</div><div id="pp-corpo">' + ({ hoje: telaHoje, quadro: telaQuadro, numeros: telaNumeros, todas: telaTodas, fundadores: telaFundadores }[aba])() + '</div>';
  }

  function recarregar() {
    return Promise.all([rpc('anshur_prosp_painel', { p_produto: produto }), produto === 'anshur' ? rpc('anshur_fundadores_lista').catch(function () { return null; }) : Promise.resolve(null)])
      .then(function (r) { if (r[1]) FUND = r[1]; if (r[0]) { D = r[0]; desenhar(); } });
  }
  function status(el, t) { var s = el && el.closest('.pp-cartao'); s = s && s.querySelector('.pp-status'); if (s) s.textContent = t; }

  bloco.addEventListener('click', function (e) {
    var t = e.target.closest('[data-produto],[data-aba],[data-ver],[data-etapa],[data-enviar],[data-aprovar]');
    if (!t) return;
    if (t.dataset.produto) {
      produto = t.dataset.produto; aba = 'hoje'; sel = null; filtro = { q: '', faixa: '', uf: '', etapa: '' };
      try { localStorage.setItem('br-prosp-produto', produto); } catch (er) { /* sem armazenamento */ }
      recarregar().catch(function (er) { alert('Não deu: ' + er.message); });
      return;
    }
    if (t.dataset.aba) { aba = t.dataset.aba; sel = null; desenhar(); return; }
    if (t.dataset.ver) { sel = Number(t.dataset.ver); desenhar(); var d = document.getElementById('pp-detalhe'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'start' }); return; }
    if (t.dataset.aprovar) {
      var sim = t.dataset.aprovar === '1';
      if (sim && !confirm('Confirma que leu e aprova os 3 textos (primeiro contato e as 2 retomadas)? Depois disso o botão abre o WhatsApp com a mensagem pronta, e você aperta enviar.')) return;
      rpc('anshur_prosp_config', { p_aprovados: sim, p_produto: produto }).then(recarregar).catch(function (er) { alert('Não deu: ' + er.message); });
      return;
    }
    var id = Number(t.closest('.pp-cartao').dataset.id);
    if (t.dataset.enviar) {
      // o link abre o WhatsApp (o navegador segue o href); aqui só fica registrado o contato e a próxima retomada
      status(t, 'Registrando o contato…');
      rpc('anshur_prosp_enviado', { p_id: id, p_acao: t.dataset.acao }).then(function () { return recarregar(); }).then(function () {
        var n = bloco.querySelector('.pp-cont'); if (n) n.insertAdjacentHTML('afterend', '<p class="af-aviso pp-ok">Contato registrado. Confira no WhatsApp e aperte enviar.</p>');
      }).catch(function (er) { status(t, 'Não registrou: ' + er.message); });
      return;
    }
    if (t.dataset.etapa) {
      var et = t.dataset.etapa;
      if (et === 'nao_contatar' && !confirm('Marcar como “Não contatar mais”? A revenda sai da fila para sempre e isso não se desfaz.')) return;
      t.disabled = true;
      rpc('anshur_prosp_etapa', { p_id: id, p_etapa: et }).then(recarregar).catch(function (er) { t.disabled = false; status(t, 'Não deu: ' + er.message); });
    }
  });
  bloco.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    var st = f.querySelector('[role=status]');
    if (f.id === 'pp-fund') {
      var em = f.e.value.trim(), rv = f.r.value.trim();
      if (!confirm('Liberar 30 dias de Anshur sem custo para ' + em + (rv ? ' (' + rv + ')' : '') + '? Isso usa 1 das 3 vagas de fundador e não se desfaz por aqui.')) return;
      if (st) st.textContent = 'Liberando…';
      rpc('anshur_fundador_liberar', { p_email: em, p_revenda: rv }).then(function (r) {
        if (r === 'ok') return recarregar().then(function () { var s = bloco.querySelector('#pp-corpo'); if (s) s.insertAdjacentHTML('afterbegin', '<p class="af-aviso pp-ok">' + esc(MSG_FUND.ok) + '</p>'); });
        if (st) st.textContent = MSG_FUND[r] || ('Não deu: ' + r);
      }).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    } else if (f.id === 'pp-limites') {
      rpc('anshur_prosp_config', { p_aprovados: null, p_limite_novos: Number(f.n.value), p_limite_retomadas: Number(f.r.value), p_produto: produto })
        .then(recarregar).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    } else if (f.dataset.confirmar) {
      if (!confirm('Confirma que achou esse WhatsApp na página da própria empresa? A revenda volta para a fila.')) return;
      if (st) st.textContent = 'Confirmando…';
      rpc('anshur_prosp_confirmar_contato', { p_id: Number(f.dataset.confirmar), p_whatsapp: f.z.value || null })
        .then(recarregar).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    } else if (f.dataset.nota) {
      if (st) st.textContent = 'Salvando…';
      rpc('anshur_prosp_nota', { p_id: Number(f.dataset.nota), p_nota: f.n.value }).then(function () {
        var p = porId(Number(f.dataset.nota)); if (p) p.notas = f.n.value; if (st) st.textContent = 'Nota salva.';
      }).catch(function (er) { if (st) st.textContent = 'Não deu: ' + er.message; });
    }
  });
  bloco.addEventListener('input', function (e) {
    var f = e.target.form; if (!f || f.id !== 'pp-filtro') return;
    filtro = { q: f.q.value, faixa: f.faixa.value, uf: f.uf.value, etapa: f.etapa.value };
    var pos = e.target.name, ini = e.target.selectionStart;
    desenhar();
    var el = document.querySelector('#pp-filtro [name=' + pos + ']'); if (el) { el.focus(); if (pos === 'q' && el.setSelectionRange) el.setSelectionRange(ini, ini); }
  });

  C.sb().then(function (c) {
    cliente = c;
    var feito = false;
    c.auth.onAuthStateChange(function (ev, s) {
      if (!s || feito) return;
      feito = true;
      setTimeout(function () { recarregar().catch(function () {}); }, 0);
    });
  }).catch(function () {});
})();

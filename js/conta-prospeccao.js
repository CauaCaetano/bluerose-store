// Minha conta: Prospecção do Anshur (só o dono vê; o banco devolve nulo para as demais contas e sem a verificação em duas etapas).
// O painel NUNCA envia nada: ele monta a mensagem e abre o WhatsApp; quem aperta enviar é o dono.
(function () {
  'use strict';
  var C = window.BR_CONTA, bloco = document.getElementById('prospeccao');
  if (!C || !bloco) return;
  var esc = C.esc, cliente = null, D = null, aba = 'hoje', sel = null, filtro = { q: '', faixa: '', uf: '', etapa: '' };
  var SITE = 'https://bluerose-store.com/';
  var CELULAR = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
  var ZAP = (function () { try { return localStorage.getItem('br-prosp-zap') === 'web' ? 'web' : 'app'; } catch (e) { return 'app'; } })();
  // uma aba por produto: cada um com a sua fila, os seus limites e a sua aprovação de textos
  // Trutina saiu da prospecção em 17/11 (dados ficam no banco); 17/11: uma aba para cada sistema à venda no site
  var PRODUTOS = {
    anshur: { nome: 'Anshur', alvo: 'revendas de máquinas' },
    // 19/11: agenda = Jano (ex-Veltria Agenda) e financeiro = Arca (ex-Veltria Financeiro); as chaves seguem as antigas no banco
    agenda: { nome: 'Jano', alvo: 'salões, barbearias, manicures, estética, clínicas, consultórios, personais e pet shops que atendem com hora marcada' },
    financeiro: { nome: 'Arca', alvo: 'empresas pequenas, médias e grandes (comércio, indústria, distribuidoras, serviços com equipe, transportadoras e agro), não MEI' },
    peplo: { nome: 'Peplo', alvo: 'lojas de roupas' },
    annona: { nome: 'Annona', alvo: 'mercadinhos, mercearias e empórios' },
    atria: { nome: 'Atria', alvo: 'profissionais da construção e da reforma' },
    popina: { nome: 'Popina', alvo: 'restaurantes, lanchonetes, pizzarias e bares' },
    // 20/11: Tecton (construção): um sistema, três ramos; o texto muda pelo ramo do prospect (categorias[0] ou "Ramo:" nas notas)
    tecton: { nome: 'Tecton', alvo: 'construtoras e empreiteiras, lojas de material de construção e imobiliárias, incorporadoras e loteadoras' }
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
    agenda: { pag: 'jano.html', nome: 'Jano', preco: 'R$ 49/mês (ou R$ 470/ano)', ramo: 'atende com hora marcada',
      dor: 'Quem marca horário pelo WhatsApp passa o dia respondendo "tem horário?" e ainda perde dinheiro com cliente que falta.',
      ganho: 'O Jano é um app de celular para quem atende com hora marcada: a cliente marca sozinha pelo seu link, o sinal no Pix segura o horário e a confirmação e o lembrete saem prontos. Menos falta, menos horário vazio e menos tempo no WhatsApp.',
      conta: 'Uma falta por semana num serviço de R$ 60 são uns R$ 240 por mês. Evitar só uma já paga o mês do sistema.',
        pergunta: 'Hoje a marcação de horário aí é toda pelo WhatsApp?', resumo: 'agenda online com o seu link · sinal no Pix · confirmação e lembrete no WhatsApp · ficha de cada cliente · app no celular', beneficios: ['*Falta vira dinheiro, não prejuízo:* com o sinal no Pix, quem marca e não vem já pagou parte do horário.', '*Sua agenda enche sozinha, 24 horas:* a cliente marca pelo seu link até enquanto você atende ou dorme.', '*Horas da sua semana de volta:* acaba o "tem horário?" no WhatsApp o dia inteiro.', '*Custa R$ 1,63 por dia:* menos que um café, e uma única falta evitada paga o mês.'], cena: 'Imagina acordar com a agenda da semana cheia, cada cliente marcando sozinha pelo seu link e o sinal já pago no Pix, sem você responder "tem horário?" o dia inteiro.' },
    financeiro: { pag: 'arca.html', nome: 'Arca', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'tem uma empresa',
      dor: 'Na empresa, o dinheiro do imposto e da folha se mistura com o do dia a dia, cliente atrasa sem ninguém cobrar e o extrato do banco nunca bate com a planilha.',
      ganho: 'O Arca é o financeiro completo da empresa, feito para usar no computador: contas a pagar e a receber de uma ou várias empresas, aprovação de pagamento, cobrança com Pix e lembrete no WhatsApp, conciliação do extrato do banco, fluxo de caixa, orçamento e DRE, e o pacote do mês pronto para o contador.',
      conta: 'Receber em dia um único cliente que costuma atrasar já paga alguns meses do sistema.',
        pergunta: 'Hoje o financeiro da empresa fica em planilha ou em algum sistema?', resumo: 'contas a pagar e a receber · cobrança com Pix · conciliação do extrato · fluxo de caixa · DRE · pacote para o contador · várias empresas', beneficios: ['*Dinheiro entrando em dia:* cobrança com Pix e lembrete automático, sem você ter o constrangimento de cobrar.', '*Nunca mais ser pego de surpresa:* você vê hoje quanto vai ter no caixa daqui a 30, 60 e 90 dias.', '*Horas de volta todo mês:* extrato conferido e o pacote pronto para o contador.', '*Custa R$ 1,97 por dia:* um único cliente que deixa de atrasar paga vários meses.'], cena: 'Imagina abrir o computador na segunda e ver numa tela só quanto entra, quanto sai e quem está atrasado, com o lembrete de cobrança saindo sozinho.' },
    peplo: { pag: 'peplo.html', nome: 'Peplo', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'vende roupa',
      dor: 'Em loja de roupas, o tamanho e a cor acabam sem ninguém perceber, a fila trava no caixa e no fim do mês ninguém sabe o que vendeu e o que encalhou.',
      ganho: 'O Peplo vende rápido no caixa com leitor de código de barras e pagamento dividido em Pix, cartão e dinheiro, controla o estoque por tamanho e cor, faz trocas, compras e o caixa do dia e mostra as mais vendidas e as peças paradas. Se a loja vende no crediário, também tem limite por cliente.',
      conta: 'Liquidar a tempo uma única peça que ia encalhar já paga o mês do sistema.',
        pergunta: 'Hoje o estoque por tamanho e cor aí é no caderno, na planilha ou de cabeça?', resumo: 'caixa com código de barras · estoque por tamanho e cor · trocas · crediário com limite · mais vendidas e peças paradas', beneficios: ['*Venda que não escapa:* você sabe na hora se tem o tamanho e a cor que a cliente pediu.', '*Dinheiro que não fica parado na arara:* o sistema aponta a peça encalhada a tempo de fazer promoção.', '*Caixa rápido, sem fila:* cliente bem atendida volta e compra mais.', '*Custa R$ 1,97 por dia:* uma peça a mais vendida por mês já paga o sistema.'], cena: 'Imagina saber na hora, pelo celular, qual tamanho acabou e qual peça está parada há 60 dias, antes de virar prejuízo.' },
    annona: { pag: 'annona.html', nome: 'Annona', preco: 'R$ 59/mês (ou R$ 566/ano)', ramo: 'tem mercadinho',
      dor: 'Em mercadinho, o lucro vai embora na mercadoria que vence na prateleira e no fiado sem controle, e no fim do mês fica difícil saber quanto sobrou.',
      ganho: 'O Annona controla o estoque com código de barras e validade por lote, dá entrada pela nota (XML), mostra o que está parado, o fiado com limite e o lucro de cada produto.',
      conta: 'Deixar de perder algumas caixas de produto vencido por mês já paga o sistema.',
        pergunta: 'Hoje vocês controlam a validade dos produtos de algum jeito ou só olhando a prateleira?', resumo: 'caixa com código de barras e balança · validade por lote · entrada pela nota (XML) · fiado com limite · lucro por produto', beneficios: ['*Pare de jogar dinheiro no lixo:* aviso antes do produto vencer, com tempo de vender.', '*Fiado sob controle:* limite por cliente, e o dinheiro volta para o caixa.', '*Compra certa:* você vê o que gira e o que está parado antes de repor.', '*Custa R$ 1,97 por dia:* poucas caixas que deixam de vencer já pagam o mês.'], cena: 'Imagina o sistema te avisar antes do produto vencer, com tempo de fazer promoção em vez de jogar no lixo.' },
    atria: { pag: 'atria.html', nome: 'Atria', preco: 'R$ 39/mês no Básico (o Pro, com busca de trabalho, é R$ 50)', ramo: 'trabalha com obra e reforma',
      dor: 'Quem trabalha com obra perde serviço por demorar no orçamento e perde dinheiro cobrando no improviso.',
      ganho: 'O Atria é um app de celular que faz o orçamento por m², diária ou empreitada, cobra no Pix direto na sua conta, monta seu portfólio de antes e depois e funciona até sem internet. No Pro, ainda mostra trabalho na sua cidade.',
      conta: 'Fechar um serviço a mais por mês por mandar o orçamento na hora já paga o app várias vezes.',
        pergunta: 'Hoje você manda orçamento escrito à mão ou digitado no WhatsApp?', resumo: 'orçamento por m², diária ou empreitada · cobrança no Pix · portfólio de antes e depois · funciona sem internet', beneficios: ['*Feche mais serviço:* orçamento profissional na hora, antes do concorrente terminar a conta.', '*Receba sem dor de cabeça:* Pix direto na sua conta, com o valor certo.', '*Seu trabalho vende por você:* portfólio de antes e depois no celular, pronto para mostrar.', '*Custa R$ 1,30 por dia:* um serviço a mais por mês paga o app várias vezes.'], cena: 'Imagina sair da visita e mandar na hora um orçamento bonito, com o seu nome e o Pix, antes de o concorrente terminar a conta.' },
    popina: { pag: 'popina.html', nome: 'Popina', preco: 'R$ 79/mês (ou R$ 758/ano)', ramo: 'tem restaurante',
      dor: 'Em restaurante, pedido anotado no papel atrasa a cozinha, sai errado e some na hora de fechar a conta.',
      ganho: 'O Popina é simples de usar: o restaurante ganha um cardápio online com link próprio (sem comissão por pedido), o cliente pede pelo celular e o pedido chega com aviso na tela, vai para a cozinha na hora e o cliente acompanha até a entrega. No salão, o garçom anota no celular e o caixa fecha com Pix, troco, 10% e conta dividida.',
      conta: 'Um pedido errado a menos por dia já paga o sistema no mês.',
        pergunta: 'Hoje os pedidos de delivery aí chegam pelo WhatsApp e alguém anota à mão?', resumo: 'cardápio online com link e QR · pedidos com aviso sonoro · tela da cozinha · mesas com QR e conta dividida · caixa com Pix · entregadores · equipe com senha · no computador e no celular', beneficios: ['*O lucro do pedido fica com você:* no seu link próprio não existe comissão. Numa conta simples, 300 pedidos de R$ 40 no mês com 15% de comissão seriam R$ 1.800 saindo do seu caixa.', '*Nenhum pedido perdido:* tudo chega na tela com aviso sonoro e vai direto para a cozinha, mesmo no pico de sexta à noite.', '*Seus clientes ficam com você:* nome, telefone e histórico de quem pede ficam no seu sistema, para chamar de volta quando quiser.', '*Custa R$ 2,63 por dia:* menos que o valor de um lanche, e um único pedido errado a menos por dia já paga o mês.'], cena: 'Imagina uma sexta à noite cheia: o cliente abre o seu link, escolhe o lanche e o pedido aparece na tela com aviso, direto para a cozinha, sem ninguém digitar nada e sem pagar comissão por pedido.' },
    tecton: { pag: 'tecton.html', nome: 'Tecton', preco: 'R$ 129/mês (ou R$ 1.238/ano)', ramo: 'trabalha com construção',
      ramos: {
        construtora: { ramo: 'toca obras',
          dor: 'Em construtora, o cronograma escorrega, a medição atrasa e só no fim se descobre se a obra deu lucro, enquanto o cliente liga pedindo notícia.',
          ganho: 'Com o Tecton, cada obra mostra na hora se está no prazo e dando lucro: cronograma, medições, diário com foto e o resultado de cada obra, e o cliente acompanha tudo por um link, sem precisar ligar. Funciona no computador e no celular do canteiro.',
          conta: 'Pegar a tempo um único estouro de material ou uma medição esquecida já paga vários meses do sistema.',
        pergunta: 'Hoje o acompanhamento das obras aí é em planilha?', resumo: 'cronograma · medições · diário de obra com foto · custo e lucro por obra · link para o cliente acompanhar', beneficios: ['*Descubra o prejuízo antes de ele acontecer:* o lucro de cada obra aparece na hora, não no fim.', '*Medição em dia, dinheiro no prazo:* nada fica esquecido para cobrar.', '*Cliente confiante indica você:* ele acompanha a obra por um link, sem ligar toda hora.', '*Custa R$ 4,30 por dia:* um único estouro de material evitado paga vários meses.'], cena: 'Imagina abrir uma tela e ver na hora qual obra está atrasada e qual está dando prejuízo, com o cliente acompanhando por um link sem te ligar.' },
        loja: { ramo: 'vende material de construção',
          dor: 'Em loja de material, o orçamento do WhatsApp se perde, a entrega sai sem conferência e o fiado do profissional cresce sem limite.',
          ganho: 'Com o Tecton, o balcão vende rápido e o orçamento sai pronto no WhatsApp, as entregas ficam agendadas e conferidas, cada obra tem a sua conta e o fiado do profissional tem limite. Funciona no computador do balcão e no celular de quem entrega.',
          conta: 'Receber um único fiado que ia ficar para trás já paga vários meses do sistema.',
        pergunta: 'Hoje os orçamentos do balcão saem pelo WhatsApp escritos à mão?', resumo: 'balcão e orçamento no WhatsApp · entregas agendadas · conta por obra · fiado com limite · estoque', beneficios: ['*Venda que não esfria:* o orçamento chega no WhatsApp do cliente em um minuto, antes de ele pedir na loja do lado.', '*Fiado que volta:* cada profissional com limite e conta por obra.', '*Entrega certa na primeira viagem:* menos frete perdido e menos cliente bravo.', '*Custa R$ 4,30 por dia:* um único fiado recebido paga vários meses.'], cena: 'Imagina o orçamento saindo pronto no WhatsApp do cliente em um minuto e cada fiado de profissional com limite, sem surpresa no fim do mês.' },
        imobiliaria: { ramo: 'vende e aluga imóveis',
          dor: 'Em imobiliária, o espelho de vendas vive em planilha, parcela e aluguel atrasam sem ninguém ver e a comissão vira discussão.',
          ganho: 'Com o Tecton, o espelho de vendas mostra na hora o que está livre, reservado e vendido, os contratos geram as parcelas sozinhos, o aluguel entra com o repasse ao proprietário já calculado e cada corretor vê a sua comissão. Funciona no computador e no celular.',
          conta: 'Cobrar em dia um único aluguel ou parcela atrasada já paga o mês do sistema.',
        pergunta: 'Hoje o espelho de vendas e os aluguéis ficam em planilha?', resumo: 'espelho de vendas · contratos e parcelas · aluguéis com repasse · comissão dos corretores', beneficios: ['*Dinheiro recebido em dia:* parcelas e aluguéis no controle, ninguém esquece de cobrar.', '*Venda mais rápida:* o corretor vê na hora o que está livre, sem vender o que já foi reservado.', '*Proprietário confiante:* repasse calculado certo, todo mês.', '*Custa R$ 4,30 por dia:* um único aluguel cobrado em dia paga o mês.'], cena: 'Imagina ver numa tela só o que está livre, reservado e vendido, e os aluguéis entrando com o repasse ao proprietário já calculado.' }
      } }
  };
  // texto do sistema; no Tecton, o do ramo do prospect (construtora, loja ou imobiliária)
  function ramoTecton(p) {
    var c = String((p.categorias || [])[0] || ''), n = String(p.notas || '');
    if (/^(construtora|loja|imobiliaria)$/.test(c)) return c;
    if (/Ramo: loja/i.test(n)) return 'loja';
    if (/Ramo: imobili/i.test(n)) return 'imobiliaria';
    return 'construtora';
  }
  function textosSis(p) {
    var s = SIS[p.produto], r = s.ramos && s.ramos[ramoTecton(p)];
    if (!r) return s;
    var o = {}, k;
    for (k in s) o[k] = s[k];
    for (k in r) o[k] = r[k];
    return o;
  }
  // 22/11/2026: textos no método de linha reta (Belfort), sem prometer o que não é verdade: abre com contexto e uma pergunta
  // que qualifica, mostra a cena do resultado com certeza, baixa o risco (7 dias grátis, sem fidelidade) e fecha com sim/não.
  // As retomadas dão um ângulo novo (loop na objeção de tempo) e a última tira a pressão.
  function minusc(t) { t = String(t || ''); return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function mensagemSistema(p, acao) {
    var s = textosSis(p), l = link(p), e = String(p.empresa || '').split(' - ')[0].split(' (')[0];
    var car = s.resumo ? '*O que vem no ' + s.nome + ':* ' + s.resumo + '.' : '';
    var ben = s.beneficios ? '*Por que vale a pena ter o ' + s.nome + ':*\n\n' + s.beneficios.map(function (b) { return '✅ ' + b; }).join('\n\n') : s.ganho;
    if (acao === 'retomada1') return [
      'Oi! Voltando rapidinho sobre o ' + s.nome + '.',
      s.conta,
      'Muita gente me diz que não tem tempo de aprender sistema novo. Por isso ele já vem pronto para usar, e eu te ajudo a configurar por mensagem, sem você parar o trabalho.',
      'Dá uma olhada, leva 2 minutos e não precisa cadastro: ' + l,
      'Faz sentido testar os *7 dias grátis* ainda essa semana?'].join('\n\n');
    if (acao === 'retomada2') return [
      'Oi! Última mensagem, prometo.',
      'Não vou insistir: se agora não é o momento, tudo bem. Só deixo o resumo para quando precisar.',
      ben,
      s.preco + ', sem fidelidade, com *7 dias grátis* para testar (nada é cobrado nesse período): ' + l,
      'Se um dia quiser, é só responder esta mensagem. Abraço!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Aqui é da Blue Rose Express, de Orlândia. Encontrei o perfil de ' + e + ', aqui de ' + p.cidade + ', e quis te mostrar uma coisa rápida.',
      s.pergunta ? s.pergunta + ' Pergunto porque ' + minusc(s.dor) : s.dor,
      (s.cena ? s.cena + ' ' : '') + 'É isso que o ' + s.nome + ' faz.',
      car,
      ben,
      (s.beneficios ? '' : s.conta),
      'Você pode ver funcionando agora, sem cadastro: ' + l,
      'E o risco é zero: são *7 dias grátis*, nada é cobrado nesse período e dá para cancelar quando quiser. Depois, ' + s.preco + ', sem fidelidade.',
      'Posso te mandar o passo a passo para começar o teste hoje?',
      'Se não fizer sentido, me avisa que eu não mando mais.'].filter(Boolean).join('\n\n');
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
    var ben = '*Por que vale a pena para o associado:*\n\n✅ *O dinheiro que já é dele volta para o bolso:* diferenças de peso, desconto e preço achadas carga por carga.\n\n✅ *Risco zero:* as 20 primeiras cargas são grátis.\n\n✅ *Números na mão para negociar a próxima safra.*\n\n✅ *Para a entidade, um benefício a mais sem custo nenhum.*';
    if (acao === 'retomada1') return [
      'Oi! Voltando rapidinho sobre a conferência das cargas para os associados.',
      'Uma conta simples: numa entrega de 20 mil sacas, R$ 0,50 a menos por saca no desconto ou no preço são R$ 10 mil. Na cana, um ponto de ATR mal apurado em todas as cargas pesa da mesma forma.',
      'Para a ' + e + ' não tem custo nenhum: é um benefício a mais que a entidade oferece, sem trabalho para vocês.',
      'Como funciona: ' + l,
      'Faz sentido eu te mandar um texto pronto para divulgar aos associados?'].join('\n\n');
    if (acao === 'retomada2') return [
      'Oi! Última mensagem, prometo.',
      'Não vou insistir: se agora não é o momento, tudo bem. Só deixo o resumo.',
      ben,
      'Não há custo para a entidade. Detalhes: ' + l,
      'Se um dia quiser, é só responder esta mensagem. Abraço!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Aqui é da Blue Rose Express, de Orlândia. Escrevo para a ' + e + ' porque temos um serviço que pode virar um benefício para os associados.',
      'Hoje os associados conferem carga por carga se o que receberam bate com o contrato? Pergunto porque quase ninguém confere, e uma diferença pequena por carga vira muito dinheiro no fim da safra.',
      'Imagina o associado mandar foto do contrato, dos romaneios e da liquidação e receber em poucas horas a lista das diferenças em reais. É isso que a gente faz.',
      ben,
      'Para a entidade não há custo nenhum: basta divulgar, se achar que vale.',
      'Como funciona: ' + l,
      'Posso te mandar um texto pronto para divulgar aos associados?',
      'Se não fizer sentido, me avisa que eu não mando mais.'].join('\n\n');
  }
  function mensagemSafra(p, acao) {
    var l = link(p), e = String(p.empresa || '').split(' - ')[0].split(' (')[0];
    if (/^Tipo: parceiro/.test(p.notas || '')) return mensagemParceiro(p, acao, l, e);
    var cult = /(cana|usina)/i.test((p.categorias || []).join(' ') + ' ' + (p.justificativa || '')) ? 'cana' : 'grãos';
    var ben = '*Por que vale a pena:*\n\n✅ *O dinheiro que já é seu volta para o seu bolso:* diferenças de peso, desconto e preço achadas carga por carga.\n\n✅ *Risco zero:* as 20 primeiras cargas são grátis e, depois, só cobra se achar diferença maior que o valor do serviço.\n\n✅ *Números na mão para negociar a próxima safra.*\n\n✅ *Sem perder tempo:* é só mandar foto ou PDF do que você já tem.';
    if (acao === 'retomada1') return [
      'Oi! Voltando rapidinho sobre a conferência da safra.',
      'Uma conta simples: numa entrega de 20 mil sacas, R$ 0,50 a menos por saca no desconto ou no preço são R$ 10 mil que ficaram no armazém. É esse tipo de diferença que a gente acha, carga por carga.',
      'E não dá trabalho: é só mandar as fotos ou os PDFs que você já tem.',
      'Como funciona: ' + l,
      'Faz sentido conferir as 20 primeiras cargas de graça essa semana?'].join('\n\n');
    if (acao === 'retomada2') return [
      'Oi! Última mensagem, prometo.',
      'Não vou insistir: se agora não é o momento, tudo bem. Só deixo o resumo para quando precisar.',
      ben,
      'As 20 primeiras cargas são grátis. Detalhes: ' + l,
      'Se um dia quiser, é só responder esta mensagem. Abraço!\nBlue Rose Express'].join('\n\n');
    return ['Olá, tudo bem?',
      'Aqui é da Blue Rose Express, de Orlândia. Encontrei ' + e + ', que trabalha com ' + cult + ' em ' + p.cidade + '/' + p.uf + ', e quis te mostrar uma coisa rápida.',
      'Hoje alguém confere carga por carga se o que foi pago bate com o contrato? Pergunto porque quase ninguém confere, e uma diferença pequena por carga vira muito dinheiro no fim da safra.',
      'Imagina mandar foto do contrato, dos romaneios e da liquidação e receber em poucas horas as diferenças em reais, já com a mensagem pronta para cobrar. É isso que a gente faz por você.',
      ben,
      'E o risco é zero: as *20 primeiras cargas são grátis*. Depois, só cobra se achar diferença maior que o valor do serviço.',
      'Como funciona: ' + l,
      'Posso te explicar o que mandar para conferir as primeiras cargas?',
      'Se não fizer sentido, me avisa que eu não mando mais.'].join('\n\n');
  }
  function mensagem(p, acao) {
    if (p.produto === 'safra') return mensagemSafra(p, acao);
    if (SIS[p.produto]) return mensagemSistema(p, acao);
    var lugar = p.cidade + '/' + p.uf, l = link(p), lt = linkTeste(p), e = p.empresa;
    // oferta de fundador só aparece enquanto houver vaga (some sozinha quando as 3 forem usadas)
    var vagas = Math.max(0, 3 - FUND.length);
    var fund = function (t) { return vagas ? [t] : []; };
    var ben = '*Por que vale a pena ter o Anshur:*\n\n✅ *Mais lucro em cada troca:* o teto do usado aparece antes de fechar, e uma troca mal avaliada costuma custar milhares.\n\n✅ *Dinheiro girando, não parado no pátio.*\n\n✅ *Controle de todas as lojas sem estar em todas:* acima do teto, só com a sua aprovação.\n\n✅ *Prova antes de pagar:* o teste é grátis, com as trocas de vocês.';
    if (acao === 'retomada1') return [
      'Oi! Voltando rapidinho sobre o usado da troca.',
      'Uma conta simples: se em uma troca de trator a revenda paga R$ 20 mil acima do que devia, esse valor sai direto do lucro da venda. Basta evitar isso *uma vez* para pagar 10 meses do Anshur (R$ 2.000/mês, todas as lojas, sem implantação e sem fidelidade).',
      'Muita revenda me diz que já avalia bem. O teste mostra em 5 minutos, com as trocas de vocês, se é verdade:\n' + lt].concat(fund(
      'E ainda há vaga na oferta de fundador: as 3 primeiras revendas usam o *1º mês sem custo*.'), [
      'Faz sentido fazer o teste ainda essa semana?']).join('\n\n');
    if (acao === 'retomada2') return [
      'Oi! Última mensagem, prometo.',
      'Não vou insistir: se agora não é o momento, tudo bem. Só deixo o resumo para quando precisar.',
      ben,
      'Contratação direto pelo site, sem reunião: R$ 2.000/mês, todas as lojas, sem implantação e sem fidelidade. Cancela quando quiser.'].concat(fund(
      'Ainda dá para pegar uma das vagas de fundador: *1º mês sem custo*.'), [
      'Teste com as trocas de vocês: ' + lt + '\nDemonstração: ' + l,
      'Se um dia quiser, é só responder esta mensagem. Abraço!\nBlue Rose Express']).join('\n\n');
    return ['Olá, tudo bem?',
      'Aqui é da Blue Rose Express, de Orlândia. Encontrei a ' + e + ', que trabalha com máquinas usadas em ' + lugar + ', e quis te mostrar uma coisa rápida.',
      'Hoje vocês definem quanto pagar no usado da troca pela experiência do avaliador ou pelas trocas que já venderam? Pergunto porque em revenda boa parte do lucro da máquina nova vai embora no usado: paga-se um pouco a mais para fechar, a máquina fica parada no pátio e, quando vende, a margem já sumiu.',
      'Imagina o vendedor abrir a avaliação e já ver o valor máximo que dá para pagar naquele usado sem perder dinheiro, com base nas trocas que vocês mesmos já venderam. É isso que o Anshur faz.',
      ben,
      'Dá para provar isso com os números de vocês, de graça e sem cadastro: coloque 5 trocas antigas e veja, troca por troca, quanto teria ficado no caixa (leva uns 5 minutos e nada sai do seu computador):\n' + lt].concat(fund(
      'E as 3 primeiras revendas que entrarem usam o *1º mês sem custo* (oferta de fundador).'), [
      'Posso te mandar o passo a passo do teste?',
      'Se não fizer sentido, me avisa que eu não mando mais.']).join('\n\n');
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
      // no computador, "app" usa o WhatsApp instalado (whatsapp://): ele já está aberto e só troca de conversa, sem recarregar nem abrir aba
      else if (!CELULAR && ZAP === 'app') botao = '<a class="btn btn-primary pp-zap" data-enviar="' + p.id + '" data-acao="' + acao + '" href="whatsapp://send?phone=' +
        esc(p.whatsapp) + '&text=' + encodeURIComponent(msg) + '">Mandar pelo WhatsApp do computador</a>';
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
      // 19/11: cidades de onde a fila puxa contato novo (anshur_prosp_fila devolve "cidades"; nulo = Brasil todo)
      '<p class="ind-regras pp-cidades"><b>Cidades da fila:</b> ' + esc(D.fila && D.fila.cidades && D.fila.cidades.length ? D.fila.cidades.join(' e ') : 'Brasil todo') + '. Contato novo só entra na fila de hoje se for dessas cidades.</p>' +
      '<div class="pp-aprov' + (c.textos_aprovados ? ' ok' : '') + '">' + (c.textos_aprovados
        ? '<p><b>Textos aprovados</b> em ' + dia(c.aprovado_em) + '. O botão de abrir o WhatsApp está ligado.</p><button type="button" class="btn btn-ghost" data-aprovar="0">Desfazer a aprovação</button>'
        : '<p><b>Textos ainda não aprovados.</b> Leia as mensagens nos cartões; enquanto não aprovar, o botão de abrir o WhatsApp fica desligado.</p><button type="button" class="btn btn-primary" data-aprovar="1">Textos aprovados</button>') +
      '<form class="pp-limites" id="pp-limites"><label>Novos por dia<input name="n" type="number" min="0" max="50" value="' + c.limite_novos + '"></label>' +
      '<label>Retomadas por dia<input name="r" type="number" min="0" max="50" value="' + c.limite_retomadas + '"></label><button class="btn btn-ghost">Salvar limites</button><span role="status"></span></form>' +
      (CELULAR ? '' : '<p class="pp-zap-escolha">Mandar pelo: <button type="button" class="btn ' + (ZAP === 'app' ? 'btn-primary' : 'btn-ghost') + '" data-zap="app" aria-pressed="' + (ZAP === 'app') + '">WhatsApp do computador</button> ' +
        '<button type="button" class="btn ' + (ZAP === 'web' ? 'btn-primary' : 'btn-ghost') + '" data-zap="web" aria-pressed="' + (ZAP === 'web') + '">WhatsApp Web</button> ' +
        '<small>' + (ZAP === 'app' ? 'Usa o aplicativo do WhatsApp instalado no computador: ele só troca de conversa, sem recarregar. Na primeira vez o navegador pergunta se pode abrir o WhatsApp; marque "sempre permitir".' : 'Abre sempre a mesma aba do WhatsApp Web, mas ela recarrega a cada contato.') + '</small></p>') + '</div>' +
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
    var t = e.target.closest('[data-produto],[data-aba],[data-ver],[data-etapa],[data-enviar],[data-aprovar],[data-zap]');
    if (!t) return;
    if (t.dataset.zap) { ZAP = t.dataset.zap; try { localStorage.setItem('br-prosp-zap', ZAP); } catch (er) { /* sem armazenamento */ } desenhar(); return; }
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

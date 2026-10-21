// Topo da inicial: "Qual é o seu ramo?" — a pessoa toca no ramo e vê a tela real do sistema certo, o preço e o teste grátis.
// Os dados vêm da página Sistemas (nome, tela, preço do Básico, página, demonstração e o id do teste).
// O botão de teste usa o data-teste de sempre (js/conta.js cuida do clique).
(function () {
  var RAMOS = [
    ['obras', 'Obras e reformas', 'RoseConstruct', 'Para empreiteiros e empresas de reforma.', 'obras.webp?v=2', 119, 'roseconstruct.html', 'obras'],
    ['advocacia', 'Advocacia', 'Nexo Jurídico', 'Para escritórios de advocacia.', 'juridico.webp', 149, 'nexo-juridico.html', 'juridico'],
    ['salao', 'Salão e estética', 'Nexo Agenda', 'Para salões, estética, barbearias e clínicas.', 'agenda.webp', 79, 'nexo-agenda.html', 'agenda'],
    ['assistencia', 'Assistência técnica', 'Nexo Financeiro', 'Para assistências técnicas, oficinas e prestadores.', 'financeiro.webp', 109, 'nexo-financeiro.html', 'financeiro'],
    ['clinica', 'Clínica', 'Nexo Clínica', 'Para clínicas, consultórios e profissionais de saúde.', 'clinica.webp', 109, 'nexo-clinica.html', 'clinica'],
    ['oficina', 'Oficina mecânica', 'Nexo Oficina', 'Para oficinas mecânicas e auto centers.', 'oficina.webp', 89, 'nexo-oficina.html', 'oficina'],
    ['loja', 'Loja e distribuidora', 'Nexo Gestão', 'Para distribuidoras, lojas e mercados.', 'gestao.webp', 129, 'nexo-gestao.html', 'gestao'],
    ['restaurante', 'Restaurante e delivery', 'Nexo Restaurante', 'Para restaurantes, bares, lanchonetes e delivery.', 'restaurante.webp', 89, 'nexo-restaurante.html', 'restaurante'],
    ['academia', 'Academia', 'Nexo Academia', 'Para academias, estúdios e boxes.', 'academia.webp', 99, 'nexo-academia.html', 'academia'],
    ['imobiliaria', 'Imobiliária', 'Nexo Imobiliária', 'Para imobiliárias e corretores.', 'imobiliaria.webp', 129, 'nexo-imobiliaria.html', 'imobiliaria'],
    ['farmacia', 'Farmácia', 'Nexo Farmácia', 'Para farmácias e drogarias.', 'farmacia.webp', 149, 'nexo-farmacia.html', 'farmacia'],
    ['vendas', 'Equipe de vendas', 'Nexo CRM', 'Para equipes comerciais de qualquer ramo.', 'crm.webp', 99, 'nexo-crm.html', 'crm'],
    ['casamentos', 'Casamentos e eventos', 'Blue Rose Eternize', 'Para assessoria e cerimonial de casamentos.', 'cerimonial.webp', 89, 'eternize.html', 'cerimonial'],
    ['pragas', 'Dedetização', 'Blue Rose Guard', 'Para dedetizadoras e controle de pragas.', 'pragas.webp', 99, 'guard.html', 'pragas'],
  ];
  var caixa = document.querySelector('[data-ramo-topo]');
  if (!caixa) return;
  var lista = caixa.querySelector('.rt-ramos'), tela = caixa.querySelector('.rt-tela img'), url = caixa.querySelector('.rt-url');
  var nome = caixa.querySelector('.rt-nome'), para = caixa.querySelector('.rt-para'), preco = caixa.querySelector('.rt-preco b');
  var teste = caixa.querySelector('.rt-teste'), conhecer = caixa.querySelector('.rt-conhecer'), mais = caixa.querySelector('.rt-mais');
  var VISIVEIS = 6;
  RAMOS.forEach(function (r, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = r[1]; b.setAttribute('data-r', r[0]); b.setAttribute('aria-pressed', 'false');
    if (i >= VISIVEIS) b.className = 'rt-extra';
    lista.insertBefore(b, mais);
  });
  mais.addEventListener('click', function () { caixa.classList.add('rt-todos'); mais.hidden = true; });
  function escolher(id, anima) {
    var r = RAMOS.filter(function (x) { return x[0] === id; })[0] || RAMOS[0];
    lista.querySelectorAll('button[data-r]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === r[0] ? 'true' : 'false'); });
    var trocar = function () {
      tela.src = 'img/sistemas/' + r[4]; tela.alt = 'Tela do ' + r[2];
      url.textContent = r[2].toLowerCase().replace(/\s+/g, '-') + ' · painel';
      nome.textContent = r[2]; para.textContent = r[3]; preco.textContent = 'R$ ' + r[5];
      teste.setAttribute('href', 'app/' + r[7] + '/'); teste.setAttribute('data-teste', r[7]); teste.setAttribute('data-teste-nome', r[2]); teste.setAttribute('data-teste-mensal', r[5]);
      conhecer.setAttribute('href', r[6]); conhecer.textContent = 'Conhecer o ' + r[2];
      caixa.classList.remove('rt-saindo');
    };
    if (anima) { caixa.classList.add('rt-saindo'); setTimeout(trocar, 180); } else trocar();
    // a próxima tela já vai sendo baixada para a troca ser na hora
  }
  lista.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-r]'); if (!b) return;
    escolher(b.getAttribute('data-r'), true);
    try { sessionStorage.setItem('br-ramo', b.getAttribute('data-r')); } catch (_) { /* sem armazenamento */ }
  });
  lista.addEventListener('pointerover', function (e) { var b = e.target.closest('button[data-r]'); if (!b) return; var r = RAMOS.filter(function (x) { return x[0] === b.getAttribute('data-r'); })[0]; if (r) (new Image()).src = 'img/sistemas/' + r[4]; });
  var salvo = null; try { salvo = sessionStorage.getItem('br-ramo'); } catch (_) { /* sem armazenamento */ }
  if (salvo && RAMOS.findIndex(function (x) { return x[0] === salvo; }) >= VISIVEIS) { caixa.classList.add('rt-todos'); mais.hidden = true; }
  escolher(salvo || 'obras', false);
})();

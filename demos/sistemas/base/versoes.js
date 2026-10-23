// Veltria · as 24 versões vendidas (8 categorias × Essencial, Completo e Avançado).
// Usado pela porta de entrada (app/<id>/) e pelo modo conta das telas (conta-nuvem.js).
// id = categoria + versão, só letras (regra do banco: nexo_espacos.app); preço do Básico mensal (Pro = +R$ 60).
(function () {
  var CAT = { obras: ['Obras', [69, 119, 249], 'obras'], juridico: ['Jurídico', [89, 149, 299], 'juridico'], oficina: ['Oficina', [69, 89, 229], 'oficina'], financeiro: ['Financeiro', [59, 109, 249], 'financeiro'], agenda: ['Agenda', [49, 79, 199], 'agenda'], crm: ['CRM', [59, 99, 229], 'crm'], farmacia: ['Farmácia', [89, 149, 299], 'farmacia'], gestao: ['Gestão', [59, 119, 199], 'gestao'] };
  var VER = [['essencial', 'Essencial'], ['completo', 'Completo'], ['avancado', 'Avançado']];
  var CHAVE_DIFERENTE = { 'gestao-essencial': 'veltria-gestao-simples-v1' };
  var out = {};
  Object.keys(CAT).forEach(function (c) {
    VER.forEach(function (v, i) {
      var pasta = c + '-' + v[0];
      out[c + v[0]] = {
        id: c + v[0], categoria: c, versao: v[0], nome: 'Veltria ' + CAT[c][0] + ' ' + v[1], nomeCategoria: 'Veltria ' + CAT[c][0], nomeVersao: v[1],
        pasta: pasta, entrada: i === 0 ? 'app.html' : 'index.html', chave: CHAVE_DIFERENTE[pasta] || 'veltria-' + pasta + '-v1',
        mensal: CAT[c][1][i], pagina: 'veltria-' + c + '.html', logo: CAT[c][2] ? 'img/logos/veltria-' + CAT[c][2] + '-simbolo.png?v=6' : 'img/veltria-256.png',
      };
    });
  });
  window.VELTRIA_VERSOES = out;
})();

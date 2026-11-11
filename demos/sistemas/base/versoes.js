// Veltria · as 24 versões vendidas (8 categorias × Essencial, Completo e Avançado).
// Usado pela porta de entrada (app/<id>/) e pelo modo conta das telas (conta-nuvem.js).
// id = categoria + versão, só letras (regra do banco: nexo_espacos.app); preço da assinatura mensal (plano único desde 23/10/2026).
(function () {
  var CAT = { obras: ['Obras', [69, 119, 249], 'obras'], juridico: ['Jurídico', [89, 149, 299], 'juridico'], oficina: ['Oficina', [69, 89, 229], 'oficina'], financeiro: ['Financeiro', [59, 109, 249], 'financeiro'], agenda: ['Agenda', [49, 79, 199], 'agenda'], crm: ['CRM', [59, 99, 229], 'crm'], farmacia: ['Farmácia', [89, 149, 299], 'farmacia'], gestao: ['Gestão', [59, 119, 199], 'gestao'] };
  var VER = [['essencial', 'Essencial'], ['completo', 'Completo'], ['avancado', 'Avançado']];
  var CHAVE_DIFERENTE = { 'gestao-essencial': 'veltria-gestao-simples-v1', 'agenda-essencial': 'veltria-agenda-essencial-v3', 'agenda-completo': 'veltria-agenda-completo-v2', 'agenda-avancado': 'veltria-agenda-avancado-v2' }; // igual ao CHAVE de cada app.js (o modo conta só sobe para a nuvem o que fica nessa chave)
  // versão dos dados de exemplo da demonstração: suba o número quando o exemplo de um sistema ganhar novidades
  // (quem já tinha a demonstração aberta recebe o exemplo novo; o que testou antes fica guardado no navegador)
  var EXEMPLO = { financeiroessencial: 2, financeirocompleto: 4, financeiroavancado: 4, agendacompleto: 3, agendaavancado: 3, juridicocompleto: 3, juridicoavancado: 3, obrascompleto: 3, obrasavancado: 3, crmcompleto: 3, crmavancado: 3, farmaciacompleto: 3, farmaciaavancado: 3, oficinacompleto: 3, oficinaavancado: 3, gestaocompleto: 3, gestaoavancado: 3 };
  var out = {};
  Object.keys(CAT).forEach(function (c) {
    VER.forEach(function (v, i) {
      var pasta = c + '-' + v[0];
      out[c + v[0]] = {
        id: c + v[0], categoria: c, versao: v[0], nome: 'Veltria ' + CAT[c][0] + ' ' + v[1], nomeCategoria: 'Veltria ' + CAT[c][0], nomeVersao: v[1],
        pasta: pasta, entrada: i === 0 ? 'app.html' : 'index.html', chave: CHAVE_DIFERENTE[pasta] || 'veltria-' + pasta + '-v1',
        mensal: CAT[c][1][i], exemplo: EXEMPLO[c + v[0]] || 1, pagina: 'veltria-' + c + '.html', logo: CAT[c][2] ? 'img/logos/veltria-' + CAT[c][2] + '-simbolo.png?v=6' : 'img/veltria-256.png',
        semTeste: true, // 10/11/2026: sem teste grátis para clientes novos (paga no cartão aqui ou no Pix pela página)
      };
    });
  });
  // linha Vexorin: sistemas fora das 3 versões, com o mesmo login, teste, assinatura, equipe e nuvem
  out.vetnature = { id: 'vetnature', categoria: 'vetnature', versao: '', nome: 'VetNature', nomeCategoria: 'VetNature', nomeVersao: '', pasta: 'vetnature', entrada: 'index.html',
    chave: 'vetnature-demo-v2', mensal: 129, exemplo: 1, pagina: 'index.html#produtos', logo: 'img/logos/vetnature-192.png' };
  // Peplo: sistema da loja de roupas (marca própria, fora da linha Veltria), mesma conta, nuvem e equipe; sem teste grátis (paga na hora, Pix ou cartão)
  out.peplo = { id: 'peplo', categoria: 'peplo', versao: '', nome: 'Peplo', nomeCategoria: 'Peplo', nomeVersao: '', pasta: 'peplo', entrada: 'app.html',
    chave: 'peplo-v1', mensal: 59, exemplo: 1, pagina: 'peplo.html', logo: 'img/logos/peplo-simbolo.png', semTeste: true };
  // Annona: estoque e vendas do mercadinho e do bar (marca própria, fora da Veltria); sem teste grátis, Pix ou cartão
  out.annona = { id: 'annona', categoria: 'annona', versao: '', nome: 'Annona', nomeCategoria: 'Annona', nomeVersao: '', pasta: 'annona', entrada: 'app.html',
    chave: 'annona-v1', mensal: 59, exemplo: 1, pagina: 'annona.html', logo: 'img/logos/annona-simbolo.png', semTeste: true };
  // Fortis: app de celular para profissionais da construção e da reforma (marca própria); sem teste grátis, mensal R$ 39 ou anual R$ 374
  out.fortis = { id: 'fortis', categoria: 'fortis', versao: '', nome: 'Fortis', nomeCategoria: 'Fortis', nomeVersao: '', pasta: 'fortis', entrada: 'app.html',
    chave: 'fortis-v1', mensal: 39, anual: 374, exemplo: 1, pagina: 'fortis.html', logo: 'demos/sistemas/fortis/icone-192.png', semTeste: true };
  window.VELTRIA_VERSOES = out;
})();

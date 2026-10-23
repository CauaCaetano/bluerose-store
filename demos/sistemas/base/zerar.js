/*
 * Veltria · "Começar do zero": tira os dados de exemplo e deixa a empresa vazia, pronta para os dados dela.
 * Regra geral: toda lista vira vazia e todo número de resultado (faturamento, saldo, perdas...) vira zero;
 * ficam as configurações (horário, porcentagens, metas, contadores de numeração) e as listas que são
 * estrutura da tela (os potes do Financeiro, a régua de cobrança, as regras de pontuação do CRM, os boxes).
 * O nome da empresa passa a ser o da conta; nomes, PIX, CNPJ e registros de exemplo ficam em branco.
 * Usado pelo conta-nuvem.js (e pelo teste em scratchpad/teste_zerar.mjs). window.veltriaZerar(dados, app, empresa).
 */
(function () {
  // listas que são estrutura da tela: ficam, com os valores zerados
  var MANTER = { financeiroessencial: ['potes'], financeirocompleto: ['regua'], financeiroavancado: ['orc'], crmavancado: ['regras'], gestaoavancado: ['abas'], oficinaavancado: ['boxes'] };
  // equipe onde o usuário da tela (db.eu) precisa existir: fica só ele, como "Você"
  var EU = { juridicocompleto: 'equipe', juridicoavancado: 'advs' };
  // números que são configuração (ficam como estão)
  var CONFIG = /^(abre|fecha|sinal\w*|desconto|comissao|das|imposto|meta\w*|corte|sla|regraPreco|antecedencia|alertaInterno|lembrarDias|garantia|boxes|bdi|valor|proxima|prox\w+|letra|caixa(Ini|Inicial)?|gerente|diretor|efic|ticket)$/;
  // textos de exemplo que identificam pessoas ou a empresa de exemplo
  var NOME_EMPRESA = /^(studio|salao|rede|farm|negocio|empresa)$/;
  var PESSOAIS = /^(pro|vendedor|dono|resp|crf|pix|cnpj|oab|tel|registro|cidade|ramo|assinaturaZap|cargo)$/;

  function zeraNumeros(x) {
    if (Array.isArray(x)) return x.map(function (v) { return typeof v === 'number' ? 0 : zeraNumeros(v); });
    if (x && typeof x === 'object') { var o = {}; for (var k in x) o[k] = typeof x[k] === 'number' && !CONFIG.test(k) ? 0 : zeraNumeros(x[k]); return o; }
    return x;
  }
  function opcoesDe(dados, guardadas) {
    var o = JSON.parse(JSON.stringify(guardadas || {}));
    Object.keys(dados).forEach(function (l) {
      var lista = dados[l]; if (!Array.isArray(lista) || !lista.length || typeof lista[0] !== 'object' || !lista[0]) return;
      Object.keys(lista[0]).forEach(function (c) {
        if (c === 'id' || typeof lista[0][c] !== 'string') return;
        var vals = []; lista.forEach(function (x) { if (x && typeof x[c] === 'string' && x[c] && vals.indexOf(x[c]) < 0) vals.push(x[c]); });
        var porNome = /^(st|status|situacao|etapa|tipo|un|fase|cat|forma|origem|prioridade|risco|urg|polo|canal|estado|modo|nivel|papel|pag|area|camada|causa)$/i.test(c);
        if (vals.length && vals.length <= 12 && (porNome || (vals.length <= 4 && lista.length >= 4 && vals.length < lista.length))) {
          var antes = o[l + '.' + c] || []; vals.forEach(function (v) { if (antes.indexOf(v) < 0) antes.push(v); }); o[l + '.' + c] = antes;
        }
      });
    });
    return o;
  }
  function branco(x) {
    if (Array.isArray(x)) return [];
    if (x && typeof x === 'object') { var o = {}; for (var k in x) o[k] = branco(x[k]); return o; }
    return typeof x === 'number' ? 0 : typeof x === 'boolean' ? false : x === null ? null : '';
  }
  function limpa(x, chave, prof, manter, pai) {
    if (Array.isArray(x)) {
      if (prof === 0 && manter.indexOf(chave) >= 0) return zeraNumeros(x);
      // listas de números dentro de objetos (linhas do caixa, NPS): ficam do mesmo tamanho, zeradas
      if (prof > 0 && x.length && x.every(function (v) { return typeof v === 'number'; })) return x.map(function () { return 0; });
      return [];
    }
    if (x && typeof x === 'object') {
      if (prof === 0 && manter.indexOf(chave) >= 0) return zeraNumeros(x);
      var o = {}; for (var k in x) o[k] = limpa(x[k], k, prof + 1, manter, chave); return o;
    }
    if (typeof x === 'number') return CONFIG.test(chave) ? x : 0;
    if (typeof x === 'string') {
      if (NOME_EMPRESA.test(chave) && prof <= 1) return '\u0000empresa';
      // empresa.nome, esc.nome, banca.nome, oficina.nome: o da conta; eu.nome (o usuário de exemplo) fica em branco
      if (chave === 'nome' && prof === 1) return /^(empresa|esc|banca|oficina)$/.test(pai) ? '\u0000empresa' : '';
      if (PESSOAIS.test(chave)) return '';
    }
    return x;
  }
  window.veltriaZerar = function (dados, app, empresa) {
    var manter = MANTER[app] || [], o = {};
    for (var k in dados) {
      // a assinatura de exemplo e as preferências de tela ficam como estão
      if (/^(assinatura|plano|ajustes|un|loja|modo|filtro|ativa|camada\w*|foco|\w+Aba|lateral|_dia0)$/.test(k)) { o[k] = dados[k]; continue; }
      if (k === '_modelos' || k === '_refs' || k === '_opcoes') continue;
      // unidades, lojas e empresas do exemplo saem; o sistema começa com uma principal, que o cliente renomeia
      if (/^(unidades|lojasRede|empresasGrupo)$/.test(k)) { o[k] = Array.isArray(dados[k]) ? [] : {}; continue; }
      o[k] = limpa(dados[k], k, 0, manter, '');
    }
    // modelo de cada lista (os campos do primeiro item de exemplo, em branco): o editor de Dados usa para cadastrar
    o._modelos = JSON.parse(JSON.stringify(dados._modelos || {})); // zerar de novo não perde os modelos
    Object.keys(dados).forEach(function (k) { if (Array.isArray(dados[k]) && dados[k][0] && typeof dados[k][0] === 'object') o._modelos[k] = branco(dados[k][0]); });
    // relações de cada lista (cliente de um agendamento, loja de uma perda...): o editor de Dados mostra como lista de escolha
    o._refs = JSON.parse(JSON.stringify(dados._refs || {}));
    Object.keys(dados).forEach(function (l) {
      var it = Array.isArray(dados[l]) && dados[l][0]; if (!it || typeof it !== 'object') return;
      Object.keys(it).forEach(function (c) {
        var v = it[c]; if (typeof v !== 'string' || !v || c === 'id') return;
        Object.keys(dados).forEach(function (l2) {
          var x = dados[l2]; if (l2 === l) return;
          if (Array.isArray(x) && x.some(function (y) { return y && y.id === v; })) o._refs[l + '.' + c] = l2;
          else if (x && typeof x === 'object' && !Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, v) && typeof x[v] === 'object') o._refs[l + '.' + c] = l2;
        });
      });
    });
    o._opcoes = opcoesDe(dados, dados._opcoes);
    var lista = EU[app];
    if (lista && Array.isArray(dados[lista])) o[lista] = dados[lista].filter(function (p) { return p.id === dados.eu; }).map(function (p) { var c = zeraNumeros(p); c.nome = 'Você'; return c; });
    // nome da empresa e do usuário: os da conta
    return JSON.parse(JSON.stringify(o).split('\\u0000empresa').join(String(empresa || '').replace(/["\\]/g, '')));
  };
})();

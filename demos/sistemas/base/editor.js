/*
 * Veltria · editor de Dados do modo conta (botão "Dados" na faixa da conta, conta-nuvem.js).
 * Abre qualquer lista da empresa (clientes, produtos, lojas, perdas, campanhas...) para incluir, editar, apagar
 * ou importar de uma planilha (CSV), e os números de resultado (faturamento por loja, DRE, saldos) para corrigir.
 * Serve para os painéis que a própria tela não deixa preencher e para trazer o cadastro de uma vez.
 * Os campos vêm do primeiro item da lista ou, com a lista vazia, do modelo guardado ao "Começar do zero" (_modelos).
 * Datas guardadas como "dias a partir de hoje" aparecem como data no formulário (regras DIAS do conta-nuvem.js).
 * window.veltriaEditor({ dados, dias, salvar(dados) -> Promise, fechou(salvou) }): grava a cada item; a tela recarrega ao fechar.
 */
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var FORA = /^(conversa|assinatura|ajudantes|audit|auditoria|log|ajustes|eu|plano|acessos|cesta|comanda|cupom|pdv|busca|abas|resp|_modelos|_dia0|_refs|_opcoes)$/;
  var LISTAS = { clientes: 'Clientes', ags: 'Agendamentos', servicos: 'Serviços', servs: 'Serviços', pros: 'Profissionais', prods: 'Produtos', produtos: 'Produtos', vendas: 'Vendas',
    contas: 'Contas', pagar: 'Contas a pagar', lancs: 'Lançamentos', movs: 'Movimentos', cobrancas: 'Cobranças', fixas: 'Contas fixas', potes: 'Potes', processos: 'Processos',
    prazos: 'Prazos', intimacoes: 'Intimações', audiencias: 'Audiências', honorarios: 'Honorários', obras: 'Obras', orcamentos: 'Orçamentos', compras: 'Compras', medicoes: 'Medições',
    diario: 'Diário', os: 'Ordens de serviço', carros: 'Carros', mec: 'Mecânicos', mecanicos: 'Mecânicos', pecas: 'Peças', estoque: 'Estoque', deals: 'Negócios', negocios: 'Negócios',
    atividades: 'Atividades', propostas: 'Propostas', leads: 'Leads', pessoas: 'Equipe comercial', vend: 'Vendedores', transf: 'Transferências', campanhas: 'Campanhas da indústria',
    perdas: 'Perdas', precos: 'Preços da concorrência', compra: 'Compra central', equipe: 'Equipe', fichas: 'Fichas técnicas', avaliacoes: 'Avaliações', rfm: 'Grupos de clientes',
    recusados: 'Pagamentos recusados', frotas: 'Frotas', detratores: 'Clientes insatisfeitos', recalls: 'Recalls', garantias: 'Garantias', pags: 'Pagamentos', extrato: 'Extrato do banco',
    regras: 'Regras', fech: 'Fechamento do mês', rateio: 'Rateio', contratos: 'Contratos', cotacoes: 'Cotações', rdos: 'Diários de obra', tarefas: 'Tarefas', horas: 'Horas',
    conflitos: 'Conflitos', advs: 'Advogados', fornecedores: 'Fornecedores', vendedores: 'Vendedores', pedidos: 'Pedidos', livro: 'Livro de controlados', receitas: 'Receitas',
    entregas: 'Entregas', temps: 'Temperaturas', sequencias: 'Sequências', cadencias: 'Cadências', novos: 'Empresas novas', fila: 'Fila', planos: 'Planos', ofertas: 'Ofertas',
    espera: 'Lista de espera', presencas: 'Presenças', outras: 'Outras contas', historico: 'Histórico', agenda: 'Agenda', orcs: 'Orçamentos', sangrias: 'Sangrias',
    pacotes: 'Pacotes', perdidos: 'Negócios perdidos', atendimentos: 'Atendimentos', despesas: 'Despesas', regua: 'Régua de cobrança', orc: 'Orçado', tarefa: 'Tarefas' };
  var CAMPOS = { nome: 'Nome', tel: 'Telefone (WhatsApp)', valor: 'Valor (R$)', preco: 'Preço (R$)', custo: 'Custo (R$)', qtd: 'Quantidade', min: 'Mínimo / minutos', cli: 'Cliente',
    cliente: 'Cliente', desc: 'Descrição', dia: 'Dia', venc: 'Vencimento', vence: 'Vencimento', fatal: 'Prazo fatal', st: 'Situação', status: 'Situação', tipo: 'Tipo', obs: 'Observação',
    email: 'E-mail', cat: 'Categoria', forn: 'Fornecedor', meta: 'Meta', total: 'Total', ini: 'Início', fim: 'Fim', prod: 'Produto', loja: 'Loja', motivo: 'Motivo', area: 'Área',
    cargo: 'Cargo', etapa: 'Etapa', placa: 'Placa', modelo: 'Modelo', ean: 'Código de barras', cod: 'Código', sku: 'Código', estoque: 'Estoque', minimo: 'Mínimo', pago: 'Pago',
    titulo: 'Título', empresa: 'Empresa', cidade: 'Cidade', doc: 'CPF/CNPJ', cnj: 'Número do processo', vara: 'Vara', contra: 'Parte contrária', fase: 'Fase', resp: 'Responsável',
    dono: 'Responsável', ultima: 'Última vez', entrega: 'Entrega', inicio: 'Início', serv: 'Serviço', pro: 'Profissional', h: 'Horas', hora: 'Hora', un: 'Unidade', fat: 'Faturamento',
    ticket: 'Ticket médio', perdas: 'Perdas', ruptura: 'Itens em falta', vencendo: 'Vencendo', generico: 'Genéricos (0 a 1)', perf: 'Perfumaria (0 a 1)', saldo: 'Saldo', limite: 'Limite',
    cen: 'Centro', sav: 'Savassi', con: 'Contagem', bet: 'Betim', dist: 'Distribuidora', log: 'Logística', ct: 'Contagem', bt: 'Betim', pp: 'Pampulha',
    matriz: 'Matriz', filial: 'Filial', mo: 'Mão de obra', cmv: 'Custo das peças', comissoes: 'Comissões', fixas: 'Despesas fixas', pend: 'Pendentes', div: 'Divergências' };
  var rotulo = function (k) { return CAMPOS[k] || k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); }); };
  var nomeLista = function (k) { return LISTAS[k] || rotulo(k); };
  var titulo = function (x) { return x && typeof x === 'object' ? (x.nome || x.cliente || x.titulo || x.desc || x.prod || x.conta || x.empresa || x.placa || x.cnj || x.serv || x.id || '') : String(x); };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var hojeMs = function () { return Date.parse(new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)); };
  var dataDe = function (n) { return new Date(hojeMs() + n * 864e5).toISOString().slice(0, 10); };

  window.veltriaEditor = function (o) {
    var d = JSON.parse(JSON.stringify(o.dados)), modelos = d._modelos || {};
    // campos de data relativa desta versão: "lista.campo" -> 'D' (data) ou 'H' (há quantos dias)
    var relativos = {}; (function () { var t = 'D'; (o.dias || '').split(' ').forEach(function (c) { if (c === 'D' || c === 'H') t = c; else if (c) relativos[c.replace(/\[\]/g, '')] = t; }); })();
    var listas = Object.keys(d).filter(function (k) { return Array.isArray(d[k]) && !FORA.test(k) && (d[k].length ? typeof d[k][0] === 'object' : !!modelos[k]); });
    // números de resultado em objetos (lojas, DRE, caixa por empresa, metas): grupos de campos numéricos
    var grupos = [];
    (function anda(x, cam, prof) {
      Object.keys(x).forEach(function (k) {
        if (FORA.test(k) || prof > 2) return; var v = x[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          var nums = Object.keys(v).filter(function (z) { return typeof v[z] === 'number'; });
          if (nums.length) grupos.push({ cam: cam.concat(k), campos: nums });
          anda(v, cam.concat(k), prof + 1);
        }
      });
    })(d, [], 0);
    var pegar = function (cam) { return cam.reduce(function (a, k) { return a[k]; }, d); };
    // relação com outra lista: o valor de exemplo é o id de um item de outra lista
    // (guardadas ao "Começar do zero" em _refs; com dados, também pelo item de exemplo). Destino: outra lista (id) ou um objeto (chave, como as lojas)
    var refs = JSON.parse(JSON.stringify(d._refs || {}));
    listas.forEach(function (l) { var m = d[l][0] || {}; Object.keys(m).forEach(function (c) {
      var v = m[c]; if (typeof v !== 'string' || !v || c === 'id') return;
      Object.keys(d).forEach(function (l2) { var x = d[l2]; if (l2 === l || FORA.test(l2)) return;
        if (Array.isArray(x) && x.some(function (y) { return y && y.id === v; })) refs[l + '.' + c] = l2;
        else if (x && typeof x === 'object' && !Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, v) && typeof x[v] === 'object') refs[l + '.' + c] = l2; });
    }); });
    // valores fixos (situação, unidade, tipo): os guardados ao zerar mais os que já existem nos dados
    var fixos = (function () { function opcoesDe(dados, guardadas) {
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
      return opcoesDe(d, d._opcoes); })();
    // opções de uma relação: [valor, texto]
    var opcoes = function (ref) { var x = d[ref]; return Array.isArray(x) ? x.map(function (y) { return [y.id, titulo(y)]; }) : Object.keys(x || {}).map(function (k) { return [k, rotulo(k)]; }); };

    var v = document.createElement('div'); v.className = 'vc-veu'; v.innerHTML = '<div class="vc-caixa ve-caixa" role="dialog" aria-modal="true" aria-label="Dados"></div>';
    document.body.appendChild(v); var cx = v.querySelector('.ve-caixa');
    var salvou = false;
    var fecha = function () { v.remove(); if (o.fechou) o.fechou(salvou); };
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('[data-ve-fecha]')) fecha(); });
    v.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
    var aberto = null;
    function salvarTudo(msg) { salvou = true; var m = cx.querySelector('[data-ve-salvo]'); if (m) m.textContent = 'Salvando…'; return o.salvar(d).then(function () { return msg; }); }

    function inicio() {
      cx.innerHTML = '<h2>Dados da empresa</h2><p class="vc-mudo">Cadastre, corrija ou traga de uma planilha qualquer lista do sistema, inclusive os painéis que a tela só mostra. Cada item é salvo na hora; ao fechar, a tela recarrega com os dados novos.</p>' +
        '<div class="ve-grade">' + listas.map(function (l) { return '<button type="button" class="ve-item" data-ve-lista="' + l + '"><b>' + esc(nomeLista(l)) + '</b><small>' + d[l].length + (d[l].length === 1 ? ' item' : ' itens') + '</small></button>'; }).join('') +
        grupos.map(function (g, i) { return '<button type="button" class="ve-item ve-num" data-ve-grupo="' + i + '"><b>' + esc(g.cam.map(nomeLista).join(' › ')) + '</b><small>números</small></button>'; }).join('') + '</div>' +
        '<button type="button" class="vc-bt vc-2" data-ve-fecha>Fechar</button>';
    }
    function lista(l) {
      aberto = l; var itens = d[l], m = itens[0] || modelos[l] || {};
      var cols = Object.keys(m).filter(function (c) { return c !== 'id' && (typeof m[c] !== 'object' || m[c] === null); }).slice(0, 4);
      cx.innerHTML = '<p><button type="button" class="ve-volta" data-ve-inicio>‹ Todas as listas</button></p><h2>' + esc(nomeLista(l)) + ' <small class="vc-mudo">(' + itens.length + ')</small></h2>' +
        '<div class="ve-acoes"><button type="button" class="vc-bt" data-ve-novo>+ Adicionar</button><label class="vc-bt vc-2 ve-arq">Importar planilha (CSV)<input type="file" accept=".csv,text/csv" data-ve-csv hidden></label></div>' +
        '<p class="vc-mudo ve-dica">Planilha: a primeira linha com os nomes das colunas (' + esc(Object.keys(m).filter(function (c) { return typeof m[c] !== 'object' || m[c] === null; }).join(', ')) + '). Separador vírgula ou ponto e vírgula.</p>' +
        '<div class="ve-tab"><table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(rotulo(c)) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        itens.slice(0, 300).map(function (x, i) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(mostra(l, c, x[c])) + '</td>'; }).join('') + '<td class="ve-bts"><button type="button" data-ve-edita="' + i + '">Editar</button><button type="button" data-ve-apaga="' + i + '">Apagar</button></td></tr>'; }).join('') +
        '</tbody></table>' + (itens.length ? '' : '<p class="vc-mudo">Nada cadastrado ainda.</p>') + (itens.length > 300 ? '<p class="vc-mudo">Mostrando os 300 primeiros.</p>' : '') + '</div><p class="vc-mudo" data-ve-salvo></p>';
    }
    function mostra(l, c, val) {
      if (relativos[l + '.' + c] === 'D' && typeof val === 'number') return dataDe(val).split('-').reverse().join('/');
      if (refs[l + '.' + c]) { var a = opcoes(refs[l + '.' + c]).find(function (x) { return x[0] === val; }); return a ? a[1] : val; }
      return typeof val === 'boolean' ? (val ? 'sim' : 'não') : val;
    }
    function form(l, i) {
      var novo = i == null, base = novo ? JSON.parse(JSON.stringify(d[l][0] ? branco(d[l][0]) : (modelos[l] || {}))) : d[l][i];
      var campos = Object.keys(base).filter(function (c) { return c !== 'id' && (typeof base[c] !== 'object' || base[c] === null); });
      cx.innerHTML = '<p><button type="button" class="ve-volta" data-ve-lista="' + l + '">‹ ' + esc(nomeLista(l)) + '</button></p><h2>' + (novo ? 'Adicionar' : 'Editar') + '</h2><form class="ve-form">' +
        campos.map(function (c) {
          var val = base[c], rel = relativos[l + '.' + c], ref = refs[l + '.' + c], nome = 'c_' + c;
          if (ref) return '<label>' + esc(rotulo(c)) + '<select name="' + nome + '"><option value=""></option>' + opcoes(ref).map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === val ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></label>';
          var fx = fixos[l + '.' + c];
          if (fx && typeof val === 'string') return '<label>' + esc(rotulo(c)) + '<select name="' + nome + '">' + fx.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>';
          if (typeof val === 'boolean') return '<label class="ve-chk"><input type="checkbox" name="' + nome + '"' + (val ? ' checked' : '') + '> ' + esc(rotulo(c)) + '</label>';
          if (rel === 'D') return '<label>' + esc(rotulo(c)) + '<input type="date" name="' + nome + '" value="' + (typeof val === 'number' && !novo ? dataDe(val) : '') + '"></label>';
          if (rel === 'H') return '<label>' + esc(rotulo(c)) + ' (há quantos dias)<input type="number" name="' + nome + '" value="' + (novo ? 0 : val) + '"></label>';
          if (typeof val === 'number') return '<label>' + esc(rotulo(c)) + '<input type="number" step="any" name="' + nome + '" value="' + (novo ? '' : val) + '"></label>';
          return '<label>' + esc(rotulo(c)) + '<input name="' + nome + '" value="' + esc(novo ? '' : val) + '"></label>';
        }).join('') + '<p class="vc-mudo" data-ve-salvo></p><button class="vc-bt">Salvar</button></form>';
      cx.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var f = e.target, item = novo ? base : d[l][i];
        campos.forEach(function (c) {
          var el = f.elements['c_' + c], rel = relativos[l + '.' + c], antes = item[c];
          if (el.type === 'checkbox') item[c] = el.checked;
          else if (rel === 'D') item[c] = el.value ? Math.round((Date.parse(el.value) - hojeMs()) / 864e5) : (typeof antes === 'number' ? antes : 0);
          else if (typeof antes === 'number') item[c] = el.value === '' ? 0 : Number(String(el.value).replace(',', '.'));
          else item[c] = el.value;
        });
        if (novo) { poeId(l, item); d[l].unshift(item); }
        salvarTudo().then(function () { lista(l); });
      };
    }
    function branco(x) { if (Array.isArray(x)) return []; if (x && typeof x === 'object') { var r = {}; for (var k in x) r[k] = branco(x[k]); return r; } return typeof x === 'number' ? 0 : typeof x === 'boolean' ? false : x === null ? null : ''; }
    // id do item novo: no mesmo formato dos outros (texto aleatório ou próximo número)
    function poeId(l, item) {
      var m = d[l][0] || modelos[l] || {};
      ['id', 'num', 'n'].forEach(function (k) {
        if (!(k in m)) return;
        if (typeof m[k] === 'number') item[k] = d[l].reduce(function (a, x) { return Math.max(a, Number(x[k]) || 0); }, 0) + 1; else item[k] = 'v' + uid();
      });
    }
    function grupo(i) {
      var g = grupos[i], alvo = pegar(g.cam);
      cx.innerHTML = '<p><button type="button" class="ve-volta" data-ve-inicio>‹ Todas as listas</button></p><h2>' + esc(g.cam.map(nomeLista).join(' › ')) + '</h2><form class="ve-form">' +
        g.campos.map(function (c) { return '<label>' + esc(rotulo(c)) + '<input type="number" step="any" name="' + c + '" value="' + alvo[c] + '"></label>'; }).join('') + '<p class="vc-mudo" data-ve-salvo></p><button class="vc-bt">Salvar</button></form>';
      cx.querySelector('form').onsubmit = function (e) { e.preventDefault(); g.campos.forEach(function (c) { alvo[c] = Number(String(e.target.elements[c].value).replace(',', '.')) || 0; }); salvarTudo().then(inicio); };
    }
    // CSV simples: aspas, vírgula ou ponto e vírgula; cabeçalho com o nome do campo ou o rótulo
    function csv(txt) {
      var sep = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',', linhas = [], cel = '', lin = [], q = false;
      for (var i = 0; i < txt.length; i++) { var ch = txt[i];
        if (q) { if (ch === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') q = false; else cel += ch; }
        else if (ch === '"') q = true; else if (ch === sep) { lin.push(cel); cel = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some(function (x) { return x.trim(); })) linhas.push(lin); lin = []; } else cel += ch; }
      lin.push(cel); if (lin.some(function (x) { return x.trim(); })) linhas.push(lin);
      return linhas;
    }
    function importa(l, arquivo) {
      var r = new FileReader(); r.onload = function () {
        var linhas = csv(String(r.result).replace(/^﻿/, '')); if (linhas.length < 2) { cx.querySelector('[data-ve-salvo]').textContent = 'A planilha está vazia.'; return; }
        var m = d[l][0] || modelos[l] || {}, chaves = Object.keys(m), norm = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
        var col = linhas[0].map(function (h) { var n = norm(h); return chaves.find(function (k) { return norm(k) === n || norm(rotulo(k)) === n; }) || null; });
        if (!col.some(Boolean)) { cx.querySelector('[data-ve-salvo]').textContent = 'Nenhuma coluna reconhecida. Use na primeira linha: ' + chaves.join(', ') + '.'; return; }
        var n = 0;
        linhas.slice(1).forEach(function (cel) {
          var item = branco(m);
          col.forEach(function (k, j) { if (!k || cel[j] == null) return; var t = cel[j].trim(), rel = relativos[l + '.' + k];
            if (rel === 'D' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(t)) { var p = t.split('/'); item[k] = Math.round((Date.parse(p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0')) - hojeMs()) / 864e5); }
            else if (typeof m[k] === 'number') item[k] = Number(t.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0;
            else if (typeof m[k] === 'boolean') item[k] = /^(s|sim|x|1|true)$/i.test(t);
            else item[k] = t; });
          poeId(l, item); d[l].push(item); n++;
        });
        salvarTudo().then(function () { lista(l); cx.querySelector('[data-ve-salvo]').textContent = n + ' itens importados.'; });
      };
      r.readAsText(arquivo, 'utf-8');
    }
    cx.addEventListener('click', function (e) {
      var b = e.target.closest('button,[data-ve-lista],[data-ve-grupo]'); if (!b) return;
      if (b.hasAttribute('data-ve-inicio')) inicio();
      else if (b.dataset.veLista) lista(b.dataset.veLista);
      else if (b.dataset.veGrupo) grupo(Number(b.dataset.veGrupo));
      else if (b.hasAttribute('data-ve-novo')) form(aberto, null);
      else if (b.dataset.veEdita) form(aberto, Number(b.dataset.veEdita));
      else if (b.dataset.veApaga) { var x = d[aberto][Number(b.dataset.veApaga)]; if (confirm('Apagar "' + titulo(x) + '"?')) { d[aberto].splice(Number(b.dataset.veApaga), 1); salvarTudo().then(function () { lista(aberto); }); } }
    });
    cx.addEventListener('change', function (e) { if (e.target.matches('[data-ve-csv]') && e.target.files[0]) importa(aberto, e.target.files[0]); });
    inicio();
    var st = document.createElement('style');
    st.textContent = '.ve-caixa{width:min(860px,100%)!important}.ve-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:12px 0}' +
      '.ve-item{display:grid;gap:2px;text-align:left;padding:10px 12px;border:1px solid #e1dfd8;border-radius:12px;background:#fff;cursor:pointer;font:inherit;color:inherit}.ve-item small{color:#6b7080}.ve-num{background:#f6f3ec}' +
      '.ve-volta{border:0;background:none;color:#44506a;cursor:pointer;font:inherit;padding:0}.ve-acoes{display:flex;gap:8px;flex-wrap:wrap}.ve-arq{display:inline-flex;align-items:center}.ve-dica{font-size:.82rem}' +
      '.ve-tab{overflow:auto;max-height:52vh;border:1px solid #ecebe6;border-radius:10px;margin-top:8px}.ve-tab table{width:100%;border-collapse:collapse;font-size:.88rem}.ve-tab th,.ve-tab td{padding:7px 9px;border-bottom:1px solid #ecebe6;text-align:left;white-space:nowrap}' +
      '.ve-tab th{position:sticky;top:0;background:#f6f5f1}.ve-bts{text-align:right}.ve-bts button{border:1px solid #cfd2da;background:#fff;border-radius:8px;padding:3px 9px;margin-left:4px;cursor:pointer;font:inherit;font-size:.82rem}' +
      '.ve-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.ve-form label{display:grid;gap:4px;font-size:.88rem;margin:0}.ve-form input,.ve-form select{min-height:40px;border:1px solid #cfd2da;border-radius:10px;padding:0 10px;font:inherit;background:#fff}' +
      '.ve-form .ve-chk{display:flex;align-items:center;gap:8px}.ve-form .ve-chk input{min-height:0}.ve-form .vc-bt,.ve-form [data-ve-salvo]{grid-column:1/-1;justify-self:start}';
    v.appendChild(st);
  };
})();

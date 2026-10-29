/*
 * Veltria · camada comum das 24 versões (demonstração e conta). Carregada depois do app.js.
 *  - Botão + em toda tela: adicionar na lista da tela, importar planilha (Excel/CSV), exportar tudo para o Excel, todos os dados.
 *  - Campos de escolha longos ganham busca digitando.
 *  - Na conta (window.veltriaConta): primeiros passos com progresso e comemoração, dias seguidos de uso e o resumo de ontem.
 * Grava pelo localStorage da própria tela (no modo conta, o conta-nuvem.js intercepta e leva para a nuvem).
 */
// ---------------------------------------------------------------- versão nova publicada chega sozinha
// O site guarda cada página por até 10 minutos no navegador e quem deixa o sistema aberto não recarrega. Ao abrir e a cada
// 5 minutos (com a aba visível) compara as versões dos arquivos desta página (nome.js?v=N) com as do servidor; se mudaram,
// busca a página nova e recarrega (os dados já ficam salvos a cada alteração). Com alguém digitando ou uma janela aberta,
// mostra um aviso com o botão Atualizar. Uma tentativa por versão: se o servidor ainda não trocou, não fica recarregando.
(function () {
  var RE = /[\w.-]+\.(?:js|css)\?v=\d+/g;
  var assinatura = function (txt) { return (String(txt).match(RE) || []).filter(function (x, i, l) { return l.indexOf(x) === i; }).sort().join('|'); };
  var atual = assinatura([].map.call(document.querySelectorAll('script[src],link[href]'), function (e) { return e.getAttribute('src') || e.getAttribute('href'); }).join(' '));
  if (!atual) return;
  var ocupado = function () { var a = document.activeElement; return !!document.querySelector('.janela-v, .vc-veu, .veu, .veu-a, .veu-f, dialog[open]') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox'); };
  var recarrega = function () {
    var u = new URL(location.href); u.searchParams.delete('novo'); // na demonstração, ?novo apagaria o que a pessoa fez
    fetch(u.href, { cache: 'reload' }).catch(function () {}).then(function () { if (u.href !== location.href) location.replace(u.href); else location.reload(); });
  };
  var aviso = function () {
    if (document.getElementById('vk-nova')) return;
    var b = document.createElement('div'); b.id = 'vk-nova'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#141820;color:#fff;padding:10px 14px;border-radius:12px;font:14px system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.25)';
    b.innerHTML = 'Há uma versão nova do sistema. <button type="button" style="background:#fff;color:#141820;border:0;border-radius:8px;padding:5px 12px;font:600 13px system-ui,sans-serif;cursor:pointer">Atualizar</button>';
    b.querySelector('button').addEventListener('click', recarrega); document.body.appendChild(b);
  };
  var confere = function () {
    if (document.hidden) return;
    fetch(location.pathname + '?versao-nova=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      var srv = assinatura(html), tem = atual.split('|'); if (!srv || srv.split('|').every(function (x) { return tem.indexOf(x) >= 0; })) return; // nada mais novo no servidor
      var k = 'veltria-tentou-versao:' + location.pathname; try { if (sessionStorage.getItem(k) === srv) return aviso(); sessionStorage.setItem(k, srv); } catch (e) { /* sem sessão: segue */ }
      if (ocupado()) aviso(); else recarrega();
    }).catch(function () { /* sem internet: confere na próxima */ });
  };
  setTimeout(confere, 2500); setInterval(confere, 5 * 60e3);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) confere(); });
})();

// demonstração que acabou de receber o exemplo novo (conta-nuvem.js): avisa uma vez
(function () {
  var n; try { n = sessionStorage.getItem('veltria-exemplo-novo'); sessionStorage.removeItem('veltria-exemplo-novo'); } catch (e) { n = null; }
  if (!n) return;
  var b = document.createElement('div'); b.setAttribute('role', 'status');
  b.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#141820;color:#fff;padding:10px 16px;border-radius:12px;font:14px system-ui,sans-serif;max-width:92vw;box-shadow:0 10px 30px rgba(0,0,0,.25)';
  b.textContent = 'A demonstração do ' + n + ' foi atualizada com as novidades. O que você tinha testado antes ficou guardado neste navegador.';
  var poe = function () { document.body.appendChild(b); setTimeout(function () { b.remove(); }, 9000); };
  if (document.body) poe(); else addEventListener('DOMContentLoaded', poe);
})();
(function () {
  var V = window.VELTRIA_VERSOES || {}, m = location.pathname.match(/sistemas\/([a-z]+)-([a-z]+)\//);
  if (!m || !window.veltriaDados) return;
  var app = m[1] + m[2], ver = V[app] || {}, CHAVE = ver.chave, conta = window.veltriaConta || null;
  var BASE = new URL('.', document.currentScript.src).href;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var script = function (src) { return new Promise(function (ok, f) { var s = document.createElement('script'); s.src = BASE + src; s.onload = ok; s.onerror = f; document.head.appendChild(s); }); };
  var dados = function () { return JSON.parse(JSON.stringify(window.veltriaDados())); };
  var soLeitura = function () { return !!(window.veltriaPermissoes && window.veltriaPermissoes.so_leitura); };
  function toast(t) { var d = document.createElement('div'); d.className = 'vk-toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3800); }

  // ---------------------------------------------------------------- editor (adicionar, importar, todos os dados)
  function editor(abrir) {
    if (soLeitura()) { toast('O seu acesso é só para ver. Peça ao dono para liberar as alterações.'); return; }
    if (window.veltriaAbrirDados) { window.veltriaAbrirDados(abrir); return; } // modo conta: o conta-nuvem grava na nuvem
    script('editor.js?v=7').then(function () {
      var salvou = false;
      window.veltriaEditor({ dados: dados(), dias: '', abrir: abrir,
        salvar: function (d) { salvou = true; localStorage.setItem(CHAVE, JSON.stringify(d)); return Promise.resolve(); },
        fechou: function () { if (salvou) location.reload(); } });
    });
  }
  // lista da tela aberta: pelo nome da tela (#clientes -> clientes) ou por apelidos (#balcao -> agendamentos)
  var APELIDOS = { balcao: 'ags', dia: 'ags', agenda: 'agenda ags', pauta: 'prazos', funil: 'deals negocios', baralho: 'negocios', hoje: 'negocios vendas', patio: 'os', quadro: 'os', ordens: 'os', nova: 'os',
    contatos: 'clientes negocios deals', receber: 'cobrancas lancs', pagar: 'pagar pags contas', contas: 'contas pagar fixas lancs', caixa: 'movs caixa vendas', estoque: 'produtos prods estoque', pecas: 'pecas estoque',
    vender: 'vendas produtos', orcar: 'orcamentos', orcamentos: 'orcamentos orcs', fiado: 'clientes', dinheiro: 'movs', mapa: 'transf', metas: 'equipe vend vendedores', intimacoes: 'intimacoes',
    filas: 'intimacoes prazos', fluxo: 'lancs', conciliar: 'extrato', aprovar: 'pags', obras: 'obras', carteira: 'obras', suprimentos: 'cotacoes', ocupacao: 'ofertas', clube: 'planos', reativar: 'rfm',
    produtividade: 'mec', boxes: 'carros', posvenda: 'detratores', frotas: 'frotas', previsao: 'deals', cadencias: 'cadencias', pontuacao: 'leads', distribuicao: 'novos', ganhos: 'deals', times: 'pessoas',
    perdas: 'perdas', campanhas: 'campanhas', compra: 'compra', precos: 'precos', transferencias: 'transf', controlados: 'livro', receitas: 'receitas', validade: 'prods', continuo: 'clientes', entregas: 'entregas',
    processos: 'processos', prazos: 'prazos', audiencias: 'audiencias', honorarios: 'honorarios contratos', atendimentos: 'atendimentos', horas: 'horas', financeiro: 'lancs contas pagar despesas', cronograma: 'obras',
    medicoes: 'medicoes', compras: 'compras', diario: 'diario rdos', clientes: 'clientes', produtos: 'produtos prods', servicos: 'servicos servs', pacotes: 'pacotes', comissoes: 'pros', equipe: 'equipe pros mecanicos advs' };
  function listaDaTela(listas) {
    var rota = norm(location.hash.slice(1).split(/[?/]/)[0]), chaves = listas.map(function (l) { return l[0]; });
    var cand = (APELIDOS[rota] || '').split(' ').filter(Boolean).concat([rota]);
    for (var i = 0; i < cand.length; i++) if (chaves.indexOf(cand[i]) >= 0) return listas[chaves.indexOf(cand[i])];
    if (rota.length >= 4) for (var j = 0; j < listas.length; j++) { var k = norm(listas[j][0]), n = norm(listas[j][1]); if (k.indexOf(rota.slice(0, 5)) === 0 || rota.indexOf(k.slice(0, 5)) === 0 || n.indexOf(rota) >= 0) return listas[j]; }
    // telas que não mudam o endereço: pelo botão ativo do menu e pelo título da tela
    var ativo = document.querySelector('nav [aria-current]:not([aria-current=false]), nav .on, nav .ativo, [aria-selected=true], [aria-pressed=true], [data-m].on, [data-modulo].on, [data-camada].on, [data-fila].on');
    var titulo = document.querySelector('main h1, main h2, #app h1, .area h1, h1');
    var textos = [ativo && ativo.textContent, titulo && titulo.textContent].filter(Boolean).map(function (t) { return norm(t.replace(/\d+/g, ' ')); });
    for (var a = 0; a < textos.length; a++) {
      var ali = Object.keys(APELIDOS).filter(function (x) { return textos[a].indexOf(x) === 0; })[0];
      if (ali) { var ca = APELIDOS[ali].split(' '); for (var b = 0; b < ca.length; b++) if (chaves.indexOf(ca[b]) >= 0) return listas[chaves.indexOf(ca[b])]; }
      var porNome = listas.slice().sort(function (x, y) { return y[1].length - x[1].length; }).filter(function (l) { var n5 = norm(l[1]).slice(0, 5); return n5.length >= 4 && textos[a].indexOf(n5) >= 0; })[0];
      if (porNome) return porNome;
    }
    return null;
  }
  function exportar() {
    import(BASE + 'xlsx.js').then(function (x) {
      var d = dados(), abas = [];
      Object.keys(d).forEach(function (k) {
        var l = d[k]; if (!Array.isArray(l) || !l.length || typeof l[0] !== 'object' || /^(conversa|audit|auditoria|log)$/.test(k)) return;
        var cols = Object.keys(l[0]).filter(function (c) { return l.some(function (it) { return it && it[c] != null && typeof it[c] !== 'object'; }); });
        abas.push({ nome: (window.veltriaEditorListas ? (window.veltriaEditorListas(d).find(function (p) { return p[0] === k; }) || [k, k])[1] : k).slice(0, 31), linhas: [cols].concat(l.map(function (it) { return cols.map(function (c) { var v = it[c]; return v == null || typeof v === 'object' ? '' : v; }); })) });
      });
      if (!abas.length) { toast('Ainda não há dados para exportar.'); return; }
      x.baixarXlsx((ver.nome || 'Veltria') + ' - dados ' + new Date().toLocaleDateString('pt-BR').replace(/\//g, '-'), abas);
      marca('exportou');
    }).catch(function () { toast('Não foi possível gerar a planilha agora.'); });
  }
  // procurar nesta tela: filtra linhas de tabela, itens de lista e cartões pelo texto (Ctrl+K ou pelo botão +)
  function procurar() {
    var b = document.querySelector('.vk-busca'); if (b) { b.querySelector('input').focus(); return; }
    b = document.createElement('div'); b.className = 'vk-busca'; b.setAttribute('role', 'search');
    b.innerHTML = '<input type="search" placeholder="Procurar nesta tela (nome, telefone, valor…)" aria-label="Procurar nesta tela"><span class="vk-busca-n" aria-live="polite"></span><button type="button" aria-label="Fechar a busca">×</button>';
    document.body.appendChild(b);
    var i = b.querySelector('input'), n = b.querySelector('.vk-busca-n');
    var itens = function () { return [].slice.call(document.querySelectorAll('tbody tr, main li, #app li, .area li, [class*="cart"]:not(.vk-busca), [class*="card"], [class*="item"]:not(.vk-menu *)')).filter(function (e) { return !e.closest('.vk-busca,.vk-menu,.vc-faixa,nav,header') && e.offsetParent !== null || e.dataset.vkOculto; }); };
    var filtra = function () {
      var q = norm(i.value), vis = 0, tot = 0;
      itens().forEach(function (e) { if (e.querySelector('tbody tr, li') && e.tagName !== 'TR') return; tot++; var ok = !q || norm(e.textContent).indexOf(q) >= 0; e.style.display = ok ? '' : 'none'; if (ok) vis++; if (!ok) e.dataset.vkOculto = '1'; else delete e.dataset.vkOculto; });
      n.textContent = q ? vis + ' de ' + tot : '';
    };
    i.addEventListener('input', filtra);
    var fecha = function () { i.value = ''; filtra(); b.remove(); };
    b.querySelector('button').addEventListener('click', fecha);
    i.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
    addEventListener('hashchange', function () { if (document.body.contains(b)) fecha(); }, { once: true });
    i.focus();
  }
  addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.defaultPrevented) { e.preventDefault(); procurar(); } });
  function menu() {
    var aberto = document.querySelector('.vk-menu'); if (aberto) { aberto.remove(); return; }
    var go = function () {
      var listas = window.veltriaEditorListas ? window.veltriaEditorListas(window.veltriaDados()) : [], daTela = listaDaTela(listas);
      var mn = document.createElement('div'); mn.className = 'vk-menu'; mn.setAttribute('role', 'menu');
      mn.innerHTML = (proprio ? '<button type="button" role="menuitem" data-vk="proprio">+ ' + esc(proprio.getAttribute('aria-label') || 'Novo') + '</button>' : '') + (daTela ? '<button type="button" role="menuitem" data-vk="novo">+ Adicionar em ' + esc(daTela[1]) + '</button><button type="button" role="menuitem" data-vk="importar">Importar planilha para ' + esc(daTela[1]) + '</button>' : '') +
        (daTela ? '' : '<button type="button" role="menuitem" data-vk="importarQualquer">Importar planilha (Excel ou CSV)</button>') + '<button type="button" role="menuitem" data-vk="procurar">Procurar nesta tela <small>Ctrl+K</small></button><button type="button" role="menuitem" data-vk="dados">Todos os dados (adicionar, editar, importar)</button>' +
        '<button type="button" role="menuitem" data-vk="exportar">Exportar tudo para o Excel</button><button type="button" role="menuitem" data-vk="imprimir">Imprimir esta tela</button>';
      mn.addEventListener('click', function (e) { var b = e.target.closest('[data-vk]'); if (!b) return; mn.remove();
        ({ proprio: function () { proprio.click(); }, novo: function () { editor({ lista: daTela[0], acao: 'novo' }); }, importar: function () { editor({ lista: daTela[0], acao: 'importar' }); }, importarQualquer: function () { editor({ acao: 'importar-qualquer' }); }, dados: function () { editor(null); }, exportar: exportar, procurar: procurar, imprimir: function () { window.print(); } })[b.dataset.vk](); });
      document.body.appendChild(mn); var p = mn.querySelector('button'); if (p) p.focus();
      setTimeout(function () { document.addEventListener('click', function fora(e) { if (!e.target.closest('.vk-menu,.vk-mais')) { mn.remove(); document.removeEventListener('click', fora); } }); }, 0);
    };
    window.veltriaEditorListas ? go() : script('editor.js?v=7').then(go);
  }
  var mais = document.createElement('button'); mais.type = 'button'; mais.className = 'vk-mais'; mais.setAttribute('aria-label', 'Adicionar, importar ou exportar'); mais.title = 'Adicionar, importar planilha ou exportar';
  mais.innerHTML = '<span aria-hidden="true">+</span>'; mais.addEventListener('click', menu);
  // no celular muitos apps têm barra fixa embaixo (menu, campo de mensagem, bolha da IA): o + sobe acima dela em vez de cobrir
  // o app já tem o seu + (botão solto ou no meio do menu de baixo): não pode aparecer outro + igual
  var proprio = null, ajustado = false;
  function fabProprio() {
    if (ajustado) return; var achou = null;
    document.querySelectorAll('body button, body a').forEach(function (el) {
      if (achou || el === mais || el.closest('.vk-mais,.vk-menu') || el.textContent.trim() !== '+' || !el.getClientRects().length) return;
      var b = el.getBoundingClientRect(); if (b.width < 36 || b.top < innerHeight * 0.5) return;
      for (var p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') { achou = { el: el, solto: p === el }; return; }
    });
    if (!achou) return; ajustado = true;
    // botão solto: some e a ação dele vira o primeiro item do menu do +
    if (achou.solto) { proprio = achou.el; proprio.style.display = 'none'; return; }
    // + no menu de baixo: o nosso vira "mais opções" (três pontos) para não repetir o sinal
    mais.innerHTML = '<span aria-hidden="true" style="font:700 1.3rem/1 system-ui;letter-spacing:1px">•••</span>'; mais.setAttribute('aria-label', 'Mais opções: importar planilha, exportar, procurar'); mais.title = 'Importar planilha, exportar ou procurar';
  }
  function subirMais() {
    if (window.veltriaSemMaisComum) return; // o + comum nem entrou: o + do app fica como está
    fabProprio();
    var alto = 18, dir = innerWidth - 18, esq = dir - 56;
    document.querySelectorAll('body *').forEach(function (el) {
      if (el === mais || el.closest('.vk-mais,.vk-menu,.vk-toast,.vk-lado,.vc-veu')) return;
      var cs = getComputedStyle(el); if (cs.position !== 'fixed' && cs.position !== 'sticky') return; if (cs.display === 'none' || cs.visibility === 'hidden') return;
      var b = el.getBoundingClientRect(); if (b.width < 8 || b.height < 8 || b.bottom < innerHeight - 4 - 160 || b.top < innerHeight * 0.55) return;
      if (b.left >= dir || b.right <= esq) return;
      alto = Math.max(alto, innerHeight - b.top + 12);
    });
    mais.style.bottom = alto + 'px'; document.documentElement.style.setProperty('--vk-mais-base', alto + 'px');
  }

  // ---------------------------------------------------------------- tela vazia: diz o que fazer em vez de parecer quebrada
  var DICAS = { clientes: 'Cadastre os seus clientes ou traga a lista do Excel: nome e telefone já bastam.', produtos: 'Traga os produtos do Excel (nome, preço, estoque) ou cadastre um por um.',
    prods: 'Traga os produtos do Excel (nome, preço, estoque) ou cadastre um por um.', servicos: 'Cadastre os serviços com duração e preço: eles aparecem na agenda e no link de agendamento.',
    processos: 'Cadastre os processos ou traga a planilha do escritório (número, cliente, vara).', obras: 'Cadastre a primeira obra ou aprove um orçamento para ela virar obra.' };
  var vazioFeito = '';
  function telaVazia() {
    var abaixo = document.querySelector('.vk-vazio'); if (abaixo) abaixo.remove();
    if (!window.veltriaEditorListas) return;
    var listas = window.veltriaEditorListas(window.veltriaDados()), t = listaDaTela(listas); if (!t) return;
    var l = window.veltriaDados()[t[0]]; if (!Array.isArray(l) || l.length) return;
    var titulo = document.querySelector('main h1, #app h1, .area h1, h1'); if (!titulo) return;
    var bloco = titulo.closest('header, .titulo, .topo-s, .topo-m, .topo-c, .cab, .cabeca, .cab-p, div') || titulo;
    var v = document.createElement('div'); v.className = 'vk-vazio';
    v.innerHTML = '<b>Nada em ' + esc(t[1].toLowerCase()) + ' ainda.</b><span>' + esc(DICAS[t[0]] || 'Cadastre o primeiro ou traga uma planilha do Excel: o sistema reconhece as colunas.') + '</span>' +
      '<div><button type="button" data-vkv="novo">+ Adicionar</button><button type="button" data-vkv="importar">Importar planilha</button>' + (conta ? '' : '') + '</div>';
    v.addEventListener('click', function (e) { var b = e.target.closest('[data-vkv]'); if (b) editor({ lista: t[0], acao: b.dataset.vkv }); });
    bloco.parentNode.insertBefore(v, bloco.nextSibling);
  }
  var vigiaVazio = function () { var k = location.hash + '|' + (window.veltriaEditorListas ? 1 : 0); if (k === vazioFeito && document.querySelector('.vk-vazio')) return; vazioFeito = k; setTimeout(telaVazia, 120); };

  // ---------------------------------------------------------------- espaço vazio vira resumo e atalhos
  var brl = function (v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
  function numerosDe(l) { // quantos e quanto (soma do primeiro campo de valor que existir)
    // dinheiro primeiro: "total" às vezes é quantidade (sessões de um pacote), então só entra se não houver outro
    var c = l.length, k = l.length && ['valor', 'preco', 'gasto', 'saldo', 'fat', 'mensal', 'contrato', 'v', 'tot', 'total'].find(function (x) { return typeof l[0][x] === 'number' && (x !== 'total' || !('usadas' in l[0] || 'qtd' in l[0])); });
    return { n: c, soma: k ? l.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0) : null };
  }
  var tituloDe = function (x) { return x && typeof x === 'object' ? (x.nome || x.cliente || x.titulo || x.desc || x.prod || x.conta || x.empresa || x.placa || x.cnj || '') : ''; };
  function atalhos(t) {
    return '<div class="vk-atalhos">' + (t ? '<button type="button" data-vka="novo">+ Adicionar</button><button type="button" data-vka="importar">Importar planilha</button>' : '<button type="button" data-vka="importarQualquer">Importar planilha</button>') +
      '<button type="button" data-vka="procurar">Procurar <small>Ctrl+K</small></button><button type="button" data-vka="exportar">Exportar para o Excel</button></div>';
  }
  function liga(el, t) {
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-vka]'); if (!b) return; var a = b.dataset.vka;
      if (a === 'procurar') procurar(); else if (a === 'exportar') exportar(); else if (a === 'importarQualquer') editor({ acao: 'importar-qualquer' }); else editor({ lista: t[0], acao: a }); });
  }
  // Essencial no computador: o app é uma coluna de celular; o espaço dos lados ganha um painel útil
  function painelLado() {
    var velho = document.querySelector('.vk-lado'); if (velho) velho.remove();
    if (!/essencial$/.test(app) || innerWidth < 1180 || /celular=1/.test(location.search) || !window.veltriaEditorListas) return;
    var col = document.querySelector('main') || document.querySelector('#app'); if (!col) return;
    var r = col.getBoundingClientRect(); if (r.left < 300) return;
    var d = window.veltriaDados(), listas = window.veltriaEditorListas(d), t = listaDaTela(listas);
    var linhas = listas.filter(function (l) { return Array.isArray(d[l[0]]) && d[l[0]].length; }).slice(0, 5).map(function (l) { var x = numerosDe(d[l[0]]); return '<li><span>' + esc(l[1]) + '</span><b>' + x.n + (x.soma ? ' · ' + brl(x.soma) : '') + '</b></li>'; }).join('');
    var p = document.createElement('aside'); p.className = 'vk-lado'; p.setAttribute('aria-label', 'Resumo e atalhos');
    p.style.width = Math.min(300, r.left - 48) + 'px';
    p.innerHTML = '<h2>Resumo</h2>' + (linhas ? '<ul>' + linhas + '</ul>' : '<p>Nada cadastrado ainda. Comece pelo + Adicionar ou traga uma planilha.</p>') + atalhos(t) +
      '<p class="vk-dica">Este sistema foi feito para o celular: abra este endereço no celular e toque em <b>Instalar</b> (Android) ou <b>Compartilhar → Tela de início</b> (iPhone).</p>';
    liga(p, t); document.body.appendChild(p);
  }
  // tela curta (só o topo ocupado): resumo da lista da tela e atalhos logo abaixo do conteúdo
  function apoioTela() {
    var velho = document.querySelector('.vk-apoio'); if (velho) velho.remove();
    if (document.querySelector('.vk-vazio') || !window.veltriaEditorListas) return;
    var d = window.veltriaDados(), listas = window.veltriaEditorListas(d), t = listaDaTela(listas);
    var col = document.querySelector('main') || document.querySelector('#app') || document.querySelector('.area'); if (!col) return;
    var fim = col.getBoundingClientRect().bottom; if (fim > innerHeight * 0.62 || document.documentElement.scrollHeight > innerHeight * 1.05) return;
    var l = t && d[t[0]];
    if (!Array.isArray(l) || !l.length) { // tela de ajuste ou sem lista: o panorama da empresa ocupa o espaço
      var cheias = listas.filter(function (p) { return Array.isArray(d[p[0]]) && d[p[0]].length; }).slice(0, 4); if (!cheias.length) return;
      var pn = document.createElement('section'); pn.className = 'vk-apoio'; pn.setAttribute('aria-label', 'Panorama da empresa');
      pn.innerHTML = cheias.map(function (p) { return '<div class="vk-num"><b>' + d[p[0]].length + '</b><span>' + esc(p[1].toLowerCase()) + '</span></div>'; }).join('') + atalhos(null);
      liga(pn, null); col.appendChild(pn); return;
    }
    var x = numerosDe(l), recentes = l.slice(0, 3).map(tituloDe).filter(Boolean);
    var a = document.createElement('section'); a.className = 'vk-apoio'; a.setAttribute('aria-label', 'Resumo de ' + t[1]);
    a.innerHTML = '<div class="vk-num"><b>' + x.n + '</b><span>' + esc(t[1].toLowerCase()) + '</span></div>' + (x.soma ? '<div class="vk-num"><b>' + brl(x.soma) + '</b><span>no total</span></div>' : '') +
      (recentes.length ? '<div class="vk-rec"><span>Mais recentes</span>' + recentes.map(function (r) { return '<b>' + esc(r) + '</b>'; }).join('') + '</div>' : '') + atalhos(t);
    liga(a, t); col.appendChild(a);
  }
  var arrumando = 0;
  function arrumaEspaco() { clearTimeout(arrumando); arrumando = setTimeout(function () { try { painelLado(); apoioTela(); } catch (e) { /* tela diferente: deixa como está */ } }, 350); }

  // ---------------------------------------------------------------- PIX de verdade nas cobranças pelo WhatsApp
  // Mensagem de WhatsApp que fala de PIX e tem valor (R$) ganha o "PIX copia e cola" oficial (BR Code do Banco Central,
  // base/pix.js) com a chave da empresa e o valor: o cliente paga com um toque, direto na conta da empresa, sem taxa.
  function chaveDaEmpresa(d) { return d._pix || d.pix || (d.empresa && d.empresa.pix) || (d.oficina && d.oficina.pix) || ''; }
  function nomeDaEmpresa(d) { return (conta && conta.empresa) || d.studio || d.salao || d.farm || d.negocio || (d.empresa && (d.empresa.nome || d.empresa)) || (d.oficina && d.oficina.nome) || d.rede || ver.nomeCategoria || 'Empresa'; }
  function pedirChave() {
    return new Promise(function (ok) {
      var v = document.createElement('div'); v.className = 'vk-veu';
      v.innerHTML = '<form class="vk-caixa"><h2>Chave PIX da empresa</h2><p class="vk-mudo">Para a cobrança ir com o PIX copia e cola, com o valor certo. O dinheiro cai direto na conta da empresa, sem taxa. Fica guardada para as próximas.</p>' +
        '<label style="display:grid;gap:4px;margin:10px 0">Chave (CPF, CNPJ, celular, e-mail ou chave aleatória)<input name="k" required style="min-height:42px;border:1px solid #cfd2da;border-radius:10px;padding:0 10px;font:inherit"></label>' +
        '<button class="vk-bt">Guardar e mandar</button> <button type="button" class="vk-bt" style="background:transparent;color:#1d2230;border:1px solid #1d2230" data-pula>Mandar sem PIX</button></form>';
      document.body.appendChild(v); var f = v.querySelector('form'); f.k.focus();
      f.onsubmit = function (e) { e.preventDefault(); var k = f.k.value.trim(); v.remove(); ok(k); };
      v.querySelector('[data-pula]').onclick = function () { v.remove(); ok(''); };
    });
  }
  function comPix(url) {
    var u; try { u = new URL(url, location.href); } catch (e) { return Promise.resolve(url); }
    if (!/(^|\.)wa\.me$|api\.whatsapp\.com$/.test(u.hostname)) return Promise.resolve(url);
    var texto = u.searchParams.get('text') || '';
    var m = texto.match(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/);
    if (!/pix/i.test(texto) || !m || /000201/.test(texto)) return Promise.resolve(url);
    var valor = Number(m[1].replace(/\./g, '').replace(',', '.')); if (!(valor > 0)) return Promise.resolve(url);
    var d = window.veltriaDados(), chave = chaveDaEmpresa(d);
    return (chave ? Promise.resolve(chave) : pedirChave().then(function (k) {
      if (k) { d._pix = k; try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* segue */ } }
      return k;
    })).then(function (k) {
      if (!k) return url;
      return import(BASE + 'pix.js').then(function (px) {
        var codigo = px.pixCopiaECola({ chave: k, nome: String(nomeDaEmpresa(d)).replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim(), valor: valor });
        if (!codigo) return url;
        // monta com encodeURIComponent (espaço vira %20, não "+", que o WhatsApp mostraria no texto)
        var outros = u.search.replace(/^\?/, '').split('&').filter(function (p) { return p && !/^text=/.test(p); });
        u.search = '?' + outros.concat('text=' + encodeURIComponent(texto + '\n\nPIX copia e cola (' + m[0] + '):\n' + codigo)).join('&');
        return u.toString();
      });
    }).catch(function () { return url; });
  }
  window.veltriaComPix = comPix; // usado pelos testes
  var abrirJanela = window.open;
  window.open = function (url, alvo, opc) {
    if (typeof url === 'string' && /wa\.me|api\.whatsapp\.com/.test(url) && /pix/i.test(decodeURIComponent(url))) {
      var w = abrirJanela.call(window, 'about:blank', alvo || '_blank'); // abre já, no clique (o navegador não bloqueia)
      comPix(url).then(function (u) { if (w) w.location.href = u; else abrirJanela.call(window, u, alvo, opc); });
      return w;
    }
    return abrirJanela.apply(window, arguments);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]'); if (!a || a.dataset.vkPix) return;
    if (!/pix/i.test(decodeURIComponent(a.getAttribute('href') || ''))) return;
    e.preventDefault(); var w = abrirJanela.call(window, 'about:blank', '_blank');
    comPix(a.href).then(function (u) { if (w) w.location.href = u; else location.href = u; });
  }, true);

  // ---------------------------------------------------------------- busca nos campos de escolha longos
  function buscaNosSelects(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('select:not([data-vk-busca])').forEach(function (s) {
      if (s.options.length < 12 || s.multiple || s.closest('.vk-menu')) return;
      s.setAttribute('data-vk-busca', '1');
      var i = document.createElement('input'); i.type = 'search'; i.className = 'vk-filtro'; i.placeholder = 'Digite para procurar…'; i.setAttribute('aria-label', 'Procurar na lista');
      i.addEventListener('input', function () {
        var q = norm(i.value), primeira = null;
        [].forEach.call(s.options, function (o) { var ok = !q || norm(o.text).indexOf(q) >= 0; o.hidden = !ok; if (ok && !primeira && o.value) primeira = o; });
        if (primeira && q) { s.value = primeira.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      s.parentNode.insertBefore(i, s);
    });
  }
  new MutationObserver(function (ms) { ms.forEach(function (x) { x.addedNodes.forEach(function (n) { if (n.nodeType === 1) buscaNosSelects(n); }); }); }).observe(document.body, { childList: true, subtree: true });
  buscaNosSelects(document);

  // ---------------------------------------------------------------- nenhuma lista prende: "Outro (escrever)…" nos campos de texto dos formulários
  // só onde o valor é o próprio texto (serviço, categoria, cidade); ids de cadastro e situações seguem fechados
  var FECHADO = /^(st|status|situacao|etapa|un|fase|modo|camada|estado|nivel|papel|polo|tipo|urg|risco|filtro|ordem|ver|mes|ano|dia|periodo)$/i;
  var reaisDe = function (s) { return [].filter.call(s.options, function (o) { return o.value && o.value !== '__vk_outro'; }); };
  function aceitaOutro(s) {
    if (s.multiple || s.closest('.vk-menu,.vc-caixa,.vk-lado')) return false;
    if (!s.closest('form,dialog,[role=dialog],.modal,.folha,.gaveta,[class~=form],.painel-form')) return false;
    if (FECHADO.test(s.name || '') || FECHADO.test(s.id || '')) return false;
    var reais = reaisDe(s); if (reais.length < 2) return false;
    if (reais.every(function (o) { return o.value === o.text.trim(); })) return 'texto';
    return listaDosIds(reais) ? 'cadastro' : false;
  }
  // a lista do banco cujos ids são os valores do campo (cliente, profissional, processo…)
  function listaDosIds(reais) {
    var db = window.veltriaDados(), ids = reais.map(function (o) { return o.value; });
    for (var k in db) { var l = db[k]; if (!Array.isArray(l) || !l.length || typeof l[0] !== 'object' || !l[0] || l[0].id == null) continue;
      var tem = {}; l.forEach(function (it) { if (it) tem[String(it.id)] = 1; });
      if (ids.filter(function (v) { return tem[v]; }).length >= Math.max(2, ids.length * 0.8)) return k; }
    return null;
  }
  // registro novo com o mesmo formato dos outros (textos vazios, números zero), para as telas não quebrarem
  function vazioComo(v) { if (Array.isArray(v)) return []; if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = vazioComo(v[k]); return o; } return typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : ''; }
  function cadastraNovo(s, nome) {
    var db = window.veltriaDados(), k = listaDosIds(reaisDe(s)); if (!k) return null; var l = db[k], mod = l[0];
    var op = reaisDe(s).find(function (o) { return l.some(function (it) { return String(it.id) === o.value; }); });
    var exemplo = l.find(function (it) { return String(it.id) === op.value; }) || mod;
    var campo = Object.keys(exemplo).find(function (c) { return typeof exemplo[c] === 'string' && exemplo[c].length > 1 && op.text.indexOf(exemplo[c]) === 0; }) || ['nome', 'n', 'cli', 'titulo', 'desc'].find(function (c) { return c in mod; }) || 'nome';
    var novo = vazioComo(mod), num = typeof mod.id === 'number';
    novo.id = num ? l.reduce(function (a, it) { return Math.max(a, +it.id || 0); }, 0) + 1 : (String(mod.id).replace(/[0-9a-z]{6,}$|\d+$/, '') || 'n') + Date.now().toString(36);
    novo[campo] = nome; l.push(novo);
    try { if (CHAVE) localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) {}
    marca('primeiro');
    return String(novo.id);
  }
  function poeOutro(s) {
    if (s.dataset.vkOutro) return; var t = aceitaOutro(s); s.dataset.vkOutro = t ? 'sim' : 'nao'; if (!t) return;
    if (t === 'cadastro' && soLeitura()) { s.dataset.vkOutro = 'nao'; return; }
    s.dataset.vkModo = t;
    var o = document.createElement('option'); o.value = '__vk_outro'; o.textContent = t === 'cadastro' ? '+ Cadastrar novo…' : 'Outro (escrever)…'; s.appendChild(o);
  }
  document.addEventListener('focusin', function (e) { if (e.target.tagName === 'SELECT') poeOutro(e.target); });
  document.addEventListener('pointerdown', function (e) { if (e.target.tagName === 'SELECT') poeOutro(e.target); }, true);
  document.addEventListener('change', function (e) {
    var s = e.target; if (s.tagName !== 'SELECT' || s.value !== '__vk_outro') return;
    e.stopImmediatePropagation();
    var antes = s.querySelector('option:not([value="__vk_outro"])'), i = document.createElement('input');
    i.type = 'text'; i.className = s.className; i.placeholder = s.dataset.vkModo === 'cadastro' ? 'Nome do novo cadastro e Enter' : 'Escreva e aperte Enter'; i.setAttribute('aria-label', 'Escrever outra opção'); i.style.width = '100%';
    s.value = antes ? antes.value : ''; s.hidden = true; s.parentNode.insertBefore(i, s.nextSibling); i.focus();
    var feito = false;
    function fim(ok) {
      if (feito) return; feito = true; var t = i.value.trim(); i.remove(); s.hidden = false;
      if (ok && t && s.dataset.vkModo === 'cadastro') {
        var nid = cadastraNovo(s, t); if (!nid) { s.focus(); return; }
        var c = document.createElement('option'); c.value = nid; c.textContent = t; s.insertBefore(c, s.querySelector('option[value="__vk_outro"]'));
        s.value = nid; s.dispatchEvent(new Event('change', { bubbles: true })); toast('"' + t + '" cadastrado. Complete os dados depois pelo botão +.'); s.focus(); return;
      }
      if (ok && t) { var n = [].find.call(s.options, function (o) { return o.value === t; }); if (!n) { n = document.createElement('option'); n.value = n.textContent = t; s.insertBefore(n, s.querySelector('option[value="__vk_outro"]')); } s.value = t; s.dispatchEvent(new Event('change', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true })); }
      s.focus();
    }
    i.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); fim(true); } if (k.key === 'Escape') { k.preventDefault(); k.stopPropagation(); fim(false); } });
    i.addEventListener('blur', function () { fim(true); });
  }, true);
  // botões de escolha (chips) dentro de formulários: "+ Outro" vira um campo; o texto escrito vira um botão igual aos outros e já fica escolhido
  // só onde o valor do botão é o próprio texto (data-v igual ao rótulo): botões que apontam para um índice ou id seguem fechados
  var FORMS = 'form,dialog,[role=dialog],.modal,.folha,.gaveta,[class~=form],.painel-form';
  function chipsComOutro(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('[role=group], .chips, .opcoes').forEach(function (g) {
      if (g.dataset.vkOutro || !g.closest(FORMS) || g.closest('.vk-menu,.vc-caixa,.vk-lado')) return;
      var bs = [].filter.call(g.querySelectorAll(':scope > button'), function (b) { return b.dataset.v != null && b.dataset.v !== ''; });
      if (bs.length < 2 || !bs.every(function (b) { return b.dataset.v === b.textContent.trim(); })) { g.dataset.vkOutro = 'nao'; return; }
      g.dataset.vkOutro = 'sim';
      var mais = document.createElement('button'); mais.type = 'button'; mais.className = bs[0].className; mais.removeAttribute('aria-pressed'); mais.textContent = '+ Outro';
      mais.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var i = document.createElement('input'); i.type = 'text'; i.placeholder = 'Escreva e aperte Enter'; i.setAttribute('aria-label', 'Escrever outra opção');
        i.style.cssText = 'min-width:160px;padding:6px 10px;border-radius:10px;border:1px solid currentColor;font:inherit';
        mais.replaceWith(i); i.focus(); var feito = false;
        function fim(ok) {
          if (feito) return; feito = true; var t = i.value.trim(); i.replaceWith(mais);
          if (!ok || !t) return;
          var nb = [].find.call(g.querySelectorAll(':scope > button'), function (b) { return b.dataset.v === t; });
          if (!nb) { nb = bs[bs.length - 1].cloneNode(false); nb.dataset.v = t; nb.textContent = t; nb.setAttribute('aria-pressed', 'false'); g.insertBefore(nb, mais); }
          nb.click();
        }
        i.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); fim(true); } if (k.key === 'Escape') { k.preventDefault(); k.stopPropagation(); fim(false); } });
        i.addEventListener('blur', function () { fim(true); });
      });
      g.appendChild(mais);
    });
  }
  // ---------------------------------------------------------------- Assistente IA com a personagem (a mesma do PlayCell)
  // acha o painel do assistente de cada sistema pelo campo de pergunta; a personagem acena ao abrir, pensa enquanto a IA
  // responde, explica quando a resposta chega e faz "não sei" no erro. A figura antiga do cabeçalho (a rosa) sai.
  var tIA = 0, PERGUNTA = /pergunt|pergunte|o que (você|vc)|ask|copiloto/i;
  function paineisIA(raiz) {
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (i) {
      if (i.closest('.vk-busca,.vk-menu,.vc-caixa,form.ve-form')) return;
      var p = i.closest('aside,section,dialog,[role=dialog],[class*=ia],[class*=copiloto],[class*=assist],[class*=caixa]') || i.parentElement;
      var tit = (p.querySelector('h1,h2,h3,strong,b') || {}).textContent || '';
      if (!PERGUNTA.test(i.placeholder + ' ' + (i.className || '')) && !/assistente|copiloto/i.test(tit)) return;
      if (!p || p.querySelector('.vk-ia') || p.closest('.vk-ia')) return;
      var r = p.getBoundingClientRect(); if (r.width < 260 || r.height < 180) return;
      p.querySelectorAll('img').forEach(function (im) { var b = im.getBoundingClientRect(); if (b.width && b.width <= 140 && b.top - r.top < 220 && /rosa|veltria|ia|assist|logo/i.test(im.src)) im.style.display = 'none'; });
      var box = document.createElement('div'); box.className = 'vk-ia'; box.setAttribute('aria-hidden', 'true');
      p.insertBefore(box, p.firstElementChild && p.firstElementChild.matches('h1,h2,h3,header,.cab,[class*=cab]') ? p.firstElementChild.nextSibling : p.firstChild);
      import(BASE + 'assistente-ia.js?v=2').then(function (m) {
        var b = m.personagemIA(box, 'ola'); b.estado('ola', 2600);
        var esperando = false, quando = 0;
        var pensa = function () { esperando = true; quando = Date.now(); b.estado('pensando'); };
        p.addEventListener('submit', pensa, true);
        i.addEventListener('keydown', function (e) { if (e.key === 'Enter' && i.value.trim().length > 1) pensa(); });
        p.addEventListener('click', function (e) { var bt = e.target.closest('button'); if (bt && bt.closest('form') || bt && /sugest|chip|pergunta|atalho/i.test(bt.className + ' ' + (bt.parentElement || {}).className)) pensa(); });
        new MutationObserver(function (ms) {
          if (!esperando || Date.now() - quando < 250) return;
          var t = ms.map(function (x) { return [].map.call(x.addedNodes, function (n) { return n.textContent || ''; }).join(' '); }).join(' ');
          if (!t.trim() || /pensando|digitando|…$/i.test(t.trim())) return;
          esperando = false; b.estado(/não consegui|erro|entre de novo|tente de novo/i.test(t) ? 'naosei' : 'explicando', 5000);
        }).observe(p, { childList: true, subtree: true });
      }).catch(function () { box.remove(); });
    });
  }
  // a opção de escrever aparece já na abertura do formulário, não só depois do primeiro clique no campo
  function outroAoAbrir(raiz) {
    if (!raiz.querySelectorAll) return;
    raiz.querySelectorAll('select').forEach(function (s) { if (s.closest(FORMS)) poeOutro(s); });
    chipsComOutro(raiz);
    clearTimeout(tIA); tIA = setTimeout(function () { paineisIA(document); }, 120); // uma busca por rodada de mudanças
  }
  new MutationObserver(function (ms) { ms.forEach(function (x) { x.addedNodes.forEach(function (n) { if (n.nodeType === 1) outroAoAbrir(n.parentNode || n); }); }); }).observe(document.body, { childList: true, subtree: true });
  outroAoAbrir(document);

  // ---------------------------------------------------------------- primeiros passos, dias seguidos e resumo (só na conta)
  var CH = 'veltria-ritmo:' + (conta ? conta.espaco : 'demo') + ':' + app, ritmo = {};
  try { ritmo = JSON.parse(localStorage.getItem(CH) || '{}'); } catch (e) { ritmo = {}; }
  var guardaRitmo = function () { try { localStorage.setItem(CH, JSON.stringify(ritmo)); } catch (e) { /* sem espaço */ } };
  function marca(passo) { ritmo.feitos = ritmo.feitos || {}; if (ritmo.feitos[passo]) return; ritmo.feitos[passo] = Date.now(); guardaRitmo(); if (conta) setTimeout(passos, 400); }
  window.veltriaMarca = marca;
  var contar = function (d) { var t = {}; Object.keys(d).forEach(function (k) { if (Array.isArray(d[k]) && !/^(conversa|audit|auditoria|log)$/.test(k)) t[k] = d[k].length; }); return t; };
  var PASSOS = [
    ['inicio', 'Escolher: começar do zero ou com os exemplos', function (d) { return !!d._modelos || !!(ritmo.feitos || {}).exemplos; }],
    ['primeiro', 'Cadastrar o seu primeiro item', function (d) { var b = ritmo.base || {}; var c = contar(d); return Object.keys(c).some(function (k) { return c[k] > (b[k] || 0); }) || !!(ritmo.feitos || {}).primeiro; }],
    ['importou', 'Trazer uma planilha (botão +, Importar)', function () { return !!(ritmo.feitos || {}).importou; }],
    ['equipe', 'Convidar alguém da equipe', function () { return !!(ritmo.feitos || {}).equipe; }],
    ['ia', 'Fazer uma pergunta ao Assistente', function () { return !!(ritmo.feitos || {}).ia; }],
    ['celular', 'Instalar no celular ou no computador', function () { return matchMedia('(display-mode: standalone)').matches || !!(ritmo.feitos || {}).celular; }]
  ];
  function confete() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('div'); c.className = 'vk-confete'; c.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 28; i++) { var p = document.createElement('i'); p.style.left = (Math.random() * 100) + '%'; p.style.background = ['#c9b37e', '#5cc8b6', '#d8a7a3', '#7fb0e0', '#9cc59a'][i % 5]; p.style.animationDelay = (Math.random() * 0.3) + 's'; p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)'; c.appendChild(p); }
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 1800);
  }
  function passos() {
    var d = window.veltriaDados(), feitos = PASSOS.filter(function (p) { return p[2](d); }).map(function (p) { return p[0]; });
    var antes = ritmo.passosOk || [];
    var novos = feitos.filter(function (p) { return antes.indexOf(p) < 0; });
    ritmo.passosOk = feitos; guardaRitmo();
    var bt = document.querySelector('[data-vk-passos]');
    if (bt) { bt.textContent = feitos.length >= PASSOS.length ? 'Tudo pronto ✓' : 'Primeiros passos ' + feitos.length + '/' + PASSOS.length; bt.style.setProperty('--p', Math.round(feitos.length / PASSOS.length * 100) + '%'); }
    if (novos.length && antes.length) { confete(); toast(feitos.length >= PASSOS.length ? 'Tudo configurado. A sua empresa está pronta no ' + (ver.nomeCategoria || 'sistema') + '.' : 'Passo concluído: ' + PASSOS.find(function (p) { return p[0] === novos[0]; })[1] + ' (' + feitos.length + ' de ' + PASSOS.length + ')'); }
  }
  var TUTORIAL = new URL('../../../video/versoes/' + m[1] + '-' + m[2] + '-tutorial.mp4', BASE).href + '?v=2';
  var VIDEO_PASSOS = new URL('../../../video/versoes/primeiros-passos.mp4', BASE).href + '?v=2';
  function painelPassos() {
    var d = window.veltriaDados(), v = document.createElement('div'); v.className = 'vk-veu';
    v.innerHTML = '<div class="vk-caixa" role="dialog" aria-modal="true" aria-label="Primeiros passos"><h2>Primeiros passos</h2><p class="vk-mudo">Em poucos minutos a sua empresa fica pronta para o dia a dia.</p><ol class="vk-passos">' +
      PASSOS.map(function (p) { var ok = p[2](d); return '<li class="' + (ok ? 'ok' : '') + '"><span aria-hidden="true">' + (ok ? '✓' : '') + '</span>' + esc(p[1]) + '</li>'; }).join('') +
      '</ol><p class="vk-mudo">' + (ritmo.serie > 1 ? 'Você está há <b>' + ritmo.serie + ' dias seguidos</b> com o sistema em dia.' : 'Abra todo dia: o resumo do dia anterior aparece aqui.') + '</p>' +
      '<p class="vk-videos"><a href="' + TUTORIAL + '" target="_blank" rel="noopener">Tutorial em vídeo deste sistema</a><a href="' + VIDEO_PASSOS + '" target="_blank" rel="noopener">Primeiros passos em vídeo</a></p>' +
      '<button type="button" class="vk-bt" data-vk-fecha>Fechar</button></div>';
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('[data-vk-fecha]')) v.remove(); });
    document.body.appendChild(v); v.querySelector('button').focus();
  }
  function ritmoDoDia() {
    var hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), d = window.veltriaDados(), c = contar(d);
    if (!ritmo.base) ritmo.base = c; // contagem do começo, para saber quando entrou o primeiro item
    if (ritmo.dia !== hoje) {
      var ontem = new Date(Date.parse(hoje) - 864e5).toISOString().slice(0, 10);
      ritmo.serie = ritmo.dia === ontem ? (ritmo.serie || 1) + 1 : 1;
      // resumo: o que entrou desde a última abertura
      if (ritmo.contagem) {
        var nomes = window.veltriaEditorListas ? window.veltriaEditorListas(d) : [], cresceu = Object.keys(c).filter(function (k) { return c[k] > (ritmo.contagem[k] || 0); }).map(function (k) { var n = (nomes.find(function (x) { return x[0] === k; }) || [k, k])[1]; return '+' + (c[k] - (ritmo.contagem[k] || 0)) + ' ' + n.toLowerCase(); });
        if (cresceu.length) setTimeout(function () { toast('Desde a última vez: ' + cresceu.slice(0, 4).join(', ') + '. ' + (ritmo.serie > 1 ? ritmo.serie + ' dias seguidos.' : 'Bom trabalho.')); }, 1500);
        else if (ritmo.serie > 2) setTimeout(function () { toast(ritmo.serie + ' dias seguidos com a empresa em dia.'); }, 1500);
      }
      ritmo.dia = hoje; ritmo.contagem = c; guardaRitmo();
    }
  }

  // ---------------------------------------------------------------- guia do sistema, dentro das Configurações
  // O texto de cada versão está em guias.js. Os dois Gestão não têm tela de Configurações: o guia fica no Painel do dono.
  var TELA_GUIA = /^(ajustes|configuracoes|suasconfiguracoes|minhasconfiguracoes)/, TELA_GUIA_DONO = /^paineldodono/;
  function guia() {
    var G = (window.VELTRIA_GUIAS || {})[app]; if (!G || document.querySelector('.vk-guia')) return;
    var h = [].slice.call(document.querySelectorAll('h1')).find(function (x) { var t = norm(x.textContent); return x.getClientRects().length && !x.closest('.vk-caixa,.vk-menu') && (TELA_GUIA.test(t) || (m[1] === 'gestao' && TELA_GUIA_DONO.test(t))); });
    if (!h) return;
    var b = document.createElement('details'); b.className = 'vk-guia';
    b.innerHTML = '<summary>Guia do sistema: como funciona cada parte</summary><p>' + esc(G.intro) + '</p><h3>Primeiros passos</h3><ol>' + G.passos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
      '</ol><h3>O que faz cada tela</h3><dl>' + G.partes.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl><p class="vk-mudo">Dúvida que o guia não responde? Pergunte ao Assistente com IA ou abra um chamado em Suporte.</p>';
    (h.closest('.titulo,.cab,.mod-cab,.cab-p,.cabeca,header:not(body > header)') || h).insertAdjacentElement('afterend', b);
  }
  var guiaVez = 0, vigiaGuia = function () { clearTimeout(guiaVez); guiaVez = setTimeout(guia, 150); };

  // ---------------------------------------------------------------- montar
  var css = '.vk-mais{position:fixed;right:18px;bottom:18px;z-index:60;width:56px;height:56px;border-radius:50%;border:0;background:#1d2230;color:#fff;font:300 2rem/1 system-ui,sans-serif;box-shadow:0 10px 26px -8px rgba(0,0,0,.55);cursor:pointer;display:grid;place-items:center;transition:transform .2s}' +
    '.vk-mais:hover{transform:scale(1.06)}.vk-mais:focus-visible,.vk-menu button:focus-visible{outline:3px solid #c9b37e;outline-offset:2px}' +
    '.vk-menu{position:fixed;right:18px;bottom:calc(var(--vk-mais-base,18px) + 66px);z-index:61;display:grid;min-width:260px;max-width:calc(100vw - 36px);background:#fbfaf7;color:#1d2230;border-radius:14px;padding:6px;box-shadow:0 20px 50px -18px rgba(0,0,0,.55);font:500 14.5px/1.3 system-ui,sans-serif}' +
    '.vk-menu button{border:0;background:none;text-align:left;padding:11px 12px;border-radius:9px;cursor:pointer;font:inherit;color:inherit}.vk-menu button:hover{background:#efece4}' +
    '.vk-filtro{display:block;width:100%;min-height:34px;margin:0 0 4px;border:1px solid #cfd2da;border-radius:8px;padding:0 9px;font:13.5px system-ui,sans-serif;box-sizing:border-box}' +
    '.vk-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:9999;max-width:min(560px,90vw);background:#141820;color:#fff;padding:11px 16px;border-radius:12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 14px 34px -14px rgba(0,0,0,.6)}' +
    '.vk-veu{position:fixed;inset:0;z-index:9998;background:rgba(10,12,18,.6);display:grid;place-items:center;padding:16px}.vk-caixa{width:min(460px,100%);background:#fbfaf7;color:#1d2230;border-radius:16px;padding:20px 22px;font:15px/1.5 system-ui,sans-serif}' +
    '.vk-caixa h2{margin:0 0 4px}.vk-mudo{color:#6b7080;font-size:.9rem}.vk-passos{list-style:none;padding:0;margin:12px 0;display:grid;gap:8px}.vk-passos li{display:flex;gap:10px;align-items:center}.vk-passos span{width:22px;height:22px;border-radius:50%;border:2px solid #cfd2da;display:grid;place-items:center;font-size:.8rem;flex:none}' +
    '.vk-passos li.ok{color:#6b7080;text-decoration:line-through}.vk-passos li.ok span{background:#2f8a57;border-color:#2f8a57;color:#fff}.vk-bt{min-height:42px;border-radius:10px;border:0;background:#1d2230;color:#fff;padding:0 16px;font:600 .95rem system-ui,sans-serif;cursor:pointer}' +
    '.vk-confete{position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden}.vk-confete i{position:absolute;top:-12px;width:8px;height:14px;border-radius:2px;animation:vk-cai 1.6s cubic-bezier(.2,.6,.4,1) forwards}' +
    '@keyframes vk-cai{to{top:105%;transform:rotate(540deg) translateX(40px)}}' +
    '.vk-videos{display:flex;flex-wrap:wrap;gap:8px 16px;margin:4px 0 14px}.vk-videos a{color:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px}' +
    '[data-vk-passos]{background:linear-gradient(90deg,#2f8a57 var(--p,0%),transparent var(--p,0%))!important}' +
    '.vk-vazio{display:grid;gap:8px;margin:14px 0;padding:16px 18px;border:1px dashed currentColor;border-radius:14px;opacity:.92}.vk-vazio span{opacity:.8}.vk-vazio div{display:flex;gap:8px;flex-wrap:wrap}.vk-vazio button{border:1px solid currentColor;background:transparent;color:inherit;border-radius:10px;padding:8px 14px;cursor:pointer;font:600 14px system-ui,sans-serif}.vk-vazio button:first-child{background:#1d2230;color:#fff;border-color:#1d2230}' +
    '.vk-busca{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:62;display:flex;align-items:center;gap:8px;width:min(560px,calc(100vw - 24px));background:#fbfaf7;border-radius:14px;padding:6px 8px;box-shadow:0 16px 40px -16px rgba(0,0,0,.55);font:14px system-ui,sans-serif;color:#1d2230}' +
    '.vk-busca input{flex:1;min-height:40px;border:1px solid #cfd2da;border-radius:10px;padding:0 12px;font:inherit}.vk-busca button{border:0;background:none;font-size:1.4rem;cursor:pointer;color:#6b7080}.vk-busca-n{color:#6b7080;white-space:nowrap}.vk-menu small{color:#8a8f9c;margin-left:6px}' +
    '@media print{.vc-faixa,.vk-busca,.vk-vazio,.vk-toast{display:none!important}}' +
    '.vk-lado{position:fixed;left:24px;top:110px;z-index:5;max-height:calc(100vh - 140px);overflow:auto;background:rgba(255,255,255,.72);backdrop-filter:blur(6px);color:#1d2230;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px 18px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 14px 34px -22px rgba(0,0,0,.5)}' +
    '.vk-lado h2{margin:0 0 8px;font-size:1rem}.vk-lado ul{list-style:none;padding:0;margin:0 0 12px;display:grid;gap:6px}.vk-lado li{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(0,0,0,.06);padding-bottom:5px}.vk-lado .vk-dica{color:#5b6070;font-size:.84rem;margin:12px 0 0}' +
    '.vk-atalhos{display:flex;flex-wrap:wrap;gap:6px}.vk-atalhos button{border:1px solid rgba(0,0,0,.18);background:#fff;color:#1d2230;border-radius:999px;padding:6px 12px;cursor:pointer;font:600 13px system-ui,sans-serif}.vk-atalhos button:first-child{background:#1d2230;color:#fff;border-color:#1d2230}.vk-atalhos small{opacity:.6;font-weight:400}' +
    '.vk-apoio{display:flex;flex-wrap:wrap;align-items:center;gap:14px 26px;margin:22px 0 90px;padding:18px 20px;border:1px solid rgba(127,127,127,.25);border-radius:16px;font:14px/1.4 system-ui,sans-serif}' +
    '.vk-apoio .vk-num{display:grid}.vk-apoio .vk-num b{font-size:1.6rem;line-height:1.1}.vk-apoio .vk-num span,.vk-apoio .vk-rec span{opacity:.7}.vk-apoio .vk-rec{display:grid;gap:2px;min-width:180px}.vk-apoio .vk-atalhos{margin-left:auto}' +
    '@media (max-width:700px){.vk-apoio .vk-atalhos{margin-left:0}}@media print{.vk-lado,.vk-apoio{display:none!important}}' +
    '.vk-guia{margin:12px 0 18px;padding:12px 16px;border:1px solid rgba(127,127,127,.35);border-radius:14px;font:14.5px/1.5 system-ui,sans-serif;max-width:820px}.vk-guia summary{cursor:pointer;font-weight:700;font-size:1rem;padding:2px 0}' +
    '.vk-guia h3{margin:14px 0 6px;font-size:.95rem}.vk-guia ol{margin:0;padding-left:20px;display:grid;gap:4px}.vk-guia dl{margin:0;display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:6px 14px}.vk-guia dt{font-weight:650}.vk-guia dd{margin:0;opacity:.85}' +
    '@media (max-width:560px){.vk-guia dl{grid-template-columns:1fr}.vk-guia dd{margin-bottom:6px}}@media print{.vk-guia{display:none}}' +
    '.vk-tut{margin:4px 0 14px}.vk-tut summary{cursor:pointer;font-weight:600;color:#2a4fa8}.vk-tut video{width:100%;margin-top:8px;border-radius:10px;background:#05070b}' +
    '.vk-ia{display:flex;justify-content:center;margin:2px 0 8px}.vk-ia canvas{height:118px;width:auto;image-rendering:pixelated;image-rendering:crisp-edges}' +
    'html.no-celular .vk-mais{display:none}@media print{.vk-mais,.vk-menu{display:none}}';
  function montar() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    // o app pode ter o próprio + com regras próprias (o Financeiro Essencial): aí o + comum não entra
    if (!window.veltriaSemMaisComum) document.body.appendChild(mais);
    script('guias.js?v=1').then(function () { vigiaGuia(); addEventListener('hashchange', vigiaGuia); new MutationObserver(vigiaGuia).observe(document.body, { childList: true, subtree: true }); }).catch(function () {});
    subirMais(); setTimeout(subirMais, 900); addEventListener('resize', subirMais); addEventListener('hashchange', function () { setTimeout(subirMais, 60); });
    // tela vazia: só faz sentido quando a empresa tem a lista vazia (começou do zero); carrega o editor para saber as listas
    script('editor.js?v=7').then(function () { vigiaVazio(); arrumaEspaco(); addEventListener('hashchange', function () { vigiaVazio(); arrumaEspaco(); }); addEventListener('resize', arrumaEspaco); new MutationObserver(function () { if (!document.querySelector('.vk-vazio')) { vazioFeito = ''; } vigiaVazio(); if (!document.querySelector('.vk-apoio')) arrumaEspaco(); }).observe(document.querySelector('main') || document.body, { childList: true }); }).catch(function () {});
    if (conta) {
      ritmoDoDia();
      var faixa = document.querySelector('.vc-faixa');
      if (faixa && !faixa.querySelector('[data-vk-passos]')) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-vk-passos', ''); b.addEventListener('click', painelPassos); faixa.insertBefore(b, faixa.querySelector('[data-vc="sair"]')); }
      passos();
      addEventListener('appinstalled', function () { marca('celular'); });
      // o primeiro item cadastrado na própria tela também conta: confere a cada gravação
      var gravar = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { var r = gravar.apply(this, arguments); if (this === localStorage && k === CHAVE) setTimeout(passos, 300); return r; };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(montar, 50); }); else setTimeout(montar, 50);
})();

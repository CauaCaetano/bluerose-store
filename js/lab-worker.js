/*
 * Laboratório BLUE ROSE: roda os scripts REAIS de /portfolio no navegador.
 * Pyodide (Python compilado para WebAssembly) dentro de um Web Worker,
 * para a página não travar. Nada sai do navegador de quem testa.
 */
/* global importScripts, loadPyodide */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js');

var SCRIPTS = ['relatorio_vendas.py', 'organizador_arquivos.py', 'qualificador_leads_whatsapp.py', 'recuperador_pix_whatsapp.py', 'gerador_descricoes.py'];
var pronto = null;

function iniciar() {
  if (!pronto) {
    pronto = (async function () {
      var py = await loadPyodide();
      py.FS.mkdirTree('/lab');
      for (var i = 0; i < SCRIPTS.length; i++) {
        var resp = await fetch('../portfolio/' + SCRIPTS[i], { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Não consegui baixar ' + SCRIPTS[i]);
        py.FS.writeFile('/lab/' + SCRIPTS[i], await resp.text());
      }
      return py;
    })();
  }
  return pronto;
}

function limparPasta(py, caminho) {
  if (!py.FS.analyzePath(caminho).exists) return;
  py.FS.readdir(caminho).forEach(function (nome) {
    if (nome === '.' || nome === '..') return;
    var c = caminho + '/' + nome;
    if (py.FS.isDir(py.FS.stat(c).mode)) { limparPasta(py, c); py.FS.rmdir(c); } else py.FS.unlink(c);
  });
}

self.onmessage = async function (e) {
  var pedido = e.data;
  var id = pedido.id;
  var linha = function (texto, tipo) { self.postMessage({ id: id, tipo: tipo || 'linha', texto: texto }); };
  try {
    var inicio = performance.now();
    var py = await iniciar();
    if (pedido.preparar) { self.postMessage({ id: id, tipo: 'pronto', ms: Math.round(performance.now() - inicio) }); return; }

    // Arquivos de entrada (CSV, pasta com nomes de arquivos) num diretório de trabalho limpo
    limparPasta(py, '/lab/trabalho');
    py.FS.mkdirTree('/lab/trabalho');
    Object.keys(pedido.arquivos || {}).forEach(function (caminho) {
      var completo = '/lab/trabalho/' + caminho;
      py.FS.mkdirTree(completo.slice(0, completo.lastIndexOf('/')));
      py.FS.writeFile(completo, pedido.arquivos[caminho]);
    });

    py.setStdout({ batched: function (t) { linha(t); } });
    py.setStderr({ batched: function (t) { linha(t, 'erro'); } });
    py.globals.set('ARGS', py.toPy([pedido.script].concat(pedido.args || [])));
    py.globals.set('SCRIPT', '/lab/' + pedido.script);
    py.globals.set('LANG', pedido.lang === 'en' ? 'en' : 'pt');
    var t0 = performance.now();
    await py.runPythonAsync([
      'import os, sys, runpy',
      'os.chdir("/lab/trabalho")',
      'sys.argv = list(ARGS)',
      'os.environ.pop("ANTHROPIC_API_KEY", None)',
      'os.environ["BR_LANG"] = LANG',
      'try:',
      '    runpy.run_path(SCRIPT, run_name="__main__")',
      'except SystemExit as e:',
      '    if e.code not in (None, 0):',
      '        print(e.code, file=sys.stderr)',
    ].join('\n'));

    // Mostra como a pasta virtual ficou (organizador com --executar)
    if (pedido.arvore) {
      await py.runPythonAsync([
        'import os',
        'print()',
        'print(' + (pedido.lang === 'en' ? '"Virtual folder after organizing:"' : '"Pasta virtual depois de organizar:"') + ')',
        'for raiz, pastas, arquivos in sorted(os.walk("' + pedido.arvore + '")):',
        '    nivel = raiz.count(os.sep) - "' + pedido.arvore + '".count(os.sep)',
        '    print("  " * nivel + os.path.basename(raiz) + "/")',
        '    for a in sorted(arquivos):',
        '        print("  " * (nivel + 1) + a)',
      ].join('\n'));
    }

    // Devolve os arquivos que o script criou (ex.: o CSV do relatório, as pastas do organizador)
    var saidas = {};
    (pedido.ler || []).forEach(function (caminho) {
      var completo = '/lab/trabalho/' + caminho;
      if (py.FS.analyzePath(completo).exists) saidas[caminho] = py.FS.readFile(completo, { encoding: 'utf8' });
    });
    self.postMessage({ id: id, tipo: 'fim', ms: Math.round(performance.now() - t0), saidas: saidas });
  } catch (err) {
    linha(String(err && err.message || err), 'erro');
    self.postMessage({ id: id, tipo: 'fim', erro: true });
  }
};

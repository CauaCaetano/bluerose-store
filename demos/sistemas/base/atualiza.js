// Veltria e VetNature · versão nova publicada chega sozinha (mesmo trecho do camada.js, para telas que não carregam a camada)
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

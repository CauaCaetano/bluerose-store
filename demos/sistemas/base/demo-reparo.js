/* Demonstração que não abre (18/11/2026): se a tela continuar vazia depois de carregar, quase sempre são dados de
 * exemplo antigos guardados neste navegador. Guarda uma cópia, volta ao exemplo e abre de novo (uma vez por sessão);
 * se ainda assim não abrir, mostra um botão "Abrir de novo". Nunca roda na conta do cliente (?conta=).
 * Uso: <script src="../base/demo-reparo.js" data-chave="<chave do localStorage da demonstração>" defer></script> */
(function () {
  var s = document.currentScript, K = s && s.getAttribute('data-chave');
  if (!K || /[?&]conta=/.test(location.search)) return;
  var F = K + '-reparo', ERROS = [];
  var DEMOS = /^(peplo-v1|annona-v1|atria-v1|popina-v1|arca-demo-v\d+|vetnature-demo-v2|veltria-(agenda|crm|farmacia|financeiro|gestao|juridico|obras|oficina)-(essencial|completo|avancado|proto|simples)-v\d+)$/;
  // guarda o motivo (erro de script ou arquivo que não carregou) para mostrar no aviso
  addEventListener('error', function (e) { var t = e.target; ERROS.push(t && t !== window && (t.src || t.href) ? 'Não carregou: ' + (t.src || t.href).replace(location.origin, '') : (e.message || 'erro') + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '')); }, true);
  addEventListener('unhandledrejection', function (e) { ERROS.push('Promessa: ' + String(e.reason && (e.reason.message || e.reason)).slice(0, 200)); });
  // Armazenamento cheio (todas as demonstrações do site dividem o mesmo espaço do navegador): apaga as cópias antigas que
  // as demonstrações guardam ao trocar o exemplo (-antes-do-exemplo-, -copia-antes-do-reparo). Nunca apaga dados de conta.
  function folga() {
    try { localStorage.setItem('__demo_espaco', new Array(300001).join('x')); localStorage.removeItem('__demo_espaco'); return; } catch (e) { try { localStorage.removeItem('__demo_espaco'); } catch (_) { /* ok */ } }
    try { Object.keys(localStorage).forEach(function (k) { if (/-antes-do-exemplo-|-copia-antes-do-reparo/.test(k)) localStorage.removeItem(k); }); } catch (e) { /* sem acesso */ }
    if (cabe()) return;
    // ainda cheio: apaga os dados de exemplo das OUTRAS demonstrações (nome exato da chave da demonstração; a conta de
    // verdade usa outra chave e nunca entra aqui), da maior para a menor, até caber
    try {
      Object.keys(localStorage).filter(function (k) { return k !== K && DEMOS.test(k); })
        .sort(function (a, b) { return (localStorage.getItem(b) || '').length - (localStorage.getItem(a) || '').length; })
        .some(function (k) { localStorage.removeItem(k); return cabe(); });
    } catch (e) { /* sem acesso */ }
  }
  function cabe() { try { localStorage.setItem('__demo_espaco', new Array(300001).join('x')); localStorage.removeItem('__demo_espaco'); return true; } catch (e) { try { localStorage.removeItem('__demo_espaco'); } catch (_) { /* ok */ } return false; } }
  folga();
  function limpa() { try { localStorage.removeItem(K); } catch (e) { /* sem acesso */ } folga(); }
  addEventListener('load', function () {
    setTimeout(function () {
      var t = document.getElementById('tela');
      if (!t || t.textContent.trim()) { try { sessionStorage.removeItem(F); } catch (e) { /* ok */ } return; }
      var ja = false; try { ja = !!sessionStorage.getItem(F); sessionStorage.setItem(F, '1'); } catch (e) { /* ok */ }
      if (!ja) { limpa(); location.reload(); return; }
      t.innerHTML = '<div style="max-width:420px;margin:60px auto;padding:24px;text-align:center;font:16px/1.5 system-ui,sans-serif"><p>A demonstração não abriu neste navegador.</p><p id="demo-motivo" style="font-size:13px;color:#555;word-break:break-word"></p><p><button type="button" style="padding:12px 18px;border-radius:10px;border:0;background:#333;color:#fff;font:inherit;cursor:pointer">Abrir de novo</button></p></div>';
      t.querySelector('#demo-motivo').textContent = (ERROS.length ? ERROS.slice(0, 4).join(' · ') : 'Nenhum erro registrado (o script do sistema não rodou).') + ' · ' + navigator.userAgent;
      t.querySelector('button').onclick = function () { limpa(); try { sessionStorage.removeItem(F); } catch (e) { /* ok */ } location.reload(); };
    }, 3500);
  });
})();

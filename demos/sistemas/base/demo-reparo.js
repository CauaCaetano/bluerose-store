/* Demonstração que não abre (18/11/2026): se a tela continuar vazia depois de carregar, quase sempre são dados de
 * exemplo antigos guardados neste navegador. Guarda uma cópia, volta ao exemplo e abre de novo (uma vez por sessão);
 * se ainda assim não abrir, mostra um botão "Abrir de novo". Nunca roda na conta do cliente (?conta=).
 * Uso: <script src="../base/demo-reparo.js" data-chave="<chave do localStorage da demonstração>" defer></script> */
(function () {
  var s = document.currentScript, K = s && s.getAttribute('data-chave');
  if (!K || /[?&]conta=/.test(location.search)) return;
  var F = K + '-reparo';
  function limpa() { try { var v = localStorage.getItem(K); if (v) localStorage.setItem(K + '-copia-antes-do-reparo', v); localStorage.removeItem(K); } catch (e) { /* sem acesso */ } }
  addEventListener('load', function () {
    setTimeout(function () {
      var t = document.getElementById('tela');
      if (!t || t.textContent.trim()) { try { sessionStorage.removeItem(F); } catch (e) { /* ok */ } return; }
      var ja = false; try { ja = !!sessionStorage.getItem(F); sessionStorage.setItem(F, '1'); } catch (e) { /* ok */ }
      if (!ja) { limpa(); location.reload(); return; }
      t.innerHTML = '<div style="max-width:420px;margin:60px auto;padding:24px;text-align:center;font:16px/1.5 system-ui,sans-serif"><p>A demonstração não abriu neste navegador.</p><p><button type="button" style="padding:12px 18px;border-radius:10px;border:0;background:#333;color:#fff;font:inherit;cursor:pointer">Abrir de novo</button></p></div>';
      t.querySelector('button').onclick = function () { limpa(); try { sessionStorage.removeItem(F); } catch (e) { /* ok */ } location.reload(); };
    }, 3500);
  });
})();

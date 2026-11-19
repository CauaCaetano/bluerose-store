/* Sem a barrinha com o endereço no canto da tela (19/11/2026, pedido do dono): ao passar o mouse num link, o endereço
 * sai do atributo href (o navegador não tem o que mostrar) e volta no mousedown, a tempo do clique, do clique do meio e
 * dos códigos que leem o href. A navegação continua a mesma. Downloads (blob:/data:/download) ficam como estão. */
(function () {
  if (window.__semLink) return; window.__semLink = 1;
  var A = 'data-sem-link';
  function alvo(e) { var t = e.target; return t && t.closest ? t.closest('a') : null; }
  function esconde(a) {
    if (!a || a.hasAttribute('download') || a.hasAttribute(A)) return;
    var h = a.getAttribute('href'); if (h == null || /^(blob:|data:)/i.test(h)) return;
    a.setAttribute(A, h); a.removeAttribute('href');
  }
  function volta(a) { if (!a) return; var h = a.getAttribute(A); if (h == null) return; a.setAttribute('href', h); a.removeAttribute(A); }
  document.addEventListener('mouseover', function (e) { esconde(alvo(e)); }, true);
  document.addEventListener('mousemove', function (e) { var a = alvo(e); if (a && a.hasAttribute('href') && !a.__clicando) esconde(a); }, true);
  document.addEventListener('mouseout', function (e) { var a = alvo(e); if (a && !a.contains(e.relatedTarget)) volta(a); }, true);
  document.addEventListener('mousedown', function (e) { var a = alvo(e); if (!a) return; volta(a); a.__clicando = 1; setTimeout(function () { a.__clicando = 0; }, 700); }, true);
  document.addEventListener('focusin', function (e) { volta(alvo(e)); }, true); // teclado: o link precisa do href para o Enter
  var s = document.createElement('style'); s.textContent = 'a[' + A + ']{cursor:pointer}'; (document.head || document.documentElement).appendChild(s);
})();

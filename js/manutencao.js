/*
 * Veltria Gestão (Essencial, Completo e Avançado) em manutenção desde 23/10/2026.
 * Quem clica para testar ou assinar uma das três versões vê o aviso e fala com a equipe (WhatsApp) para liberar o acesso.
 * A demonstração continua aberta. Para reabrir, tire este script das páginas (index, sistemas, veltria-gestao*)
 * e o MANUTENCAO de demos/sistemas/base/porta.js.
 */
(function () {
  var ALVO = '[data-teste^="gestao"],[data-assinar-app^="gestao"],[data-contratar^="a-sis-gestao"],a[href*="app/gestao"]';
  var NOMES = { gestaoessencial: 'Veltria Gestão Essencial', gestaocompleto: 'Veltria Gestão Completo', gestaoavancado: 'Veltria Gestão Avançado' };
  function nomeDe(b) {
    var id = b.getAttribute('data-teste') || b.getAttribute('data-assinar-app') || ((b.getAttribute('data-contratar') || '').replace(/^a-sis-/, '').replace(/-.*$/, '')) || ((b.getAttribute('href') || '').match(/app\/(gestao[a-z]*)/) || [])[1] || '';
    return NOMES[id] || 'Veltria Gestão';
  }
  function aviso(nome) {
    var wa = window.BR_WA ? 'https://wa.me/' + window.BR_WA + '?text=' + encodeURIComponent('Olá! Quero liberar o acesso ao ' + nome + '.') : '#contato';
    var v = document.createElement('div');
    v.className = 'mt-veu';
    v.innerHTML = '<div class="mt-caixa" role="dialog" aria-modal="true" aria-labelledby="mt-t"><h2 id="mt-t">' + nome + ' em manutenção</h2>' +
      '<p>No momento, a Veltria Gestão está em manutenção e novos acessos são liberados pela nossa equipe. Fale com a gente que liberamos o seu.</p>' +
      '<a class="mt-bt" href="' + wa + '" target="_blank" rel="noopener">Falar com a equipe no WhatsApp</a>' +
      '<button type="button" class="mt-fecha" data-mt-fecha>Fechar</button></div>';
    var antes = document.activeElement, fecha = function () { v.remove(); if (antes && antes.focus) antes.focus(); };
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('[data-mt-fecha]')) fecha(); });
    v.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(); });
    document.body.appendChild(v); v.querySelector('.mt-bt').focus();
  }
  // fase de captura: chega antes dos outros cliques (teste grátis, assinatura) e os impede
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(ALVO); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); aviso(nomeDe(b));
  }, true);
  var st = document.createElement('style');
  st.textContent = '.mt-veu{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:rgba(10,14,24,.62)}' +
    '.mt-caixa{width:min(440px,100%);background:#fbf9f5;color:#1d2230;border-radius:18px;padding:24px 22px 18px;box-shadow:0 30px 70px -25px rgba(0,0,0,.6);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.mt-caixa h2{margin:0 0 8px;font:600 1.35rem/1.2 Georgia,serif}.mt-caixa p{margin:0 0 16px;color:#454b5a}' +
    '.mt-bt{display:grid;place-items:center;min-height:48px;border-radius:12px;background:#1d2230;color:#fff;font-weight:600;text-decoration:none}.mt-bt:hover{background:#2b3346}' +
    '.mt-fecha{display:block;margin:10px auto 0;border:0;background:none;color:#5b6070;font:inherit;cursor:pointer;text-decoration:underline}' +
    '.mt-caixa a:focus-visible,.mt-caixa button:focus-visible{outline:3px solid #c9b37e;outline-offset:2px}';
  document.head.appendChild(st);
})();

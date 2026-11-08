// Ana Ribeiro · roda antes da primeira pintura: se a pessoa veio de outra página do site pelo link,
// a página nasce coberta pelo véu escuro (sem tela branca) e o véu sobe sozinho (r3.css).
(function () {
  try {
    if (sessionStorage.getItem('ana-troca') === '1') {
      sessionStorage.removeItem('ana-troca');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('r3-entra');
    }
  } catch (e) {}
})();

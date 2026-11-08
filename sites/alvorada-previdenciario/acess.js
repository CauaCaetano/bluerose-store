// Alvorada · aplica as escolhas de acessibilidade antes da página aparecer (sem piscar).
(function () {
  var r = document.documentElement, p = {};
  try { p = JSON.parse(localStorage.getItem('alv-acess') || '{}') || {}; } catch (e) {}
  r.classList.add('js');
  if (p.letra) r.classList.add('letra-grande');
  if (p.contraste) r.classList.add('contraste');
  if (p.calmo) r.classList.add('calmo');
})();

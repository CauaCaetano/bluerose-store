/* Versão escolhida: o cartão inteiro de um sistema leva à página do produto (fora dos botões de testar e de demonstração),
   e a página do produto marca a versão de onde a pessoa veio (?versao=essencial|completo|avancado), nos cartões e na tabela de preços. */
(function () {
  document.querySelectorAll('[data-ir]').forEach(function (c) {
    c.classList.add('vai-produto');
    c.addEventListener('click', function (e) {
      if (e.target.closest('a,button,input,select,label')) return;
      location.href = c.getAttribute('data-ir');
    });
  });
  var v = new URLSearchParams(location.search).get('versao');
  var NOME = { essencial: 'Essencial', completo: 'Completo', avancado: 'Avançado' }[v];
  if (!NOME) return;
  var card = [].find.call(document.querySelectorAll('.vs-card'), function (c) { var n = c.querySelector('.vs-nome'); return n && n.textContent.trim() === NOME; });
  if (card) {
    card.classList.add('vs-escolhida');
    var selo = document.createElement('span'); selo.className = 'vs-selo-escolha'; selo.textContent = 'Você escolheu esta';
    card.insertBefore(selo, card.firstChild);
    card.setAttribute('aria-current', 'true');
  }
  document.querySelectorAll('.pl-tabela tbody tr').forEach(function (tr) {
    var th = tr.querySelector('th'); if (th && th.firstChild && String(th.firstChild.textContent).trim() === NOME) { tr.classList.add('pl-escolhida'); th.insertAdjacentHTML('afterbegin', '<span class="vs-selo-escolha">Sua escolha</span>'); }
  });
  if (card && location.hash === '#versoes') setTimeout(function () { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 350);
})();

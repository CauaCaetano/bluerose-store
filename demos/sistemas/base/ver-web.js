/*
 * Veltria Essencial · ver na web (pedido do dono em 28/10/2026)
 *  O Essencial nasce para o celular. No computador, "Ver na web" abre a tela larga (html.web);
 *  o visual da tela larga fica no estilo.css de cada sistema. A escolha fica guardada neste navegador.
 *  Na barra de cima, o link "Ver no celular" (que abre a moldura de celular) continua; este botão vem antes dele.
 */
(function () {
  'use strict';
  var CHAVE = 'veltria-ver-web', raiz = document.documentElement;
  function ler() { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } }
  function gravar(v) { try { localStorage.setItem(CHAVE, v ? '1' : '0'); } catch (e) { /* sem armazenamento: vale só agora */ } }
  var q = new URLSearchParams(location.search);
  var web = q.has('web') ? q.get('web') !== '0' : ler();
  raiz.classList.toggle('web', web);
  function rotulo(b) { b.textContent = raiz.classList.contains('web') ? 'Ver no celular' : 'Ver na web'; b.setAttribute('aria-pressed', String(raiz.classList.contains('web'))); }
  function pronto() {
    var achaCel = function (r) { return [].filter.call(r.querySelectorAll('a'), function (a) { return /celular=1/.test(a.href) || /^ver no celular$/i.test(a.textContent.trim()); })[0]; };
    var barra = document.querySelector('[data-ver-web]') || (achaCel(document) || {}).parentNode;
    if (!barra) return;
    // no celular a tela larga não cabe: o botão só aparece no computador
    var st = document.createElement('style'); st.textContent = '@media (max-width: 899px) { .ver-web { display: none !important; } }'; document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ver-web';
    b.title = 'Alterna entre a tela larga do computador e a tela do celular';
    rotulo(b);
    b.addEventListener('click', function () { var v = !raiz.classList.contains('web'); raiz.classList.toggle('web', v); gravar(v); rotulo(b); window.dispatchEvent(new Event('resize')); });
    var cel = achaCel(barra);
    // o link da moldura muda de nome para não repetir o "Ver no celular" deste botão
    if (cel) { cel.textContent = 'Moldura de celular'; barra.insertBefore(b, cel); } else barra.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pronto); else pronto();
})();

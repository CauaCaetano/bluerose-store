/*
 * Veltria · campos livres (pedido do dono em 28/10/2026)
 *  Nos sistemas, nenhuma lista obriga a escolher: cada <select> vira um campo de texto com sugestões.
 *   - em todo formulário: escreve para buscar e o campo escolhe a opção certa (sem inventar valor que o sistema
 *     não sabe guardar: em vários sistemas a opção é a chave de uma linha, de um cadastro ou de uma regra);
 *   - <select data-livre>: além das sugestões, aceita texto novo, que vira uma opção do próprio <select>
 *     (marque só onde o sistema guarda o texto como está);
 *   - <select data-livre="clientes"> (ou outro tipo): o texto novo vira cadastro novo pelo gancho do sistema
 *     window.veltriaNovoCadastro(tipo, nome, select), que cria o registro e devolve o código dele;
 *   - só em formulários e janelas de cadastro; filtros ("Todos"), sim/não, seletores de empresa, período e tela,
 *     e listas marcadas com data-fixo continuam como estão.
 *  O <select> original fica escondido e continua sendo o que o sistema lê e grava.
 */
(function () {
  'use strict';
  if (window.__brCamposLivres) return;
  window.__brCamposLivres = true;

  var seq = 0, pares = [];
  // o select saiu da tela: o campo sai junto
  function limpar() {
    pares = pares.filter(function (p) {
      if (p[0].isConnected) return true;
      if (!p[0].parentNode || !p[0].parentNode.isConnected) { p[1].remove(); p[2].remove(); }
      return false;
    });
  }
  var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  var descIdx = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function ehFiltro(sel) {
    var o = sel.options[0];
    return o && /^(todos|todas|todo|qualquer|tudo|all)\b/i.test(o.text.trim());
  }
  function simNao(sel) {
    return [].every.call(sel.options, function (o) { return !o.value || /^(sim|não|nao|yes|no|ativo|inativo|on|off)$/i.test(o.text.trim()); });
  }
  // valor é código (id, número, data) e o texto é outra coisa: lista de cadastros
  function ehCadastro(sel) {
    var cod = 0, total = 0;
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      if (!o.value) continue;
      total++;
      if (norm(o.value) !== norm(o.text) && /\d/.test(o.value)) cod++;
    }
    return total > 0 && cod / total > 0.5;
  }

  function preparar(sel) {
    if (sel.__livre || sel.multiple || sel.hasAttribute('data-fixo') || sel.closest('[data-fixo]')) return;
    if (sel.options.length < 3 || ehFiltro(sel) || simNao(sel)) return;
    // só onde se cadastra (formulário ou janela); seletor de empresa, de período e de tela continua lista
    if (!sel.closest('form, dialog, [role="dialog"], [aria-modal="true"]')) return;
    if (sel.size > 1) return;
    sel.__livre = true;
    // texto novo só onde o sistema sabe guardar (o <select> marcado com data-livre); no resto, busca nas opções
    var cadastro = !sel.hasAttribute('data-livre');
    var id = 'livre-' + (++seq);
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = sel.className;
    inp.style.cssText = sel.style.cssText;
    inp.setAttribute('list', id);
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('data-livre', cadastro ? 'cadastro' : 'livre');
    var vazio = [].filter.call(sel.options, function (o) { return !o.value; })[0];
    inp.placeholder = (vazio && vazio.text.trim()) || (cadastro ? 'Escreva para buscar' : 'Escolha ou escreva');
    inp.title = cadastro ? 'Escreva para buscar nas opções' : 'Escolha uma sugestão ou escreva outra';
    if (sel.required) { inp.required = true; sel.required = false; }
    inp.disabled = sel.disabled;
    if (sel.getAttribute('aria-label')) inp.setAttribute('aria-label', sel.getAttribute('aria-label'));
    var dl = document.createElement('datalist');
    dl.id = id;
    sel.parentNode.insertBefore(inp, sel);
    sel.parentNode.insertBefore(dl, sel);
    sel.style.display = 'none';
    sel.setAttribute('tabindex', '-1');

    function textoAtual() { var o = sel.options[descIdx.get.call(sel)]; return o && o.value ? o.text : ''; }
    function lista() {
      dl.innerHTML = '';
      for (var i = 0; i < sel.options.length; i++) {
        var o = sel.options[i];
        if (!o.value) continue;
        var op = document.createElement('option'); op.value = o.text; dl.appendChild(op);
      }
    }
    function mostrar() { if (document.activeElement !== inp) inp.value = textoAtual(); }
    function escolher(avisar) {
      var t = inp.value.trim(), achou = null;
      for (var i = 0; i < sel.options.length; i++) {
        var o = sel.options[i];
        if (t && (norm(o.text) === norm(t) || norm(o.value) === norm(t))) { achou = o; break; }
      }
      if (!achou && t && !cadastro && avisar) {
        // texto novo (só ao confirmar, não a cada letra): vira uma opção do próprio select.
        // data-livre="clientes" (ou equipe, fornecedores...): o sistema cria o cadastro e devolve o código dele
        var tipo = sel.getAttribute('data-livre'), cod = t;
        if (tipo && typeof window.veltriaNovoCadastro === 'function') {
          try { cod = window.veltriaNovoCadastro(tipo, t, sel) || ''; } catch (e) { cod = ''; }
        }
        if (cod) {
          achou = document.createElement('option'); achou.value = cod; achou.text = t; achou.setAttribute('data-escrito', '');
          sel.appendChild(achou);
        }
      }
      var antes = desc.get.call(sel);
      if (achou) desc.set.call(sel, achou.value);
      else if (!t) desc.set.call(sel, vazio ? vazio.value : '');
      inp.setCustomValidity(!achou && t && (cadastro || avisar) ? 'Escolha uma das opções da lista.' : '');
      if (avisar && desc.get.call(sel) !== antes) {
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    // o sistema muda o valor por código: o campo acompanha
    Object.defineProperty(sel, 'value', { configurable: true, get: function () { return desc.get.call(sel); }, set: function (v) { desc.set.call(sel, v); mostrar(); } });
    Object.defineProperty(sel, 'selectedIndex', { configurable: true, get: function () { return descIdx.get.call(sel); }, set: function (v) { descIdx.set.call(sel, v); mostrar(); } });
    inp.addEventListener('input', function () { escolher(false); });
    inp.addEventListener('change', function () { escolher(true); });
    inp.addEventListener('focus', function () { if (inp.select) inp.select(); });
    inp.addEventListener('blur', function () { if (cadastro && !inp.checkValidity()) return; inp.value = textoAtual() || inp.value; });
    new MutationObserver(function () { lista(); mostrar(); inp.disabled = sel.disabled; }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    pares.push([sel, inp, dl]);
    lista(); inp.value = textoAtual();
  }

  function varrer(raiz) {
    if (raiz.nodeType !== 1) return;
    if (raiz.tagName === 'OPTION' && raiz.parentNode && raiz.parentNode.tagName === 'SELECT') { preparar(raiz.parentNode); return; }
    if (raiz.tagName === 'SELECT') preparar(raiz);
    else raiz.querySelectorAll && raiz.querySelectorAll('select').forEach(preparar);
  }
  function iniciar() {
    varrer(document.body);
    new MutationObserver(function (ms) {
      var saiu = false;
      ms.forEach(function (m) { m.addedNodes.forEach(varrer); if (m.removedNodes.length) saiu = true; });
      if (saiu) limpar();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

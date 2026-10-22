// Veltria · instalar como app (celular e computador)
// Registra o service worker e mostra o convite "Instalar o app" quando o navegador permite.
// No iPhone (Safari não tem botão de instalar), mostra como adicionar à Tela de Início.
// O item "Instalar o app" do menu do sistema fica sempre à mão enquanto o app não estiver instalado.
(() => {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('../sw.js', { scope: '../', updateViaCache: 'none' }).then((r) => r.update()).catch(() => {}));
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let dispensado = false;
  try { dispensado = localStorage.getItem('nexo-pwa-dispensado') === '1'; } catch { /* sem armazenamento */ }
  // ?instalar=1 (link de Minha conta e do site): mostra o convite de novo, mesmo que tenha sido dispensado antes
  if (new URLSearchParams(location.search).has('instalar')) dispensado = false;
  if (instalado) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  let pedido = null;
  const menu = () => document.querySelector('[data-pwa-instalar]');
  // o menu do sistema é montado depois do login: mostra o item assim que ele existir
  const mostrarMenu = () => { const m = menu(); if (!m || !(pedido || ios)) return false; m.hidden = false; m.onclick = (e) => { e.preventDefault(); if (pedido) pedido.prompt(); else convite('Para instalar no iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.', '', null, true); }; return true; };
  new MutationObserver(() => mostrarMenu()).observe(document.documentElement, { childList: true, subtree: true });

  const convite = (texto, botao, aoClicar, forcar = false) => {
    if (document.querySelector('.pwa-convite') || (dispensado && !forcar)) return;
    const el = document.createElement('div');
    el.className = 'pwa-convite';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Instalar o app');
    el.innerHTML = `<img src="icone-192.png" alt="" width="36" height="36"><span>${texto}</span>${botao ? `<button type="button" class="btn pri" data-pwa-ok>${botao}</button>` : ''}<button type="button" class="btn fant ic-bt" data-pwa-nao aria-label="Agora não">✕</button>`;
    el.querySelector('[data-pwa-ok]')?.addEventListener('click', () => { aoClicar?.(); el.remove(); });
    el.querySelector('[data-pwa-nao]').addEventListener('click', () => { el.remove(); try { localStorage.setItem('nexo-pwa-dispensado', '1'); } catch { /* ok */ } });
    document.body.appendChild(el);
  };

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); pedido = e; mostrarMenu();
    setTimeout(() => convite('Instale como aplicativo: ganha ícone na área de trabalho ou na tela inicial e abre em janela própria, sem o navegador.', 'Instalar o app', () => pedido.prompt()), 4000);
  });
  addEventListener('appinstalled', () => { document.querySelector('.pwa-convite')?.remove(); const m = menu(); if (m) m.hidden = true; });

  if (ios) setTimeout(() => convite('Para usar como app: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.', '', null), 6000);
})();

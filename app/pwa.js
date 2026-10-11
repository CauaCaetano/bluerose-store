// Linha Nexo · instalar como app (celular e computador)
// Registra o service worker e mostra o convite "Instalar o app" quando o navegador permite.
// No iPhone (Safari não tem botão de instalar), mostra como adicionar à Tela de Início.
(() => {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {}));
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let dispensado = false;
  try { dispensado = localStorage.getItem('nexo-pwa-dispensado') === '1'; } catch { /* sem armazenamento */ }
  if (instalado || dispensado) return;

  const convite = (texto, botao, aoClicar) => {
    if (document.querySelector('.pwa-convite')) return;
    const el = document.createElement('div');
    el.className = 'pwa-convite';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Instalar o app');
    el.innerHTML = `<img src="icone-192.png" alt="" width="36" height="36"><span>${texto}</span>${botao ? `<button type="button" class="btn pri" data-pwa-ok>${botao}</button>` : ''}<button type="button" class="btn fant ic-bt" data-pwa-nao aria-label="Agora não">✕</button>`;
    el.querySelector('[data-pwa-ok]')?.addEventListener('click', () => { aoClicar?.(); el.remove(); });
    el.querySelector('[data-pwa-nao]').addEventListener('click', () => { el.remove(); try { localStorage.setItem('nexo-pwa-dispensado', '1'); } catch { /* ok */ } });
    document.body.appendChild(el);
  };

  let pedido = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); pedido = e;
    setTimeout(() => convite('Use como app: abre direto da tela inicial, em tela cheia.', 'Instalar o app', () => pedido.prompt()), 4000);
  });
  addEventListener('appinstalled', () => document.querySelector('.pwa-convite')?.remove());

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (ios) setTimeout(() => convite('Para usar como app: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.', '', null), 6000);
})();

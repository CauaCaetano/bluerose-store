// Ajudas comuns dos sites 3D de exemplo (Aguiar, Bastos, Ana, Monolito, Vértice) para o 3D pesar menos:
// - celular: pixel ratio 1, modelo -cel.glb e three.js baixado só depois do primeiro conteúdo da página;
// - laço de desenho que só roda com a cena na tela e a aba visível, e cai para ~30 quadros/s quando a cena está ociosa.

const fino = matchMedia('(max-width: 820px)').matches;
const toque = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
export const celular = fino || toque;
export const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fraco = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

// celular ou aparelho fraco: 1; computador: até o máximo pedido pelo site
export const pixelRatio = (max) => (celular || fraco ? 1 : Math.min(devicePixelRatio || 1, max));

// endereço do modelo: no celular usa a versão leve (mesmo modelo escaneado, textura menor e/ou menos triângulos)
export const modelo = (normal, leve) => (celular && leve ? leve : normal);

// no computador libera na hora; no celular espera o primeiro conteúdo (texto do topo) aparecer e a página
// terminar de carregar (ou 2,5 s depois do primeiro conteúdo, o que vier antes) e então um momento ocioso
export function depoisDoConteudo() {
  if (!celular) return Promise.resolve();
  return new Promise((ok) => {
    let feito = false;
    const vai = () => {
      if (feito) return; feito = true;
      if ('requestIdleCallback' in window) requestIdleCallback(() => ok(), { timeout: 1200 }); else setTimeout(ok, 200);
    };
    if (document.readyState === 'complete') { vai(); return; }
    addEventListener('load', vai, { once: true });
    const depoisFcp = () => setTimeout(vai, 2500);
    try {
      const po = new PerformanceObserver((l) => { if (l.getEntries().some((e) => e.name === 'first-contentful-paint')) { po.disconnect(); depoisFcp(); } });
      po.observe({ type: 'paint', buffered: true });
    } catch (e) { depoisFcp(); }
    setTimeout(vai, 8000);
  });
}

// laço de desenho sob demanda.
// quadro(agora) devolve: false = para (só volta com pedir()), 'ocioso' = próximo quadro em ~33 ms, outro valor = próximo rAF.
// Só desenha com `alvo` na tela (IntersectionObserver) e a aba visível; pedir() acorda o laço (rolagem, mouse, modelo pronto).
export function laco(alvo, quadro, { margem = '0px', naTela = true } = {}) {
  let visivel = naTela, raf = 0, espera = 0;
  const pode = () => visivel && !document.hidden;
  function passo(agora) {
    raf = 0;
    if (!pode()) return;
    const r = quadro(agora);
    if (r === false) return;
    if (r === 'ocioso') { espera = setTimeout(() => { espera = 0; pedir(); }, 33); return; }
    raf = requestAnimationFrame(passo);
  }
  function pedir() {
    if (espera) { clearTimeout(espera); espera = 0; }
    if (!raf && pode()) raf = requestAnimationFrame(passo);
  }
  if (alvo && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visivel = es[es.length - 1].isIntersecting; pedir(); }, { rootMargin: margem }).observe(alvo);
  } else visivel = true;
  document.addEventListener('visibilitychange', pedir);
  return { pedir, naTela: () => visivel };
}

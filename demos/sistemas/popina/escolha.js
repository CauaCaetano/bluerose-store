// Popina · escolha do template (tipo de casa): na primeira entrada e ao trocar em Gestão › Aparência.
// Lista os 14 tipos; ao tocar num, mostra fotos reais (carrossel), as funções que vêm nele, "Usar este template" e "Voltar".
import { PERFIS, MODULOS, diferenca } from './perfis.js?v=30';
import { lojaCfg, setLoja } from './loja.js?v=30';
import { ico, toast } from './ui.js?v=30';

export const TIPOS = [['basico', 'Básico'], ['taverna', 'Taverna'], ['luxo', 'Luxo'], ['realeza', 'Realeza'], ['japones', 'Japonês'], ['italiano', 'Italiano'], ['churrascaria', 'Churrascaria'],
  ['mexicano', 'Mexicano'], ['pizzaria', 'Pizzaria'], ['hamburgueria', 'Hamburgueria'], ['pub', 'Bar e pub'], ['chines', 'Chinês'], ['balada', 'Balada'], ['cafeteria', 'Cafeteria']];
const ESTILO = { basico: 'moderno', taverna: 'rustico' };
const FOTOS = [['salao', 'O salão'], ['cardapio', 'O cardápio no celular do cliente'], ['cozinha', 'A tela da cozinha'], ['gestao', 'A gestão do dono']];
const logo = (k) => (k === 'taverna' ? 'simbolo.png?v=1' : `img/logo-${k}.webp?v=2`);
const nome = (k) => (TIPOS.find((t) => t[0] === k) || [k, k])[1];

const CSS = `
.esc{position:fixed;inset:0;z-index:9000;background:#F7F4EE;color:#1F1B16;overflow:auto;font-family:"Figtree",system-ui,sans-serif;opacity:0;transition:opacity .2s}
.esc.on{opacity:1}
.esc *{box-sizing:border-box}
.esc-in{max-width:1180px;margin:0 auto;padding:28px 20px 40px}
.esc h1{font:800 clamp(24px,3.4vw,34px)/1.15 "Figtree",system-ui,sans-serif;letter-spacing:-.01em;margin:6px 0 8px}
.esc .esc-sub{color:#5E554B;max-width:62ch;margin:0 0 22px;font-size:15px;line-height:1.5}
.esc-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.esc-card{display:grid;grid-template-rows:auto 1fr;text-align:left;border:1px solid #E4DCCF;border-radius:16px;background:#fff;padding:0;overflow:hidden;cursor:pointer;color:inherit;font:inherit;transition:transform .15s,box-shadow .15s,border-color .15s}
.esc-card:hover,.esc-card:focus-visible{transform:translateY(-2px);box-shadow:0 14px 30px -18px rgba(60,40,20,.45);border-color:#C9B79C;outline:none}
.esc-card img.f{width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:16/10;object-fit:cover;object-position:top left;display:block;background:#EEE8DE;align-self:start}
.esc-card,.esc-volta,.esc-usar,.esc-seta,.esc-pontos button,.esc-depois{min-height:0!important;height:auto;box-shadow:none;text-transform:none!important;letter-spacing:normal!important;clip-path:none!important}
.esc-card{align-content:start!important;align-items:stretch!important}
.esc-card .t{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:center;padding:12px 14px 14px}
.esc-card .t img{width:44px;height:44px;object-fit:contain}
.esc-card b{display:block;font-size:16px}
.esc-card small{display:block;color:#6A6055;font-size:13px;line-height:1.35;margin-top:2px}
.esc-card .uso{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;color:#fff;background:#3C6E47;border-radius:6px;padding:1px 6px;vertical-align:2px}
.esc-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.esc-volta{display:inline-flex;align-items:center;gap:6px;border:1px solid #D9CFC0;background:#fff;color:#1F1B16;border-radius:10px;padding:9px 14px;font:600 14px "Figtree",system-ui,sans-serif;cursor:pointer}
.esc-volta .ico{width:18px;height:18px;transform:rotate(90deg)}
.esc-det{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:28px;margin-top:18px;align-items:start}
.esc-car{position:relative;border-radius:16px;overflow:hidden;background:#1F1B16}
.esc-trilho{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;align-items:flex-start}
.esc-trilho::-webkit-scrollbar{display:none}
.esc-slide{flex:0 0 100%;scroll-snap-align:center;margin:0;position:relative;display:grid;place-items:center;aspect-ratio:16/10;background:#2A241E;overflow:hidden;align-self:flex-start}
.esc-slide img{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:contain!important;display:block}
.esc-slide figcaption{position:absolute;left:12px;bottom:12px;background:rgba(20,16,12,.78);color:#fff;font-size:13px;font-weight:600;padding:6px 10px;border-radius:8px}
.esc-seta{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#1F1B16;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px -8px rgba(0,0,0,.5)}
.esc-seta.ant{left:10px}.esc-seta.prox{right:10px}
.esc-seta .ico{width:20px;height:20px;transform:rotate(-90deg)}.esc-seta.ant .ico{transform:rotate(90deg)}
.esc-pontos{display:flex;gap:8px;justify-content:center;padding:10px 0 0}
.esc-pontos button{width:9px;height:9px;border-radius:50%;border:0;background:#CFC4B4;padding:0;cursor:pointer}
.esc-pontos button.on{background:#1F1B16;width:22px;border-radius:6px}
.esc-info h2{font:800 26px/1.15 "Figtree",system-ui,sans-serif;margin:0 0 4px;display:flex;align-items:center;gap:10px}
.esc-info h2 img{width:46px;height:46px;object-fit:contain}
.esc-info .tp{color:#6A6055;margin:0 0 12px}
.esc-info .dest{font-size:15px;line-height:1.5;margin:0 0 16px}
.esc-info h3{font-size:13px;letter-spacing:.04em;color:#6A6055;margin:18px 0 8px;font-weight:700}
.esc-mods{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.esc-mods li{background:#fff;border:1px solid #E4DCCF;border-radius:12px;padding:10px 12px}
.esc-mods li b{display:block;font-size:14.5px}
.esc-mods li span{display:block;color:#5E554B;font-size:13.5px;line-height:1.4;margin-top:2px}
.esc-mods.fora li{background:transparent;border-style:dashed}
.esc-bts{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;position:sticky;bottom:0;background:linear-gradient(transparent,#F7F4EE 30%);padding:14px 0 4px}
.esc-usar{flex:1 1 220px;border:0;border-radius:12px;background:#1F1B16;color:#fff;font:700 16px "Figtree",system-ui,sans-serif;padding:15px 18px;cursor:pointer}
.esc-usar:hover{background:#3A3129}
.esc-aviso{background:#FFF6E2;border:1px solid #EBCB86;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45;margin-top:14px}
.esc-aviso b{display:block;margin-bottom:4px}
.esc-depois{background:none;border:0;color:#5E554B;text-decoration:underline;font:500 14px "Figtree",system-ui,sans-serif;cursor:pointer;padding:6px}
.esc-conf{max-width:760px}
.esc-lista li{padding:0}
.esc-chk{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;cursor:pointer}
.esc-chk input{width:22px;height:22px;margin-top:1px;flex:none;accent-color:#1F1B16}
.esc-chk b{display:block;font-size:15px}.esc-chk small{display:block;color:#5E554B;font-size:13.5px;line-height:1.4;margin-top:2px}
.esc-mais{margin-top:16px}.esc-mais summary{cursor:pointer;font-weight:700;padding:10px 0;color:#3A3129}
.esc-mais .esc-lista{margin-top:8px}
@media (max-width:820px){.esc-det{grid-template-columns:1fr}.esc-in{padding:20px 16px 32px}}
@media (prefers-reduced-motion:reduce){.esc,.esc-card{transition:none}.esc-trilho{scroll-behavior:auto}}
`;

// abre a escolha; primeira = primeira entrada (sem "fechar", mas com "decidir depois")
export function abrirEscolha({ primeira = false, abrir = '', aoFechar } = {}) {
  if (document.querySelector('.esc')) return;
  if (!document.getElementById('esc-css')) { const s = document.createElement('style'); s.id = 'esc-css'; s.textContent = CSS; document.head.append(s); }
  const el = document.createElement('div'); el.className = 'esc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Escolha o template');
  // setTimeout e não requestAnimationFrame: em aba escondida o rAF não roda e a tela ficaria transparente
  document.body.append(el); setTimeout(() => el.classList.add('on'), 16);
  const atual = lojaCfg().template;
  const fechar = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 200); document.removeEventListener('keydown', tecla); aoFechar?.(); };
  const tecla = (e) => { if (e.key === 'Escape') { if (el.querySelector('.esc-det')) lista(); else if (!primeira) fechar(); } };
  document.addEventListener('keydown', tecla);

  function lista() {
    el.innerHTML = `<div class="esc-in"><div class="esc-topo"><div>
      <h1>${primeira ? 'Qual é o tipo do seu negócio?' : 'Trocar o template'}</h1>
      <p class="esc-sub">Cada template muda o visual do sistema e do cardápio <b>e as funções</b>: rodízio na churrascaria, senha de balcão na cafeteria, portaria na balada. Toque num deles para ver as fotos e tudo o que vem nele. Dá para trocar depois em Gestão › Aparência.</p></div>
      ${primeira ? '' : `<button type="button" class="esc-volta" data-fechar>${ico('chevron')}Voltar</button>`}</div>
      <div class="esc-grade">${TIPOS.map(([k, n]) => `<button type="button" class="esc-card" data-k="${k}">
        <img class="f" src="img/escolha/${k}-salao.webp?v=2" alt="" loading="lazy" decoding="async" width="960" height="600">
        <span class="t"><img src="${logo(k)}" alt="" width="44" height="44" loading="lazy"><span><b>${n}${k === atual && !primeira ? '<span class="uso">em uso</span>' : ''}</b><small>${PERFIS[k].tipo}</small></span></span></button>`).join('')}</div>
      ${primeira ? '<p style="text-align:center;margin-top:22px"><button type="button" class="esc-depois" data-depois>Decidir depois (fica o Básico)</button></p>' : ''}</div>`;
    el.scrollTop = 0;
    el.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => detalhe(b.dataset.k); });
    el.querySelector('[data-fechar]')?.addEventListener('click', fechar);
    el.querySelector('[data-depois]')?.addEventListener('click', () => { setLoja({ escolhido: true }); fechar(); });
  }

  function detalhe(k) {
    const p = PERFIS[k], mods = p.liga.map((m) => MODULOS[m]).filter(Boolean), fora = p.esconde.map((m) => MODULOS[m]).filter(Boolean);
    const dif = !primeira && atual && atual !== k ? diferenca(atual, k) : null;
    el.innerHTML = `<div class="esc-in"><button type="button" class="esc-volta" data-volta>${ico('chevron')}Voltar para os templates</button>
      <div class="esc-det"><div><div class="esc-car" aria-roledescription="carrossel" aria-label="Fotos do template ${nome(k)}">
        <div class="esc-trilho" tabindex="0">${FOTOS.map(([f, leg]) => `<figure class="esc-slide"><img src="img/escolha/${k}-${f}.webp?v=2" alt="${leg} no template ${nome(k)}" decoding="async"><figcaption>${leg}</figcaption></figure>`).join('')}</div>
        <button type="button" class="esc-seta ant" aria-label="Foto anterior">${ico('chevron')}</button><button type="button" class="esc-seta prox" aria-label="Próxima foto">${ico('chevron')}</button></div>
        <div class="esc-pontos">${FOTOS.map((f, i) => `<button type="button" aria-label="Foto ${i + 1}" data-i="${i}"></button>`).join('')}</div></div>
      <div class="esc-info"><h2><img src="${logo(k)}" alt="" width="46" height="46">${nome(k)}</h2><p class="tp">${p.tipo}</p><p class="dest">${p.destaque}</p>
        <h3>O QUE VEM NESTE TEMPLATE</h3><ul class="esc-mods">${mods.map(([n, d]) => `<li><b>${n}</b><span>${d}</span></li>`).join('')}
          <li><b>Tudo o que é comum</b><span>Salão, comanda no celular, cozinha e bar, caixa com Pix, cardápio pelo QR, estoque, relatórios e equipe.</span></li></ul>
        ${fora.length ? `<h3>FICA DESLIGADO (DÁ PARA LIGAR)</h3><ul class="esc-mods fora">${fora.map(([n, d]) => `<li><b>${n}</b><span>${d}</span></li>`).join('')}</ul>` : ''}
        ${dif ? `<div class="esc-aviso"><b>O que muda trocando de ${nome(atual)} para ${nome(k)}</b>${dif.entram.length ? `Entram: ${dif.entram.map((m) => MODULOS[m][0]).join(', ')}. ` : ''}${dif.saem.length ? `Saem: ${dif.saem.map((m) => MODULOS[m][0]).join(', ')}. ` : ''}Seu cardápio, mesas, vendas e clientes continuam iguais.</div>` : ''}
        <div class="esc-bts"><button type="button" class="esc-usar" data-usar>${k === atual && !primeira ? 'Continuar com este template' : 'Usar este template'}</button><button type="button" class="esc-volta" data-volta>${ico('chevron')}Voltar</button></div></div></div></div>`;
    el.scrollTop = 0;
    el.querySelectorAll('[data-volta]').forEach((b) => { b.onclick = lista; });
    const tr = el.querySelector('.esc-trilho'), pts = [...el.querySelectorAll('.esc-pontos button')];
    const vai = (i) => tr.scrollTo({ left: tr.clientWidth * Math.max(0, Math.min(FOTOS.length - 1, i)), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const idx = () => Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth));
    const marca = () => pts.forEach((b, i) => b.classList.toggle('on', i === idx()));
    tr.addEventListener('scroll', () => requestAnimationFrame(marca), { passive: true }); marca();
    el.querySelector('.esc-seta.ant').onclick = () => vai(idx() - 1);
    el.querySelector('.esc-seta.prox').onclick = () => vai(idx() + 1);
    pts.forEach((b) => { b.onclick = () => vai(+b.dataset.i); });
    tr.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') vai(idx() + 1); if (e.key === 'ArrowLeft') vai(idx() - 1); });
    el.querySelector('[data-usar]').onclick = () => {
      // na primeira entrada, antes de começar: confirmar as funções recomendadas (pode desmarcar ou ligar outras)
      if (primeira) { confirmar(k); return; }
      setLoja({ template: k, estilo: ESTILO[k] || k, escolhido: true });
      toast(`Template ${nome(k)} aplicado no sistema e no cardápio`); fechar();
    };
  }

  function confirmar(k) {
    const p = PERFIS[k], rec = new Set(p.liga), outras = Object.keys(MODULOS).filter((m) => !rec.has(m));
    const linha = (m, on) => `<li><label class="esc-chk"><input type="checkbox" data-m="${m}" ${on ? 'checked' : ''}><span><b>${MODULOS[m][0]}</b><small>${MODULOS[m][1]}</small></span></label></li>`;
    el.innerHTML = `<div class="esc-in esc-conf"><button type="button" class="esc-volta" data-volta>${ico('chevron')}Voltar</button>
      <h1 style="margin-top:16px">Confirme as funções do seu negócio</h1>
      <p class="esc-sub">Estas são as recomendadas para <b>${p.tipo}</b>. Desmarque o que você não usa; dá para mudar quando quiser em Gestão › Aparência › Funções do negócio.</p>
      <ul class="esc-mods esc-lista">${p.liga.map((m) => linha(m, true)).join('')}</ul>
      <details class="esc-mais"><summary>Ver outras funções (${outras.length})</summary><ul class="esc-mods esc-lista">${outras.map((m) => linha(m, false)).join('')}</ul></details>
      <div class="esc-bts"><button type="button" class="esc-usar" data-comecar>Começar a usar</button></div></div>`;
    el.scrollTop = 0;
    el.querySelector('[data-volta]').onclick = () => detalhe(k);
    el.querySelector('[data-comecar]').onclick = () => {
      const modulos = {};
      el.querySelectorAll('[data-m]').forEach((c) => { if (c.checked !== rec.has(c.dataset.m)) modulos[c.dataset.m] = c.checked; });
      setLoja({ template: k, estilo: ESTILO[k] || k, escolhido: true, modulos });
      toast(`Pronto: ${nome(k)} com as suas funções`); fechar();
    };
  }
  if (abrir && PERFIS[abrir]) detalhe(abrir); else lista();
}

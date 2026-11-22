// Popina · primeiro acesso do dono (22/11/2026): antes de qualquer tela, em 3 passos curtos, pergunta o nome do
// estabelecimento, o logo (recorte quadrado) e a capa da loja (recorte largo). Depois segue para os Primeiros passos
// (cardápio, mesas e equipe). Refazer: Configurações › Sua marca.
// CAMPOS (os mesmos que o cardápio do cliente já lê): db.config.nome, db.config.loja.logo, db.config.loja.capa.
// As imagens são comprimidas aqui no navegador (webp: logo 512×512, capa 1600×640) e guardadas como data URL dentro dos
// dados da empresa (localStorage popina-v1; na conta real, conta-nuvem.js sobe junto para a nuvem, como o logo já subia).
// Quem vê: só o dono da conta (os convidados da equipe nunca) e a demonstração (com "Pular e ver o exemplo").
// Dados antigos: só acrescenta db.config.inicio.marca = true ao terminar ou pular; quem já tem nome, logo e capa não vê.
import { db, t, grava, CONTA, lojaCfg, setLoja } from './loja.js?v=51';
import { ico, toast, $ } from './ui.js?v=51';

const ini = () => (db.config.inicio ||= {});
const NOME_VAZIO = ['', 'meu restaurante'];
const temTudo = () => { const L = lojaCfg(); return !NOME_VAZIO.includes(String(db.config.nome || '').trim().toLowerCase()) && !!L.logo && !!L.capa; };
const ehDono = () => {
  if (!CONTA) return true;
  const n = window.veltriaNuvem;
  if (n && typeof n.donoDaEmpresa === 'boolean') return n.donoDaEmpresa;
  return (window.veltriaAbrir && window.veltriaAbrir.papel) === 'dono';
};
export const precisaPrimeiroAcesso = () => ehDono() && !ini().marca && !temTudo();

// ------------------------------------------------------------------ recorte (arrastar e aproximar) e compressão
function lerImagem(arq) {
  return new Promise((ok, falha) => {
    if (!arq || !/^image\//.test(arq.type)) return falha(new Error('tipo'));
    const u = URL.createObjectURL(arq), img = new Image();
    img.onload = () => ok({ img, u }); img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); }; img.src = u;
  });
}
// liga um recorte num quadro (.pa-quadro) com a proporção do destino; devolve gerar() -> data URL webp
function recortador(quadro, faixa, img, { W, H, conter }) {
  const el = document.createElement('img'); el.src = img.src; el.alt = ''; el.draggable = false; quadro.replaceChildren(el);
  let z = 1, x = 0, y = 0;
  const med = () => { const fw = quadro.clientWidth, fh = quadro.clientHeight; const cobre = Math.max(fw / img.naturalWidth, fh / img.naturalHeight), cabe = Math.min(fw / img.naturalWidth, fh / img.naturalHeight); return { fw, fh, cobre, cabe }; };
  const minZ = () => { const m = med(); return conter ? m.cabe / m.cobre : 1; };
  function pos() {
    const { fw, fh, cobre } = med(), s = cobre * z, dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    x = dw <= fw ? (fw - dw) / 2 : Math.min(0, Math.max(fw - dw, x));
    y = dh <= fh ? (fh - dh) / 2 : Math.min(0, Math.max(fh - dh, y));
    el.style.width = dw + 'px'; el.style.height = dh + 'px'; el.style.transform = `translate(${x}px,${y}px)`;
    return { fw, s };
  }
  // começa centralizado (o logo começa inteiro, sem cortar)
  const comecar = () => { const { fw, fh, cobre } = med(); z = conter ? minZ() : 1; const s = cobre * z; x = (fw - img.naturalWidth * s) / 2; y = (fh - img.naturalHeight * s) / 2; faixa.min = String(minZ()); faixa.max = '4'; faixa.value = String(z); pos(); };
  faixa.oninput = () => { const { fw, fh } = med(), antes = med().cobre * z, cx = (fw / 2 - x) / antes, cy = (fh / 2 - y) / antes; z = Number(faixa.value); const s = med().cobre * z; x = fw / 2 - cx * s; y = fh / 2 - cy * s; pos(); };
  let arr = null;
  quadro.onpointerdown = (e) => { arr = { px: e.clientX, py: e.clientY, x, y }; quadro.setPointerCapture(e.pointerId); quadro.classList.add('arrasta'); };
  quadro.onpointermove = (e) => { if (!arr) return; x = arr.x + e.clientX - arr.px; y = arr.y + e.clientY - arr.py; pos(); };
  quadro.onpointerup = quadro.onpointercancel = () => { arr = null; quadro.classList.remove('arrasta'); };
  quadro.onwheel = (e) => { e.preventDefault(); faixa.value = String(Math.min(4, Math.max(minZ(), z * (e.deltaY < 0 ? 1.08 : 0.93)))); faixa.oninput(); };
  quadro.onkeydown = (e) => { const d = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] }[e.key]; if (!d) return; e.preventDefault(); x += d[0]; y += d[1]; pos(); };
  requestAnimationFrame(comecar);
  return function gerar() {
    const { fw, s } = pos(), k = W / fw, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(img, x * k, y * k, img.naturalWidth * s * k, img.naturalHeight * s * k);
    let u = c.toDataURL('image/webp', W > 600 ? 0.8 : 0.86);
    if (!/^data:image\/webp/.test(u)) u = c.toDataURL('image/jpeg', 0.82); // navegador sem webp
    return u;
  };
}

// ------------------------------------------------------------------ o assistente
let aberto = null;
export function abrirPrimeiroAcesso({ refazer = false, depois } = {}) {
  if (aberto) return;
  const L = lojaCfg(), demo = !CONTA;
  const nomeAtual = NOME_VAZIO.includes(String(db.config.nome || '').trim().toLowerCase()) ? '' : db.config.nome || '';
  // primeira vez começa em branco (sem o nome, logo e capa do exemplo); só no "refazer" vem o que já está salvo
  const st = refazer ? { passo: 0, nome: nomeAtual, logo: L.logo || '', capa: L.capa || '', gerar: null } : { passo: 0, nome: '', logo: '', capa: '', gerar: null };
  const f = document.createElement('div'); f.className = 'pa-fundo'; aberto = f;
  f.innerHTML = `<section class="pa" role="dialog" aria-modal="true" aria-labelledby="pa-tit">
    <header class="pa-cab"><img src="simbolo.png?v=2" alt="Popina" width="40" height="34"><ol class="pa-pontos" aria-hidden="true"><li></li><li></li><li></li></ol><span class="pa-num" data-num></span></header>
    <div class="pa-corpo" data-corpo></div>
    <footer class="pa-pe" data-pe></footer>
    ${demo && !refazer ? '<button type="button" class="pa-pular" data-pular>Pular e ver o exemplo</button>' : ''}
  </section>`;
  document.body.append(f); document.body.classList.add('pa-aberto');
  const corpo = $('[data-corpo]', f), pe = $('[data-pe]', f);
  const fechar = (concluiu) => {
    f.remove(); aberto = null; document.body.classList.remove('pa-aberto');
    if (concluiu || !refazer) { ini().marca = true; grava(); }
    depois?.(concluiu);
  };
  $('[data-pular]', f)?.addEventListener('click', () => { fechar(false); toast('Esta é a lanchonete de exemplo. Quando quiser, ponha a sua marca em Configurações'); });

  function prevImg(tipo) {
    const u = st[tipo]; if (!u) return '';
    return tipo === 'logo' ? `<div class="pa-prev-logo" style="background-image:url('${t(u)}')"></div>` : `<div class="pa-prev-capa" style="background-image:url('${t(u)}')"></div>`;
  }
  function passoFoto(tipo) {
    const logo = tipo === 'logo';
    corpo.innerHTML = `<h2 id="pa-tit">${logo ? 'O logo do estabelecimento' : 'A capa da loja'}</h2>
      <p class="mudo">${logo ? 'Aparece no topo do sistema, no recibo e no cardápio do cliente. Uma foto do logo já serve.' : 'Uma foto larga do lugar ou dos pratos. Fica no alto do cardápio do cliente e no topo do sistema.'}</p>
      <div data-area>${st[tipo] ? `<div class="pa-pronto">${prevImg(tipo)}${logo ? `<b>${t(st.nome)}</b>` : ''}</div>` : ''}
        <label class="pa-enviar"><input type="file" accept="image/*" data-arq hidden>${ico('mais2')}<span><b>${st[tipo] ? 'Trocar a foto' : 'Enviar a foto'}</b><small>Do computador ou do celular (câmera ou galeria)</small></span></label></div>`;
    pe.innerHTML = `<button type="button" class="bt" data-volta>${ico('voltar')}Voltar</button><button type="button" class="bt" data-pula>${st[tipo] ? 'Manter' : 'Pular este passo'}</button>`;
    $('[data-volta]', pe).onclick = () => mostrar(st.passo - 1);
    $('[data-pula]', pe).onclick = () => mostrar(st.passo + 1);
    $('[data-arq]', corpo).onchange = async (e) => {
      let r; try { r = await lerImagem(e.target.files?.[0]); } catch { return toast('Não deu para ler esta imagem. Tente uma foto JPG ou PNG'); }
      const area = $('[data-area]', corpo);
      area.innerHTML = `<div class="pa-quadro ${logo ? 'quadrado' : 'largo'}" tabindex="0" aria-label="Arraste para ajustar o recorte"></div>
        <label class="pa-zoom">${ico('busca')}<span class="sr">Aproximar</span><input type="range" step="0.01" data-zoom></label>
        <p class="mudo pa-dica">Arraste a foto para ajustar e use a barra para aproximar.${logo ? ' O logo fica quadrado.' : ' A capa fica larga.'}</p>`;
      st.gerar = recortador($('.pa-quadro', area), $('[data-zoom]', area), r.img, logo ? { W: 512, H: 512, conter: true } : { W: 1600, H: 640, conter: false });
      pe.innerHTML = `<button type="button" class="bt" data-outra>Outra foto</button><button type="button" class="bt cheio grande" data-usar>${ico('check')}Usar este recorte</button>`;
      $('[data-outra]', pe).onclick = () => { URL.revokeObjectURL(r.u); st.gerar = null; passoFoto(tipo); };
      $('[data-usar]', pe).onclick = () => {
        try { st[tipo] = st.gerar(); } catch { return toast('Não deu para recortar esta imagem'); }
        URL.revokeObjectURL(r.u); st.gerar = null;
        if (logo) setLoja({ logo: st.logo }); else setLoja({ capa: st.capa });
        toast(logo ? 'Logo salvo' : 'Capa salva'); passoFoto(tipo);
        pe.innerHTML = `<button type="button" class="bt" data-volta>${ico('voltar')}Voltar</button><button type="button" class="bt cheio grande" data-seg>${tipo === 'capa' ? 'Ver como ficou' : 'Continuar'}</button>`;
        $('[data-volta]', pe).onclick = () => mostrar(st.passo - 1);
        $('[data-seg]', pe).onclick = () => mostrar(st.passo + 1);
      };
    };
  }
  function mostrar(n) {
    st.passo = Math.max(0, n);
    $('[data-num]', f).textContent = st.passo < 3 ? `Passo ${st.passo + 1} de 3` : 'Pronto';
    f.querySelectorAll('.pa-pontos li').forEach((li, k) => li.classList.toggle('on', k <= st.passo));
    if (st.passo === 0) {
      corpo.innerHTML = `<h2 id="pa-tit">${refazer ? 'Nome, logo e capa' : 'Bem-vindo ao Popina'}</h2>
        <p class="mudo">${refazer ? 'Mude o que quiser; o resto continua como está.' : 'Antes de começar, três coisas rápidas para o sistema ficar com a cara da sua casa.'}</p>
        <label class="campo"><span>Nome do estabelecimento</span><input data-nome maxlength="60" autocomplete="organization" placeholder="Ex.: Lanchonete da Praça" value="${t(st.nome)}"></label>`;
      pe.innerHTML = `${refazer ? '<button type="button" class="bt" data-cancela>Cancelar</button>' : ''}<button type="button" class="bt cheio grande" data-seg>Continuar</button>`;
      const inp = $('[data-nome]', corpo); setTimeout(() => inp.focus(), 30);
      const seguir = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return toast('Escreva o nome do estabelecimento'); } st.nome = v.slice(0, 60); db.config.nome = st.nome; if (!refazer && !st.logo && !st.capa) setLoja({ logo: '', capa: '' }); grava(); mostrar(1); };
      inp.onkeydown = (e) => { if (e.key === 'Enter') seguir(); };
      $('[data-seg]', pe).onclick = seguir;
      $('[data-cancela]', pe)?.addEventListener('click', () => fechar(false));
    } else if (st.passo === 1) passoFoto('logo');
    else if (st.passo === 2) passoFoto('capa');
    else {
      corpo.innerHTML = `<h2 id="pa-tit">Ficou assim</h2><p class="mudo">É assim que o cliente vê no cardápio. Dá para trocar quando quiser em Configurações › Sua marca.</p>
        <div class="pa-final">${st.capa ? `<div class="pa-prev-capa" style="background-image:url('${t(st.capa)}')"></div>` : '<div class="pa-prev-capa vazia"></div>'}
          <div class="pa-final-id">${st.logo ? `<div class="pa-prev-logo" style="background-image:url('${t(st.logo)}')"></div>` : `<div class="pa-prev-logo vazio">${t((st.nome || 'R')[0].toUpperCase())}</div>`}<b>${t(st.nome)}</b></div></div>`;
      pe.innerHTML = `<button type="button" class="bt" data-volta>${ico('voltar')}Voltar</button><button type="button" class="bt cheio grande" data-fim>${ico('check')}${refazer ? 'Pronto' : 'Começar: cardápio, mesas e equipe'}</button>`;
      $('[data-volta]', pe).onclick = () => mostrar(2);
      $('[data-fim]', pe).onclick = () => { fechar(true); toast('Pronto: a sua marca já está no sistema'); };
    }
    corpo.scrollTop = 0;
  }
  mostrar(0);
}
// app.js chama na entrada: abre o assistente se for a primeira vez do dono; senão segue direto
export function talvezPrimeiroAcesso(seguir) {
  if (!precisaPrimeiroAcesso()) return seguir();
  abrirPrimeiroAcesso({ depois: () => seguir() });
}

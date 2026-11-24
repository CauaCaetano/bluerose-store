// Popina · menu lateral por categoria (no computador, embaixo das 5 abas; no celular, gaveta que abre pela aba Menu)
// e o "Meu link de delivery" (link grande, copiar, abrir, WhatsApp, compartilhar, QR para imprimir ou baixar).
// 22/11/2026, pedido do dono: em vez de dezenas de atalhos na Gestão, as telas ficam no menu, divididas por categoria.
// Os itens são botões (data-ir / data-acao), nunca links com #: as permissões da equipe continuam valendo pela aba
// Gestão (#mais). Quem não vê a Gestão não vê as categorias; o link do delivery aparece para todos.
import { db, t, lojaCfg, linkCardapio, estoqueBaixo, lojaPausada, ouvir } from './loja.js?v=63';
import { acao } from './nucleo.js?v=63';
import { ico, folha, toast, $ } from './ui.js?v=63';
import { qrSVG } from '../base/qr.js';
import { imprimir } from './imprimir.js?v=63';

// [chave, título, ícone, itens: [rótulo, ícone, destino (rota) ou ação]]
export const GRUPOS = [
  ['delivery', 'Delivery', 'moto', [
    ['Meu link e QR do delivery', 'link', { acao: 'link-delivery' }],
    ['Pausar pedidos online', 'alerta', { acao: 'ped-pausa' }],
    ['Pedido do iFood (colar)', 'sacola', { acao: 'ifood-colar' }],
    ['iFood: comissão', 'etiqueta', { ir: 'mais/config/cfg-ifood' }],
    ['Bairros, taxas e entrega', 'pino', { ir: 'mais/restaurante/rest-entrega' }],
    ['Horários de funcionamento', 'relogio', { ir: 'mais/restaurante/rest-horarios' }],
    ['Cupons de desconto', 'etiqueta', { ir: 'mais/cupons' }],
  ]],
  ['cardapio', 'Cardápio', 'cardapio', [
    ['Pratos, preços e complementos', 'cardapio', { ir: 'mais/cardapio' }],
    ['Categorias do cardápio', 'prato', { acao: 'cats-ed' }],
    ['Marmitas do dia', 'cloche', { ir: 'mais/marmita' }],
    ['Estoque e compras', 'estoque', { ir: 'mais/estoque' }],
  ]],
  ['salao', 'Salão', 'mesa', [
    ['Mesas e QR das mesas', 'qr', { ir: 'mais/mesas' }],
  ]],
  ['equipe', 'Equipe', 'pessoas', [
    ['Pessoas, PIN e permissões', 'pessoas', { ir: 'mais/equipe/equipe' }],
    ['Ponto e escala', 'calendario', { ir: 'mais/equipe/ponto' }],
    ['Fechamento do dia', 'conta', { ir: 'mais/equipe/dia' }],
    ['Senha do gerente', 'cofre', { ir: 'mais/equipe/senha' }],
    ['Entregadores e acerto', 'moto', { ir: 'mais/entregadores' }],
  ]],
  ['dinheiro', 'Dinheiro', 'moedas', [
    ['Relatórios de vendas', 'grafico', { ir: 'mais/relatorios' }],
    ['Clientes e fiado', 'pessoas', { ir: 'mais/clientes' }],
  ]],
  ['restaurante', 'Restaurante', 'loja', [
    ['Dados e contato', 'loja', { ir: 'mais/restaurante/rest-dados' }],
    ['Pix do restaurante', 'pix', { ir: 'mais/restaurante/rest-pix' }],
    ['Logo, cor e marca', 'folha', { ir: 'mais/config/cfg-marca' }],
    ['Impressora', 'impressora', { ir: 'mais/config/cfg-restaurante' }],
    ['Nota fiscal', 'conta', { ir: 'mais/config/cfg-nota' }],
    ['Configurações e assinatura', 'ajustes', { ir: 'mais/config' }],
    ['Primeiros passos', 'check', { ir: 'mais/inicio' }],
  ]],
];

// ------------------------------------------------------------------ qual item é a tela de agora
const ITENS = GRUPOS.flatMap(([g, , , l]) => l.map((it) => ({ g, ir: it[2].ir })).filter((x) => x.ir));
function atual() {
  const h = decodeURIComponent(location.hash.slice(1)); if (!h.startsWith('mais/')) return null;
  const dois = h.split('/').slice(0, 2).join('/');
  return ITENS.find((x) => x.ir === h) || ITENS.find((x) => x.ir === dois) || ITENS.find((x) => x.ir.startsWith(`${dois}/`)) || null;
}
const ABERTOS = 'popina-menu-abertos';
const lerAbertos = () => { try { const a = JSON.parse(localStorage.getItem(ABERTOS) || 'null'); return Array.isArray(a) ? a : ['delivery']; } catch { return ['delivery']; } };
const gravarAbertos = (a) => { try { localStorage.setItem(ABERTOS, JSON.stringify(a)); } catch { /* nada */ } };

export function htmlItem([rot, i, dest], on = false) {
  const P = lojaPausada(), baixo = dest.ir === 'mais/estoque' ? estoqueBaixo().length : 0;
  const nome = dest.acao === 'ped-pausa' && P ? 'Pedidos pausados · voltar' : rot;
  const alvo = dest.ir ? `data-ir="${dest.ir}"` : `data-acao="${dest.acao}"`;
  return `<button type="button" class="mg-it${on ? ' on' : ''}${dest.acao === 'ped-pausa' && P ? ' alerta' : ''}" ${alvo} data-fecha-gaveta ${on ? 'aria-current="page"' : ''}>${ico(i)}<span>${nome}</span>${baixo ? `<em>${baixo}</em>` : ''}</button>`;
}
const btLink = (cls = '') => `<button type="button" class="bt-link-del ${cls}" data-acao="link-delivery" data-fecha-gaveta>${ico('link')}<span><b>Meu link de delivery</b><small>Copiar, WhatsApp e QR</small></span></button>`;

function podeGestao() { const m = $('#nav [data-aba="mais"]'); return !!m && !m.hidden && m.style.display !== 'none'; }

function htmlMenu() {
  const a = atual(), abertos = lerAbertos();
  const grupos = podeGestao() ? GRUPOS.map(([k, n, i, l]) => {
    const on = abertos.includes(k) || a?.g === k;
    return `<section class="mg${a?.g === k ? ' atual' : ''}"><button type="button" class="mg-tit" data-mg="${k}" aria-expanded="${on}">${ico(i)}<span>${n}</span>${ico('chevron', 'data-seta')}</button>
      <div class="mg-itens" ${on ? '' : 'hidden'}>${l.map((it) => htmlItem(it, !!a && it[2].ir === a.ir)).join('')}</div></section>`;
  }).join('') : '';
  return `<div class="gaveta-cab"><b>Menu</b><button type="button" class="bt-ico" data-fecha-gaveta aria-label="Fechar o menu">${ico('fechar')}</button></div>
    ${btLink('so-cel')}${grupos ? `<div class="mg-lista" aria-label="Gestão por categoria">${grupos}</div>` : ''}`;
}

// ------------------------------------------------------------------ a visão curta da Gestão (#mais)
export function htmlVisao() {
  return `<div class="visao-link">${btLink('grande')}</div>
    <div class="visao-g">${GRUPOS.map(([, n, i, l]) => `<section class="cartao"><h2 class="visao-tit">${ico(i)}${n}</h2><div class="visao-itens">${l.map((it) => htmlItem(it)).join('')}</div></section>`).join('')}</div>`;
}

// ------------------------------------------------------------------ montar: menu no topo (computador) e gaveta (celular)
const celular = () => matchMedia('(max-width:1023px)').matches;
function abrirGaveta(sim) {
  document.body.classList.toggle('gaveta-aberta', sim);
  const g = $('#menu-lado'); if (g) g.setAttribute('aria-hidden', celular() && !sim ? 'true' : 'false');
  if (sim) setTimeout(() => $('#menu-lado .mg-it.on, #menu-lado .bt-link-del')?.focus(), 60);
}
export function montarMenu() {
  const nav = $('#nav'); if (!nav || $('#menu-lado')) return;
  // computador: o botão do link fica no topo do menu lateral, acima das abas
  nav.insertAdjacentHTML('beforebegin', `<div id="link-lado" class="so-pc">${btLink()}</div>`);
  nav.insertAdjacentHTML('afterend', '<nav id="menu-lado" class="menu-lado" aria-label="Menu por categoria"></nav><div id="menu-fundo" class="menu-fundo" data-fecha-gaveta></div>');
  const box = $('#menu-lado');
  let ult = '';
  const desenhar = () => {
    const h = htmlMenu(); if (h === ult) return; ult = h; box.innerHTML = h;
    // computador: a tela de agora fica à vista no menu lateral
    const on = $('.mg-it.on', box), topo = box.closest('.topo');
    if (on && topo && !celular()) { const a = on.getBoundingClientRect(), b = topo.getBoundingClientRect(); if (a.top < b.top + 90 || a.bottom > b.bottom - 20) topo.scrollTop += a.top - b.top - b.height / 2; }
  };
  desenhar(); abrirGaveta(false);
  document.addEventListener('popina-tela', desenhar);
  ouvir(desenhar);
  addEventListener('hashchange', desenhar);
  const mais = $('#nav [data-aba="mais"]');
  if (mais) new MutationObserver(desenhar).observe(mais, { attributes: true, attributeFilter: ['hidden', 'style'] });
  addEventListener('resize', () => { if (!celular()) abrirGaveta(false); else if (!document.body.classList.contains('gaveta-aberta')) box.setAttribute('aria-hidden', 'true'); });
  // abrir e fechar os grupos (lembra neste aparelho)
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mg]'); if (!b) return;
    const k = b.dataset.mg, l = lerAbertos(), on = b.getAttribute('aria-expanded') !== 'true';
    gravarAbertos(on ? [...new Set([...l, k])] : l.filter((x) => x !== k));
    b.setAttribute('aria-expanded', on); b.nextElementSibling.hidden = !on; ult = box.innerHTML;
  });
  // celular: a aba Menu abre a gaveta em vez de trocar de tela
  mais?.addEventListener('click', (e) => { if (!celular()) return; e.preventDefault(); abrirGaveta(!document.body.classList.contains('gaveta-aberta')); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-fecha-gaveta]') && document.body.classList.contains('gaveta-aberta')) abrirGaveta(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('gaveta-aberta')) abrirGaveta(false); });
}

// ------------------------------------------------------------------ Meu link de delivery
const linkDelivery = () => linkCardapio('delivery=1');
async function copiar(txt, campo) {
  try { await navigator.clipboard.writeText(txt); return true; } catch { /* tenta do jeito antigo */ }
  try { campo?.focus(); campo?.select(); return document.execCommand('copy'); } catch { return false; }
}
function htmlImpressao(link) {
  const nome = t(db.config.nome || '');
  return `<div class="tk a4" style="max-width:none;text-align:center;padding-top:30mm">
    <h1 style="font-size:30pt;margin:0 0 4mm">${nome || 'Peça pelo delivery'}</h1><p style="font-size:18pt;margin:0 0 10mm">Aponte a câmera do celular e peça pelo delivery</p>
    <div style="display:inline-block">${qrSVG(link, 420, '#000')}</div>
    <p style="font-size:13pt;margin-top:8mm;word-break:break-all">${t(link)}</p></div>`;
}
function baixarQR(link) {
  const tam = 1000, alto = 1180, svg = qrSVG(link, 900, '#000');
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = tam; c.height = alto; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, tam, alto); x.drawImage(img, 50, 40, 900, 900);
    x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '800 54px Figtree, Arial, sans-serif'; x.fillText((db.config.nome || 'Peça pelo delivery').slice(0, 30), tam / 2, 1030);
    x.font = '600 38px Figtree, Arial, sans-serif'; x.fillText('Aponte a câmera e peça pelo delivery', tam / 2, 1100);
    c.toBlob((b) => {
      if (!b) return toast('Não deu para gerar a imagem');
      const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'qr-delivery.png'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Imagem do QR baixada');
    }, 'image/png');
  };
  img.onerror = () => toast('Não deu para gerar a imagem');
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function abrirLinkDelivery() {
  const link = linkDelivery(), L = lojaCfg(), off = L.delivery === false, P = lojaPausada();
  const msg = `Peça pelo nosso cardápio online${db.config.nome ? ` (${db.config.nome})` : ''}: ${link}`;
  const compartilha = typeof navigator.share === 'function';
  folha({
    titulo: 'Meu link de delivery',
    corpo: `${off ? `<p class="aviso perigo">A entrega pelo link está desligada: o cliente só consegue pedir para retirar. <button type="button" class="bt pq" data-ir="mais/restaurante/rest-entrega" data-fechar>Ligar a entrega</button></p>` : ''}
      ${P ? '<p class="aviso perigo">Os pedidos online estão pausados agora: quem abrir o link vê a loja fechada.</p>' : ''}
      <p class="mudo">Mande este link para os clientes. Eles veem o cardápio, montam o pedido e ele chega aqui em <b>Pedidos</b>.</p>
      <label class="campo ld-campo"><span>Seu link</span><input data-ld-link readonly value="${t(link)}"></label>
      <div class="ld-bts">
        <button type="button" class="bt cheio grande" data-ld-copiar>${ico('link')}Copiar link</button>
        <a class="bt grande ld-zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">${ico('zap')}Mandar no WhatsApp</a>
        <a class="bt" target="_blank" rel="noopener" href="${t(link)}">${ico('dir')}Abrir o cardápio</a>
        ${compartilha ? `<button type="button" class="bt" data-ld-share>${ico('troca')}Compartilhar</button>` : ''}
      </div>
      <div class="ld-qr"><div class="ld-qr-img">${qrSVG(link, 220, '#000')}</div>
        <div><b>QR do delivery</b><p class="mudo">Cole no balcão, na sacola, no cardápio de papel ou no panfleto: o cliente aponta a câmera e já pede.</p>
        <div class="linha-bts"><button type="button" class="bt" data-ld-imp>${ico('impressora')}Imprimir o QR</button><button type="button" class="bt" data-ld-baixar>${ico('estoque')}Baixar a imagem</button></div></div></div>
      <div class="ld-dica"><b>Dica: ponha na bio do Instagram</b>
        <ol><li>No Instagram, toque em <b>Editar perfil</b>.</li><li>Em <b>Links</b>, toque em <b>Adicionar link externo</b>.</li><li>Cole o link (botão <b>Copiar link</b> acima) e salve.</li></ol>
        <p class="mudo">Vale também no status do WhatsApp, na mensagem de saudação do WhatsApp Business e no Google Meu Negócio.</p></div>`,
    pe: '<button type="button" class="bt grande" data-fechar>Fechar</button>',
    aoAbrir: (f) => {
      const campo = $('[data-ld-link]', f);
      campo.addEventListener('focus', () => campo.select());
      $('[data-ld-copiar]', f).onclick = async () => toast((await copiar(link, campo)) ? 'Link copiado: é só colar' : 'Não deu para copiar: segure o dedo no link e copie');
      $('[data-ld-share]', f)?.addEventListener('click', () => navigator.share({ title: db.config.nome || 'Cardápio', text: 'Peça pelo nosso cardápio online', url: link }).catch(() => {}));
      $('[data-ld-imp]', f).onclick = () => imprimir(htmlImpressao(link), 'a4');
      $('[data-ld-baixar]', f).onclick = () => baixarQR(link);
    },
  });
}
acao('link-delivery', () => abrirLinkDelivery());

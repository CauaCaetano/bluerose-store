// Atria · "Postar": monta a imagem no formato de cada rede (feed 4:5, Stories e Status 9:16, Facebook 4:5) com a marca do
// profissional, gera a legenda e o funil (chamada para o WhatsApp, sequência de posts e respostas prontas) e abre a rede pelo
// compartilhamento do próprio celular, com a legenda já copiada. Sem servidor: quem aperta "publicar" é a pessoa, na rede.
import { $, $$, t, ico, db, grava, toast, folha, copiar, comIA, abrirZap, zap, telLimpo, vibra } from './base.js';
import { cena } from './cenas.js';
import { meusOficios, principal, nomeOficios, OFICIOS } from './oficios.js';
import { cliente } from './gestao.js';

export const DESTINOS = {
  feed: { nome: 'Instagram (feed)', curto: 'Instagram', ic: 'camera', w: 1080, h: 1350, rede: 'Instagram', dica: 'Escolha o Instagram, depois "Feed". Cole a legenda e toque em Compartilhar.' },
  stories: { nome: 'Instagram Stories', curto: 'Stories', ic: 'antesdepois', w: 1080, h: 1920, rede: 'Instagram', dica: 'Escolha o Instagram, depois "Story". Toque em "Seu story".' },
  status: { nome: 'Status do WhatsApp', curto: 'Status', ic: 'zap', w: 1080, h: 1920, rede: 'WhatsApp', dica: 'Escolha o WhatsApp, depois "Meu status". Cole a legenda na foto e envie.' },
  facebook: { nome: 'Facebook', curto: 'Facebook', ic: 'partilhar', w: 1080, h: 1350, rede: 'Facebook', dica: 'Escolha o Facebook. Cole a legenda e toque em Publicar.' },
};
const demo = () => !/[?&]conta=/.test(location.search);
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();

// ------------------------------------------------------------------ legenda e funil
export function hashtags(of) {
  const c = semAcento(db.perfil.cidade), nome = semAcento((OFICIOS[of] || {}).nome || 'reforma').replace(/ajudante|servente/, '');
  return [`#${nome}${c}`, `#${nome}`, `#reforma${c}`, `#obra${c}`, '#antesedepois', `#${c}`].filter((x, i, a) => x.length > 2 && a.indexOf(x) === i).join(' ');
}
export function linkZapPost(servico) { return zap(db.perfil.zap, `Oi, ${db.perfil.apelido}! Vi seu post sobre ${String(servico || 'o serviço').toLowerCase()} e queria um orçamento.`); }
export function legendaModelo(p, v = 0) {
  const o = p.obra ? (db.obras.find((x) => x.id === p.obra) || null) : null, of = p.of || principal(db.perfil).id;
  const serv = o ? o.titulo : `serviço de ${((OFICIOS[of] || {}).nome || 'reforma').toLowerCase()}`, cid = db.perfil.cidade;
  const gancho = [`Olha a diferença 👇`, `Antes e depois de ${serv.toLowerCase()}.`, `Quem vê o depois não imagina o antes.`][v % 3];
  const beneficio = [`${serv} feito do jeito certo, com material de qualidade e obra limpa no fim.`, `Medido, orçado com lista de material e entregue no prazo.`, `Serviço caprichado, sem surpresa no preço.`][v % 3];
  const prova = o && o.etapas ? `${o.etapas.length} etapas, aqui em ${cid}.` : `Mais uma entregue em ${cid}.`;
  const chamada = `Quer um orçamento sem compromisso? Chama no WhatsApp: ${db.perfil.zap}`;
  return `${gancho}\n\n${beneficio} ${prova}\n\n${chamada}\n\n${hashtags(of)}`;
}
export const SEQUENCIA = [
  ['1º · Antes e depois', 'O resultado chama atenção. Poste hoje.'],
  ['2º · Bastidor', 'Foto do diário da obra (você trabalhando, o material, a medição). Mostra cuidado. 2 ou 3 dias depois.'],
  ['3º · Oferta', '"Tenho 2 datas livres este mês para reforma de banheiro. Chama no WhatsApp." Fecha a semana.'],
];
export const QUANDO = 'Melhores horários: terça e quinta, das 19h às 21h, e sábado de manhã. Poste de 2 a 3 vezes por semana.';
export const RESPOSTAS = [
  ['Primeira resposta', 'Oi! Obrigado por chamar. Me conta: qual serviço você precisa e em que bairro é?'],
  ['Pedir foto e medida', 'Consegue me mandar uma foto do local e a medida aproximada (largura x altura)? Assim já te passo uma ideia de valor.'],
  ['Quando', 'Para quando você precisa? Tenho data livre na semana que vem.'],
  ['Marcar visita', 'Posso passar aí para medir sem compromisso. Pode ser amanhã às 8h?'],
];

// ------------------------------------------------------------------ imagem com a marca (canvas)
const carrega = (src) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = src; });
const svgSrc = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns=/, 'xmlns='))}`;
function cobre(g, img, x, y, w, h) { const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore(); }
function selo(g, txt, x, y, cor, fundo) { g.font = '700 30px "Rethink Sans", sans-serif'; const w = g.measureText(txt).width + 40; g.fillStyle = fundo; g.beginPath(); g.roundRect(x, y, w, 54, 27); g.fill(); g.fillStyle = cor; g.fillText(txt, x + 20, y + 37); return w; }
async function fotos(p) {
  const antes = p.fotoAntes ? p.fotoAntes : svgSrc(cena(p.cena || 'muro', 'antes')), depois = p.fotoDepois ? p.fotoDepois : svgSrc(cena(p.cena || 'muro', 'depois'));
  return { antes: await carrega(antes), depois: await carrega(depois) };
}
export async function montarImagem(p, destino) {
  const D = DESTINOS[destino], c = document.createElement('canvas'); c.width = D.w; c.height = D.h; const g = c.getContext('2d');
  try { await document.fonts.ready; } catch { /* segue com a fonte do sistema */ }
  const { antes, depois } = await fotos(p), ad = p.tipo === 'ad', alto = D.h > D.w;
  g.fillStyle = '#F4EFE8'; g.fillRect(0, 0, D.w, D.h);
  const rodape = alto ? 330 : 250, topo = alto ? 150 : 0, area = D.h - rodape - topo;
  if (ad) {
    const h2 = (area - 12) / 2;
    cobre(g, antes, 0, topo, D.w, h2); cobre(g, depois, 0, topo + h2 + 12, D.w, h2);
    selo(g, 'ANTES', 36, topo + 32, '#F4EFE8', 'rgba(46,51,59,.82)'); selo(g, 'DEPOIS', 36, topo + h2 + 44, '#2E333B', '#C2A37A');
  } else cobre(g, depois, 0, topo, D.w, area);
  if (alto) { g.fillStyle = '#2E333B'; g.font = '800 64px "Big Shoulders Display", "Arial Narrow", sans-serif'; g.fillText(db.perfil.nome.toUpperCase(), 48, 100); }
  // rodapé com a marca do profissional
  const y0 = D.h - rodape; g.fillStyle = '#FBF9F5'; g.fillRect(0, y0, D.w, rodape); g.fillStyle = '#C2A37A'; g.fillRect(0, y0, D.w, 6);
  try { const s = await carrega('simbolo.svg'); g.drawImage(s, 44, y0 + 42, 96 * s.width / s.height, 96); } catch { /* sem símbolo */ }
  const o = p.obra ? db.obras.find((x) => x.id === p.obra) : null, serv = o ? o.titulo : ((OFICIOS[p.of] || {}).nome || 'Reforma');
  g.fillStyle = '#2E333B'; g.font = `800 ${alto ? 60 : 54}px "Big Shoulders Display", "Arial Narrow", sans-serif`; g.fillText(alto ? serv.toUpperCase().slice(0, 30) : db.perfil.nome.toUpperCase(), 200, y0 + 92);
  g.font = '500 34px "Rethink Sans", sans-serif'; g.fillStyle = '#434A54'; g.fillText(`${alto ? nomeOficios(db.perfil) : serv} · ${db.perfil.cidade}`.slice(0, 46), 200, y0 + 142);
  g.fillStyle = '#5E7486'; g.font = '700 36px "Rethink Sans", sans-serif'; g.fillText(`Orçamento no WhatsApp ${db.perfil.zap}`, 44, y0 + rodape - (alto ? 90 : 46));
  return new Promise((ok) => c.toBlob((b) => ok(new File([b], `atria-${destino}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9));
}

// ------------------------------------------------------------------ abrir a rede (compartilhar do celular)
async function abrir(destino, arquivo, legenda) {
  await copiar(legenda); toast('Legenda copiada: é só colar');
  const pode = navigator.canShare && navigator.canShare({ files: [arquivo] });
  if (pode) { try { await navigator.share({ files: [arquivo], text: destino === 'status' || destino === 'facebook' ? legenda : undefined }); return 'ok'; } catch (e) { return e && e.name === 'AbortError' ? 'cancelou' : 'erro'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(arquivo); a.download = arquivo.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return 'baixou';
}

// ------------------------------------------------------------------ fluxo: escolher destinos, legenda, um de cada vez
export function abrirPostar(p) {
  let escolha = new Set(['feed']), legenda = p.legendaRedes || legendaModelo(p), v = 0;
  folha({ titulo: 'Postar', classe: 'px-folha',
    corpo: `<p class="mudo" style="margin:0 0 10px">Onde quer postar?</p>
      <div class="px-dest">${Object.entries(DESTINOS).map(([k, d]) => `<button type="button" class="px-d" data-d="${k}" aria-pressed="${k === 'feed'}">${ico(d.ic, 'width="26" height="26"')}<b>${d.nome}</b></button>`).join('')}<button type="button" class="px-d px-todos" data-d="todos" aria-pressed="false">${ico('ok', 'width="26" height="26"')}<b>Todos</b></button></div>
      <div class="px-previa" data-previa></div>
      <label class="campo" style="margin-top:12px"><span>Legenda (já vai copiada)</span><textarea data-leg data-voz rows="7">${t(legenda)}</textarea></label>
      <div class="acoes" style="margin-top:-4px"><button type="button" class="bt leve p" data-ia>${ico('ia')}Outra legenda</button><button type="button" class="bt leve p" data-funil>${ico('lista')}Funil: depois de postar</button></div>
      <p class="explica" style="margin-top:12px">O Atria prepara a imagem no tamanho certo e a legenda. Você escolhe a rede no seu celular e toca em <b>publicar</b>. Publicar sozinho, sem abrir a rede, fica para uma próxima versão.</p>`,
    pe: '<button type="button" class="bt cheio largo" data-ir>Preparar e abrir</button>',
    aoAbrir: async (f, api) => {
      const previa = async () => { const d = [...escolha][0] || 'feed', arq = await montarImagem(p, d), u = URL.createObjectURL(arq); $('[data-previa]', f).innerHTML = `<img src="${u}" alt="Prévia ${t(DESTINOS[d].nome)}" class="${DESTINOS[d].h > 1400 ? 'alto' : ''}">`; };
      $$('[data-d]', f).forEach((b) => { b.onclick = () => {
        const k = b.dataset.d;
        if (k === 'todos') escolha = escolha.size === 4 ? new Set(['feed']) : new Set(Object.keys(DESTINOS));
        else if (escolha.has(k) && escolha.size > 1) escolha.delete(k); else escolha.add(k);
        $$('[data-d]', f).forEach((x) => x.setAttribute('aria-pressed', x.dataset.d === 'todos' ? escolha.size === 4 : escolha.has(x.dataset.d)));
        vibra(6); previa();
      }; });
      $('[data-ia]', f).onclick = async (e) => {
        e.currentTarget.disabled = true; v++;
        const r = await comIA(`Escreva a legenda de um post de antes e depois de um ${nomeOficios(db.perfil).toLowerCase()} em ${db.perfil.cidade}. Estrutura: gancho curto, benefício, prova (cidade), chamada para o WhatsApp ${db.perfil.zap}, e no fim estas hashtags: ${hashtags(p.of)}. Português simples, sem exagero.`, () => legendaModelo(p, v));
        $('[data-leg]', f).value = r.txt; e.currentTarget.disabled = false;
      };
      $('[data-funil]', f).onclick = () => abrirFunil(p);
      $('[data-ir]', f).onclick = () => { p.legendaRedes = $('[data-leg]', f).value; grava(); api.fechar(true); guiado(p, [...escolha], p.legendaRedes); };
      previa();
    } });
}
function guiado(p, lista, legenda) {
  const feito = {};
  const passo = (i) => {
    const k = lista[i], D = DESTINOS[k];
    folha({ titulo: lista.length > 1 ? `${i + 1} de ${lista.length} · ${D.curto}` : D.nome, classe: 'px-folha',
      corpo: `<ol class="px-check">${lista.map((x, j) => `<li class="${feito[x] ? 'feito' : j === i ? 'agora' : ''}">${feito[x] ? ico('ok', 'width="18" height="18"') : `<span>${j + 1}</span>`}${DESTINOS[x].nome}</li>`).join('')}</ol>
        <p style="font-size:16px;margin:14px 0 6px"><b>Como fazer:</b> ${D.dica}</p><p class="mudo" style="margin:0">A legenda já está copiada. Na rede, toque e segure no campo de texto e escolha <b>Colar</b>.</p>`,
      pe: `<button type="button" class="bt leve p" data-baixar>${ico('doc')}Baixar imagem</button><button type="button" class="bt cheio" data-abrir style="flex:2">${ico(D.ic)}Abrir ${D.rede}</button>`,
      aoAbrir: (f, api) => {
        const proximo = () => { feito[k] = true; api.fechar(true); if (i + 1 < lista.length) passo(i + 1); else { toast(lista.length > 1 ? 'Pronto: postado em tudo o que escolheu' : 'Pronto!'); (p.postadoEm = p.postadoEm || {})[k] = new Date().toISOString().slice(0, 10); grava(); setTimeout(() => abrirFunil(p), 400); } };
        $('[data-baixar]', f).onclick = async () => { const a = await montarImagem(p, k), l = document.createElement('a'); l.href = URL.createObjectURL(a); l.download = a.name; l.click(); toast('Imagem salva no celular'); };
        $('[data-abrir]', f).onclick = async () => {
          const arq = await montarImagem(p, k);
          if (demo() && !window.atriaCompartilharDeVerdade) { simulacao(k, arq, legenda, async () => { const r = await abrir(k, arq, legenda); if (r !== 'cancelou') proximo(); }, proximo); return; }
          const r = await abrir(k, arq, legenda);
          if (r === 'baixou') toast('Imagem baixada e legenda copiada. Abra o app da rede e poste a imagem.');
          if (r !== 'cancelou') proximo();
        };
      } });
  };
  passo(0);
}
function simulacao(k, arq, legenda, deVerdade, seguir) {
  const u = URL.createObjectURL(arq), D = DESTINOS[k];
  folha({ titulo: `${D.rede} · simulação`, classe: 'px-folha',
    corpo: `<div class="px-sim"><img src="${u}" alt=""><pre>${t(legenda.slice(0, 220))}${legenda.length > 220 ? '…' : ''}</pre></div><p class="explica">Isto é a demonstração: nada foi publicado. No seu celular, este botão abre o ${D.rede} com esta imagem e a legenda copiada; você só toca em publicar.</p>`,
    pe: '<button type="button" class="bt leve p" data-real>Abrir no meu celular</button><button type="button" class="bt cheio" data-ok>Entendi, próximo</button>',
    aoAbrir: (f, api) => { $('[data-ok]', f).onclick = () => { api.fechar(true); seguir(); }; $('[data-real]', f).onclick = () => { api.fechar(true); deVerdade(); }; } });
}
export function abrirFunil(p) {
  const o = p && p.obra ? db.obras.find((x) => x.id === p.obra) : null, serv = o ? o.titulo : 'reforma', link = linkZapPost(serv);
  folha({ titulo: 'Funil: depois de postar', classe: 'px-folha',
    corpo: `<h2 class="sec" style="margin-top:0">1 · Chamada para o WhatsApp</h2><p class="mudo" style="margin:0 0 8px">Ponha este link na bio e no fim da legenda: quem tocar já chega com a mensagem pronta.</p>
      <div class="cartao px-link"><span class="num">${t(link)}</span></div><div class="acoes"><button type="button" class="bt leve p" data-c="${t(link)}">${ico('copiar')}Copiar link</button></div>
      <h2 class="sec">2 · Sequência da semana</h2><div class="lista">${SEQUENCIA.map(([a, b]) => `<div class="linha" style="cursor:default"><span class="ic">${ico('calendario')}</span><span class="txt"><b>${a}</b><small style="white-space:normal">${b}</small></span></div>`).join('')}</div>
      <p class="explica">${QUANDO}</p>
      <h2 class="sec">3 · Responder quem chamar</h2><div class="lista">${RESPOSTAS.map(([a, b]) => `<div class="cartao"><b>${a}</b><p style="margin:6px 0 8px">${t(b)}</p><button type="button" class="bt leve p" data-c="${t(b)}">${ico('copiar')}Copiar</button></div>`).join('')}</div>`,
    aoAbrir: (f) => $$('[data-c]', f).forEach((b) => { b.onclick = () => copiar(b.dataset.c); }) });
}

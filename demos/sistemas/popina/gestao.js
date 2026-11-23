// Popina · Gestão: o menu e as telas do dono (restaurante, mesas e QR, equipe, minha conta). As outras telas da Gestão
// (cardápio, estoque, clientes, entregadores, relatórios) entram por G em cadastro.js e relatorios.js.
import { db, t, din, r2, num, vir, uid, grava, CONTA, lojaCfg, setLoja, linkCardapio, regras, setRegras, temPin, fone, soDig, recomecar, estoqueBaixo } from './loja.js?v=59';
import { registrar, acao, ir } from './nucleo.js?v=59';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=59';
import { qrSVG } from '../base/qr.js';
import { DIAS } from './opcoes.js?v=59';
import { imprimir } from './imprimir.js?v=59';
import { telaEquipe } from './equipe.js?v=59';
import { htmlVisao } from './menu.js?v=59';

export const G = {};      // sub-telas: G[nome] = { titulo, html(), montar(el) }
export const volta = (titulo, sub = '') => `<button type="button" class="voltar" data-ir="mais">${ico('voltar')}Gestão</button><div class="cab"><div><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
// 22/11/2026: a Gestão virou uma visão curta. As telas ficam no menu lateral (computador) e na gaveta Menu (celular),
// divididas por categoria (menu.js). Rotas mais/<tela>/<seção> continuam: a seção rola até o cartão com aquele id.
let rolou = '';
registrar('mais', {
  titulo: (sub) => (sub && G[sub] ? G[sub].titulo : 'Gestão'),
  html(sub, ...r) {
    if (sub && G[sub]) return G[sub].html(...r);
    return `<div class="cab"><div><h1>Gestão</h1><p>${t(db.config.nome || 'Seu restaurante')} · tudo também fica no menu ${'<span class="so-pc">ao lado</span><span class="so-cel">(aba Menu, embaixo)</span>'}</p></div></div>${htmlVisao()}`;
  },
  montar(el, sub, ...r) {
    if (sub && G[sub]) G[sub].montar?.(el, ...r);
    const sec = r[0];
    if (sub !== 'config' && sec && rolou !== location.hash) { const alvo = document.getElementById(sec); if (alvo) { rolou = location.hash; setTimeout(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); } }
    if (!sec) rolou = '';
  },
});

// ------------------------------------------------------------------ restaurante
const CORES = ['#B4532F', '#9A3412', '#8C2F39', '#B91C1C', '#5F6B2B', '#2F6B3A', '#1F5E5B', '#1F4E79', '#5B3F8C', '#4A2416', '#A16207', '#C2410C'];
function reduzir(arq, W, H) {
  return new Promise((ok, falha) => {
    const img = new Image(), u = URL.createObjectURL(arq);
    img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const e = Math.min(W / img.width, H / img.height), w = img.width * e, h = img.height * e;
      x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); URL.revokeObjectURL(u); ok(c.toDataURL('image/webp', 0.82)); };
    img.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); }; img.src = u;
  });
}
export { reduzir };
const linhaHorario = (k, l) => {
  const tur = l[k] || [];
  return `<div class="cartao" style="padding:12px 14px;margin-top:10px" data-dia="${k}"><label class="liga" style="border:0;min-height:44px;padding:0">${DIAS[k]}<input type="checkbox" data-aberto ${tur.length ? 'checked' : ''}></label>
    <div data-turnos ${tur.length ? '' : 'hidden'}><div class="grade2"><label class="campo"><span>Abre</span><input type="time" data-a1 value="${t(tur[0]?.[0] || '11:00')}"></label><label class="campo"><span>Fecha</span><input type="time" data-f1 value="${t(tur[0]?.[1] || '15:00')}"></label></div>
    <label class="liga" style="min-height:44px;border:0;padding:0">Abre de novo à noite<input type="checkbox" data-2 ${tur[1] ? 'checked' : ''}></label>
    <div class="grade2" data-t2 ${tur[1] ? '' : 'hidden'}><label class="campo"><span>Abre</span><input type="time" data-a2 value="${t(tur[1]?.[0] || '18:00')}"></label><label class="campo"><span>Fecha</span><input type="time" data-f2 value="${t(tur[1]?.[1] || '23:00')}"></label></div></div></div>`;
};
G.restaurante = {
  titulo: 'Restaurante',
  html() {
    const c = db.config, L = lojaCfg(), cor = L.cor;
    return volta('Restaurante', 'O que o cliente vê no cardápio e o que vai no recibo') + `<form class="duas" data-rest>
    <div>
      <div class="cartao" id="rest-dados"><h2>Dados</h2>
        <label class="campo"><span>Nome do restaurante</span><input name="nome" maxlength="60" value="${t(c.nome || '')}" required></label>
        <div class="grade2"><label class="campo"><span>Cidade</span><input name="cidade" maxlength="40" value="${t(c.cidade || '')}"></label><label class="campo"><span>Taxa de serviço (%)</span><input name="servico" inputmode="decimal" value="${vir(c.servico ?? 10)}"></label></div>
        <label class="campo"><span>Endereço</span><input name="endereco" maxlength="120" value="${t(L.endereco || '')}"></label>
        <label class="campo"><span>WhatsApp do restaurante (recebe os pedidos)</span><input name="whatsapp" inputmode="tel" value="${t(fone(c.whatsapp || ''))}" placeholder="16 99999-9999"></label>
        <label class="campo"><span>WhatsApp do dono (recebe o fechamento do dia)</span><input name="whatsappDono" inputmode="tel" value="${t(fone(c.whatsappDono || ''))}" placeholder="16 99999-9999"></label>
        <label class="campo"><span>Frase do cardápio</span><input name="boasVindas" maxlength="80" value="${t(L.boasVindas || '')}" placeholder="Ex.: Lanches, pizzas e prato feito"></label>
        <label class="campo"><span>Aviso no cardápio (opcional)</span><input name="aviso" maxlength="120" value="${t(L.aviso || '')}" placeholder="Ex.: Sábado tem feijoada"></label>
      </div>
      <div class="cartao"><h2>Logo e cor</h2><p class="mudo">O logo, a cor da marca e o esquema de cores ficam em Configurações, “Sua marca” e “Esquema de cores”.</p>
        <div class="linha-bts" style="margin-top:12px"><button type="button" class="bt" data-ir="mais/config/cfg-marca">${ico('ajustes')}Abrir Sua marca</button></div></div>
      <div class="cartao" id="rest-pix"><h2>Pix do restaurante</h2>
        <label class="campo"><span>Chave Pix</span><input name="pix" maxlength="80" value="${t(c.pix?.exemplo ? '' : c.pix?.chave || '')}" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"><small>Aparece como QR com o valor na hora de fechar a conta. O dinheiro cai direto na sua conta.</small></label>
      </div>
    </div>
    <div>
      <div class="cartao" id="rest-entrega"><h2>Entrega e retirada</h2>
        <label class="liga">Aceita pedido de entrega pelo link<input type="checkbox" name="delivery" ${L.delivery !== false ? 'checked' : ''}></label>
        <label class="liga">Aceita pedido para retirar<input type="checkbox" name="retirada" ${L.retirada !== false ? 'checked' : ''}></label>
        <label class="liga">Cliente pede pelo QR da mesa<input type="checkbox" name="aceitaQR" ${L.aceitaQR !== false ? 'checked' : ''}></label>
        <div class="grade2" style="margin-top:12px"><label class="campo"><span>Tempo de entrega</span><input name="tempoEntrega" maxlength="30" value="${t(L.tempoEntrega || '')}" placeholder="40 a 60 min"></label><label class="campo"><span>Tempo para retirar</span><input name="tempoRetirada" maxlength="30" value="${t(L.tempoRetirada || '')}" placeholder="20 min"></label></div>
        <label class="campo"><span>Pedido mínimo da entrega (R$)</span><input name="pedidoMinimo" inputmode="decimal" value="${L.pedidoMinimo ? vir(L.pedidoMinimo) : ''}" placeholder="0,00"></label>
        <p class="campo"><span>Taxa por bairro</span></p>
        <div data-bairros>${(db.bairros || []).map((b) => `<div class="grade2" data-b><input aria-label="Bairro" value="${t(b.nome)}" data-bn><input aria-label="Taxa" inputmode="decimal" value="${vir(b.taxa)}" data-bt></div>`).join('')}</div>
        <button type="button" class="bt pq" data-mais-bairro style="margin-top:6px">${ico('mais2')}Bairro</button>
        <p class="campo" style="margin-top:14px"><span>Formas de pagamento na entrega</span></p>
        <div class="chips quebra">${['Pix', 'Cartão na entrega', 'Dinheiro'].map((f) => `<label class="chip"><input type="checkbox" name="pag" value="${f}" ${(L.pagamentos || []).includes(f) ? 'checked' : ''}> ${f}</label>`).join('')}</div>
      </div>
      <div class="cartao" id="rest-horarios"><h2>Horários</h2><p class="mudo">Fora do horário, o cardápio online mostra "fechado" e não aceita pedido.</p><div data-horas>${DIAS.map((_, k) => linhaHorario(k, L.horarios || [])).join('')}</div></div>
    </div>
    <div class="barra-fixa" style="grid-column:1/-1"><button class="bt cheio grande">${ico('check')}Salvar</button></div></form>`;
  },
  montar(el) {
    const f = $('[data-rest]', el); if (!f) return;
    $('[data-mais-bairro]', f).onclick = () => $('[data-bairros]', f).insertAdjacentHTML('beforeend', '<div class="grade2" data-b><input aria-label="Bairro" data-bn placeholder="Bairro"><input aria-label="Taxa" inputmode="decimal" data-bt placeholder="0,00"></div>');
    $$('[data-dia]', f).forEach((d) => {
      $('[data-aberto]', d).onchange = (e) => { $('[data-turnos]', d).hidden = !e.target.checked; };
      $('[data-2]', d).onchange = (e) => { $('[data-t2]', d).hidden = !e.target.checked; };
    });
    f.onsubmit = (e) => {
      e.preventDefault(); const v = (n) => f.elements[n]?.value?.trim() ?? '';
      if (!v('nome')) return toast('Escreva o nome do restaurante');
      const c = db.config; c.nome = v('nome'); c.cidade = v('cidade'); c.servico = Math.max(0, Math.min(20, num(v('servico')))); c.whatsapp = soDig(v('whatsapp')); c.whatsappDono = soDig(v('whatsappDono'));
      if (v('pix')) c.pix = { ...(c.pix || {}), tipo: c.pix?.tipo || '', chave: v('pix'), exemplo: false }; else if (!c.pix?.exemplo) c.pix = { ...(c.pix || {}), chave: '' };
      db.bairros.splice(0, db.bairros.length, ...$$('[data-b]', f).map((b) => ({ nome: $('[data-bn]', b).value.trim(), taxa: r2(num($('[data-bt]', b).value)) })).filter((b) => b.nome));
      const horarios = $$('[data-dia]', f).map((d) => (!$('[data-aberto]', d).checked ? [] : [[$('[data-a1]', d).value, $('[data-f1]', d).value], ...($('[data-2]', d).checked ? [[$('[data-a2]', d).value, $('[data-f2]', d).value]] : [])]));
      setLoja({ endereco: v('endereco'), boasVindas: v('boasVindas'), aviso: v('aviso'), delivery: f.elements.delivery.checked, retirada: f.elements.retirada.checked, aceitaQR: f.elements.aceitaQR.checked,
        tempoEntrega: v('tempoEntrega'), tempoRetirada: v('tempoRetirada'), pedidoMinimo: r2(num(v('pedidoMinimo'))), pagamentos: $$('[name=pag]:checked', f).map((i) => i.value), horarios });
      toast('Salvo');
    };
  },
};

// ------------------------------------------------------------------ cupons do cardápio online (config.loja.cupons)
const TIPOS_CUPOM = [['pct', '% de desconto'], ['valor', 'R$ de desconto'], ['frete', 'Entrega grátis']];
const descCupom = (k) => (k.tipo === 'frete' ? 'Entrega grátis' : k.tipo === 'pct' ? `${vir(Number(k.valor) || 0)}% de desconto` : `${din(k.valor)} de desconto`);
G.cupons = {
  titulo: 'Cupons',
  html() {
    const l = Array.isArray(lojaCfg().cupons) ? lojaCfg().cupons : [];
    return volta('Cupons', 'O cliente digita o código no cardápio online e o desconto já vem no pedido') + `
    <div class="linha-bts" style="margin-bottom:14px"><button type="button" class="bt cheio grande" data-acao="cupom-ed">${ico('mais2')}Novo cupom</button></div>
    <div class="cartao"><ul class="lista-l">${l.map((k) => `<li><div class="tx"><b><span class="cod">${t(k.codigo)}</span>${descCupom(k)}</b><small>${Number(k.minimo) ? `pedido mínimo ${din(k.minimo)} · ` : ''}${k.validade ? `até ${new Date(`${k.validade}T12:00`).toLocaleDateString('pt-BR')} · ` : ''}usado ${Number(k.usos) || 0}${Number(k.limite) ? ` de ${k.limite}` : ''} ${Number(k.usos) === 1 ? 'vez' : 'vezes'}</small></div>
      <label class="liga" style="border:0;min-height:0;padding:0"><span class="sr">Ativo</span><input type="checkbox" data-cup-on="${t(k.id)}" ${k.ativo === false ? '' : 'checked'}></label>
      <button type="button" class="bt-ico" data-acao="cupom-ed" data-id="${t(k.id)}" aria-label="Editar ${t(k.codigo)}">${ico('ajustes')}</button></li>`).join('') || '<li class="mudo">Nenhum cupom. Crie um para divulgar no Instagram ou no status do WhatsApp (ex.: PRIMEIRA10).</li>'}</ul></div>`;
  },
  montar(el) { $$('[data-cup-on]', el).forEach((i) => { i.onchange = () => { const k = (lojaCfg().cupons || []).find((x) => x.id === i.dataset.cupOn); if (k) { k.ativo = i.checked; grava(); toast(i.checked ? `${k.codigo} ligado` : `${k.codigo} desligado`); } }; }); },
};
acao('cupom-ed', (b) => {
  const l = Array.isArray(lojaCfg().cupons) ? lojaCfg().cupons : [], k = b.dataset.id ? l.find((x) => x.id === b.dataset.id) : null;
  let tipo = k?.tipo || 'pct';
  folha({ titulo: k ? `Cupom ${k.codigo}` : 'Novo cupom', corpo: `<label class="campo"><span>Código (o cliente digita)</span><input data-cod maxlength="20" value="${t(k?.codigo || '')}" placeholder="Ex.: PRIMEIRA10" autocomplete="off" style="text-transform:uppercase"></label>
    <div class="chips quebra" role="group" aria-label="Tipo">${TIPOS_CUPOM.map(([x, n]) => `<button type="button" class="chip" data-tp="${x}" aria-pressed="${tipo === x}">${n}</button>`).join('')}</div>
    <div class="grade2" style="margin-top:12px"><label class="campo" data-val-l ${tipo === 'frete' ? 'hidden' : ''}><span data-val-n>${tipo === 'pct' ? 'Quantos %' : 'Quantos R$'}</span><input data-val inputmode="decimal" value="${k?.valor ? vir(k.valor) : ''}" placeholder="10"></label>
      <label class="campo"><span>Pedido mínimo (R$, opcional)</span><input data-min inputmode="decimal" value="${Number(k?.minimo) ? vir(k.minimo) : ''}" placeholder="0,00"></label></div>
    <div class="grade2"><label class="campo"><span>Vale até (opcional)</span><input type="date" data-ate value="${t(k?.validade || '')}"></label>
      <label class="campo"><span>Quantas vezes pode usar (opcional)</span><input data-lim inputmode="numeric" value="${Number(k?.limite) || ''}" placeholder="Sem limite"></label></div>
    ${k ? '<button type="button" class="bt perigo" data-apagar>Apagar cupom</button>' : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-tp]', f).forEach((x) => { x.onclick = () => { tipo = x.dataset.tp; $$('[data-tp]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); $('[data-val-l]', f).hidden = tipo === 'frete'; $('[data-val-n]', f).textContent = tipo === 'pct' ? 'Quantos %' : 'Quantos R$'; }; });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (!(await confirma(`Apagar o cupom ${k.codigo}?`, 'Apagar', true))) return; setLoja({ cupons: l.filter((x) => x !== k) }); fechar(); toast('Cupom apagado'); });
    $('[data-ok]', f).onclick = () => {
      const codigo = $('[data-cod]', f).value.trim().toUpperCase().replace(/\s+/g, ''), valor = r2(num($('[data-val]', f).value));
      if (codigo.length < 3) return toast('O código precisa de pelo menos 3 letras ou números');
      if (l.some((x) => x !== k && String(x.codigo).toUpperCase() === codigo)) return toast('Já existe um cupom com este código');
      if (tipo !== 'frete' && !(valor > 0)) return toast('Escreva o valor do desconto');
      if (tipo === 'pct' && valor > 100) return toast('O desconto vai até 100%');
      const d = { codigo, tipo, valor: tipo === 'frete' ? 0 : valor, minimo: r2(num($('[data-min]', f).value)), validade: $('[data-ate]', f).value || '', limite: Math.max(0, Math.round(num($('[data-lim]', f).value))) };
      if (k) Object.assign(k, d); else l.push({ id: uid('cp'), ativo: true, usos: 0, criado: Date.now(), ...d });
      setLoja({ cupons: l }); fechar(); toast('Cupom salvo');
    };
  } });
});

// ------------------------------------------------------------------ mesas e QR
const nMesas = () => Math.max(1, Math.min(200, Number(db.config.mesas) || 10));
function htmlQRs() {
  return `<div class="tk a4" style="max-width:none"><div class="qr-folha">${Array.from({ length: nMesas() }, (_, k) => k + 1).map((m) => `<div>${qrSVG(linkCardapio(`mesa=${m}`), 160, '#000')}<b>Mesa ${m}</b><small>Aponte a câmera para ver o cardápio, pedir e chamar o garçom</small><small>${t(db.config.nome || '')}</small></div>`).join('')}</div></div>`;
}
G.mesas = {
  titulo: 'Mesas e QR',
  html() {
    const link = linkCardapio('delivery=1');
    return volta('Mesas e QR', 'Cada mesa tem o seu QR: o cliente vê o cardápio, pede, chama o garçom e pede a conta') + `
    <div class="duas"><div class="cartao"><h2>Quantas mesas</h2><div class="grade2"><label class="campo"><span>Número de mesas</span><input data-n inputmode="numeric" value="${nMesas()}"></label></div>
      <button type="button" class="bt cheio" data-salvar-n>${ico('check')}Salvar</button>
      <div class="linha-bts" style="margin-top:14px"><button type="button" class="bt grande" data-imp-qr>${ico('impressora')}Imprimir os QR das mesas (A4)</button></div>
      <p class="mudo" style="margin-top:8px">Imprima, recorte e cole em cada mesa. Funciona em qualquer celular, sem baixar aplicativo.</p></div>
    <div class="cartao"><h2>Link do delivery</h2><p class="mudo">Ponha na bio do Instagram, no status do WhatsApp e mande para os clientes.</p>
      <div class="qr-mesa" style="margin:12px 0">${qrSVG(link, 150)}<small style="word-break:break-all">${t(link)}</small></div>
      <div class="linha-bts"><button type="button" class="bt cheio" data-acao="link-delivery">${ico('link')}Meu link de delivery</button><button type="button" class="bt" data-copiar>${ico('link')}Copiar link</button><a class="bt" target="_blank" rel="noopener" href="${t(link)}">Abrir o cardápio</a></div></div></div>
    <div class="sec"><h2>QR das mesas</h2></div><div class="qrs">${Array.from({ length: Math.min(nMesas(), 30) }, (_, k) => k + 1).map((m) => `<div class="qr-mesa">${qrSVG(linkCardapio(`mesa=${m}`), 150)}<b>Mesa ${m}</b></div>`).join('')}</div>`;
  },
  montar(el) {
    $('[data-salvar-n]', el).onclick = () => { const n = Math.round(num($('[data-n]', el).value)); if (!(n >= 1 && n <= 200)) return toast('De 1 a 200 mesas'); db.config.mesas = n; grava(); toast('Salvo'); };
    $('[data-imp-qr]', el).onclick = () => imprimir(htmlQRs(), 'a4');
    $('[data-copiar]', el).onclick = () => { navigator.clipboard?.writeText(linkCardapio('delivery=1')).then(() => toast('Link copiado'), () => toast('Não deu para copiar')); };
  },
};

// ------------------------------------------------------------------ equipe (funcionários, PIN, permissões, ponto, escala e fechamento): equipe.js
G.equipe = telaEquipe;

// ------------------------------------------------------------------ minha conta e o plano com a sua marca
// 19/11/2026: o plano "com a sua marca" saiu da venda (o Popina tem um plano só). Quem já tem continua com tudo funcionando;
// para quem não tem, o cartão nem aparece (nada de oferta nem de prévia na demonstração).
export function planoMarca() {
  const m = window.popinaPlano === 'marca';
  if (!m) return '';
  return `<div class="cartao"><h2>Popina com a sua marca</h2>
    ${m ? '<p class="aviso ok">Ativo: o topo do sistema e o cardápio mostram só o seu logo e o seu nome.</p>' : '<p>Por R$ 129/mês (ou R$ 1.238/ano), o nome Popina sai do topo do sistema e do cardápio do cliente: aparecem só o seu logo e o seu nome, e o link do cardápio fica sem o nome do sistema.</p>'}
    <div class="linha-bts" style="margin-top:12px">${CONTA ? (m ? '' : '<a class="bt cheio" target="_top" href="/popina.html#precos">Ver o plano</a>') : `<button type="button" class="bt ${m ? '' : 'cheio'}" data-prever-marca>${m ? 'Voltar ao plano normal' : 'Ver como fica na demonstração'}</button>`}</div></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-conta]'); if (!b) return;
  const f = window.veltriaAbrir?.[b.dataset.conta];
  if (CONTA && f) return f();
  if (['convidar', 'equipe'].includes(b.dataset.conta)) return ir('mais/equipe');
  toast('Na demonstração isto fica desligado. Na sua conta, abre aqui mesmo.');
});

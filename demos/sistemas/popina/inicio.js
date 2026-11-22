// Popina · primeiro uso guiado em 3 passos: pratos, mesas e equipe. Abre sozinho na conta nova (sem pratos);
// depois fica em Gestão › Primeiros passos. O que foi feito fica em db.config.inicio.
import { db, t, din, r2, num, uid, grava, CONTA, linkCardapio } from './loja.js?v=55';
import { ir } from './nucleo.js?v=55';
import { ico, toast, $ } from './ui.js?v=55';
import { G, volta } from './gestao.js?v=55';
import { cardapioExemplo } from './dados.js?v=55';
import { imprimir } from './imprimir.js?v=55';
import { qrSVG } from '../base/qr.js';

const ini = () => (db.config.inicio ||= {});
export const precisaInicio = () => !db.produtos.length && !ini().feito;
G.inicio = {
  titulo: 'Primeiros passos',
  html() {
    const I = ini(), p1 = db.produtos.length > 0, p2 = !!I.mesas, p3 = !!I.equipe || (db.config.garcons || []).length > 0;
    const passo = (n, feito, tit, txt, corpo) => `<div class="passo ${feito ? 'feito' : ''}"><span class="nump">${feito ? ico('check') : n}</span><div class="tx"><b>${tit}</b><p>${txt}</p>${corpo}</div></div>`;
    return volta('Primeiros passos', 'Três passos e o restaurante já pode usar') + `<div class="passos">
    ${passo(1, p1, 'Pratos', p1 ? `${db.produtos.length} itens no cardápio. Dá para mudar tudo em Gestão › Cardápio.` : 'Cadastre o que você vende. Comece com 3 ou 4 itens; o resto pode vir depois.',
      `<div class="grade3"><label class="campo"><span>Nome</span><input data-pn placeholder="Ex.: X-Salada" maxlength="60"></label><label class="campo"><span>Preço</span><input data-pp inputmode="decimal" placeholder="0,00"></label>
       <label class="campo"><span>Categoria</span><select data-pc>${db.categorias.map((k) => `<option value="${t(k.id)}">${t(k.nome)}</option>`).join('')}</select></label></div>
       <div class="linha-bts"><button type="button" class="bt cheio" data-por>${ico('mais2')}Pôr no cardápio</button>${p1 ? '' : `<button type="button" class="bt" data-exemplo>${ico('troca')}Usar o cardápio de exemplo</button>`}<button type="button" class="bt" data-ir="mais/cardapio">Cardápio completo</button></div>
       ${p1 ? `<p class="mudo" style="margin-top:8px">Últimos: ${db.produtos.slice(-4).map((x) => `${t(x.nome)} (${din(x.preco)})`).join(', ')}</p>` : ''}`)}
    ${passo(2, p2, 'Mesas', 'Quantas mesas tem o salão? Cada uma ganha um QR para o cliente ver o cardápio, pedir e chamar o garçom.',
      `<div class="grade2"><label class="campo"><span>Número de mesas</span><input data-nm inputmode="numeric" value="${Number(db.config.mesas) || 10}"></label></div>
       <div class="linha-bts"><button type="button" class="bt cheio" data-mesas>${ico('check')}Salvar mesas</button><button type="button" class="bt" data-qr>${ico('impressora')}Imprimir os QR</button></div>`)}
    ${passo(3, p3, 'Equipe', 'Ponha o nome dos garçons e, se quiser, convide cada um com o próprio e-mail. A senha do gerente protege cancelamentos.',
      `<label class="campo"><span>Garçons (separe por vírgula)</span><input data-gs placeholder="Ex.: Rafael, Bruna" value="${t((db.config.garcons || []).join(', '))}"></label>
       <div class="linha-bts"><button type="button" class="bt cheio" data-equipe>${ico('check')}Salvar</button><button type="button" class="bt" data-conta="convidar">${ico('pessoas')}Convidar por e-mail</button><button type="button" class="bt" data-ir="mais/equipe">Senha do gerente</button></div>`)}
    </div>
    <div class="cartao" style="margin-top:18px"><h2>Seu link de delivery</h2><p class="mudo">Mande para os clientes e ponha na bio do Instagram: eles pedem pelo celular e o pedido chega em Pedidos.</p>
      <div class="linha-bts" style="margin-top:10px"><button type="button" class="bt cheio grande" data-acao="link-delivery">${ico('link')}Meu link de delivery</button></div></div>
    <div class="linha-bts" style="margin-top:18px"><button type="button" class="bt cheio grande" data-pronto>${ico('check')}${p1 && p2 && p3 ? 'Pronto, começar a usar' : 'Fazer isso depois'}</button></div>`;
  },
  montar(el) {
    $('[data-por]', el).onclick = () => { const n = $('[data-pn]', el).value.trim(), pr = r2(num($('[data-pp]', el).value)); if (!n || !(pr > 0)) return toast('Escreva o nome e o preço'); db.produtos.push({ id: uid('p'), cat: $('[data-pc]', el).value, nome: n, desc: '', preco: pr, setor: /bebida/i.test($('[data-pc]', el).selectedOptions[0]?.text || '') ? 'bar' : 'cozinha', foto: '', ativo: true, adicionais: [], ficha: [] }); grava(); toast(`${n} no cardápio`); };
    $('[data-exemplo]', el)?.addEventListener('click', () => { cardapioExemplo().produtos.forEach((p) => db.produtos.push({ ...p, ficha: [] })); grava(); toast('Cardápio de exemplo colocado: mude nomes e preços em Gestão › Cardápio'); });
    $('[data-mesas]', el).onclick = () => { const n = Math.round(num($('[data-nm]', el).value)); if (!(n >= 1 && n <= 200)) return toast('De 1 a 200 mesas'); db.config.mesas = n; ini().mesas = true; grava(); toast('Mesas salvas'); };
    $('[data-qr]', el).onclick = () => imprimir(`<div class="tk a4" style="max-width:none"><div class="qr-folha">${Array.from({ length: Math.max(1, Number(db.config.mesas) || 10) }, (_, k) => k + 1).map((m) => `<div>${qrSVG(linkCardapio(`mesa=${m}`), 160, '#000')}<b>Mesa ${m}</b><small>Aponte a câmera para ver o cardápio</small></div>`).join('')}</div></div>`, 'a4');
    $('[data-equipe]', el).onclick = () => { db.config.garcons = $('[data-gs]', el).value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30); ini().equipe = true; grava(); toast('Equipe salva'); };
    $('[data-pronto]', el).onclick = () => { ini().feito = true; grava(); ir('salao'); };
  },
};
// conta nova sem nada: abre os primeiros passos uma vez
export function talvezAbrirInicio() { if (precisaInicio() && (!location.hash || location.hash === '#salao')) ir('mais/inicio'); }
export { CONTA };

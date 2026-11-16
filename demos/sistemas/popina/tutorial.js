// Popina · tutorial guiado: um passeio curto na primeira entrada (o menu de cima, tela por tela) e o tutorial completo,
// aberto em Minha conta, que vai em cada tela e mostra onde tocar. Destaca o elemento com um recorte e explica num cartão.
import { lojaCfg } from './loja.js?v=30';
import { ir, papel } from './nucleo.js?v=30';

const ler = (k) => { try { return localStorage.getItem(k); } catch { return '1'; } };
const gravar = (k) => { try { localStorage.setItem(k, '1'); } catch { /* sem acesso: só não lembra */ } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const aba = (h) => `#nav [data-aba="${h}"]`;

// [rota (opcional), seletor do que destacar (opcional), título, texto]
export const CURTO = [
  [null, null, 'Bem-vindo ao Popina', 'Em 1 minuto você conhece o sistema. Toque em <b>Próximo</b> para ver cada parte, ou em <b>Pular</b> se já conhece.'],
  [null, aba('salao'), 'Salão', 'As mesas do restaurante. Toque numa mesa livre para abrir e anotar o pedido.'],
  [null, aba('pedidos'), 'Pedidos', 'Balcão, delivery e os pedidos que chegam pelo cardápio online. Arraste o pedido para mudar a etapa.'],
  [null, aba('cozinha'), 'Cozinha', 'O que a cozinha e o bar precisam preparar, na ordem em que chegou. Deixe aberta num tablet ou TV.'],
  [null, aba('caixa'), 'Caixa', 'Cobrar as contas, dividir, receber em Pix, cartão ou dinheiro e fechar o caixa no fim do dia.'],
  [null, aba('mais'), 'Gestão', 'Cardápio, preços, mesas e QR, equipe, relatórios e a sua marca. Tem uma busca: escreva o que procura.'],
  [null, '.topo-perfil', 'Sua conta', 'Aqui fica <b>Minha conta</b>, com o <b>tutorial completo</b> sempre que quiser rever. Bom trabalho!'],
];

export const COMPLETO = [
  [null, null, 'Tutorial completo', 'Vamos passar por cada tela do sistema e mostrar onde tocar. Você pode sair a qualquer hora em <b>Sair do tutorial</b>.'],
  ['salao', '.fila, .salao-esq', 'O que fazer agora', 'Tudo o que precisa de você aparece aqui: prato pronto para levar, mesa chamando, conta pedida e pedido do QR. Faça e toque no botão ao lado.'],
  ['salao', '.mesa', 'As mesas', 'Cada quadrado é uma mesa. A cor diz como ela está (ocupada, prato pronto, conta, chamou ou livre) e o número embaixo é o tempo aberta.'],
  ['salao', '.mesa', 'Abrir uma mesa e anotar', 'Toque numa mesa livre, diga quantas pessoas são e escolha os pratos. Os itens ficam “A enviar” até você tocar em <b>Enviar para a cozinha</b>.'],
  ['pedidos', '[data-etapa]', 'Pedidos de balcão e delivery', 'Cada coluna é uma etapa: recebido, preparando, saiu e pronto. Arraste o cartão para a próxima coluna (no celular, deslize para o lado).'],
  ['pedidos', '.pd-origem, [data-pd]', 'De onde veio', 'O cartão mostra se o pedido veio do balcão, do telefone, do WhatsApp ou <b>pelo site</b> (cardápio online). Toque nele para ver os itens e cobrar.'],
  ['cozinha', '.ticket, .kds', 'Tela da cozinha', 'Cada papel é um pedido. Toque nele para começar a preparar e, quando ficar pronto, em <b>Tudo pronto</b>: o garçom é avisado na hora.'],
  ['cozinha', '.seg-coz', 'Cozinha e bar', 'Troque entre cozinha e bar: cada um vê só o que é dele. As abas de cima separam por estação (chapa, forno, fritura...).'],
  ['caixa', '[data-acao="abrir-caixa"], [data-acao="fechar-caixa"], .conta-linha', 'Caixa', 'Abra o caixa com o troco do dia. Toque numa conta para cobrar, dividir ou dar desconto. No fim do dia, <b>Fechar caixa</b> confere a gaveta.'],
  ['mais', '.gestao-nav', 'Menu da Gestão', 'Todas as configurações ficam neste menu, separadas por assunto. Ele tem rolagem própria.'],
  ['mais', '[data-busca-g]', 'Busca', 'Não achou? Escreva aqui o que procura, como “pix”, “preço”, “garçom” ou “logo”.'],
  ['mais/conta', '[data-marca]', 'Sua marca', 'Envie o logo e confira o nome do restaurante. O logo aparece no cardápio do cliente (e no topo do sistema no plano com a sua marca).'],
  ['mais/cardapio', null, 'Cardápio', 'Cadastre os pratos com foto, preço, tamanhos e complementos. Dá para mudar preço direto na lista e reajustar vários de uma vez.'],
  ['mais/mesas', null, 'Mesas e QR', 'Defina as áreas e o número de mesas e imprima o QR de cada uma: o cliente aponta a câmera e pede pelo celular.'],
  ['mais/equipe', null, 'Equipe', 'Convide garçons, cozinha e caixa. Cada um entra com o próprio login e já abre na tela certa.'],
  ['mais/relatorios', null, 'Relatórios', 'Vendas do dia e do mês, o que mais vende, os horários de movimento e a comissão de cada garçom.'],
  ['mais/conta', null, 'Pronto', 'Agora você conhece o sistema todo. Este tutorial fica aqui em <b>Minha conta</b> para quando quiser rever.'],
];

function visivel(sel) {
  if (!sel) return null;
  return [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden'; }) || null;
}

let ativo = false;
export async function tutorial(passos, aoFim) {
  if (ativo) return; ativo = true;
  const fundo = document.createElement('div'); fundo.className = 'tut-fundo';
  fundo.innerHTML = '<div class="tut-recorte"></div><div class="tut-cartao" role="dialog" aria-live="polite"><small></small><b></b><p></p><div class="tut-bts"><button type="button" class="tut-pular">Pular</button><button type="button" class="tut-volta">Voltar</button><button type="button" class="tut-prox">Próximo</button></div></div>';
  document.body.append(fundo);
  const rec = fundo.querySelector('.tut-recorte'), car = fundo.querySelector('.tut-cartao');
  let i = 0, alvo = null;
  const posicionar = () => {
    const cel = innerWidth < 700;
    if (!alvo) { rec.style.cssText = 'left:50%;top:50%;width:0;height:0'; car.style.cssText = cel ? 'left:12px;right:12px;bottom:16px' : 'left:50%;top:50%;transform:translate(-50%,-50%)'; return; }
    const r = alvo.getBoundingClientRect(), m = 6;
    const h = Math.min(r.height, innerHeight * 0.6);
    rec.style.cssText = `left:${r.left - m}px;top:${r.top - m}px;width:${r.width + m * 2}px;height:${h + m * 2}px`;
    if (cel) { const embaixo = r.top < innerHeight / 2; car.style.cssText = embaixo ? 'left:12px;right:12px;bottom:16px' : 'left:12px;right:12px;top:16px'; return; }
    const W = 360, x = Math.min(Math.max(12, r.left + r.width / 2 - W / 2), innerWidth - W - 12);
    const abaixo = r.top + h + m + 14, cabe = abaixo + 190 < innerHeight;
    car.style.cssText = `width:${W}px;left:${x}px;${cabe ? `top:${abaixo}px` : `top:${Math.max(12, r.top - m - 204)}px`}`;
  };
  const mostrar = async () => {
    const [rota, sel, tit, txt] = passos[i];
    car.classList.add('troca');
    if (rota && decodeURIComponent(location.hash.slice(1)) !== rota) { ir(rota); await espera(450); }
    alvo = visivel(sel);
    if (alvo) { alvo.scrollIntoView({ block: 'center', behavior: 'instant' }); await espera(60); }
    car.querySelector('small').textContent = `${i + 1} de ${passos.length}`;
    car.querySelector('b').textContent = tit; car.querySelector('p').innerHTML = txt;
    car.querySelector('.tut-volta').hidden = i === 0;
    car.querySelector('.tut-prox').textContent = i === passos.length - 1 ? 'Concluir' : 'Próximo';
    fundo.classList.toggle('sem-alvo', !alvo);
    posicionar(); car.classList.remove('troca'); car.querySelector('.tut-prox').focus({ preventScroll: true });
  };
  const fim = () => { fundo.remove(); removeEventListener('resize', posicionar); removeEventListener('keydown', tecla); ativo = false; aoFim?.(); };
  const tecla = (e) => { if (e.key === 'Escape') fim(); if (e.key === 'ArrowRight') car.querySelector('.tut-prox').click(); };
  addEventListener('resize', posicionar); addEventListener('keydown', tecla);
  car.querySelector('.tut-pular').onclick = fim;
  car.querySelector('.tut-volta').onclick = () => { if (i > 0) { i -= 1; mostrar(); } };
  car.querySelector('.tut-prox').onclick = () => { if (i < passos.length - 1) { i += 1; mostrar(); } else fim(); };
  if (passos === COMPLETO) car.querySelector('.tut-pular').textContent = 'Sair do tutorial';
  await mostrar();
}

// Minha conta: botão do tutorial completo
document.addEventListener('click', (e) => { if (e.target.closest('[data-tutorial]')) { e.preventDefault(); tutorial(COMPLETO); } });

// primeira entrada: depois de escolher o template e o papel do aparelho, sem nada aberto por cima; testes automáticos não veem
const forcado = new URLSearchParams(location.search).has('tutorial');
const podeCurto = () => (forcado || !navigator.webdriver) && !ler('popina-tutorial') && lojaCfg().escolhido && papel()
  && !document.querySelector('.esc, .folha-fundo, .tut-fundo');
const vigia = setInterval(() => {
  if (ler('popina-tutorial')) { clearInterval(vigia); return; }
  if (podeCurto()) { clearInterval(vigia); gravar('popina-tutorial'); tutorial(CURTO); }
}, 1200);

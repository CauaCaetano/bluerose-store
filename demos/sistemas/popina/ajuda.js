// Popina · ajuda para quem usa pela primeira vez: dica curta em cada tela (some no "Entendi"), primeiros passos do dono
// com checklist, busca no menu da Gestão e aviso de itens que ficaram sem enviar para a cozinha.
// Nada aqui cobre a tela: tudo entra no fluxo da página, com as cores e letras do template (classes .bt, .mudo, .busca).
import { db, ouvir, lojaCfg, comandaDaMesa, cartaoAberto } from './loja.js?v=31';
import { DEPOIS, papel } from './nucleo.js?v=31';
import { ico, toast, $, $$ } from './ui.js?v=31';

const ler = (k, pad) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? pad; } catch { return pad; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem acesso: a ajuda só não fica guardada */ } };
const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ------------------------------------------------------------------ dicas da primeira vez
const DICAS = {
  salao: ['Salão', 'Toque numa <b>mesa livre</b> para abrir. Em <b>“O que fazer agora”</b> aparece o que precisa de você (prato pronto, mesa chamando, conta): faça e toque no botão ao lado.'],
  'mesa-livre': ['Abrir a mesa', 'Escolha quem atende e toque em <b>quantas pessoas</b> estão na mesa. Ela abre na hora e o cardápio já aparece.'],
  mesa: ['Comanda da mesa', 'Toque em <b>“+ Adicionar”</b> e escolha os pratos (dá para escrever uma observação, como “sem cebola”). Os itens ficam <b>“A enviar”</b> até você tocar em <b>“Enviar para a cozinha”</b>.'],
  cozinha: ['Cozinha', 'Cada papel é um pedido, na ordem em que chegou. <b>Toque no papel</b> para começar a preparar e, quando ficar pronto, toque de novo em <b>“Tudo pronto”</b>: o garçom é avisado na hora.'],
  caixa: ['Caixa', 'Toque numa <b>conta</b> para cobrar: lá você divide, dá desconto e recebe em dinheiro, Pix ou cartão. No fim do dia, toque em <b>“Fechar caixa”</b> e conte a gaveta.'],
  pedidos: ['Pedidos', 'Aqui ficam os pedidos de <b>balcão e delivery</b>. Toque em um para ver os itens, mudar a etapa ou cobrar.'],
  mais: ['Gestão', 'Aqui ficam os números do dia e todas as configurações. Não achou algo? Use a <b>busca</b> e escreva o que procura, como “pix”, “preço” ou “garçom”.'],
};
const vistas = () => ler('popina-dicas', {});
function chaveDica(el, nome, args) {
  if (nome === 'mesa' || nome === 'cartao') return $('[data-acao="abrir-mesa"]', el) ? 'mesa-livre' : $('[data-acao="cardapio-pick"]', el) ? 'mesa' : '';
  if (nome === 'mais') return args[0] ? '' : 'mais';
  return DICAS[nome] ? nome : '';
}
function dica(el, nome, args) {
  const k = chaveDica(el, nome, args); if (!k || vistas()[k]) return;
  const [tit, txt] = DICAS[k];
  const a = document.createElement('aside'); a.className = 'dica-1a'; a.setAttribute('role', 'note');
  a.innerHTML = `<span class="dica-ico">${ico('alerta')}</span><div><b>${tit}: como usar</b><p>${txt}</p></div><button type="button" class="bt" data-entendi>Entendi</button>`;
  $('[data-entendi]', a).onclick = () => { gravar('popina-dicas', { ...vistas(), [k]: 1 }); a.remove(); };
  const cab = $('.gestao-corpo > .cab-gestao', el);
  if (cab) cab.after(a); else el.prepend(a);
}

// ------------------------------------------------------------------ primeiros passos do dono
const guia = () => ler('popina-guia', { feitos: {} });
const marcarPasso = (k) => { const g = guia(); if (g.feitos[k]) return; g.feitos[k] = Date.now(); gravar('popina-guia', g); };
const assinaturaCardapio = () => db.produtos.map((p) => `${p.id}:${p.nome}:${p.preco}:${p.ativo ? 1 : 0}`).join('|');
// cardápio: conta como feito quando o dono cadastra ou muda um prato (comparado com o cardápio de quando a ajuda começou)
(() => { const g = guia(); if (!g.base) { g.base = assinaturaCardapio(); gravar('popina-guia', g); } })();
ouvir(() => { const g = guia(); if (!g.feitos.prato && g.base && g.base !== assinaturaCardapio()) marcarPasso('prato'); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-acao="enviar"], [data-enviar-ja], [data-acao="liberar-etapa"]')) marcarPasso('pedido'); }, true);

const PASSOS = [
  ['tipo', 'Escolher o tipo e o visual do restaurante', '#mais/aparencia', () => !!lojaCfg().escolhido],
  ['logo', 'Pôr o logo e o nome do restaurante', '#mais/conta', () => !!lojaCfg().logo],
  ['loja', 'Conferir nome, telefone e horários', '#mais/loja'],
  ['prato', 'Cadastrar ou ajustar um prato do cardápio', '#mais/cardapio'],
  ['mesas', 'Conferir as mesas e imprimir os QR', '#mais/mesas'],
  ['equipe', 'Chamar a equipe (garçons, cozinha e caixa)', '#mais/equipe'],
  ['caixa', 'Abrir o caixa com o troco do dia', '#caixa', () => !!db.caixa],
  ['pedido', 'Fazer um pedido de teste numa mesa', '#salao'],
];
function primeirosPassos(el) {
  const g = guia(); if (g.oculto) return;
  const feito = (p) => !!g.feitos[p[0]] || !!p[3]?.();
  const n = PASSOS.filter(feito).length; if (n === PASSOS.length) return;
  const s = document.createElement('section'); s.className = 'guia-passos bloco';
  s.innerHTML = `<div class="sec-tit"><h2>Primeiros passos</h2><span>${n} de ${PASSOS.length} feitos</span></div>
    <p class="mudo">O que deixar pronto para começar a usar o sistema. Toque em cada um; ele fica marcado sozinho.</p>
    <span class="guia-barra" aria-hidden="true"><i style="width:${Math.round((n / PASSOS.length) * 100)}%"></i></span>
    <ol>${PASSOS.map((p) => `<li class="${feito(p) ? 'feito' : ''}"><a href="${p[2]}"><span class="guia-marca">${feito(p) ? ico('check') : ''}</span><span>${p[1]}</span>${feito(p) ? '' : ico('dir')}</a></li>`).join('')}</ol>
    <button type="button" class="link" data-esconder>Esconder os primeiros passos</button>`;
  $('[data-esconder]', s).onclick = () => { gravar('popina-guia', { ...guia(), oculto: 1 }); s.remove(); toast('Primeiros passos escondidos'); };
  const ref = $('.gestao-corpo > .busca-cel', el) || $('.gestao-corpo > .dica-1a', el) || $('.gestao-corpo > .cab-gestao', el);
  if (ref) ref.after(s); else $('.gestao-corpo', el)?.prepend(s);
}

// ------------------------------------------------------------------ busca no menu da Gestão
// palavras que as pessoas usam e que não estão no nome da função
const PALAVRAS = {
  aparencia: 'cor visual tema template tipo estilo', loja: 'endereco telefone whatsapp horario entrega taxa link site online', mesas: 'qr codigo area varanda imprimir mesa',
  ajustes: 'pix chave servico 10% garcom comissao balanca pin senha gerente alerta regra caixa', cardapio: 'prato preco foto produto item esgotado tamanho complemento adicional bebida',
  estoque: 'ingrediente insumo acabou repor minimo falta', relatorios: 'vendas relatorio mais vendidos horario faturamento cancelamento desconto ticket',
  clientes: 'cliente delivery telefone', entregadores: 'motoboy entrega acerto', cupons: 'desconto promocao cupom', funcoes: 'rodizio pizza happy hour turno fidelidade regra',
  reservas: 'reserva fila espera', equipe: 'garcom funcionario convite cargo permissao usuario cozinheiro', conta: 'assinatura plano sair senha perfil pagamento logo marca nome capa foto tutorial ajuda',
  aparelho: 'celular tablet computador papel cozinha caixa garcom', fornecedores: 'fornecedor distribuidora', compras: 'nota compra boleto receber mercadoria chegou',
  contas: 'boleto conta pagar receber vencimento aluguel luz agua despesa', fiado: 'pendura fiado deve', conciliacao: 'maquininha banco cartao bater conferir conciliacao',
  fluxo: 'dinheiro entrada saida', dre: 'lucro prejuizo resultado dre', margens: 'lucro margem custo', preparos: 'receita molho massa', producao: 'pre-preparo',
  lotes: 'validade vencimento vence', sugestao: 'pedido compra quanto comprar', aproveitamento: 'limpeza perda fator', rendimento: 'perda rendeu',
  rastreio: 'lote origem', pendencias: 'avisos urgente', metas: 'meta objetivo cmv', consumo: 'cortesia refeicao funcionario', gorjetas: 'gorjeta 10% servico', manutencao: 'equipamento forno conserto',
};
let termo = '';
const idDe = (a) => (a.getAttribute('href') || '').replace(/^#(mais\/)?/, '').split('/')[0];
const casa = (a, q) => !q || q.split(/\s+/).every((w) => sem(`${a.textContent} ${PALAVRAS[idDe(a)] || ''}`).includes(w));
const campoBusca = (cls) => `<label class="busca busca-gestao ${cls}">${ico('busca')}<input type="search" data-busca-g placeholder="Buscar função: pix, preço, garçom…" aria-label="Buscar uma função da Gestão" value="${termo.replace(/"/g, '&quot;')}"></label>`;
// no computador: filtra o menu da esquerda ali mesmo
function filtraLateral(nav) {
  const q = sem(termo).trim(); let algum = false;
  $$('.mg-grupo', nav).forEach((g) => { let n = 0; $$('a', g).forEach((a) => { const ok = casa(a, q); a.style.display = ok ? '' : 'none'; n += ok; }); g.style.display = n ? '' : 'none'; algum ||= !!n; });
  let v = $('.busca-nada', nav); if (!v) { v = document.createElement('p'); v.className = 'busca-nada mudo'; nav.append(v); }
  v.textContent = algum ? '' : 'Nada com esse nome. Tente outra palavra, como “estoque” ou “caixa”.'; v.style.display = algum ? 'none' : '';
}
// no celular: os resultados aparecem logo abaixo da busca (o menu completo fica lá embaixo)
function resultadosCel(el, box) {
  const q = sem(termo).trim(); if (!q) { box.innerHTML = ''; return; }
  const l = $$('.menu-mais a', el).filter((a) => casa(a, q));
  box.innerHTML = l.length ? `<nav class="menu-mais busca-res">${l.map((a) => a.outerHTML).join('')}</nav>` : '<p class="mudo busca-nada">Nada com esse nome. Tente outra palavra, como “estoque” ou “caixa”.</p>';
}
function buscaGestao(el, sec) {
  const nav = $('.gestao-nav', el);
  if (nav) {
    nav.insertAdjacentHTML('afterbegin', campoBusca('busca-lat'));
    const i = $('[data-busca-g]', nav); i.oninput = () => { termo = i.value; filtraLateral(nav); }; if (termo) filtraLateral(nav);
  }
  const corpo = $('.gestao-corpo', el);
  if (!sec && corpo && $('.menu-mais', corpo)) {
    const cab = $('.cab-gestao', corpo), w = document.createElement('div'); w.className = 'busca-cel';
    w.innerHTML = `${campoBusca('')}<div data-res></div>`; if (cab) cab.after(w); else corpo.prepend(w);
    const i = $('[data-busca-g]', w), box = $('[data-res]', w); i.oninput = () => { termo = i.value; resultadosCel(el, box); }; resultadosCel(el, box);
  }
}

// ------------------------------------------------------------------ itens esquecidos sem enviar
let antes = location.hash;
addEventListener('hashchange', () => {
  const m = /^#(mesa|cartao)\/(\d+)/.exec(antes); antes = location.hash;
  if (!m || location.hash.startsWith(`#${m[1]}/${m[2]}`)) return;
  const c = m[1] === 'mesa' ? comandaDaMesa(Number(m[2])) : cartaoAberto(m[2]); if (!c) return;
  const n = c.itens.filter((i) => i.status === 'rascunho' && !i.segura).reduce((s, i) => s + i.qtd, 0);
  if (n) toast(`${m[1] === 'mesa' ? 'Mesa' : 'Cartão'} ${m[2]}: ${n} ${n === 1 ? 'item ainda não foi' : 'itens ainda não foram'} para a cozinha. Volte e toque em “Enviar para a cozinha”.`);
});

DEPOIS.push((el, nome, args) => {
  if (nome === 'mais') {
    if (['loja', 'mesas', 'equipe'].includes(args[0])) marcarPasso(args[0]);
    buscaGestao(el, args[0]);
    if (!args[0] && (!papel() || papel() === 'dono')) primeirosPassos(el);
  }
  dica(el, nome, args);
});

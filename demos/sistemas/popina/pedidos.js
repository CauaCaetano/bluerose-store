// Popina · pedidos de balcão, retirada e entrega numa lista só, e o novo pedido (nome ou número do cliente, endereço,
// taxa por bairro e troco). Os pedidos do cardápio online caem aqui sozinhos.
import { db, t, din, tempo, conta, novoPedido, itensValidos, ondeComanda, tipoNome, quemPediu, clientePorTel, soDig, num, vir, hora, lojaCfg } from './loja.js?v=40';
import { registrar, ir } from './nucleo.js?v=40';
import { ico, folha, toast, $, $$ } from './ui.js?v=40';

let filtro = '';
const FILTROS = [['', 'Todos'], ['balcao', 'Balcão'], ['retirada', 'Retirada'], ['delivery', 'Entrega']];
const tipoDe = (c) => (c.tipo === 'delivery' ? 'delivery' : c.modo === 'retirada' ? 'retirada' : c.tipo === 'balcao' ? 'balcao' : 'outro');
export function situacao(c) {
  const it = itensValidos(c);
  if (c.tipo === 'delivery' && c.entrega === 'saiu') return ['Saiu para entrega', 'saiu'];
  if (!it.length) return ['Sem itens', ''];
  if (it.every((i) => i.status === 'rascunho')) return ['Falta mandar', 'novo'];
  if (it.every((i) => ['pronto', 'entregue', 'rascunho'].includes(i.status)) && it.some((i) => i.status === 'pronto')) return ['Pronto', 'pronto'];
  if (it.every((i) => i.status === 'entregue')) return [c.tipo === 'delivery' ? 'Pronto para sair' : 'Entregue', 'livre'];
  if (it.some((i) => i.status === 'preparo')) return ['Preparando', 'prep'];
  return ['Na cozinha', 'novo'];
}
registrar('pedidos', {
  titulo: 'Pedidos',
  html() {
    const todos = db.comandas.filter((c) => c.tipo !== 'mesa').sort((a, b) => a.aberta - b.aberta);
    const l = todos.filter((c) => !filtro || tipoDe(c) === filtro);
    const cont = (k) => todos.filter((c) => !k || tipoDe(c) === k).length;
    return `<div class="cab"><div><h1>Pedidos</h1><p>Balcão, retirada e entrega numa lista só</p></div>
      <div class="acoes"><button type="button" class="bt cheio grande" data-novo-ped>${ico('mais2')}Novo pedido</button></div></div>
    <div class="chips" role="group" aria-label="Filtrar">${FILTROS.map(([k, n]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${filtro === k}">${n} <b>${cont(k)}</b></button>`).join('')}</div>
    <div class="peds">${l.map((c) => { const v = conta(c), [st, cl] = situacao(c);
      return `<button type="button" class="ped ${cl === 'pronto' ? 'pronto' : ''}" data-ir="comanda/${c.id}">
        <span class="l1">${c.senha ? `<span class="senha" title="Senha">${c.senha}</span>` : ''}<b>${t(c.cliente?.nome || ondeComanda(c))}</b><span class="etq ${cl}">${st}</span></span>
        <span class="l2">${tipoNome(c)} #${c.num ?? ''} · há ${tempo(c.aberta)}${c.origem ? ` · ${t(c.origem)}` : ''}${c.tipo === 'delivery' && c.cliente?.bairro ? ` · ${t(c.cliente.bairro)}` : ''}</span>
        <span class="l3"><span>${itensValidos(c).reduce((s, i) => s + (i.kg ? 1 : i.qtd), 0)} itens${v.falta > 0.009 ? (v.pago ? ` · falta ${din(v.falta)}` : ' · a pagar') : ' · pago'}${c.trocoPara ? ` · troco p/ ${din(c.trocoPara)}` : ''}</span><span>${din(v.total)}</span></span>
      </button>`; }).join('') || `<p class="vazio">Nenhum pedido ${filtro ? 'deste tipo ' : ''}aberto agora.</p>`}</div>`;
  },
  montar(el) {
    $$('[data-f]', el).forEach((b) => { b.onclick = () => { filtro = b.dataset.f; ir('pedidos'); }; });
    $('[data-novo-ped]', el).onclick = () => novoPedidoFolha();
  },
});
// novo pedido: escolhe o tipo; no balcão basta o nome (ou nada: sai com a senha); na entrega, telefone, endereço e bairro
export function novoPedidoFolha(tipoIni = 'balcao') {
  let tipo = tipoIni;
  const bairros = db.bairros || [];
  const corpo = () => `<div class="chips quebra" role="group" aria-label="Tipo">${[['balcao', 'Balcão'], ['retirada', 'Retirada'], ['delivery', 'Entrega']].map(([k, n]) => `<button type="button" class="chip" data-t="${k}" aria-pressed="${tipo === k}">${n}</button>`).join('')}</div>
    <div style="margin-top:14px">
    ${tipo !== 'balcao' ? '<label class="campo"><span>Telefone (WhatsApp)</span><input data-tel inputmode="tel" autocomplete="off" placeholder="16 99999-9999"></label>' : ''}
    <label class="campo"><span>Nome do cliente${tipo === 'balcao' ? ' (ou deixe em branco e use a senha)' : ''}</span><input data-nome maxlength="60" autocomplete="off" placeholder="Ex.: Juliana"></label>
    ${tipo === 'delivery' ? `<label class="campo"><span>Endereço</span><input data-end maxlength="160" autocomplete="off" placeholder="Rua, número e complemento"></label>
      <label class="campo"><span>Bairro</span><select data-bairro><option value="">Escolha o bairro</option>${bairros.map((b) => `<option value="${t(b.nome)}">${t(b.nome)} · entrega ${din(b.taxa)}</option>`).join('')}<option value="__outro">Outro bairro</option></select></label>
      <div class="grade2"><label class="campo"><span>Taxa de entrega</span><input data-taxa inputmode="decimal" placeholder="0,00"></label><label class="campo"><span>Troco para (se for dinheiro)</span><input data-troco inputmode="decimal" placeholder="Ex.: 50"></label></div>
      <label class="campo"><span>Como vai pagar</span><select data-pagar><option value="">Paga agora no caixa</option>${(lojaCfg().pagamentos || []).map((f) => `<option>${t(f)}</option>`).join('')}</select></label>` : ''}
    </div>`;
  folha({ titulo: 'Novo pedido', corpo: `<div data-c>${corpo()}</div>`, pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Criar e lançar itens</button>',
    aoAbrir: (f, fechar) => {
      const ligar = () => {
        $$('[data-t]', f).forEach((b) => { b.onclick = () => { tipo = b.dataset.t; $('[data-c]', f).innerHTML = corpo(); ligar(); }; });
        const tel = $('[data-tel]', f);
        if (tel) tel.oninput = () => { const x = clientePorTel(tel.value); if (!x) return; if (!$('[data-nome]', f).value) $('[data-nome]', f).value = x.nome || ''; if ($('[data-end]', f) && !$('[data-end]', f).value) { $('[data-end]', f).value = x.end || ''; if (x.bairro && bairros.some((b) => b.nome === x.bairro)) { $('[data-bairro]', f).value = x.bairro; $('[data-taxa]', f).value = vir(bairros.find((b) => b.nome === x.bairro).taxa); } } };
        const bai = $('[data-bairro]', f); if (bai) bai.onchange = () => { const b = bairros.find((x) => x.nome === bai.value); if (b) $('[data-taxa]', f).value = vir(b.taxa); };
      };
      ligar();
      $('[data-ok]', f).onclick = () => {
        const nome = $('[data-nome]', f).value.trim(), tel = soDig($('[data-tel]', f)?.value);
        if (tipo === 'delivery' && !$('[data-end]', f).value.trim()) return toast('Escreva o endereço da entrega');
        if (tipo === 'retirada' && !nome) return toast('Escreva o nome de quem vai retirar');
        const bairro = $('[data-bairro]', f)?.value === '__outro' ? '' : $('[data-bairro]', f)?.value || '';
        const c = tipo === 'delivery'
          ? novoPedido('delivery', { nome, tel, end: $('[data-end]', f).value.trim(), bairro }, { origem: 'Telefone ou WhatsApp', taxaEntrega: num($('[data-taxa]', f).value), ...(num($('[data-troco]', f).value) > 0 ? { trocoPara: num($('[data-troco]', f).value) } : {}), ...($('[data-pagar]', f).value ? { pagarNaEntrega: $('[data-pagar]', f).value } : {}) })
          : novoPedido('balcao', { nome, ...(tel ? { tel } : {}) }, { origem: tipo === 'retirada' ? 'Telefone ou WhatsApp' : 'Balcão', ...(tipo === 'retirada' ? { modo: 'retirada' } : {}) });
        fechar(); toast(c.senha ? `Pedido criado · senha ${c.senha}` : 'Pedido criado'); ir(`lancar/${c.id}`);
      };
    } });
}
export { hora, quemPediu };

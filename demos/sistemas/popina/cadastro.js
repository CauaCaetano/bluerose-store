// Popina · cadastros da Gestão: cardápio (pratos, tamanhos, meio a meio, por quilo, complementos, foto e o que tira do estoque),
// estoque simples (o que tem, o que acaba, contagem, perdas e lista de compras), clientes com fiado e entregadores com o acerto.
import { db, t, din, r2, num, vir, uid, grava, prod, insumo, saldo, estoqueBaixo, entradaCompra, registrarPerda, ajustarEstoque, fmtQtd, MOTIVOS_PERDA,
  clientesFiado, saldoFiado, limiteFiado, nomeFiado, fone, zap, soDig, acertoEntregadores, inicioDoDia, hora, aPartir } from './loja.js?v=49';
import { acao, ir } from './nucleo.js?v=49';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=49';
import { G, volta, reduzir } from './gestao.js?v=49';
import { fotoProd } from './salao.js?v=49';
import { cardapioExemplo } from './dados.js?v=49';
import { receberFiadoFolha } from './caixa.js?v=49';
import { imprimir } from './imprimir.js?v=49';

// ------------------------------------------------------------------ cardápio
let catG = '';
G.cardapio = {
  titulo: 'Cardápio',
  html() {
    const cats = db.categorias, l = db.produtos.filter((p) => !catG || p.cat === catG);
    return volta('Cardápio', `${db.produtos.length} itens · toque para editar; o interruptor tira do cardápio quando acaba`) + `
    <div class="linha-bts" style="margin-bottom:12px"><button type="button" class="bt cheio grande" data-acao="prod-ed">${ico('mais2')}Novo prato</button><button type="button" class="bt" data-acao="cats-ed">${ico('cardapio')}Categorias</button>
      ${db.produtos.length ? '' : `<button type="button" class="bt" data-acao="usar-exemplo">${ico('troca')}Começar com o cardápio de exemplo</button>`}</div>
    <div class="chips" role="group" aria-label="Categorias"><button type="button" class="chip" data-catg="" aria-pressed="${!catG}">Todos</button>${cats.map((k) => `<button type="button" class="chip" data-catg="${t(k.id)}" aria-pressed="${catG === k.id}">${t(k.nome)}</button>`).join('')}</div>
    <div class="prods">${l.map((p) => `<div class="prod ${p.ativo === false ? 'off' : ''}">${fotoProd(p)}<div class="tx"><b>${t(p.nome)}</b><small>${t(cats.find((k) => k.id === p.cat)?.nome || 'Sem categoria')}${p.tamanhos?.length ? ` · ${p.tamanhos.length} tamanhos` : ''}${p.pizza ? ' · meio a meio' : ''}${p.porKg ? ' · por quilo' : ''}${(p.grupos || []).length ? ` · ${p.grupos.length} complementos` : ''}</small>
      <span class="preco">${p.codigo ? `<span class="cod">${t(p.codigo)}</span>` : ''}${p.porKg ? `${din(p.preco)}/kg` : din(aPartir(p))}</span>${p.ativo === false ? '<span class="etq alerta">Esgotado</span>' : ''}</div>
      <label class="liga" style="border:0;min-height:0;padding:0" title="${p.ativo === false ? 'Fora do cardápio' : 'No cardápio'}"><span class="sr">No cardápio</span><input type="checkbox" data-ativo="${t(p.id)}" ${p.ativo === false ? '' : 'checked'}></label>
      <button type="button" class="bt-ico" data-acao="prod-ed" data-id="${t(p.id)}" aria-label="Editar ${t(p.nome)}">${ico('ajustes')}</button></div>`).join('') || '<p class="vazio">Nenhum prato ainda. Toque em “Novo prato”.</p>'}</div>`;
  },
  montar(el) {
    $$('[data-catg]', el).forEach((b) => { b.onclick = () => { catG = b.dataset.catg; ir('mais/cardapio'); }; });
    $$('[data-ativo]', el).forEach((i) => { i.onchange = () => { const p = prod(i.dataset.ativo); if (p) { p.ativo = i.checked; grava(); toast(i.checked ? `${p.nome} voltou ao cardápio` : `${p.nome} saiu do cardápio (esgotado)`); } }; });
  },
};
acao('usar-exemplo', async () => {
  if (!(await confirma('Pôr o cardápio de exemplo (20 itens com fotos)? Depois é só mudar os nomes e os preços.', 'Pôr o exemplo'))) return;
  const ex = cardapioExemplo(); ex.produtos.forEach((p) => { if (!prod(p.id)) db.produtos.push({ ...p, ficha: [] }); }); grava(); toast('Cardápio de exemplo colocado');
});
acao('cats-ed', () => {
  folha({ titulo: 'Categorias', corpo: `<p class="mudo" style="margin-bottom:10px">A ordem daqui é a ordem do cardápio.</p><div data-cats>${db.categorias.map((k) => `<div style="display:flex;gap:8px;margin-bottom:8px" data-k="${t(k.id)}"><input value="${t(k.nome)}" aria-label="Nome da categoria"><button type="button" class="bt-ico" data-sobe aria-label="Subir">↑</button></div>`).join('')}</div>
    <button type="button" class="bt pq" data-nova>${ico('mais2')}Categoria</button>`,
  pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-nova]', f).onclick = () => $('[data-cats]', f).insertAdjacentHTML('beforeend', `<div style="display:flex;gap:8px;margin-bottom:8px" data-k=""><input placeholder="Ex.: Açaí" aria-label="Nome da categoria"><button type="button" class="bt-ico" data-sobe aria-label="Subir">↑</button></div>`);
    f.addEventListener('click', (e) => { const s = e.target.closest('[data-sobe]'); if (!s) return; const r = s.parentElement; if (r.previousElementSibling) r.parentElement.insertBefore(r, r.previousElementSibling); });
    $('[data-ok]', f).onclick = () => {
      const novas = $$('[data-k]', f).map((r) => { const nome = $('input', r).value.trim(); if (!nome) return null; const id = r.dataset.k || nome.normalize('NFD').replace(/[^\w]/g, '').toLowerCase().slice(0, 20) + uid('').slice(-3); return { ...(db.categorias.find((k) => k.id === r.dataset.k) || {}), id, nome }; }).filter(Boolean);
      db.categorias.splice(0, db.categorias.length, ...novas, ...db.categorias.filter((k) => !novas.some((n) => n.id === k.id) && db.produtos.some((p) => p.cat === k.id)));
      grava(); fechar(); toast('Categorias salvas');
    };
  } });
});
// editor do prato: o básico em cima; tamanhos, meio a meio, por quilo, complementos e estoque abaixo
const linhaTam = (x = {}) => `<div class="grade2" data-tam style="margin-bottom:6px"><input data-tn placeholder="Ex.: Grande" value="${t(x.nome || '')}" aria-label="Nome do tamanho"><input data-tp inputmode="decimal" placeholder="Preço" value="${x.preco != null ? vir(x.preco) : ''}" aria-label="Preço do tamanho"></div>`;
const linhaGrupo = (g = {}) => `<div class="cartao" data-grp style="padding:12px;box-shadow:none;margin-top:8px"><label class="campo"><span>Nome (ex.: Sabor, Ponto da carne, Molhos)</span><input data-gn value="${t(g.nome || '')}"></label>
  <div class="grade2"><label class="campo"><span>Mínimo (0 = opcional)</span><input data-gmin inputmode="numeric" value="${g.min ?? 0}"></label><label class="campo"><span>Máximo</span><input data-gmax inputmode="numeric" value="${g.max ?? 1}"></label></div>
  <label class="campo"><span>Opções (uma por linha; preço depois do ponto e vírgula)</span><textarea data-gop placeholder="Coca-Cola&#10;Guaraná&#10;Cheddar; 4,00">${t((g.opcoes || []).map((o) => (Number(o.preco) ? `${o.nome}; ${vir(Number(o.preco).toFixed(2))}` : o.nome)).join('\n'))}</textarea></label>
  <button type="button" class="bt pq perigo" data-tira-grp>Tirar este complemento</button></div>`;
const linhaFicha = (f = {}) => `<div class="grade2" data-fi style="margin-bottom:6px"><select data-fins aria-label="Item do estoque"><option value="">Item do estoque</option>${db.insumos.map((i) => `<option value="${t(i.id)}" ${i.id === f.insumo ? 'selected' : ''}>${t(i.nome)} (${t(i.unid)})</option>`).join('')}</select><input data-fq inputmode="decimal" placeholder="Quanto" value="${f.qtd != null ? vir(f.qtd) : ''}" aria-label="Quantidade"></div>`;
acao('prod-ed', (b) => {
  const p = b.dataset.id ? prod(b.dataset.id) : null;
  let foto = p?.foto || '';
  folha({ titulo: p ? p.nome : 'Novo prato', larga: true, corpo: `
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div class="logo-prev" data-foto-prev style="background-size:cover;${foto ? `background-image:url('${t(foto)}')` : ''}">${foto ? '' : ico('prato')}</div>
      <div class="linha-bts"><label class="bt">${ico('mais2')}${foto ? 'Trocar a foto' : 'Pôr foto'}<input type="file" accept="image/*" data-foto hidden></label>${foto ? '<button type="button" class="bt" data-tira-foto>Tirar</button>' : ''}</div></div>
    <label class="campo"><span>Nome</span><input data-n maxlength="60" value="${t(p?.nome || '')}" placeholder="Ex.: X-Salada"></label>
    <label class="campo"><span>Código (opcional)</span><input data-cod maxlength="12" value="${t(p?.codigo || '')}" placeholder="Ex.: 12" autocomplete="off"><small>Para achar rápido no balcão: digite o código e aperte Enter.</small></label>
    <div class="grade2"><label class="campo"><span>Preço (R$)</span><input data-pr inputmode="decimal" value="${p ? vir(Number(p.preco).toFixed(2)) : ''}" placeholder="0,00"></label>
      <label class="campo"><span>Categoria</span><select data-cat>${db.categorias.map((k) => `<option value="${t(k.id)}" ${k.id === (p?.cat || catG) ? 'selected' : ''}>${t(k.nome)}</option>`).join('')}</select></label></div>
    <label class="campo"><span>Descrição (opcional)</span><input data-d maxlength="140" value="${t(p?.desc || '')}" placeholder="O que vem no prato"></label>
    <p class="campo"><span>Vai para</span></p><div class="chips quebra">${[['cozinha', 'Cozinha'], ['bar', 'Bar']].map(([k, n]) => `<button type="button" class="chip" data-setor="${k}" aria-pressed="${(p?.setor || 'cozinha') === k}">${n}</button>`).join('')}</div>
    <label class="liga" style="margin-top:10px">Destaque no cardápio<input type="checkbox" data-dest ${p?.destaque ? 'checked' : ''}></label>
    <label class="liga">Pizza: aceita meio a meio<small>Cobra o sabor mais caro</small><input type="checkbox" data-pizza ${p?.pizza ? 'checked' : ''}></label>
    <label class="liga">Vendido por quilo<small>O preço acima é o do quilo; o caixa digita o peso</small><input type="checkbox" data-kg ${p?.porKg ? 'checked' : ''}></label>
    <p class="grupo-tit">Tamanhos (opcional)</p><p class="mudo">Ex.: Broto e Grande, Meia e Inteira. Com tamanhos, o preço de cima não vale.</p><div data-tams>${(p?.tamanhos || []).map(linhaTam).join('')}</div><button type="button" class="bt pq" data-mais-tam>${ico('mais2')}Tamanho</button>
    <p class="grupo-tit">Complementos (opcional)</p><p class="mudo">Escolhas do prato: sabor, ponto da carne, molhos, borda…</p><div data-grps>${(p?.grupos || []).map(linhaGrupo).join('')}</div><button type="button" class="bt pq" data-mais-grp>${ico('mais2')}Complemento</button>
    <p class="grupo-tit">Adicionais (opcional)</p><label class="campo"><span>Um por linha, com o preço depois do ponto e vírgula</span><textarea data-adic placeholder="Bacon; 5,00&#10;Ovo; 3,00">${t((p?.adicionais || []).map((a) => `${a.nome}; ${vir(Number(a.preco || 0).toFixed(2))}`).join('\n'))}</textarea></label>
    <p class="grupo-tit">Tira do estoque (opcional)</p><p class="mudo">Cada venda deste prato tira estes itens do estoque. Ex.: 1 pão e 1 hambúrguer.</p><div data-fichas>${(p?.ficha || []).map(linhaFicha).join('')}</div>${db.insumos.length ? `<button type="button" class="bt pq" data-mais-fi>${ico('mais2')}Item do estoque</button>` : '<p class="mudo">Cadastre itens em Gestão › Estoque para usar aqui.</p>'}
    ${p ? '<div style="margin-top:18px"><button type="button" class="bt perigo" data-apagar>Apagar este prato</button></div>' : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-setor]', f).forEach((x) => { x.onclick = () => $$('[data-setor]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); });
    $('[data-mais-tam]', f).onclick = () => $('[data-tams]', f).insertAdjacentHTML('beforeend', linhaTam());
    $('[data-mais-grp]', f).onclick = () => $('[data-grps]', f).insertAdjacentHTML('beforeend', linhaGrupo());
    $('[data-mais-fi]', f)?.addEventListener('click', () => $('[data-fichas]', f).insertAdjacentHTML('beforeend', linhaFicha()));
    f.addEventListener('click', (e) => { const x = e.target.closest('[data-tira-grp]'); if (x) x.closest('[data-grp]').remove(); });
    $('[data-foto]', f).onchange = async (e) => { const a = e.target.files?.[0]; if (!a) return; try { foto = await reduzir(a, 480, 480); const pv = $('[data-foto-prev]', f); pv.style.backgroundImage = `url('${foto}')`; pv.innerHTML = ''; } catch { toast('Não deu para ler esta imagem'); } };
    $('[data-tira-foto]', f)?.addEventListener('click', () => { foto = ''; const pv = $('[data-foto-prev]', f); pv.style.backgroundImage = ''; pv.innerHTML = ico('prato'); });
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (!(await confirma(`Apagar ${p.nome}? As vendas antigas continuam nos relatórios. Se só acabou, use o interruptor.`, 'Apagar', true))) return; db.produtos.splice(db.produtos.indexOf(p), 1); grava(); fechar(); toast('Prato apagado'); });
    $('[data-ok]', f).onclick = () => {
      const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome do prato');
      const tamanhos = $$('[data-tam]', f).map((r) => ({ nome: $('[data-tn]', r).value.trim(), preco: r2(num($('[data-tp]', r).value)) })).filter((x) => x.nome && x.preco > 0);
      const preco = r2(num($('[data-pr]', f).value)) || (tamanhos.length ? Math.min(...tamanhos.map((x) => x.preco)) : 0);
      if (!(preco > 0)) return toast('Escreva o preço');
      const linhas = (txt) => txt.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, pr] = l.split(';'); return { nome: n.trim().slice(0, 50), preco: r2(num(pr || 0)) }; }).filter((o) => o.nome);
      const grupos = $$('[data-grp]', f).map((g, k) => { const opcoes = linhas($('[data-gop]', g).value); const min = Math.max(0, Math.round(num($('[data-gmin]', g).value))); return { id: `g${k}`, nome: $('[data-gn]', g).value.trim(), min, max: Math.max(min || 1, Math.round(num($('[data-gmax]', g).value)) || 1), opcoes: opcoes.map((o) => (o.preco ? o : { nome: o.nome })) }; }).filter((g) => g.nome && g.opcoes.length);
      const ficha = $$('[data-fi]', f).map((r) => ({ insumo: $('[data-fins]', r).value, qtd: num($('[data-fq]', r).value) })).filter((x) => x.insumo && x.qtd > 0);
      // tamanho guarda o "fator" (quanto tira do estoque): proporcional ao preço do maior tamanho
      const maior = tamanhos.length ? Math.max(...tamanhos.map((x) => x.preco)) : 0;
      const codigo = $('[data-cod]', f).value.trim();
      if (codigo && db.produtos.some((x) => x !== p && String(x.codigo || '').toLowerCase() === codigo.toLowerCase())) return toast(`O código ${codigo} já é de outro prato`);
      const d = { nome, preco, codigo, cat: $('[data-cat]', f).value, desc: $('[data-d]', f).value.trim(), setor: $('[data-setor][aria-pressed=true]', f)?.dataset.setor || 'cozinha', foto,
        destaque: $('[data-dest]', f).checked, pizza: $('[data-pizza]', f).checked, porKg: $('[data-kg]', f).checked,
        tamanhos: tamanhos.map((x) => ({ ...x, fator: (p?.tamanhos || []).find((y) => y.nome === x.nome)?.fator ?? (maior ? Math.round((x.preco / maior) * 100) / 100 : 1) })), grupos, adicionais: linhas($('[data-adic]', f).value), ficha };
      if (!d.tamanhos.length) d.tamanhos = []; // sem tamanho: o preço de cima
      if (p) Object.assign(p, d); else db.produtos.push({ id: uid('p'), ativo: true, ...d });
      grava(); fechar(); toast('Prato salvo');
    };
  } });
});

// ------------------------------------------------------------------ estoque simples
G.estoque = {
  titulo: 'Estoque',
  html() {
    const baixo = estoqueBaixo(), todos = db.insumos.filter((i) => i.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const linha = (i) => `<tr class="${saldo(i) <= (Number(i.minimo) || 0) ? 'baixo' : ''}"><td><b>${t(i.nome)}</b><small>mínimo ${t(fmtQtd(Number(i.minimo) || 0, i.unid))}</small></td><td class="n"><b>${t(fmtQtd(saldo(i), i.unid))}</b></td>
      <td class="n"><button type="button" class="bt pq" data-acao="est-mov" data-t="entrada" data-id="${t(i.id)}">Chegou</button> <button type="button" class="bt pq" data-acao="est-mov" data-t="perda" data-id="${t(i.id)}">Perda</button> <button type="button" class="bt pq" data-acao="est-mov" data-t="contar" data-id="${t(i.id)}">Contei</button> <button type="button" class="bt-ico" data-acao="est-ed" data-id="${t(i.id)}" aria-label="Editar ${t(i.nome)}">${ico('ajustes')}</button></td></tr>`;
    return volta('Estoque', 'O que tem e o que está acabando. As vendas tiram do estoque sozinhas quando o prato diz o que usa.') + `
    <div class="linha-bts" style="margin-bottom:14px"><button type="button" class="bt cheio grande" data-acao="est-ed">${ico('mais2')}Novo item</button>${baixo.length ? `<button type="button" class="bt grande" data-acao="lista-compras">${ico('carrinho')}Lista de compras (${baixo.length})</button>` : ''}</div>
    ${baixo.length ? `<div class="sec"><h2>Está acabando</h2></div><div class="rolo"><table class="tabela"><thead><tr><th>Item</th><th class="n">Tem</th><th class="n">O que fazer</th></tr></thead><tbody>${baixo.map(linha).join('')}</tbody></table></div>` : '<p class="aviso ok">Nada acabando agora.</p>'}
    <div class="sec"><h2>Tudo o que tem (${todos.length})</h2></div>
    <div class="rolo"><table class="tabela"><thead><tr><th>Item</th><th class="n">Tem</th><th class="n">O que fazer</th></tr></thead><tbody>${todos.map(linha).join('') || '<tr><td colspan="3" class="mudo">Nenhum item. Cadastre o que você quer controlar (pão, carne, refrigerante, gás…).</td></tr>'}</tbody></table></div>
    ${(db.movEstoque || []).length ? `<div class="sec"><h2>Últimas movimentações</h2></div><div class="cartao"><ul class="lista-l">${[...db.movEstoque].reverse().slice(0, 12).map((m) => { const i = insumo(m.insumo); return `<li><div class="tx"><b>${t(i?.nome || m.insumo)} · ${m.qtd > 0 ? '+' : ''}${t(fmtQtd(m.qtd, i?.unid))}</b><small>${t({ entrada: 'Chegou', perda: 'Perda', ajuste: 'Contagem' }[m.tipo] || m.tipo)}${m.motivo ? ` · ${t(m.motivo)}` : ''} · ${new Date(m.t).toLocaleDateString('pt-BR')} ${hora(m.t)} · ${t(m.quem || '')}</small></div></li>`; }).join('')}</ul></div>` : ''}`;
  },
};
acao('est-ed', (b) => {
  const i = b.dataset.id ? insumo(b.dataset.id) : null;
  folha({ titulo: i ? i.nome : 'Novo item do estoque', corpo: `<label class="campo"><span>Nome</span><input data-n maxlength="60" value="${t(i?.nome || '')}" placeholder="Ex.: Pão de hambúrguer"></label>
    <div class="grade2"><label class="campo"><span>Unidade</span><select data-u>${['un', 'kg', 'L', 'g', 'ml', 'pct', 'cx'].map((u) => `<option ${u === (i?.unid || 'un') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label class="campo"><span>Mínimo (avisa abaixo disso)</span><input data-min inputmode="decimal" value="${i ? vir(i.minimo) : ''}" placeholder="0"></label></div>
    ${i ? '' : '<label class="campo"><span>Quanto tem agora</span><input data-q inputmode="decimal" placeholder="0"></label>'}
    ${i ? '<button type="button" class="bt perigo" data-apagar>Tirar do estoque</button>' : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Tirar ${i.nome} do estoque? Os pratos param de baixar este item.`, 'Tirar', true)) { i.ativo = false; grava(); fechar(); } });
    $('[data-ok]', f).onclick = () => {
      const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome');
      const u = $('[data-u]', f).value, min = r2(num($('[data-min]', f).value));
      if (i) { Object.assign(i, { nome, minimo: min }); if (i.unid !== u && !(i.fator > 1)) { i.unid = u; i.compra = u; } }
      else db.insumos.push({ id: uid('in'), nome, unid: u, compra: u, fator: 1, estoque: r2(num($('[data-q]', f).value)), minimo: min, custo: 0 });
      grava(); fechar(); toast('Salvo');
    };
  } });
});
acao('est-mov', (b) => {
  const i = insumo(b.dataset.id), tipo = b.dataset.t; if (!i) return;
  const un = i.fator > 1 ? i.compra : i.unid;
  const tit = { entrada: `Chegou ${i.nome}`, perda: `Perda de ${i.nome}`, contar: `Contei ${i.nome}` }[tipo];
  folha({ titulo: tit, corpo: `<p class="mudo" style="margin-bottom:12px">Agora tem ${t(fmtQtd(saldo(i), i.unid))}.</p>
    <label class="campo"><span>${tipo === 'contar' ? `Quanto tem de verdade (${t(i.unid)})` : tipo === 'entrada' ? `Quanto chegou (${t(un)})` : `Quanto perdeu (${t(i.unid)})`}</span><input data-q inputmode="decimal" placeholder="0"></label>
    ${tipo === 'perda' ? `<div class="chips quebra">${MOTIVOS_PERDA.map((m, k) => `<button type="button" class="chip" data-m="${m}" aria-pressed="${k === 0}">${m}</button>`).join('')}</div>` : ''}`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok>Salvar</button>',
  aoAbrir: (f, fechar) => {
    $$('[data-m]', f).forEach((x) => { x.onclick = () => $$('[data-m]', f).forEach((y) => y.setAttribute('aria-pressed', y === x)); });
    $('[data-ok]', f).onclick = () => {
      const q = num($('[data-q]', f).value); if (!(q >= 0) || ($('[data-q]', f).value.trim() === '')) return toast('Escreva a quantidade');
      if (tipo === 'entrada') { if (!(q > 0)) return toast('Escreva a quantidade'); entradaCompra(i.id, q); }
      else if (tipo === 'perda') { if (!(q > 0)) return toast('Escreva a quantidade'); registrarPerda(i.id, q, $('[data-m][aria-pressed=true]', f)?.dataset.m || 'Outro'); }
      else ajustarEstoque(i.id, q);
      fechar(); toast('Estoque atualizado');
    };
  } });
});
acao('lista-compras', () => {
  const l = estoqueBaixo(), txt = `*Lista de compras · ${db.config.nome}*\n${l.map((i) => `• ${i.nome} (tem ${fmtQtd(saldo(i), i.unid)}, mínimo ${fmtQtd(Number(i.minimo) || 0, i.unid)})`).join('\n')}`;
  folha({ titulo: 'Lista de compras', corpo: `<ul class="lista-l">${l.map((i) => `<li><div class="tx"><b>${t(i.nome)}</b><small>Tem ${t(fmtQtd(saldo(i), i.unid))} · mínimo ${t(fmtQtd(Number(i.minimo) || 0, i.unid))}</small></div></li>`).join('')}</ul>`,
    pe: `<button type="button" class="bt" data-imp>${ico('impressora')}Imprimir</button><a class="bt ok grande" target="_blank" rel="noopener" href="${zap(db.config.whatsappDono || db.config.whatsapp || '', txt)}">${ico('zap')}Mandar no WhatsApp</a>`,
    aoAbrir: (f) => { $('[data-imp]', f).onclick = () => imprimir(`<div class="tk"><h1>Lista de compras</h1><p class="c">${t(db.config.nome)} · ${new Date().toLocaleDateString('pt-BR')}</p><hr><table>${l.map((i) => `<tr><td>[ ] ${t(i.nome)}</td><td class="n">${t(fmtQtd(saldo(i), i.unid))}</td></tr>`).join('')}</table></div>`); } });
});

// ------------------------------------------------------------------ clientes e fiado
let buscaCli = '';
G.clientes = {
  titulo: 'Clientes e fiado',
  html() {
    const fiados = clientesFiado().filter((x) => x.saldo > 0.009), total = r2(fiados.reduce((s, x) => s + x.saldo, 0));
    const q = buscaCli.toLowerCase(), l = [...(db.clientes || [])].filter((c) => !q || `${c.nome} ${c.tel}`.toLowerCase().includes(q)).sort((a, b) => (b.ultimo || 0) - (a.ultimo || 0));
    return volta('Clientes e fiado', 'Quem pede pelo telefone ou pelo link fica guardado aqui') + `
    <div class="kpis"><div><small>Clientes</small><b>${(db.clientes || []).length}</b></div><div><small>Fiado em aberto</small><b>${din(total)}</b><span>${fiados.length} ${fiados.length === 1 ? 'pessoa' : 'pessoas'}</span></div></div>
    ${fiados.length ? `<div class="sec"><h2>Quem está devendo</h2><button type="button" class="bt" data-acao="receber-fiado-g">${ico('moedas')}Receber</button></div>
      <div class="cartao"><ul class="lista-l">${fiados.map((x) => `<li><div class="tx"><b>${t(x.nome || fone(x.tel))}</b><small>${t(fone(x.tel))} · limite ${din(x.limite)}</small></div><b class="num">${din(x.saldo)}</b>
        <a class="bt-ico" target="_blank" rel="noopener" href="${zap(x.tel, `Olá, ${(x.nome || '').split(' ')[0]}! Sua conta no ${db.config.nome} está em ${din(x.saldo)}. Quando puder, passe aqui ou pague por Pix. Obrigado!`)}" aria-label="Lembrar pelo WhatsApp">${ico('zap')}</a>
        <button type="button" class="bt-ico" data-acao="cli-ver" data-id="${t(x.cid)}" aria-label="Ver ${t(x.nome)}">${ico('dir')}</button></li>`).join('')}</ul></div>` : ''}
    <div class="sec"><h2>Clientes</h2></div>
    <label class="busca">${ico('busca')}<input type="search" data-bcli value="${t(buscaCli)}" placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente"></label>
    <div class="cartao"><ul class="lista-l">${l.slice(0, 60).map((c) => `<li><div class="tx"><b>${t(c.nome || fone(c.tel))}</b><small>${t(fone(c.tel))}${c.bairro ? ` · ${t(c.bairro)}` : ''} · ${c.pedidos || 0} pedidos · ${din(c.total || 0)}${saldoFiado(c.id) > 0.009 ? ` · deve ${din(saldoFiado(c.id))}` : ''}</small></div><button type="button" class="bt-ico" data-acao="cli-ver" data-id="${t(c.id)}" aria-label="Ver ${t(c.nome)}">${ico('dir')}</button></li>`).join('') || '<li class="mudo">Nenhum cliente ainda.</li>'}</ul></div>`;
  },
  montar(el) { const i = $('[data-bcli]', el); if (i) i.oninput = () => { buscaCli = i.value; ir('mais/clientes'); const n = $('[data-bcli]'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); }; },
};
acao('receber-fiado-g', () => receberFiadoFolha());
acao('cli-ver', (b) => {
  const cid = b.dataset.id, c = (db.clientes || []).find((x) => x.id === cid) || { id: cid, tel: cid.slice(1), nome: nomeFiado(cid) };
  const lanc = (db.fiado?.lanc || []).filter((l) => l.cliente === cid).sort((a, x) => x.ts - a.ts), s = saldoFiado(cid);
  folha({ titulo: c.nome || fone(c.tel), corpo: `<p><a class="bt" target="_blank" rel="noopener" href="${zap(c.tel, `Olá, ${(c.nome || '').split(' ')[0]}!`)}">${ico('zap')}${t(fone(c.tel))}</a></p>
    <ul class="lista-l" style="margin-top:10px"><li><div class="tx">Pedidos</div><b>${c.pedidos || 0}</b></li><li><div class="tx">Gastou no total</div><b>${din(c.total || 0)}</b></li>${c.end ? `<li><div class="tx">Endereço</div><b>${t(c.end)}${c.bairro ? ` · ${t(c.bairro)}` : ''}</b></li>` : ''}
      ${(() => { const h = db.vendas.filter((v) => v.cliente === soDig(c.tel) && !v.cancelado).sort((a, x) => x.ts - a.ts); return h.length ? `<li><div class="tx">Média por pedido</div><b>${din(h.reduce((a, v) => a + v.total, 0) / h.length)}</b></li>` : ''; })()}
      <li><div class="tx">Fiado: deve</div><b>${din(s)}</b></li><li><div class="tx">Limite do fiado</div><b><input data-lim inputmode="decimal" style="width:120px;min-height:44px" value="${vir(limiteFiado(cid))}" aria-label="Limite do fiado"></b></li></ul>
    ${(() => { const h = db.vendas.filter((v) => v.cliente === soDig(c.tel)).sort((a, x) => x.ts - a.ts).slice(0, 15);
      return `<p class="grupo-tit">Pedidos (${h.length ? `últimos ${h.length}` : 'nenhum registrado ainda'})</p>${h.length ? `<ul class="lista-l">${h.map((v) => `<li><div class="tx"><b>${new Date(v.ts).toLocaleDateString('pt-BR')} ${hora(v.ts)} · ${t(v.onde || '')}${v.cancelado ? ' · cancelada' : ''}</b><small>${t((v.itens || []).map((i) => `${i.kg ? '' : `${i.qtd}× `}${i.nome}`).join(', '))}</small></div><b class="num">${din(v.total)}</b></li>`).join('')}</ul>` : ''}`; })()}
    ${lanc.length ? `<p class="grupo-tit">Extrato do fiado</p><ul class="lista-l">${lanc.slice(0, 30).map((l) => `<li><div class="tx"><b>${l.tipo === 'compra' ? 'Comprou' : `Pagou (${t(l.forma || '')})`}</b><small>${new Date(l.ts).toLocaleDateString('pt-BR')} ${hora(l.ts)}${l.onde ? ` · ${t(l.onde)}` : ''}</small></div><b class="num">${l.tipo === 'compra' ? '' : '− '}${din(l.valor)}</b></li>`).join('')}</ul>` : ''}`,
  pe: `${s > 0.009 ? `<button type="button" class="bt cheio grande" data-rec>${ico('moedas')}Receber</button>` : ''}<button type="button" class="bt grande" data-salvar-lim>Salvar limite</button>`,
  aoAbrir: (f, fechar) => {
    $('[data-rec]', f)?.addEventListener('click', () => { fechar(); receberFiadoFolha(cid); });
    $('[data-salvar-lim]', f).onclick = () => { db.fiado ||= { lanc: [], limites: {} }; db.fiado.limites ||= {}; db.fiado.limites[cid] = r2(num($('[data-lim]', f).value)); grava(); fechar(); toast('Limite salvo'); };
  } });
});

// ------------------------------------------------------------------ entregadores e o acerto do dia
G.entregadores = {
  titulo: 'Entregadores',
  html() {
    const ac = acertoEntregadores(inicioDoDia()), acertos = (db.acertos || []).filter((a) => a.ts >= inicioDoDia());
    return volta('Entregadores', 'Quem leva cada pedido e o acerto das taxas de hoje') + `
    <div class="linha-bts" style="margin-bottom:14px"><button type="button" class="bt cheio grande" data-acao="entregador-ed">${ico('mais2')}Novo entregador</button></div>
    <div class="rolo"><table class="tabela"><thead><tr><th>Entregador</th><th class="n">Entregas hoje</th><th class="n">Taxas hoje</th><th class="n">Recebeu em dinheiro</th><th></th></tr></thead><tbody>
    ${(db.entregadores || []).map((e) => { const a = ac[e.id] || { entregas: 0, taxas: 0, dinheiro: 0 }, rua = db.comandas.filter((x) => x.entregador === e.id && x.entrega === 'saiu').length, ok = acertos.filter((x) => x.entregador === e.id).at(-1);
      return `<tr><td><b>${t(e.nome)}</b><small>${t(fone(e.tel))}${rua ? ` · <b>${rua} na rua agora</b>` : ''}${ok ? ` · acertado às ${hora(ok.ts)}` : ''}</small></td><td class="n">${a.entregas}</td><td class="n"><b>${din(a.taxas)}</b></td><td class="n">${din(a.dinheiro)}</td>
      <td class="n"><button type="button" class="bt pq" data-acao="acerto" data-id="${t(e.id)}">Acerto</button>${e.tel ? `<a class="bt-ico" target="_blank" rel="noopener" href="${zap(e.tel, `Acerto de hoje no ${db.config.nome}: ${a.entregas} entregas, ${din(a.taxas)} de taxas. Dinheiro recebido dos clientes: ${din(a.dinheiro)}.`)}" aria-label="Mandar o acerto">${ico('zap')}</a>` : ''}<button type="button" class="bt-ico" data-acao="entregador-ed" data-id="${t(e.id)}" aria-label="Editar">${ico('ajustes')}</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="mudo">Cadastre os entregadores: ao marcar “Saiu para entrega”, você escolhe quem levou.</td></tr>'}
    </tbody></table></div>
    <p class="mudo" style="margin-top:10px">“Recebeu em dinheiro” é o que o entregador cobrou dos clientes e precisa devolver ao caixa.</p>`;
  },
};
// acerto do dia: as entregas de hoje, quanto pagar de taxa e quanto ele devolve do dinheiro dos clientes
acao('acerto', (b) => {
  const e = (db.entregadores || []).find((x) => x.id === b.dataset.id); if (!e) return;
  const h = inicioDoDia(), l = db.vendas.filter((v) => v.ts >= h && v.entregador === e.id && !v.cancelado).sort((a, x) => a.ts - x.ts);
  const a = acertoEntregadores(h)[e.id] || { entregas: 0, taxas: 0, dinheiro: 0 }, saldo = r2(a.dinheiro - a.taxas);
  const rua = db.comandas.filter((x) => x.entregador === e.id && x.entrega === 'saiu');
  folha({ titulo: `Acerto de ${e.nome} · hoje`, larga: true, corpo: `${rua.length ? `<p class="aviso">${rua.length} ${rua.length === 1 ? 'entrega ainda está' : 'entregas ainda estão'} na rua e não entram nesta conta.</p>` : ''}
    <ul class="lista-l">${l.map((v) => `<li><div class="tx"><b>${hora(v.entregue || v.ts)} · ${t(v.nomeCliente || v.onde || '')}</b><small>${t(v.onde || '')} · ${t(pagamentosDe(v))}</small></div><b class="num">${din(v.entrega || 0)}</b></li>`).join('') || '<li class="mudo">Nenhuma entrega fechada hoje.</li>'}</ul>
    <div class="totais"><div><span>Taxas para pagar a ele (${a.entregas})</span><span class="num">${din(a.taxas)}</span></div><div><span>Dinheiro que ele recebeu dos clientes</span><span class="num">${din(a.dinheiro)}</span></div>
      <div class="total"><span>${saldo >= 0 ? 'Ele devolve ao caixa' : 'O caixa paga a ele'}</span><span class="num">${din(Math.abs(saldo))}</span></div></div>`,
  pe: `${e.tel ? `<a class="bt" target="_blank" rel="noopener" href="${zap(e.tel, `Acerto de hoje no ${db.config.nome}: ${a.entregas} entregas, ${din(a.taxas)} de taxas. Dinheiro recebido dos clientes: ${din(a.dinheiro)}. ${saldo >= 0 ? `Devolver ao caixa: ${din(saldo)}` : `O caixa te paga: ${din(-saldo)}`}.`)}">${ico('zap')}Mandar</a>` : ''}<button type="button" class="bt cheio grande" data-ok>Marcar como acertado</button>`,
  aoAbrir: (f, fechar) => { $('[data-ok]', f).onclick = () => { (db.acertos ||= []).push({ id: uid('ac'), ts: Date.now(), entregador: e.id, entregas: a.entregas, taxas: a.taxas, dinheiro: a.dinheiro, saldo }); if (db.acertos.length > 500) db.acertos.splice(0, db.acertos.length - 500); grava(); fechar(); toast(`Acerto de ${e.nome} registrado`); }; } });
});
const pagamentosDe = (v) => (v.pagamentos?.length ? v.pagamentos : [{ forma: v.forma }]).map((p) => p.forma).join(' + ');
acao('entregador-ed', (b) => {
  const e = b.dataset.id ? db.entregadores.find((x) => x.id === b.dataset.id) : null;
  folha({ titulo: e ? e.nome : 'Novo entregador', corpo: `<label class="campo"><span>Nome</span><input data-n value="${t(e?.nome || '')}"></label><label class="campo"><span>WhatsApp</span><input data-t inputmode="tel" value="${t(fone(e?.tel || ''))}"></label>${e ? '<button type="button" class="bt perigo" data-apagar>Tirar da lista</button>' : ''}`,
    pe: '<button type="button" class="bt cheio grande" data-ok>Salvar</button>',
    aoAbrir: (f, fechar) => {
      $('[data-apagar]', f)?.addEventListener('click', async () => { if (await confirma(`Tirar ${e.nome} da lista? As entregas antigas continuam nos relatórios.`, 'Tirar', true)) { db.entregadores = db.entregadores.filter((x) => x !== e); grava(); fechar(); } });
      $('[data-ok]', f).onclick = () => { const nome = $('[data-n]', f).value.trim(); if (!nome) return toast('Escreva o nome'); const d = { nome, tel: soDig($('[data-t]', f).value) }; if (e) Object.assign(e, d); else db.entregadores.push({ id: uid('e'), ...d }); grava(); fechar(); toast('Entregador salvo'); };
    } });
});

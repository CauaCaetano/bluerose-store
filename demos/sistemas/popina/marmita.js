// Popina · marmita rápida (22/11/2026, banca 2): no balcão, escolhe o tamanho (P, M, G com preço) e marca a mistura e as
// guarnições do dia em 2 ou 3 toques; imprime a etiqueta de montagem (nome, itens, hora) na térmica de 80 mm.
// O cardápio do dia fica em Gestão › Marmitas (config.loja.marmita). Só acrescenta campos: o item vai para a comanda
// como um item comum (prod 'marmita', tamanho no nome, escolhas nos complementos), sem mexer nos pratos do cardápio.
import { db, t, din, r2, num, vir, uid, grava, CONTA, lojaCfg, setLoja, comanda, novoPedido, hora, quemPediu } from './loja.js?v=62';
import { acao, ir } from './nucleo.js?v=62';
import { ico, folha, toast, $, $$ } from './ui.js?v=62';
import { abrirImpressao } from './imprimir.js?v=62';
import { G, volta } from './gestao.js?v=62';

const PADRAO = {
  tamanhos: [{ nome: 'P', preco: 18 }, { nome: 'M', preco: 22 }, { nome: 'G', preco: 26 }],
  misturas: ['Frango grelhado', 'Bife acebolado', 'Linguiça assada', 'Omelete'],
  guarnicoes: ['Arroz', 'Feijão', 'Farofa', 'Salada', 'Macarrão', 'Batata frita'],
};
export const marmitaCfg = () => { const m = lojaCfg().marmita || {}; return { ...PADRAO, ...m, ativa: m.ativa ?? !CONTA }; };
export const marmitaAtiva = () => marmitaCfg().ativa;
const lerLocal = (k, pad) => { try { return localStorage.getItem(k) ?? pad; } catch { return pad; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* nada */ } };

// ------------------------------------------------------------------ etiqueta de montagem (80 mm)
export function htmlEtiqueta(c, i, f = '80') {
  const esc = (i.adic || []).map((a) => a.nome);
  return `<div class="tk etiqueta ${f === 'a4' ? 'a4' : ''}"><h2>${t(c.cliente?.nome || (c.senha ? `Senha ${c.senha}` : quemPediu(c)))}</h2>
    <p class="c"><b style="font-size:22px">MARMITA ${t(i.tam || '')}</b>${i.qtd > 1 ? ` · ${i.qtd} unidades` : ''}</p><hr>
    <table>${esc.map((n) => `<tr><td>☐</td><td>${t(n)}</td></tr>`).join('')}</table>${i.obs ? `<p class="obs">» ${t(i.obs)}</p>` : ''}<hr>
    <p class="c">${t(db.config.nome || '')} · ${hora(Date.now())}${c.senha ? ` · senha ${c.senha}` : ''}${c.tipo === 'delivery' ? ' · ENTREGA' : ''}</p></div>`;
}

// ------------------------------------------------------------------ a folha "Marmita" (c: comanda; sem c, cria um pedido de balcão)
export function marmitaFolha(c = null) {
  const M = marmitaCfg();
  let tam = M.tamanhos[Math.min(1, M.tamanhos.length - 1)]?.nome || '', mist = '', qtd = 1;
  const marcadas = new Set(M.guarnicoes.slice(0, 2)); // arroz e feijão já vêm marcados
  const preco = () => Number(M.tamanhos.find((x) => x.nome === tam)?.preco) || 0;
  folha({ titulo: c ? `Marmita · ${quemPediu(c)}` : 'Marmita rápida', corpo: `
    ${c ? '' : '<label class="campo"><span>Nome do cliente (sai na etiqueta)</span><input data-nome maxlength="60" autocomplete="off" placeholder="Ex.: Carlos (ou deixe em branco e use a senha)"></label>'}
    <p class="grupo-tit">1. Tamanho</p><div class="chips quebra mm-tam" role="group" aria-label="Tamanho">${M.tamanhos.map((x) => `<button type="button" class="chip grande" data-tam="${t(x.nome)}" aria-pressed="${x.nome === tam}"><b>${t(x.nome)}</b> ${din(x.preco)}</button>`).join('')}</div>
    <p class="grupo-tit">2. Mistura</p><div class="chips quebra" role="group" aria-label="Mistura">${M.misturas.map((x) => `<button type="button" class="chip" data-mist="${t(x)}" aria-pressed="false">${t(x)}</button>`).join('') || '<span class="mudo">Cadastre em Gestão › Marmitas</span>'}</div>
    <p class="grupo-tit">3. Guarnições</p><div class="chips quebra" role="group" aria-label="Guarnições">${M.guarnicoes.map((x) => `<button type="button" class="chip" data-gu="${t(x)}" aria-pressed="${marcadas.has(x)}">${t(x)}</button>`).join('')}</div>
    <label class="campo" style="margin-top:10px"><span>Observação (opcional)</span><input data-obs maxlength="120" placeholder="Ex.: sem cebola, pouco arroz"></label>
    <div class="linha-bts" style="align-items:center"><div class="qtd" role="group" aria-label="Quantidade"><button type="button" data-menos aria-label="Menos uma">−</button><b data-q>1</b><button type="button" data-mais aria-label="Mais uma">+</button></div>
      <label class="liga" style="flex:1;min-width:220px">Imprimir a etiqueta<small>Térmica de 80 mm: nome, itens e hora</small><input type="checkbox" data-etq ${lerLocal('popina-etiqueta-marmita', '1') === '1' ? 'checked' : ''}></label></div>`,
  pe: '<button type="button" class="bt" data-fechar>Voltar</button><button type="button" class="bt cheio grande" data-ok></button>',
  aoAbrir: (f, fechar) => {
    const bt = $('[data-ok]', f), atual = () => { bt.innerHTML = `${ico('check')}Pôr ${din(r2(preco() * qtd))}`; $('[data-q]', f).textContent = qtd; };
    $$('[data-tam]', f).forEach((b) => { b.onclick = () => { tam = b.dataset.tam; $$('[data-tam]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); atual(); }; });
    $$('[data-mist]', f).forEach((b) => { b.onclick = () => { mist = mist === b.dataset.mist ? '' : b.dataset.mist; $$('[data-mist]', f).forEach((x) => x.setAttribute('aria-pressed', x.dataset.mist === mist)); }; });
    $$('[data-gu]', f).forEach((b) => { b.onclick = () => { const g = b.dataset.gu; if (marcadas.has(g)) marcadas.delete(g); else marcadas.add(g); b.setAttribute('aria-pressed', marcadas.has(g)); }; });
    $('[data-menos]', f).onclick = () => { qtd = Math.max(1, qtd - 1); atual(); }; $('[data-mais]', f).onclick = () => { qtd = Math.min(50, qtd + 1); atual(); };
    atual();
    bt.onclick = () => {
      if (!tam) return toast('Escolha o tamanho');
      if (M.misturas.length && !mist) return toast('Escolha a mistura');
      const etq = $('[data-etq]', f).checked; gravarLocal('popina-etiqueta-marmita', etq ? '1' : '0');
      let cc = c;
      if (!cc) cc = novoPedido('balcao', { nome: $('[data-nome]', f).value.trim() }, { origem: 'Balcão', aceito: Date.now() });
      const adic = [mist, ...M.guarnicoes.filter((g) => marcadas.has(g))].filter(Boolean).map((nome) => ({ nome, preco: 0 }));
      const item = { id: uid('i'), prod: 'marmita', nome: `Marmita ${tam}`, qtd, preco: r2(preco()), setor: 'cozinha', obs: $('[data-obs]', f).value.trim(), adic, meia: null, status: 'rascunho', tam, marmita: true };
      cc.itens.push(item); grava();
      fechar(); toast(`+${qtd} Marmita ${tam}`);
      if (!c) ir(`lancar/${cc.id}`);
      if (etq) setTimeout(() => abrirImpressao(`Etiqueta · Marmita ${tam}`, (fm) => htmlEtiqueta(cc, item, fm)), 260);
    };
  } });
}
acao('marmita', (b) => { const c = b.dataset.id ? comanda(b.dataset.id) : null; marmitaFolha(c); });

// ------------------------------------------------------------------ Gestão › Marmitas (o cardápio do dia)
const linhas = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 30);
G.marmita = {
  titulo: 'Marmitas',
  html() {
    const M = marmitaCfg();
    return volta('Marmitas', 'Tamanhos, preços e o cardápio do dia da marmita rápida do balcão') + `<form class="duas" data-mm>
    <div><div class="cartao"><h2>Marmita rápida</h2>
      <label class="liga">Vendo marmita<small>Aparece o botão Marmita nos Pedidos e no lançar</small><input type="checkbox" name="ativa" ${M.ativa ? 'checked' : ''}></label>
      <p class="grupo-tit">Tamanhos e preços</p>
      ${M.tamanhos.concat([{ nome: '', preco: '' }]).slice(0, 4).map((x, k) => `<div class="grade2" data-tm><label class="campo"><span>Tamanho ${k + 1}</span><input data-tn maxlength="20" value="${t(x.nome)}" placeholder="${k === 3 ? 'Ex.: Família (opcional)' : ''}"></label><label class="campo"><span>Preço (R$)</span><input data-tp inputmode="decimal" value="${x.preco === '' ? '' : vir(x.preco)}" placeholder="0,00"></label></div>`).join('')}
    </div></div>
    <div><div class="cartao"><h2>Cardápio do dia</h2><p class="mudo" style="margin-bottom:10px">Uma opção por linha. Troque todo dia em segundos.</p>
      <label class="campo"><span>Misturas (o cliente escolhe uma)</span><textarea name="misturas" rows="5">${t(M.misturas.join('\n'))}</textarea></label>
      <label class="campo"><span>Guarnições (marca as que quiser)</span><textarea name="guarnicoes" rows="6">${t(M.guarnicoes.join('\n'))}</textarea><small>As duas primeiras já vêm marcadas (ex.: arroz e feijão).</small></label>
    </div></div>
    <div class="barra-fixa" style="grid-column:1/-1"><button class="bt cheio grande">${ico('check')}Salvar</button></div></form>`;
  },
  montar(el) {
    const f = $('[data-mm]', el); if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const tamanhos = $$('[data-tm]', f).map((d) => ({ nome: $('[data-tn]', d).value.trim().slice(0, 20), preco: r2(num($('[data-tp]', d).value)) })).filter((x) => x.nome);
      if (!tamanhos.length) return toast('Escreva pelo menos um tamanho');
      setLoja({ marmita: { ativa: f.elements.ativa.checked, tamanhos, misturas: linhas(f.elements.misturas.value), guarnicoes: linhas(f.elements.guarnicoes.value) } });
      toast('Salvo');
    };
  },
};

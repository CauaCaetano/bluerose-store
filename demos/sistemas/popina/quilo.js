// Popina · quilo no balcão (22/11/2026, banca 3): pesar → cobrar no balcão → etiqueta, sem idas e voltas.
// Uma folha só: escolhe o prato por quilo (se houver mais de um), lê o peso da balança pelo cabo (balanca.js) ou digita,
// e "Cobrar" cria o pedido de balcão já entregue (não passa pela cozinha) e abre o Fechar conta. Quando a conta fecha,
// a etiqueta sai sozinha (se marcado) e o botão "Etiqueta do quilo" fica em destaque para reimprimir.
// Também liga o botão "Ler da balança" no peso do lançar (salao.js) e a seção Configurações › Balança.
// Campos novos só: comanda.etiquetaQuilo (true quando veio por aqui). Nada do que já existe muda.
import { db, t, din, r2, ativos, prod, novoPedido, adicionarItem, venderDireto, hora, quemPediu, CONTA } from './loja.js?v=60';
import { acao, ir } from './nucleo.js?v=60';
import { ico, folha, toast, $, $$ } from './ui.js?v=60';
import { abrirImpressao } from './imprimir.js?v=60';
import { temSerial, balancaLigada, balancaSimulada, lerPeso, MSG, conectarBalanca, desconectarBalanca, reconectarBalanca, usarSimulada, balancaCfg, trocarVelocidade, VELOCIDADES } from './balanca.js?v=60';

const lerLocal = (k, pad) => { try { return localStorage.getItem(k) ?? pad; } catch { return pad; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* nada */ } };
export const pratosKg = () => ativos().filter((p) => p.porKg);
export const temQuilo = () => pratosKg().length > 0;
// 450 = gramas; 0,450 = quilo
export const pesoKg = (v) => { const x = String(v || '').trim().replace(/\s/g, ''); if (!x) return 0; const n = Number(x.replace(',', '.')); if (!(n > 0)) return 0;
  return Math.round((/[.,]/.test(x) ? n : n / 1000) * 1000) / 1000; };
const gramas = (kg) => String(Math.round(kg * 1000));

// ------------------------------------------------------------------ "Ler da balança" ao lado de um campo de peso (em gramas)
export function botaoBalanca() {
  return `<button type="button" class="bt bt-balanca" data-ler-bal ${balancaLigada() ? '' : 'hidden'}>${ico('estoque')}Ler da balança</button>`;
}
// liga o botão; ao abrir, já lê sozinho se a balança estiver ligada
export function ligarBalanca(raiz, inp, depois) {
  const b = $('[data-ler-bal]', raiz); if (!b) return;
  const ler = async () => {
    if (!balancaLigada()) return;
    b.disabled = true; const antes = b.innerHTML; b.innerHTML = `${ico('relogio')}Lendo…`;
    const r = await lerPeso(); b.disabled = false; b.innerHTML = antes;
    if (r.kg) { inp.value = gramas(r.kg); depois?.(); } else toast(MSG[r.erro] || 'Não deu para ler o peso. Digite o peso.');
  };
  b.onclick = ler;
  if (balancaLigada()) setTimeout(ler, 120);
}

// ------------------------------------------------------------------ etiqueta do quilo (80 mm): nome ou senha, peso, preço do quilo, valor, PAGO
export function htmlEtiquetaQuilo(c, f = '80', pago = true) {
  const kg = (c.itens || []).filter((i) => i.kg && !i.cancelado);
  const quem = c.cliente?.nome || (c.senha ? `Senha ${c.senha}` : c.mesa ? `Mesa ${c.mesa}` : quemPediu(c));
  return `<div class="tk etiqueta ${f === 'a4' ? 'a4' : ''}"><h2>${t(quem)}</h2>
    ${kg.map((i) => `<p class="c"><b style="font-size:24px">${Number(i.kg).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</b></p>
      <table><tr><td>${t(String(i.nome).replace(/ · [\d.,]+ kg$/, ''))}</td><td class="n">${din(Number(prod(i.prod)?.preco) || r2(i.preco / i.kg))}/kg</td></tr><tr class="grande"><td>Valor</td><td class="n">${din(i.preco * (i.qtd || 1))}</td></tr></table>`).join('<hr>')}
    <hr><p class="c">${pago ? '<b style="font-size:20px">PAGO</b> · ' : ''}${t(db.config.nome || '')} · ${hora(Date.now())}</p></div>`;
}
export const imprimirEtiquetaQuilo = (c, pago = true) => abrirImpressao('Etiqueta do quilo', (f) => htmlEtiquetaQuilo(c, f, pago));

// ------------------------------------------------------------------ a folha "Quilo no balcão"
export function quiloFolha() {
  const l = pratosKg(); if (!l.length) return toast('Cadastre um prato “Vendido por quilo” em Gestão › Cardápio');
  let p = l[0];
  folha({ titulo: 'Quilo no balcão', corpo: `
    ${l.length > 1 ? `<div class="chips quebra" role="group" aria-label="Prato">${l.map((x, k) => `<button type="button" class="chip" data-pk="${t(x.id)}" aria-pressed="${k === 0}">${t(x.nome)} · ${din(x.preco)}/kg</button>`).join('')}</div>` : ''}
    <div class="peso">
      <p class="peso-kg">Preço do quilo <b data-pkg>${din(p.preco)}</b></p>
      <div class="peso-linha"><label class="campo"><span>Peso, em gramas</span><input data-g inputmode="decimal" autocomplete="off" placeholder="Ex.: 450" aria-describedby="qk-res"></label>${botaoBalanca()}</div>
      <p class="peso-res" id="qk-res" data-res aria-live="polite">${balancaLigada() ? 'Lendo a balança…' : 'Digite o peso'}</p>
      ${balancaLigada() ? '' : `<p class="mudo">Pode digitar 450 (gramas) ou 0,450 (quilo).${temSerial() ? ' Tem balança com cabo? Conecte em Configurações › Balança.' : ''}</p>`}
    </div>
    <label class="campo"><span>Nome do cliente (opcional, sai na etiqueta)</span><input data-nome maxlength="60" autocomplete="off" placeholder="Ou deixe em branco e use a senha"></label>
    <label class="liga">Imprimir a etiqueta ao receber<small>Térmica de 80 mm: peso, preço do quilo, valor e PAGO</small><input type="checkbox" data-etq ${lerLocal('popina-etiqueta-quilo', '1') === '1' ? 'checked' : ''}></label>`,
  pe: '<button type="button" class="bt" data-mais>Pôr mais itens</button><button type="button" class="bt cheio grande" data-ok>Cobrar</button>',
  aoAbrir: (f, fechar) => {
    const inp = $('[data-g]', f), bt = $('[data-ok]', f), res = $('[data-res]', f);
    const calc = () => { const kg = pesoKg(inp.value), v = r2(p.preco * kg), ok = kg > 0 && kg < 30;
      res.innerHTML = ok ? `${(kg * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g × ${din(p.preco)}/kg = <b>${din(v)}</b>` : 'Digite o peso';
      bt.innerHTML = ok ? `${ico('conta')}Cobrar ${din(v)}` : 'Cobrar'; return ok ? kg : 0; };
    inp.oninput = calc;
    $$('[data-pk]', f).forEach((b) => { b.onclick = () => { p = l.find((x) => x.id === b.dataset.pk) || p; $$('[data-pk]', f).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-pkg]', f).textContent = din(p.preco); calc(); }; });
    ligarBalanca(f, inp, calc);
    const criar = (cobrar) => {
      const kg = calc(); if (!kg) { toast('Digite o peso da balança'); return inp.focus(); }
      const etq = $('[data-etq]', f).checked; gravarLocal('popina-etiqueta-quilo', etq ? '1' : '0');
      const c = novoPedido('balcao', { nome: $('[data-nome]', f).value.trim() }, { origem: 'Balcão', aceito: Date.now(), ...(etq ? { etiquetaQuilo: true } : {}) });
      adicionarItem(c, { prodId: p.id, kg });
      venderDireto(c); // o prato já está montado: não vai para a tela da cozinha
      fechar();
      if (cobrar) ir(`fechar/${c.id}`); else { toast(`+ ${p.nome} · ${din(r2(p.preco * kg))}`); ir(`lancar/${c.id}`); }
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); criar(true); } };
    bt.onclick = () => criar(true);
    $('[data-mais]', f).onclick = () => criar(false);
  } });
}
acao('quilo-balcao', () => quiloFolha());

// ------------------------------------------------------------------ Configurações › Balança (só neste computador)
export function secaoBalanca() {
  const ok = temSerial(), lig = balancaLigada(), sim = balancaSimulada(), c = balancaCfg();
  return `<section class="cartao cfg-sec" id="cfg-balanca"><h2>Balança</h2>
    <p class="mudo">Liga a balança do balcão pelo cabo: o peso entra sozinho no quilo, sem digitar. Vale só para este computador.</p>
    ${!ok ? `<p class="aviso" style="margin-top:12px">${ico('alerta')}Este aparelho não fala com a balança pelo cabo. Funciona no <b>computador com Chrome ou Edge</b> (não no celular nem no iPhone). Aqui o peso continua sendo digitado.</p>`
      : `<p class="bal-estado ${lig ? 'ok' : ''}" data-bal-estado>${lig ? `${ico('check')}${sim ? 'Balança simulada ligada (demonstração)' : 'Balança conectada'}` : 'Nenhuma balança conectada'}</p>
      <div class="linha-bts" style="margin:10px 0">${lig ? `<button type="button" class="bt cheio" data-bal-teste>${ico('estoque')}Ler o peso agora</button><button type="button" class="bt" data-bal-desl>Desconectar</button>`
        : `<button type="button" class="bt cheio" data-bal-con>${ico('link')}Conectar balança</button>${CONTA ? '' : `<button type="button" class="bt" data-bal-sim>Testar com a balança simulada</button>`}`}</div>
      <p class="mudo" data-bal-lido></p>
      <label class="campo" style="max-width:280px"><span>Velocidade (baud)</span><select data-bal-baud>${VELOCIDADES.map((v) => `<option ${Number(c.baud) === v ? 'selected' : ''}>${v}</option>`).join('')}</select><small>A maioria usa 9600. Se não ler, tente 2400 ou 4800 (está no menu da balança).</small></label>
      <details class="ac-det"><summary>Quais balanças funcionam</summary><ul class="lista-solta">
        <li><b>Toledo</b> Prix 3 Fit, Prix 4 Uno e parecidas, com o cabo serial (RS-232 ou USB). No menu da balança, escolha o protocolo Prt3 (ou Prt1/Prt5).</li>
        <li><b>Filizola</b> de balcão com saída serial.</li>
        <li><b>Elgin</b> DP e SA com saída serial (lê como Filizola ou Toledo).</li>
        <li><b>Urano</b> US POP e UDC com saída serial.</li>
        <li>Balança com USB que aparece como porta COM no Windows. Se pedir driver, instale o do fabricante.</li></ul>
        <p class="mudo">Ao tocar em Conectar, o Chrome mostra a lista de portas: escolha a da balança (geralmente "USB Serial" ou "COM3"). Da próxima vez ele lembra sozinho.</p></details>`}
  </section>`;
}
export function montarBalanca(el, redesenhar) {
  $('[data-bal-con]', el)?.addEventListener('click', async () => {
    try { await conectarBalanca(); toast('Balança conectada'); redesenhar(); }
    catch (e) { if (e?.name !== 'NotFoundError') toast(e?.message && /navegador/.test(e.message) ? e.message : 'Não deu para abrir a porta da balança. Confira o cabo.'); }
  });
  $('[data-bal-sim]', el)?.addEventListener('click', () => { usarSimulada(true); toast('Balança simulada ligada'); redesenhar(); });
  $('[data-bal-desl]', el)?.addEventListener('click', async () => { await desconectarBalanca(); toast('Balança desconectada'); redesenhar(); });
  $('[data-bal-baud]', el)?.addEventListener('change', async (e) => { try { await trocarVelocidade(e.target.value); toast(`Velocidade ${e.target.value}`); } catch { toast('Não deu para trocar a velocidade agora'); } });
  $('[data-bal-teste]', el)?.addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; const r = await lerPeso(); b.disabled = false;
    $('[data-bal-lido]', el).textContent = r.kg ? `Peso lido: ${r.kg.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} kg` : MSG[r.erro] || 'Não deu para ler.';
  });
}
// ao abrir o sistema, reconecta a balança que já foi autorizada neste computador
reconectarBalanca().catch(() => {});

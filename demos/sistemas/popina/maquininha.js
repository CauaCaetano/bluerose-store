// Popina · maquininha Mercado Pago Point pela conta do PRÓPRIO restaurante (22/11/2026, banca 3).
// Configurações › Maquininha: o dono cola o Access Token de produção da conta Mercado Pago dele e escolhe a maquininha
// (Point Smart 1/2, Point Pro 2/3). No Fechar conta, "Cobrar na maquininha" manda o valor para ela e espera a confirmação
// (o Popina consulta a cada 2,5 s pela função popina-point). Aprovado → o pagamento entra como Crédito, Débito ou Pix.
// O token vai só para o servidor (cifrado em nexo_segredos); aqui fica só o "ligado" e o nome da maquininha.
// Demonstração: tudo simulado (maquininha de exemplo que aprova em 3 segundos).
// Campos novos só: db.config.loja.point { ligado, terminal, conta } e, no pagamento, { maquininha: { id, bandeira, parcelas } }.
import { db, t, din, CONTA, lojaCfg, setLoja } from './loja.js?v=61';
import { ico, folha, toast, confirma, $, $$ } from './ui.js?v=61';

// na demonstração já vem uma maquininha de exemplo ligada (dá para desligar em Configurações)
const P = () => { const x = lojaCfg().point; return x || (CONTA ? {} : { ligado: true, terminal: 'NEWLAND_N950__N950NCB801293324', conta: 'RESTAURANTE EXEMPLO' }); };
const setP = (x) => setLoja({ point: { ...P(), ...x } });
export const maquininhaLigada = () => !!(P().ligado && P().terminal);
const chamar = (body) => (CONTA && window.popinaPoint ? window.popinaPoint(body) : Promise.resolve({ ok: false, mensagem: 'Entre na conta para usar a maquininha.' }));
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const curto = (id) => String(id || '').replace(/__/, ' · ').replace(/_/g, ' ');

// ------------------------------------------------------------------ simulação da demonstração
let simN = 0;
const demo = {
  cobrar: async (v) => { await espera(500); return { ok: true, id: `ORDDEMO${++simN}`, status: 'at_terminal', valor: v, t0: Date.now() }; },
  consultar: async (id, t0) => (Date.now() - t0 > 3000 ? { ok: true, id, status: 'processed', tipo: 'credit_card', bandeira: 'master', parcelas: 1 } : { ok: true, id, status: 'at_terminal' }),
  cancelar: async (id) => ({ ok: true, id, status: 'canceled' }),
};
const FORMA_DE = { credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', prepaid_card: 'Cartão de débito', qr: 'Pix', pix: 'Pix', bank_transfer: 'Pix', account_money: 'Pix' };

// ------------------------------------------------------------------ cobrar (Fechar conta)
// concluir(forma, extra) é o mesmo final dos outros pagamentos do caixa
export function cobrarNaMaquininha(c, valor, concluir) {
  let ordem = null, parar = false, t0 = 0;
  const ref = `popina-${String(c.id).replace(/[^A-Za-z0-9_-]/g, '')}-${Date.now().toString(36)}`.slice(0, 64);
  folha({ titulo: `Maquininha · ${din(valor)}`, corpo: `<div class="maq-status" data-st>
      <div class="maq-ico">${ico('cartao')}</div><b data-tit>Mandando para a maquininha…</b><p class="mudo" data-txt>${t(curto(P().terminal))}</p></div>
      ${CONTA ? '' : '<p class="aviso" style="margin-top:12px">Demonstração: a maquininha é simulada e aprova sozinha em 3 segundos.</p>'}`,
  pe: '<button type="button" class="bt" data-cancela>Cancelar a cobrança</button>',
  aoAbrir: async (f, fechar) => {
    const tit = $('[data-tit]', f), txt = $('[data-txt]', f), st = $('[data-st]', f);
    const fim = (ok, msg) => { parar = true; st.classList.toggle('ok', ok); st.classList.toggle('erro', !ok); tit.textContent = msg; };
    $('[data-cancela]', f).onclick = async () => {
      if (!ordem) { parar = true; fechar(); return; }
      const r = CONTA ? await chamar({ acao: 'cancelar', id: ordem.id }) : await demo.cancelar(ordem.id);
      if (r.ok && r.status === 'canceled') { fim(false, 'Cobrança cancelada'); setTimeout(fechar, 900); }
      else if (r.ok) { txt.textContent = 'Pedido de cancelamento enviado. Se não sumir da maquininha, cancele nela.'; }
      else toast(r.mensagem || 'Cancele direto na maquininha');
    };
    const r = CONTA ? await chamar({ acao: 'cobrar', valor, ref }) : await demo.cobrar(valor);
    if (!r.ok) { fim(false, r.mensagem || 'Não deu para mandar para a maquininha'); $('[data-cancela]', f).textContent = 'Voltar'; return; }
    ordem = r; t0 = r.t0 || Date.now();
    tit.textContent = 'Passe o cartão ou aproxime na maquininha'; txt.textContent = `${din(valor)} · esperando o cliente pagar`;
    for (let k = 0; k < 400 && !parar && document.body.contains(f); k++) {
      await espera(2500); if (parar || !document.body.contains(f)) break;
      const s = CONTA ? await chamar({ acao: 'consultar', id: ordem.id }) : await demo.consultar(ordem.id, t0);
      if (!s.ok) continue; // sem internet por um instante: tenta de novo
      if (s.status === 'processed') {
        const forma = FORMA_DE[s.tipo] || 'Cartão de crédito';
        fim(true, `Aprovado · ${forma.replace('Cartão de ', '')}${s.parcelas > 1 ? ` em ${s.parcelas}×` : ''}`);
        setTimeout(() => { fechar(); concluir(forma, { maquininha: { id: ordem.id, bandeira: s.bandeira || '', parcelas: s.parcelas || 1 } }); }, 900);
        return;
      }
      if (['failed', 'canceled', 'expired', 'refunded'].includes(s.status)) {
        fim(false, { failed: 'Recusado na maquininha', canceled: 'Cancelado na maquininha', expired: 'O tempo acabou', refunded: 'Estornado' }[s.status]);
        txt.textContent = s.detalhe ? `Motivo: ${s.detalhe}` : 'Tente de novo ou receba de outro jeito.';
        $('[data-cancela]', f).textContent = 'Voltar'; ordem = null; return;
      }
      if (s.status === 'action_required') txt.textContent = 'A maquininha pediu uma ação: veja a tela dela.';
    }
  } });
}

// ------------------------------------------------------------------ Configurações › Maquininha
let srv = null;
export function secaoPoint(g) {
  const x = P(), lig = maquininhaLigada();
  return `<section class="cartao cfg-sec" id="cfg-maquininha"><h2>Maquininha</h2>
    <p class="mudo">Com a maquininha <b>Point do Mercado Pago</b> (Point Smart ou Point Pro), o Fechar conta manda o valor direto para ela: ninguém digita e o pagamento volta aprovado para o caixa. O dinheiro cai na sua conta Mercado Pago, com a taxa que você já paga.</p>
    ${lig ? `<p class="bal-estado ok" style="margin-top:12px">${ico('check')}Ligada: ${t(curto(x.terminal))}${x.conta ? ` · conta ${t(x.conta)}` : ''}${CONTA ? '' : ' (exemplo)'}</p>` : ''}
    ${!g ? '<p class="mudo" style="margin-top:10px">Só o dono ou um administrador liga a maquininha.</p>' : `
    <div data-maq-passos style="margin-top:12px">${x.ligado && !x.terminal ? '<p class="mudo">Conta conectada. Agora escolha a maquininha:</p><div data-maq-lista class="maq-lista"><p class="mudo">Procurando as maquininhas da sua conta…</p></div>' : ''}</div>
    ${x.ligado ? `<div class="linha-bts" style="margin-top:10px">${x.terminal ? `<button type="button" class="bt" data-maq-trocar>${ico('troca')}Trocar a maquininha</button>` : ''}<button type="button" class="bt" data-maq-desl>Desligar</button></div>`
      : `<ol class="lista-solta"><li>No computador, entre em <b>mercadopago.com.br/developers</b> › <b>Suas integrações</b> e crie uma aplicação (escolha “Pagamentos presenciais” / Point).</li><li>Em <b>Credenciais de produção</b>, copie o <b>Access Token</b> (começa com APP_USR-).</li><li>No app do Mercado Pago, a maquininha precisa estar ligada a uma loja e a um caixa.</li></ol>
      <label class="campo"><span>Access Token de produção da sua conta</span><input data-maq-token type="password" autocomplete="off" spellcheck="false" placeholder="${CONTA ? 'APP_USR-...' : 'Na demonstração, deixe em branco'}"></label>
      <div class="linha-bts"><button type="button" class="bt cheio" data-maq-con>${ico('link')}Conectar minha conta</button></div>
      <p class="mudo" style="margin-top:8px">O token fica guardado cifrado no servidor e não aparece de novo nesta tela.</p>`}`}
    <details class="ac-det"><summary>E a Stone, PagBank (PagSeguro) ou Cielo?</summary><p class="mudo" style="margin-top:6px">Ainda não. Essas maquininhas pedem um contrato de parceria ou um aplicativo instalado dentro da própria maquininha. Nelas, continue recebendo como hoje e marque Crédito ou Débito no caixa.</p></details>
  </section>`;
}
async function listar(el, redesenhar) {
  const box = $('[data-maq-lista]', el); if (!box) return;
  const r = CONTA ? await chamar({ acao: 'terminais' }) : { ok: true, terminais: [{ id: 'GERTEC_MP35P__8701372447323147', modo: 'STANDALONE', caixa: 'Caixa 1' }, { id: 'NEWLAND_N950__N950NCB801293324', modo: 'PDV', caixa: 'Balcão' }] };
  if (!r.ok) { box.innerHTML = `<p class="aviso">${t(r.mensagem || 'Não deu para listar as maquininhas.')}</p>`; return; }
  if (!r.terminais?.length) { box.innerHTML = '<p class="aviso">Nenhuma maquininha nesta conta. No app do Mercado Pago, ligue a Point a uma loja e a um caixa e toque em Procurar de novo.</p><button type="button" class="bt" data-maq-de-novo>Procurar de novo</button>'; $('[data-maq-de-novo]', box).onclick = () => listar(el, redesenhar); return; }
  box.innerHTML = r.terminais.map((x) => `<button type="button" class="maq-op" data-term="${t(x.id)}" data-modo="${t(x.modo)}">${ico('cartao')}<span><b>${t(curto(x.id))}</b><small>${x.caixa ? `Caixa ${t(x.caixa)} · ` : ''}${x.modo === 'PDV' ? 'pronta para receber do sistema' : 'vai passar para o modo PDV (reinicie a maquininha depois)'}</small></span></button>`).join('');
  $$('[data-term]', box).forEach((b) => { b.onclick = async () => {
    b.disabled = true;
    const s = CONTA ? await chamar({ acao: 'escolher', terminal: b.dataset.term, modo: b.dataset.modo }) : { ok: true, terminal: b.dataset.term, reiniciar: b.dataset.modo !== 'PDV' };
    b.disabled = false; if (!s.ok) return toast(s.mensagem || 'Não deu para escolher esta maquininha');
    setP({ ligado: true, terminal: s.terminal }); toast(s.reiniciar ? 'Pronto. Reinicie a maquininha para ela entrar no modo PDV.' : 'Maquininha ligada'); redesenhar();
  }; });
}
export function montarPoint(el, redesenhar) {
  // a conta real confere com o servidor se ainda está conectada (alguém pode ter desligado em outro aparelho)
  if (CONTA && !srv) chamar({ acao: 'status' }).then((s) => { srv = s || {}; if (s && s.conectado === false && P().ligado) { setP({ ligado: false, terminal: '' }); redesenhar(); } });
  listar(el, redesenhar);
  $('[data-maq-con]', el)?.addEventListener('click', async (e) => {
    const tk = $('[data-maq-token]', el).value.trim(), b = e.currentTarget;
    if (CONTA && !/^APP_USR-/.test(tk)) return toast('Cole o Access Token de produção (começa com APP_USR-)');
    b.disabled = true; const r = CONTA ? await chamar({ acao: 'conectar', token: tk }) : { ok: true, conta: 'RESTAURANTE EXEMPLO' }; b.disabled = false;
    if (!r.ok) return toast(r.mensagem || 'Não deu para conectar');
    setP({ ligado: true, terminal: '', conta: r.conta || '' }); toast('Conta conectada: agora escolha a maquininha'); redesenhar();
  });
  $('[data-maq-trocar]', el)?.addEventListener('click', () => { setP({ terminal: '' }); redesenhar(); });
  $('[data-maq-desl]', el)?.addEventListener('click', async () => {
    if (!(await confirma('Desligar a maquininha do Popina? O token sai do servidor.', 'Desligar'))) return;
    if (CONTA) await chamar({ acao: 'desconectar' }); setP({ ligado: false, terminal: '', conta: '' }); srv = null; toast('Maquininha desligada'); redesenhar();
  });
}
export { db };

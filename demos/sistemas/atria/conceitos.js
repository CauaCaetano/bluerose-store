// Atria · tela de Início "Coluna" (escolha do dono, 11/11/2026): capitel (saudação e a próxima coisa a fazer),
// fuste (3 ações largas caneladas), 3 blocos e a base (lucro do mês, toque abre o Dinheiro); a coluna se ergue ao abrir.
// A navegação é a base da coluna: 3 degraus (Início, Vitrine, Gestão).
// Regras: 1 número em destaque, 6 ações grandes (ícone + 1 palavra), próxima ação em 1 frase, toque de 56 px ou mais.
import { $, $$, t, din, dinCurto, hoje, dias, ico, db, grava, uid, sa, toast, repinta, ir, vibra, somaDias, achar } from './base.js?v=14';
import { MODOS_COBRAR, meusOficios, principal, nomeOficios } from './oficios.js?v=14';
import { totais, cliente, somaPeriodo, intervalo, cobrarPix, SERVICOS_SUGERIDOS, CENA_DO_OFICIO, contagemObras } from './gestao.js?v=14';
import { OFICIOS } from './oficios.js?v=14';

export const CONCEITO = 'c';

// as 6 ações (ícone + 1 palavra)
const ACOES6 = [
  ['orcar', 'doc', 'Orçar', '#orcar'], ['pix', 'pix', 'Cobrar Pix', null], ['obras', 'capacete', 'Minhas obras', '#obras'],
  ['trabalhos', 'lupa', 'Trabalhos', '#trabalhos'], ['material', 'lista', 'Materiais', '#listas'], ['divulgar', 'antesdepois', 'Divulgar', null],
];
const icoG = (n, px = 34) => ico(n, `width="${px}" height="${px}" stroke-width="1.6"`);
const alvo = ([k, , , h]) => (h ? `href="${h}"` : `href="#" data-acao="${k === 'pix' ? 'pix' : 'novo-post'}"`);
const novosTrab = () => (db.achados || []).filter((a) => a.novo).length + db.pedidos.filter((p) => !p.interesse && dias(p.data.slice(0, 10)) === 0 && meusOficios(db.perfil).some((o) => o.id === p.of)).length;
const lucroMes = () => { const [a, b] = intervalo('mes'); return somaPeriodo(a, b).l; };
const nome = () => t(db.perfil.apelido || db.perfil.nome.split(' ')[0]);
const saud = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

export function instalarConceitos({ TELAS, ACOES, sugestoes }) {
  document.documentElement.classList.add(`conc-${CONCEITO}`);
  const prox = () => { const s = sugestoes()[0]; return s ? { txt: s.txt, bt: s.bt } : { txt: 'Tudo em dia. Que tal postar uma obra?', bt: ['Divulgar', null, { acao: 'novo-post' }] }; };
  const btProx = (s, cls = '') => (s.bt[1] ? `<a class="${cls}" href="${s.bt[1]}">${s.bt[0]}</a>` : `<button type="button" class="${cls}" data-acao="${s.bt[2].acao}" data-m="${s.bt[2].m || ''}" data-o="${s.bt[2].o || ''}">${s.bt[0]}</button>`);

  // ---------------------------------------------------------------- C · coluna
  const inicioC = () => {
    const l = lucroMes(), meta = db.perfil.meta, s = prox(), [a1, a2, a3, a4, a5, a6] = ACOES6;
    return `<section class="pc">
      <header class="pc-capitel"><span class="pc-voluta" aria-hidden="true"></span><h1>${saud()}, ${nome()}</h1><p>${s.txt}</p>${btProx(s, 'pc-prox')}</header>
      <nav class="pc-fuste" aria-label="Ações principais">${[a1, a2, a4].map((a) => `<a class="pc-tambor" ${alvo(a)} data-tambor="${a[0]}">${icoG(a[1], 34)}<b>${a[2]}${a[0] === 'obras' ? (() => { const n = contagemObras(); return `<small class="pc-sub">${n.afazer} a fazer · ${n.andamento} em andamento</small>`; })() : ''}</b>${a[0] === 'trabalhos' && novosTrab() ? `<span class="pc-selo">${novosTrab()}</span>` : ico('setaDir', 'width="22" height="22"')}</a>`).join('')}</nav>
      <nav class="pc-pequenas" aria-label="Mais ações">${[a3, a5, a6].map((a) => `<a class="pc-bloco" ${alvo(a)}>${icoG(a[1], 28)}<b>${a[2]}</b>${a[0] === 'obras' ? (() => { const n = contagemObras(); return `<small class="pc-sub">${n.afazer} a fazer · ${n.andamento} em andamento</small>`; })() : ''}</a>`).join('')}</nav>
      <a class="pc-base" href="#financeiro" aria-label="Lucro do mês: abrir o dinheiro"><small>lucro do mês</small><b class="num" data-conta="${l}">${din(l)}</b><span>meta ${dinCurto(meta)} · ver dia e semana</span></a>
    </section>`;
  };
  TELAS.inicio = inicioC;

  // ---------------------------------------------------------------- Orçar (tela secundária no mesmo estilo)
  const st = { serv: '', cli: '', modo: '', valor: '', qtd: '' };
  TELAS.orcar = () => {
    if (db.medidaOrcar) { const m = db.medidaOrcar; st.qtd = String(m.qtd).replace('.', ','); st.modo = m.un === 'm²' ? 'm2' : 'metro'; delete db.medidaOrcar; grava(); }
    const pr = principal(db.perfil), modos = [...new Set([...(pr.cobra || []), 'empreitada', 'diaria', 'm2'])], modo = st.modo || modos[0];
    return `<section class="orc orc-${CONCEITO}">
      <header class="orc-cab"><button type="button" class="voltar" data-acao="voltar" aria-label="Voltar">${ico('seta')}</button><h1>Orçar</h1></header>
      <ol class="orc-passos">
        <li><span class="orc-n">1</span><b>O quê?</b><div class="orc-chips">${SERVICOS_SUGERIDOS().slice(0, 6).map((x) => `<button type="button" class="orc-chip" data-orc-serv="${t(x)}" aria-pressed="${st.serv === x}">${t(x)}</button>`).join('')}</div><input class="orc-in" data-orc-campo="serv" data-voz placeholder="ou fale ou escreva o serviço" value="${t(st.serv)}"></li>
        <li><span class="orc-n">2</span><b>Para quem?</b><input class="orc-in" data-orc-campo="cli" data-voz list="orc-cli" placeholder="nome do cliente" value="${t(st.cli)}"><datalist id="orc-cli">${db.clientes.map((c) => `<option value="${t(c.nome)}">`).join('')}</datalist></li>
        <li><span class="orc-n">3</span><b>Como cobra?</b><div class="orc-chips">${modos.map((m) => `<button type="button" class="orc-chip" data-orc-modo="${m}" aria-pressed="${modo === m}">${MODOS_COBRAR[m].nome}</button>`).join('')}</div>
          <div class="orc-valor"><label><small>${MODOS_COBRAR[modo].rot}</small><input class="orc-in num" data-orc-campo="valor" inputmode="decimal" placeholder="0,00" value="${t(st.valor)}"></label>${modo === 'empreitada' ? '' : `<label><small>Quantos (${MODOS_COBRAR[modo].un})</small><input class="orc-in num" data-orc-campo="qtd" inputmode="decimal" placeholder="1" value="${t(st.qtd)}"></label>`}</div></li>
      </ol>
      <button type="button" class="orc-ok" data-acao="orcar-ok">${ico('doc', 'width="24" height="24"')}Gerar orçamento</button>
      <p class="orc-dica">Depois você põe a lista de material e manda no WhatsApp.</p>
    </section>`;
  };
  TELAS.orcar.montar = (tela) => {
    $$('[data-orc-serv]', tela).forEach((b) => { b.onclick = () => { st.serv = b.dataset.orcServ; vibra(6); repinta(); }; });
    $$('[data-orc-modo]', tela).forEach((b) => { b.onclick = () => { st.modo = b.dataset.orcModo; vibra(6); repinta(); }; });
    $$('[data-orc-campo]', tela).forEach((i) => { i.oninput = () => { st[i.dataset.orcCampo] = i.value; }; });
  };
  ACOES['orcar-ok'] = () => {
    if (!st.serv.trim()) { toast('Escolha ou escreva o serviço', 'erro'); return; }
    if (!st.cli.trim()) { toast('Escreva o nome do cliente', 'erro'); return; }
    let c = db.clientes.find((x) => sa(x.nome) === sa(st.cli)); if (!c) { c = { id: uid('c'), nome: st.cli.trim(), tel: '', end: '', desde: hoje() }; db.clientes.push(c); }
    const pr = principal(db.perfil), modo = st.modo || (pr.cobra || ['empreitada'])[0];
    const lerN = (v) => Number(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;
    const o = { id: uid('o'), cliente: c.id, titulo: st.serv.trim(), tipo: CENA_DO_OFICIO[pr.id] || 'muro', oficio: pr.id, status: 'orcamento', criada: hoje(), prazo: somaDias(hoje(), 20),
      etapas: ['Visita e medidas', 'Orçamento aprovado', 'Compra do material', 'Execução', 'Entrega'].map((n) => ({ id: uid('e'), nome: n, feito: false })), mats: [],
      orc: { modo, valorUn: Math.round(lerN(st.valor) * 100), qtd: modo === 'empreitada' ? 1 : lerN(st.qtd) || 1, desloc: 0, margem: db.perfil.margem || 10, mostrarItens: true, entradaPct: 40, parcelas: 1, validade: 15, prazo: 15, status: 'rascunho' },
      recebido: 0, agenda: [], hist: [{ data: hoje(), txt: 'Orçamento começado' }] };
    db.obras.push(o); grava(); Object.assign(st, { serv: '', cli: '', modo: '', valor: '', qtd: '' }); vibra(20); ir(`orcamento/${o.id}`);
  };

  // ---------------------------------------------------------------- navegação: a base da coluna, 3 degraus
  $('.barra').innerHTML = [['inicio', 'Início', 'casa'], ['comunidade', 'Vitrine', 'antesdepois'], ['gestao', 'Gestão', 'capacete']].map(([k, r, ic]) => `<a href="#${k}" data-aba="${k}">${ico(ic, 'width="24" height="24"')}${r}</a>`).join('');
}

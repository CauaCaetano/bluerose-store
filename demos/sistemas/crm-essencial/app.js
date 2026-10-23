// Veltria CRM Essencial · app de celular do vendedor autônomo, representante comercial e corretor.
// O "baralho do dia": cada cliente que precisa de retorno hoje é uma carta (WhatsApp, ligar, registrar o que
// aconteceu e marcar o próximo passo). Mais: funil simples, contatos, rota de visitas, meta e comissão,
// assistente, painel do dono, configurações e assinatura. Dados de exemplo neste aparelho (?novo recomeça).

const CHAVE = 'veltria-crm-essencial-v1';
const din = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const t = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nv = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const uid = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const quando = (o) => (o === 0 ? 'hoje' : o === 1 ? 'amanhã' : o === -1 ? 'ontem' : o < 0 ? `há ${-o} dias` : `em ${o} dias`);
const zap = (tel, m) => `https://wa.me/55${String(tel).replace(/\D/g, '')}?text=${encodeURIComponent(m)}`;
const $ = (s) => document.querySelector(s);
const FASES = [['novo', 'Primeiro contato', '#9db7c9'], ['conversa', 'Conversando', '#647d72'], ['proposta', 'Proposta enviada', '#c9b99a'], ['fechando', 'Fechando', '#1c3557']];

function inicio() {
  const N = (nome, empresa, tel, cidade, valor, etapa, passo, dia, visita = false, nota = '') => ({ id: uid(), nome, empresa, tel, cidade, valor, etapa, prox: { o: passo, dia }, visita, notas: nota ? [{ dia: -3, t: nota }] : [] });
  const negocios = [
    N('Ricardo Alves', 'Elétrica Alves', '31991110001', 'Contagem', 18400, 'proposta', 'Cobrar retorno da proposta de luminárias LED', -2, false, 'Pediu 5% de desconto para fechar o pedido do trimestre.'),
    N('Simone Prado', 'Construtora Prado', '31991110002', 'Belo Horizonte', 42000, 'fechando', 'Confirmar prazo de entrega da obra do Buritis', 0, true, 'Obra começa dia 10; quer entrega parcelada.'),
    N('Hélio Matos', 'Matos Materiais', '31991110003', 'Betim', 7600, 'conversa', 'Mandar catálogo novo de refletores', 0),
    N('Carla Junqueira', 'Arquitetura CJ', '31991110004', 'Nova Lima', 12900, 'proposta', 'Ligar para saber se o cliente dela aprovou', -1, true),
    N('Paulo Fonseca', 'Loja do Eletricista', '31991110005', 'Sabará', 5200, 'novo', 'Primeira visita: apresentar a linha', 0, true),
    N('Ana Beatriz Lobo', 'Hotel Lobo', '31991110006', 'Belo Horizonte', 31500, 'conversa', 'Agendar visita técnica no hotel', -4, false, 'Trocar toda a iluminação dos 60 quartos.'),
    N('Vinícius Reis', 'Reis Engenharia', '31991110007', 'Contagem', 22800, 'fechando', 'Mandar contrato para assinatura', 1),
    N('Luciana Torres', 'Torres Decor', '31991110008', 'Belo Horizonte', 3900, 'novo', 'Responder pedido de preço do Instagram', 2),
    N('Jorge Batista', 'JB Instalações', '31991110009', 'Ibirité', 9700, 'proposta', 'Enviar proposta revisada', 4),
  ];
  const fechados = [['Mercado Bom Dia', 14200, 'ganho', -6], ['Escola Sol Nascente', 8800, 'ganho', -12], ['Clínica Vida', 11300, 'perdido', -9], ['Padaria Trigo Fino', 4600, 'ganho', -15]].map(([empresa, valor, etapa, dia]) => ({ id: uid(), nome: empresa, empresa, tel: '', cidade: '', valor, etapa, prox: null, quando: dia, notas: [] }));
  return { vendedor: 'Marcos Teixeira', ramo: 'representante comercial · iluminação', meta: 60000, comissao: 5, negocios: [...negocios, ...fechados], feitosHoje: 0, plano: 'basico', ajudantes: [{ nome: 'Júlia (assistente)', ve: { valores: false, contatos: true, metas: false } }], assinatura: { valor: 59, status: 'ativa', renova: true, proxima: 14, pagos: [-16, -46, -76] }, conversa: [] };
}
let db = (() => { if (new URLSearchParams(location.search).has('novo')) localStorage.removeItem(CHAVE); try { return JSON.parse(localStorage.getItem(CHAVE)) || inicio(); } catch { return inicio(); } })();
window.veltriaDados = () => db; // modo conta: começar do zero e resumo para a IA
const grava = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { aviso('Sem espaço no celular.'); } };
const neg = (id) => db.negocios.find((n) => n.id === id);
const abertos = () => db.negocios.filter((n) => !['ganho', 'perdido'].includes(n.etapa));
const baralho = () => abertos().filter((n) => n.prox && n.prox.dia <= 0).sort((a, b) => a.prox.dia - b.prox.dia || b.valor - a.valor);
const fase = (k) => FASES.find((f) => f[0] === k) || ['', k, '#999'];
const vendido = () => db.negocios.filter((n) => n.etapa === 'ganho').reduce((s, n) => s + n.valor, 0);
const estAss = () => { const a = db.assinatura; return a.status === 'vencida' ? 'vencida: pague para continuar' : a.renova ? `ativa · próxima em ${a.proxima} dias` : `cancelada · usa por mais ${a.proxima} dias`; };

function aviso(m) { const a = document.createElement('div'); a.className = 'aviso'; a.textContent = m; $('#avisos').append(a); setTimeout(() => a.remove(), 3200); }
function folha(html, liga) {
  const v = document.createElement('div'); v.className = 'veu'; v.innerHTML = `<div class="folha" role="dialog" aria-modal="true">${html}</div>`;
  const antes = document.activeElement; document.body.append(v);
  const fecha = () => { v.remove(); antes?.focus?.(); };
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fecha]')) fecha(); });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecha(); });
  setTimeout(() => (v.querySelector('textarea, input, select') || v.querySelector('button'))?.focus(), 40);
  liga?.(v.querySelector('.folha'), fecha);
}

// ------------------------------------------------------------------ telas
const ABAS = [['hoje', 'Hoje'], ['funil', 'Funil'], ['contatos', 'Contatos'], ['rota', 'Rota'], ['meta', 'Meta'], ['mais', 'Mais']];
const T = {
  hoje() {
    const b = baralho(), total = b.length + db.feitosHoje;
    if (!b.length) return `<div class="fim-dia"><b>Baralho zerado.</b><p class="sub">${db.feitosHoje} retorno(s) feitos hoje. Amanhã tem ${abertos().filter((n) => n.prox?.dia === 1).length} na fila.</p><a class="bt cheio" href="#funil">Ver o funil</a></div>`;
    const carta = (n, cls) => `<article class="carta ${cls}" ${cls === 'topo' ? 'aria-live="polite"' : 'aria-hidden="true"'}><span class="etapa">${t(fase(n.etapa)[1])}</span><div class="quem">${t(n.nome)}</div><div class="empresa">${t(n.empresa)} · ${t(n.cidade)}</div><div class="valor">${din(n.valor)}</div>
      <div class="passo"><small>Próximo passo · ${n.prox.dia < 0 ? `<span class="atraso">atrasado ${-n.prox.dia} dia(s)</span>` : 'hoje'}</small>${t(n.prox.o)}</div>${n.notas.length ? `<p class="mini" style="margin:0 0 12px">Última anotação: ${t(n.notas[n.notas.length - 1].t)}</p>` : ''}
      ${cls === 'topo' ? `<div class="acoes-c"><a class="bt trigo" target="_blank" rel="noopener" href="${zap(n.tel, `Oi, ${n.nome.split(' ')[0]}! Aqui é o ${db.vendedor.split(' ')[0]}. ${n.prox.o.startsWith('Cobrar') ? 'Conseguiu olhar a proposta que te mandei?' : 'Tudo bem? Passando para darmos sequência.'}`)}">WhatsApp</a><a class="bt" href="tel:+55${n.tel}">Ligar</a><button type="button" class="bt cheio" data-acao="feito" data-n="${n.id}" style="grid-column:1/-1">Feito: marcar o próximo passo</button><button type="button" class="bt ganho" data-acao="ganhou" data-n="${n.id}">Fechou</button><button type="button" class="bt perda" data-acao="perdeu" data-n="${n.id}">Perdeu</button><button type="button" class="bt pq" data-acao="pular" data-n="${n.id}" style="grid-column:1/-1;border-style:dashed">Deixar para amanhã</button></div>` : ''}</article>`;
    return `<h1>Para procurar hoje</h1><p class="sub">${b.length} cliente(s) · ${din(b.reduce((s, n) => s + n.valor, 0))} em jogo. Resolva a carta de cima.</p>
      <div class="progresso-b" aria-label="${db.feitosHoje} de ${total} feitos">${Array.from({ length: total }, (_, i) => `<i class="${i < db.feitosHoje ? 'f' : i === db.feitosHoje ? 'a' : ''}"></i>`).join('')}</div>
      <div class="mesa">${b.slice(0, 3).map((n, i) => carta(n, ['topo', 'atras-1', 'atras-2'][i])).reverse().join('')}</div>`;
  },
  funil() {
    return `<h1>Funil</h1><p class="sub">${abertos().length} negócios abertos · ${din(abertos().reduce((s, n) => s + n.valor, 0))}. Toque para mudar de fase.</p><div class="trilha">${FASES.map(([k, nome, c]) => { const l = abertos().filter((n) => n.etapa === k); return `<section class="fase" style="--c:${c}"><h2><span>${nome}</span><span>${din(l.reduce((s, n) => s + n.valor, 0))}</span></h2><div class="cartao">${l.map((n) => `<div class="item" data-ficha="${n.id}" role="button" tabindex="0"><span><b>${t(n.empresa)}</b><small>${t(n.nome)} · próximo: ${n.prox ? `${t(n.prox.o)} (${quando(n.prox.dia)})` : '—'}</small></span><span>${din(n.valor)}</span></div>`).join('') || '<p class="mini" style="margin:0">Vazio.</p>'}</div></section>`; }).join('')}</div>`;
  },
  contatos() {
    return `<h1>Contatos</h1><button type="button" class="bt cheio largo" data-acao="novo">+ Novo contato</button><p class="mini" style="text-align:center">Na versão instalada dá para puxar o contato direto da agenda do celular.</p>
      <div class="cartao">${[...db.negocios].sort((a, b) => a.nome.localeCompare(b.nome)).map((n) => `<div class="item" data-ficha="${n.id}" role="button" tabindex="0"><span><b>${t(n.nome)}</b><small>${t(n.empresa)}${n.cidade ? ` · ${t(n.cidade)}` : ''}</small></span><span class="etq ${n.etapa === 'ganho' ? 'ok' : n.etapa === 'perdido' ? 'ru' : n.etapa === 'fechando' ? 'q' : ''}">${n.etapa === 'ganho' ? 'cliente' : n.etapa === 'perdido' ? 'perdido' : t(fase(n.etapa)[1])}</span></div>`).join('')}</div>`;
  },
  rota() {
    const l = abertos().filter((n) => n.visita);
    const mapa = `https://www.google.com/maps/dir/${l.map((n) => encodeURIComponent(`${n.empresa}, ${n.cidade}, MG`)).join('/')}`;
    return `<h1>Rota de hoje</h1><p class="sub">${l.length} visita(s). O app põe na ordem e abre o caminho no mapa.</p>${l.length ? `<a class="bt cheio largo" target="_blank" rel="noopener" href="${mapa}">Abrir a rota no mapa</a>` : ''}
      <div class="cartao" style="margin-top:12px">${l.map((n, i) => `<div class="item"><span><b>${i + 1}. ${t(n.empresa)}</b><small>${t(n.cidade)} · ${t(n.prox?.o || '')}</small></span><button type="button" class="bt pq" data-acao="visitei" data-n="${n.id}">Visitei</button></div>`).join('') || '<p class="mini" style="margin:0">Nenhuma visita marcada para hoje.</p>'}</div>
      <p class="mini">Marque "visita" na ficha do cliente para ele entrar na rota.</p>`;
  },
  meta() {
    const v = vendido(), falta = Math.max(0, db.meta - v), ticket = v / Math.max(1, db.negocios.filter((n) => n.etapa === 'ganho').length), conv = db.negocios.filter((n) => n.etapa === 'ganho').length / Math.max(1, db.negocios.filter((n) => ['ganho', 'perdido'].includes(n.etapa)).length), propostas = ticket > 0 && conv > 0 ? Math.ceil(falta / ticket / conv) : 0;
    return `<h1>Meta do mês</h1><div class="cartao"><small class="mini">Vendido</small><p class="grande">${din(v)}</p><div class="medidor"><i style="width:${Math.min(100, v / db.meta * 100)}%"></i></div><p class="mini" style="margin:0">${Math.round(v / db.meta * 100)}% de ${din(db.meta)} · comissão até agora: <b>${din(v * db.comissao / 100)}</b></p></div>
      ${falta ? `<div class="cartao"><b>Faltam ${din(falta)}</b><p class="mini" style="margin:4px 0 0">Com seu ticket médio (${din(ticket)}) e fechando ${Math.round(conv * 100)}% do que propõe, você precisa de mais <b>${propostas} propostas</b> este mês. No funil há ${abertos().filter((n) => ['proposta', 'fechando'].includes(n.etapa)).length} em proposta ou fechando.</p></div>` : '<div class="cartao"><b>Meta batida!</b></div>'}
      <h2>Fechados no mês</h2><div class="cartao">${db.negocios.filter((n) => ['ganho', 'perdido'].includes(n.etapa)).map((n) => `<div class="item"><span>${t(n.empresa)}<small>${n.quando !== undefined ? quando(n.quando) : 'hoje'}</small></span><span class="etq ${n.etapa === 'ganho' ? 'ok' : 'ru'}">${n.etapa === 'ganho' ? din(n.valor) : 'perdido'}</span></div>`).join('')}</div>`;
  },
  mais() {
    const l = [['ia', 'Assistente', 'pergunte sobre seus clientes e a meta'], ['assinatura', 'Minha assinatura', estAss()], ['dono', 'Painel do dono', 'quem te ajuda e o que vê'], ['config', 'Configurações', 'nome, meta, comissão']];
    return `<h1>Mais</h1><div class="lista-mais">${l.map(([k, n, s]) => `<a href="#${k}"><span><b>${n}</b><small>${t(s)}</small></span><span aria-hidden="true">›</span></a>`).join('')}</div>`;
  },
  ia() {
    const conv = db.conversa.length ? db.conversa : [{ ia: 1, t: `Oi, ${db.vendedor.split(' ')[0]}! Eu vejo seu funil, o baralho e a meta. Pergunte do seu jeito. Na versão contratada são 20 perguntas grátis por dia.` }];
    return `<a href="#mais">← Mais</a><h1>Assistente</h1><div class="papo">${conv.map((m) => `<div class="fala ${m.ia ? 'ia' : 'eu'}">${t(m.t)}</div>`).join('')}</div>
      <div class="chips">${['Quem eu procuro primeiro?', 'Vou bater a meta?', 'Qual negócio está esfriando?', 'Escreva a cobrança da proposta do Ricardo'].map((s) => `<button type="button" data-sug="${t(s)}">${t(s)}</button>`).join('')}</div>
      <form class="form-ia" id="f-ia"><input id="q-ia" placeholder="Pergunte" aria-label="Pergunta"><button class="bt cheio">Enviar</button></form>`;
  },
  assinatura() {
    const a = db.assinatura;
    const topo = a.status === 'vencida' ? `<div class="cartao" style="border-color:var(--perda)"><b style="color:var(--perda)">Assinatura vencida</b><p class="mini" style="margin:4px 0 0">O pagamento de ${din(a.valor)} não foi aprovado. Seus clientes e o funil estão guardados.</p></div>`
      : a.renova ? `<div class="cartao"><b>Ativa</b><p class="mini" style="margin:4px 0 0">Plano Assinatura · ${din(a.valor)} por mês · próxima cobrança em ${a.proxima} dias.</p></div>`
        : `<div class="cartao" style="border-color:var(--trigo)"><b>Cancelada</b><p class="mini" style="margin:4px 0 0">Você usa tudo por mais ${a.proxima} dias. Depois disso nada mais é cobrado.</p></div>`;
    return `<a href="#mais">← Mais</a><h1>Minha assinatura</h1><p class="sub">A mesma da sua conta no site. Sem fidelidade.</p>${topo}
      <div class="linha">${a.status === 'vencida' ? '<button type="button" class="bt cheio" data-acao="pagar">Pagar aqui no app</button><a class="bt" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a>' : a.renova ? '<button type="button" class="bt" data-acao="cancelar">Cancelar assinatura</button>' : '<button type="button" class="bt cheio" data-acao="reativar">Reativar</button>'}</div>
      <h2>Pagamentos</h2><div class="cartao">${a.pagos.map((d) => `<div class="item"><span>Mensalidade<small>${quando(d)}</small></span><span>${din(a.valor)}</span></div>`).join('')}</div>`;
  },
  dono() {
    return `<a href="#mais">← Mais</a><h1>Painel do dono</h1><p class="sub">Quem te ajuda entra com o próprio celular e só vê o que você deixar.</p>
      ${db.ajudantes.map((p, i) => `<div class="cartao"><b>${t(p.nome)}</b>${[['contatos', 'Ver e cadastrar contatos'], ['valores', 'Ver valores dos negócios'], ['metas', 'Ver meta e comissão']].map(([k, n]) => `<label style="display:flex;justify-content:space-between;padding:8px 0">${n}<input type="checkbox" data-ve="${i}.${k}" ${p.ve[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--alp)"></label>`).join('')}</div>`).join('')}
      <button type="button" class="bt largo" data-acao="ajudante">+ Convidar ajudante</button>
      <h2>Plano</h2><div class="chips"><button type="button" data-plano="basico" aria-pressed="${db.plano === 'basico'}">Assinatura · R$ 59/mês</button></div><p class="mini">Equipe sem limite, histórico de quem fez o quê e até 10 empresas. Anual com 20% a menos.</p>`;
  },
  config() {
    return `<a href="#mais">← Mais</a><h1>Configurações</h1><label class="campo">Seu nome<input data-cfg="vendedor" value="${t(db.vendedor)}"></label><label class="campo">O que você vende<input data-cfg="ramo" value="${t(db.ramo)}"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="campo">Meta do mês (R$)<input data-cfg="meta" inputmode="decimal" value="${db.meta}"></label><label class="campo">Comissão (%)<input data-cfg="comissao" type="number" value="${db.comissao}"></label></div><p class="mini">Funciona sem internet: o que você registrar na rua sobe quando a conexão voltar.</p>`;
  },
};

function ficha(id) {
  const n = neg(id);
  folha(`<h2>${t(n.empresa)}</h2><p class="sub">${t(n.nome)} · ${t(n.cidade || '')} · ${din(n.valor)}</p>${n.etapa === 'ganho' || n.etapa === 'perdido' ? '' : `<p class="mini">Fase</p><div class="chips">${FASES.map(([k, nome]) => `<button type="button" data-fase="${k}" aria-pressed="${n.etapa === k}">${nome}</button>`).join('')}</div>
    <label style="display:flex;justify-content:space-between;padding:6px 0 12px">Entra na rota de visitas<input type="checkbox" id="visita" ${n.visita ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--alp)"></label>`}
    <h2>Anotações</h2><div class="cartao">${n.notas.map((x) => `<div class="item"><span>${t(x.t)}<small>${quando(x.dia)}</small></span></div>`).join('') || '<p class="mini" style="margin:0">Nenhuma.</p>'}</div><button type="button" class="bt largo" data-fecha>Fechar</button>`, (f, fecha) => {
    f.querySelectorAll('[data-fase]').forEach((b) => b.addEventListener('click', () => { n.etapa = b.dataset.fase; grava(); fecha(); mostra(); aviso(`${n.empresa}: ${fase(n.etapa)[1].toLowerCase()}.`); }));
    f.querySelector('#visita')?.addEventListener('change', (e) => { n.visita = e.target.checked; grava(); mostra(); });
  });
}
function sai(id, lado, depois) { const c = document.querySelector('.carta.topo'); if (c) { c.classList.add(lado); setTimeout(() => { depois(); grava(); mostra(); }, 280); } else { depois(); grava(); mostra(); } }
const ACOES = {
  feito: (d) => { const n = neg(d.n); folha(`<h2>O que aconteceu com ${t(n.nome.split(' ')[0])}?</h2><form><label class="campo">Anotação<textarea name="a" placeholder="Ex.: gostou, vai falar com o sócio"></textarea></label><label class="campo">Próximo passo<input name="p" required value="${t(n.prox.o)}"></label><p class="mini">Quando volto a procurar?</p><div class="chips">${[[1, 'amanhã'], [3, 'em 3 dias'], [7, 'em 1 semana'], [15, 'em 15 dias']].map(([v, l], i) => `<label style="display:inline-flex;gap:4px;align-items:center;border:1px solid #d6cbb6;border-radius:999px;padding:6px 12px;background:#fff"><input type="radio" name="d" value="${v}" ${i === 1 ? 'checked' : ''}>${l}</label>`).join('')}</div><button class="bt cheio largo">Guardar e ir para a próxima</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); if (x.get('a')) n.notas.push({ dia: 0, t: x.get('a') }); n.prox = { o: x.get('p'), dia: Number(x.get('d')) }; db.feitosHoje++; fecha(); sai(n.id, 'sai-dir', () => {}); aviso(`Próximo passo com ${n.nome.split(' ')[0]} ${quando(n.prox.dia)}.`); })); },
  ganhou: (d) => { const n = neg(d.n); sai(n.id, 'sai-dir', () => { n.etapa = 'ganho'; n.quando = 0; n.prox = null; db.feitosHoje++; }); aviso(`Fechou ${din(n.valor)}! Comissão de ${din(n.valor * db.comissao / 100)}.`); },
  perdeu: (d) => { const n = neg(d.n); folha(`<h2>Por que perdeu?</h2><div class="chips">${['Preço', 'Prazo', 'Comprou do concorrente', 'Desistiu da compra', 'Sem resposta'].map((m) => `<button type="button" data-motivo="${m}">${m}</button>`).join('')}</div>`, (f, fecha) => f.querySelectorAll('[data-motivo]').forEach((b) => b.addEventListener('click', () => { fecha(); sai(n.id, 'sai-esq', () => { n.etapa = 'perdido'; n.quando = 0; n.prox = null; n.notas.push({ dia: 0, t: `Perdido: ${b.dataset.motivo}` }); db.feitosHoje++; }); }))); },
  pular: (d) => { const n = neg(d.n); sai(n.id, 'sai-esq', () => { n.prox.dia = 1; }); },
  visitei: (d) => { const n = neg(d.n); n.visita = false; n.notas.push({ dia: 0, t: 'Visita feita' }); grava(); mostra(); aviso('Visita registrada.'); },
  novo: () => folha(`<h2>Novo contato</h2><form><label class="campo">Nome<input name="n" required></label><label class="campo">Empresa<input name="e"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="campo">WhatsApp<input name="t" inputmode="tel"></label><label class="campo">Cidade<input name="c"></label></div><label class="campo">Valor do negócio (R$)<input name="v" inputmode="decimal"></label><label class="campo">Primeiro passo<input name="p" value="Primeiro contato" required></label><button class="bt cheio largo">Guardar</button></form>`, (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const x = new FormData(e.target); db.negocios.push({ id: uid(), nome: x.get('n'), empresa: x.get('e') || x.get('n'), tel: x.get('t'), cidade: x.get('c'), valor: nv(x.get('v')), etapa: 'novo', prox: { o: x.get('p'), dia: 0 }, visita: false, notas: [] }); grava(); fecha(); location.hash = '#hoje'; mostra(); aviso('Contato no baralho de hoje.'); })),
  ajudante: () => folha('<h2>Convidar ajudante</h2><form><label class="campo">Nome<input name="n" required></label><button class="bt cheio largo">Mandar convite</button></form>', (f, fecha) => f.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); db.ajudantes.push({ nome: new FormData(e.target).get('n'), ve: { valores: false, contatos: true, metas: false } }); grava(); fecha(); mostra(); aviso('Convite enviado.'); })),
  pagar: () => folha(`<h2>Pagar ${din(db.assinatura.valor)}</h2><p class="sub">Escolha como pagar. Libera na hora.</p><div class="chips"><button type="button" aria-pressed="true">PIX</button><button type="button" aria-pressed="false">Cartão</button></div><div class="cartao"><p class="mini">PIX copia e cola (demonstração):</p><code style="word-break:break-all;font-size:.78rem">00020126580014BR.GOV.BCB.PIX0136bluerose-demo520400005303986540${db.assinatura.valor}.005802BR</code></div><button type="button" class="bt cheio largo" data-pago>Simular pagamento aprovado</button>`, (f, fecha) => f.querySelector('[data-pago]').addEventListener('click', () => { const a = db.assinatura; a.status = 'ativa'; a.renova = true; a.pagos.unshift(0); a.proxima = 30; grava(); fecha(); mostra(); aviso('Pagamento aprovado. Tudo liberado.'); })),
  cancelar: () => { if (confirm(`Cancelar? Você usa por mais ${db.assinatura.proxima} dias e nada mais é cobrado.`)) { db.assinatura.renova = false; grava(); mostra(); } },
  reativar: () => { db.assinatura.renova = true; grava(); mostra(); aviso('Assinatura reativada.'); },
};

function responde(p) {
  const x = sa(p), b = baralho();
  if (/primeiro|procur|prioridade/.test(x)) return b.length ? `Comece por ${b[0].nome} (${b[0].empresa}): ${din(b[0].valor)} e ${b[0].prox.dia < 0 ? `atrasado ${-b[0].prox.dia} dia(s)` : 'é para hoje'}. Depois ${b.slice(1, 3).map((n) => n.empresa).join(' e ')}.` : 'Seu baralho de hoje está zerado.';
  if (/meta|bater/.test(x)) { const v = vendido(), noFunil = abertos().filter((n) => ['proposta', 'fechando'].includes(n.etapa)).reduce((s, n) => s + n.valor, 0); return `Vendido: ${din(v)} de ${din(db.meta)}. Em proposta e fechando: ${din(noFunil)}. Se fechar metade disso, ${v + noFunil / 2 >= db.meta ? 'você bate a meta' : `ainda faltam ${din(db.meta - v - noFunil / 2)}`}.`; }
  if (/esfri|parad|frio/.test(x)) { const l = abertos().filter((n) => n.prox && n.prox.dia < -1); return l.length ? `Esfriando: ${l.map((n) => `${n.empresa} (${-n.prox.dia} dias sem retorno, ${din(n.valor)})`).join('; ')}. O Hotel Lobo é o maior: vale ligar hoje.` : 'Nada esfriando.'; }
  if (/ricardo|cobranc|proposta|escrev/.test(x)) return 'Mensagem pronta:\n\n"Oi, Ricardo! Conseguiu olhar a proposta das luminárias? Consegui segurar o preço até sexta e, fechando o trimestre, dou os 5% que você pediu. Te mando o pedido para assinar?"';
  return `Hoje: ${b.length} cliente(s) no baralho, ${din(b.reduce((s, n) => s + n.valor, 0))} em jogo.`;
}

// ------------------------------------------------------------------ navegação, trava e pagamento
function mostra() {
  const r = location.hash.slice(1) || 'hoje', tela = $('#tela');
  const aba = { ia: 'mais', assinatura: 'mais', dono: 'mais', config: 'mais' }[r] ?? r;
  $('#abas').innerHTML = ABAS.map(([k, n]) => `<a href="#${k}" ${k === aba ? 'aria-current="page"' : ''}>${n}${k === 'hoje' && baralho().length ? `<span class="n">${baralho().length}</span>` : ''}</a>`).join('');
  tela.innerHTML = (T[r] || T.hoje)();
  $('#vendedor').textContent = db.vendedor; const h = new Date().getHours(); $('#ola').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'} · ${db.ramo}`;
  if (!db.assinatura.renova && db.assinatura.status !== 'vencida' && r !== 'assinatura') tela.insertAdjacentHTML('afterbegin', `<p class="cartao" style="padding:8px 12px;background:#f3e3cf">Assinatura cancelada: você usa por mais ${db.assinatura.proxima} dias. <a href="#assinatura">Reativar</a></p>`);
  trava(r);
  document.title = `${(ABAS.find(([k]) => k === r) || [0, { ia: 'Assistente', assinatura: 'Minha assinatura', dono: 'Painel do dono', config: 'Configurações' }[r] || 'Hoje'])[1]} · Veltria CRM Essencial`;
}
addEventListener('hashchange', () => { mostra(); $('#tela').focus({ preventScroll: true }); scrollTo(0, 0); });
function trava(r) {
  document.querySelector('.trava')?.remove();
  if (db.assinatura.status !== 'vencida' || r === 'assinatura') return;
  const v = document.createElement('div'); v.className = 'veu trava';
  v.innerHTML = `<div class="folha" role="alertdialog" aria-modal="true" aria-labelledby="tr-t"><h2 id="tr-t">Sua assinatura venceu</h2><p class="sub">O pagamento não foi aprovado. Seus clientes, o funil e as anotações estão guardados: renove para continuar.</p><div style="display:grid;gap:8px"><button type="button" class="bt cheio largo" data-acao="pagar">Pagar aqui no app</button><a class="bt largo" target="_blank" rel="noopener" href="https://bluerose-store.com/conta.html">Renovar no site</a><a class="bt largo" href="#assinatura" style="border-style:dashed">Ver minha assinatura</a></div></div>`;
  document.body.append(v);
}

document.addEventListener('click', (e) => {
  const el = e.target;
  const ir = el.closest('[data-ir]'); if (ir) { location.hash = `#${ir.dataset.ir}`; return; }
  const fi = el.closest('[data-ficha]'); if (fi) { ficha(fi.dataset.ficha); return; }
  const sg = el.closest('[data-sug]'); if (sg) { $('#q-ia').value = sg.dataset.sug; $('#f-ia').requestSubmit(); return; }
  const pl = el.closest('[data-plano]'); if (pl) { db.plano = pl.dataset.plano; db.assinatura.valor = db.plano === 'pro' ? 119 : 59; grava(); mostra(); return; }
  const ac = el.closest('[data-acao]'); if (ac && ACOES[ac.dataset.acao]) ACOES[ac.dataset.acao](ac.dataset);
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.ficha) { e.preventDefault(); ficha(e.target.dataset.ficha); } });
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'f-ia') return; e.preventDefault();
  const p = $('#q-ia').value.trim(); if (p.length < 3) return;
  const resp = { ia: 1, t: window.veltriaIA ? 'Pensando…' : responde(p) }; db.conversa.push({ t: p }, resp); db.conversa = db.conversa.slice(-12); grava(); mostra(); if (window.veltriaIA) window.veltriaIA(p).then((t) => { resp.t = t; grava(); mostra(); }); scrollTo(0, document.body.scrollHeight);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.cfg) { db[el.dataset.cfg] = ['meta', 'comissao'].includes(el.dataset.cfg) ? nv(el.value) : el.value; grava(); mostra(); aviso('Salvo.'); }
  if (el.dataset.ve) { const [i, k] = el.dataset.ve.split('.'); db.ajudantes[i].ve[k] = el.checked; grava(); }
});
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.simular) return; const a = db.assinatura;
  if (e.data.simular === 'cancelar') { a.renova = false; a.status = 'ativa'; }
  if (e.data.simular === 'recusado') { a.status = 'vencida'; a.renova = true; }
  if (e.data.simular === 'normal') { db.assinatura = inicio().assinatura; db.plano = 'basico'; }
  grava(); mostra();
});
$('#recomecar').addEventListener('click', () => { localStorage.removeItem(CHAVE); db = inicio(); location.hash = '#hoje'; mostra(); aviso('Demonstração recomeçada.'); });
if (window !== window.top) document.documentElement.classList.add('no-celular');
if ('serviceWorker' in navigator && window === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
mostra();

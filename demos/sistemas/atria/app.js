// Atria · app de celular para quem trabalha com construção e reforma (pedreiro, azulejista, carpinteiro, marceneiro,
// eletricista, encanador, pintor, gesseiro e mais). Divulgar o trabalho (portfólio com antes e depois e postagem pronta para as redes),
// achar trabalho (mural do app e achados na internet), clientes e obras, orçamento, proposta, Pix, lista de materiais,
// lojas da cidade (OpenStreetMap), comparador de preços, dinheiro (lucro do dia, da semana e do mês) e ajuda automática.
// Dados no aparelho (localStorage); na conta, o conta-nuvem.js leva para a nuvem. ?novo recomeça a demonstração.
import { $, $$, t, sa, din, dinCurto, lerDin, uid, hoje, somaDias, dias, dataBR, dataCurta, haQuanto, quando, zap, abrirZap, av, ico, vibra, reduzido, db, carregar, grava, achar, toast, folha, folhaAtual, formulario, confirmar, copiar, comIA, repinta, ir, cab, CHAVE } from './base.js?v=12';
import { cena, TIPOS_CENA } from './cenas.js?v=12';
import { OFICIOS, ORDEM_OFICIOS, meusOficios, principal, nomeOficios, juntar } from './oficios.js?v=12';
import { TELAS as TG, ACOES as AG, totais, cliente, obrasAtivas, aReceber, economiaLista, somaPeriodo, intervalo, trena, grafico, mensagem, abrirMensagens, novaObra, cobrarPix, cadastrarPix, lancar, formCliente, ligarSeg, CENA_DO_OFICIO } from './gestao.js?v=12';
import { qrSVG } from '../base/qr.js';
import { instalarConceitos, CONCEITO } from './conceitos.js?v=12';
import { TELAS as TX, ACOES as AX, cartaoMei } from './extras.js?v=12';
import { ganchos } from './gestao.js?v=12';
import { ligarVoz } from './base.js?v=12';
import { abrirPostar, abrirFunil, legendaModelo, DESTINOS } from './postar.js?v=12';
import * as MAIS from './mais.js?v=12';
import { ehVideo, guardarArquivoVideo, htmlVideo, ligarVideos, listarVideos, apagarVideo, mb, LIMITE_S, LIMITE_MB } from './midia.js?v=12';


// ================================================================== telas e ações
const TELAS = { ...TG, ...TX };
const ACOES = { ...AG, ...AX };
ganchos.mei = cartaoMei;
Object.assign(TELAS, MAIS.TELAS); Object.assign(ACOES, MAIS.ACOES);

// ------------------------------------------------------------------ plano Pro (12/11/2026)
// Básico (R$ 39): tudo, menos Achar trabalho (achados na internet) e lojas e preços. Pro (R$ 50): tudo, com 50
// atualizações do Achar trabalho por mês. Na conta, o plano vem da empresa (conta-nuvem.js: window.atriaPlano);
// na demonstração fica tudo liberado, com o selo "Pro" nesses itens.
const ehPro = () => !window.atriaPlano || window.atriaPlano === 'pro';
const SELO_PRO = '<span class="selo-pro" aria-label="do plano Pro">Pro</span>';
const LINK_PRO = '../../../app/atria/?plano=pro';
function painelPro(nome) {
  return `<div class="cartao pro-trava" role="status"><span class="selo-pro grande">Atria Pro</span>
    <h3>${t(nome)} é do Atria Pro</h3><p><b>Disponível no Atria Pro — R$ 50/mês.</b> Tudo o que você já usa, mais:</p>
    <ul><li>${ico('lupa', 'width="18" height="18"')}Achar trabalho na internet: vagas, pedidos de orçamento e grupos da sua cidade (50 atualizações por mês)</li><li>${ico('loja', 'width="18" height="18"')}Lojas de material da cidade no mapa</li><li>${ico('moeda', 'width="18" height="18"')}Comparador de preços: onde cada material está mais barato</li></ul>
    <a class="bt cheio largo" href="${LINK_PRO}">${ico('estrela')}Mudar para o Pro</a><small>ou R$ 480 por ano (20% a menos). Sem fidelidade: o Básico é encerrado quando o Pro começar, sem cobrança em dobro.</small></div>`;
}
const abrirPro = (nome = 'Este recurso') => folha({ titulo: 'Atria Pro', corpo: painelPro(nome) });
[['lojas', 'Lojas', 'Lojas da cidade no mapa'], ['precos', 'Preços', 'Onde cada material está mais barato']].forEach(([k, tit, sub]) => {
  const orig = TELAS[k], montar = orig.montar;
  TELAS[k] = (...a) => (ehPro() ? orig(...a) : `${cab(tit, sub)}${painelPro(tit === 'Lojas' ? 'O mapa de lojas' : 'O comparador de preços')}`);
  if (montar) TELAS[k].montar = (...a) => { if (ehPro()) montar(...a); };
});
['ver-economia', 'aplicar-economia'].forEach((k) => { const f = ACOES[k]; if (f) ACOES[k] = (b) => (ehPro() ? f(b) : abrirPro('Comprar onde é mais barato')); });
ganchos.parcelas = MAIS.blocoParcelas; ganchos.rdo = MAIS.botaoRdo; ganchos.crono = MAIS.blocoCronograma; ganchos.etiquetas = MAIS.botaoEtiquetas; ganchos.desloc = MAIS.blocoDeslocamento; ganchos.gerarParcelas = MAIS.gerarParcelas;
const TOPO = ['inicio', 'comunidade', 'gestao'];
const tela = () => $('#tela');
const eu = () => db.perfil;
const avEu = (cls = '') => (eu().foto ? `<img class="av ${cls}" src="${eu().foto}" alt="" style="object-fit:cover">` : av(eu().nome, cls));
const icOf = (id) => (OFICIOS[id] ? OFICIOS[id].ic : 'ferramenta');
const nomeOf = (id) => (OFICIOS[id] ? OFICIOS[id].nome : String(id || '').replace(/^outro:/, ''));

// ------------------------------------------------------------------ início
function sugestoes() {
  const l = [], H = hoje();
  db.obras.filter((o) => o.status === 'orcamento' && o.orc.status === 'rascunho').forEach((o) => l.push({ p: 9, cor: 'cedro', ic: 'doc', txt: `<b>${t(o.titulo)}</b> ainda está sem orçamento enviado para ${t(cliente(o.cliente).nome.split(' ')[0])}.`, bt: ['Montar orçamento', `#orcamento/${o.id}`] }));
  db.obras.filter((o) => o.venceSaldo && o.venceSaldo < H && totais(o).saldo > 0).forEach((o) => l.push({ p: 10, cor: 'brasa', ic: 'alerta', txt: `<b>${t(cliente(o.cliente).nome)}</b> está devendo ${din(totais(o).saldo)} há ${dias(o.venceSaldo)} dias.`, bt: ['Lembrar no WhatsApp', null, { acao: 'mensagens', m: 'pagamento', o: o.id }] }));
  obrasAtivas().forEach((o) => { const e = economiaLista(o); if (e.total > 1000) { const it = e.itens.sort((a, b) => b.e - a.e)[0]; l.push({ p: 8, cor: 'musgo', ic: 'moeda', txt: `${t(it.m.nome.split(' (')[0])} está ${din(it.m.preco - it.b.preco)} mais barato na ${t(nomeLojaCurta(it.b.loja))}. Na lista de <b>${t(o.titulo)}</b> dá ${din(e.total)} de economia.`, bt: ['Ver a lista', `#materiais/${o.id}`] }); } });
  const meus = meusOficios(eu()).map((x) => x.id);
  db.pedidos.filter((p) => meus.includes(p.of) && !p.interesse && dias(p.data.slice(0, 10)) <= 1).slice(0, 1).forEach((p) => l.push({ p: 7, cor: 'giz', ic: 'sino', txt: `Pedido novo em ${t(p.cidade)}: <b>${t(p.titulo)}</b>.`, bt: ['Ver o pedido', `#trabalho/${p.id}`] }));
  db.obras.filter((o) => o.status === 'concluida' && !o.postado && dias(o.fim || H) < 40).slice(0, 1).forEach((o) => l.push({ p: 6, cor: 'trena', ic: 'antesdepois', txt: `Poste o antes e depois de <b>${t(o.titulo)}</b>: perfil com fotos recebe mais pedidos.`, bt: ['Postar agora', null, { acao: 'novo-post', o: o.id }] }));
  db.obras.forEach((o) => (o.agenda || []).filter((a) => a.data === somaDias(H, 1)).forEach((a) => l.push({ p: 7, cor: 'giz', ic: 'calendario', txt: `Amanhã às ${t(a.hora)}: <b>${t(a.nota)}</b> (${t(cliente(o.cliente).nome.split(' ')[0])}).`, bt: ['Confirmar com o cliente', null, { acao: 'mensagens', m: 'visita', o: o.id }] })));
  const [, fim] = intervalo('mes'), lm = somaPeriodo(`${H.slice(0, 7)}-01`, H).l, falta = eu().meta - lm, rest = dias(H, fim) + 1;
  if (falta > 0) l.push({ p: 5, cor: '', ic: 'grafico', txt: `Para bater a meta do mês faltam ${din(falta)}: ${din(Math.round(falta / rest))} por dia nos próximos ${rest} dias.`, bt: ['Ver o dinheiro', '#financeiro'] });
  // pós-obra: pedir avaliação e indicação; revisão perto do fim da garantia
  db.obras.filter((o) => o.status === 'concluida' && o.fim && dias(o.fim) >= 3 && dias(o.fim) <= 45 && !o.avaliacaoPedida).slice(0, 1).forEach((o) => l.push({ p: 8, cor: 'trena', ic: 'estrela', txt: `Peça a avaliação e uma indicação a <b>${t(cliente(o.cliente).nome.split(' ')[0])}</b>: ${t(o.titulo.toLowerCase())} foi entregue há ${dias(o.fim)} dias.`, bt: ['Pedir no WhatsApp', null, { acao: 'pedir-avaliacao', o: o.id }] }));
  db.obras.filter((o) => o.garantiaAte && dias(H, o.garantiaAte) >= 0 && dias(H, o.garantiaAte) <= 30 && !o.garantiaAvisada).slice(0, 1).forEach((o) => l.push({ p: 6, cor: '', ic: 'escudo', txt: `A garantia de <b>${t(o.titulo.toLowerCase())}</b> acaba em ${dias(H, o.garantiaAte)} dias. Um oi agora vira indicação.`, bt: ['Mandar mensagem', null, { acao: 'mensagens', m: 'garantia', o: o.id }] }));
  // MEI: DAS vence dia 20
  const dia = new Date().getDate(); if (dia >= 12 && dia <= 20 && !(db.dasPago || {})[H.slice(0, 7)]) l.push({ p: dia >= 18 ? 9 : 5, cor: dia >= 18 ? 'brasa' : '', ic: 'calendario', txt: `O DAS do MEI vence dia 20${dia >= 18 ? ` (faltam ${20 - dia} dias)` : ''}.`, bt: ['Já paguei', null, { acao: 'das-pago' }] });
  l.push(...MAIS.sugestoesParcelas(), ...MAIS.sugestoesEpi(), ...MAIS.sugestoesCronograma());
  const semana = new Date().getDay(), aPagar = (db.diarias || []).filter((x) => !x.pago).reduce((s, x) => s + x.valor, 0);
  if ((semana === 5 || semana === 6) && aPagar) l.push({ p: 9, cor: 'trena', ic: 'carrinho', txt: `Acerto dos ajudantes: <b>${din(aPagar)}</b> de diárias da semana.`, bt: ['Fazer o acerto', '#equipe'] });
  db.obras.filter((o) => o.status === 'andamento' && o.prazo && dias(H, o.prazo) >= 0 && dias(H, o.prazo) <= 3 && o.etapas.some((e) => !e.feito)).slice(0, 1).forEach((o) => { const ab = o.etapas.filter((e) => !e.feito).length; l.push({ p: 8, cor: 'brasa', ic: 'alerta', txt: `<b>${t(o.titulo)}</b> entrega ${quando(o.prazo)} e ainda tem ${ab} etapa${ab > 1 ? 's' : ''} aberta${ab > 1 ? 's' : ''}.`, bt: ['Ver a obra', `#obra/${o.id}`] }); });
  if (db.pix && db.pix.exemplo) l.push({ p: 4, cor: '', ic: 'pix', txt: 'Cadastre a sua chave Pix para cobrar com QR na hora.', bt: ['Cadastrar', null, { acao: 'chave-pix' }] });
  return l.sort((a, b) => b.p - a.p).slice(0, 4);
}
function nomeLojaCurta(id) { const l = achar('lojas', id); return l ? l.nome.replace(/ \(exemplo\)/, '') : 'outra loja'; }
const btSug = (s) => (s.bt[1] ? `<a class="bt leve p" href="${s.bt[1]}">${s.bt[0]}</a>` : `<button type="button" class="bt leve p" data-acao="${s.bt[2].acao}" data-m="${s.bt[2].m || ''}" data-o="${s.bt[2].o || ''}">${s.bt[0]}</button>`);
const ATALHO_FERR = { corte: ['#corte', 'chapa', 'Plano de corte'], traco: ['#calc/traco', 'carrinho', 'Traço'], blocos: ['#calc/blocos', 'tijolo', 'Blocos'], piso: ['#calc/piso', 'piso', 'Piso e rejunte'], tinta: ['#calc/tinta', 'rolo', 'Tinta'], eletrica: ['#modelo', 'raio', 'Pontos'] };

ACOES['pedir-avaliacao'] = (b) => { const o = achar('obras', b.dataset.o); if (o) { o.avaliacaoPedida = true; grava(); } abrirMensagens('avaliacao', b.dataset.o); };
ACOES.notifs = () => folha({ titulo: 'Avisos', corpo: `<div class="lista">${(db.notifs || []).map((n) => `<div class="linha" style="cursor:default"><span class="ic">${ico('coracao')}</span><span class="txt"><b style="white-space:normal">${t(n.txt)}</b><small>${haQuanto(n.data)}</small></span></div>`).join('') || '<p class="mudo">Nenhum aviso.</p>'}</div>` });
ACOES['chave-pix'] = () => cadastrarPix();

// ------------------------------------------------------------------ trabalhos: mural do app + achados na internet
let abaTrab = 'mural', filtroTrab = 'voce';
function cartaoPedido(p) {
  return `<a class="cartao pedido ${p.interesse ? 'feito' : ''}" href="#trabalho/${p.id}" style="display:block;text-decoration:none;color:inherit">
    <div class="mini">${cena(p.cena, 'antes', true)}</div><span class="tag ${p.interesse ? 'musgo' : 'giz'}">${ico(icOf(p.of), 'width="12" height="12" style="vertical-align:-1px"')} ${t(nomeOf(p.of))}</span> <span class="exemplo">exemplo</span>
    <h3>${t(p.titulo)}</h3><p>${t(p.desc.length > 90 ? `${p.desc.slice(0, 88)}…` : p.desc)}</p>
    <div class="meta">${ico('pin', 'width="14" height="14"')}${t(p.cidade)} · ${t(p.bairro)} · ${haQuanto(p.data)}${p.faixa ? ` · <b style="color:var(--grafite)">${t(p.faixa)}</b>` : ''}</div>
    <div class="faixa"><small class="mudo">Prazo: ${t(p.prazo)}</small>${p.interesse ? `<span class="tag musgo">${ico('ok', 'width="12" height="12" style="vertical-align:-1px"')} interesse enviado</span>` : `<span class="bt cheio p">Tenho interesse</span>`}</div></a>`;
}
TELAS.trabalhos = () => {
  const meus = meusOficios(eu()).map((x) => x.id), novos = (db.achados || []).filter((a) => a.novo).length;
  const presentes = [...new Set(db.pedidos.map((p) => p.of))];
  const lista = db.pedidos.filter((p) => (filtroTrab === 'todos' ? true : filtroTrab === 'voce' ? meus.includes(p.of) : p.of === filtroTrab)).sort((a, b) => b.data.localeCompare(a.data));
  const corpo = abaTrab === 'mural'
    ? `<div class="chips" role="group" aria-label="Filtrar por ofício"><button type="button" class="chip" data-acao="filtro-trab" data-f="voce" aria-pressed="${filtroTrab === 'voce'}">★ Para você<b>${db.pedidos.filter((p) => meus.includes(p.of)).length}</b></button>${presentes.map((k) => `<button type="button" class="chip" data-acao="filtro-trab" data-f="${k}" aria-pressed="${filtroTrab === k}">${t(nomeOf(k).split(' /')[0])}</button>`).join('')}<button type="button" class="chip" data-acao="filtro-trab" data-f="todos" aria-pressed="${filtroTrab === 'todos'}">Todos</button></div>
      <div class="lista" style="margin-top:8px">${lista.map(cartaoPedido).join('') || '<div class="vazio"><b>Nenhum pedido aqui</b>Puxe a tela para atualizar.</div>'}</div>
      <button type="button" class="bt leve largo" style="margin-top:12px" data-acao="publicar-pedido">${ico('mais')}Publicar um pedido de cliente</button>`
    : abaTrab === 'internet' ? telaAchados()
      : `<div class="lista">${db.pedidos.filter((p) => p.interesse).map(cartaoPedido).join('')}${Object.values(db.achadosSalvos || {}).map(cartaoAchado).join('') || ''}</div>${db.pedidos.some((p) => p.interesse) || Object.keys(db.achadosSalvos || {}).length ? '' : '<div class="vazio"><b>Nada salvo ainda</b>Os pedidos em que você tiver interesse e os achados salvos aparecem aqui.</div>'}`;
  return `${cab('Trabalhos', `${t(eu().cidade)} e região · ${eu().raio} km`, { dica: 'Mural: pedidos publicados por clientes dentro do Atria. Na internet: anúncios públicos da sua cidade achados por um buscador. Puxe a tela para baixo para atualizar.' })}
    <div class="puxar" data-puxar>${ico('recarregar')}<span>Solte para atualizar</span></div>
    <div class="seg" role="group" aria-label="Onde procurar" data-seg><button type="button" data-acao="aba-trab" data-a="mural" aria-pressed="${abaTrab === 'mural'}">Mural</button><button type="button" data-acao="aba-trab" data-a="internet" aria-pressed="${abaTrab === 'internet'}">Na internet ${SELO_PRO}${novos ? ` <span class="novo-badge">${novos}</span>` : ''}</button><button type="button" data-acao="aba-trab" data-a="meus" aria-pressed="${abaTrab === 'meus'}">Salvos</button><i></i></div>
    <div style="margin-top:12px">${corpo}</div>`;
};
ACOES['aba-trab'] = (b) => { abaTrab = b.dataset.a; if (abaTrab === 'internet' && !db.achados) buscarAchados(); repinta(); };
ACOES['filtro-trab'] = (b) => { filtroTrab = b.dataset.f; repinta(); };
ACOES['publicar-pedido'] = () => formulario({ titulo: 'Publicar pedido', rotulo: 'Publicar no mural',
  campos: [{ n: 'titulo', r: 'O que o cliente precisa', obrig: true }, { n: 'of', r: 'Ofício', tipo: 'sel', valor: principal(eu()).id, ops: ORDEM_OFICIOS.map((k) => [k, OFICIOS[k].nome]) }, { n: 'desc', r: 'Detalhes', tipo: 'area' }, { n: 'bairro', r: 'Bairro', meio: true }, { n: 'prazo', r: 'Prazo', meio: true, lista: ['urgente', 'esta semana', 'até 15 dias', 'até 30 dias'] }],
  salvar: (v) => { db.pedidos.unshift({ id: uid('j'), ...v, cidade: eu().cidade, faixa: '', cliente: 'Você', tel: '', data: new Date().toISOString().slice(0, 16), cena: CENA_DO_OFICIO[v.of] || 'muro', interesse: false }); grava(); repinta(); toast('Pedido no mural (na demonstração fica só neste celular)'); } });

TELAS.trabalho = (id) => {
  const p = achar('pedidos', id); if (!p) return cab('Pedido');
  return `${cab(t(p.titulo), `${t(p.cidade)} · ${haQuanto(p.data)}`)}
    <div class="cartao post" style="padding:0"><div class="post-midia">${cena(p.cena, 'antes')}</div><div style="padding:14px"><span class="tag giz">${t(nomeOf(p.of))}</span> <span class="exemplo">pedido de exemplo</span><p style="margin:10px 0">${t(p.desc)}</p>
      <div class="valores"><div><span>Bairro</span><b style="font-family:var(--f-txt)">${t(p.bairro)}</b></div><div><span>Prazo</span><b style="font-family:var(--f-txt)">${t(p.prazo)}</b></div>${p.faixa ? `<div><span>O cliente pensa em gastar</span><b>${t(p.faixa)}</b></div>` : ''}<div><span>Cliente</span><b style="font-family:var(--f-txt)">${t(p.cliente)}</b></div></div></div></div>
    <div class="acoes"><button type="button" class="bt zap" data-acao="interesse" data-id="${p.id}">${ico('zap')}${p.interesse ? 'Falar de novo' : 'Tenho interesse'}</button><button type="button" class="bt" data-acao="pedido-obra" data-id="${p.id}">${ico('doc')}Virar orçamento</button></div>
    <p class="mudo" style="font-size:12.5px">O endereço completo só aparece depois que o cliente responder. Na demonstração, a conversa no WhatsApp é simulada.</p>`;
};
ACOES.interesse = (b) => {
  const p = achar('pedidos', b.dataset.id); p.interesse = true; grava();
  folha({ titulo: 'Mensagem para o cliente', corpo: `<label class="campo"><span>Pode mudar à vontade</span><textarea data-t rows="7">${t(mensagem('achado', { extra: { titulo: p.titulo } }))}</textarea></label>`,
    pe: `<button type="button" class="bt leve p" data-ia>${ico('ia')}Outra versão</button><button type="button" class="bt zap" data-z>${ico('zap')}Abrir WhatsApp</button>`,
    aoAbrir: (f, api) => {
      let v = 0; $('[data-ia]', f).onclick = () => { v++; $('[data-t]', f).value = mensagem('achado', { extra: { titulo: p.titulo }, variante: v }); };
      $('[data-z]', f).onclick = () => { abrirZap(p.tel, $('[data-t]', f).value); api.fechar(); repinta(); };
    } });
};
ACOES['pedido-obra'] = (b) => { const p = achar('pedidos', b.dataset.id); novaObra({ titulo: p.titulo, cliente: p.cliente, tel: p.tel, oficio: p.of, tipo: p.cena, pedido: p.titulo }); };

// achados na internet: buscador (Google Programmable Search) pela função do servidor; na demonstração, exemplos
// que abrem a pesquisa de verdade no Google e no Facebook com a mesma consulta
const ORIGENS = { vaga: ['Vagas de emprego', '#2E7D5B', 'V'], pedidos: ['Pedidos de orçamento', '#F06A2B', 'P'], grupo: ['Grupo do Facebook', '#1877F2', 'f'], facebook: ['Facebook', '#1877F2', 'f'], olx: ['OLX', '#6E0AD6', 'O'], getninjas: ['GetNinjas', '#F06A2B', 'G'], google: ['Google', '#3C4043', 'G'], site: ['Site', '#2D5D7B', '•'] };
const consultaDe = (ofs, cidade) => `(${ofs.flatMap((o) => (OFICIOS[o] ? OFICIOS[o].busca : [`preciso de ${nomeOf(o).toLowerCase()}`])).slice(0, 6).map((q) => `"${q}"`).join(' OR ')}) "${cidade}"`;
const linkGoogle = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=qdr:w`;
const linkFacebook = (q) => `https://www.facebook.com/search/posts/?q=${encodeURIComponent(q.replace(/[()"]/g, '').replace(/ OR /g, ' '))}`;
function exemplosAchados(ofs, cidade) {
  const B = {
    pedreiro: [['facebook', 'Preciso de pedreiro para levantar muro de 15 metros', `Grupo Classificados ${cidade}: "Alguém indica pedreiro bom para muro de bloco? Material já comprado."`], ['olx', 'Procuro pedreiro para reforma de cozinha', `Anúncio em ${cidade}: reforma pequena, quebrar parede e rebocar. Pagamento por diária.`]],
    azulejista: [['facebook', 'Indicação de azulejista para banheiro', `Grupo Moradores de ${cidade}: "Preciso trocar o piso e o azulejo do banheiro, alguém indica? (16) 90000-0410"`], ['getninjas', 'Assentar porcelanato 60x60 em sala de 30 m²', `Pedido de orçamento em ${cidade}. Cliente com o piso comprado.`]],
    carpinteiro: [['facebook', 'Procuro carpinteiro para telhado', `Grupo de ${cidade}: trocar caibros e ripas de uma varanda.`]],
    marceneiro: [['google', 'Orçamento de móveis planejados', `Fórum de bairro de ${cidade}: cozinha e guarda-roupa sob medida.`]],
    eletricista: [['facebook', 'Eletricista urgente, chuveiro desarmando', `Grupo ${cidade} Urgente: "chuveiro novo desarma o disjuntor".`]],
    pintor: [['olx', 'Pintor para apartamento de 2 quartos', `${cidade}: pintura completa, paredes com massa.`]],
  };
  const out = [];
  ofs.forEach((o) => (B[o] || [['google', `Preciso de ${nomeOf(o).toLowerCase()}`, `Pedido público em ${cidade}.`]]).forEach(([orig, tit, tre], i) => {
    const q = consultaDe([o], cidade);
    out.push({ id: `a-${o}-${i}`, origem: orig, titulo: tit, trecho: tre, cidade, quando: new Date(Date.now() - (i * 7 + out.length * 3 + 1) * 36e5).toISOString(), link: orig === 'facebook' ? linkFacebook(q) : linkGoogle(q), exemplo: true, of: o });
  }));
  return out;
}
// ------------------------------------------------------------------ créditos do Achar trabalho
// 50 atualizações grátis por mês por pessoa (o que já foi buscado na cidade nas últimas 12 h não conta). Depois disso,
// ou quando o grátis de todos os assinantes do mês acaba, só com créditos pagos: Pix com QR na tela ou cartão no
// Mercado Pago (função atria-creditos). Os créditos entram sozinhos quando o pagamento é aprovado.
// Na demonstração tudo é simulado no aparelho e começa em 2 de 50, para mostrar o que acontece quando acaba.
const ehReal = () => typeof window.atriaAcharTrabalho === 'function';
const PACOTES_DEMO = [{ id: 'r10', valor: 10, qtd: 59 }, { id: 'r25', valor: 25, qtd: 149 }, { id: 'r50', valor: 50, qtd: 299 }];
const PEND = 'atria-credito-pendente';
let cred = null, travado = '', escolhaPac = 'r10';
const lerPend = () => { try { return localStorage.getItem(PEND) || ''; } catch { return ''; } };
const gravarPend = (id) => { try { if (id) localStorage.setItem(PEND, id); else localStorage.removeItem(PEND); } catch { /* sem acesso */ } };
function credDemo() {
  db.credDemo = db.credDemo || { usadas: 48, saldo: 0 };
  return { gratis_mes: 50, gratis_restantes: Math.max(0, 50 - db.credDemo.usadas), gratis_global_acabou: false, saldo: db.credDemo.saldo, pacotes: PACOTES_DEMO };
}
const podeBuscar = (c) => !!c && (c.gratis_restantes > 0 || c.saldo > 0);
const motivoTrava = (c) => `Suas ${(c && c.gratis_mes) || 50} atualizações deste mês acabaram; compre créditos para continuar.`;
function juntaCred(d) {
  if (!d) return;
  const n = {}; ['gratis_mes', 'gratis_restantes', 'gratis_global_acabou', 'saldo', 'pacotes'].forEach((k) => { if (d[k] !== undefined) n[k] = d[k]; });
  cred = { ...(cred || {}), ...n };
  travado = podeBuscar(cred) ? '' : travado || motivoTrava(cred); // sem grátis e sem crédito: a tela já abre travada
}
let credEm = 0;
async function carregarCred() {
  if (!ehPro() || Date.now() - credEm < 60e3) return; // no máximo 1 vez por minuto (a tela se redesenha muitas vezes)
  credEm = Date.now();
  const antes = JSON.stringify([cred, travado]);
  try { juntaCred(ehReal() ? await window.atriaCreditos.saldo() : credDemo()); } catch { /* sem conexão: fica como está */ }
  const pend = ehReal() && lerPend();
  if (pend) {
    try { const d = await window.atriaCreditos.conferir(pend); if (d.status === 'paga') liberado(d); else if (d.status !== 'pendente') gravarPend(''); } catch { /* confere depois */ }
  }
  if (JSON.stringify([cred, travado]) !== antes && rotaAtual().nome === 'trabalhos' && abaTrab === 'internet') setTimeout(repinta, 0);
}
function liberado(d) {
  gravarPend(''); juntaCred(d); travado = '';
  const f = folhaAtual(); if (f && f.el.dataset.pagamento) f.fechar();
  vibra(); toast(`Créditos liberados${d && d.qtd ? `: +${d.qtd} atualizações` : ''}`);
  if (rotaAtual().nome === 'trabalhos') repinta();
}
const precoBR = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
function blocoCreditos() {
  const c = cred; if (!c) return '';
  const linha = `<p class="mudo cred-linha" style="font-size:13px;margin:8px 0 0"><b style="color:var(--grafite)">${c.gratis_restantes} de ${c.gratis_mes}</b> do mês · <b style="color:var(--grafite)">${c.saldo}</b> ${c.saldo === 1 ? 'crédito' : 'créditos'} <button type="button" class="bt leve p" data-acao="comprar-creditos" style="margin-left:4px">${ico('moeda')}Comprar</button></p>`;
  if (!travado) return linha;
  const pacs = c.pacotes || PACOTES_DEMO;
  return `${linha}<div class="cartao trava-cred" role="status" style="margin-top:12px;border:2px solid var(--trena);text-align:center">
    <div aria-hidden="true" style="color:var(--trena)">${ico('lupa', 'width="34" height="34"')}</div>
    <h3 style="margin:6px 0 4px">As 50 atualizações do mês acabaram</h3>
    <p style="margin:0 0 12px;font-size:14px;color:var(--grafite2)">Você já usou as ${c.gratis_mes} atualizações do mês que vêm no Pro. Compre créditos para continuar buscando; no mês que vem as 50 voltam. Os botões do Google e do Facebook continuam valendo de graça.</p>
    ${opcoesPacotes(pacs)}
    <div class="acoes" style="justify-content:center"><button type="button" class="bt cheio" data-acao="pagar-creditos" data-forma="pix">${ico('pix')}Pagar com Pix</button><button type="button" class="bt leve" data-acao="pagar-creditos" data-forma="cartao">${ico('moeda')}Cartão</button></div>
    <p class="mudo" style="font-size:12px;margin:8px 0 0">1 crédito = 1 atualização. Os créditos não vencem e entram sozinhos quando o pagamento for aprovado.</p></div>`;
}
function opcoesPacotes(pacs) {
  if (!pacs.some((p) => p.id === escolhaPac)) escolhaPac = pacs[0].id;
  return `<div role="radiogroup" aria-label="Pacote de créditos" style="display:grid;grid-template-columns:repeat(${pacs.length},1fr);gap:8px;margin-bottom:12px">${pacs.map((p) => `<button type="button" class="chip" role="radio" data-acao="escolher-pacote" data-p="${t(p.id)}" aria-checked="${p.id === escolhaPac}" aria-pressed="${p.id === escolhaPac}" style="min-height:64px;border-radius:14px;padding:8px 4px;white-space:normal;text-align:center"><span style="display:block;font-family:var(--f-num);font-size:17px;font-weight:700">${precoBR(p.valor)}</span><span style="display:block;font-size:11.5px;font-weight:500;line-height:1.25;margin-top:2px">${p.qtd} atualizações</span></button>`).join('')}</div>`;
}
ACOES['escolher-pacote'] = (b) => { escolhaPac = b.dataset.p; const f = folhaAtual(); if (f && f.el.contains(b)) { $$('[data-acao="escolher-pacote"]', f.el).forEach((x) => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); } else repinta(); };
ACOES['comprar-creditos'] = () => abrirCreditos();
ACOES['pagar-creditos'] = (b) => pagarCreditos(escolhaPac, b.dataset.forma);
function abrirCreditos() {
  const c = cred || (ehReal() ? null : credDemo()); const pacs = (c && c.pacotes) || PACOTES_DEMO;
  folha({ titulo: 'Créditos de busca', corpo: `<p style="margin:0 0 10px">${c ? `Você tem <b>${c.gratis_restantes} de ${c.gratis_mes}</b> atualizações do mês e <b>${c.saldo}</b> ${c.saldo === 1 ? 'crédito' : 'créditos'}.` : ''} Cada crédito é uma atualização do Achar trabalho.</p>${opcoesPacotes(pacs)}
      <p class="explica"><b>Como funciona:</b> pague com Pix (o QR aparece aqui) ou com cartão no Mercado Pago. Quando o pagamento for aprovado, os créditos entram sozinhos e não vencem.${ehReal() ? '' : ' Na demonstração o pagamento é simulado.'}</p>`,
    pe: `<button type="button" class="bt leve" data-forma="cartao">${ico('moeda')}Cartão</button><button type="button" class="bt cheio" data-forma="pix" style="flex:2">${ico('pix')}Pagar com Pix</button>`,
    aoAbrir: (f) => { $$('[data-forma]', f).forEach((x) => { x.onclick = () => pagarCreditos(escolhaPac, x.dataset.forma); }); } });
}
let relogioPag = null;
async function pagarCreditos(pacoteId, forma) {
  const pacs = (cred && cred.pacotes) || PACOTES_DEMO, p = pacs.find((x) => x.id === pacoteId) || pacs[0];
  clearInterval(relogioPag);
  if (!ehReal()) { // demonstração: QR de mentira e aprovação em 4 segundos
    const api = folhaPagamento({ forma, p, qr_code: 'Pix de demonstração do Atria: nenhum valor é cobrado.', demo: true });
    relogioPag = setTimeout(() => { if (!api.el.isConnected) return; db.credDemo = db.credDemo || { usadas: 50, saldo: 0 }; db.credDemo.saldo += p.qtd; grava(); liberado({ ...credDemo(), qtd: p.qtd }); }, 4000);
    return;
  }
  let r;
  try { toast('Gerando o pagamento…'); r = await window.atriaCreditos.comprar(p.id, forma); } catch (e) { toast(e.message && e.message !== 'falhou' ? e.message : 'Não deu para gerar o pagamento agora. Tente de novo.', 'erro'); return; }
  gravarPend(r.id);
  if (forma === 'cartao' && r.link) window.open(r.link, '_blank', 'noopener');
  const api = folhaPagamento({ forma, p: { ...p, valor: r.valor, qtd: r.qtd }, ...r });
  const ate = Date.now() + (forma === 'pix' ? 3 : 10) * 60e3;
  const confere = async () => {
    if (!api.el.isConnected || Date.now() > ate) { clearInterval(relogioPag); const s = $('[data-status]', api.el); if (s) s.textContent = 'Ainda não chegou. Se você já pagou, os créditos entram sozinhos assim que o banco confirmar.'; return; }
    try { const d = await window.atriaCreditos.conferir(r.id); if (d.status === 'paga') { clearInterval(relogioPag); liberado(d); } else if (d.status !== 'pendente') { clearInterval(relogioPag); gravarPend(''); const s = $('[data-status]', api.el); if (s) s.textContent = 'Este pagamento foi cancelado ou expirou. Gere outro.'; } } catch { /* tenta de novo */ }
  };
  relogioPag = setInterval(confere, 5000);
}
function folhaPagamento({ forma, p, qr_code, qr_base64, link, id, demo }) {
  const pix = forma === 'pix';
  return folha({ titulo: pix ? 'Pagar com Pix' : 'Pagar com cartão',
    corpo: `<p style="margin:0 0 8px;text-align:center"><b style="font-size:20px">${precoBR(p.valor)}</b><br><span class="mudo">${p.qtd} atualizações do Achar trabalho</span></p>
      ${pix ? `<div style="display:grid;place-items:center;margin:8px 0 12px"><div data-qr style="background:#fff;padding:10px;border-radius:16px;box-shadow:var(--sombra);width:220px;height:220px">${qr_base64 ? `<img src="data:image/png;base64,${qr_base64}" alt="QR Code do Pix" width="200" height="200" style="display:block;width:200px;height:200px">` : qrSVG(qr_code, 200, '#2E333B')}</div></div>
      <p style="font-size:12px;margin:0 0 4px" class="mudo">Pix copia e cola</p><p class="num" style="font-size:11.5px;word-break:break-all;background:var(--aparas);border-radius:12px;padding:10px;margin:0">${t(qr_code)}</p>`
      : demo ? '<p class="explica"><b>Demonstração:</b> na sua conta, o Mercado Pago abre para você pagar com cartão e os créditos entram sozinhos quando for aprovado.</p>'
      : `<p class="explica"><b>O Mercado Pago abriu em outra aba.</b> Termine o pagamento lá e volte para cá: os créditos entram sozinhos.${link ? ` <a href="${t(link)}" target="_blank" rel="noopener noreferrer">Abrir de novo</a>` : ''}</p>`}
      <p data-status role="status" aria-live="polite" style="text-align:center;font-weight:600;margin:12px 0 0">${demo ? 'Demonstração: o pagamento vai ser aprovado em instantes…' : 'Aguardando o pagamento…'}</p>`,
    pe: `${pix ? `<button type="button" class="bt leve p" data-cancela>Cancelar</button><button type="button" class="bt cheio" data-copia style="flex:2">${ico('copiar')}Copiar código Pix</button>` : '<button type="button" class="bt cheio largo" data-fechar>Já paguei</button>'}`,
    aoAbrir: (f, api) => {
      f.dataset.pagamento = '1';
      const cc = $('[data-copia]', f); if (cc) cc.onclick = () => copiar(qr_code);
      const ca = $('[data-cancela]', f); if (ca) ca.onclick = async () => { clearInterval(relogioPag); api.fechar(); if (!demo && id) { gravarPend(''); try { await window.atriaCreditos.cancelar(id); } catch { /* expira sozinho em 30 min */ } } };
    },
    aoFechar: () => { if (forma !== 'pix' && !demo) setTimeout(() => { credEm = 0; carregarCred(); }, 1500); } });
}

let buscandoAchados = false, relogioAchados = null;
async function buscarAchados(manual) {
  if (buscandoAchados || !ehPro()) return;
  // demonstração: conta as atualizações tocadas (as automáticas não contam)
  if (!ehReal() && manual) {
    const c = credDemo();
    if (!podeBuscar(c)) { juntaCred(c); travado = motivoTrava(c); repinta(); abrirCreditos(); return; }
    if (c.gratis_restantes > 0) db.credDemo.usadas++; else { db.credDemo.saldo--; toast(`1 crédito usado · restam ${db.credDemo.saldo}`); }
    juntaCred(credDemo()); grava();
  }
  buscandoAchados = true;
  const cidade = db.buscaCidade || eu().cidade, ofs = (db.buscaOficios && db.buscaOficios.length ? db.buscaOficios : meusOficios(eu()).map((x) => x.id));
  let lista, erro = null;
  try {
    // na conta: função de servidor "achar-trabalho" (chave do buscador fica no servidor; cache por cidade para dividir a cota)
    if (ehReal()) lista = await window.atriaAcharTrabalho({ cidade, oficios: ofs, auto: !manual });
    else { await new Promise((ok) => setTimeout(ok, 700)); lista = exemplosAchados(ofs, cidade); }
  } catch (e) { lista = null; erro = e; }
  buscandoAchados = false;
  if (lista && lista.info) { juntaCred(lista.info); if (lista.info.pago) toast(`1 crédito usado · restam ${lista.info.saldo}`); }
  if (!lista) {
    const d = (erro && erro.dados) || {};
    if (d.precisa_pro) { if (rotaAtual().nome === 'trabalhos') repinta(); return; }
    if (d.precisa_creditos || d.auto) {
      juntaCred(d);
      if (d.precisa_creditos) { travado = d.erro || motivoTrava(cred); if (manual) abrirCreditos(); }
      if (rotaAtual().nome === 'trabalhos') repinta();
      return;
    }
    if (manual) toast(d.erro || 'Não deu para buscar agora. Tente de novo.', 'erro');
    return;
  }
  const antes = new Set((db.achados || []).map((a) => a.id)), vistos = db.achadosVistos || {};
  const unicos = []; const ja = new Set();
  lista.forEach((a) => { const k = a.link + a.titulo; if (ja.has(k)) return; ja.add(k); unicos.push({ ...a, novo: !antes.has(a.id) && !vistos[a.id] && !!db.achados }); });
  db.achados = unicos; db.achadosEm = new Date().toISOString(); grava();
  const n = unicos.filter((a) => a.novo).length;
  if (n) { toast(`${n} achado${n > 1 ? 's' : ''} novo${n > 1 ? 's' : ''} na internet`); avisoLocal(n); }
  else if (manual) toast('Atualizado');
  barraBadges(); if (rotaAtual().nome === 'trabalhos') repinta();
}
function avisoLocal(n) { try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('Atria', { body: `${n} trabalho${n > 1 ? 's' : ''} novo${n > 1 ? 's' : ''} achado${n > 1 ? 's' : ''} na sua cidade`, icon: 'icone-192.png?v=2' }); } catch { /* sem aviso */ } }
function cartaoAchado(a) {
  const [nome, cor, letra] = ORIGENS[a.origem] || ORIGENS.site, tel = (a.trecho.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/) || [])[0];
  const salvo = !!(db.achadosSalvos || {})[a.id], visto = !!(db.achadosVistos || {})[a.id];
  return `<article class="cartao achado ${visto ? 'visto' : ''}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="origem"><i style="background:${cor}">${letra}</i>${nome}</span><span>${a.novo ? '<span class="novo-badge">novo</span> ' : ''}${a.exemplo ? '<span class="exemplo">exemplo de achado</span>' : ''}</span></div>
    <h3>${t(a.titulo)}</h3><p style="margin:0 0 6px;font-size:13.5px;color:var(--grafite2)">${t(a.trecho)}</p><small class="mudo">${t(a.cidade)} · ${haQuanto(a.quando)}</small>
    <div class="acoes"><a class="bt cheio p" href="${t(a.link)}" target="_blank" rel="noopener noreferrer" data-acao="abriu-achado" data-id="${t(a.id)}">${ico('link')}Abrir anúncio</a>${tel ? `<button type="button" class="bt zap p" data-acao="zap-achado" data-tel="${t(tel)}" data-tit="${t(a.titulo)}">${ico('zap')}Responder</button>` : ''}<button type="button" class="bt leve p alterna" data-acao="salvar-achado" data-id="${t(a.id)}" aria-pressed="${salvo}" aria-label="${salvo ? 'Salvo: tocar para tirar dos salvos' : 'Salvar este trabalho'}">${ico('salvar')}${salvo ? 'Salvo' : 'Salvar'}</button><button type="button" class="bt leve p alterna" data-acao="visto-achado" data-id="${t(a.id)}" aria-pressed="${!!visto}">${ico(visto ? 'ok' : 'olho')}${visto ? 'Visto' : 'Já vi'}</button></div></article>`;
}
function telaAchados() {
  if (!ehPro()) return painelPro('O Achar trabalho');
  const cidade = db.buscaCidade || eu().cidade, ofs = db.buscaOficios && db.buscaOficios.length ? db.buscaOficios : meusOficios(eu()).map((x) => x.id), q = consultaDe(ofs, cidade);
  const real = typeof window.atriaAcharTrabalho === 'function';
  return `<p class="explica"><b>De onde vêm os achados:</b> o Atria procura na internet, para a sua cidade e o seu ofício, <b>vagas de emprego</b> (Indeed, BNE, Catho e outros), <b>sites de pedidos de orçamento</b> (GetNinjas, Cronoshare) e <b>grupos do Facebook</b> onde clientes pedem serviço. O Facebook não mostra os posts dos grupos para buscadores: toque em Abrir, entre no grupo e veja os pedidos. ${real ? 'O Pro tem 50 atualizações por mês; depois, créditos.' : 'Na demonstração os achados são exemplos, mas o botão abre a pesquisa de verdade no Google ou no Facebook com a mesma busca.'}</p>
    <div class="cartao"><div class="duas"><label class="campo"><span>Cidade</span><input data-busca-cid value="${t(cidade)}"></label><label class="campo"><span>Ofícios</span><input value="${t(ofs.map(nomeOf).join(', '))}" readonly data-acao="ofs-busca" style="cursor:pointer"></label></div>
      <small class="mudo" style="display:block;font-size:12px;word-break:break-word">Busca: <span class="num" style="font-size:11.5px">${t(q)}</span></small>
      <div class="acoes"><button type="button" class="bt p" data-acao="atualizar-achados">${ico('recarregar')}${buscandoAchados ? 'Buscando…' : 'Atualizar'}</button><a class="bt leve p" target="_blank" rel="noopener noreferrer" href="${linkGoogle(q)}">${ico('globo')}Google</a><a class="bt leve p" target="_blank" rel="noopener noreferrer" href="${linkFacebook(q)}">f Facebook</a><button type="button" class="bt leve p" data-acao="avisar-achados">${ico('sino')}Avisar</button></div></div>
    ${blocoCreditos()}
    <div class="lista" style="margin-top:12px">${db.achados ? db.achados.map(cartaoAchado).join('') || '<div class="vazio"><b>Nada achado agora</b>Tente outra cidade ou ofício.</div>' : '<div class="vazio"><b>Buscando…</b></div>'}</div>
    ${db.achadosEm ? `<p class="mudo" style="font-size:12px">Última busca ${haQuanto(db.achadosEm)}.</p>` : ''}`;
}
ACOES['atualizar-achados'] = () => { if (travado && !podeBuscar(cred)) abrirCreditos(); else buscarAchados(true); };
ACOES['abriu-achado'] = (a) => { (db.achadosVistos = db.achadosVistos || {})[a.dataset.id] = 1; const x = (db.achados || []).find((y) => y.id === a.dataset.id); if (x) x.novo = false; grava(); setTimeout(() => { barraBadges(); }, 50); return 'segue'; };
ACOES['visto-achado'] = (b) => { (db.achadosVistos = db.achadosVistos || {})[b.dataset.id] = 1; const x = (db.achados || []).find((y) => y.id === b.dataset.id); if (x) x.novo = false; grava(); barraBadges(); repinta(); };
ACOES['salvar-achado'] = (b) => { db.achadosSalvos = db.achadosSalvos || {}; const x = (db.achados || []).find((y) => y.id === b.dataset.id) || db.achadosSalvos[b.dataset.id]; if (db.achadosSalvos[b.dataset.id]) delete db.achadosSalvos[b.dataset.id]; else if (x) db.achadosSalvos[b.dataset.id] = { ...x, novo: false }; grava(); vibra(); repinta(); };
ACOES['zap-achado'] = (b) => abrirZap(b.dataset.tel, mensagem('achado', { extra: { titulo: b.dataset.tit } }));
ACOES['avisar-achados'] = async () => {
  if (!('Notification' in window)) { toast('Este navegador não mostra avisos. O número aparece na aba Trabalhos.'); return; }
  const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Pronto: quando chegar achado novo, o celular avisa.' : 'Sem permissão de aviso. O número continua aparecendo na aba.');
};
ACOES['ofs-busca'] = () => {
  const sel = new Set(db.buscaOficios && db.buscaOficios.length ? db.buscaOficios : meusOficios(eu()).map((x) => x.id));
  folha({ titulo: 'Buscar trabalho de', corpo: `<div class="chips" style="flex-wrap:wrap;overflow:visible">${ORDEM_OFICIOS.map((k) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${sel.has(k)}">${t(OFICIOS[k].nome)}</button>`).join('')}</div>`,
    pe: '<button type="button" class="bt cheio largo" data-ok>Buscar</button>',
    aoAbrir: (f, api) => { $$('[data-k]', f).forEach((b) => { b.onclick = () => { const k = b.dataset.k; if (sel.has(k)) sel.delete(k); else sel.add(k); b.setAttribute('aria-pressed', sel.has(k)); }; }); $('[data-ok]', f).onclick = () => { db.buscaOficios = [...sel]; db.achados = null; grava(); api.fechar(); repinta(); buscarAchados(true); }; } });
};

// ------------------------------------------------------------------ vitrine pessoal (portfólio só do profissional, sem rede social)
function comparador(antes, depois, rotulo = '') {
  return `<div class="ad" role="slider" tabindex="0" aria-label="Antes e depois${rotulo ? `: ${t(rotulo)}` : ''}. Arraste para comparar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><div class="ad-depois">${depois}</div><div class="ad-antes">${antes}</div><span class="rot a">Antes</span><span class="rot d">Depois</span><span class="ad-linha"></span><span class="ad-alca">${ico('antesdepois')}</span></div>`;
}
// foto ou vídeo (o vídeo fica no aparelho: midia.js); sem nenhum dos dois, a foto ilustrativa da cena
const slot = (foto, video, rot) => (video ? htmlVideo(video, foto, rot) : foto ? `<img src="${foto}" alt="${rot}">` : '');
function midiaPost(p) {
  if (p.tipo === 'ad') return comparador(slot(p.fotoAntes, p.videoAntes, 'Antes') || cena(p.cena, 'antes'), slot(p.fotoDepois, p.videoDepois, 'Depois') || cena(p.cena, 'depois'), p.texto.slice(0, 40));
  return slot(p.fotoDepois, p.videoDepois, t(p.texto.slice(0, 60))) || cena(p.cena, 'depois');
}
const meusPosts = () => db.posts.filter((p) => p.autor === 'eu').sort((a, b) => b.data.localeCompare(a.data));
let abaPerfil = 'ad';
const numBR1 = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
TELAS.comunidade = () => {
  const posts = meusPosts(), ofs = meusOficios(eu()), media = db.avaliacoes.reduce((s, a) => s + a.nota, 0) / db.avaliacoes.length;
  const feitas = db.obras.filter((o) => o.status === 'concluida').length, grade = posts.filter((x) => (abaPerfil === 'ad' ? x.tipo === 'ad' : x.tipo !== 'ad'));
  return `${cab('Vitrine', 'Seu portfólio de antes e depois', { voltar: false, dica: 'Aqui ficam só os seus trabalhos. Toque em Postar para mandar um antes e depois para o Instagram, o Facebook ou o Status do WhatsApp.' })}
    <div class="cartao vt-topo">${avEu('g')}<div class="vt-id"><b>${t(eu().nome)}</b><small>${t(ofs.map((o) => o.nome).join(' · '))}</small><small>${ico('pin', 'width="14" height="14" style="vertical-align:-2px"')} ${t(eu().cidade)} e até ${eu().raio} km</small></div></div>
    <button type="button" class="bt cheio largo" data-acao="postar-escolher" style="margin-top:10px;min-height:56px">${ico('partilhar')}Postar nas redes</button><div class="acoes" style="margin-top:8px"><button type="button" class="bt leve" data-acao="cartao">${ico('zap')}Cartão de visita</button><button type="button" class="bt leve" data-acao="editar-perfil">${ico('lapis')}Editar</button></div>
    <div class="stats"><div><b>${feitas}</b><small>obras feitas</small></div><div><b>${posts.length}</b><small>no portfólio</small></div><div><b>${numBR1(media)}</b><small>avaliação <span class="exemplo" style="font-size:9px;padding:2px 5px">exemplo</span></small></div></div>
    <div class="seg" role="group" data-seg><button type="button" data-acao="aba-perfil" data-a="ad" aria-pressed="${abaPerfil === 'ad'}">Antes e depois</button><button type="button" data-acao="aba-perfil" data-a="foto" aria-pressed="${abaPerfil === 'foto'}">Fotos e vídeos</button><button type="button" data-acao="aba-perfil" data-a="av" aria-pressed="${abaPerfil === 'av'}">Avaliações</button><i></i></div>
    <div style="margin-top:12px">${abaPerfil === 'av' ? `<div class="lista">${db.avaliacoes.map((a) => `<div class="cartao"><span class="estrelas" aria-label="${a.nota} estrelas">${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</span> <span class="exemplo">exemplo</span><p style="margin:6px 0">${t(a.txt)}</p><small class="mudo">${t(a.nome)} · ${dataBR(a.data)}</small></div>`).join('')}</div><p class="mudo" style="font-size:12px">Peça avaliação no WhatsApp quando terminar uma obra (mensagem pronta em Mensagens).</p>`
      : `${db.posts.some((x) => String(x.videoAntes || x.videoDepois || '').startsWith('idb:')) || (db.obras || []).some((o) => (o.diario || []).some((x) => x.video)) ? `<button type="button" class="bt leve p" data-acao="videos-aparelho" style="margin-bottom:10px">${ico('camera')}Vídeos no aparelho</button>` : ''}<div class="grade">${grade.map((x) => `<a href="#post/${x.id}" aria-label="${t(x.texto.slice(0, 50))}">${x.fotoDepois ? `<img src="${x.fotoDepois}" alt="">` : cena(x.cena, 'depois', true)}${x.tipo === 'ad' ? '<em>antes e depois</em>' : x.videoDepois ? '<em>vídeo</em>' : ''}</a>`).join('')}<button type="button" class="vt-novo" data-acao="novo-post" aria-label="Guardar novo antes e depois, foto ou vídeo">${ico('camera', 'width="30" height="30"')}<span>Novo</span></button></div>`}</div>`;
};
TELAS.perfil = () => TELAS.comunidade();
ACOES['aba-perfil'] = (b) => { abaPerfil = b.dataset.a; repinta(); };
// vídeos guardados neste aparelho: espaço usado e apagar (a capa continua no portfólio como foto)
ACOES['videos-aparelho'] = async () => {
  const lista = await listarVideos().catch(() => []), est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  const usado = lista.reduce((s, v) => s + v.tam, 0);
  const dono = (id) => { const ref = `idb:${id}`, p = db.posts.find((x) => x.videoAntes === ref || x.videoDepois === ref); if (p) return t(p.texto.slice(0, 50)); const o = (db.obras || []).find((x) => (x.diario || []).some((d) => d.video === ref)); return o ? `Diário: ${t(o.titulo)}` : 'Sem uso (pode apagar)'; };
  folha({ titulo: 'Vídeos no aparelho', corpo: `<p style="margin:0 0 10px">Os vídeos ficam só neste celular (não vão para a nuvem). Ocupam <b>${mb(usado)}</b>${est && est.quota ? ` de ${mb(est.quota)} livres para o app` : ''}.</p>
      <div class="lista">${lista.map((v) => `<div class="linha" style="cursor:default"><span class="ic">${ico('camera')}</span><span class="txt"><b style="white-space:normal">${dono(v.id)}</b><small>${mb(v.tam)}</small></span><button type="button" class="bt leve p" data-apaga="${t(v.id)}" style="color:var(--brasa)">${ico('lixo')}Apagar</button></div>`).join('') || '<p class="mudo">Nenhum vídeo guardado.</p>'}</div>`,
    aoAbrir: (f, api) => { $$('[data-apaga]', f).forEach((b) => { b.onclick = async () => {
      const id = b.dataset.apaga, ref = `idb:${id}`; await apagarVideo(id).catch(() => {});
      db.posts.forEach((p) => { if (p.videoAntes === ref) p.videoAntes = ''; if (p.videoDepois === ref) p.videoDepois = ''; });
      (db.obras || []).forEach((o) => (o.diario || []).forEach((d) => { if (d.video === ref) d.video = ''; }));
      grava(); api.fechar(true); toast('Vídeo apagado. A capa continua como foto.'); repinta(); ACOES['videos-aparelho']();
    }; }); } });
};
TELAS.post = (id) => {
  const p = achar('posts', id); if (!p) return cab('Trabalho');
  const o = p.obra ? achar('obras', p.obra) : null;
  return `${cab(o ? t(o.titulo) : 'Trabalho', `${t(nomeOf(p.of).split(' /')[0])} · ${dataBR(p.data.slice(0, 10))}`)}
    <article class="cartao post"><div class="post-midia">${midiaPost(p)}</div><p class="post-txt" style="white-space:pre-line">${t(p.texto)}</p><div style="height:10px"></div></article>
    ${p.postadoEm ? `<p class="mudo" style="font-size:13px">Já postado: ${Object.keys(p.postadoEm).map((k) => (DESTINOS[k] || {}).curto || k).join(', ')}</p>` : ''}
    <div class="acoes"><button type="button" class="bt cheio" data-acao="postar" data-id="${p.id}" style="flex:2">${ico('partilhar')}Postar nas redes</button><button type="button" class="bt leve" data-acao="funil" data-id="${p.id}">${ico('lista')}Funil</button></div>
    <button type="button" class="bt leve largo" style="margin-top:12px;color:var(--brasa)" data-acao="apagar-post" data-id="${p.id}">${ico('lixo')}Tirar do portfólio</button>`;
};
ACOES.postar = (b) => { const p = achar('posts', b.dataset.id); if (p) abrirPostar(p); };
ACOES.funil = (b) => abrirFunil(achar('posts', b.dataset.id));
ACOES['postar-escolher'] = () => {
  const l = meusPosts();
  if (!l.length) { ACOES['novo-post']({ dataset: {} }); return; }
  folha({ titulo: 'O que postar?', corpo: `<div class="grade" style="margin:0">${l.map((x) => `<button type="button" class="vt-esc" data-p="${x.id}">${x.fotoDepois ? `<img src="${x.fotoDepois}" alt="">` : cena(x.cena, 'depois', true)}</button>`).join('')}</div>`,
    pe: `<button type="button" class="bt leve largo" data-novo>${ico('camera')}Fotos novas</button>`,
    aoAbrir: (f, api) => { $$('[data-p]', f).forEach((x) => { x.onclick = () => { api.fechar(true); abrirPostar(achar('posts', x.dataset.p)); }; }); $('[data-novo]', f).onclick = () => { api.fechar(true); ACOES['novo-post']({ dataset: {} }); }; } });
};
ACOES['apagar-post'] = (b) => confirmar('Tirar do portfólio?', 'O trabalho sai da sua vitrine neste celular.', 'Tirar', () => { const i = db.posts.findIndex((x) => x.id === b.dataset.id), [p] = db.posts.splice(i, 1); grava(); ir('comunidade'); toast('Tirado do portfólio', 'ok', { rotulo: 'Desfazer', fazer: () => { db.posts.splice(i, 0, p); grava(); repinta(); } }); });
// cartão de visita: QR que abre o WhatsApp do profissional (funciona sem servidor)
ACOES.cartao = () => {
  const ofs = meusOficios(eu()), link = zap(eu().zap, `Oi, ${eu().apelido}! Vi seu cartão e queria um orçamento.`);
  folha({ titulo: 'Cartão de visita', corpo: `<div class="cartao-visita"><div><img class="cv-marca" src="simbolo-claro.svg?v=2" alt="" width="34" height="34"><h3>${t(eu().nome)}</h3><p>${t(ofs.map((x) => x.nome).join(' · '))}</p><p style="margin-top:8px;opacity:.85">${t(eu().cidade)}-${t(eu().uf)} · WhatsApp ${t(eu().zap)}</p><p style="margin-top:10px;color:var(--trena);font-weight:700">Aponte a câmera e fale comigo</p></div><div class="qr">${qrSVG(link, 92, '#2E333B')}</div></div>
      <p class="mudo" style="font-size:12.5px">O QR abre o seu WhatsApp com a mensagem pronta. Mostre na obra, imprima no adesivo do carro ou mande junto com o antes e depois.</p>`,
    pe: `<button type="button" class="bt leve p" data-c>${ico('copiar')}Copiar link</button><button type="button" class="bt zap" data-z>${ico('zap')}Mandar no WhatsApp</button>`,
    aoAbrir: (f) => { const txt = `${eu().nome} · ${ofs.map((x) => x.nome).join(', ')} em ${eu().cidade}.\nOrçamento sem compromisso: ${link}`; $('[data-c]', f).onclick = () => copiar(link); $('[data-z]', f).onclick = () => abrirZap('', txt); } });
};

// novo antes e depois (fica no portfólio; depois é só postar)
function lerFoto(arq, max = 1000) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.74)); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('foto')); }; img.src = url;
  });
}
ACOES['novo-post'] = (b) => {
  const o = b && b.dataset && b.dataset.o ? achar('obras', b.dataset.o) : null;
  let tipo = 'ad', antes = '', depois = '', vAntes = '', vDepois = '';
  const cenaBase = o ? o.tipo : CENA_DO_OFICIO[principal(eu()).id] || 'muro';
  const fotoDiario = o && (o.diario || []).find((x) => x.foto);
  folha({ titulo: o ? 'Guardar o antes e depois' : 'Novo trabalho',
    corpo: `<div class="seg" data-seg role="group"><button type="button" data-t="ad" aria-pressed="true">Antes e depois</button><button type="button" data-t="foto" aria-pressed="false">Foto ou vídeo</button><i></i></div>
      <div class="foto-campo" style="margin-top:12px"><label data-antes><b>Antes</b>${fotoDiario ? `<img src="${fotoDiario.foto}" alt="">` : cena(cenaBase, 'antes')}<input type="file" accept="image/*,video/*" capture="environment" data-f="antes" aria-label="Foto ou vídeo de antes"></label><label><b>Depois</b>${cena(cenaBase, 'depois')}<input type="file" accept="image/*,video/*" capture="environment" data-f="depois" aria-label="Foto ou vídeo de depois"></label></div>
      <p class="mudo" style="font-size:12px;margin:6px 0 10px">Toque para tirar a foto, gravar um vídeo curto (até ${LIMITE_S} s e ${LIMITE_MB} MB) ou escolher da galeria. Sem foto, a demonstração usa a foto ilustrativa.</p>
      <label class="campo"><span>Ofício</span><select data-of>${meusOficios(eu()).map((x) => `<option value="${x.id}" ${o && o.oficio === x.id ? 'selected' : ''}>${t(x.nome)}</option>`).join('')}</select></label>`,
    pe: `<button type="button" class="bt leve" data-so>Só guardar</button><button type="button" class="bt cheio" data-ok style="flex:2">${ico('partilhar')}Guardar e postar</button>`,
    aoAbrir: (f, api) => {
      if (fotoDiario) antes = fotoDiario.foto;
      ligarSeg($('[data-seg]', f), (bt) => { tipo = bt.dataset.t; $('[data-antes]', f).hidden = tipo !== 'ad'; });
      $$('[data-f]', f).forEach((inp) => { inp.onchange = async () => {
        const arq = inp.files[0]; if (!arq) return; const ehAntes = inp.dataset.f === 'antes', lab = inp.closest('label');
        try {
          let html;
          if (ehVideo(arq)) {
            toast('Preparando o vídeo…');
            const r = await guardarArquivoVideo(arq, uid('v'));
            if (ehAntes) { antes = r.capa; vAntes = r.video; } else { depois = r.capa; vDepois = r.video; }
            html = htmlVideo(r.video, r.capa, ehAntes ? 'Vídeo de antes' : 'Vídeo de depois');
          } else {
            const url = await lerFoto(arq);
            if (ehAntes) { antes = url; vAntes = ''; } else { depois = url; vDepois = ''; }
            html = `<img src="${url}" alt="">`;
          }
          lab.querySelectorAll(':scope > svg.cena, :scope > img, :scope > .cena-foto, :scope > .midia-v').forEach((x) => x.remove());
          lab.insertAdjacentHTML('beforeend', html);
        } catch (e) { toast(e && e.message && !/^foto$/.test(e.message) ? e.message : 'Não deu para ler esse arquivo', 'erro'); }
      }; });
      const salvar = (postar) => {
        const of = $('[data-of]', f).value, p = { id: uid('s'), autor: 'eu', of, tipo, cena: cenaBase, fotoAntes: tipo === 'ad' ? antes : '', fotoDepois: depois, videoAntes: tipo === 'ad' ? vAntes : '', videoDepois: vDepois, obra: o ? o.id : '', data: new Date().toISOString().slice(0, 16) };
        p.texto = legendaModelo(p);
        db.posts.unshift(p); if (o) o.postado = true; grava(); api.fechar(true); vibra(20);
        if (postar) abrirPostar(p); else { toast('Guardado no portfólio'); ir(`post/${p.id}`); }
      };
      $('[data-so]', f).onclick = () => salvar(false); $('[data-ok]', f).onclick = () => salvar(true);
    } });
};

// escolher ofícios (cadastro e perfil): vários, com busca, "outro" livre e o principal
function escolherOficios(caixa, sel, aoMudar) {
  let busca = '';
  const pinta = () => {
    const lista = ORDEM_OFICIOS.filter((k) => !busca || sa(OFICIOS[k].nome + OFICIOS[k].area).includes(sa(busca)));
    const outros = sel.filter((k) => !OFICIOS[k]);
    caixa.innerHTML = `<label class="busca" style="margin-bottom:10px">${ico('lupa')}<input data-b placeholder="Buscar ofício" value="${t(busca)}" aria-label="Buscar ofício"></label>
      <div class="grade-of">${[...lista.map((k) => [k, OFICIOS[k].nome, OFICIOS[k].ic]), ...outros.map((k) => [k, nomeOf(k), 'ferramenta'])].map(([k, n, ic]) => `<button type="button" class="of ${sel.includes(k) ? 'on' : ''}" data-k="${t(k)}" aria-pressed="${sel.includes(k)}">${ico(ic)}<span>${t(n)}</span>${sel[0] === k ? '<i>principal</i>' : ''}</button>`).join('')}
      <button type="button" class="of outro" data-outro>${ico('mais')}<span>Outro</span></button></div>
      ${sel.length > 1 ? `<p class="mudo" style="font-size:12.5px;margin:12px 0 6px">Qual é o principal? (a tela de início puxa por ele)</p><div class="chips" style="flex-wrap:wrap;overflow:visible">${sel.map((k, i) => `<button type="button" class="chip" data-pri="${t(k)}" aria-pressed="${i === 0}">${i === 0 ? '★ ' : ''}${t(nomeOf(k))}</button>`).join('')}</div>` : ''}`;
    const b = $('[data-b]', caixa); b.oninput = () => { busca = b.value; const p = b.selectionStart; pinta(); const n = $('[data-b]', caixa); n.focus(); n.setSelectionRange(p, p); };
    $$('[data-k]', caixa).forEach((x) => { x.onclick = () => { const k = x.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else sel.push(k); vibra(6); pinta(); aoMudar(sel); }; });
    $$('[data-pri]', caixa).forEach((x) => { x.onclick = () => { const k = x.dataset.pri; sel.splice(sel.indexOf(k), 1); sel.unshift(k); pinta(); aoMudar(sel); }; });
    $('[data-outro]', caixa).onclick = () => {
      const bt = $('[data-outro]', caixa); bt.outerHTML = '<span class="of-outro"><input data-outro-txt placeholder="Qual é o seu ofício?" aria-label="Outro ofício"><button type="button" class="bt cheio p" data-outro-ok>Pôr</button></span>';
      const i = $('[data-outro-txt]', caixa), ok = () => { const n = i.value.trim(); if (n) { sel.push(`outro:${n.slice(0, 40)}`); pinta(); aoMudar(sel); } };
      i.focus(); i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } }; $('[data-outro-ok]', caixa).onclick = ok;
    };
  };
  pinta();
}
ACOES['editar-perfil'] = () => {
  const sel = [...eu().oficios];
  formulario({ titulo: 'Seu perfil', rotulo: 'Salvar perfil',
    campos: [{ n: 'nome', r: 'Nome', obrig: true, valor: eu().nome }, { n: 'cidade', r: 'Cidade', meio: true, valor: eu().cidade }, { n: 'uf', r: 'Estado', meio: true, valor: eu().uf }, { n: 'zap', r: 'WhatsApp', tipo: 'tel', valor: eu().zap }, { n: 'bio', r: 'Sobre você', tipo: 'area', valor: eu().bio }, { n: 'raio', r: 'Atende até (km)', tipo: 'num', meio: true, valor: eu().raio }, { n: 'margem', r: 'Margem padrão no material (%)', tipo: 'num', meio: true, valor: eu().margem }],
    depois: (f) => { const d = document.createElement('div'); d.innerHTML = '<p class="campo" style="margin:0 0 6px"><span>O que você faz</span></p><div data-ofs></div><label class="campo" style="margin-top:12px"><span>Foto</span><input type="file" accept="image/*" data-foto></label>'; $('form', f).prepend(d); escolherOficios($('[data-ofs]', d), sel, () => {}); $('[data-foto]', d).onchange = async (e) => { const a = e.target.files[0]; if (a) { eu().foto = await lerFoto(a, 320); grava(); toast('Foto trocada'); } }; },
    salvar: (v) => { if (!sel.length) return 'Marque pelo menos um ofício.'; Object.assign(eu(), v, { apelido: v.nome.split(' ')[0], oficios: sel }); grava(); repinta(); toast('Perfil salvo: o app se ajustou aos seus ofícios'); } });
};

// ------------------------------------------------------------------ gestão (central)
TELAS.gestao = () => {
  const rec = aReceber().reduce((s, x) => s + x.v, 0), [a, b] = intervalo('mes'), m = somaPeriodo(a, b);
  return `${cab('Gestão', 'Obras, clientes, material e dinheiro', { voltar: false })}
    <a class="bloco largo escuro" href="#financeiro" data-tour="dinheiro"><span class="ic">${ico('moeda')}</span><span><b>Dinheiro</b><small>Lucro do mês ${din(m.l)} · a receber ${din(rec)}</small></span>${ico('setaDir', 'width="20" height="20"')}</a>
    <div class="mosaico" style="margin-top:10px">
      <a class="bloco" href="#obras"><span class="ic">${ico('capacete')}</span><span><b>Obras</b><small>${obrasAtivas().length} ativas · ${db.obras.filter((o) => o.status === 'orcamento').length} orçamentos</small></span></a>
      <a class="bloco" href="#agenda"><span class="ic">${ico('calendario')}</span><span><b>Agenda</b><small>${db.obras.flatMap((o) => o.agenda || []).filter((x) => x.data >= hoje()).length} marcados</small></span></a>
      <a class="bloco" href="#clientes"><span class="ic">${ico('gente')}</span><span><b>Clientes</b><small>${db.clientes.length} cadastrados</small></span></a>
      <a class="bloco" href="#equipe"><span class="ic">${ico('carrinho')}</span><span><b>Ajudantes</b><small>Diárias e pagamento</small></span></a>
      ${MAIS.BLOCOS_GESTAO}
      <a class="bloco" href="#listas"><span class="ic">${ico('lista')}</span><span><b>Material</b><small>Listas por obra</small></span></a>
      <a class="bloco" href="#lojas"><span class="ic">${ico('loja')}</span><span><b>Lojas ${SELO_PRO}</b><small>Mapa da cidade</small></span></a>
      <a class="bloco" href="#precos"><span class="ic">${ico('moeda')}</span><span><b>Preços ${SELO_PRO}</b><small>Onde é mais barato</small></span></a>
      <a class="bloco" href="#ferramentas"><span class="ic">${ico('ferramenta')}</span><span><b>Bancada</b><small>Calculadoras do seu ofício</small></span></a>
      <button type="button" class="bloco" data-acao="mensagens"><span class="ic">${ico('zap')}</span><span><b>Mensagens</b><small>Prontas para cada momento</small></span></button>
      <button type="button" class="bloco" data-acao="pix"><span class="ic">${ico('pix')}</span><span><b>Pix</b><small>QR e copia e cola</small></span></button>
    </div>
    <a class="linha" href="#ajustes" style="margin-top:12px"><span class="ic">${ico('config')}</span><span class="txt"><b>Ajustes</b><small>Perfil, ofícios, chave Pix, meta, instalar o app</small></span>${ico('setaDir', 'width="18" height="18"')}</a>`;
};
TELAS.listas = () => `${cab('Material', 'Listas de cada obra')}<div class="lista">${db.obras.filter((o) => o.mats.length || o.status !== 'concluida').map((o) => { const e = economiaLista(o); return `<a class="linha" href="#materiais/${o.id}"><span class="ic">${ico('lista')}</span><span class="txt"><b>${t(o.titulo)}</b><small>${o.mats.length} itens · ${o.mats.filter((m) => !m.comprado).length} a comprar${e.total ? ` · economize ${din(e.total)}` : ''}</small></span><span class="dir"><b>${dinCurto(totais(o).mat)}</b></span></a>`; }).join('')}</div>`;

TELAS.ajustes = () => `${cab('Ajustes')}
  <div class="lista">
    <button type="button" class="linha" data-acao="editar-perfil"><span class="ic">${ico('gente')}</span><span class="txt"><b>Perfil e ofícios</b><small>${t(nomeOficios(eu()))}</small></span></button>
    <button type="button" class="linha" data-acao="chave-pix"><span class="ic">${ico('pix')}</span><span class="txt"><b>Chave Pix</b><small>${db.pix && !db.pix.exemplo ? 'cadastrada neste celular' : 'chave de exemplo: cadastre a sua'}</small></span></button>
    <button type="button" class="linha" data-acao="meta"><span class="ic">${ico('grafico')}</span><span class="txt"><b>Meta do mês</b><small>${din(eu().meta)} de lucro</small></span></button>
    <button type="button" class="linha" data-acao="letra-grande" role="switch" aria-checked="${!!eu().letraGrande}"><span class="ic">${ico('olho')}</span><span class="txt"><b>Letra grande</b><small>${eu().letraGrande ? 'Ligada: tudo 12% maior' : 'Para celular simples ou para ler no sol'}</small></span></button>
    <button type="button" class="linha" data-acao="instalar"><span class="ic">${ico('casa')}</span><span class="txt"><b>Instalar o app</b><small>Ícone na tela do celular, abre sem internet</small></span></button>
    <button type="button" class="linha" data-acao="tour"><span class="ic">${ico('ajuda')}</span><span class="txt"><b>Ver o passeio de novo</b><small>Mostra onde fica cada coisa</small></span></button>
    <button type="button" class="linha" data-acao="cadastro"><span class="ic">${ico('lapis')}</span><span class="txt"><b>Refazer o cadastro</b><small>Nome, foto, cidade e ofícios</small></span></button>
    <button type="button" class="linha" data-acao="exportar"><span class="ic">${ico('doc')}</span><span class="txt"><b>Cópia de segurança</b><small>Baixa um arquivo com todos os dados</small></span></button>
    <button type="button" class="linha" data-acao="recomecar"><span class="ic">${ico('recarregar')}</span><span class="txt"><b>Recomeçar a demonstração</b><small>Volta os dados de exemplo</small></span></button>
  </div>
  <div class="cartao" style="margin-top:14px"><b>Assinatura do Atria</b><p style="margin:6px 0 0">R$ 39 por mês ou R$ 374 por ano (20% a menos). Sem fidelidade: cancela quando quiser.</p><div class="acoes"><a class="bt cheio" href="../../../app/atria/">Assinar</a><a class="bt leve" href="../../../atria.html">Conhecer o Atria</a></div></div>`;
ACOES['letra-grande'] = () => { eu().letraGrande = !eu().letraGrande; grava(); document.documentElement.classList.toggle('letra-grande', !!eu().letraGrande); repinta(); toast(eu().letraGrande ? 'Letra grande ligada' : 'Letra normal'); };
ACOES.recomecar = () => confirmar('Recomeçar a demonstração?', 'Os dados de exemplo voltam ao começo neste celular.', 'Recomeçar', () => { try { localStorage.removeItem(CHAVE); } catch { /* sem acesso */ } location.replace(location.pathname); });
ACOES.exportar = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: 'application/json' })); a.download = `atria-copia-${hoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Cópia baixada'); };
ACOES.cadastro = () => cadastro(true);
ACOES.tour = () => { ir('inicio'); setTimeout(tour, 450); };
ACOES.voltar = () => { if (pilha.length > 1) history.back(); else ir(PAI[rotaAtual().nome] || 'inicio'); };
ACOES.dica = (b) => folha({ titulo: 'Dica', corpo: `<div class="dica-flutua" style="animation:none">${ico('luz')}<p>${t(b.dataset.dica)}</p></div>` });
const PAI = { ...MAIS.PAI_MAIS, diarias: 'equipe', post: 'comunidade', orcar: 'inicio', trabalhos: 'inicio', agenda: 'gestao', equipe: 'gestao', recibo: 'financeiro', obra: 'obras', obras: 'gestao', clientes: 'gestao', cliente: 'clientes', materiais: 'listas', listas: 'gestao', lojas: 'gestao', precos: 'gestao', financeiro: 'gestao', ferramentas: 'gestao', corte: 'ferramentas', medidas: 'ferramentas', calc: 'ferramentas', modelo: 'ferramentas', orcamento: 'obras', proposta: 'obras', trabalho: 'trabalhos', perfil: 'comunidade', post: 'comunidade', ajustes: 'gestao' };

// instalar
let pedidoInstalar = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });
ACOES.instalar = () => {
  const inst = matchMedia('(display-mode: standalone)').matches || navigator.standalone, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const passos = ios ? ['Toque em compartilhar (quadrado com seta), embaixo no Safari.', 'Toque em “Adicionar à Tela de Início”.', 'Toque em “Adicionar”.'] : ['Toque nos três pontinhos do Chrome, em cima.', 'Toque em “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme. O Atria aparece junto com os seus apps.'];
  folha({ titulo: inst ? 'Já instalado' : 'Instalar o Atria', corpo: `<div style="display:flex;gap:14px;align-items:center"><img src="icone-192.png?v=2" alt="" width="64" height="64" style="border-radius:16px"><p style="margin:0">Fica na tela do celular como um aplicativo e abre mesmo sem internet. O que fizer offline fica guardado.</p></div>${inst ? '' : pedidoInstalar ? '' : `<ol style="padding-left:20px;display:grid;gap:8px">${passos.map((x) => `<li>${t(x)}</li>`).join('')}</ol>`}`,
    pe: !inst && pedidoInstalar ? '<button type="button" class="bt cheio largo" data-ok>Instalar agora</button>' : '',
    aoAbrir: (f, api) => { const b = $('[data-ok]', f); if (b) b.onclick = async () => { const p = pedidoInstalar; pedidoInstalar = null; p.prompt(); await p.userChoice.catch(() => ({})); api.fechar(); }; } });
};

// ------------------------------------------------------------------ botão criar (folha com atalhos)
ACOES.criar = (b) => {
  b.setAttribute('aria-expanded', 'true');
  const ferr = juntar(eu(), 'ferr').find((k) => ATALHO_FERR[k]), [hf, icf, nf] = ATALHO_FERR[ferr] || ['#ferramentas', 'ferramenta', 'Bancada'];
  const it = [['nova-obra', 'doc', 'Orçamento', 'obra nova'], ['novo-cliente', 'gente', 'Cliente', 'cadastro'], ['novo-post', 'antesdepois', 'Antes e depois', 'portfólio'], ['lancar-e', 'moeda', 'Recebi', 'entrada'], ['lancar-s', 'sacola', 'Gastei', 'saída'], ['pix', 'pix', 'Cobrar Pix', 'QR na hora'], ['mensagens', 'zap', 'Mensagem', 'pronta'], ['ir-lista', 'lista', 'Lista', 'de material'], [`ir:${hf}`, icf, nf, 'do seu ofício']];
  folha({ titulo: 'Criar', corpo: `<div class="criar-grade">${it.map(([a, ic, n, s]) => `<button type="button" data-c="${a}"><span>${ico(ic)}</span>${n}<small>${s}</small></button>`).join('')}</div>`,
    aoFechar: () => b.setAttribute('aria-expanded', 'false'),
    aoAbrir: (f, api) => $$('[data-c]', f).forEach((x) => { x.onclick = () => { const a = x.dataset.c; api.fechar(true); b.setAttribute('aria-expanded', 'false');
      if (a.startsWith('ir:')) ir(a.slice(4)); else if (a === 'lancar-e') lancar('e'); else if (a === 'lancar-s') lancar('s'); else if (a === 'novo-cliente') formCliente(null, (c) => ir(`cliente/${c.id}`)); else if (a === 'ir-lista') { const o = obrasAtivas()[0]; ir(o ? `materiais/${o.id}` : 'obras'); } else ACOES[a]({ dataset: {} }); }; }) });
};

// ================================================================== cadastro (1ª vez) e passeio guiado
function cadastro(refazer) {
  const p = eu(), sel = [...(p.oficios || [])], dados = { nome: p.nome, cidade: p.cidade, uf: p.uf, zap: p.zap, foto: p.foto };
  let passo = 0;
  const el = document.createElement('div'); el.className = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cadastro');
  document.body.appendChild(el);
  const PASSOS = [
    () => `<div class="onb-marca"><img src="logo.svg?v=2" alt="" width="210" height="208"><h1 class="so-leitor">Atria</h1><p>O app de quem ergue, reforma e conserta.</p></div>
      <ul class="onb-lista"><li>${ico('antesdepois')}Portfólio com antes e depois</li><li>${ico('lupa')}Trabalho na sua cidade</li><li>${ico('lista')}Orçamento, material e Pix</li><li>${ico('grafico')}Lucro do dia, da semana e do mês</li></ul>
      ${refazer ? '' : '<p class="exemplo" style="margin-top:14px">Demonstração: já vem com dados de exemplo do Marcos</p>'}`,
    () => `<h2>Como você se chama?</h2><label class="onb-foto"><input type="file" accept="image/*" data-foto aria-label="Foto de perfil">${dados.foto ? `<img src="${dados.foto}" alt="">` : `<span>${ico('camera')}Foto</span>`}</label>
      <label class="campo"><span>Nome</span><input data-v="nome" value="${t(dados.nome)}" autocomplete="name"></label><p class="mudo" style="font-size:13px">A foto aparece no seu perfil e no cartão de visita.</p><button type="button" class="bt leve largo" data-letra style="margin-top:8px">${ico('olho')}${p.letraGrande ? 'Letra grande: ligada' : 'Prefiro letra grande'}</button>`,
    () => `<h2>Onde você trabalha?</h2><div class="duas"><label class="campo"><span>Cidade</span><input data-v="cidade" value="${t(dados.cidade)}"></label><label class="campo"><span>Estado</span><input data-v="uf" value="${t(dados.uf)}" maxlength="2"></label></div>
      <label class="campo"><span>WhatsApp</span><input data-v="zap" type="tel" inputmode="tel" value="${t(dados.zap)}"></label><p class="mudo" style="font-size:13px">A cidade decide os pedidos do mural, os achados na internet e as lojas do mapa.</p>`,
    () => `<h2>O que você faz?</h2><p class="mudo" style="margin:-4px 0 10px;font-size:13.5px">Marque tudo o que você faz. O app se ajusta: materiais, jeito de cobrar, ferramentas e buscas.</p><div data-ofs></div>`,
    () => `<div class="onb-marca"><span class="onb-ok">${ico('ok')}</span><h1>Pronto, ${t((dados.nome || '').split(' ')[0])}!</h1><p>O Atria ficou do jeito de ${t(nomeOficios({ oficios: sel }).toLowerCase())}.</p></div>
      <ul class="onb-lista">${meusOficios({ oficios: sel }).slice(0, 3).map((o) => `<li>${ico(o.ic)}${t(o.nome)}: ${t((o.mats || []).slice(0, 2).map((m) => m[0].split(' (')[0].toLowerCase()).join(', ') || 'orçamento e agenda')}${(o.ferr || []).length ? ' e calculadoras' : ''}</li>`).join('')}</ul>`,
  ];
  const pinta = (dir = 1) => {
    el.innerHTML = `<div class="onb-topo"><div class="onb-passos">${PASSOS.map((_, i) => `<i class="${i <= passo ? 'on' : ''}"></i>`).join('')}</div>${passo > 0 && passo < 4 ? '<button type="button" class="onb-pular" data-pular>Usar exemplo</button>' : ''}</div>
      <div class="onb-corpo" style="animation:${reduzido() ? 'none' : `${dir > 0 ? 'entraDir' : 'entraEsq'} .32s var(--ease) both`}">${PASSOS[passo]()}</div>
      <div class="onb-pe">${passo > 0 ? `<button type="button" class="bt leve" data-volta>${ico('seta')}</button>` : ''}<button type="button" class="bt cheio" data-segue style="flex:1">${passo === 0 ? 'Começar' : passo === 4 ? 'Abrir o meu Atria' : 'Continuar'}</button></div>`;
    $$('[data-v]', el).forEach((i) => { i.oninput = () => { dados[i.dataset.v] = i.value; }; });
    const f = $('[data-foto]', el); if (f) f.onchange = async () => { const a = f.files[0]; if (!a) return; try { dados.foto = await lerFoto(a, 320); pinta(0); } catch { toast('Não deu para ler a foto', 'erro'); } };
    const ofs = $('[data-ofs]', el); if (ofs) escolherOficios(ofs, sel, () => {});
    const lg = $('[data-letra]', el); if (lg) lg.onclick = () => { p.letraGrande = !p.letraGrande; document.documentElement.classList.toggle('letra-grande', p.letraGrande); grava(); pinta(0); };
    $('[data-segue]', el).onclick = () => {
      if (passo === 1 && !String(dados.nome || '').trim()) { toast('Escreva o seu nome', 'erro'); return; }
      if (passo === 3 && !sel.length) { toast('Marque pelo menos um ofício', 'erro'); return; }
      if (passo < 4) { passo++; vibra(6); pinta(1); return; }
      Object.assign(p, { nome: dados.nome.trim(), apelido: dados.nome.trim().split(' ')[0], cidade: dados.cidade, uf: (dados.uf || '').toUpperCase(), zap: dados.zap, foto: dados.foto || '', oficios: sel });
      db.cadastro = true; grava(); fecha();
    };
    const v = $('[data-volta]', el); if (v) v.onclick = () => { passo--; pinta(-1); };
    const pu = $('[data-pular]', el); if (pu) pu.onclick = () => { db.cadastro = true; grava(); fecha(); };
  };
  const fecha = () => { el.classList.add('sai'); setTimeout(() => { el.remove(); ir('inicio'); repinta(); if (!db.tour) setTimeout(tour, 500); }, 260); };
  pinta();
}

function tour() {
  const PASSOS = [
    ['.pc-capitel', 'A próxima coisa a fazer', 'O Atria olha suas obras, clientes e listas e mostra aqui uma coisa só: quem cobrar, o que mandar, o que postar.'],
    ['.pc-fuste', 'O que você mais usa', 'Orçar, cobrar no Pix e achar trabalho na sua cidade. Embaixo, material, obras e divulgar.'],
    ['.pc-base', 'Seu lucro do mês', 'O que entrou menos o que saiu. Toque para ver dia, semana e mês.'],
    ['.barra [data-aba="comunidade"]', 'Sua vitrine', 'Seu portfólio de antes e depois. Toque em Postar e o app prepara a imagem para o Instagram, o Facebook e o Status do WhatsApp.'],
    ['.barra [data-aba="gestao"]', 'Gestão', 'Obras, agenda, clientes, ajudantes, dinheiro e as calculadoras do seu ofício.'],
  ];
  let i = 0;
  const el = document.createElement('div'); el.className = 'tour'; el.innerHTML = '<div class="tour-luz"></div><div class="tour-balao" role="dialog" aria-live="polite"></div>'; document.body.appendChild(el);
  const luz = $('.tour-luz', el), balao = $('.tour-balao', el);
  const fim = () => { el.remove(); db.tour = true; grava(); };
  const mostra = () => {
    const [sel, tit, txt] = PASSOS[i], alvo = $(sel);
    if (!alvo) { i++; if (i < PASSOS.length) mostra(); else fim(); return; }
    alvo.scrollIntoView({ block: 'center', behavior: reduzido() ? 'auto' : 'smooth' });
    setTimeout(() => {
      const r = alvo.getBoundingClientRect(), m = 6;
      Object.assign(luz.style, { left: `${r.left - m}px`, top: `${r.top - m}px`, width: `${r.width + m * 2}px`, height: `${r.height + m * 2}px` });
      const embaixo = r.top < innerHeight / 2;
      balao.style.top = embaixo ? `${Math.min(innerHeight - 220, r.bottom + 16)}px` : `${Math.max(12, r.top - 200)}px`;
      balao.innerHTML = `<h3>${tit}</h3><p>${txt}</p><footer><span>${i + 1} de ${PASSOS.length}</span><button type="button" class="bt leve p" data-p>Pular</button><button type="button" class="bt cheio p" data-n>${i === PASSOS.length - 1 ? 'Entendi' : 'Próximo'}</button></footer>`;
      $('[data-p]', balao).onclick = fim; $('[data-n]', balao).onclick = () => { i++; if (i < PASSOS.length) mostra(); else fim(); };
      $('[data-n]', balao).focus({ preventScroll: true });
    }, reduzido() ? 0 : 320);
  };
  mostra();
}

// dica que aparece uma vez na primeira visita de cada tela
const DICAS_TELA = {
  trabalhos: 'Puxe a tela para baixo para atualizar. Em “Na internet” o Atria mostra anúncios públicos da sua cidade.',
  comunidade: 'Toque num trabalho para ver o antes e depois e postar nas redes.',
  materiais: 'O valor verde mostra quanto economiza comprando na loja mais barata que você registrou.',
  orcamento: 'Mude o jeito de cobrar (m², diária, empreitada…) e o documento muda na hora.',
  lojas: 'As lojas vêm do mapa aberto OpenStreetMap. Se a sua não aparece, adicione à mão.',
  financeiro: 'Toque em Dia, Semana e Mês para ver o lucro de cada período.',
};
function dicaUnica(nome) {
  if (!DICAS_TELA[nome] || (db.dicas || {})[nome] || !db.tour) return '';
  (db.dicas = db.dicas || {})[nome] = 1; grava();
  return `<div class="dica-flutua" data-dica-unica>${ico('luz')}<p>${t(DICAS_TELA[nome])}</p><button type="button" data-acao="fecha-dica" aria-label="Fechar dica">${ico('x', 'width="16" height="16"')}</button></div>`;
}
ACOES['fecha-dica'] = (b) => b.closest('.dica-flutua').remove();

// ================================================================== roteador, transições e gestos
let pilha = [];
const rotaAtual = () => { const h = decodeURIComponent(location.hash.slice(1)) || 'inicio'; const [nome, ...args] = h.split('/'); return { h, nome: TELAS[nome] ? nome : 'inicio', args }; };
function direcao(h, nome) {
  const ant = pilha[pilha.length - 1];
  if (!ant) { pilha = [h]; return 'sobe'; }
  if (ant === h) return 'nenhuma';
  const antNome = ant.split('/')[0];
  if (TOPO.includes(nome) && TOPO.includes(antNome)) { pilha = [h]; return TOPO.indexOf(nome) > TOPO.indexOf(antNome) ? 'dir' : 'esq'; }
  if (pilha.length > 1 && pilha[pilha.length - 2] === h) { pilha.pop(); return 'volta'; }
  if (TOPO.includes(nome)) { pilha = [h]; return 'volta'; }
  pilha.push(h); return 'vai';
}
function desenha(manterRolagem) {
  const { nome, args } = rotaAtual(), f = TELAS[nome], y = scrollY;
  const html = f(...args), el = tela();
  el.innerHTML = (manterRolagem ? '' : dicaUnica(nome)) + html;
  if (f.montar) f.montar(el, ...args);
  $$('[data-seg]', el).forEach((s) => ligarSeg(s));
  pos(el, manterRolagem);
  $$('.barra [data-aba]').forEach((a) => { const on = a.dataset.aba === nome || (a.dataset.aba === 'inicio' && ['trabalhos', 'trabalho', 'orcar'].includes(nome)) || (a.dataset.aba === 'comunidade' && ['perfil', 'post'].includes(nome)) || (a.dataset.aba === 'gestao' && !TOPO.includes(nome) && !['trabalhos', 'trabalho', 'orcar', 'perfil', 'post'].includes(nome)); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (manterRolagem) scrollTo(0, y); else scrollTo(0, 0);
  ligarComparadores(el); ligarAchados(nome); barraBadges(); ligarVoz(el);
  document.title = `Atria · ${({ inicio: 'início', trabalhos: 'trabalhos', comunidade: 'vitrine', gestao: 'gestão' })[nome] || nome}`;
}
// números que sobem contando e a trena que estica
function pos(el, rapido) {
  $$('.trena-fita > i', el).forEach((i) => { const w = i.dataset.largura; if (rapido || reduzido()) i.style.width = `${w}%`; else requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = `${w}%`; })); });
  if (rapido || reduzido()) return;
  $$('[data-conta]', el).forEach((n) => {
    const fim = +n.dataset.conta, t0 = performance.now(), dur = 650;
    const passo = (tt) => { const k = Math.min(1, (tt - t0) / dur), e = 1 - (1 - k) ** 3; n.textContent = din(Math.round(fim * e)); if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
}
function navegar() {
  const { h, nome } = rotaAtual(), dir = direcao(h, nome), el = tela();
  if (folhaAtual()) folhaAtual().fechar(true);
  if (dir === 'nenhuma') { desenha(true); return; }
  if (document.startViewTransition && !reduzido()) {
    document.documentElement.dataset.dir = dir;
    const vt = document.startViewTransition(() => desenha(false));
    vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {});
    vt.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.dir; });
  } else {
    desenha(false); el.classList.remove('anima-vai', 'anima-volta', 'anima-dir', 'anima-esq', 'anima-sobe'); void el.offsetWidth; if (!reduzido()) el.classList.add(`anima-${dir}`);
  }
}
function barraBadges() {
  const n = (db.achados || []).filter((a) => a.novo).length + db.pedidos.filter((p) => !p.interesse && dias(p.data.slice(0, 10)) === 0 && meusOficios(eu()).some((o) => o.id === p.of)).length;
  const a = $('[data-tambor="trabalhos"]'); if (!a) return; let b = $('.pc-selo', a);
  if (n) { if (!b) { b = document.createElement('span'); b.className = 'pc-selo'; a.lastElementChild.replaceWith(b); } b.textContent = n; }
}
// comparador antes e depois: arrasta com o dedo ou com as setas
function ligarComparadores(el) {
  $$('.ad', el).forEach((ad) => {
    const set = (p) => { p = Math.max(2, Math.min(98, p)); ad.style.setProperty('--p', `${p}%`); ad.setAttribute('aria-valuenow', Math.round(p)); };
    const ponto = (e) => { const r = ad.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    let ativo = false, x0 = 0, y0 = 0, decidiu = false;
    ad.addEventListener('pointerdown', (e) => { ativo = true; decidiu = e.pointerType === 'mouse'; x0 = e.clientX; y0 = e.clientY; ad.classList.remove('dica'); if (decidiu) { ad.setPointerCapture(e.pointerId); ponto(e); } });
    ad.addEventListener('pointermove', (e) => { if (!ativo) return; if (!decidiu) { if (Math.abs(e.clientX - x0) > 6 && Math.abs(e.clientX - x0) > Math.abs(e.clientY - y0)) { decidiu = true; ad.setPointerCapture(e.pointerId); } else if (Math.abs(e.clientY - y0) > 8) { ativo = false; return; } else return; } ponto(e); });
    const solta = () => { ativo = false; }; ad.addEventListener('pointerup', solta); ad.addEventListener('pointercancel', solta);
    ad.addEventListener('keydown', (e) => { const v = parseFloat(ad.style.getPropertyValue('--p')) || 50; if (e.key === 'ArrowLeft') { set(v - 5); e.preventDefault(); } if (e.key === 'ArrowRight') { set(v + 5); e.preventDefault(); } });
  });
  // a primeira foto da tela mostra sozinha que dá para arrastar (uma vez)
  const pri = $('.ad', el);
  if (pri && !sessionStorage.getItem('atria-ad-dica') && !reduzido()) {
    try { sessionStorage.setItem('atria-ad-dica', '1'); } catch { /* sem acesso */ }
    pri.classList.add('dica'); setTimeout(() => pri.style.setProperty('--p', '78%'), 500); setTimeout(() => pri.style.setProperty('--p', '24%'), 1400); setTimeout(() => { pri.style.setProperty('--p', '50%'); setTimeout(() => pri.classList.remove('dica'), 900); }, 2300);
  }
}
// achados: atualiza sozinho a cada 15 minutos enquanto a tela de trabalhos está aberta
function ligarAchados(nome) {
  clearInterval(relogioAchados); relogioAchados = null;
  if (nome !== 'trabalhos') return;
  carregarCred();
  if (!db.achados || Date.now() - new Date(db.achadosEm || 0).getTime() > 15 * 6e4) buscarAchados();
  relogioAchados = setInterval(() => { if (!document.hidden) buscarAchados(); }, 15 * 6e4);
}
// gestos: arrastar para o lado troca de aba principal; puxar para baixo atualiza os trabalhos
function ligarGestos() {
  let x0 = 0, y0 = 0, t0 = 0, alvo = null;
  const tl = tela();
  tl.addEventListener('touchstart', (e) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); alvo = e.target; }, { passive: true });
  tl.addEventListener('touchmove', (e) => {
    const p = e.touches[0], dy = p.clientY - y0, pux = $('[data-puxar]');
    if (pux && scrollY <= 0 && dy > 0 && Math.abs(p.clientX - x0) < 40) { const h = Math.min(64, dy * 0.45); pux.style.height = `${h}px`; pux.querySelector('svg').style.transform = `rotate(${dy * 2}deg)`; pux.querySelector('span').textContent = h >= 50 ? 'Solte para atualizar' : 'Puxe para atualizar'; }
  }, { passive: true });
  tl.addEventListener('touchend', async (e) => {
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0, pux = $('[data-puxar]');
    if (pux) { const h = parseFloat(pux.style.height) || 0; if (h >= 50) { pux.classList.add('girando'); pux.querySelector('span').textContent = 'Atualizando…'; if (abaTrab === 'internet') await buscarAchados(true); else { await new Promise((ok) => setTimeout(ok, 700)); toast('Mural atualizado'); } } pux.classList.remove('girando'); pux.style.height = '0'; }
    if (!alvo || alvo.closest('.ad, .chips, input, textarea, select, #mapa, .grafico, .peca-linha, .seg') || Date.now() - t0 > 600) return;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 45) { const { nome } = rotaAtual(), i = TOPO.indexOf(nome); if (i < 0) return; const j = i + (dx < 0 ? 1 : -1); if (j >= 0 && j < TOPO.length) { vibra(6); ir(TOPO[j]); } }
  });
}

// ================================================================== começo
function iniciar() {
  carregar();
  window.veltriaDados = () => db; // a IA e a nuvem da conta leem daqui
  // cliques: data-acao chama a ação; links com href seguem normais
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-acao]'); if (!el) return;
    const f = ACOES[el.dataset.acao]; if (!f) return;
    const r = f(el, e); if (r === 'segue') return;
    if (el.tagName === 'A' && !/^https?:/.test(el.getAttribute('href') || '')) e.preventDefault();
  });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="checkbox"][data-acao]')) { e.preventDefault(); e.target.click(); } });
  addEventListener('hashchange', navegar);
  addEventListener('atria-pinta', () => desenha(true));
  // alternâncias (salvar, visto, feito, comprado): microanimação só no botão que acabou de ser marcado
  let tocado = null;
  document.addEventListener('click', (e) => { const b = e.target.closest('[aria-pressed], [role="checkbox"]'); if (b && (b.dataset.acao || b.dataset.k)) tocado = `[data-acao="${b.dataset.acao || ''}"]${b.dataset.id ? `[data-id="${b.dataset.id}"]` : ''}${b.dataset.k ? `[data-k="${b.dataset.k}"]` : ''}${b.dataset.i ? `[data-i="${b.dataset.i}"]` : ''}${b.dataset.e ? `[data-e="${b.dataset.e}"]` : ''}`; }, true);
  addEventListener('atria-pinta', () => { const sel = tocado; tocado = null; if (!sel) return; setTimeout(() => { try { const n = document.querySelector(sel); if (n && (n.getAttribute('aria-pressed') === 'true' || n.getAttribute('aria-checked') === 'true')) { n.classList.remove('acabou-marcar'); void n.offsetWidth; n.classList.add('acabou-marcar'); } } catch { /* seletor inválido */ } }, 30); });
  addEventListener('online', () => { const s = $('[data-sinc]'); if (s) { s.classList.remove('off'); s.textContent = 'tudo salvo'; } toast('Internet de volta'); });
  addEventListener('offline', () => { const s = $('[data-sinc]'); if (s) { s.classList.add('off'); s.textContent = 'sem internet, salvando no celular'; } toast('Sem internet: tudo continua salvo no celular'); });
  document.documentElement.classList.toggle('letra-grande', !!(db.perfil && db.perfil.letraGrande));
  instalarConceitos({ TELAS, ACOES, sugestoes });
  ligarGestos();
  navegar(); barraBadges();
  if (!db.cadastro) setTimeout(() => cadastro(false), 250);
  else if (!db.tour) setTimeout(tour, 700);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  ligarVideos();
}

if (!window.atriaMoldura) iniciar();

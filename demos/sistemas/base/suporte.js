// =============================================================
// Veltria · Suporte (chamados) e Feedback, comuns a todos os sistemas
// -------------------------------------------------------------
// Suporte: o cliente abre um chamado quando encontra um erro ou tem uma dúvida. O chamado leva
// sozinho os dados técnicos (sistema, tela, navegador e os últimos erros da tela) e a conversa
// continua aqui e por e-mail: o Escritório avisa o suporte e manda a resposta para o cliente.
// Feedback: sugestão, elogio ou problema, com nota de 1 a 5, que chega por e-mail para a Blue Rose.
// Na demonstração (sem conta), os dois abrem o e-mail com a mensagem pronta.
// =============================================================
import { esc, ic, et, modal, avisar, confirmar, vazio, dataCurta, relativo } from './nexo.js';

const EMAIL = 'blueroseexpressoficial@gmail.com';
const CATEG = { erro: ['Erro no sistema', 'bug'], duvida: ['Dúvida de uso', 'question'], pagamento: ['Pagamento ou plano', 'credit-card'], sugestao: ['Pedido de melhoria', 'lightbulb'] };
const ST = { aberto: ['Aguardando o suporte', 'al'], respondido: ['Respondido', 'info'], resolvido: ['Resolvido', 'ok'] };
const TIPOS = [['sugestao', 'Sugestão'], ['elogio', 'Elogio'], ['problema', 'Problema'], ['outro', 'Outro']];

// guarda os últimos erros da tela para anexar ao chamado (sem dados de clientes: só a mensagem técnica)
const ULTIMOS = [];
addEventListener('error', (e) => { if (e.message) ULTIMOS.push(`${new Date().toTimeString().slice(0, 8)} ${String(e.message).slice(0, 200)}`); if (ULTIMOS.length > 8) ULTIMOS.shift(); });
addEventListener('unhandledrejection', (e) => { const r = e.reason; ULTIMOS.push(`${new Date().toTimeString().slice(0, 8)} ${String(r?.message || r).slice(0, 200)}`); if (ULTIMOS.length > 8) ULTIMOS.shift(); });

const contexto = (app, cfg) => ({ sistema: cfg.id, nome_sistema: cfg.nome, empresa: app.empresa, tela: location.hash.slice(0, 120), navegador: navigator.userAgent.slice(0, 200), janela: `${innerWidth}x${innerHeight}`, versao: document.documentElement.dataset.versao || '', erros: ULTIMOS.slice() });
const mailto = (assunto, corpo) => `mailto:${EMAIL}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

export function prepararSuporte(app, cfg) {
  const sb = () => app.sessao?.sb;
  const st = () => (app.estado.suporte ||= { lista: null, carregando: false, erro: '' });

  async function carregar() {
    const s = st(); if (s.carregando || !sb()) return; s.carregando = true;
    const { data, error } = await sb().from('nexo_tickets').select('id,numero,assunto,categoria,status,app,criado,atualizado').order('atualizado', { ascending: false }).limit(60);
    s.carregando = false; s.lista = data || []; s.erro = error ? error.message : ''; if (location.hash === '#/suporte') app.render();
  }

  app.paginaSuporte = {
    id: 'suporte', rot: 'Suporte', titulo: 'Suporte',
    render: (a) => {
      const topo = `<div class="entre"><div class="dica" style="flex:1">${ic('lifebuoy')}<span>Encontrou um erro ou ficou com dúvida? Abra um chamado: ele já leva a tela em que você estava e os detalhes técnicos. Respondemos em até 1 dia útil, aqui e no seu e-mail.</span></div><button type="button" class="btn pri" data-acao="abrirChamado">${ic('plus')}Abrir chamado</button></div>`;
      if (!a.nuvem) return `${topo}<div class="cartao">${vazio('lifebuoy', 'Chamados ficam na versão com conta', 'Na demonstração, o botão Abrir chamado prepara um e-mail para a nossa equipe com os detalhes da tela.')}</div>`;
      const s = st(); if (s.lista === null) { carregar(); return `${topo}<div class="cartao"><div class="cartao-corpo mute-2">Carregando os seus chamados…</div></div>`; }
      if (s.erro) return `${topo}<div class="cartao"><div class="cartao-corpo er-tx">${esc(s.erro)}</div></div>`;
      return `${topo}<div class="cartao"><div class="cartao-cab"><div><h3>Seus chamados</h3><div class="sub">De todos os sistemas e do site, com o seu e-mail</div></div><button type="button" class="btn peq fant" data-acao="recarregarChamados">${ic('arrows-clockwise')}Atualizar</button></div>
        ${s.lista.length ? `<ul class="lista">${s.lista.map((t) => `<li class="clicavel" data-acao="verChamado" data-id="${t.id}"><span class="mono mute-2">#${t.numero}</span><div class="cresce"><div class="t corta">${esc(t.assunto)}</div><div class="s">${esc(CATEG[t.categoria]?.[0] || '')} · atualizado ${esc(relativo(t.atualizado))}</div></div>${et(...(ST[t.status] || ST.aberto))}</li>`).join('')}</ul>` : vazio('check-circle', 'Nenhum chamado', 'Quando precisar, é só abrir um chamado acima.')}</div>`;
    },
  };

  Object.assign(app.acoes, {
    recarregarChamados: () => { st().lista = null; app.render(); },
    abrirChamado: async (d = {}) => {
      const ctx = contexto(app, cfg);
      const r = await modal({ titulo: 'Abrir chamado', largura: 560, corpo: `<form class="form-grade" onsubmit="return false">
        <label class="campo largo">Tipo<select name="categoria">${Object.entries(CATEG).map(([k, [n]]) => `<option value="${k}" ${k === (d.categoria || 'erro') ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="campo largo">Assunto<input name="assunto" required minlength="3" maxlength="150" placeholder="Ex.: o botão de salvar não funciona na tela de vendas" value="${esc(d.assunto || '')}"></label>
        <label class="campo largo">O que aconteceu<textarea name="texto" required minlength="5" maxlength="4000" rows="5" placeholder="Conte o que você fez, o que esperava e o que apareceu. Se tiver mensagem de erro, copie aqui."></textarea></label>
        <label class="flex" style="grid-column:1/-1;font-size:12.5px;color:var(--tx-2);gap:8px;align-items:flex-start"><input type="checkbox" name="tecnico" checked style="margin-top:3px"> Enviar os detalhes técnicos (tela atual, navegador${ctx.erros.length ? ` e ${ctx.erros.length} erro(s) recente(s)` : ''}). Nada dos seus clientes vai junto.</label></form>`,
        botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: app.nuvem ? 'Enviar chamado' : 'Preparar e-mail', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; const o = Object.fromEntries(new FormData(fm)); o.tecnico = !!fm.tecnico.checked; return o; } }] });
      if (!r) return;
      const tec = r.tecnico ? ctx : { sistema: cfg.id, nome_sistema: cfg.nome };
      if (!app.nuvem) { location.href = mailto(`[Suporte · ${cfg.nome}] ${r.assunto}`, `${r.texto}\n\n— Detalhes técnicos —\n${JSON.stringify(tec, null, 1)}`); return; }
      const { data, error } = await sb().rpc('nexo_ticket_abrir', { p_app: cfg.id, p_espaco: app.sessao.espaco?.id || null, p_assunto: r.assunto, p_categoria: r.categoria, p_texto: r.texto, p_contexto: tec });
      if (error) return avisar(error.message, { tipo: 'erro' });
      avisar(`Chamado #${data} aberto. Você recebe a resposta aqui e no seu e-mail.`, { tempo: 7000 }); st().lista = null; app.ir('#/suporte'); app.render();
    },
    verChamado: async (d) => {
      const [{ data: t }, { data: msgs }] = await Promise.all([sb().from('nexo_tickets').select('*').eq('id', d.id).maybeSingle(), sb().from('nexo_ticket_msgs').select('autor,texto,criado').eq('ticket', d.id).order('criado')]);
      if (!t) return avisar('Chamado não encontrado', { tipo: 'erro' });
      const r = await modal({ titulo: `Chamado #${t.numero} · ${t.assunto}`, largura: 640, corpo: `<div class="col" style="gap:10px"><div class="flex" style="gap:8px">${et(...(ST[t.status] || ST.aberto))}<span class="mute-2" style="font-size:12.5px">${esc(CATEG[t.categoria]?.[0] || '')} · aberto em ${esc(dataCurta(t.criado))}</span></div>
        <div class="col" style="gap:8px;max-height:46vh;overflow:auto">${(msgs || []).map((m) => `<div class="cartao" style="padding:10px 12px;${m.autor === 'suporte' ? 'border-left:3px solid var(--acc)' : ''}"><div class="mute" style="font-size:11.5px;margin-bottom:4px">${m.autor === 'suporte' ? 'Suporte Blue Rose' : 'Você'} · ${esc(relativo(m.criado))}</div><div style="white-space:pre-wrap">${esc(m.texto)}</div></div>`).join('')}</div>
        ${t.status !== 'resolvido' ? '<label class="campo largo">Responder<textarea name="resp" rows="3" maxlength="4000" placeholder="Escreva aqui"></textarea></label>' : '<p class="mute-2" style="font-size:12.5px">Chamado resolvido. Se o problema voltar, responda para reabrir.<textarea name="resp" rows="2" maxlength="4000" placeholder="Reabrir com uma mensagem" style="margin-top:6px;width:100%"></textarea></p>'}</div>`,
        botoes: [{ rotulo: 'Fechar', valor: null, classe: 'fant' }, ...(t.status !== 'resolvido' ? [{ rotulo: 'Marcar como resolvido', valor: 'resolver' }] : []), { rotulo: 'Enviar', classe: 'pri', acao: (f) => { const v = f.querySelector('[name=resp]').value.trim(); if (!v) { f.querySelector('[name=resp]').focus(); return false; } return { texto: v }; } }] });
      if (!r) return;
      if (r === 'resolver') { const { error } = await sb().rpc('nexo_ticket_status', { p_ticket: t.id, p_status: 'resolvido' }); if (error) return avisar(error.message, { tipo: 'erro' }); avisar('Chamado resolvido. Obrigado!'); }
      else { const { error } = await sb().rpc('nexo_ticket_responder', { p_ticket: t.id, p_texto: r.texto }); if (error) return avisar(error.message, { tipo: 'erro' }); avisar('Mensagem enviada'); }
      st().lista = null; app.render();
    },
    feedback: async () => {
      const r = await modal({ titulo: 'Enviar feedback', largura: 520, corpo: `<form class="form-grade" onsubmit="return false">
        <p class="mute-2 largo" style="margin:0;font-size:12.5px">A sua opinião vai direto para o e-mail da equipe da Blue Rose e ajuda a decidir o que melhorar no ${esc(cfg.nome)}.</p>
        <div class="campo largo" role="group" aria-label="Tipo">Tipo<div class="grupo-btn">${TIPOS.map(([k, n], i) => `<label style="cursor:pointer"><input type="radio" name="tipo" value="${k}" ${i === 0 ? 'checked' : ''} style="margin-right:4px">${n}</label>`).join('&nbsp;&nbsp;')}</div></div>
        <div class="campo largo" role="group" aria-label="Nota">Nota para o sistema<div class="flex" style="gap:10px">${[1, 2, 3, 4, 5].map((n) => `<label style="cursor:pointer"><input type="radio" name="nota" value="${n}" ${n === 5 ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
        <label class="campo largo">Mensagem<textarea name="texto" required minlength="3" maxlength="2000" rows="4" placeholder="O que você gostou, o que falta, o que atrapalha…"></textarea></label>
        ${app.nuvem ? '' : '<label class="campo largo">Seu e-mail (opcional, para respondermos)<input name="email" type="email" maxlength="254"></label>'}
        <p class="mute largo" style="margin:0;font-size:12px">Encontrou um erro? Use <a href="#/suporte" data-fechar>Suporte</a> para abrir um chamado com os detalhes técnicos.</p></form>`,
        botoes: [{ rotulo: 'Cancelar', valor: null, classe: 'fant' }, { rotulo: 'Enviar', classe: 'pri', acao: (f) => { const fm = f.querySelector('form'); if (!fm.reportValidity()) return false; return Object.fromEntries(new FormData(fm)); } }] });
      if (!r) return;
      if (!app.nuvem) {
        // demonstração: sem conta, a mensagem vai pelo e-mail do próprio visitante
        location.href = mailto(`[Feedback · ${cfg.nome}] ${TIPOS.find((x) => x[0] === r.tipo)?.[1]} · nota ${r.nota}`, `${r.texto}\n\n${r.email ? `Responder para: ${r.email}\n` : ''}Tela: ${location.hash}`); return;
      }
      const { error } = await sb().rpc('nexo_feedback_enviar', { p_app: cfg.id, p_tipo: r.tipo, p_nota: Number(r.nota) || null, p_texto: r.texto, p_email: null, p_pagina: location.hash.slice(0, 200), p_espaco: app.sessao.espaco?.id || null });
      if (error) return avisar(error.message, { tipo: 'erro' });
      avisar('Obrigado! O seu feedback chegou para a nossa equipe.', { tempo: 6000 });
      if (r.tipo === 'problema' && (await confirmar('Quer abrir um chamado de suporte para resolvermos esse problema?', { rotulo: 'Abrir chamado', titulo: 'Problema' }))) app.acoes.abrirChamado({ categoria: 'erro', assunto: String(r.texto).slice(0, 80) });
    },
  });
}

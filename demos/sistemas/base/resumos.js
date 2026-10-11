// =============================================================
// Linha Nexo · resumo diário do dono
// -------------------------------------------------------------
// Funções puras (sem tela): recebem os dados do sistema e a data de hoje
// e devolvem o resumo do dia. Usadas dentro do sistema (botão "Resumo do
// dia") e pela função agendada que manda o e-mail de manhã (nexo-resumo).
// =============================================================
const R$ = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mais = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const soma = (l, f) => l.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const L = (d, k) => (Array.isArray(d[k]) ? d[k] : []);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

const RESUMOS = {
  crm(d, hoje) {
    const ontem = mais(hoje, -1), ym = hoje.slice(0, 7);
    const ganhos = L(d, 'negocios').filter((n) => n.status === 'ganho'), abertos = L(d, 'negocios').filter((n) => n.status === 'aberto');
    const mes = soma(ganhos.filter((n) => String(n.fechado || '').startsWith(ym)), (n) => n.valor), meta = soma(L(d, 'metas').filter((m) => m.mes === ym), (m) => m.valor);
    const ativ = L(d, 'atividades').filter((a) => !a.feita), hojeA = ativ.filter((a) => String(a.quando).slice(0, 10) === hoje), atras = ativ.filter((a) => String(a.quando).slice(0, 10) < hoje);
    const semProx = abertos.filter((n) => !ativ.some((a) => a.negocio === n.id));
    return {
      destaques: [['Vendido ontem', R$(soma(ganhos.filter((n) => n.fechado === ontem), (n) => n.valor))], ['Vendido no mês', `${R$(mes)}${meta ? ` (${Math.round((mes / meta) * 100)}% da meta)` : ''}`], ['Em negociação', `${R$(soma(abertos, (n) => n.valor))} em ${abertos.length} negócios`]],
      itens: hojeA.sort((a, b) => String(a.quando).localeCompare(String(b.quando))).slice(0, 8).map((a) => `${String(a.quando).slice(11, 16)} · ${a.titulo}`),
      tituloItens: plural(hojeA.length, 'atividade para hoje', 'atividades para hoje'),
      alertas: [atras.length && plural(atras.length, 'atividade atrasada', 'atividades atrasadas'), semProx.length && `${plural(semProx.length, 'negócio', 'negócios')} sem próxima atividade`].filter(Boolean),
    };
  },
  agenda(d, hoje) {
    const ontem = mais(hoje, -1), amanha = mais(hoje, 1), ags = L(d, 'agendamentos');
    const hojeL = ags.filter((x) => x.data === hoje && !['cancelado', 'faltou'].includes(x.status)).sort((a, b) => String(a.ini).localeCompare(String(b.ini)));
    const cmd = L(d, 'comandas').filter((k) => k.status === 'fechada' && k.data === ontem), fatOntem = soma(cmd, (k) => soma(k.itens || [], (i) => i.qtd * i.preco) - (k.desconto || 0));
    const clientes = new Map(L(d, 'clientes').map((c) => [c.id, c]));
    const aniver = L(d, 'clientes').filter((c) => String(c.nascimento || '').slice(5) === hoje.slice(5));
    const semConf = ags.filter((x) => x.data === amanha && x.status === 'agendado');
    return {
      destaques: [['Atendimentos hoje', `${hojeL.length} · previsto ${R$(soma(hojeL, (x) => x.valor))}`], ['Faturado ontem', R$(fatOntem)], ['Faltas ontem', String(ags.filter((x) => x.data === ontem && x.status === 'faltou').length)]],
      itens: hojeL.slice(0, 10).map((x) => `${x.ini} · ${clientes.get(x.cliente)?.nome || 'Cliente'}`), tituloItens: 'Agenda de hoje',
      alertas: [semConf.length && `${plural(semConf.length, 'cliente de amanhã ainda não confirmou', 'clientes de amanhã ainda não confirmaram')}`, aniver.length && `Aniversário hoje: ${aniver.map((c) => c.nome.split(' ')[0]).join(', ')}`].filter(Boolean),
    };
  },
  juridico(d, hoje) {
    const amanha = mais(hoje, 1), pend = L(d, 'prazos').filter((p) => p.status === 'pendente');
    const procs = new Map(L(d, 'processos').map((p) => [p.id, p]));
    const urg = pend.filter((p) => p.tipo === 'prazo' && p.data <= amanha).sort((a, b) => a.data.localeCompare(b.data));
    const aud = pend.filter((p) => p.tipo !== 'prazo' && p.data === hoje);
    const atras = L(d, 'honorarios').filter((h) => h.status !== 'recebido' && h.vencimento < hoje);
    return {
      destaques: [['Prazos vencendo até amanhã', String(urg.length)], ['Audiências e perícias hoje', String(aud.length)], ['Intimações para tratar', String(L(d, 'publicacoes').filter((x) => x.status === 'nova').length)]],
      itens: [...urg.slice(0, 6).map((p) => `${p.data === hoje ? 'HOJE' : p.data < hoje ? 'VENCIDO' : 'amanhã'} · ${p.titulo} · ${procs.get(p.processo)?.numero || ''}`), ...aud.map((p) => `${p.hora || ''} · ${p.titulo}`)], tituloItens: 'Prazos e audiências',
      alertas: [atras.length && `${R$(soma(atras, (h) => h.valor))} de honorários em atraso`].filter(Boolean),
    };
  },
  financeiro(d, hoje) {
    const lanc = L(d, 'lancamentos'), sinal = (l) => (l.tipo === 'receita' ? 1 : -1);
    const saldo = soma(L(d, 'contas'), (c) => c.saldo_inicial) + soma(lanc.filter((l) => l.status === 'pago' && l.pago_em <= hoje), (l) => sinal(l) * l.valor);
    const ab = lanc.filter((l) => l.status === 'aberto');
    const pagarHoje = ab.filter((l) => l.tipo === 'despesa' && l.vencimento <= hoje), receberVenc = ab.filter((l) => l.tipo === 'receita' && l.vencimento < hoje), receberHoje = ab.filter((l) => l.tipo === 'receita' && l.vencimento === hoje);
    const os = L(d, 'ordens').filter((o) => o.status !== 'entregue');
    return {
      destaques: [['Saldo em contas', R$(saldo)], ['A pagar hoje (e vencidas)', R$(soma(pagarHoje, (l) => l.valor))], ['A receber hoje', R$(soma(receberHoje, (l) => l.valor))]],
      itens: pagarHoje.slice(0, 8).map((l) => `Pagar ${R$(l.valor)} · ${l.descricao}`), tituloItens: 'Contas para pagar hoje',
      alertas: [receberVenc.length && `${R$(soma(receberVenc, (l) => l.valor))} de clientes em atraso (${receberVenc.length})`, os.filter((o) => o.status === 'pronta').length && `${plural(os.filter((o) => o.status === 'pronta').length, 'OS pronta', 'OS prontas')} esperando retirada`, os.filter((o) => o.previsao < hoje).length && `${plural(os.filter((o) => o.previsao < hoje).length, 'OS atrasada', 'OS atrasadas')}`].filter(Boolean),
    };
  },
  gestao(d, hoje) {
    const ontem = mais(hoje, -1), vendas = L(d, 'vendas'), total = (v) => soma(v.itens || [], (x) => x.qtd * x.preco) - (v.desconto || 0) + (v.frete || 0);
    const fatOntem = vendas.filter((v) => v.data === ontem && ['faturado', 'enviado', 'entregue'].includes(v.status));
    const separar = vendas.filter((v) => ['aprovado', 'separacao'].includes(v.status));
    const est = (p) => soma(Object.values(p.estoque || {}), (x) => x);
    const zerados = L(d, 'produtos').filter((p) => est(p) <= 0), baixos = L(d, 'produtos').filter((p) => est(p) > 0 && est(p) <= p.minimo);
    const atrasadas = L(d, 'compras').filter((c) => ['enviado', 'parcial'].includes(c.status) && c.previsao < hoje);
    return {
      destaques: [['Vendido ontem', `${R$(soma(fatOntem, total))} em ${plural(fatOntem.length, 'pedido', 'pedidos')}`], ['Vendido no mês', R$(soma(vendas.filter((v) => String(v.data).startsWith(hoje.slice(0, 7)) && ['faturado', 'enviado', 'entregue'].includes(v.status)), total))], ['Para separar · repor', `${plural(separar.length, 'pedido', 'pedidos')} · ${plural(zerados.length + baixos.length, 'item', 'itens')}`]],
      itens: [...zerados.slice(0, 5).map((p) => `SEM ESTOQUE · ${p.nome}`), ...baixos.slice(0, 5).map((p) => `Abaixo do mínimo · ${p.nome}`)], tituloItens: 'Estoque',
      alertas: [atrasadas.length && `${plural(atrasadas.length, 'compra atrasada', 'compras atrasadas')} do fornecedor`].filter(Boolean),
    };
  },
  clinica(d, hoje) {
    const ontem = mais(hoje, -1), amanha = mais(hoje, 1), cs = L(d, 'consultas'), at = (c) => !['cancelado', 'faltou'].includes(c.status);
    const pac = new Map(L(d, 'pacientes').map((p) => [p.id, p])), prof = new Map(L(d, 'profissionais').map((p) => [p.id, p]));
    const hojeL = cs.filter((c) => c.data === hoje && at(c)).sort((a, b) => String(a.ini).localeCompare(String(b.ini)));
    const semPag = cs.filter((c) => c.tipo === 'particular' && c.status === 'atendido' && !c.pago);
    return {
      destaques: [['Consultas hoje', `${hojeL.length} · ${hojeL.filter((c) => c.status !== 'agendado').length} confirmadas`], ['Atendidos ontem', `${cs.filter((c) => c.data === ontem && c.status === 'atendido').length} · ${R$(soma(cs.filter((c) => c.data === ontem && c.status === 'atendido'), (c) => c.valor))}`], ['Faltas ontem', String(cs.filter((c) => c.data === ontem && c.status === 'faltou').length)]],
      itens: hojeL.slice(0, 10).map((c) => `${c.ini} · ${pac.get(c.paciente)?.nome || 'Paciente'} · ${prof.get(c.profissional)?.nome || ''}`), tituloItens: 'Agenda de hoje',
      alertas: [cs.filter((c) => c.data === amanha && c.status === 'agendado').length && `${plural(cs.filter((c) => c.data === amanha && c.status === 'agendado').length, 'consulta de amanhã sem confirmação', 'consultas de amanhã sem confirmação')}`, semPag.length && `${R$(soma(semPag, (c) => c.valor))} de atendimentos particulares sem pagamento`, cs.filter((c) => c.guia === 'pendente').length && `${plural(cs.filter((c) => c.guia === 'pendente').length, 'guia de convênio a enviar', 'guias de convênio a enviar')}`].filter(Boolean),
    };
  },
  academia(d, hoje) {
    const ontem = mais(hoje, -1), al = L(d, 'alunos'), ativos = al.filter((x) => x.status === 'ativo'), ms = L(d, 'mensalidades'), ck = L(d, 'checkins');
    const atras = ms.filter((m) => m.status === 'aberto' && m.vencimento < hoje), ult = new Map(); ck.forEach((c) => { if ((ult.get(c.aluno) || '') < c.data) ult.set(c.aluno, c.data); });
    const sumidos = ativos.filter((x) => !ult.get(x.id) || ult.get(x.id) <= mais(hoje, -10));
    const exp = L(d, 'experimentais').filter((x) => x.data === hoje && x.etapa === 'agendada');
    return {
      destaques: [['Alunos ativos', String(ativos.length)], ['Check-ins ontem', String(ck.filter((c) => c.data === ontem).length)], ['Recebido ontem', R$(soma(ms.filter((m) => m.pago_em === ontem), (m) => m.valor))]],
      itens: exp.map((x) => `Aula experimental: ${x.nome} (${x.interesse})`), tituloItens: 'Aulas experimentais hoje',
      alertas: [atras.length && `${R$(soma(atras, (m) => m.valor))} em mensalidades atrasadas (${new Set(atras.map((m) => m.aluno)).size} alunos)`, sumidos.length && `${plural(sumidos.length, 'aluno ativo sem treinar há 10 dias', 'alunos ativos sem treinar há 10 dias')}`].filter(Boolean),
    };
  },
  restaurante(d, hoje) {
    const ontem = mais(hoje, -1), ps = L(d, 'pedidos').filter((p) => p.pago && p.data === ontem);
    const tot = (p) => soma(p.itens || [], (i) => i.qtd * i.preco) * (p.servico ? 1.1 : 1) + (p.taxa || 0) - (p.desconto || 0);
    const comprar = L(d, 'insumos').filter((x) => x.estoque <= x.minimo);
    return {
      destaques: [['Vendido ontem', R$(soma(ps, tot))], ['Pedidos ontem', `${ps.length} · ${ps.filter((p) => p.canal !== 'salao').length} delivery/balcão`], ['Ticket médio', R$(soma(ps, tot) / (ps.length || 1))]],
      itens: comprar.slice(0, 8).map((x) => `Comprar: ${x.nome} (tem ${String(x.estoque).replace('.', ',')} ${x.un})`), tituloItens: 'Lista de compras',
      alertas: [comprar.length && `${plural(comprar.length, 'insumo abaixo do mínimo', 'insumos abaixo do mínimo')}`].filter(Boolean),
    };
  },
  imobiliaria(d, hoje) {
    const vs = L(d, 'visitas').filter((v) => v.data === hoje && v.status === 'agendada').sort((a, b) => a.hora.localeCompare(b.hora));
    const ps = new Map(L(d, 'pessoas').map((p) => [p.id, p])), im = new Map(L(d, 'imoveis').map((x) => [x.id, x]));
    const cb = L(d, 'cobrancas'), atras = cb.filter((c) => c.status === 'aberto' && c.vencimento < hoje), rep = cb.filter((c) => c.status === 'pago' && !c.repassado);
    return {
      destaques: [['Visitas hoje', String(vs.length)], ['Novos contatos para atender', String(L(d, 'negocios').filter((n) => n.etapa === 'lead').length)], ['Imóveis disponíveis', String(L(d, 'imoveis').filter((x) => x.status === 'disponivel').length)]],
      itens: vs.map((v) => `${v.hora} · ${ps.get(v.cliente)?.nome || ''} · ${im.get(v.imovel)?.codigo || ''}`), tituloItens: 'Visitas de hoje',
      alertas: [atras.length && `${R$(soma(atras, (c) => c.valor))} de aluguéis em atraso`, rep.length && `${plural(rep.length, 'repasse', 'repasses')} a fazer aos proprietários`].filter(Boolean),
    };
  },
  oficina(d, hoje) {
    const ontem = mais(hoje, -1), os = L(d, 'ordens'), ab = os.filter((o) => o.etapa !== 'entregue'), vale = (o) => (o.itens || []).filter((x) => x.aprovado !== false);
    const tot = (o) => soma(vale(o), (x) => x.qtd * x.preco) - (o.desconto || 0);
    const vs = new Map(L(d, 'veiculos').map((v) => [v.id, v])), ags = L(d, 'agendamentos').filter((x) => x.data === hoje).sort((a, b) => a.hora.localeCompare(b.hora));
    return {
      destaques: [['Carros no pátio', `${ab.length} · ${ab.filter((o) => o.etapa === 'pronto').length} prontos`], ['Faturado ontem', R$(soma(os.filter((o) => o.entregue_em === ontem), tot))], ['Agendados hoje', String(ags.length)]],
      itens: ags.map((x) => `${x.hora} · ${vs.get(x.veiculo)?.modelo || ''} ${vs.get(x.veiculo)?.placa || ''} · ${x.servico}`), tituloItens: 'Agendamentos de hoje',
      alertas: [ab.filter((o) => o.etapa === 'orcamento').length && `${plural(ab.filter((o) => o.etapa === 'orcamento').length, 'orçamento esperando resposta', 'orçamentos esperando resposta')}`, ab.filter((o) => o.previsao < hoje && !['pronto'].includes(o.etapa)).length && `${plural(ab.filter((o) => o.previsao < hoje && !['pronto'].includes(o.etapa)).length, 'carro atrasado', 'carros atrasados')} no pátio`].filter(Boolean),
    };
  },
};

/** Resumo do dia de um sistema: { destaques, itens, tituloItens, alertas } */
export function resumoDoDia(app, dados, hoje) {
  const f = RESUMOS[app] || RESUMOS[app.replace(/^nexo-?/, '')];
  return f ? f(dados, hoje) : { destaques: [], itens: [], alertas: [] };
}
export function resumoTexto(nomeSistema, empresa, r, hoje) {
  const [a, m, dd] = hoje.split('-');
  return [`*Resumo do dia · ${empresa}*`, `${nomeSistema} · ${dd}/${m}/${a}`, '', ...r.destaques.map(([k, v]) => `• ${k}: *${v}*`),
    ...(r.alertas.length ? ['', '⚠️ Atenção', ...r.alertas.map((x) => `• ${x}`)] : []), ...(r.itens.length ? ['', r.tituloItens || 'Hoje', ...r.itens.map((x) => `• ${x}`)] : [])].join('\n');
}
export function resumoHTML(nomeSistema, empresa, r, hoje, link) {
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const [a, m, dd] = hoje.split('-');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a18"><p style="color:#8c887f;margin:0">${e(nomeSistema)} · ${dd}/${m}/${a}</p><h1 style="font-size:20px;margin:4px 0 16px">Resumo do dia · ${e(empresa)}</h1>
    <table style="width:100%;border-collapse:collapse">${r.destaques.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#57544e">${e(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${e(v)}</td></tr>`).join('')}</table>
    ${r.alertas.length ? `<div style="margin:16px 0;padding:12px 14px;background:#fbf0dc;border-radius:8px"><b>Atenção</b><ul style="margin:6px 0 0;padding-left:18px">${r.alertas.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>` : ''}
    ${r.itens.length ? `<h2 style="font-size:15px;margin:18px 0 6px">${e(r.tituloItens || 'Hoje')}</h2><ul style="padding-left:18px;margin:0">${r.itens.map((x) => `<li style="margin:4px 0">${e(x)}</li>`).join('')}</ul>` : ''}
    <p style="margin-top:22px"><a href="${e(link)}" style="background:#1a1a18;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir o sistema</a></p>
    <p style="color:#8c887f;font-size:12px;margin-top:22px">Você recebe este e-mail porque ativou o resumo diário nas configurações. Para parar, desligue lá.</p></div>`;
}

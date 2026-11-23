// Anshur · avisos de retorno por e-mail.
// Roda pelo job 'anshur-alertas' (pg_cron, dias úteis às 7h de Brasília) com o segredo do cofre no cabeçalho x-anshur-cron.
// Para cada revenda com avisos ligados (padrão: diário, só os donos; semanal = só às segundas):
//   monta as ações do dia de cada destinatário (mesmo código da Central "Hoje": retencao.js, com o perfil e as lojas dele)
//   e manda e-mail SÓ se houver algo relevante. 1 e-mail por pessoa por dia (anshur_avisos_envios), sem duplicidade.
// Envio: Resend com a chave que já está no cofre da Blue Rose (nexo_config_ler 'resend'), plano grátis. Sem chave: não envia
//   e devolve o que mandaria (o resumo continua dentro do app, na Central "Hoje").
import { createClient } from 'jsr:@supabase/supabase-js@2';
import './retencao.js';

// deno-lint-ignore no-explicit-any
const R = (globalThis as any).RETENCAO;
const APP = 'https://bluerose-store.com/anshur/?entrar';
const json = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { erro: 'use POST' });
  const adm = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: ok } = await adm.rpc('anshur_srv_cron_ok', { p_token: req.headers.get('x-anshur-cron') || '' });
  if (ok !== true) return json(401, { erro: 'não autorizado' });
  const corpo = await req.json().catch(() => ({}));
  const simular = corpo?.simular === true; // monta tudo, não envia e não marca como enviado (conferência)

  const agora = new Date(Date.now() - 3 * 3600e3), hoje = agora.toISOString().slice(0, 10), semana = agora.getUTCDay(); // 1 = segunda
  if (!simular && (semana === 0 || semana === 6)) return json(200, { hoje, motivo: 'fim de semana' });
  const { data: conf } = await adm.rpc('nexo_config_ler', { p_chaves: ['resend', 'resend_de'] });
  const c = Object.fromEntries(((conf || []) as { chave: string; valor: string }[]).map((x) => [x.chave, x.valor]));
  const { data: alvos, error } = await adm.rpc('anshur_srv_avisos_alvos');
  if (error) return json(500, { erro: 'falha ao ler as revendas' });

  const relatorio: unknown[] = [];
  for (const a of (alvos || []) as { revenda: string; nome: string; frequencia: string; destinatarios: { usuario: string; email: string; nome: string; perfil: string; lojas: string[] | null }[]; dados: Record<string, unknown> }[]) {
    if (a.frequencia === 'semanal' && semana !== 1 && !simular) continue;
    const d = (a.dados || {}) as Record<string, any>; // deno-lint-ignore no-explicit-any
    const ex = d.extras || {};
    const todas = R.trocasDoEstado(d);
    // janela: diário = desde o último dia útil (segunda cobre o fim de semana); semanal = 7 dias
    const janela = a.frequencia === 'semanal' ? 7 : semana === 1 ? 3 : 1;
    for (const p of a.destinatarios || []) {
      if (!p.email) continue;
      const lojas = Array.isArray(p.lojas) && p.lojas.length ? p.lojas : null;
      const trocas = lojas ? todas.filter((t: { loja?: string }) => !t.loja || lojas.includes(t.loja)) : todas;
      const nivelOk = (nivel: string) => nivel === 'livre' || p.perfil === 'dono' || (nivel === 'gerente' && p.perfil === 'gerente');
      const { acoes } = R.acoesDoDia({ hoje, perfil: p.perfil, nome: p.nome, trocas, avaliacoes: d.avaliacoes || [], pendentes: d.pendentes || [], garantias: ex.garantias || [], financiadas: ex.financiadas || [], compradores: ex.compradores || [], revenda: d.nomeRevenda || a.nome, podeLiberar: nivelOk, janela });
      const email = R.resumoEmail({ revenda: d.nomeRevenda || a.nome, nome: p.nome, acoes, link: APP, hoje, frequencia: a.frequencia });
      if (!email) { relatorio.push({ revenda: a.revenda, perfil: p.perfil, enviado: false, motivo: 'nada relevante' }); continue; }
      if (simular || !c.resend) { relatorio.push({ revenda: a.revenda, perfil: p.perfil, enviado: false, motivo: simular ? 'simulação' : 'sem chave do Resend', assunto: email.assunto, itens: email.itens }); continue; }
      const { data: novo } = await adm.rpc('anshur_srv_aviso_marcar', { p_revenda: a.revenda, p_dia: hoje, p_usuario: p.usuario, p_itens: email.itens });
      if (novo !== true) { relatorio.push({ revenda: a.revenda, perfil: p.perfil, enviado: false, motivo: 'já enviado hoje' }); continue; }
      const envio = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${c.resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Anshur <avisos@bluerose-store.com>', to: [p.email], subject: email.assunto, html: email.html, text: email.texto }),
      }).catch(() => null);
      await adm.rpc('anshur_srv_aviso_resultado', { p_revenda: a.revenda, p_dia: hoje, p_usuario: p.usuario, p_ok: !!envio?.ok });
      relatorio.push({ revenda: a.revenda, perfil: p.perfil, enviado: !!envio?.ok, status: envio?.status || 0 });
    }
  }
  return json(200, { hoje, revendas: (alvos || []).length, relatorio });
});

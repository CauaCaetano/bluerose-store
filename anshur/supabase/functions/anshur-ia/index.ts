// Anshur · IA da avaliação fotográfica e IA própria da revenda.
// - Publicada com verify_jwt = true. Aqui dentro confere de novo quem é a pessoa e se ela é membro da revenda
//   (pela RPC anshur_minhas_revendas, chamada COM o login da própria pessoa: o RLS decide).
// - Grátis: chave do Gemini da Blue Rose (GEMINI_API_KEY / GOOGLE_API_KEY ou cofre 'gemini_key'), 30 análises por revenda por dia.
// - Chave própria da revenda (Gemini ou OpenAI): só o dono salva/testa/remove; fica cifrada em anshur_ia_chaves e nunca volta
//   ao navegador (só o final "••••1234"). Com chave própria não há limite nosso.
// - A IA SÓ SUGERE: devolve nota 1–5 (ou null quando "não dá para ver") por item da ficha, com justificativa curta,
//   possíveis avarias vistas e fotos faltando/inconclusivas. Implemento (v3): fotos e ficha próprias (discos, mancais, cardã,
//   rodas, estrutura/soldas, pintura/ferrugem), motor e cabine sempre "não se aplica". O texto do pedido vem de retencao.js
//   (promptIA), o mesmo arquivo testado em testes.js. Versão anterior guardada em supabase/anteriores/anshur-ia-v2.
//   O avaliador decide item a item no app; nada é salvo aqui além do uso.
// Ações: status · testar · salvar · remover · analisar.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import './retencao.js';

type Angulo = { id: string; nome: string; dica: string; itens: string[] };
const R = (globalThis as unknown as { RETENCAO: { angulosDe: (t: string) => Angulo[]; limparSugestao: (o: unknown, a: string[], tipo?: string) => unknown;
  promptIA: (tipo: string, m: unknown, angulos: Angulo[], recebidas: string[]) => { instr: string; texto: string }; NAO_SE_APLICA: Record<string, string[]> } }).RETENCAO;
const ORIGENS = ['https://bluerose-store.com', 'https://www.bluerose-store.com', 'https://cauacaetano.github.io'];
const LIMITE_GRATIS = 30, LIMITE_PROPRIA = 100000; // com chave própria só contamos (sem limite nosso)
const MODELO_GRATIS = 'gemini-3.5-flash-lite'; // o mesmo MODELO_GRATIS do nexo-ia
const PADRAO = { gemini: 'gemini-3.5-flash-lite', openai: 'gpt-5-mini' } as const;
const MODELO_OK = /^[A-Za-z0-9][A-Za-z0-9.\-]{1,60}$/;
const TIPOS = ['trator', 'colhedora', 'pulverizador', 'plantadeira', 'implemento'];

function cors(req: Request) {
  const o = req.headers.get('origin') || '';
  const ok = ORIGENS.includes(o) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
  return { 'Access-Control-Allow-Origin': ok ? o : ORIGENS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}
const resp = (req: Request, corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const limpa = (s: unknown, max: number) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, max);
const tiraChaves = (t: string) => t.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[removido]').replace(/sk-[A-Za-z0-9_-]{16,}/g, '[removido]').replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[removido]');
type Prov = { provedor: 'gemini' | 'openai'; chave: string; modelo: string };

async function chaveGratis(adm: ReturnType<typeof createClient>) {
  let chave = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
  if (!chave) { const { data: c } = await adm.rpc('nexo_config_ler', { p_chaves: ['gemini_key'] }); chave = (c as { valor?: string }[] | null)?.[0]?.valor || ''; }
  return (chave || '').trim();
}
async function contaPropria(adm: ReturnType<typeof createClient>, revenda: string) {
  const { data } = await adm.rpc('anshur_srv_ia_chave', { p_revenda: revenda });
  const v = (data as { provedor: string; chave: string; modelo: string | null; final: string | null }[] | null)?.[0];
  if (!v?.chave) return null;
  const provedor = v.provedor === 'openai' ? 'openai' : 'gemini';
  return { provedor, chave: String(v.chave).trim(), modelo: MODELO_OK.test(v.modelo || '') ? v.modelo! : PADRAO[provedor], final: v.final || '' } as Prov & { final: string };
}

type Foto = { angulo: string; nome: string; mime: string; dados: string };
/** Chama o provedor com texto e, se houver, fotos. Devolve { ok, texto, erro }. */
async function chamar(p: Prov, instr: string, texto: string, fotos: Foto[] = [], json = false, max = 1200) {
  try {
    if (p.provedor === 'openai') {
      const conteudo: unknown[] = [];
      fotos.forEach((f) => { conteudo.push({ type: 'text', text: `Foto "${f.angulo}" (${f.nome}):` }); conteudo.push({ type: 'image_url', image_url: { url: `data:${f.mime};base64,${f.dados}`, detail: 'high' } }); });
      conteudo.push({ type: 'text', text: texto });
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.chave}` },
        body: JSON.stringify({ model: p.modelo, messages: [{ role: 'system', content: instr }, { role: 'user', content: conteudo }], max_completion_tokens: max, ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, status: r.status, erro: String(j?.error?.message || r.status).slice(0, 200) };
      return { ok: true, texto: String(j?.choices?.[0]?.message?.content || '').trim() };
    }
    const partes: unknown[] = [];
    fotos.forEach((f) => { partes.push({ text: `Foto "${f.angulo}" (${f.nome}):` }); partes.push({ inline_data: { mime_type: f.mime, data: f.dados } }); });
    partes.push({ text: texto });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.modelo}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.chave },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instr }] }, contents: [{ role: 'user', parts: partes }], generationConfig: { maxOutputTokens: max, temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) } }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, erro: String(j?.error?.message || r.status).slice(0, 200) };
    return { ok: true, texto: (j?.candidates?.[0]?.content?.parts || []).map((x: { text?: string }) => x.text || '').join('').trim() };
  } catch (e) { return { ok: false, status: 0, erro: String((e as Error)?.message || e).slice(0, 200) }; }
}
const testar = (p: Prov) => chamar(p, 'Responda em português, numa frase curta.', 'Diga apenas: conexão funcionando.', [], false, 40);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return resp(req, { erro: 'Método não permitido' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!, servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const adm = createClient(url, servico, { auth: { persistSession: false } });
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: eu } = await adm.auth.getUser(jwt);
    if (eu || !u?.user) return resp(req, { erro: 'Entre de novo para usar a IA.' }, 401);
    const b = await req.json().catch(() => ({}));
    const revenda = limpa(b.revenda, 40);
    if (!/^[0-9a-f-]{36}$/.test(revenda)) return resp(req, { erro: 'Revenda não informada.' }, 400);
    // membro e perfil conferidos com o login da própria pessoa (RLS), não com a chave de serviço
    const eu_ = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: minhas, error: em } = await eu_.rpc('anshur_minhas_revendas');
    const r = ((minhas || []) as { id: string; perfil: string; plano: string }[]).find((x) => x.id === revenda);
    if (em || !r) return resp(req, { erro: 'Sem acesso a esta revenda.' }, 403);
    const dono = r.perfil === 'dono';
    const evento = (tipo: string, texto: string) => eu_.rpc('anshur_registrar_evento', { p_revenda: revenda, p_tipo: tipo, p_texto: texto }).then(() => {}, () => {});
    const propria = await contaPropria(adm, revenda);
    const hojeSP = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const usadas = async () => { const { data } = await adm.from('anshur_ia_uso').select('n').eq('revenda', revenda).eq('dia', hojeSP).maybeSingle(); return Number(data?.n || 0); };

    if (b.acao === 'status') return resp(req, { propria: !!propria, provedor: propria?.provedor || 'blue_rose', modelo: propria?.modelo || MODELO_GRATIS, final: propria?.final || '', limite: propria ? null : LIMITE_GRATIS, restantes: propria ? null : Math.max(0, LIMITE_GRATIS - await usadas()), dono });

    if (['salvar', 'remover', 'testar'].includes(b.acao)) {
      if (!dono) return resp(req, { erro: 'Só o dono muda a inteligência artificial da revenda.' }, 403);
      if (b.acao === 'remover') {
        await adm.from('anshur_ia_chaves').delete().eq('revenda', revenda);
        await evento('config', 'IA: voltou para a IA da Blue Rose (chave própria apagada)');
        return resp(req, { ok: true });
      }
      const provedor = b.provedor === 'openai' ? 'openai' : 'gemini', chave = limpa(b.chave, 300).trim(), modelo = limpa(b.modelo, 60).trim();
      if (modelo && !MODELO_OK.test(modelo)) return resp(req, { ok: false, erro: 'Nome do modelo inválido.' }, 400);
      if (chave && (chave.length < 20 || /\s/.test(chave))) return resp(req, { ok: false, erro: 'Essa chave não parece completa: confira e cole de novo.' }, 400);
      if (b.acao === 'testar') {
        // testa a chave colada (sem salvar), a salva, ou a da Blue Rose
        const p: Prov | null = chave ? { provedor, chave, modelo: modelo || PADRAO[provedor] } : propria || null;
        const alvo = p || { provedor: 'gemini' as const, chave: await chaveGratis(adm), modelo: MODELO_GRATIS };
        if (!alvo.chave) return resp(req, { ok: false, erro: 'A IA da Blue Rose ainda está sendo ativada.' });
        const t = await testar(alvo);
        return resp(req, t.ok ? { ok: true, provedor: p ? alvo.provedor : 'blue_rose', modelo: alvo.modelo } : { ok: false, erro: `${alvo.provedor === 'openai' ? 'A OpenAI' : 'O Google'} recusou: ${tiraChaves(t.erro || '')}` });
      }
      if (!chave && !propria) return resp(req, { ok: false, erro: 'Cole a chave de API.' }, 400);
      const nova: Prov = { provedor, chave: chave || propria!.chave, modelo: modelo || PADRAO[provedor] };
      const t = await testar(nova);
      if (!t.ok) return resp(req, { ok: false, erro: `${provedor === 'openai' ? 'A OpenAI' : 'O Google'} recusou: ${tiraChaves(t.erro || '')}. Nada foi salvo.` });
      const { error } = await adm.from('anshur_ia_chaves').upsert({ revenda, provedor, chave: nova.chave, modelo: modelo || null, final: nova.chave.slice(-4), atualizado: new Date().toISOString(), atualizado_por: u.user.id });
      if (error) throw error;
      await evento('config', `IA: chave própria ${provedor === 'openai' ? 'da OpenAI' : 'do Gemini'} salva (modelo ${nova.modelo})`);
      return resp(req, { ok: true, provedor, modelo: nova.modelo, final: nova.chave.slice(-4) });
    }

    if (b.acao !== 'analisar') return resp(req, { erro: 'Ação desconhecida.' }, 400);
    if (r.perfil === 'auditor' || r.plano === 'suspenso') return resp(req, { erro: 'Seu acesso é só de leitura.' }, 403);
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'trator';
    const angulos = R.angulosDe(tipo), ids = angulos.map((a) => a.id);
    const fotos: Foto[] = (Array.isArray(b.fotos) ? b.fotos : []).slice(0, 15).map((f: Record<string, unknown>) => ({ angulo: limpa(f?.angulo, 30), nome: '', mime: f?.mime === 'image/png' ? 'image/png' : 'image/jpeg', dados: typeof f?.dados === 'string' ? f.dados : '' }))
      .filter((f: Foto) => ids.includes(f.angulo) && /^[A-Za-z0-9+/=]+$/.test(f.dados) && f.dados.length <= 1_600_000)
      .map((f: Foto) => ({ ...f, nome: angulos.find((a) => a.id === f.angulo)!.nome }));
    if (fotos.length < 3) return resp(req, { erro: 'Mande pelo menos 3 fotos nítidas.' }, 400);
    const gratis = propria ? null : await chaveGratis(adm);
    if (!propria && !gratis) return resp(req, { erro: 'A IA ainda está sendo ativada.' }, 503);
    const { data: restam, error: ec } = await adm.rpc('anshur_srv_ia_consumir', { p_revenda: revenda, p_limite: propria ? LIMITE_PROPRIA : LIMITE_GRATIS });
    if (ec) throw ec;
    if (restam === -1) return resp(req, { erro: `As ${LIMITE_GRATIS} análises grátis de hoje acabaram. Amanhã tem mais, ou o dono conecta a chave própria em Configurações › Inteligência artificial.` }, 429);
    const m = b.maquina || {};
    const { instr, texto } = R.promptIA(tipo, m, angulos, fotos.map((f) => f.angulo));
    const p = propria || { provedor: 'gemini' as const, chave: gratis!, modelo: MODELO_GRATIS };
    const rr = await chamar(p, instr, texto, fotos, true, 2000);
    if (!rr.ok) {
      await adm.rpc('anshur_srv_ia_consumir', { p_revenda: revenda, p_limite: -1 }).then(() => {}, () => {});
      return resp(req, { erro: propria ? `A IA da sua conta não respondeu: ${tiraChaves(rr.erro || '')}` : 'A IA está ocupada agora. Tente de novo em instantes.' }, 502);
    }
    let bruto: unknown = {};
    try { bruto = JSON.parse(String(rr.texto || '').replace(/^```(json)?|```$/g, '').trim()); } catch { bruto = {}; }
    const sugestao = R.limparSugestao(bruto, ids, tipo) as { itens: Record<string, { nota: number | null }>; avarias: unknown[] };
    const fora = R.NAO_SE_APLICA[tipo] || [];
    const notas = Object.entries(sugestao.itens).filter(([k]) => !fora.includes(k)).map(([k, v]) => `${k} ${v.nota ?? '—'}`).join(', ');
    await evento('ia', `IA sugeriu notas nas fotos de ${limpa(m.marca, 40)} ${limpa(m.modelo, 40)} (${fotos.length} fotos): ${notas}; ${sugestao.avarias.length} possíveis avarias. Aguarda revisão do avaliador.`);
    return resp(req, { sugestao, provedor: propria ? propria.provedor : 'blue_rose', modelo: p.modelo, restantes: propria ? null : restam });
  } catch (_e) {
    return resp(req, { erro: 'Não foi possível analisar agora.' }, 500);
  }
});

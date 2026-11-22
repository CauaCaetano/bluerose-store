// Popina · conta OPCIONAL do cliente do cardápio (delivery/retirada): entrar com Google ou com e-mail e senha.
// É o cliente final do restaurante, NÃO um assinante da Blue Rose: guarda só a própria linha em popina_clientes
// (RLS: cada um lê e grava só a sua) e usa uma sessão separada (storageKey próprio), sem tocar na conta do sistema.
// Na demonstração (sem ?r=) tudo é simulado neste aparelho; o "Entrar com Google" entra como cliente de exemplo.
// Também tem o endereço fácil: CEP pelo ViaCEP (grátis, sem chave) e "usar minha localização" (OpenStreetMap, grátis).

const CHAVE_SESSAO = 'popina-cliente';
const CHAVE_DEMO = 'popina-cli-conta-exemplo';
const lerJ = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const gravarJ = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem acesso */ } };
const limpa = (s, n) => String(s ?? '').trim().slice(0, n);
const soDig = (s) => String(s || '').replace(/\D/g, '');

// ------------------------------------------------------------------ endereços (o mesmo formato com conta, sem conta e na demonstração)
export const novoId = () => Math.random().toString(36).slice(2, 10);
export function endLimpo(e) {
  return { id: limpa(e?.id, 12) || novoId(), apelido: limpa(e?.apelido, 20) || 'Casa', cep: soDig(e?.cep).slice(0, 8), rua: limpa(e?.rua, 100), numero: limpa(e?.numero, 12),
    compl: limpa(e?.compl, 60), bairro: limpa(e?.bairro, 60), cidade: limpa(e?.cidade, 60), ref: limpa(e?.ref, 60) };
}
export const endLinha = (e) => [[e.rua, e.numero].filter(Boolean).join(', '), e.compl].filter(Boolean).join(', ');
const mesmoEnd = (a, b) => a.rua.toLowerCase() === b.rua.toLowerCase() && a.numero.toLowerCase() === b.numero.toLowerCase() && (a.compl || '').toLowerCase() === (b.compl || '').toLowerCase();
export function juntarEnd(lista, e) {
  const n = endLimpo(e), l = (lista || []).map(endLimpo);
  const k = l.findIndex((x) => x.id === n.id || mesmoEnd(x, n));
  if (k >= 0) l[k] = { ...n, id: l[k].id }; else l.unshift(n);
  return l.slice(0, 10);
}

// bairro que veio do CEP ou do mapa → bairro da lista do restaurante (sem acento, sem "jardim/jd", contém)
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/\b(jardim|jd|jdm|vila|vl|parque|pq|conjunto|cj|residencial|res)\b\.?/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
export function casarBairro(bairros, nome, cidade = '') {
  const b = norm(nome); if (!b || !bairros?.length) return '';
  const c = norm(cidade), daCidade = (x) => !c || !x.cidade || norm(x.cidade) === c;
  const l = bairros.filter(daCidade).length ? bairros.filter(daCidade) : bairros;
  const ex = l.find((x) => norm(x.nome) === b) || l.find((x) => String(x.nome).toLowerCase() === String(nome).toLowerCase());
  if (ex) return ex.nome;
  const parc = l.find((x) => { const y = norm(x.nome); return y && (y.includes(b) || b.includes(y)); });
  return parc ? parc.nome : '';
}

// CEP → rua, bairro e cidade (ViaCEP)
export async function buscarCep(cep) {
  const d = soDig(cep); if (d.length !== 8) throw new Error('CEP precisa ter 8 números');
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctl.signal });
    if (!r.ok) throw new Error('CEP não encontrado');
    const j = await r.json(); if (j.erro) throw new Error('CEP não encontrado');
    return { cep: d, rua: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', uf: j.uf || '' };
  } catch (e) { throw new Error(e?.name === 'AbortError' || /fetch/i.test(e?.message || '') ? 'Não deu para consultar o CEP agora. Preencha à mão.' : e.message); }
  finally { clearTimeout(tm); }
}
// minha localização → rua, número, bairro, cidade e CEP (OpenStreetMap; só quando a pessoa toca no botão)
export function minhaLocalizacao() {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha(new Error('Este aparelho não informa a localização'));
    navigator.geolocation.getCurrentPosition(async (p) => {
      try {
        const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=pt-BR&lat=${p.coords.latitude.toFixed(6)}&lon=${p.coords.longitude.toFixed(6)}`;
        const r = await fetch(u); if (!r.ok) throw new Error();
        const a = (await r.json()).address || {};
        ok({ cep: soDig(a.postcode).slice(0, 8), rua: a.road || a.pedestrian || '', numero: a.house_number || '', bairro: a.suburb || a.neighbourhood || a.quarter || a.city_district || '', cidade: a.city || a.town || a.village || a.municipality || '' });
      } catch { falha(new Error('Não deu para achar o endereço pela localização. Use o CEP.')); }
    }, (e) => falha(new Error(e?.code === 1 ? 'Localização não permitida. Use o CEP.' : 'Não deu para pegar a localização. Use o CEP.')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}

// ------------------------------------------------------------------ a conta
// conta.estado(): null (sem conta) ou { id, email, nome, telefone, enderecos, via: 'google'|'email'|'exemplo' }
export function criarConta({ real }) {
  let estado = null, cli = null, carregando = null;
  const ouvintes = new Set(), avisa = () => ouvintes.forEach((f) => { try { f(estado); } catch { /* nada */ } });

  // ---------- demonstração: tudo neste aparelho, sem senha guardada
  if (!real) {
    estado = lerJ(CHAVE_DEMO);
    const grava = () => { gravarJ(CHAVE_DEMO, estado); avisa(); };
    return {
      real: false, estado: () => estado, iniciar: async () => estado, ouvir: (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
      async google() {
        estado = { id: 'exemplo', email: 'cliente@exemplo.com', nome: 'Cliente de exemplo', telefone: '16999990000', via: 'exemplo',
          enderecos: [endLimpo({ apelido: 'Casa', cep: '14622282', rua: 'Avenida N', numero: '120', bairro: 'Jardim Boa Vista', cidade: 'Orlândia', ref: 'Portão azul' })] };
        grava(); return { ok: true };
      },
      async entrar(email) { const e = limpa(email, 120).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Confira o e-mail'); if (estado?.email !== e) estado = { id: 'exemplo', email: e, nome: e.split('@')[0], telefone: '', enderecos: [], via: 'email' }; grava(); return { ok: true }; },
      async criar(nome, email) { const e = limpa(email, 120).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Confira o e-mail'); estado = { id: 'exemplo', email: e, nome: limpa(nome, 80), telefone: '', enderecos: [], via: 'email' }; grava(); return { ok: true }; },
      async sair() { estado = null; gravarJ(CHAVE_DEMO, null); avisa(); },
      async salvar(patch) { if (!estado) return; Object.assign(estado, patch); grava(); },
    };
  }

  // ---------- de verdade: Supabase Auth com sessão separada da conta de assinante
  const carregar = (src) => new Promise((ok, falha) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('Sem internet agora')); document.head.appendChild(s); });
  async function sb() {
    if (cli) return cli;
    if (!carregando) carregando = carregar('../base/supabase.js').then(() => {
      const c = window.NEXO_NUVEM;
      cli = window.supabase.createClient(c.url, c.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: CHAVE_SESSAO } });
      cli.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT' || !s) { if (estado) { estado = null; avisa(); } } else if (!estado || estado.id !== s.user.id) setTimeout(() => montar(s.user), 0); });
      return cli;
    }).catch((e) => { carregando = null; throw e; });
    return carregando;
  }
  async function montar(u) {
    if (!u) { estado = null; avisa(); return null; }
    const c = await sb(), md = u.user_metadata || {};
    let { data: linha } = await c.from('popina_clientes').select('nome,telefone,enderecos').eq('user_id', u.id).maybeSingle();
    if (!linha) { linha = { nome: limpa(md.full_name || md.name || md.nome || '', 80), telefone: '', enderecos: [] }; await c.from('popina_clientes').upsert({ user_id: u.id, ...linha }); }
    estado = { id: u.id, email: u.email || '', nome: linha.nome || limpa(md.full_name || md.name || '', 80), telefone: linha.telefone || '', enderecos: (Array.isArray(linha.enderecos) ? linha.enderecos : []).map(endLimpo), via: u.app_metadata?.provider === 'google' ? 'google' : 'email' };
    avisa(); return estado;
  }
  const volta = () => { const u = new URL(location.href); u.hash = ''; return u.toString(); };
  return {
    real: true, estado: () => estado, ouvir: (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
    // só carrega o Supabase na abertura se já houver sessão guardada ou se voltou do Google
    async iniciar() {
      const tem = (() => { try { return !!localStorage.getItem(CHAVE_SESSAO); } catch { return false; } })() || /access_token=|[?&]code=/.test(location.hash + location.search);
      if (!tem) return null;
      try { const c = await sb(); const { data } = await c.auth.getSession(); return await montar(data?.session?.user || null); } catch { return null; }
    },
    async google() { const c = await sb(); const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volta(), queryParams: { prompt: 'select_account' } } }); if (error) throw error; return { ok: true, saiu: true }; },
    async entrar(email, senha) { const c = await sb(); const { data, error } = await c.auth.signInWithPassword({ email: limpa(email, 120), password: String(senha || '') }); if (error) throw new Error(/invalid/i.test(error.message) ? 'E-mail ou senha não conferem' : /confirm/i.test(error.message) ? 'Confirme o e-mail pelo link que mandamos e entre de novo' : 'Não deu para entrar agora'); await montar(data.user); return { ok: true }; },
    async criar(nome, email, senha) {
      const c = await sb(); const { data, error } = await c.auth.signUp({ email: limpa(email, 120), password: String(senha || ''), options: { emailRedirectTo: volta(), data: { nome: limpa(nome, 80), origem: 'popina-cardapio' } } });
      if (error) throw new Error(/registered|exists/i.test(error.message) ? 'Este e-mail já tem conta. Use "Entrar".' : /password/i.test(error.message) ? 'A senha precisa ter pelo menos 6 caracteres' : 'Não deu para criar a conta agora');
      if (!data.session) return { ok: true, confirmar: true };
      await c.from('popina_clientes').upsert({ user_id: data.user.id, nome: limpa(nome, 80) }); await montar(data.user); return { ok: true };
    },
    async sair() { try { const c = await sb(); await c.auth.signOut({ scope: 'local' }); } catch { /* nada */ } estado = null; avisa(); },
    async salvar(patch) {
      if (!estado) return; Object.assign(estado, patch);
      const c = await sb(); await c.from('popina_clientes').upsert({ user_id: estado.id, nome: limpa(estado.nome, 80), telefone: soDig(estado.telefone).slice(0, 13), enderecos: (estado.enderecos || []).map(endLimpo).slice(0, 10) });
      avisa();
    },
  };
}

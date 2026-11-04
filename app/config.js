// Conexão da Veltria com o banco (chave pública; o acesso é controlado pelas regras de segurança das tabelas)
// Isolamento (03/11/2026): só o site oficial fala com o banco real; teste publicado e cópia local usam um endereço desligado
// (nada de conta, assinatura ou e-mail real a partir do teste). O tools/publicar-teste.sh também troca o endereço.
window.BR_OFICIAL = /(^|\.)bluerose-store\.com$/.test(location.hostname);
window.NEXO_NUVEM = { url: window.BR_OFICIAL ? 'https://yihnfzwtkqdfnwziutqa.supabase.co' : 'https://banco-desligado-no-teste.invalid', chave: 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5' };

/*
 * Para onde vão os pedidos do formulário do site.
 *
 * Vazio (padrão): o formulário abre o WhatsApp com a mensagem pronta.
 * Preenchido: o pedido é gravado na tabela leads_site do Supabase e
 * o formulário confirma o recebimento na própria página.
 *
 * A chave aqui é a chave PÚBLICA (anon/publishable) do Supabase. Ela pode
 * ficar visível: a tabela só aceita INSERIR pedidos, nunca ler ou alterar.
 * Nunca coloque a service_role aqui.
 */
// Isolamento (03/11/2026): só o site oficial grava no banco real; teste e cópia local usam um endereço desligado.
window.BR_OFICIAL = /(^|\.)bluerose-store\.com$/.test(location.hostname);
window.BR_LEADS = { url: window.BR_OFICIAL ? 'https://yihnfzwtkqdfnwziutqa.supabase.co' : 'https://banco-desligado-no-teste.invalid', chave: 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5' };

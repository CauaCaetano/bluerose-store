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
window.BR_LEADS = { url: 'https://yihnfzwtkqdfnwziutqa.supabase.co', chave: 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5' };

/* PayPal: recebe de quem compra em outro idioma (euro ou dólar). Em português do Brasil continua o Mercado Pago.
   comerciante: o "Código de comerciante" (Merchant ID) da conta PayPal Empresa, em
   PayPal → Configurações da conta → Informações da empresa. Não é senha nem chave: pode ficar público.
   Enquanto estiver vazio, o botão manda a pessoa falar com a equipe. */
window.BR_PAYPAL = {
  // ID da conta do dono: 4E6EQ2765UZSC. Só ligar depois do upgrade para conta Empresa:
  // em conta Pessoal o PayPal recusa o botão ("Ocorreu um erro", testado em 30/10/2026).
  comerciante: ''
};

// demonstração (sem ?r= do restaurante): faixa para voltar ao sistema e ao site, na mesma aba
// arquivo próprio porque a política de segurança do cardápio não deixa rodar script dentro do HTML
if (!new URLSearchParams(location.search).get('r')) {
  const f = document.createElement('div');
  f.className = 'demo-cardapio';
  f.innerHTML = '<a target="_top" href="../../../popina.html">← Voltar ao site</a><a href="app.html">Voltar ao sistema</a><span>Cardápio que o cliente vê pelo QR da mesa ou pelo link</span>';
  document.body.prepend(f);
}

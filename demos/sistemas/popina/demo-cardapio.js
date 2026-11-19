// demonstração (sem ?r= do restaurante): faixa para voltar ao sistema e ao site, na mesma aba
// arquivo próprio porque a política de segurança do cardápio não deixa rodar script dentro do HTML
if (!new URLSearchParams(location.search).get('r')) {
  const f = document.createElement('div');
  f.className = 'demo-cardapio';
  f.innerHTML = '<a target="_top" href="../../../popina.html">← Voltar ao site</a><a href="app.html">Voltar à demonstração</a><span>Cardápio que o cliente vê pelo QR da mesa</span>';
  document.body.prepend(f);
}

// animações do cardápio: cascata só na abertura e onda em cada toque (vale para o cardápio real também: este arquivo carrega sempre)
document.body.classList.add('cli-entrando'); setTimeout(() => document.body.classList.remove('cli-entrando'), 1800);
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button, a, .cli-prod, .cli-dest'); if (!b) return;
  const o = document.createElement('span'); o.className = 'onda-toque'; o.style.left = `${e.clientX}px`; o.style.top = `${e.clientY}px`; o.style.color = getComputedStyle(b).color;
  document.body.append(o); setTimeout(() => o.remove(), 600);
}, { passive: true });

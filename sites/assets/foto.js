// Foto real dos sites de exemplo (28/10/2026): a foto principal de cada cena, sem efeito.
// Uso: const f = foto(contêiner, { foto, alt }); f.trocar(novaFoto) troca com um esmaecimento curto e limpo
// (a foto nova só aparece depois de carregada, então nunca há duas fotos misturadas pela metade por muito tempo).
export function foto(caixa, { foto: url, alt = '' }) {
  caixa.classList.add('foto-caixa');
  const nova = (src) => { const i = document.createElement('img'); i.src = src; i.alt = alt; i.decoding = 'async'; i.className = 'foto-img'; return i; };
  let atual = nova(url); atual.classList.add('ativa'); caixa.prepend(atual);
  let pedido = 0;
  return {
    trocar(src) {
      if (atual.getAttribute('src') === src) return;
      const n = ++pedido, img = nova(src);
      img.onload = () => {
        if (n !== pedido) return; // chegou outra troca no meio: vale a mais recente
        caixa.insertBefore(img, atual.nextSibling);
        requestAnimationFrame(() => { img.classList.add('ativa'); });
        const velha = atual; atual = img;
        setTimeout(() => velha.remove(), 450);
      };
    },
  };
}

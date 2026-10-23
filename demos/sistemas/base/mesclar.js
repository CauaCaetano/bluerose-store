/*
 * Veltria · junta as alterações de duas pessoas da equipe, item por item (fusão de três vias).
 * base = a versão que os dois partiram (a última vinda da nuvem neste aparelho);
 * local = o que esta pessoa tem agora; remoto = o que está na nuvem (outra pessoa já salvou).
 * Regras: o que só um lado mudou, vale esse lado; itens de listas com id (clientes, vendas, prazos...) são
 * juntados um a um, então duas pessoas cadastrando ao mesmo tempo não se apagam; item apagado de um lado
 * some, a não ser que o outro lado tenha mudado esse mesmo item (aí fica); se os dois mudaram o mesmo
 * campo do mesmo item, vale o desta pessoa (a última a salvar).
 * Script comum: define window.veltriaMesclar (usado por conta-nuvem.js e porta.js). Teste: scratchpad/teste_mesclar.mjs.
 */
(function (raiz) {
  var igual = function (a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); };
  var objeto = function (x) { return x !== null && typeof x === 'object' && !Array.isArray(x); };
  // chave de um item de lista: id, ou o número da venda/OS/nota
  var chave = function (x) { return objeto(x) ? (x.id != null ? 'i' + x.id : x.num != null ? 'u' + x.num : x.n != null ? 'n' + x.n : null) : null; };
  var comChave = function (l) { return Array.isArray(l) && l.every(function (x) { return chave(x) !== null; }); };

  function lista(b, l, r) {
    var mb = {}, mr = {}, ml = {};
    b.forEach(function (x) { mb[chave(x)] = x; }); r.forEach(function (x) { mr[chave(x)] = x; }); l.forEach(function (x) { ml[chave(x)] = x; });
    var out = [], usado = {};
    l.forEach(function (x) {
      var k = chave(x);
      if (k in mr) out.push(mesclar(k in mb ? mb[k] : x, x, mr[k]));
      else if (!(k in mb)) out.push(x); // novo daqui
      else if (!igual(x, mb[k])) out.push(x); // o outro apagou, mas aqui mudou: fica
      usado[k] = 1;
    });
    // novos do outro lado entram logo depois do item que vinha antes deles lá
    r.forEach(function (x, i) {
      var k = chave(x); if (usado[k]) return;
      if (k in mb && igual(x, mb[k])) return; // apagado aqui e não mudado lá: sai
      var pos = 0;
      for (var j = i - 1; j >= 0; j--) { var a = chave(r[j]), p = out.findIndex(function (y) { return chave(y) === a; }); if (p >= 0) { pos = p + 1; break; } }
      out.splice(pos, 0, x); usado[k] = 1;
    });
    return out;
  }

  function mesclar(b, l, r) {
    if (igual(l, r)) return l;
    if (igual(l, b)) return r;
    if (igual(r, b)) return l;
    if (objeto(l) && objeto(r)) {
      var bb = objeto(b) ? b : {}, o = {}, ks = {};
      Object.keys(r).concat(Object.keys(l)).forEach(function (k) { ks[k] = 1; });
      Object.keys(ks).forEach(function (k) {
        var temL = k in l, temR = k in r, temB = k in bb;
        if (temL && temR) o[k] = mesclar(bb[k], l[k], r[k]);
        else if (temL) { if (!temB || !igual(l[k], bb[k])) o[k] = l[k]; } // o outro apagou a chave
        else if (temR) { if (!temB || !igual(r[k], bb[k])) o[k] = r[k]; }
      });
      return o;
    }
    if (Array.isArray(l) && Array.isArray(r) && comChave(l) && comChave(r) && (b === undefined || comChave(b))) return lista(Array.isArray(b) ? b : [], l, r);
    return l; // os dois mudaram o mesmo valor: vale o desta pessoa
  }
  raiz.veltriaMesclar = function (base, local, remoto) { return mesclar(base, local, remoto); };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Veltria · ler planilha do Excel (.xlsx) no navegador, sem biblioteca.
 * O .xlsx é um zip: lê o diretório do zip, descompacta (DecompressionStream 'deflate-raw') a primeira aba e
 * os textos compartilhados, e devolve as linhas como listas de textos (como o CSV). Datas do Excel viram DD/MM/AAAA.
 * window.veltriaLerXlsx(arrayBuffer) -> Promise<string[][]>
 */
(function () {
  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }
  function arquivos(buf) {
    var b = new Uint8Array(buf), fim = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (u32(b, i) === 0x06054b50) { fim = i; break; }
    if (fim < 0) throw new Error('Esse arquivo não parece uma planilha do Excel (.xlsx).');
    var n = u16(b, fim + 10), p = u32(b, fim + 16), out = {};
    for (var k = 0; k < n; k++) {
      var metodo = u16(b, p + 10), tamC = u32(b, p + 20), lnome = u16(b, p + 28), lextra = u16(b, p + 30), lcom = u16(b, p + 32), local = u32(b, p + 42);
      var nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + lnome));
      var ini = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      out[nome] = { metodo: metodo, dados: b.subarray(ini, ini + tamC) };
      p += 46 + lnome + lextra + lcom;
    }
    return out;
  }
  function texto(f) {
    if (!f) return Promise.resolve('');
    if (f.metodo === 0) return Promise.resolve(new TextDecoder().decode(f.dados));
    var s = new Blob([f.dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(s).text();
  }
  var col = function (ref) { var l = ref.replace(/\d+/g, ''), n = 0; for (var i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n - 1; };
  var desfaz = function (s) { return s.replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); }).replace(/&#(\d+);/g, function (m, d) { return String.fromCodePoint(Number(d)); }).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); };
  window.veltriaLerXlsx = function (buf) {
    var a = arquivos(buf);
    var aba = a['xl/worksheets/sheet1.xml'] || a[Object.keys(a).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).sort()[0]];
    if (!aba) return Promise.reject(new Error('A planilha não tem nenhuma aba.'));
    return Promise.all([texto(a['xl/sharedStrings.xml']), texto(aba), texto(a['xl/styles.xml'])]).then(function (r) {
      var comp = [], re = /<si>([\s\S]*?)<\/si>/g, m;
      while ((m = re.exec(r[0]))) comp.push(desfaz((m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('')));
      // estilos de data (numFmt 14 a 22 ou formatos com d/m/a): números nessas células viram data
      var datas = {}, xfs = (r[2].match(/<cellXfs[\s\S]*?<\/cellXfs>/) || [''])[0].match(/<xf [^>]*>/g) || [];
      var proprios = {}; (r[2].match(/<numFmt [^>]*>/g) || []).forEach(function (f) { var id = (f.match(/numFmtId="(\d+)"/) || [])[1], c = (f.match(/formatCode="([^"]*)"/) || [])[1] || ''; if (/[dy]/i.test(c) && !/\[h\]/i.test(c)) proprios[id] = 1; });
      xfs.forEach(function (x, i) { var id = Number((x.match(/numFmtId="(\d+)"/) || [])[1]); if ((id >= 14 && id <= 22) || proprios[id]) datas[i] = 1; });
      var linhas = [], rl = /<row[^>]*>([\s\S]*?)<\/row>/g, rr;
      while ((rr = rl.exec(r[1]))) {
        var lin = [], rc = /<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, cc;
        while ((cc = rc.exec(rr[1]))) {
          var at = cc[1], ref = (at.match(/r="([A-Z]+\d+)"/) || [])[1], t = (at.match(/t="(\w+)"/) || [])[1], s = Number((at.match(/s="(\d+)"/) || [])[1]);
          var v = ((cc[2] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1], val = '';
          if (t === 's') val = comp[Number(v)] || '';
          else if (t === 'inlineStr') val = desfaz(((cc[2] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '');
          else if (v != null) {
            val = desfaz(v);
            if (datas[s] && /^\d+(\.\d+)?$/.test(val)) { var d = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(val)) * 864e5); val = String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear(); }
          }
          lin[ref ? col(ref) : lin.length] = val;
        }
        for (var i = 0; i < lin.length; i++) if (lin[i] == null) lin[i] = '';
        if (lin.some(function (x) { return String(x).trim(); })) linhas.push(lin);
      }
      return linhas;
    });
  };
})();

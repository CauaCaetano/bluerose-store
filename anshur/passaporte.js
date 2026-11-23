(function(){const i=window.ANSHUR,r=window.COMUM,{real:l,esc:n,data:v,NOMES:p,FICHA:u}=r;document.getElementById("marca").innerHTML='<img src="logo/anshur-logo.png?v=44" alt="Anshur" width="150" height="38" style="display:block;height:auto">';const h=document.getElementById("tela"),m=new URLSearchParams(location.search).get("id"),o=i.trocas.find(a=>a.id===m&&!a.vendido)||i.trocas.find(a=>a.id===m)||r.C.patio()[0];document.title=`${o.marca} ${o.modelo} ${o.ano} \xB7 Passaporte Anshur`;const s=o.manutencoes||[],t=s.filter(a=>a.comNota),g=s.filter(a=>!a.comNota),c=o.verif||{horimetro:!0,notas:t.length>0,chassi:!0},$=[["Hor\xEDmetro conferido na entrada",c.horimetro],["Chassi e n\xFAmero de s\xE9rie conferidos",c.chassi],["Notas ou ordens de servi\xE7o entregues",c.notas],["Registro no ID Agro (Renagro)",o.idAgro]],b=[0,1,2,3].map(a=>{const e=window.FOTOS.de(o,a);return`<div style="background-image:url('${e.propria?e.u:a?window.FOTOS.mini(e.u):e.u}')" role="img" aria-label="Foto da m\xE1quina"></div>`}).join(""),f=[{d:o.entrada,x:"Entrada no p\xE1tio da revenda"}].concat((o.precos||[]).map(a=>({d:a.data,x:`${a.motivo}: ${l(a.valor)}`}))).sort((a,e)=>a.d.localeCompare(e.d));h.innerHTML=`
    <section class="capa">
      <div class="ficha-topo">
        <span class="id">PASSAPORTE ANS-${n(o.id)} \xB7 ${p[o.tipo].toUpperCase()}</span>
        <h1>${n(o.marca+" "+o.modelo)}</h1>
        <div class="linha"><span>Ano ${o.ano}</span><span>${o.horas.toLocaleString("pt-BR")} horas</span><span>Inspe\xE7\xE3o ${o.cond}/100</span></div>
        ${o.anuncio?`<span class="preco">${l(o.anuncio)}</span>`:""}
        <div class="galeria">${b}</div>
      </div>
      <aside class="qr-caixa">
        <h2 style="font-size:16px">QR Code deste passaporte</h2>
        <div class="qr" id="qr" aria-label="QR Code que abre esta p\xE1gina"></div>
        <p style="font-size:13px;color:var(--cinza)">Cole no vidro da m\xE1quina e use o mesmo link no an\xFAncio. Quem escanear abre esta p\xE1gina.</p>
        <div class="acoes"><button class="btn" type="button" id="copiar">Copiar link</button><button class="btn linha" type="button" onclick="print()">Imprimir</button></div>
      </aside>
    </section>
    <div class="secoes">
      <section class="sec"><h2>Identifica\xE7\xE3o</h2><div class="det">
        <div><span>Categoria</span><b>${p[o.tipo]}</b></div><div><span>Fabricante</span><b>${n(o.marca)}</b></div>
        <div><span>Modelo</span><b>${n(o.modelo)}</b></div><div><span>Ano</span><b>${o.ano}</b></div>
        <div><span>Horas</span><b>${o.horas.toLocaleString("pt-BR")}</b></div><div><span>Revenda</span><b>${n(i.revenda.nome)}</b></div></div></section>
      <section class="sec"><h2>Inspe\xE7\xE3o da revenda</h2>
        <div class="notas">${u.map(([a,e])=>`<div><span>${e}</span><div class="pontos" aria-label="${o.ficha[a]} de 5">${[1,2,3,4,5].map(C=>`<i class="${C<=o.ficha[a]?"on":""}"></i>`).join("")}</div></div>`).join("")}</div>
        <p class="aviso">Inspe\xE7\xE3o visual feita pela equipe da revenda na entrada da m\xE1quina.</p></section>
      <section class="sec"><h2>Documenta\xE7\xE3o</h2><ul class="lista">
        ${$.map(([a,e])=>`<li><span>${a}</span>${e?'<span class="tag comprovado">Comprovado</span>':'<span class="tag pendente">Pendente</span>'}</li>`).join("")}</ul></section>
      <section class="sec"><h2>Hist\xF3rico de movimenta\xE7\xF5es</h2><ul class="tempo">${f.map(a=>`<li>${n(a.x)}<span>${v(a.d)}</span></li>`).join("")}</ul></section>
      <section class="sec inteira"><h2>Hist\xF3rico de manuten\xE7\xE3o</h2>
        <div class="legenda"><span class="tag comprovado">Comprovado: tem nota ou ordem de servi\xE7o</span><span class="tag declarado">Declarado: informado pelo dono anterior</span></div>
        ${s.length?`<ul class="lista">${[...t,...g].map(a=>`<li><span>${n(a.servico)} <span style="color:var(--cinza);font-size:13px">\xB7 com ${Number(a.horas).toLocaleString("pt-BR")} h</span></span><span class="tag ${a.comNota?"comprovado":"declarado"}">${a.comNota?"Comprovado":"Declarado"}</span></li>`).join("")}</ul>`:'<p style="color:var(--cinza)">Nenhuma manuten\xE7\xE3o registrada ainda.</p>'}
        <p class="aviso">${t.length} de ${s.length} manuten\xE7\xF5es t\xEAm comprovante.</p></section>
    </div>
    <p class="aviso">Este passaporte organiza informa\xE7\xF5es da revenda. N\xE3o \xE9 laudo t\xE9cnico nem certifica\xE7\xE3o. Revenda e dados fict\xEDcios, s\xF3 para demonstra\xE7\xE3o. Fotos de demonstra\xE7\xE3o: Wikimedia Commons, licen\xE7as livres.</p>`;const d=location.href;try{const a=window.qrcode(0,"M");a.addData(d),a.make(),document.getElementById("qr").innerHTML=a.createSvgTag({cellSize:4,margin:0,scalable:!0})}catch{document.getElementById("qr").textContent="QR Code indispon\xEDvel sem internet."}document.getElementById("copiar").onclick=async a=>{try{await navigator.clipboard.writeText(d),a.currentTarget.textContent="Link copiado"}catch{prompt("Copie o link:",d)}}})();

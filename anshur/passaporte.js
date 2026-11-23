(function(){const c=window.ANSHUR,t=window.COMUM,{real:p,esc:n,data:m,NOMES:v,FICHA:g}=t;document.getElementById("marca").innerHTML='<img src="logo/anshur-logo.png?v=45" alt="Anshur" width="150" height="38" style="display:block;height:auto">';const $=document.getElementById("tela"),u=new URLSearchParams(location.search).get("id"),o=c.trocas.find(a=>a.id===u&&!a.vendido)||c.trocas.find(a=>a.id===u)||t.C.patio()[0];document.title=`${o.marca} ${o.modelo} ${o.ano} \xB7 Passaporte Anshur`;const i=o.manutencoes||[],r=i.filter(a=>a.comNota),b=i.filter(a=>!a.comNota),d=o.verif||{horimetro:!0,notas:r.length>0,chassi:!0},h=String(o.chassi||"").toUpperCase().replace(/[^A-Z0-9]/g,""),f={deere:"John Deere Operations Center",cnh:"CNH AFS Connect",agco:"AGCO FuseConnect",outro:"plataforma do fabricante"},s=h?(t.estado.crm&&t.estado.crm.telemetria||[]).filter(a=>a.chassi===h&&!a.suspeita).sort((a,e)=>e.data.localeCompare(a.data))[0]:null,C=[["Hor\xEDmetro conferido na entrada",d.horimetro],...s?[[`Hor\xEDmetro comprovado por telemetria: ${Math.round(s.horas).toLocaleString("pt-BR")} h em ${m(s.data)} (${f[s.fonte]||s.fonte})`,!0]]:[],["Chassi e n\xFAmero de s\xE9rie conferidos",d.chassi],["Notas ou ordens de servi\xE7o entregues",d.notas],["Registro no ID Agro (Renagro)",o.idAgro]],y=[0,1,2,3].map(a=>{const e=window.FOTOS.de(o,a);return`<div style="background-image:url('${e.propria?e.u:a?window.FOTOS.mini(e.u):e.u}')" role="img" aria-label="Foto da m\xE1quina"></div>`}).join(""),S=[{d:o.entrada,x:"Entrada no p\xE1tio da revenda"}].concat((o.precos||[]).map(a=>({d:a.data,x:`${a.motivo}: ${p(a.valor)}`}))).sort((a,e)=>a.d.localeCompare(e.d));$.innerHTML=`
    <section class="capa">
      <div class="ficha-topo">
        <span class="id">PASSAPORTE ANS-${n(o.id)} \xB7 ${v[o.tipo].toUpperCase()}</span>
        <h1>${n(o.marca+" "+o.modelo)}</h1>
        <div class="linha"><span>Ano ${o.ano}</span><span>${o.horas.toLocaleString("pt-BR")} horas</span><span>Inspe\xE7\xE3o ${o.cond}/100</span></div>
        ${o.anuncio?`<span class="preco">${p(o.anuncio)}</span>`:""}
        <div class="galeria">${y}</div>
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
        <div><span>Categoria</span><b>${v[o.tipo]}</b></div><div><span>Fabricante</span><b>${n(o.marca)}</b></div>
        <div><span>Modelo</span><b>${n(o.modelo)}</b></div><div><span>Ano</span><b>${o.ano}</b></div>
        <div><span>Horas</span><b>${o.horas.toLocaleString("pt-BR")}</b></div><div><span>Revenda</span><b>${n(c.revenda.nome)}</b></div></div></section>
      <section class="sec"><h2>Inspe\xE7\xE3o da revenda</h2>
        <div class="notas">${g.map(([a,e])=>`<div><span>${e}</span><div class="pontos" aria-label="${o.ficha[a]} de 5">${[1,2,3,4,5].map(A=>`<i class="${A<=o.ficha[a]?"on":""}"></i>`).join("")}</div></div>`).join("")}</div>
        <p class="aviso">Inspe\xE7\xE3o visual feita pela equipe da revenda na entrada da m\xE1quina.</p></section>
      <section class="sec"><h2>Documenta\xE7\xE3o</h2><ul class="lista">
        ${C.map(([a,e])=>`<li><span>${a}</span>${e?'<span class="tag comprovado">Comprovado</span>':'<span class="tag pendente">Pendente</span>'}</li>`).join("")}</ul></section>
      <section class="sec"><h2>Hist\xF3rico de movimenta\xE7\xF5es</h2><ul class="tempo">${S.map(a=>`<li>${n(a.x)}<span>${m(a.d)}</span></li>`).join("")}</ul></section>
      <section class="sec inteira"><h2>Hist\xF3rico de manuten\xE7\xE3o</h2>
        <div class="legenda"><span class="tag comprovado">Comprovado: tem nota ou ordem de servi\xE7o</span><span class="tag declarado">Declarado: informado pelo dono anterior</span></div>
        ${i.length?`<ul class="lista">${[...r,...b].map(a=>`<li><span>${n(a.servico)} <span style="color:var(--cinza);font-size:13px">\xB7 com ${Number(a.horas).toLocaleString("pt-BR")} h</span></span><span class="tag ${a.comNota?"comprovado":"declarado"}">${a.comNota?"Comprovado":"Declarado"}</span></li>`).join("")}</ul>`:'<p style="color:var(--cinza)">Nenhuma manuten\xE7\xE3o registrada ainda.</p>'}
        <p class="aviso">${r.length} de ${i.length} manuten\xE7\xF5es t\xEAm comprovante.</p></section>
    </div>
    <p class="aviso">Este passaporte organiza informa\xE7\xF5es da revenda. N\xE3o \xE9 laudo t\xE9cnico nem certifica\xE7\xE3o. Revenda e dados fict\xEDcios, s\xF3 para demonstra\xE7\xE3o. Fotos de demonstra\xE7\xE3o: Wikimedia Commons, licen\xE7as livres.</p>`;const l=location.href;try{const a=window.qrcode(0,"M");a.addData(l),a.make(),document.getElementById("qr").innerHTML=a.createSvgTag({cellSize:4,margin:0,scalable:!0})}catch{document.getElementById("qr").textContent="QR Code indispon\xEDvel sem internet."}document.getElementById("copiar").onclick=async a=>{try{await navigator.clipboard.writeText(l),a.currentTarget.textContent="Link copiado"}catch{prompt("Copie o link:",l)}}})();

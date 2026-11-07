/* VYROXX IT - report document (PDF) generator. Shared by report.html, index.html and account.html.
   window.vxRpPdf(d, lang, mode): mode = "reporter" (copy for the person who reported),
   "staff" (full file for the administration) or "status" (public tracking data only). */
(function(){
var LIB=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
var D={
en:{tr:"Report confirmation",ts:"Report file · staff copy",tt:"Report status summary",tag:"Your Technology, Our Responsibility",conf:"CONFIDENTIAL · FOR AUTHORIZED STAFF ONLY",ref:"Reference number",dt:"Date reported",
 st:{new:"RECEIVED",reviewing:"UNDER REVIEW",info:"INFORMATION NEEDED",referred:"REFERRED",closed:"CLOSED"},
 det:"Report details",type:"Type",plat:"Platform",seen:"Date seen",role:"Connection to the content",urg:"Urgent",yes:"Yes — immediate danger reported",links:"Link(s)",acct:"Account or page",desc:"Description",
 by:"Reporter",name:"Full name",email:"Email",phone:"Phone / WhatsApp",ctry:"Country / city",anon:"Identity",anonv:"Asked not to be disclosed to the reported party",lng:"Language",
 prog:"Progress",p1:"Report received",p2:"Under review",p3:"Referred through official channels",p4:"Closed on our side",
 hnd:"Handling",hby:"Last handled by",hat:"Last handled on",note:"Internal note",upd:"Last update",
 nxt:"What happens next",n1:"We review your report and the links provided, seriously and confidentially. Urgent reports are reviewed first.",n2:"We may contact you if we need more details.",n3:"If the report is serious and within the authorities’ remit, we refer it through official channels. We receive no information on the progress of any official procedure.",
 vf:"You can follow this report at any time at vyroxxit.github.io, in the “Track your request or report” box, using the reference number above.",
 disc:"VYROXX IT is a private company and not a government or security body. This document confirms that the report was received by us; it is not an official complaint and does not replace reporting to the authorities. In immediate danger call the Police (19) or the Royal Gendarmerie (177), or report on the official platform e-blagh.ma.",
 pubn:"This is the public status summary: it contains no personal data or report content. The full copy with everything you entered is available only right after you submit the report, to protect your privacy; we cannot regenerate it later.",gn:"Generated on",gen:"General type"},
ar:{tr:"تأكيد استلام بلاغ",ts:"ملف البلاغ · نسخة الإدارة",tt:"ملخص حالة البلاغ",tag:"تقنيتك، مسؤوليتنا",conf:"سري · للموظفين المخوَّلين فقط",ref:"الرقم المرجعي",dt:"تاريخ البلاغ",
 st:{new:"تم الاستلام",reviewing:"قيد المراجعة",info:"نحتاج معلومات إضافية",referred:"أُحيل",closed:"مغلق"},
 det:"تفاصيل البلاغ",type:"النوع",plat:"المنصة",seen:"تاريخ المشاهدة",role:"الصلة بالمحتوى",urg:"عاجل",yes:"نعم — أُبلغ عن خطر داهم",links:"الروابط",acct:"الحساب أو الصفحة",desc:"الوصف",
 by:"المبلِّغ",name:"الاسم الكامل",email:"البريد الإلكتروني",phone:"الهاتف / واتساب",ctry:"البلد / المدينة",anon:"الهوية",anonv:"طلب عدم الكشف عنها للطرف المُبلَّغ عنه",lng:"اللغة",
 prog:"مراحل البلاغ",p1:"استلام البلاغ",p2:"المراجعة",p3:"الإحالة عبر القنوات الرسمية",p4:"الإغلاق من جهتنا",
 hnd:"المعالجة",hby:"آخر معالجة بواسطة",hat:"تاريخ آخر معالجة",note:"ملاحظة داخلية",upd:"آخر تحديث",
 nxt:"ماذا يحدث بعد ذلك",n1:"نراجع بلاغك والروابط المرفقة بجدية وسرية. والبلاغات العاجلة تُراجَع أولًا.",n2:"قد نتواصل معك إن احتجنا إلى تفاصيل إضافية.",n3:"إذا كان البلاغ جدّيًا ويدخل في اختصاص السلطات، نحيله عبر القنوات الرسمية. ولا تتوفر لدينا معلومات عن سير أي إجراء رسمي.",
 vf:"يمكنك متابعة هذا البلاغ في أي وقت عبر vyroxxit.github.io من خانة «تتبّع طلبك أو بلاغك» باستخدام الرقم المرجعي أعلاه.",
 disc:"VYROXX IT شركة خاصة وليست جهة حكومية أو أمنية. تؤكد هذه الوثيقة أن البلاغ وصلنا؛ وهي ليست شكاية رسمية ولا تغني عن التبليغ لدى السلطات. وعند الخطر الداهم اتصل بالشرطة (19) أو الدرك الملكي (177)، أو أبلغ عبر المنصة الرسمية e-blagh.ma.",
 pubn:"هذا ملخص عام لحالة البلاغ، ولا يتضمن بيانات شخصية ولا محتوى البلاغ. أما النسخة الكاملة بكل ما أدخلته فتُتاح مباشرة بعد إرسال البلاغ فقط حمايةً لخصوصيتك، ولا نستطيع إعادة إنشائها لاحقًا.",gn:"أُنشئت في",gen:"النوع العام"},
fr:{tr:"Confirmation de signalement",ts:"Dossier de signalement · copie interne",tt:"Résumé du statut du signalement",tag:"Votre technologie, notre responsabilité",conf:"CONFIDENTIEL · RÉSERVÉ AU PERSONNEL AUTORISÉ",ref:"Numéro de référence",dt:"Date du signalement",
 st:{new:"REÇU",reviewing:"EN EXAMEN",info:"INFORMATIONS REQUISES",referred:"TRANSMIS",closed:"CLÔTURÉ"},
 det:"Détails du signalement",type:"Type",plat:"Plateforme",seen:"Date de constatation",role:"Lien avec le contenu",urg:"Urgent",yes:"Oui — danger immédiat signalé",links:"Lien(s)",acct:"Compte ou page",desc:"Description",
 by:"Auteur du signalement",name:"Nom complet",email:"E-mail",phone:"Téléphone / WhatsApp",ctry:"Pays / ville",anon:"Identité",anonv:"A demandé à ne pas être révélée à la partie signalée",lng:"Langue",
 prog:"Avancement",p1:"Signalement reçu",p2:"En examen",p3:"Transmis par les canaux officiels",p4:"Clôturé de notre côté",
 hnd:"Traitement",hby:"Dernier traitement par",hat:"Dernier traitement le",note:"Note interne",upd:"Dernière mise à jour",
 nxt:"Et ensuite ?",n1:"Nous examinons votre signalement et les liens fournis avec sérieux et confidentialité. Les signalements urgents sont examinés en priorité.",n2:"Nous pouvons vous contacter si nous avons besoin de précisions.",n3:"Si le signalement est grave et relève des autorités, nous le transmettons par les canaux officiels. Nous ne recevons aucune information sur le déroulement d’une procédure officielle.",
 vf:"Vous pouvez suivre ce signalement à tout moment sur vyroxxit.github.io, dans la zone « Suivre votre demande ou signalement », avec le numéro de référence ci-dessus.",
 disc:"VYROXX IT est une entreprise privée, et non un organisme public ou de sécurité. Ce document confirme que nous avons reçu le signalement ; ce n’est pas une plainte officielle et il ne remplace pas un signalement aux autorités. En cas de danger immédiat, appelez la Police (19) ou la Gendarmerie royale (177), ou signalez sur la plateforme officielle e-blagh.ma.",
 pubn:"Ceci est le résumé public du statut : il ne contient ni données personnelles ni contenu du signalement. La copie complète avec tout ce que vous avez saisi n’est disponible que juste après l’envoi, pour protéger votre vie privée ; nous ne pouvons pas la régénérer plus tard.",gn:"Généré le",gen:"Type général"},
es:{tr:"Confirmación de denuncia",ts:"Expediente de denuncia · copia interna",tt:"Resumen del estado de la denuncia",tag:"Tu tecnología, nuestra responsabilidad",conf:"CONFIDENCIAL · SOLO PERSONAL AUTORIZADO",ref:"Número de referencia",dt:"Fecha de la denuncia",
 st:{new:"RECIBIDA",reviewing:"EN REVISIÓN",info:"SE NECESITA INFORMACIÓN",referred:"REMITIDA",closed:"CERRADA"},
 det:"Detalles de la denuncia",type:"Tipo",plat:"Plataforma",seen:"Fecha en que lo viste",role:"Relación con el contenido",urg:"Urgente",yes:"Sí — se indicó peligro inmediato",links:"Enlace(s)",acct:"Cuenta o página",desc:"Descripción",
 by:"Denunciante",name:"Nombre completo",email:"Correo electrónico",phone:"Teléfono / WhatsApp",ctry:"País / ciudad",anon:"Identidad",anonv:"Pidió no ser revelada a la parte denunciada",lng:"Idioma",
 prog:"Progreso",p1:"Denuncia recibida",p2:"En revisión",p3:"Remitida por los cauces oficiales",p4:"Cerrada por nuestra parte",
 hnd:"Gestión",hby:"Última gestión de",hat:"Última gestión el",note:"Nota interna",upd:"Última actualización",
 nxt:"Qué ocurre después",n1:"Revisamos tu denuncia y los enlaces aportados con seriedad y confidencialidad. Las denuncias urgentes se revisan primero.",n2:"Podemos contactarte si necesitamos más detalles.",n3:"Si la denuncia es grave y compete a las autoridades, la remitimos por los cauces oficiales. No recibimos información sobre el avance de ningún procedimiento oficial.",
 vf:"Puedes seguir esta denuncia en cualquier momento en vyroxxit.github.io, en el cuadro «Sigue tu solicitud o denuncia», con el número de referencia de arriba.",
 disc:"VYROXX IT es una empresa privada y no un organismo público ni de seguridad. Este documento confirma que recibimos la denuncia; no es una denuncia oficial ni sustituye la denuncia ante las autoridades. Ante un peligro inmediato llama a la Policía (19) o a la Gendarmería Real (177), o denuncia en la plataforma oficial e-blagh.ma.",
 pubn:"Este es el resumen público del estado: no contiene datos personales ni el contenido de la denuncia. La copia completa con todo lo que introdujiste solo está disponible justo después de enviar la denuncia, para proteger tu privacidad; no podemos regenerarla después.",gn:"Generado el",gen:"Tipo general"}
};
var LOC={ar:"ar-MA",en:"en-GB",fr:"fr-FR",es:"es-ES"};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function load(u){return new Promise(function(ok,no){var s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=function(){no(new Error("load"))};document.head.appendChild(s)})}
var libs=null;
function ensure(){if(window.html2canvas&&window.jspdf)return Promise.resolve();if(!libs)libs=Promise.all(LIB.map(load)).catch(function(e){libs=null;throw e});return libs}
var LOGO='<svg width="46" height="60" viewBox="135 96 130 204" xmlns="http://www.w3.org/2000/svg"><path d="M200 135 L255 155 V215 C255 250 230 275 200 292 C170 275 145 250 145 215 V155 Z" fill="#fff" stroke="#12263A" stroke-width="6" stroke-linejoin="round"/><path d="M172 182 L200 240 L228 182" fill="none" stroke="#0F8B8D" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="200" cy="166" r="6" fill="#D9482B"/><path d="M168 128 L178 104 L200 120 L222 104 L232 128 Z" fill="#0F8B8D" stroke="#12263A" stroke-width="4" stroke-linejoin="round"/></svg>';
function p2(n){return n<10?"0"+n:""+n}
function sp(x){return '<span style="display:inline-block;direction:ltr;unicode-bidi:isolate">'+x+'</span>'}
function fmt(ms,t){if(!ms)return"";var x=new Date(ms),r=sp(p2(x.getDate())+"/"+p2(x.getMonth()+1)+"/"+x.getFullYear());return t?r+" "+sp(p2(x.getHours())+":"+p2(x.getMinutes())):r}
function fmtIso(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?sp(m[3]+"/"+m[2]+"/"+m[1]):esc(s||"")}
function build(d,l,mode){
  var t=D[l]||D.en,rtl=l==="ar",st=d.status||"new",col=st==="closed"?"#1E9E6A":(st==="info"?"#D98A00":(st==="referred"?"#2B6CB0":"#0F8B8D")),pub=mode==="status",staff=mode==="staff";
  function row(k,v,ltr,pre){return v?'<tr><td style="width:32%;padding:8px 0;color:#52667A;font-size:14px;vertical-align:top">'+esc(k)+'</td><td style="padding:8px 0;font-weight:500;font-size:15px;'+(ltr?'direction:ltr;unicode-bidi:isolate;text-align:'+(rtl?'right':'left')+';':'')+(pre?'white-space:pre-wrap;':'')+'word-break:break-word">'+v+'</td></tr>':''}
  function box(title,inner){return '<div data-pb="1" style="margin-top:20px;border:1px solid #D3DDDD;border-radius:12px;padding:8px 22px 10px"><div style="font-size:16px;font-weight:700;padding:8px 0 2px">'+esc(title)+'</div>'+inner+'</div>'}
  function step(n,lab,on,date){return '<div data-row="1" style="display:flex;align-items:center;gap:12px;padding:8px 0"><div style="flex:none;width:26px;height:26px;border-radius:50%;'+(on?'background:#0F8B8D;color:#fff':'border:2px solid #C5D2D2;color:#9FB0B0')+';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">'+(on?'✓':n)+'</div><div style="flex:1;font-size:15px;font-weight:'+(on?'700':'400')+';color:'+(on?'#12263A':'#7A8B8B')+'">'+esc(lab)+'</div><div style="font-size:13px;color:#52667A;direction:ltr;unicode-bidi:isolate">'+(date||"")+'</div></div>'}
  var links=String(d.links||"").split("\n").filter(Boolean).map(function(u){return '<div dir="ltr" style="direction:ltr;unicode-bidi:isolate;text-align:'+(rtl?'right':'left')+'">'+esc(u)+'</div>'}).join("");
  var h='<div style="width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:#12263A;font-family:\'IBM Plex Sans Arabic\',\'Segoe UI\',Tahoma,Arial,sans-serif;direction:'+(rtl?'rtl':'ltr')+';display:flex;flex-direction:column">'
  +'<div style="background:linear-gradient(135deg,#DDEFEE,#FFFFFF);padding:34px 44px 24px;border-bottom:5px solid #0F8B8D;display:flex;align-items:center;gap:18px">'+LOGO
  +'<div style="flex:1"><div style="font-size:28px;font-weight:700;'+(rtl?'':'letter-spacing:3px;')+'">VYROXX <span style="color:#0F8B8D;font-size:16px;font-weight:500;'+(rtl?'':'letter-spacing:4px;')+'">IT SERVICES</span></div><div style="font-size:13px;color:#52667A;margin-top:4px">'+esc(t.tag)+'</div></div>'
  +'<div style="text-align:'+(rtl?'left':'right')+'"><div style="font-size:13px;color:#52667A">'+esc(staff?t.ts:(pub?t.tt:t.tr))+'</div></div></div>'
  +(staff?'<div style="background:#FDECEA;color:#9B2C1C;font-size:13px;font-weight:700;'+(rtl?'letter-spacing:0;':'letter-spacing:.5px;')+'padding:9px 44px;text-align:center;direction:'+(rtl?'rtl':'ltr')+';unicode-bidi:isolate">'+esc(t.conf)+'</div>':'')
  +'<div style="padding:26px 44px 0;flex:1">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div style="font-size:13px;color:#52667A">'+esc(t.ref)+'</div><div style="font-size:34px;font-weight:700;direction:ltr;unicode-bidi:isolate;text-align:'+(rtl?'right':'left')+'">'+esc(d.code)+'</div></div>'
  +'<div style="text-align:'+(rtl?'left':'right')+'"><div style="display:inline-block;padding:9px 18px;border-radius:999px;background:'+col+';color:#fff;font-size:14px;font-weight:700">'+esc(t.st[st]||st)+'</div>'+(d.urgent&&!pub?'<div style="margin-top:6px;color:#B4341F;font-weight:700;font-size:13px">'+esc(t.urg)+'</div>':'')+'</div></div>';
  if(pub){
    h+=box(t.det,'<table style="width:100%;border-collapse:collapse">'+row(t.gen,esc(d.catL||""))+row(t.dt,fmt(d.createdAt,true))+row(t.upd,fmt(d.updated,true))+'</table><div style="padding:2px 0 8px;font-size:13px;color:#7A8B8B">'+esc(t.pubn)+'</div>');
  }else{
    h+=box(t.det,'<table style="width:100%;border-collapse:collapse">'+row(t.dt,fmt(d.createdAt,true))+row(t.type,esc(d.catL||""))+row(t.plat,esc(d.platL||""))+row(t.seen,d.seenAt?fmtIso(d.seenAt):"")+row(t.role,esc(d.roleL||""))+row(t.urg,d.urgent?esc(t.yes):"")+row(t.links,links)+row(t.acct,esc(d.account||""),false)+row(t.desc,esc(d.description||""),false,true)+'</table>');
    h+=box(t.by,'<table style="width:100%;border-collapse:collapse">'+row(t.name,esc(d.name||""))+row(t.email,esc(d.email||""),true)+row(t.phone,esc(d.phone||""),true)+row(t.ctry,esc(d.country||""))+row(t.anon,d.anonymous?esc(t.anonv):"")+row(t.lng,esc(String(d.lang||"").toUpperCase()))+'</table>');
  }
  var on2=st!=="new",on3=st==="referred"||(st==="closed"&&!!d.referredAt),on4=st==="closed";
  h+=box(t.prog,step(1,t.p1,true,fmt(d.createdAt,true))+step(2,t.p2,on2,on2?fmt(d.reviewingAt,true):"")+step(3,t.p3,on3,on3?fmt(d.referredAt,true):"")+step(4,t.p4,on4,on4?fmt(d.closedAt,true):""));
  if(staff&&(d.handledBy||d.note)){
    h+=box(t.hnd,'<table style="width:100%;border-collapse:collapse">'+row(t.hby,esc(d.handledBy||""),true)+row(t.hat,fmt(d.handledAt,true))+row(t.note,esc(d.note||""),false,true)+'</table>');
  }
  if(mode==="reporter"){
    h+=box(t.nxt,'<div style="font-size:14.5px;line-height:1.85;padding:6px 0 4px"><div>• '+esc(t.n1)+'</div><div>• '+esc(t.n2)+'</div><div>• '+esc(t.n3)+'</div></div>');
  }
  h+='</div><div data-pb="1" style="padding:20px 44px 28px;margin-top:24px;border-top:1px solid #D3DDDD;background:#F4F8F8;font-size:12.5px;line-height:1.7;color:#52667A"><div>'+esc(t.vf)+'</div><div style="margin-top:4px">'+esc(t.disc)+'</div><div style="margin-top:6px;direction:ltr;unicode-bidi:isolate;text-align:'+(rtl?'right':'left')+'">vyroxxit.github.io · vyroxxvx@gmail.com · '+esc(t.gn)+' '+fmt(Date.now(),true)+'</div></div></div>';
  return h;
}
/* Page planning: never cut through a block; a block that fits on one page moves whole to the next page. */
function planPages(total,blocks,rows,ph,pad,gap){
  var pages=[],y=0,first=true;
  while(y<total-1){
    var cap=first?ph:ph-pad,end=Math.min(y+cap,total);
    if(end<total){
      var cut=null,i;
      for(i=0;i<blocks.length;i++){var bl=blocks[i];if(bl[0]>y+gap&&bl[0]<end&&bl[1]>end&&(bl[1]-bl[0])<=ph-pad){cut=bl[0];break}}
      if(cut===null){
        for(i=0;i<blocks.length;i++){var bt=blocks[i];if(bt[0]<end&&bt[1]>end){
          var best=null;rows.forEach(function(r){if(r>y+gap&&r<=end&&(best===null||r>best))best=r});
          if(best!==null)cut=best;break}}
      }
      if(cut!==null)end=cut;
    }
    pages.push([y,end,first?0:pad]);first=false;y=end;
  }
  return pages;
}
window.__rpPlan=planPages;
function toPdf(el,name){
  var sc=2,base=el.getBoundingClientRect().top;
  var blocks=[].slice.call(el.querySelectorAll("[data-pb]")).map(function(n){var r=n.getBoundingClientRect();return [(r.top-base)*sc,(r.bottom-base)*sc]});
  var rows=[].slice.call(el.querySelectorAll("tr,[data-row]")).map(function(n){return (n.getBoundingClientRect().top-base)*sc});
  return window.html2canvas(el,{scale:sc,backgroundColor:"#ffffff",useCORS:true,logging:false}).then(function(cv){
    var J=window.jspdf.jsPDF,pdf=new J({unit:"mm",format:"a4",orientation:"p"}),W=210,H=297,pw=cv.width,ph=Math.floor(pw*H/W),pad=40*sc;
    var pages=planPages(cv.height,blocks,rows,ph,pad,60*sc);
    pages.forEach(function(pg,i){
      var h=pg[1]-pg[0],c=document.createElement("canvas"),x;
      c.width=pw;c.height=h+pg[2];x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,pw,c.height);x.drawImage(cv,0,pg[0],pw,h,0,pg[2],pw,h);
      if(i)pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg",0.92),"JPEG",0,0,W,c.height*W/pw);
    });
    pdf.save(name);
  });
}
window.vxRpPdf=function(d,lang,mode){
  var l=D[lang]?lang:"en",m=mode==="staff"||mode==="status"?mode:"reporter";
  return ensure().then(function(){return document.fonts&&document.fonts.ready?document.fonts.ready:null}).then(function(){
    var w=document.createElement("div");
    w.style.cssText="position:fixed;left:-10000px;top:0;width:794px;z-index:-1";
    w.innerHTML=build(d,l,m);document.body.appendChild(w);
    var tag={reporter:"report",staff:"report-staff",status:"report-status"}[m];
    return toPdf(w.firstChild,"VYROXX-"+String(d.code||"report").replace(/[^A-Z0-9-]/gi,"")+"-"+tag+".pdf").then(function(){w.remove()},function(e){w.remove();throw e});
  });
};
})();

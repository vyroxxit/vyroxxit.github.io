/* VYROXX IT - request document (PDF) generator. Shared by index.html and account.html */
(function(){
var LIB=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
var LOC={ar:"ar-MA",en:"en-GB",fr:"fr-FR",es:"es-ES"};
var D={
en:{t:"Service request confirmation",tag:"Your Technology, Our Responsibility",num:"Request number",dt:"Date requested",sv:"Service",nm:"Name",ph:"Phone / WhatsApp",em:"Email",ds:"Problem description",pr:"Request progress",p1:"Request received",p2:"In progress",p3:"Resolved",p4:"Payment received",sA:"IN PROGRESS",sB:"RESOLVED · PAYMENT PENDING",sC:"PAID · IN PROGRESS",sD:"RESOLVED & PAID",py:"Payment details",me:"Method",am:"Amount",rf:"Reference",mb:"Bank transfer",mp:"PayPal",mc:"Cash",mo:"Other",pub:"Personal details are not included in this version.",vf:"You can check the status of this request at any time at vyroxxit.github.io using the request number above.",nt:"This document confirms the request and its status at the time it was generated. It is not a tax invoice.",gn:"Generated on"},
ar:{t:"تأكيد طلب خدمة",tag:"تقنيتك، مسؤوليتنا",num:"رقم الطلب",dt:"تاريخ الطلب",sv:"الخدمة",nm:"الاسم",ph:"الهاتف / واتساب",em:"البريد الإلكتروني",ds:"وصف المشكلة",pr:"مراحل الطلب",p1:"تم استلام الطلب",p2:"قيد المعالجة",p3:"تم الحل",p4:"تم استلام الدفع",sA:"قيد المعالجة",sB:"تم الحل · الدفع معلّق",sC:"تم الدفع · قيد المعالجة",sD:"تم الحل والدفع",py:"تفاصيل الدفع",me:"الطريقة",am:"المبلغ",rf:"المرجع",mb:"تحويل بنكي",mp:"PayPal",mc:"نقدًا",mo:"أخرى",pub:"لا تتضمن هذه النسخة البيانات الشخصية.",vf:"يمكنك تتبّع حالة هذا الطلب في أي وقت عبر vyroxxit.github.io باستخدام رقم الطلب أعلاه.",nt:"تؤكد هذه الوثيقة الطلب وحالته وقت إنشائها، وليست فاتورة ضريبية.",gn:"أُنشئت في"},
fr:{t:"Confirmation de demande de service",tag:"Votre technologie, notre responsabilité",num:"N° de demande",dt:"Date de la demande",sv:"Service",nm:"Nom",ph:"Téléphone / WhatsApp",em:"E-mail",ds:"Description du problème",pr:"Avancement de la demande",p1:"Demande reçue",p2:"En cours",p3:"Résolue",p4:"Paiement reçu",sA:"EN COURS",sB:"RÉSOLUE · PAIEMENT EN ATTENTE",sC:"PAYÉE · EN COURS",sD:"RÉSOLUE ET PAYÉE",py:"Détails du paiement",me:"Méthode",am:"Montant",rf:"Référence",mb:"Virement bancaire",mp:"PayPal",mc:"Espèces",mo:"Autre",pub:"Les données personnelles ne figurent pas dans cette version.",vf:"Vous pouvez suivre cette demande à tout moment sur vyroxxit.github.io avec le numéro ci-dessus.",nt:"Ce document confirme la demande et son état au moment de sa génération. Ce n’est pas une facture fiscale.",gn:"Généré le"},
es:{t:"Confirmación de solicitud de servicio",tag:"Tu tecnología, nuestra responsabilidad",num:"N.º de solicitud",dt:"Fecha de la solicitud",sv:"Servicio",nm:"Nombre",ph:"Teléfono / WhatsApp",em:"Correo electrónico",ds:"Descripción del problema",pr:"Progreso de la solicitud",p1:"Solicitud recibida",p2:"En curso",p3:"Resuelta",p4:"Pago recibido",sA:"EN CURSO",sB:"RESUELTA · PAGO PENDIENTE",sC:"PAGADA · EN CURSO",sD:"RESUELTA Y PAGADA",py:"Detalles del pago",me:"Método",am:"Importe",rf:"Referencia",mb:"Transferencia bancaria",mp:"PayPal",mc:"Efectivo",mo:"Otro",pub:"Esta versión no incluye datos personales.",vf:"Puedes consultar el estado de esta solicitud en vyroxxit.github.io con el número de arriba.",nt:"Este documento confirma la solicitud y su estado en el momento de generarlo. No es una factura fiscal.",gn:"Generado el"}
};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function load(u){return new Promise(function(ok,no){var s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=function(){no(new Error("load"))};document.head.appendChild(s)})}
var libs=null;
function ensure(){if(window.html2canvas&&window.jspdf)return Promise.resolve();if(!libs)libs=Promise.all(LIB.map(load)).catch(function(e){libs=null;throw e});return libs}
var LOGO='<svg width="46" height="60" viewBox="135 96 130 204" xmlns="http://www.w3.org/2000/svg"><path d="M200 135 L255 155 V215 C255 250 230 275 200 292 C170 275 145 250 145 215 V155 Z" fill="#fff" stroke="#12263A" stroke-width="6" stroke-linejoin="round"/><path d="M172 182 L200 240 L228 182" fill="none" stroke="#0F8B8D" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="200" cy="166" r="6" fill="#D9482B"/><path d="M168 128 L178 104 L200 120 L222 104 L232 128 Z" fill="#0F8B8D" stroke="#12263A" stroke-width="4" stroke-linejoin="round"/></svg>';
function fmt(ms,l,withTime){if(!ms)return"";var o=withTime?{dateStyle:"medium",timeStyle:"short"}:{dateStyle:"medium"};try{return new Date(ms).toLocaleString(LOC[l],o)}catch(e){return new Date(ms).toISOString()}}
function build(d,l){
  var t=D[l]||D.en,rtl=l==="ar",done=d.status==="done",paid=d.paid===true;
  var st=paid&&done?"D":(paid?"C":(done?"B":"A")),col=st==="D"?"#1E9E6A":(st==="A"?"#0F8B8D":"#D98A00");
  var money=(typeof d.payAmount==="number")?d.payAmount.toLocaleString(LOC[l])+" "+esc(d.payCur||"MAD"):"";
  var mname={bank:t.mb,paypal:t.mp,cash:t.mc,other:t.mo}[d.payMethod]||"";
  function row(k,v,ltr){return v?'<tr><td style="width:34%;padding:9px 0;color:#52667A;font-size:14px;vertical-align:top">'+esc(k)+'</td><td style="padding:9px 0;font-weight:500;font-size:15px;'+(ltr?'direction:ltr;unicode-bidi:embed;text-align:'+(rtl?'right':'left')+';':'')+'white-space:pre-wrap;word-break:break-word">'+v+'</td></tr>':''}
  function step(n,lab,on,date){return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0"><div style="flex:none;width:26px;height:26px;border-radius:50%;'+(on?'background:#0F8B8D;color:#fff':'border:2px solid #C5D2D2;color:#9FB0B0')+';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">'+(on?'✓':n)+'</div><div style="flex:1;font-size:15px;font-weight:'+(on?'700':'400')+';color:'+(on?'#12263A':'#7A8B8B')+'">'+esc(lab)+'</div><div style="font-size:13px;color:#52667A;direction:ltr;unicode-bidi:embed">'+esc(date||"")+'</div></div>'}
  var h='<div style="width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:#12263A;font-family:\'IBM Plex Sans Arabic\',\'Segoe UI\',Tahoma,Arial,sans-serif;direction:'+(rtl?'rtl':'ltr')+';display:flex;flex-direction:column">'
  +'<div style="background:linear-gradient(135deg,#DDEFEE,#FFFFFF);padding:34px 44px 26px;border-bottom:5px solid #0F8B8D;display:flex;align-items:center;gap:18px">'+LOGO
  +'<div style="flex:1"><div style="font-size:28px;font-weight:700;'+(rtl?'':'letter-spacing:3px;')+'">VYROXX <span style="color:#0F8B8D;font-size:16px;font-weight:500;'+(rtl?'':'letter-spacing:4px;')+'">IT SERVICES</span></div><div style="font-size:13px;color:#52667A;margin-top:4px">'+esc(t.tag)+'</div></div>'
  +'<div style="text-align:'+(rtl?'left':'right')+'"><div style="font-size:12px;color:#52667A">'+esc(t.t)+'</div></div></div>'
  +'<div style="padding:30px 44px 0;flex:1">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div style="font-size:13px;color:#52667A">'+esc(t.num)+'</div><div style="font-size:34px;font-weight:700;direction:ltr;unicode-bidi:embed;text-align:'+(rtl?'right':'left')+'">'+esc(d.code)+'</div></div>'
  +'<div style="padding:9px 18px;border-radius:999px;background:'+col+';color:#fff;font-size:14px;font-weight:700">'+esc(t["s"+st])+'</div></div>'
  +'<div style="margin-top:22px;border:1px solid #D3DDDD;border-radius:12px;padding:8px 22px"><table style="width:100%;border-collapse:collapse">'
  +row(t.dt,esc(fmt(d.createdAt,l,true)),true)+row(t.sv,esc(d.service))
  +(d.full?row(t.nm,esc(d.name))+row(t.ph,esc(d.phone),true)+row(t.em,esc(d.email),true)+row(t.ds,esc(d.message)):'')
  +'</table>'+(d.full?'':'<div style="padding:6px 0 12px;font-size:13px;color:#7A8B8B">'+esc(t.pub)+'</div>')+'</div>'
  +'<div style="margin-top:22px;border:1px solid #D3DDDD;border-radius:12px;padding:14px 22px"><div style="font-size:16px;font-weight:700;margin-bottom:4px">'+esc(t.pr)+'</div>'
  +step(1,t.p1,true,fmt(d.createdAt,l,true))+step(2,t.p2,true,"")+step(3,t.p3,done,done?fmt(d.doneAt,l,true):"")+step(4,t.p4,paid,paid?fmt(d.paidAt,l,true):"")+'</div>'
  +(paid&&(mname||money||d.payRef)?'<div style="margin-top:22px;border:1px solid #D3DDDD;border-radius:12px;padding:8px 22px"><div style="font-size:16px;font-weight:700;padding-top:8px">'+esc(t.py)+'</div><table style="width:100%;border-collapse:collapse">'+row(t.me,esc(mname))+row(t.am,money,true)+row(t.rf,esc(d.payRef||""))+'</table></div>':'')
  +'</div>'
  +'<div style="padding:22px 44px 30px;margin-top:26px;border-top:1px solid #D3DDDD;background:#F4F8F8;font-size:12.5px;line-height:1.7;color:#52667A"><div>'+esc(t.vf)+'</div><div>'+esc(t.nt)+'</div><div style="margin-top:6px;direction:ltr;unicode-bidi:embed;text-align:'+(rtl?'right':'left')+'">vyroxxit.github.io · vyroxxvx@gmail.com · '+esc(t.gn)+' '+esc(fmt(Date.now(),l,true))+'</div></div></div>';
  return {html:h,state:{A:"in-progress",B:"resolved",C:"paid",D:"completed"}[st]};
}
function toPdf(el,name){
  return window.html2canvas(el,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false}).then(function(cv){
    var J=window.jspdf.jsPDF,pdf=new J({unit:"mm",format:"a4",orientation:"p"}),W=210,H=297,pw=cv.width,ph=Math.floor(pw*H/W),y=0,first=true;
    while(y<cv.height){
      var h=Math.min(ph,cv.height-y),c=document.createElement("canvas"),x;
      c.width=pw;c.height=h;x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,pw,h);x.drawImage(cv,0,y,pw,h,0,0,pw,h);
      if(!first)pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg",0.92),"JPEG",0,0,W,h*W/pw);
      first=false;y+=h;
    }
    pdf.save(name);
  });
}
window.vxPdf=function(d,lang){
  var l=D[lang]?lang:"en";
  return ensure().then(function(){return document.fonts&&document.fonts.ready?document.fonts.ready:null}).then(function(){
    var b=build(d,l),w=document.createElement("div");
    w.style.cssText="position:fixed;left:-10000px;top:0;width:794px;z-index:-1";
    w.innerHTML=b.html;document.body.appendChild(w);
    return toPdf(w.firstChild,"VYROXX-"+String(d.code||"request").replace(/[^A-Z0-9-]/gi,"")+"-"+b.state+".pdf").then(function(){w.remove()},function(e){w.remove();throw e});
  });
};
})();

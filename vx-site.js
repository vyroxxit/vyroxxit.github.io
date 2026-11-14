/* VYROXX IT - site switchboard (public pages).
   Reads ONE public doc (config/site) and applies: full stop screen, per-section pauses, announcement bar.
   Fails OPEN: if the doc can't be read the site stays up. Server rules enforce the same switches. */
(function(){
"use strict";
var MODE=window.VXSITE_MODE||"";                 /* "off" = control page: only preview helpers */
var P=location.pathname;
var IS_REPORT=/report(\.html)?$/.test(P);
var KEY="AIzaSyDcRn9c0mtFmGt_fKZh5KKEM6_kbZq6_e0";
var URL="https://firestore.googleapis.com/v1/projects/vyroxx-it/databases/(default)/documents/config/site?key="+KEY;
var T={
ar:{t:"الموقع متوقف مؤقتًا",d:"نجري أعمال صيانة وتحسين. سنعود قريبًا.",u:"العودة المتوقعة",c:"إذا كانت حالتك عاجلة راسلنا على",r:"الإبلاغ عن محتوى خطير",
    rt:"استقبال البلاغات متوقف مؤقتًا",rd:"لا نستقبل بلاغات جديدة الآن. في حالة خطر وشيك اتصل بالشرطة (19) أو الدرك الملكي (177)، أو أبلغ عبر e-blagh.ma.",
    pr:"طلبات الخدمة متوقفة مؤقتًا. تواصل معنا عبر واتساب أو البريد الإلكتروني.",pv:"كتابة الآراء متوقفة مؤقتًا. عُد لاحقًا.",x:"إغلاق",pvw:"معاينة: هكذا يرى الزائر الشاشة",pvx:"إغلاق المعاينة",
    ow:"وضع المدير: ",ow1:"الموقع متوقف عن الزوار",ow2:"أجزاء متوقفة عن الزوار",o_r:"الطلبات",o_p:"البلاغات",o_v:"الآراء"},
en:{t:"Temporarily offline",d:"We’re carrying out maintenance and improvements. We’ll be back soon.",u:"Expected back",c:"If it’s urgent, email us at",r:"Report serious content",
    rt:"Reports are temporarily paused",rd:"We are not accepting new reports right now. In immediate danger call the Police (19) or Royal Gendarmerie (177), or report via e-blagh.ma.",
    pr:"Service requests are temporarily paused. Contact us via WhatsApp or email.",pv:"Writing reviews is temporarily paused. Please come back later.",x:"Close",pvw:"Preview: this is what visitors see",pvx:"Close preview",
    ow:"Owner mode: ",ow1:"site is offline for visitors",ow2:"some sections are paused for visitors",o_r:"Requests",o_p:"Reports",o_v:"Reviews"},
fr:{t:"Site temporairement hors ligne",d:"Nous effectuons des travaux de maintenance et d’amélioration. Nous revenons bientôt.",u:"Retour prévu",c:"En cas d’urgence, écrivez-nous à",r:"Signaler un contenu grave",
    rt:"Les signalements sont temporairement suspendus",rd:"Nous n’acceptons pas de nouveaux signalements pour le moment. En cas de danger immédiat, appelez la Police (19) ou la Gendarmerie royale (177), ou signalez via e-blagh.ma.",
    pr:"Les demandes de service sont temporairement suspendues. Contactez-nous par WhatsApp ou e-mail.",pv:"La rédaction d’avis est temporairement suspendue. Revenez plus tard.",x:"Fermer",pvw:"Aperçu : ce que voient les visiteurs",pvx:"Fermer l’aperçu",
    ow:"Mode administrateur : ",ow1:"le site est hors ligne pour les visiteurs",ow2:"certaines sections sont suspendues pour les visiteurs",o_r:"Demandes",o_p:"Signalements",o_v:"Avis"},
es:{t:"Sitio temporalmente fuera de línea",d:"Estamos realizando tareas de mantenimiento y mejora. Volveremos pronto.",u:"Regreso previsto",c:"Si es urgente, escríbenos a",r:"Denunciar contenido grave",
    rt:"Las denuncias están temporalmente suspendidas",rd:"No aceptamos nuevas denuncias por ahora. En peligro inmediato llama a la Policía (19) o a la Gendarmería Real (177), o denuncia en e-blagh.ma.",
    pr:"Las solicitudes de servicio están temporalmente suspendidas. Contáctanos por WhatsApp o correo.",pv:"Escribir opiniones está temporalmente suspendido. Vuelve más tarde.",x:"Cerrar",pvw:"Vista previa: lo que ve el visitante",pvx:"Cerrar vista previa",
    ow:"Modo administrador: ",ow1:"el sitio está fuera de línea para los visitantes",ow2:"algunas secciones están suspendidas para los visitantes",o_r:"Solicitudes",o_p:"Denuncias",o_v:"Opiniones"}
};
var cfg=null,lastSig="";

function lang(){var l=null;try{l=localStorage.getItem("vx-lang")}catch(e){}if(!T[l]){l=String(navigator.language||"en").slice(0,2).toLowerCase();if(!T[l])l="en"}return l}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function isOwner(){try{return localStorage.getItem("vx-owner")==="1"}catch(e){return false}}
function parse(j){
  var c={enabled:true},f=(j&&j.fields)||{};
  for(var k in f){var v=f[k];c[k]="booleanValue"in v?v.booleanValue:("stringValue"in v?v.stringValue:("timestampValue"in v?Date.parse(v.timestampValue):null))}
  /* effective state, same logic as the database rules */
  var n=Date.now(),p=c.pauseAt,r=c.resumeAt,after=r!=null&&n>=r;
  c.enabled=c.enabled===false?after:!(p!=null&&n>=p&&!after);
  return c;
}
function stopAll(c){return c.enabled===false}
function reportsClosed(c){return c.pauseReports===true||(stopAll(c)&&c.keepReports!==true)}
function msgOf(c,l){return c["msg"+cap(l)]||""}
function bannerOf(c,l){return c.bannerOn===true?(c["banner"+cap(l)]||""):""}
function ready(fn){if(document.body)fn();else document.addEventListener("DOMContentLoaded",fn)}
function css(id,text){if(document.getElementById(id))return;var s=document.createElement("style");s.id=id;s.textContent=text;document.head.appendChild(s)}

/* ---------- full-screen stop / pause screen ---------- */
var LOC={ar:"ar-MA",en:"en-GB",fr:"fr-FR",es:"es-ES"};
function untilText(u,l){
  if(!u)return "";
  if(/^\d{4}-\d{2}-\d{2}T/.test(u)){
    var d=new Date(u);if(isNaN(d)||d.getTime()<=Date.now())return "";
    try{return d.toLocaleString(LOC[l]||"en-GB",{dateStyle:"full",timeStyle:"short"})}catch(e){return d.toLocaleString()}
  }
  return u;
}
function setInert(on,except){
  var kids=document.body.children;
  for(var i=0;i<kids.length;i++){var k=kids[i];if(k===except||k.id==="vx-banner")continue;if(on)k.setAttribute("inert","");else k.removeAttribute("inert")}
}
function removeScreen(){
  var el=document.getElementById("vx-screen");
  if(el){el.remove();setInert(false);document.documentElement.style.overflow=""}
}
function screen(opts){
  var l=opts.lang,t=T[l],rtl=l==="ar";
  ready(function(){
    removeScreen();
    var el=document.createElement("div");el.id="vx-screen";el.setAttribute("role","alertdialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-labelledby","vx-st");el.tabIndex=-1;
    el.style.cssText="position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(900px 480px at 85% -10%,rgba(60,196,196,.16),transparent 62%),#0C1519;color:#E6EFEF;font-family:'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif;overflow:auto;text-align:center;direction:"+(rtl?"rtl":"ltr");
    var link=opts.reports?'<p style="margin:22px 0 0"><a href="/report.html" style="display:inline-block;padding:11px 22px;border-radius:12px;border:1.5px solid #3CC4C4;color:#3CC4C4;text-decoration:none;font-weight:700">'+esc(t.r)+'</a></p>':'';
    el.innerHTML='<div style="max-width:540px">'
     +'<svg width="64" height="82" viewBox="135 96 130 204" aria-hidden="true"><path d="M200 135 L255 155 V215 C255 250 230 275 200 292 C170 275 145 250 145 215 V155 Z" fill="#142228" stroke="#E6EFEF" stroke-width="8" stroke-linejoin="round"/><path d="M172 182 L200 240 L228 182" fill="none" stroke="#3CC4C4" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="200" cy="166" r="7" fill="#FF7A59"/><path d="M168 128 L178 104 L200 120 L222 104 L232 128 Z" fill="#3CC4C4" stroke="#E6EFEF" stroke-width="5" stroke-linejoin="round"/></svg>'
     +'<div style="font-weight:700;letter-spacing:.14em;margin-top:10px;direction:ltr">VYROXX <span style="color:#3CC4C4">IT</span></div>'
     +'<h1 id="vx-st" style="font-size:clamp(26px,6vw,38px);margin:22px 0 10px;line-height:1.3">'+esc(opts.title)+'</h1>'
     +'<p style="color:#9BB1B5;margin:0 0 14px;line-height:1.9;font-size:17px;white-space:pre-wrap">'+esc(opts.text)+'</p>'
     +(untilText(opts.until,l)?'<p style="margin:0 0 14px"><span style="color:#9BB1B5">'+esc(t.u)+':</span> <b>'+esc(untilText(opts.until,l))+'</b></p>':'')
     +(opts.contact?'<p style="color:#9BB1B5;font-size:15px;margin:18px 0 0">'+esc(t.c)+' <a href="mailto:vyroxxvx@gmail.com" style="color:#3CC4C4;direction:ltr;unicode-bidi:isolate;display:inline-block">vyroxxvx@gmail.com</a></p>':'')
     +link
     +(opts.preview?'<p style="margin:26px 0 0"><button type="button" id="vx-pvx" style="font:inherit;font-weight:700;cursor:pointer;padding:10px 22px;border-radius:12px;border:0;background:#3CC4C4;color:#0C1519">'+esc(t.pvx)+'</button></p><p style="color:#9BB1B5;font-size:13px;margin:8px 0 0">'+esc(t.pvw)+'</p>':'')
     +'</div>';
    document.body.appendChild(el);setInert(true,el);document.documentElement.style.overflow="hidden";
    var x=document.getElementById("vx-pvx");if(x)x.onclick=function(){removeScreen()};
    el.focus();
    if(opts.preview)el.addEventListener("keydown",function(e){if(e.key==="Escape")removeScreen()});
  });
}

/* ---------- announcement bar ---------- */
function removeBanner(id){var b=document.getElementById(id||"vx-banner");if(b)b.remove()}
function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h)}
function banner(text,l,opts){
  opts=opts||{};var id=opts.id||"vx-banner";
  if(!opts.preview){try{if(sessionStorage.getItem("vx-bn")===hash(text))return}catch(e){}}
  ready(function(){
    removeBanner(id);
    var b=document.createElement("div");b.id=id;b.setAttribute("role","region");b.setAttribute("aria-label","VYROXX IT");
    b.style.cssText="position:relative;z-index:2147483000;background:#0F8B8D;color:#fff;text-align:center;padding:9px 46px;font:500 15px/1.6 'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif;direction:"+(l==="ar"?"rtl":"ltr");
    b.innerHTML='<span></span><button type="button" aria-label="'+esc(T[l].x)+'" style="position:absolute;inset-block:0;inset-inline-end:8px;border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer;padding:0 10px">×</button>';
    b.firstChild.textContent=text;
    b.lastChild.onclick=function(){b.remove();if(!opts.preview){try{sessionStorage.setItem("vx-bn",hash(text))}catch(e){}}};
    document.body.insertBefore(b,document.body.firstChild);
    if(opts.preview)setTimeout(function(){b.remove()},9000);
  });
}

/* ---------- owner bar ---------- */
function ownerBar(c,l){
  var t=T[l],parts=[];
  if(c.pauseRequests===true)parts.push(t.o_r);if(c.pauseReports===true)parts.push(t.o_p);if(c.pauseReviews===true)parts.push(t.o_v);
  var el=document.getElementById("vx-owner");
  if(!stopAll(c)&&!parts.length){if(el)el.remove();return}
  var txt=t.ow+(stopAll(c)?t.ow1:t.ow2+" ("+parts.join(", ")+")");
  ready(function(){
    if(!el){el=document.createElement("div");el.id="vx-owner";el.setAttribute("role","status");
      el.style.cssText="position:sticky;top:0;z-index:2147483001;background:#D9482B;color:#fff;text-align:center;padding:6px 14px;font:700 14px/1.6 'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif";
      document.body.insertBefore(el,document.body.firstChild)}
    el.textContent=txt;el.style.direction=l==="ar"?"rtl":"ltr";
  });
}

/* ---------- partial pauses on the home page ---------- */
var pausedReq=false,pausedRev=false,hooked=false;
function note(id,text,before){
  var n=document.getElementById(id),ref=before&&before();
  if(!text){if(n)n.remove();return}
  if(!ref)return;
  if(!n){n=document.createElement("p");n.id=id;n.setAttribute("role","status");
    n.style.cssText="margin:0 0 12px;padding:10px 14px;border:1.5px dashed var(--hot,#D9482B);border-radius:12px;color:var(--ink,#12263A);background:var(--surface,#fff);font-weight:500;line-height:1.7";
    ref.parentNode.insertBefore(n,ref)}
  n.textContent=text;
}
function hook(){
  if(hooked)return;hooked=true;
  css("vx-css",".vx-rv-off #rvForm{display:none!important}");
  document.addEventListener("click",function(e){
    var t=e.target&&e.target.closest?e.target:null;if(!t)return;
    if(pausedReq&&t.closest("#save")){e.preventDefault();e.stopImmediatePropagation()}
    if(pausedRev&&t.closest("#rvOpen")){e.preventDefault();e.stopImmediatePropagation()}
  },true);
}
function partial(c,l){
  var t=T[l];
  pausedReq=c.pauseRequests===true||stopAll(c);
  pausedRev=c.pauseReviews===true||stopAll(c);
  ready(function(){
    hook();
    var sv=document.getElementById("save");
    if(sv){sv.disabled=pausedReq;sv.setAttribute("aria-disabled",String(pausedReq))}
    note("vx-n-req",pausedReq?t.pr:"",function(){return document.querySelector("#request .send")});
    var ro=document.getElementById("rvOpen");
    if(ro){ro.disabled=pausedRev;ro.setAttribute("aria-disabled",String(pausedRev))}
    document.documentElement.classList.toggle("vx-rv-off",pausedRev);
    note("vx-n-rev",pausedRev?t.pv:"",function(){return document.querySelector(".rv-cta")});
  });
}

/* ---------- apply ---------- */
function apply(c){
  cfg=c;var l=lang(),t=T[l];
  var sig=JSON.stringify([c,l,isOwner()]);if(sig===lastSig)return;lastSig=sig;
  var bt=bannerOf(c,l);if(bt)banner(bt,l);else removeBanner();
  if(isOwner()){removeScreen();ownerBar(c,l);return}
  var stop=stopAll(c);
  if(IS_REPORT){
    if(reportsClosed(c)){screen({lang:l,title:stop&&c.pauseReports!==true?t.t:t.rt,text:stop&&c.pauseReports!==true?(msgOf(c,l)||t.d):t.rd,until:stop?c.until:"",contact:true,reports:false})}
    else removeScreen();
    return;
  }
  if(stop){screen({lang:l,title:t.t,text:msgOf(c,l)||t.d,until:c.until,contact:true,reports:c.keepReports===true&&c.pauseReports!==true});return}
  removeScreen();partial(c,l);
}
function check(){
  fetch(URL,{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(j){apply(parse(j))}).catch(function(){});
}

/* ---------- public helpers (used by the control page) ---------- */
window.VXSITE={
  preview:function(f,l){l=T[l]?l:"ar";var t=T[l];screen({lang:l,title:t.t,text:f["msg"+cap(l)]||t.d,until:f.until||"",contact:true,reports:f.keepReports===true,preview:true})},
  previewBanner:function(f,l){l=T[l]?l:"ar";var s=f["banner"+cap(l)];if(!s)return false;banner(s,l,{preview:true,id:"vx-banner-pv"});return true},
  previewPartial:function(kind,l){l=T[l]?l:"ar";var t=T[l];screen({lang:l,title:kind==="reports"?t.rt:t.t,text:kind==="reports"?t.rd:t.d,contact:true,reports:false,preview:true})},
  refresh:function(){lastSig="";check()}
};
if(MODE!=="off"){check();setInterval(check,30000);document.addEventListener("visibilitychange",function(){if(!document.hidden)check()})}
})();

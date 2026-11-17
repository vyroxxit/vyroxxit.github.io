/* VYROXX ARSENAL - shared page runtime: language (EN default), theme cycle, i18n helpers, toast, copy. */
(function(g){
"use strict";
var IDX={ar:0,en:1,fr:2,es:3},D={},hooks=[],lang="en",tt=null;
var THEMES=["light","dark","legend","hacker"],ICON={light:"🌙",dark:"🔮",legend:"👾",hacker:"☀️"};
/* dictionary values are [ar,en,fr,es] */
var COMMON={
"Home":["الرئيسية","Home","Accueil","Inicio"],
"Arsenal":["الترسانة","Arsenal","Arsenal","Arsenal"],
"Copied":["تم النسخ","Copied","Copié","Copiado"],
"Copy":["نسخ","Copy","Copier","Copiar"],
"__ft":["VYROXX IT SERVICES · تقنيتك، مسؤوليتنا","VYROXX IT SERVICES · Your Technology, Our Responsibility","VYROXX IT SERVICES · Votre technologie, notre responsabilité","VYROXX IT SERVICES · Tu tecnología, nuestra responsabilidad"],
"Theme":["المظهر","Theme","Thème","Tema"],
"Need a professional security review?":["تحتاج مراجعة أمنية احترافية؟","Need a professional security review?","Besoin d’un audit de sécurité professionnel ?","¿Necesitas una revisión de seguridad profesional?"],
"We audit websites, servers and companies, always with written authorization. We reply within 6 hours.":["نفحص المواقع والخوادم والشركات، دائمًا بتفويض كتابي. نرد خلال 6 ساعات.","We audit websites, servers and companies, always with written authorization. We reply within 6 hours.","Nous auditons sites, serveurs et entreprises, toujours avec autorisation écrite. Réponse sous 6 heures.","Auditamos sitios web, servidores y empresas, siempre con autorización escrita. Respondemos en menos de 6 horas."],
"Request a security audit":["اطلب فحصًا أمنيًا","Request a security audit","Demander un audit de sécurité","Solicitar una auditoría de seguridad"]
};
function $(i){return document.getElementById(i)}
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
function put(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function T(k){var v=D[k]||COMMON[k];return v?(v[IDX[lang]]||v[1]||k):k}
function add(o){for(var k in o)D[k]=o[k]}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){var e=$("ts");if(!e)return;e.firstChild.textContent=m;e.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){e.classList.remove("on")},1900)}
function copy(txt){
  function fb(){var a=document.createElement("textarea");a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand("copy")}catch(_){}a.remove();toast(T("Copied"))}
  try{navigator.clipboard.writeText(txt).then(function(){toast(T("Copied"))},fb)}catch(e){fb()}
}
function apply(){
  var d=document.documentElement;d.lang=lang;d.dir=lang==="ar"?"rtl":"ltr";
  [].forEach.call(document.querySelectorAll("[data-t]"),function(e){e.textContent=T(e.getAttribute("data-t"))});
  [].forEach.call(document.querySelectorAll("[data-ph]"),function(e){e.placeholder=T(e.getAttribute("data-ph"))});
  [].forEach.call(document.querySelectorAll("[data-al]"),function(e){e.setAttribute("aria-label",T(e.getAttribute("data-al")))});
  if(D.__title)document.title=T("__title");
  var md=document.querySelector('meta[name="description"]');if(md&&D.__desc)md.content=T("__desc");
  var ft=$("ft");if(ft)ft.textContent=T("__ft");
  [].forEach.call(document.querySelectorAll("#seg button"),function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-l")===lang))});
  var th=$("theme");if(th)th.setAttribute("aria-label",T("Theme"));
  hooks.forEach(function(f){f(lang)});
}
function setLang(l,save){if(!(l in IDX))l="en";lang=l;apply();if(save)put("vx-lang",l)}
function curTheme(){var a=document.documentElement.getAttribute("data-theme");if(THEMES.indexOf(a)>-1)return a;return matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
function setTheme(m){document.documentElement.setAttribute("data-theme",m);var b=$("theme");if(b)b.textContent=ICON[m];put("vx-theme",m)}
function start(){
  [].forEach.call(document.querySelectorAll("#seg button"),function(b){b.onclick=function(){setLang(b.getAttribute("data-l"),true)}});
  var th=$("theme");if(th){th.onclick=function(){setTheme(THEMES[(THEMES.indexOf(curTheme())+1)%4])};th.textContent=ICON[curTheme()]}
  var sl=get("vx-lang");setLang(sl in IDX?sl:"en",false);
}
g.VXA={T:T,add:add,esc:esc,toast:toast,copy:copy,start:start,setLang:setLang,onLang:function(f){hooks.push(f)},lang:function(){return lang}};
})(window);

/* VYROXX Sentinel - core engine (file integrity monitoring). Runs 100% in the browser: no file ever leaves the device. */
(function(g){
"use strict";
var RISKY=/\.(exe|dll|sys|bat|cmd|ps1|vbs|js|mjs|jse|wsf|sh|bash|php|phtml|asp|aspx|jsp|py|pl|rb|jar|apk|msi|scr|com|lnk|htaccess|html|htm|svg|so|dylib|bin)$/i;
var DOUBLE=/\.(jpe?g|png|gif|pdf|docx?|xlsx?|txt|mp3|mp4|zip)\.(exe|scr|bat|cmd|js|vbs|ps1|com|lnk)$/i;
var FORMAT="vyroxx-sentinel/1";

function hex(b){var u=new Uint8Array(b),s="";for(var i=0;i<u.length;i++)s+=(u[i]<16?"0":"")+u[i].toString(16);return s}
function digest(buf,alg){return crypto.subtle.digest(alg||"SHA-256",buf).then(hex)}
function tick(){return new Promise(function(r){setTimeout(r,0)})}

/* if every path lives under one root folder, drop that root so the same folder can be re-checked under another name */
function stripRoot(items){
  if(items.length&&items.every(function(i){return i.p.indexOf("/")>0})){
    var r=items[0].p.split("/")[0];
    if(items.every(function(i){return i.p.split("/")[0]===r}))items.forEach(function(i){i.p=i.p.slice(r.length+1)});
  }
  return items;
}

/* record = [sha256, size, mtime, flag]  flag: 0 ok, 1 too large (skipped), 2 unreadable */
async function scan(items,opt){
  opt=opt||{};var max=opt.max||268435456,out=new Map(),size=0;
  for(var n=0;n<items.length;n++){
    if(opt.cancel&&opt.cancel())throw new Error("cancel");
    var it=items[n],f=it.f,rec=["",f.size,f.lastModified,0];
    try{if(f.size>max)rec[3]=1;else rec[0]=await digest(await f.arrayBuffer(),"SHA-256")}catch(e){rec[3]=2}
    out.set(it.p,rec);size+=f.size;
    if(opt.onProgress)opt.onProgress(n+1,items.length,it.p,rec,size);
    if(n%6===5)await tick();
  }
  return out;
}

function flags(p){
  var name=p.split("/").pop(),f=[];
  if(DOUBLE.test(name))f.push("double");else if(RISKY.test(name))f.push("exec");
  if(name.charAt(0)===".")f.push("hidden");
  return f;
}
var ORDER={mod:1,add:2,del:3};
function compare(base,cur){
  var rows=[],st={mod:0,add:0,del:0,ok:0,risk:0,stealth:0,skip:0},pen=0;
  cur.forEach(function(c,p){
    var b=base.get(p),fl=flags(p),r;
    if(c[3])st.skip++;
    if(!b){r={t:"add",p:p,b:c,f:fl};st.add++;pen+=fl.length?20:6}
    else if(!c[3]&&!b[3]&&b[0]!==c[0]){
      r={t:"mod",p:p,a:b,b:c,f:fl.slice()};
      if(c[2]<=b[2]){r.f.push("stealth");st.stealth++;pen+=30}   /* content changed but modification time did not move forward */
      st.mod++;pen+=fl.length?25:12;
    }else{st.ok++;return}
    if(r.f.length)st.risk++;
    rows.push(r);
  });
  base.forEach(function(b,p){
    if(!cur.has(p)){var fl=flags(p);rows.push({t:"del",p:p,a:b,f:fl});st.del++;pen+=fl.length?15:8;if(fl.length)st.risk++}
  });
  rows.sort(function(x,y){
    var sx=(x.f.indexOf("stealth")>-1?0:x.f.length?1:2),sy=(y.f.indexOf("stealth")>-1?0:y.f.length?1:2);
    return sx-sy||ORDER[x.t]-ORDER[y.t]||(x.p<y.p?-1:1);
  });
  var changes=st.mod+st.add+st.del;
  return {rows:rows,st:st,total:cur.size,score:Math.max(0,100-pen),
    verdict:!changes?"clean":(st.risk||st.stealth||st.mod>=10?"critical":"alert")};
}

function csvCell(v){v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function toCSV(rows){
  var out=["type,path,flags,old_sha256,new_sha256,old_size,new_size"];
  rows.forEach(function(r){out.push([r.t,r.p,r.f.join("|"),r.a?r.a[0]:"",r.b?r.b[0]:"",r.a?r.a[1]:"",r.b?r.b[1]:""].map(csvCell).join(","))});
  return out.join("\n");
}

function pack(name,map){
  var files={},size=0;map.forEach(function(v,k){files[k]=v;size+=v[1]});
  return {format:FORMAT,name:name,created:Date.now(),count:map.size,size:size,files:files};
}
function unpack(obj){
  if(!obj||obj.format!==FORMAT||typeof obj.files!=="object"||!obj.name)throw new Error("bad");
  var m=new Map();
  Object.keys(obj.files).forEach(function(k){
    var v=obj.files[k];
    if(!Array.isArray(v)||typeof v[0]!=="string"||typeof v[1]!=="number")throw new Error("bad");
    m.set(k,[v[0],v[1],+v[2]||0,+v[3]||0]);
  });
  return {name:String(obj.name).slice(0,80),created:+obj.created||0,count:m.size,size:+obj.size||0,map:m};
}
function fmtSize(n){
  if(n<1024)return n+" B";var u=["KB","MB","GB","TB"],i=-1;do{n/=1024;i++}while(n>=1024&&i<3);return n.toFixed(n>=100?0:n>=10?1:2)+" "+u[i];
}

g.VXS={digest:digest,hex:hex,stripRoot:stripRoot,scan:scan,compare:compare,toCSV:toCSV,pack:pack,unpack:unpack,flags:flags,fmtSize:fmtSize,FORMAT:FORMAT};
if(typeof module!=="undefined")module.exports=g.VXS;
})(typeof window!=="undefined"?window:globalThis);

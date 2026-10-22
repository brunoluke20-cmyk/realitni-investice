(()=>{'use strict';
const REGISTRY_KEY='rei-project-workspace-v1';
const SESSION_KEY='realitni-investice-session';
const STORAGE_PREFIX='__rei_project__';
const nativeGet=Storage.prototype.getItem;
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
const nativeKey=Storage.prototype.key;
const nativeClear=Storage.prototype.clear;
const ls=window.localStorage;
function readRegistry(){try{const x=JSON.parse(nativeGet.call(ls,REGISTRY_KEY)||'null');if(x&&Array.isArray(x.projects))return x}catch(_){}return {projects:[],activeId:''}}
function writeRegistry(r){try{nativeSet.call(ls,REGISTRY_KEY,JSON.stringify(r))}catch(_){}}
let registry=readRegistry();
const params=new URLSearchParams(location.search);
let activeId=params.get('project');
if(!registry.projects.length){
 const legacy={};['rei-shared-project-v1','rei-calc-listings-v1','rei-manager-v1','rei-manager-projects-v2','rei-call-brief-v1','rei-location-analysis-v1','rei-location-results-v1'].forEach(k=>{try{legacy[k]=nativeGet.call(ls,k)}catch(_){}});
 const shared=(()=>{try{return JSON.parse(legacy['rei-shared-project-v1']||'{}')}catch(_){return {}}})();
 const id='property-main';
 registry={activeId:id,projects:[{id,title:shared.name||shared.title||'Doubravínova – Praha Řepy',url:shared.url||shared.listingURL||'https://www.sreality.cz/detail/prodej/dum/rodinny/praha-repy-doubravinova/1765052492',address:shared.address||'Doubravínova, Praha–Řepy',createdAt:new Date().toISOString()}]};
 writeRegistry(registry);
 if(!activeId)activeId=id;
 // Migrate pre-workspace data into the initial folder without deleting the original backup.
 Object.entries(legacy).forEach(([k,v])=>{if(v!==null&&v!==undefined&&nativeGet.call(ls,STORAGE_PREFIX+id+'__'+k)===null)try{nativeSet.call(ls,STORAGE_PREFIX+id+'__'+k,v)}catch(_){}});
}
if(!registry.projects.some(p=>p.id===activeId)){
 activeId=registry.projects[0].id;
}
registry.activeId=activeId;writeRegistry(registry);
if(params.get('project')!==activeId){params.set('project',activeId);history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash)}
function scopedKey(key){key=String(key);if(key===REGISTRY_KEY||key===SESSION_KEY||key.startsWith(STORAGE_PREFIX))return key;return STORAGE_PREFIX+activeId+'__'+key}
Storage.prototype.getItem=function(key){return nativeGet.call(this,scopedKey(key))};
Storage.prototype.setItem=function(key,value){return nativeSet.call(this,scopedKey(key),value)};
Storage.prototype.removeItem=function(key){return nativeRemove.call(this,scopedKey(key))};
Storage.prototype.clear=function(){const all=[];for(let i=0;i<this.length;i++){const k=nativeKey.call(this,i);if(k&&k.startsWith(STORAGE_PREFIX+activeId+'__'))all.push(k)}all.forEach(k=>nativeRemove.call(this,k))};
const project=()=>registry.projects.find(p=>p.id===activeId);
function updateProjectMeta(){
 const p=project();if(!p)return;
 const val=id=>{const e=document.getElementById(id);return e?String(e.value||'').trim():''};
 const title=val('listingTitle')||val('name')||val('listingAddress')||val('address')||val('listingAddress')||val('listingTitle');
 const url=val('listingURL')||val('listingUrl')||val('url')||val('listingUrl');
 const address=val('listingAddress')||val('address');
 if(title)p.title=title.slice(0,140);
 if(url&&/^https?:\/\//i.test(url))p.url=url;
 if(address)p.address=address.slice(0,180);
 const price=val('listingPrice')||val('price');if(price)p.price=price;
 registry.activeId=activeId;writeRegistry(registry);renderWorkspace();
}
function switchProject(id){
 const q=new URLSearchParams(location.search);q.set('project',id);
 location.href=location.pathname+'?'+q.toString()+location.hash;
}
function renderWorkspace(){
 const root=document.getElementById('reiProjectWorkspace');if(!root)return;
 const p=project();root.innerHTML='';
 const label=document.createElement('label');label.textContent='Složka nemovitosti';label.style.cssText='display:block;font-size:12px;font-weight:700;color:#526276;margin-bottom:5px';
 const row=document.createElement('div');row.style.cssText='display:flex;gap:7px;flex-wrap:wrap;align-items:center';
 const select=document.createElement('select');select.setAttribute('aria-label','Vybraná složka nemovitosti');select.style.cssText='flex:1;min-width:190px;max-width:100%;padding:9px;border:1px solid #cbd5df;border-radius:8px;background:white;font:inherit';
 registry.projects.forEach(item=>{const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.title||'Nová nemovitost';opt.selected=item.id===activeId;select.appendChild(opt)});
 select.addEventListener('change',()=>switchProject(select.value));
 function button(text,fn,secondary){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='border:1px solid #cbd5df;border-radius:8px;padding:9px 11px;font:inherit;font-weight:650;cursor:pointer;background:'+(secondary?'white':'#2457d6')+';color:'+(secondary?'#17212b':'white');b.addEventListener('click',fn);return b}
 row.append(select,
 button('+ Nová složka',()=>{const name=prompt('Název nové nemovitosti / složky:','Nový inzerát');if(name===null)return;const id='property-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);registry.projects.push({id,title:name.trim()||'Nový inzerát',url:'',address:'',createdAt:new Date().toISOString()});registry.activeId=id;writeRegistry(registry);switchProject(id)}),
 button('Přejmenovat',()=>{const name=prompt('Nový název složky:',p&&p.title||'');if(name===null||!name.trim())return;p.title=name.trim().slice(0,140);writeRegistry(registry);renderWorkspace()} ,true),
 button('Smazat',()=>{if(registry.projects.length<=1){alert('Musí zůstat alespoň jedna složka.');return}if(!confirm('Smazat složku „'+(p.title||'Nová nemovitost')+'“ včetně všech dat uložených v tomto prohlížeči?'))return;const prefix=STORAGE_PREFIX+activeId+'__';const remove=[];for(let i=0;i<ls.length;i++){const k=nativeKey.call(ls,i);if(k&&k.startsWith(prefix))remove.push(k)}remove.forEach(k=>nativeRemove.call(ls,k));registry.projects=registry.projects.filter(x=>x.id!==activeId);activeId=registry.projects[0].id;registry.activeId=activeId;writeRegistry(registry);switchProject(activeId)},true)
 );
 const subtitle=document.createElement('div');subtitle.style.cssText='font-size:12px;color:#617080;margin-top:5px';subtitle.textContent=(p&&p.address?p.address+' · ':'')+(p&&p.url?'Inzerát je přiřazen k této složce':'Každá složka má vlastní uložená data.');
 root.append(label,row,subtitle);
}
function syncInternalLinks(){
 document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!href||href.startsWith('#')||/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))return;try{const u=new URL(href,location.href);if(u.origin!==location.origin)return;u.searchParams.set('project',activeId);a.href=u.pathname+'?'+u.searchParams.toString()+u.hash}catch(_){}});
}
function installUI(){
 if(document.getElementById('reiProjectWorkspace'))return;
 const root=document.createElement('section');root.id='reiProjectWorkspace';root.style.cssText='position:relative;z-index:1000;max-width:1080px;margin:12px auto;padding:12px 14px;background:#fff;border:1px solid #dfe5eb;border-radius:12px;box-shadow:0 3px 12px #17212b0a;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif';
 const header=document.querySelector('header');if(header&&header.parentNode)header.insertAdjacentElement('afterend',root);else document.body.insertBefore(root,document.body.firstChild);
 renderWorkspace();syncInternalLinks();
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(!href||/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(href))return;try{const u=new URL(href,location.href);if(u.origin===location.origin&&!u.searchParams.has('project')){u.searchParams.set('project',activeId);a.href=u.pathname+'?'+u.searchParams.toString()+u.hash}}catch(_){}},true);
 document.addEventListener('input',e=>{if(e.target&&['listingTitle','name','listingAddress','address','listingURL','listingUrl','url','listingPrice','price'].includes(e.target.id))updateProjectMeta()});
 document.addEventListener('change',e=>{if(e.target&&['listingTitle','name','listingAddress','address','listingURL','listingUrl','url','listingPrice','price'].includes(e.target.id))updateProjectMeta()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});else installUI();
})();
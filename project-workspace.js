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
// One-time conversion of existing calculator tabs into independent property folders.
const CALC_MIGRATION_KEY='rei-workspace-calc-migrated-v1';
if(nativeGet.call(ls,CALC_MIGRATION_KEY)!=='yes'){
 try{
  const legacyCalc=JSON.parse(nativeGet.call(ls,STORAGE_PREFIX+'property-main__rei-calc-listings-v1')||'null');
  if(Array.isArray(legacyCalc)&&legacyCalc.length>1&&registry.projects.length===1){
   const first=legacyCalc[0],fv=first.values||{},base=registry.projects[0];
   base.title=first.title||fv.listingAddress||base.title;
   base.url=fv.listingURL||fv.url||base.url||'';
   base.address=fv.listingAddress||base.address||'';
   nativeSet.call(ls,STORAGE_PREFIX+'property-main__rei-calc-listings-v1',JSON.stringify([first]));
   const firstPrice=fv.listingPrice||fv.purchase||'';
   nativeSet.call(ls,STORAGE_PREFIX+'property-main__rei-shared-project-v1',JSON.stringify({projectId:'property-main',name:base.title,title:base.title,address:base.address,location:base.address,url:base.url,listingURL:base.url,price:String(firstPrice),listingPrice:String(firstPrice),area:fv.listingArea||'',listingArea:fv.listingArea||'',updatedAt:new Date().toISOString()}));
   legacyCalc.slice(1).forEach(item=>{
    if(!item||!item.id)return;
    const v=item.values||{},id='property-'+item.id;
    const title=item.title||v.listingAddress||'Nový inzerát';
    const folder={id,title,url:v.listingURL||v.url||'',address:v.listingAddress||'',price:v.listingPrice||'',createdAt:new Date().toISOString(),migratedFromCalculator:true};
    if(!registry.projects.some(p=>p.id===id))registry.projects.push(folder);
    nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-calc-listings-v1',JSON.stringify([item]));
    nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-shared-project-v1',JSON.stringify({projectId:id,name:title,title,address:folder.address,location:folder.address,url:folder.url,listingURL:folder.url,price:String(folder.price||''),listingPrice:String(folder.price||''),area:v.listingArea||'',listingArea:v.listingArea||'',updatedAt:new Date().toISOString()}));
   });
  }
 }catch(_){}
 nativeSet.call(ls,CALC_MIGRATION_KEY,'yes');
 writeRegistry(registry);
}
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
 document.addEventListener('click',e=>{
  const btn=e.target.closest&&e.target.closest('button');if(!btn)return;
  const calculatorAdd=btn.id==='addListing'&&location.pathname.includes('investicni-kalkulacka');
  const managerAdd=btn.id==='newProject'&&location.pathname.includes('spravce-projektu');
  const callBriefAdd=btn.id==='addListing'&&location.pathname.includes('call-brief');
  if(!calculatorAdd&&!managerAdd&&!callBriefAdd)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const id='property-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  if(callBriefAdd){
   const val=k=>{const el=document.getElementById(k);return el?String(el.value||'').trim():''};
   const url=val('listingUrl'),title=val('listingTitle')||val('listingAddress')||url;
   let saved=[];try{saved=JSON.parse(nativeGet.call(ls,STORAGE_PREFIX+activeId+'__rei-call-brief-v1')||'[]')}catch(_){}
   let shared={};try{shared=JSON.parse(nativeGet.call(ls,STORAGE_PREFIX+activeId+'__rei-shared-project-v1')||'{}')}catch(_){}
   const sharedUrl=shared.url||shared.listingURL||'';
   const alreadySaved=Array.isArray(saved)&&saved.some(r=>url&&r.listingUrl===url);
   const needsFolder=!!url&&((sharedUrl&&sharedUrl!==url)||(Array.isArray(saved)&&saved.length>0&&!alreadySaved));
   if(!needsFolder)return;
   const record={id:'cb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),createdAt:new Date().toISOString(),answers:{},checks:{},todos:{call:false,verify:false,docs:false,visit:false}};
   ['listingUrl','listingTitle','listingAddress','listingPrice','usableArea','landArea','listingKeyPoints','contactName','agency','phone','contactEmail','callState','nextStep','callResult','liveNotes','myOffer','docsToGet'].forEach(k=>record[k]=val(k));
   document.querySelectorAll('[data-answer]').forEach(el=>record.answers[el.dataset.answer]=el.value);
   document.querySelectorAll('[data-qcheck]').forEach(el=>record.checks[el.dataset.qcheck]=el.checked);
   document.querySelectorAll('[data-todo]').forEach(el=>record.todos[el.dataset.todo]=el.checked);
   record.callState=record.callState||'todo';
   const address=val('listingAddress');
   registry.projects.push({id,title:(title||'Nový inzerát').slice(0,140),url,address,price:val('listingPrice'),createdAt:new Date().toISOString()});
   nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-call-brief-v1',JSON.stringify([record]));
   nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-shared-project-v1',JSON.stringify({projectId:id,name:title||address||'Nový inzerát',title:title||address||'Nový inzerát',address,location:address,url,listingURL:url,price:val('listingPrice'),listingPrice:val('listingPrice'),area:val('usableArea'),listingArea:val('usableArea'),landArea:val('landArea'),listingLandArea:val('landArea'),updatedAt:new Date().toISOString()}));
   registry.activeId=id;writeRegistry(registry);switchProject(id);return;
  }
  const name=prompt('Název nové složky / nemovitosti:','Nový inzerát');
  if(name===null)return;
  registry.projects.push({id,title:name.trim()||'Nový inzerát',url:'',address:'',createdAt:new Date().toISOString()});
  registry.activeId=id;writeRegistry(registry);switchProject(id);
 },true);
 document.addEventListener('input',e=>{if(e.target&&['listingTitle','name','listingAddress','address','listingURL','listingUrl','url','listingPrice','price'].includes(e.target.id))updateProjectMeta()});
 document.addEventListener('change',e=>{if(e.target&&['listingTitle','name','listingAddress','address','listingURL','listingUrl','url','listingPrice','price'].includes(e.target.id))updateProjectMeta()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});else installUI();
})();
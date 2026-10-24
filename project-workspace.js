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
 registry={activeId:id,projects:[{id,title:'Nový projekt',url:'',address:'',createdAt:new Date().toISOString()}]};
 writeRegistry(registry);
 if(!activeId)activeId=id;
 // Migrate pre-workspace data into the initial folder without deleting the original backup.
 Object.entries(legacy).forEach(([k,v])=>{if(v!==null&&v!==undefined&&nativeGet.call(ls,STORAGE_PREFIX+id+'__'+k)===null)try{nativeSet.call(ls,STORAGE_PREFIX+id+'__'+k,v)}catch(_){}});
}
const removedDefaultProjects=registry.projects.filter(p=>/doubrav[ií]nova/i.test([p.title,p.address,p.url].filter(Boolean).join(' ')));
if(removedDefaultProjects.length){
 registry.projects=registry.projects.filter(p=>!removedDefaultProjects.includes(p));
 if(!registry.projects.length){const freshId='property-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);registry.projects.push({id:freshId,title:'Nový projekt',url:'',address:'',createdAt:new Date().toISOString()});}
 if(removedDefaultProjects.some(p=>p.id===activeId))activeId=registry.projects[0].id;
 writeRegistry(registry);
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
 button('Importovat seznam',()=>openBulkImport(),true),
 button('Přejmenovat',()=>{const name=prompt('Nový název složky:',p&&p.title||'');if(name===null||!name.trim())return;p.title=name.trim().slice(0,140);writeRegistry(registry);renderWorkspace()} ,true),
 button('Smazat',()=>{if(registry.projects.length<=1){alert('Musí zůstat alespoň jedna složka.');return}if(!confirm('Smazat složku „'+(p.title||'Nová nemovitost')+'“ včetně všech dat uložených v tomto prohlížeči?'))return;const prefix=STORAGE_PREFIX+activeId+'__';const remove=[];for(let i=0;i<ls.length;i++){const k=nativeKey.call(ls,i);if(k&&k.startsWith(prefix))remove.push(k)}remove.forEach(k=>nativeRemove.call(ls,k));registry.projects=registry.projects.filter(x=>x.id!==activeId);activeId=registry.projects[0].id;registry.activeId=activeId;writeRegistry(registry);switchProject(activeId)},true)
 );
 const subtitle=document.createElement('div');subtitle.style.cssText='font-size:12px;color:#617080;margin-top:5px';subtitle.textContent=(p&&p.address?p.address+' · ':'')+(p&&p.url?'Inzerát je přiřazen k této složce':'Každá složka má vlastní uložená data.');
 root.append(label,row,subtitle);
 if(p&&p.record){
  const details=document.createElement('details');details.style.cssText='margin-top:10px;border-top:1px solid #e2e8f0;padding-top:9px';
  const summary=document.createElement('summary');summary.textContent='Karta nemovitosti · '+(p.record.verificationStatus||'údaje k ověření');summary.style.cssText='cursor:pointer;font-weight:700;color:#334155';details.appendChild(summary);
  const photoWrap=document.createElement('div');photoWrap.style.cssText='width:100%;min-height:150px;max-height:340px;border-radius:10px;margin-top:10px;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;overflow:hidden;color:#64748b;font-size:13px;text-align:center;padding:12px;box-sizing:border-box';
  if(p.record.imageUrl){const photo=document.createElement('img');photo.alt='Fotografie nemovitosti: '+(p.record.title||p.title||'Nemovitost');photo.loading='eager';photo.decoding='async';photo.referrerPolicy='no-referrer';photo.style.cssText='display:block;width:100%;max-height:320px;object-fit:cover;border-radius:10px';photo.src=p.record.imageUrl;photo.onerror=()=>{photo.remove();photoWrap.textContent='Fotografie není dostupná'};photoWrap.appendChild(photo)}
  else if(p.url||p.record.url){const listingUrl=p.url||p.record.url;photoWrap.textContent='Fotografie se zobrazí na původním realitním portálu.';
   const link=document.createElement('a');link.href=listingUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Otevřít inzerát a fotografie';link.style.cssText='display:inline-block;border:1px solid #cbd5e1;background:#fff;color:#1d4ed8;border-radius:8px;padding:9px 12px;text-decoration:none;font-weight:650';
   photoWrap.appendChild(link)
  }else{photoWrap.textContent='Přímá fotografie ani odkaz na inzerát nejsou k dispozici'}
  details.appendChild(photoWrap);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-top:10px';
  const entries=[['Cena',p.record.price?Number(p.record.price).toLocaleString('cs-CZ')+' Kč':'Neuvedena'],['Podlahová plocha',p.record.floorArea? p.record.floorArea+' m²':'Neuvedena'],['Pozemek',p.record.landArea?p.record.landArea+' m²':'Neuveden'],['Podlaží',p.record.floors||'Neuvedena'],['Dispozice',p.record.layout||'Neuvedena'],['Adresa / lokalita',p.record.address||p.address||'Neuvedena'],['Metro',p.record.metro||'Neověřeno'],['Kontakt',p.record.contact||'V inzerátu / neověřeno'],['Potenciál',p.record.potential||'Prověřit stavebně a právně'],['Stav ověření',p.record.verificationStatus||'K ověření']];
  entries.forEach(([k,v])=>{const cell=document.createElement('div');cell.style.cssText='padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc';const key=document.createElement('div');key.style.cssText='font-size:11px;color:#64748b;font-weight:700';key.textContent=k;const value=document.createElement('div');value.style.cssText='overflow-wrap:anywhere';value.textContent=String(v);cell.append(key,value);grid.appendChild(cell)});
  details.appendChild(grid);
  if(p.record.notes){const note=document.createElement('p');note.style.cssText='font-size:13px;color:#64748b;margin:8px 0 0';note.textContent=p.record.notes;details.appendChild(note)}
  if(p.url){const link=document.createElement('a');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Otevřít původní inzerát ↗';link.style.cssText='display:inline-block;margin-top:10px;color:#2457d6;font-weight:650';details.appendChild(link)}
  root.appendChild(details);
 }
 const directory=document.createElement('details');directory.style.cssText='margin-top:12px;border-top:1px solid #e2e8f0;padding-top:9px';
 const directorySummary=document.createElement('summary');directorySummary.textContent='Všechny složky nemovitostí ('+registry.projects.length+')';directorySummary.style.cssText='cursor:pointer;font-weight:750;color:#334155';directory.appendChild(directorySummary);
 const directoryList=document.createElement('div');directoryList.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-top:10px';
 registry.projects.forEach(item=>{
  const card=document.createElement('div');card.style.cssText='border:1px solid #e2e8f0;border-radius:9px;padding:10px;background:'+(item.id===activeId?'#eff6ff':'#fff');
  const heading=document.createElement('div');heading.textContent=item.title||'Nový inzerát';heading.style.cssText='font-weight:700;overflow-wrap:anywhere';
  const meta=document.createElement('div');meta.textContent=[item.address,item.price?(Number(item.price).toLocaleString('cs-CZ')+' Kč'):''].filter(Boolean).join(' · ')||'Údaje se ověřují';meta.style.cssText='font-size:12px;color:#64748b;margin:4px 0 8px;overflow-wrap:anywhere';
  const open=document.createElement('button');open.type='button';open.textContent=item.id===activeId?'Právě otevřeno':'Otevřít složku';open.disabled=item.id===activeId;open.style.cssText='border:1px solid #cbd5df;border-radius:7px;padding:6px 9px;background:'+(item.id===activeId?'#dbeafe':'white')+';font:inherit;font-size:12px;cursor:pointer';open.addEventListener('click',()=>switchProject(item.id));
  card.append(heading,meta,open);
  if(item.url){const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Původní inzerát ↗';link.style.cssText='display:inline-block;margin-left:8px;font-size:12px';card.appendChild(link)}
  directoryList.appendChild(card);
 });
 directory.appendChild(directoryList);root.appendChild(directory);
}

// Additive bulk import: existing calculator, valuation, checklist and call-brief flows remain unchanged.
const STARTER_LISTINGS=[
 {title:'Rodinný dům – Prosecká, Praha 9 – Prosek',url:'https://stredo.ceskereality.cz/index.php/prodej/rodinne-domy/rodinne-domy/praha/prodej-rodinneho-domu-274-m2-prosecka-3789317.html',address:'Prosecká, Praha 9 – Prosek',price:24500000,floorArea:274,landArea:165,floors:'Neověřeno',layout:'Více pokojů; přesná dispozice neověřena',metro:'Metro Prosek – ověřit skutečnou pěší trasu',contact:'Neověřen; otevřít původní inzerát',potential:'Předchozí popis uváděl možnost rozdělení; ověřit povolené užívání a dokumentaci',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Údaje převzaty z předchozího seznamu v chatu, nikoli nově potvrzeny. Podlaží, kontakt a aktuální dostupnost nejsou potvrzeny.'},
 {title:'Vícegenerační dům – Nad Kundratkou, Praha 9 – Prosek',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-prosek-nad-kundratkou/2475683916',imageUrl:'https://mlsf.remax-czech.cz/data/zs/429891/3148941.jpg',address:'Nad Kundratkou, Praha 9 – Prosek',price:19999999,floorArea:240,landArea:197,floors:'4 (dle předchozího popisu; ověřit)',layout:'3 obytné prostory – ověřit právní stav',metro:'Metro Prosek – ověřit skutečnou pěší trasu',contact:'Neověřen; otevřít původní inzerát',potential:'Předchozí popis uváděl tři samostatné obytné prostory; ověřit kolaudaci',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Údaje převzaty z předchozího seznamu v chatu, nikoli nově potvrzeny. Kontakt a aktuální dostupnost nejsou potvrzeny.'},
 {title:'Vícegenerační dům – Loutkářská, Praha 6 – Břevnov',url:'https://www.jenreality.cz/reality/prodej-vicegeneracniho-domu-431-m2-praha-6-brevnov-283416/',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qG_C/nCR9NVflLBkanY3yuIGEAD3/843a.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80',address:'Loutkářská, Praha 6 – Břevnov',price:'',floorArea:431,landArea:654,floors:'4 podlaží (dle předchozího popisu; ověřit)',layout:'2 hlavní jednotky a další prostory – ověřit',metro:'Neověřeno; prověřit pěší trasu k metru',contact:'Neověřen; otevřít původní inzerát',potential:'Prostory v suterénu/podkroví; právní možnost samostatných bytů neověřena',verificationStatus:'NEOVĚŘENO – cena a aktivita inzerátu nepotvrzeny',notes:'Předchozí popis uváděl plochy jednotek, ale nejsou zde nově ověřeny. Chybějící údaje zůstávají prázdné.'},
 {title:'Rodinný dům – Na Radosti, Praha-Zličín / Třebonice',url:'https://www.sreality.cz/detail/prodej/dum/rodinny/praha-praha-zlicin-na-radosti/3418824780',address:'Na Radosti, Praha-Zličín / Třebonice',price:25990000,floorArea:198,landArea:641,floors:'Neověřeno',layout:'Neověřeno',metro:'Zličín – předchozí popis uváděl cca 200 m; ověřit trasu',contact:'Neověřen; otevřít původní inzerát',potential:'Možnost rozdělení nepotvrzena; prověřit územní plán a kolaudaci',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Údaje převzaty z předchozího seznamu v chatu. Podlaží, dispozice, kontakt a aktuální dostupnost nejsou potvrzeny.'},
 {title:'Rodinný dům – Ratajova, Praha-Kunratice',url:'https://www.sreality.cz/detail/prodej/dum/rodinny/praha-kunratice-ratajova/206291020',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qE_B/nPYADvcUkmDj2BMBzFHdYkoE/abf5.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80',address:'Ratajova, Praha-Kunratice',price:42000000,floorArea:350,landArea:450,floors:'3 (dle předchozího popisu; ověřit)',layout:'3 jednotky (dle předchozího popisu; ověřit)',metro:'Nesplnění podmínky 10 minut k existujícímu metru není vyloučeno; ověřit',contact:'Neověřen; otevřít původní inzerát',potential:'Předchozí popis uváděl 3 jednotky; ověřit kolaudaci a skutečnou dopravu',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Doplňkový tip z předchozího seznamu; dostupnost metra do 10 minut není potvrzena.'},
 {title:'Vícegenerační dům – Ohnivcova, Praha-Braník',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-branik-ohnivcova/2266222668',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qD_C/nO2CysqjGrC2szhBLciHM1Y22/d72e.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80',address:'Ohnivcova, Praha-Braník',price:39980000,floorArea:298,landArea:1056,floors:'3 podlaží',layout:'Každé podlaží samostatná bytová jednotka (dle inzerátu)',metro:'Metro do 10 min nepotvrzeno; prověřit MHD',contact:'Kontakt přes Sreality – přímý inzerát',potential:'Vila z roku 1936; tři samostatné jednotky, prověřit kolaudaci a skutečné právní rozdělení',verificationStatus:'Přímý inzerát nalezen; upraven 18. 10. 2026, potvrdit dostupnost u prodejce',notes:'Cena 39 980 000 Kč; užitná plocha 298 m²; pozemek 1 056 m².'},
 {title:'Vícegenerační dům – Hostouňská, Praha-Liboc',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-liboc-hostounska/2856128588',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qG_B/kcKfrMAkFW9k4KcNIB2uuL/038f.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80',address:'Hostouňská, Praha-Liboc',price:26990000,floorArea:278,landArea:273,floors:'2 nadzemní + suterén',layout:'2 samostatné byty 2+1; půda vhodná k vestavbě (ověřit povolení)',metro:'Metro do 10 min nepotvrzeno; tramvajové spojení dle inzerátu',contact:'Kontakt přes Sreality – přímý inzerát',potential:'Dva samostatné byty a půda; ověřit kolaudaci a povolení vestavby',verificationStatus:'Přímý inzerát nalezen v aktuálním výpisu; potvrdit dostupnost u prodejce',notes:'Cena 26 990 000 Kč; užitná plocha 278 m²; pozemek 273 m². Stránka při jednom otevření vracela chybu, před kontaktováním ověřit, že je stále aktivní.'},
 {title:'Vícegenerační dům – Na bateriích, Praha 6 – Břevnov',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-brevnov-na-bateriich/3767480396',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qF_A/k0OqwCKRD1EvuBjuHrYJUN/34f8.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80',address:'Na bateriích, Praha 6 – Břevnov',price:33000000,floorArea:324,landArea:454,floors:'3 nadzemní + 1 podzemní; volná půda',layout:'2 samostatné bytové jednotky 238 m² a 131 m²',metro:'Metro do 10 min neověřeno',contact:'Kontakt přes Sreality – přímý inzerát',potential:'Dvě jednotky a půda s potenciálem vestavby; ověřit stavební možnosti',verificationStatus:'Přímý inzerát aktualizován 17. 10. 2026; potvrdit dostupnost',notes:'Cena 33 000 000 Kč; užitná plocha 324 m²; pozemek 454 m².'},
 {title:'Vícegenerační dům – Hejtmanská, Praha-Kyje',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-kyje-hejtmanska/2086002764',imageUrl:'https://cdn.mapio.cz/g/13594282/prodej-domu-260-m2-pozemek-739-m2-hejtmanska-praha-praha-img-0.webp',address:'Hejtmanská, Praha-Kyje',price:24650000,floorArea:275,landArea:739,floors:'3 podlaží + půda',layout:'2 byty 4+1 cca 120 m² každý + samostatná jednotka 1+1 cca 35 m²',metro:'Metro Rajská zahrada cca 8 min pěšky dle inzerátu',contact:'Ing. Valerie Zobkova · +420 731 379 981 · valerie.zobkova@housevip.cz',potential:'Historicky 5 menších bytů; dnes 3 jednotky, půda cca 120 m²; prověřit rekonstrukci na další byty',verificationStatus:'Přímý inzerát aktualizován 20. 10. 2026; potvrdit dostupnost',notes:'Cena 24 650 000 Kč; užitná plocha 275 m²; pozemek 739 m²; právně evidováno jako bytový dům.'},
 {title:'Vícegenerační dům – Čechurova, Praha-Horní Počernice',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-horni-pocernice-cechurova/1310302284',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qA_D/kcHp2YdDtCJexH6pzGbNDo1/87ef.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80',address:'Čechurova, Praha-Horní Počernice',price:19997000,floorArea:365,landArea:744,floors:'2 podlaží + suterén a vedlejší stavba',layout:'Jednotky 3+kk cca 90 m² a 4+1 cca 99 m²; studie třetí jednotky 3+kk',metro:'Metro do 10 min nepotvrzeno; MHD a vlak',contact:'Kontakt přes Sreality – přímý inzerát',potential:'Studie možné třetí jednotky a přístavby; ověřit povolení a vedlejší stavbu',verificationStatus:'Přímý inzerát aktualizován 25. 9. 2026; potvrdit dostupnost',notes:'Cena 19 997 000 Kč; plocha uváděná inzerátem 365 m²; pozemek 744 m². Popis rozlišuje dům cca 305 m² a vedlejší stavbu cca 60 m².'},
 {title:'Vícegenerační dům – Herbenova, Praha-Hostivař',url:'https://www.videobydleni.cz/detail/4354344/prodej-vicegeneracniho-domu-praha-hostivar-herbenova-360m2',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qA_D/nCTUX1iX5bIUBBDobGaZHsz/faaf.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80',address:'Herbenova, Praha-Hostivař',price:26990000,floorArea:360,landArea:366,floors:'4 podlaží',layout:'2 byty 2+1, garsonka v suterénu a podkroví k dokončení',metro:'Metro do 10 min nepotvrzeno; tramvaj cca 300 m, vlak Nádraží Hostivař',contact:'Pavel Strnad – kontakt přes inzerát Videobydlení',potential:'Možnost několika bytových jednotek; ověřit dokončení podkroví a kolaudaci',verificationStatus:'Inzerát dohledán ve výpisu; datum aktualizace 29. 8. 2026, potvrdit dostupnost',notes:'Cena 26 990 000 Kč; užitná plocha 360 m²; podlahová plocha 400 m²; pozemek 366 m².'},
 {title:'Vícegenerační dům – Na bateriích, Praha 6 – Břevnov',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-brevnov-na-bateriich/3767480396',address:'Na bateriích, Praha 6 – Břevnov',price:33000000,floorArea:324,landArea:454,floors:'2 podlaží (ověřit)',layout:'2 bytové jednotky; horní 4+1 / 131 m²',metro:'Metro do 10 min neověřeno',contact:'Přes původní inzerát Sreality',potential:'Dvě bytové jednotky, garáž a zahrada; ověřit právní stav',verificationStatus:'Veřejný inzerát nalezen; aktualizován 17. 10. 2026, potvrdit u makléře',notes:'Zdroj uvádí 33 000 000 Kč, užitnou plochu 324 m² a pozemek 454 m².'},
 {title:'Vícegenerační dům – Zličínská, Praha 6 – Břevnov',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-praha-zlicinska/4174188620',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qG_D/nCXhmtHPUChHuMHLNIJnBdB/0862.mpo?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80',address:'Zličínská, Praha 6 – Břevnov',price:26900000,floorArea:260,landArea:335,floors:'Neověřeno',layout:'4+2 a samostatná garsonka',metro:'Metro do 10 min neověřeno',contact:'Přes původní inzerát Sreality',potential:'Samostatná garsonka v přízemí; prověřit možnost dalšího rozdělení',verificationStatus:'Veřejný inzerát nalezen; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 26 900 000 Kč, užitnou plochu 260 m² a pozemek 335 m².'},
 {title:'Vícegenerační dům – V Hrobech, Praha 12 – Libuš',url:'https://stredo.ceskereality.cz/prodej/rodinne-domy/rodinne-domy/praha/prodej-rodinneho-domu-280-m2-v-hrobech-3930256.html',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qE_C/nPYADvcUkmDOhBEDQgHjHT6o/fd0b.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80',address:'V Hrobech 1095, Praha 12 – Libuš',price:32000000,floorArea:280,landArea:258,floors:'Více podlaží; přesný počet ověřit',layout:'Samostatná jednotka cca 50 m² v suterénu',metro:'Pouze budoucí metro D – Libuš; nyní není v provozu',contact:'Ing. Jiří Doskočil · 774 171 500 · doskocil@dumrealit.cz',potential:'Samostatná jednotka cca 50 m²; ověřit kolaudaci a pronajímatelnost',verificationStatus:'Inzerát zveřejněný v říjnu 2026; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 32 000 000 Kč, užitnou plochu 280 m², pozemek 258 m². Budoucí metro D není současná stanice.'},
 {title:'Velká vila – V louce, Praha-Kolovraty',url:'https://www.maxirealitypraha.cz/prodej/rodinne-domy/rodinne-domy/praha/praha-kolovraty/qara-sro-prodej-rodinneho-domu-470-m2-v-louce-3747254.html',imageUrl:'https://img.ceskereality.cz/foto/59400/6b/6b531e9dc58d6be4c843c98f54899940.jpg',address:'V louce, Praha-Kolovraty',price:34500000,floorArea:470,landArea:1038,floors:'Neověřeno',layout:'8 ložnic, 5 koupelen',metro:'Dostupnost metra do 10 min není doložena',contact:'Jaroslav Beránek / QARA s.r.o. – kontakt přes inzerát',potential:'Velká plocha; právní rozdělení na byty neověřeno',verificationStatus:'Veřejný inzerát nalezen; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 34 500 000 Kč, užitnou plochu 470 m² a pozemek 1 038 m².'},
 {title:'Vícegenerační dům – Ke Klimentce, Praha 5 – Smíchov',url:'https://www.ceskereality.cz/prodej/rodinne-domy/rodinne-domy/praha/prodej-rodinneho-domu-180-m2-ke-klimentce-3929181.html',imageUrl:'https://d18-a.sdn.cz/d_18/c_img_qG_B/nCR9NVflLnoRVKTMIBwveR/d0d1.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80',address:'Ke Klimentce 2102, Praha 5 – Smíchov',price:24000000,floorArea:180,landArea:175,floors:'4 (3 nadzemní + 1 podzemní)',layout:'2 až 3 bytové jednotky dle nabídky; 60 m² nebytové plochy uvedeno zvlášť',metro:'Metro do 10 min neověřeno; zdroj uvádí MHD',contact:'Jitka Přibylová – kontakt přes inzerát',potential:'Inzerát uvádí možnost 2–3 bytových jednotek; ověřit kolaudaci',verificationStatus:'Nový veřejný inzerát z října 2026; potvrdit aktuálnost',notes:'Zdroj uvádí 24 000 000 Kč, užitnou plochu 180 m², obytnou plochu 240 m² a pozemek 175 m². Cena za m² se počítá z užitné plochy.'},
  {
    "title": "Vícegenerační dům – Jižní II, Praha 4",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-zabehlice-jizni-ii/2516041804",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qE_D/nPYADvcUkmDcXILWaHmTJjO/4810.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Jižní II, Praha 4 – Záběhlice",
    "price": 17899000,
    "floorArea": 191,
    "landArea": 601,
    "floors": "4 včetně suterénu",
    "layout": "Byty 76 m² a 22 m²; suterén 98 m² nyní provozovna",
    "metro": "Metro Roztyly cca 1 km; do 10 min MHD ověřit",
    "contact": "Kontakt přes Sreality",
    "potential": "Suterénní provozovnu prověřit pro další bytové využití; nutné stavební a kolaudační posouzení.",
    "verificationStatus": "Aktivní veřejný inzerát; dostupnost potvrdit",
    "notes": "Klidná lokalita se zahradou a garáží. Pozor: prodává se spoluvlastnický podíl 1/2, proto je zásadní právní prověrka."
  },
  {
    "title": "Vícegenerační dům – Stodůlky, Praha 13",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-stodulky-/2793997132",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qG_A/kcKfrMAkFCpZ9wPH3IAOrOD/cd72.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Praha 13 – Stodůlky",
    "price": 43000000,
    "floorArea": 250,
    "landArea": 569,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; dispozice ověřit",
    "metro": "Metro B v oblasti Stodůlek; přesnou pěší trasu ověřit",
    "contact": "Eva Žďánská / HVB Real Estate – kontakt přes inzerát",
    "potential": "Velká plocha a pozemek mohou umožnit oddělené jednotky; ověřit současné uspořádání a kolaudaci.",
    "verificationStatus": "Aktualizováno 15. 10. 2026; dostupnost potvrdit",
    "notes": "Klidná rezidenční lokalita, ale vysoká pořizovací cena. Investičně dává smysl jen při doloženém počtu legálních jednotek a realistickém nájemném."
  },
  {
    "title": "Dvougenerační dům – V zápolí, Praha 4 – Michle",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-michle-v-zapoli/256893004",
    "address": "V Zápolí 1104/3, Praha 4 – Michle",
    "price": 24950000,
    "floorArea": 211,
    "landArea": 676,
    "floors": "3 podlaží + částečný suterén",
    "layout": "6+2; samostatné části prověřit",
    "metro": "Kačerov/Budějovická; čas MHD do 10 min nutno ověřit",
    "contact": "100klíčů – kontakt přes inzerát",
    "potential": "Prvorepublikový dům se zahradou, bazénem a garáží; prověřit oddělení vstupů, instalací a právní rozdělení.",
    "verificationStatus": "Aktuální veřejný inzerát; dostupnost potvrdit",
    "notes": "Zahrada a pozemek jsou výhodou. Výsledek investice závisí na nákladech modernizace a možnosti legálně vytvořit samostatné jednotky.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_B/nOdL4BtPEyCi6LRBT1Hu41iD/b4e8.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Velká vila – Jiříkovská, Praha-Ďáblice",
    "url": "https://www.sreality.cz/detail/prodej/dum/vila/praha-dablice-jirikovska/3051888716",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qG_B/nCR9NVflLChOIjk1HIDn65x/a282.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Jiříkovská, Praha 8 – Ďáblice",
    "price": "",
    "floorArea": 438,
    "landArea": 1025,
    "floors": "Více podlaží + nedokončené podkroví",
    "layout": "7+kk; část podkroví nedokončená",
    "metro": "MHD do metra nutno ověřit; 10 min nepotvrzeno",
    "contact": "LOOK reality – kontakt přes Sreality",
    "potential": "Velká vila a 146 m² nedokončeného podkroví; prověřit možnost samostatné jednotky a stavební povolení.",
    "verificationStatus": "Aktuální veřejný inzerát; cena na vyžádání, dostupnost potvrdit",
    "notes": "Pozemek 1 025 m² a hotová plocha cca 292 m² plus podkroví. Bez zveřejněné ceny nelze cenu za m² spočítat; metro do 10 minut není potvrzeno."
  },
  {
    "title": "Vícegenerační dům – Pod rovinou, Praha 4 – Krč",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-krc-pod-rovinou/3504533580",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_D/nOdL4BtPEyDrQHrUKH4La9I/a65e.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Pod rovinou, Praha 4 – Krč",
    "price": 22500000,
    "floorArea": 400,
    "landArea": 483,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; dispozice ověřit",
    "metro": "Krč/Kačerov; přesný čas MHD do 10 min ověřit",
    "contact": "Jana Müllerová – +420 602 128 288, kontakt přes inzerát",
    "potential": "Inzerát zmiňuje projekt/stavební povolení; prověřit platnost povolení a přesný rozsah schválených prací.",
    "verificationStatus": "Upraveno 7. 10. 2026; dostupnost potvrdit",
    "notes": "Nízká cena za m² vzhledem k ploše může být zajímavá, ale ověřit, kolik ze 400 m² je legálně obytných a zda je projekt použitelný."
  },
  {
    "title": "Vícegenerační dům – U střešovických hřišť, Praha 6",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-stresovice-u-stresovickych-hrist/2681782348",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qE_C/kPVqmweP7JB25pTCD2HgZrX6/e47f.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "U střešovických hřišť, Praha 6 – Střešovice",
    "price": 34790000,
    "floorArea": 198,
    "landArea": 317,
    "floors": "3 podlaží + sklep",
    "layout": "Dvě jednotky 4+1 a 2+1 dle inzerátu",
    "metro": "Hradčanská/Dejvická – čas MHD ověřit",
    "contact": "Kontakt přes Sreality",
    "potential": "Dvě existující jednotky snižují dispoziční riziko; ověřit právní oddělení, měřidla a kolaudaci.",
    "verificationStatus": "Aktuální veřejný inzerát; dostupnost potvrdit",
    "notes": "Žádaná rezidenční lokalita, zahrada, garáž a terasa. Cena je vyšší, ale dvě jednotky mohou usnadnit pronájem."
  },
  {
    "title": "Rodinný dům – V domcích, Praha 6 – Liboc",
    "url": "https://www.digireality.cz/inzerat/6aa73a17fb75ac5e82ef298a",
    "address": "V domcích, Praha 6 – Liboc",
    "price": 29990000,
    "floorArea": 260,
    "landArea": 566,
    "floors": "3 podlaží",
    "layout": "Vícegenerační využití; rozdělení bytů neověřeno",
    "metro": "Petřiny cca 4 min autobusem dle inzerátu",
    "contact": "Bidli – kontakt přes DigiReality",
    "potential": "Třípodlažní dům v zelené Liboci; modernizace možná, ale samostatné byty nejsou potvrzeny.",
    "verificationStatus": "Aktualizováno 16. 9. 2026; dostupnost potvrdit",
    "notes": "Obora Hvězda a Divoká Šárka jsou silnou lokalitní výhodou. Elektrické vytápění může ovlivnit provozní náklady.",
    "imageUrl": "https://www.bidli.cz/globaldata/nemovitosti_fotky/g2h_feca03babc7b4198474be08138b3bba7.jpg"
  },
  {
    "title": "Dvougenerační dům – Horní Počernice, 267 m²",
    "url": "https://www.digireality.cz/inzerat/6a9926ac930b94262c1137a8",
    "address": "Horní Počernice, Praha 9",
    "price": 22500000,
    "floorArea": 267,
    "landArea": 571,
    "floors": "2 podlaží + půda",
    "layout": "Dva byty 4+1 a 5+1; studie třetího bytu",
    "metro": "Metro do 10 min nepotvrzeno; vlak/MHD prověřit",
    "contact": "Bidli – kontakt přes DigiReality",
    "potential": "Projekt na rozdělení na 3 byty je uveden v inzerátu; ověřit povolení, parkování a dopravní dostupnost.",
    "verificationStatus": "Inzerát dohledán; dostupnost potvrdit",
    "notes": "Dvě existující jednotky a studie třetího bytu jsou zajímavé. Dopravní podmínka metra do 10 minut ale není potvrzena, takže jde o záložní tip.",
    "imageUrl": "https://www.bidli.cz/globaldata/nemovitosti_fotky/g2h_ba2906eb41fa966d20262ee558dd7a17.jpg"
  },
  {
    "title": "Vícegenerační dům – Potoční, Praha 6 – Veleslavín",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-veleslavin-potocni/494850124",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_A/nOdL4BtPEyBHthwW4HtFebd/e5d8.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Potoční, Praha 6 – Veleslavín",
    "price": 24990000,
    "floorArea": 200,
    "landArea": 307,
    "floors": "3 podlaží včetně suterénu",
    "layout": "5 bytových jednotek; možnost úpravy na 6",
    "metro": "Veleslavín – metro A a vlak; přesný čas pěšky ověřit",
    "contact": "Kontakt přes Sreality",
    "potential": "Velmi silný konverzní kandidát: inzerát uvádí 5 jednotek s možností 6 a půdu vhodnou k vestavbě. Kompletní rekonstrukce a památková omezení mohou zvýšit náklady.",
    "verificationStatus": "Upraveno 7. 9. 2026; dostupnost potvrdit",
    "notes": "Jedna z nejzajímavějších investičních nabídek díky již existujícím jednotkám a poloze v Praze 6. Nutné prověřit památkovou péči, rozpočet rekonstrukce a právní stav bytů."
  },
  {
    "title": "Dvojdům – Ibišková, Praha-Křeslice",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-kreslice-ibiskova/3911000140",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qG_A/nCR9NVflLCsdQ6SLhH8OAS8/79f7.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Ibišková, Praha 10 – Křeslice",
    "price": 52900000,
    "floorArea": 304,
    "landArea": 2708,
    "floors": "2 patrové domy",
    "layout": "Dvě samostatně vymezené části, každá 5+kk",
    "metro": "Metro do 10 min nepotvrzeno",
    "contact": "Kontakt přes Sreality",
    "potential": "Dvě samostatné části v katastru jsou výhodou; jde ale o drahý dvojdům, ne levný konverzní projekt.",
    "verificationStatus": "Aktuální veřejný inzerát; dostupnost potvrdit",
    "notes": "Velký pozemek a dvě samostatné části zvyšují flexibilitu. Dopravní filtr metra zatím není splněn, jde o záložní srovnání."
  },
  {
    "title": "Vícegenerační dům – Žampiónová, Praha-Pitkovice",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-pitkovice-zampionova/557367372",
    "address": "Žampiónová, Praha 10 – Pitkovice",
    "price": 34000000,
    "floorArea": 200,
    "landArea": 1941,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; dispozice ověřit",
    "metro": "Metro do 10 min nepotvrzeno",
    "contact": "Kontakt přes Sreality",
    "potential": "Pozemek téměř 2 000 m² může mít vlastní rozvojovou hodnotu; prověřit územní plán.",
    "verificationStatus": "Veřejný inzerát dohledán; dostupnost potvrdit",
    "notes": "Velký pozemek může nést hodnotu nezávisle na domě. Poloha v Pitkovicích ale neodpovídá přísnému filtru rychlého metra.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_C/nOdL4BtPEyDrQHrC7AHzhnBc/b6fe.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícegenerační dům – Divišova, Praha-Kbely",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-kbely-divisova/2560041036",
    "address": "Divišova, Praha 19 – Kbely",
    "price": 21500000,
    "floorArea": 195,
    "landArea": 317,
    "floors": "2 podlaží + podzemní",
    "layout": "Vícegenerační dům; přesný počet bytů ověřit",
    "metro": "Metro do 10 min nepotvrzeno",
    "contact": "Kontakt přes Sreality",
    "potential": "Cihlový dům v dobrém stavu; rozdělení na jednotky ověřit podle dispozice a kolaudace.",
    "verificationStatus": "Veřejný inzerát dohledán; dostupnost potvrdit",
    "notes": "Cena za m² může být zajímavá, ale Kbely nejsou v docházkové vzdálenosti metra. Záložní tip mimo hlavní filtr.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_E/nCR9NVflLCnfP0F6QH6i6AM/9626.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícepatrový dům – Dolnojirčanská, Praha-Kamýk",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-kamyk-dolnojircanska/3403665484",
    "address": "Dolnojirčanská, Praha 12 – Kamýk",
    "price": "",
    "floorArea": 340,
    "landArea": 422,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační / komerční využití",
    "metro": "Metro do 10 min nepotvrzeno; budoucí metro D není v provozu",
    "contact": "Kontakt přes Sreality",
    "potential": "Variabilní objekt pro bydlení a podnikání; změnu užívání nutno povolit.",
    "verificationStatus": "Cena neuvedena; dostupnost potvrdit",
    "notes": "Bez ceny nelze spočítat cenu za m². Kamýk je pouze záložní tip, protože budoucí metro D zatím nefunguje.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_E/kcKfrMAkFnIwlGqKH6fvp1/031a.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícegenerační dům – Žďárská, Praha-Dolní Chabry",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-dolni-chabry-zdarska/3032100940",
    "address": "Žďárská, Praha 8 – Dolní Chabry",
    "price": 35985000,
    "floorArea": 345,
    "landArea": 520,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; dispozice ověřit",
    "metro": "Metro do 10 min nepotvrzeno; ověřit MHD",
    "contact": "Kontakt přes Sreality",
    "potential": "Velká plocha a pozemek; prověřit současné jednotky, parkování a kolaudaci.",
    "verificationStatus": "Veřejný inzerát dohledán; dostupnost potvrdit",
    "notes": "Rezidenční lokalita s rodinným charakterem. Bez potvrzeného spojení na metro do 10 minut jde jen o záložní srovnání.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_B/k0OqwCKRZSJdCLdHuwgoL/92c9.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícegenerační dům – V lipkách, Praha-Slivenec",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-slivenec-v-lipkach/3440169036",
    "address": "V lipkách, Praha 5 – Slivenec",
    "price": 44900000,
    "floorArea": 298,
    "landArea": 712,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; jednotky ověřit",
    "metro": "Metro do 10 min nepotvrzeno",
    "contact": "Kontakt přes Sreality",
    "potential": "Velká plocha a pozemek; počet legálních jednotek ověřit v dokumentaci.",
    "verificationStatus": "Veřejný inzerát dohledán; dostupnost potvrdit",
    "notes": "Zelená rezidenční lokalita, ale vysoká cena a nejistá dostupnost metra snižují shodu s investičním filtrem.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qD_F/kO7lxrd9zlOWhOGHwHW3lnu/d379.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícegenerační dům – U olšiček, Praha-Točná",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-tocna-u-olsicek/6303820",
    "address": "U olšiček, Praha 12 – Točná",
    "price": 46900000,
    "floorArea": 484,
    "landArea": 5684,
    "floors": "Více podlaží; ověřit",
    "layout": "Vícegenerační dům; ověřit",
    "metro": "Metro do 10 min nesplněno / nepotvrzeno",
    "contact": "Kontakt přes Sreality",
    "potential": "Rozsáhlý pozemek a velký dům; potenciál může být hlavně v pozemku, ale lokalita je mimo dopravní filtr.",
    "verificationStatus": "Veřejný inzerát dohledán; dostupnost potvrdit",
    "notes": "Zařazeno pouze jako cenové srovnání velkého domu, ne jako hlavní investiční kandidát.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_B/nOdL4BtPEyD4lWfEnKHu73ly/16cf.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Rodinný dům – Bříšťanská, Praha-Horní Počernice",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-horni-pocernice-bristanska/1832263756",
    "address": "Bříšťanská, Praha 20 – Horní Počernice",
    "price": 22490000,
    "floorArea": 218,
    "landArea": 372,
    "floors": "Ověřit v detailu",
    "layout": "Rodinný dům; rozdělení na jednotky neověřeno",
    "metro": "Metro do 10 min nepotvrzeno; ověřit vlak/MHD",
    "contact": "Kontakt přes výsledky Sreality",
    "potential": "Plocha přes 200 m² umožňuje prověřit vícegenerační dispozici; bez detailu zatím nelze potvrdit oddělené jednotky.",
    "verificationStatus": "Výsledek hledání aktuální; přímý inzerát a dostupnost nutno ověřit",
    "notes": "Tato položka odkazuje na vyhledávání, ne přímo na konkrétní inzerát; před investičním rozhodnutím nahradit přímým odkazem.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qG_A/nCR9NVflLCnfP0LuOH7NC1F/e7a4.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Rodinný dům – Ďáblická, Praha-Ďáblice (3 zkolaudované byty)",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-dablice-dablicka/1448943692",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_D/nOdL4BtPEyC2Er43EH14lyN/0b27.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Ďáblická 18, Praha 8 – Ďáblice",
    "price": 19500000,
    "floorArea": 244,
    "landArea": 849,
    "floors": "2 podlaží",
    "layout": "3 samostatné plně kolaudované bytové jednotky; navíc komerční prostor",
    "metro": "MHD do metra Ládví; do 10 min ověřit podle konkrétního spoje",
    "contact": "Kontakt přes Sreality",
    "potential": "Tři již zkolaudované jednotky a samostatný komerční prostor jsou silným investičním základem. Ověřit rozpracovaný stav, cenu dokončení a využití komerční části.",
    "verificationStatus": "Aktualizováno 22. 9. 2026; dostupnost potvrdit",
    "notes": "Velký pozemek 849 m² a 3 legální byty jsou výhoda. Dům je dle nabídky v pokročilé fázi výstavby, takže je třeba pečlivě spočítat dokončovací náklady."
  },
  {
    "title": "Rodinný dům – Legionářů, Praha-Ďáblice",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-dablice-legionaru/173547596",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_C/k0OqwCKRB7OXgBlnH1N88Q/e7f7.jpeg?fl=res%2C2200%2C2200%2C1%7Cwrm%2C%2Fwatermark%2Fsreality.png%2C10%7Cshr%2C%2C20%7Cwebp%2C80",
    "address": "Legionářů, Praha 8 – Ďáblice",
    "price": 19500000,
    "floorArea": 318,
    "landArea": 318,
    "floors": "3 nadzemní + 1 podzemní",
    "layout": "5+kk; velký suterén a více pater, bytové rozdělení prověřit",
    "metro": "MHD do metra Ládví; skutečný čas do 10 min ověřit",
    "contact": "Kontakt přes Sreality",
    "potential": "Velká plocha a 4 podlaží umožňují prověřit oddělené jednotky; stávající popis potvrzuje spíše vícegenerační využití než samostatné byty.",
    "verificationStatus": "Aktuální veřejný inzerát; dostupnost potvrdit",
    "notes": "Zahrada a dvougaráž zvyšují užitnou hodnotu. Cena za m² je relativně nízká, ale musí se ověřit, kolik plochy je obytné a legálně oddělitelné."
  },
  {
    "title": "Rodinný dům – U hájovny, Praha-Ďáblice",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-dablice-u-hajovny/2532040780",
    "address": "U hájovny, Praha 8 – Ďáblice",
    "price": 21000000,
    "floorArea": 206,
    "landArea": 351,
    "floors": "3 podlaží",
    "layout": "Možné dvougenerační využití; suterén lze prověřit pro obytné prostory",
    "metro": "Autobus Květnová cca 230–300 m; metro Ládví cca 1,74 km, přímou návaznost a čas ověřit",
    "contact": "Ing. Milan Šámal · +420 602 100 722 · samal@justo.cz",
    "potential": "Dům je navržen pro dvougenerační využití a suterén nebyl plně obytně dokončen; ověřit kolaudaci, vlhkost a požární požadavky.",
    "verificationStatus": "Aktualizováno 18. 10. 2026; dostupnost potvrdit",
    "notes": "Klidná lokalita u Ďáblického háje, garáž a třípodlažní dispozice. Cena 21 mil. Kč a 206 m² dávají přibližně 101 942 Kč/m²; metro není pěšky do 10 minut, proto ověřit spojení MHD.",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qD_A/kQMlcCt5zmChFvGM2QHF2YTW/9c1d.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80"
  },
  {
    "title": "Vícegenerační dům – Potoční, Praha 6 – Veleslavín",
    "url": "https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-veleslavin-potocni/494850124",
    "address": "Potoční, Praha 6 – Veleslavín",
    "price": 24990000,
    "floorArea": 200,
    "landArea": 307,
    "floors": "Ověřit v detailu",
    "layout": "Vícegenerační dům; dispozice ověřit",
    "metro": "Nádraží Veleslavín – pěší/MHD čas ověřit",
    "contact": "Kontakt přes výsledky Sreality",
    "potential": "Veleslavín je žádaná lokalita s metrem A a vlakem; ověřit skutečný dům, právní jednotky a stav.",
    "verificationStatus": "Výsledek hledání aktuální; přímý inzerát nutno potvrdit",
    "notes": "Odkaz zatím vede na výsledky hledání, nikoli na konkrétní nabídku. Před koupí doplnit přímý odkaz a ověřit dispozici."
  },
  {
    "title": "Rodinný dům / bytový dům – Zdibská, Praha 8 – Kobylisy",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-kobylisy-zdibska/4259590220",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_C/k0OqwCKRDgcHsd5Hx2VSj/1744.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80",
    "address": "Zdibská, Praha 8 – Kobylisy",
    "price": "",
    "floorArea": 260,
    "landArea": 404,
    "floors": "Projekt počítá s 1. NP a obytným podkrovím; stav ověřit",
    "layout": "V katastru bytový dům, aktuálně 2 jednotky; projektovaná plocha cca 283 m²",
    "metro": "Metro Kobylisy cca 5 minut pěšky dle inzerátu",
    "contact": "Kontakt přes Sreality – přímý inzerát",
    "potential": "Velmi zajímavý konverzní kandidát: dům je veden jako bytový, má projekt rekonstrukce z roku 2026 a možnost dalšího kapacitního využití. Cena není zveřejněna, proto nelze spočítat cenu za m².",
    "verificationStatus": "Aktuální inzerát otevřen 23. 10. 2026; cena na vyžádání, dostupnost potvrdit",
    "notes": "Pozemek 404 m²; inzerát uvádí projektovanou podlahovou plochu cca 283 m². Před koupí vyžádat projekt, rozpočet rekonstrukce a potvrzení stavebního úřadu."
  },
  {
    "title": "Rodinný dům se 2 byty – Spořická, Praha 8 – Dolní Chabry",
    "url": "https://www.sreality.cz/detail/prodej/dum/rodinny/praha-dolni-chabry-sporicka/839725132",
    "imageUrl": "https://d18-a.sdn.cz/d_18/c_img_qF_A/k0OqwCKRCO7AFCRpHtD9zx/1c9a.jpeg?fl=res%2C1200%2C1200%2C1%7Cjpg%2C80",
    "address": "Spořická, Praha 8 – Dolní Chabry",
    "price": 18950000,
    "floorArea": 120,
    "landArea": 442,
    "floors": "2 nadzemní podlaží + sklep",
    "layout": "2 samostatné jednotky 2+1, každá cca 60 m²",
    "metro": "Autobusová zastávka před domem; metro Kobylisy cca 10 minut autobusem dle inzerátu",
    "contact": "Kontakt přes Sreality – přímý inzerát",
    "potential": "Dvě již existující bytové jednotky a rekonstrukce z roku 2019 snižují dispoziční nejistotu. Třetí jednotka není potvrzena; ověřit možnost dalšího dělení a parkovací kapacitu.",
    "verificationStatus": "Aktualizováno 3. 10. 2026; dostupnost potvrdit u prodejce",
    "notes": "Cena 18 950 000 Kč; užitná plocha 120 m²; pozemek 442 m²; cena za m² se počítá z uvedené užitné plochy."
  }
];
const LISTING_RECORDS=STARTER_LISTINGS.flat(Infinity);
const LISTING_PHOTOS_BY_URL=new Map(LISTING_RECORDS.filter(r=>r&&r.url&&r.imageUrl).map(r=>[r.url,r.imageUrl]));
LISTING_RECORDS.forEach(r=>{if(r&&r.url&&!r.imageUrl&&LISTING_PHOTOS_BY_URL.has(r.url))r.imageUrl=LISTING_PHOTOS_BY_URL.get(r.url)});
function normalizeImportedRecord(item){
 const r=item&&typeof item==='object'?item:{};
 const title=String(r.title||r.name||r.address||r.location||'Nový inzerát').trim().slice(0,140)||'Nový inzerát';
 const url=String(r.url||r.listingURL||r.listingUrl||'').trim();
 return {
  title,url:/^https?:\/\//i.test(url)?url:'',imageUrl:/^https?:\/\//i.test(String(r.imageUrl||r.photoUrl||''))?String(r.imageUrl||r.photoUrl):'',address:String(r.address||r.location||'').trim().slice(0,220),
  price:r.price??r.listingPrice??'',floorArea:r.floorArea??r.area??r.listingArea??'',landArea:r.landArea??r.listingLandArea??'',
  floors:r.floors??r.storeys??'',layout:r.layout??r.disposition??'',metro:r.metro??r.metroAccess??'',
  contact:r.contact??r.agentContact??r.contactDetails??'',phone:r.phone??r.agentPhone??r.telephone??r.mobile??'',contactEmail:r.contactEmail??r.email??r.agentEmail??'',contactName:r.contactName??r.agentName??r.brokerName??'',agency:r.agency??r.agencyName??r.realEstateAgency??'',potential:r.potential??r.investmentPotential??'',
  verificationStatus:r.verificationStatus||'K ověření – údaje importovány, ověřit proti zdroji',
  notes:String(r.notes||r.description||r.listingNotes||'').slice(0,5000)
 };
}
function saveImportedProperty(record){
 const id='property-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const price=String(record.price??'');
 const area=String(record.floorArea??'');
 const values={
  name:record.title,url:record.url,listingURL:record.url,listingAddress:record.address,
  listingPrice:price,listingArea:area,listingLandArea:String(record.landArea??''),
  listingDisposition:String(record.layout??''),marketLocation:record.address,
  locationAnalysisAddress:record.address
 };
 const folder={id,title:record.title,url:record.url,address:record.address,price,createdAt:new Date().toISOString(),record,migratedFromBulkImport:true};
 registry.projects.push(folder);
 const shared={projectId:id,name:record.title,title:record.title,address:record.address,location:record.address,url:record.url,listingURL:record.url,price,listingPrice:price,area,listingArea:area,landArea:String(record.landArea??''),listingLandArea:String(record.landArea??''),updatedAt:new Date().toISOString()};
 nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-shared-project-v1',JSON.stringify(shared));
 nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-calc-listings-v1',JSON.stringify([{id:'imported-'+id,title:record.title,values}]));
 nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-property-record-v1',JSON.stringify(record));
 return folder;
}
function openBulkImport(){
 const existing=document.getElementById('reiBulkImportModal');if(existing){existing.remove();return}
 const overlay=document.createElement('div');overlay.id='reiBulkImportModal';overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#0f172acc;display:flex;align-items:center;justify-content:center;padding:14px';
 const panel=document.createElement('section');panel.style.cssText='width:min(860px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px #0004;font:14px/1.5 system-ui,sans-serif;color:#17212b';
 const h=document.createElement('h2');h.textContent='Hromadné přidání nemovitostí';h.style.margin='0 0 6px';
 const intro=document.createElement('p');intro.textContent='Každá položka vytvoří samostatnou složku a předvyplní známé údaje v kalkulačce. Neznámé údaje zůstanou prázdné. Importované záznamy se uloží pouze v tomto prohlížeči.';
 const warning=document.createElement('p');warning.textContent='Pozor: připravený seznam níže obsahuje položky z předchozí konverzace. Nejsou znovu ověřené jako aktivní inzeráty; první část jsou historické nabídky k ověření a posledních šest jsou pouze tipy bez přímého odkazu.';
 warning.style.cssText='background:#fff7ed;border:1px solid #fed7aa;padding:10px;border-radius:8px;color:#9a3412';
 const textarea=document.createElement('textarea');textarea.id='reiBulkImportJson';textarea.rows=10;textarea.placeholder='Vlož JSON pole, např. [{"title":"Dům – Praha","url":"https://…","address":"Praha","price":20000000,"floorArea":250,"landArea":400,"floors":"3","layout":"5+kk","metro":"8 min pěšky","contact":"jméno / telefon","potential":"Prověřit","verificationStatus":"K ověření"}]';textarea.style.cssText='width:100%;padding:10px;border:1px solid #cbd5df;border-radius:8px;font:12px/1.5 ui-monospace,monospace;resize:vertical';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
 const makeButton=(label,primary,handler)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:1px solid '+(primary?'#2457d6':'#cbd5df')+';background:'+(primary?'#2457d6':'white')+';color:'+(primary?'white':'#17212b')+';padding:10px 13px;border-radius:8px;font:inherit;font-weight:700;cursor:pointer';b.addEventListener('click',handler);return b};
 const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='font-size:13px;color:#475569';
 actions.append(
  makeButton('Přidat '+STARTER_LISTINGS.length+' položek z předchozího seznamu',true,()=>{if(!confirm('Vytvořit '+STARTER_LISTINGS.length+' samostatných složek? Záznamy budou označené jako neověřené.'))return;let count=0;LISTING_RECORDS.forEach(raw=>{const record=normalizeImportedRecord(raw);if(record.url&&registry.projects.some(p=>p.url===record.url))return;if(!record.url&&registry.projects.some(p=>p.title===record.title))return;saveImportedProperty(record);count++});registry.activeId=activeId;writeRegistry(registry);renderWorkspace();status.textContent='Vytvořeno '+count+' nových složek. Záznamy jsou označené jako neověřené; otevři každou kartu a ověř původní zdroj.';}),
  makeButton('Importovat JSON',true,()=>{let parsed;try{parsed=JSON.parse(textarea.value)}catch(err){status.textContent='JSON není platný: '+err.message;return}const rows=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.properties)?parsed.properties:null);if(!rows){status.textContent='Vlož JSON pole objektů nebo objekt s polem properties.';return}let count=0;rows.forEach(raw=>{const record=normalizeImportedRecord(raw);if(record.url&&registry.projects.some(p=>p.url===record.url))return;if(!record.url&&registry.projects.some(p=>p.title===record.title))return;saveImportedProperty(record);count++});registry.activeId=activeId;writeRegistry(registry);renderWorkspace();status.textContent='Import dokončen: přidáno '+count+' složek. Duplicitní URL nebo názvy bez odkazu byly přeskočeny.';}),
  makeButton('Zavřít',false,()=>overlay.remove())
 );
 const closeTop=document.createElement('button');closeTop.type='button';closeTop.textContent='✕';closeTop.setAttribute('aria-label','Zavřít import');closeTop.style.cssText='float:right;border:0;background:transparent;font-size:20px;cursor:pointer';closeTop.addEventListener('click',()=>overlay.remove());
 panel.append(closeTop,h,intro,warning,textarea,actions,status);overlay.appendChild(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.appendChild(overlay);
}


// Automatically seed every property previously listed in this conversation.
// This is additive and idempotent: existing folders and calculator data are preserved.
const STARTER_IMPORT_KEY='rei-starter-listings-imported-v3';
function updateExistingImportedFolder(folder,record){
 folder.title=record.title;folder.url=record.url;folder.address=record.address;folder.price=String(record.price??'');folder.record=record;folder.migratedFromBulkImport=true;
 const id=folder.id;
 const values={name:record.title,url:record.url,listingURL:record.url,listingAddress:record.address,listingPrice:String(record.price??''),listingArea:String(record.floorArea??''),listingLandArea:String(record.landArea??''),listingDisposition:String(record.layout??''),marketLocation:record.address,locationAnalysisAddress:record.address};
 const shared={projectId:id,name:record.title,title:record.title,address:record.address,location:record.address,url:record.url,listingURL:record.url,price:String(record.price??''),listingPrice:String(record.price??''),area:String(record.floorArea??''),listingArea:String(record.floorArea??''),landArea:String(record.landArea??''),listingLandArea:String(record.landArea??''),updatedAt:new Date().toISOString()};
 try{
  nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-shared-project-v1',JSON.stringify(shared));
  nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-calc-listings-v1',JSON.stringify([{id:'imported-'+id,title:record.title,values}]));
  nativeSet.call(ls,STORAGE_PREFIX+id+'__rei-property-record-v1',JSON.stringify(record));
 }catch(e){}
}
function ensureStarterListings(){
 let added=0,updated=0;
 LISTING_RECORDS.forEach(raw=>{
  const record=normalizeImportedRecord(raw);
  const street=String(record.address||'').split(',')[0].trim().toLocaleLowerCase('cs-CZ');
  let existing=registry.projects.find(p=>p.title&&p.title.startsWith('Tip k prověření –')&&String(p.address||'').split(',')[0].trim().toLocaleLowerCase('cs-CZ')===street);
  if(existing){
   const duplicate=registry.projects.some(p=>p!==existing&&record.url&&p.url===record.url);
   updateExistingImportedFolder(existing,record);
   if(duplicate){existing.title=record.title+' (doplněná původní složka)';existing.record.title=existing.title;}
   updated++;
   return;
  }
  existing=registry.projects.find(p=>record.url&&p.url===record.url);
  if(!existing)existing=registry.projects.find(p=>p.title===record.title);
  if(existing){if(existing.migratedFromBulkImport||existing.record){updateExistingImportedFolder(existing,record);updated++;}return;}
  saveImportedProperty(record);added++;
 });
 if(added||updated||nativeGet.call(ls,STARTER_IMPORT_KEY)!=='yes'){
  registry.activeId=activeId;writeRegistry(registry);
  try{nativeSet.call(ls,STARTER_IMPORT_KEY,'yes')}catch(_){}
 }
}
ensureStarterListings();

function assessListingLocation(record){
 const text=[record.title,record.address,record.location,record.metro].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ');
 const hasMetro=/(metro|stanice|\b[a-zá-ž]+\s+[abc]\b)/i.test(String(record.metro||''));
 const hints=String(record.metro||'').toLocaleLowerCase('cs-CZ');
 let score=4,stop='zastávka a vzdálenost neověřeny',commute='nutno ověřit v PID Lítačce',basis='Předběžný odhad podle popisu inzerátu a čtvrti; přesná pěší trasa ani aktuální jízdní řád nejsou v datech ověřeny.';
 if(/zličín/.test(text)){score=7;stop='metro Zličín – inzerát uvádí cca 200 m';commute='cca 25–35 min (orientační odhad)';basis='Zličín má metro B; celkový čas závisí na pěší trase, čekání a přestupu.'}
 else if(/rajská zahrada/.test(text)){score=7;stop='metro Rajská zahrada – dle popisu cca 8 min pěšky';commute='cca 25–35 min (orientační odhad)';basis='Odhad podle uvedené stanice; přesný čas ověřit pro konkrétní adresu a dobu odjezdu.'}
 else if(/prosek/.test(text)){score=7;stop='metro Prosek – vzdálenost od domu neověřena';commute='cca 20–30 min (orientační odhad)';basis='Čtvrť má přístup k lince C, ale čas chůze ke stanici není potvrzen.'}
 else if(/kobylisy/.test(text)){score=8;stop='metro Kobylisy – u jedné nabídky uváděno cca 5 min pěšky';commute='cca 20–30 min (orientační odhad)';basis='Dobré napojení na linku C; čas chůze je potřeba potvrdit podle přesné adresy.'}
 else if(/veleslavín/.test(text)){score=8;stop='metro A Nádraží Veleslavín – vzdálenost neověřena';commute='cca 15–25 min (orientační odhad)';basis='Linka A vede přímo přes Náměstí Míru; čas zahrnuje chůzi a čekání.'}
 else if(/liboc/.test(text)){score=7;stop='metro Petřiny / Nádraží Veleslavín; inzerát uvádí autobus';commute='cca 20–35 min (orientační odhad)';basis='Přestup a docházka závisí na konkrétní trase; údaj o autobusu není nezávisle ověřen.'}
 else if(/břevnov/.test(text)){score=7;stop='tramvajové spojení; metro pěšky neověřeno';commute='cca 20–35 min (orientační odhad)';basis='Břevnov má tramvajové spojení, ale dostupnost metra se výrazně liší podle ulice.'}
 else if(/ďáblice/.test(text)){score=6;stop='autobus na metro Ládví; pěší vzdálenost neověřena';commute='cca 25–40 min (orientační odhad)';basis='Přestup na metro je nutný; limit 10 minut k metru není u adresy potvrzen.'}
 else if(/středo|záběhlice|kunratice|braník|hostivař|horní počernice|kolovraty|křeslice|pitkovice|kbely|kamýk|točná|slivenec|dolní chabry/.test(text)){score=4;stop='MHD / metro do 10 min není potvrzeno';commute='cca 25–45+ min; nutno ověřit';basis='Předběžně nižší skóre, protože přímá dostupnost metra do 10 minut není v údajích doložena.'}
 else if(/smíchov|střešovice|michle|krč|stodůlky/.test(text)){score=6;stop='MHD dostupná; nejbližší stanice a chůze neověřeny';commute='cca 15–35 min (orientační odhad)';basis='Skóre je předběžné podle širší lokality, nikoli výpočtu trasy od domu.'}
 if(/do 10 min|5 minut pěšky|cca 200 m|8 min pěšky/.test(hints))score=Math.min(10,score+1);
 if(/nepotvrzeno|neověřeno|nutno ověřit|budoucí metro/.test(hints)){basis+=' Pozor: popis výslovně upozorňuje, že údaj o metru není ověřen.'}
 return {score,stop,commute,basis};
}
function renderHomeListingCatalog(){
 if(!location.pathname.endsWith('index.html'))return;
 const main=document.querySelector('main'),tools=main&&main.querySelector('.cards');
 if(!main||!tools||document.getElementById('reiHomeListingCatalog'))return;
 const section=document.createElement('section');section.id='reiHomeListingCatalog';section.className='card';
 const h=document.createElement('h2');h.textContent='Všechny nalezené domy ('+LISTING_RECORDS.length+')';h.style.cssText='font-size:23px;margin:0 0 6px';
 const intro=document.createElement('p');intro.textContent='Cena za m² = cena domu ÷ užitná/podlahová plocha. Neověřené tipy a dostupnost metra jsou jasně označené.';intro.style.cssText='font-size:13px;color:#617080;margin:0 0 14px';
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:12px';
 const money=n=>Number(n).toLocaleString('cs-CZ')+' Kč';
 const seenListingUrls=new Set();
 const chooser=document.createElement('div');chooser.id='reiListingToolChooser';chooser.hidden=true;chooser.setAttribute('role','dialog');chooser.setAttribute('aria-modal','true');chooser.setAttribute('aria-labelledby','reiListingToolChooserTitle');chooser.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box';
 const chooserPanel=document.createElement('div');chooserPanel.style.cssText='width:min(100%,520px);background:#fff;color:#172033;border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.28);max-height:90vh;overflow:auto';
 const chooserTitle=document.createElement('h2');chooserTitle.id='reiListingToolChooserTitle';chooserTitle.textContent='Co chceš s touto nabídkou udělat?';chooserTitle.style.cssText='font-size:21px;margin:0 0 6px';
 const chooserName=document.createElement('p');chooserName.style.cssText='font-size:13px;color:#64748b;margin:0 0 16px';
 const chooserButtons=document.createElement('div');chooserButtons.style.cssText='display:grid;gap:10px';
 const chooserClose=document.createElement('button');chooserClose.type='button';chooserClose.textContent='Zavřít';chooserClose.style.cssText='margin-top:14px;width:100%;padding:11px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:10px;font-weight:650;cursor:pointer';
 chooserPanel.append(chooserTitle,chooserName,chooserButtons,chooserClose);chooser.appendChild(chooserPanel);document.body.appendChild(chooser);
 let chooserRecord=null;
 function closeListingToolChooser(){chooser.hidden=true;chooser.style.display='none';chooserRecord=null}
 chooserClose.addEventListener('click',closeListingToolChooser);
 chooser.addEventListener('click',e=>{if(e.target===chooser)closeListingToolChooser()});
 document.addEventListener('keydown',e=>{if(!chooser.hidden&&e.key==='Escape')closeListingToolChooser()});
 function openListingToolChooser(record){chooserRecord=record;chooserName.textContent=record.title||record.address||'Vybraná nemovitost';chooserButtons.replaceChildren();
  const choices=[
   {label:'🧮 Investiční kalkulačka',description:'Spočítat náklady, rekonstrukci a možný zisk.',url:'investicni-kalkulacka.html',kind:'calculator'},
   {label:'📊 Odhad hodnoty nemovitosti',description:'Připravit orientační ocenění a zástavní hodnotu.',url:'odhad-zastavni-hodnoty.html',kind:'valuation'},
   {label:'📍 Lukrativita okolí',description:'Prověřit lokalitu a dostupné služby v okolí.',url:'lukrativita-okoli.html',kind:'location'},
   {label:'📞 Brief na telefonát',description:'Otevřít přípravu hovoru s předvyplněnými údaji o inzerátu a checklistem otázek.',url:'call-brief.html',kind:'callbrief'}
  ];
  choices.forEach(choice=>{const button=document.createElement('button');button.type='button';button.style.cssText='text-align:left;padding:13px 14px;border:1px solid #dbe3ec;border-radius:11px;background:#fff;cursor:pointer;display:block;width:100%';const label=document.createElement('div');label.textContent=choice.label;label.style.cssText='font-size:15px;font-weight:750';const description=document.createElement('div');description.textContent=choice.description;description.style.cssText='font-size:12px;color:#64748b;margin-top:4px';button.append(label,description);button.addEventListener('click',()=>{const rec=chooserRecord||record;const address=String(rec.address||rec.location||'').trim();const price=Number(rec.price)>0?String(Number(rec.price)):'';const area=Number(rec.floorArea)>0?String(Number(rec.floorArea)):'';const contactObj=rec.contact&&typeof rec.contact==='object'?rec.contact:{};const agentObj=rec.agent&&typeof rec.agent==='object'?rec.agent:{};const detailObj=rec.contactDetails&&typeof rec.contactDetails==='object'?rec.contactDetails:{};const phoneSources=[rec.phone,rec.phoneNumber,rec.phone_number,rec.contactPhone,rec.contact_phone,rec.agentPhone,rec.agent_phone,rec.telephone,rec.mobile,rec.mobile_phone,rec.gsm,contactObj.phone,contactObj.telephone,contactObj.mobile,contactObj.gsm,agentObj.phone,agentObj.telephone,detailObj.phone,detailObj.telephone,typeof rec.contact==='string'?rec.contact:'',typeof rec.agentContact==='string'?rec.agentContact:'',typeof rec.contactDetails==='string'?rec.contactDetails:''];const phoneMatch=phoneSources.map(v=>String(v??'').match(/(?:\\+420|00420|(?<!\\d)420)?[\\s().\\-\\u00a0]*\\d(?:[\\s().\\-\\u00a0]*\\d){8,14}/)?.[0]||'').find(v=>v&&v.replace(/\\D/g,'').length>=9&&v.replace(/\\D/g,'').length<=15)||'';const phone=phoneMatch?phoneMatch.replace(/[^\\d+]/g,'').replace(/^00420/,'+420').replace(/^(\\d{9})$/,'+420$1'):'';const contactName=String(rec.contactName||rec.agentName||rec.brokerName||contactObj.name||agentObj.name||detailObj.name||'');const agency=String(rec.agency||rec.agencyName||rec.realEstateAgency||contactObj.agency||agentObj.agency||'');const contactText=[typeof rec.contact==='string'?rec.contact:'',typeof rec.agentContact==='string'?rec.agentContact:'',typeof rec.contactDetails==='string'?rec.contactDetails:'',contactName,phone,contactObj.email||agentObj.email||detailObj.email||''].filter(Boolean).join(' · ');const payload={name:rec.title||address,title:rec.title||address,address,location:address,url:rec.url||'',listingURL:rec.url||'',price,listingPrice:price,area,listingArea:area,landArea:rec.landArea||'',contact:contactText,phone,contactEmail:String(rec.contactEmail||rec.contact_email||rec.email||rec.agentEmail||contactObj.email||agentObj.email||detailObj.email||''),contactName,agency,notes:String(rec.notes||rec.description||rec.listingNotes||''),potential:String(rec.potential||''),layout:String(rec.layout||''),floors:String(rec.floors||''),metro:String(rec.metro||''),updatedAt:new Date().toISOString()};try{localStorage.setItem('rei-shared-project-v1',JSON.stringify(payload))}catch(_e){}const target=new URL(choice.url,location.href);target.searchParams.set('project',new URLSearchParams(location.search).get('project')||'property-main');if(choice.kind==='calculator'||choice.kind==='callbrief'){target.searchParams.set('listingTitle',payload.name);target.searchParams.set('listingAddress',address);target.searchParams.set('listingURL',payload.url);target.searchParams.set('listingPrice',price);target.searchParams.set('listingArea',area);target.searchParams.set('listingLandArea',String(payload.landArea||''))}if(choice.kind==='callbrief'){target.searchParams.set('from','listing');target.searchParams.set('listingContact',payload.contact);target.searchParams.set('listingPhone',payload.phone);target.searchParams.set('listingEmail',payload.contactEmail);target.searchParams.set('listingAgentName',payload.contactName);target.searchParams.set('listingAgency',payload.agency);target.searchParams.set('listingNotes',payload.notes);target.searchParams.set('listingPotential',payload.potential);target.searchParams.set('listingLayout',payload.layout);target.searchParams.set('listingFloors',payload.floors);target.searchParams.set('listingMetro',payload.metro)}closeListingToolChooser();location.href=target.pathname+target.search});chooserButtons.appendChild(button)});
  chooser.hidden=false;chooser.style.display='flex';const first=chooserButtons.querySelector('button');if(first)first.focus();
 }

 const sortedRecords=LISTING_RECORDS.filter(raw=>raw&&raw.url).slice().sort((a,b)=>{const pa=Number(a.price)>0&&Number(a.floorArea)>0?Number(a.price)/Number(a.floorArea):Infinity;const pb=Number(b.price)>0&&Number(b.floorArea)>0?Number(b.price)/Number(b.floorArea):Infinity;return pa-pb});
 const sortNote=document.createElement('p');sortNote.textContent='Řazení: od nejnižší po nejvyšší cenu za m². Nabídky bez ověřené ceny nebo plochy jsou na konci.';sortNote.style.cssText='font-size:12px;color:#617080;margin:0 0 12px';
 sortedRecords.forEach(raw=>{
  if(raw.url&&seenListingUrls.has(raw.url))return;
  if(raw.url)seenListingUrls.add(raw.url);
  const r=normalizeImportedRecord(raw),card=document.createElement('article');
  card.style.cssText='border:1px solid #dfe5eb;border-radius:12px;padding:13px;display:flex;flex-direction:column;gap:7px;min-width:0';
  const photoWrap=document.createElement('div');photoWrap.style.cssText='width:100%;min-height:190px;border-radius:8px;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;overflow:hidden;font-size:12px;color:#64748b;text-align:center;padding:10px;box-sizing:border-box';
  if(r.imageUrl){const photo=document.createElement('img');photo.alt='Fotografie nemovitosti: '+r.title;photo.loading='eager';photo.decoding='async';photo.referrerPolicy='no-referrer';photo.style.cssText='display:block;width:100%;height:190px;object-fit:cover';photo.src=r.imageUrl;photo.onerror=()=>{photo.remove();photoWrap.textContent='Přímá fotografie není dostupná'};photoWrap.appendChild(photo)}
  else if(r.url){photoWrap.textContent='Fotografie se zobrazí na původním realitním portálu.';
   const link=document.createElement('a');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Otevřít inzerát a fotografie';link.style.cssText='display:inline-block;border:1px solid #cbd5e1;background:#fff;color:#1d4ed8;border-radius:8px;padding:8px 10px;text-decoration:none;font-weight:650';
   photoWrap.appendChild(link)
  }else{photoWrap.textContent='Přímá fotografie ani odkaz na inzerát nejsou k dispozici'}
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Vybrat nástroj pro nabídku: '+r.title);card.style.cursor='pointer';
  card.addEventListener('click',e=>{if(e.target.closest('a,button,input,select,textarea'))return;openListingToolChooser(r)});
  card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();openListingToolChooser(r)}});
  const title=document.createElement('h3');title.textContent=r.title;title.style.cssText='font-size:16px;line-height:1.35;margin:0';
  const price=document.createElement('div');price.textContent=Number(r.price)>0?money(r.price):'Cena neuvedena';price.style.cssText='font-size:19px;font-weight:800;color:#13243a';
  const area=document.createElement('div');area.textContent=r.floorArea?('Užitná/podlahová plocha: '+r.floorArea+' m²'):'Plocha neuvedena';area.style.cssText='font-size:13px;color:#475569';
  const unitPrice=Number(r.price)>0&&Number(r.floorArea)>0?Number(r.price)/Number(r.floorArea):NaN;
  const unit=document.createElement('div');unit.textContent=Number.isFinite(unitPrice)?('Cena za m²: '+money(Math.round(unitPrice))+'/m²'):'Cena za m² nelze spočítat';
  unit.style.cssText='font-size:14px;font-weight:800;color:'+(Number.isFinite(unitPrice)&&unitPrice<90000?'#15803d':'#2457d6')+';'+(Number.isFinite(unitPrice)&&unitPrice<90000?'background:#dcfce7;border:1px solid #86efac;padding:7px 9px;border-radius:8px;':'');
  if(Number.isFinite(unitPrice)&&unitPrice<90000){const valueBadge=document.createElement('span');valueBadge.textContent=' ✓ Pod 90 000 Kč/m²';valueBadge.style.cssText='display:inline-block;margin-left:6px;padding:3px 6px;border-radius:6px;background:#15803d;color:#fff;font-size:11px;font-weight:800';unit.appendChild(valueBadge)}
  const locationAssessment=assessListingLocation(r);
  const locationScore=document.createElement('div');locationScore.textContent='Hodnocení lokality: '+locationAssessment.score+'/10';locationScore.style.cssText='font-size:14px;font-weight:800;color:'+(locationAssessment.score>=8?'#15803d':locationAssessment.score>=6?'#a16207':'#b45309')+';margin-top:3px';
  const transitDetails=document.createElement('div');transitDetails.textContent='MHD: '+locationAssessment.stop+' · cesta na Náměstí Míru: '+locationAssessment.commute;transitDetails.style.cssText='font-size:12px;color:#475569;line-height:1.45';
  const locationBasis=document.createElement('div');locationBasis.textContent=locationAssessment.basis;locationBasis.style.cssText='font-size:11px;color:#64748b;line-height:1.4';
  const land=document.createElement('div');land.textContent=r.landArea?('Pozemek: '+r.landArea+' m²'):'Pozemek neuveden';land.style.cssText='font-size:12px;color:#617080';
  const address=document.createElement('div');address.textContent=r.address||'Lokalita neověřena';address.style.cssText='font-size:13px';
  const metro=document.createElement('div');metro.textContent='Metro: '+(r.metro||'neověřeno');metro.style.cssText='font-size:12px;color:#617080';
  const status=document.createElement('div');status.textContent=r.verificationStatus||'Údaje k ověření';status.style.cssText='font-size:11px;color:#8a4b08;background:#fff7ed;padding:6px 8px;border-radius:7px';
  card.append(photoWrap,title,price,area,unit,locationScore,transitDetails,locationBasis,land,address,metro,status);
  if(r.url){const link=document.createElement('a');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Otevřít původní inzerát ↗';link.style.cssText='font-weight:700;color:#2457d6;margin-top:auto';card.appendChild(link)}
  else {const note=document.createElement('div');note.textContent='Pouze tip – přímý inzerát chybí';note.style.cssText='font-size:12px;color:#b45309;margin-top:auto';card.appendChild(note)}
  grid.appendChild(card);
 });
 section.append(h,intro,sortNote,grid);main.insertBefore(section,tools);
}
function syncInternalLinks(){
 document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!href||href.startsWith('#')||/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))return;try{const u=new URL(href,location.href);if(u.origin!==location.origin)return;u.searchParams.set('project',activeId);a.href=u.pathname+'?'+u.searchParams.toString()+u.hash}catch(_){}});
}
function installUI(){
 if(document.getElementById('reiProjectWorkspace'))return;
 const root=document.createElement('section');root.id='reiProjectWorkspace';root.style.cssText='position:relative;z-index:1000;max-width:1080px;margin:12px auto;padding:12px 14px;background:#fff;border:1px solid #dfe5eb;border-radius:12px;box-shadow:0 3px 12px #17212b0a;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif';
 const header=document.querySelector('header');if(header&&header.parentNode)header.insertAdjacentElement('afterend',root);else document.body.insertBefore(root,document.body.firstChild);
 renderWorkspace();syncInternalLinks();renderHomeListingCatalog();
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(!href||/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(href))return;try{const u=new URL(href,location.href);if(u.origin===location.origin&&!u.searchParams.has('project')){u.searchParams.set('project',activeId);a.href=u.pathname+'?'+u.searchParams.toString()+u.hash}}catch(_){}},true);
 document.addEventListener('click',e=>{
  const btn=e.target.closest&&e.target.closest('button');if(!btn)return;
  const calculatorAdd=btn.id==='addListing'&&location.pathname.includes('investicni-kalkulacka');
  const managerAdd=btn.id==='newProject'&&location.pathname.includes('spravce-projektu');
  const callBriefAdd=btn.id==='addListing'&&location.pathname.includes('call-brief');
  if(!calculatorAdd&&!managerAdd&&!callBriefAdd)return;
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
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
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
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
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
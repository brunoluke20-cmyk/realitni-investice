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
 button('Importovat seznam',()=>openBulkImport(),true),
 button('Přejmenovat',()=>{const name=prompt('Nový název složky:',p&&p.title||'');if(name===null||!name.trim())return;p.title=name.trim().slice(0,140);writeRegistry(registry);renderWorkspace()} ,true),
 button('Smazat',()=>{if(registry.projects.length<=1){alert('Musí zůstat alespoň jedna složka.');return}if(!confirm('Smazat složku „'+(p.title||'Nová nemovitost')+'“ včetně všech dat uložených v tomto prohlížeči?'))return;const prefix=STORAGE_PREFIX+activeId+'__';const remove=[];for(let i=0;i<ls.length;i++){const k=nativeKey.call(ls,i);if(k&&k.startsWith(prefix))remove.push(k)}remove.forEach(k=>nativeRemove.call(ls,k));registry.projects=registry.projects.filter(x=>x.id!==activeId);activeId=registry.projects[0].id;registry.activeId=activeId;writeRegistry(registry);switchProject(activeId)},true)
 );
 const subtitle=document.createElement('div');subtitle.style.cssText='font-size:12px;color:#617080;margin-top:5px';subtitle.textContent=(p&&p.address?p.address+' · ':'')+(p&&p.url?'Inzerát je přiřazen k této složce':'Každá složka má vlastní uložená data.');
 root.append(label,row,subtitle);
 if(p&&p.record){
  const details=document.createElement('details');details.style.cssText='margin-top:10px;border-top:1px solid #e2e8f0;padding-top:9px';
  const summary=document.createElement('summary');summary.textContent='Karta nemovitosti · '+(p.record.verificationStatus||'údaje k ověření');summary.style.cssText='cursor:pointer;font-weight:700;color:#334155';details.appendChild(summary);
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
 {title:'Vícegenerační dům – Nad Kundratkou, Praha 9 – Prosek',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-prosek-nad-kundratkou/2475683916',address:'Nad Kundratkou, Praha 9 – Prosek',price:19999999,floorArea:240,landArea:197,floors:'4 (dle předchozího popisu; ověřit)',layout:'3 obytné prostory – ověřit právní stav',metro:'Metro Prosek – ověřit skutečnou pěší trasu',contact:'Neověřen; otevřít původní inzerát',potential:'Předchozí popis uváděl tři samostatné obytné prostory; ověřit kolaudaci',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Údaje převzaty z předchozího seznamu v chatu, nikoli nově potvrzeny. Kontakt a aktuální dostupnost nejsou potvrzeny.'},
 {title:'Vícegenerační dům – Loutkářská, Praha 6 – Břevnov',url:'https://www.jenreality.cz/reality/prodej-vicegeneracniho-domu-431-m2-praha-6-brevnov-283416/',address:'Loutkářská, Praha 6 – Břevnov',price:'',floorArea:431,landArea:654,floors:'4 podlaží (dle předchozího popisu; ověřit)',layout:'2 hlavní jednotky a další prostory – ověřit',metro:'Neověřeno; prověřit pěší trasu k metru',contact:'Neověřen; otevřít původní inzerát',potential:'Prostory v suterénu/podkroví; právní možnost samostatných bytů neověřena',verificationStatus:'NEOVĚŘENO – cena a aktivita inzerátu nepotvrzeny',notes:'Předchozí popis uváděl plochy jednotek, ale nejsou zde nově ověřeny. Chybějící údaje zůstávají prázdné.'},
 {title:'Rodinný dům – Na Radosti, Praha-Zličín / Třebonice',url:'https://www.sreality.cz/detail/prodej/dum/rodinny/praha-praha-zlicin-na-radosti/3418824780',address:'Na Radosti, Praha-Zličín / Třebonice',price:25990000,floorArea:198,landArea:641,floors:'Neověřeno',layout:'Neověřeno',metro:'Zličín – předchozí popis uváděl cca 200 m; ověřit trasu',contact:'Neověřen; otevřít původní inzerát',potential:'Možnost rozdělení nepotvrzena; prověřit územní plán a kolaudaci',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Údaje převzaty z předchozího seznamu v chatu. Podlaží, dispozice, kontakt a aktuální dostupnost nejsou potvrzeny.'},
 {title:'Rodinný dům – Ratajova, Praha-Kunratice',url:'https://www.sreality.cz/detail/prodej/dum/rodinny/praha-kunratice-ratajova/206291020',address:'Ratajova, Praha-Kunratice',price:42000000,floorArea:350,landArea:450,floors:'3 (dle předchozího popisu; ověřit)',layout:'3 jednotky (dle předchozího popisu; ověřit)',metro:'Nesplnění podmínky 10 minut k existujícímu metru není vyloučeno; ověřit',contact:'Neověřen; otevřít původní inzerát',potential:'Předchozí popis uváděl 3 jednotky; ověřit kolaudaci a skutečnou dopravu',verificationStatus:'NEOVĚŘENO – znovu potvrdit aktivní inzerát a všechny údaje',notes:'Doplňkový tip z předchozího seznamu; dostupnost metra do 10 minut není potvrzena.'},
 {title:'Tip k prověření – Ohnivcova, Praha-Braník',url:'',address:'Ohnivcova, Praha-Braník',price:39980000,floorArea:298,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Tip k prověření – Hostouňská, Praha-Liboc',url:'',address:'Hostouňská, Praha-Liboc',price:26990000,floorArea:278,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Tip k prověření – Na bateriích, Praha-Břevnov',url:'',address:'Na bateriích, Praha-Břevnov',price:33000000,floorArea:324,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Tip k prověření – Hejtmanská, Praha-Kyje',url:'',address:'Hejtmanská, Praha-Kyje',price:24650000,floorArea:275,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Tip k prověření – Čechurova, Praha-Horní Počernice',url:'',address:'Čechurova, Praha-Horní Počernice',price:19997000,floorArea:365,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Tip k prověření – Herbenova, Praha-Hostivař',url:'',address:'Herbenova, Praha-Hostivař',price:26990000,floorArea:360,landArea:'',floors:'Neznámé',layout:'Neznámá',metro:'Neověřeno',contact:'Není k dispozici – chybí přímý inzerát',potential:'Neověřeno',verificationStatus:'POUZE TIP – chybí konkrétní odkaz na inzerát',notes:'Předchozí odpověď uvedla pouze lokalitu, plochu a cenu bez konkrétního odkazu. Nejde o potvrzený aktuální inzerát.'},
 {title:'Vícegenerační dům – Na bateriích, Praha 6 – Břevnov',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-brevnov-na-bateriich/3767480396',address:'Na bateriích, Praha 6 – Břevnov',price:33000000,floorArea:324,landArea:454,floors:'2 podlaží (ověřit)',layout:'2 bytové jednotky; horní 4+1 / 131 m²',metro:'Metro do 10 min neověřeno',contact:'Přes původní inzerát Sreality',potential:'Dvě bytové jednotky, garáž a zahrada; ověřit právní stav',verificationStatus:'Veřejný inzerát nalezen; aktualizován 17. 10. 2026, potvrdit u makléře',notes:'Zdroj uvádí 33 000 000 Kč, užitnou plochu 324 m² a pozemek 454 m².'},
 {title:'Vícegenerační dům – Zličínská, Praha 6 – Břevnov',url:'https://www.sreality.cz/detail/prodej/dum/vicegeneracni-dum/praha-praha-zlicinska/4174188620',address:'Zličínská, Praha 6 – Břevnov',price:26900000,floorArea:260,landArea:335,floors:'Neověřeno',layout:'4+2 a samostatná garsonka',metro:'Metro do 10 min neověřeno',contact:'Přes původní inzerát Sreality',potential:'Samostatná garsonka v přízemí; prověřit možnost dalšího rozdělení',verificationStatus:'Veřejný inzerát nalezen; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 26 900 000 Kč, užitnou plochu 260 m² a pozemek 335 m².'},
 {title:'Vícegenerační dům – V Hrobech, Praha 12 – Libuš',url:'https://stredo.ceskereality.cz/prodej/rodinne-domy/rodinne-domy/praha/prodej-rodinneho-domu-280-m2-v-hrobech-3930256.html',address:'V Hrobech 1095, Praha 12 – Libuš',price:32000000,floorArea:280,landArea:258,floors:'Více podlaží; přesný počet ověřit',layout:'Samostatná jednotka cca 50 m² v suterénu',metro:'Pouze budoucí metro D – Libuš; nyní není v provozu',contact:'Ing. Jiří Doskočil · 774 171 500 · doskocil@dumrealit.cz',potential:'Samostatná jednotka cca 50 m²; ověřit kolaudaci a pronajímatelnost',verificationStatus:'Inzerát zveřejněný v říjnu 2026; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 32 000 000 Kč, užitnou plochu 280 m², pozemek 258 m². Budoucí metro D není současná stanice.'},
 {title:'Velká vila – V louce, Praha-Kolovraty',url:'https://www.maxirealitypraha.cz/prodej/rodinne-domy/rodinne-domy/praha/praha-kolovraty/qara-sro-prodej-rodinneho-domu-470-m2-v-louce-3747254.html',address:'V louce, Praha-Kolovraty',price:34500000,floorArea:470,landArea:1038,floors:'Neověřeno',layout:'8 ložnic, 5 koupelen',metro:'Dostupnost metra do 10 min není doložena',contact:'Jaroslav Beránek / QARA s.r.o. – kontakt přes inzerát',potential:'Velká plocha; právní rozdělení na byty neověřeno',verificationStatus:'Veřejný inzerát nalezen; potvrdit aktuální dostupnost',notes:'Zdroj uvádí 34 500 000 Kč, užitnou plochu 470 m² a pozemek 1 038 m².'},
 {title:'Vícegenerační dům – Ke Klimentce, Praha 5 – Smíchov',url:'https://www.ceskereality.cz/prodej/rodinne-domy/rodinne-domy/praha/prodej-rodinneho-domu-180-m2-ke-klimentce-3929181.html',address:'Ke Klimentce 2102, Praha 5 – Smíchov',price:24000000,floorArea:180,landArea:175,floors:'4 (3 nadzemní + 1 podzemní)',layout:'2 až 3 bytové jednotky dle nabídky; 60 m² nebytové plochy uvedeno zvlášť',metro:'Metro do 10 min neověřeno; zdroj uvádí MHD',contact:'Jitka Přibylová – kontakt přes inzerát',potential:'Inzerát uvádí možnost 2–3 bytových jednotek; ověřit kolaudaci',verificationStatus:'Nový veřejný inzerát z října 2026; potvrdit aktuálnost',notes:'Zdroj uvádí 24 000 000 Kč, užitnou plochu 180 m², obytnou plochu 240 m² a pozemek 175 m². Cena za m² se počítá z užitné plochy.'}
];
function normalizeImportedRecord(item){
 const r=item&&typeof item==='object'?item:{};
 const title=String(r.title||r.name||r.address||r.location||'Nový inzerát').trim().slice(0,140)||'Nový inzerát';
 const url=String(r.url||r.listingURL||r.listingUrl||'').trim();
 return {
  title,url:/^https?:\/\//i.test(url)?url:'',address:String(r.address||r.location||'').trim().slice(0,220),
  price:r.price??r.listingPrice??'',floorArea:r.floorArea??r.area??r.listingArea??'',landArea:r.landArea??r.listingLandArea??'',
  floors:r.floors??r.storeys??'',layout:r.layout??r.disposition??'',metro:r.metro??r.metroAccess??'',
  contact:r.contact??r.phone??r.contactName??'',potential:r.potential??r.investmentPotential??'',
  verificationStatus:r.verificationStatus||'K ověření – údaje importovány, ověřit proti zdroji',
  notes:String(r.notes||r.description||'').slice(0,2000)
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
  makeButton('Přidat 11 položek z předchozího seznamu',true,()=>{if(!confirm('Vytvořit 11 samostatných složek? Záznamy budou označené jako neověřené.'))return;let count=0;STARTER_LISTINGS.forEach(raw=>{const record=normalizeImportedRecord(raw);if(record.url&&registry.projects.some(p=>p.url===record.url))return;if(!record.url&&registry.projects.some(p=>p.title===record.title))return;saveImportedProperty(record);count++});registry.activeId=activeId;writeRegistry(registry);renderWorkspace();status.textContent='Vytvořeno '+count+' nových složek. Záznamy jsou označené jako neověřené; otevři každou kartu a ověř původní zdroj.';}),
  makeButton('Importovat JSON',true,()=>{let parsed;try{parsed=JSON.parse(textarea.value)}catch(err){status.textContent='JSON není platný: '+err.message;return}const rows=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.properties)?parsed.properties:null);if(!rows){status.textContent='Vlož JSON pole objektů nebo objekt s polem properties.';return}let count=0;rows.forEach(raw=>{const record=normalizeImportedRecord(raw);if(record.url&&registry.projects.some(p=>p.url===record.url))return;if(!record.url&&registry.projects.some(p=>p.title===record.title))return;saveImportedProperty(record);count++});registry.activeId=activeId;writeRegistry(registry);renderWorkspace();status.textContent='Import dokončen: přidáno '+count+' složek. Duplicitní URL nebo názvy bez odkazu byly přeskočeny.';}),
  makeButton('Zavřít',false,()=>overlay.remove())
 );
 const closeTop=document.createElement('button');closeTop.type='button';closeTop.textContent='✕';closeTop.setAttribute('aria-label','Zavřít import');closeTop.style.cssText='float:right;border:0;background:transparent;font-size:20px;cursor:pointer';closeTop.addEventListener('click',()=>overlay.remove());
 panel.append(closeTop,h,intro,warning,textarea,actions,status);overlay.appendChild(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.appendChild(overlay);
}


// Automatically seed every property previously listed in this conversation.
// This is additive and idempotent: existing folders and calculator data are preserved.
const STARTER_IMPORT_KEY='rei-starter-listings-imported-v2';
function ensureStarterListings(){
 let added=0;
 STARTER_LISTINGS.forEach(raw=>{
  const record=normalizeImportedRecord(raw);
  const exists=registry.projects.some(p=>(record.url&&p.url===record.url)||p.title===record.title);
  if(exists)return;
  saveImportedProperty(record);added++;
 });
 if(added||nativeGet.call(ls,STARTER_IMPORT_KEY)!=='yes'){
  registry.activeId=activeId;writeRegistry(registry);
  try{nativeSet.call(ls,STARTER_IMPORT_KEY,'yes')}catch(_){}
 }
}
ensureStarterListings();

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
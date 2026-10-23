(()=>{'use strict';
const REG='rei-project-workspace-v1',PFX='__rei_project__';
const $=s=>document.querySelector(s);
const money=n=>Number.isFinite(n)&&n>0?new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK',maximumFractionDigits:0}).format(n):'Cena neuvedena';
const num=v=>{if(typeof v==='number')return Number.isFinite(v)&&v>0?v:null;const raw=String(v??'').replace(/[^0-9,.]/g,'');const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):((raw.match(/\./g)||[]).length>1?raw.replace(/\./g,''):raw);const n=Number(normalized);return Number.isFinite(n)&&n>0?n:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(k,fallback){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fallback}catch(_){return fallback}}
function first(...v){return v.find(x=>x!==null&&x!==undefined&&String(x).trim()!=='')}
function parsePoints(v){if(Array.isArray(v))return v.map(x=>typeof x==='string'?x:(x?.text||x?.value||'')).filter(Boolean);if(typeof v==='string'){try{return parsePoints(JSON.parse(v))}catch(_){return v.split(/\n|•|(?<=\.)\s+/).map(x=>x.trim()).filter(x=>x.length>20)}}return []}
function getData(p){
 const base=PFX+p.id+'__';
 const shared=read(base+'rei-shared-project-v1',{});
 const calc=read(base+'rei-calc-listings-v1',[]);
 const calls=read(base+'rei-call-brief-v1',[]);
 const mgr=read(base+'rei-manager-v1',{});
 const cv=Array.isArray(calc)&&calc.length?(calc.find(x=>x?.values)||calc[0]).values||{}:{};
 const call=Array.isArray(calls)?calls.find(x=>x&&(x.listingUrl||x.listingTitle||x.listingAddress))||calls[0]||{}:{};
 const pTitle=/^(nový inzerát|nová nemovitost|nový projekt|nová nabídka)$/i.test(String(p.title||'').trim())?'':p.title;const title=first(pTitle,shared.title,shared.name,cv.name,cv.listingAddress,call.listingTitle,call.listingAddress,'Nová nemovitost');
 const url=first(p.url,shared.url,shared.listingURL,cv.listingURL,cv.url,call.listingUrl,'');
 const price=num(first(p.price,shared.price,shared.listingPrice,cv.listingPrice,cv.price,call.listingPrice));
 const area=num(first(p.area,shared.area,shared.listingArea,cv.listingArea,cv.usableArea,call.usableArea));
 const land=num(first(p.land,shared.landArea,shared.listingLandArea,cv.landArea,call.landArea));
 const address=first(p.address,shared.address,shared.location,cv.listingAddress,cv.address,call.listingAddress,'');
 const points=parsePoints(first(p.points,call.listingKeyPoints,shared.keyPoints,shared.description,cv.description,''));
 const notes=first(call.liveNotes,call.callResult,call.notes,shared.notes,'');
 const image=first(p.image,shared.image_url,shared.imageUrl,shared.image,call.image_url,call.imageUrl,'');
 return {id:p.id,title,url,address,price,area,land,ppm:price&&area?price/area:null,points,notes,image,call,cv,shared};
}
function prosCons(d){
 const text=[d.title,d.address,...d.points,d.notes].join(' ').toLocaleLowerCase('cs-CZ');
 const pros=[],cons=[];
 const add=(arr,s)=>{if(!arr.includes(s))arr.push(s)};
 if(/investič|investicn|výnos|pronájem|nájem|investor/.test(text))add(pros,'Inzerát výslovně zmiňuje investiční nebo nájemní potenciál.');
 if(/rozděl|samostatn|bytov|jednotk|vícegenerač|vicegenerač|vestavb/.test(text))add(pros,'Možnost více jednotek může rozšířit cílovou skupinu nájemníků nebo kupujících; nutno ověřit povolení.');
 if(/rekonstruk|novostavb|po rekonstrukci|zrekonstru/.test(text))add(pros,'Popis zmiňuje rekonstrukci nebo novější stav; ověřit rozsah, stáří a doklady.');
 if(d.land&&d.land>0)add(pros,'Pozemek '+d.land.toLocaleString('cs-CZ')+' m² může přidávat užitnou hodnotu; prověřit územní plán a využití.');
 if(/metro|tramvaj|vlak|centrum|škola|skola|obchod|park/.test(text))add(pros,'V popisu jsou zmíněné dopravní spojení nebo služby v okolí.');
 if(!pros.length&&d.area)add(pros,'Je uvedena užitná plocha '+d.area.toLocaleString('cs-CZ')+' m², takže lze porovnávat cenu za m² s podobnými nabídkami.');
 if(!d.area)add(cons,'Chybí ověřená užitná plocha – cenu za m² zatím nelze spolehlivě porovnat.');
 if(!d.price)add(cons,'Chybí potvrzená nabídková cena – investiční porovnání je neúplné.');
 if(!d.address)add(cons,'Lokalita není dostatečně upřesněná; bez ní nelze správně srovnat trh a poptávku.');
 if(/rekonstruk|původní stav|původním stavu|k rekonstrukci|před rekonstrukcí/.test(text))add(cons,'Rekonstrukce může navýšit rozpočet i dobu realizace; vyžádat technický průzkum a položkový rozpočet.');
 if(/rozděl|samostatn|bytov|jednotk|vícegenerač|vicegenerač|vestavb/.test(text))add(cons,'Možnost rozdělení na byty není automaticky právně ani technicky zaručená – prověřit stavební úřad, požární řešení, parkování a měření energií.');
 if(/suterén|sklep|vlhk|prasklin|statik|azbest|záplav|zaplaven/.test(text))add(cons,'Prověřit technický stav dotčených konstrukcí a případné náklady na sanaci.');
 if(!cons.length)add(cons,'Z dostupného textu nelze určit zásadní nevýhodu. Před koupí prověřit právní stav, technický stav, skutečné náklady a srovnatelné prodeje.');
 return {pros:pros.slice(0,3),cons:cons.slice(0,3)};
}
function unitPotentialScore(d){
 // Skóre je screeningový odhad, ne potvrzení stavební proveditelnosti.
 const raw=[d.title,d.address,...(d.points||[]),d.notes,d.shared?.description,d.shared?.notes,d.cv?.description,d.call?.listingDescription,d.call?.listingKeyPoints,d.call?.description].filter(Boolean).join(' ');
 const norm=raw.toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ');
 const investor=/\\bpro investory\\b|investorum|investor|investicni|vynosova/.test(norm);
 const area=num(d.area)||num((()=>{
   const labelled=raw.match(/(?:uzitna|obytn[aá]|podlahov[aá]|celkov[aá]|plocha domu|plocha objektu)[^\\d]{0,28}(\\d{2,4}(?:[,.]\\d+)?)\\s*m(?:2|²)/i);
   if(labelled)return labelled[1];
   const all=[...raw.matchAll(/(\\d{2,4}(?:[,.]\\d+)?)\\s*m(?:2|²)/gi)].map(m=>num(m[1])).filter(n=>n&&n>=25&&n<=2000);
   return all.length?Math.max(...all):null;
 })());
 const building=/(dum|rodinny|vila|usedlost|statek|cinzovni|bytovy dum|vicegeneracni|objekt|budova|nemovitost s vice byty)/.test(norm);
 const explicitSplit=/(lze|moznost|mozny|plan|navrzen|projekt|studie|rozdel|vybudovat|vytvorit|predelat|upravit)[^.!?]{0,140}(?:na|pro|az|min)[^.!?]{0,35}\\b([2-9])\\s*(?:samostatn\\w*\\s*)?(?:byt\\w*|jednotk\\w*)/.exec(norm);
 const explicitUnits=[...norm.matchAll(/\\b([2-9])\\s*(?:samostatn\\w*\\s*)?(?:byt\\w*|jednotk\\w*)/g)].map(m=>Number(m[1]));
 let additional=0,source='';
 if(explicitSplit){
   const total=Number(explicitSplit[1]);
   additional=Math.max(0,total-1);
   source='Popis výslovně naznačuje rozdělení na '+total+' jednotky.';
 }else if(building&&area){
   // Hrubý screening: počítáme přibližně 35 m² na jednotku plus rezervu
   // na schodiště/chodby a technické zázemí. Neodečítáme existující byty,
   // pokud je inzerát výslovně neuvádí.
   const capacity=Math.floor(area/42);
   const existing=explicitUnits.length?Math.max(...explicitUnits):1;
   additional=Math.max(0,capacity-existing);
   if(additional>0)source='Plošný odhad podle '+Math.round(area)+' m² a rezervy na společné prostory.';
 }
 const layout=additional>=2?5:additional===1?3:0;
 const bathrooms=(norm.match(/koupeln\\w*/g)||[]).length;
 const toilets=(norm.match(/\\bwc\\b|toalet\\w*|zachod\\w*/g)||[]).length;
 const stair=/centralni schodiste|schodist\\w*|samostatny vstup|samostatne vstupy|oddeleny vstup/.test(norm);
 const hasWetRooms=bathrooms>0&&toilets>0;
 let confidence='nízká';
 if(explicitSplit)confidence='střední';
 else if(building&&area)confidence='nízká';
 if(explicitSplit&&(/kazdy byt|kazda jednotk|samostatn\\w* koupeln|koupeln\\w*.*wc|wc.*koupeln\\w*/.test(norm))&&stair)confidence='vyšší';
 let reason='';
 if(additional>=2)reason='Potenciál 2+ bytů navíc — plný počet bodů za dispozici. ';
 else if(additional===1)reason='Potenciál 1 bytu navíc — 3/5 bodů za dispozici. ';
 else if(!building)reason='Typ nemovitosti není rozpoznán jako dům nebo vícebytový objekt; dispozice nelze z dostupných údajů odhadnout. ';
 else if(!area)reason='Chybí použitelná plocha objektu; doplň plochu nebo popis inzerátu. ';
 else reason='Podle dostupné plochy zatím nevychází dostatečná rezerva pro další jednotku. ';
 if(additional>0){
   if(!hasWetRooms)reason+=' Popis nepotvrzuje dost koupelen a WC pro samostatné jednotky.';
   if(!stair)reason+=' Centrální schodiště / oddělený přístup není potvrzen.';
   reason+=' Každá nová jednotka musí mít alespoň 35 m² a vlastní WC i koupelnu, případně projektově proveditelné alternativní řešení.';
 }
 if(source)reason+=' Základ odhadu: '+source;
 return {layout,investor:investor?5:0,total:Math.min(10,layout+(investor?5:0)),additional,investor,reason,confidence,area:area||null,building};
}
function transportScore(d){const t=[d.address,d.title,...d.points,d.notes].filter(Boolean).join(' ').toLocaleLowerCase('cs-CZ');const a=[{re:/náměstí míru|vinohrad|jiřího z poděbrad/,walk:4,mins:8},{re:/vršovice|vrsovice/,walk:6,mins:15},{re:/žižkov|zizkov|flóra|flora/,walk:7,mins:17},{re:/strašnice|strasnice|skalka/,walk:8,mins:20},{re:/hostivař|hostivar|háje|haje|opatov|chodov/,walk:9,mins:28},{re:/dejvice|dejvická|dejvicka|hradčanská|hradcanska/,walk:6,mins:19},{re:/smíchov|smichov|anděl|andel/,walk:5,mins:18},{re:/holešovice|holesovice|letná|letna/,walk:6,mins:19},{re:/prosek|střížkov|strizkov|ládví|ladvi|kobylisy/,walk:8,mins:27},{re:/černý most|cerny most|kyje/,walk:9,mins:32},{re:/zličín|zlicin|stodůlky|stodulky|luka|luziny/,walk:8,mins:32},{re:/modřany|modrany|braník|branik|libuš|libus/,walk:8,mins:29},{re:/krč|krc|kačerov|kacerov|pankrác|pankrac/,walk:7,mins:23},{re:/centrum|nové město|nove mesto|muzeum|můstek|mustek|karlovo náměstí/,walk:4,mins:10}];const a1=a.find(x=>x.re.test(t));const walk=a1?a1.walk:(/u metra|metro/.test(t)?5:/tramvaj|tram\./.test(t)?7:/autobus|zastávka/.test(t)?10:null);const mins=a1?a1.mins:null;const access=walk===null?null:Math.max(0,Math.min(50,Math.round(50*(1-Math.max(0,walk-2)/18))));const journey=mins===null?null:Math.max(0,Math.min(50,Math.round(50*(1-Math.max(0,mins-5)/45))));const total=access!==null&&journey!==null?access+journey:null;return {walk,mins,access,journey,total,score:total===null?null:Math.round(total/10*10)/10};}
function render(){
 const registry=read(REG,{projects:[]});
 const projects=(registry.projects||[]).map(getData).filter(d=>d.url||d.address||d.price||d.title);
 projects.sort((a,b)=>(a.ppm??Infinity)-(b.ppm??Infinity)||(a.price??Infinity)-(b.price??Infinity));
 const root=$('#propertyDashboard');if(!root)return;
 if(!projects.length){root.innerHTML='<section class="card"><h2>Přehled inzerátů</h2><p class="muted">Zatím tu nejsou uložené nemovitosti. Přidej inzerát v kalkulačce nebo v přípravě telefonátu.</p></section>';return}
 root.innerHTML='<section class="property-dashboard"><div class="dash-heading"><div><span class="pill">INVESTIČNÍ PŘEHLED</span><h2>Všechny nemovitosti</h2><p class="muted">Seřazeno od nejnižší ceny za m². Posouzení výhod a rizik je předběžné a vychází pouze z uložených údajů a popisu inzerátu.</p></div><span class="dash-count">'+projects.length+' '+(projects.length===1?'inzerát':projects.length<5?'inzeráty':'inzerátů')+'</span></div><div class="property-list">'+projects.map((d,i)=>{
 const pc=prosCons(d),points=d.points.length?d.points.slice(0,4):['Poznámky z popisu zatím nejsou k dispozici.'];
 const ts=transportScore(d),us=unitPotentialScore(d),cheap=!!(d.ppm&&d.ppm<85000),high=ts.score!==null&&ts.score>7;
 const priceText=money(d.price),ppmText=d.ppm?money(d.ppm)+' / m²':'Cena za m² nelze vypočítat';
 const metrics='<div class="prop-metrics"><div><small>Skóre rozdělení na byty</small><strong><span class="location-score '+(us.total>=8?'score-high':'')+'">'+us.total+'/10</span></strong><small class="score-sub">Dispozice '+us.layout+'/5 · investoři '+us.investor+'/5</small></div><div><small>Cena</small><strong>'+esc(priceText)+'</strong></div><div class="'+(cheap?'metric-cheap':'')+'"><small>Cena za m²</small><strong>'+esc(ppmText)+(cheap?' <span class="deal-tag">POD 85 TIS.</span>':'')+'</strong></div><div class="'+(high?'metric-high':'')+'"><small>Hodnocení lokality</small><strong>'+(ts.score!==null?'<span class="location-score '+(high?'score-high':'')+'">'+ts.score.toLocaleString('cs-CZ')+'/10</span>':'Zatím nelze odhadnout')+'</strong><small class="score-sub">'+(ts.total!==null?'MHD '+ts.access+'/50 · cesta '+ts.journey+'/50':'Chybí údaje o lokalitě')+'</small></div><div><small>Užitná plocha</small><strong>'+(d.area?esc(d.area.toLocaleString('cs-CZ')+' m²'):'—')+'</strong></div></div><div class="transport-detail">'+esc(us.reason)+' '+(us.additional>0?'Odhad: '+us.additional+' byt(y) navíc; každý musí mít min. 35 m² a vlastní WC+koupelnu, případně proveditelné řešení přes centrální schodiště. ':'')+(us.investor?'Bonus +5: inzerát zmiňuje investory/investiční využití. ':'')+(ts.total!==null?'Orientační odhad: asi '+ts.walk+' min pěšky k MHD a '+ts.mins+' min MHD na Náměstí Míru. ':'')+'Skóre rozdělení je předběžný screening: plocha se přepočítává orientačně na kapacitu s rezervou pro společné prostory; 2+ bytů navíc = 5/5 za dispozici, 1 navíc = 3/5, zmínka o investičním využití = +5. Údaj o koupelnách/WC a schodišti snižuje nejistotu, ale nenahrazuje projektové posouzení. Jistota odhadu: '+us.confidence+'. Skóre lokality z 100 bodů: dostupnost MHD (50) + odhad cesty na Náměstí Míru (50). Není to živý výpočet trasy; ověř konkrétní adresu v PID Lítačce.</div>';
 return '<article class="property-card '+(cheap?'deal-card':'')+'" data-project-card="'+esc(d.id)+'"><div class="prop-top"><span class="rank">'+(i+1)+'.</span><div class="prop-title"><h3>'+esc(d.title)+'</h3><p class="muted">'+esc(d.address||'Lokalita neuvedena')+'</p></div></div><div class="prop-layout"><div class="prop-photo-wrap">'+(d.image?'<img class="prop-photo" loading="lazy" src="'+esc(d.image)+'" alt="Fotografie nemovitosti" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">':'')+'<div class="prop-photo-placeholder" '+(d.image?'style="display:none"':'')+'>Foto z inzerátu<br><small>načítám dostupný náhled…</small></div>'+(d.url?'<a class="photo-link" href="'+esc(d.url)+'" target="_blank" rel="noopener">Původní inzerát ↗</a>':'')+'</div><div class="prop-detail">'+metrics+'<div class="prop-columns"><section><h4>Co inzerát uvádí</h4><ul>'+points.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section><section><h4>Možné výhody</h4><ul class="good">'+pc.pros.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section><section><h4>Rizika / nevýhody k prověření</h4><ul class="risk">'+pc.cons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></div>'+(d.notes?'<div class="saved-notes"><h4>Moje poznámky</h4><p>'+esc(d.notes)+'</p></div>':'')+'<div class="prop-actions"><a class="btn" href="investicni-kalkulacka.html?project='+encodeURIComponent(d.id)+'">Otevřít složku a kalkulaci →</a>'+(d.url?'<a class="btn btn-light" href="'+esc(d.url)+'" target="_blank" rel="noopener">Původní inzerát ↗</a>':'')+'</div></div></div></article>';
 }).join('')+'</div><p class="muted dash-foot">Cena za m² = nabídková cena ÷ uvedená užitná plocha. Nejde o znalecké ocenění. Právní možnost rozdělení, skutečné náklady a tržní cenu ověř před rozhodnutím.</p></section>';
 for(const d of projects){if(d.image||!d.url||!/sreality\.cz/i.test(d.url))continue;let id=(d.url.match(/\/(\d{6,})\/?(?:[?#].*)?$/)||[])[1];if(!id)continue;const card=root.querySelector('[data-project-card="'+CSS.escape(d.id)+'"]');if(!card)continue;const img=card.querySelector('.prop-photo');if(img)continue;fetch('https://zikhzhgxrjpjrkivmwrf.supabase.co/functions/v1/sreality-proxy?id='+encodeURIComponent(id)+'&url='+encodeURIComponent(d.url)).then(r=>r.ok?r.json():null).then(data=>{if(!data)return;const image=data.image_url||data.imageUrl||data.photo_url;if(image){const wrap=card.querySelector('.prop-photo-wrap'),ph=wrap.querySelector('.prop-photo-placeholder');const el=document.createElement('img');el.className='prop-photo';el.loading='lazy';el.alt='Fotografie nemovitosti';el.src=image;el.onerror=()=>{el.remove();if(ph)ph.style.display='grid'};wrap.insertBefore(el,ph);if(ph)ph.style.display='none'}const updates={};if(image)updates.image=image;if(data.title||data.name)updates.title=data.title||data.name;if(data.locality||data.address)updates.address=data.locality||data.address;if(data.price_czk)updates.price=data.price_czk;if(data.usable_area)updates.area=data.usable_area;if(data.land_area)updates.land=data.land_area;if(data.keyPoints||data.description)updates.points=parsePoints(data.keyPoints||data.description);if(Object.keys(updates).length){const project=registry.projects.find(p=>p.id===d.id);if(project){Object.assign(project,updates);localStorage.setItem(REG,JSON.stringify(registry));render()}}}).catch(()=>{});}
}
function addStyles(){const style=document.createElement('style');style.textContent=`
@media(min-width:800px){.property-card.deal-card{border:2px solid #16803b;background:#f5fff7}.metric-cheap{background:#d8f7df!important;border:2px solid #16803b}.metric-cheap strong{color:#11632d}.deal-tag{display:inline-block;background:#16803b;color:#fff;border-radius:5px;padding:3px 5px;font-size:10px;white-space:nowrap}.metric-high{background:#d8f7df!important;border:2px solid #16803b}.location-score{display:inline-block;font-size:22px;font-weight:900;color:#334155}.score-high{color:#11632d}.score-sub{display:block;font-size:11px!important;margin-top:3px}.transport-detail{font-size:12px;color:#596777;margin-top:8px;padding:8px 10px;background:#f6f8fa;border-radius:8px}main{max-width:1240px}.property-list{display:flex;flex-direction:column;gap:18px}.property-card{background:#fff;border:1px solid #dfe5eb;border-radius:16px;padding:20px;box-shadow:0 4px 16px #17212b08}.prop-layout{display:grid;grid-template-columns:minmax(250px,32%) minmax(0,1fr);gap:22px}.prop-photo-wrap{position:relative;align-self:start}.prop-photo{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#eef2f6}.prop-photo-placeholder{display:grid;place-content:center;text-align:center;aspect-ratio:4/3;border-radius:12px;background:#eef2f6;color:#637184;font-weight:700}.photo-link{display:block;margin-top:8px;font-size:13px}.prop-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.prop-metrics>div{padding:10px;background:#f5f7fa;border-radius:9px;min-width:0}.prop-metrics small{display:block;color:#617080;font-size:12px}.prop-metrics strong{display:block;font-size:15px;overflow-wrap:anywhere}.prop-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}.prop-columns section{background:#fbfcfe;border:1px solid #e8edf2;border-radius:10px;padding:12px}.prop-columns h4,.saved-notes h4{margin:0 0 8px;font-size:14px}.prop-columns ul{margin:0;padding-left:19px;font-size:13px}.prop-columns li{margin:0 0 7px}.prop-columns .good li::marker{color:#198754}.prop-columns .risk li::marker{color:#bd5a30}.prop-top{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}.rank{display:grid;place-items:center;min-width:34px;height:34px;background:#e8eefb;color:#244aa3;border-radius:9px;font-weight:800}.prop-title h3{font-size:19px;margin:0}.prop-title p{margin:3px 0 0}.prop-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.prop-actions .btn{margin:0}.btn-light{background:#eef2f6;color:#17212b}.saved-notes{margin-top:14px;padding:12px;background:#fff8e6;border-radius:10px}.saved-notes p{white-space:pre-wrap;margin:0;font-size:13px}.dash-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:14px}.dash-heading h2{font-size:25px;margin:8px 0 2px}.dash-heading p{margin:0;max-width:820px}.dash-count{background:#e8eefb;border-radius:99px;padding:7px 11px;font-weight:700;white-space:nowrap}.dash-foot{margin-top:16px;font-size:12px}}
@media(max-width:799px){.property-card.deal-card{border:2px solid #16803b;background:#f5fff7}.metric-cheap{background:#d8f7df!important;border:2px solid #16803b}.metric-cheap strong{color:#11632d}.deal-tag{display:inline-block;background:#16803b;color:#fff;border-radius:5px;padding:3px 5px;font-size:10px;white-space:nowrap}.metric-high{background:#d8f7df!important;border:2px solid #16803b}.location-score{display:inline-block;font-size:22px;font-weight:900;color:#334155}.score-high{color:#11632d}.score-sub{display:block;font-size:11px!important;margin-top:3px}.transport-detail{font-size:12px;color:#596777;margin-top:8px;padding:8px 10px;background:#f6f8fa;border-radius:8px}.property-dashboard{margin-top:22px}.property-card{background:#fff;border:1px solid #dfe5eb;border-radius:14px;padding:14px;margin:12px 0}.prop-top{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}.rank{font-weight:800;background:#e8eefb;padding:4px 9px;border-radius:8px}.prop-title h3{font-size:17px;margin:0}.prop-photo{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px}.prop-photo-placeholder{display:grid;place-content:center;text-align:center;aspect-ratio:16/9;background:#eef2f6;color:#637184;border-radius:10px}.photo-link{display:block;margin:6px 0}.prop-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.prop-metrics>div{background:#f5f7fa;padding:9px;border-radius:8px;min-width:0}.prop-metrics small{display:block;color:#617080;font-size:12px}.prop-metrics strong{font-size:14px;overflow-wrap:anywhere}.prop-columns section{margin-top:12px;padding:10px;background:#fbfcfe;border:1px solid #e8edf2;border-radius:9px}.prop-columns h4,.saved-notes h4{margin:0 0 6px}.prop-columns ul{margin:0;padding-left:20px;font-size:13px}.prop-columns li{margin-bottom:6px}.prop-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.prop-actions .btn{margin:0}.btn-light{background:#eef2f6;color:#17212b}.saved-notes{margin-top:12px;background:#fff8e6;padding:10px;border-radius:9px}.saved-notes p{white-space:pre-wrap;margin:0;font-size:13px}.dash-heading h2{margin:7px 0 3px}.dash-heading p{margin:0}.dash-count{display:inline-block;margin-top:8px;background:#e8eefb;border-radius:99px;padding:5px 9px;font-size:12px}}`;
document.head.appendChild(style)}
function init(){if(!$('#propertyDashboard')){const main=$('main');if(!main)return;const node=document.createElement('div');node.id='propertyDashboard';const cards=main.querySelector('.cards');if(cards)cards.insertAdjacentElement('afterend',node);else main.appendChild(node)}addStyles();render();window.addEventListener('storage',e=>{if(e.key===REG)render()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
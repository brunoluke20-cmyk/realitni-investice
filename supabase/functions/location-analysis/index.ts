import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigin = "https://brunoluke20-cmyk.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
const headers = { "Accept": "application/json", "User-Agent": "RealitniInvesticeLokalita/2.0 (nekomercni lokalitni analyza)" };

async function photonSearch(q: string, limit = 6) {
  const url = "https://photon.komoot.io/api/?limit=" + limit + "&lang=cs&q=" + encodeURIComponent(q + ", Czechia");
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("Photon HTTP " + r.status);
  const data = await r.json();
  return (Array.isArray(data.features) ? data.features : []).filter((f: any) => {
    const cc = String(f.properties?.countrycode ?? "").toLowerCase();
    return !cc || cc === "cz";
  });
}
async function arcgisSearch(q: string, limit = 7) {
  const params = new URLSearchParams({
    singleLine: q,
    f: "json",
    outFields: "Addr_type,Match_addr",
    maxLocations: String(limit),
    countryCode: "CZE",
    forStorage: "false"
  });
  const r = await fetch("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?" + params.toString(), {
    headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error("ArcGIS HTTP " + r.status);
  const data = await r.json();
  if (data.error) throw new Error("ArcGIS " + (data.error.message || data.error.code || "chyba"));
  return (Array.isArray(data.candidates) ? data.candidates : []).filter((x: any) => x.location && Number.isFinite(Number(x.location.x)) && Number.isFinite(Number(x.location.y)) && Number(x.score ?? 0) >= 50);
}
function arcgisItem(candidate: any) {
  return { label: String(candidate.address || candidate.attributes?.Match_addr || "Nalezená adresa"), lat: Number(candidate.location.y), lon: Number(candidate.location.x), type: String(candidate.attributes?.Addr_type || "address") };
}
async function nominatimSearch(q: string, limit = 6) {
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=" + limit + "&countrycodes=cz&q=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { ...headers, "Accept-Language": "cs,en;q=0.7" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("Nominatim HTTP " + r.status);
  return await r.json();
}
function photonItem(f: any) {
  const p = f.properties || {};
  const city = p.city || p.town || p.village || p.locality || p.district;
  const streetLine = [p.street || p.name, p.housenumber].filter(Boolean).join(" ");
  const label = [streetLine || p.name, p.postcode, city, p.state, p.country].filter(Boolean).join(", ");
  const coords = f.geometry?.coordinates || [];
  return { label: label || p.name || "Nalezené místo", lat: Number(coords[1]), lon: Number(coords[0]), type: p.type || p.osm_value || "address" };
}
async function geocode(q: string) {
  const errors: string[] = [];
  try {
    const candidates = await arcgisSearch(q, 3);
    if (candidates.length) return { ...arcgisItem(candidates[0]), errors };
    errors.push("ArcGIS: adresa nenalezena");
  } catch (e) { errors.push("ArcGIS: " + String(e).slice(0, 100)); }
  try {
    const features = await photonSearch(q, 5);
    const feature = features.find((x: any) => x.geometry?.coordinates?.length >= 2);
    if (feature) return { ...photonItem(feature), errors };
    errors.push("Photon: adresa nenalezena");
  } catch (e) { errors.push("Photon: " + String(e).slice(0, 100)); }
  try {
    const rows = await nominatimSearch(q, 3);
    const f = rows.find((x: any) => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)));
    if (f) return { label: f.display_name || q, lat: Number(f.lat), lon: Number(f.lon), type: f.type || "address", errors };
    errors.push("Nominatim: adresa nenalezena");
  } catch (e) { errors.push("Nominatim: " + String(e).slice(0, 100)); }
  throw new Error(errors.join("; "));
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180, dLat = (lat2-lat1)*rad, dLon = (lon2-lon1)*rad;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function classify(t: any) {
  if (["school", "university", "college"].includes(t.amenity) || ["school", "college", "university"].includes(t.education) || ["school", "college", "university"].includes(t.building) || t.landuse === "education") return "Školy";
  if (t.amenity === "kindergarten" || t.amenity === "childcare" || t.education === "kindergarten" || t.education === "preschool" || t.building === "kindergarten") return "Školky a péče o děti";
  if (t.railway === "subway_entrance" || t.station === "subway" || t.subway === "yes") return "Metro";
  if (t.railway === "tram_stop" || ((t.tram === "yes") && ["platform", "stop_position"].includes(t.public_transport))) return "Tramvajové zastávky";
  if (t.highway === "bus_stop" || ((t.bus === "yes") && ["platform", "stop_position"].includes(t.public_transport))) return "Autobusové zastávky";
  if (["station", "halt"].includes(t.railway)) return "Železniční stanice";
  if (t.public_transport) return "Ostatní MHD";
  if (["pharmacy", "hospital", "clinic", "doctors", "dentist"].includes(t.amenity)) return "Zdravotnictví";
  if (t.shop || t.amenity === "supermarket" || t.amenity === "marketplace") return "Obchody";
  if (["cafe", "restaurant", "fast_food", "pub", "bar"].includes(t.amenity)) return "Restaurace a kavárny";
  if (["bank", "atm", "post_office", "library", "community_centre"].includes(t.amenity)) return "Služby";
  if (t.leisure) return "Sport a zeleň";
  return "Ostatní služby";
}
function labelFor(t: any) {
  if (t.name) return String(t.name);
  if (t.amenity === "kindergarten") return "Mateřská škola";
  if (t.amenity === "school") return "Škola";
  if (t.railway === "subway_entrance") return "Vstup do metra";
  if (t.station === "subway" || t.subway === "yes") return "Stanice metra";
  if (t.railway === "tram_stop" || t.tram === "yes") return "Tramvajová zastávka";
  if (t.highway === "bus_stop" || t.bus === "yes") return "Autobusová zastávka";
  if (t.railway === "station") return "Železniční stanice";
  if (t.shop) return "Obchod (" + String(t.shop).replaceAll("_", " ") + ")";
  return String(t.amenity || t.public_transport || t.railway || t.leisure || t.office || "Místo").replaceAll("_", " ");
}


function xmlText(xml: string, tag: string) {
  const startTag = "<" + tag + ">";
  const start = xml.indexOf(startTag);
  if (start < 0) return "";
  const valueStart = start + startTag.length;
  const end = xml.indexOf("</" + tag + ">", valueStart);
  if (end < 0) return "";
  let value = xml.slice(valueStart, end).replaceAll("<![CDATA[", "").replaceAll("]]>", "");
  value = value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  return value.replaceAll("<", " ").replaceAll(">", " ").trim();
}
async function developmentNotes(lat: number, lon: number, fallbackAddress: string) {
  let area: any = {};
  try {
    const p = new URLSearchParams({format:"jsonv2",lat:String(lat),lon:String(lon),zoom:"10",addressdetails:"1"});
    const r = await fetch("https://nominatim.openstreetmap.org/reverse?" + p, {headers:{...headers,"Accept-Language":"cs,en;q=0.7"},signal:AbortSignal.timeout(9000)});
    if (r.ok) { const d = await r.json(); area = d.address || {}; }
  } catch (_e) {}
  const municipality = String(area.city || area.town || area.village || area.municipality || area.city_district || area.suburb || area.county || fallbackAddress.split(",").slice(-2,-1)[0] || fallbackAddress).trim();
  const region = String(area.state || area.region || area.county || "").trim();
  const queries = [
    {kind:"Bytová výstavba",q:'"' + municipality + '" (nová výstavba OR bytový projekt OR bytové domy OR developerský projekt)'},
    {kind:"Nová infrastruktura a územní rozvoj",q:'"' + municipality + '" (infrastruktura OR územní plán OR dopravní stavba OR rozšíření města)'},
    {kind:"Rozvoj v kraji",q:'"' + (region || municipality) + '" (bytová výstavba OR dopravní infrastruktura OR nové projekty)'}
  ];
  const gathered: any[] = [];
  await Promise.all(queries.map(async item => {
    try {
      const p = new URLSearchParams({q:item.q,hl:"cs",gl:"CZ",ceid:"CZ:cs"});
      const r = await fetch("https://news.google.com/rss/search?" + p, {headers:{"Accept":"application/rss+xml, application/xml, text/xml"},signal:AbortSignal.timeout(9000)});
      if (!r.ok) return;
      const xml = await r.text();
      const blocks = xml.split("<item>").slice(1).map((part:string)=>part.split("</item>")[0]);
      for (const block of blocks) {
        const title = xmlText(block,"title");
        const link = xmlText(block,"link");
        const published = xmlText(block,"pubDate");
        const source = xmlText(block,"source");
        const description = xmlText(block,"description").slice(0,320);
        if (!title || !(link.startsWith("https://") || link.startsWith("http://"))) continue;
        if (!gathered.some(x=>x.link===link)) gathered.push({kind:item.kind,title,link,published,source,description});
      }
    } catch (_e) {}
  }));
  gathered.sort((a,b)=>Date.parse(b.published||"")-Date.parse(a.published||""));
  const searches = queries.map(item=>({kind:item.kind,query:item.q,url:"https://www.google.com/search?q="+encodeURIComponent(item.q)}));
  return {municipality,region,items:gathered.slice(0,8),searches,source:"Google News RSS; územní plán ověřit v oficiálním geoportálu a na webu obce",note:gathered.length ? "Zprávy jsou orientační poznámky k rozvoji, nikoli ověřené povolení stavby. Před rozhodnutím ověř stav projektu u obce nebo stavebního úřadu." : "Automatické zprávy se nepodařilo načíst. Použij odkazy k vyhledání rozvojových projektů a ověř je u obce nebo stavebního úřadu."};
}
async function nearbyAdministrativePlaces(lat: number, lon: number) {
  const q = '[out:json][timeout:8];(nwr(around:3000,'+lat+','+lon+')["office"="government"];nwr(around:3000,'+lat+','+lon+')["amenity"~"townhall|courthouse|police"];nwr(around:3000,'+lat+','+lon+')["government"~"administrative|register_office|municipality"];);out center tags 100;';
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter?data="+encodeURIComponent(q),{headers:{...headers,"Accept":"application/json"},signal:AbortSignal.timeout(8500)});
    if (!r.ok) return [];
    const d = await r.json();
    return (Array.isArray(d.elements)?d.elements:[]).map((e:any)=>{
      const t=e.tags||{},plat=Number(e.lat??e.center?.lat),plon=Number(e.lon??e.center?.lon);
      if(!Number.isFinite(plat)||!Number.isFinite(plon))return null;
      return {name:String(t.name||t["name:cs"]||t.amenity||t.office||"Veřejný úřad"),distance_m:Math.round(haversine(lat,lon,plat,plon)),lat:plat,lon:plon,category:String(t.amenity||t.office||t.government||"úřad"),osm_type:e.type,osm_id:e.id};
    }).filter((x:any)=>x&&x.distance_m<=3000).sort((a:any,b:any)=>a.distance_m-b.distance_m).slice(0,12);
  } catch (_e) { return []; }
}


async function verifyAllowedUser(req: Request): Promise<{ok:boolean,status:number,email?:string,error?:string}> {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return {ok:false,status:401,error:"Pro přístup se přihlas."};
  const token = match[1];
  const projectUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!projectUrl || !anonKey || !serviceKey) return {ok:false,status:503,error:"Ověření přístupu není nakonfigurované."};
  try {
    const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), b => b.toString(16).padStart(2, "0")).join("");
    const sessionResponse = await fetch(projectUrl + "/rest/v1/app_login_sessions?token_hash=eq." + tokenHash + "&expires_at=gt." + encodeURIComponent(new Date().toISOString()) + "&select=username&limit=1", {
      headers: {"apikey":serviceKey,"Authorization":"Bearer "+serviceKey,"Accept":"application/json"},
      signal: AbortSignal.timeout(6000)
    });
    if (!sessionResponse.ok) return {ok:false,status:503,error:"Ověření přihlášení není dostupné."};
    const sessions = await sessionResponse.json();
    if (Array.isArray(sessions) && sessions.length > 0 && sessions[0].username === "zajemce") {
      return {ok:true,status:200,email:"zajemce"};
    }
    // Keep support for previously issued Supabase email sessions.
    const userResponse = await fetch(projectUrl + "/auth/v1/user", {
      headers: {"apikey":anonKey,"Authorization":"Bearer "+token,"Accept":"application/json"},
      signal: AbortSignal.timeout(7000)
    });
    if (!userResponse.ok) return {ok:false,status:401,error:"Přihlášení vypršelo. Přihlas se znovu."};
    const user = await userResponse.json();
    const email = String(user.email || "").trim().toLowerCase();
    if (!email) return {ok:false,status:403,error:"Účet nemá ověřený e-mail."};
    const check = await fetch(projectUrl + "/rest/v1/allowed_users?email=eq." + encodeURIComponent(email) + "&active=eq.true&select=email&limit=1", {
      headers: {"apikey":serviceKey,"Authorization":"Bearer "+serviceKey,"Accept":"application/json"},
      signal: AbortSignal.timeout(7000)
    });
    if (!check.ok) return {ok:false,status:503,error:"Seznam povolených uživatelů není dostupný."};
    const rows = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) return {ok:false,status:403,error:"Tento účet nemá přístup k aplikaci."};
    return {ok:true,status:200,email};
  } catch {
    return {ok:false,status:503,error:"Ověření přístupu je dočasně nedostupné."};
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Use GET" }, 405);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "analyze";
  const address = (url.searchParams.get("address") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();

  if (action !== "autocomplete") {
    const access = await verifyAllowedUser(req);
    if (!access.ok) return json({error:access.error},access.status);
    if (action === "authorize") return json({authorized:true,email:access.email});
  }
  if (action === "development-notes") {
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json({error:"Chybí souřadnice lokality."},400);
    return json(await developmentNotes(lat,lon,address));
  }
  if (action === "autocomplete") {
    if (q.length < 3 || q.length > 180) return json({ results: [] });
    const errors: string[] = [];
    let results: any[] = [];
    try {
      const candidates = await arcgisSearch(q, 7);
      results = candidates.map(arcgisItem);
    } catch (e) { errors.push("ArcGIS: " + String(e).slice(0, 90)); }
    if (!results.length) {
      try {
        const features = await photonSearch(q, 7);
        results = features.map(photonItem).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      } catch (e) { errors.push("Photon: " + String(e).slice(0, 90)); }
    }
    if (!results.length) {
      try {
        const rows = await nominatimSearch(q, 7);
        results = rows.map((x: any) => ({ label: x.display_name, lat: Number(x.lat), lon: Number(x.lon), type: x.type || "address" })).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      } catch (e) { errors.push("Nominatim: " + String(e).slice(0, 90)); }
    }
    const seen = new Set<string>();
    results = results.filter((x: any) => x.label && !seen.has(x.label) && seen.add(x.label));
    return json({ results: results.slice(0, 7), error: results.length ? null : errors.join("; ") || "Pro zadaný text nebyly nalezeny návrhy." });
  }
  if (address.length < 4 || address.length > 240) return json({ error: "Zadej platnou adresu včetně města." }, 400);

  let place: any;
  try { place = await geocode(address); }
  catch (e) { return json({ error: "Adresu se nepodařilo dohledat. Vyber návrh z automatického doplňování nebo doplň město.", detail: String(e).slice(0, 220) }, 422); }

  const lat = Number(place.lat), lon = Number(place.lon), radius = 1000;
  // Reject empty mirror responses so a fast but empty mirror cannot win the race.
  const query = `[out:json][timeout:12];(
    nwr(around:${radius},${lat},${lon})["public_transport"~"platform|stop_position|stop_area"];
    nwr(around:${radius},${lat},${lon})["railway"~"station|halt|tram_stop|subway_entrance|stop"];
    nwr(around:${radius},${lat},${lon})["station"="subway"];
    nwr(around:${radius},${lat},${lon})["highway"="bus_stop"];
    nwr(around:${radius},${lat},${lon})["bus"="yes"];
    nwr(around:${radius},${lat},${lon})["tram"="yes"];
    nwr(around:${radius},${lat},${lon})["amenity"~"school|kindergarten|childcare|hospital|clinic|doctors|dentist|pharmacy|marketplace|library|bank|atm|post_office|restaurant|cafe|fast_food|supermarket|university|college"];
    nwr(around:${radius},${lat},${lon})["education"~"school|kindergarten|preschool|college|university"];
    nwr(around:${radius},${lat},${lon})["building"~"school|kindergarten|college|university"];
    nwr(around:${radius},${lat},${lon})["landuse"="education"];
    nwr(around:${radius},${lat},${lon})["shop"];
    nwr(around:${radius},${lat},${lon})["leisure"~"park|sports_centre|playground|fitness_centre"];
  );out center tags 1000;`;
  const endpoints = ["https://overpass-api.de/api/interpreter"];
  let elements: any[] = [], source = "";
  const overpassErrors: string[] = [];
  for (const endpoint of endpoints) {
    const host = new URL(endpoint).host;
    try {
      const response = await fetch(endpoint + "?data=" + encodeURIComponent(query), {
        method: "GET",
        headers: { ...headers, "Accept": "application/json" },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) throw new Error(host + " HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.elements) || data.elements.length === 0) throw new Error(host + " nevrátil použitelná místa");
      elements = data.elements;
      source = host;
      console.log("Overpass source succeeded", host, "items", elements.length);
      break;
    } catch (error) {
      const message = String(error).replace(/^Error: /, "");
      overpassErrors.push(host + ": " + message.slice(0, 160));
      console.error("Overpass source failed", host, message.slice(0, 160));
    }
  }
  let postpassUsed = false;
  if (!elements.length) {
    try {
      elements = await postpassSearch(lat, lon, radius);
      source = "Postpass / Geofabrik";
      postpassUsed = true;
    } catch (error) {
      overpassErrors.push("Postpass: " + String(error).replace(/^Error: /, "").slice(0, 180));
      console.error("Postpass source failed", String(error).slice(0, 180));
    }
  }
  if (!source) {
    console.error("All OpenStreetMap place-data sources failed", overpassErrors.join(" | ").slice(0, 700));
    return json({
      error: "Adresa byla nalezena, ale mapové zdroje nevrátily použitelná data. Zkus to prosím znovu za chvíli.",
      detail: overpassErrors.join("; ").slice(0, 420),
      address: place.label, lat, lon, radius_m: radius
    }, 503);
  }
  const sourceLabel = postpassUsed ? "OpenStreetMap / Postpass (Geofabrik)" : "OpenStreetMap / " + source;
  const seen = new Set<string>();
  let places = elements.map((e: any) => {
    const t = e.tags || {};
    const plat = Number(e.lat ?? e.center?.lat), plon = Number(e.lon ?? e.center?.lon);
    if (!Number.isFinite(plat) || !Number.isFinite(plon)) return null;
    const key = String(e.type) + ":" + String(e.id);
    if (seen.has(key)) return null;
    seen.add(key);
    const distance = Math.round(haversine(lat, lon, plat, plon));
    if (distance > radius) return null;
    return { name: labelFor(t), category: classify(t), distance_m: distance, lat: plat, lon: plon, tags: { amenity: t.amenity || null, shop: t.shop || null, public_transport: t.public_transport || null, railway: t.railway || null, highway: t.highway || null, station: t.station || null, subway: t.subway || null, bus: t.bus || null, tram: t.tram || null }, osm_type: e.type, osm_id: e.id };
  }).filter(Boolean).sort((a: any, b: any) => a.distance_m - b.distance_m);
  // Merge obvious duplicates from different providers by normalized name and nearby coordinates.
  const uniquePlaces: any[] = [];
  for (const item of places as any[]) {
    const normalizedName = String(item.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const duplicate = normalizedName && normalizedName !== "misto" && uniquePlaces.some((existing: any) => {
      const existingName = String(existing.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return existingName === normalizedName && haversine(existing.lat, existing.lon, item.lat, item.lon) < 90;
    });
    if (!duplicate) uniquePlaces.push(item);
  }
  places = uniquePlaces;
  const count = (cat: string) => places.filter((p: any) => p.category === cat).length;
  const metro = count("Metro"), tram = count("Tramvajové zastávky"), bus = count("Autobusové zastávky"), rail = count("Železniční stanice"), otherTransit = count("Ostatní MHD");
  const transit = metro + tram + bus + rail + otherTransit, shops = count("Obchody"), schools = count("Školy"), kindergartens = count("Školky a péče o děti");
  const health = count("Zdravotnictví"), services = count("Služby"), green = count("Sport a zeleň");
  // Schools and kindergartens are deliberately weighted more heavily than general amenities.
  const score = Math.min(100, Math.round((Math.min(schools, 8)*3 + Math.min(kindergartens, 8)*3 + Math.min(transit, 20)*1 + Math.min(shops, 20)*0.8 + Math.min(health, 8)*1 + Math.min(services, 10)*0.5 + Math.min(green, 8)*0.4)));
  const label = score >= 75 ? "Velmi dobrá vybavenost" : score >= 50 ? "Dobrá vybavenost" : score >= 25 ? "Základní vybavenost" : "Málo evidovaných míst";
  const counts = { transit, metro, tram, bus, rail, otherTransit, shops, schools, kindergartens, education: schools+kindergartens, health, services, green, mapped_objects: places.length };
  const categories = ["Metro","Tramvajové zastávky","Autobusové zastávky","Železniční stanice","Ostatní MHD","Školy","Školky a péče o děti","Obchody","Zdravotnictví","Restaurace a kavárny","Služby","Sport a zeleň","Ostatní služby"].map(name => ({ name, count: places.filter((p: any) => p.category === name).length, places: places.filter((p: any) => p.category === name).slice(0, 80) }));
  const administrative_places = await nearbyAdministrativePlaces(lat,lon);
  return json({
    address: place.label, lat, lon, radius_m: radius, map_source: sourceLabel,
    overpass_available: Boolean(source), counts, score, label, coverage_percent: 100,
    categories, places: places.slice(0, 350), administrative_places,
    limitation: "Školy a školky mají ve skóre vyšší váhu. Metro, tramvajové zastávky, autobusové zastávky a železniční stanice jsou vedeny odděleně. Vzdálenosti jsou přímé, nikoli délka pěší trasy; OpenStreetMap může být neúplná a jízdní řády ani aktuální provoz spojů se neověřují."
  });
});

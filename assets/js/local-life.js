/* Shared helpers for Market Pulse, Events, Relocation Concierge and Seller Command Center.
   Namespace: SC.ll. Depends on site.js + core.js. No storage other than SC.db. */
(function(){
const SC=window.SC; if(!SC) return;
const cache={};
const getJSON=u=>cache[u]||(cache[u]=fetch(u).then(r=>{if(!r.ok) throw new Error(u+' '+r.status); return r.json();}));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ll=SC.ll={
  getJSON,
  pulse:()=>getJSON('assets/data/market-pulse.json'),
  events:()=>getJSON('assets/data/events.json'),
  /* All browseable areas: 52 neighborhoods + 20 cities, de-duplicated by slug */
  areas:()=>cache._areas||(cache._areas=Promise.all([getJSON('assets/data/neighborhoods.json'),getJSON('assets/data/cities.json')]).then(([n,c])=>{
    const hoods=(Array.isArray(n)?n:n.neighborhoods||[]).map(h=>Object.assign({},h,{kind:'neighborhood'}));
    const cities=(Array.isArray(c)?c:c.cities||[]).map(h=>Object.assign({},h,{kind:'city'}));
    const seen=new Set(), out=[];
    for(const h of [...hoods,...cities]){ if(seen.has(h.slug)) continue; seen.add(h.slug); h.lat=+h.lat; h.lng=+h.lng; if(isFinite(h.lat)&&isFinite(h.lng)) out.push(h); }
    return out;})),
  nearest:(areas,lat,lng,n=3)=>areas.map(a=>({a,mi:SC.miles([lat,lng],[a.lat,a.lng])})).sort((x,y)=>x.mi-y.mi).slice(0,n),
  hoodUrl:slug=>'neighborhoods/'+encodeURIComponent(slug)+'/',
  homesUrl:slug=>'search.html?q='+encodeURIComponent(slug),
  ym:s=>{const [y,m]=s.split('-'); return MON[+m-1]+' '+y;},
  ymLong:s=>{const [y,m]=s.split('-'); return MONL[+m-1]+' '+y;},
  date:s=>{const d=new Date(s+'T12:00:00'); return MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();},
  dateShort:s=>{const d=new Date(s+'T12:00:00'); return MON[d.getMonth()]+' '+d.getDate();},
  MON, MONL,
  /* Format a published metric value */
  val:(v,unit)=>v==null?null:unit==='usd'?SC.fmt(v):unit==='pct'?(+v).toFixed(1)+'%':unit==='months'?(+v).toFixed(1)+' mo':unit==='days'?v+' days':Math.round(v).toLocaleString('en-US'),
  /* Map an area (neighborhood/city) to the Canopy area id that publishes its stats. Returns {id, label, scope} */
  pulseAreaFor:(area,pulse)=>{
    const ids=new Set(pulse.areas.map(a=>a.id));
    if(area.kind==='city' && ids.has(area.slug)) return {id:area.slug,scope:'town'};
    if(area.slug==='lake-norman') return {id:'lake-norman',scope:'area'};
    if(area.slug==='union-county') return {id:'union-county',scope:'county'};
    if(area.slug==='mint-hill') return {id:'mint-hill',scope:'town'};
    if(area.kind==='neighborhood' && /charlotte/i.test(area.city||'')) return {id:'city',scope:'city'};
    const c=String(area.county||'').split('/')[0].trim().toLowerCase();
    const cid=c==='mecklenburg'?'mecklenburg':c+'-county';
    if(ids.has(cid)) return {id:cid,scope:'county'};
    return {id:'region',scope:'region'};
  },
  /* Latest published value of a metric for an area: {value,yoy,month,source} or null */
  latest:(pulse,areaId,metric)=>{const s=pulse.series[areaId]; if(!s) return null; const months=Object.keys(s).sort().reverse();
    for(const m of months){const c=s[m]&&s[m][metric]; if(c&&c[0]!=null) return {value:c[0],yoy:c[1],month:m,source:pulse.sources[c[2]]};} return null;},
  areaName:(pulse,id)=>{const a=pulse.areas.find(x=>x.id===id); return a?a.name:id;},
  srcLink:(src,label)=>src?`<a href="${SC.esc(src.url)}" target="_blank" rel="noopener">${SC.esc(label||src.title)}</a>`:'',
  reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
  /* Leaflet map with OSM tiles + attribution */
  map:(el,center,zoom)=>{ if(!window.L) return null; const m=L.map(el,{scrollWheelZoom:false}).setView(center,zoom);
    window.scTiles().addTo(m); return m;},
  dot:(color)=>window.L?L.divIcon({className:'ll-pin',html:`<span style="background:${color}"></span>`,iconSize:[18,18],iconAnchor:[9,9]}):null
};
})();

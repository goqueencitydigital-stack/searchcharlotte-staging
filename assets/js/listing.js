/* Property page: photo mosaic, Home Match, Property X-Ray tabs, tour/question forms. */
(function(){const SC=window.SC; const {D,$,$$,card,esc,short,fmt,track}=SC;
const id=new URLSearchParams(location.search).get('id'); const l=D.listings.find(x=>x.id===id)||D.listings[0];
const h=D.hoods.find(x=>x.slug===l.hood)||{name:l.hoodName,slug:l.hood,blurb:''};
const land=l.type==='Land'; const x=SC.extras(l); const meck=l.city!=='Waxhaw';
const SRC_LISTING='Sample listing data (demo) · Live: Canopy MLS via Showcase IDX, refreshed with each IDX feed update';
const src=(t,period)=>`<p class="xr-src"><span>Source:</span> ${t}${period?` · <span>Updated:</span> ${period}`:''}</p>`;
const dt=s=>new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
document.title=`${l.address}, ${l.city}, NC ${l.zip} | ${fmt(l.price)} | SearchCharlotte.com`;
$('#crumbs').innerHTML=`<a href="index.html">Home</a>›<a href="search.html">Charlotte homes</a>›<a href="search.html?q=${h.slug}">${esc(h.name)}</a>›<span>${esc(l.address)}</span>`;

/* ---------- Photos ---------- */
SC.gallery.mosaic($('#gal'),l); SC.gallery.bind(l);

/* ---------- Header ---------- */
$('#pd-price').textContent=fmt(l.price);
$('#pd-facts').innerHTML=land?`<b>${l.acres}</b> acres · Land`:`<b>${l.beds}</b> bd · <b>${l.baths}</b> ba · <b>${l.sqft.toLocaleString()}</b> sqft`;
$('#pd-addr').textContent=`${l.address}, ${l.city}, NC ${l.zip}`;
const ppsf=SC.ppsf(l);
$('#pd-pills').innerHTML=[['Status',l.status],['Type',l.type],l.year?['Built',l.year]:null,ppsf?['Price/sqft','$'+ppsf]:null,['Lot',l.acres+' acres'],['HOA',l.hoa?'$'+l.hoa+'/mo':'None'],['On market',l.dom+' days']].filter(Boolean).map(([a,b])=>`<span><b>${a}</b>${esc(b)}</span>`).join('')
  +SC.dealSignals(l).filter(s=>s.k!=='dom').map(s=>`<span class="xr-sig"><b>Signal</b>${esc(s.label)}</span>`).join('');
const sv=$('#pd-save'); const upd=()=>{const on=SC.saved().includes(l.id); sv.setAttribute('aria-pressed',on); $('span',sv).textContent=on?'Saved':'Save';}; upd();
sv.addEventListener('click',()=>{SC.toggleSave(l.id); upd();});
$('#pd-share').addEventListener('click',async()=>{track('share_property',{listing_id:l.id}); const url=location.href.split('#')[0]; if(navigator.share){try{await navigator.share({title:l.address,url});}catch(e){}} else {try{await navigator.clipboard.writeText(url); SC.toast('Link copied');}catch(e){SC.toast('Copy the address bar link to share');}}});
const cb=$('#pd-compare'), tb=$('#pd-tourday'); cb.dataset.compare=l.id; tb.dataset.tour=l.id;
const syncT=()=>{const c=SC.compare().includes(l.id), t=SC.tourList().includes(l.id); cb.setAttribute('aria-pressed',c); $('span',cb).textContent=c?'Comparing':'Compare'; tb.setAttribute('aria-pressed',t); $('span',tb).textContent=t?'On Tour Day':'Tour Day';};
syncT(); document.addEventListener('sc:change',e=>{if(['sc_compare','sc_tourlist','*'].includes(e.detail.key)) syncT();});

/* ---------- Home Match ---------- */
SC.matchUI.mount($('#hm-panel'),l);

/* ---------- X-Ray tabs ---------- */
const TABS=['overview','history','costs','location','environment','market']; const inited={};
const tabBtns=TABS.map(t=>$('#xt-'+t));
function select(t,focus,scroll){tabBtns.forEach(b=>{const on=b.id==='xt-'+t; b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1;}); TABS.forEach(k=>$('#xp-'+k).hidden=k!==t);
  if(!inited[t]){inited[t]=true; try{INIT[t]();}catch(e){console.warn(e);}} else if(INIT[t+'Show']) INIT[t+'Show']();
  if(focus) $('#xt-'+t).focus(); const b=$('#xt-'+t); b.scrollIntoView({block:'nearest',inline:'center'});
  if(scroll){const top=$('#xray').getBoundingClientRect().top+scrollY-80; if(scrollY>top) scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  history.replaceState(history.state,'',location.pathname+location.search+(t==='overview'?'':'#xray-'+t)); track('xray_tab',{listing_id:l.id,tab:t});}
$('#xr-tabs').addEventListener('click',e=>{const b=e.target.closest('[role=tab]'); if(b) select(b.id.slice(3),false,true);});
$('#xr-tabs').addEventListener('keydown',e=>{const i=tabBtns.indexOf(document.activeElement); if(i<0) return; let j=null;
  if(e.key==='ArrowRight') j=(i+1)%TABS.length; if(e.key==='ArrowLeft') j=(i-1+TABS.length)%TABS.length; if(e.key==='Home') j=0; if(e.key==='End') j=TABS.length-1;
  if(j!=null){e.preventDefault(); select(TABS[j],true,false);}});

const INIT={};
/* Overview */
INIT.overview=()=>{const el=$('#xp-overview');
  const rows=[['Property type',l.type],['Status',l.status],['Neighborhood',h.name],['City',l.city],['ZIP',l.zip],!land&&['Bedrooms',l.beds],!land&&['Bathrooms',l.baths],!land&&['Living area',l.sqft.toLocaleString()+' sq ft'],['Lot size',l.acres+' acres'],l.year&&['Year built',l.year],!land&&['Style',x.style+' (demo)'],!land&&['Stories',x.stories+' (demo)'],!land&&['Garage',l.garage?l.garage+' spaces':'None listed'],!land&&['Pool',l.pool?'Yes':'No'],['Waterfront',l.waterfront?'Yes':'No'],['HOA dues',l.hoa?'$'+l.hoa+'/month':'None listed'],ppsf&&['Price per sq ft','$'+ppsf],['Est. annual property tax','<span data-esttax>Calculating…</span>'],['MLS #',l.id+' (sample)']].filter(Boolean);
  const sys=land?'':`<h3 class="xr-h3">Systems &amp; permits</h3><dl class="facts-grid">
     <div><dt>Roof year</dt><dd>${x.roofYear?x.roofYear+' (demo)':'Not provided in listing'}</dd></div>
     <div><dt>HVAC year</dt><dd>${x.hvacYear?x.hvacYear+' (demo)':'Not provided in listing'}</dd></div></dl>
     <div class="xr-note"><b>Permit history</b>${meck?`Permit history: available via Mecklenburg County Accela/Code Enforcement at launch. Until then you can search the address yourself in <a href="https://aca-prod.accela.com/MECKLENBURG/Cap/CapHome.aspx?module=Building&amp;TabName=Building" target="_blank" rel="noopener">Mecklenburg County Code Enforcement: AccelaMeck</a> (<a href="https://code.mecknc.gov/customer-tools/aca" target="_blank" rel="noopener">how to search</a>).`:`Permit history: available via the Union County permit portal at launch. No permits are shown or inferred in this preview.`} We never display permits that aren't in an official record.</div>`;
  el.innerHTML=`<h3 class="xr-h3">About this home</h3><p class="xr-p">Sample property description. On the live site this section shows the listing agent's public remarks exactly as provided through Canopy MLS. This sample ${land?'parcel':l.type.toLowerCase()} is placed in ${esc(h.name)} for layout review only.</p>
    <h3 class="xr-h3">Facts</h3><dl class="facts-grid">${rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${typeof b==='string'&&b.startsWith('<span')?b:esc(b)}</dd></div>`).join('')}</dl>
    ${!land&&x.features.length?`<h3 class="xr-h3">Listed features <small>(demo)</small></h3><div class="chips xr-feats">${x.features.map(f=>`<span class="chip">${esc(f)}</span>`).join('')}</div>`:''}
    ${sys}
    <p class="form-note" style="margin-top:14px"><a href="neighborhood.html?n=${h.slug}" style="text-decoration:underline">Explore ${esc(h.name)}</a> · <a href="search.html?q=${h.slug}" style="text-decoration:underline">All homes for sale in ${esc(h.name)}</a></p>
    <p class="form-note">Sample listing for design review. Live listings display the listing brokerage, Canopy MLS number, last-updated time and the required IDX disclaimer here, supplied by Showcase IDX.</p>
    ${src(SRC_LISTING,'with each MLS feed refresh; tax estimate uses FY2027 rates (set each July 1)')}`;
  SC.costAssumptions.then(A=>{const e=$('[data-esttax]'); if(!e) return; if(!A){e.textContent='Unavailable'; return;} const j=SC.intel.jur(l,A); e.innerHTML=`${fmt(l.price*j.per100/100)}/yr <small class="xr-est">estimate · ${j.per100} per $100 of list price</small>`;});};
/* History */
INIT.history=()=>{const el=$('#xp-history'); const H=x.history; const orig=x.originalPrice; const chg=l.price-orig;
  const pts=H.map(e=>({t:new Date(e.date).getTime(),p:e.price,e})); const W=640,Ht=200,P=34;
  const t0=Math.min(...pts.map(p=>p.t)), t1=Math.max(new Date('2026-10-28').getTime(),...pts.map(p=>p.t)); const pmin=Math.min(...pts.map(p=>p.p))*0.96, pmax=Math.max(...pts.map(p=>p.p))*1.03;
  const X=t=>P+(t1===t0?0:(t-t0)/(t1-t0))*(W-2*P), Y=p=>Ht-P-(p-pmin)/(pmax-pmin||1)*(Ht-2*P);
  let d=''; pts.forEach((q,i)=>{d+=i?` H${X(q.t).toFixed(1)} V${Y(q.p).toFixed(1)}`:`M${X(q.t).toFixed(1)} ${Y(q.p).toFixed(1)}`;}); d+=` H${X(t1).toFixed(1)}`;
  const chart=`<svg class="xr-chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Price history chart (demo data): ${esc(H.map(e=>e.event+' '+dt(e.date)+' '+fmt(e.price)).join('; '))}">
    ${[0,1,2,3].map(i=>{const v=pmin+(pmax-pmin)*i/3; return `<line x1="${P}" x2="${W-P}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${P-4}" y="${Y(v)+4}" text-anchor="end" class="ax">${short(v)}</text>`;}).join('')}
    <path d="${d}" class="ln"/>${pts.map(q=>`<circle cx="${X(q.t)}" cy="${Y(q.p)}" r="5" class="pt ${/Price/.test(q.e.event)?'cut':/Sold/.test(q.e.event)?'sold':''}"><title>${esc(q.e.event)} · ${dt(q.e.date)} · ${fmt(q.e.price)}</title></circle>`).join('')}
    <text x="${P}" y="${Ht-8}" class="ax">${new Date(t0).getFullYear()}</text><text x="${W-P}" y="${Ht-8}" text-anchor="end" class="ax">Today</text></svg>`;
  el.innerHTML=`<div class="xr-demo">Demo price &amp; status history, generated for this sample listing. Live history from Canopy MLS via Showcase IDX at launch.</div>
   <div class="xr-stats"><div><span>Listed</span><b>${dt(x.listed)}</b></div><div><span>Days on market</span><b>${l.dom}</b></div><div><span>Original list price</span><b>${fmt(orig)}</b></div><div><span>Price changes</span><b>${x.priceCuts}</b></div><div><span>Change vs. original</span><b class="${chg<0?'neg':''}">${chg?(chg<0?'−':'+')+fmt(Math.abs(chg)).slice(1).replace(/^/,'$')+` (${(chg/orig*100).toFixed(1)}%)`:'No change'}</b></div>${x.backOnMarket?'<div><span>Status</span><b>Back on market</b></div>':''}</div>
   <div class="xr-chartwrap">${chart}<div class="xr-key"><span><i class="k1"></i>List / status</span><span><i class="k2"></i>Price change</span><span><i class="k3"></i>Prior sale</span></div></div>
   <div class="table-wrap"><table class="mkt-table xr-table"><thead><tr><th scope="col">Date</th><th scope="col">Event</th><th scope="col">Price</th><th scope="col">Change</th></tr></thead><tbody>${[...H].reverse().map(e=>`<tr><td>${dt(e.date)}</td><td>${esc(e.event)}</td><td>${fmt(e.price)}</td><td>${e.from?`<span class="neg">−${fmt(e.from-e.price).slice(1).replace(/^/,'$')}</span> from ${short(e.from)}`:'N/A'}</td></tr>`).join('')}</tbody></table></div>
   ${src('Demo history derived from sample listing (SC.extras) · Live: Canopy MLS listing history and public sale records','with each MLS feed refresh')}`;};
/* Costs */
INIT.costs=()=>{SC.costUI.mount($('#calculator'),l);};
/* Location */
let locMap=null;
INIT.location=async()=>{const el=$('#xp-location');
  el.innerHTML=`<div class="xr-loc-top"><h3 class="xr-h3">What's nearby</h3><p class="form-note">Straight-line distances from the sample pin. Place data © OpenStreetMap contributors.</p></div>
   <div class="xr-amen" data-amen><p class="form-note">Loading nearby places…</p></div>
   <div class="xr-mapbox"><div class="chips xr-cat-tog" role="group" aria-label="Show categories on map" data-tog></div><div class="xr-map" id="xr-map" role="region" aria-label="Map of places near ${esc(l.address)}"></div></div>
   <div class="xr-lists" data-lists></div>
   <h3 class="xr-h3" id="commute-h">Commute estimates</h3>
   <div class="xr-commute"><div class="table-wrap"><table class="mkt-table"><thead><tr><th scope="col">Destination</th><th scope="col">Distance</th><th scope="col">Drive (estimate)</th></tr></thead><tbody data-cm></tbody></table></div>
    <form class="xr-dest" data-dest-form><label for="xr-dest-in">Custom destination</label><div class="xr-dest-row"><input id="xr-dest-in" list="xr-dest-list" placeholder="Pick a landmark or type a place name" autocomplete="off"><datalist id="xr-dest-list"></datalist><button class="btn btn-sm" type="submit">Estimate</button></div><p class="xr-dest-out" aria-live="polite" data-dest-out></p></form></div>
   ${src('OpenStreetMap contributors (ODbL), extract dated 2026-10-28 · Drive times: estimate (straight-line × 1.35 at 30 mph ≤10 mi, 45 mph beyond, +3 min)','place data refreshed monthly at launch; live traffic-aware times via Google Maps Routes API at launch')}`;
  const cm=SC.LANDMARKS.map(m=>({m,d:SC.drive([l.lat,l.lng],[m.lat,m.lng])})).sort((a,b)=>a.d.minutes-b.d.minutes);
  $('[data-cm]',el).innerHTML=cm.map(({m,d})=>`<tr><td>${esc(m.name)}</td><td>${d.miles} mi</td><td>~${d.minutes} min</td></tr>`).join('');
  const [amen,P]=await Promise.all([SC.amenities,SC.poi.near(l.lat,l.lng,1.5)]); const a=(amen||{})[l.id]||{};
  const cats=Object.keys(SC.POI_CATS);
  $('[data-amen]',el).innerHTML=Object.keys(a).length?`<div class="xr-amen-grid">${cats.filter(c=>a[c]).map(c=>`<div class="xr-amen-c"><b>${a[c][0]}</b><span>${esc(SC.POI_CATS[c])}</span><small>within 1 mi${a[c][2]!=null?` · nearest ${a[c][2]} mi`:''}</small></div>`).join('')}</div>`:'<p class="form-note">Amenity counts aren\'t available for this home yet.</p>';
  const groups={}; P.forEach(p=>(groups[p.cat]=groups[p.cat]||[]).push(p));
  const COL={restaurants:'#B5532F',cafes:'#8A5A3B',bars:'#7A3E6E',grocery:'#2E7D4F',parks:'#3F7D3A',trails:'#5E8C52',venues:'#4A2445',shopping:'#C99A4B',golf:'#6B8E23',water:'#2F6E9E',fitness:'#A0522D',transit:'#1E5AA8',health:'#B3261E',schools:'#5A3D2B',services:'#5E5953'};
  const present=cats.filter(c=>groups[c]); const on=new Set(present.filter(c=>['restaurants','grocery','parks','shopping','transit','trails'].includes(c)));
  $('[data-lists]',el).innerHTML=present.length?present.map(c=>`<div class="xr-list"><h4><i style="background:${COL[c]}"></i>${esc(SC.POI_CATS[c])} <small>${groups[c].length} within 1.5 mi</small></h4><ul>${groups[c].slice(0,5).map(p=>`<li><span>${esc(p.name)}${p.sub?` <small>${esc(p.sub)}</small>`:''}</span><b>${p.mi} mi</b></li>`).join('')}</ul></div>`).join(''):`<div class="empty"><h3>No mapped places within 1.5 miles</h3><p>OpenStreetMap has no places recorded here yet for these categories.</p></div>`;
  $('[data-tog]',el).innerHTML=present.map(c=>`<button type="button" class="chip" data-cat="${c}" aria-pressed="${on.has(c)}"><i style="background:${COL[c]}"></i>${esc(SC.POI_CATS[c])}</button>`).join('');
  const L=window.L; locMap=L.map('xr-map',{scrollWheelZoom:false}).setView([l.lat,l.lng],14);
  window.scTiles().addTo(locMap);
  L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null}),title:l.address,zIndexOffset:1000}).addTo(locMap);
  const layers={}; present.forEach(c=>{layers[c]=L.layerGroup(groups[c].slice(0,40).map(p=>L.circleMarker([p.lat,p.lng],{radius:6,color:'#fff',weight:1.5,fillColor:COL[c],fillOpacity:.95}).bindTooltip(`${esc(p.name)} · ${p.mi} mi`))); if(on.has(c)) layers[c].addTo(locMap);});
  $('[data-tog]',el).addEventListener('click',e=>{const b=e.target.closest('[data-cat]'); if(!b) return; const c=b.dataset.cat, v=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',v); v?layers[c].addTo(locMap):locMap.removeLayer(layers[c]);});
  /* custom destination: landmarks + POIs within 15 mi */
  const far=await SC.poi.near(l.lat,l.lng,15,['grocery','shopping','venues','parks','health','schools','fitness','transit','golf','water']);
  const opts=[...SC.LANDMARKS.map(m=>({n:m.name,lat:m.lat,lng:m.lng})),...far.filter(p=>p.name).slice(0,1500).map(p=>({n:`${p.name} (${SC.POI_CATS[p.cat]})`,lat:p.lat,lng:p.lng}))];
  const seen=new Set(); const uniq=opts.filter(o=>!seen.has(o.n)&&seen.add(o.n));
  $('#xr-dest-list').innerHTML=uniq.map(o=>`<option value="${esc(o.n)}">`).join('');
  $('[data-dest-form]',el).addEventListener('submit',e=>{e.preventDefault(); const v=$('#xr-dest-in').value.trim().toLowerCase(); const out=$('[data-dest-out]',el); if(!v){out.textContent='Choose a destination from the list.'; return;}
    const o=uniq.find(q=>q.n.toLowerCase()===v)||uniq.find(q=>q.n.toLowerCase().includes(v));
    if(!o){out.textContent='No match in our landmark and OpenStreetMap place list. Try a nearby landmark or store name.'; return;}
    const d=SC.drive([l.lat,l.lng],[o.lat,o.lng]); out.innerHTML=`<b>${esc(o.n)}</b>: about ${d.miles} mi, ~${d.minutes} min drive (estimate). <button type="button" class="xr-link" data-set-commute>Use as my Home Match commute</button>`;
    out.querySelector('[data-set-commute]').onclick=()=>{const c=SC.prefs().commute; SC.setPrefs({commute:{id:'custom',lat:o.lat,lng:o.lng,label:o.n,maxMin:(c&&c.maxMin)||30}}); SC.toast('Commute destination saved to Home Match');};
    track('commute_custom',{listing_id:l.id});});};
INIT.locationShow=()=>locMap&&setTimeout(()=>locMap.invalidateSize(),30);
/* Environment */
let envMap=null;
INIT.environment=()=>{const el=$('#xp-environment'); const addr=`${l.address}, ${l.city}, NC ${l.zip}`;
  el.innerHTML=`<h3 class="xr-h3">Flood hazard (FEMA)</h3>
   <div class="xr-zone" data-zone aria-live="polite"><p class="form-note">Checking FEMA's National Flood Hazard Layer at this location…</p></div>
   <div class="xr-mapbox"><div class="xr-env-ctl"><label><input type="checkbox" checked data-fema> FEMA flood hazard zones</label><label class="xr-op">Opacity <input type="range" min="0.2" max="1" step="0.1" value="0.5" data-op aria-label="Flood layer opacity"></label></div>
    <div class="xr-map" id="xr-env-map" role="region" aria-label="Flood hazard map near ${esc(l.address)}"></div>
    <div class="xr-legend"><span><i class="z1"></i>1% annual chance flood hazard, Special Flood Hazard Area (Zones A, AE, AO)</span><span><i class="z3"></i>Regulatory floodway (within the SFHA)</span><span><i class="z2"></i>0.2% annual chance flood hazard (shaded Zone X)</span><span><i class="z4"></i>Zone X: minimal hazard (unshaded)</span></div>
    <p class="form-note">Zones are drawn live from FEMA's NFHL map service at zoom 11 and closer (colors set by SearchCharlotte for readability). Zoom out to see nearby creeks and floodplains.</p></div>
   <div class="xr-links">
    <a class="xr-lk" href="https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(addr)}" target="_blank" rel="noopener"><b>FEMA Flood Map Service Center</b><span>Official flood maps (FIRMs) for this address</span></a>
    ${meck?`<a class="xr-lk" href="https://www.charlottenc.gov/Services/Stormwater/Flood-Preparedness-and-Mitigation/Flooding-and-Maps" target="_blank" rel="noopener"><b>Charlotte-Mecklenburg Storm Water Services</b><span>Floodplain maps, including FEMA and Community (future-conditions) floodplains · 704-432-RAIN</span></a>
    <a class="xr-lk" href="https://gis.mecklenburgcountync.gov/3dfz/" target="_blank" rel="noopener"><b>Mecklenburg 3D Interactive Floodzone Map</b><span>Look up floodplain and flood-risk details by parcel</span></a>
    <a class="xr-lk" href="https://polaris3g.mecklenburgcountync.gov/" target="_blank" rel="noopener"><b>Polaris 3G (Mecklenburg County GIS)</b><span>Parcel, zoning and environmental layers</span></a>`:`<a class="xr-lk" href="https://hazards.fema.gov/femaportal/wps/portal/NFHLWMS" target="_blank" rel="noopener"><b>FEMA NFHL map services</b><span>Union County flood hazard data is published through FEMA's NFHL</span></a>`}
   </div>
   <div class="xr-disc"><b>Important.</b> Flood maps show modeled hazard areas, not whether a specific structure has flooded or will flood. They don't replace a home inspection, a survey or elevation certificate, a flood insurance quote, or legal due diligence. Lenders require flood insurance for federally backed mortgages on structures in a Special Flood Hazard Area; anyone can buy it outside one. Pins in this preview are sample locations.</div>
   ${src('<a href="https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer" target="_blank" rel="noopener">FEMA National Flood Hazard Layer (NFHL) map service</a>, queried live','as FEMA publishes map revisions (LOMRs and new FIRMs)')}`;
  const L=window.L; envMap=L.map('xr-env-map',{scrollWheelZoom:false}).setView([l.lat,l.lng],15);
  window.scTiles().addTo(envMap);
  const fz=SC.intel.femaLayer(); fz.addTo(envMap);
  L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null}),title:l.address}).addTo(envMap);
  $('[data-fema]',el).addEventListener('change',e=>e.target.checked?fz.addTo(envMap):envMap.removeLayer(fz));
  $('[data-op]',el).addEventListener('input',e=>fz.setOpacity(+e.target.value));
  SC.intel.femaZone(l.lat,l.lng).then(z=>{const b=$('[data-zone]',el);
    if(!z){b.innerHTML='<p class="form-note">FEMA\'s service didn\'t respond. Use the Flood Map Service Center link below.</p>'; return;}
    if(!z.zone){b.innerHTML='<p class="form-note">No mapped FEMA flood zone was returned for this point.</p>'; return;}
    b.innerHTML=`<div class="xr-zone-card ${z.sfha?'sfha':''}"><span class="eyebrow">FEMA zone at the sample pin</span><b>Zone ${esc(z.zone)}</b><span>${esc((z.subtype||'').toLowerCase().replace(/^\w/,c=>c.toUpperCase())||(z.sfha?'Special Flood Hazard Area':''))}</span><small>${z.sfha?'Inside a Special Flood Hazard Area (1% annual chance).':'Outside the Special Flood Hazard Area per FEMA NFHL.'} Panel set ${esc(z.panel||'')}. Confirm with the official FIRM and an elevation certificate.</small></div>`;
    track('flood_zone_view',{listing_id:l.id,zone:z.zone});});};
INIT.environmentShow=()=>envMap&&setTimeout(()=>envMap.invalidateSize(),30);
/* Market */
INIT.market=async()=>{const el=$('#xp-market'); const M=await fetch('assets/data/market-insights.json').then(r=>r.ok?r.json():null).catch(()=>null);
  const geos=l.city==='Charlotte'?['City of Charlotte','Mecklenburg County','Charlotte Region']:meck?['Mecklenburg County','Charlotte Region']:['Charlotte Region'];
  const met=M?M.metrics.filter(m=>geos.some(g=>m.geography.startsWith(g))):[];
  const gi=m=>geos.findIndex(g=>m.geography.startsWith(g)); const seen=new Set(); const pick=[...met].sort((a,b)=>gi(a)-gi(b)).filter(m=>{const k=m.metric+'|'+gi(m); if(m.metric==='Median sales price'&&gi(m)===geos.length-1&&seen.has(k)) return false; seen.add(k); return true;}).slice(0,8);
  const comps=D.listings.filter(c=>c.id!==l.id&&c.hood===l.hood&&c.type===l.type&&(!l.sqft||(c.sqft>=l.sqft*.75&&c.sqft<=l.sqft*1.25)));
  const med=a=>{const s=[...a].sort((p,q)=>p-q); return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:null;};
  const cm=med(comps.filter(c=>c.sqft).map(SC.ppsf));
  const near=D.listings.filter(c=>c.id!==l.id&&c.status==='Active').map(c=>({c,mi:SC.miles([l.lat,l.lng],[c.lat,c.lng])})).filter(o=>o.mi<=3).sort((a,b)=>a.mi-b.mi).slice(0,4);
  el.innerHTML=`<h3 class="xr-h3">Market trend <small>(${esc(geos[0])}${geos.length>1?' and wider area':''})</small></h3>
   ${pick.length?`<div class="xr-mkt">${pick.map(m=>`<div class="xr-mkt-c"><span>${esc(m.metric)}</span><b class="${m.display.length>14?'sm':''}">${esc(m.display)}</b><em class="${/^-/.test(m.change||'')?'neg':''}">${esc(m.change||'')}</em><small>${esc(m.geography)} · ${esc(m.period)}</small><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.source)}</a></div>`).join('')}</div>
    <p class="form-note">${esc(M.disclaimer)} Neighborhood-level figures aren't published in these reports, so county, city and regional figures are shown.</p>`:'<p class="form-note">Market report data unavailable.</p>'}
   ${M?src(`Canopy Realtors / Canopy MLS market reports, retrieved ${esc(M.retrieved)}`,'monthly (Canopy monthly report) and weekly (Canopy weekly market activity)'):''}
   <h3 class="xr-h3">Comparable sample listings</h3>
   <p class="xr-demo">Sample comps: live comps from Canopy MLS closed sales at launch. Criteria: same neighborhood (${esc(h.name)}), same home type (${esc(l.type)})${l.sqft?', living area within ±25%':''}. These are asking prices of other sample listings, not closed sales or an appraisal.</p>
   ${comps.length?`<div class="table-wrap"><table class="mkt-table xr-table"><thead><tr><th scope="col">Address</th><th scope="col">List price</th><th scope="col">$/sq ft</th><th scope="col">Beds/baths</th><th scope="col">Sq ft</th><th scope="col">DOM</th></tr></thead><tbody><tr class="is-this"><td>This home</td><td>${fmt(l.price)}</td><td>${ppsf?'$'+ppsf:'N/A'}</td><td>${land?'N/A':l.beds+' / '+l.baths}</td><td>${l.sqft?l.sqft.toLocaleString():'N/A'}</td><td>${l.dom}</td></tr>${comps.map(c=>`<tr><td><a href="listing.html?id=${c.id}">${esc(c.address)}</a></td><td>${fmt(c.price)}</td><td>${c.sqft?'$'+SC.ppsf(c):'N/A'}</td><td>${c.type==='Land'?'N/A':c.beds+' / '+c.baths}</td><td>${c.sqft?c.sqft.toLocaleString():'N/A'}</td><td>${c.dom}</td></tr>`).join('')}</tbody></table></div>
    ${cm&&ppsf?`<p class="xr-p">This home's asking $/sq ft is <b>$${ppsf}</b> vs. a median of <b>$${Math.round(cm)}</b> across ${comps.length} sample comp${comps.length>1?'s':''}, a simple asking-price comparison, not a valuation.</p>`:''}`:`<div class="empty"><h3>No sample comps match these criteria</h3><p>At launch, closed sales from Canopy MLS will be used.</p></div>`}
   ${src(SRC_LISTING,'with each MLS feed refresh')}
   <h3 class="xr-h3">Active sample listings within 3 miles</h3>
   ${near.length?`<div class="cards cards-2 xr-near">${near.map(o=>card(o.c)).join('')}</div>`:'<p class="form-note">No other active sample listings within 3 miles.</p>'}
   ${src(SRC_LISTING,'with each MLS feed refresh')}`;};

/* initial tab from hash */
const fromHash=()=>{const hs=location.hash; const m=/^#xray-(\w+)/.exec(hs); const t=m&&TABS.includes(m[1])?m[1]:(hs==='#true-cost'||hs==='#calculator')?'costs':null; return t;};
const t0=fromHash(); select(t0||'overview',false,false); if(t0) setTimeout(()=>$('#xray').scrollIntoView(),50);
addEventListener('hashchange',()=>{const t=fromHash(); if(t){select(t,false,false); $('#xray').scrollIntoView({behavior:'smooth'});}});
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#true-cost"],a[href="#calculator"]'); if(a){e.preventDefault(); select('costs',false,false); $('#xray').scrollIntoView({behavior:'smooth'});}});

/* ---------- Ask about this home ---------- */
const askMount=()=>{if(SC.askHome&&SC.askHome.mount&&!askMount.done){askMount.done=1; SC.askHome.mount(document.getElementById('ask-home'),l);}};
askMount(); addEventListener('load',askMount);

/* ---------- Lead forms ---------- */
$$('form[data-lead]').forEach(f=>{f.dataset.listing=l.id; f.insertAdjacentHTML('afterbegin',`<input type="hidden" name="listing_id" value="${l.id}"><input type="hidden" name="listing_address" value="${esc(l.address)}"><input type="hidden" name="listing_price" value="${l.price}">`);});
$('#aq-msg').value=`I'd like more information about ${l.address}.`;
$$('.lead-card .tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.lead-card .tabs button').forEach(x=>{x.setAttribute('aria-selected',x===b); $('#'+x.dataset.tab).hidden=x!==b;});}));
const days=[]; const d0=new Date(); for(let i=1;days.length<7;i++){const d=new Date(d0); d.setDate(d0.getDate()+i); days.push(d);}
$('#days').innerHTML=days.map((d,i)=>`<button type="button" aria-pressed="${i===0}" data-d="${d.toISOString().slice(0,10)}">${d.toLocaleDateString('en-US',{weekday:'short'})}<b>${d.getDate()}</b>${d.toLocaleDateString('en-US',{month:'short'})}</button>`).join('');
const tf=$('#t-tour'); tf.insertAdjacentHTML('afterbegin','<input type="hidden" name="tour_date" value="'+days[0].toISOString().slice(0,10)+'"><input type="hidden" name="tour_type" value="in_person">');
$('#days').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; $$('#days button').forEach(x=>x.setAttribute('aria-pressed',x===b)); tf.querySelector('[name=tour_date]').value=b.dataset.d;});
$$('[data-tour-mode] button').forEach((b,i)=>b.addEventListener('click',()=>{$$('[data-tour-mode] button').forEach(x=>x.setAttribute('aria-pressed',x===b)); tf.querySelector('[name=tour_type]').value=i?'video':'in_person';}));
/* similar */
const sim=D.listings.filter(c=>c.id!==l.id&&c.status!=='Under Contract').map(c=>({c,s:(c.hood===l.hood?0:1)+Math.abs(c.price-l.price)/l.price})).sort((a,b)=>a.s-b.s).slice(0,4).map(o=>o.c);
$('#similar').innerHTML=sim.map(card).join('');
track('view_property',{listing_id:l.id,price:l.price,neighborhood:h.slug});
})();

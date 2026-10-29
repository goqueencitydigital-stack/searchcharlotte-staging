/* Search Charlotte — shared platform core (loaded on every page after site.js).
   Everything here is deterministic and transparent. Listing "extras" (style, history, features)
   are DEMO values derived from the sample listings, flagged with demo:true, and replaced by
   Showcase IDX / Canopy MLS fields at launch. */
(function(){'use strict';
const SC=window.SC, {D,$,$$,esc,fmt,short,track}=SC;

/* ---------- Storage (preview: window.name for this tab; production: Passport account API) ---------- */
const read=()=>{try{const o=JSON.parse(window.name||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}};
SC.db={
  get(k,def){const v=read()[k]; return v===undefined?def:v;},
  set(k,v){const o=read(); o[k]=v; try{window.name=JSON.stringify(o)}catch(e){} document.dispatchEvent(new CustomEvent('sc:change',{detail:{key:k,value:v}})); return v;},
  update(k,def,fn){return SC.db.set(k,fn(SC.db.get(k,def)));},
  wipe(){const o=read(); Object.keys(o).filter(k=>k.startsWith('sc_')).forEach(k=>delete o[k]); window.name=JSON.stringify(o); document.dispatchEvent(new CustomEvent('sc:change',{detail:{key:'*'}}));},
  dump(){const o=read(), out={}; Object.keys(o).filter(k=>k.startsWith('sc_')).forEach(k=>out[k]=o[k]); return out;}
};
/* keys used: sc_saved (site.js), sc_user, sc_prefs, sc_searches, sc_alerts, sc_notifs, sc_tours, sc_compare,
   sc_party, sc_lifestyle, sc_budget, sc_hoods, sc_notes, sc_ratings, sc_chat, sc_reloc, sc_seller, sc_investor */
SC.user=()=>SC.db.get('sc_user',null);
SC.personalized=()=>{const u=SC.user(); return !!(u&&u.consent&&u.consent.personalize);};
SC.notify=(title,body,href)=>{SC.db.update('sc_notifs',[],a=>[{id:Date.now()+''+Math.random().toString(36).slice(2,6),title,body,href:href||'',ts:new Date().toISOString(),read:false},...a].slice(0,100));};

/* ---------- Deterministic demo enrichment ---------- */
const hash=s=>{let h=2166136261; for(const c of String(s)){h^=c.charCodeAt(0); h=Math.imul(h,16777619);} return h>>>0;};
const pick=(arr,seed)=>arr[seed%arr.length];
const STYLES={'Single Family':['Traditional','Craftsman','Modern Farmhouse','Transitional','Colonial','Ranch','Contemporary','Tudor'],'Townhouse':['Contemporary','Transitional','Traditional','Modern'],'Condo':['High-rise','Mid-rise','Loft','Garden-style'],'Land':['Lot']};
const FEATS=['Fenced backyard','Screened porch','Primary on main','Hardwood floors','Quartz counters','Gas range','Walk-in pantry','Covered patio','Finished basement','Bonus room','Fireplace','Smart thermostat','Tankless water heater','Irrigation system','EV-ready garage','Deck','Mudroom','Home office'];
SC.extras=l=>{if(l._x) return l._x; const h=hash(l.id); const today=new Date('2026-10-28');
  const listed=new Date(today-l.dom*864e5);
  const feats=FEATS.filter((f,i)=>((h>>(i%24))&1)&&(l.type!=='Condo'||!/yard|basement|irrigation|Deck/.test(f))).slice(0,7);
  const hist=[]; let p=l.price;
  if(l.flag==='Price Reduced'){const cuts=1+(h%2); for(let i=cuts;i>=1;i--){const d=new Date(today-Math.round(l.dom*i/(cuts+1))*864e5); const prev=Math.round(p*(1+0.02+((h>>i)%3)/100)/1000)*1000; hist.unshift({date:d.toISOString().slice(0,10),event:'Price change',price:p,from:prev}); p=prev;}}
  hist.unshift({date:listed.toISOString().slice(0,10),event:'Listed for sale',price:p});
  const backOnMarket=l.flag!=='Price Reduced'&&l.dom>30&&h%5===0;
  if(backOnMarket){hist.splice(1,0,{date:new Date(listed.getTime()+10*864e5).toISOString().slice(0,10),event:'Pending',price:p},{date:new Date(listed.getTime()+24*864e5).toISOString().slice(0,10),event:'Back on market',price:p});}
  const priorYear=2008+(h%14); const prior=l.flag==='New Construction'||l.year>=2024?null:{date:priorYear+'-0'+(1+h%9)+'-15',event:'Sold (prior sale)',price:Math.round(l.price*Math.pow(0.955,2026-priorYear)/1000)*1000};
  if(prior) hist.unshift(prior);
  l._x={demo:true,style:pick(STYLES[l.type]||['Traditional'],h),features:feats,listed:listed.toISOString().slice(0,10),
    history:hist,priceCuts:hist.filter(x=>x.event==='Price change').length,backOnMarket,
    originalPrice:hist.find(x=>x.event==='Listed for sale').price,
    roofYear:(h%3===0)?null:Math.max(l.year,2026-(h%22)),hvacYear:(h%4===0)?null:Math.max(l.year,2026-(h%15)),
    fenced:feats.includes('Fenced backyard'),stories:l.type==='Condo'?1:1+(h%3?1:0),
    incentive:l.flag==='New Construction'&&h%2===0?'Builder incentive advertised in listing remarks (demo) — confirm terms with the builder':null,
    openHouse:/Open House/.test(l.flag||'')?l.flag.replace('Open House ',''):null};
  return l._x;};
SC.listing=id=>D.listings.find(l=>l.id===String(id));
SC.ppsf=l=>l.sqft?Math.round(l.price/l.sqft):null;

/* ---------- Geography & drive-time estimates ---------- */
SC.miles=(a,b)=>{const R=3958.8,r=Math.PI/180,dl=(b[0]-a[0])*r,dg=(b[1]-a[1])*r,h=Math.sin(dl/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dg/2)**2; return 2*R*Math.asin(Math.sqrt(h));};
/* Straight-line distance × 1.35 road-circuity factor at an assumed 30 mph average (urban arterial) / 45 mph beyond 10 mi.
   Labeled "estimate" everywhere. Launch: Google Maps Platform Routes API (traffic-aware). */
SC.drive=(a,b)=>{const m=SC.miles(a,b)*1.35; const min=m<=10?m/30*60:(10/30*60+(m-10)/45*60); return {miles:+m.toFixed(1),minutes:Math.max(2,Math.round(min+3)),method:'estimate'};};
SC.LANDMARKS=[
  {id:'uptown',name:'Uptown Charlotte (Trade & Tryon)',lat:35.2272,lng:-80.8431},
  {id:'southpark-mall',name:'SouthPark Mall',lat:35.1531,lng:-80.8317},
  {id:'clt',name:'Charlotte Douglas Airport (CLT)',lat:35.2140,lng:-80.9431},
  {id:'ballantyne',name:'Ballantyne Corporate Place',lat:35.0544,lng:-80.8489},
  {id:'south-end',name:'South End (Atherton Mill)',lat:35.2085,lng:-80.8597},
  {id:'unc-charlotte',name:'UNC Charlotte',lat:35.3071,lng:-80.7352},
  {id:'university-research-park',name:'University Research Park',lat:35.3256,lng:-80.7594},
  {id:'atrium-cmc',name:'Atrium Health Carolinas Medical Center',lat:35.2056,lng:-80.8384},
  {id:'novant-presbyterian',name:'Novant Health Presbyterian Medical Center',lat:35.2117,lng:-80.8279},
  {id:'lake-norman',name:'Lake Norman (Davidson waterfront)',lat:35.4993,lng:-80.8487},
  {id:'fort-mill',name:'Downtown Fort Mill',lat:35.0074,lng:-80.9451},
  {id:'concord-mills',name:'Concord Mills',lat:35.3681,lng:-80.7236}];
SC.lmk=id=>SC.LANDMARKS.find(x=>x.id===id);

/* ---------- Points of interest (OpenStreetMap, ODbL) ---------- */
/* assets/data/poi/<cell>.json tiles of 0.1°; each POI: [name, cat, sub, lat, lng, extra?]. Built by tools/build_pois.py. */
SC.POI_CATS={restaurants:'Restaurants',cafes:'Coffee & bakeries',bars:'Bars & breweries',grocery:'Grocery & markets',parks:'Parks & nature',trails:'Greenways & trails',venues:'Music, arts & attractions',shopping:'Shopping',golf:'Golf courses',water:'Lakes, marinas & boating',fitness:'Gyms & recreation',transit:'Light rail & transit',health:'Health care',schools:'Schools & libraries',services:'Everyday services'};
const tileCache={};
const cellOf=(lat,lng)=>Math.floor(lat*10)+'_'+Math.floor(-lng*10);
const loadCell=c=>tileCache[c]||(tileCache[c]=fetch('assets/data/poi/'+c+'.json').then(r=>r.ok?r.json():[]).catch(()=>[]));
SC.poi={
  async near(lat,lng,radiusMi=1.5,cats=null){const dLat=radiusMi/69, dLng=radiusMi/(69*Math.cos(lat*Math.PI/180)); const cells=new Set();
    for(let a=Math.floor((lat-dLat)*10);a<=Math.floor((lat+dLat)*10);a++) for(let b=Math.floor(-(lng+dLng)*10);b<=Math.floor(-(lng-dLng)*10);b++) cells.add(a+'_'+b);
    const all=(await Promise.all([...cells].map(loadCell))).flat(); const out=[];
    for(const p of all){if(cats&&!cats.includes(p[1])) continue; const mi=SC.miles([lat,lng],[p[3],p[4]]); if(mi<=radiusMi) out.push({name:p[0],cat:p[1],sub:p[2],lat:p[3],lng:p[4],x:p[5]||{},mi:+mi.toFixed(2)});}
    return out.sort((a,b)=>a.mi-b.mi);},
  label:c=>SC.POI_CATS[c]||c,
  attribution:'Place data © OpenStreetMap contributors (ODbL). Names and locations are community-maintained; confirm hours and details with each business.'
};
/* Precomputed amenity counts per sample listing: assets/data/listing-amenities.json {id:{cat:[count1mi,count3mi,nearestMi]}} */
SC.amenities=fetch('assets/data/listing-amenities.json').then(r=>r.ok?r.json():{}).catch(()=>({}));

/* ---------- Preferences & Home Match ---------- */
SC.defaultPrefs={budgetMax:null,budgetMin:null,beds:null,baths:null,sqftMin:null,acresMin:null,types:[],styles:[],areas:[],
  mustHave:{pool:false,garage:0,waterfront:false,newConstruction:false,fenced:false,primaryOnMain:false},hoaMax:null,yearMin:null,
  commute:null /* {lat,lng,label,maxMin} */, lifestyle:[] /* [{cat,maxMi,min}] */};
SC.prefs=()=>Object.assign({},SC.defaultPrefs,SC.db.get('sc_prefs',{}));
SC.setPrefs=p=>{SC.db.set('sc_prefs',Object.assign(SC.prefs(),p)); track('home_match_prefs_update',{});};
SC.hasPrefs=()=>{const p=SC.prefs(); return !!(p.budgetMax||p.beds||p.baths||p.sqftMin||p.types.length||p.styles.length||p.areas.length||p.commute||p.lifestyle.length||Object.values(p.mustHave).some(Boolean));};
/* Home Match: weighted share of criteria met. Only objective listing facts and the user's own choices are used —
   never protected characteristics, demographics, school ratings or crime proxies. Returns null when no prefs set. */
SC.match=(l,p=SC.prefs(),amen=null)=>{const x=SC.extras(l); const C=[];
  const add=(w,ok,yes,no,partial)=>C.push({w,ok:ok===true?1:ok===false?0:ok,yes,no,partial});
  if(p.budgetMax){const r=l.price/p.budgetMax; add(3,r<=1?1:r<=1.05?0.5:0,`Within your ${short(p.budgetMax)} budget`,`${short(l.price-p.budgetMax)} over your budget`);}
  if(p.budgetMin) add(1,l.price>=p.budgetMin,`Above your ${short(p.budgetMin)} minimum`,`Below your price range`);
  if(p.beds) add(2,l.beds>=p.beds?1:l.beds===p.beds-1?0.4:0,`${l.beds} bedrooms (you want ${p.beds}+)`,`${l.beds} bedrooms — fewer than your ${p.beds}`);
  if(p.baths) add(1.5,l.baths>=p.baths?1:l.baths>=p.baths-0.5?0.5:0,`${l.baths} baths meets your ${p.baths}+`,`${l.baths} baths — fewer than your ${p.baths}`);
  if(p.sqftMin) add(1.5,l.sqft>=p.sqftMin?1:l.sqft>=p.sqftMin*0.9?0.5:0,`${l.sqft.toLocaleString()} sq ft (target ${p.sqftMin.toLocaleString()}+)`,`${l.sqft.toLocaleString()} sq ft — smaller than your ${p.sqftMin.toLocaleString()}`);
  if(p.acresMin) add(1,l.acres>=p.acresMin?1:l.acres>=p.acresMin*0.75?0.5:0,`${l.acres} acre lot meets your ${p.acresMin}+`,`Smaller lot than preferred (${l.acres} vs ${p.acresMin} acres)`);
  if(p.types.length) add(1.5,p.types.includes(l.type),`${l.type} — a home type you chose`,`${l.type} isn't a home type you selected`);
  if(p.styles.length) add(1,p.styles.includes(x.style),`${x.style} style, one of your favorites`,`${x.style} style isn't on your list`);
  if(p.areas.length) add(2,p.areas.includes(l.hood),`In ${l.hoodName}, a preferred area`,`Outside your preferred areas`);
  const m=p.mustHave||{};
  if(m.pool) add(1.5,!!l.pool,'Has a pool','No pool');
  if(m.garage) add(1,l.garage>=m.garage?1:l.garage>0?0.4:0,`${l.garage}-car garage`,l.garage?`${l.garage}-car garage, not ${m.garage}`:'No garage');
  if(m.waterfront) add(1.5,!!l.waterfront,'Waterfront','Not waterfront');
  if(m.newConstruction) add(1,l.flag==='New Construction'||l.year>=2024,'New or recent construction',`Built in ${l.year}`);
  if(m.fenced) add(0.75,x.fenced,'Fenced backyard (per listing)','No fenced yard listed');
  if(m.primaryOnMain) add(0.75,x.features.includes('Primary on main'),'Primary bedroom on the main level','Primary bedroom not listed on main');
  if(p.hoaMax!=null&&p.hoaMax!=='') add(1,l.hoa<=p.hoaMax?1:l.hoa<=p.hoaMax*1.25?0.5:0,l.hoa?`HOA $${l.hoa}/mo, within your limit`:'No HOA fee listed',`Higher HOA than preferred ($${l.hoa}/mo)`);
  if(p.yearMin) add(0.75,l.year>=p.yearMin,`Built ${l.year}`,`Built ${l.year}, older than ${p.yearMin}`);
  if(p.commute&&p.commute.lat){const d=SC.drive([l.lat,l.lng],[p.commute.lat,p.commute.lng]); add(2,d.minutes<=p.commute.maxMin?1:d.minutes<=p.commute.maxMin*1.2?0.5:0,`About ${d.minutes} min to ${p.commute.label} (estimate)`,`About ${d.minutes} min to ${p.commute.label} — longer than your ${p.commute.maxMin} min`);}
  if(p.lifestyle&&p.lifestyle.length&&amen){const a=amen[l.id]||{}; p.lifestyle.forEach(r=>{const v=a[r.cat]; if(!v) return; const n=(r.maxMi||1)<=1?v[0]:v[1]; const need=r.min||1; add(1,n>=need?1:n>0?0.5:0,`${n} ${SC.poi.label(r.cat).toLowerCase()} within ${r.maxMi<=1?1:3} mi`,`Only ${n} ${SC.poi.label(r.cat).toLowerCase()} within ${r.maxMi<=1?1:3} mi (you wanted ${need})`);});}
  if(!C.length) return null;
  const W=C.reduce((s,c)=>s+c.w,0), S=C.reduce((s,c)=>s+c.w*c.ok,0);
  return {score:Math.round(S/W*100),matches:C.filter(c=>c.ok>=1).map(c=>c.yes),compromises:C.filter(c=>c.ok<1).map(c=>c.no),criteria:C.length};
};
SC.matchBadge=(l,amen)=>{const r=SC.match(l,undefined,amen); if(!r) return ''; const u=SC.user(); const who=u&&u.first&&SC.personalized()?' for '+esc(u.first):'';
  return `<span class="match-badge ${r.score>=85?'hi':r.score>=65?'mid':'lo'}" title="Home Match: ${r.criteria} of your criteria scored">${r.score}% Match${who}</span>`;};

/* ---------- True Cost to Own ---------- */
SC.costAssumptions=fetch('assets/data/cost-assumptions.json').then(r=>r.ok?r.json():null).catch(()=>null);
SC.trueCost=(l,a)=>{ /* a: {downPct,rate,years,taxRate,insYr,pmiRate,maintPct,utilMo,commuteMo,closingPct} — all user-adjustable */
  const down=l.price*a.downPct/100, loan=l.price-down, r=a.rate/100/12, n=a.years*12;
  const pi=r===0?loan/n:loan*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  const firstInt=loan*r, firstPrin=pi-firstInt;
  const tax=l.price*a.taxRate/100/12, ins=a.insYr/12, pmi=a.downPct<20?loan*a.pmiRate/100/12:0, hoa=l.hoa||0;
  const maint=l.price*a.maintPct/100/12, util=a.utilMo||0, commute=a.commuteMo||0;
  const total=pi+tax+ins+pmi+hoa+maint+util+commute;
  return {down,loan,principal:firstPrin,interest:firstInt,pi,tax,ins,pmi,hoa,maint,util,commute,total,closing:l.price*a.closingPct/100,cashToClose:down+l.price*a.closingPct/100};
};

/* ---------- Compare tray (max 4) ---------- */
SC.compare=()=>SC.db.get('sc_compare',[]);
SC.toggleCompare=id=>{let a=SC.compare(); const on=!a.includes(id); if(on&&a.length>=4){SC.toast('Compare up to 4 homes at a time'); return false;} a=on?[...a,id]:a.filter(x=>x!==id); SC.db.set('sc_compare',a); SC.toast(on?'Added to Compare Homes':'Removed from Compare'); track(on?'compare_add':'compare_remove',{listing_id:id}); return on;};
/* ---------- Tour list ---------- */
SC.tourList=()=>SC.db.get('sc_tourlist',[]);
SC.toggleTour=id=>{let a=SC.tourList(); const on=!a.includes(id); if(on&&a.length>=8){SC.toast('Tour Day plans up to 8 homes'); return false;} a=on?[...a,id]:a.filter(x=>x!==id); SC.db.set('sc_tourlist',a); SC.toast(on?'Added to Tour Day':'Removed from Tour Day'); track(on?'tour_add':'tour_remove',{listing_id:id}); return on;};
document.addEventListener('click',e=>{const c=e.target.closest('[data-compare]'); if(c){e.preventDefault(); e.stopPropagation(); const on=SC.toggleCompare(c.dataset.compare); $$(`[data-compare="${c.dataset.compare}"]`).forEach(b=>b.setAttribute('aria-pressed',on));}
  const t=e.target.closest('[data-tour]'); if(t){e.preventDefault(); e.stopPropagation(); const on=SC.toggleTour(t.dataset.tour); $$(`[data-tour="${t.dataset.tour}"]`).forEach(b=>b.setAttribute('aria-pressed',on));}});

/* ---------- Deal Radar signals (verifiable listing activity only) ---------- */
SC.dealSignals=l=>{const x=SC.extras(l), s=[];
  if(l.flag==='New Listing'||l.dom<=7) s.push({k:'new',label:'New Listing'});
  if(x.priceCuts) s.push({k:'reduced',label:x.priceCuts>1?`Price Reduced ×${x.priceCuts}`:'Price Reduced',detail:`${short(x.originalPrice-l.price)} below original list price`});
  if(x.backOnMarket) s.push({k:'back',label:'Back on Market'});
  if(l.dom>=45) s.push({k:'dom',label:`${l.dom} days on market`});
  if(x.openHouse) s.push({k:'open',label:'Open House',detail:x.openHouse});
  if(x.incentive) s.push({k:'incentive',label:'Builder Incentive',detail:x.incentive});
  return s;};

/* ---------- Voice input (Web Speech API, optional) ---------- */
SC.voice=(input,onDone)=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition; if(!R){SC.toast('Voice search isn\'t supported in this browser — type your search instead'); input.focus(); return null;}
  const r=new R(); r.lang='en-US'; r.interimResults=true; r.maxAlternatives=1;
  r.onresult=e=>{input.value=[...e.results].map(x=>x[0].transcript).join(' '); if(e.results[e.results.length-1].isFinal&&onDone) onDone(input.value);};
  r.onerror=e=>SC.toast(e.error==='not-allowed'?'Microphone permission was declined — you can type instead':'Didn\'t catch that — try again or type');
  try{r.start(); track('voice_search_start',{});}catch(e){} return r;};
document.addEventListener('click',e=>{const b=e.target.closest('[data-voice]'); if(!b) return; e.preventDefault(); const inp=document.getElementById(b.dataset.voice); if(!inp) return;
  b.classList.add('listening'); const r=SC.voice(inp,v=>{b.classList.remove('listening'); const f=inp.closest('form'); f&&f.requestSubmit();}); if(r) r.onend=()=>b.classList.remove('listening'); else b.classList.remove('listening');});
SC.micIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
})();

/* Tour Day, route planning + showing requests (preview).
   Drive times: SC.drive() straight-line × 1.35 circuity estimate. Order: nearest-neighbor from the start, improved with 2-opt.
   Production: Google Maps Platform Routes API (computeRouteMatrix / computeRoutes) for traffic-aware legs; showing requests
   go to the agent, who books via ShowingTime (or the listing's showing service) and confirms back to Passport. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC;
const q=new URLSearchParams(location.search), db=SC.db;
const MAX=8;
const STARTS=[{id:'office',name:'Search Charlotte office (6801 Morrison Blvd)',lat:SC.OFFICE.lat,lng:SC.OFFICE.lng},...SC.LANDMARKS];
let ids=[], start='office', geo=null, order=[], optimized=true, savedTour=null;
const icon={up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',star:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'};

/* ---------- init state from URL / saved tour / tour list ---------- */
if(q.get('tour')){savedTour=db.get('sc_tours',[]).find(t=>t.id===q.get('tour'))||null;}
if(savedTour){ids=savedTour.stops.slice(); order=ids.slice(); optimized=false; start=savedTour.startId||'office';}
else if(q.get('ids')) ids=q.get('ids').split(',').filter(id=>SC.listing(id)).slice(0,MAX);
else ids=SC.tourList().filter(id=>SC.listing(id)).slice(0,MAX);
if(q.get('start')) start=q.get('start');
const tomorrow=()=>{const d=new Date(); d.setDate(d.getDate()+1); if(d.getDay()===0) d.setDate(d.getDate()+1); return d.toISOString().slice(0,10);};
$('#td-date').value=(savedTour&&savedTour.date)||q.get('date')||tomorrow(); $('#td-date').min=new Date().toISOString().slice(0,10);
if(savedTour&&savedTour.start||q.get('t')) $('#td-time').value=(savedTour&&savedTour.start)||q.get('t');
if(savedTour&&savedTour.dur||q.get('dur')) $('#td-dur').value=String((savedTour&&savedTour.dur)||q.get('dur'));
const startSel=$('#td-start');
const paintStarts=()=>{startSel.innerHTML=(geo?`<option value="geo">My current location</option>`:'')+STARTS.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  if(start==='geo'&&!geo) start='office'; startSel.value=start;};
paintStarts();
const startPt=()=>start==='geo'&&geo?{name:'Your current location',lat:geo[0],lng:geo[1]}:(STARTS.find(s=>s.id===start)||STARTS[0]);

/* ---------- routing ---------- */
const P=id=>{const l=SC.listing(id); return [l.lat,l.lng];};
const leg=(a,b)=>SC.drive(a,b);
const pathCost=(s,seq)=>{let c=0,prev=s; seq.forEach(id=>{c+=leg(prev,P(id)).minutes; prev=P(id);}); return c;};
const optimize=()=>{const s=[startPt().lat,startPt().lng]; let rest=ids.slice(), seq=[], cur=s;
  while(rest.length){let bi=0,bv=Infinity; rest.forEach((id,i)=>{const v=leg(cur,P(id)).minutes+SC.miles(cur,P(id))*0.01; if(v<bv){bv=v;bi=i;}}); const id=rest.splice(bi,1)[0]; seq.push(id); cur=P(id);}
  let improved=true, guard=0; while(improved&&guard++<50){improved=false; for(let i=0;i<seq.length-1;i++) for(let k=i+1;k<seq.length;k++){const n=[...seq.slice(0,i),...seq.slice(i,k+1).reverse(),...seq.slice(k+1)]; if(pathCost(s,n)<pathCost(s,seq)-0.01){seq=n; improved=true;}}}
  order=seq; optimized=true;};
const schedule=()=>{const s=startPt(), dur=+$('#td-dur').value; let [h,m]=($('#td-time').value||'10:00').split(':').map(Number); let t=h*60+m, prev=[s.lat,s.lng]; let drive=0, miles=0;
  const stops=order.map(id=>{const d=leg(prev,P(id)); drive+=d.minutes; miles+=d.miles; t+=d.minutes; const arrive=t; t+=dur; prev=P(id); return {id,l:SC.listing(id),leg:d,arrive,depart:t};});
  return {stops,drive,miles:+miles.toFixed(1),show:dur*order.length,startMin:h*60+m,end:t};};
const hm=m=>{m=Math.round(m); const h=Math.floor(m/60)%24, mm=m%60; const ap=h>=12?'PM':'AM'; return `${(h%12)||12}:${String(mm).padStart(2,'0')} ${ap}`;};
const dur=m=>m>=60?`${Math.floor(m/60)} h ${m%60?m%60+' min':''}`.trim():m+' min';

/* ---------- map ---------- */
let map=null, layer=null;
const initMap=()=>{if(map||!window.L) return; map=L.map('td-map',{scrollWheelZoom:false}); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map); layer=L.layerGroup().addTo(map); map.setView([35.2,-80.84],10);};
const drawMap=sch=>{initMap(); if(!map) return; layer.clearLayers(); const s=startPt(); const pts=[[s.lat,s.lng]];
  L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:'<div class="td-pin start" aria-hidden="true">S</div>',iconSize:[28,28],iconAnchor:[14,14]}),title:'Start: '+s.name}).bindPopup('<strong>Start</strong><br>'+esc(s.name)).addTo(layer);
  sch.stops.forEach((st,i)=>{const p=[st.l.lat,st.l.lng]; const prev=pts[pts.length-1]; pts.push(p);
    L.polyline([prev,p],{color:'#1E140D',weight:3,opacity:.75,dashArray:'6 8'}).bindTooltip(`≈ ${st.leg.minutes} min (estimate)`,{permanent:innerWidth>700&&st.leg.miles>1.5,direction:'center',className:'td-route-label'}).addTo(layer);
    L.marker(p,{icon:L.divIcon({className:'',html:`<div class="td-pin" aria-hidden="true">${i+1}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),title:`Stop ${i+1}: ${st.l.address}`}).bindPopup(`<strong>${i+1}. ${esc(st.l.address)}</strong><br>${fmt(st.l.price)} · arrive ≈ ${hm(st.arrive)}<br><a href="listing.html?id=${st.l.id}">View home</a>`).addTo(layer);});
  if(pts.length>1) map.fitBounds(pts,{padding:[36,36],maxZoom:14}); else map.setView(pts[0],12);
  setTimeout(()=>map.invalidateSize(),50);};

/* ---------- UI ---------- */
const picker=()=>{const pool=[...new Set([...ids,...SC.tourList(),...SC.saved()])].filter(id=>SC.listing(id));
  $('#td-pick').innerHTML=pool.length?pool.map(id=>{const l=SC.listing(id), on=ids.includes(id); return `<button type="button" class="chip" data-pick="${id}" aria-pressed="${on}">${esc(l.address)} · ${short(l.price)}</button>`;}).join('')
    :`<div class="empty" style="width:100%;padding:22px"><h3>No homes yet</h3><p>Add homes with “Tour” on any listing or save homes, then come back. Or try it with sample homes.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-sm" type="button" data-sample-tour>Try with 4 sample homes</button><a class="btn btn-sm btn-outline" href="search.html">Search homes</a></div></div>`;};
const plan=()=>{const el=$('#td-plan');
  if(!ids.length){el.innerHTML=''; drawMap({stops:[]}); after(); return;}
  if(!optimized||order.length!==ids.length||!order.every(id=>ids.includes(id))){if(optimized||order.length!==ids.length) optimize();}
  const sch=schedule(), s=startPt(), req=savedTour&&savedTour.status;
  el.innerHTML=`<div class="pp-h" style="margin-bottom:6px"><div><h2 class="display d-md">Your route</h2><p>${optimized?'Ordered for the shortest estimated total drive from your start (nearest-neighbor + 2-opt).':'Custom order. Tap “Optimize route” to reorder for the shortest drive.'}</p></div></div>
   <div class="td-sum"><div><b>${order.length}</b><small>Homes</small></div><div><b>${dur(sch.drive)}</b><small>Est. driving · ${sch.miles} mi</small></div><div><b>${dur(sch.show)}</b><small>At homes</small></div><div><b>${hm(sch.end)}</b><small>Est. finish</small></div></div>
   <div class="td-start"><span class="td-pin start" style="width:28px;height:28px;display:grid;place-items:center">S</span><span>Start <b>${esc(s.name)}</b> at ${hm(sch.startMin)}</span></div>
   <ol class="td-stops" aria-label="Tour stops in order">${sch.stops.map((st,i)=>`<li><div class="td-leg">≈ ${st.leg.minutes} min · ${st.leg.miles} mi drive (estimate)</div>
     <div class="td-stop"><span class="td-num">${i+1}</span><img src="assets/img/${st.l.img}.webp" alt="" width="72" height="56" loading="lazy">
      <div><h3><a href="listing.html?id=${st.l.id}">${esc(st.l.address)}</a></h3><p>${fmt(st.l.price)} · ${esc(SC.facts(st.l))}</p><p class="eta">Arrive ≈ ${hm(st.arrive)} · leave ≈ ${hm(st.depart)}</p>${req?`<span class="td-status">Requested, not confirmed until an agent confirms</span>`:''}</div>
      <div class="td-mv no-print"><button type="button" data-mv="-1" data-i="${i}" aria-label="Move ${esc(st.l.address)} earlier" ${i===0?'disabled':''}>${icon.up}</button><button type="button" data-mv="1" data-i="${i}" aria-label="Move ${esc(st.l.address)} later" ${i===sch.stops.length-1?'disabled':''}>${icon.down}</button></div></div></li>`).join('')}</ol>
   <p class="form-note" style="margin-top:10px">Drive times are estimates: straight-line distance × 1.35 road factor at about 30 mph in town and 45 mph beyond 10 miles, plus 3 minutes per leg. Traffic, parking and lockbox access aren't included.</p>
   <div class="pp-card no-print" style="margin-top:16px" id="td-req"></div>
   <div class="pp-card" style="margin-top:16px"><h3>Share this itinerary</h3><p>Send the plan to anyone joining you, print it, or add the requested window to your calendar as tentative.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" class="no-print"><button class="btn btn-sm" type="button" data-share>Copy share link</button><button class="btn btn-sm btn-outline" type="button" onclick="window.print()">Print</button><button class="btn btn-sm btn-outline" type="button" data-ics>Download .ics (tentative)</button></div>
    <p class="print-only form-note">Printed from SearchCharlotte.com Tour Day. Times are estimates and showings are not confirmed until an agent confirms. Sample listing data in this preview.</p></div>`;
  requestForm(sch); drawMap(sch); after();};
const requestForm=sch=>{const box=$('#td-req'); const u=SC.user()||{}; const done=savedTour&&savedTour.status;
  if(done){box.innerHTML=`<h3>Showing request sent (preview)</h3><p>Every stop is <strong>requested, not confirmed until an agent confirms</strong>. ${esc(SC.RESPONSE_GOAL)}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn btn-sm btn-outline" href="passport.html#tours">View in Passport</a><button class="btn btn-sm btn-outline" type="button" data-new-tour>Plan another tour</button></div>`; return;}
  box.innerHTML=`<h3>Request these showings</h3><p>We'll ask each listing for your times. Nothing is booked until an agent confirms with you.</p>
   <form class="form" data-lead="tour_request" style="margin-top:12px" novalidate>
    <div class="row"><div class="field"><label for="tr-n">Name</label><input id="tr-n" name="name" required autocomplete="name" value="${esc([u.first,u.last].filter(Boolean).join(' '))}"></div><div class="field"><label for="tr-p">Phone</label><input id="tr-p" name="phone" type="tel" autocomplete="tel" value="${esc(u.phone||'')}"></div></div>
    <div class="field"><label for="tr-e">Email</label><input id="tr-e" name="email" type="email" required autocomplete="email" value="${esc(u.email||'')}"></div>
    <div class="field"><label for="tr-w">If that time doesn't work</label><select id="tr-w" name="flex"><option>Any time that day</option><option>Same time, another day this week</option><option>Weekend only</option><option>Call me to coordinate</option></select></div>
    <div class="field"><label for="tr-m">Notes for your agent (optional)</label><textarea id="tr-m" name="notes" placeholder="e.g. We'll have two kids with us, need a lunch break around noon"></textarea></div>${SC.honeypot}
    <button class="btn btn-block" type="submit">Request ${order.length} showing${order.length===1?'':'s'}</button>
    <p class="form-note">Requests aren't appointments. At launch your agent schedules through ShowingTime (or each listing's showing service) and confirms each stop.</p>
    <div class="form-ok">Request recorded (preview).</div></form>`;
  SC.leadForm($('form',box),d=>{const sc=schedule(); const t={id:SC.uid('tour'),date:$('#td-date').value,start:$('#td-time').value,end:hm(sc.end),dur:+$('#td-dur').value,startId:start==='geo'?'office':start,startLabel:'From '+startPt().name.replace(/ \(.*/,''),stops:order.slice(),
      stopStatus:Object.fromEntries(order.map(id=>[id,'requested'])),status:'Requested, not confirmed until an agent confirms',contact:{name:d.name,email:d.email,phone:d.phone},notes:d.notes,flex:d.flex,created:new Date().toISOString()};
    db.update('sc_tours',[],a=>[t,...a]); savedTour=t; history.replaceState(null,'','tour.html?tour='+t.id);
    SC.notify('Tour request recorded (preview)',`${t.stops.length} homes on ${t.date}, not confirmed until an agent confirms.`,'tour.html?tour='+t.id);
    track('tour_request',{stops:t.stops.length,date:t.date}); plan(); return 'keep';});};
const after=()=>{const el=$('#td-after'); if(!order.length){el.innerHTML=''; return;} const notes=db.get('sc_notes',{}), rat=db.get('sc_ratings',{});
  el.innerHTML=`<div class="pp-card" style="margin-top:28px"><div class="pp-h" style="margin-bottom:4px"><div><h2 class="display d-md">After the tour</h2><p>Rate each home and jot down what you noticed while it's fresh. Notes save to your Passport.</p></div></div>
   ${order.map((id,i)=>{const l=SC.listing(id), r=rat[id]||0; return `<div class="td-note" data-note="${id}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><strong style="font-size:14.5px">${i+1}. ${esc(l.address)}</strong>
     <div class="td-stars" role="group" aria-label="Rate ${esc(l.address)}">${[1,2,3,4,5].map(n=>`<button type="button" data-rate="${n}" aria-pressed="${n<=r}" aria-label="${n} star${n>1?'s':''}">${icon.star}</button>`).join('')}</div></div>
     <label class="sr-only" for="nt-${id}">Notes for ${esc(l.address)}</label><textarea id="nt-${id}" placeholder="Light, layout, noise, what you'd change…">${esc(notes[id]||'')}</textarea></div>`;}).join('')}</div>`;};

/* ---------- ICS + share ---------- */
const ics=()=>{const sch=schedule(), d=$('#td-date').value.replace(/-/g,''); const t=m=>{m=Math.round(m); return String(Math.floor(m/60)).padStart(2,'0')+String(m%60).padStart(2,'0')+'00';};
  const esc2=s=>String(s).replace(/[\\,;]/g,m=>'\\'+m).replace(/\n/g,'\\n');
  const desc='TENTATIVE, requested showing window, not confirmed until a Search Charlotte agent confirms.\n\n'+sch.stops.map((s,i)=>`${i+1}. ${s.l.address}, ${s.l.city} NC, arrive about ${hm(s.arrive)}`).join('\n')+'\n\nTimes are estimates. Questions: 704-458-1843';
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SearchCharlotte//Tour Day//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+(savedTour?savedTour.id:SC.uid('tour'))+'@searchcharlotte.com','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',
    'DTSTART:'+d+'T'+t(sch.startMin),'DTEND:'+d+'T'+t(sch.end),'SUMMARY:'+esc2('Tour Day (tentative, not confirmed)'),'STATUS:TENTATIVE','TRANSP:TRANSPARENT','LOCATION:'+esc2(sch.stops[0]?sch.stops[0].l.address+', '+sch.stops[0].l.city+' NC':''),'DESCRIPTION:'+esc2(desc),'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'})); a.download='tour-day-tentative.ics'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500); track('tour_ics_download',{});};
const shareURL=()=>{const p=new URLSearchParams({ids:order.join(','),start:start==='geo'?'office':start,date:$('#td-date').value,t:$('#td-time').value,dur:$('#td-dur').value}); return location.origin+location.pathname+'?'+p.toString();};

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const pk=e.target.closest('[data-pick]'); if(pk){const id=pk.dataset.pick; if(ids.includes(id)) ids=ids.filter(x=>x!==id); else {if(ids.length>=MAX){SC.toast('Tour Day plans up to 8 homes'); return;} ids.push(id);} if(!savedTour) db.set('sc_tourlist',ids.slice()); optimized=true; picker(); plan(); return;}
  if(e.target.closest('[data-sample-tour]')){ids=D.listings.filter(l=>l.type!=='Land'&&l.hood&&['south-charlotte','myers-park','dilworth','southpark','cotswold'].includes(l.hood)).slice(0,4).map(l=>l.id); if(ids.length<4) ids=D.listings.slice(0,4).map(l=>l.id); db.set('sc_tourlist',ids.slice()); optimized=true; picker(); plan(); track('tour_sample',{}); return;}
  const mv=e.target.closest('[data-mv]'); if(mv){const i=+mv.dataset.i, j=i+(+mv.dataset.mv); [order[i],order[j]]=[order[j],order[i]]; optimized=false; plan(); const b=$(`[data-mv="${mv.dataset.mv}"][data-i="${j}"]`); b&&!b.disabled&&b.focus(); return;}
  if(e.target.closest('[data-share]')){const url=shareURL(); (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>SC.toast('Share link copied')).catch(()=>{prompt('Copy this link',url);}); track('tour_share',{});}
  if(e.target.closest('[data-ics]')) ics();
  if(e.target.closest('[data-new-tour]')){savedTour=null; history.replaceState(null,'','tour.html'); plan();}
  const rt=e.target.closest('[data-rate]'); if(rt){const id=rt.closest('[data-note]').dataset.note, n=+rt.dataset.rate; db.update('sc_ratings',{},o=>Object.assign({},o,{[id]:n})); $$('[data-rate]',rt.parentElement).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.rate<=n)); track('tour_rating',{listing_id:id,rating:n});}
});
let nt; document.addEventListener('input',e=>{const box=e.target.closest('[data-note]'); if(!box||e.target.tagName!=='TEXTAREA') return; clearTimeout(nt); nt=setTimeout(()=>{db.update('sc_notes',{},o=>Object.assign({},o,{[box.dataset.note]:e.target.value})); SC.toast('Note saved');},600);});
$('#td-opt').addEventListener('click',()=>{optimize(); plan(); SC.toast('Route optimized'); track('tour_optimize',{stops:ids.length});});
['#td-time','#td-dur','#td-date'].forEach(s=>$(s).addEventListener('change',()=>plan()));
startSel.addEventListener('change',()=>{start=startSel.value; optimize(); plan();});
$('#td-geo').addEventListener('click',()=>{const note=$('#td-geo-note'); if(!navigator.geolocation){note.textContent='Location isn\'t available in this browser, choose a starting point instead.'; return;}
  note.textContent='Asking your browser for permission…';
  navigator.geolocation.getCurrentPosition(p=>{geo=[p.coords.latitude,p.coords.longitude]; start='geo'; paintStarts(); optimize(); plan(); note.textContent='Using your current location for the first drive (kept on this device only).'; track('tour_geolocation',{granted:true});},
    err=>{note.textContent=err.code===1?'Location permission was declined: choose a starting point from the list instead.':'Couldn\'t get your location, choose a starting point instead.'; track('tour_geolocation',{granted:false});},{timeout:10000,maximumAge:300000});});
picker(); if(ids.length&&!savedTour) optimize(); plan();
})();

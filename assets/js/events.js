/* What's Happening in Charlotte (local_life_builder). Data: assets/data/events.json (verified on official pages). */
(function(){
const SC=window.SC, ll=SC.ll, {$,$$,esc}=SC;
const CAT_COLOR={concerts:'#4A2445',sports:'#163B35',holiday:'#a2352b',festival:'#C99A4B',theater:'#5A3D2B',arts:'#2f5d8a',markets:'#4f7a28',community:'#1E140D'};
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let E=[], META, AREAS=[], st={q:'',from:'',to:'',area:'',cats:new Set(),view:'list',calMonth:'2026-11'}, map, layer;

const uptown=SC.lmk('uptown');
function bucket(near){const a=near[0].a; const d=SC.miles([uptown.lat,uptown.lng],[a.lat,a.lng]);
  if(a.kind==='neighborhood'){ if(d<=2.2||/^Uptown|Inner Ring/.test(a.area||'')) return 'Uptown & close-in Charlotte'; return 'Charlotte neighborhoods'; }
  return a.area||'Suburbs';}
const span=e=>(new Date(e.end)-new Date(e.start))/864e5;
const isLong=e=>span(e)>7;
function filtered(){
  const q=st.q.toLowerCase();
  return E.filter(e=>{ if(st.cats.size&&!st.cats.has(e.category)) return false;
    if(st.area&&e._bucket!==st.area) return false;
    if(st.from&&e.end<st.from) return false; if(st.to&&e.start>st.to) return false;
    if(q&&!(e.title+' '+e.venue+' '+e.description+' '+e._near.map(n=>n.a.name).join(' ')).toLowerCase().includes(q)) return false; return true;});
}
function syncURL(){const p=new URLSearchParams(); if(st.q) p.set('q',st.q); if(st.from) p.set('from',st.from); if(st.to) p.set('to',st.to); if(st.area) p.set('area',st.area); if(st.cats.size) p.set('cat',[...st.cats].join(',')); if(st.view!=='list') p.set('view',st.view);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));}
const dateRange=e=>e.date_text?esc(e.date_text):(e.start===e.end?ll.date(e.start):(e.start.slice(0,4)===e.end.slice(0,4)?ll.dateShort(e.start)+' – '+ll.date(e.end):ll.date(e.start)+' – '+ll.date(e.end)));
function ics(e){
  const d=s=>s.replace(/-/g,''); const endP=new Date(e.end+'T12:00:00'); endP.setDate(endP.getDate()+1); const end=endP.toISOString().slice(0,10).replace(/-/g,'');
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SearchCharlotte//Events//EN','BEGIN:VEVENT','UID:'+e.id+'@searchcharlotte.com','DTSTAMP:20261028T120000Z','DTSTART;VALUE=DATE:'+d(e.start),'DTEND;VALUE=DATE:'+end,
    'SUMMARY:'+e.title.replace(/[,;]/g,' '),'LOCATION:'+(e.venue+', '+e.address).replace(/[,;]/g,' '),'DESCRIPTION:'+((e.time||'')+' — confirm details at '+e.url).replace(/[,;]/g,' '),'URL:'+e.url,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(body);
}
function evCard(e){
  const s=new Date(e.start+'T12:00:00'), ongoing=e.start<'2026-11-01';
  const near=e._near.slice(0,2);
  return `<article class="ll-ev" id="ev-${esc(e.id)}">
  <div class="ll-ev-date" aria-hidden="true"><span>${ongoing?'Now':ll.MON[s.getMonth()]}</span><b>${ongoing?'On':s.getDate()}</b><small>${ongoing?'view':DOW[s.getDay()]}</small></div>
  <div><p style="margin:0 0 6px"><span class="ll-badge" style="color:${CAT_COLOR[e.category]||'#4A2445'}">${esc(META.categories[e.category]||e.category)}</span>${e.recurring?`<span class="ll-badge">${esc(e.recurring)}</span>`:''}${e.dates_approximate?'<span class="ll-badge warn">Dates approximate</span>':''}</p>
  <h3>${esc(e.title)}</h3>
  <p class="ll-ev-meta"><b>${dateRange(e)}</b>${e.time?' · '+esc(e.time):''}<br>${esc(e.venue)} · ${esc(e.address)}</p>
  <p class="ll-ev-desc">${esc(e.description)}</p>
  <div class="ll-ev-links"><a href="${esc(e.url)}" target="_blank" rel="noopener" data-track="event_official">Official event page</a>
  ${near.map(n=>`<a href="${ll.hoodUrl(n.a.slug)}">${esc(n.a.name)} guide <span class="na">(${n.mi.toFixed(1)} mi)</span></a>`).join('')}
  <a href="${ll.homesUrl(near[0].a.slug)}" data-track="event_homes">Homes near this venue</a>
  <a href="${ics(e)}" download="${esc(e.id)}.ics">Add to calendar</a></div>
  <p class="ll-ev-src">Checked ${ll.date(e.verified_on)} on ${esc(e.source_name)}. Times and dates can change; confirm with the organizer before you go.</p></div></article>`;
}
function renderList(list){
  if(!list.length){$('#ev-list').innerHTML='<p class="ll-empty">No events match these filters. Try a wider date range or clear a category.</p>'; return;}
  let out='', cur='';
  for(const e of list){const m=e.start<'2026-11-01'?'On view now':ll.ymLong(e.start.slice(0,7)); if(m!==cur){cur=m; out+=`<h2 class="ll-month-h">${m}</h2>`;} out+=evCard(e);}
  $('#ev-list').innerHTML=out;
}
function renderMap(list){
  if(!window.L){$('#ev-map').innerHTML='<p class="ll-empty">The map could not load. Use the list view.</p>'; return;}
  if(!map){map=ll.map($('#ev-map'),[35.227,-80.843],10); layer=L.layerGroup().addTo(map);}
  layer.clearLayers(); const byVenue={};
  list.forEach(e=>{const k=e.lat+','+e.lng; (byVenue[k]=byVenue[k]||[]).push(e);});
  const pts=[];
  Object.values(byVenue).forEach(evs=>{const e=evs[0]; pts.push([e.lat,e.lng]);
    L.marker([e.lat,e.lng],{icon:ll.dot(CAT_COLOR[e.category]||'#4A2445'),title:e.venue,keyboard:true}).addTo(layer)
     .bindPopup(`<b>${esc(e.venue)}</b><br><span style="font-size:12px">${evs.length} event${evs.length>1?'s':''}</span><ul style="margin:6px 0 0;padding-left:16px;font-size:12.5px">${evs.slice(0,6).map(x=>`<li><a href="#ev-${esc(x.id)}" data-goto="${esc(x.id)}">${esc(x.title)}</a> · ${dateRange(x)}</li>`).join('')}${evs.length>6?`<li>+${evs.length-6} more</li>`:''}</ul><a href="${ll.homesUrl(e._near[0].a.slug)}" style="font-size:12.5px">Homes near this venue</a>`);});
  setTimeout(()=>{map.invalidateSize(); if(pts.length) map.fitBounds(pts,{padding:[30,30],maxZoom:13});},50);
}
function renderCal(list){
  const [y,m]=st.calMonth.split('-').map(Number); const first=new Date(y,m-1,1), days=new Date(y,m,0).getDate();
  const months=['2026-11','2026-12','2027-01','2027-02'], i=months.indexOf(st.calMonth);
  const long=list.filter(e=>isLong(e)&&e.start<=st.calMonth+'-31'&&e.end>=st.calMonth+'-01');
  const short=list.filter(e=>!isLong(e));
  let g=DOW.map(d=>`<div class="dow">${d}</div>`).join('');
  for(let k=0;k<first.getDay();k++) g+='<div class="ll-day out" aria-hidden="true"></div>';
  for(let d=1;d<=days;d++){const ds=`${st.calMonth}-${String(d).padStart(2,'0')}`; const evs=short.filter(e=>e.start<=ds&&e.end>=ds);
    g+=`<div class="ll-day"><span class="dn">${d}</span>${evs.slice(0,3).map(e=>`<button type="button" data-goto="${esc(e.id)}" aria-label="${esc(e.title)}, ${ll.dateShort(ds)}" style="border-left:3px solid ${CAT_COLOR[e.category]}">${esc(e.title)}</button>`).join('')}${evs.length>3?`<div class="more">+${evs.length-3} more</div>`:''}</div>`;}
  $('#ev-calwrap').innerHTML=`<div class="ll-cal-nav"><button class="btn btn-sm btn-outline" type="button" data-cal="-1" ${i<=0?'disabled':''}>Previous</button><h3>${ll.ymLong(st.calMonth)}</h3><button class="btn btn-sm btn-outline" type="button" data-cal="1" ${i>=3?'disabled':''}>Next</button></div>
   <div class="ll-cal" role="grid" aria-label="${ll.ymLong(st.calMonth)} events">${g}</div>
   ${long.length?`<h3 class="ll-month-h" style="font-size:16px">Ongoing this month</h3><ul class="ll-list">${long.map(e=>`<li><button type="button" class="ll-lnk" data-goto="${esc(e.id)}">${esc(e.title)}</button><small>${dateRange(e)} · ${esc(e.venue)}</small></li>`).join('')}</ul>`:''}`;
  $$('#ev-calwrap [data-cal]').forEach(b=>b.addEventListener('click',()=>{st.calMonth=months[i+(+b.dataset.cal)]; renderCal(filtered());}));
}
function render(){
  const list=filtered();
  $('#ev-count').textContent=`${list.length} of ${E.length} events${st.cats.size||st.area||st.q||st.from||st.to?' match your filters':''}`;
  $('#ev-list').hidden=st.view!=='list'; $('#ev-mapwrap').hidden=st.view!=='map'; $('#ev-calwrap').hidden=st.view!=='cal';
  if(st.view==='list') renderList(list); else if(st.view==='map') renderMap(list); else renderCal(list);
  $$('#ev-cats .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.c===''?!st.cats.size:st.cats.has(c.dataset.c)));
  syncURL();
}
function goto(id){st.view='list'; $$('.ll-views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v==='list')); render(); const el=document.getElementById('ev-'+id); if(el){el.scrollIntoView({behavior:ll.reduced()?'auto':'smooth',block:'center'}); el.style.outline='2px solid #C99A4B'; setTimeout(()=>el.style.outline='',2000);}}

Promise.all([ll.events(),ll.areas()]).then(([d,areas])=>{
  META=d.meta; AREAS=areas;
  E=d.events.map(e=>{e._near=ll.nearest(AREAS,e.lat,e.lng,3); e._bucket=bucket(e._near); return e;}).sort((a,b)=>(a.start<'2026-11-01'?'0':a.start).localeCompare(b.start<'2026-11-01'?'0':b.start)||a.title.localeCompare(b.title));
  $('#ev-asof').textContent=`${E.length} events · Every listing checked on its official page ${ll.date(META.retrieved)} · Next review: first business day of each month`;
  $('#ev-cats').innerHTML=`<button type="button" class="chip" data-c="">All</button>`+Object.entries(META.categories).filter(([k])=>E.some(e=>e.category===k)).map(([k,v])=>`<button type="button" class="chip" data-c="${k}">${esc(v)}</button>`).join('');
  const buckets=[...new Set(E.map(e=>e._bucket))].sort();
  $('#ev-area').innerHTML+=buckets.map(b=>`<option>${esc(b)}</option>`).join('');
  $('#ev-workflow').innerHTML=`<p>${esc(META.verification)}</p><p>${esc(META.editorial_workflow)}</p><p class="ll-src">${esc(META.coordinates)}</p>`;
  $('#ev-excluded').innerHTML=META.excluded.map(x=>{const [t,...r]=x.split(' — '); return `<li><b>${esc(t)}</b><small>${esc(r.join(' — '))}</small></li>`;}).join('');
  const q=new URLSearchParams(location.search);
  st.q=q.get('q')||''; st.from=q.get('from')||''; st.to=q.get('to')||''; st.area=buckets.includes(q.get('area'))?q.get('area'):'';
  (q.get('cat')||'').split(',').filter(c=>META.categories[c]).forEach(c=>st.cats.add(c));
  if(['list','map','cal'].includes(q.get('view'))) st.view=q.get('view');
  $('#ev-q').value=st.q; $('#ev-from').value=st.from; $('#ev-to').value=st.to; $('#ev-area').value=st.area;
  $$('.ll-views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===st.view));
  render();
  let t; $('#ev-q').addEventListener('input',e=>{clearTimeout(t); t=setTimeout(()=>{st.q=e.target.value.trim(); render();},200);});
  $('#ev-from').addEventListener('change',e=>{st.from=e.target.value; render();});
  $('#ev-to').addEventListener('change',e=>{st.to=e.target.value; render();});
  $('#ev-area').addEventListener('change',e=>{st.area=e.target.value; render(); SC.track('events_filter',{area:st.area});});
  $('#ev-cats').addEventListener('click',e=>{const c=e.target.closest('.chip'); if(!c) return; const k=c.dataset.c; if(!k) st.cats.clear(); else st.cats.has(k)?st.cats.delete(k):st.cats.add(k); render(); SC.track('events_filter',{category:k||'all'});});
  $$('.ll-views button').forEach(b=>b.addEventListener('click',()=>{st.view=b.dataset.v; $$('.ll-views button').forEach(x=>x.setAttribute('aria-pressed',x===b)); render(); SC.track('events_view',{view:st.view});}));
  document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]'); if(g){e.preventDefault(); goto(g.dataset.goto);} const tr=e.target.closest('[data-track]'); if(tr) SC.track(tr.dataset.track,{link_url:tr.href});});
}).catch(()=>{$('#ev-list').innerHTML='<p class="ll-empty">Events could not load. Please refresh the page.</p>';});
})();

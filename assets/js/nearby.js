/* "What's nearby" local explorer, every OpenStreetMap place within a radius, by category, with map.
   SC.nearby.mount(el,{lat,lng,radius,name,polygon,mapId,static:[...]}) */
(function(){'use strict';const SC=window.SC,{esc,track}=SC;
const ORDER=['restaurants','cafes','bars','grocery','shopping','parks','trails','venues','golf','water','fitness','transit','health','schools','services'];
const COLORS={restaurants:'#B4472F',cafes:'#8A5A3C',bars:'#6B2C5C',grocery:'#2F7A4A',shopping:'#C99A4B',parks:'#3E7D3A',trails:'#5E8F4F',venues:'#4A2445',golf:'#1F6B4F',water:'#2B6A99',fitness:'#A2652B',transit:'#1E140D',health:'#9C3B3B',schools:'#5A3D2B',services:'#7A746C'};
const ICON={restaurants:'M7 2v9a2 2 0 0 0 2 2v9M11 2v7M3 2v7a4 4 0 0 0 4 4M17 2c-2 2-2 6 0 9v11',cafes:'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3',bars:'M5 3h14l-7 9zM12 12v8M8 21h8',grocery:'M3 4h2l2.4 11h11L21 7H7M9 20a1 1 0 1 0 0 .1M18 20a1 1 0 1 0 0 .1',shopping:'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0',parks:'M12 2l5 8h-3l4 6h-5v6h-2v-6H6l4-6H7z',trails:'M4 20c4-2 4-6 8-8s4-6 8-8M6 6h.1M18 18h.1',venues:'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',golf:'M12 18V2l7 3-7 3M5 21c2-2 12-2 14 0',water:'M2 16c2 2 4 2 6 0s4-2 6 0 4 2 6 0M2 20c2 2 4 2 6 0s4-2 6 0 4 2 6 0M12 3l4 8H8z',fitness:'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',transit:'M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM4 11h16M8 21l2-3M16 21l-2-3',health:'M12 5v14M5 12h14',schools:'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',services:'M4 21V9l8-6 8 6v12zM9 21v-6h6v6'};
const svg=c=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[c]||ICON.services}"/></svg>`;
const time=mi=>mi<=1.2?`${Math.max(1,Math.round(mi*1.25/3*60))} min walk`:`${SC.drive([0,0],[mi/69,0]).minutes} min drive`;
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):'';
SC.nearby={mount(el,o){
  if(!el) return; const radius0=o.radius||1.5; let all=[],cat=null,radius=radius0,localOnly=false,q='',shown=40,map,layer;
  el.classList.add('nb');
  el.innerHTML=`<div class="nb-head"><div><p class="eyebrow">Live where you love</p><h2 class="display d-lg">What's near ${esc(o.name)}</h2><p class="nb-sub" aria-live="polite">Loading places…</p></div>
   <div class="nb-ctrls"><label class="nb-rad">Within <select aria-label="Radius">${[0.5,1,1.5,2,3,5].map(r=>`<option value="${r}"${r===radius0?' selected':''}>${r} mi</option>`).join('')}</select></label>
   <label class="nb-tog"><input type="checkbox"> Local spots only</label></div></div>
   <div class="nb-cats" role="tablist" aria-label="Place categories"></div>
   <div class="nb-body"><div class="nb-listwrap"><input class="nb-q" type="search" placeholder="Filter by name or cuisine" aria-label="Filter places"><ol class="nb-list"></ol><button class="btn btn-sm btn-outline nb-more" type="button" hidden>Show more</button></div>
   <div class="nb-map" ${o.mapId?`id="${o.mapId}"`:''} aria-label="Map of nearby places"></div></div>
   <p class="nb-attr">${esc(SC.poi.attribution)} Distances are straight-line from the area center; walk and drive times are estimates. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Data license</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Report a missing place</a></p>`;
  const $=s=>el.querySelector(s);
  const pool=()=>all.filter(p=>p.mi<=radius&&(!localOnly||!p.x.br));
  const renderCats=()=>{const P=pool(); const n={}; P.forEach(p=>n[p.cat]=(n[p.cat]||0)+1);
    const cats=ORDER.filter(c=>n[c]); if(!cat||!n[cat]) cat=cats[0]||null;
    $('.nb-cats').innerHTML=cats.map(c=>`<button role="tab" type="button" aria-selected="${c===cat}" data-cat="${c}" style="--c:${COLORS[c]}">${svg(c)}<span>${esc(SC.poi.label(c))}</span><b>${n[c]}</b></button>`).join('');
    $('.nb-sub').textContent=P.length?`${P.length.toLocaleString()} named places within ${radius} mi, restaurants, groceries, parks, venues, shopping and more.`:`No mapped places within ${radius} mi yet. Try a wider radius.`;};
  const renderList=()=>{const ql=q.toLowerCase(); const P=pool().filter(p=>p.cat===cat&&(!ql||(p.name+' '+(p.x.cu||'')+' '+p.sub).toLowerCase().includes(ql)));
    $('.nb-list').innerHTML=P.slice(0,shown).map((p,i)=>`<li data-i="${i}"><span class="nb-ic" style="--c:${COLORS[p.cat]}">${svg(p.cat)}</span><div><strong>${p.x.w?`<a href="${esc(p.x.w)}" target="_blank" rel="noopener nofollow">${esc(p.name)}</a>`:esc(p.name)}</strong><small>${esc(cap(p.x.cu||p.sub))}${p.x.a?' · '+esc(p.x.a):''}</small></div><span class="nb-d">${p.mi.toFixed(1)} mi<small>${time(p.mi)}</small></span></li>`).join('')||'<li class="nb-empty">Nothing matches that filter.</li>';
    const more=$('.nb-more'); more.hidden=P.length<=shown; more.textContent=`Show ${Math.min(40,P.length-shown)} more of ${P.length}`;
    if(map&&layer){layer.clearLayers(); P.slice(0,400).forEach(p=>L.circleMarker([p.lat,p.lng],{radius:6,color:'#fff',weight:1.5,fillColor:COLORS[p.cat],fillOpacity:.95}).bindTooltip(esc(p.name)).addTo(layer));}
    $$('.nb-list li[data-i]').forEach(li=>li.addEventListener('mouseenter',()=>{const p=P[+li.dataset.i]; if(map&&p) layer.eachLayer(m=>{const ll=m.getLatLng(); m.setStyle({radius:(ll.lat===p.lat&&ll.lng===p.lng)?10:6});});}));};
  const $$=s=>[...el.querySelectorAll(s)];
  const fit=()=>{if(!map) return; const d=radius/69; map.fitBounds([[o.lat-d,o.lng-d/Math.cos(o.lat*Math.PI/180)],[o.lat+d,o.lng+d/Math.cos(o.lat*Math.PI/180)]]);};
  const go=()=>{shown=40; renderCats(); renderList();};
  $('.nb-cats').addEventListener('click',e=>{const b=e.target.closest('[data-cat]'); if(!b) return; cat=b.dataset.cat; shown=40; $$('.nb-cats [role=tab]').forEach(x=>x.setAttribute('aria-selected',x===b)); renderList(); track('nearby_category',{category:cat,area:o.name});});
  $('.nb-cats').addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key)) return; const t=$$('.nb-cats [role=tab]'); const i=t.findIndex(x=>x.getAttribute('aria-selected')==='true'); const n=t[(i+(e.key==='ArrowRight'?1:-1)+t.length)%t.length]; n.focus(); n.click();});
  $('.nb-rad select').addEventListener('change',e=>{radius=+e.target.value; load();});
  $('.nb-tog input').addEventListener('change',e=>{localOnly=e.target.checked; go();});
  $('.nb-q').addEventListener('input',e=>{q=e.target.value; shown=40; renderList();});
  $('.nb-more').addEventListener('click',()=>{shown+=40; renderList();});
  const initMap=()=>{if(map||!window.L) return; map=L.map($('.nb-map'),{scrollWheelZoom:false}); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
    if(o.polygon&&o.polygon.length>2) L.polygon(o.polygon,{color:'#4A2445',weight:2,fillOpacity:.06}).addTo(map); else L.circleMarker([o.lat,o.lng],{radius:8,color:'#fff',weight:2,fillColor:'#1E140D',fillOpacity:1}).bindTooltip(esc(o.name)).addTo(map);
    layer=L.layerGroup().addTo(map);};
  const load=()=>SC.poi.near(o.lat,o.lng,Math.max(radius,radius0)).then(r=>{all=r; initMap(); fit(); go();});
  const io=('IntersectionObserver' in window)?new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect(); load();}},{rootMargin:'400px'}):null;
  io?io.observe(el):load();
}};
})();

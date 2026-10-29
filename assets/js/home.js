(function(){const {D,$,$$,card,esc,short}=window.SC;
/* neighborhood cards */
const hc=$('[data-hood-cards]'); if(hc){const slugs=hc.dataset.hoodCards.split(','); hc.innerHTML=slugs.map(s=>{const h=D.hoods.find(x=>x.slug===s); if(!h) return ''; const nm=h.name.split(' '); return `<a class="area reveal" href="neighborhood.html?n=${h.slug}"><img src="assets/img/${h.img}.webp" alt="${esc(h.name)}" loading="lazy"><span>${nm.map(esc).join('<br>')}</span></a>`;}).join(''); SC.reveal();}
/* featured */
const feat=$('#featured'); const pool=D.listings.filter(l=>l.status==='Active');
const render=k=>{let L=k==='all'?pool.filter(l=>l.flag):pool.filter(l=>l.flag===k); feat.innerHTML=L.slice(0,4).map(card).join('')||'<div class="empty" style="grid-column:1/-1"><h3>Nothing here right now</h3><p>No homes match this filter today. Try All Homes.</p></div>';};
feat.innerHTML='<div class="skeleton" style="aspect-ratio:.82"></div>'.repeat(4); setTimeout(()=>render('all'),250);
$$('[data-feat]').forEach(b=>b.addEventListener('click',()=>{$$('[data-feat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); render(b.dataset.feat); SC.track('featured_filter',{filter:b.dataset.feat});}));
/* counts */
$$('[data-count]').forEach(s=>{const [a,b]=s.dataset.count.split('-').map(Number); s.textContent=D.listings.filter(l=>l.price>=a&&l.price<=b).length;});
/* quiz, factual criteria only */
const traits={uptown:['walkable','light-rail','near-uptown'],"south-end":['walkable','light-rail','near-uptown','greenway'],dilworth:['walkable','greenway','near-uptown'],"myers-park":['greenway'],eastover:['greenway'],elizabeth:['walkable','greenway','near-uptown'],"plaza-midwood":['walkable','near-uptown'],noda:['walkable','light-rail'],southpark:['walkable','greenway'],ballantyne:['greenway','space'],"south-charlotte":['space','greenway'],"mint-hill":['space'],"union-county":['space'],"lake-norman":['lake','space']};
const zone={uptown:['uptown','south-end','dilworth','elizabeth','plaza-midwood','noda','myers-park','eastover'],south:['southpark','ballantyne','south-charlotte','union-county','myers-park'],north:['lake-norman','noda'],remote:D.hoods.map(h=>h.slug)};
const q=$('#quiz'); q&&q.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(q); const budget=+fd.get('budget')*1000, ht=fd.get('htype'), cm=fd.get('commute'), want=fd.getAll('want');
  const scored=D.hoods.map(h=>{const L=D.listings.filter(l=>l.hood===h.slug); const fits=L.filter(l=>l.price<=budget*1.05&&(ht==='any'||l.type===ht)).length; let s=fits*2; if(zone[cm].includes(h.slug)) s+=4; want.forEach(w=>{if((traits[h.slug]||[]).includes(w)) s+=3;}); return {h,s,fits};}).filter(x=>x.fits>0).sort((a,b)=>b.s-a.s).slice(0,3);
  $('#quiz-out').innerHTML=scored.length?`<p style="font-size:13.5px;margin:4px 0 10px">Based on your answers, start with:</p><div class="match-grid">${scored.map(({h,fits})=>`<a class="match" href="neighborhood.html?n=${h.slug}"><img src="assets/img/${h.img}.webp" alt="" loading="lazy"><div><strong>${esc(h.name)}</strong><small>${fits} sample ${fits===1?"home":"homes"} in budget</small></div></a>`).join('')}</div>`:'<div class="empty"><h3>No exact matches</h3><p>Try widening your budget or choosing “Open to all” home types.</p></div>';
  SC.track('neighborhood_quiz_complete',{budget:fd.get('budget'),home_type:ht,commute:cm,wants:want.join('|')});});
/* market insights from verified source file */
fetch('assets/data/market-insights.json').then(r=>r.ok?r.json():Promise.reject()).then(m=>{const g=$('#mkt-grid'); const all=(m.metrics||m); const want=['Median sales price','Active inventory','Months supply','Average days on market']; const items=want.map(w=>all.find(x=>x.metric.startsWith(w))).filter(Boolean);
  g.innerHTML=items.map(x=>`<div class="mkt"><div class="v">${esc(x.display||x.value)}</div><div class="l">${esc(x.metric)}</div><div class="p">${esc(x.geography)} · ${esc(x.period)}</div>${x.change?`<div class="chg">${esc(x.change)}</div>`:''}</div>`).join('');
  const srcs=[...new Map(items.map(x=>[x.url,x])).values()]; $('#mkt-src').innerHTML='Source: '+srcs.map(x=>`<a href="${esc(x.url)}" style="text-decoration:underline" rel="noopener" target="_blank">${esc(x.source)}</a>`).join(', ')+'. Figures are for the period shown and are not a forecast.';})
.catch(()=>{$('#mkt-grid').innerHTML='<div class="mkt-empty">Market figures are loading from our verified source feed. See the <a href="market.html" style="text-decoration:underline">full market report</a>.</div>';});
/* mini map */
if(window.L&&$('#mini-map')){const m=L.map('mini-map',{zoomControl:false,attributionControl:true,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView([35.2,-80.84],10);
 window.scTiles().addTo(m);
 m.fitBounds(L.latLngBounds(D.listings.filter(l=>l.lat<35.3).map(l=>[l.lat,l.lng])).pad(.05)); D.listings.filter(l=>l.lat<35.3&&l.status==='Active').filter((l,i)=>i%2===0).forEach(l=>L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null})}).addTo(m));}
})();

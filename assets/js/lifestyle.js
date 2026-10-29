/* Live Where You Love, rank (sample) listings by nearby OpenStreetMap amenities + commute estimate. */
(function(){'use strict';const SC=window.SC,{D,$,$$,esc,fmt,short,track}=SC;
const CATS=[['restaurants','Restaurants'],['cafes','Coffee shops'],['bars','Nightlife & breweries'],['grocery','Grocery'],['shopping','Shopping'],['parks','Parks'],['trails','Greenways'],['golf','Golf courses'],['water','Lakes & boating'],['venues','Entertainment & arts'],['fitness','Gyms & recreation'],['transit','Light rail & transit']];
const COL={restaurants:'#B4472F',cafes:'#8A5A3C',bars:'#6B2C5C',grocery:'#2F7A4A',shopping:'#C99A4B',parks:'#3E7D3A',trails:'#5E8F4F',golf:'#1F6B4F',water:'#2B6A99',venues:'#4A2445',fitness:'#A2652B',transit:'#1E140D'};
const saved=SC.db.get('sc_lifestyle_search',null);
let S=saved||{cats:{},dest:'',maxMin:20,max:'',beds:0};
const dest=$('#lw-dest'); SC.LANDMARKS.forEach(l=>dest.insertAdjacentHTML('beforeend',`<option value="${l.id}">${esc(l.name)}</option>`));
const renderCats=()=>{$('#lw-cats').innerHTML=CATS.map(([k,v])=>{const c=S.cats[k]; return `<div class="lw-cat${c?' on':''}" style="--c:${COL[k]}"><label><input type="checkbox" data-k="${k}"${c?' checked':''}><span>${v}</span></label>
 <span class="lw-opt"${c?'':' hidden'}>at least <select data-n="${k}" aria-label="${v} minimum count">${[1,2,3,5,10].map(n=>`<option${c&&c.min==n?' selected':''}>${n}</option>`).join('')}</select> within <select data-r="${k}" aria-label="${v} radius">${[0.5,1,2,3,5].map(r=>`<option value="${r}"${(c?c.mi:1)==r?' selected':''}>${r} mi</option>`).join('')}</select></span></div>`;}).join('');};
const sync=()=>{dest.value=S.dest; $('#lw-min').value=S.maxMin; $('#lw-max').value=S.max; $('#lw-beds').value=S.beds;};
renderCats(); sync();
/* per-listing places cache */
const listings=D.listings.filter(l=>l.status!=='Under Contract'); const placeCache={};
const placesFor=l=>placeCache[l.id]||(placeCache[l.id]=SC.poi.near(l.lat,l.lng,5));
let map,mk=L.layerGroup(),pl=L.layerGroup(),ring=L.layerGroup();
map=L.map('lw-map',{scrollWheelZoom:false}).setView([35.2,-80.84],10); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map); mk.addTo(map); pl.addTo(map); ring.addTo(map);
let run=0;
async function update(){const my=++run; const cats=Object.entries(S.cats); const lm=S.dest?SC.lmk(S.dest):null;
 $('#lw-count').textContent='Checking places near each home…';
 const rows=[];
 for(const l of listings){ if(S.max&&l.price>+S.max) continue; if(S.beds&&l.beds<+S.beds) continue;
  const P=cats.length?await placesFor(l):[]; if(my!==run) return;
  const hits=cats.map(([k,c])=>{const n=P.filter(p=>p.cat===k&&p.mi<=c.mi); return {k,c,n:n.length,near:n[0]};});
  const dr=lm?SC.drive([l.lat,l.lng],[lm.lat,lm.lng]):null;
  const met=hits.filter(h=>h.n>=h.c.min).length+(dr?(dr.minutes<=S.maxMin?1:0):0); const tot=hits.length+(dr?1:0);
  const part=hits.reduce((s,h)=>s+Math.min(1,h.n/h.c.min),0)+(dr?Math.max(0,Math.min(1,(S.maxMin*1.5-dr.minutes)/(S.maxMin*0.5))):0);
  rows.push({l,hits,dr,met,tot,score:tot?Math.round(part/tot*100):null});}
 rows.sort((a,b)=>(b.score??0)-(a.score??0)||b.met-a.met||a.l.price-b.l.price);
 const full=rows.filter(r=>r.tot&&r.met===r.tot).length;
 $('#lw-count').textContent=!rows.length?'No sample homes match your price and bedroom filters.':(rows[0].tot?`${full} of ${rows.length} sample homes meet every lifestyle requirement; the rest are ranked by how close they come.`:`${rows.length} sample homes. Pick places you want nearby to rank them.`);
 $('#lw-list').innerHTML=rows.slice(0,24).map(r=>`<article class="lw-item${r.tot&&r.met===r.tot?' full':''}">${SC.card(r.l)}<div class="lw-why">${r.score!=null?`<p class="lw-score"><strong>${r.score}%</strong> lifestyle fit <span>${r.met} of ${r.tot} requirements met</span></p>`:''}<ul>${r.hits.map(h=>`<li class="${h.n>=h.c.min?'ok':'no'}"><i style="--c:${COL[h.k]}"></i>${h.n} ${esc(CATS.find(c=>c[0]===h.k)[1].toLowerCase())} within ${h.c.mi} mi${h.near?` <small>nearest: ${esc(h.near.name)}, ${h.near.mi.toFixed(1)} mi</small>`:''}</li>`).join('')}${r.dr?`<li class="${r.dr.minutes<=S.maxMin?'ok':'no'}"><i style="--c:#1E140D"></i>~${r.dr.minutes} min to ${esc(lm.name)} <small>estimate</small></li>`:''}</ul></div></article>`).join('');
 mk.clearLayers(); pl.clearLayers(); ring.clearLayers();
 rows.slice(0,24).forEach((r,i)=>L.marker([r.l.lat,r.l.lng],{zIndexOffset:1000-i,icon:L.divIcon({className:'pin'+(r.tot&&r.met===r.tot?' pin-hi':''),html:`<span>${short(r.l.price)}${r.score!=null?' · '+r.score+'%':''}</span>`,iconSize:null})}).addTo(mk).on('click',()=>location.href='listing.html?id='+r.l.id));
 if(lm){L.circleMarker([lm.lat,lm.lng],{radius:9,color:'#fff',weight:2,fillColor:'#C99A4B',fillOpacity:1}).bindTooltip(esc(lm.name),{permanent:true,direction:'top',className:'lw-tip'}).addTo(ring);}
 const top=rows.slice(0,6); const seen=new Set();
 for(const r of top){ if(!cats.length) break; const P=await placesFor(r.l); P.filter(p=>S.cats[p.cat]&&p.mi<=S.cats[p.cat].mi).slice(0,60).forEach(p=>{const k=p.name+p.lat; if(seen.has(k)) return; seen.add(k); L.circleMarker([p.lat,p.lng],{radius:4.5,color:'#fff',weight:1,fillColor:COL[p.cat],fillOpacity:.9}).bindTooltip(esc(p.name)).addTo(pl);});}
 $('#lw-legend').innerHTML=cats.map(([k])=>`<span><i style="background:${COL[k]}"></i>${esc(CATS.find(c=>c[0]===k)[1])}</span>`).join('');
 const pts=rows.slice(0,24).map(r=>[r.l.lat,r.l.lng]); if(lm) pts.push([lm.lat,lm.lng]); if(pts.length) map.fitBounds(L.latLngBounds(pts).pad(.12));
 SC.reveal&&SC.reveal();}
/* events */
$('#lw-cats').addEventListener('change',e=>{const t=e.target; if(t.dataset.k){if(t.checked) S.cats[t.dataset.k]={min:1,mi:1}; else delete S.cats[t.dataset.k]; renderCats(); track('lifestyle_filter',{category:t.dataset.k,on:t.checked});}
 if(t.dataset.n) S.cats[t.dataset.n].min=+t.value; if(t.dataset.r) S.cats[t.dataset.r].mi=+t.value; update();});
[['#lw-dest','dest'],['#lw-min','maxMin'],['#lw-max','max'],['#lw-beds','beds']].forEach(([s,k])=>$(s).addEventListener('change',e=>{S[k]=k==='dest'||k==='max'?e.target.value:+e.target.value; update();}));
$('#lw-reset').addEventListener('click',()=>{S={cats:{},dest:'',maxMin:20,max:'',beds:0}; renderCats(); sync(); update();});
$('#lw-save').addEventListener('click',()=>{SC.db.set('sc_lifestyle_search',S); SC.setPrefs({lifestyle:Object.entries(S.cats).map(([cat,c])=>({cat,maxMi:c.mi,min:c.min})),commute:S.dest?Object.assign({},SC.lmk(S.dest),{label:SC.lmk(S.dest).name,maxMin:S.maxMin}):null}); SC.toast('Lifestyle saved to your Passport and Home Match'); track('lifestyle_save',{});});
/* natural-language parse */
const NUM={one:1,two:2,three:3,four:4,five:5,ten:10};
const parse=q=>{const t=q.toLowerCase(); const n=S; n.cats={};
 const want=(k,re)=>{const m=t.match(re); if(!m) return; const near=t.slice(Math.max(0,m.index-30),m.index); const c=near.match(/(?:at least|minimum of|min)\s+(\d+|one|two|three|four|five|ten)\s*$/)||near.match(/(\d+|one|two|three|four|five)\s*\+?\s*$/); n.cats[k]={min:c?(+c[1]||NUM[c[1]]||1):1,mi:/walk/.test(t)&&['restaurants','cafes','bars','shopping','grocery'].includes(k)?1:(k==='golf'||k==='water'?5:2)};};
 want('restaurants',/restaurant|dining|food/); want('cafes',/coffee|caf[eé]|bakery/); want('bars',/nightlife|bars?\b|brewer/); want('grocery',/grocer|supermarket|trader joe|harris teeter|whole foods/); want('shopping',/shopping|shops|boutique|mall(?! )/);
 want('parks',/\bparks?\b/); want('trails',/greenway|trail/); want('golf',/golf/); want('water',/lake|boat|marina/); want('venues',/entertainment|music|concert|theat|museum|arts?\b/); want('fitness',/gym|fitness|recreation|tennis|pickleball/); want('transit',/light rail|lynx|transit|train/);
 const m=t.match(/within\s+(\d+)\s*(?:min|minutes)\s+(?:of|to|from)\s+([a-z .'()]+?)(?:\s+and|,|$)/); if(m){const nm=m[2].trim(); const lm=SC.LANDMARKS.find(x=>x.name.toLowerCase().includes(nm.replace(/^the /,''))||nm.includes(x.id.replace(/-/g,' '))||(nm.includes('airport')&&x.id==='clt')||(nm.includes('uptown')&&x.id==='uptown')||(nm.includes('southpark')&&x.id==='southpark-mall')); if(lm){n.dest=lm.id; n.maxMin=[10,15,20,30,45].reduce((a,b)=>Math.abs(b-+m[1])<Math.abs(a-+m[1])?b:a);}}
 const p=t.match(/(?:under|below|up to|max)\s*\$?\s*([\d.,]+)\s*([km])?/); if(p){let v=parseFloat(p[1].replace(/,/g,'')); if(p[2]==='k'||v<10000) v*=p[2]==='m'?1e6:1000; if(p[2]==='m') v=parseFloat(p[1])*1e6; const opts=[400000,600000,750000,900000,1250000,2000000]; n.max=String(opts.find(o=>o>=v)||2000000);}
 const b=t.match(/(\d+|two|three|four|five)\s*[- ]?(?:bed|br|bedroom)/); if(b) n.beds=Math.min(5,+b[1]||NUM[b[1]]);
 renderCats(); sync(); update(); track('lifestyle_ask',{q});};
$('#lw-ask').addEventListener('submit',e=>{e.preventDefault(); const q=$('#lw-q').value.trim(); if(q) parse(q);});
$$('[data-ex]').forEach(b=>b.addEventListener('click',()=>{$('#lw-q').value=b.dataset.ex; parse(b.dataset.ex);}));
$('.lw-ask .mic').innerHTML=SC.micIcon;
const qp=new URLSearchParams(location.search).get('q'); if(qp){$('#lw-q').value=qp; parse(qp);} else update();
})();

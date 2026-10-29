/* Search results: every control filters the data set. Production swaps this for Showcase IDX. */
(function(){const {D,$,$$,card,esc,short,fmt,track}=window.SC;
const P=new URLSearchParams(location.search);
const PRICES=[0,200000,300000,400000,500000,600000,750000,1000000,1500000,2000000,3000000,5000000];
const st={q:P.get('q')||'',min:+P.get('min')||0,max:+P.get('max')||0,beds:+P.get('beds')||0,baths:+P.get('baths')||0,
 type:P.get('type')?P.get('type').split(','):['Single Family','Townhouse','Condo','Land'],
 status:P.get('status')?P.get('status').split(','):['Active','Coming Soon'],
 flag:P.get('flag')?P.get('flag').split(','):[],feat:P.get('feat')?P.get('feat').split(','):[],
 sqft:+P.get('sqft')||0,lot:+P.get('lot')||0,hoa:P.has('hoa')?+P.get('hoa'):99999,dom:+P.get('dom')||999,
 sort:P.get('sort')||'new',page:1,saved:P.get('saved')==='1',bounds:null,poly:null};
if(['pool','waterfront','garage'].includes(st.q.toLowerCase())){st.feat=[st.q.toLowerCase()];st.q='';}
const TYPES=['Single Family','Townhouse','Condo','Land'];
if(st.type.length===1&&!TYPES.includes(st.type[0])) st.type=TYPES;
/* populate controls */
const opt=(v,lbl)=>`<option value="${v}">${lbl}</option>`;
$('#f-min').innerHTML=PRICES.map(v=>opt(v,v?short(v):'No min')).join(''); $('#f-max').innerHTML=[...PRICES.slice(1),0].map(v=>opt(v,v?short(v):'No max')).join('');
const setSel=(el,v)=>{if(![...el.options].some(o=>+o.value===v)) el.insertAdjacentHTML('beforeend',opt(v,short(v))); el.value=v;};
setSel($('#f-min'),st.min); setSel($('#f-max'),st.max); $('#s-q').value=st.q; $('#sort').value=st.sort;
$('#f-sqft').value=String(st.sqft); $('#f-lot').value=String(st.lot||0); $('#f-hoa').value=String(st.hoa); $('#f-dom').value=String(st.dom);
$$('[data-seg]').forEach(s=>{$$('button',s).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.v===st[s.dataset.seg]));});
$$('[data-checks]').forEach(c=>$$('input',c).forEach(i=>i.checked=st[c.dataset.checks].includes(i.value)));
/* matching */
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const matchQ=l=>{if(!st.q) return true; const q=norm(st.q.replace(/-/g,' ')); return [l.hood.replace(/-/g,' '),l.hoodName,l.city,l.zip,l.address,l.city+' nc'].some(x=>norm(x).includes(q)||q.includes(norm(x))&&norm(x).length>3);};
const inPoly=(pt,poly)=>{let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j]; if(((a.lat>pt[0])!==(b.lat>pt[0]))&&(pt[1]<(b.lng-a.lng)*(pt[0]-a.lat)/(b.lat-a.lat)+a.lng)) c=!c;} return c;};
const filtered=()=>{const sv=SC.saved(); let L=D.listings.filter(l=>{
  if(st.saved) return sv.includes(l.id);
  if(!matchQ(l)) return false; if(st.min&&l.price<st.min) return false; if(st.max&&l.price>st.max) return false;
  if(st.beds&&l.beds<st.beds) return false; if(st.baths&&l.baths<st.baths) return false;
  if(!st.type.includes(l.type)) return false; if(!st.status.includes(l.status)) return false;
  if(st.flag.length&&!st.flag.includes(l.flag)) return false;
  if(st.feat.includes('pool')&&!l.pool) return false; if(st.feat.includes('waterfront')&&!l.waterfront) return false; if(st.feat.includes('garage')&&!l.garage) return false;
  if(st.sqft&&l.sqft<st.sqft) return false; if(st.lot&&l.acres<st.lot) return false; if(l.hoa>st.hoa) return false; if(l.dom>st.dom) return false;
  if(st.bounds&&!st.bounds.contains([l.lat,l.lng])) return false; if(st.poly&&!inPoly([l.lat,l.lng],st.poly)) return false; return true;});
  const S={new:(a,b)=>a.dom-b.dom,pa:(a,b)=>a.price-b.price,pd:(a,b)=>b.price-a.price,beds:(a,b)=>b.beds-a.beds,sqft:(a,b)=>b.sqft-a.sqft}; return L.sort(S[st.sort]);};
/* url sync */
const toQS=()=>{const p=new URLSearchParams(); if(st.saved){p.set('saved','1');return p;} if(st.q)p.set('q',st.q); if(st.min)p.set('min',st.min); if(st.max)p.set('max',st.max); if(st.beds)p.set('beds',st.beds); if(st.baths)p.set('baths',st.baths);
 if(st.type.length<4)p.set('type',st.type.join(',')); if(st.status.join()!=='Active,Coming Soon')p.set('status',st.status.join(',')); if(st.flag.length)p.set('flag',st.flag.join(',')); if(st.feat.length)p.set('feat',st.feat.join(','));
 if(st.sqft)p.set('sqft',st.sqft); if(st.lot)p.set('lot',st.lot); if(st.hoa!==99999)p.set('hoa',st.hoa); if(st.dom!==999)p.set('dom',st.dom); if(st.sort!=='new')p.set('sort',st.sort); return p;};
/* chips of active filters */
const chips=()=>{const c=[]; if(st.saved) c.push(['saved','Saved homes only']); if(st.q) c.push(['q','“'+st.q+'”']); if(st.min||st.max) c.push(['price',(st.min?short(st.min):'$0')+' – '+(st.max?short(st.max):'Any')]);
 if(st.beds) c.push(['beds',st.beds+'+ beds']); if(st.baths) c.push(['baths',st.baths+'+ baths']); if(st.type.length<4) c.push(['type',st.type.join(', ')]); st.flag.forEach(f=>c.push(['flag:'+f,f.replace(' Sat 11–2','')])); st.feat.forEach(f=>c.push(['feat:'+f,f[0].toUpperCase()+f.slice(1)]));
 if(st.sqft) c.push(['sqft',st.sqft.toLocaleString()+'+ sqft']); if(st.lot) c.push(['lot',st.lot+'+ acres']); if(st.hoa!==99999) c.push(['hoa',st.hoa?'HOA ≤ $'+st.hoa:'No HOA']); if(st.dom!==999) c.push(['dom','≤ '+st.dom+' days']); if(st.poly) c.push(['poly','Drawn area']); if(st.bounds) c.push(['bounds','Map area']); return c;};
const clear=k=>{const [a,b]=k.split(':'); if(a==='price'){st.min=st.max=0;setSel($('#f-min'),0);setSel($('#f-max'),0);} else if(a==='flag'||a==='feat'){st[a]=st[a].filter(x=>x!==b);} else if(a==='type'){st.type=[...TYPES];} else if(a==='q'){st.q='';$('#s-q').value='';} else if(a==='poly'){clearPoly();} else if(a==='bounds'){st.bounds=null;$('#bounds-chk').checked=false;} else if(a==='hoa'){st.hoa=99999;} else if(a==='dom'){st.dom=999;} else if(a==='saved'){st.saved=false;} else st[a]=0; syncControls(); run();};
const syncControls=()=>{$$('[data-seg]').forEach(s=>$$('button',s).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.v===st[s.dataset.seg]))); $$('[data-checks]').forEach(c=>$$('input',c).forEach(i=>i.checked=st[c.dataset.checks].includes(i.value)));
 $('#f-sqft').value=String(st.sqft); $('#f-lot').value=String(st.lot||0); $('#f-hoa').value=String(st.hoa); $('#f-dom').value=String(st.dom);
 $('[data-f="price"]').classList.toggle('has-value',!!(st.min||st.max)); $('[data-f="beds"]').classList.toggle('has-value',!!(st.beds||st.baths)); $('[data-f="type"]').classList.toggle('has-value',st.type.length<4);
 $('[data-f="more"]').classList.toggle('has-value',!!(st.flag.length||st.feat.length||st.sqft||st.lot||st.hoa!==99999||st.dom!==999||st.status.join()!=='Active,Coming Soon'));};
/* map */
let map,layer,markers={};
if(window.L){map=L.map('map',{zoomControl:false}).setView([35.2,-80.84],10); L.control.zoom({position:'topright'}).addTo(map);
 const zc=()=>map.getContainer().classList.toggle('lowzoom',map.getZoom()<12); map.on('zoomend',zc); zc();
 window.scTiles().addTo(map);
 layer=L.layerGroup().addTo(map);}
const PER=12;
const title=()=>{if(st.saved) return 'Your saved homes'; const h=D.hoods.find(x=>x.slug===st.q.toLowerCase()||x.name.toLowerCase()===st.q.toLowerCase()); const base=h?h.name+(h.city==='Charlotte'?' Charlotte NC':', NC'):st.q?(/^[a-z0-9]+(-[a-z0-9]+)+$|^[a-z]+$/.test(st.q)?st.q.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '):st.q):'Charlotte NC';
 const t=st.flag.length===1?st.flag[0].replace(' Sat 11–2','s'):st.type.length===1?({'Condo':'Condos','Townhouse':'Townhomes','Single Family':'Houses','Land':'Land'})[st.type[0]]:'Homes'; return `${base} ${t.toLowerCase()==='homes'?'real estate & homes':t} for sale`;};
let first=true;
function run(fit){const L_=filtered(); const pages=Math.max(1,Math.ceil(L_.length/PER)); st.page=Math.min(st.page,pages);
 $('#list-title').textContent=title(); document.title=title()+' | SearchCharlotte.com';
 $('#list-count').textContent=`${L_.length} ${L_.length===1?'result':'results'} · sample data`;
 $('#active-filters').innerHTML=chips().map(([k,l])=>`<button data-clear="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)}</button>`).join('');
 const slice=L_.slice((st.page-1)*PER,st.page*PER);
 $('#list').innerHTML=slice.length?slice.map(card).join(''):`<div class="empty" style="grid-column:1/-1"><h3>${st.saved?'No saved homes yet':'No homes match every filter'}</h3><p>${st.saved?'Tap the heart on any home to save it here.':'Try removing a filter or zooming the map out.'}</p><a class="btn btn-sm" href="search.html">${st.saved?'Browse homes':'Reset all filters'}</a></div>`;
 $('#pager').innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" ${i+1===st.page?'aria-current="page"':''}>${i+1}</button>`).join(''):'';
 syncControls(); history.replaceState(null,'','search.html'+(toQS().toString()?'?'+toQS():''));
 if(map){layer.clearLayers(); markers={}; const sv=SC.saved();
  L_.forEach(l=>{const m=L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin'+(sv.includes(l.id)?' saved':''),html:`<span>${short(l.price)}</span>`,iconSize:null}),riseOnHover:true,title:l.address});
   m.bindPopup(`<a class="pop-card" href="listing.html?id=${l.id}"><img src="assets/img/${l.img}.webp" alt=""><span><b>${fmt(l.price)}</b><small>${esc(SC.facts(l))}</small><small>${esc(l.address)}, ${esc(l.city)}</small><small style="color:#8a6d3b">Sample data</small></span></a>`,{closeButton:false});
   m.on('mouseover',()=>hl(l.id,true)); m.on('mouseout',()=>hl(l.id,false)); m.addTo(layer); markers[l.id]=m;});
  if((fit||first)&&L_.length&&!st.bounds){map.fitBounds(L.latLngBounds(L_.map(l=>[l.lat,l.lng])).pad(.15),{maxZoom:14,animate:!first});}}
 first=false; track('idx_search_results',{result_count:L_.length,filters:toQS().toString()});}
const hl=(id,on)=>{const c=$(`.card[data-id="${id}"]`); c&&c.classList.toggle('is-hover',on); const m=markers[id]; if(m){const e=m.getElement(); e&&e.classList.toggle('hot',on); m.setZIndexOffset(on?1000:0);}};
$('#list').addEventListener('mouseover',e=>{const c=e.target.closest('.card'); if(c) hl(c.dataset.id,true);});
$('#list').addEventListener('mouseout',e=>{const c=e.target.closest('.card'); if(c) hl(c.dataset.id,false);});
/* events */
$('#active-filters').addEventListener('click',e=>{const b=e.target.closest('[data-clear]'); b&&clear(b.dataset.clear);});
$('#pager').addEventListener('click',e=>{const b=e.target.closest('[data-page]'); if(!b) return; st.page=+b.dataset.page; run(); $('.list-col').scrollTo({top:0,behavior:'smooth'}); scrollTo({top:0,behavior:'smooth'});});
$$('.fdd').forEach(d=>{const b=$('.fbtn',d); b.addEventListener('click',e=>{e.stopPropagation(); const o=!d.classList.contains('open'); $$('.fdd').forEach(x=>{x.classList.remove('open');$('.fbtn',x).setAttribute('aria-expanded','false');}); d.classList.toggle('open',o); b.setAttribute('aria-expanded',o);}); $('.fpanel',d).addEventListener('click',e=>e.stopPropagation());});
document.addEventListener('click',()=>$$('.fdd').forEach(x=>{x.classList.remove('open');$('.fbtn',x).setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape') $$('.fdd').forEach(x=>x.classList.remove('open'));});
const re=()=>{st.page=1;st.saved=false;run(true);};
$('#f-min').addEventListener('change',e=>{st.min=+e.target.value; if(st.max&&st.min>st.max){st.max=0;setSel($('#f-max'),0);} re();});
$('#f-max').addEventListener('change',e=>{st.max=+e.target.value; re();});
$$('[data-seg]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; st[s.dataset.seg]=+b.dataset.v; re();}));
$$('[data-checks]').forEach(c=>c.addEventListener('change',()=>{const v=$$('input:checked',c).map(i=>i.value); if(c.dataset.checks==='type'&&!v.length){SC.toast('Choose at least one home type');$$('input',c)[0].checked=true;return;} if(c.dataset.checks==='status'&&!v.length){SC.toast('Choose at least one status');$$('input',c)[0].checked=true;return;} st[c.dataset.checks]=v; re();}));
[['f-sqft','sqft'],['f-lot','lot'],['f-hoa','hoa'],['f-dom','dom']].forEach(([id,k])=>$('#'+id).addEventListener('change',e=>{st[k]=+e.target.value; re();}));
$('#sort').addEventListener('change',e=>{st.sort=e.target.value; run();});
/* in-page location search (override global redirect) */
const f=$('.sbar-loc'); f.addEventListener('submit',e=>{e.preventDefault(); e.stopImmediatePropagation(); st.q=$('#s-q').value.trim(); if(['pool','waterfront','garage'].includes(st.q.toLowerCase())){st.feat=[st.q.toLowerCase()];st.q='';$('#s-q').value='';} clearPoly(); st.bounds=null; $('#bounds-chk').checked=false; $('.suggest',f)&&$('.suggest',f).classList.remove('open'); re();},true);
/* search as I move */
if(map){$('#bounds-chk').addEventListener('change',e=>{st.bounds=e.target.checked?map.getBounds():null; re();});
 map.on('moveend',()=>{if($('#bounds-chk').checked){st.bounds=map.getBounds(); st.page=1; run();}});}
/* draw boundary */
let pts=[],tmp=null,drawing=false;
function clearPoly(){st.poly=null; if(tmp&&map){map.removeLayer(tmp);tmp=null;} pts=[];}
const stopDraw=()=>{drawing=false; $('#draw-hint').hidden=true; $('#draw-btn').classList.remove('on'); map&&map.getContainer().style.removeProperty('cursor'); map&&map.doubleClickZoom.enable();};
if(map){$('#draw-btn').addEventListener('click',()=>{if(drawing){stopDraw();clearPoly();run();return;} clearPoly(); drawing=true; $('#draw-hint').hidden=false; $('#draw-btn').classList.add('on'); map.getContainer().style.cursor='crosshair'; map.doubleClickZoom.disable(); track('map_draw_start');});
 $('#draw-cancel').addEventListener('click',()=>{stopDraw();clearPoly();run();});
 const finish=()=>{if(pts.length<3){SC.toast('Place at least 3 points');return;} st.poly=pts.slice(); stopDraw(); if(tmp) map.removeLayer(tmp); tmp=L.polygon(st.poly,{color:'#141414',weight:2,fillColor:'#C99A4B',fillOpacity:.12}).addTo(map); st.page=1; run(); track('map_draw_complete',{points:st.poly.length});};
 map.on('click',e=>{if(!drawing) return; if(pts.length>2&&map.latLngToContainerPoint(pts[0]).distanceTo(e.containerPoint)<14){finish();return;} pts.push(e.latlng); if(tmp) map.removeLayer(tmp); tmp=L.polyline(pts,{color:'#141414',weight:2,dashArray:'4 4'}).addTo(map);});
 map.on('dblclick',()=>drawing&&finish());}
/* mobile toggle */
const tg=$('#map-toggle'); tg.addEventListener('click',()=>{const on=$('#results').classList.toggle('show-map'); tg.setAttribute('aria-pressed',on); $('span',tg).textContent=on?'List':'Map'; tg.querySelector('svg').style.display=on?'none':''; if(on&&map) setTimeout(()=>{map.invalidateSize(); run(true);},50);});
if(P.get('view')==='map'&&innerWidth<=980) tg.click();
/* save search */
$('#save-search').addEventListener('click',()=>{$('#save-summary').innerHTML=(chips().length?chips():[['','All Charlotte homes']]).map(([,l])=>`<span class="chip" style="pointer-events:none">${esc(l)}</span>`).join(''); track('save_search_open');});
document.addEventListener('click',e=>{if(e.target.closest('.fav')) setTimeout(()=>st.saved?run():Object.entries(markers).forEach(([id,m])=>{const el=m.getElement(); el&&el.classList.toggle('saved',SC.saved().includes(id));}),0);});

/* ---- map layers: places (OSM extract) + FEMA NFHL flood zones ---- */
if(map){const LC=['restaurants','cafes','bars','grocery','shopping','parks','trails','golf','water','venues','fitness','transit','schools'];
 const COL={restaurants:'#B4532A',cafes:'#8a5a3b',bars:'#6b2f5f',grocery:'#2f6b3a',shopping:'#4A2445',parks:'#2e7d4f',trails:'#5f8f3e',golf:'#3f7f5f',water:'#2a6fa8',venues:'#C99A4B',fitness:'#555',transit:'#163B35',schools:'#7a6a2a'};
 $('#lyr-poi').innerHTML=LC.map(c=>`<label class="lyr"><input type="checkbox" value="${c}"><i style="background:${COL[c]}"></i>${esc(SC.poi.label(c))}</label>`).join('');
 const pl=L.layerGroup().addTo(map); let on=[];
 const drawPoi=async()=>{pl.clearLayers(); if(!on.length) return; if(map.getZoom()<12){SC.toast('Zoom in to see places on the map');return;} const c=map.getCenter(), b=map.getBounds(); const r=Math.min(6,Math.max(.5,c.distanceTo(b.getNorthEast())/1609)); const ps=(await SC.poi.near(c.lat,c.lng,r,on)).filter(p=>b.contains([p.lat,p.lng])).slice(0,400);
  ps.forEach(p=>L.circleMarker([p.lat,p.lng],{radius:5,weight:1.5,color:'#fff',fillColor:COL[p.cat],fillOpacity:.95}).bindPopup(`<b>${esc(p.name)}</b><br><small>${esc(SC.poi.label(p.cat))}${p.sub?' · '+esc(String(p.sub).replace(/_/g,' ')):''}</small>`,{closeButton:false}).addTo(pl));
  if(ps.length===400) SC.toast('Showing the closest 400 places, zoom in for more');};
 $('#lyr-poi').addEventListener('change',()=>{on=$$('#lyr-poi input:checked').map(i=>i.value); drawPoi(); track('map_layer_toggle',{layers:on.join(',')});});
 map.on('moveend',()=>on.length&&drawPoi());
 const R=6378137*Math.PI; const FDL=encodeURIComponent(JSON.stringify([{id:28,source:{type:'mapLayer',mapLayerId:28},definitionExpression:"FLD_ZONE IN ('A','AE','AO','AH','VE')",drawingInfo:{showLabels:false,renderer:{type:'simple',symbol:{type:'esriSFS',style:'esriSFSSolid',color:[29,94,216,170],outline:{type:'esriSLS',style:'esriSLSSolid',color:[20,80,160,220],width:0.7}}}}}])); const Flood=L.TileLayer.extend({getTileUrl(t){const n=Math.pow(2,t.z), s=2*R/n; const x1=-R+t.x*s, y2=R-t.y*s; return `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export?bbox=${x1},${y2-s},${x1+s},${y2}&bboxSR=3857&imageSR=3857&size=256,256&dpi=96&format=png32&transparent=true&dynamicLayers=${FDL}&f=image`;}});
 window.__scmap=map; const flood=new Flood('',{minZoom:14,maxZoom:19,opacity:.9,attribution:'Flood zones: FEMA NFHL'});
 $('#lyr-flood').addEventListener('change',e=>{if(e.target.checked){flood.addTo(map); if(map.getZoom()<14) SC.toast('Zoom in to street level to see flood zones');} else map.removeLayer(flood); track('map_layer_toggle',{layers:'flood'});});
 const lb=$('#layers-btn'), lp=$('#layers-panel'); lb.addEventListener('click',()=>{lp.hidden=!lp.hidden; lb.setAttribute('aria-expanded',!lp.hidden); lb.classList.toggle('on',!lp.hidden);});}
/* ---- save search to Passport (stores filters + map area / drawn boundary) ---- */
$('#m-save form').addEventListener('submit',()=>{const n=$('#ss-name').value.trim(); if(!n||!$('#ss-email').validity.valid) return;
 const qs=toQS().toString(); const label=(chips().map(c=>c[1]).join(' · ')||'All Charlotte homes');
 SC.db.update('sc_searches',[],a=>[{id:SC.uid?SC.uid('ss'):'ss'+Date.now(),name:label,qs,filters:Object.fromEntries(new URLSearchParams(qs)),poly:st.poly?st.poly.map(p=>[+p.lat.toFixed(5),+p.lng.toFixed(5)]):null,bounds:st.bounds?st.bounds.toBBoxString():null,freq:$('#ss-freq').value,created:new Date().toISOString()},...a].slice(0,50));
 track('save_search',{source:'search'});});
run();
})();

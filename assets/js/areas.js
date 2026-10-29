/* Neighborhoods, neighborhood detail, Explore Charlotte and Market pages.
   Reads verified content from assets/data/*.json; falls back to the short blurbs in data.js. */
(function(){const {D,$,$$,card,esc,short,track}=window.SC; const page=document.body.dataset.page;
const get=f=>fetch('assets/data/'+f).then(r=>r.ok?r.json():null).catch(()=>null);
const REGION={uptown:'central','south-end':'central',dilworth:'central','myers-park':'central',eastover:'central',elizabeth:'central','plaza-midwood':'central',noda:'central',southpark:'south',ballantyne:'south','south-charlotte':'south'};
const regionOf=h=>{const a=(h.area||'').toLowerCase(); if(REGION[h.slug]) return REGION[h.slug]; if(/uptown|inner ring/.test(a)) return 'central'; if(/south ?park|south charlotte|southwest/.test(a)) return 'south'; if(/union|lake norman|suburb/.test(a)||h._city) return 'towns'; return 'north-east-west';};
const IMGS=['brick-home','house-dusk','twilight-house','budget-500','budget-750','modern-dusk','buy-home','testimonial-home'];
const imgFor=(slug,i)=>{const h=D.hoods.find(x=>x.slug===slug); return h?h.img:IMGS[i%IMGS.length];};
const credit=h=>{const c=h&&h.img_credit; if(!c||typeof c!=='object') return ''; return `<span class="img-credit">Photo: ${c.source_url?`<a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(c.author||'Wikimedia Commons')}</a>`:esc(c.author||'')}${c.license?' / '+(c.license_url?`<a href="${esc(c.license_url)}" target="_blank" rel="noopener license">${esc(c.license)}</a>`:esc(c.license)):''}</span>`;};
const creditTxt=h=>{const c=h&&h.img_credit; return c&&typeof c==='object'&&c.author?`<span class="img-credit">Photo: ${esc(c.author)}${c.license?' / '+esc(c.license):''}</span>`:'';};
const pic=(img,alt)=>/^areas\//.test(img)?`<img src="assets/img/${img}-sm.webp" srcset="assets/img/${img}-sm.webp 640w, assets/img/${img}.webp 2560w" sizes="(max-width:700px) 100vw, 400px" alt="${esc(alt||'')}" loading="lazy">`:`<img src="assets/img/${img}.webp" alt="${esc(alt||'')}" loading="lazy">`;
const tiles=m=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(m);
const merge=(json)=>{const list=(json&&(json.neighborhoods||json))||[]; const by={}; D.hoods.forEach(h=>by[h.slug]={...h,summary:h.blurb}); (Array.isArray(list)?list:[]).forEach(n=>{by[n.slug]={...(by[n.slug]||{}),...n};}); return Object.values(by);};
const count=slug=>D.listings.filter(l=>l.hood===slug&&l.status!=='Under Contract').length;
const hoodCard=(h,i)=>`<a class="hood-card reveal" href="neighborhood.html?n=${h.slug}" data-region="${regionOf(h)}" data-text="${esc((h.name+' '+(h.city||'')+' '+(h.zip_codes||[h.zip]).join(' ')).toLowerCase())}">${pic(h.img||imgFor(h.slug,i),'')}<div><strong>${esc(h.name)}</strong><small>${esc(h.city||'Charlotte')}${h.zip_codes?' · '+h.zip_codes.slice(0,3).join(', '):h.zip?' · '+h.zip:''}</small><p>${esc((h.summary||h.blurb||'').split('. ')[0].replace(/\.?$/,'.'))}</p>${creditTxt(h)}</div></a>`;

if(page==='neighborhoods'){Promise.all([get('neighborhoods.json'),get('cities.json')]).then(([nj,cj])=>{let H=merge(nj);
  const cities=((cj&&(cj.cities||cj))||[]).filter(c=>c&&c.slug&&!H.some(h=>h.slug===c.slug)).map(c=>({...c,city:c.name,_city:true}));
  H=[...H,...cities]; const g=$('#hood-grid'); g.innerHTML=H.map(hoodCard).join(''); SC.reveal();
  let region='all'; const apply=()=>{const q=$('#hood-filter').value.trim().toLowerCase(); let n=0; $$('.hood-card',g).forEach(c=>{const ok=(region==='all'||c.dataset.region===region)&&(!q||c.dataset.text.includes(q)); c.hidden=!ok; if(ok){n++; c.classList.add('in');}}); $('#hood-count').textContent=n+' areas';};
  $('#hood-filter').addEventListener('input',apply); $$('[data-region]').forEach(b=>b.addEventListener('click',()=>{region=b.dataset.region; $$('[data-region]').forEach(x=>x.setAttribute('aria-pressed',x===b)); apply();})); apply();
  if(window.L){const m=L.map('hood-map',{scrollWheelZoom:false}); tiles(m); const pts=H.filter(h=>h.lat&&h.lng); m.getContainer().classList.add('lowzoom'); pts.forEach(h=>L.marker([h.lat,h.lng],{title:h.name,icon:L.divIcon({className:'pin',html:`<span>${esc(h.name)}</span>`,iconSize:null})}).bindTooltip(h.name,{direction:'top',offset:[0,-8]}).addTo(m).on('click',()=>location.href='neighborhood.html?n='+h.slug)); m.fitBounds(L.latLngBounds(pts.map(h=>[h.lat,h.lng])).pad(.08));}
});}

if(page==='neighborhood'){const slug=new URLSearchParams(location.search).get('n')||'southpark';
 Promise.all([get('neighborhoods.json'),get('cities.json')]).then(([nj,cj])=>{const H=merge(nj); const cities=(cj&&(cj.cities||cj))||[];
  let h=H.find(x=>x.slug===slug)||cities.find(x=>x.slug===slug); if(!h){h=H.find(x=>x.slug==='southpark');}
  const name=h.name, city=h.city||h.name; document.title=`${name} ${city==='Charlotte'||city===name?'Charlotte NC':city+' NC'} Homes for Sale & Neighborhood Guide | SearchCharlotte.com`;
  const md=document.querySelector('meta[name=description]'); md&&md.setAttribute('content',`Homes for sale in ${name}, plus a local guide to housing, getting around and what's nearby from the Search Charlotte team.`);
  $('#nh-crumb').textContent=name; $('#nh-h1').innerHTML=esc(name)+'<br>homes &amp; guide'; $('#nh-lede').textContent=h.tagline||h.summary||h.blurb||'';
  $('#nh-img').src='assets/img/'+(h.img||imgFor(h.slug,0))+'.webp'; $('#nh-img').alt=(h.img_credit&&h.img_credit.depicts)||h.name; {const hc=credit(h); if(hc){const d=document.createElement('div'); d.className='hero-credit'; d.innerHTML=hc; $('#nh-hero').appendChild(d);}}
  const q=encodeURIComponent(h.slug); $('#nh-all').href='search.html?q='+q; $('#nh-homes-h').textContent=`Homes for sale in ${name}`;
  $('#nh-qlinks').innerHTML=[['All homes',''],['New listings','&flag=New%20Listing'],['Under $500K','&max=500000'],['Condos','&type=Condo'],['Townhomes','&type=Townhouse'],['New construction','&flag=New%20Construction'],['Open houses','&flag=Open%20House%20Sat%2011%E2%80%932'],['Map view','&view=map']].map(([l,p])=>`<a href="search.html?q=${q}${p}">${l}</a>`).join('');
  const L_=D.listings.filter(l=>l.hood===h.slug&&l.status!=='Under Contract'); const other=D.listings.filter(l=>l.hood!==h.slug&&l.status==='Active').sort((a,b)=>Math.hypot(a.lat-(h.lat||35.2),a.lng-(h.lng||-80.84))-Math.hypot(b.lat-(h.lat||35.2),b.lng-(h.lng||-80.84)));
  $('#nh-cards').innerHTML=[...L_,...other].slice(0,4).map(card).join('');
  const sec=(t,v)=>v?`<h2>${t}</h2>${Array.isArray(v)?'<ul>'+v.map(x=>`<li>${typeof x==='string'?esc(x):`<strong>${esc(x.name)}</strong>${x.note?' — '+esc(x.note):''}`}</li>`).join('')+'</ul>':`<p>${esc(v)}</p>`}`:'';
  let body=`<p class="eyebrow">Neighborhood guide</p><h2 class="display d-lg" style="margin-top:6px">Living in ${esc(name)}</h2>`+(Array.isArray(h.overview)?h.overview.map(p=>`<p>${esc(p)}</p>`).join(''):'')+sec('Homes &amp; housing',h.housing)+sec('Getting around',h.getting_around)+sec('Nearby',h.nearby)+sec('Parks &amp; outdoors',h.parks)+sec('Schools',h.schools_note)+(h.faq&&h.faq.length?`<h2>${esc(name)} FAQ</h2><div class="faq-list">${h.faq.map(f=>`<div class="faq-item"><button aria-expanded="false">${esc(f.q)}</button><div class="ans"><div><p>${esc(f.a)}</p></div></div></div>`).join('')}</div>`:'');
  if(!h.housing&&!h.nearby) body+=`<p>${esc(h.blurb||h.summary||'')}</p><p class="form-note">Full neighborhood guide content is in editorial review.</p>`;
  body+=`<p style="margin-top:22px"><a class="btn btn-sm" href="search.html?q=${q}">Explore homes for sale in ${esc(name)}</a></p>`;
  if(h.sources&&h.sources.length) body+=`<p class="src-list">Sources: ${h.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ')}</p>`;
  body+=`<p class="form-note">School assignments change. Verify with the district's official address lookup before you buy. We do not rank schools or neighborhoods by demographics.</p>`;
  $('#nh-body').innerHTML=body;
  $('#m-alert-p').textContent=`Get an email when new homes list in ${name}. On the live site this saves a Showcase IDX search for you.`; $('#m-alert-area').value=h.slug; $('#nh-ask').href=`contact.html?topic=buying&area=${q}`;
  const rel=(h.related&&h.related.length?h.related.map(s=>H.find(x=>x.slug===s)).filter(Boolean):H.filter(x=>x.slug!==h.slug&&x.lat).sort((a,b)=>Math.hypot(a.lat-h.lat,a.lng-h.lng)-Math.hypot(b.lat-h.lat,b.lng-h.lng))).slice(0,4);
  $('#nh-related').innerHTML=rel.map(hoodCard).join(''); SC.reveal();
  if(h.lat&&SC.nearby){const isCity=cities.some(c=>c.slug===h.slug); SC.nearby.mount($('#nh-nearby'),{lat:h.lat,lng:h.lng,radius:isCity?3:1.5,name:name});}
  if(window.L&&h.lat){const m=L.map('nh-map',{scrollWheelZoom:false}).setView([h.lat,h.lng],13); tiles(m); L_.forEach(l=>L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null})}).addTo(m).on('click',()=>location.href='listing.html?id='+l.id));}
  track('view_neighborhood',{neighborhood:h.slug});
 });}

if(page==='explore'){Promise.all([get('explore-guides.json'),get('places.json'),get('neighborhoods.json'),get('cities.json')]).then(([gj,pj,nj,cj])=>{const G=(gj&&(gj.guides||gj))||[]; const P=(pj&&(pj.places||pj))||[];
  const grid=$('#ex-grid'); if(!G.length){grid.innerHTML='<div class="empty" style="grid-column:1/-1"><h3>Guides are in editorial review</h3><p>Explore neighborhoods in the meantime.</p><a class="btn btn-sm" href="neighborhoods.html">Browse neighborhoods</a></div>'; return;}
  const H=[...merge(nj),...((cj&&cj.cities)||[]).map(c=>({...c,_city:true}))]; const area=s=>H.find(h=>h.slug===s);
  const LABEL={'neighborhood-guide':'Neighborhood guides','city-guide':'Town guides','eat-drink':'Eat & drink','things-to-do':'Things to do',outdoors:'Outdoors',shopping:'Shopping',sports:'Sports',living:'Everyday living'};
  const clip=(t,n)=>t.length>n?t.slice(0,t.lastIndexOf(' ',n))+'…':t; const lab=c=>LABEL[c]||c.replace(/-/g,' ').replace(/^./,x=>x.toUpperCase());
  const cats=[...new Set(G.map(g=>g.category).filter(Boolean))]; $('#ex-tabs').innerHTML=['All',...cats].map((c,i)=>`<button class="chip" aria-pressed="${i===0}" data-cat="${esc(c)}">${esc(c==='All'?'All guides':lab(c))}</button>`).join('');
  grid.innerHTML=G.map((g,i)=>{const pl=(g.items||g.places||[]).map(p=>{const x=P.find(y=>y.slug===(p.place_slug||p)||y.name===p)||{}; return {name:p.name||x.name||p,url:p.url||x.url,hood:p.neighborhood||x.neighborhood_slug};}).slice(0,4);
   const t=g.target_slug||(g.related_neighborhoods||[])[0]; const ta=area(t); const img=g.img||(D.hoods.find(h=>h.slug===t)||{}).img||IMGS[(i+3)%IMGS.length];
   const short=ta?ta.name:''; const arrow='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
   return `<article class="xg" id="${esc(g.slug||'')}" data-cat="${esc(g.category||'')}">
    <div class="xg-media">${pic(img,g.title)}<span class="xg-tag">${esc(lab(g.category||'guide'))}</span>${short?`<span class="xg-place"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>${esc(short)}</span>`:''}
     <h3 class="xg-title">${esc(g.title)}</h3>${g.img_credit?`<div class="xg-credit">${credit(g)}</div>`:''}</div>
    <div class="xg-body"><p class="xg-sum">${esc(g.summary||g.intro||'')}</p>
     ${pl.length?`<p class="xg-h">Local favorites</p><ol class="xg-list">${pl.map((p,k)=>{const a=area(p.hood); const inner=`<span class="xg-n">${String(k+1).padStart(2,'0')}</span><span class="xg-nm"><b>${esc(p.name)}</b>${a?`<small>${esc(a.name)}</small>`:''}</span>${p.url?'<span class="xg-go" aria-hidden="true">↗</span>':''}`; return `<li>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">${inner}</a>`:`<div>${inner}</div>`}</li>`}).join('')}</ol>`:''}
     <div class="xg-cta">${ta?`<a class="xg-btn" href="search.html?q=${encodeURIComponent(ta.slug)}"><span>Homes for sale in ${esc(ta.name)}</span>${arrow}</a><a class="xg-link" href="neighborhood.html?n=${ta.slug}">Read the ${esc(ta.name)} guide</a>`:`<a class="xg-btn" href="search.html"><span>Search homes</span>${arrow}</a>`}</div></div></article>`;}).join('');
  $$('#ex-tabs button').forEach(b=>b.addEventListener('click',()=>{$$('#ex-tabs button').forEach(x=>x.setAttribute('aria-pressed',x===b)); $$('.xg',grid).forEach(c=>c.hidden=!(b.dataset.cat==='All'||c.dataset.cat===b.dataset.cat));}));
  /* Places directory grouped by category; each place links to homes in its area */
  const pg=$('#pl-grid'), pt=$('#pl-tabs'); if(pg&&P.length){const pc=[...new Set(P.map(p=>p.category))];
   pt.innerHTML=pc.map((c,i)=>`<button class="chip" aria-pressed="${i===0}" data-cat="${esc(c)}">${esc(lab(c))} (${P.filter(p=>p.category===c).length})</button>`).join('');
   const draw=c=>{pg.innerHTML=P.filter(p=>p.category===c).map(p=>{const a=area(p.neighborhood_slug); return `<article class="place"><small class="eyebrow">${esc(p.subcategory||lab(p.category))}${a?' · '+esc(a.name):''}</small><h3>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`:esc(p.name)}</h3><p>${esc(clip(p.summary||'',190))}</p>${p.address?`<small class="addr">${esc(p.address)}</small>`:''}${a?`<a class="more" href="search.html?q=${encodeURIComponent(a.slug)}">Homes for sale in ${esc(a.name)} →</a>`:''}</article>`}).join('');};
   draw(pc[0]); $$('button',pt).forEach(b=>b.addEventListener('click',()=>{$$('button',pt).forEach(x=>x.setAttribute('aria-pressed',x===b)); draw(b.dataset.cat);}));}
  const h=location.hash.slice(1); if(h){const c=cats.find(x=>x.includes(h)); c&&$(`#ex-tabs [data-cat="${c}"]`).click(); const pb=pt&&$(`button[data-cat="${h}"]`,pt); pb&&pb.click();}
});}

if(page==='market'){get('market-insights.json').then(m=>{const M=(m&&(m.metrics||m))||[]; if(!M.length){$('#mkt-grid').innerHTML='<div class="mkt-empty">Verified market figures are being compiled from published sources. Check back shortly.</div>'; $('#mkt-table').hidden=true; return;}
  const want=['Median sales price','Active inventory','Months supply','Average days on market']; $('#mkt-grid').innerHTML=want.map(w=>M.find(x=>x.metric.startsWith(w))).filter(Boolean).map(x=>`<div class="mkt"><div class="v">${esc(x.display||x.value)}</div><div class="l">${esc(x.metric)}</div><div class="p">${esc(x.geography)} · ${esc(x.period)}</div></div>`).join('');
  $('#mkt-table tbody').innerHTML=M.map(x=>`<tr><td>${esc(x.metric)}</td><td class="n">${esc(x.display||x.value)}</td><td>${esc(x.geography)}</td><td>${esc(x.period)}</td><td>${esc(x.change||'—')}</td><td><a href="${esc(x.url)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(x.source)}</a></td></tr>`).join('');
  $('#mkt-asof').textContent=(m.as_of?'Compiled '+m.as_of+'. ':'')+'Figures are reported by the linked publishers for the period shown and are not forecasts.';});}
})();

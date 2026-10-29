/* Search Charlotte — shared interactions (preview build). */
(function(){
'use strict';
const D = window.SC_DATA || {listings:[],hoods:[]};
const $ = (s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
window.dataLayer = window.dataLayer || [];
const track = (event,params={})=>window.dataLayer.push(Object.assign({event},params));
const fmt = n=>'$'+Math.round(n).toLocaleString('en-US');
const short = n=> n>=1e6 ? '$'+(n/1e6).toFixed(n>=1e7?0:2).replace(/\.?0+$/,'')+'M' : '$'+Math.round(n/1000)+'K';
const esc = s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SC = window.SC = {D,$,$$,track,fmt,short,esc};

/* base-anchor: pages in subfolders use <base href="../">, so in-page #links need manual handling */
if(document.querySelector('base')) document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]'); if(!a||a.dataset.modal) return; const id=a.getAttribute('href').slice(1); e.preventDefault(); if(!id) return; const t=document.getElementById(id); if(t){t.scrollIntoView({behavior:'smooth'}); if(t.tabIndex<0&&!/^(A|BUTTON|INPUT)$/.test(t.tagName)) t.setAttribute('tabindex','-1'); t.focus({preventScroll:true}); history.replaceState(null,'',location.pathname+location.search+'#'+id);}});

/* Toast */
SC.toast = msg=>{const t=$('.toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2600);};

/* Header */
const header=$('.site-header');
const onScroll=()=>header&&header.classList.toggle('is-scrolled',scrollY>8);
addEventListener('scroll',onScroll,{passive:true}); onScroll();
const tog=$('.nav-toggle'), panel=$('#mobile-panel');
if(tog&&panel) tog.addEventListener('click',()=>{const o=panel.classList.toggle('open'); tog.setAttribute('aria-expanded',o); document.body.style.overflow=o?'hidden':'';});

/* Saved homes (preview stores locally; production uses Showcase IDX consumer dashboard) */
const KEY='sc_saved';
/* Preview: saved homes persist for this tab session via window.name. Live site uses the Showcase IDX consumer account. */
const store=()=>{try{const o=JSON.parse(window.name||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}};
SC.saved = ()=>{const v=store()[KEY];return Array.isArray(v)?v:[]};
const setSaved = a=>{const o=store();o[KEY]=a;try{window.name=JSON.stringify(o)}catch(e){} $$('[data-saved-count]').forEach(e=>e.textContent=a.length);};
setSaved(SC.saved());
SC.toggleSave = id=>{let a=SC.saved(); const on=!a.includes(id); a=on?[...a,id]:a.filter(x=>x!==id); setSaved(a); track(on?'save_property':'unsave_property',{listing_id:id}); SC.toast(on?'Saved to your homes':'Removed from saved homes'); return on;};
document.addEventListener('click',e=>{const b=e.target.closest('.fav'); if(!b) return; e.preventDefault(); e.stopPropagation(); const on=SC.toggleSave(b.dataset.id); $$(`.fav[data-id="${b.dataset.id}"]`).forEach(x=>x.setAttribute('aria-pressed',on));});

/* Listing card */
const pin='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';
const heart='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
SC.facts = l=> l.type==='Land' ? `${l.acres} acres | ${l.hoodName}` : `${l.beds} beds | ${l.baths} baths | ${l.sqft.toLocaleString()} sqft`;
SC.typeLabel = l=> ({'Single Family':'Single family residence','Condo':'Condominium','Townhouse':'Townhouse','Land':'Land'})[l.type]+' for sale';
SC.card = (l,opts={})=>{const saved=SC.saved().includes(l.id);
 return `<article class="card" data-id="${l.id}">
  <div class="card-img">${(()=>{const g=[...new Set([l.img,...(l.gallery||[])])]; return `<div class="ci-track" tabindex="-1">${g.map((im,i)=>`<a class="ci-slide" href="listing.html?id=${l.id}${i?'#photo-'+(i+1):''}" tabindex="${i?-1:0}" aria-label="${i?'Photo '+(i+1)+' of '+g.length+', ':''}${esc(l.address)}"><img src="assets/img/${im}.webp" alt="${i?'Photo '+(i+1)+' of ':''}${esc(l.address)}, ${esc(l.city)}" loading="lazy" decoding="async" width="400" height="312"></a>`).join('')}</div>${g.length>1?`<button class="ci-nav prev" type="button" aria-label="Previous photo" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button><button class="ci-nav next" type="button" aria-label="Next photo" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button><div class="ci-dots" aria-hidden="true">${g.map((_,i)=>`<i${i?'':' class="on"'}></i>`).join('')}</div>`:''}`;})()}
   ${SC.matchBadge?SC.matchBadge(l,SC.matchAmen&&SC.matchAmen()):''}
   ${l.flag?`<span class="badge">${esc(l.flag)}</span>`:''}
   <button class="fav" data-id="${l.id}" aria-pressed="${saved}" aria-label="Save ${esc(l.address)}">${heart}</button></div>
  <div class="card-body">
   <div class="card-row"><span class="price">${fmt(l.price)}</span><span class="status ${l.status!=='Active'?'soon':''}">${esc(l.status)}</span></div>
   <span class="ptype">${esc(SC.typeLabel(l))}</span>
   <span class="facts">${esc(SC.facts(l))}</span>
   <div class="card-row" style="align-items:flex-end"><span class="addr">${pin}<span>${esc(l.address)}<br>${esc(l.city)}, NC ${l.zip}</span></span><span class="grid-mark" title="Sample data">SAMPLE<br>DATA</span></div>
   ${SC.toggleCompare?`<div class="card-acts"><button class="card-act" type="button" data-compare="${l.id}" aria-pressed="${SC.compare().includes(l.id)}">Compare</button><button class="card-act" type="button" data-tour="${l.id}" aria-pressed="${SC.tourList().includes(l.id)}">Tour Day</button></div>`:''}
  </div>
  <a class="stretch" href="listing.html?id=${l.id}" aria-label="View details for ${esc(l.address)}"></a>
 </article>`;};

/* Card photo carousels (Zillow-style: arrows on hover, swipe on touch, dots) */
const ciGo=(trk,dir)=>{const w=trk.clientWidth; trk.scrollBy({left:dir*w,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
document.addEventListener('click',e=>{const b=e.target.closest('.ci-nav'); if(!b) return; e.preventDefault(); e.stopPropagation(); const trk=b.parentElement.querySelector('.ci-track'); const n=trk.children.length, i=Math.round(trk.scrollLeft/trk.clientWidth);
  if(b.classList.contains('next')&&i>=n-1) trk.scrollTo({left:0}); else if(b.classList.contains('prev')&&i<=0) trk.scrollTo({left:trk.scrollWidth}); else ciGo(trk,b.classList.contains('next')?1:-1); track('card_photo_nav',{listing_id:b.closest('.card').dataset.id});});
document.addEventListener('scroll',e=>{const trk=e.target; if(!trk.classList||!trk.classList.contains('ci-track')) return; const i=Math.round(trk.scrollLeft/trk.clientWidth); const dots=trk.parentElement.querySelectorAll('.ci-dots i'); dots.forEach((d,k)=>d.classList.toggle('on',k===i));},true);

/* Location suggestions for every search bar */
const places = [...D.hoods.map(h=>({label:h.name,sub:h.city==='Charlotte'?'Neighborhood':'Area',q:h.slug})),
  ...[...new Set(D.listings.map(l=>String(l.zip)))].map(z=>({label:z,sub:'ZIP code',q:z})),
  ...['Charlotte','Cornelius','Waxhaw','Mint Hill'].map(c=>({label:c+', NC',sub:'City',q:c.toLowerCase()}))];
$$('form[data-search]').forEach(f=>{
  const inp=$('input',f); if(!inp) return;
  const box=document.createElement('div'); box.className='suggest'; box.setAttribute('role','listbox'); f.style.position='relative'; f.appendChild(box);
  let hl=-1, items=[];
  const render=()=>{const v=inp.value.trim().toLowerCase(); if(!v){box.classList.remove('open');return;}
    items=places.filter(p=>p.label.toLowerCase().includes(v)).slice(0,6);
    const addr=D.listings.filter(l=>l.address.toLowerCase().includes(v)).slice(0,3).map(l=>({label:l.address,sub:'Address',id:l.id}));
    items=[...items,...addr];
    box.innerHTML=items.length?items.map((p,i)=>`<button type="button" role="option" data-i="${i}" class="${i===hl?'is-hl':''}">${esc(p.label)}<small>${p.sub}</small></button>`).join(''):'<div style="padding:10px 12px;font-size:13px;color:#777">Press Search to look for “'+esc(inp.value)+'”</div>';
    box.classList.add('open');};
  const go=p=>{ if(p&&p.id){location.href='listing.html?id='+p.id;return;} const q=p?p.q:inp.value.trim(); track('idx_search_submit',{search_term:q,form_location:f.dataset.search}); location.href='search.html'+(q?'?q='+encodeURIComponent(q):''); };
  inp.setAttribute('autocomplete','off'); inp.setAttribute('aria-autocomplete','list');
  inp.addEventListener('input',()=>{hl=-1;render();});
  inp.addEventListener('keydown',e=>{ if(!box.classList.contains('open')) return;
    if(e.key==='ArrowDown'){hl=Math.min(hl+1,items.length-1);render();e.preventDefault();}
    else if(e.key==='ArrowUp'){hl=Math.max(hl-1,0);render();e.preventDefault();}
    else if(e.key==='Escape'){box.classList.remove('open');}});
  box.addEventListener('click',e=>{const b=e.target.closest('button'); if(b) go(items[+b.dataset.i]);});
  document.addEventListener('click',e=>{if(!f.contains(e.target)) box.classList.remove('open');});
  f.addEventListener('submit',e=>{e.preventDefault(); go(hl>=0?items[hl]:null);});
});

/* Reveal on scroll */
const io='IntersectionObserver' in window ? new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}}),{rootMargin:'0px 0px -8% 0px'}) : null;
SC.reveal = ()=>$$('.reveal:not(.in)').forEach(el=>io?io.observe(el):el.classList.add('in'));
SC.reveal();
const sweep=()=>$$('.reveal:not(.in)').forEach(el=>{if(el.getBoundingClientRect().top<innerHeight*1.05) el.classList.add('in');});
addEventListener('scroll',()=>requestAnimationFrame(sweep),{passive:true}); addEventListener('load',sweep);

/* FAQ accordion */
document.addEventListener('click',e=>{const b=e.target.closest('.faq-item>button'); if(!b) return; const it=b.parentElement; const o=!it.classList.contains('open'); it.classList.toggle('open',o); b.setAttribute('aria-expanded',o);});

/* Carousel */
$$('[data-carousel]').forEach(c=>{const track_=$('.trust-track',c), cards=$$('.trust-card',c), dots=$('.dots',c); if(!cards.length) return; let i=Math.min(1,cards.length-1);
 dots.innerHTML=cards.map((_,k)=>`<button aria-label="Show item ${k+1}"></button>`).join('');
 const show=k=>{i=(k+cards.length)%cards.length; const w=cards[0].offsetWidth+parseFloat(getComputedStyle(track_).gap); track_.style.transform=`translateX(${-i*w}px)`; cards.forEach((x,j)=>x.classList.toggle('is-on',j===i)); $$('button',dots).forEach((d,j)=>d.setAttribute('aria-current',j===i));};
 $$('button',dots).forEach((d,j)=>d.addEventListener('click',()=>{show(j);clearInterval(t);}));
 let t=setInterval(()=>show(i+1),6000); addEventListener('resize',()=>show(i)); show(i);});

/* Video play */
$$('.video-frame').forEach(v=>{const vid=$('video',v), b=$('.play',v); if(!b) return; b.addEventListener('click',()=>{vid.controls=true; vid.play(); b.remove(); track('video_play',{video:'local_look'});});});
$$('.reel video').forEach(v=>{ if(matchMedia('(prefers-reduced-motion: reduce)').matches){v.removeAttribute('autoplay');v.pause();}});

/* Lead delivery. Set SC.LEAD.endpoint (POST, JSON) to deliver every lead; until then the site runs in
   staging mode and every confirmation says the form was not sent. Production: Showcase IDX lead routing / sc_lead. */
SC.LEAD=Object.assign({endpoint:null},window.SC_LEAD||{});
if(!SC.LEAD.endpoint) document.documentElement.setAttribute('data-staging','');
SC.sendLead=(type,fields)=>{const body={type,page:location.pathname+location.search,ts:new Date().toISOString(),...fields};
  if(!SC.LEAD.endpoint) return Promise.resolve({sent:false});
  return fetch(SC.LEAD.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>({sent:r.ok})).catch(()=>({sent:false}));};
/* Lead forms (preview: validates + confirms; production posts to Showcase IDX lead routing / sc_lead handler) */
$$('form[data-lead]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();
  if(!f.checkValidity()){f.reportValidity();return;}
  if(f.querySelector('[name=website]')?.value) return; // honeypot
  const btn=$('button[type=submit]',f); if(btn){btn.disabled=true;btn.textContent='Sent';}
  SC.sendLead(f.dataset.lead,Object.fromEntries(new FormData(f)));
  f.classList.add('sent'); track('form_submit',{form_type:f.dataset.lead,page_path:location.pathname,listing_id:f.dataset.listing||''});
  const ok=$('.form-ok',f); ok&&ok.focus&&ok.setAttribute('tabindex','-1'); ok&&ok.focus();
}));
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="tel:"],a[href^="mailto:"]'); if(a) track(a.href.startsWith('tel')?'phone_click':'email_click',{link_url:a.href});});

/* Modal */
SC.openModal=id=>{const m=$('#'+id); if(!m) return; m.classList.add('open'); const first=$('input,select,textarea,button',m); first&&first.focus();};
document.addEventListener('click',e=>{const o=e.target.closest('[data-modal]'); if(o){e.preventDefault(); SC.openModal(o.dataset.modal);} if(e.target.classList.contains('modal')||e.target.closest('.modal-x')) e.target.closest('.modal').classList.remove('open');});
document.addEventListener('keydown',e=>{if(e.key==='Escape') $$('.modal.open').forEach(m=>m.classList.remove('open'));});

/* Mortgage calculator (standard amortization) */
SC.payment=(price,downPct,rate,years,taxYr,insYr,hoaMo)=>{const P=price*(1-downPct/100), r=rate/100/12, n=years*12;
  const pi = r===0 ? P/n : P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  return {pi, tax:taxYr/12, ins:insYr/12, hoa:hoaMo, total:pi+taxYr/12+insYr/12+hoaMo, loan:P};};
$$('[data-calc]').forEach(c=>{const g=n=>parseFloat($(`[name=${n}]`,c).value)||0; let used=false;
  const run=()=>{const p=SC.payment(g('price'),g('down'),g('rate'),g('term'),g('tax'),g('ins'),g('hoa'));
    $('[data-out=total]',c).textContent=fmt(p.total)+'/mo';
    $('[data-out=pi]',c).textContent=fmt(p.pi); $('[data-out=tax]',c).textContent=fmt(p.tax); $('[data-out=ins]',c).textContent=fmt(p.ins); $('[data-out=hoa]',c).textContent=fmt(p.hoa); $('[data-out=loan]',c).textContent=fmt(p.loan);
    const tot=p.total||1; $('[data-bar]',c).innerHTML=[['pi','#1E140D'],['tax','#C99A4B'],['ins','#5A3D2B'],['hoa','#A8A29A']].map(([k,col])=>`<span style="flex:${p[k]/tot};background:${col}"></span>`).join('');
    if(!used){used=true; track('mortgage_calc_use',{});}};
  c.addEventListener('input',run); run(); used=false;});

/* Guided natural-language search (rule-based; produces filters only — never listings) */
SC.parseQuery=text=>{const t=' '+text.toLowerCase()+' '; const f={};
  const num=s=>{s=s.replace(/[,$\s]/g,''); let m=parseFloat(s); if(/m$/.test(s)) m*=1e6; else if(/k$/.test(s)) m*=1e3; else if(m<10000) m*=1000; return Math.round(m);};
  let m=t.match(/(\d+)\s*(?:\+\s*)?(?:bed|br|bedroom)/); if(m) f.beds=+m[1];
  m=t.match(/(\d+(?:\.\d)?)\s*(?:\+\s*)?(?:bath|ba)/); if(m) f.baths=+m[1];
  const words={one:1,two:2,three:3,four:4,five:5,six:6}; for(const w in words){ if(new RegExp(w+'[- ]bed').test(t)) f.beds=words[w]; }
  m=t.match(/(?:under|below|less than|max(?:imum)?|up to|<)\s*\$?\s*([\d.,]+\s*[km]?)/); if(m) f.maxPrice=num(m[1]);
  m=t.match(/(?:over|above|more than|at least|min(?:imum)?|>)\s*\$?\s*([\d.,]+\s*[km]?)/); if(m) f.minPrice=num(m[1]);
  m=t.match(/between\s*\$?([\d.,]+\s*[km]?)\s*(?:and|-|to)\s*\$?([\d.,]+\s*[km]?)/); if(m){f.minPrice=num(m[1]); f.maxPrice=num(m[2]);}
  if(/townho(me|use)/.test(t)) f.type='Townhouse'; else if(/condo|apartment|high-rise/.test(t)) f.type='Condo'; else if(/\bland\b|\blot\b|acreage/.test(t)) f.type='Land'; else if(/house|single[- ]family|home with a yard/.test(t)&&!f.type) f.type='Single Family';
  if(/pool/.test(t)) f.pool=true; if(/waterfront|lake ?front|on the lake/.test(t)) f.waterfront=true;
  if(/new construction|new build|newly built/.test(t)) f.newConstruction=true;
  if(/large yard|big yard|acre/.test(t)) f.largeLot=true;
  const hood=D.hoods.find(h=>t.includes(' '+h.name.toLowerCase())); if(hood) f.hood=hood.slug;
  const life=[]; if(/restaurant|dining|food/.test(t)) life.push('dining'); if(/park|greenway|trail|outdoor/.test(t)) life.push('parks'); if(/walk/.test(t)) life.push('walkable'); if(/light rail|transit|lynx/.test(t)) life.push('light-rail'); if(life.length) f.lifestyle=life;
  if(/relocat|moving to/.test(t)) f.relocating=true;
  return f;};
SC.filtersToQS=f=>{const p=new URLSearchParams(); if(f.hood) p.set('q',f.hood); if(f.minPrice) p.set('min',f.minPrice); if(f.maxPrice) p.set('max',f.maxPrice); if(f.beds) p.set('beds',f.beds); if(f.baths) p.set('baths',Math.floor(f.baths)); if(f.type) p.set('type',f.type); if(f.newConstruction) p.set('flag','New Construction'); return p.toString();};
SC.describeFilters=f=>{const out=[]; if(f.beds) out.push(f.beds+'+ beds'); if(f.baths) out.push(f.baths+'+ baths'); if(f.type) out.push(f.type); if(f.hood) out.push('in '+D.hoods.find(h=>h.slug===f.hood).name); if(f.minPrice) out.push('from '+short(f.minPrice)); if(f.maxPrice) out.push('up to '+short(f.maxPrice)); if(f.pool) out.push('pool'); if(f.waterfront) out.push('waterfront'); if(f.newConstruction) out.push('new construction'); if(f.largeLot) out.push('larger lot'); return out;};
$$('form[data-ai]').forEach(f=>{const out=$('[data-ai-out]',f.parentElement);
  f.addEventListener('submit',e=>{e.preventDefault(); const q=$('textarea,input',f).value.trim(); if(!q) return; const fl=SC.parseQuery(q); const chips=SC.describeFilters(fl);
    track('ai_search_submit',{filters:chips.join('|')});
    const unsupported=[fl.pool&&'pool',fl.waterfront&&'waterfront',fl.largeLot&&'lot size'].filter(Boolean);
    const qs=SC.filtersToQS(fl);
    const hoodLinks=(fl.lifestyle||[]).length? D.hoods.filter(h=>/walk|park|greenway|rail|dining|restaurants|shops|breweries/i.test(h.blurb)).slice(0,3):[];
    out.innerHTML=`<div class="ai-result">
      <p class="eyebrow">I understood</p>
      <div class="chips" style="margin:8px 0 14px">${chips.length?chips.map(c=>`<span class="chip is-active">${esc(c)}</span>`).join(''):'<span class="chip">No specific filters found — try adding a budget, bedrooms or an area</span>'}</div>
      ${unsupported.length?`<p class="form-note">“${unsupported.join(', ')}” will be applied as a Showcase IDX amenity filter on the live site; it isn't part of this preview's sample data.</p>`:''}
      ${hoodLinks.length?`<p style="font-size:13.5px;margin:10px 0 6px">Neighborhood guides that match the lifestyle you described:</p><div class="chips">${hoodLinks.map(h=>`<a class="chip" href="neighborhood.html?n=${h.slug}">${esc(h.name)}</a>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><a class="btn" href="search.html?${qs}">See matching homes</a><a class="btn btn-outline" href="contact.html?topic=buyer">Talk to an agent</a></div>
      <p class="form-note" style="margin-top:12px">This assistant only turns your words into search filters. Every home it shows comes from the MLS search, never from the assistant.</p></div>`;});
  $$('[data-example]',f.parentElement).forEach(b=>b.addEventListener('click',()=>{$('textarea,input',f).value=b.textContent.replace(/[“”"]/g,''); f.requestSubmit();}));
});
})();

document.addEventListener('click',e=>{const b=e.target.closest('.card-act[data-compare],.card-act[data-tour]');if(!b)return;e.preventDefault();e.stopPropagation();
 const id=b.dataset.compare||b.dataset.tour;const r=b.dataset.compare?SC.toggleCompare(id):SC.toggleTour(id);
 const on=b.dataset.compare?SC.compare().includes(id):SC.tourList().includes(id);
 document.querySelectorAll(`.card-act[data-${b.dataset.compare?'compare':'tour'}="${id}"]`).forEach(x=>x.setAttribute('aria-pressed',on));
 if(on&&SC.toast) SC.toast(b.dataset.compare?'Added to Compare — <a href="compare.html">view</a>':'Added to Tour Day — <a href="tour.html">plan route</a>');},true);

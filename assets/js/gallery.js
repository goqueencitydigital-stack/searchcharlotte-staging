/* Search Charlotte, listing photo mosaic + full-screen photo viewer.
   Public API:
     SC.gallery.photos(listing)            -> ['assets/img/x.webp', ...]
     SC.gallery.mosaic(el, listing)        -> renders desktop 1 + 2x2 mosaic / mobile swipe carousel into el
     SC.gallery.open(listing, index?)      -> opens viewer; index omitted = photo grid, number = lightbox at that photo (0-based)
     SC.gallery.close()
   URL hash state: #photos (grid) and #photo-N (1-based) so the browser Back button steps back / closes.
   Preview photos are SAMPLE images; production uses the Showcase IDX / Canopy MLS photo array (same API). */
(function(){'use strict';
const SC=window.SC; const {esc,track}=SC;
const ico={
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
};
const photos=l=>[...new Set([l.img,...(l.gallery||[])])].filter(Boolean).map(p=>/[/.]/.test(p)?p:`assets/img/${p}.webp`);
const alt=(l,i,n)=>`Photo ${i+1} of ${n}: ${l.address}, ${l.city} (sample photo)`;

/* ---------- Mosaic + mobile carousel ---------- */
function mosaic(el,l){
  const P=photos(l), n=P.length, show=P.slice(0,5);
  el.classList.add('gx-mosaic','gx-n'+Math.min(n,5));
  el.innerHTML=`<div class="gx-grid">${show.map((src,i)=>`<button type="button" class="gx-tile" data-gx="${i}" aria-label="Open photo ${i+1} of ${n}"><img src="${src}" alt="${esc(alt(l,i,n))}" ${i?'loading="lazy"':'fetchpriority="high"'} decoding="async"></button>`).join('')}</div>
   <div class="gx-swipe" role="region" aria-roledescription="carousel" aria-label="Listing photos: swipe to browse">
     <div class="gx-track" tabindex="0">${P.map((src,i)=>`<button type="button" class="gx-slide" data-gx="${i}" aria-label="Open photo ${i+1} of ${n}"><img src="${src}" alt="${esc(alt(l,i,n))}" ${i?'loading="lazy"':''} decoding="async"></button>`).join('')}</div>
     <span class="gx-count" aria-live="polite"><span data-gx-cur>1</span> / ${n}</span>
   </div>
   <span class="gx-sample">Sample photos</span>
   <button type="button" class="gx-all" data-gx-all>${ico.grid}See all ${n} photos</button>`;
  const tr=el.querySelector('.gx-track'), cur=el.querySelector('[data-gx-cur]');
  tr.addEventListener('scroll',()=>{const i=Math.round(tr.scrollLeft/Math.max(1,tr.clientWidth)); cur.textContent=Math.min(n,i+1);},{passive:true});
  tr.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault(); tr.scrollBy({left:(e.key==='ArrowRight'?1:-1)*tr.clientWidth,behavior:'smooth'});}});
  el.addEventListener('click',e=>{const a=e.target.closest('[data-gx-all]'); if(a){open(l); return;} const b=e.target.closest('[data-gx]'); if(b) open(l,+b.dataset.gx);});
}

/* ---------- Viewer ---------- */
let V=null, L=null, P=[], idx=0, mode=null, lastFocus=null, pushed=0, scrollY0=0;
function build(){
  V=document.createElement('div'); V.className='gx-viewer'; V.setAttribute('role','dialog'); V.setAttribute('aria-modal','true'); V.hidden=true;
  V.innerHTML=`<div class="gx-bar">
      <button type="button" class="gx-ib" data-gx-back aria-label="Back to all photos">${ico.back}</button>
      <div class="gx-title"><strong data-gx-addr></strong><span data-gx-sub></span></div>
      <div class="gx-acts"><button type="button" class="gx-ib gx-txt" data-gx-save aria-pressed="false">${ico.heart}<span>Save</span></button>
        <button type="button" class="gx-ib gx-txt" data-gx-share>${ico.share}<span>Share</span></button>
        <button type="button" class="gx-ib" data-gx-close aria-label="Close photo viewer">${ico.x}</button></div></div>
    <div class="gx-body">
      <div class="gx-list" data-gx-list></div>
      <div class="gx-lb" data-gx-lb hidden>
        <div class="gx-stage" data-gx-stage><img data-gx-img alt=""><button type="button" class="gx-nav gx-prev" data-gx-prev aria-label="Previous photo">${ico.prev}</button><button type="button" class="gx-nav gx-next" data-gx-next aria-label="Next photo">${ico.next}</button></div>
        <p class="gx-lb-count" aria-live="polite" data-gx-count></p>
        <div class="gx-thumbs" data-gx-thumbs role="list"></div>
      </div>
    </div>`;
  document.body.appendChild(V);
  const q=s=>V.querySelector(s);
  q('[data-gx-close]').onclick=()=>close();
  q('[data-gx-back]').onclick=()=>{ if(mode==='photo') setHash('#photos',true); else close(); };
  q('[data-gx-prev]').onclick=()=>go(idx-1); q('[data-gx-next]').onclick=()=>go(idx+1);
  q('[data-gx-save]').onclick=()=>{SC.toggleSave(L.id); syncSave(); document.querySelectorAll(`.fav[data-id="${L.id}"]`).forEach(x=>x.setAttribute('aria-pressed',SC.saved().includes(L.id)));};
  q('[data-gx-share]').onclick=async()=>{const url=location.origin+location.pathname.replace(/[^/]*$/,'')+`listing.html?id=${L.id}#photo-${idx+1}`; track('share_property',{listing_id:L.id,from:'photo_viewer'});
    if(navigator.share){try{await navigator.share({title:L.address,url});}catch(e){}} else {try{await navigator.clipboard.writeText(url); SC.toast('Photo link copied');}catch(e){SC.toast('Copy the address bar link to share');}}};
  q('[data-gx-list]').addEventListener('click',e=>{const b=e.target.closest('[data-gx-i]'); if(b){idx=+b.dataset.gxI; setHash('#photo-'+(idx+1));}});
  q('[data-gx-thumbs]').addEventListener('click',e=>{const b=e.target.closest('[data-gx-i]'); if(b) go(+b.dataset.gxI);});
  /* swipe */
  const st=q('[data-gx-stage]'); let x0=null,y0=0,t0=0;
  st.addEventListener('pointerdown',e=>{if(e.target.closest('button')) return; x0=e.clientX; y0=e.clientY; t0=Date.now();});
  st.addEventListener('pointerup',e=>{if(x0==null) return; const dx=e.clientX-x0, dy=e.clientY-y0; x0=null; if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)&&Date.now()-t0<800) go(idx+(dx<0?1:-1));});
  st.addEventListener('pointercancel',()=>{x0=null;});
  V.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault(); close(); return;}
    if(mode==='photo'&&e.key==='ArrowLeft'){e.preventDefault(); go(idx-1);} if(mode==='photo'&&e.key==='ArrowRight'){e.preventDefault(); go(idx+1);}
    if(e.key==='Tab'){const f=[...V.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.closest('[hidden]')&&x.offsetParent!==null); if(!f.length) return; const a=f[0], z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault(); z.focus();} else if(!e.shiftKey&&document.activeElement===z){e.preventDefault(); a.focus();}}});
}
const syncSave=()=>{const b=V.querySelector('[data-gx-save]'), on=SC.saved().includes(L.id); b.setAttribute('aria-pressed',on); b.querySelector('span').textContent=on?'Saved':'Save'; b.setAttribute('aria-label',on?'Remove from saved homes':'Save this home');};
function renderList(){const n=P.length;
  V.querySelector('[data-gx-list]').innerHTML=`<p class="gx-sample-note">Sample photos: live listing photos via Showcase IDX at launch</p><div class="gx-cols">${P.map((src,i)=>`<button type="button" class="gx-li ${i%3===0?'wide':''}" data-gx-i="${i}" aria-label="View photo ${i+1} of ${n}"><img src="${src}" alt="${esc(alt(L,i,n))}" loading="lazy" decoding="async"></button>`).join('')}</div>`;
  V.querySelector('[data-gx-thumbs]').innerHTML=P.map((src,i)=>`<button type="button" role="listitem" data-gx-i="${i}" aria-label="Photo ${i+1}"><img src="${src}" alt="" loading="lazy"></button>`).join('');}
function go(i){const n=P.length; idx=(i+n)%n; if(mode==='photo') history.replaceState(history.state,'','#photo-'+(idx+1)); paintPhoto();}
function paintPhoto(){const n=P.length, img=V.querySelector('[data-gx-img]');
  img.classList.remove('in'); img.src=P[idx]; img.alt=alt(L,idx,n); requestAnimationFrame(()=>img.classList.add('in'));
  V.querySelector('[data-gx-count]').textContent=`${idx+1} / ${n}`; V.querySelector('[data-gx-sub]').textContent=`Photo ${idx+1} of ${n} · Sample photos`;
  V.querySelectorAll('[data-gx-thumbs] button').forEach((b,i)=>{b.setAttribute('aria-current',i===idx?'true':'false'); if(i===idx) b.scrollIntoView({block:'nearest',inline:'center'});});
  [idx+1,idx-1].forEach(j=>{const im=new Image(); im.src=P[(j+n)%n];}); /* preload neighbours */
}
function setMode(m){mode=m; const lb=V.querySelector('[data-gx-lb]'), li=V.querySelector('[data-gx-list]');
  lb.hidden=m!=='photo'; li.hidden=m==='photo'; V.classList.toggle('is-photo',m==='photo');
  V.querySelector('[data-gx-back]').setAttribute('aria-label',m==='photo'?'Back to all photos':'Close photo viewer');
  V.setAttribute('aria-label',m==='photo'?`Photo viewer: ${L.address}`:`All photos: ${L.address}`);
  if(m==='photo'){paintPhoto(); V.querySelector('[data-gx-next]').focus({preventScroll:true});}
  else {V.querySelector('[data-gx-sub]').textContent=`${P.length} photos · Sample photos`; V.querySelector('[data-gx-close]').focus({preventScroll:true});}}
function show(){if(!V.hidden) return; lastFocus=document.activeElement; V.hidden=false; scrollY0=scrollY; document.documentElement.classList.add('gx-lock'); requestAnimationFrame(()=>V.classList.add('open'));}
function hide(){if(!V||V.hidden) return; V.classList.remove('open'); V.hidden=true; mode=null; document.documentElement.classList.remove('gx-lock'); scrollTo({top:scrollY0,behavior:'instant'}); lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true});}
function setHash(h,replace){ if(replace){history.replaceState(history.state,'',h);} else {history.pushState({gx:1},'',h); pushed++;} route(); }
function route(){const h=location.hash; if(!L) return; const m=/^#photo-(\d+)$/.exec(h);
  if(h==='#photos'){show(); setMode('grid');}
  else if(m){idx=Math.max(0,Math.min(P.length-1,+m[1]-1)); show(); setMode('photo');}
  else hide();}
function open(l,i){if(!V) build(); L=l; P=photos(l); V.querySelector('[data-gx-addr]').textContent=`${l.address}, ${l.city}`; renderList(); syncSave();
  track('gallery_open',{listing_id:l.id,index:i==null?'grid':i});
  if(i==null) setHash('#photos'); else {idx=i; if(location.hash!=='#photos'){history.pushState({gx:1},'','#photos'); pushed++;} setHash('#photo-'+(i+1));}}
function close(){ if(pushed>0){const n=pushed; pushed=0; history.go(-n); /* hashchange -> hide */ setTimeout(()=>{if(V&&!V.hidden&&/^#photo/.test(location.hash)===false) hide();},350);} else {history.replaceState(history.state,'',location.pathname+location.search); hide();} }
addEventListener('hashchange',()=>{ if(!/^#photo/.test(location.hash)) pushed=0; else if(pushed<0) pushed=0; route(); });
addEventListener('popstate',()=>{ if(pushed>0) pushed--; });
SC.gallery={photos,mosaic,open,close,
  /* For pages that own a single listing (listing.html): restore #photos / #photo-N on load */
  bind(l){L=l; P=photos(l); if(/^#photo/.test(location.hash)){if(!V) build(); V.querySelector('[data-gx-addr]').textContent=`${l.address}, ${l.city}`; renderList(); syncSave(); route();}}};
})();

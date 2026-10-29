/* Property Reels, vertical snap-scroll feed. Ken Burns slides from the site's own sample images, the site's own
   silent neighborhood reels (assets/video/reel-*.mp4, captions burned in) and one click-to-load YouTube video owned
   by the client (youtube-nocookie). No third-party media is loaded until the user taps play. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,track}=SC; const feed=$('#rl-feed'); if(!feed) return;
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const SLIDE_MS=4200;
const st=Object.assign({auto:!RM.matches,muted:true},SC.db.get('sc_reels_prefs',{}));
const ic={
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.7 3.3 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.7 0 5.8 3.7 4.5 6.8C19.5 16.4 12 21 12 21z"/></svg>',
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
 share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
 route:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/></svg>',
 photos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>'};

/* Feed: 10 sample listings with 3+ photos, interleaved with the 4 local reels and John's intro video */
const L=D.listings.filter(l=>l.type!=='Land'&&(l.gallery||[]).length>=3).sort((a,b)=>(b.flag?1:0)-(a.flag?1:0)||b.price-a.price).slice(0,10);
const items=[];
L.forEach((l,i)=>{items.push({kind:'listing',id:l.id,l});
  if(i===0) items.push({kind:'yt',id:'yt-bhAc18RP5RM',yt:'bhAc18RP5RM',title:'How to find your dream home in Charlotte',by:'John Siddons, Lead Broker / REALTOR®',poster:'https://i.ytimg.com/vi/bhAc18RP5RM/maxresdefault.jpg'});
  if(i%2===1&&i<9) {const n=(i+1)/2; items.push({kind:'local',id:'local-'+n,src:`assets/video/reel-${n}.mp4`,poster:`assets/img/reel-${n}.jpg`,title:"Charlotte through a local's eyes",n});}});

const rail=(it)=>{const l=it.l, saved=l&&SC.saved().includes(l.id), tour=l&&SC.tourList().includes(l.id);
  return `<div class="rl-rail">${l?`
   <button type="button" data-rl="save" aria-pressed="${saved}" aria-label="Save ${esc(l.address)}"><span class="ic">${ic.heart}</span>Save</button>
   <a href="listing.html?id=${l.id}" aria-label="Details for ${esc(l.address)}"><span class="ic">${ic.info}</span>Details</a>
   <button type="button" data-rl="photos" aria-label="View all photos"><span class="ic">${ic.photos}</span>Photos</button>
   <button type="button" data-rl="tour" aria-pressed="${tour}" aria-label="Add to Tour Day"><span class="ic">${ic.route}</span>Tour</button>`:''}
   <button type="button" data-rl="share" aria-label="Share this reel"><span class="ic">${ic.share}</span>Share</button>
   <button type="button" data-rl="showing" aria-label="${l?'Request a showing':'Talk to an agent'}"><span class="ic">${ic.cal}</span>${l?'Showing':'Ask'}</button></div>`;};

const html=(it,idx)=>{
 if(it.kind==='listing'){const l=it.l, g=l.gallery.slice(0,5);
  return `<article class="rl-item" id="r-${it.id}" data-i="${idx}" data-kind="listing" aria-label="${esc(l.address)}, ${fmt(l.price)}"><div class="rl-frame">
   <div class="rl-slides">${g.map((img,k)=>`<div class="rl-slide ${k===0?'on':''}"><img src="assets/img/${img}.webp" alt="${esc(l.address)}, photo ${k+1} of ${g.length}" ${idx>1?'loading="lazy"':''} decoding="async"></div>`).join('')}</div>
   <div class="rl-shade"></div><div class="rl-prog" aria-hidden="true">${g.map((_,k)=>`<i class="${k===0?'cur':''}"><b></b></i>`).join('')}</div>
   <button type="button" class="rl-tap prev" aria-label="Previous photo"></button><button type="button" class="rl-tap next" aria-label="Next photo"></button>
   <div class="rl-tag">${l.flag?`<span>${esc(l.flag)}</span>`:''}<span>${esc(l.hoodName)}</span></div>
   <div class="rl-info"><div class="rl-price">${fmt(l.price)}</div><div class="rl-addr">${esc(l.address)}, ${esc(l.city)}</div><div class="rl-facts">${esc(SC.facts(l))} · ${esc(l.type)}</div>
    <span class="rl-sample">Sample listing</span><div class="rl-cta"><button class="btn btn-sm" type="button" data-rl="showing">Request a showing</button><a class="btn btn-sm btn-ghost" href="listing.html?id=${l.id}">Details</a></div></div>
   ${rail(it)}</div></article>`;}
 if(it.kind==='local') return `<article class="rl-item" id="r-${it.id}" data-i="${idx}" data-kind="local" aria-label="${esc(it.title)}"><div class="rl-frame">
   <video class="rl-video" muted loop playsinline preload="none" poster="${it.poster}" src="${it.src}" aria-label="${esc(it.title)}, silent video with burned-in captions"></video>
   <div class="rl-shade"></div><div class="rl-tag"><span>Local reel</span><span>Captions on video</span></div>
   <div class="rl-info"><div class="rl-addr" style="font-size:18px">${esc(it.title)}</div><div class="rl-facts">Search Charlotte original · no audio track</div>
    <div class="rl-cta"><a class="btn btn-sm" href="neighborhoods.html">Explore neighborhoods</a></div></div>${rail(it)}</div></article>`;
 return `<article class="rl-item" id="r-${it.id}" data-i="${idx}" data-kind="yt" aria-label="Video: ${esc(it.title)}"><div class="rl-frame" style="background:var(--forest)">
   <div class="rl-yt" data-yt-mount style="display:grid;place-items:center"><img src="${it.poster}" alt="" style="width:100%;height:100%;object-fit:cover;opacity:.95" loading="lazy"></div>
   <button type="button" class="rl-play" data-rl="yt" aria-label="Play video: ${esc(it.title)} (loads YouTube)">${ic.play}</button>
   <p class="rl-ytnote">Tap play to load this video from YouTube (privacy-enhanced mode). Captions are requested on load.</p>
   <div class="rl-info"><div class="rl-addr" style="font-size:18px">${esc(it.title)}</div><div class="rl-facts">${esc(it.by)}</div></div>${rail(it)}</div></article>`;};

feed.innerHTML=items.map(html).join('')+`<div class="rl-item"><div class="rl-end"><h2 class="display d-md">You're all caught up</h2><p>Save the homes you liked, then plan a Tour Day or start a Search Party with the people you're buying with.</p>
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="btn btn-sm" href="passport.html#homes">My saved homes</a><a class="btn btn-sm" href="tour.html">Plan a Tour Day</a><a class="btn btn-sm" href="party.html">Search Party</a></div></div></div>`;

/* header height -> feed height */
const setH=()=>{const h=$('.site-header'); if(h) $('.rl').style.setProperty('--hdr',h.offsetHeight+'px');}; setH(); addEventListener('resize',setH);

/* slide engine */
let cur=null, timer=null; const viewed=new Set();
const slideTo=(el,k)=>{const s=$$('.rl-slide',el), p=$$('.rl-prog i',el); if(!s.length) return; k=(k+s.length)%s.length; el._k=k;
  s.forEach((x,j)=>x.classList.toggle('on',j===k)); p.forEach((x,j)=>{x.classList.toggle('done',j<k); x.classList.remove('cur');});
  void el.offsetWidth; p[k]&&p[k].classList.add('cur'); const img=$('img',s[k]); if(img){img.style.animation='none'; void img.offsetWidth; img.style.animation='';}
  schedule(el);};
const schedule=el=>{clearTimeout(timer); if(st.auto&&el===cur&&el.dataset.kind==='listing') timer=setTimeout(()=>slideTo(el,(el._k||0)+1),SLIDE_MS);};
const activate=el=>{if(cur===el) return; if(cur){cur.classList.remove('playing'); const v=$('video',cur); v&&v.pause();}
  cur=el; el.classList.toggle('playing',st.auto); const v=$('video',el); if(v&&st.auto) v.play().catch(()=>{});
  if(el.dataset.kind==='listing'){el._k=el._k||0; schedule(el);} else clearTimeout(timer);
  if(el.id){history.replaceState(history.state,'','#'+el.id); if(!viewed.has(el.id)){viewed.add(el.id); track('reel_view',{reel:el.id,kind:el.dataset.kind||'end',position:+el.dataset.i});}}};
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.6) activate(e.target);}),{root:feed,threshold:[.6]});
$$('.rl-item',feed).forEach(x=>io.observe(x));

const itemOf=el=>items[+el.closest('.rl-item').dataset.i];
const go=d=>{const all=$$('.rl-item',feed); const i=Math.max(0,Math.min(all.length-1,all.indexOf(cur)+d)); all[i].scrollIntoView({behavior:RM.matches?'auto':'smooth',block:'start'});};
const setAuto=on=>{st.auto=on; SC.db.set('sc_reels_prefs',{auto:st.auto,muted:st.muted}); const b=$('[data-rl-auto]'); b.setAttribute('aria-pressed',on); b.textContent=on?'Autoplay on':'Autoplay off';
  if(cur){cur.classList.toggle('playing',on); const v=$('video',cur); v&&(on?v.play().catch(()=>{}):v.pause()); schedule(cur);} track('reel_autoplay_toggle',{on});};
const setMute=m=>{st.muted=m; SC.db.set('sc_reels_prefs',{auto:st.auto,muted:st.muted}); const b=$('[data-rl-mute]'); b.setAttribute('aria-pressed',m); b.textContent=m?'Sound off':'Sound on';
  SC.toast(m?'Sound off':'Sound on: applies to the YouTube video; local reels have no audio'); track('reel_mute_toggle',{muted:m});};
setAuto(st.auto); $('[data-rl-mute]').setAttribute('aria-pressed',st.muted); $('[data-rl-mute]').textContent=st.muted?'Sound off':'Sound on';

const share=async it=>{const url=location.origin+location.pathname+'#r-'+it.id; const title=it.l?`${it.l.address}, ${fmt(it.l.price)}`:it.title;
  track('reel_share',{reel:it.id});
  if(navigator.share){try{await navigator.share({title,text:title+' on SearchCharlotte.com',url}); return;}catch(e){if(e&&e.name==='AbortError') return;}}
  try{await navigator.clipboard.writeText(url); SC.toast('Link copied');}catch(e){prompt('Copy this link',url);}};

feed.addEventListener('click',e=>{
  const tp=e.target.closest('.rl-tap'); if(tp){const el=tp.closest('.rl-item'); slideTo(el,(el._k||0)+(tp.classList.contains('next')?1:-1)); return;}
  const b=e.target.closest('[data-rl]'); if(!b) return; const it=itemOf(b), a=b.dataset.rl;
  if(a==='save'){const on=SC.toggleSave(it.id); b.setAttribute('aria-pressed',on); track('reel_save',{listing_id:it.id,on});}
  if(a==='tour'){const on=SC.toggleTour(it.id); b.setAttribute('aria-pressed',on);}
  if(a==='photos'){if(SC.gallery&&SC.gallery.open) SC.gallery.open(it.l,it.l._k||0); else location.href='listing.html?id='+it.id;}
  if(a==='share') share(it);
  if(a==='showing'){track('reel_request_showing',{listing_id:it.l?it.id:''}); SC.agentConnect?SC.agentConnect.open(it.l?{action:'showing',listingId:it.id,source:'reels'}:{action:'question',source:'reels'}):location.href='contact.html';}
  if(a==='yt'){const m=$('[data-yt-mount]',b.closest('.rl-item')); m.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${it.yt}?autoplay=1&mute=${st.muted?1:0}&cc_load_policy=1&playsinline=1&rel=0" title="${esc(it.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`; b.remove(); $('.rl-ytnote',m.closest('.rl-item'))?.remove(); track('reel_video_play',{video:it.yt});}
});
$('[data-rl-auto]').addEventListener('click',()=>setAuto(!st.auto));
$('[data-rl-mute]').addEventListener('click',()=>setMute(!st.muted));
const hb=$('[data-rl-help]'), hp=$('#rl-help'); hb.addEventListener('click',()=>{hp.hidden=!hp.hidden; hb.setAttribute('aria-expanded',!hp.hidden);});
document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable],.ac-panel,.gx')||e.metaKey||e.ctrlKey||e.altKey) return;
  if(document.querySelector('.ac-panel.open')) return;
  const k=e.key;
  if(k==='ArrowDown'||k==='j'||k==='PageDown'){e.preventDefault(); go(1);}
  else if(k==='ArrowUp'||k==='k'||k==='PageUp'){e.preventDefault(); go(-1);}
  else if((k==='ArrowRight'||k==='ArrowLeft')&&cur&&cur.dataset.kind==='listing'){e.preventDefault(); slideTo(cur,(cur._k||0)+(k==='ArrowRight'?1:-1));}
  else if(k===' '&&!e.target.closest('button,a')){e.preventDefault(); setAuto(!st.auto);}
  else if(k==='s'&&cur){const b=$('[data-rl="save"]',cur); b&&b.click();}
  else if(k==='m') setMute(!st.muted);
  else if(k==='Escape'&&!hp.hidden){hp.hidden=true; hb.setAttribute('aria-expanded','false');}});
RM.addEventListener&&RM.addEventListener('change',()=>{if(RM.matches) setAuto(false);});

/* deep link */
const h=location.hash.slice(1); const t=h&&document.getElementById(h); if(t&&t.classList.contains('rl-item')) t.scrollIntoView({block:'start'});
})();

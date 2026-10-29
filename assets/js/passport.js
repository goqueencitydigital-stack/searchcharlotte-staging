/* Search Charlotte Passport, personal dashboard (preview).
   Preview storage: SC.db (window.name, this tab only). Production: Showcase IDX registered-user account for saved
   listings, saved searches/subscriptions and Friends & Family; a small Passport API for everything Showcase doesn't store. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC;
const hero=$('#pp-hero'), root=$('#pp-root'); if(!root) return;
const db=SC.db, arr=k=>{const v=db.get(k,[]); return Array.isArray(v)?v:[];};
const SAMPLE='Sample data: live MLS data via Showcase IDX at launch';
const NAV=[['overview','Overview'],['homes','My Homes'],['searches','Searches & Alerts'],['neighborhoods','Neighborhoods'],['tours','Tours'],['comparisons','Comparisons'],['lifestyle','Lifestyle'],['budget','Budget'],['concierge','Concierge'],['advisor','My Advisor'],null,['notifications','Notifications'],['privacy','Privacy & Data']];
const user=()=>SC.user();
const signedIn=()=>{const u=user(); return !!(u&&u.signedIn!==false);};
const hoodsFav=()=>arr('sc_hoods').map(h=>typeof h==='string'?h:(h&&(h.slug||h.id))).filter(Boolean);
const hoodBy=s=>D.hoods.find(h=>h.slug===s);
const listings=ids=>ids.map(SC.listing).filter(Boolean);
const rel=ts=>{const m=Math.round((Date.now()-new Date(ts))/6e4); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';};
const thumb=l=>`<img src="assets/img/${l.img}.webp" alt="" width="84" height="66" loading="lazy">`;
let amen={}; SC.amenities.then(a=>{amen=a||{};});
let costA=null; SC.costAssumptions.then(a=>{costA=a;});

/* ================= Auth ================= */
let authPaint=null;
const consentBlock=(c={},pre='su')=>`<fieldset class="pp-consents"><legend>Optional, each is off unless you turn it on</legend>
  <label class="pp-check"><input type="checkbox" name="personalize" ${c.personalize?'checked':''}><span><strong>Personalize my experience.</strong> Use my saved homes, searches and stated preferences to tailor recommendations on this site.</span></label>
  <label class="pp-check"><input type="checkbox" name="cemail" ${c.email?'checked':''}><span><strong>Email updates.</strong> Send me emails about my saved homes, alerts and market updates. Unsubscribe anytime.</span></label>
  <label class="pp-check"><input type="checkbox" name="csms" ${c.sms?'checked':''}><span><strong>Text messages.</strong> ${esc(SC.smsConsentText)}</span></label></fieldset>`;
const authView=(tab='create')=>{const u=user();
  hero.innerHTML=`<p class="eyebrow">Search Charlotte Passport</p><h1 class="display d-xl">Your whole home search, in one place</h1>
   <p class="lede">Saved homes, searches and alerts, neighborhoods, tours, comparisons, your budget and your agent, organized into one personal dashboard.</p>
   <p style="margin-top:16px"><span class="pp-preview">Preview account: stored only in this browser tab</span></p>`;
  root.innerHTML=`<div class="pp-auth">
   <div><h2 class="display d-lg">What Passport keeps together</h2><p class="lede" style="margin:10px 0 20px">Everything you do on SearchCharlotte.com rolls up here, so you never lose a home you liked or a note from a showing.</p>
    <div class="pp-feat">${[['Saved homes','With Home Match scores, price changes and notes'],['Smart alerts','New matches, price cuts, open houses, instant, daily or weekly'],['Tour Day','Plan an efficient showing route and request times'],['Search Party','Search with family, react and vote on a shortlist'],['Budget','Affordability and True Cost scenarios with sources'],['Your advisor','Message John Siddons and the Search Charlotte team']].map(([a,b])=>`<div><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>
    <p class="form-note" style="margin-top:16px">At launch, Passport signs you in with your SearchCharlotte home-search account (powered by Showcase IDX. Email, Google or Facebook), so saved homes and saved searches stay in sync with the MLS search.</p></div>
   <div class="pp-auth-card"><div class="tabs" role="tablist"><button role="tab" type="button" data-auth="create" aria-selected="${tab==='create'}">Create account</button><button role="tab" type="button" data-auth="signin" aria-selected="${tab==='signin'}">Sign in</button></div>
    <div id="auth-body"></div></div></div>`;
  const body=$('#auth-body');
  const paint=t=>{$$('[data-auth]',root).forEach(b=>b.setAttribute('aria-selected',b.dataset.auth===t));
    if(t==='create'){body.innerHTML=`<form class="form" data-lead="passport_signup" novalidate>
      <div class="row"><div class="field"><label for="su-f">First name</label><input id="su-f" name="first" required autocomplete="given-name"></div><div class="field"><label for="su-l">Last name</label><input id="su-l" name="last" required autocomplete="family-name"></div></div>
      <div class="field"><label for="su-e">Email</label><input id="su-e" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="su-p">Mobile phone <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input id="su-p" name="phone" type="tel" autocomplete="tel"></div>
      ${consentBlock()}${SC.honeypot}
      <button class="btn btn-block" type="submit">Create my Passport</button>
      <p class="form-note">Preview accounts don't use a password and live only in this browser tab, close the tab and they're gone. By creating an account you agree to the <a href="legal.html#terms" style="text-decoration:underline">Terms</a> and <a href="legal.html#privacy" style="text-decoration:underline">Privacy Policy</a>.</p>
      <div class="form-ok">Passport created.</div></form>`;
      SC.leadForm($('form',body),d=>{if(d.csms&&!d.phone){const p=$('#su-p'); p.setCustomValidity('Add a mobile number to receive texts'); p.reportValidity(); p.setCustomValidity(''); return 'keep';}
        db.set('sc_user',{first:d.first.trim(),last:d.last.trim(),email:d.email.trim(),phone:(d.phone||'').trim(),consent:{personalize:!!d.personalize,email:!!d.cemail,sms:!!d.csms},created:new Date().toISOString(),signedIn:true,welcome:true});
        SC.notify('Welcome to your Passport, '+d.first.trim(),'Save homes, create alerts and plan tours, everything shows up here.','passport.html#overview');
        track('sign_up',{method:'passport_preview',personalize:!!d.personalize,email_optin:!!d.cemail,sms_optin:!!d.csms}); render(); scrollTo({top:0}); return 'keep';});}
    else {body.innerHTML=`<form class="form" data-lead="passport_signin" novalidate>
      <div class="field"><label for="si-e">Email</label><input id="si-e" name="email" type="email" required autocomplete="email" value="${esc(u&&u.email||'')}"></div>
      <div class="field"><label for="si-p">Password</label><input id="si-p" name="pw" type="password" autocomplete="current-password" placeholder="Not used in preview"></div>${SC.honeypot}
      <button class="btn btn-block" type="submit">Sign in</button>
      <p style="margin:2px 0 0"><button class="pp-link" type="button" data-recover>Forgot password or can't sign in?</button></p>
      <div class="form-ok" data-ok></div></form>`;
      SC.leadForm($('form',body),(d,f)=>{const ok=$('[data-ok]',f); const cur=user();
        if(cur&&cur.email.toLowerCase()===d.email.trim().toLowerCase()){db.set('sc_user',Object.assign({},cur,{signedIn:true})); track('login',{method:'passport_preview'}); render(); scrollTo({top:0}); return 'keep';}
        ok.textContent='No preview account with that email exists in this browser tab. Preview accounts are tab-only: create one to continue.'; f.classList.add('sent'); return 'keep';});}};
  authPaint=paint; paint(tab);
};

/* Account recovery (mock) */
const recover=(step=1,email='')=>{const b=$('#rec-body');
  if(step===1){b.innerHTML=`<p style="font-size:13.5px">Enter the email on your account. We'll send a one-time link to reset your password.</p><form class="form" id="rec1"><div class="field"><label for="rc-e">Email</label><input id="rc-e" type="email" required autocomplete="email" value="${esc(email||(user()||{}).email||'')}"></div><button class="btn btn-block" type="submit">Send reset link</button></form>`;
    $('#rec1').addEventListener('submit',e=>{e.preventDefault(); const v=$('#rc-e').value; if(!e.target.checkValidity()){e.target.reportValidity(); return;} track('password_reset_request',{}); recover(2,v);});}
  else if(step===2){b.innerHTML=`<p style="font-size:13.5px">If an account exists for <strong>${esc(email)}</strong>, a reset link and 6-digit code are on the way. For your security, we show this same message whether or not the email is registered.</p>
    <form class="form" id="rec2"><div class="field"><label for="rc-c">6-digit code</label><input id="rc-c" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="Any 6 digits in preview"></div><button class="btn btn-block" type="submit">Verify code</button>
    <p class="form-note">Preview: no email was sent and any 6 digits continue. At launch codes expire quickly and are single-use.</p></form>`;
    $('#rec2').addEventListener('submit',e=>{e.preventDefault(); if(!e.target.checkValidity()){e.target.reportValidity(); return;} recover(3,email);});}
  else if(step===3){b.innerHTML=`<form class="form" id="rec3"><div class="field"><label for="rc-p">New password</label><input id="rc-p" type="password" minlength="10" required autocomplete="new-password"></div><p class="form-note">At least 10 characters. Preview: the password is not stored.</p><button class="btn btn-block" type="submit">Set new password</button></form>`;
    $('#rec3').addEventListener('submit',e=>{e.preventDefault(); if(!e.target.checkValidity()){e.target.reportValidity(); return;} track('password_reset_complete',{}); recover(4,email);});}
  else b.innerHTML=`<div class="form-ok" style="display:block">Password updated (preview). At launch you'd be signed in on this device and other sessions would be signed out.</div>`;
};
document.addEventListener('click',e=>{if(e.target.closest('[data-recover]')){e.preventDefault(); recover(1); SC.openModal('m-recover');}});

/* ================= Sample activity ================= */
const loadSample=()=>{const L=D.listings, X=SC.extras;
  const cut=L.filter(l=>X(l).priceCuts).slice(0,2), oh=L.filter(l=>X(l).openHouse).slice(0,1), other=L.filter(l=>l.type==='Single Family'&&!cut.includes(l)&&!oh.includes(l)).slice(0,3);
  const ids=[...new Set([...cut,...oh,...other].map(l=>l.id))].slice(0,6);
  db.set('sc_saved',[...new Set([...SC.saved(),...ids])]); $$('[data-saved-count]').forEach(e=>e.textContent=SC.saved().length);
  const hs=[...new Set(ids.map(id=>SC.listing(id).hood))].slice(0,2); db.set('sc_hoods',[...new Set([...hoodsFav(),...hs])]);
  if(!arr('sc_searches').length) db.set('sc_searches',[{id:SC.uid('ss'),name:'3+ beds under $750K',qs:'max=750000&beds=3',filters:{max:750000,beds:3},created:new Date().toISOString(),sample:true}]);
  if(!SC.alerts.list().length){SC.alerts.add({type:'new_match',criteria:{max:'750000',beds:'3'},frequency:'daily',source:'passport'}); SC.alerts.add({type:'price_drop',criteria:{listingId:ids[0]},frequency:'instant',source:'passport'});}
  db.set('sc_tourlist',ids.slice(0,4)); db.set('sc_compare',ids.slice(0,3));
  if(!SC.hasPrefs()) SC.setPrefs({budgetMax:750000,beds:3,baths:2,types:['Single Family']});
  SC.notify('Sample activity added','Saved homes, a search, alerts and a tour list were added so you can explore Passport.','passport.html#overview');
  track('passport_sample_load',{}); SC.toast('Sample activity added'); render();};

/* ================= Recommendations feed ================= */
const feed=()=>{const S=listings(SC.saved()), out=[];
  S.forEach(l=>{const x=SC.extras(l); if(x.priceCuts) out.push({img:l,t:`Price reduced on ${l.address}`,b:`Now ${fmt(l.price)}, ${short(x.originalPrice-l.price)} below the original list price`,s:'Saved home · '+SAMPLE,h:'listing.html?id='+l.id,go:'View home',w:5});
    if(x.openHouse) out.push({img:l,t:`Open house: ${l.address}`,b:x.openHouse,s:'Saved home · sample data. Confirm times with the agent',h:'listing.html?id='+l.id,go:'Plan a visit',w:4});
    if(x.backOnMarket) out.push({img:l,t:`Back on market: ${l.address}`,b:'Previously pending, now active again',s:'Saved home · '+SAMPLE,h:'listing.html?id='+l.id,go:'View home',w:4});});
  if(SC.hasPrefs()){D.listings.filter(l=>!SC.saved().includes(l.id)&&l.dom<=21).map(l=>({l,m:SC.match(l,undefined,amen)})).filter(x=>x.m&&x.m.score>=70).sort((a,b)=>b.m.score-a.m.score).slice(0,3)
    .forEach(({l,m})=>out.push({img:l,t:`New match: ${l.address}`,b:`${m.score}% Home Match, ${m.matches.slice(0,2).join(' · ')}`,s:`Listed ${l.dom} days ago · `+SAMPLE,h:'listing.html?id='+l.id,go:'See why',w:3}));}
  const fav=[...new Set([...hoodsFav(),...S.map(l=>l.hood)])];
  const med=S.length?S.map(l=>l.price).sort((a,b)=>a-b)[Math.floor(S.length/2)]:null;
  fav.slice(0,3).forEach(h=>{const hd=hoodBy(h); if(!hd) return; const sim=D.listings.filter(l=>l.hood===h&&!SC.saved().includes(l.id)&&(!med||Math.abs(l.price-med)/med<=0.3)).slice(0,1);
    sim.forEach(l=>out.push({img:l,t:`Similar home in ${hd.name}`,b:`${fmt(l.price)} · ${SC.facts(l)}`,s:'Similar price to your saved homes · '+SAMPLE,h:'listing.html?id='+l.id,go:'View home',w:2}));
    out.push({ico:hd.name,t:`${hd.name} neighborhood guide`,b:'Housing styles, getting around, parks and shopping',s:'Guide',h:'neighborhoods/'+h+'/',go:'Read guide',w:1});});
  out.push({ico:'Market',t:'Charlotte market insights',b:'Latest local market report with cited sources',s:'Guide',h:'market.html',go:'Read',w:0});
  return out.sort((a,b)=>b.w-a.w);};
const feedHTML=items=>`<div class="pp-feed">${items.map(i=>`<article class="pp-fi">${i.img?thumb(i.img):`<span class="ico" aria-hidden="true">${esc(i.ico)}</span>`}<div><strong>${esc(i.t)}</strong><span>${esc(i.b)}</span><small>${esc(i.s)}</small></div><span class="go">${esc(i.go)} →</span><a class="stretch" href="${i.h}" aria-label="${esc(i.t)}"></a></article>`).join('')}</div>`;

/* ================= Panels ================= */
const counts=()=>({homes:SC.saved().length,searches:arr('sc_searches').length+SC.alerts.list().length,neighborhoods:hoodsFav().length,tours:arr('sc_tours').length,comparisons:arr('sc_comparisons').length,lifestyle:arr('sc_lifestyle').length,notifications:arr('sc_notifs').filter(n=>!n.read).length});
const empty=(t,p,cta)=>`<div class="empty"><h3>${t}</h3><p>${p}</p>${cta||''}</div>`;
const P={};
P.overview=()=>{const u=user(), f=feed(), hasAct=SC.saved().length||arr('sc_searches').length;
  return `${u.welcome?`<div class="pp-card pp-welcome" id="pp-welcome">
     <div><p class="eyebrow">A note from John</p><h3 style="font-size:20px;margin:6px 0">Thanks for joining, ${esc(u.first)}</h3><p style="font-size:13.5px;margin:0 0 12px">John Siddons recorded a short welcome for new SearchCharlotte.com members.</p><button class="btn btn-sm btn-outline" type="button" data-dismiss-welcome>Dismiss</button></div>
     <div class="pp-yt" data-yt="hqp3otFhoXY" data-title="Thank you for registering for SearchCharlotte.com!"></div></div>`:''}
   ${!hasAct?`<div class="pp-card" style="margin-bottom:16px;background:var(--espresso);color:#F4EBDD;border:0"><h3 style="color:#fff">Start your search</h3><p style="color:#e7dccd">Save homes from the search, follow neighborhoods and create alerts, your dashboard fills in as you go. Or load sample activity to explore every section now.</p>
     <div class="hero-actions" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-light btn-sm" href="search.html">Search homes</a><button class="btn btn-sm btn-ghost" type="button" data-sample>Load sample activity</button></div></div>`:''}
   <div class="pp-h"><div><h2 class="display d-md">Recommended for you</h2><p>Price changes on homes you saved, new homes that fit your criteria, similar homes in your neighborhoods and guides. ${SAMPLE}.</p></div></div>
   ${feedHTML(f)}`;};
P.homes=()=>{const S=listings(SC.saved()); const rec=SC.hasPrefs()?D.listings.filter(l=>!SC.saved().includes(l.id)).map(l=>({l,m:SC.match(l,undefined,amen)})).filter(x=>x.m).sort((a,b)=>b.m.score-a.m.score).slice(0,4):[];
  const notes=db.get('sc_notes',{}), rat=db.get('sc_ratings',{});
  return `<div class="pp-h"><div><h2 class="display d-md">My Homes</h2><p>${S.length} saved home${S.length===1?'':'s'}. ${SAMPLE}.</p></div>
    ${S.length?`<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="tour.html?ids=${S.slice(0,8).map(l=>l.id).join(',')}">Plan a Tour Day</a><a class="btn btn-sm btn-outline" href="compare.html?ids=${S.slice(0,4).map(l=>l.id).join(',')}">Compare top ${Math.min(4,S.length)}</a></div>`:''}</div>
   ${S.length?`<div class="pp-grid">${S.map(l=>`<div>${SC.card(l)}<div style="padding:8px 4px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center">${SC.matchBadge(l,amen)}${rat[l.id]?`<span class="pp-pill">Your rating ${rat[l.id]}/5</span>`:''}${SC.extras(l).priceCuts?'<span class="pp-pill warn">Price reduced</span>':''}</div>${notes[l.id]?`<p class="form-note" style="padding:4px">Note: ${esc(notes[l.id])}</p>`:''}</div>`).join('')}</div>`
     :empty('No saved homes yet','Tap the heart on any home to save it here.','<a class="btn btn-sm" href="search.html">Search homes</a>')}
   <div class="pp-h" style="margin-top:36px"><div><h2 class="display d-md">Recommended by Home Match</h2><p>${SC.hasPrefs()?'Ranked by how many of your own criteria each home meets, price, size, type, area and features only. Match scores are estimates.':'Set your preferences in Concierge to see homes ranked for you.'}</p></div>${SC.hasPrefs()?'':'<a class="btn btn-sm btn-outline" href="#concierge" data-tab="concierge">Set preferences</a>'}</div>
   ${rec.length?`<div class="pp-grid">${rec.map(({l})=>`<div>${SC.card(l)}<div style="padding:8px 4px 0">${SC.matchBadge(l,amen)}</div></div>`).join('')}</div>`:''}`;};
P.searches=()=>{const S=arr('sc_searches');
  return `<div class="pp-h"><div><h2 class="display d-md">Saved searches</h2><p>Re-run a search in one tap or turn it into an alert.</p></div></div>
   ${S.length?`<div class="pp-rows">${S.map(s=>`<div class="pp-row" data-ss="${esc(s.id)}"><div><h3>${esc(s.name||'Saved search')}</h3><p>${esc(SC.alerts.describe({criteria:s.filters||{}}))} · Saved ${new Date(s.created).toLocaleDateString()}${s.sample?' · sample':''}</p></div>
      <div class="acts"><a class="btn btn-sm" href="search.html?${esc(s.qs||'')}">Run search</a><button class="btn btn-sm btn-outline" type="button" data-ss-alert>Alert me</button><button class="btn btn-sm btn-outline" type="button" data-ss-del>Delete</button></div></div>`).join('')}</div>`:empty('No saved searches','Save a search below, or from the home search at launch.')}
   <details class="pp-card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Save a new search</summary>
    <form class="form" id="ss-form" style="margin-top:14px"><div class="field"><label for="ss-n">Name</label><input id="ss-n" name="name" required placeholder="e.g. Dilworth under $900K"></div>
     <div class="row"><div class="field"><label for="ss-h">Area</label><select id="ss-h" name="hood"><option value="">Anywhere</option>${D.hoods.map(h=>`<option value="${h.slug}">${esc(h.name)}</option>`).join('')}</select></div>
     <div class="field"><label for="ss-m">Max price</label><select id="ss-m" name="max"><option value="">No max</option>${[400,500,600,750,1000,1500].map(k=>`<option value="${k*1000}">${short(k*1000)}</option>`).join('')}</select></div></div>
     <div class="field"><label for="ss-b">Bedrooms</label><select id="ss-b" name="beds"><option value="">Any</option>${[2,3,4,5].map(b=>`<option>${b}</option>`).join('')}</select></div>
     <button class="btn btn-sm" type="submit">Save search</button></form></details>
   <div class="pp-h" style="margin-top:36px"><div><h2 class="display d-md">Smart alerts</h2><p>Edit frequency and channels, pause, delete or unsubscribe. The same controls are on the <a href="alerts.html" style="text-decoration:underline">alert settings page</a> linked from every alert.</p></div></div>
   <div id="al-mgr"></div>
   <details class="pp-card" style="margin-top:16px" id="al-new"><summary style="cursor:pointer;font-weight:600">Create a new alert</summary><div id="al-sub" style="margin-top:14px"></div></details>`;};
P.neighborhoods=()=>{const F=hoodsFav(), R=db.get('sc_reloc',null);
  return `<div class="pp-h"><div><h2 class="display d-md">My Neighborhoods</h2><p>Follow areas to see similar homes and guides in your feed.</p></div></div>
   <div class="chips" role="group" aria-label="Follow neighborhoods">${D.hoods.map(h=>`<button type="button" class="chip" data-hood="${h.slug}" aria-pressed="${F.includes(h.slug)}">${esc(h.name)}</button>`).join('')}</div>
   ${F.length?`<div class="pp-grid" style="margin-top:20px">${F.map(hoodBy).filter(Boolean).map(h=>{const n=D.listings.filter(l=>l.hood===h.slug).length; return `<article class="pp-card" style="padding:0;overflow:hidden;position:relative"><img src="assets/img/${h.img}.webp" alt="" style="width:100%;aspect-ratio:1.7;object-fit:cover" loading="lazy"><div style="padding:14px 16px 16px"><h3>${esc(h.name)}</h3><p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">${esc(h.city)} · ${n} sample listing${n===1?'':'s'}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="neighborhoods/${h.slug}/">Guide</a><a class="btn btn-sm btn-outline" href="search.html?q=${h.slug}">Homes</a></div></div></article>`;}).join('')}</div>`:''}
   <div class="pp-h" style="margin-top:36px"><div><h2 class="display d-md">Relocation research</h2><p>Notes, commute targets and comparisons you build while researching a move.</p></div></div>
   ${R&&(Array.isArray(R)?R.length:Object.keys(R).length)?`<div class="pp-card">${relocHTML(R)}</div>`:empty('Nothing saved yet','Relocation research you save elsewhere on the site appears here.','<a class="btn btn-sm btn-outline" href="neighborhoods.html">Explore neighborhoods</a>')}`;};
const relocHTML=R=>{const items=Array.isArray(R)?R:Object.entries(R).map(([k,v])=>({label:k,value:v}));
  return `<ul style="margin:0;padding-left:18px;font-size:13.5px">${items.slice(0,20).map(it=>{if(typeof it!=='object') return `<li>${esc(it)}</li>`; const t=it.name||it.title||it.label||it.city||it.hood||'Item'; const v=it.value!==undefined?(typeof it.value==='object'?JSON.stringify(it.value).slice(0,140):it.value):(it.note||it.summary||''); return `<li><strong>${esc(t)}</strong>${v!==''?', '+esc(v):''}</li>`;}).join('')}</ul>`;};
P.tours=()=>{const T=arr('sc_tours'), TL=listings(SC.tourList());
  return `<div class="pp-h"><div><h2 class="display d-md">My Tours</h2><p>Showing requests you've sent from Tour Day. Requested times are not confirmed until an agent confirms them.</p></div><a class="btn btn-sm" href="tour.html">Open Tour Day</a></div>
   ${TL.length?`<div class="pp-card" style="margin-bottom:16px"><h3>Tour list (${TL.length})</h3><p>${TL.map(l=>esc(l.address)).join(' · ')}</p><a class="btn btn-sm" style="margin-top:12px" href="tour.html">Plan the route</a></div>`:''}
   ${T.length?`<div class="pp-rows">${T.map(t=>`<div class="pp-row"><div><h3>${esc(t.date?new Date(t.date+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'Date flexible')} · ${esc(t.start||'')}${t.end?'–'+esc(t.end):''}</h3><p>${(t.stops||[]).length} homes · ${esc(t.startLabel||'')}</p><span class="td-status">${esc(t.status||'Requested, not confirmed until an agent confirms')}</span></div><div class="acts"><a class="btn btn-sm btn-outline" href="tour.html?tour=${esc(t.id)}">Open itinerary</a></div></div>`).join('')}</div>`
     :empty('No tour requests yet','Add homes to Tour Day, plan the route and request showings.','<a class="btn btn-sm" href="tour.html">Plan a Tour Day</a>')}`;};
P.comparisons=()=>{const C=arr('sc_comparisons'), cur=SC.compare();
  return `<div class="pp-h"><div><h2 class="display d-md">My Comparisons</h2><p>Side-by-side comparisons you've saved. ${SAMPLE}.</p></div></div>
   ${cur.length?`<div class="pp-card" style="margin-bottom:16px"><h3>Compare tray (${cur.length})</h3><p>${listings(cur).map(l=>esc(l.address)).join(' · ')}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn btn-sm" href="compare.html?ids=${cur.join(',')}">Open comparison</a><button class="btn btn-sm btn-outline" type="button" data-save-cmp>Save this comparison</button></div></div>`:''}
   ${C.length?`<div class="pp-rows">${C.map((c,i)=>{const ids=Array.isArray(c)?c:(c.ids||[]); return `<div class="pp-row"><div><h3>${esc(c.name||'Comparison '+(i+1))}</h3><p>${listings(ids).map(l=>esc(l.address)).join(' · ')}${c.created?' · Saved '+new Date(c.created).toLocaleDateString():''}</p></div><div class="acts"><a class="btn btn-sm" href="compare.html?ids=${ids.join(',')}">Open</a><button class="btn btn-sm btn-outline" type="button" data-del-cmp="${i}">Delete</button></div></div>`;}).join('')}</div>`
     :(!cur.length?empty('No comparisons yet','Use “Compare” on any home to line up to four side by side.','<a class="btn btn-sm" href="search.html">Find homes</a>'):'')}`;};
P.lifestyle=()=>{const F=arr('sc_lifestyle'); const S=listings(SC.saved());
  return `<div class="pp-h"><div><h2 class="display d-md">My Lifestyle</h2><p>Places you want to be near, a gym, a coffee shop, a greenway. Find them near a saved home or landmark and star them.</p></div></div>
   ${F.length?`<div class="pp-places">${F.map((p,i)=>`<div class="pp-place"><span><strong>${esc(p.name)}</strong><small>${esc(SC.poi.label(p.cat))}${p.sub?' · '+esc(p.sub):''}${p.near?' · '+esc(p.near):''}</small></span><button class="pp-star" type="button" aria-pressed="true" data-unstar="${i}">Starred</button></div>`).join('')}</div>`:empty('No favorite places yet','Search below and star the places that matter to you.')}
   <div class="pp-card" style="margin-top:16px"><h3>Find places</h3><form class="pp-form-grid" id="lf-form" style="margin-top:10px">
    <div class="field"><label for="lf-a">Near</label><select id="lf-a" name="a">${S.map(l=>`<option value="h:${l.id}">${esc(l.address)} (saved)</option>`).join('')}${SC.LANDMARKS.map(m=>`<option value="m:${m.id}">${esc(m.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="lf-c">Category</label><select id="lf-c" name="c">${Object.entries(SC.POI_CATS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
    <div class="field"><label for="lf-r">Within</label><select id="lf-r" name="r"><option value="1">1 mile</option><option value="2" selected>2 miles</option><option value="3">3 miles</option></select></div>
    <div class="field" style="align-self:end"><button class="btn btn-block" type="submit">Find places</button></div></form>
    <div id="lf-out"></div><p class="form-note" style="margin-top:10px">${esc(SC.poi.attribution)}</p></div>`;};
P.budget=()=>{const B=db.get('sc_budget',{})||{}; const a=costA; const sc=Array.isArray(B.scenarios)?B.scenarios:[];
  const v=(k,d)=>B[k]!=null&&B[k]!==''?B[k]:d;
  return `<div class="pp-h"><div><h2 class="display d-md">My Budget</h2><p>An affordability estimate from the monthly payment you're comfortable with. This is an estimate: not a lender quote, pre-approval or financial advice.</p></div></div>
   <div class="pp-card"><form class="pp-form-grid" id="bd-form">
    <div class="field"><label for="bd-m">Comfortable monthly payment</label><input id="bd-m" name="monthly" type="number" min="500" step="any" required value="${esc(v('monthly',''))}" placeholder="e.g. 3500"></div>
    <div class="field"><label for="bd-d">Down payment %</label><input id="bd-d" name="down" type="number" min="0" max="100" step="any" value="${esc(v('down',10))}"></div>
    <div class="field"><label for="bd-r">Interest rate %</label><input id="bd-r" name="rate" type="number" min="0" max="20" step="any" value="${esc(v('rate',a&&a.rate?a.rate.value:''))}" required></div>
    <div class="field"><label for="bd-t">Property tax % / yr</label><input id="bd-t" name="tax" type="number" min="0" max="5" step="any" value="${esc(v('tax',a?a.tax.byCity.Charlotte.per100:''))}" required></div>
    <div class="field"><label for="bd-i">Insurance $ / yr</label><input id="bd-i" name="ins" type="number" min="0" step="any" value="${esc(v('ins',a?a.insurance.value:''))}" required></div>
    <div class="field"><label for="bd-h">HOA $ / mo</label><input id="bd-h" name="hoa" type="number" min="0" step="any" value="${esc(v('hoa',0))}"></div>
    <div class="field" style="align-self:end"><button class="btn btn-block" type="submit">Estimate my price range</button></div></form>
    <div id="bd-out">${B.maxPrice?budgetOut(B):''}</div>
    ${a?`<p class="form-note" style="margin-top:12px">Default assumptions (edit any of them): rate, <a href="${a.rate.url}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(a.rate.label)}</a>; tax, ${esc(a.tax.byCity.Charlotte.label)} per $100 of assessed value (<a href="${a.tax.byCity.Charlotte.sources[0].url}" target="_blank" rel="noopener" style="text-decoration:underline">Mecklenburg County</a>); insurance, <a href="${a.insurance.url}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(a.insurance.source)}</a>; PMI ${a.pmi.value}% of loan when under 20% down (<a href="${a.pmi.url}" target="_blank" rel="noopener" style="text-decoration:underline">Experian</a>). Retrieved ${esc(a.retrieved)}.</p>`:''}</div>
   <div class="pp-h" style="margin-top:36px"><div><h2 class="display d-md">True Cost scenarios</h2><p>Monthly cost-to-own scenarios you save from a listing or here, using your budget assumptions.</p></div></div>
   ${sc.length?`<div class="pp-rows">${sc.map((s,i)=>{const l=SC.listing(s.listingId||s.id); return `<div class="pp-row"><div><h3>${esc(l?l.address:(s.name||'Scenario'))}</h3><p>${s.total?'About '+fmt(s.total)+'/mo estimated':''}${s.downPct!=null?' · '+s.downPct+'% down':''}${s.rate?' · '+s.rate+'% rate':''}${s.created?' · '+new Date(s.created).toLocaleDateString():''}</p></div><div class="acts">${l?`<a class="btn btn-sm btn-outline" href="listing.html?id=${l.id}">View home</a>`:''}<button class="btn btn-sm btn-outline" type="button" data-del-sc="${i}">Delete</button></div></div>`;}).join('')}</div>`:empty('No saved scenarios','Run the estimate above, then save a scenario for any saved home.')}
   ${SC.saved().length&&B.maxPrice?`<div class="pp-card" style="margin-top:12px"><h3>Save a scenario for a saved home</h3><form id="sc-form" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><select name="id" class="field" style="height:40px;border:1px solid #d6cec3;border-radius:10px;padding:0 10px;min-width:0;flex:1">${listings(SC.saved()).map(l=>`<option value="${l.id}">${esc(l.address)}, ${short(l.price)}</option>`).join('')}</select><button class="btn btn-sm" type="submit">Save scenario</button></form></div>`:''}`;};
const budgetOut=B=>`<div class="pp-kv"><div><b>${short(B.maxPrice)}</b><small>Estimated max price</small></div><div><b>${fmt(B.maxPrice*B.down/100)}</b><small>Down payment</small></div><div><b>${fmt(B.monthly)}</b><small>Monthly payment target</small></div><div><b>${D.listings.filter(l=>l.price<=B.maxPrice).length}</b><small>Sample listings at or under</small></div></div>
  <p class="form-note" style="margin-top:10px">Method: solves price where principal & interest (30-year fixed) + property tax + insurance + HOA${B.down<20?' + PMI':''} = your monthly target. Excludes utilities, maintenance and closing costs. See True Cost on each listing. <a href="search.html?max=${Math.floor(B.maxPrice/1000)*1000}" style="text-decoration:underline">See homes under ${short(B.maxPrice)}</a></p>`;
P.concierge=()=>{const p=SC.prefs();
  if(!SC.personalized()) return `<div class="pp-h"><div><h2 class="display d-md">My Concierge</h2></div></div>${empty('Personalization is off','Concierge recommendations use your saved homes and stated preferences. Turn on personalization to see them, you can switch it off anytime.','<button class="btn btn-sm" type="button" data-enable-pers>Turn on personalization</button>')}`;
  const picks=D.listings.filter(l=>!SC.saved().includes(l.id)).map(l=>({l,m:SC.match(l,p,amen)})).filter(x=>x.m).sort((a,b)=>b.m.score-a.m.score).slice(0,4);
  return `<div class="pp-h"><div><h2 class="display d-md">My Concierge</h2><p>Recommendations based only on your own choices, budget, size, home type, areas and features. Never demographics, schools-as-steering or crime data.</p></div><a class="btn btn-sm" href="ai.html">Ask the AI concierge</a></div>
   <div class="pp-card"><h3>Your preferences</h3><form class="pp-form-grid" id="pf-form" style="margin-top:10px">
    <div class="field"><label for="pf-b">Max budget</label><select id="pf-b" name="budgetMax"><option value="">Any</option>${[300,400,500,600,750,1000,1500,2000].map(k=>`<option value="${k*1000}" ${p.budgetMax===k*1000?'selected':''}>${short(k*1000)}</option>`).join('')}</select></div>
    <div class="field"><label for="pf-bd">Bedrooms</label><select id="pf-bd" name="beds"><option value="">Any</option>${[1,2,3,4,5].map(b=>`<option value="${b}" ${p.beds===b?'selected':''}>${b}+</option>`).join('')}</select></div>
    <div class="field"><label for="pf-ba">Bathrooms</label><select id="pf-ba" name="baths"><option value="">Any</option>${[1,2,3,4].map(b=>`<option value="${b}" ${p.baths===b?'selected':''}>${b}+</option>`).join('')}</select></div>
    <div class="field"><label for="pf-t">Home type</label><select id="pf-t" name="type"><option value="">Any</option>${['Single Family','Townhouse','Condo','Land'].map(t=>`<option ${p.types[0]===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="pf-a">Preferred area</label><select id="pf-a" name="area"><option value="">Any</option>${D.hoods.map(h=>`<option value="${h.slug}" ${p.areas[0]===h.slug?'selected':''}>${esc(h.name)}</option>`).join('')}</select></div>
    <div class="field" style="align-self:end"><button class="btn btn-block" type="submit">Update picks</button></div></form></div>
   ${picks.length?`<div class="pp-rows" style="margin-top:16px">${picks.map(({l,m})=>`<article class="pp-fi" style="grid-template-columns:84px 1fr auto">${thumb(l)}<div><strong>${esc(l.address)}, ${m.score}% Home Match (estimate)</strong><span>Fits: ${esc(m.matches.slice(0,3).join(' · ')||'N/A')}</span>${m.compromises.length?`<small>Trade-offs: ${esc(m.compromises.slice(0,2).join(' · '))}</small>`:''}</div><span class="go">View →</span><a class="stretch" href="listing.html?id=${l.id}" aria-label="View ${esc(l.address)}"></a></article>`).join('')}</div><p class="sample-note">${SAMPLE}. Match = weighted share of your criteria met.</p>`:empty('Set a preference or two','Pick a budget, bedrooms or an area above to see tailored picks.')}`;};
P.advisor=()=>{const a=SC.assignedAgent(), M=arr('sc_messages');
  return `<div class="pp-h"><div><h2 class="display d-md">My Advisor</h2><p>Your assigned Search Charlotte agent and your message history.</p></div></div>
   <div class="pp-advisor"><div class="pp-card pp-agent"><img src="${SC.agentPhoto(a)}" alt="${esc(a.name)}" width="120" height="120"><h3>${esc(a.name)}</h3><small>${esc(a.title)}</small><small>Berkshire Hathaway HomeServices Carolinas Realty</small>
     <div class="btns"><a class="btn btn-sm" href="tel:${SC.OFFICE.tel}">Call ${SC.OFFICE.phone}</a><a class="btn btn-sm btn-outline" href="sms:${SC.OFFICE.tel}">Text ${SC.OFFICE.phone}</a><button class="btn btn-sm btn-outline" type="button" data-agent-connect="callback">Request a callback</button><button class="btn btn-sm btn-outline" type="button" data-agent-connect="consult">Schedule a consultation</button></div>
     <p class="form-note" style="margin-top:12px">${esc(SC.OFFICE.addr)}</p></div>
    <div class="pp-card"><h3>Messages</h3><p class="form-note" style="margin:0 0 12px">${esc(SC.RESPONSE_GOAL)}</p>
     <div class="pp-thread" aria-live="polite">${M.length?M.map(m=>`<div class="pp-msg me">${esc(m.data&&m.data.message||({callback:'Callback request',consult:'Consultation request',showing:'Showing request',question:'Property question'}[m.kind]||'Request'))}${m.listingId&&SC.listing(m.listingId)?', '+esc(SC.listing(m.listingId).address):''}${m.data&&m.data.date?' · '+esc(m.data.date):''}${m.data&&m.data.window?' · '+esc(m.data.window):''}<small>${rel(m.ts)}</small></div><div class="pp-msg sys">${esc(m.status||'Recorded in preview: not sent')}</div>`).join(''):'<div class="pp-msg sys">No messages yet. Say hello. Ask about a home, a neighborhood or how to get started.</div>'}</div>
     <form class="form" data-lead="advisor_message" id="adv-form" novalidate><div class="field"><label for="adv-t">Topic</label><select id="adv-t" name="topic"><option>General question</option><option>A home I saved</option><option>Tours & showings</option><option>Selling my home</option><option>Financing & budget</option></select></div>
      <div class="field"><label for="adv-m">Message to ${esc(a.name.split(' ')[0])}</label><textarea id="adv-m" name="message" required></textarea></div>${SC.honeypot}
      <button class="btn" type="submit">Send message</button><div class="form-ok">Recorded in this preview tab only, not sent. At launch messages go to ${esc(a.name)} by email and the CRM.</div></form></div></div>`;};
P.notifications=()=>{const N=arr('sc_notifs');
  return `<div class="pp-h"><div><h2 class="display d-md">Notifications</h2><p>Alerts, request confirmations and account updates. ${N.filter(n=>!n.read).length} unread.</p></div>${N.length?`<div style="display:flex;gap:8px"><button class="btn btn-sm btn-outline" type="button" data-n-all>Mark all read</button><button class="btn btn-sm btn-outline" type="button" data-n-clear>Clear all</button></div>`:''}</div>
   ${N.length?`<div class="pp-rows">${N.map(n=>`<div class="pp-row" style="${n.read?'':'border-left:3px solid var(--plum)'}"><div><h3>${esc(n.title)}</h3><p>${esc(n.body||'')} · ${rel(n.ts)}</p></div><div class="acts">${n.href?`<a class="btn btn-sm btn-outline" href="${esc(n.href)}" data-n-open="${esc(n.id)}">Open</a>`:''}${n.read?'':`<button class="btn btn-sm btn-outline" type="button" data-n-read="${esc(n.id)}">Mark read</button>`}</div></div>`).join('')}</div>`:empty('You\'re all caught up','New alerts and updates will appear here and on the bell.')}
   <p class="form-note" style="margin-top:12px">Choose which alerts reach you by email or text in <a href="#searches" data-tab="searches" style="text-decoration:underline">Searches & Alerts</a>.</p>`;};
P.privacy=()=>{const u=user(), c=u.consent||{}, dump=db.dump();
  return `<div class="pp-h"><div><h2 class="display d-md">Privacy & Data</h2><p>You control what Passport uses and how we contact you.</p></div><span class="pp-preview">Preview account: stored only in this browser tab</span></div>
   <div class="pp-two"><div class="pp-card"><h3>Consent</h3>
    <label class="pp-switch"><input type="checkbox" role="switch" data-consent="personalize" ${c.personalize?'checked':''}><span><strong>Personalization</strong><span>Use my saved homes and preferences to tailor recommendations and Concierge.</span></span></label>
    <label class="pp-switch"><input type="checkbox" role="switch" data-consent="email" ${c.email?'checked':''}><span><strong>Email</strong><span>Alerts, saved-home updates and market reports by email.</span></span></label>
    <label class="pp-switch"><input type="checkbox" role="switch" data-consent="sms" ${c.sms?'checked':''}><span><strong>Text messages</strong><span>${esc(SC.smsConsentText)}</span></span></label>
    <p class="form-note">Turning email or text off also turns that channel off on every alert. Consent changes are timestamped in production for compliance records.</p></div>
    <div class="pp-card"><h3>Profile</h3><form class="form" id="pr-form" style="margin-top:8px"><div class="row"><div class="field"><label for="pr-f">First name</label><input id="pr-f" name="first" required value="${esc(u.first)}" autocomplete="given-name"></div><div class="field"><label for="pr-l">Last name</label><input id="pr-l" name="last" value="${esc(u.last||'')}" autocomplete="family-name"></div></div>
     <div class="field"><label for="pr-e">Email</label><input id="pr-e" name="email" type="email" required value="${esc(u.email)}" autocomplete="email"></div><div class="field"><label for="pr-p">Mobile phone</label><input id="pr-p" name="phone" type="tel" value="${esc(u.phone||'')}" autocomplete="tel"></div>
     <button class="btn btn-sm" type="submit">Save profile</button></form>
     <p style="margin-top:12px"><button class="pp-link" type="button" data-recover>Account recovery & password reset</button></p></div></div>
   <div class="pp-card" style="margin-top:16px"><h3>Your data</h3><p>Passport currently holds ${Object.keys(dump).length} data sets in this tab: ${Object.keys(dump).map(k=>`<code style="font-size:12px">${esc(k)}</code>`).join(', ')||'none'}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-sm" type="button" data-dl>Download my data (JSON)</button><button class="btn btn-sm btn-outline" type="button" data-signout>Sign out</button><button class="btn btn-sm btn-plum" type="button" data-wipe>Delete my data</button></div>
    <p class="form-note" style="margin-top:10px">Delete removes everything Passport stored in this tab, including saved homes and alerts. At launch, deletion requests also remove your Showcase IDX lead record and CRM data within the timeframe stated in our <a href="legal.html#privacy" style="text-decoration:underline">Privacy Policy</a>.</p></div>`;};

/* ================= Render ================= */
let tab='overview';
const heroSignedIn=()=>{const u=user(), c=counts();
  hero.innerHTML=`<div class="pp-hero-row"><div><p class="eyebrow">Search Charlotte Passport</p><h1 class="display d-xl">Welcome back, ${esc(u.first)}</h1>
    <p style="margin-top:12px"><span class="pp-preview">Preview account: stored only in this browser tab</span></p></div>
    <div class="pp-hero-tools"><div data-pp-bell id="pp-bell"></div><button class="btn btn-sm btn-outline" type="button" data-agent-connect="home">Talk to ${esc(SC.assignedAgent().name.split(' ')[0])}</button></div></div>
   <div class="pp-stats">${[['homes','Saved homes',c.homes],['searches','Searches & alerts',c.searches],['tours','Tour requests',c.tours],['neighborhoods','Neighborhoods',c.neighborhoods],['notifications','Unread',c.notifications]].map(([k,l,n])=>`<a class="pp-stat" href="#${k}" data-tab="${k}"><b>${n}</b><small>${l}</small></a>`).join('')}</div>`;
  SC.passport.bell($('#pp-bell'));};
const render=()=>{if(!signedIn()){authView(user()?'signin':'create'); return;}
  heroSignedIn(); const c=counts();
  root.innerHTML=`<div class="pp-app"><nav class="pp-nav" aria-label="Passport sections">${NAV.map(n=>n?`<a href="#${n[0]}" data-tab="${n[0]}" ${n[0]===tab?'aria-current="page"':''}><span>${n[1]}</span>${c[n[0]]?`<span class="n">${c[n[0]]}</span>`:''}</a>`:'<hr>').join('')}</nav>
   <div class="pp-main"><section class="pp-panel" id="panel-${tab}" aria-label="${esc(NAV.find(n=>n&&n[0]===tab)[1])}" tabindex="-1">${P[tab]()}</section></div></div>`;
  after(tab); SC.reveal&&SC.reveal();
  const cur=$('.pp-nav [aria-current]',root); if(cur&&innerWidth<=900) cur.scrollIntoView({block:'nearest',inline:'center'});};
const after=t=>{
  if(t==='searches'){const hl=null; SC.alerts.renderManager($('#al-mgr'),{highlight:hl}); SC.alerts.renderSubscribe($('#al-sub'),{source:'passport',onCreate:()=>SC.alerts.renderManager($('#al-mgr'))});
    $('#ss-form').addEventListener('submit',e=>{e.preventDefault(); const f=e.target; if(!f.checkValidity()){f.reportValidity(); return;} const fl={}; if(f.hood.value) fl.hood=f.hood.value; if(f.max.value) fl.max=+f.max.value; if(f.beds.value) fl.beds=+f.beds.value;
      const qs=new URLSearchParams(Object.assign({},fl.hood?{q:fl.hood}:{},fl.max?{max:fl.max}:{},fl.beds?{beds:fl.beds}:{})).toString();
      db.update('sc_searches',[],a=>[{id:SC.uid('ss'),name:f.name.value.trim(),qs,filters:fl,created:new Date().toISOString()},...a]); track('save_search',{source:'passport'}); SC.toast('Search saved'); render();});}
  if(t==='overview'){$$('.pp-yt').forEach(ytPoster);}
  if(t==='advisor'){const f=$('#adv-form'); SC.leadForm(f,d=>{db.update('sc_messages',[],a=>[...a,{id:SC.uid('msg'),kind:'message',data:d,to:SC.assignedAgent().name,ts:new Date().toISOString(),status:'Recorded in preview: not sent',from:'me'}]); track('advisor_message',{topic:d.topic}); setTimeout(render,1400);});
    const th=$('.pp-thread'); th&&(th.scrollTop=th.scrollHeight);}
  if(t==='lifestyle'){const f=$('#lf-form'); if(!f) return; f.addEventListener('submit',async e=>{e.preventDefault(); const out=$('#lf-out'); const [k,id]=f.a.value.split(':'); let pt,label;
      if(k==='h'){const l=SC.listing(id); pt=[l.lat,l.lng]; label=l.address;} else {const m=SC.lmk(id); pt=[m.lat,m.lng]; label=m.name;}
      out.innerHTML='<div class="skeleton" style="height:120px;margin-top:12px"></div>';
      const r=(await SC.poi.near(pt[0],pt[1],+f.r.value,[f.c.value])).slice(0,12); const F=arr('sc_lifestyle');
      out.innerHTML=r.length?`<div class="pp-places">${r.map((p,i)=>{const on=F.some(x=>x.name===p.name&&Math.abs(x.lat-p.lat)<1e-4); return `<div class="pp-place"><span><strong>${esc(p.name)}</strong><small>${esc(p.sub||SC.poi.label(p.cat))} · ${p.mi} mi straight-line from ${esc(label)}</small></span><button class="pp-star" type="button" aria-pressed="${on}" data-star='${esc(JSON.stringify({name:p.name,cat:p.cat,sub:p.sub,lat:p.lat,lng:p.lng,near:label}))}'>${on?'Starred':'Star'}</button></div>`;}).join('')}</div>`:'<p class="form-note" style="margin-top:12px">No places in that category within range. Try a wider radius.</p>';
      track('lifestyle_search',{cat:f.c.value});});}
  if(t==='budget'){const f=$('#bd-form'); f.addEventListener('submit',e=>{e.preventDefault(); if(!f.checkValidity()){f.reportValidity(); return;} const g=n=>parseFloat(f[n].value)||0;
      const monthly=g('monthly'),down=g('down'),rate=g('rate'),tax=g('tax'),ins=g('ins'),hoa=g('hoa'); const r=rate/1200,n=360; const k=r===0?1/n:r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
      const pmi=down<20&&costA?costA.pmi.value/1200:0; const per=(1-down/100)*(k+pmi)+tax/1200; const maxPrice=Math.max(0,Math.round((monthly-ins/12-hoa)/per/1000)*1000);
      const B=Object.assign({},db.get('sc_budget',{})||{},{monthly,down,rate,tax,ins,hoa,maxPrice,updated:new Date().toISOString()}); db.set('sc_budget',B); track('budget_estimate',{max_price:maxPrice}); render();});
    const sf=$('#sc-form'); sf&&sf.addEventListener('submit',e=>{e.preventDefault(); const B=db.get('sc_budget',{}); const l=SC.listing(sf.id.value); const a=costA;
      const tc=SC.trueCost(l,{downPct:B.down,rate:B.rate,years:30,taxRate:B.tax,insYr:B.ins,pmiRate:a?a.pmi.value:0.8,maintPct:a?a.maintenance.value:1,utilMo:0,commuteMo:0,closingPct:a?a.closing.value:3});
      db.set('sc_budget',Object.assign({},B,{scenarios:[{listingId:l.id,downPct:B.down,rate:B.rate,total:Math.round(tc.total),created:new Date().toISOString(),method:'SC.trueCost estimate incl. 1% maintenance; utilities excluded'},...(B.scenarios||[])]})); track('true_cost_save',{listing_id:l.id}); SC.toast('Scenario saved'); render();});}
  if(t==='concierge'){const f=$('#pf-form'); f&&f.addEventListener('submit',e=>{e.preventDefault(); SC.setPrefs({budgetMax:+f.budgetMax.value||null,beds:+f.beds.value||null,baths:+f.baths.value||null,types:f.type.value?[f.type.value]:[],areas:f.area.value?[f.area.value]:[]}); SC.toast('Preferences updated'); render();});}
  if(t==='privacy'){const f=$('#pr-form'); f.addEventListener('submit',e=>{e.preventDefault(); if(!f.checkValidity()){f.reportValidity(); return;} db.set('sc_user',Object.assign({},user(),{first:f.first.value.trim(),last:f.last.value.trim(),email:f.email.value.trim(),phone:f.phone.value.trim()})); SC.toast('Profile saved'); render();});}
};
const ytPoster=el=>{el.innerHTML=`<button type="button" class="pp-ytb" style="position:relative;display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;overflow:hidden;background:#000 url(assets/img/cta-dusk.webp) center/cover;color:#fff;padding:0"><span style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.6),rgba(0,0,0,.1))"></span><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center"><svg viewBox="0 0 24 24" width="22" height="22" fill="#1E140D" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span><span style="position:absolute;left:12px;bottom:10px;right:12px;text-align:left;font-size:12.5px;font-weight:600">${esc(el.dataset.title)}<br><small style="font-weight:400;opacity:.85">Plays from YouTube (privacy-enhanced mode) when you click</small></span></button>`;
  $('button',el).addEventListener('click',()=>{el.innerHTML=`<iframe style="width:100%;aspect-ratio:16/9;border:0;border-radius:14px" src="https://www.youtube-nocookie.com/embed/${el.dataset.yt}?autoplay=1&rel=0&cc_load_policy=1" title="${esc(el.dataset.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; track('video_play',{video:el.dataset.yt});});};

/* ================= Events ================= */
const go=t=>{if(!P[t]) t='overview'; tab=t; history.replaceState(null,'','#'+t); render(); track('passport_tab_view',{tab:t}); const m=$('.pp-main'); if(m&&m.getBoundingClientRect().top<0) m.scrollIntoView({block:'start'}); $('.pp-panel')&&$('.pp-panel').focus({preventScroll:true});};
hero.addEventListener('click',e=>{const t=e.target.closest('[data-tab]'); if(t){e.preventDefault(); go(t.dataset.tab);}});
root.addEventListener('click',e=>{const ab=e.target.closest('[data-auth]'); if(ab&&authPaint){authPaint(ab.dataset.auth); return;}
  const t=e.target.closest('[data-tab]'); if(t){e.preventDefault(); go(t.dataset.tab); return;}
  if(e.target.closest('[data-sample]')) loadSample();
  if(e.target.closest('[data-dismiss-welcome]')){db.set('sc_user',Object.assign({},user(),{welcome:false})); render();}
  const hb=e.target.closest('[data-hood]'); if(hb){const s=hb.dataset.hood, F=hoodsFav(), on=!F.includes(s); db.set('sc_hoods',on?[...F,s]:F.filter(x=>x!==s)); track(on?'hood_follow':'hood_unfollow',{hood:s}); render();}
  const ss=e.target.closest('[data-ss]'); if(ss){const id=ss.dataset.ss, s=arr('sc_searches').find(x=>x.id===id);
    if(e.target.closest('[data-ss-del]')){db.set('sc_searches',arr('sc_searches').filter(x=>x.id!==id)); SC.toast('Search deleted'); render();}
    if(e.target.closest('[data-ss-alert]')){const fl=s.filters||{}; SC.alerts.add({type:'saved_search',criteria:Object.assign({},fl.hood?{hood:fl.hood}:{},fl.max?{max:String(fl.max)}:{},fl.beds?{beds:String(fl.beds)}:{}),frequency:'daily',channels:{inapp:true,email:!!(user().consent||{}).email,sms:false},label:'Saved search: '+s.name}); SC.toast('Alert created for this search'); render();}}
  if(e.target.closest('[data-save-cmp]')){db.update('sc_comparisons',[],a=>[{id:SC.uid('cmp'),name:'Comparison '+(a.length+1),ids:SC.compare(),created:new Date().toISOString()},...a]); track('comparison_save',{}); SC.toast('Comparison saved'); render();}
  const dc=e.target.closest('[data-del-cmp]'); if(dc){db.update('sc_comparisons',[],a=>a.filter((_,i)=>i!==+dc.dataset.delCmp)); render();}
  const st=e.target.closest('[data-star]'); if(st){const p=JSON.parse(st.dataset.star); const F=arr('sc_lifestyle'); const i=F.findIndex(x=>x.name===p.name&&Math.abs(x.lat-p.lat)<1e-4);
    if(i>=0){F.splice(i,1); st.setAttribute('aria-pressed','false'); st.textContent='Star';} else {F.push(Object.assign(p,{saved:new Date().toISOString()})); st.setAttribute('aria-pressed','true'); st.textContent='Starred'; track('lifestyle_favorite',{cat:p.cat});}
    db.set('sc_lifestyle',F);}
  const us=e.target.closest('[data-unstar]'); if(us){db.update('sc_lifestyle',[],a=>a.filter((_,i)=>i!==+us.dataset.unstar)); render();}
  const ds=e.target.closest('[data-del-sc]'); if(ds){const B=db.get('sc_budget',{}); B.scenarios=(B.scenarios||[]).filter((_,i)=>i!==+ds.dataset.delSc); db.set('sc_budget',B); render();}
  if(e.target.closest('[data-enable-pers]')){const u=user(); db.set('sc_user',Object.assign({},u,{consent:Object.assign({},u.consent,{personalize:true})})); track('consent_change',{personalize:true}); render();}
  if(e.target.closest('[data-n-all]')){db.update('sc_notifs',[],a=>a.map(n=>Object.assign(n,{read:true}))); render();}
  if(e.target.closest('[data-n-clear]')){if(confirm('Clear all notifications?')){db.set('sc_notifs',[]); render();}}
  const nr=e.target.closest('[data-n-read]'); if(nr){db.update('sc_notifs',[],a=>a.map(n=>n.id===nr.dataset.nRead?Object.assign(n,{read:true}):n)); render();}
  const no=e.target.closest('[data-n-open]'); if(no){db.update('sc_notifs',[],a=>a.map(n=>n.id===no.dataset.nOpen?Object.assign(n,{read:true}):n));}
  if(e.target.closest('[data-dl]')){const blob=new Blob([JSON.stringify({exported:new Date().toISOString(),note:'Search Charlotte Passport preview data from this browser tab',data:db.dump()},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='searchcharlotte-passport-data.json'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500); track('data_download',{});}
  if(e.target.closest('[data-signout]')){db.set('sc_user',Object.assign({},user(),{signedIn:false})); track('logout',{}); tab='overview'; render(); scrollTo({top:0});}
  if(e.target.closest('[data-wipe]')){if(confirm('Delete all Passport data in this tab, your account, saved homes, searches, alerts, tours and notes? This cannot be undone.')){db.wipe(); $$('[data-saved-count]').forEach(x=>x.textContent='0'); track('data_delete',{}); tab='overview'; render(); SC.toast('Your data was deleted'); scrollTo({top:0});}}
});
root.addEventListener('change',e=>{const c=e.target.closest('[data-consent]'); if(!c) return; const k=c.dataset.consent, u=user();
  if(k==='sms'&&c.checked&&!u.phone){c.checked=false; SC.toast('Add a mobile number in Profile first'); $('#pr-p')&&$('#pr-p').focus(); return;}
  db.set('sc_user',Object.assign({},u,{consent:Object.assign({},u.consent,{[k]:c.checked}),consentUpdated:new Date().toISOString()}));
  if(!c.checked&&(k==='email'||k==='sms')) db.update('sc_alerts',[],a=>a.map(x=>Object.assign({},x,{channels:Object.assign({},x.channels,{[k]:false})})));
  track('consent_change',{[k]:c.checked}); SC.toast((c.checked?'Turned on: ':'Turned off: ')+({personalize:'personalization',email:'email',sms:'text messages'})[k]);});
document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_notifs'&&signedIn()){const c=counts(); $$('.pp-stat[data-tab=notifications] b').forEach(b=>b.textContent=c.notifications);}});
addEventListener('hashchange',()=>{const t=location.hash.slice(1); if(P[t]&&t!==tab){tab=t; render();}});
const h=location.hash.slice(1); if(P[h]) tab=h;
render();
})();

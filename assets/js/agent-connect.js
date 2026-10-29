/* Search Charlotte, Instant Agent Connection + Passport notification bell (global include).
   Preview: requests are recorded only in this browser tab (SC.db 'sc_messages'); nothing is sent.
   Production: POST to the lead endpoint → Showcase IDX lead + Lead Routing Settings → assigned agent email/CRM. */
(function(){'use strict';
const SC=window.SC; if(!SC||SC.agentConnect) return; const {$,$$,esc,track}=SC;

/* ---------- Team (from SearchCharlotte.com team roster; photos supplied by client) ---------- */
SC.OFFICE={name:'SearchCharlotte, Berkshire Hathaway HomeServices Carolinas Realty',addr:'6801 Morrison Blvd, Suite 101, Charlotte, NC 28211',
  phone:'704-458-1843',tel:'+17044581843',lat:35.15199,lng:-80.82601,
  geoSource:{name:'U.S. Census Bureau Geocoder (address-range match)',url:'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=6801+Morrison+Blvd,+Charlotte,+NC+28211&benchmark=Public_AR_Current&format=json',retrieved:'2026-10-28'}};
SC.TEAM=[
  {id:'39989',slug:'john-siddons',name:'John Siddons',title:'Lead Broker / REALTOR®'},
  {id:'299504',slug:'dori-schwaiger',name:'Dori Schwaiger',title:'Broker / REALTOR®'},
  {id:'294177',slug:'lauren-schwaiger',name:'Lauren Schwaiger',title:'Search Charlotte team'},
  {id:'331312',slug:'stephanie-horai',name:'Stephanie Horai',title:'Search Charlotte team'}];
SC.agentPhoto=a=>`assets/img/team/${a.id}.webp`;
SC.assignedAgent=()=>SC.TEAM[0]; /* production: lead.assigned_agent from Showcase IDX */
SC.RESPONSE_GOAL='We reply during business hours, typically same day. This is a goal, not a guarantee, for anything urgent, call or text.';
/* Proposed routing, shown to users; configured at launch in Showcase IDX Lead Routing Settings + the lead endpoint. */
SC.ROUTING=[
  ['Buying, showings & property questions','Your assigned agent (John Siddons by default)'],
  ['Selling & home valuation','John Siddons, Lead Broker'],
  ['Callbacks & consultations','John Siddons, who may introduce a team member'],
  ['Messages from Passport','Your assigned agent']];

/* ---------- Shared lead-form helper for JS-rendered forms (mirrors site.js data-lead behavior) ---------- */
SC.leadForm=(f,onOk)=>{f.addEventListener('submit',e=>{e.preventDefault(); e.stopImmediatePropagation();
  if(!f.checkValidity()){f.reportValidity(); return;}
  if(f.querySelector('[name=website]')?.value) return;
  const data={}; new FormData(f).forEach((v,k)=>{if(k!=='website') data[k]=v;});
  track('form_submit',{form_type:f.dataset.lead,page_path:location.pathname,listing_id:f.dataset.listing||data.listing||''});
  const keep=onOk?onOk(data,f):null;
  if(keep!=='keep'){f.classList.add('sent'); const ok=$('.form-ok',f); if(ok){ok.setAttribute('tabindex','-1'); ok.focus();}}
});};
SC.honeypot='<input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">';
SC.uid=p=>(p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
SC.smsConsentText='By checking this box, I agree to receive text messages from SearchCharlotte at the number provided about my home search, showings and alerts. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help. Consent is not a condition of any purchase or service.';

const I={
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  sms:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="M8 21l3-4M8 10h8M8 13h5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg>'};
SC.icons=Object.assign(SC.icons||{},I);

const ACTIONS=[
  {k:'callback',t:'Request a callback',d:'Pick a time window that works for you'},
  {k:'consult',t:'Schedule a consultation',d:'Request a date and time to talk strategy'},
  {k:'question',t:'Ask a property question',d:'About a specific home or area'},
  {k:'showing',t:'Request a showing',d:'Tell us which home and when'},
  {k:'message',t:'Send a message',d:'Anything else on your mind'},
  {k:'agent',t:'Contact my assigned agent',d:'Call, text or message directly'}];

let panel, launcher, ctx={};
const u=()=>SC.user()||{};
const listingOpts=sel=>{const ids=[...new Set([ctx.listingId,...SC.saved(),...SC.tourList()].filter(Boolean))];
  return `<option value="">${ids.length?'Choose a home (optional)':'No saved homes yet. Add details below'}</option>`+ids.map(id=>{const l=SC.listing(id); return l?`<option value="${l.id}" ${l.id===sel?'selected':''}>${esc(l.address)}, ${esc(l.city)} (sample)</option>`:'';}).join('');};
const contactFields=pre=>{const x=u(); return `<div class="row"><div class="field"><label for="${pre}-n">Name</label><input id="${pre}-n" name="name" required autocomplete="name" value="${esc([x.first,x.last].filter(Boolean).join(' '))}"></div>
  <div class="field"><label for="${pre}-p">Phone</label><input id="${pre}-p" name="phone" type="tel" autocomplete="tel" value="${esc(x.phone||'')}"></div></div>
  <div class="field"><label for="${pre}-e">Email</label><input id="${pre}-e" name="email" type="email" required autocomplete="email" value="${esc(x.email||'')}"></div>`;};
const tomorrow=()=>{const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10);};
const formFor=k=>{const id='ac-'+k; const l=ctx.listingId?SC.listing(ctx.listingId):null;
  const lst=`<div class="field"><label for="${id}-l">Home</label><select id="${id}-l" name="listing">${listingOpts(ctx.listingId)}</select></div>`;
  const body={
    callback:`<div class="field"><label for="${id}-w">Best time window</label><select id="${id}-w" name="window" required><option value="">Choose a window</option><option>Morning (9–12)</option><option>Midday (12–2)</option><option>Afternoon (2–5)</option><option>Early evening (5–7)</option></select></div>
      <div class="field"><label for="${id}-d">Day</label><input id="${id}-d" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="${tomorrow()}" required></div>
      <div class="field"><label for="${id}-t">Topic</label><select id="${id}-t" name="topic"><option>Buying</option><option>Selling</option><option>Relocating</option><option>Investing</option><option>Something else</option></select></div>`,
    consult:`<div class="row"><div class="field"><label for="${id}-d">Preferred date</label><input id="${id}-d" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="${tomorrow()}" required></div>
      <div class="field"><label for="${id}-tm">Preferred time</label><input id="${id}-tm" name="time" type="time" value="10:00" required></div></div>
      <div class="field"><label for="${id}-f">Format</label><select id="${id}-f" name="format"><option>Phone call</option><option>Video call</option><option>In person at the SouthPark office</option></select></div>
      <div class="field"><label for="${id}-t">What would you like to cover?</label><select id="${id}-t" name="topic"><option>Buying strategy</option><option>Selling & pricing</option><option>Relocating to Charlotte</option><option>Buying and selling at the same time</option></select></div>`,
    question:lst+`<div class="field"><label for="${id}-q">Your question</label><textarea id="${id}-q" name="message" required placeholder="e.g. Has the roof been replaced? Are there HOA rental rules?"></textarea></div>`,
    showing:lst+`<div class="row"><div class="field"><label for="${id}-d">Preferred date</label><input id="${id}-d" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="${tomorrow()}" required></div>
      <div class="field"><label for="${id}-w">Time window</label><select id="${id}-w" name="window" required><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Flexible</option></select></div></div>
      <p class="form-note">A request is not a confirmed appointment. An agent confirms with the listing side, then lets you know.</p>`,
    message:`<div class="field"><label for="${id}-m">Message</label><textarea id="${id}-m" name="message" required></textarea></div>`
  }[k];
  return `<form class="form ac-form" data-lead="agent_${k}" ${l?`data-listing="${l.id}"`:''} novalidate>
    ${l&&k!=='question'&&k!=='showing'?`<p class="ac-ctx">About: ${esc(l.address)} (sample listing)</p>`:''}
    ${contactFields(id)}${body}${SC.honeypot}
    <button class="btn btn-block" type="submit">Send request</button>
    <p class="form-note">${esc(SC.RESPONSE_GOAL)}</p>
    <div class="form-ok">Preview: your request was recorded in this browser tab only and was not sent. At launch it goes straight to ${esc(SC.assignedAgent().name)} through Showcase IDX lead routing.</div></form>`;};
const agentCard=()=>{const a=SC.assignedAgent(); return `<div class="ac-agent"><img src="${SC.agentPhoto(a)}" alt="${esc(a.name)}" width="56" height="56">
  <div><strong>${esc(a.name)}</strong><small>${esc(a.title)} · Your assigned agent</small><small class="ac-resp">Typical response: business hours, usually same day</small></div></div>
  <div class="ac-direct"><a class="btn btn-sm" href="tel:${SC.OFFICE.tel}">${I.phone}Call ${SC.OFFICE.phone}</a><a class="btn btn-sm btn-outline" href="sms:${SC.OFFICE.tel}">${I.sms}Text</a></div>`;};
const home=()=>`${agentCard()}
  <div class="ac-list" role="list">${ACTIONS.map(a=>`<button type="button" role="listitem" class="ac-act" data-ac="${a.k}"><span><strong>${a.t}</strong><small>${a.d}</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`).join('')}</div>
  <details class="ac-route"><summary>How requests are routed</summary><ul>${SC.ROUTING.map(r=>`<li><span>${esc(r[0])}</span><span>${esc(r[1])}</span></li>`).join('')}</ul>
  <p class="form-note">Proposed routing for SearchCharlotte to confirm. Team: ${SC.TEAM.map(t=>esc(t.name)).join(', ')}.</p></details>`;
const agentView=()=>{const a=SC.assignedAgent(); return `${agentCard()}<p class="ac-p">${esc(a.name)} is your assigned agent for this preview. ${esc(SC.RESPONSE_GOAL)}</p>
  <div class="ac-team">${SC.TEAM.map(t=>`<div><img src="${SC.agentPhoto(t)}" alt="" width="40" height="40" loading="lazy"><span><strong>${esc(t.name)}</strong><small>${esc(t.title)}</small></span></div>`).join('')}</div>
  <button class="btn btn-block btn-outline" type="button" data-ac="message">Send ${esc(a.name.split(' ')[0])} a message</button>
  <p class="form-note" style="margin-top:10px">Office: ${esc(SC.OFFICE.addr)}</p>`;};
const show=k=>{const b=$('.ac-body',panel), t=$('.ac-title',panel), bk=$('.ac-back',panel);
  if(!k||k==='home'){b.innerHTML=home(); t.textContent='Talk to Search Charlotte'; bk.hidden=true;}
  else if(k==='agent'){b.innerHTML=agentView(); t.textContent='Your agent'; bk.hidden=false;}
  else {const a=ACTIONS.find(x=>x.k===k); b.innerHTML=formFor(k); t.textContent=a.t; bk.hidden=false;
    const f=$('form',b); SC.leadForm(f,d=>{const rec={id:SC.uid('msg'),kind:k,data:d,listingId:d.listing||ctx.listingId||'',to:SC.assignedAgent().name,ts:new Date().toISOString(),status:'Recorded in preview: not sent',from:'me'};
      SC.db.update('sc_messages',[],a=>[...a,rec].slice(-200));
      SC.notify(a.t+' recorded (preview)', 'Not sent in preview. At launch this routes to '+SC.assignedAgent().name+'.','passport.html#advisor');
      track('agent_connect_submit',{action:k,listing_id:rec.listingId});});}
  track('agent_connect_view',{view:k||'home'});
  const first=$('input,select,textarea,button.ac-act',b); first&&first.focus({preventScroll:true});};
const build=()=>{if(panel) return;
  panel=document.createElement('div'); panel.className='ac-panel'; panel.id='ac-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false'); panel.setAttribute('aria-labelledby','ac-title'); panel.hidden=true;
  panel.innerHTML=`<div class="ac-head"><button class="ac-back" type="button" aria-label="Back" hidden>${I.back}</button><h2 class="ac-title" id="ac-title">Talk to Search Charlotte</h2><button class="ac-x" type="button" aria-label="Close">${I.x}</button></div><div class="ac-body"></div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click',e=>{const a=e.target.closest('[data-ac]'); if(a){show(a.dataset.ac);} if(e.target.closest('.ac-x')) SC.agentConnect.close(); if(e.target.closest('.ac-back')) show('home');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden) SC.agentConnect.close();});};
SC.agentConnect={
  open(c={}){build(); ctx=c||{}; panel.hidden=false; requestAnimationFrame(()=>panel.classList.add('open')); launcher&&launcher.setAttribute('aria-expanded','true'); show(c.action||'home'); track('agent_connect_open',{action:c.action||'home',listing_id:c.listingId||'',source:c.source||''});},
  close(){if(!panel) return; panel.classList.remove('open'); panel.hidden=true; launcher&&(launcher.setAttribute('aria-expanded','false'),launcher.focus());},
  mountLauncher(){if(launcher||document.body.dataset.noLauncher!==undefined) return; const a=SC.assignedAgent();
    launcher=document.createElement('button'); launcher.type='button'; launcher.className='ac-launch'; launcher.setAttribute('aria-controls','ac-panel'); launcher.setAttribute('aria-expanded','false');
    launcher.innerHTML=`<img src="${SC.agentPhoto(a)}" alt="" width="34" height="34"><span>Talk to an agent</span>`;
    launcher.addEventListener('click',()=>panel&&!panel.hidden?SC.agentConnect.close():SC.agentConnect.open({source:'launcher'})); document.body.appendChild(launcher);}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-agent-connect]'); if(!b) return; e.preventDefault(); SC.agentConnect.open({action:b.dataset.agentConnect||'home',listingId:b.dataset.listing||'',source:'button'});});

/* ---------- Notification bell (SC.passport.bell(el), mount anywhere, e.g. header) ---------- */
SC.passport=SC.passport||{};
SC.passport.bell=el=>{if(!el) return; el.classList.add('pp-bell');
  el.innerHTML=`<button type="button" class="pp-bell-btn" aria-haspopup="true" aria-expanded="false">${I.bell}<span class="pp-bell-n" hidden></span><span class="sr-only">Notifications</span></button><div class="pp-bell-pop" hidden></div>`;
  const btn=$('.pp-bell-btn',el), pop=$('.pp-bell-pop',el), n=$('.pp-bell-n',el);
  const rel=ts=>{const m=Math.round((Date.now()-new Date(ts))/6e4); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';};
  const paint=()=>{const a=SC.db.get('sc_notifs',[]), un=a.filter(x=>!x.read).length; n.hidden=!un; n.textContent=un>9?'9+':un; btn.setAttribute('aria-label',`Notifications, ${un} unread`);
    pop.innerHTML=`<div class="pp-bell-h"><strong>Notifications</strong>${un?'<button type="button" data-read-all>Mark all read</button>':''}</div>`+
      (a.length?`<ul>${a.slice(0,8).map(x=>`<li class="${x.read?'':'unread'}"><a href="${esc(x.href||'passport.html#notifications')}" data-nid="${esc(x.id)}"><strong>${esc(x.title)}</strong>${x.body?`<span>${esc(x.body)}</span>`:''}<small>${rel(x.ts)}</small></a></li>`).join('')}</ul>`:'<p class="pp-bell-empty">No notifications yet. Save homes or create an alert and updates will appear here.</p>')+
      `<a class="pp-bell-all" href="passport.html#notifications">Open notification center</a>`;};
  btn.addEventListener('click',e=>{e.stopPropagation(); const o=pop.hidden; pop.hidden=!o; btn.setAttribute('aria-expanded',o); if(o){paint(); track('notif_bell_open',{});}});
  pop.addEventListener('click',e=>{if(e.target.closest('[data-read-all]')){SC.db.update('sc_notifs',[],a=>a.map(x=>Object.assign(x,{read:true})));}
    const l=e.target.closest('[data-nid]'); if(l) SC.db.update('sc_notifs',[],a=>a.map(x=>x.id===l.dataset.nid?Object.assign(x,{read:true}):x));});
  document.addEventListener('click',e=>{if(!el.contains(e.target)){pop.hidden=true; btn.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){pop.hidden=true; btn.focus();}});
  document.addEventListener('sc:change',e=>{if(['sc_notifs','*'].includes(e.detail.key)) paint();}); paint();};
document.querySelectorAll('[data-pp-bell]').forEach(SC.passport.bell);
SC.agentConnect.mountLauncher();
})();

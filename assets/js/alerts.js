/* Smart Property Alerts — shared module (Passport + alerts.html).
   Schema (agreed with Deal Radar) sc_alerts: [{id,type,label,criteria,channels:{email,sms,inapp},frequency,created,active,source,contact?}]
   Preview: nothing is emailed or texted. Production: Showcase IDX Search Subscriptions handle email for new/price-change
   listing alerts; SMS + in-app + extra types need the Passport backend (see FEATURE-EXPANSION.md). */
(function(){'use strict';
const SC=window.SC; if(!SC||SC.alerts) return; const {D,$,$$,esc,short,track}=SC;
const TYPES={new_match:'New matching homes',price_drop:'Price reductions',open_house:'Open houses',back_on_market:'Back on market',status_change:'Status changes (pending / under contract)',saved_search:'Saved-search updates',market_report:'New market reports',deal:'Deal Radar signals'};
const FREQ={instant:'Instant',daily:'Daily digest',weekly:'Weekly digest'};
const list=()=>SC.db.get('sc_alerts',[]);
const save=a=>SC.db.set('sc_alerts',a);
const hoodName=s=>(D.hoods.find(h=>h.slug===s)||{}).name||s;
const describe=a=>{const c=a.criteria||{}, p=[];
  if(c.listingId){const l=SC.listing(c.listingId); p.push(l?l.address:'Saved home');}
  const h=c.hood||c.q; if(h) p.push(hoodName(h));
  if(c.type) p.push(c.type); if(c.beds) p.push(c.beds+'+ beds'); if(c.baths) p.push(c.baths+'+ baths');
  if(c.min&&c.max) p.push(short(+c.min)+'–'+short(+c.max)); else if(c.max) p.push('up to '+short(+c.max)); else if(c.min) p.push('from '+short(+c.min));
  if(c.signals&&c.signals.length) p.push(c.signals.join(', '));
  return p.length?p.join(' · '):(a.type==='market_report'?'Charlotte market reports':'All Charlotte-area listings');};
/* Which sample listings this alert would currently surface (demo — live alerts evaluate the MLS feed via Showcase IDX). */
const matches=a=>{const c=a.criteria||{}; let L=D.listings;
  if(c.listingId) L=L.filter(l=>l.id===c.listingId);
  const h=c.hood||c.q; if(h&&D.hoods.some(x=>x.slug===h)) L=L.filter(l=>l.hood===h);
  if(c.min) L=L.filter(l=>l.price>=+c.min); if(c.max) L=L.filter(l=>l.price<=+c.max);
  if(c.beds) L=L.filter(l=>l.beds>=+c.beds); if(c.baths) L=L.filter(l=>l.baths>=+c.baths); if(c.type) L=L.filter(l=>l.type===c.type);
  const t=a.type, x=l=>SC.extras(l);
  if(t==='price_drop') L=L.filter(l=>x(l).priceCuts>0);
  else if(t==='open_house') L=L.filter(l=>x(l).openHouse);
  else if(t==='back_on_market') L=L.filter(l=>x(l).backOnMarket);
  else if(t==='status_change') L=L.filter(l=>l.status!=='Active');
  else if(t==='new_match'||t==='saved_search') L=L.filter(l=>l.dom<=21||c.listingId);
  else if(t==='deal'){const want=c.signals||[]; L=L.filter(l=>{const s=SC.dealSignals(l).map(z=>z.k); return want.length?s.some(k=>want.includes(k)):s.length;});}
  else if(t==='market_report') L=[];
  return L;};
const add=a=>{const rec=Object.assign({id:SC.uid('al'),type:'new_match',label:'',criteria:{},channels:{email:false,sms:false,inapp:true},frequency:'daily',created:new Date().toISOString(),active:true,source:'passport'},a);
  if(!rec.label) rec.label=TYPES[rec.type]+' — '+describe(rec);
  SC.db.update('sc_alerts',[],x=>[rec,...x]); track('alert_create',{alert_type:rec.type,frequency:rec.frequency,email:rec.channels.email,sms:rec.channels.sms,source:rec.source});
  SC.notify('Alert created: '+TYPES[rec.type],describe(rec)+' · '+FREQ[rec.frequency]+' (preview — no messages are sent)','alerts.html?id='+rec.id); return rec;};
const update=(id,patch)=>save(list().map(a=>a.id===id?Object.assign({},a,patch,patch.channels?{channels:Object.assign({},a.channels,patch.channels)}:{}):a));
const remove=id=>{save(list().filter(a=>a.id!==id)); track('alert_delete',{});};
const consent=()=>(SC.user()||{}).consent||{};

/* ---------- Manager UI ---------- */
const renderManager=(el,opt={})=>{const A=list(), c=consent(), u=SC.user();
  if(!A.length){el.innerHTML=`<div class="empty"><h3>No alerts yet</h3><p>Create an alert for new matching homes, price reductions, open houses and more.</p>${opt.createHref?`<a class="btn btn-sm" href="${opt.createHref}">Create an alert</a>`:''}</div>`; return;}
  el.innerHTML=`<div class="al-list">${A.map(a=>{const n=matches(a).length; const hl=opt.highlight===a.id;
    return `<article class="al-item ${a.active?'':'is-paused'} ${hl?'is-hl':''}" data-alert="${esc(a.id)}" id="alert-${esc(a.id)}">
    <div class="al-top"><div><span class="pp-pill">${esc(TYPES[a.type]||a.type)}</span>${a.active?'':'<span class="pp-pill muted">Paused</span>'}${a.source&&a.source!=='passport'?`<span class="pp-pill muted">From ${esc(a.source.replace('_',' '))}</span>`:''}
      <h3>${esc(describe(a))}</h3><p class="al-meta">${a.type==='market_report'?'Sent when a new market report is published':`${n} sample listing${n===1?'':'s'} currently fit (sample data)`} · Created ${new Date(a.created).toLocaleDateString()}</p></div>
      <div class="al-acts"><button type="button" class="btn btn-sm btn-outline" data-al-toggle>${a.active?'Pause':'Resume'}</button><button type="button" class="btn btn-sm btn-outline" data-al-del aria-label="Delete alert">Delete</button></div></div>
    <div class="al-ctrls"><label class="al-f"><span>Frequency</span><select data-al-freq>${Object.entries(FREQ).map(([k,v])=>`<option value="${k}" ${a.frequency===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <fieldset class="al-ch"><legend>Channels</legend>
      <label><input type="checkbox" data-al-ch="inapp" ${a.channels.inapp?'checked':''}> In-app</label>
      <label><input type="checkbox" data-al-ch="email" ${a.channels.email?'checked':''} ${c.email||a.contact&&a.contact.emailConsent?'':'disabled'}> Email</label>
      <label><input type="checkbox" data-al-ch="sms" ${a.channels.sms?'checked':''} ${(c.sms&&u&&u.phone)||a.contact&&a.contact.smsConsent?'':'disabled'}> Text (SMS)</label></fieldset></div>
    ${!(c.email&&c.sms)?`<p class="form-note">${!c.email?'Email':''}${!c.email&&!c.sms?' and ':''}${!c.sms?'text':''} delivery needs your separate opt-in — turn it on in <a href="passport.html#privacy">Passport privacy settings</a>.</p>`:''}
    </article>`;}).join('')}</div>
    <div class="al-foot"><button type="button" class="btn btn-sm btn-outline" data-al-unsub-all>Unsubscribe from all alerts</button><p class="form-note">Preview: alerts are stored only in this browser tab and no email or text is sent. Every live alert email and text will include one-click unsubscribe; texts honor STOP and HELP.</p></div>`;
  if(!el._bound){el._bound=1; el.addEventListener('click',e=>{const it=e.target.closest('[data-alert]'); const id=it&&it.dataset.alert;
      if(e.target.closest('[data-al-toggle]')){const a=list().find(x=>x.id===id); update(id,{active:!a.active}); track(a.active?'alert_pause':'alert_resume',{}); SC.toast(a.active?'Alert paused':'Alert resumed'); renderManager(el,opt);}
      if(e.target.closest('[data-al-del]')){if(confirm('Delete this alert?')){remove(id); SC.toast('Alert deleted'); renderManager(el,opt);}}
      if(e.target.closest('[data-al-unsub-all]')){if(confirm('Pause every alert and stop all alert messages?')){save(list().map(a=>Object.assign({},a,{active:false}))); track('alert_unsubscribe_all',{}); SC.toast('Unsubscribed from all alerts'); renderManager(el,opt);}}});
    el.addEventListener('change',e=>{const it=e.target.closest('[data-alert]'); if(!it) return; const id=it.dataset.alert;
      if(e.target.matches('[data-al-freq]')){update(id,{frequency:e.target.value}); track('alert_frequency_change',{frequency:e.target.value}); SC.toast('Frequency updated');}
      if(e.target.matches('[data-al-ch]')){update(id,{channels:{[e.target.dataset.alCh]:e.target.checked}}); SC.toast('Channels updated');}});}
};

/* ---------- Subscribe form ---------- */
const renderSubscribe=(el,opt={})=>{const u=SC.user(), c=consent(), pre=opt.preset||{}; const saved=SC.saved();
  el.innerHTML=`<form class="form al-form" data-lead="alert_subscribe" novalidate>
   <fieldset class="al-types"><legend>Alert me about</legend>${Object.entries(TYPES).filter(([k])=>k!=='deal').map(([k,v])=>`<label class="pp-check"><input type="checkbox" name="t_${k}" ${(pre.types||['new_match','price_drop']).includes(k)?'checked':''}><span>${v}</span></label>`).join('')}</fieldset>
   <div class="row"><div class="field"><label for="al-hood">Area</label><select id="al-hood" name="hood"><option value="">Anywhere in the Charlotte area</option>${D.hoods.map(h=>`<option value="${h.slug}" ${pre.hood===h.slug?'selected':''}>${esc(h.name)}</option>`).join('')}</select></div>
   <div class="field"><label for="al-home">Or one saved home</label><select id="al-home" name="listingId"><option value="">${saved.length?'Any home matching the criteria':'No saved homes yet'}</option>${saved.map(id=>{const l=SC.listing(id); return l?`<option value="${l.id}" ${pre.listingId===l.id?'selected':''}>${esc(l.address)} (sample)</option>`:'';}).join('')}</select></div></div>
   <div class="row"><div class="field"><label for="al-max">Max price</label><select id="al-max" name="max"><option value="">No max</option>${[300,400,500,600,750,1000,1500,2000].map(k=>`<option value="${k*1000}" ${+pre.max===k*1000?'selected':''}>${short(k*1000)}</option>`).join('')}</select></div>
   <div class="field"><label for="al-beds">Bedrooms</label><select id="al-beds" name="beds"><option value="">Any</option>${[1,2,3,4,5].map(b=>`<option value="${b}" ${+pre.beds===b?'selected':''}>${b}+</option>`).join('')}</select></div></div>
   <div class="field"><span class="lbl">Frequency</span><div class="seg" role="group" aria-label="Frequency">${Object.entries(FREQ).map(([k,v])=>`<button type="button" data-freq="${k}" aria-pressed="${k===(pre.frequency||'daily')}">${v}</button>`).join('')}</div><input type="hidden" name="frequency" value="${pre.frequency||'daily'}"></div>
   <fieldset class="al-chs"><legend>Where should alerts go?</legend>
     <label class="pp-check"><input type="checkbox" name="inapp" checked><span><strong>In-app</strong> — Passport notification center</span></label>
     <label class="pp-check"><input type="checkbox" name="email"><span><strong>Email</strong> — I agree to receive property alert emails from SearchCharlotte. Unsubscribe anytime.</span></label>
     ${!u?`<div class="field al-email"><label for="al-em">Email address</label><input id="al-em" name="addr" type="email" autocomplete="email"></div>`:''}
     <label class="pp-check"><input type="checkbox" name="sms"><span><strong>Text (SMS)</strong> — ${esc(SC.smsConsentText)}</span></label>
     <div class="field al-phone"><label for="al-ph">Mobile number for texts</label><input id="al-ph" name="phone" type="tel" autocomplete="tel" value="${esc(u&&u.phone||'')}"></div>
   </fieldset>${SC.honeypot}
   <button class="btn" type="submit">Create alerts</button>
   <p class="form-note">Each box is optional and unchecked by default. Preview: alerts are saved in this browser tab only; no emails or texts are sent.</p>
   <div class="form-ok" data-ok>Alerts created. Manage them anytime below.</div></form>`;
  const f=$('form',el);
  f.addEventListener('click',e=>{const b=e.target.closest('[data-freq]'); if(!b) return; $$('[data-freq]',f).forEach(x=>x.setAttribute('aria-pressed',x===b)); f.frequency.value=b.dataset.freq;});
  SC.leadForm(f,d=>{const types=Object.keys(TYPES).filter(k=>d['t_'+k]); const ok=$('[data-ok]',f);
    if(!types.length){ok.textContent='Choose at least one alert type.'; f.classList.add('sent'); return 'keep';}
    if(d.email&&!u&&!d.addr){f.addr.setCustomValidity('Enter an email for email alerts'); f.addr.reportValidity(); f.addr.setCustomValidity(''); return 'keep';}
    if(d.sms&&!d.phone){f.phone.setCustomValidity('Enter a mobile number for text alerts'); f.phone.reportValidity(); f.phone.setCustomValidity(''); return 'keep';}
    if(u&&(d.email||d.sms)){const nu=Object.assign({},u,{phone:d.phone||u.phone,consent:Object.assign({},u.consent,d.email?{email:true}:{},d.sms?{sms:true}:{})}); SC.db.set('sc_user',nu);}
    const criteria={}; ['hood','listingId','max','beds'].forEach(k=>{if(d[k]) criteria[k]=d[k];});
    const contact=!u?{email:d.addr||'',phone:d.phone||'',emailConsent:!!d.email,smsConsent:!!d.sms}:undefined;
    types.forEach(t=>add({type:t,criteria,frequency:d.frequency,channels:{inapp:!!d.inapp,email:!!d.email,sms:!!d.sms},source:opt.source||'passport',contact}));
    ok.textContent=`${types.length} alert${types.length>1?'s':''} created (preview). Manage them anytime below.`; f.reset(); $$('[data-freq]',f).forEach(x=>x.setAttribute('aria-pressed',x.dataset.freq==='daily')); f.frequency.value='daily';
    opt.onCreate&&opt.onCreate(); f.classList.add('sent'); return 'keep';});
};
SC.alerts={TYPES,FREQ,list,add,update,remove,describe,matches,renderManager,renderSubscribe};
})();

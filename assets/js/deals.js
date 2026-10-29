/* Deal Radar + Deal Alerts.
   SC.alertsUI.builder(el, {preset})  -> alert builder (writes SC.db 'sc_alerts' using the shared Passport schema)
   SC.alertsUI.manage(el, {source})   -> manage list: pause/resume (unsubscribe), delete, test in-app
   SC.alertsUI.matches(alert)         -> sample listings matching an alert's criteria */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC;
const SIG={new:'New Listing',reduced:'Price Reduced',back:'Back on Market',open:'Open House',incentive:'Builder Incentive',dom:'45+ days on market'};
const EVT={reduced:{type:'price_drop',verb:'reduces its price'},new:{type:'new_match',verb:'is newly listed'},back:{type:'back_on_market',verb:'comes back on the market'},open:{type:'open_house',verb:'schedules an open house'},incentive:{type:'deal',verb:'advertises a builder incentive'},any:{type:'deal',verb:'shows any deal signal'}};
const hoodName=s=>(D.hoods.find(h=>h.slug===s)||{}).name;
const cutOf=l=>{const x=SC.extras(l); return x.originalPrice-l.price;};
const matches=a=>{const c=a.criteria||{}; return D.listings.filter(l=>l.status!=='Under Contract'&&(!c.hood||l.hood===c.hood)&&(!c.max||l.price<=c.max)&&(!c.min||l.price>=c.min)&&(!c.beds||l.beds>=c.beds)&&(!c.type||l.type===c.type)&&(!c.listingId||l.id===c.listingId)
  &&(!(c.signals&&c.signals.length)||SC.dealSignals(l).some(s=>c.signals.includes(s.k))));};
const sentence=c=>{const k=(c.signals&&c.signals.length===1)?c.signals[0]:'any'; const t=c.type?({'Single Family':'single-family home','Townhouse':'townhouse','Condo':'condo','Land':'lot'})[c.type]:'home';
  return `Notify me when ${/^[aeiou]/i.test(c.hood?hoodName(c.hood):t)?'an':'a'} ${c.hood?esc(hoodName(c.hood))+' ':''}${t}${c.beds?` with ${c.beds}+ bedrooms`:''}${c.max?` under ${fmt(c.max)}`:''} ${(EVT[k]||EVT.any).verb}`;};

/* ---------- Feed ---------- */
function feed(){const list=$('#dr-list'); if(!list) return;
  const on=new Set(['reduced','back','new','open','incentive','dom']); let map=null, layer=null, view='list';
  $('#dr-sig-chips').innerHTML=Object.entries(SIG).map(([k,t])=>`<button type="button" class="chip" data-sig="${k}" aria-pressed="true">${t}</button>`).join('');
  $('#dr-area').insertAdjacentHTML('beforeend',D.hoods.map(h=>`<option value="${h.slug}">${esc(h.name)}</option>`).join(''));
  $$('#dr-max option').forEach(o=>{if(o.value) o.textContent='Up to '+short(+o.value);});
  const q=new URLSearchParams(location.search); if(q.get('area')) $('#dr-area').value=q.get('area');
  const draw=()=>{const area=$('#dr-area').value, max=+$('#dr-max').value||0, beds=+$('#dr-beds').value||0, type=$('#dr-type').value, sort=$('#dr-sort').value;
    let R=D.listings.map(l=>({l,s:SC.dealSignals(l).filter(s=>on.has(s.k))})).filter(o=>o.s.length&&(!area||o.l.hood===area)&&(!max||o.l.price<=max)&&(!beds||o.l.beds>=beds)&&(!type||o.l.type===type));
    const S={signals:(a,b)=>b.s.length-a.s.length||cutOf(b.l)-cutOf(a.l),cut:(a,b)=>cutOf(b.l)-cutOf(a.l),cutpct:(a,b)=>cutOf(b.l)/SC.extras(b.l).originalPrice-cutOf(a.l)/SC.extras(a.l).originalPrice,new:(a,b)=>a.l.dom-b.l.dom,dom:(a,b)=>b.l.dom-a.l.dom,price:(a,b)=>a.l.price-b.l.price};
    R.sort(S[sort]);
    $('#dr-count').textContent=`${R.length} sample home${R.length===1?'':'s'} with matching signals`;
    list.innerHTML=R.length?R.map(({l,s})=>`<div class="dr-item">${SC.card(l)}<ul class="dr-sl">${s.map(x=>`<li class="dr-s dr-${x.k}"><b>${esc(x.label)}</b>${x.detail?`<span>${esc(x.detail)}</span>`:''}</li>`).join('')}</ul></div>`).join('')
      :`<div class="empty"><h3>No homes match these filters</h3><p>Try more signals or a wider area, or set an alert below and we'll watch for you.</p><a class="btn btn-sm" href="#alerts">Create a deal alert</a></div>`;
    if(map){layer.clearLayers(); const pts=[]; R.forEach(({l,s})=>{pts.push([l.lat,l.lng]); window.L.marker([l.lat,l.lng],{icon:window.L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null}),title:l.address}).bindPopup(`<b>${esc(l.address)}</b><br>${fmt(l.price)}<br>${s.map(x=>esc(x.label)).join(' · ')}<br><a href="listing.html?id=${l.id}">View home</a>`).addTo(layer);}); if(pts.length) map.fitBounds(pts,{padding:[30,30],maxZoom:14});}
  };
  const initMap=()=>{if(map||!window.L) return; map=window.L.map('dr-map',{scrollWheelZoom:false}).setView([35.2,-80.84],10); window.scTiles().addTo(map); layer=window.L.layerGroup().addTo(map);};
  const wide=()=>matchMedia('(min-width:1100px)').matches;
  if(wide()){initMap();}
  $('#dr-sig-chips').addEventListener('click',e=>{const b=e.target.closest('[data-sig]'); if(!b) return; const k=b.dataset.sig; on.has(k)?on.delete(k):on.add(k); b.setAttribute('aria-pressed',on.has(k)); draw(); track('deal_radar_filter',{signal:k,on:on.has(k)});});
  $('#dr-filters').addEventListener('change',()=>{draw(); track('deal_radar_filter',{});});
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view; $$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b)); $('#dr-layout').dataset.view=view; if(view==='map'){initMap(); draw(); setTimeout(()=>map.invalidateSize(),50);}}));
  $('#dr-layout').dataset.view='list';
  draw(); if(map) setTimeout(()=>map.invalidateSize(),100);
  track('deal_radar_view',{});
}

/* ---------- Alert builder ---------- */
let bn=0;
function builder(el,opts={}){const p=opts.preset||{}; const u=SC.user()||{}; const id='ab'+(++bn);
  el.innerHTML=`<form class="dr-ab" novalidate>
   <p class="dr-sentence" aria-live="polite" data-sent></p>
   <div class="dr-ab-grid">
    <div class="field"><label for="${id}-sig">When a home…</label><select id="${id}-sig" data-f="sig">${Object.entries(EVT).map(([k,v])=>`<option value="${k}" ${p.signal===k?'selected':''}>${v.verb}</option>`).join('')}</select></div>
    <div class="field"><label for="${id}-area">Area</label><select id="${id}-area" data-f="hood"><option value="">Anywhere we cover</option>${D.hoods.map(h=>`<option value="${h.slug}" ${p.hood===h.slug?'selected':''}>${esc(h.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="${id}-max">Max price</label><input id="${id}-max" type="number" inputmode="numeric" step="25000" min="0" placeholder="Any" data-f="max" value="${p.max||''}"></div>
    <div class="field"><label for="${id}-type">Home type</label><select id="${id}-type" data-f="type"><option value="">Any home</option><option>Single Family</option><option>Townhouse</option><option>Condo</option><option>Land</option></select></div>
    <div class="field"><label for="${id}-beds">Bedrooms</label><select id="${id}-beds" data-f="beds"><option value="">Any</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></div>
    <div class="field"><label for="${id}-freq">How often</label><select id="${id}-freq" data-f="freq"><option value="instant">As it happens</option><option value="daily" selected>Daily digest</option><option value="weekly">Weekly digest</option></select></div>
   </div>
   <fieldset class="dr-ch"><legend>Send alerts by</legend>
    <label class="consent"><input type="checkbox" data-c="inapp" checked> In-app notifications on SearchCharlotte.com</label>
    <label class="consent"><input type="checkbox" data-c="email"> Email, I agree to receive deal alert emails from SearchCharlotte. Unsubscribe anytime from any email or from Manage alerts.</label>
    <div class="field" data-show="email" hidden><label for="${id}-em">Email</label><input id="${id}-em" type="email" autocomplete="email" value="${esc(u.email||'')}"></div>
    <label class="consent"><input type="checkbox" data-c="sms"> Text messages (SMS)</label>
    <div data-show="sms" hidden><div class="field"><label for="${id}-ph">Mobile number</label><input id="${id}-ph" type="tel" autocomplete="tel" value="${esc(u.phone||'')}"></div>
     <label class="consent form-note dr-tcpa"><input type="checkbox" data-c="smsConsent"> By checking this box, I agree to receive recurring automated deal alert text messages from SearchCharlotte, LLC at the number above. Consent is not a condition of any purchase. Msg frequency varies by alert settings. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our <a href="legal.html">privacy policy and terms</a>.</label></div>
   </fieldset>
   <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
   <p class="dr-err" role="alert" data-err></p>
   <div class="dr-ab-foot"><button class="btn" type="submit">Create alert</button><span class="form-note" data-preview></span></div>
   <p class="form-note">Preview: alerts are stored in this browser tab and in-app notifications are simulated against sample listings. At launch, alerts run on Showcase IDX saved-search data and email/SMS are sent by the alerts service with unsubscribe links.</p></form>`;
  const f=$('form',el); if(p.type) $(`[data-f=type]`,f).value=p.type;
  const crit=()=>{const g=k=>$(`[data-f=${k}]`,f).value; const sig=g('sig'); return {hood:g('hood')||undefined,max:+g('max')||undefined,type:g('type')||undefined,beds:+g('beds')||undefined,signals:sig==='any'?['reduced','back','new','open','incentive']:[sig]};};
  const upd=()=>{const c=crit(); $('[data-sent]',f).innerHTML=sentence(c)+'.'; const n=matches({criteria:c}).length; $('[data-preview]',f).textContent=`${n} sample home${n===1?'':'s'} match today`;
    $$('[data-show]',f).forEach(d=>d.hidden=!$(`[data-c=${d.dataset.show}]`,f).checked);};
  f.addEventListener('input',upd); f.addEventListener('change',upd); upd();
  f.addEventListener('submit',e=>{e.preventDefault(); const err=$('[data-err]',f); err.textContent=''; if(f.website.value) return;
    const ch=k=>$(`[data-c=${k}]`,f).checked; const em=$(`#${id}-em`).value.trim(), ph=$(`#${id}-ph`).value.trim();
    if(!ch('inapp')&&!ch('email')&&!ch('sms')){err.textContent='Choose at least one way to receive alerts.'; return;}
    if(ch('email')&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){err.textContent='Enter a valid email address for email alerts.'; $(`#${id}-em`).focus(); return;}
    if(ch('sms')&&ph.replace(/\D/g,'').length<10){err.textContent='Enter a 10-digit mobile number for text alerts.'; $(`#${id}-ph`).focus(); return;}
    if(ch('sms')&&!ch('smsConsent')){err.textContent='To get text alerts, check the SMS consent box (or uncheck Text messages).'; return;}
    const c=crit(); const sig=$(`[data-f=sig]`,f).value;
    const a={id:'al_'+Date.now(),type:(EVT[sig]||EVT.any).type,label:sentence(c).replace(/^Notify me when /,'').replace(/^./,m=>m.toUpperCase()),criteria:c,channels:{email:ch('email'),sms:ch('sms')&&ch('smsConsent'),inapp:ch('inapp')},frequency:$(`[data-f=freq]`,f).value,created:new Date().toISOString(),active:true,source:opts.source||'deal_radar'};
    SC.db.update('sc_alerts',[],x=>[a,...x]);
    if(a.channels.email||a.channels.sms){SC.db.update('sc_user',null,uu=>{const o=Object.assign({},uu||{}); if(a.channels.email) o.email=em; if(a.channels.sms) o.phone=ph; o.consent=Object.assign({},o.consent||{}); if(a.channels.email) o.consent.email=true; if(a.channels.sms) o.consent.sms=true; return o;});}
    if(a.channels.inapp) SC.notify('Deal alert created',sentence(c)+'.','deals.html#alerts');
    track('deal_alert_create',{type:a.type,email:a.channels.email,sms:a.channels.sms,inapp:a.channels.inapp,frequency:a.frequency});
    SC.toast('Alert created'); err.textContent=''; $$('[data-c=email],[data-c=sms],[data-c=smsConsent]',f).forEach(x=>x.checked=false); upd();});
}

/* ---------- Manage ---------- */
function manage(el,opts={}){const draw=()=>{const all=SC.db.get('sc_alerts',[]).filter(a=>!opts.source||a.source===opts.source);
  if(!all.length){el.innerHTML='<div class="dr-none">No alerts yet. Alerts you create appear here, where you can pause, resume or delete them anytime.</div>'; return;}
  el.innerHTML=`<ul class="dr-al">${all.map(a=>{const ch=Object.entries(a.channels||{}).filter(([,v])=>v).map(([k])=>({inapp:'In-app',email:'Email',sms:'SMS'})[k]).join(', ')||'No channel';
    return `<li class="${a.active?'':'off'}"><div class="dr-al-t"><b>${esc(a.label||a.type)}</b><small>${esc(ch)} · ${esc(a.frequency||'daily')} · ${a.active?'Active':'Paused'}</small></div>
    <div class="dr-al-a"><button type="button" class="btn btn-sm btn-outline" data-act="toggle" data-id="${a.id}" aria-pressed="${!a.active}">${a.active?'Pause':'Resume'}</button>${a.active&&a.channels&&a.channels.inapp&&a.criteria?`<button type="button" class="xr-link" data-act="test" data-id="${a.id}">Check now</button>`:''}<button type="button" class="xr-link" data-act="del" data-id="${a.id}">Delete</button></div></li>`;}).join('')}</ul>
   <p class="form-note">Pausing stops all channels for that alert (unsubscribe). Text STOP to any alert text to opt out of SMS. <a href="alerts.html" style="text-decoration:underline">Manage all alerts and notifications</a></p>`;};
  draw();
  el.addEventListener('click',e=>{const b=e.target.closest('[data-act]'); if(!b) return; const id=b.dataset.id;
    if(b.dataset.act==='toggle'){SC.db.update('sc_alerts',[],x=>x.map(a=>a.id===id?Object.assign({},a,{active:!a.active}):a)); track('deal_alert_toggle',{id});}
    if(b.dataset.act==='del'){SC.db.update('sc_alerts',[],x=>x.filter(a=>a.id!==id)); track('deal_alert_delete',{id}); SC.toast('Alert deleted');}
    if(b.dataset.act==='test'){const a=SC.db.get('sc_alerts',[]).find(x=>x.id===id); const m=matches(a).slice(0,3); m.forEach(l=>SC.notify(`Deal alert: ${l.address}`,`${SC.dealSignals(l).map(s=>s.label).join(' · ')} · ${fmt(l.price)} (sample listing)`,`listing.html?id=${l.id}`)); SC.toast(m.length?`${m.length} sample match${m.length>1?'es':''} sent to your in-app notifications`:'No sample homes match right now');}});
  document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_alerts'||e.detail.key==='*') draw();});}

SC.alertsUI={builder,manage,matches,sentence};
feed();
const b=$('#dr-builder'); if(b){const q=new URLSearchParams(location.search); builder(b,{preset:{hood:q.get('area')||'',signal:'reduced'}}); manage($('#dr-manage'));}
})();

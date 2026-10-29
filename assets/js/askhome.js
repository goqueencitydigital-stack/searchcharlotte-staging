/* Ask This Home, answers questions about one listing from its own fields, SC.extras (DEMO), OpenStreetMap places,
   drive-time estimates and the True Cost / payment math with visible assumptions. Never guesses: unknowns route to an agent.
   Usage: SC.askHome.mount(document.getElementById('ask-home'), listing)
   Production: same intents served by a server-side LLM constrained to the Showcase IDX listing record + POI service. */
(function(){'use strict';
const SC=window.SC, {D,$,$$,esc,fmt,short,track}=SC;
const ensureCSS=()=>{if(!$('link[href$="assets/css/ai.css"]')){const k=document.createElement('link'); k.rel='stylesheet'; k.href='assets/css/ai.css'; document.head.appendChild(k);}};
const LMK=[['southpark-mall',/southpark mall|south park mall|southpark|south park/],['clt',/airport|\bclt\b|charlotte douglas/],['university-research-park',/research park/],['unc-charlotte',/unc ?charlotte|uncc/],
  ['atrium-cmc',/atrium|carolinas medical|\bcmc\b/],['novant-presbyterian',/novant|presbyterian/],['concord-mills',/concord mills/],['fort-mill',/fort mill/],['lake-norman',/lake norman|davidson/],
  ['ballantyne',/ballantyne/],['south-end',/south ?end|atherton/],['uptown',/uptown|downtown|center city|trade (?:and|&) tryon/]];
const CATQ=[['grocery',/grocer|supermarket|food store|harris teeter|publix|trader joe|whole foods|aldi|lidl|food lion/],['cafes',/coffee|caf[eé]|bakery|starbucks/],['restaurants',/restaurant|dinner|eat|food|dining/],
  ['bars',/\bbars?\b|brewer|pub/],['parks',/\bparks?\b|playground|dog park/],['trails',/greenway|trail|walking path|bike path/],['golf',/golf/],['water',/marina|boat|kayak|lake access/],['fitness',/gym|fitness|yoga/],
  ['transit',/light rail|lynx|transit|bus|train/],['shopping',/shop|mall|store|target|retail/],['health',/hospital|doctor|urgent care|pharmacy|clinic/],['schools',/library/],['venues',/music|theat|museum|arts|venue/]];
let costA=null; SC.costAssumptions.then(a=>{costA=a;});

const DEMO='<span class="ah-demo">Demo value</span>';
const agentForm=(l,q)=>`<form class="form ah-form" data-lead="property_question" data-listing="${l.id}">
  <input type="hidden" name="listing_id" value="${l.id}"><input type="hidden" name="address" value="${esc(l.address)}">
  <div class="field"><label>Your question</label><textarea name="question" rows="2" required>${esc(q)}</textarea></div>
  <div class="row"><div class="field"><label>Name</label><input name="name" required autocomplete="name"></div><div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div></div>
  <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
  <button class="btn btn-sm" type="submit">Send to a Search Charlotte agent</button><p class="form-ok">Sent. An agent will reply by email, usually within one business day.</p>
  <p class="form-note">We'll only use your email to answer this question.</p></form>`;
const unknown=(l,q,what)=>`<p>${what}, want me to ask a Search Charlotte agent?</p>${agentForm(l,q)}`;

function payment(l,over={}){const a=costA||{}; const tx=(a.tax&&a.tax.byCity&&a.tax.byCity[l.city])||null;
  const A=Object.assign({downPct:20,rate:(a.rate&&a.rate.value)||7,years:30,taxRate:tx?tx.per100:null,insYr:(a.insurance&&a.insurance.value)||null,pmiRate:(a.pmi&&a.pmi.value)||0.8,maintPct:0,utilMo:0,commuteMo:0,closingPct:(a.closing&&a.closing.value)||3},over);
  const r=SC.trueCost(l,Object.assign({},A,{taxRate:A.taxRate||0,insYr:A.insYr||0}));
  const src=[a.rate&&`<a href="${a.rate.url}" target="_blank" rel="noopener">${esc(a.rate.source)}</a> (${a.rate.asOf})`,tx&&tx.sources&&`<a href="${tx.sources[0].url}" target="_blank" rel="noopener">${esc(tx.label)}</a>`,a.insurance&&`<a href="${a.insurance.url}" target="_blank" rel="noopener">${esc(a.insurance.source.split(', ')[0])}</a>`].filter(Boolean);
  return `<p>Estimated monthly payment: <b>${fmt(r.pi+r.tax+r.ins+r.pmi+r.hoa)}</b>/mo <span class="ah-est">estimate</span></p>
  <table class="ah-tbl"><tr><td>Principal &amp; interest</td><td>${fmt(r.pi)}</td></tr><tr><td>Property tax${A.taxRate?` (${A.taxRate.toFixed(4)} per $100, on list price)`:' (not set)'}</td><td>${fmt(r.tax)}</td></tr>
  <tr><td>Homeowners insurance${A.insYr?` (${fmt(A.insYr)}/yr NC average)`:''}</td><td>${fmt(r.ins)}</td></tr>${r.pmi?`<tr><td>PMI (${A.pmiRate}%/yr)</td><td>${fmt(r.pmi)}</td></tr>`:''}<tr><td>HOA</td><td>${fmt(r.hoa)}</td></tr></table>
  <form class="ah-assume" data-ah-assume><label>Down %<input name="downPct" type="number" min="0" max="100" step="1" value="${A.downPct}"></label><label>Rate %<input name="rate" type="number" min="0" max="20" step="0.01" value="${A.rate}"></label><label>Term<select name="years"><option ${A.years===30?'selected':''}>30</option><option ${A.years===15?'selected':''}>15</option></select></label><button class="btn btn-sm btn-outline" type="submit">Recalculate</button></form>
  <p class="ah-fine">Assumptions: ${A.downPct}% down (${fmt(r.down)}), ${A.rate}% ${A.years}-yr fixed${src.length?' sources: '+src.join('; '):''}. Taxes use list price, not assessed value. Not a lender quote; rates depend on credit and loan type. Cash to close ≈ ${fmt(r.cashToClose)} incl. ~${A.closingPct}% closing costs (estimate). See <a href="#true-cost">True Cost to Own</a> for maintenance, utilities and commute.</p>`;}

const dist=async(l,q)=>{const t=q.toLowerCase();
  for(const [id,re] of LMK) if(re.test(t)){const m=SC.lmk(id), d=SC.drive([l.lat,l.lng],[m.lat,m.lng]);
    return `<p><b>${esc(m.name)}</b> is about <b>${d.miles} road miles</b>: roughly <b>${d.minutes} minutes</b> by car <span class="ah-est">estimate</span>.</p><p class="ah-fine">Method: straight-line distance × 1.35 road factor at 30 mph (45 mph beyond 10 mi), plus 3 min. Traffic isn't included; the live site uses a traffic-aware routing API.</p>`;}
  const name=(t.match(/(?:how far (?:is|to)|distance to|how close is|close to|closest|near(?:est)?|drive to|minutes to)\s+(?:the\s+)?(.+?)\??$/)||[])[1];
  const cat=(CATQ.find(([c,re])=>re.test(t))||[])[0];
  let pois=[]; try{pois=await SC.poi.near(l.lat,l.lng,8,null);}catch(e){}
  const generic=/^(?:a |an |the )?(?:closest |nearest )?(?:grocery(?: store)?|coffee(?: shop)?|park|restaurant|gym|school|library|hospital|bar|trail|greenway|golf course|marina|store|mall)s?$/;
  if(name){const n=name.replace(/[^a-z0-9 &']/g,'').replace(/^(?:a|an|the) /,'').trim(); const hit=!generic.test(n)&&n.length>2&&pois.find(p=>p.name.toLowerCase().includes(n));
    if(hit){const d=SC.drive([l.lat,l.lng],[hit.lat,hit.lng]); return `<p><b>${esc(hit.name)}</b> (${esc(SC.poi.label(hit.cat))}) is ${hit.mi} mi away in a straight line, about ${d.minutes} min by car <span class="ah-est">estimate</span>.</p><p class="ah-fine">${esc(SC.poi.attribution)}</p>`;}
    if(!cat) return null;}
  if(cat){const list=pois.filter(p=>p.cat===cat&&p.mi<=5).slice(0,4); if(!list.length) return `<p>I don't see any ${esc(SC.poi.label(cat).toLowerCase())} within 5 miles in the OpenStreetMap data. That data can be incomplete, an agent can confirm.</p>`;
    return `<p>Closest ${esc(SC.poi.label(cat).toLowerCase())}:</p><ul class="ah-ul">${list.map(p=>`<li><b>${esc(p.name)}</b>: ${p.mi} mi${p.sub?` · ${esc(p.sub)}`:''}</li>`).join('')}</ul><p class="ah-fine">Straight-line distances. ${esc(SC.poi.attribution)}</p>`;}
  return null;};

const similar=(l,t)=>{const bigger=/yard|lot|land|acre|bigger|larger/.test(t);
  let pool=D.listings.filter(x=>x.id!==l.id&&x.status!=='Under Contract'&&x.type===l.type&&Math.abs(x.price-l.price)/l.price<=0.35);
  if(bigger) pool=pool.filter(x=>x.acres>l.acres); const same=pool.filter(x=>x.hood===l.hood);
  const list=[...same,...pool.filter(x=>x.hood!==l.hood).sort((a,b)=>SC.miles([l.lat,l.lng],[a.lat,a.lng])-SC.miles([l.lat,l.lng],[b.lat,b.lng]))].slice(0,4);
  const qs=new URLSearchParams({type:l.type,min:Math.round(l.price*0.75/25000)*25000,max:Math.round(l.price*1.25/25000)*25000}); if(l.beds) qs.set('beds',l.beds); if(bigger) qs.set('lot',l.acres); qs.set('q',l.hood);
  if(!list.length) return `<p>No sample listings are close enough${bigger?' with a bigger lot':''}. <a href="search.html?${qs}">Open a broader search</a>.</p>`;
  return `<p>${bigger?'Similar homes with a larger lot':'Similar sample homes'} (same type, within ~35% of the price${same.length?`, ${esc(l.hoodName)} first`:''}):</p><ul class="ah-sim">${list.map(x=>`<li><a href="listing.html?id=${x.id}"><img src="assets/img/${x.img}.webp" alt="" loading="lazy"><span><b>${fmt(x.price)}</b>${esc(SC.facts(x))}<br><small>${esc(x.address)} · ${esc(x.hoodName)}${bigger?` · ${x.acres} ac`:''}</small></span></a></li>`).join('')}</ul><p class="ah-fine">Sample data. <a href="search.html?${qs}">See more like this</a>.</p>`;};

async function answer(l,q){const t=q.toLowerCase(), x=SC.extras(l); const land=l.type==='Land';
  if(/\b(safe|crime|good schools?|school rating|best schools?|family[- ]friendly|demographic|who lives|diverse)\b/.test(t))
    return `<p>I don't rate areas by safety, schools or who lives there, fair housing rules keep me to facts about the home. For school assignment, use the school district's official address lookup; for crime data, the police department's public map. An agent can point you to both.</p>`;
  if(/payment|monthly|mortgage|afford|cost per month|how much (?:would|will) (?:i|it) (?:pay|cost)|down payment|cash to close|closing cost/.test(t)) return payment(l);
  if(/similar|like this|comparable|other homes|alternatives|bigger (?:yard|lot)|larger lot/.test(t)) return similar(l,t);
  if(/how far|distance|how close|closest|minutes to|drive to|commute|near(?:est|by)?|close to|walk to|around here|what's nearby/.test(t)||CATQ.some(([c,re])=>re.test(t))&&!/roof|hvac|price|payment/.test(t)){const r=await dist(l,q); if(r) return r;
    return unknown(l,q,'I couldn\'t match that place in the map data or my landmark list');}
  if(/roof/.test(t)) return x.roofYear?`<p>Roof: listing record shows <b>${x.roofYear}</b> (${2026-x.roofYear<=1?'about a year old or newer':'about '+(2026-x.roofYear)+' years old'}) ${DEMO}</p><p class="ah-fine">Confirm with the seller's disclosure and inspection.</p>`:unknown(l,q,'The listing doesn\'t say how old the roof is');
  if(/hvac|air condition|\bac\b|furnace|heat pump|heating/.test(t)) return x.hvacYear?`<p>HVAC: <b>${x.hvacYear}</b> per the listing ${DEMO}</p>`:unknown(l,q,'The listing doesn\'t say how old the HVAC system is');
  if(/fence|fenced/.test(t)) return land?unknown(l,q,'The listing doesn\'t say'):`<p>${x.fenced?'Yes, the listing features include a <b>fenced backyard</b>.':'The listing features don\'t mention a fence.'} ${DEMO}</p>`;
  if(/primary|master|main level|first floor bed/.test(t)) return `<p>${x.features.includes('Primary on main')?'Yes, the listing notes a <b>primary bedroom on the main level</b>.':'The listing features don\'t mention a main-level primary.'} ${DEMO}</p>`;
  if(/feature|amenit|what does it have|upgrades|finishes|kitchen|floor/.test(t)) return x.features.length?`<p>Listed features: ${x.features.map(esc).join(', ')}. ${DEMO}</p>`:unknown(l,q,'The listing doesn\'t list features');
  if(/style|architect/.test(t)) return `<p>Style: <b>${esc(x.style)}</b> ${DEMO}</p>`;
  if(/price (?:history|change|cut|drop|reduc)|reduced|original price|been on the market|days on market|how long|listed/.test(t)){
    return `<p>On the market <b>${l.dom} days</b> (listed ${x.listed}). ${x.priceCuts?`Price changed ${x.priceCuts} time${x.priceCuts>1?'s':''}: originally ${fmt(x.originalPrice)}, now ${fmt(l.price)} (${short(x.originalPrice-l.price)} less).`:'No price changes on record.'}${x.backOnMarket?' It went pending and came back on the market.':''} ${DEMO}</p><ul class="ah-ul">${x.history.map(h=>`<li>${h.date} · ${esc(h.event)} · ${fmt(h.price)}</li>`).join('')}</ul>`;}
  if(/open house/.test(t)) return x.openHouse?`<p>Open house: <b>${esc(x.openHouse)}</b> per the listing (sample). Times can change. Check before you go.</p>`:`<p>No open house is listed. You can request a private showing below.</p>`;
  if(/incentive|builder|concession/.test(t)) return x.incentive?`<p>${esc(x.incentive)}</p>`:unknown(l,q,'The listing doesn\'t mention incentives');
  if(/hoa|association|dues/.test(t)) return `<p>${l.hoa?`HOA dues: <b>$${l.hoa}/month</b>.`:'No HOA dues are listed.'} What the HOA covers isn't in the listing, an agent can get the documents.</p>`;
  if(/\btax(es)?\b/.test(t)) return payment(l);
  if(/bed(room)?s?/.test(t)) return land?`<p>This is a land listing, no bedrooms.</p>`:`<p><b>${l.beds} bedrooms</b>.</p>`;
  if(/bath/.test(t)) return land?`<p>This is a land listing.</p>`:`<p><b>${l.baths} bathrooms</b>.</p>`;
  if(/square f|sq ?ft|how big|size|living area/.test(t)&&!/lot|yard/.test(t)) return land?`<p>${l.acres} acres of land.</p>`:`<p><b>${l.sqft.toLocaleString()} sq ft</b> of living area${l.sqft?` ($${SC.ppsf(l)}/sq ft)`:''}.</p>`;
  if(/lot|yard|acre|land/.test(t)) return `<p>Lot size: <b>${l.acres} acres</b> (about ${Math.round(l.acres*43560).toLocaleString()} sq ft).</p>`;
  if(/year|built|how old|age/.test(t)) return l.year?`<p>Built in <b>${l.year}</b>.</p>`:unknown(l,q,'The listing doesn\'t say when it was built');
  if(/garage|parking/.test(t)) return `<p>${l.garage?`<b>${l.garage}-car garage</b>.`:'No garage is listed.'}</p>`;
  if(/pool/.test(t)) return `<p>${l.pool?'Yes, the listing includes a <b>pool</b>.':'No pool is listed.'}</p>`;
  if(/water|lake/.test(t)) return `<p>${l.waterfront?'Yes, it\'s listed as <b>waterfront</b>.':'It isn\'t listed as waterfront.'}</p>`;
  if(/stor(y|ies)|levels|floors/.test(t)) return `<p>${x.stories} stor${x.stories>1?'ies':'y'} ${DEMO}</p>`;
  if(/status|available|still for sale|under contract|pending/.test(t)) return `<p>Status: <b>${esc(l.status)}</b> (sample). Live status updates from Canopy MLS at launch, an agent can confirm availability.</p>`;
  if(/price|cost|how much/.test(t)) return `<p>List price: <b>${fmt(l.price)}</b>${l.sqft?` ($${SC.ppsf(l)}/sq ft)`:''}. That's the asking price, not an appraisal.</p>`;
  if(/tour|showing|see it|visit/.test(t)) return `<p>Add it to <b>Tour Day</b> with the button below and request a time, a Search Charlotte agent confirms every showing.</p>`;
  return unknown(l,q,'I don\'t have that in the listing details');}

SC.askHome={answer,mount(el,l){ if(!el||!l) return; ensureCSS(); const id='ah-in-'+l.id; const sec=el.closest('[hidden]'); if(sec) sec.hidden=false;
  const saved=SC.saved().includes(l.id), tour=SC.tourList().includes(l.id);
  const qs=new URLSearchParams({type:l.type,q:l.hood,min:Math.round(l.price*0.75/25000)*25000,max:Math.round(l.price*1.25/25000)*25000});
  el.innerHTML=`<div class="ah">
   <div class="ah-head"><div><p class="eyebrow">Ask this home</p><h2 class="ah-title">Questions about ${esc(l.address)}?</h2></div>${SC.ai&&SC.ai.voiceButton?'':''}</div>
   <div class="ah-thread" role="log" aria-live="polite"></div>
   <div class="ah-chips chips">${['What would my monthly payment be?','How far is SouthPark Mall?','How old is the roof?','Is there a fenced yard?','Closest grocery store?','Has the price changed?','Similar homes with a bigger yard'].map(q=>`<button type="button" class="chip" data-ahq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
   <form class="ah-form-q"><label class="sr-only" for="${id}">Ask a question about this home</label><input id="${id}" placeholder="Ask anything about this home" autocomplete="off"><button type="button" class="sca-mic" data-voice="${id}" aria-label="Ask by voice">${SC.micIcon}</button><button class="btn btn-sm" type="submit">Ask</button></form>
   <div class="ah-acts"><button type="button" class="btn btn-sm" data-ah-tour aria-pressed="${tour}">${tour?'In Tour Day':'Schedule a Tour'}</button><button type="button" class="btn btn-sm btn-outline" data-ah-agent>Ask an Agent</button><a class="btn btn-sm btn-outline" href="search.html?${qs}">Find Similar Homes</a><button type="button" class="btn btn-sm btn-outline" data-ah-save aria-pressed="${saved}">${saved?'Saved':'Save This Property'}</button></div>
   <p class="ah-fine">Answers come from this listing's details (sample data), demo enrichment fields marked “Demo value”, OpenStreetMap places and estimates with their methods shown. If the listing doesn't say, it will tell you and offer an agent. Tour requests are confirmed by an agent, <a href="tour.html">open Tour Day</a>.</p></div>`;
  const th=$('.ah-thread',el), f=$('.ah-form-q',el), inp=$('input',f);
  const push=(cls,html)=>{const d=document.createElement('div'); d.className='ah-msg '+cls; d.innerHTML=html; th.appendChild(d); th.scrollTop=th.scrollHeight; return d;};
  const ask=async q=>{push('ah-u',esc(q)); const d=push('ah-b','<span class="sca-typing"><i></i><i></i><i></i></span>'); const html=await answer(l,q); d.innerHTML=html; bindForms(d); th.scrollTop=th.scrollHeight; track('ask_home_question',{listing_id:l.id,q:q.slice(0,80)});};
  const bindForms=d=>{$$('form[data-lead]',d).forEach(fm=>fm.addEventListener('submit',e=>{e.preventDefault(); if(fm.website.value) return; if(!fm.checkValidity()){fm.reportValidity();return;} fm.classList.add('sent'); const b=$('button[type=submit]',fm); b.disabled=true; b.textContent='Sent'; track('form_submit',{form_type:'property_question',listing_id:l.id,page_path:location.pathname});}));
    $$('[data-ah-assume]',d).forEach(fm=>fm.addEventListener('submit',e=>{e.preventDefault(); const o={downPct:+fm.downPct.value,rate:+fm.rate.value,years:+fm.years.value}; d.innerHTML=payment(l,o); bindForms(d); track('ask_home_payment_recalc',{listing_id:l.id});}));};
  f.addEventListener('submit',e=>{e.preventDefault(); const q=inp.value.trim(); if(!q) return; inp.value=''; ask(q);});
  el.addEventListener('click',e=>{const c=e.target.closest('[data-ahq]'); if(c){ask(c.dataset.ahq); return;}
    const t=e.target.closest('[data-ah-tour]'); if(t){const on=SC.toggleTour(l.id); t.setAttribute('aria-pressed',on); t.textContent=on?'In Tour Day':'Schedule a Tour'; if(on) push('ah-b',`<p>Added to Tour Day. <a href="tour.html">Pick times and send the request</a>, an agent confirms each showing.</p>`); return;}
    const s=e.target.closest('[data-ah-save]'); if(s){const on=SC.toggleSave(l.id); s.setAttribute('aria-pressed',on); s.textContent=on?'Saved':'Save This Property'; $$(`.fav[data-id="${l.id}"]`).forEach(b=>b.setAttribute('aria-pressed',on)); return;}
    if(e.target.closest('[data-ah-agent]')){const d=push('ah-b',`<p>Send your question to a Search Charlotte agent:</p>${agentForm(l,'')}`); bindForms(d); $('textarea',d).focus();}});
  push('ah-b',`<p>Ask about price and payments, distances to places you care about, features, history or similar homes. I answer only from the listing and public map data.</p>`);
  track('ask_home_view',{listing_id:l.id});}};
})();

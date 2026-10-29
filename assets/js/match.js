/* Search Charlotte Home Match — preferences drawer + score UI (property_intel_builder).
   SC.matchPrefs.open()            -> opens the reusable preferences drawer (edits SC.prefs live via SC.setPrefs)
   SC.matchUI.mount(el, listing)   -> score ring + "Why this home matches" / "Potential compromises" + methodology
   SC.matchUI.ring(score, size)    -> SVG ring markup
   SC.matchUI.method()             -> methodology HTML (weights)
   Any element with [data-match-prefs] opens the drawer. Re-renders on document 'sc:change' (key sc_prefs).
   Scores use only objective listing facts and the user's own choices — never protected characteristics. */
(function(){'use strict';
const SC=window.SC; const {D,esc,short,fmt,track}=SC;
let amen={}; (SC.amenities||Promise.resolve({})).then(a=>{amen=a||{}; document.dispatchEvent(new CustomEvent('sc:amenities'));});
SC.matchAmen=()=>amen;
const WEIGHTS=[['Budget (max price)',3],['Bedrooms',2],['Preferred areas',2],['Commute time (estimate)',2],['Bathrooms',1.5],['Living area',1.5],['Home type',1.5],['Pool',1.5],['Waterfront',1.5],['Minimum price',1],['Lot size',1],['Architectural style',1],['Garage',1],['New or recent construction',1],['HOA limit',1],['Each lifestyle amenity rule',1],['Fenced yard',.75],['Primary bedroom on main',.75],['Year built minimum',.75]];
const method=()=>`<p><strong>How Home Match works.</strong> Each preference you set becomes a criterion with a weight. A home earns full credit when it meets a criterion, partial credit when it's close (for example within 5% of budget or one bedroom short), and none otherwise. The score is the weighted share of credit earned. Only criteria you set are counted.</p>
 <ul class="hm-weights">${WEIGHTS.map(([n,w])=>`<li><span>${n}</span><b>×${w}</b></li>`).join('')}</ul>
 <p>Home Match uses only objective home facts (price, size, features, location you chose), estimated drive times and OpenStreetMap amenity counts. It never uses protected characteristics, demographics, school ratings, crime data or any proxy for them. Listing facts are sample data in this preview; drive times are estimates (straight-line × 1.35 at 30–45 mph).</p>`;
const ring=(score,size=120)=>{const r=(size-14)/2, c=2*Math.PI*r, v=score==null?0:score, cls=v>=85?'hi':v>=65?'mid':'lo';
  return `<svg class="hm-ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${score==null?'No score yet':score+'% Home Match'}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="10" class="hm-ring-bg"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="10" stroke-linecap="round" class="hm-ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-v/100)}" transform="rotate(-90 ${size/2} ${size/2})"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="hm-ring-t">${score==null?'—':score+'%'}</text></svg>`;};

/* ---------- Score panel ---------- */
function mount(el,l){
  const draw=()=>{const r=SC.match(l,SC.prefs(),amen); const u=SC.user(); const who=u&&u.first&&SC.personalized()?`, ${esc(u.first)}`:'';
    el.classList.add('hm-panel');
    if(!r){el.innerHTML=`<div class="hm-ringwrap">${ring(null,112)}</div><div class="hm-copy"><p class="eyebrow">Search Charlotte Home Match</p><h3 class="hm-h">See how well this home fits you${who}</h3><p class="hm-p">Set your budget, must-haves, commute and lifestyle preferences once. Every home gets a transparent match score with the reasons behind it.</p><div class="hm-btns"><button class="btn btn-sm" type="button" data-match-prefs>Set my preferences</button>${methodBtn()}</div></div>`; return;}
    el.innerHTML=`<div class="hm-ringwrap">${ring(r.score,112)}<span class="hm-ring-l">${r.criteria} criteria scored</span></div>
     <div class="hm-copy"><p class="eyebrow">Search Charlotte Home Match${who?' for '+esc(u.first):''}</p><h3 class="hm-h">${r.score>=85?'Strong match':r.score>=65?'Good match with a few trade-offs':'Partial match'}</h3>
      <div class="hm-lists"><div><h4>Why this home matches</h4>${r.matches.length?`<ul class="hm-yes">${r.matches.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'<p class="hm-p">None of your criteria are fully met yet.</p>'}</div>
      <div><h4>Potential compromises</h4>${r.compromises.length?`<ul class="hm-no">${r.compromises.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'<p class="hm-p">No compromises on the criteria you set.</p>'}</div></div>
      <div class="hm-btns"><button class="btn btn-sm btn-outline" type="button" data-match-prefs>Edit preferences</button>${methodBtn()}</div>
      <p class="form-note">Estimate based on sample listing data and your preferences — not advice about any neighborhood or its residents.</p></div>`;};
  draw();
  document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_prefs'||e.detail.key==='*') draw();});
  document.addEventListener('sc:amenities',draw);
}
let popN=0;
const methodBtn=()=>{const id='hm-pop-'+(++popN); return `<span class="hm-popwrap"><button class="hm-info" type="button" aria-expanded="false" aria-controls="${id}" data-hm-pop>How scoring works</button><div class="hm-pop" id="${id}" role="dialog" aria-label="Home Match methodology" hidden>${method()}<button class="btn btn-sm" type="button" data-hm-pop-close>Close</button></div></span>`;};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-hm-pop]'); const cl=e.target.closest('[data-hm-pop-close]');
  document.querySelectorAll('.hm-pop:not([hidden])').forEach(p=>{if(!p.contains(e.target)||cl){p.hidden=true; const t=document.querySelector(`[aria-controls="${p.id}"]`); t&&t.setAttribute('aria-expanded','false'); if(cl) t&&t.focus();}});
  if(b){const p=document.getElementById(b.getAttribute('aria-controls')); const o=p.hidden; p.hidden=!o; b.setAttribute('aria-expanded',o); if(o) track('home_match_methodology',{});}
  const m=e.target.closest('[data-match-prefs]'); if(m){e.preventDefault(); open();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape') document.querySelectorAll('.hm-pop:not([hidden])').forEach(p=>{p.hidden=true; const t=document.querySelector(`[aria-controls="${p.id}"]`); t&&(t.setAttribute('aria-expanded','false'),t.focus());});});

/* ---------- Preferences drawer ---------- */
let dr=null, lastF=null;
const STYLES=[...new Set(D.listings.filter(l=>l.type!=='Land').map(l=>SC.extras(l).style))].sort();
const TYPES=['Single Family','Townhouse','Condo','Land'];
const LIFE=['restaurants','cafes','grocery','parks','trails','fitness','shopping','venues','transit','golf','water','bars','health','services'];
const num=v=>v===''||v==null?null:+v;
function html(){const p=SC.prefs(), m=p.mustHave||{};
  const chipset=(name,opts,sel)=>`<div class="chips" role="group">${opts.map(([v,t])=>`<button type="button" class="chip" data-set="${name}" data-v="${esc(v)}" aria-pressed="${sel.includes(v)}">${esc(t)}</button>`).join('')}</div>`;
  const seg=(name,vals,cur)=>`<div class="seg hm-seg" role="group">${vals.map(([v,t])=>`<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${String(cur??'')===String(v)}">${t}</button>`).join('')}</div>`;
  const c=p.commute||{};
  return `<div class="hm-dr-head"><div><p class="eyebrow">Search Charlotte Home Match</p><h2 class="display d-md" id="hm-dr-t">Your preferences</h2></div><button type="button" class="modal-x" data-hm-close aria-label="Close preferences"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="hm-dr-body">
   <p class="hm-live" aria-live="polite" data-hm-live></p>
   <fieldset><legend>Budget</legend><div class="row2"><div class="field"><label for="hm-bmin">Minimum price</label><input id="hm-bmin" type="number" inputmode="numeric" step="25000" min="0" data-k="budgetMin" value="${p.budgetMin??''}" placeholder="No minimum"></div><div class="field"><label for="hm-bmax">Maximum price</label><input id="hm-bmax" type="number" inputmode="numeric" step="25000" min="0" data-k="budgetMax" value="${p.budgetMax??''}" placeholder="No maximum"></div></div></fieldset>
   <fieldset><legend>Bedrooms</legend>${seg('beds',[['','Any'],[1,'1+'],[2,'2+'],[3,'3+'],[4,'4+'],[5,'5+']],p.beds)}</fieldset>
   <fieldset><legend>Bathrooms</legend>${seg('baths',[['','Any'],[1,'1+'],[2,'2+'],[2.5,'2.5+'],[3,'3+'],[4,'4+']],p.baths)}</fieldset>
   <fieldset><legend>Size</legend><div class="row2"><div class="field"><label for="hm-sq">Min living area (sq ft)</label><input id="hm-sq" type="number" step="100" min="0" data-k="sqftMin" value="${p.sqftMin??''}" placeholder="Any"></div><div class="field"><label for="hm-ac">Min lot (acres)</label><input id="hm-ac" type="number" step="0.05" min="0" data-k="acresMin" value="${p.acresMin??''}" placeholder="Any"></div></div></fieldset>
   <fieldset><legend>Home type</legend>${chipset('types',TYPES.map(t=>[t,t]),p.types)}</fieldset>
   <fieldset><legend>Style <small>(sample listing styles)</small></legend>${chipset('styles',STYLES.map(s=>[s,s]),p.styles)}</fieldset>
   <fieldset><legend>Preferred areas</legend>${chipset('areas',D.hoods.map(h=>[h.slug,h.name]),p.areas)}</fieldset>
   <fieldset><legend>Must-haves</legend><div class="hm-checks">
     ${[['pool','Pool'],['waterfront','Waterfront'],['newConstruction','New or recent construction'],['fenced','Fenced yard'],['primaryOnMain','Primary bedroom on main']].map(([k,t])=>`<label><input type="checkbox" data-mh="${k}" ${m[k]?'checked':''}> ${t}</label>`).join('')}
     <div class="field"><label for="hm-gar">Garage</label><select id="hm-gar" data-mh="garage">${[0,1,2,3].map(v=>`<option value="${v}" ${+m.garage===v?'selected':''}>${v?v+'+ car':'Not required'}</option>`).join('')}</select></div></div></fieldset>
   <fieldset><legend>Limits</legend><div class="row2"><div class="field"><label for="hm-hoa">Max HOA ($/mo)</label><input id="hm-hoa" type="number" step="25" min="0" data-k="hoaMax" value="${p.hoaMax??''}" placeholder="No limit"></div><div class="field"><label for="hm-yr">Built in or after</label><input id="hm-yr" type="number" step="1" min="1900" max="2027" data-k="yearMin" value="${p.yearMin??''}" placeholder="Any year"></div></div></fieldset>
   <fieldset><legend>Commute</legend><div class="row2"><div class="field"><label for="hm-cd">Destination</label><select id="hm-cd" data-commute="dest"><option value="">No commute preference</option>${SC.LANDMARKS.map(x=>`<option value="${x.id}" ${c.id===x.id||(c.label===x.name)?'selected':''}>${esc(x.name)}</option>`).join('')}${c.lat&&!SC.LANDMARKS.some(x=>x.name===c.label)?`<option value="custom" selected>${esc(c.label)}</option>`:''}</select></div>
     <div class="field"><label for="hm-cm">Max drive (minutes)</label><input id="hm-cm" type="number" min="5" max="120" step="5" data-commute="max" value="${c.maxMin||30}"></div></div><p class="form-note">Drive times are estimates (straight-line distance × 1.35 road factor at 30–45 mph). Live traffic-aware times at launch.</p></fieldset>
   <fieldset><legend>Lifestyle amenities nearby</legend><div data-life>${(p.lifestyle||[]).map((r,i)=>lifeRow(r,i)).join('')}</div><button type="button" class="btn btn-sm btn-outline" data-life-add>Add amenity rule</button><p class="form-note">Counts places in OpenStreetMap within 1 or 3 straight-line miles of each home.</p></fieldset>
   <p class="form-note hm-fair">Home Match never uses protected characteristics, demographics, school ratings or crime data.</p>
  </div>
  <div class="hm-dr-foot"><button type="button" class="btn btn-outline btn-sm" data-hm-reset>Clear all</button><button type="button" class="btn btn-sm" data-hm-close>Show my matches</button></div>`;}
const lifeRow=(r,i)=>`<div class="hm-life" data-i="${i}"><select aria-label="Amenity type" data-lf="cat">${LIFE.map(c=>`<option value="${c}" ${r.cat===c?'selected':''}>${esc(SC.poi.label(c))}</option>`).join('')}</select><label class="hm-life-n">at least <input type="number" min="1" max="50" value="${r.min||1}" aria-label="Minimum count" data-lf="min"></label><select aria-label="Within distance" data-lf="maxMi"><option value="1" ${(r.maxMi||1)<=1?'selected':''}>within 1 mi</option><option value="3" ${r.maxMi>1?'selected':''}>within 3 mi</option></select><button type="button" class="hm-life-x" aria-label="Remove rule" data-lf-x>×</button></div>`;
function live(){const p=SC.prefs(); const box=dr.querySelector('[data-hm-live]'); if(!SC.hasPrefs()&&!p.hoaMax&&!p.yearMin&&!p.acresMin&&!p.budgetMin){box.textContent='Set any preference to start scoring the 65 sample homes.'; return;}
  const s=D.listings.map(l=>SC.match(l,p,amen)).filter(Boolean).map(r=>r.score); const hi=s.filter(x=>x>=85).length, mid=s.filter(x=>x>=65&&x<85).length;
  box.innerHTML=`<b>${hi}</b> strong and <b>${mid}</b> good matches among ${s.length} sample homes — updates as you edit.`;}
function save(patch){SC.setPrefs(patch); live();}
function wire(){
  dr.addEventListener('input',e=>{const t=e.target;
    if(t.dataset.k) save({[t.dataset.k]:num(t.value)});
    if(t.dataset.commute==='max'){const c=SC.prefs().commute; if(c) save({commute:Object.assign({},c,{maxMin:+t.value||30})});}
    if(t.dataset.lf==='min') readLife();});
  dr.addEventListener('change',e=>{const t=e.target;
    if(t.dataset.mh){const m=Object.assign({},SC.prefs().mustHave); m[t.dataset.mh]=t.type==='checkbox'?t.checked:+t.value; save({mustHave:m});}
    if(t.dataset.commute==='dest'){const x=SC.lmk(t.value); const max=+dr.querySelector('[data-commute=max]').value||30; if(t.value==='custom') return; save({commute:x?{id:x.id,lat:x.lat,lng:x.lng,label:x.name,maxMin:max}:null});}
    if(t.dataset.lf) readLife();});
  dr.addEventListener('click',e=>{const t=e.target.closest('button'); if(!t) return;
    if(t.dataset.set){const k=t.dataset.set, v=t.dataset.v; let a=[...(SC.prefs()[k]||[])]; a=a.includes(v)?a.filter(x=>x!==v):[...a,v]; t.setAttribute('aria-pressed',a.includes(v)); save({[k]:a});}
    if(t.dataset.seg){dr.querySelectorAll(`[data-seg="${t.dataset.seg}"]`).forEach(b=>b.setAttribute('aria-pressed',b===t)); save({[t.dataset.seg]:num(t.dataset.v)});}
    if(t.hasAttribute('data-life-add')){const a=[...(SC.prefs().lifestyle||[]),{cat:'grocery',min:1,maxMi:1}]; save({lifestyle:a}); dr.querySelector('[data-life]').innerHTML=a.map(lifeRow).join('');}
    if(t.hasAttribute('data-lf-x')){t.closest('.hm-life').remove(); readLife(); dr.querySelector('[data-life]').innerHTML=SC.prefs().lifestyle.map(lifeRow).join('');}
    if(t.hasAttribute('data-hm-reset')){SC.db.set('sc_prefs',{}); render(); track('home_match_reset',{});}
    if(t.hasAttribute('data-hm-close')) close();});
  dr.addEventListener('click',e=>{if(e.target===dr) close();});
  dr.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation(); close();}
    if(e.key==='Tab'){const f=[...dr.querySelectorAll('button,input,select,[href]')].filter(x=>x.offsetParent!==null); const a=f[0], z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){e.preventDefault(); z.focus();} else if(!e.shiftKey&&document.activeElement===z){e.preventDefault(); a.focus();}}});
}
function readLife(){const a=[...dr.querySelectorAll('.hm-life')].map(r=>({cat:r.querySelector('[data-lf=cat]').value,min:+r.querySelector('[data-lf=min]').value||1,maxMi:+r.querySelector('[data-lf=maxMi]').value})); save({lifestyle:a});}
function render(){dr.querySelector('.hm-dr').innerHTML=html(); live();}
function open(){
  if(!dr){dr=document.createElement('div'); dr.className='hm-scrim'; dr.innerHTML='<div class="hm-dr" role="dialog" aria-modal="true" aria-labelledby="hm-dr-t"></div>'; document.body.appendChild(dr); wire();}
  lastF=document.activeElement; render(); dr.classList.add('open'); document.documentElement.classList.add('hm-lock');
  setTimeout(()=>{const f=dr.querySelector('#hm-bmax'); f&&f.focus({preventScroll:true});},60); track('home_match_prefs_open',{});}
function close(){if(!dr) return; dr.classList.remove('open'); document.documentElement.classList.remove('hm-lock'); lastF&&lastF.focus&&lastF.focus({preventScroll:true});}
SC.matchPrefs={open,close};
SC.matchUI={mount,ring,method};
})();

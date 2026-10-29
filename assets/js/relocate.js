/* Moving to Charlotte Concierge. Objective-fit ranking only: budget, commute, POI distance, home features. Storage: SC.db 'sc_reloc'. */
(function(){
const SC=window.SC, ll=SC.ll, {$,$$,esc,fmt}=SC;
const FEATURES={'walkable':'Walkable streets','light-rail':'Near light rail','greenway':'Greenway access','lake-access':'Lake access','golf':'Golf nearby','new-construction':'New construction','historic':'Historic homes','acreage':'Room for acreage','near-uptown':'Close to Uptown','near-airport':'Close to the airport','high-rise':'High-rise living','nightlife':'Nightlife'};
const TYPES=['Single Family','Townhouse','Condo','Land'];
const ACT_CATS=['restaurants','cafes','bars','grocery','parks','trails','venues','shopping','golf','water','fitness','transit'];
const BUDGETS=[300000,350000,400000,450000,500000,600000,700000,850000,1000000,1250000,1500000,2000000];
const TIMELINES={'0-3':'Within 3 months','3-6':'3 to 6 months','6-12':'6 to 12 months','12+':'More than a year','unsure':'Not sure yet'};
const W={budget:35,commute:30,amenities:20,features:15};
const RESOURCES=[
 {t:'NCDMV: Moving to North Carolina',u:'https://www.ncdot.gov/dmv/help/moving/Pages/new-residents.aspx',d:'New residents who drive must get an NC driver license and title and register their vehicles within 60 days of establishing residence. Get the license first.',st:'NC'},
 {t:'NCDMV: Vehicle titles and registration',u:'https://www.ncdot.gov/dmv/title-registration/vehicle/Pages/default.aspx',d:'Title requirements and documents for new NC residents, including the temporary driving certificate.',st:'NC'},
 {t:'Duke Energy: Start, stop or move service',u:'https://www.duke-energy.com/home/start-stop-move',d:'Set up electric service at your new address.',st:'all'},
 {t:'Charlotte Water: Start or stop service',u:'https://www.charlottenc.gov/water/Customer-Care/Start-Stop-Service',d:'Call 311 or 704-336-7600, or use CLTWaterHub. Other towns may have their own water utility.',st:'NC'},
 {t:'Charlotte-Mecklenburg Schools: Registration',u:'https://www.cmsk12.org/enroll',d:'How to register students in CMS. Schools are assigned by address; other counties run their own districts.',st:'NC'},
 {t:'Mecklenburg County Board of Elections',u:'https://vote.mecknc.gov/',d:'Voter information for Mecklenburg County residents.',st:'NC'},
 {t:'NC State Board of Elections: How to register',u:'https://www.ncsbe.gov/registering/how-register',d:'Statewide voter registration for any NC county.',st:'NC'},
 {t:'SCDMV: Moving to SC (license)',u:'https://dmv.sc.gov/driver-services/moving-to-sc',d:'For Fort Mill, Tega Cay, Lake Wylie and other SC towns: apply for an SC license within 45 days and transfer vehicle registration within 45 days.',st:'SC'},
 {t:'York County, SC: Registering a vehicle',u:'https://www.yorkcountysc.gov/161/Registering-a-Vehicle-Address-Change',d:'New SC residents pay county vehicle property tax before getting an SC plate.',st:'SC'},
 {t:'SC Votes: Voter registration',u:'https://www.scvotes.gov/',d:'Register to vote in South Carolina.',st:'SC'}];

let A, AREAS=[], PULSE=null, EVENTS=[], step=0, results=[], showAll=false;
const blank={from:'',budget:500000,work:'uptown',acts:[],feats:[],types:[],commute:30,timeline:'3-6'};
const saved=SC.db.get('sc_reloc',{});
A=Object.assign({},blank,saved.answers||{});
const fromURL=()=>{const q=new URLSearchParams(location.search); if(!q.has('b')) return false;
  A={from:q.get('from')||'',budget:+q.get('b')||500000,work:q.get('w')||'remote',acts:(q.get('a')||'').split(',').filter(c=>SC.POI_CATS[c]),feats:(q.get('f')||'').split(',').filter(f=>FEATURES[f]),types:(q.get('t')||'').split(',').filter(t=>TYPES.includes(t)),commute:+q.get('c')||30,timeline:TIMELINES[q.get('tl')]?q.get('tl'):'unsure'}; return true;};
const shareURL=()=>{const p=new URLSearchParams({b:A.budget,w:A.work,c:A.commute,tl:A.timeline}); if(A.from) p.set('from',A.from); if(A.acts.length) p.set('a',A.acts.join(',')); if(A.feats.length) p.set('f',A.feats.join(',')); if(A.types.length) p.set('t',A.types.join(','));
  return location.origin+location.pathname+'?'+p;};
const save=()=>SC.db.update('sc_reloc',{},v=>Object.assign({},v,{answers:A,updated:new Date().toISOString()}));
const workplace=()=>A.work==='remote'?null:SC.lmk(A.work)||null;
const opt=(type,name,val,label,checked)=>`<label class="ll-opt"><input type="${type}" name="${name}" value="${esc(val)}" ${checked?'checked':''}><span>${esc(label)}</span></label>`;

const STEPS=[
 {h:'Where are you moving from?',help:'Optional. It helps your advisor plan timing and travel.',html:()=>`<div class="field" style="max-width:none"><label for="q-from">City and state</label><input id="q-from" name="from" value="${esc(A.from)}" placeholder="e.g. Columbus, OH" autocomplete="address-level2"></div>`,read:f=>{A.from=f.from.value.trim();}},
 {h:'What\'s your home budget?',help:'Top of your comfortable purchase price. We compare it with published median sale prices for each area.',html:()=>`<div class="ll-range"><input type="range" id="q-budget" name="budget" min="0" max="${BUDGETS.length-1}" step="1" value="${Math.max(0,BUDGETS.findIndex(b=>b>=A.budget))}" aria-label="Maximum budget"><output id="q-budget-o">${SC.short(A.budget)}</output></div>`,
  init:()=>{$('#q-budget').addEventListener('input',e=>{$('#q-budget-o').textContent=SC.short(BUDGETS[e.target.value]);});},read:f=>{A.budget=BUDGETS[+f.budget.value];}},
 {h:'Where will you work?',help:'We estimate drive time from each area. Pick the closest match.',html:()=>`<div class="ll-opts">${SC.LANDMARKS.map(l=>opt('radio','work',l.id,l.name,A.work===l.id)).join('')}${opt('radio','work','remote','I work from home',A.work==='remote')}</div>`,read:f=>{A.work=(f.querySelector('[name=work]:checked')||{}).value||'remote';}},
 {h:'What do you like to have nearby?',help:'Pick any. We count these places within 1.5 miles of each area using OpenStreetMap data.',html:()=>`<div class="ll-opts">${ACT_CATS.map(c=>opt('checkbox','acts',c,SC.POI_CATS[c],A.acts.includes(c))).join('')}</div>`,read:f=>{A.acts=$$('[name=acts]:checked',f).map(i=>i.value);}},
 {h:'Must-have home and area features',help:'Pick home types and features. Areas are matched on the housing and features they\'re known for.',html:()=>`<p class="ll-step-l" style="margin:0 0 8px">Home types</p><div class="ll-opts">${TYPES.map(t=>opt('checkbox','types',t,t==='Land'?'Land / lots':t,A.types.includes(t))).join('')}</div><p class="ll-step-l" style="margin:16px 0 8px">Area features</p><div class="ll-opts">${Object.entries(FEATURES).map(([k,v])=>opt('checkbox','feats',k,v,A.feats.includes(k))).join('')}</div>`,read:f=>{A.types=$$('[name=types]:checked',f).map(i=>i.value); A.feats=$$('[name=feats]:checked',f).map(i=>i.value);}},
 {h:'Longest commute you\'d accept',help:'One-way drive time. Estimates assume typical traffic, not rush hour.',html:()=>`<div class="ll-range"><input type="range" id="q-commute" name="commute" min="10" max="60" step="5" value="${A.commute}" aria-label="Maximum commute minutes"><output id="q-commute-o">${A.commute} min</output></div>`,init:()=>{$('#q-commute').addEventListener('input',e=>{$('#q-commute-o').textContent=e.target.value+' min';});},read:f=>{A.commute=+f.commute.value;},skip:()=>A.work==='remote'},
 {h:'When do you plan to move?',help:'We\'ll build your checklist around this.',html:()=>`<div class="ll-opts">${Object.entries(TIMELINES).map(([k,v])=>opt('radio','timeline',k,v,A.timeline===k)).join('')}</div>`,read:f=>{A.timeline=(f.querySelector('[name=timeline]:checked')||{}).value||'unsure';}}];

function showStep(){
  const s=STEPS[step];
  $('#rl-prog').innerHTML=STEPS.map((_,i)=>`<span class="${i<=step?'on':''}"></span>`).join('');
  $('#rl-step').innerHTML=`<p class="ll-step-l">Step ${step+1} of ${STEPS.length}</p><h2 class="display d-md">${s.h}</h2><p class="ll-help">${s.help}</p>${s.html()}`;
  s.init&&s.init(); $('#rl-back').style.visibility=step?'visible':'hidden'; $('#rl-next').textContent=step===STEPS.length-1?'See my guide':'Next';
  const first=$('#rl-step input'); first&&step&&first.focus({preventScroll:true});
}

/* ---------- Scoring ---------- */
async function score(){
  const wp=workplace();
  const out=await Promise.all(AREAS.map(async a=>{
    const f={}, notes={};
    // Budget: published Canopy median for the market the area belongs to
    const pa=PULSE?ll.pulseAreaFor(a,PULSE):null; const med=pa?ll.latest(PULSE,pa.id,'median_sale_price'):null;
    const samples=SC.D.listings.filter(l=>l.hood===a.slug); const inB=samples.filter(l=>l.price<=A.budget);
    if(med){const r=A.budget/med.value; const mf=r>=1?1:Math.max(0,1-(1-r)*2.5); f.budget=samples.length?0.5*mf+0.5*(inB.length/samples.length):mf;
      notes.budget=`Your ${SC.short(A.budget)} budget vs. the ${ll.ym(med.month)} median of ${fmt(med.value)} for ${esc(ll.areaName(PULSE,pa.id))}${pa.scope==='city'||pa.scope==='county'?' (citywide/countywide figure, not this neighborhood alone)':''}.${samples.length?` ${inB.length} of ${samples.length} sample listings here are within budget (counted as half of this score).`:''}`;
      a._med={...med,areaId:pa.id};}
    else {notes.budget='No published median for this area.';}
    // Commute
    if(wp){const d=SC.drive([a.lat,a.lng],[wp.lat,wp.lng]); a._drive=d; f.commute=d.minutes<=A.commute?1-0.3*(d.minutes/A.commute):Math.max(0,0.7-((d.minutes-A.commute)/A.commute)*1.4);
      notes.commute=`About ${d.minutes} min / ${d.miles} mi to ${esc(wp.name)} (estimate: straight-line distance × 1.35 at typical speeds).`;}
    // Amenities
    if(A.acts.length){const pois=await SC.poi.near(a.lat,a.lng,1.5,A.acts); a._pois=pois;
      const per=A.acts.map(c=>({c,n:pois.filter(p=>p.cat===c).length})); f.amenities=per.reduce((s,x)=>s+Math.min(1,x.n/8),0)/per.length;
      notes.amenities=per.map(x=>`${x.n} ${SC.POI_CATS[x.c].toLowerCase()}`).join(', ')+' within 1.5 mi (OpenStreetMap).';}
    // Features + home types
    const want=[...A.feats.map(x=>({k:x,ok:(a.feature_tags||[]).includes(x),l:FEATURES[x]})),...A.types.map(t=>({k:t,ok:(a.home_types||[]).includes(t),l:t}))];
    if(want.length){f.features=want.filter(w=>w.ok).length/want.length;
      notes.features=want.map(w=>(w.ok?'Has ':'Not listed: ')+w.l.toLowerCase()).join('; ')+'.';}
    const used=Object.keys(f); const tw=used.reduce((s,k)=>s+W[k],0);
    const total=tw?used.reduce((s,k)=>s+f[k]*W[k],0)/tw:0;
    return {a,f,notes,total};
  }));
  return out.sort((x,y)=>y.total-x.total||x.a.name.localeCompare(y.a.name));
}
const LBL={budget:'Budget',commute:'Commute',amenities:'Nearby places',features:'Features'};
function rankCard(r,i){
  const a=r.a; const fs=Object.keys(LBL);
  return `<article class="ll-hood"><div class="ll-hood-n">${String(i+1).padStart(2,'0')}</div>
  <div><h3>${esc(a.name)}</h3><span class="ll-hood-sub">${esc([a.area,a.kind==='city'?(a.county+' County, '+(a.state||'')):a.city].filter(Boolean).join(' · '))}</span></div>
  <div class="ll-fit"><b>${Math.round(r.total*100)}</b><span>fit out of 100</span></div>
  <div class="ll-factors">${fs.map(k=>r.f[k]==null?`<div class="ll-factor"><b>${LBL[k]}</b><span class="na">${k==='commute'?'Not scored (remote)':'Not scored'}</span></div>`:`<div class="ll-factor"><b>${LBL[k]} · ${Math.round(r.f[k]*100)}</b><div class="ll-bar"><i style="width:${Math.round(r.f[k]*100)}%"></i></div>${r.notes[k]}</div>`).join('')}</div>
  <div class="ll-hood-links"><a href="${ll.hoodUrl(a.slug)}">Area guide</a><a href="${ll.homesUrl(a.slug)}">Homes for sale</a><a href="pulse.html?area=${r.a._med?r.a._med.areaId:'region'}">Market data</a></div></article>`;
}
function renderRank(){const n=showAll?results.length:8; $('#rl-rank').innerHTML=results.slice(0,n).map(rankCard).join(''); $('#rl-more').textContent=showAll?'Show top 8 only':`Show all ${results.length} areas`;}

function checklist(){
  const S={'0-3':['Now','Next 2–4 weeks','Moving week','First 60 days'],'3-6':['3–6 months out','1–2 months out','Moving week','First 60 days'],'6-12':['6–12 months out','2–3 months out','Moving week','First 60 days'],'12+':['A year out','3–6 months out','Moving week','First 60 days'],'unsure':['Getting started','Once you pick a date','Moving week','First 60 days']}[A.timeline];
  const sc=results.slice(0,3).some(r=>r.a.state==='SC');
  const items=[[S[0],[['Get pre-approved for a mortgage','Know your real budget before touring.'],['Shortlist 3–5 areas from this guide','Visit at different times of day if you can.'],['Talk with a local advisor','Ask about new listings that fit.']]],
    [S[1],[['Tour homes in person or by video',''],['Schedule movers and get written quotes',''],['Request records from current schools and doctors',''],['Book a home inspection once under contract','']]],
    [S[2],[['Start electric and water service at the new address','Links on the right.'],['Forward your mail with USPS',''],['Update your address with banks and insurers','']]],
    [S[3],[['Get your NC driver license','Within 60 days of becoming a resident (NCDMV).'],['Title and register your vehicles in NC','Within 60 days; license first.'],...(sc?[['If you live in SC: SC license and registration','Within 45 days (SCDMV).']]:[]),['Register to vote at your new address',''],['Enroll students with your school district','']]]];
  const done=(SC.db.get('sc_reloc',{}).checked)||{};
  $('#rl-check-sub').textContent=`Built for a move ${TIMELINES[A.timeline].toLowerCase()}. Check items off as you go; progress stays in this browser session.`;
  $('#rl-check').innerHTML=items.map(([h,list])=>`<h4>${esc(h)}</h4><ul class="ll-check">${list.map(([t,s])=>{const id='c-'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40); return `<li><label><input type="checkbox" data-c="${id}" ${done[id]?'checked':''}><span>${esc(t)}${s?`<small>${esc(s)}</small>`:''}</span></label></li>`;}).join('')}</ul>`).join('');
  $$('#rl-check [data-c]').forEach(c=>c.addEventListener('change',()=>{SC.db.update('sc_reloc',{},v=>{const ch=Object.assign({},v.checked||{}); ch[c.dataset.c]=c.checked; return Object.assign({},v,{checked:ch});}); SC.track('relocation_checklist',{item:c.dataset.c,done:c.checked});}));
  const states=new Set(['all','NC']); if(sc) states.add('SC');
  $('#rl-res').innerHTML=RESOURCES.filter(r=>states.has(r.st)||r.st==='SC').map(r=>`<a class="info" href="${r.u}" target="_blank" rel="noopener"><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p><small>${r.st==='SC'?'South Carolina':r.st==='NC'?'North Carolina':'NC & SC'} · official site</small></a>`).join('');
}

async function dashboard(){
  $('#rl-quiz-wrap').hidden=true; $('#rl-dash').hidden=false;
  $('#rl-rank').innerHTML='<p class="ll-empty">Ranking areas…</p>';
  results=await score(); const top=results.slice(0,8), wp=workplace();
  const chips=[A.from&&'From '+A.from,'Budget up to '+SC.short(A.budget),wp?`Work: ${wp.name} · max ${A.commute} min`:'Works from home',A.acts.length&&A.acts.map(c=>SC.POI_CATS[c]).join(', '),(A.types.length||A.feats.length)&&[...A.types,...A.feats.map(f=>FEATURES[f])].join(', '),'Moving: '+TIMELINES[A.timeline]].filter(Boolean);
  $('#rl-summary').innerHTML=chips.map(c=>`<span class="chip">${esc(c)}</span>`).join('');
  $('#rl-dash-h').textContent=`Your top areas, out of ${results.length}`;
  $('#rl-method').innerHTML=`<p>Each area gets up to four factor scores (0–100), averaged with these weights: budget ${W.budget}%, commute ${W.commute}%, nearby places ${W.amenities}%, features ${W.features}%. Factors you skipped are left out and the rest are re-weighted.</p><ul><li><b>Budget</b>: your budget compared with the latest Canopy-published median sale price for the market the area belongs to. Charlotte neighborhoods share the City of Charlotte median, so where we have sample listings for a neighborhood, half of this score is the share of those listings within your budget. Sample listings are preview data; at launch this uses live Canopy MLS listings via Showcase IDX.</li><li><b>Commute</b>: estimated drive time (straight-line distance × 1.35 at 30–45 mph). Not live traffic; production will use a routing API.</li><li><b>Nearby places</b>: OpenStreetMap places within 1.5 miles of the area's center point, capped at 8 per category.</li><li><b>Features</b>: whether the area's guide lists the home types and features you picked.</li></ul><p>We never use school ratings, demographics, crime data or who lives in an area.</p>`;
  showAll=false; renderRank();
  // Commute table
  const lm=['uptown','clt','southpark-mall'].map(SC.lmk); const cols=wp&&!lm.includes(wp)?[wp,...lm]:lm;
  $('#rl-commute-sub').textContent='Estimated one-way drive times from each area\'s center (straight-line distance × 1.35 at typical speeds). Not live traffic.';
  $('#rl-commute').innerHTML=`<thead><tr><th>Area</th>${cols.map(c=>`<th>${esc(c.name)}${c===wp?' (your work)':''}</th>`).join('')}</tr></thead><tbody>${top.map(r=>`<tr><td>${esc(r.a.name)}</td>${cols.map(c=>{const d=SC.drive([r.a.lat,r.a.lng],[c.lat,c.lng]); return `<td class="n">${d.minutes} min<br><span class="na">${d.miles} mi</span></td>`;}).join('')}</tr>`).join('')}</tbody>`;
  // Sample homes
  const slugs=top.map(r=>r.a.slug); let homes=SC.D.listings.filter(l=>slugs.includes(l.hood)&&l.price<=A.budget&&(!A.types.length||A.types.includes(l.type)));
  let note='';
  if(homes.length<4){const more=SC.D.listings.filter(l=>!homes.includes(l)&&l.price<=A.budget&&(!A.types.length||A.types.includes(l.type))).sort((a,b)=>b.price-a.price); homes=homes.concat(more).slice(0,8); note=homes.length?'Few sample homes in your top areas, so we added other in-budget sample homes.':'';}
  $('#rl-homes').innerHTML=homes.slice(0,8).map(l=>SC.card(l)).join('')||'<p class="ll-empty">No sample homes match this budget and home type. Live search at launch covers all Canopy MLS listings.</p>';
  if(note) $('#rl-homes').insertAdjacentHTML('beforebegin',`<p class="sample-note" id="rl-homes-note">${note}</p>`);
  $('#rl-search').href='search.html?q='+encodeURIComponent(top[0].a.slug)+'&max='+A.budget;
  // POIs near top match
  const t0=top[0].a; const cats=A.acts.length?A.acts:['restaurants','parks','grocery','cafes'];
  const pois=await SC.poi.near(t0.lat,t0.lng,1.5,cats);
  $('#rl-poi-sub').textContent=`Closest places to the center of ${t0.name}${A.acts.length?' in the categories you picked':''}.`;
  const pick=[]; cats.forEach(c=>pois.filter(p=>p.cat===c&&p.name).slice(0,2).forEach(p=>pick.push(p)));
  $('#rl-poi').innerHTML=pick.sort((a,b)=>a.mi-b.mi).slice(0,10).map(p=>`<li>${esc(p.name)}<small>${esc(SC.POI_CATS[p.cat])} · ${p.mi} mi</small></li>`).join('')||'<li>No mapped places found within 1.5 miles.</li>';
  $('#rl-poi-src').textContent=SC.poi.attribution;
  // Events near top 3
  const t3=top.slice(0,3).map(r=>r.a);
  const ev=EVENTS.filter(e=>e.end>='2026-11-01').map(e=>({e,mi:Math.min(...t3.map(a=>SC.miles([a.lat,a.lng],[e.lat,e.lng])))})).sort((a,b)=>a.mi-b.mi||a.e.start.localeCompare(b.e.start)).slice(0,6);
  $('#rl-events').innerHTML=ev.map(({e,mi})=>`<li><a class="ll-lnk" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a><small>${e.date_text?esc(e.date_text):ll.dateShort(e.start)+(e.end!==e.start?' – '+ll.dateShort(e.end):'')} · ${esc(e.venue)} · ${mi.toFixed(1)} mi from your top areas</small></li>`).join('')||'<li>No events loaded.</li>';
  // Market
  const seen=new Map(); top.forEach(r=>{if(r.a._med&&!seen.has(r.a._med.areaId)) seen.set(r.a._med.areaId,r.a._med);});
  const rows=[...seen.keys()].slice(0,6).map(id=>{const m=ll.latest(PULSE,id,'median_sale_price'), c=ll.latest(PULSE,id,'closed_sales'), n=ll.latest(PULSE,id,'new_listings'), ms=ll.latest(PULSE,id,'months_supply');
    return `<tr><td>${esc(ll.areaName(PULSE,id))}</td><td class="n">${m?fmt(m.value):'<span class="na">Not published</span>'}${m&&m.yoy!=null?`<br><span class="na">${m.yoy>0?'+':''}${m.yoy}% YoY</span>`:''}</td><td class="n">${c?c.value.toLocaleString():'<span class="na">Not published</span>'}</td><td class="n">${n?n.value.toLocaleString():'<span class="na">Not published</span>'}</td><td class="n">${ms?ms.value+' mo':'<span class="na">Not published</span>'}</td><td>${m?ll.ym(m.month):''}</td></tr>`;});
  $('#rl-market').innerHTML=`<thead><tr><th>Market</th><th>Median sale price</th><th>Closed sales</th><th>New listings</th><th>Months supply</th><th>Month</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  $('#rl-market-src').innerHTML=`Source: Canopy Realtor® Association monthly reports (Canopy MLS data), retrieved ${ll.date(PULSE.meta.retrieved)}. <a href="pulse.html">Open Market Pulse</a> for trends and each figure's source.`;
  checklist();
  $('#rl-guide-field').value=shareURL();
  $('#rl-msg').placeholder=`Top matches: ${top.slice(0,3).map(r=>r.a.name).join(', ')}`;
  history.replaceState(null,'',shareURL().replace(location.origin,''));
  SC.track('relocation_guide_view',{top_area:t0.slug,work:A.work,timeline:A.timeline});
}

Promise.all([ll.areas(),ll.pulse().catch(()=>null),ll.events().catch(()=>({events:[]}))]).then(([areas,p,ev])=>{
  AREAS=areas; PULSE=p; EVENTS=ev.events||[];
  if(fromURL()){save(); dashboard();} else showStep();
  $('#rl-quiz').addEventListener('submit',e=>{e.preventDefault(); STEPS[step].read($('#rl-quiz')); save();
    let n=step+1; while(n<STEPS.length&&STEPS[n].skip&&STEPS[n].skip()) n++;
    SC.track('relocation_step',{step:step+1});
    if(n>=STEPS.length){dashboard(); window.scrollTo({top:$('#rl-dash').offsetTop-80,behavior:ll.reduced()?'auto':'smooth'});} else {step=n; showStep();}});
  $('#rl-back').addEventListener('click',()=>{STEPS[step].read($('#rl-quiz')); let n=step-1; while(n>0&&STEPS[n].skip&&STEPS[n].skip()) n--; step=Math.max(0,n); showStep();});
  $('#rl-edit').addEventListener('click',()=>{$('#rl-dash').hidden=true; $('#rl-quiz-wrap').hidden=false; const hn=$('#rl-homes-note'); hn&&hn.remove(); step=0; showStep(); history.replaceState(null,'',location.pathname); $('#rl-quiz-wrap').scrollIntoView();});
  $('#rl-more').addEventListener('click',()=>{showAll=!showAll; renderRank();});
  $('#rl-print').addEventListener('click',()=>{SC.track('relocation_print',{}); window.print();});
  $('#rl-copy').addEventListener('click',()=>{const u=shareURL(); (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>SC.toast('Share link copied')).catch(()=>{window.prompt('Copy this link',u);}); SC.track('relocation_share',{});});
}).catch(()=>{$('#rl-step').innerHTML='<p class="ll-empty">The concierge could not load area data. Please refresh the page.</p>';});
})();

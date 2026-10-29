/* Seller Command Center. No automated valuation: prices come from an agent-prepared CMA.
   Storage: SC.db 'sc_seller' {calc:{}, listDate, area, checked:{}} */
(function(){
const {$,$$,esc}=SC; const ll=SC.ll; const KEY='sc_seller';
const money=v=>(v<0?'-':'')+'$'+Math.round(Math.abs(v)).toLocaleString('en-US');
const st=Object.assign({calc:{},checked:{}},SC.db.get(KEY,{})||{});
const save=patch=>{Object.assign(st,patch); SC.db.set(KEY,st);};
const NC_STATUTE='https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-228.30.html';

/* ---------- Net proceeds (estimate) ---------- */
const NUM=['price','comm','payoff','atty','conc','rep','other'];
function calc(){
  const f=$('#sl-calc'); const v={}; NUM.forEach(k=>{const x=parseFloat(f.elements[k].value); v[k]=isFinite(x)&&x>0?x:0;}); v.state=f.elements.state.value;
  const comm=v.price*v.comm/100;
  const excise=v.state==='NC'&&v.price>0?Math.ceil(v.price/500):0; // G.S. 105-228.30: $1 per $500 or fractional part
  const rows=[['Sale price',v.price],[`Commission (${v.comm||0}% you entered)`,-comm],
    v.state==='NC'?['NC excise (revenue) tax',-excise]:['NC excise tax (not applicable in SC)',0],
    ['Mortgage payoff',-v.payoff],['Closing attorney fee',-v.atty],['Seller concessions',-v.conc],['Repairs and prep',-v.rep],['Other costs',-v.other]];
  const net=rows.reduce((s,r)=>s+r[1],0);
  $('#n-total').textContent=money(net);
  $('#n-table').innerHTML=rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]===0&&r[0]!=='Sale price'?'$0':money(r[1])}</td></tr>`).join('')+`<tr><td><b>Estimated net</b></td><td><b>${money(net)}</b></td></tr>`;
  $('#n-method').innerHTML=`Estimate method: sale price minus the amounts you entered. ${v.state==='NC'?`NC excise tax is calculated at one dollar for each $500 of sale price or fractional part, per <a href="${NC_STATUTE}" target="_blank" rel="noopener">N.C. Gen. Stat. § 105-228.30</a>; it's typically paid by the seller unless the contract says otherwise.`:'South Carolina has no NC excise tax; it charges a deed recording fee instead. Get that amount from your closing attorney and enter it under Other costs.'} This doesn't include prorated taxes or HOA dues unless you add them. ${v.comm?'':'Enter a commission rate to include it.'}`;
  save({calc:Object.assign({state:v.state},Object.fromEntries(NUM.map(k=>[k,f.elements[k].value])))});
}
function initCalc(){
  const f=$('#sl-calc'); const c=st.calc||{};
  NUM.forEach(k=>{if(c[k]!=null&&c[k]!=='') f.elements[k].value=c[k];}); if(c.state) f.elements.state.value=c.state;
  f.addEventListener('input',calc); f.addEventListener('change',calc); f.addEventListener('submit',e=>e.preventDefault());
  let tracked=false; f.addEventListener('change',()=>{if(!tracked){tracked=true; SC.track('seller_net_estimate',{});}});
  calc();
}

/* ---------- Prep checklist ---------- */
const PREP=[['Before you list',[['Request a CMA and agree on a price range','A licensed agent prepares it from closed sales.'],['Gather documents','Deed, survey, HOA documents, warranties, utility costs, permits for past work.'],['Request a mortgage payoff statement','Include any home equity line.'],['Consider a pre-listing inspection','Find issues before a buyer does.'],['Get repair quotes','Fix safety items, leaks and anything a lender may flag.']]],
  ['Make it show well',[['Declutter and depersonalize','Pack what you won\'t need for two months.'],['Deep clean, including windows and carpets'],['Touch up paint and replace burned-out bulbs'],['Refresh curb appeal','Mulch, trim, clean the entry and house number.'],['Plan for pets and showings','Where they go and how you\'ll get notice.']]],
  ['Disclosures and legal',[['Complete required seller disclosures','NC: Residential Property and Owners\' Association Disclosure Statement and Mineral, Oil and Gas Rights Disclosure. Your agent provides current forms.'],['Lead-based paint disclosure if built before 1978','Required by federal law.'],['Choose a closing attorney','In NC and SC, an attorney handles the closing.']]],
  ['Launch week',[['Professional photos, video and floor plan'],['Review the MLS listing for accuracy'],['Set up showing instructions and lockbox'],['Secure valuables and prescriptions']]]];
function initPrep(){
  $('#sl-prep').innerHTML=PREP.map(([h,list])=>`<div><h4 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#5A3D2B">${esc(h)}</h4><ul class="ll-check">${list.map(([t,s])=>{const id='p-'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40); return `<li><label><input type="checkbox" data-c="${id}" ${st.checked[id]?'checked':''}><span>${esc(t)}${s?`<small>${esc(s)}</small>`:''}</span></label></li>`;}).join('')}</ul></div>`).join('');
  $$('#sl-prep [data-c]').forEach(c=>c.addEventListener('change',()=>{st.checked[c.dataset.c]=c.checked; save({checked:st.checked}); SC.track('seller_checklist',{item:c.dataset.c,done:c.checked});}));
}

/* ---------- Timeline ---------- */
const STEPS=[[-42,'Consultation and CMA','Agree on price range, prep plan and marketing.'],[-35,'Pre-listing inspection (optional)','Leaves time to fix what it finds.'],[-28,'Repairs and contractor work','Book trades early; schedules fill up.'],[-21,'Declutter, pack and stage','Start with closets, garage and counters.'],[-14,'Deep clean and curb appeal'],[-7,'Photos, video and floor plan','Shoot after staging, in good weather.'],[-3,'Final listing review','Check the MLS draft, disclosures and showing instructions.'],[0,'Listing goes live','Showings begin.']];
let P=null, AREAS=[];
/* Only use figures from the last 3 published months so timing and KPIs aren't stale */
const recent=c=>{if(!c||!P) return null; const all=Object.keys(P.series.region||{}).sort(); const last=all[all.length-1]; if(!last) return c; const [y,m]=last.split('-').map(Number); const [cy,cm]=c.month.split('-').map(Number); return (y*12+m)-(cy*12+cm)<=2?c:null;};
const addDays=(d,n)=>{const x=new Date(d.getTime()); x.setDate(x.getDate()+n); return x;};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const nice=d=>d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
let tlItems=[];
function renderTL(){
  const val=$('#sl-date').value; if(!val){$('#sl-tl').innerHTML=''; return;}
  const d0=new Date(val+'T12:00:00'); const today=new Date(); today.setHours(0,0,0,0);
  const area=AREAS.find(a=>a.slug===$('#sl-tl-area').value);
  let dom=null, ltc=null, pa=null;
  if(P&&area){pa=ll.pulseAreaFor(area,P); dom=recent(ll.latest(P,pa.id,'dom')); ltc=recent(ll.latest(P,pa.id,'list_to_close_days'));}
  tlItems=STEPS.map(([n,t,s])=>({d:addDays(d0,n),t,s}));
  if(dom) tlItems.push({d:addDays(d0,Math.round(dom.value)),t:'Typical offer accepted',s:`${ll.areaName(P,pa.id)} reported ${Math.round(dom.value)} days on market (listing to accepted offer) in ${ll.ymLong(dom.month)} (Canopy). Your home may differ.`});
  if(ltc) tlItems.push({d:addDays(d0,Math.round(ltc.value)),t:'Typical closing',s:`${ll.areaName(P,pa.id)} reported ${Math.round(ltc.value)} days from list to close in ${ll.ymLong(ltc.month)} (Canopy). Your home may differ.`});
  if(!ltc) tlItems.push({d:addDays(d0,0),t:'Closing date: ask your agent',s:'Canopy hasn\'t published recent list-to-close timing for this market, so we don\'t show a date.',nodate:true});
  $('#sl-tl').innerHTML=tlItems.map(i=>`<li class="${i.d<today&&!i.nodate?'past':''}"><b>${i.nodate?'To be set':esc(nice(i.d))}</b><span>${esc(i.t)}${i.s?`<small>${esc(i.s)}</small>`:''}${i.d<today&&!i.nodate?'<small>This date has passed. Pick a later list date or compress this step.</small>':''}</span></li>`).join('');
  const srcs=[dom,ltc].filter(Boolean).map(x=>x.source).filter((s,i,a)=>s&&a.indexOf(s)===i);
  $('#sl-tl-note').innerHTML=`Prep steps are typical lead times, not requirements. ${srcs.length?'After-listing dates use the latest published Canopy figures: '+srcs.map(s=>ll.srcLink(s)).join(', ')+'.':''}`;
  save({listDate:val,area:$('#sl-tl-area').value});
}
function ics(){
  if(!tlItems.length) return SC.toast&&SC.toast('Pick a target list date first');
  const d=x=>iso(x).replace(/-/g,''); const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ev=tlItems.filter(i=>!i.nodate).map((i,k)=>['BEGIN:VEVENT','UID:sc-seller-'+k+'-'+d(i.d)+'@searchcharlotte.com','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d(i.d),'DTEND;VALUE=DATE:'+d(addDays(i.d,1)),'SUMMARY:'+i.t.replace(/[,;]/g,' '),'DESCRIPTION:'+(i.s||'').replace(/[,;\n]/g,' '),'END:VEVENT'].join('\r\n'));
  const blob=new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SearchCharlotte//Seller Timeline//EN\r\n'+ev.join('\r\n')+'\r\nEND:VCALENDAR'],{type:'text/calendar'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='listing-timeline.ics'; document.body.appendChild(a); a.click(); a.remove(); SC.track('seller_timeline_ics',{});
}

/* ---------- Comparables (sample) ---------- */
function renderComps(){
  const area=AREAS.find(a=>a.slug===$('#sl-comp-area').value); if(!area) return;
  const beds=parseInt($('#sl-beds').value)||null;
  let L=(SC.D&&SC.D.listings||[]).map(l=>({l,mi:SC.miles([area.lat,area.lng],[l.lat,l.lng])}));
  L.sort((a,b)=>(beds?Math.abs(a.l.beds-beds)*0.6:0)+a.mi-((beds?Math.abs(b.l.beds-beds)*0.6:0)+b.mi));
  L=L.slice(0,6).sort((a,b)=>a.mi-b.mi);
  $('#sl-comps tbody').innerHTML=L.map(({l,mi})=>`<tr><td><a href="listing.html?id=${encodeURIComponent(l.id)}">${esc(l.address)}</a><br><small class="form-note">${esc(l.hoodName||'')} · Sample</small></td><td>${esc(l.status)}</td><td>${SC.fmt(l.price)}</td><td>${l.beds}</td><td>${l.baths}</td><td>${l.sqft.toLocaleString('en-US')}</td><td>${l.sqft?'$'+Math.round(l.price/l.sqft):'N/A'}</td><td>${l.year||'N/A'}</td><td>${mi.toFixed(1)} mi</td></tr>`).join('');
  $('#sl-comps-note').textContent=`Sample listings nearest the center of ${area.name}${beds?`, favoring ${beds}-bedroom homes`:''}. A real CMA uses closed sales from the last 3–6 months, adjusted by an agent. Don't use these numbers to price your home.`;
}

/* ---------- Trends ---------- */
const KPIS=['median_sale_price','closed_sales','new_listings','inventory','months_supply','dom','pct_orig_list_price','list_to_close_days'];
function renderTrends(){
  if(!P) return; const area=AREAS.find(a=>a.slug===$('#sl-area').value); if(!area) return;
  const pa=ll.pulseAreaFor(area,P); const name=ll.areaName(P,pa.id);
  $('#sl-trend-h').textContent=`${name}: market right now`;
  const vals=KPIS.map(k=>({k,c:recent(ll.latest(P,pa.id,k))}));
  const month=vals.map(v=>v.c&&v.c.month).filter(Boolean).sort().pop();
  $('#sl-trend-sub').textContent=`Latest published Canopy Realtor® Association figures for ${name}${pa.id!==area.slug&&area.name!==name?` (the market ${area.name} belongs to; Canopy doesn't publish this neighborhood alone)`:''}.`;
  $('#sl-kpis').innerHTML=vals.map(({k,c})=>`<div class="ll-kpi" style="cursor:default"><span class="ll-kpi-l">${esc(P.metrics[k].label)}</span>${c?`<b>${esc(ll.val(c.value,P.metrics[k].unit))}</b><span class="form-note" style="font-size:11.5px">${c.yoy!=null?(c.yoy>0?'+':'')+(+c.yoy).toFixed(1)+'% YoY · ':''}${esc(ll.ym(c.month))}</span>`:'<b class="na">Not published</b><span class="form-note" style="font-size:11.5px">in the last 3 months</span>'}</div>`).join('');
  const srcs=vals.map(v=>v.c&&v.c.source).filter((s,i,a)=>s&&a.indexOf(s)===i).slice(0,3);
  $('#sl-trend-src').innerHTML=`Source: ${srcs.map(s=>ll.srcLink(s)).join(', ')||'Canopy Realtor® Association'}${month?`, latest month ${esc(ll.ymLong(month))}`:''}. YoY shown only where Canopy published it. <a href="pulse.html?area=${encodeURIComponent(pa.id)}">Open Market Pulse</a> for charts and history.`;
}

/* ---------- Init ---------- */
async function init(){
  initCalc(); initPrep();
  const d=$('#sl-date'); const def=addDays(new Date(),56); d.min=iso(new Date()); d.value=st.listDate||iso(def);
  d.addEventListener('change',()=>{renderTL(); SC.track('seller_timeline',{date:d.value});});
  $('#sl-ics').addEventListener('click',ics);
  try{
    const [areas,pulse]=await Promise.all([ll.areas(),ll.pulse()]); P=pulse;
    AREAS=areas.slice().sort((a,b)=>a.name.localeCompare(b.name));
    const opts=AREAS.map(a=>`<option value="${esc(a.slug)}">${esc(a.name)}${a.kind==='city'?' (town)':''}</option>`).join('');
    const q=new URLSearchParams(location.search).get('area');
    const pick=AREAS.find(a=>a.slug===q)?q:(AREAS.find(a=>a.slug===st.area)?st.area:'dilworth');
    ['#sl-area','#sl-comp-area','#sl-tl-area'].forEach(s=>{$(s).innerHTML=opts; $(s).value=pick;});
    const syncState=slug=>{const a=AREAS.find(x=>x.slug===slug); const stt=a&&a.state; if(stt==='SC'||stt==='NC'){$('#n-state').value=stt; calc();}};
    if(!(st.calc&&st.calc.price)||q) syncState(pick);
    $('#sl-area').addEventListener('change',e=>{syncState(e.target.value); $('#sl-comp-area').value=$('#sl-tl-area').value=e.target.value; save({area:e.target.value}); renderTrends(); renderComps(); renderTL();});
    $('#sl-comp-area').addEventListener('change',()=>{renderComps(); SC.track('seller_comps_area',{area:$('#sl-comp-area').value});});
    $('#sl-tl-area').addEventListener('change',renderTL);
    $('#sl-beds').addEventListener('change',renderComps);
    renderTrends(); renderComps();
  }catch(e){ $('#sl-trend-src').textContent='Market data could not load. Try again later or open Market Pulse.'; }
  renderTL();
  $$('form[data-lead]').forEach(f=>f.addEventListener('submit',()=>SC.track('seller_form',{type:f.dataset.lead})));
}
init();
})();

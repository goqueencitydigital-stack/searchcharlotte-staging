/* Investor Mode — rental property estimates.
   All math is deterministic and shown on the page. Reference defaults come from
   assets/data/cost-assumptions.json (verified, with source URLs). Rent and operating
   percentages are user assumptions; nothing here is a rent estimate or appraisal. */
(function(){'use strict';
const SC=window.SC, {D,$,esc,fmt,track}=SC;
const form=$('#iv-form'); if(!form) return;
const out=$('#iv-out'), sel=$('#iv-listing');
const money=n=>(n<0?'−':'')+'$'+Math.round(Math.abs(n)).toLocaleString();
const pct=(n,d=1)=>isFinite(n)?n.toFixed(d)+'%':'—';
const homes=D.listings.filter(l=>l.type!=='Land'&&l.beds);
sel.insertAdjacentHTML('beforeend',homes.map(l=>`<option value="${l.id}">${esc(l.address)}, ${esc(l.city)} · ${fmt(l.price)} · ${l.beds} bd</option>`).join(''));

let A=null, cur=null, home=null;
const KEYS=['price','down','rate','term','closing','rehab','rent','otherInc','vacancy','taxRate','ins','hoa','maint','mgmt','capex','otherExp','rentGrowth','expGrowth','appr'];
/* Placeholders that are NOT sourced data — labeled as such in the UI. */
const ASSUME={vacancy:5,mgmt:8,capex:5,otherExp:0,otherInc:0,rehab:0,rentGrowth:3,expGrowth:3,appr:3,down:25};
const fmr=beds=>{const b=A&&A.rent&&A.rent.byBeds; if(!b) return null; const k=Math.min(Math.max(beds|0,0),4); return {k,v:b[k]};};
const jurFor=l=>SC.intel?SC.intel.jur(l||{city:'Charlotte'},A):{label:'Mecklenburg County + City of Charlotte (FY2027)',per100:0.7857,sources:[]};

function defaults(l){
  const f=fmr(l?l.beds:3); const j=jurFor(l);
  return {price:l?l.price:400000, down:ASSUME.down, rate:A?A.rate.value:7.32, term:30, closing:A?A.closing.value:3, rehab:ASSUME.rehab,
    rent:f?f.v:0, otherInc:ASSUME.otherInc, vacancy:ASSUME.vacancy, taxRate:j.per100, ins:A?A.insurance.value:3025, hoa:l?(l.hoa||0):0,
    maint:A?A.maintenance.value:1, mgmt:ASSUME.mgmt, capex:ASSUME.capex, otherExp:ASSUME.otherExp,
    rentGrowth:ASSUME.rentGrowth, expGrowth:ASSUME.expGrowth, appr:ASSUME.appr};
}
const pmt=(P,r,n)=>{if(P<=0) return 0; const i=r/1200; return i?P*i/(1-Math.pow(1+i,-n)):P/n;};
const bal=(P,r,n,k)=>{if(P<=0) return 0; const i=r/1200; if(!i) return Math.max(0,P-P/n*k); const m=pmt(P,r,n); return P*Math.pow(1+i,k)-m*(Math.pow(1+i,k)-1)/i;};

/* Core model. Exposed as SC.invest.calc for reuse (e.g. listing page, Passport). */
function calc(s){
  const loan=s.price*(1-s.down/100), n=s.term*12, mo=pmt(loan,s.rate,n), ds=mo*12;
  const year=y=>{const g=Math.pow(1+s.rentGrowth/100,y-1), e=Math.pow(1+s.expGrowth/100,y-1), v=s.price*Math.pow(1+s.appr/100,y-1);
    const gpr=(s.rent+s.otherInc)*12*g, egi=gpr*(1-s.vacancy/100);
    const tax=s.price*s.taxRate/100*e, ins=s.ins*e, hoa=s.hoa*12*e, maint=v*s.maint/100, mgmt=egi*s.mgmt/100, capex=s.rent*12*g*s.capex/100, other=s.otherExp*12*e;
    const opex=tax+ins+hoa+maint+mgmt+capex+other, noi=egi-opex, cf=noi-ds;
    return {y,gpr,egi,tax,ins,hoa,maint,mgmt,capex,other,opex,noi,ds,cf,value:s.price*Math.pow(1+s.appr/100,y),balance:bal(loan,s.rate,n,Math.min(12*y,n))};};
  const y1=year(1), cash=s.price*s.down/100+s.price*s.closing/100+s.rehab;
  const proj=[1,2,3,4,5].map(year); let cum=0; proj.forEach(p=>{cum+=p.cf; p.cum=cum; p.equity=p.value-p.balance;});
  /* Break-even rent: rent where year-1 cash flow = 0 (rent-linked items scale with rent). */
  const k=12*((1-s.vacancy/100)*(1-s.mgmt/100)-s.capex/100);
  const fixed=y1.tax+y1.ins+y1.hoa+y1.maint+y1.other+ds-s.otherInc*12*(1-s.vacancy/100)*(1-s.mgmt/100);
  const be=k>0?fixed/k:NaN;
  return {loan,mo,ds,cash,y1,proj,cap:s.price?y1.noi/s.price*100:NaN,coc:cash?y1.cf/cash*100:NaN,dscr:ds?y1.noi/ds:Infinity,breakEven:be};
}

const read=()=>{const s={}; KEYS.forEach(k=>{const el=form.querySelector(`[data-k="${k}"]`); const v=parseFloat(el.value); s[k]=isFinite(v)?v:0;}); return s;};
const write=s=>KEYS.forEach(k=>{const el=form.querySelector(`[data-k="${k}"]`); if(el) el.value=s[k];});

function refs(){
  const f=fmr(home?home.beds:3); const R=A&&A.rent; const j=jurFor(home);
  $('#iv-ref-loan').innerHTML=A?`Rate default: ${esc(A.rate.label)} (${A.rate.value}%) — <a href="${A.rate.url}" target="_blank" rel="noopener">Freddie Mac PMMS</a>, retrieved ${A.rate.retrieved}, updated weekly. Investment-property loans usually price higher than owner-occupied rates; use your lender's quote. Closing default ${A.closing.value}% (typical NC range ${A.closing.low}–${A.closing.high}%, <a href="${A.closing.url}" target="_blank" rel="noopener">Churchill Mortgage</a>).`:'';
  const tbl=R?`<table class="iv-fmr"><caption>HUD FY2026 Fair Market Rent, ${esc(R.area.split(' (')[0])}</caption><tr>${['Studio','1 BR','2 BR','3 BR','4 BR'].map((t,i)=>`<th scope="col"${f&&f.k===i?' class="on"':''}>${t}</th>`).join('')}</tr><tr>${[0,1,2,3,4].map(i=>`<td${f&&f.k===i?' class="on"':''}>$${R.byBeds[i].toLocaleString()}</td>`).join('')}</tr></table>`:'';
  $('#iv-ref-rent').innerHTML=`${tbl}<p>Reference only. Fair Market Rents are 40th-percentile gross rents (rent plus utilities) that HUD publishes annually for housing programs — they are not a market-rent estimate for this home. The rent field starts at the FMR for ${f?(f.k?f.k+' bedrooms':'a studio'):'the bedroom count'}${home&&home.beds>4?' (homes with 5+ bedrooms use the 4 BR figure here)':''}; replace it with a rent you have verified from leased comparables or a local property manager. Source: <a href="${R?R.url:'#'}" target="_blank" rel="noopener">HUD User FY2026 FMR schedule</a>, retrieved ${R?R.retrieved:''}, updated each fiscal year. Live rental comps from Canopy MLS leased data are planned for launch.</p>`;
  $('#iv-ref-exp').innerHTML=A?`Tax default: ${esc(j.label)}, ${j.per100} per $100 — applied to the price as a stand-in for assessed value; special district and fire fees not included. Insurance default: NC average homeowners premium (${money(A.insurance.value)}/yr, <a href="${A.insurance.url}" target="_blank" rel="noopener">NerdWallet</a>); a landlord (dwelling fire) policy is priced differently — get a quote. Maintenance default ${A.maintenance.value}% of value per year (low end of the 1–4% range from <a href="${A.maintenance.url}" target="_blank" rel="noopener">Fannie Mae</a>). Vacancy ${ASSUME.vacancy}%, management ${ASSUME.mgmt}% and reserves ${ASSUME.capex}% are placeholders, not sourced figures — set your own. All references retrieved ${A.retrieved}.`:'';
}

const kpi=(t,v,note,tone)=>`<div class="iv-kpi${tone?' '+tone:''}"><span>${t}</span><b>${v}</b>${note?`<small>${note}</small>`:''}</div>`;
function render(){
  cur=read(); const r=calc(cur), y=r.y1; refs();
  const cfTone=y.cf>=0?'pos':'neg', dsTone=!isFinite(r.dscr)?'':r.dscr>=1?'pos':'neg';
  const rows=[['Property tax',y.tax],['Insurance',y.ins],['HOA',y.hoa],['Maintenance',y.maint],['Management',y.mgmt],['Capital reserves',y.capex],['Other expenses',y.other]].filter(x=>x[1]>0);
  $('#iv-mini').innerHTML=`<span>Estimate</span><b class="${cfTone}">${money(y.cf/12)}/mo</b><span>Cap ${pct(r.cap,1)} · CoC ${pct(r.coc,1)} · DSCR ${isFinite(r.dscr)?r.dscr.toFixed(2):'—'}</span>`;
  out.innerHTML=`<div class="iv-card">
    <p class="iv-label">Estimate · Year 1${home?` · <a href="listing.html?id=${home.id}">${esc(home.address)}</a>`:''}</p>
    <div class="iv-kpis">${kpi('Monthly cash flow',money(y.cf/12),money(y.cf)+' per year',cfTone)}${kpi('Cap rate',pct(r.cap,2),'NOI ÷ price')}${kpi('Cash-on-cash',pct(r.coc,1),'Cash flow ÷ '+money(r.cash)+' invested')}${kpi('DSCR',isFinite(r.dscr)?r.dscr.toFixed(2):'No loan','NOI ÷ debt service',dsTone)}</div>
    <table class="iv-tbl"><tbody>
      <tr><th scope="row">Gross scheduled income</th><td>${money(y.gpr)}</td></tr>
      <tr><th scope="row">Vacancy &amp; credit loss (${cur.vacancy}%)</th><td>${money(-(y.gpr-y.egi))}</td></tr>
      <tr class="sub"><th scope="row">Effective gross income</th><td>${money(y.egi)}</td></tr>
      ${rows.map(([t,v])=>`<tr><th scope="row">${t}</th><td>${money(-v)}</td></tr>`).join('')}
      <tr class="sub"><th scope="row">Net operating income</th><td>${money(y.noi)}</td></tr>
      <tr><th scope="row">Debt service (${money(r.mo)}/mo P&amp;I on ${money(r.loan)})</th><td>${money(-r.ds)}</td></tr>
      <tr class="tot ${cfTone}"><th scope="row">Annual cash flow</th><td>${money(y.cf)}</td></tr>
    </tbody></table>
    <p class="iv-be">Break-even rent at these assumptions: <b>${isFinite(r.breakEven)&&r.breakEven>0?money(r.breakEven)+'/mo':'—'}</b>. Cash invested: ${money(cur.price*cur.down/100)} down + ${money(cur.price*cur.closing/100)} closing${cur.rehab?` + ${money(cur.rehab)} repairs`:''}.</p>
  </div>
  <div class="iv-card">
    <h2 class="iv-h3">5-year projection <small>estimate based on your growth assumptions</small></h2>
    <div class="iv-scroll" tabindex="0" role="region" aria-label="5-year projection table"><table class="iv-proj"><thead><tr><th scope="col">Year</th><th scope="col">NOI</th><th scope="col">Cash flow</th><th scope="col">Cumulative</th><th scope="col">Value</th><th scope="col">Loan balance</th><th scope="col">Equity</th></tr></thead>
    <tbody>${r.proj.map(p=>`<tr><th scope="row">${p.y}</th><td>${money(p.noi)}</td><td class="${p.cf>=0?'pos':'neg'}">${money(p.cf)}</td><td>${money(p.cum)}</td><td>${money(p.value)}</td><td>${money(p.balance)}</td><td>${money(p.equity)}</td></tr>`).join('')}</tbody></table></div>
    <p class="form-note">Value and equity are end-of-year figures from your value-change assumption; they exclude selling costs, income taxes and depreciation. Not a forecast or appraisal.</p>
  </div>
  <p class="iv-flag">Estimate — not investment, tax, legal or lending advice. Verify rent, taxes, insurance and loan terms before you buy.</p>`;
}

/* ---------- Scenarios (SC.db 'sc_investor') ---------- */
const scen=()=>SC.db.get('sc_investor',[]);
function renderScen(){
  const list=scen(), box=$('#iv-scen');
  if(!list.length){box.innerHTML='<p class="iv-none">No saved scenarios yet. Save the current inputs to start comparing.</p>'; return;}
  const res=list.map(s=>({s,r:calc(s.inputs)}));
  const metrics=[['Purchase price',x=>x.s.inputs.price,'money'],['Down payment',x=>x.s.inputs.down,'pct0'],['Rate',x=>x.s.inputs.rate,'pct2'],['Monthly rent',x=>x.s.inputs.rent,'money'],['Cash invested',x=>x.r.cash,'money',-1],['NOI (yr 1)',x=>x.r.y1.noi,'money',1],['Monthly cash flow',x=>x.r.y1.cf/12,'money',1],['Cap rate',x=>x.r.cap,'pct2',1],['Cash-on-cash',x=>x.r.coc,'pct1',1],['DSCR',x=>isFinite(x.r.dscr)?x.r.dscr:99,'dscr',1],['5-yr cumulative cash flow',x=>x.r.proj[4].cum,'money',1],['Equity after 5 yrs',x=>x.r.proj[4].equity,'money',1]];
  const f=(v,t)=>t==='money'?money(v):t==='pct0'?pct(v,0):t==='pct2'?pct(v,2):t==='pct1'?pct(v,1):v>=99?'No loan':v.toFixed(2);
  box.innerHTML=`<div class="iv-scroll" tabindex="0" role="region" aria-label="Scenario comparison"><table class="iv-cmp"><thead><tr><th scope="col">Estimate</th>${res.map(x=>`<th scope="col"><b>${esc(x.s.name)}</b><small>${x.s.listingId?esc((D.listings.find(l=>l.id===x.s.listingId)||{}).address||''):'Custom inputs'}</small><span class="iv-cmp-a"><button type="button" class="xr-link" data-load="${x.s.id}">Load</button><button type="button" class="xr-link" data-del="${x.s.id}">Delete</button></span></th>`).join('')}</tr></thead><tbody>
  ${metrics.map(([t,g,ty,dir])=>{const vals=res.map(g); const best=dir&&res.length>1?(dir>0?Math.max(...vals):Math.min(...vals)):null; return `<tr><th scope="row">${t}</th>${vals.map(v=>`<td${best!==null&&v===best&&vals.filter(z=>z===best).length<vals.length?' class="best"':''}>${f(v,ty)}${best!==null&&v===best&&vals.filter(z=>z===best).length<vals.length?' <span class="iv-best">Best</span>':''}</td>`).join('')}</tr>`;}).join('')}
  </tbody></table></div><p class="form-note">"Best" marks the most favorable value in each row under each scenario's own assumptions. All figures are estimates.</p>`;
}
$('#iv-save').addEventListener('submit',()=>{const list=scen(); if(list.length>=3){SC.toast&&SC.toast('You can compare up to 3 scenarios. Delete one to save another.'); return;}
  const name=($('#iv-sname').value.trim()||`Scenario ${list.length+1}`).slice(0,40);
  SC.db.set('sc_investor',[...list,{id:'iv_'+Date.now(),name,listingId:home?home.id:null,inputs:read(),created:new Date().toISOString()}]);
  $('#iv-sname').value=''; renderScen(); SC.toast&&SC.toast('Scenario saved'); track&&track('investor_scenario_save',{listing_id:home?home.id:null});});
$('#iv-scen').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.del){SC.db.set('sc_investor',scen().filter(s=>s.id!==b.dataset.del)); renderScen();}
  if(b.dataset.load){const s=scen().find(x=>x.id===b.dataset.load); if(!s) return; home=s.listingId?D.listings.find(l=>l.id===s.listingId)||null:null; sel.value=home?home.id:''; write(s.inputs); render(); sources(); form.scrollIntoView({behavior:'smooth',block:'start'});}});

function pickHome(id,keep){home=id?homes.find(l=>l.id===id)||null:null; sel.value=home?home.id:'';
  if(!keep) write(defaults(home)); render(); sources();
  const u=new URL(location.href); if(home) u.searchParams.set('id',home.id); else u.searchParams.delete('id'); history.replaceState(null,'',u);}
sel.addEventListener('change',()=>{pickHome(sel.value); track&&track('investor_prefill',{listing_id:sel.value||null});});
form.addEventListener('input',e=>{if(e.target.dataset.k) render();});
form.addEventListener('change',e=>{if(e.target.dataset.k==='term') render();});
$('#iv-reset').addEventListener('click',()=>{write(defaults(home)); render();});

function sources(){if(!A) return; const j=jurFor(home);
  const items=[[A.rate.source,A.rate.url,'weekly'],[A.rent.source,A.rent.url,'annually (federal fiscal year)'],...j.sources.map(s=>[s.name,s.url,'annually (fiscal-year budget)']),[A.insurance.source,A.insurance.url,'periodically'],[A.closing.source,A.closing.url,'periodically'],[A.maintenance.source,A.maintenance.url,'periodically']];
  $('#iv-sources').innerHTML=`<h3 class="iv-h3">Reference data sources</h3><ul>${items.map(([n,u,p])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a><small>Retrieved ${A.retrieved} · updated ${p}</small></li>`).join('')}</ul><p class="form-note">Sample listings are demo data — live MLS data via Showcase IDX at launch. Investor Mode never uses demographic or protected-class information.</p>`;}

SC.costAssumptions.then(a=>{A=a; const id=new URLSearchParams(location.search).get('id'); pickHome(id&&homes.some(l=>l.id===id)?id:''); renderScen();});
SC.invest={calc,defaults};
})();

/* Search Charlotte — property intelligence shared helpers + True Cost to Own.
   SC.intel.jur(listing, A)          -> tax jurisdiction {label, per100, sources}
   SC.intel.costParams(listing, A)   -> parameters for SC.trueCost from saved cost prefs + verified defaults
   SC.intel.donut(parts, size)       -> SVG donut markup, parts [{v,c,label}]
   SC.intel.femaLayer(opts)          -> Leaflet tile layer rendering FEMA NFHL flood hazard zones (layer 28) via ArcGIS export
   SC.intel.femaZone(lat,lng)        -> Promise {zone, subtype, sfha} from FEMA NFHL point query (or null)
   SC.costUI.mount(el, listing)      -> full True Cost to Own module (sliders, donut, cash to close, compare costs)
   Cost prefs persist in SC.db 'sc_costprefs' so Compare Homes and other pages reuse the same assumptions. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC;
const money=n=>fmt(Math.round(n||0));
const CK='sc_costprefs';
const jur=(l,A)=>{const t=A&&A.tax&&A.tax.byCity[l.city]; return t||{label:'Mecklenburg County + City of Charlotte (FY2027)',per100:0.7857,sources:[]};};
const cp=()=>SC.db.get(CK,{});
const setCp=p=>SC.db.set(CK,Object.assign(cp(),p));
function commuteDest(){const c=cp(); if(c.commuteId==='none') return null; if(c.commuteId){const x=SC.lmk(c.commuteId); if(x) return x;} const p=SC.prefs().commute; if(p&&p.lat) return {id:p.id||'pref',name:p.label,lat:p.lat,lng:p.lng}; return SC.lmk('uptown');}
function costParams(l,A){const c=cp(), j=jur(l,A); const dest=commuteDest(); const mi=A?A.mileage.value:0.76; const wd=c.workdays??(A?A.workdays.value:21);
  const d=dest?SC.drive([l.lat,l.lng],[dest.lat,dest.lng]):null;
  const taxRate=(c.taxRates&&c.taxRates[l.city]!=null)?c.taxRates[l.city]:j.per100; /* per $100 == % of value */
  return {downPct:c.downPct??20,rate:c.rate??(A?A.rate.value:7.32),years:c.years??30,taxRate,insYr:c.insYr??(A?A.insurance.value:3025),pmiRate:c.pmiRate??(A?A.pmi.value:0.8),
    maintPct:c.maintPct??(A?A.maintenance.value:1),utilMo:c.utilMo??0,closingPct:c.closingPct??(A?A.closing.value:3),
    commuteMo:d?d.miles*2*wd*mi:0,_dest:dest,_drive:d,_workdays:wd,_mileage:mi,_jur:j};}
const donut=(parts,size=180)=>{const tot=parts.reduce((s,p)=>s+Math.max(0,p.v),0)||1; const r=size/2-14, C=2*Math.PI*r; let off=0;
  return `<svg class="ix-donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(parts.filter(p=>p.v>0).map(p=>p.label+' '+Math.round(p.v/tot*100)+'%').join(', '))}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#EFE8DF" stroke-width="22"/>${parts.filter(p=>p.v>0).map(p=>{const len=p.v/tot*C; const s=`<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${Math.max(0,len-1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size/2} ${size/2})"/>`; off+=len; return s;}).join('')}</svg>`;};
const COLORS={pi:'#1E140D',tax:'#C99A4B',ins:'#5A3D2B',pmi:'#8C6A9A',hoa:'#A8A29A',maint:'#163B35',util:'#7FA39A',commute:'#4A2445'};
const LABELS={pi:'Principal & interest',tax:'Property tax',ins:'Homeowners insurance',pmi:'PMI',hoa:'HOA dues',maint:'Maintenance reserve',util:'Utilities',commute:'Commute (driving cost)'};
const srcLine=(s)=>s?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source||s.name)}</a>, retrieved ${esc(s.retrieved)}`:'';

/* ---------- FEMA NFHL ---------- */
const NFHL='https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';
const fsym=c=>({type:'esriSFS',style:'esriSFSSolid',color:c,outline:{type:'esriSLS',style:'esriSLSSolid',color:[c[0],c[1],c[2],230],width:0.7}});
const FEMA_DL=encodeURIComponent(JSON.stringify([
  {id:201,source:{type:'mapLayer',mapLayerId:28},definitionExpression:"ZONE_SUBTY = 'FLOODWAY'",drawingInfo:{showLabels:false,transparency:0,renderer:{type:'simple',symbol:fsym([200,60,60,255])}}},
  {id:202,source:{type:'mapLayer',mapLayerId:28},definitionExpression:"SFHA_TF = 'T'",drawingInfo:{showLabels:false,transparency:0,renderer:{type:'simple',symbol:fsym([30,110,200,255])}}},
  {id:203,source:{type:'mapLayer',mapLayerId:28},definitionExpression:"ZONE_SUBTY LIKE '0.2 PCT%'",drawingInfo:{showLabels:false,transparency:0,renderer:{type:'simple',symbol:fsym([240,150,40,255])}}}]));
function femaLayer(opts={}){const L=window.L; const R=6378137, O=Math.PI*R;
  const Layer=L.TileLayer.extend({getTileUrl(c){const n=Math.pow(2,c.z), s=2*O/n; const x0=-O+c.x*s, y1=O-c.y*s, x1=x0+s, y0=y1-s;
    return `${NFHL}/export?bbox=${x0},${y0},${x1},${y1}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&dpi=96&f=image&dynamicLayers=${FEMA_DL}`;}});
  return new Layer('',Object.assign({opacity:.5,minZoom:11,maxZoom:19,attribution:'Flood hazard zones: <a href="https://hazards.fema.gov/femaportal/wps/portal/NFHLWMS" target="_blank" rel="noopener">FEMA National Flood Hazard Layer</a>',crossOrigin:true},opts));}
async function femaZone(lat,lng){try{const u=`${NFHL}/28/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID&returnGeometry=false&f=json`;
  const r=await fetch(u); if(!r.ok) return null; const j=await r.json(); const f=j.features&&j.features[0]; if(!f) return {zone:null}; const a=f.attributes; return {zone:a.FLD_ZONE,subtype:a.ZONE_SUBTY,sfha:a.SFHA_TF==='T',panel:a.DFIRM_ID};}catch(e){return null;}}

/* ---------- True Cost to Own UI ---------- */
async function mount(el,l){
  el.innerHTML='<p class="form-note">Loading cost assumptions…</p>';
  const A=await SC.costAssumptions; if(!A){el.innerHTML='<p class="form-note">Cost assumptions could not be loaded.</p>'; return;}
  const uid='tc'+Math.random().toString(36).slice(2,7);
  const sl=(k,label,min,max,step,val,unit,note)=>`<div class="ix-sl"><div class="ix-sl-h"><label for="${uid}-${k}">${label}</label><output id="${uid}-${k}-o" for="${uid}-${k}"></output></div><input type="range" id="${uid}-${k}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}">${note?`<small>${note}</small>`:''}</div>`;
  const outHtml=(p,r)=>{const parts=['pi','tax','ins','pmi','hoa','maint','util','commute'].map(k=>({k,v:r[k],c:COLORS[k],label:LABELS[k]})); return `      <p class="eyebrow">Estimated monthly cost to own</p>
      <p class="ix-total" aria-live="polite">${money(r.total)}<span>/mo</span></p>
      <p class="ix-flag">Estimate — not a lender quote or Loan Estimate</p>
      <div class="ix-donut-row">${donut(parts,170)}<ul class="ix-legend">${parts.map(x=>`<li class="${x.v>0?'':'is-zero'}"><i style="background:${x.c}"></i>${x.label}<b>${money(x.v)}</b></li>`).join('')}</ul></div>
      <div class="ix-cash"><div><span>Down payment</span><b>${money(r.down)}</b></div><div><span>Est. closing costs (${p.closingPct}%)</span><b>${money(r.closing)}</b></div><div class="tot"><span>Est. cash to close</span><b>${money(r.cashToClose)}</b></div><div><span>Loan amount</span><b>${money(r.loan)}</b></div><div><span>First-month principal / interest</span><b>${money(r.principal)} / ${money(r.interest)}</b></div></div>
      ${p._dest?`<p class="form-note">Commute: about ${p._drive.miles} mi each way to ${esc(p._dest.name)} (estimate) × 2 × ${p._workdays} days × ${Math.round(p._mileage*1000)/10}¢/mi IRS rate as a full driving-cost proxy.</p>`:''}`;};
  const draw=()=>{const p=costParams(l,A); const r=SC.trueCost(l,p); const j=p._jur;
    el.innerHTML=`<div class="ix-cost">
     <div class="ix-cost-in">
      ${sl('downPct','Down payment',0,50,1,p.downPct,'%')}
      ${sl('rate','Interest rate',3,10,0.01,p.rate,'%rate',`Default ${A.rate.value}% — ${esc(A.rate.label)}`)}
      <div class="ix-sl"><div class="ix-sl-h"><span>Loan term</span></div><div class="seg" role="group" aria-label="Loan term">${[30,20,15].map(y=>`<button type="button" data-years="${y}" aria-pressed="${p.years===y}">${y} years</button>`).join('')}</div></div>
      ${sl('insYr','Homeowners insurance',600,9000,25,p.insYr,'$yr',`Default ${money(A.insurance.value)}/yr NC average`)}
      ${sl('maintPct','Maintenance reserve',0.5,4,0.25,p.maintPct,'%val','Fannie Mae rule of thumb: 1%–4% of value per year')}
      ${sl('utilMo','Utilities',0,900,10,p.utilMo,'$mo','Your estimate — ask for 12-month utility history')}
      ${sl('closingPct','Closing costs',2,5,0.25,p.closingPct,'%','Typical NC range 2%–5% of price')}
      ${p.downPct<20?sl('pmiRate','PMI rate',0.3,1.5,0.05,p.pmiRate,'%loan','Typical 0.46%–1.50% of loan per year'):''}
      <div class="ix-sl"><div class="ix-sl-h"><label for="${uid}-tax">Property tax rate (per $100)</label></div><input class="ix-num" id="${uid}-tax" type="number" step="0.0001" min="0" value="${p.taxRate}" data-tax><small>${esc(j.label)}: ${j.per100}${j.county!=null?` (county ${j.county} + municipal ${j.city})`:''}</small></div>
      <div class="ix-sl"><div class="ix-sl-h"><label for="${uid}-dest">Commute destination</label></div><select class="ix-num" id="${uid}-dest" data-dest><option value="none" ${!p._dest?'selected':''}>No commute</option>${SC.LANDMARKS.map(x=>`<option value="${x.id}" ${p._dest&&p._dest.id===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}${p._dest&&!SC.lmk(p._dest.id)?`<option value="${esc(p._dest.id)}" selected>${esc(p._dest.name)} (Home Match)</option>`:''}</select></div>
      ${p._dest?sl('workdays','Commute days per month',0,23,1,p._workdays,'days',''):''}
     </div>
     <div class="ix-cost-out" data-out>${outHtml(p,r)}</div></div>
     <div class="ix-cmp" data-cmp></div>
     <details class="ix-src"><summary>Assumptions, method &amp; sources</summary><ul>
      <li>Principal &amp; interest: standard amortization on the loan amount. Property tax: rate × list price ÷ 12 (bills use the county assessed value). ${esc(A.tax.note)}</li>
      ${(j.sources||[]).map(s=>`<li>Tax rate: ${srcLine(s)}</li>`).join('')}
      <li>Mortgage rate: ${srcLine(A.rate)} — ${esc(A.rate.note)}</li>
      <li>Insurance: ${srcLine(A.insurance)}; also ${A.insurance.alt.map(srcLine).join('; ')}. ${esc(A.insurance.note)}</li>
      <li>Closing costs: ${srcLine(A.closing)}. ${esc(A.closing.note)}</li>
      <li>Maintenance: ${srcLine(A.maintenance)}. ${esc(A.maintenance.note)}</li>
      <li>PMI: ${srcLine(A.pmi)}. ${esc(A.pmi.note)}</li>
      <li>Commute: ${srcLine(A.mileage)}. ${esc(A.mileage.note)} Drive distance is an estimate (straight-line × 1.35).</li>
      <li>Utilities: ${esc(A.utilities.note)}</li>
      <li>HOA: from the listing (sample data). Listing price and HOA are sample data — live MLS data via Showcase IDX at launch.</li></ul>
      <p class="form-note">Updated when the assumptions file is refreshed (rates weekly from Freddie Mac PMMS; tax rates each July 1). Talk to a licensed lender for a Loan Estimate.</p></details>`;
    labels();
    drawCmp(A);};
  const labels=()=>$$('input[type=range]',el).forEach(i=>{const o=$('#'+i.id+'-o',el); const u=i.dataset.unit, v=+i.value; o.textContent=u==='%'||u==='%rate'||u==='%val'||u==='%loan'?v+'%':u==='$yr'?money(v)+'/yr':u==='$mo'?money(v)+'/mo':v+' days';});
  const drawCmp=A=>{const box=$('[data-cmp]',el); const ids=[l.id,...SC.compare().filter(x=>x!==l.id)].slice(0,5); const homes=ids.map(SC.listing).filter(Boolean);
    if(homes.length<2){box.innerHTML=`<div class="ix-cmp-empty"><b>Compare costs across homes.</b> Add homes with the Compare button and they'll appear here using the same assumptions. <a href="compare.html">Open Compare Homes</a></div>`; return;}
    const rows=homes.map(h=>({h,r:SC.trueCost(h,costParams(h,A))})); const max=Math.max(...rows.map(x=>x.r.total));
    box.innerHTML=`<h3 class="ix-h3">Monthly cost across your compared homes <small>(same assumptions, each home's own tax jurisdiction)</small></h3>${rows.map(({h,r})=>`<div class="ix-bar-row"><a href="listing.html?id=${h.id}" class="ix-bar-l">${h.id===l.id?'<b>This home</b> · ':''}${esc(h.address)}<small>${short(h.price)}</small></a><div class="ix-bar" style="width:${(r.total/max*100).toFixed(1)}%">${['pi','tax','ins','pmi','hoa','maint','util','commute'].map(k=>r[k]>0?`<span style="flex:${r[k]};background:${COLORS[k]}" title="${LABELS[k]} ${money(r[k])}"></span>`:'').join('')}</div><b class="ix-bar-v">${money(r.total)}</b></div>`).join('')}<p class="form-note">Estimates. <a href="compare.html?ids=${ids.join(',')}">Compare these homes side by side</a></p>`;};
  draw();
  const upd=()=>{const p=costParams(l,A); $('[data-out]',el).innerHTML=outHtml(p,SC.trueCost(l,p)); labels(); drawCmp(A);};
  el.addEventListener('input',e=>{const t=e.target; if(t.dataset.k){const before=costParams(l,A).downPct<20; setCp({[t.dataset.k]:+t.value}); if(t.dataset.k==='downPct'&&before!==(+t.value<20)){const id=t.id; draw(); const n=document.getElementById(id); n&&n.focus({preventScroll:true});} else upd();}
    if(t.hasAttribute('data-tax')&&t.value!==''){const c=cp(); setCp({taxRates:Object.assign({},c.taxRates,{[l.city]:+t.value})}); upd();}});
  el.addEventListener('change',e=>{const t=e.target; if(t.hasAttribute('data-dest')){setCp({commuteId:t.value}); draw();} if(t.dataset.k) track('true_cost_adjust',{listing_id:l.id,field:t.dataset.k});});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-years]'); if(b){setCp({years:+b.dataset.years}); draw();}});
  document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_compare') drawCmp(A);});
}
SC.intel={jur,costParams,donut,femaLayer,femaZone,COLORS,LABELS,money,srcLine};
SC.costUI={mount,params:costParams};
})();

/* Charlotte Market Pulse dashboard. Data: assets/data/market-pulse.json (published Canopy figures only). */
(function(){
const SC=window.SC, ll=SC.ll, {$,$$,esc}=SC;
const ORDER=['median_sale_price','closed_sales','new_listings','pending_sales','inventory','months_supply','dom','list_to_close_days','pct_orig_list_price','avg_sale_price'];
const TYPE_LABEL={region:'Region',county:'Counties','county-group':'Groups',community:'Towns & communities'};
const C={espresso:'#1E140D',plum:'#4A2445',gold:'#C99A4B',forest:'#163B35',muted:'#8a7d70',line:'#E7E1D8'};
let P, charts={}, st={area:'region',cmp:'',metric:'median_sale_price',period:'12'};

const cell=(a,m,k)=>{const s=P.series[a]; const c=s&&s[m]&&s[m][k]; return c&&c[0]!=null?{v:c[0],yoy:c[1],src:P.sources[c[2]]}:null;};
const prevYear=m=>{const [y,mo]=m.split('-'); return (+y-1)+'-'+mo;};
/* YoY: Canopy-published % first; else computed from two published values */
const yoy=(a,m,k)=>{const c=cell(a,m,k); if(!c) return null; if(c.yoy!=null) return {pct:+c.yoy,how:'published'};
  const p=cell(a,prevYear(m),k); if(p&&p.v) return {pct:(c.v-p.v)/p.v*100,how:'computed'}; return null;};
const unit=k=>P.metrics[k].unit;
const fmtV=(k,v)=>ll.val(v,unit(k));
const months=()=>{const all=P.meta.months; return st.period==='all'?all:all.slice(-(+st.period));};
const latestMonth=a=>{const s=P.series[a]||{}; return Object.keys(s).sort().reverse().find(m=>Object.values(s[m]||{}).some(c=>c&&c[0]!=null));};
const yoyTxt=y=>y?`<span class="ll-yoy ${y.pct>0?'up':y.pct<0?'down':''}">${y.pct>0?'+':''}${y.pct.toFixed(1)}% YoY${y.how==='computed'?' <em>(computed)</em>':''}</span>`:'<span class="ll-yoy na">YoY not published</span>';
const srcShort=s=>s?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${s.type==='press_release'?'Canopy press release':'Canopy sortable statistics'}, ${esc(ll.ym(s.report_month))}</a>`:'';

function fillSelects(){
  const groups={}; P.areas.forEach(a=>{(groups[a.type]=groups[a.type]||[]).push(a);});
  const opts=Object.keys(TYPE_LABEL).filter(t=>groups[t]).map(t=>`<optgroup label="${TYPE_LABEL[t]}">${groups[t].map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</optgroup>`).join('');
  $('#pl-area').innerHTML=opts; $('#pl-cmp').innerHTML='<option value="">No comparison</option>'+opts;
  $('#pl-metric').innerHTML=ORDER.filter(k=>P.metrics[k]).map(k=>`<option value="${k}">${esc(P.metrics[k].label)}</option>`).join('');
  const q=new URLSearchParams(location.search);
  if(q.get('area')&&P.series[q.get('area')]) st.area=q.get('area');
  if(q.get('metric')&&P.metrics[q.get('metric')]) st.metric=q.get('metric');
  if(q.get('cmp')&&P.series[q.get('cmp')]) st.cmp=q.get('cmp');
  if(['12','24','all'].includes(q.get('period'))) st.period=q.get('period');
  $('#pl-area').value=st.area; $('#pl-metric').value=st.metric; $('#pl-cmp').value=st.cmp;
  $$('#pl-period button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===st.period));
}
function syncURL(){const p=new URLSearchParams(); if(st.area!=='region') p.set('area',st.area); if(st.metric!=='median_sale_price') p.set('metric',st.metric); if(st.cmp) p.set('cmp',st.cmp); if(st.period!=='12') p.set('period',st.period);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));}

function kpis(){
  const m=latestMonth(st.area); const name=ll.areaName(P,st.area);
  $('#pl-kpi-h').textContent=`${name}: ${m?ll.ymLong(m):'no data'}`;
  $('#pl-kpis').innerHTML=ORDER.filter(k=>P.metrics[k]).map(k=>{const c=m&&cell(st.area,m,k);
    return `<button type="button" class="ll-kpi${k===st.metric?' on':''}" data-k="${k}" aria-pressed="${k===st.metric}"><span class="ll-kpi-l">${esc(P.metrics[k].label)}</span>${c?`<b>${fmtV(k,c.v)}</b>${yoyTxt(yoy(st.area,m,k))}`:'<b class="na">Not published</b><span class="ll-yoy na">for this area/month</span>'}</button>`;}).join('');
  $$('#pl-kpis .ll-kpi').forEach(b=>b.addEventListener('click',()=>{st.metric=b.dataset.k; $('#pl-metric').value=st.metric; render(); SC.track('pulse_metric',{metric:st.metric});}));
}

function chartOpts(k,isPct){return {responsive:true,maintainAspectRatio:false,animation:ll.reduced()?false:{duration:400},interaction:{mode:'index',intersect:false},
  plugins:{legend:{display:true,labels:{boxWidth:12,font:{family:'Inter',size:12}}},tooltip:{callbacks:{label:c=>c.raw==null?`${c.dataset.label}: not published`:`${c.dataset.label}: ${isPct?(c.raw>0?'+':'')+c.raw.toFixed(1)+'%':fmtV(k,c.raw)}`}}},
  scales:{x:{grid:{display:false},ticks:{font:{size:11},maxRotation:0,autoSkip:true,maxTicksLimit:8}},y:{grid:{color:C.line},ticks:{font:{size:11},callback:v=>isPct?v+'%':unit(k)==='usd'?SC.short(v):unit(k)==='pct'?v+'%':v.toLocaleString('en-US')}}}};}

function trend(){
  const k=st.metric, ms=months(), lab=ms.map(ll.ym);
  const ds=[{label:ll.areaName(P,st.area),data:ms.map(m=>{const c=cell(st.area,m,k);return c?c.v:null;}),borderColor:C.plum,backgroundColor:C.plum,tension:.25,spanGaps:false,pointRadius:3}];
  if(st.cmp&&st.cmp!==st.area) ds.push({label:ll.areaName(P,st.cmp),data:ms.map(m=>{const c=cell(st.cmp,m,k);return c?c.v:null;}),borderColor:C.gold,backgroundColor:C.gold,tension:.25,spanGaps:false,pointRadius:3,borderDash:[5,4]});
  $('#pl-c1-h').textContent=P.metrics[k].label; $('#pl-c1-sub').textContent=`${ll.ym(ms[0])} to ${ll.ym(ms[ms.length-1])}`;
  const missing=ds[0].data.filter(v=>v==null).length;
  const srcs=[...new Set(ms.map(m=>cell(st.area,m,k)).filter(Boolean).map(c=>c.src.type))];
  $('#pl-c1-src').innerHTML=`Source: Canopy Realtor® Association (${srcs.map(t=>t==='press_release'?'monthly press releases':'Housing Market Sortable Statistics').join(' and ')||'no published values'}). Last updated ${ll.date(P.meta.retrieved)}.${missing?` Gaps = not published (${missing} of ${ms.length} months).`:''} <a href="#pl-table" data-open-table>See each month's source</a>.`;
  draw('c1','line',lab,ds,chartOpts(k,false));
}
function yoyChart(){
  const k=st.metric, ms=months();
  const data=ms.map(m=>{const y=yoy(st.area,m,k); return y?+y.pct.toFixed(1):null;});
  const comp=ms.map(m=>{const y=yoy(st.area,m,k); return y&&y.how==='computed';});
  $('#pl-c2-h').textContent='Change vs. same month a year earlier'; $('#pl-c2-sub').textContent=P.metrics[k].label+' · '+ll.areaName(P,st.area);
  $('#pl-c2-src').innerHTML=`Canopy-published year-over-year % where available${comp.some(Boolean)?'; lighter bars are computed from two published values 12 months apart':''}. Missing bars = not published. Last updated ${ll.date(P.meta.retrieved)}.`;
  draw('c2','bar',ms.map(ll.ym),[{label:'Year-over-year %',data,backgroundColor:data.map((v,i)=>comp[i]?'rgba(74,36,69,.35)':(v!=null&&v<0?C.gold:C.plum)),borderRadius:4}],chartOpts(k,true));
}
function draw(id,type,labels,datasets,options){
  if(!window.Chart){$('#pl-'+id).parentElement.innerHTML='<p class="ll-empty">Charts could not load. The table below has every value.</p>'; return;}
  if(charts[id]){charts[id].data.labels=labels; charts[id].data.datasets=datasets; charts[id].options=options; charts[id].update(); return;}
  charts[id]=new Chart($('#pl-'+id),{type,data:{labels,datasets},options});
}
function table(){
  const ks=ORDER.filter(k=>P.metrics[k]&&P.meta.months.some(m=>cell(st.area,m,k)));
  const ms=months().slice().reverse();
  $('#pl-table').innerHTML=`<caption class="sr-only">${esc(ll.areaName(P,st.area))} monthly values</caption><thead><tr><th>Month</th>${ks.map(k=>`<th>${esc(P.metrics[k].label)}</th>`).join('')}<th>Sources</th></tr></thead><tbody>`+
    ms.map(m=>{const cs=ks.map(k=>cell(st.area,m,k)); const srcs=[...new Map(cs.filter(Boolean).map(c=>[c.src.url,c.src])).values()];
      return `<tr><td>${ll.ym(m)}</td>${cs.map((c,i)=>`<td class="n">${c?fmtV(ks[i],c.v):'<span class="na">Not published</span>'}</td>`).join('')}<td>${srcs.map(srcShort).join('<br>')||'—'}</td></tr>`;}).join('')+'</tbody>';
}
let sortK='median_sale_price', sortDir=-1;
function allAreas(){
  const m=latestMonth('region'); const ks=['median_sale_price','closed_sales','new_listings','avg_sale_price'];
  $('#pl-cmp-sub').textContent=`${ll.ymLong(m)} figures for all ${P.areas.length} published areas. Select a column to sort; select an area to chart it.`;
  const rows=P.areas.map(a=>({a,c:ks.map(k=>cell(a.id,m,k)),y:yoy(a.id,m,'median_sale_price')}));
  const idx=ks.indexOf(sortK);
  rows.sort((x,y)=>{if(sortK==='name') return sortDir*x.a.name.localeCompare(y.a.name); const a=x.c[idx]?x.c[idx].v:-Infinity,b=y.c[idx]?y.c[idx].v:-Infinity; return sortDir*(a-b);});
  const th=(k,l)=>`<th aria-sort="${sortK===k?(sortDir>0?'ascending':'descending'):'none'}"><button type="button" data-sort="${k}">${l}</button></th>`;
  $('#pl-all').innerHTML=`<thead><tr>${th('name','Area')}${ks.map(k=>th(k,P.metrics[k].label)).join('')}<th>Median YoY</th></tr></thead><tbody>`+
    rows.map(r=>`<tr><td><button type="button" class="ll-lnk" data-area="${r.a.id}">${esc(r.a.name)}</button></td>${r.c.map((c,i)=>`<td class="n">${c?fmtV(ks[i],c.v):'<span class="na">Not published</span>'}</td>`).join('')}<td class="n">${r.y?`${r.y.pct>0?'+':''}${r.y.pct.toFixed(1)}%`:'<span class="na">—</span>'}</td></tr>`).join('')+'</tbody>';
  const s=cell('region',m,'median_sale_price');
  $('#pl-all-src').innerHTML=`Source: ${s?srcShort(s.src):'Canopy'} (Canopy MLS data). Last updated ${ll.date(P.meta.retrieved)}.`;
  $$('#pl-all [data-sort]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.sort; sortDir=sortK===k?-sortDir:(k==='name'?1:-1); sortK=k; allAreas();}));
  $$('#pl-all [data-area]').forEach(b=>b.addEventListener('click',()=>{st.area=b.dataset.area; $('#pl-area').value=st.area; render(); $('#pl-kpi-h').scrollIntoView({behavior:ll.reduced()?'auto':'smooth'});}));
}
function render(){kpis(); trend(); yoyChart(); table(); syncURL();}

ll.pulse().then(d=>{P=d;
  $('#pl-asof').innerHTML=`Data through ${ll.ymLong(P.meta.months[P.meta.months.length-1])} · Last updated ${ll.date(P.meta.retrieved)} · ${P.areas.length} areas · ${P.sources.length} source reports`;
  fillSelects(); render(); allAreas();
  $('#pl-area').addEventListener('change',e=>{st.area=e.target.value; render(); SC.track('pulse_area',{area:st.area});});
  $('#pl-cmp').addEventListener('change',e=>{st.cmp=e.target.value; render();});
  $('#pl-metric').addEventListener('change',e=>{st.metric=e.target.value; render(); SC.track('pulse_metric',{metric:st.metric});});
  $$('#pl-period button').forEach(b=>b.addEventListener('click',()=>{st.period=b.dataset.p; $$('#pl-period button').forEach(x=>x.setAttribute('aria-pressed',x===b)); render();}));
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-table]')){$('.ll-details').open=true;}});
}).catch(()=>{$('#pl-kpis').innerHTML='<p class="ll-empty">Market data could not load. Please refresh the page.</p>';});
})();

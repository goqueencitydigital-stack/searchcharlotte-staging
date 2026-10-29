/* Compare Homes (property_intel_builder). Reads ?ids=a,b,c or SC.compare(); saves to SC.db 'sc_comparisons'. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC;
const qs=new URLSearchParams(location.search); const shared=qs.get('ids');
let ids=(shared?shared.split(','):SC.compare()).filter(id=>SC.listing(id)).slice(0,4);
let lmk=qs.get('to')||(SC.prefs().commute&&SC.prefs().commute.id&&SC.lmk(SC.prefs().commute.id)?SC.prefs().commute.id:'uptown');
const AMEN=['restaurants','grocery','parks','cafes','fitness','transit'];
let A=null, amen={};
const money=n=>fmt(Math.round(n));

function bar(){const opts=D.listings.filter(l=>!ids.includes(l.id)).sort((a,b)=>a.hoodName.localeCompare(b.hoodName)||a.price-b.price);
  $('#cmp-bar').innerHTML=`<div class="cmp-ctl"><label for="cmp-add">Add a home</label><div class="cmp-row"><select id="cmp-add" ${ids.length>=4?'disabled':''}><option value="">${ids.length>=4?'Compare is full (4 homes)':'Choose a sample listing…'}</option>${opts.map(l=>`<option value="${l.id}">${esc(l.hoodName)} · ${esc(l.address)} · ${short(l.price)}</option>`).join('')}</select></div></div>
   <div class="cmp-ctl"><label for="cmp-lmk">Commute to</label><select id="cmp-lmk">${SC.LANDMARKS.map(m=>`<option value="${m.id}" ${m.id===lmk?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
   <div class="cmp-ctl cmp-acts"><button class="btn btn-sm btn-outline" type="button" id="cmp-share" ${ids.length<2?'disabled':''}>Copy share link</button><button class="btn btn-sm" type="button" id="cmp-save" ${ids.length<2?'disabled':''}>Save comparison</button></div>`;
  $('#cmp-add').onchange=e=>{const v=e.target.value; if(!v) return; ids=[...ids,v].slice(0,4); if(!shared) SC.db.set('sc_compare',ids); track('compare_add',{listing_id:v,from:'compare_page'}); render();};
  $('#cmp-lmk').onchange=e=>{lmk=e.target.value; render();};
  $('#cmp-share').onclick=async()=>{const url=location.origin+location.pathname+'?ids='+ids.join(',')+'&to='+lmk; track('compare_share',{count:ids.length}); try{await navigator.clipboard.writeText(url); SC.toast('Share link copied');}catch(e){prompt('Copy this link',url);}};
  $('#cmp-save').onclick=()=>{const name=ids.map(id=>SC.listing(id).address.split(' ').slice(1,3).join(' ')).join(' vs ');
    SC.db.update('sc_comparisons',[],a=>[{id:'cmp_'+Date.now(),name,ids:[...ids],landmark:lmk,created:new Date().toISOString()},...a].slice(0,20)); SC.toast('Comparison saved'); track('compare_save',{count:ids.length}); saved();};}

function rowsFor(H){const lm=SC.lmk(lmk);
  const v=H.map(l=>{const x=SC.extras(l); const p=SC.costUI.params(l,A); const c=SC.trueCost(l,p); const d=SC.drive([l.lat,l.lng],[lm.lat,lm.lng]); const m=SC.match(l,SC.prefs(),amen);
    return {l,x,c,p,d,m,a:amen[l.id]||{}};});
  const R=[
    ['Price',o=>o.l.price,'min',o=>fmt(o.l.price)],
    ['Bedrooms',o=>o.l.type==='Land'?null:o.l.beds,'max',o=>o.l.type==='Land'?'—':o.l.beds],
    ['Bathrooms',o=>o.l.type==='Land'?null:o.l.baths,'max',o=>o.l.type==='Land'?'—':o.l.baths],
    ['Living area',o=>o.l.sqft||null,'max',o=>o.l.sqft?o.l.sqft.toLocaleString()+' sq ft':'—'],
    ['Lot size',o=>o.l.acres,'max',o=>o.l.acres+' acres'],
    ['Year built',o=>o.l.year||null,'max',o=>o.l.year||'—'],
    ['Price per sq ft',o=>SC.ppsf(o.l),'min',o=>SC.ppsf(o.l)?'$'+SC.ppsf(o.l):'—'],
    ['Est. monthly cost',o=>o.c.total,'min',o=>`${money(o.c.total)}<small>estimate · P&amp;I ${money(o.c.pi)}</small>`],
    ['Est. cash to close',o=>o.c.cashToClose,'min',o=>money(o.c.cashToClose)],
    ['HOA dues',o=>o.l.hoa||0,'min',o=>o.l.hoa?'$'+o.l.hoa+'/mo':'None listed'],
    ['Est. property tax',o=>o.c.tax*12,'min',o=>`${money(o.c.tax*12)}/yr<small>${o.p.taxRate} per $100 · ${esc(o.l.city)}</small>`],
    [`Drive to ${lm.name}`,o=>o.d.minutes,'min',o=>`~${o.d.minutes} min<small>${o.d.miles} mi · estimate</small>`],
    ...AMEN.map(k=>[`${SC.POI_CATS[k]} within 1 mi`,o=>o.a[k]?o.a[k][0]:null,'max',o=>o.a[k]?`${o.a[k][0]}<small>nearest ${o.a[k][2]} mi</small>`:'—']),
    ['Days on market',o=>o.l.dom,null,o=>o.l.dom],
    ['Price history (demo)',o=>null,null,o=>{const ch=o.l.price-o.x.originalPrice; return `${o.x.priceCuts?`${o.x.priceCuts} price cut${o.x.priceCuts>1?'s':''}, ${short(-ch)} below original`:'No price changes'}${o.x.backOnMarket?' · back on market':''}<small>listed ${o.x.listed}</small>`;}],
    ['Home Match',o=>o.m?o.m.score:null,'max',o=>o.m?`<span class="match-badge ${o.m.score>=85?'hi':o.m.score>=65?'mid':'lo'}">${o.m.score}% Match</span>`:'<button class="xr-link" type="button" data-match-prefs>Set preferences</button>'],
  ];
  return {v,R};}

function summary(v,lm){const out=[]; if(v.length<2) return out; const by=(f,dir)=>[...v].filter(o=>f(o)!=null).sort((a,b)=>dir*(f(a)-f(b)));
  const n=o=>esc(o.l.address);
  const pr=by(o=>o.l.price,1); out.push(`<b>${n(pr[0])}</b> has the lowest list price — ${short(pr[pr.length-1].l.price-pr[0].l.price)} less than ${n(pr[pr.length-1])}.`);
  const sq=by(o=>o.l.sqft||null,-1); if(sq.length>1) out.push(`<b>${n(sq[0])}</b> is the largest at ${sq[0].l.sqft.toLocaleString()} sq ft, ${Math.round((sq[0].l.sqft/sq[sq.length-1].l.sqft-1)*100)}% more than ${n(sq[sq.length-1])}.`);
  const pp=by(o=>SC.ppsf(o.l),1); if(pp.length>1) out.push(`Lowest asking price per sq ft: <b>${n(pp[0])}</b> at $${SC.ppsf(pp[0].l)} vs. $${SC.ppsf(pp[pp.length-1].l)} for the highest.`);
  const mc=by(o=>o.c.total,1); out.push(`Estimated monthly cost ranges from ${money(mc[0].c.total)} (<b>${n(mc[0])}</b>) to ${money(mc[mc.length-1].c.total)}, a gap of ${money(mc[mc.length-1].c.total-mc[0].c.total)} per month under the same assumptions.`);
  const dr=by(o=>o.d.minutes,1); if(dr[dr.length-1].d.minutes-dr[0].d.minutes>=5) out.push(`<b>${n(dr[0])}</b> has the shortest estimated drive to ${esc(lm.name)} (~${dr[0].d.minutes} min vs. ~${dr[dr.length-1].d.minutes} min).`);
  const rs=by(o=>o.a.restaurants?o.a.restaurants[0]:null,-1); if(rs.length>1&&rs[0].a.restaurants[0]!==rs[rs.length-1].a.restaurants[0]) out.push(`Most restaurants within a mile: <b>${n(rs[0])}</b> (${rs[0].a.restaurants[0]}) vs. ${rs[rs.length-1].a.restaurants[0]} for ${n(rs[rs.length-1])}.`);
  const noHoa=v.filter(o=>!o.l.hoa); if(noHoa.length&&noHoa.length<v.length) out.push(`${noHoa.map(n).join(' and ')} ${noHoa.length>1?'have':'has'} no HOA dues listed.`);
  const cuts=v.filter(o=>o.x.priceCuts); if(cuts.length) out.push(`${cuts.map(n).join(' and ')} ${cuts.length>1?'have':'has'} had a price reduction (demo history).`);
  const yr=by(o=>o.l.year||null,-1); if(yr.length>1&&yr[0].l.year!==yr[yr.length-1].l.year) out.push(`Newest construction: <b>${n(yr[0])}</b> (built ${yr[0].l.year}).`);
  const hm=by(o=>o.m?o.m.score:null,-1); if(hm.length>1) out.push(`Highest Home Match: <b>${n(hm[0])}</b> at ${hm[0].m.score}%.`);
  return out;}

function render(){bar();
  if(shared&&ids.length) $('#cmp-shared').innerHTML=`<div class="cmp-note">You're viewing a shared comparison. <button class="xr-link" type="button" id="cmp-adopt">Add these homes to my compare list</button></div>`;
  const ad=$('#cmp-adopt'); if(ad) ad.onclick=()=>{SC.db.set('sc_compare',[...ids]); SC.toast('Added to your compare list');};
  const main=$('#cmp-main'); const H=ids.map(SC.listing).filter(Boolean);
  if(H.length<2){main.innerHTML=`<div class="empty cmp-empty"><h3>${H.length?'Add one more home to compare':'Choose homes to compare'}</h3><p>Use the Compare button on any property page or card, or add sample listings with the picker above.</p>${H.length?`<div class="cmp-one">${SC.card(H[0])}</div>`:''}<a class="btn btn-sm" href="search.html">Browse homes</a></div>`; return;}
  const lm=SC.lmk(lmk); const {v,R}=rowsFor(H);
  const sum=summary(v,lm);
  main.innerHTML=`<div class="cmp-sum"><p class="eyebrow">Key differences</p><ul>${sum.map(s=>`<li>${s}</li>`).join('')}</ul><p class="form-note">Summary generated from listing data (sample) and the estimates below — no AI or editorial judgment.</p></div>
   <div class="cmp-scroll" role="region" aria-label="Comparison table" tabindex="0"><table class="cmp-table" style="--n:${H.length}"><caption class="sr-only">Side-by-side comparison of ${H.length} homes</caption>
   <thead><tr><th scope="col" class="cmp-lab"><span class="sr-only">Feature</span></th>${v.map(o=>`<th scope="col"><div class="cmp-home"><a href="listing.html?id=${o.l.id}" class="cmp-img"><img src="assets/img/${o.l.img}.webp" alt="" loading="lazy"></a><a href="listing.html?id=${o.l.id}" class="cmp-addr">${esc(o.l.address)}</a><span class="cmp-sub">${esc(o.l.hoodName)} · ${esc(o.l.type)}</span><button type="button" class="cmp-x" data-rm="${o.l.id}" aria-label="Remove ${esc(o.l.address)} from comparison">Remove</button></div></th>`).join('')}</tr></thead>
   <tbody>${R.map(([label,val,best,show])=>{const vals=v.map(val); const nums=vals.filter(x=>x!=null); let bi=new Set();
     if(best&&nums.length>1&&new Set(nums).size>1){const t=best==='min'?Math.min(...nums):Math.max(...nums); vals.forEach((x,i)=>{if(x===t) bi.add(i);});}
     return `<tr><th scope="row" class="cmp-lab">${esc(label)}</th>${v.map((o,i)=>`<td class="${bi.has(i)?'best':''}">${show(o)}${bi.has(i)?'<span class="cmp-best">Best</span>':''}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>
   <p class="form-note">"Best" marks the lowest cost or highest value in each row among these homes. Monthly cost uses your saved True Cost assumptions (${v[0].p.downPct}% down, ${v[0].p.rate}% rate, ${v[0].p.years} years) and each home's own tax jurisdiction; commute estimates use straight-line distance × 1.35. Amenity counts: OpenStreetMap, within 1 straight-line mile.</p>`;
  $$('[data-rm]',main).forEach(b=>b.onclick=()=>{ids=ids.filter(x=>x!==b.dataset.rm); if(!shared) SC.db.set('sc_compare',ids); track('compare_remove',{listing_id:b.dataset.rm,from:'compare_page'}); render();});
  if(!shared) history.replaceState(null,'',location.pathname);
}
function saved(){const S=SC.db.get('sc_comparisons',[]); const el=$('#cmp-saved'); if(!S.length){el.innerHTML=''; return;}
  el.innerHTML=`<h2 class="display d-md">Saved comparisons</h2><ul class="cmp-saved-list">${S.map(s=>`<li><div><b>${esc(s.name)}</b><small>${s.ids.length} homes · saved ${new Date(s.created).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small></div><a class="btn btn-sm btn-outline" href="compare.html?ids=${s.ids.join(',')}&to=${esc(s.landmark||'uptown')}">Open</a><button class="xr-link" type="button" data-del="${s.id}">Delete</button></li>`).join('')}</ul><p class="form-note">Saved in this browser tab for the preview. At launch, comparisons sync to your Search Charlotte Passport account.</p>`;
  $$('[data-del]',el).forEach(b=>b.onclick=()=>{SC.db.update('sc_comparisons',[],a=>a.filter(x=>x.id!==b.dataset.del)); saved();});}
Promise.all([SC.costAssumptions,SC.amenities]).then(([a,m])=>{A=a; amen=m||{}; render(); saved(); track('compare_view',{count:ids.length,shared:!!shared});});
document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_prefs'&&A) render(); if(e.detail.key==='sc_compare'&&!shared&&A){const c=SC.compare(); if(c.join()!==ids.join()){ids=c.filter(id=>SC.listing(id)); render();}}});
})();

/* Find Homes Like This, visual search proof of concept.
   Client-side only: the image is read with FileReader and drawn to a canvas in this browser; it is never uploaded.
   Matching uses assets/data/visual-tags.json (hand-assigned tags for the site's own sample photos) + SC.extras style/features (DEMO).
   Production: licensed visual-search index (image embeddings) over authorized Canopy MLS photos, queried by a backend endpoint. */
(function(){'use strict';
const SC=window.SC, {D,$,$$,esc,fmt,short,track}=SC;
if(document.body.dataset.page!=='visual') return;
const V={tags:null,sel:new Set(),sig:null,src:null};
const GROUPS=[['architecture','Architecture'],['exterior','Exterior'],['kitchen','Kitchen'],['outdoor','Outdoor space']];
const FEAT2TAG={'Covered patio':'Patio','Deck':'Patio','Hardwood floors':'Wood floors','Quartz counters':'Stone counters'};
const listingTags=l=>{const x=SC.extras(l), s=new Set(); const imgs=[...new Set([l.img,...(l.gallery||[])])];
  imgs.forEach(i=>{const t=V.tags.images[i]; if(t) GROUPS.forEach(([g])=>t[g].forEach(v=>s.add(v)));});
  if(x.style) s.add(x.style); x.features.forEach(f=>FEAT2TAG[f]&&s.add(FEAT2TAG[f])); if(l.pool) s.add('Pool'); if(l.garage) s.add('Attached garage'); return s;};
const palSim=l=>{if(!V.sig) return 0; let best=0; [l.img,...(l.gallery||[])].forEach(i=>{const t=V.tags.images[i]; if(!t) return; const d=Math.abs(t.brightness-V.sig.brightness)+Math.abs(t.warmth-V.sig.warmth); best=Math.max(best,1-Math.min(1,d*2));}); return best;};

/* ---------- pixel signals ---------- */
function analyze(img){const c=document.createElement('canvas'), W=96, H=Math.max(1,Math.round(96*img.naturalHeight/img.naturalWidth)); c.width=W; c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,W,H); let d; try{d=x.getImageData(0,0,W,H).data;}catch(e){return null;}
  let R=0,G=0,B=0,n=0,green=0,blueLow=0,blueHigh=0,brick=0,light=0,sat=0,tb=0,bb=0,tn=0,bn=0; const buckets={};
  for(let i=0,p=0;i<d.length;i+=4,p++){const r=d[i],g=d[i+1],b=d[i+2], y=Math.floor(p/W); R+=r;G+=g;B+=b;n++;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b), br=(0.299*r+0.587*g+0.114*b)/255; sat+=mx?(mx-mn)/mx:0; if(y<H*0.3){tb+=br;tn++;} else if(y>H*0.7){bb+=br;bn++;}
    if(g>r+8&&g>b+8&&br>0.15) green++; if(b>r+25&&b>=g-10&&br>0.3){ if(y>H*0.5) blueLow++; else blueHigh++;}
    if(r>g+28&&r>b+38&&br>0.18&&br<0.65) brick++; if(br>0.78&&mx-mn<30) light++;
    const k=(r>>5)+','+(g>>5)+','+(b>>5); buckets[k]=(buckets[k]||0)+1;}
  R/=n;G/=n;B/=n; const top=Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>{const [r,g,b]=k.split(',').map(z=>z*32+16); return {hex:'#'+[r,g,b].map(z=>z.toString(16).padStart(2,'0')).join(''),pct:Math.round(v/n*100)};});
  return {avg:[R,G,B].map(Math.round),brightness:+((0.299*R+0.587*G+0.114*B)/255).toFixed(3),warmth:+((R-B)/255).toFixed(3),sat:+(sat/n).toFixed(2),
    green:green/n,blueLow:blueLow/(n/2),blueHigh:blueHigh/(n/2),brick:brick/n,light:light/n,skyGrad:(tn&&bn)?tb/tn-bb/bn:0,top};}
function suggest(s){const t=new Set(), why=[]; const outdoor=s.green>0.1||s.blueHigh>0.12||(s.green>0.03&&s.skyGrad>0.1); const unsure=!outdoor&&(s.brightness<0.3||s.green>0.03||s.blueHigh>0.04||s.skyGrad>0.15);
  if(s.green>0.12){t.add('Front lawn'); t.add('Mature trees'); why.push(`${Math.round(s.green*100)}% green areas`);}
  if(s.blueLow>0.08&&outdoor){t.add('Pool'); why.push('blue area in the lower half');}
  if(s.blueHigh>0.12||(outdoor&&s.skyGrad>0.1)) why.push('sky in the upper part');
  if(outdoor&&s.brick>0.12){t.add('Brick'); why.push('red-brown masonry tones');}
  if(outdoor&&s.light>0.12){t.add('White exterior'); why.push('large light, low-color areas');}
  if(!outdoor&&!unsure&&s.brightness>0.6&&s.sat<0.25){t.add('White kitchen'); why.push('bright, low-saturation interior');}
  if(!outdoor&&!unsure&&s.brightness<0.45&&s.warmth>0.06){t.add('Dark wood cabinets'); why.push('dark, warm tones');}
  return {tags:[...t],why,room:outdoor?'Likely an exterior photo':unsure?'Couldn\'t tell if this is inside or outside. Pick the details yourself':'Likely an interior photo'};}

/* ---------- UI ---------- */
const imgEl=$('#vs-img'), empty=$('#vs-empty'), drop=$('#vs-drop'), file=$('#vs-file');
function renderSignals(s,known){const el=$('#vs-signals');
  if(!s){el.innerHTML='<p class="vs-sub">Color signals unavailable for this image in this browser. You can still pick details below.</p>'; return;}
  el.innerHTML=`<div class="vs-sw">${s.top.map(c=>`<span style="background:${c.hex}" title="${c.hex} · ${c.pct}%"><i>${c.pct}%</i></span>`).join('')}</div>
   <dl class="vs-meters"><div><dt>Brightness</dt><dd><b style="width:${Math.round(s.brightness*100)}%"></b></dd></div><div><dt>Warmth</dt><dd><b style="width:${Math.round(Math.min(1,Math.max(0,(s.warmth+0.3)/0.6))*100)}%"></b></dd></div><div><dt>Greenery</dt><dd><b style="width:${Math.min(100,Math.round(s.green*250))}%"></b></dd></div></dl>
   <p class="vs-sub">${known?'This is one of the site\'s sample photos, so its tags are known.':esc(suggest(s).room)+(suggest(s).why.length?', '+esc(suggest(s).why.join(', ')):'')+'. Simple color math, not image recognition.'}</p>`;}
function renderTags(sug){const el=$('#vs-tags');
  el.innerHTML=GROUPS.map(([g,label])=>`<div class="vs-tg"><p>${label}</p><div class="chips">${V.tags.vocab[g].map(v=>`<button type="button" class="chip" aria-pressed="${V.sel.has(v)}" data-tag="${esc(v)}">${esc(v)}${sug&&sug.includes(v)?' <em>suggested</em>':''}</button>`).join('')}</div></div>`).join('');}
function setImage(src,key){V.src=src; imgEl.hidden=false; empty.hidden=true; drop.classList.add('has-img'); imgEl.crossOrigin='anonymous';
  imgEl.onload=()=>{const s=analyze(imgEl); V.sig=s; const known=key&&V.tags.images[key];
    V.sel=new Set(known?GROUPS.flatMap(([g])=>known[g]):s?suggest(s).tags:[]);
    renderSignals(s,!!known); renderTags(known?null:(s?suggest(s).tags:[])); $('#vs-sigsub').textContent=known?'Sample image analyzed in your browser.':'Analyzed in your browser: the photo was not uploaded.'; run();
    track('visual_search_image',{source:key?'sample':'upload'});};
  imgEl.src=src;}
function run(){const area=$('#vs-area').value, max=+$('#vs-max').value||0, type=$('#vs-type').value; const S=[...V.sel];
  if(!V.src&&!S.length){$('#vs-count').textContent='Choose a photo to start'; $('#vs-cards').innerHTML=''; return;}
  const rows=D.listings.filter(l=>l.status!=='Under Contract'&&l.type!=='Land'&&(!area||l.hood===area)&&(!max||l.price<=max)&&(!type||l.type===type)).map(l=>{const T=listingTags(l);
    let hit=0; const m=[]; S.forEach(v=>{if(T.has(v)){hit++; m.push(v);} else if((v==='Modern'&&T.has('Contemporary'))||(v==='Contemporary'&&T.has('Modern'))){hit+=0.5; m.push(v+' (close)');}});
    const tagScore=S.length?hit/S.length:0, pal=palSim(l); const score=Math.round((S.length?(V.sig?tagScore*0.8+pal*0.2:tagScore):pal)*100);
    return {l,score,m,miss:S.filter(v=>!T.has(v))};}).filter(r=>r.score>=30).sort((a,b)=>b.score-a.score||a.l.price-b.l.price).slice(0,12);
  $('#vs-count').textContent=rows.length?`${rows.length} sample home${rows.length===1?'':'s'} with this look`+(S.length?'':' (by color only. Tap details to sharpen)'):'No close matches';
  $('#vs-cards').innerHTML=rows.length?rows.map(r=>{let c=SC.card(r.l); c=c.replace('<div class="card-img">',`<div class="card-img"><span class="sca-badge"><span class="match-badge ${r.score>=80?'hi':r.score>=55?'mid':''}">${r.score}% look match</span></span>`);
    return `<div class="sca-item">${c}<p class="vs-why">${r.m.length?'Matches: '+r.m.map(esc).join(', '):'Similar colors'}${r.miss.length?`<br><span>Missing: ${r.miss.slice(0,3).map(esc).join(', ')}</span>`:''}</p></div>`;}).join('')
    :`<div class="empty" style="grid-column:1/-1"><h3>No sample listings share enough of these details</h3><p>Turn off a detail or two, widen the price, or choose “Anywhere”. Nothing is invented to fill the space.</p></div>`;}

fetch('assets/data/visual-tags.json').then(r=>r.json()).then(j=>{V.tags=j;
  $('#vs-samples').innerHTML=j.samples.map(s=>`<button type="button" class="vs-sample" data-img="${s.img}"><img src="assets/img/${s.img}.webp" alt="" loading="lazy"><span>${esc(s.label)}</span></button>`).join('');
  $('#vs-area').insertAdjacentHTML('beforeend',D.hoods.map(h=>`<option value="${h.slug}">${esc(h.name)}</option>`).join(''));
  renderTags(null); renderSignals(null,false); $('#vs-signals').innerHTML='';});
$('#vs-samples').addEventListener('click',e=>{const b=e.target.closest('[data-img]'); if(!b) return; $$('.vs-sample').forEach(x=>x.setAttribute('aria-pressed',x===b)); setImage('assets/img/'+b.dataset.img+'.webp',b.dataset.img);});
$('#vs-tags').addEventListener('click',e=>{const b=e.target.closest('[data-tag]'); if(!b) return; const v=b.dataset.tag; V.sel.has(v)?V.sel.delete(v):V.sel.add(v); b.setAttribute('aria-pressed',V.sel.has(v)); run(); track('visual_search_tag',{tag:v,on:V.sel.has(v)});});
['#vs-area','#vs-max','#vs-type'].forEach(s=>$(s).addEventListener('change',run));
const readFile=f=>{if(!f||!/^image\//.test(f.type)){SC.toast('Choose an image file'); return;} if(f.size>15e6){SC.toast('That image is over 15 MB. Try a smaller one'); return;}
  const r=new FileReader(); r.onload=()=>{$$('.vs-sample').forEach(x=>x.setAttribute('aria-pressed',false)); setImage(r.result,null);}; r.readAsDataURL(f);};
drop.addEventListener('click',()=>file.click()); drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault(); file.click();}});
file.addEventListener('change',()=>readFile(file.files[0]));
drop.addEventListener('dragover',e=>{e.preventDefault(); drop.classList.add('drag');}); drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault(); drop.classList.remove('drag'); readFile(e.dataTransfer.files[0]);});
})();

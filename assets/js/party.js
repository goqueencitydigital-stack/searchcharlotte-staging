/* Search Party, collaborative search preview. Storage: SC.db 'sc_party' {parties:[...],active,viewingAs}.
   Production: Showcase IDX Friends & Family (invite by email, reactions, private vs agent-visible comments) is the
   system of record; voting/shortlist/shared-tour layers come from the Passport API reading the same group. */
(function(){'use strict';
const SC=window.SC; const {D,$,$$,esc,fmt,short,track}=SC; const db=SC.db; const root=$('#sp-root'); if(!root) return;
const RX=[['love','Love',3],['like','Like',2],['maybe','Maybe',1],['no','Not for us',-2]];
const COLORS=['#4A2445','#163B35','#5A3D2B','#9a6a1f','#1E140D','#3d5a80'];
const S=()=>db.get('sc_party',{parties:[],active:null,viewingAs:null})||{parties:[],active:null};
const W=fn=>{const s=S(); fn(s); db.set('sc_party',s); return s;};
const party=()=>{const s=S(); return s.parties.find(p=>p.id===s.active)||null;};
const me=()=>{const p=party(), s=S(); return p&&(p.members.find(m=>m.id===s.viewingAs)||p.members[0]);};
const initials=n=>n.replace(/\(.*?\)/g,'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const av=(m,sz=34)=>`<span class="sp-av" style="background:${m.color};width:${sz}px;height:${sz}px" aria-hidden="true">${esc(initials(m.name))}</span>`;
const scoreOf=(p,id)=>{const r=p.reactions[id]||{}; return Object.values(r).reduce((s,v)=>s+((RX.find(x=>x[0]===v)||[0,0,0])[2]),0);};
const ranked=p=>p.homes.slice().map(id=>({id,score:scoreOf(p,id),votes:Object.keys(p.reactions[id]||{}).length})).sort((a,b)=>b.score-a.score||b.votes-a.votes);
const rel=ts=>{const m=Math.round((Date.now()-new Date(ts))/6e4); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';};
let sort='votes';

const createView=()=>{const u=SC.user()||{}; const s=S();
  root.innerHTML=`<div class="pp-auth"><div class="pp-auth-card"><h2 class="display d-md" style="margin-bottom:6px">Start a Search Party</h2><p style="font-size:13.5px;margin:0 0 16px">Name your party, then invite the people you're deciding with.</p>
   <form class="form" id="sp-new" data-lead="search_party_create" novalidate><div class="field"><label for="sp-pn">Party name</label><input id="sp-pn" name="pname" required placeholder="e.g. The Rivera family search"></div>
    <div class="field"><label for="sp-me">Your name</label><input id="sp-me" name="me" required autocomplete="name" value="${esc([u.first,u.last].filter(Boolean).join(' '))}"></div>
    <label class="pp-check"><input type="checkbox" name="demo" checked><span>Add two simulated members and four sample homes so I can try it</span></label>${SC.honeypot}
    <button class="btn btn-block" type="submit">Create party</button><div class="form-ok">Party created.</div></form>
   ${s.parties.length?`<p class="form-note" style="margin-top:12px">You have ${s.parties.length} other part${s.parties.length>1?'ies':'y'}: ${s.parties.map(p=>`<button class="pp-link" type="button" data-open-party="${p.id}">${esc(p.name)}</button>`).join(', ')}</p>`:''}</div>
   <div><div class="pp-feat">${[['React','Love, like, maybe or not for us, one tap per home'],['Comment','Keep the conversation on the home, not in a group text'],['Vote','Reactions add up into a ranked shortlist'],['Tour & compare','Send the shortlist to Tour Day or Compare Homes'],['Invite your agent','Optional agent access, and agent-visible comments'],['Private by default','Comments stay in your party unless you share them']].map(([a,b])=>`<div><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>
    <p class="form-note" style="margin-top:14px">At launch this runs on Showcase IDX's Friends & Family search: members are invited by email and each creates their own account on SearchCharlotte.com.</p></div></div>`;
  SC.leadForm($('#sp-new'),d=>{const owner={id:SC.uid('m'),name:d.me.trim(),role:'Organizer',color:COLORS[0]}; const members=[owner];
    const p={id:SC.uid('party'),name:d.pname.trim(),created:new Date().toISOString(),members,homes:[],reactions:{},comments:{},agentAccess:false};
    if(d.demo){members.push({id:SC.uid('m'),name:'Alex (simulated)',email:'alex@example.com',role:'Member',color:COLORS[1],invited:true,simulated:true},{id:SC.uid('m'),name:'Sam (simulated)',email:'sam@example.com',role:'Member',color:COLORS[2],invited:true,simulated:true});
      const pool=[...new Set([...SC.saved(),...D.listings.filter(l=>l.type==='Single Family').slice(3,9).map(l=>l.id)])].slice(0,4); p.homes=pool;
      const pat=[['love','like','maybe'],['like','love','no'],['maybe','no','like'],['no','maybe','love']]; pool.forEach((id,i)=>{p.reactions[id]={}; members.forEach((m,j)=>{if(j>0||i<2) p.reactions[id][m.id]=pat[i%4][j];});});
      p.comments[pool[0]]=[{mid:members[1].id,text:'Love the kitchen. Is the yard fenced? (sample comment)',ts:new Date().toISOString(),agent:false}];}
    W(s=>{s.parties.push(p); s.active=p.id; s.viewingAs=owner.id;}); track('search_party_create',{demo:!!d.demo}); SC.notify('Search Party created: '+p.name,'Invite members and start reacting to homes.','party.html'); render(); return 'keep';});};

const homeCard=(p,id,rank)=>{const l=SC.listing(id); if(!l) return ''; const m=me(), mine=(p.reactions[id]||{})[m.id], R=p.reactions[id]||{}, C=p.comments[id]||[];
  const tally=RX.map(([k,lab])=>{const who=p.members.filter(x=>R[x.id]===k); return who.length?`<span title="${esc(who.map(w=>w.name).join(', '))}">${lab} · ${who.map(w=>esc(w.name.split(' ')[0])).join(', ')}</span>`:'';}).join('');
  return `<article class="sp-home" data-home="${id}"><div class="ph"><img src="assets/img/${l.img}.webp" alt="${esc(l.address)}" loading="lazy" width="400" height="250">${rank?`<span class="rank">#${rank} · ${scoreOf(p,id)} pts</span>`:''}</div>
   <div class="bd"><div><h3><a href="listing.html?id=${id}">${esc(l.address)}</a></h3><div class="facts">${fmt(l.price)} · ${esc(SC.facts(l))}</div></div>
    <div class="sp-react" role="group" aria-label="Your reaction as ${esc(m.name)}">${RX.map(([k,lab])=>`<button type="button" data-rx="${k}" aria-pressed="${mine===k}">${lab}</button>`).join('')}</div>
    <div class="sp-tally">${tally||'<span>No reactions yet</span>'}</div>
    <div class="sp-com" aria-label="Comments">${C.map(c=>{const a=p.members.find(x=>x.id===c.mid)||{name:c.mid==='agent'?SC.assignedAgent().name:'Member'}; return `<div class="sp-c ${c.agent?'agent':''}"><b>${esc(a.name)}</b>${c.agent?' · visible to agent':''}, ${esc(c.text)} <small style="color:var(--muted)">${rel(c.ts)}</small></div>`;}).join('')}</div>
    <form class="sp-cf" data-cf><label class="sr-only" for="cf-${id}">Comment on ${esc(l.address)}</label><input type="text" id="cf-${id}" name="c" placeholder="Comment as ${esc(m.name.split(' ')[0])}…" maxlength="400" autocomplete="off"><button class="btn btn-sm" type="submit">Post</button></form>
    ${p.agentAccess?`<label class="pp-check" style="padding:0;font-size:12.5px"><input type="checkbox" data-agentvis> Make my next comment visible to ${esc(SC.assignedAgent().name)}</label>`:''}
    <button class="pp-link" type="button" data-rm-home style="justify-self:start;font-size:12px;color:var(--muted)">Remove from party</button></div></article>`;};

const partyView=()=>{const p=party(), m=me(), s=S(); const R=ranked(p); const homes=sort==='votes'?R.map(x=>x.id):p.homes.slice().reverse();
  const pool=[...new Set([...SC.saved(),...SC.tourList()])].filter(id=>!p.homes.includes(id)&&SC.listing(id));
  const top=R.filter(x=>x.score>0).slice(0,4).map(x=>x.id);
  root.innerHTML=`<div class="sp-bar" style="margin-bottom:18px"><div style="flex:1;min-width:200px"><p class="eyebrow" style="margin:0">Search Party</p><h2 class="display d-md" style="margin:2px 0 0">${esc(p.name)}</h2></div>
    <label class="field" style="margin:0"><span class="lbl">Party</span><select data-switch-party style="height:38px">${s.parties.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="__new">+ New party</option></select></label></div>
   <div class="sp-bar" style="margin-bottom:22px"><span class="lbl" style="margin:0">Viewing as</span><div class="sp-members" role="group" aria-label="Switch member (preview simulation)">${p.members.map(x=>`<button type="button" class="sp-mem" data-as="${x.id}" aria-pressed="${x.id===m.id}">${av(x,28)}<span>${esc(x.name)} <small>${esc(x.role)}${x.invited?' · invite not sent (preview)':''}</small></span></button>`).join('')}</div>
    <button class="btn btn-sm btn-outline" type="button" data-modal="m-invite">Invite someone</button></div>
   <div class="sp-layout"><div>
    <div class="pp-h"><div><h2 class="display d-md">Shared homes</h2><p>${p.homes.length} home${p.homes.length===1?'':'s'} · reacting as <strong>${esc(m.name)}</strong>. Sample data: live MLS data via Showcase IDX at launch.</p></div>
     <div class="seg" role="group" aria-label="Sort homes" style="min-width:220px"><button type="button" data-sort="votes" aria-pressed="${sort==='votes'}">Most votes</button><button type="button" data-sort="recent" aria-pressed="${sort==='recent'}">Recently added</button></div></div>
    ${pool.length?`<div class="chips" style="margin-bottom:16px" aria-label="Add from your saved homes">${pool.slice(0,8).map(id=>{const l=SC.listing(id); return `<button type="button" class="chip" data-add-home="${id}">+ ${esc(l.address)}</button>`;}).join('')}</div>`:''}
    ${p.homes.length?`<div class="sp-homes">${homes.map(id=>homeCard(p,id,sort==='votes'?R.findIndex(x=>x.id===id)+1:0)).join('')}</div>`:`<div class="empty"><h3>No homes in this party yet</h3><p>Save homes from the search and add them here, or add a few sample homes.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-sm" type="button" data-add-samples>Add 4 sample homes</button><a class="btn btn-sm btn-outline" href="search.html">Search homes</a></div></div>`}
   </div>
   <aside class="sp-side"><div class="pp-card"><h3>Shortlist</h3><p style="margin-bottom:12px">Ranked by votes: Love 3 · Like 2 · Maybe 1 · Not for us −2.</p>
     ${top.length?`<ol class="sp-short">${top.map(id=>{const l=SC.listing(id); return `<li><span>${esc(l.address)}</span><b>${scoreOf(p,id)}</b></li>`;}).join('')}</ol>
     <div style="display:grid;gap:8px;margin-top:14px"><a class="btn btn-sm" href="compare.html?ids=${top.join(',')}">Compare the shortlist</a><a class="btn btn-sm btn-outline" href="tour.html?ids=${top.join(',')}">Plan a shared tour</a><button class="btn btn-sm btn-outline" type="button" data-share-party>Copy shortlist link</button></div>`:'<p class="form-note">React to homes to build the shortlist.</p>'}</div>
    <div class="pp-card"><h3>Agent access</h3>
     <label class="pp-switch" style="border:0;padding-bottom:4px"><input type="checkbox" role="switch" data-agent-access ${p.agentAccess?'checked':''}><span><strong>Let ${esc(SC.assignedAgent().name)} see this party</strong><span>Your agent sees homes and reactions. Comments stay private unless marked visible to agent.</span></span></label>
     ${p.agentAccess?`<button class="btn btn-sm btn-outline" type="button" data-agent-connect="message" style="margin-top:8px">Message ${esc(SC.assignedAgent().name.split(' ')[0])} about the shortlist</button>`:''}</div>
    <div class="pp-card"><h3>Members</h3>${p.members.map(x=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0">${av(x)}<span style="flex:1;font-size:13.5px"><strong>${esc(x.name)}</strong><br><small style="color:var(--muted)">${esc(x.role)}${x.email?' · '+esc(x.email):''}</small></span>${x.role!=='Organizer'?`<button class="pp-link" type="button" data-rm-mem="${x.id}" style="font-size:12px">Remove</button>`:''}</div>`).join('')}
     <p class="form-note" style="margin-top:8px">Preview: members are simulated in this tab. Switch “viewing as” to react for them.</p>
     <button class="pp-link" type="button" data-del-party style="margin-top:8px;font-size:12px;color:var(--plum)">Delete this party</button></div></aside></div>`;};

const render=()=>{party()?partyView():createView();};
document.addEventListener('click',e=>{const p=party();
  const op=e.target.closest('[data-open-party]'); if(op){W(s=>{s.active=op.dataset.openParty; const pp=s.parties.find(x=>x.id===s.active); s.viewingAs=pp.members[0].id;}); render(); return;}
  if(!p) return;
  const as=e.target.closest('[data-as]'); if(as){W(s=>{s.viewingAs=as.dataset.as;}); render(); track('search_party_switch_member',{}); return;}
  const so=e.target.closest('[data-sort]'); if(so){sort=so.dataset.sort; render(); return;}
  const rx=e.target.closest('[data-rx]'); if(rx){const id=rx.closest('[data-home]').dataset.home, m=me(); W(s=>{const pp=s.parties.find(x=>x.id===p.id); pp.reactions[id]=pp.reactions[id]||{}; if(pp.reactions[id][m.id]===rx.dataset.rx) delete pp.reactions[id][m.id]; else pp.reactions[id][m.id]=rx.dataset.rx;}); track('search_party_react',{reaction:rx.dataset.rx,listing_id:id}); render(); const b=$(`[data-home="${id}"] [data-rx="${rx.dataset.rx}"]`); b&&b.focus({preventScroll:true}); return;}
  const ah=e.target.closest('[data-add-home]'); if(ah){W(s=>{s.parties.find(x=>x.id===p.id).homes.push(ah.dataset.addHome);}); track('search_party_add_home',{listing_id:ah.dataset.addHome}); render(); return;}
  if(e.target.closest('[data-add-samples]')){W(s=>{const pp=s.parties.find(x=>x.id===p.id); D.listings.filter(l=>l.type==='Single Family').slice(3,7).forEach(l=>{if(!pp.homes.includes(l.id)) pp.homes.push(l.id);});}); render(); return;}
  const rh=e.target.closest('[data-rm-home]'); if(rh){const id=rh.closest('[data-home]').dataset.home; W(s=>{const pp=s.parties.find(x=>x.id===p.id); pp.homes=pp.homes.filter(x=>x!==id);}); render(); return;}
  const rm=e.target.closest('[data-rm-mem]'); if(rm){if(confirm('Remove this member from the party?')){W(s=>{const pp=s.parties.find(x=>x.id===p.id); pp.members=pp.members.filter(x=>x.id!==rm.dataset.rmMem); if(s.viewingAs===rm.dataset.rmMem) s.viewingAs=pp.members[0].id;}); render();} return;}
  if(e.target.closest('[data-del-party]')){if(confirm('Delete this party for everyone? This cannot be undone.')){W(s=>{s.parties=s.parties.filter(x=>x.id!==p.id); s.active=s.parties[0]?s.parties[0].id:null; s.viewingAs=s.parties[0]?s.parties[0].members[0].id:null;}); render();} return;}
  if(e.target.closest('[data-share-party]')){const top=ranked(p).filter(x=>x.score>0).slice(0,4).map(x=>x.id); const url=location.origin+location.pathname.replace('party.html','compare.html')+'?ids='+top.join(','); (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>SC.toast('Shortlist link copied')).catch(()=>prompt('Copy this link',url)); track('search_party_share',{});}
});
document.addEventListener('change',e=>{const p=party(); if(!p) return;
  if(e.target.matches('[data-switch-party]')){if(e.target.value==='__new'){W(s=>{s.active=null;}); render();} else {W(s=>{s.active=e.target.value; s.viewingAs=s.parties.find(x=>x.id===s.active).members[0].id;}); render();}}
  if(e.target.matches('[data-agent-access]')){W(s=>{s.parties.find(x=>x.id===p.id).agentAccess=e.target.checked;}); track('search_party_agent_access',{on:e.target.checked}); SC.toast(e.target.checked?'Agent access on (preview, nothing is shared)':'Agent access off'); render();}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-cf]'); if(!f) return; e.preventDefault(); const p=party(), m=me(); const t=f.c.value.trim(); if(!t) return; const card=f.closest('[data-home]'), id=card.dataset.home; const vis=$('[data-agentvis]',card); const agent=!!(vis&&vis.checked);
  W(s=>{const pp=s.parties.find(x=>x.id===p.id); (pp.comments[id]=pp.comments[id]||[]).push({mid:m.id,text:t,ts:new Date().toISOString(),agent});}); track('search_party_comment',{listing_id:id,agent_visible:agent});
  if(agent) SC.notify('Comment shared with your agent (preview)','Not sent in preview. At launch an agent-visible comment emails your assigned agent.','party.html');
  render(); const inp=$(`#cf-${id}`); inp&&inp.focus({preventScroll:true});});
$('#inv-form').addEventListener('submit',e=>{e.preventDefault(); const f=e.target; if(!f.checkValidity()){f.reportValidity(); return;} const p=party(); if(!p) return;
  W(s=>{const pp=s.parties.find(x=>x.id===p.id); pp.members.push({id:SC.uid('m'),name:f.name.value.trim(),email:f.email.value.trim(),role:'Member',color:COLORS[pp.members.length%COLORS.length],invited:true,simulated:true});});
  track('search_party_invite',{}); f.reset(); $('#m-invite').classList.remove('open'); SC.toast('Member added: invite not sent in preview'); render();});
render();
})();

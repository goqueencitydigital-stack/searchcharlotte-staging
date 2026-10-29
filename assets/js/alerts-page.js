/* alerts.html — standalone alert manager reachable from unsubscribe links: alerts.html?id=<alertId>&unsub=1 */
(function(){'use strict'; const SC=window.SC; const {$,esc,track}=SC;
const q=new URLSearchParams(location.search), id=q.get('id'), unsub=q.get('unsub')==='1', all=q.get('all')==='1';
const mgr=$('#al-mgr'), ban=$('#al-banner');
const paint=()=>SC.alerts.renderManager(mgr,{highlight:id});
const banner=(msg,undo)=>{ban.innerHTML=`<div class="form-ok" style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap"><span>${msg}</span>${undo?'<button class="btn btn-sm btn-outline" type="button" data-undo>Undo</button>':''}</div>`;};
if(all){const prev=SC.alerts.list(); SC.db.set('sc_alerts',prev.map(a=>Object.assign({},a,{active:false}))); track('alert_unsubscribe_all',{via:'link'}); banner('You\'re unsubscribed from all alerts. No more alert emails or texts will be sent.',true);
  ban.addEventListener('click',e=>{if(e.target.closest('[data-undo]')){SC.db.set('sc_alerts',prev); ban.innerHTML=''; paint();}});}
else if(id){const a=SC.alerts.list().find(x=>x.id===id);
  if(!a) banner('We couldn\'t find that alert in this browser tab. It may have been deleted — your other alerts are below.');
  else if(unsub){SC.alerts.update(id,{active:false}); track('alert_unsubscribe',{via:'link',alert_type:a.type}); banner(`Unsubscribed from “${esc(SC.alerts.describe(a))}”. You won't receive this alert anymore.`,true);
    ban.addEventListener('click',e=>{if(e.target.closest('[data-undo]')){SC.alerts.update(id,{active:true}); ban.innerHTML=''; paint(); SC.toast('Alert resumed');}});}}
paint(); SC.alerts.renderSubscribe($('#al-sub'),{source:'alerts_page',onCreate:paint});
if(id){const el=document.getElementById('alert-'+id); el&&setTimeout(()=>el.scrollIntoView({block:'center'}),100);}
})();

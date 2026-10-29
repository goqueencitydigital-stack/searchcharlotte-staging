/* Legacy community / ZIP / town pages: map boundary, sample homes inside it, nearby explorer. */
(function(){'use strict';const SC=window.SC,{D,$,esc,short}=SC; const el=document.getElementById('lg-cfg'); if(!el) return; const c=JSON.parse(el.textContent);
const inPoly=(pt,poly)=>{let ins=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [yi,xi]=poly[i],[yj,xj]=poly[j]; if(((yi>pt[0])!==(yj>pt[0]))&&(pt[1]<(xj-xi)*(pt[0]-yi)/(yj-yi)+xi)) ins=!ins;} return ins;};
const act=D.listings.filter(l=>l.status!=='Under Contract');
let L1=c.polygon?act.filter(l=>inPoly([l.lat,l.lng],c.polygon)):[];
if(c.zip) L1=[...L1,...act.filter(l=>String(l.zip)===String(c.zip)&&!L1.includes(l))];
const rest=act.filter(l=>!L1.includes(l)).map(l=>[SC.miles([c.lat,c.lng],[l.lat,l.lng]),l]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const want={condos:'Condo',townhomes:'Townhouse'}[c.kind]; const pri=a=>want?[...a.filter(l=>l.type===want),...a.filter(l=>l.type!==want)]:a;
const show=(want?pri([...L1,...rest.slice(0,30)]):[...L1,...rest]).slice(0,4); $('#lg-cards').innerHTML=show.map(l=>SC.card(l)).join('');
if(window.L){const m=L.map('lg-map',{scrollWheelZoom:false}); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(m);
  if(c.polygon&&c.polygon.length>2){const pg=L.polygon(c.polygon,{color:'#4A2445',weight:2.5,fillColor:'#4A2445',fillOpacity:.12}).addTo(m); m.fitBounds(pg.getBounds().pad(.35));}
  else{m.setView([c.lat,c.lng],c.approx?12:c.kind==='city'||c.kind==='zip'?13:15); if(c.approx) L.circle([c.lat,c.lng],{radius:2500,color:'#4A2445',weight:1,dashArray:'4 4',fillOpacity:.05}).addTo(m); else L.circleMarker([c.lat,c.lng],{radius:9,color:'#fff',weight:2,fillColor:'#4A2445',fillOpacity:1}).bindTooltip(esc(c.name)).addTo(m);}
  show.forEach(l=>L.marker([l.lat,l.lng],{icon:L.divIcon({className:'pin',html:`<span>${short(l.price)}</span>`,iconSize:null})}).addTo(m).on('click',()=>location.href='listing.html?id='+l.id));}
const nb=document.getElementById('lg-nearby'); if(nb&&SC.nearby) SC.nearby.mount(nb,{lat:c.lat,lng:c.lng,radius:c.radius,name:c.name,polygon:c.polygon});
})();

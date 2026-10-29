/* Search Charlotte AI, conversational search (preview).
   Deterministic in-browser parser: words -> search filters. It never creates listings; every home shown comes
   from SC.D.listings (SAMPLE data). Production: a server-side LLM with function calling constrained to the
   Showcase IDX search API parameters, with this parser kept as the offline/fallback path.
   Public API: SC.ai.parse(text, ctx), SC.ai.apply(criteria, parsed), SC.ai.run(criteria), SC.ai.toSearchQS(criteria),
   SC.ai.describe(criteria), SC.ai.toPrefs(criteria), SC.ai.recommendHoods(criteria), SC.ai.mountLauncher(el),
   SC.ai.voiceButton(inputId). */
(function(){'use strict';
const SC=window.SC, {D,$,$$,esc,fmt,short,track}=SC;
const AI=SC.ai={};
let AMEN=null; SC.amenities.then(a=>{AMEN=a&&Object.keys(a).length?a:null;});
let NB=[]; fetch('assets/data/neighborhoods.json').then(r=>r.ok?r.json():{neighborhoods:[]}).then(j=>{NB=j.neighborhoods||[];}).catch(()=>{});

/* ---------- vocabularies ---------- */
const WORDNUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,single:1,double:2,triple:3,a:1,an:1};
const HOOD_ALIASES={uptown:['uptown','downtown','center city','first ward','third ward','fourth ward'],'south-end':['south end','southend','loso','lower south end'],
  dilworth:['dilworth'],'myers-park':['myers park'],eastover:['eastover'],elizabeth:['elizabeth'],'plaza-midwood':['plaza midwood','midwood'],
  noda:['noda','north davidson'],southpark:['southpark','south park'],ballantyne:['ballantyne'],'south-charlotte':['south charlotte','south clt'],
  'mint-hill':['mint hill'],'union-county':['union county','waxhaw','weddington','marvin','indian trail'],'lake-norman':['lake norman','lkn','cornelius','davidson','huntersville','mooresville']};
const LMK_ALIASES=[['southpark-mall',['southpark mall','south park mall','southpark','south park']],['clt',['the airport','airport','clt','charlotte douglas']],
  ['university-research-park',['university research park','research park']],['unc-charlotte',['unc charlotte','uncc','unc-charlotte','unc']],
  ['atrium-cmc',['atrium health','atrium','carolinas medical center','cmc']],['novant-presbyterian',['novant','presbyterian hospital','presbyterian']],
  ['concord-mills',['concord mills']],['fort-mill',['fort mill']],['lake-norman',['lake norman','davidson']],['ballantyne',['ballantyne']],
  ['south-end',['south end','southend','atherton mill']],['uptown',['uptown','downtown','center city','the city','trade and tryon','trade & tryon']]];
const LMK_SHORT={uptown:'Uptown','southpark-mall':'SouthPark Mall',clt:'CLT airport',ballantyne:'Ballantyne','south-end':'South End','unc-charlotte':'UNC Charlotte','university-research-park':'University Research Park','atrium-cmc':'Atrium Health CMC','novant-presbyterian':'Novant Presbyterian','lake-norman':'Lake Norman','fort-mill':'Fort Mill','concord-mills':'Concord Mills'};
const STYLE_ALIASES=[['Modern Farmhouse',/modern farm ?house|farm ?house/],['Craftsman',/craftsman|bungalow/],['Contemporary',/contemporary/],['Transitional',/transitional/],
  ['Colonial',/colonial/],['Ranch',/\branch\b|one[- ]stor(?:y|ey)|single[- ]stor(?:y|ey)/],['Tudor',/tudor/],['Traditional',/traditional/],['Loft',/\blofts?\b/],
  ['High-rise',/high[- ]?rise/],['Mid-rise',/mid[- ]?rise/],['Garden-style',/garden[- ]style/],['Modern',/\bmodern\b/]];
const TYPE_RE=[['Townhouse',/town ?(?:home|house)s?/],['Condo',/\bcondos?\b|condominiums?|apartments?|\bflats?\b/],['Land',/\bland\b|vacant lots?|buildable lots?|lots? to build|homesites?/],['Single Family',/single[- ]family|detached|\bhouses?\b|stand[- ]alone/]];
const LIFE=[['restaurants',/restaurants?|dining|places to eat|food scene|eat out/,5],['cafes',/coffee|caf[eé]s?|bakery|bakeries/,2],['bars',/\bbars?\b|breweries|brewery|nightlife|pubs?\b/,2],
  ['grocery',/grocer(?:y|ies)|supermarkets?|farmers market/,1],['parks',/\bparks?\b|green ?space|playgrounds?|nature/,1],['trails',/greenways?|\btrails?\b|walking paths?|running paths?|bike paths?/,1],
  ['shopping',/shopping|\bshops\b|stores|retail|\bmalls?\b/,3],['golf',/\bgolf(?: course)?s?\b/,1],['water',/boating|boat access|marinas?|boat ramps?|kayak|paddle/,1],['transit',/light rail|lynx|transit|\btrains?\b|blue line|gold line|streetcar/,1],['fitness',/\bgyms?\b|fitness|yoga|recreation cent/,1],['venues',/live music|\barts\b|theat(?:er|re)s?|museums?|venues?|entertainment/,1],['health',/hospitals?|doctors?|medical|health care|urgent care/,1]];
const FH_RE=/\b(safe|safest|safety|crime|criminal|family[- ]friendly|good schools?|best schools?|top[- ]rated schools?|school ratings?|great schools?|demographics?|diverse|diversity|ethnic|religious|church(?:es)? nearby|retirees|young professionals|good neighborhood for (?:kids|families)|no kids|people like me)\b/;

/* ---------- number helpers ---------- */
const priceOf=(numStr,unit,dollar,force)=>{let v=parseFloat(String(numStr).replace(/,/g,'')); if(isNaN(v)) return null; unit=(unit||'').trim();
  if(/^(m|mm|mil|million)$/.test(unit)) v*=1e6; else if(/^(k|thousand|grand)$/.test(unit)) v*=1e3;
  else if(!/,/.test(numStr)&&v<20&&(dollar||force)) v*=1e6; else if(v<10000&&(dollar||force)) v*=1e3;
  else if(!dollar&&!force&&v<50000) return null;
  return v>=50000&&v<=50e6?Math.round(v):null;};
const NUM='\\$?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(k|mm|m|mil|million|thousand|grand)?\\b';
const wn=s=>s==null?null:(WORDNUM[s]!=null?WORDNUM[s]:parseFloat(s));
const findLmk=s=>{for(const [id,al] of LMK_ALIASES){for(const a of al){if(new RegExp('(^|[^a-z])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(s)) return id;}} return null;};
const titleCase=s=>s.replace(/\b[a-z]/g,c=>c.toUpperCase());
const MINWORDS={ten:10,fifteen:15,twenty:20,'twenty-five':25,thirty:30,'forty-five':45,forty:40,'half an hour':30,'an hour':60};

/* ---------- parser ---------- */
AI.parse=(text,ctx={})=>{
  const raw=String(text||''); let t=' '+raw.toLowerCase().replace(/[’‘]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ')+' ';
  const P={set:{},unset:[],add:{},reset:false,intents:[],notes:[],skip:null,raw};
  const cut=m=>{t=t.replace(m,' ');};
  if(/\b(start over|start again|reset|clear (?:all|everything|my search|the search|filters)|new search|begin again|from scratch)\b/.test(t)){P.reset=true; t=t.replace(/\b(start over|start again|reset|clear (?:all|everything|my search|the search|filters)|new search|begin again|from scratch)\b/g,' ');}
  if(FH_RE.test(t)) P.intents.push('fairhousing');
  if(/\b(save (?:this|my|the)?\s*search|alert me|notify me|email me (?:new|when)|text me when|set up (?:an )?alerts?)\b/.test(t)) P.intents.push('save');
  if(/\b(schedule|showings?|book a tour|tour (?:it|them|these|this)|see (?:it|them|these) in person|tour day)\b/.test(t)) P.intents.push('tour');
  if(/\b(home match|use (?:these|this|it) as my|save (?:these|my) preferences)\b/.test(t)) P.intents.push('prefs');
  if(/^\s*(help|what can you do|how does this work|what can i ask)\b/.test(t)) P.intents.push('help');
  if(/\b(relocat\w*|moving (?:here |to charlotte |to the area |to clt )?from|transferr?ing (?:to|from)|moving to (?:charlotte|the area|clt|the charlotte area)|new to (?:charlotte|the area))\b/.test(t)){P.intents.push('relocate');
    const m=t.match(/\bfrom ((?:[a-z.]+ ){0,2}[a-z.]+?)(?= with | and |,|\.| on | in | for | to | but |\s*$| next | this | budget)/); if(m&&!findLmk(m[1])&&!/\d/.test(m[1])) P.set.relocFrom=titleCase(m[1].trim());}
  /* bare answers to the last follow-up question */
  if(/^\s*(not sure|no preference|skip|any|anywhere|doesn't matter|does not matter|either|no idea|flexible|open)\s*$/.test(t)&&ctx.lastAsk){P.skip=ctx.lastAsk; return P;}
  if(ctx.lastAsk==='budget'){const m=t.match(new RegExp('^\\s*(?:about |around |up to |under )?'+NUM+'\\s*$')); if(m){const v=priceOf(m[1],m[2],true,true); if(v){P.set.budgetMax=v; return P;}}}
  if(ctx.lastAsk==='beds'){const m=t.match(/^\s*(\d|one|two|three|four|five|six)\s*\+?\s*$/); if(m){P.set.beds=wn(m[1]); return P;}}
  /* removals */
  const RM=/\b(?:remove|drop|forget(?: about)?|skip|without|no longer (?:need|want)|(?:i )?(?:don't|do not|dont) (?:need|care about|want|require)|doesn't need|does not need|no need for|take (?:off|out)|get rid of|ignore|lose|clear)\s+(?:the |my |a |any |an )?((?:[a-z0-9$+-]+ ?){1,4})/g;
  let rm; const rmFound=[];
  while((rm=RM.exec(t))){rmFound.push(rm[0]); const f=rm[1];
    const k=[]; if(/pool/.test(f)) k.push('pool'); if(/garage/.test(f)) k.push('garage'); if(/water|lake ?front/.test(f)) k.push('waterfront');
    if(/budget|price|max|cap/.test(f)) k.push('budgetMax'); if(/minimum|floor|luxury/.test(f)) k.push('budgetMin');
    if(/bed/.test(f)) k.push('beds'); if(/bath/.test(f)) k.push('baths'); if(/yard|lot|acre/.test(f)) k.push('acresMin'); if(/sq|square/.test(f)) k.push('sqftMin');
    if(/area|neighborhood|location|place|hood/.test(f)) k.push('areas','near'); if(/commute|drive|minute/.test(f)) k.push('commute');
    if(/style|farmhouse|craftsman|modern|contemporary|ranch|colonial|tudor|traditional|transitional/.test(f)) k.push('styles');
    if(/type|condo|town|house|land/.test(f)) k.push('types'); if(/new construction|new build|new/.test(f)) k.push('newConstruction');
    if(/fence/.test(f)) k.push('fenced'); if(/primary|master/.test(f)) k.push('primaryOnMain');
    if(/restaurant|shop|amenit|lifestyle|coffee|park|trail|grocery|bar|gym/.test(f)) k.push('lifestyle');
    for(const [slug,al] of Object.entries(HOOD_ALIASES)) if(al.some(a=>f.includes(a))) {k.splice(k.indexOf('areas'),k.includes('areas')?2:0); P.unset.push('areas:'+slug);}
    const l=findLmk(f); if(l&&!k.includes('commute')&&!P.unset.some(u=>u.startsWith('areas:'))) k.push('commute');
    P.unset.push(...k);}
  rmFound.forEach(cut);
  if(/\b(?:no|not a|isn't|any) (?:minimum|price floor)\b/.test(t)) P.unset.push('budgetMin');
  if(/\b(?:any|no) (?:budget|price limit)\b/.test(t)) P.unset.push('budgetMax');

  /* commute */
  const lmkGroup='(?:the )?([a-z.&\' -]{2,40}?)(?=[,.;!?]| and | with | under | for | in a | near | that | or |\\s*$)';
  let m=t.match(new RegExp('(?:within|under|less than|no more than|max(?:imum)?|about|around|up to|at most)?\\s*(\\d+|ten|fifteen|twenty-five|twenty|thirty|forty-five|forty|half an hour|an hour)\\s*(?:-|\\s)?(?:min(?:ute)?s?\\b|mins\\b)?(?:\\s*(?:drive|commute|away|by car))?\\s*(?:of|from|to)\\s+'+lmkGroup));
  if(m&&!/min|hour|half/.test(m[0])) m=null;
  if(!m){const m2=t.match(new RegExp('(?:commute|drive)\\s+(?:to|into)\\s+'+'(?:the )?([a-z.&\' -]{2,40}?)\\s+(?:under|within|in|of|less than|at most)\\s*(\\d+|ten|fifteen|twenty|thirty|forty-five)\\s*min')); if(m2) m=[m2[0],m2[2],m2[1]];}
  if(m){const id=findLmk(m[2]); if(id){const mins=MINWORDS[m[1]]||parseInt(m[1]); P.set.commute={id,maxMin:Math.min(90,Math.max(5,mins))}; cut(m[0]);}}
  if(!P.set.commute){const w=t.match(/\b(?:i |we |my (?:wife|husband|partner|spouse) )?(?:work|works|office is|job is|commute)\s+(?:is )?(?:in|at|near|to|by)\s+(?:the )?([a-z.&' -]{2,30}?)(?=[,.;!?]| and | with | so | but |\s*$)/);
    if(w){const id=findLmk(w[1]); if(id){P.set.commute={id,maxMin:25}; P.notes.push(`I set a 25-minute drive to ${LMK_SHORT[id]} as a starting point (estimate). Tell me a different limit anytime.`); cut(w[0]);}}}
  if(!P.set.commute){const c=t.match(/\b(closer|nearer|close|near|next|by|walking distance)\s+(?:to\s+)?(?:the\s+)?([a-z.&' -]{2,30}?)(?=[,.;!?]| and | with | for | under |\s*$)/);
    if(c){const id=findLmk(c[2]); const isHoodOnly=!id; if(id&&!(c[1]!=='closer'&&c[1]!=='nearer'&&Object.values(HOOD_ALIASES).some(al=>al.includes(c[2].trim()))&&!/mall|airport|clt/.test(c[2]))){
      P.set.commute={id,maxMin:15,closer:/closer|nearer/.test(c[1])}; cut(c[0]);} else if(isHoodOnly){/* handled by area/lifestyle */}}}

  /* fair-housing phrases are not used as filters */
  t=t.replace(FH_RE,' ');
  /* price */
  m=t.match(new RegExp('\\b(increase|raise|bump|boost|up|lower|decrease|reduce|drop|cut)\\s+(?:my |the )?(?:budget|max(?:imum)?|price(?: limit)?|price range|ceiling)\\s*(to|by)?\\s*'+NUM));
  if(m){const v=priceOf(m[3],m[4],true,true); if(v){ if(m[2]==='by'){const cur=(ctx.criteria&&ctx.criteria.budgetMax)||0; P.set.budgetMax=/lower|decrease|reduce|drop|cut/.test(m[1])?Math.max(50000,cur-v):cur+v;} else P.set.budgetMax=v; cut(m[0]);}}
  if(!P.set.budgetMax){m=t.match(new RegExp('\\bbetween\\s*'+NUM+'\\s*(?:and|-|to)\\s*'+NUM)) || t.match(new RegExp(NUM+'\\s*(?:-|to)\\s*'+NUM));
    if(m){const hiUnit=m[4]||m[2]; const lo=priceOf(m[1],m[2]||hiUnit,true,true), hi=priceOf(m[3],hiUnit,true,true); if(lo&&hi&&hi>lo&&/\$|k|m|million|thousand|between/.test(m[0])){P.set.budgetMin=lo; P.set.budgetMax=hi; cut(m[0]);}}}
  if(!P.set.budgetMax){m=t.match(new RegExp('\\b(?:under|below|less than|max(?:imum)?(?: of)?|up to|no more than|at most|cap(?:ped)? at|budget(?: is| of| at| around| about| to|:)?|afford|spend(?: up to)?|with(?: a)?(?: budget of)?|have|around|about|roughly|for)\\s*(?:a |my )?(?:budget(?: of)?\\s*)?(?:increased to\\s*)?'+NUM+'(?:\\s*budget)?'));
    if(m){const v=priceOf(m[1],m[2],/\$/.test(m[0]),/budget|afford|spend|under|below|up to|max|at most|no more/.test(m[0])); if(v){P.set.budgetMax=v; if(/around|about|roughly/.test(m[0])) P.notes.push(`I'm using ${short(v)} as your top price.`); cut(m[0]);}}}
  m=t.match(new RegExp('\\b(?:over|above|more than|at least|minimum(?: of)?|starting (?:at|from)|from|min)\\s*'+NUM));
  if(m){const v=priceOf(m[1],m[2],/\$/.test(m[0]),false); if(v){P.set.budgetMin=v; cut(m[0]);}}
  if(!P.set.budgetMax){m=t.match(new RegExp('\\$\\s*(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(k|mm|m|mil|million|thousand)?\\b')) || t.match(/\b(\d+(?:\.\d+)?)\s*(k|million|mil|m)\b(?!\s*(?:sq|square|acre|min))/);
    if(m){const v=priceOf(m[1],m[2],true,false); if(v){P.set.budgetMax=v; cut(m[0]);}}}
  if(/\b(luxury|high[- ]end|upscale|estate homes?|luxurious)\b/.test(t)&&!P.set.budgetMin&&!(ctx.criteria&&ctx.criteria.budgetMin)){P.set.budgetMin=1000000; P.set.luxury=true;
    P.notes.push('I\'m defining “luxury” as a price floor of $1M for this search, that is the only thing the word changes. Want a different floor?'); P.luxuryAsk=true;}
  if(/\b(cheaper|less expensive|lower price|more affordable)\b/.test(t)&&ctx.criteria&&ctx.criteria.budgetMax&&!P.set.budgetMax){P.set.budgetMax=Math.round(ctx.criteria.budgetMax*0.9/5000)*5000; P.notes.push(`I lowered your top price 10% to ${short(P.set.budgetMax)}.`);}

  /* size */
  m=t.match(/\b(?:at least |minimum |min |)(\d|one|two|three|four|five|six)\s*\+?\s*(?:-|\s)?(?:or more\s+)?(?:bed(?:room)?s?|br|bds?)\b/); if(m){P.set.beds=wn(m[1]); cut(m[0]);}
  else if(/\b(more|another|extra|additional) bed(?:room)?s?\b/.test(t)) P.set.beds=((ctx.criteria&&ctx.criteria.beds)||2)+1;
  else if(/\bstudios?\b/.test(t)) P.set.beds=0;
  m=t.match(/\b(\d(?:\.5)?|one|two|three|four|five)\s*\+?\s*(?:-|\s)?(?:or more\s+)?(?:full\s+)?(?:bath(?:room)?s?|ba)\b/); if(m){P.set.baths=wn(m[1]); cut(m[0]);}
  m=t.match(/\b(\d{1,2},?\d{3})\s*\+?\s*(?:sq\.?\s*f(?:ee)?t\.?|square[- ]f(?:ee|oo)t|sf|sqft)/); if(m){P.set.sqftMin=parseInt(m[1].replace(',','')); cut(m[0]);}
  m=t.match(/\b(\d+(?:\.\d+)?|half|quarter|an?|one|two|three|five|ten)\s*(?:-|\s)?(?:an?\s+)?acres?\b/); if(m){P.set.acresMin=m[1]==='half'?0.5:m[1]==='quarter'?0.25:wn(m[1]); cut(m[0]);}
  else if(/\b(big|large|huge|spacious|bigger|larger|private|room for a) (?:back)?(?:yard|lot|garden)s?\b|\bbig backyard\b|\broom to (?:garden|spread out|play)\b|\bland for\b/.test(t)){
    const cur=(ctx.criteria&&ctx.criteria.acresMin)||0; P.set.acresMin=/bigger|larger/.test(t)&&cur?+(cur*1.5).toFixed(2):Math.max(cur,0.4);
    P.notes.push(`I'm reading “${(t.match(/(big|large|huge|spacious|bigger|larger|private) (?:back)?(?:yard|lot|garden)s?|big backyard|room to [a-z]+/)||['a bigger yard'])[0]}” as a lot of at least ${P.set.acresMin} acres, adjust anytime.`);}
  else if(/\bacreage\b/.test(t)) P.set.acresMin=1;

  /* types & styles */
  const types=[]; for(const [ty,re] of TYPE_RE){ if(re.test(t)){types.push(ty); t=t.replace(new RegExp(re.source,'g'),' ');}} if(types.length) P.set.types=types;
  const styles=[]; for(const [st,re] of STYLE_ALIASES){ if(re.test(t)){styles.push(st); if(st==='Modern') styles.push('Contemporary'); t=t.replace(new RegExp(re.source,'g'),' ');}} if(styles.length) P.set.styles=[...new Set(styles)];

  /* features */
  if(/\b(?:with |has |have |a |an |private |in-?ground |swimming )?pools?\b/.test(t)&&!/car ?pool/.test(t)) P.set.pool=true;
  m=t.match(/\b(\d|one|two|three|four|single|double|triple)[- ]?(?:car|bay|vehicle)[- ]garage\b/); if(m) P.set.garage=wn(m[1]);
  else if(/\b(double|triple|single) garage\b/.test(t)) P.set.garage=wn(t.match(/\b(double|triple|single) garage\b/)[1]);
  else if(/\bgarage\b/.test(t)) P.set.garage=Math.max(1,(ctx.criteria&&ctx.criteria.garage)||0);
  if(/\b(waterfront|water ?front|lake ?front|lakeside|on the (?:lake|water)|boat dock|private dock|deep[- ]water)\b/.test(t)) P.set.waterfront=true;
  if(/\b(new construction|new[- ]builds?|newly built|brand[- ]new|builder|to-be-built|newer homes?)\b/.test(t)) P.set.newConstruction=true;
  if(/\bfenced?\b/.test(t)) P.set.fenced=true;
  if(/\b(?:primary|master)(?: bedroom| suite| bed)? (?:on|downstairs|on the) (?:the )?(?:main|first floor|ground floor|main level)\b|\b(?:main[- ]level|first[- ]floor|ground[- ]floor) (?:primary|master)\b|\bprimary down\b/.test(t)) P.set.primaryOnMain=true;
  if(/\b(?:only|just)\b.*\bpools?\b/.test(raw.toLowerCase())) P.set.pool=true;

  /* areas */
  const areas=[]; let tA=t;
  for(const [slug,al] of Object.entries(HOOD_ALIASES)){ for(const a of al.sort((x,y)=>y.length-x.length)){ const re=new RegExp('(^|[^a-z])'+a+'([^a-z]|$)'); if(re.test(tA)){areas.push(slug); tA=tA.replace(re,' '); break;}}}
  if(areas.length) P.set.areas=[...new Set(areas)];
  if(!areas.length&&NB.length){const hit=NB.filter(n=>!D.hoods.some(h=>h.slug===n.slug)).find(n=>new RegExp('(^|[^a-z])'+n.name.toLowerCase().replace(/\s*\(.*\)/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(tA));
    if(hit){P.set.near={slug:hit.slug,name:hit.name,lat:hit.lat,lng:hit.lng,mi:3}; P.notes.push(`${hit.name} isn't one of the preview's sample areas, so I'm searching within about 3 miles of its center (straight-line estimate).`);}}
  if(/\b(also|or|add|as well|too|plus)\b/.test(t)) P.additive=true;

  /* lifestyle */
  const life=[]; const walk=/\bwalk(?:able|ing distance| to)\b/.test(t);
  for(const [cat,re,min] of LIFE) if(re.test(t)) life.push({cat,maxMi:1,min});
  if(walk&&!life.length){life.push({cat:'restaurants',maxMi:1,min:5},{cat:'cafes',maxMi:1,min:1},{cat:'grocery',maxMi:1,min:1}); P.notes.push('“Walkable” here means counts of restaurants, coffee shops and grocery stores within 1 mile (OpenStreetMap data): not a walk score.');}
  if(life.length) P.set.lifestyle=life;
  if(/\b(cheapest|lowest price|least expensive)\b/.test(t)) P.set.sort='price-asc'; else if(/\b(biggest|largest|most space)\b/.test(t)) P.set.sort='sqft-desc'; else if(/\b(newest|most recent)\b/.test(t)) P.set.sort='year-desc';
  return P;};

/* ---------- criteria state ---------- */
AI.empty=()=>({budgetMin:null,budgetMax:null,beds:null,baths:null,sqftMin:null,acresMin:null,types:[],styles:[],areas:[],near:null,pool:false,garage:0,waterfront:false,newConstruction:false,fenced:false,primaryOnMain:false,commute:null,lifestyle:[],sort:null,relocFrom:null,luxury:false});
AI.apply=(c,P)=>{let n=P.reset?AI.empty():JSON.parse(JSON.stringify(c||AI.empty())); const s=P.set;
  P.unset.forEach(k=>{ if(k.startsWith('areas:')){n.areas=n.areas.filter(a=>a!==k.slice(6)); return;} const d=AI.empty()[k]; if(d!==undefined) n[k]=JSON.parse(JSON.stringify(d)); if(k==='budgetMin') n.luxury=false;});
  for(const k of Object.keys(s)){ const v=s[k];
    if(k==='areas'){n.areas=P.additive?[...new Set([...n.areas,...v])]:v; n.near=null;}
    else if(k==='types'||k==='styles'){n[k]=P.additive?[...new Set([...n[k],...v])]:v;}
    else if(k==='lifestyle'){const m={}; [...n.lifestyle,...v].forEach(r=>m[r.cat]=r); n.lifestyle=Object.values(m);}
    else if(k==='commute'){const l=SC.lmk(v.id); let max=v.maxMin; if(v.closer&&n.commute&&n.commute.id===v.id) max=Math.max(8,n.commute.maxMin-5);
      n.commute={id:v.id,label:LMK_SHORT[v.id]||l.name,lat:l.lat,lng:l.lng,maxMin:max}; if(v.closer&&(n.areas.length||n.near)){n.areas=[]; n.near=null; P.notes.push(`I swapped your area filter for a drive-time limit to ${LMK_SHORT[v.id]} so homes in any area that close can show up.`);}}
    else if(k==='near'){n.near=v; n.areas=[];}
    else n[k]=v;}
  if(n.budgetMin&&n.budgetMax&&n.budgetMin>=n.budgetMax){ if(s.budgetMax&&!s.budgetMin){n.budgetMin=null; n.luxury=false;} else if(s.budgetMin) n.budgetMax=null;}
  return n;};
AI.isEmpty=c=>AI.describe(c).length===0;

/* ---------- describe / chips ---------- */
AI.describe=c=>{const out=[]; const add=(key,label)=>out.push({key,label});
  if(c.budgetMin&&c.budgetMax) add('budget',`${short(c.budgetMin)}–${short(c.budgetMax)}`); else if(c.budgetMax) add('budgetMax',`Up to ${short(c.budgetMax)}`); else if(c.budgetMin) add('budgetMin',`${short(c.budgetMin)}+${c.luxury?' (luxury floor)':''}`);
  if(c.beds!=null) add('beds',c.beds===0?'Studio+':`${c.beds}+ beds`); if(c.baths) add('baths',`${c.baths}+ baths`);
  if(c.sqftMin) add('sqftMin',`${c.sqftMin.toLocaleString()}+ sq ft`); if(c.acresMin) add('acresMin',`${c.acresMin}+ acres`);
  c.types.forEach(x=>add('types:'+x,x==='Single Family'?'Houses':x==='Townhouse'?'Townhomes':x==='Condo'?'Condos':'Land')); c.styles.forEach(x=>add('styles:'+x,x+' style'));
  c.areas.forEach(a=>{const h=D.hoods.find(h=>h.slug===a); add('areas:'+a,h?h.name:a);}); if(c.near) add('near',`Near ${c.near.name}`);
  if(c.pool) add('pool','Pool'); if(c.garage) add('garage',`${c.garage}+ car garage`); if(c.waterfront) add('waterfront','Waterfront'); if(c.newConstruction) add('newConstruction','New construction');
  if(c.fenced) add('fenced','Fenced yard'); if(c.primaryOnMain) add('primaryOnMain','Primary on main');
  if(c.commute) add('commute',`≤ ${c.commute.maxMin} min to ${c.commute.label}`);
  c.lifestyle.forEach(r=>add('lifestyle:'+r.cat,`${r.min}+ ${SC.poi.label(r.cat).toLowerCase()} within ${r.maxMi} mi`));
  return out;};
AI.removeKey=(c,key)=>{const n=JSON.parse(JSON.stringify(c)); const [k,v]=key.split(':');
  if(k==='budget'){n.budgetMin=null;n.budgetMax=null;n.luxury=false;} else if(v&&Array.isArray(n[k])) n[k]=k==='lifestyle'?n[k].filter(r=>r.cat!==v):n[k].filter(x=>x!==v);
  else {n[k]=AI.empty()[k]; if(k==='budgetMin') n.luxury=false;} return n;};

/* ---------- matching (sample listings only) ---------- */
const checks=c=>{const C=[]; const x=SC.extras;
  if(c.budgetMax) C.push(['budgetMax',`over ${short(c.budgetMax)}`,l=>l.price<=c.budgetMax]);
  if(c.budgetMin) C.push(['budgetMin',`under ${short(c.budgetMin)}`,l=>l.price>=c.budgetMin]);
  if(c.beds!=null) C.push(['beds',`fewer than ${c.beds} beds`,l=>l.type==='Land'?false:l.beds>=c.beds]);
  if(c.baths) C.push(['baths',`fewer than ${c.baths} baths`,l=>l.baths>=c.baths]);
  if(c.sqftMin) C.push(['sqftMin',`under ${c.sqftMin.toLocaleString()} sq ft`,l=>l.sqft>=c.sqftMin]);
  if(c.acresMin) C.push(['acresMin',`lot under ${c.acresMin} acres`,l=>l.acres>=c.acresMin]);
  if(c.types.length) C.push(['types','different home type',l=>c.types.includes(l.type)]);
  if(c.styles.length) C.push(['styles','different style',l=>c.styles.includes(x(l).style)]);
  if(c.areas.length) C.push(['areas','outside your areas',l=>c.areas.includes(l.hood)]);
  if(c.near) C.push(['near',`more than ${c.near.mi} mi from ${c.near.name}`,l=>SC.miles([l.lat,l.lng],[c.near.lat,c.near.lng])<=c.near.mi]);
  if(c.pool) C.push(['pool','no pool',l=>!!l.pool]);
  if(c.garage) C.push(['garage',`under ${c.garage}-car garage`,l=>(l.garage||0)>=c.garage]);
  if(c.waterfront) C.push(['waterfront','not waterfront',l=>!!l.waterfront]);
  if(c.newConstruction) C.push(['newConstruction','not new construction',l=>l.flag==='New Construction'||l.year>=2024]);
  if(c.fenced) C.push(['fenced','no fenced yard listed (demo)',l=>x(l).fenced]);
  if(c.primaryOnMain) C.push(['primaryOnMain','primary not on main (demo)',l=>x(l).features.includes('Primary on main')]);
  if(c.commute) C.push(['commute',`over ${c.commute.maxMin} min to ${c.commute.label}`,l=>SC.drive([l.lat,l.lng],[c.commute.lat,c.commute.lng]).minutes<=c.commute.maxMin]);
  if(AMEN) c.lifestyle.forEach(r=>C.push(['lifestyle:'+r.cat,`fewer ${SC.poi.label(r.cat).toLowerCase()} nearby`,l=>{const a=AMEN[l.id]&&AMEN[l.id][r.cat]; return !!a&&(r.maxMi<=1?a[0]:a[1])>=r.min;}]));
  return C;};
AI.amenitiesReady=()=>!!AMEN;
const POOL=()=>D.listings.filter(l=>l.status!=='Under Contract');
const sorter=c=>{const p=AI.toPrefs(c); const s=c.sort;
  return (a,b)=>s==='price-asc'?a.price-b.price:s==='sqft-desc'?b.sqft-a.sqft:s==='year-desc'?b.year-a.year:((SC.match(b,p,AMEN)||{score:0}).score-(SC.match(a,p,AMEN)||{score:0}).score)||(a.price-b.price);};
AI.run=c=>{const C=checks(c); const all=POOL(); const matches=[], near=[];
  for(const l of all){const miss=C.filter(k=>!k[2](l)); if(!miss.length) matches.push(l); else if(miss.length===1) near.push({l,miss:miss[0][1],key:miss[0][0]});}
  matches.sort(sorter(c)); near.sort((a,b)=>sorter(c)(a.l,b.l));
  return {matches,near,checks:C.length,total:all.length};};
AI.count=c=>AI.run(c).matches.length;
AI.tradeoffs=c=>{const base=AI.count(c), out=[]; const keys=[...new Set(checks(c).map(k=>k[0]))];
  for(const k of keys){if(k==='budgetMax'&&c.budgetMax) continue; const alt=AI.removeKey(c,k==='types'||k==='styles'||k==='areas'?k:k); if(k==='types') alt.types=[]; if(k==='styles') alt.styles=[]; if(k==='areas') alt.areas=[];
    const n=AI.count(alt); if(n>base) out.push({key:k,n,delta:n-base,label:`Dropping “${(AI.describe(c).find(d=>d.key===k||d.key.startsWith(k+':'))||{label:k}).label}” would show ${n} (${n-base>0?'+':''}${n-base})`});}
  if(c.budgetMax){const up=Math.round(c.budgetMax*1.12/25000)*25000; const n=AI.count(Object.assign({},c,{budgetMax:up})); if(n>base) out.push({key:'budgetUp',n,delta:n-base,value:up,label:`Raising your budget to ${short(up)} adds ${n-base}`});}
  if(c.commute){const n=AI.count(Object.assign({},c,{commute:Object.assign({},c.commute,{maxMin:c.commute.maxMin+10})})); if(n>base) out.push({key:'commuteUp',n,delta:n-base,label:`Allowing ${c.commute.maxMin+10} min to ${c.commute.label} adds ${n-base}`});}
  return out.sort((a,b)=>b.delta-a.delta).slice(0,3);};
AI.toPrefs=c=>({budgetMax:c.budgetMax,budgetMin:c.budgetMin,beds:c.beds||null,baths:c.baths,sqftMin:c.sqftMin,acresMin:c.acresMin,types:c.types,styles:c.styles,areas:c.areas,
  mustHave:{pool:c.pool,garage:c.garage,waterfront:c.waterfront,newConstruction:c.newConstruction,fenced:c.fenced,primaryOnMain:c.primaryOnMain},hoaMax:null,yearMin:null,
  commute:c.commute?{lat:c.commute.lat,lng:c.commute.lng,label:c.commute.label,maxMin:c.commute.maxMin}:null,lifestyle:c.lifestyle});
AI.toSearchQS=c=>{const p=new URLSearchParams(); if(c.areas.length===1) p.set('q',c.areas[0]); if(c.budgetMin) p.set('min',c.budgetMin); if(c.budgetMax) p.set('max',c.budgetMax);
  if(c.beds) p.set('beds',c.beds); if(c.baths) p.set('baths',Math.floor(c.baths)); if(c.types.length) p.set('type',c.types.join(',')); if(c.newConstruction) p.set('flag','New Construction');
  const f=[c.pool&&'pool',c.waterfront&&'waterfront',c.garage&&'garage'].filter(Boolean); if(f.length) p.set('feat',f.join(','));
  if(c.sqftMin) p.set('sqft',c.sqftMin); if(c.acresMin) p.set('lot',c.acresMin); return p.toString();};

/* ---------- relocation: objective neighborhood comparison ---------- */
AI.recommendHoods=c=>{const budget=c.budgetMax;
  return D.hoods.map(h=>{const L=POOL().filter(l=>l.hood===h.slug); if(!L.length) return null; const prices=L.map(l=>l.price);
    const fit=L.filter(l=>(!budget||l.price<=budget)&&(!c.budgetMin||l.price>=c.budgetMin)&&(c.beds==null||l.beds>=c.beds)&&(!c.types.length||c.types.includes(l.type)));
    const d=c.commute?SC.drive([h.lat,h.lng],[c.commute.lat,c.commute.lng]):null;
    let amen=null; if(AMEN&&c.lifestyle.length){amen=c.lifestyle.map(r=>{const v=L.map(l=>(AMEN[l.id]&&AMEN[l.id][r.cat]||[0])[0]); return {cat:r.cat,avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length)};});}
    let score=fit.length/L.length*60+(fit.length?15:0); if(d) score+=d.minutes<=c.commute.maxMin?25:d.minutes<=c.commute.maxMin*1.3?10:-10; if(amen) score+=Math.min(15,amen.reduce((s,a)=>s+Math.min(5,a.avg),0));
    const why=[`${fit.length} of ${L.length} sample listings fit your ${budget?short(budget)+' budget':'criteria'}${c.beds?` and ${c.beds}+ beds`:''} (sample range ${short(Math.min(...prices))}–${short(Math.max(...prices))})`];
    if(d) why.push(`about ${d.minutes} min to ${c.commute.label} (estimate)`);
    if(amen) why.push(amen.map(a=>`~${a.avg} ${SC.poi.label(a.cat).toLowerCase()} within 1 mi`).join(', '));
    why.push('home types: '+[...new Set(L.map(l=>l.type==='Single Family'?'houses':l.type==='Townhouse'?'townhomes':l.type==='Condo'?'condos':'land'))].join(', '));
    return {hood:h,score,fit:fit.length,total:L.length,why};}).filter(Boolean).filter(r=>r.fit>0).sort((a,b)=>b.score-a.score).slice(0,4);};

/* ---------- voice + launcher ---------- */
AI.voiceButton=(inputId,label='Search by voice')=>`<button type="button" class="sca-mic" data-voice="${inputId}" aria-label="${label}" title="${label}">${SC.micIcon}</button>`;
const ensureCSS=()=>{if(!$('link[href$="assets/css/ai.css"]')){const k=document.createElement('link'); k.rel='stylesheet'; k.href='assets/css/ai.css'; document.head.appendChild(k);}};
AI.mountLauncher=(el,opts={})=>{if(!el) return; ensureCSS(); const id='sca-launch-'+Math.random().toString(36).slice(2,7);
  const ex=opts.examples||['3 bed house in Ballantyne under $650K','Townhome within 20 minutes of Uptown','Modern farmhouse with a big backyard'];
  el.innerHTML=`<div class="sca-launch"><form class="sca-launch-form" role="search" action="ai.html"><span class="sca-launch-tag">Search Charlotte AI</span>
    <label class="sr-only" for="${id}">Describe the home you want</label><input id="${id}" name="q" type="text" autocomplete="off" placeholder="Describe your next home in your own words">
    ${AI.voiceButton(id)}<button class="btn btn-sm" type="submit">Ask</button></form>
    <div class="sca-launch-ex">${ex.map(e=>`<button type="button" class="chip">${esc(e)}</button>`).join('')}</div>
    <p class="sca-launch-note">Turns your words into search filters. Results come only from the listing search.</p></div>`;
  const f=$('form',el), inp=$('input',el);
  f.addEventListener('submit',e=>{e.preventDefault(); const q=inp.value.trim(); track('ai_launcher_submit',{has_query:!!q}); location.href='ai.html'+(q?'?q='+encodeURIComponent(q):'');});
  $$('.sca-launch-ex .chip',el).forEach(b=>b.addEventListener('click',()=>{inp.value=b.textContent; f.requestSubmit();}));};

/* =================================================================== */
/* ---------- the assistant page ---------- */
const page=document.body.dataset.page==='ai'&&$('#sca-app'); if(!page) return;
const thread=$('#sca-thread'), form=$('#sca-form'), input=$('#sca-input'), quick=$('#sca-quick');
const S={c:AI.empty(),lastAsk:null,skipped:[],msgs:[],lastCount:null,turns:0};
const persist=()=>{ if(SC.personalized()) SC.db.set('sc_chat',{msgs:S.msgs.slice(-40),c:S.c,skipped:S.skipped,ts:new Date().toISOString()}); };
const scrollThread=()=>{thread.scrollTop=thread.scrollHeight;};
const say=(role,html,opts={})=>{const d=document.createElement('div'); d.className='sca-msg sca-'+role; d.innerHTML=(role==='bot'?'<span class="sca-av" aria-hidden="true">SC</span>':'')+`<div class="sca-bubble">${html}</div>`; thread.appendChild(d);
  if(!opts.noStore) S.msgs.push({role,html}); requestAnimationFrame(scrollThread); return d;};
const setQuick=list=>{quick.innerHTML=(list||[]).map(q=>`<button type="button" class="chip" data-q="${esc(q.send||q)}">${esc(q.label||q)}</button>`).join(''); quick.hidden=!list||!list.length;};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

/* follow-up question: one at a time, budget -> location -> beds */
const nextQuestion=(rel)=>{const c=S.c, sk=S.skipped;
  if(!c.budgetMax&&!c.budgetMin&&!sk.includes('budget')) return {ask:'budget',q:'What\'s the most you\'d like to spend?',chips:[{label:'Up to $400K',send:'up to $400k'},{label:'Up to $600K',send:'up to $600k'},{label:'Up to $850K',send:'up to $850k'},{label:'Up to $1.5M',send:'up to $1.5m'},{label:'Not sure yet',send:'not sure'}]};
  if(!c.areas.length&&!c.commute&&!c.near&&!sk.includes('area')) return rel?
    {ask:'area',q:'Where will you commute to most often? I\'ll compare areas by estimated drive time.',chips:[{label:'Uptown',send:'work in Uptown'},{label:'SouthPark Mall',send:'work near SouthPark Mall'},{label:'Ballantyne',send:'work in Ballantyne'},{label:'The airport',send:'work at the airport'},{label:'Work from home',send:'not sure'}]}:
    {ask:'area',q:'Any part of town in mind, or a place you\'ll drive to often?',chips:[{label:'South Charlotte',send:'in South Charlotte'},{label:'Lake Norman',send:'in Lake Norman'},{label:'Within 20 min of Uptown',send:'within 20 minutes of Uptown'},{label:'Near SouthPark Mall',send:'within 15 minutes of SouthPark Mall'},{label:'Anywhere',send:'anywhere'}]};
  if(c.beds==null&&!(c.types.length===1&&c.types[0]==='Land')&&!sk.includes('beds')) return {ask:'beds',q:'How many bedrooms do you need?',chips:[{label:'2+',send:'2 beds'},{label:'3+',send:'3 beds'},{label:'4+',send:'4 beds'},{label:'5+',send:'5 beds'},{label:'Any',send:'any'}]};
  return null;};

const HELP=`<p>Describe a home the way you'd tell a friend. I can understand:</p><ul class="sca-list"><li>Budget, beds, baths, square feet and lot size</li><li>Home type and style (modern farmhouse, craftsman, contemporary…)</li><li>Pool, garage size, waterfront, new construction, fenced yard</li><li>Areas like Dilworth, Ballantyne or Lake Norman</li><li>Drive time: “within 20 minutes of Uptown” or “closer to the airport” (estimates)</li><li>Nearby places: “near restaurants and shopping” (OpenStreetMap counts)</li></ul><p>Then refine: “raise my budget to $850K”, “only homes with pools”, “remove the pool”, or “start over”.</p>`;

const respond=(text)=>{const prevC=S.c, prevCount=AI.count(prevC), hadCriteria=!AI.isEmpty(prevC);
  const P=AI.parse(text,{criteria:prevC,lastAsk:S.lastAsk}); S.turns++;
  if(P.skip){ S.skipped.push(P.skip==='area'?'area':P.skip); }
  const ints=P.intents; let html='';
  if(ints.includes('help')&&!Object.keys(P.set).length){say('bot',HELP); setQuick(['3 bed house under $600K near Uptown','Condo in South End with a pool','Relocating from Chicago with $700,000']); return;}
  S.c=AI.apply(prevC,P);
  if(P.reset){S.skipped=[]; S.lastAsk=null; if(AI.isEmpty(S.c)){say('bot','<p>Cleared. Tell me about the home you want, and I\'ll start fresh.</p>'); setQuick(['3 bed house under $600K','Townhome near SouthPark','Modern farmhouse with a big backyard']); renderResults(); persist(); return;}}
  const changed=JSON.stringify(prevC)!==JSON.stringify(S.c);
  const R=AI.run(S.c), n=R.matches.length;
  /* fair housing */
  if(ints.includes('fairhousing')) html+=`<p class="sca-fh">I can't search, rank or describe areas by safety, school ratings or who lives there, fair housing rules keep this search to the home and objective facts like price, features, drive time and nearby places. For school assignments, check the school district's official lookup, and for crime data, the local police department's public maps.</p>`;
  if(!changed&&!ints.length&&!P.skip&&!P.notes.length){
    html+=`<p>I didn't find search details in that. Try a budget, bedrooms, an area, a feature like a pool, or a drive-time limit.</p>`; say('bot',html); setQuick(['Under $700K','3+ bedrooms','Within 20 minutes of Uptown','Help']); return;}
  /* what changed */
  if(changed){const was=AI.describe(prevC).map(d=>d.label), now=AI.describe(S.c).map(d=>d.label);
    const added=now.filter(x=>!was.includes(x)), removed=was.filter(x=>!now.includes(x));
    if(hadCriteria&&!P.reset){ const parts=[]; if(added.length) parts.push('added '+added.map(a=>`<b>${esc(a)}</b>`).join(', ')); if(removed.length) parts.push('removed '+removed.map(a=>`<b>${esc(a)}</b>`).join(', '));
      html+=`<p>Updated, ${parts.join('; ')}.</p>`;
      if(prevCount!==n) html+=`<p class="sca-delta">${n<prevCount?'That narrows':'That opens up'} matches from <b>${prevCount}</b> to <b>${n}</b>.</p>`;}
    else html+=`<p>Searching for ${now.map(a=>`<b>${esc(a)}</b>`).join(' · ')}.</p>`;}
  P.notes.forEach(x=>html+=`<p class="sca-note">${esc(x)}</p>`);
  if(S.c.lifestyle.length&&!AMEN) html+=`<p class="sca-note">Nearby-place counts aren't loaded in this preview, so “${S.c.lifestyle.map(r=>SC.poi.label(r.cat).toLowerCase()).join(', ')}” is saved with your search but not used to filter yet.</p>`;
  /* relocation */
  const relKeys=['budgetMax','budgetMin','commute','beds','types','lifestyle'], relChanged=relKeys.some(k=>JSON.stringify(prevC[k])!==JSON.stringify(S.c[k]));
  const rel=ints.includes('relocate')||(!!S.c.relocFrom&&relChanged);
  if(rel&&(S.c.budgetMax||S.c.commute)){const recs=AI.recommendHoods(S.c);
    html+=`<p>${S.c.relocFrom&&ints.includes('relocate')?`Welcome from ${esc(S.c.relocFrom)}. `:''}Here are areas worth a look, compared only on objective inputs, sample listing prices vs. your budget${S.c.commute?', estimated drive time':''}${AMEN&&S.c.lifestyle.length?', nearby place counts':''} and home types:</p>`;
    html+=recs.length?`<ol class="sca-recs">${recs.map(r=>`<li><a href="neighborhoods/${r.hood.slug}/">${esc(r.hood.name)}</a><span>${r.why.map(esc).join(' · ')}</span></li>`).join('')}</ol><p class="sca-note">Based on the preview's sample listings, not market statistics. Live version uses Showcase IDX active-listing counts.</p>`
      :`<p>None of the sample areas have listings within that budget yet. Try a higher budget or a different home type.</p>`;}
  /* results summary */
  const intentOnly=!changed&&ints.some(i=>['save','tour','prefs','fairhousing'].includes(i));
  if(!AI.isEmpty(S.c)&&!intentOnly){
    if(n){html+=`<p>I found <b>${plural(n,'sample listing')}</b> that ${n===1?'matches':'match'} everything. They're ${matchMedia('(max-width:980px)').matches?'below':'on the right'}, best fit first.</p>`;}
    else{html+=`<p><b>No sample listings match all of that.</b> I won't make any up.${R.near.length?` ${plural(R.near.length,'home')} miss${R.near.length===1?'es':''} by one requirement, I've listed those as close matches.`:''}</p>`;}
    const tr=AI.tradeoffs(S.c); if(tr.length&&n<8) html+=`<p class="sca-trade"><span>Tradeoffs</span>${tr.map(x=>esc(x.label)).join('<br>')}</p>`;
  }
  /* intents */
  if(ints.includes('save')) setTimeout(openSave,200);
  if(ints.includes('prefs')) usePrefs();
  if(ints.includes('tour')) html+=`<p>Tap <b>Add to Tour Day</b> on any home, then open <a href="tour.html">Tour Day</a> to request showings. Requests are confirmed by a Search Charlotte agent, nothing is booked automatically.</p>`;
  /* one follow-up */
  const q=P.luxuryAsk?{ask:'luxury',q:'Which price floor fits “luxury” for you?',chips:[{label:'$1M+',send:'over $1m'},{label:'$1.5M+',send:'over $1.5m'},{label:'$2M+',send:'over $2m'},{label:'$3M+',send:'over $3m'}]}:nextQuestion(rel);
  if(q){html+=`<p class="sca-q">${esc(q.q)}</p>`; S.lastAsk=q.ask; setQuick(q.chips);}
  else{S.lastAsk=null; setQuick(n?['Only homes with pools','Raise my budget 10%','Closer to SouthPark','Save this search']:['Remove the area','Raise my budget 10%','Start over']);}
  say('bot',html); S.lastCount=n; renderResults(R); persist();
  track('ai_search_turn',{criteria:AI.describe(S.c).map(d=>d.key).join('|'),results:n,turn:S.turns});};
/* "raise my budget 10%" helper phrase */
const pre=t=>{const m=t.match(/raise my budget (\d+)%/i); if(m&&S.c.budgetMax) return `raise my budget to $${Math.round(S.c.budgetMax*(1+m[1]/100)/5000)*5}k`; if(/^remove the area$/i.test(t)) return 'remove the area and the commute'; return t;};

/* ---------- results panel ---------- */
const res=$('#sca-results'), chipsEl=$('#sca-criteria'), cardsEl=$('#sca-cards'), countEl=$('#sca-count'), nearEl=$('#sca-near'), emptyEl=$('#sca-empty');
let map=null, layer=null;
const initMap=()=>{if(map||!window.L) return; map=L.map('sca-map',{scrollWheelZoom:false,zoomControl:true}).setView([35.2,-80.84],10);
  window.scTiles().addTo(map); layer=L.layerGroup().addTo(map);};
const pinIcon=(l)=>L.divIcon({className:'sca-pin',html:`<span>${short(l.price)}</span>`,iconSize:null});
const itemHTML=(l,miss)=>{let card=SC.card(l); const badge=SC.hasPrefs()?SC.matchBadge(l,AMEN):'';
  const drive=S.c.commute?SC.drive([l.lat,l.lng],[S.c.commute.lat,S.c.commute.lng]):null;
  const extra=`${badge?`<span class="sca-badge">${badge}</span>`:''}${miss?`<span class="sca-miss">Misses: ${esc(miss)}</span>`:''}`;
  card=card.replace('<div class="card-img">','<div class="card-img">'+extra);
  const inTour=SC.tourList().includes(l.id);
  return `<div class="sca-item">${card}<div class="sca-acts">${drive?`<span class="sca-drive">≈${drive.minutes} min to ${esc(S.c.commute.label)} (estimate)</span>`:''}<button type="button" class="sca-act" data-tour="${l.id}" aria-pressed="${inTour}"><span class="on">In Tour Day</span><span class="off">Add to Tour Day</span></button><a class="sca-act" href="listing.html?id=${l.id}#ask-home">Ask this home</a></div></div>`;};
function renderResults(R){R=R||AI.run(S.c); const d=AI.describe(S.c);
  chipsEl.innerHTML=d.length?d.map(x=>`<button type="button" class="sca-crit" data-rm="${esc(x.key)}" aria-label="Remove ${esc(x.label)}">${esc(x.label)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4"/></svg></button>`).join(''):'<span class="sca-crit-empty">Your criteria will appear here as we talk.</span>';
  $('#sca-actions').hidden=!d.length; res.classList.toggle('is-idle',!d.length);
  const n=R.matches.length; countEl.textContent=d.length?`${plural(n,'sample listing')} ${n===1?'matches':'match'}`:'Featured sample listings';
  $('#sca-open-search').href='search.html?'+AI.toSearchQS(S.c);
  const list=d.length?R.matches.slice(0,12):POOL().filter(l=>l.flag==='New Listing'||l.dom<=10).slice(0,6);
  cardsEl.innerHTML=list.map(l=>itemHTML(l)).join('');
  emptyEl.hidden=!(d.length&&!n);
  nearEl.innerHTML=d.length&&R.near.length&&n<6?`<h3 class="sca-h3">Close matches <small>each misses one requirement</small></h3><div class="sca-grid">${R.near.slice(0,4).map(x=>itemHTML(x.l,x.miss)).join('')}</div>`:'';
  if(d.length&&n>12) cardsEl.insertAdjacentHTML('beforeend',`<p class="sca-more">Showing 12 of ${n}. <a href="search.html?${AI.toSearchQS(S.c)}">See all on the map search</a></p>`);
  initMap(); if(map){layer.clearLayers(); const pts=[]; const mapList=[...list,...(n<6?R.near.slice(0,4).map(x=>x.l):[])];
    mapList.forEach(l=>{const m=L.marker([l.lat,l.lng],{icon:pinIcon(l),keyboard:true,title:l.address}).bindPopup(`<a class="pop-card" href="listing.html?id=${l.id}"><img src="assets/img/${l.img}.webp" alt=""><b>${fmt(l.price)}</b><small>${esc(SC.facts(l))}<br>${esc(l.address)} · Sample data</small></a>`); layer.addLayer(m); pts.push([l.lat,l.lng]);});
    if(S.c.commute){const c=S.c.commute; L.circleMarker([c.lat,c.lng],{radius:9,color:'#4A2445',weight:3,fillColor:'#C99A4B',fillOpacity:1}).bindTooltip(c.label,{permanent:true,direction:'top',className:'sca-lmk'}).addTo(layer); pts.push([c.lat,c.lng]);}
    if(S.c.near){L.circle([S.c.near.lat,S.c.near.lng],{radius:S.c.near.mi*1609,color:'#4A2445',weight:1.5,fillOpacity:.05}).addTo(layer); pts.push([S.c.near.lat,S.c.near.lng]);}
    if(pts.length) map.fitBounds(pts,{padding:[30,30],maxZoom:13}); setTimeout(()=>map.invalidateSize(),60);}
}
chipsEl.addEventListener('click',e=>{const b=e.target.closest('[data-rm]'); if(!b) return; const key=b.dataset.rm; const label=b.textContent.trim(); const before=AI.count(S.c);
  S.c=AI.removeKey(S.c,key); const after=AI.count(S.c); say('user',esc('Remove “'+label+'”')); say('bot',`<p>Removed <b>${esc(label)}</b>. ${after!==before?`Matches go from <b>${before}</b> to <b>${after}</b>.`:'Same number of matches.'}</p>`);
  renderResults(); persist(); track('ai_criteria_remove',{key});});

/* ---------- actions ---------- */
function usePrefs(){SC.setPrefs(AI.toPrefs(S.c)); SC.toast('Saved as your Home Match preferences'); track('ai_use_as_prefs',{}); renderResults();
  say('bot',`<p>Done, these criteria are now your Home Match preferences, so homes across the site show a match score. Adjust them anytime in <a href="passport.html">Passport</a>.</p>`);}
$('#sca-prefs').addEventListener('click',usePrefs);
$('#sca-reset').addEventListener('click',()=>{say('user','Start over'); respond('start over');});
const saveM=$('#sca-save');
function openSave(){ if(AI.isEmpty(S.c)){SC.toast('Add a few criteria first'); return;} $('#sv-name').value=AI.describe(S.c).slice(0,4).map(d=>d.label).join(', ');
  $('#sv-summary').textContent=AI.describe(S.c).map(d=>d.label).join(' · '); saveM.querySelector('.form').classList.remove('sent'); saveM.querySelector('[type=submit]').disabled=false; SC.openModal('sca-save');}
$('#sca-save-btn').addEventListener('click',openSave);
const sms=$('#sv-sms'), em=$('#sv-email-on');
const syncCh=()=>{$('#sv-email-f').hidden=!em.checked; $('#sv-email').required=em.checked; $('#sv-phone-f').hidden=!sms.checked; $('#sv-phone').required=sms.checked; $('#sv-smsc').required=sms.checked;};
[sms,em].forEach(x=>x.addEventListener('change',syncCh)); syncCh();
$('#sv-form').addEventListener('submit',e=>{e.preventDefault(); const f=e.target; if(f.website.value) return; if(!f.checkValidity()){f.reportValidity(); return;}
  const entry={id:'s'+Date.now().toString(36),name:$('#sv-name').value.trim()||'My AI search',criteria:S.c,qs:AI.toSearchQS(S.c),source:'search_charlotte_ai',created:new Date().toISOString(),
    alert:{email:em.checked?$('#sv-email').value.trim():false,sms:sms.checked?$('#sv-phone').value.trim():false,smsConsent:sms.checked&&$('#sv-smsc').checked,inapp:$('#sv-inapp').checked,frequency:$('#sv-freq').value}};
  SC.db.update('sc_searches',[],a=>[entry,...a].slice(0,50));
  if(entry.alert.inapp) SC.notify('Search saved: '+entry.name,'Matching sample listings will show here. Live alerts run through Showcase IDX at launch.','ai.html');
  track('save_search',{source:'ai',email:!!entry.alert.email,sms:!!entry.alert.sms,inapp:entry.alert.inapp,frequency:entry.alert.frequency});
  f.classList.add('sent'); f.querySelector('[type=submit]').disabled=true; say('bot',`<p>Saved “${esc(entry.name)}”. ${entry.alert.email||entry.alert.sms||entry.alert.inapp?'Alert preferences are stored with it; you can change or turn them off in <a href="passport.html">Passport</a>.':'No alerts are on: you can add them later in Passport.'}</p>`); persist();});

/* ---------- composer ---------- */
form.addEventListener('submit',e=>{e.preventDefault(); const v=input.value.trim(); if(!v) return; input.value=''; say('user',esc(v)); setQuick([]);
  const typing=say('bot','<span class="sca-typing" aria-label="Thinking"><i></i><i></i><i></i></span>',{noStore:true});
  setTimeout(()=>{typing.remove(); respond(pre(v));},matchMedia('(prefers-reduced-motion: reduce)').matches?0:380);});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); form.requestSubmit();}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-q]'); if(!b) return; input.value=b.dataset.q; form.requestSubmit();});

/* ---------- view toggle, mic, starters ---------- */
$$('.sca-mic',page).forEach(b=>{if(!b.innerHTML.trim()) b.innerHTML=SC.micIcon;});
$$('.sca-viewtog button').forEach(b=>b.addEventListener('click',()=>{$$('.sca-viewtog button').forEach(x=>x.setAttribute('aria-pressed',x===b)); res.dataset.view=b.dataset.view; if(map) setTimeout(()=>map.invalidateSize(),50);}));
res.dataset.view='list';
input.addEventListener('input',()=>{input.style.height='auto'; input.style.height=Math.min(140,input.scrollHeight)+'px';});
const starters=$('#sca-starters'); const hideStarters=()=>{if(S.msgs.length) starters.hidden=true;};
new MutationObserver(hideStarters).observe(thread,{childList:true});
/* ---------- start ---------- */
const personal=SC.personalized(); $('#sca-memory').innerHTML=personal?'Personalization is on: this chat and your criteria are remembered in your <a href="passport.html">Passport</a>. <button type="button" id="sca-forget" class="sca-link">Forget this chat</button>'
  :'This chat isn\'t saved. <a href="passport.html">Turn on personalization in Passport</a> to have Search Charlotte AI remember your criteria.';
const forget=$('#sca-forget'); if(forget) forget.addEventListener('click',()=>{SC.db.set('sc_chat',null); location.reload();});
const saved=personal?SC.db.get('sc_chat',null):null;
if(saved&&saved.msgs&&saved.msgs.length){S.c=Object.assign(AI.empty(),saved.c); S.skipped=saved.skipped||[]; S.msgs=saved.msgs; saved.msgs.forEach(m=>say(m.role,m.html,{noStore:true}));
  say('bot','<p>Welcome back: I kept your criteria from last time. Keep refining, or say “start over”.</p>',{noStore:true}); setQuick(['Show me what\'s new','Start over']);}
else{say('bot',`<p>Hi, I'm Search Charlotte AI. Tell me about the home you want, budget, size, style, the areas you like or how far you'll drive, and I'll turn it into a search of listings.</p><p class="sca-note">In this preview I search 65 sample listings.</p>`,{noStore:true});
  setQuick([]);}
renderResults();
const q0=new URLSearchParams(location.search).get('q'); if(q0){input.value=q0; form.requestSubmit(); history.replaceState(null,'','ai.html');}
document.addEventListener('sc:change',e=>{if(e.detail.key==='sc_tourlist'||e.detail.key==='sc_saved') return;});
SC.amenities.then(()=>{ if(!AI.isEmpty(S.c)) renderResults(); });
})();

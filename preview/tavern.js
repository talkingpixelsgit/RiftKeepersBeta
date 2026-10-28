'use strict';
window.RKTavern=(()=>{
 const {button,select,value}=RKPanels;
 let tab='room',kind='gold',confirming=false,inviteScheduled=false;
 const data=()=>RKParty.state?.tavern,me=()=>RKParty.state?.you?.id;
 const roster=()=>RKParty.state?.roster||{};
 const label=s=>s?((roster()[s.sp]?.name||s.sp)+' · '+s.id.slice(0,6)):'No companion';
 const coin=()=>RKParty.state?.trade?.wallet?.coins||0;
 const blocked=()=>!RKParty.connected||RKParty.busy||!data()?.available;
 const action=(id,text,off=false)=>button('drew:'+id,text,off||blocked());
 const nav=(id,text)=>button('drew:'+id,text);
 const options=list=>list.map(s=>[s.id,label(s)]);
 const stakeText=s=>!s?'Not yet offered':s.kind==='gold'?s.amount+' gold':s.kind==='soul'?label(s.item):(data()?.gear[s.item.kind]?.name||s.item.kind)+' · '+s.item.id.slice(0,6);
 const eligible=p=>p.souls.filter(s=>!s.bound&&s.id!==p.bond);
 function stakePicker(p,k,prefix){
  if(k==='gold')return select(prefix+'-gold','Gold per Keeper',[1,2,3,5,10,20,50,100].map(n=>[n,String(n)]));
  const list=k==='soul'?eligible(p).map(s=>[s.id,label(s)]):p.equipment.map(e=>[e.id,data().gear[e.kind].name+' · '+e.id.slice(0,6)]);
  return list.length?select(prefix+'-item',k==='soul'?'Captured companion to stake':'Equipment to stake',list):'<p class="drew-note">No eligible '+(k==='soul'?'captured companions. Clear the cellar with a captured soul, or switch its soulbond first.':'equipment. Visit Drew’s counter first.')+'</p>';
 }
 function stake(k,prefix,amount){return k==='gold'?{kind:k,amount:amount??Number(value(prefix+'-gold'))}:{kind:k,id:value(prefix+'-item')};}
 function room(p){
  const d=data();
  return '<div class="drew-room"><section class="drew-story"><span class="eyebrow">A LIGHT LEFT ON</span><h2>“I sell a good night’s sleep.<br>I never promised you tomorrow.”</h2><p>Drew puts down a clean glass. Behind him, a blue flame bends toward a locked cellar door. Upstairs: fresh sheets. Downstairs: something scratching at the wards.</p><p>Look around before you leave. The next time you step out of Honest Drew’s, you might not make it back.</p>'+button('patron:open','The stranger at the empty table →')+nav('tab:cellar','The cellar is stirring →')+nav('tab:wagers','Find a Keeper at the wager table →')+'</section><section class="drew-menu"><h2>A bed & a drink</h2><article><h3>'+uiIcon('time')+' A room above the wards</h3><p>3 gold · +15 companion HP for your next cellar hunt. No duel bonus.</p>'+action('bed',p.rested?'Your room is ready':'Take a bed · 3 gold',p.rested||coin()<3||d.held)+'</article>'+Object.entries(d.drinks).map(([id,x])=>'<article><h3>'+uiIcon(id==='tea'?'leaf':'water')+' '+esc(x.name)+'</h3><p>'+esc(x.effect)+'. No duel bonus.</p>'+action('drink:'+id,'Order · '+x.price+' gold',!!p.drink||coin()<x.price||d.held)+'</article>').join('')+'</section></div><section class="drew-dice"><div><span class="eyebrow">DREW’S DICE</span><h2>Low or high?</h2><p>One fair six-sided die. Low is 1–3; high is 4–6. A correct call returns twice your stake. A wrong call loses it. In-game gold only.</p></div><div class="drew-form">'+select('drew-dice-pick','Your call',[['low','Low · 1–3'],['high','High · 4–6']])+select('drew-dice-amount','Dice stake',[1,2,3,5].map(n=>[n,n+' gold']))+action('dice','Call it and roll',d.held||coin()<1)+(p.dice?'<p role="status">Die: <b>'+p.dice.die+'</b> · '+(p.dice.won?'Won ':'Lost ')+p.dice.stake+' gold.</p>':'')+'</div></section>';
 }
 function cellar(p){
  return '<section class="drew-cellar"><span class="eyebrow">SOMETHING UNDER THE FLOORBOARDS</span><h2>Earn a soul worth keeping.</h2><p>Take your Keeper and one companion into the cellar rift. Weaken the wild creature to half health, use your Keeper’s <b>Grasp</b>, then win. Captured companions go into Drew’s collection and can be soulbound or wagered. Clearing the cellar earns 5 gold.</p><p>Your protected starter cannot be lost. Beds and drinks are consumed when a cellar hunt starts. Companion equipment also works here.</p><div class="drew-form">'+select('drew-hunt-fighter','Companion for the cellar',options(p.souls))+action('hunt','Open the cellar door',data().held||p.souls.length>=60)+'</div><p class="drew-note">This collection and its gold are saved by the shared server. Your solo Bag, captured companions and coins remain separate in this playtest.</p></section>';
 }
 const patternName=id=>({vanguard:'Vanguard plate',riftweave:'Riftweave mail',wayfarer:'Wayfarer leathers'}[id]||id);
 function games(p){
  const d=data(),w=RKParty.state.trade.wallet,c=d.contest;
  const reels=p.slots?.reels||['sword','shield','rift'];
  return '<div class="drew-games"><section class="drew-cabinet"><span class="eyebrow">THE THREE FATES</span><h2>A sword, a shield, a chance.</h2><div class="drew-reels" aria-label="'+esc(reels.join(', '))+'">'+reels.map(r=>'<span>'+uiIcon(r)+'<small>'+esc(r)+'</small></span>').join('')+'</div><p>Three independent reels, five equally likely symbols. Three matching symbols return 8× your stake; a pair returns your stake; no match loses it. One spin per choice. In-game gold only.</p><div class="drew-form">'+select('drew-slot-amount','Slot stake',[[1,'1 gold'],[2,'2 gold'],[5,'5 gold']])+action('slots','Review & spin',d.held||coin()<1)+'</div>'+(p.slots?'<p role="status">Last spin: '+p.slots.stake+' gold spent · '+p.slots.payout+' returned.</p>':'')+'</section><section class="drew-chest-game"><span class="eyebrow">DO NOT FEED. DO NOT TRUST.</span><h2>The covered chest</h2><div class="drew-chest" aria-hidden="true"><div class="drew-chest-cloth"></div><span class="drew-warning">KEEP CLOSED</span></div><p>Something knocks against the lid. Drew offers you a ward and takes two careful steps back.</p><p><b>2 gold to try.</b> Pick one of three wards. A matching ward (1 in 3) holds the lid shut and returns 6 gold. A broken ward (2 in 3) starts a cellar battle. Your entry is spent either way. Beds and drinks are consumed if the fight starts; normal cellar capture and victory rewards apply.</p><div class="drew-form">'+select('drew-chest-ward','Seal the chest with',[['shield','Iron ward'],['fire','Ember ward'],['spirit','Soul ward']])+select('drew-chest-fighter','Companion if the ward breaks',options(p.souls))+action('chest','Review & test the ward',d.held||coin()<2||p.souls.length>=60)+'</div>'+(p.chest?'<p role="status">Last ward: '+esc(p.chest.revealed)+' · '+(p.chest.held?'held; 6 gold returned.':'broke; a cellar encounter began.')+'</p>':'')+'</section></div><section class="drew-forge"><span class="eyebrow">THE MIDNIGHT ARMOR EXHIBITION</span><h2>Make something worth coming home in.</h2><p>Today’s theme: <b>'+esc(patternName(c.theme))+'</b>. Make a Doorwatch Vest with <b>3 Road Iron + 2 River Reed</b> from your trade satchel. You keep the armor (+12 companion HP and 6 opening barrier) and earn 10 crafting XP.</p><p>Matching today’s theme and crafting experience help your score; the finish has a random element. Every vest has the same combat stats. Your best score today appears on the board. This playtest contest is an exhibition with no prizes or extra entry fee. Resets at midnight UTC.</p><p>Materials: '+(w.items.ore||0)+' Road Iron · '+(w.items.reed||0)+' River Reed.</p><div class="drew-form">'+select('drew-armor-pattern','Armor pattern',['vanguard','riftweave','wayfarer'].map(k=>[k,patternName(k)]))+action('armor','Forge & enter exhibition',d.held||w.items.ore<3||w.items.reed<2||p.equipment.length>=60)+nav('workshop','Gather materials')+'</div>'+(p.armor?'<p role="status">Your latest work: '+esc(patternName(p.armor.pattern))+' · '+p.armor.score+'/100.</p>':'')+'<ol class="drew-contest">'+c.board.map(e=>'<li><b>'+esc(e.name)+'</b><span>'+esc(patternName(e.pattern))+'</span><strong>'+e.score+'/100</strong></li>').join('')+'</ol>'+(!c.board.length?'<p>The exhibition board is waiting for its first armorer.</p>':'')+'</section>';
 }
 function collection(p){
  const d=data(),bond=p.souls.find(s=>s.id===p.bond);
  return '<section><span class="eyebrow">ONE THREAD, TWO SOULS</span><h2>'+ (bond?'Soulbound: '+esc(label(bond)):'Talk to Drew about soulbinding')+'</h2><p>Keep one active bond. Switch it here whenever you are free. A soulbound companion cannot be wagered until you switch to another.</p><p class="drew-note">Coming later: your soulbound companion determines your first Keeper-and-companion combo ability. Combo combat is not active in this playtest.</p><div class="drew-form">'+select('drew-bond','Your one soulbond',options(p.souls))+action('bond','Set this soulbond',d.held)+'</div><div class="drew-souls">'+p.souls.map(s=>'<article>'+portrait(s.sp)+'<div><h3>'+esc(roster()[s.sp]?.name||s.sp)+'</h3><p>'+esc(s.origin)+' · '+s.id.slice(0,6)+'</p><small>'+(p.bond===s.id?'SOULBOUND · ': '')+(s.bound?'PROTECTED STARTER':'CAPTURED · can be wagered when not soulbound')+'</small></div></article>').join('')+'</div></section><section><h2>Drew’s counter</h2><p>Equipment affects your chosen companion in cellar hunts and wager duels. Equipment put into escrow is unequipped.</p><div class="drew-counter">'+Object.entries(d.gear).filter(([,g])=>Number.isInteger(g.price)).map(([id,g])=>'<article><h3>'+uiIcon(g.icon)+' '+esc(g.name)+'</h3><p>'+esc(g.effect)+'</p>'+action('buy:'+id,'Buy · '+g.price+' gold',coin()<g.price||d.held)+'</article>').join('')+'</div><div class="drew-form">'+select('drew-equip','Companion equipment',[['','No equipment'],...p.equipment.map(e=>[e.id,d.gear[e.kind].name+' · '+e.id.slice(0,6)])])+action('equip','Equip selection',d.held)+'</div><p>Equipped: '+esc(d.gear[p.equipment.find(e=>e.id===p.equipped)?.kind]?.name||'None')+'</p></section>';
 }
 function offers(p){
  const d=data(),id=me();
  return d.offers.slice().reverse().map(o=>{
   const incoming=o.to===id,active=['open','review'].includes(o.status),title=esc(o.fromName)+' ↔ '+esc(o.toName);
   let controls='';
   if(o.status==='open'&&incoming)controls='<div class="drew-form">'+select('drew-fighter:'+o.id,'Your fighter',options(p.souls))+(o.kind==='gold'?'<p>Your stake: '+o.stakes[o.from].amount+' gold.</p>':stakePicker(p,o.kind,'drew-answer:'+o.id))+action('accept:'+o.id,'Review my stake & accept')+'</div>';
   if(o.status==='review'&&!incoming)controls=action('start:'+o.id,'Review both stakes & start duel');
   if(active)controls+=button('drew:cancel:'+o.id,incoming?'Decline & return stakes':'Cancel & return stakes',!RKParty.connected||RKParty.busy);
   if(o.status==='playing')controls+=nav('battle','Return to companion duel');
   return '<article class="drew-offer"><span class="eyebrow">'+esc(o.status)+'</span><h3>'+title+'</h3><dl><dt>'+esc(o.fromName)+' stakes</dt><dd>'+esc(stakeText(o.stakes[o.from]))+'</dd><dt>'+esc(o.toName)+' stakes</dt><dd>'+esc(stakeText(o.stakes[o.to]))+'</dd></dl>'+(o.winner?'<p>Winner: '+esc(o.winner===o.from?o.fromName:o.toName)+'. Both stakes delivered.</p>':'')+(active?'<p>Offer expires after two minutes. No battle begins until both stakes are held and the inviting Keeper confirms.</p>':'')+controls+'</article>';
  }).join('')||'<p>No wagers on your table yet.</p>';
 }
 function wagers(p){
  const d=data(),available=d.people;
  return '<section class="drew-wager-rules"><span class="eyebrow">THE TABLE NEVER FORGETS</span><h2>One companion. One Keeper on each side.</h2><p>Winner keeps both stakes: gold, equipment, or a captured companion. No Keeper attacks, supplies or captures during a duel. Withdrawal or three missed turns forfeits your stake. Draws and expired matches return both stakes.</p><p>Nothing is transferred until the server settles the battle. Neither player can change a held stake. The inviter reviews both exact stakes before the first turn.</p></section>'+(!d.held?'<section><h3>Offer a wager</h3>'+(available.length?'<div class="drew-form">'+select('drew-peer','Keeper at Hall’s Edge',available.map(u=>[u.id,u.name]))+select('drew-fighter','Your fighter',options(p.souls))+select('drew-kind','Wager category',[['gold','Gold'],['equipment','Equipment'],['soul','Captured companion']])+stakePicker(p,kind,'drew-offer')+action('offer','Review & offer wager')+'</div>':'<p>Another enrolled Keeper must be online and free at Hall’s Edge. For a local two-player test, use a second tab with a different session.</p>')+'</section>':'')+'<section><h3>Your wager book</h3>'+offers(p)+'</section>';
 }
 function html(){
  const d=data(),p=d?.profile;
  return '<section class="drew-tavern"><header class="drew-sign"><span class="eyebrow">HALL’S EDGE · FEATURED PLAYTEST DESTINATION</span><h1>Honest Drew’s<br><em>Tavern</em></h1><p>Good beds. Questionable odds. Promises kept.</p><div class="drew-wallet">'+uiIcon('coin')+' '+coin()+' gold in your trade satchel</div></header><div class="drew-topline">'+nav('map','Step outside')+(RKParty.state?.match?nav('battle','Current battle'):'')+(!RKParty.connected?nav('refresh','Reconnect'):'')+'</div>'+(!RKParty.connected?'<p role="alert" class="drew-note">Connection lost. Stakes and turn deadlines remain on the server.</p>':'')+(RKParty.error?'<p role="alert" class="drew-note">'+esc(RKParty.error)+'</p>':'')+(S.loc!=='town'?'<p class="drew-note">Drew’s is at Hall’s Edge. Visit the town before using its services. '+nav('find','Mark Hall’s Edge on the map')+'</p>':'')+(!p?'<section class="drew-welcome"><h2>“Come in. Shut the door behind you.”</h2><p>Drew offers you a protected starter companion and a place at the table. Catch your wagerable companions in the cellar. Your trade satchel supplies the tavern’s gold.</p>'+select('drew-starter','Drew’s protected starter',Object.entries(roster()).map(([id,h])=>[id,h.name]))+button('drew:enroll','Talk to Honest Drew',RKParty.busy||!RKParty.connected||S.loc!=='town'||!!RKParty.state?.party)+'</section>':'<nav class="drew-tabs" aria-label="Tavern rooms">'+[['room','Beds & drinks'],['games','Games & armory'],['cellar','Cellar hunt'],['wagers','Wager table'],['collection','Souls & equipment']].map(([k,t])=>button('drew:tab:'+k,t).replace('<button ','<button aria-pressed="'+(tab===k)+'" ')).join('')+'</nav>'+(p.last?'<p class="drew-note" role="status">'+esc(p.last)+'</p>':'')+(tab==='games'?games(p):tab==='room'?room(p):tab==='cellar'?cellar(p):tab==='wagers'?wagers(p):collection(p)))+'<footer>D-pad / stick: navigate · A / Cross: choose · B / Circle: back · L2 / R2: scroll. Stakes use fictional game gold and items.</footer></section>';
 }
 function draw(force=false){
  if(view!=='tavern'||B)return;
  RKPanels.draw('tavern',html,[data(),RKParty.state?.trade?.wallet,RKParty.connected,RKParty.error,RKParty.busy,tab,kind,S.loc],force);
 }
 async function send(c){return RKParty.command({tavernRevision:data()?.profile?.revision,...c});}
 async function confirm(text,label='Confirm stake'){if(confirming)return false;confirming=true;try{return await ask(text,label);}finally{confirming=false;}}
 document.addEventListener('change',e=>{if(e.target.dataset.rk==='drew-kind'){kind=e.target.value;draw(true);}});
 document.addEventListener('click',async e=>{
  const el=e.target.closest('button[data-rk]');if(!el||el.disabled||!el.dataset.rk.startsWith('drew:'))return;
  const [,a,arg]=el.dataset.rk.split(':');
  if(a==='tab'){tab=arg;draw(true);return;}
  if(a==='map')return go('hunt');
  if(a==='workshop')return go('workshop');
  if(a==='find'){mapSel='town';return go('hunt');}
  if(a==='battle')return go('fellowship');
  if(a==='refresh')return RKParty.refresh();
  if(a==='enroll'){const hero=value('drew-starter');if(!RKParty.state.trade.wallet&&!await RKParty.command({type:'trade_enroll'}))return;return send({type:'tavern_enroll',hero});}
  const p=data()?.profile;if(!p)return;
  const o=data().offers.find(o=>o.id===arg);
  let c={type:'tavern_'+a};
  if(a==='bed'){}
  else if(a==='drink')c.drink=arg;
  else if(a==='buy')c.item=arg;
  else if(a==='equip')c.item=value('drew-equip')||null;
  else if(a==='bond')c.fighter=value('drew-bond');
  else if(a==='hunt'){c.fighter=value('drew-hunt-fighter');await send(c);if(RKParty.connected&&RKParty.state?.match?.tavernHunt)go('fellowship');return;}
  else if(a==='slots'){c.amount=Number(value('drew-slot-amount'));if(!await confirm('Spin for '+c.amount+' gold? Three matching symbols return '+(c.amount*8)+' gold; a pair returns your stake; no match loses it.','Spin once'))return;}
  else if(a==='armor'){c.pattern=value('drew-armor-pattern');if(!await confirm('Consume 3 Road Iron and 2 River Reed to forge a Doorwatch Vest and enter today’s exhibition? All vests have identical combat stats. No contest prizes in this playtest.','Forge this armor'))return;}
  else if(a==='chest'){c.ward=value('drew-chest-ward');c.fighter=value('drew-chest-fighter');if(!await confirm('Spend 2 gold? A matching ward (1 in 3) returns 6 gold. Otherwise a cellar battle starts, consuming any prepared bed and drink bonuses. You can withdraw from the fight, but the entry stays spent.','Test the ward'))return;await send(c);if(RKParty.connected&&RKParty.state?.match?.tavernHunt)go('fellowship');draw(true);return;}
  else if(a==='dice'){c.amount=Number(value('drew-dice-amount'));c.pick=value('drew-dice-pick');if(!await confirm('Call '+c.pick+' with '+c.amount+' gold? You win that amount on a correct call, or lose it on a wrong call.','Roll the die'))return;}
  else if(a==='offer'){
   c.to=value('drew-peer');c.fighter=value('drew-fighter');c.stake=stake(kind,'drew-offer');
   const offered=kind==='gold'?c.stake:{kind,item:(kind==='soul'?p.souls:p.equipment).find(x=>x.id===c.stake.id)};
   if(!offered.amount&&!offered.item)return toast('Choose an eligible stake first.');
   if(!await confirm('Drew will hold '+stakeText(offered)+'. The winner keeps both stakes. Your opponent chooses their stake; you review both before starting.','Hold this stake'))return;
  }else if(['accept','start','cancel'].includes(a)){
   if(!o)return;c.offer=o.id;c.offerRevision=o.revision;
   if(a==='accept'){
    c.fighter=value('drew-fighter:'+o.id);c.stake=stake(o.kind,'drew-answer:'+o.id,o.kind==='gold'?o.stakes[o.from].amount:undefined);
    const offered=o.kind==='gold'?c.stake:{kind:o.kind,item:(o.kind==='soul'?p.souls:p.equipment).find(x=>x.id===c.stake.id)};
    if(!offered.amount&&!offered.item)return toast('Choose an eligible stake first.');
    if(!await confirm('Their stake: '+stakeText(o.stakes[o.from])+'. Your stake: '+stakeText(offered)+'. You can lose this permanently. The inviter must review both before combat.','Accept these stakes'))return;
   }
   if(a==='start'&&!await confirm(o.fromName+' stakes '+stakeText(o.stakes[o.from])+'. '+o.toName+' stakes '+stakeText(o.stakes[o.to])+'. One companion each. Withdrawal or three missed turns forfeits.','Start the wager duel'))return;
  }else return;
  await send(c);draw(true);
 });
 function invitation(){
  if(!S?.arch||S.lv<5||S.rkDrewInvited||view!=='hunt'||B||RUN||EXPLORING||travelling||RKParty.active||padScope())return;
  S.rkDrewInvited=true;saveSoon();
  const o=document.createElement('div');o.className='overlay drew-invitation';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','drew-invite-title');
  o.innerHTML='<section><span class="eyebrow">LEVEL 5 · A LIGHT IN THE WINDOW</span><h2 id="drew-invite-title">Honest Drew’s is open.</h2><p>A voice follows you from the doorway.</p><blockquote>“Look around before you leave. The next time you step out of Honest Drew’s, you might not make it back.”</blockquote><p>Beds upstairs. Drinks at the bar. Captured souls on the wager table. You can go in, or keep exploring what is around you.</p><div>'+button('drew:invite-enter',S.loc==='town'?'Go inside':'Mark Hall’s Edge')+'<button class="btn" data-cancel>Keep exploring</button></div></section>';
  const close=()=>{o.remove();focusFirst();};o.querySelector('[data-cancel]').onclick=close;o.querySelector('[data-rk]').onclick=()=>{close();if(S.loc==='town')go('tavern');else{mapSel='town';go('hunt');}};document.body.appendChild(o);o.querySelector('[data-rk]').focus();
 }
 const old=render;render=function(){old();draw(true);if(!inviteScheduled){inviteScheduled=true;setTimeout(()=>{inviteScheduled=false;invitation();},0);}if(view==='hunt'&&S?.arch&&S.loc==='town'&&!S.tut&&!B&&!document.querySelector('.drew-invite-link'))document.getElementById('main').insertAdjacentHTML('afterbegin','<aside class="drew-invite-link"><div><b>Honest Drew’s Tavern</b><p>Featured playtest · beds, drinks, captured souls & companion wagers.</p></div>'+nav('enter','Step inside')+'</aside>');};
 document.addEventListener('click',e=>{if(e.target.closest('[data-rk="drew:enter"]'))go('tavern');});
 NAV.push(['tavern','fortress','Honest Drew’s']);const oldHub=hubItems;hubItems=function(){const items=oldHub();if(!S?.tut)items.push(['tavern','fortress','Honest Drew’s','Featured playtest']);return items;};
 const oldGo=go;go=function(v){oldGo(v);if(v==='tavern')RKParty.refresh();};
 let nextKnock=Date.now()+12000,chestAnimation=null;
 const stopKnock=()=>{if(chestAnimation)window.RKSound?.clear();chestAnimation?.cancel();chestAnimation=null;};
 function chestKnock(){
  const reduced=SET.motion==='reduced'||SET.motion!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chest=document.querySelector('.drew-chest'),r=chest?.getBoundingClientRect();
  if(view!=='tavern'||tab!=='games'||document.hidden||!document.hasFocus()||!RKParty.connected||RKParty.busy||padScope()||reduced||!r||r.bottom<0||r.top>innerHeight)return false;
  stopKnock();chestAnimation=chest.animate([{transform:'rotate(0)'},{transform:'translateX(-2px) rotate(-1deg)'},{transform:'translateX(2px) rotate(1deg)'},{transform:'translateX(0) rotate(0)'}],{duration:420,iterations:2});
  void window.RKSound?.play('chest',0);if(SET.rumble)rumble('hit');return true;
 }
 setInterval(()=>{if(Date.now()<nextKnock)return;nextKnock=Date.now()+12000+Math.random()*9000;chestKnock();},1000);
 addEventListener('visibilitychange',stopKnock);addEventListener('offline',stopKnock);addEventListener('pagehide',stopKnock);
 addEventListener('blur',stopKnock);matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',stopKnock);
 new MutationObserver(()=>{if(chestAnimation&&(view!=='tavern'||tab!=='games'||padScope()||SET.motion==='reduced'||!chestAnimation.effect?.target?.isConnected))stopKnock();}).observe(document.body,{childList:true,subtree:true});
 return {draw,invitation,stakeText,chestKnock};
})();

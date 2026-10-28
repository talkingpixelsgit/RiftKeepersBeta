'use strict';
const crypto = require('node:crypto'), battle = require('./battle-core.cjs');
const need = (ok, message) => { if (!ok) throw Error(message); };
const gear = {
 wick: {name: 'Drew’s Wick Charm', icon: 'spirit', price: 8, effect: '+8 maximum HP', hp: 8},
 bell: {name: 'Last-Call Bell', icon: 'bell', price: 12, effect: '+2 attack', atk: 2},
 clasp: {name: 'Doorward Clasp', icon: 'shield', price: 10, effect: '10 opening barrier', barrier: 10},
 vest: {name: 'Doorwatch Vest', icon: 'shield', effect: '+12 maximum HP and 6 opening barrier', hp: 12, barrier: 6}
};
const drinks = {
 tea: {name: 'Wayfarer’s Tea', price: 2, effect: '12 opening barrier on your next cellar hunt', barrier: 12},
 stout: {name: 'Midnight Stout', price: 3, effect: '+3 companion attack on your next cellar hunt', atk: 3}
};
function tavernService({getState, now, current, online, randomInt = n => crypto.randomInt(n)}) {
 const state = () => { const s = getState(); s.tavern ??= {players: {}, offers: []}; s.tavern.armor ??= []; return s; };
 const patterns=['vanguard','riftweave','wayfarer'],day=()=>Math.floor(now()/86400000),theme=()=>patterns[day()%patterns.length];
 const profile = id => state().tavern.players[id];
 const wallet = id => state().trade?.wallets[id];
 const name = id => Object.values(state().users).find(u => u.id === id)?.name || 'Keeper';
 const location = id => state().world?.people[id];
 const held = id => state().tavern.offers.some(o => ['open','review','playing'].includes(o.status) && [o.from,o.to].includes(id));
 const free = id => online(id) && location(id)?.loc === 'town' && !location(id)?.busy && !current(id) && !wallet(id)?.cast;
 function touch(id) { profile(id).revision++; }
 function coins(id, amount) { const w = wallet(id); need(w && w.coins + amount >= 0, 'Not enough gold in your trade satchel.'); w.coins += amount; w.revision++; }
 function soul(sp, bound = false, origin = 'Captured in Drew’s cellar') { return {id: crypto.randomUUID(), sp, bound, origin}; }
 function fighter(id, key) { const f = profile(id)?.souls.find(s => s.id === key); need(f && Object.hasOwn(battle.heroes,f.sp), 'Choose a companion you own.'); return {...f}; }
 function reserve(id, stake) {
  need(stake && ['gold','equipment','soul'].includes(stake.kind), 'Choose gold, equipment or a captured companion.');
  if (stake.kind === 'gold') { need(Number.isInteger(stake.amount) && stake.amount >= 1 && stake.amount <= 100, 'Wager 1–100 gold.'); coins(id,-stake.amount); return {kind:'gold',amount:stake.amount}; }
  const p = profile(id), list = stake.kind === 'soul' ? p.souls : p.equipment, i = list.findIndex(x => x.id === stake.id);
  need(i >= 0, 'That stake is no longer in your tavern collection.');
  const item = list[i]; need(stake.kind !== 'soul' || !item.bound, 'Drew’s starter cannot be wagered. Capture a companion in the cellar.');need(stake.kind !== 'soul' || p.bond !== item.id, 'Switch your soulbond before wagering that companion.');
  list.splice(i,1); if (p.equipped === item.id) p.equipped = null;
  return {kind:stake.kind,item:{...item}};
 }
 function deliver(id, stake) {
  if (stake.kind === 'gold') coins(id,stake.amount);
  else (stake.kind === 'soul' ? profile(id).souls : profile(id).equipment).push({...stake.item});
  touch(id);
 }
 function refund(o, status) { if (!['open','review','playing'].includes(o.status)) return; deliver(o.from,o.stakes[o.from]); if (o.stakes[o.to]) deliver(o.to,o.stakes[o.to]); o.status=status; o.revision++; o.ended=now(); }
 function applyGear(m,id) {
  const p=profile(id),item=p.equipment.find(e=>e.id===p.equipped),g=gear[item?.kind],u=m.units.find(u=>u.owner===id&&u.sp!=='keeper');
  if(g&&u){u.hp+=g.hp||0;u.max+=g.hp||0;u.atk+=g.atk||0;u.barrier+=g.barrier||0;u.equipment=g.name;}
 }
 function start(o) {
  need(free(o.from)&&free(o.to),'Both Keepers must be online and free at Hall’s Edge.');
  const id=crypto.randomUUID(),partyId=crypto.randomBytes(5).toString('hex').toUpperCase();
  const m=battle.createPvp(id,o.from,o.to,now(),'tavern',randomInt(2));m.companionsOnly=true;m.partyId=partyId;m.loc='town';m.tavernOffer=o.id;
  const members=[o.from,o.to].map(id=>({id,name:name(id),hero:o.fighters[id].sp,ready:true}));
  for(const u of members){battle.join(m,u.id,now());battle.command(m,u.id,{type:'ready',hero:u.hero,revision:m.revision},now());}
  for(const u of members)applyGear(m,u.id);
  m.wager={id:o.id,status:'playing',stakes:JSON.parse(JSON.stringify(o.stakes))};
  state().matches[id]=m;state().parties[partyId]={id:partyId,leader:o.from,visibility:'private',pvp:'tavern',phase:'expedition',revision:0,activity:'Honest Drew’s companion wager',createdAt:now(),updatedAt:now(),members,matchId:id};
  o.status='playing';o.matchId=id;o.revision++;
 }
 function hunt(u, c) {
  const p=profile(u.id),f=fighter(u.id,c.fighter),species=Object.keys(battle.heroes).filter(s=>!['voth','beast','tibrs'].includes(s)),sp=species[randomInt(species.length)];
  const id=crypto.randomUUID(),partyId=crypto.randomBytes(5).toString('hex').toUpperCase(),m=battle.createPractice(id,u.id,now());
  m.tavernHunt=sp;m.partyId=partyId;m.loc='town';m.encounterName='The rift beneath Drew’s cellar';
  battle.join(m,u.id,now());battle.command(m,u.id,{type:'ready',hero:f.sp,revision:0},now());m.units.find(x=>x.sp==='keeper').name=name(u.id);applyGear(m,u.id);
  const companion=m.units.find(x=>x.owner===u.id&&x.sp!=='keeper');
  if(p.rested){companion.hp+=15;companion.max+=15;p.rested=false;}if(p.drink){const d=drinks[p.drink];companion.atk+=d.atk||0;companion.barrier+=d.barrier||0;p.drink=null;}
  state().matches[id]=m;state().parties[partyId]={id:partyId,leader:u.id,visibility:'private',practice:true,phase:'expedition',revision:0,activity:'Drew’s cellar hunt',createdAt:now(),updatedAt:now(),members:[{id:u.id,name:u.name,hero:f.sp,ready:true}],matchId:id};
  p.last='Weaken the cellar creature below half health. Use your Keeper’s Grasp, then win to keep the captured companion.';
 }
 function tick() {
  let changed=false;
  for(const o of state().tavern.offers){
   if(['open','review'].includes(o.status)&&o.expires<=now()){refund(o,'expired');changed=true;}
   if(o.status==='playing'){
    const m=state().matches[o.matchId];if(!m||!['won','lost','expired'].includes(m.phase))continue;
    if([o.from,o.to].includes(m.winner)){for(const s of Object.values(o.stakes))deliver(m.winner,s);o.status='settled';o.winner=m.winner;o.ended=now();o.revision++;}
    else refund(o,'refunded');
    m.wager={...m.wager,status:o.status,winner:o.winner||null};changed=true;
   }
  }
  for(const m of Object.values(state().matches))if(m.tavernHunt&&!m.tavernSettled&&['won','lost','expired'].includes(m.phase)){
   const u=m.players[0],p=profile(u.id);if(!p)continue;m.tavernSettled=true;m.tavernReward={gold:0,souls:[]};
   if(m.phase==='won'&&!u.left){const captured=u.captures.filter(sp=>Object.hasOwn(battle.heroes,sp));for(const sp of captured){const item=soul(sp);p.souls.push(item);m.tavernReward.souls.push(item);}coins(u.id,5);m.tavernReward.gold=5;p.last=captured.length?'A captured companion and 5 gold are waiting in your tavern collection.':'Cellar cleared: 5 gold. Next time, Grasp before the final blow to keep a companion.';}
   touch(u.id);changed=true;
  }
  return changed;
 }
 function snapshot(u) {
  const entries=state().tavern.armor.filter(e=>e.day===day()).sort((a,b)=>b.score-a.score||a.at-b.at),seen=new Set(),board=entries.filter(e=>{if(seen.has(e.owner))return false;seen.add(e.owner);return true;}).slice(0,20).map(e=>({...e,name:name(e.owner)}));
  return {profile:profile(u.id)||null,gear,drinks,contest:{day:day(),theme:theme(),ends:(day()+1)*86400000,board},people:Object.values(state().users).filter(p=>p.id!==u.id&&profile(p.id)&&free(p.id)&&!held(p.id)).map(p=>({id:p.id,name:p.name})),offers:state().tavern.offers.filter(o=>o.from===u.id||o.to===u.id).slice(-30).map(o=>({...o,fromName:name(o.from),toName:name(o.to)})),available:free(u.id),held:held(u.id)};
 }
 function handle(u,c) {
  if(!String(c.type).startsWith('tavern_'))return false;const s=state();
  need(wallet(u.id),'Collect your trade satchel first.');if(c.type!=='tavern_cancel')need(free(u.id),'Visit Hall’s Edge, put away your fishing line, and finish your current battle first.');
  if(c.type==='tavern_enroll'){need(!profile(u.id),'Drew already knows you.');need(Object.hasOwn(battle.heroes,c.hero),'Choose a starter companion.');s.tavern.players[u.id]={revision:0,souls:[soul(c.hero,true,'Drew’s protected starter')],equipment:[],equipped:null,rested:false,drink:null,last:'A bed, a drink, and a debt-free start. Welcome to Honest Drew’s.'};return true;}
  const p=profile(u.id);need(p,'Introduce yourself to Drew first.');need(c.tavernRevision===p.revision,'Your tavern collection changed. Review it before acting.');
  if(['tavern_cancel','tavern_accept','tavern_start'].includes(c.type)){
   const o=s.tavern.offers.find(o=>o.id===c.offer);need(o&&['open','review'].includes(o.status)&&o.revision===c.offerRevision,'This wager has changed or closed.');need([o.from,o.to].includes(u.id),'This wager belongs to other Keepers.');
   if(c.type==='tavern_cancel'){refund(o,u.id===o.from?'cancelled':'declined');return true;}
   if(c.type==='tavern_accept'){need(u.id===o.to&&o.status==='open','Only the invited Keeper can answer.');need(free(o.from),'The inviting Keeper must be available at Hall’s Edge.');need(c.stake?.kind===o.kind,'Match the wager category.');if(o.kind==='gold')need(c.stake.amount===o.stakes[o.from].amount,'Both Keepers must stake the displayed gold amount.');o.fighters[u.id]=fighter(u.id,c.fighter);o.stakes[u.id]=reserve(u.id,c.stake);o.status='review';o.revision++;p.last='Your stake is held. The inviting Keeper must review both exact stakes before starting.';}
   else {need(u.id===o.from&&o.status==='review','Wait for the other Keeper’s stake, then review both sides.');start(o);}
  }else{
   need(!held(u.id),'Finish or cancel your existing wager first.');
   if(c.type==='tavern_bond'){const f=fighter(u.id,c.fighter);p.bond=f.id;p.last='Soulbound to '+battle.heroes[f.sp].name+'. You can switch this one bond here. Your first companion-specific combo is planned for a later build; combo attacks are not active in this playtest.';}
   else if(c.type==='tavern_bed'){need(!p.rested,'Your bed-rest bonus is already ready.');coins(u.id,-3);p.rested=true;p.last='Fresh sheets, quiet wards. +15 companion HP on your next cellar hunt.';}
   else if(c.type==='tavern_drink'){need(Object.hasOwn(drinks,c.drink),'Choose a drink on Drew’s menu.');need(!p.drink,'Use your current drink bonus on a cellar hunt first.');coins(u.id,-drinks[c.drink].price);p.drink=c.drink;p.last=drinks[c.drink].name+' is ready for your next cellar hunt.';}
   else if(c.type==='tavern_buy'){need(Object.hasOwn(gear,c.item)&&Number.isInteger(gear[c.item].price),'Choose equipment from Drew’s counter.');need(p.equipment.length<60,'Your tavern equipment case is full.');coins(u.id,-gear[c.item].price);p.equipment.push({id:crypto.randomUUID(),kind:c.item});p.last='Bought '+gear[c.item].name+'. Equip it or put it on the wager table.';}
   else if(c.type==='tavern_equip'){need(c.item===null||p.equipment.some(e=>e.id===c.item),'Choose equipment you own.');p.equipped=c.item;p.last=c.item?'Companion equipment fastened.':'Companion equipment removed.';}
   else if(c.type==='tavern_dice'){need(Number.isInteger(c.amount)&&c.amount>=1&&c.amount<=5&&['low','high'].includes(c.pick),'Choose low or high and 1–5 gold.');coins(u.id,-c.amount);const die=1+randomInt(6),won=(die<=3?'low':'high')===c.pick;if(won)coins(u.id,c.amount*2);p.dice={die,pick:c.pick,stake:c.amount,won,at:now()};p.last='Drew rolls '+die+'. '+(won?'You win '+c.amount+' gold.':'You lose '+c.amount+' gold.');}
   else if(c.type==='tavern_slots'){need([1,2,5].includes(c.amount),'Choose a slot stake of 1, 2 or 5 gold.');coins(u.id,-c.amount);const symbols=['sword','shield','flask','spirit','rift'],reels=Array.from({length:3},()=>symbols[randomInt(5)]),distinct=new Set(reels).size,payout=c.amount*(distinct===1?8:distinct===2?1:0);if(payout)coins(u.id,payout);p.slots={id:crypto.randomUUID(),reels,stake:c.amount,payout,at:now()};p.last=distinct===1?'Three matching symbols! '+payout+' gold returned.':distinct===2?'A pair. Your '+c.amount+' gold stake is returned.':'No matching symbols. The cabinet keeps '+c.amount+' gold.';}
   else if(c.type==='tavern_armor'){need(patterns.includes(c.pattern),'Choose a pattern on the armor bench.');need(p.equipment.length<60,'Your tavern equipment case is full.');const w=wallet(u.id);need(w.items.ore>=3&&w.items.reed>=2,'Armor needs 3 Road Iron and 2 River Reed from your trade satchel.');w.items.ore-=3;w.items.reed-=2;w.xp.crafting+=10;w.stats.craft++;w.revision++;const item={id:crypto.randomUUID(),kind:'vest',pattern:c.pattern};p.equipment.push(item);const entry={id:crypto.randomUUID(),owner:u.id,day:day(),pattern:c.pattern,score:Math.min(100,50+randomInt(31)+(c.pattern===theme()?15:0)+Math.min(5,Math.floor(w.xp.crafting/30))),at:now()};const previous=s.tavern.armor.find(e=>e.owner===u.id&&e.day===day());if(!previous||entry.score>previous.score){s.tavern.armor=s.tavern.armor.filter(e=>e.owner!==u.id||e.day!==day());s.tavern.armor.push(entry);}s.tavern.armor=s.tavern.armor.filter(e=>e.day>=day()-1);p.armor=entry;p.last='Doorwatch Vest made. Drew’s judges award '+entry.score+'/100. Your best score appears on today’s exhibition board; all vests have the same combat stats.';}
   else if(c.type==='tavern_chest'){need(['shield','fire','spirit'].includes(c.ward),'Choose a ward before touching the chest.');const f=fighter(u.id,c.fighter);need(p.souls.length<60,'Make room in your companion collection first.');coins(u.id,-2);const revealed=['shield','fire','spirit'][randomInt(3)],held=c.ward===revealed;p.chest={id:crypto.randomUUID(),ward:c.ward,revealed,held,at:now()};if(held){coins(u.id,6);p.last='The '+revealed+' ward holds. Drew slides you 6 gold. The lid stays shut.';}else{hunt(u,{fighter:f.id});const m=state().matches[current(u.id).matchId];m.encounterName='The thing under Drew’s warning sign';p.last='The ward breaks. Something drags you into the cellar rift. Fight or withdraw; the 2 gold entry is spent.';}}
   else if(c.type==='tavern_hunt'){need(p.souls.length<60,'Your companion collection is full.');hunt(u,c);}
   else if(c.type==='tavern_offer'){
    need(c.to!==u.id&&profile(c.to)&&free(c.to)&&!held(c.to),'Choose a free Keeper at Hall’s Edge.');const f=fighter(u.id,c.fighter),stake=reserve(u.id,c.stake);
    s.tavern.offers.push({id:crypto.randomUUID(),from:u.id,to:c.to,kind:stake.kind,stakes:{[u.id]:stake},fighters:{[u.id]:f},status:'open',revision:0,expires:now()+120000,created:now()});p.last='Your stake is held. Drew returns it if the offer is cancelled or expires.';
   }else throw Error('Unknown tavern action.');
  }
  touch(u.id);return true;
 }
 return {handle,snapshot,tick};
}
module.exports={tavernService,gear,drinks};

/* Local world playtest. Area law, invitations and combat eligibility live on the server.
   Movement is still reported by the browser; production must validate travel independently. */
'use strict';
const crypto=require('node:crypto'),battle=require('./battle-core.cjs');
const AREAS=['town','meadow','fen','emberwood','shallows','flats','cliffs','peaks','riftscar','hall','night','clock','star','court','deep','tidew','arena','isl_shore','isl_path','isl_grotto','isl_light','isl_door'];
const law=loc=>['town','meadow','fen','hall',...AREAS.filter(a=>a.startsWith('isl_'))].includes(loc)?'safe':['riftscar','night','clock','star','court','deep','tidew'].includes(loc)?'lawless':'contested';
const need=(v,m)=>{if(!v)throw Error(m);};
function worldService({getState,now,online,current}){
 const state=()=>{const s=getState();s.world??={people:{},chat:[],challenges:[]};return s;};
 const record=uid=>state().world.people[uid];
 const busy=uid=>!!current(uid)||!!record(uid)?.busy;
 const name=uid=>Object.values(state().users).find(u=>u.id===uid)?.name||'Keeper';
 function available(a,b,loc){need(a!==b,'Choose another Keeper.');need(online(a)&&online(b),'That Keeper is offline.');need(record(a)&&record(b)&&record(a).loc===record(b).loc&&(!loc||record(a).loc===loc),'You must be in the same area.');need(!busy(a)&&!busy(b),'Both Keepers must finish or leave their current activity.');}
 function start(a,b,kind){
  const s=state(),id=crypto.randomUUID(),partyId=crypto.randomBytes(5).toString('hex').toUpperCase();
  const match=battle.createPvp(id,a,b,now(),kind,crypto.randomInt(2));match.partyId=partyId;match.loc=record(a).loc;
  const members=[a,b].map(uid=>({id:uid,name:name(uid),hero:record(uid).hero,ready:true}));
  for(const m of members){battle.join(match,m.id,now());battle.command(match,m.id,{type:'ready',hero:m.hero,revision:match.revision},now());}
  for(const u of match.units)if(u.sp==='keeper')u.name=name(u.owner);
  s.matches[id]=match;s.parties[partyId]={id:partyId,leader:a,visibility:'private',pvp:kind,phase:'expedition',revision:0,activity:kind==='duel'?'Duel':'Ambush',createdAt:now(),updatedAt:now(),members,matchId:id};
  s.world.challenges=s.world.challenges.filter(c=>![a,b].includes(c.from)&&![a,b].includes(c.to));
 }
 function snapshot(u){const s=state(),me=record(u.id);if(!me)return null;
  const challenges=s.world.challenges.filter(c=>c.expires>now()&&(c.to===u.id||c.from===u.id));
  return {loc:me.loc,law:law(me.loc),markUntil:me.markUntil||0,hero:me.hero,busy:busy(u.id),
   people:Object.entries(s.world.people).filter(([id,p])=>id!==u.id&&p.loc===me.loc&&online(id)).map(([id,p])=>({id,name:name(id),hero:p.hero,busy:busy(id),marked:(p.markUntil||0)>now(),canAttack:law(me.loc)!=='safe'||(p.markUntil||0)>now()})),
   chat:s.world.chat.filter(m=>m.loc===me.loc).slice(-40),challenges:challenges.map(c=>({...c,fromName:name(c.from),toName:name(c.to)}))};
 }
 function handle(u,c){
  if(!['presence','chat','loadout','challenge','respond','ambush'].includes(c.type))return false;
  const s=state(),world=s.world;world.challenges=world.challenges.filter(c=>c.expires>now());
  if(c.type==='presence'){
   need(AREAS.includes(c.loc),'Unknown area.');need(typeof c.busy==='boolean','Invalid activity.');
   const old=record(u.id),p=current(u.id),fighting=p&&p.phase==='expedition';
   world.people[u.id]={loc:fighting&&old?old.loc:c.loc,busy:c.busy,hero:old?.hero||'voth',markUntil:old?.markUntil||0};
   if(old&&old.loc!==world.people[u.id].loc)world.challenges=world.challenges.filter(i=>i.from!==u.id&&i.to!==u.id);
  }else{
   const me=record(u.id);need(me,'Enter an area first.');
   if(c.type==='chat'){
    need(typeof c.text==='string','Enter a message.');const text=c.text.replace(/[\x00-\x1f<>]/g,'').trim();need(text.length>0&&text.length<=200,'Use 1–200 characters.');
    const last=world.chat.findLast(m=>m.userId===u.id);need(!last||now()-last.at>=750,'Wait a moment before speaking again.');
    world.chat.push({id:crypto.randomUUID(),userId:u.id,name:u.name,loc:me.loc,text,at:now()});world.chat=world.chat.slice(-200);
   }else if(c.type==='loadout'){
    need(!busy(u.id),'Finish or leave your current activity first.');need(Object.hasOwn(battle.heroes,c.hero),'Choose a supported companion.');me.hero=c.hero;
   }else if(c.type==='challenge'){
    available(u.id,c.target);need(world.challenges.length<200,'Too many pending invitations.');need(!world.challenges.some(i=>i.from===u.id),'You already have a pending challenge.');
    world.challenges.push({id:crypto.randomUUID(),from:u.id,to:c.target,loc:me.loc,expires:now()+60000});
   }else if(c.type==='respond'){
    const offer=world.challenges.find(i=>i.id===c.id&&i.to===u.id);need(offer,'That challenge has expired or was answered.');need(['accept','decline'].includes(c.answer),'Accept or decline the challenge.');
    if(c.answer==='accept'){available(offer.from,u.id,offer.loc);start(offer.from,u.id,'duel');}
    else world.challenges=world.challenges.filter(i=>i.id!==offer.id);
   }else if(c.type==='ambush'){
    available(u.id,c.target);const marked=(record(c.target).markUntil||0)>now();need(law(me.loc)!=='safe'||marked,'This is safe ground. Challenge them to a duel.');
    if(law(me.loc)==='contested'&&!marked)me.markUntil=now()+3600000;
    start(u.id,c.target,'ambush');
   }
  }
  return true;
 }
 return {handle,snapshot};
}
module.exports={worldService,law};

/* Local expedition authority: commands carry intent, never client outcomes. */
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),need=(v,m)=>{if(!v)throw Error(m);};
const heroes={voth:{name:'Voth',hp:78,atk:18},beast:{name:'Beast',hp:110,atk:22},tibrs:{name:'Tibrs',hp:70,atk:20}};
const trialRoster=require('./trial-roster.json');Object.assign(heroes,trialRoster);
const kits={
 keeper:[['Rift Lance',30,'enemy','35 damage. Exposes the enemy: the next direct hit deals 25% more.'],['Soul Ward',25,'self','Give your companion 28 barrier (yourself if they are down).']],
 voth:[['Spirit Burst',30,'enemy','32 spirit damage; 51 when charged. Consumes Charge Up.'],['Charge Up',20,'self','Gain 16 barrier. Your next basic attack or damaging ability deals 60% more. Guard and support preserve charge; recharging does not stack.']],
 beast:[['Crushing Blow',30,'enemy','39 damage. Shatters the target’s barrier before striking.'],['Face Me',20,'self','Guard, draw single-target attacks and counter for 10 until your next turn.']],
 tibrs:[['Firebrand',30,'enemy','24 damage. Burns for 8 damage on each of the next two enemy turns.'],['Wildfire',40,'all','20 damage to every enemy. Consumes each burn for 18 extra damage.']]
};
for(const [id,h] of Object.entries(trialRoster)){const [support,signature]=h.sourceMoves.slice(2),area=signature.t==='dmgAll',heal=signature.t==='healAll';kits[id]=[[signature.n,id==='ticktail'?60:40,area?'all':heal?'self':'enemy',heal?'Restore 25% max HP to all living allies.':`${Math.round(signature.p*.62)} ${signature.el} damage${area?' to every enemy':''}.`],[support.n,20,'self',support.t==='heal'?'Restore 32% max HP to the most wounded living ally.':'Gain barrier equal to 28% of your max HP. Does not stack.']];}
function create(id,host,guest,now){need(host&&guest&&host!==guest,'Invite another Keeper');return base(id,[host,guest],now,false);}
function createPvp(id,host,guest,now,kind='duel',first=0){const s=create(id,host,guest,now);s.pvp=kind;s.mode=kind;s.first=first===1?1:0;return s;}
function createPractice(id,host,now){need(host,'Choose a Keeper');return base(id,[host],now,true);}
function encounter(s,index){need(s.phase==='lobby'&&!s.pvp,'Choose an encounter before the battle.');need([0,1,2].includes(index),'Unknown encounter');s.encounter=index;s.encounterName=['Fracture Watch','Bellfrey Road Patrol','Ash Road Ambush'][index];}
function createTeams(id,teams,now){need(Array.isArray(teams)&&teams.length===2&&teams.every(t=>Array.isArray(t)&&t.length===2)&&new Set(teams.flat()).size===4,'Two distinct Keepers per team required');const ids=[teams[0][0],teams[1][0],teams[0][1],teams[1][1]],s=base(id,ids,now,false);s.pvp='guild';s.mode='guild';s.teamByUser=Object.fromEntries(teams.flatMap((t,i)=>t.map(uid=>[uid,'team'+i])));return s;}
function base(id,ids,now,practice){return {id,mode:practice?'practice':'coop_trial',practice,rules:{friendlyFire:false,turnMs:30000},phase:'lobby',revision:0,turn:0,round:1,players:ids.map(id=>({id,ready:false,hero:'voth',online:false,lastSeen:now})),units:[],events:[],receipts:{},deadline:now+300000,created:now,ended:0};}
function emit(s,type,data={}){s.eventSeq=(s.eventSeq||0)+1;s.events.push({seq:s.eventSeq,type,...data});if(s.events.length>40)s.events.shift();}
function player(s,uid){const p=s.players.find(p=>p.id===uid);need(p,'Private rift: you are not invited');return p;}
function join(s,uid,now){const p=player(s,uid);need(!p.left,'You left this rift');need(s.phase!=='expired','Rift expired');p.online=true;p.lastSeen=now;}
function unit(id,owner,name,hp,atk,sp='keeper'){return {id,owner,team:owner?'keepers':'rift',name,hp,max:hp,atk,sp,guard:false,energy:100,barrier:0,charged:false,taunt:false,burn:0,exposed:false,evolved:false,low:false,ko:false,step:0};}
const opponents=(s,u)=>s.units.filter(t=>t.team!==u.team&&t.hp>0);
const alive=(s,team)=>s.units.filter(u=>u.team===team&&u.hp>0);
function start(s,now){s.units=[];s.players.forEach((p,i)=>{const h=heroes[p.hero];if(!s.companionsOnly)s.units.push(unit('k'+i,p.id,'Keeper '+(i+1),100,20));s.units.push(unit('c'+i,p.id,h.name,h.hp,h.atk,p.hero));p.captures=[];p.supplies={tonic:s.companionsOnly?0:1,ether:s.companionsOnly?0:1};p.left=false;});if(s.pvp)s.units.forEach(u=>u.team=s.teamByUser?.[u.owner]||u.owner);else if(s.patronQuest){const ferry=s.patronQuest.stage==='ferry';s.units.push(unit('e0',null,ferry?'The Borrowed Witness':'The Collector',ferry?90:148,ferry?12:17,ferry?'hollowknave':'warden'));if(ferry)s.units.at(-1).enemyKit='halberd';}else if(s.tavernHunt){s.units.push(unit('e0',null,heroes[s.tavernHunt].name,64,12,s.tavernHunt));s.units.at(-1).enemyKit='halberd';}else s.units.push(unit('e0',null,'Rift Husk',s.practice?80:120,16,'husk'),unit('e1',null,'Fracture Warden',s.practice?140:220,21,'warden'));if(!s.pvp&&!s.tavernHunt&&!s.patronQuest)configureEnemies(s);s.phase='battle';s.active=(s.companionsOnly?'c':'k')+(s.first||0);s.deadline=now+30000;planEnemies(s);emit(s,'start');}
function configureEnemies(s){const [a,b]=s.units.filter(u=>u.team==='rift'),scale=s.practice?1:1.4;
 a.weapon={name:'Hollow guard blade',icon:'sword'};b.weapon={name:'Fracture arm-cannon',icon:'lightning'};
 if(s.encounter===1){Object.assign(a,{name:'Gate Halberdier',enemyKit:'halberd',hp:Math.round(90*scale),max:Math.round(90*scale),weapon:{name:'Bellfrey hook-halberd',icon:'sword'}});Object.assign(b,{name:'Clockwork Marksman',enemyKit:'marksman',hp:Math.round(125*scale),max:Math.round(125*scale),weapon:{name:'Watchman arm-cannon',icon:'lightning'}});}
 if(s.encounter===2){Object.assign(a,{name:'Cinder Slinger',sp:'sootling',enemyKit:'cinder',hp:Math.round(75*scale),max:Math.round(75*scale),weapon:{name:'Coal sling',icon:'fire'}});Object.assign(b,{name:'Ash Shieldbearer',sp:'hollowknave',enemyKit:'shield',hp:Math.round(150*scale),max:Math.round(150*scale),weapon:{name:'Ash pike and tower shield',icon:'shield'}});}
}
function evolve(s){for(const u of s.units){if(u.hp<=0||u.evolved)continue;
 if(u.sp==='voth'&&u.hp/u.max<.1){u.evolved=true;u.low=true;u.form='voth2';u.name='Voth — Unbroken';emit(s,'evolve',{unit:u.id,name:u.name,form:u.form});}
 if(u.sp==='beast'&&u.hp/u.max<.25&&s.units.filter(x=>x.team===u.team&&x.hp>0&&x.sp!=='keeper'&&!x.summonOf).length===1){u.evolved=true;u.atk+=10;u.form='beast_awakened';u.name='Beast — Unchained';emit(s,'evolve',{unit:u.id,name:u.name,form:u.form});}
}}

function breakFracture(s,u){if(!s.pvp&&u.hp>0&&(u.intent?.label==='Fracture Bolt'||u.intent?.interruptible)){const label=u.intent.label;u.intent={label:u.enemyKit==='marksman'?'Aim Broken':'Fracture Falters',stagger:true};emit(s,'stagger',{unit:u.id,label:'Barrier broken — '+label+' interrupted'});}}
function damage(s,u,n,{direct=true,source=null,counterable=true}={}){
 if(u.hp<=0)return;
 if(direct&&u.exposed){n*=1.25;u.exposed=false;}
 n=Math.max(1,Math.round(n*(direct&&u.guard?.5:1)));
 const absorbed=Math.min(u.barrier||0,n);u.barrier=(u.barrier||0)-absorbed;n-=absorbed;
 if(direct&&absorbed>0&&u.barrier===0)breakFracture(s,u);
 const dealt=Math.min(u.hp,n);u.hp-=dealt;
 if(u.sp==='voth'&&u.hp>0&&u.hp/u.max<.1)u.low=true;
 if(u.hp===0){u.ko=true;u.low=false;u.charged=false;u.taunt=false;u.burn=0;u.barrier=0;u.exposed=false;u.guard=false;}
 emit(s,'damage',{unit:u.id,amount:dealt,absorbed,source});evolve(s);
 const attacker=s.units.find(a=>a.id===source);if(s.pvp&&direct&&counterable&&u.taunt&&u.hp>0&&attacker&&attacker.team!==u.team)damage(s,attacker,10,{direct:false,source:'counter'});
}
function finish(s,now){
 if(['won','lost','expired'].includes(s.phase))return true;
 const teams=[...new Set(s.units.filter(u=>u.hp>0).map(u=>u.team))];
 const win=s.pvp?teams.length===1:!alive(s,'rift').length,lose=s.pvp?teams.length===0:!alive(s,'keepers').length;if(!win&&!lose)return false;
 if(s.pvp)s.winner=win?teams[0]:null;
 s.phase=win?'won':'lost';s.ended=now;
 s.units.forEach(u=>{if(u.sp==='voth'&&u.low&&u.hp>0&&!u.ko&&!u.evolved){u.evolved=true;emit(s,'evolve',{unit:u.id,name:'Voth — Unbroken'});}});
 s.players.forEach(p=>{if(!s.receipts[p.id])s.receipts[p.id]={battleId:s.id,userId:p.id,trial:true,coins:win&&!p.left&&!s.practice&&!s.pvp?20:0,captures:win&&!p.left&&(!s.practice||s.tavernHunt)&&!s.pvp?p.captures:[],persistedToGame:false};});emit(s,s.phase);return true;
}
function intendedTarget(s){return alive(s,'keepers').find(a=>a.taunt)||alive(s,'keepers').slice().sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];}
function planEnemies(s){for(const u of alive(s,'rift')){const target=intendedTarget(s),aim=target?.id;
 if(u.enemyKit==='halberd')u.intent=[{label:'Set the Halberd',barrier:14},{label:'Hook and Open',damage:24,target:aim,exposeTarget:true},{label:'Low Sweep',damage:10,all:true}][u.step%3];
 else if(u.enemyKit==='marksman')u.intent=[{label:'Brace the Arm-Cannon',barrier:20},{label:'Aimed Shot',damage:36,target:aim,interruptible:true,element:'storm'},{label:'Vent and Fire',damage:18,target:aim,exposeSelf:true}][u.step%3];
 else if(u.enemyKit==='cinder')u.intent=u.step%2?{label:'Cinder Fan',damage:9,all:true,burn:1,element:'fire'}:{label:'Coal Sling',damage:16,target:aim,burn:2,element:'fire'};
 else if(u.enemyKit==='shield')u.intent=[{label:'Ashen Bulwark',barrier:24},{label:'Guarded Thrust',damage:22,target:aim},{label:'Shield Sweep',damage:12,all:true,exposeSelf:true}][u.step%3];
 else u.intent=u.sp==='husk'?(u.step%2?{label:'Reckless Lunge',damage:24,target:aim,exposeSelf:true}:{label:'Raking Claw',damage:16,target:aim}):u.step%3===0?{label:'Gather Fracture',barrier:20}:u.step%3===1?{label:'Fracture Bolt',damage:42,target:aim,interruptible:true,element:'storm'}:{label:'Rift Sweep',damage:14,all:true};}}
function enemyTurn(s,u){
 if(u.burn){u.burn--;damage(s,u,8,{direct:false,source:'burn'});if(u.hp<=0)return;}
 const intent=u.intent;emit(s,'enemy',{unit:u.id,label:intent.label,element:intent.element||'earth'});
 if(intent.stagger){u.step++;return;}
 if(intent.barrier)u.barrier=Math.max(u.barrier,intent.barrier);
 else {const locked=s.units.find(a=>a.id===intent.target&&a.hp>0),targets=intent.all?alive(s,'keepers'):[alive(s,'keepers').find(a=>a.taunt)||locked||intendedTarget(s)].filter(Boolean);
  for(const target of targets){damage(s,target,intent.damage,{source:u.id});if(target.hp>0){if(intent.burn)target.burn=Math.max(target.burn||0,intent.burn);if(intent.exposeTarget)target.exposed=true;}if(!intent.all&&target.taunt&&target.hp>0)damage(s,u,10,{source:target.id});}
 }
 if(intent.exposeSelf&&u.hp>0)u.exposed=true;
 u.step++;
}
function advance(s,now){
 if(finish(s,now))return;
 let i=s.units.findIndex(u=>u.id===s.active);
 for(let j=0;j<s.units.length;j++){
  i=(i+1)%s.units.length;if(i===0){s.round++;planEnemies(s);}
  const u=s.units[i];if(u.hp<=0)continue;s.active=u.id;s.turn++;u.guard=false;u.taunt=false;
  if(u.owner){if(u.burn){u.burn--;damage(s,u,8,{direct:false,source:'burn'});if(finish(s,now))return;if(u.hp<=0)continue;}s.deadline=now+30000;return;}
  enemyTurn(s,u);if(finish(s,now))return;
 }
}
function actions(s,u){
 if(!u||!u.owner||s.phase!=='battle')return [];
 const kit=kits[u.sp]||kits.keeper,p=s.players.find(p=>p.id===u.owner);
 return [['attack','Attack',0,'enemy','Basic damage. Restore 10 essence.'],['special',...kit[0]],['technique',...kit[1]],['guard','Guard',0,'self','Halve direct damage until your next turn. Restore 20 essence.'],...(u.sp==='keeper'&&!s.pvp&&!s.patronQuest?[['capture','Grasp',60,'enemy','Record a soul at half health or below. Does not defeat it.']]:[]),['tonic','Field Tonic',0,'self','Restore 35 HP to the acting fighter. Uses your turn.'],['ether','Essence Vial',0,'self','Restore 40 essence to the acting fighter. Uses your turn.']].map(([id,label,cost,target,description])=>{
  const taunter=s.pvp&&opponents(s,u).find(t=>t.taunt);
  const targetIds=opponents(s,u).filter(t=>!taunter||t.id===taunter.id).filter(t=>id!=='capture'||(t.hp<=t.max/2&&!p.captures.includes(t.sp))).map(t=>t.id);
  const item=id==='tonic'||id==='ether',remaining=item?(p.supplies?.[id]||0):undefined;
  const reason=item&&!remaining?'Pouch empty':id==='tonic'&&u.hp===u.max?'Health is full':id==='ether'&&u.energy===100?'Essence is full':u.energy<cost?`Need ${cost} essence`:target==='enemy'&&!targetIds.length?(id==='capture'?'Weaken an unclaimed soul to half health':'No living target'):'';
  return {id,label,cost,target,description,targetIds,enabled:!reason,reason,item,remaining};
 });
}
function act(s,u,p,c,now){
 const action=actions(s,u).find(a=>a.id===c.move);need(action,'Unknown move');need(action.enabled,action.reason);
 const target=s.units.find(v=>v.id===c.target);if(action.target==='enemy')need(action.targetIds.includes(c.target),'Choose an eligible living enemy');
 const charged=u.sp==='voth'&&u.charged&&['attack','special'].includes(c.move),power=charged?1.6:1;if(charged)u.charged=false;
 u.energy-=action.cost;emit(s,'action',{unit:u.id,label:action.label,move:c.move,charged,element:trialRoster[u.sp]?.sourceMoves[c.move==='technique'?2:3]?.el|| (u.sp==='voth'?'spirit':u.sp==='tibrs'?'fire':u.sp==='beast'?'earth':'storm'),target:action.target==='self'?u.id:target?.id});
 if(action.item){p.supplies[c.move]--;const stat=c.move==='tonic'?'hp':'energy',amount=Math.min(c.move==='tonic'?35:40,(stat==='hp'?u.max:100)-u[stat]);u[stat]+=amount;emit(s,'restore',{unit:u.id,stat,amount});}
 else if(c.move==='attack'){damage(s,target,u.atk*power,{source:u.id});u.energy=Math.min(100,u.energy+10);}
 else if(c.move==='guard'){u.guard=true;u.energy=Math.min(100,u.energy+20);}
 else if(c.move==='capture'){p.captures.push(target.sp);emit(s,'capture',{unit:u.id,soul:target.sp});}
 else if(trialRoster[u.sp]){
  const m=trialRoster[u.sp].sourceMoves[c.move==='technique'?2:3];
  if(m.t==='shield')u.barrier=Math.max(u.barrier,Math.round(u.max*m.p));
  else if(m.t==='heal'||m.t==='healAll'){const allies=alive(s,u.team),targets=m.t==='healAll'?allies:allies.sort((a,b)=>a.hp/a.max-b.hp/b.max).slice(0,1);for(const ally of targets){const amount=Math.min(ally.max-ally.hp,Math.round(ally.max*m.p));ally.hp+=amount;emit(s,'restore',{unit:ally.id,stat:'hp',amount});}}
  else for(const t of m.t==='dmgAll'?opponents(s,u):[target])damage(s,t,Math.round(m.p*.62),{source:u.id,counterable:m.t!=='dmgAll'});
 }else if(u.sp==='keeper'){
  if(c.move==='special'){damage(s,target,35,{source:u.id});if(target.hp>0)target.exposed=true;}
  else {const friend=s.units.find(v=>v.owner===u.owner&&v.sp!=='keeper'&&v.hp>0)||u;friend.barrier=Math.max(friend.barrier,28);}
 }else if(u.sp==='voth'){
  if(c.move==='special'){damage(s,target,32*power,{source:u.id});}
  else {u.charged=true;u.barrier=Math.max(u.barrier,16);}
 }else if(u.sp==='beast'){
  if(c.move==='special'){if(target.barrier>0){target.barrier=0;breakFracture(s,target);}damage(s,target,u.atk*(39/22),{source:u.id});}
  else {u.guard=true;u.taunt=true;for(const e of alive(s,'rift'))if(e.intent?.target)e.intent.target=u.id;}
 }else if(u.sp==='tibrs'){
  if(c.move==='special'){damage(s,target,24,{source:u.id});if(target.hp>0)target.burn=2;}
  else for(const enemy of opponents(s,u)){const burning=enemy.burn>0;enemy.burn=0;damage(s,enemy,20+(burning?18:0),{source:u.id,counterable:false});}
 }
 if(c.move==='special'||c.move==='technique')s.presentation={id:s.id+':'+(s.revision+1),at:now,element:trialRoster[u.sp]?.sourceMoves[c.move==='technique'?2:3]?.el||(u.sp==='tibrs'?'fire':u.sp==='beast'?'earth':u.sp==='voth'?'spirit':'storm'),unit:u.id,move:c.move,target:c.target,offensive:action.target!=='self'};
 advance(s,now);
}
function command(s,uid,c,now){
 const p=player(s,uid);need(c&&Number.isInteger(c.revision)&&(c.type==='ready'||c.revision===s.revision),'State changed; retry after refresh');need(['ready','act','leave'].includes(c.type),'Unknown command');
 if(c.type==='ready'){need(s.phase==='lobby','Battle already started');need(Object.hasOwn(heroes,c.hero),'Unknown companion');p.hero=c.hero;p.ready=true;if(s.players.every(p=>p.ready&&p.online))start(s,now);}
 else if(c.type==='leave'){p.left=true;p.online=false;p.ready=false;if(s.phase==='battle'){s.units.filter(u=>u.owner===uid).forEach(u=>{u.hp=0;u.low=false;u.ko=true;u.taunt=false;u.charged=false;u.burn=0;u.barrier=0;u.guard=false;u.exposed=false;});evolve(s);if(!finish(s,now)&&s.units.find(u=>u.id===s.active).hp===0)advance(s,now);}}
 else{need(s.phase==='battle','Battle is not active');const u=s.units.find(u=>u.id===s.active);need(u.owner===uid&&u.hp>0&&!p.left,'Not your turn');act(s,u,p,c,now);}
 if(c.type==='act')p.missedTurns=0;s.revision++;p.lastSeen=now;return snapshot(s);
}
function tick(s,now){
 if(!['lobby','battle'].includes(s.phase))return;
 if(now-s.created>3600000){s.phase='expired';s.revision++;return;}
 if(s.phase==='lobby'&&now>s.deadline){s.phase='expired';s.revision++;}
 else if(s.phase==='battle'&&now>s.deadline){const u=s.units.find(u=>u.id===s.active),p=player(s,u.owner);
  if(s.pvp&&(p.missedTurns=(p.missedTurns||0)+1)>=3){command(s,p.id,{type:'leave',revision:s.revision},now);p.forfeited=true;emit(s,'forfeit',{unit:u.id});return;}
  u.guard=true;u.energy=Math.min(100,u.energy+20);emit(s,'timeout',{unit:u.id});advance(s,now);s.revision++;}
}
function snapshot(s){const out=copy(s);out.roster=roster();out.kitRules={voth:'Charge boosts the next basic attack or damaging ability by 60%. Guard and support preserve it; recharging replaces it. Transform alive below 10% HP; no additional form stats.',beast:'Transform alive below 25% HP as the last living non-Keeper, non-summoned companion on your side. Keepers may remain. Gain 10 attack for this battle.',tibrs:'Firebrand sets two burn ticks. Wildfire consumes existing burns for bonus damage.',husk:'Raking Claw alternates with Reckless Lunge, which leaves the Husk exposed.',warden:'Gather Fracture builds a barrier; break it with direct damage before Fracture Bolt to interrupt the bolt.'};out.progression='Fixed test loadouts. Forms last for this encounter; no permanent evolution or trusted player levels.';const active=out.units.find(u=>u.id===out.active);out.actions=actions(out,active);return out;}
function roster(){return Object.fromEntries(Object.entries(heroes).map(([id,h])=>[id,{name:h.name,trialLevel:h.trialLevel||8,lore:h.lore||'',moves:kits[id].map((k,i)=>({id:i?'technique':'special',name:k[0],cost:k[1],target:k[2],description:k[3],element:trialRoster[id]?.sourceMoves[i?2:3].el||null,sourceId:trialRoster[id]?.sourceMoves[i?2:3].id||null})),form:id==='voth'?'Alive below 10% HP. Temporary battle form, no extra stats.':id==='beast'?'Alive below 25% HP, last living companion on the side. +10 attack for this battle.':''}]));}
module.exports={encounter,heroes,roster,create,createPractice,createPvp,createTeams,join,command,tick,snapshot,evolve,damage,finish};

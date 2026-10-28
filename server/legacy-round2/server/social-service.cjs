/* Local multiplayer authority. Production authentication/hosting is deliberately separate. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const battle=require('./battle-core.cjs');
const {key:nameKey,validateName}=require('./name-policy.cjs');
const need=(ok,message)=>{if(!ok)throw Error(message);};
const clone=x=>JSON.parse(JSON.stringify(x));
function createService({file,now=Date.now,patronRandomInt}={}){
 let state=file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{version:1,users:{},parties:{},matches:{},receipts:{}};
 const seen=new Map(),rates=new Map();
 function persist(){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state));fs.renameSync(tmp,file);}
 function transact(fn){const backup=clone(state);try{const result=fn();persist();return result;}catch(e){state=backup;throw e;}}
 function user(token){const u=typeof token==='string'&&Object.hasOwn(state.users,token)?state.users[token]:null;need(u,'Session expired. Reconnect at the board.');seen.set(u.id,now());return u;}
 function online(id){return seen.has(id)&&now()-seen.get(id)<15000;}
 function current(uid){return Object.values(state.parties).find(p=>p.members.some(m=>m.id===uid)&&p.phase!=='closed');}
 function member(p,u){const m=p.members.find(m=>m.id===u.id);need(m,'You are not in this party.');return m;}
 function revision(p,value){need(Number.isInteger(value)&&value===p.revision,'The party changed. Refresh and try again.');}
 function cleanName(value){return String(value||'Keeper').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,18)||'Keeper';}
 const trade=require('./trade-service.cjs').tradeService({getState:()=>state,now,online,current});
 const tavern=require('./tavern-service.cjs').tavernService({getState:()=>state,now,online,current});
 const patron=require('./patron-service.cjs').patronService({getState:()=>state,now,online,current,randomInt:patronRandomInt});
 const arena=require('./arena-service.cjs').arenaService({getState:()=>state,now,online,current});
 const guild=require('./guild-service.cjs').guildService({getState:()=>state,now});
 const world=require('./world-service.cjs').worldService({getState:()=>state,now,online,current});
 function publicParty(p){return {...clone(p),members:p.members.map(m=>({...m,online:online(m.id)}))};}
 function receiptKey(match,uid){return match+':'+uid;}
 function settle(match){if(!['won','lost'].includes(match.phase))return;for(const r of Object.values(match.receipts)){
  const key=receiptKey(match.id,r.userId);if(!state.receipts[key])state.receipts[key]={id:key,matchId:match.id,userId:r.userId,outcome:match.pvp?(match.winner===(match.teamByUser?.[r.userId]||r.userId)?'won':'lost'):match.phase,marks:r.coins,captures:r.captures,earnedAt:match.ended,scope:match.pvp?'local-pvp':match.practice?'practice':'local-expedition',persistedToGame:false};
 }}
 function tick(){let dirty=false;for(const p of Object.values(state.parties)){
  if(p.phase==='forming'){
   if(now()-p.updatedAt>300000&&!p.members.some(m=>online(m.id))){p.phase='closed';p.revision++;dirty=true;continue;}
   for(const m of p.members)if(m.ready&&!online(m.id)){m.ready=false;p.revision++;dirty=true;}
  }
 }
 for(const match of Object.values(state.matches)){
  if(!['lobby','battle'].includes(match.phase))continue;
  const before=JSON.stringify(match);battle.tick(match,now());
  if(before!==JSON.stringify(match)){dirty=true;settle(match);const p=state.parties[match.partyId];if(p&&['won','lost','expired'].includes(match.phase)&&p.phase==='expedition'){p.phase='complete';p.revision++;}}
 }
 dirty=trade.tick()||dirty;dirty=arena.tick()||dirty;dirty=tavern.tick()||dirty;dirty=patron.tick()||dirty;if(dirty)persist();}
 function staffRole(u){
  if(!file)return null;
  try{const grants=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'staff-access.json'),'utf8'));return grants.creatorIds?.includes(u.id)?'creator':null;}catch{return null;}
 }
 function snapshot(u){tick();const p=current(u.id);const match=p?.matchId?state.matches[p.matchId]:null;
  return {roster:battle.roster(),you:{id:u.id,name:u.name,previousNames:u.previousNames||[],role:staffRole(u)},...(staffRole(u)==='creator'?{admin:{onlineSessions:Object.values(state.users).filter(x=>online(x.id)).length,knownSessions:Object.keys(state.users).length,checkedAt:now(),activeWindowSeconds:15}}:{}),online:Object.values(state.users).filter(x=>online(x.id)).length,
   board:Object.values(state.parties).filter(x=>x.phase==='forming'&&(x.visibility==='public'||x.id===p?.id)).map(publicParty),
   trade:trade.snapshot(u),tavern:tavern.snapshot(u),patron:patron.snapshot(u),arena:arena.snapshot(),guild:guild.snapshot(u),world:world.snapshot(u),party:p?publicParty(p):null,match:match?battle.snapshot(match):null,
   receipts:Object.values(state.receipts).filter(r=>r.userId===u.id).sort((a,b)=>b.earnedAt-a.earnedAt).slice(0,20)};
 }
 function checkedName(value,u){const name=validateName(value,{owner:!!u&&staffRole(u)==='creator'});if(Object.values(state.users).some(x=>x.id!==u?.id&&nameKey(x.name)===nameKey(name)))throw Object.assign(Error('That Keeper name is already taken. Sign in to its account or choose another name.'),{status:409});return name;}
 function rename(u,name){if(u.name!==name){u.previousNames=[...new Set([...(u.previousNames||[]),u.name])];u.name=name;for(const p of Object.values(state.parties))for(const m of p.members)if(m.id===u.id)m.name=name;}}
 function claimName(token,value){return transact(()=>{const u=user(token);rename(u,checkedName(value,u));return snapshot(u);});}
 function session(name){return transact(()=>{need(Object.keys(state.users).length<500,'Local playtest session limit reached.');const checked=checkedName(name),token=crypto.randomBytes(32).toString('hex'),u={id:crypto.randomUUID(),name:checked};state.users[token]=u;seen.set(u.id,now());return {token,...snapshot(u)};});}
 // Preserve identity, grants and records; keep previous names for reversible migration.
 if(!state.namePolicyVersion){transact(()=>{const used=new Set();for(const u of Object.values(state.users).sort((a,b)=>(staffRole(b)==='creator')-(staffRole(a)==='creator'))){let valid=true;try{validateName(u.name,{owner:staffRole(u)==='creator'});}catch{valid=false;}if(!valid||used.has(nameKey(u.name))){let n='Keeper-'+u.id.replace(/-/g,'').slice(0,8),i=1;while(used.has(nameKey(n)))n='Keeper-'+u.id.slice(0,6)+(i++);rename(u,n);}used.add(nameKey(u.name));}state.namePolicyVersion=1;});}
 function read(token){return snapshot(user(token));}
 function command(token,c){const u=user(token);need(c&&typeof c==='object'&&!Array.isArray(c),'Invalid command.');
  const rate=rates.get(u.id)||{at:now(),n:0};if(now()-rate.at>10000){rate.at=now();rate.n=0;}need(++rate.n<=40,'Too many actions. Wait a moment.');rates.set(u.id,rate);
  tick();return transact(()=>{if(trade.handle(u,c)||tavern.handle(u,c)||patron.handle(u,c)||arena.handle(u,c)||guild.handle(u,c)||world.handle(u,c))return snapshot(u);let p=current(u.id);
   if(c.type==='create'||c.type==='practice'){
    need(!p,'Leave your current party first.');need(Object.values(state.parties).filter(x=>x.phase!=='closed').length<100,'The board is full.');
    need(c.type==='practice'||['public','private'].includes(c.visibility),'Choose public or private.');
    p={id:crypto.randomBytes(5).toString('hex').toUpperCase(),leader:u.id,visibility:c.type==='practice'?'private':c.visibility,practice:c.type==='practice',phase:'forming',revision:0,activity:'Fracture Watch',createdAt:now(),updatedAt:now(),members:[{id:u.id,name:u.name,hero:'voth',ready:false}]};state.parties[p.id]=p;
   }else if(c.type==='join'){
    need(!p,'Leave your current party first.');p=state.parties[String(c.partyId||'').trim().toUpperCase()];need(p&&p.phase==='forming','This party is no longer recruiting.');need(!p.practice,'Practice is for one Keeper.');need(p.members.length<2,'This party is full.');
    p.members.push({id:u.id,name:u.name,hero:'beast',ready:false});p.members.forEach(m=>m.ready=false);p.revision++;p.updatedAt=now();
   }else{
    need(p,'Join or create a party first.');revision(p,c.revision);const m=member(p,u);
    if(c.type==='ready'){
     need(p.phase==='forming','The expedition is already underway.');need(Object.hasOwn(battle.heroes,c.hero),'Choose a supported companion.');need(typeof c.ready==='boolean','Invalid ready state.');m.hero=c.hero;m.ready=c.ready;p.revision++;p.updatedAt=now();
    }else if(c.type==='launch'){
     need(p.leader===u.id,'Only the party leader can begin.');need(p.phase==='forming','This party has already departed.');need(p.members.length===(p.practice?1:2)&&p.members.every(m=>m.ready&&online(m.id)),'Both Keepers must be online and ready.');
     const id=crypto.randomUUID(),match=p.practice?battle.createPractice(id,p.members[0].id,now()):battle.create(id,p.members[0].id,p.members[1].id,now());match.partyId=p.id;battle.encounter(match,crypto.randomInt(3));
     for(const member of p.members){battle.join(match,member.id,now());battle.command(match,member.id,{type:'ready',hero:member.hero,revision:match.revision},now());}
     // Display names come from the authority. Combat uses the same rules in practice and parties.
     for(const unit of match.units)if(unit.sp==='keeper')unit.name=p.members.find(m=>m.id===unit.owner).name;
     state.matches[id]=match;p.matchId=id;p.phase='expedition';p.revision++;
    }else if(c.type==='act'){
     need(p.phase==='expedition','No active expedition.');const match=state.matches[p.matchId];
     battle.command(match,u.id,{type:'act',revision:c.battleRevision,move:c.move,target:c.target},now());
     settle(match);
     if(['won','lost'].includes(match.phase)){p.phase='complete';p.revision++;}
    }else if(c.type==='leave'){
     if(p.phase==='expedition'){const match=state.matches[p.matchId];battle.command(match,u.id,{type:'leave',revision:match.revision},now());settle(match);if(['won','lost'].includes(match.phase))p.phase='complete';}
     p.members=p.members.filter(m=>m.id!==u.id);p.members.forEach(m=>m.ready=false);p.leader=p.members[0]?.id||null;p.phase=p.members.length?p.phase:'closed';p.revision++;p.updatedAt=now();
    }else throw Error('Unknown party action.');
   }
   return snapshot(u);
  });
 }
 // Operator-only aggregate view. Do not return bearer tokens, chat, inventories or saves.
 function diagnostics(){const users=Object.values(state.users),parties=Object.values(state.parties),matches=Object.values(state.matches);return {identity:'local per-tab sessions; not unique people',sessions:{known:users.length,online:users.filter(u=>online(u.id)).length},players:users.filter(u=>online(u.id)).slice(0,100).map(u=>({id:u.id.slice(-8),name:u.name})),parties:{forming:parties.filter(p=>p.phase==='forming').length,active:parties.filter(p=>p.phase==='expedition').length},matches:{active:matches.filter(m=>m.phase==='battle').length,complete:matches.filter(m=>['won','lost'].includes(m.phase)).length,expired:matches.filter(m=>m.phase==='expired').length},persistence:file?'local disk':'memory only'};}
 return {session,read,claimName,command,tick,diagnostics};
}
module.exports={createService};

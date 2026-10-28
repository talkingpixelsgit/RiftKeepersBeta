'use strict';
const crypto=require('node:crypto'),battle=require('./battle-core.cjs');
const need=(v,m)=>{if(!v)throw Error(m);};
function arenaService({getState,now,current,online}){
 const state=()=>{const s=getState();s.arena??={brackets:[],wars:[]};return s;};
 const guild=id=>Object.values(state().guilds||{}).find(g=>g.members.some(m=>m.id===id));
 const person=id=>Object.values(state().users).find(u=>u.id===id);
 const available=id=>online(id)&&!current(id)&&!state().world?.people[id]?.busy;
 function start(node,kind){const s=state(),ids=node.sides.flat();need(ids.every(available),'All participants must be online and leave other activities.');const id=crypto.randomUUID(),partyId=crypto.randomBytes(5).toString('hex').toUpperCase();const m=kind==='guild'?battle.createTeams(id,node.sides,now()):battle.createPvp(id,ids[0],ids[1],now(),'tournament',crypto.randomInt(2));m.partyId=partyId;m.loc='arena';m.arenaNode=node.id;
  const members=m.players.map(p=>({id:p.id,name:person(p.id).name,hero:node.heroes[p.id]||'voth',ready:true}));for(const p of members){battle.join(m,p.id,now());battle.command(m,p.id,{type:'ready',hero:p.hero,revision:m.revision},now());}for(const u of m.units)if(u.sp==='keeper')u.name=person(u.owner).name;
  s.matches[id]=m;s.parties[partyId]={id:partyId,leader:ids[0],visibility:'private',pvp:kind,phase:'expedition',revision:0,activity:kind==='guild'?'Guild team battle':'Tournament duel',createdAt:now(),updatedAt:now(),members,matchId:id};node.matchId=id;node.status='playing';node.revision++;
 }
 const node=(sides,round,index)=>({id:crypto.randomUUID(),sides,round,index,status:'waiting',ready:[],heroes:{},revision:0});
 function advance(b){let change=false;for(const n of b.nodes){if(n.status!=='done')continue;const next=b.nodes.find(x=>x.round===n.round+1&&x.index===Math.floor(n.index/2));if(next){const side=n.index%2;if(next.sides[side]===null){next.sides[side]=n.winner?[n.winner]:[];change=true;}}else if(n.round===b.rounds-1&&b.status!=='complete'){b.status='complete';b.winner=n.winner;b.ended=now();change=true;}}
  for(const n of b.nodes)if(n.status==='waiting'&&n.sides.every(s=>s!==null)&&n.sides.some(s=>!s.length)){n.status='done';n.winner=n.sides.flat()[0]||null;n.bye=true;n.revision++;change=true;}
  if(change)advance(b);return change;
 }
 function tick(){let changed=false;for(const b of state().arena.brackets){for(const n of b.nodes)changed=settle(n)||changed;changed=advance(b)||changed;}for(const w of state().arena.wars)changed=settle(w)||changed;return changed;}
 function settle(n){if(n.status!=='playing')return false;const m=state().matches[n.matchId];if(!m||!['won','lost','expired'].includes(m.phase))return false;if(m.winner){n.winner=m.winner;n.status='done';n.ended=now();}else{n.status='waiting';n.ready=[];n.matchId=null;}n.revision++;return true;}
 function snapshot(){return {...state().arena,names:Object.fromEntries(Object.values(state().users).map(u=>[u.id,u.name]))};}
 function handle(u,c){if(!String(c.type).startsWith('arena_'))return false;const s=state(),g=guild(u.id);
  if(c.type==='arena_seed'){need(g?.leader===u.id,'Only your guild leader can seed its tournament.');const e=g.events.find(e=>e.id===c.event);need(e&&e.status==='scheduled','This event is already seeded or cancelled.');const ids=e.entries.filter(id=>g.members.some(m=>m.id===id));need(ids.length>=2&&ids.length<=16,'Register 2–16 guild members.');for(let i=ids.length-1;i>0;i--){const j=crypto.randomInt(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}const size=2**Math.ceil(Math.log2(ids.length)),rounds=Math.log2(size),nodes=[];for(let r=0;r<rounds;r++)for(let i=0;i<size/2**(r+1);i++)nodes.push(node(r===0?[[ids[i*2]].filter(Boolean),[ids[i*2+1]].filter(Boolean)]:[null,null],r,i));const b={id:crypto.randomUUID(),title:e.title,guildId:g.id,status:'playing',rounds,nodes,createdAt:now()};s.arena.brackets.push(b);e.status='seeded';e.bracketId=b.id;g.revision++;advance(b);
  }else if(c.type==='arena_war'){need(g?.leader===u.id,'Only a guild leader can post a team challenge.');const other=Object.values(s.guilds).find(x=>x.id===c.guildId&&x.id!==g.id);need(other,'Choose another guild.');need(Array.isArray(c.team)&&c.team.length===2&&new Set(c.team).size===2&&c.team.every(id=>g.members.some(m=>m.id===id)),'Nominate two distinct guild members.');need(s.arena.wars.filter(w=>!['done','cancelled'].includes(w.status)&&w.guilds.includes(g.id)).length<3,'Finish existing guild challenges first.');s.arena.wars.push({...node([c.team,null],0,0),title:g.name+' vs '+other.name,guilds:[g.id,other.id],status:'invited'});
  }else{const b=s.arena.brackets.find(b=>b.nodes.some(n=>n.id===c.node)),n=b?.nodes.find(n=>n.id===c.node)||s.arena.wars.find(w=>w.id===c.node);need(n,'Match not found.');need(c.nodeRevision===n.revision,'Match changed. Review the bracket.');
   if(c.type==='arena_accept'){need(!b&&n.status==='invited'&&g?.id===n.guilds[1]&&g.leader===u.id,'Only the challenged guild leader can accept.');need(Array.isArray(c.team)&&c.team.length===2&&new Set(c.team).size===2&&c.team.every(id=>g.members.some(m=>m.id===id)),'Nominate two distinct guild members.');n.sides[1]=c.team;n.status='waiting';n.revision++;
   }else if(c.type==='arena_cancel'){need(!b&&['invited','waiting'].includes(n.status)&&g?.leader===u.id&&n.guilds.includes(g.id),'Only a participating guild leader can cancel before battle.');n.status='cancelled';n.revision++;
   }else if(c.type==='arena_ready'){need(n.status==='waiting'&&n.sides.every(x=>x?.length)&&n.sides.flat().includes(u.id),'Wait for your next match.');need(available(u.id),'Leave your current activity before readying.');need(Object.hasOwn(battle.heroes,c.hero),'Choose a companion.');if(n.ready.includes(u.id))n.ready=n.ready.filter(id=>id!==u.id);else{n.ready.push(u.id);n.heroes[u.id]=c.hero;}n.revision++;if(n.sides.flat().every(id=>n.ready.includes(id)))start(n,b?'tournament':'guild');
   }else throw Error('Unknown arena action.');
  }return true;
 }
 return {handle,snapshot,tick};
}
module.exports={arenaService};

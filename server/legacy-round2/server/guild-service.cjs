'use strict';
const crypto=require('node:crypto');
const need=(ok,msg)=>{if(!ok)throw Error(msg);};
function guildService({getState,now}){
 const state=()=>{const s=getState();s.guilds??={};return s;};
 const guildFor=id=>Object.values(state().guilds).find(g=>g.members.some(m=>m.id===id));
 const clean=(s,max)=>String(s||'').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,max);
 const name=id=>Object.values(state().users).find(u=>u.id===id)?.name||'Keeper';
 function history(){return Object.values(state().matches).filter(m=>['won','lost'].includes(m.phase)).sort((a,b)=>b.ended-a.ended).map(m=>({id:m.id,at:m.ended,kind:m.pvp|| (m.practice?'practice':'expedition'),winner:m.pvp?m.winner:null,outcome:m.phase,round:m.round||0,loc:m.loc||'fracture',players:m.players.map(p=>({id:p.id,name:name(p.id),hero:p.hero,team:m.teamByUser?.[p.id]||p.id,left:!!p.left})),forfeit:m.players.some(p=>p.forfeited)||m.events.some(e=>e.type==='forfeit')}));}
 function snapshot(u){const h=history(),guilds=Object.values(state().guilds).map(g=>({...g,members:g.members.map(m=>({...m,name:name(m.id)}))}));
  return {mine:guildFor(u.id)?.id||null,guilds,history:h,rankings:guilds.map(g=>{const matches=h.filter(m=>m.kind==='duel'&&m.winner&&m.players.some(p=>p.id===g.leader)),wins=matches.filter(m=>m.winner===g.leader).length;return {guild:g.name,leader:name(g.leader),id:g.leader,wins,losses:matches.length-wins};}).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||a.guild.localeCompare(b.guild))};
 }
 function handle(u,c){if(!String(c.type).startsWith('guild_'))return false;const s=state();let g=guildFor(u.id);
  if(c.type==='guild_create'){need(!g,'Leave your current guild first.');need(Object.keys(s.guilds).length<100,'The local guild board is full.');const n=clean(c.name,32);need(n.length>=3,'Use a guild name of 3–32 characters.');need(!Object.values(s.guilds).some(x=>x.name.toLowerCase()===n.toLowerCase()),'That guild name is taken.');g={id:crypto.randomUUID(),name:n,leader:u.id,revision:0,ranks:['Initiate','Waykeeper','Warden'],members:[{id:u.id,rank:2,title:'Founder'}],events:[],createdAt:now()};s.guilds[g.id]=g;
  }else if(c.type==='guild_join'){need(!g,'You already belong to a guild.');g=Object.hasOwn(s.guilds,c.guildId)?s.guilds[c.guildId]:null;need(g,'Guild not found.');need(g.members.length<50,'This guild is full.');g.members.push({id:u.id,rank:0,title:''});g.revision++;
  }else{need(g,'Join a guild first.');need(Number.isInteger(c.guildRevision)&&c.guildRevision===g.revision,'The guild changed. Refresh and try again.');const leader=g.leader===u.id;
   if(c.type==='guild_leave'){need(!leader,'Transfer leadership before leaving.');g.members=g.members.filter(m=>m.id!==u.id);
   }else if(c.type==='guild_ranks'){need(leader,'Only the guild leader can set ranks.');need(Array.isArray(c.ranks)&&c.ranks.length===3,'Provide three rank names.');const ranks=c.ranks.map(x=>clean(x,24));need(ranks.every(Boolean)&&new Set(ranks.map(x=>x.toLowerCase())).size===3,'Rank names must be nonempty and distinct.');g.ranks=ranks;
   }else if(c.type==='guild_member'){need(leader,'Only the guild leader can set ranks and titles.');const m=g.members.find(x=>x.id===c.member);need(m,'Member not found.');need(Number.isInteger(c.rank)&&c.rank>=0&&c.rank<g.ranks.length,'Invalid rank.');m.rank=c.rank;m.title=clean(c.title,28);
   }else if(c.type==='guild_transfer'){need(leader,'Only the guild leader can transfer leadership.');need(c.member!==u.id&&g.members.some(m=>m.id===c.member),'Choose another guild member.');g.leader=c.member;
   }else if(c.type==='guild_event'){need(leader,'Only the guild leader can schedule tournaments.');need(g.events.length<100,'Guild calendar is full.');need(Number.isFinite(c.at)&&c.at>now()&&c.at<=now()+366*86400000,'Choose a future date within one year.');const title=clean(c.title,60);need(title.length>=3,'Enter a tournament title.');g.events.push({id:crypto.randomUUID(),title,at:c.at,createdAt:now(),status:'scheduled',entries:[],format:'Friendly duels',note:'Single elimination; 2-16 guild entrants. No prizes or item loss.'});
   }else if(c.type==='guild_cancel'){need(leader,'Only the guild leader can cancel a tournament.');const e=g.events.find(e=>e.id===c.event);need(e&&e.status==='scheduled','Tournament is not scheduled.');e.status='cancelled';
   }else if(c.type==='guild_signup'){const e=g.events.find(e=>e.id===c.event);need(e&&e.status==='scheduled'&&e.at>now(),'Registration is closed.');e.entries=e.entries.includes(u.id)?e.entries.filter(id=>id!==u.id):[...e.entries,u.id];
   }else throw Error('Unknown guild action.');g.revision++;
  }return true;
 }
 return {handle,snapshot};
}
module.exports={guildService};

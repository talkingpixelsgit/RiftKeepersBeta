'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const need=(v,m)=>{if(!v)throw Error(m);},copy=v=>JSON.parse(JSON.stringify(v));
const bank=require('./anonymous-proclamation-lines.json');
const phrases={thoughtful:bank.thoughtful,funny:bank.dryly_funny,ominous:bank.unsettling,whimsical:bank.whimsical};
function contextual(message){
 const m=message.trim(),time=m.match(/^server restart in (\d+ (?:minutes?|mins?|hours?|seconds?))[.!]?$/i);
 if(time)return `In ${time[1]}, the world will pause and return. Even eternity needs a moment to gather itself.`;
 if(/^server restart[.!]?$/i.test(m))return 'The world must pause and return. A closing door need not be an ending.';
 if(/^welcome\b/i.test(m))return 'To those newly arrived: the Hall has room for another story. Bring yours through the door.';
 if(/^please (?:send|share|report)\b.*(?:feedback|bugs?|issues?)/i.test(m))return 'Speak of what you have found. Even a world in the making must learn to listen.';
 return 'Attend to the words entrusted below. Decide what you will make of them.';
}
function createBulletin({file,now=Date.now,random=crypto.randomInt}={}){
 let state=file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{revision:0,news:[],notices:[]};const previews=new Map();let lastPhrase='';
 function string(v,max,name){need(typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),name+' is required and must be at most '+max+' characters.');return v;}
 function persist(){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(state));fs.renameSync(file+'.tmp',file);}
 function transact(fn){const before=copy(state);try{fn();state.revision++;persist();return admin();}catch(e){state=before;throw e;}}
 function active(){return state.notices.find(n=>!n.revoked&&n.expiresAt>now())||null;}
 function publicFeed(){const notice=active();return {revision:state.revision,serverTime:now(),scope:'local-playtest',news:copy(state.news.filter(n=>n.published).sort((a,b)=>b.updatedAt-a.updatedAt)),notice:notice?copy({id:notice.id,proclamation:notice.proclamation,message:notice.message,publishedAt:notice.publishedAt,expiresAt:notice.expiresAt}):null};}
 function admin(){return {revision:state.revision,news:copy(state.news),notice:publicFeed().notice,recentNotices:copy(state.notices.slice(0,10))};}
 function preview(c){for(const [id,p] of previews)if(p.until<=now())previews.delete(id);need(previews.size<100,'Too many previews. Wait a few minutes.');let content;
  if(c.kind==='news'){need(['News','Update','Notice'].includes(c.category),'Choose a news category.');if(c.id)need(state.news.some(n=>n.id===c.id),'News entry no longer exists.');content={kind:'news',id:c.id||null,title:string(c.title,100,'Title'),body:string(c.body,4000,'News text'),category:c.category};}
  else{need(c.kind==='notice','Unknown preview kind.');const message=string(c.message,2000,'Actual message');need(Number.isInteger(c.minutes)&&c.minutes>=5&&c.minutes<=1440,'Expiry must be 5–1440 minutes.');need(c.tone==='random'||Object.hasOwn(phrases,c.tone),'Choose an anonymous tone.');const bank=(c.tone==='random'?Object.values(phrases).flat():phrases[c.tone]).filter(p=>p!==lastPhrase);const phrase=bank[random(bank.length)];lastPhrase=phrase;content={kind:'notice',message,minutes:c.minutes,proclamation:contextual(message)+'\n\n'+phrase};}
  const id=crypto.randomUUID();const p={id,revision:state.revision,until:now()+600000,content};previews.set(id,p);return copy(p);
 }
 function command(c){need(c&&typeof c==='object','Command required.');if(c.type==='preview')return {preview:preview(c),state:admin()};if(c.type==='revise'){const prior=previews.get(c.previewId);need(prior&&prior.until>now()&&prior.revision===state.revision&&prior.content.kind==='notice','Preview expired or changed. Preview again.');const proclamation=string(c.proclamation,3000,'Proclamation');const p={...copy(prior),id:crypto.randomUUID(),content:{...copy(prior.content),proclamation}};previews.delete(prior.id);previews.set(p.id,p);return {preview:copy(p),state:admin()};}need(Number.isInteger(c.revision)&&c.revision===state.revision,'Bulletin changed. Reload and preview again.');
  if(c.type==='publish'){const p=previews.get(c.previewId);need(p&&p.until>now()&&p.revision===state.revision,'Preview expired or changed. Preview again before publishing.');const data=p.content;const result=transact(()=>{if(data.kind==='news'){let n=state.news.find(n=>n.id===data.id);if(!n){need(state.news.length<30,'Thirty news entries maximum. Edit an existing entry.');n={id:crypto.randomUUID(),createdAt:now()};state.news.push(n);}Object.assign(n,{title:data.title,body:data.body,category:data.category,published:true,updatedAt:now()});}else{state.notices.forEach(n=>n.revoked=true);state.notices.unshift({id:crypto.randomUUID(),proclamation:data.proclamation,message:data.message,publishedAt:now(),expiresAt:now()+data.minutes*60000,revoked:false});state.notices=state.notices.slice(0,20);}});previews.delete(c.previewId);return {state:result};}
  if(c.type==='unpublish')return {state:transact(()=>{const n=state.news.find(n=>n.id===c.id);need(n,'News entry no longer exists.');need(n.published,'Already unpublished.');n.published=false;n.updatedAt=now();})};
  if(c.type==='revoke')return {state:transact(()=>{const n=active();need(n&&n.id===c.id,'Notice is no longer active.');n.revoked=true;})};throw Error('Unknown bulletin command.');
 }
 function launcher(base){return {...copy(base),news:[...publicFeed().news.map(n=>({id:n.id,date:new Date(n.updatedAt).toISOString().slice(0,10),title:n.title,body:n.body,tag:n.category})),...(base.news||[])]};}
 return {command,admin,publicFeed,launcher};
}
module.exports={createBulletin};

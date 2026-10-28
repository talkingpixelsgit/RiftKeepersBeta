'use strict';
// Account identity is independent of display names and of client save contents.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{promisify}=require('node:util');
const {key:nameKey,validateName}=require('./name-policy.cjs');
const scrypt=promisify(crypto.scrypt),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&crypto.timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
function validateSave(save){
 if(!save||Array.isArray(save)||typeof save!=='object'||typeof save.handle!=='string'||!save.handle.trim()||save.handle.length>40||!save.arch||!Number.isInteger(save.lv)||save.lv<1||!Array.isArray(save.mons)||!Array.isArray(save.team))fail(400,'A completed Keeper save is required.');
 const walk=(x,depth=0)=>{if(depth>32)fail(400,'Save nesting is too deep.');if(x&&typeof x==='object')for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))fail(400,'Invalid save field.');walk(x[k],depth+1);}};walk(save);
 if(Buffer.byteLength(JSON.stringify(save))>900000)fail(413,'Save exceeds the cloud limit. Export a backup and contact the host.');
 return JSON.parse(JSON.stringify(save));
}
function createAccounts({dataDir,social,now=Date.now}){
 const file=path.join(dataDir,'accounts.json');
 let db=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{version:1,accounts:{},sessions:{}};
 const rates=new Map();let hashing=0;
 function transaction(fn){const before=JSON.stringify(db);try{const value=fn();fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(db),{mode:0o600});fs.renameSync(file+'.tmp',file);return value;}catch(e){db=JSON.parse(before);throw e;}}
 function limit(ip){const t=now();for(const [k,v]of rates)if(t-v.at>900000)rates.delete(k);if(!rates.has(ip)&&rates.size>=2048)fail(429,'Please try again later.');const r=rates.get(ip)||{at:t,n:0};rates.set(ip,r);if(++r.n>15)fail(429,'Too many sign-in attempts. Try again in 15 minutes.');}
 function name(value){if(typeof value!=='string'||! /^[a-zA-Z0-9_.-]{3,32}$/.test(value))fail(400,'Account name: 3–32 letters, numbers, dots, underscores or hyphens.');return value.toLowerCase();}
 function password(value){if(typeof value!=='string'||value.length<12||value.length>128)fail(400,'Use a password of 12–128 characters.');return value;}
 async function derive(value,salt){if(hashing>=4)fail(429,'Sign-in is busy. Please try again.');hashing++;try{return (await scrypt(value,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');}finally{hashing--;}}
 function auth(token){const session=typeof token==='string'?db.sessions[hash(token)]:null;if(!session||session.expires<=now())return null;return db.accounts[session.account]||null;}
 function session(a){const token=crypto.randomBytes(32).toString('hex');for(const [k,s]of Object.entries(db.sessions))if(s.expires<=now())delete db.sessions[k];const own=Object.entries(db.sessions).filter(([,s])=>s.account===a.id).sort((a,b)=>a[1].expires-b[1].expires);while(own.length>=8)delete db.sessions[own.shift()[0]];db.sessions[hash(token)]={account:a.id,expires:now()+30*86400000};return token;}
 const summary=a=>({id:a.id,username:a.username,revision:a.revision,updatedAt:a.updatedAt,keeper:a.save.handle,level:a.save.lv});
 function get(token,withSave=false){const a=auth(token);if(!a)fail(401,'Sign in to your Keeper account.');return {...summary(a),...(withSave?{save:a.save}:{} )};}
 async function register(input,ip){limit(ip);const username=name(input.username);password(input.password);const save=validateSave(input.save);
  if(Object.values(db.accounts).some(a=>nameKey(a.username)===nameKey(username)))fail(409,'That account name is already registered. Sign in or choose another.');
  if(typeof input.legacyToken!=='string'||!/^[a-f0-9]{64}$/.test(input.legacyToken))fail(400,'Reconnect your current Keeper before linking.');
  let identity;try{identity=social.read(input.legacyToken).you;}catch{fail(403,'Current Keeper session could not be verified. Reconnect and retry.');}
  if(Object.values(db.accounts).some(a=>a.socialId===identity.id))fail(409,'This Keeper is already linked. Sign in to that account.');
  validateName(username,{account:true,owner:identity.role==='creator'});
  // The authenticated social identity owns the display name, not the uploaded save.
  if(save.handle!==identity.name)fail(409,'Reconnect this Keeper before linking so its current name is updated.');
  const salt=crypto.randomBytes(16).toString('hex'),digest=await derive(input.password,salt),recovery=crypto.randomBytes(24).toString('hex');
  return transaction(()=>{
   if(Object.values(db.accounts).some(a=>nameKey(a.username)===nameKey(username)||a.socialId===identity.id))fail(409,'Account or Keeper already linked. Sign in instead.');
   if(Object.keys(db.accounts).length>=500)fail(503,'Account capacity reached. Contact the host.');
   const a={id:crypto.randomUUID(),username,salt,digest,recovery:hash(recovery),socialId:identity.id,socialToken:input.legacyToken,revision:1,updatedAt:now(),save,history:[]};db.accounts[a.id]=a;return {...summary(a),token:session(a),recovery};
  });
 }
 async function login(input,ip){limit(ip);const username=name(input.username);password(input.password);const a=Object.values(db.accounts).find(a=>nameKey(a.username)===nameKey(username));const digest=await derive(input.password,a?.salt||'00000000000000000000000000000000');const current=a&&db.accounts[a.id];if(!current||!same(current.digest,digest))fail(401,'Account name or password not recognised.');return transaction(()=>({...summary(current),token:session(current)}));}
 async function recover(input,ip){limit(ip);const username=name(input.username);password(input.password);const a=Object.values(db.accounts).find(a=>nameKey(a.username)===nameKey(username));if(!a||typeof input.recovery!=='string'||!same(a.recovery,hash(input.recovery.trim())))fail(401,'Account name or recovery code not recognised.');const expected=a.recovery,salt=crypto.randomBytes(16).toString('hex'),digest=await derive(input.password,salt),recovery=crypto.randomBytes(24).toString('hex');return transaction(()=>{const current=db.accounts[a.id];if(current.recovery!==expected)fail(409,'Recovery code already used.');current.salt=salt;current.digest=digest;current.recovery=hash(recovery);for(const [k,s]of Object.entries(db.sessions))if(s.account===current.id)delete db.sessions[k];return {...summary(current),token:session(current),recovery};});}
 function put(token,input){const a=auth(token);if(!a)fail(401,'Sign in again to save to the cloud.');const save=validateSave(input.save);if(save.handle!==social.read(a.socialToken).you.name)fail(409,'Keeper names are managed by the server. Reconnect before saving.');if(!Number.isInteger(input.revision)||input.revision!==a.revision)fail(409,'Another device has a newer cloud save. Both copies are preserved. Choose which to continue in Account & cloud saves.');return transaction(()=>{a.history.unshift({revision:a.revision,updatedAt:a.updatedAt,save:a.save});a.history=a.history.slice(0,5);a.save=save;a.revision++;a.updatedAt=now();return summary(a);});}
 function logout(token){return transaction(()=>{delete db.sessions[hash(token||'')];return {ok:true};});}
 function socialToken(token,bearer){const a=auth(token);if(a)return a.socialToken;if(Object.values(db.accounts).some(a=>a.socialToken===bearer))fail(401,'This Keeper is linked. Sign in to continue.');return bearer;}
 return {auth,get,register,login,recover,put,logout,socialToken};
}
module.exports={createAccounts,validateSave};

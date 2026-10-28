'use strict';
const fs=require('node:fs'),path=require('node:path');
function createLaunch({dataDir,webRoot,origin,clientAddress,now=Date.now}){
 const controlFile=path.join(dataDir,'launch-control.json'),listFile=path.join(dataDir,'waitlist.json');
 const write=(file,value)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 let control=fs.existsSync(controlFile)?JSON.parse(fs.readFileSync(controlFile,'utf8')):{open:false,revision:0};
 if(typeof control.open!=='boolean'||!Number.isInteger(control.revision))throw Error('Invalid launch control state.');
 let entries=fs.existsSync(listFile)?JSON.parse(fs.readFileSync(listFile,'utf8')):[];
 if(!Array.isArray(entries))throw Error('Invalid waitlist storage.');
 const attempts=new Map();
 const snapshot=()=>({...control,waitlistCount:entries.length});
 const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));};
 async function read(req){let size=0,chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>2048)throw Error('Request too large.');chunks.push(Buffer.from(chunk));}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 async function publicRoute(req,res){
  const route=new URL(req.url,'http://localhost').pathname;
  const assets={'/welcome/spirit.webp':['spirit.webp','image/webp'],'/welcome/portal-update.png':['portal-update.png','image/png'],'/welcome/combat-update.png':['combat-update.png','image/png'],'/welcome/map-update.png':['map-update.png','image/png'],'/welcome/style.css':['style.css','text/css'],'/welcome/app.js':['app.js','text/javascript'],'/welcome/forest.png':['forest.png','image/png'],'/welcome/logo.png':['logo.png','image/png']};
  if(Object.hasOwn(assets,route)&&['GET','HEAD'].includes(req.method)){const [file,type]=assets[route];send(res,200,req.method==='HEAD'?'':fs.readFileSync(path.join(webRoot,'welcome',file)),type);return true;}
  if(route==='/launch-status'&&req.method==='GET'){send(res,200,{open:control.open});return true;}
  if(route!=='/waitlist')return false;
  if(req.method!=='POST'){send(res,405,{error:'Use the signup form.'});return true;}
  if(req.headers.origin!==origin){send(res,403,{error:'Same-origin signup required.'});return true;}
  if(req.headers['content-type']!=='application/json'){send(res,415,{error:'JSON required.'});return true;}
  const time=now(),ip=clientAddress(req);for(const [key,a] of attempts)if(time-a.at>=600000)attempts.delete(key);
  if(!attempts.has(ip)&&attempts.size>=2048){send(res,429,{error:'Signup is busy. Try again shortly.'});return true;}
  const attempt=attempts.get(ip)||{at:time,n:0};attempts.set(ip,attempt);
  if(++attempt.n>10){send(res,429,{error:'Please wait a few minutes before trying again.'});return true;}
  try{const body=await read(req),email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(body.website){send(res,200,{ok:true});return true;}
   if(body.consent!==true||email.length>254||! /^[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+$/.test(email)){send(res,400,{error:'Enter a valid email and agree to playtest updates.'});return true;}
   if(!entries.some(x=>x.email===email)){
    if(entries.length>=10000){send(res,503,{error:'Signup is full for now. Please try later.'});return true;}
    const next=[...entries,{email,joinedAt:new Date(time).toISOString(),consent:'Rift Keepers playtest updates',version:1}];write(listFile,next);entries=next;
   }
   send(res,200,{ok:true});
  }catch(e){send(res,e.code?503:400,{error:e.code?'Could not save your signup. Please try again.':'Check your signup details.'});}
  return true;
 }
 function landing(req,res){send(res,200,req.method==='HEAD'?'':fs.readFileSync(path.join(webRoot,'welcome/index.html')),'text/html; charset=utf-8');}
 async function operator(req,res){
  if(req.method==='GET'){send(res,200,snapshot());return;}
  if(req.method!=='POST'){send(res,405,{error:'GET or POST required.'});return;}
  if(req.headers.origin!=='http://'+req.headers.host){send(res,403,{error:'Same-origin operator action required.'});return;}
  if(req.headers['content-type']!=='application/json'){send(res,415,{error:'JSON required.'});return;}
  try{const next=await read(req);if(typeof next.open!=='boolean'||next.revision!==control.revision){send(res,409,{error:'Server status changed. Refresh before switching.'});return;}
   const saved={open:next.open,revision:control.revision+1,changedAt:new Date(now()).toISOString()};write(controlFile,saved);control=saved;send(res,200,snapshot());
  }catch(e){send(res,e.code?503:400,{error:'Server status was not changed. Refresh and retry.'});}
 }
 return {publicRoute,landing,operator,snapshot,isOpen:()=>control.open};
}
module.exports={createLaunch};

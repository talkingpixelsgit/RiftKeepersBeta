'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const routes=['/mmo/health','/mmo/state','/mmo/session','/mmo/command','/__first_light'];
function createMonitor({diagnostics,now=Date.now,token=crypto.randomBytes(32).toString('hex'),bulletin,launch,hotfix,unixSocket=false,scope='Local preview only. No hosted metrics.'}={}){
 const started=now(),totals={requests:0,clientErrors:0,serverErrors:0,aborted:0},byRoute={},recent=[];
 function observe(req,res){const start=now(),route=routes.includes(req.url?.split('?')[0])?req.url.split('?')[0]:'static / other';let done=false;const finish=aborted=>{if(done)return;done=true;const ms=Math.max(0,now()-start),status=res.statusCode||0;totals.requests++;if(aborted)totals.aborted++;else if(status>=500)totals.serverErrors++;else if(status>=400)totals.clientErrors++;const item=byRoute[route]||(byRoute[route]={requests:0,errors:0,totalMs:0,maxMs:0});item.requests++;item.errors+=Number(aborted||status>=400);item.totalMs+=ms;item.maxMs=Math.max(item.maxMs,ms);recent.push({at:now(),ms});if(recent.length>2000)recent.shift();};res.once('finish',()=>finish(false));res.once('close',()=>finish(!res.writableFinished));}
 function snapshot(){const samples=recent.filter(x=>now()-x.at<60000),latencies=samples.map(x=>x.ms).sort((a,b)=>a-b),state=diagnostics();return {scope,at:now(),uptimeSeconds:Math.floor((now()-started)/1000),totals:{...totals},recent:{windowSeconds:60,samples:samples.length,capped:samples.length===2000,averageMs:samples.length?Math.round(samples.reduce((n,x)=>n+x.ms,0)/samples.length):0,p95Ms:latencies.length?latencies[Math.ceil(latencies.length*.95)-1]:0},routes:Object.entries(byRoute).map(([route,v])=>({route,requests:v.requests,errors:v.errors,averageMs:Math.round(v.totalMs/v.requests),maxMs:v.maxMs})),service:state};}
 function authorized(value){if(typeof value!=='string')return false;const a=Buffer.from(value),b=Buffer.from('Bearer '+token);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
 async function handler(req,res){const host=req.headers.host||'',origin=req.headers.origin;const send=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});res.end(body);};
  const localSocket=unixSocket?req.socket.remoteAddress===undefined:['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if(!localSocket||! /^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host){send(403,'{"error":"Local same-origin operator access only"}');return;}
  if(req.url==='/hotfix'&&hotfix){
   if(!authorized(req.headers.authorization)){send(401,'{"error":"Operator key required"}');return;}
   if(req.method==='GET'){send(200,JSON.stringify(hotfix.snapshot()));return;}
   if(req.method!=='POST'||origin!=='http://'+host||req.headers['content-type']!=='application/json'){send(403,'{"error":"Same-origin JSON POST required"}');return;}
   try{let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)throw Error('Request too large');}send(200,JSON.stringify(hotfix.command(JSON.parse(body))));}catch(e){send(400,JSON.stringify({error:e.message}));}return;
  }
  if(req.url==='/server-control'&&launch){
   if(!authorized(req.headers.authorization)){send(401,'{"error":"Operator key required"}');return;}
   await launch.operator(req,res);return;
  }
  if(req.url==='/bulletin'&&bulletin){
   if(!authorized(req.headers.authorization)){send(401,'{"error":"Operator key required"}');return;}
   if(req.method==='GET'){send(200,JSON.stringify(bulletin.admin()));return;}
   if(req.method!=='POST'){send(405,'{"error":"GET or POST required"}');return;}
   if(origin!=='http://'+host){send(403,'{"error":"Same-origin publication required"}');return;}
   if(req.headers['content-type']!=='application/json'){send(415,'{"error":"JSON required"}');return;}
   try{let size=0;const chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>24000)throw Error('Request is too large.');chunks.push(Buffer.from(chunk));}const result=bulletin.command(JSON.parse(Buffer.concat(chunks).toString('utf8')));send(200,JSON.stringify(result));}catch(e){send(e.code?500:400,JSON.stringify({error:e.code?'Publication could not be saved.':e.message}));}return;
  }
  if(req.method!=='GET'){send(405,'{"error":"Read only"}');return;}
  if(req.url==='/metrics'){if(!authorized(req.headers.authorization)){send(401,'{"error":"Operator key required"}');return;}send(200,JSON.stringify(snapshot()));return;}
  const files={'/':['operator.html','text/html; charset=utf-8'],'/operator.js':['operator.js','text/javascript; charset=utf-8'],'/operator.css':['operator.css','text/css; charset=utf-8']},file=Object.hasOwn(files,req.url)?files[req.url]:null;if(!file){send(404,'{"error":"Not found"}');return;}send(200,fs.readFileSync(path.join(__dirname,file[0])),file[1]);
 }
 return {token,observe,snapshot,handler};
}
module.exports={createMonitor};

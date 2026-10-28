'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {socialHTTP}=require('./social-http.cjs');
const {createMonitor}=require('./operator-monitor.cjs');
const {createBulletin}=require('./bulletin-service.cjs');
const HOST=process.env.RK_PUBLIC_HOST||'playtk.talkingpixels.games',ORIGIN='https://'+HOST;
if(!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(HOST))throw Error('RK_PUBLIC_HOST must be a hostname without a scheme or path.');
const COOKIE='__Host-rk-round2';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.mp3':'audio/mpeg'};
const digest=value=>crypto.createHash('sha256').update(value).digest();
const equal=(a,b)=>crypto.timingSafeEqual(digest(a),digest(b));
function validateRequest(req){
 if(req.headers.host!==HOST)throw Error('Game hostname required.');
 if((req.headers.origin&&req.headers.origin!==ORIGIN)||(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==ORIGIN))throw Error('Same-origin requests required.');
}
// Never trust client-supplied forwarded headers. Optional proxy trust is exact-IP only.
function clientAddress(req){const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');const trusted=(process.env.RK_TRUSTED_PROXY_IPS||'').split(',').filter(x=>net.isIP(x));if(trusted.includes(peer)){const raw=req.headers['x-forwarded-for'];const last=typeof raw==='string'?raw.split(',').at(-1).trim():'';if(net.isIP(last))return last;}return peer||'unknown';}
function createHosted({webRoot,dataDir,password,cookieKey,now=Date.now,publicAccess=process.env.RK_PUBLIC_ACCESS==='true'}={}){
 if(!/^[a-f0-9]{48}$/.test(password||''))throw Error('A generated 48-character playtest password is required.');
 if(!/^[a-f0-9]{64}$/.test(cookieKey||''))throw Error('A private cookie signing key is required.');
 const root=fs.realpathSync(webRoot),attempts=new Map();
 const hotfix=require('./hotfix-service.cjs').createHotfix({dataDir,revision:'build28-hotfix12',now});
 const bulletin=createBulletin({file:path.join(dataDir,'bulletin.json')});
 const social=socialHTTP({bulletin,file:path.join(dataDir,'combat03.json'),validateRequest,clientAddress,scope:'private-hosted-playtest'});
 const accounts=require('./account-service.cjs').createAccounts({dataDir,social,now});
 const accountRoute=require('./account-http.cjs').accountHTTP({accounts,validateRequest,clientAddress});
 const launch=require('./launch-service.cjs').createLaunch({dataDir,webRoot:root,origin:ORIGIN,clientAddress,now});
 const monitor=createMonitor({diagnostics:social.diagnostics,bulletin,launch,hotfix,unixSocket:true,scope:'Hosted playtest sessions. Creator access is assigned by server identity.'});
 const sign=value=>crypto.createHmac('sha256',cookieKey).update(value).digest('hex');
 function cookieValid(req){
  const value=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  const match=value.match(/^(\d{13})\.([a-f0-9]{64})$/);if(!match)return false;
  const expiry=Number(match[1]);return expiry>now()&&expiry<=now()+86400000&&equal(match[2],sign(match[1]));
 }
 const send=(res,status,body,type='application/json',extra={})=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...extra});res.end(typeof body==='string'?body:JSON.stringify(body));};
 const login=()=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rift Keepers · Playtest</title><style>body{margin:0;background:#090e1b;color:#deedf0;font:18px system-ui;min-height:100vh;display:grid;place-items:center}main{max-width:28rem;padding:2rem;border-top:2px solid #56d9d0}h1{font:42px Georgia}label,input,button{display:block}input{box-sizing:border-box;width:100%;margin:12px 0 20px;padding:14px;background:#121c2a;color:#fff;border:1px solid #64888d;font:inherit}button{padding:12px 24px;background:#86ddd6;color:#09121b;border:0;font:inherit}input:focus,button:focus{outline:3px solid #fff;outline-offset:3px}p{line-height:1.5;color:#aec2cc}</style><main><h1>Beyond the threshold.</h1><p>Rift Keepers · Private playtest</p><form action="/_playtest/login" method="post"><label for="password">Invitation password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128"><button>Enter the rift</button></form><p>Use the password provided by your host. Progress on this site is separate from your local preview.</p></main></html>`;
 const handler=async(req,res)=>{
  monitor.observe(req,res);
  try{
   if(req.url==='/healthz'&&req.method==='GET'){send(res,200,{service:'riftkeepers-hosted',build:'build28',status:'ready'});return;}
   try{validateRequest(req);}catch{send(res,403,{error:'Use the game hostname and same-origin requests.'});return;}
   if(req.url==='/client-update'&&req.method==='GET'){send(res,200,hotfix.snapshot());return;}
   if(await launch.publicRoute(req,res))return;
   // Preserve existing installed-app identity and saves while repairing its old launch URL.
   if(publicAccess&&new URL(req.url,ORIGIN).pathname==='/index.html'&&['GET','HEAD'].includes(req.method)){send(res,303,'','text/plain',{Location:launch.isOpen()?'/play':'/'});return;}
   if(['/', '/index.html'].includes(req.url)&&['GET','HEAD'].includes(req.method)&&(publicAccess||!launch.isOpen()||!cookieValid(req))){launch.landing(req,res);return;}
   if(publicAccess&&req.url==='/_playtest/login'&&['GET','POST'].includes(req.method)){send(res,303,'','text/plain',{Location:launch.isOpen()?'/play':'/'});return;}
   if(req.url==='/sw.js'&&req.method==='GET'){send(res,200,"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('riftkeepers-')||k.startsWith('timekeepers-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));",'text/javascript; charset=utf-8');return;}
   if(req.url==='/_playtest/login'&&req.method==='GET'){send(res,200,login(),'text/html; charset=utf-8',{'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});return;}
   if(req.url==='/_playtest/login'&&req.method==='POST'){
    const key=clientAddress(req),time=now();for(const [ip,a] of attempts)if(time-a.at>=900000)attempts.delete(ip);
    if(!attempts.has(key)&&attempts.size>=1024){send(res,429,{error:'Try again later.'});return;}
    const a=attempts.get(key)||{at:time,n:0};attempts.set(key,a);if(++a.n>12){send(res,429,{error:'Too many attempts. Try again in 15 minutes.'});return;}
    if(req.headers['content-type']!=='application/x-www-form-urlencoded'){send(res,415,{error:'Use the invitation form.'});return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024){send(res,413,{error:'Request too large.'});return;}chunks.push(chunk);}
    const candidate=new URLSearchParams(Buffer.concat(chunks).toString()).get('password')||'';
    if(!equal(candidate,password)){send(res,401,'Invitation password not recognised. Go back and try again.','text/plain; charset=utf-8');return;}
    const expiry=String(now()+86400000);attempts.delete(key);
    send(res,303,'','text/plain',{Location:'/', 'Set-Cookie':`${COOKIE}=${expiry}.${sign(expiry)}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`});return;
   }
   if(!launch.isOpen()){send(res,503,{error:'Playtest #2 Starting Soon. The Keeper doors are closed for now.'});return;}
   if(!publicAccess&&!cookieValid(req)){
    if(req.method==='GET'&&(req.headers.accept||'').includes('text/html'))send(res,303,'','text/plain',{Location:'/_playtest/login'});
    else send(res,401,{error:'Open the game in this browser and enter your invitation password.'});return;
   }
   if(await accountRoute(req,res))return;
   if(req.url.startsWith('/mmo/')){
    try{const cookie=require('./account-http.cjs').readCookie(req);req.headers.authorization=accounts.socialToken(cookie,req.headers.authorization);
     if(req.url==='/mmo/session'&&req.method==='POST'&&accounts.auth(cookie)){send(res,200,{token:'account',...social.read(req.headers.authorization)});return;}
    }catch(e){send(res,e.status||403,{error:e.message});return;}
   }
   if(await social(req,res))return;
   if(!['GET','HEAD'].includes(req.method)){send(res,405,{error:'GET or HEAD required.'});return;}
   if(req.url==='/__first_light'){send(res,200,{game:'Rift Keepers',build:28,branch:'playtest',revision:'28',hosting:'build28'});return;}
   // The private hosted build does not keep a second, offline copy of gated pages.
   if(req.url==='/sw.js'){send(res,200,"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('riftkeepers-')||k.startsWith('timekeepers-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));",'text/javascript; charset=utf-8');return;}
   if(req.url==='/launcher.json'){send(res,200,bulletin.launcher(JSON.parse(fs.readFileSync(path.join(root,'launcher.json'),'utf8'))));return;}
   let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{send(res,400,{error:'Invalid path.'});return;}
   if(publicAccess&&pathname==='/play')pathname='/';
   if(pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.'))){send(res,404,{error:'Not found.'});return;}
   const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep)){send(res,404,{error:'Not found.'});return;}
   let stat;try{stat=fs.statSync(file);if(!stat.isFile()||!fs.realpathSync(file).startsWith(root+path.sep))throw Error();}catch{send(res,404,{error:'Not found.'});return;}
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch{if(!res.headersSent)send(res,500,{error:'Service unavailable.'});else res.destroy();}
 };
 const server=http.createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},handler);
 return {server,monitor,close:()=>{social.close();server.closeAllConnections();return new Promise(resolve=>server.close(resolve));}};
}
module.exports={createHosted,validateRequest,clientAddress,HOST,ORIGIN};

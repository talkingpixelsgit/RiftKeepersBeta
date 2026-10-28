const {createService}=require('./social-service.cjs');
function socialHTTP(options){
 const service=createService(options),visits=new Map();
 const health={lastTick:0,lastFailure:0,tickFailures:0};
 const timer=setInterval(()=>{try{service.tick();health.lastTick=Date.now();}catch(e){health.lastFailure=Date.now();health.tickFailures++;console.error('Party persistence tick failed.');}},1000);timer.unref();
 const handler=async function(req,res){
  if(!req.url.startsWith('/mmo/'))return false;
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try{
   if(options.validateRequest)options.validateRequest(req);
   else{
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||''))throw Error('Local host required.');
    if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)throw Error('Same-origin requests required.');
   }
   if(req.url==='/mmo/health'&&req.method==='GET'){reply(200,{service:'riftkeepers-social',version:1,scope:options.scope||'local-playtest'});return true;}
   if(req.url==='/mmo/bulletin'&&req.method==='GET'&&options.bulletin){reply(200,options.bulletin.publicFeed());return true;}
   if(req.url==='/mmo/state'&&req.method==='GET'){reply(200,service.read(req.headers.authorization));return true;}
   if(req.method!=='POST'||req.headers['content-type']!=='application/json')throw Error('JSON POST required.');
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Request is too large.');}const data=JSON.parse(body);
   if(req.url==='/mmo/session'){
    const key=options.clientAddress?options.clientAddress(req):req.socket.remoteAddress,t=Date.now();
    if(visits.size>=1024){for(const [address,times] of visits)if(times.every(n=>t-n>=60000))visits.delete(address);if(!visits.has(key)&&visits.size>=1024)throw Error('New sessions are busy. Try again shortly.');}
    const last=visits.get(key)||[],recent=last.filter(n=>t-n<60000);if(recent.length>=20)throw Error('Too many new sessions. Try again shortly.');recent.push(t);visits.set(key,recent);
    reply(200,service.session(data.name));
   }else if(req.url==='/mmo/name')reply(200,service.claimName(req.headers.authorization,data.name));
   else if(req.url==='/mmo/command')reply(200,service.command(req.headers.authorization,data));
   else reply(404,{error:'Unknown route.'});
  }catch(e){reply(e.status||400,{error:e.message});}
  return true;
 };handler.read=service.read;handler.claimName=service.claimName;handler.diagnostics=()=>({...service.diagnostics(),health:{...health}});handler.close=()=>clearInterval(timer);return handler;
}
module.exports={socialHTTP};

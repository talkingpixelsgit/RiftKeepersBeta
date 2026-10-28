'use strict';
const COOKIE='__Host-rk-account';
const readCookie=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
function accountHTTP({accounts,validateRequest,clientAddress}){
 return async(req,res)=>{
  if(!req.url.startsWith('/account/'))return false;
  const reply=(status,body,cookie)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})});res.end(JSON.stringify(body));};
  try{
   validateRequest(req);const token=readCookie(req);
   if(req.method==='GET'&&req.url==='/account/status'){reply(200,accounts.auth(token)?accounts.get(token):{guest:true});return true;}
   if(req.method==='GET'&&req.url==='/account/save'){reply(200,accounts.get(token,true));return true;}
   if(req.method!=='POST'||req.headers['content-type']!=='application/json')throw Object.assign(Error('JSON POST required.'),{status:405});
   const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>1000000)throw Object.assign(Error('Request too large.'),{status:413});chunks.push(chunk);}let data;try{data=JSON.parse(Buffer.concat(chunks).toString());if(!data||Array.isArray(data)||typeof data!=='object')throw 0;}catch{throw Object.assign(Error('Invalid request.'),{status:400});}
   let result;
   if(req.url==='/account/register')result=await accounts.register(data,clientAddress(req));
   else if(req.url==='/account/login')result=await accounts.login(data,clientAddress(req));
   else if(req.url==='/account/recover')result=await accounts.recover(data,clientAddress(req));
   else if(req.url==='/account/save')result=accounts.put(token,data);
   else if(req.url==='/account/logout'){accounts.logout(token);reply(200,{ok:true},`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);return true;}
   else {reply(404,{error:'Unknown account route.'});return true;}
   const session=result.token;delete result.token;reply(200,result,session?`${COOKIE}=${session}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`:null);
  }catch(e){reply(e.status||500,{error:e.status?e.message:'Account service unavailable. Your device save is unchanged.'});}return true;
 };
}
module.exports={accountHTTP,readCookie};

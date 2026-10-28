'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createHosted}=require('../server/hosted-playtest.cjs');
if(process.platform!=='linux')throw Error('Hosted entrypoint requires Linux. Use tools/serve.cjs for the Windows preview.');
const dataDir='/state',socket=path.join(dataDir,'operator.sock');
const crypto=require('node:crypto');
for(const [name,bytes] of [['playtest-password',24],['gate-key',32]]){
 const file=path.join(dataDir,name);
 try{fs.writeFileSync(file,crypto.randomBytes(bytes).toString('hex'),{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;}
}

const app=createHosted({webRoot:path.resolve(__dirname,'../web'),dataDir,password:fs.readFileSync(path.join(dataDir,'playtest-password'),'utf8').trim(),cookieKey:fs.readFileSync(path.join(dataDir,'gate-key'),'utf8').trim()});
if(fs.existsSync(socket)){if(!fs.lstatSync(socket).isSocket())throw Error('Operator path is not a socket.');fs.unlinkSync(socket);}
const operator=http.createServer(app.monitor.handler);
operator.on('error',()=>{console.error('Private operator socket unavailable.');process.exitCode=1;app.close();});
operator.listen(socket,()=>{fs.chmodSync(socket,0o600);fs.writeFileSync(path.join(dataDir,'operator-access.json'),JSON.stringify({socket,port:8794,key:app.monitor.token}),{mode:0o600});console.log('Private operator socket ready. Use the SSH tunnel instructions.');});
app.server.on('error',()=>{console.error('Game listener unavailable.');process.exit(1);});
app.server.listen(8080,'0.0.0.0',()=>console.log('Rift Keepers build28 ready on container port 8080.'));
let stopping=false;async function stop(){if(stopping)return;stopping=true;operator.closeAllConnections();operator.close();await app.close();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);

'use strict';
const fs=require('node:fs'),path=require('node:path');
function createHotfix({dataDir,revision,now=Date.now}){
 const file=path.join(dataDir,'hotfix.json');let state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{sequence:0,notice:null};
 const snapshot=()=>({...state,runningRevision:revision,serverNow:now()});
 function command(c){if(!c||c.sequence!==state.sequence)throw Error('Update notice changed. Reload it first.');let notice=null;
  if(c.type==='schedule'){if(!/^[a-zA-Z0-9._-]{1,80}$/.test(c.target||''))throw Error('Enter a valid target revision.');if(!Number.isInteger(c.seconds)||c.seconds<30||c.seconds>3600)throw Error('Countdown must be 30–3600 seconds.');const message=String(c.message||'A hotfix is ready. The game will refresh after your current action.').trim();if(!message||message.length>300)throw Error('Message must be 1–300 characters.');notice={id:state.sequence+1,target:c.target,message,refreshAt:now()+c.seconds*1000,expiresAt:now()+86400000};}
  else if(c.type!=='cancel')throw Error('Unknown hotfix action.');
  const next={sequence:state.sequence+1,notice};fs.writeFileSync(file+'.tmp',JSON.stringify(next),{mode:0o600});fs.renameSync(file+'.tmp',file);state=next;return snapshot();
 }
 return {snapshot,command};
}
module.exports={createHotfix};

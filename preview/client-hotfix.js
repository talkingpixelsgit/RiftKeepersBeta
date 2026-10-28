'use strict';
window.RKHotfix=(()=>{
 const CLIENT_REVISION='build28-hotfix12';let status=null,receivedAt=0,firstSeen=0,lastId='',busy=false,reloading=false,box=null;
 function blocked(){return !!(B||RUN||EXPLORING||travelling||MG_ON||timingActive||guardActive||padScope()||window.RKParty?.active||window.RKParty?.busy||window.RKControllerText?.active||window.RKCloud?.blocked||saving||saveAgain||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'));}
 function current(){if(!status)return null;const n=status.notice;if(n&&n.expiresAt>status.serverNow&&n.target!==CLIENT_REVISION)return n;if(status.runningRevision!==CLIENT_REVISION)return {id:'deployed:'+status.runningRevision,target:status.runningRevision,message:'A hotfix is ready. Your game will refresh after your current action.',refreshAt:status.serverNow+(firstSeen+60000-receivedAt)};return null;}
 async function reload(){const n=current();if(reloading||blocked()||!n||status.runningRevision!==n.target||Date.now()-receivedAt>20000)return;
  if(ONLINE){toast('Update ready. Save and refresh when you are ready.');return;}
  clearTimeout(saveTimer);if(S?.arch&&!writeLocalSave()){paint('Save failed. Keep this tab open and retry saving before refreshing.');return;}
  if(window.RKCloud?.account){await RKCloud.flush();if(RKCloud.blocked)return;}
  reloading=true;location.reload();
 }
 function paint(warning){const n=current();if(!n){box?.remove();box=null;return;}if(!box){box=document.createElement('aside');box.id='rk-hotfix-banner';box.innerHTML='<b>Hotfix update</b><p data-hotfix-message></p><p data-hotfix-time role="status"></p><button class="btn" data-hotfix-refresh>Save & refresh now</button>';document.body.append(box);box.querySelector('button').onclick=reload;}
  box.querySelector('[data-hotfix-message]').textContent=n.message;const seconds=Math.max(0,Math.ceil((n.refreshAt-(status.serverNow+Date.now()-receivedAt))/1000));const stale=Date.now()-receivedAt>20000,ready=status.runningRevision===n.target;
  box.querySelector('[data-hotfix-time]').textContent=warning||(stale?'Connection interrupted. Refresh paused.':!ready?'Waiting for the patch to finish deploying.':blocked()?'Refresh waits until your current action is finished.':seconds?`Refresh in ${seconds}s.`:'Saving before refresh…');box.querySelector('button').disabled=blocked()||!ready||stale;
  if(!warning&&!seconds&&!stale&&ready&&!blocked())void reload();
 }
 async function poll(){if(busy)return;busy=true;try{const r=await fetch('/client-update',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();const next=await r.json();if(typeof next.runningRevision!=='string'||!Number.isFinite(next.serverNow))throw Error();const id=String(next.notice?.id||next.runningRevision);if(id!==lastId){lastId=id;firstSeen=Date.now();}status=next;receivedAt=Date.now();}catch{}finally{busy=false;paint();}}
 setInterval(poll,10000);setInterval(()=>paint(),1000);poll();return {poll,blocked,revision:CLIENT_REVISION};
})();

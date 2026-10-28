'use strict';
/* Reports actual local writes; shared satchels and multiplayer sessions remain server-owned. */
window.RKSaveStatus=(()=>{
 function message(){if(localSaveStatus.state==='failed')return 'Not saved: browser storage could not accept your latest progress.';if(localSaveStatus.pending)return 'Saving solo progress on this device…';if(localSaveStatus.state==='saved')return 'Solo progress saved on this device at '+new Date(localSaveStatus.at).toLocaleTimeString()+'.';return 'No new solo save confirmed this session.';}
 function refresh(){const text=message();for(const el of document.querySelectorAll('[data-local-save-status]'))if(el.textContent!==text)el.textContent=text;
  const foot=document.getElementById('syncState');if(foot&&!ONLINE&&S?.arch&&foot.textContent!==text)foot.textContent=text;
  const main=document.getElementById('main'),warning=document.getElementById('local-save-warning');
  const safe=!B&&!window.RKParty?.active&&!document.querySelector('.overlay,.ask,.sheet');
  if(localSaveStatus.state==='failed'&&S?.arch&&main&&safe){if(!warning)main.insertAdjacentHTML('afterbegin','<aside id="local-save-warning" class="save-health-warning" role="alert"><p>Your latest solo progress is still in memory. Browser storage did not save it. Keep this tab open and retry.</p><button class="btn" data-local-save-now>Retry device save</button></aside>');}
  else warning?.remove();
 }
 function flush(){if(!ONLINE&&localSaveStatus.pending&&S?.arch){clearTimeout(saveTimer);saveTimer=null;writeLocalSave();}}
 const previous=settingsHTML;settingsHTML=function(){const section=`<section class="admin-sec save-health"><h3>Your solo save</h3><p data-local-save-status role="status">${esc(message())}</p><button class="btn" data-local-save-now ${S?.arch?'':'disabled'}>Save on this device now</button><p class="meta">Solo progress belongs to this browser. Portals restore supplies; autosave records progress. Clearing site data can remove this save. Your shared trade satchel and guild records are saved separately by the local server.</p></section>`;return previous().replace('</div>','</div>'+section);};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-local-save-now]');if(!b||b.disabled||!S?.arch)return;writeLocalSave();});
 const priorRender=render;render=function(){priorRender();refresh();};
 addEventListener('rk-local-save',refresh);
 addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 addEventListener('pagehide',flush);
 return {message,refresh,flush};
})();

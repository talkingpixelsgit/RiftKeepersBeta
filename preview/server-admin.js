/* Staff identity is granted by the server to a unique session ID. */
'use strict';
(()=>{
 const originalAdmin=adminHTML;
 adminHTML=function(){return `<section class="admin-sec" id="rk-live-admin"><h2>Live server</h2><p id="rk-admin-count" role="status">Checking connected players…</p><p class="meta">Counts active browser sessions in the last 15 seconds. Multiple tabs may count separately; this is not a total of unique people.</p><button class="btn" id="rk-admin-refresh">Refresh player count</button><p class="meta">Server on/off, news and patch notes remain in your private Server Admin desktop shortcut. World database tools below require their own connected backend.</p></section>`+originalAdmin();};
 const originalBind=bindAdmin;
 bindAdmin=function(){originalBind();const b=document.getElementById('rk-admin-refresh');if(b)b.onclick=()=>window.RKParty?.refresh();updateCount();};
 function updateCount(){const el=document.getElementById('rk-admin-count');if(!el)return;const party=window.RKParty,a=party?.state?.admin;el.textContent=party?.connected&&a?`${a.onlineSessions} connected now · ${a.knownSessions} saved sessions · Updated ${new Date(a.checkedAt).toLocaleTimeString()}`:'Live player count unavailable. Reconnecting…';}
 function sync(){
  const party=window.RKParty;
  if(party?.connected){const allowed=party.state?.you?.role==='creator';if(amOwner!==allowed){amOwner=allowed;renderNav();if(!allowed&&(view==='admin'||view==='staff'))go('menu');else if(view==='menu'||view==='admin'||view==='staff')render();}}
  updateCount();
 }
 setInterval(sync,1000);sync();
})();

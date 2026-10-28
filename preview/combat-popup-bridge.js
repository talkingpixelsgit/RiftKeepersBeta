/* Build28: ability-specific cut-ins; no input hooks or combat waits. */
'use strict';
window.RKCombatPopups=(()=>{
 const url=new URL('combat-popups/combat-popups.js',document.currentScript.src),api=import(url.href);
 const live=new Map();let frame=0,offline=false;
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const allowed=()=>!offline&&!document.hidden&&SET.attackCut!==false&&SET.cutins!==false;
 const phaseFor=n=>['impact','resolved'].includes(n.dataset.phase)?'result':n.dataset.phase==='settled'?'settled':'anticipation';
 function clear(host){const s=live.get(host);if(!s)return;s.cancelled=true;s.handle?.destroy();api.then(m=>m.clear(s.slot)).catch(()=>{});s.slot.remove();live.delete(host);}
 function mount(host,actor,cue,facing='right',phase='anticipation',scope=null){
  clear(host);if(!host||!allowed())return;
  const slot=document.createElement('div');slot.className='rk-popup-slot';slot.setAttribute('aria-hidden','true');slot.inert=true;host.append(slot);
  const s={slot,actor,cue,phase,scope,handle:null,cancelled:false};live.set(host,s);
  api.then(m=>{if(s.cancelled||!slot.isConnected||!allowed())return null;return m.mount(slot,{actor,cue,facing,phase:s.phase,reduced:reduced()});}).then(h=>{if(!h)return;if(s.cancelled||!slot.isConnected||!allowed()){h.destroy();return;}s.handle=h;h.setPhase(s.phase);}).catch(()=>clear(host));
  wake();return ()=>clear(host);
 }
 function mapping(u,move,label=''){
  const sp=u?.baseSp||u?.sp;
  if(sp==='voth'&&(/chargeup|charge up/i.test(move+' '+label)))return ['voth','red-charge'];
  if(sp==='voth'&&(/spiritbrand|energy blast/i.test(move+' '+label)))return ['voth','spirit-release'];
  if(sp==='beast'&&(/fusehide|face me/i.test(move+' '+label)))return ['beast','iron-roar'];
  if(sp==='ticktail'&&(/tackle/i.test(move+' '+label)))return ['ticktail','enemy-tell'];
  return null;
 }
 function present({node,u,move,label,shared=false,you}){
  const choice=mapping(u,move,label);if(!choice)return;
  // Use the rendered team side: a partner has a different owner but is still an ally.
  const fighter=shared?[...(node.closest('.combat-shell')?.querySelectorAll('[data-fighter]')||[])].find(n=>n.dataset.fighter===String(u.id)):null;
  const facing=shared?(fighter?fighter.dataset.side==='enemy'?'left':'right':u.owner===you?'right':'left'):(u.side==='E'?'left':'right');
  return mount(node.querySelector('.rk-cinema-art'),...choice,facing,phaseFor(node),node);
 }
 function windup(root,u){
  if(!allowed()||!['voth','voth2'].includes(u?.sp))return ()=>{};
  // Use the existing presentation ribbon; the mini-action and its buttons stay in their dock.
  const shell=document.querySelector('.battle>.rk-cinema');if(!shell)return ()=>{};
  shell.dataset.phase='anticipation';
  const host=shell.querySelector('.rk-cinema-art');return mount(host,'voth','red-charge',u.side==='E'?'left':'right','anticipation',root)||(()=>{});
 }
 function tick(){frame=0;
  for(const [host,s]of live){
   if(!allowed()||!host.isConnected||!s.slot.isConnected||s.scope&&!s.scope.isConnected||document.querySelector('.ask,.sheet,.overlay,#rk-transform-scene')){clear(host);continue;}
   const cinema=host.closest('.rk-cinema');if(cinema){const charging=s.scope?.classList.contains('rk-qte-charge');if(charging)cinema.dataset.phase='anticipation';s.phase=charging?'anticipation':phaseFor(cinema);if(s.phase==='settled'){clear(host);continue;}}
   if(s.handle){if(s.renderedPhase!==s.phase){s.handle.setPhase(s.phase);s.renderedPhase=s.phase;}s.handle.setReduced(reduced());s.handle.node.dataset.sparks=String(SET.sparks!==false);}
  }
  if(live.size)frame=requestAnimationFrame(tick);
 }
 function wake(){if(!frame&&live.size)frame=requestAnimationFrame(tick);}
 function syncCapture(){
  const cinema=document.querySelector('.soul-cinema');if(!cinema||!allowed())return;
  const caption=cinema.querySelector('.soul-caption')?.textContent||'';
  const cue=caption==='SOUL ESCAPED'?'capture-break':'capture-bind',phase=['SOUL BOUND','SOUL ESCAPED'].includes(caption)?'result':'anticipation';
  const old=live.get(cinema);if(!old||old.cue!==cue){mount(cinema,'keeper',cue,'right',phase,cinema);}else old.phase=phase;
 }
 new MutationObserver(syncCapture).observe(document.body,{childList:true,subtree:true});
 function clearAll(){for(const host of [...live.keys()])clear(host);cancelAnimationFrame(frame);frame=0;}
 addEventListener('visibilitychange',()=>{if(document.hidden)clearAll();});addEventListener('offline',()=>{offline=true;clearAll();});addEventListener('online',()=>offline=false);addEventListener('pagehide',clearAll);
 api.then(m=>m.ready()).catch(()=>{});
 return {present,windup,clearAll,ready:api,mapping};
})();

/* Presentation only: local wind-up and confirmed release, never a combat clock. */
'use strict';
window.RKChargeEffects=(()=>{
 const live=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 const blocked=()=>document.hidden||!!document.querySelector('.ask,.sheet,.overlay,#rk-transform-scene');
 const isVoth=u=>['voth','voth2'].includes(u?.sp)||u?.baseSp==='voth';
 function attach(host,{colour='red',release=false}={}){
  if(!host||blocked())return null;
  const node=document.createElement('div');node.className='rk-charge-fx';node.dataset.colour=colour==='yellow'?'yellow':'red';node.dataset.phase=release?'release':'gather';node.setAttribute('aria-hidden','true');
  node.innerHTML='<i class="rk-charge-haze"></i><i class="rk-charge-ground"></i>'+Array.from({length:7},(_,i)=>`<i class="rk-charge-ember" style="--i:${i}"></i>`).join('')+'<svg class="rk-charge-bolts" viewBox="0 0 160 180" fill="none"><path d="M38 154 L25 121 L40 111 L23 76 L40 49 L34 24 M25 121 L12 111 L17 93"/><path d="M122 155 L140 126 L125 111 L143 83 L128 61 L138 29 M143 83 L151 69 L145 55"/><path d="M48 164 L69 151 L85 163 L110 147 L127 159"/></svg>';
  host.classList.add('rk-charge-host');host.append(node);
  const state={node,host,frame:0,timer:0,stop(){cancelAnimationFrame(this.frame);clearTimeout(this.timer);node.remove();live.delete(this);if(!host.querySelector(':scope>.rk-charge-fx'))host.classList.remove('rk-charge-host');}};live.add(state);
  const tick=()=>{if(!node.isConnected||blocked()){state.stop();return;}node.dataset.still=String(reduced()||SET.sparks===false);state.frame=requestAnimationFrame(tick);};tick();
  if(release)state.timer=setTimeout(()=>state.stop(),1600);
  return state;
 }
 function clear(){for(const state of [...live])state.stop();}
 function windup(root,u){
  if(!isVoth(u))return ()=>{};
  const effects=[attach(root.querySelector('.rk-qte-actor')),attach(pEl(u.id))].filter(Boolean);
  const stopPopup=window.RKCombatPopups?.windup(root,u);
  return ()=>{effects.forEach(e=>e.stop());stopPopup?.();};
 }
 const oldAura=vothChargeAura;vothChargeAura=function(u){oldAura.apply(this,arguments);if(isVoth(u))attach(pEl(u.id),{release:true});};
 // Shared combat has no local QTE. Only confirmed Charge Up events trigger its release.
 const oldEvents=RKSharedLooks.events;RKSharedLooks.events=function(events,match,you){
  const result=oldEvents.apply(this,arguments);
  for(const e of events){
   const u=match.units.find(u=>u.id===e.unit);if(!u||!['action','enemy'].includes(e.type))continue;
   const red=isVoth(u)&&(/charge/i.test(e.label||e.move||'')||e.move==='technique'&&u.charged),yellow=/^(storm|lightning)$/.test(e.element||'');
   if(red||yellow)attach(document.querySelector(`[data-fighter="${u.id}"] .exp-portrait`),{release:true,colour:red?'red':'yellow'});
  }
  return result;
 };
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 addEventListener('pagehide',clear);addEventListener('offline',clear);addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 return {attach,windup,clear,isVoth,get active(){return live.size;}};
})();

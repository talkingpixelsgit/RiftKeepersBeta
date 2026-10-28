/* Cosmetic adapters for existing resolved-event consumers. No rules or input handlers. */
'use strict';
window.RKAbilityVisuals=(()=>{
 const colours={fire:'#f5a685',storm:'#a7dbff',ice:'#c0eaff',water:'#78dce5',earth:'#c4aedb',spirit:'#9cf5e7',void:'#b699ff'};
 const nodes=new Set(),timers=new Map();let battle='',last=0;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 const blocked=()=>document.hidden||!!document.querySelector('.overlay,.ask,.sheet,#rk-transform-scene');
 const kind=el=>({lightning:'storm',ki:'spirit',dark:'void',ember:'fire',frost:'ice',nature:'earth'}[el]|| (colours[el]?el:'void'));
 function remove(n){clearTimeout(timers.get(n));timers.delete(n);nodes.delete(n);n.remove();}
 function clear(){[...nodes].forEach(remove);}
 function cue(host,element,mode='impact',seq=0,strong=false,tint=null){
  if(!host||blocked())return;
  if(nodes.size>=12)remove(nodes.values().next().value);
  const n=document.createElement('span');n.className='rk-ability-vfx';n.dataset.element=kind(element);n.dataset.mode=mode;n.dataset.path=['above','forward','branch'][Math.abs(seq)%3];n.dataset.strong=String(!!strong);n.dataset.still=String(reduced());n.setAttribute('aria-hidden','true');n.style.setProperty('--magic',tint||colours[kind(element)]);
  for(const name of ['trace','seal','motes']){const c=document.createElement('i');c.className='rk-magic-'+name;n.appendChild(c);}
  host.appendChild(n);nodes.add(n);timers.set(n,setTimeout(()=>remove(n),reduced()?450:mode==='charge'?1000:850));return n;
 }
 function events(list,match){
  if(!match||blocked()||view!=='fellowship')return;
  if(battle!==match.id){battle=match.id;last=0;}
  const fresh=list.filter(e=>Number.isFinite(e.seq)&&e.seq>last);last=Math.max(last,...fresh.map(e=>e.seq));
  const host=id=>[...document.querySelectorAll('[data-fighter]')].find(n=>n.dataset.fighter===id)?.querySelector('.exp-portrait');
  for(const e of fresh){
   const u=match.units.find(u=>u.id===e.unit);
   if(e.type==='action'&&u?.sp==='voth'&&e.move==='technique'&&u.charged)cue(host(e.unit),'spirit','charge',e.seq,true);
   else if(e.type==='action'&&e.move==='guard')cue(host(e.unit),'void','ward',e.seq);
   else if(e.type==='restore'&&e.amount>0)cue(host(e.unit),e.stat==='hp'?'spirit':'water','restore',e.seq);
   else if(e.type==='damage'&&e.amount>0){const a=list.findLast(a=>(a.type==='action'||a.type==='enemy')&&a.unit===e.source&&a.seq<e.seq);if(!a)continue;const source=match.units.find(u=>u.id===e.source),pref=window.RKSharedLooks?.settings?.(source?.sp),tint=pref?.colour&&pref.colour!=='original'?RKSharedLooks.colours?.[pref.colour]?.[2]:null;cue(host(e.unit),a.element,'impact',e.seq,a.move==='special'||a.charged,tint);}
  }
 }
 // RKCombatMotion already gates fresh events and calls clear on redraw/disconnect.
 if(window.RKSharedLooks){const oldClear=RKSharedLooks.clear;RKSharedLooks.clear=function(){clear();return oldClear.apply(this,arguments)};RKSharedLooks.events=events;}
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments)};
 addEventListener('visibilitychange',clear);addEventListener('offline',clear);addEventListener('pagehide',clear);media.addEventListener('change',clear);
 new MutationObserver(()=>{if(blocked())clear();else for(const n of nodes)if(!n.isConnected)remove(n);}).observe(document.body,{childList:true,subtree:true});
 return {clear,events,cue,kind};
})();

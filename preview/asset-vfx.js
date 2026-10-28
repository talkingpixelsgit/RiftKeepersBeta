/* Sprite presentation only. No commands, combat results, unlocks or saved state. */
'use strict';
window.RKAssetVFX=(()=>{
 const base=new URL('assets/skill-vfx/',document.currentScript.src),media=matchMedia('(prefers-reduced-motion: reduce)');
 const specs={portalVoid:[5,3,15,12],portalAqua:[5,3,15,12],mysteryVoid:[5,4,20,10],soulAqua:[5,6,30,12],pillarBack:[5,2,10,12],pillarFront:[5,2,10,12],lightningForward:[4,1,4,12],lightningHeavy:[4,1,4,12],lightningAbove:[5,1,5,12],lightningStrike:[5,1,5,12],chargeArcs:[4,1,4,12],chargeSparks:[5,2,8,12],meleeSmear:[5,1,5,24],soulCoil:[13,9,13,24,2]};
 const live=new Set(),seenCues=new WeakSet();let raf=0,offline=false,serial=0,queued=false;
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 function blocked(host){
  if(document.hidden||offline||SET.sparks===false)return true;
  return [...document.querySelectorAll('.overlay,.ask,.sheet')].some(n=>!n.contains(host));
 }
 function stop(state){state.node.remove();live.delete(state);if(!state.host.querySelector(':scope>.rk-asset-sprite'))state.host.classList.remove('rk-sprite-host');if(!live.size){cancelAnimationFrame(raf);raf=0;}}
 function paint(s,index){if(s.frame===index)return;s.frame=index;s.node.dataset.frame=index;const[c,r]=s.spec;s.node.style.backgroundPosition=`${c===1?0:index%c/(c-1)*100}% ${r===1?0:(Math.floor(index/c)+(s.spec[4]||0))/(r-1)*100}%`;}
 function tick(now){raf=0;let moving=false;
  for(const s of [...live]){
   if(!s.node.isConnected||blocked(s.host)||s.ambient&&SET.mapWeather===false){stop(s);continue;}
   const elapsed=now-s.start;
   if(!s.loop&&elapsed>=s.duration){stop(s);continue;}
   const still=reduced();s.node.dataset.still=String(still);
   if(elapsed<0){s.node.style.opacity='0';moving=true;continue;}
   const f=still?Math.min(2,s.spec[2]-1):s.loop?Math.floor(elapsed*s.spec[3]/1000)%s.spec[2]:Math.min(s.spec[2]-1,Math.floor(elapsed*s.spec[3]/1000));paint(s,f);
   const fade=s.loop||still?1:Math.min(1,elapsed/70,Math.max(0,(s.duration-elapsed)/130));s.node.style.opacity=String(s.opacity*fade);
   if(!still||!s.loop)moving=true;
  }
  if(moving)raf=requestAnimationFrame(tick);
 }
 function play(host,key,{loop=false,duration,delay=0,className='',opacity=.65,ambient=false,colour=''}={}){
  const spec=specs[key];if(!host?.isConnected||!spec||blocked(host)||ambient&&SET.mapWeather===false)return null;
  if(live.size>=18)stop(live.values().next().value);
  const node=document.createElement('i');node.className='rk-asset-sprite '+className;node.dataset.asset=key;node.dataset.colour=colour;node.setAttribute('aria-hidden','true');node.style.backgroundImage=`url("${new URL(key+'.png',base)}")`;node.style.backgroundSize=`${spec[0]*100}% ${spec[1]*100}%`;
  host.classList.add('rk-sprite-host');host.append(node);
  const s={node,host,key,spec,loop,ambient,opacity,frame:-1,start:performance.now()+delay,duration:duration??spec[2]/spec[3]*1000+110,stop(){stop(this);}};live.add(s);paint(s,0);node.style.opacity='0';if(!raf)raf=requestAnimationFrame(tick);return s;
 }
 function clear(){cancelAnimationFrame(raf);raf=0;for(const s of [...live])stop(s);}
 function once(host,key,options){if(host&&!host.querySelector(':scope>.rk-asset-sprite[data-asset="'+key+'"]'))return play(host,key,options);}
 function cue(node){
  if(seenCues.has(node))return;seenCues.add(node);
  if(node.dataset.mode!=='impact')return;
  if(node.dataset.element==='spirit'){if(play(node.parentElement,'soulCoil',{className:'rk-asset-soul-coil',opacity:.6}))node.classList.add('rk-sprite-enhanced');return;}
  if(node.dataset.element!=='storm')return;
  const key=node.dataset.path==='above'?'lightningAbove':node.dataset.path==='forward'?'lightningForward':'lightningStrike';
  if(play(node.parentElement,key,{className:'rk-asset-impact',opacity:.7}))node.classList.add('rk-sprite-enhanced');
 }
 function sync(){
  for(const s of [...live])if(!s.node.isConnected||blocked(s.host)||s.ambient&&SET.mapWeather===false)stop(s);
  if(document.hidden||offline||SET.sparks===false)return;
  const portal=document.querySelector('#portalOv .portalbox h2');
  once(portal,'portalVoid',{loop:true,className:'rk-asset-portal-heading',opacity:.65});
  const scene=document.querySelector('.location-art');
  if(scene&&!blocked(scene)&&SET.mapWeather!==false){
   const icon=scene.querySelector('.landmark-rest>i');if(icon){icon.classList.add('rk-asset-landmark');once(icon,'portalVoid',{loop:true,ambient:true,className:'rk-asset-portal-landmark',opacity:.8});}
   const key=['hall','riftscar','night'].includes(S.loc)?'mysteryVoid':'soulAqua';once(scene,key,{loop:true,ambient:true,className:'rk-asset-scene-object',opacity:key==='mysteryVoid'?.38:.45});
  }
  const stage=document.querySelector('#rk-transform-scene .rk-transform-stage');
  if(stage&&!blocked(stage)){once(stage,'pillarBack',{loop:true,className:'rk-asset-transform-back',opacity:.45});once(stage,'pillarFront',{loop:true,className:'rk-asset-transform-front',opacity:.12});}
  document.querySelectorAll('.rk-ability-vfx').forEach(cue);
  if(live.size&&!raf)raf=requestAnimationFrame(tick);
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync();});}
 const oldResolve=resolve;resolve=function(u,mk,target,...rest){
  const battle=B,r=oldResolve.call(this,u,mk,target,...rest),move=MOVES[mk],el=move&&fxType(move);
  if(r?.kind==='dmg'&&r.dmg>0&&['storm','lightning'].includes(el)){
   const id=target?.id||target,key=(++serial%2)?'lightningAbove':'lightningHeavy';
   queueMicrotask(()=>{if(B===battle&&!blocked(document.body))play(pEl(id),key,{className:'rk-asset-impact',opacity:.7});});
  }return r;
 };
 if(window.RKChargeEffects){const oldWind=RKChargeEffects.windup;RKChargeEffects.windup=function(root,u){
  const stopOld=oldWind.apply(this,arguments),host=RKChargeEffects.isVoth(u)?pEl(u.id):null;
  const red=play(host,'chargeSparks',{loop:true,className:'rk-asset-charge-sparks',opacity:.55,colour:'red'}),yellow=play(host,'chargeArcs',{loop:true,delay:170,className:'rk-asset-charge-arcs',opacity:.35,colour:'yellow'});
  return ()=>{stopOld?.();red?.stop();yellow?.stop();};
 };}
 const oldGo=go;go=function(){clear();const r=oldGo.apply(this,arguments);sync();return r;};
 const oldSettings=saveSettings;saveSettings=function(){const r=oldSettings.apply(this,arguments);clear();sync();return r;};
 if(window.RKCombatMotion){const oldSync=RKCombatMotion.sync;RKCombatMotion.sync=function(match,options={}){if(options.connected===false)clear();return oldSync.apply(this,arguments);};}
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 addEventListener('visibilitychange',()=>{clear();if(!document.hidden)sync();});addEventListener('pagehide',clear);addEventListener('offline',()=>{offline=true;clear();});addEventListener('online',()=>{offline=false;sync();});media.addEventListener('change',()=>{clear();sync();});
 sync();return {play,clear,sync,reduced,specs,get active(){return live.size;}};
})();

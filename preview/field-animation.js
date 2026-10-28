'use strict';
/* Render-only actor animation. Never dispatch actions, capture input, or delay rules. */
window.RKFieldAnimation=(()=>{
 const states=new Map(),idleNodes=new Map(),media=matchMedia('(prefers-reduced-motion: reduce)');
 let raf=0,lastIdle=-1,sharedMatch=null,offline=false;
 const reduced=()=>SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
 const blocked=()=>offline||document.hidden||!!document.querySelector('.overlay,.ask,.sheet,#rk-transform-scene');
 const hostFor=s=>s.shared?document.querySelector(`[data-fighter="${s.u.id}"] [data-fighter-art]`):pEl(s.u.id);
 const keyOf=(u,shared)=>(shared?'shared:':'solo:')+u.id;
 function restore(s){
  s.overlay?.remove();s.anchor?.removeAttribute('data-field-state');
  s.host?.removeAttribute('data-field-animating');
  if(s.host)for(const child of s.hidden||[])if(child.isConnected)child.style.visibility=s.visibility.get(child);
  s.overlay=null;s.host=null;
 }
 function stop(key){const s=states.get(key);if(s){restore(s);states.delete(key);}}
 function clear(){for(const key of [...states.keys()])stop(key);cancelAnimationFrame(raf);raf=0;}
 function attach(s,host){
  restore(s);s.host=host;s.anchor=host.closest('[data-fighter],[data-u]');
  host.setAttribute('data-field-animating','true');
  s.hidden=[...host.children];s.visibility=new Map(s.hidden.map(n=>[n,n.style.visibility]));
  const overlay=document.createElement('div');overlay.className='rk-field-action';overlay.setAttribute('aria-hidden','true');
  s.overlay=overlay;host.append(overlay);
  if(s.player){const c=document.createElement('canvas');c.width=s.player.width||420;c.height=s.player.height||280;c.className='rk-field-weapon rk-keeper-ink';if(s.player.style==='tattered')c.dataset.tattered='true';overlay.append(c);s.canvas=c;}
  else if(s.sheet){
   const html=s.staticPose?poseCellHTML(s.sheet,s.pose,'sprite'):poseCellHTML({...s.sheet,cols:s.cols,rows:2,cells:{strike:0}},'strike','sprite');
   overlay.innerHTML=s.shared&&window.RKSharedLooks?RKSharedLooks.decorate(html,s.u):html;s.sprite=overlay.querySelector('.posecell');
  }
  else {
   const original=s.hidden[0],clone=original?.cloneNode(true);
   if(clone){
    // Preserve the displayed art's facing and foot placement when moving it out
    // of direct-child portrait CSS. An already mirrored image must not flip again.
    const style=getComputedStyle(original);clone.classList.add('rk-field-fallback');
    for(const key of ['width','height','maxWidth','maxHeight','objectFit','objectPosition','transform','transformOrigin','scale','translate','rotate','filter','clipPath'])clone.style[key]=style[key];
    clone.style.visibility='visible';clone.style.animation='none';overlay.append(clone);
   }
  }
  for(const child of s.hidden)child.style.visibility='hidden';
 }
 function play(u,move,{shared=false,you,confirmed=false,seq=0}={}){
  if(reduced()||blocked()||u.hp<=0)return false;
  const key=keyOf(u,shared);stop(key);
  const regular=move==='attack'||REGULAR.has(move),sp=u.form||(u.evolved&&u.sp==='voth'?'voth2':u.sp);
  const sheet=typeof POLISHED_POSES!=='undefined'?POLISHED_POSES[sp]:null;
  const s={u,shared,you,move,key,start:performance.now(),confirmedAt:confirmed?0:null,regular,seq,times:[140,180,100,130,120,200],contact:2};
  if(regular&&sheet?.attacks?.length){s.sheet={...sheet,sheet:sheet.attacks[Math.abs(seq)%sheet.attacks.length]};s.cols=sp==='voth'||sp==='voth2'?6:3;}
  else if(sheet&&u.sp!=='keeper'&&u.kind!=='keeper'){s.sheet=sheet;s.staticPose=true;s.pose=shared?(move==='guard'?'guard':move==='technique'?'charge':'cast'):poseFor(move);}
  states.set(key,s);
  const choice=regular?RKWeaponPlayback.resolve(u,{local:shared?u.owner===you:u.ref==='keeper'}):null;
  s.weaponKey=choice?.key;
  if(choice)RKWeaponPlayback.load(choice.key).then(loaded=>{
   if(!loaded||states.get(key)!==s||blocked()||reduced())return;
   s.player=RKWeaponPlayback.prepare(loaded,choice);s.times=s.player.times;s.contact=s.player.contact;
   restore(s); // Rebind on the next frame; elapsed time is retained, never replay windup.
  });
  wake();return true;
 }
 function contact(u,shared=false){const s=states.get(keyOf(u,shared));if(s&&s.confirmedAt==null)s.confirmedAt=performance.now()-s.start;}
 function idleFrame(svg,frame){
  if(svg.dataset.tattered){RKTatteredArt.idleFrame(svg,frame);return;}
  const x=frame%6*384,y=Math.floor(frame/6)*576;
  svg.setAttribute('viewBox',`${x} ${y} 384 576`);
  const rect=idleNodes.get(svg)?.clip;rect?.setAttribute('x',x);rect?.setAttribute('y',y);
 }
 function idle(){
  for(const [svg,record] of idleNodes)if(!svg.isConnected){idleNodes.delete(svg);}else if(reduced()||blocked()){idleFrame(svg,0);}
  for(const svg of document.querySelectorAll('.battle .stage .keeper-r2,.facing-battle [data-fighter-art] .keeper-r2')){
   if(svg.dataset.keeper028||svg.closest('.rk-field-action')||idleNodes.has(svg))continue;
   if(svg.dataset.tattered){if(!svg.closest('.down,.fallen')){idleNodes.set(svg,{tattered:true});idleFrame(svg,0);}continue;}
   svg.classList.add('rk-keeper-ink');
   if(svg.closest('.down,.fallen'))continue;
   for(const image of svg.querySelectorAll('image')){
    const href=image.getAttribute('href')||'',file=href.endsWith('/keeper.png')?'composite-24.png':href.endsWith('/cloak.png')?'cloak-mask-24.png':href.endsWith('/eye-left.png')?'eyes-left-24.png':href.endsWith('/eye-right.png')?'eyes-right-24.png':null;
    if(file){image.setAttribute('href','preview/assets/keeper-idle-r2/'+file);image.setAttribute('width','2304');image.setAttribute('height','2304');}
   }
   // A square host letterboxes this portrait viewBox. Clip the actual cell,
   // otherwise neighbouring sheet frames can appear in the side gutters.
   const ns='http://www.w3.org/2000/svg',clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect'),group=document.createElementNS(ns,'g');
   clip.id=svg.querySelector('filter').id+'-idle-cell';clip.setAttribute('clipPathUnits','userSpaceOnUse');rect.setAttribute('width','384');rect.setAttribute('height','576');clip.append(rect);svg.querySelector('defs').append(clip);
   group.setAttribute('clip-path',`url(#${clip.id})`);for(const image of [...svg.children].filter(n=>n.tagName==='image'))group.append(image);svg.append(group);
   svg.dataset.motionSlot='keeper-cloth-idle';idleNodes.set(svg,{clip:rect});idleFrame(svg,0);
  }
 }
 function tick(now){
  raf=0;if(blocked()){clear();idle();return;}
  const frame=reduced()?0:Math.floor(now/100)%24;
  if(frame!==lastIdle){lastIdle=frame;idle();for(const svg of idleNodes.keys())if(svg.isConnected)idleFrame(svg,frame);}
  for(const [key,s] of states){
   const host=hostFor(s),elapsed=now-s.start;
   if(!host||reduced()||s.u.hp<=0||elapsed>5000||(s.confirmedAt!=null&&elapsed-s.confirmedAt>Math.max(480,RKFieldClock.duration(s.times,s.contact)+180))){stop(key);continue;}
   if(s.host!==host||!s.overlay?.isConnected)attach(s,host);
   const f=RKFieldClock.frameAt(s.times,elapsed,s.contact,s.confirmedAt);
   const after=s.confirmedAt==null?0:elapsed-s.confirmedAt;
   if(s.confirmedAt!=null&&!s.smearPlayed&&s.player&&['sword','greatsword','sword_shield','daggers','kusarigama'].includes(s.weaponKey)){
    s.smearPlayed=true;
    if(after<140)window.RKAssetVFX?.play(s.overlay,'meleeSmear',{className:'rk-asset-melee-smear',opacity:.7,duration:230});
   }
   const phase=s.confirmedAt==null?'anticipation':after<100?'contact':'recovery';s.anchor.dataset.fieldState=phase;
   // The same stance root is kept through the return; only the actor, never its controls, moves.
   const travel=s.regular?(s.confirmedAt==null?-Math.min(4,elapsed/60):12*Math.max(0,1-after/420)):0;
   const sign=!s.shared&&s.u.side==='E'?-1:1;
   s.overlay.style.transform=`translateX(${sign*travel}px)`;
   if(s.canvas){const ctx=s.canvas.getContext('2d');ctx.clearRect(0,0,s.canvas.width,s.canvas.height);ctx.drawImage(s.player.frame(f),0,0);s.canvas.dataset.frame=f;}
   if(s.sprite&&!s.staticPose)s.sprite.style.backgroundPosition=`${f%s.cols/(s.cols-1)*100}% ${Math.floor(f/s.cols)*100}%`;
  }
  if(!reduced()&&document.querySelector('.battle .stage,.facing-battle .expedition-stage'))raf=requestAnimationFrame(tick);
 }
 function wake(){lastIdle=-1;if(!raf&&!blocked())raf=requestAnimationFrame(tick);}
 function shared(match,{connected=true}={}){
  if(sharedMatch!==match?.id){clear();sharedMatch=match?.id;}
  if(!connected||match?.phase!=='battle'){clear();return;}
  for(const s of states.values())if(s.shared){const u=match.units.find(x=>x.id===s.u.id);if(u)s.u=u;}
  wake();
 }
 const oldLunge=lunge;lunge=async function(u,t,move){play(u,move);return oldLunge.apply(this,arguments);};
 const oldCinema=skillCinema;skillCinema=async function(u,move){if(!REGULAR.has(move))play(u,move);return oldCinema.apply(this,arguments);};
 const oldResolve=resolve;resolve=function(u){const result=oldResolve.apply(this,arguments);contact(u);return result;};
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 new MutationObserver(()=>{if(!document.querySelector('.battle .stage,.facing-battle .expedition-stage')){clear();idleNodes.clear();}else wake();}).observe(document.getElementById('main'),{childList:true,subtree:true});
 addEventListener('visibilitychange',()=>{clear();idle();wake();});addEventListener('offline',()=>{offline=true;clear();});addEventListener('online',()=>{offline=false;wake();});addEventListener('pagehide',clear);media.addEventListener('change',()=>{clear();wake();});
 wake();return {play,contact,clear,shared};
})();

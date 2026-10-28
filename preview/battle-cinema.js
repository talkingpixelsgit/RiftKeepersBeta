/* Cosmetic battle presentation. No action dispatch, damage, equipment or save mutation. */
'use strict';
window.RKBattleCinema=(()=>{
 let token=0,current=null,raf=0,expiry=0,pending=null;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
 const blocked=()=>document.hidden||!!document.querySelector('.overlay,.ask,.sheet,#rk-transform-scene');
 const enabled=()=>SET.attackCut!==false&&!blocked();
 const field=()=>document.querySelector('.battle>.camwrap,.combat-shell>.expedition-stage');
 function stop(){cancelAnimationFrame(raf);clearTimeout(expiry);current?.animation?.cancel();raf=0;expiry=0;token++;current=null;pending=null;}
 function clear(){stop();document.querySelectorAll('.rk-cinema').forEach(n=>n.remove());}
 function shell(){
  const stage=field();if(!stage||!enabled())return null;
  let n=stage.parentElement.querySelector(':scope>.rk-cinema');if(n)return n;
  n=document.createElement('section');n.className='rk-cinema';n._battle=B;n.setAttribute('aria-label','Battle move presentation');
  const art=document.createElement('div'),copy=document.createElement('div'),trace=document.createElement('i');art.className='rk-cinema-art';art.setAttribute('aria-hidden','true');copy.className='rk-cinema-copy';trace.className='rk-cinema-trace';trace.setAttribute('aria-hidden','true');
  for(const tag of ['small','strong','span'])copy.appendChild(document.createElement(tag));
  n.append(art,copy,trace);stage.before(n);return n;
 }
 function idle(){
  if(!enabled()){clear();return;}const n=shell();if(!n||current)return;
  const shared=!B,match=shared?window.RKParty?.state?.match:null,actor=B?.units?.find(u=>u.id===B.active)||match?.units?.find(u=>u.id===match.active);
  if(!actor)return;
  const key=(shared?'shared:':'solo:')+actor.id;
  if(n.dataset.actor===key&&!n.dataset.phase)return;
  delete n.dataset.phase;n.dataset.actor=key;n.dataset.still='true';n.dataset.cutin='false';
  n.querySelector('.rk-popup-slot')?.remove();n.removeAttribute('data-popup');
  n.querySelector('small').textContent='ACTING NOW';n.querySelector('strong').textContent=actor.name;
  n.querySelector('.rk-cinema-copy span').textContent=(shared?actor.team!=='rift':actor.side==='P')?'Choose your next move':'Enemy turn';
  const art=document.createElement('div');art.className='rk-cinema-portrait';
  const sp=actor.form||actor.sp;
  art.innerHTML=['voth','voth2'].includes(sp)?'<img src="preview/assets/voth-child/'+sp+'-portrait.png" alt="">':!shared&&actor.kind==='hero'&&ART_PORT[sp]?'<img src="'+ART_PORT[sp]+'" alt="">':portrait(actor,shared,window.RKParty?.state?.you?.id);
  if(!shared&&actor.side==='E'){
   const fieldImage=document.querySelector('.unit[data-u="'+actor.id+'"] .portrait img');
   if(fieldImage){const img=document.createElement('img');img.src=actor.sp==='ticktail'?'preview/assets/grounded-enemies/ticktail-ground.png':fieldImage.src;img.alt='';if(window.RKGroundedEnemies?.profiles?.[actor.sp]?.facing==='left')img.classList.add('rk-popup-face-right');art.replaceChildren(img);}
  }
  n.querySelector('.rk-cinema-art').replaceChildren(art);
 }

 function portrait(u,shared,you){
  if(shared)return RKCombatView.fighterArt(u,you);
  // Keep the existing child Voth and chosen body; do not fall back to random old weapon art.
  return unitArtHTML(u,'ok')||'';
 }
 function kind(move,element){if(/guard|ward|shield|counter/i.test(move))return 'guard';if(/charge|channel|gather/i.test(move))return 'charge';if(/heal|restore|tonic|mend/i.test(move))return 'heal';return element?'cast':'strike';}
 function present({u,move,label,element,kind:visualKind,shared=false,you,confirmed=false,local=false,weapon=true}){
  stop();const isSkill=move!=='attack'&&!REGULAR.has(move);if(!enabled()||(isSkill&&SET.cutins===false)){clear();return null;}
  const n=shell();if(!n)return null;const id=token;
  n.dataset.still=String(reduced());n.dataset.cutin=String(isSkill);n._detail=null;n.dataset.phase=confirmed?'resolved':'anticipation';n.dataset.kind=visualKind||kind(move,element);n.dataset.element=window.RKAbilityVisuals?.kind?.(element)||element||'void';n.dataset.voth=String((u.sp==='voth'||u.baseSp==='voth')&&n.dataset.kind==='charge');
  n.querySelector('small').textContent=u.name||'Keeper';n.querySelector('strong').textContent=label||move||'Attack';n.querySelector('.rk-cinema-copy span').textContent=confirmed?'Action confirmed':n.dataset.kind==='charge'?'Gathering power':'Preparing the move';
  const art=n.querySelector('.rk-cinema-art');art.replaceChildren();const figure=document.createElement('div');figure.className='rk-cinema-portrait';figure.innerHTML=n.dataset.kind==='charge'&&!shared?unitArtHTML(u,'ok','charge'):portrait(u,shared,you);art.append(figure);
  if(n.dataset.voth==='true')window.RKChargeEffects?.attach(figure,{release:true});
  else if(n.dataset.element==='storm')window.RKChargeEffects?.attach(figure,{release:true,colour:'yellow'});
  current={id,node:n,u,confirmed,start:performance.now(),contactAt:confirmed?performance.now():null,contact:confirmed,player:null,frame:0,last:performance.now(),elapsed:0};
  if(u.kind!=='keeper'&&u.sp!=='keeper'&&!reduced()){
   const sp=u.form||(u.evolved&&u.sp==='voth'?'voth2':u.sp),sheet=typeof POLISHED_POSES!=='undefined'&&POLISHED_POSES[sp];
   if(sheet?.attacks?.length&&(move==='attack'||REGULAR.has(move))){
    // Current child Voth has six columns; older companion sheets have three.
    const cols=['voth','voth2'].includes(sp)?6:3,rows=2;
    figure.innerHTML=clipHTML(sheet.attacks[0],cols,rows,[0,1,2,3,4,5],[140,180,100,130,120,200],'sprite');
    current.pose={el:figure.querySelector('.posecell'),cols,rows};
   }
  }
  window.RKCombatPopups?.present({node:n,u,move,label,shared,you});
  const choice=weapon?RKWeaponPlayback.resolve(u,{local}):null;
  if(choice&&!reduced()){
   n.dataset.weapon=choice.key;
   RKWeaponPlayback.load(choice.key).then(loaded=>{
    if(!loaded||token!==id||!current||!n.isConnected||!enabled()||reduced())return;
    // Decoding can complete after the authoritative result: begin at contact, never replay a wind-up.
    const player=RKWeaponPlayback.prepare(loaded,choice),c=document.createElement('canvas');c.width=player.width||420;c.height=player.height||280;c.className='rk-keeper-ink';if(player.style==='tattered')c.dataset.tattered='true';c.setAttribute('aria-hidden','true');art.replaceChildren(c);
    current.player=player;current.canvas=c;current.frame=current.contact?player.contact:0;current.elapsed=0;current.last=performance.now();
   });
  }else delete n.dataset.weapon;
  const tick=now=>{
   if(!current||token!==id)return;
   if(!enabled()||!n.isConnected||(isSkill&&SET.cutins===false)){clear();return;}
   const s=current;n.dataset.still=String(reduced());
   n.querySelector('.rk-cinema-trace').hidden=SET.sparks===false;
   if(s.pose){const frame=reduced()?2:s.contact?Math.min(5,2+Math.floor((now-s.contactAt)/145)):Math.min(1,Math.floor((now-s.start)/145));s.pose.el.style.backgroundPosition=`${frame%s.pose.cols/(s.pose.cols-1)*100}% ${Math.floor(frame/s.pose.cols)/(s.pose.rows-1)*100}%`;}
   if(s.player&&s.canvas){
    if(reduced())s.frame=s.player.contact;
    else {s.elapsed+=Math.min(80,now-s.last);const cap=s.contact?s.player.length-1:Math.max(0,s.player.contact-1);while(s.frame<cap&&s.elapsed>=s.player.times[s.frame]){s.elapsed-=s.player.times[s.frame];s.frame++;}}
    s.canvas.getContext('2d').clearRect(0,0,s.canvas.width,s.canvas.height);s.canvas.getContext('2d').drawImage(s.player.frame(s.frame),0,0);s.canvas.dataset.frame=s.frame;
   }
   s.last=now;raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);
  // Hard bound even if the resolver throws or an animation promise is interrupted.
  expiry=setTimeout(()=>finish(id),5000);
  return current;
 }
 function finish(id){if(!current||current.id!==id)return;cancelAnimationFrame(raf);raf=0;clearTimeout(expiry);if(current.node.isConnected){current.node.dataset.still='true';current.node.dataset.phase='settled';}current=null;pending=null;token++;}
 function contact({changed=false,text='Action resolved'}={}){
  if(!current)return;const s=current;s.contact=true;s.contactAt=performance.now();s.node.dataset.phase=changed?'impact':'resolved';s.node._detail=text;s.node.querySelector('.rk-cinema-copy span').textContent=SET.numbers===false?'Action confirmed':text;
  if(s.player){s.frame=s.player.contact;s.elapsed=0;s.last=performance.now();}
  // Only the portrait moves. Commands, target controls and the board never shake.
  if(changed&&!reduced()&&SET.sparks!==false){const el=s.node.querySelector('.rk-cinema-art');s.animation=el.animate([{transform:'none'},{transform:'translateX(2px)',offset:.3},{transform:'translateX(-2px)',offset:.6},{transform:'none'}],{duration:160});}
  clearTimeout(expiry);expiry=setTimeout(()=>finish(s.id),reduced()?500:850);
 }
 function sharedEvents(events,match,you){
  if(!enabled()||view!=='fellowship')return;
  const action=events.findLast(e=>['action','enemy','timeout'].includes(e.type));if(!action)return;
  const u=match.units.find(u=>u.id===action.unit);if(!u)return;
  const after=events.filter(e=>e.seq>action.seq),damage=after.filter(e=>e.type==='damage'&&e.source===u.id),restore=after.filter(e=>e.type==='restore');
  const move=action.type==='timeout'?'guard':action.move;
  present({u,move,label:action.label||(action.type==='timeout'?'Auto-guard':move),element:action.element,shared:true,you,confirmed:true,weapon:move==='attack'});
  const details=damage.length>1?`${damage.length} targets · ${damage.reduce((sum,e)=>sum+(e.amount||0),0)} total damage`:damage.length?`${match.units.find(u=>u.id===damage[0].unit)?.name||'Target'}: ${damage[0].amount||0} damage${damage[0].absorbed?' · '+damage[0].absorbed+' blocked':''}`:'Action confirmed';
  contact({changed:damage.some(e=>e.amount>0)||restore.some(e=>e.amount>0),text:SET.numbers===false?'Action confirmed':details});
 }
 if(window.RKSharedLooks){const oldEvents=RKSharedLooks.events;RKSharedLooks.events=function(events,match,you){const result=oldEvents.apply(this,arguments);sharedEvents(events,match,you);return result;};}
 if(window.RKCombatMotion){const oldSync=RKCombatMotion.sync;RKCombatMotion.sync=function(match,options={}){if(!match||options.connected===false||blocked())clear();return oldSync.apply(this,arguments);};
 const oldClear=RKCombatMotion.clear;RKCombatMotion.clear=function(){clear();return oldClear.apply(this,arguments);};}
 const oldCinema=skillCinema;skillCinema=async function(u,mk){
  if(REGULAR.has(mk))return;if(!field())return oldCinema.apply(this,arguments);if(!enabled())return;
  const m=MOVES[mk]||{},p=skillPresentation(u,mk);if(p.vothCharge)sfx('vothCharge',.65);
  present({u,move:mk,label:m.n,element:m.el,kind:p.kind,local:u.ref==='keeper',weapon:/Weapon/.test(m.tag||'')});
  await new Promise(resolve=>setTimeout(resolve,reduced()?0:fxT(180)));
 };
 const oldLunge=lunge;lunge=async function(u,t,mk){
  if(!field())return oldLunge.apply(this,arguments);
  if(REGULAR.has(mk)&&enabled()){present({u,move:mk,label:MOVES[mk]?.n||'Attack',local:u.ref==='keeper'});await new Promise(resolve=>setTimeout(resolve,reduced()?0:fxT(180)));}
  return {dx:0,dy:0,cut:false};
 };
 const oldResolve=resolve;resolve=function(u,mk,target,...args){
  const battle=B,before=(B?.units||[]).map(x=>[x.id,x.hp,x.shield||0]),result=oldResolve.call(this,u,mk,target,...args);
  if(B===battle&&current?.u===u){const changed=before.some(([id,hp,shield])=>{const x=B.units.find(x=>x.id===id);return x&&(x.hp!==hp||(x.shield||0)!==shield);});contact({changed,text:'Action resolved · details in the battle readout'});}return result;
 };
 const oldBanner=skillBanner;skillBanner=function(){if(!field())return oldBanner.apply(this,arguments);};
 const oldCutIn=cutIn;cutIn=function(){if(!field())return oldCutIn.apply(this,arguments);idle();};
 const oldHit=hitCutout;hitCutout=function(){if(!field())return oldHit.apply(this,arguments);};
 const oldRenderBattle=renderBattle;renderBattle=function(){
  // resolve() is followed immediately by a full redraw. Preserve this cosmetic node
  // so the confirmed contact/recovery can actually play, without replacing commands.
  const saved=document.querySelector('.battle>.rk-cinema'),same=saved?._battle===B,battle=B;
  if(saved&&same)saved.remove();
  const result=oldRenderBattle.apply(this,arguments),stage=field();
  if(saved&&same&&B===battle&&stage&&enabled())stage.before(saved);
  if(current&&!current.node.isConnected)stop();idle();return result;
 };
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 addEventListener('visibilitychange',clear);addEventListener('offline',clear);addEventListener('pagehide',clear);media.addEventListener('change',clear);
 new MutationObserver(()=>{if(!enabled()||!field()){if(current||document.querySelector('.rk-cinema'))clear();}else if(current&&!current.node.isConnected)stop();}).observe(document.body,{childList:true,subtree:true});
 // Cosmetic presentation never takes focus or consumes Confirm/Back/minigame input.
 return {clear,present,contact,sharedEvents,enabled,reduced,idle,get active(){return !!current;}};
})();

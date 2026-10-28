/* Presentation only. Existing workshop/tavern controls and server outcomes own all actions. */
'use strict';
window.RKBuild28UI=(()=>{
 let scheduled=0,lastSpin=null,seeded=false,timer=0;
 const previousMoveFocus=moveFocus;
 moveFocus=function(dx,dy){
  const active=document.activeElement,strip=active?.closest('.drew-tabs,.wayfarer-actions');
  if(dx&&!dy&&strip&&!B&&!MG_ON&&!timingActive&&!guardActive&&!padScope()){
   const controls=focusables(strip),index=controls.indexOf(active);
   if(index>=0&&controls.length>1){const next=controls[(index+Math.sign(dx)+controls.length)%controls.length];next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return;}
  }
  return previousMoveFocus.apply(this,arguments);
 };
 const text=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
 const add=(host,cls,markup)=>{let el=host.querySelector(':scope>.'+cls);if(!el){el=document.createElement('div');el.className=cls;el.setAttribute('aria-hidden','true');el.innerHTML=markup;host.querySelector('h2')?.after(el);}return el;};
 function sync(){
  const main=document.getElementById('main');if(!main)return;
  main.dataset.build28View=typeof view==='string'?view:'';
  const still=document.hidden||!navigator.onLine||SET.motion==='reduced'||(SET.motion!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches)||RKParty.connected===false;
  main.dataset.build28Motion=still?'still':'full';
  const fishing=main.querySelector('[data-rk="work:cast"],[data-rk="work:reel"]')?.closest('article');
  if(fishing){
   fishing.classList.add('rk-fishing-station');
   const scene=add(fishing,'rk-fishing-scene','<div class="rk-water-glint"></div><svg class="rk-rod" viewBox="0 0 600 200"><path d="M18 198 Q160 8 330 40"/><path class="rk-line" d="M330 40 L390 138"/></svg><i class="rk-float"></i><i class="rk-ripple"></i><div class="rk-water-caption"><b>HALL’S EDGE</b><span>Cast when you’re ready</span></div><div class="rk-bite-meter"><i></i></div>');
   const cast=RKParty.state?.trade?.wallet?.cast,now=Date.now(),away=cast&&cast.loc!==S.loc;
   const state=!RKParty.connected?'offline':!cast?'ready':away?'away':now<cast.bite?'waiting':now>cast.ends?'expired':'bite';
   scene.dataset.state=state;
   text(scene.querySelector('b'),typeof nodeName==='function'?nodeName(cast?.loc||S.loc):'RIVERSIDE');
   text(scene.querySelector('.rk-water-caption span'),({ready:'Cast when you’re ready',waiting:'Watch the float…',bite:'A bite — reel in!',expired:'The water is still again',away:'Your line is waiting here',offline:'Connection lost — reconnect to fish'})[state]);
   const progress=state==='bite'?Math.max(0,Math.min(1,(cast.ends-now)/(cast.ends-cast.bite))):0;
   scene.style.setProperty('--bite-left',progress);
  }
  const reels=main.querySelector('.drew-reels'),spin=RKParty.state?.tavern?.profile?.slots;
  if(!seeded&&RKParty.state?.tavern?.profile){lastSpin=spin?.id||null;seeded=true;}
  if(reels){
   reels.dataset.reelPresentation='fates';
   // Only the confirmed symbols settle, once. No invented spins or near misses.
   if(spin?.id&&spin.id!==lastSpin){lastSpin=spin.id;if(!still)for(const [i,reel]of [...reels.children].entries())reel.animate([{opacity:.3,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:i*90,easing:'ease-out'});}
  }else if(spin?.id)lastSpin=spin.id;
  const forge=main.querySelector('.drew-forge');
  if(forge)add(forge,'rk-forge-vignette','<svg viewBox="0 0 620 170"><path class="rk-forge-halo" d="M310 16 L382 44 L370 106 L310 147 L250 106 L238 44 Z"/><path class="rk-forge-shield" d="M310 35 L352 52 L345 94 L310 120 L275 94 L268 52 Z"/><path class="rk-anvil" d="M51 74 L206 74 L205 88 L170 100 L167 127 L199 139 L199 148 L99 148 L99 139 L130 126 L129 99 L87 94 Z"/><path class="rk-hammer" d="M443 40 L502 62 L496 83 L437 62 Z M470 75 L446 135"/><path class="rk-forge-sparks" d="M192 48 L203 30 M218 62 L240 55 M416 100 L404 89 M434 118 L417 124"/></svg><span>THE MIDNIGHT ARMOR EXHIBITION</span>');
  if(still)for(const el of main.querySelectorAll('.drew-reels>span'))for(const a of el.getAnimations())a.cancel();
 }
 function schedule(){if(!scheduled&&!document.hidden)scheduled=requestAnimationFrame(()=>{scheduled=0;sync();});}
 new MutationObserver(schedule).observe(document.getElementById('main'),{childList:true,subtree:true});
 function start(){clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)sync();},250);sync();}
 addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(timer);cancelAnimationFrame(scheduled);scheduled=0;sync();}else start();});
 addEventListener('offline',sync);addEventListener('online',sync);addEventListener('pagehide',()=>{clearInterval(timer);cancelAnimationFrame(scheduled);scheduled=0;});addEventListener('pageshow',start);
 start();return {sync};
})();

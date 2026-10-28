'use strict';
// Reuse the original timing controls and scoring; phone prompts share one screen anchor.
window.RKPhoneTiming=(()=>{
 const media=matchMedia('(max-width:600px), (max-width:1000px) and (pointer:coarse)');
 const homes=new WeakMap();
 const roots='.timing.rk-timed,#rk-phone-guard-shell,.rk-capture-prompt';
 const targets='.rk-timed #trialTap,.rk-phone-guard-tap,.rk-capture-prompt .capring';
 const contacts=new Map();
 // Mobile browser chrome, zoom and keyboards can shrink/offset the visible viewport.
 function anchor(){
  const v=window.visualViewport;
  for(const root of document.querySelectorAll(roots)){
   if(!media.matches)continue;
   if(root.parentElement!==document.body)document.body.append(root);
   for(const [name,value] of Object.entries({x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||innerWidth,h:v?.height||innerHeight}))root.style.setProperty('--rk-phone-'+name,value+'px');
  }
 }
 function clearContact(button){const c=contacts.get(button);if(c){clearTimeout(c.release);clearTimeout(c.end);contacts.delete(button);}button.classList.remove('rk-phone-pressed','rk-phone-contact');}
 function clearContacts(){for(const button of contacts.keys())clearContact(button);}
 // Observe the original input path: feedback never scores, cancels or repeats an action.
 document.addEventListener('pointerdown',e=>{
  if(!media.matches||e.isPrimary===false||e.button!==0)return;
  const button=e.target.closest?.(targets);if(!button||button.disabled)return;
  clearContact(button);
  const r=button.getBoundingClientRect();
  button.style.setProperty('--rk-tap-x',100*(e.clientX-r.left)/r.width+'%');
  button.style.setProperty('--rk-tap-y',100*(e.clientY-r.top)/r.height+'%');
  button.classList.toggle('rk-phone-reduced',SET.motion==='reduced'||(SET.motion!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches));
  void button.offsetWidth;
  button.classList.add('rk-phone-pressed','rk-phone-contact');
  contacts.set(button,{pointer:e.pointerId,start:performance.now(),release:0,end:0});
 },{capture:true,passive:true});
 function release(e){for(const [button,c] of contacts){if(c.pointer!==e.pointerId)continue;if(e.type==='pointercancel'){clearContact(button);continue;}c.release=setTimeout(()=>button.classList.remove('rk-phone-pressed'),Math.max(0,120-(performance.now()-c.start)));c.end=setTimeout(()=>clearContact(button),450);}}
 document.addEventListener('pointerup',release,{capture:true,passive:true});
 document.addEventListener('pointercancel',release,{capture:true,passive:true});
 addEventListener('blur',clearContacts);addEventListener('pagehide',clearContacts);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearContacts();});
 window.visualViewport?.addEventListener('resize',anchor);
 window.visualViewport?.addEventListener('scroll',anchor);
 addEventListener('resize',anchor);
 function dockGuard(o){
  if(!o?.isConnected)return;
  if(!homes.has(o))homes.set(o,o.parentElement);
  let shell=document.getElementById('rk-phone-guard-shell');
  if(media.matches){
   if(!shell){shell=document.createElement('div');shell.id='rk-phone-guard-shell';shell.setAttribute('role','dialog');shell.setAttribute('aria-label','Combat timing');document.body.append(shell);}
   if(o.parentElement!==shell)shell.append(o);
   // Touches outside the explicit button must not spend a phone guard attempt.
   document.removeEventListener('pointerdown',guardPointer,true);
  }else if(o.parentElement===shell){
   const home=homes.get(o);(home?.isConnected?home:document.body).append(o);shell.remove();
   if(guardActive)document.addEventListener('pointerdown',guardPointer,true);
  }
 }
 const originalGuard=guardWindow;
 guardWindow=function(){const result=originalGuard.apply(this,arguments),o=document.getElementById('gwin');if(o&&!o.querySelector('.rk-phone-guard-tap')){
   const tap=document.createElement('button');tap.type='button';tap.className='rk-phone-guard-tap';tap.textContent=o.classList.contains('counter')?'TAP TO COUNTER':'TAP TO BLOCK';tap.setAttribute('aria-label',tap.textContent.toLowerCase()+ ' when the marker reaches the bright band');
   o.addEventListener('pointerdown',e=>{if(media.matches&&!e.target.closest('.rk-phone-guard-tap')){e.preventDefault();e.stopImmediatePropagation();}},true);
   const hit=e=>{if(!media.matches||!guardActive)return;e.preventDefault();e.stopPropagation();guardHit(o.classList.contains('counter')?'counter':'block');};
   tap.addEventListener('pointerdown',hit);tap.addEventListener('click',e=>{if(e.detail===0)hit(e);});
   o.append(tap);dockGuard(o);
  }return result;};
 function sync(){dockGuard(document.getElementById('gwin'));const shell=document.getElementById('rk-phone-guard-shell');if(shell&&!shell.querySelector('#gwin'))shell.remove();anchor();for(const button of contacts.keys())if(!media.matches||!button.isConnected)clearContact(button);}
 media.addEventListener('change',()=>window.RKBattleActionDock?.mount());
 media.addEventListener('change',sync);
 new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
 sync();
 return {sync,get phone(){return media.matches;}};
})();

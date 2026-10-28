/* Keep original commands and timing mechanics; move their presentation below the field. */
'use strict';
window.RKBattleActionDock=(()=>{
 const locks=new Map();let redrawChargeStop=null;
 // Inspected source portraits face left. Frontal/unknown art keeps its existing rule.
 const left=new Set(['ticktail','tumbleknot','sootling','hushmoth','hollowknave','coilcat','bellwether','marrowlark','scrapbit','driftling','bristlemaw']);
 function facing(){
  for(const img of document.querySelectorAll('.battle .unit .portrait>img,.facing-battle [data-fighter-art] img')){
   const name=(img.getAttribute('src')||'').split('/').pop().split('.')[0];if(!left.has(name))continue;
   const unit=img.closest('.unit,.exp-unit'),enemy=unit?.classList.contains('enemy')||unit?.dataset.side==='enemy';
   if(unit?.matches('.exp-unit')){const frame=img.closest('.fighter-facing');if(frame)frame.style.transform=enemy?'none':'scaleX(-1)';}
   else img.style.transform=enemy?'none':'scaleX(-1)';
   img.dataset.rkFacing=enemy?'left':'right';
  }
 }
 function unlock(){for(const [n,prior] of locks){n.inert=prior;}locks.clear();}
 function reveal(root){const main=document.getElementById('main');if(!root.isConnected||!main)return;const r=root.getBoundingClientRect(),m=main.getBoundingClientRect(),bottom=Math.min(m.bottom,innerHeight-(innerWidth<=800?64:0))-8;if(r.bottom>bottom)main.scrollTop+=r.bottom-bottom;else if(r.top<m.top+8)main.scrollTop-=m.top+8-r.top;}
 function mount(){
  facing();const root=document.getElementById('timing'),stage=document.querySelector('.battle>.camwrap');
  if(!root||!stage){if(!root){unlock();redrawChargeStop?.();redrawChargeStop=null;}return;}
  if(window.RKPhoneTiming?.phone){
   root.classList.remove('rk-action-dock');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
   if(root.parentElement!==document.body)document.body.append(root);
   for(const n of document.querySelectorAll('.battle>.actions,.battle>.camwrap'))if(!locks.has(n)){locks.set(n,n.inert);n.inert=true;}
   return;
  }
  const focus=root.contains(document.activeElement);root.classList.add('rk-action-dock');root.setAttribute('role','group');root.removeAttribute('aria-modal');
  if(root.nextElementSibling!==stage)stage.before(root);
  const actor=B?.units?.find(u=>u.id===B.active),box=root.querySelector('.tbox'),art=actor&&pEl(actor.id);
  if(box&&art){box.style.marginLeft=actor.side==='E'?'auto':'0px';box.style.marginRight=actor.side==='E'?'0px':'auto';root.style.setProperty('--qte-anchor',actor.side==='E'?'80%':'20%');root.setAttribute('aria-label',`${actor.name}: ${root.querySelector('.tbox>b')?.textContent||'Timed action'}`);
   const title=box.querySelector(':scope>b');if(title&&!root.dataset.ownerLabel){const label=document.createElement('span');label.className='rk-action-owner';label.textContent=actor.name+(box.classList.contains('critbox')?' → '+(B.units.find(u=>u.id===B.target)?.name||'target'):'');title.prepend(label);root.dataset.ownerLabel='true';}
  }
  for(const n of document.querySelectorAll('.battle>.actions,.battle>.camwrap'))if(!locks.has(n)){locks.set(n,n.inert);n.inert=true;}
  if(focus)root.querySelector('#trialTap')?.focus({preventScroll:true});
  if(!root.dataset.dockRevealed){root.dataset.dockRevealed='true';requestAnimationFrame(()=>{reveal(root);requestAnimationFrame(()=>reveal(root));});}
 }
 if(window.RKChargeEffects){const old=RKChargeEffects.windup;RKChargeEffects.windup=function(root,u){
  // Retain compatibility DOM, but don't allocate a second invisible portrait effect.
  const art=root.querySelector('.rk-qte-actor');art?.classList.remove('rk-qte-actor');
  try{return old.apply(this,arguments);}finally{art?.classList.add('rk-qte-actor');}
 };}
 const oldTiming=timing;timing=function(){const r=oldTiming.apply(this,arguments);mount();return r;};
 const oldMenu=cmdMenu;cmdMenu=function(m){const before=B,previous=B?.menu,r=oldMenu.apply(this,arguments);if(B===before&&padOn&&!timingActive&&!guardActive&&!MG_ON&&!B?.busy){const selector=m?'.actions .act.tile:not(:disabled)':previous==='energy'?'.actions .mengy':previous==='items'?'.actions .mitem':'.actions .mabil';(document.querySelector(selector)||document.querySelector('.actions .act:not(:disabled)'))?.focus({preventScroll:true});}return r;};
 const oldRender=renderBattle;renderBattle=function(){
  const dock=document.querySelector('.rk-action-dock'),battle=B,focus=dock?.contains(document.activeElement);dock?.remove();unlock();redrawChargeStop?.();redrawChargeStop=null;
  const r=oldRender.apply(this,arguments);if(dock&&B===battle&&document.querySelector('.battle>.camwrap')){document.querySelector('.battle>.camwrap').before(dock);mount();if(timingActive&&dock.classList.contains('rk-qte-charge'))redrawChargeStop=window.RKChargeEffects?.windup(dock,B.units.find(u=>u.id===B.active));if(focus)dock.querySelector('#trialTap')?.focus({preventScroll:true});}else if(dock)document.body.append(dock);return r;
 };
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
 return {mount,facing,unlock,leftFacing:[...left]};
})();

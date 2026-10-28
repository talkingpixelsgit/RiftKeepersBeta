/* Keep enlarged formations reachable without changing combat mappings. */
'use strict';
window.RKBattleViewport=(()=>{
 let lastBattle=null,lastTarget=null,layoutWatch=null;
 function stopFollowing(){layoutWatch?.disconnect();layoutWatch=null;}
 function revealTarget(){
  const wrap=document.querySelector('.battle>.camwrap'),target=wrap?.querySelector('.unit.enemy.target');
  if(!wrap||!target)return;
  const viewport=wrap.getBoundingClientRect(),unit=target.getBoundingClientRect(),padding=12;
  let left=wrap.scrollLeft;
  if(unit.right>viewport.right-padding)left+=unit.right-viewport.right+padding;
  if(unit.left<viewport.left+padding)left-=viewport.left+padding-unit.left;
  wrap.scrollLeft=Math.max(0,Math.min(wrap.scrollWidth-wrap.clientWidth,left));
  // Large 3x3 rosters can also extend below the screen. Reveal the selected row
  // for controller targeting without disturbing manual scrolling on redraws.
  const main=document.getElementById('main');
  if(typeof padOn!=='undefined'&&padOn&&main?.getBoundingClientRect&&!padScope()){
   const frame=main.getBoundingClientRect(),selected=target.getBoundingClientRect();
   if(selected.bottom>frame.bottom-padding)main.scrollTop+=selected.bottom-frame.bottom+padding;
   else if(selected.top<frame.top+padding)main.scrollTop-=frame.top+padding-selected.top;
  }
 }
 function pan(axis){
  if(!B||padScope()||timingActive||guardActive||MG_ON||Math.abs(axis)<=.35)return;
  stopFollowing();
  const wrap=document.querySelector('.battle>.camwrap');
  if(wrap)wrap.scrollLeft+=(axis-Math.sign(axis)*.35)*22;
 }
 const base=renderBattle;
 renderBattle=function(...args){
  stopFollowing();
  const old=document.querySelector('.battle>.camwrap'),main=document.getElementById('main');
  const same=B&&B===lastBattle,left=same?(old?.scrollLeft||0):0,top=same?(main?.scrollTop||0):0;
  const changed=!same||B?.target!==lastTarget;
  const value=base.apply(this,args);
  const wrap=document.querySelector('.battle>.camwrap');if(wrap)wrap.scrollLeft=left;
  if(same&&main)main.scrollTop=top;
  if(changed){
   revealTarget();
   // Font/icon loading can enlarge rows after the synchronous target reveal.
   // Follow only this selection's layout, never a later redraw or manual pan.
   if(typeof ResizeObserver!=='undefined'&&typeof padOn!=='undefined'&&padOn){
    const selectedBattle=B,selectedTarget=B?.target,stage=wrap?.querySelector('.stage');
    if(stage){const watch=new ResizeObserver(()=>{
     if(layoutWatch!==watch||B!==selectedBattle||B?.target!==selectedTarget||!padOn||document.hidden||padScope()||timingActive||guardActive||MG_ON||B.menu)return;
     revealTarget();
    });layoutWatch=watch;watch.observe(stage);}
   }
  }
  lastBattle=B;lastTarget=B?.target;
  return value;
 };
 for(const event of ['wheel','pointerdown','keydown','visibilitychange','pagehide'])window.addEventListener?.(event,stopFollowing,{capture:true,passive:true});
 return {pan,revealTarget};
})();

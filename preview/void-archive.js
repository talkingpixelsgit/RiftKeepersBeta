/* Presentation only: supplied Dark Ages details on the player's existing Codex. */
'use strict';
window.RKVoidArchive=(()=>{
 const main=document.getElementById('main');if(!main)return {sync(){}};
 let pending=0;
 const priorPress=padPress,priorBack=padBack,priorRender=render;
 const inArchive=()=>view==='dex'&&!B&&!MG_ON&&!timingActive&&!guardActive&&!padScope();
 function focusKey(node){
  if(!node||!main.contains(node))return null;
  if(node.matches('[role=tab]'))return ['tab',[...main.querySelectorAll('.codextabs [role=tab]')].indexOf(node)];
  if(node.matches('.cxitem,.dexcell'))return ['entry',node.getAttribute('onclick')];
  if(node.hasAttribute('data-rk-archive-back'))return ['back'];
  return null;
 }
 function restoreFocus(key){
  if(!key||!inArchive())return;
  const next=key[0]==='tab'?main.querySelectorAll('.codextabs [role=tab]')[key[1]]:key[0]==='back'?main.querySelector('[data-rk-archive-back]'):[...main.querySelectorAll('.cxitem,.dexcell')].find(n=>n.getAttribute('onclick')===key[1]);
  next?.focus({preventScroll:true});
 }
 function scroll(nodes,label){
  if(!nodes.length||nodes[0].closest('.rk-archive-scroll'))return;
  const section=document.createElement('section');section.className='rk-archive-scroll';
  section.setAttribute('aria-label',label);nodes[0].before(section);
  for(const node of nodes)section.append(node);
 }
 function sync(){
  const active=!!main.querySelector('.codextabs');main.classList.toggle('rk-archive',active);
  if(!active)return;
  const heading=main.querySelector('.view-h');
  if(heading&&!heading.querySelector('[data-rk-archive-back]')){
   const back=document.createElement('button');back.className='rk-archive-return';back.dataset.rkArchiveBack='';back.textContent='← Back';heading.append(back);
  }
  heading?.querySelector('[data-rk-archive-back]')?.setAttribute('aria-label',dexSel?'Back to companion collection':'Back to menu');
  for(const page of main.querySelectorAll('.cxpage')){
   // Only writing already emitted by the discovery-aware Codex renderer is used.
   scroll([...page.querySelectorAll(':scope>.readtext')],'Recovered writing');
   const notes=page.querySelector(':scope>.cxnotes');
   if(notes){const heading=notes.previousElementSibling;scroll(heading?.matches('.cxnotes-h')?[heading,notes]:[notes],'Notes from the trail');}
  }
 }
 render=function(){
  const key=inArchive()?focusKey(document.activeElement):null,tab=codexTab,listTop=main.querySelector('.cxlist')?.scrollTop;
  const result=priorRender.apply(this,arguments);sync();
  if(view==='dex'&&tab===codexTab&&typeof listTop==='number'){const list=main.querySelector('.cxlist');if(list)list.scrollTop=listTop;}
  restoreFocus(key);return result;
 };
 padPress=function(i){
  if(inArchive()&&(i===4||i===5)){
   awayActive();setPad(true);const at=CODEX_TABS.findIndex(([id])=>id===codexTab);
   codexTab=CODEX_TABS[(Math.max(0,at)+(i===4?-1:1)+CODEX_TABS.length)%CODEX_TABS.length][0];codexSel=null;dexSel=null;render();
   const tab=main.querySelector('.codextabs [aria-selected=true]');tab?.focus({preventScroll:true});tab?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return;
  }
  return priorPress.apply(this,arguments);
 };
 padBack=function(){
  if(inArchive()){
   if(dexSel){const id=dexSel;dexSel=null;render();[...main.querySelectorAll('.dexcell')].find(n=>n.getAttribute('onclick')?.includes("'"+id+"'"))?.focus({preventScroll:true});}
   else{go('menu');focusFirst();}return;
  }
  return priorBack.apply(this,arguments);
 };
 document.addEventListener('click',e=>{if(e.target.closest('[data-rk-archive-back]')&&inArchive())padBack();});
 document.addEventListener('keydown',e=>{if(!inArchive()||e.defaultPrevented||e.target.matches('input,textarea,select'))return;if(e.key==='Escape'){e.preventDefault();padBack();}});
 function schedule(){if(!pending&&!document.hidden)pending=requestAnimationFrame(()=>{pending=0;sync();});}
 new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
 addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(pending);pending=0;}else schedule();});
 addEventListener('pagehide',()=>{cancelAnimationFrame(pending);pending=0;});
 addEventListener('pageshow',schedule);
 sync();return {sync};
})();

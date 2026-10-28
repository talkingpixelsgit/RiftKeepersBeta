'use strict';
// Only presentation: retain DOM targets, portrait IDs, QTE docks and combat handlers.
window.RKPortraitBattle=(()=>{
 document.body.classList.add('rk-portrait-battles');let frame=0;
 function sync(){frame=0;window.RKGroundedEnemies?.sync?.();
  for(const root of document.querySelectorAll('.battle,.combat-shell')){
   const stage=root.querySelector('.stage,.expedition-stage');if(!stage)continue;
   const scene=root.querySelector('.scene.battle');
   if(scene&&!root.style.getPropertyValue('--rk-scene-bg'))root.style.setProperty('--rk-scene-bg',getComputedStyle(scene).backgroundImage);
   for(const row of stage.querySelectorAll(':scope>.side-row,:scope>.exp-allies,:scope>.exp-enemies')){
    row.classList.toggle('rk-portrait-enemies',row.matches('.exp-enemies')||!!row.querySelector(':scope>.unit.enemy'));row.classList.toggle('rk-portrait-allies',!row.classList.contains('rk-portrait-enemies'));
    const count=[...row.children].filter(n=>n.matches('.unit,.exp-unit,.exp-target')).length;
    if(row.classList.contains('rk-portrait-enemies'))root.style.setProperty('--rk-enemy-height',((innerWidth<=700?168*Math.ceil(count/3):248))+'px');
    row.style.setProperty('--portrait-count',Math.max(1,Math.min(6,count)));row.style.setProperty('--portrait-mobile-count',Math.max(1,Math.min(3,count)));
   }
   for(const node of stage.querySelectorAll('.unit[data-u]')){const u=B?.units?.find(u=>u.id===node.dataset.u),portrait=node.querySelector('.portrait');if(!u||!portrait||portrait.dataset.rkPortrait)continue;if(u.kind==='hero'&&ART_PORT[u.sp]){const im=document.createElement('img');im.src=['voth','voth2'].includes(u.sp)?'preview/assets/voth-child/'+u.sp+'-portrait.png':ART_PORT[u.sp];im.alt='';portrait.replaceChildren(im);}if(u.kind==='keeper')portrait.classList.add('rk-portrait-keeper');portrait.dataset.rkPortrait='true';}
   let moment=stage.querySelector(':scope>.vs,:scope>.rk-portrait-moment');
   if(!moment){moment=document.createElement('div');moment.className='rk-portrait-moment';moment.setAttribute('aria-hidden','true');stage.append(moment);}
   const y=moment.getBoundingClientRect().top-root.getBoundingClientRect().top;
   root.style.setProperty('--portrait-moment-top',Math.round(y)+'px');
   for(const node of stage.querySelectorAll('.unit[data-u],.exp-unit[data-fighter]')){
    const u=B?.units?.find(u=>u.id===node.dataset.u)||window.RKParty?.state?.match?.units?.find(u=>u.id===node.dataset.fighter);
    if(u){node.dataset.stance=window.RKGroundedEnemies?.profiles?.[u.sp]?.stance||'ground';}
   }
   root.classList.toggle('rk-choosing',!!B&&!B.busy&&B.units.find(u=>u.id===B.active)?.side==='P');
   root.classList.toggle('rk-submenu',!!B?.menu);
   root.querySelector('.actions')?.setAttribute('aria-label',B?.menu?B.menu+' commands':'Battle commands');
   sharedDeck(root);window.RKBattleCinema?.idle?.();
  }
 }
 function queue(){if(!frame)frame=requestAnimationFrame(sync);}
 let sharedMenu=null,sharedActor='';
 function sharedDeck(root){
  if(!root.matches('.combat-shell'))return;
  const match=window.RKParty?.state?.match,commands=root.querySelector('.exp-commands');if(!commands||!match)return;
  const key=match.id+':'+match.active+':'+match.phase;if(key!==sharedActor){sharedActor=key;sharedMenu=null;}
  if(!commands.querySelector('.rk-shared-main')){
   const rules=root.querySelector(':scope>.combat-pouch');if(rules)commands.after(rules);
   const moves=[...commands.querySelectorAll('[data-party-key^="move-"]')],actions=match.actions||[];
   const main=document.createElement('div'),list=document.createElement('div');main.className='rk-shared-main';list.className='rk-shared-list';
   const category=(label,menu)=>{const b=document.createElement('button');b.type='button';b.className='rk-category';b.textContent=label;b.dataset.battleMenu=menu;return b;};
   const attack=moves.find(n=>n.dataset.partyKey==='move-attack');if(attack)main.append(attack);
   main.append(category('△ / Y · Abilities','abilities'),category('□ / X · Items','items'));
   list.append(category('○ / B · Back','back'));
   for(const n of moves){const id=n.dataset.partyKey.slice(5);if(id==='attack')continue;if(['guard','capture'].includes(id))main.append(n);else {n.dataset.battleCategory=actions.find(a=>a.id===id)?.item?'items':'abilities';list.append(n);}}
   const withdraw=root.querySelector(':scope>[data-party-key="leave"]');if(withdraw)main.append(withdraw);
   const status=commands.querySelector('p');commands.replaceChildren(...(status?[status]:[]),main,list);
  }
  commands.dataset.battlePage=sharedMenu||'main';
  const main=commands.querySelector('.rk-shared-main'),list=commands.querySelector('.rk-shared-list');main.hidden=!!sharedMenu;list.hidden=!sharedMenu;
  for(const n of list.querySelectorAll('[data-battle-category]'))n.hidden=n.dataset.battleCategory!==sharedMenu;
  let empty=list.querySelector('.rk-empty');if(!empty){empty=document.createElement('p');empty.className='rk-empty';empty.textContent='No commands in this category.';list.append(empty);}empty.hidden=[...list.querySelectorAll('[data-battle-category]')].some(n=>!n.hidden);
 }
 function sharedOpen(menu){sharedMenu=menu==='back'?null:menu;const root=document.querySelector('.combat-shell');if(!root)return;sharedDeck(root);const group=root.querySelector(sharedMenu?'.rk-shared-list':'.rk-shared-main');group?.querySelector('button:not(:disabled):not([hidden])')?.focus({preventScroll:true});}
 document.addEventListener('click',e=>{const n=e.target.closest('[data-battle-menu]');if(n)sharedOpen(n.dataset.battleMenu);});
 function sharedInput(){return !B&&!padScope()&&!timingActive&&!guardActive&&!MG_ON&&window.RKParty?.state?.match?.phase==='battle'&&!!document.querySelector('.exp-commands');}
 const oldPress=padPress,oldDir=padDir,oldBack=padBack;
 padBack=function(){if(sharedInput()){sharedOpen('back');return;}if(ownInput()){if(B.menu)cmdMenu(null);return;}return oldBack();};
 function ownInput(){return B&&!B.busy&&!padScope()&&!timingActive&&!guardActive&&!MG_ON&&B.units.find(u=>u.id===B.active)?.side==='P';}
 padPress=function(i){
  if(sharedInput()){
   awayActive();setPad(true);
   if(i===1){sharedOpen('back');return;}
   if(i===3){sharedOpen('abilities');return;}
   if(i===2){sharedOpen('items');return;}
   if(i===0){const f=document.activeElement;if(f?.matches('.exp-commands button:not(:disabled):not([hidden])'))f.click();else document.querySelector('[data-party-key="move-attack"]:not(:disabled)')?.click();return;}
   if(i===4||i===5){RKParty.cycleTarget(i===4?-1:1);return;}
  }
  if(!ownInput()){if(B&&!padScope()&&!timingActive&&!guardActive&&!MG_ON)return;return oldPress(i);}awayActive();setPad(true);
  if(B.menu){
   if(i===1){cmdMenu(null);return;}
   if(i===0){const f=document.activeElement;if(f?.matches('.actions button:not(:disabled)'))f.click();else document.querySelector('.actions button:not(.back):not(:disabled)')?.focus();return;}
   if(i===2||i===3||i===4||i===5)return;
  }else{
   if(i===0){const f=document.activeElement;(f?.matches('.actions button:not(:disabled)')?f:document.querySelector('.actions .atkbtn:not(:disabled)'))?.click();return;}
   if(i===3){document.querySelector('.actions .mabil:not(:disabled)')?.click();return;}
   if(i===2){document.querySelector('.actions .mitem:not(:disabled)')?.click();return;}
   if(i===1){return;}
   if(i===4){guardAct();return;}
   if(i===5){const es=alive('E'),n=es.findIndex(u=>u.id===B.target);if(es.length)setTarget(es[(n+1)%es.length].id);return;}
  }
  return oldPress(i);
 };
 padDir=function(dx,dy){
  if(sharedInput()){setPad(true);const group=document.querySelector(sharedMenu?'.rk-shared-list':'.rk-shared-main'),buttons=[...(group?.querySelectorAll('button:not(:disabled):not([hidden])')||[])];if(buttons.length){const n=buttons.indexOf(document.activeElement);buttons[(n+(dx||dy)+buttons.length)%buttons.length]?.focus({preventScroll:true});}return;}
  if(!ownInput())return oldDir(dx,dy);
  setPad(true);
  if(B.menu){const buttons=[...document.querySelectorAll('.actions button:not(:disabled)')];if(!buttons.length)return;const n=buttons.indexOf(document.activeElement),delta=dx||dy;buttons[(n+delta+buttons.length)%buttons.length]?.focus({preventScroll:true});return;}
  if(dx){const es=alive('E'),n=es.findIndex(u=>u.id===B.target);if(es.length)setTarget(es[(n+dx+es.length)%es.length].id);return;}
  if(dy){const buttons=[...document.querySelectorAll('.actions button:not(:disabled)')],n=buttons.indexOf(document.activeElement);buttons[(n+dy+buttons.length)%buttons.length]?.focus({preventScroll:true});}
 };
 new MutationObserver(queue).observe(document.getElementById('main'),{childList:true,subtree:true});
 new ResizeObserver(queue).observe(document.getElementById('main'));
 addEventListener('resize',queue);queue();return {sync};
})();

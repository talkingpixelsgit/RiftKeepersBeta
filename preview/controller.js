/* Extend the standard Gamepad mapping without replacing legacy combat/minigames. */
'use strict';
(()=>{
 const priorDir=padDir,priorPress=padPress,priorBack=padBack;
 const priorFocus=focusFirst;focusFirst=function(...args){if(!B&&view==='fellowship'&&!padScope()&&RKParty.match&&RKParty.match.phase!=='battle'){const result=document.querySelector('.exp-result [data-party-key="leave"]:not(:disabled)');if(result){result.focus({preventScroll:true});result.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return;}}return priorFocus(...args);};
 function selectStep(el,delta){const choices=[...el.options].filter(o=>!o.disabled);const i=choices.indexOf(el.selectedOptions[0]);const next=choices[(i+delta+choices.length)%choices.length];if(next){el.value=next.value;el.dispatchEvent(new Event('change',{bubbles:true}));}}
 padDir=function(dx,dy){if(dx||dy)awayActive();const el=document.activeElement;if(el?.tagName==='SELECT'&&(dx||dy)){setPad(true);selectStep(el,dx||dy);return;}priorDir(dx,dy);};
 padPress=function(i){awayActive();
  if(!B&&!padScope()&&['bag','armoury'].includes(view)&&window.RKInventory){if(i===2){setPad(true);window.RKInventory.favouriteFocused();return;}if(i===3){setPad(true);window.RKInventory.focusDetails();return;}}

  if(!B&&!padScope()&&view==='fellowship'&&RKParty.active){
   if(i===4||i===5){setPad(true);RKParty.cycleTarget(i===4?-1:1);return;}
   if(i===3){setPad(true);const pouch=document.querySelector('.combat-pouch:has([data-party-key="pouch-toggle"])');if(pouch){pouch.open=!pouch.open;const control=pouch.open?pouch.querySelector('button:not(:disabled)')||pouch.querySelector('summary'):pouch.querySelector('summary');control?.focus();}return;}
  }
  if(!B&&!padScope()&&i===0&&document.activeElement?.tagName==='SELECT'){setPad(true);selectStep(document.activeElement,1);return;}priorPress(i);
 };
 padBack=function(){const scope=padScope();if(scope){const cancel=scope.querySelector('[data-no],[data-cancel],#close,#portalClose,#pClose,#rdClose,[data-aw="close"],[data-aw="ok"]');if(cancel){cancel.click();return;}priorBack();return;}if(view==='fellowship'&&RKParty.active){const pouch=document.querySelector('.combat-pouch:has([data-party-key="pouch-toggle"])[open]');if(pouch){pouch.open=false;pouch.querySelector('summary')?.focus({preventScroll:true});return;}}if(['bag','armoury'].includes(view)&&window.RKInventory){window.RKInventory.back();return;}if(!scope&&document.activeElement?.tagName==='SELECT'){const all=focusables(document.getElementById('main')),i=all.indexOf(document.activeElement);(all[i+1]||all[0])?.focus();return;}if(view==='battlekits'){go('fellowship');focusFirst();return;}if(view==='patron'){go('tavern');focusFirst();return;}if(view==='tavern'){go('hunt');focusFirst();return;}if(view==='tournaments'){go('guilds');focusFirst();return;}if(['news','journey','workshop','trading'].includes(view)){go('hunt');focusFirst();return;}if(view==='guilds'){go('fellowship');focusFirst();return;}if(['fellowship','atmosphere','activities','settings','menu'].includes(view)){go(view==='menu'?'hunt':'menu');focusFirst();return;}priorBack();};
 focusables=function(root){return [...(root||document).querySelectorAll('a[href],button:not(:disabled),input:not([type=hidden]):not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(shown);};
 // Mouse-free onboarding: use the supplied/default name or pick another without a keyboard.
 const priorBind=bindOnboard;bindOnboard=function(){priorBind();const input=document.getElementById('hIn');if(input&&!input.value)input.value='Wayfarer';if(input&&!document.getElementById('keeperNamePick')){const b=document.createElement('button');b.className='btn';b.id='keeperNamePick';b.textContent='Choose another name';let n=0;b.onclick=()=>{input.value=['Ash','Rowan','Wren','Ember','Wayfarer'][n++%5];};input.after(b);}};
 const oldKeeper=keeperHTML;keeperHTML=function(){return oldKeeper()+`<section class="eye-presets"><p class="pad-hint">Eye presets · controller friendly</p>${['eyeLeft','eyeRight'].map(side=>`<div><b>${side==='eyeLeft'?'Left':'Right'} eye</b><div class="eye-presets">${[['#b7f5ea','Sea glass'],['#e6b675','Amber'],['#baa2db','Lilac'],['#e9e9df','Pearl']].map(([c,n])=>`<button class="btn" data-eye-side="${side}" data-eye-colour="${c}">${n}</button>`).join('')}</div></div>`).join('')}</section>`;};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-eye-side]');if(b){S.look=S.look||{};S.look[b.dataset.eyeSide]=b.dataset.eyeColour;saveSoon();render();}});
 // Keep focus alive when the legacy renderer replaces a panel or a dialog closes.
 let scheduled=false;const observer=new MutationObserver(()=>{if(!padOn||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(typeof RKParty!=='undefined'&&RKParty.busy)return;const active=document.activeElement,scope=padScope();if(!active||active===document.body||active.disabled||(scope&&!scope.contains(active)))focusFirst();});});observer.observe(document.body,{childList:true,subtree:true});
 addEventListener('gamepadconnected',()=>{padPrev=[];padRep={};padLast={};});
 addEventListener('gamepaddisconnected',()=>{padPrev=[];padRep={};padLast={};});
 // Allow keyboard-only use of the same new screens, while leaving text entry and legacy shortcuts alone.
 document.addEventListener('keydown',e=>{if(!['news','fellowship','guilds','battlekits','journey','workshop','trading','tournaments','tavern','patron','atmosphere','activities','bag','armoury'].includes(view)||e.target.matches('input,textarea,select')||padScope())return;if(e.key==='Escape'){e.preventDefault();padBack();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveFocus(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0);}});
 const priorWild=startWild;startWild=function(...args){if(RKParty.active){toast('Finish or leave your shared expedition before starting a solo battle.');go('fellowship');return;}return priorWild(...args);};
})();
render();

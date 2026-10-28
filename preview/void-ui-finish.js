/* Finish the non-combat shell with the Codex's supplied-art ink treatment. */
'use strict';
window.RKVoidUIFinish=(()=>{
 const main=document.getElementById('main');let queued=0;
 const screens=new Set(['menu','bag','armoury','keeper','team','profile','hunt','journey','fellowship','guilds','battlekits','news','settings','activities','gate','space','social','market','crafts','tournaments','arena']);
 function sync(){
  document.body.classList.add('rk-void-finished');if(!main)return;
  for(const icon of document.querySelectorAll('.nav [data-v=tavern] .ico'))if(icon.textContent.trim()==='fortress'){icon.innerHTML=uiIcon('fortress');icon.setAttribute('aria-hidden','true');}
  const active=screens.has(view)&&!B&&!main.querySelector('.combat-shell,.battle');
  main.classList.toggle('rk-void-shell',active);main.dataset.voidPage=active?view:'';
  if(!active)return;
  if(view==='arena')for(const keeper of main.querySelectorAll('[title="Keeper"]'))keeper.parentElement?.classList.add('rk-arena-roster');
  const featured=main.querySelector('[data-hub=tavern]');
  if(featured){
   const icon=featured.querySelector('.hubico'),label=featured.querySelector('.hubn'),flag=icon?.querySelector('.hubbadge');icon?.setAttribute('aria-hidden','true');
   if(flag&&label){flag.classList.add('rk-void-feature-flag');label.append(flag);}
   if(icon?.textContent.trim()==='fortress'){icon.innerHTML=uiIcon('fortress');}
  }
  for(const host of main.querySelectorAll(':scope>.view-h,.inventory-screen>header,.wayfarer-screen>header,.fellowship-head,.journey-head,.activity-book'))host.classList.add('rk-void-heading');
  for(const host of main.querySelectorAll('.hubframe,.rk-void-heading,.journey-page,.inventory-detail,.party-create,.party-kit,.location-art')){
   if(host.querySelector(':scope>.rk-void-edge'))continue;
   const edge=document.createElement('span');edge.className='rk-void-edge';edge.setAttribute('aria-hidden','true');host.append(edge);
  }
 }
 function schedule(){if(!queued&&!document.hidden)queued=requestAnimationFrame(()=>{queued=0;sync();});}
 if(main)new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
 addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(queued);queued=0;}else schedule();});
 addEventListener('pagehide',()=>{cancelAnimationFrame(queued);queued=0;});addEventListener('pageshow',schedule);
 sync();return {sync};
})();

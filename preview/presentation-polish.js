/* Quiet journey chrome; reuse the existing actions, artwork and controller routing. */
'use strict';
window.RKPresentation=(()=>{
 const original={render,tutStory},expanded=new Set();
 document.body.classList.add('rk-unified-ui');
 const storyIcons={'✦':'star','🪵':'map','🐚':'water','✋':'capture','💧':'water','🗼':'fortress','📖':'book','🕯️':'spirit','🚪':'exit','🎒':'bag'};
 tutStory=function(pages,...args){return original.tutStory(pages.map(p=>storyIcons[p.art]?{...p,art:uiIcon(storyIcons[p.art])}:p),...args);};
 function sync(){
  const main=document.getElementById('main');if(!main)return;
  // Optional activities remain in the existing Keeper menu and location panel.
  // Never collapse the destination panel: its Travel button must stay exposed.
  const journey=main.querySelector('.journey'),panel=journey?.querySelector('#mapPanel');
  if(panel&&(mapSel||S.loc)===S.loc&&!B&&!RUN&&!EXPLORING&&!travelling&&!panel.closest('.rk-location-extra')){
   const area=document.createElement('section');area.className='rk-location-extra';
   const button=document.createElement('button');button.className='btn rk-detail-toggle';button.type='button';button.textContent='Location details & activities';button.setAttribute('aria-controls','rk-location-extra-body');
   const content=document.createElement('div');content.id='rk-location-extra-body';content.hidden=!expanded.has(S.loc);button.setAttribute('aria-expanded',String(!content.hidden));
   panel.before(area);area.append(button,content);content.append(panel);
   const aside=journey.querySelector('.bag-aside');if(aside)content.append(aside);
   const location=S.loc;button.onclick=()=>{content.hidden=!content.hidden;button.setAttribute('aria-expanded',String(!content.hidden));if(content.hidden)expanded.delete(location);else expanded.add(location);};
  }
  // The standing guide owns the next action; no competing promotional banners.
  main.querySelectorAll('.journey-invite').forEach(n=>n.remove());
  if(view==='rk-notices'&&main.querySelector('[data-opening="resume"]'))for(const n of main.querySelectorAll('.rk-menu-group'))if(n.querySelector('h2')?.textContent==='Your first watch')n.remove();
  const help=main.querySelector('.rk-opening-help summary');if(help)help.setAttribute('tabindex','0');
  // Opening the book is the first inventory lesson; shops/quests stay available later.
  if(S?.tut&&view==='bag'&&S.tut.step===2){
   for(const b of main.querySelectorAll('button'))if(/^(Open player shop|Read the god quest)$/.test(b.textContent.trim()))b.hidden=true;
  }
 }
 render=function(...args){const r=original.render(...args);sync();return r;};
 // Native summary.click is supported by Cross/A via the existing focusable selector.
 sync();return {sync};
})();

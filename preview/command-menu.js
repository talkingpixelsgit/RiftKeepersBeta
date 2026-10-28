/* Keeper menu: presentation and input routing only; legacy encounters keep priority. */
'use strict';
window.RKCommandMenu=(()=>{
 const prior={render,renderNav,go,padPress,padBack,moveFocus,focusFirst,hubHTML,settingsHTML};
 const app=document.getElementById('app');
 let menu=null,bar=null,group='',page=0,lastKey='',returnNode=null,returnKey='',returnIndex=0,returnScroll=0,stamp='',inertBefore=false;
 const memory=new Map(),PAGE=6;
 const ready=()=>!!S?.arch&&!S.tut;
 const encounter=()=>!!(B||timingActive||guardActive||MG_ON||RUN||EXPLORING||travelling||window.RKParty?.active||window.RKParty?.busy||window.RKControllerText?.active);
 const allowed=()=>ready()&&!encounter()&&(!padScope()||padScope()===menu);
 const controls='L1 / LB: menu · D-pad / left stick: buttons · Right stick: cursor · Cross / A: select · Circle / B: back · R1 / RB: close';
 const notice='The scrolling sidebar has been replaced by the Keeper menu. Press L1 / LB, or select Menu at the top of the screen. Choose a group, then a destination. D-pad or left stick moves; Cross / A selects; Circle / B steps back and closes from the group list. L1 / LB or R1 / RB closes the menu. Outside the menu, R1 / RB moves to the next named screen panel. The right stick moves the rift cursor; Cross / A selects under it. D-pad / left stick returns to button selection. Press the right stick (R3) to toggle the cursor. Use Previous / Next for additional destinations. Combat, targeting and timed-action controls are unchanged. Keyboard: Escape opens the menu, arrows move, Enter selects, Escape steps back. Mouse and touch: use Menu and the labelled buttons.';
 function groups(){
  const items=[...new Map(hubItems().filter(x=>x[0]!=='coop').map(x=>[x[0],x])).values()];
  items.push(['rk-nearby','','Nearby tavern / portal',''],['rk-notices','','Notices & guide','']);
  const defs=[['adventure','Journey & travel',['hunt','activities','gate','space','journey','away','rk-nearby']],['keeper','Keeper & companions',['keeper','team','bag','armoury','dex','profile','battlekits']],['fellowship','Fellowship & towns',['fellowship','guilds','social','tavern','patron','workshop','crafts','market','trading','arena','tournaments','questshop']],['information','Settings, saves & notices',['account','settings','atmosphere','news','rk-notices','feedback']],['administration','Administration',['admin','staff']]];
  const used=new Set(defs.flatMap(x=>x[2])),rest=items.filter(x=>!used.has(x[0]));
  if(rest.length)defs.push(['more','More activities',rest.map(x=>x[0])]);
  return defs.map(([id,label,ids])=>({id,label,items:ids.map(id=>items.find(x=>x[0]===id)).filter(Boolean)})).filter(g=>g.items.length);
 }
 function key(el){return el?.dataset?.cmKey||el?.id||['hub','v','rk','invKey','partyKey','node'].map(k=>el?.dataset?.[k]?k+':'+el.dataset[k]:'').find(Boolean)||el?.getAttribute?.('onclick')||'';}
 function buttons(){return menu?[...menu.querySelectorAll('button:not(:disabled)')]:[];}
 function focusMenu(k=lastKey){const list=buttons(),el=list.find(n=>key(n)===k)||menu?.querySelector('[data-cm-grid] button')||list[0];el?.focus({preventScroll:true});}
 function paint(force=false){
  if(!menu)return;const gs=groups(),g=gs.find(g=>g.id===group);if(group&&!g){group='';page=0;}
  const rows=g?g.items:gs.map(g=>[g.id,'',g.label,g.items.length+' destinations']);
  const pages=Math.max(1,Math.ceil(rows.length/PAGE));page=Math.min(page,pages-1);
  const next=JSON.stringify([group,page,rows]);if(!force&&next===stamp)return;
  const active=key(document.activeElement)||lastKey;stamp=next;
  menu.innerHTML=`<section class="rk-command-panel" role="dialog" aria-modal="true" aria-labelledby="rk-command-title" aria-describedby="rk-command-help"><header><div><p class="rk-command-eyebrow">RIFT KEEPERS · KEEPER MENU</p><h2 id="rk-command-title">${esc(g?.label||'Where next?')}</h2></div><button data-cm-close data-cm-key="close" aria-label="Close Keeper menu">Close <span aria-hidden="true">×</span></button></header><p class="rk-menu-status" aria-label="Keeper supplies"><span>${S.coins} coins</span><span>${Math.round(stamina())}/100 stamina</span><span>${S.flasks}/${S.flaskMax} flasks</span><span>${S.tonics} tonics</span></p><div class="rk-command-path"><button data-cm-back data-cm-key="back">${g?'‹ All groups':'‹ Return to game'}</button><span>${g?'Keeper menu / '+esc(g.label):'Choose a group'}</span></div><div class="rk-command-grid" data-cm-grid>${rows.slice(page*PAGE,(page+1)*PAGE).map(([id,ico,label,badge])=>`<button data-cm-${g?'destination':'group'}="${esc(id)}" data-cm-key="${g?'destination':'group'}:${esc(id)}" ${g&&view===id?'aria-current="page"':''}><span>${esc(id==='admin'?'Admin Portal':id==='hunt'?'Journey':id==='team'?'Companions':label)}</span>${badge?`<small>${esc(badge)}</small>`:''}<i aria-hidden="true">›</i></button>`).join('')}</div><footer><div class="rk-command-pages"><button data-cm-page="-1" data-cm-key="previous" ${pages===1?'disabled':''}>‹ Previous</button><span role="status">Page ${page+1} / ${pages}</span><button data-cm-page="1" data-cm-key="next" ${pages===1?'disabled':''}>Next ›</button></div><p id="rk-command-help">${controls}</p></footer></section>`;
  focusMenu(active);
 }
 function close(restore=true){
  if(!menu)return;menu.remove();menu=null;stamp='';app.inert=inertBefore;document.body.classList.remove('rk-command-open');bar?.querySelector('button')?.setAttribute('aria-expanded','false');
  if(restore&&!encounter()){
   const list=focusables(document.getElementById('main')),target=returnNode?.isConnected&&shown(returnNode)?returnNode:list.find(n=>returnKey&&key(n)===returnKey)||list[returnIndex];
   (target||bar?.querySelector('button'))?.focus({preventScroll:true});document.getElementById('main').scrollTop=returnScroll;
  }
 }
 function open(){
  if(menu){close();return;}
  if(!allowed()){toast('Finish your current action first.');return;}
  RKNavigation.useFocus();
  returnNode=document.activeElement;returnKey=key(returnNode);returnIndex=focusables(document.getElementById('main')).indexOf(returnNode);returnScroll=document.getElementById('main').scrollTop;
  group='';page=0;lastKey=memory.get('root')||'';menu=document.createElement('div');menu.className='overlay rk-command-overlay';menu.id='rk-command-menu';
  menu.addEventListener('click',e=>{
   const b=e.target.closest('button');if(e.target===menu){close();return;}if(!b||b.disabled)return;
   if(b.hasAttribute('data-cm-close')){close();return;}if(b.hasAttribute('data-cm-back')){back();return;}
   if(b.dataset.cmGroup){memory.set('root',key(b));group=b.dataset.cmGroup;page=0;const desired=memory.get(group)||'';paint(true);focusMenu(desired);return;}
   if(b.dataset.cmPage){page=(page+Number(b.dataset.cmPage)+Math.ceil((groups().find(g=>g.id===group)?.items.length||groups().length)/PAGE))%Math.ceil((groups().find(g=>g.id===group)?.items.length||groups().length)/PAGE);lastKey='';paint(true);focusMenu('');return;}
   if(b.dataset.cmDestination){const id=b.dataset.cmDestination;memory.set(group,key(b));close(false);if(id==='rk-nearby')RKNavigation.nearby();else if(id==='feedback')reportDialog('feedback');else if(id==='questshop')openQuestWorkshop();else if(id==='away')openAwayPicker();else prior.go(id);if(!padScope())RKNavigation.focusRegion('main');}
  });
  document.body.append(menu);inertBefore=app.inert;app.inert=true;document.body.classList.add('rk-command-open');bar?.querySelector('button')?.setAttribute('aria-expanded','true');paint(true);
 }
 function back(){if(group){memory.set(group,key(document.activeElement));group='';page=0;const desired=memory.get('root')||'';paint(true);focusMenu(desired);}else close();}
 function move(dx,dy){
  RKNavigation.useFocus();
  const grid=[...menu.querySelectorAll('[data-cm-grid] button')],cur=document.activeElement,index=grid.indexOf(cur);
  if(index<0){const list=buttons(),i=list.indexOf(cur),step=dx||dy;list[(Math.max(0,i)+step+list.length)%list.length]?.focus({preventScroll:true});return;}
  const cols=getComputedStyle(menu.querySelector('[data-cm-grid]')).gridTemplateColumns.split(' ').length;
  if(dy<0&&index<cols){menu.querySelector('[data-cm-back]').focus({preventScroll:true});return;}
  if(dy>0&&index+cols>=grid.length){(menu.querySelector('[data-cm-page]:not(:disabled)')||menu.querySelector('[data-cm-close]')).focus({preventScroll:true});return;}
  let n=index;if(dx){const start=Math.floor(index/cols)*cols,count=Math.min(cols,grid.length-start);n=start+(index-start+dx+count)%count;}else if(dy)n=index+dy*cols;
  grid[n]?.focus({preventScroll:true});
 }
 function sync(){
  RKNavigation.syncCursor();
  const active=ready();document.body.classList.toggle('rk-command-navigation',active);
  if(!active){close(false);if(bar)bar.hidden=true;return;}
  if(!bar){bar=document.createElement('header');bar.id='rk-commandbar';bar.innerHTML='<button class="rk-command-trigger" data-rk-command-menu aria-haspopup="dialog" aria-controls="rk-command-menu" aria-expanded="false"><span aria-hidden="true">☰</span> Menu <kbd>L1 / LB</kbd></button><button class="rk-panel-trigger" data-rk-next-panel><kbd>R1 / RB</kbd><span aria-hidden="true"> → </span><span data-rk-panel-name>Game controls</span></button><div class="rk-command-status"></div><div class="rk-command-resources"></div>';app.prepend(bar);}
  bar.hidden=false;bar.querySelector('button').disabled=encounter()||!!padScope()&&padScope()!==menu;
  bar.querySelector('[data-rk-next-panel]').disabled=encounter()||!!padScope();RKNavigation.paintRegion();
  const status=bar.querySelector('.rk-command-status'),text=`${S.handle} · Lv ${S.lv} · ${nodeName(S.loc)}`;if(status.textContent!==text)status.textContent=text;
  const resources=bar.querySelector('.rk-command-resources'),summary=`${S.coins} coins · ${Math.round(stamina())}/100 stamina`;if(resources.textContent!==summary)resources.textContent=summary;
  if(menu){if(encounter()||padScope()!==menu){close(false);}else paint();}
  if(view==='rk-notices'&&!document.getElementById('rk-controls-notice')){const section=document.createElement('section');section.id='rk-controls-notice';section.className='rk-menu-group';section.innerHTML='<h2>New Keeper menu controls</h2><p>'+esc(notice)+'</p>';document.getElementById('main').querySelector('.view-h')?.after(section);}
  const tabs=document.querySelector('#main .codextabs');if(tabs&&!document.getElementById('rk-command-codex-help')){const hint=document.createElement('p');hint.id='rk-command-codex-help';hint.className='rk-menu-help';hint.textContent='D-pad / stick: choose a category or entry · Cross / A: select · L1 / LB: Keeper menu';tabs.after(hint);}
  const partyHelp=document.querySelector('.fellowship .party-pad-help');if(partyHelp&&window.RKPadGlyphs&&window.RKParty?.state?.match?.phase!=='battle'){const help=RKPadGlyphs.legend(false);if(partyHelp.innerHTML!==help)partyHelp.innerHTML=help;}
 }
 renderNav=function(...a){const r=prior.renderNav(...a);sync();return r;};
 render=function(...a){const r=prior.render(...a);sync();return r;};
 go=function(v,...a){if(v==='menu'&&ready()&&allowed()){open();return;}if(menu)close(false);const r=prior.go(v,...a);sync();return r;};
 hubHTML=function(){return ready()?'<div class="view-h"><h1>Keeper menu</h1><p>Your journey, companions and notices.</p></div><button class="btn" data-rk-command-menu>Open Keeper menu · L1 / LB</button>':prior.hubHTML();};
 settingsHTML=function(){return prior.settingsHTML().replace('L1 / LB opens the sidebar. R1 / RB returns to the main area.','L1 / LB opens or closes the Keeper menu. R1 / RB closes it.').replace('L1 / LB: sidebar · R1 / RB: main area','L1 / LB: Keeper menu · R1 / RB: next screen panel').replace('L1 / R1 switch screens','L1 / LB opens the Keeper menu; R1 / RB switches screen panels').replace('Y the Rift Gate','Triangle / Y companions');};
 padPress=function(i){
  if(menu){if(encounter()||padScope()!==menu){close(false);return prior.padPress(i);}awayActive();setPad(true);if(i===4||i===5||i===9){RKNavigation.useFocus();close();return;}if(i===1){RKNavigation.useFocus();back();return;}if(i===11)return prior.padPress(i);if(i===0){if(RKNavigation.pointerConfirm())return;document.activeElement?.click();return;}return;}
  if((i===4||i===9)&&allowed()){awayActive();setPad(true);open();return;}return prior.padPress(i);
 };
 padBack=function(...a){if(menu&&padScope()===menu&&!encounter()){awayActive();back();return;}return prior.padBack(...a);};
 moveFocus=function(dx,dy){if(menu&&padScope()===menu&&!encounter()){RKNavigation.useFocus();return move(dx,dy);}return prior.moveFocus(dx,dy);};
 focusFirst=function(...a){if(menu&&padScope()===menu){focusMenu();return;}return prior.focusFirst(...a);};
 document.addEventListener('focusin',e=>{if(menu?.contains(e.target)){lastKey=key(e.target);memory.set(group||'root',lastKey);}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-rk-command-menu]'))open();});
 document.addEventListener('keydown',e=>{
  if(menu&&padScope()===menu&&!encounter()){
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();back();}
   else if(e.key.startsWith('Arrow')){e.preventDefault();e.stopImmediatePropagation();move(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0);}
   else if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();const list=buttons(),i=list.indexOf(document.activeElement);list[(i+(e.shiftKey?-1:1)+list.length)%list.length]?.focus({preventScroll:true});}
  }else if(e.key==='Escape'&&!e.repeat&&!e.target.matches('input,textarea,select,[contenteditable="true"]')&&allowed()){e.preventDefault();e.stopImmediatePropagation();open();}
 },true);
 let frame=0;const observer=new MutationObserver(()=>{if(frame||document.hidden)return;frame=requestAnimationFrame(()=>{frame=0;sync();});});
 observer.observe(document.getElementById('main'),{childList:true,subtree:true});observer.observe(document.body,{childList:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;close(false);}else sync();});
 addEventListener('offline',()=>close(false));
 addEventListener('pagehide',()=>close(false));addEventListener('gamepaddisconnected',()=>{if(menu)close();});
 sync();return {open,close,sync,notice,get isOpen(){return !!menu;}};
})();


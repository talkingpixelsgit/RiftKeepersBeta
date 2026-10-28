'use strict';
// First-session guidance uses existing actions and saves. It never awards loot,
// advances tutorial steps, unlocks locations or changes combat outcomes.
window.RKOpening=(()=>{
 const main=()=>document.getElementById('main');
 const clear=()=>!B&&!RUN&&!EXPLORING&&!travelling&&!MG_ON&&!timingActive&&!guardActive&&!padScope()&&!window.RKParty?.active;
 const original={onboard:onboardHTML,island:islandHTML,intro:tutIntro,reveal:tutReveal,rewards:showRewards,render,portal:openPortal,end:endBattle,map:mapSVG,battle:renderBattle,travel:islandTravel};
 const roles={voth:'Store energy, then unleash Spirit Burst.',beast:'Protect the team and break barriers.',tibrs:'Set up burns and spread fire.',ruri:'A quick-footed companion for your first journey.'};
 const freshGuide=()=>({version:1,rested:false,won:false,returned:false,paused:false,done:false});
 function recordVisit(){if(!S?.arch||!S.tut||!ISLE[S.loc])return;const d=S.rkMapDiscovery||(S.rkMapDiscovery={version:1,island:{}});d.island=d.island||{};if(!d.island[S.loc]){d.island[S.loc]=true;saveSoon();}}
 function islandKnown(id){const st=S?.tut?.step||0;return id===S.loc||!!S.rkMapDiscovery?.island?.[id]||id==='isl_shore'||(id==='isl_path'&&st>=1)||(id==='isl_grotto'&&st>=4)||(id==='isl_light'&&st>=5);}
 function islandTask(){const st=Math.min(5,S.tut.step||0);return [
  ['Find your bearings','Follow the only clear path. The rest of the island is still hidden.','Walk to Driftwood Path','island:isl_path'],
  ['Something in the sand','Search the glint to recover your Bag.','Search the sand','search'],
  ['Open the book','Your Bag holds the Codex. Read it to learn what you have discovered.','Open your Bag','bag'],
  ['Meet a wild creature','Try Capture on your Keeper’s turn. A win lets you keep any captured soul.',S.loc==='isl_grotto'?'Approach the rock pools':'Walk to Tidepool Grotto','island:isl_grotto'],
  ['Find the way onward','Your first battle is behind you. Look for a way off the island.','Climb to the lighthouse','island:isl_light'],
  ['The door in the mist','Search and Explore are optional. Continue when you are ready.',S.loc==='isl_door'?'Step toward the door':'Walk to the Standing Door','island:isl_door']
 ][st];}
 function townTask(){const g=S.rkOpening;if(!g||g.done||g.paused)return null;
  if(!g.rested)return ['A place to return to','Rest at the town portal to refill flasks and Capture uses. Progress autosaves as you play.','Rest at the portal','rest',0];
  if(!g.won&&S.loc!=='meadow')return ['Your first trip out','Follow the nearby path into Glimmer Meadow. A new portal clears a small circle of the map.','Follow the Meadow road','meadow',1];
  if(!g.won)return ['A battle on your terms','Try Attack, then an ability. Capture is optional and can fail; win to keep captured souls.','Seek a wild battle','battle',2];
  if(!g.returned)return ['Bring your discoveries home','Your rewards are saved. Return to Hall’s Edge and rest at its portal.','Return and rest','return',3];
  return ['Your first watch is complete',window.RKCloud?.account?'Your account is linked. You can continue this Keeper on another device.':'Keep this browser’s progress by linking an account before you change devices.','Keep exploring','finish',4];
 }
 function card(task,island=false){return `<section class="rk-opening-card" aria-label="Your next step"><div><span class="rk-opening-kicker">${island?'FIND YOUR WAY HOME · '+(Math.min(5,S.tut.step)+1)+' / 6':'FIRST WATCH · '+(task[4]+1)+' / 5'}</span><h2>${esc(task[0])}</h2>${island?`<p>${esc(task[1])}</p>`:`<details class="rk-opening-help"><summary>About this step</summary><p>${esc(task[1])}</p></details>`}</div><div class="rk-opening-actions"><button class="btn gold" data-opening="${task[3]}">${esc(task[2])}</button>${!island?'<button class="btn rk-opening-quiet" data-opening="pause">Hide guidance</button>':''}${!island&&task[3]==='finish'&&!window.RKCloud?.account?'<button class="btn" data-opening="account">Link this Keeper</button>':''}</div></section>`;}
 onboardHTML=function(){const t=document.createElement('template');t.innerHTML=original.onboard();const root=t.content;
  const eyebrow=root.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='YOUR FIRST JOURNEY';
  const intro=root.querySelector('.welcome-intro');if(intro)intro.textContent='Choose a Keeper and companion. Follow a short guided journey from the shore to your first safe haven.';
  const note=root.querySelector('.local-note');if(note)note.textContent='Progress autosaves here. Link an account in Account & cloud saves to continue on another device. Already linked? Use Sign in / link Keeper.';
  const select=root.querySelector('#previewEntry');if(select){select.outerHTML='<input type="hidden" id="previewEntry" value="story"><p class="rk-opening-entry">Begin on the shore · explore, battle, discover a companion, find your way home.</p>';root.querySelector('label[for="previewEntry"]')?.remove();}
  for(const b of root.querySelectorAll('[data-st]')){const small=document.createElement('small');small.textContent=roles[b.dataset.st]||'A companion to explore and fight beside you.';b.append(small);}
  const name=root.querySelector('#hIn');if(name){name.setAttribute('aria-describedby','rk-name-help');name.insertAdjacentHTML('afterend','<p class="rk-opening-fine" id="rk-name-help">Choose a unique Keeper name. Staff names and offensive names are reserved.</p>');}
  return t.innerHTML;
 };
 tutIntro=function(){tutStory([{art:'✦',title:'A stranger to yourself',text:'You wake on a cold shore beneath a cracked sky. You remember one thing: <b>you are a lesser god</b>. Your name and the way home are less certain.'},{art:portrait(S.mons[0]?.sp||'voth','',S.mons[0]||{sp:'voth'}),title:'You are not alone',text:(starterLine()||'A companion kept watch beside you.')+'<br><br>Follow the path, search the shore, and find a door out of the mist.'}],'Follow the path',()=>{if(!S.tut)return;S.tut.intro=true;saveSoon();render();if(padOn)main()?.querySelector('[data-opening]')?.focus();});};
 // A fixed, soft-edged reveal footprint. Weather settings never affect discovery.
 function fog(svg,points,key){const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs');const bounds='x="-900" y="-400" width="2800" height="2100"';
  defs.innerHTML=`<radialGradient id="rk-hole-${key}"><stop offset="0" stop-color="black"/><stop offset=".68" stop-color="black"/><stop offset="1" stop-color="black" stop-opacity="0"/></radialGradient><mask id="rk-mist-${key}" maskUnits="userSpaceOnUse" ${bounds} style="mask-type:luminance"><rect ${bounds} fill="white"/>${points.map(p=>`<circle data-reveal="${p.id}" cx="${p.x}" cy="${p.y}" r="${p.r}" fill="url(#rk-hole-${key})"/>`).join('')}</mask><radialGradient id="rk-mist-haze-${key}"><stop offset="0" stop-color="#596b91" stop-opacity=".3"/><stop offset="1" stop-color="#171e39" stop-opacity="0"/></radialGradient>`;
  svg.prepend(defs);const veil=document.createElementNS(ns,'g');veil.setAttribute('class','rk-discovery-mist');veil.setAttribute('aria-hidden','true');veil.setAttribute('pointer-events','none');veil.setAttribute('mask',`url(#rk-mist-${key})`);veil.innerHTML=`<rect ${bounds} fill="#070b19"/>${[[150,140,280,110],[580,80,350,150],[840,330,270,190],[380,400,380,130],[200,700,320,220],[680,950,410,240]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#rk-mist-haze-${key})"/>`).join('')}`;
  const marker=[...svg.children].find(n=>n.matches?.('.mnode,.inode,.gnode,.hnode,.gqnode,#token,.itoken,.layerdoor'));
  svg.insertBefore(veil,marker||null);
 }
 islandHTML=function(){recordVisit();const t=document.createElement('template');t.innerHTML=original.island();const root=t.content;root.querySelector('.tutguide')?.replaceWith(document.createRange().createContextualFragment(card(islandTask(),true)));
  const svg=root.querySelector('.islemap svg');if(svg){svg.setAttribute('role','group');svg.setAttribute('aria-label','Island paths. Unvisited places are hidden by mist.');for(const n of svg.querySelectorAll('[data-inode]')){const id=n.dataset.inode,known=islandKnown(id);n.setAttribute('aria-label',known?ISLE[id].n:n.classList.contains('open')?'Unexplored path':'Undiscovered place');if(!known){n.querySelector('image')?.remove();const label=n.querySelector('.ilabel');if(label)label.textContent=n.classList.contains('open')?'Path ahead':'???';}}fog(svg,Object.entries(ISLE).filter(([id])=>islandKnown(id)).map(([id,m])=>({id,x:m.x,y:m.y,r:id==='isl_door'?135:105})),'island');}
  root.querySelector('.view-h p')?.remove();root.querySelector('.view-h')?.classList.add('rk-opening-title');return '<section class="rk-opening-island">'+t.innerHTML+'</section>';
 };
 mapSVG=function(){const t=document.createElement('template');t.innerHTML=original.map();const svg=t.content.querySelector('svg');if(!svg)return original.map();const points=Object.entries(MAPN).filter(([id])=>mapAreaKnown(id)).map(([id,m])=>({id,x:m.x,y:m.y,r:S.portals?.[id]?150:85}));const clip=svg.querySelector('#rk-known-terrain');if(clip)clip.innerHTML=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.r}"/>`).join('');fog(svg,points,'world');svg.setAttribute('aria-label','World atlas. Portals reveal nearby terrain; unexplored paths remain hidden.');return t.innerHTML;};
 tutReveal=function(...args){if(S.tut&&!S.rkOpening)S.rkOpening=freshGuide();const r=original.reveal(...args);saveSoon();const p=document.querySelector('.hallreveal p.meta');if(p)p.textContent='Start at the town portal, take a short trip into the Meadow, then return to rest. Your next step will stay beside the map.';return r;};
 openPortal=function(...args){const r=original.portal(...args);const g=S.rkOpening;if(g&&!g.done&&S.loc==='town'&&document.getElementById('portalOv')){g.rested=true;if(g.won)g.returned=true;saveSoon();}return r;};
 endBattle=function(win,...args){const b=B,g=S.rkOpening;if(g&&!g.done&&win&&b?.meta?.mode==='wild'&&b.meta.zone?.id==='meadow'){g.won=true;g.rested=true;}return original.end(win,...args);};
 showRewards=function(res,b){const r=original.rewards(res,b);const again=document.querySelector('.overlay #again'),box=again?.closest('.rbox');if(!box)return r;
  const island=!!S.tut&&b.meta.zone?.id==='isl_grotto',g=S.rkOpening;
  if(island||(g&&!g.done&&b.meta.mode==='wild'&&b.meta.zone?.id==='meadow')){box.classList.add('rk-opening-rewards');const next=island?(res.win?'Continue toward the lighthouse':'Return to the island'):'Back to your journey';again.textContent=next;again.onclick=()=>{box.closest('.overlay').remove();go('hunt');if(padOn)main()?.querySelector('[data-opening]')?.focus();};const p=document.createElement('p');p.className='rk-opening-result';p.textContent=res.win?(res.caught.length?'Companion secured. Your rewards and collection are saved.':'Rewards saved. Capturing is optional; there will be more chances.'):'Take a breath, check your team, and try again when ready.';again.parentElement.before(p);}
  return r;
 };
 function combatHint(){const host=main()?.querySelector('.battle .actions');if(!host)return;let hint=host.parentElement.querySelector('.rk-opening-combat');const eligible=S.tut&&B?.tutPull||S.rkOpening&&!S.rkOpening.done&&!S.rkOpening.won&&B?.meta?.mode==='wild';if(!eligible){hint?.remove();return;}if(!hint){hint=document.createElement('p');hint.className='rk-opening-combat';host.after(hint);}const u=curUnit();const text=u?.side==='P'?(u.kind==='keeper'?'Keeper: R2 / RT captures a living wild target. Weaken it first.':'Companion turn. Only your Keeper can Capture.'):'Enemy turn. Your controls return when an ally can act.';if(hint.textContent!==text)hint.textContent=text;}
 renderBattle=function(...args){const r=original.battle(...args);combatHint();return r;};
 function sync(){recordVisit();const active=!!(S?.arch&&!S.tut&&S.rkOpening&&!S.rkOpening.done&&!S.rkOpening.paused);document.body.classList.toggle('rk-opening-active',active);const host=main();if(!host)return;
  if(view==='hunt'&&active&&!B&&!RUN&&!EXPLORING&&!travelling){const target=host.querySelector('.route-book')||host;let guide=host.querySelector('.rk-opening-card');if(!guide){target.insertAdjacentHTML('afterbegin',card(townTask()));guide=host.querySelector('.rk-opening-card');}const head=host.querySelector('.journey-head');if(innerWidth<=760&&head)head.after(guide);else if(guide.parentElement!==target)target.prepend(guide);}
  if(view==='rk-notices'&&S?.arch&&!S.tut&&!host.querySelector('[data-opening="resume"]'))host.insertAdjacentHTML('afterbegin','<section class="rk-opening-card"><div><span class="rk-opening-kicker">AT YOUR PACE</span><h2>Your first watch</h2><p>Rest, take a short Meadow trip, and return with your discoveries. No progress is reset.</p></div><button class="btn" data-opening="resume">'+(S.rkOpening?.done?'Review the field guide':'Show first-watch guidance')+'</button></section>');
  for(const el of host.querySelectorAll('.weather-control'))el.title='Weather effects only. Discovery mist remains until you explore.';
  combatHint();
 }
 document.addEventListener('click',e=>{const el=e.target.closest('[data-opening]');if(!el)return;const action=el.dataset.opening;if(!clear())return;
  if(action.startsWith('island:')){const id=action.slice(7);if(!S.tut||!ISLE[id]||ISLE[id].step>S.tut.step)return;if(S.loc===id)islandArrive(id);else islandTravel(id);return;}
  if(action==='search'){if(S.tut?.step===1&&S.loc==='isl_path')tutFindBag();return;}
  if(action==='bag'){go('bag');return;}
  if(action==='resume'){if(S.rkOpening?.done){RKJourney.open(0);return;}S.rkOpening=S.rkOpening||freshGuide();S.rkOpening.paused=false;saveSoon();go('hunt');return;}
  const g=S.rkOpening;if(!g)return;
  if(action==='pause'){g.paused=true;saveSoon();render();return;}
  if(action==='rest'){if(S.loc==='town')openPortal();else travelTo('town');return;}
  if(action==='meadow'){travelTo('meadow');return;}
  if(action==='battle'){if(S.loc==='meadow')startWild('meadow');return;}
  if(action==='return'){if(S.loc==='town')openPortal();else travelTo('town');return;}
  if(action==='account'){go('account');return;}
  if(action==='finish'){g.done=true;saveSoon();render();}
 });
 // The optional long-form guide remains available without misleading save advice.
 if(window.RKJourney?.chapters?.[0])RKJourney.chapters[0].lesson='Progress autosaves in this browser. Link this Keeper in Account & cloud saves to use the same progress on another device. Sign in there and choose Continue cloud Keeper. Portals refill supplies; they are not your only save points.';
 render=function(...args){const r=original.render(...args);sync();return r;};
 addEventListener('resize',sync);render();return {sync,islandTask,townTask,islandKnown,portalRevealRadius:150};
})();

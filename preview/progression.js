/* Local solo progression. Shared practice/PvP receipts never enter this ledger. */
'use strict';
window.RKProgression=(()=>{
 const relics={
  rk_waywick:{t:'censer',n:'Wayfarer’s Wick',r:'common',skill:'wispswarm',price:80,zone:'meadow',d:'A little road censer, repaired with wire. The wick was taken from a broken portal; its lights still try to guide travellers home.'},
  rk_handbell:{t:'bell',n:'Bellfrey Handbell',r:'uncommon',skill:'toll',price:110,zone:'meadow',d:'A bell carried by the runners of Bellfrey. Its small, clear note meant the road ahead was safe. Someone kept ringing it after the road disappeared.'},
  rk_ashwatch:{t:'censer',n:'Ashwatch Censer',r:'rare',skill:'pageburn',price:220,zone:'emberwood',d:'The last watchman of Emberwood put the names of the missing into this censer. The ashes refuse to settle until their watch is finished.'},
  rk_tidepromise:{t:'harpoon',n:'Undertow Promise',r:'rare',skill:'dragunder',price:220,zone:'shallows',d:'A rescue line is knotted around the haft. Its owner promised to pull every traveller out of the Shallows. One knot has never come undone.'},
  rk_minutehand:{t:'clock',n:'The Missing Minute',r:'epic',skill:'hourhand',price:320,zone:'riftscar',d:'A dial recovered from a watchtower at the Riftscar. Every clock in the tower lost the same minute. This one has been trying to return it.'},
  rk_lastdoor:{t:'greatsword',n:'Last Door’s Edge',r:'legendary',skill:'impale',price:500,zone:'riftscar',d:'Forged from the hinge of a door that held when every other passage failed. Along its blunt spine are four names: the Keepers who stayed to close it.'}
 };
 Object.values(relics).forEach(w=>w.hidden=true);Object.assign(WEAPONS,relics); // Additive IDs: existing instances and custom names are untouched.
 Object.assign(WEAPON_QUESTS,{
  rk_ashwatch:[{t:'wins',n:4,h:'The Unfinished Watch: carry the censer through four victories.'},{t:'place',zone:'emberwood',h:'Return the names to Emberwood. Win there with the censer in hand.'}],
  rk_tidepromise:[{t:'type',el:'water',n:3,h:'The Last Knot: defeat three water foes while carrying the harpoon.'},{t:'place',zone:'shallows',h:'Keep the promise. Win once in the Shallows with the harpoon in hand.'}],
  rk_minutehand:[{t:'perfect',n:6,h:'A Minute Owed: land six perfect timed strikes with the dial in hand.'},{t:'place',zone:'riftscar',h:'Carry the missing minute back to the Riftscar and win there.'}],
  rk_lastdoor:[{t:'wins',n:8,h:'Those Who Stayed: carry the blade through eight victories.'},{t:'place',zone:'riftscar',h:'Stand at the Riftscar and win with the blade in hand.'},{t:'perfect',n:8,h:'Close the Last Door: land eight perfect timed strikes with the blade.'}]
 });
 const routes=[
  {id:'meadow',need:3,name:'Lights along the road',story:'Recover the road-watch cache in Glimmer Meadow.',choices:['rk_waywick','rk_handbell'],material:'shard_meadow'},
  {id:'emberwood',need:5,name:'The unfinished watch',story:'Search the ash watchposts of Emberwood.',choices:['rk_ashwatch'],material:'shard_ember'},
  {id:'shallows',need:5,name:'A line left in the water',story:'Follow the rescue line through the Shallows.',choices:['rk_tidepromise'],material:'shard_tide'},
  {id:'riftscar',need:6,name:'The watchtower’s missing minute',story:'Recover the dial from the Riftscar.',choices:['rk_minutehand'],material:'glowsand'},
  {id:'lastdoor',need:4,name:'Four names on a hinge',story:'Recover all four regional caches. Their Keepers left one final weapon.',choices:['rk_lastdoor']}
 ];
 const handled=new WeakSet();
 const ledger=()=>S.rkLoot||{version:1,wins:{},claimed:{},journal:[]};
 function writable(){return S.rkLoot||(S.rkLoot={version:1,wins:{},claimed:{},journal:[]});}
 const count=r=>r.id==='lastdoor'?routes.slice(0,4).filter(x=>ledger().claimed[x.id]).length:ledger().wins[r.id]||0;
 const idle=()=>!B&&!RUN&&!EXPLORING&&!travelling&&!window.RKParty?.active;
 function note(text){const p=writable();p.journal.unshift(text);p.journal=p.journal.slice(0,12);}
 function record(res,b){
  if(!b||handled.has(b))return;handled.add(b);
  if(!res.win||b.meta?.mode!=='wild'||b.meta.pvp||S.tut)return;
  const route=routes.find(r=>r.id===b.meta.zone?.id&&r.material);if(!route)return;
  const p=writable(),n=p.wins[route.id]=(p.wins[route.id]||0)+1;
  const line=`${route.name}: ${Math.min(n,route.need)} / ${route.need} victories${n===route.need?' · cache ready in the Armoury.':'.'}`;
  if(n<=route.need){res.levelUps.push(line);note(line);}
  if(n%3===0){giveItem(route.material);const found=`Road salvage: ${ITEMS[route.material].n} · guaranteed every 3 victories here.`;res.levelUps.push(found);note(found);}
  saveSoon();
 }
 const rewards=showRewards;showRewards=function(res,b){record(res,b);return rewards(res,b);};
 function reason(r,id){if(!r||!r.choices.includes(id))return 'Unknown cache reward';if(ledger().claimed[r.id])return 'Already recovered';if(count(r)<r.need)return 'Finish the route first';if(!idle())return 'Finish the current activity first';if(!atPortal())return 'Rest at a broken portal to recover this cache';return '';}
 function claim(routeId,id){const r=routes.find(r=>r.id===routeId),why=reason(r,id);if(why){toast(why);return false;}
  const owned=S.weapons.some(w=>w.id===id);if(owned){toast('You already own this relic. Choose another reward.');return false;}
  const inst=giveWeapon(id);writable().claimed[r.id]=id;note(`Recovered ${W(id).n}. ${wSealed(inst)?'Its weapon quest has begun.':'Its skill is ready while equipped.'}`);saveSoon();sfx('loot',.45);render();window.RKInventory?.inspect(inst.u);toast('Recovered '+W(id).n+'. Compare it before equipping.');return true;
 }
 // A cache is a permanent, deterministic unlock; random drops remain additional finds.
 const oldRoll=rollWeapon;rollWeapon=function(zid){const own=new Set((S.weapons||[]).map(w=>w.id));const pool=Object.entries(allWeapons()).filter(([id,w])=>!Object.hasOwn(relics,id)&&(!w.zone||w.zone===zid)&&!(w.r==='mythic'&&own.has(id)));if(!pool.length)return oldRoll(zid);const weights=typeof WRAR==='undefined'?{common:60,rare:30,epic:10,mythic:1}:WRAR;let roll=Math.random()*pool.reduce((sum,[,w])=>sum+(weights[w.r]||30),0);for(const [id,w] of pool){roll-=weights[w.r]||30;if(roll<=0)return id;}return pool[0][0];};
 const oldStock=smithStock;smithStock=function(){return oldStock().filter(id=>!Object.hasOwn(relics,id));};
 function html(){return `<section class="inventory-screen progression"><header><span class="eyebrow">RELICS OF THE ROAD</span><h2>Weapons with a past</h2><p>Win solo wild battles in each region to uncover a cache. Choose its weapon at a broken portal. Progress begins with this update; practice and PvP do not count.</p></header><div class="relic-routes">${routes.map(r=>`<article><h3>${esc(r.name)}</h3><p>${esc(r.story)}</p><label>${r.id==='lastdoor'?'Regional caches':'Victories'}: ${Math.min(count(r),r.need)} / ${r.need}<progress max="${r.need}" value="${Math.min(count(r),r.need)}"></progress></label>${r.material?`<p class="meta">Every 3 wins: ${icoOf(r.material)} ${esc(ITEMS[r.material].n)}.</p>`:''}${r.choices.map(id=>{const w=W(id),why=reason(r,id);return `<div class="relic-choice">${wIco(id)}<div><b>${esc(w.n)}</b> ${rarChip(w.r)}<p>${esc(w.d)}</p><small>${esc(MOVES[w.skill]?.n||'')} · ${WEAPON_QUESTS[id]?'Sidequest to awaken':'Ready to use'}</small>${WEAPON_QUESTS[id]?`<details><summary data-inv-key="quest-${id}">Weapon sidequest</summary><ol>${WEAPON_QUESTS[id].map(s=>`<li>${esc(s.h)}</li>`).join('')}</ol></details>`:''}<button class="btn" data-inv-key="claim:${r.id}:${id}" ${why?'disabled':''}>${ledger().claimed[r.id]===id?'Recovered':ledger().claimed[r.id]?'Another relic chosen':count(r)<r.need?'Keep exploring':'Recover '+esc(w.n)}</button></div></div>`;}).join('')}${count(r)>=r.need&&!ledger().claimed[r.id]&&!atPortal()?'<p>Ready. Rest at a broken portal to recover.</p>':''}</article>`).join('')}</div><details><summary data-inv-key="loot-journal">Recent finds (${ledger().journal.length})</summary>${ledger().journal.map(x=>`<p>${esc(x)}</p>`).join('')||'<p>Your next solo wild victory starts the record.</p>'}</details></section>`;}
 const arms=armouryHTML;armouryHTML=function(){return arms().replace('</header>','<button class="btn" data-inv-key="relic-road">Relics and recent finds</button></header>')+html();};
 document.addEventListener('click',e=>{const el=e.target.closest('[data-inv-key]');if(el?.dataset.invKey==='relic-road'){const h=document.querySelector('.progression h2');if(h){h.tabIndex=-1;h.focus();h.scrollIntoView({block:'start'});}return;}if(el&&!el.disabled&&el.dataset.invKey.startsWith('claim:')){const [,route,id]=el.dataset.invKey.split(':');claim(route,id);}});
 return {relics,routes,record,claim,reason,html,count};
})();

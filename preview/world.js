/* Shared local area UI. Uses the same authenticated session as Fellowship. */
'use strict';
window.RKWorld=(()=>{
 let lastStamp='',draft='',notified='',opening=false,chatStamp='';
 const button=(id,text,disabled=false)=>`<button class="btn" data-world="${id}" ${disabled?'disabled':''}>${text}</button>`;
 const get=()=>RKParty.state?.world;
 function lawHTML(){const w=get();if(!w||w.loc!==S.loc)return '';const marked=w.markUntil>Date.now(),description=marked?'Your Hollow Mark lets other available Keepers attack you even on safe ground. The town portal refuses you until it fades.':w.law==='safe'?'Unmarked Keepers cannot be ambushed here. Friendly duels still require acceptance.':w.law==='contested'?'Available Keepers can be ambushed here. Attacking an unmarked Keeper gives the attacker a one-hour Hollow Mark.':'Available Keepers can be ambushed here without a new Hollow Mark.';return `<aside class="local-law" data-law="${esc(w.law)}" data-marked="${marked}"><b>${esc(w.law[0].toUpperCase()+w.law.slice(1))} ground${marked?' · Hollow Mark':''}</b><p>${description}</p>${button('rules','PvP & area rules')}</aside>`;}
 function html(){const w=get(),lock=RKParty.busy||!RKParty.connected;
  if(!w)return '<section id="local-world"><p>Connecting to the local area…</p></section>';
  return `<section id="local-world"><header><h3>Keepers in ${esc(nodeName(w.loc))}</h3><p>Local shared area · ${esc(w.law)} ground${w.markUntil>Date.now()?' · You carry a Hollow Mark':''}</p></header><p class="local-note">Unranked test loadouts: one Keeper and one companion. No currency, rating or item loss. Duels require acceptance; attacks can start immediately outside safe ground or against a Hollow Mark, even in town.</p>${RKParty.error?`<p role="alert">${esc(RKParty.error)}</p>`:''}
   <div class="world-kit"><b>Combat companion</b>${Object.keys(RKParty.state?.roster||{voth:1,beast:1,tibrs:1}).map(h=>button('hero:'+h,(w.hero===h?'✓ ':'')+esc(RKParty.state?.roster?.[h]?.name||h),lock||w.busy)).join('')}</div>
   ${w.challenges.map(c=>c.to===RKParty.state.you.id?`<article class="world-invite"><b>${esc(c.fromName)} challenges you.</b>${button('accept:'+c.id,'Accept duel',lock||w.busy)}${button('decline:'+c.id,'Decline',lock)}</article>`:`<p>Waiting for ${esc(c.toName)} to accept · expires after 60 seconds.</p>`).join('')}
   <div class="world-people">${w.people.length?w.people.map(p=>`<article><div>${portrait(p.hero)}</div><div><b>${esc(p.name)}</b><p>${p.busy?'In an activity':'Available'}${p.marked?' · Hollow Mark':''}</p><div>${button('talk:'+p.id,'Talk',lock)}${button('challenge:'+p.id,'Challenge',lock||w.busy||p.busy)}${button('attack:'+p.id,p.canAttack?'Attack':'Safe ground',lock||w.busy||p.busy||!p.canAttack)}</div></div></article>`).join(''):'<p>No other Keepers here. Open a second tab to test local multiplayer.</p>'}</div>
   ${RKParty.active?button('battle','Return to shared battle',lock):''}
   <div class="world-chat"><h3>Area chat</h3><div class="world-messages" role="log" aria-live="polite">${w.chat.map(m=>`<p><b>${esc(m.name)}:</b> ${esc(m.text)}</p>`).join('')||'<p>The area is quiet.</p>'}</div><label for="world-message">Say something nearby</label><div class="world-compose"><input id="world-message" maxlength="200" value="${esc(draft)}" autocomplete="off">${button('send','Send',lock)}</div><div class="world-quick">${['Hello!','Ready for a duel?','Good fight!'].map((x,i)=>button('quick:'+i,x,lock)).join('')}</div></div></section>`;
 }
 function update(){if(!S?.arch)return;const state=RKParty.state,w=get();if(!w)return;
  if(view==='hunt'&&(mapSel||S.loc)===S.loc){const law=document.querySelector('.local-law'),next=lawHTML();if(law&&next&&law.outerHTML!==next){const focused=law.contains(document.activeElement);law.outerHTML=next;if(focused)document.querySelector('[data-world="rules"]')?.focus({preventScroll:true});}else if(!law&&next)(document.querySelector('.local-area-status')||document.getElementById('local-world'))?.insertAdjacentHTML('beforebegin',next);}
  const nextChat=JSON.stringify(w.chat);if(nextChat!==chatStamp){chatStamp=nextChat;chatMsgs=[...w.chat.slice().reverse().map(m=>({by:m.userId,handle:m.name,text:m.text,loc:m.loc,ts:m.at,sc:'area',kind:'chat',localArea:true})),...chatMsgs.filter(m=>!m.localArea)].slice(0,200);renderChat();}
  if(state.match?.pvp&&state.match.phase==='battle'&&notified!==state.match.id&&!B&&!RUN&&!EXPLORING&&!travelling&&!opening){notified=state.match.id;opening=true;try{go('fellowship');toast(state.match.pvp==='ambush'?'A nearby Keeper attacks!':state.match.pvp==='tavern'?"Drew locks the stakes. Your companion duel begins.":state.match.pvp==='guild'?'Your guild team battle begins.':state.match.pvp==='tournament'?'Your tournament match begins.':'Your duel begins.');}finally{opening=false;}}
  const incoming=w.challenges.filter(c=>c.to===state.you.id),notice=document.getElementById('world-notice');
  if(incoming.length&&!notice){const n=document.createElement('aside');n.id='world-notice';n.innerHTML=button('invitations','Duel challenge · view');document.body.appendChild(n);}else if(!incoming.length)notice?.remove();
  const nearby=document.querySelector('.local-area-status');if(nearby?.firstChild?.nodeType===3)nearby.firstChild.textContent=w.people.length+' other local Keepers nearby · ';
  const senses=document.querySelector('#mapPanel .senses');if(senses&&w.people.length&&senses.textContent.includes("It's quiet. Just you and the wind."))senses.textContent='Other Keepers are nearby. Open People to talk or challenge them.';
  const host=document.getElementById('local-world');if(!host)return;
  const stamp=JSON.stringify([w,RKParty.error,RKParty.busy,RKParty.connected]);if(lastStamp===stamp)return;lastStamp=stamp;
  const input=host.querySelector('#world-message'),active=document.activeElement,focus=active?.dataset?.world,isInput=active===input,position=input?.selectionStart;
  if(input)draft=input.value;const scroll=host.querySelector('.world-messages')?.scrollTop||0;
  host.outerHTML=html();const next=document.getElementById('local-world');
  if(isInput){const field=next.querySelector('#world-message');field.focus({preventScroll:true});field.setSelectionRange(position,position);}else if(focus)[...next.querySelectorAll('[data-world]')].find(b=>b.dataset.world===focus&&!b.disabled)?.focus({preventScroll:true});
  const log=next.querySelector('.world-messages');if(log)log.scrollTop=scroll;
 }
 const oldPanel=mapPanel;mapPanel=function(){const original=oldPanel();if((mapSel||S.loc)!==S.loc)return original;
  if(S.loc==='town')return original+lawHTML()+html();
  if(!['people','chat'].includes(panelTab))return original+lawHTML()+`<p class="local-area-status">${get()?.people.length||0} other local Keepers nearby · ${button('people','Talk / challenge')}</p>`;
  const template=document.createElement('template');template.innerHTML=original;const pane=template.content.querySelector('.ppane');if(pane)pane.innerHTML=html();return template.innerHTML;
 };
 document.addEventListener('input',e=>{if(e.target.id==='world-message')draft=e.target.value;});
 document.addEventListener('keydown',e=>{if(e.target.id==='world-message'&&e.key==='Enter'){e.preventDefault();send(draft);}});
 async function send(text){if(await RKParty.command({type:'chat',text})){draft='';const input=document.getElementById('world-message');if(input)input.value='';}}
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-world]');if(!b||b.disabled)return;const [action,id]=b.dataset.world.split(':');
  if(action==='people'||action==='invitations'){mapSel=null;panelTab='people';go('hunt');lastStamp='';update();return;}
  if(action==='talk'){const person=get()?.people.find(p=>p.id===id);draft=person?person.name+', ':'';const input=document.getElementById('world-message');if(input){input.value=draft;input.focus();}return;}
  if(action==='battle'){go('fellowship');return;}
  if(action==='rules'){RKJourney.open(6);return;}
  if(action==='send')return send(draft);
  if(action==='quick')return send(['Hello!','Ready for a duel?','Good fight!'][Number(id)]);
  if(action==='hero')return RKParty.command({type:'loadout',hero:id});
  if(action==='challenge')return RKParty.command({type:'challenge',target:id});
  if(action==='accept'||action==='decline')return RKParty.command({type:'respond',id,answer:action});
  if(action==='attack'){const w=get(),p=w.people.find(p=>p.id===id);if(!p)return;const consequence=w.law==='contested'&&!p.marked?' You will carry a Hollow Mark for one hour.':'';if(await ask('Attack '+p.name+'?'+consequence,'Attack Keeper'))return RKParty.command({type:'ambush',target:id});}
 });
 const oldTravel=travelTo;travelTo=function(...args){if(RKParty.active){toast('Finish or withdraw from the shared battle first.');go('fellowship');return;}return oldTravel(...args);};
 const oldExplore=explore;explore=function(...args){if(RKParty.active){toast('Finish the shared battle first.');go('fellowship');return;}return oldExplore(...args);};
 const oldRun=startRun;startRun=function(...args){if(RKParty.active){toast('Finish the shared battle first.');go('fellowship');return;}return oldRun(...args);};
 const oldPortal=openPortal;openPortal=function(...args){if(S.loc==='town'&&(get()?.markUntil||0)>Date.now()){toast('The Hall’s Edge portal refuses your Hollow Mark.');return;}return oldPortal(...args);};
 const oldPost=postMsg;postMsg=async function(text,kind,scope){if(kind==='chat'&&(!scope||scope==='area'))return RKParty.command({type:'chat',text});return oldPost(text,kind,scope);};
 const oldRender=render;render=function(){oldRender();lastStamp='';update();if(S?.arch)RKParty.refresh();};
 return {update};
})();
render();

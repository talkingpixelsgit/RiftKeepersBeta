/* Load after ability-visuals.js. Only consumes events already gated by combat-motion. */
'use strict';
window.RKFellowshipReadout=(()=>{
 let battle='',last=0,rows=[],context=null,wasBlocked=false,resuming=true;
 const blocked=()=>document.hidden||view!=='fellowship'||!!document.querySelector('.overlay,.ask,.sheet,.timing,#rk-transform-scene');
 function reset(){battle='';last=0;rows=[];context=null;resuming=true;document.querySelectorAll('.rk-fellowship-readout').forEach(n=>n.remove());}
 function select(match){if(battle!==match.id){battle=match.id;last=0;rows=[];}}
 const name=(m,id)=>{
  const unit=m.units.find(u=>u.id===id);if(!unit)return 'Fighter';
  const keeper=unit.owner&&m.units.find(u=>u.owner===unit.owner&&u.sp==='keeper');
  return keeper&&keeper!==unit&&m.units.some(u=>u.id!==id&&u.name===unit.name)?`${unit.name} (${keeper.name})`:unit.name;
 };
 function consume(events,match){
  if(blocked()||!context?.connected||context.ignore)return;select(match);
  const fresh=events.filter(e=>Number.isFinite(e.seq)&&e.seq>last);if(!fresh.length)return;
  last=Math.max(last,...fresh.map(e=>e.seq));
  const batch=[];let current=null;
  const add=(title,source=null)=>{const row={title,source,details:[]};batch.push(row);return row;};
  for(const e of fresh){
   if(['action','enemy','timeout'].includes(e.type)){
    current=add(`${name(match,e.unit)} · ${e.type==='timeout'?'Auto-guard':e.label||'Action resolved'}`,e.unit);
    if(e.type==='timeout')current.details.push({text:'Turn timed out; guard applied.'});
   }else if(e.type==='damage'){
    const row=[...batch].reverse().find(r=>r.source===e.source)||add(e.source==='burn'?'Burn damage':e.source==='counter'?'Counter damage':'Damage resolved');
    row.details.push({name:name(match,e.unit),amount:e.amount||0,stat:'HP lost'});
    if(e.absorbed>0)row.details.push({name:name(match,e.unit),amount:e.absorbed,stat:'blocked'});
   }else if(e.type==='restore'){
    const row=current||add('Restoration resolved');row.details.push({name:name(match,e.unit),amount:e.amount||0,stat:e.stat==='hp'?'HP restored':'essence restored'});
   }else if(e.type==='evolve')add(`${name(match,e.unit)} · transformation`,e.unit).details.push({text:e.name||'Form changed.'});
   else if(e.type==='capture')(current||add('Soul capture')).details.push({text:`Soul recorded: ${e.soul||'unknown'}.`});
   else if(e.type==='forfeit'){
    const fighter=match.units.find(u=>u.id===e.unit),keeper=match.units.find(u=>u.owner===fighter?.owner&&u.sp==='keeper');
    add(`${keeper?.name||name(match,e.unit)} · Forfeit`).details.push({text:'Three missed turns; this Keeper and their companion withdrew.'});
   }else if(e.type==='won'||e.type==='lost'){
    const team=match.units.find(u=>u.owner===context.you)?.team;
    const outcome=match.pvp?(!match.winner?'Draw':match.winner===team?'Your side won.':'Your side lost.'):e.type==='won'?'Encounter won.':'Encounter lost.';
    add('Battle complete').details.push({text:outcome});
   }
  }
  rows=[...rows,...batch].slice(-3);
 }
 function paint(match){
  const shell=document.querySelector('.combat-shell');if(!shell||!match||blocked()||!context?.connected)return;
  select(match);
  const active=document.activeElement,main=document.getElementById('main'),frame=main?.getBoundingClientRect(),before=active&&shell.contains(active)?active.getBoundingClientRect():null;
  let panel=shell.querySelector('.rk-fellowship-readout');if(!panel){panel=document.createElement('section');panel.className='rk-fellowship-readout';panel.setAttribute('aria-label','Recent confirmed actions');shell.querySelector('.combat-heading')?.after(panel);}
  panel.replaceChildren();
  const label=document.createElement('small');label.className='rk-shared-caption';label.textContent='Recent confirmed actions';panel.append(label);
  if(!rows.length){const p=document.createElement('p');p.textContent=match.phase==='battle'?'Waiting for the next confirmed action.':'Encounter complete. See the result below.';panel.append(p);}
  for(const row of rows){const item=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');item.className='rk-shared-result';title.textContent=row.title;
   detail.textContent=SET.numbers===false?(row.details.filter(d=>d.text).map(d=>d.text).join(' / ')||'Action resolved.'):row.details.map(d=>d.text||`${d.name}: ${d.amount} ${d.stat}`).join(' / ')||'Action confirmed.';
   item.append(title,detail);panel.append(item);
  }
  // Preserve a visible command's position without focusing it or changing targets.
  if(before&&frame&&before.top>=frame.top&&before.bottom<=frame.bottom&&active.isConnected)main.scrollTop+=active.getBoundingClientRect().top-before.top;
 }
 const oldEvents=RKSharedLooks.events;RKSharedLooks.events=function(events,match){const result=oldEvents.apply(this,arguments);consume(events,match);return result;};
 const oldSync=RKCombatMotion.sync;RKCombatMotion.sync=function(match,options={}){
  const connected=options.connected!==false;if(!match||!connected||blocked()){reset();return oldSync.apply(this,arguments);}
  select(match);context={connected,match,you:options.you,ignore:resuming};resuming=false;const result=oldSync.apply(this,arguments);paint(match);return result;
 };
 const oldClear=RKCombatMotion.clear;RKCombatMotion.clear=function(){reset();return oldClear.apply(this,arguments);};
 function clear(){RKCombatMotion.clear();}
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 addEventListener('visibilitychange',()=>{if(document.hidden)clear();});addEventListener('offline',clear);addEventListener('pagehide',clear);
 // Do not call the motion clear hook here: it also dismisses transformation
 // dialogs owned by another consumer. Suppress our receipt and resumed batch only.
 new MutationObserver(()=>{const stop=blocked()||!document.querySelector('.combat-shell');if(stop&&!wasBlocked){wasBlocked=true;reset();}else if(!stop)wasBlocked=false;}).observe(document.body,{childList:true,subtree:true});
 return {clear,refresh(){if(context)paint(context.match);}};
})();

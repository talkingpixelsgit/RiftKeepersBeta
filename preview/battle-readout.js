/* Read-only presentation of resolved local combat. Never predicts damage or intent. */
'use strict';
window.RKBattleReadout=(()=>{
 let battle=null,receipt=null,resolving=false;
 const blocked=()=>document.hidden||!!document.querySelector('.overlay,.ask,.sheet,#rk-transform-scene');
 function clear(){battle=null;receipt=null;document.querySelectorAll('.rk-battle-readout').forEach(n=>n.remove());}
 function sync(){if(B!==battle){battle=B;receipt=null;}}
 function detail(r){
  if(SET.numbers===false)return r.kind==='log'?'Battle log updated.':'Move resolved.';
  if(r.kind==='log')return r.text;
  return r.changes.map(c=>`${c.name}: ${c.amount} ${c.label}`).join(' / ')||r.fallback;
 }
 function paint(){
  document.querySelectorAll('.rk-battle-readout').forEach(n=>n.remove());
  if(!B||blocked())return;sync();
  const root=document.querySelector('main>.battle'),anchor=root?.querySelector(':scope>.binfo');if(!anchor)return;
  const actor=B.units.find(u=>u.id===B.active),target=B.units.find(u=>u.id===B.target);
  const panel=document.createElement('section');panel.className='rk-battle-readout';panel.setAttribute('aria-label','Battle readout');
  const cell=(label,value,kind)=>{const div=document.createElement('div');div.className=kind;const small=document.createElement('small'),text=document.createElement('strong');small.textContent=label;text.textContent=value;div.append(small,text);panel.append(div);};
  cell(B.busy?'Acting now':'Current turn',actor?.name||'Waiting for next turn','rk-turn');
  if(actor?.side==='P'&&target)cell('Selected enemy',`${target.name} · ${target.hp} / ${target.max} HP`,'rk-target');
  if(receipt){cell(receipt.kind==='log'?'Latest battle update':'Last resolved move',receipt.title,'rk-result');const line=document.createElement('p');line.className='rk-outcome';line.textContent=detail(receipt);panel.append(line);}
  anchor.after(panel);
 }
 const baseLog=logB;logB=function(text){const result=baseLog.apply(this,arguments);if(!resolving&&B&&!blocked()){sync();receipt={kind:'log',title:'Battle update',text:String(text)};paint();}return result;};
 const baseResolve=resolve;
 resolve=function(u,mk,target,...args){
  sync();const original=B,prior=new Map(B.units.map(x=>[x.id,{hp:x.hp,shield:x.shield||0,alive:x.alive}]));
  let value;resolving=true;try{value=baseResolve.call(this,u,mk,target,...args);}finally{resolving=false;}
  if(B===original&&!blocked()){
   const changes=[];
   for(const unit of B.units){const old=prior.get(unit.id);if(!old)continue;const delta=unit.hp-old.hp,ward=(unit.shield||0)-old.shield;
    const add=(amount,label)=>changes.push({name:unit.name,amount,label});
    if(delta<0)add(-delta,`HP lost${unit.hp===0?' · down':''}`);
    if(delta>0)add(delta,`HP restored${!old.alive&&unit.alive?' · revived':''}`);
    if(ward<0)add(-ward,'shield reduced');
    if(ward>0)add(ward,'shield gained');
   }
   receipt={kind:'move',title:`${u.name} · ${MOVES[mk]?.n||mk}`,changes,fallback:/^(heal|healAll|revive)$/.test(MOVES[mk]?.t)?'No HP restored.':B.log[0]||'Move resolved.'};
   paint();
  }
  return value;
 };
 const baseRender=renderBattle;renderBattle=function(){
  const previous=document.activeElement,root=document.querySelector('main>.battle');
  const key=previous&&root?.contains(previous)?{id:previous.id,action:previous.getAttribute('onclick'),label:previous.getAttribute('aria-label')}:null;
  const result=baseRender.apply(this,arguments);paint();
  // Preserve the same command on DOM replacement. The controller's generic
  // focus recovery otherwise focuses the header and cancels target scrolling.
  const external=previous&&previous.isConnected&&!key&&focusables(document).includes(previous)&&!previous.matches(':disabled,[aria-disabled="true"]');
  if(!external&&!padScope()&&!timingActive&&!guardActive&&!MG_ON&&!document.querySelector('.timing')&&padOn){
   const controls=focusables(document.querySelector('main>.battle')).filter(n=>!n.matches(':disabled,[aria-disabled="true"],[hidden]'));
   const same=key&&controls.find(n=>key.id?n.id===key.id:key.action?n.getAttribute('onclick')===key.action:key.label&&n.getAttribute('aria-label')===key.label);
   const next=same||controls.find(n=>n.matches('.actions .act.tile'))||controls.find(n=>n.matches('.actions .act:not(.back)'))||controls.find(n=>n.matches('.unit.enemy.target'));
   next?.focus({preventScroll:true});
  }
  return result;
 };
 const baseGo=go;go=function(){clear();return baseGo.apply(this,arguments);};
 addEventListener('visibilitychange',clear);addEventListener('offline',clear);addEventListener('pagehide',clear);
 new MutationObserver(()=>{if(blocked()&&document.querySelector('.rk-battle-readout'))clear();}).observe(document.body,{childList:true,subtree:true});
 return {clear,paint};
})();

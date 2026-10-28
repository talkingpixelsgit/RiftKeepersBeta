/* Snapshot-driven presentation: never predicts hits or replays an old snapshot. */
'use strict';
window.RKCombatMotion=(()=>{
 let battle='',sequence=0,resuming=true,timers=[],animations=[],restorers=[];
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
 function consume(match,enabled){
  if(!match){battle='';sequence=0;return [];}
  const latest=Math.max(0,...match.events.map(e=>e.seq||0));
  const fresh=match.id===battle&&!resuming&&enabled?match.events.filter(e=>e.seq>sequence):[];
  sequence=match.id===battle?Math.max(sequence,latest):latest;battle=match.id;resuming=!enabled;return fresh;
 }
 function cancel(){window.RKSharedLooks?.clear();restorers.forEach(fn=>fn());restorers=[];timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];document.querySelectorAll('.combat-float').forEach(n=>n.remove());}
 function clear(){cancel();window.RKFieldAnimation?.clear();window.RKTransformationScene?.clear();window.RKSharedLooks?.enabled(false);resuming=true;window.RKSound?.clear();}
 const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
 function animate(el,frames,options){if(el&&!reduced())animations.push(el.animate(frames,options));}
 function sync(match,{you,connected=true}={}){
  cancel();
  const enabled=connected&&!document.hidden&&!document.querySelector('.overlay,.ask,.sheet')&&view==='fellowship'&&!!document.querySelector('.combat-shell');
  window.RKFieldAnimation?.shared(match,{connected:enabled});
  window.RKSharedLooks?.enabled(enabled);const events=consume(match,enabled);if(!enabled||!events.length)return;window.RKSound?.events(events,match);window.RKSharedLooks?.events(events,match,you);
  const unit=id=>match.units.find(u=>u.id===id),node=id=>document.querySelector(`[data-fighter="${id}"]`);
  for(const e of events.filter(e=>e.type==='evolve')){const fighter=unit(e.unit);if(fighter&&e.form)window.RKTransformationScene?.play({from:fighter.sp,to:e.form,name:e.name,key:match.id+':'+e.seq});}
  const deltas=new Map();
  for(const e of events){
   if(e.type==='damage'||e.type==='restore'){
    const list=deltas.get(e.unit)||[];list.push(e);deltas.set(e.unit,list);
   }
  }
  // An entire enemy round may resolve in one server response. Show each actor once.
  const acted=new Map(events.filter(e=>e.type==='action'||e.type==='enemy'||e.type==='timeout').map(e=>[e.unit,e]));
  for(const [id,e] of acted){
   const fighter=unit(id),card=node(id),art=card?.querySelector('[data-fighter-art]');if(!fighter||!art||fighter.hp<=0||reduced())continue;
   if(window.RKFieldAnimation?.play(fighter,e.type==='timeout'?'guard':e.move,{shared:true,you,confirmed:true,seq:e.seq}))continue;
   const self=['guard','technique','tonic','ether'].includes(e.move)&&!(fighter.sp==='tibrs'&&e.move==='technique');
   const rest=art.innerHTML;restorers.push(()=>{if(art.isConnected)art.innerHTML=rest;});
   if(fighter.sp==='voth'&&e.move==='attack'){
    const sp=fighter.evolved?'voth2':'voth',sheet=POLISHED_POSES[sp];
    const attackArt=poseCellHTML({...sheet,sheet:sheet.attacks[(e.seq||0)%3],cols:6,rows:2,cells:{strike:0}},'strike','sprite');art.innerHTML=window.RKSharedLooks?RKSharedLooks.decorate(attackArt,fighter):attackArt;
    const sprite=art.querySelector('.posecell');
    animate(sprite,[0,1,2,3,4,5].map((frame,i)=>({backgroundPosition:`${frame*20}% 0%`,offset:i/5})),{duration:870,easing:'steps(1,end)',fill:'forwards'});
   }else art.innerHTML=RKCombatView.fighterArt(fighter,you,e.move==='guard'?'guard':self?'charge':e.move==='attack'?'strike':'cast');
   const direction=1; // The facing wrapper mirrors this displacement for opponents.
   animate(art,self?[{filter:'brightness(1)'},{filter:'brightness(1.3)'},{filter:'brightness(1)'}]:[{transform:'translateX(0)'},{transform:`translateX(${direction*16}px)`,offset:.4},{transform:'translateX(0)'}],{duration:650,easing:'ease-out'});
   later(()=>{if(art.isConnected)art.innerHTML=rest;},900);
  }
  for(const [id,list] of deltas){
   const card=node(id);if(!card)continue;
   const damage=list.filter(e=>e.type==='damage').reduce((n,e)=>n+e.amount,0),blocked=list.filter(e=>e.type==='damage').reduce((n,e)=>n+(e.absorbed||0),0);
   const restore=list.filter(e=>e.type==='restore').reduce((n,e)=>n+e.amount,0);
   const label=document.createElement('span');label.className='combat-float'+(restore?' restore':'');label.textContent=[damage?`−${damage}`:'',blocked?`${blocked} blocked`:'',restore?`+${restore}`:''].filter(Boolean).join(' · ');
   if(SET.numbers!==false){card.appendChild(label);animate(label,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-20px)'}],{duration:1100,easing:'ease-out'});later(()=>label.remove(),1150);}
   if(damage)animate(card,[{filter:'brightness(1)'},{filter:'brightness(1.3)',offset:.25},{filter:'brightness(1)'}],{duration:420});
  }
 }
 function clock(){const el=document.querySelector('.combat-clock');if(!el)return;const seconds=Math.max(0,Math.ceil((Number(el.dataset.deadline)-Date.now())/1000));el.textContent=seconds+'s';el.classList.toggle('urgent',seconds<=5);}
 setInterval(clock,500);
 addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 return {sync,clear,consume};
})();

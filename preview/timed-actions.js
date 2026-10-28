/* Read-only HUD for existing solo timing mechanics. No scoring/input replacement. */
'use strict';
window.RKTimedActions=(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)'),runs=new Map();let receiptTimer=0;
 const reduced=()=>SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
 const text=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
 const key=(x,label)=>window.RKPadGlyphs?.sony?.(navigator.getGamepads?.()||[])&&padOn?RKPadGlyphs.glyph(x):`<span class="rk-qte-key">${label}</span>`;
 function legend(mode){
  if(mode==='guard')return padOn?`${key('LT','LT / L2')} block · ${key('RT','RT / R2')} counter`:'Shift / G · block &nbsp; Space / Enter · counter';
  if(mode==='capture')return padOn?`Hold ${key('A','A / Cross')} or ${key('RT','RT / R2')} · release in the band · ${key('B','B / Circle')} cancels before charging`:'Hold Space / C or the ring · release in the band · Esc cancels before charging';
  return padOn?`Tap ${key('A','A / Cross')} when the marker enters the bright band`:'Tap Space / Enter or the button in the bright band';
 }
 function track(parent,good,perfect,center){
  const t=document.createElement('div');t.className='rk-qte-track';t.setAttribute('aria-hidden','true');
  for(const [name,range] of [['good',good],['perfect',perfect]]){const b=document.createElement('i');b.className='rk-qte-'+name;b.style.left=(center-range)*100+'%';b.style.width=range*200+'%';t.append(b);}
  const marker=document.createElement('i');marker.className='rk-qte-marker';t.append(marker);parent.append(t);return marker;
 }
 function status(parent,cls){const n=document.createElement('p');n.className=cls;n.setAttribute('role','status');parent.append(n);return n;}
 function remember(message){
  document.querySelectorAll('.rk-timing-receipt').forEach(n=>n.remove());clearTimeout(receiptTimer);
  if(document.hidden||document.querySelector('.ask,.sheet,.overlay'))return;
  const stage=document.querySelector('.battle>.camwrap');if(!stage)return;
  const n=document.createElement('div');n.className='rk-timing-receipt';n.setAttribute('role','status');n.textContent=message;stage.before(n);receiptTimer=setTimeout(()=>n.remove(),1600);
 }
 function removed(root){const stop=runs.get(root);if(!stop)return;stop();runs.delete(root);if(root.dataset.rkReceipt)remember(root.dataset.rkReceipt);}
 function monitor(root,update){
  if(runs.has(root))return;
  let frame=0;const tick=()=>{if(!root.isConnected){removed(root);root.closest('.rk-guard-slot')?.remove();return;}root.classList.toggle('rk-qte-reduced',reduced());root.classList.toggle('rk-qte-muted',SET.sparks===false);update();frame=requestAnimationFrame(tick);};
  runs.set(root,()=>cancelAnimationFrame(frame));tick();
 }
 function decorateTiming(o,opts){
  if(!o||o.classList.contains('rk-timed'))return;o.classList.add('rk-timed');
  const box=o.querySelector('.tbox'),actor=B?.units?.find(u=>u.id===B.active);
  const move=Object.values(MOVES).find(m=>opts.title===m.n||opts.title?.startsWith(m.n+' ·'));
  const charge=move?.t==='charge';o.classList.toggle('rk-qte-charge',charge);
  const prompt=document.createElement('p');prompt.className='rk-qte-prompt';prompt.innerHTML=legend('timing');box.querySelector('#trialTap').before(prompt);
  const button=o.querySelector('#trialTap');button.innerHTML=(charge?'Charge':opts.crit?'Strike':'Attune')+' · '+key('A',padOn?'A / Cross':'Space');
  button.setAttribute('aria-label',charge?'Charge: tap once per pulse':opts.crit?'Strike in the bright band':'Attune: tap once per pulse');
  const note=box.querySelector('small');note.textContent=opts.crit?'Two passes · one strike. A miss keeps normal power.':'Three pulses · one scored tap per pulse. Extra taps add no charge.';
  let marker=null,score=null,meter=null;
  if(!opts.crit){
   const dial=o.querySelector('.rune-dial');
   if(actor){const art=document.createElement('div');art.className='rk-qte-actor';art.setAttribute('aria-hidden','true');art.innerHTML=actor.kind==='keeper'?unitArtHTML(actor,'ok'):unitArtHTML(actor,'ok',charge?'charge':'cast');dial.append(art);}
   const fx=document.createElement('i');fx.className='rk-qte-energy';fx.setAttribute('aria-hidden','true');dial.append(fx);
   marker=track(box,Math.max(.16,tGood*2),Math.max(.065,tPerf*2),.8);box.querySelector('#trialStatus').before(marker.parentElement);
   const progress=document.createElement('div');progress.className='rk-qte-score';meter=document.createElement('meter');meter.min=0;meter.max=6;meter.value=0;meter.setAttribute('aria-label',charge?'Charge timing score':'Rune timing score');score=document.createElement('span');progress.append(meter,score);box.querySelector('.rune-slots').after(progress);
  }else{
   const hint=document.createElement('div');hint.className='rk-qte-band-key';hint.textContent='Aqua: good hit · bright centre: perfect';box.querySelector('.track').after(hint);
  }
  const stopCharge=charge?window.RKChargeEffects?.windup(o,actor):null;
  let previous=-1,settled=false;
  monitor(o,()=>{
   if(marker){marker.style.left=Math.max(0,Math.min(1,tPos))*100+'%';meter.value=runeHits;text(score,`${charge?'Charge focus':'Rune score'} · ${runeHits} / 6`);
    [...o.querySelectorAll('.rune-slots i')].forEach((slot,i)=>{const label=slot.classList.contains('perfect')?'Perfect':slot.classList.contains('good')?'Good':slot.classList.contains('miss')?'Miss':i<runeRound?'Miss':'Waiting';slot.dataset.label=label;slot.setAttribute('aria-label',`Pulse ${i+1}: ${label}`);slot.classList.toggle('rk-rune-past',i<runeRound&&label==='Miss');});
    if(runeHits!==previous){if(previous>=0&&runeHits>previous&&!reduced()&&SET.sparks!==false){const fx=o.querySelector('.rk-qte-energy');fx.classList.remove('burst');void fx.offsetWidth;fx.classList.add('burst');}previous=runeHits;}
   }
   if(!timingActive&&!settled){settled=true;o.dataset.result='complete';remember(`${opts.title||'Timed action'} · ${o.querySelector('b').textContent}`);}
  });
  if(stopCharge){const stop=runs.get(o);runs.set(o,()=>{stop();stopCharge();});}
 }
 function decorateGuard(o){
  if(!o||o.classList.contains('rk-timing-guard'))return;o.classList.add('rk-timing-guard');
  let host=document.querySelector('.battle>.rk-cinema');if(!host){const stage=document.querySelector('.battle>.camwrap');if(stage){host=document.createElement('section');host.className='rk-guard-slot';stage.before(host);}}
  if(host)host.append(o);
  const hud=document.createElement('div');hud.className='rk-guard-hud';const title=document.createElement('strong');title.textContent=o.classList.contains('counter')?'COUNTER WINDOW':'BLOCK WINDOW';hud.append(title);
  const marker=track(hud,.22/1.9,(o.classList.contains('counter')?.075:.09)/1.9,1.4/1.9);
  const prompt=document.createElement('p');prompt.className='rk-qte-prompt';prompt.innerHTML=legend('guard');if(!o.classList.contains('counter'))prompt.innerHTML=padOn?`${key('LT','LT / L2')} block · or tap the band`:'Shift / G / right-click · or tap the band';hud.append(prompt);
  const result=status(hud,'rk-guard-result');result.textContent='Press as the marker reaches the bright band.';o.append(hud);
  let done=false;
  monitor(o,()=>{
   const scale=Number(o.querySelector('#gring')?.style.transform.match(/scale\(([^)]+)\)/)?.[1]||2.4);marker.style.left=Math.max(0,Math.min(1,(2.4-scale)/1.9))*100+'%';
   const kind=['landed','perfect','good','miss'].find(k=>o.classList.contains(k));
   if(kind&&!done){done=true;const labels={landed:'COUNTER · incoming hit stopped',perfect:'PERFECT BLOCK · damage reduced',good:'BLOCK · damage reduced',miss:'MISSED · normal damage'};result.textContent=labels[kind];o.dataset.result=kind;o.dataset.rkReceipt=labels[kind];}
  });
 }
 function decorateCapture(o){
  if(!o?.querySelector('.capring')||o.classList.contains('rk-capture-prompt'))return;o.classList.add('rk-capture-prompt');
  const hint=o.querySelector('.cr-hint');hint.innerHTML=legend('capture');
  o.querySelector('#crBack').textContent='Cancel before charging';
  const guide=document.createElement('p');guide.className='rk-capture-guide';guide.textContent='Hold → build your reach → release inside the moving band';o.querySelector('.capring').before(guide);
  monitor(o,()=>{o.classList.toggle('rk-qte-reduced',reduced());const inlight=o.classList.contains('inlight');guide.textContent=inlight?'RELEASE NOW · your reach is inside the band':'Hold → build your reach → release inside the moving band';});
 }
 const oldTiming=timing;timing=function(cb,opts){const result=oldTiming.apply(this,arguments);decorateTiming(document.getElementById('timing'),opts||{});return result;};
 const oldGuard=guardWindow;guardWindow=function(){const result=oldGuard.apply(this,arguments);decorateGuard(document.getElementById('gwin'));return result;};
 const oldOverlay=mgOverlay;mgOverlay=function(){const o=oldOverlay.apply(this,arguments);if(B)decorateCapture(o);return o;};
 function clear(){for(const stop of runs.values())stop();runs.clear();clearTimeout(receiptTimer);document.querySelectorAll('.rk-timing-receipt,.rk-guard-slot:empty').forEach(n=>n.remove());document.querySelectorAll('.rk-qte-energy').forEach(n=>n.classList.remove('burst'));}
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 addEventListener('pagehide',clear);addEventListener('offline',clear);addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 // Lifecycle cleanup owns added presentation only; the existing core owns completion.
 new MutationObserver(()=>{if(!B||document.querySelector('.ask,.sheet,#rk-transform-scene')){clear();return;}for(const root of runs.keys()){if(!root.isConnected)removed(root);}document.querySelectorAll('.rk-guard-slot:empty').forEach(n=>n.remove());}).observe(document.body,{childList:true,subtree:true});
 return {clear,decorateTiming,decorateGuard,decorateCapture,legend,get activeMonitors(){return runs.size;}};
})();

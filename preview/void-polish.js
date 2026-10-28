/* Selected supplied audio + Magic Sparkles texture. Presentation only. */
'use strict';
window.RKVoidPolish=(()=>{
 const base=new URL('assets/void-polish/',document.currentScript.src);
 const bankMap={tick:'focus',click:'confirm',open:'open',back:'back',discovery:'discovery'};
 // Keep the existing mixer, cooldowns, shuffle bags and five-voice limit.
 if(window.RKSound)for(const [bank,file] of Object.entries(bankMap))RKSound.banks[bank]=[new URL(file+'.wav',base).href];
 const oldSettingsHTML=settingsHTML;settingsHTML=function(){return oldSettingsHTML()+`<section class="inventory-screen sound-audition"><h3>Void interface sounds</h3><div class="inventory-actions">${[['tick','Focus'],['click','Confirm'],['back','Back'],['open','Menu opening'],['discovery','Discovery']].map(([id,label])=>`<button class="btn" data-sound-cue="${id}">${label}</button>`).join('')}</div><p class="meta">Cozy UI: Oliver Malling · Signal Forge sampler. Existing effects volume and mute apply.</p></section>`;};
 const media=matchMedia('(prefers-reduced-motion: reduce)'),texture=new Image();
 texture.src=new URL('sparkle.png',base).href;
 const colours=['#b79aff','#788fff','#70e5df'],tints=[];
 texture.onload=()=>{for(const colour of colours){const c=document.createElement('canvas');c.width=27;c.height=7;const g=c.getContext('2d');g.drawImage(texture,0,0);g.globalCompositeOperation='source-in';g.fillStyle=colour;g.fillRect(0,0,27,7);tints.push(c);}};
 const blood=new Image();blood.src=new URL('blood-rows.png',base).href;
 const bloodLengths=[11,12,8,11,9,12,14,10,12];
 const active=new Set(),seen=new WeakSet();let layer=null,raf=0,offline=false,epoch=0,bloodSerial=0;
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 const blocked=()=>offline||document.hidden||SET.sparks===false||reduced()||!!document.querySelector('.overlay,.ask,.sheet,#rk-transform-scene');
 function clear(){epoch++;cancelAnimationFrame(raf);raf=0;active.clear();layer?.remove();layer=null;}
 function burst(host,kind='soul'){
  if(!host?.isConnected||blocked())return;
  if(active.size>=6)active.delete(active.values().next().value);
  // Focus particles stay at button edges; magic particles ring the portrait.
  const count=kind==='focus'?4:8,now=performance.now();
  const row=bloodSerial%9;if(kind==='blood')bloodSerial++;
  active.add({host,kind,row,start:now,duration:kind==='blood'?bloodLengths[row]*60:kind==='focus'?420:760,count});
  if(!layer){layer=document.createElement('canvas');layer.className='rk-void-sparkles';layer.setAttribute('aria-hidden','true');document.body.append(layer);}
  if(!raf)raf=requestAnimationFrame(draw);
 }
 function draw(now){
  raf=0;if(blocked()){clear();return;}const g=layer?.getContext('2d');if(!g)return;
  const dpr=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;
  if(layer.width!==Math.round(w*dpr)||layer.height!==Math.round(h*dpr)){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.imageSmoothingEnabled=false;
  for(const s of active){
   const p=(now-s.start)/s.duration;if(p>=1||!s.host.isConnected){active.delete(s);continue;}
   const r=s.host.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>h)continue;
   if(s.kind==='blood'){
    if(blood.complete&&blood.naturalWidth){const f=Math.min(bloodLengths[s.row]-1,Math.floor((now-s.start)/60)),size=Math.min(100,r.width*.65);g.globalAlpha=.72;g.drawImage(blood,f*110,s.row*93,110,93,r.left+r.width/2-size/2,r.top+r.height*.48-size*.42,size,size*93/110);}
    continue;
   }
   for(let i=0;i<s.count;i++){
    const side=i%2?1:-1,angle=i/s.count*Math.PI*2;
    const x=s.kind==='focus'?(side>0?r.right-5:r.left+5)+side*p*5:r.left+r.width/2+Math.cos(angle)*Math.min(r.width*.43,65)*(1+p*.12);
    const y=s.kind==='focus'?r.top+r.height*(.25+(i%2)*.5)-p*9:r.top+r.height*.43+Math.sin(angle)*Math.min(r.height*.32,65)-p*17;
    const frame=Math.min(3,Math.floor(p*4)),im=tints[i%3];if(!im)continue;
    const size=s.kind==='focus'?6:7+(i%3)*2;g.globalAlpha=Math.sin(Math.PI*p)*.8;
    g.drawImage(im,[0,6,13,20][frame],0,7,7,x-size/2,y-size/2,size,size);
   }
  }
  g.globalAlpha=1;if(active.size)raf=requestAnimationFrame(draw);else clear();
 }
 document.addEventListener('focusin',e=>{const n=e.target.closest('button,[role="button"]');if(n&&!n.disabled&&!n.closest('#timing,.rk-timing-guard'))burst(n,'focus');});
 const oldResolve=resolve;
 resolve=function(u,mk,target,...rest){
  const battle=B,r=oldResolve.call(this,u,mk,target,...rest),move=MOVES[mk],el=move&&fxType(move),token=epoch;
  if(r?.kind==='dmg'&&r.dmg>0&&['blood','spirit','void','ki','dark','ice','water'].includes(move?.el==='blood'?'blood':el))queueMicrotask(()=>{if(B===battle&&token===epoch)burst(pEl(target?.id||target),move?.el==='blood'?'blood':'soul');});
  return r;
 };
 let sharedBattle='',sharedSequence=0;
 if(window.RKSharedLooks){const oldEvents=RKSharedLooks.events;RKSharedLooks.events=function(events,match){
  const r=oldEvents.apply(this,arguments);
  if(sharedBattle!==match.id){sharedBattle=match.id;sharedSequence=0;}
  const fresh=events.filter(e=>Number.isFinite(e.seq)&&e.seq>sharedSequence);sharedSequence=Math.max(sharedSequence,...fresh.map(e=>e.seq));
  for(const e of fresh){if(e.type!=='damage'||!(e.amount>0))continue;const a=events.findLast(x=>(x.type==='action'||x.type==='enemy')&&x.unit===e.source&&x.seq<e.seq);if(a?.element!=='blood')continue;const host=[...document.querySelectorAll('[data-fighter]')].find(n=>n.dataset.fighter===e.unit)?.querySelector('.exp-portrait');burst(host,'blood');}
  return r;
 };}
 // Shared cues already represent fresh confirmed server events; no extra event consumer.
 new MutationObserver(()=>{
  if(blocked()){if(active.size)clear();return;}
  for(const n of document.querySelectorAll('.rk-ability-vfx')){
   if(seen.has(n))continue;seen.add(n);
   if(['impact','restore'].includes(n.dataset.mode)&&['spirit','void','water','ice'].includes(n.dataset.element))burst(n.parentElement);
  }
  for(const s of active)if(!s.host.isConnected)active.delete(s);
 }).observe(document.body,{childList:true,subtree:true});
 const oldGo=go;go=function(){clear();return oldGo.apply(this,arguments);};
 const oldSettings=saveSettings;saveSettings=function(){clear();return oldSettings.apply(this,arguments);};
 if(window.RKCombatMotion){const oldSync=RKCombatMotion.sync;RKCombatMotion.sync=function(m,o={}){if(o.connected===false){clear();RKAtmosphere.clear();}return oldSync.apply(this,arguments);};}
 addEventListener('visibilitychange',clear);addEventListener('pagehide',clear);
 addEventListener('offline',()=>{offline=true;clear();RKSound?.clear();});addEventListener('online',()=>{offline=false;});media.addEventListener('change',clear);
 return {clear,burst,bankMap,get active(){return active.size;},get kinds(){return [...active].map(s=>s.kind);}};
})();

/* Approved 030 idle/walk with compatible 028 capture sheets. Presentation only: input, capture odds and weapon clocks stay owned by the game. */
'use strict';
window.RKKeeper028=(()=>{
 const base=new URL('assets/keeper-028/',document.currentScript.src),worldBase=new URL('assets/keeper-030/',document.currentScript.src),media=matchMedia('(prefers-reduced-motion: reduce)'),images=new Map();
 RKKeeper028Data['world/down_right/idle']=RKKeeper028Data['world/right/idle'];RKKeeper028Data['world/down_left/idle']=RKKeeper028Data['world/left/idle'];
 let raf=0,offline=false;const sessions=new Map();
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 function image(key){if(!images.has(key)){const im=new Image();im.src=new URL(key+'/composite.png',key.startsWith('world/')?worldBase:base).href;images.set(key,im);}return images.get(key);}
 function frame(key,elapsed){const s=RKKeeper028Data[key];let t=s.loop?Math.max(0,elapsed)%s.duration:Math.min(Math.max(0,elapsed),s.duration-1);let i=0;while(i<s.frames.length-1&&t>=s.durations[i])t-=s.durations[i++];return i;}
 function portrait(extra=''){
  const key='world/down_right/idle',s=RKKeeper028Data[key];
  return `<svg class="keeper-r2 rk-keeper-028 ${extra}" data-keeper028="true" viewBox="0 0 576 576" aria-hidden="true"><svg data-keeper028-cell x="75.56" y="11.44" width="424.89" height="531.11" viewBox="0 0 320 400" overflow="hidden"><image href="${new URL(key+'/composite.png',key.startsWith('world/')?worldBase:base).href}" width="${s.cell[0]*s.grid[0]}" height="${s.cell[1]*s.grid[1]}"/></svg></svg>`;
 }
 function idle(svg,now){
  const facing=svg.closest('.unit.enemy')?'left':'right',walking=!!svg.closest('.journey[data-state="travelling"]'),key=`world/${walking?facing:'down_'+facing}/${walking?'walk':'idle'}`,s=RKKeeper028Data[key],f=reduced()||svg.closest('.down,.fallen,.rk-portal-still')?0:frame(key,now),[x,y]=s.frames[f],cell=svg.querySelector('[data-keeper028-cell]');
  if(!cell)return;const href=new URL(key+'/composite.png',key.startsWith('world/')?worldBase:base).href,im=cell.querySelector('image');if(im.getAttribute('href')!==href)im.setAttribute('href',href);
  const box=`${x*s.cell[0]} ${y*s.cell[1]} ${s.cell.join(' ')}`;if(cell.getAttribute('viewBox')!==box)cell.setAttribute('viewBox',box);svg.dataset.frame=f;svg.dataset.keeper028Clip=key;
 }
 function canvasFor(host){const c=document.createElement('canvas');c.width=120;c.height=144;c.className='rk-capture-028';c.setAttribute('aria-hidden','true');host.append(c);return c;}
 function paint(c,key,elapsed){const s=RKKeeper028Data[key],im=image(key);if(!im.complete||!im.naturalWidth)return;const f=reduced()?0:frame(key,elapsed),[x,y]=s.frames[f],g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
  // One fixed crop for all 199 right-facing frames; preserves their common root.
  // Verified source alpha bounds [94,93,181,220] fit with generous padding.
  g.drawImage(im,x*s.cell[0]+78,y*s.cell[1]+84,120,144,0,0,120,144);c.dataset.clip=key;c.dataset.frame=f;}
 function capture(now){
  // Add decorative art beside the existing ring; never replace its button or listeners.
  const prompt=document.querySelector('.capcharge .capring');
  if(prompt&&!sessions.has(prompt)){const c=canvasFor(prompt.parentElement);prompt.before(c);sessions.set(prompt,{canvas:c,start:now,kind:'prompt'});}
  const bust=document.querySelector('.soul-cinema .soul-bust');
  if(bust&&!sessions.has(bust)){const c=canvasFor(bust);bust.classList.add('rk-has-capture-028');sessions.set(bust,{canvas:c,start:now,kind:'result',phase:'',phaseStart:now});}
  for(const [host,s] of sessions){
   if(!host.isConnected){s.canvas.remove();sessions.delete(host);continue;}
   const elapsed=now-s.start;let clip,clock=elapsed;
   if(s.kind==='prompt'){const held=typeof MGI!=='undefined'&&MGI.action;if(held&&s.heldSince==null)s.heldSince=now;if(!held)s.heldSince=null;clip=elapsed<720?'prepare_plant':held?(now-s.heldSince<300?'cast_draw':'channel_await'):'channel';if(clip!==s.phase){s.phase=clip;s.phaseStart=now;}clock=now-s.phaseStart;}
   else {const caption=host.closest('.soul-cinema').querySelector('.soul-caption')?.textContent||'';clip=caption==='SOUL BOUND'?'success':caption==='SOUL ESCAPED'?'failure':elapsed<700?'channel':'cast_draw';if(clip!==s.phase){s.phase=clip;s.phaseStart=now;}clock=now-s.phaseStart;}
   paint(s.canvas,'battle/right/'+clip,clock);
  }
 }
 function clear(){cancelAnimationFrame(raf);raf=0;for(const [host,s] of sessions){s.canvas.remove();host.classList.remove('rk-has-capture-028');}sessions.clear();}
 function tick(now){raf=0;if(document.hidden||offline){clear();return;}for(const svg of document.querySelectorAll('svg[data-keeper028]:not(.rk-field-fallback)')){if(!svg.closest('.rk-field-action'))idle(svg,now);}capture(now);if(!reduced()||sessions.size)raf=requestAnimationFrame(tick);}
 function wake(){if(!raf&&!document.hidden&&!offline)raf=requestAnimationFrame(tick);}
 new MutationObserver(wake).observe(document.body,{childList:true,subtree:true});
 addEventListener('visibilitychange',()=>{clear();wake();});addEventListener('pagehide',clear);addEventListener('offline',()=>{offline=true;clear();});addEventListener('online',()=>{offline=false;wake();});media.addEventListener('change',()=>{clear();wake();});
 for(const key of ['prepare_plant','channel','channel_await','cast_draw','success','failure'])image('battle/right/'+key);
 wake();return {portrait,frame,clear,wake};
})();

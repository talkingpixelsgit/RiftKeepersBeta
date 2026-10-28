'use strict';
/* Only the existing meadow backdrop gets these painted plants. No generic forest
   layer over taverns, coasts, fire arenas or future region art. */
window.RKLivingBattle=(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let pending=0;
 function sync(){
  pending=0;
  const still=document.hidden||SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
  for(const stage of document.querySelectorAll('.battle .stage,.facing-battle .expedition-stage')){
   const scene=stage.matches('.expedition-stage')?stage:stage.closest('.cam')?.querySelector('.scene.battle');
   const meadow=!!scene&&/meadow-battle\.png/.test(getComputedStyle(scene).backgroundImage);
   let layer=stage.querySelector(':scope>.rk-living-scenery');
   if(!meadow){layer?.remove();stage.classList.remove('rk-living-stage');continue;}
   stage.classList.add('rk-living-stage');
   stage.dataset.livingMotion=still?'still':SET.motion==='full'?'full':'auto';
   stage.dataset.livingWeather=SET.mapWeather===false?'off':'on';
   if(!layer){
    layer=document.createElement('div');layer.className='rk-living-scenery';layer.setAttribute('aria-hidden','true');
    for(const name of ['canopy','air','shrub']){const part=document.createElement('i');part.className='rk-living-'+name;layer.append(part);}
    stage.append(layer);
   }
  }
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
 const observer=new MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('rk-living-scenery'))))schedule();
 });
 observer.observe(document.getElementById('main'),{childList:true,subtree:true});
 const originalSettings=saveSettings;
 saveSettings=function(){const result=originalSettings.apply(this,arguments);schedule();return result;};
 addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
 addEventListener('pagehide',()=>{cancelAnimationFrame(pending);pending=0;document.querySelectorAll('.rk-living-stage').forEach(s=>s.dataset.livingMotion='still');});
 addEventListener('pageshow',schedule);
 schedule();return {sync};
})();

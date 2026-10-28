/* Phase 2 only. New drawn silhouettes; original combat clocks remain authoritative. */
(function(root){
 'use strict';
 function visualFrame(index,contact,length){
  return index<contact?Math.min(2,Math.floor(index*3/Math.max(1,contact))):Math.min(5,3+Math.floor((index-contact)*3/Math.max(1,length-contact)));
 }
 function placement(spec,index,rootX,rootY,height){
  const r=spec.rects[index],foot=spec.feet[index],scale=height/spec.standingHeight;
  return {sx:r[0],sy:r[1],sw:r[2],sh:r[3],x:rootX+(r[0]-foot[0])*scale,y:rootY+(r[1]-foot[1])*scale,w:r[2]*scale,h:r[3]*scale};
 }
 function supports(p){return ['#418dc9','#454b50'].includes(String(p.cloak).toLowerCase())&&[p.left,p.right].every(c=>!c||String(c).toLowerCase()==='#b7f5ea');}
 const api={visualFrame,placement,supports};
 if(typeof module==='object'&&module.exports){module.exports=api;return;}
 const base=new URL('assets/keeper-tattered-r1/',document.currentScript.src),cache=new Map();
 function load(key){
  const spec=RKTatteredData[key];if(!spec)return Promise.resolve(null);
  if(!cache.has(key))cache.set(key,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({spec,image});image.onerror=()=>{cache.delete(key);resolve(null);};image.src=new URL(key+'.png',base).href;}));
  return cache.get(key);
 }
 function prepare(loaded,original){
  const {spec,image}=loaded,times=original.format==='painted'?original.timing_ms:original.playback.map(f=>f.duration_ms),contact=original.format==='painted'?(original.markers.find(m=>['contact','release'].includes(m.name))?.frame??3):original.contact;
  const frames=[];
  return {times,contact,length:times.length,width:700,height:380,style:'tattered',frame(index){
   const f=visualFrame(index,contact,times.length);if(frames[f])return frames[f];
   const canvas=document.createElement('canvas');canvas.width=700;canvas.height=380;
   const p=placement(spec,f,350,357,238);canvas.getContext('2d').drawImage(image,p.sx,p.sy,p.sw,p.sh,p.x,p.y,p.w,p.h);frames[f]=canvas;return canvas;
  }};
 }
 function portrait(extra=''){
  const s=RKTatteredData.idle,p=placement(s,0,288,516,478),url=new URL('idle.png',base).href;
  return `<svg class="keeper-r2 rk-tattered ${extra}" viewBox="0 0 576 576" aria-hidden="true" data-tattered="true" data-motion-slot="keeper-tattered-neutral"><svg data-tattered-cell x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${s.rects[0].join(' ')}" overflow="hidden" preserveAspectRatio="none"><image href="${url}" width="${s.width}" height="${s.height}"/></svg></svg>`;
 }
 function idleFrame(svg,frame){
  const f=Math.floor(frame/4)%6,s=RKTatteredData.idle,p=placement(s,f,288,516,478),cell=svg.querySelector('[data-tattered-cell]');if(!cell)return;
  for(const [key,v] of Object.entries({x:p.x,y:p.y,width:p.w,height:p.h,viewBox:s.rects[f].join(' ')}))cell.setAttribute(key,v);
  svg.dataset.frame=f;svg.dataset.motionSlot='keeper-tattered-idle';
 }
 root.RKTatteredArt={...api,load,prepare,portrait,idleFrame};
})(typeof window==='object'?window:this);

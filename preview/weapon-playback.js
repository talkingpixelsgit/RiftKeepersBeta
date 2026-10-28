/* Browser adapter for existing Talking Pixels sheets. Purely cosmetic. */
'use strict';
window.RKWeaponPlayback=(()=>{
 const base=new URL('assets/weapon-attacks/',document.currentScript.src),cache=new Map();
 const aliases={sword:'sword',sword_shield:'sword_shield','sword-shield':'sword_shield',daggers:'daggers',twin_daggers:'daggers',duelblades:'daggers',bow:'bow',staff:'staff',grimoire:'book',book:'book',magic_book:'book',energy_blasters:'energy_blasters','energy-blasters':'energy_blasters',kusarigama:'kusarigama',greatsword:'greatsword'};
 const ids={starter_sword:'sword',starter_sword_shield:'sword_shield',starter_twin_daggers:'daggers',starter_bow:'bow',starter_staff:'staff',starter_magic_book:'book',starter_energy_blasters:'energy_blasters',starter_kusarigama:'kusarigama',creator_greatsword:'greatsword'};
 const colour=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:fallback;
 function resolve(u,{local=false}={}){
  if(u.kind!=='keeper'&&u.sp!=='keeper')return null;
  const look=u.look||(local?S?.look:null)||{},body=u.body||look.body||(local?'m2':null);
  if(!['m2','standard'].includes(body))return null; // Never substitute a different build.
  // Shared trial kits omit equipment. Only the local Keeper may borrow their
  // own equipped appearance; never guess the opposing Keeper's weapon.
  const localWeapon=local&&typeof curWeapon==='function'?curWeapon():null;
  const id=u.wpn||u.weapon?.id||localWeapon?.id,type=u.weapon?.type||u.weapon?.t||(id&&typeof allWeapons==='function'?allWeapons()[id]?.t:null)||(!u.wpn&&!u.weapon?localWeapon?.t:null);
  const key=ids[id]||aliases[type];if(!key||!RKWeaponArtData[key])return null;
  return {key,cloak:colour(u.cloak,local?colour(S?.cloak,'#79658c'):'#79658c'),left:colour(look.eyeLeft,'#b7f5ea'),right:colour(look.eyeRight,'#b7f5ea')};
 }
 function load(key){
  if(cache.has(key))return cache.get(key);
  const spec=RKWeaponArtData[key];if(!spec)return Promise.resolve(null);
  const files=spec.format==='painted'?Object.values(spec.paths):[...new Set(spec.playback.map(f=>spec.frames[f.frame].page))].flatMap(page=>spec.draw_order.flatMap(role=>[`${key}/${role}-${page}.png`,...(spec.cloth_layers.includes(role)?[`${key}/${role}-mask-${page}.png`]:[])]));
  const promise=Promise.all(files.map(file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve([file,im]);im.onerror=()=>reject(Error('Missing weapon art: '+file));im.src=new URL(file,base).href;}))).then(entries=>({spec,images:Object.fromEntries(entries)})).catch(()=>{cache.delete(key);return null;});
  const combined=Promise.all([promise,window.RKTatteredArt?.load(key)||null]).then(([old,tattered])=>old?{...old,tattered}:null);
  cache.set(key,combined);if(cache.size>3)cache.delete(cache.keys().next().value);return combined;
 }
 const canvas=()=>{const c=document.createElement('canvas');c.width=420;c.height=280;return c;};
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 function recolour(ctx,mask,tint){
  const smooth=canvas(),sc=smooth.getContext('2d');sc.filter='blur(1.1px)';sc.drawImage(ctx.canvas,0,0);
  const pixels=ctx.getImageData(0,0,420,280),soft=sc.getImageData(0,0,420,280).data,m=mask.getContext('2d').getImageData(0,0,420,280).data,palette=RKKeeperInk.palette(tint);
  for(let i=0;i<pixels.data.length;i+=4){const amount=m[i+3]/255;if(!amount)continue;const c=palette[RKKeeperInk.band(RKKeeperInk.luminance(soft[i],soft[i+1],soft[i+2]))];
   let rim=0;
   if(tint.toLowerCase()==='#418dc9'){
    const x=i/4%420,y=Math.floor(i/4/420);let inner=pixels.data[i+3];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)inner=Math.min(inner,x+dx<0||x+dx>=420||y+dy<0||y+dy>=280?0:pixels.data[((y+dy)*420+x+dx)*4+3]);
    rim=(pixels.data[i+3]-inner)/255*.7;
   }
   for(let j=0;j<3;j++)pixels.data[i+j]=pixels.data[i+j]*(1-amount)+(c[j]*(1-rim)+[65,157,232][j]*rim)*amount;
  }
  ctx.putImageData(pixels,0,0);
 }
 function prepare(loaded,palette){
  if(loaded.tattered&&window.RKTatteredArt?.supports(palette))return RKTatteredArt.prepare(loaded.tattered,loaded.spec);
  const {spec:s,images}=loaded,frames=[],times=s.format==='painted'?s.timing_ms:s.playback.map(f=>f.duration_ms),contact=s.format==='painted'?(s.markers.find(m=>['contact','release'].includes(m.name))?.frame??3):s.contact;
  function frame(index){
   if(frames[index])return frames[index];const out=canvas(),ctx=out.getContext('2d');
   if(s.format==='painted'){
    const [w,h]=s.cell,scale=238/Math.max(s.standing_height,h*.8),dx=210-s.feet[0]*scale,dy=257-s.feet[1]*scale,col=index%s.grid[0],row=Math.floor(index/s.grid[0]);
    const draw=(c,file)=>c.drawImage(images[file],col*w,row*h,w,h,dx,dy,w*scale,h*scale);
    draw(ctx,s.paths.body);const mask=canvas();draw(mask.getContext('2d'),s.paths.mask);recolour(ctx,mask,palette.cloak);
    const eyes=canvas(),ec=eyes.getContext('2d');draw(ec,s.paths.eyes);
    const p=ec.getImageData(0,0,420,280);let min=420,max=0;for(let i=3;i<p.data.length;i+=4)if(p.data[i]>20){const x=((i-3)/4)%420;min=Math.min(min,x);max=Math.max(max,x);}
    // Authored combined-eye mask: split at the empty gap in this frame, before any facing mirror.
    const midpoint=(min+max)/2,left=rgb(palette.left),right=rgb(palette.right);
    for(let i=0;i<p.data.length;i+=4){const c=(i/4)%420<=midpoint?left:right;for(let j=0;j<3;j++)p.data[i+j]=c[j];}ec.putImageData(p,0,0);ctx.drawImage(eyes,0,0);
   }else{
    // Consistent character scale; the long blade may leave the cinematic crop.
    const f=s.frames[s.playback[index].frame],scale=.40,dx=210-s.root[0]*scale,dy=225-s.root[1]*scale;
    for(const role of s.draw_order){const [x,y,x2,y2]=s.layer_cells[role],w=x2-x,h=y2-y,c=canvas(),cc=c.getContext('2d'),file=`greatsword/${role}-${f.page}.png`;
     cc.drawImage(images[file],f.cell[0]*w,f.cell[1]*h,w,h,dx+x*scale,dy+y*scale,w*scale,h*scale);
     if(s.cloth_layers.includes(role)){const mask=canvas();mask.getContext('2d').drawImage(images[`greatsword/${role}-mask-${f.page}.png`],f.cell[0]*w,f.cell[1]*h,w,h,dx+x*scale,dy+y*scale,w*scale,h*scale);recolour(cc,mask,palette.cloak);}
     if(role.startsWith('eye-')){cc.globalCompositeOperation='source-in';cc.fillStyle=role==='eye-left'?palette.left:palette.right;cc.fillRect(0,0,420,280);}ctx.drawImage(c,0,0);
    }
   }
   frames[index]=out;return out;
  }
  return {frame,times,contact,length:times.length};
 }
 return {resolve,load,prepare,aliases};
})();

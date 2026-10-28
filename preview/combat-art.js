/* Child Voth from the current Time Keepers catalog. No image resampling. */
'use strict';
(()=>{
 const root='preview/assets/voth-child/';
 for(const id of ['voth','voth2']){
  POLISHED_POSES[id]={sheet:root+id+'.png',cols:3,rows:2,cells:{idle:0,strike:1,cast:2,hurt:3,guard:4,charge:1,down:5},attacks:[0,1,2].map(n=>root+id+'-attack-'+n+'.png')};
  ART_PORT[id]=root+id+'-portrait.png';ART[id]=root+id+'-portrait.png';
 }
 const originalClip=clipFor;
 clipFor=function(u,mk){
  if(['voth','voth2'].includes(u.sp)&&REGULAR.has(mk)){
   const ps=POLISHED_POSES[u.sp],index=((lastAtk[u.id]??-1)+1)%3;lastAtk[u.id]=index;
   // Current sheets have six action phases on row one, then casting phases on row two.
   return {html:clipHTML(ps.attacks[index],6,2,[0,1,2,3,4,5],[140,180,100,130,120,200],'sprite'),ms:870};
  }
  return originalClip(u,mk);
 };
})();

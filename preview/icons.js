/* Reuse the owned interface/icon library; fill missing weapon silhouettes with credited SVGs. */
'use strict';
window.RKIcons=(()=>{
 const image=(src,cls='')=>`<img class="pack-icon ${cls}" src="${src}" alt="" aria-hidden="true">`;
 const extra=n=>'preview/assets/icons/'+n+'.svg',status=n=>'preview/assets/status/'+n+'.png';
 const weaponTypes={censer:'preview/assets/icons/waywick.png',lantern:'preview/assets/icons/ashwatch.png',scythe:extra('scythe'),gunblade:extra('crossed-pistols'),chakram:extra('chakram'),bell:'rift-ui/icons/bell.svg',umbrella:extra('umbrella'),fans:extra('handheld-fan'),spear:extra('spear-feather'),lance:extra('spear-feather'),oar:extra('paddles'),trident:extra('trident'),kite:extra('kite'),flintlock:extra('crossed-pistols'),anchor:extra('anchor'),banner:extra('flying-flag')};
 const relics={rk_waywick:'preview/assets/icons/waywick.png',rk_handbell:'rift-ui/icons/bell.svg',rk_ashwatch:'preview/assets/icons/ashwatch.png',rk_tidepromise:extra('trident'),rk_minutehand:'rift-ui/icons/time.svg',rk_lastdoor:extra('relic-blade')};
 const oldWeapon=wIco,oldItem=icoOf;
 wIco=function(id){const path=relics[id]||weaponTypes[W(id).t];if(!path)return oldWeapon(id);return `<span class="weapon-pack rarity-${W(id).r||'common'}">${image(path,'icoimg')}${W(id).t==='gunblade'?image('art/icons/i84.png','weapon-blade'):''}</span>`;};
 icoOf=function(id){return id==='orange'?image(extra('orange'),'icoimg'):oldItem(id);};
 const ui={rift:'rift',spirit:'spirit',keeper:'keeper',map:'map',craft:'craft',fortress:'fortress',scroll:'scroll',reeds:'reeds',metal:'metal',leaf:'leaf',sword:'swords',shield:'shield',flask:'poison',capture:'spirit',portal:'rift',coin:'coin',bag:'bag',book:'book',herb:'leaf',ore:'crystal',fish:'water',tool:'craft',star:'cosmic',fire:'fire',ice:'ice',lightning:'lightning',water:'water',time:'time',wind:'wind',sound:'sound',void:'void',exit:'door',heart:'blood',search:'map'};
 const oldUI=uiIcon;uiIcon=function(k,cls=''){return ui[k]?image('rift-ui/icons/'+ui[k]+'.svg','game-icon '+cls):oldUI(k,cls);};
 const statuses={Guard:'10_shielded',barrier:'10_shielded',Charged:'12_strengthened','Counter stance':'14_thorns',Burn:'02_burning',Exposed:'08_feared',Awakened:'16_invulnerable',Down:'06_stunned'};
 function badge(label){const k=Object.keys(statuses).find(k=>label.includes(k));return (k?image(status(statuses[k]),'status-icon'):'')+esc(label);}
 function action(u,id){if(id==='guard')return image(status('10_shielded'));if(id==='tonic')return image('art/icons/i144.png');if(id==='ether')return image('art/icons/i145.png');if(id==='attack')return uiIcon('sword');const lore={tumbleknot:'leaf',sootling:'fire',ticktail:'time',pipwisp:'light',hushmoth:'sound',hollowknave:'shadow',shardheart:'crystal',boltwarden:'lightning'};const k=lore[u?.sp]||(u?.sp==='tibrs'?'fire':u?.sp==='beast'?'earth':u?.sp==='voth'?'spirit':'rift');return image('rift-ui/icons/'+k+'.svg');}
 return {image,badge,action,weaponTypes,relics};
})();

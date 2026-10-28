/* Talking Pixels — First Light playable UI study. Existing RPG rules remain in index.html. */
'use strict';
const PREVIEW_BUILD = 'Playtest · Build 28';
let previewAtlas = false;
let previewStart = 'preview';
let keeperSerial = 0;
const originalMapHTML = mapHTML;
const originalBindOnboard = bindOnboard;
const originalRender = render;
const originalKeeperArt = keeperArt;
const originalSfxFile = sfxFile;
const originalSceneStyle = sceneStyle;
const originalRenderNav = renderNav;
const originalBgmWant = bgmWant;
CLOAKS.splice(0,CLOAKS.length,{n:'Ink blue',c:'#418dc9'},{n:'Charcoal',c:'#454b50'},{n:'Sea glass',c:'#458e83'},{n:'Bone',c:'#dad4be'},{n:'Heather',c:'#79658c'},{n:'Ember',c:'#a15a45'},{n:'Fern',c:'#697c4f'});
if(!S?.arch) cloakPick=CLOAKS[0].c;
const PREVIEW_SOUND = {tick:'ui-focus-01',click:'ui-confirm',open:'ui-open',back:'ui-back',equip:'ui-equip',discovery:'ui-reveal'};

// Stable art slots keep appearance separate from scene motion.
function previewKeeper(cloak, extra='') {
  const tint = /^#[0-9a-f]{6}$/i.test(cloak||'') ? cloak : '#466b67';
  const eyeColour = side => /^#[0-9a-f]{6}$/i.test(S?.look?.[side]||'') ? S.look[side] : '#b7f5ea';
  if(window.RKTatteredArt?.supports({cloak:tint,left:eyeColour('eyeLeft'),right:eyeColour('eyeRight')}))return window.RKKeeper028?RKKeeper028.portrait(extra):RKTatteredArt.portrait(extra);
  const id = 'keeper-tint-' + (++keeperSerial);
  return `<svg class="keeper-r2 ${extra}" viewBox="0 0 384 576" aria-hidden="true" data-motion-slot="keeper-neutral">
    <defs><filter id="${id}" color-interpolation-filters="sRGB">${RKKeeperInk.svg(tint)}</filter>
    <mask id="${id}-mask"><image href="preview/assets/cloak.png" width="384" height="576"/></mask>
    <filter id="${id}-left"><feFlood flood-color="${eyeColour('eyeLeft')}"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="${id}-right"><feFlood flood-color="${eyeColour('eyeRight')}"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    <image href="preview/assets/keeper.png" width="384" height="576"/>
    <image href="preview/assets/keeper.png" width="384" height="576" filter="url(#${id})" mask="url(#${id}-mask)"/>
    <image href="preview/assets/eye-left.png" width="384" height="576" filter="url(#${id}-left)"/>
    <image href="preview/assets/eye-right.png" width="384" height="576" filter="url(#${id}-right)"/>
  </svg>`;
}
keeperArt = function(arch, cloak, wpn, mood, body) {
  // R2 coverage is Standard average only. Keep unsupported body silhouettes intact.
  const b=body||(S&&S.look&&S.look.body)||'m2';
  return b==='m2' ? previewKeeper(cloak||S?.cloak) : originalKeeperArt(arch,cloak,wpn,mood,body);
};
sfxFile = function(name) { return PREVIEW_SOUND[name] ? 'preview/assets/'+PREVIEW_SOUND[name]+'.wav' : originalSfxFile(name); };
bgmWant = function() { return document.hidden ? null : originalBgmWant(); };
addEventListener('visibilitychange',()=>bgmRefresh());

function previewBackdrop(id) {
  if(id==='meadow'||id==='emberwood'||id==='isl_path') return 'preview/assets/forest.png';
  if(id.startsWith('isl_')) return 'art/bg/'+id+'.jpg';
  return 'art/bg/'+(id==='town'?'town':id)+'_battle.jpg';
}
function previewRouteList() {
  const layer=curLayer();
  return Object.keys(MAPN).filter(id=>layerOf(id)===layer&&mapAreaVisible(id)).map(id=>{
    const z=zoneOf(id), selected=(mapSel||S.loc)===id, here=S.loc===id,locked=travelLock(id);
    return `<button class="route-stop ${locked?'rk-route-locked':''} ${selected?'selected':''}" data-node="${id}" aria-pressed="${selected}"><span class="route-dot">${here?'◆':'◇'}</span><span><b>${esc(mapAreaLabel(id))}</b><small>${!mapAreaKnown(id)?(locked?'Locked path':'Visit to discover'):locked?'Locked · Keeper Lv '+z.min:here?'You are here':z?'Wild level '+z.lv.join('–'):'Settlement'}${mapAreaKnown(id)&&!here?' · Visited':''}</small></span><span class="route-arrow">›</span></button>`;
  }).join('');
}
mapHTML = function() {
  if(previewAtlas) return `<div class="atlas-head"><div><span class="eyebrow">THE THREADS BETWEEN WORLDS</span><h1>Traveller’s atlas</h1></div><button class="btn" onclick="previewAtlas=false;render()">Return to location</button></div>`+originalMapHTML();
  const id=mapSel||S.loc, here=id===S.loc, known=mapAreaKnown(id), name=mapAreaLabel(id), locked=!!(RUN||travelling||EXPLORING);
  const z=zoneOf(id), ex=EXPLORING&&here;
  return `<section class="journey" data-motion-slot="location" data-state="${ex?'exploring':travelling?'travelling':'idle'}">
    <header class="journey-head"><div><span class="eyebrow">${!known?'UNDISCOVERED':isWorld(id)?'BEYOND THE LAST DOOR':'THE NEAR WORLD'}</span><h1>${esc(name)}</h1></div><button class="text-button" onclick="previewAtlas=true;render()">Open world atlas <span>↗</span></button></header>
    ${RUN?`<div class="banner"><b>${esc(RUN.title)}</b><button class="btn" onclick="go('run')">Continue expedition</button></div>`:''}
    <div class="journey-layout"><div class="location-column"><div class="location-art ${known?'':'rk-location-unknown'}" ${known?`style="--location:url('${new URL(previewBackdrop(id),document.baseURI).href}')"`:""}>
      <div class="location-caption"><span>${here?'YOUR CURRENT LOCATION':'DESTINATION'}</span><b>${esc(name)}</b></div>
      ${here?`<div class="scene-keeper">${previewKeeper(S.cloak)}</div>
      <button class="landmark landmark-explore" onclick="${ex?'cancelExplore()':`explore('${id}')`}" ${RUN||travelling?'disabled':''}><i>◇</i><span>${ex?'Stop exploring':'Follow the trail'}</span></button>
      ${(S.portals||{})[id]?`<button class="landmark landmark-rest" onclick="openPortal()" ${RUN||travelling||EXPLORING?'disabled':''}><i>◈</i><span>Rest at the portal</span></button>`:''}
      ${z?`<button class="landmark landmark-battle" onclick="startWild('${id}')" ${locked?'disabled':''}><i>⚔</i><span>Seek a battle</span></button>`:''}`:''}
      <div class="scene-note" role="status">${!known?'This place is hidden until you visit.':ex?esc(EXPLORING.txt):travelling?'Following the road…':here?'Choose a landmark to explore.':'Select Travel here below to follow the route.'}</div>
    </div>
    <div class="bag-aside"><span class="bag-label">BAG</span><p>${!known?'“The map ends here. The road does not.”':here?'“We could follow the path. Or investigate that suspiciously inviting ruin. Your boots, your decision.”':'“We haven’t gone anywhere yet. Looking is free. Walking is where the trouble starts.”'}</p></div>
    <div class="location-detail" id="mapPanel">${mapPanel()}</div></div>
    <aside class="route-book"><div class="route-heading"><span class="eyebrow">CHOOSE YOUR NEXT STOP</span><h2>Roads & rifts</h2></div>
      <div class="route-tabs"><button data-layer="near" aria-pressed="${curLayer()==='near'}">Near World</button><button data-layer="hall" aria-pressed="${curLayer()==='hall'}">Other worlds</button></div>
      <div class="route-list">${previewRouteList()}</div>
      <div class="travel-note"><span>✦</span><p>Travel follows existing roads. Rest, rumours and discoveries stay with each location.</p></div>
      <button class="route-activities" data-v="activities">Find something to do <span>↗</span></button>
    </aside></div>${chatPopHTML()}</section>`;
};

onboardHTML = function() {
  return `<section class="first-light"><div class="first-light-art"><div class="title-wordmark"><small>TALKING PIXELS</small><h1>Rift<br>Keepers<span>FIRST LIGHT</span></h1></div><div class="welcome-keeper">${previewKeeper(cloakPick)}</div><p>Some doors lead to worlds.<br>Some lead back to yourself.</p></div>
    <div class="first-light-form"><span class="eyebrow">A NEW JOURNEY</span><h2>Who walks<br>through the rift?</h2><p class="welcome-intro">A Keeper. A companion. An unreasonable number of doors.</p>
    <label class="field-label" for="hIn">Keeper name</label><input id="hIn" maxlength="18" placeholder="Your Keeper’s name" value="${esc(S.handle||'')}">
    <span class="field-label">Your calling</span><div class="calling-choices">${Object.entries(ARCH).map(([id,a])=>`<button data-arch="${id}" aria-pressed="${archPick===id}" title="${esc(a.d)}">${esc(a.n)}</button>`).join('')}</div><p class="calling-desc">${esc(ARCH[archPick].d)}</p>
    <span class="field-label">Cloak colour</span>${cloakSwatches(cloakPick)}
    <span class="field-label">First companion</span><div class="companion-picks">${HEROES.map(h=>`<button data-st="${h.id}" aria-pressed="${starterPick===h.id}">${portrait(h.id)}<b>${esc(SPECIES[h.id].n)}</b></button>`).join('')}</div>
    <label class="field-label" for="previewEntry">Where to begin</label><select id="previewEntry"><option value="story">Begin on the shore · guided opening</option></select>
    <button class="begin-journey" id="startBtn">Begin your journey <span>→</span></button><p class="local-note">Playtest 03 · Solo progress saves on this device<br>Shared play requires a server connection.</p></div></section>`;
};
bindOnboard = function() {
  originalBindOnboard();
  const button=document.getElementById('startBtn'), original=button.onclick;
  button.onclick=async()=>{
    const skip=document.getElementById('previewEntry').value==='preview';
    await original();
    if(!S.arch)return;
    if(skip){ S.tut=null; S.loc='meadow'; S.home='meadow'; S.portals.meadow=true; S.previewBuild=1; view='hunt'; saveSoon(); render(); }
    bgmRequest(null); document.getElementById('main').scrollTop=0; window.scrollTo(0,0);
  };
};

function previewActivitiesHTML() {
  const rows=[
    ['01','Explore & collect','Follow local trails, discover companions and return to a portal to rest.','hunt','Continue exploring',''],
    ['02','Solo expeditions','Follow a rumour through a sequence of encounters and discoveries.','rumours','Find local rumours',''],
    ['03','Arena practice','Challenge existing rival teams at Hall’s Edge.','arena','Enter arena',S.loc!=='town'?'Travel to Hall’s Edge to enter.':''],
    ['04','Rift Gate','Combine the words you have discovered to open an expedition.','gate','Open the Rift Gate',''],
    ['05','Fellowship','Find a second Keeper, ready your companions and seal a fracture together.','fellowship','Visit the party board',''],
    ['06','Trade & craft','Visit settlement markets and use your learned professions.','market','Visit the market',!viewHere('market')?'Available in a settlement.':'']
  ];
  return `<section class="activity-book"><span class="eyebrow">MAKE YOUR OWN WAY</span><h1>A world worth getting lost in.</h1><p class="activity-intro">A quiet wander or a fight you’ll remember. Choose what comes next.</p><div class="activity-ledger">${rows.map(([n,title,desc,dest,label,reason])=>`<article><span class="activity-number">${n}</span><div><h2>${title}</h2><p>${desc}</p>${reason?`<small>${reason}</small>`:''}</div><button class="btn" data-activity="${dest}" ${reason?'disabled':''}>${label} ↗</button></article>`).join('')}</div><p class="local-note">Fellowship, guilds and shared trials are available in this local playtest. Ranked matchmaking is not enabled.</p></section>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-activity]'); if(!b||b.disabled||B) return;
  if(b.dataset.activity==='rumours') { if(S.loc==='town'){toast('Travel to a wild location to hear its rumours.');return;} panelTab='runs'; go('hunt'); }
  else go(b.dataset.activity);
});
const oldHubItems=hubItems;
hubItems=function(){const list=oldHubItems();if(!S?.tut)list.splice(1,0,['activities','◇','Activities','']);return list;};
NAV.splice(1,0,['activities','◇','Activities']);
render = function() {
  originalRender();
  document.body.classList.add('first-light-build');
  document.body.classList.toggle('preview-onboard',!S?.arch||!S?.handle);
  document.body.classList.toggle('preview-location',view==='hunt'&&!S?.tut&&!B);
  if(view==='activities'&&S?.arch&&!B) document.getElementById('main').innerHTML=previewActivitiesHTML();
  const sync=document.getElementById('syncState'); if(sync&&!ONLINE&&!window.RKSaveStatus)sync.textContent='Offline playtest · device save';
  const brand=document.querySelector('.side .brand'); if(brand)brand.innerHTML='<span class="brandtk">TALKING PIXELS</span>Rift Keepers<small>'+PREVIEW_BUILD.toUpperCase()+'</small>';
  document.querySelectorAll('[data-v="coop"]').forEach(b=>{b.disabled=false;b.title='Open the local party board';});
};
renderNav=function(){ originalRenderNav(); document.querySelectorAll('#nav [data-v="hunt"]').forEach(b=>b.lastChild.textContent='Journey'); };
document.title='Rift Keepers — '+PREVIEW_BUILD;
if(SET.mapWeather===undefined)SET.mapWeather=true;
const previewKeeperPage=keeperHTML, previewBindKeeper=bindKeeper;
keeperHTML=function(){const eyes=`<div class="eye-customisation"><h3>A light of your own</h3><p>Choose each eye independently. Your cloak colour stays separate.</p><label>Left eye <input type="color" id="eyeLeft" value="${S.look?.eyeLeft||'#b7f5ea'}"></label><label>Right eye <input type="color" id="eyeRight" value="${S.look?.eyeRight||'#b7f5ea'}"></label></div>`;const swatches=cloakSwatches(S.cloak);return previewKeeperPage().replace(swatches,swatches+eyes);};
bindKeeper=function(){previewBindKeeper();['eyeLeft','eyeRight'].forEach(id=>{const el=document.getElementById(id);el.onchange=()=>{S.look=S.look||{};S.look[id]=el.value;saveSoon();render();};});};
render();


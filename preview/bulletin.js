'use strict';
window.RKBulletin=(()=>{
 let feed={news:[],notice:null,revision:0},connected=false,polling=false,deadline=0,lastBanner='',dismissed=[];
 try{dismissed=JSON.parse(sessionStorage.getItem('rk-notices-read')||'[]').slice(-30);}catch{}
 const safe=()=>!document.hidden&&!B&&!RUN&&!EXPLORING&&!travelling&&!window.RKParty?.active&&!document.querySelector('.overlay,.ask,.sheet,.timing');
 const current=()=>connected&&feed.notice&&Date.now()<deadline?feed.notice:null;
 const unread=()=>{const n=current();return n&&!dismissed.includes(n.id)?n:null;};
 const {button}=RKPanels;
 const noticeHTML=n=>`<article class="bulletin-notice"><p class="eyebrow">A VOICE BEYOND THE DOORS</p><h2>A proclamation</h2><p class="bulletin-copy proclamation">${esc(n.proclamation)}</p><h3>Actual message</h3><p class="bulletin-copy">${esc(n.message)}</p><p class="meta">Local server notice · until ${esc(new Date(n.expiresAt).toLocaleString())}</p>${button('bulletin:read','Mark notice read',dismissed.includes(n.id))}</article>`;
 function newsHTML(){return feed.news.map(n=>`<article class="bulletin-entry"><p class="eyebrow">${esc(n.category)} · ${esc(new Date(n.updatedAt).toLocaleDateString())}</p><h2>${esc(n.title)}</h2><p class="bulletin-copy">${esc(n.body)}</p></article>`).join('')||'<p>No published news yet.</p>';}
 function html(){const n=current();return `<section class="wayfarer-screen bulletin-screen"><header><span class="eyebrow">RIFT KEEPERS · NEWS & NOTICES</span><h1>Words from the Hall.</h1><p>${connected?'News and notices from this local playtest.':'News service unavailable. Previously loaded news may be out of date.'}</p></header>${n?noticeHTML(n):'<p>No active server notice.</p>'}${newsHTML()}${button('bulletin:back','Back to the world')}</section>`;}
 function draw(force=false){const main=document.getElementById('main');if(!main)return;const n=unread();document.querySelectorAll('[data-v="news"]').forEach(b=>{b.classList.toggle('bulletin-unread',!!n);b.title=n?'Unread server notice':'News & notices';});
  if(!safe()){main.querySelector('.bulletin-invite')?.remove();lastBanner='';return;}
  if(view==='news'&&S?.arch){RKPanels.draw('news',html,[feed.revision,current()?.id,connected,dismissed],force);return;}
  const slot=main.querySelector('.onb,.first-light-form');if(slot){let panel=slot.querySelector('.bulletin-title-news');if(!panel){panel=document.createElement('section');panel.className='bulletin-title-news';slot.append(panel);}const stamp=JSON.stringify([feed.revision,current()?.id,connected]);if(panel.dataset.stamp!==stamp&&!panel.contains(document.activeElement)){panel.dataset.stamp=stamp;panel.innerHTML='<h2>News from the Hall</h2>'+(current()?noticeHTML(current()):'')+newsHTML();}return;}
  if(!['hunt','menu'].includes(view))return;
  const stamp=n?.id||'';let banner=main.querySelector('.bulletin-invite');if(!n){banner?.remove();lastBanner='';return;}if(banner&&lastBanner===stamp)return;banner?.remove();banner=document.createElement('aside');banner.className='bulletin-invite';banner.innerHTML=`<div><strong>A voice beyond the doors</strong><p>A server notice is waiting in News & notices.</p></div>${button('bulletin:open','Read server notice')}`;main.append(banner);lastBanner=stamp;
 }
 function accept(next){feed=next;connected=true;deadline=next.notice?Date.now()+Math.max(0,next.notice.expiresAt-next.serverTime):0;draw();}
 async function refresh(){if(polling||document.hidden)return;polling=true;try{const r=await fetch('/mmo/bulletin',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();accept(await r.json());}catch{connected=false;deadline=0;draw();}finally{polling=false;}}
 document.addEventListener('click',e=>{const id=e.target.closest('[data-rk]')?.dataset.rk;if(id==='bulletin:open')go('news');if(id==='bulletin:back')go('hunt');if(id==='bulletin:read'){const n=current();if(n){dismissed=[...dismissed.filter(id=>id!==n.id),n.id].slice(-30);try{sessionStorage.setItem('rk-notices-read',JSON.stringify(dismissed));}catch{}draw(true);}}});
 const canView=viewHere;viewHere=function(id){return id==='news'||canView(id);};
 const oldGo=go;go=function(v){if(v==='news'&&!safe()){toast('News will be here when your encounter or dialog is finished.');return;}return oldGo(v);};
 const oldRender=render;render=function(){oldRender();draw(true);};NAV.push(['news','scroll','News & notices']);const oldHub=hubItems;hubItems=function(){return [...oldHub(),['news','scroll','News & notices',unread()?'!':'']];};
 // The legacy sign-in panel and Windows launcher retain their feed schema.
 loadLoginFeed=async function(){try{const r=await fetch('launcher.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});return r.ok?await r.json():null;}catch{return null;}};
 addEventListener('offline',()=>{connected=false;deadline=0;draw();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();else{document.querySelector('.bulletin-invite')?.remove();lastBanner='';}});
 setInterval(refresh,4000);setInterval(()=>draw(),1000);refresh();return {draw,accept,current,get connected(){return connected;}};
})();

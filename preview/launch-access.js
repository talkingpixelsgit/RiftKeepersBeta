/* Hosted access switch only. Game controls and combat input remain unchanged. */
'use strict';
(()=>{let pending=false,warning;
 async function check(){if(pending)return;pending=true;try{
  const response=await fetch('/launch-status',{cache:'no-store'});if(!response.ok)return;
  const state=await response.json();if(state.open!==false)return;
  if(typeof writeLocalSave==='function'&&!writeLocalSave()){
   if(!warning){warning=document.createElement('dialog');const message=document.createElement('p'),retry=document.createElement('button');message.textContent='The server is off, and this device could not save your progress. Keep this window open, free some storage, then retry.';retry.textContent='Retry save';retry.onclick=check;warning.append(message,retry);document.body.append(warning);warning.showModal();warning.addEventListener('cancel',e=>e.preventDefault());}return;
  }
  location.replace('/');
 }catch{/* A failed network check is not an operator shutdown. */}finally{pending=false;}}
 setInterval(check,15000);addEventListener('focus',check);check();
})();

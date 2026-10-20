import { renderWheel, spinTarget } from './wheel.js';
import { shouldApplyRemoteState } from './sync.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categories={likes:'她的喜好',rewards:'甜蜜奖励',gifts:'小礼品'};
const emojiChoices=['🧋','🍲','💆🏻‍♀️','💐','🎬','🎁','🍰','🫂','🧸','💌','🍓','🌊'];
let token='',state=null,category='all',search='',busy=false,spinning=false,editingId=null,editingRevision=0,deletingId=null;
let selectedEmoji='🎁',angle=0,wheelSignature='',sound=false,audioContext,tickTimer,toastTimer,showAllHistory=false,connecting=false;

function toast(message) { const node=$('#toast'); node.textContent=message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.remove('visible'),3400); }
function setConnection(online,message='') {
  $('#save-state').classList.toggle('offline',!online);
  $('#save-state').innerHTML=`<i></i>${online?'已保存到共享清单':'暂未连接'}`;
  $('#connection-banner').hidden=online;
  $('#connection-message').textContent=message || '暂时连不上小铺，请检查网络后重试。';
}
async function api(path,body,mayRetry=false) {
  let response;
  try {
    response=await fetch(path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  } catch {
    if(mayRetry) return api(path,body,false);
    const error=new Error('暂时连不上小铺，刚才的操作可能已保存，请重新连接后确认。'); error.network=true; throw error;
  }
  const data=await response.json();
  if(!response.ok) {const error=new Error(data.error||'操作没有完成，请重试');error.status=response.status;throw error;}
  setConnection(true); return data;
}
function activeItems() {return state?.items.filter(item=>item.selected)||[];}
function visibleItems() {return state?.items.filter(item=>(category==='all'||item.category===category)&&(!search||`${item.title} ${item.note}`.toLowerCase().includes(search)))||[];}
function updateControls() {
  const locked=busy||spinning||!state;
  $('#workspace').setAttribute('aria-busy',String(locked));
  $('#spin-button').disabled=locked||!activeItems().length;
  $('#center-spin').disabled=locked||!activeItems().length;
  $('#add-button').disabled=locked||state.items.length>=32;
  $('#select-all').disabled=locked||!visibleItems().length;
  $('#clear-selection').disabled=locked||!activeItems().length;
  $('#share-button').disabled=!token||!state;
  $$('.wish-row input,.wish-actions button,.redeem-button').forEach(node=>{node.disabled=locked;});
  $('#spin-button>span:first-of-type').textContent=spinning?'小幸运正在赶来…':busy?'正在收好心愿…':'转出小惊喜';
}
function drawWheel(items=activeItems()) {
  const signature=JSON.stringify(items.map(({id,title,emoji})=>({id,title,emoji})));
  if(signature!==wheelSignature) {
    wheelSignature=signature; angle=0;
    const svg=$('#wheel');svg.style.transition='none';svg.style.transform='rotate(0deg)';renderWheel(svg,items);
    requestAnimationFrame(()=>{svg.style.transition='';});
  }
  const count=items.length;
  $('#wheel').setAttribute('aria-label',count?`惊喜转盘，${count} 项：${items.map(item=>item.title).join('、')}`:'空转盘，请先勾选心愿');
  $('#wheel-description').textContent=count?`已放入 ${count} 份小惊喜 · 每份机会都一样`:'先在清单里，挑几份你喜欢的小惊喜吧';
  const probability=count?new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(100/count):0;
  $('#fairness-text').textContent=count?`每份概率 ${probability}% · 每次独立，公平随机`:'每份喜欢，都值得同样的幸运';
}
function renderItems() {
  const items=visibleItems();
  const container=$('#item-list');
  if(!items.length) {
    container.innerHTML=`<div class="no-items"><span aria-hidden="true">${search?'⌕':'♡'}</span><p>${search?'没有找到这份小心愿':'这个小口袋还是空的'}</p><small>${search?'试试换个关键词吧':'把你们喜欢的事，慢慢收藏进来。'}</small>${search?'':'<button class="text-button" id="empty-add">＋ 添加第一份心愿</button>'}</div>`;
    $('#empty-add')?.addEventListener('click',()=>openItem());
  } else {
    container.innerHTML=items.map(item=>`<div class="wish-row ${item.selected?'is-selected':''}" data-id="${escape(item.id)}"><label class="wish-row-label"><input type="checkbox" ${item.selected?'checked':''} data-select="${escape(item.id)}" aria-label="将${escape(item.title)}加入转盘"><span class="wish-emoji" aria-hidden="true">${escape(item.emoji)}</span><span class="wish-details"><span class="wish-title">${escape(item.title)}</span><span class="wish-note">${escape(item.note||categories[item.category])}</span></span></label><div class="wish-actions"><button class="icon-button" data-edit="${escape(item.id)}" aria-label="编辑${escape(item.title)}">${icon('edit')}</button><button class="icon-button" data-delete="${escape(item.id)}" aria-label="删除${escape(item.title)}">${icon('trash')}</button></div></div>`).join('');
  }
  const allSelected=items.length>0&&items.every(item=>item.selected);
  $('#select-all').textContent=allSelected?'取消本页勾选':'全选';
  $('#total-count').textContent=state.items.length;
  $('#selected-count').textContent=activeItems().length;
  updateControls();
}
const dateFormatter=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function renderHistory() {
  const history=state.history;
  $('#history-more').hidden=history.length<=3;
  $('#history-more').innerHTML=showAllHistory?'收起记录 ↑':'查看全部 ↗';
  if(!history.length) return;
  $('#history-list').innerHTML=(showAllHistory?history:history.slice(0,3)).map(entry=>`<article class="memory-card"><span class="memory-emoji" aria-hidden="true">${escape(entry.item.emoji)}</span><div class="memory-content"><h3 title="${escape(entry.item.title)}">${escape(entry.item.title)}</h3><time class="memory-time" datetime="${escape(entry.at)}">${dateFormatter.format(new Date(entry.at))} 的小幸运</time></div><button class="redeem-button ${entry.redeemed?'redeemed':''}" data-redeem="${escape(entry.id)}" aria-label="${entry.redeemed?'撤销兑现':'标记已兑现'}：${escape(entry.item.title)}" aria-pressed="${entry.redeemed}">${icon(entry.redeemed?'check':'heart')}${entry.redeemed?'已兑现':'待兑现'}</button></article>`).join('');
}
function render() {if(!state)return;drawWheel();renderItems();renderHistory();updateControls();}
async function refresh(force=false) {
  if(!token||(!force&&(busy||spinning||document.hidden||$('dialog[open]'))))return;
  try {
    const next=await api('/api/state');
    if(shouldApplyRemoteState(state?.revision??-1,next.revision,{locked:busy||spinning||Boolean($('dialog[open]')),force})) {state=next;render();}
  }
  catch(error){setConnection(false,error.message);}
}
async function mutate(action,revision=state.revision) {
  if(busy||spinning) return false;
  busy=true; updateControls();
  try {state=await api('/api/actions',{revision,action});render();return true;}
  catch(error) {
    if(error.status===409) await refresh(true);
    if(error.network) {setConnection(false,error.message);await refresh(true);}
    throw error;
  } finally {busy=false;updateControls();}
}
function failure(error){toast(error.message);}
function openItem(id=null) {
  if(busy||spinning||!state)return;
  const item=state.items.find(item=>item.id===id);
  editingId=item?.id||null;editingRevision=state.revision;
  $('#item-form').reset();$('#item-error').textContent='';
  $('#item-dialog-title').textContent=item?'好好记住这份喜欢':'再收藏一份小美好';
  $('#item-title').value=item?.title||'';$('#item-note').value=item?.note||'';
  const chosen=item?.category||(category==='all'?'likes':category);
  $(`#item-form input[name=category][value=${chosen}]`).checked=true;
  $('#item-form input[name=selected]').checked=item?.selected??true;
  selectedEmoji=item?.emoji||'🎁';renderEmojis();
  $('#item-dialog').showModal();$('#item-title').focus();
}
function renderEmojis() {
  const choices=emojiChoices.includes(selectedEmoji)?emojiChoices:[selectedEmoji,...emojiChoices];
  $('#emoji-options').innerHTML=choices.map(emoji=>`<button type="button" class="emoji-pick" data-emoji="${escape(emoji)}" aria-label="选择图标 ${escape(emoji)}" aria-pressed="${emoji===selectedEmoji}">${escape(emoji)}</button>`).join('');
}
$('#emoji-options').addEventListener('click',event=>{const node=event.target.closest('[data-emoji]');if(node){selectedEmoji=node.dataset.emoji;renderEmojis();}});
$('#item-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);
  const item={title:data.get('title'),note:data.get('note'),category:data.get('category'),emoji:selectedEmoji,selected:data.has('selected')};
  $('#save-item').disabled=true;$('#item-error').textContent='';
  try {
    const saved=await mutate(editingId?{type:'edit',id:editingId,item}:{type:'add',item},editingRevision);
    if(saved){$('#item-dialog').close();toast(editingId?'这份喜欢，记好啦':'又收藏了一份小美好 ♡');}
  } catch(error){$('#item-error').textContent=error.message;editingRevision=state.revision;}
  finally{$('#save-item').disabled=false;}
});
$('#add-button').addEventListener('click',()=>openItem());
$('#item-list').addEventListener('change',async event=>{
  const id=event.target.dataset.select;if(!id)return;
  const ids=new Set(activeItems().map(item=>item.id));
  if(event.target.checked)ids.add(id);else ids.delete(id);
  try{await mutate({type:'select',ids:[...ids]});}catch(error){renderItems();failure(error);}
});
$('#item-list').addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit]');if(edit)return openItem(edit.dataset.edit);
  const remove=event.target.closest('[data-delete]');
  if(remove&&!busy&&!spinning){deletingId=remove.dataset.delete;$('#delete-description').textContent=state.items.find(item=>item.id===deletingId)?.title;$('#delete-dialog').showModal();}
});
$('#confirm-delete').addEventListener('click',async()=>{
  $('#confirm-delete').disabled=true;
  try{if(await mutate({type:'delete',id:deletingId})){$('#delete-dialog').close();toast('已从心愿清单移除');}}
  catch(error){failure(error);}finally{$('#confirm-delete').disabled=false;}
});
$('#select-all').addEventListener('click',async()=>{
  const items=visibleItems();const remove=items.every(item=>item.selected);const ids=new Set(activeItems().map(item=>item.id));
  items.forEach(item=>remove?ids.delete(item.id):ids.add(item.id));
  try{await mutate({type:'select',ids:[...ids]});}catch(error){failure(error);}
});
$('#clear-selection').addEventListener('click',async()=>{try{await mutate({type:'select',ids:[]});}catch(error){failure(error);}});
function switchCategory(button){
  category=button.dataset.category;
  $$('.category-tabs button').forEach(node=>{const active=node===button;node.setAttribute('aria-selected',String(active));node.tabIndex=active?0:-1;});
  $('#item-list').setAttribute('aria-labelledby',button.id);$('#item-list').scrollTop=0;if(state)renderItems();
}
$$('.category-tabs button').forEach(button=>{
  button.addEventListener('click',()=>switchCategory(button));
  button.addEventListener('keydown',event=>{
    const buttons=$$('.category-tabs button'),index=buttons.indexOf(button);let next;
    if(event.key==='ArrowRight')next=(index+1)%buttons.length;
    if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
    if(next!=null){event.preventDefault();switchCategory(buttons[next]);buttons[next].focus();}
  });
});
$('#search').addEventListener('input',event=>{search=event.target.value.trim().toLowerCase();if(state)renderItems();});
$$('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}}));

function playTone(frequency=600,duration=.035,volume=.035) {
  if(!sound||!audioContext)return;
  try{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+duration);}catch{/* Sound must never interrupt a draw. */}
}
$('#sound-button').addEventListener('click',()=>{
  sound=!sound;
  if(sound){try{audioContext||=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{sound=false;toast('这个浏览器暂时无法播放音效');}}
  $('#sound-button').setAttribute('aria-pressed',String(sound));$('#sound-button').setAttribute('aria-label',sound?'关闭转盘音效':'开启转盘音效');$('#sound-button span').textContent=sound?'音效开':'音效关';playTone();
});
function celebrate() {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const colors=['#c57688','#e0b875','#c2caad','#e6b8b8','#e9d4ae'];
  $('#confetti').replaceChildren();
  for(let i=0;i<65;i++) {const part=document.createElement('i');part.className='confetti-piece';part.style.cssText=`--left:${Math.random()*100}%;--color:${colors[i%colors.length]};--duration:${2+Math.random()*2}s;--delay:${Math.random()*.5}s;--rotation:${Math.random()*360}deg;--drift:${Math.random()*180-90}px;--spin:${Math.random()*800-400}deg`;$('#confetti').append(part);}
  setTimeout(()=>$('#confetti').replaceChildren(),5000);
}
async function spin() {
  if(busy||spinning||!activeItems().length)return;
  spinning=true;updateControls();$('#workspace').classList.add('is-spinning');
  let drawn=false;
  try {
    const data=await api('/api/spins',{revision:state.revision,requestId:crypto.randomUUID()},true);
    drawn=true;state=data.state;drawWheel(data.result.items);
    // Wait one frame so a changed selection snapshot has painted before its transform animates.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    angle=spinTarget(angle,data.result.index,data.result.count);
    $('#wheel').style.transform=`rotate(${angle}deg)`;
    $('#wheel-description').textContent='让心愿转一圈，让幸福靠近一点…';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced)tickTimer=setInterval(()=>playTone(420+Math.random()*240),150);
    await new Promise(resolve=>setTimeout(resolve,reduced?90:5350));
    clearInterval(tickTimer);
    $('#result-title').textContent=data.result.item.title;$('#result-note').textContent=data.result.item.note||'这份小幸福，属于今天的你。';$('#result-emoji').textContent=data.result.item.emoji;
    $('#result-dialog').showModal();celebrate();
    [523,659,784].forEach((tone,index)=>setTimeout(()=>playTone(tone,.22,.045),index*140));
  } catch(error) {
    clearInterval(tickTimer);failure(error);
    if(error.network)setConnection(false,error.message);
    if(error.status===409||error.network||drawn)await refresh(true);
  } finally {
    spinning=false;$('#workspace').classList.remove('is-spinning');render();
  }
}
$('#spin-button').addEventListener('click',spin);$('#center-spin').addEventListener('click',spin);
$('#result-done').addEventListener('click',()=>$('#result-dialog').close());
$('#history-more').addEventListener('click',()=>{showAllHistory=!showAllHistory;renderHistory();updateControls();});
$('#history-list').addEventListener('click',async event=>{const node=event.target.closest('[data-redeem]');if(!node)return;try{if(await mutate({type:'redeem',id:node.dataset.redeem}))toast('幸福记录已更新 ♡');}catch(error){failure(error);}});
$('#share-button').addEventListener('click',()=>{
  $('#share-url').value=location.href;
  const local=['localhost','127.0.0.1','::1'].includes(location.hostname);
  $('#local-share-hint').textContent=local?'当前是本机预览地址，只能在这台电脑打开。联网部署后，同一个专属链接才能在各自手机上使用。':'分享此完整链接，对方就能打开同一份心愿清单。';
  $('#share-dialog').showModal();
});
$('#copy-link').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#share-url').value);toast('链接已复制，记得只分享给 TA ♡');}
  catch{$('#share-url').focus();$('#share-url').select();toast('请长按或按 Ctrl/Cmd+C 复制链接');}
});
async function connect() {
  if(connecting)return;connecting=true;
  try {
    const params=new URLSearchParams(location.hash.slice(1));token=params.get('r')||'';
    if(!token){try{token=localStorage.getItem('love-spin-room')||'';}catch{/* Browsing without local storage still works through the URL. */}}
    if(token)state=await api('/api/state');
    else{const created=await api('/api/rooms',{});token=created.token;state=created.state;}
    history.replaceState(null,'',`#r=${encodeURIComponent(token)}`);
    try{localStorage.setItem('love-spin-room',token);}catch{/* URL remains the source of truth. */}
    render();
  } catch(error) {
    setConnection(false,error.message);
    if(!state)$('#item-list').innerHTML='<div class="no-items"><span aria-hidden="true">♡</span><p>小铺暂时没有连上</p><small>请检查链接，或点击下方重新连接。</small></div>';
    updateControls();
  } finally{connecting=false;}
}
$('#retry-button').addEventListener('click',()=>state?refresh(true):connect());
window.addEventListener('hashchange',()=>location.reload());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>refresh(),4000);
connect();

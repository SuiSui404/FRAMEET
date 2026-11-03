(()=>{
 if(document.getElementById('frame-notes-host'))return;
 const host=document.createElement('div');host.id='frame-notes-host';host.hidden=true;
 host.style.cssText='position:fixed;right:16px;bottom:24px;z-index:2147483646;max-width:calc(100vw - 32px)';
 const root=host.attachShadow({mode:'closed'});
 root.innerHTML=`<style>
 *{box-sizing:border-box}.bar{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:7px;border:1px solid #ffffff30;border-radius:14px;background:#171719f5;box-shadow:0 8px 30px #0007;color:#fff;font:12px system-ui}
 button,select{border:0;border-radius:8px;padding:9px;background:#ffffff13;color:#eee;font:12px system-ui;cursor:pointer}#shot{background:#ffcfb7;color:#261e19;font-weight:600}select{max-width:150px}option{background:#202023}button:disabled{opacity:.5}.label{font-size:10px;color:#cbbbad;margin-left:4px}.tip{position:absolute;right:0;bottom:65px;width:290px;max-width:85vw;background:#202023;color:#fff;border:1px solid #ffffff30;border-radius:12px;padding:12px;display:none;font:12px/1.7 system-ui}
 </style><div class="tip" role="status"></div><div class="bar"><span class="label">保存到</span><select id="projects" aria-label="截图保存到哪个壁纸项目"></select><button id="new" title="新建并切换壁纸项目">＋</button><button id="shot">截图</button><button id="studio">制作壁纸 ↗</button><button id="close" title="关闭本页工具；点击浏览器插件图标可重新启用" aria-label="关闭本页截图工具">✕</button></div>`;
 document.documentElement.append(host);
 const shot=root.querySelector('#shot'),tip=root.querySelector('.tip'),projects=root.querySelector('#projects');let busy=false,timer,enabled=false;
 const ask=message=>chrome.runtime.sendMessage(message);
 function toast(text){tip.textContent=text;tip.style.display='block';clearTimeout(timer);timer=setTimeout(()=>tip.style.display='none',6500)}
 async function context(){const result=await ask({type:'GET_PROJECTS'});if(!result.ok)throw new Error(result.error);projects.replaceChildren(...result.projects.map(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.name;return option}));projects.value=result.activeId;return result}
 function candidates(){
  const found=[];
  function scan(scope,ox=0,oy=0,depth=0){
   if(depth>6)return;
   for(const v of scope.querySelectorAll('video')){const r=v.getBoundingClientRect();if(v.videoWidth&&v.readyState>=2&&r.width>20&&r.height>20&&getComputedStyle(v).visibility!=='hidden')found.push({v,rect:{x:r.x+ox,y:r.y+oy,w:r.width,h:r.height}})}
   for(const el of scope.querySelectorAll('*')){if(el.shadowRoot)scan(el.shadowRoot,ox,oy,depth+1)}
   for(const iframe of scope.querySelectorAll('iframe')){try{if(iframe.contentDocument){const r=iframe.getBoundingClientRect();scan(iframe.contentDocument,ox+r.x+iframe.clientLeft,oy+r.y+iframe.clientTop,depth+1)}}catch{}}
  }
  scan(document);return found.filter(({rect:r})=>r.x+r.w>0&&r.y+r.h>0&&r.x<innerWidth&&r.y<innerHeight).sort((a,b)=>b.rect.w*b.rect.h-a.rect.w*a.rect.h);
 }
 function playerRect(candidate){
  const {v,rect}=candidate,local=v.getBoundingClientRect(),container=v.closest('.bpx-player-container,.bilibili-player-video-wrap,#movie_player,.html5-video-player,.video-js,.plyr,.player-container,[data-player]')||v.parentElement;
  if(!container||/^(BODY|HTML)$/.test(container.tagName))return {...rect};const r=container.getBoundingClientRect();
  if(r.width<local.width*.95||r.height<local.height*.95||r.width>local.width*1.5||r.height>local.height*1.7)return {...rect};
  return {x:r.x+rect.x-local.x,y:r.y+rect.y-local.y,w:r.width,h:r.height};
 }
 function selectRegion(){return new Promise((resolve,reject)=>{
  const overlay=document.createElement('div');overlay.id='frame-notes-region-overlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;cursor:crosshair;touch-action:none';
  const shadow=overlay.attachShadow({mode:'closed'});shadow.innerHTML='<style>*{box-sizing:border-box}.box{position:absolute;border:2px solid #ffd0b7;box-shadow:0 0 0 9999px #0009;pointer-events:none}.help{position:absolute;left:50%;top:20px;transform:translateX(-50%);background:#171719;color:#ffd0b7;font:14px system-ui;padding:12px 20px;border-radius:10px;pointer-events:none;white-space:nowrap}</style><div class="box"></div><div class="help">拖动框选视频画面 · Esc 取消</div>';
  document.documentElement.append(overlay);const box=shadow.querySelector('.box');let start=null,rect=null;
  const cleanup=()=>{overlay.remove();document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',cancel)};
  const cancel=()=>{cleanup();reject(new Error('已取消框选截图'))};
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel()}};
  document.addEventListener('keydown',escape,true);window.addEventListener('resize',cancel,{once:true});
  overlay.onpointerdown=e=>{e.preventDefault();start={x:e.clientX,y:e.clientY};overlay.setPointerCapture(e.pointerId)};
  overlay.onpointermove=e=>{if(!start)return;const x=Math.max(0,Math.min(innerWidth,e.clientX)),y=Math.max(0,Math.min(innerHeight,e.clientY));rect={x:Math.min(start.x,x),y:Math.min(start.y,y),w:Math.abs(x-start.x),h:Math.abs(y-start.y)};box.style.cssText=`left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`};
  overlay.onpointerup=()=>{cleanup();if(!rect||rect.w<20||rect.h<20)reject(new Error('选区太小，请重新框选视频画面'));else resolve(rect)};
 })}
 async function visibleCrop(r){
  if(r.x<0||r.y<0||r.x+r.w>innerWidth+1||r.y+r.h>innerHeight+1)throw new Error('请让整个播放器显示在窗口内，或使用「框选」截取可见部分。');
  host.style.visibility='hidden';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const response=await ask({type:'CAPTURE_VISIBLE'});if(!response.ok)throw new Error(response.error);
  const img=new Image();img.src=response.dataUrl;await img.decode();const sx=img.width/innerWidth,sy=img.height/innerHeight;
  const c=document.createElement('canvas');c.width=Math.round(r.w*sx);c.height=Math.round(r.h*sy);c.getContext('2d').drawImage(img,r.x*sx,r.y*sy,r.w*sx,r.h*sy,0,0,c.width,c.height);
  return {dataUrl:c.toDataURL('image/jpeg',.95),width:c.width,height:c.height};
 }
 async function capture(mode='auto'){
  if(busy)return {ok:false,error:'正在截图，请稍候。'};busy=true;shot.disabled=true;
  try{
   // Freeze the destination when capture starts, even if another editor switches projects.
   const state=await context(),projectId=state.activeId;
   let frame;
   if(mode==='region'){host.style.visibility='hidden';const rect=await selectRegion();frame={...await visibleCrop(rect),method:'框选截图（可含字幕及弹幕）'}}
   else{
    const candidate=candidates()[0];if(!candidate)throw new Error('未找到可读取的视频。嵌入式播放器可使用「框选」，或在 浏览器复制视频帧后到壁纸画布粘贴。');
    const {v,rect}=candidate;const time=v.currentTime;
    if(mode!=='visible'&&!v.mediaKeys){try{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);frame={dataUrl:c.toDataURL('image/jpeg',.95),width:c.width,height:c.height,method:'视频原始帧',time}}catch{}}
    if(!frame){const aspect=v.videoWidth/v.videoHeight,fit=getComputedStyle(v).objectFit;const r=mode==='visible'?playerRect(candidate):{...rect};if(mode!=='visible'&&(fit==='contain'||fit==='scale-down')){if(r.w/r.h>aspect){const w=r.h*aspect;r.x+=(r.w-w)/2;r.w=w}else{const h=r.w/aspect;r.y+=(r.h-h)/2;r.h=h}}frame={...await visibleCrop(r),method:'播放器截图（含页面叠加信息）',time}}
   }
   const result=await ask({type:'SAVE_FRAME',frame:{...frame,title:document.title},projectId});if(!result.ok)throw new Error(result.error);
   toast(`已保存至「${result.projectName}」 · ${frame.width}×${frame.height}`);return {ok:true,projectName:result.projectName};
  }catch(error){const message=error.message||'截图失败，请重新点击插件图标后重试。';toast(message);return {ok:false,error:message}}
  finally{host.style.visibility='';busy=false;shot.disabled=false}
 }
 shot.onclick=()=>capture();
 root.querySelector('#studio').onclick=()=>ask({type:'OPEN_STUDIO'}).catch(()=>toast('插件已更新，请重新点击工具栏图标。'));
 root.querySelector('#close').onclick=()=>{enabled=false;host.hidden=true};
 projects.onchange=async()=>{try{const res=await ask({type:'SET_PROJECT',id:projects.value});if(!res.ok)throw new Error(res.error);await context()}catch(e){toast(e.message)}};
 root.querySelector('#new').onclick=async()=>{try{const res=await ask({type:'NEW_PROJECT'});if(!res.ok)throw new Error(res.error);await context();toast(`已新建「${res.project.name}」，之后的截图将保存到这里。`)}catch(e){toast(e.message)}};
 chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg.type==='SET_ENABLED'){enabled=msg.enabled;host.hidden=!enabled;context().then(()=>respond({ok:true,enabled})).catch(e=>respond({ok:false,error:e.message}));return true}
  if(msg.type==='CAPTURE_FRAME'){capture(msg.mode||(msg.forceVisible?'visible':'auto')).then(respond);return true}
  if(msg.type==='PROJECTS_CHANGED'){context().catch(()=>{});return false}
 });
})();

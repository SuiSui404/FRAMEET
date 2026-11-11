(()=>{
 const VERSION='0.9.5',previous=globalThis.__frameetController;if(previous?.version===VERSION)return;previous?.dispose();document.getElementById('frame-notes-host')?.remove();
 const host=document.createElement('div');host.id='frame-notes-host';host.hidden=true;
 host.setAttribute('popover','manual');
 host.style.cssText='position:fixed;inset:auto;right:16px;bottom:24px;margin:0;padding:0;border:0;background:transparent;overflow:visible;z-index:2147483646;max-width:calc(100vw - 24px);width:max-content';
 const root=host.attachShadow({mode:'closed'});
 root.innerHTML=`<style>
 *{box-sizing:border-box}.bar{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px;border:1px solid #ffffff30;border-radius:12px;background:#171719f5;box-shadow:0 8px 30px #0007;color:#fff;font:12px system-ui;width:100%}
 button,select{border:0;border-radius:7px;padding:7px 8px;background:#ffffff13;color:#eee;font:12px system-ui;cursor:pointer;white-space:nowrap;flex-shrink:0}
 #shot{background:#ffcfb7;color:#261e19;font-weight:600}#dragHandle{padding:7px 5px}#projects{width:100px;min-width:76px;flex:0 1 100px;text-overflow:ellipsis}#new,#close{padding:7px 6px}option{background:#202023}button:disabled{opacity:.5}
 .tip{position:absolute;box-sizing:border-box;left:0;bottom:calc(100% + 10px);width:100%;overflow-wrap:anywhere;background:#202023;color:#fff;border:1px solid #ffffff30;border-radius:10px;padding:10px;display:none;font:12px/1.7 system-ui}
 #resizeHandle{position:absolute;right:0;bottom:0;width:12px;height:12px;cursor:ew-resize;touch-action:none;border-bottom:2px solid #ffffff60;border-right:2px solid #ffffff60;border-radius:0 0 9px 0}
 </style><div class="tip" role="status"></div><div class="bar"><button id="dragHandle" aria-label="拖动工具栏" title="拖动调整位置">⠿</button><select id="projects" aria-label="截图保存到哪个壁纸项目"></select><button id="new" title="新建并切换壁纸项目">＋</button><button id="shot">截图</button><button id="studio">制作壁纸 ↗</button><button id="close" title="关闭本页工具；点击浏览器插件图标可重新启用" aria-label="关闭本页截图工具">✕</button><span id="resizeHandle" title="拖动调整宽度" aria-label="调整工具栏宽度"></span></div>`;
 document.documentElement.append(host);for(const type of ['pointerdown','pointerup','click','dblclick','keydown','keyup'])host.addEventListener(type,e=>e.stopPropagation());
 function showToolbar(){const full=document.fullscreenElement,parent=full&&!['VIDEO','IFRAME'].includes(full.tagName)?full:document.documentElement;if(host.parentElement!==parent)parent.append(host);host.hidden=false;if(host.showPopover&&!host.matches(':popover-open'))host.showPopover()}
 function hideToolbar(){if(host.hidePopover&&host.matches(':popover-open'))host.hidePopover();host.hidden=true}
 function initialSize(){host.style.width=Math.min(340,Math.max(200,innerWidth-32))+'px';const items=[...root.querySelectorAll('.bar > button,.bar > select')],natural=items.reduce((n,el)=>n+el.getBoundingClientRect().width,0)+4*(items.length-1)+14;host.style.width=Math.min(Math.ceil(natural),innerWidth-32)+'px';host.style.left='auto';host.style.top='auto';host.style.right='16px';host.style.bottom='24px'}
 function fullscreenChanged(){if(!enabled)return;if(host.hidePopover&&host.matches(':popover-open'))host.hidePopover();showToolbar();const r=host.getBoundingClientRect();clampPosition(r.left,r.top)}
 document.addEventListener('fullscreenchange',fullscreenChanged);
 const handle=root.querySelector('#dragHandle');handle.style.cssText='cursor:grab;touch-action:none';let drag=null;
 function clampPosition(x,y){const r=host.getBoundingClientRect();host.style.right='auto';host.style.bottom='auto';host.style.left=Math.max(0,Math.min(innerWidth-r.width,x))+'px';host.style.top=Math.max(0,Math.min(innerHeight-r.height,y))+'px'}
 handle.onpointerdown=e=>{if(e.button!==0)return;const r=host.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId);e.preventDefault()};
 handle.onpointermove=e=>{if(drag)clampPosition(e.clientX-drag.x,e.clientY-drag.y)};
 handle.onpointerup=handle.onpointercancel=()=>{drag=null};
 const windowResized=()=>{if(host.hidden)return;const r=host.getBoundingClientRect();clampPosition(r.left,r.top)};window.addEventListener('resize',windowResized);
 const resize=root.querySelector('#resizeHandle');let resizeStart=null;
 resize.onpointerdown=e=>{resizeStart={x:e.clientX,w:host.getBoundingClientRect().width};resize.setPointerCapture(e.pointerId);e.preventDefault()};
 resize.onpointermove=e=>{if(!resizeStart)return;const r=host.getBoundingClientRect();host.style.width=Math.min(innerWidth-24,Math.max(200,resizeStart.w+e.clientX-resizeStart.x))+'px';clampPosition(r.left,r.top)};
 resize.onpointerup=resize.onpointercancel=()=>resizeStart=null;
 const barResize=new ResizeObserver(()=>{const r=host.getBoundingClientRect();if(!host.hidden&&host.style.left)clampPosition(r.left,r.top)});barResize.observe(host);
 // Native VIDEO/IFRAME fullscreen paints top-layer popovers but sends hits to
 // the replaced element. Route trusted pointer gestures by the visible control
 // rectangles; ordinary player/container fullscreen keeps native DOM events.
 let fsGesture=null,suppressFullscreenClick=false;
 const replacedFullscreen=()=>enabled&&['VIDEO','IFRAME'].includes(document.fullscreenElement?.tagName)&&!host.hidden&&host.style.visibility!=='hidden';
 function controlAt(e){return [...root.querySelectorAll('#projectMenu button, .bar > button, #projects, #resizeHandle')].reverse().find(el=>{const r=el.getBoundingClientRect();return r.width&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom})}
 function projectMenu(){let menu=root.querySelector('#projectMenu');if(menu){menu.remove();return}menu=document.createElement('div');menu.id='projectMenu';menu.style.cssText='position:absolute;right:0;bottom:calc(100% + 6px);padding:5px;background:#202023;border:1px solid #ffffff40;border-radius:8px;max-height:180px;overflow:auto;min-width:160px';for(const option of projects.options){const button=document.createElement('button');button.style.cssText='display:block;width:100%;margin:2px 0;text-align:left';button.textContent=option.textContent;button.onclick=()=>{projects.value=option.value;projects.dispatchEvent(new Event('change'));menu.remove()};menu.append(button)}root.append(menu)}
 function fullPointerDown(e){if(!e.isTrusted||!replacedFullscreen())return;const target=controlAt(e);if(!target)return;e.preventDefault();e.stopImmediatePropagation();const r=host.getBoundingClientRect();fsGesture={target,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width};suppressFullscreenClick=true}
 function fullPointerMove(e){if(!e.isTrusted||!fsGesture)return;const d=fsGesture;e.preventDefault();e.stopImmediatePropagation();if(d.target===handle)clampPosition(d.left+e.clientX-d.x,d.top+e.clientY-d.y);else if(d.target===resize){host.style.width=Math.min(innerWidth-24,Math.max(200,d.width+e.clientX-d.x))+'px';clampPosition(d.left,d.top)}}
 function fullPointerUp(e){if(!e.isTrusted||!fsGesture)return;const d=fsGesture;fsGesture=null;e.preventDefault();e.stopImmediatePropagation();if(d.target===handle||d.target===resize)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>8)return;if(d.target===projects)projectMenu();else if(!d.target.disabled)d.target.click()}
 function fullClick(e){if(e.isTrusted&&suppressFullscreenClick){suppressFullscreenClick=false;e.preventDefault();e.stopImmediatePropagation()}}
 window.addEventListener('pointerdown',fullPointerDown,true);window.addEventListener('pointermove',fullPointerMove,true);window.addEventListener('pointerup',fullPointerUp,true);window.addEventListener('click',fullClick,true);
 const shot=root.querySelector('#shot'),tip=root.querySelector('.tip'),projects=root.querySelector('#projects');let busy=false,timer,enabled=false,closed=false;
 const ask=message=>chrome.runtime.sendMessage(message);
 function toast(text){tip.textContent=text;tip.style.display='block';tip.style.bottom='calc(100% + 10px)';tip.style.top='auto';if(host.getBoundingClientRect().top<tip.offsetHeight+10){tip.style.bottom='auto';tip.style.top='calc(100% + 10px)'}clearTimeout(timer);timer=setTimeout(()=>tip.style.display='none',6500)}
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
  const overlay=document.createElement('div');overlay.id='frame-notes-region-overlay';overlay.setAttribute('popover','manual');overlay.style.cssText='position:fixed;margin:0;padding:0;border:0;background:transparent;width:100vw;height:100vh;inset:0;z-index:2147483647;cursor:crosshair;touch-action:none';
  const shadow=overlay.attachShadow({mode:'closed'});shadow.innerHTML='<style>*{box-sizing:border-box}.box{position:absolute;border:2px solid #ffd0b7;box-shadow:0 0 0 9999px #0009;pointer-events:none}.help{position:absolute;left:50%;top:20px;transform:translateX(-50%);background:#171719;color:#ffd0b7;font:14px system-ui;padding:12px 20px;border-radius:10px;pointer-events:none;white-space:nowrap}</style><div class="box"></div><div class="help">拖动框选视频画面 · Esc 取消</div>';
  const full=document.fullscreenElement;((full&&!['VIDEO','IFRAME'].includes(full.tagName))?full:document.documentElement).append(overlay);overlay.showPopover?.();const box=shadow.querySelector('.box');let start=null,rect=null;
  const cleanup=()=>{overlay.remove();document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',cancel);for(const [type,fn] of regionHandlers)window.removeEventListener(type,fn,true)};
  const cancel=()=>{cleanup();reject(new Error('已取消框选截图'))};
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel()}};
  document.addEventListener('keydown',escape,true);window.addEventListener('resize',cancel,{once:true});
  overlay.onpointerdown=e=>{e.preventDefault();start={x:e.clientX,y:e.clientY};try{overlay.setPointerCapture(e.pointerId)}catch{}};
  overlay.onpointermove=e=>{if(!start)return;const x=Math.max(0,Math.min(innerWidth,e.clientX)),y=Math.max(0,Math.min(innerHeight,e.clientY));rect={x:Math.min(start.x,x),y:Math.min(start.y,y),w:Math.abs(x-start.x),h:Math.abs(y-start.y)};box.style.cssText=`left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`};
  overlay.onpointerup=()=>{cleanup();if(!rect||rect.w<20||rect.h<20)reject(new Error('选区太小，请重新框选视频画面'));else resolve(rect)};
  const regionHandlers=[];if(['VIDEO','IFRAME'].includes(document.fullscreenElement?.tagName))for(const type of ['pointerdown','pointermove','pointerup']){const fn=e=>{if(!e.isTrusted)return;e.preventDefault();e.stopImmediatePropagation();if(type==='pointerdown')suppressFullscreenClick=true;overlay['on'+type](e)};regionHandlers.push([type,fn]);window.addEventListener(type,fn,true)}
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
 root.querySelector('#close').onclick=()=>{closed=true;enabled=false;hideToolbar()};
 projects.onchange=async()=>{try{const res=await ask({type:'SET_PROJECT',id:projects.value});if(!res.ok)throw new Error(res.error);await context()}catch(e){toast(e.message)}};
 root.querySelector('#new').onclick=async()=>{try{const res=await ask({type:'NEW_PROJECT'});if(!res.ok)throw new Error(res.error);await context();toast(`已新建「${res.project.name}」，之后的截图将保存到这里。`)}catch(e){toast(e.message)}};
 const onMessage=(msg,sender,respond)=>{
  if(msg.type==='PING'){respond({ok:true,version:VERSION});return false}
  if(msg.type==='SET_ENABLED'){enabled=msg.enabled;closed=!enabled;if(enabled){showToolbar();initialSize()}else hideToolbar();context().then(()=>respond({ok:true,enabled})).catch(e=>respond({ok:false,error:e.message}));return true}
  if(msg.type==='CAPTURE_FRAME'){capture(msg.mode||(msg.forceVisible?'visible':'auto')).then(respond);return true}
  if(msg.type==='PROJECTS_CHANGED'){context().catch(()=>{});return false}
 };chrome.runtime.onMessage.addListener(onMessage);
 let discoveryTimer;const discover=()=>{if(closed||enabled||!document.querySelector('video,iframe'))return;const video=document.querySelector('video');if(!video)return;enabled=true;showToolbar();initialSize();context().catch(()=>{})};const observer=new MutationObserver(()=>{clearTimeout(discoveryTimer);discoveryTimer=setTimeout(discover,150)});observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('loadeddata',discover,true);discover();
 globalThis.__frameetController={version:VERSION,dispose(){clearTimeout(timer);clearTimeout(discoveryTimer);observer.disconnect();barResize.disconnect();chrome.runtime.onMessage.removeListener(onMessage);document.removeEventListener('fullscreenchange',fullscreenChanged);document.removeEventListener('loadeddata',discover,true);window.removeEventListener('resize',windowResized);window.removeEventListener('pointerdown',fullPointerDown,true);window.removeEventListener('pointermove',fullPointerMove,true);window.removeEventListener('pointerup',fullPointerUp,true);window.removeEventListener('click',fullClick,true);hideToolbar();host.remove()}};
})();

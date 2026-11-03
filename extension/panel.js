import {getFrames,getActiveProjectId,setFramesDeleted} from './lib/store.js';
import {projectPicker} from './lib/projects-ui.js';
const $=s=>document.querySelector(s),ask=msg=>chrome.runtime.sendMessage(msg),announce=()=>ask({type:'DATA_MUTATED'}).catch(()=>{});
let version=0,currentId=null,photos=[],libraryView='current',mutationQueue=Promise.resolve(),pending=0;
const picker=projectPicker($('#projectPicker'),{beforeChange:()=>mutationQueue,onChange:async()=>{libraryView='current';await refresh();announce();$('#status').textContent='已切换壁纸，之后的截图将保存到当前项目。'}});
function paint(){
 const active=photos.filter(f=>!f.deletedAt),deleted=photos.filter(f=>f.deletedAt),list=libraryView==='deleted'?deleted:active;
 $('#count').textContent=active.length;$('#currentCount').textContent=active.length;$('#deletedCount').textContent=deleted.length;
 document.querySelectorAll('[data-library]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.library===libraryView)));
 const grid=$('#frames'),scroll=grid.scrollTop;grid.replaceChildren(...list.map(f=>{const tile=document.createElement('div');tile.className='panel-photo';tile.dataset.id=f.id;const img=new Image();img.src=f.thumbnailUrl||f.dataUrl;img.alt=f.title||'视频截图';img.loading='lazy';const button=document.createElement('button');button.className='photo-action';button.dataset.id=f.id;button.textContent=f.deletedAt?'↶':'×';button.setAttribute('aria-label',f.deletedAt?'恢复照片':'删除照片');button.title=f.deletedAt?'恢复到当前照片':'移至已删除';button.onclick=()=>changePhoto(f.id,!f.deletedAt);tile.append(img,button);return tile}));grid.scrollTop=scroll;$('#panelEmpty').hidden=!!list.length;$('#panelEmpty').textContent=libraryView==='deleted'?'暂无已删除照片。':'截图后，照片会保存在这里。';
}
function changePhoto(id,deleted){const pid=currentId,photo=photos.find(f=>f.id===id);if(!photo||Boolean(photo.deletedAt)===deleted)return;if(deleted)photo.deletedAt=Date.now();else delete photo.deletedAt;paint();pending++;const task=mutationQueue.catch(()=>{}).then(()=>setFramesDeleted([id],deleted,pid));mutationQueue=task;task.then(()=>{pending--;if(!pending){refresh().catch(e=>$('#status').textContent=e.message);announce()}},e=>{pending--;$('#status').textContent='整理未完成：'+e.message;if(!pending)refresh().catch(()=>{})})}
async function refresh(){const n=++version;await mutationQueue.catch(()=>{});if(pending)return;await picker.refresh();const id=await getActiveProjectId(),list=await getFrames(id,{all:true});if(n!==version)return;if(currentId&&currentId!==id)libraryView='current';currentId=id;photos=list;paint()}
for(const button of document.querySelectorAll('[data-library]'))button.onclick=()=>{libraryView=button.dataset.library;paint()};
async function tab(){const [target]=await chrome.tabs.query({active:true,currentWindow:true});if(!target?.id)throw new Error('请先切到要截图的视频页面');return target}
async function enabled(show){const target=await tab(),result=await ask({type:'ACTIVATE_PAGE',tabId:target.id,enabled:show});if(!result.ok)throw new Error(result.error);return target}
async function capture(mode){$('#capture').disabled=true;try{const target=await tab();$('#status').textContent=mode==='region'?'请在视频页面拖出截图选区…':'正在截图…';let result;try{result=await chrome.tabs.sendMessage(target.id,{type:'CAPTURE_FRAME',mode})}catch{await enabled(true);result=await chrome.tabs.sendMessage(target.id,{type:'CAPTURE_FRAME',mode})}if(!result?.ok)throw new Error(result?.error||'截图失败');libraryView='current';await refresh();$('#status').textContent=`已保存到「${result.projectName}」。`}catch(e){$('#status').textContent=e.message}finally{$('#capture').disabled=false}}
$('#capture').onclick=()=>capture('auto');$('#fallback').onclick=()=>capture('visible');$('#region').onclick=()=>capture('region');$('#open').onclick=()=>ask({type:'OPEN_STUDIO'});
chrome.runtime.onMessage.addListener(m=>{if(m.type==='DATA_CHANGED')refresh().catch(e=>$('#status').textContent=e.message)});
refresh().catch(e=>$('#status').textContent=e.message);

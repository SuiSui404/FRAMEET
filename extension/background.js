import {addFrame,getProjects,getActiveProjectId,getProject,setActiveProject,createProject,getProjectContext} from './lib/store.js';
if(chrome.sidePanel?.setPanelBehavior)chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:false}).catch(console.error);
let queue=Promise.resolve();
async function notify(){chrome.runtime.sendMessage({type:'DATA_CHANGED'}).catch(()=>{});const tabs=await chrome.tabs.query({});for(const tab of tabs)chrome.tabs.sendMessage(tab.id,{type:'PROJECTS_CHANGED'}).catch(()=>{})}
async function activateTab(tabId,show=true){
 try{await chrome.scripting.executeScript({target:{tabId},files:['content.js']});return await chrome.tabs.sendMessage(tabId,{type:'SET_ENABLED',enabled:show})}
 catch{throw new Error('无法访问这个页面。请切到普通视频网页，点击 浏览器工具栏里的插件图标后重试。')}
}
async function openStudio(){const tabs=await chrome.tabs.query({url:chrome.runtime.getURL('studio.html')});if(tabs[0]){await chrome.tabs.update(tabs[0].id,{active:true});await chrome.windows.update(tabs[0].windowId,{focused:true})}else await chrome.tabs.create({url:chrome.runtime.getURL('studio.html')})}
chrome.action.onClicked.addListener(tab=>{
 // Call before awaiting, while the toolbar user gesture is live.
 if(chrome.sidePanel?.open)chrome.sidePanel.open({tabId:tab.id}).catch(console.error);else chrome.tabs.create({url:chrome.runtime.getURL('panel.html')});activateTab(tab.id).catch(console.error);
});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 const handle=async()=>{
  if(msg.type==='GET_PROJECTS')return {ok:true,...await getProjectContext()};
  if(msg.type==='SET_PROJECT'){await setActiveProject(msg.id);await notify();return {ok:true}}
  if(msg.type==='NEW_PROJECT'){const project=await createProject(msg.name);await notify();return {ok:true,project}}
  if(msg.type==='DATA_MUTATED'){await notify();return {ok:true}}
  if(msg.type==='OPEN_STUDIO'){await openStudio();return {ok:true}}
  if(msg.type==='ACTIVATE_PAGE')return activateTab(msg.tabId,msg.enabled!==false);
  if(msg.type==='SAVE_FRAME'&&sender.tab&&/^https?:\/\//.test(sender.url||'')){
   if(!msg.frame?.dataUrl?.startsWith('data:image/')||msg.frame.dataUrl.length>35000000)throw new Error('图片格式无效或图片过大');
   const projectId=msg.projectId;if(!await getProject(projectId))throw new Error('截图目标项目不存在');
   queue=queue.catch(()=>{}).then(async()=>{await addFrame({...msg.frame,url:sender.url,title:msg.frame.title||'视频截图'},projectId)});await queue;await notify();return {ok:true,projectName:(await getProject(projectId)).name};
  }
  if(msg.type==='CAPTURE_VISIBLE'&&sender.tab){
   const [tab]=await chrome.tabs.query({active:true,windowId:sender.tab.windowId});if(tab?.id!==sender.tab.id)throw new Error('请切回正在观看的视频标签页');
   try{return {ok:true,dataUrl:await chrome.tabs.captureVisibleTab(sender.tab.windowId,{format:'png'})}}
   catch(error){throw new Error(`页面截图未成功。请先点击 浏览器工具栏中的插件图标授权当前页。详情：${error.message}`)}
  }
  return {ok:false,error:'未知操作'};
 };
 handle().then(respond).catch(error=>respond({ok:false,error:error.message}));return true;
});
chrome.commands.onCommand.addListener(async command=>{
 if(command!=='capture-frame')return;const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)return;
 try{await activateTab(tab.id);await chrome.tabs.sendMessage(tab.id,{type:'CAPTURE_FRAME'})}catch{chrome.sidePanel?.open?.({windowId:tab.windowId}).catch(()=>{})}
});

import {thumbnailFor,encodedBytes} from './media.js';
// Keep this name stable: existing pictures migrate in-place.
const DB_NAME='frame-notes-v1';
let opening;
function db(){
 return opening ||= new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,2);
  req.onupgradeneeded=()=>{
   const database=req.result,tx=req.transaction;
   const frames=database.objectStoreNames.contains('frames')?tx.objectStore('frames'):database.createObjectStore('frames',{keyPath:'id'});
   const settings=database.objectStoreNames.contains('settings')?tx.objectStore('settings'):database.createObjectStore('settings');
   if(!frames.indexNames.contains('projectId'))frames.createIndex('projectId','projectId');
   if(!database.objectStoreNames.contains('projects')){
    database.createObjectStore('projects',{keyPath:'id'}).put({id:'legacy',name:'第一张壁纸',created:Date.now()});
    settings.put('legacy','activeProjectId');
    const old=settings.get('wallpaper');old.onsuccess=()=>{if(old.result)settings.put(old.result,'project:legacy')};
    const cursor=frames.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;c.update({...c.value,projectId:c.value.projectId||'legacy'});c.continue()};
   }
  };
  req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();opening=null};resolve(req.result)};
  req.onerror=()=>{opening=null;reject(req.error)};
  req.onblocked=()=>{opening=null;reject(new Error('请先关闭旧版壁纸编辑页，再刷新新版。'))};
 });
}
async function run(store,mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,mode),req=action(tx.objectStore(store));tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('本地保存失败'))})}
export const getActiveProjectId=()=>run('settings','readonly',s=>s.get('activeProjectId'));
export const getProject=id=>run('projects','readonly',s=>s.get(id));
export async function getProjects(){return (await run('projects','readonly',s=>s.getAll())).sort((a,b)=>a.created-b.created)}
export async function setActiveProject(id){const database=await db();return new Promise((resolve,reject)=>{let error;const tx=database.transaction(['projects','settings'],'readwrite'),req=tx.objectStore('projects').get(id);req.onsuccess=()=>{if(!req.result){error=new Error('壁纸项目不存在');tx.abort();return}tx.objectStore('settings').put(id,'activeProjectId')};tx.oncomplete=()=>resolve(id);tx.onabort=()=>reject(error||tx.error)})}
export async function createProject(name){const projects=await getProjects(),project={id:crypto.randomUUID(),name:String(name||`新壁纸 ${projects.length+1}`).trim().slice(0,40)||'未命名壁纸',created:Date.now()};const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction(['projects','settings'],'readwrite');tx.objectStore('projects').put(project);tx.objectStore('settings').put(project.id,'activeProjectId');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return project}
export async function renameProject(id,name){name=String(name).trim().slice(0,40);if(!name)throw new Error('请给壁纸起一个名字');const database=await db();return new Promise((resolve,reject)=>{let value,error;const tx=database.transaction('projects','readwrite'),store=tx.objectStore('projects'),req=store.get(id);req.onsuccess=()=>{if(!req.result){error=new Error('壁纸项目不存在');tx.abort();return}value={...req.result,name};store.put(value)};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(error||tx.error)})}
export async function getFrames(projectId,{all=false,deleted=false}={}){projectId ||= await getActiveProjectId();const list=await run('frames','readonly',s=>s.index('projectId').getAll(projectId));return list.filter(f=>all||Boolean(f.deletedAt)===deleted).sort((a,b)=>a.order-b.order||a.created-b.created)}
export const getDeletedFrames=projectId=>getFrames(projectId,{deleted:true});
export const putFrame=frame=>changeFrames([frame]);
export const deleteFrame=id=>changeFrames([],[id]);
export async function getSettings(projectId){const id=projectId||await getActiveProjectId();return run('settings','readonly',s=>s.get('project:'+id))}
export async function putSettings(settings,projectId){const id=projectId||await getActiveProjectId(),database=await db();return new Promise((resolve,reject)=>{let error;const tx=database.transaction(['projects','settings'],'readwrite'),req=tx.objectStore('projects').get(id);req.onsuccess=()=>{if(!req.result){error=new Error('这张壁纸已删除，无法继续保存');tx.abort();return}tx.objectStore('settings').put(settings,'project:'+id)};tx.oncomplete=resolve;tx.onabort=()=>reject(error||tx.error)})}
export async function addFrame(data,projectId){const id=projectId||data.projectId||await getActiveProjectId();if(!await getProject(id))throw new Error('截图目标项目不存在，请重新选择项目');if(!data.thumbnailUrl)data={...data,thumbnailUrl:await thumbnailFor(data)};const frames=await getFrames(id,{all:true}),frame={...data,projectId:id,id:crypto.randomUUID(),created:Date.now(),order:frames.length?Math.max(...frames.map(f=>f.order))+1:0,zoom:1,focusX:.5,focusY:.5};await putFrame(frame);return frame}

export async function changeFrames(puts=[],deletes=[]){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(['projects','frames'],'readwrite'),store=tx.objectStore('frames'),removed=new Set(deletes);for(const frame of puts){if(removed.has(frame.id))continue;const req=store.get(frame.id);req.onsuccess=()=>{const old=req.result,next={...frame};if(old){if(old.deletedAt)next.deletedAt=old.deletedAt;else delete next.deletedAt}const owner=tx.objectStore('projects').get(frame.projectId);owner.onsuccess=()=>{if(owner.result)store.put(next)}}}for(const id of removed){const req=store.get(id);req.onsuccess=()=>{if(req.result)store.put({...req.result,deletedAt:Date.now()})}}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('照片整理未完成'))})}

// Soft deletion updates only the deletion marker, preserving newer crop/caption edits.
export async function setFramesDeleted(ids,deleted,projectId){
 const database=await db(),changed=[];return new Promise((resolve,reject)=>{
  const tx=database.transaction('frames','readwrite'),store=tx.objectStore('frames');
  for(const id of new Set(ids)){const req=store.get(id);req.onsuccess=()=>{const frame=req.result;if(!frame||frame.projectId!==projectId||Boolean(frame.deletedAt)===deleted)return;if(deleted)frame.deletedAt=Date.now();else delete frame.deletedAt;store.put(frame);changed.push(frame)}}
  tx.oncomplete=()=>resolve(changed);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('照片整理未完成'));
 });
}

export async function getProjectContext(){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(['projects','settings'],'readonly'),projects=tx.objectStore('projects').getAll(),active=tx.objectStore('settings').get('activeProjectId');tx.oncomplete=()=>resolve({projects:projects.result.sort((a,b)=>a.created-b.created),activeId:active.result});tx.onerror=()=>reject(tx.error)})}
export async function projectStats(id){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(['frames','settings'],'readonly'),stats={current:0,deleted:0,bytes:0};const cursor=tx.objectStore('frames').index('projectId').openCursor(IDBKeyRange.only(id));cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;const f=c.value;stats[f.deletedAt?'deleted':'current']++;stats.bytes+=encodedBytes(f.dataUrl)+encodedBytes(f.thumbnailUrl);c.continue()};const background=tx.objectStore('settings').get('project:'+id);background.onsuccess=()=>stats.bytes+=encodedBytes(background.result?.background?.dataUrl);tx.oncomplete=()=>resolve(stats);tx.onerror=()=>reject(tx.error)})}
export async function deleteProject(id){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(['projects','frames','settings'],'readwrite'),projects=tx.objectStore('projects'),settings=tx.objectStore('settings');let nextId,error;const all=projects.getAll();all.onsuccess=()=>{if(!all.result.some(p=>p.id===id)){error=new Error('这张壁纸已经删除');tx.abort();return}const remaining=all.result.filter(p=>p.id!==id).sort((a,b)=>a.created-b.created);projects.delete(id);settings.delete('project:'+id);if(id==='legacy')settings.delete('wallpaper');const current=settings.get('activeProjectId');current.onsuccess=()=>{nextId=current.result;if(current.result===id){if(remaining.length)nextId=remaining[0].id;else{const fresh={id:crypto.randomUUID(),name:'第一张壁纸',created:Date.now()};projects.put(fresh);nextId=fresh.id}settings.put(nextId,'activeProjectId')}};const cursor=tx.objectStore('frames').index('projectId').openCursor(IDBKeyRange.only(id));cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue()}}};tx.oncomplete=()=>resolve({activeId:nextId});tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(error||tx.error)})}

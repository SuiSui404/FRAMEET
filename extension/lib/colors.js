// Compact local palette. Screen sampling is limited to the actual wallpaper canvas,
// so the small magnifier never depends on the operating system's oversized picker.
export function mountColorPickers(doc,preview){
 let closeCurrent=()=>{};
 for(const original of doc.querySelectorAll('input[type="color"]')){
  const button=doc.createElement('button');button.id=original.id;button.type='button';button.className='color-swatch';button.setAttribute('aria-label',original.getAttribute('aria-label')||'选择颜色');button.setAttribute('aria-haspopup','dialog');let value=original.value;
  Object.defineProperty(button,'value',{get:()=>value,set(next){if(/^#[\da-f]{6}$/i.test(next)){value=next;button.style.setProperty('--swatch',value);button.title=value}}});button.value=value;original.replaceWith(button);
  button.onclick=e=>{e.preventDefault();closeCurrent();const popup=doc.createElement('div');popup.className='compact-palette';popup.setAttribute('role','dialog');popup.setAttribute('aria-label','颜色');
   const hex=doc.createElement('input');hex.type='text';hex.value=value;hex.maxLength=7;hex.setAttribute('aria-label','十六进制颜色');
   const palette=doc.createElement('canvas');palette.width=144;palette.height=88;palette.className='palette-colors';palette.setAttribute('aria-label','点击色板选择颜色');const g=palette.getContext('2d'),hue=g.createLinearGradient(0,0,144,0);['#f00','#ff0','#0f0','#0ff','#00f','#f0f','#f00'].forEach((color,i)=>hue.addColorStop(i/6,color));g.fillStyle=hue;g.fillRect(0,0,144,88);const light=g.createLinearGradient(0,0,0,88);light.addColorStop(0,'#fff');light.addColorStop(.5,'#ffffff00');light.addColorStop(.5,'#00000000');light.addColorStop(1,'#000');g.fillStyle=light;g.fillRect(0,0,144,88);
   const apply=color=>{button.value=color;hex.value=button.value;button.dispatchEvent(new Event('input',{bubbles:true}))};
   palette.onclick=e=>{const r=palette.getBoundingClientRect(),d=g.getImageData(Math.max(0,Math.min(143,Math.floor((e.clientX-r.left)*144/r.width))),Math.max(0,Math.min(87,Math.floor((e.clientY-r.top)*88/r.height))),1,1).data;apply(rgb(d))};
   hex.onchange=()=>{if(/^#[\da-f]{6}$/i.test(hex.value))apply(hex.value);else hex.value=value};
   const row=doc.createElement('div');row.className='palette-swatches';for(const color of ['#ffffff','#000000','#f7ee55','#ffd0b7','#92958f']){const b=doc.createElement('button');b.type='button';b.style.background=color;b.setAttribute('aria-label',color);b.onclick=()=>apply(color);row.append(b)}
   const pick=doc.createElement('button');pick.type='button';pick.className='secondary';pick.textContent='从壁纸取色';pick.onclick=()=>{close();samplePreview(doc,preview,apply)};
   popup.append(palette,row,hex,pick);doc.body.append(popup);const r=button.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(innerWidth-170,r.left))+'px';popup.style.top=Math.max(8,Math.min(innerHeight-225,r.bottom+6))+'px';
   const outside=e=>{if(!popup.contains(e.target)&&e.target!==button)close()},escape=e=>{if(e.key==='Escape')close()};function close(){popup.remove();doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('keydown',escape);closeCurrent=()=>{}}closeCurrent=close;doc.addEventListener('pointerdown',outside,true);doc.addEventListener('keydown',escape);
  };
 }
}
function rgb(d){return '#'+[d[0],d[1],d[2]].map(n=>n.toString(16).padStart(2,'0')).join('')}
function samplePreview(doc,preview,apply){
 const overlay=doc.createElement('div');overlay.className='canvas-eyedropper';overlay.setAttribute('aria-label','点击壁纸取色，Esc 取消');const lens=doc.createElement('canvas');lens.width=lens.height=40;lens.className='eyedropper-lens';lens.hidden=true;const tip=doc.createElement('div');tip.className='eyedropper-tip';tip.textContent='点击壁纸取色 · Esc 取消';overlay.append(lens,tip);doc.body.append(overlay);let color=null;
 const move=e=>{const r=preview.getBoundingClientRect();color=null;lens.hidden=true;if(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return;const x=Math.floor((e.clientX-r.left)*preview.width/r.width),y=Math.floor((e.clientY-r.top)*preview.height/r.height),g=lens.getContext('2d');color=rgb(preview.getContext('2d').getImageData(x,y,1,1).data);lens.hidden=false;lens.style.left=Math.min(innerWidth-48,e.clientX+18)+'px';lens.style.top=Math.min(innerHeight-48,e.clientY+18)+'px';g.imageSmoothingEnabled=false;g.clearRect(0,0,40,40);g.drawImage(preview,x-4,y-4,9,9,0,0,40,40);g.strokeStyle='#fff';g.lineWidth=1;g.strokeRect(17,17,5,5);g.strokeStyle='#111';g.strokeRect(16,16,7,7)};
 const cancel=e=>{if(e.key==='Escape')cleanup()};function cleanup(){overlay.remove();doc.removeEventListener('keydown',cancel)}overlay.onpointermove=move;overlay.onclick=e=>{move(e);if(color){apply(color);cleanup()}};doc.addEventListener('keydown',cancel);
}

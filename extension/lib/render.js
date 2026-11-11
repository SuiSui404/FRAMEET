export const defaults={resolution:'1920x1080',columns:'auto',gap:9,grain:true,offset:true,copy:'',ink:'#f7ee55',textSize:43,textStyle:'crayon',template:'film',polaroidIds:null,polaroidCount:6,prefixRuleVersion:1,simpleCount:3,simpleDirection:'auto',simpleGap:30,simpleCopy:'',backgroundMode:'default',polaroidTransforms:{},polaroidCopy:'',background:null,backgroundColor:'#8ba6a0',captionInk:'#303633',chineseFont:'yahei',decorations:[]};
export function layout(count,width,height,settings){
  if(!count)return [];
  const portrait=height>width;
  const cols=settings.columns==='auto'?Math.min(count,portrait?3:count<=4?2:count<=12?4:6):Number(settings.columns);
  const rows=Math.ceil(count/cols),area={x:width*.14,y:height*.085,w:width*.72,h:height*.83};
  const gap=Math.min(Number(settings.gap)*width/1920,area.h/(rows*8),area.w/(cols*8)),film=Math.min(width*.015,area.h/rows*.13);
  const cellW=Math.min((area.w-gap*(cols-1))/cols,((area.h-gap*(rows-1))/rows-film*2)*1.65);
  const cellH=cellW/1.65,rowH=cellH+film*2;
  const totalH=rows*rowH+(rows-1)*gap,startY=(height-totalH)/2;
  return Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cols),inRow=Math.min(cols,count-row*cols),rowW=inRow*cellW+(inRow-1)*gap;
    const shift=settings.offset&&rows>1?(row%2?-.018:.018)*width:0;
    return {x:(width-rowW)/2+(i%cols)*(cellW+gap)+shift,y:startY+row*(rowH+gap)+film,w:cellW,h:cellH,film,index:i};
  });
}
let noisePattern;
function noise(ctx){
  if(!noisePattern){const tile=document.createElement('canvas');tile.width=160;tile.height=160;const t=tile.getContext('2d'),pixels=t.createImageData(160,160);let seed=19;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*16807)%2147483647;const v=seed%256;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=24}t.putImageData(pixels,0,0);noisePattern=tile}
  ctx.fillStyle=ctx.createPattern(noisePattern,'repeat');ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
}
function photo(ctx,img,slot,frame){
  const scale=Math.max(slot.w/img.width,slot.h/img.height)*(frame.zoom||1),sw=slot.w/scale,sh=slot.h/scale;
  const sx=(img.width-sw)*(frame.focusX??.5),sy=(img.height-sh)*(frame.focusY??.5);
  ctx.drawImage(img,sx,sy,sw,sh,slot.x,slot.y,slot.w,slot.h);
}
const textCache=new Map();
export function clearRenderCache(){for(const item of textCache.values()){item.sprite.width=0;item.sprite.height=0}textCache.clear()}
const chineseFamilies={yahei:'"Microsoft YaHei", "PingFang SC", sans-serif',pingfang:'"PingFang SC", "Microsoft YaHei", sans-serif',heiti:'SimHei, "Heiti SC", sans-serif',songti:'SimSun, "Songti SC", serif',kaiti:'KaiTi, "Kaiti SC", serif'};
function textFont(text,size,style,chinese='yahei'){
 const fonts={handwrite:['Caveat',600],marker:['Marker',400],sketch:['Sketch',700],crayon:['Kalam',700]},[family,weight]=fonts[style]||fonts.handwrite,cjk=chineseFamilies[chinese]||chineseFamilies.yahei;
 return `${weight} ${size}px ${family}, ${cjk}`;
}
function textSprite(text,size,color,style,chinese){
  const fonts={handwrite:['Caveat',600],marker:['Marker',400],sketch:['Sketch',700],crayon:['Kalam',700]};
  const font=textFont(text,size,style,chinese);
  const key=JSON.stringify([text,size,color,style,chinese,document.fonts.check(font)]);if(textCache.has(key))return textCache.get(key);
  const sprite=document.createElement('canvas'),ctx=sprite.getContext('2d'),lines=text.split('\n');ctx.font=font;
  const widths=lines.map(line=>style==='crayon'?[...line].reduce((w,ch)=>w+ctx.measureText(ch).width,0):ctx.measureText(line).width);
  const padding=Math.ceil(size*.5),w=Math.max(1,...widths),h=lines.length*size*1.12;
  sprite.width=Math.ceil(w+padding*2);sprite.height=Math.ceil(h+padding*2);ctx.font=font;ctx.fillStyle=color;ctx.textBaseline='middle';
  let seed=[...text+style].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,19)||19;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  lines.forEach((line,i)=>{
    const y=padding+size*.56+i*size*1.12;
    if(style!=='crayon'){ctx.textAlign='center';ctx.fillText(line,sprite.width/2,y);return}
    ctx.textAlign='left';let x=(sprite.width-widths[i])/2;
    for(const ch of line){const advance=ctx.measureText(ch).width;ctx.save();ctx.translate(x+advance/2,y+(random()-.5)*size*.055);ctx.rotate((random()-.5)*.08);ctx.fillText(ch,-advance/2,0);ctx.restore();x+=advance}
  });
  if(style==='crayon'){
    // Dry wax marks: deterministic transparent flecks and short scratches inside the glyph mask.
    ctx.globalCompositeOperation='destination-out';
    const density=Math.min(50000,Math.round(sprite.width*sprite.height/(size>70?18:14)));
    for(let i=0;i<density;i++){const x=random()*sprite.width,y=random()*sprite.height;ctx.fillStyle=`rgba(0,0,0,${.12+random()*.4})`;ctx.beginPath();ctx.ellipse(x,y,(.12+random()*.38)*size/43,(.15+random()*.5)*size/43,-.55,0,Math.PI*2);ctx.fill()}
    ctx.strokeStyle='#00000027';ctx.lineWidth=Math.max(.5,size/75);
    for(let i=0;i<sprite.height/3;i++){const x=random()*sprite.width,y=random()*sprite.height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+size*(.1+random()*.5),y-size*.05);ctx.stroke()}
    ctx.globalCompositeOperation='source-over';
  }
  const result={sprite,w,h};textCache.set(key,result);if(textCache.size>40)textCache.delete(textCache.keys().next().value);return result;
}
function drawSticker(c,d,scale){
  c.strokeStyle=d.color;c.lineWidth=3.1*scale;c.lineCap='round';c.lineJoin='round';c.beginPath();
  if(d.kind==='heart'){c.moveTo(0,20*scale);c.bezierCurveTo(-65*scale,-15*scale,-20*scale,-60*scale,0,-25*scale);c.bezierCurveTo(24*scale,-60*scale,62*scale,-14*scale,0,20*scale)}
  if(d.kind==='star'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=(i%2?15:33)*scale;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath()}
  if(d.kind==='arrow'){c.moveTo(-45*scale,25*scale);c.quadraticCurveTo(10*scale,32*scale,38*scale,-23*scale);c.lineTo(13*scale,-18*scale);c.moveTo(38*scale,-23*scale);c.lineTo(38*scale,2*scale)}
  if(d.kind==='crown'){c.moveTo(-36*scale,20*scale);c.lineTo(-44*scale,-23*scale);c.lineTo(-13*scale,-3*scale);c.lineTo(0,-36*scale);c.lineTo(17*scale,-4*scale);c.lineTo(43*scale,-25*scale);c.lineTo(33*scale,20*scale);c.closePath();c.moveTo(-32*scale,28*scale);c.lineTo(30*scale,28*scale)}
  c.stroke();
}

export const DEFAULT_CAPTIONS=['Embrace the unknown.','I choose you, always.','One step at a time.','Life is a journey.','Never lose your spark.','Freedom begins within.'];
export const DEFAULT_BACKGROUND=new URL('../assets/water2.jpg',import.meta.url).href;
export const countFor=settings=>Math.max(1,Math.min(6,Math.round(Number(settings.template==='simple'?settings.simpleCount:settings.polaroidCount)|| (settings.template==='simple'?3:6))));
export function backgroundSource(settings){return settings.background?.dataUrl||(settings.backgroundMode==='color'||settings.template!=='polaroid'?null:DEFAULT_BACKGROUND)}
export function polaroidFrames(frames,settings){return frames.filter(f=>!f.deletedAt).slice(0,countFor({...settings,template:'polaroid'}))}
export function renderFrames(frames,settings){const list=frames.filter(f=>!f.deletedAt);return settings.template==='film'?(settings.filmCount?list.slice(0,Math.max(1,Number(settings.filmCount)||list.length)):settings.filmIds?.length?list.filter(f=>settings.filmIds.includes(f.id)):list):list.slice(0,countFor(settings))}
export function simpleLayout(frames,settings,width,height){const used=renderFrames(frames,settings),count=used.length;if(!count)return [];const margin=Math.min(width,height)*.055,gap=Number(settings.simpleGap||0)*Math.min(width,height)/1080,areaW=width-margin*2,areaH=height-margin*2;let direction=settings.simpleDirection||'auto';if(direction==='auto')direction=count<=3?(height>width?'vertical':'horizontal'):'grid';let cols=count===4?2:direction==='horizontal'?count:direction==='vertical'?1:Math.min(count,height>width?2:3),rows=Math.ceil(count/cols);const aspect=used.reduce((sum,f)=>sum+f.width/f.height,0)/count;const cw=Math.min((areaW-gap*(cols-1))/cols,((areaH-gap*(rows-1))/rows)*aspect),ch=cw/aspect,totalH=rows*ch+(rows-1)*gap;return used.map((f,i)=>{const row=Math.floor(i/cols),inRow=Math.min(cols,count-row*cols),rowW=inRow*cw+(inRow-1)*gap;return {index:i,frameId:f.id,x:(width-rowW)/2+(i%cols)*(cw+gap),y:(height-totalH)/2+row*(ch+gap),w:cw,h:ch}})}
export function previewSlots(frames,settings){frames=renderFrames(frames,settings);const [w,h]=settings.resolution.split('x').map(Number);if(settings.template==='polaroid')return polaroidCards(frames,settings,w,h).map(c=>({frameId:c.frameId,...c.photo}));if(settings.template==='simple')return simpleLayout(frames,settings,w,h);return layout(frames.length,w,h,settings).map((slot,i)=>({...slot,frameId:frames[i].id}))}
export function polaroidLayout(count,width,height){
 count=Math.min(6,count);if(!count)return [];
 const margin=Math.min(width,height)*.09,gap=Math.min(width,height)*.045,ratio=.80;
 let best;
 for(let cols=1;cols<=count;cols++){const rows=Math.ceil(count/cols),w=Math.min((width-2*margin-gap*(cols-1))/cols,(height-2*margin-gap*(rows-1))/rows*ratio),h=w/ratio,score=w*h*(1-(cols*rows-count)*.035);if(!best||score>best.score)best={cols,rows,w,h,score}}
 const {cols,rows,w,h}=best,totalH=rows*h+(rows-1)*gap;
 return Array.from({length:count},(_,index)=>{const row=Math.floor(index/cols),inRow=Math.min(cols,count-row*cols),x=(width-inRow*w-(inRow-1)*gap)/2+(index%cols)*(w+gap),y=(height-totalH)/2+row*(h+gap),pad=w*.064,captionH=h*.19;return {index,x,y,w,h,angle:0,photo:{x:x+pad,y:y+pad,w:w-pad*2,h:h-pad*2-captionH},caption:{x:x+pad,y:y+h-pad-captionH,w:w-pad*2,h:captionH}}});
}
export function polaroidCards(frames,settings,width,height){
 const used=polaroidFrames(frames,settings);return polaroidLayout(used.length,width,height).map((base,i)=>{
  const frame=used[i],stored=settings.polaroidTransforms?.[frame.id],t=stored?.resolution===settings.resolution?stored:{},angle=base.angle*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
  const maxScale=Math.min(1.8,width*.97/(base.w*cos+base.h*sin),height*.97/(base.w*sin+base.h*cos)),scale=Math.max(.5,Math.min(maxScale,Number(t.scale)||1));
  const stretchX=Math.max(.5,Math.min(2,Number(t.stretchX)||1)),stretchY=Math.max(.5,Math.min(2,Number(t.stretchY)||1)),w=Math.min(width*.97,base.w*scale*stretchX),h=Math.min(height*.97,base.h*scale*stretchY),halfW=(w*cos+h*sin)/2,halfH=(w*sin+h*cos)/2;
  const cx=Math.max(halfW,Math.min(width-halfW,(t.x??((base.x+base.w/2)/width))*width)),cy=Math.max(halfH,Math.min(height-halfH,(t.y??((base.y+base.h/2)/height))*height));
  const x=cx-w/2,y=cy-h/2,pad=w*.064,captionH=h*.19;
  return {...base,x,y,w,h,scale,stretchX,stretchY,frameId:frame.id,photo:{x:x+pad,y:y+pad,w:w-pad*2,h:h-pad*2-captionH},caption:{x:x+pad,y:y+h-pad-captionH,w:w-pad*2,h:captionH}};
 });
}
export function wrapCaption(text,width,size,style,chinese){
 const c=document.createElement('canvas').getContext('2d');c.font=textFont(text,size,style,chinese);
 // Keep English words intact. Closing punctuation belongs to the preceding
 // token, opening punctuation to the following one. Oversized tokens are
 // reduced by the caption's final fit instead of being split into letters.
 const lines=[];
 for(const paragraph of String(text).split('\n')){
  const tokens=[];let opening='';
  for(const token of (paragraph.trim().match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+/gu)||[])){
   if(/^[([{“‘「『《〈]+$/u.test(token)){opening+=token;continue}
   if(/^[,.;:!?%…，。！？；：、）】」』》〉)\]}'”’♡♥❤]+$/u.test(token)&&tokens.length){tokens[tokens.length-1]+=token;continue}
   tokens.push(opening+token);opening='';
  }
  if(opening){if(tokens.length)tokens[tokens.length-1]+=opening;else tokens.push(opening)}
  let line='';for(const token of tokens){const next=line?line+(/[\u3400-\u9fff]/u.test(token)||/[\u3400-\u9fff]$/u.test(line)?'':' ')+token:token;if(line&&c.measureText(next).width>width){lines.push(line);line=token}else line=next}lines.push(line);
 }
 return lines.join('\n');
}
function renderPolaroid(c,frames,images,settings,width,height,selected,selection){
 const bg=images.get('__background__');c.fillStyle=settings.backgroundColor||'#8ba6a0';c.fillRect(0,0,width,height);
 if(bg&&backgroundSource(settings))photo(c,bg,{x:0,y:0,w:width,h:height},{zoom:1,focusX:.5,focusY:.5});
 else if(settings.backgroundMode!=='color'){const g=c.createLinearGradient(0,0,width,height);g.addColorStop(0,'#ffffff18');g.addColorStop(1,'#10292320');c.fillStyle=g;c.fillRect(0,0,width,height)}
 const used=polaroidFrames(frames,settings),slots=polaroidCards(frames,settings,width,height);
 const order=used.length===6&&width>height?[3,0,1,2,4,5]:slots.map((_,i)=>i);
 for(const index of order){const slot=slots[index],frame=used[index];c.save();const cx=slot.x+slot.w/2,cy=slot.y+slot.h/2;c.translate(cx,cy);c.rotate(slot.angle*Math.PI/180);c.translate(-cx,-cy);
  c.shadowColor='#12201e55';c.shadowBlur=width*.010;c.shadowOffsetY=height*.006;c.fillStyle='#f7f7f1';c.fillRect(slot.x,slot.y,slot.w,slot.h);c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;
  const paper=c.createLinearGradient(slot.x,slot.y,slot.x+slot.w,slot.y+slot.h);paper.addColorStop(0,'#ffffff');paper.addColorStop(1,'#e9ece9');c.fillStyle=paper;c.fillRect(slot.x,slot.y,slot.w,slot.h);
  c.strokeStyle='#ffffff90';c.lineWidth=Math.max(1,width/1920);c.strokeRect(slot.x,slot.y,slot.w,slot.h);
  const img=images.get(frame.id);if(img)photo(c,img,slot.photo,frame);else{c.fillStyle='#b9c6c2';c.fillRect(slot.photo.x,slot.photo.y,slot.photo.w,slot.photo.h)}
  {const caption=frame.polaroidCaption?.trim()?frame.polaroidCaption:(settings.captionsClearedVersion===4&&!frame.showDefaultCaption?'':DEFAULT_CAPTIONS[index%6]);const box=slot.caption,size=Math.min(slot.w*.085,box.h*.36),text=textSprite(wrapCaption(caption,box.w*.96,size,settings.textStyle,settings.chineseFont),size,(frame.polaroidCaption?.trim()?settings.captionInk||'#303633':settings.defaultCaptionInk||'#92958f'),settings.textStyle||'handwrite',settings.chineseFont);const fit=Math.min(1,box.w*.96/text.w,box.h*.82/text.h);c.save();c.beginPath();c.rect(box.x,box.y,box.w,box.h);c.clip();c.drawImage(text.sprite,box.x+box.w/2-text.sprite.width*fit/2,box.y+box.h/2-text.sprite.height*fit/2,text.sprite.width*fit,text.sprite.height*fit);c.restore()}
  c.restore();
 }
 const bounds=order.map(index=>{const s=slots[index];return {id:'card:'+s.frameId,kind:'card',frameId:s.frameId,index,x:s.x+s.w/2,y:s.y+s.h/2,w:s.w,h:s.h,angle:s.angle*Math.PI/180,scale:s.scale,stretchX:s.stretchX,stretchY:s.stretchY}});
 const card=bounds.find(b=>b.id===selected);if(selection&&card){const unit=width/1920;c.save();c.translate(card.x,card.y);c.rotate(card.angle);c.strokeStyle='#ffd0b7';c.lineWidth=2*unit;c.strokeRect(-card.w/2,-card.h/2,card.w,card.h);c.fillStyle='#fff7ef';for(const x of [-card.w/2,card.w/2])for(const y of [-card.h/2,card.h/2]){c.fillRect(x-6*unit,y-6*unit,12*unit,12*unit);c.strokeRect(x-6*unit,y-6*unit,12*unit,12*unit)}for(const [x,y] of [[-card.w/2,0],[card.w/2,0],[0,-card.h/2],[0,card.h/2]]){c.fillRect(x-5*unit,y-5*unit,10*unit,10*unit);c.strokeRect(x-5*unit,y-5*unit,10*unit,10*unit)}c.restore()}
 return bounds;

}

export function render(canvas,frames,images,settings,selectedDeco=null,selection=false){
  frames=renderFrames(frames,settings);
  const [width,height]=settings.resolution.split('x').map(Number);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const c=canvas.getContext('2d');c.clearRect(0,0,width,height);c.fillStyle='#0c0d0d';c.fillRect(0,0,width,height);
  const polaroid=settings.template==='polaroid',simple=settings.template==='simple',slots=polaroid||simple?[]:layout(frames.length,width,height,settings),unit=width/1920;
  if(!polaroid){if(settings.backgroundMode==='color'){c.fillStyle=settings.backgroundColor;c.fillRect(0,0,width,height)}const bg=images.get('__background__');if(bg&&backgroundSource(settings))photo(c,bg,{x:0,y:0,w:width,h:height},{zoom:1,focusX:.5,focusY:.5})}
  const bounds=polaroid?renderPolaroid(c,frames,images,settings,width,height,selectedDeco,selection):[];
  for(const slot of slots){
    c.fillStyle='#191a18';c.fillRect(slot.x-unit*4,slot.y-slot.film,slot.w+unit*8,slot.h+slot.film*2);
    const holes=Math.max(5,Math.floor(slot.w/(width*.012)));
    for(let h=0;h<holes;h++){const x=slot.x+(h+.25)*slot.w/holes;c.fillStyle='#080909';c.fillRect(x,slot.y-slot.film*.78,slot.w/holes*.48,slot.film*.38);c.fillRect(x,slot.y+slot.h+slot.film*.38,slot.w/holes*.48,slot.film*.38)}
    if(images.get(frames[slot.index].id))photo(c,images.get(frames[slot.index].id),slot,frames[slot.index]);
    c.fillStyle='#c6c4b8';c.font=`${Math.max(9,slot.film*.36)}px monospace`;c.textAlign='left';c.textBaseline='middle';
    c.fillText(String(slot.index+1).padStart(2,'0'),slot.x+unit*8,slot.y-slot.film*.28);c.fillText(`${String(slot.index+1).padStart(2,'0')}   ▸`,slot.x+unit*8,slot.y+slot.h+slot.film*.26);
    c.textAlign='right';c.font=`${Math.max(6,slot.film*.22)}px monospace`;c.fillText('FN  •  400',slot.x+slot.w-unit*5,slot.y-slot.film*.28);
  }
  if(simple){for(const slot of simpleLayout(frames,settings,width,height)){const frame=frames.find(f=>f.id===slot.frameId),img=images.get(frame.id);if(img)photo(c,img,slot,frame)}}
  if(settings.grain&&!polaroid&&!simple)noise(c);
  for(const d of settings.decorations){
    if(d.kind==='text'&&(polaroid||(d.scope||'film')!==(settings.template||'film')))continue;
    let w,h,text,fit=1;
    if(d.kind==='text'){
      const size=Number(settings.textSize)*unit*(d.scale||1);text=textSprite(d.text,size,d.color||settings.ink,settings.textStyle||'handwrite',settings.chineseFont);
      fit=Math.min(1,width*.85/text.w,height*.85/text.h);w=text.w*fit;h=text.h*fit;
    }else{w=h=100*unit*(d.scale||1)}
    const angle=(d.angle||0)*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
    const halfW=(w*cos+h*sin)/2+8*unit,halfH=(w*sin+h*cos)/2+8*unit;
    const cx=Math.max(Math.min(halfW,width/2),Math.min(width-halfW,d.x*width)),cy=Math.max(Math.min(halfH,height/2),Math.min(height-halfH,d.y*height));
    c.save();c.translate(cx,cy);c.rotate(angle);c.shadowColor='#0009';c.shadowBlur=3*unit;c.shadowOffsetY=unit;
    if(text)c.drawImage(text.sprite,-text.sprite.width*fit/2,-text.sprite.height*fit/2,text.sprite.width*fit,text.sprite.height*fit);
    else drawSticker(c,d,unit*(d.scale||1));
    if(selection&&d.id===selectedDeco){c.strokeStyle='#ffffff90';c.lineWidth=unit;c.setLineDash([5*unit,5*unit]);c.strokeRect(-w/2-8*unit,-h/2-8*unit,w+16*unit,h+16*unit)}
    bounds.push({id:d.id,kind:d.kind,x:cx,y:cy,w:w+24*unit,h:h+24*unit,angle});c.restore();
  }
  return bounds;
}

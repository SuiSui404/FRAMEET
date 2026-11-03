export function releaseImage(image){if(image?.close)image.close();else if(typeof HTMLImageElement!=='undefined'&&image instanceof HTMLImageElement)image.src=''}
export async function decodeImage(source,width,height,maxEdge){
  const blob=await (await fetch(source)).blob();
  if(typeof createImageBitmap==='function'){
    const ratio=width&&height&&maxEdge?Math.min(1,maxEdge/Math.max(width,height)):1;
    return createImageBitmap(blob,ratio<1?{resizeWidth:Math.max(1,Math.round(width*ratio)),resizeHeight:Math.max(1,Math.round(height*ratio)),resizeQuality:'high'}:{});
  }
  const image=new Image();image.src=source;await image.decode();return image;
}
export async function thumbnailFor(frame){
  const bitmap=await decodeImage(frame.dataUrl,frame.width,frame.height,256);
  try{const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(bitmap.width,bitmap.height):document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);if(canvas.toDataURL)return canvas.toDataURL('image/jpeg',.78);const blob=await canvas.convertToBlob({type:'image/jpeg',quality:.78}),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return 'data:image/jpeg;base64,'+btoa(binary)}finally{releaseImage(bitmap)}
}
export async function paletteFor(frame){
  const bitmap=await decodeImage(frame.thumbnailUrl||frame.dataUrl,frame.thumbnailUrl?0:frame.width,frame.thumbnailUrl?0:frame.height,64);
  try{const c=document.createElement('canvas');c.width=48;c.height=48;const x=c.getContext('2d');x.drawImage(bitmap,0,0,48,48);const data=x.getImageData(0,0,48,48).data,bins=Array.from({length:12},()=>({weight:0,h:0,s:0,v:0}));let sumS=0,sumV=0,colored=0;
    for(let i=0;i<data.length;i+=4){const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,s=max?delta/max:0;sumS+=s;sumV+=max;if(s<.14||max<.10||max>.98&&s<.25)continue;let h=delta===0?0:max===r?((g-b)/delta+6)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h*=60;const weight=s*s*Math.sqrt(max),bin=bins[Math.floor(h/30)%12];bin.weight+=weight;bin.h+=h*weight;bin.s+=s*weight;bin.v+=max*weight;colored++}
    const best=bins.reduce((a,b)=>a.weight>b.weight?a:b),neutral=colored<48*48*.12||sumS/(48*48)<.10;
    return {neutral,h:best.weight?best.h/best.weight:0,s:best.weight?best.s/best.weight:0,v:sumV/(48*48),version:1};
  }finally{releaseImage(bitmap)}
}
export function paletteCompare(a,b){const p=a.palette,q=b.palette;if(p.neutral!==q.neutral)return p.neutral?1:-1;return (p.neutral?0:Math.floor(p.h/30)-Math.floor(q.h/30))||p.v-q.v||a.order-b.order}
export function encodedBytes(dataUrl){if(!dataUrl)return 0;const body=dataUrl.slice(dataUrl.indexOf(',')+1);return Math.max(0,Math.floor(body.length*3/4)-(body.endsWith('==')?2:body.endsWith('=')?1:0))}

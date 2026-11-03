import { resolveModel } from '../explorer/model-catalog.js';
import { buildHierarchy } from '../explorer/model-state.js';
import { AssemblyScene } from '../explorer/scene.js';
import { sampleTour } from '../explorer/tour-content.js';
import { themeRoles, resolveTheme } from '../explorer/themes.js';
import { createWebM } from './webm.js';

const $=id=>document.getElementById(id),width=960,height=600,fps=30;
const output=$('preview'),ctx=output.getContext('2d',{alpha:false});
const model=resolveModel('open-duck');let scene,tour,cancelled=false,rendering=false;
const status=value=>{$('status').textContent=value;};
function download(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function overlay(frame){
  const dark=scene.displayOptions.appearance==='dark';
  // Macro shots can crop surrounding geometry; keep typography on a clear strip.
  ctx.fillStyle=dark?'#1b1b1b':'#f3f3f1';ctx.fillRect(0,0,width,65);ctx.fillRect(0,height-75,width,75);
  ctx.fillStyle=dark?'#dedede':'#282b2d';
  ctx.font='600 13px Arial';ctx.fillText('ANNORA / OPEN DUCK',28,32);ctx.font='10px monospace';ctx.fillText('ASSEMBLY STUDY · 01',28,48);
  ctx.strokeStyle=dark?'#44474a':'#d1d2d0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(28,64);ctx.lineTo(932,64);ctx.stroke();
  const x=733,y=184;ctx.fillStyle=dark?'#242629ee':'#ffffffee';ctx.fillRect(x,y,198,152);ctx.strokeRect(x+.5,y+.5,197,151);
  ctx.fillStyle='#ff6840';ctx.font='12px monospace';ctx.fillText(String(frame.index+1).padStart(2,'0')+' / '+String(tour.chapters.length).padStart(2,'0'),x+16,y+26);
  ctx.fillStyle=dark?'#dedede':'#282b2d';ctx.font='500 21px Arial';
  const words=frame.title.split(' ');let line='',row=0;for(const word of words){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>166&&line){ctx.fillText(line,x+16,y+58+row*25);row++;line=word;}else line=candidate;}ctx.fillText(line,x+16,y+58+row*25);
  ctx.font='11px Arial';ctx.fillStyle=dark?'#c2c4c5':'#666b6e';ctx.fillText('Open Duck Mini v2',x+16,y+126);
  ctx.fillStyle=dark?'#c2c4c5':'#62666a';ctx.font='11px Arial';ctx.fillText(frame.caption||'Explore the assembly.',28,height-48);
  ctx.fillStyle=dark?'#44474a':'#d3d4d1';ctx.fillRect(28,height-28,width-56,2);ctx.fillStyle='#ff6840';ctx.fillRect(28,height-28,(width-56)*frame.time/tour.duration,2);
  ctx.font='9px monospace';ctx.fillStyle=dark?'#999c9f':'#74787b';ctx.fillText('ANTOINE PIRRONE · APACHE-2.0 / ANNORA PRESENTATION',28,height-10);
}
function draw(t){
  const frame=sampleTour(tour,t);scene.applyTourFrame(frame,{immediate:t===0});
  scene.dirty=true;scene.frame(t*1000);ctx.drawImage(scene.renderer.domElement,0,0,width,height);overlay(frame);return frame;
}
function reset(){scene.pausePresentation();scene.leaveTour();scene.controls.enabled=false;scene.lastFrame=null;scene.applyTourFrame(sampleTour(tour,0),{immediate:true});draw(0);}
async function prepare(){
  $('prepare').disabled=true;status('Loading prepared geometry and linework…');
  try{
    if(!scene){
      const response=await fetch(model.metadataUrl);if(!response.ok)throw new Error('Model metadata is unavailable.');
      const metadata=await response.json();tour=model.tour;
      scene=new AssemblyScene($('source'),metadata,buildHierarchy(metadata,model.presentationPolicy),{theme:themeRoles(resolveTheme('ember'),'light'),axisElements:[],insets:()=>({left:24,right:238,top:82,bottom:78})},model);
      await scene.load();scene.setDisplayOptions({appearance:'light',grid:true});await scene.prepareEdges();scene.setQuality('performance');
      // Capture temporarily owns the same scene's clock. No parallel RAF runs.
      if(scene.raf!==null)cancelAnimationFrame(scene.raf);scene.raf=null;
      scene.invalidate=()=>{scene.dirty=true;};scene.controls.enabled=false;
    }
    reset();$('still').disabled=false;$('film').disabled=false;status('Ready. Frame-accurate capture uses the live model and authored tour.');
  }catch(error){scene?.dispose();scene=null;status(error.message);$('prepare').disabled=false;}
}
$('prepare').addEventListener('click',prepare);
$('still').addEventListener('click',async()=>{
  try{
    const time=Math.max(0,Math.min(tour.duration,Number($('time').value)||0));reset();
    for(let i=0;i<=Math.ceil(time*fps);i++)draw(Math.min(time,i/fps));
    const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('The frame could not be captured.');download(await blob.arrayBuffer(),'image/png',`open-duck-${time.toFixed(1)}s.png`);status('PNG saved.');
  }catch(error){status(error.message);}
});
$('cancel').addEventListener('click',()=>{cancelled=true;});
$('film').addEventListener('click',async()=>{
  if(rendering)return;rendering=true;cancelled=false;$('film').disabled=true;$('still').disabled=true;$('cancel').disabled=false;
  let encoder;
  try{
    if(!globalThis.VideoEncoder)throw new Error('Use a browser with WebCodecs video encoding for this authoring tool.');
    const config={codec:'vp8',width,height,bitrate:3500000,framerate:fps,latencyMode:'quality'};
    if(!(await VideoEncoder.isConfigSupported(config)).supported)throw new Error('VP8 video encoding is unavailable in this browser.');
    const frames=[];let encodingError;
    encoder=new VideoEncoder({output:chunk=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);frames.push({data,timestamp:chunk.timestamp,key:chunk.type==='key'});},error:error=>{encodingError=error;}});encoder.configure(config);
    reset();const count=Math.round(tour.duration*fps);
    for(let i=0;i<count;i++){
      if(cancelled)throw new Error('Capture cancelled.');if(document.hidden)throw new Error('Capture stopped: keep this authoring tab visible, then render again.');if(encodingError)throw encodingError;
      draw(i/fps);const frame=new VideoFrame(output,{timestamp:Math.round(i/fps*1e6),duration:Math.round(1e6/fps)});
      try{encoder.encode(frame,{keyFrame:i%(fps*2)===0});}finally{frame.close();}
      if(encoder.encodeQueueSize>8)await encoder.flush();
      if(i%10===0){status(`Rendering ${i+1} / ${count} frames…`);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    await encoder.flush();if(encodingError)throw encodingError;if(cancelled||document.hidden)throw new Error('Capture stopped. Keep this tab visible and render again.');
    download(createWebM({width,height,fps,duration:tour.duration,frames}),'video/webm','annora-open-duck-20s.webm');
    status(`Saved ${frames.length} frames at ${fps} fps. Duration ${tour.duration} seconds.`);draw(tour.duration);
  }catch(error){status(error.message);}
  finally{if(encoder&&encoder.state!=='closed')encoder.close();rendering=false;$('film').disabled=false;$('still').disabled=false;$('cancel').disabled=true;}
});
addEventListener('pagehide',()=>{cancelled=true;scene?.dispose();},{once:true});

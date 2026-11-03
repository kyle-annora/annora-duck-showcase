/** Hexapod rigid display adaptation. Hardware: ggldnl, CERN-OHL-W-2.0.
 * Offline conversion and illustrative source-joint pose study: Annora, 2026.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const here=new URL('./',import.meta.url);
const json=async name=>JSON.parse(await readFile(new URL(name,here),'utf8'));
const robot=await json('source-robot.json'),geometryReport=await json('geometry-report.json'),source=await json('source-manifest.json');
const hash=value=>createHash('sha256').update(value).digest('hex');
const slug=value=>value.replace(/\.stl$/i,'').replaceAll('_','-').replace(/[^a-zA-Z0-9-]/g,'-').toLowerCase();
const title=value=>value.replace(/\.stl$/i,'').replaceAll('_',' ').replace(/\b\w/g,l=>l.toUpperCase());
const quaternionRPY=([r,p,y])=>new THREE.Quaternion().setFromEuler(new THREE.Euler(r,p,y,'ZYX'));

// Independently derived planar standing pose from the pinned controller's
// measured coxa/femur/tibia lengths and its declared servo map. No firmware is
// executed or copied. Source joints take calibrated servo-space radians.
// Config facts: Hexapod-Controller@0f68c0c15e1d194675c294022baa5efbade28f6a,
// hexapod/config/config.yml. URDF adapter convention: Hexapod-Simulation@
// fc03ebf8b222031c40dc003c95f96d7f96302cf9, simulation/viser/interface.py.
// This independently computed display stance is not a measured hardware pose.
const geometry={coxa:68,femur:76.7,tibia:99.6,stanceRadius:155,standingHeight:80};
const radial=geometry.stanceRadius-geometry.coxa,z=-geometry.standingHeight;
const knee=-Math.acos((radial*radial+z*z-geometry.femur**2-geometry.tibia**2)/(2*geometry.femur*geometry.tibia));
const femur=Math.atan2(z,radial)-Math.atan2(geometry.tibia*Math.sin(knee),geometry.femur+geometry.tibia*Math.cos(knee));
const home={};for(let n=1;n<=6;n++){home[`leg_${n}_coxa`]=0;home[`leg_${n}_femur`]=THREE.MathUtils.radToDeg(femur);home[`leg_${n}_tibia`]=-163-THREE.MathUtils.radToDeg(knee);}
const groups={'hex-body':{title:'Body & electronics',description:'The source frame, battery, electronics and supporting body layers.',meshNames:[]}};
const legLabels=['Front right leg','Middle right leg','Rear right leg','Rear left leg','Middle left leg','Front left leg'];
for(let n=1;n<=6;n++)groups[`hex-leg-${n}`]={title:legLabels[n-1],description:'One source leg with coxa, femur and tibia joints.',meshNames:[]};
const groupFor=name=>name.startsWith('leg_')?`hex-leg-${name.split('_')[1]}`:'hex-body';
const familyFor=file=>file==='MG996R.stl'||file==='battery.stl'?'polymer':file==='electronics.stl'?'machined':/base|bottom_stiffeners/.test(file)?'structure':'coatedWhite';
const families={coatedWhite:['Printed white','#d9dcd8',.08,.6],structure:['Structural satin','#b3b5b7',.88,.52],polymer:['Graphite mechanism','#303236',0,.86],machined:['Dark electronics','#737981',.96,.36]};
const materials=Object.fromEntries(Object.entries(families).map(([family,[name,color,metalness,roughness]])=>[family,Object.assign(new THREE.MeshStandardMaterial({color,metalness,roughness}),{name})]));
const root=new THREE.Group();root.name='Hexapod';const basis=new THREE.Group();basis.name='HexURDF_Z_Up';basis.rotation.x=-Math.PI/2;root.add(basis);
const links=new Map(robot.links.map(link=>{const group=new THREE.Group();group.name=`HexLink_${link.name}`;return[link.name,group];}));
const incoming=new Set(robot.joints.map(j=>j.child));for(const link of robot.links)if(!incoming.has(link.name))basis.add(links.get(link.name));
const pivots=new Map();
for(const joint of robot.joints){
 const origin=new THREE.Group();origin.name=`HexOrigin_${joint.name}`;origin.position.fromArray(joint.xyz);origin.quaternion.copy(quaternionRPY(joint.rpy));
 const pivot=new THREE.Group();pivot.name=`HexJoint_${joint.name}`;
 if(joint.type==='revolute')pivot.quaternion.setFromAxisAngle(new THREE.Vector3().fromArray(joint.axis).normalize(),THREE.MathUtils.degToRad(home[joint.name]));
 links.get(joint.parent).add(origin);origin.add(pivot);pivot.add(links.get(joint.child));pivots.set(joint.name,pivot);
}
const surfaces=new Map(geometryReport.files.map(f=>[f.file,f.displaySurfaces]));
const loader=new STLLoader(),cache=new Map(),parts={},mapping=[],meshes=[];
for(const link of robot.links)for(const [visualIndex,visual]of link.visuals.entries()){
 const display=surfaces.get(visual.file);if(!display?.length)throw new Error(`Missing derived visual: ${visual.file}`);
 const group=groupFor(link.name);
 for(const [surfaceIndex,surface]of display.entries()){
  let geo=cache.get(surface.file);if(!geo){const bytes=await readFile(new URL(`derived/${surface.file}`,here));geo=loader.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));geo.clearGroups();geo.computeBoundingBox();geo.normalizeNormals();cache.set(surface.file,geo);}
  const family=familyFor(visual.file),mesh=new THREE.Mesh(geo,materials[family]);
  mesh.name=`Hex_${link.name}_${visualIndex+1}${surfaceIndex?`_surface${surfaceIndex+1}`:''}`;mesh.position.fromArray(visual.xyz);mesh.quaternion.copy(quaternionRPY(visual.rpy));mesh.scale.fromArray(visual.scale);links.get(link.name).add(mesh);meshes.push(mesh);
  const sourceVisualId=`hex-${slug(link.name)}-${visualIndex+1}`,id=sourceVisualId+(surfaceIndex?`-surface${surfaceIndex+1}`:'');
  const label=title(link.name).replace(/^Leg (\d+) /,'')+(surfaceIndex?` · surface ${surfaceIndex+1}`:'');
  parts[mesh.name]={id,title:label,description:`${title(link.name)} from the pinned Hexapod source visual. Display finishes and separation are illustrative.`,finishFamily:family};
  groups[group].meshNames.push(mesh.name);mapping.push({id,meshName:mesh.name,title:label,sourceVisualId,sourceVisualIndex:visualIndex+1,sourceLink:link.name,sourceFile:visual.file,sourcePath:visual.path,derivedFile:surface.file,surface:surfaceIndex+1,surfaceCount:display.length,group,finishFamily:family});
 }
}
root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);root.position.y=-before.min.y;root.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());
const sourceBoxes=new Map();for(const [i,record]of mapping.entries()){const current=new THREE.Box3().setFromObject(meshes[i]);if(sourceBoxes.has(record.sourceVisualId))sourceBoxes.get(record.sourceVisualId).union(current);else sourceBoxes.set(record.sourceVisualId,current);}
const groupCenters=new Map();for(const id of Object.keys(groups)){const union=new THREE.Box3();for(const [i,record]of mapping.entries())if(record.group===id)union.union(new THREE.Box3().setFromObject(meshes[i]));groupCenters.set(id,union.getCenter(new THREE.Vector3()));}
const bodyOffsets={base:[0,-.055,0],battery:[0,.085,0],electronics:[0,.14,0],battery_mount:[0,.045,0],top_stiffeners:[0,.18,0],bottom_stiffeners:[0,-.1,0]};
for(const record of mapping){
 let offset;
 if(record.group==='hex-body')offset=bodyOffsets[record.sourceLink]||[0,.08,0];
 else{const c=groupCenters.get(record.group).clone().sub(center);c.y=0;c.normalize().multiplyScalar(.12);offset=[c.x,.01,c.z];}
 parts[record.meshName].explode=offset;
}
for(const [id,group]of Object.entries(groups)){
 group.children=[];
 const rows=mapping.filter(r=>r.group===id);
 if(id==='hex-body'){
  for(const [suffix,label,predicate]of [['structure','Body frame',r=>!['battery','electronics'].includes(r.sourceLink)],['electronics','Power & control',r=>['battery','electronics'].includes(r.sourceLink)]]){
   const members=rows.filter(predicate);if(members.length)group.children.push({id:`hex-body-${suffix}`,title:label,description:`Source ${label.toLowerCase()} components.`,meshNames:members.map(r=>r.meshName)});
  }
 }else for(const [suffix,label]of [['coxa','Coxa joint'],['femur','Femur joint'],['tibia','Tibia joint']]){
  const members=rows.filter(r=>r.sourceLink.includes(`_${suffix}`));if(members.length)group.children.push({id:`${id}-${suffix}`,title:label,description:`The source ${suffix} joint and its rigid components.`,meshNames:members.map(r=>r.meshName)});
 }
}
const duration=2.5,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const keys=[{t:0,femur:0,tibia:0},{t:.65,femur:11,tibia:-2},{t:1.25,femur:17,tibia:-10},{t:1.8,femur:9,tibia:-5},{t:2.5,femur:0,tibia:0}];
function anglesAt(t){let right=keys.findIndex(k=>k.t>=t);if(right<0)right=keys.length-1;const a=keys[Math.max(0,right-1)],b=keys[right],mix=a===b?0:smooth((t-a.t)/(b.t-a.t));const pose={...home};pose.leg_1_femur+=(a.femur+(b.femur-a.femur)*mix);pose.leg_1_tibia+=(a.tibia+(b.tibia-a.tibia)*mix);return pose;}
const times=Array.from({length:151},(_,i)=>duration*i/150),tracks=[];
const curves={schemaVersion:1,clipName:'HexapodLegReach',sourceDuration:duration,units:'degrees',basis:'Illustrative single-leg pose study from URDF axes; not firmware output, balance simulation or live telemetry.',home,standingGeometry:geometry,joints:{}};
for(const joint of robot.joints.filter(j=>j.type==='revolute')){
 const axis=new THREE.Vector3().fromArray(joint.axis).normalize(),values=[],angles=[];
 const lower=Math.max(joint.limit.lower,joint.name.endsWith('_tibia')?THREE.MathUtils.degToRad(-120):-Infinity),upper=joint.limit.upper;
 for(const t of times){const degrees=anglesAt(t)[joint.name],radians=THREE.MathUtils.degToRad(degrees);if(radians<lower-1e-8||radians>upper+1e-8)throw new Error(`Joint outside allowed range: ${joint.name}`);angles.push(degrees);values.push(...new THREE.Quaternion().setFromAxisAngle(axis,radians).toArray());}
 tracks.push(new THREE.QuaternionKeyframeTrack(`${pivots.get(joint.name).name}.quaternion`,times,values));curves.joints[joint.name]={times,values:angles,limits:[THREE.MathUtils.radToDeg(lower),THREE.MathUtils.radToDeg(upper)]};
}
const clip=new THREE.AnimationClip('HexapodLegReach',duration,tracks);if(!clip.validate())throw new Error('Invalid pose clip.');
globalThis.FileReader??=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onload?.({target:this});this.onloadend?.({target:this});});}};
const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:[clip],onlyVisible:true,trs:true}));
const decoded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const display=[];decoded.scene.traverse(n=>{if(n.isMesh)display.push(n);});if(display.length!==mapping.length||new Set(display.map(m=>m.name)).size!==display.length)throw new Error('Visual identities failed round trip.');
const mixer=new THREE.AnimationMixer(decoded.scene),action=mixer.clipAction(decoded.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
const rest=new Map();for(const t of [0,2.5]){mixer.setTime(t);decoded.scene.updateMatrixWorld(true);for(const mesh of display){const m=mesh.matrixWorld.elements;if(t===0)rest.set(mesh.name,[...m]);else if(m.some((v,i)=>Math.abs(v-rest.get(mesh.name)[i])>2e-6))throw new Error(`Restoration mismatch: ${mesh.name}`);}}
const separationProfiles={'hex-body':[0,.55]};for(let n=1;n<=6;n++)separationProfiles[`hex-leg-${n}`]=n===1||n===4?[.18,.72]:n===2||n===5?[.28,.85]:[.4,1];
const definition={schemaVersion:1,id:'hexapod',rootId:'hexapod',title:'Hexapod',shortTitle:'Hexapod',provenance:{author:'ggldnl / Hexapod contributors; display adaptation by Annora',url:'https://github.com/ggldnl/Hexapod-Hardware',license:'CERN-OHL-W-2.0',attribution:'Hexapod · ggldnl and contributors · CERN-OHL-W-2.0. Display adaptation and illustrative motion: Annora, 2026.',description:'A six-legged source assembly with eighteen revolute joints.',note:'Source hardware and joint frames are retained. Derived geometry, finishes and separation are illustrative. The single-leg clip is an authored pose study, not firmware output, gait or balance simulation.'},licenseFile:'LICENSE.txt',tour:'authored-tour.json',view:{direction:[1.5,1.25,1.6],normalizedWidth:5.2,labels:['Hero','Reverse'],facts:[{label:'Articulated joints',value:'18'},{label:'Source visuals',value:'72'}]},creaseAngle:32,groups:Object.entries(groups).map(([id,g])=>({id,...g})),parts,operation:{clipName:clip.name,duration,stages:[{at:0,title:'Start from the stance',description:'The source leg rests in its authored standing pose.',nodeId:'hex-leg-1'},{at:.25,title:'Lift through the femur',description:'One leg lifts while the other five remain in their source display stance.',nodeId:'hex-leg-1-femur'},{at:.5,title:'Reach through the tibia',description:'A small tibia rotation extends the selected leg.',nodeId:'hex-leg-1-tibia'},{at:.8,title:'Return to the same pose',description:'Every articulated transform returns exactly to the original display stance.',nodeId:'hex-leg-1'}]},presentationPolicy:{actionDuration:2.5,explosion:{separationProfiles}}};
const license=await readFile(new URL('source/LICENSE.md',here),'utf8');
const modifiedSourceLocation='https://github.com/kyle-annora/annora-duck-showcase/tree/main/examples/hexapod';
const modificationDate='2026-11-03';
const modifiedLicense=`Hexapod hardware by ggldnl and contributors. Original source: https://github.com/ggldnl/Hexapod-Hardware/tree/${source.revision}\n\n${license}\n\nAnnora modifications, ${modificationDate}: offline display simplification, surface partition, material curation, semantic display groups, exploded offsets and illustrative source-joint motion.\nModified Source Location: ${modifiedSourceLocation}\nOriginal hardware files, derived display geometry, preparation scripts, source mappings and reports are available at that public Source Location. The modified covered source is licensed under CERN-OHL-W-2.0. See README.md, source-manifest.json and geometry-report.json. No firmware code is included in this display adaptation.\n`;
await writeFile(new URL('LICENSE.txt',here),modifiedLicense);
for(const [file,value]of [['import-definition.json',definition],['component-map.json',mapping],['motion-curves.json',curves]])await writeFile(new URL(file,here),JSON.stringify(value,null,2)+'\n');
await writeFile(new URL('model.glb',here),bytes);
const footBounds=Object.fromEntries(mapping.filter(r=>/^leg_\d+_tibia$/.test(r.sourceLink)&&r.surface===1).map(r=>{const mesh=meshes.find(m=>m.name===r.meshName);const bounds=new THREE.Box3().setFromObject(mesh);return[r.sourceLink,[bounds.min.toArray(),bounds.max.toArray()]];}));
const audit={schemaVersion:1,source,geometry:geometryReport,display:{up:'+Y',sourceUnits:'URDF metres; original STL millimetres with retained 0.001 visual scale',bounds:[box.min.toArray(),box.max.toArray()],dimensions:box.getSize(new THREE.Vector3()).toArray(),rootFloorTranslation:root.position.y,sourceVisualInstances:new Set(mapping.map(r=>r.sourceVisualId)).size,meshInstances:mapping.length,groups:Object.keys(groups),jointCount:18,sourceClip:clip.name,sourceDuration:duration,neutralChecks:[0,2.5],glbBytes:bytes.length,glbSha256:hash(bytes),footBounds,home},licenseSha256:hash(Buffer.from(license)),modifiedLicenseSha256:hash(Buffer.from(modifiedLicense)),modifiedSourceLocation,modificationDate};
await writeFile(new URL('conversion-report.json',here),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit.display,null,2));

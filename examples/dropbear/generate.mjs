/** Pinned MIT Dropbear URDF display conversion. All internal source joints held. */
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const here=new URL('./',import.meta.url),arm=process.argv.includes('--arm');
const id=arm?'dropbear-arm':'dropbear',dir=arm?'arm/':'whole/';await mkdir(new URL(dir,here),{recursive:true});
const readJSON=async file=>JSON.parse(await readFile(new URL(file,here),'utf8'));
const robot=await readJSON('source-robot.json'),geometry=await readJSON(arm?'geometry-report-arm.json':'geometry-report.json'),source=await readJSON('source-manifest.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const words=value=>value.replace(/\.stl$/i,'').replace(/^(LH|RH|LL|RL|PG|torso|head)_/,'').replace(/__\d+__\d+.*$/,'').replace(/_\d+$/,'').replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const subtree=start=>{const set=new Set([start]);let before=-1;while(before!==set.size){before=set.size;for(const j of robot.joints)if(set.has(j.parent))set.add(j.child);}return set;};
const atJoint=name=>subtree(robot.joints.find(j=>j.name===name).child);
const armSet=new Set(robot.leftArm.links);
const systems={
 'dropbear-head':{title:'Head assembly',description:'Source head frame and coupled neck hardware.'},
 'dropbear-left-arm':{title:'Left arm',description:'Reviewed shoulder subtree with three preserved internal closure relationships.'},
 'dropbear-right-arm':{title:'Right arm',description:'Source right shoulder, structural arm and tendon linkages.'},
 'dropbear-pelvis':{title:'Pelvis',description:'Source structural connection between torso and legs.'},
 'dropbear-left-leg':{title:'Left leg',description:'Source left leg, actuator and closed-linkage components.'},
 'dropbear-right-leg':{title:'Right leg',description:'Source right leg, actuator and closed-linkage components.'},
 'dropbear-power':{title:'Power assembly',description:'Source battery frame and electrical modules.'},
 'dropbear-torso':{title:'Torso',description:'Source frame, shoulder drives and central structural connections.'},
};
const sets=[['dropbear-left-arm',armSet],['dropbear-right-arm',atJoint('RH_yaw')],['dropbear-head',atJoint('head_torso_connection')],['dropbear-left-leg',atJoint('LL_leg_connection')],['dropbear-right-leg',atJoint('RL_leg_connection')],['dropbear-power',atJoint('battery_torso_connection')]];
const armSystems={
 'dropbear-arm-shoulder':{title:'Shoulder drive',description:'Source yaw rotor and shoulder interfaces; the complete arm turns as one rigid subtree.'},
 'dropbear-arm-structure':{title:'Arm structure',description:'Source extrusions, brackets and motor supports.'},
 'dropbear-arm-linkages':{title:'Tendons & bearings',description:'Source elbow and tendon chains. Their internal transforms stay fixed during the swivel.'},
};
function groupFor(link){if(arm){return /torso_|shoulder|yaw-|RMD-X10/.test(link)?'dropbear-arm-shoulder':/elbow|tendon|bearing|pulley/.test(link)?'dropbear-arm-linkages':'dropbear-arm-structure';}return sets.find(([,set])=>set.has(link))?.[0]||(link.startsWith('PG_')?'dropbear-pelvis':'dropbear-torso');}
function finish(file){const n=file.toLowerCase();return /bearing|washer|pin_|screw|bolt|nut/.test(n)?'polished':/rmd-|servo|motor|battery|converter|module|mcp|mpu|esp|fan/.test(n)?'polymer':/tendon|lead|ujoint/.test(n)?'machined':/cap|cover|skull/.test(n)?'coatedWhite':'structure';}
const colors={structure:['#b3b5b7',.88,.52],polished:['#e1e4e8',1,.21],polymer:['#303236',0,.86],machined:['#737981',.96,.36],coatedWhite:['#d9dcd8',.08,.6]};
const materials=Object.fromEntries(Object.entries(colors).map(([key,[color,metalness,roughness]])=>[key,Object.assign(new THREE.MeshStandardMaterial({color,metalness,roughness}),{name:key})]));
const root=new THREE.Group();root.name=arm?'DropbearArm':'Dropbear';
const basis=new THREE.Group();basis.name='Dropbear_URDF_Z_Up';basis.rotation.x=-Math.PI/2;root.add(basis);
const links=new Map(robot.links.map((link,index)=>{const group=new THREE.Group();group.name=`DbLink_${index}_${slug(link.name)}`;return[link.name,group];}));
const quaternion=rpy=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...rpy,'ZYX'));
const incoming=new Set(robot.joints.map(j=>j.child));for(const link of robot.links)if(!incoming.has(link.name))basis.add(links.get(link.name));
const pivots=new Map();for(const[index,j]of robot.joints.entries()){
 const origin=new THREE.Group();origin.name=`DbOrigin_${index}`;origin.position.fromArray(j.xyz);origin.quaternion.copy(quaternion(j.rpy));
 const pivot=new THREE.Group();pivot.name=`DbJoint_${index}_${slug(j.name)}`;origin.add(pivot);pivot.add(links.get(j.child));links.get(j.parent).add(origin);pivots.set(j.name,pivot);
}
const selected=robot.links.filter(l=>!arm||armSet.has(l.name));
const loader=new STLLoader(),geometries=new Map(),mapping=[],meshList=[],parts={},groups={};
const reports=new Map(geometry.files.map(f=>[f.file,f]));
for(const link of selected)for(const[index,v]of link.visuals.entries()){
 const prepared=reports.get(v.file);if(!prepared)throw new Error(`Prepare source geometry first: ${v.file}`);
 for(const[si,surface]of prepared.displaySurfaces.entries()){
  let geo=geometries.get(surface.file);if(!geo){const data=await readFile(new URL(`${arm?'derived-arm':'derived'}/${surface.file}`,here));geo=loader.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));geo.clearGroups();geo.normalizeNormals();geometries.set(surface.file,geo);}
  const family=finish(v.file),mesh=new THREE.Mesh(geo,materials[family]);mesh.name=`Db_${slug(link.name)}_${index+1}${si?`_surface${si+1}`:''}`;mesh.position.fromArray(v.xyz);mesh.quaternion.copy(quaternion(v.rpy));mesh.scale.fromArray(v.scale);links.get(link.name).add(mesh);meshList.push(mesh);
  const group=groupFor(link.name),sourceVisualId=`db-${slug(link.name)}-${index+1}`,partId=sourceVisualId+(si?`-surface${si+1}`:'');
  const title=words(link.name)+(si?` · surface ${si+1}`:'');
  parts[mesh.name]={id:partId,title,description:`${title}. Source link ${link.name}; display finish and separated positions are illustrative.`,finishFamily:family};
  (groups[group]??={...(arm?armSystems:systems)[group],meshNames:[]}).meshNames.push(mesh.name);
  mapping.push({id:partId,meshName:mesh.name,title,sourceLink:link.name,sourceFile:v.file,sourceVisualId,sourceVisualIndex:index+1,surface:si+1,surfaceCount:prepared.displaySurfaces.length,derivedFile:surface.file,group,finishFamily:family});
 }
}
root.updateMatrixWorld(true);const sourceBox=new THREE.Box3().setFromObject(root);root.position.y=-sourceBox.min.y;root.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
const visualBoxes=new Map();for(const[index,record]of mapping.entries()){const b=new THREE.Box3().setFromObject(meshList[index]);if(visualBoxes.has(record.sourceVisualId))visualBoxes.get(record.sourceVisualId).union(b);else visualBoxes.set(record.sourceVisualId,b);}
const systemBoxes=new Map();for(const record of mapping){const b=visualBoxes.get(record.sourceVisualId);if(systemBoxes.has(record.group))systemBoxes.get(record.group).union(b);else systemBoxes.set(record.group,b.clone());}
for(const record of mapping){
 const c=visualBoxes.get(record.sourceVisualId).getCenter(new THREE.Vector3()),sys=systemBoxes.get(record.group).getCenter(new THREE.Vector3());let offset;
 if(arm){const d=c.clone().sub(center);offset=[d.x*.5+(record.group==='dropbear-arm-linkages'?.075:-.035),d.y*.12,d.z*.45];}
 else if(record.group==='dropbear-head')offset=[0,.42,0];
 else if(record.group==='dropbear-left-arm'||record.group==='dropbear-right-arm')offset=[Math.sign(sys.x-center.x||1)*.38,.07,.02];
 else if(record.group==='dropbear-left-leg'||record.group==='dropbear-right-leg')offset=[Math.sign(sys.x-center.x||1)*.22,-.18,.015];
 else if(record.group==='dropbear-power')offset=[0,.02,Math.sign(sys.z-center.z||1)*.33];
 else if(record.group==='dropbear-pelvis')offset=[0,-.045,.11];
 else offset=[0,.055,-.13];
 const local=c.clone().sub(sys);const scale=arm?.42:.09;offset=offset.map((v,i)=>v+local.toArray()[i]*scale);parts[record.meshName].explode=offset;
}
for(const[id,g]of Object.entries(groups)){
 const hardware=mapping.filter(r=>r.group===id&&r.finishFamily==='polished');const body=mapping.filter(r=>r.group===id&&r.finishFamily!=='polished');
 g.children=[];if(body.length)g.children.push({id:`${id}-main`,title:'Structure & drives',description:'Source structural and drive components.',meshNames:body.map(r=>r.meshName)});
 if(hardware.length)g.children.push({id:`${id}-hardware`,title:'Connections',description:'Source bearings, pins and fastening components.',meshNames:hardware.map(r=>r.meshName)});
}
// Bake the deep static URDF chain into world transforms before export. Original
// link/joint frames remain in the audit package; the display uses one rigid pivot.
const sourceRest=new Map(meshList.map(mesh=>[mesh.name,mesh.matrixWorld.clone()]));
const linkFrames=new Map([...links].map(([name,node])=>[name,node.matrixWorld.clone()]));
const pivotRest=pivots.get('LH_yaw').matrixWorld.clone();
const pivotInverse=pivotRest.clone().invert();
const displayRoot=new THREE.Group();displayRoot.name=root.name;
const displayPivot=new THREE.Group();displayPivot.name='DropbearShoulderPivot';
pivotRest.decompose(displayPivot.position,displayPivot.quaternion,displayPivot.scale);displayRoot.add(displayPivot);
for(const[index,mesh]of meshList.entries()){
 const moving=armSet.has(mapping[index].sourceLink);
 const matrix=moving?pivotInverse.clone().multiply(sourceRest.get(mesh.name)):sourceRest.get(mesh.name).clone();
 (moving?displayPivot:displayRoot).add(mesh);matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.updateMatrix();
}
displayRoot.updateMatrixWorld(true);
for(const mesh of meshList)if(mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-sourceRest.get(mesh.name).elements[i])>1e-9))throw new Error(`Flattened transform mismatch ${mesh.name}`);
const restPivotQuaternion=displayPivot.quaternion.clone();
const sourceTransforms={schemaVersion:1,sourceRevision:source.revision,modelId:id,flattening:'Static source chains baked offline. Original source hierarchy retained in source-robot.json; source link frames below are +Y display-world metres after a floor translation.',pivot:{sourceJoint:'LH_yaw',displayNode:displayPivot.name,restWorldMatrix:pivotRest.toArray()},links:[...linkFrames].map(([name,matrix])=>({sourceLink:name,worldMatrix:matrix.toArray(),moving:armSet.has(name)})),visuals:mapping.map(record=>({sourceVisualId:record.sourceVisualId,meshName:record.meshName,sourceLink:record.sourceLink,worldMatrix:sourceRest.get(record.meshName).toArray(),visualScale:[.001,.001,.001]})),closures:robot.closures.map(c=>({...c,closureWorld:linkFrames.get(c.relativeTo).clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...c.pose.slice(0,3)),quaternion(c.pose.slice(3)),new THREE.Vector3(1,1,1))).toArray(),parentWorld:linkFrames.get(c.parent).toArray(),childWorld:linkFrames.get(c.child).toArray(),childRelativeToParent:linkFrames.get(c.parent).clone().invert().multiply(linkFrames.get(c.child)).toArray(),moving:armSet.has(c.parent)&&armSet.has(c.child),crossing:armSet.has(c.parent)!==armSet.has(c.child)}))};
const duration=2.5,samples=151,times=Array.from({length:samples},(_,i)=>duration*i/(samples-1));
const values=[],angles=[];const moving=robot.joints.find(j=>j.name==='LH_yaw'),axis=new THREE.Vector3().fromArray(moving.axis).normalize();
for(const t of times){const angle=THREE.MathUtils.degToRad(8)*Math.sin(Math.PI*t/duration)**2;angles.push(angle);values.push(...restPivotQuaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle)).toArray());}
const clip=new THREE.AnimationClip('DropbearArmSwivel',duration,[new THREE.QuaternionKeyframeTrack(`${displayPivot.name}.quaternion`,times,values)]);
if(!clip.validate())throw new Error('Invalid authored clip');
globalThis.FileReader??=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onload?.({target:this});this.onloadend?.({target:this});});}};
const bytes=Buffer.from(await new GLTFExporter().parseAsync(displayRoot,{binary:true,animations:[clip],onlyVisible:true,trs:true}));
const parsed=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const round=[];parsed.scene.traverse(node=>{if(node.isMesh)round.push(node);});if(round.length!==mapping.length)throw new Error('Lost display surface on export');
const sourceMotion={schemaVersion:1,clipName:clip.name,duration,units:'radians',driveJoint:'LH_yaw',axis:moving.axis,times,values:angles,limits:[moving.limit.lower,moving.limit.upper],basis:'Illustrative rigid subtree swivel. Every other source joint is held; no closed-loop solving or walking.',closureNames:robot.leftArm.closureNames};
const pairMatrices=new Map();const mix=new THREE.AnimationMixer(parsed.scene),action=mix.clipAction(parsed.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
const rest=new Map();for(const t of[0,duration/2,duration]){mix.setTime(t);parsed.scene.updateMatrixWorld(true);for(const mesh of round){if(t===0){rest.set(mesh.name,[...mesh.matrixWorld.elements]);if(mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-sourceRest.get(mesh.name).elements[i])>3e-6))throw new Error(`Export rest mismatch ${mesh.name}`);}if(t===duration&&mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-rest.get(mesh.name)[i])>3e-6))throw new Error(`Neutral mismatch ${mesh.name}`);}}
const selectedClosures=robot.closures.filter(c=>!arm||armSet.has(c.parent)&&armSet.has(c.child));
const title=arm?'Dropbear left arm':'Dropbear humanoid';const groupList=Object.entries(groups).map(([id,g])=>({id,...g}));
const definition={schemaVersion:1,id,rootId:id,title,shortTitle:arm?'Dropbear arm':'Dropbear',licenseFile:'LICENSE.txt',tour:'authored-tour.json',provenance:{author:'Pointblank LLC / Hyperspawn; display adaptation by Annora',url:'https://github.com/Hyperspawn/dropbear_urdf',license:'MIT',attribution:'Dropbear · Pointblank LLC / Hyperspawn · MIT. Display adaptation and illustrative motion: Annora, 2026.',description:arm?'The source left-arm shoulder subtree and its internal tendon relationships.':'An open-source humanoid presented through source-linked structural assemblies.',note:'Source joint frames and component identity retained. Simplified display geometry, curated finishes and illustrative separation. Only a rigid whole-arm swivel is animated; internal closed-linkage joints remain fixed. Not a solved linkage, walking simulation or manufacturing release.'},view:{direction:arm?[1,.5,1.5]:[2.5,.5,1.4],normalizedWidth:arm?1.25:1.45,labels:['Hero','Reverse'],facts:[{label:'Source visuals',value:String(new Set(mapping.map(r=>r.sourceVisualId)).size)},{label:'Closure relationships',value:String(selectedClosures.length)}]},creaseAngle:32,groups:groupList,parts,operation:{clipName:clip.name,duration,stages:[{at:0,title:'Arm at rest',description:'All internal source joints are held at their imported pose.',nodeId:arm?id:'dropbear-left-arm'},{at:.4,title:'Shoulder swivel',description:'The whole shoulder subtree turns together; internal tendon relationships stay fixed.',nodeId:arm?id:'dropbear-left-arm'},{at:.99,title:'Back at rest',description:'The original rigid transforms are restored.',nodeId:id}]},presentationPolicy:{actionDuration:2.5,explosion:{separationProfiles:Object.fromEntries(groupList.map((g,i)=>[g.id,[Math.min(.12+i*.045,.45),Math.min(.72+i*.035,1)]]))}}};
const cam=(focusId,direction,explosion=0,scale=1)=>({focusId,direction,explosion,scale});
const hero=arm?[1,.5,1.5]:[2.5,.5,1.4];
const base=(key,label,title,caption,extra={})=>({id:key,label,title,caption,duration:2.5,previewAt:0,settledAt:2.5,transition:2.1,transitionStart:.1,scopeId:id,selectedId:id,renderStyle:'engineering',highlightIds:[],explosion:[0,0],camera:cam(id,hero),annotations:[],cues:[],...extra});
const focus=arm?'dropbear-arm-linkages':'dropbear-left-arm';
const chapters=[
 base('whole','Meet',arm?'A complete arm assembly.':'A humanoid, assembly by assembly.',arm?'Start with the shoulder, frame and tendon relationships.':'Open Dropbear through its source-linked mechanical structure.'),
 base('approach','Arm','Follow the shoulder into the arm.','Locate the mechanism before opening its layers.',{camera:cam(arm?'dropbear-arm-shoulder':focus,(arm?[1.5,.4,1.6]:[1.5,.4,-1.6]),0,1.4),cues:[{id:'locate-arm',at:.65,highlightIds:[arm?'dropbear-arm-shoulder':focus]}]}),
 base('open','Open','Separate the source assemblies.','Panels, frame and connections move in authored layers.',{explosion:[0,.4],camera:cam(id,hero,.4),cues:[{id:'layers',at:.65,highlightIds:[arm?'dropbear-arm-structure':'dropbear-torso']}]}),
 base('layers','Layers','Read the connected layers.','Structural members and drive modules retain their identity.',{explosion:[.4,1],camera:cam(id,[1.7,.65,2],1),cues:[{id:'arm',at:.7,highlightIds:[focus]}]}),
 base('detail','Detail','Keep the linkage in view.','Tendons and bearings stay related in the assembled mechanism.',{explosion:[1,1],renderStyle:'linework',camera:cam(focus,(arm?[1.2,.5,1.8]:[1.2,.5,-1.8]),1,1.25),cues:[{id:'emphasis',at:.7,renderStyle:'flat',highlightIds:[focus]}]}),
 base('restore','Restore','Return every component.','The same paths recover the original rigid transforms.',{explosion:[1,0],camera:cam(id,hero,1)}),
 base('motion','Motion','One shoulder swivel.','The whole arm turns; internal elbow and tendon joints stay fixed.',{camera:cam(arm?id:focus,(arm?[1.3,.45,1.7]:[1.3,.45,-1.7]),0,1.3),highlightIds:[arm?'dropbear-arm-shoulder':focus],operation:{clipName:clip.name,sourceDuration:duration,settledProgress:1,passes:[{id:'whole-arm-swivel',start:0,duration:2.5,keyframes:[{at:0,progress:0},{at:2.5,progress:1}]}]}}),
 base('explore','Explore','Now inspect the assembly.','Rotate, select a source component, or replay the presentation.')
];
const tour={id:arm?'dropbear-arm-proof':'dropbear-showcase',title:arm?'Inside the Dropbear arm':'Inside Dropbear',duration:20,playback:'continuous',chapters};
await writeFile(new URL(dir+'authored-tour.json',here),JSON.stringify(tour,null,2)+'\n');
const report={schemaVersion:1,modelId:id,sourceRevision:source.revision,sourceVisuals:new Set(mapping.map(r=>r.sourceVisualId)).size,displayMeshes:mapping.length,referencedSourceTriangles:selected.reduce((n,l)=>n+l.visuals.reduce((k,v)=>k+reports.get(v.file).sourceTriangles,0),0),referencedDisplayTriangles:selected.reduce((n,l)=>n+l.visuals.reduce((k,v)=>k+reports.get(v.file).displayTriangles,0),0),uniqueGeometries:geometries.size,bounds:[box.min.toArray(),box.max.toArray()],dimensions:size.toArray(),sourceUnits:'STL millimetres, URDF metres; visual scale0.001 retained exactly once',displayUp:'+Y',floorTranslation:root.position.y,animatedJoint:'LH_yaw',internalJointsHeld:true,closureCount:selectedClosures.length,closureRelationships:selectedClosures,armRoot:robot.leftArm.rootLink,armLinks:robot.leftArm.links,glbBytes:bytes.length,glbSha256:sha(bytes),neutralChecks:[0,duration]};
const license=await readFile(new URL('source/LICENSE.txt',here),'utf8');await writeFile(new URL('LICENSE.txt',here),`${license}\n\nDisplay conversion, derived simplification, source mappings, illustrative finishes, explosion and whole-arm swivel: Annora, 2026. Original source and pinned hashes are preserved with these preparation files. No noncommercial WBC policies, rollouts or motions are included.\n`);
await writeFile(new URL(dir+'LICENSE.txt',here),await readFile(new URL('LICENSE.txt',here)));
for(const[file,value]of[['import-definition.json',definition],['component-map.json',mapping],['motion-curves.json',sourceMotion],['source-transforms.json',sourceTransforms],['conversion-report.json',report]])await writeFile(new URL(dir+file,here),JSON.stringify(value,null,2)+'\n');
await writeFile(new URL(dir+'model.glb',here),bytes);console.log(JSON.stringify(report,null,2).slice(0,1800));

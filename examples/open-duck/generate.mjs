/** Open Duck Mini display preparation. Source assets: Antoine Pirrone, Apache-2.0.
 * Conversion and illustrative presentation clip: Annora, 2026.
 * The pinned original STL and URDF bytes remain in source/.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const here = new URL('./', import.meta.url);
const readJSON = async file => JSON.parse(await readFile(new URL(file, here), 'utf8'));
const robot = await readJSON('source-robot.json');
const geometryReport = await readJSON('geometry-report.json');
const sourceManifest = await readJSON('source-manifest.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const title = value => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const slug = value => value.replace(/\.stl$/i, '').replaceAll('_', '-').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
const duration = 5;

// Canonical display home from the pinned viewer's joints.ts; joint angles are
// degrees. This is a display pose, not a balance or hardware calibration claim.
const home = {
  left_hip_yaw:.11, left_hip_roll:3.04, left_hip_pitch:-36.09, left_knee:78.38, left_ankle:-44.92,
  right_hip_yaw:-.17, right_hip_roll:-3.72, right_hip_pitch:36.38, right_knee:79.01, right_ankle:-45.61,
  neck_pitch:0, head_pitch:0, head_yaw:0, head_roll:0, left_antenna:0, right_antenna:0,
};
const groupDefinitions = {
  'duck-body': {title:'Body & power', description:'Source body enclosure, battery, controller and power electronics.'},
  'duck-head': {title:'Head & neck', description:'The source head housing and four-axis neck/head mechanism.'},
  'duck-left-leg': {title:'Left leg', description:'Five source revolute joints connect the left hip, knee, ankle and foot.'},
  'duck-right-leg': {title:'Right leg', description:'Five source revolute joints connect the right hip, knee, ankle and foot.'},
  'duck-antennas': {title:'Antennas', description:'The two independently driven source antenna assemblies.'},
};
const linkGroup = name => name.includes('antenna') ? 'duck-antennas'
  : ['trunk_assembly','trunk'].includes(name) ? 'duck-body'
  : ['hip_roll_assembly','left_roll_to_pitch_assembly','knee_and_ankle_assembly','knee_and_ankle_assembly_2','foot_assembly','left_foot'].includes(name) ? 'duck-left-leg'
  : ['hip_roll_assembly_2','right_roll_to_pitch_assembly','knee_and_ankle_assembly_3','knee_and_ankle_assembly_4','foot_assembly_2','right_foot'].includes(name) ? 'duck-right-leg'
  : 'duck-head';
const shell = name => /^(body_|battery_pack_lid|head\.stl|left_cache|right_cache|foot_top|foot_side|antenna\.stl)/.test(name);
const finish = file => /^(body_|battery_pack_lid|head\.stl|left_cache|right_cache|foot_top|foot_side)/.test(file) ? 'coatedWhite'
  : /bearing|palonier|spacer/.test(file) ? 'polished'
  : /sheet|to_pitch|to_yaw|to_roll|neck_|trunk_/.test(file) ? 'structure'
  : /antenna\.stl/.test(file) ? 'indicator'
  : /wj-wk|motor|sg90|raspberry|board|bno055|bms|cell|power_switch|usb|holder|tpu/.test(file) ? 'polymer' : 'machined';
const specs = {
  coatedWhite:['Coated white shell','#d9dcd8',.08,.6], structure:['Structural satin','#a7aeb8',.75,.46],
  polished:['Bright hardware','#d6dce3',.95,.25], machined:['Dark machined','#656a70',.9,.38],
  polymer:['Graphite mechanisms','#292b30',.03,.7], indicator:['Ember antenna','#b7452d',.05,.42],
};
const materials = Object.fromEntries(Object.entries(specs).map(([family,[name,color,metalness,roughness]]) =>
  [family, Object.assign(new THREE.MeshStandardMaterial({color,metalness,roughness}),{name})]));
const root = new THREE.Group(); root.name='OpenDuck';
const basis = new THREE.Group(); basis.name='URDF_Z_Up'; basis.rotation.x=-Math.PI/2; root.add(basis);
const links = new Map(robot.links.map(link => { const object=new THREE.Group(); object.name=`DuckLink_${link.name}`; return [link.name,object]; }));
const incoming = new Set(robot.joints.map(joint=>joint.child));
for(const link of robot.links) if(!incoming.has(link.name)) basis.add(links.get(link.name));
const pivots = new Map();
const quaternionRPY = ([r,p,y]) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r,p,y,'ZYX'));
for(const joint of robot.joints) {
  const origin=new THREE.Group(); origin.name=`DuckOrigin_${joint.name}`; origin.position.fromArray(joint.xyz);origin.quaternion.copy(quaternionRPY(joint.rpy));
  const pivot=new THREE.Group();pivot.name=`DuckJoint_${joint.name}`;
  if(joint.type==='revolute') pivot.quaternion.setFromAxisAngle(new THREE.Vector3().fromArray(joint.axis).normalize(),THREE.MathUtils.degToRad(home[joint.name]||0));
  links.get(joint.parent).add(origin);origin.add(pivot);pivot.add(links.get(joint.child));pivots.set(joint.name,pivot);
}
const loader = new STLLoader(), geometries=new Map(), parts={}, mapping=[], meshList=[];
const displayFiles = new Map(geometryReport.files.map(record=>[record.file,record.displaySurfaces]));
for(const link of robot.links) {
  const group=linkGroup(link.name);
  for(const [index,visual] of link.visuals.entries()) {
    const surfaces=displayFiles.get(visual.file);
    if(!surfaces?.length) throw new Error(`Missing derived geometry: ${visual.file}`);
    for(const [surfaceIndex,surface] of surfaces.entries()) {
      let geometry=geometries.get(surface.file);
      if(!geometry) {
        const data=await readFile(new URL(`derived/${surface.file}`,here));
        geometry=loader.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
        geometry.clearGroups();geometry.computeBoundingBox();geometry.normalizeNormals();geometries.set(surface.file,geometry);
      }
      const family=finish(visual.file), object=new THREE.Mesh(geometry,materials[family]);
      const suffix=surfaceIndex?`_surface${surfaceIndex+1}`:'';
      object.name=`Duck_${link.name}_${String(index+1).padStart(2,'0')}_${visual.file.replace('.stl','')}${suffix}`;
      object.position.fromArray(visual.xyz);object.quaternion.copy(quaternionRPY(visual.rpy));object.scale.fromArray(visual.scale);
      links.get(link.name).add(object);meshList.push(object);
      const sourceVisualId=`duck-${slug(link.name)}-${index+1}-${slug(visual.file)}`;
      const partId=sourceVisualId+(surfaceIndex?`-surface${surfaceIndex+1}`:'');
      const partTitle=title(visual.file.replace('.stl','')).replace(/^Wj Wk.*$/,'Servo case')+(surfaceIndex?` · surface ${surfaceIndex+1}`:'');
      const isShell=shell(visual.file);
      parts[object.name]={id:partId,title:partTitle,description:`${partTitle} from the pinned Open Duck ${title(link.name)} source visual. Display finish and separation are illustrative.`,finishFamily:family};
      (groupDefinitions[group].meshNames??=[]).push(object.name);
      mapping.push({id:partId,meshName:object.name,title:partTitle,sourceFile:visual.file,sourceLink:link.name,sourceVisualIndex:index+1,sourceVisualId,surface:surfaceIndex+1,surfaceCount:surfaces.length,derivedFile:surface.file,group,shell:isShell,finishFamily:family});
    }
  }
}
root.updateMatrixWorld(true);
const originalBox=new THREE.Box3().setFromObject(root);
root.position.y=-originalBox.min.y;root.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
const groupOffsets={
  'duck-body':[0,.015,-.02], 'duck-head':[.025,.15,0],
  'duck-left-leg':[0,-.015,-.12], 'duck-right-leg':[0,-.015,.12],
  'duck-antennas':[.02,.23,0],
};
const visualBoxes=new Map();
for(const [index,record] of mapping.entries()) {
  const memberBox=new THREE.Box3().setFromObject(meshList[index]);
  const combined=visualBoxes.get(record.sourceVisualId);
  if(combined) combined.union(memberBox);else visualBoxes.set(record.sourceVisualId,memberBox);
}
for(const record of mapping) {
  const center=visualBoxes.get(record.sourceVisualId).getCenter(new THREE.Vector3());
  let offset=[...groupOffsets[record.group]];
  if(record.shell) {
    if(record.sourceFile==='body_front.stl') offset=[.14,.03,0];
    else if(record.sourceFile==='body_back.stl') offset=[-.15,.04,0];
    else if(record.sourceFile==='head.stl') offset=[.075,.23,.025];
    else offset=offset.map((v,i)=>v+(center.toArray()[i]-box.getCenter(new THREE.Vector3()).toArray()[i])*.5);
  }
  // Source units are metres. Distinct shell and internal offsets support the
  // optional separation-time profile without changing assembled geometry.
  parts[record.meshName].explode=offset;
}
for(const [id,group] of Object.entries(groupDefinitions)) {
  group.children=[];
  for(const [suffix,label,predicate] of [['shell','Outer panels',r=>r.shell],['core','Mechanism & electronics',r=>!r.shell]]) {
    const records=mapping.filter(record=>record.group===id&&predicate(record));
    if(records.length) group.children.push({id:`${id}-${suffix}`,title:label,description:`Source-defined ${label.toLowerCase()} in ${group.title.toLowerCase()}.`,meshNames:records.map(record=>record.meshName)});
  }
}

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const keyPoses=[
  {t:0,pose:{}}, {t:.65,pose:{head_yaw:28,head_roll:-6,left_antenna:25,right_antenna:-20}},
  {t:1.5,pose:{head_yaw:-25,head_roll:5,left_antenna:-20,right_antenna:25}},
  {t:2.5,pose:{}}, {t:3.2,pose:{neck_pitch:-9,head_pitch:-6,left_hip_pitch:-39,right_hip_pitch:39,left_knee:82,right_knee:82,left_ankle:-47,right_ankle:-47}},
  {t:3.65,pose:{neck_pitch:-9,head_pitch:-6,left_hip_pitch:-39,right_hip_pitch:39,left_knee:82,right_knee:82,left_ankle:-47,right_ankle:-47}},
  {t:5,pose:{}},
];
function poseAt(time) {
  let right=keyPoses.findIndex(key=>key.t>=time);if(right<0)right=keyPoses.length-1;
  const a=keyPoses[Math.max(0,right-1)],b=keyPoses[right],k=a===b?0:smooth((time-a.t)/(b.t-a.t));
  return Object.fromEntries(Object.keys(home).map(name=>[name,(a.pose[name]??home[name])+((b.pose[name]??home[name])-(a.pose[name]??home[name]))*k]));
}
const samples=301,times=Array.from({length:samples},(_,index)=>duration*index/(samples-1));
const curves={schemaVersion:1,clipName:'DuckPresentation',sourceDuration:duration,units:'degrees',basis:'Illustrative authored pose; not live robot telemetry.',home,phases:[{id:'scan',start:0,end:2.5},{id:'gesture',start:2.5,end:5}],joints:{}};
const tracks=[];
for(const joint of robot.joints.filter(joint=>joint.type==='revolute')) {
  const axis=new THREE.Vector3().fromArray(joint.axis).normalize(), values=[],angles=[];
  for(const t of times) {
    const degrees=poseAt(t)[joint.name],radians=THREE.MathUtils.degToRad(degrees);
    if(radians<joint.limit.lower-1e-8||radians>joint.limit.upper+1e-8) throw new Error(`Authored angle outside source joint limit: ${joint.name}`);
    angles.push(degrees);values.push(...new THREE.Quaternion().setFromAxisAngle(axis,radians).toArray());
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${pivots.get(joint.name).name}.quaternion`,times,values));
  curves.joints[joint.name]={times,values:angles,limits:[THREE.MathUtils.radToDeg(joint.limit.lower),THREE.MathUtils.radToDeg(joint.limit.upper)]};
}
const clip=new THREE.AnimationClip('DuckPresentation',duration,tracks);if(!clip.validate())throw new Error('Invalid motion clip.');
globalThis.FileReader??=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onload?.({target:this});this.onloadend?.({target:this});});}};
const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:[clip],onlyVisible:true,trs:true}));
const decoded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const roundTrip=[];decoded.scene.traverse(node=>{if(node.isMesh)roundTrip.push(node);});
if(roundTrip.length!==mapping.length||new Set(roundTrip.map(mesh=>mesh.name)).size!==mapping.length)throw new Error('Source visual identities did not round-trip.');
const expectedNames=new Set(mapping.map(record=>record.meshName));
if(roundTrip.some(mesh=>!expectedNames.has(mesh.name)))throw new Error('Export changed a loaded mesh identity.');
const mixer=new THREE.AnimationMixer(decoded.scene), action=mixer.clipAction(decoded.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
const rest=new Map();for(const t of [0,2.5,5]){mixer.setTime(t);decoded.scene.updateMatrixWorld(true);for(const mesh of roundTrip){const matrix=mesh.matrixWorld.elements;if(t===0)rest.set(mesh.name,[...matrix]);else if(matrix.some((v,i)=>Math.abs(v-rest.get(mesh.name)[i])>2e-6))throw new Error(`Neutral boundary mismatch ${mesh.name} at ${t}`);}}
const definition={
  schemaVersion:1,id:'open-duck',rootId:'open-duck',title:'Open Duck Mini v2',shortTitle:'Open Duck',
  provenance:{author:'Antoine Pirrone / Open Duck Mini contributors; display adaptation by Annora',url:'https://github.com/apirrone/Open_Duck_Mini',license:'Apache-2.0',attribution:'Open Duck Mini v2 · Antoine Pirrone and contributors · Apache-2.0. Display adaptation and authored motion: Annora, 2026.',description:'An open-source sixteen-joint biped presented as source-linked mechanical assemblies.',note:'Derived display geometry is simplified from pinned source STL files. Finishes, exploded offsets and pose animation are illustrative; not manufacturing data, learned walking or a physically balanced simulation.'},
  licenseFile:'LICENSE.txt',tour:'authored-tour.json',view:{direction:[1.5,.85,1.5],normalizedWidth:4.4,labels:['Hero','Reverse'],facts:[{label:'Articulated joints',value:'16'},{label:'Source visuals',value:'131'}]},
  creaseAngle:32,groups:Object.entries(groupDefinitions).map(([id,group])=>({id,...group})),parts,
  operation:{clipName:clip.name,duration,stages:[
    {at:0,title:'Look around',description:'Illustrative head and antenna scan from the source joint axes.',nodeId:'duck-head'},
    {at:.5,title:'A small greeting',description:'A restrained bow and leg pose within source joint limits. This is not balance simulation.',nodeId:'duck-body'},
    {at:.99,title:'Back to neutral',description:'All articulated source transforms return to the assembled display pose.',nodeId:'open-duck'},
  ]},presentationPolicy:{actionDuration:2.5,explosion:{separationProfiles:{
    'duck-body':[.2,.85], 'duck-head':[.2,.7], 'duck-antennas':[.25,.9],
    'duck-left-leg':[.35,1], 'duck-right-leg':[.35,1],
    ...Object.fromEntries(mapping.filter(record=>record.shell).map(record=>[record.id,[0,.45]])),
  }}},
};
const originalLicense=await readFile(new URL('source/LICENSE',here),'utf8');const notice=await readFile(new URL('source/NOTICE',here),'utf8');
await writeFile(new URL('LICENSE.txt',here),`${notice}\n\n${originalLicense}\n\nDisplay conversion, mesh simplification, material curation and illustrative animation: Annora, 2026. Modified files and pinned source hashes are recorded in source-manifest.json and geometry-report.json.\n`);
for(const [file,value] of [['import-definition.json',definition],['component-map.json',mapping],['motion-curves.json',curves]])await writeFile(new URL(file,here),JSON.stringify(value,null,2)+'\n');
await writeFile(new URL('model.glb',here),bytes);
const audit={schemaVersion:1,source:sourceManifest,geometry:geometryReport,display:{up:'+Y',sourceUnits:'metres (URDF)',bounds:[box.min.toArray(),box.max.toArray()],dimensions:size.toArray(),rootFloorTranslation:root.position.y,sourceVisualInstances:new Set(mapping.map(record=>record.sourceVisualId)).size,meshInstances:mapping.length,groups:Object.keys(groupDefinitions),jointCount:robot.joints.filter(joint=>joint.type==='revolute').length,sourceClip:clip.name,sourceDuration:duration,neutralChecks:[0,2.5,5],glbBytes:bytes.length,glbSha256:sha256(bytes)},licenseSha256:sha256(Buffer.from(originalLicense)),noticeSha256:sha256(Buffer.from(notice))};
await writeFile(new URL('conversion-report.json',here),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit.display,null,2));

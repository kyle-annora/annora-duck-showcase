import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const base=new URL('../examples/hexapod/',import.meta.url),prepared=new URL('../content/models/hexapod/',import.meta.url);
const read=(name,root=base)=>readFile(new URL(name,root)),json=async(name,root)=>JSON.parse(await read(name,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function load(){const bytes=await read('model.glb');return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}

test('Hexapod source hashes and every derived display facet match the pinned package',async()=>{
 const source=await json('source-manifest.json'),geometry=await json('geometry-report.json');
 assert.equal(source.revision,'f8ee8084d48470283d5ca23394d5a4b9590ad9e8');
 for(const file of source.files){const b=await read(`source/${file.file}`);assert.equal(b.length,file.bytes);assert.equal(hash(b),file.sha256,file.file);}
 assert.equal(geometry.files.length,11);assert.equal(geometry.referencedSourceTriangles,517230);assert.ok(geometry.referencedDisplayTriangles<=250000);
 for(const file of geometry.files){let triangles=0;for(const surface of file.displaySurfaces){const b=await read(`derived/${surface.file}`);assert.equal(hash(b),surface.sha256);assert.equal(b.readUInt32LE(80),surface.triangles);triangles+=surface.triangles;}assert.equal(triangles,file.displayTriangles);}
});

test('Hexapod preserves all 72 source visuals and their source-frame world transforms',async()=>{
 const robot=await json('source-robot.json'),map=await json('component-map.json'),definition=await json('import-definition.json'),audit=await json('conversion-report.json');
 assert.equal(robot.links.length,72);assert.equal(robot.joints.length,71);assert.equal(robot.joints.filter(j=>j.type==='revolute').length,18);
 assert.equal(new Set(map.map(r=>r.sourceVisualId)).size,72);assert.equal(new Set(map.map(r=>r.id)).size,map.length);assert.equal(new Set(map.map(r=>r.meshName)).size,map.length);
 const gltf=await load();gltf.scene.updateMatrixWorld(true);
 const rpymatrix=([r,p,y])=>new THREE.Matrix4().makeRotationZ(y).multiply(new THREE.Matrix4().makeRotationY(p)).multiply(new THREE.Matrix4().makeRotationX(r));
 const transform=(xyz,rpy)=>new THREE.Matrix4().makeTranslation(...xyz).multiply(rpymatrix(rpy));
 const root=new THREE.Matrix4().makeTranslation(0,audit.display.rootFloorTranslation,0).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2));
 const byChild=new Map(robot.joints.map(j=>[j.child,j])),world=new Map();
 function linkMatrix(name){if(world.has(name))return world.get(name);const j=byChild.get(name);let m;if(!j)m=root.clone();else{m=linkMatrix(j.parent).clone().multiply(transform(j.xyz,j.rpy));if(j.type==='revolute')m.multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3().fromArray(j.axis).normalize(),THREE.MathUtils.degToRad(audit.display.home[j.name])));}world.set(name,m);return m;}
 for(const link of robot.links)for(const [i,v]of link.visuals.entries()){
  const members=map.filter(r=>r.sourceLink===link.name&&r.sourceVisualIndex===i+1);assert.ok(members.length);
  const expected=linkMatrix(link.name).clone().multiply(transform(v.xyz,v.rpy)).multiply(new THREE.Matrix4().makeScale(...v.scale));
  for(const r of members){const mesh=gltf.scene.getObjectByName(r.meshName);assert.ok(mesh?.isMesh);assert.equal(r.sourcePath,v.path);for(let k=0;k<16;k++)assert.ok(Math.abs(mesh.matrixWorld.elements[k]-expected.elements[k])<2e-6,`${r.meshName}:${k}`);assert.deepEqual(definition.parts[r.meshName].explode,definition.parts[members[0].meshName].explode,'partitioned visual surfaces move together');}
 }
 assert.equal(hash(await read('model.glb')),hash(await read('model.glb',prepared)));
 const metadata=await json('metadata.json',prepared);assert.equal(metadata.source.sha256,hash(await read('model.glb')));
 for(const group of definition.groups)assert.deepEqual(new Set(group.children.flatMap(c=>c.meshNames)),new Set(group.meshNames));
});

test('Hexapod leg action lifts and reaches, obeys source limits, and restores every rigid visual',async()=>{
 const robot=await json('source-robot.json'),curves=await json('motion-curves.json');const gltf=await load();assert.equal(gltf.animations.length,1);
 const clip=gltf.animations[0];assert.equal(clip.name,'HexapodLegReach');assert.equal(clip.duration,2.5);assert.equal(clip.tracks.length,18);
 const sourceJoints=new Map(robot.joints.filter(j=>j.type==='revolute').map(j=>[j.name,j]));
 for(const [name,curve]of Object.entries(curves.joints)){const j=sourceJoints.get(name);assert.ok(j);assert.equal(curve.values[0],curves.home[name]);assert.equal(curve.values.at(-1),curves.home[name]);for(const deg of curve.values){const rad=THREE.MathUtils.degToRad(deg);assert.ok(rad>=j.limit.lower-1e-8&&rad<=j.limit.upper+1e-8);if(name.endsWith('_tibia'))assert.ok(deg>=-120);}assert.ok(clip.tracks.some(t=>t.name===`HexJoint_${name}.quaternion`));}
 const mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 const meshes=[];gltf.scene.traverse(n=>{if(n.isMesh)meshes.push(n);});const rest=new Map();mixer.setTime(0);gltf.scene.updateMatrixWorld(true);for(const mesh of meshes)rest.set(mesh.name,[...mesh.matrixWorld.elements]);
 const tibia=gltf.scene.getObjectByName('Hex_leg_1_tibia_1'),position=tibia.geometry.getAttribute('position');let tip,lowest=Infinity;
 for(let i=0;i<position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(position,i);const y=p.clone().applyMatrix4(tibia.matrixWorld).y;if(y<lowest){lowest=y;tip=p;}}
 const initial=tip.clone().applyMatrix4(tibia.matrixWorld);mixer.setTime(1.25);gltf.scene.updateMatrixWorld(true);const extended=tip.clone().applyMatrix4(tibia.matrixWorld);assert.ok(extended.y-initial.y>.03,'front-right foot lifts more than 30mm');assert.ok(Math.hypot(extended.x-initial.x,extended.z-initial.z)>.02,'foot reaches more than 20mm');
 for(const mesh of meshes.filter(m=>/^Hex_leg_[2-6]_/.test(m.name)))for(let i=0;i<16;i++)assert.ok(Math.abs(mesh.matrixWorld.elements[i]-rest.get(mesh.name)[i])<2e-6,'other five legs remain fixed');
 mixer.setTime(2.5);gltf.scene.updateMatrixWorld(true);for(const mesh of meshes)for(let i=0;i<16;i++)assert.ok(Math.abs(mesh.matrixWorld.elements[i]-rest.get(mesh.name)[i])<2e-6,'exact rigid neutral restoration');
});

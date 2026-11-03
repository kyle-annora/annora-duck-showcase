import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const base=new URL('../examples/open-duck/',import.meta.url);
const packageBase=new URL('../content/models/open-duck/',import.meta.url);
const bytes=(name,root=base)=>readFile(new URL(name,root));
const json=async(name,root)=>JSON.parse(await bytes(name,root));
const hash=value=>createHash('sha256').update(value).digest('hex');

// These checks protect model identity and reversible movement, not UI snapshots.
test('Open Duck pinned source and derived surfaces match their audit hashes',async()=>{
  const source=await json('source-manifest.json');
  assert.equal(source.revision,'dfdb84ef3ae2405e5f115b32f48471331dc65d78');
  for(const file of source.files){
    const actual=await bytes(`source/${file.file}`);
    assert.equal(actual.length,file.bytes,file.file);
    assert.equal(hash(actual),file.sha256,file.file);
  }
  const geometry=await json('geometry-report.json');
  assert.equal(geometry.files.length,45);
  assert.equal(geometry.referencedSourceTriangles,2423386);
  for(const file of geometry.files){
    let triangles=0;
    for(const surface of file.displaySurfaces){
      const actual=await bytes(`derived/${surface.file}`);
      assert.equal(hash(actual),surface.sha256,surface.file);
      assert.equal(actual.readUInt32LE(80),surface.triangles,surface.file);
      triangles+=surface.triangles;
    }
    assert.equal(triangles,file.displayTriangles,file.file);
  }
});

test('Open Duck preserves all source visual identities through the generic package',async()=>{
  const robot=await json('source-robot.json'),map=await json('component-map.json');
  const definition=await json('import-definition.json');
  const geometry=await json('geometry-report.json');
  const geometries=new Map(geometry.files.map(record=>[record.file,record]));
  const expectedVisuals=robot.links.reduce((n,link)=>n+link.visuals.length,0);
  assert.equal(expectedVisuals,131);
  assert.equal(new Set(map.map(record=>record.sourceVisualId)).size,expectedVisuals);
  assert.equal(new Set(map.map(record=>record.id)).size,map.length);
  assert.equal(new Set(map.map(record=>record.meshName)).size,map.length);
  for(const link of robot.links)for(const [index,visual]of link.visuals.entries()){
    const candidates=map.filter(record=>record.sourceLink===link.name&&record.sourceVisualIndex===index+1);
    assert.equal(candidates.length,geometries.get(visual.file).displaySurfaces.length,`${link.name}:${index}`);
    assert.ok(candidates.every(record=>record.sourceFile===visual.file));
    const offsets=candidates.map(record=>definition.parts[record.meshName].explode);
    for(const offset of offsets) assert.deepEqual(offset,offsets[0],'partitioned visual surfaces separate together');
  }
  const groupMembers=definition.groups.flatMap(group=>group.meshNames);
  assert.equal(groupMembers.length,map.length);
  assert.equal(new Set(groupMembers).size,map.length);
  for(const group of definition.groups){
    assert.deepEqual(new Set(group.children.flatMap(child=>child.meshNames)),new Set(group.meshNames));
  }
  const source=await bytes('model.glb'),prepared=await bytes('model.glb',packageBase);
  assert.equal(hash(prepared),hash(source));
  const report=await json('conversion-report.json');
  assert.equal(report.display.glbSha256,hash(source));
  assert.equal(report.display.sourceVisualInstances,131);
  assert.equal(report.display.meshInstances,map.length);
  assert.ok(geometry.referencedDisplayTriangles<=450000,'display geometry within approved preparation budget');
  const metadata=await json('metadata.json',packageBase);
  assert.equal(metadata.source.sha256,hash(source));
  assert.deepEqual(metadata.bounds,report.display.bounds);
});

test('Open Duck source-joint animation stays within limits and returns every rigid visual to neutral',async()=>{
  const robot=await json('source-robot.json'),curves=await json('motion-curves.json');
  const source=await bytes('model.glb');
  const gltf=await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');
  assert.equal(gltf.animations.length,1);
  const clip=gltf.animations[0];
  assert.equal(clip.name,'DuckPresentation');
  assert.equal(clip.duration,5);
  const joints=robot.joints.filter(joint=>joint.type==='revolute');
  assert.equal(clip.tracks.length,joints.length);
  assert.equal(joints.length,16);
  for(const joint of joints){
    assert.ok(clip.tracks.some(track=>track.name===`DuckJoint_${joint.name}.quaternion`));
    const samples=curves.joints[joint.name];
    assert.equal(samples.values.length,samples.times.length);
    for(const value of samples.values){
      const radians=THREE.MathUtils.degToRad(value);
      assert.ok(radians>=joint.limit.lower-1e-7&&radians<=joint.limit.upper+1e-7,joint.name);
    }
    for(const time of [0,2.5,5]){
      const index=samples.times.indexOf(time);
      assert.ok(index>=0);
      assert.ok(Math.abs(samples.values[index]-curves.home[joint.name])<1e-8,joint.name);
    }
  }
  const meshes=[];gltf.scene.traverse(node=>{if(node.isMesh)meshes.push(node);});
  const map=await json('component-map.json');
  assert.equal(meshes.length,map.length);
  const actionMixer=new THREE.AnimationMixer(gltf.scene);
  const action=actionMixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const neutral=new Map();
  for(const time of [0,2.5,5]){
    actionMixer.setTime(time);gltf.scene.updateMatrixWorld(true);
    for(const mesh of meshes){
      const matrix=mesh.matrixWorld.elements;
      if(time===0)neutral.set(mesh.name,[...matrix]);
      else assert.ok(matrix.every((value,index)=>Math.abs(value-neutral.get(mesh.name)[index])<2e-6),`${mesh.name}@${time}`);
    }
  }
});

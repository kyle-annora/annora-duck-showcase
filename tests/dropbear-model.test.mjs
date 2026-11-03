import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const base=new URL('../examples/dropbear/',import.meta.url);
const bytes=(file,root=base)=>readFile(new URL(file,root));
const json=async(file,root)=>JSON.parse(await bytes(file,root));
const hash=value=>createHash('sha256').update(value).digest('hex');
const close=(actual,expected,tolerance=3e-6)=>assert.ok(actual.every((value,index)=>Math.abs(value-expected[index])<tolerance),`matrix/bounds deviation exceeds ${tolerance}`);
const variants=[{folder:'arm',id:'dropbear-arm',visuals:68,closures:3,tour:'dropbear-arm-proof'},{folder:'whole',id:'dropbear',visuals:668,closures:27,tour:'dropbear-showcase'}];

test('Dropbear pinned MIT inventory and source relationship audit remain intact',async()=>{
  const source=await json('source-manifest.json'),robot=await json('source-robot.json');
  assert.equal(source.revision,'9bac53d0dee196c62620eee9e8a0fa255a0ff5fa');
  assert.equal(source.repository,'Hyperspawn/dropbear_urdf');
  assert.equal(source.license,'MIT');
  assert.equal(source.files.length,670);
  for(const record of source.files){
    const actual=await bytes(`source/${record.file}`);
    assert.equal(actual.length,record.bytes,record.file);
    assert.equal(hash(actual),record.sha256,record.file);
  }
  assert.equal(robot.links.length,669);
  assert.equal(robot.joints.length,668);
  assert.equal(robot.closures.length,27);
  assert.equal(robot.links.reduce((n,link)=>n+link.visuals.length,0),668);
  const arm=new Set(robot.leftArm.links);
  assert.equal(arm.size,68);
  assert.equal(robot.leftArm.rootLink,'torso_RMD-X10__1_Rotor_1');
  assert.equal(robot.closures.filter(c=>arm.has(c.parent)&&arm.has(c.child)).length,3);
  assert.deepEqual(robot.closures.filter(c=>arm.has(c.parent)!==arm.has(c.child)),[]);
  for(const link of robot.links)for(const visual of link.visuals)assert.deepEqual(visual.scale,[.001,.001,.001]);
});

for(const variant of variants){
  const prepared=new URL(`../content/models/${variant.id}/`,import.meta.url);
  test(`${variant.id} preserves every source visual and prepared surface without conflating identities`,async()=>{
    const robot=await json('source-robot.json');
    const map=await json(`${variant.folder}/component-map.json`),definition=await json(`${variant.folder}/import-definition.json`);
    const geometry=await json(variant.folder==='arm'?'geometry-report-arm.json':'geometry-report.json');
    const reports=new Map(geometry.files.map(record=>[record.file,record]));
    const selected=robot.links.filter(link=>variant.folder==='whole'||robot.leftArm.links.includes(link.name));
    assert.equal(new Set(map.map(record=>record.sourceVisualId)).size,variant.visuals);
    assert.equal(new Set(map.map(record=>record.id)).size,map.length);
    assert.equal(new Set(map.map(record=>record.meshName)).size,map.length);
    for(const link of selected)for(const [index,visual]of link.visuals.entries()){
      const records=map.filter(record=>record.sourceLink===link.name&&record.sourceVisualIndex===index+1);
      const report=reports.get(visual.file);
      assert.equal(records.length,report.displaySurfaces.length,link.name);
      assert.ok(records.every(record=>record.sourceFile===visual.file));
      for(const record of records)assert.deepEqual(definition.parts[record.meshName].explode,definition.parts[records[0].meshName].explode,'partitioned source visual separates together');
      for(const surface of report.displaySurfaces){
        const actual=await bytes(`${variant.folder==='arm'?'derived-arm':'derived'}/${surface.file}`);
        assert.equal(hash(actual),surface.sha256,surface.file);
        assert.equal(actual.readUInt32LE(80),surface.triangles,surface.file);
      }
    }
    const members=definition.groups.flatMap(group=>group.meshNames);
    assert.deepEqual(new Set(members),new Set(map.map(record=>record.meshName)));
    assert.equal(members.length,map.length);
    for(const group of definition.groups)assert.deepEqual(new Set(group.children.flatMap(child=>child.meshNames)),new Set(group.meshNames));
    const source=await bytes(`${variant.folder}/model.glb`),output=await bytes('model.glb',prepared);
    const conversion=await json(`${variant.folder}/conversion-report.json`),report=await json('preparation-report.json',prepared);
    assert.equal(hash(source),hash(output));
    assert.equal(conversion.glbSha256,hash(source));
    assert.equal(conversion.sourceVisuals,variant.visuals);
    assert.equal(conversion.closureCount,variant.closures);
    assert.equal(report.counts.triangles,conversion.referencedDisplayTriangles);
    assert.equal(report.counts.meshes,map.length);
    assert.ok(report.counts.meshes<2000);
    assert.ok(report.counts.triangles<1000000);
    const manifest=await json('manifest.json',prepared),tour=await json('tour.json',prepared);
    assert.equal(manifest.id,variant.id);assert.equal(manifest.rootId,variant.id);
    assert.equal(tour.id,variant.tour);assert.equal(tour.duration,20);
    assert.equal(tour.chapters.length,8);
    assert.ok(tour.chapters.every(chapter=>chapter.duration===2.5));
  });

  test(`${variant.id} keeps the complete shoulder rigid, preserves closure geometry and returns exactly to neutral`,async()=>{
    const audit=await json(`${variant.folder}/source-transforms.json`),curves=await json(`${variant.folder}/motion-curves.json`);
    const source=await bytes(`${variant.folder}/model.glb`);
    const gltf=await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');
    assert.equal(gltf.animations.length,1);
    const clip=gltf.animations[0];
    assert.equal(clip.name,'DropbearArmSwivel');assert.equal(clip.duration,2.5);
    assert.equal(clip.tracks.length,1);assert.equal(clip.tracks[0].name,'DropbearShoulderPivot.quaternion');
    assert.equal(curves.driveJoint,'LH_yaw');
    assert.ok(curves.values.every(value=>value>=curves.limits[0]&&value<=curves.limits[1]));
    assert.ok(Math.abs(Math.max(...curves.values)-THREE.MathUtils.degToRad(8))<1e-10);
    assert.ok(Math.abs(curves.values[0])<1e-10&&Math.abs(curves.values.at(-1))<1e-10);
    assert.equal(audit.closures.length,27);
    assert.equal(audit.closures.filter(record=>record.moving).length,3);
    assert.ok(audit.closures.every(record=>!record.crossing));
    const restPivot=new THREE.Matrix4().fromArray(audit.pivot.restWorldMatrix),inverse=restPivot.clone().invert();
    const visuals=new Map(audit.visuals.map(record=>[record.meshName,record]));
    const movingLinks=new Set(audit.links.filter(record=>record.moving).map(record=>record.sourceLink));
    const meshNodes=[];gltf.scene.traverse(node=>{if(node.isMesh)meshNodes.push(node);});
    const pivot=gltf.scene.getObjectByName('DropbearShoulderPivot');
    const mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    for(const time of [0,.625,1.25,1.875,2.5]){
      mixer.setTime(time);gltf.scene.updateMatrixWorld(true);
      const delta=pivot.matrixWorld.clone().multiply(inverse);
      for(const mesh of meshNodes){
        const record=visuals.get(mesh.name),expected=new THREE.Matrix4().fromArray(record.worldMatrix);
        if(movingLinks.has(record.sourceLink))expected.premultiply(delta);
        close(mesh.matrixWorld.elements,expected.elements);
        if(time===0||time===2.5)close(mesh.matrixWorld.elements,record.worldMatrix);
      }
      for(const closure of audit.closures){
        const parent=new THREE.Matrix4().fromArray(closure.parentWorld),child=new THREE.Matrix4().fromArray(closure.childWorld);
        if(closure.moving){parent.premultiply(delta);child.premultiply(delta);}
        close(parent.invert().multiply(child).elements,closure.childRelativeToParent,1e-9);
      }
    }
  });
}

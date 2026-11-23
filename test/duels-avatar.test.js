import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/duels/vendor/three/build/three.module.js';
import { CharacterAvatar, CROUCH_HEIGHT } from '../games/duels/avatar.js';
// Read the actual character geometry and clip, without requiring a browser texture loader.
function fixture(){
 const file=readFileSync(new URL('../games/duels/assets/blocky-characters/character-a.glb',import.meta.url));
 const length=file.readUInt32LE(12),g=JSON.parse(file.subarray(20,20+length)),bin=file.subarray(28+length);
 function data(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],type={5121:Uint8Array,5126:Float32Array,5123:Uint16Array,5125:Uint32Array}[a.componentType];const bytes=bin.subarray((v.byteOffset||0)+(a.byteOffset||0));return {array:new type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+a.count*n*type.BYTES_PER_ELEMENT)),n};}
 const nodes=g.nodes.map(n=>{let o=new T.Group();if(n.mesh!==undefined){const p=g.meshes[n.mesh].primitives[0],geo=new T.BufferGeometry();for(const [key,attr]of Object.entries(p.attributes)){if(!['POSITION','NORMAL','TEXCOORD_0'].includes(key))continue;const d=data(attr);geo.setAttribute({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[key],new T.BufferAttribute(d.array,d.n));}if(p.indices!==undefined)geo.setIndex(new T.BufferAttribute(data(p.indices).array,1));o=new T.Mesh(geo,new T.MeshBasicMaterial());}o.name=n.name;if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 g.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const model=new T.Group(),scaled=new T.Group();scaled.scale.setScalar(2/3);model.add(scaled);g.scenes[g.scene||0].nodes.forEach(i=>scaled.add(nodes[i]));
 const anim=g.animations.find(a=>a.name==='die'),tracks=anim.channels.map(c=>{const s=anim.samplers[c.sampler],path={translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path],Type=path==='quaternion'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack;return new Type(`${nodes[c.target.node].name}.${path}`,data(s.input).array,data(s.output).array);});
 return new CharacterAvatar(model,[new T.AnimationClip('die',-1,tracks)]);
}
const pose={yaw:0,pitch:0,height:1.8,speed:0};
test('actual character grips stay at both hands across weapons and crouch',()=>{
 const a=fixture();for(const name of ['Assault Rifle','Handgun','Sniper','Compact SMG']){a.setWeapon(name,new T.Group());for(const height of [1.8,CROUCH_HEIGHT]){for(let i=0;i<60;i++)a.update(1/60,{pose:{...pose,height}});for(const [side,target]of [[-1,a.rightGrip],[1,a.leftGrip]]){const limb=a.arms[side],hand=limb.elbow.localToWorld(new T.Vector3(0,-limb.lower,0));assert.ok(hand.distanceTo(target)<.035,`${name} hand gap ${hand.distanceTo(target)}`);}assert.equal(a.model.scale.y,1);assert.ok(Math.abs(a.height-height)<.001);}}a.dispose();
});
test('death falls, holds the last frame, and restores on the next round',()=>{
 const a=fixture();a.setWeapon('Assault Rifle',new T.Group());a.update(1/60,{pose});for(let i=0;i<60;i++)a.update(1/60,{pose,hp:0});assert.ok(a.dead);assert.equal(a.gun.visible,false);const q=a.root.quaternion.clone();assert.ok(Math.abs(q.x)>.6);a.update(2,{pose,hp:0});assert.ok(q.angleTo(a.root.quaternion)<.001);a.update(1/60,{pose,hp:150,epoch:1});assert.equal(a.dead,false);assert.equal(a.gun.visible,true);assert.ok(Math.abs(a.root.quaternion.x)<.001);a.dispose();
});


import * as THREE from './vendor/three/build/three.module.js';

export const CROUCH_HEIGHT = 1.35;
const down = new THREE.Vector3(0,-1,0);
const profiles = {
  'Assault Rifle': { rear:[0,-.10,.12], support:[0,-.025,-.11] },
  'Burst Rifle': { rear:[0,-.10,.10], support:[0,-.025,-.12] },
  'Shotgun': { rear:[0,-.08,.15], support:[0,-.01,-.13] },
  'Sniper': { rear:[0,-.09,.17], support:[0,-.015,-.12] },
  'Handgun': { rear:[0,-.065,.015], support:[.035,-.055,.005] },
  'Revolver': { rear:[0,-.06,.05], support:[.035,-.055,.035] },
  'Compact SMG': { rear:[0,-.08,.04], support:[0,-.01,-.11] },
};

// Split the existing textured block limbs at their joints, retaining their UVs.
// This adds elbows and knees without stretching the entire character or replacing its art.
function cutGeometry(source, cutoff, above, offset) {
  const geometry = source.index ? source.toNonIndexed() : source;
  const names = ['position','normal','uv'].filter(name=>geometry.getAttribute(name));
  const result = Object.fromEntries(names.map(name=>[name,[]]));
  const position = geometry.getAttribute('position');
  for(let triangle=0;triangle<position.count;triangle+=3){
    let polygon=[];
    for(let i=0;i<3;i++){
      const vertex={};for(const name of names){const a=geometry.getAttribute(name);vertex[name]=Array.from({length:a.itemSize},(_,j)=>a.array[(triangle+i)*a.itemSize+j]);}polygon.push(vertex);
    }
    const clipped=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=v=>above?v.position[1]>=cutoff:v.position[1]<=cutoff;
      if(inside(a))clipped.push(a);
      if(inside(a)!==inside(b)){
        const t=(cutoff-a.position[1])/(b.position[1]-a.position[1]),v={};
        for(const name of names)v[name]=a[name].map((value,j)=>THREE.MathUtils.lerp(value,b[name][j],t));clipped.push(v);
      }
    }
    for(let i=1;i<clipped.length-1;i++)for(const v of [clipped[0],clipped[i],clipped[i+1]]){
      for(const name of names)result[name].push(...(name==='position'?v[name].map((n,j)=>n-offset[j]):v[name]));
    }
  }
  const output=new THREE.BufferGeometry();for(const name of names)output.setAttribute(name,new THREE.Float32BufferAttribute(result[name],geometry.getAttribute(name).itemSize));
  output.computeBoundingBox();output.computeBoundingSphere();if(source.index)geometry.dispose();return output;
}
function visibleBounds(object) {
  const bounds=new THREE.Box3();object.updateWorldMatrix(true,true);
  object.traverseVisible(node=>{if(node.isMesh){node.geometry.computeBoundingBox();bounds.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));}});
  return bounds;
}

export class CharacterAvatar {
  constructor(model, clips=[]) {
    this.group=new THREE.Group();this.group.add(model);this.model=model;
    this.root=model.getObjectByName('root');this.torso=model.getObjectByName('torso');this.head=model.getObjectByName('head');
    this.rest=new Map();model.traverse(node=>this.rest.set(node,{position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
    this.mixer=new THREE.AnimationMixer(model);const die=clips.find(clip=>clip.name==='die');
    this.death=die?this.mixer.clipAction(die).setLoop(THREE.LoopOnce,1):null;
    if(this.death){this.death.clampWhenFinished=true;this.death.setDuration(.8);}
    this.ownedGeometry=[];this.arms={};this.legs={};this.dead=false;this.epoch=null;this.crouch=0;this.stride=0;this.deathTime=0;
    for(const [name,side]of [['arm-right',-1],['arm-left',1]])this.arms[side]=this.makeLimb(model.getObjectByName(name),true);
    for(const [name,side]of [['leg-right',-1],['leg-left',1]])this.legs[side]=this.makeLimb(model.getObjectByName(name),false);
    this.hold=new THREE.Group();this.group.add(this.hold);
    this.rightGrip=new THREE.Vector3();this.leftGrip=new THREE.Vector3();this.height=1.8;
  }
  makeLimb(source,arm) {
    const shoulder=new THREE.Group(),elbow=new THREE.Group(),foot=new THREE.Group();
    source.geometry.computeBoundingBox();const box=source.geometry.boundingBox;
    const center=(box.min.x+box.max.x)/2,top=box.max.y,cut=arm?-.45:-.5,ankle=arm?box.min.y:-.85;
    shoulder.position.copy(source.position).add(new THREE.Vector3(center,top,0));source.parent.add(shoulder);
    const first=cutGeometry(source.geometry,cut,true,[center,top,0]);
    let lower=cutGeometry(source.geometry,cut,false,[0,0,0]);
    if(!arm){const next=cutGeometry(lower,ankle,true,[center,cut,0]);lower.dispose();lower=next;}
    else{const shifted=lower.clone();shifted.translate(-center,-cut,0);lower.dispose();lower=shifted;}
    this.ownedGeometry.push(first,lower);
    const upperMesh=new THREE.Mesh(first,source.material),lowerMesh=new THREE.Mesh(lower,source.material);
    for(const mesh of [upperMesh,lowerMesh]){mesh.castShadow=true;mesh.receiveShadow=true;}
    shoulder.add(upperMesh,elbow);elbow.position.y=cut-top;elbow.add(lowerMesh);
    if(!arm){
      const geometry=cutGeometry(source.geometry,ankle,false,[center,box.min.y,0]);this.ownedGeometry.push(geometry);
      const mesh=new THREE.Mesh(geometry,source.material);mesh.castShadow=true;mesh.receiveShadow=true;foot.add(mesh);source.parent.add(foot);
    }
    source.visible=false;
    return {source,shoulder,elbow,foot,upper:top-cut,lower:cut-ankle,ankleHeight:arm?0:ankle-box.min.y,arm};
  }
  setWeapon(name,gun) {
    if(this.gun){this.hold.remove(this.gun);this.disposeMaterials(this.gun);}
    this.gun=gun;this.hold.add(gun);gun.rotation.y=Math.PI;this.profile=profiles[name]||profiles['Assault Rifle'];
    this.gun.visible=!this.dead;
  }
  restore() {
    this.mixer.stopAllAction();for(const [node,rest]of this.rest){node.position.copy(rest.position);node.quaternion.copy(rest.quaternion);node.scale.copy(rest.scale);}
    this.dead=false;this.deathTime=0;this.crouch=0;this.model.position.set(0,0,0);
    for(const limb of [...Object.values(this.arms),...Object.values(this.legs)]){limb.source.visible=false;limb.shoulder.visible=true;limb.foot.visible=!limb.arm;limb.shoulder.quaternion.identity();limb.elbow.quaternion.identity();}
    if(this.gun)this.gun.visible=true;
  }
  die() {
    this.dead=true;this.deathTime=0;this.mixer.stopAllAction();
    for(const [node,rest]of this.rest){node.position.copy(rest.position);node.quaternion.copy(rest.quaternion);node.scale.copy(rest.scale);}
    for(const limb of [...Object.values(this.arms),...Object.values(this.legs)]){limb.source.visible=true;limb.shoulder.visible=false;limb.foot.visible=false;}
    if(this.gun)this.gun.visible=false;
    this.death?.reset().play();
  }
  solve(limb,target,bend) {
    this.group.updateMatrixWorld(true);
    const start=limb.shoulder.getWorldPosition(new THREE.Vector3()),scale=limb.shoulder.getWorldScale(new THREE.Vector3()).x;
    const a=limb.upper*scale,b=limb.lower*scale,delta=target.clone().sub(start),distance=THREE.MathUtils.clamp(delta.length(),Math.abs(a-b)+.0001,a+b-.0001);
    const direction=delta.normalize(),hint=bend.clone().addScaledVector(direction,-bend.dot(direction));
    if(hint.lengthSq()<1e-5)hint.set(0,0,1);hint.normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
    const joint=start.clone().addScaledVector(direction,along).addScaledVector(hint,height);
    const upperDirection=joint.clone().sub(start).normalize(),lowerDirection=target.clone().sub(joint).normalize();
    const parentRotation=limb.shoulder.parent.getWorldQuaternion(new THREE.Quaternion());
    const upperWorld=new THREE.Quaternion().setFromUnitVectors(down,upperDirection);
    limb.shoulder.quaternion.copy(parentRotation.invert().multiply(upperWorld));
    limb.elbow.quaternion.copy(upperWorld.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(down,lowerDirection)));
  }
  update(dt,{pose,hp=150,epoch=0,reload=null}) {
    if(this.epoch!==epoch){this.restore();this.epoch=epoch;}
    this.group.rotation.y=pose.yaw+Math.PI;
    if(hp<=0&&!this.dead)this.die();
    if(this.dead){
      this.deathTime+=dt;this.model.position.y=0;
      if(this.death)this.mixer.update(dt);else this.root.rotation.x=-Math.min(1,this.deathTime/.8)*Math.PI/2;
      const floor=this.group.position.y,min=visibleBounds(this.model).min.y;
      this.model.position.y=Math.max(0,floor-min);this.group.updateMatrixWorld(true);return;
    }
    const wanted=THREE.MathUtils.clamp((1.8-pose.height)/(1.8-CROUCH_HEIGHT),0,1);
    this.crouch=THREE.MathUtils.damp(this.crouch,wanted,18,dt);this.height=THREE.MathUtils.lerp(1.8,CROUCH_HEIGHT,this.crouch);
    this.stride+=dt*Math.min(pose.speed,7)*2.5;
    const walking=THREE.MathUtils.clamp(pose.speed/3,0,1),tilt=this.crouch*.40;
    this.root.position.copy(this.rest.get(this.root).position);this.torso.quaternion.copy(this.rest.get(this.torso).quaternion);this.torso.rotation.x=tilt;
    this.head.quaternion.copy(this.rest.get(this.head).quaternion);this.head.rotation.x=-tilt-THREE.MathUtils.clamp(pose.pitch,-.5,.5)*.4;
    this.model.position.y=0;this.group.updateMatrixWorld(true);
    const top=visibleBounds(this.head).max.y-this.group.position.y;
    const scale=this.root.parent.getWorldScale(new THREE.Vector3()).y;
    this.root.position.y+=(this.height-top)/scale-(1-this.crouch)*walking*.025/scale;
    this.group.updateMatrixWorld(true);
    for(const side of [-1,1]){
      const limb=this.legs[side],swing=Math.sin(this.stride+(side===1?Math.PI:0))*walking;
      const foot=this.group.localToWorld(new THREE.Vector3(side*THREE.MathUtils.lerp(.135,.22,this.crouch),Math.max(0,swing)*.09,swing*.12));
      limb.foot.position.copy(limb.foot.parent.worldToLocal(foot.clone()));limb.foot.quaternion.identity();
      const ankle=foot.clone().add(new THREE.Vector3(0,limb.ankleHeight*scale,0));
      this.solve(limb,ankle,new THREE.Vector3(0,0,1).applyQuaternion(this.group.quaternion));
    }
    if(this.gun){
      this.hold.position.set(-.10,THREE.MathUtils.lerp(1.10,.77,this.crouch),.29);
      const dip = reload === null ? 0 : THREE.MathUtils.smoothstep(reload,0,.2) * (1 - THREE.MathUtils.smoothstep(reload,.75,1));
      this.hold.position.y -= dip * .09;
      this.hold.rotation.set(-pose.pitch + dip * .28,0,dip * .14);this.gun.rotation.set(0,Math.PI,0);this.group.updateMatrixWorld(true);
      this.rightGrip.copy(this.gun.localToWorld(new THREE.Vector3(...this.profile.rear)));
      this.leftGrip.copy(this.gun.localToWorld(new THREE.Vector3(...this.profile.support)));
      if (reload !== null) {
        const reach = Math.sin(Math.PI * THREE.MathUtils.clamp((reload - .15) / .65,0,1));
        this.leftGrip.add(new THREE.Vector3(.07,-.15,-.06).multiplyScalar(reach).applyQuaternion(this.group.quaternion));
      }
      for(const side of [-1,1])this.solve(this.arms[side],side===-1?this.rightGrip:this.leftGrip,
        new THREE.Vector3(side*.5,-1,-.25).applyQuaternion(this.group.quaternion));
    }
    this.group.updateMatrixWorld(true);
  }
  disposeMaterials(object) {const materials=new Set();object.traverse(n=>{if(n.isMesh)for(const material of(Array.isArray(n.material)?n.material:[n.material]))materials.add(material);});for(const material of materials)material.dispose();}
  dispose() {this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.disposeMaterials(this.group);for(const geometry of this.ownedGeometry)geometry.dispose();}
}

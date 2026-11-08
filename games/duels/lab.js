import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { weapons } from './weapons.js';
import { DuelMultiplayer } from './multiplayer.js';

const $ = id => document.getElementById(id);
const defaults = { speed: 7, jump: 8, gravity: 22, slide: 10, sensitivity: 1, recoil: 1, fireRate: 1, damage: 1, fov: 90 };
let tuning = { ...defaults };
try { const saved = JSON.parse(localStorage.getItem('duels.lab.tuning.v1')); for (const key in defaults) if (Number.isFinite(saved?.[key])) tuning[key] = saved[key]; } catch {}
const sliderSpecs = [ ['speed','Ground speed',3,12,.1,'m/s'], ['jump','Jump impulse',4,12,.1,'m/s'], ['gravity','Gravity',10,35,.5,'m/s²'], ['slide','Slide speed',7,14,.1,'m/s'], ['sensitivity','Mouse sensitivity',.2,2.5,.05,'×'], ['recoil','Recoil',0,2,.05,'×'], ['fireRate','Fire rate',.5,1.5,.05,'×'], ['damage','Damage',.5,2,.1,'×'], ['fov','Field of view',70,110,1,'°'] ];
for (const [key,label,min,max,step,unit] of sliderSpecs) {
  tuning[key] = THREE.MathUtils.clamp(tuning[key], min, max);
  const row = document.createElement('div'); row.className = 'slider-row';
  row.innerHTML = `<label for="tune-${key}">${label}<output></output></label><input id="tune-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
  const input = row.querySelector('input'), output = row.querySelector('output');
  input.value = tuning[key]; const update = () => { tuning[key] = Number(input.value); output.textContent = `${Number(input.value).toFixed(key === 'fov' ? 0 : 1)} ${unit}`; try { localStorage.setItem('duels.lab.tuning.v1', JSON.stringify(tuning)); } catch {} };
  input.addEventListener('input', update); update(); $('sliders').append(row);
}
$('defaults').onclick = () => { for (const [key] of sliderSpecs) { const el = $(`tune-${key}`); el.value = defaults[key]; el.dispatchEvent(new Event('input')); } };

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (error) { $('load-detail').textContent = `WebGL could not start: ${error.message}. Try a browser with hardware acceleration.`; throw error; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
$('viewport').append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#b6c9c5'); scene.fog = new THREE.Fog('#b6c9c5', 45, 115);
const camera = new THREE.PerspectiveCamera(tuning.fov, innerWidth / innerHeight, .06, 160);
const viewScene = new THREE.Scene(); const viewCamera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .01, 10);
viewScene.add(new THREE.HemisphereLight(0xffffff, 0x7a8980, 3)); const viewLight = new THREE.DirectionalLight(0xffffff, 2); viewLight.position.set(2, 3, 2); viewScene.add(viewLight);
scene.add(new THREE.HemisphereLight(0xe6f1eb, 0x74877d, 2.4));
const sun = new THREE.DirectionalLight(0xfff3d9, 3.5); sun.position.set(-15, 28, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-28,right:28,top:24,bottom:-24,near:1,far:85}); sun.shadow.bias = -.0004; scene.add(sun);
const controls = new PointerLockControls(camera, renderer.domElement);
const arena = new THREE.Group(); scene.add(arena);
const solids = [], ramps = [], targetParts = [], targets = [], transients = [], models = new Map();
const gunRig = new THREE.Group(); viewScene.add(gunRig); const armsRig = new THREE.Group(); viewScene.add(armsRig); armsRig.visible = false;
const player = { position: new THREE.Vector3(0,0,11), velocity: new THREE.Vector3(), grounded: true, height: 1.8, slideTime: 0, slideCooldown: 0, slideDir: new THREE.Vector3(), jumps: 0 };
let thirdGun;
let character, playerMixer, playerActions = {}, activePlayerAction, thirdPerson = false;
let mode = 'play', activeWeapon = 0, ammo = weapons[0].mag, reloading = 0, reloadDuration = 0, cooldown = 0, burstLeft = 0;
let shotHeld = false, shotEdge = false, aim = false, jumpQueued = 0, jumpAge = 0, coyote = 0, recoilKick = 0, hitTime = 0, messageTime = 0;
let time = 0, loaded = 0, inspectionObject, inspectMixer, inspectActions = [], inspectRadius = 4, inspectYaw = .6, inspectPitch = .23;
const keys = new Set(); let audioContext;
let fallbackPlaying = false, inspectTargetY = 1;
const playRotation = new THREE.Quaternion();
const isPlaying = () => controls.isLocked || fallbackPlaying;
let net, offlineTuning;
const remotePlayers = new Map();
const session = { shots: 0, hits: 0, eliminations: 0 };
let readoutTime = 0;
const raycaster = new THREE.Raycaster(); const worldMeshes = []; const temp = new THREE.Vector3();

function material(color, roughness = .8) { return new THREE.MeshStandardMaterial({color,roughness}); }
const matFloor = material('#d9dfd3'), matWall = material('#e7e9dc'), matCover = material('#c6cec2'), matEdge = material('#25433e'), matAccent = material('#c7e890');
function box(w,h,d,x,y,z,mat=matCover,collision=true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); mesh.position.set(x,y+h/2,z); mesh.receiveShadow = true; mesh.castShadow = true; arena.add(mesh); worldMeshes.push(mesh);
  if (collision) solids.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y,maxY:y+h}); return mesh;
}
box(40,.5,32,0,-.5,0,matFloor,false);
const grid = new THREE.GridHelper(40,40,0x9cae9e,0xb5c1b2); grid.position.y=.006; grid.scale.z=.8; arena.add(grid);
for (const side of [-1,1]) {
  box(.5,3.2,32,side*20,0,0,matWall); box(40,3.2,.5,0,0,side*16,matWall);
  box(.14,.1,31,side*19.65,3.25,0,matAccent,false);
  box(7,1.25,1.8,side*6,0,side*6,matCover);
  box(3,2.5,3,side*5,0,-side*2,matWall);
  box(4,2.8,4,side*13,0,side*8,matCover);
  // Traversable wedge; the numerical surface matches the visible geometry.
  const x=side*13, z=-side*0, rise=2.8, run=12;
  const geometry = new THREE.BufferGeometry();
  const v = [-2,0,-6, 2,0,-6, 2,rise,6, -2,rise,6, -2,0,6, 2,0,6];
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); geometry.setIndex([0,3,2,0,2,1,0,4,3,1,2,5,4,5,2,4,2,3,0,1,5,0,5,4]); geometry.computeVertexNormals();
  const ramp=new THREE.Mesh(geometry,matCover); ramp.position.set(x,0,z); ramp.rotation.y=side<0?Math.PI:0; ramp.castShadow=true; ramp.receiveShadow=true; arena.add(ramp);worldMeshes.push(ramp);
  ramps.push({x,z,w:4,run,rise,direction:side<0?-1:1});
  const spawn = new THREE.Mesh(new THREE.RingGeometry(1.4,1.46,64),new THREE.MeshBasicMaterial({color:side>0?0x52776e:0x738c65,side:THREE.DoubleSide})); spawn.rotation.x=-Math.PI/2;spawn.position.set(0,.015,side*12);arena.add(spawn);
}
function textSprite(text, color = '#d5f586') {
  const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='600 32px Segoe UI';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,58);const texture=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(4.2,.78,1);return sprite;
}
const title=textSprite('MOVEMENT + COMBAT LAB','#344a40');title.position.set(0,4,-15);arena.add(title);
const stage = new THREE.Group(); stage.position.set(65,0,0);scene.add(stage);
const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.9,.2,64),material('#334d46'));plinth.position.y=-.1;plinth.receiveShadow=true;stage.add(plinth);
const stageGrid=new THREE.GridHelper(20,20,0x637d70,0x95aa9b);stageGrid.position.y=-.21;stage.add(stageGrid);
const stageLabel=textSprite('SOURCE ASSET / INSPECTION','#344a40');stageLabel.position.set(0,3.4,0);stage.add(stageLabel);

function progress(name) { loaded++;$('load-progress').value=loaded;$('load-detail').textContent=`${loaded}/11 · ${name}`; }
function normalize(object, size, ground = false) {
  object.updateMatrixWorld(true); let bounds=new THREE.Box3().setFromObject(object); const dimensions=bounds.getSize(new THREE.Vector3());
  object.scale.multiplyScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z)); object.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(object);
  const center=bounds.getCenter(new THREE.Vector3()); const wrapper=new THREE.Group(); wrapper.add(object);object.position.sub(center); if(ground)object.position.y+=bounds.getSize(new THREE.Vector3()).y/2;
  wrapper.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});return wrapper;
}
function cloneModel(record) {
  // Characters animate object transforms; the skinned arms keep their source hierarchy.
  const clone = record.object.clone(true);
  clone.traverse(n => { if(n.isMesh) n.material = Array.isArray(n.material) ? n.material.map(m=>m.clone()) : n.material.clone(); });
  return clone;
}
async function loadGLB(key,path,size,ground=false) {
  const gltf=await new GLTFLoader().loadAsync(path); const object=normalize(gltf.scene,size,ground);models.set(key,{object,clips:gltf.animations,path,kind:'GLB'});progress(key);return models.get(key);
}
async function loadGun(w) {
  const path=`./assets/guns/${w.file}`;const mtls=await new MTLLoader().loadAsync(path+'.mtl');mtls.preload();
  const raw=await new OBJLoader().setMaterials(mtls).loadAsync(path+'.obj');raw.rotation.y=Math.PI/2;
  const object=normalize(raw,w.length); object.traverse(n=>{if(n.isMesh){const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats){m.color.offsetHSL(0,0,.09);m.shininess=14;}}});
  models.set(w.name,{object,clips:[],path:path+'.obj',kind:'OBJ + MTL'});progress(w.name);
}
async function boot() {
  try {
    await Promise.all(weapons.map(loadGun));
    await loadGLB('Character','./assets/blocky-characters/character-a.glb',1.8,true);
    await loadGLB('Source arms','./assets/arms/arms.glb',1.1);
    await loadGLB('Grenade','./assets/blaster-kit/grenade-a.glb',.28);
    await loadGLB('Range target','./assets/blaster-kit/target-large.glb',1.8,true);
    character=cloneModel(models.get('Character'));scene.add(character);playerMixer=new THREE.AnimationMixer(character);
    for(const clip of models.get('Character').clips)playerActions[clip.name]=playerMixer.clipAction(clip);
    character.visible=false;
    const arms=models.get('Source arms').object;armsRig.add(arms);arms.rotation.y=Math.PI;arms.position.set(0,-.6,-.45);
    for(const [i,x] of [-9,0,9].entries()) createTarget(x,-10,i);
    for(const [index,w] of weapons.entries()){const option=new Option(`${index+1} · ${w.name}`,String(index));$('weapon').add(option);}
    for(const [name]of models)$('asset').add(new Option(name,name));
    $('asset').value='Character';selectWeapon(0);selectInspection();
    $('loading').hidden=true;$('menu').hidden=false;$('status').textContent='11 assets loaded · ready to validate';
    setupMultiplayer();
    document.body.dataset.ready='true';
  }catch(error){$('load-detail').textContent=`Asset loading failed: ${error.message}. Serve this folder over HTTP, then reload.`;console.error(error);document.body.dataset.error=error.message;}
}
function createTarget(x,z,index){
  const group=new THREE.Group();group.position.set(x,0,z);arena.add(group);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.85,1.1,.45),material('#c77e55'));body.position.y=1.15;body.castShadow=true;group.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.45),material('#e4b68a'));head.position.y=1.95;head.castShadow=true;group.add(head);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.55,.65,.12,20),matEdge);base.position.y=.06;group.add(base);
  const display=cloneModel(models.get('Range target'));display.scale.setScalar(.28);display.position.set(0,.25,.31);group.add(display);
  const label=textSprite('150 HP');label.position.y=2.7;label.scale.set(2.7,.5,1);group.add(label);
  const target={group,body,head,label,hp:150,reset:0,baseX:x,index};body.userData.target=target;head.userData.target=target;head.userData.head=true;targetParts.push(body,head);targets.push(target);
}
function updateTargetLabel(target){const old=target.label;const label=textSprite(target.hp<=0?'ELIMINATED':`${Math.ceil(target.hp)} HP`,target.hp<=0?'#ffd49a':'#d5f586');label.position.copy(old.position);label.scale.copy(old.scale);target.group.remove(old);old.material.map.dispose();old.material.dispose();target.group.add(label);target.label=label;}
function selectWeapon(index,notify=true){index=Number(index);if(net?.session&&notify&&!net.command('equip',{weapon:index}))return;activeWeapon=index;ammo=net?.session?net.predictedAmmo(index):weapons[activeWeapon].mag;reloading=0;cooldown=.25;burstLeft=0;shotEdge=false;shotHeld=false;while(gunRig.children.length){const oldGun=gunRig.children[0];gunRig.remove(oldGun);oldGun.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});}gunRig.add(cloneModel(models.get(weapons[activeWeapon].name)));if(thirdGun){scene.remove(thirdGun);thirdGun.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});}thirdGun=cloneModel(models.get(weapons[activeWeapon].name));thirdGun.visible=false;scene.add(thirdGun);$('weapon').value=String(index);const w=weapons[index];$('weapon-facts').innerHTML=`<span><b>${w.damage}${w.pellets?' × 8':''}</b> damage</span><span><b>${w.mag}</b> rounds</span><span><b>${w.reload}s</b> reload</span>`;updateHUD();}
$('weapon').onchange=()=>selectWeapon($('weapon').value);
function setMode(next){mode=next;document.body.classList.toggle('inspecting',mode==='inspect');$('play-panel').hidden=mode==='inspect';$('lab-panel').hidden=mode!=='inspect';$('play-tab').classList.toggle('active',mode==='play');$('lab-tab').classList.toggle('active',mode==='inspect');if(mode==='inspect')selectInspection();else{$('wireframe').checked=false;applyWireframe();const sourceArms=models.get('Source arms').object;stage.remove(sourceArms);armsRig.add(sourceArms);sourceArms.position.set(0,-.6,-.45);sourceArms.rotation.set(0,Math.PI,0);camera.quaternion.set(0,0,0,1);$('status').textContent='Rough blockout · movement and shooting validation';}}
$('play-tab').onclick=()=>setMode('play');$('lab-tab').onclick=()=>setMode('inspect');
function selectInspection(){
  if(!models.size)return;
  if(inspectionObject){stage.remove(inspectionObject);inspectMixer?.stopAllAction();inspectMixer?.uncacheRoot(inspectionObject);if(inspectionObject!==models.get('Source arms').object)inspectionObject.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});}
  const record=models.get($('asset').value);
  // Arms remain in one hierarchy so skin joints keep their source references.
  inspectionObject=$('asset').value==='Source arms'?record.object:cloneModel(record);
  if($('asset').value==='Source arms')armsRig.remove(inspectionObject);
  else if(!armsRig.children.length)armsRig.add(models.get('Source arms').object);
  inspectionObject.rotation.set(0,0,0);inspectionObject.position.set(0,0,0);stage.add(inspectionObject);inspectionObject.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(inspectionObject);const height=bounds.getSize(new THREE.Vector3()).y;inspectionObject.position.y-=bounds.min.y;
  inspectTargetY=height/2;inspectRadius=THREE.MathUtils.clamp(bounds.getSize(temp).length()*1.8,1.3,6);inspectMixer=new THREE.AnimationMixer(inspectionObject);inspectActions=[];$('animation').replaceChildren(new Option('Static / rest pose',''));
  for(const clip of record.clips){$('animation').add(new Option(clip.name,clip.name));inspectActions.push({name:clip.name,action:inspectMixer.clipAction(clip)});}
  if(record.clips.some(c=>c.name==='idle')){$('animation').value='idle';playInspectClip();}
  $('animation').disabled=!record.clips.length;
  let meshCount=0,triangles=0;inspectionObject.traverse(n=>{if(n.isMesh){meshCount++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;}});
  $('asset-meta').textContent=`${record.kind} · ${meshCount} meshes · ${Math.round(triangles).toLocaleString()} triangles\n${record.clips.length} animation clips · ${height.toFixed(2)} m normalized height`;
  $('status').textContent=`Inspecting ${$('asset').value} · drag to orbit / scroll to zoom`;applyWireframe();
}
function playInspectClip(){for(const entry of inspectActions)entry.action.stop();inspectActions.find(a=>a.name===$('animation').value)?.action.reset().play();}
function applyWireframe(){inspectionObject?.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.wireframe=$('wireframe').checked;});}
$('asset').onchange=selectInspection;$('animation').onchange=playInspectClip;$('wireframe').onchange=applyWireframe;
$('arms-toggle').onchange=()=>{if(mode==='play'&&!armsRig.children.length){const arms=models.get('Source arms').object;stage.remove(arms);armsRig.add(arms);arms.position.set(0,-.6,-.45);arms.rotation.y=Math.PI;}armsRig.visible=$('arms-toggle').checked;};
function resetTargets(){if(net?.session)return;for(const t of targets){t.hp=150;t.reset=0;t.group.visible=true;updateTargetLabel(t);}ammo=weapons[activeWeapon].mag;reloading=0;player.position.set(0,0,11);player.velocity.set(0,0,0);player.grounded=true;player.jumps=0;player.slideTime=0;player.slideCooldown=0;recoilKick=0;camera.quaternion.set(0,0,0,1);playRotation.identity();updateHUD();}
$('reset-targets').onclick=resetTargets;
function activatePlay(){ camera.quaternion.copy(playRotation); $('menu').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');keys.clear();shotHeld=false;shotEdge=false; }
function pausePlay(){if(isPlaying())playRotation.copy(camera.quaternion);fallbackPlaying=false;$('menu').hidden=false;$('hud').hidden=true;document.body.classList.remove('playing');keys.clear();shotHeld=false;shotEdge=false;aim=false;}
function start(){if(mode!=='play')setMode('play');audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();controls.lock();}
// Embedded browser surfaces may disallow pointer lock. Keep the prototype usable there.
document.addEventListener('pointerlockerror',()=>{fallbackPlaying=true;activatePlay();announce('DRAG TO LOOK · F TO FIRE · ESC TO TUNE');$('status').textContent='Drag-look mode · open in Edge/Chrome for captured mouse';});
$('start').onclick=start;$('menu-button').onclick=()=>{if(isPlaying()){controls.unlock();pausePlay();}else if(mode==='inspect')setMode('play');else start();};
controls.addEventListener('lock',activatePlay);
controls.addEventListener('unlock',pausePlay);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('mousedown',e=>{if(isPlaying()){if(e.button===0){shotHeld=true;shotEdge=true;}if(e.button===2)aim=true;}});
window.addEventListener('mouseup',e=>{if(e.button===0)shotHeld=false;if(e.button===2)aim=false;});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&fallbackPlaying){pausePlay();return;}if(!isPlaying())return;if(e.code==='KeyF'){shotHeld=true;shotEdge=true;}if(['Space','Tab','KeyW','KeyA','KeyS','KeyD','ControlLeft'].includes(e.code))e.preventDefault();
  if(!e.repeat){if(e.code==='Space'){jumpQueued=.1;}if(e.code==='KeyC'||e.code==='ControlLeft')beginSlide();if(e.code==='KeyR')reload();if(e.code==='KeyV')thirdPerson=!thirdPerson;if(/^Digit[1-7]$/.test(e.code))selectWeapon(Number(e.code.at(-1))-1);}
  keys.add(e.code);
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')shotHeld=false;});
window.addEventListener('blur',()=>{keys.clear();shotHeld=false;aim=false;if(isPlaying()){controls.unlock();pausePlay();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&isPlaying()){controls.unlock();pausePlay();}});
window.addEventListener('wheel',e=>{if(mode==='inspect'){inspectRadius=THREE.MathUtils.clamp(inspectRadius+e.deltaY*.003,1,10);}else if(isPlaying()){selectWeapon((activeWeapon+(e.deltaY>0?1:-1)+weapons.length)%weapons.length);}}, {passive:true});
let dragging=false,dragX=0,dragY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(mode==='inspect'){dragging=true;dragX=e.clientX;dragY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(fallbackPlaying&&e.buttons){const look=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');look.y-=e.movementX*.002*tuning.sensitivity;look.x=THREE.MathUtils.clamp(look.x-e.movementY*.002*tuning.sensitivity,-Math.PI/2+.01,Math.PI/2-.01);camera.quaternion.setFromEuler(look);}if(dragging){inspectYaw-=(e.clientX-dragX)*.006;inspectPitch=THREE.MathUtils.clamp(inspectPitch+(e.clientY-dragY)*.006,-.15,1.2);dragX=e.clientX;dragY=e.clientY;}});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
function announce(text){$('message').textContent=text;messageTime=1.6;}
function tone(freq,duration,volume=.03,noise=false){if(!audioContext)return;const now=audioContext.currentTime;const gain=audioContext.createGain();gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);gain.connect(audioContext.destination);let source;if(noise){const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;source=audioContext.createBufferSource();source.buffer=buffer;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=freq;source.connect(filter);filter.connect(gain);}else{source=audioContext.createOscillator();source.frequency.setValueAtTime(freq,now);source.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),now+duration);source.connect(gain);}source.start(now);source.stop(now+duration);source.onended=()=>{source.disconnect();gain.disconnect();};}
function reload(){const w=weapons[activeWeapon];if(reloading||ammo===w.mag)return;if(net?.session&&(!net.canFight||!net.command('reload')))return;reloading=w.reload;reloadDuration=w.reload;burstLeft=0;tone(800,.08,.025,true);updateHUD();}
function beginSlide(){if(!player.grounded||player.slideCooldown>0||Math.hypot(player.velocity.x,player.velocity.z)<4)return;player.slideDir.set(player.velocity.x,0,player.velocity.z).normalize();player.slideTime=.65;player.slideCooldown=1.45;}
function surfaceAt(x,z){let y=0;for(const r of ramps){if(Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.run/2)y=Math.max(y,((z-r.z)*r.direction/r.run+.5)*r.rise);}for(const b of solids)if(x>b.minX-.15&&x<b.maxX+.15&&z>b.minZ-.15&&z<b.maxZ+.15&&player.position.y>=b.maxY-.32)y=Math.max(y,b.maxY);return y;}
function resolveHorizontal(){const p=player.position,r=.32;for(const b of solids){if(p.y>=b.maxY-.02||p.y+player.height<=b.minY+.02)continue;const x=THREE.MathUtils.clamp(p.x,b.minX,b.maxX),z=THREE.MathUtils.clamp(p.z,b.minZ,b.maxZ);let dx=p.x-x,dz=p.z-z;const length=Math.hypot(dx,dz);if(length<r){if(length>.00001){p.x+=dx/length*(r-length);p.z+=dz/length*(r-length);}else{const choices=[{d:Math.abs(p.x-b.minX),x:b.minX-r,z:p.z},{d:Math.abs(p.x-b.maxX),x:b.maxX+r,z:p.z},{d:Math.abs(p.z-b.minZ),x:p.x,z:b.minZ-r},{d:Math.abs(p.z-b.maxZ),x:p.x,z:b.maxZ+r}].sort((a,b)=>a.d-b.d);p.x=choices[0].x;p.z=choices[0].z;}}}}
function stepMovement(dt){
  player.slideCooldown=Math.max(0,player.slideCooldown-dt);player.slideTime=Math.max(0,player.slideTime-dt);jumpQueued=Math.max(0,jumpQueued-dt);jumpAge+=dt;coyote=player.grounded?.08:Math.max(0,coyote-dt);
  const crouching=keys.has('KeyC')||keys.has('ControlLeft')||player.slideTime>0;
  const canStand=!solids.some(b=>player.position.x>b.minX-.32&&player.position.x<b.maxX+.32&&player.position.z>b.minZ-.32&&player.position.z<b.maxZ+.32&&b.minY>player.position.y+1.15&&b.minY<player.position.y+1.8);
  player.height=crouching||!canStand?1.15:1.8;
  const facing=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ').y;
  const forward=new THREE.Vector3(-Math.sin(facing),0,-Math.cos(facing));const right=new THREE.Vector3(Math.cos(facing),0,-Math.sin(facing));
  const wish=new THREE.Vector3().addScaledVector(forward,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)).addScaledVector(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0));if(wish.lengthSq()>0)wish.normalize();
  const speed=tuning.speed*(player.height<1.5?.5:1)*(aim?.75:1);const acceleration=player.grounded?18:4.5;
  if(player.slideTime>0){player.velocity.x=player.slideDir.x*tuning.slide;player.velocity.z=player.slideDir.z*tuning.slide;}
  else{player.velocity.x=THREE.MathUtils.damp(player.velocity.x,wish.x*speed,acceleration,dt);player.velocity.z=THREE.MathUtils.damp(player.velocity.z,wish.z*speed,acceleration,dt);}
  if(jumpQueued>0&&(player.grounded||coyote>0)){player.velocity.y=tuning.jump;player.grounded=false;coyote=0;jumpQueued=0;jumpAge=0;player.jumps=1;player.slideTime=0;tone(120,.05,.008,true);}
  // Substeps keep the small capsule from crossing thin walls at high speeds.
  const steps=Math.max(1,Math.ceil(Math.hypot(player.velocity.x,player.velocity.z)*dt/.12));
  for(let i=0;i<steps;i++){const oldX=player.position.x,oldZ=player.position.z;player.position.x+=player.velocity.x*dt/steps;player.position.z+=player.velocity.z*dt/steps;const surface=surfaceAt(player.position.x,player.position.z);if(ramps.some(r=>Math.abs(player.position.x-r.x)<=r.w/2+.3&&Math.abs(player.position.z-r.z)<=r.run/2)&&surface-player.position.y>.32){player.position.x=oldX;player.position.z=oldZ;}if(player.grounded&&surface-player.position.y>=0&&surface-player.position.y<.32)player.position.y=surface;resolveHorizontal();}
  player.velocity.y-=tuning.gravity*dt;const oldY=player.position.y;player.position.y+=player.velocity.y*dt;const ground=surfaceAt(player.position.x,player.position.z);
  if(player.velocity.y<=0&&player.position.y<=ground&&oldY>=ground-.32){player.position.y=ground;player.velocity.y=0;player.grounded=true;player.jumps=0;}
  else player.grounded=false;
  if(player.position.y< -10||Math.abs(player.position.x)>24||Math.abs(player.position.z)>20){player.position.set(0,0,11);player.velocity.set(0,0,0);announce('RESET TO SPAWN');}
  $('position-readout').textContent=`X ${player.position.x.toFixed(1)} · Y ${player.position.y.toFixed(1)} · Z ${player.position.z.toFixed(1)}`;
  $('state').textContent=player.slideTime>0?'SLIDING':!player.grounded?'AIRBORNE':player.height<1.5?'CROUCHED':'GROUNDED';$('speed').innerHTML=`${Math.hypot(player.velocity.x,player.velocity.z).toFixed(1)} <small>m/s</small>`;
}
function updateHUD(){const w=weapons[activeWeapon];$('hud-weapon').textContent=`0${activeWeapon+1} / ${w.name.toUpperCase()}`;$('ammo').textContent=ammo;$('reload-state').textContent=reloading?`RELOADING ${reloading.toFixed(1)}s`:ammo===0?'R · RELOAD':'READY';}
function fire(){
  if(net?.session){fireOnline();return;}
  const w=weapons[activeWeapon];if(cooldown>0||reloading)return;if(ammo<=0){reload();return;}ammo--;session.shots++;cooldown=w.interval/tuning.fireRate;recoilKick+=.04*tuning.recoil;
  const euler=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');euler.x=Math.min(Math.PI/2-.05,euler.x+.009*tuning.recoil);camera.quaternion.setFromEuler(euler);
  camera.updateMatrixWorld(true);const origin=player.position.clone().add(new THREE.Vector3(0,player.height-.13,0));const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const shots=w.pellets||1;let totalDamage=0,anyHead=false,eliminated=false;
  scene.updateMatrixWorld(true);
  for(let i=0;i<shots;i++){
    const d=direction.clone();const spread=w.pellets?.06:aim?.0015:.006;d.x+=(Math.random()-.5)*spread;d.y+=(Math.random()-.5)*spread;d.z+=(Math.random()-.5)*spread;d.normalize();raycaster.set(origin,d);raycaster.far=100;
    const objects=[...worldMeshes,...targetParts.filter(m=>m.userData.target.hp>0)];const hit=raycaster.intersectObjects(objects,false)[0];const end=hit?.point??origin.clone().addScaledVector(d,70);
    const target=hit?.object.userData.target;
    if(target){const head=hit.object.userData.head===true;const damage=w.damage*tuning.damage*(head&&!w.pellets?activeWeapon===3?2:1.5:1);target.hp=Math.max(0,target.hp-damage);totalDamage+=damage;anyHead||=head;if(target.hp<=0){target.reset=2;eliminated=true;target.body.visible=false;target.head.visible=false;}updateTargetLabel(target);}
    addTracer(origin,end);if(hit)addImpact(end,target?0xd5f586:0xeceadd);
  }
  if(totalDamage){session.hits++;if(eliminated)session.eliminations++;hitTime=.18;readoutTime=1.2;$('target-readout').textContent=`${eliminated?'ELIMINATED · ':anyHead?'HEADSHOT · ':''}${Math.round(totalDamage)} DAMAGE`;tone(eliminated?1100:750,.06,.025);}
  $('session-stats').textContent=`${session.shots} SHOTS · ${session.hits} HITS · ${session.eliminations} ELIMINATIONS`;
  const flash=new THREE.PointLight(0xffdc83,2,2);flash.position.set(.2,-.2,-.6);viewScene.add(flash);transients.push({object:flash,life:.045,scene:viewScene});tone(activeWeapon===3?500:900,.09,.035,true);updateHUD();
}
function addTracer(from,to){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([from,to]),new THREE.LineBasicMaterial({color:0xffe6ac,transparent:true,opacity:.7}));scene.add(line);transients.push({object:line,life:.055,scene});}
function addImpact(position,color){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color}));mesh.position.copy(position);scene.add(mesh);transients.push({object:mesh,life:.15,scene});}
function animatePlayer(dt){
  if(!character)return;character.position.copy(player.position);character.rotation.y=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ').y+Math.PI;
  const speed=Math.hypot(player.velocity.x,player.velocity.z);const name=speed>.3?'sprint':'idle';const next=playerActions[name];if(next&&activePlayerAction!==next){activePlayerAction?.fadeOut(.15);next.reset().fadeIn(.15).play();activePlayerAction=next;}playerMixer.update(dt);character.visible=thirdPerson&&isPlaying();if(thirdGun){const yaw=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ').y;thirdGun.rotation.set(0,yaw,0);thirdGun.position.copy(player.position).add(new THREE.Vector3(.3,1.2,-.4).applyAxisAngle(new THREE.Vector3(0,1,0),yaw));thirdGun.visible=character.visible;}
}
function fixedUpdate(dt){
  if(!isPlaying())return;time+=dt;if(!net?.session||net.canFight)stepMovement(dt);else player.velocity.set(0,0,0);cooldown=Math.max(0,cooldown-dt);
  if(reloading>0&&!net?.session){reloading=Math.max(0,reloading-dt);if(reloading===0){ammo=weapons[activeWeapon].mag;tone(500,.08,.015,true);}updateHUD();}
  const w=weapons[activeWeapon];if(w.burst&&shotEdge&&cooldown===0&&!reloading)burstLeft=3;
  if((w.auto&&shotHeld)||(!w.auto&&!w.burst&&shotEdge)||(burstLeft>0&&cooldown===0)){if(cooldown===0&&!reloading){fire();if(burstLeft>0){burstLeft--;if(burstLeft===0)cooldown=.28/tuning.fireRate;}}}shotEdge=false;
  for(const t of targets){if($('moving').checked)t.group.position.x=t.baseX+Math.sin(time*1.1+t.index)*2;if(t.reset>0){t.reset-=dt;if(t.reset<=0){t.hp=150;t.body.visible=true;t.head.visible=true;updateTargetLabel(t);}}}
  animatePlayer(dt);
}
let last=performance.now(),accumulator=0,frameCount=0,fpsTime=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;renderRemotePlayers(dt);controls.pointerSpeed=tuning.sensitivity;
  if(isPlaying()){accumulator=Math.min(accumulator+dt,5/60);while(accumulator>=1/60){fixedUpdate(1/60);accumulator-=1/60;}}
  else accumulator=0;
  recoilKick=THREE.MathUtils.damp(recoilKick,0,16,dt);hitTime=Math.max(0,hitTime-dt);readoutTime=Math.max(0,readoutTime-dt);messageTime=Math.max(0,messageTime-dt);$('hitmarker').style.opacity=String(hitTime>0?1:0);if(readoutTime===0)$('target-readout').textContent='';if(messageTime===0)$('message').textContent='';
  for(let i=transients.length-1;i>=0;i--){const t=transients[i];t.life-=dt;if(t.life<=0){t.scene.remove(t.object);t.object.geometry?.dispose();t.object.material?.dispose();transients.splice(i,1);}}
  if(mode==='inspect'){
    if($('spin').checked&&!dragging)inspectYaw+=dt*.22;inspectMixer?.update(dt);
    const target=new THREE.Vector3(65,inspectTargetY,0);camera.position.set(target.x+Math.sin(inspectYaw)*inspectRadius*Math.cos(inspectPitch),target.y+Math.sin(inspectPitch)*inspectRadius,target.z+Math.cos(inspectYaw)*inspectRadius*Math.cos(inspectPitch));camera.lookAt(target);camera.fov=48;
  }else if(isPlaying()){
    playRotation.copy(camera.quaternion);
    const eye=player.position.clone().add(new THREE.Vector3(0,player.height-.13,0));camera.position.copy(eye);
    if(thirdPerson){const behind=new THREE.Vector3(0,1,4).applyQuaternion(camera.quaternion);camera.position.add(behind);}
    camera.fov=THREE.MathUtils.damp(camera.fov,aim?(activeWeapon===3?32:tuning.fov*.75):tuning.fov,14,dt);
    const bob=Math.sin(time*11)*Math.min(Math.hypot(player.velocity.x,player.velocity.z),8)*.0015;
    gunRig.position.set(aim?0:.22,-.23+bob,-.52+recoilKick);gunRig.rotation.set(reloading?Math.sin((1-reloading/reloadDuration)*Math.PI)*.7:recoilKick*.5,reloading?-.25:0,reloading?-.4:0);
    gunRig.visible=!thirdPerson;armsRig.visible=$('arms-toggle').checked&&!thirdPerson;
  }else{camera.position.set(23,18,25);camera.lookAt(0,0,-1);camera.fov=58;character&&(character.visible=false);if(thirdGun)thirdGun.visible=false;}
  camera.updateProjectionMatrix();renderer.autoClear=true;renderer.render(scene,camera);
  if(isPlaying()&&mode==='play'&&!thirdPerson){renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);}
  frameCount++;fpsTime+=dt;if(fpsTime>.5){$('fps').textContent=`${Math.round(frameCount/fpsTime)} FPS`;frameCount=0;fpsTime=0;}
}
function roomPose() {
  const look = new THREE.Euler().setFromQuaternion(isPlaying() ? camera.quaternion : playRotation,'YXZ');
  return { x:player.position.x,y:Math.max(0,player.position.y),z:player.position.z,
    yaw:Math.atan2(Math.sin(look.y),Math.cos(look.y)),pitch:look.x,height:player.height,
    speed:Math.min(14,Math.hypot(player.velocity.x,player.velocity.z)),crouched:player.height<1.5,paused:!isPlaying() };
}
function respawnOnline(pose) {
  player.position.set(pose.x,pose.y,pose.z);player.velocity.set(0,0,0);player.height=1.8;player.grounded=true;
  player.slideTime=0;player.slideCooldown=0;jumpQueued=0;shotHeld=false;shotEdge=false;burstLeft=0;cooldown=.25;reloading=0;
  playRotation.setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,0,'YXZ'));camera.quaternion.copy(playRotation);
  if(net.local)selectWeapon(net.local.weapon,false);
}
function updateRoomUI() {
  const connected=Boolean(net.session);
  $('create-room').disabled=net.busy||connected;$('join-room').disabled=net.busy||connected;
  $('leave-room').hidden=!net.busy&&!connected;$('leave-room').textContent=net.busy?'Cancel':'Leave room';
  $('copy-room').hidden=!connected;$('room-code').disabled=net.busy||connected;$('player-name').disabled=net.busy||connected;
  $('multiplayer-status').textContent=net.message;$('duel-banner').hidden=!connected;
  $('reset-targets').disabled=connected;$('moving').disabled=connected;$('defaults').disabled=connected;
  for(const [key]of sliderSpecs)if(!['sensitivity','fov'].includes(key))$(`tune-${key}`).disabled=connected;
  if(connected&&!offlineTuning){
    offlineTuning={...tuning};for(const [key]of sliderSpecs)if(!['sensitivity','fov'].includes(key))tuning[key]=defaults[key];
    setMode('play');
  }else if(!connected&&offlineTuning){
    for(const [key]of sliderSpecs)if(!['sensitivity','fov'].includes(key))tuning[key]=offlineTuning[key];
    offlineTuning=null;resetTargets();
  }
  for(const [key,label,min,max,step,unit]of sliderSpecs){const input=$(`tune-${key}`);input.value=tuning[key];input.previousElementSibling.querySelector('output').textContent=`${tuning[key].toFixed(key==='fov'?0:1)} ${unit}`;}
  for(const t of targets)t.group.visible=!connected;
  const s=net.snapshot,p=net.local;
  if(connected){
    $('room-code').value=net.session.code;
    const rows=(s?.players||[]).map(p=>`${p.name}${p.id===net.session.id?' (you)':''} · ${p.hp} HP · ${p.score} wins`);
    $('room-players').textContent=rows.join('\n');
    $('duel-score').textContent=(s?.players||[]).map(p=>`${p.name} ${p.score}`).join('  /  ')||'Connecting';
    const phase=s?.phase;
    const winner=s?.players.find(p=>p.id===s.winner)?.name;
    $('duel-phase').textContent=phase==='waiting'?`Room ${net.session.code} · waiting for a friend`:phase==='countdown'?`Starts in ${Math.ceil(s.remaining/1000)} · enter playtest`:phase==='playing'?`${Math.ceil(s.remaining/1000)}s · first to five`:phase==='finished'?`${winner||'Player'} wins · host can rematch`:`${winner?winner+' won the round':'Draw'} · next round shortly`;
    $('status').textContent=`Room ${net.session.code} · ${net.session.host?'host':`${Math.round(net.latency||0)} ms RTT`} · ${s?.players.length||1}/2 players`;
  }else{$('room-players').textContent='';}
  $('rematch').hidden=!connected||!net.session.host||s?.phase!=='finished';
  if(p){
    if(p.weapon!==activeWeapon&&!net.pending.some(a=>a.kind==='equip'))selectWeapon(p.weapon,false);
    ammo=net.predictedAmmo(activeWeapon);reloading=net.pending.some(a=>a.kind==='reload')?weapons[activeWeapon].reload:p.reloadRemaining/1000;
    // Correct rejected large movements without overriding ordinary local prediction.
    if(Math.hypot(player.position.x-p.pose.x,player.position.z-p.pose.z)>1.5){player.position.set(p.pose.x,p.pose.y,p.pose.z);player.velocity.set(0,0,0);}
  }
  $('self-hp').textContent=p?Math.ceil(p.hp):150;$('health-bar').style.width=`${170*(p?p.hp:150)/150}px`;updateHUD();
}
function setupMultiplayer() {
  net=new DuelMultiplayer({stateProvider:roomPose,onChange:updateRoomUI,onSpawn:respawnOnline,onEvent:onlineEvent,
    peerOptions:window.DUELS_PEER_OPTIONS||window.STILLWATER_PEER_OPTIONS||{},
    wallDistance:(origin,direction)=>{
      scene.updateMatrixWorld(true);raycaster.set(new THREE.Vector3(origin.x,origin.y,origin.z),new THREE.Vector3(direction.x,direction.y,direction.z));raycaster.far=100;
      return raycaster.intersectObjects(worldMeshes,false)[0]?.distance??100;
    }});
  try{$('player-name').value=localStorage.getItem('duels.playerName')||'Player';}catch{}
  const invite=new URL(location.href).searchParams.get('room');if(invite&&/^[a-f0-9]{6}$/i.test(invite))$('room-code').value=invite.toUpperCase();
  const join=create=>{try{localStorage.setItem('duels.playerName',$('player-name').value);}catch{}net.join({create,code:$('room-code').value,name:$('player-name').value});};
  $('create-room').onclick=()=>join(true);$('join-room').onclick=()=>join(false);$('leave-room').onclick=()=>net.leave();$('rematch').onclick=()=>net.rematch();
  $('copy-room').onclick=async()=>{
    if(!net.session)return;const invite=new URL(location.href);invite.searchParams.set('room',net.session.code);
    try{await navigator.clipboard.writeText(invite.href);net.notify('Invite copied. Localhost links only work on this computer; share the room code with friends using their reachable game URL.');}
    catch{net.notify(`Room ${net.session.code} · invite: ${invite.href}`);}
  };
  updateRoomUI();
}
function fireOnline() {
  if(!net.canFight||cooldown>0||reloading)return;
  if(ammo<=0){reload();return;}
  const look=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');
  if(!net.command('fire',{weapon:activeWeapon,yaw:Math.atan2(Math.sin(look.y),Math.cos(look.y)),pitch:look.x,aim}))return;
  const w=weapons[activeWeapon];ammo=net.predictedAmmo(activeWeapon);cooldown=w.interval;session.shots++;
  $('session-stats').textContent=`${session.shots} SHOTS · ${session.hits} HITS · ${session.eliminations} ELIMINATIONS`;
  recoilKick+=.04*tuning.recoil;look.x=Math.min(Math.PI/2-.05,look.x+.009*tuning.recoil);camera.quaternion.setFromEuler(look);
  tone(activeWeapon===3?500:900,.09,.035,true);updateHUD();
}
function onlineEvent(event) {
  if(event.type==='shot'){
    const origin=new THREE.Vector3(event.origin.x,event.origin.y,event.origin.z);
    for(const ray of event.rays)addTracer(origin,new THREE.Vector3(ray.x,ray.y,ray.z));
    if(event.shooter===net.session?.id&&event.damage>0){session.hits++;hitTime=.18;readoutTime=1.2;$('target-readout').textContent=`${Math.round(event.damage)} DAMAGE`;tone(750,.06,.025);}
    else if(event.shooter!==net.session?.id)tone(500,.06,.012,true);
  }else if(event.type==='elimination'){
    if(event.shooter===net.session?.id){session.eliminations++;announce(event.finished?'MATCH WON':'ROUND WON');}else announce('ELIMINATED · WAIT FOR NEXT ROUND');
  }
  $('session-stats').textContent=`${session.shots} SHOTS · ${session.hits} HITS · ${session.eliminations} ELIMINATIONS`;
}
function disposeRemote(entry) {
  scene.remove(entry.group);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);
  entry.group.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});
  entry.label.material.map.dispose();entry.label.material.dispose();
}
function renderRemotePlayers(dt) {
  const opponent=net?.opponent;
  for(const [id,entry]of remotePlayers)if(id!==opponent?.id){disposeRemote(entry);remotePlayers.delete(id);}
  if(!opponent||!models.has('Character'))return;
  let entry=remotePlayers.get(opponent.id);
  if(!entry){
    const group=new THREE.Group(),model=cloneModel(models.get('Character'));group.add(model);scene.add(group);
    const mixer=new THREE.AnimationMixer(model),actions={};for(const clip of models.get('Character').clips)actions[clip.name]=mixer.clipAction(clip);
    const label=textSprite(opponent.name);label.material.depthTest=true;label.position.y=2.2;label.scale.set(2.6,.48,1);group.add(label);
    entry={group,model,mixer,actions,label,weapon:-1,epoch:-1};remotePlayers.set(opponent.id,entry);
  }
  const p=opponent.pose;
  if(entry.epoch!==net.snapshot.epoch){entry.group.position.set(p.x,p.y,p.z);entry.epoch=net.snapshot.epoch;}
  else{entry.group.position.x=THREE.MathUtils.damp(entry.group.position.x,p.x,15,dt);entry.group.position.y=THREE.MathUtils.damp(entry.group.position.y,p.y,15,dt);entry.group.position.z=THREE.MathUtils.damp(entry.group.position.z,p.z,15,dt);}
  entry.model.rotation.y=p.yaw+Math.PI;entry.model.scale.y=p.height/1.8;entry.group.visible=opponent.hp>0;
  const next=entry.actions[p.speed>.3?'sprint':'idle'];if(next!==entry.action){entry.action?.fadeOut(.15);next?.reset().fadeIn(.15).play();entry.action=next;}entry.mixer.update(dt);
  if(entry.weapon!==opponent.weapon){
    if(entry.gun){entry.group.remove(entry.gun);entry.gun.traverse(n=>{if(n.isMesh)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});}
    entry.gun=cloneModel(models.get(weapons[opponent.weapon].name));entry.group.add(entry.gun);entry.weapon=opponent.weapon;
  }
  entry.gun.rotation.set(-p.pitch,p.yaw,0,'YXZ');entry.gun.position.copy(new THREE.Vector3(.3,p.height*.66,-.4).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw));
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;viewCamera.aspect=camera.aspect;camera.updateProjectionMatrix();viewCamera.updateProjectionMatrix();});
window.addEventListener('pagehide',()=>{net?.destroy();controls.unlock();audioContext?.close();renderer.dispose();});
boot();requestAnimationFrame(frame);

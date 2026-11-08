import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { DuelAuthority, aimDirection, hitPlayer, validPose, PROTOCOL } from '../games/duels/duel-rules.js';
import { DuelMultiplayer } from '../games/duels/multiplayer.js';

test('duel authority applies headshots, owns ammo and deduplicates actions',()=>{
  let now=1000;const events=[];
  const game=new DuelAuthority({now:()=>now,emit:e=>events.push(e),random:()=>.5});game.add('a','Host',0);game.add('b','Guest',1);
  assert.equal(game.phase,'countdown');assert.equal(game.action('a',{seq:1,epoch:game.epoch,kind:'fire',weapon:0,yaw:0,pitch:0}),false);
  now+=3000;game.tick();game.pose('a',{...game.players.get('a').pose,paused:false},game.epoch,1);
  const shot={seq:2,epoch:game.epoch,kind:'fire',weapon:0,yaw:0,pitch:0};
  assert.equal(game.action('a',shot),true);assert.equal(game.players.get('b').hp,123);assert.equal(game.players.get('a').ammo[0],29);
  assert.equal(game.action('a',shot),false);assert.equal(game.players.get('b').hp,123);
  assert.equal(game.action('a',{...shot,seq:3}),false);assert.equal(game.players.get('a').ammo[0],29);
  now+=100;assert.equal(game.action('a',{...shot,seq:4}),true);assert.equal(events.filter(e=>e.type==='shot').length,2);
});

test('solid cover blocks hits and shotgun pellets cannot damage through it',()=>{
  let now=0;const game=new DuelAuthority({now:()=>now,wallDistance:()=>5,random:()=>.5});game.add('a','A',0);game.add('b','B',1);
  now=3000;game.tick();game.pose('a',{...game.players.get('a').pose,paused:false},game.epoch,1);
  game.action('a',{kind:'equip',weapon:2,seq:1,epoch:game.epoch});now+=250;
  game.action('a',{kind:'fire',weapon:2,seq:2,epoch:game.epoch,yaw:0,pitch:0});assert.equal(game.players.get('b').hp,150);assert.equal(game.players.get('a').ammo[2],5);
});

test('reloads, switching and match resets use host resources and round epochs',()=>{
  let now=0;const game=new DuelAuthority({now:()=>now,random:()=>.5});game.add('a','A',0);game.add('b','B',1);now=3000;game.tick();
  let seq=0;const command=(kind,extra={})=>game.action('a',{kind,seq:++seq,epoch:game.epoch,...extra});
  game.pose('a',{...game.players.get('a').pose,paused:false},game.epoch,1);command('fire',{weapon:0,yaw:0,pitch:0});command('reload');
  now+=1000;game.tick();assert.equal(game.players.get('a').ammo[0],29);assert.equal(command('fire',{weapon:0,yaw:0,pitch:0}),false);
  command('equip',{weapon:4});now+=250;command('equip',{weapon:0});assert.equal(game.players.get('a').reloadUntil,0);assert.equal(game.players.get('a').ammo[0],29);
  command('reload');now+=2000;game.tick();assert.equal(game.players.get('a').ammo[0],30);
  for(let round=0;round<5;round++){
    game.players.get('b').hp=20;game.players.get('a').pose.paused=false;now+=300;command('fire',{weapon:0,yaw:0,pitch:0});
    assert.equal(game.players.get('a').score,round+1);
    if(round<4){const oldEpoch=game.epoch;now+=2500;game.tick();assert(game.epoch>oldEpoch);assert.equal(game.pose('a',{...game.players.get('a').pose,x:1},oldEpoch,50+round),false);now+=3000;game.tick();}
  }
  assert.equal(game.phase,'finished');assert.equal(game.rematch(),true);assert.equal(game.players.get('a').score,0);assert.equal(game.players.get('b').hp,150);
});

test('pose validation rejects malformed values, teleporting and stale movement',()=>{
  let now=0;const game=new DuelAuthority({now:()=>now});game.add('a','A',0);game.add('b','B',1);now=3000;game.tick();
  const pose={...game.players.get('a').pose,paused:false};assert.equal(validPose({...pose,x:NaN}),null);
  assert.equal(game.pose('a',{...pose,x:18},game.epoch,1),false);
  now+=50;assert.equal(game.pose('a',{...pose,x:.3,height:1.15,crouched:true,y:1},game.epoch,2),true);
  assert.equal(game.pose('a',pose,game.epoch,1),false);
  const hit=hitPlayer({x:0,y:1,z:11},aimDirection(0,0),{pose:{x:0,y:0,z:-11,height:1.8}});assert.equal(hit.head,false);
});

function mockNetwork(){
  const registry=new Map();let id=0;const clock={now:1000};
  class Connection extends EventEmitter{
    constructor(peer,metadata){super();Object.assign(this,{peer,metadata,open:false,bufferSize:0,dataChannel:{bufferedAmount:0}});}
    send(data){const copy=structuredClone(data);queueMicrotask(()=>{if(this.partner?.open)this.partner.emit('data',copy);});}
    close(){if(!this.open&&!this.partner?.open)return;this.open=false;this.partner.open=false;queueMicrotask(()=>{this.emit('close');this.partner.emit('close');});}
  }
  class Peer extends EventEmitter{
    constructor(name){super();this.id=typeof name==='string'?name:`guest-${++id}`;this.connections=[];this.destroyed=false;
      if(registry.has(this.id))queueMicrotask(()=>this.emit('error',{type:'unavailable-id'}));
      else{registry.set(this.id,this);queueMicrotask(()=>{if(!this.destroyed)this.emit('open',this.id);});}}
    connect(remoteId,options){const out=new Connection(remoteId,options.metadata);this.connections.push(out);const remote=registry.get(remoteId);
      if(!remote){queueMicrotask(()=>this.emit('error',{type:'peer-unavailable'}));return out;}
      const incoming=new Connection(this.id,options.metadata);out.partner=incoming;incoming.partner=out;remote.connections.push(incoming);
      queueMicrotask(()=>{remote.emit('connection',incoming);out.open=incoming.open=true;out.emit('open');incoming.emit('open');});return out;}
    destroy(){this.destroyed=true;if(registry.get(this.id)===this)registry.delete(this.id);for(const c of this.connections)c.close();this.emit('close');}
    reconnect(){this.disconnected=false;this.emit('open',this.id);}
  }
  const clients=[];
  function client(name){
    const intervals=new Map(),timeouts=new Map();let timer=0;const events=[];let pose={x:0,y:0,z:11,yaw:0,pitch:0,height:1.8,speed:0,paused:false};
    const net=new DuelMultiplayer({loadPeer:async()=>Peer,now:()=>clock.now,stateProvider:()=>pose,onSpawn:p=>{pose={...p,paused:false};},onEvent:e=>events.push(e),
      timers:{setInterval:fn=>{const n=++timer;intervals.set(n,fn);return n;},clearInterval:n=>intervals.delete(n),setTimeout:fn=>{const n=++timer;timeouts.set(n,fn);return n;},clearTimeout:n=>timeouts.delete(n)}});
    const c={net,events,pose:v=>{pose={...pose,...v};},step:()=>{for(const fn of intervals.values())fn();},timeouts};clients.push(c);return c;
  }
  return{registry,clock,client,async pump(ms=50){clock.now+=ms;for(const c of clients)c.step();await flush();clock.now+=50;for(const c of clients)c.step();await flush();}};
}
async function flush(){await nextTurn();await nextTurn();}

test('PeerJS rooms synchronize both players, combat, health, scores and disconnection',async()=>{
  const n=mockNetwork(),host=n.client('Host'),guest=n.client('Friend');await host.net.join({create:true,name:'Host'});await flush();
  const code=host.net.session.code;assert.match(code,/^[A-F0-9]{6}$/);await guest.net.join({code:code.toLowerCase(),name:'Friend'});await flush();
  assert.equal(host.net.snapshot.players.length,2);assert.equal(guest.net.snapshot.players.length,2);assert.equal(guest.net.opponent.name,'Host');
  await n.pump(3000);guest.pose({x:.4,y:1,height:1.15,crouched:true,speed:7});await n.pump();assert.equal(host.net.opponent.pose.x,.4);assert.equal(host.net.opponent.pose.crouched,true);
  guest.pose({x:0,y:0,height:1.8,crouched:false});await n.pump();
  for(let i=0;i<6;i++){assert.equal(host.net.command('fire',{weapon:0,yaw:0,pitch:0}),true);await n.pump(100);}
  assert.equal(host.net.local.score,1);assert.equal(guest.net.local.hp,0);assert.equal(guest.net.snapshot.phase,'intermission');assert(guest.events.some(e=>e.type==='elimination'));
  await n.pump(2500);assert.equal(guest.net.local.hp,150);assert.equal(guest.net.snapshot.phase,'countdown');
  guest.net.leave();await flush();assert.equal(host.net.snapshot.phase,'waiting');assert.equal(host.net.snapshot.players.length,1);
  const replacement=n.client('Replacement');await replacement.net.join({code,name:'Replacement'});await flush();assert.equal(replacement.net.snapshot.players.length,2);
  host.net.leave();await flush();assert.equal(replacement.net.session,null);assert.match(replacement.net.message,/host left/i);
});

test('rooms enforce capacity, version isolation, cancellation and missing-room errors',async()=>{
  const n=mockNetwork(),host=n.client('Host'),guest=n.client('Guest'),third=n.client('Third');await host.net.join({create:true});await flush();const code=host.net.session.code;
  await guest.net.join({code});await flush();await third.net.join({code});await flush();assert.equal(third.net.session,null);assert.match(third.net.message,/full/);
  const missing=n.client('Lost');await missing.net.join({code:'FFFFFF'});await flush();assert.equal(missing.net.session,null);assert.match(missing.net.message,/not found/);
  const wrong=n.client('Wrong');await wrong.net.join({create:true});await flush();const peer=n.registry.get(wrong.net.session.id);
  const c=peer.connect(`${PROTOCOL}-${code}`,{metadata:{protocol:'stillwater-v1',build:'wrong'}});let rejected='';c.on('data',m=>{if(m.type==='reject')rejected=m.message;});await flush();assert.match(rejected,/version/);
  let resolve;const delayed=new DuelMultiplayer({loadPeer:()=>new Promise(r=>resolve=r),timers:{setInterval:()=>0,clearInterval(){},setTimeout:()=>0,clearTimeout(){}}});const pending=delayed.join({create:true});delayed.leave();resolve(class{constructor(){throw new Error('must not create peer after cancel');}});await pending;assert.equal(delayed.session,null);
});

test('guest actions cannot forge damage, replay shots or bypass host ammo checks',async()=>{
  const n=mockNetwork(),host=n.client('Host'),guest=n.client('Guest');await host.net.join({create:true});await flush();await guest.net.join({code:host.net.session.code});await flush();await n.pump(3000);
  guest.net.command('fire',{weapon:0,yaw:Math.PI,pitch:0,damage:999999});await flush();host.step();await flush();
  assert.equal(host.net.local.hp,123);const hp=host.net.local.hp;
  const action={kind:'fire',seq:1,epoch:guest.net.snapshot.epoch,weapon:0,yaw:Math.PI,pitch:0};guest.net.connection.send({type:'action',action});await flush();assert.equal(host.net.local.hp,hp);
  guest.net.connection.send({type:'pose',seq:999,epoch:guest.net.snapshot.epoch,pose:{x:NaN,y:0,z:0,yaw:0,pitch:0,height:1.8,speed:0}});await flush();assert(Number.isFinite(host.net.opponent.pose.x));
});

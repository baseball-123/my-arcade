import { BUILD, PROTOCOL, MAX_PLAYERS, DuelAuthority, cleanName, validPose } from './duel-rules.js?v=ui2';
import { weapons } from './weapons.js?v=battle1';

let libraryPromise;
export function loadPeerLibrary() {
  if (typeof window.Peer === 'function') return Promise.resolve(window.Peer);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src = new URL('./vendor/peerjs/peerjs.min.js',import.meta.url).href;
    const timer = setTimeout(() => fail(),12000);
    const fail = () => { clearTimeout(timer); script.remove(); libraryPromise = null; reject(new Error('PeerJS could not load. Refresh and try again.')); };
    script.onerror = fail;
    script.onload = () => { if (typeof window.Peer !== 'function') return fail(); clearTimeout(timer); resolve(window.Peer); };
    document.head.append(script);
  });
  return libraryPromise;
}
function validSnapshot(s) {
  if (!s || !Number.isSafeInteger(s.epoch) || s.epoch < 0 || !['waiting','countdown','playing','intermission','finished'].includes(s.phase) ||
      !Number.isFinite(s.remaining) || s.remaining < 0 || s.remaining > 100000 || !Array.isArray(s.players) || s.players.length > MAX_PLAYERS ||
      !['duel','ffa','teams'].includes(s.mode) || !Number.isInteger(s.capacity) || s.capacity < 2 || s.capacity > MAX_PLAYERS ||
      s.goal !== ({duel:5,ffa:30,teams:50})[s.mode] || !Array.isArray(s.teamScores) || s.teamScores.length !== 2 ||
      s.teamScores.some(score => !Number.isInteger(score) || score < 0 || score > 50)) return false;
  const ids = new Set(), slots = new Set();
  for (const p of s.players) {
    if (!p || typeof p.id !== 'string' || p.id.length > 128 || ids.has(p.id) || !Number.isInteger(p.slot) || p.slot < 0 || p.slot >= s.capacity || slots.has(p.slot) || !validPose(p.pose) ||
        !Number.isFinite(p.hp) || p.hp < 0 || p.hp > 150 || !Number.isInteger(p.score) || p.score < 0 || p.score > 50 || ![0,1].includes(p.team) || !Number.isSafeInteger(p.life) || p.life < 0 || !weapons[p.primary] || !weapons[p.secondary] || !Number.isFinite(p.respawnRemaining) || p.respawnRemaining < 0 || p.respawnRemaining > 1250 ||
        !Number.isInteger(p.weapon) || !weapons[p.weapon] || !Number.isSafeInteger(p.ack) || p.ack < 0 || !Number.isFinite(p.reloadRemaining) || p.reloadRemaining < 0 || p.reloadRemaining > 10000 ||
        !Array.isArray(p.ammo) || p.ammo.length !== weapons.length || p.ammo.some((n,i) => !Number.isInteger(n) || n < 0 || n > weapons[i].mag)) return false;
    ids.add(p.id); slots.add(p.slot);
  }
  return true;
}
export class DuelMultiplayer {
  constructor({ stateProvider, onChange = () => {}, onSpawn = () => {}, onEvent = () => {}, wallDistance,
    loadPeer = loadPeerLibrary, peerOptions = {}, now = () => Date.now(), timers = globalThis } = {}) {
    Object.assign(this,{stateProvider,onChange,onSpawn,onEvent,wallDistance,loadPeer,peerOptions,now,timers});
    this.guests = new Map();
    this.session=null; this.busy=false; this.snapshot=null; this.message='Create a room or join a private battle.';
    this.generation=0; this.actionSeq=0; this.poseSeq=0; this.pending=[]; this.lastEpoch=-1; this.lastEvent=0;
    this.interval=timers.setInterval(()=>this.sync(),50);
  }
  notify(message) { if (message) this.message=message; this.onChange(this); }
  send(connection,message) {
    if (!connection?.open || connection.bufferSize > 8 || connection.dataChannel?.bufferedAmount > 65536) return false;
    try { connection.send(message); return true; } catch { return false; }
  }
  get local() { return this.snapshot?.players.find(p=>p.id===this.session?.id); }
  get opponents() { return this.snapshot?.players.filter(p => p.id !== this.session?.id) ?? []; }
  get opponent() { return this.snapshot?.players.find(p=>p.id!==this.session?.id); }
  get canFight() { return this.session && this.snapshot?.phase==='playing' && this.local?.hp>0; }
  predictedAmmo(weapon) {
    const p=this.local;if(!p)return weapons[weapon].mag;
    return Math.max(0,p.ammo[weapon]-this.pending.filter(a=>a.kind==='fire'&&a.weapon===weapon&&a.epoch===this.snapshot.epoch).length);
  }
  apply(snapshot) {
    if (!this.session || !validSnapshot(snapshot) || !snapshot.players.some(p=>p.id===this.session.id) || snapshot.epoch < this.lastEpoch) return;
    this.snapshot=snapshot;this.receivedAt=this.now();this.pending=this.pending.filter(a=>a.seq>this.local.ack&&a.epoch===snapshot.epoch);
    if (snapshot.epoch !== this.lastEpoch || this.local.life !== this.lastLife) {
      this.lastEpoch = snapshot.epoch;
      this.lastLife = this.local.life;
      this.pending = [];
      this.onSpawn({ ...this.local.pose });
    }
    this.notify();
  }
  broadcast() {
    if(!this.session?.host)return;
    const snapshot=this.authority.snapshot();this.apply(snapshot);for (const { connection } of this.guests.values()) this.send(connection, { type: 'snapshot', snapshot });
  }
  publishEvent(event) {
    this.receiveEvent(event);for (const { connection } of this.guests.values()) this.send(connection, { type: 'event', event });
  }
  receiveEvent(event) {
    if (!event || !Number.isSafeInteger(event.eventId) || event.eventId<=this.lastEvent || !['shot','elimination','roundEnd','throw','blast'].includes(event.type)) return;
    if(event.type==='shot'&&(!event.origin||!['x','y','z'].every(k=>Number.isFinite(event.origin[k]))||!Array.isArray(event.rays)||event.rays.length>8||event.rays.some(r=>!r||!['x','y','z'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<200))))return;
    if (['throw', 'blast'].includes(event.type)) {
      const validPoint = point => point && ['x', 'y', 'z'].every(axis => Number.isFinite(point[axis]) && Math.abs(point[axis]) < 100);
      if (!validPoint(event.position) || (event.type === 'throw' && !validPoint(event.origin))) return;
    }
    this.lastEvent=event.eventId;this.onEvent(event);
  }
  leave(message='Left the room. Solo practice is available.') {
    this.generation++;this.timers.clearTimeout(this.startupTimer);this.timers.clearTimeout(this.reconnectTimer);
    const peer=this.peer;this.guests.clear();this.peer=null;this.connection=null;this.session=null;this.busy=false;this.snapshot=null;this.authority=null;
    this.pending=[];this.lastEpoch=-1;this.lastEvent=0;this.actionSeq=0;this.poseSeq=0;peer?.destroy();this.notify(message);
  }
  destroy() { this.timers.clearInterval(this.interval);this.leave(); }
  async join({create=false,code='',name='Player',mode='duel',capacity=2,manualStart=false}={}) {
    if(this.busy||this.session)return;
    code=String(code).trim().toUpperCase();
    if(!create&&!/^[A-F0-9]{6}$/.test(code)){this.notify('Enter your friend’s six-character room code.');return;}
    if(create)code=[...crypto.getRandomValues(new Uint8Array(3))].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
    this.busy=true;const generation=++this.generation;this.notify(create?'Creating a PeerJS room…':'Connecting to your friend…');
    try {
      const Peer=await this.loadPeer();if(generation!==this.generation)return;
      const options={secure:true,debug:0,...this.peerOptions};
      const peer=create?new Peer(`${PROTOCOL}-${code}`,options):new Peer(options);this.peer=peer;
      this.startupTimer=this.timers.setTimeout(()=>{if(generation===this.generation)this.leave('Connection timed out. Check the code and keep the host open. This network may need a TURN relay.');},20000);
      peer.on('open',id=>{
        if(generation!==this.generation)return;
        if(this.session){this.notify('Signaling reconnected.');return;}
        if(create){
          this.timers.clearTimeout(this.startupTimer);this.busy=false;this.session={id,code,host:true};
          this.authority=new DuelAuthority({now:this.now,wallDistance:this.wallDistance,emit:e=>this.publishEvent(e),mode,capacity,manualStart});
          this.authority.add(id,name,0);this.broadcast();this.notify(`Room ${code} is ready. Share the code and keep this host open.`);
        }else this.connectHost(peer,code,name,generation);
      });
      peer.on('connection',connection=>{if(generation===this.generation&&create)this.accept(connection,generation);else{connection.on('error',()=>{});connection.close();}});
      peer.on('disconnected',()=>{
        if(generation!==this.generation)return;this.notify('Signaling disconnected; existing play can continue. Reconnecting…');
        this.reconnectTimer=this.timers.setTimeout(()=>{if(generation===this.generation&&!peer.destroyed&&peer.disconnected)peer.reconnect();},1500);
      });
      peer.on('close',()=>{if(generation===this.generation)this.leave('The PeerJS session closed. Create or join a room again.');});
      peer.on('error',error=>{
        if(generation!==this.generation)return;
        if(this.session&&['network','socket-error','socket-closed','disconnected'].includes(error.type)){this.notify('Signaling unavailable. Existing connections may continue.');return;}
        this.leave({'peer-unavailable':'Room not found. Check the code and keep the host open.','unavailable-id':'Room code in use. Create a new room.','browser-incompatible':'This browser does not support WebRTC. Try Edge or Chrome.','webrtc':'Direct connection failed. Try another network or configure a TURN relay.'}[error.type]||'PeerJS could not connect. Check your internet connection.');
      });
    }catch(error){if(generation===this.generation)this.leave(error.message||'Could not start PeerJS.');}
  }
  accept(connection,generation) {
    let accepted=false,lastPose=0,windowAt=this.now(),messageCount=0;
    const timer=this.timers.setTimeout(()=>connection.close(),12000);
    connection.on('error',()=>connection.close());
    connection.on('open',()=>{
      this.timers.clearTimeout(timer);
      if(generation!==this.generation||!this.session?.host){connection.close();return;}
      const reject=message=>{this.send(connection,{type:'reject',message});this.timers.setTimeout(()=>connection.close(),200);};
      if(connection.metadata?.protocol!==PROTOCOL||connection.metadata?.build!==BUILD){reject('Different game version. Refresh both games.');return;}
      if (this.authority.players.size >= this.authority.capacity) {
        reject(`This room is full (${this.authority.capacity} players).`);
        return;
      }
      if (this.authority.phase !== 'waiting') { reject('This battle is already underway.'); return; }
      const usedSlots = new Set([...this.authority.players.values()].map(player => player.slot));
      const slot = Array.from({length: this.authority.capacity}, (_, index) => index).find(index => !usedSlots.has(index));
      if (!this.authority.add(connection.peer, connection.metadata.name, slot)) { reject('Unable to join this room.'); return; }
      accepted = true;
      this.guests.set(connection.peer, { connection, seen: this.now() });
      this.send(connection,{type:'welcome',id:connection.peer,code:this.session.code,build:BUILD});this.broadcast();
      this.notify('Player joined. Choose equipment and mark yourself ready.');
    });
    connection.on('data',message=>{
      if(!accepted||generation!==this.generation||this.guests.get(connection.peer)?.connection !== connection||!message||typeof message!=='object')return;
      const t=this.now();if(t-windowAt>=1000){windowAt=t;messageCount=0;}if(++messageCount>120){connection.close();return;}
      if(JSON.stringify(message).length>4096){connection.close();return;}this.guests.get(connection.peer).seen = t;
      if(message.type==='pose'&&t-lastPose>=30){lastPose=t;this.authority.pose(connection.peer,message.pose,message.epoch,message.seq);}
      else if(message.type==='action'){this.authority.tick();this.authority.action(connection.peer,message.action);this.broadcast();}
      else if(message.type==='ping')this.send(connection,{type:'pong',at:message.at});
    });
    connection.on('close',()=>{
      this.timers.clearTimeout(timer);if(!accepted||generation!==this.generation||this.guests.get(connection.peer)?.connection !== connection)return;
      this.guests.delete(connection.peer);this.authority.remove(connection.peer);this.broadcast();this.notify('A player left the room.');
    });
  }
  connectHost(peer,code,name,generation) {
    const connection=peer.connect(`${PROTOCOL}-${code}`,{serialization:'json',reliable:true,metadata:{protocol:PROTOCOL,build:BUILD,name:cleanName(name)}});this.connection=connection;
    connection.on('error',()=>{if(generation===this.generation)this.leave('Could not reach the host. Check the code or try another network.');});
    connection.on('data',message=>{
      if(generation!==this.generation||!message||typeof message!=='object')return;
      if(message.type==='reject'){this.leave(String(message.message).slice(0,160));return;}
      if(message.type==='welcome'&&!this.session&&message.code===code&&message.id===peer.id&&message.build===BUILD){
        this.timers.clearTimeout(this.startupTimer);this.busy=false;this.session={id:peer.id,code,host:false};this.receivedAt=this.now();this.notify(`Joined room ${code}. Choose your loadout when the room fills.`);
      }
      if(!this.session)return;
      if(message.type==='snapshot')this.apply(message.snapshot);
      if(message.type==='event')this.receiveEvent(message.event);
      if(message.type==='pong'&&Number.isFinite(message.at))this.latency=Math.max(0,this.now()-message.at);
    });
    connection.on('close',()=>{if(generation===this.generation)this.leave('The host left or the connection closed. You can continue solo.');});
  }
  sendPose() {
    if(!this.session||!this.snapshot)return;
    const pose=validPose(this.stateProvider?.());if(!pose)return;
    const message={type:'pose',pose,epoch:this.snapshot.epoch,seq:++this.poseSeq};
    if(this.session.host)this.authority.pose(this.session.id,pose,message.epoch,message.seq);else this.send(this.connection,message);
  }
  command(kind,extra={}) {
    if(!this.session||!this.local)return false;
    this.sendPose();const action={...extra,kind,seq:++this.actionSeq,epoch:this.snapshot.epoch,life:this.local.life};
    if(this.session.host){this.authority.tick();const accepted=this.authority.action(this.session.id,action);this.broadcast();return accepted;}
    if(this.pending.length>=64||!this.send(this.connection,{type:'action',action})){this.notify('Connection is busy. Wait or rejoin the room.');return false;}
    this.pending.push(action);return true;
  }
  rematch() {if(this.session?.host&&this.authority.rematch())this.broadcast();}
  startMatch() {
    if (!this.session?.host || !this.authority.startMatch()) return false;
    this.broadcast();
    return true;
  }
  setCapacity(capacity) {
    if (!this.session?.host || !this.authority.setCapacity(capacity)) return false;
    this.broadcast();
    return true;
  }
  sync() {
    if(!this.session)return;
    const t=this.now();this.sendPose();
    if(this.session.host){
      this.authority.tick();
      for (const { connection, seen } of this.guests.values()) if (t - seen > 15000) connection.close();
      this.broadcast();
    }else{
      if(t-this.receivedAt>15000){this.leave('The host stopped responding. Rejoin when the host is back.');return;}
      if(t-(this.pingAt||0)>2000){this.pingAt=t;this.send(this.connection,{type:'ping',at:t});}
    }
  }
}

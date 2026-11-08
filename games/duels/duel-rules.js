import { weapons } from './weapons.js';

export const PROTOCOL = 'arcade-duels-v1';
export const BUILD = 'arena-lab-mp1';
export const MAX_PLAYERS = 2;
export const cleanName = name => String(name || 'Player').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Player';
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function validPose(pose) {
  if (!pose || !finite(pose.x, -20, 20) || !finite(pose.y, 0, 12) || !finite(pose.z, -16, 16) ||
      !finite(pose.yaw, -Math.PI, Math.PI) || !finite(pose.pitch, -Math.PI / 2, Math.PI / 2) ||
      !finite(pose.height, 1.15, 1.8) || !finite(pose.speed, 0, 14)) return null;
  return { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, pitch: pose.pitch, height: pose.height,
    speed: pose.speed, crouched: pose.crouched === true, paused: pose.paused === true };
}
export function spawnPose(slot) {
  return { x: 0, y: 0, z: slot === 0 ? 11 : -11, yaw: slot === 0 ? 0 : Math.PI,
    pitch: 0, height: 1.8, speed: 0, crouched: false, paused: true };
}
export function aimDirection(yaw, pitch) {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
}
// Pure slab intersection shared by hit tests. Distances are meters along a unit ray.
export function rayBox(origin, direction, min, max) {
  let near = 0, far = 100;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-8) { if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null; }
    else {
      const a = (min[axis] - origin[axis]) / direction[axis], b = (max[axis] - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) return null;
    }
  }
  return near;
}
export function hitPlayer(origin, direction, target) {
  const p = target.pose, top = p.y + p.height;
  const head = rayBox(origin, direction, { x: p.x - .23, y: top - .44, z: p.z - .23 }, { x: p.x + .23, y: top, z: p.z + .23 });
  const body = rayBox(origin, direction, { x: p.x - .36, y: p.y + .12, z: p.z - .26 }, { x: p.x + .36, y: top - .44, z: p.z + .26 });
  if (head === null && body === null) return null;
  return head !== null && (body === null || head <= body) ? { distance: head, head: true } : { distance: body, head: false };
}

// The host owns combat, resources and round transitions. Movement remains client simulated
// with bounded pose updates for this friends-only prototype, not competitive anti-cheat.
export class DuelAuthority {
  constructor({ now = () => Date.now(), wallDistance = () => 100, emit = () => {}, random = Math.random } = {}) {
    this.now = now; this.wallDistance = wallDistance; this.emit = emit; this.random = random;
    this.players = new Map(); this.epoch = 0; this.phase = 'waiting'; this.deadline = 0; this.winner = null; this.eventId = 0;
  }
  event(type, data = {}) { const event = { ...data, type, eventId: ++this.eventId, epoch: this.epoch }; this.emit(event); }
  add(id, name, slot) {
    if (this.players.has(id) || this.players.size >= MAX_PLAYERS) return false;
    const t = this.now();
    this.players.set(id, { id, name: cleanName(name), slot, pose: spawnPose(slot), hp: 150, score: 0, weapon: 0,
      ammo: weapons.map(w => w.mag), reloadUntil: 0, nextShot: 0, burstCount: 0, ack: 0, poseAt: t, poseSeq: -1 });
    if (this.players.size === MAX_PLAYERS) this.newRound();
    return true;
  }
  remove(id) {
    this.players.delete(id); this.phase = 'waiting'; this.deadline = 0; this.winner = null; this.epoch++;
    for (const p of this.players.values()) { p.score = 0; this.resetPlayer(p); }
  }
  resetPlayer(p) {
    p.pose = spawnPose(p.slot); p.hp = 150; p.ammo = weapons.map(w => w.mag); p.reloadUntil = 0;
    p.nextShot = this.now() + 250; p.burstCount = 0; p.poseAt = this.now();
  }
  newRound() {
    this.epoch++; for (const p of this.players.values()) this.resetPlayer(p);
    this.phase = 'countdown'; this.deadline = this.now() + 3000; this.winner = null;
  }
  rematch() {
    if (this.phase !== 'finished' || this.players.size !== MAX_PLAYERS) return false;
    for (const p of this.players.values()) p.score = 0;
    this.newRound(); return true;
  }
  pose(id, pose, epoch, seq) {
    const p = this.players.get(id), valid = validPose(pose), t = this.now();
    if (!p || !valid || epoch !== this.epoch || !Number.isSafeInteger(seq) || seq <= p.poseSeq) return false;
    p.poseSeq = seq;
    if (this.phase !== 'playing' || p.hp <= 0) { p.pose.yaw = valid.yaw; p.pose.pitch = valid.pitch; p.pose.paused = valid.paused; return false; }
    const seconds = Math.min((t - p.poseAt) / 1000, .3);
    if (Math.hypot(valid.x - p.pose.x, valid.z - p.pose.z) > 14 * seconds + .55 || Math.abs(valid.y - p.pose.y) > 15 * seconds + .6) return false;
    p.pose = valid; p.poseAt = t; return true;
  }
  action(id, action) {
    const p = this.players.get(id), t = this.now();
    if (!p || !action || !Number.isSafeInteger(action.seq) || action.seq <= p.ack || action.seq - p.ack > 1000) return false;
    p.ack = action.seq;
    if (action.epoch !== this.epoch || p.hp <= 0) return false;
    if (action.kind === 'equip') {
      if (!Number.isInteger(action.weapon) || !weapons[action.weapon] || this.phase === 'intermission' || this.phase === 'finished') return false;
      p.weapon = action.weapon; p.reloadUntil = 0; p.nextShot = t + 250; p.burstCount = 0; return true;
    }
    if (this.phase !== 'playing') return false;
    const w = weapons[p.weapon];
    if (action.kind === 'reload') {
      if (p.reloadUntil || p.ammo[p.weapon] === w.mag) return false;
      p.reloadUntil = t + w.reload * 1000; p.burstCount = 0; return true;
    }
    if (action.kind !== 'fire' || action.weapon !== p.weapon || p.reloadUntil || p.ammo[p.weapon] <= 0 || t + 2 < p.nextShot || p.pose.paused) return false;
    if (!finite(action.yaw, -Math.PI, Math.PI) || !finite(action.pitch, -Math.PI / 2, Math.PI / 2)) return false;
    p.ammo[p.weapon]--; p.nextShot = t + w.interval * 1000;
    if (w.burst && ++p.burstCount % 3 === 0) p.nextShot = t + 280;
    const origin = { x: p.pose.x, y: p.pose.y + p.pose.height - .13, z: p.pose.z };
    const direction = aimDirection(action.yaw, action.pitch), rays = [], hits = new Map();
    for (let i = 0; i < (w.pellets || 1); i++) {
      const spread = w.pellets ? .06 : action.aim === true ? .0015 : .006;
      const d = { x: direction.x + (this.random() - .5) * spread, y: direction.y + (this.random() - .5) * spread, z: direction.z + (this.random() - .5) * spread };
      const length = Math.hypot(d.x,d.y,d.z); for (const axis of ['x','y','z']) d[axis] /= length;
      let distance = Math.min(100, this.wallDistance(origin,d)), closest = null;
      for (const other of this.players.values()) {
        if (other.id === id || other.hp <= 0) continue;
        const hit = hitPlayer(origin,d,other);
        if (hit && hit.distance < distance) { distance = hit.distance; closest = { player: other, head: hit.head }; }
      }
      if (closest) {
        const damage = w.damage * (closest.head && !w.pellets ? p.weapon === 3 ? 2 : 1.5 : 1);
        hits.set(closest.player.id, (hits.get(closest.player.id) || 0) + damage);
      }
      rays.push({ x: origin.x + d.x * distance, y: origin.y + d.y * distance, z: origin.z + d.z * distance });
    }
    let damage = 0;
    for (const [target, amount] of hits) { const victim = this.players.get(target); damage += Math.min(victim.hp, amount); victim.hp = Math.max(0,victim.hp - amount); }
    this.event('shot', { shooter: id, weapon: p.weapon, origin, rays, damage });
    const victim = [...this.players.values()].find(other => other.id !== id && other.hp <= 0);
    if (victim) {
      p.score++; this.winner = id; this.phase = p.score >= 5 ? 'finished' : 'intermission'; this.deadline = t + 2500;
      this.event('elimination', { shooter: id, victim: victim.id, finished: this.phase === 'finished' });
    }
    return true;
  }
  tick() {
    const t = this.now();
    for (const p of this.players.values()) if (p.reloadUntil && t >= p.reloadUntil) { p.ammo[p.weapon] = weapons[p.weapon].mag; p.reloadUntil = 0; }
    if (this.phase === 'countdown' && t >= this.deadline) { this.phase = 'playing'; this.deadline = t + 90000; }
    else if (this.phase === 'intermission' && t >= this.deadline) this.newRound();
    else if (this.phase === 'playing' && t >= this.deadline) {
      const [a,b] = [...this.players.values()]; this.winner = a.hp === b.hp ? null : a.hp > b.hp ? a.id : b.id;
      if (this.winner) this.players.get(this.winner).score++;
      this.phase = this.winner && this.players.get(this.winner).score >= 5 ? 'finished' : 'intermission'; this.deadline = t + 2500;
      this.event('roundEnd',{ winner: this.winner });
    }
  }
  snapshot() {
    return { epoch: this.epoch, phase: this.phase, remaining: Math.max(0,this.deadline - this.now()), winner: this.winner,
      players: [...this.players.values()].map(p => ({ id:p.id,name:p.name,slot:p.slot,pose:{...p.pose},hp:p.hp,score:p.score,weapon:p.weapon,
        ammo:[...p.ammo],reloadRemaining:Math.max(0,p.reloadUntil - this.now()),ack:p.ack })) };
  }
}

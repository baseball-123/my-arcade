import { weapons, baseWeapons, primaries, secondaries, melee, grenade } from './weapons.js?v=battle1';

export const PROTOCOL = 'arcade-duels-v1';
export const BUILD = 'arena-battles-ui2';
export const MAX_PLAYERS = 6;
export const cleanName = name => String(name || 'Player').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Player';
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function validPose(pose) {
  if (!pose || !finite(pose.x, -20, 20) || !finite(pose.y, 0, 12) || !finite(pose.z, -16, 16) ||
      !finite(pose.yaw, -Math.PI, Math.PI) || !finite(pose.pitch, -Math.PI / 2, Math.PI / 2) ||
      !finite(pose.height, 1.15, 1.8) || !finite(pose.speed, 0, 14)) return null;
  return { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, pitch: pose.pitch, height: pose.height,
    speed: pose.speed, crouched: pose.crouched === true, paused: pose.paused === true };
}
// Opposite pockets with tall cover between the two spawns. Yaw faces an exit.
const spawnPairs = [
  [{ x: 13, z: 11, yaw: Math.PI / 2 }, { x: -13, z: -11, yaw: -Math.PI / 2 }],
  [{ x: 16.5, z: 8, yaw: 0 }, { x: -16.5, z: -8, yaw: Math.PI }],
  [{ x: 7.8, z: -2, yaw: 0 }, { x: -7.8, z: 2, yaw: Math.PI }],
];
function spawnPose(slot, pair = 0, swap = false) {
  return { ...spawnPairs[pair][swap ? 1 - slot : slot], y: 0,
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
  constructor({ now = () => Date.now(), wallDistance = () => 100, emit = () => {}, random = Math.random, mode = 'duel', capacity = 2, manualStart = false } = {}) {
    this.manualStart = manualStart;
    this.mode = ['ffa', 'teams'].includes(mode) ? mode : 'duel';
    this.capacity = this.mode === 'duel' ? 2 : Math.min(6, Math.max(2, Number.isInteger(capacity) ? capacity : 2));
    if (this.mode === 'teams' && this.capacity % 2) this.capacity--;
    this.goal = this.mode === 'teams' ? 50 : this.mode === 'ffa' ? 30 : 5;
    this.teamScores = [0, 0];
    this.grenades = [];
    this.now = now; this.wallDistance = wallDistance; this.emit = emit; this.random = random;
    this.spawnPair = -1; this.swapSpawns = false;
    this.players = new Map(); this.epoch = 0; this.phase = 'waiting'; this.deadline = 0; this.winner = null; this.eventId = 0;
  }
  event(type, data = {}) { const event = { ...data, type, eventId: ++this.eventId, epoch: this.epoch }; this.emit(event); }
  setCapacity(capacity) {
    if (this.phase !== 'waiting' || this.mode === 'duel' || !Number.isInteger(capacity) ||
        capacity < Math.max(2, this.players.size) || capacity > MAX_PLAYERS ||
        (this.mode === 'teams' && capacity % 2 !== 0)) return false;
    this.capacity = capacity;
    for (const [slot, player] of [...this.players.values()].entries()) {
      player.slot = slot;
      player.team = slot % 2;
    }
    this.clearReady();
    if (!this.manualStart && this.players.size === capacity) this.newRound();
    return true;
  }
  add(id, name, slot) {
    if (this.players.has(id) || this.players.size >= this.capacity || this.phase !== 'waiting') return false;
    const t = this.now();
    this.players.set(id, { id, name: cleanName(name), slot, team: slot % 2, life: 0, ready: false, primary: 0, secondary: 4, spawnIndex: -1, respawnAt: 0, pose: spawnPose(slot % 2), hp: 150, score: 0, weapon: 0,
      ammo: weapons.map(w => w.mag), reloadUntil: 0, nextShot: 0, burstCount: 0, ack: 0, poseAt: t, poseSeq: -1 });
    this.clearReady();
    if (!this.manualStart && this.players.size === this.capacity) this.newRound();
    return true;
  }
  remove(id) {
    this.players.delete(id);
    this.clearReady();
    const roster = [...this.players.values()];
    const playable = this.manualStart && this.mode === 'teams' ? false : this.mode === 'teams' ? new Set(roster.map(player => player.team)).size === 2 : roster.length >= 2;
    if (this.mode !== 'duel' && playable && this.phase !== 'waiting') return;
    this.grenades = []; this.teamScores = [0, 0];
    this.phase = 'waiting'; this.deadline = 0; this.winner = null; this.epoch++;
    for (const [slot,p] of [...this.players.values()].entries()) {
      p.slot = slot; p.team = slot % 2; p.score = 0; this.resetPlayer(p);
    }
  }
  clearReady() {
    for (const player of this.players.values()) player.ready = false;
  }
  startMatch() {
    if (this.phase !== 'waiting' || this.players.size !== this.capacity ||
        ![...this.players.values()].every(player => player.ready)) return false;
    this.newRound();
    if (this.mode !== 'duel') {
      for (const player of this.players.values()) {
        this.respawn(player, {primary:player.primary, secondary:player.secondary}, this.now());
        player.protectedUntil = this.deadline + 1500;
      }
    }
    return true;
  }
  resetPlayer(p) {
    if (this.mode !== 'duel') {
      p.hp = 0;
      p.respawnAt = this.now();
      p.reloadUntil = 0;
      return;
    }
    p.pose = spawnPose(p.slot, Math.max(0, this.spawnPair), this.swapSpawns); p.hp = 150; p.ammo = weapons.map(w => w.mag); p.reloadUntil = 0;
    p.nextShot = this.now() + 250; p.burstCount = 0; p.poseAt = this.now();
  }
  newRound() {
    const choices = spawnPairs.map((_, index) => index).filter(index => index !== this.spawnPair);
    this.spawnPair = choices[Math.floor(this.random() * choices.length)];
    this.swapSpawns = this.random() < .5;
    this.epoch++;
    this.grenades = [];
    for (const p of this.players.values()) this.resetPlayer(p);
    this.phase = 'countdown'; this.deadline = this.now() + 3000; this.winner = null;
  }
  rematch() {
    if (this.phase !== 'finished' || this.players.size < 2) return false;
    this.teamScores = [0, 0];
    for (const p of this.players.values()) p.score = 0;
    if (this.manualStart) {
      this.epoch++;
      this.phase = 'waiting';
      this.winner = null;
      this.deadline = 0;
      this.grenades = [];
      this.clearReady();
      for (const [slot, player] of [...this.players.values()].entries()) {
        player.slot = slot;
        player.team = slot % 2;
        this.resetPlayer(player);
      }
      return true;
    }
    if (this.mode === 'teams' && this.players.size !== this.capacity) {
      this.phase = 'waiting';
      this.winner = null;
      this.deadline = 0;
      this.grenades = [];
      return true;
    }
    this.newRound(); return true;
  }
  respawn(player, action, t) {
    if (this.mode === 'duel' || !['countdown', 'playing'].includes(this.phase) ||
        player.hp > 0 || t < player.respawnAt || !primaries.includes(action.primary) ||
        !secondaries.includes(action.secondary)) return false;
    const enemies = [...this.players.values()].filter(other => other.hp > 0 && !this.allied(player, other));
    const occupied = [...this.players.values()].filter(other => other.hp > 0);
    const candidates = spawnPairs.flat().map((point, index) => {
      let score = 45;
      const origin = { ...point, y: 1.67 };
      for (const enemy of enemies) {
        const dx = enemy.pose.x - point.x, dz = enemy.pose.z - point.z;
        const distance = Math.hypot(dx, dz);
        const covered = distance > 0 && this.wallDistance(origin, { x: dx / distance, y: 0, z: dz / distance }) < distance;
        score = Math.min(score, distance + (covered ? 24 : 0));
      }
      const crowded = occupied.some(other => Math.hypot(other.pose.x - point.x, other.pose.z - point.z) < 4);
      return { index, score: score + this.random() * 4 - (crowded ? 100 : 0) };
    }).filter(candidate => candidate.index !== player.spawnIndex);
    const { index } = candidates.sort((a, b) => b.score - a.score)[0];
    player.spawnIndex = index;
    player.pose = spawnPose(index % 2, Math.floor(index / 2));
    player.poseAt = t;
    player.life++;
    player.hp = 150;
    player.primary = action.primary;
    player.secondary = action.secondary;
    player.weapon = action.primary;
    player.ammo = weapons.map(weapon => weapon.mag);
    player.reloadUntil = 0;
    player.nextShot = t + 250;
    player.burstCount = 0;
    player.protectedUntil = t + 1500;
    return true;
  }
  allied(a, b) { return this.mode === 'teams' && a.team === b.team; }
  damage(shooter, hits, t) {
    let damage = 0;
    const eliminated = [];
    for (const [target, amount] of hits) {
      const victim = this.players.get(target);
      if (!victim || victim.hp <= 0 || victim.protectedUntil > t || this.allied(shooter, victim)) continue;
      damage += Math.min(victim.hp, amount);
      victim.hp = Math.max(0, victim.hp - amount);
      if (victim.hp === 0) {
        victim.reloadUntil = 0;
        victim.respawnAt = t + 1250;
        eliminated.push(victim);
      }
    }
    return { damage, eliminated };
  }
  scoreEliminations(shooter, eliminated, t) {
    for (const victim of eliminated) {
      shooter.score++;
      if (this.mode === 'teams') this.teamScores[shooter.team]++;
      const score = this.mode === 'teams' ? this.teamScores[shooter.team] : shooter.score;
      if (score >= this.goal || this.mode === 'duel') {
        this.winner = shooter.id;
        this.phase = score >= this.goal ? 'finished' : 'intermission';
        this.deadline = t + 2500;
      }
      this.event('elimination', { shooter: shooter.id, victim: victim.id, finished: this.phase === 'finished' });
      if (this.phase === 'finished') break;
    }
  }
  explode(charge, t) {
    const shooter = this.players.get(charge.shooter);
    if (!shooter) return;
    const hits = new Map();
    for (const victim of this.players.values()) {
      if (victim === shooter || victim.hp <= 0 || this.allied(shooter, victim)) continue;
      const delta = { x: victim.pose.x - charge.position.x, y: victim.pose.y + .7 - charge.position.y, z: victim.pose.z - charge.position.z };
      const distance = Math.hypot(delta.x, delta.y, delta.z);
      if (distance >= 4 || distance < .001) continue;
      const ray = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
      if (this.wallDistance(charge.position, ray) < distance) continue;
      hits.set(victim.id, 90 * (1 - distance / 5));
    }
    const result = this.damage(shooter, hits, t);
    this.event('blast', { shooter: shooter.id, position: charge.position, damage: result.damage });
    this.scoreEliminations(shooter, result.eliminated, t);
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
    if (action.epoch !== this.epoch || (this.mode !== 'duel' && action.life !== p.life)) return false;
    if (action.kind === 'ready' && this.phase === 'waiting') {
      if (!primaries.includes(action.primary) || !secondaries.includes(action.secondary)) return false;
      p.primary = action.primary;
      p.secondary = action.secondary;
      p.ready = action.ready === true;
      return true;
    }
    if (action.kind === 'respawn') return this.respawn(p, action, t);
    if (p.hp <= 0) return false;
    if (action.kind === 'equip') {
      if (!Number.isInteger(action.weapon) || !(this.mode === 'duel' ? baseWeapons[action.weapon] : [p.primary, p.secondary, melee, grenade].includes(action.weapon)) || this.phase === 'intermission' || this.phase === 'finished') return false;
      p.weapon = action.weapon; p.reloadUntil = 0; p.nextShot = t + 250; p.burstCount = 0; return true;
    }
    if (this.phase !== 'playing') return false;
    const w = weapons[p.weapon];
    if (action.kind === 'reload') {
      if (w.kind || p.reloadUntil || p.ammo[p.weapon] === w.mag) return false;
      p.reloadUntil = t + w.reload * 1000; p.burstCount = 0; return true;
    }
    if (action.kind !== 'fire' || action.weapon !== p.weapon || p.reloadUntil || p.ammo[p.weapon] <= 0 || t + 2 < p.nextShot || p.pose.paused) return false;
    if (!finite(action.yaw, -Math.PI, Math.PI) || !finite(action.pitch, -Math.PI / 2, Math.PI / 2)) return false;
    if (w.kind !== 'melee') p.ammo[p.weapon]--; p.nextShot = t + w.interval * 1000;
    if (w.burst && ++p.burstCount % 3 === 0) p.nextShot = t + 280;
    const origin = { x: p.pose.x, y: p.pose.y + p.pose.height - .13, z: p.pose.z };
    const direction = aimDirection(action.yaw, action.pitch), rays = [], hits = new Map();
    p.protectedUntil = 0;
    if (w.kind === 'grenade') {
      const distance = Math.max(0, Math.min(12, this.wallDistance(origin, direction) - .25));
      const position = { x: origin.x + direction.x * distance, y: Math.max(.35, origin.y + direction.y * distance), z: origin.z + direction.z * distance };
      const floorDistance = this.wallDistance(position, { x:0, y:-1, z:0 });
      position.y = Math.max(.25, position.y - Math.max(0,floorDistance - .22));
      this.grenades.push({ shooter: id, position, at: t + 1100 });
      this.event('throw', { shooter: id, origin, position });
      return true;
    }
    for (let i = 0; i < (w.pellets || 1); i++) {
      const spread = w.pellets ? .06 : action.aim === true ? .0015 : .006;
      const d = { x: direction.x + (this.random() - .5) * spread, y: direction.y + (this.random() - .5) * spread, z: direction.z + (this.random() - .5) * spread };
      const length = Math.hypot(d.x,d.y,d.z); for (const axis of ['x','y','z']) d[axis] /= length;
      let distance = Math.min(w.kind === 'melee' ? 2.25 : 100, this.wallDistance(origin,d)), closest = null;
      for (const other of this.players.values()) {
        if (other.id === id || other.hp <= 0 || this.allied(p, other)) continue;
        const hit = hitPlayer(origin,d,other);
        if (hit && hit.distance < distance) { distance = hit.distance; closest = { player: other, head: hit.head }; }
      }
      if (closest) {
        const damage = w.damage * (closest.head && !w.pellets && !w.kind ? p.weapon === 3 ? 2 : 1.5 : 1);
        hits.set(closest.player.id, (hits.get(closest.player.id) || 0) + damage);
      }
      rays.push({ x: origin.x + d.x * distance, y: origin.y + d.y * distance, z: origin.z + d.z * distance });
    }
    const result = this.damage(p, hits, t);
    this.event('shot', { shooter: id, weapon: p.weapon, origin, rays, damage: result.damage });
    this.scoreEliminations(p, result.eliminated, t);
    return true;
  }
  tick() {
    const t = this.now();
    for (const p of this.players.values()) if (p.reloadUntil && t >= p.reloadUntil) { p.ammo[p.weapon] = weapons[p.weapon].mag; p.reloadUntil = 0; }
    if (this.phase === 'playing') {
      const ready = this.grenades.filter(charge => charge.at <= t);
      this.grenades = this.grenades.filter(charge => charge.at > t);
      for (const charge of ready) {
        if (this.phase !== 'playing') break;
        this.explode(charge, t);
      }
    }
    if (this.phase === 'countdown' && t >= this.deadline) { this.phase = 'playing'; this.deadline = this.mode === 'duel' ? t + 90000 : 0; }
    else if (this.phase === 'intermission' && t >= this.deadline) this.newRound();
    else if (this.mode === 'duel' && this.phase === 'playing' && t >= this.deadline) {
      const [a,b] = [...this.players.values()]; this.winner = a.hp === b.hp ? null : a.hp > b.hp ? a.id : b.id;
      if (this.winner) this.players.get(this.winner).score++;
      this.phase = this.winner && this.players.get(this.winner).score >= 5 ? 'finished' : 'intermission'; this.deadline = t + 2500;
      this.event('roundEnd',{ winner: this.winner });
    }
  }
  snapshot() {
    return { epoch: this.epoch, phase: this.phase, remaining: Math.max(0,this.deadline - this.now()), winner: this.winner, mode: this.mode, capacity: this.capacity, goal: this.goal, teamScores: [...this.teamScores],
      players: [...this.players.values()].map(p => ({ id:p.id,name:p.name,slot:p.slot,team:p.team,life:p.life,primary:p.primary,secondary:p.secondary,ready:p.ready,protectionRemaining:Math.max(0,(p.protectedUntil || 0)-this.now()),respawnRemaining:Math.max(0,p.respawnAt-this.now()),pose:{...p.pose},hp:p.hp,score:p.score,weapon:p.weapon,
        ammo:[...p.ammo],reloadRemaining:Math.max(0,p.reloadUntil - this.now()),ack:p.ack })) };
  }
}

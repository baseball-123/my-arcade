// Shared by the playable lab and the room host's combat rules.
export const weapons = [
  { name: 'Assault Rifle', file: 'AssaultRifle2_1', damage: 18, mag: 30, interval: .1, reload: 2, auto: true, length: .92 },
  { name: 'Burst Rifle', file: 'AssaultRifle_1', damage: 21, mag: 24, interval: .09, reload: 2.2, burst: true, length: .98 },
  { name: 'Shotgun', file: 'Shotgun_1', damage: 10, mag: 6, interval: .85, reload: 2.8, pellets: 8, length: 1.05 },
  { name: 'Sniper', file: 'SniperRifle_1', damage: 75, mag: 5, interval: 1.35, reload: 2.6, length: 1.15 },
  { name: 'Handgun', file: 'Pistol_1', damage: 20, mag: 12, interval: .25, reload: 1.4, length: .35 },
  { name: 'Revolver', file: 'Revolver_1', damage: 45, mag: 6, interval: .55, reload: 2.1, length: .4 },
  { name: 'Compact SMG', file: 'SubmachineGun_1', damage: 11, mag: 24, interval: 1 / 15, reload: 1.8, auto: true, length: .55 },
];

// Variants share the existing models and have their own handling and magazines.
export const baseWeapons = [...weapons];
function variant(base, name, stats) {
  weapons.push({ ...weapons[base], name, model: weapons[base].name, ...stats });
  return weapons.length - 1;
}
export const primaries = [0, 1, 2, 3, 6, variant(0, 'Carbine', { damage: 16, mag: 20, interval: .075, reload: 1.65 })];
export const secondaries = [
  4, 5,
  variant(4, 'Heavy Pistol', { damage: 32, mag: 8, interval: .38 }),
  variant(4, 'Machine Pistol', { damage: 12, mag: 18, interval: .09, auto: true }),
  variant(5, 'Quickdraw Revolver', { damage: 30, interval: .32, reload: 1.7 }),
  variant(4, 'Officer Pistol', { damage: 24, mag: 10, interval: .28, reload: 1.05 }),
];
export const melee = weapons.push({ name: 'Chair', kind: 'melee', damage: 55, mag: 1, interval: .65, reload: 0 }) - 1;
export const grenade = weapons.push({ name: 'Grenade', kind: 'grenade', damage: 90, mag: 1, interval: 1, reload: 0 }) - 1;

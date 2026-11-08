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

# Proposed launch game specification

Current priority update November 8 2026: the user requested basic PeerJS multiplayer now, using Stillwater as the example. Private two-player rooms, synchronized movement/combat and first-to-five rounds are implemented for playtesting. Earlier references below to networking as the final implementation phase now apply to broader networking polish and team-mode expansion.

All numerical values and rules below are **our proposed starting design**, not measured RIVALS values. Working title: **Arcade Duels**. Final name and visual theme remain editable before implementation.

## Immediate milestone: playable validation

Build with existing assets now: a visible character (third-person inspection plus first-person play), selectable downloaded guns/arms, simple targets, shooting/reloading, responsive mouse look, grounded collision, movement, crouch/slide and jumping. Use a rough Arena-like blockout with ramps and cover. Provide in-engine asset inspection and movement/weapon tuning controls. Identify missing or incompatible assets from this working build before searching for more. Exact Arena reconstruction is lowest priority and does not block this milestone. The numerical specification below remains adjustable during playtesting.

## Product and scope

A responsive first-person arena shooter where readable maps, precise shooting, quick weapon swaps, and movement reward practice. Stylized block characters, distinct equipment silhouettes, material-aware impacts, directional sound and consistent menus set the quality bar.

Initial local release: tutorial/practice plus 1v1 bot duels on one recreation of standard RIVALS Arena. Final phase of this project: private PeerJS/WebRTC 1v1 and 2v2, with the same combat rules. The wider RIVALS catalog is a reference/backlog, not silently part of this launch scope.

Deferred: 3v3–5v5, public matchmaking, ranked, persistent online leaderboards, voice/text chat, commerce, loot boxes, complex destructibility, special/seasonal modes, mobile touch and controller play. Architecture can accommodate later additions; menus must only advertise working features.

## Everything a launch player can do

1. Open the arcade and choose Stillwater or Arcade Duels.
2. Read controls, adjust settings, enter the range, select any launch item, and test on stationary/moving targets.
3. Choose a bot difficulty and a four-slot loadout for Arena; save up to three named presets locally.
4. Move, aim, fire, reload, switch items, crouch, slide, jump, and use the equipped melee/utility.
5. Fight an elimination duel, spectate after elimination, inspect the scoreboard, and see round/match results.
6. Rematch, change the loadout, return to Arena practice, or return to the arcade.
7. View local match history and cosmetic milestones; reset that game's data with an explicit confirmation.
8. In the final network release, create/join an invite-code room, pick teams, ready up, load Arena, play with friends, rematch, and leave.

All twelve launch items are unlocked. Cosmetic milestones reward practice without limiting competitive equipment. No wallet or currency is required for launch. Local history and cosmetics are browser-specific and must not be represented as authenticated online rankings.

## Screens and flow

Arcade selector → shooter title → Play / Practice / Loadout / Profile / Settings / Credits. Play offers Bot Duel; online room actions appear only when networking ships.

Bot setup: Arena preview, Easy/Normal/Hard difficulty, loadout preset, Start. No map selector or map vote with only one map. Loading reports progress and recoverable asset errors. Click-to-play acquires pointer lock and enables audio. Escape releases the pointer and opens a menu; Resume requires a click.

HUD: central customizable crosshair, health, active item/ammo, four slots, round score, remaining time, kill feed, and hit/kill feedback. Team members use both a symbol and color. A scoreboard shows name, team, kills, deaths and, online, latency. Hide enemy spectator information from dead players in team matches.

Results: winning side, final score, personal accuracy/kills/deaths/damage, local milestone progress, Rematch / Change Setup / Back. Accuracy counts hitscan shots hitting a player; utility and multi-pellet statistics are separate to avoid misleading ratios.

## Match rules

| Setting | Proposed launch rule |
| --- | --- |
| Win | First team to five round wins; no win-by-two |
| Players | Local 1 human vs 1 bot; final online 1v1 or 2v2 |
| Round start | 5-second loadout window, 3-second countdown; movement/shooting locked during countdown |
| Round duration | 90 seconds of active play |
| Health | 150 HP; no passive regeneration; no armor |
| Elimination | Zero HP or hazard death; no mid-round respawn/revive |
| Team damage | Off, including teammate explosions; own explosive damage is on |
| Round end | One side has no living players; resolve all damage in the same simulation tick before checking |
| Timeout | Highest team living-HP sum wins; equal sums are a draw |
| Simultaneous wipe | Draw; no point; replay with refreshed resources |
| Draw safeguard | After three consecutive drawn rounds, next round uses a marked central capture zone after 30 seconds; uncontested 3-second hold wins; if it remains unresolved for 60 more seconds, match ends as a draw |
| Between rounds | 4-second result, reset spawns, HP, ammo and utility; permit loadout changes only in the next loadout window |
| Spawn fairness | Mirrored/paired spawn sets, swapped each round; never an unobstructed spawn-to-spawn shot |
| Spectating | Local duel shows bot camera/result after death; online dead players follow living teammates only |
| Pause | Full simulation pause in local play; online menu only suppresses local input, never pauses the match |
| Leaving | Local match ends without a win reward; online active-player disconnect forfeits that player's slot for the current match; no bot substitution |

Bot difficulty changes reaction delay, tracking error and tactical decisions, never damage/health or access to hidden targets. Easy: 500 ms base reaction; Normal: 300 ms; Hard: 180 ms, all with bounded variation. Bots require line of sight, lose exact tracking behind cover, hear only emitted sound events, and follow authored navigation links for ramps/jumps. These values need playtesting.

## Controls and movement

| Action | Desktop default |
| --- | --- |
| Move / look | WASD / mouse |
| Fire or activate | Left mouse |
| Aim down sights | Hold right mouse for guns; scoped aim for sniper |
| Reload | R |
| Select slot | 1–4; wheel cycles populated slots |
| Previous slot | Q |
| Jump | Space |
| Crouch / slide | C or Left Ctrl; slide when above speed threshold |
| Scoreboard / menu | Hold Tab / Escape |

Movement proposals: meters, Y up, 1.8 m standing height, 0.35 m capsule radius, 1.2 m crouch height; 7 m/s ground speed, 3.5 crouch; diagonal input normalized. No separate sprint key. Gravity 22 m/s²; initial jump velocity 8 m/s; 100 ms jump buffering and 80 ms coyote time. Slide requires 5 m/s, begins at up to 10 m/s, lasts 0.65 s, and has 0.8 s cooldown after ending. A jump can cancel a slide; maximum horizontal speed 12 m/s prevents infinite acceleration. Standing requires head clearance. Walkable slopes ≤45°, step height ≤0.3 m. Air control limited to 25% of grounded acceleration.

Fists give 10% movement speed and one extra air jump. The extra jump is replenished only by landing, never by switching items. Knife gives 5% movement speed but no extra jump. Explosions can push the owner with a capped impulse; no enemy stun-lock. No fall damage, but explicit map kill volumes kill immediately. Ramp boosts and advanced movement require bounded, reproducible behavior.

## Launch equipment: twelve choices

Global defaults: gun equip delay 0.25 s, primary/secondary ammunition has unlimited reserve but limited magazines, dry trigger requires reload, reloading commits ammo only when complete. Switching cancels an incomplete reload. Melee and utility have their own active/recovery periods. All timing is simulation time. Damage numbers are proposed balance seeds.

| Item / slot | Damage and firing | Ammo / reload | Role and constraints |
| --- | --- | --- | --- |
| Assault Rifle / primary | 18 body, 1.5× head, 600 RPM auto | 30 / 2.0 s | Generalist; falloff begins 35 m, minimum 70% damage at 65 m |
| Burst Rifle / primary | 21 body, 1.5× head; 3 shots 0.09 s apart, 0.28 s post-burst lock | 24 / 2.2 s | Precision bursts; release required before next burst; falloff 40–70 m to 75% |
| Shotgun / primary | 8 pellets × 10; no head multiplier; 0.85 s shot interval | 6 / 2.8 s whole-magazine | Close burst; deterministic 7° cone; falloff 8–24 m to 20% |
| Sniper / primary | 75 body, 2× head; 1.35 s shot interval | 5 / 2.6 s | Precision; 0.3 s scope transition; 4° unscoped spread, 0° settled scoped; no falloff within 100 m |
| Handgun / secondary | 20 body, 1.5× head; 4 shots/s semi-auto | 12 / 1.4 s | Consistent backup; falloff 25–50 m to 65% |
| Revolver / secondary | 45 body, 1.5× head; 1.8 shots/s semi-auto | 6 / 2.1 s | High commitment sidearm; falloff 35–65 m to 75% |
| Uzi / secondary | 11 body, 1.4× head, 900 RPM auto | 24 / 1.8 s | Close tracking; falloff 15–40 m to 45% |
| Fists / melee | 30, 2.0 m reach; 0.45 s cycle | Unlimited | 0.10 s windup, one target per swing; movement/double-jump utility |
| Knife / melee | 45, 2.2 m reach; 0.65 s cycle | Unlimited | 0.15 s windup; no backstab multiplier in launch |
| Grenade / utility | Up to 90 radial damage, linear falloff to zero at 5 m | 2 / round | Throw on press, no cooking; 2 s fuse; bounce; wall occlusion blocks blast damage |
| Smoke Grenade / utility | No damage | 1 / round | 0.8 s fuse; 4 m radius for 8 s; opaque sightline blocker, not solid cover |
| Medkit / utility | Restore up to 60 HP, capped at 150 | 1 / round | 2 s channel; cancelled by damage or switching, no charge consumed on cancellation; 3 s retry cooldown |

Firing spread seeds: AR hip 1.2°, ADS 0.35°; burst 0.8°/0.2°; handgun 0.7°/0.2°; revolver 0.5°/0.15°; Uzi 2°/1°. Moving multiplies spread by 1.4, airborne by 1.8. AR per-shot recoil 0.7° vertical with alternating ±0.15° horizontal; burst 0.6°/±0.12°, handgun 1.2°/±0.15°, revolver 2°/±0.2°, Uzi 0.4°/±0.2°, shotgun 3° vertical, sniper 4° vertical. Recoil recovery begins after 120 ms without firing, using an exponential 0.18 s time constant. Hip-to-ADS transition is 0.18 s unless overridden; ADS reduces movement to 75%, sniper scoped to 55%. Values are data, not hard-coded behavior scattered through render code.

Hitscan rays originate from the authoritative eye aim and stop at the nearest solid surface; muzzle-to-aim-point obstruction prevents corner clipping. Head and body hitboxes are separate from render meshes. No penetration, friendly damage, or material ricochet. Fire intent is validated against equipped item, ammo, cadence, life/round state and origin. Rounding occurs only when reporting damage; internal health can be fractional.

Smoke occludes bots and player vision consistently. It does not stop bullets or explosions. Explosion knockback is bounded to 5 m/s added velocity; wall occlusion and owner damage use the same resolved blast position. All actions have visible/audible start and completion feedback.

## One launch map: RIVALS Arena recreation

The user explicitly selected a faithful copy of **standard Arena**, not Big Arena. Foundry Court, Skyline Works and Harbor Depot are removed from scope. Practice also runs inside Arena; no second practice environment is built.

Recreate Arena's recognizable layout, opposing spawn areas, bilateral ramps, angled cover, elevation relationships, grid treatment, palette and overall proportions. Preserve the reference's routes and sightlines rather than redesigning it around generic map heuristics. Use locally authored meshes and materials from visual references.

Community sources describe mirrored opposing spawns, ramps on both sides, and a clean grid-based layout with angled blocks. Exact dimensions, object count, cover locations and ramp angles have not yet been measured. Do not substitute the previous invented dimensions or label an approximate greybox an exact replica.

After the core gameplay prototype and existing-asset validation, produce a dimensioned plan from dated overhead and ground-level references: perimeter footprint, grid spacing, every cover block's position/rotation/size, ramp rise/run, platform heights, spawn transforms, out-of-bounds boundaries and representative sightlines. Mark each measurement as observed or estimated and validate estimates against multiple views. Use that plan as the map acceptance checklist.

Practice toggles stationary/moving targets, damage readouts, loadout access and reset controls within the same Arena geometry. Practice-only objects are removed for duels. Do not add buildings, containers, water, lava or other map themes. Any proposed overtime capture marker is a gameplay overlay on the existing floor, not a geometry change.

Acceptance: recognizable correspondence to the verified reference from both spawn views, overhead and side ramps; matching cover occlusion and elevation; aligned visual/collision meshes; working bot routes; verified movement clearances and spawn transforms. These are later map-fidelity acceptance criteria, not prerequisites for the first playable prototype.

## Required models, animations and effects

- One base block character with team color variants, readable head/body silhouette, and third-person equipped items. Team cosmetics never change hitboxes.
- Separate first-person arms and held item; attachment points for right/left grip, muzzle, scope, magazine and throwable release. First-person geometry uses a separate viewmodel layer to avoid wall/near-plane clipping.
- Seven firearm silhouettes, fists, knife, grenade, smoke canister and medkit. World representations may share simplified source models but require correct scale/pivots.
- Character idle, walk, run, crouch, slide, jump, fall, land, aim, shoot, melee, throw, heal, hit and death; held-item upper-body pose must coexist with locomotion.
- First-person equip/unequip, idle/sway, hip/ADS fire, reload per gun, fists punch, knife swing, throw and heal. Reloads must visibly correspond to ammo commitment; source rigs alone do not meet this requirement.
- Arena floor, boundary and exact cover/ramp shapes from the verified plan, plus removable practice targets. Industrial shells, containers and unrelated themed dressing are outside launch scope.
- Muzzle flash, tracer, material impact, hit marker, elimination feedback, smoke volume, explosion, healing cue. Bound particle counts and durations.

## Options, saves and quality targets

Settings: mouse sensitivity, invert Y, key rebinds, ADS hold/toggle, FOV 70–110 (default 90), crosshair size/color, master/SFX/music volumes, mute, quality Low/Medium/High, render scale, frame cap 60/120/unlimited, fullscreen, reduced motion, camera shake toggle, color-independent team markers. No music masks combat cues by default.

Save separate versioned keys for shooter settings, presets, history (last 20 matches) and cosmetic milestones. Validate corrupted/old saves and fall back safely. Do not touch Stillwater keys. Rewards count completed legitimate local matches; practice does not farm progression. Cosmetics milestones: tutorial complete, first duel complete, 10 match wins, 100 eliminations; visual-only colors/badges.

Desktop Chrome/Edge/Firefox are initial targets; Safari requires explicit testing before support is claimed. Unsupported graphics or pointer-lock states show a useful recovery screen. Touch devices get an honest desktop-required message until touch input is implemented.

Acceptance: responsive camera independent of frame rate; no stuck keys after focus loss; movement/collision reproducible; every roster item complete; all routes navigable by bots; stable performance and bounded memory; matched simulation and visual impacts; settings/save restore; clear loading/failure handling; credits/license links available; clean exit back to arcade. Performance and networking acceptance are specified in the technical plan.

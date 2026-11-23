# Arcade Duels — gameplay lab

Run from the repository root:

```powershell
python -m http.server 8081 --bind 127.0.0.1
```

Open [the local prototype](http://127.0.0.1:8081/games/duels/) in a desktop browser. No npm install or build step is needed. Three.js 0.180.0 and its required loaders are vendored with the MIT license. The original fishing page is unchanged.

## Available now

- Private PeerJS battles for up to six players, with free-for-all, teams and classic duels. The host decides damage, ammo, scoring and respawns.

- Rough Arena-like blockout with cover, ramps, collision, ground movement, crouching, sliding and jumping.
- Seven actual Quaternius gun models: automatic/semi-auto/burst/pellet fire, ADS zoom, recoil, ammunition, reload timing and weapon switching.
- Three damage targets, head/body hits, timed target resets, optional moving targets and shot/hit/elimination counters.
- Kenney player model with idle/run animation, third-person view and provisional held weapon.
- Model inspector for all eleven loaded assets, including the WRAD arms, grenade and source target; orbit, zoom, wireframe and character animation selection.
- Live tuning for movement, jump, gravity, slide speed, sensitivity, recoil, fire rate, damage and FOV. Settings persist under `duels.lab.tuning.v1`.

Controls: WASD move, mouse look, left click fire, right click aim, Space jump, C/Ctrl crouch or slide while moving, R reload, 1–7/wheel switch gun, V third-person view, Escape pause/tune. F also fires for keyboard-accessible testing.

Embedded browsers may reject pointer lock. The lab falls back to click-drag look, F/left-click fire and Escape pause. For full captured mouse input, open the same local URL in Edge or Chrome. First-person source arms are an optional **unposed** preview, not a completed grip/animation set.

## Current limitations

This is a core-mechanics and asset-validation prototype. Values are starting points, not measured RIVALS parity. The map is approximate; bots, utility actions and an arcade selector are still planned. Audio is temporary synthesized feedback. Reload motion and grips are provisional. Inspector guns load directly from OBJ/MTL so conversion work does not block validation. Target silhouettes have simple hitboxes; the original target model is also available for separate inspection.

## Private battles

1. Open the same build on each device. Use the same hosted URL or a reachable local network server.
2. Choose **Free-for-all** (2 to 6 players, first to 30 eliminations), **Teams** (2, 4 or 6 players, first team to 50 eliminations), or **Classic duel** (2 players, first to five rounds). Select the room size and create a room. Share the six-character code.
3. In the lobby choose equipment and press **Ready**. Once the required players are ready, the host presses **Start match**. Click **Enter battle** to capture the mouse. Free-for-all and team players choose equipment again after elimination.
4. In a battle, **1** selects your primary, **2** your sidearm, **3** your chair, and **4** your grenade. Each life gives one grenade. Changing weapons cancels the current reload and preserves remaining ammo.
5. The results screen shows the final score. The host can start a rematch, and any player can leave. Keep the host tab open during the match.

Teams are assigned by the host in alternating slots, and friendly fire is disabled. Respawns favor covered locations away from opponents. Gameplay tuning uses common defaults in rooms. Equipment variants share the existing gun models. No account or database is required.

This follows Stillwater's PeerJS room IDs, metadata, generation guards, signaling reconnect, invite and disconnect patterns. The shooter has a separate protocol prefix and version check so fishing rooms cannot connect accidentally. Unlike the fishing movement snapshots, a shooter host also validates shot cadence, weapon/ammo/reload state and line-of-sight hits, owns HP/scores, and resets rounds. Pose snapshots are sent at 20 Hz and remote models interpolate between them. Movement is still client simulated with finite bounds/speed checks; full authoritative movement, lag compensation and ranked-grade anti-cheat are outside this prototype.

PeerJS is loaded locally only when creating/joining a room. Its default cloud service supplies signaling; browser data uses WebRTC. Some networks need a TURN relay. Set `window.DUELS_PEER_OPTIONS` before `lab.js` loads to customize PeerJS options, including `config.iceServers`; the existing `window.STILLWATER_PEER_OPTIONS` is also accepted as a fallback. See [PeerJS options](https://peerjs.com/client/api/peer) and [connection FAQ](https://peerjs.com/client/faq). Do not commit private relay credentials. No microphone or camera access is required.

## Validation performed

In-app browser: all eleven assets load; character materials and its 27 clips are available; gun materials render; first-/third-person views render; shooting consumes ammo and registers headshot damage; reload returns ammo to magazine capacity; movement changes position; jump becomes airborne; Escape pauses and exposes the inspector. Pointer-lock rejection in the embedded browser was observed and handled with drag-look fallback. Full captured-mouse feel, ramp/slide edge cases, final performance and fidelity remain for hands-on testing. No claim of completed RIVALS accuracy.

Multiplayer was tested with actual PeerJS cloud signaling and WebRTC between two local browser tabs: room create/join, opponent rendering, movement/jump updates, a 150-damage elimination, identical health/round scores on both clients, and the next round's reset. Separate devices and restrictive-NAT/TURN connectivity still need testing. `node --test` covers combat authority, wall occlusion, reloads, epochs, shot replay rejection, two-player room synchronization, capacity/version rejection, cancellation, replacement players and host departure, alongside the fishing tests.

## Assets and licenses

Kenney character/target/grenade: CC0, upstream licenses in their asset folders. Arms by wwwriks: CC0 license in `assets/arms/`. Guns by Quaternius: [creator-uploaded CC0 pack](https://opengameart.org/content/low-poly-guns-pack); original archive has no embedded license found, so retain the source provenance in [the asset scout](../../docs/rivals/asset-scout.md). Three.js: MIT, `vendor/three/LICENSE`. PeerJS 1.5.5: MIT, `vendor/peerjs/LICENSE`. No new model sources were searched for this prototype.

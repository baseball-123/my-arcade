# Arcade Duels — gameplay lab

Run from the repository root:

```powershell
python -m http.server 8081 --bind 127.0.0.1
```

Open [the local prototype](http://127.0.0.1:8081/games/duels/) in a desktop browser. No npm install or build step is needed. Three.js 0.180.0 and its required loaders are vendored with the MIT license. The original fishing page is unchanged.

## Available now

- PeerJS 1.5.5 two-player rooms, invite codes/links, remote characters and held guns, synchronized movement and shooting, host-decided damage/health/ammunition, first-to-five rounds and host rematches.

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

## Multiplayer with a friend

1. Open the same version of the game on both computers. Use a hosted HTTPS URL for internet play, or a reachable server on your local network. The `127.0.0.1` URL only reaches the computer opening it; copying that URL to a different computer does not share this server.
2. Enter your name and press **Create room**. Share the six-character code, or **Copy invite** when both players can reach that URL.
3. Your friend enters their name/code and presses **Join room**. Both players press **Enter playtest**. The round starts after a three-second countdown.
4. Eliminate the opponent to win a round. Health and ammunition reset for the next round; first to five wins the match. The host can choose **Rematch** in the menu.
5. Keep the host tab open and active. Menus stop your input but do not pause the room or make you invulnerable. **Leave room** returns to solo practice. If a guest leaves, the host's room remains available for a replacement; if the host leaves, the guest returns to solo.

Rooms support two players. Practice targets are hidden in rooms; resetting yourself is disabled. Gameplay tuning uses common defaults while in a room, with personal sensitivity and FOV retained. Solo tuning returns when you leave. Weapon switching cancels reloads and preserves each weapon's remaining online ammo.

This follows Stillwater's PeerJS room IDs, metadata, generation guards, signaling reconnect, invite and disconnect patterns. The shooter has a separate protocol prefix and version check so fishing rooms cannot connect accidentally. Unlike the fishing movement snapshots, a shooter host also validates shot cadence, weapon/ammo/reload state and line-of-sight hits, owns HP/scores, and resets rounds. Pose snapshots are sent at 20 Hz and remote models interpolate between them. Movement is still client simulated with finite bounds/speed checks; full authoritative movement, lag compensation and ranked-grade anti-cheat are outside this prototype.

PeerJS is loaded locally only when creating/joining a room. Its default cloud service supplies signaling; browser data uses WebRTC. Some networks need a TURN relay. Set `window.DUELS_PEER_OPTIONS` before `lab.js` loads to customize PeerJS options, including `config.iceServers`; the existing `window.STILLWATER_PEER_OPTIONS` is also accepted as a fallback. See [PeerJS options](https://peerjs.com/client/api/peer) and [connection FAQ](https://peerjs.com/client/faq). Do not commit private relay credentials. No microphone or camera access is required.

## Validation performed

In-app browser: all eleven assets load; character materials and its 27 clips are available; gun materials render; first-/third-person views render; shooting consumes ammo and registers headshot damage; reload returns ammo to magazine capacity; movement changes position; jump becomes airborne; Escape pauses and exposes the inspector. Pointer-lock rejection in the embedded browser was observed and handled with drag-look fallback. Full captured-mouse feel, ramp/slide edge cases, final performance and fidelity remain for hands-on testing. No claim of completed RIVALS accuracy.

Multiplayer was tested with actual PeerJS cloud signaling and WebRTC between two local browser tabs: room create/join, opponent rendering, movement/jump updates, a 150-damage elimination, identical health/round scores on both clients, and the next round's reset. Separate devices and restrictive-NAT/TURN connectivity still need testing. `node --test` covers combat authority, wall occlusion, reloads, epochs, shot replay rejection, two-player room synchronization, capacity/version rejection, cancellation, replacement players and host departure, alongside the fishing tests.

## Assets and licenses

Kenney character/target/grenade: CC0, upstream licenses in their asset folders. Arms by wwwriks: CC0 license in `assets/arms/`. Guns by Quaternius: [creator-uploaded CC0 pack](https://opengameart.org/content/low-poly-guns-pack); original archive has no embedded license found, so retain the source provenance in [the asset scout](../../docs/rivals/asset-scout.md). Three.js: MIT, `vendor/three/LICENSE`. PeerJS 1.5.5: MIT, `vendor/peerjs/LICENSE`. No new model sources were searched for this prototype.

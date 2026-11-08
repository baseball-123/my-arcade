# Three.js implementation and final multiplayer plan

Current priority update November 8 2026: the user requested basic PeerJS multiplayer now, using Stillwater as the example. Private two-player rooms, synchronized movement/combat and first-to-five rounds are implemented for playtesting. Earlier references below to networking as the final implementation phase now apply to broader networking polish and team-mode expansion.

The gameplay validation prototype is implemented under `games/duels/`, using locally vendored Three.js 0.180.0 and the existing collected assets. Later milestones below remain planned.

## Existing arcade findings

`index.html` is currently Stillwater's complete page (~105 KB), with raw WebGL rendering and game/UI logic inline. `audio.js` and `multiplayer.js` are separate; the latter uses lazy-loaded PeerJS 1.5.5, room codes and host-distributed boat state. `package.json` uses ESM and `node --test`; current tests cover fishing audio/network behavior. No existing arcade selector or Three.js dependency was found.

Preserve that implementation and its browser save keys. Plan a selector at `/index.html`, Stillwater at `/games/stillwater/`, and the shooter at `/games/duels/`, each with its own asset/module scope. When moving Stillwater later, explicitly handle relative scripts, any invite URL assumptions and return-to-arcade navigation. Static hosting uses the same origin and may live under a GitHub Pages subpath; avoid root-relative asset assumptions. Existing invites to the old index route need a compatibility redirect to Stillwater if their query parameters identify its rooms.

Use ordinary links/full page navigation initially to dispose each game's audio, render loop, pointer lock and peer connections cleanly. Separate localStorage namespaces. Opening the arcade must not download shooter models or join a room. Serve over localhost during development and HTTPS in deployment; do not depend on `file://` working for ES modules/assets/networking.

## Engine and code boundaries

Use Three.js rendering with WebGL, ES modules and GLB runtime models. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) supports glTF 2.0 and separate compression decoders; [PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html) supplies first-person mouse capture/look. Neither replaces gameplay collision or a character controller.

Suggested source boundaries (future files):

| Module | Owns |
| --- | --- |
| `main` / lifecycle | Boot, loading, scene transitions, cleanup |
| `simulation` | Fixed tick, player/item state, seeded random sequence, round rules |
| `input` | Human bindings or bot commands with the same command schema |
| `movement` / collision | Capsule sweeps, steps, ramps, slides, jump state |
| `combat` | Hitscan/projectiles, ammo, health, utility, effects events |
| `maps` | Declarative layout, solid collision, spawns, hazards, nav links, overtime zone |
| `render` / `animation` | Three.js scene, interpolation, arms/character clips, particles |
| `audio` | Decoded clips, positional cues, category volumes, voice limits |
| `ui` / persistence | Menus/HUD/settings/presets/local history |
| `transport` | Abstraction only at first; PeerJS adapter built in final phase |

Use simulation entities independent of Three.js objects. A bot and a human produce the same `PlayerCommand`: player ID, sequence, simulation tick, movement axes, look orientation, buttons, slot and action edges. Local authority consumes commands and emits events/snapshots; later the host consumes remote commands through the same interface. This prepares for multiplayer without implementing networking early.

60 Hz fixed simulation with accumulated time and bounded catch-up (maximum five ticks per rendered frame), interpolated rendering, explicit handling for long stalls. Do not make movement, weapon cadence or round time depend on FPS. Use a seeded random stream for spread/bot behavior; never assume full cross-browser floating-point lockstep determinism.

Collision uses authored static boxes/ramps/convex primitives and a swept capsule controller with broadphase spatial partitioning. Swept rays/projectiles avoid tunneling. Render meshes are not collision truth. Generic physics integration is an optional later decision only if collision complexity warrants it; keep it out of the initial dependency set until justified.

## Rendering and art targets

Consistent palette and rough materials; clean sky/ambient fill plus one shadow-casting sun. Instanced repeated props, merged static sections where useful, pooled projectiles/particles, limited transparency. Separate weapon viewmodel camera/layer, depth policy and FOV; world aim/collision remain authoritative. No need for expensive full-scene postprocessing to achieve clarity.

Initial budgets are targets to measure, not achieved results:

- First playable transfer ≤15 MB compressed for engine/shared assets/Arena; no additional map bundles.
- ≤250 visible draw calls and ≤400k visible triangles on Medium at a representative combat viewpoint.
- Usually 512–1024 px textures; cap exceptional hero assets at 2048; reuse atlases; no indiscriminate 4K textures.
- Four players plus equipment, 32 simultaneous audible effects maximum, capped particles and decals.
- Target 60 FPS at 1080p Medium on a defined midrange integrated-GPU reference machine; choose and record the machine before judging success. Low supports reduced resolution/shadows.
- No growing GPU allocations across ten enter/leave or rematch cycles. Dispose geometry, materials, textures, bitmap resources, audio nodes, event handlers and timers.

Asset preparation: convert selected OBJ/FBX through Blender or a vetted converter into GLB; normalize units/front/up/pivots, embed or preserve textures, test animation events. Only add Meshopt/Draco/KTX2 if measurement shows a worthwhile transfer/memory benefit; loader decoders must be packaged and tested with the pinned engine.

## Final phase: PeerJS over WebRTC

[PeerJS's getting-started guide](https://peerjs.com/client/getting-started) documents PeerServer signaling and DataConnection messaging. Its [FAQ](https://peerjs.com/client/faq) explains direct browser data channels and TURN fallback. A static browser game can use hosted signaling, but that does not mean networking has no infrastructure. TURN may relay traffic on restrictive networks and may incur hosting/bandwidth costs.

Topology: one player-host authoritative simulation; others connect to that host. Initially cap at four players (1v1 or 2v2). Host validates commands, movement, item cooldowns/ammo, hits, HP, scoring and round flow. Never accept client-supplied damage/health/score as authoritative. Client predicts its own movement and plays immediate cosmetic feedback; host-confirmed events determine actual hits and kills.

Use a distinct game/version room prefix so Stillwater and the shooter cannot connect accidentally. Room metadata includes protocol/build versions, content-manifest hash, mode, capacity, map and seed. Reject incompatible builds/assets before ready-up. Names have length/character limits and are rendered as text; no HTML injection. Joining mid-match enters spectators until the next match; no surprise team fill during an active duel.

Room flow: create → enter lobby → choose 1v1/2v2 and teams → all players ready → load the fixed Arena map → load acknowledgment with 30-second timeout → loadout window/countdown → match → results/rematch. All clients must acknowledge the same map/content hash. Host can remove an unresponsive player from the lobby; a match starts only with complete balanced teams. A 1v1 may begin with two people; a 2v2 requires four.

Protocol plan:

| Message group | Contents / handling |
| --- | --- |
| Handshake/lobby | Version, manifest, name, room membership, team, ready; fixed Arena map; reliable delivery |
| Inputs | Sequence, bounded axes/buttons, look orientation, client tick and action ID; send 30 Hz with recent commands redundantly |
| Snapshots | Host tick/time, last processed input sequences, bounded entity transforms, HP/ammo, round state; 20 Hz |
| Combat events | Unique event ID, authoritative tick, fire/hit/elimination/utility; ordered/reliable, deduplicated |
| Recovery/exit | Resync request, disconnect reason, final result; reliable |

Select the DataConnection serialization/channel options supported by the pinned PeerJS build during that final phase. Do not promise an unreliable channel through a wrapper before verifying it. Coalesce/drop obsolete movement snapshots before sending when buffered data grows; preserve critical event delivery. If transport options cannot prevent head-of-line delays under realistic loss, evaluate a dedicated native RTCDataChannel for transient state while retaining PeerJS for setup, within the user's WebRTC requirement; document the decision first.

Client interpolation starts around 100 ms with an adaptive bounded buffer. Reconcile prediction using host acknowledgment and replay unacknowledged commands. Validate aim origins and bounded shot timestamps. Target capped hitscan rewind history of 200 ms; never let a client choose arbitrary history or fire from arbitrary positions. Duplicate shot/action IDs must not apply twice. Grenades and round state run on host time. Estimate clock offset using ping exchanges.

Input validation: finite numeric values, message byte/count limits, allowed enum values, monotonic sequences, max movement rates, per-action cadence and world bounds. Rate-limit malformed peers and disconnect repeated violations. Host authority prevents ordinary client score forgery but **cannot make the host trustworthy**; no ranked integrity claim without a trusted server.

Disconnect policy: lobby departure frees a slot; active guest departure removes that player and resolves team elimination when applicable; no reconnect into the current match in launch. Host departure closes the room and returns everyone to title with a clear message. Host tab suspension or prolonged simulation stall aborts the match after a bounded timeout; no fabricated results. Host migration deferred. Menu open online does not pause. Background tabs throttle, so show the host a keep-tab-active notice when hosting.

ICE configuration is configurable outside tracked secrets. Do not ship long-lived private TURN credentials; public deployment needing authenticated TURN requires short-lived credential issuance from a small service. This is separate from authoritative gameplay hosting. Show actionable connection failure/retry/solo options. No voice/video media or microphone permission required.

## Updated delivery sequence: playable validation first

| Phase | Work | Exit condition |
| --- | --- | --- |
| 0 — collected | Existing research and asset downloads | Enough existing assets to begin; complete roster/animations not required |
| 1 — immediate prototype | Rough Arena-like blockout, visible character, first-person arms, existing gun selection, targets, shooting/reload, movement/slide/jump, asset viewer and tuning controls | User can inspect assets and play the mechanics locally; incomplete features labeled |
| 2 — feel and asset validation | Tune gameplay toward RIVALS; inspect grips, scale, animation and sound; record observed asset gaps | Core gameplay feels right and existing resources have been evaluated in-engine |
| 3 — content completion | Search only for proven missing assets, finish actions/roster/bots/match loop | Offline game complete |
| 4 — Arena fidelity and integration | Accurate reference layout, visual polish, arcade selector and Stillwater compatibility | One finished Arena recreation; both games work |
| 5 — networking, last | PeerJS/WebRTC private rooms, authority, prediction and real-network QA | Validated 1v1/2v2 multiplayer |

This order supersedes the old requirement to finish asset preparation or a dimensioned Arena plan before playable implementation. Exact map fidelity is lowest priority until gameplay and existing assets can be tried.

## Meaningful verification plan

Simulation checks: movement independent of render cadence (30/60/144 FPS), no diagonal speed gain, jump reset only on landing, head clearance, slide cooldown, wall/projectile collision, reload cancellation and cadence, head/body damage, splash occlusion, smoke line-of-sight, medkit cancellation, round reset, timeout and simultaneous-kill policy. Use seeded fixtures and assert outcomes, not the internal code structure.

Map checks: spawn protection by geometry, matched route timing, reachable nav links, hazard boundaries, cover heights, jump envelope and overtime-zone fairness. Play both spawn sides and every weapon role; record bottlenecks.

Visual/audio QA: exact selected models in engine, grips/reloads, muzzle alignment, texture paths, no near-plane clipping, color-independent teams, legible HUD, reduced motion, distinct material cues, no overlapping audio buildup.

Networking QA at final phase: two real browsers on separate devices/networks, host/guest roles swapped, four-player 2v2, relay-required case where available, 50/150 ms RTT, jitter and 1–3% loss, failed join, room full, wrong version/manifest, duplicate/out-of-order actions, message abuse, tab suspension and disconnect during each match state. Target no duplicate authoritative damage, convergent round/score/ammo state, and ≤100 KB/s aggregate steady-state host upload in 2v2 after protocol tuning. Measure rather than promise latency quality across all networks.

Run existing `node --test` before/after the later routing or shared-file edits. The isolated prototype does not modify the fishing runtime. See `games/duels/README.md` for the specific browser interactions verified and remaining limits.

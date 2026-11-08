# Browser duel shooter: planning dossier

Research date: November 1, 2026. Reference confirmed by the user: **RIVALS by Nosniy Games**.

The initial research dossier is now accompanied by a local playable validation prototype at `games/duels/`. Stillwater routing is unchanged; nothing has been deployed. See [the prototype guide](../../games/duels/README.md).

Read in order:

For the current action list and playtest notes, start with [Next steps](next-steps.md).

1. [Reference-game research](reference-research.md): what public evidence establishes, the wider content catalog, and unresolved fidelity questions.
2. [Proposed game specification](game-spec.md): player actions, launch modes, maps, weapons, controls, art requirements, and acceptance criteria.
3. [Asset collection and assessment](asset-scout.md): downloaded resources, licenses, exact usable files, alternatives, and remaining preparation work.
4. [Technical and delivery plan](technical-plan.md): arcade integration, Three.js architecture, performance goals, and PeerJS/WebRTC as the final implementation phase.

## Decisions already established

- Add a second game to the existing arcade; preserve Stillwater and its saved progress.
- Browser-based, with Three.js for the new 3D game.
- Research and resource collection precede implementation.
- Updated user priority: basic two-player PeerJS/WebRTC multiplayer is implemented now for combat validation, using Stillwater as the reference. Broader networking polish comes later.
- User-selected map scope: one faithful recreation of standard RIVALS Arena (not Big Arena). Desktop keyboard/mouse first; readable stylized low-poly art.

## Proposed launch scope

- One combat map: a recreation of RIVALS Arena, matching its layout, ramps, cover, spawns and visual proportions after reference verification.
- Practice and bot duels reuse Arena; no separate range map.
- Twelve equipment choices across primary, secondary, melee, and utility slots.
- First-to-five elimination matches; final networking milestone adds private 1v1 and 2v2 rooms.
- A game selector presenting both Stillwater and the new shooter.

The single Arena map is the user's explicit scope choice. Other launch limits remain recommendations. Full RIVALS content parity is documented separately from this initial scope.

## Status and implementation boundary

Public-web research and the initial resource collection are delivered. Eight real ZIP archives and their extracted files are retained under `research/assets/`. SHA-256 hashes, GLB metadata, animation names, and dependency paths are in [the inventory](../../research/assets/inventory.json).

**Planning is not a claim of exact current RIVALS parity.** Public catalogs disagree, and no live Roblox session was inspected. Exact reference balance, complete current event content, and map measurements remain unverified. The dossier explicitly records those gaps instead of inventing them.

## Updated priority: playable validation first

The user's latest direction supersedes the earlier preparation gates. Build a local Three.js prototype now using the existing downloaded assets and a rough Arena-like blockout. The first milestone must show the player model and existing equipment, support asset inspection, and let the user try shooting, movement, sliding and jumping. Tune core gameplay toward RIVALS through hands-on feedback.

Exact Arena geometry is lowest priority. Missing-asset discovery, roster completion, polished animation and final content-manifest freeze follow validation of what we already have. Temporary poses and incomplete models are acceptable if clearly identified. Basic multiplayer now supports two-person validation; later team modes and networking polish remain future work. No additional model search is needed to start.

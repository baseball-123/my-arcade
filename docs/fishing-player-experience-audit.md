# Stillwater Player Experience Audit

Updated November 22, 2026

Stillwater should make fishing easy to start, explain its controls when needed, and clearly distinguish freeplay, timed competition, and sailing with friends. This audit covers the current fishing homepage, local save handling, competition logic, menus, and PeerJS room controls.

## Pass one Screens and actions

| Surface | Finding | Implementation direction |
| --- | --- | --- |
| First launch | The game opens directly into a busy boat interface with no mode choice | Add a backed home panel with Freeplay, Competition, Sail with friends, Controls, and Arcade Duels |
| In-game menus | Shop, collection, settings, multiplayer, and music compete in a top toolbar | Use a prominent Pause button and keep shop and collection reachable |
| Fishing | Cast, waiting, hook, reel, catch, and escape already have feedback | Preserve the interaction and show a brief control hint without the long instruction paragraph |
| Competition | Starting a run is hidden in settings and finishing only changes a status line | Add competition setup, a clear goal, visible results, Play again, and Freeplay |
| Pause | The menu only opens a selected utility panel | Add a dedicated pause hub with Resume, Shop, Collection, Settings, Controls, Friends, and Home |
| Settings and help | Weather, mode switching, and a long controls paragraph share a panel | Separate weather/music settings, controls, and competition setup |
| Shop | Purchases show cost and level but insufficient coins or max level can look unexplained | Add explicit affordability and fully upgraded feedback |
| Collection | Search and group filters exist | Keep filters and add a clear empty-search result |
| Multiplayer | Room code, join status, players, and leave are available | Expose the entry from home and pause, confirm host departure, and surface a lost-room state |
| Saving | Browser progress is saved and failure is reported in a small scene footer | Keep persistence and expose the save limitation in settings |
| Navigation | The homepage is fishing and there is no arcade selector | Provide an explicit Arcade Duels link from the fishing home |

## Pass two Transitions and recovery

- Clear movement keys, held steering input, and drag state on pause, focus loss, and document hiding. Freeze the local competition clock while paused.
- Restrict Tab focus to the open menu. Block game controls and top-level toolbar actions behind it. Return keyboard focus to the control that opened the menu.
- Escape resumes from ordinary pause and utility panels. Home, competition results, confirmation, and graphics failures require an explicit action.
- Confirm switching away from an active competition. Starting a new run must reset run counters and the timer once, and result handling must not award the bonus twice.
- Resume from a menu without counting time spent in that menu against the competition deadline.
- Explain that multiplayer menus pause the local boat and local timer while friends keep sailing. Preserve local coins, upgrades, and collection when joining or leaving.
- Distinguish canceling a connection from leaving a live room. Warn a host that leaving closes the room for everyone.
- Show room closure with actions to return home, keep fishing solo, or reopen Friends. Canceling an in-flight connection must not produce a late room join.
- Expose graphics startup and context-loss failures with Retry. Do not leave the player operating an invisible ocean.
- Keep save-failure information visible in Settings and avoid promising persistence when storage is unavailable.
- Preserve the previous mode and fishing phase when opening normal menus. Home actions explicitly start a new session or resume the current one.
- Check short/narrow windows, label contrast, focus visibility, and result actions independently of gameplay completion.

## Acceptance checks

1. A fresh visitor chooses Freeplay, starts fishing, opens pause, visits shop/collection/settings/controls, and resumes.
2. Competition setup states eight fish in ninety seconds and a 150-coin bonus. Win and loss open results with the actual catch count and a clear next action.
3. Keyboard and pointer controls do not continue moving the boat while a menu is open or after focus is lost.
4. A canceled run and a finished run cannot grant the bonus twice. Saved progress survives home and room transitions.
5. Two clients create/join, see the roster, leave, and recover after host departure.
6. Empty collection searches, unaffordable upgrades, and graphics/storage failures have understandable feedback.
7. The interface fits narrow and short desktop windows. A complete fishing catch, competition, and multiplayer device test remains part of release validation.

## Implementation status

Implemented locally

- First-launch home with Freeplay, competition setup, friends, controls, settings, and a link to Arcade Duels.
- Separate pause hub, readable backed panels, dedicated settings and controls, and Back navigation.
- Competition confirmation when abandoning/restarting a run, win/loss result panels, replay, and freeplay continuation.
- Focus trapping, background control isolation, and input clearing on pause, blur, and page hiding.
- Collection empty-filter feedback and explicit upgrade affordability labels.
- Host-leave confirmation and a room-closed recovery panel for disconnected players.
- Graphics failure/reload path and storage-failure notice in settings.

Validation still to complete includes a full successful eight-fish run, focus and steering on a physical keyboard, and multiplayer on separate devices. The interface revision is local and has not been deployed.

## Browser verification

- Freeplay entry, pause, settings, controls, and Back-to-home navigation passed.
- A collection search with no matches displayed the empty-results message.
- Competition started at ninety seconds. Pause and cancellation kept the remaining timer unchanged.
- A full ninety-second timeout displayed the actual 0/8 result with replay, freeplay, and home actions. Continue in freeplay returned to playable controls.
- Two real PeerJS browser clients created and joined a shared ocean. Host leave required confirmation and the guest received Room closed with Continue solo and Open friends.
- The host browser reported no runtime errors. The home preview was checked at a narrow viewport.
- A successful catch and eight-fish competition win still require hands-on validation. Automated browser key entry could not complete the rapid-reel sequence.

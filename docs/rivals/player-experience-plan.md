# Arcade Duels Player Experience Audit and Plan

Updated November 22, 2026

Arcade Duels should let a first-time player find a battle, understand the rules, choose equipment, and recover from every match or connection outcome. The current interface puts practice controls, asset inspection, and tuning ahead of multiplayer. This plan reorganizes the existing game around playing with friends.

This plan includes the current implementation status below. Remaining acceptance checks must be completed before shipping. The audit covers the current local HTML, styling, input handling, dialogs, and multiplayer states. It includes the reported low-contrast tabs and buried battle controls. Smaller-screen layouts and complete multiplayer transitions still require visual testing.

## Main findings

| Priority | Current behavior | Player impact | Planned change |
| --- | --- | --- | --- |
| P0 | Playtest and Asset inspection labels sit over the bright arena with faint text | Navigation is easy to miss | Place navigation on a solid dark surface with clear selected, hover, focus, and disabled states |
| P0 | Private battle appears below loadout and tuning at common window sizes | New players struggle to find how to play | Put Create room and Join room at the top of the first screen |
| P0 | Escape exposes the launch menu and owner controls | Players lose match context when trying to resume | Add a compact pause overlay with Resume, Controls, Settings, and Leave room |
| P0 | Room filling starts a countdown before loadouts are necessarily chosen | Players can enter a match unprepared | Choose loadouts in the lobby, then use an explicit ready and start flow |
| P0 | Battle elimination messages still say ROUND WON or WAIT FOR NEXT ROUND | Continuous respawn modes appear to stop after each elimination | Give each mode its own elimination and respawn messages |
| P0 | Combat can freeze for countdown, elimination, waiting, or match completion | Players interpret state restrictions as broken controls | Show the specific reason and the next available action in each state |
| P1 | Gameplay Lab, source arms, coordinates, speed, and prototype labels appear in normal play | Important game information competes with development information | Keep health, equipment, score, objective, and connection status in the player HUD |
| P1 | Host options are visible when joining someone else's room | Players expect controls they cannot use | Show guests the host's settings as read-only room information |
| P1 | Classic Duel uses seven freely selectable guns while other modes use four equipment slots | Instructions can describe the wrong controls | Show mode-specific equipment instructions throughout the flow |
| P1 | Loadout choices are two dropdowns with little comparison information | Players cannot judge which weapons fit their play style | Show six choices per slot with name, model preview, handling summary, and selected state |
| P1 | Some sidearms and the carbine reuse existing models | Players may expect visibly different equipment | Identify variants clearly with their handling differences |
| P1 | Network failures mainly appear as small status text | A player can miss why joining or playing failed | Show a focused error with Retry, Back, or Leave as appropriate |
| P1 | Narrow layouts hide tuning entirely | Access to settings depends on screen width | Use a dedicated settings overlay that fits short and narrow windows |

## Proposed player journey

Arcade menu → Arcade Duels home → Create room or Join room → Lobby and loadout → Countdown → Match.

During a match, Escape opens pause and Resume returns to combat. In free-for-all and teams, elimination leads through the death animation to loadout selection and respawn. Classic Duel uses a round result and the next-round countdown. The final score opens Match results, followed by Rematch, lobby, or Leave room.

Practice is accessible from home. Settings and Controls open as overlays and return to the screen that opened them. Owner tools contain tuning, asset inspection, and diagnostic readouts.

These are states within the shooter. They can share components and overlays within the arcade's existing game page.

## Screen and state audit

| Screen or state | What the player needs | Proposed content and actions | Completion check |
| --- | --- | --- | --- |
| Arcade entry | Recognize both games and choose one | Arcade menu with Fishing and Arcade Duels entries and concise descriptions | Both games open and return to the arcade menu |
| Loading | Know the game is starting | Game title, loading progress, plain loading text | Loading ends in home, or a recoverable error |
| Loading failure | Recover from a missing asset or unsupported graphics | Explain the failure, Retry, Return to arcade | No permanent loading overlay or blank canvas |
| First launch and home | Understand what the game is and how to play | Arcade Duels title, Create room, Join room, Practice, Controls, Settings, Return to arcade | Main actions are readable without scrolling at desktop sizes |
| Create room | Choose battle rules | Name, mode, player count, goal explanation, Create, Back | Teams offers 2, 4, or 6 players and FFA offers 2–6 |
| Join room | Enter a friend's room | Name, code, Join, Back, inline code validation | Host-only options do not appear as editable controls |
| Invite link | Join the intended room | Prefilled code, room join action, name entry | Loading an invite does not unexpectedly create a room |
| Connecting | Know the request is pending | Connecting status, Cancel, disabled duplicate submit | Cancel prevents a late connection from opening a room |
| Join failure | Know why joining failed | Distinct messages for missing room, full room, active match, version mismatch, and timeout | Retry and Back return to usable states |
| Host lobby | Invite friends and prepare the match | Code, Copy invite, roster, team assignment, capacity, mode summary, loadout, readiness, Start match, Leave | Host can change capacity while waiting and all clients see it |
| Guest lobby | See room rules and prepare | Code, roster, team, read-only rules, loadout, Ready or Not ready, Leave | Guest cannot change room rules or start the match |
| Incomplete lobby | Understand why the match has not started | Players present versus required, waiting message, invite action | No unexplained frozen arena |
| Lobby setting change | Understand revised requirements | Updated count and roster, reset readiness when relevant | Never reduce below occupied slots or start uneven teams |
| Ready and start | Agree when play begins | Proposed host Start match enabled when the required roster is ready | Explain any disabled Start button next to it |
| Initial loadout | Select primary and sidearm | Separate six-option groups, equipment summary, selected state, confirm action | Both equipment choices are explicit and survive lobby updates |
| Countdown | Orient before combat | Large 3, 2, 1, mode goal, team, equipped loadout | Movement and firing restrictions have visible countdown feedback |
| Live match | Read combat-critical information | Crosshair, health, active weapon, ammo, reload progress, four equipment slots for battles, score, objective | UI stays readable over every part of the arena |
| First combat input | Know how mouse capture works | Brief click-to-play prompt and basic controls | First click captures input without an accidental shot |
| Weapon switch | Know which slot is active | Selected slot highlight and weapon name, immediate switch feedback | 1–4 and wheel follow the chosen battle loadout |
| Reload | Know the weapon is temporarily unavailable | Hand and magazine or shell motion, ammo change on completion, reload indicator | Switching cancels the reload and does not grant ammo |
| Empty magazine or spent grenade | Understand the unavailable action | Reload prompt for a firearm, Used this life for a spent grenade | No firearm reload prompt for chair or grenade |
| Hit and elimination feedback | Know whether an attack succeeded | Hit marker, damage feedback, concise elimination message | Other players' deaths do not tell the local player they were eliminated |
| Scoreboard | Understand standings | Player eliminations, teams and team totals where applicable | Scores agree across clients and do not obscure aiming by default |
| Pause during multiplayer | Resume or leave with context | Resume, Controls, Settings, Leave room, notice that the battle continues | Escape returns to a focused overlay and clears held input |
| Pause during practice | Resume or reset practice | Resume, Controls, Settings, Reset practice, Home | Practice pause freezes the local simulation |
| Focus loss and return | Recover control after switching windows | Clear held keys, show Click to resume on return | Returning does not auto-fire or leave movement stuck |
| Eliminated in FFA or teams | Recognize death and prepare another life | Death animation, eliminated status, brief respawn delay, next loadout | Death remains visible before the picker appears |
| Respawn loadout | Keep or change equipment | Last chosen primary and sidearm selected, change options, Spawn, Leave | No forced selection reset and no spawning before host approval |
| Respawn pending | Know the request is being confirmed | Spawning status and disabled duplicate submit | Rejection returns to the picker with a reason |
| Spawn protection | Know temporary protection exists | Brief protection indicator that ends on firing or expiry | Both host rules and UI agree about protection |
| Classic Duel round end | Understand why combat stopped | Round winner or draw, round score, next-round countdown | Message says round and the next spawn restores controls |
| Match results | Recognize victory or defeat and continue | Winning player or team, full standings, Rematch for host, waiting text for guests, Leave | Results take priority over pause and respawn dialogs |
| Rematch | Prepare the next match together | Proposed return to lobby with scores cleared and loadouts retained | Teams refill and rebalance before a new match starts |
| Guest departure | Know whether the battle continues | Roster notice and updated score display | If play becomes impossible, explain the return to lobby |
| Host departure | Understand the room has ended | Host left message, Return home, Create room | No silent switch into practice or stranded dialog |
| Signaling interruption | Distinguish reconnecting from a lost match | Small reconnecting notice while the data channel still works | Reconnection notice clears when signaling recovers |
| Host timeout or lost data channel | Recover from an unusable match | Connection lost message, Rejoin if available, Home | Combat inputs stop and resources remain consistent |
| Leave or return to arcade | Avoid closing everyone's room accidentally | Explain host departure impact and offer Cancel or Leave | Navigation releases mouse capture and closes the PeerJS session |
| Settings | Adjust personal preferences | Sensitivity, field of view, available audio controls, reset personal settings, Back | Works at narrow widths and never changes battle rules |
| Controls | Learn relevant actions | Movement, aim, fire, reload, equipment slots, pause, current-mode differences | Reachable before play and from pause |
| Practice | Learn weapons and movement alone | Practice entry, weapon choice, target reset, Return home | Uses clear practice language and cannot affect a live room |
| Owner tools | Inspect and tune the existing game | Password entry, tuning, asset inspection, optional diagnostics, Back | Hidden from the main battle path and clearly labeled |
| Credits | Find attribution | Credits overlay or link reachable from home/settings | Returns to the same screen without ending a room |

## Layout and visual rules

Use a solid dark panel behind interactive navigation and text. Keep the arena visible around the panel. Normal-sized text should reach a contrast ratio of at least 4.5 to 1 against its actual panel background. Selected navigation should have a persistent fill or outline as well as a text-color change. Inactive navigation must remain readable. Keyboard focus needs a visible outline.

Home should show the game title and Create room and Join room above the fold. Practice is secondary. Controls, Settings, Credits, and Owner tools belong in a smaller supporting row. Keep the owner password field, sliders, source-model controls, mesh counts, FPS, coordinates, and movement speed inside Owner tools.

The multiplayer lobby should use one clear roster panel and one loadout panel. At narrow widths these stack in reading order. Long lists can scroll inside the relevant panel. Keep Back, Leave, Confirm, and Spawn reachable in short windows. Desktop keyboard and mouse support should be stated on devices without the required controls.

The HUD should use small backed panels for health, ammo, equipment, and score. Place temporary messages away from the crosshair. Distinguish blue and orange teams with text labels as well as color. Label the active equipment slot and the remaining grenade count.

## Interaction rules

- Keep one primary interaction active at a time. Match results override respawn, respawn overrides pause, and pause overrides combat input.
- A dialog receives keyboard focus when opened and returns focus to the invoking control when closed. Escape closes settings and controls, resumes from pause, and does not silently dismiss results or required loadout selection.
- Resume and Spawn require a deliberate click to request mouse capture. If capture fails, show the supported fallback controls with an action to retry.
- Explain disabled actions near the action itself. Countdown, awaiting players, respawn cooldown, and awaiting host confirmation are different states.
- Preserve valid loadout selections through ordinary snapshots. Clear pending combat input when opening any overlay, dying, leaving, or losing focus.
- Use mode-specific language. FFA and teams award eliminations and respawn lives. Classic Duel awards rounds and resets both players together.
- Host rules remain authoritative. Show guest settings as read-only and validate changes to capacity on the host.
- The owner-name password remains a convenience lock. It cannot establish owner identity or prevent browser-code modification in this static client.
- Keep visible names and input feedback as text. Long names must wrap or truncate without covering controls.

## Proposed implementation sequence

1. Fix navigation contrast and make battle entry the first visible action. Remove lab-oriented copy from the player-facing home and HUD.
2. Define explicit home, lobby, match, pause, respawn, results, and connection-error UI states. Centralize transitions and overlay priority before rearranging controls.
3. Split Create and Join, then build the shared lobby. Preserve host capacity editing. Add loadout selection and readiness before host start.
4. Build compact pause, personal settings, and controls overlays. Move tuning, model inspection, and diagnostics into Owner tools.
5. Finish death, respawn confirmation, classic round-end, and results/rematch flows. Correct each mode's messages and equipment labels.
6. Add visible recovery paths for asset failure, join failure, host departure, and connection loss. Finish Return to arcade and leave confirmation behavior.
7. Run the complete journey in fresh browser sessions, including keyboard-only menu use, short/narrow windows, and two real devices. Fix blockers before the v1 commit.

Steps 1, 2, 4, 5, and 6 polish or repair existing behavior. Lobby readiness and explicit host start change the existing automatic-start flow and require implementation and networking tests. Treat any additional game modes, maps, progression, accounts, or new equipment as later scope.

## Acceptance walkthrough

- A stranger can find Create room, Join room, and Practice from home without scrolling or receiving spoken instructions.
- A host creates each supported mode. A guest joins by code and by invite. Both see the same rules, capacity, roster, and teams.
- Capacity changes, a full lobby, a departure, unready players, and a start request produce clear, synchronized outcomes.
- Both players choose loadouts, enter the countdown, capture input, move, aim, switch weapons, reload, and pause/resume without losing their place.
- The enemy observes a reload. Weapon switching cancels it and ammo remains correct.
- An eliminated player sees death, chooses a changed loadout, spawns once after confirmation, and receives accurate spawn-protection feedback.
- FFA reaches 30, teams reaches 50, and Classic Duel reaches five rounds. Every client sees the correct result and can reach a usable next screen.
- Rematch clears the proper scores and returns everyone to a consistent preparation state.
- Missing/full/active rooms, wrong versions, host departure, and timeouts have recovery actions that work.
- Every overlay fits the tested viewport, every interactive label remains readable, focus is visible, and no browser console errors occur during the walkthrough.
- Record fresh-eyes observations and remaining blockers before marking the UI ready to ship.

## Second review additions

The second review added roster-change readiness resets, per-life spawn confirmation, host-only match start, lobby return on rematch, a scoreboard overlay, spawn-protection status, host-leave confirmation, guest recovery after host departure, and input clearing on focus loss. The lobby must leave personal settings open through ordinary snapshot refreshes.

## Implementation status November 22

Implemented locally and checked through the normal browser controls

- Home prioritizes Create room, Join room, and Practice on dark backed surfaces.
- Create and Join use separate views. Invite links open Join with the code filled in.
- Lobby offers equipment summaries, readiness, host-only Start match, roster status, and host capacity editing.
- The host waits for a full ready roster. Roster and capacity changes clear readiness.
- Pause has Resume, Settings, Controls, Scoreboard, and Leave. Personal camera settings are separate from owner gameplay tuning.
- Owner tools contain tuning, source-arm controls, and the model inspector.
- Combat hides FPS, coordinates, speed, and development counters. Mode-specific equipment instructions, elimination messages, and spawn-protection status are present.
- Death-to-loadout keeps the selected equipment and shows pending spawn confirmation.
- Results use a standings table. Rematch returns to lobby preparation.
- Host leave has an explicit warning. Guests receive a room-closed overlay with Home and Rejoin.
- Loading failures offer Retry and Return to arcade. Existing invalid-code and join-error status feedback remains in the Join view.
- A two-client browser session verified equipment readiness, host start, match entry, pause/settings return, leave confirmation, and guest disconnect recovery.
- Automated checks cover manual start, roster readiness resets, rematch preparation, team balance, six-player synchronization, combat, and the existing fishing game.

Still to finish or verify before release

- Full-match browser runs through death, respawn, final results, and rematch in every mode.
- Six real players across separate devices, including restrictive networks.
- Weapon model preview cards. Current loadout menus provide names and gameplay summaries.
- Arcade-level navigation. Return to arcade currently reaches the existing fishing homepage.
- Narrow and short window testing, keyboard focus checks, and a fresh-eyes playtest.
- Full visual reload comparison and RIVALS posture accuracy.
- No deployment has been performed for this interface revision.

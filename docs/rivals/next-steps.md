# Arcade Duels Next Steps

Updated November 8, 2026

Our next milestone is a prototype we can use to judge the player model, existing assets, and core gameplay. We will playtest movement and shooting, record specific problems, and improve the build through short feedback cycles. Accurate Arena reconstruction is the lowest priority while this validation is underway. The user has moved basic PeerJS multiplayer forward so two people can evaluate combat now.

## Multiplayer priority update

Basic two-player PeerJS rooms are implemented using Stillwater's networking patterns as the reference. Test with a friend now: create/join a room, enter the playtest, move and shoot, check health and round scores, and try leaving/rejoining. Full multiplayer polish follows these observations. This supersedes the earlier instruction to leave all multiplayer until the end. See [multiplayer instructions and limits](../../games/duels/README.md#multiplayer-with-a-friend).

## Where we are now

The current local build contains a rough Arena-like layout, seven gun models, targets, first-person play, a third-person character view, and an asset inspector. Movement, sliding, jumping, aiming, firing, reloading, and live tuning are implemented as prototype features.

Earlier browser checks confirmed loading, basic movement, jumping, ammunition consumption, target hits, reload completion, and character visibility. Full mouse-control feel, slide and ramp behavior, weapon grips, and similarity to RIVALS still need hands-on validation. Existing tests cover Stillwater audio and multiplayer; they do not establish that the new shooter feels correct.

Weapon values, the proposed twelve-item launch roster, bots, and match rules remain adjustable proposals. We should settle these through playtesting rather than treat the earlier specification as fixed.

## First session

Use desktop Edge or Chrome for captured mouse input. The embedded browser's drag-to-look fallback is useful for inspection but cannot establish normal FPS mouse feel.

1. Start the local server if needed. From the repository folder, run `python -m http.server 8081 --bind 127.0.0.1` and open [the gameplay lab](http://127.0.0.1:8081/games/duels/).
2. Enter the playtest with the default settings. Move, strafe, stop, jump, slide, and traverse both ramps before changing any values.
3. Fire the Assault Rifle at stationary and moving targets. Test aiming, recoil, hit feedback, empty-magazine behavior, and reloading.
4. Try each remaining gun. Note which differences feel useful and which mechanics feel wrong or unfinished.
5. Press V to inspect the moving character. Use Asset inspection to examine the character, gun models, source arms, grenade, and target model. Try the available character animation clips.
6. Record the three most important findings below. Change one tuning value at a time, repeat the same action, and keep the better result.

Record the browser, selected weapon, and tuning values with each session so we can reproduce feedback. The local server must remain running while we play.

## Priority 1 Make the core gameplay feel right

- [ ] Validate captured mouse input, sensitivity, aiming, and camera behavior.
- [ ] Check movement speed, acceleration, stopping, strafing, and diagonal movement.
- [ ] Tune jump height, airtime, landing, and control while airborne.
- [ ] Check slide entry, duration, speed, cooldown, and transition into a jump.
- [ ] Test cover collision, ramp traversal, crouching, and recovery from getting stuck.
- [ ] Tune firing cadence, recoil, spread, ADS zoom, and weapon switching.
- [ ] Check head and body hits, target feedback, reload timing, and interruption behavior.
- [ ] Compare specific actions with RIVALS and describe the observed difference. Current prototype values are not verified reference values.

**Ready to move on when:** the controls work reliably in a desktop browser, movement and shooting have been tried directly, and the main feel problems have either been fixed or recorded as clear follow-up tasks. An exact Arena layout is not required for this decision.

## Priority 2 Validate the assets we already have

- [ ] Review the character's proportions, scale, materials, idle/run clips, and third-person appearance.
- [ ] Inspect every existing gun for shape, scale, orientation, materials, and screen placement.
- [ ] Check character and weapon alignment together, including camera or wall clipping.
- [ ] Inspect the source arms and determine whether they are suitable for first-person play. They currently have no action animation clips.
- [ ] List the missing grips, poses, animations, and sounds revealed by those checks.
- [ ] Give each inspected asset a decision: keep, adapt, replace, or defer.

**Ready to move on when:** we know which existing assets work and can explain each remaining gap. Search for additional assets only after an observed need has been recorded.

## Priority 3 Complete the offline game

Use the validated prototype to decide the smallest worthwhile playable release. The earlier twelve-item roster is a candidate scope, not a prerequisite for continuing.

- [ ] Confirm the launch equipment and required actions.
- [ ] Adapt usable assets and search for the specific missing resources identified during inspection.
- [ ] Finish the selected grips, reloads, movement poses, effects, and sound feedback.
- [ ] Add an opponent or bot and the agreed round, win, loss, reset, and rematch behavior.
- [ ] Verify settings, loading, errors, and repeated play sessions.

**Ready to move on when:** the chosen offline game loop can be played repeatedly and the required equipment works from start to finish.

## Later milestones

**Arena accuracy:** Once gameplay and asset validation are complete, gather detailed references and refine the single standard Arena recreation. Match its cover, ramps, elevations, spawns, and visual proportions. Practice continues to use the same map.

**Arcade integration:** Add a game selector so both Stillwater and Arcade Duels are easy to find. Check each game's loading, navigation, saved progress, and exit behavior.

**Multiplayer expansion:** Basic private 1v1 is available now. Validate it on two real devices, including hit feedback, movement, reloads, round resets, latency and disconnects. Add broader team modes and networking polish only after the two-player feedback loop works well.

## Playtest notes

Session date:

Browser and device:

Weapon and tuning values:

| Priority | Action or asset tested | What happened | What we want instead | Next change | Retest result |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

Use reproducible descriptions such as “jumping from the left ramp clips into the cover block” instead of “movement feels bad.” For feel differences, describe the action, the direction of the difference, and the setting that might address it.

## Asset decisions

| Asset | Observed issue | Keep adapt replace or defer | Work or resource needed |
| --- | --- | --- | --- |
| Character | To inspect | Undecided | |
| Existing guns | To inspect individually | Undecided | |
| Source arms | No action clips in the collected GLB | Undecided | Validate fit before selecting animation work or a replacement |
| Grenade and target | To inspect | Undecided | |

## Next implementation batch

After the first session, choose a small batch from the findings. Fix issues that block play first, then movement and shooting feel, then asset fit and presentation. Retest the same actions after each batch and update this document with the result.

- [ ] First task:
- [ ] Second task:
- [ ] Third task:

The immediate next action is to play the current build and fill in the first three findings. Further model collection and detailed Arena measurements follow the evidence from that session.

## Related documents

- [Prototype controls and limitations](../../games/duels/README.md)
- [Existing asset collection](asset-scout.md)
- [Proposed game specification](game-spec.md)
- [Technical plan](technical-plan.md)

# RIVALS reference research

Checked November 1, 2026. Evidence labels: **official** = creator/platform description; **community** = independently maintained catalog or guide; **unverified** = requires direct gameplay or current menus. Suggested behavior for our game is in `game-spec.md`, not presented as RIVALS fact.

## Verified core and player journey

The [official Roblox listing](https://www.roblox.com/games/17625359962/RIVALS) identifies Nosniy Games and establishes FPS duels from 1v1 through 5v5, with the first side to five wins. Players can challenge others at duel pads, earn keys for weapons and skins, complete contracts, and build win streaks/leaderboard standing. The page supports desktop, mobile, tablet, Xbox, and PS5. Its indexed English description advertises the Halloween Update 24. This does not establish every rule or current balance value.

Community descriptions add a lobby, practice range, map selection/voting, four loadout slots, queue-based modes, and private matches. The four slots are Primary, Secondary, Melee, Utility; the reported starter loadout is Assault Rifle, Handgun, Fists, Grenade. See [the community weapon catalog](https://www.rivals.wiki/wiki/weapons/). Exact menu order and current unlock prices still need an in-game check.

The reference experience to reproduce at the level of play is: prepare a loadout, select/join a duel, choose an arena, fight short rounds, use movement and weapon swaps to win engagements, see the round/match result, then rematch or return to preparation. Practice and customization support that loop. Cosmetics, progression, social presentation, and rotating modes surround it.

## Combat and movement

Community material consistently describes fast movement, sliding and slide-jumping, recoil/aiming, reloads, melee, projectiles, splash damage, and utility effects. Some equipment changes mobility: Fists/Bow double jumps and Scythe dashes are reported. [A movement guide](https://rivalwiki.com/movement) and [a gameplay tutorial's description](https://www.youtube.com/watch?v=P1vE7eJLoUQ) discuss these actions.

Do not treat community movement exploits, swap-based extra jumps, or old grenade-boost behavior as mandatory launch mechanics. Current limits and timings are unverified. Health, regeneration, damage multipliers, reserve ammunition, collision, timeouts, simultaneous elimination, and exact aim behavior require direct reference observation before an exact replication claim.

## Modes and options inventory

The [community modes page](https://robloxrivals.fandom.com/wiki/Gamemodes) reports standard 1v1–5v5, beginner duels, ranked variants, FFA, Team Deathmatch, Gun Game, and numerous rotating/special modes. It lists Double Trouble, Mirror Matchup, Limitless Loadout, Juggernaut, Swift Standoff, Default Duel, Bunny Sniping, Tag Team, Chicken Game, RIVALS RNG, Head Honcho, Hardcore Parkour, three-team duels, Easy Exploits, Zombie Tower, and Spleef. This is a research inventory, not a verified simultaneous live menu.

| Area | What the player can do according to available evidence | Confidence / missing details |
| --- | --- | --- |
| Duels | Challenge and play in different team sizes; pursue first-to-five wins | Official core; round specifics unverified |
| Loadouts | Select one item per slot; specialize for range/mobility/utility | Community; exact current restrictions unverified |
| Practice | Try weapons at a range | Community; complete current access rules unverified |
| Match flow | Select/vote maps; rematch | Community; tie policy and timing unverified |
| Progression | Earn keys, unlock weapons/skins, complete contracts | Official; exact rewards/prices unverified |
| Competitive/social | Win streaks, leaderboards; ranked and parties reported | Official streak/leaderboards; other systems community |
| Cosmetics | Weapon skins and additional customization reported | Official skins; complete cosmetic catalog unverified |
| Settings | Crosshair, sensitivity, audio, graphics and device controls reported | Full settings menu not inspected |
| Special play | FFA, TDM, weapon-progression and rotating variants | Community; live rotation unverified |

## Weapon research catalog

This is a **working catalog**, not a promise of an exhaustive current arsenal. Public sources disagree on totals and updates. Names below are corroborated by [the broader weapon guide](https://www.aimsector.com/news/roblox-rivals-guide), [the community weapon index](https://robloxrivals.fandom.com/wiki/Weapons), and [the dated review](https://www.rivals.wiki/wiki/weapons/). Exact stats and prices are deliberately excluded.

| Slot | Core/reference examples | Additional reported equipment to verify |
| --- | --- | --- |
| Primary | Assault Rifle, Burst Rifle, Shotgun, Sniper, Bow, Crossbow, RPG | Minigun, Flamethrower, Grenade Launcher, Paintball Gun, Energy Rifle, Gunblade, Distortion, Permafrost; Scepter reported as mode-only |
| Secondary | Handgun, Revolver, Uzi, Shorty, Flare Gun | Slingshot, Exogun, Energy Pistols, Daggers, Spray, Warper; Glass Cannon reported as mode-only |
| Melee | Fists, Knife, Katana, Scythe, Riot Shield | Chainsaw, Battle Axe, Trowel, Maul, Spear; Glass Shard reported as mode-only |
| Utility | Grenade, Flashbang, Smoke Grenade, Medkit, Satchel | Molotov, Freeze Ray, Subspace Tripmine, Jump Pad, War Horn, Warpstone; Elixir, RNG Dice and Grappler require current availability checks |

Roles that matter more than sheer item count: general automatic fire; precision hits; close burst; projectile prediction; area denial; healing; vision denial; melee/mobility; defensive blocking. Our first roster deliberately covers a smaller, testable subset.

## Map research catalog

The [community map index](https://robloxrivals.fandom.com/wiki/Maps) includes Arena, Backrooms, Battleground, Bridge, Chess, Construction, Crossroads, Dimension, Docks, Graveyard, Iceberg, Onyx, Playground, Splash, Station, Village, and Shooting Range. Its navigation also contains Museum, Westown, Studio, Factory, Sandbox, Baseplate, Obby, Spleef, and Boss Arena, plus Big and Legacy variants. Its body counts and navigation are inconsistent; do not quote a precise live total.

[A dated map review](https://www.rivals.wiki/wiki/maps/) describes Arena as readable duel cover; Bridge as constrained hazardous positioning; Crossroads as open multi-route movement; Docks as longer angles with water; Onyx as vertical lava hazards; and Station as mixed indoor/long-angle play. These are useful design categories, not surveyed dimensions or permission to reuse map geometry.

The user has selected **one faithful recreation of standard Arena**, replacing the three proposed original layouts. Big Arena and every other map are outside launch scope. Practice reuses Arena rather than introducing another environment.

The [Arena page](https://robloxrivals.fandom.com/wiki/Arena) describes a grid-based space with angled cover. The map index describes mirrored, opposing spawns and ramps on both sides, without special features such as explosive barrels or breakable windows. These are community descriptions, not a measured blueprint. Exact footprint, block count, positions, ramp slopes, heights, spawn offsets, grid scale and materials remain unverified. Obtain clear overhead and ground-level reference views, record the reference version, and derive a dimensioned layout during the later map-fidelity phase. Rebuild geometry locally; no proprietary model extraction is required.

## Research gaps and a concrete fidelity audit

No Roblox application was launched in this pass. Public pages do not establish exact current behavior. Before calling any behavior an exact match, record the game version/date and inspect:

1. Lobby and every menu: play choices, party/private-room controls, loadout, inventory, contracts, shop, settings, practice access.
2. One complete 1v1 and 2v2: ready state, map vote, loadout lock, health, countdown, round end, timeout/tie, match end, rematch and leaving.
3. Starter weapons and each planned counterpart: magazine/reserve, firing cadence, spread/recoil, ADS, reload interruption, head/body damage, range, equip delay and mobility.
4. Movement: walk/sprint/crouch, slide duration/cooldown, slope behavior, jump height, air control, equipment bonuses and explosive boosts.
5. Map routes and sightlines: entrances, height changes, hazards, spawn safety, cover dimensions and likely encounter times.
6. Accessibility/device options and exact progression/cosmetic rules.

Deliverable from that audit: dated observations with measured values and confidence, and a decision for each difference: reproduce, intentionally change, or defer. Do not scrape or extract proprietary game models, code, UI, or audio. Our asset collection uses separately licensed resources.

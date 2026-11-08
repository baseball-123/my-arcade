# Free asset scout and collected resources

Checked November 1, 2026. Costs below refer to the selected free downloads, not every product offered by a provider. Archives are research inputs, not deployed game payloads. No extracted Roblox assets are included.

## Collected now

Eight valid ZIP archives total **27,944,012 bytes (~26.65 MiB)**. All have been extracted successfully. The archive SHA-256 hashes and a structural audit of 241 GLBs are in [inventory.json](../../research/assets/inventory.json); rerun `python research/assets/audit_assets.py` after changing the collection.

| Pack and source | License evidence | Collected contents and intended use | Readiness |
| --- | --- | --- | --- |
| [Ultimate Guns — Quaternius](https://quaternius.com/packs/ultimategun.html), downloaded from [the creator's OpenGameArt upload](https://opengameart.org/content/low-poly-guns-pack) | Both creator pages identify CC0; archive contains no separate license file found in this pass | 40 firearm OBJ models plus accessory objects; FBX and Blender equivalents; preferred gun silhouettes | Downloaded/extracted; preview inspected; requires GLB conversion, pivots, grips and animation |
| [Blaster Kit 2.1 — Kenney](https://kenney.nl/assets/blaster-kit) | Included `License.txt`: CC0 | 40 GLBs, targets, grenades, smoke, clips, crates and stylized blasters | Structurally audited; preview inspected; use targets/throwables/crates, keep blasters as cohesive alternative theme |
| [Blocky Characters — Kenney](https://kenney.nl/assets/blocky-characters) | Included CC0 license | 18 GLB files in downloaded pack; low-poly characters with clips | Preferred third-person base; preview inspected; adapt team colors and missing combat poses |
| [Prototype Kit — Kenney](https://kenney.nl/assets/prototype-kit) | Included CC0 license | 145 GLBs: floors, walls, ramps, stairs, doors, indicators, props | Preferred architectural kit; preview inspected; hand-author map layout and collision |
| [City Kit Industrial 2.0 — Kenney](https://kenney.nl/assets/city-kit-industrial) | Included CC0 license | 37 GLBs in downloaded pack: buildings, containers and industrial dressing | Preview inspected; exterior dressing; building interiors not presumed playable |
| [WRAD Arms — wwwriks](https://github.com/wwwriks/wrad-arms) | Included CC0-1.0 `LICENSE` | Rigged `arms.glb`, source formats, two textures | 1 skin, 1,196 mesh triangles, **zero animation clips**; usable now for inspection; recoloring/animation polish follows validation |
| [Impact Sounds — Kenney](https://kenney.nl/assets/impact-sounds) | Included CC0 license | 130 OGG files for material/foley candidates | Extracted; listening/selection/loudness work pending |
| [Sci-fi Sounds — Kenney](https://kenney.nl/assets/sci-fi-sounds) | Included CC0 license | 73 OGG files for UI, feedback and possible weapon layers | Extracted; listening/selection pending; not a promise of convincing firearm recordings |

Kenney page file counts are not always the number of GLBs in the current archive. The table distinguishes the inspected counts from marketing counts. Likewise, Quaternius's archive has 55 OBJ files when accessories are included, while the advertised gun count is 40.

## What inspection actually established

- All 241 inspected GLBs have valid version-2 headers and parseable JSON chunks with expected file lengths.
- 240 reference external resources, primarily textures. **All referenced files exist in the extracted collection.** Copying a GLB alone will break most Kenney materials; preserve relative paths or embed images in a later conversion step.
- 46 GLBs contain animation clips across the collection; that does not mean 46 complete FPS rigs. No scene was loaded into Three.js in this planning pass.
- `character-a.glb` has object animation rather than a skinned humanoid (`skins: 0`). Its clips include idle, walk, sprint, die, holding/shooting poses and melee attacks. It is **not** drop-in compatible with skeletal retargeting libraries.
- `arms.glb` is skinned but has no clips. Rigged does not mean animated. The main remaining art effort is a coherent first-person action set and grips matching the selected weapons.
- Mesh triangle counts in the JSON are sums of primitive triangle data, not a complete rendered-scene draw cost: repeated nodes, transparency, materials and skinning require runtime measurement.
- Pack preview sheets were visually inspected for weapons, block characters, prototype geometry and industrial dressing. They support the proposed low-poly direction; they do not verify textures/animation in the eventual renderer.

## Exact source-to-roster mapping

Paths below are relative to `research/assets/extracted/`. These are selected preparation inputs, not already approved runtime exports. Quaternius base path: `ultimate_gun_pack_by_quaternius/Ultimate Gun Pack - July 2019/OBJ/`.

| Runtime need | Selected source input | Remaining work |
| --- | --- | --- |
| Assault Rifle | `AssaultRifle2_1.obj` and matching MTL | Confirm silhouette against preview/source; normalize and export GLB; moving magazine/reload |
| Burst Rifle | `AssaultRifle_1.obj` and MTL | Distinguish visually from AR; same conversion/grip requirements |
| Shotgun | `Shotgun_1.obj` and MTL | Pump/reload action; verify geometry can separate moving parts |
| Sniper | `SniperRifle_1.obj` and MTL | Scope/muzzle anchors, bolt/reload animation |
| Handgun | `Pistol_1.obj` and MTL | Slide and magazine pivots; reload |
| Revolver | `Revolver_1.obj` and MTL | Cylinder/reload; may require source mesh separation |
| Uzi-role SMG | `SubmachineGun_1.obj` and MTL | Generic compact automatic silhouette; magazine/reload |
| Fists | `wrad-arms/wrad-arms-main/arms.glb` | Two punch poses, idle, equip, movement; color/material conformity |
| Knife | No final model selected | Find a coherent CC0 knife or author a simple original stylized mesh before content freeze |
| Grenade | `blaster-kit/Models/GLB format/grenade-a.glb` | Grip/release anchor and throw animation; generic appearance |
| Smoke canister | `blaster-kit/Models/GLB format/grenade-b.glb` | Recolor/label distinctly; throw action and authored smoke effect |
| Medkit | No final model selected | Find CC0 medical pouch or author original simple pouch; use a neutral health symbol; heal animation |
| Targets | `blaster-kit/Models/GLB format/target-large.glb` and `target-small.glb` | Mounts, moving rail path, separate damage logic |
| Base character | `blocky-characters/Models/GLB format/character-a.glb` | Confirm style; recolor outfit by team; add crouch/slide/jump/throw/heal poses and weapon attachments |
| Architecture | `prototype-kit/Models/GLB format/` | Floors/walls/stairs/ramps; choose subset; scale and collision audit |
| Arena geometry | Locally authored simple block/ramp meshes from the verified Arena layout; Prototype Kit only where its shapes match | Preserve reference cover geometry and proportions; no industrial dressing or containers added |

This selection makes the conversion work concrete without pretending an OBJ filename alone guarantees a correct grip, animated magazine, or suitable viewmodel.

## Broader scout and fallback options

| Provider / asset | Assessment | Decision |
| --- | --- | --- |
| [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) | Creator advertises humanoid rigs, glTF/FBX, CC0 and paid/free tiers; more organic proportions than the chosen blocks | Alternative only; inspect exact free download and its license if selected |
| [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | Advertises locomotion/combat and free/expanded tiers | Useful for a compatible skeletal character; does not directly retarget onto Kenney object animation; not collected |
| [PSX FPS Arms Free](https://heyheythere.itch.io/psx-fps-arms-free) | Creator advertises 27 sample animations, GLB/FBX/OBJ and CC BY 4.0 | Alternative if animation quality outweighs the PSX style mismatch; credit required; exact free files uninspected |
| [KayKit catalog](https://kaylousberg.itch.io/) | Strong coherent stylized packs, individual free/paid offerings | Consider props only after checking the exact free tier; the Complete KayKit bundle is paid and is not counted as a free resource |
| [Poly Haven](https://polyhaven.com/license) | Officially CC0 models, textures and HDRIs | Optional restrained concrete/metal/sky resources; avoid importing photorealistic detail into otherwise flat art |
| [ambientCG](https://ambientcg.com/) | Officially CC0 PBR surfaces/HDRIs/models | Material fallback; 1K or smaller selected textures, not full-resolution downloads |
| [Poly Pizza](https://poly.pizza/) | Broad low-poly model discovery | Per-model author/license checking needed; no site-wide license assumption |
| [Quaternius Ultimate RPG Items](https://poly.pizza/bundle/Ultimate-RPG-Items-Bundle-h8mhlZ0dG8) / [creator pack](https://quaternius.com/packs/ultimaterpg.html) | CC0 knife/dagger candidates; compatible low-poly author style | Shortlist for the knife gap; exact model not downloaded or inspected |
| [Medical Stuff — FacadeGaikan](https://opengameart.org/content/medical-stuff) | Creator upload identifies CC0 and a low-poly medical box with small textures | Shortlist for the medkit gap; adaptation/texture restyle required; not collected |
| Sketchfab / Fab / general marketplaces | Potential single-model gap fillers | Not selected; a free listing alone does not establish redistribution rights or style/rig compatibility |

Prefer creator-owned coherent packs over a patchwork of visually incompatible individual models. Do not spend time collecting every free model available: every launch requirement needs a chosen source or explicit original-art task.

## Resource backlog, after playable validation

- [x] Collect valid archives for the primary characters, environment, weapons, arms and audio candidates.
- [x] Preserve existing license files, source links, archive hashes and filenames.
- [x] Inspect GLB structure, clip names, resource references and pack preview sheets.
- [ ] Finalize knife and medkit source models or original asset briefs.
- [ ] Confirm seven selected gun shapes by opening the exact source objects; convert only those to meter-scale GLBs.
- [ ] Make a grip/attachment/animation sheet per item. Produce missing first-person action animations or deliberately select a licensed animated fallback set.
- [ ] Confirm third-person crouch/slide/jump and item poses with the object-animated character.
- [ ] Audition sounds; choose distinct fire/reload/footstep/impact/utility/UI clips, fill sound gaps, and normalize loudness.
- [ ] Verify materials, pivots, front direction, scale, texture dependencies and animation events in an asset viewer; this is asset preparation, not gameplay implementation.
- [ ] Produce a runtime content manifest with source, author, license, runtime path, hash, triangles, materials, texture size, attachments, clips and bounds for every selected file.
- [ ] Freeze the initial roster/maps and resolve fidelity observations in `reference-research.md` to the level required for the intended similarity.

The user has explicitly replaced the earlier pre-implementation gate with playable validation first. Use the existing assets in a rough playable prototype now; discover actual gaps by inspecting them in-engine. Missing knife/medkit models and complete animation coverage do not block the prototype. Keep incomplete actions visibly labeled. Accurate Arena geometry and further asset searches follow core movement/shooting and asset validation. Retain industrial downloads as unused research resources.

## Storage and provenance

Original archives live in `research/assets/archives/`, extracted files in `research/assets/extracted/`, and initial Kenney webpage responses in `research/assets/evidence/` with `.html` extensions. Initial stale indexed ZIP URLs returned HTML; those responses were not counted as archives. Successful downloads used Kenney's normal current download flow with its page session/referrer.

Retain upstream licenses unchanged. For Quaternius, the creator upload and pack page are the license provenance because no embedded license was found; preserve those URLs in the eventual credits/manifest. Optional credits are still recommended for all creators. Downloaded CC0 source assets may be used under the identified license; do not generalize that finding to unrelated paid tiers, community reuploads, or future pack revisions.

Do not ship archives, Blender files, unused OBJ/FBX variants, or every texture variation. Runtime packaging will contain only the curated optimized subset. No commit or upload of the research library has been performed.

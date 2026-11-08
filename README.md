# my-arcade
my arcade website

## Arcade Duels gameplay prototype

Play online: [Arcade Duels](https://baseball-123.github.io/my-arcade/games/duels/). Create a room and share its invite link with a friend. Keep the host tab open while playing. [Stillwater fishing](https://baseball-123.github.io/my-arcade/) remains at the main page.

The new shooter validation lab is at `games/duels/`. From this repository folder, run `python -m http.server 8081 --bind 127.0.0.1`, then open [the gameplay lab](http://127.0.0.1:8081/games/duels/). It includes existing asset inspection and tunable shooting, movement, sliding and jumping in a rough Arena-like map. See [prototype controls and limitations](games/duels/README.md). Stillwater remains at the main page.

The shooter now has two-player PeerJS rooms. Create a room, share the code, and have your friend join the same game version. Both enter the playtest for first-to-five duels. Internet friends need a hosted game URL; a localhost invite only works on your own computer. See [shooter multiplayer instructions](games/duels/README.md#multiplayer-with-a-friend).

Open `index.html` to play Stillwater. All controls and menus are inside the game viewport.

- Arrow keys or WASD steer the boat or move the character, depending on the control mode.
- Space jumps and switches to the character camera. F casts, hooks, and reels.
- Swim enters the ocean; Board boat returns to the deck.
- Cook fish carries a raw catch to the fire and puts the cooked fish in the bucket.
- Enter or Eat consumes one cooked fish from the bucket.
- Shop, Collection, and Settings / Help pause the game, including competition timers. Escape resumes.
- Drag the ocean view to orbit the camera; scroll to zoom.
- Peaceful background music starts after your first click or keypress. Music toggles it on/off and remembers your preference.

Coins, upgrades, and the catch collection save in the browser. Raw and cooked food last for the current play session.

## Online multiplayer with PeerJS

Host these static files on an HTTPS website, such as GitHub Pages. Open Multiplayer, enter your name, and press Create room. Share the room code or Copy invite link with friends, who press Join room on the same game. Rooms support up to eight players, each sailing their own boat. Movement, jumping, swimming, and catch counts are synchronized.

The host must keep their game open. If the host leaves, friends return to solo play. Menus pause only your own boat and competition timer. Players keep their own coins, food, and upgrades.

The game loads PeerJS 1.5.5 from jsDelivr only when creating or joining a room. PeerJS Cloud handles signaling; the host distributes game snapshots over WebRTC data connections. No custom multiplayer application server is required.

Some networks require a TURN relay. To configure one, set `window.STILLWATER_PEER_OPTIONS` before `multiplayer.js` loads, using PeerJS's `config.iceServers` option. See the [PeerJS options](https://peerjs.com/client/api/peer) and [connection FAQ](https://peerjs.com/client/faq). Do not commit private relay credentials.

## Checks

Run `node --test` with Node.js 20 or later. Multiplayer tests simulate PeerJS data channels to cover room creation, joining, synchronization, capacity, invalid updates, and disconnects. Live connectivity still depends on the players' browsers and networks.

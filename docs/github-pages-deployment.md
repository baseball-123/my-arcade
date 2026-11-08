# GitHub Pages deployment

The arcade is hosted at https://baseball-123.github.io/my-arcade/ using the repository's existing Pages build and deployment process from `main`.

- Stillwater fishing: https://baseball-123.github.io/my-arcade/
- Arcade Duels multiplayer: https://baseball-123.github.io/my-arcade/games/duels/

Push the runtime game files and assets to `main`. The existing GitHub Pages build publishes them; `.nojekyll` keeps the site as plain static files. The deployment does not require Vercel or a local server for players.

Both players should open the hosted shooter URL. One creates a room and shares the invite link or room code. The friend joins, and both press Enter playtest. Keep the host tab open and active. The room uses PeerJS signaling and WebRTC connections as described in the shooter guide. Restrictive networks may still require TURN configuration.

The large research source archives, extracted alternatives, generated screenshots, local environment files and `dist/` are ignored by Git. Selected models and the required libraries/licenses are committed under `games/duels/assets/` and `games/duels/vendor/`.

Before pushing runtime changes, run `node --test`. `node scripts/build-static.mjs` additionally checks the separately prepared static deployment build; the current Pages source publishes directly from the repository rather than that ignored output folder.

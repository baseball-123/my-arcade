# Vercel deployment

The arcade is a static site. `vercel.json` selects the Other framework preset, skips dependency installation, runs `node scripts/build-static.mjs`, and publishes `dist/`.

The build contains Stillwater at `/` and the shooter at `/games/duels/`. Share the full hosted shooter URL with friends. PeerJS signaling and WebRTC remain separate from Vercel's static hosting; no gameplay backend is required on Vercel for the current host-player architecture.

The build copies an explicit set of runtime files, selected model assets, bundled Three.js/PeerJS, license files, and the shooter guide. It excludes research packs, test code, planning documents, screenshots, and local configuration. `.vercelignore` also excludes research, tests, Git state and environment files from deployment uploads.

## Validation

Run `node scripts/build-static.mjs` and `node --test`. Preview the output using `python -m http.server 8082 --bind 127.0.0.1 --directory dist`. Verify both games and a two-player shooter room from the resulting site.

## Deployment status

The local deployment bundle builds successfully and all 16 tests pass. Publishing has not occurred yet because no connected Vercel account or authenticated Vercel CLI was available during preparation. No public deployment URL has been created or verified.

After connecting Vercel, deploy this prepared project to production, record the returned URL here, and verify the hosted shooter assets and room create/join flow. A localhost room invite should be replaced with the production URL after deployment.

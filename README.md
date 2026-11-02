# Wheel of Audiences

An interactive audience generator for use in Dr. Blessinger’s classes.

## Hosting migration

The GitHub Pages frontend and Cloudflare backend are prepared and tested locally. Publication is pending Cloudflare account authorization. The existing Netlify site is unchanged until the replacement is verified.

Planned page address: https://justible.github.io/wheel-of-audiences/

## Use in class

Create a live class room and choose an instructor password of at least eight characters. Share the room’s link or the QR code at the top of the page. Students choose at least the required number of components, enter a name or initials, join the shared queue, and spin when their turn arrives. Projector view enlarges the selected wheels.

Students can search the session log and reopen or copy their original assigned profile. Saved profiles keep their original values when the instructor changes wheel options. Only the complete selected combination plus listening context locks, for two calendar months. Individual component values remain available.

Use **Edit wheel options** to change the required minimum, add fandoms, and add or remove wheels. These changes require the instructor password and do not require redeployment. Unlocking, undoing a draw, and clearing the queue also require instructor access. Manual unlocking keeps the session log.

Customers are assumed to live in the US and prefer English. Assignment instructions are maintained separately from this website.

## Architecture

- `dist/index.html`: self-contained HTML, styling, wheel animation, QR encoder, browser-local mode, and shared-room client. GitHub Pages serves only `dist/`.
- `cloudflare/worker.mjs`: CORS-checked API and a SQLite-backed Durable Object. Operations are serialized to prevent duplicate turns and combination claims. Instructor passwords use scrypt; room links do not contain passwords.
- `server/`: portable classroom handler, component configuration and validation, and a legacy profile catalog retained for existing assignments.
- `cloudflare/live-client.js`: hibernating WebSocket notifications. Hidden tabs disconnect; visible disconnected tabs retry with backoff and refresh at most every 30 seconds. An active connection refreshes only after a change, rather than polling every three seconds.
- `.github/workflows/pages.yml`: manually triggered publication. Source updates do not automatically publish the page.
- `wrangler.jsonc`: free-tier-compatible SQLite Durable Object configuration. No paid-plan upgrade is required. Cloudflare’s free tier has quotas; service pauses if a limit is exceeded.

All connected users with a class room link can see its queue and assignments. Initials are sufficient. Instructor-only operations are checked on the backend. Browser state and saved class data must never be committed to this public repository.

## Development and publication

Install dependencies with `npm ci`. Run `npm test` for classroom, configuration and session-log checks. Run `npm run dev:api` to start the local backend.

Develop and test locally. Publish only when Dr. Blessinger explicitly requests publication. To release the API, use `npm run deploy:api`. Configure the verified backend URL in the frontend before triggering **Publish GitHub Pages** in GitHub Actions. The deployment workflow rejects the pending placeholder endpoint.

Private migration backups remain outside the repository. The temporary migration API requires a deployment-only secret and must be disabled by deleting that secret after verification. Existing room IDs, options, password hashes, owner hashes, locks, and assignment snapshots are imported unchanged. Old links should be handed off only after the new site and backend are verified.

## Third-party software

The bundled QR encoder is MIT licensed. See `THIRD-PARTY-LICENSES.txt`. No external fonts or QR service are used.

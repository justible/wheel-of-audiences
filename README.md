# Wheel of Audiences

An interactive audience generator for use in Dr. Blessinger’s classes.

## Hosting migration

The GitHub Pages frontend and free-tier Cloudflare backend are published and verified. All 33 stored records across eight class rooms, including six saved assignments, were copied exactly and the eight class snapshots were verified. Temporary migration access has been removed. The old Netlify address now forwards to GitHub Pages, transferring this app’s browser settings and queue ownership through a fragment that is removed immediately. The old backend has been retired; its original stored data remains as a safety copy. A browser handoff verified that the existing customized 11-wheel template was preserved.

Live page: https://justible.github.io/wheel-of-audiences/

## Use in class

Create a live class room and choose an instructor password of at least eight characters. Share the room’s link or the QR code at the top of the page. Students must select at least the required number of categories before joining the queue. They then enter a name or initials in the single name field and select **Add to queue**. The minimum is enforced by both the interface and the backend, including instructor-entered names. A queued student's choices update the shared queue automatically. Instructors can type names in the same field and add students from the classroom screen. Projector view enlarges the selected wheels.

Students can search the session log and reopen or copy their original assigned profile. Saved profiles keep their original values when the instructor changes wheel options. The complete combination of selected components locks for two calendar months; individual component values remain available. New profiles have no additional listening-setting assignment or menu. Historical profiles retain their original saved information and continue to prevent repeats of their selected component combinations.

Use **Edit wheel options** to change the required minimum, add fandoms, and add or remove wheels. These changes require the instructor password and do not require redeployment. Unlocking, undoing a draw, and clearing the queue also require instructor access. Manual unlocking keeps the session log.

Customers are assumed to live in the US and prefer English. Assignment instructions are maintained separately from this website.

The default catalog contains 14 wheels. Gender identity is removed from current options and older saved templates; the required minimum is adjusted if necessary. Existing assigned profiles keep their original values.

The Spin button explains missing selections instead of showing an unavailable action. A queued student must have the required number of components selected before the button changes to **Spin for [name]**.

All components are selected by default. Students can uncheck unwanted components; Select all components restores the full selection. Deselections are remembered for the same class session on that browser. Phones show a direct start or queue-entry button instead of a QR scan; desktop and projector views retain the QR code.

Instructors can open the session draw log and select **Delete** beside any generated profile. In a shared room, sign in as instructor first; students do not see Delete controls and cannot call the deletion action. Deleting a draw releases its active combination without changing other draws or adding that student back to the queue. Independent mode requires the local instructor password.

Instructor access is remembered for 60 minutes after entering the password in the same browser tab, including page refreshes. Editing options and routine management actions reuse that access. Use Lock instructor access to end it immediately. Shared-room permissions continue to be checked by the backend; the password itself is not saved.

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

Develop and test locally, then publish requested changes to GitHub Pages and Cloudflare without a separate confirmation. Dr. Blessinger authorized this ongoing workflow on November 2, 2026. To release the API, use `npm run deploy:api`. Configure the verified backend URL in the frontend before triggering **Publish GitHub Pages** in GitHub Actions. The deployment workflow rejects the pending placeholder endpoint. The retired Netlify redirect is not part of routine releases.

Private migration backups remain outside the repository. The temporary migration API requires a deployment-only secret and must be disabled by deleting that secret after verification. Existing room IDs, options, password hashes, owner hashes, locks, and assignment snapshots are imported unchanged. Old links should be handed off only after the new site and backend are verified.

## Third-party software

The bundled QR encoder is MIT licensed. See `THIRD-PARTY-LICENSES.txt`. No external fonts or QR service are used.

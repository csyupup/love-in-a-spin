# Love in a Spin Implementation Plan

> Execute inline in this session using executing-plans. The user has approved the design and explicitly requested implementation; no additional approval checkpoint is needed.

**Goal:** Deliver a working cream scrapbook couple's wheel, a private GitHub repository and a local preview.

**Architecture:** Native browser modules and a same-origin Node HTTP API backed by SQLite. Unpredictable room tokens act as share-link credentials. Draws are selected server-side with equal probability and displayed using an immutable item snapshot.

**Tech Stack:** Node.js 22.13+, node:sqlite, node:crypto, node:test, HTML, CSS, SVG.

### Task 1: Domain and persistence
- [x] Write tests in `tests/domain.test.mjs` and `tests/store.test.mjs` for random index reachability, wheel angle alignment, validation, persistent CRUD, room isolation, revision conflicts and draw snapshots.
- [x] Run `npm test` and verify missing modules fail before implementing.
- [x] Implement `public/wheel.js`, `src/domain.mjs`, `src/store.mjs`; use `randomInt(count)` and SQLite parameter binding.
- [x] Run `npm test`; require all assertions pass.

### Task 2: API and interface
- [x] Write HTTP integration tests in `tests/server.test.mjs` for CRUD, authenticated room reads, malformed input, unknown room protection and draw idempotency.
- [x] Run the integration tests and verify the absent API fails.
- [x] Implement `src/server.mjs`: known static assets only, JSON limits, same-origin writes, no-store API, typed HTTP failures.
- [x] Implement `public/index.html`, `public/style.css`, `public/app.js`: accessible checklist, dialogs, category/search controls, fair animated wheel, result celebration, redemption history, share-link copying and polling.
- [x] Run `npm test` and `npm run check`.

### Task 3: Deliver
- [x] Start `npm start` in a retained terminal session; verify HTTP 200.
- [x] Use browser QA at desktop and mobile sizes: edit, select, spin, redemption, reload and second-client sharing.
- [x] Add `README.md`, Dockerfile, CI tests and deployment/persistence instructions. Exclude runtime data and screenshots from source.
- [x] Commit verified source, create private `csyupup/love-in-a-spin`, push and verify remote commit. Open the local preview and report its local-only reachability.

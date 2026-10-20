# Preview validation — 2026-10-20

## Automated
- Eight node:test cases pass on local Node 22.23.1 and Node 24.16.0.
- Equal index reachability and deterministic sector-center alignment for all N=1..32 and all winning indices.
- Validation, SQLite reopen persistence, isolated rooms, optimistic concurrency, selected-only draws, request deduplication and immutable result snapshots.
- HTTP authentication, CRUD, request limits, malformed JSON, cross-origin rejection and private source paths.
- Regression: a Chinese character split across request chunks remains intact.
- Regression: an outdated poll cannot replace a newer state, and active spin/form locks suppress incoming redraws.
- JavaScript syntax checks pass. No third-party dependency installation needed.

## Browser
- Desktop layout and 390×844 mobile layout; mobile document width is exactly 390px, no horizontal overflow.
- Add a custom wish with emoji/note, edit its title, reload and retain it.
- Clear all: empty wheel and disabled spin; select one: explicit 100% probability and matching result.
- Category filtering and per-filter select-all preserve choices outside the filter.
- Multiple selected items: shown probability changes with count; spin locks controls and opens a matching prize dialog. Closing the result preserves history.
- Redemption status persists. Another tab opened with the same room URL reads the same list and history and can edit selections.
- No browser console errors observed.
- Screenshots are local ignored artifacts; no room token or runtime data is committed.

## Review
Independent read-only review found UTF-8 chunk decoding and delayed polling issues. Both were reproduced, fixed and covered by regression tests. Follow-up review found no remaining important issues.

## Delivery limits
Local preview only, not internet-hosted. Remote phone sharing requires a Node server with durable storage and HTTPS. Docker configuration is provided but was not executed locally. Node 22 emits its standard experimental SQLite warning. No third-party font or image downloads are required.

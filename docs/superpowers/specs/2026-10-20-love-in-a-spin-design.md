# Love in a Spin

Approved direction: cream scrapbook style, strawberry pink and peach accents, a mobile-first couple's surprise wheel. Independent repository under csyupup.

## Product
- A shared list of likes, rewards and gifts. Both people can add, edit, delete and select items using the same secret room link.
- Selection immediately updates equal-sized wheel sectors. All selected items have probability 1/N, regardless of category. No weights and no duplicated slots.
- Server chooses the result using crypto.randomInt; animation lands on that exact result. A revision check prevents stale selection from drawing. Each draw stores an immutable prize snapshot.
- Lock local controls while drawing; other clients poll for saved updates. Empty selection disables drawing. One item is allowed, with an explicit 100% probability.
- History records time, result and redemption status. Winners remain selected for independent repeat draws.
- Forms validate title (1–24 Unicode code points), note (0–80), emoji (0–8 code points), categories and at most 32 items.

## Layout
Slim brand navigation with shared-list button; editorial heading and ticket-shaped note; large wheel on the left and checklist with category tabs on the right. A recent surprises strip below. Mobile stacks wheel, list, history. Native dialogs with keyboard focus, reduced-motion support and touch-friendly controls.

## Architecture and limits
Dependency-free native HTML/CSS/ES modules, Node.js 22.13+ HTTP API and SQLite persistent data. Local server first for the requested preview. An internet deployment with a persistent volume is required for remote phones; GitHub Pages alone cannot serve this backend. Preview data lives on the developer machine, not in GitHub. A 256-bit bearer token in the URL fragment grants access to a room, so only share the link with the intended person. Database stores only the hash of that token. No login or payments.

## Validation
Test equal-probability index mapping, wheel final-angle alignment for every sector, selection edge cases, input validation, revision conflicts, shared-room isolation, CRUD, durable persistence and immutable history. Exercise mobile/desktop rendering and complete draw flow in browser.

## References
https://github.com/CrazyTim/spin-wheel — reference for separating winner selection and easing to a known result; no source code copied.
https://github.com/buuing/lucky-canvas — reference for configurable prizes and presentation; no source code copied.
https://nodejs.org/api/sqlite.html
https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback

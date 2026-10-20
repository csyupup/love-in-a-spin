# Preview validation — 2026-10-20

## Automated
- Fifteen node:test cases pass locally.
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
- Multiple selected items: shown probability changes with count; spin locks controls and displays the matching prize beneath the wheel, without a popup. History is preserved.
- Redemption status persists. Another tab opened with the same room URL reads the same list and history and can edit selections.
- No browser console errors observed.
- Screenshots are local ignored artifacts; no room token or runtime data is committed.

## Review
Independent read-only review found UTF-8 chunk decoding and delayed polling issues. Both were reproduced, fixed and covered by regression tests. Follow-up review found no remaining important issues.

## Delivery limits
Local preview only, not internet-hosted. Remote phone sharing requires a Node server with durable storage and HTTPS. Docker configuration is provided but was not executed locally. Node 22 emits its standard experimental SQLite warning. No third-party font or image downloads are required.

## Preview refinements
- Browser tab title is 我们的惊喜小铺; the share button and share dialog are removed.
- Collection heading is 小心愿. The four approved categories are 吃喝快乐 / 约会时光 / 专属宠爱 / 心意礼物.
- Wheel pointer has no rotation animation; only the wheel rotates.
- Spin button has no trailing arrow. Draw results appear inline, with no confirmation popup.

## Four-category examples
- Twenty editable examples, five per category, for new rooms. Existing rooms receive missing examples once, preserving custom text, IDs, selections and history.
- New migration examples start unselected; deleted examples do not return on reload.
- Current preview has 21 items including the pre-existing custom wish; filtering verified at 5 / 6 / 5 / 5.
- Add/edit forms expose all four categories. Four filter tabs remain after removing 全部心愿; 吃喝快乐 is selected by default.

## Prize icons
- Forty-eight picker options, including a local red-and-gold McDonalds vector icon. The same asset is supported in wishes, wheel SVG, inline results and draw history.
- Branded icon persistence and result snapshots tested; local asset response and text escaping verified. Browser picker loaded and selected the McDonalds image successfully.

## Three-category merge
- 心意礼物 is removed. Its wishes merge into food, whose label becomes 吃喝玩乐. Dates and care remain separate.
- Catalog version 3 migrates existing rooms without reseeding or altering IDs, titles, notes, icons, selection flags or historical snapshots. Migration runs once.
- Verified the live room against its pre-migration backup: all items are present and identical except gift category mappings; history is unchanged.

## Modal scrolling fix
- Reproduced the original issue: scrolling the dialog moved the close button off screen; background body overflow was visible.
- Add/edit dialog now has a fixed header and footer, with only .modal-scroll scrolling. Warm thin scrollbar styling and overscroll containment apply.
- All dialogs lock the background by fixing the body at its saved offset, compensate for the page scrollbar, and restore position/styles on close, cancel/Escape and successful saves.
- Desktop browser: internal scroll 206.5px, outer dialog scroll 0px, close-button offset unchanged (21px); scrolling the backdrop leaves the background header and saved offset unchanged. Escape restores page position to 75px.
- Mobile at 390×844: internal scroll 195px, outer scroll 0px, close offset unchanged (17px), save footer position unchanged; background body remains fixed.
- Added two regression cases for scroll locking, style restoration, scrollbar compensation and repeated opens/closes.

## 2026-10-20 静态版发布准备

用户选择取消线上后端，使用浏览器本机存储。

- 从当前清单导出 28 份已调整的心愿，初始全部未勾选、历史为空；旧 SQLite 和备份仍排除在 Git 及发布目录之外。
- `npm start` 改为纯静态服务，Pages 工作流仅上传 `dist/`；构建校验初始勾选和历史为空，所有资源适配 `/love-in-a-spin/` 子路径。
- Chromium 实测构建目录：加载 28 项、麦当劳图标、勾选、独立抽奖、内联结果、历史、刷新持久化、新增测试心愿、刷新后删除测试心愿均正常，没有控制台错误。
- 两个同源标签页实测：一个页面打开新增弹窗期间，另一个页面勾选奶茶；关闭弹窗后读取最新勾选。Web Locks 串行写入，版本保护拒绝过期修改；不支持安全锁的旧浏览器给出升级提示。
- 新静态首页预览 `http://localhost:4173/` 已确认 28 项、0 勾选、空历史；测试使用独立的 `localhost:4174`，未污染初始发布文件。
- `npm test` 共 23 项通过；Node 22.23.1 与 Node 24 均通过，语法检查与构建通过。
- GitHub 仓库当前为私有；启用 Pages 的 API 返回套餐不支持该私有仓库。发布仍需处理仓库可见性，未把静态版已准备好描述为已上线。

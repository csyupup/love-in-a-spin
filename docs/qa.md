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


## 2026-10-28 美妆心愿与七类图标

- 新增一套化妆品、粉底、修容、提亮、眼影、眼线笔、睫毛刷，归吃喝玩乐。初始清单由 28 项增至 35 项，新项不默认勾选。
- 旧本机数据一次性按 ID/名称补齐，保留已有编辑、勾选和历史，用户之后删除的项不会重复出现。迁移保存失败仍显示原清单，重试可继续。
- 选择器包含笑脸/动物/食物/活动/旅行/物体/符号七个 tab，共 348 个图标，保留麦当劳 SVG。切换类别不改变已选图标，编辑自动定位到对应类别。
- Chromium 实测：分类切换、方向键、选中图标跨分类保留、新增保存、刷新仍保留、编辑自动定位、删除临时测试项均正常。临时数据使用 localhost:4174，最终仍为 35 项，无控制台错误。
- 按用户追加意见将分类条总高度由 44px 调为 36px，保留字号和左右间距。
- 390×844 与 320×740 检查固定弹窗及横向分类条；320px 下条宽 248px、内容宽 318px，可独立横向滚动，弹窗内容无水平溢出。已恢复默认视口。
- 原 32 项容量同步扩为 64 项；均匀采样及指针定位覆盖 1–64 项。自动测试共 28 项。


## 2026-10-28 小心愿展示排序

- 用户确认按整轮参与项更新最近使用顺序，不只中奖项。新增项排前；转盘结束后所有参与项整体前移，轮内原相对顺序不变。
- 最近活动序号保存在本机，编辑保留排序，幂等重试不重复更新。只对展示副本排序，内部转盘数组和抽奖快照不变。
- 本地构建预览实测新增“排序测试甲/乙”依次到顶部；勾选不跳位；转盘后 KFC、麦当劳、一杯奶茶三个参与项排在测试新建项之前，刷新后顺序仍相同。两个临时心愿已清理。
- 主预览 localhost:4173 已刷新，35 项，新补充的美妆心愿显示在前，原勾选和历史未改动。
- 31 项测试、语法检查、静态构建通过；独立复核未发现重要问题。


## 2026-10-28 新增心愿描述与官方品牌素材

- 美妆七项补充具体描述并一次性前移，一套化妆品排首位；不覆盖用户已填写的备注，不恢复删除项。原勾选及历史保留。
- 用户补充要求：以后新增未填备注时，列表保留空白，不再回退显示分类名。
- 肯德基、达美乐、必胜客、瑞幸、星巴克、古茗、蜜雪冰城改用官网原始素材，来源和字节校验见 docs/brand-assets.md 与 public/icons/sources.json。选择器已确认全部图片加载成功。
- 核对旧发布数据的 KFC 默认图标为蛋挞🥧，迁移匹配该默认值，并增加回归测试。
- 36 项测试通过，JavaScript 语法检查与静态构建通过。

- 后续补充验证：在独立构建预览中新增未填备注的临时心愿，保存与刷新后 `.wish-note` 均为空字符串，测试项已清理。
- 官方素材替换后八个品牌图片（含原有麦当劳）均加载成功，浏览器控制台无错误；新增资源原字节校验通过。


## 2026-10-28 品牌图标选中边框对齐及发布

- 定位：图片仍使用行内文字基线，桌面测得图标中心比选中按钮中心低 5.117px。
- 修复：图标按钮使用 Grid 双向居中，并设独立行高；选中边框和图标共用同一个布局盒。
- 桌面八个品牌最大横向误差小于 0.004px，纵向误差为 0；390×844 手机尺寸八个品牌横纵误差均为 0。恢复默认视口。
- 36 项测试、语法检查、静态构建及 diff 空白检查通过；最终只读复核无重要问题。

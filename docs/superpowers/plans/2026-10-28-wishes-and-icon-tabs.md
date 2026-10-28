# Wishes and Icon Tabs Implementation Plan

**Goal:** 新增七份美妆心愿并提供七分类横向图标选择器。
**Architecture:** 原生 ES modules；BrowserStore 负责一次性持久化迁移；prize-icons 管理图标目录；app.js 处理可访问的分类交互。
**Tech Stack:** HTML/CSS/JavaScript，localStorage/Web Locks，node:test。

- [x] 在 tests/browser-store.test.mjs 增加升级迁移保留原数据、不重复补齐、不复活删除项以及 64 项边界测试，运行并确认失败。
- [x] 扩展 public/validation.js 的 MAX_WISHES=64；BrowserStore 全部容量检查共用常量，实现 upgradeCatalog；新增 public/wish-updates.js 的七个稳定 ID 心愿，加入初始 JSON。
- [x] 在 tests/prize-icons.test.mjs 验证七分类、所有图标校验合法、旧图标及未知图标编辑兼容，先失败后扩展 prize-icons.js 目录。
- [x] app.js 启动时迁移已有数据；新增弹窗按选中图标定位类别，横向 tab 支持鼠标和方向键；只更新当前 tab 的按钮状态并保留焦点。
- [x] index.html 增加 tablist、七个 tabpanel 和当前图标预览；style.css 增加适配窄屏的横向分类条，保留固定弹窗头尾和内部滚动。
- [x] wheel.js 在 25–64 项时缩小图标和标签，spinTarget 数学测试扩到 64；所有项目等概率。
- [x] 运行 npm test、npm run check、npm run build；浏览器验证本机升级、七份心愿、七类切换、键盘、保存刷新、窄屏布局及控制台；独立复核并记录实际结果。

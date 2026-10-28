# Love in a Spin ♡

我们的惊喜小铺：收藏喜欢、奖励和小礼品，勾选后等概率放进转盘，让普通的日子多一点期待。

这是可部署到 GitHub Pages 的纯静态网站，无第三方运行依赖，也不需要线上后端或数据库。

## 本地运行

需要 Node.js 22.13 或以上；页面使用支持 Web Locks 的新版 Safari、Chrome、Edge 或 Firefox：

```sh
npm start
```

打开 http://localhost:4173 。首次访问会载入当前预设的 35 份心愿，所有心愿均未勾选，抽奖记录为空。

```sh
npm test       # 抽奖、浏览器存储、兼容保留的服务端逻辑等测试
npm run check # JavaScript 语法检查
npm run build # 将纯静态发布文件生成到 dist/
```

预览 GitHub Pages 项目子路径：

```sh
node scripts/serve-static.mjs --dir dist --port 4174 --base /love-in-a-spin/
```

## 功能与保存方式

- 奶油手账风，适配手机和电脑；中文界面与键盘可用的分类、表单。
- 新增、编辑、删除心愿，支持搜索、图标与备注，最多收藏 64 项。
- 分类为「吃喝玩乐 / 约会时光 / 专属宠爱」，按笑脸、动物、食物、活动、旅行、物体、符号七类选择 355 个小图标，包含麦当劳及肯德基、达美乐等品牌图标（[官网素材来源](docs/brand-assets.md)）。
- 心愿按最近新增或参与转盘的先后排列，新的在前；同一轮参与项保持相对顺序，刷新后保留。
- 勾选即时更新等分转盘；固定指针，结果直接显示在转盘下方。
- 浏览器使用 `crypto.getRandomValues()` 加拒绝采样，保证每项概率为 1/N；每次独立，可重复抽中。概率文字按两位小数展示。
- 最近 100 条幸福记录与兑现标记；保存抽中时的心愿快照，修改或删除心愿不会改写历史。
- 可开关音效，支持系统的减少动态效果偏好。弹窗仅内部滚动，关闭后恢复首页位置。

清单、勾选与抽奖记录保存在**当前浏览器的 localStorage**。刷新、关页再打开仍可保留；同一浏览器同一站点的多个标签页会同步。不同设备或浏览器分别保存，无法互相同步。清除网站数据或使用无痕模式，可能丢失本机修改和记录。

预设心愿在 `public/initial-wishes.json`，仅首次访问时载入；更新网站不会覆盖已有的本机清单。本次七份美妆心愿会在已有清单中补齐一次，按名称去重，保留原有编辑、勾选及历史；之后主动删除的美妆心愿不会再次补回。发布文件不包含本地 SQLite 数据库、旧共享链接或运行记录。

## GitHub Pages 发布

仓库的 `.github/workflows/pages.yml` 在推送 `main` 时自动检查、测试、构建并部署 `dist/`。在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

目标地址：[我们的惊喜小铺](https://csyupup.github.io/love-in-a-spin/)。该地址是否可访问以实际部署状态为准。

GitHub 账户套餐必须支持此仓库的 Pages；不支持私有仓库 Pages 的套餐需要将仓库设为公开或升级。公开仓库会公开源码及预设心愿；访问者在自己浏览器中的后续编辑和抽奖记录不会上传到 GitHub。

也可用 Docker 运行静态预览：

```sh
docker compose up --build -d
```

访问 http://localhost:3000 。当前未进行 Docker 环境实测。

## 文件结构

```text
public/                    HTML、CSS、浏览器交互、SVG 与初始心愿
public/browser-store.js    浏览器持久化、等概率抽奖、记录与版本保护
scripts/build-pages.mjs    生成 GitHub Pages 静态发布目录
scripts/serve-static.mjs   本地纯静态预览
.github/workflows/         自动检查及 Pages 部署
src/                       保留的旧版本地 Node/SQLite 服务，不参与 Pages 部署
tests/                     node:test 单元与集成测试
docs/                      设计、实现计划和实测记录
```

## 参考学习

- [CrazyTim/spin-wheel](https://github.com/CrazyTim/spin-wheel)：参考先决定中奖项，再缓动旋转到该项的设计。
- [buuing/lucky-canvas](https://github.com/buuing/lucky-canvas)：参考可配置奖品、图片和文字的抽奖交互。

图标分类交互参考 [Emoji Mart](https://github.com/missive/emoji-mart) 的组织思路，键盘与语义参照 [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)。当前转盘和界面独立实现，未复制以上项目源码。

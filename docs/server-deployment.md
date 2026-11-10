# 共享后端部署

前端继续使用 GitHub Pages，后端运行在 Ubuntu 24.04 的 `/opt/services/love-in-a-spin`。Docker 只映射 `127.0.0.1:3000`，公网入口由主机 Nginx 处理。公网 IP 为 `203.195.205.39`；端口 80 只用于 ACME 验证，443 只提供 `/api/` 和 `/health`。

## 运行与检查

```sh
cd /opt/services/love-in-a-spin
sudo docker compose -f deploy/compose.yml ps
sudo docker compose -f deploy/compose.yml logs --tail 50 app
curl http://127.0.0.1:3000/health
sudo nginx -t
```

`data/love.db` 及 SQLite WAL 文件保存在主机挂载目录，容器以 UID 1000 运行。数据库目录需由该 UID 拥有，权限为 0700。镜像不包含数据库、凭证、Git 信息或测试截图。

只通过本机管理命令创建清单；生产环境的 `/api/rooms` 禁用。首次创建后将凭证文件从 `data/` 移至主机的 `/etc/love-in-a-spin/room.json`，由 root 以 0600 权限保管，避免容器或后续构建接触凭证。请勿将该文件添加到仓库。

## HTTPS 和自动续期

Certbot 5.4 及以上支持 IP 证书。当前使用隔离环境 `/opt/certbot`，证书位于 `/etc/letsencrypt/live/203.195.205.39/`。Certbot 使用 webroot `/var/www/acme` 验证 IP，不需要购买域名。

IP 证书约六天有效，`love-cert-renew.timer` 每天检查两次，到期前更新后校验并重载 Nginx。验证续期：

```sh
sudo systemctl list-timers love-cert-renew.timer
sudo /opt/certbot/bin/certbot renew --dry-run
```

## 数据备份

`love-backup.timer` 每日运行 SQLite 在线备份，不直接复制活动中的 WAL 数据库。备份目录 `/var/backups/love-in-a-spin` 只允许 root 访问；备份同时保存专属链接凭证，且执行 `PRAGMA integrity_check`。恢复测试在副本中进行，不能覆盖运行中的数据库。

```sh
sudo systemctl start love-backup.service
sudo systemctl status love-backup.service --no-pager
sudo sqlite3 /var/backups/love-in-a-spin/选定备份.db 'PRAGMA integrity_check;'
```

日常恢复需先停止 app，保留当前数据库及 WAL 副本，再将选定备份作为 `data/love.db`、恢复 UID 1000 所有权并启动 app。不要只替换数据库而留下其他版本的 WAL。

## 访问与迁移

GitHub Pages 的 `runtime-config.js` 仅包含 HTTPS API 地址，不包含清单凭证。客户端以 Bearer 凭证读取和修改清单，CORS 仅允许 `https://csyupup.github.io` 和同源页面。新增其他前端地址时需显式更新 Compose 中的 `ALLOWED_ORIGINS`。

现有浏览器数据保留在原 localStorage。先导出旧清单，再在共享清单中确认导入；不自动覆盖服务器数据。网站和后端的正式运营备案要求应按腾讯云及当地管局要求办理，IP HTTPS 本身不构成备案豁免。

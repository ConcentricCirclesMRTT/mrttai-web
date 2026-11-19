# mrttai.com 网站部署指南

适用项目：[ConcentricCirclesMRTT/mrttai-web](https://github.com/ConcentricCirclesMRTT/mrttai-web)。整理日期：2026-11-18。

**现有服务器更新：按第 2～5 节操作。新服务器首次上线：先看第 6 节。** 以下命令是操作说明，阅读本文不会自动部署。

## 1. 网站与访问路径

```text
GitHub 源码 → 本地构建 → dist / 部署 ZIP → 上传服务器的新版本目录
浏览器 → 域名 DNS → Nginx + HTTPS → current → releases/某个版本
```

这是完整静态站点。官网使用 React + Vite，模型交互在浏览器执行；当前版本不需要 Node 常驻服务、数据库或 Docker。Node/npm 用于源码构建。**GitHub Actions 只校验和构建，推送 GitHub 不会自动更新 mrttai.com。**

| 页面 | 地址 |
| --- | --- |
| 官网首页 | https://mrttai.com/ |
| 产品介绍 | https://mrttai.com/#/product |
| 漫游封面 | https://mrttai.com/explore/ |
| 三维展厅 | https://mrttai.com/explore/explore.html |
| 影片导览 | https://mrttai.com/explore/film/ |
| NeuBE 方法介绍 | https://mrttai.com/neube-sr-showcase/ |

项目按**域名根目录**部署。迁到新域名可以沿用此结构；改成 `/demo/` 等子路径，需要修改并检查代码中的绝对路径。

## 2. 准备部署包

### A. 不改代码，部署已发布版本

在 [v1.0.0 Release](https://github.com/ConcentricCirclesMRTT/mrttai-web/releases/tag/v1.0.0) 下载 `mrttai-web-v1.0.0-site.zip` 和 `SHA256SUMS`。部署包约 496 MB，包含模型与影片真实文件。

在 Mac 终端进入下载目录：

```bash
shasum -a 256 mrttai-web-v1.0.0-site.zip
cat SHA256SUMS
unzip -tq mrttai-web-v1.0.0-site.zip
```

哈希应与 SHA256SUMS 中 **site.zip 对应行**相同，ZIP 检查应通过。`source.zip` 是用于修改和构建的源码包。GitHub 自动生成的 Source code ZIP 可能含 LFS 指针，不能直接当完整站点部署。

v1.0.0 是固定历史版本；以后的改动需要新版本部署包，或使用下面的源码构建流程。

### B. 修改源码后构建

准备 Node.js 22（与 CI 一致）、npm、Git、Git LFS。首次获取：

```bash
git lfs install
git clone https://github.com/ConcentricCirclesMRTT/mrttai-web.git
cd mrttai-web
git lfs pull
npm ci
npm run verify
npm run build
npm run verify -- --dist
npm run preview -- --host 127.0.0.1
```

打开终端显示的预览地址，检查第 1 节的页面和交互。后续更新先保存自己的改动，再拉取目标提交并重新执行 LFS、安装、校验和构建。用 `git rev-parse HEAD` 记录源码版本。

若主动修改 public 素材，确认改动后运行 `node scripts/asset-manifest.mjs --write` 更新清单，再校验。不要通过重写清单掩盖缺文件或 LFS 下载失败。

上传的是 **dist 里面的全部内容**：

```text
站点根目录/
├── index.html
├── assets/                 # Vite 构建文件
├── images/
├── explore/                # 漫游、影片、模型和下载素材
└── neube-sr-showcase/
```

在项目根目录生成新部署包；先换成自己的全新版本名：

```bash
release_name=mrttai-web-custom-001
test ! -e "$release_name-site.zip" && (
  cd dist && zip -qr "../$release_name-site.zip" .
)
shasum -a 256 "$release_name-site.zip"
unzip -tq "$release_name-site.zip"
```

记录 SHA-256。不要只上传 public、首页或部分 assets，也不要把 dist 目录多套一层。

## 3. 现有服务器上传与切换

### 3.1 确认路径并上传

此前部署采用以下约定，操作前在实际服务器确认：

```text
/srv/tower-showcase/
├── current → releases/当前版本
├── releases/              # 每次一个新目录，保留旧版本
└── deployment-audit/      # 切换前路径及发布记录
```

使用已有 FinalShell 连接，在服务器检查：

```bash
readlink -f /srv/tower-showcase/current
sudo nginx -T
df -h /srv
```

确认有效站点 server_name 包含 mrttai.com，root 指向 `/srv/tower-showcase/current`；实际不同先调整本文路径。至少预留 2 GB 作为一次更新的起点，并以实际空间为准。

在 FinalShell 文件面板把完整 ZIP 上传到 `/tmp/`。或在 Mac 终端执行，将 USER、SERVER_IP 替换为已有 SSH 账号和地址：

```bash
scp mrttai-web-v1.0.0-site.zip USER@SERVER_IP:/tmp/
```

自定义版本替换文件名。上传结束后，在服务器执行 `sha256sum /tmp/包名.zip`，与本地核对；不要在上传过程中解压上线。

### 3.2 解压、校验与切换

在 **Ubuntu/Linux 服务器**执行。先替换前三个变量：版本名必须全新，expected_sha256 使用刚核对的包哈希。任何一步失败时停止，不覆盖旧版本。

```bash
sudo bash <<'BASH'
set -euo pipefail
release_name=web-v1.0.0-release-001
archive=/tmp/mrttai-web-v1.0.0-site.zip
expected_sha256=REPLACE_WITH_VERIFIED_SHA256

base=/srv/tower-showcase
target="$base/releases/$release_name"
audit="$base/deployment-audit/$release_name"
[[ "$release_name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
[[ "$expected_sha256" =~ ^[a-f0-9]{64}$ ]]
test -f "$archive"
test ! -e "$target"
test ! -e "$audit"
printf '%s  %s\n' "$expected_sha256" "$archive" | sha256sum -c -
unzip -tq "$archive"

previous=''
if test -L "$base/current"; then
  previous=$(readlink -f "$base/current")
  test -f "$previous/index.html"
elif test -e "$base/current"; then
  echo 'current 是实际文件或目录，请先检查部署结构。' >&2
  exit 1
fi

mkdir -p "$target" "$audit"
printf '%s\n' "$previous" > "$audit/previous-release.txt"
printf '%s  %s\n' "$expected_sha256" "$archive" > "$audit/archive.sha256"
unzip -q "$archive" -d "$target"
for page in index.html explore/index.html explore/explore.html explore/film/index.html neube-sr-showcase/index.html; do
  test -s "$target/$page"
done
test -d "$target/assets"
test -s "$target/explore/assets/model.json"
# v1.0.0 文件名；后续媒体改名时同步调整检查。
test "$(stat -c %s "$target/explore/film/structure-film-v25-continuous-hd.mp4")" -gt 100000000
test "$(stat -c %s "$target/explore/assets/downloads/tower-step-91a421947f19.zip")" -gt 50000000
find "$target" -type d -exec chmod 755 {} +
find "$target" -type f -exec chmod 644 {} +

nginx -t
link_tmp="$base/.current-$release_name"
test ! -e "$link_tmp" && test ! -L "$link_tmp"
ln -s "$target" "$link_tmp"
mv -Tf "$link_tmp" "$base/current"
systemctl reload nginx
printf '已切换到：%s\n回滚记录：%s\n' "$target" "$audit/previous-release.txt"
BASH
```

脚本不修改 DNS、TLS 或 Nginx 配置。root 已指向 current 时沿用原配置。校验失败的新目录留下排查，再试时使用新版本名。

## 4. 上线验收

浏览器检查：

- 官网首页、产品等页面正常，刷新仍能打开。
- 漫游封面铁塔出现，拖动旋转、模块展开可用。
- 展厅模型加载完成，选择模块、切换显示模式正常。
- 影片播放、声音、拖动进度与章节正常。
- 官网能进入漫游；封面、展厅、影片的“返回首页”可用。
- 方法介绍、模型下载可用；手机无异常横向溢出。
- 上下滚动不卡住；Console / Network 无模型与脚本加载错误。

终端检查：

```bash
curl -I https://mrttai.com/
curl -I https://mrttai.com/explore/
curl -I https://mrttai.com/explore/explore.html
curl -I https://mrttai.com/explore/film/
curl -I https://mrttai.com/neube-sr-showcase/
curl -I https://mrttai.com/film/
curl -I https://mrttai.com/explore.html
```

主页面返回 200，最后两个旧入口应重定向到新路径。影片 Range 检查：

```bash
curl --fail --max-time 30 --max-filesize 1048576 \
  --range 0-1023 --dump-header - --output /dev/null \
  https://mrttai.com/explore/film/structure-film-v25-continuous-hd.mp4
```

预期 **206 Partial Content**，包含 Content-Range，Content-Type 为 video/mp4。返回整个文件或 HTML 时，检查 Nginx/CDN 的路径与 Range 行为。

bin.gz 是应用自行解压的模型数据，不能再标为 HTTP gzip：

```bash
curl -I https://mrttai.com/explore/assets/lod/m1-0d68f27f7c40.bin.gz
```

应返回二进制文件，不带 `Content-Encoding: gzip`。使用 CDN 时也检查 CDN 的返回内容。HTTP 通过不能替代实际交互验收。

## 5. 回滚

服务器执行，将 release_name 改成**刚刚切换的版本名**。以该版本记录的旧路径回滚：

```bash
sudo bash <<'BASH'
set -euo pipefail
release_name=web-v1.0.0-release-001
base=/srv/tower-showcase
[[ "$release_name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
test "$(readlink -f "$base/current")" = "$base/releases/$release_name"
previous=$(cat "$base/deployment-audit/$release_name/previous-release.txt")
test -n "$previous"
test -f "$previous/index.html"
nginx -t
link_tmp="$base/.rollback-$release_name"
test ! -e "$link_tmp" && test ! -L "$link_tmp"
ln -s "$previous" "$link_tmp"
mv -Tf "$link_tmp" "$base/current"
systemctl reload nginx
printf '已回滚到：%s\n' "$previous"
BASH
```

再做第 4 节检查。如果还改过 Nginx，另外恢复配置备份，nginx -t 通过后 reload。首次部署没有旧版本，不能用此流程回滚。

## 6. 新服务器首次上线

现有站点更新无需重复本节。新机器推荐 Ubuntu + Nginx。

### 6.1 DNS 与端口

服务器具备固定公网地址；安全组与系统防火墙放行 TCP 80/443，SSH 沿用管理规则。DNS 中 `@` 的 A 记录指向公网 IPv4；使用 www 时也配置对应记录。只有具备可访问 IPv6 时才添加 AAAA。

```bash
dig +short mrttai.com A
dig +short www.mrttai.com A
```

若本机代理使用 Fake-IP，应通过权威 DNS 或云解析控制台核对真实记录。保留邮箱 MX/TXT 等其他业务记录。

### 6.2 安装与上传

在新服务器执行：

```bash
sudo apt update
sudo apt install -y nginx unzip
sudo mkdir -p /srv/tower-showcase/releases /srv/tower-showcase/deployment-audit
sudo systemctl enable --now nginx
```

按第 2～3 节上传、解压、切换。不存在 current 时脚本会创建链接；此时还需配置域名站点。

### 6.3 Nginx 站点

将仓库的 [nginx-locations.conf](nginx-locations.conf) 上传到 `/tmp/nginx-locations.conf`，然后：

```bash
sudo install -m 644 /tmp/nginx-locations.conf /etc/nginx/snippets/mrttai-locations.conf
```

创建 `/etc/nginx/sites-available/mrttai.com`：

```nginx
server {
    listen 80;
    server_name mrttai.com www.mrttai.com;
    root /srv/tower-showcase/current;
    include /etc/nginx/snippets/mrttai-locations.conf;
}
```

仅启用实际解析的域名。确认 Nginx 的 http 块已加载 mime.types，保证 JS/CSS 的类型正确。启用：

```bash
sudo ln -s /etc/nginx/sites-available/mrttai.com /etc/nginx/sites-enabled/mrttai.com
sudo nginx -t && sudo systemctl reload nginx
curl -I http://mrttai.com/
```

同名链接或同域名 server 已存在时先检查，不重复创建。规则文件已经包含 location /，合入现有站点时不要重复添加同名 location。官网使用 hash 路由，片段不会发到服务器，无须把所有 404 兜底到首页。

### 6.4 HTTPS

HTTP 正常后，按 [Certbot 官方 Nginx 安装指南](https://certbot.eff.org/instructions?ws=nginx&os=snap) 安装；已安装的沿用原方式。申请与续期检查：

```bash
sudo certbot --nginx -d mrttai.com -d www.mrttai.com
sudo certbot renew --dry-run
systemctl list-timers --all | grep -i certbot
```

未配置 www 时只申请 mrttai.com。续期任务名称随安装方式变化，以实际 timer/cron 为准。检查证书域名、HTTP→HTTPS 跳转，再做第 4 节验收。以后更新保留证书、TLS、ACME challenge 与安全响应头。

## 7. 排错与发布记录

| 现象 | 优先排查 |
| --- | --- |
| 推送 GitHub 后网站没变 | Actions 只构建，仍需部署并核对 current |
| 首页空白、JS MIME 错误 | 上传源码、多套 dist、漏 assets 或用 HTML 代替 JS |
| 官网正常，漫游打不开 | explore 漏传或只上传了部分目录 |
| 影片/STEP 只有几百字节 | 部署了 LFS 指针；换完整包或 lfs pull 后重建 |
| 模型解压失败 | bin.gz 被代理/CDN重复解压，核对编码和原始字节 |
| 视频不能拖进度 | Range 是否 206、媒体类型、CDN规则 |
| 新版仍显示旧内容 | 先看 root/current，再看浏览器/CDN缓存 |
| 403 / 404 | 目录权限、root、大小写、实际上传路径 |
| HTTPS 异常 | DNS、80/443、防火墙、证书域名与续期日志 |
| 滚动卡顿 | 是否部署已优化版本、渲染是否暂停；传输压缩不能代替渲染优化 |

```bash
sudo systemctl status nginx --no-pager
sudo tail -n 80 /var/log/nginx/error.log
sudo journalctl -u nginx -n 80 --no-pager
```

每次记录：源码提交/标签、ZIP SHA-256、新旧目录、上线时间和交互验收结果。服务器凭据、私钥、证书与私有连接配置不进入公开仓库。

## 8. 官方参考

- [Nginx 入门：静态文件、配置与重载](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx root、location、try_files、types 指令](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [Certbot：Nginx HTTPS 与续期](https://certbot.eff.org/instructions?ws=nginx&os=snap)
- [GitHub：Git LFS 上传完整性问题](https://docs.github.com/en/repositories/working-with-files/managing-large-files/resolving-git-large-file-storage-upload-failures)

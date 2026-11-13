# 静态部署

1. `git lfs pull && npm ci && npm run verify && npm run build && npm run verify -- --dist`。
2. 将 `dist/` **完整内容** 上传到一个新的版本目录，包含 `explore/`、`images/`、`neube-sr-showcase/` 和 Vite 生成的 `assets/`。
3. 保留当前站点及 HTTPS 配置备份，将现有 Nginx 站点的 `root` 切换到新目录。保留已有证书、TLS、ACME challenge 和安全响应头配置。
4. 将 `nginx-locations.conf` 中的规则合入已有 `server`，不要重复已有的同名 `location`。执行 `nginx -t` 后 reload。
5. 检查首页、漫游封面、展厅、影片、返回首页，以及 MP4 的 Range 请求。

旧 `/film/` 与 `/explore.html` 兼容规则见同目录配置；旧根地址 `#view=...` 由首页脚本重定向到新展厅并保留查询与视角片段。

**仓库内不包含服务器登录凭据、私钥或证书，也未配置推送后自动上线。** GitHub Actions 只进行文件核对和构建。

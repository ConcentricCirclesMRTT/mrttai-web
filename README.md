# MRTT · 仝心圆官网与结构漫游

[访问官网](https://mrttai.com/) · [结构漫游](https://mrttai.com/explore/) · [三维展厅](https://mrttai.com/explore/explore.html) · [影片导览](https://mrttai.com/explore/film/)

这是 mrttai.com 的完整独立网站项目，包含 React 官网、九模块铁塔交互封面与展厅、192 秒影片导览、NeuBE 重建方法介绍，以及运行所需的模型、图纸图片和下载素材。初始版本整理自 2026-11-12 确认并上线的页面。

## 获取并运行

需要 Node.js 22 或更新版本、npm，以及 Git LFS。

```bash
git lfs install
git clone https://github.com/ConcentricCirclesMRTT/mrttai-web.git
cd mrttai-web
git lfs pull
npm ci
npm run dev -- --host 127.0.0.1
```

打开终端显示的本地地址。官网和结构漫游使用同一端口，不需要额外后端。

**完整 ZIP**：请下载 [v1.0.0 Release](https://github.com/ConcentricCirclesMRTT/mrttai-web/releases/tag/v1.0.0) 中的 `mrttai-web-v1.0.0-source.zip`。该包已包含真实大文件，可直接解压运行，无须 Git LFS。GitHub 自动生成的 Source code ZIP 可能只包含 LFS 指针，应优先使用这里上传的完整包。

## 构建与核对

```bash
npm run verify
npm run build
npm run verify -- --dist
npm run preview -- --host 127.0.0.1
```

`dist/` 是完整静态网站，可部署到 Nginx 等静态托管服务。Release 同时提供 `mrttai-web-v1.0.0-site.zip`，解压后的文件可直接作为站点根目录。项目没有自动修改生产服务器或域名的工作流。

**完整流程见 [网站部署指南](deploy/README.md)**：现有服务器更新、新服务器首次上线、DNS/HTTPS、上传校验、交互验收与回滚。

## 页面与目录

| 地址 | 内容 | 主要源码 |
| --- | --- | --- |
| `/` | 官网首页，突出结构漫游 | `src/App.tsx` |
| `/#/product` | 产品介绍 | `src/App.tsx` |
| `/#/research`、`/#/about`、`/#/careers` | 技术研究、关于我们、加入我们 | `src/App.tsx` |
| `/explore/` | 可旋转、展开模块的漫游封面 | `public/explore/index.html`、`cover.js` |
| `/explore/explore.html` | 完整三维交互展厅 | `public/explore/explore.html`、`app.js` |
| `/explore/film/` | 影片播放与章节导航 | `public/explore/film/` |
| `/neube-sr-showcase/` | NeuBE 重建方法展示 | `public/neube-sr-showcase/` |

访问主线：**官网 → 漫游封面 → 三维展厅 / 影片导览 → 返回首页**。展厅与影片也可以直接分享访问。

- `public/images/`：官网图片与原始工程图截图。
- `public/explore/assets/`：模型索引、压缩几何、模块总览、下载素材。
- `public/explore/film/`：影片页面、音视频和演示素材。
- `src/visibleRenderLoop.ts`：页面不可见、离开视口或滚动时暂停三维渲染的调度。
- `assets-manifest.json`：全部公开静态素材的 SHA-256 和字节数；`npm run verify` 可发现缺文件、LFS 指针或内容变动。
- `deploy/`：沿用现有 HTTPS 服务器部署时的路径与兼容规则说明。

## 大文件

只有高清影片和完整 STEP 下载 ZIP 使用 Git LFS，其余素材直接存放在 Git 中。不要将 LFS 指针文件直接部署为影片或模型下载文件。修改素材后运行 `node scripts/asset-manifest.mjs --write` 更新清单，再执行验证与构建。

## 展示范围

现有铁塔为九模块展示，塔腿待补。页面保留条件性内容、安装连接待核验等说明；交互展示与影片均不作为工程验收、制作、安装或施工依据。影片表达产品理念与模型生成过程，不代表自动识别结果记录。

项目来源、素材与第三方说明见 [NOTICE.md](NOTICE.md)。

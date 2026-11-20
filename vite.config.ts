import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite's SPA fallback answers `/explore/` and `/explore/film/` with the root
 * index.html. Production (nginx `try_files $uri $uri/`) serves the folder's own
 * index.html, so mirror that in dev and preview.
 */
function publicDirectoryIndex(): Plugin {
  const rewrite = (root: string): Connect.NextHandleFunction => (req, _res, next) => {
    const [path, query = ""] = (req.url ?? "").split("?");
    if (path !== "/" && path.endsWith("/")) {
      const file = join(root, decodeURIComponent(path), "index.html");
      if (existsSync(file) && statSync(file).isFile()) req.url = `${path}index.html${query ? `?${query}` : ""}`;
    }
    next();
  };
  return {
    name: "public-directory-index",
    configureServer(server) { server.middlewares.use(rewrite(server.config.publicDir)); },
    configurePreviewServer(server) { server.middlewares.use(rewrite(server.config.build.outDir)); },
  };
}

export default defineConfig({
  plugins: [publicDirectoryIndex(), react()],
});

import path from "node:path";
import { defineConfig, runnerImport, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { injectSeo, llmsTxt, readContent, type SiteContent } from "./scripts/seo.ts";

/**
 * Build-time SEO. Most AI crawlers don't run JavaScript, so without this they'd see an empty
 * <div id="root">. On every build it loads src/content.ts and writes:
 *   - a plain-HTML snapshot of the page into #root (createRoot replaces it on mount),
 *   - a JSON-LD graph into <head>,
 *   - /llms.txt.
 * Everything is generated from content.ts, so edits there flow through on the next build.
 * content.ts must stay free of browser globals at module level: it runs in Node here.
 * Build-only; `vite dev` is untouched. Generators live in scripts/seo.ts.
 */
function seo(): Plugin {
  let root = process.cwd();
  let content: SiteContent | undefined;

  return {
    name: "portfolio:seo",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async buildStart() {
      const file = path.resolve(root, "src/content.ts");
      this.addWatchFile(file);
      const { module } = await runnerImport<Record<string, unknown>>(file, { root, logLevel: "warn" });
      content = readContent(module);
    },
    transformIndexHtml(html) {
      if (!content) throw new Error("[seo] src/content.ts was not loaded");
      return injectSeo(html, content);
    },
    generateBundle() {
      if (content) this.emitFile({ type: "asset", fileName: "llms.txt", source: llmsTxt(content) });
    },
  };
}

export default defineConfig({
  plugins: [react(), seo()],
});

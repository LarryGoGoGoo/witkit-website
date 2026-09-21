import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5180,
  },
  build: {
    /* 目录由 scripts/clean-dist.mjs 负责清（带重试，见该文件里的排查记录）。
       让 Vite 自己清的话，Windows 上会偶发 EPERM —— 杀软/索引器对新写出文件的
       句柄释放有延迟，第一次删必被拒，于是整轮构建废掉。 */
    emptyOutDir: false,
  },
  cacheDir: ".vite-cache",
});

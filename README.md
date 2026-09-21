# witkit 妙计科技 · 官网

妙计科技官方网站前端。Vue 3 + Vite + TypeScript，无 UI 框架、无 Tailwind 之外的样式依赖，全站自绘。

## 本地跑起来

```bash
npm install
npm run dev          # http://127.0.0.1:5173（本项目约定固定跑在 5300 端口调试）
```

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 类型检查 + 清理 dist + 生产构建 |
| `npm run check:all` | **交付前必跑**：设计 token、死 CSS、图片位、lint、i18n 同步、类型检查 |
| `npm run check:ui` | 渲染层验收（需 dev server 在 127.0.0.1:5300）：链接、i18n、服务页、滚动、视觉、架构图 |
| `node scripts/witkit-svg-legibility.mjs` | 架构图「字糊不糊」：逐条量字的最暗像素，抓描边糊字 |
| `node scripts/witkit-svg-fit.mjs` | 架构图「装不装得下」：逐条量 getBBox，抓文字出框/越界 |
| `npm run i18n` | 重新生成繁中词表（`src/i18n/tw.ts` 是生成物，不要手改） |

## 目录

```
src/
  api/        后端契约 + client（当前直接读 mocks，后端就绪后只改 client 实现）
  assets/     图片与图片位规格（imageSpecs.ts 是规格单一源）
  components/ 通用组件 + deco/ 工程图纸风格装饰件
  data/       站内静态数据（开发者页等）
  i18n/       简 / 繁两档
  mocks/      本地数据
  pages/      各路由页面
  styles/     设计 token（tokens.json 是单一源，tokens.css 是生成物）
```

## 改代码前要知道的几条约定

- **色值 / 间距 / 字号**：改 `src/styles/tokens.json`，然后 `node src/styles/build.mjs`。不要手改 `tokens.css`。
- **改完必校验**：`npm run check:all`（静态）+ `npm run check:ui`（渲染）。
- **删了模板结构要顺手删样式**：`check:css` 按全项目词频判「没人引用的类」，删结构不删样式它抓不到。
- **架构图字号要按「显示宽度」算，不能按画布算**：画布 1600 宽，实际显示只有 900 上下，
  画布内 28px 的字到屏幕上只剩 16px。改字号后一定跑 `witkit-svg-fit.mjs`，
  它会抓出「文字捅出卡片/画布」——这种问题在终端里看不出来。
- **图表里的文字不要继承描边**：每张图 `<defs>` 里都有一行 `<style>text { stroke: none; }</style>`，
  芯片容器 `<g fill="#FFFFFF" stroke="…">` 会把近白描边继承给里面的 `<text>`，黑字被"洗"成灰字。别删。
- **顶栏 `AppHeader.vue` 的服务菜单文案必须与 `src/mocks/data.ts` 逐字一致**。

## 状态

- 后端未开始，`api/client.ts` 直接读本地数据，方法签名已按「将来换 fetch」对齐，换后端时页面零改动。
- 图片位 18 / 18 已就位；`favicon.png`、`og-cover.png` 待补（放 `public/`）。

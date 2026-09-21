import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";
import { vReveal } from "./directives/reveal";
import { router } from "./router";

/* 不再启动 MSW service worker —— 官网后端还没写，api 层直接读本地 mock 数据
   （见 src/api/client.ts 的说明）。这样彻底消除「请求穿透到 SPA fallback 返回 HTML」
   的竞态问题，生产包也不用再带 300KB+ 的 MSW worker。 */
const app = createApp(App);
app.use(router);
app.directive("reveal", vReveal);
app.mount("#app");

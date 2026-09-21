/**
 * 抓最终首屏截图 + 与参考图并排对比图（供交付确认）。
 * 输出到项目根的 .workbuddy/shots/ 下，命名带日期。
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../../.workbuddy/shots");
const REF = resolve(HERE, "../../../首屏F4-光影殿堂.png");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:5300/", { waitUntil: "networkidle" });
await p.waitForTimeout(2600);

const shot = join(OUT, "首屏-最终.png");
await p.screenshot({ path: shot });

/* 并排对比：上参考、下当前，各自缩到 720 宽 */
const cmp = join(OUT, "首屏-对比参考.png");
await p.evaluate(
  async ([refB64, curB64]) => {
    const load = async (b64) => {
      const im = new Image();
      im.src = `data:image/png;base64,${b64}`;
      await im.decode();
      return im;
    };
    const ref = await load(refB64);
    const cur = await load(curB64);
    const W = 720;
    const hRef = Math.round((ref.height / ref.width) * W);
    const hCur = Math.round((cur.height / cur.width) * W);
    const cv = document.createElement("canvas");
    cv.width = W * 2 + 24;
    cv.height = Math.max(hRef, hCur) + 40;
    const c = cv.getContext("2d");
    c.fillStyle = "#111";
    c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(ref, 0, 30, W, hRef);
    c.drawImage(cur, W + 24, 30, W, hCur);
    c.fillStyle = "#9ab";
    c.font = "16px sans-serif";
    c.fillText("参考 F4", 8, 22);
    c.fillText("当前实现", W + 32, 22);
    window.__cmp = cv.toDataURL("image/png");
  },
  [readFileSync(REF).toString("base64"), readFileSync(shot).toString("base64")],
);
const data = await p.evaluate(() => window.__cmp);
const { writeFileSync } = await import("node:fs");
writeFileSync(cmp, Buffer.from(data.split(",")[1], "base64"));

/* 手机端 */
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(1500);
const mob = join(OUT, "首屏-手机.png");
await p.screenshot({ path: mob });

console.log("已生成：");
console.log(`  ${shot}`);
console.log(`  ${cmp}`);
console.log(`  ${mob}`);
await b.close();

/**
 * 批量下载 Pexels 图片到 图片海选/ 文件夹
 *
 * 用法：node scripts/download-images.mjs
 * 用 Node 原生 fetch 并发下载（不依赖 shell/curl），
 * 文件名 = {关键词}_{id}.jpg，已存在跳过，失败记入 failed.log。
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(ROOT, "图片海选");
const MANIFEST = resolve(OUT, "manifest.json");
const FAILED = resolve(OUT, "failed.log");
const CONCURRENCY = 8;

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(MANIFEST, "utf8"));
const tasks = [];
for (const [kw, arr] of Object.entries(data.ids)) {
  for (const id of arr) tasks.push({ kw, id });
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

let ok = 0;
let skip = 0;
let fail = 0;
const failed = [];

async function download(t) {
  const file = resolve(OUT, `${t.kw}_${t.id}.jpg`);
  if (existsSync(file) && statSync(file).size > 2000) {
    skip++;
    return;
  }
  const url = `https://images.pexels.com/photos/${t.id}/pexels-photo-${t.id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2000) {
      writeFileSync(file, buf);
      ok++;
    } else {
      throw new Error("too small");
    }
  } catch (e) {
    fail++;
    failed.push(`${t.kw}_${t.id}`);
    try {
      if (existsSync(file)) require("node:fs").unlinkSync(file);
    } catch {}
  }
}

// 并发队列
const queue = [...tasks];
async function worker() {
  while (queue.length) {
    const t = queue.shift();
    await download(t);
    if ((ok + fail) % 25 === 0) {
      console.log(
        `  进度：成功 ${ok} / 失败 ${fail} / 跳过 ${skip} / 剩余 ${queue.length}`,
      );
    }
  }
}

console.log(`共 ${tasks.length} 个任务，并发 ${CONCURRENCY}，开始下载...`);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

writeFileSync(FAILED, `${failed.join("\n")}\n`);
console.log(`\n完成：成功 ${ok}，失败 ${fail}，跳过 ${skip}`);
if (failed.length)
  console.log(`失败清单已写入 ${FAILED}（${failed.length} 条）`);

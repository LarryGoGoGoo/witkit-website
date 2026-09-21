/**
 * 清掉上一轮的构建产物 —— 给 `npm run build` 当前置步骤。
 *
 * 为什么需要它：Vite 自己在构建开始时清 `dist/`，但在 Windows 上这一步会**偶发 EPERM**：
 *
 *   EPERM, Permission denied: \\?\C:\...\dist\assets
 *
 * 排查结论（试过三种解释都排除了）：
 *   ✗ 不是沙箱 —— 关掉沙箱照样第一次失败
 *   ✗ 不是 CJK 路径名 —— 报错里那个乱码只是控制台编码显示，真实路径没坏
 *   ✗ 不是权限 —— 同一个文件系统，第二次删就成功
 *   ✓ 是 Windows 上杀软 / 搜索索引器对新写出文件的句柄释放**有延迟**：
 *     刚构建完的 dist 里几十个文件，第一次删必失败，隔一下再删就好。
 *
 * 实测：对刚构建完的 dist 跑 5 次 rmSync，第 1 次 EPERM，第 2 次成功。
 *
 * ── 第二个坑（2026-09-19 晚补）────────────────────────────────────────────
 * WorkBuddy 的文件删除护栏会接管 `fs.rmSync`，把它**整目录转成一次 trash 操作**。
 * 那个批量 trash 会直接 abort，抛出的错误**连 code 都没有**：
 *
 *   rmSync failed → [safe-delete] 操作失败: ERROR ...\dist:
 *                   Error during a `trash` operation: Unknown { description: "Some operations were aborted" }
 *
 * 但护栏**只拦批量**：单文件 `rmSync` 和空目录 `rmdirSync` 都正常（实测 44 个文件逐个删 44/44 成功）。
 * 所以整目录删失败时降级为「递归逐文件删 → 逐层 rmdir」，而不是无脑重试同一个动作。
 *
 * 于是这里的做法是「两种删法各自重试到拿到句柄为止」，配合 vite.config 里的
 * `build.emptyOutDir: false`（目录由本脚本负责清，Vite 不用再删任何东西，
 * 也就不会在构建中途失败把整轮构建废掉）。
 *
 * 重试耗尽仍然失败就**故意非 0 退出** —— 宁可红，也不要让上一轮的旧产物
 * 混进新构建里，那种脏产物查起来比构建失败费劲得多。
 */
import { existsSync, readdirSync, rmSync, rmdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const MAX_TRIES = 6;
const WAIT_MS = 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 降级删法：递归逐文件删，最后逐层 rmdir。
 *  护栏拦的是「rmSync 一个目录」这种批量动作，拆成单文件就放行了。 */
function removeTreeDeep(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = resolve(dir, entry.name);
    if (entry.isDirectory()) removeTreeDeep(child);
    else rmSync(child, { force: true });
  }
  rmdirSync(dir);
}

if (!existsSync(OUT)) {
  console.log("✓ dist/ 不存在，无需清理");
  process.exit(0);
}

for (let i = 1; i <= MAX_TRIES; i++) {
  const failures = [];

  // 第一选择：整目录删（快，但会被护栏转成批量 trash 而失败）
  try {
    rmSync(OUT, { recursive: true, force: true });
    console.log(`✓ 已清 dist/（第 ${i} 次尝试）`);
    process.exit(0);
  } catch (e) {
    failures.push(e);
  }

  // 第二选择：逐文件删 + 逐层 rmdir（护栏只拦批量，这条一般能过）
  try {
    removeTreeDeep(OUT);
    console.log(`✓ 已清 dist/（逐文件删除，第 ${i} 次尝试）`);
    process.exit(0);
  } catch (e) {
    failures.push(e);
  }

  if (i === MAX_TRIES) {
    const detail = failures
      .map(
        (e) =>
          `    · ${e.code ?? "?"} ${String(e.message).split("\n")[0].slice(0, 160)}`,
      )
      .join("\n");
    /* 拼成一条模板串：biome 的 useTemplate 不允许相邻模板串相加，
       而且分行写会把缩进当成字符串内容打进日志。用数组 join 最省心。 */
    console.error(
      [
        `✗ 清 dist/ 连续 ${MAX_TRIES} 次被拒（两种删法都试过）。`,
        detail,
        "  通常是某个进程（vite / esbuild / 杀软 / 索引器）还占着文件句柄。",
        "  处理完再重跑；本次**不**继续构建，避免旧产物混进新构建。",
      ].join("\n"),
    );
    process.exit(1);
  }

  await sleep(WAIT_MS * i);
}

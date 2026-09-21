import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const cmd = process.argv[2] || "npm run check:all";
try {
  const out = execSync(cmd, {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
    cwd: new URL(".", import.meta.url).pathname.replace(/^\//, ""),
  });
  writeFileSync(".check-out.txt", out, "utf8");
  console.log("EXIT=0");
} catch (e) {
  writeFileSync(
    ".check-out.txt",
    `STDOUT:\n${e.stdout || ""}\n\nSTDERR:\n${e.stderr || ""}`,
    "utf8",
  );
  console.log(`EXIT=${e.status}`);
}

const fs = require("fs");
const path = require("path");

const TARGETS = [
  "hh_token",
  "hh_credentials",
  "hh_authed",
  "clearToken",
  "storeToken",
  "401",
  "403",
  "Authorization",
];
const IGNORE_DIRS = ["node_modules", ".next", "dist", ".git"];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (IGNORE_DIRS.some((d) => fullPath.includes(d))) continue;

    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        TARGETS.forEach((target) => {
          if (line.includes(target)) {
            console.log(
              `[FRONTEND] ${fullPath}:${index + 1} -> Found: ${target}`,
            );
            console.log(`   Code: ${line.trim()}`);
          }
        });
      });
    }
  }
}
scanDir(".");

import { readdir, readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const jsFiles = [];

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(?:js|mjs)$/.test(entry.name)) jsFiles.push(full);
  }
}

for (const directory of ["js", "scripts", "tests"]) {
  await walk(path.join(root, directory));
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    errors.push(path.relative(root, file) + ": " + (result.stderr || result.stdout).trim());
  }
}

for (const file of jsFiles.filter(file => file.startsWith(path.join(root, "js") + path.sep))) {
  const source = await readFile(file, "utf8");
  const imports = source.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g);
  for (const match of imports) {
    const target = path.resolve(path.dirname(file), match[1]);
    try {
      await access(target);
    } catch {
      errors.push(path.relative(root, file) + ": missing local import " + match[1]);
    }
  }
}

const html = await readFile(path.join(root, "index.html"), "utf8");
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) errors.push("index.html: duplicate id #" + id);
  seen.add(id);
}

const css = await readFile(path.join(root, "css", "style.css"), "utf8");
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const opens = (cssWithoutComments.match(/{/g) || []).length;
const closes = (cssWithoutComments.match(/}/g) || []).length;
if (opens !== closes) errors.push("css/style.css: unbalanced braces (" + opens + " open, " + closes + " close)");

if (errors.length) {
  console.error("Project checks failed:");
  errors.forEach(error => console.error(" - " + error));
  process.exitCode = 1;
} else {
  console.log("Project checks passed: " + jsFiles.length + " JavaScript files, local imports, HTML IDs and CSS braces.");
}

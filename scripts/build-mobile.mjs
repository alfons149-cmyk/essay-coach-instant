import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist-mobile");

const files = ["book.html", "course-book.pdf", "index.html"];
const directories = ["assets", "css", "feedback", "js", "pdfjs"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(output, file));
}

for (const directory of directories) {
  await cp(resolve(root, directory), resolve(output, directory), {
    recursive: true
  });
}

const indexPath = resolve(output, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const mobileHtml = indexHtml.replace(
  '<base href="/essay-coach-instant/">',
  '<base href="./">'
);

if (mobileHtml === indexHtml) {
  throw new Error("The GitHub Pages base tag was not found in index.html.");
}

await writeFile(indexPath, mobileHtml, "utf8");
console.log("EssayCoach mobile web bundle created in dist-mobile.");

import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const srcDir = resolve(root, "src");
const publicSrcDir = resolve(root, "public", "src");

async function syncPublicAssets() {
  await rm(publicSrcDir, {recursive:true, force:true});
  await mkdir(publicSrcDir, {recursive:true});
  await cp(srcDir, publicSrcDir, {recursive:true});
}

syncPublicAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});

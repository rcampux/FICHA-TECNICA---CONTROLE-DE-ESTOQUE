import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const srcDir = resolve(root, "src");
const publicSrcDir = resolve(root, "public", "src");
const assetsDir = resolve(root, "assets");
const publicAssetsDir = resolve(root, "public", "assets");
const publicEnvFile = resolve(publicSrcDir, "config", "env.js");
const serviceWorkerFile = resolve(root, "service-worker.js");
const publicServiceWorkerFile = resolve(root, "public", "service-worker.js");

function toQuotedString(value) {
  return JSON.stringify(value || "");
}

async function buildPublicEnvConfig() {
  const supabaseUrl = process.env.FICHATEC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.FICHATEC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const requestedMode = process.env.FICHATEC_DATA_MODE || "";
  const dataMode = requestedMode === "supabase" && supabaseUrl && supabaseAnonKey ? "supabase" : "local";

  const contents = `window.FICHATEC_ENV = {
  appName: "FichaTec",
  dataMode: ${toQuotedString(dataMode)},
  supabase: {
    url: ${toQuotedString(supabaseUrl)},
    anonKey: ${toQuotedString(supabaseAnonKey)},
  },
};
`;

  await writeFile(publicEnvFile, contents, "utf8");
}

async function syncPublicAssets() {
  await rm(publicSrcDir, {recursive:true, force:true});
  await rm(publicAssetsDir, {recursive:true, force:true});
  await mkdir(publicSrcDir, {recursive:true});
  await cp(srcDir, publicSrcDir, {recursive:true});
  await cp(assetsDir, publicAssetsDir, {recursive:true});
  await cp(serviceWorkerFile, publicServiceWorkerFile);
  await buildPublicEnvConfig();
}

syncPublicAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const srcDir = resolve(root, "src");
const publicSrcDir = resolve(root, "public", "src");
const assetsDir = resolve(root, "assets");
const publicAssetsDir = resolve(root, "public", "assets");
const publicEnvFile = resolve(publicSrcDir, "config", "env.js");
const publicReleaseFile = resolve(root, "public", "release.json");
const serviceWorkerFile = resolve(root, "service-worker.js");
const publicServiceWorkerFile = resolve(root, "public", "service-worker.js");

function toQuotedString(value) {
  return JSON.stringify(value || "");
}

function normalizeReleaseId(value) {
  return String(value || "local-development")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "local-development";
}

function resolveReleaseId() {
  return normalizeReleaseId(
    process.env.VERCEL_DEPLOYMENT_ID
      || process.env.VERCEL_URL
      || process.env.VERCEL_GIT_COMMIT_SHA
      || process.env.GITHUB_SHA
      || "local-development"
  );
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

async function buildPublicReleaseManifest() {
  const contents = `${JSON.stringify({
    releaseId: resolveReleaseId(),
    canonicalUrl: "https://ficha-tecnica-controle-de-estoque.vercel.app/",
  }, null, 2)}\n`;

  await writeFile(publicReleaseFile, contents, "utf8");
}

async function syncPublicAssets() {
  await rm(publicSrcDir, {recursive:true, force:true});
  await rm(publicAssetsDir, {recursive:true, force:true});
  await mkdir(publicSrcDir, {recursive:true});
  await cp(srcDir, publicSrcDir, {recursive:true});
  await cp(assetsDir, publicAssetsDir, {recursive:true});
  await cp(serviceWorkerFile, publicServiceWorkerFile);
  await buildPublicEnvConfig();
  await buildPublicReleaseManifest();
}

syncPublicAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});

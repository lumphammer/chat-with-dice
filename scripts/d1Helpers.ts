import { parseJSONC } from "#/utils/parseJSONC";
import fs from "fs";
import crypto from "node:crypto";
import path from "node:path";

const HMAC_TRIM_LENGTH = 16;
const D1_ROOT_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
// see https://github.com/cloudflare/workers-sdk/blob/f671934de19985285453af15f396b228b4a0858b/packages/miniflare/src/plugins/d1/index.ts#L133
const UNIQUE_KEY = "miniflare-D1DatabaseObject";

// copied from https://github.com/cloudflare/workers-sdk/blob/f671934de19985285453af15f396b228b4a0858b/packages/miniflare/src/plugins/shared/index.ts#L266
function durableObjectNamespaceIdFromName(uniqueKey: string, name: string) {
  const key = crypto.createHash("sha256").update(uniqueKey).digest();
  const nameHmac = crypto
    .createHmac("sha256", key)
    .update(name)
    .digest()
    .subarray(0, HMAC_TRIM_LENGTH);
  const hmac = crypto
    .createHmac("sha256", key)
    .update(nameHmac)
    .digest()
    .subarray(0, HMAC_TRIM_LENGTH);
  return Buffer.concat([nameHmac, hmac]).toString("hex");
}

export function getLocalPathForD1Binding(binding: string) {
  const wranglerConfig = parseJSONC(fs.readFileSync("wrangler.jsonc", "utf-8"));
  const databaseId = wranglerConfig.d1_databases.find(
    (databaseConfig: any) => databaseConfig.binding === binding,
  ).database_id;
  const namespaceId = durableObjectNamespaceIdFromName(UNIQUE_KEY, databaseId);
  const sqlitePath = path.join(D1_ROOT_DIR, `${namespaceId}.sqlite`);
  return sqlitePath;
}

export function getIdForD1Binding(binding: string, env?: string) {
  const wranglerConfig = parseJSONC(fs.readFileSync("wrangler.jsonc", "utf-8"));
  const databaseConfigs = env
    ? wranglerConfig.env[env].d1_databases
    : wranglerConfig.d1_databases;
  const databaseId = databaseConfigs.find(
    (databaseConfig: any) => databaseConfig.binding === binding,
  ).database_id;
  return databaseId;
}

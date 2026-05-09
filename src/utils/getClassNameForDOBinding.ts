import { parseJSONC } from "#/utils/parseJSONC";
import fs from "fs";

export function getClassNameForDOBinding(binding: string, env?: string) {
  const wranglerConfig = parseJSONC(fs.readFileSync("wrangler.jsonc", "utf-8"));
  const doConfigs = env
    ? wranglerConfig.env[env].durable_objects.bindings
    : wranglerConfig.durable_objects.bindings;
  const className = doConfigs.find(
    (config: any) => config.name === binding,
  ).class_name;
  return className;
}

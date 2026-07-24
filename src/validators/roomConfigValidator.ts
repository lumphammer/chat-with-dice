import { capabilityNames } from "#/capabilities/capabilityNames.ts";
import { jsonObjectValidator } from "./jsonObjectValidator";
import { z } from "zod/v4";

const LEGACY_HAVOC_CAPABILITY_NAMES = new Set(["objectives", "adversaries"]);

/**
 * Existing rooms may have either or both of the capabilities that Havoc
 * Engine replaces. Treat the first legacy/native entry as the one unified
 * capability and discard later duplicates. The capability's config is
 * currently unused, but preserving the first entry keeps this migration
 * lossless at the room-config boundary.
 */
function normalizeLegacyHavocCapabilities(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  const capabilities = Reflect.get(value, "capabilities");
  if (!Array.isArray(capabilities)) {
    return value;
  }

  let hasHavoc = false;
  const normalizedCapabilities = capabilities.flatMap((capability) => {
    if (
      typeof capability !== "object" ||
      capability === null ||
      Array.isArray(capability)
    ) {
      return [capability];
    }

    const name = Reflect.get(capability, "name");
    const isHavoc =
      name === "havoc" ||
      (typeof name === "string" && LEGACY_HAVOC_CAPABILITY_NAMES.has(name));
    if (!isHavoc) {
      return [capability];
    }
    if (hasHavoc) {
      return [];
    }

    hasHavoc = true;
    return [{ ...capability, name: "havoc" }];
  });

  return { ...value, capabilities: normalizedCapabilities };
}

// checks a capability inside a room config, patches up the capability config to
// {} if it doesn't validate as an object, and overall return null if the item
// can't be parsed
const capabilityInfoValidator = z
  .object({
    name: z.enum(capabilityNames),
    config: z.union([z.undefined(), jsonObjectValidator]).catch(undefined),
  })
  .or(z.null())
  .catch(null);

// checks a room's config; the list of capabilities is filtyered to only ones
// which pass validation
export const roomConfigValidator = z.preprocess(
  normalizeLegacyHavocCapabilities,
  z.object({
    version: z.int().min(1),
    capabilities: z
      .array(capabilityInfoValidator)
      .transform((values) => values.filter((value) => value !== null)),
  }),
);

export type RoomConfig = z.infer<typeof roomConfigValidator>;

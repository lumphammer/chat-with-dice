import { capabilityNames } from "#/capabilities/capabilityRegistry.ts";
import { jsonObjectValidator } from "./webSocketMessageSchemas";
import { z } from "zod/v4";

// checks a capability inside a room config, patches up the capability config to
// {} if it doesn't validate as an object, and overall return null if the item
// can't be parsed
const capabilityInfoValidator = z
  .object({
    name: z.enum(capabilityNames),
    config: jsonObjectValidator.catch({}),
  })
  .or(z.null())
  .catch(null);

// checks a room's config; the list of capabilities is filtyered to only ones
// which pass validation
export const roomConfigValidator = z.object({
  version: z.int().min(1),
  capabilities: z
    .array(capabilityInfoValidator)
    .transform((values) => values.filter((value) => value !== null)),
});

export type RoomConfig = z.infer<typeof roomConfigValidator>;

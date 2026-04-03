import { z } from "zod/v4";

export const roomConfigValidator = z.object({
  version: z.int().min(1),
  capabilities: z.array(
    z.object({
      name: z.string(),
      config: z.any(),
    }),
  ),
});

export type RoomConfig = z.infer<typeof roomConfigValidator>;

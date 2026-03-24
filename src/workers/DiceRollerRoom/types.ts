import { z } from "zod/v4";

// Structured types for the `rolls` JSON column, matching the shape of
// DiceRoll.toJSON().rolls from @dice-roller/rpg-dice-roller

export const sessionAttachmentSchema = z.object({
  chatId: z.uuid(),
});

export type SessionAttachment = z.infer<typeof sessionAttachmentSchema>;

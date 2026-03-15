import type { rollerMessageSchema } from "./rollerMessageSchema";
import { z } from "zod/v4";

export type RollerMessage = z.infer<typeof rollerMessageSchema>;

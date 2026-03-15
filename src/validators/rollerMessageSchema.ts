import { Messages } from "../schemas/roller-schema";
import { createSelectSchema } from "drizzle-orm/zod";

export const rollerMessageSchema = createSelectSchema(Messages);

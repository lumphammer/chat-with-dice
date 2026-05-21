import { VIEW_MODE_STORAGE_KEY } from "#/constants";
import { storageConsentStore } from "#/stores";
import { createPersistentStore } from "#/utils/createPersistentStore";
import type { StoreValue } from "nanostores";
import * as z from "zod";

export type ViewMode = StoreValue<typeof viewModeStore>;

export const viewModeStore = createPersistentStore({
  defaultValue: "list" as const,
  key: VIEW_MODE_STORAGE_KEY,
  validator: z.enum(["list", "grid"]),
  consentStore: storageConsentStore,
});

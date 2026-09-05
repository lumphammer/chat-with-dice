import { createContext } from "react";

/** External navigation opens the right sidebar; left panels keep their place. */
export const SidebarSideContext = createContext<"left" | "right">("right");

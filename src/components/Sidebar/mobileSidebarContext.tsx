import { type PropsWithChildren, createContext, useContext } from "react";

const CloseMobileSidebarContext = createContext<(() => void) | null>(null);

export const MobileSidebarControlsProvider = ({
  children,
  closeMobileSidebar,
}: PropsWithChildren<{ closeMobileSidebar: () => void }>) => (
  <CloseMobileSidebarContext.Provider value={closeMobileSidebar}>
    {children}
  </CloseMobileSidebarContext.Provider>
);

export const useCloseMobileSidebar = () => {
  const closeMobileSidebar = useContext(CloseMobileSidebarContext);
  if (!closeMobileSidebar) {
    throw new Error(
      "useCloseMobileSidebar must be used within a MobileSidebarControlsProvider",
    );
  }
  return closeMobileSidebar;
};

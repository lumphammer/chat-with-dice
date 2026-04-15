import type { RoomConfig } from "#/validators/roomConfigValidator";
import { memo } from "react";

export const Config = memo(({ config }: { config: RoomConfig }) => {
  return (
    <>
      <h2 className="text-xl">Config Zone</h2>
      <ul>
        {config?.capabilities.map((capInfo) => (
          <li key={capInfo.name}>{capInfo.name}</li>
        ))}
      </ul>
    </>
  );
});

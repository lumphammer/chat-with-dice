import { useRoomConfigContext } from "../DiceRoller/contexts/roomConfigContext";
import { memo, useState } from "react";

export const Config = memo(() => {
  const {
    roomConfig: initialRoomConfig,
    setRoomConfig,
    roomName: initialRoomName,
    setRoomName,
  } = useRoomConfigContext();

  const [name, setName] = useState(initialRoomName);

  return (
    <>
      <h2 className="text-xl">Config Zone</h2>
      <ul>
        {initialRoomConfig?.capabilities.map((capInfo) => (
          <li key={capInfo.name}>{capInfo.name}</li>
        ))}
      </ul>
    </>
  );
});

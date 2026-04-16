import { useEffect, useRef, useState } from "react";

export const useStateWithRef = <T>(initialValue: T) => {
  const [value, setValue] = useState(initialValue);
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return [value, setValue, ref] as const;
};

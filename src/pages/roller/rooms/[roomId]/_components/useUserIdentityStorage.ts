import { authClient } from "@/lib/auth-client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseUserIdentityStorageReturn = {
  userIdentity: { username: string; userId: string };
} & (
  | { loggedIn: false; handleSetUsername: (newUsername: string) => void }
  | { loggedIn: true; handleSetUsername: null }
);

export const useUserIdentityStorage = (): UseUserIdentityStorageReturn => {
  const { data: sessionData, isPending } = authClient.useSession();

  const [username, setUsername] = useState<string>(
    localStorage.getItem("username") ?? "",
  );
  const [userId, setUserId] = useState<string>(
    localStorage.getItem("userId") ?? "",
  );
  useEffect(() => {
    if (userId === "" && !isPending) {
      const newUserId = crypto.randomUUID();
      localStorage.setItem("userId", newUserId);
      setUserId(newUserId);
    }
  }, [userId, isPending]);

  const handleSetUsername = useCallback((newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem("username", newUsername);
  }, []);

  const userIdentity = useMemo(
    () => ({ username, userId }),
    [username, userId],
  );

  if (sessionData && sessionData.user) {
    return {
      loggedIn: true,
      handleSetUsername: null,
      userIdentity: {
        username: sessionData.user.name,
        userId: sessionData.user.id,
      },
    };
  } else {
    return { loggedIn: false, userIdentity, handleSetUsername };
  }
};

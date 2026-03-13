import {
  CHAT_ID_LOCAL_STORAGE_KEY,
  DISPLAY_NAME_LOCAL_STORAGE_KEY,
} from "#/constants";
import { authClient } from "#/lib/auth-client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseUserIdentityStorageReturn = {
  userIdentity: { displayName: string; chatId: string };
  isPending: boolean;
} & (
  | { loggedIn: false; handleSetDisplayName: (newDisplayName: string) => void }
  | { loggedIn: true; handleSetDisplayName: null }
);

export const useUserIdentityStorage = (): UseUserIdentityStorageReturn => {
  const { data: sessionData, isPending } = authClient.useSession();

  const [localDisplayName, setLocalDislayName] = useState<string>(
    localStorage.getItem(DISPLAY_NAME_LOCAL_STORAGE_KEY) ?? "",
  );

  const [localChatId, setLocalChatId] = useState<string>(
    localStorage.getItem(CHAT_ID_LOCAL_STORAGE_KEY) ?? "",
  );

  useEffect(() => {
    if (localChatId === "" && !isPending && !sessionData) {
      const newUserId = crypto.randomUUID();
      localStorage.setItem(CHAT_ID_LOCAL_STORAGE_KEY, newUserId);
      setLocalChatId(newUserId);
    }
  }, [localChatId, isPending, sessionData]);

  const handleSetDisplayName = useCallback((newDisplayName: string) => {
    setLocalDislayName(newDisplayName);
    localStorage.setItem(DISPLAY_NAME_LOCAL_STORAGE_KEY, newDisplayName);
  }, []);

  const userIdentity = useMemo(
    () => ({ displayName: localDisplayName, chatId: localChatId }),
    [localDisplayName, localChatId],
  );

  if (sessionData && sessionData.user) {
    return {
      loggedIn: true,
      handleSetDisplayName: null,
      isPending,
      userIdentity: {
        displayName: sessionData.user.name,
        chatId: sessionData.user.chatId,
      },
    };
  } else {
    return { loggedIn: false, userIdentity, handleSetDisplayName, isPending };
  }
};

import {
  CHAT_ID_LOCAL_STORAGE_KEY,
  DISPLAY_NAME_LOCAL_STORAGE_KEY,
} from "#/constants";
import { authClient } from "#/utils/auth-client";
import { hasCookieConsent } from "#/utils/hasCookieConsent";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseUserIdentityStorageReturn = {
  userIdentity: { displayName: string; chatId: string; isOwner: boolean };
  isPending: boolean;
  roomOwnerId: string;
} & (
  | { loggedIn: false; handleSetDisplayName: (newDisplayName: string) => void }
  | { loggedIn: true; handleSetDisplayName: null }
);

export const useUserIdentityStorage = ({
  roomOwnerId,
}: {
  roomOwnerId: string;
}): UseUserIdentityStorageReturn => {
  const { data: sessionData, isPending } = authClient.useSession();

  const [localDisplayName, setLocalDislayName] = useState<string>(
    localStorage.getItem(DISPLAY_NAME_LOCAL_STORAGE_KEY) ??
      sessionStorage.getItem(DISPLAY_NAME_LOCAL_STORAGE_KEY) ??
      "",
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
    if (hasCookieConsent()) {
      localStorage.setItem(DISPLAY_NAME_LOCAL_STORAGE_KEY, newDisplayName);
    } else {
      sessionStorage.setItem(DISPLAY_NAME_LOCAL_STORAGE_KEY, newDisplayName);
    }
  }, []);

  // const isOwner = roomOwnerId ===

  const localUserIdentity = useMemo(
    () => ({
      displayName: localDisplayName,
      chatId: localChatId,
      isOwner: false,
    }),
    [localDisplayName, localChatId],
  );

  if (sessionData && sessionData.user) {
    return {
      loggedIn: true,
      handleSetDisplayName: null,
      isPending,
      roomOwnerId,
      userIdentity: {
        isOwner: roomOwnerId === sessionData.user.chatId,
        displayName: sessionData.user.name,
        chatId: sessionData.user.chatId,
      },
    };
  } else {
    return {
      loggedIn: false,
      roomOwnerId,
      userIdentity: localUserIdentity,
      handleSetDisplayName,
      isPending,
    };
  }
};

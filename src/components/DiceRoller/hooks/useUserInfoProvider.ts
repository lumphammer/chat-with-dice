import { chatIdStore, displayNameStore } from "#/stores";
import { authClient } from "#/utils/auth-client";
import type { UserInfo } from "../types";
import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";

export const useUserInfoProvider = ({
  roomOwnerId,
}: {
  roomOwnerId: string;
}): UserInfo => {
  const { data: sessionData, isPending } = authClient.useSession();
  const localDisplayName = useStore(displayNameStore);
  const localChatId = useStore(chatIdStore);

  useEffect(() => {
    if (localChatId === null && !isPending && !sessionData) {
      chatIdStore.set(crypto.randomUUID());
    }
  }, [localChatId, isPending, sessionData]);

  const handleSetDisplayName = useCallback((newDisplayName: string) => {
    displayNameStore.set(newDisplayName);
  }, []);

  if (sessionData && sessionData.user) {
    return {
      loggedIn: true,
      handleSetDisplayName: null,
      isPending,
      roomOwnerId,
      isOwner: roomOwnerId === sessionData.user.chatId,
      displayName: sessionData.user.name,
      chatId: sessionData.user.chatId,
    };
  } else {
    return {
      displayName: localDisplayName,
      chatId: localChatId,
      isOwner: false,
      loggedIn: false,
      roomOwnerId,
      handleSetDisplayName,
      isPending: localDisplayName === null,
    };
  }
};

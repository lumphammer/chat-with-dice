import { chatIdStore, displayNameStore, useStore } from "#/stores/millistore";
import { authClient } from "#/utils/auth-client";
import type { UserInfo } from "../types";
import { useEffect } from "react";

export const useUserInfoProvider = ({
  roomOwnerId,
}: {
  roomOwnerId: string;
}): UserInfo => {
  const { data: sessionData, isPending } = authClient.useSession();
  const [localDisplayName, setLocalDislayName] = useStore(displayNameStore);
  const [localChatId, setLocalChatId] = useStore(chatIdStore);

  useEffect(() => {
    if (localChatId === null && !isPending && !sessionData) {
      setLocalChatId(crypto.randomUUID());
    }
  }, [localChatId, isPending, sessionData, setLocalChatId]);

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
      handleSetDisplayName: setLocalDislayName,
      isPending: localDisplayName === null,
    };
  }
};

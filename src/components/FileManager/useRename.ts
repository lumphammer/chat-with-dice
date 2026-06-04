import { filesCapability } from "#/capabilities/filesCapability";
import { authClient } from "#/utils/auth-client";
import type { StorageNode } from "#/validators/storageNodeValidator.ts";
import { actions } from "astro:actions";
import { useRef, useState } from "react";

export const useRename = ({
  node,
  onRenamed,
  onClick,
}: {
  node: StorageNode;
  onRenamed: (nodeId: string, newName: string) => void;
  onClick: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesCap = filesCapability.useMount();
  const { data: sessionData } = authClient.useSession();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [renameError, setRenameError] = useState<string | null>(null);

  const handleStartRename = () => {
    setRenameValue(node.name);
    setRenameError(null);
    setIsRenaming(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const handleCommitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === node.name) {
      setIsRenaming(false);
      setRenameError(null);
      return;
    }

    const result = await actions.files.renameNode({
      nodeId: node.id,
      newName: trimmed,
    });

    if (result.error) {
      setRenameError(result.error.message);
      return;
    }

    const ownerUserId = sessionData?.user.id;
    if (filesCap.initialised && ownerUserId) {
      filesCap.actions.renameShare({
        nodeId: node.id,
        ownerUserId,
        newName: trimmed,
      });
    }

    onRenamed(node.id, trimmed);
    setIsRenaming(false);
    setRenameError(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCommitRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setRenameError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming) {
      onClick();
    }
  };

  return {
    handleStartRename,
    handleCommitRename,
    handleRenameKeyDown,
    handleKeyDown,
    isRenaming,
    inputRef,
    renameValue,
    setRenameValue,
    renameError,
  };
};

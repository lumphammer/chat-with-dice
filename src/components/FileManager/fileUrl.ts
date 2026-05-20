export const SELF_OWNER_SEGMENT = "~";

type BuildFileUrlOptions = {
  roomId?: string;
  suffix?: "thumbnail";
};

export const buildFileUrl = (
  ownerUserId: string | undefined,
  nodeId: string,
  options?: BuildFileUrlOptions,
) => {
  const owner = ownerUserId ?? SELF_OWNER_SEGMENT;
  const tail = options?.suffix ? `/${options.suffix}` : "";
  const query = options?.roomId
    ? `?roomId=${encodeURIComponent(options.roomId)}`
    : "";
  return `/api/files/${encodeURIComponent(owner)}/${encodeURIComponent(nodeId)}${tail}${query}`;
};

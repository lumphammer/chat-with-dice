type DirectRoomShare = {
  nodeId: string;
  userId: string;
};

type RoomShareIdentity = {
  nodeId: string;
  ownerUserId: string;
};

const isDirectRoomShare = (
  share: DirectRoomShare,
  { nodeId, ownerUserId }: RoomShareIdentity,
) => share.nodeId === nodeId && share.userId === ownerUserId;

export const hasDirectRoomShare = (
  shares: readonly DirectRoomShare[],
  identity: RoomShareIdentity,
) => shares.some((share) => isDirectRoomShare(share, identity));

export const removeDirectRoomShare = (
  shares: DirectRoomShare[],
  identity: RoomShareIdentity,
) => {
  const index = shares.findIndex((share) => isDirectRoomShare(share, identity));
  if (index !== -1) {
    shares.splice(index, 1);
  }
};

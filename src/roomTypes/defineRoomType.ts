import type { RoomType } from "#/types";

export type UserRoomDef<TState> = {
  displayName: string;
  version: number;
  migrations: Record<number, (start: unknown) => unknown>[];
  rollTypes: Partial<Record<RoomType, string>>;
  initialState: TState;
  initialize: () => void;
  // commands:
};

// export const defineRoomType = <TState>(_def: UserRoomDef<TState>) => {
//   const createAction = (key: string, () => TState)
//   return {createAction};
// };

export type State = {
  objectives: { displayName: string; score: number }[];
};

// const _exampleRoomType = defineRoomType<State>({
//   displayName: "Example Room",
//   rollTypes: { havoc: "Havoc" },
//   initialState: { objectives: [] },
// });

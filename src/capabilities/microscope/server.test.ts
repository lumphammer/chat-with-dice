import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  getInitialMicroscopeState,
  type MicroscopeState,
} from "#/capabilities/microscope/common";
import { microscopeServer } from "#/capabilities/microscope/server";
import type { ChatMessage } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { nanoid } from "nanoid";
import { describe, expect, test, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

const makeStateRepository = (initialState: MicroscopeState) => {
  const kv = new Map<string, unknown>();
  const storage = {
    get: (key: string) => kv.get(key),
    put: (key: string, value: unknown) => kv.set(key, value),
    delete: (key: string) => kv.delete(key),
    list: () => kv.entries(),
  };
  const repository = new CapabilityStateRepository(
    storage as unknown as SyncKvStorage,
  );
  repository.set("microscope", initialState);
  return repository;
};

const mountWith = async (initialState: MicroscopeState) => {
  const sentMessages: ChatMessage[] = [];
  const messageJiggler = {
    sendChatMessage: (message: ChatMessage) => {
      sentMessages.push(message);
    },
  } as unknown as MessageJiggler;
  const broadcaster = {
    broadcast: () => {},
  } as unknown as Broadcaster;

  const mounted = await microscopeServer.mount({
    doCtx: {} as unknown as DurableObjectState,
    messageJiggler,
    stateRepository: makeStateRepository(initialState),
    config: undefined,
    nodeShareManager: {} as unknown as NodeShareManager,
    broadcaster,
    getRoomOwnerUserId: async () => undefined,
    dispatchHook: async () => {},
  });
  if (!mounted) throw new Error("microscope capability failed to mount");
  return { mounted, sentMessages };
};

const editScene = (
  mounted: ServerMountedCapability,
  sceneId: string,
  question: string,
  answer: string,
  userId = "answerer-user",
  displayName = "Answerer",
) =>
  mounted.onMessage({
    actionCall: {
      correlation: nanoid(),
      actionName: "editItem",
      params: {
        id: sceneId,
        tone: "light",
        text: question,
        answer,
      },
    },
    userId,
    displayName,
  });

const stateWithScene = (
  answer = "",
): { sceneId: string; state: MicroscopeState } => {
  const sceneId = nanoid();
  return {
    sceneId,
    state: {
      ...getInitialMicroscopeState(),
      periods: [
        {
          id: nanoid(),
          tone: "light",
          text: "The beginning",
          events: [
            {
              id: nanoid(),
              tone: "dark",
              text: "The gates open",
              scenes: [
                {
                  id: sceneId,
                  tone: "light",
                  question: "Who opened them?",
                  answer,
                },
              ],
            },
          ],
        },
      ],
    },
  };
};

describe("answering scenes", () => {
  test("posts the edited question and first answer as the answerer", async () => {
    const { state, sceneId } = stateWithScene();
    const { mounted, sentMessages } = await mountWith(state);

    await editScene(
      mounted,
      sceneId,
      "Who unbarred the gates?",
      "The keeper did",
      "another-user",
      "Another User",
    );

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toMatchObject({
      userId: "another-user",
      displayName: "Another User",
      capabilityName: "microscope",
      capabilityData: {
        kind: "sceneAnswered",
        question: "Who unbarred the gates?",
        answer: "The keeper did",
      },
    });
  });

  test("does not post for later answer edits", async () => {
    const { state, sceneId } = stateWithScene("The keeper did");
    const { mounted, sentMessages } = await mountWith(state);

    await editScene(
      mounted,
      sceneId,
      "Who opened them?",
      "The keeper did, knowingly",
    );

    expect(sentMessages).toHaveLength(0);
  });

  test("does not post when an edit leaves the answer empty", async () => {
    const { state, sceneId } = stateWithScene();
    const { mounted, sentMessages } = await mountWith(state);

    await editScene(mounted, sceneId, "Who opened them?", "");

    expect(sentMessages).toHaveLength(0);
  });
});

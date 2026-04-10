import { createCapability } from "./createCapability";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

export const adversariesCapability = createCapability({
  name: "adversaries",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({
    adversaries: z.array(
      z.object({
        id: z.nanoid(),
        name: z.string(),
        threat: z.int().min(0),
        difficulty: z.int().min(0),
        startingResilience: z.int(),
        resilience: z.int(),
      }),
    ),
  }),
  getInitialState: () => ({ adversaries: [] }),
  initialise: async () => {},
  buildActions: ({ createAction }) => ({
    createAdversary: createAction({
      payloadValidator: z.object({
        name: z.string(),
        threat: z.int().min(0),
        difficulty: z.int().min(0),
        startingResilience: z.int().min(1),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.adversaries.push({
          id: nanoid(),
          name: payload.name,
          threat: payload.threat,
          difficulty: payload.difficulty,
          resilience: payload.startingResilience,
          startingResilience: payload.startingResilience,
        });
      },
    }),
    updateAdversary: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        name: z.string(),
        threat: z.int().min(0),
        difficulty: z.int().min(0),
        startingResilience: z.int().min(1),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const adversary = stateDraft.adversaries.find(
          (a) => a.id === payload.id,
        );
        if (adversary) {
          const damageTaken =
            adversary.startingResilience - adversary.resilience;
          const newDamageTaken = Math.min(
            damageTaken,
            payload.startingResilience,
          );
          adversary.name = payload.name;
          adversary.threat = payload.threat;
          adversary.difficulty = payload.difficulty;
          adversary.startingResilience = payload.startingResilience;
          adversary.resilience = payload.startingResilience - newDamageTaken;
        }
      },
    }),
    deleteAdversary: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.adversaries = stateDraft.adversaries.filter(
          (a) => a.id !== payload.id,
        );
      },
    }),
    setResilience: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        resilience: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const adversary = stateDraft.adversaries.find(
          (a) => a.id === payload.id,
        );
        if (adversary) {
          adversary.resilience = payload.resilience;
        }
      },
      effectfulFn: ({ pureFn, payload, stateDraft }) => {
        pureFn({ payload, stateDraft });
      },
    }),
  }),
});

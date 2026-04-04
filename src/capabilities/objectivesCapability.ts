import { createCapability } from "./createCapability";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

// const stateValidator = ;

export const objectivesCapability = createCapability({
  name: "objectives",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({
    objectives: z.array(
      z.object({
        id: z.nanoid(),
        isPrimary: z.boolean(),
        name: z.string(),
        difficulty: z.int().min(0),
        startingResilience: z.int(),
        resilience: z.int(),
      }),
    ),
  }),
  getInitialState: () => ({ objectives: [] }),
  initialise: async () => {},
  buildActions: ({ createSimpleAction }) => ({
    createObjective: createSimpleAction({
      payloadValidator: z.object({
        name: z.string(),
        startingResilience: z.int(),
        isPrimary: z.boolean(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        stateDraft.objectives.push({
          id: nanoid(),
          name: payload.name,
          difficulty: 0,
          resilience: payload.startingResilience,
          startingResilience: payload.startingResilience,
          isPrimary: payload.isPrimary,
        });
      },
    }),
    renameObjective: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        newName: z.string(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.name = payload.newName;
        }
      },
    }),
    setObjectivePrimary: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        isPrimary: z.boolean(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.isPrimary = payload.isPrimary;
        }
      },
    }),
    deleteObjective: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        stateDraft.objectives = stateDraft.objectives.filter(
          (o) => o.id !== payload.id,
        );
      },
    }),
    setResilience: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        resilience: z.int(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.resilience = payload.resilience;
        }
      },
    }),
    setStartingResilience: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        startingResilience: z.int(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.startingResilience = payload.startingResilience;
        }
      },
    }),
    setDifficulty: createSimpleAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        difficulty: z.int(),
      }),
      actionFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.difficulty = payload.difficulty;
        }
      },
    }),
  }),
});

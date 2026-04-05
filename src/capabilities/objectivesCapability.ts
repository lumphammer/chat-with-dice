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
  buildActions: ({ createAction }) => ({
    createObjective: createAction({
      payloadValidator: z.object({
        name: z.string(),
        startingResilience: z.int(),
        isPrimary: z.boolean(),
        difficulty: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.objectives.push({
          id: nanoid(),
          name: payload.name,
          difficulty: payload.difficulty,
          resilience: payload.startingResilience,
          startingResilience: payload.startingResilience,
          isPrimary: payload.isPrimary,
        });
      },
    }),
    updateObjective: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        name: z.string(),
        isPrimary: z.boolean(),
        difficulty: z.int().min(0),
        startingResilience: z.int().min(1),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          const damageTaken =
            objective.startingResilience - objective.resilience;
          const newDamageTaken = Math.min(
            damageTaken,
            payload.startingResilience,
          );
          objective.name = payload.name;
          objective.isPrimary = payload.isPrimary;
          objective.difficulty = payload.difficulty;
          objective.startingResilience = payload.startingResilience;
          objective.resilience = payload.startingResilience - newDamageTaken;
        }
      },
    }),
    deleteObjective: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
      }),
      pureFn: ({ stateDraft, payload }) => {
        stateDraft.objectives = stateDraft.objectives.filter(
          (o) => o.id !== payload.id,
        );
      },
    }),
    setResilience: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        resilience: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (o) => o.id === payload.id,
        );
        if (objective) {
          objective.resilience = payload.resilience;
        }
      },
      effectfulFn: ({ pureFn, payload, stateDraft }) => {
        pureFn({ payload, stateDraft });
      },
    }),
  }),
});

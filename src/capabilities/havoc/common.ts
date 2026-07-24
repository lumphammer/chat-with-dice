import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

const adversaryValidator = z.object({
  id: z.nanoid(),
  name: z.string(),
  threat: z.int().min(0),
  difficulty: z.int().min(0),
  startingResilience: z.int(),
  resilience: z.int(),
});

const objectiveValidator = z.object({
  id: z.nanoid(),
  isPrimary: z.boolean(),
  name: z.string(),
  difficulty: z.int().min(0),
  startingResilience: z.int(),
  resilience: z.int(),
});

export const havocStateValidator = z.object({
  adversaries: z.array(adversaryValidator),
  objectives: z.array(objectiveValidator),
});

export type Adversary = z.infer<typeof adversaryValidator>;
export type Objective = z.infer<typeof objectiveValidator>;
export type HavocState = z.infer<typeof havocStateValidator>;

export const havocCommon = createCapabilityCommon({
  name: "havoc",
  displayName: "Havoc Engine",
  visibility: "public",
  state: {
    validator: havocStateValidator,
    getInitialState: () => ({ adversaries: [], objectives: [] }),
  },
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
          (candidate) => candidate.id === payload.id,
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
          (adversary) => adversary.id !== payload.id,
        );
      },
    }),
    setAdversaryResilience: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        resilience: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const adversary = stateDraft.adversaries.find(
          (candidate) => candidate.id === payload.id,
        );
        if (adversary) {
          adversary.resilience = payload.resilience;
        }
      },
    }),
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
          (candidate) => candidate.id === payload.id,
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
          (objective) => objective.id !== payload.id,
        );
      },
    }),
    setObjectiveResilience: createAction({
      payloadValidator: z.object({
        id: z.nanoid(),
        resilience: z.int().min(0),
      }),
      pureFn: ({ stateDraft, payload }) => {
        const objective = stateDraft.objectives.find(
          (candidate) => candidate.id === payload.id,
        );
        if (objective) {
          objective.resilience = payload.resilience;
        }
      },
    }),
  }),
});

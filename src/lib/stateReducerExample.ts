import { createStateReducer, type InferReducerState } from "./stateReducer";
import { z } from "zod";

const objectiveSchema = z.object({
  score: z.number().min(0),
  id: z.string(),
  displayName: z.string(),
});

const exampleReducer = createStateReducer(
  z.object({ objectives: z.array(objectiveSchema) }),
  (create) => ({
    createObjective: create(
      z.object({ displayName: z.string() }),
      (draft, payload) => {
        draft.objectives.push({
          score: 0,
          id: crypto.randomUUID(),
          displayName: payload.displayName,
        });
      },
    ),
    increment: create(
      z.object({ objectiveId: z.string() }),
      (draft, payload) => {
        const objective = draft.objectives.find(
          (o) => o.id === payload.objectiveId,
        );
        if (objective) {
          objective.score += 1;
        }
      },
    ),
    reset: create(z.object({ objectiveId: z.string() }), (draft, payload) => {
      const objective = draft.objectives.find(
        (o) => o.id === payload.objectiveId,
      );
      if (objective) {
        objective.score = 0;
      }
    }),
  }),
);

// Extract state type for use elsewhere
type _ExampleState = InferReducerState<typeof exampleReducer>;

const initialState: _ExampleState = {
  objectives: [],
};

const state2 = exampleReducer.reducer(
  initialState,
  exampleReducer.creators.createObjective({ displayName: "foo" }),
);

const objectiveId = state2.objectives[0].id;

const _state3 = exampleReducer.reducer(
  initialState,
  exampleReducer.creators.increment({ objectiveId }),
);

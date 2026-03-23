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

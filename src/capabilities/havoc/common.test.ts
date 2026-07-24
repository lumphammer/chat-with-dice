import type { CommonActionDefinition } from "#/capabilities/createCapabilityCommon";
import { havocCommon, type HavocState, havocStateValidator } from "./common";
import { produce } from "immer";
import { describe, expect, test } from "vitest";
import type * as z from "zod";

const ADVERSARY_ID = "adversary123456789012";
const OBJECTIVE_ID = "objective123456789012";

function runAction<TPayloadValidator extends z.ZodType>(
  state: HavocState,
  action: CommonActionDefinition<HavocState, TPayloadValidator>,
  payload: unknown,
): HavocState {
  const validatedPayload = action.payloadValidator.parse(payload);
  return produce(state, (stateDraft) => {
    action.pureFn?.({ stateDraft, payload: validatedPayload });
  });
}

const populatedState = (): HavocState => ({
  adversaries: [
    {
      id: ADVERSARY_ID,
      name: "The Ash Knight",
      threat: 2,
      difficulty: 1,
      startingResilience: 5,
      resilience: 3,
    },
  ],
  objectives: [
    {
      id: OBJECTIVE_ID,
      name: "Seal the gate",
      isPrimary: true,
      difficulty: 2,
      startingResilience: 4,
      resilience: 3,
    },
  ],
});

describe("havocCommon", () => {
  test("starts with empty adversary and objective collections", () => {
    expect(havocCommon.state?.getInitialState({ config: undefined })).toEqual({
      adversaries: [],
      objectives: [],
    });
    expect(
      havocStateValidator.safeParse({ adversaries: [], objectives: [] })
        .success,
    ).toBe(true);
  });

  test("creates, damages, updates, and deletes an adversary independently", () => {
    const initial = populatedState();
    const created = runAction(initial, havocCommon.actions.createAdversary, {
      name: "Glass Hound",
      threat: 3,
      difficulty: 2,
      startingResilience: 4,
    });
    const newAdversary = created.adversaries[1];

    expect(newAdversary).toMatchObject({
      name: "Glass Hound",
      threat: 3,
      difficulty: 2,
      startingResilience: 4,
      resilience: 4,
    });
    expect(created.objectives).toEqual(initial.objectives);

    const damaged = runAction(
      created,
      havocCommon.actions.setAdversaryResilience,
      { id: newAdversary.id, resilience: 1 },
    );
    const updated = runAction(damaged, havocCommon.actions.updateAdversary, {
      id: newAdversary.id,
      name: "Glass Hound Alpha",
      threat: 4,
      difficulty: 3,
      startingResilience: 6,
    });

    expect(updated.adversaries[1]).toMatchObject({
      name: "Glass Hound Alpha",
      threat: 4,
      difficulty: 3,
      startingResilience: 6,
      resilience: 3,
    });

    const deleted = runAction(updated, havocCommon.actions.deleteAdversary, {
      id: newAdversary.id,
    });
    expect(deleted.adversaries).toEqual(initial.adversaries);
    expect(deleted.objectives).toEqual(initial.objectives);
  });

  test("creates, damages, updates, and deletes an objective independently", () => {
    const initial = populatedState();
    const created = runAction(initial, havocCommon.actions.createObjective, {
      name: "Break the crown",
      isPrimary: false,
      difficulty: 3,
      startingResilience: 5,
    });
    const newObjective = created.objectives[1];

    expect(newObjective).toMatchObject({
      name: "Break the crown",
      isPrimary: false,
      difficulty: 3,
      startingResilience: 5,
      resilience: 5,
    });
    expect(created.adversaries).toEqual(initial.adversaries);

    const damaged = runAction(
      created,
      havocCommon.actions.setObjectiveResilience,
      { id: newObjective.id, resilience: 2 },
    );
    const updated = runAction(damaged, havocCommon.actions.updateObjective, {
      id: newObjective.id,
      name: "Shatter the crown",
      isPrimary: true,
      difficulty: 4,
      startingResilience: 7,
    });

    expect(updated.objectives[1]).toMatchObject({
      name: "Shatter the crown",
      isPrimary: true,
      difficulty: 4,
      startingResilience: 7,
      resilience: 4,
    });

    const deleted = runAction(updated, havocCommon.actions.deleteObjective, {
      id: newObjective.id,
    });
    expect(deleted.objectives).toEqual(initial.objectives);
    expect(deleted.adversaries).toEqual(initial.adversaries);
  });

  test("clamps preserved damage when starting resilience is reduced", () => {
    const state = populatedState();
    const adversaryState = runAction(
      state,
      havocCommon.actions.updateAdversary,
      {
        id: ADVERSARY_ID,
        name: "The Ash Knight",
        threat: 2,
        difficulty: 1,
        startingResilience: 1,
      },
    );
    const objectiveState = runAction(
      adversaryState,
      havocCommon.actions.updateObjective,
      {
        id: OBJECTIVE_ID,
        name: "Seal the gate",
        isPrimary: true,
        difficulty: 2,
        startingResilience: 1,
      },
    );

    expect(objectiveState.adversaries[0].resilience).toBe(0);
    expect(objectiveState.objectives[0].resilience).toBe(0);
  });

  test("retains every action's payload constraints", () => {
    expect(
      havocCommon.actions.createAdversary.payloadValidator.safeParse({
        name: "Invalid",
        threat: -1,
        difficulty: 0,
        startingResilience: 1,
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.updateAdversary.payloadValidator.safeParse({
        id: "invalid",
        name: "Invalid",
        threat: 0,
        difficulty: 0,
        startingResilience: 1,
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.deleteAdversary.payloadValidator.safeParse({
        id: "invalid",
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.setAdversaryResilience.payloadValidator.safeParse({
        id: ADVERSARY_ID,
        resilience: -1,
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.createObjective.payloadValidator.safeParse({
        name: "Invalid",
        isPrimary: false,
        difficulty: -1,
        startingResilience: 1,
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.updateObjective.payloadValidator.safeParse({
        id: OBJECTIVE_ID,
        name: "Invalid",
        isPrimary: false,
        difficulty: 0,
        startingResilience: 0,
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.deleteObjective.payloadValidator.safeParse({
        id: "invalid",
      }).success,
    ).toBe(false);
    expect(
      havocCommon.actions.setObjectiveResilience.payloadValidator.safeParse({
        id: OBJECTIVE_ID,
        resilience: -1,
      }).success,
    ).toBe(false);
  });
});

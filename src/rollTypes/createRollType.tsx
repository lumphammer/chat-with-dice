import type {
  JsonData,
  JsonValidator,
} from "#/validators/webSocketMessageSchemas";
import type { MessageJiggler } from "#/workers/DiceRollerRoom/MessageJiggler";
import { useCallback, useEffect, type ComponentType } from "react";
import type { z } from "zod";

export type RollInputComponent<TFormula extends JsonData> =
  React.ComponentType<{
    onChange: (formula: TFormula) => void;
  }>;

export type RollTypeDefinition<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
> = {
  formulaValidator: TFormulaValidator;
  resultValidator: TResultValidator;
  // Always required — even retired roll types need to display old results
  DisplayComponent: React.ComponentType<{
    formula: z.infer<TFormulaValidator>;
    result: z.infer<TResultValidator>;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TFormulaValidator>) => void;
  }>;
  defaultFormula: z.infer<TFormulaValidator>;
  handler: (tools: {
    formula: z.infer<TFormulaValidator>;
    messageJiggler: MessageJiggler;
  }) => z.infer<TResultValidator>;
};

export type RollType<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
> = {
  DisplayComponent: ComponentType<{
    formula: z.infer<TFormulaValidator>;
    result: z.infer<TResultValidator>;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TFormulaValidator>) => void;
  }>;
  handler: (tools: {
    formula: JsonData;
    messageJiggler: MessageJiggler;
  }) => z.infer<TResultValidator>;
  formulaValidator: TFormulaValidator;
  resultValidator: TResultValidator;
};

export type AnyRollType = RollType<any, any>;

export function createRollType<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
>(
  def: RollTypeDefinition<TFormulaValidator, TResultValidator>,
): RollType<TFormulaValidator, TResultValidator> {
  return {
    // outwardly visible display ui
    DisplayComponent: ({
      formula: rawFormula,
      result: rawResult,
    }: {
      formula: unknown;
      result: unknown;
    }) => {
      const formula = def.formulaValidator.parse(rawFormula);
      const result = def.resultValidator.parse(rawResult);
      return <def.DisplayComponent formula={formula} result={result} />;
    },
    // outwardly visible input ui
    InputComponent: ({
      onChange,
    }: {
      onChange: (formula: z.infer<TFormulaValidator>) => void;
    }) => {
      useEffect(() => {
        onChange(def.defaultFormula);
      }, [onChange]);
      const handleChange = useCallback(
        (newFormula: z.infer<TFormulaValidator>) => onChange(newFormula),
        [onChange],
      );
      return <def.InputComponent onChange={handleChange} />;
    },
    handler: (tools: { formula: JsonData; messageJiggler: MessageJiggler }) => {
      console.log(tools.formula);
      const formula = def.formulaValidator.parse(tools.formula);
      const result = def.handler({
        formula,
        messageJiggler: tools.messageJiggler,
      });
      return result;
    },
    formulaValidator: def.formulaValidator,
    resultValidator: def.resultValidator,
  };
}

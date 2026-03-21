import { useCallback, type ComponentType } from "react";
import type { z } from "zod";

export type RollInputComponent<TReq> = React.ComponentType<{
  onChange: (request: TReq) => void;
}>;

export type UserRollDef<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
> = {
  formulaValidator: TReq;
  resultValidator: TRes;
  // Always required — even retired roll types need to display old results
  DisplayComponent: React.ComponentType<{
    formula: z.infer<TReq>;
    result: z.infer<TRes>;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TReq>) => void;
  }>;
  handler: (formula: z.infer<TReq>) => z.infer<TRes>;
};

export type RollDef = {
  DisplayComponent: ComponentType<{
    formula: string;
    result: string;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: string) => void;
  }>;
  handler: (rawFormula: unknown) => string;
};

export function defineRoll<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny,
>(def: UserRollDef<TReq, TRes>): RollDef {
  return {
    DisplayComponent: ({
      formula: rawFormula,
      result: rawResult,
    }: {
      formula: string;
      result: string;
    }) => {
      const formula = def.formulaValidator.parse(rawFormula);
      const result = def.resultValidator.parse(rawResult);
      return <def.DisplayComponent formula={formula} result={result} />;
    },
    InputComponent: ({ onChange }: { onChange: (formula: string) => void }) => {
      const handleChange = useCallback(
        (newFormula: unknown) => onChange(JSON.stringify(newFormula)),
        [onChange],
      );
      return <def.InputComponent onChange={handleChange} />;
    },
    handler: (rawFormula: unknown) => {
      const formula = def.formulaValidator.parse(rawFormula);
      const result = def.handler(formula);
      return JSON.stringify(result);
    },
  };
}

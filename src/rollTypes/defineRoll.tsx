import { useCallback, useEffect, type ComponentType } from "react";
import type { z } from "zod";

export type RollInputComponent<TReq> = React.ComponentType<{
  onChange: (request: TReq) => void;
}>;

export type UserRollDef<
  TFormula extends z.ZodTypeAny,
  TResult extends z.ZodTypeAny,
> = {
  formulaValidator: TFormula;
  resultValidator: TResult;
  // Always required — even retired roll types need to display old results
  DisplayComponent: React.ComponentType<{
    formula: z.infer<TFormula>;
    result: z.infer<TResult>;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TFormula>) => void;
  }>;
  defaultFormula: z.infer<TFormula>;
  handler: (formula: z.infer<TFormula>) => z.infer<TResult>;
};

export type RollDef = {
  DisplayComponent: ComponentType<{
    formula: string;
    result: string;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: string) => void;
  }>;
  handler: (rawFormula: string) => string;
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
      const formula = def.formulaValidator.parse(JSON.parse(rawFormula));
      const result = def.resultValidator.parse(JSON.parse(rawResult));
      return <def.DisplayComponent formula={formula} result={result} />;
    },
    InputComponent: ({ onChange }: { onChange: (formula: string) => void }) => {
      useEffect(() => {
        onChange(JSON.stringify(def.defaultFormula));
      }, [onChange]);
      const handleChange = useCallback(
        (newFormula: unknown) => onChange(JSON.stringify(newFormula)),
        [onChange],
      );
      return <def.InputComponent onChange={handleChange} />;
    },
    handler: (rawFormula: string) => {
      console.log(rawFormula);
      const formula = def.formulaValidator.parse(JSON.parse(rawFormula));
      const result = def.handler(formula);
      return JSON.stringify(result);
    },
  };
}

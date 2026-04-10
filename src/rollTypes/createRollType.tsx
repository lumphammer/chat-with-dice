import type {
  ChatMessage,
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

export type RollHandler<
  TFormula extends JsonData,
  TResult extends JsonData,
> = (tools: {
  formula: TFormula;
  getMessage: (id: string) => Promise<ChatMessage<TFormula, TResult>>;
  updateMessage: (message: ChatMessage) => Promise<void>;
  chatId: string;
  displayName: string;
}) => TResult | Promise<TResult>;

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
    messageId: string;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TFormulaValidator>) => void;
  }>;
  defaultFormula: z.infer<TFormulaValidator>;
  handler: RollHandler<z.infer<TFormulaValidator>, z.infer<TResultValidator>>;
};

export type RollType<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
> = {
  DisplayComponent: ComponentType<{
    formula: z.infer<TFormulaValidator>;
    result: z.infer<TResultValidator>;
    messageId: string;
  }>;
  InputComponent: ComponentType<{
    onChange: (formula: z.infer<TFormulaValidator>) => void;
  }>;
  handler: (tools: {
    formula: JsonData;
    messageJiggler: MessageJiggler;
    chatId: string;
    displayName: string;
  }) => Promise<z.infer<TResultValidator>>;
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
      messageId,
    }: {
      formula: unknown;
      result: unknown;
      messageId: string;
    }) => {
      const formula = def.formulaValidator.parse(rawFormula);
      const result = def.resultValidator.parse(rawResult);
      return (
        <def.DisplayComponent
          formula={formula}
          result={result}
          messageId={messageId}
        />
      );
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
    handler: async (tools: {
      formula: JsonData;
      messageJiggler: MessageJiggler;
      chatId: string;
      displayName: string;
    }) => {
      console.log(tools.formula);
      const formula = def.formulaValidator.parse(tools.formula);
      const result = await def.handler({
        formula,
        getMessage: async (id: string) =>
          await tools.messageJiggler.getMessage(
            id,
            def.formulaValidator,
            def.resultValidator,
          ),
        updateMessage: async (message: ChatMessage) =>
          await tools.messageJiggler.updateMessage(message),
        chatId: tools.chatId,
        displayName: tools.displayName,
      });
      return result;
    },
    formulaValidator: def.formulaValidator,
    resultValidator: def.resultValidator,
  };
}

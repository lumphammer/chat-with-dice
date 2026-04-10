import type { RollType } from "#/rollTypes/createRollType";
import {
  chatMessageValidator,
  type JsonValidator,
  type ChatMessage,
} from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import { produce, type Draft } from "immer";

/**
 * A tool which combines the message repository and the broadcaster, for
 * altering messages and broadcasting the results.
 *
 * The name is very silly and will probably change.
 */
export class MessageJiggler {
  constructor(
    private messageRepository: MessageRepository,
    private broadcaster: Broadcaster,
  ) {}

  async modifyMesage<
    TFormulaValidator extends JsonValidator,
    TResultValidator extends JsonValidator,
  >(
    id: string,
    rollType: RollType<TFormulaValidator, TResultValidator>,
    callback: (tools: {
      draft: Draft<ChatMessage<TFormulaValidator, TResultValidator>>;
    }) => void,
  ): Promise<void> {
    const message = await this.messageRepository.getById(id);
    const validator = chatMessageValidator(
      rollType.formulaValidator,
      rollType.resultValidator,
    );
    const parsed = validator.parse(message);
    const updated = produce(parsed, (draft) => {
      callback({ draft });
    });
    await this.messageRepository.updateMessage(updated);
    this.broadcaster.broadcastChatMessage(updated);

    // return parsed;
  }
}

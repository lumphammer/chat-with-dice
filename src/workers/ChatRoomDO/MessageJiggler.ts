import type { RollType } from "#/rollTypes/createRollType";
import {
  parseChatMessage,
  type JsonValidator,
  type ChatMessage,
} from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import { extractPreviewUrl } from "./linkPreview/extractPreviewUrl";
import { fetchLinkPreview } from "./linkPreview/fetchLinkPreview";
import { produce, type Draft } from "immer";
import type { z } from "zod/v4";

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

  async chat({
    chat,
    userId,
    displayName,
  }: {
    chat: string | null;
    userId: string;
    displayName: string;
  }): Promise<void> {
    const rollerMessage: ChatMessage = {
      createdTime: Date.now(),
      id: crypto.randomUUID(),
      rollType: null,
      formula: null,
      results: null,
      chat,
      linkPreview: null,
      userId,
      displayName,
    };
    await this.sendChatMessage(rollerMessage);
    void this.attachLinkPreview(rollerMessage);
  }

  async sendChatMessage(message: ChatMessage): Promise<void> {
    await this.messageRepository.insertMessage(message);
    this.broadcaster.broadcastChatMessage(message);
  }

  private async attachLinkPreview(message: ChatMessage): Promise<void> {
    try {
      const previewUrl = extractPreviewUrl(message.chat);
      if (!previewUrl) return;

      const linkPreview = await fetchLinkPreview(previewUrl);
      if (!linkPreview) return;

      await this.updateMessage({ ...message, linkPreview });
    } catch {
      // Link previews are best-effort. The original message has already been
      // sent, so crawler failures should never surface as chat errors.
    }
  }

  async modifyMesage<
    TFormulaValidator extends JsonValidator,
    TResultValidator extends JsonValidator,
  >(
    id: string,
    rollType: RollType<TFormulaValidator, TResultValidator>,
    callback: (tools: {
      draft: Draft<
        ChatMessage<z.infer<TFormulaValidator>, z.infer<TResultValidator>>
      >;
    }) => void,
  ): Promise<void> {
    const message = await this.messageRepository.getById(id);
    const parsed = parseChatMessage(
      rollType.formulaValidator,
      rollType.resultValidator,
      message,
    );
    const updated = produce(parsed, (draft) => {
      callback({ draft });
    });
    // Widen to AnyChatMessage for the repository/broadcaster, which don't need
    // the specific formula/result types.
    await this.messageRepository.updateMessage(updated);
    this.broadcaster.broadcastChatMessage(updated);
  }

  async getMessage<
    TFormulaValidator extends JsonValidator,
    TResultValidator extends JsonValidator,
  >(
    id: string,
    formulaValidator: TFormulaValidator,
    resultValidator: TResultValidator,
  ): Promise<
    ChatMessage<z.infer<TFormulaValidator>, z.infer<TResultValidator>>
  > {
    const message = await this.messageRepository.getById(id);
    return parseChatMessage(formulaValidator, resultValidator, message);
  }
  async updateMessage(message: ChatMessage): Promise<void> {
    await this.messageRepository.updateMessage(message);
    this.broadcaster.broadcastChatMessage(message);
  }
}
